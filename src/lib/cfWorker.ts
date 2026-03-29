/**
 * Thin wrapper around the Cloudflare Worker API.
 * Always attaches the bearer token (workers only enforce it on mutating routes).
 * Throws if env vars are not configured.
 */
export function cfFetch(path: string, init?: RequestInit): Promise<Response> {
  const baseUrl = process.env.CF_WORKER_URL;
  const token = process.env.CF_WORKER_TOKEN;

  if (!baseUrl || !token) {
    return Promise.reject(new Error('CF_WORKER_URL / CF_WORKER_TOKEN not set'));
  }

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}
