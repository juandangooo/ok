"""Build the step-by-step guide deck (opens in Google Slides).

Run:  python3 one-pager/guide/mocks.py && node one-pager/guide/capture.js && python3 one-pager/guide/build_deck.py
Out:  one-pager/guide/How-to-Make-a-Quote.pptx
"""
import json
from pathlib import Path

from lxml import etree
from PIL import Image
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Inches, Pt

HERE = Path(__file__).parent
MOCKS = HERE / "mocks"
OUT = HERE / "How-to-Make-a-Quote.pptx"
BOXES = json.loads((MOCKS / "boxes.json").read_text())

INK, MUTED, RED, BLUE, SOFT = "171717", "6B6B6B", "E8382F", "0096CF", "F5F5F7"
FONT = "Inter"
SW, SH = 13.333, 7.5
IMG_X, IMG_Y, IMG_W, IMG_H = 4.55, 0.85, 8.35, 5.9   # screenshot area on step slides
CROPS = HERE / "mocks" / "crops"
CROPS.mkdir(exist_ok=True)

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(SW), Inches(SH)


def rgb(h):
    return RGBColor.from_string(h)


def no_effects(shape):
    ref = shape._element.find(".//" + qn("a:effectRef"))
    if ref is not None:
        ref.set("idx", "0")
    etree.SubElement(shape._element.spPr, qn("a:effectLst"))


def text(slide, x, y, w, h, runs, size=20, color=INK, align="left", anchor="top", spacing=1.1):
    """runs: str, or list of paragraphs; each paragraph a str or list of (text, bold) pieces."""
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = {"top": MSO_ANCHOR.TOP, "middle": MSO_ANCHOR.MIDDLE}[anchor]
    paras = [runs] if isinstance(runs, str) else runs
    for i, para in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = {"left": PP_ALIGN.LEFT, "center": PP_ALIGN.CENTER}[align]
        p.line_spacing = spacing
        if i:
            p.space_before = Pt(size * 0.6)
        for piece, bold in ([(para, False)] if isinstance(para, str) else para):
            r = p.add_run()
            r.text = piece
            r.font.name, r.font.size, r.font.bold = FONT, Pt(size), bold
            r.font.color.rgb = rgb(color)
    return tb


def box(slide, x, y, w, h, fill=None, line=None, weight=0, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.12):
    s = slide.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    if shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        s.adjustments[0] = min(0.5, radius / min(w, h))
    if fill:
        s.fill.solid()
        s.fill.fore_color.rgb = rgb(fill)
    else:
        s.fill.background()
    if line:
        s.line.color.rgb = rgb(line)
        s.line.width = Pt(weight)
    else:
        s.line.fill.background()
    no_effects(s)
    return s


def new_slide():
    s = prs.slides.add_slide(prs.slide_layouts[6])
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = rgb("FFFFFF")
    return s


def screenshot(slide, name, crop):
    """Place a zoomed-in part of a mock (crop = x, y, w, h in mock pixels); return its placement."""
    x, y, w, h = crop
    im = Image.open(MOCKS / f"{name}.png")        # captured at 2x
    path = CROPS / f"{name}-{x}-{y}-{w}-{h}.png"
    im.crop((x * 2, y * 2, (x + w) * 2, (y + h) * 2)).save(path)
    scale = min(IMG_W / w, IMG_H / h)              # inches per mock pixel
    dw, dh = w * scale, h * scale
    slide.shapes.add_picture(str(path), Inches(IMG_X), Inches(IMG_Y), Inches(dw), Inches(dh))
    box(slide, IMG_X, IMG_Y, dw, dh, line="DADCE0", weight=0.75, radius=0.06)
    return {"crop": crop, "scale": scale, "w": dw, "h": dh}


def circle(slide, name, place, target, label=None, label_side="below", pad=10):
    x, y, w, h = BOXES[name][target]
    k, (ox, oy, _, _) = place["scale"], place["crop"]
    cx, cy = IMG_X + (x - ox - pad) * k, IMG_Y + (y - oy - pad) * k
    cw, ch = (w + 2 * pad) * k, (h + 2 * pad) * k
    box(slide, cx, cy, cw, ch, line=RED, weight=4.5, shape=MSO_SHAPE.OVAL)
    if label:
        lw = 2.7
        if label_side in ("left", "right"):
            lx = cx - lw - 0.12 if label_side == "left" else cx + cw + 0.12
            ly = cy + ch / 2 - 0.23
        else:
            lx = cx + cw / 2 - lw / 2
            ly = cy + ch + 0.08 if label_side == "below" else cy - 0.55
        lx = min(max(lx, IMG_X + 0.1), IMG_X + place["w"] - lw - 0.1)
        box(slide, lx, ly, lw, 0.46, fill=RED, radius=0.23)
        text(slide, lx, ly, lw, 0.46, [[(label, True)]], 16, "FFFFFF", "center", "middle")


FORM = (0, 180, 800, 560)      # labels and blue cells
BUTTONS = (560, 180, 760, 540)  # hints and the two buttons


def step(badge, title, lines, shot, crop, circles, size=20):
    s = new_slide()
    label = badge
    bw = 0.32 + 0.13 * len(label)
    box(s, 0.6, 0.85, bw, 0.5, fill=BLUE, radius=0.25)
    text(s, 0.6, 0.85, bw, 0.5, [[(label, True)]], 14, "FFFFFF", "center", "middle")
    text(s, 0.6, 1.6, 3.7, 1.6, [[(title, True)]], 30, spacing=1.05)
    text(s, 0.6, 3.4, 3.6, 3.9, lines, size, MUTED, spacing=1.2)
    place = screenshot(s, shot, crop)
    for c in circles:
        circle(s, shot, place, *c)
    return s


# 1 · what it is
s = new_slide()
text(s, 0.9, 0.9, 11.5, 1.0, [[("How to make a quote", True)]], 48)
text(s, 0.9, 1.95, 11.5, 0.6, "Helix package quotes  ·  368 Event Management  ×  Hellhound Audio", 18, MUTED)
cards = [("1", "Pick a package", "Live Zoom, or Live Zoom + Cocktail hour"),
         ("2", "Fill in the blue cells", "Client, date, days"),
         ("3", "Click Make PDF", "A clean one-page quote, saved in Drive")]
for i, (num, head, sub) in enumerate(cards):
    x = 0.9 + i * 3.95
    box(s, x, 3.0, 3.55, 2.9, fill=SOFT, radius=0.2)
    text(s, x + 0.4, 3.35, 2.8, 0.7, [[(num, True)]], 40, BLUE)
    text(s, x + 0.4, 4.3, 2.9, 0.9, [[(head, True)]], 22)
    text(s, x + 0.4, 5.05, 2.9, 0.7, sub, 15, MUTED)
    if i < 2:
        text(s, x + 3.58, 4.1, 0.4, 0.6, [[("→", True)]], 28, MUTED, "center")
text(s, 0.9, 6.45, 11.5, 0.5, [[("No math. No line items. ", True), ("Prices come from the Packages tab.", False)]], 16, MUTED)

# 2 · start
step("STEP 1–2", "Start a new quote.",
     [[("1  ", True), ("Click the ", False), ("Quote", True), (" tab at the bottom.", False)],
      [("2  ", True), ("Click ", False), ("Start new quote", True), (".", False)],
      "It clears the old quote and sets the next quote number."],
     "quote", (0, 180, 1320, 720),
     [("tab-quote", "1   Quote tab", "above"), ("btn-new", "2   Start new quote", "left")])

# 3 · fill in
step("STEP 3–4", "Fill it in.",
     [[("3  ", True), ("Pick the ", False), ("package", True), (" from the list.", False)],
      [("4  ", True), ("Type in the ", False), ("blue cells", True), (": client, date, days.", False)],
      "The gray words next to each cell say what goes there."],
     "quote-empty", FORM,
     [("cell-package", "3   Pick from the list", "right"), ("cell-client", None),
      ("cell-date", "4   Type in blue cells", "right")])

# 4 · make it
step("STEP 5–6", "Make the PDF.",
     [[("5  ", True), ("Click ", False), ("Make PDF", True), (". Wait a few seconds.", False)],
      [("6  ", True), ("Click ", False), ("Open PDF", True), (". Send it to the client.", False)],
      [("Need to change a word? Click ", False), ("Edit as Google Doc", True), (".", False)]],
     "done", (380, 160, 960, 560),
     [("btn-make", "5   Make PDF", "above"), ("open-pdf", "6   Open PDF", "below")])

# 5 · the result
s = new_slide()
text(s, 0.6, 0.85, 4.6, 1.2, [[("That’s it. This is the quote.", True)]], 30, spacing=1.05)
text(s, 0.6, 2.4, 4.6, 4.0,
     ["One page. Letter size. Ready to email or print.",
      [("Saved in the ", False), ("Helix Quotes", True), (" folder in Google Drive.", False)],
      [("Every quote is listed on the ", False), ("Log", True), (" tab, with links.", False)]], 20, MUTED, spacing=1.2)
pic_h = 6.4
s.shapes.add_picture(str(MOCKS / "onepager.png"), Inches(6.6), Inches(0.55), height=Inches(pic_h))
box(s, 6.6, 0.55, pic_h * 8.5 / 11, pic_h, line="DADCE0", weight=0.75, radius=0.04)

# 6 · if something's off
s = new_slide()
text(s, 0.9, 0.85, 11.5, 0.8, [[("If something’s off", True)]], 36)
fixes = [("It says “Fix these first.”", "A blue cell is empty or wrong. Fix what it lists, then click Make PDF again."),
         ("A price is wrong.", "Go to the Packages tab and change the number. Every new quote uses it."),
         ("The buttons don’t work.", "Use the Quotes menu at the top instead. The phone app has no buttons."),
         ("Only type in blue cells.", "Everything else fills itself in.")]
for i, (head, sub) in enumerate(fixes):
    y = 1.95 + i * 1.3
    box(s, 0.9, y, 11.5, 1.1, fill=SOFT, radius=0.18)
    text(s, 1.3, y + 0.2, 10.6, 0.45, [[(head, True)]], 20)
    text(s, 1.3, y + 0.62, 10.6, 0.4, sub, 15, MUTED)

prs.save(OUT)
print("wrote", OUT, len(prs.slides), "slides")
