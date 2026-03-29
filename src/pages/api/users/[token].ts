import type { NextApiRequest, NextApiResponse } from 'next';

import { cfFetch } from '../../../lib/cfWorker';

// Only allow v4 UUID format to prevent path traversal / injection.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query;
  if (typeof token !== 'string' || !UUID_RE.test(token)) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  // GET /api/users/:token — fetch name history for this token.
  if (req.method === 'GET') {
    try {
      const upstream = await cfFetch(`/users/${token}/history`);
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    } catch {
      return res.status(503).json({ error: 'Storage unavailable' });
    }
  }

  // PUT /api/users/:token — update display name.
  if (req.method === 'PUT') {
    const { display_name } = req.body ?? {};
    if (typeof display_name !== 'string' || !display_name.trim()) {
      return res.status(400).json({ error: 'display_name required' });
    }
    if (display_name.length > 80) {
      return res.status(400).json({ error: 'display_name too long (max 80)' });
    }

    try {
      const upstream = await cfFetch(`/users/${token}`, {
        method: 'PUT',
        body: JSON.stringify({ display_name: display_name.trim() }),
      });
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    } catch {
      return res.status(503).json({ error: 'Storage unavailable' });
    }
  }

  return res.status(405).end();
}
