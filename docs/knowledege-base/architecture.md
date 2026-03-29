# Project Architecture — Personal Website

> **Audience**: AI agents and developers working in this codebase.  
> Last updated: 2026-03-29

---

## 1. High-Level Overview

This is a **bilingual (EN/VI) personal website** for Triet (Tristan) Cao, built with Next.js 12. It consists of three distinct layers:

```
┌─────────────────────────────────────────────────────┐
│  Next.js Frontend (Vercel)                          │
│  - Static site (SSG) with MDX content               │
│  - Mantine UI + SCSS modules                        │
│  - i18n: EN/VI runtime language switch              │
└────────────────────┬────────────────────────────────┘
                     │ API proxy (Next.js /api routes)
┌────────────────────▼────────────────────────────────┐
│  Cloudflare Worker API                              │
│  - Views, Reactions, Comments, User profiles        │
│  - Auth: Bearer token + Cloudflare Access JWT       │
└────────────────────┬────────────────────────────────┘
                     │ SQL via D1 binding
┌────────────────────▼────────────────────────────────┐
│  Cloudflare D1 (SQLite)                             │
│  - views, view_hits, comments, reactions,           │
│    reaction_hits, user_profiles, user_name_history  │
└─────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

### Frontend
| Package | Version | Purpose |
|---|---|---|
| Next.js | 12.2.4 | SSR/SSG framework, file-based routing |
| React | 18.2.0 | UI rendering |
| TypeScript | 5.9.3 | Type safety (strict mode) |
| Mantine | 8.3.18 | Component library + theming |
| next-mdx-remote | 6.0.0 | MDX rendering for blog/project content |
| i18next + react-i18next | 23/14 | EN/VI internationalization |
| zustand | 4.3.2 | Client state management |
| jose | 6.2.2 | JWT verification (Cloudflare Access) |
| gray-matter | 4.0.3 | YAML frontmatter parsing |
| sass | 1.69.5 | SCSS support |

### Backend (Cloudflare Worker)
| Package | Purpose |
|---|---|
| Cloudflare Workers runtime | Serverless edge API |
| Cloudflare D1 | SQLite database via Worker binding `DB` |
| @cloudflare/workers-types | TypeScript types |

### Build & Deploy
- **Vercel** (Node 24.x) — Frontend hosting + environment variables
- `npm run build:demos` — Builds Rust/WASM demo artifacts
- `node scripts/copy-demos.js` — Copies demo `dist/` → `public/demos/`
- `wrangler` — Cloudflare Worker deploy tool

---

## 3. Directory Structure

```
/
├── src/
│   ├── pages/           # Next.js routes (SSG)
│   │   ├── index.tsx        → /
│   │   ├── blog/
│   │   │   ├── index.tsx    → /blog
│   │   │   └── [slug].tsx   → /blog/:slug
│   │   ├── projects/
│   │   │   ├── index.tsx    → /projects
│   │   │   └── [slug].tsx   → /projects/:slug
│   │   ├── admin.tsx        → /admin (CF Access protected)
│   │   └── api/             # Next.js API routes (proxy to CF Worker)
│   ├── components/      # Feature/UI components (colocated .module.scss)
│   ├── content/         # MDX source files
│   │   ├── blog/{slug}/index.mdx  (+index.vi.mdx)
│   │   └── projects/{slug}/index.mdx  (+index.vi.mdx)
│   ├── lib/             # Server-side content helpers (blog.ts, projects.ts)
│   ├── hooks/           # React hooks
│   ├── providers/       # React context providers
│   ├── stores/          # zustand / localStorage helpers
│   ├── i18n/index.ts    # All translation strings (EN + VI)
│   ├── config/          # Site title, Mantine theme config
│   ├── routes/index.ts  # ROUTES constant for navigation
│   ├── styles/          # global.css, _mixins.scss
│   └── types/           # Global TypeScript declarations
├── cloudflare-worker/   # Backend Worker source
│   ├── src/index.ts         # All API route handlers
│   ├── migrations/          # D1 SQL migrations (run with wrangler)
│   └── wrangler.toml        # Worker config (name, D1 binding, secrets)
├── demos/               # Self-contained interactive demo projects
│   └── ray-tracing/         # Rust → WASM demo
├── public/              # Static assets; demos copied here at build
├── docs/knowledege-base/ # Architecture docs, Mantine reference
└── scripts/copy-demos.js # Demo build post-processor
```

---

## 4. Pages & SSG Strategy

All pages use `getStaticProps` (static generation). No ISR/revalidation — content updates on redeploy.

| Route | Data source | Key components |
|---|---|---|
| `/` | `getAllPosts().slice(0, 3)` | `CosmosHero`, `PostTimeline` |
| `/blog` | `getAllPosts()` | `PostTimeline` |
| `/blog/[slug]` | `getPostBySlug(slug)` | MDX, `Comments`, `Reactions`, `ViewCount` |
| `/projects` | `getAllProjects()` | `ProjectList` |
| `/projects/[slug]` | `getProjectBySlug(slug)` | MDX, `Reactions`, `ViewCount` |
| `/admin` | Client-side CF Access check | `useAdminAuth()` |

**Blog post redirect**: If `frontmatter.href` is set, `[slug].tsx` redirects there instead of rendering MDX.

---

## 5. Content System

### Source Format
- Location: `src/content/{blog|projects}/{slug}/`
- English: `index.mdx` (required)
- Vietnamese: `index.vi.mdx` (optional; falls back to EN)
- Images: colocated in the slug directory

### Blog Frontmatter (`BlogPostFrontmatter`)
```yaml
title: string          # required
date: string           # ISO date, e.g. "2024-01-15" — required
description?: string
tags?: string[]
href?: string          # if set, page redirects here
image?: string         # filename in same dir
```

### Project Frontmatter (`ProjectFrontmatter`)
```yaml
title: string          # required
description: string    # required
href?: string          # external project URL
techStack?: string[]
image?: string
```

### Image Pipeline
- `src/lib/resolveContentImage.ts` detects `cover.{png,jpg,jpeg,webp,gif}`
- Copies to `/public/content/{subPath}/` at build time
- Returns public URL for use in `<Image>` / `<meta og:image>`

### Content Helper Functions
- `src/lib/blog.ts`: `getAllPosts()`, `getPostBySlug(slug)`
- `src/lib/projects.ts`: `getAllProjects()`, `getProjectBySlug(slug)`
- Both return sorted results (blog: newest first; projects: alphabetical)

### MDX Custom Components
- `src/components/Blog/MDXComponents.tsx` — global overrides (h1–h6, p, a, code, pre, ul, ol, li)
- `src/components/Blog/registry.ts` — per-post component injection (e.g., `DemoFrame`, `WeatherWidget`)
- `src/components/Projects/registry.ts` — per-project component injection

---

## 6. Internationalization (i18n)

**Implementation**: react-i18next + custom `useT()` hook

### Languages
- `en` — English (default)
- `vi` — Vietnamese

### Namespaces in `src/i18n/index.ts`
`nav`, `home`, `blog`, `projects`, `layout`, `theme`, `comments`, `demo`

### Usage Rules (ALWAYS FOLLOW)
1. **Never hardcode UI strings.** Add keys to both locales in `src/i18n/index.ts`.
2. **In JSX**: use `useT()` → `const t = useT()` → `{t('namespace.key')}`
3. **In string contexts** (placeholder, aria-label, Layout title): use `useTranslation` from react-i18next → `const { t: tStr } = useTranslation()`
4. **Raw bilingual text** (e.g. from MDX frontmatter): `t({ en: '...', vi: '...' })`

### Language Switching
- `LanguageProvider` manages `lang` state, persisted to localStorage (`TCPAGE_LANG`)
- Browser language detection: defaults to `vi` if `navigator.language.startsWith('vi')`
- 300ms debounced transitions; `AnimatedSpan` wraps text for smooth scramble animations

---

## 7. Theming

**Provider**: `ThemeProvider` wraps `MantineProvider` with `MY_DEFAULT_THEME` from `src/config/theme.ts`

- **Default**: dark mode
- **Persistence**: localStorage key `TCPAGE_THEME`, via Mantine `ColorSchemeScript`
- **Fonts**:
  - Display/headings: Cormorant Garamond (400, serif) — from Google Fonts
  - UI/body: Raleway (sans-serif) — from Google Fonts
- **Color palette** (name: `"pantone"`): 10-step warm brown scale, light `#f6f4f3` → dark `#3c362e`
- CSS variables in `global.css`: `--font-display`, `--font-ui`, `--backgroundColor`, `--lightBg`, `--darkBg`
- SCSS mixins in `_mixins.scss`: `link-styles`, `hover-styles`, `tag-styles`

---

## 8. Component Inventory

| Component | Location | Purpose |
|---|---|---|
| `AnimatedText / AnimatedSpan` | `components/AnimatedText/` | Character-scramble text transitions on language switch |
| `CosmosHero` | `components/Hero/` | Full-height hero with astronomy background |
| `FlipName / FullName` | `components/FlipName/` | Animated name display in hero |
| `StarBackground` | `components/StarBackground/` | CSS animated starfield |
| `Layout` | `components/Layout/` | Page shell: header, nav, footer, star bg |
| `NavBar` | `components/Navigation/` | Links: Home / Blog / Projects |
| `LanguageSwitcher` | `components/Navigation/` | EN/VI toggle |
| `PostTimeline` | `components/Blog/` | Blog list with date/excerpt |
| `MDXComponents` | `components/Blog/` | MDX element overrides |
| `ProjectList` | `components/Projects/` | Project card grid |
| `DemoFrame` | `components/DemoFrame/` | Sandboxed iframe for demos |
| `Comments` | `components/Engagement/` | Threaded comment system |
| `CommentCount` | `components/Engagement/` | Total comment badge |
| `Reactions` | `components/Engagement/` | Emoji reaction buttons |
| `ViewCount` | `components/Engagement/` | Page view counter |

---

## 9. Hooks

| Hook | File | Purpose |
|---|---|---|
| `useT()` | `hooks/useT.tsx` | Bilingual text renderer using `AnimatedSpan` |
| `useLanguage()` | `hooks/useLanguage.ts` | Returns `{ lang, pendingLang, isTransitioning, setLang }` |
| `useComments(slug, token)` | `hooks/useComments.ts` | CRUD for threaded comments with optimistic updates |
| `useReactions(slug)` | `hooks/useReactions.ts` | Emoji reactions with optimistic updates |
| `useViews(slug, increment?)` | `hooks/useViews.ts` | View count; `increment=true` fires a POST |
| `useAdminAuth()` | `hooks/useAdminAuth.ts` | CF Access JWT check; returns `{ isAdmin, adminName, logout }` |
| `useUserIdentity()` | `hooks/useUserIdentity.ts` | Browser UUID token + display name persistence |

---

## 10. API Routes (Next.js → Cloudflare Worker Proxy)

All `src/pages/api/` routes validate inputs then proxy to the CF Worker URL (`CF_WORKER_URL` env var).

| Route | Methods | Notes |
|---|---|---|
| `/api/views/[slug]` | GET, POST | GET = read count; POST = increment |
| `/api/reactions/[slug]` | GET, POST | POST requires `emoji` field |
| `/api/comments/[slug]` | GET, POST, DELETE | POST validates author (≤80 chars), body (≤1000 chars); DELETE admin-only |
| `/api/users/[token]` | GET (history), PUT | PUT requires `display_name` (≤80 chars) |
| `/api/admin/me` | GET | Returns `{ admin, name }` via CF Access JWT |
| `/api/admin/logout` | POST | Returns CF Access logout URL |

---

## 11. Cloudflare Worker API

**Entry point**: `cloudflare-worker/src/index.ts`  
**Worker name**: `personal-site-api`  
**D1 binding**: `DB`

### Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/views/:slug` | GET | None | Return view count |
| `/views/:slug` | POST | None | Increment (daily IP dedup via SHA-256) |
| `/reactions/:slug` | GET | None | List reactions `{ emoji, count }[]` |
| `/reactions/:slug` | POST | Bearer | Add reaction (daily IP/emoji dedup) |
| `/comments/:slug` | GET | None | List approved comments with threading |
| `/comments/:slug` | POST | Bearer | Create comment or reply (`parent_id` optional) |
| `/comments/:slug` | DELETE | Bearer | Soft-delete comment (`approved = 0`) |
| `/users/:token` | PUT | Bearer | Update user display name |
| `/users/:token/history` | GET | Bearer | Fetch name change history |

**Auth**: `Authorization: Bearer {CF_WORKER_TOKEN}` (Next.js API routes inject this).  
**CORS**: Handled by Worker for browser requests.  
**Security**: `timingSafeEqual()` prevents timing attacks on token comparison.

---

## 12. Database Schema (Cloudflare D1)

Managed via numbered migrations in `cloudflare-worker/migrations/`.

```sql
-- Core (0001)
views          (slug TEXT PK, count INTEGER)
view_hits      (slug, ip_hash, date — composite PK for dedup)
comments       (id, slug, author_name, body, created_at, approved INTEGER)
reactions      (slug, emoji — composite PK, count INTEGER)

-- Threading (0002)
comments.parent_id  TEXT REFERENCES comments(id)

-- User profiles (0003)
user_profiles       (token TEXT PK, display_name, updated_at)
user_name_history   (id, token, name, changed_at)
comments.user_token TEXT
comments.is_owner   INTEGER

-- Reaction dedup (0004)
reaction_hits  (slug, emoji, ip_hash, date — composite PK)
```

---

## 13. Auth & Security Model

Three tiers:

| Tier | Mechanism | Can do |
|---|---|---|
| **Public** | None | Read views, comments, reactions |
| **User** | Browser UUID (localStorage) | Write comments, write reactions |
| **Admin** | Cloudflare Access JWT (`CF_ACCESS_AUD`) | Delete comments, view name history |

- Dev override: set `DEV_ADMIN=true` to bypass CF Access JWT check.
- JWT verification via `jose` in `src/lib/cfAccess.ts`.

---

## 14. Demos

Self-contained interactive projects under `demos/`. Currently:

- **`ray-tracing`** — Rust compiled to WebAssembly via `wasm-bindgen`
  - Source: `demos/ray-tracing/src/lib.rs`
  - Compiled output: `demos/ray-tracing/pkg/` (JS bindings + `.wasm`)
  - Entry: `demos/ray-tracing/main.js` — imports WASM, renders to `<canvas>`

**Build pipeline**:
1. `npm run build:demos` → runs workspace builds (Rust → WASM)
2. `node scripts/copy-demos.js` → copies `demos/{name}/dist/` → `public/demos/{name}/`
3. `DemoFrame` component renders demo via sandboxed `<iframe src="/demos/{slug}/index.html">`

---

## 15. Environment Variables

### Required in Vercel (Next.js)
| Variable | Purpose |
|---|---|
| `CF_WORKER_URL` | Base URL of the Cloudflare Worker API |
| `CF_WORKER_TOKEN` | Bearer token to authenticate against Worker |
| `CF_ACCESS_AUD` | CF Access JWT audience (production only) |
| `CF_ACCESS_TEAM_DOMAIN` | CF Access team domain (production only) |
| `ADMIN_DISPLAY_NAME` | Display name shown on admin comments |
| `DEV_ADMIN` | Set `"true"` to skip CF Access in local dev |

### Required in Cloudflare Worker
| Variable | Purpose |
|---|---|
| `API_TOKEN` | Secret — must match `CF_WORKER_TOKEN` above |

---

## 16. Key Architectural Patterns & Conventions

### Filesystem-Based Content
Add a new post by creating `src/content/blog/{slug}/index.mdx`. No database or CMS required.

### Optimistic UI
Comments, reactions, and views update the local state immediately, then sync to the server. Rollback on error.

### Deduplication
Views and reactions are deduplicated by a daily-rotating SHA-256 hash of the visitor's IP, ensuring a single user isn't counted multiple times per day.

### MDX Component Registry
Custom React components injected per-post via `src/components/Blog/registry.ts`. Add a slug key with a component map to make custom components available in that post's MDX.

### Colocated Styles
Each component directory contains a `.module.scss` file alongside the TSX. Global utilities live in `src/styles/`.

### Route Constants
All navigation hrefs must come from `src/routes/index.ts` (`ROUTES`). Never hardcode path strings.
