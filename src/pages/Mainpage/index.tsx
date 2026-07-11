import {
  MapPin,
  Car,
  Bus,
  Building2,
  Minus,
  Plus,
  Wand2,
  Target,
  DollarSign,
  Euro,
  PoundSterling as Pound,
  Loader2,
} from "lucide-react";
import React, { useState, useMemo } from "react";

import Navbar from "../../components/Navbar/Navbar";
import PageIntro from "../../components/PageIntro/PageIntro";
import PlanSection from "../PlanSection";
import Footer from "../../components/Footer/Footer";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "react-i18next";
import {
  isDestinationAllowed,
  ALLOWED_COUNTRIES,
  BALKAN_DESTINATIONS,
  findDestinationOption,
} from "../../constants/allowedDestinations";
import DestinationCombobox from "../../components/DestinationCombobox/DestinationCombobox";

type TravelStyle = "road" | "bus" | "resort";
type Currency = "USD" | "EUR" | "GBP";

interface MainpageProps {
  onTripCreated?: (tripId: string) => void;
}

type Errors = {
  starting_location?: string;
  destination?: string;
  starting_date?: string;
  returning_date?: string;
  budget_total?: string;
  travelers?: string | number;
};

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function deriveDuration(start: string, end: string): number {
  return Math.ceil(
    (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000
  );
}

function normCity(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n];
}

function isSameCityFuzzy(inputCity: string, knownCity: string): boolean {
  const a = normCity(inputCity);
  const b = normCity(knownCity);
  if (a === b) return true;
  // ≤3 chars: exact only (avoids "Bar" vs "Bari"); 4-5 chars: 1 edit; 6+: 2 edits
  const threshold = b.length <= 3 ? 0 : b.length <= 5 ? 1 : 2;
  return editDistance(a, b) <= threshold;
}

const Mainpage: React.FC<MainpageProps> = ({ onTripCreated }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const TRAVEL_STYLES = useMemo(
    () => [
      { id: "road", label: t("road_trip"), icon: Car },
      { id: "bus", label: t("budget_bus"), icon: Bus },
      { id: "resort", label: t("resort_stay"), icon: Building2 },
    ],
    [t]
  );

  const isDark = theme === "dark";

  const today = toDateString(new Date());
  const defaultReturn = toDateString(new Date(Date.now() + 7 * 86_400_000));
  const busReturn = toDateString(new Date(Date.now() + 14 * 86_400_000)); 
  const roadTripReturn =  toDateString(new Date(Date.now() + 31 * 86_400_000)); 
  const [starting_date, setStartingDate] = useState<string>(today);
  const [returning_date, setReturningDate] = useState<string>(defaultReturn);
  const [starting_location, setStarting_location] = useState<string>("");

  // Pre-fill destination from Destinations page click — resolve to dataset entry if possible
  const [destination, setDestination] = useState<string>(() => {
    const stored: string | null = JSON.parse(
      localStorage.getItem("selectedDestination") || "null"
    );
    return findDestinationOption(stored ?? "")?.value ?? stored ?? "";
  });
  const [destinationConfirmed, setDestinationConfirmed] = useState<boolean>(() => {
    const stored: string | null = JSON.parse(
      localStorage.getItem("selectedDestination") || "null"
    );
    return stored ? !!findDestinationOption(stored) : false;
  });

  const [travelers, setTravelers] = useState<number>(2);
  const [travel_style, setStyle] = useState<TravelStyle>("road");
  const [budget_total, setBudget_total] = useState<number>(500);
  const [currency, setCurrency] = useState<Currency>("USD");

  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [pendingTripId, setPendingTripId] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(() => !sessionStorage.getItem('intro_shown'));
  const [detecting, setDetecting] = useState(false);
  const [userId] = useState<string | null>(() => sessionStorage.getItem("user_id"));

  const increaseTravelers = () => setTravelers((prev) => Math.min(prev + 1, 20));
  const decreaseTravelers = () => setTravelers((prev) => Math.max(1, prev - 1));

  const [detectError, setDetectError] = useState<string | null>(null);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setDetectError('Geolocation is not supported by your browser.');
      return;
    }

    setDetecting(true);
    setDetectError(null);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=en`
          );
          if (!res.ok) throw new Error('Geocoding request failed');
          const data = await res.json();
          const addr = data.address ?? {};
          const city =
            addr.city ?? addr.town ?? addr.village ??
            addr.municipality ?? addr.county ?? '';
          const country = addr.country ?? '';
          const label = [city, country].filter(Boolean).join(', ');
          const result = label || (data.display_name?.split(',')[0]?.trim() ?? '');
          if (!result) throw new Error('Location could not be resolved');
          setStarting_location(result);
          setDetectError(null);
        } catch {
          setDetectError('Could not resolve your location. Please type it manually.');
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        setDetecting(false);
        if (err.code === err.PERMISSION_DENIED) {
          setDetectError('Location access denied. Enable it in your browser settings and try again.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setDetectError('Your position is currently unavailable. Please type it manually.');
        } else if (err.code === err.TIMEOUT) {
          setDetectError('Location request timed out. Please try again.');
        } else {
          setDetectError('Could not detect your location. Please type it manually.');
        }
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  };
  const onHandleStartingLocation = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === '' || /^[\p{L}\s,\-'.]+$/u.test(inputValue)) {
      setStarting_location(inputValue);
    }
  };
  const guestId = localStorage.getItem("guest_id");
  if (!guestId) {
    const id = crypto.randomUUID();
    localStorage.setItem("guest_id", id);
  }

  const CurrencyIcon = () => {
    if (currency === "USD") return <DollarSign size={18} className="text-emerald-500" />;
    if (currency === "EUR") return <Euro size={18} className="text-emerald-500" />;
    return <Pound size={18} className="text-emerald-500" />;
  };
    
  const validate = () => {
    const newErrors: Errors = {};

    // starting_location
    const trimmedStart = starting_location.trim();
    if (!trimmedStart) {
      newErrors.starting_location = "Starting location is required";
    } else if (trimmedStart.length < 2) {
      newErrors.starting_location = "Please enter a valid location";
    }

    // destination required + confirmed + allowed
    if (!destination.trim()) {
      newErrors.destination = "Destination is required";
    } else if (!destinationConfirmed) {
      newErrors.destination = "Please select a destination from the list";
    } else if (!isDestinationAllowed(destination)) {
      newErrors.destination = `Only destinations in ${ALLOWED_COUNTRIES.join(", ")} are supported`;
    }

    // same location / same country (only when both fields are valid)
    if (!newErrors.starting_location && !newErrors.destination) {
      const startNorm = trimmedStart.toLowerCase();
      const destNorm = destination.trim().toLowerCase();

      const startCity = trimmedStart.split(',')[0].trim();
      const destCity = destination.split(',')[0].trim();
      // Find the canonical allowlist city that the destination resolves to
      const canonicalCity = BALKAN_DESTINATIONS
        .flatMap(d => [...d.cities])
        .find(c => isSameCityFuzzy(c, destCity));

      if (startNorm === destNorm) {
        newErrors.destination = "Starting location and destination cannot be the same.";
      } else if (canonicalCity && isSameCityFuzzy(startCity, canonicalCity)) {
        newErrors.destination = "Your starting location appears to be the same city as your destination.";
      } else {
        const sameCountry = ALLOWED_COUNTRIES.some(
          country => startNorm.includes(country.toLowerCase()) && destNorm.includes(country.toLowerCase())
        );
        if (sameCountry) {
          newErrors.destination = "Your destination must be in a different country than your starting location.";
        }
      }
    }

    // dates
    if (!starting_date) {
      newErrors.starting_date = "Departure date is required";
    } else if (starting_date < today) {
      newErrors.starting_date = "Departure date cannot be in the past";
    }

    if (!returning_date) {
      newErrors.returning_date = "Return date is required";
    } else if (returning_date <= starting_date) {
      newErrors.returning_date = "Return date must be after departure date";
    } else if (travel_style === 'bus' && (returning_date < defaultReturn || returning_date > busReturn)) {
      newErrors.returning_date = "Bus travel requires a trip length between 7 and 14 days.";
    } else if ((travel_style === 'road' || travel_style === 'resort') && returning_date > roadTripReturn) {
      newErrors.returning_date = "This travel style supports a maximum of 31 days.";
    }

    // budget
    if (!budget_total || budget_total < 500) {
      newErrors.budget_total = "Budget should be at least $500";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmitHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);

      const formData = {
        title: `${starting_location} → ${destination}`,
        starting_location,
        destination,
        starting_date,
        returning_date,
        travelers,
        travel_style,
        budget_total,
        currency,
      };
      
      const { submitServiceWithItineraryFast } =
        await import("../../hooks/submitService");
      const result = await submitServiceWithItineraryFast(formData);
      sessionStorage.setItem('iterinary', JSON.stringify(formData));
      if (result?.trip?.id) {
        setStartingDate(today);
        setReturningDate(defaultReturn);
        setTravelers(2);
        setStyle("road");
        setBudget_total(500);
        setCurrency("USD");
        setErrors({});
        localStorage.removeItem("selectedDestination");
        setPendingTripId(result.trip.id);
        onTripCreated?.(result.trip.id);
      }
    } catch (error) {
      console.error("Submission failed:", error);
      setErrors({
        destination: (error as Error).message || "Failed to create trip",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full min-h-screen ${isDark ? "bg-slate-950" : "bg-white"}`}>
      {showIntro && (
        <PageIntro
          onComplete={() => {
            sessionStorage.setItem('intro_shown', '1');
            setShowIntro(false);
          }}
        />
      )}
      <Navbar />

      <main className={`${isDark ? "bg-slate-950" : "bg-white"}`}>
        {/* HERO */}
        <section className="px-4 sm:px-6 lg:px-12 pt-8 lg:pt-16 pb-6 sm:pb-12">
          <div className="max-w-7xl mx-auto flex flex-col items-center text-center gap-4 sm:gap-6">
            <h1
              className={`font-bold leading-tight tracking-tight text-2xl sm:text-5xl md:text-6xl lg:text-7xl ${
                isDark ? "text-slate-50" : "text-gray-900"
              }`}
            >
              {t("discover the hidden Balkans")}
              <span className="block text-indigo-600">Hidden Balkans</span>
            </h1>

            <p className={`text-base sm:text-xl max-w-2xl ${isDark ? "text-slate-400" : "text-gray-600"}`}>
              {t("create a personalized itenary")}
            </p>
          </div>
        </section>

        {/* FORM */}
        <section className="px-4 sm:px-6 lg:px-12 pb-16">
          <div className="max-w-5xl mx-auto">
            <div className="h-1.5 w-full bg-linear-to-r from-cyan-400 via-blue-500 to-fuchsia-500 rounded-t-2xl" />

            <form
              onSubmit={onSubmitHandler}
              className={`border rounded-b-2xl shadow-lg p-4 sm:p-8 lg:p-10 space-y-5 sm:space-y-8 ${
                isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
              }`}
            >
              {/* FROM + DESTINATION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* FROM */}
                <div className="space-y-2">
                  <label className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-slate-900"}`}>
                    {t("starting_from")}
                  </label>

                  <div className="relative">
                    <MapPin
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-500 pointer-events-none"
                    />
                    <input
                      type="text"
                      onChange={onHandleStartingLocation}
                      value={starting_location}
                      placeholder={t("where")}
                      maxLength={40}
                      className={`w-full pl-10 pr-24 py-3 rounded-xl border ${
                        isDark
                          ? "bg-slate-800 text-slate-300 border-slate-700 placeholder:text-slate-500"
                          : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={detecting}
                      
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-sky-100 text-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    >
                      {detecting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Target size={14} />
                      )}
                      {detecting ? 'Detecting…' : 'Detect'}
                    </button>
                  </div>

                  {errors.starting_location && (
                    <p className={`text-xs ${isDark ? "text-red-400" : "text-red-500"}`}>
                      {errors.starting_location}
                    </p>
                  )}
                  {detectError && !errors.starting_location && (
                    <p className={`text-xs ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                      {detectError}
                    </p>
                  )}
                  {starting_location.length > 28 && (
                    <p className={`text-xs text-right ${starting_location.length >= 40 ? "text-red-500" : isDark ? "text-slate-500" : "text-slate-400"}`}>
                      {starting_location.length}/40
                    </p>
                  )}
                </div>

                {/* DESTINATION */}
                <div className="space-y-2">
                  <label className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-slate-900"}`}>
                    {t("destination")}
                    <span className={`hidden sm:inline ml-2 text-xs font-normal ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      Kosovo · Albania · North Macedonia · Montenegro
                    </span>
                    <span className={`sm:hidden block text-xs font-normal mt-0.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                      Kosovo · Albania · N. Macedonia · Montenegro
                    </span>
                  </label>

                  <DestinationCombobox
                    value={destination}
                    confirmed={destinationConfirmed}
                    onChange={(val, isConfirmed) => {
                      if (val === '' || /^[\p{L}\s,\-'.]+$/u.test(val)) {
                        setDestination(val);
                  }
                     setDestinationConfirmed(isConfirmed);
                      if (isConfirmed) setErrors((prev) => ({ ...prev, destination: undefined }));
                    }}
                    isDark={isDark}
                    hasError={!!errors.destination}
                  />

                  {errors.destination && (
                    <p className={`text-xs ${isDark ? "text-red-400" : "text-red-500"}`}>
                      {errors.destination}
                    </p>
                  )}
                </div>
              </div>

              {/* DATES + TRAVELERS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* DATES */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-slate-900"}`}>
                      {t("dates")}
                    </label>
                    {starting_date && returning_date && returning_date > starting_date && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-600">
                        {deriveDuration(starting_date, returning_date)} {t("days")}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {t("departure")}
                      </span>
                      <input
                        type="date"
                        value={starting_date}
                        min={today}
                        onChange={(e) => {
                          setStartingDate(e.target.value);
                          if (returning_date && returning_date <= e.target.value) {
                            setReturningDate(
                              toDateString(new Date(new Date(e.target.value).getTime() + 86_400_000))
                            );
                          }
                          setErrors((prev) => ({ ...prev, starting_date: undefined }));
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-sm ${
                          isDark
                            ? "bg-slate-800 text-slate-300 border-slate-700"
                            : "bg-slate-50 border-slate-200 text-slate-800"
                        } ${errors.starting_date ? "border-red-400" : ""}`}
                      />
                      {errors.starting_date && (
                        <p className="text-red-500 text-xs">{errors.starting_date}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {t("return")}
                      </span>
                      <input
                        type="date"
                        value={returning_date}
                        min={
                          starting_date
                            ? toDateString(new Date(new Date(starting_date).getTime() + 86_400_000))
                            : today
                        }
                        onChange={(e) => {
                          setReturningDate(e.target.value);
                          setErrors((prev) => ({ ...prev, returning_date: undefined }));
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-sm ${
                          isDark
                            ? "bg-slate-800 text-slate-300 border-slate-700"
                            : "bg-slate-50 border-slate-200 text-slate-800"
                        } ${errors.returning_date ? "border-red-400" : ""}`}
                      />
                      {errors.returning_date && (
                        <p className="text-red-500 text-xs">{errors.returning_date}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* TRAVELERS */}
                <div className="space-y-2">
                  <label className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-slate-900"}`}>
                    {t("travelers")}
                  </label>

                  <div
                    className={`flex items-center mt-2 sm:mt-6 justify-between border rounded-xl p-2 ${
                      isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <button type="button" onClick={decreaseTravelers} className="p-2">
                      <Minus size={16} />
                    </button>
                    <span className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-slate-900"}`}>
                      {travelers}
                    </span>
                    <button type="button" onClick={increaseTravelers} className="p-2">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* TRAVEL STYLE */}
              <div className="space-y-3">
                <label className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-slate-900"}`}>
                  {t("travelStyle")}
                </label>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {TRAVEL_STYLES.map(({ id, label, icon: Icon }) => {
                    const active = travel_style === id;
                    return (
                      <button
                        type="button"
                        key={id}
                        onClick={() => setStyle(id as TravelStyle)}
                        className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 rounded-xl border transition-all duration-200 hover:cursor-pointer ${
                          active
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                            : isDark
                            ? "bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        <Icon size={18} />
                        <span className="font-medium text-xs sm:text-sm leading-tight text-center">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BUDGET */}
              <div className="space-y-2">
                <label className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-slate-900"}`}>
                  {t("your budget")}
                </label>

                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <CurrencyIcon />
                  </div>
                  <input
                    type="number"
                    value={budget_total}
                    onChange={(e) => setBudget_total(Number(e.target.value))}
                    placeholder="e.g. 1500"
                    className={`w-full pl-10 pr-20 py-3 rounded-xl border font-semibold ${
                      isDark
                        ? "bg-slate-800 text-slate-300 border-slate-700 placeholder:text-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400"
                    }`}
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>

                {errors.budget_total && (
                  <p className="text-red-500 text-xs">{errors.budget_total}</p>
                )}
              </div>

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3.5 sm:py-4 rounded-xl hover:cursor-pointer font-semibold text-sm sm:text-base hover:bg-slate-800 active:scale-[0.98] transition disabled:opacity-50"
              >
                {loading ? "Creating..." : t("discover the hidden Balkans")}
                <Wand2 className="text-sky-400" size={18} />
              </button>
            </form>
          </div>
        </section>

        <PlanSection pendingTripId={pendingTripId} userId={userId} />
        <Footer />
      </main>
    </div>
  );
};

export default Mainpage;
