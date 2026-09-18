#!/usr/bin/env node
// Screenshot a local HTML file or URL in this container's headless Chromium.
//
//   node tools/screenshot.mjs <file-or-url> <out.png> [--w 1280] [--h 900] [--dark|--light] [--wait 1200]
//
// Chromium ships at /opt/pw-browsers/chromium-*/chrome-linux/chrome and refuses to run as
// root without --no-sandbox, so CHROME should point at a wrapper that adds the flag:
//
//   printf '#!/bin/sh\nexec /opt/pw-browsers/chromium-1194/chrome-linux/chrome --no-sandbox --disable-dev-shm-usage "$@"\n' > /tmp/chrome-wrap
//   chmod +x /tmp/chrome-wrap && CHROME=/tmp/chrome-wrap node tools/screenshot.mjs page.html out.png
//
// puppeteer-core is not a dependency of this repo; run from a directory that has it
// installed (the film projects do) or set NODE_PATH to one.
import puppeteer from 'puppeteer-core';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const flag = (name, dflt) => { const i = argv.indexOf('--' + name); return i < 0 ? dflt : argv[i + 1]; };
const [target, out = 'shot.png'] = argv.filter(a => !a.startsWith('--') && argv[argv.indexOf(a) - 1]?.startsWith('--') !== true);
if (!target) { console.error('usage: screenshot.mjs <file-or-url> <out.png> [--w N] [--h N] [--dark] [--wait ms]'); process.exit(1); }

const url = /^https?:/.test(target) ? target
  : existsSync(target) ? pathToFileURL(target).href
  : (console.error('no such file: ' + target), process.exit(1));

const browser = await puppeteer.launch({ executablePath: process.env.CHROME, headless: true });
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERROR:', (e.stack || String(e)).split('\n').slice(0, 3).join('  ||  ')));
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 200)); });
if (argv.includes('--dark') || argv.includes('--light'))
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: argv.includes('--dark') ? 'dark' : 'light' }]);
await page.setViewport({ width: +flag('w', 1280), height: +flag('h', 900), deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, +flag('wait', 1200)));
await page.screenshot({ path: out });
console.log('wrote ' + out);
await browser.close();
