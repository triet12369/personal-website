import type { NextApiRequest } from 'next';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Cache the JWKS fetcher at module level so the public keys are only fetched
// (and cached by jose) once per process lifetime, not on every request.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS(teamDomain: string): ReturnType<typeof createRemoteJWKSet> {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
  }
  return jwks;
}

/**
 * Verifies the Cloudflare Access JWT on an incoming Next.js API request.
 *
 * Returns true when the request carries a valid CF Access token.
 *
 * Dev bypass: if CF_ACCESS_AUD or CF_ACCESS_TEAM_DOMAIN are not set (e.g.
 * running locally without a Cloudflare tunnel), all requests are treated as
 * authenticated so admin features remain usable in development.
 */
export async function verifyAdminRequest(req: NextApiRequest): Promise<boolean> {
  const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN;
  const aud = process.env.CF_ACCESS_AUD;

  // Dev bypass — CF Access not configured.
  // Use DEV_ADMIN=true to simulate an authenticated admin locally.
  if (!teamDomain || !aud) return process.env.DEV_ADMIN === 'true';

  // Prefer the dedicated assertion header; fall back to the CF_Authorization cookie.
  const rawHeader = req.headers['cf-access-jwt-assertion'];
  const token =
    (Array.isArray(rawHeader) ? rawHeader[0] : rawHeader) ??
    req.cookies['CF_Authorization'];

  if (!token) return false;

  try {
    await jwtVerify(token, getJWKS(teamDomain), {
      issuer: teamDomain,
      audience: aud,
    });
    return true;
  } catch {
    return false;
  }
}
