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
import React, { useState, useEffect, useMemo } from "react";

import Navbar from "../../components/Navbar/Navbar";
import PageIntro from "../../components/PageIntro/PageIntro";
import PlanSection from "../PlanSection";
import Footer from "../../components/Footer/Footer";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "react-i18next";
import { findDestinationOption } from "../../constants/allowedDestinations";
import DestinationCombobox from "../../components/DestinationCombobox/DestinationCombobox";
import { useDetectLocation } from "../../hooks/useDetectLocation";
import {
  validateTripForm,
  LOCATION_INPUT_REGEX,
  type TripFormErrors,
} from "../../validations/tripFormValidation";

type TravelStyle = "road" | "bus" | "resort";
type Currency = "USD" | "EUR" | "GBP";

interface MainpageProps {
  onTripCreated?: (tripId: string) => void;
}

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function deriveDuration(start: string, end: string): number {
  return Math.ceil(
    (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000
  );
}

// Destination pre-filled from the Destinations page click, resolved to a
// dataset entry when possible. Read once per mount by both state initializers.
function getStoredDestination(): { value: string; confirmed: boolean } {
  const stored: string | null = JSON.parse(
    localStorage.getItem("selectedDestination") || "null"
  );
  const option = findDestinationOption(stored ?? "");
  return { value: option?.value ?? stored ?? "", confirmed: !!option };
}

const CurrencyIcon: React.FC<{ currency: Currency }> = ({ currency }) => {
  if (currency === "USD") return <DollarSign size={18} className="text-emerald-500" />;
  if (currency === "EUR") return <Euro size={18} className="text-emerald-500" />;
  return <Pound size={18} className="text-emerald-500" />;
};

const Mainpage: React.FC<MainpageProps> = ({ onTripCreated }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === "dark";

  const TRAVEL_STYLES = useMemo(
    () => [
      { id: "road", label: t("road_trip"), icon: Car },
      { id: "bus", label: t("budget_bus"), icon: Bus },
      { id: "resort", label: t("resort_stay"), icon: Building2 },
    ],
    [t]
  );

  const today = toDateString(new Date());
  const defaultReturn = toDateString(new Date(Date.now() + 7 * 86_400_000));

  // ── Form state ──────────────────────────────────────────────────────────
  const [starting_date, setStartingDate] = useState<string>(today);
  const [returning_date, setReturningDate] = useState<string>(defaultReturn);
  const [starting_location, setStarting_location] = useState<string>("");
  const [destination, setDestination] = useState<string>(() => getStoredDestination().value);
  const [destinationConfirmed, setDestinationConfirmed] = useState<boolean>(() => getStoredDestination().confirmed);
  const [travelers, setTravelers] = useState<number>(2);
  const [travel_style, setStyle] = useState<TravelStyle>("road");
  const [budget_total, setBudget_total] = useState<number>(500);
  const [currency, setCurrency] = useState<Currency>("USD");

  // ── UI state ────────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<TripFormErrors>({});
  const [loading, setLoading] = useState(false);
  const [pendingTripId, setPendingTripId] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(() => !sessionStorage.getItem("intro_shown"));
  const [userId] = useState<string | null>(() => sessionStorage.getItem("user_id"));

  const { detecting, detectError, detectLocation } = useDetectLocation(setStarting_location);

  // Guests get a stable UUID identity (read later by the submit service)
  useEffect(() => {
    if (!localStorage.getItem("guest_id")) {
      localStorage.setItem("guest_id", crypto.randomUUID());
    }
  }, []);

  const increaseTravelers = () => setTravelers((prev) => Math.min(prev + 1, 20));
  const decreaseTravelers = () => setTravelers((prev) => Math.max(1, prev - 1));

  const onHandleStartingLocation = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === "" || LOCATION_INPUT_REGEX.test(inputValue)) {
      setStarting_location(inputValue);
    }
  };

  const resetForm = () => {
    setStartingDate(today);
    setReturningDate(defaultReturn);
    setTravelers(2);
    setStyle("road");
    setBudget_total(500);
    setCurrency("USD");
    setErrors({});
    localStorage.removeItem("selectedDestination");
  };

  const onSubmitHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validation may geocode the starting location (async) — show the loading
    // state so double-submits are blocked while it runs.
    setLoading(true);
    const newErrors = await validateTripForm({
      starting_location,
      destination,
      destinationConfirmed,
      starting_date,
      returning_date,
      travel_style,
      budget_total,
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setLoading(false);
      return;
    }

    try {
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
      sessionStorage.setItem("iterinary", JSON.stringify(formData));
      if (result?.trip?.id) {
        resetForm();
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
                      onClick={detectLocation}
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
                      if (val === "" || LOCATION_INPUT_REGEX.test(val)) {
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
                    <CurrencyIcon currency={currency} />
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
