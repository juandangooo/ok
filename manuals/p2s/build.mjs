// Builds manual.html (10 letter-landscape pages); print.sh turns it into the PDF.
import { readFileSync, writeFileSync } from "node:fs";
import * as F from "./figs.mjs";
import { tick, cross } from "./lib.mjs";

const CSS = readFileSync(new URL("./manual.css", import.meta.url), "utf8");
const KIT_CSS = readFileSync(new URL("../../.claude/skills/anatomy/kit/iso.css", import.meta.url), "utf8");
const N = 10;
const NAV = ["01 Parts", "02 Reset", "03 Wash", "04 Dust", "05 Filament", "06 Lube", "07 Head", "08 Check", "09 Plan", "10 Log"];

const num = (n, letter) => `<span class="num${letter ? " letter" : ""}">${n}</span>`;
const parts = (list) => `<ul class="parts">${list.map(([n, name, text, letter]) => `<li>${num(n, letter)}<b>${name}</b><span>${text}</span></li>`).join("")}</ul>`;
const card = (n, title, svg, text, { mark = "", letter = false } = {}) => `<div class="card"><h3>${n !== null ? num(n, letter) : ""}${title}${mark}</h3>${svg}<p>${text}</p></div>`;

function page(i, { tag, title, lede, body, note, source, nav = false }) {
  return `<section class="page">
  <div class="head"><img src="logo.png" alt="Hellhound Audio"><div class="tag"><b>P2S / VISUAL CARE MANUAL</b>${tag}</div></div>
  <h1>${title}</h1><p class="lede">${lede}</p>
  <div class="content">${body}</div>
  ${nav ? `<div class="nav">${NAV.map((n) => `<span>${n.replace(/^(\d+)/, "<b>$1</b>")}</span>`).join("")}</div>` : ""}
  <div class="note">${note}</div>
  <div class="foot"><span>${source}<br>HELLHOUND AUDIO / FIELD EDITION 03</span><span class="pg">${String(i).padStart(2, "0")} / ${N}</span></div>
</section>`;
}

const pages = [
  page(1, {
    tag: "START HERE / FRONT VIEW",
    title: "Find the part. Then act.",
    lede: "Match each numbered marker on the drawing to its name. Every later page uses these names.",
    nav: true,
    body: `<div class="row"><div class="fig fig-big">${F.frontView()}<div class="cap">Front + right side<span>Door glass and top glass drawn see-through to show the chamber.</span></div></div>
    ${parts([
      [1, "USB port", "Front left, below the screen. Not a care point."],
      [2, "Screen", "Read messages and service reminders here. Photograph any error."],
      [3, "Camera", "Small lens at the upper left inside the chamber. Clean monthly, page 4."],
      [4, "Door", "Hold the handle on its right edge. Open it to reach the print and plate."],
      [5, "Heated bed + plate", "The thin print plate rests on the bed, held by two rear pins."],
      [6, "Air intake / handle", "Slotted recess high on the right side. Keep it clear; lift here."],
      [7, "Top glass", "The AMS can sit on top. Keep the glass clean and unloaded at its edges."],
    ])}</div>`,
    note: "<b>Before inside work:</b> let it cool, switch off and unplug. Keep hands out while parts move. The bed and nozzle stay hot for several minutes after a print.",
    source: "Drawn from the Bambu Lab P2S User Manual, p. 11 (front view). Inner parts are placed schematically.",
  }),
  page(2, {
    tag: "AFTER EACH PRINT",
    title: "Reset the station",
    lede: "Finish with a clear plate, a clear waste path and tools put away, so the next person starts clean.",
    body: `<div class="row"><div class="fig fig-mid">${F.backView()}<div class="cap">Back + left side<span>Numbers match Bambu's rear drawing.</span></div></div>
    ${parts([
      [4, "Power switch + socket", "Lower corner of the back. After cooling: switch off, then unplug at the wall."],
      [7, "Waste outlet", "The chute at the bottom of the back. Clear loose scraps; empty the bin below it."],
      [6, "Rear vents", "The large grille. Keep the waste bin, cables and boxes at least a hand's width away."],
    ])}</div>
    <div class="cards c3">
      ${card(1, "Lift the cool plate", F.liftPlate(), "Wait until the bed is cool. Hold the plate at its edges (<b>A</b>) and lift it off the pins.")}
      ${card(2, "Flex, then clear", F.flexPlate(), "Over the bin, bend the plate gently to pop the print and loose bits off. Never bend it sharply.")}
      ${card(3, "Seat it flat", F.seatPlate(), "No bits under it. Slide its rear edge against the two pins (<b>B</b>) so it lies flat.", { mark: tick })}
    </div>`,
    note: "If waste is stuck inside the outlet, stop and follow the P2S clog guide. Do not poke blindly into the chute.",
    source: "Drawn from the Bambu Lab P2S User Manual, p. 12 (rear view). Action drawings are simplified.",
  }),
  page(3, {
    tag: "WEEKLY / WHEN GREASY",
    title: "Wash the print plate",
    lede: "Take the plate to the sink. Water stays away from the printer. Fingerprints are the usual reason prints stop sticking.",
    body: `<div class="cards c2 grow">
      ${card(1, "Grip the edges", F.gripPlate(), "Cool first. Hold the plate only at its edges (<b>A</b>); keep fingers off the print surface.")}
      ${card(2, "Wash with soap", F.washPlate(), "Warm water, a few drops of dish soap and the soft side of a sponge. Wash the whole surface.")}
      ${card(3, "Rinse and dry", F.rinsePlate(), "Rinse off all soap; leftover soap stops adhesion too. Stand it to drain, then dry both sides with a lint-free towel.")}
      ${card(4, "Check, then set down", F.setPlate(), "Clear any bits on the bed. Lower the plate straight down onto the pins. It should lie flat.", { mark: tick })}
    </div>`,
    note: "For the textured PEI plate in your photo. Do not scrape it with a sharp metal blade, and do not use abrasive pads or solvent wipes.",
    source: "Care reference: Bambu Lab P2S User Manual, pp. 109-110. Diagrams show the actions, not scale.",
  }),
  page(4, {
    tag: "WEEKLY / MORE OFTEN IN A DUSTY SHOP",
    title: "Clear dust from the right spots",
    lede: "Use a soft cloth or brush. Pick dust up; do not blow it deeper inside.",
    body: `<div class="row"><div class="fig fig-mid">${F.topView()}<div class="cap">View from above<span>Top glass omitted to show the chamber.</span></div></div>
    ${parts([
      [1, "Purge wiper", "Rear left of the chamber. Remove loose scraps around it with tweezers."],
      [3, "Air filter cover", "Slotted cover on the back wall. Brush dust off the slots."],
      [4, "Airflow unit", "Back wall, right. Keep the air path open and the grille free of strings."],
    ])}</div>
    <div class="cards c2">
      ${card("A", "Camera: once a month", F.cameraSwab(), "Upper-left inside corner (part 3, page 1). Wipe the lens with a lightly damp swab. No spray.", { letter: true })}
      ${card("B", "Filter: check every 3 months", F.filterSwap(), "Dust off the cover. Replace a dirty or used-up filter with the right P2S filter, using the P2S steps.", { letter: true })}
    </div>`,
    note: "Cool, switch off and unplug before cleaning. Never spray liquid into the printer.",
    source: "Drawn from the Bambu Lab P2S User Manual, p. 13; care instructions pp. 105-111. Inner positions are schematic.",
  }),
  page(5, {
    tag: "CHECK AT EACH SPOOL CHANGE",
    title: "Keep filament dry and free",
    lede: "Filament is the plastic thread. It needs a smooth, dry path from the spool to the printer.",
    body: `<div class="cards c2 grow">
      ${card(1, "Check the roll", F.spoolRoll(), "The spool must turn freely on its rollers. Remove tangles and crossed loops before use.", { mark: tick })}
      ${card(2, "Check the tube path", F.tubePath(), "Use gentle bends (left). A sharp kink (right) pinches the tube and stalls the feed.")}
      ${card(3, "Close and check", F.amsBox(), "Shut the AMS lid fully. Check its humidity reading on the screen or in the app.")}
      ${card(4, "Store the loose end", F.spoolClip(), "Push the end through a flange hole (<b>A</b>) so it cannot unwind and tangle.")}
    </div>`,
    note: "Drying packs absorb moisture; replace used-up packs. For heat drying, use the material's own settings.",
    source: "AMS guide: wiki.bambulab.com/en/ams-2-pro/maintenance/basic-maintenance. Drawings are schematic.",
  }),
  page(6, {
    tag: "FOLLOW THE PRINTER'S SERVICE REMINDERS",
    title: "Match the part to the lube",
    lede: "Clean first: wipe off old oil, grease and dust. Use the P2S guide to reach and move each part safely.",
    body: `<div class="cards c3">
      ${card("A", "Smooth rod &rarr; oil", F.rodOil(), "Smooth, shiny sides. Wipe clean, then apply a small drop of oil as the guide shows.", { letter: true })}
      ${card("B", "Threaded screw &rarr; grease", F.screwGrease(), "Spiral grooves. Spread a thin layer of grease along the long threaded part.", { letter: true })}
      ${card("C", "Belt &rarr; no lube", F.beltDry(), "Toothed rubber belts stay dry. Never put oil or grease on them.", { letter: true, mark: cross })}
    </div>
    <div class="row" style="margin-top:8px"><div class="fig fig-small">${F.lubeMap()}</div>
    <div style="flex:1"><div class="sub">Where to look</div>${parts([
      ["A", "Front corners", "Each front corner has a smooth rod (A) next to a threaded screw (B).", true],
      ["B", "Rear centre", "One more threaded screw sits near the centre of the back.", true],
      ["&uarr;", "Up top", "The X/Y guide rods also take oil. Follow the linked P2S guide."],
    ])}</div></div>`,
    note: "This is a part map, not a take-apart guide. Base bearings have separate oil points: use Bambu's steps.",
    source: "Lubrication reference: Bambu Lab P2S User Manual, pp. 107-109. Locations are schematic, not dimensions.",
  }),
  page(7, {
    tag: "MONTHLY / AFTER A PRINT PROBLEM",
    title: "Know the print head",
    lede: "Use this map to name the part before you clean it or ask for help.",
    body: `<div class="row"><div class="fig fig-big">${F.headExploded()}<div class="cap">Exploded view<span>For finding parts only.</span></div></div>
    <div style="flex:1;display:flex;flex-direction:column">${parts([
      [1, "Filament inlet", "Where the plastic enters, through the tube coupler on top."],
      [2, "Cutter lever", "Moves the filament cutter. Do not force it."],
      [3, "Feed gears", "Two toothed gears that grip and push the plastic."],
      [4, "Hotend", "Heatsink, heater block and nozzle. Melts plastic. Let it cool first."],
      [5, "Body", "The frame that holds everything."],
      [6, "Front cover", "Comes off first. Clips to the body."],
      [7, "Fan", "Cools the print. Keep its blades free of strings."],
    ])}
    <div class="sub">Look for these changes</div>
    <div class="cards c2">${card(null, "No plastic buildup", F.nozzleClean(), "Clean metal tip.", { mark: tick })}${card(null, "Stuck plastic: stop", F.nozzleBlob(), "Blob around the nozzle.", { mark: cross })}</div></div></div>`,
    note: "Also check the soft nozzle cover, the cutter and the wiping pad. Replace worn parts with the right P2S parts. The exploded view does not show a safe order for taking the head apart.",
    source: "Drawn after the Bambu Lab P2S User Manual, p. 14. Replacement procedures: pp. 111-114.",
  }),
  page(8, {
    tag: "AT THE START OF EACH PRINT",
    title: "Read the first layer",
    lede: "Watch the first layer through the door. These samples show what to look for.",
    body: `<div class="cards c3">
      ${card(null, "Ready", F.layerReady(), "Lines touch each other and lie flat.", { mark: tick })}
      ${card(null, "Gaps", F.layerGaps(), "Spaces between the lines.", { mark: cross })}
      ${card(null, "Lifting", F.layerLifting(), "Edges and corners curl off the plate.", { mark: cross })}
    </div>
    <div class="sub" style="margin-top:10px">Something looks or sounds wrong? Pause and read the screen. Then:</div>
    <div class="cards c3">
      ${card(1, "Check the plate", F.checkPlateMini(), "Is it clean (page 3) and flat on its pins (page 2)?")}
      ${card(2, "Check the feed", F.checkFeedMini(), "Is a spool stuck or a tube pinched (page 5)?")}
      ${card(3, "Save the error", F.phoneMini(), "Take a photo of the full message, including the code.")}
    </div>`,
    note: "Gaps and lifting can have several causes. Use the error guide before changing settings or retrying.",
    source: "First-layer reference: Bambu Lab P2S User Manual, pp. 85-86. Samples are enlarged examples.",
  }),
  page(9, {
    tag: "ROUTINE CARE / NORMAL USE",
    title: "Give each task a time",
    lede: "Use this as your shop plan. The printer's own reminders still come first.",
    body: `<table><thead><tr><th></th><th>WHEN</th><th>WHAT TO DO</th><th>GO TO</th></tr></thead><tbody>
      ${[
        [F.iconPlate(), "After each print", "Clear scraps. Empty waste. Put tools away.", "Page 2"],
        [F.iconSpool(), "Each new spool", "Check the roll, tube path and dry storage.", "Page 5"],
        [F.iconSponge(), "Each week", "Wash the plate. Clear loose dust.", "Pages 3-4"],
        [F.iconCamera(), "Each month", "Clean the camera. Check the print head.", "Pages 4 and 7"],
        [F.iconFilter(), "Every 3 months", "Check the filter cover and filter condition.", "Page 4"],
        [F.iconRod(), "Service reminder", "Clean and lube the named moving parts.", "Page 6 + Bambu guide"],
        [F.iconPrinter(), "After moving / service", "Run the printer's calibration check.", "Printer calibration menu"],
      ].map(([icon, a, b, c]) => `<tr><td>${icon}</td><td><b>${a}</b></td><td>${b}</td><td>${c}</td></tr>`).join("")}
    </tbody></table>
    <p class="lede" style="margin-top:8px">Busy shop? Check more often. If use exceeds 8 hours a day, Bambu calls for shorter service intervals.</p>`,
    note: "Date each service on the next page. A short note is enough for the next person to pick up the work.",
    source: "Schedule: Bambu Lab P2S User Manual, pp. 105-106. Weekly dust checks are a workshop habit.",
  }),
  page(10, {
    tag: "PRINT ANOTHER COPY WHEN FULL",
    title: "Leave a useful record",
    lede: "Write the date, the task, your initials and the next check. Parts replaced? Note the name. Error? Save the code or a photo.",
    body: `<table class="log"><thead><tr><th style="width:12%">DATE</th><th>WHAT I DID / WHAT I FOUND</th><th style="width:11%">INITIALS</th><th style="width:16%">NEXT CHECK</th></tr></thead><tbody>
      <tr class="ex"><td>Oct 8</td><td>Washed plate; no damage</td><td>JC</td><td>Next week</td></tr>
      ${"<tr><td></td><td></td><td></td><td></td></tr>".repeat(9)}
    </tbody></table>
    <div class="row" style="margin-top:6px;align-items:center"><div class="fig fig-tray">${F.toolTray()}</div>
    <div style="flex:1"><div class="sub">Keep nearby</div><p class="lede">Soft cloth, soft brush, tweezers, dish soap, and the correct oil and grease for the P2S.</p></div></div>`,
    note: "Keep this page by the printer. When it is full, print a new copy and file the old one.",
    source: "Sources: Bambu Lab P2S User Manual; AMS 2 Pro maintenance guide. All drawings are original.",
  }),
];

// Fit each drawing's viewBox to what is actually drawn, before printing.
const FIT = `document.querySelectorAll("svg.iso-svg").forEach((s) => { const b = s.getBBox(); const p = Math.max(b.width, b.height) * 0.03 + 4; s.setAttribute("viewBox", [b.x - p, b.y - p, b.width + 2 * p, b.height + 2 * p].join(" ")); });`;

writeFileSync(new URL("./manual.html", import.meta.url), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>P2S Visual Care Manual</title><style>${KIT_CSS}${CSS}</style></head><body class="iso" data-theme="light">${pages.join("")}<script>${FIT}</script></body></html>`);
console.log("wrote manual.html");
