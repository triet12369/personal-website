/**
 * Proxy for the SOHO HMI Intensitygram (white-light solar image).
 * Fetches latest.jpg from soho.nascom.nasa.gov server-side to avoid
 * CORS / hotlink restrictions in the browser.
 *
 * Usage: /api/sdo-image
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const SOURCE_URL = 'https://soho.nascom.nasa.gov/data/realtime/hmi_igr/1024/latest.jpg';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const upstream = await fetch(SOURCE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; personal-site-observatory/1.0)',
        'Accept': 'image/jpeg,image/*',
      },
    });

    if (!upstream.ok) {
      res.status(502).json({ error: `SOHO returned ${upstream.status}` });
      return;
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    // Cache for 15 minutes — SOHO HMI updates roughly every 15 min
    res.setHeader('Cache-Control', 'public, max-age=900, stale-while-revalidate=120');
    res.status(200).send(buffer);
  } catch {
    res.status(502).json({ error: 'Failed to fetch SOHO image.' });
  }
}
