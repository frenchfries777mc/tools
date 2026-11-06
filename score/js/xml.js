/* Fry Score — MusicXML (partwise) export and import. */
(function () {
  'use strict';
  const FS = window.FS, IO = FS.io, esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const DIV = 1680, K = DIV / 16; // divisions per quarter; one unit (1/64 whole) = K divisions
  const STEP = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const TYPE = { 64: 'whole', 32: 'half', 16: 'quarter', 8: 'eighth', 4: '16th', 2: '32nd', 1: '64th' };
  const TYPE_R = { whole: 64, half: 32, quarter: 16, eighth: 8, '16th': 4, '32nd': 2, '64th': 1 };
  const CLEFX = { treble: ['G', 2, 0], treble8: ['G', 2, -1], bass: ['F', 4, 0], alto: ['C', 3, 0], drum: ['percussion', 2, 0] };
  const KINDS = { '': 'major', m: 'minor', 7: 'dominant', maj7: 'major-seventh', m7: 'minor-seventh', dim: 'diminished', aug: 'augmented', sus4: 'suspended-fourth', sus2: 'suspended-second', 6: 'major-sixth', m6: 'minor-sixth' };
  const KIND_R = { major: '', minor: 'm', dominant: '7', 'major-seventh': 'maj7', 'minor-seventh': 'm7', diminished: 'dim', augmented: 'aug', 'suspended-fourth': 'sus4', 'suspended-second': 'sus2', 'major-sixth': '6', 'minor-sixth': 'm6' };
  const ART = { stac: '<articulations><staccato/></articulations>', acc: '<articulations><accent/></articulations>', ten: '<articulations><tenuto/></articulations>', marc: '<articulations><strong-accent/></articulations>', ferm: '<fermata/>', tr: '<ornaments><trill-mark/></ornaments>', mord: '<ornaments><mordent/></ornaments>', turn: '<ornaments><turn/></ornaments>', trem: '<ornaments><tremolo type="single">3</tremolo></ornaments>', arp: '<arpeggiate/>', dbow: '<technical><down-bow/></technical>', ubow: '<technical><up-bow/></technical>' };
  const HEAD = { x: 'x', dia: 'diamond', tri: 'triangle' };

  /* ================= export ================= */
  IO.exportXml = function (S) {
    const T = FS.mtab(S), o = [];
    o.push('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n<score-partwise version="3.1">');
    o.push(`<work><work-title>${esc(S.name || '')}</work-title></work><identification>${S.composer ? `<creator type="composer">${esc(S.composer)}</creator>` : ''}<encoding><software>Fry Score</software></encoding></identification>`);
    o.push('<part-list>');
    S.parts.forEach((P, i) => {
      const inst = FS.INSTS.filter((x) => x[0] === P.inst)[0];
      o.push(`<score-part id="P${i + 1}"><part-name>${esc(P.name)}</part-name><midi-instrument id="P${i + 1}-I1"><midi-channel>${P.clef === 'drum' ? 10 : (i % 15) + 1}</midi-channel><midi-program>${(inst ? inst[2] : 0) + 1}</midi-program><volume>${P.vol}</volume></midi-instrument></score-part>`);
    });
    o.push('</part-list>');
    // inherited marks for tempo
    S.parts.forEach((P, pi) => {
      o.push(`<part id="P${pi + 1}">`);
      const nv = Math.max(...P.m.map((V) => V.length));
      // slur ends: per voice flat list
      const slurStop = new Set(), slurStart = new Set(); const lyState = {};
      for (let v = 0; v < nv; v++) {
        const flat = []; P.m.forEach((V, m) => (V[v] || []).forEach((e, i) => flat.push({ e, k: m + '|' + v + '|' + i })));
        flat.forEach((q, k) => { if (!q.e.slur || !q.e.p.length) return; let want = +q.e.slur || 1; for (let j = k + 1; j < flat.length; j++) if (flat[j].e.p.length && --want <= 0) { slurStart.add(q.k); slurStop.add(flat[j].k); break; } });
      }
      for (let m = 0; m < T.n; m++) {
        const mk = S.meas[m] || {}, V = P.m[m];
        o.push(`<measure number="${m + 1}">`);
        if (mk.rs) o.push('<barline location="left"><bar-style>heavy-light</bar-style><repeat direction="forward"/></barline>');
        if (mk.volta && (m === 0 || !S.meas[m - 1] || S.meas[m - 1].volta !== mk.volta)) o.push(`<barline location="left"><ending number="${mk.volta}" type="start"/></barline>`);
        const chg = m === 0 || T.ts[m][0] !== T.ts[m - 1][0] || T.ts[m][1] !== T.ts[m - 1][1] || T.key[m] !== T.key[m - 1];
        if (chg) {
          const cx = CLEFX[P.clef] || CLEFX.treble;
          o.push(`<attributes>${m === 0 ? `<divisions>${DIV}</divisions>` : ''}<key><fifths>${T.key[m]}</fifths></key><time><beats>${T.ts[m][0]}</beats><beat-type>${T.ts[m][1]}</beat-type></time>${m === 0 ? `<clef><sign>${cx[0]}</sign><line>${cx[1]}</line>${cx[2] ? `<clef-octave-change>${cx[2]}</clef-octave-change>` : ''}</clef>` : ''}</attributes>`);
        }
        const tempo = m === 0 ? S.tempo : mk.tempo;
        if (tempo && pi === 0) o.push(`<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${tempo}</per-minute></metronome></direction-type><sound tempo="${tempo}"/></direction>`);
        if (mk.reh && pi === 0) o.push(`<direction placement="above"><direction-type><rehearsal>${esc(String.fromCharCode(65 + (S.meas.slice(0, m).filter((q) => q && q.reh).length % 26)))}</rehearsal></direction-type></direction>`);
        if (mk.txt && pi === 0) o.push(`<direction placement="above"><direction-type><words>${esc(mk.txt)}</words></direction-type></direction>`);
        if (mk.segno && pi === 0) o.push('<direction placement="above"><direction-type><segno/></direction-type></direction>');
        if (mk.coda && pi === 0) o.push('<direction placement="above"><direction-type><coda/></direction-type></direction>');
        V.forEach((E, v) => {
          if (v > 0) o.push(`<backup><duration>${Math.round(T.len[m] * K)}</duration></backup>`);
          let tpRun = 0;
          E.forEach((e, i) => {
            const key = m + '|' + v + '|' + i, d = FS.dur(e);
            if (e.ch) { const r = /^([A-G])([#b♯♭]?)(.*)$/.exec(e.ch); if (r) { const al = /[#♯]/.test(r[2]) ? 1 : r[2] ? -1 : 0, kk = KINDS[r[3]]; o.push(`<harmony><root><root-step>${r[1]}</root-step>${al ? `<root-alter>${al}</root-alter>` : ''}</root><kind${kk ? '' : ` text="${esc(r[3])}"`}>${kk || 'other'}</kind></harmony>`); } }
            if (e.dyn) o.push(`<direction placement="below"><direction-type><dynamics><${e.dyn}/></dynamics></direction-type></direction>`);
            if (e.hp) o.push(`<direction placement="below"><direction-type><wedge type="${e.hp === 'cr' ? 'crescendo' : e.hp === 'de' ? 'diminuendo' : 'stop'}"/></direction-type></direction>`);
            if (e.tx) o.push(`<direction placement="above"><direction-type><words>${esc(e.tx)}</words></direction-type></direction>`);
            (e.gr || []).forEach((g) => o.push(`<note><grace slash="yes"/><pitch><step>${STEP[g.s]}</step>${g.a ? `<alter>${g.a}</alter>` : ''}<octave>${g.o}</octave></pitch><voice>${v + 1}</voice><type>eighth</type></note>`));
            let tm = '', nt = [];
            if (e.tp) { tpRun = tpRun % e.tp; tm = `<time-modification><actual-notes>${e.tp}</actual-notes><normal-notes>${FS.tpBase(e.tp)}</normal-notes></time-modification>`; if (tpRun === 0) nt.push('<tuplet type="start"/>'); if (tpRun === e.tp - 1) nt.push('<tuplet type="stop"/>'); tpRun++; } else tpRun = 0;
            if (slurStart.has(key)) nt.push('<slur type="start" number="1"/>');
            if (slurStop.has(key)) nt.push('<slur type="stop" number="1"/>');
            if (e.art && ART[e.art]) nt.push(ART[e.art]);
            let lyr = '';
            [['ly', 1], ['ly2', 2]].forEach(([f, n]) => {
              if (!e[f]) return; const cont = /-$/.test(e[f]), txt = e[f].replace(/-$/, ''), st = lyState[pi + f + v];
              lyr += `<lyric number="${n}"><syllabic>${cont ? (st ? 'middle' : 'begin') : st ? 'end' : 'single'}</syllabic><text>${esc(txt)}</text></lyric>`; lyState[pi + f + v] = cont;
            });
            const whole = !e.p.length && e.d === T.len[m];
            if (!e.p.length) o.push(`<note>${whole ? '<rest measure="yes"/>' : '<rest/>'}<duration>${Math.round(e.d * K)}</duration><voice>${v + 1}</voice>${whole ? '' : `<type>${TYPE[d.base]}</type>${'<dot/>'.repeat(d.dots)}`}${tm}${nt.length ? `<notations>${nt.join('')}</notations>` : ''}${lyr}</note>`);
            else e.p.forEach((p, k) => {
              o.push(`<note>${k ? '<chord/>' : ''}<pitch><step>${STEP[p.s]}</step>${p.a ? `<alter>${p.a}</alter>` : ''}<octave>${p.o}</octave></pitch><duration>${Math.round(e.d * K)}</duration>${e.tie ? '<tie type="start"/>' : ''}${i > 0 && E[i - 1].tie && E[i - 1].p.length ? '<tie type="stop"/>' : ''}<voice>${v + 1}</voice><type>${TYPE[d.base]}</type>${'<dot/>'.repeat(d.dots)}${tm}${e.hd && HEAD[e.hd] ? `<notehead>${HEAD[e.hd]}</notehead>` : ''}${nt.length || e.tie ? `<notations>${e.tie ? '<tied type="start"/>' : ''}${i > 0 && E[i - 1].tie && E[i - 1].p.length ? '<tied type="stop"/>' : ''}${k === 0 ? nt.join('') : ''}</notations>` : ''}${k === 0 ? lyr : ''}</note>`);
            });
          });
        });
        if (mk.re) o.push('<barline location="right"><bar-style>light-heavy</bar-style>' + (mk.volta ? `<ending number="${mk.volta}" type="stop"/>` : '') + '<repeat direction="backward"/></barline>');
        else if (mk.volta && !(S.meas[m + 1] && S.meas[m + 1].volta === mk.volta)) o.push(`<barline location="right"><ending number="${mk.volta}" type="discontinue"/></barline>`);
        else if (mk.bar === 'dbl') o.push('<barline location="right"><bar-style>light-light</bar-style></barline>');
        else if (mk.bar === 'fin' || (m === T.n - 1 && pi >= 0)) o.push('<barline location="right"><bar-style>light-heavy</bar-style></barline>');
        o.push('</measure>');
      }
      o.push('</part>');
    });
    o.push('</score-partwise>');
    return new Blob([o.join('\n')], { type: 'application/vnd.recordare.musicxml+xml' });
  };

  /* ================= import ================= */
  const kids = (el, name) => Array.from(el.children).filter((c) => c.tagName === name);
  const kid = (el, name) => kids(el, name)[0] || null;
  const txt = (el, name) => { const k = el && kid(el, name); return k ? k.textContent.trim() : ''; };
  const num = (el, name, def) => { const v = parseFloat(txt(el, name)); return isFinite(v) ? v : def; };
  const DYNS = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sfz'];

  IO.readXml = function (text, name) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('xml');
    const root = doc.documentElement;
    if (root.tagName !== 'score-partwise') throw new Error('only partwise');
    const S = FS.newScore('lead'); S.parts = [];
    S.name = (txt(kid(root, 'work'), 'work-title') || txt(root, 'movement-title') || name || 'MusicXML').slice(0, 60);
    const ident = kid(root, 'identification'); if (ident) kids(ident, 'creator').forEach((c) => { if (c.getAttribute('type') === 'composer') S.composer = c.textContent.trim().slice(0, 60); });
    const pnames = {}; const pl = kid(root, 'part-list'); if (pl) kids(pl, 'score-part').forEach((sp) => { pnames[sp.getAttribute('id')] = txt(sp, 'part-name'); });
    const xparts = kids(root, 'part'); if (!xparts.length) throw new Error('no parts');
    /* pass 1: global marks from the first part */
    const marks = [], first = kids(xparts[0], 'measure'); let ts = [4, 4], key = 0, tempo = 0, curV = 0, ts0 = null, runKey = 0;
    first.forEach((me, i) => {
      const mk = {};
      kids(me, 'attributes').forEach((at) => {
        const t = kid(at, 'time'); if (t) { const b = num(t, 'beats', 4), bt = num(t, 'beat-type', 4); if (FS.TIMES.some((x) => x[0] === b && x[1] === bt) || ([1, 2, 4, 8, 16].indexOf(bt) >= 0 && b > 0 && b <= 32)) { if (i === 0) { ts = [b, bt]; ts0 = ts; } else if (b !== ts[0] || bt !== ts[1]) { mk.ts = [b, bt]; ts = [b, bt]; } } }
        const k = kid(at, 'key'); if (k) { const f = num(k, 'fifths', 0); if (i === 0) { key = f; runKey = f; } else if (f !== runKey) { mk.key = f; runKey = f; } }
      });
      Array.from(me.children).forEach((c) => {
        if (c.tagName === 'direction') {
          const snd = kid(c, 'sound'); if (snd && snd.getAttribute('tempo')) { const tp = Math.round(parseFloat(snd.getAttribute('tempo'))); if (tp >= 20 && tp <= 300) { if (!tempo) tempo = tp; else if (i > 0) mk.tempo = tp; } }
          kids(c, 'direction-type').forEach((dt) => { if (kid(dt, 'rehearsal')) mk.reh = true; if (kid(dt, 'segno')) mk.segno = true; if (kid(dt, 'coda')) mk.coda = true; const w = kid(dt, 'words'); if (w && /^(D\.?S\.?|D\.?C\.?|fine|to coda)/i.test(w.textContent.trim())) { const t = w.textContent.trim().toLowerCase(); if (t.indexOf('d.s') === 0 || t.indexOf('ds') === 0) mk.ds = true; else if (t.indexOf('d.c') === 0 || t.indexOf('dc') === 0) mk.dc = true; else if (t.indexOf('fine') === 0) mk.fine = true; else mk.tocoda = true; } });
        } else if (c.tagName === 'barline') {
          const rp = kid(c, 'repeat'); if (rp) { if (rp.getAttribute('direction') === 'forward') mk.rs = true; else mk.re = true; }
          const en = kid(c, 'ending'); if (en && en.getAttribute('type') === 'start') { const n = parseInt(en.getAttribute('number'), 10); curV = n === 1 || n === 2 ? n : 0; }
          if (en && en.getAttribute('type') !== 'start') mk.vstop = true;
          const bs = txt(c, 'bar-style'); if (bs === 'light-light') mk.bar = 'dbl';
        }
      });
      if (curV) mk.volta = curV; if (mk.vstop) curV = 0; delete mk.vstop;
      marks.push(mk);
    });
    S.ts = ts0 || ts; S.key = key; S.tempo = tempo || 100;
    let nmeas = 1; xparts.forEach((xp) => { nmeas = Math.max(nmeas, kids(xp, 'measure').length); });
    nmeas = Math.min(nmeas, 1000);
    S.meas = []; for (let i = 0; i < nmeas; i++) S.meas.push(marks[i] ? FS.fixMark(marks[i]) : {});
    /* part skeletons */
    const plan = []; // {xp, staffToPi:{}, clefs}
    xparts.forEach((xp) => {
      const id = xp.getAttribute('id'), me0 = kids(xp, 'measure')[0], at = me0 && kid(me0, 'attributes');
      const nst = at ? Math.max(1, num(at, 'staves', 1)) : 1, cl = {};
      if (at) kids(at, 'clef').forEach((c) => { const n = parseInt(c.getAttribute('number') || '1', 10), sg = txt(c, 'sign'), ln = num(c, 'line', 2), oc = num(c, 'clef-octave-change', 0); cl[n] = sg === 'F' ? 'bass' : sg === 'C' ? 'alto' : sg === 'percussion' ? 'drum' : oc < 0 ? 'treble8' : 'treble'; });
      const map = {};
      for (let k = 1; k <= Math.min(nst, 3); k++) {
        const P = FS.newPart((pnames[id] || '파트').slice(0, 24) + (nst > 1 ? ' ' + k : ''), cl[k] || (k > 1 ? 'bass' : 'treble'), 'piano');
        const inst = id && doc.querySelector('score-part[id="' + id + '"] midi-program'); if (inst) { const pg = parseInt(inst.textContent, 10) - 1; P.inst = FS.INSTS.reduce((b, x) => (Math.abs(x[2] - pg) < Math.abs(b[2] - pg) ? x : b), FS.INSTS[0])[0]; }
        if (nst > 1 && k === 1) P.brace = true;
        map[k] = S.parts.length; S.parts.push(P);
      }
      plan.push({ xp, map });
    });
    FS.growTo(S, nmeas);
    const T = FS.mtab(S);
    S.parts.forEach((P) => { P.m = S.meas.map((_, m) => [[FS.rest(T.len[m])]]); });
    /* pass 2: notes */
    plan.forEach(({ xp, map }) => {
      let div = 16; const voiceMap = {}; const vIdx = (st, vid) => { const k = st + ':' + vid; if (!(k in voiceMap)) { const used = Object.keys(voiceMap).filter((q) => q.split(':')[0] === String(st)).length; voiceMap[k] = Math.min(used, 3); } return voiceMap[k]; };
      let pend = { ch: null, dyn: null, tx: null, hp: null }; const slurOpen = {}; const graceBuf = {}; const lyrCont = {};
      kids(xp, 'measure').slice(0, nmeas).forEach((me, m) => {
        let pos = 0; const lists = {}; let last = null;
        const flushList = () => {
          Object.keys(lists).forEach((k) => {
            const [st, v] = k.split(':').map(Number), pi = map[st] != null ? map[st] : map[1];
            lists[k].forEach((e) => { if (e.t < 0 || e.t >= T.len[m] - 1e-6) return; const ev = { d: e.d, p: e.p }; ['tie', 'tp', 'ch', 'ly', 'ly2', 'tx', 'art', 'dyn', 'hp', 'slur', 'hd', 'gr'].forEach((f) => { if (e[f] != null) ev[f] = e[f]; }); FS.normD(ev); FS.place(S, pi, m, v, e.t, ev); });
          });
        };
        Array.from(me.children).forEach((c) => {
          const tg = c.tagName;
          if (tg === 'attributes') { const dv = num(c, 'divisions', 0); if (dv > 0) div = dv; }
          else if (tg === 'backup') pos -= (num(c, 'duration', 0) * 16) / div;
          else if (tg === 'forward') pos += (num(c, 'duration', 0) * 16) / div;
          else if (tg === 'harmony') {
            const r = kid(c, 'root'); if (r) { const al = num(r, 'root-alter', 0), kd = kid(c, 'kind'), kt = kd ? (kd.getAttribute('text') != null ? kd.getAttribute('text') : KIND_R[kd.textContent.trim()] != null ? KIND_R[kd.textContent.trim()] : '') : ''; pend.ch = txt(r, 'root-step') + (al > 0 ? '#' : al < 0 ? 'b' : '') + kt; }
          } else if (tg === 'direction') {
            kids(c, 'direction-type').forEach((dt) => {
              const dy = kid(dt, 'dynamics'); if (dy) { const f = Array.from(dy.children).map((x) => x.tagName).filter((x) => DYNS.indexOf(x) >= 0)[0]; if (f) pend.dyn = f; }
              const wd = kid(dt, 'wedge'); if (wd) { const t = wd.getAttribute('type'); pend.hp = t === 'crescendo' ? 'cr' : t === 'diminuendo' ? 'de' : 'end'; }
              const w = kid(dt, 'words'); if (w && !/^(D\.?[SC]\.?|fine|to coda)/i.test(w.textContent.trim())) pend.tx = w.textContent.trim().slice(0, 30);
            });
          } else if (tg === 'note') {
            const st = parseInt(txt(c, 'staff') || '1', 10), vid = txt(c, 'voice') || '1', v = vIdx(st, vid), key = st + ':' + v;
            const isGrace = !!kid(c, 'grace'), isChord = !!kid(c, 'chord'), rest = !!kid(c, 'rest'), pe = kid(c, 'pitch');
            let p = null; if (pe) { const s = STEP.indexOf(txt(pe, 'step')); if (s >= 0) p = { s, a: Math.max(-2, Math.min(2, Math.round(num(pe, 'alter', 0)))), o: Math.max(0, Math.min(9, num(pe, 'octave', 4))) }; }
            if (kid(c, 'unpitched')) { p = { s: 4, a: 0, o: 5 }; }
            if (isGrace) { if (p) (graceBuf[key] = graceBuf[key] || []).push({ s: p.s, a: p.a, o: p.o }); return; }
            const d = (num(c, 'duration', 0) * 16) / div;
            const list = (lists[key] = lists[key] || []);
            if (isChord && last && last.key === key && p) { last.e.p.push(p); return; }
            const e = { t: Math.round(pos * 105) / 105, d, p: p && !rest ? [p] : [] };
            const tm = kid(c, 'time-modification'); if (tm) { const n = num(tm, 'actual-notes', 0); if (n >= 3 && n <= 9) e.tp = n; }
            if (kids(c, 'tie').some((x) => x.getAttribute('type') === 'start') && e.p.length) e.tie = true;
            const hd = txt(c, 'notehead'); if (hd === 'x') e.hd = 'x'; else if (hd === 'diamond') e.hd = 'dia'; else if (hd === 'triangle') e.hd = 'tri';
            if (pend.ch) { e.ch = pend.ch; pend.ch = null; } if (pend.dyn) { e.dyn = pend.dyn; pend.dyn = null; } if (pend.hp) { e.hp = pend.hp; pend.hp = null; } if (pend.tx) { e.tx = pend.tx; pend.tx = null; }
            if (graceBuf[key]) { e.gr = graceBuf[key].slice(0, 4); delete graceBuf[key]; }
            Object.keys(slurOpen).forEach((k) => { if (e.p.length) slurOpen[k].n++; });
            const nt = kid(c, 'notations');
            if (nt) {
              kids(nt, 'slur').forEach((sl) => { const n = sl.getAttribute('number') || '1', ty = sl.getAttribute('type'); if (ty === 'start') slurOpen[key + n] = { e, n: 0 }; else if (ty === 'stop' && slurOpen[key + n]) { const o = slurOpen[key + n]; if (o.n > 0) o.e.slur = Math.min(4, o.n); delete slurOpen[key + n]; } });
              const ar = kid(nt, 'articulations'); if (ar) { if (kid(ar, 'staccato')) e.art = 'stac'; else if (kid(ar, 'accent')) e.art = 'acc'; else if (kid(ar, 'tenuto')) e.art = 'ten'; else if (kid(ar, 'strong-accent')) e.art = 'marc'; }
              if (kid(nt, 'fermata')) e.art = 'ferm'; if (kid(nt, 'arpeggiate')) e.art = 'arp';
              const or = kid(nt, 'ornaments'); if (or) { if (kid(or, 'trill-mark')) e.art = 'tr'; else if (kid(or, 'mordent') || kid(or, 'inverted-mordent')) e.art = 'mord'; else if (kid(or, 'turn')) e.art = 'turn'; else if (kid(or, 'tremolo')) e.art = 'trem'; }
              const te = kid(nt, 'technical'); if (te) { if (kid(te, 'down-bow')) e.art = 'dbow'; else if (kid(te, 'up-bow')) e.art = 'ubow'; }
            }
            kids(c, 'lyric').forEach((ly) => {
              const n = parseInt(ly.getAttribute('number') || '1', 10), t = txt(ly, 'text'), sy = txt(ly, 'syllabic'); if (!t) return;
              const f = n === 2 ? 'ly2' : 'ly'; e[f] = t + (sy === 'begin' || sy === 'middle' ? '-' : '');
            });
            list.push(e); last = { key, e }; pos += d;
          }
        });
        flushList();
      });
    });
    return FS.fix(S);
  };
})();
