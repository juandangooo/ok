# Helix package quotes · Google Sheet + script

## Share it so it just works (do this once, as the owner)
Script buttons inside a shared sheet make **every** person approve the script, and some work accounts block it.
The fix is a **web app that runs as you**: everyone opens one link, fills in a form, and clicks Make PDF or RICKafy.
Nobody else installs or approves anything.

1. In the sheet: **Extensions › Apps Script**. Replace everything with the new `Code.gs`, then click **Save**.
2. Top right: **Deploy › New deployment**. Click the gear › **Web app**.
   - Description: Quote maker
   - **Execute as: Me**
   - **Who has access: Anyone with a Google account** (or **Anyone**, if people outside Google get stuck)
3. Click **Deploy** and approve it once (Advanced › Go to project › Allow). That's the only approval, ever.
4. Back in the sheet: **Quotes › Share the quote maker**. It puts the link on the Quote tab and shows it to you.
5. Send that link to the team. Bookmark it. Done.

Rick still edits packages and prices on the **Packages** tab. Every quote still lands in the **Helix Quotes** folder and the **Log** tab (in your Drive).

**After changing the script later:** Deploy › Manage deployments › pencil › Version: **New version** › Deploy. The link stays the same.
`web.html` is the page. Run `python3 one-pager/apps-script/embed_web.py` after editing it, to copy it into `Code.gs`.

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

## RICKafy (price breakdown)
The blue **RICKafy** button makes the plain itemized quote: every line item with qty, price, days, and total, grouped (Crew, Video, Audio, Transport) with subtotals, a grand total, and a signature line. Same Drive folder, same Log.

**Updating an existing sheet:** in Extensions › Apps Script, replace everything with the new `Code.gs` and click Save. Then reload the sheet. The RICKafy button adds itself. Then run **Quotes › Load Live Zoom line items** once. This adds the 15 real line items from Helix quote 0625 to each "Live Zoom…" package.

Line items are **Item** rows on the Packages tab: `Package | Item | item name | category | price per day | status | qty`.
Transport and add-ons are charged once; everything else is × Days. A Section with no matching Item category (like the Cocktail Hour Mic Package) shows as its own line.

## Changing packages or prices (Rick)
**Packages** tab, one row per piece: `Package | Type | Name | Description | Price per day | Status`
- **Headline**: the page title, one per package. Ctrl+Enter makes a line break.
- **Section**: a line on the page with its price. Price × Days. Hide costs (like transport) inside a section's price.
- **Also**: an "Also included" bullet.
- Type **PLACEHOLDER** in Status if a price isn't real yet. The script warns before using it.
New packages appear in the dropdown automatically.
