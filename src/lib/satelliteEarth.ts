import type { SatelliteImageResponse } from '../pages/api/satellite-image';
import { isInConusSector } from './satelliteProjection';

export type SatelliteEarthData = SatelliteImageResponse & { fetchedAt: number };

// ---------------------------------------------------------------------------
// CONUS / PACUS zoomed image helpers
// ---------------------------------------------------------------------------

/**
 * Derives the CONUS (or PACUS for GOES-18) 2500×1500 GeoColor image URL from
 * an existing full-disk image URL by replacing the path segment and resolution.
 *
 * Full-disk URL example:
 *   https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/{ts}_GOES19-ABI-FD-GEOCOLOR-678x678.jpg
 * CONUS URL example:
 *   https://cdn.star.nesdis.noaa.gov/GOES19/ABI/CONUS/GEOCOLOR/{ts}_GOES19-ABI-CONUS-GEOCOLOR-2500x1500.jpg
 *
 * Returns `null` for Himawari-9 (uses tile API instead).
 */
export function getConusImageUrl(imageUrl: string): string | null {
  // Match GOES19 or GOES18, ABI, FD path
  const m = imageUrl.match(
    /^(https:\/\/cdn\.star\.nesdis\.noaa\.gov\/(GOES19|GOES18)\/ABI\/)FD\/GEOCOLOR\/(\d+)_(GOES1[89]-ABI-FD-GEOCOLOR)-678x678\.jpg$/,
  );
  if (!m) return null;

  const [, base, , timestamp, labelBase] = m;
  // CONUS images publish ~1 minute after the full-disk boundary (e.g. FD at :10 → CONUS at :11).
  // Increment HH:MM by 1 to get the matching CONUS timestamp.
  const tYear = timestamp.slice(0, 4);
  const tDoy  = timestamp.slice(4, 7);
  const tHh   = parseInt(timestamp.slice(7, 9), 10);
  const tMm   = parseInt(timestamp.slice(9, 11), 10);
  const totalMins = tHh * 60 + tMm + 1;
  const newHh = String(Math.floor(totalMins / 60) % 24).padStart(2, '0');
  const newMm = String(totalMins % 60).padStart(2, '0');
  const conusTs = `${tYear}${tDoy}${newHh}${newMm}`;
  const conusLabel = labelBase.replace('-FD-', '-CONUS-');
  return `${base}CONUS/GEOCOLOR/${conusTs}_${conusLabel}-2500x1500.jpg`;
}

/**
 * Returns whether a location falls within the CONUS/PACUS sector of the given
 * satellite, meaning a higher-resolution CONUS image is available.
 */
export function locationHasConusImage(
  lat: number,
  lon: number,
  satellite: string,
): boolean {
  return isInConusSector(lat, lon, satellite);
}

export type SatKey = 'GOES19' | 'GOES18' | 'Himawari9';

const LS_KEY = 'obs_satellite_earth';
const SAT_CACHE_KEYS: Record<SatKey, string> = {
  GOES19: 'obs_sat_GOES19',
  GOES18: 'obs_sat_GOES18',
  Himawari9: 'obs_sat_Himawari9',
};
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

type LocationCacheEntry = SatelliteEarthData & { lat: number; lon: number };

function readSatCache(key: string): SatelliteEarthData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached: SatelliteEarthData = JSON.parse(raw);
    if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached;
  } catch {
    // ignore corrupt cache
  }
  return null;
}

function writeSatCache(key: string, data: SatelliteEarthData, extras?: object) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify({ ...data, ...extras }));
  } catch {
    // ignore storage errors
  }
}

/** Fetch image for the satellite nearest to the given location. */
export async function getSatelliteImage(lat: number, lon: number): Promise<SatelliteEarthData> {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const cached: LocationCacheEntry = JSON.parse(raw);
        const sameLocation =
          Math.abs(cached.lat - lat) < 1 && Math.abs(cached.lon - lon) < 1;
        if (sameLocation && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
          return cached;
        }
      }
    } catch {
      // ignore corrupt cache
    }
  }

  const res = await fetch(`/api/satellite-image?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`);
  if (!res.ok) throw new Error(`satellite-image API failed: ${res.status}`);

  const json: SatelliteImageResponse = await res.json();
  const data: SatelliteEarthData = { ...json, fetchedAt: Date.now() };

  if (typeof window !== 'undefined') {
    try {
      const entry: LocationCacheEntry = { ...data, lat, lon };
      localStorage.setItem(LS_KEY, JSON.stringify(entry));
    } catch {
      // ignore storage errors
    }
  }

  return data;
}

/** Fetch image for a specific satellite by key (used by the all-satellites modal). */
export async function getSatelliteImageBySat(sat: SatKey): Promise<SatelliteEarthData> {
  const cacheKey = SAT_CACHE_KEYS[sat];
  const cached = readSatCache(cacheKey);
  if (cached) return cached;

  const res = await fetch(`/api/satellite-image?sat=${sat}`);
  if (!res.ok) throw new Error(`satellite-image API failed: ${res.status}`);

  const json: SatelliteImageResponse = await res.json();
  const data: SatelliteEarthData = { ...json, fetchedAt: Date.now() };
  writeSatCache(cacheKey, data);
  return data;
}
