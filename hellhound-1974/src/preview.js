// Renders all five marks side by side, for checking the drawing before the book pages.
const { chromium } = require('playwright');
const marks = require('./marks');

(async () => {
  const cells = Object.entries(marks)
    .map(([k, f]) => `<figure><svg viewBox="0 0 200 200" width="300" height="300">${f()}</svg><figcaption>${k}</figcaption></figure>`)
    .join('');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1900, height: 400 } });
  await page.setContent(`<body style="margin:0;display:flex;gap:20px;padding:20px;background:#fff;font:14px sans-serif">${cells}</body>`);
  await page.screenshot({ path: process.argv[2] });
  await browser.close();
})();
