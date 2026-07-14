import { useState } from "react";

/**
 * Detects the user's current location via the browser Geolocation API and
 * reverse-geocodes it to a "City, Country" label (Nominatim).
 *
 * Every failure mode maps to a specific, user-readable message in
 * `detectError`; `onDetected` fires only with a successfully resolved label.
 */
export function useDetectLocation(onDetected: (label: string) => void) {
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setDetectError("Geolocation is not supported by your browser.");
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
          if (!res.ok) throw new Error("Geocoding request failed");
          const data = await res.json();
          const addr = data.address ?? {};
          const city =
            addr.city ?? addr.town ?? addr.village ??
            addr.municipality ?? addr.county ?? "";
          const country = addr.country ?? "";
          const label = [city, country].filter(Boolean).join(", ");
          const result = label || (data.display_name?.split(",")[0]?.trim() ?? "");
          if (!result) throw new Error("Location could not be resolved");
          onDetected(result);
          setDetectError(null);
        } catch {
          setDetectError("Could not resolve your location. Please type it manually.");
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        setDetecting(false);
        if (err.code === err.PERMISSION_DENIED) {
          setDetectError("Location access denied. Enable it in your browser settings and try again.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setDetectError("Your position is currently unavailable. Please type it manually.");
        } else if (err.code === err.TIMEOUT) {
          setDetectError("Location request timed out. Please try again.");
        } else {
          setDetectError("Could not detect your location. Please type it manually.");
        }
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  };

  return { detecting, detectError, detectLocation };
}
