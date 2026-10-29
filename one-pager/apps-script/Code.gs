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
// The live web app link (Deploy › Manage deployments › Web app URL, ending in /exec).
// Google's own lookup can hand back the owner-only /dev test link, so the real one is kept here.
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzQXjlFwK0-Ud6KiCelcnWeCwRoWdqfDviOYqGq9FoIOcSXs_Y_Vgx65qWnlJKyC6-y/exec';
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
    .addItem('Make PDF', 'makeOnePager')
    .addItem('RICKafy (price breakdown)', 'rickafy')
    .addItem('Start new quote', 'newQuote')
    .addSeparator()
    .addItem('Load Live Zoom line items', 'loadLineItems')
    .addItem('Share the quote maker (link for everyone)', 'shareQuoteMaker')
    .addItem('Set up sheet', 'setupSheet')
    .addToUi();
  try { ensureRickButton_(); } catch (e) { /* the menu still works */ }
}

// Adds the RICKafy button to the Quote tab once, for sheets set up before it existed.
function ensureRickButton_() {
  const sh = SpreadsheetApp.getActive().getSheetByName('Quote');
  if (!sh) return;
  if (String(sh.getRange('E2').getFormula()).indexOf('HYPERLINK') >= 0) return;
  const has = sh.getImages().some(img => { try { return img.getScript() === 'rickafy'; } catch (e) { return false; } });
  if (has) return;
  const blob = Utilities.newBlob(Utilities.base64Decode(BUTTON_RICKAFY), 'image/png', 'rickafy.png');
  sh.insertImage(blob, 5, 8).setWidth(230).setHeight(52).assignScript('rickafy');
}

// ---------------------------------------------------------------- make the one-pager

function makeOnePager() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActive();
  if (!ss.getSheetByName('Quote') || !ss.getSheetByName('Packages') || !ss.getSheetByName('Log')) {
    ui.alert('This sheet isn’t set up yet. Use Quotes › Set up sheet first.');
    return;
  }
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(1000)) {
    ui.alert('A PDF is already being made. Wait a few seconds and try again.');
    return;
  }
  try {
    makeOnePagerLocked_(ui, ss);
  } finally {
    lock.releaseLock();
  }
}

function makeOnePagerLocked_(ui, ss) {
  showResult_(ui, ss, 'onepager', readQuote_(ss.getSheetByName('Quote')));
}

// Runs a sheet button: validate, confirm placeholders, make the files, show the links.
function showResult_(ui, ss, kind, q) {
  let res = produce_(kind, q, ss, false);
  if (res.problems) {
    ui.alert('Fix these first', res.problems.map(p => '•  ' + p).join('\n'), ui.ButtonSet.OK);
    return;
  }
  if (res.confirm) {
    if (ui.alert('Placeholder prices', res.confirm, ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
    res = produce_(kind, q, ss, true);
  }
  const html = HtmlService.createHtmlOutput(
    `<div style="font-family:Arial;font-size:13px;line-height:1.6">
       <b>${escape_(res.title)}</b><br>Total ${res.totalText}<br><br>
       <a href="${res.pdfUrl}" target="_blank">Open PDF</a> &nbsp;·&nbsp;
       <a href="${res.docUrl}" target="_blank">Edit as Google Doc</a></div>`)
    .setWidth(380).setHeight(130);
  ui.showModalDialog(html, kind === 'onepager' ? 'One-pager ready' : 'Price breakdown ready');
}

// Makes the Google Doc + PDF for a quote and logs it. Used by the sheet buttons and the web app.
// Returns {problems} | {confirm} | {title, total, totalText, pdfUrl, docUrl, quoteNumber}.
function produce_(kind, q, book, force) {
  const pkg = readPackage_(book.getSheetByName('Packages'), q.package);
  const problems = validate_(q, pkg);
  if (problems.length) return { problems };
  if (kind === 'onepager' && pkg.placeholders.length && !force) {
    return { confirm: `${q.package} still has placeholder prices for: ${pkg.placeholders.join(', ')}.\n\nMake the PDF anyway?` };
  }

  let title, total, totalText, build;
  if (kind === 'onepager') {
    const lines = pkg.sections
      .map(s => ({ name: s.name, desc: s.desc, price: s.price * q.days }))
      .concat(q.addons);
    total = lines.reduce((sum, l) => sum + l.price, 0) * (1 + q.taxRate);
    totalText = money_(total);
    title = `${q.client} - ${q.package} - Quote ${q.quoteNumber}`;
    build = doc => buildDoc_(doc, q, pkg, lines, total);
  } else {
    const groups = breakdown_(q, pkg);
    const subtotal = groups.reduce((sum, g) => sum + g.total, 0);
    const tax = subtotal * q.taxRate;
    total = subtotal + tax;
    totalText = money2_(total);
    title = `${q.client} - ${q.package} - Quote ${q.quoteNumber} (breakdown)`;
    build = doc => buildBreakdownDoc_(doc, q, groups, subtotal, tax, total);
  }

  const doc = DocumentApp.create(title);
  build(doc);
  doc.saveAndClose();
  const folder = getFolder_(q.folder);
  const docFile = DriveApp.getFileById(doc.getId());
  docFile.moveTo(folder);
  const pdf = folder.createFile(docFile.getAs(MimeType.PDF)).setName(title + '.pdf');
  book.getSheetByName('Log').appendRow([
    new Date(), q.client, q.package + (kind === 'onepager' ? '' : ' (breakdown)'), q.eventDate, total,
    docFile.getUrl(), pdf.getUrl(),
  ]);
  return { title, total, totalText, pdfUrl: pdf.getUrl(), docUrl: docFile.getUrl(), quoteNumber: q.quoteNumber };
}

// Plain-English problems with the Quote tab, or [] if it's ready.
function validate_(q, pkg) {
  const out = [];
  if (!q.package) out.push('Pick a package (Quote tab, Package).');
  else if (!pkg.sections.length && !pkg.items.length) out.push(`"${q.package}" has nothing in it on the Packages tab.`);
  if (!q.client) out.push('Enter the client name.');
  if (!(q.eventDate instanceof Date)) out.push('Pick an event date.');
  if (!(q.days >= 1)) out.push('Days needs to be 1 or more.');
  if (!q.quoteNumber) out.push('Enter a quote number.');
  if (q.taxRate < 0 || q.taxRate > 0.2) out.push('Tax rate looks wrong. Use a percent like 6.625%, or 0.');
  q.addons.filter(a => !(a.price > 0)).forEach(a => out.push(`Add-on "${a.name}" needs a price.`));
  return out;
}

// Clears the client details and add-ons, bumps the quote number, and dates it today.
function newQuote() {
  const ui = SpreadsheetApp.getUi();
  const sh = SpreadsheetApp.getActive().getSheetByName('Quote');
  if (!sh) { ui.alert('Use Quotes › Set up sheet first.'); return; }
  const ok = ui.alert('Start new quote', 'This clears the client, date, and add-ons. Continue?', ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  const num = String(sh.getRange(FIELDS.quoteNumber, 2).getValue()).trim();
  const next = /^\d+$/.test(num) ? String(Number(num) + 1).padStart(num.length, '0') : '';
  sh.getRange(FIELDS.client, 2).clearContent();
  sh.getRange(FIELDS.eventDate, 2).clearContent();
  sh.getRange(FIELDS.days, 2).setValue(1);
  sh.getRange(FIELDS.quoteNumber, 2).setValue(next);
  sh.getRange(FIELDS.issued, 2).setValue(new Date());
  sh.getRange(ADDON_FIRST_ROW, 1, ADDON_ROWS, 3).clearContent();
  sh.getRange(FIELDS.client, 2).activate();
  SpreadsheetApp.getActive().toast('Ready. Fill in the blue cells, then click Make PDF.', 'Quotes', 6);
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

// Packages tab columns: Package | Type (Headline / Section / Also / Item) | Name | Description | Price per day | Status | Qty
// Item rows are the real line items for RICKafy: Description holds the category (Crew, Video, Audio, Transport).
function readPackage_(sheet, name) {
  const rows = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 7).getValues()
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
    items: of('item').map(r => ({
      name: String(r[2]).trim(), category: String(r[3]).trim() || 'Other',
      price: Number(r[4]) || 0, qty: Number(r[6]) || 1,
    })),
    placeholders: sections.filter(s => s.placeholder).map(s => s.name),
  };
}

// ---------------------------------------------------------------- web app: the shareable quote maker
// Deploy once as a web app that runs as the owner (see README). Everyone else just opens the link:
// no Extensions, no permission prompts. Prices still come from the Packages tab.

function doGet() {
  return HtmlService.createHtmlOutput(WEB_PAGE)
    .setTitle('Quote maker · 368 × Hellhound')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function book_() {
  let ss = null;
  try { ss = SpreadsheetApp.getActive(); } catch (e) { /* no active sheet inside a web app */ }
  if (ss) return ss;
  const id = PropertiesService.getScriptProperties().getProperty('sheetId');
  if (!id) throw new Error('Open the sheet and run Quotes › Share the quote maker first.');
  return SpreadsheetApp.openById(id);
}

// Next quote number: a counter seeded from the Quote tab, so numbers never repeat.
function nextQuoteNumber_(book, take) {
  const props = PropertiesService.getScriptProperties();
  let n = Number(props.getProperty('nextQuote'));
  if (!n) {
    const seed = Number(String(book.getSheetByName('Quote').getRange(FIELDS.quoteNumber, 2).getValue()).trim());
    n = seed > 0 && seed < 1e7 ? seed + 1 : 1001;
  }
  if (take) props.setProperty('nextQuote', String(n + 1));
  return String(n).padStart(4, '0');
}

function webInit() {
  const book = book_();
  const pk = book.getSheetByName('Packages');
  const rows = pk.getRange(2, 1, Math.max(pk.getLastRow() - 1, 1), 2).getValues();
  const packages = [...new Set(rows.filter(r => /^headline$/i.test(String(r[1]).trim()))
    .map(r => String(r[0]).trim()).filter(Boolean))];
  const qs = book.getSheetByName('Quote');
  const v = row => String(qs.getRange(row, 2).getValue()).trim();
  return {
    packages,
    quoteNumber: nextQuoteNumber_(book, false),
    taxPct: (Number(qs.getRange(FIELDS.taxRate, 2).getValue()) || 0) * 100,
    contactName: v(FIELDS.contactName), contactEmail: v(FIELDS.contactEmail), contactPhone: v(FIELDS.contactPhone),
  };
}

function webMake(kind, f, force) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { problems: ['Someone else is making a quote right now. Try again in a few seconds.'] };
  try {
    const book = book_();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(f.date || ''));
    const issued = new Date();
    const q = {
      package: String(f.package || '').trim(),
      client: String(f.client || '').trim(),
      eventDate: m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : '',
      days: Number(f.days) || 0,
      quoteNumber: nextQuoteNumber_(book, false),
      issued,
      validUntil: new Date(issued.getTime() + 30 * 864e5),
      taxRate: (Number(f.taxPct) || 0) / 100,
      contact: [f.contactName, f.contactEmail, f.contactPhone].map(x => String(x || '').trim()).filter(Boolean),
      folder: String(book.getSheetByName('Quote').getRange(FIELDS.folder, 2).getValue()).trim(),
      addons: (f.addons || []).filter(a => String(a.name || '').trim())
        .map(a => ({ name: String(a.name).trim(), desc: String(a.desc || '').trim(), price: Number(a.price) || 0 })),
    };
    const res = produce_(kind === 'breakdown' ? 'breakdown' : 'onepager', q, book, !!force);
    if (res.title) {
      nextQuoteNumber_(book, true);
      res.nextQuoteNumber = nextQuoteNumber_(book, false);
    }
    return res;
  } finally {
    lock.releaseLock();
  }
}

// Owner only, once after deploying: saves where the sheet is, swaps the script buttons
// (which ask every user for permission) for the shareable link.
function shareQuoteMaker() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActive();
  const found = ScriptApp.getService().getUrl() || '';
  const url = WEB_APP_URL || (/\/exec$/.test(found) ? found : '');
  if (!url) {
    ui.alert('Deploy it first',
      'In Extensions › Apps Script: Deploy › New deployment › type: Web app.\n' +
      'Execute as: Me.  Who has access: Anyone with a Google account.\nClick Deploy, then run this again.',
      ui.ButtonSet.OK);
    return;
  }
  PropertiesService.getScriptProperties().setProperty('sheetId', ss.getId());
  const sh = ss.getSheetByName('Quote');
  if (sh) {
    sh.getImages().forEach(img => img.remove());
    sh.getRange('E2').setFormula(`=HYPERLINK("${url}", "Open the quote maker →")`)
      .setFontSize(14).setFontWeight('bold').setFontColor(C.blue).setFontFamily(FONT);
    sh.getRange('E3').setValue('Share this link with the team. Nothing to install.').setFontColor(C.faint);
  }
  ui.alert('Quote maker link', `Share this link with anyone who makes quotes:\n\n${url}\n\nIt’s also on the Quote tab.`,
    ui.ButtonSet.OK);
}

// ---------------------------------------------------------------- RICKafy: the plain price breakdown

const COMPANY = ['368 Event Management LLC', '7 Industrial Rd, Ste 201', 'Pequannock, NJ 07440',
                 '(201) 893-5224  ·  Rick@368eventmanagement.com'];

function rickafy() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActive();
  if (!ss.getSheetByName('Quote') || !ss.getSheetByName('Packages') || !ss.getSheetByName('Log')) {
    ui.alert('This sheet isn’t set up yet. Use Quotes › Set up sheet first.');
    return;
  }
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(1000)) {
    ui.alert('A quote is already being made. Wait a few seconds and try again.');
    return;
  }
  try {
    rickafyLocked_(ui, ss);
  } finally {
    lock.releaseLock();
  }
}

function rickafyLocked_(ui, ss) {
  showResult_(ui, ss, 'breakdown', readQuote_(ss.getSheetByName('Quote')));
}

// Line items grouped by category. Item rows are used when the package has them; any Section
// with no matching Item category (e.g. an extra mic package) is listed as its own line.
// Prices multiply by Days, except Transport and the Quote tab add-ons, which are flat.
function breakdown_(q, pkg) {
  const groups = [];
  const group = name => {
    let g = groups.find(x => x.name === name);
    if (!g) { g = { name, lines: [], total: 0 }; groups.push(g); }
    return g;
  };
  const add = (cat, name, qty, price, days) => {
    const g = group(cat);
    const line = { name, qty, price, days, total: qty * price * days };
    g.lines.push(line);
    g.total += line.total;
  };
  pkg.items.forEach(i => add(i.category, i.name, i.qty, i.price, /transport/i.test(i.category) ? 1 : q.days));
  const covered = new Set(pkg.items.map(i => i.category.toLowerCase()));
  pkg.sections.filter(s => !covered.has(s.name.toLowerCase()))
    .forEach(s => add(s.name, s.desc || s.name, 1, s.price, q.days));
  q.addons.forEach(a => add('Add-ons', a.desc ? `${a.name}: ${a.desc}` : a.name, 1, a.price, 1));
  return groups;
}

function buildBreakdownDoc_(doc, q, groups, subtotal, tax, total) {
  const body = doc.getBody();
  body.setPageWidth(612).setPageHeight(792)
    .setMarginTop(43).setMarginBottom(40).setMarginLeft(50).setMarginRight(50);
  const width = 612 - 100;
  const right = DocumentApp.HorizontalAlignment.RIGHT;

  // header: company left, Quotation right
  const head = body.appendTable([[COMPANY.join('\n'), 'Quotation']]);
  plainTable_(head, [width * 0.6, width * 0.4]);
  style_(cellPara_(head, 0, 0), { size: 9, color: C.muted, lineSpacing: 1.3 });
  style_(cellPara_(head, 0, 1), { size: 22, bold: true, align: 'right' });
  [`Quote ${q.quoteNumber}`,
   q.issued ? `Issued ${fmtDate_(q.issued, 'MMM d, yyyy')}` : '',
   q.validUntil ? `Valid until ${fmtDate_(q.validUntil, 'MMM d, yyyy')}` : '']
    .filter(Boolean)
    .forEach(t => style_(head.getRow(0).getCell(1).appendParagraph(t), { size: 9, color: C.muted, align: 'right' }));

  // event details
  para_(body, '', { size: 6 });
  const info = body.appendTable([
    ['Client', q.client],
    ['Package', q.package],
    ['Event date', fmtDate_(q.eventDate, 'EEEE, MMMM d, yyyy')],
    ['Days', String(q.days)],
  ]);
  gridTable_(info, [110, width - 110]);
  for (let r = 0; r < info.getNumRows(); r++) {
    info.getRow(r).getCell(0).setBackgroundColor('#f5f5f7');
    style_(cellPara_(info, r, 0), { size: 9, bold: true, color: C.muted });
    style_(cellPara_(info, r, 1), { size: 9.5 });
  }

  // line items
  para_(body, '', { size: 6 });
  const rows = [['Item', 'Qty', 'Price', 'Days', 'Total']];
  const kinds = ['head'];
  groups.forEach(g => {
    rows.push([g.name, '', '', '', '']); kinds.push('group');
    g.lines.forEach(l => {
      rows.push([l.name, String(l.qty), money2_(l.price), String(l.days), money2_(l.total)]);
      kinds.push('line');
    });
    rows.push([`${g.name} subtotal`, '', '', '', money2_(g.total)]); kinds.push('sub');
  });
  const t = body.appendTable(rows);
  gridTable_(t, [width - 250, 45, 75, 45, 85]);
  kinds.forEach((kind, r) => {
    const row = t.getRow(r);
    for (let c = 0; c < 5; c++) {
      const cell = row.getCell(c);
      const s = { size: 9, align: c > 0 ? 'right' : 'left' };
      if (kind === 'head') { cell.setBackgroundColor('#171717'); Object.assign(s, { bold: true, color: '#ffffff' }); }
      if (kind === 'group') { cell.setBackgroundColor('#f5f5f7'); Object.assign(s, { bold: true, size: 9.5 }); }
      if (kind === 'sub') Object.assign(s, { color: c === 4 ? C.ink : C.muted, bold: c === 4, align: 'right' });
      style_(cell.getChild(0).asParagraph(), s);
    }
  });

  // totals
  para_(body, '', { size: 6 });
  const tot = body.appendTable([
    ['Subtotal', money2_(subtotal)],
    [q.taxRate ? `Tax (${+(q.taxRate * 100).toFixed(3)}%)` : 'Tax', money2_(tax)],
    ['Grand total', money2_(total)],
  ]);
  gridTable_(tot, [width - 130, 130]);
  for (let r = 0; r < 3; r++) {
    const last = r === 2;
    [0, 1].forEach(c => {
      if (last) tot.getRow(r).getCell(c).setBackgroundColor('#171717');
      style_(cellPara_(tot, r, c), { size: last ? 11 : 9.5, bold: last, color: last ? '#ffffff' : C.ink, align: 'right' });
    });
  }

  // acceptance
  para_(body, 'I, the undersigned, accept the terms and conditions of rental.', { size: 9, color: C.muted, before: 22, after: 18 });
  const sign = body.appendTable([['Signed', 'Printed', 'Date']]);
  gridTable_(sign, [width * 0.4, width * 0.4, width * 0.2]);
  [0, 1, 2].forEach(c => {
    sign.getRow(0).getCell(c).setPaddingTop(22);
    style_(cellPara_(sign, 0, c), { size: 8, color: C.faint });
  });
  if (q.contact.length) para_(body, q.contact.join('  ·  '), { size: 8, color: C.faint, before: 18 });
}

function gridTable_(table, widths) {
  table.setBorderWidth(0.5).setBorderColor('#dddddd');
  widths.forEach((w, i) => table.setColumnWidth(i, w));
  for (let r = 0; r < table.getNumRows(); r++) {
    const row = table.getRow(r);
    for (let c = 0; c < row.getNumCells(); c++) {
      row.getCell(c).setPaddingLeft(6).setPaddingRight(6).setPaddingTop(3).setPaddingBottom(3)
        .setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER);
    }
  }
}

function money2_(n) {
  const [whole, cents] = Math.abs(n).toFixed(2).split('.');
  return (n < 0 ? '-$' : '$') + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + cents;
}

// One-time: adds the real line items from Helix quote 0625 to every "Live Zoom…" package that has none.
function loadLineItems() {
  const ui = SpreadsheetApp.getUi();
  const sh = SpreadsheetApp.getActive().getSheetByName('Packages');
  if (!sh) { ui.alert('Use Quotes › Set up sheet first.'); return; }
  const data = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 2).getValues();
  const names = [...new Set(data.map(r => String(r[0]).trim()).filter(n => /^live zoom/i.test(n)))];
  const todo = names.filter(n => !data.some(r => String(r[0]).trim() === n && /^item$/i.test(String(r[1]).trim())));
  if (!todo.length) { ui.alert('Those packages already have line items.'); return; }
  const rows = [];
  todo.forEach(n => ZOOM_ITEMS.forEach(([cat, item, qty, price]) =>
    rows.push([n, 'Item', item, cat, price, 'Quote 0625', qty])));
  sh.getRange('G1').setValue('Qty').setFontWeight('bold').setFontColor(C.muted);
  sh.getRange('B2:B').setDataValidation(SpreadsheetApp.newDataValidation().setAllowInvalid(false)
    .requireValueInList(['Headline', 'Section', 'Also', 'Item'], true).build());
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, 7).setValues(rows).setFontFamily(FONT);
  ui.alert(`Added ${ZOOM_ITEMS.length} line items to: ${todo.join(', ')}.`);
}

const ZOOM_ITEMS = [  // category, item, qty, price per day: Helix quote 0625
  ['Crew', 'Senior Audio Technician (A1)', 1, 600],
  ['Crew', 'Video Technician (V1)', 1, 600],
  ['Video', 'Roland V-02HD MK II Streaming Video Mixer', 1, 55],
  ['Video', 'MacBook Air M2 13.6"', 1, 150],
  ['Video', 'SDI (3G) & HDMI Video Cable Package', 1, 100],
  ['Video', 'BirdDog X5 Ultra PTZ Camera', 1, 275],
  ['Video', 'BirdDog KBD PTZ Controller', 1, 140],
  ['Video', 'E-Image Tripod for PTZ Cameras', 1, 70],
  ['Video', 'LILLIPUT A11 4K Camera Monitor 10.1"', 1, 30],
  ['Video', 'Manfrotto PIXI EVO Mini Tripod', 1, 0],
  ['Video', 'NETGEAR GS108LP 8-Port PoE+ Switch', 1, 30],
  ['Audio', 'Apple iPad (10.9")', 1, 50],
  ['Audio', 'Radial ProAV2 Stereo Direct Box', 2, 5],
  ['Audio', 'Focusrite Scarlett 2i2', 1, 40],
  ['Transport', 'Cartage, Setup, and Pick-Up', 1, 500],
];

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
  const hints = [
    'Pick from the list',
    'Who the quote is for',
    'Double-click to pick a date',
    'Number of event days (crew and gear prices multiply by this)',
    'Goes up by one when you click Start new quote',
    'Today’s date is filled in for you',
    '30 days after Issued (you can type a different date)',
    'Use 0, or a percent like 6.625%',
    '', '', '',
    'Optional: paste a Drive folder link. Blank uses "' + DEFAULT_FOLDER + '"',
  ];
  sh.getRange(2, 3, hints.length, 1).setValues(hints.map(h => [h])).setFontColor(C.faint);

  const DV = () => SpreadsheetApp.newDataValidation().setAllowInvalid(false);
  sh.getRange('B2').setDataValidation(DV()
    .requireValueInRange(ss.getSheetByName('Packages').getRange('H2:H'), true)
    .setHelpText('Pick a package from the list.').build());
  sh.getRange('B4').setDataValidation(DV().requireDate().setHelpText('Double-click to pick a date.').build());
  sh.getRange('B7:B8').setDataValidation(DV().requireDate().setHelpText('Enter a date.').build());
  sh.getRange('B5').setDataValidation(DV().requireNumberBetween(1, 60).setHelpText('A whole number of days, 1 or more.').build());
  sh.getRange('B9').setDataValidation(DV().requireNumberBetween(0, 0.2).setHelpText('0, or a percent like 6.625%.').build());

  sh.getRange(ADDON_FIRST_ROW - 2, 1).setValue('Add-ons (optional, flat price)').setFontWeight('bold');
  sh.getRange(ADDON_FIRST_ROW - 1, 1, 1, 3).setValues([['Name', 'Description', 'Price']])
    .setFontColor(C.muted).setFontWeight('bold');
  sh.getRange(ADDON_FIRST_ROW, 1, ADDON_ROWS, 3).setBackground(C.input);
  sh.getRange(ADDON_FIRST_ROW, 3, ADDON_ROWS, 1).setNumberFormat('$#,##0')
    .setDataValidation(SpreadsheetApp.newDataValidation().setAllowInvalid(false)
      .requireNumberGreaterThanOrEqualTo(0).setHelpText('A dollar amount.').build());
  sh.getRange(1, 1, sh.getMaxRows(), 3).setFontFamily(FONT);
  sh.setFrozenRows(1);

  // big buttons (images with a script attached); the Quotes menu does the same thing
  sh.setColumnWidth(4, 30).setColumnWidth(5, 240);
  const img = (b64, name) => Utilities.newBlob(Utilities.base64Decode(b64), 'image/png', name);
  sh.insertImage(img(BUTTON_MAKE_PDF, 'make.png'), 5, 2).setWidth(230).setHeight(52).assignScript('makeOnePager');
  sh.insertImage(img(BUTTON_NEW_QUOTE, 'new.png'), 5, 5).setWidth(230).setHeight(52).assignScript('newQuote');
  sh.insertImage(img(BUTTON_RICKAFY, 'rickafy.png'), 5, 8).setWidth(230).setHeight(52).assignScript('rickafy');

  // warn (don't block) if someone edits anything but the blue cells
  const prot = sh.protect().setDescription('Only the blue cells are meant to be edited').setWarningOnly(true);
  try {
    prot.setUnprotectedRanges([sh.getRange(2, 2, 12, 1), sh.getRange(ADDON_FIRST_ROW, 1, ADDON_ROWS, 3)]);
  } catch (e) { /* warning-only protection still works without the exceptions */ }
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
  sh.getRange('B2:B').setDataValidation(SpreadsheetApp.newDataValidation().setAllowInvalid(false)
    .requireValueInList(['Headline', 'Section', 'Also', 'Item'], true).build());
  sh.getRange('G1').setValue('Qty').setFontWeight('bold').setFontColor(C.muted);
  const items = [];
  ZOOM_ITEMS.forEach(([cat, item, qty, price]) => items.push(['Live Zoom Package', 'Item', item, cat, price, 'Quote 0625', qty]));
  sh.getRange(sh.getLastRow() + 1, 1, items.length, 7).setValues(items);
  sh.getRange('E2:E').setDataValidation(SpreadsheetApp.newDataValidation().setAllowInvalid(false)
    .requireNumberGreaterThanOrEqualTo(0).setHelpText('A dollar amount per day.').build());
  sh.getRange('1:1').protect().setDescription('Column headers').setWarningOnly(true);
  sh.getRange('H:H').protect().setDescription('Built automatically from Headline rows').setWarningOnly(true);
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
  sh.protect().setDescription('Filled in automatically by Make PDF').setWarningOnly(true);
}

// ---------------------------------------------------------------- web page (from web.html)
const WEB_PAGE = "<!doctype html>\n<html>\n<head>\n<base target=\"_top\">\n<meta charset=\"utf-8\">\n<link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap\" rel=\"stylesheet\">\n<style>\n  :root { --ink: #171717; --muted: #6b6b6b; --faint: #a3a3a3; --line: #e7e5e0; --soft: #f5f5f7; --blue: #0096cf; --red: #e8382f; }\n  * { box-sizing: border-box; }\n  body { margin: 0; font-family: Inter, Arial, sans-serif; color: var(--ink); background: #fafafa; }\n  main { max-width: 640px; margin: 0 auto; padding: 40px 20px 60px; }\n  .kicker { font-size: 12px; font-weight: 700; letter-spacing: .04em; color: var(--blue); }\n  h1 { font-size: 34px; letter-spacing: -0.02em; margin: 6px 0 4px; }\n  .sub { color: var(--muted); margin: 0 0 28px; }\n  .card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 22px; margin-bottom: 14px;\n          box-shadow: 0 1px 2px rgba(0,0,0,.03), 0 6px 20px rgba(0,0,0,.04); }\n  label { display: block; font-size: 13px; font-weight: 600; margin: 0 0 6px; }\n  .hint { font-weight: 400; color: var(--faint); }\n  input, select { width: 100%; font: inherit; font-size: 15px; padding: 11px 12px; border: 1px solid #d9d9de;\n                  border-radius: 10px; background: #fff; color: var(--ink); }\n  input:focus, select:focus { outline: 2px solid rgba(0,150,207,.35); border-color: var(--blue); }\n  .field { margin-bottom: 16px; }\n  .field:last-child { margin-bottom: 0; }\n  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }\n  .addon { display: grid; grid-template-columns: 1.1fr 1.6fr .8fr; gap: 8px; margin-bottom: 8px; }\n  h2 { font-size: 15px; margin: 0 0 4px; }\n  .note { font-size: 13px; color: var(--muted); margin: 0 0 14px; }\n  details summary { cursor: pointer; font-size: 14px; font-weight: 600; }\n  details[open] summary { margin-bottom: 14px; }\n  .buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 18px; }\n  button { font: inherit; font-size: 16px; font-weight: 600; padding: 15px; border: 0; border-radius: 12px; cursor: pointer; }\n  button small { display: block; font-size: 11px; font-weight: 500; opacity: .85; margin-top: 2px; }\n  .pdf { background: var(--ink); color: #fff; }\n  .rick { background: var(--blue); color: #fff; }\n  button:disabled { opacity: .5; cursor: wait; }\n  #msg { margin-top: 18px; }\n  .err { border-color: #f3c4c0; background: #fdf3f2; color: #a8261d; }\n  .err ul { margin: 6px 0 0; padding-left: 18px; }\n  .ok h2 { font-size: 17px; }\n  .ok a { display: inline-block; margin: 10px 10px 0 0; padding: 10px 16px; border-radius: 10px; background: var(--soft);\n          color: var(--ink); font-weight: 600; text-decoration: none; }\n  .ok a.main { background: var(--ink); color: #fff; }\n  .num { font-size: 13px; color: var(--muted); }\n</style>\n</head>\n<body>\n<main>\n  <div class=\"kicker\">368 EVENT MANAGEMENT × HELLHOUND AUDIO</div>\n  <h1>Quote maker</h1>\n  <p class=\"sub\">Pick a package, fill in the details, click a button. <span class=\"num\" id=\"qnum\"></span></p>\n\n  <div class=\"card\">\n    <div class=\"field\">\n      <label for=\"package\">Package</label>\n      <select id=\"package\"><option>Loading…</option></select>\n    </div>\n    <div class=\"field\">\n      <label for=\"client\">Client <span class=\"hint\">· who the quote is for</span></label>\n      <input id=\"client\" autocomplete=\"organization\">\n    </div>\n    <div class=\"row\">\n      <div class=\"field\">\n        <label for=\"date\">Event date</label>\n        <input id=\"date\" type=\"date\">\n      </div>\n      <div class=\"field\">\n        <label for=\"days\">Days</label>\n        <input id=\"days\" type=\"number\" min=\"1\" value=\"1\">\n      </div>\n    </div>\n  </div>\n\n  <div class=\"card\">\n    <h2>Add-ons <span class=\"hint\">· optional</span></h2>\n    <p class=\"note\">Anything extra, at a flat price.</p>\n    <div id=\"addons\"></div>\n  </div>\n\n  <div class=\"card\">\n    <details>\n      <summary>Contact and tax</summary>\n      <div class=\"field\"><label for=\"contactName\">Contact name</label><input id=\"contactName\"></div>\n      <div class=\"row\">\n        <div class=\"field\"><label for=\"contactEmail\">Email</label><input id=\"contactEmail\"></div>\n        <div class=\"field\"><label for=\"contactPhone\">Phone</label><input id=\"contactPhone\"></div>\n      </div>\n      <div class=\"field\"><label for=\"taxPct\">Tax rate % <span class=\"hint\">· 0, or 6.625</span></label>\n        <input id=\"taxPct\" type=\"number\" min=\"0\" max=\"20\" step=\"0.001\" value=\"0\"></div>\n    </details>\n  </div>\n\n  <div class=\"buttons\">\n    <button class=\"pdf\" id=\"b-pdf\" onclick=\"make('onepager')\">Make PDF<small>sales one-pager</small></button>\n    <button class=\"rick\" id=\"b-rick\" onclick=\"make('breakdown')\">RICKafy<small>price breakdown</small></button>\n  </div>\n  <div id=\"msg\"></div>\n</main>\n\n<script>\n  var $ = function (id) { return document.getElementById(id); };\n  for (var i = 0; i < 3; i++) {\n    $('addons').insertAdjacentHTML('beforeend',\n      '<div class=\"addon\"><input placeholder=\"Name\" class=\"a-name\"><input placeholder=\"Description\" class=\"a-desc\">' +\n      '<input placeholder=\"$ Price\" type=\"number\" min=\"0\" class=\"a-price\"></div>');\n  }\n\n  function busy(on, text) {\n    $('b-pdf').disabled = $('b-rick').disabled = on;\n    if (text) show('card', text);\n  }\n\n  function show(cls, html) { $('msg').innerHTML = '<div class=\"card ' + cls + '\">' + html + '</div>'; }\n  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }\n\n  function failed(e) { busy(false); show('err', '<b>Something went wrong.</b><br>' + esc(e && e.message || e)); }\n\n  google.script.run.withSuccessHandler(function (d) {\n    $('package').innerHTML = d.packages.map(function (p) { return '<option>' + esc(p) + '</option>'; }).join('');\n    $('contactName').value = d.contactName; $('contactEmail').value = d.contactEmail; $('contactPhone').value = d.contactPhone;\n    $('taxPct').value = d.taxPct;\n    $('qnum').textContent = 'Next quote: ' + d.quoteNumber;\n  }).withFailureHandler(failed).webInit();\n\n  function form() {\n    var rows = document.querySelectorAll('.addon');\n    var addons = [];\n    rows.forEach(function (r) {\n      addons.push({ name: r.querySelector('.a-name').value, desc: r.querySelector('.a-desc').value,\n                    price: r.querySelector('.a-price').value });\n    });\n    return { package: $('package').value, client: $('client').value, date: $('date').value, days: $('days').value,\n             taxPct: $('taxPct').value, contactName: $('contactName').value, contactEmail: $('contactEmail').value,\n             contactPhone: $('contactPhone').value, addons: addons };\n  }\n\n  function make(kind, force) {\n    busy(true, 'Making your ' + (kind === 'onepager' ? 'PDF' : 'price breakdown') + '… this takes a few seconds.');\n    google.script.run.withSuccessHandler(function (res) {\n      busy(false);\n      if (res.problems) {\n        show('err', '<b>Fix these first</b><ul>' + res.problems.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>');\n      } else if (res.confirm) {\n        if (confirm(res.confirm)) make(kind, true); else $('msg').innerHTML = '';\n      } else {\n        show('ok', '<h2>' + esc(res.title) + '</h2><div>Total ' + esc(res.totalText) + '</div>' +\n          '<a class=\"main\" href=\"' + esc(res.pdfUrl) + '\" target=\"_blank\">Open PDF</a>' +\n          '<a href=\"' + esc(res.docUrl) + '\" target=\"_blank\">Edit as Google Doc</a>');\n        $('qnum').textContent = 'Next quote: ' + res.nextQuoteNumber;\n      }\n    }).withFailureHandler(failed).webMake(kind, form(), !!force);\n  }\n</script>\n</body>\n</html>\n";

// ---------------------------------------------------------------- button images (PNG, base64)
const BUTTON_MAKE_PDF = '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tK+++mps374daWlpYaecWAHRKlxQU1MDm80Gu93e5jlEzjkSEhLg8/kaZWqh701rgqWmaeqrYbumaaKiogLTp0/HddddF3Y6y8qVK3HixIlGx4cRcqahSj+k01mLf1avXq2q3QDAfffdh8zMTJVNrlmzRg0dxsLaT2g9jAHA6/Wirq4O8fHxYXswi4uLcc011+C8886LeTGLdU1paSkSEhJQU1OD6dOno6KiIqzc3rx589CvXz912oh1+sjnn3+uVskCwOTJkzFgwAAcP34cdXV1MAwDpmnC4/GgqKgI999/P9599128/PLLePDBB8MK0beFlX03/Ap931rTZlVVVdhXRUUFTp06BY/HA6fTiaeffhpz5sxR99I0DaWlpXj77beppB05K1CGSTqdlWXu378fO3bswIgRIyCEQHZ2tgoIlZWV2LRpU4tKwTHGUFZWpirmSCnRr18/3H333Xj55ZdVQYKkpCTcfffdmD9/fquGN3VdRyAQQEpKCvLz8zF//nwsWLBABZ4uXbrgueeew6233qoWCCUkJGD58uX4/e9/r7LM1NRULFu2DHPnzsXOnTtRXl6utps8/PDDePzxx8E5x4gRIwDUl+778ssvkZiYeMZsyLeCt8vlwrBhw1T5Pus8yqSkJFx66aUYP348cnJyAEAVJ2CMYfbs2di3b59aKEWBk5zJKGCS04JzjsrKSqxZswYjRoxQ2Y017Llr1y7s3bs35v1/VpWfPXv24McffwyrQ/uXv/wF119/PQ4cOACXy4UePXpg8ODBAOprpKamprao71aAtbaLvPbaaxg6dCgmTJgA0zRhmiZGjBiBadOm4amnnkJSUhJsNhuOHz+OWbNmYenSpdA0DYZhoGfPnli2bBkKCwtRUlKi5nO7d+8OKaXKjr/99lusWLHijDsU2Qpw3bt3x4oVK1TfIq3GtQ4BtzLsZ555BitWrDijfgEgpCkUMEmHsPYQWpVwIj0Q7XY7tm7diqKiInVyh7X/ct26dervoQEzWrtWxZpjx45h4cKFePXVV8MKiA8fPhzDhw8Pu/+aNWtQXFyMKVOmqELsDRcXhc4lNlxwEjrnOGvWLAwYMAA9evSA3++HaZqYOnUqvvjiC3z22WdISUmBy+XCu+++i5SUFMybNw/x8fGq771790bv3r3Vfa3MND4+Ht988w3uvfdelJeXIy4urkWr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';
const BUTTON_NEW_QUOTE = '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';
const BUTTON_RICKAFY = 'iVBORw0KGgoAAAANSUhEUgAAAcwAAABoCAYAAAB8IcDKAAA190lEQVR4nO2deZxdRZn3v1VnuVvve9KdfSEEwhIiCLKKMIqiOI64jY6+OuK4oSjuGHDXmVEUUXnVmcFXRNFxX5AtgOwkQYiQlezd6U7v3Xc/51S9f5xzb3enl3QggQ7W9/O56e57z6lTVffm/O5T9SyCQ0VrwdV3W1xznl9+7jtPnEJl5VLSQx46OJ14xRXk0gFCWIfcvsFgMBgMzxStAxIVFvn01xHWg1RUOQwPb+G9J6wrH7N6jc3V5wYIoQ+laXFIHblFW1wqAgBuWJsksD9IsmolmcHzqWmowytAEEA+A+LQmjYYDAaD4bCgNcRTYFngxGCgp49U9Z1kh9Zj+d/islVZYKymTYPpq1qp4a/+upLWlRcz2HMd8WQdThyygxD4PkKCRiAwlqXBYDAYnj80AQKNVmDZNslq8PKQz/ZR3fAB2tf/jo9fMnwoonlwwVytJXVbHS5fWuA7T3yCeOxSYqmTGeoBrRQaBVgIY1IaDAaDYQaitQYCBBIhJVUNUMg8Rr5wC+894St8c0uMviUe1wg1VTNTi9zrb7H4+aWh8l6//vNUN3yGfAbyWQ8pncM2GIPBYDAYniuU8ognHeIpGOz5Au9beRUwVvMmYHLBXL3G5przfL5x/9nUtXyEYuHVeAWFRpslV4PBYDAc1YRLtgInJnFjv6Wv8z/58EvuLWvfBEwsmDesdbhslce3156GG7+HeEWMdL8P2Eey/waDwWAwPMf4VNTa5NMFivlzeP+qh8saeABy3Kmvv8UKxfLhs0lW3w7CYbiviBFLg8FgMLzwsEONEw7J6tv59sNnc9kqj9ffMm4ldayFuXq1hKuhft1LiMVuR4gYXlEhxHhhNRgMBoPhhYLWCseVaF2gULiA3lPuh6vhmmvKjkBjhbDuLQ7XCIXjXE2iIoZfLBqxNBgMBsMLHiEkfrFIoiKG41zNNUJR95Yxzq0jYrh6jc3lSwtct/bzxJJnkh7wQbjPeacNBoPBYHheEC7pAZ9Y8kyuW/t5Ll9aYPWa8nZkKJglr6Dr1l1BXctnyKdtzJ6lwWAwGP7+sMmnbepaPsN1667gmvP8kmhKtA73MW9YO4t44u0Usj6aQ8qvZzAYDAbDCwaNppD1iSfezg1rZ4XPaSG5G4vjujW+eDnJqhVkh02cpcFgMBj+fhFYZIc1yaoV+OLlHNetuRtrxEv2+nU9WHYdSoWHGwwGg8Hw94tGSgj8Pt53SgOAYPVqSfNrP4Yb/xLFvAJtrEuDwWAwGBABblxSzH+Krl99TXLNNQodnEosIUBPmXjWYDAYDIa/H7QilhDo4FSuuUYJrl9/BvHUzfjFVnxPmqojBoPBYDAQVjmxHYXttpPPvEkiWEIsORff00YsDQaDwWCIEELge5pYci6CJRLYj1/UGK00GAwGg2EsQoBf1MB+CbyMwBMYz1iDwWAwGA5ERBr5MsF/bdHk0hgL02AwGAyGCdAaEhVIcunAiKXBYDAYDJMgBOTSgUQIE3dpMBgMBsNUCGGZ0l0Gg8FgMEwDI5gGg+EZY7wFDX9PGME0GAyHhCVACkCHcd1ah7+DEU/DCxtT89IwoxCAJcW0brylGnQqumlPVZNuonY14KvpV7ITAiSi7CMXaUZ0bc10m5ICrAMc7ZSGQB+8AXuSuQn09K//bJACAk+BANuxcKREa02gwQs0WutITQ2GFx5GMA0zCq00ft6fWv1KCEIVi0weaYmygE2rXQHEp/4vIAApBIHW6EAT+AFjLyLCdRpLghRYUqDQE/ahhPIUylMjF9CEY4hZBx23n/OZUBldi9HFh44EQoR9X9GU5O3L6ji/rYq5FQ6e0uzP+ewcKnLthm7u3DWItOVzIuAGw3OJEUzDjEAKgfIVc2tifOFFLSQdGYrHJBqgNAx5AV1Zn0f2Z7lvX5retAdSICxRFqyJ2tU6vPmnPcW779lD0VcIIcZplRChLgZFH2FbLK6N87I5lSyscmlK2FhC0F/w2T5U5L6ODI/35igWArAlUo7XNSkEygu4eHEt/3JMbdkqlgLu25fh2nWdWK49oaUpCJc/v3xOG0uqY+UxKA1xS/CNJ7pZs3s4EqrDr1QyEss3H1vP9We1URMb61zflLA5vi7OzU/3TyzoBsMLACOYhhmBANCaupjNW4+pO+Tzu3M+39/Yy9f/up/ejId0QgtnqnY18N5791KcoD0pQPkaLMFrj6njihMaObUphTuJFRdoeLIvxw1P9fI/G3vJFoNxVpYAUJoVdQlet7BmzPmOFFz7sEbGwrZGnyOFIPACvnBGK584uXnctf+we4i1nRmEJY6MWALKV7xodgX//dK5uFLga42FKAs+QMZT3LFnGCw5pYVtMBytGKcfw4zC15qenI+vNF6g8VX4yAdjH4VA4yldtsYaEzafWtnMHa9ezLK6BMpTyFH7hKPbLUbtduf8CVdAhQgFojnl8L8vX8Av/2EBZ86qwI0s10CH1/aUxo/2Di0BJ9QnuP6sNu58zRJWNqVQRTXhdl7WV+V+5KPfB4vBhNa0JSEo+LxrRSOfXNlcvm4hCJd0b987zOv+sIPhojpiHjdCCAjgihObcKXAUxpbhHu5UkAuej+e6MvRnfNBjrfWDYYXAsbCNMwoBKFjiy1FedkRpv6gqug4X2lOakjwk3+Yz7m/3spwUSEjxRrdror8UuwJ1KxkWc6vTvDri+ZzYn0CX4ffLDUagcASYsx2oSYUUUG41/ni5iS/eeVCLvnTdtZ1ZsZZmqVrKx323ZZinBMQhGLpFwIuXFTD9We3IQTYIrQiHSl5si/PW2/fRUEphC2OiFUnBASBoq7S5cT6eNmiLL03X3+8m2/8dT/SErjG2cfwAscIpmHGUtrCzAWKbzzeTSHQSEBKmJVwOLYuzktaUmUrzpECX2lObkjwkZOaWH1fOzI5/Y94acm00rX46YXzIrHUkUiNeLZmPEVHxgehaU05JG2JFR3jRBZYW8rh5gvmc/r/bqE/7x9y5TxLCIJCwInNKX7ysvm4srTcGopre8bj0tt20JUuYrmS4CCl36UAEXn4lnpS8l1SWk9oEUoRjkcFmpakTW3MpvT1QwjoLwR89pF9ZIoKISM/qNIXnAm8eX09tTNU6UvNgfhq4v4ZDM81RjANM56sr/n0w/vAC0ZMzsgqu3BOJT88fy6zkg6KEUed1y+q4drHu+kvBtO+jhSCoBhwzZltnNacxFd6jEX69FCBa/+6n1/sGKQvH7abcAQvb63iIyc38aKmJJpQZAKtWVId46pVLXxozW6suD09z99SPwJFS5XLTy5cQH3ciqzocKkz6yveduduntqfw3ItgimcbKzIw1f5GoJgrENOaU3VCj2MYezLytcUPB88RX+FO2p5OVTG/XmfTNaDQKPDzdbQW1eDn/XGjzcWefJO0l2twTvwPEHYprFeDTMAI5iGGY8AUo4khy6LhtagBfxpWz8fdC1+/g/zoyiT8Ma6qDrG8ro49+8dnlYlHksIfC9gWXOK/7OsLhTJyKqTQvBgZ4bX/3kH7f0FcCUlU6oYKH62qZff7Rjgpy9fwMXzq8tOO4GGSxfV8vUnutk9kMd1LA4m30KEJyZtyY9eNo/ltTECPbIMKkXoqHTX9gGshD2lWEoBQTEAW7CqJcUFcyqZX+lS7Uo8BfuyHn/tyXFn+zBdQ8Wyh7Eg9Cw+d04lH1jRgNZQ5VpUu1bUbjj21pTDr169GF+F5XSf6svz2Uf2URmz+d6F84jJMA+Q1uHr16ztYkNXBsuxxngClzyA6xI21184H1eOLLMXA81Vj3bydF/+iHkAGwzTxQim4aigtN9XCluE8BcZs/nD7iH6CwG1MSvcT1QaVwqakk60SXhwwQzbFLxtaR3VkdVmCYEWgu68z1vu3E37UBE7EqnRt3s7bpP1FG9fs5utb1pOXdyiJKizUjbnza7gxp4cwp1ifKN/V4pvvXQeF7RVlpeEAx3251MP7+PGDd3YcXvKpAuCMAzkVYtruHxFI+e2Vky43AkwVFT8cFMvX1nbxf5sEduxUEqzuCbGPx7gzVtqG6DCllyyoLr8/PzKLKsf7SRbDFhQGeP05uSY8zb05dnQmRnXXijsmouXVfHGxWOvt3WgQE/GQ1jhHrLB8HxivGQNRy2aUGgCrdmf88pPljK1JUqeOQe9zwoCpZGO5KK5lZFjS/icAK7b0MOOniy2a024n+YrjWUL+rIeP9jYS08uYNdwkV3DRbpzPvMqXThIIH9opQmKhYAPndzCO5fV40f7pn4klt99socvP7IPK2bhT2FpSUAHmitOaeF3Fy3kZXMqsaO91ZLIag1eNJYqV/LhExq57dWLWFAdw/NDj9tCoFFRFp/J+q40+Cp8DwaLCluGe6/ffKKbQIfevCWv5IvnVSMdOd4qjhLSvmp+deQRrShGHtDf39TLYLqIJU2oiuH5x1iYhqMCMepRQkbbYa4UzE455QNL9l1/IRg5+WAozaKacBm3nHxHCnK+4o+7BhFyai/UQIOQkk881MHVj3aiIlmVCALCuJODxfNrL+Dli+v58mmzUKU4x8jC/M3OQS6/dy/SEkzl3yOFQBV93n1CE/95xmy86KK2FDiRhdmV9ahwLVJ2+H1ZE4rniQ0JrjtnDv/0x+3kI7EsKAi0whYQs+S41IL5QI1xdlIasCX37kuzN+0xr9IliMJuTqpPcFx9nA37c+VxhKn2NPMjBy5bCkT0RSHnK36+bQBca1ppAw2GI40RTMNRgRAjDw1oFS69kg94x6ktVDrWmOw++UDRnfdDl9qD3WvDTTSOrY2XRUURCtbWwQLbhopoS5ZFcDJKr+b8gLG+qEwq2qXt1eGiIlHp8v1z5xC3R8RVCsEDnRnecdduPKXD9H+TdEMAKlA0Vcf45lmtAOXxAPz3pj5u3NjL/nxAQsLL5lXxxdNmYQsReRjDK+ZUcUZrJXc9PcAde9Kc95ut+J5iYW2c/3vuHGpcq7yv254pcumfd1EMNJYFgwUVLh07kn39ee5qT/OOZXUQ5dm1pOCS+TVs6MggHRulwlAcgoAzWlLMSjpjhPHPe4bZOVg46JcVg+G5wgim4agg70eentH9PxmzaInbXHJSNdecOqt8nEIjtWB9T46nenJIR4zkbZ0KTbT3OCpVrICevM9gzkeUzNlpMDrN3pg914mOjX56SvP501tpqxixyILIyuwvBPTn/NAqm0ZjKUtyw5O9LKhyaUk6zKlw+N+nB/nAmt2l1EGgYX1nhraUywdWNJSdaaQQrGpMcNeOQbqyHl3DBfAUvZ4qW6ulLmR9zYMd6ci8ZiSnrtYIKfjJ1n7esawuXFZWGing/LYKvuLKcAmaMKQFW/KaBdXj5ukn2/rBV8jYxOkCDYbnGiOYhhlLSUwqHcltFy8KLUoRLnNWupLZKYe20lIskfWpQEi4cVMf2ZyPm7QnTH134HV0lD4PxiZvz/n6kG/aepLfJ0KK0Hp63aIaGqPwkdJ5pdjOV86r4sMnNfGNtZ1YU/RDR1kFdgwW+NCdu0FCMuUwr8JlX8aLnJ9EuPGoAV+xeSBfPrdk7c5KOmEyewm2ZROIgApHjjOSpYCEa1GMBLNUsSWIlmXv6UizqT/Pstp4ue2VjUmObUjyRGcGO2bh+4rGlMOFcyrL7VtC8PRggXvb02BL4+xjmDEYwTTMeBwpeGlrxYSvBdHyYOlma0vB/9vSzw/+1ouM2wcN6IdI1EQY3xj9WsaOYhWP5E1bCJhXEQp/Kc1e+TVCK+yqVc3c1Z7m8a4sliPG5Jsd154UOEkbBWTzARsHh0EK7KRDU8KmJiZpijkcVxfnoyc1AZE4R2MsZezRhPM7Vemw0usHYgnwCgE/2drP56IVAF9pKh3JmbNSPLEvE3oc+ppXzq2ixg09nEvZKm7bO0zXQAE7MbU3sMHwXGIE0zDj0VDOnVrCFgIpRlLKaUJh+eHGPq64by9ahFbUtDPsCEFv3i/9WhbNKlfixiyKvi7vn05Fqdbl6CXZkqfpwcaoVLiieUf7MIsqYyyociPzV1Abs/nWWa2c/+tt48Nrxo0Fir4CDYvr4rxlSS0n1MdpiQSzOmbReEBZMzGqwcMhT6X5+/3uYT52chMpxwrLngGvmV/Ndzb0hJ6+Ai6eX10OByqlRLxpS3/kKGXE0jBzMIJpmPEIIG5NHgEVGSW87c5d/ORvvWFGmUPYcyxdZHe6WG6rZLMuqHKZk3LZ3p+fVr5W5SmUf4BZa0lwpo7gKonlo/uz/OPvt3PB/GpuuXAeGspxmGfPquDKlc18+aEwtGTCMmAiDCmZXeHyhdNm8cbFNSTs5z56LNAgXMkTXRke3p/l/NbK8rLv2bMrmF/tsrM3z6L6BGe0JMPZjt6yx3pyPNiZAcvU1DTMLIxgGmYsJfEaqVsZWiSWgP88o5XWCgd05NEqBMtqEmCJcjq4Q7qQlGzozbMv6zE76RAm3NG0JB1OaUrwdE8WadtMpsKlDD2XLK3j9QuryUSimbAFd+xJ8z+bekPHoYkur0Ox3DhQ4HW37mDYC/jd1n5+trCaNy+pDRO7R/uZn17ZzG17hlnXkUZGHqvlPgAoTW3M4rcXLeCUxjBxQCm1H0A+0AwXA3YOF7m7I03MEnxwReNhd6rRgE2YPelX2wc5v7USGVmPcUtwQVslP+hI86LmJC0l79hIUP/flj6Up8K0f8bCNMwgjGAaZjyFQHPzpj4oBmGYiBfQmLD59lltBOhyqrYrT27i5m39bOzJIi05ZbzigUgB2WLA3e1p3rykNsxLG1mZH1zRyP9uGwhjIwXjlldltJypJHzptFksq4mNeX1jXwE8jRxbcxkYEbO9GY9Lb93OnoECdszC8xRXPtjBea0VtCSd8peHlCP57tltnP2rrRQiT9NSdywh8AsB739RC6c0JstluKSA9ozHtX/dzx/2DLFz2AtjLIc9Xn5MHR9c0ThGVA8XgdbgWPzi6QG+dNosqlwLH42N4PTmFN+XgvNmp6Ll9HCvui/vc+ue4SNWqsxgeDaYTD+GGY8QUJmwsZM2btLCqXD4n419bOjNhfuFOgyyj1uC1ataDhb6OAE6LAMWaG7a1g9oBOGepdKal7SkWP2iFnRREfgKW4hyqbBSNQ9V8PnoSc0sq4lRVCP1MgeKAb/fPTRpZ0oW4pr2Yf7WnsaNUt5ZtqSjP8+VD3SUwkQhCjV5UVOSz6xqQY+q+SkILW1swbmzKkeKZ0f5WC+9bSf/8fA+NvbmyXkKX4F0BHMqnUOcq+mjCT2Wu9Iev9k5FI03fG1ZTYxUVYxzZlWOufZfOjNs6c6OyzdrMMwEjGAajgpKhaS9QBMIQSbn8cX1+4GobBXhkuVrF1Zz7ryqcQWkD4bSYWq823YMsaY9E6bGizxwlYarVrVw/flzWVwdwy/6+FkfP+fj5XzaUg6fO7ONfz99NhBaSjL6GXq2ZpDu1BavLcLE5zoSCaU10rW4aVMfv9g+gBWJt4xqbl5xYhNnz60kKAZlr1qlwHUtUq4sW4sCGPYVD+xLYyUdbEsiZVjjUknBq+ZVAUeuGIglBASKnz89MMaKnV/lcvGCamZX2OXxA/x06wDKbFwaZihmSdZw1KG0RrgWv9jWz73H1XP27Ipy7LwrQyvznr3pckaa6VBySPF9xcce6OCuSxZR6Vjl9G0aeO/xDbx2YTUPdWbZOVxECJhT4XByQ5KFVSOZ1TVhVpvhYsCnH+4oPzmVDJSTJYz6u5TZ6CP3t3P2rAqaEna0NCtI2PCtM1s585fbyPhBWGlEgO8p8v5ITiKtodaVvGVpHTc91RMuaQNxV/KpU5p5deShKg9133ealBIT3LcvzeaBPMfWxgm0pjnh8KEVjTgi7I8Q0JHx+MOuQTDWpWGGYgTTcFQS1q70+dy6Lv7YnMKSIxl2zp1dwZuW1vKTJ3vCEljTbFNpkK5kbUeay+7Zw40vnVcuSm2JMCfsrKTDaxdWjzs3GGX92VJQDDTvvHsPm/bnQutShzluDwWlQVqC3X15PvHQPn547hwCStVL4MSGJNe8uIWP3L0Xy5WhYBZ91nZnOWd2FLcaJXq48fy5vG5hNRv6CjQlLc6eVcHy2nh4nchD90igANuW9A8VuW3PMMdG15QCTouqmZQqsvxs2wDDOT8s43VkumMwPCvMkqxhxqEneByI0hrLtbln5xB/2DUYZcXR0QM+fnIzNUmHoGR6TrddBTImuXljH2++fSe9+SBMCC5Ca82P9iZ9HT5KFUBKFqotw3jOt96xi59v6iuL5cHGOOlcaLBcix8/1cNvdw2WQ0ykCK/73uMaOH9BDUEhjCHFtbh+Qw/9RT+sHBIlRLeE4LULa/jsqmbes7yhLJY3bu6nJ++XHW8OagVPo8/j5lRrhC358Za+cl9Gt2cRfsH49c5BiKq2GAwzESOYhhmFINrPIwwfKf19IOHNVuOj+fy6LrzICrQir9AT6uO88/gGAm/E33U67UKUbceR/GJzP2f9egs3be0nF6gxjj62EOWk5aXnC4HmF08PcM6vt3HL5l6sScSylBjBEiN9mmwPURMWyvY0fPj+DnoLPpYI92xtKYhbku+d3UpdpYsfKCxLsqM/zxv/vIs9aQ9biknbXv1oJ197rIuUU5qXyfsyev5Gz+N0UBq0FKzvzrG2O1t+rhS6IwSs78nyaGcG4VoHTXJvMDxfmCVZw4wi0DDsBVhyJORi2Jt4UVVpkI7ksc4M33uyl3ceWxfWsIxu6O87rp6fbOln32AedQjtlvphuZKNPTn++dYdvGhWipfMquD8tkoWVro0Jm0kYXL27UMea9qHubcjzcMd6XAZ1J0852sx0GR9FRXFDpdwc/7kIqE0WLZkR0+WTz7YwbVntoWCEzkCzat0+fQpzXzk3na0LDkvDXLOwFbeckwtF82tYnF1DEsK9mc9HurKcvO2AW7b1s/xs1Kk/dBBylMaRwryE6QlKr0vMWukmHV6OkntI6QUqGLAjzb3cWpTsry/XNpj/s3OIXI536TCM8xoBN95zHw6DTMGKSbO6pM9MHvOKEqxiMkDMtpYAnJR8eJn0i6MWIOqGB3nyLJVCSNLtETiIV05zoHnQJxRtSlLhMWWp/6vGIaXaJLO2N3QUjag0V8ApCCs7qI00pW4MtrjVDosEB2EwipEWOdyNL7SFA8QrYnmTwO5g81f9NOSApX3OXt+NWtesziKcw0fWV+x/Keb2DVYiDyFp2zSYHjeMBamYUahNGQnsvym2Ncq3V/HnRe6fz7jdiEUPk24jwihsHlB+BhpI7RGYXqepuH5BwqNOGgwZOg5KyYex6ixQmRFR9VJlIa8r0otIKRAWrKcXWd8e+P7MvH8TaPPUfxoWOILFleH3sRKhUuxlhD8ec9wKJam7qVhhmME0zDjmMjpYzr30XHnibHnPdN2gbFCOEondPn1Q2hNjGQROtR+lERz3PMTCNdoI1FEWQxKjjajx3Nge5P1ZbrHlY8HEo6kEGgKWY859XHes7wBIIpvDfegb9zcZ+peGo4KjGAaZhzP9JZ5sPMO56342bb1bM5/JucezPv1SFxXa/ja6bM5qSFBT87nhIYECyojC5Nw7/bBrgx/3jE4Li+uwTATMYJpMBgOK6VUflUxyT8vqaU6NrLnGugwBMeOnIs++0gneV8hHauc5chgmKmYsBKDwXBYkaF3Ea+aV011VIbMGxUPWgrB+bd79nDH9kEsx1iXhqMDY2EaDIbDS+S23Fbh0JX1qYlJYpGTUXvG5759Gf7jsS7WdmawYtLsWxqOGkxYicFgOCLELMH8SpfamE3CDuM8OzIe2/vyQBhDa0IuDUcTxsI0GAxHhIKv2dybCxPKlnIHSoF0wp0gI5aGow0jmAaD4YggBAhbjgmh0WgjlIajFiOYBoPhiDCS8cgopOGFgfGSNRgMBoNhGhjBNBw1lFKpmepPBoPh+cAIpuGoQQeaoOCjD5Kk/EgjRZhAfbKyWTMJO4p7fLZdPVztGAxHM0YwDTMeAaA1NQmbly6ooTZhg9bP281beQov66EOobzV84Vf8PGzHvpZetocrnYMhqMZI5iGGY0o/aPgc6tm8edXLuKrL259XpZlrSiDzT8treOmVy3mdUvrQD1/wj0lUVadq1/Sxg0XLmR5fQICfejzFrXzuZfM4XsXLuTY+kQ45hk5aIPhyGIE03DEkCLMGVpaupTRHqQlJl7OPPB4SwisUX8P+4oBT4V1HycwdEa3b4mplw8FY4+dzvKqAFCakxuTvHlJDSc3JEE/s3FNtLx56P0/+HVfOa+aNy2ppSXpjLHKS32a6Dqj+yGiv18VtdN8QDsTnSMnqPplCYE9ybVK/TiQA+dpqs+TEXDDc4EJKzEcMZSnUIEGWyJtERY0DqKairZEWmJMTN7o44UtCLwgrJvlSLAEn36ogx881cOO4SIw9qZsCQiCqP2wBlZ4DTk+QF4KUIqw/VJAvSXG9WcyMp5isKDJeAopIHg244ru/lIQHuMHI520Zfj8AX0SIux24KmRF6OEAKX6nSX6Cz49eSsscj3qfOVrVOlarizXBZUi7C9KR6oskUJE7cgx7ZTfAwEqKkpdakTYstxPNARFP3zNGbkWjOpHuDE80rCGwPPDpAfR+z96Hi1bjMx7qZ/TfP8MhmeKEUzDYUcAWmmWNSZZVhPnb305tvXkaKuNsagyhgY2D+TpGi4ibBnWrQxGjn+8J8uOgQIrmlO0pRzWdWfZP1zkmIYkcyocHCnYMlAYIwyBp2isdFlSHcOVkoGiz1N9eYrFABEJCURi4SliMYvjmyqoci0GiwE7hwr0ZTywD77oMtrSUZ5iTl2chVWHPq613Vm6Mx5ChmLQVOmytCaOBHoKAVsGcvhFNa7/OgjN2uWNSZoSNhrYl/XY0psDIRDWSCHmAy07KQS+F9BWHeek+gS+1ty/L8NwMRRPFWiWNSRpSToUAsUTvTkyXoAjx1uIpfcZDUvqEsxOOQgE+7JFNkfp74QUOJbgvLm1ADzUlWGw4COEQGvNgpo4JzUk2J0usm5/NhwfELcFq2ZXUxezeLgrQ9dwkWMbkxxTE+fx3iw7evPMrQ3nvaAUm/vz9GW8MXNlMBxujGAaDjuWEPh+wNuW1vHJlU18+L4OOhqSfPm02TQmHLTWbOjL8d0ne7hpcy+OLfG8keM/8kAHlhBccUITLSmL1926k192dvGus+r56EmNfHn9fj71QDvCDu+uWsO/rmjiX46p4/i6BI4U9BcD1u3Pcu0TXazZPRSWj0KjfcVZcyr56IktnNacpMKxGPYU2wbz/OCpHm7c1IuUgoO58wggrzRvOK6BL546m+aEgzrEcV3yp538dnMvMm7xryc28fZj6jm2Ng5Abz5gfXeGL6/vZF1nBhFZX9pTLKlL8JlVszhzVorGuI0COjM+t+8d4kvrO9mXLjLZGq3vK9oqY9z40nm8tDXFtU/0cP/eYdCapGPx6VNauGRBNQsqY+SV5oneLB95oJ2sr8Y0KYRABYrGpMMnV7bw8jlVzK10kcCeTJE79g7z5fWd7B0qYNk2Xzh1NsfXxXnrnbv4xeZepCsJlObyExq5/IQG7m7P8Jpbt4fC7SuW1KW45YIFCOCVf3qaru4c/3JMHR8/uYn33LOXoeYUXzq1laakzVAh4Mn+PF9c18maPYMI24im4chgBNNwxMh4iq5swJmzKji+Ls5fOtNsHyhwbH2C82dX8tUXt9Kd87lt5wBIQcZT7MsEXNhWxeLqGGs60hQCxe50EWzJYDFgoKAZLoZyJoUgKAa856QmvnRqK0PFgJu29rFnqMCy+gQXza1med083nbnDh7syACwojHF/z1nHvUxm9/uGmRDT5bWSpfXzq/hP89oA+DGJ3uQ7uSJwQWQ8xXnz65gUXWM+57BuPKBYm+miFaa9yxv5EunzWZvxuO6Dd305DxOaUpx0dxqFlbFeNMdO8OcrBIW1SX46QULOKY2zm17hrhz7xCWELx6QQ3vXl6PLQUfvGcX/oHL0FJAoKhJuXzr7Dmc2pjka4/t5+P37wUpsAVctaqF9x3fyL6sx/c39tKX8zirtZLrz5yDlGJMm1prHEvyzTPbuHh+DRv78lz7eBdKw0vnVPK2Y+poSzm86Y4dZPM+P9vWzzGrWljZmOAXmzQKjetYnFifZOeQR0vSYVFVjMc6w/dpaU2MatfiF9sH+FtPFlyLdPR5Omd2BcfUxLl1zyB9OZ+zWis5uSHBV06fzav783RliggpTH4hw2HHCKbhiGHJcE/pxc0pPvVIOz/asB+0wHIlnzutlfcf38i7ltfzUGeaoYwXOXgIllTH+NADe/nd9gHwFdK1yvtb5fhHGS6Hzq+Pc9nyBoa8gCsfaufnT/VQ8lT57GmtfPjEJv55aT0PdmYRaD54QhOzkg5fXN/Jv6/rDM1TX/PAsRmuP7ONy45r5M97hujMeJPuiQkhKCrNivokn36knR9t6A69SQ9lXEG4RzivKcm7j2ugI+vxnnt385edg2CFjixfO6uNdx/bwLuOrefK+/eChpgt2DSQ577ONJ98oJ2sF4Cv+fPeIX52wQLOmlXBwroEm/dnkbYV9ReKgUZakm+d2caFbVX87Ol+rn5kH5YlCXzFCbMqeMOiWjqzPp98uINfbuwBBK4r+d5583j53GrSnor2LMMl5Dcd28AFbVWs787y9jW72LE/FLvv1SX4wblzOWt2Je84poHrH+ng8d4sSsOymjippEMmH7CkKcb8SpdtgwWOq4uzvC7GY/vS4Ehe1JQi0Jqn+vMUiwpEVGcTwarGFP/n7p3ct2MQNCxqTnHzy+bTVuFyXmsFP93Yi7RM2TDD4cd4yRqOGBpN3Bas68nyo019SNcmlnQIAs1/beplx3CR05pSYchDFNOYtAW37R3md9v6EVJgx+3oRjmucbTW/ENbFctq4tzbMczPt/Rhx22chA1ScN3f9vPqPz3NVY/sA6VZWhvngrZKNvTl+PdH90HRLzvN/PrJbm7dM8zxdXGW1yXAV0zmp1oa1/ryuKxDHpcbD8XswrYqjq2JcdPWfv7yVE+0yaoJ8j6fX9tJe8bj3NmVJFwLhOCp3jxvuWMnl9+7h2zBL/doqKjoLwbUxixqXavsySoAX4VOUV84vY3XLKjhT7uH+Oh9e8n5quyA8+LmFLOSDg90pvnl1n7suIObdCgGmq/9dT9ZX2GJ8uVwHYtXz68maUv+a2MvO7ozuEmHWMqloz/P9zf2YgOvmFdFrNLh8b4cT/XnOa4uzsLqGBR9Tm9OUeFKfry1l968z+nNFWAJYpbgjOYU/YWAezuGw85rjdaahCW4s32Y+/YOYyccnJTD03057mpPU2FL5la4mPVYw5HCWJiGI4bWoUX4RE8OoTVaCIpKISwZOqkM5rl4XjVNcZuSb6clBXvTxXAJEfCVxp4sZsCSLK6O4SnNxoECwlfgSLxAIyxBfz7gL3uHyjfcZbVxBJCyJT+8YEG5mZIjzXF18XINR4RAT7Ko96zHJcALNFiCZbUx+goBZ8+q4L8vWYoSI6pkSUnSliRsyaykw/aBfLk485L6OKc0pFhY5dKacji+LsGcChdf6VEhGuHPQGs+cXIzx9UlaE97XL12H/3ZIlbMIlBhPxZWunhas3mggAjCeSwGCmFLnh4q0JsPaE7aob4GiqbqGM1Jm4FiwJMDOaSUBBq0VkhLsHkgT0fWoyXhMK8yzpb9GTb05Xj70jqWVsfYsFtzWlOSvrzPX/Zl+KeFRU5vToIULKh0mVPh0pH1+GtvLnRi8sOZtKSgI1MMl+PRCB1anj0FH1sKUo6EyPHZrMkaDjdGMA1HFIEg66vSH6FlKKAQaLwoAD5mjxfEUlTDpGhAQtKW+AoyXgByxLjQGoQEKS2kAE8HJK3QqotZkhV18fL9tBSFkvEU67pz5P2DXXzyceWnOS4dnZi0LQINjXGbCldiHXD81sECxZIIak2Va7P6RbP5x4XV1MZsPKXpKwTsHC7Qn/dpSTpjdEJrcC3BivoExUBT5Vq8YVENn+3OjjLEBInSPPrh8ufoeUSE8ytG3S5cKYhbkowX4AcaJSj3XQnwlCbjK+K2wLUEQike6crwhkW1rKhL8MfqOMfWxtk2WGDHQI71PVlOa26kNeVwYn0y3L98up9cMcC2Jf6oMSk99vMx2kHLaKThSGIE03BEUVrTnAxDH0Tpm7+CypikxrXxlSbtqUO/0wlAafryATFb0BC30WrEshACtIJAq3AvS0BfwccSgvZMkUtv2wGMXLbkyGNLER5vT+70M9W4qlxJlXPwcQnCJeXevE+lI/nO9n6uXd9JPGbjRcupSmsKgca1BIUoxvHfVjTxruX1bB0o8KX1XTzRm6Ur5zNYDPjBufOYW+miRy1JKjRxS/LjLX3c05Hm62e08a5jG3isJ8evtvRixWwCXzFYDHAtQWNiZB5L43KloD5hj8yHEKQ9xbCnWFwVI+lIZFnABFJDypHUxy32ZX2GvQBtW9zbmWawGHBCfYJjauLMq3S5cXMfOuuzvjtLwhKcWJ9gWW2cKldw7740BKpccNpgeL4xn0TDEUMKKCjNi5tTVMVtdKAAgS4EHFeX4Pi6ONsHi+xOe2A9A69GpXm8N4cfaFY1pUilHPxiGP6gi4rj6xN846w5vGZxHUjBE305BosB8ypdqmIWA8NFBgsBg3mfgZzHwuoYTQkn3HacojOlcZ3WNPG4TqiP8/RBxiWFgEDzeG8WSwiOqY2R8RW9WY+hQsBg1iMXaJbXxYlbYcIAaUtOb0mS8RT/8XgX33+si4c7M+zsywGC2phVzh0w+joFX/GrHQP85qlufripB0cKPrWyhSUNSQJfQeRco7TmlMZEeR6FEKiCz1mzKqhxLQKtQ4tTwv5Mke1DBeK25LzWSpTW+FoTaI0KNGe2VNAQd9g2WKBjuIBwJNsHi2wayDO/yuX05hQxS3JP5OSzoS/P3ozHy+dUs6DKZceQx9/685QDMw2GGYBE6+D57oThhYrACzSzkw7/cXor9UkHW2uWtyT5xEnN1MYs7uxIs7knG1l0k+0ajjD6dWEJbt09yP1dGU5rSvGZU2ZRm7SwNMytjvPplS1cvqKBc2anANg3WODHW/toTbn8+4tbWVCfwJFhEoJXLazh969YxE8umE9bhQNKTRjKWBpXMdC0VbjjxvXxk8Nx3TXVuCKHJSzBrbuG+Mu+NBfNrebKVbNIujLci4tZfPaUFu66eAmfXTUrPE3DQCEIkw+oKIVO9ONV86pYUh0n6wfjnKQUYEmQrsW1j3expn2YJdUxrl41i5gVfme+c88wG/pyrGxI8plV4TzaWnPSrAquOqUlbGfUEi5a89+bQmedty2t53XHNuAIcARctKSWf13ewFAx4MbNvXieDvccfcVd7cM0JWzeuLiWzqzHo/sz4NrsGizwRG+Ol82pZFVjkvU9WXYP5hG2nPaSq9FVwxFF68AmUWGRS49JV2UwHA601iRtyc3b+jipPsm61y9jx1CRtgqXprjNU/15rt+wnyD66AkBtpj8oyhHv65B2pJ03udL6zu54ey5vPf4Bl45r4rOrMecCpe2lMvvdg7z1bWd4XKhJfn+k92c0pDkorlVnNSQYPNAgXi0x2cLwXVPdrNnqICwplqS1VQ5kpu39XNyQ5K1r1/GzgPG9Z2DjEsB0pIM532+GPX/0yubuXRRLbuHi7RWOBxbG2d3usjPtvUhlUZp+EtHmtcuqOHKk5qpiYVLnufOruCieVX0F3wa4mN3WcI5E2gFSgiynuIzj3awuDrOK+ZW8aGTmvnqun3sGyrwrQ3dfOOMNt61rJ5XzKlisOizvC7Bb3YMMFAIOKkhWR6/5Uge6kjz7b91c+VJzXz3rDlcsaIJDSypdrGl4Nt/6+aO3UMIN1rIChQPdWX54ArBMTVx/rh7kIF8gCUFQcFnbXeWc2ZXAIKH9vcSeAorZpeVUE7x+SjN8dFQcs1wFKI1JCosST79deJJAGNpGg4rmnD/a9tgkTfevoO79qapdm368j7f39jDP9+5k239eazIyikGmmFPUZyk3mXhgNeV0ghHct/eYd5w+w5ueKqHtKdoSTrsHC5w1aMdvGvNLrqyfugpKwU9WZ9337OLTz7cwdODRRZWuVS7Fn/YNcSb79jJtY91oZh6eTgfaIpK82Bnhktv38Hd7WlqXIu+fFAe19ZpjEvpsP9/2TvM62/fwfee6qGoNMtqY+R8zXUbunntrdvDTDyWREi4eWsf332yh+aEw1df3MbNL1vAPy6o5XOPdvLo/gxKazw1YpNlfUXaC8KlWq1xbMmW7hxffqyT7rzPW5fUclZrJUIKfraln7ev2cVte4ei907yjce7+fD97Qx5iqyvRpZ8dZj27t8f6+Sda3Zx254hko6gwpHc1Z7msnt287lH95W/3CjCfeFN/aGDj0ZzV/swBCo8xpLc25GmO++zP+dxT3saLBmeN8n7P5rSHBcm+ewYDM+CgHgS8umvC76z/hUkq/9AdijAOAEZDgO2EPgFn8+c3sonTm7hK4918oUHO8ARxKJcrYXIIUbYI3lPHSlwpMBTelyS76lel6Xk30LgRjlcg1JydTk2t2o5F6vSWI6FFXnWeoEOYy8dedClvVI/fKUpRtdwbYl4huMa3X8nSlquNPjRZqoc7YCkw3+W1yVYUh2nqBSP7s/Sky4Si1lYQpAPVPn4uCWjxAUjYldyOIrbMrTuFOSDMCmB9hXYkliUtMHzFEhIOKEPbGFU22VGnRMeo8vPTYQrwyokuUCNC5lMROfkfDXuvKnm8WBzbDA8C3ySVRbZwVfaQBO2K8pVGwyGw0Rk1KA0SFughaAQ5VcTUpSFoYQXaLzIgWaisI7JXlfR8qzWjLE+St6Vo6+hdbj3KazQGzYoxSuIMFPPdAyU0f0oiVnxWYxrdP+9UR0Qlggdb0a1FfrACJ7qyfFUdzYaqEA4MppbNeb/cd6PPJhGPReG0YgwfIaRfulozpRm5H2KQmNy3vh2omlDHHAOggkrp5QoBppioCa83+S8YGSgBzDVPB5sjg2GZ4zWYLsCaLLRbKWQ3Y3ttOJ7GmFU03B4sIUgZoc/y3Fz0aerJKZjEGF846SaNcXrIyEPEzx3AGNu5KOOn/Zq3qh+HHjdZzSuCdqZrK3yYbYoZyLSeiRectx1Rk/6ge1McPy48Yz5e+J29CHMfem4SedjqtvPlOcdfI4NhkNGa43tCArZ3Wi2St638gHy6XUkqyyE8A/egsEwNaWbcVfOY0Nvnq6cN+1v/YfiJft8cqj9ONz9Llnu6gAr7vnu15G+rvGSNTynCBEux+bT63jfygcEq1dLml/7Mdz4lyjmFegDk40YDM8IKURY2FmHDi4Gg8FwdCEC3LikmP8UXb/62sj3/uvX9WDZdYQedmZZ1nB4iJYKDQaD4ShDIyUEfh/vO6UBQLJG29xyiwVcSWW9QCmzLGs4fBixNBgMRyNK+VTWC+BKbrnFYo22JecS8GSjwNa3kh3aQLJSoE1MpsFgMBj+TtEEJCsF2aEN2PpWnmwUnEsgESLcXLps1T7yuf8hlrQnLQRoMBgMBsMLHYEglrTJ5/6Hy1btC58TekQYV6+xueY8n+vWfp5U9cfIpyUmkYHBYDAY/r7wiVcoMoNf4wOrriprIwfuMH1zS4zLlxb47uN3kqp6Ken+Igj3eemywWAwGAzPKbpIRa1LZugu/u3E88uaGDE2d1XfTR6rtcTzriaXLmC7LlqPz1FlMBgMBsMLCa0VtuuSSxfwvKtZrSV9N3mjDxm/V/n6Wyx+fmnAtx8+m2Td7/GLKbyCjzCWpsFgMBhegGhdxInZ2G6GbN+reP9p95a1cBQTO/fcsNbhslUe3157Gm78HuIVMdL9PmZP02AwGAwvLHwqam3y6QLF/Dm8f9XDZQ08gInLCVy2ymP1Gpv3r3qYzOCF6OC3ODGbsEqPCTkxGAwGw9FNqGUKJ2ajg9+SGbyQ9696mNVr7InEEg4WVj7aJL1+/eepbvgM+Qzksx5SOod9AAaDwWAwHGmU8ognHeIpGOz5Au9beRXARMuwozl4vOVqLanb6nD50gLfeeITxGOXEkudzFAPaKXQKMAyVU4MBoPBMCPRWgMBAomQkqoGKGQeI1+4hfee8BW+uSVG3xKPa8SUTq7TF7lbtMWlIuCrv66kdeXFDPZcRzxZhxOH7CAEvo+QYbE+gUngbjAYDIbnD02AQKMVWLZNshq8POSzfVQ3fID29b/j45cMl7VtGhyaVTi64RvWJgnsD5KsWklm8HxqGurwChAEkM+YYtQGg8FgeH7QGuIpsCxwYjDQ00eq+k6yQ+ux/G9x2aqw+vohiCU8k9TYWguuvtsqZT4A4DtPnEJl5VLSQx46OJ14xRXk0gFCGEvTYDAYDM8dWgckKizy6a8jrAepqHIYHt7Ce09YVz5m9Rqbq88Nyqlhp8n/B+KNvKskExj7AAAAAElFTkSuQmCC';
