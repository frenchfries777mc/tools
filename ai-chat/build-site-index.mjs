// AI 체험(ai-chat/)이 사이트 질문에 답할 때 찾아보는 "사이트 자료 목록"(site-index.json)을 만들어요.
// 쓰는 법: node ai-chat/build-site-index.mjs [--games ../games] [--educations ../educations]   (이 파일이 있는 tools 저장소 기준)
// 들어가는 것: 각 프로그램·게임 소개 글(<title>, meta description)과 패치노트(한국어 본문만). 위키·도움말은 허브 저장소에 있어서 아직 안 들어가요.
// ff-ai Worker(site.ask)가 이 목록을 받아 질문과 가까운 자료를 골라 Claude에게 같이 보내요. 자료마다 글은 500자까지만 넣어요.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const SITES = [
  { name: '도구', dir: path.resolve(opt('tools', path.join(here, '..'))), base: '/tools/' },
  { name: '게임', dir: path.resolve(opt('games', path.join(here, '..', '..', 'games'))), base: '/games/' },
  { name: '교육', dir: path.resolve(opt('educations', path.join(here, '..', '..', 'educations'))), base: '/educations/' }
];
const MAXX = 500;
// 한국어로 부르는 이름 (질문에 한글로 쓰는 사람이 많아서 자료 제목에 같이 적어 둬요)
const ALIAS = { beaconfall: '비콘폴', crownenvoy: '크라운 엔보이', stickseum: '스틱시엄', gatecrash: '게이트크래시', tumblecrown: '텀블 크라운', dummyparty: '더미 파티', isleport: '아일포트', vowkeep: '보우킵', kitchendefense: '키친 디펜스', sheet: '시트 스프레드시트', score: '악보', slides: '슬라이드 발표', blocks: '블록 코딩', lab: '실험실', docs: '문서', draw: '그림', video: '영상', code: '코드 편집기', proverb: '속담 탐정', munjang: '문장 수리공', balance: '평형 설계실' };
const nm = (slug) => ALIAS[slug] ? ' (' + ALIAS[slug] + ')' : '';
const clip = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, MAXX);
const decode = (s) => String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const docs = [];

for (const site of SITES) {
  if (!fs.existsSync(site.dir)) { console.error('건너뜀 (폴더 없음):', site.dir); continue; }
  // 1) 소개 글: 맨 위 폴더마다 index.html 의 title 과 description
  for (const e of fs.readdirSync(site.dir, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name.startsWith('.') || e.name.startsWith('old-')) continue;
    const f = path.join(site.dir, e.name, 'index.html');
    if (!fs.existsSync(f)) continue;
    const h = fs.readFileSync(f, 'utf8').slice(0, 20000);
    const t = (/<title>([^<]*)<\/title>/i.exec(h) || [])[1], d = (/<meta\s+name="description"\s+content="([^"]*)"/i.exec(h) || [])[1];
    if (!t || !d) continue;
    docs.push({ t: decode(t).trim() + nm(e.name) + ' (' + site.name + ' 소개)', u: site.base + e.name + '/', x: clip(decode(d)), k: 1 });
  }
  // 2) 패치노트: 프로그램마다 따로 있는 json (notes 배열). 한국어 본문(title, items)만
  const files = [];
  const walk = (dir, depth) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { if (e.name.startsWith('.') || e.name === 'node_modules') continue; const p = path.join(dir, e.name); if (e.isDirectory() && depth < 3) walk(p, depth + 1); else if (e.isFile() && /patchnotes.*\.json$/.test(e.name) || (e.isFile() && path.basename(dir) === 'patchnotes' && e.name.endsWith('.json'))) files.push(p); } };
  walk(site.dir, 0);
  for (const f of files) {
    let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { continue; }
    const notes = Array.isArray(j) ? j : j.notes; if (!Array.isArray(notes)) continue;
    const rel = path.relative(site.dir, f).split(path.sep);
    const prog = j.name || (rel.length > 1 && rel[0] !== 'patchnotes' ? rel[0] : site.name);
    const slug = j.program || (rel.length > 1 && rel[0] !== 'patchnotes' ? rel[0] : '');
    for (const n of notes) {
      if (!n || !n.title) continue;
      docs.push({ t: prog + nm(slug) + ' 업데이트 ' + [n.build, n.ver].filter(Boolean).join(' ') + ' (' + (n.date || '') + ') ' + n.title, u: site.base + (slug ? slug + '/' : ''), x: clip((n.title || '') + ': ' + (n.items || []).join(' / ')) });
    }
  }
}
const out = path.join(here, 'site-index.json');
fs.writeFileSync(out, JSON.stringify({ v: 1, built: new Date().toISOString().slice(0, 10), docs }));
console.log('자료', docs.length, '개,', (fs.statSync(out).size / 1024).toFixed(0) + 'KB →', out);
