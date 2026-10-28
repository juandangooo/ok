# Helix package quotes

`Helix-Package-Quotes.xlsx`: upload it to Google Drive and open it with Google Sheets.

- **Quote**: pick a package, then fill in the client, date, days, and tax. Two optional add-ons.
- **One-Pager**: builds itself. File › Download › PDF (Current sheet, Letter, Portrait, Fit to width, Narrow margins, no gridlines).
- **Packages**: the library. Each package has a two-line headline, up to 5 sections (one price per day each), and up to 6 "Also included" lines. Add a package by using the same name in all three tables.

Live Zoom Package prices come from Helix quote 0625, with transport folded into Audio. Every row marked PLACEHOLDER needs a real price.

Rebuild: `python3 one-pager/sales-tool/build_sales_tool.py`
