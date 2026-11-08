/* Fry Score — boot */
(function () {
  'use strict';
  const FS = window.FS;
  function boot() {
    FS.ui.init();
    let S = null;
    try { S = FS.io.loadAutosave(); } catch (e) { S = null; }
    FS.ui.reset(S || FS.newScore('lead'));
    if (FS.ui.fileApply) FS.ui.fileApply();
    FS.ui.fit();
    let rz = 0, wasNarrow = document.getElementById('desk').clientWidth < 700;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { const n = document.getElementById('desk').clientWidth < 700; if (n !== wasNarrow) { wasNarrow = n; FS.ui.fit(); } }, 200); });
    window.FSCORE = { app: FS.app, FS };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
