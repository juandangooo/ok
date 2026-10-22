// node encode.js [fps] -> portal-loop-3840x1080.mp4 (frames piped straight into ffmpeg)
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require(process.env.PW || 'playwright');
const fps = +(process.argv[2] || 60), LOOP = 10;
const out = path.join(__dirname, 'portal-loop-3840x1080.mp4');
(async () => {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-vf', 'noise=alls=3:allf=t', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 3840, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'portal.html'));
  await page.evaluate(() => window.ready);
  for (let i = 0; i < fps * LOOP; i++) {
    await page.evaluate(t => window.draw(t), i / fps);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  await browser.close();
  ff.stdin.end();
  ff.on('close', code => process.exit(code));
})();
