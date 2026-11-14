/* Fry Score — persistence, library and file import/export. */
(function () {
  'use strict';
  const FS = window.FS;
  const IO = (FS.io = {});
  const KEY = 'ffscore.v2', LIBK = 'ffscore.lib2', OLD_KEY = 'ffscore.v1', OLD_LIB = 'ffscore.lib';

  IO.download = function (name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  };
  IO.fname = (S, ext) => (String(S.name || 'score').replace(/[\\/:*?"<>|]+/g, '').trim() || 'score') + '.' + ext;

  /* ---------- v1 (pre-rebuild) scores ---------- */
  IO.migrateV1 = function (o) {
    if (!o || !Array.isArray(o.parts)) throw new Error('bad v1');
    const S = { v: 2, name: o.name, composer: o.composer, tempo: o.tempo, key: o.key, ts: o.ts, meas: [], parts: [] };
    ['sub', 'lyr', 'cpy', 'mps', 'pl', 'nn', 'nc', 'cd', 'tsym', 'mn', 'pick'].forEach((k) => { if (o[k]) S[k] = o[k]; });
    const groups = [];
    o.parts.forEach((p, i) => { if (p.v2 && groups.length) groups[groups.length - 1].voices.push(p); else groups.push({ base: p, voices: [p] }); });
    const ts = Array.isArray(S.ts) && S.ts[0] > 0 && S.ts[1] > 0 ? S.ts : [4, 4];
    const mk = o.mk || {};
    // lengths per measure (mid-score time changes)
    let total = 0;
    groups.forEach((g) => g.voices.forEach((p) => { total = Math.max(total, (p.ev || []).reduce((a, e) => a + (+e.d || 0), 0)); }));
    const lens = []; let cover = 0, t = ts, i = 0;
    while (cover < total - 1e-6 || i < 4) { if (i > 0 && mk[i] && Array.isArray(mk[i].ts)) t = mk[i].ts; const l = (t[0] * 64) / t[1]; lens.push(l); cover += l; i++; if (i > 3000) break; }
    for (let m = 0; m < lens.length; m++) S.meas.push(mk[m] ? FS.fixMark(mk[m]) : {});
    groups.forEach((g) => {
      const b = g.base;
      const P = FS.newPart(b.name, FS.CLEFS[b.clef] ? b.clef : 'treble', b.inst);
      P.vol = b.vol; P.pan = b.pan; P.mute = b.mute; if (b.tab) P.tab = b.tab; if (b.trans) P.trans = b.trans;
      S.parts.push(P);
    });
    FS.growTo(S, S.meas.length);
    groups.forEach((g, pi) => {
      g.voices.forEach((p, v) => {
        let pos = { m: 0, t: 0 };
        (p.ev || []).forEach((e) => {
          const ev = Object.assign({}, e, { p: e.p || [] }); if (ev.tp === true) ev.tp = 3; else if (!ev.tp) delete ev.tp;
          FS.normD(ev);
          if (v > 0 && !ev.p.length && Object.keys(ev).length <= 3) { pos = FS.advance(S, pos, ev.d); return; }
          const r = FS.place(S, pi, pos.m, Math.min(v, 3), pos.t, ev); pos = r.next;
        });
      });
    });
    return FS.fix(S);
  };
  IO.parseScore = function (o) { return o && o.v === 2 ? FS.fix(o) : IO.migrateV1(o); };

  /* ---------- autosave & library ---------- */
  IO.autosave = (S) => { const ok = FS.store.set(KEY, S); if (window.FFCo) FFCo.touch(); return ok; };
  IO.loadAutosave = function () {
    try {
      const raw = FS.store.get(KEY, null);
      if (raw) return FS.fix(raw);
      const old = FS.store.get(OLD_KEY, null);
      if (old) return IO.migrateV1(old);
    } catch (e) { /* fall through */ }
    return null;
  };
  IO.libGet = function () {
    const a = FS.store.get(LIBK, []), b = FS.store.get(OLD_LIB, []);
    const out = Array.isArray(a) ? a.slice() : [];
    if (Array.isArray(b)) b.forEach((x) => { if (x && x.id && !out.some((y) => y.id === x.id)) out.push(Object.assign({ old: true }, x)); });
    return out.sort((p, q) => (q.t || 0) - (p.t || 0));
  };
  IO.libSave = function (S) {
    const a = (FS.store.get(LIBK, []) || []).filter((x) => x.id !== S.libId);
    if (!S.libId) S.libId = Date.now().toString(36);
    a.unshift({ id: S.libId, name: S.name, t: Date.now(), data: JSON.stringify(S) });
    if (!FS.store.set(LIBK, a.slice(0, 60))) { FS.toast('브라우저 저장 공간이 부족해요'); return false; }
    return true;
  };
  IO.libOpen = function (id) {
    const e = IO.libGet().filter((x) => x.id === id)[0]; if (!e) return null;
    const S = IO.parseScore(JSON.parse(e.data)); S.libId = e.id; return S;
  };
  IO.libDelete = function (id) {
    FS.store.set(LIBK, (FS.store.get(LIBK, []) || []).filter((x) => x.id !== id));
    FS.store.set(OLD_LIB, (FS.store.get(OLD_LIB, []) || []).filter((x) => x.id !== id));
  };

  /* ---------- files ---------- */
  IO.exportJson = (S) => new Blob([JSON.stringify(S)], { type: 'application/json' });
  IO.readFile = function (file, done) {
    const r = new FileReader(), name = file.name;
    if (/\.(musicxml|xml)$/i.test(name) && IO.readXml) { r.onload = () => done(IO.readXml(String(r.result), name.replace(/\.[^.]+$/, ''))); r.readAsText(file); return; }
    if (/\.midi?$/i.test(name) && IO.readMidi) { r.onload = () => done(IO.readMidi(r.result, name.replace(/\.[^.]+$/, ''))); r.readAsArrayBuffer(file); return; }
    r.onload = () => done(IO.parseScore(JSON.parse(String(r.result))));
    r.readAsText(file);
  };
})();
