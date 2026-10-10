import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import seoRoutes from "../../seo/routes.json";
import { SITE_NAME, SITE_URL, absoluteUrl as absolute } from "../../seo/site";

export interface SeoProps {
  title: string;
  description?: string;
  /** Canonical path; defaults to the current pathname. */
  path?: string;
  image?: string;
  noindex?: boolean;
  type?: "website" | "article";
  jsonLd?: object | object[];
}

// Every tag this component owns carries data-seo, so scripts/prerender.mjs can
// lift exactly these into the static HTML and nothing else.
function upsert(selector: string, create: () => HTMLElement, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute("data-seo", "");
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
}

function setMeta(key: "name" | "property", id: string, content: string | undefined) {
  const selector = `meta[${key}="${id}"]`;
  if (!content) {
    document.head.querySelector(selector)?.remove();
    return;
  }
  upsert(selector, () => {
    const m = document.createElement("meta");
    m.setAttribute(key, id);
    return m;
  }, { content });
}

export default function Seo({ title, description, path, image, noindex, type = "website", jsonLd }: SeoProps) {
  const { pathname } = useLocation();
  const canonicalPath = path ?? (pathname !== "/" ? pathname.replace(/\/+$/, "") : "/");

  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    const url = absolute(canonicalPath);
    const img = absolute(image ?? seoRoutes.defaultImage);

    document.title = fullTitle;
    setMeta("name", "description", description);
    setMeta("name", "robots", noindex ? "noindex, follow" : "index, follow");

    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:type", type);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", img);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", img);

    // A noindexed page shouldn't claim a canonical URL
    if (noindex) {
      document.head.querySelector('link[rel="canonical"]')?.remove();
    } else {
      upsert('link[rel="canonical"]', () => {
        const l = document.createElement("link");
        l.rel = "canonical";
        return l;
      }, { href: url });
    }

  }, [title, description, canonicalPath, image, noindex, type]);

  return jsonLd ? <JsonLd id="page" data={jsonLd} /> : null;
}

/** Structured data block; `id` lets a page add its own block next to the route's one. */
export function JsonLd({ id, data }: { id: string; data: object | object[] }) {
  const text = JSON.stringify(data);

  useEffect(() => {
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.setAttribute("data-seo", "");
    s.setAttribute("data-ld", id);
    s.textContent = text;
    document.head.querySelector(`script[data-ld="${id}"]`)?.remove();
    document.head.appendChild(s);
    return () => s.remove();
  }, [id, text]);

  return null;
}

type RouteMeta = { title: string; description?: string };

/** Applies routes.json metadata for static routes; dynamic pages render their own <Seo>. */
export function RouteSeo() {
  const { pathname } = useLocation();
  const key = pathname !== "/" ? pathname.replace(/\/+$/, "") : "/";

  const indexable = (seoRoutes.indexable as Record<string, RouteMeta>)[key];
  if (indexable) return <Seo {...indexable} path={key} jsonLd={key === "/" ? HOME_JSON_LD : undefined} />;

  const hidden = (seoRoutes.noindex as Record<string, RouteMeta>)[key];
  if (hidden) return <Seo {...hidden} noindex />;

  return null;
}

const HOME_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/icon.png`,
  },
];
