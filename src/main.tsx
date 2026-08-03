import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import "./i18n";
import { initAnalytics } from "./lib/analytics";
import posthog from "posthog-js";
import { PostHogErrorBoundary, PostHogProvider } from "@posthog/react";
import { getConsent } from "./lib/consent";

// Neither PostHog nor GA4 is non-essential-cookie-free, so neither may fire
// until the visitor has explicitly accepted (see CookieConsent.tsx). If a
// decision already exists (returning visitor), honor it immediately;
// otherwise wait for the "cookie-consent-change" event the banner dispatches.
function initTracking() {
  if (import.meta.env.VITE_POSTHOG_PROJECT_TOKEN) {
    posthog.init(import.meta.env.VITE_POSTHOG_PROJECT_TOKEN, {
      // In production this should be "/ingest" — a same-origin path that
      // Netlify silently proxies to PostHog's EU cloud (see netlify.toml).
      // Locally VITE_POSTHOG_HOST is unset, so PostHog just never initializes.
      api_host: import.meta.env.VITE_POSTHOG_HOST,
      // Dashboard/toolbar links still need the real PostHog UI, not the proxy path.
      ui_host: "https://eu.posthog.com",
      defaults: "2026-05-30",
      capture_pageview: false,
    });
  }
  initAnalytics();
}

if (getConsent() === "accepted") {
  initTracking();
} else {
  window.addEventListener("cookie-consent-change", (e) => {
    if ((e as CustomEvent).detail === "accepted") initTracking();
  }, { once: true });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <PostHogErrorBoundary>
        <BrowserRouter>
        <ToastProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </ToastProvider>
        </BrowserRouter>
      </PostHogErrorBoundary>
    </PostHogProvider>
  </StrictMode>
);
