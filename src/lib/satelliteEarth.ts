import type { SatelliteImageResponse } from '../pages/api/satellite-image';

export type SatelliteEarthData = SatelliteImageResponse & { fetchedAt: number };

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
