/* Fry Score together (같이 고치기) over ../ffco.js: every measure of every part is one item ('c<measure>.<part>' = its voices),
   the marks of a measure are items ('x<measure>'), the settings of each part ('pt<n>') and of the score ('info') are meta. */
(function () {
  'use strict';
  const FS = window.FS;
  if (!window.FFCo || !FS) return;
  const $ = (id) => document.getElementById(id), A = FS.app;
  let down = false;
  document.addEventListener('pointerdown', () => { down = true; }, true);
  ['pointerup', 'pointercancel'].forEach((e) => document.addEventListener(e, () => { setTimeout(() => { down = false; }, 60); }, true));

  function state(S) {
    const items = {}, meta = {}, info = {};
    Object.keys(S).forEach((k) => { if (k !== 'name' && k !== 'meas' && k !== 'parts' && k !== 'libId' && k !== 'v') info[k] = S[k]; });
    meta.info = info; meta.np = S.parts.length; meta.nm = S.meas.length;
    S.meas.forEach((q, i) => { items['x' + i] = q; });
    S.parts.forEach((P, pi) => {
      const o = {}; Object.keys(P).forEach((k) => { if (k !== 'm') o[k] = P[k]; }); meta['pt' + pi] = o;
      P.m.forEach((vs, i) => { items['c' + i + '.' + pi] = vs; });
    });
    return { meta, items, order: null };
  }
  function toScore(st) {
    const np = Math.max(1, Math.min(16, st.meta.np | 0)), nm = Math.max(1, Math.min(2000, st.meta.nm | 0));
    const S = Object.assign({}, st.meta.info || {}, { v: 2, meas: [], parts: [] });
    for (let i = 0; i < nm; i++) S.meas.push(st.items['x' + i] || {});
    for (let pi = 0; pi < np; pi++) {
      const P = Object.assign({}, st.meta['pt' + pi] || {}); P.m = [];
      for (let i = 0; i < nm; i++) P.m.push(st.items['c' + i + '.' + pi] || [[]]);
      S.parts.push(P);
    }
    return S;
  }
  FFCo.init({
    app: 'score', noun: '악보', btnClass: 'tbtn', note: '다른 사람이 고치면 되돌리기 기록이 새로 시작돼요',
    busy: () => down,
    read: () => { try { return state(FS.fix(JSON.parse(JSON.stringify(A.score)))); } catch (e) { return null; } },
    name: () => (A.score && A.score.name) || '이름 없는 악보',
    write: (c) => {
      const cur = state(FS.fix(JSON.parse(JSON.stringify(A.score))));
      Object.keys(c.meta).forEach((k) => { cur.meta[k] = c.meta[k]; });
      Object.keys(c.set).forEach((k) => { cur.items[k] = c.set[k]; });
      c.del.forEach((k) => { delete cur.items[k]; });
      let S; try { S = FS.fix(toScore(cur)); } catch (e) { return; }
      S.name = A.score.name; if (A.score.libId) S.libId = A.score.libId;
      const s = A.sel;
      if (s) {
        const a = Math.min(s.m, s.m2 != null ? s.m2 : s.m), b = Math.max(s.m, s.m2 != null ? s.m2 : s.m); let hit = !S.parts[s.pi];
        for (let m = a; m <= b && !hit; m++) { const k = 'c' + m + '.' + s.pi; if (m >= S.meas.length || k in c.set || c.del.indexOf(k) >= 0) hit = true; }
        if (hit) A.sel = null;
      }
      A.score = S; A.hist = [JSON.stringify(S)]; A.hi = 0; FS.io.autosave(S); FS.ui.draw(); FS.ui.panel();
    },
    copy: (st, nm) => {
      let S; try { S = FS.fix(toScore(st)); } catch (e) { return false; }
      S.name = String(nm).slice(0, 80); A.coLoad = true;
      try { FS.ui.ff.adopt(nm); FS.ui.reset(S); } finally { A.coLoad = false; }
      return true;
    },
    before: () => { if (A.score) FS.io.autosave(A.score); },
    mount: (b) => { const f = $('fileBtn'); f.parentNode.insertBefore(b, f); }
  });
})();
