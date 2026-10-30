const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("Missing env var: DATABASE_URL");
}

const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
  throw new Error("Missing env var: AUTH_SECRET");
}

if (AUTH_SECRET.length < 32) {
  throw new Error("AUTH_SECRET must be at least 32 characters");
}

const halfDayMinutesRaw = process.env.HALF_DAY_THRESHOLD_MINUTES;
const HALF_DAY_THRESHOLD_MINUTES =
  halfDayMinutesRaw !== undefined && halfDayMinutesRaw !== ""
    ? Number(halfDayMinutesRaw)
    : 240;

const DEFAULT_EMPLOYEE_PASSWORD =
  process.env.DEFAULT_EMPLOYEE_PASSWORD || "Welcome@123";

const COMPANY_NAME = process.env.COMPANY_NAME || "CorpERP Pvt. Ltd.";

export const env = {
  DATABASE_URL,
  AUTH_SECRET,
  HALF_DAY_THRESHOLD_MINUTES,
  DEFAULT_EMPLOYEE_PASSWORD,
  COMPANY_NAME,
};
