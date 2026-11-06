/* Fry Score — boot */
(function () {
  'use strict';
  const FS = window.FS;
  function boot() {
    FS.ui.init();
    let S = null;
    try { S = FS.io.loadAutosave(); } catch (e) { S = null; }
    FS.ui.reset(S || FS.newScore('lead'));
    FS.ui.fit();
    window.FSCORE = { app: FS.app, FS };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
