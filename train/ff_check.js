// Opens every answer of ff_try.py (out/*.json) in jsdom: syntax/runtime errors on load, then clicks every button
// (inputs filled with sample values) and reports errors and whether the page changed. Usage: node train/ff_check.js <dir>
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const dir = process.argv[2] || 'out';
const files = fs.readdirSync(dir, { recursive: true }).filter(f => /\.json$/.test(f)).map(f => path.join(dir, f));
const items = files.map(f => JSON.parse(fs.readFileSync(f, 'utf8'))).sort((a, b) => a.i - b.i);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  for (const it of items) {
    const errs = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => errs.push((e.detail && e.detail.message) || e.message));
    let dom;
    try { dom = new JSDOM(it.html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc }); }
    catch (e) { console.log(`#${it.i} ${it.name} | PARSE-FAIL ${e.message}`); continue; }
    const w = dom.window, d = w.document;
    w.addEventListener('error', e => errs.push(e.message));
    w.alert = () => {}; w.confirm = () => true; w.prompt = () => '5';
    await sleep(200);
    const loadErrs = errs.length;
    const ends = /<\/html>\s*$/i.test(it.html.trim());
    const snap = () => d.body.innerHTML;
    let changed = 0;
    for (const inp of d.querySelectorAll('input,textarea,select')) {
      if (inp.tagName === 'SELECT') continue;
      const t = (inp.type || 'text'); if (t === 'checkbox' || t === 'radio') continue;
      inp.value = t === 'number' || t === 'range' ? '5' : '민수';
      inp.dispatchEvent(new w.Event('input', { bubbles: true }));
    }
    const btns = [...d.querySelectorAll('button,[onclick],input[type=button],input[type=submit]')];
    for (const b of btns) {
      const before = snap();
      try { b.click(); } catch (e) { errs.push('click: ' + e.message); }
      await sleep(30);
      if (snap() !== before) changed++;
    }
    d.body.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await sleep(100);
    const verdict = !ends ? 'CUT' : errs.length ? 'ERR' : btns.length && !changed ? 'NOCHANGE' : 'RUNS';
    console.log(`#${it.i} ${it.name} | ${verdict} | buttons ${btns.length} changed ${changed} | loadErr ${loadErrs} | ${[...new Set(errs)].slice(0, 2).join(' ; ').slice(0, 160)}`);
    w.close();
  }
})();
