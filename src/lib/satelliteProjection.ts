/**
 * Geostationary satellite projection utilities.
 *
 * Converts a geographic coordinate (lat/lon) to a normalised 0–1 image
 * position (px, py) for the full-disk products served by GOES-19, GOES-18,
 * and Himawari-9.
 *
 * Math source: NOAA GOES-R PUG Level 1b, Volume 3 §4.2 (ABI Fixed Grid).
 * Physical constants are identical for GOES ABI and Himawari AHI.
 */

// ---------------------------------------------------------------------------
// WGS-84 / satellite orbit constants
// ---------------------------------------------------------------------------
const R_EQ = 6378.137;   // Earth equatorial radius (km)
const R_POL = 6356.7523; // Earth polar radius (km)
const H_SAT = 42164.16;  // Orbital radius from Earth center (km)
const E2 = (R_EQ ** 2 - R_POL ** 2) / R_EQ ** 2; // First eccentricity squared

// ---------------------------------------------------------------------------
// Per-satellite descriptor
// ---------------------------------------------------------------------------
interface SatDescriptor {
  /** Sub-satellite longitude in degrees (positive = East) */
  nadirLon: number;
  /** Full-disk image width in pixels */
  imgWidth: number;
  /** Full-disk image height in pixels */
  imgHeight: number;
  /**
   * Scan-angle scale in rad/pixel.
   *
   * GOES 678×678 is an 8× downscale of the 1 km product (5 424 px across).
   * The 1 km pixel scale is 5.5996e-5 rad/px → ×8 = 4.4797e-4 rad/px.
   *
   * Himawari 550×550 is a 10× downscale of the 2 km product (5 500 px across).
   * The 2 km pixel scale is 5.5216e-5 rad/px → ×10 = 5.5216e-4 rad/px.
   */
  radPerPx: number;
}

const SATELLITES: Record<string, SatDescriptor> = {
  'GOES-19 (East)': {
    nadirLon: -75.2,
    imgWidth: 678,
    imgHeight: 678,
    radPerPx: 4.4797e-4,
  },
  'GOES-18 (West)': {
    nadirLon: -137.2,
    imgWidth: 678,
    imgHeight: 678,
    radPerPx: 4.4797e-4,
  },
  'Himawari-9': {
    nadirLon: 140.7,
    imgWidth: 550,
    imgHeight: 550,
    radPerPx: 5.5216e-4,
  },
};

// ---------------------------------------------------------------------------
// Core projection
// ---------------------------------------------------------------------------

/**
 * Project a geographic coordinate onto the image plane of a geostationary
 * satellite full-disk product.
 *
 * @param lat  Geographic latitude in degrees (−90 to +90)
 * @param lon  Geographic longitude in degrees (−180 to +180)
 * @param satelliteName  Value of `SatelliteEarthData.satellite`, e.g. `'GOES-19 (East)'`
 * @returns Normalised image coordinates `{ px, py }` in the range [0, 1], or
 *          `null` if the point is not visible from the satellite (behind Earth
 *          or unknown satellite).
 */
export function geoToImageFraction(
  lat: number,
  lon: number,
  satelliteName: string,
): { px: number; py: number } | null {
  const sat = SATELLITES[satelliteName];
  if (!sat) return null;

  const { nadirLon, imgWidth, imgHeight, radPerPx } = sat;

  // Degrees → radians
  const phi = (lat * Math.PI) / 180;
  const lam = (lon * Math.PI) / 180;
  const lam0 = (nadirLon * Math.PI) / 180;

  // 1. Convert geodetic latitude to geocentric latitude
  const phi_c = Math.atan((R_POL ** 2 / R_EQ ** 2) * Math.tan(phi));

  // 2. Radius of Earth at the geocentric latitude (km)
  const r_c = R_POL / Math.sqrt(1 - E2 * Math.cos(phi_c) ** 2);

  // 3. Satellite-to-point vector components in satellite-fixed frame
  const s_x = H_SAT - r_c * Math.cos(phi_c) * Math.cos(lam - lam0);
  const s_y = -r_c * Math.cos(phi_c) * Math.sin(lam - lam0);
  const s_z = r_c * Math.sin(phi_c);

  // 4. Visibility check: s_x must be positive (point is on the near side)
  //    Also reject if inside the Earth (shouldn't happen for surface coords but guard it)
  if (s_x <= 0) return null;

  // Additional visibility check from the PUG: the point is behind the limb if
  //   r_c · (H·cos(phi_c)·cos(λ-λ0) - r_c) < 0
  // This is equivalent to s_x > 0 for surface points, but we keep it explicit.
  const visible =
    H_SAT * Math.cos(phi_c) * Math.cos(lam - lam0) -
    r_c * (Math.cos(phi_c) ** 2 + (R_EQ / R_POL) ** 2 * Math.sin(phi_c) ** 2) >= 0;
  if (!visible) return null;

  // 5. East-West scan angle x (radians) — positive = East on sky
  const x = Math.atan(-s_y / s_x);

  // 6. North-South scan angle y (radians) — positive = North on sky
  const s_norm = Math.sqrt(s_x ** 2 + s_y ** 2 + s_z ** 2);
  const y = Math.atan(s_z / s_norm);  // note: using full vector magnitude per PUG

  // 7. Scan angles → pixel index (image is centered on nadir).
  //
  //    The full-disk product is centered at (x=0, y=0) = nadir, so:
  //      column = x / radPerPx + imgWidth/2     (x East → larger col)
  //      row    = -y / radPerPx + imgHeight/2   (y North → smaller row / towards top)
  //
  //    This is equivalent to the NOAA ABI fixed-grid inverse:
  //      col = (x - x_origin) / dx,  where x_origin = -(imgWidth/2) * radPerPx
  const col = x / radPerPx + imgWidth / 2;
  const row = -y / radPerPx + imgHeight / 2;

  // 8. Normalise to [0, 1]
  const px = col / imgWidth;
  const py = row / imgHeight;

  // Clamp — floating-point rounding near the limb can push slightly outside [0,1]
  if (px < 0 || px > 1 || py < 0 || py > 1) return null;

  return { px, py };
}

// ---------------------------------------------------------------------------
// GOES CONUS / PACUS sector projection
// ---------------------------------------------------------------------------

/**
 * CONUS (Continental U.S.) scan coverage in ABI Fixed Grid scan angles (rad).
 *
 * Derived from NOAA GOES-R PUG L1b §4.2 and confirmed against the 2500×1500
 * CONUS product: the sector covers 3000 × 5000 2-km pixels at 56 μrad/px,
 * centered at the values below.
 *
 * PACUS (GOES-18 equivalent of CONUS) uses identical angular extents but is
 * centred on a different nadir longitude.
 */
interface ConusDescriptor {
  /** Left edge scan angle (rad, EW axis, negative = West) */
  xMin: number;
  /** Right edge scan angle (rad, EW axis) */
  xMax: number;
  /** Bottom edge scan angle (rad, NS axis, negative = South) */
  yMin: number;
  /** Top edge scan angle (rad, NS axis) */
  yMax: number;
}

// GOES-19 CONUS extent (EW: ~−0.101441 to +0.038749 rad; NS: ~+0.128226 to +0.044444 rad)
// Derived from NOAA ABI CONUS product documentation (5424×3264 native → 2500×1500 thumbnail)
const CONUS_GOES19: ConusDescriptor = {
  xMin: -0.101441,
  xMax:  0.038749,
  yMin:  0.044444,
  yMax:  0.128226,
};

// GOES-18 PACUS extent.
// Width = 2500 px × 56 μrad/px = 0.140000 rad, symmetric about nadir → xMax = -xMin = 0.070000.
const CONUS_GOES18: ConusDescriptor = {
  xMin: -0.070000,
  xMax:  0.070000,
  yMin:  0.044444,
  yMax:  0.128226,
};

const CONUS_SECTORS: Record<string, ConusDescriptor> = {
  'GOES-19 (East)': CONUS_GOES19,
  'GOES-18 (West)': CONUS_GOES18,
};

/**
 * Project a geographic coordinate to normalised [0,1] position within the
 * GOES CONUS / PACUS 2500×1500 sector image.
 *
 * Returns `null` if the point is outside the sector or not visible.
 */
export function geoToImageFractionCONUS(
  lat: number,
  lon: number,
  satelliteName: string,
): { px: number; py: number } | null {
  const sat = SATELLITES[satelliteName];
  const sector = CONUS_SECTORS[satelliteName];
  if (!sat || !sector) return null;

  const { nadirLon } = sat;

  // Degrees → radians
  const phi = (lat * Math.PI) / 180;
  const lam = (lon * Math.PI) / 180;
  const lam0 = (nadirLon * Math.PI) / 180;

  // Geocentric latitude & radius
  const phi_c = Math.atan((R_POL ** 2 / R_EQ ** 2) * Math.tan(phi));
  const r_c = R_POL / Math.sqrt(1 - E2 * Math.cos(phi_c) ** 2);

  const s_x = H_SAT - r_c * Math.cos(phi_c) * Math.cos(lam - lam0);
  const s_y = -r_c * Math.cos(phi_c) * Math.sin(lam - lam0);
  const s_z = r_c * Math.sin(phi_c);

  if (s_x <= 0) return null;

  const visible =
    H_SAT * Math.cos(phi_c) * Math.cos(lam - lam0) -
    r_c * (Math.cos(phi_c) ** 2 + (R_EQ / R_POL) ** 2 * Math.sin(phi_c) ** 2) >= 0;
  if (!visible) return null;

  const x = Math.atan(-s_y / s_x);
  const s_norm = Math.sqrt(s_x ** 2 + s_y ** 2 + s_z ** 2);
  const y = Math.atan(s_z / s_norm);

  const { xMin, xMax, yMin, yMax } = sector;

  // Check point is within the CONUS sector
  if (x < xMin || x > xMax || y < yMin || y > yMax) return null;

  const px = (x - xMin) / (xMax - xMin);
  // Image rows run top-to-bottom; y angle is larger at the top (North)
  const py = (yMax - y) / (yMax - yMin);

  if (px < 0 || px > 1 || py < 0 || py > 1) return null;

  return { px, py };
}

/**
 * Returns true if a geographic coordinate falls within the CONUS/PACUS sector
 * of the given satellite.
 */
export function isInConusSector(lat: number, lon: number, satelliteName: string): boolean {
  return geoToImageFractionCONUS(lat, lon, satelliteName) !== null;
}

// ---------------------------------------------------------------------------
// Himawari tile projection
// ---------------------------------------------------------------------------

/**
 * Maps a geographic coordinate to a Himawari-9 tile in the `4d` (4×4) grid.
 *
 * The NICT API serves tiles as:
 *   https://himawari8.nict.go.jp/img/D531106/4d/550/{YYYY}/{MM}/{DD}/{HHMMSS}_{col}_{row}.png
 *
 * Each tile is 550×550 px and covers 1/4 of the full-disk in each dimension.
 *
 * @returns `{ col, row, localPx, localPy }` where col/row are 0-indexed tile
 *          indices and localPx/localPy are normalised [0,1] positions within
 *          that tile. Returns `null` if the point is not visible.
 */
export function geoToHimawariTile(
  lat: number,
  lon: number,
): { col: number; row: number; localPx: number; localPy: number } | null {
  const GRID = 4;
  const pos = geoToImageFraction(lat, lon, 'Himawari-9');
  if (!pos) return null;

  const { px, py } = pos;
  const col = Math.min(Math.floor(px * GRID), GRID - 1);
  const row = Math.min(Math.floor(py * GRID), GRID - 1);
  const localPx = px * GRID - col;
  const localPy = py * GRID - row;

  return { col, row, localPx, localPy };
}
