export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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

export function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDate(yyyyMmDd: string): string {
  if (!yyyyMmDd || !/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return yyyyMmDd;
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const monthStr = SHORT_MONTHS[m - 1] || "";
  const dayStr = d.toString().padStart(2, "0");
  return `${dayStr} ${monthStr} ${y}`;
}

export function formatTime(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatMinutes(m: number): string {
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  return `${hours}h ${mins.toString().padStart(2, "0")}m`;
}

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] || "";
}
