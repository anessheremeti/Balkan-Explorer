import ReactGA from 'react-ga4';

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

export function initAnalytics() {
  if (!MEASUREMENT_ID) return;
  ReactGA.initialize(MEASUREMENT_ID, {
    gaOptions: { anonymize_ip: true },
  });
}

export function trackPageView(path: string, title?: string) {
  if (!MEASUREMENT_ID) return;
  ReactGA.send({ hitType: 'pageview', page: path, title });
}

export function trackEvent(
  category: string,
  action: string,
  label?: string,
  value?: number
) {
  if (!MEASUREMENT_ID) return;
  ReactGA.event({ category, action, label, value });
}

// Typed event helpers so call sites stay readable
export const Analytics = {
  tripCreated: (destination: string) =>
    trackEvent('Trip', 'trip_created', destination),

  destinationViewed: (destination: string) =>
    trackEvent('Destination', 'destination_viewed', destination),

  itineraryGenerated: (destination: string, duration: number) =>
    trackEvent('Itinerary', 'itinerary_generated', destination, duration),

  searchPerformed: (query: string) =>
    trackEvent('Search', 'search_performed', query),

  authAction: (action: 'signup' | 'login' | 'logout') =>
    trackEvent('Auth', action),

  communityPostCreated: () =>
    trackEvent('Community', 'post_created'),
};
