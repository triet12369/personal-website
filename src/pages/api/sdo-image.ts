/**
 * Proxy for SOHO realtime solar images.
 * Fetches latest.jpg from soho.nascom.nasa.gov server-side to avoid
 * CORS / hotlink restrictions in the browser.
 *
 * Usage: /api/sdo-image?view=hmi_igr  (defaults to hmi_igr)
 * Valid views: hmi_igr | hmi_mag | eit_171 | eit_195 | eit_284 | eit_304 | c2 | c3
 */

import type { NextApiRequest, NextApiResponse } from 'next';

export type SunView = 'hmi_igr' | 'hmi_mag' | 'eit_171' | 'eit_195' | 'eit_284' | 'eit_304' | 'c2' | 'c3';

const VIEW_URLS: Record<SunView, string> = {
  hmi_igr: 'https://soho.nascom.nasa.gov/data/realtime/hmi_igr/1024/latest.jpg',
  hmi_mag: 'https://soho.nascom.nasa.gov/data/realtime/hmi_mag/1024/latest.jpg',
  eit_171: 'https://soho.nascom.nasa.gov/data/realtime/eit_171/512/latest.jpg',
  eit_195: 'https://soho.nascom.nasa.gov/data/realtime/eit_195/512/latest.jpg',
  eit_284: 'https://soho.nascom.nasa.gov/data/realtime/eit_284/512/latest.jpg',
  eit_304: 'https://soho.nascom.nasa.gov/data/realtime/eit_304/512/latest.jpg',
  c2:      'https://soho.nascom.nasa.gov/data/realtime/c2/1024/latest.jpg',
  c3:      'https://soho.nascom.nasa.gov/data/realtime/c3/1024/latest.jpg',
};

const VALID_VIEWS = new Set<string>(Object.keys(VIEW_URLS));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const rawView = typeof req.query.view === 'string' ? req.query.view : 'hmi_igr';
  if (!VALID_VIEWS.has(rawView)) {
    res.status(400).json({ error: 'Invalid view parameter' });
    return;
  }
  const sourceUrl = VIEW_URLS[rawView as SunView];

  try {
    const upstream = await fetch(sourceUrl, {
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
    // Cache for 15 minutes — SOHO updates roughly every 15 min
    res.setHeader('Cache-Control', 'public, max-age=900, stale-while-revalidate=120');
    res.status(200).send(buffer);
  } catch {
    res.status(502).json({ error: 'Failed to fetch SOHO image.' });
  }
}
