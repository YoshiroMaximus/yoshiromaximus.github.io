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
    return env.ASSETS.fetch(request);
  },
};

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

async function listDecks(env) {
  const out = [];
  let cursor;
  do {
    const res = await env.R2.list({ prefix: PREFIX, cursor, limit: 1000, include: ['customMetadata'] });
    cursor = res.truncated ? res.cursor : undefined;
    for (const obj of res.objects) {
      const m = obj.customMetadata || {};
      out.push({
        id: obj.key.slice(PREFIX.length).replace(/\.json$/, ''),
        title: m.title || 'Untitled',
        mode: m.mode || 'standard',
        cardCount: Number(m.cardCount) || 0,
        submitter: m.submitter || '',
        createdAt: obj.uploaded?.toISOString?.() || m.createdAt || '',
        size: obj.size,
      });
    }
  } while (cursor);
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

  const ctLen = Number(request.headers.get('content-length') || '0');
  if (ctLen && ctLen > MAX_BYTES) {
    return json({ error: `Deck too large (limit ${Math.floor(MAX_BYTES / 1024)} KB).` }, 413);
  }

  const raw = await request.text();
  if (raw.length > MAX_BYTES) {
    return json({ error: `Deck too large (limit ${Math.floor(MAX_BYTES / 1024)} KB).` }, 413);
  }

  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid JSON.' }, 400); }

  const deck = validateDeck(body);
  if (deck.error) return json({ error: deck.error }, 400);

  const id = makeId(deck.title);
  const createdAt = new Date().toISOString();
  const stored = {
    id,
    title: deck.title,
    mode: deck.mode,
    cards: deck.cards,
    submitter: deck.submitter,
    createdAt,
  };

  await env.R2.put(PREFIX + id + '.json', JSON.stringify(stored), {
    httpMetadata: { contentType: 'application/json' },
    customMetadata: {
      title: deck.title,
      mode: deck.mode,
      cardCount: String(deck.cards.length),
      submitter: deck.submitter,
      createdAt,
    },
  });

  return json({ id, title: deck.title, mode: deck.mode, cardCount: deck.cards.length, createdAt }, 201);
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
    customMetadata: {
      title: existing.title,
      mode: existing.mode,
      cardCount: String(existing.cards?.length || 0),
      submitter: existing.submitter || '',
      createdAt: existing.createdAt || new Date().toISOString(),
    },
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
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
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
