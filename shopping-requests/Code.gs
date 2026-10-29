/**
 * Shopping Requests: a Google Form whose answers land in the hub sheet as a
 * checklist for Fern.
 *
 * Install: open the hub spreadsheet > Extensions > Apps Script, paste this
 * file in, save, then run setup() once and approve the permissions.
 * Optional: run importPaperLists() once to move the old paper lists in.
 */

const LIST_SHEET = 'Shopping List';
const HEADERS = ['Requested', 'Who', 'For', 'Qty', 'Item', 'How soon', 'Notes', 'Got it', 'Got it on'];
const GOT_IT_COL = 8;
const ASAP = 'ASAP - blocking work';

/** Run once. Creates the form, links it to this spreadsheet and builds the list tab. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getDocumentProperties();
  if (props.getProperty('formId')) {
    const existing = FormApp.openById(props.getProperty('formId'));
    showLinks_(existing, ss);
    return;
  }

  const form = FormApp.create('Shopping Requests')
    .setDescription('Need something for the shop? Put it here and it goes straight onto Fern\'s Shopping List.');
  form.addTextItem().setTitle('Your name').setRequired(true);
  form.addTextItem().setTitle('What is it for?')
    .setHelpText('e.g. Repair bench, Midnight laptop case, Perry laptop case')
    .setRequired(true);
  form.addParagraphTextItem().setTitle('Items needed')
    .setHelpText('One item per line. Put the quantity first if you need more than one, e.g.\n' +
      '(2) IEC connectors\n(1) powerCON connector, white\nUSB-C to 1/8')
    .setRequired(true);
  form.addMultipleChoiceItem().setTitle('How soon?')
    .setChoiceValues(['Whenever', 'This week', ASAP])
    .setRequired(true);
  form.addParagraphTextItem().setTitle('Notes / links')
    .setHelpText('Optional: product link, brand, color, anything Fern should know.');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  props.setProperty('formId', form.getId());

  buildListSheet_(ss);
  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  showLinks_(form, ss);
}

/** Splits each submission into one checklist row per item. */
function onFormSubmit(e) {
  const v = e.namedValues;
  const get = (k) => (v[k] && v[k][0] ? String(v[k][0]).trim() : '');
  addItems_(new Date(), get('Your name'), get('What is it for?'), get('Items needed'),
    get('How soon?'), get('Notes / links'));
}

/** Stamps the date when Fern ticks "Got it" (and clears it if unticked). */
function onEdit(e) {
  const range = e.range;
  if (range.getSheet().getName() !== LIST_SHEET || range.getColumn() !== GOT_IT_COL || range.getRow() < 2) return;
  range.offset(0, 1).setValue(range.getValue() === true ? new Date() : '');
}

/** Optional, run once: copies the handwritten lists from 8/3/26 into the Shopping List. */
function importPaperLists() {
  const when = new Date(2026, 7, 3);
  const lists = [
    ['Repair bench', '(2) IEC connectors\n(1) powerCON connector (white) for a jumper'],
    ['Midnight laptop case', '(1) Mouse\n(1) Lightning to 1/8\n(1) USB-C to 1/8'],
    ['Goldie laptop case', '(1) Lightning to 1/8\n(1) USB-C to 1/8'],
    ['Perry laptop case', '(1) Mouse\n(1) Lightning to 1/8\n(2) USB-C to 1/8\n(1) HDMI to HDMI\n' +
      '(1) HDMI to HDMI mini\n(1) Clicker\n(1) USB-C to USB-A'],
    ['No name (silver laptop) case', '(1) Clicker\n(1) USB-C to USB-A (for clicker/charger)\n(1) Mouse\n' +
      '(1) 1/8 to RCA\n(1) Lightning to 1/8\n(1) USB-C to 1/8\n(1) USB-C to USB-A (female)\n' +
      '(1) Lightning to USB-C\n(1) HDMI to HDMI\n(1) HDMI to HDMI mini\n(1) 1/8 to 1/8\n(1) USB-C to USB-A'],
    ['No name (black laptop) case', '(1) USB-C to USB-A (female)\n(1) Lightning to 1/8\n(1) USB-C to 1/8\n' +
      '(1) HDMI to HDMI mini\n(1) Clicker\n(1) USB-C to USB-A (charger)\n(1) USB-C to Lightning\n' +
      '(1) USB-C to USB-A\n(1) 1/8 to 1/8\n(1) 1/8 to RCA\n(1) HDMI to HDMI'],
  ];
  lists.forEach(([forWhat, items]) => addItems_(when, 'Paper list', forWhat, items, 'Whenever', ''));
}

function addItems_(when, who, forWhat, itemsText, howSoon, notes) {
  const rows = itemsText.split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*]\s*/, '').trim())
    .filter((line) => line)
    .map((line) => {
      const m = line.match(/^\(?(\d+)\)?\s*[x×]?\s+(.+)$/i);
      return [when, who, forWhat, m ? Number(m[1]) : 1, m ? m[2] : line, howSoon, notes, false, ''];
    });
  if (!rows.length) return;

  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LIST_SHEET) ||
      buildListSheet_(SpreadsheetApp.getActiveSpreadsheet());
    const start = sheet.getLastRow() + 1;
    sheet.getRange(start, 1, rows.length, HEADERS.length).setValues(rows);
    sheet.getRange(start, GOT_IT_COL, rows.length, 1).insertCheckboxes();
  } finally {
    lock.releaseLock();
  }
}

function buildListSheet_(ss) {
  const sheet = ss.getSheetByName(LIST_SHEET) || ss.insertSheet(LIST_SHEET, 0);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setBackground('#f1f3f4');
  sheet.setFrozenRows(1);
  sheet.getRange('A:A').setNumberFormat('m/d/yy');
  sheet.getRange('I:I').setNumberFormat('m/d/yy');
  sheet.setColumnWidth(5, 280);
  sheet.setColumnWidth(7, 220);

  const body = sheet.getRange(2, 1, sheet.getMaxRows() - 1, HEADERS.length);
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$H2=TRUE')
      .setFontColor('#9aa0a6').setStrikethrough(true)
      .setRanges([body]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$F2="' + ASAP + '"')
      .setBackground('#fce8e6')
      .setRanges([body]).build(),
  ]);
  return sheet;
}

function showLinks_(form, ss) {
  const msg = 'Form link (put this in the hub for everyone):\n' + form.getPublishedUrl() +
    '\n\nFern\'s list: ' + ss.getUrl() + '#gid=' + ss.getSheetByName(LIST_SHEET).getSheetId() +
    '\n\nEdit the form: ' + form.getEditUrl();
  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert('Shopping Requests is ready', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) {
    // No UI when run outside the spreadsheet; the links are in the execution log.
  }
}
