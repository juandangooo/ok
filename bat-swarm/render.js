// node render.js --stills dir t1,t2,...       review stills
// node render.js out.mp4 [from] [to]          frames from..to-1 at 60fps, piped into ffmpeg
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require(process.env.PW || 'playwright');
const FPS = 60, DUR = 15;
(async () => {
  const args = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 3840, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'swarm.html'));
  await page.evaluate(() => window.ready);
  if (args[0] === '--stills') {
    for (const t of args[2].split(',').map(Number)) {
      await page.evaluate(t => window.draw(t), t);
      await page.screenshot({ path: path.join(args[1], `t${t.toFixed(2).padStart(5, '0')}.png`) });
    }
    return browser.close();
  }
  const out = args[0], from = +(args[1] || 0), to = +(args[2] || FPS * DUR);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-vf', 'noise=c0s=9:c0f=t+u:c1s=2:c2s=2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
    '-tune', 'grain', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = from; i < to; i++) {
    await page.evaluate(t => window.draw(t), i / FPS);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  await browser.close();
  ff.stdin.end();
  ff.on('close', code => process.exit(code));
})();
