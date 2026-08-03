const { chromium } = require('playwright');
const fs = require('fs');
const axeSource = fs.readFileSync(require.resolve('axe-core'), 'utf8');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript(() => sessionStorage.setItem('intro_shown', '1'));
  await page.goto('http://localhost:5173/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500); // banner has a 900ms entrance delay
  await page.screenshot({ path: '_cookie_banner.png' });

  await page.addScriptTag({ content: axeSource });
  const results = await page.evaluate(async () => {
    return await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] } });
  });
  console.log('Violations:', results.violations.length);
  for (const v of results.violations) console.log(`- [${v.impact}] ${v.id}: ${v.nodes.length} node(s)`, JSON.stringify(v.nodes.map(n=>n.html.slice(0,100))));

  await browser.close();
})();
