import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, Calendar, Users, Wallet, ArrowLeft,
  ChevronLeft, ChevronRight, Plane, AlertCircle,
  ChevronDown, Map as MapIcon, AlertTriangle, Check, X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import { useTheme } from '../../context/ThemeContext';
import { useMyTrips, type TripSummary } from '../../hooks/useMyTrips';
import { useItineraryForTrip, type ItineraryDayView } from '../../hooks/useItineraryForTrip';
import DayMapModal from '../../components/DayMapModal/DayMapModal';
import { loadMapState } from '../../hooks/useSessionMapState';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function getDurationDays(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const diff = Math.ceil(
    (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000
  );
  return diff > 0 ? diff : null;
}

const STYLE_COLORS: Record<string, { bg: string; text: string }> = {
  adventure:  { bg: 'bg-orange-100', text: 'text-orange-700' },
  cultural:   { bg: 'bg-purple-100', text: 'text-purple-700' },
  relaxation: { bg: 'bg-teal-100',   text: 'text-teal-700'   },
  beach:      { bg: 'bg-cyan-100',   text: 'text-cyan-700'   },
  budget:     { bg: 'bg-green-100',  text: 'text-green-700'  },
  luxury:     { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  family:     { bg: 'bg-pink-100',   text: 'text-pink-700'   },
};

function styleChip(style: string | null) {
  if (!style) return { bg: 'bg-slate-100', text: 'text-slate-600' };
  return STYLE_COLORS[style.toLowerCase()] ?? { bg: 'bg-slate-100', text: 'text-slate-600' };
}

function capitalize(s: string | null): string {
  if (!s) return 'General';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── DayRow ───────────────────────────────────────────────────────────────────
// A single itinerary day inside the expanded trip panel.
// Has its own "Show on map" confirmation mini-flow.

interface DayRowProps {
  day: ItineraryDayView;
  isDark: boolean;
  onOpenMap: (day: ItineraryDayView) => void;
}

const DayRow: React.FC<DayRowProps> = ({ day, isDark, onOpenMap }) => {
  const [confirming, setConfirming] = useState(false);

  const mappableCount = day.items.filter(i => i.coords !== null).length;

  const borderColor = isDark ? 'border-slate-700' : 'border-slate-100';
  const sub = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`border-b last:border-b-0 ${borderColor}`}>
      <div className="flex items-center justify-between gap-3 px-5 py-3.5">

        {/* Day badge + title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#0ea5e9] text-white flex items-center justify-center text-xs font-bold shrink-0">
            {day.day_number}
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-semibold truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {day.title}
            </p>
            <p className={`text-xs ${sub}`}>
              {day.date
                ? new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                : `Day ${day.day_number}`}
              {' · '}
              {day.items.length} {day.items.length === 1 ? 'activity' : 'activities'}
              {/* Only set for country-wide trips ("Albania" — all cities) */}
              {day.city && <> {' · '} <span className="font-semibold text-[#0ea5e9]">{day.city}</span></>}
            </p>
          </div>
        </div>

        {/* Show on map button */}
        <button
          onClick={() => setConfirming(true)}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            isDark
              ? 'text-slate-300 bg-slate-700 hover:bg-slate-600'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          <MapIcon size={13} />
          Map
        </button>
      </div>

      {/* Inline confirmation strip */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className={`mx-5 mb-3 rounded-xl px-4 py-3 border ${
              isDark ? 'bg-sky-900/30 border-sky-700/50' : 'bg-sky-50 border-sky-200'
            }`}>
              <p className={`text-xs font-semibold mb-2.5 ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
                Show Day {day.day_number} locations on map?
                {mappableCount > 0 && (
                  <span className={`font-normal ml-1.5 ${isDark ? 'text-sky-400' : 'text-sky-500'}`}>
                    ({mappableCount} pin{mappableCount !== 1 ? 's' : ''} available)
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setConfirming(false); onOpenMap(day); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-xs font-bold rounded-lg transition-colors"
                >
                  <Check size={12} />
                  Open map
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <X size={12} />
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── TripItineraryPanel ───────────────────────────────────────────────────────
// Expanded itinerary panel for a single trip.
// Fetches lazily on first expand, owns the DayMapModal state.

interface TripItineraryPanelProps {
  tripId: string;
  isDark: boolean;
}

const TripItineraryPanel: React.FC<TripItineraryPanelProps> = ({ tripId, isDark }) => {
  const { days, isLoading, error } = useItineraryForTrip_Scoped(tripId);
  const [mapDay, setMapDay]         = useState<ItineraryDayView | null>(null);
  // Incrementing this mounts a fresh DayMapModal (resets activeIdx) without
  // destroying it on close, which lets AnimatePresence run the exit animation.
  const [mapGeneration, setMapGeneration] = useState(0);

  const handleOpenMap = (d: ItineraryDayView) => {
    setMapDay(d);
    setMapGeneration(g => g + 1);
  };

  const border = isDark ? 'border-slate-700' : 'border-slate-100';

  if (isLoading) {
    return (
      <div className={`border-t px-5 py-5 flex items-center gap-2.5 ${border}`}>
        <div className="w-4 h-4 border-2 border-[#0ea5e9] border-t-transparent rounded-full animate-spin shrink-0" />
        <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Loading itinerary…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`border-t px-5 py-4 flex items-start gap-2.5 ${border} ${
        isDark ? 'bg-red-900/10' : 'bg-red-50'
      }`}>
        <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
        <p className={`text-xs ${isDark ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className={`border-t px-5 py-5 text-center ${border}`}>
        <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          No itinerary generated yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={`border-t ${border}`}>
        {days.map(day => (
          <DayRow
            key={day.id}
            day={day}
            isDark={isDark}
            onOpenMap={handleOpenMap}
          />
        ))}
      </div>

      <DayMapModal
        key={mapGeneration}
        tripId={tripId}
        days={days}
        initialDayIndex={mapDay ? days.findIndex(d => d.id === mapDay.id) : 0}
        isOpen={mapDay !== null}
        onClose={() => setMapDay(null)}
        isDark={isDark}
      />
    </>
  );
};

// Scoped version of useItineraryForTrip that fetches immediately on mount.
// This is a wrapper that calls fetchTrip(tripId) once, kept at panel-level
// so the hook's stable `fetchTrip` isn't in a problematic dep array.
function useItineraryForTrip_Scoped(tripId: string) {
  const { days, isLoading, error, fetchTrip } = useItineraryForTrip();

  React.useEffect(() => {
    fetchTrip(tripId);
  }, [tripId, fetchTrip]);

  return { days, isLoading, error };
}

// ─── TripCard ─────────────────────────────────────────────────────────────────

interface TripCardProps {
  trip: TripSummary;
  index: number;
  isDark: boolean;
  initialExpanded?: boolean;
}

const TripCard: React.FC<TripCardProps> = ({ trip, index, isDark, initialExpanded }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded ?? false);
  const duration = getDurationDays(trip.starting_date, trip.returning_date);
  const chip = styleChip(trip.travel_style);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      className={`rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
      }`}
    >
      {/* ── Card header ───────────────────────────────────────────────── */}
      <div className={`px-6 pt-5 pb-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin size={15} className="text-[#0ea5e9] shrink-0 mt-0.5" />
            <span className={`text-sm font-semibold truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {trip.destination ?? 'Unknown destination'}
            </span>
          </div>
          <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${chip.bg} ${chip.text}`}>
            {capitalize(trip.travel_style)}
          </span>
        </div>

        <h2 className={`mt-3 text-xl font-extrabold tracking-tight leading-snug ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}>
          {trip.title}
        </h2>
      </div>

      {/* ── Card body: trip stats ──────────────────────────────────────── */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          <div className="flex items-start gap-2.5">
            <Calendar size={15} className={`mt-0.5 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Dates
              </p>
              <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                {formatDate(trip.starting_date)}
                <span className={`mx-1.5 font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>→</span>
                {formatDate(trip.returning_date)}
              </p>
              {duration !== null && (
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {duration} {duration === 1 ? 'night' : 'nights'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Users size={15} className={`mt-0.5 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Travelers
              </p>
              <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                {trip.travelers ?? 1} {(trip.travelers ?? 1) === 1 ? 'person' : 'people'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 sm:col-span-2">
            <Wallet size={15} className={`mt-0.5 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Budget
              </p>
              <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                {trip.budget_total != null
                  ? `${trip.currency ?? '€'} ${trip.budget_total.toLocaleString()}`
                  : 'Not specified'}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ── View Itinerary toggle ──────────────────────────────────────── */}
      <div className={`px-6 pb-4`}>
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            isExpanded
              ? isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'
              : isDark ? 'bg-slate-700/60 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>{isExpanded ? 'Hide Itinerary' : 'View Itinerary'}</span>
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* ── Itinerary panel (lazy) ─────────────────────────────────────── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <TripItineraryPanel tripId={trip.id} isDark={isDark} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  onPage: (p: number) => void;
  isDark: boolean;
}

const Pagination: React.FC<PaginationProps> = ({ page, totalPages, totalCount, onPage, isDark }) => {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="flex flex-col items-center gap-3 mt-8">
      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Showing {(page - 1) * 3 + 1}–{Math.min(page * 3, totalCount)} of {totalCount} trips
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className={`p-2 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onPage(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`w-9 h-9 rounded-lg text-sm font-semibold border transition-colors ${
              p === page
                ? 'bg-[#0ea5e9] border-[#0ea5e9] text-white'
                : isDark
                ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className={`p-2 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const MyTravels: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { trips, page, totalPages, totalCount, isLoading, authLoading, error, isLoggedOut, goToPage } =
    useMyTrips();

  // Restore last-opened trip from session (so the card auto-expands)
  const savedMapState = loadMapState('myTravels');

  const showSpinner = authLoading || (isLoading && trips.length === 0);

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">

        {/* Page header */}
        <div className="mb-8">
          <Link
            to="/"
            className={`inline-flex items-center gap-2 text-sm font-semibold mb-6 group transition-colors ${
              isDark ? 'text-slate-400 hover:text-[#0ea5e9]' : 'text-slate-500 hover:text-[#0ea5e9]'
            }`}
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            Back to Dashboard
          </Link>

          <div className="flex items-end justify-between">
            <div>
              <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                My Travels
              </h1>
              {!authLoading && !isLoggedOut && (
                <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {isLoading ? 'Loading…' : `${totalCount} ${totalCount === 1 ? 'trip' : 'trips'} planned`}
                </p>
              )}
            </div>
            <Link to="/">
              <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
                <Plane size={15} />
                Plan new trip
              </button>
            </Link>
          </div>
        </div>

        {/* Not logged in */}
        {isLoggedOut && (
          <div className={`rounded-2xl border p-10 text-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <Plane size={24} className="text-[#0ea5e9]" />
            </div>
            <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Sign in to view your trips</h2>
            <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Create an account or log in to track your travel plans.
            </p>
            <Link to="/login">
              <button className="px-6 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold rounded-xl transition-colors text-sm">
                Log in
              </button>
            </Link>
          </div>
        )}

        {/* Loading skeletons */}
        {!isLoggedOut && showSpinner && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className={`rounded-2xl border h-44 animate-pulse ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
              />
            ))}
          </div>
        )}

        {/* Error */}
        {!isLoggedOut && !showSpinner && error && (
          <div className={`rounded-2xl border p-6 flex items-start gap-3 ${
            isDark ? 'bg-red-900/20 border-red-800/40' : 'bg-red-50 border-red-200'
          }`}>
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className={`text-sm font-semibold ${isDark ? 'text-red-300' : 'text-red-700'}`}>Failed to load trips</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoggedOut && !showSpinner && !error && trips.length === 0 && (
          <div className={`rounded-2xl border p-10 text-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <Plane size={24} className={isDark ? 'text-slate-400' : 'text-slate-400'} />
            </div>
            <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>No trips yet</h2>
            <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              You haven't planned any trips. Start exploring the Balkans!
            </p>
            <Link to="/">
              <button className="px-6 py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold rounded-xl transition-colors text-sm">
                Plan your first trip
              </button>
            </Link>
          </div>
        )}

        {/* Trip list */}
        {!isLoggedOut && !showSpinner && !error && trips.length > 0 && (
          <>
            <div className="space-y-4">
              {trips.map((trip, i) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  index={i}
                  isDark={isDark}
                  initialExpanded={savedMapState?.tripId === trip.id}
                />
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              onPage={goToPage}
              isDark={isDark}
            />
          </>
        )}

        {/* Inline page-change spinner */}
        {!showSpinner && isLoading && trips.length > 0 && (
          <div className="flex justify-center mt-6">
            <div className={`w-6 h-6 border-2 border-t-[#0ea5e9] rounded-full animate-spin ${
              isDark ? 'border-slate-600' : 'border-slate-200'
            }`} />
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
};

export default MyTravels;
