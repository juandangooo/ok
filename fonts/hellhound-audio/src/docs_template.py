"""Build a Google Docs starter template as a .docx.

Google Docs will not install Hellhound Audio, but it converts an uploaded .docx
faithfully.  So the letterhead ships as a .docx carrying the wordmark as an
image and the body set in the stand-in: drop it in Drive, open it with Google
Docs, and the boss has a branded document he can type into.

    python3 src/docs_template.py --out docs-kit/hellhound-letterhead.docx
"""

import argparse, os, zipfile
from PIL import Image

EMU_PER_INCH = 914400
NS = ('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
      'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
      'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"')

STANDIN = "Outfit"          # the closest Google Font; see GOOGLE-DOCS.md
BODY = "Roboto"


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def para(text, font, half_pt, bold=False, after=160, align=None):
    rpr = ('<w:rFonts w:ascii="%s" w:hAnsi="%s" w:cs="%s"/>%s<w:sz w:val="%d"/>'
           '<w:szCs w:val="%d"/>' % (font, font, font, "<w:b/>" if bold else "",
                                     half_pt, half_pt))
    jc = '<w:jc w:val="%s"/>' % align if align else ""
    return ('<w:p><w:pPr>%s<w:spacing w:after="%d"/><w:rPr>%s</w:rPr></w:pPr>'
            '<w:r><w:rPr>%s</w:rPr><w:t xml:space="preserve">%s</w:t></w:r></w:p>'
            % (jc, after, rpr, rpr, esc(text)))


def image_para(cx, cy, rel_id="rId7"):
    return ('<w:p><w:pPr><w:spacing w:after="240"/></w:pPr><w:r><w:drawing>'
            '<wp:inline distT="0" distB="0" distL="0" distR="0">'
            '<wp:extent cx="%d" cy="%d"/>'
            '<wp:effectExtent l="0" t="0" r="0" b="0"/>'
            '<wp:docPr id="1" name="Wordmark" descr="Hellhound Audio"/>'
            '<wp:cNvGraphicFramePr/>'
            '<a:graphic><a:graphicData '
            'uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            '<pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="wordmark.png"/>'
            '<pic:cNvPicPr/></pic:nvPicPr>'
            '<pic:blipFill><a:blip r:embed="%s"/><a:stretch><a:fillRect/></a:stretch>'
            '</pic:blipFill>'
            '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="%d" cy="%d"/></a:xfrm>'
            '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
            '</pic:pic></a:graphicData></a:graphic></wp:inline>'
            '</w:drawing></w:r></w:p>' % (cx, cy, rel_id, cx, cy))


def build(out, wordmark_png, width_inches=6.0):
    with Image.open(wordmark_png) as im:
        iw, ih = im.size
    cx = int(width_inches * EMU_PER_INCH)
    cy = int(cx * ih / iw)

    body = (
        image_para(cx, cy)
        + para("Project brief", STANDIN, 36, bold=True, after=80)
        + para("Prepared by Hellhound Audio", STANDIN, 22, after=320)
        + para("Replace this with your own text. The heading styles above are set "
               "in Outfit, the closest thing in the Google Fonts library to the "
               "studio face.", BODY, 22)
        + para("The wordmark at the top is an image, so it is the real lettering "
               "rather than a substitute. Resize it by dragging a corner; do not "
               "stretch one side alone.", BODY, 22)
        + para("When the document is finished, download it as .docx and run "
               "docx_swap.py over it to put the real font back before it goes "
               "out or gets printed.", BODY, 22, after=400)
        + para("hellhoundaudio.com", STANDIN, 20, after=0)
        + '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>'
          '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>')

    parts = {
        "[Content_Types].xml":
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Default Extension="png" ContentType="image/png"/>'
            '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
            '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
            '<Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>'
            '</Types>',
        "_rels/.rels":
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
            '</Relationships>',
        "word/_rels/document.xml.rels":
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>'
            '<Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/wordmark.png"/>'
            '</Relationships>',
        "word/document.xml":
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:document %s><w:body>%s</w:body></w:document>' % (NS, body),
        "word/styles.xml":
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:styles %s><w:docDefaults><w:rPrDefault><w:rPr>'
            '<w:rFonts w:ascii="%s" w:hAnsi="%s" w:eastAsia="%s" w:cs="%s"/>'
            '<w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>'
            '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">'
            '<w:name w:val="Normal"/></w:style></w:styles>'
            % (NS, BODY, BODY, BODY, BODY),
        "word/fontTable.xml":
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:fonts %s>'
            '<w:font w:name="%s"><w:charset w:val="00"/><w:family w:val="swiss"/>'
            '<w:pitch w:val="variable"/></w:font>'
            '<w:font w:name="%s"><w:charset w:val="00"/><w:family w:val="swiss"/>'
            '<w:pitch w:val="variable"/></w:font>'
            '</w:fonts>' % (NS, STANDIN, BODY),
    }

    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for name, xml in parts.items():
            z.writestr(name, xml)
        z.write(wordmark_png, "word/media/wordmark.png")
    return out, cx / EMU_PER_INCH, cy / EMU_PER_INCH


def main():
    ap = argparse.ArgumentParser(description="Build the Google Docs starter template")
    ap.add_argument("--out", default="docs-kit/hellhound-letterhead.docx")
    ap.add_argument("--wordmark", default="docs-kit/wordmark.png")
    ap.add_argument("--width", type=float, default=6.0, help="wordmark width in inches")
    a = ap.parse_args()
    path, w, h = build(a.out, a.wordmark, a.width)
    print("%s  (wordmark %.2f x %.2f in)" % (path, w, h))


if __name__ == "__main__":
    main()
