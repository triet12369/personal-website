/**
 * Bright star and constellation catalogs + visibility functions.
 * Star positions are J2000.0 mean positions (proper motion negligible for our purpose).
 */

import { dateToJD } from './julian';
import { raDecToAltAz, AltAz } from './coordinates';

export type Star = {
  name: string;
  bayer: string; // Bayer designation (e.g. "α Ori")
  constellation: string; // IAU abbreviation
  ra: number;   // degrees
  dec: number;  // degrees
  mag: number;  // apparent magnitude
};

export type Constellation = {
  name: string;   // full name
  abbr: string;   // IAU abbreviation
  ra: number;     // center RA degrees
  dec: number;    // center Dec degrees
};

/** Top 25 brightest stars visible to naked eye */
export const BRIGHT_STARS: Star[] = [
  { name: 'Sirius',       bayer: 'α CMa', constellation: 'CMa', ra: 101.287, dec: -16.716, mag: -1.46 },
  { name: 'Canopus',      bayer: 'α Car', constellation: 'Car', ra: 95.988,  dec: -52.696, mag: -0.72 },
  { name: 'Arcturus',     bayer: 'α Boo', constellation: 'Boo', ra: 213.915, dec: 19.182,  mag: -0.05 },
  { name: 'Vega',         bayer: 'α Lyr', constellation: 'Lyr', ra: 279.235, dec: 38.784,  mag: 0.03  },
  { name: 'Capella',      bayer: 'α Aur', constellation: 'Aur', ra: 79.172,  dec: 45.998,  mag: 0.08  },
  { name: 'Rigel',        bayer: 'β Ori', constellation: 'Ori', ra: 78.634,  dec: -8.201,  mag: 0.13  },
  { name: 'Procyon',      bayer: 'α CMi', constellation: 'CMi', ra: 114.825, dec: 5.225,   mag: 0.34  },
  { name: 'Betelgeuse',   bayer: 'α Ori', constellation: 'Ori', ra: 88.793,  dec: 7.407,   mag: 0.42  },
  { name: 'Achernar',     bayer: 'α Eri', constellation: 'Eri', ra: 24.429,  dec: -57.237, mag: 0.46  },
  { name: 'Hadar',        bayer: 'β Cen', constellation: 'Cen', ra: 210.956, dec: -60.373, mag: 0.61  },
  { name: 'Altair',       bayer: 'α Aql', constellation: 'Aql', ra: 297.696, dec: 8.868,   mag: 0.76  },
  { name: 'Aldebaran',    bayer: 'α Tau', constellation: 'Tau', ra: 68.980,  dec: 16.509,  mag: 0.87  },
  { name: 'Antares',      bayer: 'α Sco', constellation: 'Sco', ra: 247.352, dec: -26.432, mag: 0.96  },
  { name: 'Spica',        bayer: 'α Vir', constellation: 'Vir', ra: 201.298, dec: -11.161, mag: 0.97  },
  { name: 'Pollux',       bayer: 'β Gem', constellation: 'Gem', ra: 116.329, dec: 28.026,  mag: 1.14  },
  { name: 'Fomalhaut',    bayer: 'α PsA', constellation: 'PsA', ra: 344.413, dec: -29.622, mag: 1.16  },
  { name: 'Deneb',        bayer: 'α Cyg', constellation: 'Cyg', ra: 310.358, dec: 45.280,  mag: 1.25  },
  { name: 'Mimosa',       bayer: 'β Cru', constellation: 'Cru', ra: 191.930, dec: -59.689, mag: 1.25  },
  { name: 'Regulus',      bayer: 'α Leo', constellation: 'Leo', ra: 152.093, dec: 11.967,  mag: 1.36  },
  { name: 'Adhara',       bayer: 'ε CMa', constellation: 'CMa', ra: 104.657, dec: -28.972, mag: 1.50  },
  { name: 'Castor',       bayer: 'α Gem', constellation: 'Gem', ra: 113.650, dec: 31.888,  mag: 1.57  },
  { name: 'Shaula',       bayer: 'λ Sco', constellation: 'Sco', ra: 263.402, dec: -37.103, mag: 1.62  },
  { name: 'Bellatrix',    bayer: 'γ Ori', constellation: 'Ori', ra: 81.283,  dec: 6.350,   mag: 1.64  },
  { name: 'Gacrux',       bayer: 'γ Cru', constellation: 'Cru', ra: 187.792, dec: -57.113, mag: 1.64  },
  { name: 'Elnath',       bayer: 'β Tau', constellation: 'Tau', ra: 81.573,  dec: 28.608,  mag: 1.65  },
];

/** Representative constellations (center RA/Dec) — 40 IAU constellations covering the full sky */
export const CONSTELLATIONS: Constellation[] = [
  { name: 'Orion',             abbr: 'Ori', ra: 83.8,  dec: 5.0   },
  { name: 'Ursa Major',        abbr: 'UMa', ra: 165.0, dec: 55.0  },
  { name: 'Cassiopeia',        abbr: 'Cas', ra: 10.0,  dec: 62.0  },
  { name: 'Perseus',           abbr: 'Per', ra: 48.0,  dec: 45.0  },
  { name: 'Auriga',            abbr: 'Aur', ra: 78.0,  dec: 42.0  },
  { name: 'Taurus',            abbr: 'Tau', ra: 65.0,  dec: 19.0  },
  { name: 'Gemini',            abbr: 'Gem', ra: 113.0, dec: 25.0  },
  { name: 'Cancer',            abbr: 'Cnc', ra: 125.0, dec: 17.0  },
  { name: 'Leo',               abbr: 'Leo', ra: 152.0, dec: 13.0  },
  { name: 'Virgo',             abbr: 'Vir', ra: 201.0, dec: -4.0  },
  { name: 'Libra',             abbr: 'Lib', ra: 229.0, dec: -15.0 },
  { name: 'Scorpius',          abbr: 'Sco', ra: 255.0, dec: -27.0 },
  { name: 'Sagittarius',       abbr: 'Sgr', ra: 283.0, dec: -28.0 },
  { name: 'Capricornus',       abbr: 'Cap', ra: 313.0, dec: -18.0 },
  { name: 'Aquarius',          abbr: 'Aqr', ra: 332.0, dec: -10.0 },
  { name: 'Pisces',            abbr: 'Psc', ra: 10.0,  dec: 14.0  },
  { name: 'Aries',             abbr: 'Ari', ra: 28.0,  dec: 20.0  },
  { name: 'Boötes',            abbr: 'Boo', ra: 215.0, dec: 30.0  },
  { name: 'Corona Borealis',   abbr: 'CrB', ra: 233.0, dec: 30.0  },
  { name: 'Hercules',          abbr: 'Her', ra: 258.0, dec: 28.0  },
  { name: 'Lyra',              abbr: 'Lyr', ra: 279.0, dec: 38.0  },
  { name: 'Cygnus',            abbr: 'Cyg', ra: 310.0, dec: 45.0  },
  { name: 'Aquila',            abbr: 'Aql', ra: 297.0, dec: 5.0   },
  { name: 'Delphinus',         abbr: 'Del', ra: 309.0, dec: 12.0  },
  { name: 'Pegasus',           abbr: 'Peg', ra: 337.0, dec: 20.0  },
  { name: 'Andromeda',         abbr: 'And', ra: 18.0,  dec: 38.0  },
  { name: 'Triangulum',        abbr: 'Tri', ra: 33.0,  dec: 32.0  },
  { name: 'Canis Major',       abbr: 'CMa', ra: 105.0, dec: -22.0 },
  { name: 'Canis Minor',       abbr: 'CMi', ra: 115.0, dec: 6.0   },
  { name: 'Lepus',             abbr: 'Lep', ra: 83.0,  dec: -19.0 },
  { name: 'Hydra',             abbr: 'Hya', ra: 176.0, dec: -14.0 },
  { name: 'Corvus',            abbr: 'Crv', ra: 187.0, dec: -18.0 },
  { name: 'Centaurus',         abbr: 'Cen', ra: 202.0, dec: -47.0 },
  { name: 'Crux',              abbr: 'Cru', ra: 185.0, dec: -60.0 },
  { name: 'Lupus',             abbr: 'Lup', ra: 232.0, dec: -44.0 },
  { name: 'Ophiuchus',         abbr: 'Oph', ra: 258.0, dec: -8.0  },
  { name: 'Serpens',           abbr: 'Ser', ra: 240.0, dec: 5.0   },
  { name: 'Ursa Minor',        abbr: 'UMi', ra: 230.0, dec: 77.0  },
  { name: 'Draco',             abbr: 'Dra', ra: 260.0, dec: 65.0  },
  { name: 'Cepheus',           abbr: 'Cep', ra: 340.0, dec: 70.0  },
];

export type StarWithAltAz = Star & { altAz: AltAz };
export type ConstellationWithAltAz = Constellation & { altAz: AltAz; visible: boolean };

export type Nebula = {
  name: string;      // common name
  id: string;        // Messier / NGC designation
  ra: number;        // J2000 degrees
  dec: number;       // J2000 degrees
  type: 'galaxy' | 'nebula' | 'cluster';
};

export type NebulaWithAltAz = Nebula & { altAz: AltAz };

/** Curated catalog of prominent deep-sky objects */
export const NEBULAE: Nebula[] = [
  { name: 'Andromeda Galaxy',   id: 'M31',      ra: 10.685,  dec: 41.269,  type: 'galaxy'  },
  { name: 'Triangulum Galaxy',  id: 'M33',      ra: 23.462,  dec: 30.660,  type: 'galaxy'  },
  { name: 'Pleiades',           id: 'M45',      ra: 56.750,  dec: 24.117,  type: 'cluster' },
  { name: 'Double Cluster',     id: 'NGC 869',  ra: 34.750,  dec: 57.133,  type: 'cluster' },
  { name: 'Orion Nebula',       id: 'M42',      ra: 83.822,  dec: -5.391,  type: 'nebula'  },
  { name: 'Crab Nebula',        id: 'M1',       ra: 83.633,  dec: 22.015,  type: 'nebula'  },
  { name: 'Beehive Cluster',    id: 'M44',      ra: 130.025, dec: 19.667,  type: 'cluster' },
  { name: 'Bode\'s Galaxy',     id: 'M81',      ra: 148.888, dec: 69.065,  type: 'galaxy'  },
  { name: 'Whirlpool Galaxy',   id: 'M51',      ra: 202.469, dec: 47.195,  type: 'galaxy'  },
  { name: 'Omega Centauri',     id: 'NGC 5139', ra: 201.697, dec: -47.479, type: 'cluster' },
  { name: 'Sombrero Galaxy',    id: 'M104',     ra: 190.000, dec: -11.623, type: 'galaxy'  },
  { name: 'Owl Nebula',         id: 'M97',      ra: 168.699, dec: 55.019,  type: 'nebula'  },
  { name: 'Hercules Cluster',   id: 'M13',      ra: 250.423, dec: 36.461,  type: 'cluster' },
  { name: 'Eagle Nebula',       id: 'M16',      ra: 274.700, dec: -13.783, type: 'nebula'  },
  { name: 'Omega Nebula',       id: 'M17',      ra: 275.196, dec: -16.177, type: 'nebula'  },
  { name: 'Lagoon Nebula',      id: 'M8',       ra: 270.921, dec: -24.388, type: 'nebula'  },
  { name: 'Trifid Nebula',      id: 'M20',      ra: 270.597, dec: -23.033, type: 'nebula'  },
  { name: 'Ring Nebula',        id: 'M57',      ra: 283.396, dec: 33.029,  type: 'nebula'  },
  { name: 'Dumbbell Nebula',    id: 'M27',      ra: 299.901, dec: 22.721,  type: 'nebula'  },
  { name: 'Carina Nebula',      id: 'NGC 3372', ra: 160.983, dec: -59.867, type: 'nebula'  },
];

/** Stars currently above HORIZON_MIN degrees */
const HORIZON_MIN = 5;

/** Returns bright stars above the horizon for the observer */
export function getVisibleStars(latDeg: number, lonDeg: number, date: Date): StarWithAltAz[] {
  const jd = dateToJD(date);
  return BRIGHT_STARS
    .map((star) => ({
      ...star,
      altAz: raDecToAltAz(star.ra, star.dec, latDeg, lonDeg, jd),
    }))
    .filter((s) => s.altAz.alt > HORIZON_MIN)
    .sort((a, b) => a.mag - b.mag); // brightest first
}

/** Returns constellations with their center alt/az; marks those with center above horizon */
export function getVisibleConstellations(latDeg: number, lonDeg: number, date: Date): ConstellationWithAltAz[] {
  const jd = dateToJD(date);
  return CONSTELLATIONS
    .map((c) => {
      const altAz = raDecToAltAz(c.ra, c.dec, latDeg, lonDeg, jd);
      return { ...c, altAz, visible: altAz.alt > HORIZON_MIN };
    })
    .sort((a, b) => b.altAz.alt - a.altAz.alt);
}

/** Returns deep-sky objects above the horizon, sorted by altitude */
export function getVisibleNebulae(latDeg: number, lonDeg: number, date: Date): NebulaWithAltAz[] {
  const jd = dateToJD(date);
  return NEBULAE
    .map((n) => ({ ...n, altAz: raDecToAltAz(n.ra, n.dec, latDeg, lonDeg, jd) }))
    .filter((n) => n.altAz.alt > HORIZON_MIN)
    .sort((a, b) => b.altAz.alt - a.altAz.alt);
}
