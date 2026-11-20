// Date helpers for the calendar pages. Everything works on plain 'yyyy-MM-dd' strings via UTC day
// numbers, so time zones and daylight saving can never shift a date by a day.

export const pad = (n) => (n < 10 ? '0' : '') + n;
export const dayNum = (s) => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
export const dayStr = (n) => { const d = new Date(n * 86400000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
export const addDays = (s, n) => dayStr(dayNum(s) + n);
export const weekday = (s) => new Date(dayNum(s) * 86400000).getUTCDay(); // 0 = Sunday
export const monthOf = (s) => s.slice(0, 7);
export const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1-12

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; // the phone's own local date
}

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function monthLabel(s) {
  const [y, m] = s.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function longDay(s) {
  const d = new Date(dayNum(s) * 86400000);
  return `${DAY_NAMES[d.getUTCDay()]}, ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function shortDay(s) {
  const d = new Date(dayNum(s) * 86400000);
  return `${DAY_NAMES[d.getUTCDay()].slice(0, 3)} ${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** '14:30' -> '2:30 PM' */
export function fmtTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}

export const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + (m || 0); };
export const fromMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/** The 7-column grid of dates (Sunday first) that covers a whole month. */
export function monthGrid(anchor) {
  const first = `${anchor.slice(0, 7)}-01`;
  const [y, m] = anchor.split('-').map(Number);
  const last = `${anchor.slice(0, 7)}-${pad(daysInMonth(y, m))}`;
  const start = addDays(first, -weekday(first));
  const end = addDays(last, 6 - weekday(last));
  const days = [];
  for (let n = dayNum(start); n <= dayNum(end); n++) days.push(dayStr(n));
  return { start, end, days };
}

export function shiftMonth(anchor, delta) {
  const [y, m] = anchor.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12), nm = (total % 12) + 1;
  const day = Math.min(Number(anchor.slice(8, 10)), daysInMonth(ny, nm));
  return `${ny}-${pad(nm)}-${pad(day)}`;
}

export const money = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
