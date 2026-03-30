/**
 * Solar position, sunrise/sunset, and twilight times.
 * Based on Jean Meeus, "Astronomical Algorithms" (2nd ed.) Ch. 25–26
 */

import { dateToJD, j2000, DEG_TO_RAD, RAD_TO_DEG } from './julian';
import { raDecToAltAz, AltAz } from './coordinates';

export type SolarPosition = { ra: number; dec: number; distance: number };

/** Compute Sun's apparent RA (degrees) and Dec (degrees) */
export function solarPosition(date: Date): SolarPosition {
  const T = j2000(date) / 36525;

  // Geometric mean longitude (degrees)
  const L0 = ((280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360 + 360) % 360;

  // Mean anomaly (degrees)
  const M = ((357.52911 + 35999.05029 * T - 0.0001537 * T * T) % 360 + 360) % 360;
  const Mrad = M * DEG_TO_RAD;

  // Equation of center
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad);

  // Sun's true longitude
  const sunLon = L0 + C;

  // Apparent longitude (corrected for aberration + nutation)
  const omega = 125.04 - 1934.136 * T;
  const lambda = sunLon - 0.00569 - 0.00478 * Math.sin(omega * DEG_TO_RAD);

  // Mean obliquity
  const eps0 = 23.439291111 - 0.013004167 * T - 1.638889e-7 * T * T + 5.036111e-7 * T * T * T;
  const eps = eps0 + 0.00256 * Math.cos(omega * DEG_TO_RAD);

  const lambdaRad = lambda * DEG_TO_RAD;
  const epsRad = eps * DEG_TO_RAD;

  // RA and Dec
  const ra = (Math.atan2(Math.cos(epsRad) * Math.sin(lambdaRad), Math.cos(lambdaRad)) * RAD_TO_DEG + 360) % 360;
  const dec = Math.asin(Math.sin(epsRad) * Math.sin(lambdaRad)) * RAD_TO_DEG;

  // Sun-Earth distance in AU
  const distance = 1.000001018 * (1 - 0.016708634 * 0.016708634) / (1 + 0.016708634 * Math.cos((M + C) * DEG_TO_RAD));

  return { ra, dec, distance };
}

/** Sun altitude/azimuth for an observer */
export function sunAltAz(latDeg: number, lonDeg: number, date: Date): AltAz {
  const { ra, dec } = solarPosition(date);
  return raDecToAltAz(ra, dec, latDeg, lonDeg, dateToJD(date));
}

export type SunTimes = {
  sunrise: Date | null;
  sunset: Date | null;
  civilDawn: Date | null;
  civilDusk: Date | null;
  nauticalDawn: Date | null;
  nauticalDusk: Date | null;
  astronomicalDawn: Date | null;
  astronomicalDusk: Date | null;
};

/**
 * Find the UTC time when the sun crosses a given altitude on a given date.
 * @param targetAlt Sun center altitude in degrees (e.g. -0.833 for rise/set)
 * @param rising    true = rising, false = setting
 */
function sunCrossing(latDeg: number, lonDeg: number, date: Date, targetAlt: number, rising: boolean): Date | null {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);

  const STEPS = 288; // 5-min buckets
  const stepMs = 86400000 / STEPS;

  const getAlt = (ms: number) => {
    const d = new Date(ms);
    return sunAltAz(latDeg, lonDeg, d).alt - targetAlt;
  };

  let prev = getAlt(dayStart.getTime());
  for (let i = 1; i <= STEPS; i++) {
    const ms = dayStart.getTime() + i * stepMs;
    const cur = getAlt(ms);
    const crossed = rising ? prev < 0 && cur >= 0 : prev >= 0 && cur < 0;
    if (crossed) {
      // Binary search refinement
      let lo = ms - stepMs;
      let hi = ms;
      for (let j = 0; j < 20; j++) {
        const mid = (lo + hi) / 2;
        const midV = getAlt(mid);
        if (rising ? midV < 0 : midV >= 0) lo = mid;
        else hi = mid;
      }
      return new Date((lo + hi) / 2);
    }
    prev = cur;
  }
  return null;
}

/** Compute all sun event times for a given observer and date */
export function sunriseSunset(latDeg: number, lonDeg: number, date: Date): SunTimes {
  // Standard: center -0.8333° (refraction + semi-diameter)
  // Civil: -6°, Nautical: -12°, Astronomical: -18°
  return {
    sunrise: sunCrossing(latDeg, lonDeg, date, -0.8333, true),
    sunset: sunCrossing(latDeg, lonDeg, date, -0.8333, false),
    civilDawn: sunCrossing(latDeg, lonDeg, date, -6, true),
    civilDusk: sunCrossing(latDeg, lonDeg, date, -6, false),
    nauticalDawn: sunCrossing(latDeg, lonDeg, date, -12, true),
    nauticalDusk: sunCrossing(latDeg, lonDeg, date, -12, false),
    astronomicalDawn: sunCrossing(latDeg, lonDeg, date, -18, true),
    astronomicalDusk: sunCrossing(latDeg, lonDeg, date, -18, false),
  };
}

/** True if astronomical darkness (sun below -18°) */
export function isDark(latDeg: number, lonDeg: number, date: Date): boolean {
  return sunAltAz(latDeg, lonDeg, date).alt < -18;
}

/** True if nighttime (sun below horizon) */
export function isNight(latDeg: number, lonDeg: number, date: Date): boolean {
  return sunAltAz(latDeg, lonDeg, date).alt < 0;
}

export type SkyState = 'day' | 'twilight' | 'dark';

/** Classify sky state for observing */
export function skyState(latDeg: number, lonDeg: number, date: Date): SkyState {
  const alt = sunAltAz(latDeg, lonDeg, date).alt;
  if (alt >= 0) return 'day';
  if (alt >= -18) return 'twilight';
  return 'dark';
}
