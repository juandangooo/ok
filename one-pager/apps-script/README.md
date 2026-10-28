# Helix package quotes · Google Sheet + script

## One-time install (whoever sets it up)
1. Go to **sheets.new** to create a blank Google Sheet. Name it **Helix Package Quotes**.
2. **Extensions › Apps Script.** Delete everything in the editor, paste all of `Code.gs`, and click **Save**.
3. Go back to the sheet tab and **reload the page**. A **Quotes** menu appears at the top.
4. **Quotes › Set up sheet.** Google asks for permission once: pick your account › **Advanced** › **Go to project** › **Allow**. That's normal for a script you own.
5. Share the sheet with the sales team (Share › add their emails as **Editors**).

## Making a quote (sales team)
1. Open the **Quote** tab. Click **Start new quote**.
2. Fill in the **blue cells**. Pick the package from the dropdown. The hint next to each cell says what goes there.
3. Click **Make PDF**. A window opens with **Open PDF** and **Edit as Google Doc**.
   Both files are saved in the **Helix Quotes** folder in Drive, and the **Log** tab gets a new row.

If something's missing, the script tells you what to fix. It won't make a broken PDF.
The buttons work in a web browser. In the phone app, use the **Quotes** menu instead.

## Changing packages or prices (Rick)
**Packages** tab, one row per piece: `Package | Type | Name | Description | Price per day | Status`
- **Headline**: the page title, one per package. Ctrl+Enter makes a line break.
- **Section**: a line on the page with its price. Price × Days. Hide costs (like transport) inside a section's price.
- **Also**: an "Also included" bullet.
- Type **PLACEHOLDER** in Status if a price isn't real yet. The script warns before using it.
New packages appear in the dropdown automatically.
