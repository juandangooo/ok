// node encode.js out.mp4 [fps]            -> seamless loop, frames piped into ffmpeg
// node encode.js --stills dir t1,t2,...   -> PNG stills for review
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require(process.env.PW || 'playwright');
const LOOP = 32;
(async () => {
  const args = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 3840, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'scene.html'));
  await page.evaluate(() => window.ready);
  if (args[0] === '--stills') {
    const times = args[2].split(',').map(Number);
    for (const t of times) {
      await page.evaluate(t => window.draw(t), t);
      await page.screenshot({ path: path.join(args[1], `t${String(t).padStart(5, '0')}.png`) });
    }
    return browser.close();
  }
  const out = args[0], fps = +(args[1] || 30);
  // grain is added here: temporal film grain also keeps the dark gradients from banding
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-vf', 'noise=c0s=9:c0f=t+u:c1s=2:c2s=2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '21',
    '-tune', 'grain', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < fps * LOOP; i++) {
    await page.evaluate(t => window.draw(t), i / fps);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  await browser.close();
  ff.stdin.end();
  ff.on('close', code => process.exit(code));
})();
