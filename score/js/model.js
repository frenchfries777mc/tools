/* Fry Score — data model and editing operations.
 *
 * score = {
 *   v: 2, name, composer, tempo, ts:[n,d], key (fifths -7..7),
 *   meas: [ { ts?, key?, tempo?, rs?, re?, volta?, ... } ]   // marks shared by all parts, one entry per measure
 *   parts: [ { name, clef, inst, vol, pan, mute, m: [ voices ] } ]   // m[i] = measure i = array of voices
 * }
 * voice  = array of events that exactly fills the measure
 * event  = { d, p:[{s,a,o}], tie?, tp?, ...decorations }   (p empty = rest; d in 1/64 units)
 */
(function () {
  'use strict';
  const FS = window.FS;
  const EPS = FS.EPS;

  FS.STEPS = 'CDEFGAB';
  FS.SEMI = [0, 2, 4, 5, 7, 9, 11];
  FS.CLEFS = {
    treble: { name: '높은음자리표', base: 30, shift: 0 },
    treble8: { name: '높은음자리표 (한 옥타브 아래)', base: 30, shift: -12 },
    bass: { name: '낮은음자리표', base: 18, shift: 0 },
    alto: { name: '가온음자리표 (알토)', base: 24, shift: 0 },
    drum: { name: '타악기', base: 30, shift: 0 }
  };
  FS.INSTS = [
    ['piano', '피아노', 0], ['flute', '플루트', 73], ['strings', '현악기', 48], ['organ', '오르간', 19], ['guitar', '기타(뜯기)', 24],
    ['box', '오르골', 10], ['chip', '8비트', 80], ['bass', '베이스', 33], ['brass', '금관악기', 56], ['marimba', '마림바', 12],
    ['harp', '하프', 46], ['choir', '합창', 52]
  ];
  FS.KEYS = [
    ['C 장조 / a 단조', 0], ['G 장조 (♯1)', 1], ['D 장조 (♯2)', 2], ['A 장조 (♯3)', 3], ['E 장조 (♯4)', 4], ['B 장조 (♯5)', 5], ['F♯ 장조 (♯6)', 6],
    ['F 장조 (♭1)', -1], ['B♭ 장조 (♭2)', -2], ['E♭ 장조 (♭3)', -3], ['A♭ 장조 (♭4)', -4], ['D♭ 장조 (♭5)', -5], ['G♭ 장조 (♭6)', -6]
  ];
  FS.TIMES = [[4, 4], [3, 4], [2, 4], [2, 2], [6, 8], [9, 8], [12, 8], [5, 4], [7, 8], [3, 8], [3, 2]];

  /* ---------- pitch ---------- */
  const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6], FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3];
  const SPELL_SHARP = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0]];
  const SPELL_FLAT = [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [4, -1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];
  FS.abs = (p) => p.o * 7 + p.s;
  FS.fromAbs = (a, al) => ({ s: ((a % 7) + 7) % 7, a: al || 0, o: Math.floor(a / 7) });
  FS.midi = (p) => FS.SEMI[p.s] + p.a + 12 * (p.o + 1);
  FS.pname = (p) => FS.STEPS[p.s] + (p.a > 0 ? '♯'.repeat(p.a) : p.a < 0 ? '♭'.repeat(-p.a) : '') + p.o;
  FS.keyAlter = (key, s) => (key > 0 ? (SHARP_ORDER.indexOf(s) < key ? 1 : 0) : key < 0 ? (FLAT_ORDER.indexOf(s) < -key ? -1 : 0) : 0);
  FS.keyOrder = (key) => (key > 0 ? SHARP_ORDER.slice(0, key) : FLAT_ORDER.slice(0, -key));
  FS.fromMidi = function (m, key) {
    const sp = (key >= 0 ? SPELL_SHARP : SPELL_FLAT)[((m % 12) + 12) % 12];
    return { s: sp[0], a: sp[1], o: Math.floor(m / 12) - 1 };
  };
  FS.samePitch = (a, b) => a.s === b.s && a.a === b.a && a.o === b.o;
  FS.sortPitches = (ps) => ps.sort((a, b) => FS.abs(a) - FS.abs(b) || a.a - b.a);

  /* ---------- events ---------- */
  FS.rest = (d) => ({ d, p: [] });
  FS.TABS = { guitar: [64, 59, 55, 50, 45, 40], bass: [43, 38, 33, 28], ukulele: [69, 64, 60, 67] };
  FS.note = (d, p) => ({ d, p: [p] });
  FS.isRest = (e) => !e.p.length;
  FS.tpBase = (a) => { let b = 1; while (b * 2 < a) b *= 2; return b; };
  const DOT = { 48: [32, 1], 24: [16, 1], 12: [8, 1], 6: [4, 1], 3: [2, 1], 96: [64, 1], 56: [32, 2], 28: [16, 2], 14: [8, 2] };
  const PLAIN = [64, 32, 16, 8, 4, 2, 1];
  /** glyph duration of an event: { base: 64|32|…|1, dots } (tuplet scaled back to written value) */
  FS.dur = function (e) {
    let d = e.tp ? (e.d * e.tp) / FS.tpBase(e.tp) : e.d;
    d = Math.round(d * 1000) / 1000;
    if (PLAIN.indexOf(d) >= 0) return { base: d, dots: 0 };
    if (DOT[d]) return { base: DOT[d][0], dots: DOT[d][1] };
    let b = 1;
    for (const v of PLAIN) if (v <= d + EPS) { b = v; break; }
    return { base: b, dots: 0 };
  };
  FS.starts = (E) => { const r = []; let t = 0; for (const e of E) { r.push(t); t += e.d; } return r; };
  FS.sumD = (E) => E.reduce((a, e) => a + e.d, 0);
  /** index of the event starting at (or, with cover=true, covering) time t */
  FS.indexAt = function (E, t, cover) {
    let s = 0;
    for (let i = 0; i < E.length; i++) {
      if (Math.abs(s - t) < 1e-4) return i;
      if (cover && s < t && t < s + E[i].d - 1e-4) return i;
      s += E[i].d;
    }
    return -1;
  };
  const VALID = [64, 48, 32, 24, 16, 12, 8, 6, 4, 3, 2, 1];
  /** snap an event length to an exact note value (tuplets keep their ratio) */
  FS.normD = function (e) {
    if (e.tp) {
      const tb = FS.tpBase(e.tp), raw = (e.d * e.tp) / tb;
      let best = VALID[0]; VALID.forEach((v) => { if (Math.abs(v - raw) < Math.abs(best - raw)) best = v; });
      e.d = (best * tb) / e.tp;
    } else { const r = Math.round(e.d); if (Math.abs(e.d - r) < 0.02 && r > 0) e.d = r; }
    return e;
  };
  FS.decompose = function (L) {
    const out = []; let r = L;
    for (const v of [64, 48, 32, 24, 16, 12, 8, 6, 4, 3, 2, 1]) while (r >= v - EPS) { out.push(v); r -= v; }
    if (r > 2e-3) out.push(r);
    return out;
  };
  FS.restsFor = function (t0, L, len) {
    if (t0 < EPS && Math.abs(L - len) < 1e-4) return [FS.rest(len)];
    const out = []; let t = t0, r = L;
    while (r > 1e-4) {
      let pick = 0;
      for (const v of PLAIN) if (v <= r + EPS && Math.abs(t / v - Math.round(t / v)) < 1e-6) { pick = v; break; }
      if (!pick) { out.push(FS.rest(r)); break; }
      out.push(FS.rest(pick)); t += pick; r -= pick;
    }
    return out;
  };

  /* ---------- score construction ---------- */
  FS.newPart = (name, clef, inst, extra) => Object.assign({ name: name || '멜로디', clef: clef || 'treble', inst: inst || 'piano', vol: 80, pan: 0, mute: false, m: [] }, extra || {});
  FS.newScore = function (kind) {
    const S = { v: 2, name: '이름 없는 악보', composer: '', tempo: 100, ts: [4, 4], key: 0, meas: [{}, {}, {}, {}], parts: [] };
    if (kind === 'piano') S.parts = [FS.newPart('오른손', 'treble', 'piano', { brace: true }), FS.newPart('왼손', 'bass', 'piano')];
    else if (kind === 'quartet') S.parts = [FS.newPart('바이올린 1', 'treble', 'strings'), FS.newPart('바이올린 2', 'treble', 'strings'), FS.newPart('비올라', 'alto', 'strings'), FS.newPart('첼로', 'bass', 'strings')];
    else if (kind === 'band') S.parts = [FS.newPart('멜로디', 'treble', 'piano'), FS.newPart('베이스', 'bass', 'bass'), FS.newPart('드럼', 'drum', 'piano')];
    else S.parts = [FS.newPart('멜로디', 'treble', 'piano')];
    FS.growTo(S, S.meas.length);
    return S;
  };

  /* ---------- measure table ---------- */
  FS.mtab = function (S) {
    const n = S.meas.length, ts = [], key = [], len = [], start = [];
    let t = S.ts, k = S.key, pos = 0;
    for (let i = 0; i < n; i++) {
      const mk = S.meas[i] || {};
      if (i > 0 && mk.ts) t = mk.ts;
      if (i > 0 && mk.key != null) k = mk.key;
      let l = (t[0] * 64) / t[1];
      if (i === 0 && S.pick > 0 && S.pick < l) l = S.pick;
      ts.push(t); key.push(k); len.push(l); start.push(pos); pos += l;
    }
    return { n, ts, key, len, start, total: pos };
  };
  FS.mlen = (S, m) => FS.mtab(S).len[m];
  FS.beatLen = function (ts) { // length of one beat group for beaming/spacing
    if (ts[1] === 8 && ts[0] % 3 === 0 && ts[0] > 3) return 24;
    if (ts[1] === 8) return ts[0] === 3 ? 24 : 16;
    if (ts[1] === 2) return 32;
    if (ts[1] === 1) return 64;
    return 64 / ts[1];
  };
  FS.growTo = function (S, n) {
    while (S.meas.length < n) S.meas.push({});
    const T = FS.mtab(S);
    S.parts.forEach((P) => { while (P.m.length < n) P.m.push([[FS.rest(T.len[P.m.length])]]); });
  };

  /* ---------- editing core: overwrite events in a voice ---------- */
  function headPieces(e, L, s, len) {
    if (e.p.length === 0) return FS.restsFor(s, L, len);
    const ds = FS.decompose(L);
    return ds.map((d, k) => {
      const piece = k === 0 ? Object.assign({}, e, { p: FS.clone(e.p) }) : { d, p: FS.clone(e.p) };
      piece.d = d; if (e.tp) piece.tp = e.tp;
      piece.tie = k < ds.length - 1; if (!piece.tie) delete piece.tie;
      return piece;
    });
  }
  function ensureVoice(P, S, m, v) {
    const len = FS.mlen(S, m), V = P.m[m];
    while (V.length <= v) V.push([FS.rest(len)]);
    return V[v];
  }
  function put(S, pi, m, v, t, ev) {
    const P = S.parts[pi], len = FS.mlen(S, m), E = ensureVoice(P, S, m, v), t2 = t + ev.d, out = [];
    let pos = 0, inserted = false;
    for (const e of E) {
      const s = pos, en = pos + e.d; pos = en;
      if (en <= t + EPS) { out.push(e); continue; }
      if (s >= t2 - EPS) { if (!inserted) { out.push(ev); inserted = true; } out.push(e); continue; }
      if (s < t - EPS) headPieces(e, t - s, s, len).forEach((x) => out.push(x));
      if (!inserted) { out.push(ev); inserted = true; }
      if (en > t2 + EPS) FS.restsFor(t2, en - t2, len).forEach((x) => out.push(x));
    }
    if (!inserted) out.push(ev);
    E.length = 0; out.forEach((x) => E.push(x));
    // a previous note must not stay tied into something that is no longer the same pitch
    const prev = prevEvent(S, pi, m, v, t);
    if (prev && prev.tie && !(ev.p.length && prev.p.length && prev.p.every((p) => ev.p.some((q) => FS.samePitch(p, q))))) delete prev.tie;
    tidy(S, pi, m, v);
    return FS.indexAt(E, t);
  }
  function prevEvent(S, pi, m, v, t) {
    const P = S.parts[pi];
    let E = P.m[m][v];
    if (E) { const i = FS.indexAt(E, t); if (i > 0) return E[i - 1]; }
    if (t < EPS && m > 0) { E = P.m[m - 1][v]; if (E && E.length) return E[E.length - 1]; }
    return null;
  }
  /** merge runs of bare rests and drop empty upper voices */
  function tidy(S, pi, m, v) {
    const P = S.parts[pi], E = P.m[m][v], len = FS.mlen(S, m), out = [];
    let run = null, pos = 0;
    const flush = () => { if (run) { FS.restsFor(run.s, run.L, len).forEach((x) => out.push(x)); run = null; } };
    for (const e of E) {
      const bare = !e.p.length && !e.tp && Object.keys(e).length === 2;
      if (bare) { if (!run) run = { s: pos, L: 0 }; run.L += e.d; } else { flush(); out.push(e); }
      pos += e.d;
    }
    flush();
    E.length = 0; out.forEach((x) => E.push(x));
    pruneVoices(P.m[m]);
  }
  function pruneVoices(V) {
    while (V.length > 1 && V[V.length - 1].every((e) => !e.p.length && Object.keys(e).length <= 2)) V.pop();
  }
  FS.tidy = tidy;

  /** place an event so that it starts at time t of measure m; crosses barlines with ties. */
  FS.place = function (S, pi, m, v, t, ev) {
    if (m >= S.meas.length) FS.growTo(S, m + 1);
    const len = FS.mlen(S, m), rem = len - t;
    ev = FS.normD(Object.assign({}, ev, { p: FS.clone(ev.p || []) }));
    if (ev.d <= rem + EPS) {
      put(S, pi, m, v, t, ev);
      const nt = t + ev.d;
      return { at: { m, i: FS.indexAt(S.parts[pi].m[m][v], t) }, next: nt >= len - EPS ? { m: m + 1, t: 0 } : { m, t: nt } };
    }
    if (ev.tp) { ev.d = rem; return FS.place(S, pi, m, v, t, ev); }
    if (!ev.p.length) {
      let tt0 = t; FS.restsFor(t, rem, len).forEach((r) => { put(S, pi, m, v, tt0, r); tt0 += r.d; });
      return FS.place(S, pi, m + 1, v, 0, Object.assign({}, FS.rest(ev.d - rem)));
    }
    const ds = FS.decompose(rem); let tt = t, first = null;
    ds.forEach((d, k) => {
      const piece = k === 0 ? Object.assign({}, ev) : { p: FS.clone(ev.p) };
      piece.d = d; piece.tie = true;
      put(S, pi, m, v, tt, piece);
      if (k === 0) first = { m, i: FS.indexAt(S.parts[pi].m[m][v], tt) };
      tt += d;
    });
    const tail = { d: ev.d - rem, p: FS.clone(ev.p) };
    if (ev.tie) tail.tie = true;
    const r = FS.place(S, pi, m + 1, v, 0, tail);
    return { at: first, next: r.next };
  };
  /** replace an event by a rest of the same length (delete) */
  FS.clearEvent = function (S, pi, m, v, i) {
    const E = S.parts[pi].m[m][v]; if (!E || !E[i]) return;
    const t = FS.starts(E)[i], e = E[i], r = FS.rest(e.d); if (e.tp) r.tp = e.tp;
    if (e.ch) r.ch = e.ch;
    E[i] = r;
    const prev = prevEvent(S, pi, m, v, t); if (prev && prev.tie) delete prev.tie;
    tidy(S, pi, m, v);
  };
  FS.startOf = (S, pi, m, v, i) => FS.starts(S.parts[pi].m[m][v])[i];

  /* ---------- measures ---------- */
  FS.insertMeasure = function (S, at) {
    S.meas.splice(at, 0, {});
    const T = FS.mtab(S);
    S.parts.forEach((P) => P.m.splice(at, 0, [[FS.rest(T.len[at])]]));
    return at;
  };
  FS.deleteMeasure = function (S, at) {
    if (S.meas.length <= 1) return false;
    const mk = S.meas[at] || {}, next = S.meas[at + 1];
    if (next) ['ts', 'key', 'tempo'].forEach((k) => { if (mk[k] != null && next[k] == null && at > 0) next[k] = mk[k]; });
    S.meas.splice(at, 1);
    S.parts.forEach((P) => {
      P.m.splice(at, 1);
      if (at > 0) P.m[at - 1].forEach((E) => { if (E.length) delete E[E.length - 1].tie; });
    });
    return true;
  };
  /** re-pour all events from measure `from` on after measure lengths changed */
  FS.reflow = function (S, from) {
    const flat = S.parts.map((P) => {
      const vs = [];
      for (let m = from; m < P.m.length; m++) P.m[m].forEach((E, v) => { (vs[v] = vs[v] || []).push(...E); });
      return vs;
    });
    const T = FS.mtab(S);
    S.parts.forEach((P, pi) => {
      for (let m = from; m < P.m.length; m++) P.m[m] = [[FS.rest(T.len[m])]];
    });
    S.parts.forEach((P, pi) => flat[pi].forEach((list, v) => {
      let pos = { m: from, t: 0 };
      list.forEach((e) => {
        if (!e.p.length && Object.keys(e).length === 2) { pos = advance(S, pos, e.d); return; }
        const r = FS.place(S, pi, pos.m, v, pos.t, e); pos = r.next;
      });
    }));
    S.parts.forEach((P, pi) => P.m.forEach((V, m) => V.forEach((E, v) => tidy(S, pi, m, v))));
  };
  function advance(S, pos, d) {
    let { m, t } = pos, r = d;
    for (;;) {
      if (m >= S.meas.length) FS.growTo(S, m + 1);
      const len = FS.mlen(S, m);
      if (t + r < len - EPS) return { m, t: t + r };
      r -= len - t; m++; t = 0;
      if (r < EPS) return { m, t: 0 };
    }
  }
  FS.advance = advance;

  /* ---------- validation of loaded data ---------- */
  const NUM = (x, a, b, d) => (isFinite(+x) ? FS.clamp(+x, a, b) : d);
  FS.fix = function (o) {
    if (!o || typeof o !== 'object' || !Array.isArray(o.parts) || !o.parts.length) throw new Error('bad score');
    const S = {
      v: 2, name: String(o.name || '이름 없는 악보').slice(0, 80), composer: String(o.composer || '').slice(0, 60),
      tempo: Math.round(NUM(o.tempo, 20, 300, 100)), key: Math.round(NUM(o.key, -7, 7, 0)),
      ts: Array.isArray(o.ts) && o.ts[0] > 0 && o.ts[0] <= 32 && [1, 2, 4, 8, 16].indexOf(+o.ts[1]) >= 0 ? [+o.ts[0], +o.ts[1]] : [4, 4]
    };
    ['sub', 'lyr', 'cpy'].forEach((k) => { if (o[k]) S[k] = String(o[k]).slice(0, 80); });
    ['mps', 'pick'].forEach((k) => { if (+o[k] > 0) S[k] = +o[k]; });
    ['pl', 'nn', 'nc', 'cd', 'tsym', 'mn'].forEach((k) => { if (o[k]) S[k] = o[k]; });
    S.meas = (Array.isArray(o.meas) ? o.meas : []).slice(0, 2000).map((q) => FS.fixMark(q));
    S.parts = o.parts.slice(0, 16).map((p) => {
      const P = FS.newPart(String(p.name || '파트').slice(0, 30), FS.CLEFS[p.clef] ? p.clef : 'treble', FS.INSTS.some((x) => x[0] === p.inst) ? p.inst : 'piano');
      P.vol = NUM(p.vol, 0, 100, 80); P.pan = NUM(p.pan, -1, 1, 0); P.mute = !!p.mute;
      ['brace', 'solo'].forEach((k) => { if (p[k]) P[k] = true; });
      if (p.trans) P.trans = Math.round(NUM(p.trans, -24, 24, 0)) || undefined;
      if (!P.trans) delete P.trans;
      if (p.tab && FS.TABS[p.tab]) P.tab = p.tab;
      P.m = Array.isArray(p.m) ? p.m : [];
      return P;
    });
    const n = Math.max(1, S.meas.length, ...S.parts.map((P) => P.m.length));
    while (S.meas.length < n) S.meas.push({});
    const T = FS.mtab(S);
    S.parts.forEach((P) => {
      P.m = P.m.slice(0, n);
      for (let m = 0; m < n; m++) {
        let V = P.m[m]; if (!Array.isArray(V) || !V.length) V = [[]];
        V = V.slice(0, 4).map((E) => fixVoice(Array.isArray(E) ? E : [], T.len[m]));
        P.m[m] = V; pruneVoices(V);
      }
    });
    return S;
  };
  const MARK_BOOL = ['rs', 're', 'reh', 'segno', 'coda', 'tocoda', 'ds', 'dc', 'fine'];
  FS.fixMark = function (q) {
    const r = {}; if (!q || typeof q !== 'object') return r;
    if (Array.isArray(q.ts) && q.ts[0] > 0 && q.ts[0] <= 32 && [1, 2, 4, 8, 16].indexOf(+q.ts[1]) >= 0) r.ts = [+q.ts[0], +q.ts[1]];
    if (q.key != null && isFinite(+q.key)) r.key = Math.round(FS.clamp(+q.key, -7, 7));
    if (+q.tempo >= 20 && +q.tempo <= 300) r.tempo = Math.round(+q.tempo);
    MARK_BOOL.forEach((k) => { if (q[k]) r[k] = true; });
    if (q.volta === 1 || q.volta === 2) r.volta = q.volta;
    if (q.txt) r.txt = String(q.txt).slice(0, 30);
    if (q.bar === 'dbl' || q.bar === 'fin') r.bar = q.bar;
    if (q.ramp && +q.ramp.n > 0 && +q.ramp.to >= 20 && +q.ramp.to <= 300) r.ramp = { n: Math.min(16, Math.round(+q.ramp.n)), to: Math.round(+q.ramp.to) };
    return r;
  };
  const EV_STR = ['ch', 'ly', 'ly2', 'tx', 'fg'];
  const EV_ART = ['stac', 'acc', 'ten', 'marc', 'ferm', 'tr', 'mord', 'turn', 'trem', 'arp', 'dbow', 'ubow'];
  const DYNS = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sfz'];
  function fixVoice(E, len) {
    const out = [];
    for (const e of E) {
      if (!e || typeof e !== 'object') continue;
      const d = +e.d; if (!(d > 0) || d > 512) continue;
      const ev = { d, p: [] };
      if (+e.tp >= 3 && +e.tp <= 9) ev.tp = +e.tp;
      FS.normD(ev);
      (Array.isArray(e.p) ? e.p : []).forEach((q) => {
        if (q && q.s >= 0 && q.s <= 6 && isFinite(q.o)) ev.p.push({ s: q.s | 0, a: FS.clamp(q.a | 0, -2, 2), o: FS.clamp(q.o | 0, 0, 9) });
      });
      if (e.tie && ev.p.length) ev.tie = true;
      EV_STR.forEach((k) => { if (e[k]) ev[k] = String(e[k]).slice(0, 30); });
      if (EV_ART.indexOf(e.art) >= 0) ev.art = e.art;
      if (DYNS.indexOf(e.dyn) >= 0) ev.dyn = e.dyn;
      if (e.hp === 'cr' || e.hp === 'de' || e.hp === 'end') ev.hp = e.hp;
      if (e.slur) ev.slur = FS.clamp(Math.round(+e.slur === 1 || e.slur === true ? 1 : +e.slur) || 1, 1, 4);
      if (e.hd === 'x' || e.hd === 'dia' || e.hd === 'tri') ev.hd = e.hd;
      if (e.ped === 'd' || e.ped === 'u') ev.ped = e.ped;
      if (e.ov === 1 || e.ov === -1 || e.ov === 0) ev.ov = e.ov;
      if (Array.isArray(e.gr)) ev.gr = e.gr.filter((q) => q && q.s >= 0 && q.s <= 6).slice(0, 4).map((q) => ({ s: q.s | 0, a: FS.clamp(q.a | 0, -2, 2), o: FS.clamp(q.o | 0, 0, 9) }));
      if (ev.gr && !ev.gr.length) delete ev.gr;
      out.push(ev);
    }
    // fit to the measure
    let sum = 0; const fit = [];
    for (const e of out) {
      if (sum + e.d > len + 1e-4) { const r = len - sum; if (r > 1e-4) fit.push(...(e.p.length ? headPieces(e, r, sum, len) : FS.restsFor(sum, r, len))); sum = len; break; }
      fit.push(e); sum += e.d;
    }
    if (sum < len - 1e-4) fit.push(...FS.restsFor(sum, len - sum, len));
    return fit;
  }
})();
