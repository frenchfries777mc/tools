/* Fry Score — export menu and playback settings. */
(function () {
  'use strict';
  const FS = window.FS, UI = FS.ui, A = FS.app, IO = FS.io;
  const AU = FS.audio, save = (ext, blob) => IO.download(IO.fname(A.score, ext), blob);

  UI.exports.push(
    ['MIDI (.mid)', () => { try { save('mid', IO.exportMidi(A.score)); } catch (e) { FS.toast('MIDI로 내보내지 못했어요'); } }],
    ['MusicXML (.musicxml)', () => { try { save('musicxml', IO.exportXml(A.score)); } catch (e) { FS.toast('MusicXML로 내보내지 못했어요'); } }],
    ['소리 파일 (.wav)', () => { FS.toast('소리를 만드는 중이에요…'); IO.renderWav(A.score, (b) => save('wav', b), () => FS.toast('WAV로 만들지 못했어요')); }],
    ['그림 (.png)', () => IO.exportPng(A.score, 2, (b) => save('png', b), () => FS.toast('PNG로 바꾸지 못했어요'))],
    ['인쇄 · PDF로 저장', () => IO.print(A.score)]
  );

  /* playback settings live in the 악보 tab */
  UI.sections.song.push(function () {
    return `<div class="sec"><h4>재생</h4><div class="row"><label>속도</label><select data-chg="speed">${[50, 75, 100, 125, 150].map((n) => `<option value="${n}"${Math.round((AU.speed || 1) * 100) === n ? ' selected' : ''}>${n}%</option>`).join('')}</select></div>` +
      `<label class="chk"><input type="checkbox" data-chg="metro"${AU.metro ? ' checked' : ''}> 메트로놈 소리</label><label class="chk"><input type="checkbox" data-chg="countin"${AU.countIn ? ' checked' : ''}> 시작 전에 한 마디 세어 주기</label><label class="chk"><input type="checkbox" data-chg="loop"${AU.loop ? ' checked' : ''}> 반복 재생</label></div>`;
  });
  Object.assign(UI.changes, {
    speed: (el) => { AU.speed = +el.value / 100; },
    metro: (el) => { AU.metro = el.checked; },
    countin: (el) => { AU.countIn = el.checked; },
    loop: (el) => { AU.loop = el.checked; }
  });

  /* ---------- song details: subtitle, header text, pickup, measure numbers, transposition ---------- */
  const esc = FS.esc;
  UI.sections.song.push(function (S) {
    let h = '<div class="sec"><h4>표지 글씨</h4>';
    [['sub', '부제'], ['lyr', '오른쪽 위'], ['cpy', '아래 글씨']].forEach((r) => { h += `<div class="row"><label>${r[1]}</label><input type="text" data-chg="songtxt" data-k="${r[0]}" value="${esc(S[r[0]] || '')}" maxlength="80" data-notr></div>`; });
    h += '</div><div class="sec"><h4>마디 · 박자 표시</h4>';
    h += `<div class="row"><label>못갖춘마디</label><select data-chg="pick"><option value="0">없음</option>${[[8, '8분음표 1개'], [16, '4분음표 1개'], [24, '점4분음표'], [32, '2분음표'], [48, '점2분음표']].map((x) => `<option value="${x[0]}"${S.pick === x[0] ? ' selected' : ''}>${x[1]}</option>`).join('')}</select></div>`;
    h += `<div class="row"><label>마디 번호</label><select data-chg="mn"><option value="0">안 쓰기</option><option value="1"${S.mn === 1 ? ' selected' : ''}>줄 첫머리마다</option><option value="2"${S.mn === 2 ? ' selected' : ''}>모든 마디</option></select></div>`;
    h += `<label class="chk"><input type="checkbox" data-chg="tsym"${S.tsym ? ' checked' : ''}> 4/4, 2/2를 C 기호로 쓰기</label></div>`;
    h += '<div class="sec"><h4>곡 전체 조옮김</h4><div class="btns">' + [[-12, '−옥타브'], [-2, '−2'], [-1, '−1'], [1, '+1'], [2, '+2'], [12, '+옥타브']].map((x) => `<button class="tbtn" data-act="transpose" data-v="${x[0]}">${x[1]}</button>`).join('') + '</div><div class="note">반음 단위로 모든 음과 조표를 옮겨요(드럼 제외).</div></div>';
    return h;
  });
  Object.assign(UI.changes, {
    songtxt: (el) => { const k = el.dataset.k, v = el.value.trim(); if (v) A.score[k] = v.slice(0, 80); else delete A.score[k]; UI.commit(); },
    pick: (el) => { const S = A.score, v = +el.value; if (v) S.pick = v; else delete S.pick; FS.reflow(S, 0); UI.commit('못갖춘마디를 바꿨어요'); },
    mn: (el) => { const v = +el.value; if (v) A.score.mn = v; else delete A.score.mn; UI.commit(); },
    tsym: (el) => { if (el.checked) A.score.tsym = true; else delete A.score.tsym; UI.commit(); }
  });
  UI.actions.transpose = (el) => {
    const S = A.score, n = +el.dataset.v, wrap = (k) => { while (k > 7) k -= 12; while (k < -7) k += 12; return k; };
    const kf = (((7 * n) % 12) + 18) % 12 - 6; // fifths shift in [-6, 5]
    S.key = wrap(S.key + kf);
    S.meas.forEach((q, m) => { if (m > 0 && q.key != null) q.key = wrap(q.key + kf); });
    const T = FS.mtab(S);
    S.parts.forEach((P) => {
      if (P.clef === 'drum') return;
      P.m.forEach((V, m) => V.forEach((E) => E.forEach((e) => {
        e.p = e.p.map((p) => FS.fromMidi(FS.midi(p) + n, T.key[m]));
        if (e.gr) e.gr = e.gr.map((g) => FS.fromMidi(FS.midi(g) + n, T.key[m]));
        if (e.p.length) FS.sortPitches(e.p);
      })));
    });
    UI.commit('조를 옮겼어요');
  };
})();
