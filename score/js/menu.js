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
})();
