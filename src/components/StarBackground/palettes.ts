import type { Palette, RGBPalette } from './types';

// ─── Canvas 2D palettes ───────────────────────────────────────────────────────

export const DARK_PALETTE: Palette = {
  starColor:    (a) => `rgba(220,230,255,${a})`,
  shootColor:   (a) => `rgba(200,230,255,${a})`,
  shootTail:    (a) => `rgba(180,220,255,${a})`,
  maxStarAlpha:  1.0,
  maxShootAlpha: 0.85,
};

// Warm dark stars for the light (parchment) background
export const LIGHT_PALETTE: Palette = {
  starColor:    (a) => `rgba(50,40,28,${a})`,
  shootColor:   (a) => `rgba(70,55,38,${a})`,
  shootTail:    (a) => `rgba(100,80,55,${a})`,
  maxStarAlpha:  0.8,
  maxShootAlpha: 0.7,
};

// ─── WebGL palettes (RGB normalized to 0-1) ───────────────────────────────────

export const DARK_RGB_PALETTE: RGBPalette = {
  starRGB:       [220 / 255, 230 / 255, 255 / 255],
  shootColorRGB: [200 / 255, 230 / 255, 255 / 255],
  shootTailRGB:  [180 / 255, 220 / 255, 255 / 255],
  ringRGB:       [180 / 255, 220 / 255, 255 / 255],
  maxStarAlpha:  1.0,
  maxShootAlpha: 0.85,
};

export const LIGHT_RGB_PALETTE: RGBPalette = {
  starRGB:       [50 / 255, 40 / 255, 28 / 255],
  shootColorRGB: [70 / 255, 55 / 255, 38 / 255],
  shootTailRGB:  [100 / 255, 80 / 255, 55 / 255],
  ringRGB:       [110 / 255, 85 / 255, 50 / 255],
  maxStarAlpha:  0.8,
  maxShootAlpha: 0.7,
};
