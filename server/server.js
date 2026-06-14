import express  from 'express';
import dotenv   from 'dotenv';
import cors     from 'cors';
import path     from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Always load server/.env regardless of working directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

import { log }                                    from './lib/logger.js';
import { tripCache, photoCache, proxyGeoCache }   from './lib/cache.js';
import { getVerifiedPlaces, getHealthReport }     from './lib/place-orchestrator.js';
import { assembleItinerary }                      from './lib/itinerary-assembler.js';
import { generateAIThemes, deterministicThemes, aiModelHealth } from './lib/ai-themes.js';
import { searchPhotos, normaliseQuery }           from './lib/photos.js';
import { geocodeCity }                            from './lib/providers/nominatim.js';

// ─── App ─────────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' }));

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
    d.itinerary_items.map(({ _source, _place_id, _lat, _lon, _photo_query, ...item }) => ({
      ...item,
      place_id: null,
      metadata: { source: _source ?? 'unknown', place_id: _place_id ?? null, lat: _lat ?? null, lon: _lon ?? null, photo_query: _photo_query ?? null },
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

app.post('/api/trips/create-fast', async (req, res) => {
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

app.post('/api/trips/migrate-guest', async (req, res) => {
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

app.get('/api/trips/:id/itinerary-status', async (req, res) => {
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

app.get('/api/photos/search', async (req, res) => {
  const { q, raw } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });
  try {
    const url = await searchPhotos(normaliseQuery(q), raw);
    res.json({ url });
  } catch {
    res.status(500).json({ error: 'Photo search failed' });
  }
});

// ─── Routes: Geocode proxy (frontend map centering) ───────────────────────────

const rateLimits = new Map();
function rateOk(ip) {
  const now  = Date.now();
  const slot = rateLimits.get(ip);
  if (slot && now - slot.t < 1000 && slot.n >= 1) return false;
  rateLimits.set(ip, slot && now - slot.t < 1000 ? { t: slot.t, n: slot.n + 1 } : { t: now, n: 1 });
  if (rateLimits.size > 1000) {
    for (const [k, v] of rateLimits) { if (now - v.t > 10_000) rateLimits.delete(k); }
  }
  return true;
}

app.get('/api/geocode', async (req, res) => {
  const { q } = req.query;
  if (!q?.trim()) return res.status(400).json({ error: 'Location query required (q parameter)' });

  const location = q.trim();
  const cached   = proxyGeoCache.get(location);
  if (cached) return res.json(cached);

  const ip = req.ip ?? req.connection.remoteAddress ?? 'unknown';
  if (!rateOk(ip)) return res.status(429).json({ error: 'Too many requests — retry in 1 second', retryAfter: 1 });

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
