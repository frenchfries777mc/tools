/* Fry Score — Web Audio synthesis and playback scheduling. */
(function () {
  'use strict';
  const FS = window.FS, EPS = FS.EPS;
  const A = (FS.audio = { ctx: null, master: null, play: null });

  const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const drumKind = (m) => (m <= 66 ? 'kick' : m <= 71 ? 'ltom' : m <= 73 ? 'snare' : m <= 76 ? 'htom' : m <= 79 ? 'hat' : 'crash');
  FS.drumKind = drumKind;

  function makeMaster(c) {
    const comp = c.createDynamicsCompressor(), g = c.createGain();
    g.gain.value = 0.7; g.connect(comp); comp.connect(c.destination);
    return g;
  }
  A.context = function () {
    if (!A.ctx) { const AC = window.AudioContext || window.webkitAudioContext; A.ctx = new AC(); A.master = makeMaster(A.ctx); }
    if (A.ctx.state === 'suspended') A.ctx.resume();
    return A.ctx;
  };

  function env(g, t0, a, peak, dec, dur, rel) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * dec), t0 + Math.max(a + 0.02, dur));
    g.gain.linearRampToValueAtTime(0, t0 + dur + rel);
  }

  /** one synthesised note on an arbitrary (possibly offline) context */
  FS.synth = function (c, master, inst, fr, t0, dur, vol, pan) {
    const g = c.createGain(), end = t0 + dur + 0.4;
    let out = master;
    if (pan && c.createStereoPanner) { const sp = c.createStereoPanner(); sp.pan.value = FS.clamp(pan, -1, 1); sp.connect(master); out = sp; }
    g.connect(out);
    const osc = (type, mul, gain, detune) => {
      const o = c.createOscillator(), og = c.createGain();
      o.type = type; o.frequency.value = fr * mul; if (detune) o.detune.value = detune;
      og.gain.value = gain; o.connect(og); og.connect(g); o.start(t0); o.stop(end);
    };
    const v = vol * 0.32;
    const decay = (peak, d, rel) => { g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + 0.005); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * 0.03), t0 + d); g.gain.linearRampToValueAtTime(0, t0 + Math.max(d, 0.1) + rel); };
    switch (inst) {
      case 'piano': { osc('triangle', 1, 1); osc('sine', 2, 0.4); osc('sine', 3, 0.15); osc('sine', 0.5, 0.15); const d = Math.min(dur + 0.3, Math.max(0.8, 2.4 - fr / 700)); decay(v, d, Math.max(0, dur - d) + 0.25); break; }
      case 'flute': osc('sine', 1, 1); osc('sine', 2, 0.12); env(g, t0, 0.07, v * 1.1, 0.85, dur, 0.12); break;
      case 'strings': { const f1 = c.createBiquadFilter(); f1.type = 'lowpass'; f1.frequency.value = 2200; f1.connect(g); [-7, 7].forEach((dt) => { const o = c.createOscillator(), og = c.createGain(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = dt; og.gain.value = 0.5; o.connect(og); og.connect(f1); o.start(t0); o.stop(end); }); env(g, t0, 0.14, v * 0.7, 0.9, dur, 0.25); break; }
      case 'organ': osc('sine', 1, 1); osc('sine', 2, 0.6); osc('sine', 3, 0.35); osc('sine', 4, 0.2); env(g, t0, 0.02, v * 0.8, 0.95, dur, 0.06); break;
      case 'guitar': { const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.setValueAtTime(3500, t0); f2.frequency.exponentialRampToValueAtTime(700, t0 + 0.5); f2.connect(g); const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = fr; o.connect(f2); o.start(t0); o.stop(end); const d2 = Math.min(dur + 0.2, 1.2); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v * 1.2, t0 + 0.004); g.gain.exponentialRampToValueAtTime(v * 0.02, t0 + d2); g.gain.linearRampToValueAtTime(0, t0 + d2 + 0.1); break; }
      case 'box': osc('sine', 1, 1); osc('sine', 3.01, 0.35); osc('sine', 5.4, 0.1); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v * 0.9, t0 + 0.003); g.gain.exponentialRampToValueAtTime(v * 0.01, t0 + Math.min(1.4, dur + 0.6)); g.gain.linearRampToValueAtTime(0, t0 + Math.min(1.4, dur + 0.6) + 0.1); break;
      case 'brass': { const fb = c.createBiquadFilter(); fb.type = 'lowpass'; fb.frequency.setValueAtTime(500, t0); fb.frequency.linearRampToValueAtTime(2600, t0 + 0.09); fb.connect(g); [-4, 4].forEach((dt) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = dt; o.connect(fb); o.start(t0); o.stop(end); }); env(g, t0, 0.05, v * 0.8, 0.9, dur, 0.1); break; }
      case 'marimba': osc('sine', 1, 1); osc('sine', 4, 0.25); osc('sine', 9.2, 0.04); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v * 1.2, t0 + 0.003); g.gain.exponentialRampToValueAtTime(v * 0.01, t0 + 0.35); g.gain.linearRampToValueAtTime(0, t0 + 0.45); break;
      case 'harp': { osc('triangle', 1, 1); osc('sine', 2, 0.3); osc('sine', 3, 0.12); const dh = Math.min(2.2, Math.max(0.8, 2.6 - fr / 600)); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v * 1.1, t0 + 0.004); g.gain.exponentialRampToValueAtTime(v * 0.02, t0 + dh); g.gain.linearRampToValueAtTime(0, t0 + dh + 0.15); break; }
      case 'choir': { [[700, 1], [1200, 0.6], [2600, 0.25]].forEach((fm) => { const bf = c.createBiquadFilter(), bg = c.createGain(); bf.type = 'bandpass'; bf.frequency.value = fm[0]; bf.Q.value = 4; bg.gain.value = fm[1]; bf.connect(bg); bg.connect(g); [-9, 0, 9].forEach((dt) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = dt; o.connect(bf); o.start(t0); o.stop(end); }); }); env(g, t0, 0.18, v * 1.6, 0.9, dur, 0.3); break; }
      case 'bass': osc('sine', 1, 1); osc('triangle', 2, 0.3); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v * 1.3, t0 + 0.01); g.gain.exponentialRampToValueAtTime(v * 0.2, t0 + dur); g.gain.linearRampToValueAtTime(0, t0 + dur + 0.12); break;
      case 'drums': drum(c, g, out, fr, t0, vol); break;
      default: osc('square', 1, 0.6); env(g, t0, 0.005, v * 0.5, 0.7, dur, 0.03);
    }
  };
  function drum(c, g, out, fr, t0, vol) {
    const dm = Math.round(69 + 12 * Math.log2(fr / 440)), kind = drumKind(dm), gv = vol * 0.5;
    if (kind === 'kick' || kind === 'ltom' || kind === 'htom') {
      const od = c.createOscillator(), f0 = kind === 'kick' ? 140 : kind === 'ltom' ? 120 : 190, f1 = kind === 'kick' ? 42 : kind === 'ltom' ? 70 : 110;
      od.frequency.setValueAtTime(f0, t0); od.frequency.exponentialRampToValueAtTime(f1, t0 + 0.14);
      g.gain.setValueAtTime(gv * 1.7, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + (kind === 'kick' ? 0.3 : 0.38));
      od.connect(g); od.start(t0); od.stop(t0 + 0.45); return;
    }
    const ns = c.createBufferSource(), hf = c.createBiquadFilter(), len = kind === 'crash' ? 1 : kind === 'snare' ? 0.2 : 0.06;
    if (!c._nb) { c._nb = c.createBuffer(1, Math.ceil(c.sampleRate * 1.2), c.sampleRate); const dd = c._nb.getChannelData(0); for (let q = 0; q < dd.length; q++) dd[q] = Math.random() * 2 - 1; }
    ns.buffer = c._nb; hf.type = 'highpass'; hf.frequency.value = kind === 'snare' ? 1400 : kind === 'crash' ? 4500 : 7000;
    ns.connect(hf); hf.connect(g); g.gain.setValueAtTime(gv * (kind === 'hat' ? 0.7 : 1), t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + len);
    ns.start(t0); ns.stop(t0 + len + 0.05);
    if (kind === 'snare') { const ot = c.createOscillator(), og = c.createGain(); ot.type = 'triangle'; ot.frequency.value = 190; og.gain.setValueAtTime(gv * 0.8, t0); og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12); ot.connect(og); og.connect(out); ot.start(t0); ot.stop(t0 + 0.15); }
  }
  const instOf = (P) => (P.clef === 'drum' ? 'drums' : P.inst);

  /** quick preview of a single pitch (when entering notes) */
  A.preview = function (S, pi, p) {
    try {
      const c = A.context(), P = S.parts[pi];
      FS.synth(c, A.master, instOf(P), freq(FS.midi(p) + FS.CLEFS[P.clef].shift + (P.trans || 0)), c.currentTime + 0.01, 0.35, 0.8 * P.vol / 100, P.pan || 0);
    } catch (e) { /* audio not available */ }
  };

  /* ---------- score -> note list ---------- */
  /** order in which measures are played (repeats, voltas, D.S./D.C., Fine, To Coda) */
  FS.playOrder = function (S) {
    const N = FS.mtab(S).n, mk = (i) => S.meas[i] || {};
    let segno = -1, coda = -1;
    for (let i = 0; i < N; i++) { if (mk(i).segno && segno < 0) segno = i; if (mk(i).coda) coda = i; }
    const order = []; let m = 0, pass = 1, rep = 0, jumped = false, guard = 0;
    while (m < N && guard++ < N * 10 + 50) {
      const k = mk(m);
      if (k.rs && rep !== m && !(pass === 2 && !jumped)) { rep = m; pass = 1; }
      if (k.volta === 1 && (pass >= 2 || jumped)) { m++; continue; }
      order.push(m);
      if (jumped && k.fine) break;
      if (jumped && k.tocoda && coda > m) { m = coda; continue; }
      if (k.re && !jumped) {
        if (pass === 1) { pass = 2; m = rep; continue; }
        pass = 1; rep = m + 1;
      }
      if (!jumped && (k.ds || k.dc)) { jumped = true; m = k.ds && segno >= 0 ? segno : 0; pass = 1; continue; }
      m++;
    }
    return order;
  };
  /** playback plan: expanded measure list with tempo (incl. ramps) and cumulative seconds */
  FS.secTable = function (S, speed) {
    const T = FS.mtab(S), order = FS.playOrder(S), sp = speed || 1;
    // tempo per score measure
    const tempo = []; let tp = S.tempo, ramp = null;
    for (let m = 0; m < T.n; m++) {
      const mk = S.meas[m] || {};
      if (mk.tempo) { tp = mk.tempo; ramp = null; }
      if (mk.ramp) ramp = { left: mk.ramp.n, from: tp, to: mk.ramp.to, n: mk.ramp.n };
      if (ramp && ramp.left > 0) { const q = (ramp.n - ramp.left + 1) / ramp.n; tempo.push(ramp.from + (ramp.to - ramp.from) * (q - 0.5 / ramp.n)); ramp.left--; if (!ramp.left) tp = ramp.to; } else tempo.push(tp);
    }
    const segs = []; let sec = 0, eu = 0;
    order.forEach((m, k) => {
      const tpo = tempo[m] * sp, len = T.len[m];
      segs.push({ m, eu, sec, tempo: tpo, start: T.start[m], len, cont: k > 0 && order[k - 1] === m - 1 });
      sec += (len * 60) / tpo / 16; eu += len;
    });
    return { T, segs, order, total: sec, units: eu };
  };
  /** expanded units -> seconds */
  FS.unitsToSec = function (ST, u) {
    let q = ST.segs[0];
    for (const g of ST.segs) { if (u >= g.eu - 1e-9) q = g; else break; }
    return q.sec + ((u - q.eu) * 60) / q.tempo / 16;
  };
  /** seconds -> score units (for the cursor) */
  FS.secToUnits = function (ST, s) {
    let q = ST.segs[0];
    for (const g of ST.segs) { if (s >= g.sec - 1e-9) q = g; else break; }
    return q.start + Math.min(q.len, ((s - q.sec) * q.tempo * 16) / 60);
  };
  /** score unit -> first expanded unit where it is played */
  FS.unitsToExpanded = function (ST, u) {
    for (const g of ST.segs) if (u >= g.start - 1e-9 && u < g.start + g.len - 1e-9) return g.eu + (u - g.start);
    return 0;
  };
  const DYNV = { ppp: 0.3, pp: 0.4, p: 0.55, mp: 0.7, mf: 0.85, f: 1, ff: 1.15, fff: 1.3, sfz: 1.1 };
  FS.noteList = function (S, opts) {
    opts = opts || {};
    const T = FS.mtab(S), out = [], solo = S.parts.some((P) => P.solo);
    S.parts.forEach((P, pi) => {
      if (solo ? !P.solo : P.mute) return;
      const shift = FS.CLEFS[P.clef].shift + (P.trans || 0), nvoices = Math.max(...P.m.map((V) => V.length));
      for (let v = 0; v < nvoices; v++) {
        const flat = [];
        for (let m = 0; m < T.n; m++) { const E = P.m[m][v]; if (!E) continue; let t = T.start[m]; E.forEach((e) => { flat.push({ e, t }); t += e.d; }); }
        // dynamics: level per event, with hairpin ramps
        let lvl = 0.85, oct = 0; const levels = new Array(flat.length), octs = new Array(flat.length), slurred = new Array(flat.length).fill(false);
        for (let k = 0; k < flat.length; k++) {
          const e = flat[k].e;
          if (e.dyn) lvl = DYNV[e.dyn] || lvl;
          if (e.ov != null) oct = e.ov * 12;
          levels[k] = lvl; octs[k] = oct;
          if (e.hp === 'cr' || e.hp === 'de') {
            let j = k + 1; while (j < flat.length && !flat[j].e.dyn && !flat[j].e.hp) j++;
            const to = j < flat.length && flat[j].e.dyn ? DYNV[flat[j].e.dyn] : Math.max(0.2, Math.min(1.4, lvl * (e.hp === 'cr' ? 1.35 : 0.7)));
            const span = (j < flat.length ? flat[j].t : flat[flat.length - 1].t + flat[flat.length - 1].e.d) - flat[k].t || 1;
            for (let q = k; q < Math.min(j, flat.length); q++) levels[q] = lvl + (to - lvl) * ((flat[q].t - flat[k].t) / span);
            lvl = to;
          }
          if (e.slur && e.p.length) {
            let want = +e.slur || 1;
            for (let j = k; j < flat.length && want > 0; j++) { if (j > k && flat[j].e.p.length) want--; if (want > 0) slurred[j] = true; }
          }
        }
        for (let k = 0; k < flat.length; k++) {
          const { e, t } = flat[k];
          if (!e.p.length || flat[k].skip) continue;
          let d = e.d, cur = e, j = k;
          while (cur.tie && flat[j + 1] && flat[j + 1].e.p.length && e.p.every((p) => flat[j + 1].e.p.some((q) => FS.samePitch(p, q)))) { j++; flat[j].skip = true; d += flat[j].e.d; cur = flat[j].e; }
          const base = { pi, inst: instOf(P), pan: P.pan || 0, art: e.art, e, leg: slurred[k] && !!flat[j + 1] };
          const vol = (P.vol / 100) * levels[k] * (e.dyn === 'sfz' ? 1.35 : 1);
          let midi = e.p.map((p) => FS.midi(p) + shift + octs[k]), tt = t, dd = d;
          // grace notes borrow time from the main note
          if (e.gr && e.gr.length) {
            const gd = Math.min(2, dd / (e.gr.length * 3));
            e.gr.forEach((g, gi) => out.push(Object.assign({}, base, { t: tt + gi * gd, d: gd, midi: [FS.midi(g) + shift + octs[k]], vol: vol * 0.8, art: null })));
            tt += gd * e.gr.length; dd -= gd * e.gr.length;
          }
          const emit = (ts, ds, mm, vv) => out.push(Object.assign({}, base, { t: ts, d: ds, midi: mm, vol: vv == null ? vol : vv }));
          const up = (mm, n) => mm.map((x) => x + n);
          if (e.art === 'tr' && dd >= 4) { for (let q = 0, x = tt; x < tt + dd - 1e-6; q++, x += 2) emit(x, Math.min(2, tt + dd - x), q % 2 ? up(midi, 2) : midi); }
          else if (e.art === 'mord' && dd >= 6) { emit(tt, 2, midi); emit(tt + 2, 2, up(midi, 2)); emit(tt + 4, dd - 4, midi); }
          else if (e.art === 'turn' && dd >= 8) { const q = dd / 4; emit(tt, q, up(midi, 2)); emit(tt + q, q, midi); emit(tt + 2 * q, q, up(midi, -1)); emit(tt + 3 * q, q, midi); }
          else if (e.art === 'trem' && dd >= 4) { for (let x = tt; x < tt + dd - 1e-6; x += 2) emit(x, Math.min(2, tt + dd - x), midi); }
          else if (e.art === 'arp' && midi.length > 1) { const st = Math.min(2, dd / (midi.length * 2)); midi.slice().sort((a, b) => a - b).forEach((mm, q) => emit(tt + q * st, dd - q * st, [mm])); }
          else emit(tt, dd, midi);
        }
      }
    });
    return out.sort((a, b) => a.t - b.t);
  };

  /* ---------- transport ---------- */
  A.start = function (S, fromUnits, onTick, onEnd) {
    A.stop(true);
    const c = A.context(), ST = FS.secTable(S, A.speed), t0 = c.currentTime + 0.12, from = FS.unitsToExpanded(ST, fromUnits || 0), base = FS.unitsToSec(ST, from);
    const raw = FS.noteList(S), notes = [];
    ST.segs.forEach((g, gi) => {
      let end = g.start + g.len; for (let k = gi + 1; k < ST.segs.length && ST.segs[k].cont; k++) end += ST.segs[k].len;
      raw.forEach((n) => {
        if (n.t < g.start - 1e-9 || n.t >= g.start + g.len - 1e-9) return;
        notes.push(Object.assign({}, n, { t: g.eu + (n.t - g.start), d: Math.min(n.d, end - n.t) }));
      });
    });
    notes.forEach((n) => {
      if (n.t + n.d <= from + EPS) return;
      const startSec = FS.unitsToSec(ST, Math.max(n.t, from)) - base, endSec = FS.unitsToSec(ST, n.t + n.d) - base;
      const dur = Math.max(0.05, (endSec - startSec) * (n.art === 'stac' ? 0.45 : n.leg ? 1.03 : n.art === 'ten' ? 1 : 0.94));
      n.midi.forEach((mm) => FS.synth(c, A.master, n.inst, freq(mm), t0 + startSec, dur, n.vol * (n.art === 'acc' || n.art === 'marc' ? 1.3 : 1), n.pan));
    });
    const total = ST.total - base;
    A.play = { t0, base, ST, total, onTick, onEnd, raf: 0 };
    const tick = () => {
      if (!A.play) return;
      const el = c.currentTime - t0;
      if (el >= total + 0.3) { const e = A.play.onEnd; A.stop(true); if (e) e(); return; }
      if (el >= 0 && onTick) onTick(FS.secToUnits(ST, Math.max(0, el) + base));
      A.play.raf = requestAnimationFrame(tick);
    };
    A.play.raf = requestAnimationFrame(tick);
  };
  A.stop = function (silent) {
    if (A.play) { cancelAnimationFrame(A.play.raf); const e = A.play.onEnd; A.play = null; if (!silent && e) e(); }
    try { if (A.ctx && A.master) { A.master.disconnect(); A.master = makeMaster(A.ctx); } } catch (e) { /* ignore */ }
  };
  A.playing = () => !!A.play;
})();
