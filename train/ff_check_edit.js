// Judges FF777's answers to the edit requests (train/eval/edit-requests.json) in a real Chromium with one hand-written
// assertion per phrasing: the page must still run without errors, keep every id of its base page and its behaviour, and the
// asked-for change must really show in the computed styles / text / dialogs / sound calls.
// Usage: node train/ff_check_edit.js <answers dir | job log file(s)> [--json out.json]
// Needs playwright (npm i playwright; the Chromium path is taken from $CHROMIUM or the default).
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const args = process.argv.slice(2), jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const inputs = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--json'), showDiff = args.includes('--diff');
const reqs = JSON.parse(fs.readFileSync(path.join(__dirname, 'eval/edit-requests.json'), 'utf8'));
let answers = [];
function fromLog(txt) { // =====BEGIN i name | q | tokens N | Ts ... =====END i
  const re = /=====BEGIN (\d+) ([\s\S]*?)\n([\s\S]*?)=====END \1\b/g; let m;
  while ((m = re.exec(txt))) { const body = m[3].replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z /gm, ''); const mm = /```html\s*([\s\S]*?)(```|$)/.exec(body); answers.push({ i: +m[1], html: (mm ? mm[1] : body).trim() }); }
}
for (const p of inputs) {
  if (fs.statSync(p).isDirectory()) fs.readdirSync(p, { recursive: true }).filter(f => /\.json$/.test(f)).forEach(f => { const o = JSON.parse(fs.readFileSync(path.join(p, f), 'utf8')); answers.push({ i: o.i, html: o.html }); });
  else fromLog(fs.readFileSync(p, 'utf8'));
}
const byI = {}; answers.forEach(a => byI[a.i] = a); answers = Object.values(byI).sort((a, b) => a.i - b.i);

const INIT = `(function(){var n={osc:0,audio:0};window.__ffsnd=n;
 ['AudioContext','webkitAudioContext'].forEach(function(k){var C=window[k];if(!C)return;var P=C.prototype;['createOscillator','createBufferSource'].forEach(function(f){var o=P[f];P[f]=function(){n.osc++;return o.apply(this,arguments);};});});
 var pl=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){n.audio++;return pl.apply(this,arguments);};})();`;
const rgb = s => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(s || ''); return m ? [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]] : null; };
const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const hue = c => { const [r, g, b] = c.map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return -1; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; return h < 0 ? h + 360 : h; };
const sat = c => { const mx = Math.max(...c.slice(0, 3)), mn = Math.min(...c.slice(0, 3)); return mx ? (mx - mn) / mx : 0; };
const isRed = c => c && c[0] > 170 && c[1] < 110 && c[2] < 110;
const isBlue = c => c && c[2] > 140 && c[2] > c[0] + 50 && c[2] > c[1] + 20;

// open a page: returns {page, errs, dialogs, close}
async function open(br, html) {
  const ctx = await br.newContext({ locale: 'ko-KR', viewport: { width: 800, height: 700 } });
  const page = await ctx.newPage(); await page.addInitScript(INIT);
  const errs = [], dialogs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  await page.route('http://page.test/', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: html })); await page.goto('http://page.test/', { waitUntil: 'load' }).catch(e => errs.push('load: ' + e.message)); await page.waitForTimeout(150);
  return { page, errs, dialogs, close: () => ctx.close() };
}
// snapshot of what the person sees: computed styles by id, page text, background
const SNAP = () => {
  const cs = (e) => getComputedStyle(e), out = { els: {}, texts: [] };
  const bgOf = () => { for (const e of [document.body, document.documentElement]) { const s = cs(e); if (s.backgroundImage !== 'none' || !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor)) return { color: s.backgroundColor, image: s.backgroundImage }; } return { color: 'rgb(255, 255, 255)', image: 'none' }; };
  out.bg = bgOf(); out.title = document.title; out.bodyText = document.body.innerText; out.align = cs(document.body).textAlign;
  document.querySelectorAll('[id]').forEach(e => { const s = cs(e), r = e.getBoundingClientRect(); out.els[e.id] = { tag: e.tagName, text: e.innerText || e.value || '', color: s.color, bg: s.backgroundColor, fs: parseFloat(s.fontSize), fw: s.fontWeight, radius: parseFloat(s.borderTopLeftRadius) || 0, w: r.width, h: r.height, align: s.textAlign, vis: r.width > 0 && r.height > 0 }; });
  out.buttons = [...document.querySelectorAll('button')].map(e => { const s = cs(e), r = e.getBoundingClientRect(); return { text: e.innerText, bg: s.backgroundColor, color: s.color, fs: parseFloat(s.fontSize), radius: parseFloat(s.borderTopLeftRadius) || 0, w: r.width, h: r.height, id: e.id }; });
  out.heads = [...document.querySelectorAll('h1,h2,h3')].map(e => { const s = cs(e); return { id: e.id, text: e.innerText, color: s.color, fs: parseFloat(s.fontSize), align: s.textAlign }; });
  out.ps = [...document.querySelectorAll('p,li,div,span')].filter(e => e.children.length === 0 && (e.innerText || '').trim()).map(e => { const s = cs(e); return { id: e.id, text: e.innerText, color: s.color, fs: parseFloat(s.fontSize), align: s.textAlign }; });
  out.nText = out.heads.length + out.ps.length;
  return out;
};
// the base behaviour: counter presses a button 3 times, to-do adds an item. returns problem string or ''
async function behave(h, base, n) {
  const { page } = h;
  try {
    if (base === '클릭 카운터') {
      for (let k = 0; k < (n || 3); k++) await page.click('#버튼1', { timeout: 2000 });
      const t = await page.$eval('#점수', e => e.innerText); return t.includes(String(n || 3)) ? '' : `점수가 ${n || 3}이 아님("${t.slice(0, 20)}")`;
    }
    for (let k = 0; k < (n || 1); k++) { await page.fill('#할일칸', '우유' + k, { timeout: 2000 }); await page.click('#추가버튼', { timeout: 2000 }); }
    const c = await page.$$eval('#할일목록 li', l => l.length), t = await page.$eval('#할일목록', e => e.innerText);
    return c === (n || 1) && t.includes('우유0') ? '' : `목록 li ${c}개`;
  } catch (e) { return '동작 실패: ' + e.message.split('\n')[0].slice(0, 80); }
}
const CEL = /축하|🎉|대단|잘했|성공|짝짝|congrat/i;
// per-phrasing assertions: (b = base snapshot, a = answer snapshot, ctx) -> '' if the change shows, else the reason
const A = {
  'bg-blue': (b, a) => { const c = rgb(a.bg.color); return c && c[3] > .5 && isBlue(c) ? '' : `배경 ${a.bg.color}`; },
  'bg-night': (b, a) => { const c = rgb(a.bg.color), g = a.bg.image; const dark = c && lum(c) < .06; const bluish = c && c[2] >= c[0]; const grad = /gradient/.test(g); if (!(dark && (bluish || grad) || grad && /gradient/.test(g) && lumOfGrad(g) < .08)) return `배경 ${a.bg.color} ${g.slice(0, 60)}`; return readable(a); },
  'dark': (b, a) => { const c = rgb(a.bg.color); const ok = c && lum(c) < .08 || /gradient/.test(a.bg.image) && lumOfGrad(a.bg.image) < .08; return ok ? readable(a) : `배경 ${a.bg.color}`; },
  'bg-gradient': (b, a) => /gradient/.test(a.bg.image) ? '' : `배경 이미지 ${a.bg.image.slice(0, 40)} 색 ${a.bg.color}`,
  'text-big': (b, a) => { let up = 0, tot = 0, down = 0; for (const id in b.els) { const x = b.els[id], y = a.els[id]; if (!y || !x.text.trim() && x.tag !== 'BUTTON' && x.tag !== 'INPUT') continue; tot++; if (y.fs >= x.fs * 1.2) up++; if (y.fs < x.fs * .95) down++; } return tot && up / tot >= .6 && !down ? '' : `커진 글자 ${up}/${tot}, 작아짐 ${down}`; },
  'title-bigred': (b, a) => { const hb = b.heads[0], ha = a.heads[0]; if (!ha) return '제목 없음'; const c = rgb(ha.color); return isRed(c) && ha.fs >= hb.fs * 1.2 ? '' : `제목 색 ${ha.color} 크기 ${hb.fs}→${ha.fs}`; },
  'title-text': (b, a) => { const t = '우리 반 페이지'; return a.title.includes(t) || a.heads.some(h => h.text.includes(t)) ? '' : `제목 "${a.heads[0] && a.heads[0].text.slice(0, 20)}" title="${a.title.slice(0, 20)}"`; },
  'text-blue': (b, a) => { const h = a.heads[0], p = a.ps[0]; const ok = [h, p].filter(Boolean).every(x => isBlue(rgb(x.color))); return ok ? '' : `글자색 ${h && h.color} / ${p && p.color}`; },
  'align-left': (b, a) => { const ok = a.heads.every(h => /left|start/.test(h.align)) && a.ps.every(p => /left|start/.test(p.align)); return ok ? '' : `정렬 ${a.heads.map(h => h.align)} ${a.ps.map(p => p.align)}`; },
  'btn-red': (b, a) => a.buttons.length && a.buttons.every(x => isRed(rgb(x.bg))) ? '' : `버튼 배경 ${a.buttons.map(x => x.bg)}`,
  'btn-big': (b, a) => { const ok = a.buttons.length && a.buttons.every((x, i) => b.buttons[i] && x.w * x.h >= b.buttons[i].w * b.buttons[i].h * 1.3); return ok ? '' : `버튼 크기 ${b.buttons.map(x => Math.round(x.w) + 'x' + Math.round(x.h))}→${a.buttons.map(x => Math.round(x.w) + 'x' + Math.round(x.h))}`; },
  'btn-round': (b, a) => a.buttons.length && a.buttons.every(x => x.radius >= 18) ? '' : `모서리 ${a.buttons.map(x => x.radius)}`,
  'btn-label': (b, a) => a.buttons.length && a.buttons.some(x => x.text.includes('시작')) ? '' : `버튼 글자 ${a.buttons.map(x => x.text)}`,
  'btn-sound': (b, a, c) => c.sound > 0 ? '' : '버튼을 눌러도 소리 호출 없음',
  'btn-bgchange': (b, a, c) => c.bgChanged ? '' : '누른 뒤 배경이 그대로',
  'ten-celebrate': (b, a, c) => c.tenMsgs.some(m => CEL.test(m) && m !== c.baseTen) ? '' : `10번째에 축하 없음(${JSON.stringify(c.tenMsgs).slice(0, 80)}) / 9번째까지 ${c.early}`,
  'ten-alert': (b, a, c) => c.tenDialog.length && !c.early ? '' : `10번째 알림 ${c.tenDialog.length}개, 일찍 뜸 ${c.early}`,
  'desc-add': (b, a) => { if (a.nText <= b.nText) return `글 요소 ${b.nText}→${a.nText}`; return ''; },
  'footer-add': (b, a) => a.bodyText.includes('만든 사람') ? '' : '"만든 사람" 글 없음',
  'title-star': (b, a) => /⭐|★/.test(a.title + a.heads.map(h => h.text).join('|')) ? '' : `제목 ${a.heads.map(h => h.text.slice(0, 15))}`,
};
function lumOfGrad(g) { const cs = [...g.matchAll(/rgba?\([^)]*\)/g)].map(m => rgb(m[0])).filter(Boolean); return cs.length ? Math.max(...cs.map(lum)) : 1; }
function readable(a) { const c = rgb(a.bg.color) || [0, 0, 0, 1]; const bad = [...a.heads, ...a.ps].filter(x => { const t = rgb(x.color); return t && contrast(t, c) < 3; }); return bad.length && !/gradient/.test(a.bg.image) ? '글자가 안 보임 ' + bad[0].color : ''; }

(async () => {
  const br = await pw.chromium.launch({ executablePath: process.env.CHROMIUM || undefined }).catch(() => pw.chromium.launch());
  const baseSnaps = {};
  const baseHtml = {}; reqs.forEach(r => baseHtml[r.base] = r.cur);
  for (const bn in baseHtml) { const h = await open(br, baseHtml[bn]); baseSnaps[bn] = await h.page.evaluate(SNAP); await h.close(); }
  const rows = [];
  for (const an of answers) {
    const r = reqs[an.i]; if (!r) continue;
    const row = { i: an.i, id: r.id, base: r.base, q: r.q, pass: false, why: [] };
    const html = an.html || '';
    if (!/<\/html>\s*$/i.test(html.trim())) row.why.push('끝이 잘림(</html> 없음)');
    // 1) renders, no errors, keeps ids and behaviour
    let h = await open(br, html); const snapA = await h.page.evaluate(SNAP).catch(e => null);
    if (!snapA) { row.why.push('열리지 않음'); rows.push(row); await h.close(); continue; }
    const b = baseSnaps[r.base];
    if (h.errs.length) row.why.push('오류 ' + h.errs[0].slice(0, 80));
    const lost = Object.keys(b.els).filter(id => !(id in snapA.els));
    if (lost.length) row.why.push('id 사라짐 ' + lost.join(','));
    const ctx = { sound: 0, bgChanged: false, tenMsgs: [], tenDialog: [], early: 0, baseTen: '' };
    // base alert text at 10 (counter page alerts '10번 눌렀어요!')
    ctx.baseTen = r.base === '클릭 카운터' ? '10번 눌렀어요!' : '';
    { const bp = await behave(h, r.base, 3); if (bp) row.why.push('기존 동작 깨짐: ' + bp); }
    if (r.id === 'btn-sound') { await h.close(); h = await open(br, html); await behave(h, r.base, 1); const s = await h.page.evaluate(() => window.__ffsnd || { osc: 0, audio: 0 }); ctx.sound = s.osc + s.audio; }
    if (r.id === 'btn-bgchange') { await h.close(); h = await open(br, html); const before = await h.page.evaluate(SNAP); await behave(h, r.base, 1); const after = await h.page.evaluate(SNAP); ctx.bgChanged = before.bg.color !== after.bg.color || before.bg.image !== after.bg.image; }
    if (r.id === 'ten-celebrate' || r.id === 'ten-alert') {
      await h.close(); h = await open(br, html);
      await behave(h, r.base, 9); ctx.early = h.dialogs.length; const bodyAt9 = await h.page.evaluate(() => document.body.innerText);
      const n0 = h.dialogs.length; await behave10(h, r.base);
      ctx.tenDialog = h.dialogs.slice(n0);
      const bodyAt10 = await h.page.evaluate(() => document.body.innerText);
      ctx.tenMsgs = ctx.tenDialog.slice(); if (bodyAt10 !== bodyAt9) { const add = bodyAt10.split('\n').filter(l => !bodyAt9.split('\n').includes(l)); ctx.tenMsgs.push(...add); }
      if (r.base === '클릭 카운터' && r.id === 'ten-alert') ctx.early = h.dialogs.slice(0, n0).length; // none of the first 9 clicks may alert
    }
    const why = (A[r.id] || (() => 'no assertion'))(b, snapA, ctx);
    if (why) row.why.push('효과 없음: ' + why);
    row.pass = !row.why.length; if (r.base === '클릭 카운터' && (r.id === 'btn-sound' || r.id === 'ten-alert')) row.weak = '기본 페이지가 이미 이 동작을 함(증거 약함)'; rows.push(row); await h.close();
  }
  await br.close();
  async function behave10(h, base) { // the 10th action after behave(9) already ran
    const { page } = h;
    if (base === '클릭 카운터') await page.click('#버튼1'); else { await page.fill('#할일칸', '우유9'); await page.click('#추가버튼'); }
    await page.waitForTimeout(200);
  }
  if (showDiff) { // what the model changed against the base page, for reading by hand
    const cp = require('child_process'), os = require('os');
    for (const an of answers) { const r = reqs[an.i]; if (!r) continue; const a = path.join(os.tmpdir(), 'ffa.html'), b = path.join(os.tmpdir(), 'ffb.html'); fs.writeFileSync(a, r.cur + '\n'); fs.writeFileSync(b, (an.html || '') + '\n');
      let d = ''; try { d = cp.execSync(`diff -U1 ${a} ${b} || true`, { encoding: 'utf8' }); } catch (e) { d = String(e.stdout || ''); }
      console.log(`----- DIFF #${an.i} ${r.id} / ${r.base}\n` + d.split('\n').slice(2).join('\n').slice(0, 3000)); }
  }
  const byId = {}; rows.forEach(r => (byId[r.id] = byId[r.id] || []).push(r));
  for (const r of rows) console.log(`#${r.i} ${r.id} / ${r.base} | ${r.pass ? 'PASS' + (r.weak ? ' (' + r.weak + ')' : '') : 'FAIL ' + r.why.join('; ')}`);
  console.log('\n== per phrasing ==');
  for (const id in byId) console.log(`${byId[id].filter(r => r.pass).length}/${byId[id].length} ${id} | ${byId[id][0].q}`);
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 1));
})();
