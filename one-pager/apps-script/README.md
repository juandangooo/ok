# Helix package quotes · Google Apps Script

## Install (once, about 2 minutes)
1. Create a blank Google Sheet (sheets.new). Name it "Helix Package Quotes".
2. Extensions › Apps Script. Delete what's there, paste all of `Code.gs`, and click Save.
3. Go back to the sheet and reload the page. A **Quotes** menu appears.
4. Quotes › **Set up sheet**. Google asks you to authorize the first time. Choose your account, then Advanced › Go to project › Allow.
   This builds three tabs: **Quote**, **Packages**, and **Log**.

## Each quote
1. **Quote** tab: pick the package from the dropdown and fill in the blue cells. Add-ons are optional.
2. Quotes › **Make one-pager**. You get a Google Doc (editable) and a PDF in the "Helix Quotes" Drive folder, plus a row on the **Log** tab with both links.

## Packages tab
One row per piece: `Package | Type | Name | Description | Price per day | Status`
- **Headline**: one per package. The page title. Use Ctrl+Enter for a line break.
- **Section**: one line on the page with its price × days. Fold costs you don't want to show (like transport) into a section's price.
- **Also**: an "Also included" bullet.
- Put **PLACEHOLDER** in Status for any price that isn't real yet. The script warns before using it.
A new package appears in the dropdown as soon as it has a Headline row.
