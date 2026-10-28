"""Render a quote JSON as a single clean Letter page.

Run:  python3 one-pager/quote/onepage.py one-pager/quote/helix-2026-10-22.json
Out:  <name>-onepage.html and <name>-onepage.pdf
"""
import html
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
src = Path(sys.argv[1])
q = json.loads(src.read_text())
o = q["onepage"]
e = html.escape


def money(n):
    return f"${n:,.0f}"


totals = {g["name"]: sum(a * b * c for _, _, a, b, c in g["items"]) for g in q["groups"]}
kinds = {g["name"]: g["kind"] for g in q["groups"]}
for src_name, dst in o.get("fold", {}).items():  # show one group's cost inside another
    totals[dst] += totals.pop(src_name)
    kinds.pop(src_name)
rental = sum(v for k, v in totals.items() if kinds[k] == "rental")
service = sum(v for k, v in totals.items() if kinds[k] == "service")
subtotal = rental + service
tax = subtotal * q["tax"]
total = subtotal + tax

rows = "".join(
    f'<div class="item"><div><div class="iname">{e(name)}</div><div class="idesc">{e(desc)}</div></div>'
    f'<div class="iamt">{money(totals[name])}</div></div>'
    for name, desc in o["included"].items())
also = "".join(f'<div class="check">✓&nbsp;&nbsp;{e(x)}</div>' for x in o["also"])
headline = "<br>".join(e(x) for x in o["headline"].split("\n"))

page = f'''<!doctype html><html><head><meta charset="utf-8">
<title>{e(q["client"])} · Quote {e(q["quote_number"])}</title><style>{(HERE / "onepage.css").read_text()}</style></head>
<body><section class="page">
  <header><span>368 EVENT MANAGEMENT  ×  HELLHOUND AUDIO</span><span>Prepared for {e(q["client"])}  ·  Quote {e(q["quote_number"])}</span></header>
  <div class="kicker">{e(o["kicker"])}</div>
  <h1>{headline}</h1>

  <h2>{e(o.get("included_title", "What’s included"))}</h2>
  <div class="list">{rows}</div>

  <h2>{e(o["also_title"])}</h2>
  <div class="checks">{also}</div>

  <div class="total">
    <div><div class="tlabel">TOTAL</div><div class="tamt">{money(total)}</div></div>
    <div class="tbreak">
      <div><span>Equipment</span><span>{money(rental)}</span></div>
      <div><span>Crew</span><span>{money(service)}</span></div>
      <div><span>Tax</span><span>{money(tax)}</span></div>
    </div>
  </div>
  <div class="contact">{e(o["contact"])}</div>
  <div class="valid">Quote {e(q["quote_number"])} · Issued {e(q["quote_date"])} · Valid until {e(q["valid_until"])}</div>
</section></body></html>'''

out_html = src.with_name(src.stem + "-onepage.html")
out_pdf = out_html.with_suffix(".pdf")
out_html.write_text(page)
subprocess.run(["node", "-e", f'''
const {{ chromium }} = require("playwright");
(async () => {{
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto("file://{out_html.resolve()}");
  await p.pdf({{ path: "{out_pdf.resolve()}", format: "Letter", printBackground: true,
                 margin: {{ top: 0, right: 0, bottom: 0, left: 0 }} }});
  await b.close();
}})();'''], check=True)
print("wrote", out_pdf, "total", money(total))
