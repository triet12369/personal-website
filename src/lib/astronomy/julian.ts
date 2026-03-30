/**
 * Julian date helpers
 * Based on Jean Meeus, "Astronomical Algorithms" (2nd ed.)
 */

/** Convert a JS Date to Julian Day Number */
export function dateToJD(date: Date): number {
  const Y = date.getUTCFullYear();
  const M = date.getUTCMonth() + 1;
  const D =
    date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400 +
    date.getUTCMilliseconds() / 86400000;

  let y = Y;
  let m = M;
  if (M <= 2) {
    y -= 1;
    m += 12;
  }

  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);

  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + D + B - 1524.5;
}

/** Days since J2000.0 (2000-Jan-1.5 TT ≈ UTC noon) */
export function j2000(date: Date): number {
  return dateToJD(date) - 2451545.0;
}

/** Convert Julian Day Number to JS Date (UTC) */
export function jdToDate(jd: number): Date {
  const jd0 = jd + 0.5;
  const Z = Math.floor(jd0);
  const F = jd0 - Z;

  let A: number;
  if (Z < 2299161) {
    A = Z;
  } else {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }

  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const day = B - D - Math.floor(30.6001 * E);
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;

  const dayFrac = F;
  const hours = dayFrac * 24;
  const h = Math.floor(hours);
  const mins = (hours - h) * 60;
  const m = Math.floor(mins);
  const secs = (mins - m) * 60;
  const s = Math.floor(secs);
  const ms = Math.round((secs - s) * 1000);

  return new Date(Date.UTC(year, month - 1, day, h, m, s, ms));
}

export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;
