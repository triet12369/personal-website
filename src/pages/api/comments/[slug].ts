import type { NextApiRequest, NextApiResponse } from 'next';

import { cfFetch } from '../../../lib/cfWorker';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // For GET/POST, `slug` is a post slug.
  // For DELETE, `slug` is a comment UUID (admin moderation).
  const { slug } = req.query;
  if (typeof slug !== 'string') return res.status(400).json({ error: 'Invalid id' });

  if (req.method === 'GET') {
    try {
      const upstream = await cfFetch(`/comments/${slug}`);
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    } catch {
      return res.status(503).json({ error: 'Storage unavailable' });
    }
  }

  if (req.method === 'POST') {
    const { author_name, body } = req.body ?? {};
    if (typeof author_name !== 'string' || !author_name.trim()) {
      return res.status(400).json({ error: 'author_name required' });
    }
    if (typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({ error: 'body required' });
    }
    if (author_name.length > 80) return res.status(400).json({ error: 'author_name too long' });
    if (body.length > 1000) return res.status(400).json({ error: 'body too long' });

    try {
      const upstream = await cfFetch(`/comments/${slug}`, {
        method: 'POST',
        body: JSON.stringify({ author_name: author_name.trim(), body: body.trim() }),
      });
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    } catch {
      return res.status(503).json({ error: 'Storage unavailable' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const upstream = await cfFetch(`/comments/${slug}`, { method: 'DELETE' });
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    } catch {
      return res.status(503).json({ error: 'Storage unavailable' });
    }
  }

  return res.status(405).end();
}
