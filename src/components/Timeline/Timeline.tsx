import { ChevronDown, Star, MapPin, Navigation, Map as MapIcon, Loader2, Compass } from "lucide-react";
import React, { useState, useEffect } from "react";
import { supabase } from "../../../createClient";
import { useItemPhoto } from "../../hooks/useItemPhoto";
import {
  getLatestTripItinerary,
  getItineraryByTripId,
  type ItineraryDay,
  type Trip,
  type ItineraryItem,
} from "../../hooks/itineraryService";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../constants/api";

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 75; // 150 seconds total — covers AI timeout + fallback save

interface TimelineProps {
  pendingTripId?: string | null;
  onViewOnMap?: (dayNumber: number) => void;
  activeMapDayNumber?: number | null;
}

const Timeline: React.FC<TimelineProps> = ({ pendingTripId, onViewOnMap, activeMapDayNumber }) => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [itineraryDays, setItineraryDays] = useState<ItineraryDay[]>([]);
  const [, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [generating, setGenerating] = useState(false);
  const [, setPollAttempt] = useState(0);
  const { theme } = useTheme();
  const { t } = useTranslation('itinerary');
  
  // ── Fetch latest itinerary on mount ──────────────────────────────────────
  useEffect(() => {
    // Skip normal fetch when a new trip is being generated
    if (pendingTripId) return;

    const fetchItinerary = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id ?? null;
        const guestId = localStorage.getItem("guest_id");

        if (!userId && !guestId) {
          setError("Please log in to see your itinerary");
          return;
        }

        const response = await getLatestTripItinerary(userId, guestId);

        if (response.error) {
          setError(response.error);
          return;
        }

        setTrip(response.trip);
        setItineraryDays(response.days);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load itinerary");
      } finally {
        setLoading(false);
      }
    };

    fetchItinerary();
  }, [pendingTripId]);

  // ── Poll until AI itinerary is ready, then load it ───────────────────────
  useEffect(() => {
    if (!pendingTripId) return;

    let attempt = 0;
    let cancelled = false;

    const poll = async () => {
      setGenerating(true);
      setLoading(false);
      setError(null);

      while (attempt < POLL_MAX_ATTEMPTS) {
        if (cancelled) return;

        try {
          const res = await fetch(`${API_BASE}/api/trips/${pendingTripId}/itinerary-status`);
          const { ready } = await res.json();

          setPollAttempt(attempt + 1);

          if (ready) {
            // Try in-memory fast endpoint first (no Supabase latency)
            let itinerary: { trip: Trip; days: ItineraryDay[] } | null = null;
            try {
              const fastRes = await fetch(`${API_BASE}/api/trips/${pendingTripId}/itinerary-fast`);
              if (fastRes.ok) itinerary = await fastRes.json();
            } catch { /* fall through */ }

            // Fallback: query Supabase directly
            if (!itinerary) {
              const res = await getItineraryByTripId(pendingTripId!);
              if (res.trip) itinerary = { trip: res.trip, days: res.days };
            }

            if (!cancelled && itinerary) {
              setTrip(itinerary.trip);
              setItineraryDays(itinerary.days);
              setExpandedDay(1);
              setGenerating(false);
            }
            return;
          }
        } catch {
          // network hiccup — keep polling
        }

        attempt++;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }

      // Timed out
      
    };

    poll();
    return () => { cancelled = true; };
  }, [pendingTripId]);

  // ── Generating state (AI is building the itinerary) ─────────────────────
  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-sky-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          </div>
        </div>
        <div>
          <h3 className={`font-semibold text-base ${theme === 'dark' ? 'text-gray-200' : 'text-slate-800'}`}>
            {t('generating_itinerary', 'Building your itinerary…')}
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            {t('generating_desc', 'Usually takes 15–30 seconds')}
          </p>
        </div>
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-sky-300 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  /**
   * ✅ EMPTY STATE
   */
  if (!trip || itineraryDays.length === 0) {
    return (
      <div className={`rounded-2xl border-2 border-dashed p-10 text-center ${
        theme === 'dark' ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50/60'
      }`}>
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center">
            <Compass className="w-8 h-8 text-sky-500" />
          </div>
        </div>
        <h3 className={`text-lg font-bold mb-1 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
          Your next adventure is waiting
        </h3>
        <p className={`text-sm max-w-xs mx-auto mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
          Fill in the form above — destination, dates, travel style — and we'll build your personalized Balkan itinerary in seconds.
        </p>
        <div className="flex items-center justify-center gap-6 text-xs font-medium">
          {[
            { icon: '📍', label: 'Pick a destination' },
            { icon: '📅', label: 'Choose your dates' },
            { icon: '✨', label: 'Get your itinerary' },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className="text-xl">{step.icon}</span>
              <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /**
   * ✅ RENDER TIMELINE
   */
  return (
    <div className="space-y-6">
      {/* Trip Header */}
     

      {/* Itinerary Days */}
      <div className="space-y-4">
        {itineraryDays.map((day) => (
          <div key={day.id} className="space-y-3">
            {/* Day Header */}
            <div
              role="button"
              tabIndex={0}
              onClick={() =>
                setExpandedDay(expandedDay === day.day_number ? null : day.day_number)
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ')
                  setExpandedDay(expandedDay === day.day_number ? null : day.day_number);
              }}
              className={`w-full flex items-center justify-between group cursor-pointer p-3 rounded-xl transition ${
                theme === "dark" ? "text-gray-500 hover:bg-slate-700/40" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold shadow-md shrink-0">
                  {day.day_number}
                </div>
                <div className="text-left">
                  <h3 className={`text-lg font-bold ${theme === "dark" ? "text-gray-300" : "text-slate-900"}`}>
                    {day.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {new Date(day.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onViewOnMap && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onViewOnMap(day.day_number); }}
                    title="View on map"
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      activeMapDayNumber === day.day_number
                        ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400'
                        : theme === 'dark'
                        ? 'text-slate-400 hover:bg-slate-600 hover:text-slate-200'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                  >
                    <MapIcon size={13} />
                    Map
                  </button>
                )}
                <ChevronDown
                  size={20}
                  className={`text-slate-400 transition-transform ${
                    expandedDay === day.day_number ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>

            {/* Day Activities - Expandable */}
            {expandedDay === day.day_number && (
              <div className="pl-14 space-y-3 animate-in fade-in duration-200">
                {day.itinerary_items && day.itinerary_items.length > 0 ? (
                  day.itinerary_items.map((item) => (
                    <ActivityCard key={item.id} item={item} destination={trip?.destination} />
                  ))
                ) : (
                  <p className="text-sm text-slate-500 italic">{t('no_activities')}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

interface ActivityCardProps {
  item: ItineraryItem;
  destination?: string;
}

const TYPE_CONFIG: Record<string, { label: string; badgeClass: string; placeholderBg: string; iconClass: string }> = {
  transport: {
    label: "Transport",
    badgeClass: "text-slate-400",
    placeholderBg: "bg-violet-100",
    iconClass: "text-violet-300",
  },
  stay: {
    label: "Stay",
    badgeClass: "text-amber-500",
    placeholderBg: "bg-blue-100",
    iconClass: "text-blue-300",
  },
  food: {
    label: "Food",
    badgeClass: "text-orange-500",
    placeholderBg: "bg-orange-100",
    iconClass: "text-orange-300",
  },
  activity: {
    label: "Activity",
    badgeClass: "text-green-500",
    placeholderBg: "bg-green-100",
    iconClass: "text-green-300",
  },
};

const BottomMeta: React.FC<{ item: ItineraryItem }> = ({ item }) => {
  const type = item.item_type.toLowerCase();

  if (type === "transport") {
    const duration = item.metadata?.duration;
    const distance = item.metadata?.distance;
    if (!duration && !distance) return null;
    return (
      <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
        {duration && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
            {duration}
          </span>
        )}
        {distance && (
          <span className="flex items-center gap-1.5">
            <Navigation size={11} />
            {distance}
          </span>
        )}
      </div>
    );
  }

  if (type === "stay") {
    const rating = item.place?.rating ?? item.metadata?.rating;
    const reviewCount = item.place?.review_count ?? item.metadata?.review_count;
    if (!rating && !reviewCount) return null;
    return (
      <div className="flex items-center gap-3 text-xs mt-2">
        <span className="flex items-center gap-1">
          <Star size={12} className="text-amber-400 fill-amber-400" />
          <span className="text-slate-700 font-medium">
            {rating}
            {reviewCount ? ` (${reviewCount} reviews)` : ""}
          </span>
        </span>
        <a href="#" className="text-sky-500 font-medium hover:underline">
          View Booking
        </a>
      </div>
    );
  }

  if (type === "food" || type === "activity") {
    const distanceFrom = item.metadata?.distance_from;
    const priceLevel = item.place?.price_level ?? item.metadata?.price_level;
    if (!distanceFrom && !priceLevel) return null;
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
        {distanceFrom && (
          <span className="flex items-center gap-1">
            <MapPin size={11} className="text-red-400" />
            {distanceFrom}
          </span>
        )}
        {distanceFrom && priceLevel && <span className="text-slate-300">·</span>}
        {priceLevel && <span>{priceLevel}</span>}
      </div>
    );
  }

  return null;
};

const ActivityCard: React.FC<ActivityCardProps> = ({ item, destination }) => {
  const config = TYPE_CONFIG[item.item_type.toLowerCase()] ?? {
    label: item.item_type,
    badgeClass: "text-slate-400",
    placeholderBg: "bg-slate-100",
    iconClass: "text-slate-300",
  };

  const staticUrl = item.place?.image_url ?? item.metadata?.image_url;
  // Use the pre-built contextual query from metadata if present (set at generation
  // time, e.g. "Star cafe Ulcinj Montenegro"). For legacy items without it, the
  // hook merges title + destination itself at Level 1.
  const photoTitle = (item.metadata?.photo_query ?? item._photo_query) ?? item.title;
  const hasQueryContext = !!(item.metadata?.photo_query ?? item._photo_query);
  // Real-world coordinates — present in metadata (Supabase path) or as _-prefixed
  // fields (in-memory fast-serve path). Needed for Google Places photo lookup.
  const lat = item.metadata?.lat ?? item._lat;
  const lon = item.metadata?.lon ?? item._lon;
  // Local-language name stored alongside the English-preferred title
  const nameLocal = item.metadata?.name_local ?? item._name_local ?? null;
  const { url: fetchedUrl, loading: photoLoading } = useItemPhoto(photoTitle, {
    fallback: hasQueryContext ? undefined : destination,
    itemType: item.item_type,
    enabled: !staticUrl,
    lat,
    lon,
    placeName: item.title,
  });
  const imageUrl = staticUrl ?? fetchedUrl;
  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden flex shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Thumbnail */}
      <div className="relative w-40 shrink-0 min-h-27">
        {photoLoading ? (
          <div className={`w-full h-full absolute inset-0 animate-pulse ${config.placeholderBg}`} />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={item.title}
            className="w-full h-full object-cover absolute inset-0"
          />
        ) : (
          <div className={`w-full h-full absolute inset-0 flex items-center justify-center ${config.placeholderBg}`}>
            <svg
              className={`w-12 h-12 ${config.iconClass}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
          </div>
        )}
        {/* Time badge */}
        <span className="absolute top-2 left-2 z-10 bg-black/60 text-white text-[11px] font-medium px-2 py-0.5 rounded-md leading-snug">
          {formatTime(item.start_time)}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col justify-between min-h-27">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-slate-900 text-[14px] leading-snug">
                {item.title}
              </h4>
              {nameLocal && (
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5 italic">
                  {nameLocal}
                </p>
              )}
            </div>
            <span className={`text-xs font-medium shrink-0 ${config.badgeClass}`}>
              {config.label}
            </span>
          </div>
          <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
            {item.description}
          </p>
        </div>
        <BottomMeta item={item} />
      </div>
    </div>
  );
};

/**
 * ✅ UTILITY: Format time from HH:MM:SS to readable format
 */
function formatTime(timeStr: string | undefined): string {
  if (!timeStr) return "Time TBA";

  try {
    const [hours, minutes] = timeStr.split(":").slice(0, 2);
    const hour = parseInt(hours, 10);

    if (hour < 12) return `${hours}:${minutes} AM`;
    if (hour === 12) return `12:${minutes} PM`;
    return `${String(hour - 12).padStart(2, "0")}:${minutes} PM`;
  } catch {
    return timeStr;
  }
}

export default Timeline;