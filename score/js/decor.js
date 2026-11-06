/* Fry Score — decorations: chord symbols, dynamics, lyrics, articulations, ornaments, grace notes,
 * and spanners (hairpins, slurs, octave lines, tuplet brackets). Pure drawing of layout geometry. */
(function () {
  'use strict';
  const FS = window.FS, f = FS.f, esc = FS.esc, G = FS.glyph, STAFF = 40;
  const INK = '#111', FONT = 'font-family="Noto Sans KR,sans-serif"', SERIF = 'font-family="Georgia,Noto Sans KR,serif"';
  const NPAL = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#5c6bc0', '#8e24aa'];
  const NTXT = ['#fff', '#111', '#111', '#fff', '#fff', '#fff', '#fff'];
  const SOL = ['도', '레', '미', '파', '솔', '라', '시'];
  FS.NPAL = NPAL;

  function flat(L, pi, v) {
    L.flat = L.flat || {};
    const k = pi + '|' + v;
    if (L.flat[k]) return L.flat[k];
    const out = [];
    for (let m = 0; m < L.T.n; m++) { const ls = L.items[pi + '|' + m]; if (ls && ls[v]) ls[v].forEach((it) => { it.fi = out.length; out.push(it); }); }
    return (L.flat[k] = out);
  }
  FS.flatItems = flat;

  const headLow = (it) => it.heads[0].y, headHigh = (it) => it.heads[it.heads.length - 1].y;
  const lowY = (it) => Math.max(...it.heads.map((h) => h.y)), highY = (it) => Math.min(...it.heads.map((h) => h.y));

  function artSvg(it, S, o) {
    const e = it.e, a = e.art, x = it.x; if (!a) return;
    const top = it.top, bot = top + STAFF, c = INK;
    const below = it.dir > 0, ay = below ? lowY(it) + 11 : highY(it) - 11;
    if (a === 'stac') o.push(`<circle cx="${f(x)}" cy="${f(ay)}" r="1.9" fill="${c}"/>`);
    else if (a === 'acc') o.push(`<path d="M${x - 5} ${f(ay - 3.5)}L${x + 5} ${f(ay)}L${x - 5} ${f(ay + 3.5)}" fill="none" stroke="${c}" stroke-width="1.8"/>`);
    else if (a === 'ten') o.push(`<line x1="${x - 5}" y1="${f(ay)}" x2="${x + 5}" y2="${f(ay)}" stroke="${c}" stroke-width="2"/>`);
    else if (a === 'marc') o.push(`<path d="M${x - 4.5} ${f(ay + 3.5)}L${x} ${f(ay - 4)}L${x + 4.5} ${f(ay + 3.5)}" fill="none" stroke="${c}" stroke-width="1.8"/>`);
    else if (a === 'ferm') o.push(`<path d="M${x - 9} ${top - 5}Q${x} ${top - 18} ${x + 9} ${top - 5}" fill="none" stroke="${c}" stroke-width="1.8"/><circle cx="${x}" cy="${top - 7}" r="1.8" fill="${c}"/>`);
    else if (a === 'tr') o.push(`<text x="${x}" y="${top - 6}" text-anchor="middle" font-size="14" font-weight="700" font-style="italic" fill="${c}" ${SERIF}>tr</text>`);
    else if (a === 'mord') o.push(`<path d="M${x - 8} ${top - 7}l3 -4 3 4 3 -4 3 4 3 -4 3 4" fill="none" stroke="${c}" stroke-width="1.6"/>`);
    else if (a === 'turn') o.push(`<path d="M${x - 9} ${top - 6}c0 -6 6 -6 9 -2.5s9 3.5 9 -2.5" fill="none" stroke="${c}" stroke-width="1.8"/>`);
    else if (a === 'dbow') o.push(`<path d="M${x - 5} ${top - 4}V${top - 12}H${x + 5}V${top - 4}" fill="none" stroke="${c}" stroke-width="1.7"/>`);
    else if (a === 'ubow') o.push(`<path d="M${x - 5} ${top - 13}L${x} ${top - 4}L${x + 5} ${top - 13}" fill="none" stroke="${c}" stroke-width="1.7"/>`);
    else if (a === 'trem' && it.tip != null) {
      const sx = it.stemX, sy = it.dir > 0 ? it.tip + 12 : it.tip - 12;
      for (let q = -1; q <= 1; q++) o.push(`<line x1="${f(sx - 5)}" y1="${f(sy + q * 4 + 2.5)}" x2="${f(sx + 5)}" y2="${f(sy + q * 4 - 2.5)}" stroke="${c}" stroke-width="2"/>`);
    } else if (a === 'arp' && it.heads.length > 1) {
      const ax = x - 14 - 11 * (1 + Math.max(-1, ...it.heads.map((h) => (h.acc != null ? h.accCol : -1)))) * (it.heads.some((h) => h.acc != null) ? 1 : 0);
      const ya = highY(it) - 5, yb = lowY(it) + 5; let d = `M${f(ax)} ${f(yb)}`;
      for (let yy = yb; yy > ya; yy -= 6) d += 'q4 -1.5 0 -3 q-4 -1.5 0 -3';
      o.push(`<path d="${d}" fill="none" stroke="${c}" stroke-width="1.3"/>`);
    }
  }

  function graceSvg(it, S, o) {
    const gr = it.e.gr; if (!gr || !gr.length) return;
    const P = S.parts[it.pi], base = FS.CLEFS[P.clef].base, top = it.top;
    const accShift = it.heads.some((h) => h.acc != null) ? 11 * (1 + Math.max(...it.heads.map((h) => (h.acc != null ? h.accCol : 0)))) : 0;
    const n = gr.length, pts = [];
    gr.forEach((p, k) => {
      const gx = it.x - 15 - accShift - (n - 1 - k) * 11, pos = FS.abs(p) - base, gy = top + STAFF - pos * 5;
      for (let q = -2; q >= pos - (pos & 1 ? 0 : 0) && pos <= -2; q -= 2) { if (q < pos - 1) break; o.push(`<line x1="${gx - 6}" y1="${top + STAFF - q * 5}" x2="${gx + 6}" y2="${top + STAFF - q * 5}" stroke="#222"/>`); }
      for (let q = 10; q <= pos; q += 2) o.push(`<line x1="${gx - 6}" y1="${top + STAFF - q * 5}" x2="${gx + 6}" y2="${top + STAFF - q * 5}" stroke="#222"/>`);
      o.push(`<ellipse cx="${f(gx)}" cy="${f(gy)}" rx="4" ry="2.9" transform="rotate(-22 ${f(gx)} ${f(gy)})" fill="${INK}"/>`);
      o.push(`<line x1="${f(gx + 3.6)}" y1="${f(gy)}" x2="${f(gx + 3.6)}" y2="${f(gy - 18)}" stroke="${INK}" stroke-width="1.1"/>`);
      pts.push({ x: gx + 3.6, y: gy - 18 });
    });
    if (n > 1) o.push(`<line x1="${f(pts[0].x)}" y1="${f(pts[0].y)}" x2="${f(pts[n - 1].x)}" y2="${f(pts[n - 1].y)}" stroke="${INK}" stroke-width="2.4"/>`);
    else o.push(`<path d="M${f(pts[0].x)} ${f(pts[0].y)}c4 3 5 7 3 10" fill="none" stroke="${INK}" stroke-width="1.2"/>`);
    o.push(`<line x1="${f(pts[0].x - 6)}" y1="${f(pts[0].y + 11)}" x2="${f(pts[0].x + 5)}" y2="${f(pts[0].y + 4)}" stroke="${INK}" stroke-width="1"/>`);
  }

  function itemDecor(it, S, L, o) {
    const e = it.e, pm = L.pm[it.pi], top = it.top, bot = top + STAFF, x = it.x;
    if (e.ch) o.push(`<text x="${f(x)}" y="${top - 15}" text-anchor="middle" font-size="13" font-weight="700" fill="${INK}" ${FONT}>${esc(e.ch)}</text>`);
    if (e.tx) o.push(`<text x="${f(x)}" y="${top - (pm.hasCh ? 31 : 17)}" text-anchor="middle" font-size="12" font-style="italic" font-weight="700" fill="#222" ${SERIF}>${esc(e.tx)}</text>`);
    if (e.dyn) o.push(`<text x="${f(x)}" y="${bot + pm.dynY}" text-anchor="middle" font-size="15" font-weight="700" font-style="italic" fill="${INK}" ${SERIF}>${esc(e.dyn)}</text>`);
    [['ly', pm.ly1Y], ['ly2', pm.ly2Y]].forEach(([k, yy]) => {
      if (!e[k] || !yy) return;
      let t = e[k], hy = false; if (/-$/.test(t) && t.length > 1) { t = t.slice(0, -1); hy = true; }
      o.push(`<text x="${f(x)}" y="${bot + yy}" text-anchor="middle" font-size="13" fill="#222" ${FONT}>${esc(t)}</text>`);
      if (hy) { const fl = flat(L, it.pi, it.v), nx = fl[it.fi + 1]; if (nx && nx.sys === it.sys) o.push(`<text x="${f((x + nx.x) / 2)}" y="${bot + yy}" text-anchor="middle" font-size="13" fill="#222" ${FONT}>-</text>`); }
    });
    if (e.ped && pm.pedY) o.push(`<text x="${f(x)}" y="${bot + pm.pedY}" text-anchor="middle" font-size="${e.ped === 'd' ? 13 : 16}" font-style="italic" font-weight="700" fill="#555" ${SERIF}>${e.ped === 'd' ? 'Ped.' : '✱'}</text>`);
    if (it.rest) return;
    artSvg(it, S, o); graceSvg(it, S, o);
    if (S.nn && S.parts[it.pi].clef !== 'drum') {
      const open = it.dur.base >= 32;
      it.heads.forEach((h) => {
        const txt = S.nn === 2 ? SOL[h.p.s] : FS.STEPS[h.p.s];
        const fill = S.nc ? NTXT[h.p.s] : open ? '#111' : '#fff';
        o.push(`<text x="${f(x + h.dx)}" y="${f(h.y + 3)}" text-anchor="middle" font-size="${S.nn === 2 ? 8.5 : 8}" font-weight="800" fill="${fill}" ${FONT} pointer-events="none">${txt}</text>`);
      });
    }
  }

  /* ----- spanners ----- */
  function segments(L, a, b) { // per system x ranges for a span from item a to item b
    const out = [];
    for (let s = a.sys; s <= b.sys; s++) {
      const sys = L.systems[s];
      out.push({ s, first: s === a.sys, last: s === b.sys, xa: s === a.sys ? a.x : sys.hx, xb: s === b.sys ? b.x : sys.x1 - 6 });
    }
    return out;
  }
  function spanners(S, L) {
    const deco = L.systems.map(() => []);
    S.parts.forEach((P, pi) => {
      const pm = L.pm[pi], nv = Math.max(...P.m.map((V) => V.length));
      for (let v = 0; v < nv; v++) {
        const fl = flat(L, pi, v);
        // slurs
        fl.forEach((it, k) => {
          if (!it.e.slur || it.rest) return;
          let want = +it.e.slur === 1 || it.e.slur === true ? 1 : +it.e.slur, tg = null;
          for (let j = k + 1; j < fl.length; j++) if (!fl[j].rest) { tg = fl[j]; if (--want <= 0) break; }
          if (!tg) return;
          const below = it.dir > 0, dir = below ? 1 : -1;
          const yy = (q) => (below ? lowY(q) + 9 : highY(q) - 9);
          segments(L, it, tg).forEach((sg) => {
            const x1 = sg.first ? sg.xa + 3 : sg.xa, x2 = sg.last ? sg.xb - 3 : sg.xb;
            const y1 = sg.first ? yy(it) : yy(tg), y2 = sg.last ? yy(tg) : yy(it);
            deco[sg.s].push(G.curve(x1, y1, x2, y2, dir, INK, 1.7));
          });
        });
        // tuplets
        for (let k = 0; k < fl.length; k++) {
          const first = fl[k]; if (!first.e.tp) continue;
          const n = first.e.tp, grp = [];
          for (let j = k; j < fl.length && grp.length < n && fl[j].e.tp === n; j++) grp.push(fl[j]);
          k += grp.length - 1;
          if (grp.length < 2 || grp.some((q) => q.sys !== first.sys)) continue;
          const stems = grp.filter((q) => !q.rest && q.tip != null), dir = stems.length ? stems[0].dir : 1;
          const beamed = stems.length === grp.length && grp[0].beamed && grp.every((q) => q.beamed === grp[0].beamed);
          const x1 = grp[0].x - 6, x2 = grp[grp.length - 1].x + 6, top = first.top, bot = top + STAFF;
          let y = dir > 0 ? (stems.length ? Math.min(...stems.map((q) => q.tip)) - 9 : top - 6) : (stems.length ? Math.max(...stems.map((q) => q.tip)) + 9 : bot + 6);
          if (beamed) { const bm = grp[0].beamed.beam; y = bm.y1 + bm.slope * ((grp[0].stemX + grp[grp.length - 1].stemX) / 2 - bm.x1) + (dir > 0 ? -9 : 14); }
          const mx = (x1 + x2) / 2, h = dir > 0 ? 5 : -5;
          if (!beamed) deco[first.sys].push(`<path d="M${f(x1)} ${f(y + h)}V${f(y)}H${f(mx - 8)}M${f(mx + 8)} ${f(y)}H${f(x2)}V${f(y + h)}" fill="none" stroke="${INK}" stroke-width="1.2"/>`);
          deco[first.sys].push(`<text x="${f(mx)}" y="${f(y + (beamed ? 4 : 4))}" text-anchor="middle" font-size="12" font-style="italic" font-weight="700" fill="${INK}" ${SERIF}>${n}</text>`);
        }
        if (v > 0) continue;
        // hairpins
        fl.forEach((it, k) => {
          if (!it.e.hp || it.e.hp === 'end') return;
          let j = k + 1; while (j < fl.length && !fl[j].e.dyn && !fl[j].e.hp) j++;
          const tg = j < fl.length ? fl[j] : fl[fl.length - 1]; if (tg === it && j >= fl.length) return;
          const segs = segments(L, it, tg), lens = segs.map((sg) => {
            const xa = sg.first ? sg.xa + (it.e.dyn ? 14 : -4) : sg.xa, xb = sg.last ? sg.xb - (j < fl.length && tg.e.dyn ? 14 : 8) : sg.xb; return { xa, xb };
          });
          const tot = lens.reduce((q, l) => q + Math.max(0, l.xb - l.xa), 0) || 1; let acc = 0; const A = 6;
          segs.forEach((sg, si) => {
            const { xa, xb } = lens[si]; if (xb < xa + 6) return;
            const f0 = acc / tot, f1 = (acc + xb - xa) / tot; acc += xb - xa;
            const cr = it.e.hp === 'cr', h0 = cr ? Math.max(0.5, A * f0) : A * (1 - f0), h1 = cr ? A * f1 : Math.max(0.5, A * (1 - f1));
            const y = L.systems[sg.s].partTop[pi] + STAFF + pm.dynY - 5;
            deco[sg.s].push(`<path d="M${f(xa)} ${f(y - h0)}L${f(xb)} ${f(y - h1)}M${f(xa)} ${f(y + h0)}L${f(xb)} ${f(y + h1)}" fill="none" stroke="${INK}" stroke-width="1.3"/>`);
          });
        });
        // octave lines
        fl.forEach((it, k) => {
          if (!it.e.ov) return;
          let j = k + 1; while (j < fl.length && fl[j].e.ov == null) j++;
          const tg = j < fl.length ? fl[j] : fl[fl.length - 1], up = it.e.ov > 0, endIn = j < fl.length;
          segments(L, it, tg).forEach((sg) => {
            const top = L.systems[sg.s].partTop[pi], y = up ? top - 22 - (pm.hasCh ? 14 : 0) : top + STAFF + 10;
            const xa = sg.first ? sg.xa - 8 : sg.xa, xb = sg.last ? (endIn ? sg.xb - 6 : sg.xb + 6) : sg.xb;
            if (sg.first) deco[sg.s].push(`<text x="${f(xa)}" y="${f(y + 4)}" font-size="12" font-style="italic" font-weight="700" fill="${INK}" ${SERIF}>${up ? '8va' : '8vb'}</text>`);
            deco[sg.s].push(`<path d="M${f(xa + (sg.first ? 26 : 0))} ${f(y)}H${f(Math.max(xb, xa + 30))}${sg.last ? 'v' + (up ? 8 : -8) : ''}" fill="none" stroke="${INK}" stroke-width="1.2" stroke-dasharray="4 3"/>`);
          });
        });
      }
    });
    return deco;
  }

  /* ---------- barlines, repeats and navigation marks ---------- */
  FS.barline = function (S, m, last, xl, xr, top, spanTo) {
    const mk = S.meas[m] || {}, o = [], ln = (x, w) => `<line x1="${f(x)}" y1="${top}" x2="${f(x)}" y2="${spanTo}" stroke="#222"${w ? ` stroke-width="${w}"` : ''}/>`;
    const dots = (x) => [15, 25].map((y) => `<circle cx="${f(x)}" cy="${top + y}" r="2" fill="#222"/>`).join('');
    if (mk.re) o.push(ln(xr - 8.5) + ln(xr - 2.5, 3.2) + dots(xr - 13.5));
    else if (last || mk.bar === 'fin') o.push(ln(xr - 4.5) + ln(xr - 1, 3.2));
    else if (mk.bar === 'dbl') o.push(ln(xr - 4) + ln(xr));
    else o.push(ln(xr));
    if (mk.rs) o.push(ln(xl + 2, 3.2) + ln(xl + 6.5) + dots(xl + 12));
    return o.join('');
  };
  function segnoSvg(x, y, c) { return `<g transform="translate(${f(x)},${f(y)})" fill="none" stroke="${c}" stroke-width="1.5"><path d="M7 -9C4 -13 -2 -10 0 -6S9 0 8 5S0 10 -3 6"/><line x1="9" y1="-12" x2="-4" y2="10"/></g><circle cx="${f(x + 1)}" cy="${f(y - 3)}" r="1.1" fill="${c}"/><circle cx="${f(x + 7)}" cy="${f(y + 3)}" r="1.1" fill="${c}"/>`; }
  function codaSvg(x, y, c) { return `<g fill="none" stroke="${c}" stroke-width="1.4"><circle cx="${f(x + 6)}" cy="${f(y)}" r="5.2"/><line x1="${f(x + 6)}" y1="${f(y - 9)}" x2="${f(x + 6)}" y2="${f(y + 9)}"/><line x1="${f(x - 3)}" y1="${f(y)}" x2="${f(x + 15)}" y2="${f(y)}"/></g>`; }
  FS.marks = function (S, L, sys) {
    const o = [], T = L.T, top = sys.partTop[0], base = top - L.pm[0].above + 14, c = INK;
    const hasFine = S.meas.some((q) => q && q.fine), hasCoda = S.meas.some((q) => q && q.tocoda);
    const txt = (x, y, t, st, anc) => `<text x="${f(x)}" y="${f(y)}"${anc ? ` text-anchor="${anc}"` : ''} font-size="12" ${st || ''} fill="${c}" ${SERIF}>${esc(t)}</text>`;
    let tempo = S.tempo; for (let i = 0; i < sys.ms[0].m; i++) if (S.meas[i] && S.meas[i].tempo) tempo = S.meas[i].tempo;
    let rehN = 0; for (let i = 0; i < sys.ms[0].m; i++) if (S.meas[i] && S.meas[i].reh) rehN++;
    const vruns = [];
    sys.ms.forEach((mo, j) => {
      const m = mo.m, mk = S.meas[m] || {}; let x = mo.x + 4 + (mk.rs ? 12 : 0);
      if (mk.tempo && m > 0) { o.push(txt(x, base, '♩ = ' + mk.tempo, 'font-weight="700"')); x += 56; }
      if (mk.reh) { const lab = String.fromCharCode(65 + (rehN++ % 26)); o.push(`<rect x="${f(x)}" y="${f(base - 12)}" width="18" height="17" fill="none" stroke="${c}" stroke-width="1.6"/>` + txt(x + 9, base + 1, lab, 'font-weight="700" font-size="13"', 'middle')); x += 24; }
      if (mk.segno) { o.push(segnoSvg(x + 2, base - 2, c)); x += 22; }
      if (mk.coda) { o.push(codaSvg(x, base - 2, c)); x += 24; }
      if (mk.txt) { o.push(txt(x, base, mk.txt, 'font-weight="700" font-style="italic"')); x += 10 + mk.txt.length * 7; }
      if (mk.ramp) { const up = mk.ramp.to > tempo; o.push(txt(x, base, up ? 'accel.' : 'rit.', 'font-style="italic"') + `<line x1="${f(x + 36)}" y1="${f(base - 3)}" x2="${f(Math.min(mo.xEnd - 4, x + 36 + 40 * mk.ramp.n))}" y2="${f(base - 3)}" stroke="${c}" stroke-dasharray="4 3"/>`); }
      if (mk.tempo) tempo = mk.tempo;
      const rx = mo.xEnd - 5;
      if (mk.tocoda) o.push(txt(rx, base, 'To Coda', 'font-style="italic" font-weight="700"', 'end'));
      if (mk.fine) o.push(txt(rx, base, 'Fine', 'font-style="italic" font-weight="700"', 'end'));
      if (mk.ds || mk.dc) o.push(txt(rx, base, (mk.ds ? 'D.S.' : 'D.C.') + (hasFine ? ' al Fine' : hasCoda ? ' al Coda' : ''), 'font-style="italic" font-weight="700"', 'end'));
      if (mk.volta) { const prev = vruns[vruns.length - 1]; if (prev && prev.v === mk.volta && prev.mEnd === m - 1) { prev.mEnd = m; prev.x2 = mo.xEnd; } else vruns.push({ v: mk.volta, m0: m, mEnd: m, x1: mo.x + (mk.rs ? 12 : 3), x2: mo.xEnd }); }
    });
    vruns.forEach((r) => {
      const y = base + 6, startsHere = !(r.m0 === sys.ms[0].m && r.m0 > 0 && S.meas[r.m0 - 1] && S.meas[r.m0 - 1].volta === r.v), endsHere = r.mEnd + 1 >= T.n || !(S.meas[r.mEnd + 1] && S.meas[r.mEnd + 1].volta === r.v);
      o.push(`<path d="M${f(r.x1)} ${f(y + (startsHere ? 12 : 0))}V${f(y)}H${f(r.x2 - 2)}${r.v === 1 && endsHere ? 'v12' : ''}" fill="none" stroke="${c}" stroke-width="1.2"/>`);
      if (startsHere) o.push(txt(r.x1 + 4, y + 11, r.v + '.', 'font-weight="700"'));
    });
    return o.join('');
  };


  /* ---------- tablature staff ---------- */
  function tabFret(tune, midis) {
    const used = new Set(), out = new Map();
    midis.slice().sort((a, b) => b - a).forEach((mm) => {
      let best = null;
      tune.forEach((open, si) => { const fr = mm - open; if (fr >= 0 && fr <= 20 && !used.has(si) && (!best || fr < best.fr)) best = { si, fr }; });
      if (!best) { const si = tune.findIndex((open, i) => !used.has(i)); if (si >= 0) best = { si, fr: Math.max(0, mm - tune[si]) }; }
      if (best) { used.add(best.si); out.set(mm, best); }
    });
    return out;
  }
  FS.tabs = function (S, L, sys) {
    const o = [];
    S.parts.forEach((P, pi) => {
      if (!P.tab || !FS.TABS[P.tab]) return;
      const tune = FS.TABS[P.tab], n = tune.length, pm = L.pm[pi], shift = FS.CLEFS[P.clef].shift + (P.trans || 0), sp = n > 4 ? 10 : 12;
      const y0 = sys.partTop[pi] + STAFF + pm.tabTop, y1 = y0 + (n - 1) * sp, xa = sys.hx - 6, xb = sys.ms[sys.ms.length - 1].xEnd;
      o.push(`<line x1="${f(sys.x0)}" y1="${f(y0)}" x2="${f(sys.x0)}" y2="${f(y1)}" stroke="#222" stroke-width="1.6"/>`);
      for (let k = 0; k < n; k++) o.push(`<line x1="${f(sys.x0)}" y1="${f(y0 + k * sp)}" x2="${f(xb)}" y2="${f(y0 + k * sp)}" stroke="#222" stroke-width=".9"/>`);
      ['T', 'A', 'B'].forEach((ch, i) => o.push(`<text x="${f(sys.x0 + 16)}" y="${f(y0 + (y1 - y0) / 2 + (i - 1) * 13 + 4.5)}" text-anchor="middle" font-size="13" font-weight="800" fill="#222" ${SERIF}>${ch}</text>`));
      sys.ms.forEach((mo) => {
        o.push(`<line x1="${f(mo.xEnd)}" y1="${f(y0)}" x2="${f(mo.xEnd)}" y2="${f(y1)}" stroke="#222"/>`);
        (L.items[pi + '|' + mo.m] || []).forEach((items) => items.forEach((it) => {
          if (it.rest || !it.heads) return;
          const mm = it.e.p.map((p) => FS.midi(p) + shift), asg = tabFret(tune, mm);
          mm.forEach((q) => {
            const a = asg.get(q); if (!a) return; const y = y0 + a.si * sp, t = String(a.fr);
            o.push(`<rect x="${f(it.x - 4.5 * t.length - 1)}" y="${f(y - 6)}" width="${9 * t.length + 2}" height="12" fill="#fff"/><text x="${f(it.x)}" y="${f(y + 4)}" text-anchor="middle" font-size="12" font-weight="700" fill="${INK}" ${FONT}>${t}</text>`);
          });
        }));
      });
    });
    return o.join('');
  };

  FS.decor = function (S, L, sys) {
    if (!L._deco) L._deco = spanners(S, L);
    const o = [];
    S.parts.forEach((P, pi) => {
      sys.ms.forEach((mo) => {
        const lists = L.items[pi + '|' + mo.m] || [];
        lists.forEach((items) => items.forEach((it) => itemDecor(it, S, L, o)));
      });
    });
    return FS.marks(S, L, sys) + FS.tabs(S, L, sys) + o.join('') + L._deco[sys.index].join('');
  };
})();
