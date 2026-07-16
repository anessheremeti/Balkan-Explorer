import express  from 'express';
import dotenv   from 'dotenv';
import cors     from 'cors';
import path     from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Load server/.env when running locally. In production (Railway) the platform
// injects variables directly into process.env, so dotenv is a no-op there.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

import { log }                                    from './lib/logger.js';
import { tripCreateLimiter, photoSearchLimiter, statusPollLimiter, guestMigrateLimiter, geocodeLimiter, inquiryLimiter } from './lib/rate-limits.js';
import { tripCache, photoCache, proxyGeoCache }   from './lib/cache.js';
import { getVerifiedPlaces, getHealthReport }     from './lib/place-orchestrator.js';
import { assembleItinerary }                      from './lib/itinerary-assembler.js';
import { generateAIThemes, deterministicThemes, aiModelHealth } from './lib/ai-themes.js';
import { searchPhotos, normaliseQuery }           from './lib/photos.js';
import { geocodeCity }                            from './lib/providers/nominatim.js';

// ─── Startup validation ───────────────────────────────────────────────────────
// Accept both SUPABASE_URL (preferred, server-only) and the legacy
// VITE_SUPABASE_URL name so existing local setups keep working.
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const REQUIRED = { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SUPABASE_KEY };
const missing  = Object.entries(REQUIRED).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error(`[server] Missing required environment variables: ${missing.join(', ')}`);
  console.error('[server] Set them in Railway → Variables (production) or server/.env (local).');
  process.exit(1);
}

// ─── App ─────────────────────────────────────────────────────────────────────

const app = express();
// 4 MB limit: deal photos travel as base64 in the admin create-deal request
app.use(express.json({ limit: '4mb' }));
const FRONTEND_URL = (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '');
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: (origin, callback) => {
    // No origin = same-origin request or curl — always allow.
    if (!origin) return callback(null, true);
    // Production: only the configured FRONTEND_URL is accepted.
    if (IS_PROD) return callback(origin === FRONTEND_URL ? null : new Error('Not allowed by CORS'), origin === FRONTEND_URL);
    // Development: allow any localhost port (5173, 5174, 5175 … Vite auto-bumps when port is busy).
    const isLocalhost = /^https?:\/\/localhost:\d+$/.test(origin);
    callback(isLocalhost ? null : new Error('Not allowed by CORS'), isLocalhost);
  },
}));

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Destination allow-list (mirrors src/constants/allowedDestinations.ts) ─────
const BALKAN_DESTINATIONS = [
  { country: 'Kosovo',         cities: ['Pristina','Prizren','Pejë','Gjakova','Mitrovica','Ferizaj','Gjilan','Vushtrri','Suhareka','Rahovec','Drenas','Lipjan','Deçan','Klina','Malisheva','Kamenica'] },
  { country: 'Albania',        cities: ['Tirana','Durrës','Shkodër','Vlorë','Elbasan','Berat','Gjirokastër','Korçë','Fier','Sarandë','Pogradec','Lushnjë','Kavajë','Lezhë','Kukës','Laç'] },
  { country: 'North Macedonia', cities: ['Skopje','Ohrid','Bitola','Kumanovo','Tetovo','Štip','Veles','Struga','Gostivar','Kičevo','Strumica','Kavadarci','Debar','Kochani','Negotino'] },
  { country: 'Montenegro',     cities: ['Podgorica','Budva','Kotor','Bar','Herceg Novi','Nikšić','Tivat','Ulcinj','Bijelo Polje','Pljevlja','Berane','Cetinje','Rožaje','Kolašin','Žabljak'] },
];
const ALLOWED_COUNTRIES = BALKAN_DESTINATIONS.map(d => d.country);

function normalizeStr(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function isDestinationAllowed(destination) {
  if (!destination?.trim()) return false;
  const norm = normalizeStr(destination);
  return BALKAN_DESTINATIONS.some(({ country, cities }) => {
    const cn = normalizeStr(country);
    if (norm === cn) return true;
    return cities.some(city => {
      const c = normalizeStr(city);
      return norm === c || norm === `${c}, ${cn}`;
    });
  });
}

app.get('/', (_req, res) => res.send('Travel Explorer API ✈️'));

// ─── Itinerary Generator ─────────────────────────────────────────────────────

async function persistItinerary(tripId, days) {
  // Remove _prefixed in-memory fields; map them into the metadata jsonb column.
  const daysToInsert  = days.map(({ itinerary_items: _, ...day }) => day);
  const itemsToInsert = days.flatMap(d =>
    d.itinerary_items.map(({ _source, _place_id, _lat, _lon, _photo_query, _name_local, ...item }) => ({
      ...item,
      place_id: null,
      metadata: {
        source:     _source     ?? 'unknown',
        place_id:   _place_id   ?? null,
        lat:        _lat        ?? null,
        lon:        _lon        ?? null,
        photo_query: _photo_query ?? null,
        name_local: _name_local ?? null,
      },
    }))
  );

  // Delete any pre-existing itinerary for this trip before inserting new one.
  const { data: existing } = await supabase.from('itinerary_days').select('id').eq('trip_id', tripId);
  const existingIds = (existing ?? []).map(d => d.id);
  if (existingIds.length) {
    await supabase.from('itinerary_items').delete().in('itinerary_day_id', existingIds);
    await supabase.from('itinerary_days').delete().eq('trip_id', tripId);
  }

  const { error: dErr } = await supabase.from('itinerary_days').insert(daysToInsert);
  if (dErr) { log.error('Days insert failed', { tripId, error: dErr.message }); return; }

  const { error: iErr } = await supabase.from('itinerary_items').insert(itemsToInsert);
  if (iErr) log.error('Items insert failed', { tripId, error: iErr.message });
  else       log.info('Itinerary persisted', { tripId, days: days.length, items: itemsToInsert.length });
}

async function generateAndSaveItinerary(tripId, tripData) {
  const { destination, starting_date, returning_date, travel_style } = tripData;
  const duration = Math.max(
    1,
    Math.ceil((new Date(returning_date) - new Date(starting_date)) / 86_400_000)
  );
  log.info('Itinerary generation started', { tripId, destination, duration });

  // Phase 1 — Fetch verified real-world places (Overpass → OpenTripMap → fallback)
  const { buckets, source } = await getVerifiedPlaces(destination);
  const totalPlaces = Object.values(buckets).reduce((s, a) => s + a.length, 0);
  log.info('Place data ready', { destination, source, totalPlaces });

  // Phase 2 — Generate day themes (AI with deterministic fallback)
  let themes = await generateAIThemes(destination, duration, travel_style);
  if (!themes) themes = deterministicThemes(destination, duration);

  // Phase 3 — Assemble the final itinerary payload
  const payload = assembleItinerary(tripId, tripData, themes, buckets);

  // Phase 4 — Cache for instant serving via /itinerary-fast
  tripCache.set(tripId, payload, 10 * 60 * 1000);

  // Phase 5 — Persist to Supabase (non-blocking)
  persistItinerary(tripId, payload.days).catch(err =>
    log.error('Persist failed', { tripId, error: err.message })
  );
}

// ─── Routes: Trip creation ────────────────────────────────────────────────────

app.post('/api/trips/create-fast', tripCreateLimiter, async (req, res) => {
  try {
    const { tripData, userId, guestId } = req.body;

    if (!tripData?.destination)                                    return res.status(400).json({ error: 'destination is required' });
    if (!isDestinationAllowed(tripData.destination))              return res.status(400).json({ error: `Destination must be within the Balkan region (${ALLOWED_COUNTRIES.join(', ')})` });
    if (!tripData?.starting_date || !tripData?.returning_date)    return res.status(400).json({ error: 'starting_date and returning_date are required' });

    const today = new Date().toISOString().split('T')[0];
    if (tripData.starting_date < today)                           return res.status(400).json({ error: 'starting_date cannot be in the past' });
    if (tripData.returning_date <= tripData.starting_date)        return res.status(400).json({ error: 'returning_date must be after starting_date' });

    const isAuthUser = userId  && UUID_RE.test(userId);
    const isGuest    = guestId && UUID_RE.test(guestId);
    if (!isAuthUser && !isGuest)                                  return res.status(400).json({ error: 'A valid userId or guestId is required' });

    const record = {
      ...tripData,
      user_id:  isAuthUser              ? userId  : null,
      guest_id: !isAuthUser && isGuest  ? guestId : null,
    };

    const { data: newTrip, error } = await supabase.from('trips').insert([record]).select();
    if (error || !newTrip?.length) {
      log.error('Trip insert failed', { error: error?.message });
      return res.status(500).json({ error: 'Trip creation failed', detail: error?.message });
    }

    const tripId = newTrip[0].id;
    log.info('Trip created', { tripId, destination: tripData.destination });
    res.status(201).json({ success: true, trip: newTrip[0], tripId, status: 'pending_itinerary' });

    generateAndSaveItinerary(tripId, tripData).catch(err =>
      log.error('Generation error', { tripId, error: err.message })
    );
  } catch (err) {
    log.error('create-fast error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/trips/migrate-guest', guestMigrateLimiter, async (req, res) => {
  try {
    const { guestId, userId } = req.body;
    if (!guestId || !userId)                              return res.status(400).json({ error: 'guestId and userId are required' });
    if (!UUID_RE.test(guestId) || !UUID_RE.test(userId)) return res.status(400).json({ error: 'Invalid UUID format' });

    const { data, error } = await supabase
      .from('trips').update({ user_id: userId, guest_id: null }).eq('guest_id', guestId).select('id');

    if (error) {
      log.error('Guest migration failed', { error: error.message });
      return res.status(500).json({ error: 'Migration failed', detail: error.message });
    }

    const migrated = data?.length ?? 0;
    log.info('Guest trips migrated', { guestId, userId, migrated });
    res.json({ success: true, migrated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Routes: Itinerary status & fast-serve ────────────────────────────────────

app.get('/api/trips/:id/itinerary-status', statusPollLimiter, async (req, res) => {
  const { id } = req.params;
  if (tripCache.has(id)) return res.json({ ready: true });
  try {
    const { data } = await supabase.from('itinerary_days').select('id').eq('trip_id', id).limit(1);
    res.json({ ready: !!(data?.length) });
  } catch {
    res.status(500).json({ error: 'Status check failed' });
  }
});

app.get('/api/trips/:id/itinerary-fast', (req, res) => {
  const payload = tripCache.get(req.params.id);
  if (!payload) return res.status(404).json({ error: 'Not in cache' });
  res.json(payload);
});

// ─── Routes: Photo search ─────────────────────────────────────────────────────

app.get('/api/photos/search', photoSearchLimiter, async (req, res) => {
  const { q, raw, name, lat, lon } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });
  try {
    const context = (name && lat && lon)
      ? { name, lat: parseFloat(lat), lon: parseFloat(lon) }
      : null;
    const url = await searchPhotos(normaliseQuery(q), raw, context);
    res.json({ url });
  } catch {
    res.status(500).json({ error: 'Photo search failed' });
  }
});

// ─── Routes: Geocode proxy (frontend map centering) ───────────────────────────

app.get('/api/geocode', geocodeLimiter, async (req, res) => {
  const { q } = req.query;
  if (!q?.trim()) return res.status(400).json({ error: 'Location query required (q parameter)' });

  const location = q.trim();
  const cached   = proxyGeoCache.get(location);
  if (cached) return res.json(cached);

  try {
    const result = await geocodeCity(location);
    const out    = { lat: result.lat, lon: result.lon };
    proxyGeoCache.set(location, out, 24 * 60 * 60 * 1000);
    res.json(out);
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 503;
    res.status(status).json({ error: err.message });
  }
});

// ─── Admin: auth guard ────────────────────────────────────────────────────────
// Admins are declared by email in ADMIN_EMAILS (comma-separated, server-only).
// Every /api/admin/* request must carry a valid Supabase access token whose
// email is on that list.

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

async function requireAdmin(req, res, next) {
  try {
    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Missing access token' });

    const { data, error } = await supabase.auth.getUser(token);
    const email = data?.user?.email?.toLowerCase();
    if (error || !email) return res.status(401).json({ error: 'Invalid or expired session' });
    if (!ADMIN_EMAILS.includes(email)) return res.status(403).json({ error: 'Not an admin account' });

    req.adminUser = data.user;
    next();
  } catch {
    res.status(500).json({ error: 'Auth check failed' });
  }
}

// ─── Admin: overview (stats + trends + charts + activity) ────────────────────

function pctChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

// Bucket ISO-dated rows into per-day counts across the window (for sparklines)
function dailySeries(rows, windowStart, days, valueOf = () => 1) {
  const buckets = new Array(days).fill(0);
  const startMs = new Date(windowStart).getTime();
  for (const r of rows) {
    if (!r.created_at) continue;
    const idx = Math.floor((new Date(r.created_at).getTime() - startMs) / 86_400_000);
    if (idx >= 0 && idx < days) buckets[idx] += valueOf(r);
  }
  return buckets;
}

app.get('/api/admin/overview', requireAdmin, async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 7), 365);
    const now = Date.now();
    const windowStart = new Date(now - days * 86_400_000).toISOString();
    const prevStart   = new Date(now - 2 * days * 86_400_000).toISOString();

    const [profilesQ, tripsQ, dealsQ] = await Promise.all([
      supabase.from('profiles').select('id, full_name, created_at'),
      supabase.from('trips').select('id, title, destination, budget_total, created_at'),
      supabase.from('destination_deals').select('id, title, city, created_at'),
    ]);
    if (profilesQ.error) throw profilesQ.error;
    if (tripsQ.error) throw tripsQ.error;

    const profiles = profilesQ.data ?? [];
    const trips    = tripsQ.data ?? [];
    const deals    = dealsQ.error ? null : (dealsQ.data ?? []); // null until table exists

    const inWindow  = rows => rows.filter(r => r.created_at && r.created_at >= windowStart);
    const inPrev    = rows => rows.filter(r => r.created_at && r.created_at >= prevStart && r.created_at < windowStart);
    const revenueOf = rows => rows.reduce((s, t) => s + (Number(t.budget_total) || 0), 0);

    // Popular destinations: group by city (part before the comma)
    const destCounts = {};
    for (const t of trips) {
      const city = (t.destination ?? '').split(',')[0].trim();
      if (city) destCounts[city] = (destCounts[city] ?? 0) + 1;
    }
    const popular = Object.entries(destCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([city, count]) => ({
        city,
        count,
        share: trips.length ? Math.round((count / trips.length) * 1000) / 10 : 0,
      }));

    // Recent activity: merged latest signups / trips / deals
    const activity = [
      ...profiles.map(p => ({ type: 'user', text: `New user registered: ${p.full_name ?? 'Unknown'}`, ts: p.created_at })),
      ...trips.map(t => ({ type: 'trip', text: `Trip created: ${t.title ?? t.destination}`, ts: t.created_at })),
      ...(deals ?? []).map(d => ({ type: 'deal', text: `Deal added: ${d.title} (${d.city})`, ts: d.created_at })),
    ]
      .filter(a => a.ts)
      .sort((a, b) => new Date(b.ts) - new Date(a.ts))
      .slice(0, 8);

    res.json({
      days,
      cards: {
        users: {
          total: profiles.length,
          trend: pctChange(inWindow(profiles).length, inPrev(profiles).length),
          series: dailySeries(inWindow(profiles), windowStart, days),
        },
        trips: {
          total: trips.length,
          trend: pctChange(inWindow(trips).length, inPrev(trips).length),
          series: dailySeries(inWindow(trips), windowStart, days),
        },
        deals: deals === null ? null : {
          total: deals.length,
          trend: pctChange(inWindow(deals).length, inPrev(deals).length),
          series: dailySeries(inWindow(deals), windowStart, days),
        },
        revenue: {
          total: Math.round(revenueOf(trips)),
          trend: pctChange(revenueOf(inWindow(trips)), revenueOf(inPrev(trips))),
          series: dailySeries(inWindow(trips), windowStart, days, t => Number(t.budget_total) || 0),
        },
      },
      popular,
      activity,
    });
  } catch (err) {
    log.error('Admin overview failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: users ─────────────────────────────────────────────────────────────

const ACTIVE_WINDOW_MS = 30 * 86_400_000; // signed in within 30 days = Active

app.get('/api/admin/users', requireAdmin, async (_req, res) => {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Trip counts in one query, tallied in memory (profile counts stay small)
    const { data: tripRows, error: tErr } = await supabase
      .from('trips')
      .select('user_id')
      .not('user_id', 'is', null);
    if (tErr) throw tErr;

    const counts = {};
    for (const t of tripRows) counts[t.user_id] = (counts[t.user_id] ?? 0) + 1;

    // Auth metadata (last sign-in) — merged in for the Status column
    const lastSignIn = {};
    try {
      const { data: authList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      for (const u of authList?.users ?? []) lastSignIn[u.id] = u.last_sign_in_at ?? null;
    } catch { /* status degrades to Inactive if auth listing fails */ }

    res.json(profiles.map(p => {
      const signIn = lastSignIn[p.id] ?? null;
      return {
        ...p,
        trip_count: counts[p.id] ?? 0,
        role: ADMIN_EMAILS.includes((p.email ?? '').toLowerCase()) ? 'Admin' : 'Member',
        last_sign_in_at: signIn,
        status: signIn && (Date.now() - new Date(signIn).getTime()) < ACTIVE_WINDOW_MS ? 'Active' : 'Inactive',
      };
    }));
  } catch (err) {
    log.error('Admin users list failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users', requireAdmin, async (req, res) => {
  const { full_name, email, password } = req.body ?? {};
  if (!full_name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'full_name, email and password are required' });
  }
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim() },
    });
    if (error) throw error;

    const { error: pErr } = await supabase.from('profiles').insert([{
      id: data.user.id,
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
    }]);
    if (pErr && !/duplicate/i.test(pErr.message)) throw pErr;

    log.info('Admin created user', { id: data.user.id, by: req.adminUser.email });
    res.status(201).json({ success: true, id: data.user.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Invalid user id' });
  const { full_name } = req.body ?? {};
  if (typeof full_name !== 'string' || !full_name.trim() || full_name.length > 80) {
    return res.status(400).json({ error: 'full_name must be a non-empty string (max 80 chars)' });
  }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: full_name.trim() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    log.info('Admin updated user', { id, by: req.adminUser.email });
    res.json({ success: true, user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Invalid user id' });
  if (id === req.adminUser.id) return res.status(400).json({ error: 'You cannot delete your own account' });
  try {
    // Trips → itinerary rows cascade is handled by deleting trips explicitly
    const { data: tripIds } = await supabase.from('trips').select('id').eq('user_id', id);
    const ids = (tripIds ?? []).map(t => t.id);
    if (ids.length) {
      const { data: dayIds } = await supabase.from('itinerary_days').select('id').in('trip_id', ids);
      const dIds = (dayIds ?? []).map(d => d.id);
      if (dIds.length) await supabase.from('itinerary_items').delete().in('itinerary_day_id', dIds);
      await supabase.from('itinerary_days').delete().in('trip_id', ids);
      await supabase.from('trips').delete().in('id', ids);
    }
    await supabase.from('profiles').delete().eq('id', id);
    // Remove the auth account itself (service-role only operation)
    const { error: authErr } = await supabase.auth.admin.deleteUser(id);
    if (authErr && !/not found/i.test(authErr.message)) throw authErr;

    log.info('Admin deleted user', { id, trips: ids.length, by: req.adminUser.email });
    res.json({ success: true, deletedTrips: ids.length });
  } catch (err) {
    log.error('Admin user delete failed', { id, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: per-destination stats (trips planned per city) ───────────────────

app.get('/api/admin/destination-stats', requireAdmin, async (_req, res) => {
  try {
    const { data: trips, error } = await supabase.from('trips').select('destination');
    if (error) throw error;
    const counts = {};
    for (const t of trips ?? []) {
      const city = (t.destination ?? '').split(',')[0].trim().toLowerCase();
      if (city) counts[city] = (counts[city] ?? 0) + 1;
    }
    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Deals: public read, admin write ─────────────────────────────────────────

app.get('/api/deals', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('destination_deals')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    // Table may not exist yet — return empty rather than erroring the UI
    res.json([]);
  }
});

// Deal photos live in a public Supabase Storage bucket, created on first use.
const DEAL_BUCKET = 'deal-photos';
let dealBucketReady = false;

async function uploadDealPhoto(dataUrl) {
  const m = /^data:image\/(png|jpe?g|webp);base64,(.+)$/.exec(dataUrl ?? '');
  if (!m) throw new Error('Photo must be a PNG, JPEG or WebP image');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 2.5 * 1024 * 1024) throw new Error('Photo must be under 2.5 MB');

  if (!dealBucketReady) {
    const { error } = await supabase.storage.createBucket(DEAL_BUCKET, { public: true });
    if (error && !/already exists/i.test(error.message)) throw error;
    dealBucketReady = true;
  }

  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(DEAL_BUCKET)
    .upload(path, buf, { contentType: `image/${m[1]}` });
  if (error) throw error;
  return supabase.storage.from(DEAL_BUCKET).getPublicUrl(path).data.publicUrl;
}

app.post('/api/admin/deals', requireAdmin, async (req, res) => {
  const { city, country, title, description, price, currency, agency, valid_until, photo } = req.body ?? {};
  if (!city?.trim() || !country?.trim() || !title?.trim()) {
    return res.status(400).json({ error: 'city, country and title are required' });
  }
  if (price != null && (typeof price !== 'number' || price < 0)) {
    return res.status(400).json({ error: 'price must be a positive number' });
  }
  try {
    let image_url = null;
    if (photo) {
      try {
        image_url = await uploadDealPhoto(photo);
      } catch (photoErr) {
        return res.status(400).json({ error: photoErr.message });
      }
    }

    const { data, error } = await supabase
      .from('destination_deals')
      .insert([{
        city: city.trim(),
        country: country.trim(),
        title: title.trim(),
        description: description?.trim() || null,
        price: price ?? null,
        currency: currency || 'EUR',
        agency: agency?.trim() || null,
        valid_until: valid_until || null,
        image_url,
      }])
      .select()
      .single();
    if (error) throw error;
    log.info('Admin created deal', { id: data.id, city, by: req.adminUser.email });
    res.status(201).json({ success: true, deal: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/deals/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Invalid deal id' });
  try {
    const { error } = await supabase.from('destination_deals').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Deal inquiries: public lead capture, admin pipeline ─────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

app.post('/api/deals/:id/inquire', inquiryLimiter, async (req, res) => {
  const { id } = req.params;
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Invalid deal id' });

  const { name, email, phone, message, userId } = req.body ?? {};
  if (!name?.trim() || name.trim().length > 80)   return res.status(400).json({ error: 'Name is required (max 80 chars)' });
  if (!EMAIL_RE.test(email ?? ''))                 return res.status(400).json({ error: 'A valid email is required' });
  if (phone && String(phone).length > 30)          return res.status(400).json({ error: 'Phone is too long' });
  if (message && String(message).length > 500)     return res.status(400).json({ error: 'Message is too long (max 500 chars)' });

  try {
    // The deal must exist and not be expired
    const { data: deal } = await supabase
      .from('destination_deals').select('id, title, valid_until').eq('id', id).maybeSingle();
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    if (deal.valid_until && deal.valid_until < new Date().toISOString().split('T')[0]) {
      return res.status(410).json({ error: 'This deal has expired' });
    }

    // Dedupe: same email + same deal updates the earlier inquiry instead of duplicating
    const record = {
      deal_id: id,
      user_id: userId && UUID_RE.test(userId) ? userId : null,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      message: message?.trim() || null,
    };
    const { error } = await supabase
      .from('deal_inquiries')
      .upsert([record], { onConflict: 'deal_id,email' });
    if (error) throw error;

    log.info('Deal inquiry received', { dealId: id, email: record.email });
    res.status(201).json({ success: true });
  } catch (err) {
    log.error('Inquiry failed', { dealId: id, error: err.message });
    res.status(500).json({ error: 'Could not submit inquiry — please try again' });
  }
});

app.get('/api/admin/inquiries', requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('deal_inquiries')
      .select('*, destination_deals ( title, city, country, agency )')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(({ destination_deals: deal, ...inq }) => ({ ...inq, deal })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/inquiries/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Invalid inquiry id' });
  const { status } = req.body ?? {};
  if (!['new', 'contacted', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'status must be new, contacted or closed' });
  }
  try {
    const { error } = await supabase.from('deal_inquiries').update({ status }).eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Routes: Health & observability ──────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    status:    'ok',
    ts:        new Date().toISOString(),
    providers: getHealthReport(),
    aiModels:  aiModelHealth(),
    cache:     { trips: tripCache.stats(), photos: photoCache.stats() },
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => log.info('Server started', { port: PORT, url: `http://localhost:${PORT}` }));
