#!/usr/bin/env node
// Accessibility check: runs axe-core on every page in the sitemap of a served
// build, in the light scheme at 1280 and 375 pixels and in the dark scheme at
// 1280, and fails on any WCAG 2.2 A or AA violation or axe best practice.
//
// Usage: node scripts/a11y-check.cjs <base URL>
// Needs playwright-core and axe-core installed, and Chrome at CHROME_PATH
// (default /usr/bin/google-chrome). Requests outside the base URL are blocked,
// so third party scripts never run during the check.
const { chromium } = require('playwright-core');
const fs = require('fs');

const base = process.argv[2].replace(/\/$/, '');
const axe = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const runs = [
  { scheme: 'light', width: 1280 },
  { scheme: 'light', width: 375 },
  { scheme: 'dark', width: 1280 },
];
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

(async () => {
  const sitemap = await (await fetch(base + '/sitemap.xml')).text();
  const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome' });
  let failures = 0;
  for (const run of runs) {
    const context = await browser.newContext({ viewport: { width: run.width, height: 900 }, colorScheme: run.scheme });
    await context.route('**/*', (route) => (route.request().url().startsWith(base) ? route.continue() : route.abort()));
    for (const path of paths) {
      const page = await context.newPage();
      await page.goto(base + path, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.addScriptTag({ content: axe });
      const result = await page.evaluate((t) => axe.run(document, { runOnly: t }), tags);
      for (const v of result.violations) {
        failures++;
        console.log(`${run.scheme} ${run.width} ${path}: ${v.id} (${v.impact}) ${v.help}`);
        for (const n of v.nodes.slice(0, 3)) console.log(`    ${n.target.join(' ')}`);
      }
      await page.close();
    }
    await context.close();
  }
  await browser.close();
  console.log(`a11y check: ${paths.length} pages, ${runs.length} runs each, ${failures} violations`);
  process.exit(failures ? 1 : 0);
})();
