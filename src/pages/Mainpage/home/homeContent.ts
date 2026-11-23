import sarande from "../../../assets/sarande.webp";
import kotor from "../../../assets/kotor.webp";
import ohrid from "../../../assets/ohrid.webp";
import gjirokaster from "../../../assets/gjirokaster.webp";
import berat from "../../../assets/home/berat.webp";
import budva from "../../../assets/home/budva.webp";
import ksamil from "../../../assets/home/ksamil.webp";
import rugova from "../../../assets/home/rugova.webp";
import svetiStefan from "../../../assets/home/svetistefan.webp";
import theth from "../../../assets/home/theth.webp";
import valbona from "../../../assets/home/valbona.webp";

export type CountryCode = "al" | "xk" | "mk" | "me";
export type RouteStyle = "road" | "bus" | "resort";

export interface PopularPlace {
  name: string;
  /** Id of its /destination/:id page (mockDestinations in destinationService) */
  id: string;
  country: CountryCode;
  taglineKey: string;
  image: string;
}

export interface RouteIdea {
  id: string;
  nameKey: string;
  from: string;
  /** Value accepted by the starting-location input */
  fromValue: string;
  to: string;
  stops: string[];
  days: number;
  style: RouteStyle;
  image: string;
}

export interface Review {
  title: string;
  text: string;
  country: CountryCode | "de" | "ch" | "gb" | "us" | "at";
  /** ISO date, shown as month + year */
  date: string;
  source: string;
}

export const POPULAR: PopularPlace[] = [
  { name: "Sarandë", id: "1", country: "al", taglineKey: "tag_sarande", image: sarande },
  { name: "Kotor", id: "2", country: "me", taglineKey: "tag_kotor", image: kotor },
  { name: "Ohrid", id: "3", country: "mk", taglineKey: "tag_ohrid", image: ohrid },
  { name: "Berat", id: "9", country: "al", taglineKey: "tag_berat", image: berat },
  { name: "Pejë", id: "7", country: "xk", taglineKey: "tag_peje", image: rugova },
  { name: "Gjirokastër", id: "5", country: "al", taglineKey: "tag_gjirokaster", image: gjirokaster },
  { name: "Budva", id: "6", country: "me", taglineKey: "tag_budva", image: budva },
  { name: "Theth", id: "10", country: "al", taglineKey: "tag_theth", image: theth },
];

export const ROUTES: RouteIdea[] = [
  {
    id: "riviera", nameKey: "route_riviera", from: "Prishtinë", fromValue: "Pristina", to: "Sarandë",
    stops: ["Prizren", "Durrës", "Vlorë"], days: 6, style: "road", image: ksamil,
  },
  {
    id: "bay", nameKey: "route_bay", from: "Prishtinë", fromValue: "Pristina", to: "Kotor",
    stops: ["Pejë", "Podgorica", "Budva"], days: 5, style: "road", image: kotor,
  },
  {
    id: "lake", nameKey: "route_lake", from: "Prishtinë", fromValue: "Pristina", to: "Ohrid",
    stops: ["Skopje", "Tetovo", "Struga"], days: 3, style: "bus", image: ohrid,
  },
  {
    id: "stone", nameKey: "route_stone", from: "Tirana", fromValue: "Tirana", to: "Gjirokastër",
    stops: ["Berat", "Përmet"], days: 4, style: "road", image: berat,
  },
  {
    id: "alps", nameKey: "route_alps", from: "Prishtinë", fromValue: "Pristina", to: "Shkodër",
    stops: ["Gjakova", "Valbona", "Koman"], days: 4, style: "road", image: valbona,
  },
  {
    id: "coast", nameKey: "route_coast", from: "Tirana", fromValue: "Tirana", to: "Budva",
    stops: ["Shkodër", "Ulcinj", "Sveti Stefan"], days: 4, style: "resort", image: svetiStefan,
  },
];

/**
 * Real reviews go here (title, text, reviewer country, date, where it was posted).
 * While this list is empty the reviews section is hidden in production builds.
 */
export const REVIEWS: Review[] = [];

/** Placeholder copy so the carousel can be designed locally. Never shipped: see HomeSections. */
export const SAMPLE_REVIEWS: Review[] = [
  { title: "Sample: planned our coast trip in one evening", text: "Replace with a real review. Keep it short: what they planned, what helped, what they'd tell a friend.", country: "de", date: "2026-08-01", source: "Google" },
  { title: "Sample: the map made the route obvious", text: "Replace with a real review. A quote from a WhatsApp message or a Google review works well here.", country: "ch", date: "2026-07-01", source: "Google" },
  { title: "Sample: easy for the whole family", text: "Replace with a real review. Ask permission before you publish someone's words.", country: "xk", date: "2026-07-01", source: "Instagram" },
  { title: "Sample: budget estimate was close", text: "Replace with a real review. Specific details read as more trustworthy than praise.", country: "at", date: "2026-06-01", source: "Google" },
  { title: "Sample: found places we'd never heard of", text: "Replace with a real review. Two or three sentences is the right length.", country: "gb", date: "2026-06-01", source: "Trustpilot" },
];
