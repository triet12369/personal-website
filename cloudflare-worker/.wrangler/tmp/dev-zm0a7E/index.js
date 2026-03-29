var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json, "json");
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
__name(timingSafeEqual, "timingSafeEqual");
function requireAuth(request, env) {
  const auth = request.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  return timingSafeEqual(auth.slice(7), env.API_TOKEN);
}
__name(requireAuth, "requireAuth");
async function dailyIPHash(ip) {
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const data = new TextEncoder().encode(`${ip}:${today}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(dailyIPHash, "dailyIPHash");
async function handleViews(request, env, slug) {
  if (request.method === "GET") {
    const row = await env.DB.prepare("SELECT count FROM views WHERE slug = ?").bind(slug).first();
    return json({ count: row?.count ?? 0 });
  }
  if (request.method === "POST") {
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const ipHash = await dailyIPHash(ip);
    const hit = await env.DB.prepare(
      "INSERT OR IGNORE INTO view_hits (slug, ip_hash, date) VALUES (?, ?, ?)"
    ).bind(slug, ipHash, today).run();
    if (hit.meta.changes > 0) {
      await env.DB.prepare(
        "INSERT INTO views (slug, count) VALUES (?, 1) ON CONFLICT (slug) DO UPDATE SET count = count + 1"
      ).bind(slug).run();
    }
    const row = await env.DB.prepare("SELECT count FROM views WHERE slug = ?").bind(slug).first();
    return json({ count: row?.count ?? 1 });
  }
  return json({ error: "Method Not Allowed" }, 405);
}
__name(handleViews, "handleViews");
async function handleReactions(request, env, slug) {
  if (request.method === "GET") {
    const result = await env.DB.prepare(
      "SELECT emoji, count FROM reactions WHERE slug = ? ORDER BY count DESC"
    ).bind(slug).all();
    return json({ reactions: result.results });
  }
  if (request.method === "POST") {
    if (!requireAuth(request, env)) return json({ error: "Unauthorized" }, 401);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const emoji = body.emoji;
    if (typeof emoji !== "string" || !emoji.trim()) {
      return json({ error: "emoji required" }, 400);
    }
    await env.DB.prepare(
      "INSERT INTO reactions (slug, emoji, count) VALUES (?, ?, 1) ON CONFLICT (slug, emoji) DO UPDATE SET count = count + 1"
    ).bind(slug, emoji).run();
    const result = await env.DB.prepare(
      "SELECT emoji, count FROM reactions WHERE slug = ? ORDER BY count DESC"
    ).bind(slug).all();
    return json({ reactions: result.results });
  }
  return json({ error: "Method Not Allowed" }, 405);
}
__name(handleReactions, "handleReactions");
async function handleComments(request, env, id) {
  if (request.method === "DELETE") {
    if (!requireAuth(request, env)) return json({ error: "Unauthorized" }, 401);
    await env.DB.prepare("UPDATE comments SET approved = 0 WHERE id = ?").bind(id).run();
    return json({ success: true });
  }
  if (request.method === "GET") {
    const result = await env.DB.prepare(
      "SELECT id, author_name, body, created_at FROM comments WHERE slug = ? AND approved = 1 ORDER BY created_at DESC"
    ).bind(id).all();
    return json({ comments: result.results });
  }
  if (request.method === "POST") {
    if (!requireAuth(request, env)) return json({ error: "Unauthorized" }, 401);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const authorName = typeof body.author_name === "string" ? body.author_name.trim() : "";
    const bodyText = typeof body.body === "string" ? body.body.trim() : "";
    if (!authorName || !bodyText) {
      return json({ error: "author_name and body required" }, 400);
    }
    if (authorName.length > 80) return json({ error: "author_name too long (max 80)" }, 400);
    if (bodyText.length > 1e3) return json({ error: "body too long (max 1000)" }, 400);
    const commentId = crypto.randomUUID();
    const createdAt = (/* @__PURE__ */ new Date()).toISOString();
    await env.DB.prepare(
      "INSERT INTO comments (id, slug, author_name, body, created_at, approved) VALUES (?, ?, ?, ?, ?, 1)"
    ).bind(commentId, id, authorName, bodyText, createdAt).run();
    return json(
      { comment: { id: commentId, author_name: authorName, body: bodyText, created_at: createdAt } },
      201
    );
  }
  return json({ error: "Method Not Allowed" }, 405);
}
__name(handleComments, "handleComments");
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const parts = url.pathname.slice(1).split("/");
    const [resource, id] = parts;
    if (!id) return json({ error: "Not Found" }, 404);
    if (resource === "views") return handleViews(request, env, id);
    if (resource === "reactions") return handleReactions(request, env, id);
    if (resource === "comments") return handleComments(request, env, id);
    return json({ error: "Not Found" }, 404);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-0oFzzG/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-0oFzzG/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
