/**
 * Cloud cover from Open-Meteo (free, no API key, CORS-enabled).
 * Results cached in localStorage (1h TTL).
 */

const LS_KEY = 'obs_weather';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

type WeatherCache = {
  lat: number;
  lon: number;
  cloudCover: number;
  forecast: number[];
  fetchedAt: number;
};

export type WeatherData = {
  cloudCover: number;   // 0–100 %
  forecast: number[];   // next 24 hourly values
  fetchedAt: Date;
};

export type ObservingQuality = 'Excellent' | 'Good' | 'Fair' | 'Poor';

export async function getCloudCover(latDeg: number, lonDeg: number): Promise<WeatherData> {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const cached: WeatherCache = JSON.parse(raw);
        const sameLocation =
          Math.abs(cached.lat - latDeg) < 0.05 && Math.abs(cached.lon - lonDeg) < 0.05;
        if (sameLocation && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
          return {
            cloudCover: cached.cloudCover,
            forecast: cached.forecast,
            fetchedAt: new Date(cached.fetchedAt),
          };
        }
      }
    } catch {
      // ignore corrupt cache
    }
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latDeg.toFixed(4)}&longitude=${lonDeg.toFixed(4)}&hourly=cloudcover&forecast_days=1&timezone=UTC`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo fetch failed: ${res.status}`);

  const json = await res.json() as { hourly: { cloudcover: number[] }; hourly_units?: unknown };

  const hourlyCloud: number[] = json.hourly?.cloudcover ?? [];
  const now = new Date();
  const currentHour = now.getUTCHours();
  const cloudCover = hourlyCloud[currentHour] ?? hourlyCloud[0] ?? 0;

  if (typeof window !== 'undefined') {
    try {
      const cache: WeatherCache = {
        lat: latDeg,
        lon: lonDeg,
        cloudCover,
        forecast: hourlyCloud,
        fetchedAt: Date.now(),
      };
      localStorage.setItem(LS_KEY, JSON.stringify(cache));
    } catch {
      // ignore storage errors
    }
  }

  return { cloudCover, forecast: hourlyCloud, fetchedAt: now };
}

/** Rate observing quality based on cloud cover % */
export function observingQuality(cloudCover: number): ObservingQuality {
  if (cloudCover <= 10) return 'Excellent';
  if (cloudCover <= 30) return 'Good';
  if (cloudCover <= 60) return 'Fair';
  return 'Poor';
}

export function qualityColor(quality: ObservingQuality): string {
  switch (quality) {
    case 'Excellent': return 'green';
    case 'Good': return 'teal';
    case 'Fair': return 'yellow';
    case 'Poor': return 'red';
  }
}
