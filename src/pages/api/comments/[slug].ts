import type { NextApiRequest, NextApiResponse } from 'next';

import { cfFetch } from '../../../lib/cfWorker';
import { verifyAdminRequest } from '../../../lib/cfAccess';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // For GET/POST, `slug` is a post slug.
  // For DELETE, `slug` is a comment UUID (admin moderation).
  const { slug } = req.query;
  if (typeof slug !== 'string') return res.status(400).json({ error: 'Invalid id' });

  if (req.method === 'GET') {
    const rawToken = req.headers['x-viewer-token'];
    const viewerToken = typeof rawToken === 'string' ? rawToken : null;
    try {
      const qs = viewerToken ? `?viewer_token=${encodeURIComponent(viewerToken)}` : '';
      const upstream = await cfFetch(`/comments/${slug}${qs}`);
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    } catch {
      return res.status(503).json({ error: 'Storage unavailable' });
    }
  }

  if (req.method === 'POST') {
    const { author_name, body, parent_id, user_token } = req.body ?? {};
    if (typeof author_name !== 'string' || !author_name.trim()) {
      return res.status(400).json({ error: 'author_name required' });
    }
    if (typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({ error: 'body required' });
    }
    if (author_name.length > 80) return res.status(400).json({ error: 'author_name too long' });
    if (body.length > 1000) return res.status(400).json({ error: 'body too long' });

    const isOwner = await verifyAdminRequest(req);

    try {
      const upstream = await cfFetch(`/comments/${slug}`, {
        method: 'POST',
        body: JSON.stringify({
          author_name: author_name.trim(),
          body: body.trim(),
          ...(typeof parent_id === 'string' && parent_id ? { parent_id } : {}),
          // Admin posts carry no user_token so their comments are never marked
          // is_mine; the is_owner flag is the server-authoritative identity.
          ...(!isOwner && typeof user_token === 'string' && user_token ? { user_token } : {}),
          is_owner: isOwner,
        }),
      });
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    } catch {
      return res.status(503).json({ error: 'Storage unavailable' });
    }
  }

  if (req.method === 'DELETE') {
    const isAdmin = await verifyAdminRequest(req);
    if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });

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
