/* Fry Score — vector symbols for the side-panel buttons (real notation signs instead of words). All use currentColor. */
(function () {
  'use strict';
  const FS = window.FS;
  const S = {};
  const sv = (body) => `<svg viewBox="0 0 36 24" aria-hidden="true" focusable="false">${body}</svg>`;
  const st = (d, w, extra) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round"${extra ? ' ' + extra : ''}/>`;
  const it = (x, y, size, txt, anchor) => `<text x="${x}" y="${y}" text-anchor="${anchor || 'middle'}" font-size="${size}" font-weight="700" font-style="italic" fill="currentColor" font-family="'Times New Roman',Georgia,serif">${txt}</text>`;
  const head = (cx, cy, fill) => `<ellipse cx="${cx}" cy="${cy}" rx="4.4" ry="3.2" transform="rotate(-22 ${cx} ${cy})" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.7"'}/>`;
  const dot = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r || 1.8}" fill="currentColor"/>`;

  /* dynamics */
  ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sfz'].forEach((d) => { S['dyn_' + d] = sv(it(18, 17, d.length >= 3 ? 14 : 17, d)); });
  S.cr = sv(st('M31 5L5 12L31 19', 2)); S.de = sv(st('M5 5L31 12L5 19', 2));
  S.hend = sv(st('M6 12H27', 1.8, 'stroke-dasharray="3 3"') + st('M30 6V18', 2));
  /* articulations & ornaments */
  S.stac = sv(dot(18, 12, 3));
  S.acc = sv(st('M8 5L28 12L8 19', 2.4));
  S.ten = sv(st('M7 12H29', 3.2));
  S.marc = sv(st('M9 19L18 5L27 19', 2.4));
  S.ferm = sv(st('M6 18C6 2 30 2 30 18', 2.2) + dot(18, 15, 2.4));
  S.tr = sv(it(10, 18, 15, 'tr') + st('M20 12q2.5 -4 5 0t5 0t5 0', 1.8));
  S.mord = sv(st('M4 14l4 -6 4 6 4 -6 4 6 4 -6 4 6 4 -6', 2) + st('M16 3V21', 1.6));
  S.turn = sv(st('M5 15C5 8 13 7 18 12C23 17 31 16 31 9', 2.2));
  S.trem = sv(st('M18 2V22', 1.8) + st('M11 9L25 6M11 13.5L25 10.5M11 18L25 15', 2.8));
  S.arp = sv(st('M18 1q4 2.4 0 4.8t0 4.8t0 4.8t0 4.8t0 4.8', 2));
  S.dbow = sv(st('M7 19V6H29V19', 2.2));
  S.ubow = sv(st('M8 4L18 20L28 4', 2.2));
  /* slurs, grace notes, tuplets */
  S.slur = sv(st('M4 17C11 3 25 3 32 17', 2.2));
  const grace = (up) => { const y = up ? 8 : 17; return sv(head(8, y, true) + st(`M12.2 ${y - 1}V${y - 9}c0.5 3 4 3 3.4 6.5`, 1.5) + st(`M6 ${y - 6}L16 ${y - 11}`, 1.3) + head(26, 16, true) + st('M30.3 15V3', 1.8)); };
  S.graceUp = grace(true); S.graceDn = grace(false);
  S.nograce = sv(S.graceDn.replace(/^<svg[^>]*>|<\/svg>$/g, '') + st('M5 3L31 21', 2.2, 'opacity=".9"'));
  const tup = (n) => sv(st('M5 19V10H14M22 10H31V19', 1.8) + it(18, 15, 13, n));
  [3, 5, 6, 7, 9].forEach((n) => { S['tup' + n] = tup(n); });
  S.notup = sv(st('M5 19V10H14M22 10H31V19', 1.8) + st('M14 12L22 20M22 12L14 20', 2));
  /* note heads, ottava, pedal */
  S.hdN = sv(head(18, 12, true));
  S.hdX = sv(st('M12 6L24 18M24 6L12 18', 2.8));
  S.hdDia = sv('<path d="M18 5L27 12L18 19L9 12Z" fill="currentColor"/>');
  S.hdTri = sv('<path d="M18 5L28 19H8Z" fill="currentColor"/>');
  S.o8va = sv(it(3, 17, 12, '8va', 'start') + st('M27 11H34V17', 1.6, 'stroke-dasharray="2.5 2"'));
  S.o8vb = sv(it(3, 11, 12, '8vb', 'start') + st('M27 17H34V11', 1.6, 'stroke-dasharray="2.5 2"'));
  S.o8end = sv(st('M3 12H27', 1.6, 'stroke-dasharray="2.5 2"') + st('M30 6V18', 1.8));
  S.pedD = sv(it(18, 17, 14, 'Ped.'));
  S.pedU = sv(st('M18 4V20M11.5 7.5L24.5 16.5M11.5 16.5L24.5 7.5', 2));
  /* measure marks */
  const bar = (x, w) => `<rect x="${x}" y="3" width="${w}" height="18" fill="currentColor"/>`;
  S.rs = sv(bar(7, 3.6) + bar(13, 1.3) + dot(19.5, 9.5, 1.9) + dot(19.5, 14.5, 1.9));
  S.re = sv(dot(16.5, 9.5, 1.9) + dot(16.5, 14.5, 1.9) + bar(21.7, 1.3) + bar(26, 3.6));
  S.volta1 = sv(st('M5 20V6H31', 1.8) + `<text x="9" y="17" font-size="12" font-weight="700" fill="currentColor" font-family="'Times New Roman',serif">1.</text>`);
  S.volta2 = sv(st('M5 20V6H31', 1.8) + `<text x="9" y="17" font-size="12" font-weight="700" fill="currentColor" font-family="'Times New Roman',serif">2.</text>`);
  S.segno = sv(st('M23 4C18 0 10 3 13 8S26 14 22 19S10 23 8 18', 1.9) + st('M27 3L7 21', 1.6) + dot(10, 8.5, 1.5) + dot(25, 14.5, 1.5));
  S.coda = sv('<circle cx="18" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/>' + st('M18 2V22M8 12H28', 1.6));
  S.tocoda = sv(it(2, 16, 11, 'To', 'start') + '<circle cx="26" cy="12" r="4.4" fill="none" stroke="currentColor" stroke-width="1.5"/>' + st('M26 5V19M19 12H33', 1.3));
  S.ds = sv(it(18, 17, 13, 'D.S.')); S.dc = sv(it(18, 17, 13, 'D.C.')); S.fine = sv(it(18, 17, 14, 'Fine'));
  S.reh = sv('<rect x="9" y="4" width="18" height="16" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/>' + `<text x="18" y="17" text-anchor="middle" font-size="12" font-weight="800" fill="currentColor" font-family="sans-serif">A</text>`);
  S.bdbl = sv(bar(13, 1.5) + bar(19, 1.5));
  S.bfin = sv(bar(12, 1.5) + bar(18, 4.2));
  /* editing */
  S.copy = sv('<rect x="13" y="4" width="13" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/>' + st('M10 8V20H21', 1.8));
  S.cut = sv('<circle cx="13" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="23" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/>' + st('M14.5 15.5L23.5 3M21.5 15.5L12.5 3', 1.8));
  S.paste = sv('<rect x="9" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="14" y="2.5" width="8" height="4.5" rx="1.2" fill="currentColor"/>' + st('M13 12H23M13 16H21', 1.5));
  S.octUp = sv(it(14, 17, 14, '8') + st('M26 19V6M21.5 10.5L26 6L30.5 10.5', 2));
  S.octDn = sv(it(14, 17, 14, '8') + st('M26 5V18M21.5 13.5L26 18L30.5 13.5', 2));
  S.trash = sv(FS.icons.trash.replace(/^<svg[^>]*>|<\/svg>$/g, '').replace(/^/, '<g transform="translate(6 0)">') + '</g>');
  FS.sym = S;
})();
