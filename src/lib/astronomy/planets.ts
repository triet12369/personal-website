/**
 * Planet positions, visibility, and rise/set times.
 * Uses heliocentric Keplerian elements from Meeus Table 31.a (J2000.0 epoch).
 * Accuracy: ~1° — sufficient for naked-eye visibility checks.
 */

import { j2000, dateToJD, DEG_TO_RAD, RAD_TO_DEG } from './julian';
import { raDecToAltAz, AltAz } from './coordinates';
import { solarPosition } from './sun';

export type PlanetName = 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn';

/**
 * Keplerian orbital elements at J2000.0 + rates per Julian century.
 * [a, e, I, L, varpi, Omega] — rates suffix with 'cy'
 */
const ELEMENTS: Record<
  PlanetName,
  { a: number; acy: number; e: number; ecy: number; I: number; Icy: number; L: number; Lcy: number; varpi: number; varpiCy: number; Omega: number; OmegaCy: number }
> = {
  Mercury: { a: 0.38709927, acy: 0.00000037, e: 0.20563593, ecy: 0.00001906, I: 7.00497902, Icy: -0.00594749, L: 252.25032350, Lcy: 149472.67411175, varpi: 77.45779628, varpiCy: 0.16047689, Omega: 48.33076593, OmegaCy: -0.12534081 },
  Venus: { a: 0.72333566, acy: 0.00000390, e: 0.00677672, ecy: -0.00004107, I: 3.39467605, Icy: -0.00078890, L: 181.97909950, Lcy: 58517.81538729, varpi: 131.60246718, varpiCy: 0.00268329, Omega: 76.67984255, OmegaCy: -0.27769418 },
  Mars: { a: 1.52371034, acy: 0.00001847, e: 0.09339410, ecy: 0.00007882, I: 1.84969142, Icy: -0.00813131, L: -4.55343205, Lcy: 19140.30268499, varpi: -23.94362959, varpiCy: 0.44441088, Omega: 49.55953891, OmegaCy: -0.29257343 },
  Jupiter: { a: 5.20288700, acy: -0.00011607, e: 0.04838624, ecy: -0.00013253, I: 1.30439695, Icy: -0.00183714, L: 34.39644051, Lcy: 3034.74612775, varpi: 14.72847983, varpiCy: 0.21252668, Omega: 100.47390909, OmegaCy: 0.20469106 },
  Saturn: { a: 9.53667594, acy: -0.00125060, e: 0.05386179, ecy: -0.00050991, I: 2.48599187, Icy: 0.00193609, L: 49.95424423, Lcy: 1222.49362201, varpi: 92.59887831, varpiCy: -0.41897216, Omega: 113.66242448, OmegaCy: -0.28867794 },
};

function norm360(x: number): number { return ((x % 360) + 360) % 360; }

/** Heliocentric ecliptic coordinates (degrees) for a planet at the given date */
function heliocentricLonLat(planet: PlanetName, date: Date): { lon: number; lat: number; r: number } {
  const T = j2000(date) / 36525;
  const el = ELEMENTS[planet];

  const a = el.a + el.acy * T;
  const e = el.e + el.ecy * T;
  const I = (el.I + el.Icy * T) * DEG_TO_RAD;
  const L = norm360(el.L + el.Lcy * T);
  const varpi = norm360(el.varpi + el.varpiCy * T);
  const Omega = norm360(el.Omega + el.OmegaCy * T);

  const w = norm360(varpi - Omega); // argument of perihelion
  const M = norm360(L - varpi);      // mean anomaly

  // Solve Kepler's equation iteratively: E - e*sin(E) = M
  let E = M * DEG_TO_RAD;
  for (let i = 0; i < 10; i++) {
    E = E - (E - e * Math.sin(E) - M * DEG_TO_RAD) / (1 - e * Math.cos(E));
  }

  // Heliocentric coordinates in orbital plane
  const xOrb = a * (Math.cos(E) - e);
  const yOrb = a * Math.sqrt(1 - e * e) * Math.sin(E);

  const wRad = w * DEG_TO_RAD;
  const OmegaRad = Omega * DEG_TO_RAD;

  // Rotate to ecliptic
  const x =
    (Math.cos(OmegaRad) * Math.cos(wRad) - Math.sin(OmegaRad) * Math.sin(wRad) * Math.cos(I)) * xOrb +
    (-Math.cos(OmegaRad) * Math.sin(wRad) - Math.sin(OmegaRad) * Math.cos(wRad) * Math.cos(I)) * yOrb;
  const y =
    (Math.sin(OmegaRad) * Math.cos(wRad) + Math.cos(OmegaRad) * Math.sin(wRad) * Math.cos(I)) * xOrb +
    (-Math.sin(OmegaRad) * Math.sin(wRad) + Math.cos(OmegaRad) * Math.cos(wRad) * Math.cos(I)) * yOrb;
  const z =
    Math.sin(wRad) * Math.cos(I) * xOrb +
    Math.cos(wRad) * Math.cos(I) * yOrb;

  const r = Math.sqrt(x * x + y * y + z * z);
  const lon = norm360(Math.atan2(y, x) * RAD_TO_DEG);
  const lat = Math.asin(z / r) * RAD_TO_DEG;

  return { lon, lat, r };
}

export type PlanetPosition = { ra: number; dec: number };

/** Geocentric RA/Dec of a planet (degrees) */
export function planetPosition(planet: PlanetName, date: Date): PlanetPosition {
  const { lon: pLon, lat: pLat, r: pR } = heliocentricLonLat(planet, date);

  // Earth's heliocentric position (using Sun's geocentric reversed)
  const { ra: sunRa, dec: sunDec, distance: sunDist } = solarPosition(date);

  // Convert Sun's geocentric equatorial → ecliptic
  const T = j2000(date) / 36525;
  const eps = (23.439291111 - 0.013004167 * T) * DEG_TO_RAD;

  // Sun's ecliptic longitude (Earth's is 180° offset)
  const sunLonEcl = norm360(
    Math.atan2(
      Math.sin(sunRa * DEG_TO_RAD) * Math.cos(eps) + Math.tan(sunDec * DEG_TO_RAD) * Math.sin(eps),
      Math.cos(sunRa * DEG_TO_RAD),
    ) * RAD_TO_DEG,
  );
  const earthLon = norm360(sunLonEcl + 180);
  const earthR = sunDist;

  // Planet ecliptic cartesian (heliocentric)
  const pX = pR * Math.cos(pLat * DEG_TO_RAD) * Math.cos(pLon * DEG_TO_RAD);
  const pY = pR * Math.cos(pLat * DEG_TO_RAD) * Math.sin(pLon * DEG_TO_RAD);
  const pZ = pR * Math.sin(pLat * DEG_TO_RAD);

  // Earth ecliptic (heliocentric, lat=0)
  const eX = earthR * Math.cos(earthLon * DEG_TO_RAD);
  const eY = earthR * Math.sin(earthLon * DEG_TO_RAD);

  // Geocentric ecliptic of planet
  const gX = pX - eX;
  const gY = pY - eY;
  const gZ = pZ;

  // Ecliptic to equatorial
  const gLon = Math.atan2(gY, gX);
  const gDist = Math.sqrt(gX * gX + gY * gY + gZ * gZ);
  const gLat = Math.asin(gZ / gDist);

  const ra = norm360(
    Math.atan2(
      Math.sin(gLon) * Math.cos(eps) - Math.tan(gLat) * Math.sin(eps),
      Math.cos(gLon),
    ) * RAD_TO_DEG,
  );
  const dec = Math.asin(Math.sin(gLat) * Math.cos(eps) + Math.cos(gLat) * Math.sin(eps) * Math.sin(gLon)) * RAD_TO_DEG;

  return { ra, dec };
}

/** Planet altitude/azimuth for an observer */
export function planetAltAz(planet: PlanetName, latDeg: number, lonDeg: number, date: Date): AltAz {
  const { ra, dec } = planetPosition(planet, date);
  return raDecToAltAz(ra, dec, latDeg, lonDeg, dateToJD(date));
}

export type PlanetInfo = {
  name: PlanetName;
  altAz: AltAz;
  riseTime: Date | null;
  setTime: Date | null;
  visible: boolean;
};

/** Rise/set for a planet on the given date */
function planetRiseSet(planet: PlanetName, latDeg: number, lonDeg: number, date: Date): { rise: Date | null; set: Date | null } {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const STEPS = 144;
  const stepMs = 86400000 / STEPS;

  const getAlt = (ms: number) => {
    const d = new Date(ms);
    return planetAltAz(planet, latDeg, lonDeg, d).alt;
  };

  let prev = getAlt(dayStart.getTime());
  let rise: Date | null = null;
  let set: Date | null = null;

  for (let i = 1; i <= STEPS && (!rise || !set); i++) {
    const ms = dayStart.getTime() + i * stepMs;
    const cur = getAlt(ms);
    if (!rise && prev < 0 && cur >= 0) {
      let lo = ms - stepMs, hi = ms;
      for (let j = 0; j < 20; j++) { const mid = (lo + hi) / 2; if (getAlt(mid) < 0) lo = mid; else hi = mid; }
      rise = new Date((lo + hi) / 2);
    }
    if (!set && prev >= 0 && cur < 0) {
      let lo = ms - stepMs, hi = ms;
      for (let j = 0; j < 20; j++) { const mid = (lo + hi) / 2; if (getAlt(mid) >= 0) lo = mid; else hi = mid; }
      set = new Date((lo + hi) / 2);
    }
    prev = cur;
  }
  return { rise, set };
}

export const PLANET_NAMES: PlanetName[] = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

/** Get altitude, rise/set, and visibility flag for all 5 naked-eye planets */
export function getVisiblePlanets(latDeg: number, lonDeg: number, date: Date): PlanetInfo[] {
  return PLANET_NAMES.map((name) => {
    const altAz = planetAltAz(name, latDeg, lonDeg, date);
    const { rise, set } = planetRiseSet(name, latDeg, lonDeg, date);
    return {
      name,
      altAz,
      riseTime: rise,
      setTime: set,
      visible: altAz.alt > 5, // >5° above horizon — reasonably observable
    };
  });
}
