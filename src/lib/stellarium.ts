/**
 * Utilities for building Stellarium Web deep-link URLs.
 *
 * Stellarium Web (https://stellarium-web.org) reads the following URL query
 * parameters on load (from apps/web-frontend/src/App.vue):
 *
 *   lat   — observer latitude  (degrees)
 *   lng   — observer longitude (degrees)
 *   az    — initial view azimuth  (degrees)
 *   alt   — initial view altitude (degrees)
 *   fov   — field of view (degrees)
 *   date  — ISO 8601 datetime string
 *
 * Named objects can be pre-selected via the path:
 *   /skysource/{name}  — e.g. /skysource/Moon, /skysource/M31
 */

const STELLARIUM_BASE = 'https://stellarium-web.org';

export interface StellariumUrlOpts {
  lat: number;
  lng: number;
  date: Date;
  /** Initial view azimuth in degrees (where the observer is looking) */
  az?: number;
  /** Initial view altitude in degrees */
  alt?: number;
  /** Field of view in degrees. Defaults to 60. */
  fov?: number;
  /**
   * Sky-source object name. When provided, the URL uses the /skysource/ path
   * to pre-select and highlight the object (e.g. "Moon", "Mars", "M31").
   */
  objectName?: string;
}

/**
 * Returns a Stellarium Web URL that opens the planetarium with the observer's
 * location and time pre-set, optionally pointing at a specific az/alt and/or
 * selecting a named sky object.
 */
export function buildStellariumUrl({
  lat,
  lng,
  date,
  az,
  alt,
  fov = 60,
  objectName,
}: StellariumUrlOpts): string {
  const params = new URLSearchParams({
    lat: lat.toFixed(4),
    lng: lng.toFixed(4),
    date: date.toISOString(),
    fov: fov.toString(),
  });

  if (az !== undefined) params.set('az', az.toFixed(2));
  if (alt !== undefined) params.set('alt', alt.toFixed(2));

  const path = objectName
    ? `/skysource/${encodeURIComponent(objectName)}`
    : '';

  return `${STELLARIUM_BASE}${path}?${params.toString()}`;
}
