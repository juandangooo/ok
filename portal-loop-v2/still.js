const path = require('path');
const { chromium } = require(process.env.PW || 'playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 3840, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'still.html'));
  await page.waitForFunction(() => window.done, null, { timeout: 60000 });
  await page.screenshot({ path: process.argv[2] });
  await browser.close();
})();
