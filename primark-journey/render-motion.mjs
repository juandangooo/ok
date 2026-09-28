// Export motion.html to an H.264 MP4.
//   node render-motion.mjs [out.mp4] [--fps 30] [--supersample 2] [--from 0 --to 30] [--stills 1.5,9,29]
// Needs Playwright (Chromium) and ffmpeg (on PATH, or FFMPEG=/path/to/ffmpeg).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({chromium} = require('playwright')); } catch { ({chromium} = require(path.join(process.execPath, '../../lib/node_modules/playwright'))); }

const dir = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const out = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : path.join(dir, 'primark-journey-30s.mp4'));
const fps = +opt('fps', 30), ss = +opt('supersample', 2), from = +opt('from', 0), to = +opt('to', 30), stills = opt('stills');

const types = {'.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2'};
const server = http.createServer((req, res) => {
  const file = path.join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(dir) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, {'content-type': types[path.extname(file)] || 'application/octet-stream'}).end(fs.readFileSync(file));
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 800, height: 900}});
page.on('pageerror', e => { console.error(e); process.exit(1); });
await page.goto(`http://127.0.0.1:${port}/motion.html?scale=${ss}`);
await page.waitForFunction('window.ready === true');
// Downsample the supersampled canvas so fine hatching does not shimmer in motion.
const grab = t => page.evaluate(t => {
  frameAt(t);
  const src = document.getElementById('stage'), o = window._out || (window._out = document.createElement('canvas'));
  o.width = 1080; o.height = 1350; const c = o.getContext('2d'); c.imageSmoothingQuality = 'high'; c.drawImage(src, 0, 0, 1080, 1350);
  return o.toDataURL('image/png').split(',')[1];
}, t);

if (stills) {
  for (const s of stills.split(',')) { const f = path.join(path.dirname(out), `still-${(+s).toFixed(2)}s.png`); fs.writeFileSync(f, Buffer.from(await grab(+s), 'base64')); console.log(f); }
} else {
  const ffmpeg = spawn(process.env.FFMPEG || 'ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], {stdio: ['pipe', 'inherit', 'inherit']});
  const total = Math.round((to - from) * fps);
  for (let i = 0; i < total; i++) {
    const png = Buffer.from(await grab(from + i / fps), 'base64');
    if (!ffmpeg.stdin.write(png)) await new Promise(r => ffmpeg.stdin.once('drain', r));
    if (i % fps === 0) process.stdout.write(`\r${(i / fps).toFixed(0)}s / ${(total / fps).toFixed(0)}s`);
  }
  ffmpeg.stdin.end(); await new Promise(r => ffmpeg.on('close', r));
  console.log(`\n${out}`);
}
await browser.close(); server.close();
