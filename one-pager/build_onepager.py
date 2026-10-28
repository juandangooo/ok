"""Build the 368 x Hellhound client one-pager workbook.

Run:  python3 one-pager/build_onepager.py
Out:  one-pager/368-Hellhound-OnePager.xlsx  (import into Google Sheets)
"""
from pathlib import Path

from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.properties import PageSetupProperties

HERE = Path(__file__).parent
OUT = HERE / "368-Hellhound-OnePager.xlsx"

# Design tokens (Memorisely-style: warm paper, near-black ink, tiny accents)
PAPER = "FAF9F6"
CARD = "FFFFFF"
INK = "171717"
MUTED = "6B6B6B"
FAINT = "A3A3A3"
LINE = "E7E5E0"
TINT = "F2F0EB"
INPUT = "EAF4FA"
BLUE = "0096CF"  # 368EM
RED = "E8382F"   # Hellhound
FONT = "Inter"
MONEY = '"$"#,##0'


def fill(hex_):
    return PatternFill("solid", start_color=hex_, end_color=hex_)


def font(size=10.5, bold=False, color=INK, italic=False):
    return Font(name=FONT, size=size, bold=bold, color=color, italic=italic)


hair = Side(style="thin", color=LINE)
ink_line = Side(style="thin", color=INK)


def put(ws, ref, value, size=10.5, bold=False, color=INK, h="left", v="center",
        wrap=False, merge=None, fmt=None, italic=False, indent=0):
    if merge:
        ws.merge_cells(merge)
    c = ws[ref]
    c.value = value
    c.font = font(size, bold, color, italic)
    c.alignment = Alignment(horizontal=h, vertical=v, wrap_text=wrap, indent=indent)
    if fmt:
        c.number_format = fmt
    return c


def paint(ws, rows, cols, color):
    for r in rows:
        for col in cols:
            ws.cell(row=r, column=col).fill = fill(color)


def box(ws, r1, r2, c1, c2, color=PAPER):
    """Warm card with a hairline outline."""
    paint(ws, range(r1, r2 + 1), range(c1, c2 + 1), color)
    for r in range(r1, r2 + 1):
        for c in range(c1, c2 + 1):
            cell = ws.cell(row=r, column=c)
            cell.border = Border(
                top=hair if r == r1 else None,
                bottom=hair if r == r2 else None,
                left=hair if c == c1 else None,
                right=hair if c == c2 else None,
            )


def page_grid(ws, last_row):
    """A..K: margin, 4 cols, gutter, 4 cols, margin. White, sized to print
    on Letter at 100%: 8.5 x 11 minus 0.25" margins leaves 768 x 1008 px."""
    widths = {"A": 2, "B": 11.75, "C": 11.75, "D": 11.75, "E": 11.75, "F": 2.5,
              "G": 11.75, "H": 11.75, "I": 11.75, "J": 11.75, "K": 2}
    for k, w in widths.items():
        ws.column_dimensions[k].width = w
    paint(ws, range(1, last_row + 1), range(1, 12), CARD)
    ws.sheet_view.showGridLines = False
    ws.print_area = f"A1:K{last_row}"
    ws.page_setup.orientation = "portrait"
    ws.page_setup.paperSize = ws.PAPERSIZE_LETTER
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 1
    ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
    ws.page_margins.left = ws.page_margins.right = 0.25
    ws.page_margins.top = ws.page_margins.bottom = 0.25
    ws.page_margins.header = ws.page_margins.footer = 0
    ws.print_options.horizontalCentered = True


def heights(ws, spec):
    for r, h in spec.items():
        ws.row_dimensions[r].height = h


def page_header(ws):
    put(ws, "B2", "368 EVENT MANAGEMENT  ×  HELLHOUND AUDIO", 8.5, True, MUTED, merge="B2:E2")
    put(ws, "G2", '=IF(Inputs!B4="","","Prepared for "&Inputs!B4)', 8.5, False, MUTED, h="right", merge="G2:J2")
    put(ws, "G3", '=IF(Inputs!B7="","",TEXT(Inputs!B7,"mmmm d, yyyy"))', 8.5, False, FAINT, h="right", merge="G3:J3")


# ---------------------------------------------------------------- data
CATEGORIES = ["Sound", "Video & Computers", "Screens", "Crew & Rehearsal"]

# (category, item, what's included, unit, placeholder rate, sample qty, sample days)
RATES = [
    ("Sound", "Executive Mic Package", "A wireless mic for each speaker, plus a spare for each one", "per day", 1200, 1, 1),
    ("Sound", "Live Audio Mixing", "A mixer that balances room and remote voices and removes echo", "per day", 800, 1, 1),
    ("Video & Computers", "Show Computer Package", "Two dedicated computers: one runs the call, one is a live backup", "per day", 900, 1, 1),
    ("Video & Computers", "Camera & Lighting Package", "Professional cameras and lights so speakers look sharp on screen", "per day", 1100, 1, 1),
    ("Video & Computers", "Dedicated Internet", "Wired internet, separate from building Wi-Fi, with a backup", "per day", 500, 1, 1),
    ("Screens", "Display Package", "A large screen showing remote guests and slides to the room", "per screen, per day", 450, 2, 1),
    ("Crew & Rehearsal", "Lead Engineer", "Runs the show and fixes issues before anyone notices", "per day", 1400, 1, 1),
    ("Crew & Rehearsal", "Call Operator", "Manages Zoom: guests, screen shares, spotlights, recording", "per day", 1000, 1, 1),
    ("Crew & Rehearsal", "Setup & Rehearsal Day", "We build everything and run a full test the day before", "flat", 1500, 1, 1),
]
FIRST_LINE = 24  # first line-item row on Inputs
LAST_LINE = FIRST_LINE + len(RATES) - 1

CARDS = {
    "Sound": ("Every voice is clear, in the room and on the call. No echo, no “can you hear me?”",
              "Mics · Spares · Live mixing"),
    "Video & Computers": ("The call doesn’t freeze or drop. If a computer or connection fails, the backup takes over in seconds.",
                          "2 computers · Cameras · Wired internet"),
    "Screens": ("Everyone in the room can see remote guests and slides, from any seat.",
                "Large displays · Cabling · Stands"),
    "Crew & Rehearsal": ("A professional watches every second and fixes problems before anyone notices.",
                         "Engineer · Operator · Rehearsal day"),
}

COMPARE = [
    ("One laptop runs everything", "Two computers. One is always a live backup."),
    ("Building Wi-Fi", "Dedicated wired internet, plus a cellular backup"),
    ("The laptop mic picks up the whole room", "A mic for every speaker, mixed live"),
    ("Someone on staff figures it out", "An engineer who has done this hundreds of times"),
    ("The first test is when the call starts", "A full rehearsal the day before"),
]

ALWAYS = [
    "A full test run before the event, with your speakers when possible.",
    "A backup for every critical part: computer, internet, and microphones.",
    "One point of contact from planning through show day.",
    "Delivery, setup, and teardown.",
]

wb = Workbook()

# ---------------------------------------------------------------- Start Here
st = wb.active
st.title = "Start Here"
st.sheet_view.showGridLines = False
st.column_dimensions["A"].width = 3
st.column_dimensions["B"].width = 6
st.column_dimensions["C"].width = 90
paint(st, range(1, 30), range(1, 5), PAPER)
st.page_setup.fitToWidth = 1
st.page_setup.fitToHeight = 1
st.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
put(st, "B2", "Client One-Pager", 24, True, merge="B2:C2")
st.row_dimensions[2].height = 36
put(st, "B3", "Fill in one tab. Two print-ready pages build themselves.", 11, False, MUTED, merge="B3:C3")
steps = [
    ("1", "Rates", "Enter the real prices once. The numbers there now are placeholders. Every quote uses these."),
    ("2", "Inputs", "For each client, fill in the blue cells: who, when, and how many of each item."),
    ("3", "Page 1 · Story", "The one-pager. Check it reads well for this client."),
    ("4", "Page 2 · Details", "Every line item with prices, for the person who wants the detail."),
    ("5", "Print / PDF", "Open Page 1, then File › Print. Use: Letter (8.5\" x 11\") · Portrait · "
                         "Scale: Fit to page · Margins: Narrow · uncheck Show gridlines and Show notes. "
                         "Click Next, then Save as PDF. Repeat for Page 2. Each page prints at full size on one sheet."),
    ("6", "Event Log", "Save the PDF in the shared Drive folder and add one row with the link. That row is your record. "
                       "Then clear Inputs for the next client."),
]
r = 5
for n, name, text in steps:
    put(st, f"B{r}", n, 14, True, BLUE, h="center", v="top")
    put(st, f"C{r}", name, 11, True)
    put(st, f"C{r+1}", text, 10.5, False, MUTED, v="top", wrap=True)
    st.row_dimensions[r + 1].height = 34 if len(text) < 110 else 50
    r += 3
put(st, f"B{r}", "Before sending", 11, True, merge=f"B{r}:C{r}")
put(st, f"B{r+1}", "Confirm the three proof numbers on Inputs are true, and that the copy matches what we actually deliver.",
    10.5, False, RED, wrap=True, merge=f"B{r+1}:C{r+1}")
st.row_dimensions[r + 1].height = 30
put(st, f"B{r+3}", "Copy rule: clear, not cute. Short words, short lines, no jargon, nothing condescending.",
    10, False, MUTED, italic=True, merge=f"B{r+3}:C{r+3}")

# ---------------------------------------------------------------- Inputs
inp = wb.create_sheet("Inputs")
inp.sheet_view.showGridLines = False
for k, w in {"A": 26, "B": 30, "C": 52, "D": 18, "E": 12, "F": 8, "G": 8, "H": 14}.items():
    inp.column_dimensions[k].width = w
put(inp, "A1", "Inputs", 20, True)
inp.row_dimensions[1].height = 30
put(inp, "A2", "Fill in the blue cells. Everything else updates on its own.", 10.5, False, MUTED)

fields = [
    (4, "Client", "Acme Corp"),
    (5, "Event name", "Q4 Leadership Town Hall"),
    (6, "Event type", "Executive Zoom Call"),
    (7, "Date", None),
    (8, "Location", "Acme HQ, Boardroom A"),
    (9, "Prepared by", "Your name"),
    (10, "Contact email", "you@company.com"),
    (11, "Contact phone", "(555) 555-5555"),
]
for row, label, val in fields:
    put(inp, f"A{row}", label, 10.5, False, MUTED)
    c = put(inp, f"B{row}", val, 10.5)
    c.fill = fill(INPUT)
inp["B7"].number_format = "mmmm d, yyyy"

put(inp, "A13", "Proof points (Page 1)", 11, True)
put(inp, "C13", "Number / short label. Only use numbers we can stand behind.", 9.5, False, RED)
proofs = [(14, "1,000+", "events produced"), (15, "24 hrs", "of testing before every show"),
          (16, "2×", "backup on every critical part")]
for row, num, label in proofs:
    put(inp, f"A{row}", f"Proof {row - 13}", 10.5, False, MUTED)
    for col, v in (("B", num), ("C", label)):
        c = put(inp, f"{col}{row}", v, 10.5)
        c.fill = fill(INPUT)

put(inp, "A18", "Tax rate", 10.5, False, MUTED)
c = put(inp, "B18", 0, 10.5, fmt="0.0%")
c.fill = fill(INPUT)
put(inp, "A19", "Notes for Page 2", 10.5, False, MUTED, v="top")
c = put(inp, "B19", "Load-in begins 7:00 AM. Final rehearsal with speakers at 2:00 PM the day before.",
        10.5, wrap=True, v="top", merge="B19:D19")
c.fill = fill(INPUT)
inp.row_dimensions[19].height = 44

put(inp, "A22", "Line items", 11, True)
put(inp, "C22", "Set Qty to 0 to leave an item out. Prices come from the Rates tab.", 9.5, False, MUTED)
for col, h in zip("ABCDEFGH", ["Category", "Item", "What's included", "Unit", "Rate", "Qty", "Days", "Subtotal"]):
    c = put(inp, f"{col}23", h, 9, True, MUTED)
    c.border = Border(bottom=hair)
for i, (_, _, _, _, _, qty, days) in enumerate(RATES):
    row, src = FIRST_LINE + i, 5 + i
    put(inp, f"A{row}", f"=Rates!A{src}", 10, False, MUTED)
    put(inp, f"B{row}", f"=Rates!B{src}", 10, True)
    put(inp, f"C{row}", f"=Rates!C{src}", 9.5, False, MUTED, wrap=True)
    put(inp, f"D{row}", f"=Rates!D{src}", 9.5, False, MUTED)
    put(inp, f"E{row}", f"=Rates!E{src}", 10, fmt=MONEY)
    for col, v in (("F", qty), ("G", days)):
        c = put(inp, f"{col}{row}", v, 10, h="center")
        c.fill = fill(INPUT)
    put(inp, f"H{row}", f"=E{row}*F{row}*G{row}", 10, True, fmt=MONEY)
    inp.row_dimensions[row].height = 30
tot = LAST_LINE + 1
put(inp, f"G{tot}", "Total", 10, True, h="right")
put(inp, f"H{tot}", f"=SUM(H{FIRST_LINE}:H{LAST_LINE})", 11, True, fmt=MONEY).border = Border(top=ink_line)

# ---------------------------------------------------------------- Rates
rt = wb.create_sheet("Rates")
rt.sheet_view.showGridLines = False
for k, w in {"A": 20, "B": 28, "C": 64, "D": 20, "E": 12}.items():
    rt.column_dimensions[k].width = w
put(rt, "A1", "Rates", 20, True)
rt.row_dimensions[1].height = 30
put(rt, "A2", "PLACEHOLDER PRICES. Replace with real rates before sending anything. Changes here flow into every quote.",
    10.5, True, RED)
put(rt, "A3", f"Keep categories spelled exactly as: {', '.join(CATEGORIES)}. "
              "Edit rows in place; don't insert rows above the list.", 9.5, False, MUTED)
for col, h in zip("ABCDE", ["Category", "Item", "What's included (plain English)", "Unit", "Rate"]):
    c = put(rt, f"{col}4", h, 9, True, MUTED)
    c.border = Border(bottom=hair)
for i, (cat, item, inc, unit, rate, _, _) in enumerate(RATES):
    row = 5 + i
    put(rt, f"A{row}", cat, 10, False, MUTED)
    put(rt, f"B{row}", item, 10, True)
    put(rt, f"C{row}", inc, 10, wrap=True)
    put(rt, f"D{row}", unit, 10, False, MUTED)
    c = put(rt, f"E{row}", rate, 10, fmt=MONEY)
    c.fill = fill(INPUT)
    rt.row_dimensions[row].height = 30

LINES = f"Inputs!$A${FIRST_LINE}:$A${LAST_LINE}"
SUBS = f"Inputs!$H${FIRST_LINE}:$H${LAST_LINE}"
TOTAL = "'Page 2 · Details'!J27"

# ---------------------------------------------------------------- Page 1
p1 = wb.create_sheet("Page 1 · Story")
LAST1 = 43
page_grid(p1, LAST1)
heights(p1, {1: 6, 2: 12, 3: 12, 4: 8, 5: 14, 6: 38, 7: 22, 8: 8, 9: 24, 10: 13, 11: 12,
             12: 20, 13: 14, 14: 6, 15: 20, 16: 34, 17: 14, 18: 26, 19: 8, 20: 20, 21: 34,
             22: 14, 23: 26, 24: 12, 25: 20, 26: 14, 27: 6, 28: 14, 29: 19, 30: 19, 31: 19,
             32: 19, 33: 19, 34: 12, 35: 16, 36: 36, 37: 10, 38: 8, 39: 16, 40: 14, 41: 8,
             42: 52, 43: 6})
page_header(p1)
put(p1, "B5", '=UPPER(Inputs!B6)', 9, True, BLUE, h="center", merge="B5:J5")
put(p1, "B6", "Your call just works.", 30, True, h="center", merge="B6:J6")
put(p1, "B7", "Everything an executive call needs, run by a crew that has done it hundreds of times.",
    12, False, MUTED, h="center", merge="B7:J7")
for (c1, c2), row in zip((("B", "D"), ("E", "G"), ("H", "J")), (14, 15, 16)):
    put(p1, f"{c1}9", f"=Inputs!B{row}", 20, True, h="center", merge=f"{c1}9:{c2}9")
    put(p1, f"{c1}10", f"=Inputs!C{row}", 9, False, MUTED, h="center", merge=f"{c1}10:{c2}10")

put(p1, "B12", "What you’re paying for", 15, True, merge="B12:J12")
put(p1, "B13", "Four parts. Each one removes a way the call could go wrong.", 10.5, False, MUTED, merge="B13:J13")
slots = [(15, 2, 5), (15, 7, 10), (20, 2, 5), (20, 7, 10)]
for cat, (r0, c1, c2) in zip(CATEGORIES, slots):
    box(p1, r0, r0 + 3, c1, c2)
    L, R = p1.cell(row=1, column=c1).column_letter, p1.cell(row=1, column=c2).column_letter
    why, inc = CARDS[cat]
    put(p1, f"{L}{r0}", cat, 12, True, v="bottom", indent=1, merge=f"{L}{r0}:{R}{r0}")
    put(p1, f"{L}{r0+1}", why, 9.5, False, MUTED, wrap=True, v="top", indent=1, merge=f"{L}{r0+1}:{R}{r0+1}")
    put(p1, f"{L}{r0+2}", inc, 8.5, False, FAINT, indent=1, merge=f"{L}{r0+2}:{R}{r0+2}")
    put(p1, f"{L}{r0+3}", f'=SUMIF({LINES},"{cat}",{SUBS})', 14, True, fmt=MONEY, v="top", indent=1, merge=f"{L}{r0+3}:{R}{r0+3}")
    # re-apply card borders lost to merges on the left/right edge cells
    box(p1, r0, r0 + 3, c1, c2)

put(p1, "B25", "Why not just plug in a webcam?", 15, True, merge="B25:J25")
put(p1, "B26", "For a team meeting, you could. When leadership is on camera, small failures get expensive.",
    10.5, False, MUTED, merge="B26:J26")
put(p1, "B28", "DOING IT YOURSELF", 8.5, True, FAINT, merge="B28:E28")
put(p1, "G28", "WITH 368 × HELLHOUND", 8.5, True, BLUE, merge="G28:J28")
for i, (diy, us) in enumerate(COMPARE):
    row = 29 + i
    put(p1, f"B{row}", diy, 10, False, MUTED, merge=f"B{row}:E{row}")
    put(p1, f"G{row}", us, 10, True, merge=f"G{row}:J{row}")
    for col in range(2, 11):
        if col != 6:
            p1.cell(row=row, column=col).border = Border(bottom=hair)

paint(p1, range(35, 38), range(2, 11), INK)
put(p1, "B35", "YOUR INVESTMENT", 8.5, True, RED, v="bottom", indent=1, merge="B35:E35")
put(p1, "B36", f"={TOTAL}", 28, True, "FFFFFF", fmt=MONEY, indent=1, merge="B36:E36")
put(p1, "G36", "Equipment, setup, rehearsal, and a full crew on show day.", 10, False, "D4D4D4",
    wrap=True, h="right", indent=1, merge="G36:J36")
for row in range(35, 38):
    for col in range(2, 11):
        p1.cell(row=row, column=col).fill = fill(INK)

put(p1, "B39", "Next step: a 15-minute walkthrough of your room and run of show.", 11, True, h="center", merge="B39:J39")
put(p1, "B40", '=Inputs!B9&"  ·  "&Inputs!B10&"  ·  "&Inputs!B11', 9.5, False, MUTED, h="center", merge="B40:J40")

logo368 = XLImage(str(HERE / "assets" / "368em-logo.png"))
logo368.width = logo368.height = 64
p1.add_image(logo368, "B42")
logohh = XLImage(str(HERE / "assets" / "hellhound-logo.png"))
logohh.width, logohh.height = 172, 53
p1.add_image(logohh, "H42")

# ---------------------------------------------------------------- Page 2
p2 = wb.create_sheet("Page 2 · Details")
LAST2 = 42
page_grid(p2, LAST2)
heights(p2, {1: 6, 2: 12, 3: 12, 4: 14, 5: 30, 6: 16, 7: 10, 8: 18})
page_header(p2)
put(p2, "B5", "The details", 22, True, merge="B5:J5")
put(p2, "B6", '="Every item for "&Inputs!B5&", what it does, and what it costs."', 10.5, False, MUTED, merge="B6:J6")

hdrs = [("B8", "ITEM", "B8:C8", "left"), ("D8", "WHAT IT DOES", "D8:F8", "left"), ("G8", "QTY", None, "center"),
        ("H8", "DAYS", None, "center"), ("I8", "RATE", None, "right"), ("J8", "SUBTOTAL", None, "right")]
for ref, text, m, h in hdrs:
    put(p2, ref, text, 8, True, FAINT, h=h, merge=m)
for col in range(2, 11):
    p2.cell(row=8, column=col).border = Border(bottom=ink_line)

row = 9
for cat in CATEGORIES:
    paint(p2, [row], range(2, 11), TINT)
    put(p2, f"B{row}", cat, 9.5, True, merge=f"B{row}:J{row}")
    p2.row_dimensions[row].height = 18
    row += 1
    for i, rec in enumerate(RATES):
        if rec[0] != cat:
            continue
        src = FIRST_LINE + i
        put(p2, f"B{row}", f"=Inputs!B{src}", 9.5, True, wrap=True, merge=f"B{row}:C{row}")
        put(p2, f"D{row}", f"=Inputs!C{src}", 8.5, False, MUTED, wrap=True, merge=f"D{row}:F{row}")
        put(p2, f"G{row}", f"=Inputs!F{src}", 9.5, h="center")
        put(p2, f"H{row}", f"=Inputs!G{src}", 9.5, h="center")
        put(p2, f"I{row}", f"=Inputs!E{src}", 9.5, False, MUTED, h="right", fmt=MONEY)
        put(p2, f"J{row}", f'=IF(Inputs!H{src}=0,"Not included",Inputs!H{src})', 9.5, True, h="right", fmt=MONEY)
        p2.row_dimensions[row].height = 28
        for col in range(2, 11):
            p2.cell(row=row, column=col).border = Border(bottom=hair)
        row += 1
assert row == 22, row  # layout below assumes 4 headers + 9 items

put(p2, "H25", "Subtotal", 10, False, MUTED, h="right", merge="H25:I25")
put(p2, "J25", f"=SUM({SUBS})", 10, h="right", fmt=MONEY)
put(p2, "H26", '="Tax ("&TEXT(Inputs!B18,"0.0%")&")"', 10, False, MUTED, h="right", merge="H26:I26")
put(p2, "J26", "=J25*Inputs!B18", 10, h="right", fmt=MONEY)
put(p2, "H27", "Total", 12, True, h="right", merge="H27:I27")
put(p2, "J27", "=J25+J26", 12, True, h="right", fmt=MONEY)
for col in (8, 9, 10):
    p2.cell(row=27, column=col).border = Border(top=ink_line)
heights(p2, {22: 8, 23: 4, 24: 4, 25: 18, 26: 18, 27: 24, 28: 14, 29: 4, 30: 18,
             35: 10, 36: 4, 37: 20, 38: 32, 39: 10, 40: 10, 41: 14, 42: 6})

put(p2, "B30", "Always included", 12, True, merge="B30:J30")
for i, line in enumerate(ALWAYS):
    put(p2, f"B{31+i}", "✓", 10, True, BLUE, h="center")
    put(p2, f"C{31+i}", line, 10, merge=f"C{31+i}:J{31+i}")
    p2.row_dimensions[31 + i].height = 18

put(p2, "B37", "Notes", 12, True, merge="B37:J37")
put(p2, "B38", "=Inputs!B19", 10, False, MUTED, wrap=True, v="top", merge="B38:J38")
put(p2, "B41", "368 Event Management  ×  Hellhound Audio  ·  hellhoundaudio.com", 8.5, False, FAINT,
    h="center", merge="B41:J41")

# ---------------------------------------------------------------- Event Log
log = wb.create_sheet("Event Log")
log.sheet_view.showGridLines = False
for k, w in {"A": 14, "B": 24, "C": 30, "D": 22, "E": 14, "F": 14, "G": 40, "H": 40}.items():
    log.column_dimensions[k].width = w
put(log, "A1", "Event Log", 20, True)
log.row_dimensions[1].height = 30
put(log, "A2", "One row per event. Save the finished PDF in the shared Drive folder, then paste its link in the PDF column.",
    10.5, False, MUTED)
put(log, "A3", "PDF folder:", 10.5, True)
c = put(log, "B3", "Paste the Drive folder link here", 10.5, False, MUTED, italic=True, merge="B3:D3")
c.fill = fill(INPUT)
cols = ["Date", "Client", "Event", "Type", "Total", "Status", "PDF link", "Notes"]
for i, h in enumerate(cols):
    c = log.cell(row=5, column=i + 1, value=h)
    c.font = font(9, True, MUTED)
    c.border = Border(bottom=ink_line)
log.freeze_panes = "A6"
sample = ["=DATE(2026,11,12)", "Acme Corp (sample)", "Q4 Leadership Town Hall", "Executive Zoom Call", 11250,
          "Sent", "Paste PDF link", "Delete this sample row"]
for i, v in enumerate(sample):
    c = log.cell(row=6, column=i + 1, value=v)
    c.font = font(10, color=FAINT, italic=True)
for r in range(6, 306):
    log.cell(row=r, column=1).number_format = "mmm d, yyyy"
    log.cell(row=r, column=5).number_format = MONEY
    for col in range(1, 9):
        log.cell(row=r, column=col).border = Border(bottom=hair)
dv = DataValidation(type="list", formula1='"Draft,Sent,Approved,Completed,Lost"', allow_blank=True)
log.add_data_validation(dv)
dv.add("F6:F305")

for ws, last in ((p1, LAST1), (p2, LAST2)):
    w = sum(ws.column_dimensions[k].width * 7 + 5 for k in "ABCDEFGHIJK")
    h = sum(ws.row_dimensions[r].height or 15 for r in range(1, last + 1)) * 4 / 3
    assert w <= 768 and h <= 1008, f"{ws.title} is {w:.0f} x {h:.0f}px; Letter fits 768 x 1008"
    print(f"{ws.title}: {w:.0f} x {h:.0f}px of 768 x 1008")

wb.move_sheet("Page 1 · Story", offset=-2)
wb.move_sheet("Page 2 · Details", offset=-2)
wb.save(OUT)
print("wrote", OUT, [ws.title for ws in wb.worksheets])
