# Shopping Requests

Anyone who needs something for the shop fills out a Google Form. Each item they ask for
shows up as its own row in the **Hellhound Shopping Requests** spreadsheet, with a
**Got it** checkbox for Fern. Ticking the box greys out and strikes through the row and
records the date. Rows marked "ASAP - blocking work" are highlighted red.

## Install (about 2 minutes, one time)

1. Go to script.google.com and click **New project**. Name it "Shopping Requests".
2. Delete the placeholder code, paste in everything from `Code.gs`, and save.
3. Choose `setup` in the function dropdown, click **Run**, and approve the permissions.
4. Open **Execution log**. It shows the form link, Fern's list link, and the list's file ID.
5. Optional: run `importPaperLists` once to copy the handwritten lists from 8/3/26
   (Fern's repair bench list and the laptop case lists) into the list.

## Add it to the hub

Under **07 PURCHASING**, add a row in the same format as the others:

| Column | Value |
|---|---|
| B | `3. Shopping Requests` |
| C | `What people need bought. Tick Got it when done.` |
| G | the list file ID from the execution log |
| H | `Hellhound Shopping Requests` |
| I | `Purchasing & ideas` |

Then put the **form link** wherever the crew will see it (the same row, a pinned
message, a QR code on the repair bench).

Google also adds a "Form Responses 1" tab that holds the raw answers. Leave it there.
Fern only needs the **Shopping List** tab.

## Writing items in the form

Write one item per line. Put the quantity first if you need more than one:

```
(2) IEC connectors
(1) powerCON connector, white
USB-C to 1/8
```
