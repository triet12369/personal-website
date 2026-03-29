import { D1Database } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  API_TOKEN: string;
}

/** Validates that a value is a v4 UUID, preventing injection via query params. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const today = new Date().toISOString().slice(0, 10);
    const ipHash = await dailyIPHash(ip);

    // One increment per IP per emoji per day — silently ignore duplicates.
    const hit = await env.DB.prepare(
      'INSERT OR IGNORE INTO reaction_hits (slug, emoji, ip_hash, date) VALUES (?, ?, ?, ?)',
    )
      .bind(slug, emoji, ipHash, today)
      .run();

    if (hit.meta.changes > 0) {
      await env.DB.prepare(
        'INSERT INTO reactions (slug, emoji, count) VALUES (?, ?, 1) ON CONFLICT (slug, emoji) DO UPDATE SET count = count + 1',
      )
        .bind(slug, emoji)
        .run();
    }

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

  // GET /comments/:slug — list approved comments with user identity metadata.
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const rawViewer = url.searchParams.get('viewer_token');
    const viewerToken = rawViewer && UUID_RE.test(rawViewer) ? rawViewer : null;

    const result = await env.DB.prepare(`
      SELECT
        c.id,
        c.author_name,
        COALESCE(up.display_name, c.author_name) AS display_name,
        c.body,
        c.created_at,
        c.parent_id,
        c.is_owner,
        CASE WHEN c.user_token IS NOT NULL AND c.user_token = ? THEN 1 ELSE 0 END AS is_mine,
        (SELECT GROUP_CONCAT(nh.name, '|||')
         FROM user_name_history nh WHERE nh.token = c.user_token) AS name_history_raw
      FROM comments c
      LEFT JOIN user_profiles up ON c.user_token = up.token
      WHERE c.slug = ? AND c.approved = 1
      ORDER BY c.created_at ASC
    `)
      .bind(viewerToken, id)
      .all<{
        id: string;
        author_name: string;
        display_name: string;
        body: string;
        created_at: string;
        parent_id: string | null;
        is_owner: number;
        is_mine: number;
        name_history_raw: string | null;
      }>();

    const comments = result.results.map((c) => ({
      id: c.id,
      author_name: c.author_name,
      display_name: c.display_name,
      body: c.body,
      created_at: c.created_at,
      parent_id: c.parent_id,
      is_owner: c.is_owner === 1,
      is_mine: c.is_mine === 1,
      name_history: c.name_history_raw ? c.name_history_raw.split('|||') : [],
    }));

    return json({ comments });
  }

  // POST /comments/:slug — add a comment to a post.
  if (request.method === 'POST') {
    if (!requireAuth(request, env)) return json({ error: 'Unauthorized' }, 401);

    let body: { author_name?: unknown; body?: unknown; parent_id?: unknown; user_token?: unknown; is_owner?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    const authorName = typeof body.author_name === 'string' ? body.author_name.trim() : '';
    const bodyText = typeof body.body === 'string' ? body.body.trim() : '';
    const parentId = typeof body.parent_id === 'string' ? body.parent_id.trim() : null;
    const rawToken = typeof body.user_token === 'string' ? body.user_token.trim() : null;
    const userToken = rawToken && UUID_RE.test(rawToken) ? rawToken : null;
    const isOwner = body.is_owner === true ? 1 : 0;

    if (!authorName || !bodyText) {
      return json({ error: 'author_name and body required' }, 400);
    }
    if (authorName.length > 80) return json({ error: 'author_name too long (max 80)' }, 400);
    if (bodyText.length > 1000) return json({ error: 'body too long (max 1000)' }, 400);

    // Upsert user profile; record old name in history if it changed.
    if (userToken) {
      const existing = await env.DB.prepare(
        'SELECT display_name FROM user_profiles WHERE token = ?',
      ).bind(userToken).first<{ display_name: string }>();

      const now = new Date().toISOString();
      if (!existing) {
        await env.DB.prepare(
          'INSERT INTO user_profiles (token, display_name, updated_at) VALUES (?, ?, ?)',
        ).bind(userToken, authorName, now).run();
      } else if (existing.display_name !== authorName) {
        await env.DB.prepare(
          'INSERT INTO user_name_history (id, token, name, changed_at) VALUES (?, ?, ?, ?)',
        ).bind(crypto.randomUUID(), userToken, existing.display_name, now).run();
        await env.DB.prepare(
          'UPDATE user_profiles SET display_name = ?, updated_at = ? WHERE token = ?',
        ).bind(authorName, now, userToken).run();
      }
    }

    const commentId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await env.DB.prepare(
      'INSERT INTO comments (id, slug, author_name, body, created_at, approved, parent_id, user_token, is_owner) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)',
    ).bind(commentId, id, authorName, bodyText, createdAt, parentId, userToken, isOwner).run();

    return json({
      comment: {
        id: commentId,
        author_name: authorName,
        display_name: authorName,
        body: bodyText,
        created_at: createdAt,
        parent_id: parentId,
        is_owner: isOwner === 1,
        is_mine: userToken !== null,
        name_history: [],
      },
    }, 201);
  }

  return json({ error: 'Method Not Allowed' }, 405);
}

// ---------------------------------------------------------------------------
// User profile handler
// ---------------------------------------------------------------------------

async function handleUsers(
  request: Request,
  env: Env,
  token: string,
  subresource: string | undefined,
): Promise<Response> {
  if (!UUID_RE.test(token)) return json({ error: 'Invalid token' }, 400);

  // GET /users/:token/history — public name history for a token.
  if (request.method === 'GET' && subresource === 'history') {
    const result = await env.DB.prepare(
      'SELECT name, changed_at FROM user_name_history WHERE token = ? ORDER BY changed_at DESC',
    ).bind(token).all<{ name: string; changed_at: string }>();
    return json({ history: result.results });
  }

  // PUT /users/:token — update display name (token is the user's own identity).
  if (request.method === 'PUT') {
    let body: { display_name?: unknown };
    try {
      body = (await request.json()) as { display_name?: unknown };
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : '';
    if (!displayName) return json({ error: 'display_name required' }, 400);
    if (displayName.length > 80) return json({ error: 'display_name too long (max 80)' }, 400);

    const existing = await env.DB.prepare(
      'SELECT display_name FROM user_profiles WHERE token = ?',
    ).bind(token).first<{ display_name: string }>();

    const now = new Date().toISOString();
    if (!existing) {
      await env.DB.prepare(
        'INSERT INTO user_profiles (token, display_name, updated_at) VALUES (?, ?, ?)',
      ).bind(token, displayName, now).run();
    } else if (existing.display_name !== displayName) {
      await env.DB.prepare(
        'INSERT INTO user_name_history (id, token, name, changed_at) VALUES (?, ?, ?, ?)',
      ).bind(crypto.randomUUID(), token, existing.display_name, now).run();
      await env.DB.prepare(
        'UPDATE user_profiles SET display_name = ?, updated_at = ? WHERE token = ?',
      ).bind(displayName, now, token).run();
    }

    return json({ success: true, display_name: displayName });
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
    const [resource, id, subresource] = parts;

    if (!id) return json({ error: 'Not Found' }, 404);

    if (resource === 'views') return handleViews(request, env, id);
    if (resource === 'reactions') return handleReactions(request, env, id);
    if (resource === 'comments') return handleComments(request, env, id);
    if (resource === 'users') return handleUsers(request, env, id, subresource);

    return json({ error: 'Not Found' }, 404);
  },
};
