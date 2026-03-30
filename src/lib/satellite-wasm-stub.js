// Stub for satellite.js WASM module.
// We only use the pure-JS SGP4 functions; WASM accelerated calculators are unused.
export function createSingleThreadRuntime() { return null; }
export function createMultiThreadRuntime() { return null; }
export class EciBaseCalculator {}
export class GmstCalculator {}
export class EcfPositionCalculator {}
export class EcfVelocityCalculator {}
export class GeodeticPositionCalculator {}
export class LookAnglesCalculator {}
export class DopplerFactorCalculator {}
export class SunPositionCalculator {}
export class ShadowFractionCalculator {}
export class BulkPropagator {}
