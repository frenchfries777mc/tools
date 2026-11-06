/* Fry Tools MCP connector. A Cloudflare Worker: Claude connects with a Frenchfries777 account login (OAuth), then can list, read, search and write the Tools documents.
   Secret (never in code): SIGN_KEY = a long random text. Login check = the site's Supabase accounts; table public.tools_owner_link links an account to its store key.
   Address to add in Claude: https://<worker>/mcp */
const STORE = 'https://140-238-55-153.sslip.io';
const SB = 'https://kebsbuvuutilitwlvxzv.supabase.co', SB_KEY = 'sb_publishable_4Egu0zm3p6cxWGvP_-GlIw_mlCpO1Nf', ID_DOM = 'frenchfries777.com';
const APPS = [['docs', /^ffdocs\./], ['sheet', /^ffsheet\./], ['slides', /^ffslides\./], ['blocks', /^ffblocks\./], ['python', /^ffpy\./], ['draw', /^ffdraw\./], ['score', /^ffscore\./], ['video', /^ffvideo\./]];
const MAX_TEXT = 60000, MAX_SCAN = 40, MAX_DOC = 4e6, ACCESS_S = 3600, REFRESH_S = 30 * 86400, CODE_S = 300;
const APP_ENUM = ['docs', 'sheet', 'slides', 'blocks', 'python', 'draw', 'score', 'video'];

const TOOLS = [
  { name: 'list_documents', description: 'List the documents saved on the Fry store (Fry Docs, Sheet, Slides, Blocks, Code, Draw, Score, Video) with their size.',
    inputSchema: { type: 'object', properties: { app: { type: 'string', enum: APP_ENUM, description: 'only this program' } } } },
  { name: 'read_document', description: 'Read one saved document by its key (from list_documents). Returns the stored text; long ones are cut, use offset to continue.',
    inputSchema: { type: 'object', properties: { key: { type: 'string' }, offset: { type: 'integer', minimum: 0 } }, required: ['key'] } },
  { name: 'search_documents', description: 'Find documents whose text contains a word (case-insensitive). Looks at up to 40 documents.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, app: { type: 'string', enum: APP_ENUM } }, required: ['query'] } },
  { name: 'write_document', description: 'Replace the whole text of a saved document (or create it). Give the complete new text in the same format that read_document returned. The previous text is kept once as backup key "ffbak.<key>". Max 4 MB.',
    inputSchema: { type: 'object', properties: { key: { type: 'string', description: 'existing key, or a new one starting with ffdocs. ffsheet. ffslides. ffblocks. ffpy. ffdraw. ffscore. ffvideo.' }, content: { type: 'string' } }, required: ['key', 'content'] } },
];

function appOf(k) { for (const [a, re] of APPS) if (re.test(k)) return a; return 'other'; }
const text = (t, err) => ({ content: [{ type: 'text', text: t }], isError: !!err });
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'www-authenticate' };
const json = (o, status, h) => new Response(JSON.stringify(o), { status: status || 200, headers: Object.assign({ 'content-type': 'application/json', 'cache-control': 'no-store' }, CORS, h) });

/* ---------- sealed (encrypted + signed) tokens, no storage needed ---------- */
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function aesKey(env) { return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', enc.encode('fry-tools-mcp|' + env.SIGN_KEY)), 'AES-GCM', false, ['encrypt', 'decrypt']); }
async function seal(env, obj) { const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(env), enc.encode(JSON.stringify(obj)))); const o = new Uint8Array(12 + ct.length); o.set(iv); o.set(ct, 12); return b64(o); }
async function open(env, s, typ) { try { const b = unb64(String(s)), o = JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, await aesKey(env), b.slice(12)))); if (o.t !== typ || o.exp < Date.now() / 1000) return null; return o; } catch (_) { return null; } }
async function sha256url(s) { return b64(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))); }

/* ---------- store ---------- */
const store = (owner, path, init) => fetch(STORE + '/k/' + owner + path, init);
async function listKeys(owner, app) {
  const r = await store(owner, '', { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error('store ' + r.status);
  return (await r.json()).filter(e => e && typeof e.k === 'string').map(e => ({ key: e.k, app: appOf(e.k), size: e.n })).filter(e => !app || e.app === app);
}
async function callTool(owner, name, a) {
  a = a || {};
  if (name === 'list_documents') {
    const l = await listKeys(owner, a.app);
    return text(l.length ? l.map(e => e.app + '\t' + e.key + '\t' + e.size + ' chars').join('\n') : 'No documents.');
  }
  if (name === 'read_document') {
    if (typeof a.key !== 'string' || !a.key) return text('key is required', true);
    if (!(await listKeys(owner)).some(e => e.key === a.key)) return text('No such document: ' + a.key, true);
    const r = await store(owner, '/' + encodeURIComponent(a.key));
    if (!r.ok) return text('store ' + r.status, true);
    const t = await r.text(), o = Math.max(0, a.offset | 0), part = t.slice(o, o + MAX_TEXT);
    return text(part + (o + MAX_TEXT < t.length ? '\n\n[cut: ' + (o + MAX_TEXT) + ' of ' + t.length + ' chars, call again with offset ' + (o + MAX_TEXT) + ']' : ''));
  }
  if (name === 'search_documents') {
    const q = String(a.query || '').toLowerCase(); if (!q) return text('query is required', true);
    const l = (await listKeys(owner, a.app)).slice(0, MAX_SCAN), hits = [];
    await Promise.all(l.map(async e => { try { const r = await store(owner, '/' + encodeURIComponent(e.key)); if (!r.ok) return; const t = await r.text(), i = t.toLowerCase().indexOf(q); if (i >= 0) hits.push(e.app + '\t' + e.key + '\t…' + t.slice(Math.max(0, i - 40), i + 80).replace(/\s+/g, ' ') + '…'); } catch (_) {} }));
    return text(hits.length ? hits.sort().join('\n') : 'No match in ' + l.length + ' documents.');
  }
  if (name === 'write_document') {
    const k = a.key, c = a.content;
    if (typeof k !== 'string' || !/^[A-Za-z0-9._-]{1,120}$/.test(k) || typeof c !== 'string') return text('key and content are required', true);
    const l = await listKeys(owner), had = l.some(e => e.key === k);
    if (!had && appOf(k) === 'other') return text('New keys must start with ffdocs. ffsheet. ffslides. ffblocks. ffpy. ffdraw. ffscore. or ffvideo.', true);
    if (enc.encode(c).length > MAX_DOC) return text('Too large (max 4 MB)', true);
    if (had) { const o = await store(owner, '/' + encodeURIComponent(k)); if (o.ok) await store(owner, '/' + encodeURIComponent('ffbak.' + k), { method: 'PUT', body: await o.text() }); }
    const r = await store(owner, '/' + encodeURIComponent(k), { method: 'PUT', body: c });
    return r.ok ? text((had ? 'Replaced ' : 'Created ') + k + ' (' + c.length + ' chars)' + (had ? '. Backup of the old text: ffbak.' + k : '')) : text('store ' + r.status, true);
  }
  return text('Unknown tool: ' + name, true);
}

async function rpc(owner, m) {
  const id = m.id;
  const ok = result => ({ jsonrpc: '2.0', id, result }), bad = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
  if (id === undefined) return null;
  switch (m.method) {
    case 'initialize': return ok({ protocolVersion: (m.params && m.params.protocolVersion) || '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'fry-tools', version: '2.0.0' } });
    case 'ping': return ok({});
    case 'tools/list': return ok({ tools: TOOLS });
    case 'tools/call':
      try { return ok(await callTool(owner, m.params && m.params.name, m.params && m.params.arguments)); }
      catch (e) { return ok(text('Could not reach the Fry store: ' + (e && e.message || e), true)); }
    default: return bad(-32601, 'Method not found');
  }
}

/* ---------- account login (Supabase) ---------- */
async function login(id, pw, keyText) {
  const local = String(id || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!local || !pw) return { err: '아이디와 비밀번호를 입력하세요' };
  const r = await fetch(SB + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: SB_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ email: local + '@' + ID_DOM, password: pw }) });
  if (!r.ok) return { err: '아이디 또는 비밀번호가 맞지 않아요' };
  const s = await r.json(), uid = s.user && s.user.id, H = { apikey: SB_KEY, authorization: 'Bearer ' + s.access_token, 'content-type': 'application/json' };
  if (!uid) return { err: '로그인 정보를 확인하지 못했어요' };
  const q = await fetch(SB + '/rest/v1/tools_owner_link?select=owner_id&user_id=eq.' + uid, { headers: H });
  const rows = q.ok ? await q.json() : [];
  if (keyText) {
    const k = String(keyText).trim().toLowerCase();
    if (!/^[0-9a-f]{32}$/.test(k)) return { err: 'Tools 키는 32자리 영문/숫자(0-9, a-f)예요', needKey: true };
    const w = await fetch(SB + '/rest/v1/tools_owner_link?on_conflict=user_id', { method: 'POST', headers: Object.assign({ prefer: 'resolution=merge-duplicates,return=minimal' }, H), body: JSON.stringify({ user_id: uid, owner_id: k }) });
    if (!w.ok) return { err: '키를 저장하지 못했어요 (' + w.status + ')', needKey: true };
    return { owner: k };
  }
  if (rows[0] && rows[0].owner_id) return { owner: rows[0].owner_id };
  return { err: '이 계정에 연결된 Tools 키가 아직 없어요. 한 번만 아래에 입력해 주세요.', needKey: true };
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function page(p, msg, needKey, idv) {
  const hid = ['response_type', 'client_id', 'redirect_uri', 'state', 'code_challenge', 'code_challenge_method', 'scope'].map(k => '<input type="hidden" name="' + k + '" value="' + esc(p[k]) + '">').join('');
  return new Response('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fry Tools 연결</title><style>body{font-family:system-ui,sans-serif;background:#111;color:#eee;display:flex;justify-content:center;padding:40px 16px}form{width:100%;max-width:340px;display:flex;flex-direction:column;gap:10px}input,button{padding:10px;border-radius:8px;border:1px solid #444;background:#1c1c1c;color:#eee;font-size:16px}button{background:#e8b04a;color:#111;border:0;font-weight:700;cursor:pointer}.m{color:#ff8a80;font-size:14px}</style></head><body><form method="post" action="/authorize"><h2>Fry Tools 연결</h2><p>Claude가 내 Tools 문서를 읽고 고치고 쓸 수 있게 허용합니다. Frenchfries777 계정으로 로그인하세요.</p>' + hid +
    (msg ? '<div class="m">' + esc(msg) + '</div>' : '') + '<input name="id" placeholder="아이디" autocomplete="username" value="' + esc(idv) + '"><input name="pw" type="password" placeholder="비밀번호" autocomplete="current-password">' +
    (needKey ? '<input name="key" placeholder="Tools 키 (처음 한 번만)" autocomplete="off"><a href="https://frenchfries777.com/tools/claude-key/" target="_blank" rel="noopener" style="color:#e8b04a;font-size:14px">Tools 키 받기</a>' : '') + '<button>로그인하고 허용</button></form></body></html>', { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

/* ---------- OAuth ---------- */
async function authorize(req, env, origin) {
  const u = new URL(req.url); let p = {};
  if (req.method === 'POST') { const f = await req.formData(); f.forEach((v, k) => { p[k] = typeof v === 'string' ? v : ''; }); } else u.searchParams.forEach((v, k) => { p[k] = v; });
  const c = await open(env, p.client_id, 'client');
  if (!c || !p.redirect_uri || !c.ru.includes(p.redirect_uri)) return new Response('잘못된 연결 요청이에요 (client)', { status: 400 });
  if (p.response_type !== 'code' || !p.code_challenge || p.code_challenge_method !== 'S256') return new Response('잘못된 연결 요청이에요 (PKCE)', { status: 400 });
  if (req.method !== 'POST') return page(p, '', false, '');
  const r = await login(p.id, p.pw, p.key);
  if (!r.owner) return page(p, r.err, r.needKey, p.id);
  const code = await seal(env, { t: 'code', owner: r.owner, cc: p.code_challenge, ru: p.redirect_uri, cid: p.client_id, exp: Date.now() / 1000 + CODE_S });
  const to = new URL(p.redirect_uri); to.searchParams.set('code', code); if (p.state) to.searchParams.set('state', p.state);
  return Response.redirect(to.toString(), 302);
}
async function issue(env, owner) {
  const now = Date.now() / 1000;
  return { access_token: await seal(env, { t: 'access', owner, exp: now + ACCESS_S }), token_type: 'Bearer', expires_in: ACCESS_S, refresh_token: await seal(env, { t: 'refresh', owner, exp: now + REFRESH_S }) };
}
async function token(req, env) {
  const f = await req.formData().catch(() => null), g = k => f && typeof f.get(k) === 'string' ? f.get(k) : '';
  const e = (error, d) => json({ error, error_description: d }, 400);
  if (g('grant_type') === 'authorization_code') {
    const c = await open(env, g('code'), 'code');
    if (!c || c.ru !== g('redirect_uri') || c.cid !== g('client_id')) return e('invalid_grant', 'bad code');
    if ((await sha256url(g('code_verifier'))) !== c.cc) return e('invalid_grant', 'PKCE failed');
    return json(await issue(env, c.owner));
  }
  if (g('grant_type') === 'refresh_token') {
    const c = await open(env, g('refresh_token'), 'refresh');
    if (!c) return e('invalid_grant', 'bad refresh token');
    return json(await issue(env, c.owner));
  }
  return e('unsupported_grant_type');
}

export default {
  async fetch(req, env) {
    if (!env.SIGN_KEY || env.SIGN_KEY.length < 24) return new Response('SIGN_KEY not set', { status: 500 });
    const u = new URL(req.url), origin = u.origin, path = u.pathname;
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (path.startsWith('/.well-known/oauth-protected-resource')) return json({ resource: origin + '/mcp', authorization_servers: [origin], bearer_methods_supported: ['header'] });
    if (path.startsWith('/.well-known/oauth-authorization-server')) return json({ issuer: origin, authorization_endpoint: origin + '/authorize', token_endpoint: origin + '/token', registration_endpoint: origin + '/register', response_types_supported: ['code'], grant_types_supported: ['authorization_code', 'refresh_token'], code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none'] });
    if (path === '/register' && req.method === 'POST') {
      const b = await req.json().catch(() => null), ru = b && Array.isArray(b.redirect_uris) ? b.redirect_uris.filter(x => typeof x === 'string' && /^https?:\/\//.test(x)).slice(0, 10) : [];
      if (!ru.length) return json({ error: 'invalid_redirect_uri' }, 400);
      return json({ client_id: await seal(env, { t: 'client', ru, exp: Date.now() / 1000 + 365 * 86400 }), redirect_uris: ru, token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], client_name: (b && b.client_name) || 'client' }, 201);
    }
    if (path === '/authorize') return authorize(req, env, origin);
    if (path === '/token' && req.method === 'POST') return token(req, env);
    if (path === '/mcp') {
      const h = /^Bearer (.+)$/.exec(req.headers.get('authorization') || ''), a = h && await open(env, h[1], 'access');
      if (!a) return new Response('Unauthorized', { status: 401, headers: Object.assign({ 'www-authenticate': 'Bearer resource_metadata="' + origin + '/.well-known/oauth-protected-resource"' }, CORS) });
      if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: Object.assign({ allow: 'POST' }, CORS) });
      let body; try { body = await req.json(); } catch (_) { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400); }
      const msgs = Array.isArray(body) ? body : [body], out = [];
      for (const x of msgs) { const r = await rpc(a.owner, x || {}); if (r) out.push(r); }
      if (!out.length) return new Response(null, { status: 202, headers: CORS });
      return json(Array.isArray(body) ? out : out[0]);
    }
    return new Response('Not found', { status: 404 });
  },
};
