// Screenshot each mock in guide/mocks/ and record where its [data-id] elements sit,
// so the deck can circle them precisely.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "mocks");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
  const boxes = {};
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".html"))) {
    const name = file.replace(".html", "");
    await page.goto("file://" + path.join(dir, file));
    await page.screenshot({ path: path.join(dir, name + ".png") });
    boxes[name] = await page.$$eval("[data-id]", (els) =>
      Object.fromEntries(els.map((e) => {
        const r = e.getBoundingClientRect();
        return [e.dataset.id, [r.x, r.y, r.width, r.height]];
      })));
  }
  fs.writeFileSync(path.join(dir, "boxes.json"), JSON.stringify(boxes, null, 1));
  await browser.close();
})();
