// Worker entrypoint: serves /api/decks/* from R2, falls through to assets.
// R2 layout: flashcards/<id>.json — one object per deck.

const PREFIX = 'flashcards/';
const MAX_BYTES = 200 * 1024;            // 200 KB deck cap
const MAX_CARDS = 2000;
const MAX_TITLE = 120;
const MAX_FIELD = 2000;
const MAX_SUBMITTER = 60;
const VALID_MODES = ['standard', 'fill-blank', 'vocab', 'define', 'language', 'formula', 'dates', 'quote'];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/decks')) {
      return handleApi(request, env, url);
    }
    if (url.pathname.startsWith('/api/notes')) {
      return handleNotes(request, env, url);
    }
    if (url.pathname.startsWith('/api/gambit')) {
      return handleGambit(request, env, url);
    }
    if (url.pathname.startsWith('/api/run')) {
      return handleRun(request, env, url);
    }
    if (url.pathname.startsWith('/api/flashcards/generate')) {
      return handleFlashcardsGenerate(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};

// ─────────────── Gambit Leaderboard API ───────────────

const GAMBIT_MAX_NAME = 30;
const GAMBIT_VALID_DIFFS = ['easy', 'medium', 'hard', 'grandmaster'];
const GAMBIT_VALID_MODES = ['campaign', 'infinite'];

async function handleGambit(request, env, url) {
  const parts = url.pathname.split('/').filter(Boolean);
  const sub = parts[2];
  try {
    if (request.method === 'GET'  && sub === 'leaderboard') return gambitLeaderboard(request, env, url);
    if (request.method === 'POST' && sub === 'score')       return gambitSubmit(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST', 'access-control-allow-headers': 'content-type' } });
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    return json({ error: e.message || 'Server error' }, 500);
  }
}

async function gambitLeaderboard(request, env, url) {
  if (!env.DB) return json({ error: 'Leaderboard not configured' }, 503);
  const mode = url.searchParams.get('mode') || 'all';
  const diff = url.searchParams.get('diff') || 'all';
  const orderCol = url.searchParams.get('sort') === 'recent' ? 'id' : 'score';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);

  const conditions = [];
  const bindings = [];
  if (mode !== 'all') { conditions.push('mode = ?'); bindings.push(mode); }
  if (diff !== 'all') { conditions.push('difficulty = ?'); bindings.push(diff); }
  let q = 'SELECT id, name, score, difficulty, mode, depth, gold, gambits, won, created_at FROM gambit_scores';
  if (conditions.length) q += ' WHERE ' + conditions.join(' AND ');
  q += ` ORDER BY ${orderCol} DESC LIMIT ?`;
  bindings.push(limit);

  const { results } = await env.DB.prepare(q).bind(...bindings).all();
  return json({ scores: results || [] });
}

async function gambitSubmit(request, env) {
  if (!env.DB) return json({ error: 'Leaderboard not configured' }, 503);
  const ip = request.headers.get('cf-connecting-ip') || 'anon';
  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: 'gambit:' + ip });
    if (!success) return json({ error: 'Too many submissions — wait a minute.' }, 429);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }

  const name = String(body.name || '').trim().slice(0, GAMBIT_MAX_NAME);
  if (!name) return json({ error: 'Name is required.' }, 400);
  if (!/^[A-Za-z0-9 _\-\.!?']+$/.test(name)) return json({ error: 'Name contains invalid characters.' }, 400);

  const score = parseInt(body.score, 10);
  if (!Number.isFinite(score) || score < 0) return json({ error: 'Invalid score.' }, 400);

  const difficulty = body.difficulty;
  if (!GAMBIT_VALID_DIFFS.includes(difficulty)) return json({ error: 'Invalid difficulty.' }, 400);

  const mode = body.mode;
  if (!GAMBIT_VALID_MODES.includes(mode)) return json({ error: 'Invalid mode.' }, 400);

  const depth = parseInt(body.depth, 10);
  if (!Number.isFinite(depth) || depth < 1 || depth > 999) return json({ error: 'Invalid depth.' }, 400);

  const gold = parseInt(body.gold, 10);
  if (!Number.isFinite(gold) || gold < 0 || gold > 99999999) return json({ error: 'Invalid gold.' }, 400);

  const won = body.won ? 1 : 0;
  let gambits = '[]';
  if (Array.isArray(body.gambits)) {
    gambits = JSON.stringify(body.gambits.map(g => String(g).slice(0, 30)).slice(0, 20));
  }

  const result = await env.DB.prepare(
    'INSERT INTO gambit_scores (name, score, difficulty, mode, depth, gold, gambits, won) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(name, score, difficulty, mode, depth, gold, gambits, won).run();

  return json({ ok: true, id: result.meta?.last_row_id }, 201);
}

// ─────────────── Run Leaderboard API ───────────────

const RUN_VALID_DIFFS = ['easy', 'normal', 'hard'];
const RUN_VALID_MODES = ['normal', 'daily'];

async function handleRun(request, env, url) {
  const parts = url.pathname.split('/').filter(Boolean);
  const sub = parts[2];
  try {
    if (request.method === 'GET'  && sub === 'leaderboard') return runLeaderboard(request, env, url);
    if (request.method === 'POST' && sub === 'score')       return runSubmit(request, env);
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    return json({ error: e.message || 'Server error' }, 500);
  }
}

async function runLeaderboard(request, env, url) {
  if (!env.DB) return json({ error: 'Leaderboard not configured' }, 503);
  const mode = url.searchParams.get('mode') || 'all';
  const diff = url.searchParams.get('diff') || 'all';
  const seed = url.searchParams.get('seed');
  const orderCol = url.searchParams.get('sort') === 'recent' ? 'id' : 'score';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);

  const conditions = [];
  const bindings = [];
  if (mode !== 'all') { conditions.push('mode = ?'); bindings.push(mode); }
  if (diff !== 'all') { conditions.push('difficulty = ?'); bindings.push(diff); }
  if (seed) { conditions.push('seed = ?'); bindings.push(seed); }
  let q = 'SELECT id, name, score, difficulty, mode, seed, coins, created_at FROM run_scores';
  if (conditions.length) q += ' WHERE ' + conditions.join(' AND ');
  q += ` ORDER BY ${orderCol} DESC LIMIT ?`;
  bindings.push(limit);

  const { results } = await env.DB.prepare(q).bind(...bindings).all();
  return json({ scores: results || [] });
}

async function runSubmit(request, env) {
  if (!env.DB) return json({ error: 'Leaderboard not configured' }, 503);
  const ip = request.headers.get('cf-connecting-ip') || 'anon';
  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: 'run:' + ip });
    if (!success) return json({ error: 'Too many submissions — wait a minute.' }, 429);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }

  const name = String(body.name || '').trim().slice(0, GAMBIT_MAX_NAME);
  if (!name) return json({ error: 'Name is required.' }, 400);
  if (!/^[A-Za-z0-9 _\-\.!?']+$/.test(name)) return json({ error: 'Name contains invalid characters.' }, 400);

  const score = parseInt(body.score, 10);
  if (!Number.isFinite(score) || score < 0 || score > 99999999) return json({ error: 'Invalid score.' }, 400);

  const difficulty = body.difficulty;
  if (!RUN_VALID_DIFFS.includes(difficulty)) return json({ error: 'Invalid difficulty.' }, 400);

  const mode = body.mode || 'normal';
  if (!RUN_VALID_MODES.includes(mode)) return json({ error: 'Invalid mode.' }, 400);

  const seed = String(body.seed || '').slice(0, 20);
  if (mode === 'daily' && !/^\d{4}-\d{2}-\d{2}$/.test(seed)) return json({ error: 'Invalid daily seed.' }, 400);

  const coins = parseInt(body.coins, 10);
  if (!Number.isFinite(coins) || coins < 0 || coins > 999999) return json({ error: 'Invalid coins.' }, 400);

  const result = await env.DB.prepare(
    'INSERT INTO run_scores (name, score, difficulty, mode, seed, coins) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(name, score, difficulty, mode, seed, coins).run();

  return json({ ok: true, id: result.meta?.last_row_id }, 201);
}

// ─────────────── Flashcard Generation (Workers AI) ───────────────
// Free-tier guards:
//   1. Workers Free plan (no billing relationship — calls past 10k neurons/day fail, never charge).
//   2. Per-IP rate limit via existing RATE_LIMITER (10/min).
//   3. Input truncated to 12k chars (~3k tokens) before sending.
//   4. Output capped at 2048 tokens.
//   5. Global daily call counter in D1 — refuses past FLASHCARDS_DAILY_CAP/day with headroom.
//
// One-time setup:
//   npx wrangler d1 execute gambit-leaderboard --remote \
//     --command="CREATE TABLE IF NOT EXISTS ai_usage (date TEXT PRIMARY KEY, calls INTEGER NOT NULL DEFAULT 0);"

const FLASHCARDS_MODEL = '@cf/google/gemma-4-26b-a4b-it';
const FLASHCARDS_MAX_INPUT_CHARS = 12000;
const FLASHCARDS_MAX_OUTPUT_TOKENS = 2048;
const FLASHCARDS_DAILY_CAP = 100; // ~83 neurons per worst-case call × 100 = 8300, leaves 1700 neuron headroom

async function handleFlashcardsGenerate(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type' } });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!env.AI) return json({ error: 'AI binding not configured.' }, 503);

  const ip = request.headers.get('cf-connecting-ip') || 'anon';
  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: 'flashgen:' + ip });
    if (!success) return json({ error: 'Too many requests — wait a minute.' }, 429);
  }

  const today = new Date().toISOString().slice(0, 10);
  if (env.DB) {
    try {
      const row = await env.DB.prepare('SELECT calls FROM ai_usage WHERE date = ?').bind(today).first();
      const callsToday = row?.calls || 0;
      if (callsToday >= FLASHCARDS_DAILY_CAP) {
        return json({ error: `Daily generation limit reached (${FLASHCARDS_DAILY_CAP}/day). Try again tomorrow.` }, 429);
      }
    } catch (e) {
      // Table missing or other D1 hiccup — fail open but log. Worst case is one extra call.
      console.warn('ai_usage check failed:', e.message);
    }
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }

  const text = String(body.text || '').trim();
  if (!text) return json({ error: 'No source text provided.' }, 400);
  const mode = VALID_MODES.includes(body.mode) ? body.mode : 'standard';
  const count = Math.min(Math.max(parseInt(body.count, 10) || 30, 1), 60);
  const title = String(body.title || '').trim().slice(0, MAX_TITLE);
  const focus = String(body.focus || '').trim().slice(0, 500);

  const truncated = text.length > FLASHCARDS_MAX_INPUT_CHARS
    ? text.slice(0, FLASHCARDS_MAX_INPUT_CHARS) + '\n[…truncated]'
    : text;

  const prompt = buildFlashcardsPrompt(truncated, mode, count, title, focus);

  let aiResp;
  try {
    aiResp = await env.AI.run(FLASHCARDS_MODEL, {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: FLASHCARDS_MAX_OUTPUT_TOKENS,
      temperature: 0.4,
    });
  } catch (e) {
    return json({ error: 'AI call failed: ' + (e.message || 'unknown') }, 502);
  }

  if (env.DB) {
    // Fire-and-forget increment. Table is created out-of-band (see setup comment).
    env.DB.prepare(
      'INSERT INTO ai_usage (date, calls) VALUES (?, 1) ON CONFLICT(date) DO UPDATE SET calls = calls + 1'
    ).bind(today).run().catch(() => {});
  }

  const raw = String(aiResp?.response || '').trim();
  return json({ raw, truncated: text.length > FLASHCARDS_MAX_INPUT_CHARS });
}

function buildFlashcardsPrompt(text, mode, count, title, focus) {
  const modeRules = {
    'standard':
      'Each "front" is a clear, specific question. Each "back" is a concise factual answer (one sentence or short phrase). Cover the most testable concepts.',
    'fill-blank':
      'Each "front" is a single declarative sentence from the source with the single most important term replaced by exactly "___" (three underscores). Each "back" is just the missing word or short phrase (no punctuation). Use only one blank per card. Pick sentences that test core concepts, not trivia, dates, or names of figures unless central.',
    'vocab':
      '"front" is a single vocabulary term (1–3 words). "back" is a clear one-sentence definition in plain English. Do not include the term inside its own definition.',
    'define':
      '"front" is a one-sentence definition or description (do NOT mention the term being defined). "back" is the single term it describes. Definition must be unambiguous (only one term could fit).',
    'language':
      '"front" is a foreign-language word or short phrase. "back" is the English translation. Include common verbs, nouns, and useful phrases. Skip cognates that are obvious.',
    'formula':
      '"front" is the name of a concept, law, or quantity. "back" is the formula or equation written in plain text (e.g., "F = m * a", "PV = nRT"). Include variable meanings only if essential.',
    'dates':
      '"front" is a historical event, treaty, war, movement, or turning point (one short phrase). "back" is the year or short date range (e.g., "1776", "1861–1865"). Focus on dates a student would be tested on.',
    'quote':
      '"front" is a short literary quote, line, or passage from the source (use real text only — do not invent). "back" is "Speaker / work — significance" in one line.',
  };
  const rule = modeRules[mode] || modeRules['standard'];
  return `You are turning study material into flashcards.

MODE: ${mode}
RULES FOR THIS MODE: ${rule}
MAX CARDS: ${count}
${focus ? `FOCUS: ${focus}\n` : ''}
Return ONLY valid JSON, no prose, no markdown code fences. Shape:
{
  "title": ${JSON.stringify(title || 'Generated deck')},
  "mode": "${mode}",
  "cards": [ { "front": "...", "back": "..." } ]
}

Keep cards atomic (one fact each). Skip headers, page numbers, table of contents, and references. Don't invent facts not in the source.

SOURCE MATERIAL:
"""
${text}
"""`;
}

// ─────────────── Notes API ───────────────
// R2 layout: notes/<slug>.md — one markdown file per note.
// Auth: single hardcoded user. env.NOTES_USER + env.NOTES_PASSWORD.
// Session: HttpOnly cookie `notes_auth` holding the password value.

const NOTES_PREFIX = 'notes/';
const TRASH_PREFIX = 'notes-trash/';
const ASSETS_PREFIX = 'notes-assets/';
const ASSETS_PUBLIC_BASE = 'https://r2.sn4k.org/';
const NOTE_MAX_BYTES = 512 * 1024;        // 512 KB per note
const NOTE_MAX_SLUG = 80;
const NOTE_MAX_TITLE = 200;
const ASSET_MAX_BYTES = 10 * 1024 * 1024; // 10 MB per upload
const MD_CONTENT_TYPE = 'text/markdown; charset=utf-8';
const ALLOWED_ASSET_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

async function* iterPrefix(env, prefix) {
  let cursor;
  do {
    const res = await env.R2.list({ prefix, cursor, limit: 1000, include: ['customMetadata'] });
    cursor = res.truncated ? res.cursor : undefined;
    for (const obj of res.objects) yield obj;
  } while (cursor);
}

async function handleNotes(request, env, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api','notes', maybe slug]
  const sub = parts[2];

  try {
    if (request.method === 'POST' && sub === 'login')  return notesLogin(request, env);
    if (request.method === 'POST' && sub === 'logout') return notesLogout(request);
    if (request.method === 'GET'  && sub === 'me')     return notesMe(request, env);

    if (!isAuthed(request, env)) return json({ error: 'Unauthorized' }, 401);

    if (request.method === 'GET'  && sub === 'index')  return indexNotes(env);
    if (request.method === 'POST' && sub === 'upload') return uploadAsset(request, env);
    if (request.method === 'GET'    && sub === 'trash' && !parts[3])               return listTrash(env);
    if (request.method === 'GET'    && sub === 'trash' && parts[3] && !parts[4])    return getTrashNote(env, parts[3]);
    if (request.method === 'POST'   && sub === 'trash' && parts[3] && parts[4] === 'restore') return restoreNote(env, parts[3]);
    if (request.method === 'DELETE' && sub === 'trash' && parts[3] && !parts[4])    return permanentDeleteNote(env, parts[3]);

    if (request.method === 'GET'    && !sub)  return listNotes(env);
    if (request.method === 'GET'    && sub)   return getNote(env, sub);
    if (request.method === 'PUT'    && sub)   return putNote(request, env, sub);
    if (request.method === 'DELETE' && sub)   return trashNote(env, sub);
    return json({ error: 'Method not allowed' }, 405);
  } catch (e) {
    return json({ error: e.message || 'Server error' }, 500);
  }
}

function isAuthed(request, env) {
  if (!env.NOTES_PASSWORD) return false;
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)notes_auth=([^;]+)/);
  if (!m) return false;
  return safeEq(decodeURIComponent(m[1]), env.NOTES_PASSWORD);
}

function safeEq(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function notesLogin(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || 'anon';
  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: 'notes-login:' + ip });
    if (!success) return json({ error: 'Too many attempts — wait a minute.' }, 429);
  }
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  const user = String(body.username || '');
  const pass = String(body.password || '');
  if (!env.NOTES_USER || !env.NOTES_PASSWORD) {
    return json({ error: 'Notes auth not configured on server.' }, 500);
  }
  if (!safeEq(user, env.NOTES_USER) || !safeEq(pass, env.NOTES_PASSWORD)) {
    return json({ error: 'Wrong username or password.' }, 401);
  }
  const cookie = buildCookie('notes_auth', pass, 2592000, request);
  return new Response(JSON.stringify({ ok: true, user }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'set-cookie': cookie },
  });
}

function buildCookie(name, value, maxAge, request) {
  const url = new URL(request.url);
  const secure = url.protocol === 'https:' ? ' Secure;' : '';
  return `${name}=${encodeURIComponent(value)}; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function notesLogout(request) {
  const cookie = buildCookie('notes_auth', '', 0, request);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'set-cookie': cookie },
  });
}

function notesMe(request, env) {
  if (!isAuthed(request, env)) return json({ authed: false }, 200);
  return json({ authed: true, user: env.NOTES_USER }, 200);
}

function sanitizeSlug(s) {
  if (!s || typeof s !== 'string') return null;
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(s)) return null;
  return s;
}

async function listNotes(env) {
  const out = [];
  for await (const obj of iterPrefix(env, NOTES_PREFIX)) {
    const slug = obj.key.slice(NOTES_PREFIX.length).replace(/\.md$/, '');
    const m = obj.customMetadata || {};
    out.push({
      slug,
      title: m.title || slug,
      size: obj.size,
      updatedAt: obj.uploaded?.toISOString?.() || m.updatedAt || '',
    });
  }
  out.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return json({ notes: out });
}

async function getNote(env, slug) {
  const safe = sanitizeSlug(slug);
  if (!safe) return json({ error: 'Bad slug' }, 400);
  const obj = await env.R2.get(NOTES_PREFIX + safe + '.md');
  if (!obj) return json({ error: 'Not found' }, 404);
  const m = obj.customMetadata || {};
  const text = await obj.text();
  return json({
    slug: safe,
    title: m.title || safe,
    content: text,
    updatedAt: obj.uploaded?.toISOString?.() || m.updatedAt || '',
  });
}

async function putNote(request, env, slug) {
  const safe = sanitizeSlug(slug);
  if (!safe) return json({ error: 'Bad slug' }, 400);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  const content = String(body.content ?? '');
  if (content.length > NOTE_MAX_BYTES) {
    return json({ error: `Note too large (limit ${Math.floor(NOTE_MAX_BYTES / 1024)} KB).` }, 413);
  }
  const title = String(body.title || safe).trim().slice(0, NOTE_MAX_TITLE) || safe;
  const updatedAt = new Date().toISOString();
  await env.R2.put(NOTES_PREFIX + safe + '.md', content, {
    httpMetadata: { contentType: MD_CONTENT_TYPE },
    customMetadata: { title, updatedAt },
  });
  return json({ ok: true, slug: safe, title, updatedAt });
}

async function indexNotes(env) {
  const objects = [];
  for await (const obj of iterPrefix(env, NOTES_PREFIX)) objects.push(obj);

  const out = await Promise.all(objects.map(async (obj) => {
    const slug = obj.key.slice(NOTES_PREFIX.length).replace(/\.md$/, '');
    const m = obj.customMetadata || {};
    const body = await env.R2.get(obj.key);
    return {
      slug,
      title: m.title || slug,
      content: body ? await body.text() : '',
      updatedAt: obj.uploaded?.toISOString?.() || m.updatedAt || '',
    };
  }));
  out.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return json({ notes: out });
}

async function uploadAsset(request, env) {
  const ct = (request.headers.get('content-type') || '').toLowerCase().split(';')[0].trim();
  const ext = ALLOWED_ASSET_TYPES[ct];
  if (!ext) return json({ error: 'Unsupported content type. Allowed: ' + Object.keys(ALLOWED_ASSET_TYPES).join(', ') }, 415);
  const buf = await request.arrayBuffer();
  if (buf.byteLength === 0) return json({ error: 'Empty body.' }, 400);
  if (buf.byteLength > ASSET_MAX_BYTES) return json({ error: `Too large (max ${ASSET_MAX_BYTES / 1024 / 1024} MB).` }, 413);

  const id = crypto.randomUUID().replace(/-/g, '');
  const stamp = new Date().toISOString().slice(0, 10);
  const key = `${ASSETS_PREFIX}${stamp}/${id}.${ext}`;
  await env.R2.put(key, buf, { httpMetadata: { contentType: ct } });
  return json({ url: ASSETS_PUBLIC_BASE + key, key, size: buf.byteLength });
}

async function trashNote(env, slug) {
  const safe = sanitizeSlug(slug);
  if (!safe) return json({ error: 'Bad slug' }, 400);
  const obj = await env.R2.get(NOTES_PREFIX + safe + '.md');
  if (!obj) return json({ ok: true });
  const m = obj.customMetadata || {};
  const content = await obj.text();
  await Promise.all([
    env.R2.put(TRASH_PREFIX + safe + '.md', content, {
      httpMetadata: { contentType: MD_CONTENT_TYPE },
      customMetadata: { ...m, deletedAt: new Date().toISOString() },
    }),
    env.R2.delete(NOTES_PREFIX + safe + '.md'),
  ]);
  return json({ ok: true });
}

async function listTrash(env) {
  const out = [];
  for await (const obj of iterPrefix(env, TRASH_PREFIX)) {
    const slug = obj.key.slice(TRASH_PREFIX.length).replace(/\.md$/, '');
    const m = obj.customMetadata || {};
    out.push({ slug, title: m.title || slug, deletedAt: m.deletedAt || '', updatedAt: m.updatedAt || '' });
  }
  out.sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));
  return json({ notes: out });
}

async function getTrashNote(env, slug) {
  const safe = sanitizeSlug(slug);
  if (!safe) return json({ error: 'Bad slug' }, 400);
  const obj = await env.R2.get(TRASH_PREFIX + safe + '.md');
  if (!obj) return json({ error: 'Not found in trash' }, 404);
  const m = obj.customMetadata || {};
  return json({ slug: safe, title: m.title || safe, content: await obj.text(), deletedAt: m.deletedAt || '', updatedAt: m.updatedAt || '' });
}

async function restoreNote(env, slug) {
  const safe = sanitizeSlug(slug);
  if (!safe) return json({ error: 'Bad slug' }, 400);
  const obj = await env.R2.get(TRASH_PREFIX + safe + '.md');
  if (!obj) return json({ error: 'Not found in trash' }, 404);
  const m = { ...obj.customMetadata };
  const content = await obj.text();
  delete m.deletedAt;
  await Promise.all([
    env.R2.put(NOTES_PREFIX + safe + '.md', content, {
      httpMetadata: { contentType: MD_CONTENT_TYPE },
      customMetadata: m,
    }),
    env.R2.delete(TRASH_PREFIX + safe + '.md'),
  ]);
  return json({ ok: true, slug: safe, title: m.title || safe });
}

async function permanentDeleteNote(env, slug) {
  const safe = sanitizeSlug(slug);
  if (!safe) return json({ error: 'Bad slug' }, 400);
  await env.R2.delete(TRASH_PREFIX + safe + '.md');
  return json({ ok: true });
}

// ─────────────── Decks API ───────────────

async function handleApi(request, env, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api','decks', maybe id]
  const id = parts[2];

  try {
    if (request.method === 'GET' && !id) return listDecks(env);
    if (request.method === 'GET' && id)  return getDeck(env, id);
    if (request.method === 'POST' && !id) return submitDeck(request, env);
    if (request.method === 'PATCH' && id) return patchDeck(request, env, id);
    if (request.method === 'DELETE' && id) return deleteDeck(request, env, id);
    return json({ error: 'Method not allowed' }, 405);
  } catch (e) {
    return json({ error: e.message || 'Server error' }, 500);
  }
}

function keyToId(key) {
  return key.slice(PREFIX.length).replace(/\.json$/, '');
}

async function listDecks(env) {
  const out = [];
  for await (const obj of iterPrefix(env, PREFIX)) {
    const m = obj.customMetadata || {};
    out.push({
      id: keyToId(obj.key),
      title: m.title || 'Untitled',
      mode: m.mode || 'standard',
      cardCount: Number(m.cardCount) || 0,
      submitter: m.submitter || '',
      createdAt: obj.uploaded?.toISOString?.() || m.createdAt || '',
      size: obj.size,
    });
  }
  out.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return json({ decks: out });
}

async function getDeck(env, id) {
  const safe = sanitizeId(id);
  if (!safe) return json({ error: 'Bad id' }, 400);
  const obj = await env.R2.get(PREFIX + safe + '.json');
  if (!obj) return json({ error: 'Not found' }, 404);
  return new Response(obj.body, {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' },
  });
}

async function submitDeck(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || 'anon';
  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    if (!success) return json({ error: 'Rate limit exceeded — try again in a minute.' }, 429);
  }

  const raw = await request.text();
  if (raw.length > MAX_BYTES) {
    return json({ error: `Deck too large (limit ${Math.floor(MAX_BYTES / 1024)} KB).` }, 413);
  }

  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid JSON.' }, 400); }

  const deck = validateDeck(body);
  if (deck.error) return json({ error: deck.error }, 400);

  const contentHash = await hashCards(deck.cards);
  const existing = await findByHash(env, contentHash);
  if (existing) {
    return json({
      error: 'This deck is already in the library.',
      duplicate: true,
      id: existing.id,
      title: existing.title,
    }, 409);
  }

  const id = makeId(deck.title);
  const createdAt = new Date().toISOString();
  const stored = {
    id,
    title: deck.title,
    mode: deck.mode,
    cards: deck.cards,
    submitter: deck.submitter,
    createdAt,
    contentHash,
  };

  await env.R2.put(PREFIX + id + '.json', JSON.stringify(stored), {
    httpMetadata: { contentType: 'application/json' },
    customMetadata: deckMetadata(stored),
  });

  return json({ id, title: deck.title, mode: deck.mode, cardCount: deck.cards.length, createdAt }, 201);
}

function deckMetadata(deck) {
  return {
    title: deck.title,
    mode: deck.mode,
    cardCount: String(deck.cards?.length || 0),
    submitter: deck.submitter || '',
    createdAt: deck.createdAt || new Date().toISOString(),
    contentHash: deck.contentHash || '',
  };
}

async function hashCards(cards) {
  const norm = cards
    .map(c => [String(c.front).trim().toLowerCase(), String(c.back).trim().toLowerCase()])
    .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]))
    .map(p => p.join(' '))
    .join('\n');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function findByHash(env, hash) {
  for await (const obj of iterPrefix(env, PREFIX)) {
    const m = obj.customMetadata || {};
    if (m.contentHash === hash) {
      return { id: keyToId(obj.key), title: m.title || 'Untitled' };
    }
  }
  return null;
}

async function patchDeck(request, env, id) {
  const pass = request.headers.get('x-admin-pass') || '';
  if (!env.ADMIN_PASSWORD || pass !== env.ADMIN_PASSWORD) {
    return json({ error: 'Unauthorized' }, 401);
  }
  const safe = sanitizeId(id);
  if (!safe) return json({ error: 'Bad id' }, 400);

  const key = PREFIX + safe + '.json';
  const obj = await env.R2.get(key);
  if (!obj) return json({ error: 'Not found' }, 404);
  const existing = await obj.json();

  let patch;
  try { patch = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }

  if (patch.title != null) {
    const t = String(patch.title).trim();
    if (!t) return json({ error: 'Title cannot be empty.' }, 400);
    if (t.length > MAX_TITLE) return json({ error: `Title too long (max ${MAX_TITLE}).` }, 400);
    existing.title = t;
  }
  if (patch.mode != null) {
    if (!VALID_MODES.includes(patch.mode)) return json({ error: 'Invalid mode.' }, 400);
    existing.mode = patch.mode;
  }
  if (patch.submitter != null) {
    existing.submitter = String(patch.submitter).trim().slice(0, MAX_SUBMITTER);
  }

  await env.R2.put(key, JSON.stringify(existing), {
    httpMetadata: { contentType: 'application/json' },
    customMetadata: deckMetadata(existing),
  });

  return json({ ok: true, id: safe, title: existing.title, mode: existing.mode, submitter: existing.submitter });
}

async function deleteDeck(request, env, id) {
  const pass = request.headers.get('x-admin-pass') || '';
  if (!env.ADMIN_PASSWORD || pass !== env.ADMIN_PASSWORD) {
    return json({ error: 'Unauthorized' }, 401);
  }
  const safe = sanitizeId(id);
  if (!safe) return json({ error: 'Bad id' }, 400);
  await env.R2.delete(PREFIX + safe + '.json');
  return json({ ok: true });
}

function validateDeck(b) {
  if (!b || typeof b !== 'object') return { error: 'Body must be an object.' };
  const title = String(b.title || '').trim();
  if (!title) return { error: 'Title is required.' };
  if (title.length > MAX_TITLE) return { error: `Title too long (max ${MAX_TITLE}).` };

  const mode = VALID_MODES.includes(b.mode) ? b.mode : 'standard';

  if (!Array.isArray(b.cards) || !b.cards.length) return { error: 'cards must be a non-empty array.' };
  if (b.cards.length > MAX_CARDS) return { error: `Too many cards (max ${MAX_CARDS}).` };

  const cards = [];
  for (let i = 0; i < b.cards.length; i++) {
    const c = b.cards[i];
    if (!c || typeof c !== 'object') return { error: `Card ${i + 1} is not an object.` };
    const front = c.front ?? c.q ?? c.question ?? c.term;
    const back  = c.back  ?? c.a ?? c.answer   ?? c.definition;
    if (front == null || back == null) return { error: `Card ${i + 1} missing front/back.` };
    const f = String(front), bk = String(back);
    if (f.length > MAX_FIELD || bk.length > MAX_FIELD) {
      return { error: `Card ${i + 1} field too long (max ${MAX_FIELD}).` };
    }
    cards.push({ front: f, back: bk });
  }

  const submitter = String(b.submitter || '').trim().slice(0, MAX_SUBMITTER);
  return { title, mode, cards, submitter };
}

function makeId(title) {
  const slug = title.toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'deck';
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  return `${slug}-${rand}`;
}

function sanitizeId(id) {
  if (!id || typeof id !== 'string') return null;
  if (!/^[a-z0-9-]{1,80}$/.test(id)) return null;
  return id;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
