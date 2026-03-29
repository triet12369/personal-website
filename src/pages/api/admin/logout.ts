import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN;

  // In production, redirect the browser to the CF Access logout endpoint which
  // invalidates the CF_Authorization cookie across all Access applications.
  // In dev (no teamDomain), return null so the client can handle gracefully.
  return res.json({
    logoutUrl: teamDomain ? `${teamDomain}/cdn-cgi/access/logout` : null,
  });
}
