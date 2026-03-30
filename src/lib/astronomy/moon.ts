/**
 * Moon phase, position, rise/set, and next phase times.
 * Based on Jean Meeus, "Astronomical Algorithms" (2nd ed.) Ch. 47–49
 */

import { dateToJD, j2000, DEG_TO_RAD, RAD_TO_DEG, jdToDate } from './julian';
import { raDecToAltAz, AltAz } from './coordinates';
import { solarPosition } from './sun';

export type MoonPhaseInfo = {
  /** Phase angle 0–360 (0 = new, 90 = first quarter, 180 = full, 270 = third quarter) */
  angle: number;
  /** Illumination fraction 0–1 */
  illumination: number;
  /** Phase name */
  name: 'New Moon' | 'Waxing Crescent' | 'First Quarter' | 'Waxing Gibbous' | 'Full Moon' | 'Waning Gibbous' | 'Third Quarter' | 'Waning Crescent';
  /** Unicode moon phase emoji */
  emoji: string;
};

export type MoonPosition = { ra: number; dec: number };

export type MoonTimes = {
  moonrise: Date | null;
  moonset: Date | null;
};

export type NextMoonPhases = {
  nextNew: Date;
  nextFirstQuarter: Date;
  nextFull: Date;
  nextThirdQuarter: Date;
};

/** Moon's geocentric position (RA/Dec in degrees) — Meeus Ch.47 truncated series */
export function moonPosition(date: Date): MoonPosition {
  const T = j2000(date) / 36525;

  // Fundamental arguments (degrees)
  const Lp = ((218.3164477 + 481267.88123421 * T - 0.0015786 * T * T) % 360 + 360) % 360;
  const D = ((297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) % 360 + 360) % 360;
  const M = ((357.5291092 + 35999.0502909 * T - 0.0001536 * T * T) % 360 + 360) % 360;
  const Mp = ((134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) % 360 + 360) % 360;
  const F = ((93.2720950 + 483202.0175233 * T - 0.0036539 * T * T) % 360 + 360) % 360;

  const Dr = D * DEG_TO_RAD;
  const Mr = M * DEG_TO_RAD;
  const Mpr = Mp * DEG_TO_RAD;
  const Fr = F * DEG_TO_RAD;

  // Longitude (Σl in 0.000001°)
  let sigmaL = 0;
  sigmaL += 6288774 * Math.sin(Mpr);
  sigmaL += 1274027 * Math.sin(2 * Dr - Mpr);
  sigmaL += 658314 * Math.sin(2 * Dr);
  sigmaL += 213618 * Math.sin(2 * Mpr);
  sigmaL -= 185116 * Math.sin(Mr);
  sigmaL -= 114332 * Math.sin(2 * Fr);
  sigmaL += 58793 * Math.sin(2 * Dr - 2 * Mpr);
  sigmaL += 57066 * Math.sin(2 * Dr - Mr - Mpr);
  sigmaL += 53322 * Math.sin(2 * Dr + Mpr);
  sigmaL += 45758 * Math.sin(2 * Dr - Mr);

  const moonLon = ((Lp + sigmaL / 1000000) % 360 + 360) % 360;

  // Latitude (Σb in 0.000001°)
  let sigmaB = 0;
  sigmaB += 5128122 * Math.sin(Fr);
  sigmaB += 280602 * Math.sin(Mpr + Fr);
  sigmaB += 277693 * Math.sin(Mpr - Fr);
  sigmaB += 173237 * Math.sin(2 * Dr - Fr);
  sigmaB += 55413 * Math.sin(2 * Dr - Mpr + Fr);
  sigmaB += 46271 * Math.sin(2 * Dr - Mpr - Fr);
  sigmaB += 32573 * Math.sin(2 * Dr + Fr);
  sigmaB += 17198 * Math.sin(2 * Mpr + Fr);
  sigmaB += 9266 * Math.sin(2 * Dr + Mpr - Fr);
  sigmaB += 8822 * Math.sin(2 * Mpr - Fr);

  const moonLat = sigmaB / 1000000;

  // Convert ecliptic to equatorial
  const T2 = j2000(date) / 36525;
  const eps = (23.439291111 - 0.013004167 * T2) * DEG_TO_RAD;
  const lonRad = moonLon * DEG_TO_RAD;
  const latRad = moonLat * DEG_TO_RAD;

  const ra = (Math.atan2(
    Math.sin(lonRad) * Math.cos(eps) - Math.tan(latRad) * Math.sin(eps),
    Math.cos(lonRad),
  ) * RAD_TO_DEG + 360) % 360;

  const dec = Math.asin(
    Math.sin(latRad) * Math.cos(eps) + Math.cos(latRad) * Math.sin(eps) * Math.sin(lonRad),
  ) * RAD_TO_DEG;

  return { ra, dec };
}

/** Moon altitude/azimuth for an observer */
export function moonAltAz(latDeg: number, lonDeg: number, date: Date): AltAz {
  const { ra, dec } = moonPosition(date);
  return raDecToAltAz(ra, dec, latDeg, lonDeg, dateToJD(date));
}

/** Moon phase info */
export function moonPhase(date: Date): MoonPhaseInfo {
  const { ra: moonRa } = moonPosition(date);
  const { ra: sunRa } = solarPosition(date);

  let angle = ((moonRa - sunRa) % 360 + 360) % 360;
  const illumination = (1 - Math.cos(angle * DEG_TO_RAD)) / 2;

  const EMOJIS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
  type PhaseName = MoonPhaseInfo['name'];

  let name: PhaseName;
  let emoji: string;

  if (angle < 22.5) {
    name = 'New Moon'; emoji = '🌑';
  } else if (angle < 67.5) {
    name = 'Waxing Crescent'; emoji = '🌒';
  } else if (angle < 112.5) {
    name = 'First Quarter'; emoji = '🌓';
  } else if (angle < 157.5) {
    name = 'Waxing Gibbous'; emoji = '🌔';
  } else if (angle < 202.5) {
    name = 'Full Moon'; emoji = '🌕';
  } else if (angle < 247.5) {
    name = 'Waning Gibbous'; emoji = '🌖';
  } else if (angle < 292.5) {
    name = 'Third Quarter'; emoji = '🌗';
  } else if (angle < 337.5) {
    name = 'Waning Crescent'; emoji = '🌘';
  } else {
    name = 'New Moon'; emoji = '🌑';
  }

  void EMOJIS; // suppress unused warning
  return { angle, illumination, name, emoji };
}

/** Next occurrence of a moon phase (target: 0=new, 90=1Q, 180=full, 270=3Q) from a given date */
function nextPhase(date: Date, targetAngle: number): Date {
  // Each phase is ~7.38 days apart. Find the JD of the next one.
  let jd = dateToJD(date);
  const step = 0.5; // half-day steps
  for (let i = 0; i < 60; i++) {
    const d = jdToDate(jd);
    const { angle } = moonPhase(d);
    const diff = ((targetAngle - angle + 360) % 360);
    if (diff < 5 && i > 0) return d; // close enough (within ~5°)
    jd += diff < 180 ? step : -step; // move toward target
  }
  // Refine with smaller steps
  let lo = jd - 1;
  let hi = jd + 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const { angle } = moonPhase(jdToDate(mid));
    const diff = ((targetAngle - angle + 360) % 360);
    if (diff < 180) hi = mid + 0.1;
    else lo = mid - 0.1;
  }
  return jdToDate((lo + hi) / 2);
}

/** Next four moon phase events after the given date */
export function nextMoonPhases(date: Date): NextMoonPhases {
  // Search forward in ~7-day increments
  const JD = dateToJD(date);

  const findNext = (targetAngle: number): Date => {
    for (let offset = 0.1; offset < 30; offset += 0.5) {
      const d = jdToDate(JD + offset);
      const { angle } = moonPhase(d);
      const dist = Math.abs(((angle - targetAngle + 360) % 360));
      const distWrapped = Math.min(dist, 360 - dist);
      if (distWrapped < 10) {
        // Binary-search for the exact crossing
        let lo = JD + offset - 1;
        let hi = JD + offset + 1;
        for (let i = 0; i < 30; i++) {
          const mid = (lo + hi) / 2;
          const { angle: a } = moonPhase(jdToDate(mid));
          const d2 = ((a - targetAngle + 360) % 360);
          if (d2 > 180) lo = mid;
          else hi = mid;
        }
        return jdToDate((lo + hi) / 2);
      }
    }
    return nextPhase(date, targetAngle);
  };

  return {
    nextNew: findNext(0),
    nextFirstQuarter: findNext(90),
    nextFull: findNext(180),
    nextThirdQuarter: findNext(270),
  };
}

/** Moonrise and moonset times on the given day */
export function moonRiseSet(latDeg: number, lonDeg: number, date: Date): MoonTimes {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);

  const STEPS = 288;
  const stepMs = 86400000 / STEPS;

  const getAlt = (ms: number) => {
    const d = new Date(ms);
    return moonAltAz(latDeg, lonDeg, d).alt;
  };

  let prev = getAlt(dayStart.getTime());
  let moonrise: Date | null = null;
  let moonset: Date | null = null;

  for (let i = 1; i <= STEPS; i++) {
    const ms = dayStart.getTime() + i * stepMs;
    const cur = getAlt(ms);

    if (!moonrise && prev < 0 && cur >= 0) {
      let lo = ms - stepMs;
      let hi = ms;
      for (let j = 0; j < 20; j++) {
        const mid = (lo + hi) / 2;
        if (getAlt(mid) < 0) lo = mid;
        else hi = mid;
      }
      moonrise = new Date((lo + hi) / 2);
    }
    if (!moonset && prev >= 0 && cur < 0) {
      let lo = ms - stepMs;
      let hi = ms;
      for (let j = 0; j < 20; j++) {
        const mid = (lo + hi) / 2;
        if (getAlt(mid) >= 0) lo = mid;
        else hi = mid;
      }
      moonset = new Date((lo + hi) / 2);
    }
    prev = cur;
  }

  return { moonrise, moonset };
}
