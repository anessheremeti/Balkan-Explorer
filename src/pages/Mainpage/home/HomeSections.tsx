import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "motion/react";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Handshake,
  Languages,
  Map as MapIcon,
  Wallet,
} from "lucide-react";
import { BALKAN_DESTINATIONS } from "../../../constants/allowedDestinations";
import {
  POPULAR,
  REVIEWS,
  ROUTES,
  SAMPLE_REVIEWS,
  type CountryCode,
  type Review,
  type RouteIdea,
} from "./homeContent";
import "./home-sections.css";

const COUNTRY_NAMES: Record<Review["country"], string> = {
  al: "Albania", xk: "Kosovo", mk: "North Macedonia", me: "Montenegro",
  de: "Germany", ch: "Switzerland", gb: "United Kingdom", us: "United States", at: "Austria",
};

const Flag: React.FC<{ code: Review["country"] | CountryCode }> = ({ code }) => (
  <img
    className="hs-flag"
    src={`https://flagcdn.com/w40/${code}.png`}
    srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
    width={20}
    height={14}
    alt={COUNTRY_NAMES[code]}
    loading="lazy"
  />
);

/** Fades a section up once as it scrolls into view */
const Reveal: React.FC<{ className?: string; children: React.ReactNode; labelledBy?: string }> = ({
  className,
  children,
  labelledBy,
}) => {
  const reduce = useReducedMotion();
  return (
    <motion.section
      className={className}
      aria-labelledby={labelledBy}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.section>
  );
};

const SectionHead: React.FC<{
  id: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ id, title, subtitle, action }) => (
  <div className="hs-head">
    <div>
      <h2 id={id} className="hs-h2">{title}</h2>
      {subtitle && <p className="hs-sub">{subtitle}</p>}
    </div>
    {action}
  </div>
);

function useCarouselControls(api: UseEmblaCarouselType[1]) {
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    if (!api) return;
    const update = () => {
      setCanPrev(api.canScrollPrev());
      setCanNext(api.canScrollNext());
    };
    update();
    api.on("select", update).on("reInit", update);
    return () => {
      api.off("select", update).off("reInit", update);
    };
  }, [api]);

  const prev = useCallback(() => api?.scrollPrev(), [api]);
  const next = useCallback(() => api?.scrollNext(), [api]);
  return { canPrev, canNext, prev, next };
}

const CarouselButtons: React.FC<ReturnType<typeof useCarouselControls>> = ({ canPrev, canNext, prev, next }) => {
  const { t } = useTranslation("home");
  return (
    <div className="hs-arrows">
      <button type="button" className="hs-arrow" onClick={prev} disabled={!canPrev} aria-label={t("prev")}>
        <ChevronLeft size={20} aria-hidden="true" />
      </button>
      <button type="button" className="hs-arrow" onClick={next} disabled={!canNext} aria-label={t("next")}>
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </div>
  );
};

// ─── Popular right now ─────────────────────────────────────────────────────

const PopularGrid: React.FC = () => {
  const { t } = useTranslation("home");
  return (
    <Reveal className="hs-section" labelledBy="hs-popular">
      <SectionHead
        id="hs-popular"
        title={t("popular_title")}
        subtitle={t("popular_subtitle")}
        action={
          <Link to="/destinations" className="hs-link">
            {t("popular_all")} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        }
      />
      <ul className="hs-popular">
        {POPULAR.map((place) => (
          <li key={place.id}>
            <Link to={`/destination/${place.id}`} className="hs-tile">
              <span className="hs-tile-img">
                <img src={place.image} alt="" loading="lazy" width={480} height={360} />
              </span>
              <span className="hs-tile-name">
                <Flag code={place.country} />
                {place.name}
              </span>
              <span className="hs-tile-tag">{t(place.taglineKey)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Reveal>
  );
};

// ─── Ready-made routes ─────────────────────────────────────────────────────

const RoutesCarousel: React.FC<{ onUse: (route: RouteIdea) => void }> = ({ onUse }) => {
  const { t } = useTranslation("home");
  const { t: tc } = useTranslation();
  const [viewportRef, api] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" });
  const controls = useCarouselControls(api);
  const styleLabel: Record<RouteIdea["style"], string> = {
    road: tc("road_trip"),
    bus: tc("budget_bus"),
    resort: tc("resort_stay"),
  };

  return (
    <Reveal className="hs-section" labelledBy="hs-routes">
      <SectionHead
        id="hs-routes"
        title={t("routes_title")}
        subtitle={t("routes_subtitle")}
        action={<CarouselButtons {...controls} />}
      />
      <div className="hs-viewport" ref={viewportRef}>
        <ul className="hs-track">
          {ROUTES.map((route) => (
            <li key={route.id} className="hs-slide hs-slide-route">
              <article className="hs-route">
                <div className="hs-route-img">
                  <img src={route.image} alt="" loading="lazy" width={960} height={720} />
                  <span className="hs-chips">
                    <span className="hs-chip">{t("days_count", { count: route.days })}</span>
                    <span className="hs-chip">{styleLabel[route.style]}</span>
                  </span>
                  <div className="hs-route-title">
                    <h3>{t(route.nameKey)}</h3>
                    <p>
                      {route.from} <ArrowRight size={14} aria-hidden="true" />
                      <span className="sr-only">to</span> {route.to}
                    </p>
                  </div>
                </div>
                <div className="hs-route-body">
                  <p className="hs-stops">
                    <span className="hs-stops-label">{t("stops")}</span>
                    {route.stops.join(" · ")}
                  </p>
                  <button type="button" className="hs-btn" onClick={() => onUse(route)}>
                    {t("use_route")}
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
};

// ─── Features ──────────────────────────────────────────────────────────────

const FEATURES = [
  { key: "itinerary", icon: CalendarDays, to: "/features/itinerary-builder" },
  { key: "map", icon: MapIcon, to: "/features/route-mapping" },
  { key: "budget", icon: Wallet, to: "/how-it-works" },
  { key: "pdf", icon: FileDown, to: "/features/pdf-export" },
  { key: "deals", icon: Handshake, to: "/destinations" },
  { key: "languages", icon: Languages, to: "/app-settings" },
] as const;

const Features: React.FC = () => {
  const { t } = useTranslation("home");
  return (
    <Reveal className="hs-section" labelledBy="hs-features">
      <SectionHead id="hs-features" title={t("features_title")} subtitle={t("features_subtitle")} />
      <ul className="hs-features">
        {FEATURES.map(({ key, icon: Icon, to }) => (
          <li key={key}>
            <Link to={to} className="hs-feature">
              <Icon size={22} className="hs-feature-icon" aria-hidden="true" />
              <span className="hs-feature-title">{t(`feat_${key}`)}</span>
              <span className="hs-feature-desc">{t(`feat_${key}_desc`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Reveal>
  );
};

// ─── Stats (facts about the product, not invented traction) ────────────────

const CITY_COUNT = BALKAN_DESTINATIONS.reduce((n, region) => n + region.cities.length, 0);

const Stats: React.FC = () => {
  const { t } = useTranslation("home");
  const stats = [
    { value: String(BALKAN_DESTINATIONS.length), label: t("stat_countries") },
    { value: String(CITY_COUNT), label: t("stat_cities") },
    { value: "3", label: t("stat_languages") },
    { value: "€0", label: t("stat_free") },
  ];
  return (
    <Reveal className="hs-section hs-stats-wrap">
      <dl className="hs-stats">
        {stats.map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
    </Reveal>
  );
};

// ─── Reviews ───────────────────────────────────────────────────────────────

// Sample copy only renders in `npm run dev`; production shows real reviews or nothing
const SHOW_SAMPLES = import.meta.env.DEV && REVIEWS.length === 0;
const REVIEW_ITEMS = REVIEWS.length > 0 ? REVIEWS : SHOW_SAMPLES ? SAMPLE_REVIEWS : [];

const Reviews: React.FC = () => {
  const { t, i18n } = useTranslation("home");
  const reduce = useReducedMotion();
  const autoplay = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true, stopOnFocusIn: true })
  );
  const [viewportRef, api] = useEmblaCarousel(
    { align: "start", loop: true },
    reduce ? [] : [autoplay.current]
  );
  const controls = useCarouselControls(api);
  const monthYear = new Intl.DateTimeFormat(i18n.language, { month: "short", year: "numeric" });

  if (REVIEW_ITEMS.length === 0) return null;

  return (
    <Reveal className="hs-section" labelledBy="hs-reviews">
      <SectionHead id="hs-reviews" title={t("reviews_title")} action={<CarouselButtons {...controls} />} />
      {SHOW_SAMPLES && <p className="hs-note">{t("reviews_sample_note")}</p>}
      <div className="hs-viewport" ref={viewportRef}>
        <ul className="hs-track">
          {REVIEW_ITEMS.map((review, i) => (
            <li key={i} className="hs-slide hs-slide-review">
              <figure className="hs-review">
                <blockquote>
                  <p className="hs-review-title">{review.title}</p>
                  <p className="hs-review-text">{review.text}</p>
                </blockquote>
                <figcaption className="hs-review-meta">
                  <Flag code={review.country} />
                  <span>{monthYear.format(new Date(`${review.date}T00:00:00`))}</span>
                  <span aria-hidden="true">·</span>
                  <span>{review.source}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
};

// ─── Closing call to action ────────────────────────────────────────────────

const ClosingCta: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  const { t } = useTranslation("home");
  return (
    <Reveal className="hs-section">
      <div className="hs-cta">
        <h2 className="hs-cta-title">{t("cta_title")}</h2>
        <p className="hs-cta-text">{t("cta_text")}</p>
        <button type="button" className="hs-btn hs-btn-band" onClick={onStart}>
          {t("cta_button")}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </Reveal>
  );
};

interface HomeSectionsProps {
  onUseRoute: (route: RouteIdea) => void;
  onStart: () => void;
}

// Temporarily hidden (not deleted): "Ready-made routes" and "What travellers
// say". The components above are kept as they are; set a flag back to true
// to show that section again. (Flags rather than commented-out JSX, because
// the build's unused-code checks would fail on components nobody renders.)
const SHOW_ROUTES = false;
const SHOW_REVIEWS = false;

const HomeSections: React.FC<HomeSectionsProps> = ({ onUseRoute, onStart }) => (
  <div className="hs">
    <PopularGrid />
    {SHOW_ROUTES && <RoutesCarousel onUse={onUseRoute} />}
    <Features />
    <Stats />
    {SHOW_REVIEWS && <Reviews />}
    <ClosingCta onStart={onStart} />
  </div>
);

export default HomeSections;
