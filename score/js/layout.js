/* Fry Score — engraving layout.
 * Turns a score into geometry (systems, measures, columns, note heads, stems, beams, ties).
 * No DOM access here; render.js only draws what this module computes.
 */
(function () {
  'use strict';
  const FS = window.FS, EPS = FS.EPS;
  const STAFF = 40, SP = 10;
  FS.STAFF = STAFF;

  const KEYPOS = {
    treble: { s: [8, 5, 9, 6, 3, 7, 4], f: [4, 7, 3, 6, 2, 5, 1] },
    bass: { s: [6, 3, 7, 4, 1, 5, 2], f: [2, 5, 1, 4, 0, 3, 6] },
    alto: { s: [7, 4, 8, 5, 2, 6, 3], f: [3, 6, 2, 5, 1, 4, 0] }
  };
  FS.keyPos = (clef) => KEYPOS[clef === 'treble8' || clef === 'drum' ? 'treble' : clef] || KEYPOS.treble;

  const gapSp = (d) => 12 + 16 * Math.log2(1 + d / 4);
  const textW = (s) => { let w = 0; for (const ch of String(s || '')) w += ch.charCodeAt(0) > 255 ? 12.5 : 7; return w; };

  function partMetrics(S) {
    return S.parts.map((P, i) => {
      const prevBrace = i > 0 && S.parts[i - 1].brace, ev = [];
      P.m.forEach((V) => V.forEach((E) => E.forEach((e) => ev.push(e))));
      const has = (fn) => ev.some(fn);
      const hasCh = has((e) => e.ch), hasTx = has((e) => e.tx), hasOv = has((e) => e.ov != null), hasDyn = has((e) => e.dyn || e.hp), hasPed = has((e) => e.ped);
      const ly2 = has((e) => e.ly2), ly1 = has((e) => e.ly) || ly2;
      const mkb = i === 0 && S.meas.some((q, mi) => q && (q.reh || q.txt || q.volta || q.segno || q.coda || q.tocoda || q.ds || q.dc || q.fine || q.ramp || (mi > 0 && q.tempo)));
      const above = (prevBrace ? 22 : 30) + (hasCh ? 14 : 0) + (hasTx || hasOv ? 14 : 0) + (mkb ? 18 : 0);
      let lowPos = 0; const base = FS.CLEFS[P.clef].base;
      ev.forEach((e) => e.p.forEach((q) => { const ps = FS.abs(q) - base; if (ps < lowPos) lowPos = ps; }));
      const lowShift = (hasDyn || ev.some((e) => e.ly || e.ly2 || e.ped)) && P.clef !== 'drum' ? Math.max(0, -lowPos * 5 - 6) : 0;
      let c = (hasDyn ? 24 : 8) + lowShift; const dynY = 17 + lowShift;
      let ly1Y = 0, ly2Y = 0, pedY = 0;
      if (ly1) { ly1Y = c + 13; c += 16; }
      if (ly2) { ly2Y = c + 13; c += 16; }
      if (hasPed) { pedY = c + 12; c += 16; }
      const tab = P.tab ? 56 : 0, tabTop = c + 16;
      return { above, below: c + tab + 12 + (P.tab ? 8 : 0), dynY, ly1Y, ly2Y, pedY, tab, tabTop, hasCh, hasTx, hasOv };
    });
  }

  /** columns of one measure: onsets of all parts and voices aligned */
  function buildColumns(S, T, m) {
    const map = new Map(), len = T.len[m];
    S.parts.forEach((P, pi) => {
      const V = P.m[m];
      V.forEach((E, v) => {
        let t = 0;
        E.forEach((e) => {
          const k = Math.round(t * 1000);
          let c = map.get(k);
          if (!c) { c = { t, L: 0, R: 0, tw: 0 }; map.set(k, c); }
          if (e.p.length) {
            const keyA = T.key[m];
            const accs = e.p.filter((p) => p.a !== FS.keyAlter(keyA, p.s)).length;
            c.L = Math.max(c.L, accs ? 11 * Math.min(accs, 2) + 3 : 0, e.gr ? 10 * e.gr.length : 0);
            c.R = Math.max(c.R, FS.dur(e).dots * 7);
          }
          const tw = Math.max(textW(e.ly), textW(e.ly2), textW(e.ch) + (e.ch ? 4 : 0), textW(e.tx));
          c.tw = Math.max(c.tw, tw);
          t += e.d;
        });
      });
    });
    const cols = [...map.values()].sort((a, b) => a.t - b.t);
    cols.forEach((c, i) => {
      const next = i + 1 < cols.length ? cols[i + 1] : null, gap = (next ? next.t : len) - c.t;
      const base = gapSp(gap);
      c.gap = gap;
      c.dmin = next ? Math.max(base, c.R + 14 + next.L + 3, (c.tw + next.tw) / 2 + 6) : Math.max(base, c.R + 14 + 8, c.tw / 2 + 12);
    });
    return cols;
  }

  FS.layout = function (S, opts) {
    opts = opts || {};
    const W = opts.W || 1000, MARG = 44, T = FS.mtab(S), N = T.n, pm = partMetrics(S);
    const L = { W, MARG, T, pm, systems: [], meas: [], items: {}, nparts: S.parts.length };

    /* --- per measure natural widths --- */
    const info = [];
    for (let m = 0; m < N; m++) {
      const mk = S.meas[m] || {}, cols = buildColumns(S, T, m);
      let lead = 8;
      if (mk.rs) lead += 12;
      const keyChange = m > 0 && T.key[m] !== T.key[m - 1], tsChange = m > 0 && (T.ts[m][0] !== T.ts[m - 1][0] || T.ts[m][1] !== T.ts[m - 1][1]);
      const kx = keyChange ? Math.max(Math.abs(T.key[m]), Math.abs(T.key[m - 1]) && Math.abs(T.key[m])) * 9.5 + 8 : 0;
      if (kx) lead += kx; if (tsChange) lead += 28;
      const a0 = (cols[0] ? cols[0].L : 0) + 7 + 5;
      let flex = 0; cols.forEach((c) => { flex += c.dmin; });
      let fixed = lead + a0;
      const minW = 70, nat = fixed + flex;
      if (nat < minW) flex += minW - nat;
      info.push({ m, mk, cols, lead, a0, fixed, flex, keyChange, tsChange, kx });
    }

    /* --- break into systems --- */
    const hdrW = (m, first) => 46 + Math.abs(T.key[m]) * 9.5 + (T.key[m] ? 8 : 4) + (first || (m > 0 && (T.ts[m][0] !== T.ts[m - 1][0] || T.ts[m][1] !== T.ts[m - 1][1])) ? 28 : 0);
    const rows = []; let row = [], used = 0;
    const avail0 = W - 2 * MARG;
    for (let m = 0; m < N; m++) {
      const first = rows.length === 0 && row.length === 0, hw = row.length ? 0 : hdrW(m, first);
      const w = info[m].fixed + info[m].flex - (row.length ? 0 : info[m].kx + (info[m].tsChange ? 28 : 0));
      const forced = S.mps > 0 && row.length >= S.mps;
      if (row.length && (forced || used + hw + w > avail0)) { rows.push(row); row = []; used = 0; }
      row.push(m); used += (row.length === 1 ? hdrW(m, rows.length === 0) : 0) + w;
    }
    if (row.length) rows.push(row);

    /* --- place systems --- */
    const SYS_GAP = 34;
    let y = 74;
    rows.forEach((ms, si) => {
      const sys = { index: si, y, ms: [], x0: MARG, partTop: [], partBot: [], curves: [] };
      const m0 = ms[0], hw = hdrW(m0, si === 0), hx = MARG + hw;
      sys.hx = hx; sys.showTs = si === 0 || (m0 > 0 && (T.ts[m0][0] !== T.ts[m0 - 1][0] || T.ts[m0][1] !== T.ts[m0 - 1][1]));
      sys.key0 = T.key[m0];
      // stretch
      let fixed = 0, flex = 0;
      ms.forEach((m, j) => { const q = info[m]; fixed += q.fixed - (j === 0 ? q.kx + (q.tsChange ? 28 : 0) : 0); flex += q.flex; });
      const avail = W - MARG - hx;
      let k = flex > 0 ? (avail - fixed) / flex : 1;
      const last = si === rows.length - 1;
      if (last) k = Math.min(k, 1.25);
      k = Math.max(k, 0.7);
      let x = hx;
      ms.forEach((m, j) => {
        const q = info[m], lead = q.lead - (j === 0 ? q.kx + (q.tsChange ? 28 : 0) : 0);
        const mo = { m, sys: si, x, lead, cols: [], keyChange: j > 0 && q.keyChange, tsChange: j > 0 && q.tsChange, kx: q.kx };
        let a = lead + q.a0;
        q.cols.forEach((c) => { mo.cols.push({ t: c.t, x: x + a }); a += c.dmin * k; });
        mo.w = lead + q.a0 + q.flex * k;
        mo.xEnd = x + mo.w;
        x = mo.xEnd;
        sys.ms.push(mo); L.meas[m] = mo;
      });
      sys.x1 = x;
      let yy = y;
      S.parts.forEach((P, pi) => {
        yy += pm[pi].above; sys.partTop.push(yy); yy += STAFF; sys.partBot.push(yy); yy += pm[pi].below;
      });
      sys.h = yy - y; sys.yEnd = yy;
      y = yy + SYS_GAP;
      L.systems.push(sys);
    });
    L.H = y - SYS_GAP + 40;

    engrave(S, L);
    return L;
  };

  /* ---------- time <-> x ---------- */
  FS.xAt = function (L, m, t) {
    const mo = L.meas[m]; if (!mo) return 0;
    const c = mo.cols;
    if (t <= c[0].t) return c[0].x;
    for (let i = 0; i < c.length; i++) {
      const a = c[i], b = c[i + 1] || { t: L.T.len[m], x: mo.xEnd - 6 };
      if (t < b.t - 1e-9 || i === c.length - 1) return a.x + ((b.x - a.x) * (t - a.t)) / Math.max(1e-9, b.t - a.t);
    }
    return mo.xEnd;
  };
  FS.tAt = function (L, m, x) {
    const mo = L.meas[m], c = mo.cols;
    if (x <= c[0].x) return 0;
    for (let i = 0; i < c.length; i++) {
      const a = c[i], b = c[i + 1] || { t: L.T.len[m], x: mo.xEnd - 6 };
      if (x < b.x || i === c.length - 1) return a.t + ((b.t - a.t) * (x - a.x)) / Math.max(1e-9, b.x - a.x);
    }
    return L.T.len[m];
  };

  /* ---------- engraving of notes ---------- */
  function engrave(S, L) {
    const T = L.T;
    S.parts.forEach((P, pi) => {
      const base = FS.CLEFS[P.clef].base, drum = P.clef === 'drum';
      for (let m = 0; m < T.n; m++) {
        const mo = L.meas[m], sys = L.systems[mo.sys], top = sys.partTop[pi], V = P.m[m];
        const multi = V.length > 1;
        const colX = new Map(); mo.cols.forEach((c) => colX.set(Math.round(c.t * 1000), c.x));
        const yOf = (pos) => top + STAFF - pos * 5;
        const posOf = (p) => FS.abs(p) - base;
        const lists = [];
        // geometry per event
        V.forEach((E, v) => {
          const items = []; let t = 0;
          E.forEach((e, i) => {
            const it = { pi, m, v, i, e, t, x: colX.get(Math.round(t * 1000)), top, dur: FS.dur(e), sys: mo.sys, rest: !e.p.length };
            if (!it.rest) {
              const ps = e.p.map((p) => ({ p, pos: posOf(p), y: yOf(posOf(p)), dx: 0 })).sort((a, b) => a.pos - b.pos);
              it.heads = ps; it.minPos = ps[0].pos; it.maxPos = ps[ps.length - 1].pos;
            }
            items.push(it); t += e.d;
          });
          lists.push(items);
        });
        // stem direction
        lists.forEach((items, v) => items.forEach((it) => {
          if (it.rest) return;
          if (multi) it.dir = v % 2 === 0 ? 1 : -1;
          else it.dir = (it.maxPos - 4) >= (4 - it.minPos) ? -1 : 1;
        }));
        // beam groups (decide direction as a group)
        const beatL = FS.beatLen(T.ts[m]);
        lists.forEach((items, v) => {
          let grp = [];
          const flush = () => {
            if (grp.length >= 2) {
              if (!multi) { let s = 0; grp.forEach((it) => { s += (it.minPos + it.maxPos) / 2 - 4; }); const d = s >= 0 ? -1 : 1; grp.forEach((it) => { it.dir = d; }); }
              grp.forEach((it) => { it.beamed = grp; });
            }
            grp = [];
          };
          items.forEach((it) => {
            const ok = !it.rest && it.dur.base <= 8;
            if (ok && grp.length && Math.floor(grp[0].t / beatL + 1e-6) !== Math.floor(it.t / beatL + 1e-6)) flush();
            if (ok) grp.push(it); else flush();
          });
          flush();
        });
        // heads: seconds, accidentals
        const state = new Map(), order = [];
        lists.forEach((items, v) => items.forEach((it) => { if (!it.rest) order.push(it); }));
        order.sort((a, b) => a.t - b.t || a.v - b.v);
        order.forEach((it) => {
          const ps = it.heads, dir = it.dir;
          if (dir > 0) { let prevFlip = false; for (let k = 1; k < ps.length; k++) { if (ps[k].pos - ps[k - 1].pos === 1 && !prevFlip) { ps[k].dx = 11.2; prevFlip = true; } else prevFlip = false; } }
          else { let prevFlip = false; for (let k = ps.length - 2; k >= 0; k--) { if (ps[k + 1].pos - ps[k].pos === 1 && !prevFlip) { ps[k].dx = -11.2; prevFlip = true; } else prevFlip = false; } }
          it.hasFlip = ps.some((h) => h.dx);
          const tieIn = tiedInto(S, P, m, it.v, it.i);
          const cols = [];
          ps.slice().reverse().forEach((h) => {
            const key = FS.abs(h.p), cur = state.has(key) ? state.get(key) : FS.keyAlter(T.key[m], h.p.s);
            state.set(key, h.p.a);
            if (drum) return;
            if (h.p.a !== cur && !(tieIn && tieIn.some((q) => FS.samePitch(q, h.p)))) {
              h.acc = h.p.a;
              let c = 0; while (cols[c] != null && cols[c] - h.pos < 6) c++;
              cols[c] = h.pos; h.accCol = c;
            }
          });
        });
        // stems & flags geometry
        lists.forEach((items) => items.forEach((it) => {
          if (it.rest || it.dur.base >= 64) return;
          const ps = it.heads, up = it.dir > 0, nflag = it.dur.base <= 8 ? (it.dur.base === 8 ? 1 : it.dur.base === 4 ? 2 : it.dur.base === 2 ? 3 : 4) : 0;
          const extra = nflag > 2 ? (nflag - 2) * 6 : 0;
          it.stemX = it.x + (up ? 5.6 : -5.6);
          it.nflag = nflag;
          if (up) { it.y0 = ps[0].y; it.tip = Math.min(ps[ps.length - 1].y - 35 - extra, top + 20); }
          else { it.y0 = ps[ps.length - 1].y; it.tip = Math.max(ps[0].y + 35 + extra, top + 20); }
        }));
        // beams
        lists.forEach((items) => {
          const seen = new Set();
          items.forEach((it) => {
            if (!it.beamed || seen.has(it.beamed)) return;
            const g = it.beamed; seen.add(g);
            const dir = g[0].dir, a = g[0], b = g[g.length - 1];
            const dx = (b.stemX - a.stemX) || 1;
            const ya = a.tip, yb = b.tip;
            let dy = FS.clamp(yb - ya, -Math.min(14, Math.abs(dx) * 0.18), Math.min(14, Math.abs(dx) * 0.18));
            let y1 = (ya + yb) / 2 - dy / 2;
            // every stem must be at least 30 long
            let shift = 0;
            g.forEach((q) => {
              const yl = y1 + (dy * (q.stemX - a.stemX)) / dx;
              const need = dir > 0 ? q.heads[q.heads.length - 1].y - 31 : q.heads[0].y + 31;
              shift = dir > 0 ? Math.min(shift, need - yl) : Math.max(shift, need - yl);
            });
            y1 += shift;
            g.forEach((q) => { q.tip = y1 + (dy * (q.stemX - a.stemX)) / dx; });
            g.beam = { y1, slope: dy / dx, x1: a.stemX, x2: b.stemX, dir };
          });
        });
        // stash
        L.items[pi + '|' + m] = lists;
        // ties
        lists.forEach((items, v) => items.forEach((it) => { if (it.e.tie && !it.rest) addTies(S, L, P, pi, m, v, it); }));
      }
    });
  }
  function tiedInto(S, P, m, v, i) {
    let prev = null;
    const E = P.m[m][v];
    if (i > 0) prev = E[i - 1]; else if (m > 0 && P.m[m - 1][v]) { const pe = P.m[m - 1][v]; prev = pe[pe.length - 1]; }
    return prev && prev.tie && prev.p.length ? prev.p : null;
  }
  function nextEvent(S, P, m, v, i) {
    const E = P.m[m][v];
    if (i + 1 < E.length) return { m, i: i + 1 };
    if (m + 1 < P.m.length && P.m[m + 1][v]) return { m: m + 1, i: 0 };
    return null;
  }
  function addTies(S, L, P, pi, m, v, it) {
    const nx = nextEvent(S, P, m, v, it.i);
    if (!nx) return;
    const targetList = L.items[pi + '|' + nx.m];
    const tgt = targetList ? targetList[v] && targetList[v][nx.i] : null;
    const down = it.dir > 0; // stem up -> tie curves below
    // the target item may not be engraved yet (next measure): defer via closure list
    const mk = (tg) => {
      it.heads.forEach((h) => {
        const th = tg.heads && tg.heads.find((q) => FS.samePitch(q.p, h.p)); if (!th) return;
        const s1 = L.systems[it.sys], s2 = L.systems[tg.sys];
        const yy = (hh) => hh.y + (down ? 5 : -5);
        const x1 = it.x + h.dx + 7, x2 = tg.x + th.dx - 7;
        if (s1 === s2) s1.curves.push({ kind: 'tie', x1, y1: yy(h), x2, y2: yy(th), dir: down ? 1 : -1 });
        else {
          s1.curves.push({ kind: 'tie', x1, y1: yy(h), x2: s1.x1 - 4, y2: yy(h), dir: down ? 1 : -1 });
          s2.curves.push({ kind: 'tie', x1: s2.hx - 4, y1: yy(th), x2, y2: yy(th), dir: down ? 1 : -1 });
        }
      });
    };
    if (tgt) mk(tgt); else (L.pendingTies = L.pendingTies || []).push({ pi, nx, v, mk });
  }
  FS.resolveTies = function (L) { /* ties into later measures are resolved after all measures are engraved */
    (L.pendingTies || []).forEach((p) => { const ls = L.items[p.pi + '|' + p.nx.m]; const tg = ls && ls[p.v] && ls[p.v][p.nx.i]; if (tg) p.mk(tg); });
    L.pendingTies = [];
  };
  const baseLayout = FS.layout;
  FS.layout = function (S, opts) { const L = baseLayout(S, opts); FS.resolveTies(L); return L; };
})();
