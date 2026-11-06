/* Fry Score — editor UI: state, tools, input handling (mouse / touch / keyboard), panels. */
(function () {
  'use strict';
  const FS = window.FS, $ = FS.$, EPS = FS.EPS, clamp = FS.clamp, STAFF = 40;
  const A = (FS.app = {
    score: null, sel: null, L: null, zoom: 1, tab: 'note', hist: [], hi: -1, clip: null, lastAbs: {},
    ui: { dur: 16, dot: false, rest: false, acc: null, chord: false, voice: 0, tool: 'input', pad: false }
  });
  const UI = (FS.ui = { actions: {}, changes: {}, sections: { note: [], song: [], parts: [] }, tabs: {}, keys: [] });
  let sheet, desk;

  /* ================= history / drawing ================= */
  const snap = () => JSON.stringify(A.score);
  UI.commit = function (label) {
    A.hist = A.hist.slice(0, A.hi + 1);
    A.hist.push(snap());
    if (A.hist.length > 120) A.hist.shift();
    A.hi = A.hist.length - 1;
    FS.io.autosave(A.score);
    UI.draw(); UI.panel();
    if (label) { const live = $('live'); if (live) live.textContent = label; }
  };
  UI.reset = function (S) {
    A.score = S; A.sel = null; A.hist = [snap()]; A.hi = 0; $('dname').value = S.name;
    FS.io.autosave(S); UI.draw(); UI.panel();
  };
  function restore(i) {
    A.hi = i; A.score = JSON.parse(A.hist[i]); A.sel = null; $('dname').value = A.score.name;
    FS.io.autosave(A.score); UI.draw(); UI.panel();
  }
  UI.undo = () => { if (A.hi > 0) restore(A.hi - 1); };
  UI.redo = () => { if (A.hi < A.hist.length - 1) restore(A.hi + 1); };

  const key = (pi, m, v, i) => pi + '|' + m + '|' + v + '|' + i;
  function selSet() {
    const set = new Set(), s = A.sel; if (!s) return set;
    const P = A.score.parts[s.pi]; if (!P) return set;
    let a = [s.m, s.i], b = [s.m2 != null ? s.m2 : s.m, s.i2 != null ? s.i2 : s.i];
    if (a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])) [a, b] = [b, a];
    for (let m = a[0]; m <= b[0] && m < P.m.length; m++) {
      const E = P.m[m][s.v] || [];
      for (let i = m === a[0] ? a[1] : 0; i < E.length && (m < b[0] || i <= b[1]); i++) set.add(key(s.pi, m, s.v, i));
    }
    return set;
  }
  UI.selEvents = function () {
    const out = [], P = A.sel && A.score.parts[A.sel.pi]; if (!P) return out;
    selSet().forEach((k) => { const [, m, v, i] = k.split('|').map(Number); const e = P.m[m][v] && P.m[m][v][i]; if (e) out.push({ m, v, i, e }); });
    return out.sort((x, y) => x.m - y.m || x.i - y.i);
  };
  function validateSel() {
    const s = A.sel; if (!s) return;
    const P = A.score.parts[s.pi];
    if (!P || s.m >= P.m.length) { A.sel = null; return; }
    if (!P.m[s.m][s.v]) s.v = 0;
    const E = P.m[s.m][s.v];
    s.i = clamp(s.i, 0, E.length - 1);
    if (s.m2 != null) { const P2 = P.m[s.m2] && P.m[s.m2][s.v]; if (!P2) { delete s.m2; delete s.i2; } else s.i2 = clamp(s.i2, 0, P2.length - 1); }
  }
  function curStart() { const s = A.sel; return FS.startOf(A.score, s.pi, s.m, s.v, s.i); }

  UI.draw = function () {
    validateSel();
    const S = A.score, L = (A.L = FS.layout(S, { W: A.W || 1000 }));
    const s = A.sel;
    let hl = {};
    if (s) hl = { hlM: s.m, hlP: s.pi };
    const cur = '<line id="pcur" x1="0" y1="0" x2="0" y2="0" stroke="#2ec4b6" stroke-width="2.4" opacity="0" pointer-events="none"/>';
    sheet.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
    sheet.style.width = FS.f(L.W * A.zoom) + 'px';
    sheet.style.height = FS.f(L.H * A.zoom) + 'px';
    sheet.innerHTML = FS.render(S, L, Object.assign({ sel: selSet(), extra: cur }, hl));
    $('zl').textContent = Math.round(A.zoom * 100) + '%';
    $('bUndo').disabled = A.hi <= 0; $('bRedo').disabled = A.hi >= A.hist.length - 1;
    sheet.setAttribute('aria-label', `악보 ${S.name}, ${S.parts.length}개 파트, ${S.meas.length}마디`);
    if (s) { const mo = L.meas[s.m]; if (mo) keepVisible(L.systems[mo.sys]); }
  };
  function keepVisible(sys) {
    if (!sys || !desk) return;
    const r = sheet.getBoundingClientRect(), dr = desk.getBoundingClientRect(), k = r.height / A.L.H;
    const top = r.top + sys.y * k, bot = r.top + sys.yEnd * k;
    if (top < dr.top + 10) desk.scrollTop -= dr.top - top + 30;
    else if (bot > dr.bottom - 10) desk.scrollTop += bot - dr.bottom + 30;
  }
  UI.setZoom = (z) => { A.zoom = clamp(z, 0.3, 2.5); UI.draw(); };
  UI.fit = () => {
    const narrow = desk.clientWidth < 700, w = narrow ? 640 : 1000;
    if ((A.W || 1000) !== w) { A.W = w; A.zoom = 1; }
    UI.setZoom(Math.max(0.35, (desk.clientWidth - (narrow ? 20 : 40)) / w));
  };

  /* ================= selection & note entry ================= */
  function select(pi, m, v, i, extend) {
    if (extend && A.sel && A.sel.pi === pi && A.sel.v === v) { A.sel.m2 = m; A.sel.i2 = i; }
    else A.sel = { pi, m, v, i };
    UI.draw(); UI.panel();
    announce();
  }
  function announce() {
    const live = $('live'), e = A.sel ? UI.curEvent() : null; if (!live || !e) return;
    const d = FS.dur(e), nm = { 64: '온음표', 32: '2분음표', 16: '4분음표', 8: '8분음표', 4: '16분음표', 2: '32분음표', 1: '64분음표' }[d.base] || '음표';
    live.textContent = `${A.score.parts[A.sel.pi].name} ${A.sel.m + 1}마디, ${e.p.length ? e.p.map(FS.pname).join(' ') : '쉼표'} ${nm}`;
  }
  UI.select = select;
  function curDur() { return A.ui.dur * (A.ui.dot ? 1.5 : 1); }
  function enterPos() {
    const s = A.sel;
    if (s) return { pi: s.pi, m: s.m, v: s.v, t: curStart() };
    return { pi: 0, m: 0, v: A.ui.voice, t: 0 };
  }
  function afterPlace(pi, v, r) {
    const S = A.score;
    if (r.next.m >= S.meas.length) FS.growTo(S, r.next.m + 1);
    const E = S.parts[pi].m[r.next.m][v];
    const i = E ? FS.indexAt(E, r.next.t) : -1;
    A.sel = i >= 0 ? { pi, m: r.next.m, v, i } : { pi, m: r.at.m, v, i: r.at.i };
  }
  UI.placeEvent = function (pi, m, v, t, ev, advance) {
    const S = A.score, r = FS.place(S, pi, m, v, t, ev);
    if (advance) afterPlace(pi, v, r); else A.sel = { pi, m: r.at.m, v, i: r.at.i };
    return r;
  };
  function defaultAbs(pi) {
    return A.lastAbs[pi] != null ? A.lastAbs[pi] : FS.CLEFS[A.score.parts[pi].clef].base + 4;
  }
  function pitchFor(pi, s, acc) { // nearest octave to the last note
    const ref = defaultAbs(pi), o = Math.round((ref - s) / 7);
    return { s, a: acc == null ? FS.keyAlter(FS.mtab(A.score).key[A.sel ? A.sel.m : 0], s) : acc, o };
  }
  /** enter a pitch at the cursor (keyboard / click / piano) */
  UI.enterPitch = function (p, opts) {
    opts = opts || {};
    const S = A.score, pos = enterPos(), P = S.parts[pos.pi];
    if (A.ui.acc != null && !opts.keepAcc) { p = Object.assign({}, p, { a: A.ui.acc }); A.ui.acc = null; }
    A.lastAbs[pos.pi] = FS.abs(p);
    FS.audio.preview(S, pos.pi, p);
    const E = P.m[pos.m][pos.v], cur = A.sel && E ? E[A.sel.i] : null;
    if ((A.ui.chord || opts.chord) && cur && cur.p.length) {
      if (!cur.p.some((q) => FS.samePitch(q, p))) { cur.p.push(p); FS.sortPitches(cur.p); }
      UI.commit('화음 음 추가'); return;
    }
    const ev = A.ui.rest ? FS.rest(curDur()) : FS.note(curDur(), p);
    UI.placeEvent(pos.pi, pos.m, pos.v, pos.t, ev, true);
    UI.commit('음표 입력: ' + FS.pname(p));
    scrollToSel();
  };
  function scrollToSel() { /* draw() already keeps the system visible */ }
  UI.enterRest = function () {
    const pos = enterPos();
    UI.placeEvent(pos.pi, pos.m, pos.v, pos.t, FS.rest(curDur()), true);
    UI.commit('쉼표');
  };
  UI.enterLetter = function (letter, chord) {
    const s = 'CDEFGAB'.indexOf(letter.toUpperCase()); if (s < 0) return;
    const pos = enterPos();
    UI.enterPitch(pitchFor(pos.pi, s, null), { chord });
  };

  /** change duration of the selected note(s) / set the entry duration */
  UI.setDur = function (base, dot) {
    A.ui.dur = base; if (dot != null) A.ui.dot = dot;
    const evs = UI.selEvents();
    if (evs.length === 1 && evs[0].e.p.length) {
      const x = evs[0], s = A.sel, S = A.score, t = FS.startOf(S, s.pi, x.m, x.v, x.i);
      UI.placeEvent(s.pi, x.m, x.v, t, Object.assign({}, x.e, { d: curDur() }), false);
      UI.commit('길이 바꿈');
    } else { UI.panel(); renderTools(); }
  };

  UI.deleteSel = function () {
    const evs = UI.selEvents(), s = A.sel; if (!evs.length) return;
    evs.slice().reverse().forEach((x) => FS.clearEvent(A.score, s.pi, x.m, x.v, x.i));
    delete s.m2; delete s.i2;
    UI.commit('지움');
  };
  UI.shiftPitch = function (semis, octave) {
    const evs = UI.selEvents(); if (!evs.length) return;
    const S = A.score, key = FS.mtab(S).key;
    evs.forEach((x) => {
      if (!x.e.p.length) return;
      x.e.p = x.e.p.map((p) => {
        if (octave) return Object.assign({}, p, { o: clamp(p.o + octave, 0, 9) });
        const q = FS.fromMidi(FS.midi(p) + semis, key[x.m]); return q;
      });
      FS.sortPitches(x.e.p);
      if (evs.length === 1 && x.e.p[0]) { A.lastAbs[A.sel.pi] = FS.abs(x.e.p[0]); FS.audio.preview(S, A.sel.pi, x.e.p[x.e.p.length - 1]); }
    });
    UI.commit();
  };
  UI.setAccidental = function (a) {
    const evs = UI.selEvents().filter((x) => x.e.p.length);
    if (!evs.length) { A.ui.acc = A.ui.acc === a ? null : a; renderTools(); return; }
    evs.forEach((x) => x.e.p.forEach((p) => { p.a = p.a === a && a !== 0 ? 0 : a; }));
    UI.commit('임시표');
  };
  UI.toggleTie = function () {
    const evs = UI.selEvents().filter((x) => x.e.p.length);
    if (!evs.length) { FS.toast('붙임줄을 걸 음표를 먼저 고르세요'); return; }
    evs.forEach((x) => { if (x.e.tie) delete x.e.tie; else x.e.tie = true; });
    UI.commit('붙임줄');
  };
  UI.toggleDot = function () {
    A.ui.dot = !A.ui.dot;
    const evs = UI.selEvents();
    if (evs.length === 1 && evs[0].e.p.length) UI.setDur(A.ui.dur, A.ui.dot); else renderTools();
  };

  /* clipboard */
  UI.copySel = function (cut) {
    const evs = UI.selEvents(); if (!evs.length) { FS.toast('먼저 음표를 고르세요'); return; }
    A.clip = evs.map((x) => FS.clone(x.e));
    FS.store.set('ffscore.clip2', A.clip);
    FS.toast(evs.length + '개를 ' + (cut ? '잘라냈어요' : '복사했어요'));
    if (cut) UI.deleteSel();
  };
  UI.paste = function () {
    const clip = A.clip || FS.store.get('ffscore.clip2', null);
    if (!clip || !clip.length) { FS.toast('붙여넣을 음표가 없어요'); return; }
    const pos = enterPos(); let p = { m: pos.m, t: pos.t }, last = null;
    clip.forEach((e) => { const r = FS.place(A.score, pos.pi, p.m, pos.v, p.t, e); p = r.next; if (!last) last = r.at; });
    afterPlace(pos.pi, pos.v, { next: p, at: last });
    UI.commit(clip.length + '개를 붙여넣었어요');
  };

  /* move selection */
  function step(dir, extend) {
    const S = A.score, s = A.sel;
    if (!s) { A.sel = { pi: 0, m: 0, v: A.ui.voice, i: 0 }; UI.draw(); UI.panel(); return; }
    const P = S.parts[s.pi];
    let m = extend && s.m2 != null ? s.m2 : s.m, i = extend && s.i2 != null ? s.i2 : s.i;
    i += dir;
    if (i < 0) { if (m > 0) { m--; const E = P.m[m][s.v] || P.m[m][0]; i = E.length - 1; } else i = 0; }
    else if (i >= (P.m[m][s.v] || []).length) { if (m + 1 < P.m.length) { m++; i = 0; } else i = (P.m[m][s.v] || []).length - 1; }
    if (!P.m[m][s.v]) { UI.draw(); return; }
    if (extend) { s.m2 = m; s.i2 = i; UI.draw(); UI.panel(); } else select(s.pi, m, s.v, i);
  }
  function jumpPart(dir) {
    const s = A.sel, n = A.score.parts.length; if (!s) return;
    const pi = clamp(s.pi + dir, 0, n - 1); if (pi === s.pi) return;
    const t = curStart(), P = A.score.parts[pi], E = P.m[s.m][s.v] || P.m[s.m][0], i = Math.max(0, FS.indexAt(E, t, true));
    select(pi, s.m, P.m[s.m][s.v] ? s.v : 0, i);
  }

  /* ================= pointer input ================= */
  function svgPoint(e) {
    const r = sheet.getBoundingClientRect(), L = A.L;
    return { x: ((e.clientX - r.left) * L.W) / r.width, y: ((e.clientY - r.top) * L.H) / r.height };
  }
  function hitStaff(x, y) {
    const L = A.L, S = A.score;
    let best = null;
    L.systems.forEach((sys) => {
      if (y < sys.partTop[0] - 40 || y > sys.yEnd + 6) return;
      S.parts.forEach((P, pi) => {
        const top = sys.partTop[pi], d = Math.abs(y - (top + STAFF / 2));
        if (!best || d < best.d) best = { d, sys, pi, top };
      });
    });
    if (!best || best.d > 56) return null;
    const mo = best.sys.ms.find((q) => x >= q.x && x < q.xEnd);
    if (!mo) return null;
    return { pi: best.pi, sys: best.sys, mo, m: mo.m, top: best.top };
  }
  function hitItem(h, x, y, voice) {
    const L = A.L, lists = L.items[h.pi + '|' + h.m] || []; let best = null;
    lists.forEach((items, v) => items.forEach((it) => {
      const dx = Math.abs(it.x - x); if (dx > 11) return;
      let dy;
      if (it.rest) dy = Math.abs(y - (h.top + 20)) > 22 ? 99 : 0;
      else dy = Math.min(...it.heads.map((hd) => Math.abs(hd.y - y)));
      if (dy > 9) return;
      const score = dx + dy + (v === voice ? 0 : 6);
      if (!best || score < best.score) best = { it, score };
    }));
    return best ? best.it : null;
  }
  function pitchAtY(h, y) {
    const S = A.score, P = S.parts[h.pi], base = FS.CLEFS[P.clef].base;
    const pos = Math.round((h.top + STAFF - y) / 5), abs = base + pos, st = ((abs % 7) + 7) % 7;
    return { s: st, a: A.ui.acc != null ? A.ui.acc : FS.keyAlter(FS.mtab(S).key[h.m], st), o: Math.floor(abs / 7), pos };
  }
  UI.placeAtPoint = function (h, x, y) {
    const S = A.score, g = Math.max(1, curDur()), len = FS.mlen(S, h.m);
    let t = FS.tAt(A.L, h.m, x);
    t = Math.min(Math.max(0, Math.round(t / g - 0.35) * g), Math.max(0, len - Math.min(g, len)));
    if (A.ui.dot) t = Math.floor(t / A.ui.dur + 1e-6) * A.ui.dur;
    const v = A.ui.voice;
    A.sel = { pi: h.pi, m: h.m, v, i: 0 };
    if (A.ui.rest) { UI.placeEvent(h.pi, h.m, v, t, FS.rest(curDur()), false); UI.commit('쉼표'); return; }
    const p = pitchAtY(h, y); delete p.pos;
    A.lastAbs[h.pi] = FS.abs(p);
    if (A.ui.acc != null) A.ui.acc = null;
    FS.audio.preview(S, h.pi, p);
    const E = S.parts[h.pi].m[h.m][v], i0 = E ? FS.indexAt(E, t) : -1;
    if (A.ui.chord && i0 >= 0 && E[i0].p.length) { if (!E[i0].p.some((q) => FS.samePitch(q, p))) { E[i0].p.push(p); FS.sortPitches(E[i0].p); } A.sel = { pi: h.pi, m: h.m, v, i: i0 }; UI.commit('화음 음 추가'); return; }
    UI.placeEvent(h.pi, h.m, v, t, FS.note(curDur(), p), false);
    UI.commit('음표 입력: ' + FS.pname(p));
  };

  let drag = null;
  function bindPointer() {
    sheet.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      const pt = svgPoint(e), h = hitStaff(pt.x, pt.y);
      drag = { x0: e.clientX, y0: e.clientY, t0: Date.now(), pt, h, type: e.pointerType, moved: false, shift: e.shiftKey };
      if (h) {
        const it = hitItem(h, pt.x, pt.y, A.ui.voice);
        if (it && !it.rest && e.pointerType !== 'touch' && A.sel && selSet().has(key(it.pi, it.m, it.v, it.i)) && !e.shiftKey) {
          drag.pitch = { it, pos0: Math.round((it.top + STAFF - pt.y) / 5), orig: FS.clone(it.e.p), changed: false };
          try { sheet.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
        }
      }
    });
    sheet.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0) > 5) drag.moved = true;
      if (drag.pitch && drag.moved) {
        const pt = svgPoint(e), d = Math.round((drag.pitch.it.top + STAFF - pt.y) / 5) - drag.pitch.pos0, ev = drag.pitch.it.e;
        if (d !== drag.pitch.last) {
          drag.pitch.last = d; drag.pitch.changed = true;
          const key0 = FS.mtab(A.score).key[drag.pitch.it.m];
          ev.p = drag.pitch.orig.map((p) => { const a = FS.abs(p) + d, st = ((a % 7) + 7) % 7; return { s: st, a: FS.keyAlter(key0, st), o: Math.floor(a / 7) }; });
          UI.draw();
          FS.audio.preview(A.score, drag.pitch.it.pi, ev.p[ev.p.length - 1]);
        }
      }
    });
    const up = (e) => {
      if (!drag) return;
      const d = drag; drag = null;
      if (d.pitch && d.pitch.changed) { UI.commit('음 높이 바꿈'); return; }
      if (d.moved || Date.now() - d.t0 > 700) return;
      const pt = d.pt, h = d.h;
      if (!h) { if (A.sel) { A.sel = null; UI.draw(); UI.panel(); } return; }
      const it = hitItem(h, pt.x, pt.y, A.ui.voice), inputMode = A.ui.tool === 'input';
      if (it && !(inputMode && (it.rest || A.ui.chord))) {
        select(it.pi, it.m, it.v, it.i, d.shift);
        if (!it.rest) FS.audio.preview(A.score, it.pi, it.e.p[it.e.p.length - 1]);
        return;
      }
      if (inputMode) { UI.placeAtPoint(h, pt.x, pt.y); return; }
      const P = A.score.parts[h.pi], v = P.m[h.m][A.ui.voice] ? A.ui.voice : 0, tt = FS.tAt(A.L, h.m, pt.x);
      select(h.pi, h.m, v, Math.max(0, FS.indexAt(P.m[h.m][v], tt, true)), d.shift);
    };
    sheet.addEventListener('pointerup', up);
    sheet.addEventListener('pointercancel', () => { drag = null; });
  }

  /* ================= keyboard ================= */
  function bindKeys() {
    document.addEventListener('keydown', (e) => {
      const tg = e.target, tag = tg && tg.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (tg && tg.isContentEditable)) return;
      const ctrl = e.ctrlKey || e.metaKey, k = e.key, kl = k.toLowerCase();
      for (const h of UI.keys) if (h(e)) return;
      if (ctrl) {
        if (kl === 'z') { e.preventDefault(); e.shiftKey ? UI.redo() : UI.undo(); }
        else if (kl === 'y') { e.preventDefault(); UI.redo(); }
        else if (kl === 'c') { e.preventDefault(); UI.copySel(false); }
        else if (kl === 'x') { e.preventDefault(); UI.copySel(true); }
        else if (kl === 'v') { e.preventDefault(); UI.paste(); }
        else if (k === 'ArrowUp') { e.preventDefault(); UI.shiftPitch(0, 1); }
        else if (k === 'ArrowDown') { e.preventDefault(); UI.shiftPitch(0, -1); }
        return;
      }
      if (e.altKey) return;
      if (k === 'ArrowLeft') { e.preventDefault(); step(-1, e.shiftKey); }
      else if (k === 'ArrowRight') { e.preventDefault(); step(1, e.shiftKey); }
      else if (k === 'ArrowUp') { e.preventDefault(); UI.shiftPitch(1, 0); }
      else if (k === 'ArrowDown') { e.preventDefault(); UI.shiftPitch(-1, 0); }
      else if (k === 'PageUp') { e.preventDefault(); jumpPart(-1); }
      else if (k === 'PageDown') { e.preventDefault(); jumpPart(1); }
      else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); UI.deleteSel(); }
      else if (k === 'Escape') { A.sel = null; UI.draw(); UI.panel(); }
      else if (k === ' ') { e.preventDefault(); UI.togglePlay(); }
      else if (/^[1-7]$/.test(k)) { e.preventDefault(); UI.setDur([64, 32, 16, 8, 4, 2, 1][7 - +k] , false); }
      else if (k === '.') { e.preventDefault(); UI.toggleDot(); }
      else if (kl === 'r') { e.preventDefault(); UI.enterRest(); }
      else if (/^[a-g]$/.test(kl)) { e.preventDefault(); UI.enterLetter(kl, e.shiftKey); }
    });
  }

  /* ================= playback ================= */
  UI.togglePlay = function () {
    if (FS.audio.playing()) { FS.audio.stop(); return; }
    const S = A.score; let from = 0;
    if (A.sel) from = FS.mtab(S).start[A.sel.m] + curStart();
    $('bPlay').textContent = '■ 멈춤';
    FS.audio.start(S, from, onTick, () => { $('bPlay').textContent = '▶ 재생'; const c = $('pcur'); if (c) c.setAttribute('opacity', '0'); });
  };
  function onTick(u) {
    const L = A.L, T = L.T; let m = 0;
    while (m + 1 < T.n && u >= T.start[m + 1] - 1e-9) m++;
    const mo = L.meas[m], sys = L.systems[mo.sys], x = FS.xAt(L, m, u - T.start[m]), c = $('pcur'); if (!c) return;
    c.setAttribute('x1', x); c.setAttribute('x2', x);
    c.setAttribute('y1', sys.partTop[0] - 10); c.setAttribute('y2', sys.partBot[sys.partBot.length - 1] + 10); c.setAttribute('opacity', '.9');
    if (A.cursorSys !== mo.sys) { A.cursorSys = mo.sys; keepVisible(sys); }
  }

  /* ================= tool column ================= */
  const DURS = [[64, '온', '온음표'], [32, '2분', '2분음표'], [16, '4분', '4분음표'], [8, '8분', '8분음표'], [4, '16분', '16분음표'], [2, '32분', '32분음표'], [1, '64분', '64분음표']];
  function renderTools() {
    const u = A.ui, b = (cls, act, v, label, title, on, extra) => `<button class="tl ${cls || ''}${on ? ' on' : ''}" data-act="${act}" data-v="${v == null ? '' : v}" title="${title}" aria-label="${title}" aria-pressed="${!!on}"${extra || ''}>${label}</button>`;
    let h = '';
    h += b('', 'tool', 'input', '✎', '입력 도구 (누르면 음표가 찍혀요)', u.tool === 'input');
    h += b('', 'tool', 'select', '↖', '선택 도구', u.tool === 'select');
    h += '<div class="tsep"></div>';
    DURS.forEach((d) => { h += b('sm', 'dur', d[0], d[1], d[2], u.dur === d[0]); });
    h += b('', 'dot', '', '•', '점음표', u.dot);
    h += b('', 'rest', '', '쉼', '쉼표 입력', u.rest);
    h += '<div class="tsep"></div>';
    h += b('', 'acc', 1, '♯', '샤프', u.acc === 1) + b('', 'acc', -1, '♭', '플랫', u.acc === -1) + b('', 'acc', 0, '♮', '제자리표', u.acc === 0);
    h += b('', 'tie', '', '⁀', '붙임줄', false);
    h += b('', 'chord', '', '화음', '화음 쌓기 (켜면 같은 음표에 음이 쌓여요)', u.chord);
    h += '<div class="tsep"></div>';
    for (let v = 0; v < 4; v++) h += b('sm', 'voice', v, 'V' + (v + 1), (v + 1) + '번 성부', u.voice === v);
    h += '<div class="tsep"></div>';
    h += b('', 'pad', '', '🎹', '건반 보이기/숨기기', u.pad);
    h += b('', 'del', '', '🗑', '고른 음표 지우기', false);
    $('tools').innerHTML = h;
    $('pad').hidden = !u.pad;
    if (u.pad) buildPad();
  }
  UI.renderTools = renderTools;
  Object.assign(UI.actions, {
    tool: (el) => { A.ui.tool = el.dataset.v; renderTools(); },
    dur: (el) => UI.setDur(+el.dataset.v, null),
    dot: () => UI.toggleDot(),
    rest: () => { A.ui.rest = !A.ui.rest; renderTools(); },
    acc: (el) => UI.setAccidental(+el.dataset.v),
    tie: () => UI.toggleTie(),
    chord: () => { A.ui.chord = !A.ui.chord; renderTools(); },
    voice: (el) => { A.ui.voice = +el.dataset.v; if (A.sel && A.score.parts[A.sel.pi].m[A.sel.m][A.ui.voice]) A.sel.v = A.ui.voice; renderTools(); UI.draw(); },
    pad: () => { A.ui.pad = !A.ui.pad; renderTools(); },
    del: () => UI.deleteSel()
  });

  /* ================= on-screen keyboard (touch friendly) ================= */
  let padOct = 4;
  const DRUMS = [['베이스드럼', 65], ['로우 탐', 69], ['스네어', 72], ['미들 탐', 74], ['하이 탐', 76], ['하이햇', 79], ['크래시', 81]];
  function padPart() { return A.score.parts[A.sel ? A.sel.pi : 0]; }
  function buildPad() {
    A.padKind = padPart() && padPart().clef === 'drum' ? 'drum' : 'piano';
    if (A.padKind === 'drum') {
      $('pad').innerHTML = '<div class="padbar"><span class="zoom">드럼 건반</span><button class="tbtn" data-act="rest" data-v="">쉼표</button></div><div class="drums">' + DRUMS.map((d) => `<button class="tbtn" data-pk="${d[1]}">${d[0]}</button>`).join('') + '</div>';
      return;
    }
    const W7 = [0, 2, 4, 5, 7, 9, 11];
    let h = '<div class="padbar"><button class="tbtn" data-act="padoct" data-v="-1" aria-label="옥타브 낮게">◀ 낮게</button><span class="zoom">옥타브 ' + padOct + '</span><button class="tbtn" data-act="padoct" data-v="1" aria-label="옥타브 높게">높게 ▶</button><button class="tbtn" data-act="rest" data-v="">쉼표</button></div><div class="pk">';
    for (let i = 0; i < 15; i++) {
      const oct = padOct + Math.floor(i / 7), m = (oct + 1) * 12 + W7[i % 7];
      h += `<button class="w" data-pk="${m}" aria-label="${FS.STEPS[i % 7]}${oct}" style="left:${(i * 100) / 15}%;width:${100 / 15}%">${i % 7 === 0 ? 'C' + oct : ''}</button>`;
    }
    for (let i = 0; i < 14; i++) {
      if ([2, 6].indexOf(i % 7) >= 0) continue;
      const oct = padOct + Math.floor(i / 7), m = (oct + 1) * 12 + W7[i % 7] + 1;
      h += `<button class="b" data-pk="${m}" aria-label="${FS.STEPS[i % 7]}♯${oct}" style="left:${((i + 1) * 100) / 15 - 2.6}%;width:5.2%"></button>`;
    }
    $('pad').innerHTML = h + '</div>';
  }
  UI.actions.padoct = (el) => { padOct = clamp(padOct + +el.dataset.v, 1, 6); buildPad(); };

  /* ================= panel ================= */
  function sel() { return A.sel ? A.score.parts[A.sel.pi].m[A.sel.m][A.sel.v][A.sel.i] : null; }
  UI.curEvent = sel;
  function noteTab() {
    const S = A.score, s = A.sel, e = s ? sel() : null; let h = '';
    if (s && e) {
      const evs = UI.selEvents(), d = FS.dur(e), names = { 64: '온음표', 32: '2분음표', 16: '4분음표', 8: '8분음표', 4: '16분음표', 2: '32분음표', 1: '64분음표' };
      h += `<div class="sec"><h4>고른 음표 · ${FS.esc(S.parts[s.pi].name)} ${s.m + 1}번째 마디${evs.length > 1 ? ' · ' + evs.length + '개' : ''}</h4><div class="note">${e.p.length ? e.p.map(FS.pname).join(' ') + ' · ' : '쉼표 · '}${names[d.base]}${'•'.repeat(d.dots)}${e.tie ? ' · 붙임줄' : ''}</div>`;
      h += '<div class="btns"><button class="tbtn" data-act="shift" data-v="1">+반음</button><button class="tbtn" data-act="shift" data-v="-1">−반음</button><button class="tbtn" data-act="oct" data-v="1">+1옥타브</button><button class="tbtn" data-act="oct" data-v="-1">−1옥타브</button></div>';
      h += '<div class="btns"><button class="tbtn" data-act="copy">복사</button><button class="tbtn" data-act="cut">잘라내기</button><button class="tbtn" data-act="paste">붙여넣기</button><button class="tbtn" data-act="del">지우기</button></div></div>';
    } else {
      h += '<div class="sec"><h4>음표 입력</h4><div class="note">오선을 누르면 왼쪽에서 고른 길이의 음표가 찍혀요. 키보드에서 <b>A~G</b>는 음, <b>1~7</b>은 길이(5=4분음표), <b>R</b>은 쉼표, <b>↑↓</b>는 음 높이, <b>←→</b>는 이동, <b>Shift</b>를 누르면 범위·화음, <b>Space</b>는 재생이에요. 휴대폰에서는 🎹 건반을 켜 보세요.</div></div>';
      h += '<div class="btns"><button class="tbtn" data-act="paste">붙여넣기</button></div>';
    }
    UI.sections.note.forEach((fn) => { h += fn(S, s, e) || ''; });
    const m = s ? s.m : null;
    if (m != null) {
      h += `<div class="sec"><h4>마디 · ${m + 1}번째</h4><div class="btns"><button class="tbtn" data-act="minsb">앞에 빈 마디 끼우기</button><button class="tbtn" data-act="minsa">뒤에 빈 마디 끼우기</button><button class="tbtn" data-act="mdel">이 마디 지우기</button></div></div>`;
    } else h += '<div class="sec"><div class="btns"><button class="tbtn" data-act="madd">맨 뒤에 마디 더하기</button></div></div>';
    return h;
  }
  function songTab() {
    const S = A.score, T = FS.mtab(S), m = A.sel ? A.sel.m : 0;
    let h = '<div class="sec"><h4>곡 정보</h4>';
    h += `<div class="row"><label>작곡</label><input type="text" data-chg="composer" value="${FS.esc(S.composer || '')}" data-notr></div>`;
    h += `<div class="row"><label>빠르기</label><input type="range" min="30" max="240" value="${S.tempo}" data-chg="tempo"><span class="v">${S.tempo}</span></div></div>`;
    h += `<div class="sec"><h4>박자 · 조 (${m + 1}번째 마디 기준)</h4><div class="note">${m === 0 ? '처음부터 바뀌어요.' : (m + 1) + '번째 마디부터 바뀌고, 뒤의 음표는 새 박자에 맞게 다시 나뉘어요.'}</div>`;
    h += `<div class="row"><label>박자</label><select data-chg="ts">${FS.TIMES.map((t) => `<option value="${t.join('/')}"${T.ts[m][0] === t[0] && T.ts[m][1] === t[1] ? ' selected' : ''}>${t.join('/')}</option>`).join('')}</select></div>`;
    h += `<div class="row"><label>조</label><select data-chg="key">${FS.KEYS.map((k) => `<option value="${k[1]}"${T.key[m] === k[1] ? ' selected' : ''}>${k[0]}</option>`).join('')}</select></div>`;
    if (m > 0 && (S.meas[m].ts || S.meas[m].key != null)) h += '<div class="btns"><button class="tbtn" data-act="clearchg">이 마디의 박자·조 바꿈 지우기</button></div>';
    h += '</div>';
    h += `<div class="sec"><h4>보기</h4><div class="row"><label>한 줄에 마디</label><select data-chg="mps"><option value="0">자동</option>${[1, 2, 3, 4, 6, 8].map((n) => `<option value="${n}"${S.mps === n ? ' selected' : ''}>${n}마디씩</option>`).join('')}</select></div><label class="chk"><input type="checkbox" data-chg="pl"${S.pl ? ' checked' : ''}> 파트 이름을 오선 위에 쓰기</label><label class="chk"><input type="checkbox" data-chg="nc"${S.nc ? ' checked' : ''}> 음 높이별로 색 칠하기</label><div class="row"><label>음 이름</label><select data-chg="nn"><option value="0">안 쓰기</option><option value="1"${S.nn === 1 ? ' selected' : ''}>C D E (알파벳)</option><option value="2"${S.nn === 2 ? ' selected' : ''}>도 레 미</option></select></div></div>`;
    UI.sections.song.forEach((fn) => { h += fn(S) || ''; });
    h += '<div class="sec"><h4>새 악보 틀</h4><div class="btns">' + [['lead', '한 줄 악보'], ['piano', '피아노 (두 줄)'], ['quartet', '현악 4중주'], ['band', '밴드 (멜로디·베이스·드럼)']].map((x) => `<button class="tbtn" data-act="tpl" data-v="${x[0]}">${x[1]}</button>`).join('') + '</div></div>';
    const lib = FS.io.libGet();
    h += '<div class="sec"><h4>내 보관함 (이 브라우저에 저장)</h4><div class="btns"><button class="tbtn pri" data-act="libsave">지금 악보 보관하기</button></div>';
    h += lib.length ? lib.slice(0, 20).map((x) => `<div class="row"><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${FS.esc(x.name || '이름 없음')}</span><button class="tbtn" data-act="libopen" data-v="${x.id}">열기</button><button class="tbtn" data-act="libdel" data-v="${x.id}" aria-label="삭제">✕</button></div>`).join('') : '<div class="note">아직 보관한 악보가 없어요.</div>';
    h += '</div>';
    return h;
  }
  function partsTab() {
    const S = A.score; let h = '';
    S.parts.forEach((P, i) => {
      h += `<div class="sec" style="border:1px solid var(--line);border-radius:10px;padding:8px"><div class="row"><label>이름</label><input type="text" data-chg="pname" data-i="${i}" value="${FS.esc(P.name)}" data-notr></div>`;
      h += `<div class="row"><label>음자리표</label><select data-chg="pclef" data-i="${i}">${Object.keys(FS.CLEFS).map((c) => `<option value="${c}"${P.clef === c ? ' selected' : ''}>${FS.CLEFS[c].name}</option>`).join('')}</select></div>`;
      h += `<div class="row"><label>악기</label><select data-chg="pinst" data-i="${i}">${FS.INSTS.map((x) => `<option value="${x[0]}"${P.inst === x[0] ? ' selected' : ''}>${x[1]}</option>`).join('')}</select></div>`;
      h += `<div class="row"><label>TAB 악보</label><select data-chg="ptab" data-i="${i}"><option value="">없음</option>${Object.keys(FS.TABS).map((k) => `<option value="${k}"${P.tab === k ? ' selected' : ''}>${{ guitar: '기타 6줄', bass: '베이스 4줄', ukulele: '우쿨렐레' }[k]}</option>`).join('')}</select></div>`;
      h += `<div class="row"><label>소리 높이</label><select data-chg="ptrans" data-i="${i}">${[[0, '그대로'], [-2, 'B♭ 악기 (−2)'], [-3, 'A 악기 (−3)'], [-7, 'F 호른 (−7)'], [-9, 'E♭ 알토 (−9)'], [12, '한 옥타브 위'], [-12, '한 옥타브 아래']].map((x) => `<option value="${x[0]}"${(P.trans || 0) === x[0] ? ' selected' : ''}>${x[1]}</option>`).join('')}</select></div>`;
      h += `<div class="row"><label class="chk"><input type="checkbox" data-chg="psolo" data-i="${i}"${P.solo ? ' checked' : ''}> 이 파트만 듣기</label></div>`;
      h += `<div class="row"><label>음량</label><input type="range" min="0" max="100" value="${P.vol}" data-chg="pvol" data-i="${i}"><span class="v">${P.vol}</span></div>`;
      h += `<div class="row"><label>좌우</label><input type="range" min="-100" max="100" value="${Math.round((P.pan || 0) * 100)}" data-chg="ppan" data-i="${i}"></div>`;
      h += `<label class="chk"><input type="checkbox" data-chg="pmute" data-i="${i}"${P.mute ? ' checked' : ''}> 소리 끄기</label>`;
      h += `<div class="btns"><button class="tbtn" data-act="psel" data-v="${i}">이 파트 고르기</button>${S.parts.length > 1 ? `<button class="tbtn" data-act="pdel" data-v="${i}">파트 지우기</button>` : ''}${i > 0 ? `<button class="tbtn" data-act="pup" data-v="${i}">위로</button>` : ''}</div></div>`;
    });
    UI.sections.parts.forEach((fn) => { h += fn(S) || ''; });
    h += '<div class="btns"><button class="tbtn pri" data-act="padd">파트 더하기</button></div>';
    return h;
  }
  UI.panel = function () {
    if (A.padKind && (padPart().clef === 'drum' ? 'drum' : 'piano') !== A.padKind) buildPad();
    document.querySelectorAll('#ptabs button').forEach((b) => b.classList.toggle('on', b.dataset.p === A.tab));
    const body = $('pbody'), st = body.scrollTop;
    // do not rebuild while a field inside the panel has focus (typing)
    if (document.activeElement && body.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement.type !== 'range' && document.activeElement.type !== 'checkbox') return;
    body.innerHTML = A.tab === 'song' ? songTab() : A.tab === 'parts' ? partsTab() : UI.tabs[A.tab] ? UI.tabs[A.tab]() : noteTab();
    body.scrollTop = st;
  };

  Object.assign(UI.actions, {
    shift: (el) => UI.shiftPitch(+el.dataset.v, 0), oct: (el) => UI.shiftPitch(0, +el.dataset.v),
    copy: () => UI.copySel(false), cut: () => UI.copySel(true), paste: () => UI.paste(),
    minsb: () => { FS.insertMeasure(A.score, A.sel.m); A.sel = { pi: A.sel.pi, m: A.sel.m, v: 0, i: 0 }; UI.commit('빈 마디를 앞에 끼웠어요'); },
    minsa: () => { FS.insertMeasure(A.score, A.sel.m + 1); A.sel = { pi: A.sel.pi, m: A.sel.m + 1, v: 0, i: 0 }; UI.commit('빈 마디를 뒤에 끼웠어요'); },
    mdel: () => { if (!FS.deleteMeasure(A.score, A.sel.m)) { FS.toast('마지막 한 마디는 지울 수 없어요'); return; } A.sel = null; UI.commit('마디를 지웠어요'); },
    madd: () => { FS.growTo(A.score, A.score.meas.length + 1); UI.commit('마디를 더했어요'); },
    clearchg: () => { const q = A.score.meas[A.sel.m]; delete q.ts; delete q.key; FS.reflow(A.score, A.sel.m); UI.commit(); },
    tpl: (el) => { if (!window.confirm('지금 악보를 지우고 새로 시작할까요? (보관함에 넣지 않았다면 사라져요)')) return; UI.reset(FS.newScore(el.dataset.v)); },
    libsave: () => { if (FS.io.libSave(A.score)) { FS.toast('보관함에 넣었어요'); UI.panel(); } },
    libopen: (el) => { try { const S = FS.io.libOpen(el.dataset.v); if (S) UI.reset(S); } catch (e) { FS.toast('이 악보를 열 수 없어요'); } },
    libdel: (el) => { FS.io.libDelete(el.dataset.v); UI.panel(); },
    psel: (el) => { select(+el.dataset.v, A.sel ? A.sel.m : 0, 0, 0); },
    pdel: (el) => { A.score.parts.splice(+el.dataset.v, 1); A.sel = null; UI.commit('파트를 지웠어요'); },
    pup: (el) => { const i = +el.dataset.v, P = A.score.parts; P.splice(i - 1, 0, P.splice(i, 1)[0]); A.sel = null; UI.commit(); },
    padd: () => { const S = A.score; if (S.parts.length >= 12) return; const P = FS.newPart('새 파트', 'treble', 'piano'); S.parts.push(P); FS.growTo(S, S.meas.length); P.m = S.meas.map((_, m) => [[FS.rest(FS.mtab(S).len[m])]]); UI.commit('파트를 더했어요'); }
  });
  Object.assign(UI.changes, {
    composer: (el) => { A.score.composer = el.value; UI.commit(); },
    tempo: (el) => { A.score.tempo = +el.value; UI.commit(); },
    ts: (el) => {
      const S = A.score, m = A.sel ? A.sel.m : 0, ts = el.value.split('/').map(Number);
      if (m === 0) S.ts = ts; else S.meas[m].ts = ts;
      FS.reflow(S, m); UI.commit('박자를 바꿨어요');
    },
    key: (el) => { const S = A.score, m = A.sel ? A.sel.m : 0; if (m === 0) S.key = +el.value; else S.meas[m].key = +el.value; UI.commit('조를 바꿨어요'); },
    mps: (el) => { A.score.mps = +el.value || undefined; if (!A.score.mps) delete A.score.mps; UI.commit(); },
    nc: (el) => { if (el.checked) A.score.nc = true; else delete A.score.nc; UI.commit(); },
    nn: (el) => { const v = +el.value; if (v) A.score.nn = v; else delete A.score.nn; UI.commit(); },
    pl: (el) => { if (el.checked) A.score.pl = true; else delete A.score.pl; UI.commit(); },
    pname: (el) => { A.score.parts[+el.dataset.i].name = el.value; UI.commit(); },
    ptab: (el) => { const P = A.score.parts[+el.dataset.i]; if (el.value) P.tab = el.value; else delete P.tab; UI.commit(); },
    ptrans: (el) => { const P = A.score.parts[+el.dataset.i], v = +el.value; if (v) P.trans = v; else delete P.trans; UI.commit(); },
    psolo: (el) => { const P = A.score.parts[+el.dataset.i]; if (el.checked) P.solo = true; else delete P.solo; UI.commit(); },
    pclef: (el) => { A.score.parts[+el.dataset.i].clef = el.value; UI.commit(); },
    pinst: (el) => { A.score.parts[+el.dataset.i].inst = el.value; UI.commit(); },
    pvol: (el) => { A.score.parts[+el.dataset.i].vol = +el.value; UI.commit(); },
    ppan: (el) => { A.score.parts[+el.dataset.i].pan = +el.value / 100; UI.commit(); },
    pmute: (el) => { A.score.parts[+el.dataset.i].mute = el.checked; UI.commit(); }
  });

  /* ================= menus & wiring ================= */
  function popup(anchor, items) {
    document.querySelectorAll('.menu').forEach((m) => m.remove());
    const m = document.createElement('div'), r = anchor.getBoundingClientRect();
    m.className = 'menu'; m.style.top = r.bottom + 4 + 'px'; m.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
    m.innerHTML = items.map((x, i) => `<button data-mi="${i}">${x[0]}</button>`).join('');
    m.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; m.remove(); items[+b.dataset.mi][1](); });
    document.body.appendChild(m);
    setTimeout(() => document.addEventListener('click', function off(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('click', off); } }), 0);
  }
  UI.exports = [['프로젝트 파일 (.fscore)', () => FS.io.download(FS.io.fname(A.score, 'fscore'), FS.io.exportJson(A.score))]];

  UI.init = function () {
    sheet = $('sheet'); desk = $('desk');
    bindPointer(); bindKeys();
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]'); if (!el) return;
      const fn = UI.actions[el.dataset.act]; if (fn) fn(el, e);
    });
    $('pbody').addEventListener('change', (e) => { const fn = UI.changes[e.target.dataset.chg]; if (fn) fn(e.target, e); });
    $('pad').addEventListener('pointerdown', (e) => {
      const k = e.target.closest('[data-pk]'); if (!k) return; e.preventDefault();
      const S = A.score, pos = enterPos(), key = FS.mtab(S).key[pos.m];
      UI.enterPitch(FS.fromMidi(+k.dataset.pk, A.padKind === 'drum' ? 0 : key));
    });
    $('ptabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; A.tab = b.dataset.p; UI.panel(); });
    $('bUndo').onclick = UI.undo; $('bRedo').onclick = UI.redo;
    $('bPlay').onclick = UI.togglePlay; $('bStop').onclick = () => FS.audio.stop();
    $('bZm').onclick = () => UI.setZoom(A.zoom - 0.1); $('bZp').onclick = () => UI.setZoom(A.zoom + 0.1); $('bZf').onclick = UI.fit;
    $('dname').addEventListener('change', () => { A.score.name = $('dname').value.trim() || '이름 없는 악보'; UI.commit(); });
    $('bSave').onclick = (e) => popup(e.currentTarget, UI.exports);
    $('bOpen').onclick = () => $('fileIn').click();
    $('fileIn').onchange = (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try { FS.io.readFile(f, (S) => { UI.reset(S); FS.toast('열었어요: ' + S.name); }); } catch (er) { FS.toast('이 파일을 열 수 없어요'); }
    };
    window.addEventListener('beforeunload', () => FS.io.autosave(A.score));
    window.addEventListener('resize', () => { /* keep layout */ });
    renderTools();
  };
})();
