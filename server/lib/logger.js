// Structured JSON logger — drop-in replacement with zero dependencies.
// Set LOG_LEVEL=debug|info|warn|error in .env to control verbosity.
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN    = LEVELS[(process.env.LOG_LEVEL ?? 'info').toLowerCase()] ?? 1;

function write(level, msg, ctx = {}) {
  if (LEVELS[level] < MIN) return;
  const entry = { level: level.toUpperCase(), ts: new Date().toISOString(), msg, ...ctx };
  (level === 'error' || level === 'warn' ? console.error : console.log)(JSON.stringify(entry));
}

export const log = {
  debug: (msg, ctx) => write('debug', msg, ctx),
  info:  (msg, ctx) => write('info',  msg, ctx),
  warn:  (msg, ctx) => write('warn',  msg, ctx),
  error: (msg, ctx) => write('error', msg, ctx),
};
