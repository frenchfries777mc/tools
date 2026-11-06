/* Fry Tools MCP connector (read only). A Cloudflare Worker that lets Claude read the documents kept on the Fry store server.
   Secrets (never in code): OWNER_ID = the 32-hex "ffstore.owner" of the Tools browser, URL_TOKEN = a long random text that is part of the address.
   Address: https://<worker>/mcp/<URL_TOKEN>  (Streamable HTTP, JSON-RPC 2.0) */
const STORE = 'https://140-238-55-153.sslip.io';
const APPS = [['docs', /^ffdocs\./], ['sheet', /^ffsheet\./], ['slides', /^ffslides\./], ['blocks', /^ffblocks\./], ['python', /^ffpy\./]];
const MAX_TEXT = 60000, MAX_SCAN = 40;

const TOOLS = [
  { name: 'list_documents', description: 'List the documents saved on the Fry store (Fry Docs, Sheet, Slides, Block HTML, Python) with their size.',
    inputSchema: { type: 'object', properties: { app: { type: 'string', enum: ['docs', 'sheet', 'slides', 'blocks', 'python'], description: 'only this program' } } } },
  { name: 'read_document', description: 'Read one saved document by its key (from list_documents). Returns the stored text; long ones are cut, use offset to continue.',
    inputSchema: { type: 'object', properties: { key: { type: 'string' }, offset: { type: 'integer', minimum: 0 } }, required: ['key'] } },
  { name: 'search_documents', description: 'Find documents whose text contains a word (case-insensitive). Looks at up to 40 documents.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, app: { type: 'string', enum: ['docs', 'sheet', 'slides', 'blocks', 'python'] } }, required: ['query'] } },
];

function appOf(k) { for (const [a, re] of APPS) if (re.test(k)) return a; return 'other'; }
function same(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
const text = (t, err) => ({ content: [{ type: 'text', text: t }], isError: !!err });

async function store(env, path) {
  const r = await fetch(STORE + '/k/' + env.OWNER_ID + path, { headers: { accept: 'text/plain' } });
  return r;
}
async function listKeys(env, app) {
  const r = await store(env, '');
  if (!r.ok) throw new Error('store ' + r.status);
  return (await r.json()).filter(e => e && typeof e.k === 'string').map(e => ({ key: e.k, app: appOf(e.k), size: e.n })).filter(e => !app || e.app === app);
}

async function callTool(env, name, a) {
  a = a || {};
  if (name === 'list_documents') {
    const l = await listKeys(env, a.app);
    return text(l.length ? l.map(e => e.app + '\t' + e.key + '\t' + e.size + ' chars').join('\n') : 'No documents.');
  }
  if (name === 'read_document') {
    if (typeof a.key !== 'string' || !a.key) return text('key is required', true);
    const l = await listKeys(env);
    if (!l.some(e => e.key === a.key)) return text('No such document: ' + a.key, true);
    const r = await store(env, '/' + encodeURIComponent(a.key));
    if (!r.ok) return text('store ' + r.status, true);
    const t = await r.text(), o = Math.max(0, a.offset | 0), part = t.slice(o, o + MAX_TEXT);
    return text(part + (o + MAX_TEXT < t.length ? '\n\n[cut: ' + (o + MAX_TEXT) + ' of ' + t.length + ' chars, call again with offset ' + (o + MAX_TEXT) + ']' : ''));
  }
  if (name === 'search_documents') {
    const q = String(a.query || '').toLowerCase(); if (!q) return text('query is required', true);
    const l = (await listKeys(env, a.app)).slice(0, MAX_SCAN), hits = [];
    await Promise.all(l.map(async e => { try { const r = await store(env, '/' + encodeURIComponent(e.key)); if (!r.ok) return; const t = await r.text(), i = t.toLowerCase().indexOf(q); if (i >= 0) hits.push(e.app + '\t' + e.key + '\t…' + t.slice(Math.max(0, i - 40), i + 80).replace(/\s+/g, ' ') + '…'); } catch (_) {} }));
    return text(hits.length ? hits.sort().join('\n') : 'No match in ' + l.length + ' documents.');
  }
  return text('Unknown tool: ' + name, true);
}

async function rpc(env, m) {
  const id = m.id;
  const ok = result => ({ jsonrpc: '2.0', id, result }), bad = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
  if (id === undefined) return null;                       // notification
  switch (m.method) {
    case 'initialize': return ok({ protocolVersion: (m.params && m.params.protocolVersion) || '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'fry-tools', version: '1.0.0' } });
    case 'ping': return ok({});
    case 'tools/list': return ok({ tools: TOOLS });
    case 'tools/call':
      try { return ok(await callTool(env, m.params && m.params.name, m.params && m.params.arguments)); }
      catch (e) { return ok(text('Could not reach the Fry store: ' + (e && e.message || e), true)); }
    default: return bad(-32601, 'Method not found');
  }
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url), m = /^\/mcp\/([A-Za-z0-9_-]{24,200})$/.exec(u.pathname);
    if (!m || !env.URL_TOKEN || !env.OWNER_ID || !same(m[1], env.URL_TOKEN)) return new Response('Not found', { status: 404 });
    if (req.method === 'GET' || req.method === 'DELETE') return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    let body; try { body = await req.json(); } catch (_) { return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400 }); }
    const msgs = Array.isArray(body) ? body : [body], out = [];
    for (const x of msgs) { const r = await rpc(env, x || {}); if (r) out.push(r); }
    if (!out.length) return new Response(null, { status: 202 });
    return Response.json(Array.isArray(body) ? out : out[0]);
  },
};
