// ff-store: Tools 문서 저장 (오라클 fry-store와 같은 주소 모양). 바인딩: BUCKET(R2 ff-files), DB(D1 ff-store)
const MAXV = 1e6, MAXK = 4e6, MAXO = 16e6, MAXALL = 8 * 1024 * 1024 * 1024;
const OK = /^[0-9a-f]{32}$/, KEY = /^[A-Za-z0-9._-]{1,80}$/, ID = /^[a-z0-9]{4,20}$/;
const H = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,PUT,POST,DELETE,OPTIONS', 'access-control-allow-headers': 'content-type', 'cache-control': 'no-store' };
const send = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...H, 'content-type': 'application/json' } });

// 분당 횟수 제한 (Worker 메모리에서 세는 대략적인 제한이라 D1을 쓰지 않아요)
const MAX_IP = 1200, MAX_OWNER = 600;
let win = 0, seen = new Map();
function limited(key, max) {
  const m = Math.floor(Date.now() / 60000);
  if (m !== win || seen.size > 20000) { win = m; seen = new Map(); }
  const n = (seen.get(key) || 0) + 1;
  seen.set(key, n);
  return n > max;
}

async function save(env, path, owner, bytes, name, auto, t) {
  const n = bytes.byteLength;
  const old = await env.DB.prepare('SELECT n FROM items WHERE path = ?').bind(path).first();
  const o = old ? old.n : 0;
  const sum = await env.DB.prepare('SELECT COALESCE(SUM(n), 0) AS s FROM items WHERE owner = ?').bind(owner).first();
  if (sum.s - o + n > MAXO) return false;
  const a = await env.DB.prepare("UPDATE totals SET bytes = bytes + ? WHERE k = 'store' AND bytes + ? <= ?").bind(n - o, n - o, MAXALL).run();
  if (!a.meta.changes) return false;
  await env.BUCKET.put('s/' + path, bytes);
  await env.DB.prepare('INSERT INTO items (path, owner, n, t, name, auto) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(path) DO UPDATE SET n = excluded.n, t = excluded.t, name = excluded.name, auto = excluded.auto').bind(path, owner, n, t, name, auto).run();
  return true;
}

async function remove(env, path) {
  const old = await env.DB.prepare('SELECT n FROM items WHERE path = ?').bind(path).first();
  await env.BUCKET.delete('s/' + path);
  if (old) {
    await env.DB.prepare('DELETE FROM items WHERE path = ?').bind(path).run();
    await env.DB.prepare("UPDATE totals SET bytes = MAX(0, bytes - ?) WHERE k = 'store'").bind(old.n).run();
  }
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: H });
    const p = new URL(req.url).pathname.split('/').filter(Boolean);
    const m = req.method;
    if (limited('i' + (req.headers.get('cf-connecting-ip') || '?'), MAX_IP)) return send({ error: 'rate' }, 429);

    if (p[0] === 'k') {
      if (!OK.test(p[1] || '') || (p[2] && !KEY.test(p[2])) || p.length > 3) return send({ error: 'no' }, 404);
      const owner = p[1];
      if (limited('o' + owner, MAX_OWNER)) return send({ error: 'rate' }, 429);
      if (m === 'GET' && !p[2]) {
        const r = await env.DB.prepare("SELECT path, n, t FROM items WHERE owner = ? AND path LIKE 'k/%'").bind(owner).all();
        const pre = 'k/' + owner + '/';
        return send(r.results.map(x => ({ k: x.path.slice(pre.length), n: x.n, t: x.t })));
      }
      if (!p[2]) return send({ error: 'key' }, 405);
      const path = 'k/' + owner + '/' + p[2];
      if (m === 'GET') {
        const o = await env.BUCKET.get('s/' + path);
        if (!o) return send({ error: 'none' }, 404);
        return new Response(o.body, { headers: { ...H, 'content-type': 'text/plain; charset=utf-8' } });
      }
      if (m === 'DELETE') { await remove(env, path); return send({ ok: 1 }); }
      if (m === 'PUT' || m === 'POST') {
        const len = parseInt(req.headers.get('content-length') || '0', 10);
        if (len > MAXK) return send({ error: 'big' }, 413);
        const b = await req.arrayBuffer();
        if (b.byteLength > MAXK) return send({ error: 'big' }, 413);
        if (!(await save(env, path, owner, b, '', 0, Date.now()))) return send({ error: 'full' }, 507);
        return send({ ok: 1 });
      }
      return send({ error: 'method' }, 405);
    }

    if (p[0] !== 'v' || !OK.test(p[1] || '') || !KEY.test(p[2] || '') || (p[3] && !ID.test(p[3])) || p.length > 4) return send({ error: 'no' }, 404);
    const owner = p[1], pre = 'v/' + owner + '/' + p[2] + '/';
    if (limited('o' + owner, MAX_OWNER)) return send({ error: 'rate' }, 429);
    if (m === 'GET' && !p[3]) {
      const r = await env.DB.prepare('SELECT path, t, name, auto FROM items WHERE owner = ? AND path LIKE ?').bind(owner, pre + '%').all();
      return send(r.results.map(x => ({ id: x.path.slice(pre.length), t: x.t, name: x.name || '', auto: x.auto ? 1 : 0 })));
    }
    if (!p[3]) return send({ error: 'id' }, 405);
    const path = pre + p[3];
    if (m === 'GET') {
      const o = await env.BUCKET.get('s/' + path);
      if (!o) return send({ error: 'none' }, 404);
      return new Response(o.body, { headers: { ...H, 'content-type': 'application/json' } });
    }
    if (m === 'DELETE') { await remove(env, path); return send({ ok: 1 }); }
    if (m === 'PUT') {
      const len = parseInt(req.headers.get('content-length') || '0', 10);
      if (len > MAXV) return send({ error: 'big' }, 413);
      const b = await req.arrayBuffer();
      if (b.byteLength > MAXV) return send({ error: 'big' }, 413);
      let j; try { j = JSON.parse(new TextDecoder().decode(b)); } catch (e) { return send({ error: 'json' }, 400); }
      if (!j || j.id !== p[3] || typeof j.d !== 'string' || typeof j.t !== 'number') return send({ error: 'shape' }, 400);
      if (!(await save(env, path, owner, b, String(j.name || '').slice(0, 40), j.auto ? 1 : 0, j.t))) return send({ error: 'full' }, 507);
      return send({ ok: 1 });
    }
    return send({ error: 'method' }, 405);
  }
};
