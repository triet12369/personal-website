/**
 * Coordinate transforms: RA/Dec ↔ Alt/Az
 * Based on Jean Meeus, "Astronomical Algorithms" (2nd ed.) Ch. 13
 */

import { dateToJD, DEG_TO_RAD, RAD_TO_DEG } from './julian';

/** Greenwich Mean Sidereal Time in degrees (0–360), given JD */
export function greenwichSiderealTime(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  let theta =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;
  theta = ((theta % 360) + 360) % 360;
  return theta;
}

/** Local Apparent Sidereal Time in degrees */
export function localSiderealTime(jd: number, lonDeg: number): number {
  const gst = greenwichSiderealTime(jd);
  return ((gst + lonDeg) % 360 + 360) % 360;
}

export type AltAz = { alt: number; az: number };

/**
 * Convert equatorial (RA/Dec) to horizontal (Alt/Az) coordinates.
 * @param raDeg  Right Ascension in degrees
 * @param decDeg Declination in degrees
 * @param latDeg Observer latitude in degrees
 * @param lonDeg Observer longitude in degrees
 * @param jd     Julian Day Number
 */
export function raDecToAltAz(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lonDeg: number,
  jd: number,
): AltAz {
  const lst = localSiderealTime(jd, lonDeg);
  const hourAngle = ((lst - raDeg) % 360 + 360) % 360;

  const H = hourAngle * DEG_TO_RAD;
  const dec = decDeg * DEG_TO_RAD;
  const lat = latDeg * DEG_TO_RAD;

  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(H);
  const alt = Math.asin(sinAlt) * RAD_TO_DEG;

  const cosAz =
    (Math.sin(dec) - Math.sin(alt * DEG_TO_RAD) * Math.sin(lat)) /
    (Math.cos(alt * DEG_TO_RAD) * Math.cos(lat));
  const azRaw = Math.acos(Math.max(-1, Math.min(1, cosAz))) * RAD_TO_DEG;
  const az = Math.sin(H) > 0 ? 360 - azRaw : azRaw;

  return { alt, az };
}

/** True if the given altitude is above the horizon (>0°) */
export function isAboveHorizon(alt: number): boolean {
  return alt > 0;
}

/**
 * Estimate rise/set times for an object by iterative daily search.
 * Returns UTC Date or null if circumpolar / never rises.
 */
export function riseSetTime(
  raDecFn: (date: Date) => { ra: number; dec: number },
  latDeg: number,
  lonDeg: number,
  date: Date,
  rising: boolean,
): Date | null {
  // Binary search for the crossing over the horizon
  const startMs = new Date(date).setUTCHours(0, 0, 0, 0);
  let lo = startMs;
  let hi = startMs + 86400000;

  // Sample altitude at start and end to find a sign change
  const getAlt = (ms: number): number => {
    const d = new Date(ms);
    const { ra, dec } = raDecFn(d);
    const { alt } = raDecToAltAz(ra, dec, latDeg, lonDeg, dateToJD(d));
    return alt;
  };

  // Find a bracket where alt crosses zero
  // Sample 24 points to locate a bracket
  const STEPS = 144; // every 10 min
  const stepMs = 86400000 / STEPS;
  let prevAlt = getAlt(lo);
  let found = false;

  for (let i = 1; i <= STEPS; i++) {
    const ms = lo + i * stepMs;
    const curAlt = getAlt(ms);
    const crossed = rising ? prevAlt < 0 && curAlt >= 0 : prevAlt >= 0 && curAlt < 0;
    if (crossed) {
      lo = ms - stepMs;
      hi = ms;
      found = true;
      break;
    }
    prevAlt = curAlt;
  }

  if (!found) return null;

  // Refine with binary search
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const midAlt = getAlt(mid);
    if (rising) {
      if (midAlt < 0) lo = mid;
      else hi = mid;
    } else {
      if (midAlt >= 0) lo = mid;
      else hi = mid;
    }
  }

  return new Date((lo + hi) / 2);
}
