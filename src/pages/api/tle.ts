/**
 * TLE proxy — delegates to the Cloudflare Worker, which caches the TLE in D1
 * for 2 hours. This avoids both the serverless-ephemeral-cache problem on
 * Vercel and direct browser→CelesTrak calls that trigger per-IP rate limits.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { cfFetch } from '../../lib/cfWorker';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  let workerRes: Response;
  try {
    workerRes = await cfFetch('/tle/iss');
  } catch (err) {
    console.error('[/api/tle] worker fetch error:', err);
    return res.status(503).json({ error: 'Failed to fetch TLE data' });
  }

  const data = await workerRes.json() as Record<string, unknown>;

  if (!workerRes.ok) {
    return res.status(workerRes.status).json(data);
  }

  console.info(`[/api/tle] source=${data.source}`);

  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  return res.status(200).json(data);
}
