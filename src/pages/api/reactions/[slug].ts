import type { NextApiRequest, NextApiResponse } from 'next';

import { cfFetch } from '../../../lib/cfWorker';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query;
  if (typeof slug !== 'string') return res.status(400).json({ error: 'Invalid slug' });

  if (req.method === 'GET') {
    try {
      const upstream = await cfFetch(`/reactions/${slug}`);
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    } catch {
      return res.status(503).json({ error: 'Storage unavailable' });
    }
  }

  if (req.method === 'POST') {
    const { emoji } = req.body ?? {};
    if (typeof emoji !== 'string' || !emoji.trim()) {
      return res.status(400).json({ error: 'emoji required' });
    }
    try {
      const upstream = await cfFetch(`/reactions/${slug}`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      });
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    } catch {
      return res.status(503).json({ error: 'Storage unavailable' });
    }
  }

  return res.status(405).end();
}
