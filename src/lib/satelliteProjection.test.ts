import { describe, it, expect } from 'vitest';
import { geoToImageFraction } from './satelliteProjection';

describe('geoToImageFraction', () => {
  // -------------------------------------------------------------------------
  // Sanity / identity: nadir point must map to image center
  // -------------------------------------------------------------------------

  it('maps GOES-19 sub-satellite point to image center (0.5, 0.5)', () => {
    const pos = geoToImageFraction(0, -75.2, 'GOES-19 (East)');
    expect(pos).not.toBeNull();
    expect(pos!.px).toBeCloseTo(0.5, 1);
    expect(pos!.py).toBeCloseTo(0.5, 1);
  });

  it('maps GOES-18 sub-satellite point to image center (0.5, 0.5)', () => {
    const pos = geoToImageFraction(0, -137.2, 'GOES-18 (West)');
    expect(pos).not.toBeNull();
    expect(pos!.px).toBeCloseTo(0.5, 1);
    expect(pos!.py).toBeCloseTo(0.5, 1);
  });

  it('maps Himawari-9 sub-satellite point to image center (0.5, 0.5)', () => {
    const pos = geoToImageFraction(0, 140.7, 'Himawari-9');
    expect(pos).not.toBeNull();
    expect(pos!.px).toBeCloseTo(0.5, 1);
    expect(pos!.py).toBeCloseTo(0.5, 1);
  });

  // -------------------------------------------------------------------------
  // Real-world locations
  // -------------------------------------------------------------------------

  it('places New York City correctly on GOES-19', () => {
    // NYC (40.71°N, 74.01°W) is almost directly south of the GOES-19 nadir
    // (-75.2°W), so px should be very close to 0.5, and py < 0.5 (Northern hemi)
    const pos = geoToImageFraction(40.71, -74.01, 'GOES-19 (East)');
    expect(pos).not.toBeNull();
    expect(pos!.px).toBeCloseTo(0.51, 1); // near center horizontally
    expect(pos!.py).toBeCloseTo(0.14, 1); // upper portion (Northern hemisphere)
  });

  it('places Tokyo correctly on Himawari-9', () => {
    // Tokyo (35.69°N, 139.69°E) is almost directly south of Himawari-9 nadir
    // (140.7°E), so px is near 0.5
    const pos = geoToImageFraction(35.69, 139.69, 'Himawari-9');
    expect(pos).not.toBeNull();
    expect(pos!.px).toBeCloseTo(0.49, 1);
    expect(pos!.py).toBeCloseTo(0.17, 1);
  });

  it('places Los Angeles correctly on GOES-18', () => {
    // LA (34.05°N, 118.24°W) is east of the GOES-18 nadir (-137.2°W),
    // so px > 0.5 (eastern side of disk)
    const pos = geoToImageFraction(34.05, -118.24, 'GOES-18 (West)');
    expect(pos).not.toBeNull();
    expect(pos!.px).toBeCloseTo(0.65, 1); // right of center
    expect(pos!.py).toBeCloseTo(0.19, 1);
  });

  // -------------------------------------------------------------------------
  // Directional correctness: Northern hemisphere → py < 0.5
  //                          Southern hemisphere → py > 0.5
  //                          East of nadir       → px > 0.5
  //                          West of nadir       → px < 0.5
  // -------------------------------------------------------------------------

  it('places a Northern hemisphere point above center (py < 0.5)', () => {
    const pos = geoToImageFraction(45, -75.2, 'GOES-19 (East)');
    expect(pos).not.toBeNull();
    expect(pos!.py).toBeLessThan(0.5);
  });

  it('places a Southern hemisphere point below center (py > 0.5)', () => {
    const pos = geoToImageFraction(-45, -75.2, 'GOES-19 (East)');
    expect(pos).not.toBeNull();
    expect(pos!.py).toBeGreaterThan(0.5);
  });

  it('places a point east of GOES-19 nadir to the right (px > 0.5)', () => {
    const pos = geoToImageFraction(0, -50, 'GOES-19 (East)'); // 25° east of nadir
    expect(pos).not.toBeNull();
    expect(pos!.px).toBeGreaterThan(0.5);
  });

  it('places a point west of GOES-19 nadir to the left (px < 0.5)', () => {
    const pos = geoToImageFraction(0, -100, 'GOES-19 (East)'); // 25° west of nadir
    expect(pos).not.toBeNull();
    expect(pos!.px).toBeLessThan(0.5);
  });

  // -------------------------------------------------------------------------
  // Visibility: points on the far side of Earth must return null
  // -------------------------------------------------------------------------

  it('returns null for a point behind Earth (opposite hemisphere from GOES-19)', () => {
    // 0°N, 105°E is on the opposite side of Earth from GOES-19 (-75.2°W = 284.8°E)
    const pos = geoToImageFraction(0, 105, 'GOES-19 (East)');
    expect(pos).toBeNull();
  });

  it('returns null for a point too far west of GOES-19 (beyond limb)', () => {
    // 0°N, 167°W is ~92° from nadir, beyond Earth's angular radius from GEO orbit
    const pos = geoToImageFraction(0, -167, 'GOES-19 (East)');
    expect(pos).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Defensive: unknown satellite name
  // -------------------------------------------------------------------------

  it('returns null for an unknown satellite name', () => {
    const pos = geoToImageFraction(40.71, -74.01, 'SomeSat-X');
    expect(pos).toBeNull();
  });
});
