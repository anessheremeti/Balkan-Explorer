import { rateLimit } from 'express-rate-limit';

const json429 = (msg) => (_req, res) =>
  res.status(429).json({ error: msg });

// POST /api/trips/create-fast
// Triggers AI + Supabase + 3 external APIs — most expensive endpoint.
// 5 trips per hour is enough for any real user; blocks API-credit abuse.
export const tripCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: json429('Trip creation limit reached — try again in an hour.'),
});

// GET /api/trips/:id/itinerary-status
// Polled every 2 s for up to 75 attempts per trip. 150/5 min covers that
// with headroom for the final fallback fetch and any page reloads.
export const statusPollLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 150,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: json429('Too many status checks — slow down polling.'),
});

// POST /api/trips/migrate-guest
// One-shot action fired once per login. 10/15 min is generous.
export const guestMigrateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: json429('Too many migration requests — try again shortly.'),
});

// POST /api/deals/:id/inquire
// Public lead-capture form — 5/hour per IP stops spam while letting a real
// visitor inquire about several deals.
export const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: json429('Too many inquiries — try again in an hour.'),
});

// POST /api/deals/:id/whatsapp-click
// Just increments a counter — cheap and harmless, but still capped against a
// scripted spam loop. 20/min per IP is generous for genuine browsing.
export const dealClickLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: json429('Too many requests — slow down.'),
});

// GET /api/geocode
// Replaces the hand-rolled rateOk() map. 30/min per IP with 24 h cache
// means a real user will almost never hit this after the first load.
export const geocodeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: json429('Too many geocode requests — retry in a minute.'),
});
