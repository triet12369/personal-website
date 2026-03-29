import type { NextApiRequest, NextApiResponse } from 'next';

import { cfFetch } from '../../../lib/cfWorker';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query;
  if (typeof slug !== 'string') return res.status(400).json({ error: 'Invalid slug' });

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const upstream = await cfFetch(`/views/${slug}`, { method: req.method });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch {
    return res.status(503).json({ error: 'Storage unavailable' });
  }
}
