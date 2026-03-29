import { D1Database } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  API_TOKEN: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Constant-time string comparison to prevent timing attacks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function requireAuth(request: Request, env: Env): boolean {
  const auth = request.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return false;
  return timingSafeEqual(auth.slice(7), env.API_TOKEN);
}

/** SHA-256 hash of `ip:YYYY-MM-DD` — a daily-rotating, non-reversible digest. */
async function dailyIPHash(ip: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const data = new TextEncoder().encode(`${ip}:${today}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function handleViews(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  if (request.method === 'GET') {
    const row = await env.DB.prepare('SELECT count FROM views WHERE slug = ?')
      .bind(slug)
      .first<{ count: number }>();
    return json({ count: row?.count ?? 0 });
  }

  if (request.method === 'POST') {
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const today = new Date().toISOString().slice(0, 10);
    const ipHash = await dailyIPHash(ip);

    // Insert into view_hits; silently ignore if it already exists for today.
    const hit = await env.DB.prepare(
      'INSERT OR IGNORE INTO view_hits (slug, ip_hash, date) VALUES (?, ?, ?)',
    )
      .bind(slug, ipHash, today)
      .run();

    // Only increment the counter for genuinely new hits.
    if (hit.meta.changes > 0) {
      await env.DB.prepare(
        'INSERT INTO views (slug, count) VALUES (?, 1) ON CONFLICT (slug) DO UPDATE SET count = count + 1',
      )
        .bind(slug)
        .run();
    }

    const row = await env.DB.prepare('SELECT count FROM views WHERE slug = ?')
      .bind(slug)
      .first<{ count: number }>();
    return json({ count: row?.count ?? 1 });
  }

  return json({ error: 'Method Not Allowed' }, 405);
}

async function handleReactions(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  if (request.method === 'GET') {
    const result = await env.DB.prepare(
      'SELECT emoji, count FROM reactions WHERE slug = ? ORDER BY count DESC',
    )
      .bind(slug)
      .all<{ emoji: string; count: number }>();
    return json({ reactions: result.results });
  }

  if (request.method === 'POST') {
    if (!requireAuth(request, env)) return json({ error: 'Unauthorized' }, 401);

    let body: { emoji?: unknown };
    try {
      body = (await request.json()) as { emoji?: unknown };
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    const emoji = body.emoji;
    if (typeof emoji !== 'string' || !emoji.trim()) {
      return json({ error: 'emoji required' }, 400);
    }

    await env.DB.prepare(
      'INSERT INTO reactions (slug, emoji, count) VALUES (?, ?, 1) ON CONFLICT (slug, emoji) DO UPDATE SET count = count + 1',
    )
      .bind(slug, emoji)
      .run();

    const result = await env.DB.prepare(
      'SELECT emoji, count FROM reactions WHERE slug = ? ORDER BY count DESC',
    )
      .bind(slug)
      .all<{ emoji: string; count: number }>();
    return json({ reactions: result.results });
  }

  return json({ error: 'Method Not Allowed' }, 405);
}

async function handleComments(
  request: Request,
  env: Env,
  id: string,
): Promise<Response> {
  // DELETE /comments/:commentId — admin moderation; id is a comment UUID here.
  if (request.method === 'DELETE') {
    if (!requireAuth(request, env)) return json({ error: 'Unauthorized' }, 401);
    await env.DB.prepare('UPDATE comments SET approved = 0 WHERE id = ?')
      .bind(id)
      .run();
    return json({ success: true });
  }

  // GET /comments/:slug — list approved comments for a post slug.
  if (request.method === 'GET') {
    const result = await env.DB.prepare(
      'SELECT id, author_name, body, created_at FROM comments WHERE slug = ? AND approved = 1 ORDER BY created_at DESC',
    )
      .bind(id)
      .all<{ id: string; author_name: string; body: string; created_at: string }>();
    return json({ comments: result.results });
  }

  // POST /comments/:slug — add a comment to a post.
  if (request.method === 'POST') {
    if (!requireAuth(request, env)) return json({ error: 'Unauthorized' }, 401);

    let body: { author_name?: unknown; body?: unknown };
    try {
      body = (await request.json()) as { author_name?: unknown; body?: unknown };
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    const authorName = typeof body.author_name === 'string' ? body.author_name.trim() : '';
    const bodyText = typeof body.body === 'string' ? body.body.trim() : '';

    if (!authorName || !bodyText) {
      return json({ error: 'author_name and body required' }, 400);
    }
    if (authorName.length > 80) return json({ error: 'author_name too long (max 80)' }, 400);
    if (bodyText.length > 1000) return json({ error: 'body too long (max 1000)' }, 400);

    const commentId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await env.DB.prepare(
      'INSERT INTO comments (id, slug, author_name, body, created_at, approved) VALUES (?, ?, ?, ?, ?, 1)',
    )
      .bind(commentId, id, authorName, bodyText, createdAt)
      .run();

    return json(
      { comment: { id: commentId, author_name: authorName, body: bodyText, created_at: createdAt } },
      201,
    );
  }

  return json({ error: 'Method Not Allowed' }, 405);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.slice(1).split('/'); // strip leading '/'
    const [resource, id] = parts;

    if (!id) return json({ error: 'Not Found' }, 404);

    if (resource === 'views') return handleViews(request, env, id);
    if (resource === 'reactions') return handleReactions(request, env, id);
    if (resource === 'comments') return handleComments(request, env, id);

    return json({ error: 'Not Found' }, 404);
  },
};
