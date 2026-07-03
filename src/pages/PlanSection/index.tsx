import { Calendar, Loader, Users } from "lucide-react";
import HeaderActions from "../../components/HeaderActions/HeaderActions";
import SummaryCards from "../../components/SummaryCards/SummaryCards";
import Timeline from "../../components/Timeline/Timeline";
import InlineDayMap from "../../components/InlineDayMap/InlineDayMap";
import { useEffect, useState } from "react";
import tripService from "../../hooks/tripService";
import { type Trip } from "../../hooks/itineraryService";
import { supabase } from "../../../createClient";
import {useTranslation} from "react-i18next";
import { API_BASE } from "../../constants/api";
import { useDownloadPDF } from "../../hooks/useDownloadPDF";
import PDFAuthModal from "../../components/DownloadPDF/PDFAuthModal";

type Theme = "light" | "dark";

interface PlanSectionProps {
  userId: string | null;
  pendingTripId?: string | null;
}
const PlanSection: React.FC<PlanSectionProps> = ({ userId, pendingTripId }) => {
  const POLL_INTERVAL_MS = 2000;
  const POLL_MAX_ATTEMPTS = 75; // 150 s — covers 55 s AI timeout + fallback save
  const {t} = useTranslation('itinerary');
  const { download: downloadPDF, loading: pdfLoading, showAuthModal, closeAuthModal } = useDownloadPDF();
  const [theme, setTheme] = useState<Theme>("light");
  const [trips, setTrips] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pollAttempt, setPollAttempt] = useState(0);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [getItineraryByTripId, setGetItineraryByTripId] = useState<((id: string) => Promise<unknown>) | null>(null);
  const [selectedMapDayNumber, setSelectedMapDayNumber] = useState<number | null>(null);

      // Initialize the service hook
      useEffect(() => {
        const initService = async () => {
          const service = await tripService();
          setGetItineraryByTripId(() => service.getLatestTrip);
        };
        initService();
      }, [trips]);
    

  // Theme
  useEffect(() => {
    const loadTheme = () => {
      try {
        const stored = localStorage.getItem("app_settings");
        if (!stored) return;
        const parsed = JSON.parse(stored);
        setTheme(parsed?.theme === "dark" ? "dark" : "light");
      } catch (err) {
        console.error("Theme error:", err);
      }
    };
    loadTheme();
    window.addEventListener("storage", loadTheme);
    return () => window.removeEventListener("storage", loadTheme);
  }, []);
  const isDark = theme === "dark";

  // ── Poll until AI itinerary is ready, then load it ───────────────────────
    useEffect(() => {
      if (!pendingTripId || !getItineraryByTripId) return;
  
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
              let itinerary: { trip: Trip } | null = null;
              try {
                const fastRes = await fetch(`${API_BASE}/api/trips/${pendingTripId}/itinerary-fast`);
                if (fastRes.ok) itinerary = await fastRes.json() as { trip: Trip };
              } catch { /* fall through */ }

              // Fallback: query Supabase directly
              if (!itinerary) itinerary = (await getItineraryByTripId(pendingTripId!)) as { trip: Trip };

              if (!cancelled && itinerary) {
                setTrip(itinerary.trip);
                setGenerating(false);
              }
            }
          } catch {
            // network hiccup — keep polling
          }
  
          attempt++;
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        }
  
        // Polling window exhausted — do one final fetch since the server
        // always saves a fallback itinerary, so it should be ready by now.
        if (!cancelled) {
          try {
            const itinerary = await getItineraryByTripId(pendingTripId!) as { trip: Trip; days: unknown[] };
            setTrip(itinerary.trip);
          } catch {
            // nothing to show — user can retry by refreshing
          } finally {
            setGenerating(false);
          }
        }
      };
  
      poll();
      return () => { cancelled = true; };
    }, [getItineraryByTripId, pendingTripId]);

  // Fetch latest trip
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: authData } = await supabase.auth.getUser();
       
         const userId = authData?.user?.id;
         const guestId = localStorage.getItem('guest_id')
       // console.log("Authenticated user ID:", userId);
        if(!userId  && !guestId) {
          setError("User not authenticated");
          setLoading(false);
          
          return;
        }

        const { getLatestTrip } = await tripService();
        const latestTrip = await getLatestTrip(userId ?? null, guestId);

       if (!latestTrip) {
          setError("No trips found");
          setTrips(null);
          return;
        }

        setTrips(latestTrip);
       // console.log("Fetched trip:", latestTrip);

      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to fetch trips");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // Trip range formatter
  const formatTripRange = (trip: Trip | null): string => {
    if (!trip) return "N/A";

    // Prefer explicit date fields; fall back to itinerary day dates
    let startDate: Date | null = trip.starting_date ? new Date(trip.starting_date) : null;
    let endDate: Date | null = trip.returning_date ? new Date(trip.returning_date) : null;

    if (!startDate || !endDate) {
      const timeline = trip.itinerary_days || [];
      if (timeline.length > 0) {
        startDate = new Date(timeline[0].date);
        endDate = new Date(timeline[timeline.length - 1].date);
      }
    }

    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return "N/A";
    }

    const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long" });
    const dayFormatter = new Intl.DateTimeFormat("en-US", { day: "numeric" });
    const startMonth = monthFormatter.format(startDate);
    const endMonth = monthFormatter.format(endDate);
    const startDay = dayFormatter.format(startDate);
    const endDay = dayFormatter.format(endDate);

    return startMonth === endMonth
      ? `${startMonth} ${startDay}–${endDay}`
      : `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
  };

  const currentTrip = trip ?? trips;
  const tripRange = formatTripRange(currentTrip);
 // console.log("Current trip:", currentTrip);
  const guestId = localStorage.getItem('guest_id')
if (generating) {
    const progress = Math.min(Math.round((pollAttempt / POLL_MAX_ATTEMPTS) * 100), 99);
    return (
      <div className="space-y-6">
        <div className="border border-sky-100 bg-sky-50 rounded-2xl p-8 py-8 text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <Loader className="w-16 h-16 animate-spin text-sky-200" />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-sky-500">
              {progress}%
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-base">
              {t('building_itinerary')}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {t('building_subtitle')}
            </p>
          </div>
          <div className="w-full bg-sky-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-sky-500 h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Loading state (initial fetch) ────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <Loader className="w-8 h-8 animate-spin mx-auto text-sky-500" />
            <p className="text-sm text-slate-500">{t('loading_itinerary')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full min-h-screen px-24 py-10 ${
      isDark
        ? "bg-gray-900 border-t border-slate-600"
        : "bg-white border-t border-slate-100"
    } text-slate-900 dark:bg-slate-900 dark:text-slate-50`}>

      <div className="flex items-center gap-10 text-gray-500 text-sm">
        <div className="flex items-center gap-2">
          <Calendar size={18} />
          <span>{tripRange}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={18} />
          {currentTrip && <span>{t('travelers_count', { count: currentTrip?.travelers ?? 0 })}</span>}
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center mt-4">
        <h1 className={`text-4xl font-bold ${
      isDark
        ? "text-gray-300"
        : "text-slate-900"
    }`}>
          {t('trip_header')} {currentTrip?.destination || "Your Destination"}
        </h1>
        <HeaderActions onDownloadPDF={downloadPDF} pdfLoading={pdfLoading} />
      </div>

      <PDFAuthModal open={showAuthModal} onClose={closeAuthModal} />

      {loading && <p className="mt-4">Loading trips...</p>}
      {error && <p className="mt-4 text-red-500">{error}</p>}

      <div className="grid gap-6 mt-10 sm:grid-cols-6 lg:grid-cols-12">
        <div className="col-span-8 space-y-6">
          <SummaryCards userId={userId || guestId} />
          <Timeline
            pendingTripId={pendingTripId}
            onViewOnMap={(dayNumber) => setSelectedMapDayNumber(dayNumber)}
            activeMapDayNumber={selectedMapDayNumber}
          />
        </div>

        <div className="col-span-4">
          <div className="sticky top-6 space-y-4">
            <InlineDayMap
              tripId={currentTrip?.id ?? null}
              activeDayNumber={selectedMapDayNumber}
              onDayChange={(dayNumber) => setSelectedMapDayNumber(dayNumber)}
              isDark={isDark}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanSection;