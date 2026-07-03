import jsPDF from 'jspdf';
import type { Trip, ItineraryDay } from '../hooks/itineraryService';

// ─── Text sanitiser ───────────────────────────────────────────────────────────
// jsPDF Helvetica supports only Latin-1 (Windows-1252).
// Characters outside that range show as garbled bytes — we transliterate them.
const CHAR_MAP: Record<string, string> = {
  // ── Cyrillic (Macedonian / Serbian / Bulgarian) ──
  А:'A', Б:'B', В:'V', Г:'G', Д:'D', Ѓ:'Gj', Е:'E', Ж:'Zh', З:'Z',
  Ѕ:'Dz',И:'I', Ј:'J', К:'K', Л:'L', Љ:'Lj',М:'M', Н:'N', Њ:'Nj',
  О:'O', П:'P', Р:'R', С:'S', Т:'T', Ќ:'Kj',У:'U', Ф:'F', Х:'H',
  Ц:'Ts',Ч:'Ch',Џ:'Dz',Ш:'Sh',
  а:'a', б:'b', в:'v', г:'g', д:'d', ѓ:'gj',е:'e', ж:'zh',з:'z',
  ѕ:'dz',и:'i', ј:'j', к:'k', л:'l', љ:'lj',м:'m', н:'n', њ:'nj',
  о:'o', п:'p', р:'r', с:'s', т:'t', ќ:'kj',у:'u', ф:'f', х:'h',
  ц:'ts',ч:'ch',џ:'dz',ш:'sh',
  Ћ:'C', ћ:'c', Ђ:'Dj',ђ:'dj',Й:'J', й:'j',
  Ъ:'A', ъ:'a', Ю:'Yu',ю:'yu',Я:'Ya',я:'ya',Ь:'',  ь:'',
  // ── Latin Extended (Czech/Slovak/Croatian etc.) ──
  š:'s', Š:'S', ž:'z', Ž:'Z', č:'c', Č:'C',
  ď:'d', Ď:'D', ň:'n', Ň:'N', ř:'r', Ř:'R', ť:'t', Ť:'T',
  ő:'o', Ő:'O', ű:'u', Ű:'U',
  // ── Unicode punctuation & symbols ──
  '→':'->',   // → (right arrow — used in trip titles e.g. Peje -> Ohrid)
  '←':'<-',   // ←
  '–':'-',    // – (en dash)
  '—':'-',    // — (em dash)
  '…':'...',  // … (ellipsis)
  '‘':"'",    // ' (left single quote)
  '’':"'",    // ' (right single quote)
  '“':'"',    // " (left double quote)
  '”':'"',    // " (right double quote)
  '•':'-',    // • (bullet)
  '·':'-',    // · (middle dot)
  '×':'x',    // × (multiply sign)
};

/** Sanitise a string so it renders correctly in jsPDF's Latin-1 Helvetica. */
function s(text?: string | null): string {
  if (!text) return '';
  return text.split('').map(c => CHAR_MAP[c] ?? c).join('');
}

// ─── Brand palette (A4, mm) ───────────────────────────────────────────────────
const C = {
  navy:          [15,  23,  42]  as [number,number,number],
  sky:           [14,  165, 233] as [number,number,number],
  skyLight:      [224, 242, 254] as [number,number,number],
  slate700:      [51,  65,  85]  as [number,number,number],
  slate600:      [71,  85,  105] as [number,number,number],
  slate500:      [100, 116, 139] as [number,number,number],
  slate400:      [148, 163, 184] as [number,number,number],
  slate200:      [226, 232, 240] as [number,number,number],
  slate100:      [241, 245, 249] as [number,number,number],
  slate50:       [248, 250, 252] as [number,number,number],
  white:         [255, 255, 255] as [number,number,number],
  food:          [234, 88,  12]  as [number,number,number],
  foodLight:     [255, 237, 213] as [number,number,number],
  activity:      [5,   150, 105] as [number,number,number],
  activityLight: [209, 250, 229] as [number,number,number],
  transport:     [79,  70,  229] as [number,number,number],
  transportLight:[224, 231, 255] as [number,number,number],
  stay:          [217, 119, 6]   as [number,number,number],
  stayLight:     [254, 243, 199] as [number,number,number],
  orange:        [234, 88,  12]  as [number,number,number],
  emerald:       [5,   150, 105] as [number,number,number],
  amber:         [245, 158, 11]  as [number,number,number],
  violet:        [124, 58,  237] as [number,number,number],
};

type RGB = [number, number, number];

const PW = 210, PH = 297;
const ML = 15, MR = 15, CW = PW - ML - MR;
const HEADER_H = 22;
const CONTENT_Y = HEADER_H + 8;
const SAFE_BOTTOM = PH - 22;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fill = (p: jsPDF, c: RGB) => p.setFillColor(c[0], c[1], c[2]);
const draw = (p: jsPDF, c: RGB) => p.setDrawColor(c[0], c[1], c[2]);
const txt  = (p: jsPDF, c: RGB) => p.setTextColor(c[0], c[1], c[2]);

function formatTime(t?: string): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  if (hour === 0)  return `12:${m} AM`;
  if (hour < 12)  return `${h}:${m} AM`;
  if (hour === 12) return `12:${m} PM`;
  return `${String(hour - 12).padStart(2, '0')}:${m} PM`;
}

function typeConfig(type: string): { color: RGB; light: RGB; label: string } {
  switch ((type ?? '').toLowerCase()) {
    case 'food':      return { color: C.food,      light: C.foodLight,      label: 'FOOD'      };
    case 'transport': return { color: C.transport, light: C.transportLight, label: 'TRANSPORT' };
    case 'stay':      return { color: C.stay,      light: C.stayLight,      label: 'STAY'      };
    default:          return { color: C.activity,  light: C.activityLight,  label: 'ACTIVITY'  };
  }
}

// ─── Page chrome ─────────────────────────────────────────────────────────────
function drawPageHeader(p: jsPDF) {
  fill(p, C.navy); p.rect(0, 0, PW, HEADER_H, 'F');
  fill(p, C.sky);  p.rect(0, HEADER_H - 1.5, PW, 1.5, 'F');

  p.setFont('helvetica', 'bold'); p.setFontSize(13); txt(p, C.white);
  p.text('BALKAN', ML, 14);
  txt(p, C.sky); p.text('EXPLORER', ML + 22, 14);

  p.setFont('helvetica', 'normal'); p.setFontSize(6.5); txt(p, C.slate400);
  p.text('TRAVEL ITINERARY', ML, 19.5);

  fill(p, C.sky); p.rect(PW - 6, 0, 6, HEADER_H, 'F');
}

function drawPageFooter(p: jsPDF, pageNum: number, totalPages: number, date: string) {
  const fy = PH - 14;
  draw(p, C.slate200); p.setLineWidth(0.3); p.line(ML, fy, PW - MR, fy);
  p.setFont('helvetica', 'normal'); p.setFontSize(6.5); txt(p, C.slate400);
  p.text('BalkanExplorer  ·  balkan-explorer.netlify.app', ML, fy + 5);
  const pageStr = `Page ${pageNum} of ${totalPages}`;
  const genStr  = `Generated ${date}`;
  p.text(pageStr, PW / 2 - p.getTextWidth(pageStr) / 2, fy + 5);
  p.text(genStr,  PW - MR - p.getTextWidth(genStr), fy + 5);
}

// ─── Real flag images via flagcdn.com ────────────────────────────────────────
// Maps location keywords → ISO 3166-1 alpha-2 country codes used by flagcdn.com
const COUNTRY_CODE_MAP: Array<{ keys: string[]; code: string }> = [
  { keys: ['kosovo'],                   code: 'xk' },
  { keys: ['albania'],                  code: 'al' },
  { keys: ['montenegro'],               code: 'me' },
  { keys: ['north mac', 'macedonia'],   code: 'mk' },
  { keys: ['serbia'],                   code: 'rs' },
  { keys: ['bosnia'],                   code: 'ba' },
  { keys: ['croatia'],                  code: 'hr' },
  { keys: ['greece'],                   code: 'gr' },
  { keys: ['bulgaria'],                 code: 'bg' },
  { keys: ['romania'],                  code: 'ro' },
  { keys: ['slovenia'],                 code: 'si' },
  { keys: ['austria'],                  code: 'at' },
  { keys: ['hungary'],                  code: 'hu' },
  { keys: ['germany'],                  code: 'de' },
];

function getCountryCode(text: string): string | null {
  const l = (text ?? '').toLowerCase();
  for (const entry of COUNTRY_CODE_MAP) {
    if (entry.keys.some(k => l.includes(k))) return entry.code;
  }
  return null;
}

/** Fetch a flag PNG from flagcdn.com and return it as a base64 data URL.
 *  Returns null on network error so generation continues without the flag. */
async function fetchFlagDataUrl(countryCode: string): Promise<string | null> {
  try {
    const r = await fetch(`https://flagcdn.com/w40/${countryCode}.png`);
    if (!r.ok) return null;
    const ab   = await r.arrayBuffer();
    const bytes = new Uint8Array(ab);
    let bin = '';
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    return `data:image/png;base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

function getCurrencySymbol(currency?: string | null): string {
  switch ((currency ?? 'USD').toUpperCase()) {
    case 'GBP': return '\xa3';   // £ — safe in Latin-1 (U+00A3)
    case 'EUR': return 'EUR';    // € is unreliable in PDF Latin-1; use text
    case 'CHF': return 'CHF';
    default:    return '$';      // USD and all others
  }
}

// ─── Info pill with icon ──────────────────────────────────────────────────────
interface PillOptions {
  /** Base64 data URL of a flag PNG to render after the value text. */
  flagDataUrl?: string | null;
  /** Prefix prepended to the value display (e.g. currency symbol). */
  valuePrefix?: string;
}

function drawInfoPill(
  p: jsPDF,
  x: number, y: number, w: number, h: number,
  label: string, value: string,
  accentColor: RGB, iconChar: string,
  opts: PillOptions = {},
) {
  // Background
  fill(p, C.slate50);
  p.roundedRect(x, y, w, h, 2, 2, 'F');

  // Left accent bar
  fill(p, accentColor);
  p.roundedRect(x, y, 3.5, h, 1.5, 1.5, 'F');
  p.rect(x + 2, y, 1.5, h, 'F');

  // Icon circle
  const cx = x + 11, cy = y + h / 2;
  fill(p, accentColor);
  p.circle(cx, cy, 3.5, 'F');
  p.setFont('helvetica', 'bold'); p.setFontSize(6.5); txt(p, C.white);
  const iw = p.getTextWidth(iconChar);
  p.text(iconChar, cx - iw / 2, cy + 0.7);

  // Label
  p.setFont('helvetica', 'normal'); p.setFontSize(6); txt(p, C.slate500);
  p.text(s(label).toUpperCase(), x + 17, y + 4.5);

  // Value
  p.setFont('helvetica', 'bold'); p.setFontSize(8.5); txt(p, C.slate700);
  const displayValue = opts.valuePrefix ? `${opts.valuePrefix} ${s(value)}` : s(value);
  const maxW = opts.flagDataUrl ? w - 32 : w - 18;
  const val = p.splitTextToSize(displayValue, maxW)[0] ?? '';
  p.text(val, x + 17, y + 10.5);

  // Real flag image (10 × 6.7 mm — standard 3:2 ratio)
  if (opts.flagDataUrl) {
    const valW = p.getTextWidth(val);
    const flagX = x + 17 + valW + 2;
    const flagY = y + h / 2 - 3.35;
    try {
      p.addImage(opts.flagDataUrl, 'PNG', flagX, flagY, 10, 6.7);
    } catch { /* skip silently if image fails */ }
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────
export async function generateItineraryPDF(trip: Trip, days: ItineraryDay[]) {
  // Pre-fetch real flag images in parallel before drawing
  const fromCode = getCountryCode(trip.starting_location ?? '');
  const destCode = getCountryCode(trip.destination ?? '');
  const [fromFlagUrl, destFlagUrl] = await Promise.all([
    fromCode ? fetchFlagDataUrl(fromCode) : Promise.resolve(null),
    destCode ? fetchFlagDataUrl(destCode) : Promise.resolve(null),
  ]);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = CONTENT_Y;
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  drawPageHeader(pdf);

  // ── Destination chip ──────────────────────────────────────────────────────
  y += 2;
  const destLabel = s(trip.destination?.toUpperCase() ?? 'N/A');
  const chipW = Math.min(pdf.getTextWidth(`DESTINATION:  ${destLabel}`) + 8, CW);
  fill(pdf, C.skyLight);
  pdf.roundedRect(ML, y, chipW, 6.5, 1.5, 1.5, 'F');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); txt(pdf, C.sky);
  pdf.text(`DESTINATION:  ${destLabel}`, ML + 3, y + 4.3);
  y += 10;

  // ── Trip title (14pt, wraps up to 2 lines) ────────────────────────────────
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); txt(pdf, C.navy);
  const titleText = s(trip.title || `Trip to ${trip.destination}`);
  const titleLines = pdf.splitTextToSize(titleText, CW).slice(0, 2);
  pdf.text(titleLines, ML, y);
  y += titleLines.length * 6 + 3;

  // ── Divider ───────────────────────────────────────────────────────────────
  fill(pdf, C.slate200); pdf.rect(ML, y, CW, 0.4, 'F');
  y += 5;

  // ── Info pills (2 rows × 3) ───────────────────────────────────────────────
  const PILL_W = (CW - 5) / 3;
  const PILL_H = 14;

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

  const currSym   = getCurrencySymbol(trip.currency);
  const styleIcon = (() => {
    switch ((trip.travel_style ?? '').toLowerCase()) {
      case 'bus': return 'B'; case 'car': return 'C'; case 'road': return 'R';
      case 'walk': return 'W'; case 'fly': case 'flight': return 'F';
      default: return 'S';
    }
  })();

  const pills = [
    { label: 'From',      value: trip.starting_location || 'N/A',
      color: C.sky,       icon: 'f',
      opts: { flagDataUrl: fromFlagUrl } },

    { label: 'Departure', value: formatDate(trip.starting_date),
      color: C.orange,    icon: '>',
      opts: {} },

    { label: 'Return',    value: formatDate(trip.returning_date),
      color: C.emerald,   icon: '<',
      opts: { flagDataUrl: destFlagUrl } },

    { label: 'Travelers', value: `${trip.travelers ?? 1} person${(trip.travelers ?? 1) !== 1 ? 's' : ''}`,
      color: C.violet,    icon: '2',
      opts: {} },

    { label: 'Budget',    value: trip.budget_total ? trip.budget_total.toLocaleString() : 'N/A',
      color: C.amber,     icon: currSym === '$' ? '$' : currSym === '\xa3' ? '\xa3' : 'E',
      opts: { valuePrefix: currSym } },

    { label: 'Style',     value: trip.travel_style ? trip.travel_style[0].toUpperCase() + trip.travel_style.slice(1) : 'N/A',
      color: C.transport, icon: styleIcon,
      opts: {} },
  ];

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const pill = pills[row * 3 + col];
      drawInfoPill(
        pdf,
        ML + col * (PILL_W + 2.5), y,
        PILL_W, PILL_H,
        pill.label, pill.value,
        pill.color, pill.icon,
        pill.opts,
      );
    }
    y += PILL_H + 3;
  }
  y += 5;

  // ── "Daily Itinerary" section title ───────────────────────────────────────
  fill(pdf, C.sky); pdf.rect(ML, y, 3, 10, 'F');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); txt(pdf, C.navy);
  pdf.text('Daily Itinerary', ML + 6, y + 7.2);

  const totalItems = days.reduce((acc, d) => acc + (d.itinerary_items?.length ?? 0), 0);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); txt(pdf, C.slate500);
  pdf.text(
    `${days.length} day${days.length !== 1 ? 's' : ''}  ·  ${totalItems} activities`,
    ML + 52, y + 7.2,
  );
  y += 16;

  // ── Pagination helper ─────────────────────────────────────────────────────
  function ensureSpace(needed: number) {
    if (y + needed > SAFE_BOTTOM) {
      pdf.addPage();
      drawPageHeader(pdf);
      y = CONTENT_Y;
    }
  }

  // ── Day blocks ────────────────────────────────────────────────────────────
  for (const day of days) {
    ensureSpace(20);

    // Day banner
    fill(pdf, C.navy);
    pdf.roundedRect(ML, y, CW, 11, 2, 2, 'F');

    // DAY N badge
    fill(pdf, C.sky);
    pdf.roundedRect(ML + 1.5, y + 1.5, 19, 8, 1.5, 1.5, 'F');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); txt(pdf, C.white);
    const dayLabel = `DAY ${day.day_number}`;
    pdf.text(dayLabel, ML + 1.5 + (19 - pdf.getTextWidth(dayLabel)) / 2, y + 7);

    // Date string
    const dateStr = day.date
      ? new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : '';
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); txt(pdf, C.slate400);
    pdf.text(dateStr, ML + 23.5, y + 7);

    // Theme title right-aligned
    if (day.title) {
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); txt(pdf, C.white);
      const theme = pdf.splitTextToSize(s(day.title), CW - 80)[0] ?? '';
      pdf.text(theme, PW - MR - pdf.getTextWidth(theme) - 2, y + 7);
    }

    y += 13.5;

    // ── Activity rows ─────────────────────────────────────────────────────
    const items = day.itinerary_items ?? [];

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const { color, light, label: typeLabel } = typeConfig(item.item_type);

      const rawDesc = s(item.description ?? '');
      const descLines = rawDesc ? pdf.splitTextToSize(rawDesc, CW - 54).slice(0, 2) : [];
      const rowH = descLines.length > 0 ? 17 + descLines.length * 4 : 14;

      ensureSpace(rowH + 3);

      // Row background
      fill(pdf, idx % 2 === 0 ? C.slate50 : C.white);
      pdf.roundedRect(ML, y, CW, rowH, 1.5, 1.5, 'F');

      // Left accent bar (colored per type)
      fill(pdf, color);
      pdf.roundedRect(ML, y, 3, rowH, 1.5, 1.5, 'F');
      pdf.rect(ML + 1.5, y, 1.5, rowH, 'F');

      // Time badge
      fill(pdf, color);
      pdf.roundedRect(ML + 5, y + (rowH - 6.5) / 2, 25, 6.5, 1.5, 1.5, 'F');
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); txt(pdf, C.white);
      const timeStr = formatTime(item.start_time);
      pdf.text(timeStr, ML + 5 + (25 - pdf.getTextWidth(timeStr)) / 2, y + (rowH - 6.5) / 2 + 4.5);

      const textX = ML + 33;

      // Type chip
      fill(pdf, light);
      const chipW = pdf.getTextWidth(typeLabel) + 6;
      pdf.roundedRect(textX, y + 2.5, chipW, 5.5, 1, 1, 'F');
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(5.5); txt(pdf, color);
      pdf.text(typeLabel, textX + 3, y + 6.5);

      // Title
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); txt(pdf, C.navy);
      const titleItem = pdf.splitTextToSize(s(item.title ?? ''), CW - 36)[0] ?? '';
      pdf.text(titleItem, textX, y + 12.5);

      // Description
      if (descLines.length > 0) {
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); txt(pdf, C.slate500);
        descLines.forEach((line: string, li: number) => {
          pdf.text(line, textX, y + 17 + li * 4.5);
        });
      }

      y += rowH + 2.5;
    }

    y += 8;
  }

  // ── Back-fill footers ─────────────────────────────────────────────────────
  const totalPages = pdf.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    pdf.setPage(pg);
    drawPageFooter(pdf, pg, totalPages, today);
  }

  const dest = s(trip.destination ?? 'trip').toLowerCase().replace(/\s+/g, '-');
  pdf.save(`balkan-explorer-${dest}-itinerary.pdf`);
}
