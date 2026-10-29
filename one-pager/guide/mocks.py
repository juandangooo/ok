"""Draw mockups of each screen in the quote tool, matching what Code.gs builds.

Writes HTML into guide/mocks/. capture.js turns them into PNGs plus callout boxes.
"""
import base64
import re
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE / "mocks"
OUT.mkdir(exist_ok=True)

code = (HERE.parent / "apps-script" / "Code.gs").read_text()
btn = dict(re.findall(r"const (BUTTON_\w+) = '([^']+)'", code))
MAKE = f"data:image/png;base64,{btn['BUTTON_MAKE_PDF']}"
NEW = f"data:image/png;base64,{btn['BUTTON_NEW_QUOTE']}"

CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 1600px; height: 900px; font-family: "Liberation Sans", Arial, sans-serif; font-size: 15px;
       color: #202124; background: #f9fbfd; overflow: hidden; position: relative; }
.top { height: 64px; display: flex; align-items: center; gap: 14px; padding: 0 18px; background: #f9fbfd; }
.logo { width: 30px; height: 40px; border-radius: 4px; background: #0f9d58; }
.title { font-size: 19px; }
.menus { height: 34px; display: flex; gap: 2px; padding: 0 56px; align-items: center; }
.menus span { padding: 6px 9px; border-radius: 4px; font-size: 15px; }
.bar { height: 44px; margin: 4px 14px 0; border-radius: 22px; background: #edf2fa; }
.fx { height: 34px; border-bottom: 1px solid #dadce0; background: #fff; margin-top: 6px; }
.grid { position: absolute; top: 186px; left: 0; right: 0; bottom: 46px; background: #fff; overflow: hidden; }
table { border-collapse: collapse; table-layout: fixed; }
td, th { height: 30px; border: 1px solid #e2e3e3; padding: 0 8px; white-space: nowrap; overflow: hidden; font-size: 15px; }
th { background: #f8f9fa; color: #5f6368; font-weight: normal; font-size: 13px; text-align: center; }
th.rh { width: 46px; }
td.in { background: #eaf4fa; }
td.lab { color: #6b6b6b; }
td.hint { color: #a3a3a3; font-size: 14px; }
td.bold { font-weight: bold; }
td.ph { background: #fdecea; color: #e8382f; }
.tabs { position: absolute; left: 0; right: 0; bottom: 0; height: 46px; background: #f9fbfd; border-top: 1px solid #dadce0;
        display: flex; align-items: center; gap: 4px; padding-left: 90px; }
.tab { padding: 9px 20px; border-radius: 6px 6px 0 0; font-size: 15px; color: #444; }
.tab.on { background: #e1e9f7; color: #0b57d0; font-weight: bold; }
.btn { position: absolute; width: 230px; height: 52px; }
.dim { position: absolute; inset: 0; background: rgba(32,33,36,.45); }
.modal { position: absolute; background: #fff; border-radius: 10px; box-shadow: 0 12px 40px rgba(0,0,0,.3); padding: 26px 30px; }
.modal h3 { font-size: 20px; font-weight: normal; margin-bottom: 14px; }
.modal a { color: #1a73e8; text-decoration: underline; }
.ok { display: inline-block; margin-top: 20px; float: right; background: #1a73e8; color: #fff; padding: 9px 22px; border-radius: 4px; }
.dropdown { position: absolute; background: #fff; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,.25); padding: 8px 0; width: 230px; }
.dropdown div { padding: 9px 18px; font-size: 15px; }
.dropdown hr { border: 0; border-top: 1px solid #e2e3e3; margin: 6px 0; }
"""

MENUS = ["File", "Edit", "View", "Insert", "Format", "Data", "Tools", "Extensions", "Quotes", "Help"]


def chrome(active, grid, extra=""):
    menus = "".join(f'<span{" data-id=menu-quotes" if m == "Quotes" else ""}>{m}</span>' for m in MENUS)
    tabs = "".join(f'<div class="tab{" on" if t == active else ""}" data-id="tab-{t.lower()}">{t}</div>'
                   for t in ["Quote", "Packages", "Log"])
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="top"><div class="logo"></div><div class="title">Helix Package Quotes</div></div>
<div class="menus">{menus}</div><div class="bar"></div><div class="fx"></div>
<div class="grid">{grid}</div><div class="tabs">{tabs}</div>{extra}</body></html>"""


def table(widths, rows, letters=None):
    letters = letters or [chr(65 + i) for i in range(len(widths))]
    cols = '<col style="width:46px">' + "".join(f'<col style="width:{w}px">' for w in widths)
    head = '<tr><th class="rh"></th>' + "".join(f"<th>{l}</th>" for l in letters) + "</tr>"
    body = ""
    for i, r in enumerate(rows, 1):
        body += f'<tr><th class="rh">{i}</th>'
        for cell in r:
            text, cls, did = (cell + ("", "", ""))[:3] if isinstance(cell, tuple) else (cell, "", "")
            body += f'<td class="{cls}"{f" data-id={did}" if did else ""}>{text}</td>'
        body += "</tr>"
    return f"<table>{cols}{head}{body}</table>"


def quote_rows(client="Helix", date="October 22, 2026"):
    f = [("Package", "Live Zoom Package  ▾", "Pick from the list", "cell-package"),
         ("Client", client, "Who the quote is for", "cell-client"),
         ("Event date", date, "Double-click to pick a date", "cell-date"),
         ("Days", "1", "Number of event days", ""),
         ("Quote number", "0625", "Goes up by one when you click Start new quote", ""),
         ("Issued", "Oct 28, 2026", "Today’s date is filled in for you", ""),
         ("Valid until", "Nov 27, 2026", "30 days after Issued", ""),
         ("Tax rate", "0.000%", "Use 0, or a percent like 6.625%", ""),
         ("Contact name", "Rick", "", ""),
         ("Contact email", "Rick@368eventmanagement.com", "", ""),
         ("Contact phone", "(201) 893-5224", "", ""),
         ("Drive folder (optional)", "", "Optional: paste a Drive folder link", "")]
    rows = [[("Quote", "bold"), "", "", "", ""]]
    for lab, val, hint, did in f:
        rows.append([(lab, "lab"), (val, "in", did), (hint, "hint"), "", ""])
    rows += [["", "", "", "", ""], [("Add-ons (optional, flat price)", "bold"), "", "", "", ""],
             [("Name", "lab bold"), ("Description", "lab bold"), ("Price", "lab bold"), "", ""]]
    for i in range(5):
        rows.append([("", "in", "addons" if i == 0 else ""), ("", "in"), ("", "in"), "", ""])
    return rows


QUOTE_W = [190, 330, 420, 30, 260]
buttons = (f'<img class="btn" data-id="btn-make" src="{MAKE}" style="top:{186 + 31 + 31}px;left:{46 + 190 + 330 + 420 + 30 + 14}px">'
           f'<img class="btn" data-id="btn-new" src="{NEW}" style="top:{186 + 31 + 31 * 4}px;left:{46 + 190 + 330 + 420 + 30 + 14}px">')

pages = {
    "quote": chrome("Quote", table(QUOTE_W, quote_rows()), buttons),
    "quote-empty": chrome("Quote", table(QUOTE_W, quote_rows(client="", date="")), buttons),
    "menu": chrome("Quote", table(QUOTE_W, quote_rows()), buttons + """
      <div class="dropdown" data-id="menu-dropdown" style="top:98px;left:640px">
        <div data-id="menu-make">Make PDF</div><div>Start new quote</div><hr><div data-id="menu-setup">Set up sheet</div></div>"""),
    "done": chrome("Quote", table(QUOTE_W, quote_rows()), buttons + """
      <div class="dim"></div>
      <div class="modal" style="top:300px;left:560px;width:480px" data-id="dialog">
        <h3>One-pager ready</h3>
        <div style="line-height:1.7"><b>Helix - Live Zoom Package - Quote 0625</b><br>Total $2,650<br><br>
        <a data-id="open-pdf">Open PDF</a> &nbsp;·&nbsp; <a data-id="edit-doc">Edit as Google Doc</a></div></div>"""),
    "fix": chrome("Quote", table(QUOTE_W, quote_rows(client="", date="")), buttons + """
      <div class="dim"></div>
      <div class="modal" style="top:280px;left:540px;width:520px" data-id="alert">
        <h3>Fix these first</h3>
        <div style="line-height:1.9">•&nbsp; Enter the client name.<br>•&nbsp; Event date needs to be a date. Double-click the cell to pick one.</div>
        <div class="ok">OK</div></div>"""),
}

pk_rows = [[("Package", "lab bold"), ("Type", "lab bold"), ("Name", "lab bold"), ("Description", "lab bold"),
            ("Price per day", "lab bold"), ("Status", "lab bold")]]
data = [
    ("Live Zoom Package", "Headline", "Your Zoom Call Package", "", "", ""),
    ("Live Zoom Package", "Section", "Crew", "Senior audio technician (A1), video technician (V1)", "$1,200", "Quote 0625"),
    ("Live Zoom Package", "Section", "Video", "BirdDog X5 Ultra PTZ camera, Roland V-02HD MK II…", "$850", "Quote 0625"),
    ("Live Zoom Package", "Section", "Audio", "Focusrite Scarlett 2i2, Radial direct boxes, iPad", "$600", "Quote 0625, includes transport"),
    ("Live Zoom Package", "Also", "Joystick camera controller", "", "", ""),
    ("Cocktail Hour Sound", "Headline", "Your Cocktail Hour Sound", "", "", ""),
    ("Cocktail Hour Sound", "Section", "Crew", "Audio engineer (A1), on site for the event", "$600", "PLACEHOLDER"),
    ("Cocktail Hour Sound", "Section", "Sound system", "PA speakers, digital mixer, wireless mics", "$750", "PLACEHOLDER"),
    ("Cocktail Hour Sound", "Section", "Band setup", "Stage mics, monitors, and direct boxes", "$400", "PLACEHOLDER"),
    ("Room Rental", "Headline", "Your Room at Helix", "", "", ""),
    ("Room Rental", "Section", "Room", "Event space at Helix, 20 French St", "$5,000", "PLACEHOLDER"),
]
for r in data:
    ph = r[5] == "PLACEHOLDER"
    row = []
    for j, v in enumerate(r):
        cls = "ph" if ph else ("in" if j < 5 else "lab")
        did = ""
        if r[2] == "Sound system" and j == 4:
            did = "ph-price"
        if r[2] == "Audio" and j == 4:
            did = "real-price"
        if r[2] == "Sound system" and j == 5:
            did = "ph-status"
        row.append((v, cls, did))
    pk_rows.append(row)
pages["packages"] = chrome("Packages", table([200, 100, 250, 440, 130, 240], pk_rows))

log_rows = [[("Created", "lab bold"), ("Client", "lab bold"), ("Package", "lab bold"), ("Event date", "lab bold"),
             ("Total", "lab bold"), ("Google Doc", "lab bold"), ("PDF", "lab bold")],
            [("Oct 29, 2026 10:14 am", "", "log-row"), "Helix", "Live Zoom Package", "Oct 22, 2026", "$2,650",
             ("docs.google.com/…", ""), ("drive.google.com/…", "", "log-pdf")]]
pages["log"] = chrome("Log", table([190, 140, 190, 130, 100, 250, 250], log_rows))

for name, page in pages.items():
    (OUT / f"{name}.html").write_text(page)
print("wrote", sorted(pages))
