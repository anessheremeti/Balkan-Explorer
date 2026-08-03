// Single source of truth for cookie-consent state — read by main.tsx (gates
// PostHog/GA4 init) and by CookieConsent.tsx (renders the banner + writes
// the decision). No non-essential tracking script may fire before one of
// these two values is present.
export type ConsentValue = "accepted" | "rejected";

const KEY = "cookie_consent";

export function getConsent(): ConsentValue | null {
  const v = localStorage.getItem(KEY);
  return v === "accepted" || v === "rejected" ? v : null;
}

export function setConsent(value: ConsentValue) {
  localStorage.setItem(KEY, value);
  window.dispatchEvent(new CustomEvent("cookie-consent-change", { detail: value }));
}
