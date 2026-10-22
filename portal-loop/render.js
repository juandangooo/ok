// node render.js <outDir> <fps> [t1,t2,...]  -> PNG frames of portal.html
const path = require('path');
const { chromium } = require(process.env.PW || 'playwright');
const [outDir, fps = '60', only] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 3840, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'portal.html'));
  await page.evaluate(() => window.ready);
  const times = only ? only.split(',').map(Number) : [...Array(10 * +fps).keys()].map(i => i / +fps);
  for (let i = 0; i < times.length; i++) {
    await page.evaluate(t => window.draw(t), times[i]);
    await page.screenshot({ path: path.join(outDir, `f${String(i).padStart(5, '0')}.png`) });
  }
  await browser.close();
})();
