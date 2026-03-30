/**
 * Proxy for SOHO realtime animated GIF movies (1/4 resolution).
 * Fetches the small GIF from soho.nascom.nasa.gov server-side to avoid
 * CORS / hotlink restrictions in the browser.
 *
 * Usage: /api/sdo-gif?view=eit_171
 * Valid views: eit_171 | eit_195 | eit_284 | eit_304 | c2 | c3
 * hmi_igr and hmi_mag have no GIF equivalent and return 400.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import type { SunView } from './sdo-image';

const GIF_URLS: Partial<Record<SunView, string>> = {
  eit_171: 'https://soho.nascom.nasa.gov/data/LATEST/current_eit_171small.gif',
  eit_195: 'https://soho.nascom.nasa.gov/data/LATEST/current_eit_195small.gif',
  eit_284: 'https://soho.nascom.nasa.gov/data/LATEST/current_eit_284small.gif',
  eit_304: 'https://soho.nascom.nasa.gov/data/LATEST/current_eit_304small.gif',
  c2:      'https://soho.nascom.nasa.gov/data/LATEST/current_c2small.gif',
  c3:      'https://soho.nascom.nasa.gov/data/LATEST/current_c3small.gif',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const rawView = typeof req.query.view === 'string' ? req.query.view : '';
  const url = GIF_URLS[rawView as SunView];

  if (!url) {
    res.status(400).json({ error: 'No GIF available for this view' });
    return;
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; personal-site-observatory/1.0)',
        'Accept': 'image/gif,image/*',
      },
    });

    if (!upstream.ok) {
      res.status(502).json({ error: `SOHO returned ${upstream.status}` });
      return;
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'image/gif');
    // Cache for 1 hour — GIFs are updated every hour
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=300');
    res.status(200).send(buffer);
  } catch {
    res.status(502).json({ error: 'Failed to fetch SOHO GIF.' });
  }
}
