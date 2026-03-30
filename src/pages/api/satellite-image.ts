import type { NextApiRequest, NextApiResponse } from 'next';

export type SatelliteImageResponse = {
  satellite: string;
  imageUrl: string;
  timestamp: string; // ISO string
  attribution: string;
  attributionUrl: string;
};

type ErrorResponse = { error: string };

/** Day-of-year (1-based) for a UTC date. */
function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const diff = d.getTime() - start;
  return Math.floor(diff / 86_400_000);
}

/** Zero-pad a number to the given width. */
function pad(n: number, w: number): string {
  return String(n).padStart(w, '0');
}

/**
 * Build the NOAA CDN URL for the latest available GOES full-disk GeoColor image.
 * GOES images publish every 10 minutes. We subtract a 20-minute safety buffer to
 * ensure the file is already published on the CDN.
 */
function goesImageUrl(sat: 'GOES19' | 'GOES18'): { imageUrl: string; timestamp: string } {
  const now = new Date();
  // Step back 20 min to guarantee publication
  const t = new Date(now.getTime() - 20 * 60 * 1000);
  // Round down to nearest 10-minute boundary
  const minutes = Math.floor(t.getUTCMinutes() / 10) * 10;
  const snapped = new Date(
    Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), t.getUTCHours(), minutes, 0)
  );

  const year = snapped.getUTCFullYear();
  const doy = dayOfYear(snapped);
  const hhmm = pad(snapped.getUTCHours(), 2) + pad(snapped.getUTCMinutes(), 2);
  const filename = `${year}${pad(doy, 3)}${hhmm}_${sat}-ABI-FD-GEOCOLOR-678x678.jpg`;
  const imageUrl = `https://cdn.star.nesdis.noaa.gov/${sat}/ABI/FD/GEOCOLOR/${filename}`;

  return { imageUrl, timestamp: snapped.toISOString() };
}

/**
 * Fetch Himawari-9 latest.json from NICT to get the most recently published timestamp,
 * then build the single-tile URL at 550 px.
 */
async function himawariImageUrl(): Promise<{ imageUrl: string; timestamp: string }> {
  const latestRes = await fetch('https://himawari8.nict.go.jp/img/D531106/latest.json', {
    headers: { 'Accept': 'application/json' },
  });
  if (!latestRes.ok) throw new Error(`Himawari latest.json fetch failed: ${latestRes.status}`);
  const json = await latestRes.json() as { date: string };

  // Format: "2026-03-30 07:00:00"
  const [datePart, timePart] = json.date.split(' ');
  const [yyyy, mm, dd] = datePart.split('-');
  const [hh, min] = timePart.split(':');

  const imageUrl =
    `https://himawari8.nict.go.jp/img/D531106/1d/550/${yyyy}/${mm}/${dd}/${hh}${min}00_0_0.png`;
  const timestamp = new Date(`${datePart}T${timePart}Z`).toISOString();

  return { imageUrl, timestamp };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SatelliteImageResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Allow explicit satellite override (?sat=GOES19 | GOES18 | Himawari9)
  const satOverride = req.query.sat as string | undefined;
  let selectedSat: 'GOES19' | 'GOES18' | 'Himawari9';

  if (satOverride === 'GOES19' || satOverride === 'GOES18' || satOverride === 'Himawari9') {
    selectedSat = satOverride;
  } else {
    const lon = parseFloat(req.query.lon as string);
    if (isNaN(lon)) {
      res.status(400).json({ error: 'Missing or invalid lon or sat parameter' });
      return;
    }
    selectedSat = lon > 80 ? 'Himawari9' : lon <= -110 ? 'GOES18' : 'GOES19';
  }

  try {
    let result: SatelliteImageResponse;

    if (selectedSat === 'Himawari9') {
      // Asia, SE Asia, Australia, Pacific → Himawari-9
      const { imageUrl, timestamp } = await himawariImageUrl();
      result = {
        satellite: 'Himawari-9',
        imageUrl,
        timestamp,
        attribution: 'NICT / JMA',
        attributionUrl: 'https://himawari8.nict.go.jp/',
      };
    } else if (selectedSat === 'GOES18') {
      // Pacific, Western Americas → GOES-West (GOES-18)
      const { imageUrl, timestamp } = goesImageUrl('GOES18');
      result = {
        satellite: 'GOES-18 (West)',
        imageUrl,
        timestamp,
        attribution: 'NOAA / NESDIS',
        attributionUrl: 'https://www.star.nesdis.noaa.gov/goes/fulldisk.php?sat=G18',
      };
    } else {
      // Americas, Atlantic, Europe fringe → GOES-East (GOES-19)
      const { imageUrl, timestamp } = goesImageUrl('GOES19');
      result = {
        satellite: 'GOES-19 (East)',
        imageUrl,
        timestamp,
        attribution: 'NOAA / NESDIS',
        attributionUrl: 'https://www.star.nesdis.noaa.gov/goes/fulldisk.php?sat=G19',
      };
    }

    // Cache for 10 minutes at the CDN/browser level
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
    res.status(200).json(result);
  } catch (err) {
    console.error('[satellite-image]', err);
    res.status(502).json({ error: 'Failed to resolve satellite image' });
  }
}
