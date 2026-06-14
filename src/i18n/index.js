// src/i18n/index.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files for content
import enContent from "./locales/en/content.json";
import sqContent from "./locales/sq/content.json";
import deContent from "./locales/de/content.json";

// Import translation files for navbar
import enNavbar from "./locales/en/navbar.json";
import sqNavbar from "./locales/sq/navbar.json";
import deNavbar from "./locales/de/navbar.json";
// Import translation files for footer
import enFooter from "./locales/en/footer.json";
import sqFooter from "./locales/sq/footer.json";
import deFooter from "./locales/de/footer.json";
// import
import enItinerary from "./locales/en/itinerary.json";
import sqItinerary from "./locales/sq/itinerary.json";
import deItinerary from "./locales/de/itinerary.json";

//settings imports

import enSettings from "./locales/en/settings.json";
import sqSettings from "./locales/sq/settings.json";
import deSettings from "./locales/de/settings.json";


// app settings
import enAppSettings from "./locales/en/app-settings.json";
import sqAppSettings from "./locales/sq/app-settings.json";
import deAppSettings from "./locales/de/app-settings.json";
// pages
import enPages from "./locales/en/pages.json";
import sqPages from "./locales/sq/pages.json";
import dePages from "./locales/de/pages.json";

// destinations
import enDestinations from "./locales/en/destinations.json";
import sqDestinations from "./locales/sq/destinations.json";
import deDestinations from "./locales/de/destinations.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    debug: false,
    ns: ["common", "navbar", "footer", "itinerary", "settings", "app_settings", "pages", "destinations"],
    defaultNS: "common",

    resources: {
      en: {
        common: enContent,
        itinerary: enItinerary,
        settings: enSettings,
        app_settings: enAppSettings,
        navbar: enNavbar,
        footer: enFooter,
        pages: enPages,
        destinations: enDestinations,
      },
      sq: {
        common: sqContent,
        itinerary: sqItinerary,
        settings: sqSettings,
        app_settings: sqAppSettings,
        navbar: sqNavbar,
        footer: sqFooter,
        pages: sqPages,
        destinations: sqDestinations,
      },
      de: {
        common: deContent,
        itinerary: deItinerary,
        settings: deSettings,
        app_settings: deAppSettings,
        navbar: deNavbar,
        footer: deFooter,
        pages: dePages,
        destinations: deDestinations,
      },
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;