import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../../lib/analytics';
import posthog from 'posthog-js';

export default function PageTracker() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname + location.search);
    posthog.capture('$pageview', { $current_url: window.location.href });
  }, [location]);

  return null;
}
