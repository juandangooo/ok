"""Render a quote JSON into a two-page Letter PDF (and the HTML behind it).

Run:  python3 one-pager/quote/render.py one-pager/quote/helix-2026-10-22.json
Out:  same name, .html and .pdf
"""
import html
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
src = Path(sys.argv[1])
q = json.loads(src.read_text())
e = html.escape


def money(n, cents=False):
    return f"${n:,.2f}" if cents else f"${n:,.0f}"


for g in q["groups"]:
    g["total"] = sum(qty * days * rate for _, _, qty, days, rate in g["items"])
rental = sum(g["total"] for g in q["groups"] if g["kind"] == "rental")
service = sum(g["total"] for g in q["groups"] if g["kind"] == "service")
subtotal = rental + service
tax = subtotal * q["tax"]
total = subtotal + tax
gear_value = q["replacement_value"]

# ---------------------------------------------------------------- page 1
facts = [
    ("When", q["event_date"], q["event_time"]),
    ("Where", q["location"][0], q["location"][1]),
    ("Quote", f"No. {q['quote_number']}", f"Valid until {q['valid_until']}"),
]
fact_html = "".join(
    f'<div class="card fact"><div class="label">{e(a)}</div><div class="v">{e(b)}</div><div class="sub">{e(c)}</div></div>'
    for a, b, c in facts)

shades = ["#1d1d1f", "#515154", "#86868b", "#c7c7cc"]
bar = "".join(f'<span style="flex:{g["total"]};background:{c}"></span>'
              for g, c in zip(q["groups"], shades))
split_html = "".join(
    f'''<div class="split"><div class="row"><span class="dot" style="background:{c}"></span>{e(g["name"])}</div>
          <div class="samt">{money(g["total"])}</div></div>'''
    for g, c in zip(q["groups"], shades))
spot_html = "".join(
    f'''<div class="card spot"><div class="label">{e(tag)}</div><div class="sname">{e(name)}</div>
          <div class="sub">{e(line)}</div></div>'''
    for tag, name, line in q["spotlight"])

page1 = f'''
<section class="page">
  <header><span>368 Event Management · Hellhound Audio</span><span>Quote {e(q["quote_number"])} · {e(q["quote_date"])}</span></header>
  <div class="kicker">{e(q["title"])}</div>
  <h1>{money(total)}, all in.</h1>
  <p class="lede">{e(q["summary"])}</p>

  <div class="facts">{fact_html}</div>

  <div class="card value">
    <div><div class="label">Equipment on site</div><div class="big">{money(gear_value)}</div></div>
    <div class="arrow">→</div>
    <div><div class="label">Rental for the day</div><div class="big">{money(rental)}</div></div>
    <div class="note">Rented, delivered, and run by our crew. Nothing to buy or maintain.</div>
  </div>

  <h2>What’s on site</h2>
  <div class="spots">{spot_html}</div>

  <h2>Where it goes</h2>
  <div class="bar">{bar}</div>
  <div class="splits">{split_html}</div>
</section>'''

# ---------------------------------------------------------------- page 2
rows = []
for g in q["groups"]:
    rows.append(f'<tr class="ghead"><td colspan="4">{e(g["name"])}</td><td class="num">{money(g["total"], True)}</td></tr>')
    for name, what, qty, days, rate in g["items"]:
        rows.append(f'''<tr><td><div class="iname">{e(name)}</div><div class="what">{e(what)}</div></td>
          <td class="num c">{qty}</td><td class="num c">{days:g}</td><td class="num m">{money(rate, True)}</td>
          <td class="num b">{money(qty * days * rate, True)}</td></tr>''')

totals = [("Equipment rental", rental), ("Crew and transport", service), ("Subtotal", subtotal),
          ("Tax", tax)]
totals_html = "".join(f'<div class="trow"><span>{a}</span><span>{money(b, True)}</span></div>' for a, b in totals)
contacts_html = "".join(
    f'<div><div class="cname">{e(a)}</div><div>{e(b)}</div><div>{e(c)}</div></div>' for a, b, c in q["contacts"])

page2 = f'''
<section class="page">
  <header><span>368 Event Management · Hellhound Audio</span><span>Quote {e(q["quote_number"])} · {e(q["quote_date"])}</span></header>
  <h2 class="top">Every line item</h2>
  <div class="card table">
    <table>
      <thead><tr><th>Item</th><th class="c">Qty</th><th class="c">Days</th><th class="num">Price</th><th class="num">Total</th></tr></thead>
      <tbody>{"".join(rows)}</tbody>
    </table>
  </div>

  <div class="bottom">
    <div class="card sign">
      <div class="label">Accept this quote</div>
      <div class="lines"><div>Signature</div><div>Printed name</div><div>Date</div></div>
      <div class="sub">By signing, you accept the terms and conditions of rental.</div>
    </div>
    <div class="card totals">
      {totals_html}
      <div class="trow grand"><span>Total</span><span>{money(total, True)}</span></div>
    </div>
  </div>

  <footer>{contacts_html}</footer>
</section>'''

css = (HERE / "style.css").read_text()
out_html = src.with_suffix(".html")
out_html.write_text(f'''<!doctype html><html><head><meta charset="utf-8">
<title>{e(q["title"])} · Quote {e(q["quote_number"])}</title><style>{css}</style></head>
<body>{page1}{page2}</body></html>''')

out_pdf = src.with_suffix(".pdf")
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
print("wrote", out_html, out_pdf, f"total {money(total, True)}")
