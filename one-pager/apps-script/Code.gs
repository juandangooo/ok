/**
 * Helix package quotes — Google Apps Script for a Google Sheet.
 *
 * Install: blank Google Sheet › Extensions › Apps Script › paste this file › Save.
 * Reload the sheet, then use the "Quotes" menu:
 *   Set up sheet      builds the Quote, Packages, and Log tabs (with the Helix packages)
 *   Make one-pager    turns the Quote tab into a Google Doc + PDF in Drive, and logs both links
 */

const BRAND_LINE = '368 EVENT MANAGEMENT  ×  HELLHOUND AUDIO';
const DEFAULT_FOLDER = 'Helix Quotes';
const FONT = 'Inter';
const C = { ink: '#171717', muted: '#6b6b6b', faint: '#a3a3a3', blue: '#0096cf', red: '#e8382f', input: '#eaf4fa' };

// Quote tab: label in column A, value in column B
const FIELDS = {
  package: 2, client: 3, eventDate: 4, days: 5, quoteNumber: 6, issued: 7,
  validUntil: 8, taxRate: 9, contactName: 10, contactEmail: 11, contactPhone: 12, folder: 13,
};
const ADDON_FIRST_ROW = 17;
const ADDON_ROWS = 5;

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Quotes')
    .addItem('Make one-pager', 'makeOnePager')
    .addSeparator()
    .addItem('Set up sheet', 'setupSheet')
    .addToUi();
}

// ---------------------------------------------------------------- make the one-pager

function makeOnePager() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActive();
  const q = readQuote_(ss.getSheetByName('Quote'));
  const pkg = readPackage_(ss.getSheetByName('Packages'), q.package);

  if (!pkg.sections.length) {
    ui.alert(`No sections found for "${q.package}" on the Packages tab.`);
    return;
  }
  if (pkg.placeholders.length) {
    const ok = ui.alert('Placeholder prices',
      `${q.package} still has placeholder prices for: ${pkg.placeholders.join(', ')}.\n\nMake the PDF anyway?`,
      ui.ButtonSet.YES_NO);
    if (ok !== ui.Button.YES) return;
  }

  const lines = pkg.sections
    .map(s => ({ name: s.name, desc: s.desc, price: s.price * q.days }))
    .concat(q.addons);
  const subtotal = lines.reduce((sum, l) => sum + l.price, 0);
  const total = subtotal * (1 + q.taxRate);

  const title = `${q.client} - ${q.package} - Quote ${q.quoteNumber}`;
  const doc = DocumentApp.create(title);
  buildDoc_(doc, q, pkg, lines, total);
  doc.saveAndClose();

  const folder = getFolder_(q.folder);
  const docFile = DriveApp.getFileById(doc.getId());
  docFile.moveTo(folder);
  const pdf = folder.createFile(docFile.getAs(MimeType.PDF)).setName(title + '.pdf');

  ss.getSheetByName('Log').appendRow([
    new Date(), q.client, q.package, q.eventDate, total, docFile.getUrl(), pdf.getUrl(),
  ]);

  const html = HtmlService.createHtmlOutput(
    `<div style="font-family:Arial;font-size:13px;line-height:1.6">
       <b>${escape_(title)}</b><br>Total ${money_(total)}<br><br>
       <a href="${pdf.getUrl()}" target="_blank">Open PDF</a> &nbsp;·&nbsp;
       <a href="${docFile.getUrl()}" target="_blank">Edit as Google Doc</a></div>`)
    .setWidth(360).setHeight(130);
  ui.showModalDialog(html, 'One-pager ready');
}

function readQuote_(sheet) {
  const v = row => sheet.getRange(row, 2).getValue();
  const addons = sheet.getRange(ADDON_FIRST_ROW, 1, ADDON_ROWS, 3).getValues()
    .filter(r => String(r[0]).trim())
    .map(r => ({ name: String(r[0]).trim(), desc: String(r[1]).trim(), price: Number(r[2]) || 0 }));
  return {
    package: String(v(FIELDS.package)).trim(),
    client: String(v(FIELDS.client)).trim(),
    eventDate: v(FIELDS.eventDate),
    days: Number(v(FIELDS.days)) || 1,
    quoteNumber: String(v(FIELDS.quoteNumber)).trim(),
    issued: v(FIELDS.issued),
    validUntil: v(FIELDS.validUntil),
    taxRate: Number(v(FIELDS.taxRate)) || 0,
    contact: [v(FIELDS.contactName), v(FIELDS.contactEmail), v(FIELDS.contactPhone)]
      .map(x => String(x).trim()).filter(Boolean),
    folder: String(v(FIELDS.folder)).trim(),
    addons,
  };
}

// Packages tab columns: Package | Type (Headline / Section / Also) | Name | Description | Price per day | Status
function readPackage_(sheet, name) {
  const rows = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 6).getValues()
    .filter(r => String(r[0]).trim() === name);
  const of = type => rows.filter(r => String(r[1]).trim().toLowerCase() === type);
  const headline = of('headline').map(r => String(r[2]))[0] || name;
  const sections = of('section').map(r => ({
    name: String(r[2]).trim(), desc: String(r[3]).trim(), price: Number(r[4]) || 0,
    placeholder: /placeholder/i.test(String(r[5])),
  }));
  return {
    headline,
    sections,
    also: of('also').map(r => String(r[2]).trim()).filter(Boolean),
    placeholders: sections.filter(s => s.placeholder).map(s => s.name),
  };
}

// ---------------------------------------------------------------- the page

function buildDoc_(doc, q, pkg, lines, total) {
  const body = doc.getBody();
  body.setPageWidth(612).setPageHeight(792)          // Letter
    .setMarginTop(43).setMarginBottom(40).setMarginLeft(50).setMarginRight(50);
  const width = 612 - 100;

  // header: brand left, client + quote right
  const head = body.appendTable([[BRAND_LINE, `Prepared for ${q.client}  ·  Quote ${q.quoteNumber}`]]);
  plainTable_(head, [width * 0.55, width * 0.45]);
  style_(cellPara_(head, 0, 0), { size: 7.5, bold: true, color: C.muted });
  style_(cellPara_(head, 0, 1), { size: 7.5, color: C.muted, align: 'right' });

  para_(body, `${q.client}  ·  ${fmtDate_(q.eventDate, 'MMMM d, yyyy')}`.toUpperCase(),
    { size: 8.5, bold: true, color: C.blue, before: 10 });
  const headLines = pkg.headline.split(/\r?\n/);
  headLines.forEach((line, i) => para_(body, line, {
    size: 36, bold: true, lineSpacing: 1.0, before: i === 0 ? 2 : 0, after: i === headLines.length - 1 ? 22 : 0,
  }));

  para_(body, 'What’s in the package', { size: 14, bold: true, after: 4 });
  const items = body.appendTable(lines.map(l => [l.name, money_(l.price)]));
  plainTable_(items, [width - 110, 110]);
  lines.forEach((l, i) => {
    const left = items.getRow(i).getCell(0);
    const right = items.getRow(i).getCell(1);
    left.setPaddingTop(7).setPaddingBottom(7);
    right.setPaddingTop(7).setPaddingBottom(7).setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER);
    style_(left.getChild(0).asParagraph(), { size: 11, bold: true });
    if (l.desc) style_(left.appendParagraph(l.desc), { size: 8.5, color: C.muted, before: 1 });
    style_(right.getChild(0).asParagraph(), { size: 14, bold: true, align: 'right' });
  });

  if (pkg.also.length) {
    para_(body, 'Also included', { size: 14, bold: true, before: 18, after: 4 });
    const half = Math.ceil(pkg.also.length / 2);
    const grid = [];
    for (let i = 0; i < half; i++) {
      grid.push([`✓   ${pkg.also[i]}`, pkg.also[i + half] ? `✓   ${pkg.also[i + half]}` : '']);
    }
    const also = body.appendTable(grid);
    plainTable_(also, [width / 2, width / 2]);
    grid.forEach((_, i) => [0, 1].forEach(c => {
      const cell = also.getRow(i).getCell(c);
      cell.setPaddingTop(3).setPaddingBottom(3);
      style_(cell.getChild(0).asParagraph(), { size: 9.5 });
    }));
  }

  body.appendParagraph('').appendHorizontalRule();
  para_(body, 'TOTAL', { size: 7.5, bold: true, color: C.red, before: 6 });
  para_(body, money_(total), { size: 32, bold: true, lineSpacing: 1.0 });
  if (q.taxRate > 0) {
    para_(body, `Includes tax (${+(q.taxRate * 100).toFixed(3)}%)`, { size: 8.5, color: C.muted });
  }

  if (q.contact.length) para_(body, q.contact.join('  ·  '), { size: 9, color: C.muted, before: 16 });
  para_(body, [`Quote ${q.quoteNumber}`,
               q.issued ? `Issued ${fmtDate_(q.issued, 'MMM d, yyyy')}` : '',
               q.validUntil ? `Valid until ${fmtDate_(q.validUntil, 'MMM d, yyyy')}` : '']
    .filter(Boolean).join('  ·  '), { size: 7.5, color: C.faint, before: 8 });

  // a new doc starts with one empty paragraph; drop it, and shrink the spacer
  // paragraphs Docs adds around tables so they don't open gaps
  const first = body.getChild(0);
  if (first.getType() === DocumentApp.ElementType.PARAGRAPH && !first.asParagraph().getText()) {
    try { first.removeFromParent(); } catch (e) { /* Docs keeps it in some cases; it is shrunk below */ }
  }
  for (let i = 0; i < body.getNumChildren(); i++) {
    const el = body.getChild(i);
    if (el.getType() === DocumentApp.ElementType.PARAGRAPH && !el.asParagraph().getText()) {
      style_(el.asParagraph(), { size: 2, before: 0, after: 0, lineSpacing: 1.0 });
    }
  }
}

function para_(body, text, s) {
  return style_(body.appendParagraph(text), s);
}

function cellPara_(table, r, c) {
  return table.getRow(r).getCell(c).getChild(0).asParagraph();
}

function style_(p, s) {
  const A = DocumentApp.Attribute;
  const attrs = {};
  attrs[A.FONT_FAMILY] = FONT;
  attrs[A.FONT_SIZE] = s.size || 10;
  attrs[A.BOLD] = !!s.bold;
  attrs[A.FOREGROUND_COLOR] = s.color || C.ink;
  attrs[A.SPACING_BEFORE] = s.before || 0;
  attrs[A.SPACING_AFTER] = s.after || 0;
  attrs[A.LINE_SPACING] = s.lineSpacing || 1.15;
  p.setAttributes(attrs);
  p.setAlignment(s.align === 'right' ? DocumentApp.HorizontalAlignment.RIGHT : DocumentApp.HorizontalAlignment.LEFT);
  return p;
}

function plainTable_(table, widths) {
  table.setBorderWidth(0).setBorderColor('#ffffff');
  widths.forEach((w, i) => table.setColumnWidth(i, w));
  for (let r = 0; r < table.getNumRows(); r++) {
    const row = table.getRow(r);
    for (let c = 0; c < row.getNumCells(); c++) {
      row.getCell(c).setPaddingLeft(0).setPaddingRight(0).setPaddingTop(0).setPaddingBottom(0);
    }
  }
}

// ---------------------------------------------------------------- helpers

function getFolder_(value) {
  const id = (value.match(/[-\w]{25,}/) || [])[0];
  if (id) return DriveApp.getFolderById(id);
  const found = DriveApp.getFoldersByName(DEFAULT_FOLDER);
  return found.hasNext() ? found.next() : DriveApp.createFolder(DEFAULT_FOLDER);
}

function money_(n) {
  const whole = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '-$' + whole.replace('-', '') : '$' + whole);
}

function fmtDate_(d, pattern) {
  if (!(d instanceof Date)) return String(d || '');
  return Utilities.formatDate(d, Session.getScriptTimeZone(), pattern);
}

function escape_(s) {
  return String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

// ---------------------------------------------------------------- set up the sheet

function setupSheet() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActive();
  if (ss.getSheetByName('Quote') || ss.getSheetByName('Packages')) {
    const ok = ui.alert('Set up sheet', 'This replaces the Quote and Packages tabs. The Log tab is kept. Continue?',
      ui.ButtonSet.YES_NO);
    if (ok !== ui.Button.YES) return;
  }
  setupPackages_(ss);
  setupQuote_(ss);
  setupLog_(ss);
  const blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0) ss.deleteSheet(blank);
  ss.setActiveSheet(ss.getSheetByName('Quote'));
}

function freshSheet_(ss, name, index) {
  const old = ss.getSheetByName(name);
  if (old) ss.deleteSheet(old);
  return ss.insertSheet(name, index);
}

function setupQuote_(ss) {
  const sh = freshSheet_(ss, 'Quote', 0);
  sh.setHiddenGridlines(true);
  sh.setColumnWidth(1, 170).setColumnWidth(2, 300).setColumnWidth(3, 340);
  sh.getRange('A1').setValue('Quote').setFontSize(18).setFontWeight('bold');
  const rows = [
    ['Package', 'Live Zoom Package'],
    ['Client', 'Helix'],
    ['Event date', new Date(2026, 9, 22)],
    ['Days', 1],
    ['Quote number', '0625'],
    ['Issued', new Date(2026, 9, 28)],
    ['Valid until', '=B7+30'],
    ['Tax rate', 0],
    ['Contact name', 'Rick'],
    ['Contact email', 'Rick@368eventmanagement.com'],
    ['Contact phone', '(201) 893-5224'],
    ['Drive folder (optional)', ''],
  ];
  sh.getRange(2, 1, rows.length, 2).setValues(rows);
  sh.getRange(2, 1, rows.length, 1).setFontColor(C.muted);
  sh.getRange(2, 2, rows.length, 1).setBackground(C.input);
  sh.getRange('B4').setNumberFormat('mmmm d, yyyy');
  sh.getRange('B7:B8').setNumberFormat('mmm d, yyyy');
  sh.getRange('B9').setNumberFormat('0.000%');
  sh.getRange('C13').setValue('Paste a Drive folder link, or leave blank to use "' + DEFAULT_FOLDER + '".')
    .setFontColor(C.faint);
  sh.getRange('B2').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInRange(ss.getSheetByName('Packages').getRange('H2:H'), true).build());

  sh.getRange(ADDON_FIRST_ROW - 2, 1).setValue('Add-ons (optional, flat price)').setFontWeight('bold');
  sh.getRange(ADDON_FIRST_ROW - 1, 1, 1, 3).setValues([['Name', 'Description', 'Price']])
    .setFontColor(C.muted).setFontWeight('bold');
  sh.getRange(ADDON_FIRST_ROW, 1, ADDON_ROWS, 3).setBackground(C.input);
  sh.getRange(ADDON_FIRST_ROW, 3, ADDON_ROWS, 1).setNumberFormat('$#,##0');
  sh.getRange(1, 1, sh.getMaxRows(), 3).setFontFamily(FONT);
}

function setupPackages_(ss) {
  const sh = freshSheet_(ss, 'Packages', 1);
  sh.setHiddenGridlines(true);
  const P = 'PLACEHOLDER';
  const rows = [
    ['Package', 'Type', 'Name', 'Description', 'Price per day', 'Status'],
    // Live Zoom numbers are from Helix quote 0625, with transport folded into Audio
    ['Live Zoom Package', 'Headline', 'Your Zoom\nCall Package', '', '', ''],
    ['Live Zoom Package', 'Section', 'Crew', 'Senior audio technician (A1), video technician (V1)', 1200, 'Quote 0625'],
    ['Live Zoom Package', 'Section', 'Video', 'BirdDog X5 Ultra PTZ camera, Roland V-02HD MK II mixer, MacBook Air M2', 850, 'Quote 0625'],
    ['Live Zoom Package', 'Section', 'Audio', 'Focusrite Scarlett 2i2, Radial direct boxes, iPad', 600, 'Quote 0625, includes transport'],
    ['Live Zoom Package', 'Also', 'Joystick camera controller', '', '', ''],
    ['Live Zoom Package', 'Also', 'SDI and HDMI cable package', '', '', ''],
    ['Live Zoom Package', 'Also', 'Remote pan, tilt, and zoom', '', '', ''],
    ['Live Zoom Package', 'Also', '4K camera monitor for the technician', '', '', ''],
    ['Live Zoom Package', 'Also', 'PoE+ network switch', '', '', ''],
    ['Live Zoom Package', 'Also', 'Camera tripods', '', '', ''],
    ['Cocktail Hour Sound', 'Headline', 'Your Cocktail\nHour Sound', '', '', ''],
    ['Cocktail Hour Sound', 'Section', 'Crew', 'Audio engineer (A1), on site for the event', 600, P],
    ['Cocktail Hour Sound', 'Section', 'Sound system', 'PA speakers, digital mixer, wireless mics', 750, P],
    ['Cocktail Hour Sound', 'Section', 'Band setup', 'Stage mics, monitors, and direct boxes for the band', 400, P],
    ['Cocktail Hour Sound', 'Also', 'Background music playback', '', '', ''],
    ['Cocktail Hour Sound', 'Also', 'Speeches and toasts mic', '', '', ''],
    ['Cocktail Hour Sound', 'Also', 'All cabling and stands', '', '', ''],
    ['Room Rental', 'Headline', 'Your Room\nat Helix', '', '', ''],
    ['Room Rental', 'Section', 'Room', 'Event space at Helix, 20 French St, New Brunswick', 5000, P],
    ['Room Rental', 'Section', 'Presentation AV', 'Display, presentation audio, wireless mics', 900, P],
    ['Room Rental', 'Section', 'Crew', 'On-site technician for the event', 600, P],
    ['Room Rental', 'Also', 'Tables and chairs', '', '', ''],
    ['Room Rental', 'Also', 'Wi-Fi', '', '', ''],
    ['Room Rental', 'Also', 'Setup and breakdown', '', '', ''],
  ];
  sh.getRange(1, 1, rows.length, 6).setValues(rows);
  sh.getRange(1, 1, 1, 6).setFontWeight('bold').setFontColor(C.muted);
  sh.getRange(2, 1, rows.length - 1, 5).setBackground(C.input);
  sh.getRange(2, 5, 200, 1).setNumberFormat('$#,##0');
  sh.getRange(2, 3, rows.length - 1, 1).setWrap(true);
  [180, 90, 220, 430, 100, 200].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.setFrozenRows(1);

  // package dropdown source (one name per Headline row), used by the Quote tab
  sh.getRange('H1').setValue('Package list').setFontWeight('bold').setFontColor(C.muted);
  sh.getRange('H2').setFormula('=UNIQUE(FILTER(A2:A, B2:B="Headline"))');
  sh.setColumnWidth(8, 180);

  const placeholder = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=REGEXMATCH($F2, "(?i)placeholder")')
    .setBackground('#fdecea').setFontColor(C.red)
    .setRanges([sh.getRange('A2:F')]).build();
  sh.setConditionalFormatRules([placeholder]);
  sh.getRange(1, 1, sh.getMaxRows(), 8).setFontFamily(FONT).setVerticalAlignment('middle');
  sh.getRange('J1').setValue('Types: Headline (one per package, Ctrl+Enter for a line break) · Section (shows with its price × days) · Also (bullet). Rows marked PLACEHOLDER trigger a warning.')
    .setFontColor(C.faint);
}

function setupLog_(ss) {
  let sh = ss.getSheetByName('Log');
  if (sh) return;
  sh = ss.insertSheet('Log');
  sh.getRange(1, 1, 1, 7).setValues([['Created', 'Client', 'Package', 'Event date', 'Total', 'Google Doc', 'PDF']])
    .setFontWeight('bold').setFontColor(C.muted);
  sh.setFrozenRows(1);
  sh.getRange('A2:A').setNumberFormat('mmm d, yyyy h:mm am/pm');
  sh.getRange('D2:D').setNumberFormat('mmm d, yyyy');
  sh.getRange('E2:E').setNumberFormat('$#,##0');
  [150, 160, 170, 110, 90, 260, 260].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.getRange(1, 1, sh.getMaxRows(), 7).setFontFamily(FONT);
}
