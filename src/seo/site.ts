import seoRoutes from "./routes.json";

// Production origin used for canonical/og:url and the sitemap. Set VITE_SITE_URL
// in Netlify, or let vite.config.ts fall back to Netlify's built-in URL variable.
export const SITE_URL = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, "");
export const SITE_NAME = seoRoutes.siteName;

export const absoluteUrl = (url: string) => (/^https?:\/\//.test(url) ? url : `${SITE_URL}${url}`);
