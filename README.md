# Travel Explorer

A full-stack AI-powered travel planning app focused on the Balkan region. Users describe a trip (destination, dates, budget, travel style) and the app generates a personalised multi-day itinerary backed by real place data from OpenStreetMap, contextual photos from multiple APIs, and an AI model for day themes.

---

## Features

- **AI-generated itineraries** — day themes via OpenRouter (Llama 3.3 70B), real places via Overpass/OpenTripMap
- **Interactive maps** — Google Maps with marker clustering, route polylines, per-day map views and session restore
- **Multi-language** — English, Albanian (Shqip), German (Deutsch) via i18next with browser language detection
- **Authentication** — Supabase Auth with email/password, forgot/reset password, and guest-trip migration on sign-in
- **Community** — public posts with likes and comments
- **My Travels** — view all past trips with a day-by-day map modal and route visualisation
- **Dark mode** — system-aware toggle persisted to `localStorage`
- **Responsive** — desktop split-screen (timeline + sticky inline map), mobile stacked

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4, DaisyUI |
| Routing | React Router v7 |
| Backend | Node.js, Express |
| Database / Auth | Supabase (PostgreSQL + Auth) |
| AI | OpenRouter → Llama 3.3 70B Instruct |
| Maps | Google Maps JS API, `@react-google-maps/api`, `@googlemaps/markerclusterer` |
| Places | Overpass API (OpenStreetMap), OpenTripMap |
| Photos | Pexels, Pixabay, Openverse, Wikipedia (4-level waterfall with in-memory cache) |
| Validation | Zod |
| Animations | Framer Motion |
| i18n | i18next, react-i18next |

---

## Project Structure

```
travel-explorer/
├── server/                         # Express backend (runs separately from Vite)
│   ├── server.js                   # API routes — trip creation, itinerary status, photos, geocode
│   ├── .env.example                # Required server environment variables
│   └── lib/
│       ├── itinerary-assembler.js  # Slot-based day builder (6 time slots × N days)
│       ├── place-orchestrator.js   # Overpass → OpenTripMap → fallback chain
│       ├── photos.js               # Pexels → Pixabay → Openverse → Wikipedia → picsum
│       ├── ai-themes.js            # OpenRouter day-theme generator with deterministic fallback
│       ├── providers/
│       │   ├── overpass.js         # OpenStreetMap Overpass QL queries with circuit breaker
│       │   └── nominatim.js        # Free city geocoding
│       ├── cache.js                # In-memory TTL cache (trips, photos, places)
│       ├── circuit-breaker.js      # Provider fault tolerance
│       └── logger.js
│
├── src/                            # React frontend
│   ├── pages/                      # One folder per route (1:1 with App.tsx routes)
│   │   ├── Mainpage/               # Landing page + trip creation form
│   │   ├── PlanSection/            # Itinerary view with sticky inline map
│   │   ├── MyTravels/              # Past trips with day-map modal
│   │   ├── Destinations/           # Destination cards
│   │   ├── DestinationDetail/      # Single destination detail
│   │   ├── Community/              # Social posts feed
│   │   ├── Login/ SignUp/
│   │   ├── ForgotPassword/ ResetPassword/
│   │   └── AccountSettings/ AppSettings/
│   │
│   ├── components/
│   │   ├── Timeline/               # Day-by-day itinerary with activity cards and photo waterfall
│   │   ├── InlineDayMap/           # Sticky split-screen map in PlanSection
│   │   ├── DayMapModal/            # Full map modal for MyTravels
│   │   ├── SummaryCards/           # Trip budget & distance summary
│   │   └── Navbar/ Footer/ Dropdown/ Toast/ ...
│   │
│   ├── hooks/                      # Services as hooks (all API and Supabase calls live here)
│   │   ├── submitService.tsx       # Trip creation and itinerary polling
│   │   ├── itineraryService.ts     # Supabase itinerary queries
│   │   ├── tripService.tsx
│   │   ├── destinationService.ts   # Translatable destination catalogue
│   │   ├── useItemPhoto.ts         # Contextual photo resolver (3-level cache waterfall)
│   │   ├── useItineraryForTrip.ts
│   │   ├── useMyTrips.ts
│   │   └── useSessionMapState.ts   # Map state persisted to sessionStorage
│   │
│   ├── context/
│   │   ├── ThemeContext.tsx         # Dark/light mode
│   │   └── ToastContext.tsx         # App-wide toast notifications
│   │
│   ├── constants/api.ts            # VITE_API_URL → shared API_BASE constant
│   ├── i18n/                       # Translation files (en / sq / de)
│   ├── validations/                # Zod form schemas
│   └── App.tsx                     # Route definitions
│
├── .env.example                    # Required frontend environment variables
└── CLAUDE.md                       # AI coding assistant guidance for this repo
```

---

## Getting Started

### Prerequisites

- **Node.js 18+**
- A [Supabase](https://supabase.com) project (free tier works)
- A [Google Cloud](https://console.cloud.google.com) project with **Maps JavaScript API** enabled
- An [OpenRouter](https://openrouter.ai) API key (free models available)

### 1. Clone

```bash
git clone https://github.com/anessheremeti/travel-explorer.git
cd travel-explorer
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
# Frontend — copy and fill in your keys
cp .env.example .env

# Backend — copy and fill in your keys
cp server/.env.example server/.env
```

See the [Environment Variables](#environment-variables) section for what each key does.

### 4. Set up the Supabase database

Run the following SQL in your Supabase SQL editor (**Table Editor → SQL Editor**):

```sql
create table public.destinations (
  id uuid primary key default uuid_generate_v4(),
  name varchar not null, country varchar not null,
  latitude double precision, longitude double precision, image_url text
);

create table public.trips (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  title varchar not null, starting_location varchar,
  destination_id uuid references public.destinations(id),
  destination varchar, travel_style varchar,
  budget_total numeric, cost_estimated numeric,
  currency varchar, duration integer, travelers integer,
  starting_date date, returning_date date,
  is_public boolean default false,
  created_at timestamptz default now()
);

create table public.itinerary_days (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid references public.trips(id),
  day_number integer not null, date date, title varchar
);

create table public.itinerary_items (
  id uuid primary key default uuid_generate_v4(),
  itinerary_day_id uuid references public.itinerary_days(id),
  place_id uuid, item_type varchar not null, title varchar not null,
  description text, start_time time not null, end_time time,
  estimated_cost numeric, metadata jsonb default '{}'
);

create table public.places (
  id uuid primary key default uuid_generate_v4(),
  destination_id uuid references public.destinations(id),
  name varchar not null, category varchar not null, description text,
  latitude double precision, longitude double precision,
  price_level varchar, rating numeric, review_count integer default 0, image_url text
);

create table public.posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid, content text not null, image_url text,
  location_name varchar, created_at timestamptz default now()
);

create table public.post_likes (
  post_id uuid not null references public.posts(id),
  user_id uuid not null,
  primary key (post_id, user_id)
);

create table public.post_comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references public.posts(id),
  user_id uuid, content text not null,
  created_at timestamptz default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id),
  full_name text, email text, avatar_url text,
  password_hash text, created_at timestamptz default now()
);
```

### 5. Run locally

The frontend and backend are separate processes — open two terminals:

```bash
# Terminal 1 — Frontend dev server (http://localhost:5173)
npm run dev

# Terminal 2 — Express backend (http://localhost:3001)
node server/server.js
```

---

## Environment Variables

### Frontend — `.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Express backend base URL. `http://localhost:3001` locally; your deployed backend URL in production. |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key. Enable **Maps JavaScript API** in Google Cloud Console. |
| `VITE_SUPABASE_URL` | Supabase project URL — found in Settings → API. |
| `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase `anon` public key (safe to expose in the browser). |

### Backend — `server/.env`

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Express listen port. Defaults to `3001`. |
| `FRONTEND_URL` | Yes (prod) | Allowed CORS origin. Set to your Netlify/Vercel URL in production. |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL (same as frontend). |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase **service role** key — bypasses RLS. **Never expose to the browser.** |
| `OPENROUTER_API_KEY` | Yes | OpenRouter key for AI itinerary theme generation. |
| `PEXELS_API_KEY` | No | [Pexels](https://www.pexels.com/api/) photo search. Falls back gracefully if missing. |
| `PIXABAY_API_KEY` | No | [Pixabay](https://pixabay.com/api/docs/) photo search. Falls back gracefully if missing. |
| `UNSPLASH_ACCESS_KEY` | No | [Unsplash](https://unsplash.com/developers) photo search. Falls back gracefully if missing. |
| `OPENTRIPMAP_API_KEY` | No | [OpenTripMap](https://opentripmap.io) additional place data. Overpass (keyless) runs first. |

---

## API Reference

All routes are served by the Express backend under `/api`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/trips/create-fast` | Create a trip; triggers async AI itinerary generation in the background |
| `GET` | `/api/trips/:id/itinerary-status` | Poll whether the itinerary is ready (`{ ready: boolean }`) |
| `GET` | `/api/trips/:id/itinerary-fast` | Serve the in-memory itinerary (available before the Supabase write completes) |
| `POST` | `/api/trips/migrate-guest` | Move guest trips to an authenticated user after sign-in |
| `GET` | `/api/photos/search?q=` | Proxy contextual photo search across Pexels / Pixabay / Openverse / Wikipedia |
| `GET` | `/api/geocode?q=` | Geocode a city name via Nominatim (rate-limited: 1 req/s per IP) |
| `GET` | `/api/health` | Server health, provider circuit-breaker states, and cache stats |

---

## Deployment

The frontend and backend must be deployed to **separate hosts** — the Express backend performs long-running async work that Netlify/Vercel serverless functions cannot support.

### Frontend → Netlify

1. Connect the GitHub repo in the Netlify dashboard
2. Build command: `npm run build`, Publish directory: `dist`
3. Add all `VITE_*` variables from `.env.example` in **Site settings → Environment variables**
4. Set `VITE_API_URL` to your deployed backend URL
5. Trigger a redeploy after setting env vars (they are baked in at build time)

### Backend → Railway (recommended)

1. Create a new Railway project → **Deploy from GitHub repo**
2. Set **Root directory** to `server`
3. Add all variables from `server/.env.example` in Railway's **Variables** tab
4. Set `FRONTEND_URL` to your Netlify site URL so CORS allows the origin
5. Railway will give you a public URL — paste it into `VITE_API_URL` in Netlify

Alternative free hosts: [Render](https://render.com), [Fly.io](https://fly.io).

---

## Scripts

```bash
npm run dev       # Start Vite dev server (frontend)
npm run build     # TypeScript check + production build
npm run lint      # ESLint
npm run preview   # Preview the production build locally

node server/server.js   # Start Express backend
```

---

## Contributing

1. Fork the repo and create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes — `npm run build` must pass before opening a PR
3. Open a pull request describing what changed and why

---

## License

MIT
