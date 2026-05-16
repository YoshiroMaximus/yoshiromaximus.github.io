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
    return env.ASSETS.fetch(request);
  },
};

// ─────────────── Notes API ───────────────
// R2 layout: notes/<slug>.md — one markdown file per note.
// Auth: single hardcoded user. env.NOTES_USER + env.NOTES_PASSWORD.
// Session: HttpOnly cookie `notes_auth` holding the password value.

const NOTES_PREFIX = 'notes/';
const NOTE_MAX_BYTES = 512 * 1024;        // 512 KB per note
const NOTE_MAX_SLUG = 80;
const NOTE_MAX_TITLE = 200;

async function handleNotes(request, env, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api','notes', maybe slug]
  const sub = parts[2];

  try {
    if (request.method === 'POST' && sub === 'login')  return notesLogin(request, env);
    if (request.method === 'POST' && sub === 'logout') return notesLogout(request);
    if (request.method === 'GET'  && sub === 'me')     return notesMe(request, env);

    if (!isAuthed(request, env)) return json({ error: 'Unauthorized' }, 401);

    if (request.method === 'GET'    && !sub)  return listNotes(env);
    if (request.method === 'GET'    && sub)   return getNote(env, sub);
    if (request.method === 'PUT'    && sub)   return putNote(request, env, sub);
    if (request.method === 'DELETE' && sub)   return deleteNote(env, sub);
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
  let cursor;
  do {
    const res = await env.R2.list({ prefix: NOTES_PREFIX, cursor, limit: 1000, include: ['customMetadata'] });
    cursor = res.truncated ? res.cursor : undefined;
    for (const obj of res.objects) {
      const slug = obj.key.slice(NOTES_PREFIX.length).replace(/\.md$/, '');
      const m = obj.customMetadata || {};
      out.push({
        slug,
        title: m.title || slug,
        size: obj.size,
        updatedAt: obj.uploaded?.toISOString?.() || m.updatedAt || '',
      });
    }
  } while (cursor);
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
    httpMetadata: { contentType: 'text/markdown; charset=utf-8' },
    customMetadata: { title, updatedAt },
  });
  return json({ ok: true, slug: safe, title, updatedAt });
}

async function deleteNote(env, slug) {
  const safe = sanitizeSlug(slug);
  if (!safe) return json({ error: 'Bad slug' }, 400);
  await env.R2.delete(NOTES_PREFIX + safe + '.md');
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

async function* iterDecks(env) {
  let cursor;
  do {
    const res = await env.R2.list({ prefix: PREFIX, cursor, limit: 1000, include: ['customMetadata'] });
    cursor = res.truncated ? res.cursor : undefined;
    for (const obj of res.objects) yield obj;
  } while (cursor);
}

function keyToId(key) {
  return key.slice(PREFIX.length).replace(/\.json$/, '');
}

async function listDecks(env) {
  const out = [];
  for await (const obj of iterDecks(env)) {
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
  for await (const obj of iterDecks(env)) {
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
