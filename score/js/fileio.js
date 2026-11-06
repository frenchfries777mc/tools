/* Fry Score — MIDI, WAV, PNG and print/PDF. */
(function () {
  'use strict';
  const FS = window.FS, IO = FS.io, A = FS.audio;

  /* ================= MIDI export ================= */
  const vlq = (n) => { const b = [n & 127]; while ((n >>= 7)) b.unshift((n & 127) | 128); return b; };
  const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const u16 = (n) => [(n >> 8) & 255, n & 255];
  const str = (s) => Array.from(unescape(encodeURIComponent(s))).map((c) => c.charCodeAt(0));
  const chunk = (id, data) => str(id).concat(u32(data.length), data);
  const TPU = 30; // ticks per unit (480 per quarter)
  const GM_DRUM = { kick: 36, ltom: 45, snare: 38, htom: 50, hat: 42, crash: 49 };

  IO.exportMidi = function (S) {
    const PN = FS.playNotes(S, 1), ST = PN.ST, T = ST.T;
    // conductor track
    const ev = [];
    const meta = (tick, type, data) => ev.push({ tick, o: 0, b: [0xff, type].concat(vlq(data.length), data) });
    meta(0, 3, str(S.name || 'score'));
    let lastTempo = 0, lastTs = '', lastKey = null;
    ST.segs.forEach((g) => {
      const tick = Math.round(g.eu * TPU), tempo = Math.round(g.tempo * 100) / 100;
      if (tempo !== lastTempo) { const us = Math.round(60000000 / tempo); meta(tick, 0x51, [(us >> 16) & 255, (us >> 8) & 255, us & 255]); lastTempo = tempo; }
      const ts = T.ts[g.m], k = ts.join('/');
      if (k !== lastTs) { meta(tick, 0x58, [ts[0], Math.round(Math.log2(ts[1])), 24, 8]); lastTs = k; }
      if (T.key[g.m] !== lastKey) { meta(tick, 0x59, [T.key[g.m] & 255, 0]); lastKey = T.key[g.m]; }
    });
    const tracks = [finish(ev, Math.round(ST.units * TPU))];
    S.parts.forEach((P, pi) => {
      const e2 = [], ch = P.clef === 'drum' ? 9 : (() => { let c = 0, k = 0; for (let i = 0; i < pi; i++) if (S.parts[i].clef !== 'drum') k++; c = k % 15; return c >= 9 ? c + 1 : c; })();
      e2.push({ tick: 0, o: 0, b: [0xff, 3].concat(vlq(str(P.name).length), str(P.name)) });
      if (P.clef !== 'drum') { const inst = FS.INSTS.filter((x) => x[0] === P.inst)[0]; e2.push({ tick: 0, o: 1, b: [0xc0 | ch, inst ? inst[2] : 0] }); }
      e2.push({ tick: 0, o: 1, b: [0xb0 | ch, 10, Math.max(0, Math.min(127, Math.round(((P.pan || 0) + 1) * 63.5)))] });
      e2.push({ tick: 0, o: 1, b: [0xb0 | ch, 7, Math.max(0, Math.min(127, Math.round(P.vol * 1.27)))] });
      PN.notes.forEach((n) => {
        if (n.pi !== pi) return;
        const on = Math.round(n.t * TPU), off = Math.max(on + 1, Math.round((n.t + n.d * (n.art === 'stac' ? 0.5 : 0.97)) * TPU));
        const vel = Math.max(1, Math.min(127, Math.round(25 + (n.vol / Math.max(0.01, P.vol / 100)) * 70)));
        n.midi.forEach((mm) => {
          let key = mm;
          if (P.clef === 'drum') { const k = FS.drumKind(mm); key = k === 'htom' && mm <= 74 ? 47 : GM_DRUM[k]; }
          key = Math.max(0, Math.min(127, key));
          e2.push({ tick: on, o: 3, b: [0x90 | ch, key, vel] });
          e2.push({ tick: off, o: 2, b: [0x80 | ch, key, 0] });
        });
      });
      tracks.push(finish(e2, Math.round(ST.units * TPU)));
    });
    function finish(list, endTick) {
      list.sort((a, b) => a.tick - b.tick || a.o - b.o);
      const out = []; let t = 0;
      list.forEach((e) => { out.push(...vlq(e.tick - t), ...e.b); t = e.tick; });
      out.push(...vlq(Math.max(0, endTick - t)), 0xff, 0x2f, 0);
      return chunk('MTrk', out);
    }
    const head = chunk('MThd', u16(1).concat(u16(tracks.length), u16(480)));
    return new Blob([new Uint8Array(head.concat(...tracks))], { type: 'audio/midi' });
  };

  /* ================= MIDI import ================= */
  const progToInst = (p) => (p < 8 ? 'piano' : p < 10 ? 'marimba' : p < 16 ? 'box' : p < 24 ? 'organ' : p < 32 ? 'guitar' : p < 40 ? 'bass' : p === 46 ? 'harp' : p < 56 ? (p >= 52 && p <= 54 ? 'choir' : 'strings') : p < 64 ? 'brass' : p < 80 ? 'flute' : p < 88 ? 'chip' : 'piano');
  const DRUM_MAP = (n) => (n === 35 || n === 36 ? 65 : n === 38 || n === 40 || n === 37 ? 72 : n === 41 || n === 43 || n === 45 ? 69 : n === 47 || n === 48 ? 74 : n === 50 ? 76 : n === 49 || n === 57 || n === 55 ? 81 : n >= 42 && n <= 59 ? 79 : 72);

  IO.readMidi = function (buf, name) {
    const d = new Uint8Array(buf); let p = 0;
    const rd32 = () => ((d[p++] << 24) | (d[p++] << 16) | (d[p++] << 8) | d[p++]) >>> 0, rd16 = () => (d[p++] << 8) | d[p++];
    const tag = () => String.fromCharCode(d[p++], d[p++], d[p++], d[p++]);
    if (tag() !== 'MThd') throw new Error('not midi');
    rd32(); rd16(); const ntr = rd16(), div = rd16();
    if (div & 0x8000) throw new Error('smpte');
    let tempo = 0, ts = null, key = null, title = '';
    const lines = []; // {track, ch, prog, name, notes:[{s,e,k}]}
    for (let t = 0; t < ntr && p < d.length; t++) {
      if (tag() !== 'MTrk') break;
      const len = rd32(), end = p + len; let tick = 0, run = 0, tname = ''; const open = {}, chans = {}, progs = {};
      const vl = () => { let v = 0, b; do { b = d[p++]; v = (v << 7) | (b & 127); } while (b & 128 && p < end); return v; };
      while (p < end) {
        tick += vl(); let st = d[p];
        if (st & 128) { p++; if (st < 0xf0) run = st; } else st = run;
        if (st === 0xff) {
          const type = d[p++], l = vl(), data = d.slice(p, p + l); p += l;
          if (type === 0x51 && !tempo) tempo = Math.round(60000000 / ((data[0] << 16) | (data[1] << 8) | data[2]));
          else if (type === 0x58 && !ts) ts = [data[0], Math.pow(2, data[1])];
          else if (type === 0x59 && key == null) key = (data[0] << 24) >> 24;
          else if (type === 0x03) { try { tname = decodeURIComponent(escape(String.fromCharCode(...data))); } catch (e) { tname = String.fromCharCode(...data); } if (t === 0 && ntr > 1) title = tname; }
        } else if (st === 0xf0 || st === 0xf7) { p += vl(); }
        else {
          const hi = st & 0xf0, ch = st & 15;
          if (hi === 0xc0 || hi === 0xd0) { const v = d[p++]; if (hi === 0xc0) progs[ch] = v; }
          else {
            const a = d[p++], b = d[p++];
            if (hi === 0x90 && b > 0) { const k = ch + ':' + a; if (open[k] == null) open[k] = tick; chans[ch] = chans[ch] || { track: t, ch, prog: progs[ch] || 0, name: tname, notes: [] }; chans[ch]._o = chans[ch]._o || {}; chans[ch]._o[a] = tick; }
            else if (hi === 0x80 || (hi === 0x90 && b === 0)) { const c = chans[ch]; if (c && c._o && c._o[a] != null) { c.notes.push({ s: c._o[a], e: tick, k: a }); delete c._o[a]; } }
          }
        }
      }
      Object.keys(chans).forEach((c) => { const q = chans[c]; if (q.notes.length) { q.prog = progs[c] != null ? progs[c] : q.prog; lines.push(q); } });
      p = end;
    }
    if (!lines.length) throw new Error('empty');
    const S = FS.newScore('lead'); S.parts = []; S.name = name || 'MIDI';
    S.tempo = FS.clamp(tempo || 100, 30, 240); if (ts && ts[0] > 0 && FS.TIMES.some((x) => x[0] === ts[0] && x[1] === ts[1])) S.ts = ts; S.key = key != null ? FS.clamp(key, -7, 7) : 0;
    const Q = 2, U = 16 / div, mlen = (S.ts[0] * 64) / S.ts[1];
    let maxEnd = 0;
    lines.slice(0, 12).forEach((ln) => {
      const drum = ln.ch === 9, avg = ln.notes.reduce((a, n) => a + n.k, 0) / ln.notes.length;
      const P = FS.newPart(drum ? '드럼' : ln.name || ('파트 ' + (S.parts.length + 1)), drum ? 'drum' : avg < 58 ? 'bass' : 'treble', progToInst(ln.prog));
      P._n = ln.notes.map((n) => ({ s: Math.round((n.s * U) / Q) * Q, e: Math.max(Math.round((n.e * U) / Q) * Q, Math.round((n.s * U) / Q) * Q + Q), k: drum ? DRUM_MAP(n.k) : n.k })).sort((a, b) => a.s - b.s || a.k - b.k);
      P._n.forEach((n) => { if (n.e > maxEnd) maxEnd = n.e; });
      S.parts.push(P);
    });
    const nm = Math.min(600, Math.max(1, Math.ceil(maxEnd / mlen)));
    FS.growTo(S, nm);
    const T = FS.mtab(S);
    S.parts.forEach((P) => { P.m = S.meas.map((_, m) => [[FS.rest(T.len[m])]]); });
    S.parts.forEach((P, pi) => {
      const ns = P._n; delete P._n;
      for (let i = 0; i < ns.length;) {
        let j = i; const grp = []; while (j < ns.length && ns[j].s === ns[i].s) grp.push(ns[j++]);
        const nextOn = j < ns.length ? ns[j].s : Infinity, dur = Math.min(Math.max(...grp.map((q) => q.e - q.s)), nextOn - ns[i].s);
        const seen = {}, pitches = []; grp.forEach((q) => { if (!seen[q.k]) { seen[q.k] = 1; pitches.push(FS.fromMidi(q.k, S.key)); } });
        const m = Math.floor(ns[i].s / mlen), t = ns[i].s - m * mlen;
        if (dur > 0) FS.place(S, pi, m, 0, t, { d: dur, p: FS.sortPitches(pitches) || pitches });
        i = j;
      }
    });
    return FS.fix(S);
  };

  /* ================= WAV ================= */
  IO.renderWav = function (S, done, fail) {
    try {
      const PN = FS.playNotes(S, 1), sr = 44100, secs = Math.min(600, PN.ST.total + 1.6), OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const oc = new OC(2, Math.ceil(sr * secs), sr), master = A.makeMaster(oc);
      A.schedule(oc, master, PN, 0, 0.05, false);
      oc.startRendering().then((buf) => {
        const n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(1), out = new DataView(new ArrayBuffer(44 + n * 4));
        const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
        w(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
        out.setUint32(24, sr, true); out.setUint32(28, sr * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * 4, true);
        for (let i = 0; i < n; i++) { out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
        done(new Blob([out], { type: 'audio/wav' }));
      }).catch(fail);
    } catch (e) { fail(e); }
  };

  /* ================= PNG / print ================= */
  IO.svgString = function (S, L, y0, h) {
    const inner = FS.render(S, L, { sel: new Set() });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${y0} ${L.W} ${h}" width="${L.W}" height="${h}" font-family="Noto Sans KR,sans-serif"><rect x="0" y="${y0}" width="${L.W}" height="${h}" fill="#fff"/>${inner}</svg>`;
  };
  IO.exportPng = function (S, scale, done, fail) {
    const L = FS.layout(S, { W: 1000 }), svg = IO.svgString(S, L, 0, L.H + 10), img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas'); cv.width = L.W * scale; cv.height = (L.H + 10) * scale;
      const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob((b) => (b ? done(b) : fail()), 'image/png');
    };
    img.onerror = fail;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };
  IO.pages = function (S) {
    const L = FS.layout(S, { W: 1000 }), PH = 1380, pages = []; let cur = null;
    L.systems.forEach((sys) => {
      if (!cur || sys.yEnd - cur.y0 > PH) { cur = { y0: pages.length ? sys.y - 34 : 0, y1: sys.yEnd + 20 }; pages.push(cur); } else cur.y1 = sys.yEnd + 20;
    });
    if (!pages.length) pages.push({ y0: 0, y1: L.H });
    return { L, pages };
  };
  IO.print = function (S) {
    const { L, pages } = IO.pages(S), box = document.getElementById('printArea');
    box.innerHTML = pages.map((pg, i) => `<div class="ppage">${IO.svgString(S, L, pg.y0, pg.y1 - pg.y0).replace(/width="\d+" height="\d+"/, 'style="width:100%;height:auto"')}<div class="pno">${i + 1} / ${pages.length}</div></div>`).join('');
    const clean = () => { box.innerHTML = ''; window.removeEventListener('afterprint', clean); };
    window.addEventListener('afterprint', clean);
    setTimeout(() => window.print(), 60);
  };
})();
