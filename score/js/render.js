/* Fry Score — SVG renderer. Draws the geometry produced by layout.js. */
(function () {
  'use strict';
  const FS = window.FS, f = FS.f, esc = FS.esc, G = FS.glyph, STAFF = 40;
  const INK = '#111', SEL = '#e8453c';
  const FONT = 'font-family="Noto Sans KR,sans-serif"';

  function drawItem(it, S, L, sel) {
    const c = sel ? SEL : INK, g = [];
    const P = S.parts[it.pi], top = it.top, e = it.e;
    if (sel) g.push(`<rect x="${f(it.x - 11)}" y="${top - 6}" width="22" height="${STAFF + 12}" rx="4" fill="rgba(232,69,60,.13)"/>`);
    if (it.rest) {
      const multi = S.parts[it.pi].m[it.m].length > 1;
      const whole = Math.abs(e.d - L.T.len[it.m]) < 1e-4;
      const dy = multi && it.v > 0 ? 10 : multi ? -8 : 0;
      g.push(`<g transform="translate(0 ${dy})">${G.rest(it.dur.base, f(it.x), top, c, whole)}`);
      if (!whole) for (let d = 0; d < it.dur.dots; d++) g.push(G.dot(it.x + 9 + d * 5, top + 15, c));
      g.push('</g>');
      return g.join('');
    }
    const heads = it.heads, drum = P.clef === 'drum';
    // ledger lines
    const lo = Math.min(...heads.map((h) => h.pos)), hi = Math.max(...heads.map((h) => h.pos));
    const xl0 = it.x - 11 + Math.min(0, ...heads.map((h) => h.dx)), xl1 = it.x + 11 + Math.max(0, ...heads.map((h) => h.dx));
    const lowest = lo & 1 ? lo + 1 : lo, highest = hi & 1 ? hi - 1 : hi, LL = (p) => `<line x1="${f(xl0)}" y1="${top + STAFF - p * 5}" x2="${f(xl1)}" y2="${top + STAFF - p * 5}" stroke="#222" stroke-width="1.2"/>`;
    for (let p = -2; p >= lowest; p -= 2) g.push(LL(p));
    for (let p = 10; p <= highest; p += 2) g.push(LL(p));
    // stem
    if (it.dur.base < 64 && it.tip != null) {
      g.push(`<line x1="${f(it.stemX)}" y1="${f(it.y0)}" x2="${f(it.stemX)}" y2="${f(it.tip)}" stroke="${c}" stroke-width="1.4"/>`);
      if (!it.beamed && it.nflag) g.push(G.flag(it.stemX, it.tip, it.dir, it.nflag, c));
    }
    // heads, accidentals, dots
    heads.forEach((h) => {
      const hx = it.x + h.dx;
      const hc = S.nc && c === INK && FS.NPAL ? FS.NPAL[h.p.s] : c;
      if (drum && FS.midi(h.p) >= 77) g.push(G.head(it.dur.base, hx, h.y, hc, 'x'));
      else g.push(G.head(it.dur.base, hx, h.y, hc, e.hd));
      if (h.acc != null) g.push(G.acc(h.acc, it.x - 15 - h.accCol * 11 + Math.min(0, h.dx), h.y, c));
      for (let d = 0; d < it.dur.dots; d++) g.push(G.dot(it.x + 10 + Math.max(0, ...heads.map((q) => q.dx)) + d * 5, h.y + (h.pos % 2 === 0 ? -5 : 0), c));
    });
    return g.join('');
  }

  function drawBeams(grp, sel) {
    const b = grp.beam, o = [];
    const yAt = (x) => b.y1 + b.slope * (x - b.x1), TH = 5;
    const poly = (xa, xb, lvl) => {
      const sh = b.dir > 0 ? 1 : -1; // beams extend towards the heads
      const A = yAt(xa) + sh * lvl * 7.5, B = yAt(xb) + sh * lvl * 7.5;
      return `<polygon points="${f(xa)},${f(A)} ${f(xb)},${f(B)} ${f(xb)},${f(B + sh * TH)} ${f(xa)},${f(A + sh * TH)}" fill="${sel ? SEL : INK}"/>`;
    };
    const lv = grp.map((it) => (it.dur.base === 8 ? 1 : it.dur.base === 4 ? 2 : it.dur.base === 2 ? 3 : 4));
    for (let L = 1; L <= 4; L++) {
      let i = 0;
      while (i < grp.length) {
        if (lv[i] < L) { i++; continue; }
        let j = i; while (j + 1 < grp.length && lv[j + 1] >= L) j++;
        if (j > i) o.push(poly(grp[i].stemX, grp[j].stemX, L - 1));
        else { // stub towards the neighbour
          const dir = i === 0 ? 1 : -1, xa = grp[i].stemX, xb = xa + dir * 8;
          o.push(poly(Math.min(xa, xb), Math.max(xa, xb), L - 1));
        }
        i = j + 1;
      }
    }
    return o.join('');
  }

  FS.render = function (S, L, state) {
    state = state || {};
    const sel = state.sel || new Set(), W = L.W, H = L.H, T = L.T, o = [];
    o.push(`<rect width="${W}" height="${H}" fill="#fff"/>`);
    o.push(`<text x="${W / 2}" y="40" text-anchor="middle" font-size="26" font-weight="700" fill="${INK}" ${FONT}>${esc(S.name)}</text>`);
    if (S.sub) o.push(`<text x="${W / 2}" y="60" text-anchor="middle" font-size="14" fill="#444" ${FONT}>${esc(S.sub)}</text>`);
    if (S.composer) o.push(`<text x="${W - L.MARG}" y="62" text-anchor="end" font-size="13" fill="#444" ${FONT}>${esc(S.composer)}</text>`);
    if (S.lyr) o.push(`<text x="${W - L.MARG}" y="44" text-anchor="end" font-size="13" fill="#444" ${FONT}>${esc(S.lyr)}</text>`);
    o.push(`<text x="${L.MARG}" y="62" font-size="12" fill="#444" ${FONT}>♩ = ${S.tempo}</text>`);
    if (S.cpy) o.push(`<text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#666" ${FONT}>${esc(S.cpy)}</text>`);

    L.systems.forEach((sys) => {
      const x0 = sys.x0, x1 = sys.x1;
      // staves, clefs, key and time signatures
      S.parts.forEach((P, pi) => {
        const top = sys.partTop[pi];
        for (let l = 0; l < 5; l++) o.push(`<line x1="${x0}" y1="${top + l * 10}" x2="${x1}" y2="${top + l * 10}" stroke="#222" stroke-width="1"/>`);
        o.push(G.clef(P.clef, x0 + 18, top, INK));
        if (P.name && sys.index === 0 && S.pl) o.push(`<text x="${x0 + 36}" y="${top - 8}" font-size="10" font-weight="700" fill="#777" ${FONT}>${esc(P.name)}</text>`);
        if (P.clef !== 'drum') drawKeySig(o, P.clef, sys.key0, x0 + 44, top);
        if (sys.showTs) drawTs(o, S, T.ts[sys.ms[0].m], sys.hx - 15, top);
        if (state.hlM != null && state.hlP === pi) {
          const mo = L.meas[state.hlM];
          if (mo && mo.sys === sys.index) o.push(`<rect x="${f(mo.x)}" y="${top - 4}" width="${f(mo.w)}" height="${STAFF + 8}" fill="#2ec4b6" opacity=".09" pointer-events="none"/>`);
        }
      });
      // system start line and braces
      const yTop = sys.partTop[0], yBot = sys.partBot[S.parts.length - 1];
      o.push(`<line x1="${x0}" y1="${yTop}" x2="${x0}" y2="${yBot}" stroke="#222" stroke-width="1.6"/>`);
      S.parts.forEach((P, pi) => { if (P.brace && S.parts[pi + 1]) { const a = sys.partTop[pi], b = sys.partBot[pi + 1], h = b - a; o.push(`<path d="M${x0 - 4} ${a}C${x0 - 15} ${a + h * 0.2} ${x0 - 15} ${a + h * 0.4} ${x0 - 9} ${a + h * 0.5}C${x0 - 15} ${a + h * 0.6} ${x0 - 15} ${a + h * 0.8} ${x0 - 4} ${b}" fill="none" stroke="#222" stroke-width="2.6" stroke-linecap="round"/>`); } });
      // measures
      sys.ms.forEach((mo, j) => {
        const m = mo.m, last = m === T.n - 1;
        S.parts.forEach((P, pi) => {
          const top = sys.partTop[pi];
          if (j > 0 && mo.keyChange && P.clef !== 'drum') drawKeySig(o, P.clef, T.key[m], mo.x + 6, top);
          if (j > 0 && mo.tsChange) drawTs(o, S, T.ts[m], mo.x + 6 + (mo.keyChange ? mo.kx : 0) + 8, top);
          const xr = mo.xEnd;
          const spanTo = P.brace && S.parts[pi + 1] ? sys.partBot[pi + 1] : top + STAFF;
          o.push(FS.barline(S, m, last, mo.x, xr, top, spanTo));
          const lists = L.items[pi + '|' + m] || [];
          lists.forEach((items) => {
            items.forEach((it) => {
              const key = pi + '|' + m + '|' + it.v + '|' + it.i;
              o.push(drawItem(it, S, L, sel.has(key)));
            });
            const seen = new Set();
            items.forEach((it) => { if (it.beamed && !seen.has(it.beamed)) { seen.add(it.beamed); o.push(drawBeams(it.beamed, sel.has(pi + '|' + m + '|' + it.v + '|' + it.i))); } });
          });
        });
        if (state.hlM === m && state.hlP == null) { /* measure selected without part */ }
      });
      sys.curves.forEach((c) => o.push(G.curve(c.x1, c.y1, c.x2, c.y2, c.dir, INK, 1.6)));
      if (FS.decor) o.push(FS.decor(S, L, sys));
    });
    if (state.extra) o.push(state.extra);
    return o.join('');
  };

  function drawKeySig(o, clef, key, x, top) {
    if (!key) return;
    const pos = FS.keyPos(clef)[key > 0 ? 's' : 'f'], n = Math.abs(key);
    for (let i = 0; i < n; i++) o.push(G.acc(key > 0 ? 1 : -1, x + i * 9.5 + 4, top + STAFF - pos[i] * 5, INK));
  }
  function drawTs(o, S, ts, cx, top) {
    const st = `text-anchor="middle" font-size="22" font-weight="700" fill="${INK}" font-family="Oswald,sans-serif"`;
    o.push(`<text x="${f(cx)}" y="${top + 17}" ${st}>${ts[0]}</text><text x="${f(cx)}" y="${top + 37}" ${st}>${ts[1]}</text>`);
  }
})();
