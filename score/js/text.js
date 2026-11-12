/* Fry Score — "글자" tab: text notation, bulk lyrics, find/replace, examples, AI melody, statistics. */
(function () {
  'use strict';
  const FS = window.FS, UI = FS.ui, A = FS.app, esc = FS.esc, STEPS = FS.STEPS;
  UI.tabs = UI.tabs || {};

  /* ---------- text notation:  C4/4 E4 G4/2 R/4 C4+E4+G4/2. D4/8t ---------- */
  FS.parseText = function (txt, clef) {
    const out = []; let lastO = clef === 'bass' ? 3 : 4, lastD = 16, lastT = false;
    String(txt).replace(/[|\n]/g, ' ').split(/\s+/).forEach((tok) => {
      if (!tok) return;
      let tie = false; if (/~$/.test(tok)) { tie = true; tok = tok.slice(0, -1); }
      const m = tok.match(/^([^/.t]*)(?:\/(\d+))?(\.?)(t?)$/); if (!m) return;
      let d = lastD;
      if (m[2]) { const n = +m[2]; d = n > 0 && 64 % n === 0 ? 64 / n : lastD; if (m[3]) d = (d * 3) / 2; lastD = m[3] ? (d * 2) / 3 : d; } else if (m[3]) d = (lastD * 3) / 2;
      const ps = [];
      if (!/^[Rr]$/.test(m[1])) {
        m[1].split('+').forEach((x) => {
          const q = x.match(/^([A-Ga-g])([#b]?)(\d?)$/); if (!q) return;
          const s = STEPS.indexOf(q[1].toUpperCase()), o = q[3] === '' ? lastO : +q[3]; lastO = o;
          ps.push({ s, a: q[2] === '#' ? 1 : q[2] === 'b' ? -1 : 0, o });
        });
        if (!ps.length) return;
      }
      if (m[2]) lastT = !!m[4]; else if (m[4]) lastT = true;
      const e = { p: ps, d };
      if (lastT) { e.d = (d * 2) / 3; e.tp = 3; }
      if (tie && ps.length) e.tie = true;
      out.push(e);
    });
    return out;
  };
  FS.toText = function (S, pi) {
    const P = S.parts[pi], out = [];
    P.m.forEach((V) => (V[0] || []).forEach((e) => {
      const s = e.p.length ? e.p.map((p) => STEPS[p.s] + (p.a > 0 ? '#' : p.a < 0 ? 'b' : '') + p.o).join('+') : 'R';
      const d = FS.dur(e);
      out.push(s + '/' + 64 / d.base + (d.dots ? '.' : '') + (e.tp ? 't' : '') + (e.tie ? '~' : ''));
    }));
    return out.join(' ');
  };
  /** replace the whole first voice of part pi (or append) with parsed events */
  function writeEvents(S, pi, evs, append) {
    const P = S.parts[pi], T = FS.mtab(S);
    let pos = { m: 0, t: 0 };
    if (append) {
      for (let m = P.m.length - 1; m >= 0; m--) {
        const E = P.m[m][0] || []; let k = E.length - 1; while (k >= 0 && !E[k].p.length) k--;
        if (k >= 0) { pos = { m, t: FS.starts(E)[k] + E[k].d }; if (pos.t >= T.len[m] - 1e-6) pos = { m: m + 1, t: 0 }; break; }
      }
    } else {
      P.m = P.m.map((V, m) => [[FS.rest(T.len[m])]].concat(V.slice(1)));
    }
    evs.forEach((e) => { FS.normD(e); const r = FS.place(S, pi, pos.m, 0, pos.t, e); pos = r.next; });
  }
  function curPi() { return A.sel ? A.sel.pi : 0; }

  /* ---------- examples ---------- */
  const EX = {
    twinkle: { name: '반짝반짝 작은 별', tempo: 100, key: 0, parts: [['멜로디', 'treble', 'piano', 'C4/4 C4 G4 G4 A4 A4 G4/2 F4/4 F4 E4 E4 D4 D4 C4/2 G4/4 G4 F4 F4 E4 E4 D4/2 G4/4 G4 F4 F4 E4 E4 D4/2 C4/4 C4 G4 G4 A4 A4 G4/2 F4/4 F4 E4 E4 D4 D4 C4/2']], ly: '반 짝 반 짝 작 은 별 아 름 답 게 비 치 네 동 쪽 하 늘 에 서 도 서 쪽 하 늘 에 서 도 반 짝 반 짝 작 은 별 아 름 답 게 비 치 네' },
    ode: { name: '환희의 송가', tempo: 108, key: 0, parts: [['멜로디', 'treble', 'flute', 'E4/4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4/4. D4/8 D4/2 E4/4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4/4. C4/8 C4/2']] },
    canon: { name: '캐논 (2파트)', tempo: 80, key: 2, parts: [['멜로디', 'treble', 'strings', 'F#5/2 E5 D5 C#5 B4 A4 B4 C#5 D5/4 F#5 A5 A4 B4 C#5 D5 E5 F#5 F#4 A4 A5 G5 F#5 E5 D5 C#5 F#5 D5 F#5 A5 A4 B4 C#5 D5 E5'], ['베이스', 'bass', 'bass', 'D3/2 A2 B2 F#2 G2 D2 G2 A2 D3 A2 B2 F#2 G2 D2 G2 A2']] }
  };
  function loadExample(k) {
    const ex = EX[k]; if (!ex) return;
    const S = FS.newScore('lead'); S.parts = []; S.name = ex.name; S.tempo = ex.tempo; S.key = ex.key;
    ex.parts.forEach((q) => S.parts.push(FS.newPart(q[0], q[1], q[2])));
    FS.growTo(S, 1); const T = FS.mtab(S);
    S.parts.forEach((P) => { P.m = S.meas.map((_, m) => [[FS.rest(T.len[m])]]); });
    ex.parts.forEach((q, pi) => writeEvents(S, pi, FS.parseText(q[3], q[1]), false));
    if (ex.ly) applyLyrics(S, 0, ex.ly, 1, 0, 0);
    UI.reset(FS.fix(S)); FS.toast('불러왔어요: ' + ex.name);
  }

  /* ---------- lyrics ---------- */
  function applyLyrics(S, pi, text, verse, m0, i0) {
    const syl = String(text).trim().split(/\s+/).filter(Boolean), P = S.parts[pi], f = verse === 2 ? 'ly2' : 'ly'; let k = 0, n = 0;
    for (let m = m0; m < P.m.length && k < syl.length; m++) {
      (P.m[m][0] || []).forEach((e, i) => {
        if (m === m0 && i < i0) return; if (!e.p.length || k >= syl.length) return;
        const s = syl[k++]; if (s === '_') return; e[f] = s.slice(0, 30); n++;
      });
    }
    return n;
  }

  /* ---------- find / replace ---------- */
  function parsePitch(t) {
    t = String(t).trim(); if (/^[Rr]/.test(t)) return { rest: true };
    const q = t.match(/^([A-Ga-g])([#b]?)(\d?)$/); if (!q) return null;
    return { s: STEPS.indexOf(q[1].toUpperCase()), a: q[2] === '#' ? 1 : q[2] === 'b' ? -1 : 0, o: q[3] === '' ? null : +q[3] };
  }
  function findReplace(from, to, all) {
    const f = parsePitch(from), t = parsePitch(to); if (!f || f.rest || !t) { FS.toast('찾을 음과 바꿀 음을 써 주세요 (예: F → G)'); return; }
    const S = A.score; let n = 0;
    S.parts.forEach((P, pi) => {
      if (!all && pi !== curPi()) return;
      P.m.forEach((V) => V.forEach((E) => E.forEach((e) => {
        if (!e.p.length) return;
        let hit = false;
        e.p = e.p.map((p) => { if (p.s === f.s && p.a === f.a && (f.o == null || p.o === f.o)) { hit = true; return t.rest ? p : { s: t.s, a: t.a, o: t.o != null ? t.o : p.o }; } return p; });
        if (hit) { n++; if (t.rest) { e.p = []; delete e.tie; } else FS.sortPitches(e.p); }
      })));
    });
    if (n) UI.commit(n + '개를 바꿨어요'); else FS.toast('찾는 음이 없어요');
  }

  /* ---------- AI ---------- */
  let busy = false;
  function askAI() {
    if (busy || !window.FFAI) { if (!window.FFAI) FS.toast('AI를 쓸 수 없어요'); return; }
    const q = (document.getElementById('aiQ').value || '').trim(), out = document.getElementById('aiOut'); if (!q) { FS.toast('어떤 멜로디인지 써 주세요'); return; }
    const S = A.score, pi = curPi(), P = S.parts[pi]; busy = true; out.textContent = '만드는 중이에요…';
    const sys = window.FFC ? window.FFC.scoreSys(P.clef, S.ts, 8) : 'You write short melodies in a compact text notation. Reply with ONLY the notation, no explanation, no markdown. Tokens are separated by spaces. A token is a note name A-G, optional # or b, octave digit, then /duration where 1=whole 2=half 4=quarter 8=eighth 16=sixteenth, optional . for dotted. Example: C4/4 E4 G4/2 R/4 D4/8 E4/8 F4/4. R is a rest. Omitted octave or duration repeats the previous one. Use ' + (P.clef === 'bass' ? 'octaves 2 to 3' : 'octaves 4 to 5') + '. Time signature is ' + S.ts[0] + '/' + S.ts[1] + '; each bar must total exactly ' + S.ts[0] + ' beats of 1/' + S.ts[1] + ' notes. Write 8 bars. Start and end on the tonic.';
    (window.FFC ? window.FFAI.cloud('score.draft', { system: sys, prompt: q, maxTokens: 900 }) : window.FFAI.ask({ system: sys, prompt: q, maxTokens: 600 })).then((t) => {
      const sp = window.FFC ? window.FFC.splitScore(t) : { notes: String(t || '').replace(/```[a-z]*/gi, '').replace(/\n/g, ' '), chords: '' };
      const evs = FS.parseText(sp.notes, P.clef);
      if (!evs.length) { out.textContent = 'AI 답을 악보로 바꾸지 못했어요. 다른 말로 다시 시켜 보세요.'; return; }
      writeEvents(A.score, pi, evs, true); UI.commit(evs.length + '개 음표를 이어 붙였어요'); FS.toast(evs.length + '개 음표를 이어 붙였어요'); if (sp.chords) { const o2 = document.getElementById('aiOut'); if (o2) o2.textContent = '코드 진행 추천: ' + sp.chords; }
    }).catch((e) => { out.textContent = (e && e.message) || 'AI를 쓸 수 없어요. 설정에서 AI를 골라 주세요.'; }).then(() => { busy = false; });
  }

  /* ---------- tab ---------- */
  const fmtT = (s) => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');
  UI.tabs.text = function () {
    const S = A.score, pi = curPi(), P = S.parts[pi], ST = FS.secTable(S, 1), notes = S.parts.reduce((a, q) => a + q.m.reduce((b, V) => b + V.reduce((c, E) => c + E.filter((e) => e.p.length).length, 0), 0), 0);
    let h = `<div class="sec"><h4>글자로 악보 쓰기 · ${esc(P.name)}</h4><textarea id="txt" style="min-height:120px" data-notr>${esc(FS.toText(S, pi))}</textarea><div class="btns"><button class="tbtn pri" data-act="txtApply">악보에 적용</button><button class="tbtn" data-act="txtAppend">뒤에 이어 붙이기</button></div><div class="note">음 이름 + 옥타브 + /길이로 써요. 예) <b>C4/4 E4 G4/2 R/4 C4+E4+G4/2.</b><br>/1 온, /2 2분, /4 4분, /8 8분, /16 16분, 뒤에 <b>.</b> 점음표, <b>#</b> 올림, <b>b</b> 내림, <b>+</b> 화음, <b>R</b> 쉼표, <b>t</b> 셋잇단, 끝에 <b>~</b> 붙임줄. 길이와 옥타브를 빼면 앞의 것을 그대로 써요.</div></div>`;
    h += '<div class="sec"><h4>음 이어 쓰기 (키보드 없이)</h4><div class="btns">' + 'CDEFGAB'.split('').map((c) => `<button class="tbtn" data-act="letter" data-v="${c}">${c}</button>`).join('') + '<button class="tbtn" data-act="rest" data-v="" title="쉼표 입력">' + FS.icons.rest + ' 쉼표</button></div><div class="note">누르면 선택한 자리에 지금 고른 길이로 들어가고 다음 자리로 넘어가요.</div></div>';
    h += '<div class="sec"><h4>가사 한꺼번에 붙이기</h4><div class="row"><label>절</label><select id="lyV"><option value="1">1절</option><option value="2">2절</option></select></div><textarea id="lyTxt" style="min-height:64px" placeholder="반 짝 반 짝 작 은 별 (띄어쓰기마다 음표 하나, 건너뛰려면 _)" data-notr></textarea><div class="btns"><button class="tbtn" data-act="lyApply">가사 붙이기</button></div><div class="note">고른 음표부터(없으면 처음부터) 쉼표를 빼고 차례로 붙어요.</div></div>';
    h += '<div class="sec"><h4>음 찾아 바꾸기</h4><div class="row"><label>찾을 음</label><input type="text" id="frF" placeholder="예: F 또는 F#4" data-notr></div><div class="row"><label>바꿀 음</label><input type="text" id="frT" placeholder="예: G, Bb3, R(쉼표)" data-notr></div><label class="chk"><input type="checkbox" id="frAll"> 모든 파트에서</label><div class="btns"><button class="tbtn" data-act="frGo">바꾸기</button></div></div>';
    h += '<div class="sec"><h4>예시 곡</h4><div class="btns">' + Object.keys(EX).map((k) => `<button class="tbtn" data-act="example" data-v="${k}">${EX[k].name}</button>`).join('') + '</div></div>';
    h += '<div class="sec"><h4>AI에게 멜로디 부탁하기 (시험 기능)</h4><textarea id="aiQ" placeholder="예: 밝고 쉬운 8마디 동요 멜로디" data-notr></textarea><div class="btns"><button class="tbtn pri" data-act="aiGo">만들기</button><button class="tbtn" data-act="aiSet">AI 설정</button></div><div class="note" id="aiOut">AI가 글자 악보를 써 주면 쓰는 중인 파트 끝에 이어 붙여요. 박자가 안 맞거나 엉뚱할 수 있으니 들어 보고 고쳐 쓰세요. 마음에 안 들면 되돌리기를 눌러요.</div></div>';
    h += `<div class="sec"><h4>곡 통계</h4><div class="note">마디 ${S.meas.length}개 · 파트 ${S.parts.length}개 · 음표 ${notes}개 · 길이 약 ${fmtT(ST.total)}</div></div>`;
    return h;
  };
  const txtVal = (id) => { const e = document.getElementById(id); return e ? e.value : ''; };
  Object.assign(UI.actions, {
    txtApply: () => { const pi = curPi(), evs = FS.parseText(txtVal('txt'), A.score.parts[pi].clef); if (!evs.length) { FS.toast('악보로 바꿀 글자가 없어요'); return; } writeEvents(A.score, pi, evs, false); UI.commit('글자를 악보로 바꿨어요'); },
    txtAppend: () => { const pi = curPi(), evs = FS.parseText(txtVal('txt'), A.score.parts[pi].clef); if (!evs.length) return; writeEvents(A.score, pi, evs, true); UI.commit('이어 붙였어요'); },
    letter: (el) => {
      const pi = curPi(), s = STEPS.indexOf(el.dataset.v), ref = A.lastAbs[pi] != null ? A.lastAbs[pi] : FS.CLEFS[A.score.parts[pi].clef].base + 4, o = Math.round((ref - s) / 7);
      const key = FS.mtab(A.score).key[A.sel ? A.sel.m : 0];
      UI.enterPitch({ s, a: FS.keyAlter(key, s), o });
    },
    lyApply: () => {
      const pi = curPi(), s = A.sel, n = applyLyrics(A.score, pi, txtVal('lyTxt'), +txtVal('lyV'), s ? s.m : 0, s ? s.i : 0);
      if (n) UI.commit(n + '음절을 붙였어요'); else FS.toast('붙일 가사가 없어요');
    },
    frGo: () => { const all = document.getElementById('frAll'); findReplace(txtVal('frF'), txtVal('frT'), all && all.checked); },
    example: (el) => loadExample(el.dataset.v),
    aiGo: askAI,
    aiSet: () => { if (window.FFAI) window.FFAI.settings(); }
  });
})();
