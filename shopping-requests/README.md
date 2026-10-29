# Shopping Requests

Anyone who needs something for the shop fills out a Google Form. Each item they ask for
shows up as its own row in a **Shopping List** tab in the hub spreadsheet, with a
**Got it** checkbox for Fern. Ticking the box greys out and strikes through the row and
records the date. Rows marked "ASAP - blocking work" are highlighted red.

## Install (about 2 minutes, one time)

1. Open the hub spreadsheet, then go to **Extensions → Apps Script**.
2. Delete the placeholder code, paste in everything from `Code.gs`, and save.
3. Choose `setup` in the function dropdown, click **Run**, and approve the permissions.
4. A popup in the sheet shows the **form link**. Put that link in the hub where people
   will see it (for example, a "Shopping Requests" button or cell).
5. Optional: run `importPaperLists` once to copy the handwritten lists from 8/3/26
   (Fern's repair bench list and the laptop case lists) into the Shopping List.

Google also adds a "Form Responses" tab to the sheet. That tab holds the raw answers.
Leave it there, but Fern only needs to look at **Shopping List**.

## Writing items in the form

Write one item per line. Put the quantity first if you need more than one:

```
(2) IEC connectors
(1) powerCON connector, white
USB-C to 1/8
```
