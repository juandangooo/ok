// usage: node render.mjs <outDir> [--fps 30] [--workers 4] [--times 1,5.5,9]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { pathToFileURL } from 'url';
import path from 'path';

const args = process.argv.slice(2);
const outDir = path.resolve(args[0] || 'frames');
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const fps = +opt('--fps', 30), workers = +opt('--workers', 4);
const times = opt('--times', null);
mkdirSync(outDir, { recursive: true });

const url = pathToFileURL(path.join(path.dirname(new URL(import.meta.url).pathname), 'index.html')).href;
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-web-security'] });

async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(url);
  await page.evaluate(() => window.ready);
  return page;
}

if (times) {
  const page = await openPage();
  for (const t of times.split(',').map(Number)) {
    await page.evaluate(t => window.renderFrame(t), t);
    await page.screenshot({ path: path.join(outDir, `t_${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 85 });
  }
} else {
  const probe = await openPage();
  const total = Math.ceil(await probe.evaluate(() => window.DURATION) * fps);
  await probe.close();
  console.log('frames', total);
  const chunk = Math.ceil(total / workers);
  await Promise.all([...Array(workers)].map(async (_, w) => {
    const page = await openPage();
    for (let f = w * chunk; f < Math.min(total, (w + 1) * chunk); f++) {
      await page.evaluate(t => window.renderFrame(t), f / fps);
      await page.screenshot({ path: path.join(outDir, `${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 93 });
      if (f % 150 === 0) console.log('w' + w, f);
    }
  }));
}
await browser.close();
