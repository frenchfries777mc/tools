/* Fry Score — shared helpers. Everything lives under the FS namespace. */
(function () {
  'use strict';
  const FS = (window.FS = window.FS || {});
  FS.EPS = 1e-6;
  FS.$ = (id) => document.getElementById(id);
  FS.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  FS.f = (n) => +(+n).toFixed(2);
  FS.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  FS.clone = (o) => JSON.parse(JSON.stringify(o));
  FS.eq = (a, b) => Math.abs(a - b) < 1e-4;
  FS.toast = function (text) {
    const d = document.createElement('div');
    d.className = 'toast';
    d.setAttribute('role', 'status');
    d.textContent = text;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2600);
    const live = FS.$('live');
    if (live) live.textContent = text;
  };
  FS.store = {
    get(k, fallback) { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    raw(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    setRaw(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  };
})();
