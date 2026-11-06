/* Fry Score — notation panel: dynamics, articulations, slurs, grace notes, tuplets, lyrics, chords. */
(function () {
  'use strict';
  const FS = window.FS, UI = FS.ui, A = FS.app, esc = FS.esc;

  const DYN = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sfz'];
  const ART = [['stac', '스타카토'], ['acc', '악센트'], ['ten', '테누토'], ['marc', '마르카토'], ['ferm', '늘임표'], ['tr', '트릴'], ['mord', '모르덴트'], ['turn', '턴'], ['trem', '트레몰로'], ['arp', '아르페지오'], ['dbow', '내림활'], ['ubow', '올림활']];
  const HEADS = [['', '기본'], ['x', '× 머리'], ['dia', '◇ 머리'], ['tri', '△ 머리']];
  const CHORDS = ['C', 'Dm', 'Em', 'F', 'G', 'G7', 'Am', 'Bdim', 'C7', 'Fmaj7', 'Cmaj7', 'Dm7', 'Em7', 'Am7', 'Bb', 'A', 'D', 'E', 'E7', 'A7', 'D7', 'Bm'];

  const btn = (act, attrs, label, on) => `<button class="tbtn${on ? ' on' : ''}" data-act="${act}" ${attrs}>${label}</button>`;
  const sels = () => UI.selEvents();

  function setField(k, v, toggle) {
    const evs = sels(); if (!evs.length) { FS.toast('먼저 음표를 고르세요'); return; }
    const all = toggle && evs.every((x) => x.e[k] === v);
    evs.forEach((x) => { if (v === '' || all) delete x.e[k]; else x.e[k] = v; });
    UI.commit();
  }

  /* ---------- tuplets ---------- */
  function makeTuplet(n) {
    const evs = sels(); if (evs.length !== 1) { FS.toast('쪼갤 음표를 하나만 고르세요'); return; }
    const x = evs[0], s = A.sel, S = A.score, e = x.e;
    if (e.tp) { FS.toast('이미 잇단음표예요'); return; }
    const D = e.d, t0 = FS.startOf(S, s.pi, x.m, x.v, x.i);
    const pieces = [];
    for (let k = 0; k < n; k++) {
      const q = { d: D / n, tp: n, p: k === 0 ? e.p.map((p) => Object.assign({}, p)) : [] };
      if (k === 0) { ['ch', 'ly', 'ly2', 'tx', 'fg', 'art', 'dyn', 'hp', 'slur', 'hd', 'ov', 'gr'].forEach((f) => { if (e[f] != null) q[f] = e[f]; }); }
      if (k === n - 1 && e.tie && e.p.length) q.tie = true;
      pieces.push(q);
    }
    let pos = { m: x.m, t: t0 };
    pieces.forEach((q) => { FS.normD(q); const r = FS.place(S, s.pi, pos.m, x.v, pos.t, q); pos = r.next; });
    UI.commit(n + '잇단음표');
  }
  function removeTuplet() {
    const evs = sels(); if (evs.length !== 1 || !evs[0].e.tp) { FS.toast('잇단음표를 하나 고르세요'); return; }
    const x = evs[0], s = A.sel, S = A.score, E = S.parts[s.pi].m[x.m][x.v], n = x.e.tp;
    let a = x.i; while (a > 0 && E[a - 1].tp === n && x.i - a < n - 1) a--;
    let b = a, d = 0; while (b < E.length && E[b].tp === n && b - a < n) { d += E[b].d; b++; }
    const first = E[a];
    const t0 = FS.startOf(S, s.pi, x.m, x.v, a);
    const ev = { d: Math.round(d * 1000) / 1000, p: first.p.map((p) => Object.assign({}, p)) };
    ['ch', 'ly', 'ly2', 'tx', 'fg', 'art', 'dyn', 'hp', 'slur', 'hd', 'ov', 'gr'].forEach((f) => { if (first[f] != null) ev[f] = first[f]; });
    FS.place(S, s.pi, x.m, x.v, t0, ev);
    UI.commit('잇단음표 풀기');
  }

  /* ---------- slur / grace ---------- */
  function slur() {
    const evs = sels().filter((x) => true); if (!evs.length) { FS.toast('먼저 음표를 고르세요'); return; }
    const first = evs[0];
    if (first.e.slur) { delete first.e.slur; UI.commit('이음줄 지움'); return; }
    const n = Math.max(1, evs.filter((x) => x.e.p.length).length - 1);
    first.e.slur = Math.min(4, n); UI.commit('이음줄');
  }
  function grace(dir) {
    const evs = sels().filter((x) => x.e.p.length); if (!evs.length) { FS.toast('꾸밈음을 붙일 음표를 고르세요'); return; }
    evs.forEach((x) => {
      const p = x.e.p[x.e.p.length - 1], a = FS.abs(p) + dir, q = FS.fromAbs(a);
      x.e.gr = (x.e.gr || []).concat([{ s: q.s, a: 0, o: q.o }]).slice(0, 4);
    });
    UI.commit('꾸밈음');
  }

  Object.assign(UI.actions, {
    evset: (el) => setField(el.dataset.k, el.dataset.k === 'ov' ? +el.dataset.v : el.dataset.v, el.dataset.tg === '1'),
    mktp: (el) => makeTuplet(+el.dataset.v),
    rmtp: removeTuplet,
    slur,
    grace: (el) => grace(+el.dataset.v),
    nograce: () => { const evs = sels(); evs.forEach((x) => delete x.e.gr); UI.commit(); },
  });
  Object.assign(UI.changes, {
    evtxt: (el) => {
      const evs = sels(); if (!evs.length) return;
      const k = el.dataset.k, v = el.value.trim();
      evs.forEach((x) => { if (v) x.e[k] = v.slice(0, 30); else delete x.e[k]; });
      UI.commit();
    },
  });

  UI.sections.note.push(function (S, s, e) {
    if (!s || !e) return '';
    const evs = sels(), has = (k, v) => evs.length && evs.every((x) => x.e[k] === v);
    let h = '<div class="sec"><h4>셈여림 · 표현</h4><div class="btns">';
    DYN.forEach((d) => { h += btn('evset', `data-k="dyn" data-v="${d}" data-tg="1"`, `<i style="font-family:serif;font-weight:700">${d}</i>`, has('dyn', d)); });
    h += '</div><div class="btns">' + btn('evset', 'data-k="hp" data-v="cr" data-tg="1"', '점점 세게 &lt;', has('hp', 'cr')) + btn('evset', 'data-k="hp" data-v="de" data-tg="1"', '점점 여리게 &gt;', has('hp', 'de')) + btn('evset', 'data-k="hp" data-v="end" data-tg="1"', '끝', has('hp', 'end')) + '</div></div>';
    h += '<div class="sec"><h4>연주 기호</h4><div class="btns">' + ART.map((a) => btn('evset', `data-k="art" data-v="${a[0]}" data-tg="1"`, a[1], has('art', a[0]))).join('') + '</div></div>';
    h += '<div class="sec"><h4>이음줄 · 꾸밈음 · 잇단음표</h4><div class="note">이음줄은 여러 음을 고른 뒤 누르면 끝 음까지 이어져요.</div><div class="btns">' + btn('slur', '', '이음줄', !!e.slur) + btn('grace', 'data-v="-1"', '꾸밈음 (아래)') + btn('grace', 'data-v="1"', '꾸밈음 (위)') + (e.gr ? btn('nograce', '', '꾸밈음 지우기') : '') + '</div>';
    h += '<div class="btns">' + [3, 5, 6, 7, 9].map((n) => btn('mktp', `data-v="${n}"`, n + '잇단')).join('') + (e.tp ? btn('rmtp', '', '잇단음표 풀기') : '') + '</div></div>';
    h += '<div class="sec"><h4>글씨</h4>';
    [['ly', '가사 1'], ['ly2', '가사 2'], ['ch', '코드'], ['tx', '지시어'], ['fg', '운지']].forEach((r) => {
      h += `<div class="row"><label>${r[1]}</label><input type="text" data-chg="evtxt" data-k="${r[0]}" value="${esc(e[r[0]] || '')}" maxlength="30" data-notr${r[0] === 'ch' ? ' list="chordlist"' : ''}></div>`;
    });
    h += '<datalist id="chordlist">' + CHORDS.map((c) => `<option value="${c}">`).join('') + '</datalist>';
    h += '<div class="note">가사는 음표마다 한 음절, 이어지면 끝에 - 를 붙여요.</div></div>';
    h += '<div class="sec"><h4>음표 모양 · 옥타브 · 페달</h4><div class="btns">' + HEADS.map((x) => btn('evset', `data-k="hd" data-v="${x[0]}"`, x[1], (e.hd || '') === x[0])).join('') + '</div>';
    h += '<div class="btns">' + btn('evset', 'data-k="ov" data-v="1" data-tg="1"', '8va 시작') + btn('evset', 'data-k="ov" data-v="-1" data-tg="1"', '8vb 시작') + btn('evset', 'data-k="ov" data-v="0" data-tg="1"', '옥타브 끝') + '</div>';
    h += '<div class="btns">' + btn('evset', 'data-k="ped" data-v="d" data-tg="1"', '페달 밟기', e.ped === 'd') + btn('evset', 'data-k="ped" data-v="u" data-tg="1"', '페달 떼기', e.ped === 'u') + '</div></div>';
    return h;
  });

  /* ---------- measure marks: repeats, navigation, text, tempo ---------- */
  const MK = [['rs', '반복 시작 |:'], ['re', '반복 끝 :|'], ['volta:1', '1번 괄호'], ['volta:2', '2번 괄호'], ['segno', '세뇨 𝄋'], ['coda', '코다'], ['tocoda', 'To Coda'], ['ds', 'D.S.'], ['dc', 'D.C.'], ['fine', 'Fine'], ['reh', '연습 기호'], ['bar:dbl', '겹세로줄'], ['bar:fin', '끝세로줄']];
  function markOf(m) { return A.score.meas[m] || (A.score.meas[m] = {}); }
  Object.assign(UI.actions, {
    mkset: (el) => {
      const s = A.sel; if (!s) return; const q = markOf(s.m), [k, v] = el.dataset.k.split(':');
      const m2 = s.m2 != null ? Math.max(s.m, s.m2) : s.m;
      const on = v ? q[k] === (isNaN(+v) ? v : +v) : !!q[k];
      for (let m = s.m; m <= m2; m++) { const r = markOf(m); if (on) delete r[k]; else r[k] = v ? (isNaN(+v) ? v : +v) : true; }
      UI.commit();
    },
    mkramp: (el) => {
      const s = A.sel; if (!s) return; const q = markOf(s.m);
      if (el.dataset.v === 'x') delete q.ramp; else { const to = Math.max(30, Math.min(240, Math.round(+el.dataset.to))); q.ramp = { n: Math.min(8, Math.max(1, s.m2 != null ? Math.abs(s.m2 - s.m) + 1 : 2)), to }; }
      UI.commit();
    },
  });
  Object.assign(UI.changes, {
    mktxt: (el) => { const s = A.sel; if (!s) return; const q = markOf(s.m), v = el.value.trim().slice(0, 30); if (v) q.txt = v; else delete q.txt; UI.commit(); },
    mktempo: (el) => { const s = A.sel; if (!s) return; const q = markOf(s.m), v = Math.round(+el.value); if (v >= 20 && v <= 300) { if (s.m === 0) A.score.tempo = v; else q.tempo = v; } else if (s.m > 0) delete q.tempo; UI.commit(); },
  });
  UI.sections.note.push(function (S, s) {
    if (!s) return '';
    const q = S.meas[s.m] || {}, T = FS.mtab(S);
    let h = `<div class="sec"><h4>마디 ${s.m + 1} 표시</h4><div class="btns">` + MK.map((x) => {
      const [k, v] = x[0].split(':'); const on = v ? q[k] === (isNaN(+v) ? v : +v) : !!q[k];
      return btn('mkset', `data-k="${x[0]}"`, x[1], on);
    }).join('') + '</div>';
    h += `<div class="row"><label>마디 글씨</label><input type="text" data-chg="mktxt" value="${esc(q.txt || '')}" maxlength="30" data-notr></div>`;
    h += `<div class="row"><label>빠르기</label><input type="number" min="20" max="300" data-chg="mktempo" value="${s.m === 0 ? S.tempo : (q.tempo || '')}" placeholder="그대로"></div>`;
    h += '<div class="btns">' + btn('mkramp', 'data-to="140"', '점점 빠르게 → 140') + btn('mkramp', 'data-to="70"', '점점 느리게 → 70') + (q.ramp ? btn('mkramp', 'data-v="x"', '속도 변화 지우기') : '') + '</div>';
    h += '<div class="note">여러 마디를 고르면 속도 변화는 그 마디 수만큼, 괄호·세로줄은 모든 마디에 적용돼요.</div></div>';
    return h;
  });
})();
