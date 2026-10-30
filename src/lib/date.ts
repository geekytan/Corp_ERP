const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date()
  );
}

export function currentYearIST(): number {
  return parseInt(todayIST().slice(0, 4), 10);
}

export function toDateOnly(s: string): Date {
  return new Date(s + "T00:00:00.000Z");
}

export function fromDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(s: string, n: number): string {
  const d = toDateOnly(s);
  d.setUTCDate(d.getUTCDate() + n);
  return fromDateOnly(d);
}

export function isWeekday(s: string): boolean {
  const day = toDateOnly(s).getUTCDay();
  return day >= 1 && day <= 5;
}

export function eachDay(start: string, end: string): string[] {
  if (start > end) return [];
  const days: string[] = [];
  let curr = start;
  while (curr <= end) {
    days.push(curr);
    curr = addDays(curr, 1);
  }
  return days;
}

export function eachWeekday(start: string, end: string): string[] {
  return eachDay(start, end).filter(isWeekday);
}

export function weekdaysBetween(start: string, end: string): number {
  return eachWeekday(start, end).length;
}

export function monthBounds(
  year: number,
  month: number
): { start: string; end: string } {
  const start = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-01`;
  const end = fromDateOnly(new Date(Date.UTC(year, month, 0)));
  return { start, end };
}

export function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

export function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

export function isValidDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = toDateOnly(s);
  if (isNaN(d.getTime())) return false;
  return fromDateOnly(d) === s;
}

export function istToUtc(dateStr: string, hhmm: string): Date {
  return new Date(`${dateStr}T${hhmm}:00+05:30`);
}

export function monthLabel(month: number, year: number): string {
  return `${SHORT_MONTHS[month - 1]} ${year}`;
}
