import OpenAI from 'openai';
import { CircuitBreaker } from './circuit-breaker.js';
import { log } from './logger.js';

// Hand-picked free-model slugs go stale as OpenRouter's free lineup changes
// (this list itself broke — several entries were pulled from the free tier or
// renamed, e.g. "microsoft/phi-4:free" is paid-only now). `openrouter/free`
// is OpenRouter's own auto-router: it always resolves to a currently
// available free model server-side, so it can't go stale the way a
// hardcoded slug can. Trade-off: which underlying free model answers is out
// of our control, so latency varies call to call (seen 2s–38s in testing) —
// timeoutMs stays tight rather than growing to accommodate the slowest case,
// since deterministicThemes() below is a perfectly good fallback and AI
// theme flavor-text is not worth delaying the whole itinerary for.
const MODELS = [
  { id: 'openrouter/free', timeoutMs: 15_000 },
];

// Per-model circuit breakers: open after 2 failures, recheck after 5 minutes.
const breakers = Object.fromEntries(
  MODELS.map(m => [m.id, new CircuitBreaker(`ai:${m.id.split('/')[1]}`, { threshold: 2, timeout: 300_000 })])
);

const THEME_TEMPLATES = [
  d  => `Arrival & First Impressions of ${d}`,
  () => 'History, Culture & Hidden Gems',
  () => 'Markets, Food & Local Life',
  () => 'Nature, Parks & Open Spaces',
  () => 'Architecture & Sacred Places',
  () => 'Neighbourhood Deep Dive',
  () => 'Art, Craft & Creative Quarter',
  () => 'Waterfront & Scenic Views',
  () => 'Slow Morning, Big Afternoon',
  d  => `Final Discoveries in ${d}`,
  () => 'Off the Beaten Track',
  () => 'Sunrise to Sunset',
  () => 'The Local Perspective',
  () => 'Flavours & Landscapes',
];

export function deterministicThemes(destination, duration) {
  return Array.from({ length: duration }, (_, i) => THEME_TEMPLATES[i % THEME_TEMPLATES.length](destination));
}

function extractJSON(text) {
  if (!text) return null;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw   = fence ? fence[1] : text;
  const a = raw.indexOf('['), b = raw.lastIndexOf(']');
  return a !== -1 && b > a ? raw.slice(a, b + 1) : null;
}

let _openai;
function getClient() {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey:  process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }
  return _openai;
}

export async function generateAIThemes(destination, duration, travelStyle) {
  const style  = travelStyle || 'a balanced mix of culture, food, and nature';
  const prompt =
    `Create ${duration} unique, evocative day-theme titles for a trip to "${destination}". ` +
    `Travel style: ${style}.\n` +
    `Rules: 4–7 words each, inspiring, varied, in ENGLISH only, NO specific place names, NO day numbers.\n` +
    `Return ONLY a valid JSON array of exactly ${duration} strings. No other text.`;

  const client = getClient();

  for (const model of MODELS) {
    const breaker = breakers[model.id];
    if (!breaker.isAvailable) {
      log.debug('Skipping circuit-open AI model', { model: model.id });
      continue;
    }

    try {
      const themes = await breaker.execute(() =>
        Promise.race([
          (async () => {
            const completion = await client.chat.completions.create({
              model:       model.id,
              messages:    [
                { role: 'system', content: 'Return only valid JSON. No markdown, no explanations.' },
                { role: 'user',   content: prompt },
              ],
              temperature: 0.8,
              // openrouter/free can route to a reasoning model (e.g. an
              // Nvidia Nemotron variant) that spends its token budget
              // thinking out loud in `content` before the actual JSON — at
              // 400 tokens it was getting cut off (finish_reason: "length")
              // mid-thought, never reaching the answer. 1500 gives room for
              // that reasoning to finish before the real output.
              max_tokens:  1500,
            });
            const raw = extractJSON(completion.choices[0]?.message?.content ?? '');
            if (!raw) throw new Error('No JSON found in response');
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || parsed.length < duration) throw new Error('Array too short');
            return parsed.slice(0, duration);
          })(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), model.timeoutMs)),
        ])
      );

      log.info('AI themes generated', { model: model.id, destination, count: themes.length });
      return themes;
    } catch (err) {
      log.warn('AI model failed', { model: model.id, destination, error: err.message });
    }
  }

  log.warn('All AI models failed — using deterministic themes', { destination });
  return null;
}

export function aiModelHealth() {
  return MODELS.map(m => ({ model: m.id, ...breakers[m.id].toJSON() }));
}
