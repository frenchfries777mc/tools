// Opens one generated page in jsdom and runs its checks (FF777 baseline test, train/eval/ffeval.py run_html).
// Usage: node html_run.js item.json   with item = {html, checks:[{do:[...], want, re?, fresh?}]}
// Prints one JSON line: {syntax: null|"message", checks:[{ok, why}]}
// Every check opens the page fresh. Timers run 20x faster, so a 10-second countdown ends in half a second.
// do: "fill" (type into every input), "click_all", "click_n:N[:regex]" (N clicks on the button whose label matches,
//     else the first one that is not reset/stop), "keys" (arrows and space), "click_canvas", "wait:ms"
// want: "none" (no errors only), "changed" (page or drawing changed), "moving" (still changing by itself afterwards),
//       "alive" (changed or moving), "re" (visible text + alerts match re; fresh = more matches than before), "li_more",
//       "varies" (click_n gave at least two different results). {any:[check, check]} passes when one of them passes.
'use strict';
const fs = require('fs'), vm = require('vm');
const { JSDOM, VirtualConsole } = require('jsdom');
const item = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const SPEED = 20;   // a check can set {speed: 1} (a game that may end by itself)
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };

function stub() {   // anything (AudioContext, Audio, speech): every property and call works and does nothing
  const f = function () {};
  return new Proxy(f, {
    get: (t, k) => k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : (k in t ? t[k] : (t[k] = stub())),
    set: (t, k, v) => { t[k] = v; return true; },
    apply: () => stub(), construct: () => stub(),
  });
}
function makeCtx(w, canvas) {   // a 2D context that records what is drawn
  const props = { canvas, fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 1, font: '10px sans-serif', globalAlpha: 1,
    textAlign: 'start', textBaseline: 'alphabetic', lineCap: 'butt', shadowBlur: 0, shadowColor: 'transparent' };
  const short = x => typeof x === 'number' ? Math.round(x * 10) / 10 : String(x).slice(0, 40);
  return new Proxy(props, {
    get(t, k) {
      if (k in t || typeof k === 'symbol') return t[k];
      return (...a) => {
        w.__calls.push(k + '(' + a.map(short).join(',') + ')');
        if (k === 'measureText') return { width: 8 * String(a[0] || '').length };
        if (k === 'getImageData' || k === 'createImageData') {
          const W = Math.min(2000, Math.abs(+a[2] || +a[0] || 1)), H = Math.min(2000, Math.abs(+a[3] || +a[1] || 1));
          return { width: W, height: H, data: new Uint8ClampedArray(4 * W * H) };
        }
        if (/^create(Linear|Radial|Conic)Gradient$|^createPattern$/.test(k)) return { addColorStop() {} };
        if (k === 'isPointInPath' || k === 'isPointInStroke') return false;
        if (k === 'getTransform') return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
        if (k === 'getLineDash') return [];
        return undefined;
      };
    },
    set(t, k, v) { t[k] = v; w.__calls.push(String(k) + '=' + short(v)); return true; },
  });
}
function makeBeforeParse(speed) { return function beforeParse(w) {
  w.__calls = []; w.__alerts = []; w.__seen = [];
  w.alert = m => { w.__alerts.push(String(m)); };
  w.confirm = () => true; w.prompt = () => '5';
  const st = w.setTimeout.bind(w), si = w.setInterval.bind(w);
  w.setTimeout = (f, ms, ...a) => st(f, Math.max(0, (+ms || 0) / speed), ...a);
  w.setInterval = (f, ms, ...a) => si(f, Math.max(1, (+ms || 0) / speed), ...a);
  w.HTMLCanvasElement.prototype.getContext = function () { return this.__ctx || (this.__ctx = makeCtx(w, this)); };
  w.HTMLCanvasElement.prototype.toDataURL = () => 'data:,';
  w.AudioContext = w.webkitAudioContext = function () { return stub(); };
  w.Audio = function () { return stub(); };
  w.HTMLMediaElement.prototype.play = () => Promise.resolve();
  w.HTMLMediaElement.prototype.pause = () => {};
  w.speechSynthesis = stub(); w.SpeechSynthesisUtterance = function () { return stub(); };
  if (!w.matchMedia) w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
}; }
function visible(w) {   // what a person sees: body text without script/style, input values, alerts
  const d = w.document, b = d.body ? d.body.cloneNode(true) : null;
  if (!b) return '';
  b.querySelectorAll('script,style').forEach(x => x.remove());
  const vals = Array.from(d.querySelectorAll('input,textarea,output,select')).filter(x => !x.__filled).map(x => x.value || '').join(' ');
  return b.textContent.replace(/\s+/g, ' ') + ' ' + vals + ' ' + w.__alerts.join(' ');
}
function state(w) {
  const d = w.document;
  return hash(d.documentElement.outerHTML) + ':' + hash(w.__calls.slice(-200).join(';'));
}
const RESET = /초기화|리셋|reset|다시|지우|삭제|clear|빼기|감소|^\s*[-−]\s*\d*\s*$|멈춤|정지|stop/i;
function buttons(d) { return Array.from(d.querySelectorAll('button,input[type=button],input[type=submit]')); }
function label(b) { return (b.textContent || b.value || '').trim(); }
async function act(w, a) {
  const d = w.document;
  if (a === 'fill') {
    for (const el of d.querySelectorAll('input,textarea')) {
      const t = (el.type || 'text').toLowerCase();
      if (['button', 'submit', 'checkbox', 'radio', 'range', 'color', 'file', 'hidden', 'reset'].includes(t)) continue;
      const num = t === 'number' || /숫자|number|num|나이|age|수\b|값/i.test((el.placeholder || '') + ' ' + (el.id || ''));
      el.value = num ? '6' : '민수'; el.__filled = true;
      el.dispatchEvent(new w.Event('input', { bubbles: true }));
      el.dispatchEvent(new w.Event('change', { bubbles: true }));
    }
  } else if (a === 'click_all') {
    for (const b of buttons(d).slice(0, 12)) { b.click(); await sleep(30); }
  } else if (a.startsWith('click_n:')) {
    const [, n, re] = a.split(':');
    const bs = buttons(d);
    const b = re ? bs.find(x => new RegExp(re, 'i').test(label(x))) : (bs.find(x => !RESET.test(label(x))) || bs[0]);
    if (!b) { if (re) throw new Error('버튼이 없음: ' + re); return; }
    for (let i = 0; i < +n; i++) { b.click(); await sleep(20); w.__seen.push(visible(w) + state(w)); }
  } else if (a === 'keys') {
    const keys = ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowUp', 'ArrowUp', 'ArrowLeft', 'ArrowDown', ' ', 'ArrowRight'];
    const codes = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, ' ': 32 };
    for (const k of keys) {
      for (const type of ['keydown', 'keyup']) {
        const e = new w.KeyboardEvent(type, { key: k, code: k === ' ' ? 'Space' : k, bubbles: true, cancelable: true });
        Object.defineProperty(e, 'keyCode', { get: () => codes[k] });
        Object.defineProperty(e, 'which', { get: () => codes[k] });
        (d.activeElement || d.body).dispatchEvent(e);
        await sleep(type === 'keydown' ? 40 : 5);
      }
    }
  } else if (a === 'click_canvas') {
    const c = d.querySelector('canvas') || d.body;
    for (const type of ['mousedown', 'mouseup', 'click']) c.dispatchEvent(new w.MouseEvent(type, { bubbles: true, clientX: 50, clientY: 50 }));
    await sleep(30);
  } else if (a.startsWith('wait:')) {
    await sleep(+a.slice(5));
  } else throw new Error('모르는 동작 ' + a);
}
async function runCheck(html, ck) {   // {any:[...]} passes when one of its checks passes
  if (ck.any) {
    let last = null;
    for (const c of ck.any) { last = await runOne(html, c); if (last.ok) return last; }
    return last;
  }
  return runOne(html, ck);
}
async function runOne(html, ck) {
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { const m = String((e && ((e.detail && e.detail.message) || e.message)) || e); if (!/Not implemented/i.test(m)) errs.push(m.slice(0, 160)); });
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc, beforeParse: makeBeforeParse(ck.speed || SPEED) });
  const w = dom.window, d = w.document;
  w.addEventListener('error', e => errs.push(String(e.message).slice(0, 160)));
  try {
    await sleep(150);   // = 3 seconds of page time
    const s0 = state(w), t0 = visible(w), li0 = d.querySelectorAll('li').length;
    for (const a of ck.do || []) await act(w, a);
    await sleep(60);
    const s1 = state(w), t1 = visible(w);
    await sleep(200);
    const s2 = state(w);
    if (errs.length) return { ok: false, why: '오류: ' + errs[0] };
    const changed = s0 !== s1 || s0 !== s2, moving = s1 !== s2;
    const want = ck.want || 'none';
    if (want === 'none') return { ok: true, why: 'ok' };
    if (want === 'changed') return changed ? { ok: true, why: 'ok' } : { ok: false, why: '눌러도 바뀌는 것이 없음' };
    if (want === 'moving') return moving ? { ok: true, why: 'ok' } : { ok: false, why: '움직이지 않음' };
    if (want === 'alive') return changed || moving ? { ok: true, why: 'ok' } : { ok: false, why: '아무 반응이 없음' };
    if (want === 'varies') return new Set(w.__seen).size >= 2 ? { ok: true, why: 'ok' } : { ok: false, why: '누를 때마다 같은 결과' };
    if (want === 'li_more') return d.querySelectorAll('li').length > li0 ? { ok: true, why: 'ok' } : { ok: false, why: '목록이 늘지 않음' };
    if (want === 're') {
      const rx = new RegExp(ck.re, 'gi');
      const n0 = (t0.match(rx) || []).length, n1 = (t1.match(rx) || []).length;
      const ok = ck.fresh ? n1 > n0 : n1 > 0;
      return ok ? { ok: true, why: 'ok' } : { ok: false, why: '기대한 글이 안 나옴: ' + ck.re };
    }
    return { ok: false, why: '모르는 검사 ' + want };
  } catch (e) {
    return { ok: false, why: String(e && e.message || e).slice(0, 160) };
  } finally {
    w.close();
  }
}
(async () => {
  const html = item.html;
  let syntax = null;
  const tmp = new JSDOM(html);
  const code = Array.from(tmp.window.document.querySelectorAll('script')).filter(s => !s.type || /javascript|module/i.test(s.type)).map(s => s.textContent);
  for (const c of code) { try { new vm.Script(c); } catch (e) { syntax = String(e.message).slice(0, 160); break; } }
  tmp.window.close();
  const checks = [];
  if (!syntax) for (const ck of (item.checks && item.checks.length ? item.checks : [{ want: 'none' }])) checks.push(await runCheck(html, ck));
  process.stdout.write(JSON.stringify({ syntax, checks }) + '\n');
  process.exit(0);
})().catch(e => { process.stdout.write(JSON.stringify({ crash: String(e && e.message || e) }) + '\n'); process.exit(0); });
