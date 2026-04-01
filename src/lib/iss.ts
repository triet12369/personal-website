/**
 * ISS orbital data, pass prediction, and ground track.
 * - TLE fetched from CelesTrak (free, no auth, CORS-enabled)
 * - All SGP4 math via satellite.js
 * - Results cached in localStorage (6h TTL)
 */

import * as satellite from 'satellite.js';

// TLE is fetched via our own API route, which proxies CelesTrak with a
// server-side 2-hour cache. This prevents the per-IP rate limit that
// CelesTrak enforces when browsers call celestrak.org directly.
const TLE_URL = '/api/tle';
const LS_KEY = 'obs_iss_tle';
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours — matches server cache TTL

type TLECache = {
  line1: string;
  line2: string;
  fetchedAt: number;
};

async function fetchTLE(): Promise<{ line1: string; line2: string }> {
  // Try cache first
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const cached: TLECache = JSON.parse(raw);
        if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
          return { line1: cached.line1, line2: cached.line2 };
        }
      }
    } catch {
      // ignore corrupt cache
    }
  }

  const res = await fetch(TLE_URL);
  if (!res.ok) throw new Error(`TLE proxy fetch failed: ${res.status}`);
  const json = await res.json() as { line1: string; line2: string };
  const { line1, line2 } = json;

  if (typeof window !== 'undefined') {
    try {
      const cache: TLECache = { line1, line2, fetchedAt: Date.now() };
      localStorage.setItem(LS_KEY, JSON.stringify(cache));
    } catch {
      // ignore storage errors
    }
  }

  return { line1, line2 };
}

export type ISSPosition = {
  lat: number;
  lon: number;
  alt: number; // km
};

// Module-level satrec cache — parsed once per TLE fetch, reused for fast synchronous propagation
let _satrecCache: ReturnType<typeof satellite.twoline2satrec> | null = null;

/**
 * Fetch TLE (cached 6h) and return a parsed satrec ready for propagation.
 * Subsequent calls within the cache window are essentially instant.
 */
export async function getSatrec(): Promise<ReturnType<typeof satellite.twoline2satrec>> {
  const { line1, line2 } = await fetchTLE();
  if (!_satrecCache) {
    _satrecCache = satellite.twoline2satrec(line1, line2);
  }
  return _satrecCache;
}

/**
 * Synchronously compute ISS position from a pre-parsed satrec.
 * Very fast (~microseconds) — safe to call on every animation frame.
 */
export function computeISSPosition(
  satrec: ReturnType<typeof satellite.twoline2satrec>,
  date?: Date,
): ISSPosition {
  const d = date ?? new Date();
  const posVel = satellite.propagate(satrec, d);
  const gmst = satellite.gstime(d);
  const geo = satellite.eciToGeodetic(posVel.position, gmst);
  return {
    lat: satellite.degreesLat(geo.latitude),
    lon: satellite.degreesLong(geo.longitude),
    alt: geo.height,
  };
}

/** Get current ISS position */
export async function getISSPosition(date?: Date): Promise<ISSPosition> {
  const satrec = await getSatrec();
  return computeISSPosition(satrec, date);
}

export type GroundTrackPoint = ISSPosition & { time: Date };

/**
 * Compute the ISS ground track.
 * @param date          Center time (default: now)
 * @param minutesBefore Minutes before center (default: 90)
 * @param minutesAfter  Minutes after center (default: 90)
 * @param intervalSec   Sample interval in seconds (default: 30)
 */
export async function getISSGroundTrack(
  date?: Date,
  minutesBefore = 90,
  minutesAfter = 90,
  intervalSec = 30,
): Promise<GroundTrackPoint[]> {
  const satrec = await getSatrec();
  const center = date ?? new Date();
  const startMs = center.getTime() - minutesBefore * 60000;
  const endMs = center.getTime() + minutesAfter * 60000;
  const stepMs = intervalSec * 1000;

  const points: GroundTrackPoint[] = [];
  for (let ms = startMs; ms <= endMs; ms += stepMs) {
    const t = new Date(ms);
    const posVel = satellite.propagate(satrec, t);
    const gmst = satellite.gstime(t);
    const geo = satellite.eciToGeodetic(posVel.position, gmst);
    points.push({
      lat: satellite.degreesLat(geo.latitude),
      lon: satellite.degreesLong(geo.longitude),
      alt: geo.height,
      time: t,
    });
  }
  return points;
}

export type ISSPass = {
  start: Date;
  peak: Date;
  end: Date;
  maxElevation: number; // degrees
  startAzimuth: number;
  endAzimuth: number;
  duration: number;     // seconds
};

/**
 * Predict ISS visible passes over an observer for the next 48 hours.
 * Only returns passes with max elevation > 10°.
 */
export async function getISSPasses(
  latDeg: number,
  lonDeg: number,
  altKm = 0,
  date?: Date,
): Promise<ISSPass[]> {
  const satrec = await getSatrec();
  const start = date ?? new Date();
  const end = new Date(start.getTime() + 48 * 3600 * 1000);

  const observerGd = {
    latitude: satellite.degreesToRadians(latDeg),
    longitude: satellite.degreesToRadians(lonDeg),
    height: altKm,
  };

  const STEP_MS = 10000; // 10s
  const passes: ISSPass[] = [];

  let inPass = false;
  let passStart: Date | null = null;
  let peakEl = 0;
  let peakTime: Date | null = null;
  let startAz = 0;
  let currentAz = 0;
  let prevEl = 0;

  for (let ms = start.getTime(); ms <= end.getTime(); ms += STEP_MS) {
    const t = new Date(ms);
    const posVel = satellite.propagate(satrec, t);

    const gmst = satellite.gstime(t);
    const posEcf = satellite.eciToEcf(posVel.position, gmst);
    const lookAngles = satellite.ecfToLookAngles(observerGd, posEcf);
    const el = satellite.radiansToDegrees(lookAngles.elevation);
    const az = satellite.radiansToDegrees(lookAngles.azimuth);

    if (el > 0 && !inPass) {
      inPass = true;
      passStart = t;
      startAz = az;
      peakEl = el;
      peakTime = t;
    } else if (el > 0 && inPass) {
      if (el > peakEl) {
        peakEl = el;
        peakTime = t;
      }
      currentAz = az;
    } else if (el <= 0 && inPass) {
      inPass = false;
      if (peakEl > 10 && passStart && peakTime) {
        passes.push({
          start: passStart,
          peak: peakTime,
          end: t,
          maxElevation: peakEl,
          startAzimuth: startAz,
          endAzimuth: currentAz,
          duration: (t.getTime() - passStart.getTime()) / 1000,
        });
        if (passes.length >= 5) break;
      }
      peakEl = 0;
      passStart = null;
      peakTime = null;
    }

    prevEl = el;
  }

  void prevEl; // suppress unused warning
  return passes;
}

/** Direction name from azimuth degrees */
export function azimuthToDirection(az: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((az % 360) + 360) % 360 / 45) % 8];
}
