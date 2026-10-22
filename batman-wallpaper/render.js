// Usage: node render.js  -> writes PNGs next to this file
const path = require('path');
const { chromium } = require(process.env.PW || 'playwright');

(async () => {
  const browser = await chromium.launch();
  const url = 'file://' + path.join(__dirname, 'wallpaper.html');
  for (const [w, scale] of [[3840, 1], [5120, 4 / 3]]) {
    const page = await browser.newPage({ viewport: { width: 3840, height: 1080 }, deviceScaleFactor: scale });
    await page.goto(url);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(__dirname, `batman-ultrawide-${w}x${Math.round(w * 9 / 32)}.png`), clip: { x: 0, y: 0, width: 3840, height: 1080 } });
    await page.close();
  }
  await browser.close();
})();
