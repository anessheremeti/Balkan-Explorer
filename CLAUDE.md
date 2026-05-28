# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server (frontend)
npm run build      # Type-check + build for production (tsc -b && vite build)
npm run lint       # ESLint
npm run preview    # Preview production build

node server/server.js   # Start Express backend separately
```

There is no test runner configured.

## Architecture

Full-stack travel planning app with AI-generated itineraries.

**Frontend:** React 19 + TypeScript, Vite, Tailwind CSS v4 + DaisyUI, React Router v7  
**Backend:** Express.js (`server/server.js`) — runs separately from the Vite dev server  
**Database/Auth:** Supabase (client initialized in `createClient.ts` at repo root)  
**AI:** OpenRouter API calling Llama 3 for itinerary generation  
**Maps:** Google Maps via `@react-google-maps/api`

### State Management

React Context only — no Redux or Zustand:
- `ThemeContext` — light/dark mode, persisted to `localStorage`
- `ToastContext` — app-wide toast notifications

Both providers wrap the app in [src/main.tsx](src/main.tsx).

### Key Patterns

- **Services as hooks** in [src/hooks/](src/hooks/) — `itineraryService.ts`, `tripService.tsx`, `usersService.tsx`, `submitService.tsx` handle all API/Supabase calls
- **Zod validation** in [src/validations/](src/validations/) for form schemas
- **TypeScript interfaces** in [src/Interfaces/](src/Interfaces/)
- **Page components** in [src/pages/](src/pages/) map 1:1 to routes defined in [src/App.tsx](src/App.tsx)

### Backend (`server/server.js`)

Two main endpoints:
- `POST /api/trips/create-fast` — creates a trip and triggers async AI itinerary generation
- `GET /api/trips/:id/itinerary-status` — polls itinerary generation status

Uses OpenRouter (not OpenAI directly) with `meta-llama/llama-3.3-70b-instruct:free` model. Has a fallback generator if the LLM call fails.

### Styling

- Tailwind v4 + DaisyUI — use DaisyUI component classes where possible
- Dark mode via `class` strategy; toggle managed by `ThemeContext`
- Custom fonts: Poppins (body), Monument/Clash (headings), Nunito
- Custom colors: `deepGreen`, `graniteGray`, `lightBackground`, `lightGray`

### TypeScript

Strict mode is on with `noUnusedLocals` and `noUnusedParameters` enforced — the build will fail if unused variables exist.


### Datanbase 
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.destinations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  country character varying NOT NULL,
  latitude double precision,
  longitude double precision,
  image_url text,
  CONSTRAINT destinations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.itinerary_days (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  trip_id uuid,
  day_number integer NOT NULL,
  date date,
  title character varying,
  CONSTRAINT itinerary_days_pkey PRIMARY KEY (id),
  CONSTRAINT itinerary_days_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id)
);
CREATE TABLE public.itinerary_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  itinerary_day_id uuid,
  place_id uuid,
  item_type character varying NOT NULL,
  title character varying NOT NULL,
  description text,
  start_time time without time zone NOT NULL,
  end_time time without time zone,
  estimated_cost numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT itinerary_items_pkey PRIMARY KEY (id),
  CONSTRAINT itinerary_items_itinerary_day_id_fkey FOREIGN KEY (itinerary_day_id) REFERENCES public.itinerary_days(id),
  CONSTRAINT itinerary_items_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id)
);
CREATE TABLE public.places (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  destination_id uuid,
  name character varying NOT NULL,
  category character varying NOT NULL,
  description text,
  latitude double precision,
  longitude double precision,
  price_level character varying,
  rating numeric,
  review_count integer DEFAULT 0,
  image_url text,
  CONSTRAINT places_pkey PRIMARY KEY (id),
  CONSTRAINT places_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES public.destinations(id)
);
CREATE TABLE public.post_comments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id uuid,
  user_id uuid,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_comments_pkey PRIMARY KEY (id),
  CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);
CREATE TABLE public.post_likes (
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  CONSTRAINT post_likes_pkey PRIMARY KEY (post_id, user_id),
  CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);
CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  content text NOT NULL,
  image_url text,
  location_name character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT posts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  password_hash text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.trips (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  title character varying NOT NULL,
  starting_location character varying,
  destination_id uuid,
  travel_style character varying,
  budget_total numeric,
  cost_estimated numeric,
  is_public boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  destination character varying,
  currency character varying,
  duration integer,
  travelers integer,
  CONSTRAINT trips_pkey PRIMARY KEY (id),
  CONSTRAINT trips_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES public.destinations(id)
);