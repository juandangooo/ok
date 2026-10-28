/**
 * Payroll: pick a pay period, see who worked and how many hours.
 *
 * Three tabs:
 *   Pay Period  - start date, end date, the two calendars
 *   Team        - names, calendar emails, nicknames
 *   Hours       - totals per person on top, every calendar entry underneath
 *
 * Every timed event on both calendars is listed. Nothing is dropped silently:
 * anything that isn't counted says why, and anything that needs a person to
 * decide is orange.
 *
 * Install: Extensions → Apps Script → replace everything with this file → Save → reload the sheet.
 * Then: Payroll → Set up sheet (once), and Payroll → Pull hours (every pay period).
 */

const SETUP = 'Pay Period';
const HOURS = 'Hours';
const TEAM = 'Team';
const EVENTS_CALENDAR = 'fern@hellhoundaudio.com';
const SHOP_CALENDAR = 'c_64e8d238a2cc1d14fe784b3ece21e4119dc5b5a6eded10b9076b10231ce71e52@group.calendar.google.com';
const OLD_ROSTER = 'Roster · reference';
const NICKNAMES = { 'Fernando Andrade': 'Fern', 'Michelle Ferina': 'Shelly', 'Johanna Henao': 'Joha', 'Gustavo Murcia': 'Tavo' };
const TEAM_ROW = 6;
const LEGACY_TEAM_ROW = 12;
const TEAM_ROWS = 100;

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
  if (sh && ui.alert('Rebuild the sheet?', 'Dates reset. The team list is kept.', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;

  const team = currentTeam(ss);
  if (!sh) sh = ss.insertSheet(SETUP, 0);

  sh.clear();
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).clearDataValidations();
  ss.setSpreadsheetTimeZone('America/New_York');
  styleSheet(sh, [24, 170, 320, 140]);

  const end = lastSaturday();
  const start = new Date(end);
  start.setDate(end.getDate() - 13);

  title(sh, 'Payroll', 'Pick the dates, then click Payroll → Pull hours. People live on the Team tab.');
  label(sh.getRange('B5:B8'), [['START'], ['END'], ['EVENTS CALENDAR'], ['SHOP / OFFICE CALENDAR']]);
  sh.getRange('C5:C6')
    .setValues([[start], [end]])
    .setNumberFormat('ddd, mmm d, yyyy')
    .setHorizontalAlignment('left')
    .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build());
  sh.getRange('C7:C8').setValues([[EVENTS_CALENDAR], [SHOP_CALENDAR]]).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  sh.getRange('C5:C8').setBackground(SOFT);


  const teamSh = ss.getSheetByName(TEAM) || ss.insertSheet(TEAM, 1);
  teamSh.clear();
  styleSheet(teamSh, [24, 200, 320, 160]);
  title(teamSh, 'Team', 'A person counts when they are invited by this email, or named in the event title.');
  header(teamSh.getRange(TEAM_ROW - 1, 2, 1, 3), ['NAME', 'CALENDAR EMAIL', 'ALSO CALLED']);
  if (team.length) teamSh.getRange(TEAM_ROW, 2, team.length, 3).setValues(team);
  teamSh.getRange(TEAM_ROW, 2, TEAM_ROWS, 3).setBackground(SOFT).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);

  removeOldTabs(ss, ui);
  sh.activate();
  sh.getRange('C5').activate();
}

function pullHours() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SETUP);
  if (!sh) return SpreadsheetApp.getUi().alert('First click Payroll → Set up sheet.');

  const [[start], [end], [eventsCal], [shopCal]] = sh.getRange('C5:C8').getValues();
  if (!(start instanceof Date) || !(end instanceof Date) || end < start) {
    return stop(sh, 'C5', 'Pick a start and an end date. Double-click a date to get the calendar picker.');
  }
  const teamSh = ss.getSheetByName(TEAM);
  if (!teamSh) return SpreadsheetApp.getUi().alert('The Team tab is missing. Click Payroll → Set up sheet.');
  const team = teamSh.getRange(TEAM_ROW, 2, TEAM_ROWS, 3).getValues()
    .filter(r => String(r[0]).trim())
    .map(([name, email, aka]) => ({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      aka: String(aka).split(',').map(s => s.trim()).filter(String),
    }));
  if (!team.length) return stop(teamSh, 'B' + TEAM_ROW, 'Add at least one person to the Team tab.');

  const until = new Date(end);
  until.setDate(until.getDate() + 1);
  const shifts = [];
  for (const [cell, id, kind] of [['C7', eventsCal, 'Event'], ['C8', shopCal, 'Shop/Office']]) {
    if (!String(id).trim()) continue;
    const cal = CalendarApp.getCalendarById(String(id).trim());
    if (!cal) return stop(sh, cell, `Can't open the calendar "${id}". Ask its owner to share it with you ("See all event details").`);
    for (const ev of cal.getEvents(start, until)) shifts.push(...readEvent(ev, kind, team, start));
  }

  writeHours(ss, start, end, tally(shifts));
}

// One shift per person on the event: invited guests first, then anyone named in the title.
function readEvent(ev, kind, team, periodStart) {
  const allDay = ev.isAllDayEvent();
  const base = {
    title: ev.getTitle(),
    kind,
    allDay,
    start: allDay ? new Date(Math.max(ev.getAllDayStartDate(), periodStart)) : ev.getStartTime(),
    end: ev.getEndTime(),
  };
  const found = new Map();
  for (const guest of ev.getGuestList()) {
    const email = guest.getEmail().toLowerCase();
    const member = team.find(t => t.email && t.email === email);
    const who = member ? member.name : email;
    found.set(who, { ...base, who, known: !!member, how: 'Invited', declined: String(guest.getGuestStatus()) === 'NO' });
  }
  for (const t of team) {
    if (!found.has(t.name) && [t.name, ...t.aka].some(n => mentions(base.title, n))) {
      found.set(t.name, { ...base, who: t.name, known: true, how: 'Named in title', declined: false });
    }
  }
  return found.size ? [...found.values()] : [{ ...base, who: '', known: false, how: '', declined: false }];
}

// Turns shifts into sheet rows and per-person totals. Overlapping time is only counted once.
function tally(shifts) {
  shifts.sort((a, b) => a.start - b.start || a.who.localeCompare(b.who));
  const busyUntil = {};
  const totals = new Map();
  let flagged = 0;

  const rows = shifts.map(s => {
    const full = (s.end - s.start) / 36e5;
    let hours = '';
    let note = '';
    let tone = '';
    if (s.allDay) [note, tone] = ['All-day, not counted', 'muted'];
    else if (!s.who) [note, tone] = ['No one invited or named', 'muted'];
    else if (s.declined) [note, tone] = ['Declined the invite, not counted', 'muted'];
    else if (!s.known) [note, tone] = ['Not on the team list, add them to count', 'warn'];
    else {
      const from = Math.max(+s.start, busyUntil[s.who] || 0);
      hours = Math.max(0, s.end - from) / 36e5;
      busyUntil[s.who] = Math.max(busyUntil[s.who] || 0, +s.end);
      if (hours < full) [note, tone] = [`Overlaps another shift, counted ${round(hours)} of ${round(full)} h`, 'warn'];
      const t = totals.get(s.who) || { shop: 0, events: 0, shifts: 0 };
      t[s.kind === 'Event' ? 'events' : 'shop'] += hours;
      t.shifts++;
      totals.set(s.who, t);
    }
    if (tone === 'warn') flagged++;
    const day = new Date(s.start);
    day.setHours(0, 0, 0, 0);
    return { tone, values: [day, s.who || '—', s.title, s.allDay ? '' : s.start, s.allDay ? '' : s.end, hours, s.how, note] };
  });

  const people = [...totals]
    .map(([name, t]) => [name, t.shop, t.events, t.shop + t.events, t.shifts])
    .sort((a, b) => b[3] - a[3]);
  return { rows, people, flagged };
}

function writeHours(ss, start, end, { rows, people, flagged }) {
  const sh = ss.getSheetByName(HOURS) || ss.insertSheet(HOURS, 1);
  sh.clear();
  styleSheet(sh, [24, 150, 150, 280, 80, 80, 70, 120, 280]);

  const tz = ss.getSpreadsheetTimeZone();
  const fmt = (d, pattern) => Utilities.formatDate(d, tz, pattern);
  const check = flagged ? `   ·   ${flagged} ${flagged === 1 ? 'row needs' : 'rows need'} a look (orange)` : '   ·   nothing to review';
  title(sh, 'Hours', `${fmt(start, 'MMM d')} – ${fmt(end, 'MMM d, yyyy')}   ·   pulled ${fmt(new Date(), 'MMM d, h:mm a')}${check}`);
  if (flagged) sh.getRange('B3').setFontColor(WARN_INK);

  // Totals per person
  let r = 5;
  header(sh.getRange(r, 2, 1, 5), ['PERSON', 'SHOP / OFFICE', 'EVENTS', 'TOTAL HOURS', 'SHIFTS']);
  if (people.length) {
    band(sh.getRange(r + 1, 2, people.length, 5).setValues(people));
    r += people.length;
  }
  r++;
  const sum = i => people.reduce((s, p) => s + p[i], 0);
  sh.getRange(r, 2, 1, 5).setValues([['Total', sum(1), sum(2), sum(3), sum(4)]]).setFontWeight('bold')
    .setBorder(true, null, null, null, null, null, LINE, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(6, 2, r - 5, 5).setHorizontalAlignment('left');
  sh.getRange(6, 3, r - 5, 3).setNumberFormat('0.00');

  // Every calendar entry
  r += 3;
  header(sh.getRange(r, 2, 1, 8), ['DATE', 'WHO', 'EVENT', 'START', 'END', 'HOURS', 'HOW WE KNOW', 'NOTE']);
  if (!rows.length) {
    sh.getRange(r + 1, 2).setValue('No events in this period.').setFontColor(MUTED);
  } else {
    const detail = sh.getRange(r + 1, 2, rows.length, 8).setValues(rows.map(x => x.values))
      .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP).setHorizontalAlignment('left');
    band(detail);
    sh.getRange(r + 1, 2, rows.length, 1).setNumberFormat('ddd, mmm d');
    sh.getRange(r + 1, 5, rows.length, 2).setNumberFormat('h:mm am/pm');
    sh.getRange(r + 1, 7, rows.length, 1).setNumberFormat('0.00');
    rows.forEach((x, i) => {
      const line = sh.getRange(r + 1 + i, 2, 1, 8);
      if (x.tone === 'warn') line.setBackground(WARN).setFontColor(WARN_INK);
      else if (x.tone === 'muted') line.setFontColor(MUTED);
    });
  }

  sh.activate();
}

// The team list from wherever it lives now: the Team tab, the bottom of an older
// Pay Period tab, or the original roster tab.
function currentTeam(ss) {
  const rows = (sh, row) => sh.getRange(row, 2, TEAM_ROWS, 3).getValues().filter(r => String(r[0]).trim());
  const team = ss.getSheetByName(TEAM);
  if (team) return rows(team, TEAM_ROW);
  const setup = ss.getSheetByName(SETUP);
  if (setup && String(setup.getRange(LEGACY_TEAM_ROW - 1, 2).getValue()) === 'NAME') return rows(setup, LEGACY_TEAM_ROW);
  return oldRoster(ss);
}

// Copies names and calendar emails from the old roster tab, if it's there.
function oldRoster(ss) {
  const sh = ss.getSheetByName(OLD_ROSTER);
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  const top = values.findIndex(r => r.includes('FULL NAME'));
  if (top < 0) return [];
  const col = name => values[top].indexOf(name);
  const [n, cal, alt] = [col('FULL NAME'), col('CALENDAR EMAIL'), col('EMAIL · ROSTER')];
  return values.slice(top + 1)
    .filter(r => String(r[n]).trim())
    .map(r => {
      const name = String(r[n]).trim();
      const email = [r[cal], r[alt]].map(String).find(e => e.includes('@')) || '';
      return [name, email.trim(), NICKNAMES[name] || ''];
    });
}

function removeOldTabs(ss, ui) {
  const old = ss.getSheets().filter(s => ![SETUP, TEAM, HOURS].includes(s.getName()));
  if (!old.length) return;
  const names = old.map(s => '•  ' + s.getName()).join('\n');
  if (ui.alert('Remove the old tabs?', names + '\n\nThe team list has already been copied into the Team tab.', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  old.forEach(s => ss.deleteSheet(s));
}

function styleSheet(sh, widths) {
  sh.setHiddenGridlines(true);
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns())
    .setFontFamily(FONT).setFontSize(10).setFontColor(INK).setFontWeight('normal')
    .setVerticalAlignment('middle').setBackground(null).setBorder(false, false, false, false, false, false);
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

function mentions(text, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^a-z])' + escaped + '([^a-z]|$)', 'i').test(text);
}

function round(h) {
  return Math.round(h * 100) / 100;
}

function lastSaturday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 1) % 7));
  return d;
}
