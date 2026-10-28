# 368 × Hellhound · Client One-Pager

**`368-Hellhound-OnePager-Layout.pptx`**: the designed two-page layout (Letter, 8.5 × 11). Rounded cards with a faint shadow, in Inter. Open it in Canva (Create a design › Upload › choose the file) or Google Slides. Every box and line is editable.

**`368-Hellhound-OnePager.xlsx`**: the calculator and record. Open it with Google Sheets.
- **Rates**: master prices (placeholders)
- **Inputs**: per-client quantities and details
- **Event Log**: one row per sent PDF
- **Page 1 / Page 2**: a plain printable fallback

Each client: fill in Inputs, copy the totals into the layout, export a PDF, and log it.

Rebuild: `python3 one-pager/build_layout.py` (layout) · `python3 one-pager/build_onepager.py` (sheet)
