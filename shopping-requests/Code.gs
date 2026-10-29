/**
 * Shopping Requests: a Google Form whose answers land in their own
 * spreadsheet as a checklist for Fern. The hub links to that spreadsheet
 * under 07 PURCHASING, like every other file.
 *
 * The spreadsheet already exists in the shared drive with the 8/3/26 paper
 * lists loaded. Install: go to script.google.com > New project, paste this
 * file in, save, then run setup() once and approve the permissions.
 */

const SHEET_ID = '1oIJeO4MjFsLUZGueXf2fBXmARzGbDkXGUoGPfexMgjE'; // Hellhound Shopping Requests

const LIST_SHEET = 'Shopping List';
const HEADERS = ['Requested', 'Who', 'For', 'Qty', 'Item', 'How soon', 'Notes', 'Got it', 'Got it on'];
const GOT_IT_COL = 8;
const ASAP = 'ASAP - blocking work';

/** Run once. Creates the form, links it to the spreadsheet and formats the list tab. */
function setup() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('formId')) {
    showLinks_(FormApp.openById(props.getProperty('formId')), listSpreadsheet_());
    return;
  }

  const ss = listSpreadsheet_();
  if (!ss.getSheetByName(LIST_SHEET)) ss.getSheets()[0].setName(LIST_SHEET);

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
  ScriptApp.newTrigger('onListEdit').forSpreadsheet(ss).onEdit().create();
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
function onListEdit(e) {
  const range = e.range;
  if (range.getSheet().getName() !== LIST_SHEET || range.getColumn() !== GOT_IT_COL || range.getRow() < 2) return;
  range.offset(0, 1).setValue(range.getValue() === true ? new Date() : '');
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
    const ss = listSpreadsheet_();
    const sheet = ss.getSheetByName(LIST_SHEET) || buildListSheet_(ss);
    const start = sheet.getLastRow() + 1;
    sheet.getRange(start, 1, rows.length, HEADERS.length).setValues(rows);
    sheet.getRange(start, GOT_IT_COL, rows.length, 1).insertCheckboxes();
  } finally {
    lock.releaseLock();
  }
}

function listSpreadsheet_() {
  return SpreadsheetApp.openById(SHEET_ID);
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
  if (sheet.getLastRow() > 1) sheet.getRange(2, GOT_IT_COL, sheet.getLastRow() - 1, 1).insertCheckboxes();

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
  Logger.log('Form link (for everyone): ' + form.getPublishedUrl());
  Logger.log('Fern\'s list: ' + ss.getUrl());
  Logger.log('List file ID (for the hub row): ' + ss.getId());
  Logger.log('Edit the form: ' + form.getEditUrl());
}
