/**
 * Payroll: pick a pay period, see who worked and how many hours.
 *
 * Two tabs:
 *   Pay Period  - start date, end date, calendar, team names
 *   Hours       - totals per person on top, every shift underneath
 *
 * Install: Extensions → Apps Script → paste this file → Save → reload the sheet.
 * Then: Payroll → Set up sheet (once), and Payroll → Pull hours (every pay period).
 */

const SETUP = 'Pay Period';
const HOURS = 'Hours';
const DEFAULT_CALENDAR = 'fern@hellhoundaudio.com';

const FONT = 'Inter';
const INK = '#1f2328';
const MUTED = '#8a8f98';
const LINE = '#e6e8eb';
const SOFT = '#f6f7f9';
const WARN = '#fff4e5';
const WARN_INK = '#a15c00';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Payroll')
    .addItem('Pull hours', 'pullHours')
    .addSeparator()
    .addItem('Set up sheet', 'setup')
    .addToUi();
}

function setup() {
  const ss = SpreadsheetApp.getActive();
  const ui = SpreadsheetApp.getUi();
  let sh = ss.getSheetByName(SETUP);
  if (sh && ui.alert('Rebuild the Pay Period tab?', 'This resets the dates and team list.', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  if (!sh) sh = ss.insertSheet(SETUP, 0);

  sh.clear();
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).clearDataValidations();
  ss.setSpreadsheetTimeZone('America/New_York');
  styleSheet(sh, [24, 110, 280]);

  const end = lastSaturday();
  const start = new Date(end);
  start.setDate(end.getDate() - 13);

  title(sh, 'Payroll', 'Pick the dates, list the team, then click Payroll → Pull hours.');
  label(sh.getRange('B5:B7'), [['START'], ['END'], ['CALENDAR']]);
  sh.getRange('C5:C6')
    .setValues([[start], [end]])
    .setNumberFormat('ddd, mmm d, yyyy')
    .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build());
  sh.getRange('C7').setValue(DEFAULT_CALENDAR);
  sh.getRange('C5:C7').setBackground(SOFT);

  label(sh.getRange('B9'), [['TEAM']]);
  sh.getRange('C9').setValue('One name per row, spelled like on the calendar').setFontColor(MUTED).setFontSize(9);
  sh.getRange('C10:C11').setValues([['Fern'], ['Juan']]);
  sh.getRange('C10:C29').setBackground(SOFT);

  const blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
  sh.activate();
  sh.getRange('C5').activate();
}

function pullHours() {
  const ss = SpreadsheetApp.getActive();
  const setupSh = ss.getSheetByName(SETUP);
  if (!setupSh) return SpreadsheetApp.getUi().alert('First click Payroll → Set up sheet.');

  const [[start], [end], [calendars]] = setupSh.getRange('C5:C7').getValues();
  const team = setupSh.getRange('C10:C29').getValues().map(r => String(r[0]).trim()).filter(String);
  if (!(start instanceof Date) || !(end instanceof Date) || end < start) {
    return stop(setupSh, 'C5', 'Pick a start and an end date. Double-click a date to get the calendar picker.');
  }
  if (!team.length) return stop(setupSh, 'C10', 'Add at least one name to the team list.');

  const until = new Date(end);
  until.setDate(until.getDate() + 1);
  const events = [];
  for (const id of String(calendars).split(',').map(s => s.trim()).filter(String)) {
    const cal = CalendarApp.getCalendarById(id);
    if (!cal) {
      return stop(setupSh, 'C7', `Can't open the calendar "${id}". Ask its owner to share it with you ("See all event details").`);
    }
    events.push(...cal.getEvents(start, until));
  }
  events.sort((a, b) => a.getStartTime() - b.getStartTime());

  // A name counts if it appears anywhere in the title, description or guest list.
  const matchers = team.map(name => ({ name, re: new RegExp('(^|[^a-z])' + escapeRe(name) + '([^a-z]|$)', 'i') }));
  const totals = new Map(team.map(name => [name, { hours: 0, shifts: 0 }]));
  const rows = [];
  for (const ev of events) {
    const allDay = ev.isAllDayEvent();
    const text = [ev.getTitle(), ev.getDescription(), ...ev.getGuestList().map(g => g.getName() + ' ' + g.getEmail())].join(' ');
    const who = matchers.filter(m => m.re.test(text)).map(m => m.name);
    const day = allDay ? new Date(Math.max(ev.getAllDayStartDate(), start)) : ev.getStartTime();
    const hours = allDay ? '' : (ev.getEndTime() - ev.getStartTime()) / 36e5;
    const note = allDay ? 'All-day, not counted' : who.length ? '' : 'No team name found';

    for (const person of who.length ? who : ['—']) {
      rows.push([day, person, ev.getTitle(), allDay ? '' : ev.getStartTime(), allDay ? '' : ev.getEndTime(), hours, note]);
      if (who.length && !allDay) {
        const t = totals.get(person);
        t.hours += hours;
        t.shifts++;
      }
    }
  }

  writeHours(ss, start, end, totals, rows);
}

function writeHours(ss, start, end, totals, rows) {
  const sh = ss.getSheetByName(HOURS) || ss.insertSheet(HOURS, 1);
  sh.clear();
  styleSheet(sh, [24, 110, 110, 300, 90, 90, 70, 170]);

  const tz = ss.getSpreadsheetTimeZone();
  const fmt = (d, pattern) => Utilities.formatDate(d, tz, pattern);
  title(sh, 'Hours', `${fmt(start, 'MMM d')} – ${fmt(end, 'MMM d, yyyy')}   ·   pulled ${fmt(new Date(), 'MMM d, h:mm a')}`);

  // Totals per person
  let r = 5;
  const summary = [...totals].sort((a, b) => b[1].hours - a[1].hours).map(([name, t]) => [name, t.hours, t.shifts]);
  header(sh.getRange(r, 2, 1, 3), ['PERSON', 'HOURS', 'SHIFTS']);
  band(sh.getRange(r + 1, 2, summary.length, 3).setValues(summary).setHorizontalAlignment('left'));
  r += summary.length + 1;
  sh.getRange(r, 2, 1, 2).setValues([['Total', summary.reduce((s, x) => s + x[1], 0)]]).setFontWeight('bold');
  sh.getRange(r, 2, 1, 3).setHorizontalAlignment('left')
    .setBorder(true, null, null, null, null, null, LINE, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(6, 3, r - 5, 1).setNumberFormat('0.00');

  // Every shift
  r += 3;
  header(sh.getRange(r, 2, 1, 7), ['DATE', 'WHO', 'EVENT', 'START', 'END', 'HOURS', 'NOTE']);
  if (!rows.length) {
    sh.getRange(r + 1, 2).setValue('No events in this period.').setFontColor(MUTED);
  } else {
    const detail = sh.getRange(r + 1, 2, rows.length, 7).setValues(rows).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
    band(detail);
    sh.getRange(r + 1, 2, rows.length, 1).setNumberFormat('ddd, mmm d');
    sh.getRange(r + 1, 5, rows.length, 2).setNumberFormat('h:mm am/pm');
    sh.getRange(r + 1, 7, rows.length, 1).setNumberFormat('0.00');
    rows.forEach((row, i) => {
      const line = sh.getRange(r + 1 + i, 2, 1, 7);
      if (row[6] === 'No team name found') line.setBackground(WARN).setFontColor(WARN_INK);
      else if (row[6]) line.setFontColor(MUTED);
    });
  }

  sh.activate();
}

function styleSheet(sh, widths) {
  sh.setHiddenGridlines(true);
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns())
    .setFontFamily(FONT).setFontSize(10).setFontColor(INK).setVerticalAlignment('middle');
  sh.setRowHeights(1, sh.getMaxRows(), 28);
  widths.forEach((w, i) => sh.setColumnWidth(i + 1, w));
}

function title(sh, text, subtitle) {
  sh.getRange('B2').setValue(text).setFontSize(18).setFontWeight('bold');
  sh.getRange('B3').setValue(subtitle).setFontColor(MUTED);
}

function label(range, values) {
  range.setValues(values).setFontSize(9).setFontWeight('bold').setFontColor(MUTED);
}

function header(range, labels) {
  range.setValues([labels]).setFontSize(9).setFontWeight('bold').setFontColor(MUTED)
    .setBorder(null, null, true, null, null, null, LINE, SpreadsheetApp.BorderStyle.SOLID);
}

function band(range) {
  range.setBackgrounds(range.getValues().map((row, i) => row.map(() => (i % 2 ? SOFT : '#ffffff'))));
}

function stop(sh, a1, message) {
  sh.activate();
  sh.getRange(a1).activate();
  SpreadsheetApp.getUi().alert(message);
}

function lastSaturday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 1) % 7));
  return d;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
