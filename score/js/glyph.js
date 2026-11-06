/* Fry Score — vector glyphs. Staff space = 10 units, all functions return SVG markup. */
(function () {
  'use strict';
  const FS = window.FS, f = FS.f;
  const G = (FS.glyph = {});

  /** Clef drawn so that its curl / dots sit on the right staff line. (x, top) = left edge position and top staff line. */
  G.clef = function (clef, x, top, c) {
    c = c || '#111';
    if (clef === 'bass') {
      return `<g transform="translate(${x} ${top + 10})"><path fill="${c}" d="M-6 -4.6C2 -8 14 -4.5 14 6C14 18 3 27 -12 33L-12.6 31.4C-1 25 6 16 6 6C6 -1 2 -3 -1.5 -1.2A4.3 4.3 0 1 1 -6 -4.6Z"/><circle cx="17" cy="-5" r="1.9" fill="${c}"/><circle cx="17" cy="5" r="1.9" fill="${c}"/></g>`;
    }
    if (clef === 'drum') {
      return `<g fill="${c}"><rect x="${x - 6}" y="${top + 12}" width="4.5" height="16"/><rect x="${x + 2}" y="${top + 12}" width="4.5" height="16"/></g>`;
    }
    if (clef === 'alto') {
      const y = 20;
      return `<g transform="translate(${x} ${top + y})" fill="${c}"><rect x="-9" y="-20" width="4" height="40"/><rect x="-3" y="-20" width="1.3" height="40"/><path fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" d="M0.5 -1.2C2 -8 5 -14.5 10 -14.5C15.5 -14.5 15.5 -7 11 -6.2C8.2 -5.8 6.2 -6.6 5.2 -7.8M0.5 1.2C2 8 5 14.5 10 14.5C15.5 14.5 15.5 7 11 6.2C8.2 5.8 6.2 6.6 5.2 7.8"/></g>`;
    }
    let g = `<g transform="translate(${x} ${top + 30})" fill="none" stroke="${c}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 25.5C3.5 30 -3 31 -4.5 27C-5.5 24 -2 22 0 23.5C1.2 24.5 1 26 0 26.2M0 23.6C1.6 12 -0.6 -2 -1.4 -12C-2 -22 -1.6 -31 3 -38.5C7.5 -32 6.5 -24 0.5 -15C-4 -8.5 -9.5 -4 -8.5 2.5C-7.6 8.5 -2.6 11.6 2.6 11.2C8.6 10.7 11.4 5.8 10 1C8.6 -3.6 3.6 -5.6 0 -4.2C-3 -3 -3.6 1.6 -0.8 3C1.2 4 3.2 2.4 2.8 0.6"/></g>`;
    if (clef === 'treble8') g += `<text x="${x + 1}" y="${top + 72}" text-anchor="middle" font-size="12" font-weight="700" fill="${c}" font-family="Noto Sans KR,sans-serif">8</text>`;
    return g;
  };

  /** Accidental centred on (x, y). kind: -2 double flat, -1 flat, 0 natural, 1 sharp, 2 double sharp */
  G.acc = function (kind, x, y, c) {
    c = c || '#111';
    const flat = (dx) => `<path d="M${dx - 3} -13V6M${dx - 3} 6C${dx + 2} 3 ${dx + 6.5} 0 ${dx + 5.8} -3.6C${dx + 5} -7 ${dx - 0.5} -6.5 ${dx - 3} -1.8" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>`;
    let inner;
    if (kind === 1) inner = `<path d="M-2.4 -9V11M2.4 -11V9" stroke="${c}" stroke-width="1.1"/><path d="M-5 4.2L5 1.4M-5 -1.4L5 -4.2" stroke="${c}" stroke-width="2.6"/>`;
    else if (kind === 0) inner = `<path d="M-3 -10V3.6M3 -3.6V10" stroke="${c}" stroke-width="1.2"/><path d="M-3 3.6L3 1.9M-3 -1.9L3 -3.6" stroke="${c}" stroke-width="2.4"/>`;
    else if (kind === -1) inner = flat(0);
    else if (kind === -2) inner = flat(-3) + flat(3);
    else inner = `<path d="M-4.5 -4.5L4.5 4.5M-4.5 4.5L4.5 -4.5" stroke="${c}" stroke-width="2.6"/>`;
    return `<g transform="translate(${f(x)} ${f(y)})">${inner}</g>`;
  };

  /** Notehead; base = written value (64 whole … 1), hd = optional shape */
  G.head = function (base, x, y, c, hd) {
    c = c || '#111';
    x = f(x); y = f(y);
    const open = base >= 32;
    if (hd === 'x') return `<path d="M${x - 5} ${y - 5}L${x + 5} ${y + 5}M${x - 5} ${y + 5}L${x + 5} ${y - 5}" stroke="${c}" stroke-width="1.9" fill="none"/>`;
    if (hd === 'dia') return `<polygon points="${x},${y - 6} ${x + 6.5},${y} ${x},${y + 6} ${x - 6.5},${y}" fill="${open ? '#fff' : c}" stroke="${c}" stroke-width="${open ? 1.8 : 1}"/>`;
    if (hd === 'tri') return `<polygon points="${x - 6},${y + 4.5} ${x + 6},${y + 4.5} ${x},${y - 5.5}" fill="${open ? '#fff' : c}" stroke="${c}" stroke-width="${open ? 1.8 : 1}"/>`;
    if (base >= 64) {
      return `<ellipse cx="${x}" cy="${y}" rx="7" ry="4.6" fill="${c}"/><ellipse cx="${x}" cy="${y}" rx="2.5" ry="3.7" transform="rotate(-35 ${x} ${y})" fill="#fff"/>`;
    }
    return `<ellipse cx="${x}" cy="${y}" rx="6" ry="4.3" transform="rotate(-22 ${x} ${y})" fill="${open ? '#fff' : c}" stroke="${c}" stroke-width="${open ? 1.8 : 1}"/>`;
  };

  /** Flag attached to a stem tip. dir = +1 stem up (flag hangs down), -1 stem down. n = flag count (1..4) */
  G.flag = function (sx, tipY, dir, n, c) {
    c = c || '#111';
    let d = '';
    for (let i = 0; i < n; i++) {
      const y0 = tipY + dir * (i * 6.5);
      d += `M${f(sx)} ${f(y0)}c10 ${dir * 8} 8 ${dir * 18} 2 ${dir * 24}`;
    }
    return `<path d="${d}" fill="none" stroke="${c}" stroke-width="1.8"/>`;
  };

  /** Rest glyph. (x, top): horizontal centre and top staff line. */
  G.rest = function (base, x, top, c, whole) {
    c = c || '#111';
    const y = top;
    if (whole || base >= 64) return `<rect x="${x - 6}" y="${y + 10}" width="12" height="5" fill="${c}"/>`;
    if (base >= 32) return `<rect x="${x - 6}" y="${y + 15}" width="12" height="5" fill="${c}"/>`;
    if (base >= 16) return `<path d="M${x - 2} ${y + 8}L${x + 3} ${y + 15}L${x - 3} ${y + 22}L${x + 3} ${y + 29}C${x - 4} ${y + 27} ${x - 5} ${y + 33} ${x + 1} ${y + 34}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    const n = base >= 8 ? 1 : base >= 4 ? 2 : base >= 2 ? 3 : 4;
    let o = '';
    for (let i = 0; i < n; i++) {
      const yy = y + 16 + i * 8;
      o += `<circle cx="${x - 2 - i * 1.5}" cy="${yy}" r="2.4" fill="${c}"/><path d="M${x - 2 - i * 1.5} ${yy}Q${x + 3 - i * 1.5} ${yy} ${x + 4 - i * 1.5} ${yy - 4}L${x - 3 - n * 2 - i} ${y + 34 + (n > 2 ? (n - 2) * 8 : 0)}" fill="none" stroke="${c}" stroke-width="1.8"/>`;
    }
    return o;
  };

  G.dot = (x, y, c) => `<circle cx="${f(x)}" cy="${f(y)}" r="1.9" fill="${c || '#111'}"/>`;

  /** curved line (tie / slur) from (x1,y1) to (x2,y2); dir = +1 curve bulges downward, -1 upward */
  G.curve = function (x1, y1, x2, y2, dir, c, sw) {
    const dx = x2 - x1, h = FS.clamp(Math.abs(dx) * 0.14 + 4, 5, 18) * dir;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + h;
    return `<path d="M${f(x1)} ${f(y1)}Q${f(mx)} ${f(my + h * 0.35)} ${f(x2)} ${f(y2)}" fill="none" stroke="${c || '#111'}" stroke-width="${sw || 1.6}" stroke-linecap="round"/>`;
  };
})();
