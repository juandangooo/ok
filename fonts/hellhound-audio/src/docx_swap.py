"""Swap font families inside a .docx.

Google Docs cannot render Hellhound Audio, but it can render a stand-in.  So the
boss writes in Docs using the stand-in, downloads the file as .docx, and this
puts the real font back before the document goes out.

    python3 src/docx_swap.py brief.docx --from Outfit --to "Hellhound Audio"

Fonts live in a .docx as plain attribute values spread over several XML parts,
so this rewrites every place one can appear and leaves everything else exactly
as it was - it is a byte-for-byte repackage apart from the names asked for.
"""

import argparse, os, re, shutil, sys, zipfile

# Parts that can name a font.  Headers, footers and footnotes each carry their
# own run properties, so a title in a header is missed if they are skipped.
FONT_PARTS = re.compile(
    r"^word/(document|styles|fontTable|settings|numbering|footnotes|endnotes"
    r"|header\d*|footer\d*|theme/theme\d*)\.xml$")

# w:rFonts attributes, <w:font w:name="...">, and the theme's <a:latin typeface="...">
ATTRS = ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia", "w:name", "typeface")


def swap_xml(xml, mapping):
    """Replace whole attribute values only, so 'Outfit' never matches inside
    'Outfitter' and a partial name cannot corrupt an unrelated font."""
    hits = 0
    for attr in ATTRS:
        for old, new in mapping.items():
            pattern = '%s="%s"' % (attr, re.escape(old))
            replacement = '%s="%s"' % (attr, new)
            xml, n = re.subn(pattern, replacement, xml)
            hits += n
    return xml, hits


def ensure_font_table(xml, names):
    """Word expects every font used to be declared in fontTable.xml."""
    added = []
    for name in names:
        if 'w:name="%s"' % name in xml:
            continue
        entry = ('<w:font w:name="%s"><w:charset w:val="00"/>'
                 '<w:family w:val="swiss"/><w:pitch w:val="variable"/></w:font>' % name)
        xml = xml.replace("</w:fonts>", entry + "</w:fonts>")
        added.append(name)
    return xml, added


def convert(src, dst, mapping, quiet=False):
    if os.path.abspath(src) == os.path.abspath(dst):
        raise SystemExit("refusing to overwrite the source file in place")
    if not zipfile.is_zipfile(src):
        raise SystemExit("%s is not a .docx (a .docx is a zip archive). If this "
                         "came from Google Docs, use File > Download > Microsoft "
                         "Word (.docx), not Plain Text or PDF." % src)
    total, touched = 0, []
    with zipfile.ZipFile(src) as zin:
        bad = zin.testzip()
        if bad:
            raise SystemExit("corrupt archive member: %s" % bad)
        names = zin.namelist()
        if "word/document.xml" not in names:
            raise SystemExit("%s is not a Word document (no word/document.xml)" % src)
        with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if FONT_PARTS.match(item.filename):
                    xml = data.decode("utf-8")
                    xml, hits = swap_xml(xml, mapping)
                    if item.filename == "word/fontTable.xml":
                        xml, added = ensure_font_table(xml, set(mapping.values()))
                        if added and not quiet:
                            print("  declared in fontTable: %s" % ", ".join(added))
                    if hits:
                        touched.append((item.filename, hits))
                        total += hits
                    data = xml.encode("utf-8")
                zout.writestr(item, data)
    if not quiet:
        for part, hits in touched:
            print("  %-28s %3d" % (part, hits))
        print("%d replacement%s -> %s" % (total, "" if total == 1 else "s", dst))
    return total


def main():
    ap = argparse.ArgumentParser(description="Swap font families inside a .docx")
    ap.add_argument("docx")
    ap.add_argument("--from", dest="src_font", action="append", required=True,
                    help="font name as it appears in Google Docs (repeatable)")
    ap.add_argument("--to", dest="dst_font", action="append", required=True,
                    help="font name to put in its place (repeatable, pairs with --from)")
    ap.add_argument("--out", help="output path (default: <name>-branded.docx)")
    a = ap.parse_args()

    if len(a.src_font) != len(a.dst_font):
        raise SystemExit("--from and --to must come in pairs")
    mapping = dict(zip(a.src_font, a.dst_font))

    out = a.out or re.sub(r"\.docx$", "", a.docx, flags=re.I) + "-branded.docx"
    n = convert(a.docx, out, mapping)
    if n == 0:
        print("warning: no matches. Check the font name is exactly as Google Docs "
              "shows it in the font box.", file=sys.stderr)


if __name__ == "__main__":
    main()
