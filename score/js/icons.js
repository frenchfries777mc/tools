/* Fry Score — SVG icons for the toolbars (MuseScore-style note input glyphs). */
(function () {
  'use strict';
  const FS = window.FS;
  const svg = (body, vb) => `<svg viewBox="${vb || '0 0 24 24'}" width="24" height="24" aria-hidden="true" focusable="false">${body}</svg>`;
  const head = (cx, cy, filled) => `<ellipse cx="${cx}" cy="${cy}" rx="4.6" ry="3.3" transform="rotate(-22 ${cx} ${cy})" ${filled ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.8"'}/>`;
  const flags = (n) => { let s = ''; for (let i = 0; i < n; i++) s += `<path d="M14.1 ${3 + i * 3.6}c0.5 4 5.2 4.4 4.4 9.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`; return s; };
  const note = (filled, nflag, stem) => svg(head(9.5, 18, filled) + (stem ? `<line x1="13.9" y1="17" x2="13.9" y2="3" stroke="currentColor" stroke-width="1.8"/>` : '') + flags(nflag));
  const I = (FS.icons = {
    n64: note(true, 4, true), n32: note(true, 3, true), n16: note(true, 2, true), n8: note(true, 1, true), n4: note(true, 0, true), n2: note(false, 0, true),
    n1: svg('<ellipse cx="12" cy="12" rx="7.5" ry="5" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="12" cy="12" rx="2.2" ry="4.4" transform="rotate(35 12 12)" fill="none" stroke="currentColor" stroke-width="1.8"/>'),
    dot: svg('<circle cx="12" cy="12" r="2.8" fill="currentColor"/>'),
    rest: svg('<path d="M10 3.5l5 5.5-4.2 4.6 5 5.5c-2.6-1.3-4.6 0-4 2.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
    sharp: svg('<g stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="9" y1="3.5" x2="9" y2="20.5"/><line x1="15" y1="2.5" x2="15" y2="19.5"/><line x1="5.5" y1="9.5" x2="18.5" y2="6.8" stroke-width="3"/><line x1="5.5" y1="17.2" x2="18.5" y2="14.5" stroke-width="3"/></g>'),
    flat: svg('<path d="M8.5 2.5v18M8.5 20.5c9-4.2 9.5-9.4 0-9.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
    natural: svg('<g stroke="currentColor" stroke-width="1.9" stroke-linecap="round" fill="none"><path d="M8 3v13.5l9-2.4"/><path d="M16 21V7.5l-8 2.4"/></g>'),
    tie: svg('<path d="M3.5 9c3 8.5 14 8.5 17 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="4" cy="8" r="1.7" fill="currentColor"/><circle cx="20" cy="8" r="1.7" fill="currentColor"/>'),
    chord: svg(head(10, 6.5, true) + head(10, 12.5, true) + head(10, 18.5, true) + '<line x1="14.3" y1="19" x2="14.3" y2="3.5" stroke="currentColor" stroke-width="1.8"/>'),
    pencil: svg('<path d="M4 20l1-4.5L16.5 4a2 2 0 0 1 3 0l.5.5a2 2 0 0 1 0 3L8.5 19z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 6.5l3.5 3.5" stroke="currentColor" stroke-width="1.8"/>'),
    arrow: svg('<path d="M6 3l12 9-5.2 1.1 3 5.6-2.4 1.3-3-5.6L6 18z" fill="currentColor"/>'),
    piano: svg('<rect x="2.5" y="4.5" width="19" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8.8 4.5v15M15.2 4.5v15" stroke="currentColor" stroke-width="1.5"/><rect x="7" y="4.5" width="3.6" height="8.5" fill="currentColor"/><rect x="13.4" y="4.5" width="3.6" height="8.5" fill="currentColor"/>'),
    trash: svg('<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5h16M9.5 6.5V4h5v2.5M6 6.5l1 13.5h10l1-13.5M10 10.5v6M14 10.5v6"/></g>'),
    undo: svg('<path d="M9 7L4 12l5 5M4.5 12H15a5 5 0 0 1 0 10" transform="translate(0 -3)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
    redo: svg('<path d="M15 7l5 5-5 5M19.5 12H9a5 5 0 0 0 0 10" transform="translate(0 -3)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
    play: svg('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>'),
    pause: svg('<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/>'),
    stop: svg('<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor"/>'),
    zoomIn: svg('<circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M15 15l5.5 5.5M10.5 7.8v5.4M7.8 10.5h5.4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>'),
    zoomOut: svg('<circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M15 15l5.5 5.5M7.8 10.5h5.4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>'),
    fit: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
    open: svg('<path d="M3.5 6.5h6l2 2.5h9v10.5h-17z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>'),
    save: svg('<path d="M12 3.5v11M7.5 10.5l4.5 4.5 4.5-4.5M4.5 19.5h15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>')
  });
  const VCOL = ['#2d7ff9', '#3fa34d', '#f08a1c', '#a855f7'];
  I.voice = (v) => svg(`<rect x="3" y="3" width="18" height="18" rx="4" fill="${VCOL[v]}"/><text x="12" y="17" text-anchor="middle" font-size="14" font-weight="800" fill="#fff" font-family="Noto Sans KR,sans-serif">${v + 1}</text>`);
  I.byDur = { 64: I.n1, 32: I.n2, 16: I.n4, 8: I.n8, 4: I.n16, 2: I.n32, 1: I.n64 };
})();
