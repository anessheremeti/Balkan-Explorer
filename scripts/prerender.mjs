// Post-build step: snapshot public routes to static HTML and emit sitemap.xml + robots.txt.
//
// The app is a client-rendered SPA, so without this every URL ships an empty
// <div id="root"> and a single generic <title>. Here we load each public route in
// headless Chromium, wait for React to render, and write the result to
// dist/<route>.html (served by Netlify at /<route> with no redirect). The
// client still calls createRoot() and re-renders on load — the snapshot only
// gives crawlers, link previews and first paint real content.
//
// Env:
//   VITE_SITE_URL / URL  production origin (Netlify sets URL automatically)
//   SKIP_PRERENDER=1     only write app-shell.html, sitemap.xml and robots.txt
import { readFile, writeFile, mkdir, copyFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const seo = JSON.parse(await readFile(join(root, "src/seo/routes.json"), "utf8"));
const siteUrl = (process.env.VITE_SITE_URL || process.env.URL || "").replace(/\/$/, "");

const indexablePaths = [
  ...Object.keys(seo.indexable),
  ...seo.destinationIds.map((id) => `/destination/${id}`),
];

const exists = (p) => access(p).then(() => true, () => false);

// ── Guard: every route must have a Netlify rewrite, or it would get the 404 catch-all ──
{
  const toml = await readFile(join(root, "netlify.toml"), "utf8");
  const froms = new Set([...toml.matchAll(/from\s*=\s*"([^"]+)"/g)].map((m) => m[1]));
  const missing = [...Object.keys(seo.indexable), ...Object.keys(seo.noindex)]
    .filter((p) => p !== "/" && !froms.has(p));
  if (!froms.has("/destination/*")) missing.push("/destination/*");
  if (missing.length) {
    throw new Error(`netlify.toml has no SPA rewrite for: ${missing.join(", ")} (see the routes block there)`);
  }
}

// ── Pristine SPA shell, served for every non-prerendered route ──
const shellPath = join(dist, "app-shell.html");
if (!(await exists(shellPath))) await copyFile(join(dist, "index.html"), shellPath);
const shell = await readFile(shellPath, "utf8");

// ── robots.txt + sitemap.xml ──
{
  const lines = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /ingest/",
  ];
  if (siteUrl) {
    const today = new Date().toISOString().slice(0, 10);
    const entries = indexablePaths.map((p) => {
      const priority = seo.indexable[p]?.priority ?? 0.8;
      return `  <url>\n    <loc>${siteUrl}${p === "/" ? "/" : p}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${priority.toFixed(1)}</priority>\n  </url>`;
    });
    await writeFile(
      join(dist, "sitemap.xml"),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`,
    );
    lines.push("", `Sitemap: ${siteUrl}/sitemap.xml`);
  } else {
    console.warn("[prerender] No VITE_SITE_URL/URL set — skipping sitemap.xml and absolute canonical URLs.");
  }
  await writeFile(join(dist, "robots.txt"), lines.join("\n") + "\n");
}

if (process.env.SKIP_PRERENDER === "1") {
  console.log("[prerender] SKIP_PRERENDER=1 — wrote shell, robots.txt and sitemap only.");
  process.exit(0);
}

// ── Snapshot each route ──
const { preview } = await import("vite");
const { chromium } = await import("playwright");

const server = await preview({ root, logLevel: "warn", preview: { port: 4317, strictPort: false, open: false } });
const origin = server.resolvedUrls.local[0].replace(/\/$/, "");
const browser = await chromium.launch();
const results = [];

try {
  const context = await browser.newContext({ locale: "en-US", viewport: { width: 1280, height: 900 } });
  // Snapshot what a first-time English visitor sees, minus the splash intro and cookie banner
  await context.addInitScript(() => {
    localStorage.setItem("i18nextLng", "en");
    localStorage.setItem("cookie_consent", "rejected");
    sessionStorage.setItem("intro_shown", "1");
  });
  // Images/fonts don't affect the HTML — skip them to keep the build fast
  await context.route("**/*", (route) =>
    ["image", "media", "font"].includes(route.request().resourceType()) ? route.abort() : route.continue(),
  );

  for (const path of indexablePaths) {
    const page = await context.newPage();
    await page.goto(origin + path, { waitUntil: "networkidle", timeout: 30_000 }).catch(() => {});
    await page.waitForSelector('link[rel="canonical"][data-seo]', { state: "attached", timeout: 15_000 });

    // Trigger whileInView animations so below-the-fold content isn't left at opacity 0
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);

    const snap = await page.evaluate(() => ({
      title: document.querySelector("title")?.outerHTML ?? "",
      head: [...document.head.querySelectorAll("[data-seo]")].map((el) => el.outerHTML),
      body: document.getElementById("root")?.innerHTML ?? "",
      h1: document.querySelectorAll("#root h1").length,
    }));
    await page.close();

    if (!snap.body.trim() || !snap.title) throw new Error(`${path}: rendered empty page`);
    if (snap.h1 !== 1) console.warn(`[prerender] ${path}: expected 1 <h1>, found ${snap.h1}`);

    if (!shell.includes('<div id="root"></div>')) throw new Error('app-shell.html has no empty <div id="root"></div>');
    // Function replacers: rendered text may contain "$&"-style sequences
    const html = shell
      .replace(/<title>[\s\S]*?<\/title>/, () => snap.title)
      .replace(/\s*<meta name="description"[^>]*>/, "")
      .replace("</head>", () => `  ${snap.head.join("\n    ")}\n  </head>`)
      .replace('<div id="root"></div>', () => `<div id="root">${snap.body}</div>`);

    results.push({ path, html });
  }
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}

// Written only after every route succeeded, so a failure never leaves dist half-updated
for (const { path, html } of results) {
  const file = path === "/" ? join(dist, "index.html") : join(dist, `${path.slice(1)}.html`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
}
console.log(`[prerender] Wrote ${results.length} pages${siteUrl ? ` for ${siteUrl}` : ""}.`);
