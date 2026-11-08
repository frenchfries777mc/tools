// 오라클 서버에서 한 번 실행: node migrate-fry-store.js https://ff-store.frenchfries777mc.workers.dev
// 오라클의 /var/lib/fry-store 안 문서를 새 Worker로 복사해요. 원본은 지우지 않아요. 다시 돌려도 안전해요.
const fs = require('fs'), path = require('path');
const DIR = process.env.STORE_DIR || '/var/lib/fry-store';
const BASE = (process.argv[2] || '').replace(/\/$/, '');
if (!BASE) { console.log('사용법: node migrate-fry-store.js <새 Worker 주소>'); process.exit(1); }
let ok = 0, fail = 0;
async function put(url, body) {
  const r = await fetch(url, { method: 'PUT', headers: { 'content-type': 'text/plain; charset=utf-8' }, body });
  if (r.ok) ok++; else { fail++; console.log('실패', r.status, url); }
}
(async () => {
  for (const o of fs.readdirSync(DIR)) {
    if (!/^[0-9a-f]{32}$/.test(o)) continue;
    const od = path.join(DIR, o);
    for (const k of fs.readdirSync(od)) {
      const kp = path.join(od, k);
      if (!fs.statSync(kp).isDirectory()) continue;
      for (const f of fs.readdirSync(kp)) {
        const fp = path.join(kp, f);
        if (f.endsWith('.tmp')) continue;
        if (k === '_k') await put(BASE + '/k/' + o + '/' + f, fs.readFileSync(fp));
        else if (f.endsWith('.json')) await put(BASE + '/v/' + o + '/' + k + '/' + f.slice(0, -5), fs.readFileSync(fp));
      }
    }
  }
  console.log('끝: 성공', ok, '실패', fail);
})();
