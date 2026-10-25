/* Fry Sheet command registry: one list of every toolbar command. It builds the ribbon tabs (홈 · 삽입 · 데이터 · 차트 · AI)
   and the "기능 찾기" command search (🔍 box, Ctrl+K / Cmd+K) from the same entries, so the two never drift apart.
   Commands run through FSAPI.run(id) in app.js. Loaded after strings.js and before app.js (app.js binds the built buttons). */
(function(){
'use strict';
var T=FFT.T, $=function(id){ return document.getElementById(id); };
var LS='ffsheet.rtab';
var TABS=[['home','홈'],['format','서식'],['insert','삽입'],['rowcol','행·열'],['data','데이터'],['view','보호·인쇄'],['chart','차트'],['ai','AI']];
var XTAB={file:'파일',sheet:'시트'};
var SV=function(p){ return '<svg viewBox="0 0 24 24">'+p+'</svg>'; };
var I={
  undo:SV('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
  redo:SV('<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>'),
  copy:SV('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
  cut:SV('<circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8 16L19 3M16 16L5 3"/>'),
  paste:SV('<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V2.5h6V4"/>'),
  bold:'<b style="font-size:15px">B</b>', italic:'<i style="font-family:Georgia,serif;font-size:16px">I</i>',
  fc:'<b style="font-size:15px">A</b>',
  bg:SV('<path d="M5 12l7-7 7 7-7 7z"/><path d="M19 15s2 2.5 2 4a2 2 0 0 1-4 0c0-1.5 2-4 2-4z"/>'),
  all:SV('<path d="M4 6h16M4 12h10M4 18h14"/>'), alc:SV('<path d="M4 6h16M7 12h10M5 18h14"/>'), alr:SV('<path d="M4 6h16M10 12h10M6 18h14"/>'),
  decDn:'<b style="font-size:12px;font-family:\'JetBrains Mono\',monospace">.0←</b>', decUp:'<b style="font-size:12px;font-family:\'JetBrains Mono\',monospace">.00</b>',
  border:SV('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M12 4v16M4 12h16"/>'),
  borderdlg:SV('<rect x="4" y="4" width="16" height="16" rx="1" stroke-dasharray="2 2.5"/><path d="M4 20h16" stroke="#ffc93c" stroke-width="3"/>'),
  merge:SV('<rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M8 12h8M8 12l2.5-2.5M8 12l2.5 2.5M16 12l-2.5-2.5M16 12l-2.5 2.5"/>'),
  unmerge:SV('<rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M12 6v12M5 12h4M9 12l-2-2M9 12l-2 2M19 12h-4M15 12l2-2M15 12l2 2"/>'),
  clearfmt:SV('<path d="M4 20h16"/><path d="M14 4l6 6-8 8H8l-4-4z"/>'),
  clr:SV('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  print:SV('<path d="M7 9V3h10v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v7H7z"/>'),
  keys:SV('<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'),
  nf:'<b style="font-size:11px;font-family:\'JetBrains Mono\',monospace">123</b>',
  sum:'<b style="font-size:17px">Σ</b>', fn:'<i style="font-family:Georgia,serif;font-size:15px">fx</i>',
  rowA:SV('<rect x="3" y="12" width="18" height="8" rx="1.5"/><path d="M12 2v7M8.5 5.5h7"/>'),
  rowB:SV('<rect x="3" y="4" width="18" height="8" rx="1.5"/><path d="M12 15v7M8.5 18.5h7"/>'),
  colL:SV('<rect x="12" y="3" width="8" height="18" rx="1.5"/><path d="M2 12h7M5.5 8.5v7"/>'),
  colR:SV('<rect x="4" y="3" width="8" height="18" rx="1.5"/><path d="M15 12h7M18.5 8.5v7"/>'),
  delRow:SV('<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M9.5 10l5 4M14.5 10l-5 4" stroke="#ff7b7b"/>'),
  delCol:SV('<rect x="8" y="3" width="8" height="18" rx="1.5"/><path d="M10 9.5l4 5M14 9.5l-4 5" stroke="#ff7b7b"/>'),
  check:SV('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/>'),
  dv:SV('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M9 11l3 3 3-3"/>'),
  note:SV('<path d="M4 4h16v12h-7l-5 4v-4H4z"/>'),
  xref:SV('<rect x="3" y="5" width="10" height="14" rx="1.5"/><path d="M13 12h8M18 9l3 3-3 3"/>'),
  names:SV('<path d="M3 12l5-7h13v14H8z"/><circle cx="9" cy="12" r="1.5"/>'),
  sortA:SV('<path d="M7 4v16m0 0l-3-3m3 3l3-3"/><path d="M14 6h3M14 12h5M14 18h7"/>'),
  sortD:SV('<path d="M7 4v16m0 0l-3-3m3 3l3-3"/><path d="M14 6h7M14 12h5M14 18h3"/>'),
  filter:SV('<path d="M3 5h18l-7 8v6l-4-2v-4z"/>'),
  find:SV('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>'),
  pivot:SV('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/><path d="M13 13h4v4" />'),
  pvr:SV('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
  dedupe:SV('<rect x="3" y="3" width="12" height="12" rx="2"/><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M12.5 15h5" stroke="#ff7b7b"/>'),
  split:SV('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14" stroke-dasharray="2 2"/><path d="M6 12h3M15 12h3"/>'),
  trim:SV('<path d="M4 8h16M4 16h16"/><path d="M8 12h8" stroke-dasharray="1.5 2.5"/>'),
  lock:SV('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  unlock:SV('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.7-1.5"/>'),
  lockS:SV('<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="8.5" y="11" width="7" height="6" rx="1"/><path d="M10 11V9a2 2 0 0 1 4 0v2"/>'),
  unlockS:SV('<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="8.5" y="11" width="7" height="6" rx="1"/><path d="M10 11V9a2 2 0 0 1 3.8-.8"/>'),
  fit:SV('<path d="M3 4v16M21 4v16M7 12h10M7 12l3-3M7 12l3 3M17 12l-3-3M17 12l-3 3"/>'),
  fzRow:SV('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18" stroke-width="3"/>'),
  fzCol:SV('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18" stroke-width="3"/>'),
  fzHere:SV('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18" stroke-width="3"/>'),
  fzOff:SV('<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 2"/><path d="M3 9h18M9 3v18"/>'),
  tstyle:SV('<rect x="3" y="4" width="18" height="16" rx="2"/><rect x="3" y="4" width="18" height="4.5" fill="currentColor" stroke="none"/><path d="M3 12.5h18M3 16.5h18" stroke-width="1.5"/><rect x="3.8" y="12.8" width="16.4" height="3.4" fill="currentColor" stroke="none" opacity=".35"/>'),
  chart:SV('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  viz:SV('<circle cx="12" cy="12" r="3"/><circle cx="4.5" cy="5" r="2"/><circle cx="19.5" cy="5" r="2"/><circle cx="4.5" cy="19" r="2"/><circle cx="19.5" cy="19" r="2"/><path d="M6 6.5l3.8 3.8M18 6.5l-3.8 3.8M6 17.5l3.8-3.8M18 17.5l-3.8-3.8"/>'),
  scale:SV('<rect x="3" y="4" width="5" height="16" rx="1" fill="#ff6b6b" stroke="none"/><rect x="9.5" y="4" width="5" height="16" rx="1" fill="#ffc93c" stroke="none"/><rect x="16" y="4" width="5" height="16" rx="1" fill="#3fe08f" stroke="none"/>'),
  bars:SV('<path d="M3 6h12M3 12h17M3 18h7" stroke-width="3"/>'),
  cfrule:SV('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18"/><rect x="4" y="11" width="16" height="3.5" fill="#ff6b6b" stroke="none"/>'),
  cfviz:SV('<path d="M3 18l4-6 4 3 5-9 5 5"/><path d="M4 21h5M12 21h8" stroke-width="3"/>'),
  clearCf:SV('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 9l6 6M15 9l-6 6" stroke="#ff7b7b"/>'),
  ai:SV('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  calc:SV('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>'),
  table:SV('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M10 4v16"/>'),
  askI:SV('<path d="M4 5h16v11H9l-5 4z"/><path d="M10 9a2 2 0 1 1 2.5 1.9V12M12 14h.01"/>'),
  aifn:'<i style="font-family:Georgia,serif;font-size:14px">fx</i>',
  rerun:SV('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
  aiset:SV('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>')
};
/* id: what FSAPI.run runs. tab · g (group: a divider between groups) · lb (short label) · tt (title / long name) · kw (search synonyms)
   key (shortcut) · sel (acts on the selection right away: search shows the button instead of running it) · el (element id app.js uses) */
var C=[
  {id:'undo',tab:'home',g:1,ic:I.undo,lb:'실행 취소',kw:'undo 되돌리기 취소 뒤로',key:'Ctrl+Z'},
  {id:'redo',tab:'home',g:1,ic:I.redo,lb:'다시 실행',kw:'redo 다시하기',key:'Ctrl+Y'},
  {id:'copy',tab:'home',g:2,ic:I.copy,lb:'복사',kw:'copy 복사하기',key:'Ctrl+C',sel:1},
  {id:'cut',tab:'home',g:2,ic:I.cut,lb:'잘라내기',kw:'cut 오려두기 잘라',key:'Ctrl+X',sel:1},
  {id:'paste',tab:'home',g:2,ic:I.paste,lb:'붙여넣기',kw:'paste 붙이기',key:'Ctrl+V',sel:1},
  {id:'bold',tab:'home',g:3,ic:I.bold,lb:'굵게',kw:'bold 진하게 굵은 글씨',key:'Ctrl+B',sel:1,el:'bBold'},
  {id:'italic',tab:'home',g:3,ic:I.italic,lb:'기울임',kw:'italic 이탤릭 기울게',key:'Ctrl+I',sel:1,el:'bItal'},
  {id:'under',tab:'home',g:3,ic:'<u style="font-size:15px">U</u>',lb:'밑줄',kw:'underline 밑줄 줄',key:'Ctrl+U',sel:1,el:'bUnder'},
  {id:'strike',tab:'format',g:1,ic:'<s style="font-size:15px">S</s>',lb:'취소선',kw:'strikethrough 취소선 가운데 줄',key:'Ctrl+5',sel:1,el:'bStrike'},
  {id:'fsz',tab:'home',g:3,ic:'',lb:'글자 크기',kw:'font size 글자 크기 글씨 크기 폰트 크게 작게',sel:1,select:'fszSel',opts:[['','크기'],['9','9'],['10','10'],['11','11'],['12','12'],['13','13 (기본)'],['14','14'],['16','16'],['18','18'],['20','20'],['24','24'],['28','28']]},
  {id:'ffam',tab:'format',g:1,ic:'',lb:'글꼴',kw:'font family 글꼴 서체 폰트',sel:1,select:'ffSel',opts:[['','글꼴'],['sans','기본 고딕'],['serif','명조'],['mono','고정폭'],['hand','손글씨']]},
  {id:'painter',tab:'format',g:1,ic:SV('<rect x="4" y="3" width="14" height="6" rx="1.5"/><path d="M18 6h2v5h-8v3"/><path d="M11 14h2v7h-2z"/>'),lb:'서식 복사',tt:'서식 복사 (지금 칸의 모양을 다음에 고르는 칸에 입혀요)',kw:'format painter copy format 서식 복사 붓 모양 복사',el:'bPaint'},
  {id:'fc',tab:'home',g:3,ic:I.fc,lb:'글자색',kw:'font color text color 글씨 색 글자 색 폰트',sel:1,color:['fcPick','fcChip','#ff5d5d']},
  {id:'bg',tab:'home',g:3,ic:I.bg,lb:'채우기 색',kw:'fill color background 배경 색 칸 색 바탕',sel:1,color:['bgPick','bgChip','#3a5bd9']},
  {id:'al-l',tab:'home',g:4,ic:I.all,lb:'왼쪽',tt:'왼쪽 정렬',kw:'align left 정렬',sel:1},
  {id:'al-c',tab:'home',g:4,ic:I.alc,lb:'가운데',tt:'가운데 정렬',kw:'align center 정렬 가운데',sel:1},
  {id:'al-r',tab:'home',g:4,ic:I.alr,lb:'오른쪽',tt:'오른쪽 정렬',kw:'align right 정렬',sel:1},
  {id:'nf',tab:'home',g:5,ic:I.nf,lb:'표시 형식',kw:'number format 숫자 형식 통화 퍼센트 원 달러 percent currency',sel:1,select:'nfSel'},
  {id:'decDn',tab:'home',g:5,ic:I.decDn,lb:'소수점 −',tt:'소수점 줄이기',kw:'decimal 소수 자릿수 줄이기',sel:1},
  {id:'decUp',tab:'home',g:5,ic:I.decUp,lb:'소수점 +',tt:'소수점 늘리기',kw:'decimal 소수 자릿수 늘리기',sel:1},
  {id:'border',tab:'format',g:2,ic:I.border,lb:'테두리',kw:'border lines 선 칸 선',sel:1},
  {id:'borderdlg',tab:'format',g:2,ic:I.borderdlg,lb:'테두리 설정',tt:'테두리 설정 (칸마다 쪽, 색)',kw:'border style color 선 색 굵기'},
  {id:'tstyle',tab:'format',g:2,ic:I.tstyle,lb:'표 스타일',tt:'표 스타일 (줄무늬, 머리글 색)',kw:'table style stripe banded header color 표 스타일 줄무늬 머리글 색 꾸미기 디자인',sel:1},
  {id:'merge',tab:'format',g:3,ic:I.merge,lb:'병합',tt:'칸 병합 / 병합 풀기',kw:'merge cells 합치기 셀 병합',sel:1,el:'bMerge'},
  {id:'r.unmerge',tab:'format',g:3,ic:I.unmerge,lb:'병합 풀기',tt:'선택 범위 병합 풀기',kw:'unmerge 병합 해제',sel:1},
  {id:'clearfmt',tab:'format',g:4,ic:I.clearfmt,lb:'서식 지우기',kw:'clear format 서식 없애기 초기화',sel:1},
  {id:'r.clr',tab:'home',g:6,ic:I.clr,lb:'내용 지우기',tt:'선택한 내용 지우기',kw:'clear delete contents 지우기 삭제 내용 비우기',key:'Delete',sel:1},
  {id:'r.insRowA',tab:'rowcol',g:1,ic:I.rowA,lb:'위에 행',tt:'위에 행 넣기',kw:'insert row above 행 추가 줄 넣기 삽입',sel:1},
  {id:'r.insRowB',tab:'rowcol',g:1,ic:I.rowB,lb:'아래에 행',tt:'아래에 행 넣기',kw:'insert row below 행 추가 줄 넣기 삽입',sel:1},

  {id:'sum',tab:'insert',g:1,ic:I.sum,lb:'자동 합계',kw:'sum autosum total 합계 더하기 시그마',key:'Alt+=',sel:1},
  {id:'fn',tab:'insert',g:1,ic:I.fn,lb:'함수',tt:'함수 넣기',kw:'function formula 함수 수식 fx'},
  {id:'r.insColL',tab:'rowcol',g:1,ic:I.colL,lb:'왼쪽에 열',tt:'왼쪽에 열 넣기',kw:'insert column left 열 추가 넣기 삽입',sel:1},
  {id:'r.insColR',tab:'rowcol',g:1,ic:I.colR,lb:'오른쪽에 열',tt:'오른쪽에 열 넣기',kw:'insert column right 열 추가 넣기 삽입',sel:1},
  {id:'r.delRow',tab:'rowcol',g:1,ic:I.delRow,lb:'행 지우기',tt:'선택한 행 지우기',kw:'delete row remove 행 삭제 줄 지우기',sel:1},
  {id:'r.delCol',tab:'rowcol',g:1,ic:I.delCol,lb:'열 지우기',tt:'선택한 열 지우기',kw:'delete column remove 열 삭제',sel:1},
  {id:'r.hideRow',tab:'rowcol',g:2,ic:SV('<rect x="3" y="9" width="18" height="6" rx="1.5" stroke-dasharray="2 2"/><path d="M3 5h18M3 19h18"/>'),lb:'행 숨기기',tt:'선택한 행 숨기기',kw:'hide rows 행 숨기기 감추기',sel:1},
  {id:'r.hideCol',tab:'rowcol',g:2,ic:SV('<rect x="9" y="3" width="6" height="18" rx="1.5" stroke-dasharray="2 2"/><path d="M5 3v18M19 3v18"/>'),lb:'열 숨기기',tt:'선택한 열 숨기기',kw:'hide columns 열 숨기기 감추기',sel:1},
  {id:'check',tab:'insert',g:3,ic:I.check,lb:'체크박스',kw:'checkbox tick 체크 확인란',sel:1},
  {id:'dv',tab:'insert',g:3,ic:I.dv,lb:'목록',tt:'드롭다운 목록',kw:'dropdown list validation 드롭다운 선택 목록 고르기'},
  {id:'note',tab:'insert',g:3,ic:I.note,lb:'메모',kw:'note comment 메모 댓글 주석',el:'bNote'},
  {id:'link',tab:'insert',g:3,ic:SV('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),lb:'링크',tt:'링크 넣기 (Ctrl+누르면 열려요)',kw:'hyperlink link url 링크 주소 하이퍼링크 연결'},
  {id:'img',tab:'insert',g:3,ic:SV('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>'),lb:'그림',tt:'그림 넣기',kw:'image picture photo 그림 사진 이미지'},
  {id:'d.xref',tab:'insert',g:4,ic:I.xref,lb:'다른 시트 참조',tt:'다른 시트 참조 만들기',kw:'reference other sheet link 시트 참조 연결'},
  {id:'d.names',tab:'insert',g:4,ic:I.names,lb:'이름 범위',tt:'이름 범위 관리',kw:'named range name 이름 정의 이름표'},

  {id:'sortA',tab:'data',g:1,ic:I.sortA,lb:'오름차순',tt:'오름차순 정렬',kw:'sort ascending a-z 정렬 오름 작은 순',sel:1},
  {id:'sortD',tab:'data',g:1,ic:I.sortD,lb:'내림차순',tt:'내림차순 정렬',kw:'sort descending z-a 정렬 내림 큰 순',sel:1},
  {id:'filter',tab:'data',g:1,ic:I.filter,lb:'필터',kw:'filter 거르기 필터링 걸러내기',key:'Ctrl+Shift+L',el:'bFilter'},
  {id:'find',tab:'data',g:1,ic:I.find,lb:'찾기·바꾸기',tt:'찾기와 바꾸기',kw:'find replace search 찾기 바꾸기 검색 치환 바꿈',key:'Ctrl+F'},
  {id:'d.pivot',tab:'data',g:2,ic:I.pivot,lb:'피벗 테이블',tt:'피벗 테이블 만들기',kw:'pivot table summary 피벗 요약 집계 묶기'},
  {id:'d.pvRefresh',tab:'data',g:2,ic:I.pvr,lb:'피벗 새로 고침',kw:'pivot refresh 피벗 새로고침 갱신 업데이트'},
  {id:'d.dedupe',tab:'data',g:3,ic:I.dedupe,lb:'중복 제거',tt:'중복 항목 제거',kw:'duplicate remove dedupe 중복 같은 값 겹친'},
  {id:'d.split',tab:'data',g:3,ic:I.split,lb:'텍스트 나누기',tt:'텍스트를 여러 열로 나누기',kw:'split text columns 나누기 분리 쪼개기 쉼표'},
  {id:'d.trim',tab:'data',g:3,ic:I.trim,lb:'공백 정리',tt:'공백 정리 (앞뒤·겹친 공백)',kw:'trim spaces clean 공백 띄어쓰기 정리 빈칸',sel:1},
  {id:'r.unhide',tab:'rowcol',g:2,ic:SV('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),lb:'숨기기 취소',tt:'숨긴 행·열 모두 보이기',kw:'unhide show rows columns 숨기기 해제 보이기 취소'},
  {id:'r.fitCol',tab:'rowcol',g:2,ic:I.fit,lb:'열 너비 맞춤',tt:'선택한 열 너비 자동 맞춤',kw:'autofit column width 너비 폭 맞춤 자동',sel:1},
  {id:'r.fzMenu',tab:'rowcol',g:3,ic:I.fzHere,lb:'틀 고정',tt:'틀 고정 (첫 행, 첫 열 고르기)',kw:'freeze panes 고정 틀 머리글 행 열 스크롤'},
  {id:'d.goal',tab:'data',g:6,ic:SV('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>'),lb:'목표값 찾기',tt:'목표값 찾기 (수식 결과가 원하는 값이 되게 칸 값을 찾아요)',kw:'goal seek what if 목표값 찾기 가상 분석 역산'},
  {id:'d.trace',tab:'data',g:6,ic:SV('<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 8l8 8M16 16v-4M16 16h-4"/>'),lb:'수식 추적',tt:'수식 추적 (이 칸이 쓰는 칸과 이 칸을 쓰는 칸)',kw:'trace precedents dependents 참조 추적 연결 화살표 수식',sel:1},
  {id:'r.fzTop',nobtn:1,tab:'rowcol',g:3,ic:I.fzRow,lb:'첫 행 고정',tt:'맨 위 1행을 고정',kw:'freeze top row 고정 틀 머리글 첫 행 맨 위'},
  {id:'r.fzLeft',nobtn:1,tab:'rowcol',g:3,ic:I.fzCol,lb:'첫 열 고정',tt:'맨 왼쪽 1열을 고정',kw:'freeze first column 고정 틀 첫 열 맨 왼쪽'},
  {id:'r.fzBoth',nobtn:1,tab:'rowcol',g:3,ic:I.fzHere,lb:'첫 행과 첫 열 고정',kw:'freeze top row and first column 고정 틀 첫 행 첫 열'},
  {id:'r.fzRow',nobtn:1,tab:'rowcol',g:3,ic:I.fzRow,lb:'행 고정',tt:'여기까지 행 고정',kw:'freeze rows 고정 틀 머리글'},
  {id:'r.fzCol',nobtn:1,tab:'rowcol',g:3,ic:I.fzCol,lb:'열 고정',tt:'여기까지 열 고정',kw:'freeze columns 고정 틀'},
  {id:'r.fzHere',nobtn:1,tab:'rowcol',g:3,ic:I.fzHere,lb:'이 칸 기준 고정',tt:'이 칸의 위·왼쪽 고정 (틀 고정)',kw:'freeze panes 고정 틀'},
  {id:'r.fzOff',nobtn:1,tab:'rowcol',g:3,ic:I.fzOff,lb:'고정 풀기',kw:'unfreeze 고정 해제 틀 풀기'},
  {id:'d.lockSel',tab:'view',g:1,ic:I.lock,lb:'범위 잠그기',tt:'선택 범위 잠그기',kw:'lock protect 잠금 잠그기 잠그다 보호',sel:1},
  {id:'d.unlockSel',tab:'view',g:1,ic:I.unlock,lb:'잠금 풀기',tt:'선택 범위 잠금 풀기',kw:'unlock 잠금 해제 풀기 잠금',sel:1},
  {id:'d.lockSheet',tab:'view',g:1,ic:I.lockS,lb:'시트 잠그기',tt:'시트 전체 잠그기',kw:'lock protect sheet 잠금 잠그기 시트 보호'},
  {id:'d.unlockSheet',tab:'view',g:1,ic:I.unlockS,lb:'시트 잠금 풀기',tt:'시트 잠금 모두 풀기',kw:'unlock sheet 잠금 해제 풀기 잠금'},
  {id:'print',tab:'view',g:2,ic:I.print,lb:'인쇄',tt:'인쇄 (PDF 저장)',kw:'print pdf 프린트 출력',key:'Ctrl+P'},
  {id:'keys',tab:'view',g:2,ic:I.keys,lb:'단축키',tt:'단축키 보기',kw:'shortcuts keyboard keys 키보드 도움말',key:'Ctrl+/'},

  {id:'chart',tab:'chart',g:1,ic:I.chart,lb:'차트',tt:'차트 만들기',kw:'chart graph 차트 그래프 막대 꺾은선 원'},
  {id:'viz',tab:'chart',g:1,ic:I.viz,lb:'시각화',kw:'visualize diagram mind map 시각화 다이어그램 마인드맵 그래프 차트'},
  {id:'scale',tab:'chart',g:2,ic:I.scale,lb:'색 단계',kw:'color scale heatmap 색 단계 색깔 히트맵',sel:1},
  {id:'bars',tab:'chart',g:2,ic:I.bars,lb:'데이터 막대',kw:'data bar 막대 그래프',sel:1},
  {id:'cfrule',tab:'chart',g:2,ic:I.cfrule,lb:'조건 서식',tt:'조건부 서식',kw:'conditional format rule highlight 조건부 서식 규칙 강조 색칠'},
  {id:'cfviz',tab:'chart',g:2,ic:I.cfviz,lb:'아이콘',tt:'미니 막대, 스파크라인, 아이콘',kw:'sparkline icon mini bar 스파크라인 아이콘 미니 막대 신호등 화살표'},
  {id:'r.clearCf',tab:'chart',g:2,ic:I.clearCf,lb:'조건 서식 지우기',tt:'선택 범위의 조건 서식 모두 없애기',kw:'clear rules conditional 조건 서식 지우기 없애기',sel:1},

  {id:'ai.formula',tab:'ai',g:1,ic:I.ai,lb:'수식 만들기',tt:'AI로 수식·그래프·표 만들기',kw:'ai formula 인공지능 수식 함수'},
  {id:'ai.calc',tab:'ai',g:1,ic:I.calc,lb:'AI 계산',kw:'ai calculate unit 계산 단위 변환 할인'},
  {id:'ai.graph',tab:'ai',g:1,ic:I.chart,lb:'그래프 만들기',kw:'ai chart graph 차트 그래프'},
  {id:'ai.table',tab:'ai',g:1,ic:I.table,lb:'표 만들기',kw:'ai table 표 만들기'},
  {id:'ai.ask',tab:'ai',g:1,ic:I.askI,lb:'질문·요약',kw:'ai ask question summary 질문 요약 물어보기'},
  {id:'ai.fn',tab:'ai',g:2,ic:I.aifn,lb:'AI 함수',tt:'AI 함수 쓰는 법',kw:'ai function =ai translate 번역 함수'},
  {id:'ai.rerun',tab:'ai',g:2,ic:I.rerun,lb:'다시 묻기',tt:'선택한 AI 칸 다시 묻기',kw:'ai rerun refresh 다시 묻기 새로',sel:1},
  {id:'ai.set',tab:'ai',g:2,ic:I.aiset,lb:'AI 설정',kw:'ai settings api key model 설정 키 모델'},

  {id:'f.new',tab:'file',lb:'새 문서',kw:'new document file 새 파일 만들기'},
  {id:'f.tpl',tab:'file',lb:'템플릿으로 새 문서',kw:'template 템플릿 서식 양식'},
  {id:'f.open',tab:'file',lb:'파일 열기 (엑셀, CSV)',kw:'open import excel xlsx csv 열기 불러오기 엑셀 가져오기'},
  {id:'f.url',tab:'file',lb:'주소에서 표 가져오기',kw:'import url csv web link 주소 링크 웹 표 가져오기 불러오기'},
  {id:'f.xlsx',tab:'file',lb:'엑셀 파일로 저장 (.xlsx)',kw:'save export excel xlsx download 저장 내보내기 다운로드 엑셀'},
  {id:'f.csv',tab:'file',lb:'이 시트를 CSV로 저장',kw:'csv export save 저장 내보내기'},
  {id:'f.docs',tab:'file',lb:'문서 관리',kw:'documents manage files 문서 목록 관리 휴지통'},
  {id:'f.del',tab:'file',lb:'이 문서 지우기',kw:'delete document 문서 삭제 지우기'},
  {id:'t.add',tab:'sheet',lb:'시트 추가',kw:'add sheet new tab 시트 탭 추가 새 시트'},
  {id:'t.rename',tab:'sheet',lb:'시트 이름 바꾸기',kw:'rename sheet 시트 이름 바꾸기 변경'},
  {id:'t.dup',tab:'sheet',lb:'시트 복제',kw:'duplicate copy sheet 시트 복제 복사 중복'},
  {id:'t.del',tab:'sheet',lb:'시트 지우기',kw:'delete sheet 시트 삭제 지우기'}
];
var BY={}; C.forEach(function(c){ BY[c.id]=c; });
var MAC=/Mac|iPhone|iPad|iPod/.test(navigator.platform||'')||(navigator.userAgent||'').indexOf('Mac OS')>=0;
function keyText(k){ return k?(MAC?k.replace(/Ctrl\+/g,'⌘').replace(/Alt\+/g,'⌥').replace(/Shift\+/g,'⇧'):k.replace(/\+/g,' + ')):''; }
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function tabName(t){ for(var i=0;i<TABS.length;i++) if(TABS[i][0]===t) return TABS[i][1]; return XTAB[t]||t; }

/* ---------- ribbon tabs ---------- */
var rtabs=$('rtabs'), rib=$('ribbon'), cur='home';
try{ var sv=localStorage.getItem(LS); if(TABS.some(function(t){ return t[0]===sv; })) cur=sv; }catch(e){}
rtabs.innerHTML=TABS.map(function(t){ return '<button class="rtab'+(t[0]==='ai'?' aib':'')+'" role="tab" data-tab="'+t[0]+'">'+(t[0]==='ai'?'<span aria-hidden="true">✨</span> ':'')+t[1]+'</button>'; }).join('');
var html='', last={};
C.forEach(function(c){
  if(c.nobtn||!TABS.some(function(t){ return t[0]===c.tab; })) return;
  if(last[c.tab]!=null&&last[c.tab]!==c.g) html+='<span class="sepv" data-tab="'+c.tab+'"></span>';
  last[c.tab]=c.g;
  var tt=esc(c.tt||c.lb)+(c.key?' ('+keyText(c.key)+')':''), cls='rb'+(c.tab==='ai'?' aib':'');
  if(c.color) html+='<span class="'+cls+'" data-tab="'+c.tab+'" data-k="'+c.id+'" title="'+tt+'">'+c.ic+'<span class="lb">'+esc(c.lb)+'</span><span class="chip" id="'+c.color[1]+'" style="background:'+c.color[2]+'"></span><input type="color" id="'+c.color[0]+'" value="'+c.color[2]+'" aria-label="'+esc(c.lb)+'"></span>';
  else if(c.select&&c.opts) html+='<select id="'+c.select+'" data-tab="'+c.tab+'" data-k="'+c.id+'" title="'+tt+'" aria-label="'+esc(c.lb)+'">'+c.opts.map(function(o){ return '<option value="'+esc(o[0])+'">'+esc(o[1])+'</option>'; }).join('')+'</select>';
  else if(c.select) html+='<select id="'+c.select+'" data-tab="'+c.tab+'" data-k="'+c.id+'" title="'+tt+'" aria-label="'+esc(c.lb)+'"><option value="">일반</option><option value="n0">1,234</option><option value="n2">1,234.56</option><option value="p0">12%</option><option value="p1">12.3%</option><option value="w0">₩1,234</option><option value="u2">$1,234.56</option><option value="t">텍스트</option></select>';
  else html+='<button class="'+cls+'" data-tab="'+c.tab+'" data-k="'+c.id+'" data-cmd="'+c.id+'"'+(c.el?' id="'+c.el+'"':'')+' title="'+tt+'">'+c.ic+'<span class="lb">'+esc(c.lb)+'</span></button>';
});
rib.innerHTML=html;
function showTab(t,keep){
  cur=t; rib.setAttribute('data-cur',t);
  Array.prototype.forEach.call(rtabs.children,function(b){ var on=b.dataset.tab===t; b.classList.toggle('on',on); b.setAttribute('aria-selected',on?'true':'false'); });
  Array.prototype.forEach.call(rib.children,function(el){ el.hidden=el.dataset.tab!==t; });
  if(!keep) rib.scrollLeft=0;
  edges();
  try{ localStorage.setItem(LS,t); }catch(e){}
}
rtabs.addEventListener('click',function(e){ var b=e.target.closest('[data-tab]'); if(b) showTab(b.dataset.tab); });
/* fade the edge that has more buttons past it, so a scrollable tab says so; a mouse wheel scrolls it sideways */
function edges(){ var m=rib.scrollWidth-rib.clientWidth; rib.classList.toggle('fadeR',rib.scrollLeft<m-4); rib.classList.toggle('fadeL',rib.scrollLeft>4); }
rib.addEventListener('scroll',edges,{passive:true}); window.addEventListener('resize',edges); window.addEventListener('load',edges);
rib.addEventListener('wheel',function(e){ if(Math.abs(e.deltaY)>Math.abs(e.deltaX)&&rib.scrollWidth>rib.clientWidth){ rib.scrollLeft+=e.deltaY; e.preventDefault(); } },{passive:false});
showTab(cur);
function flash(c){
  if(TABS.some(function(t){ return t[0]===c.tab; })) showTab(c.tab);
  var el=rib.querySelector('[data-k="'+c.id+'"]'); if(!el) return;
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  try{ el.scrollIntoView({block:'nearest',inline:'center'}); }catch(e){}
  clearTimeout(el._ft); el._ft=setTimeout(function(){ el.classList.remove('flash'); },2600);
  if(c.select) el.focus();
  return el;
}

/* ---------- command search ---------- */
if($('cmdK')) $('cmdK').textContent=MAC?'⌘K':'Ctrl K';
var q=$('cmdQ'), box=$('cmdList'), top=document.querySelector('.top'), items=[], idx=0;
function norm(s){ return String(s||'').toLowerCase().replace(/[\s·・,.()\/]+/g,''); }
C.forEach(function(c){
  c._l=norm(c.lb)+'|'+norm(T(c.lb)); c._t=norm(c.tt||'')+'|'+norm(T(c.tt||''));
  c._k=c.kw.split(/\s+/).map(norm).join('|')+'|'+norm(tabName(c.tab))+'|'+norm(T(tabName(c.tab)));
});
function score(c,terms){
  var s=0;
  for(var i=0;i<terms.length;i++){ var w=terms[i], p=c._l.indexOf(w);
    if(p===0||c._l.indexOf('|'+w)>=0) s+=40; else if(p>0) s+=25; else if(c._k.indexOf(w)>=0) s+=(c._k.indexOf('|'+w)>=0||c._k.indexOf(w)===0)?18:12; else if(c._t.indexOf(w)>=0) s+=8; else return 0; }
  return s;
}
function search(text){
  var terms=String(text||'').toLowerCase().split(/\s+/).map(norm).filter(Boolean);
  if(!terms.length) return C.slice();
  return C.map(function(c,i){ return {c:c,s:score(c,terms),i:i}; }).filter(function(x){ return x.s>0; })
    .sort(function(a,b){ return b.s-a.s||a.i-b.i; }).map(function(x){ return x.c; });
}
function place(){
  var r=q.getBoundingClientRect(), w=Math.min(440,innerWidth-16);
  box.style.width=w+'px'; box.style.left=Math.max(8,Math.min(r.right-w,innerWidth-w-8))+'px'; box.style.top=(r.bottom+6)+'px';
  box.style.maxHeight=Math.max(160,Math.min(innerHeight*0.66,innerHeight-r.bottom-20))+'px';
}
function render(){
  items=search(q.value); idx=0;
  if(!items.length){ box.innerHTML='<div class="cmdNone">'+esc(T('맞는 기능이 없어요'))+'</div>'; }
  else box.innerHTML=items.map(function(c,i){
    return '<button type="button" class="cmdIt'+(i?'':' on')+(c.tab==='ai'?' aib':'')+'" data-i="'+i+'" data-notr><span class="ci">'+(c.ic||'')+'</span><span class="cn">'+esc(T(c.lb))+(c.tt&&c.tt!==c.lb?'<small>'+esc(T(c.tt))+'</small>':'')+'</span><span class="ct">'+esc(T(tabName(c.tab)))+'</span>'+(c.key?'<kbd>'+esc(keyText(c.key))+'</kbd>':'')+'</button>'; }).join('');
  box.classList.add('open'); place();
}
function mark(i){ var bs=box.querySelectorAll('.cmdIt'); if(!bs.length) return; idx=(i+bs.length)%bs.length; bs.forEach(function(b,j){ b.classList.toggle('on',j===idx); }); try{ bs[idx].scrollIntoView({block:'nearest'}); }catch(e){} }
function closeS(blur){ box.classList.remove('open'); top.classList.remove('srch'); if(blur) q.blur(); }
function openS(){ var A=window.FSAPI; if(A&&A.commitEdit&&document.activeElement!==q) A.commitEdit(); top.classList.add('srch'); q.focus(); q.select(); render(); }
function exec(c){
  closeS(true); q.value='';
  var A=window.FSAPI;
  if(c.sel||c.color||c.select){ flash(c); if(A&&A.toast) A.toast(T('고른 칸에 쓰려면 반짝이는 버튼을 누르세요')); return; }
  if(TABS.some(function(t){ return t[0]===c.tab; })) showTab(c.tab,true);
  if(A&&A.run) A.run(c.id);
}
q.addEventListener('focus',function(){ top.classList.add('srch'); render(); });
q.addEventListener('input',render);
q.addEventListener('blur',function(){ setTimeout(function(){ if(document.activeElement!==q) closeS(); },200); });
q.addEventListener('keydown',function(e){
  if(e.isComposing||e.keyCode===229) return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); mark(idx+(e.key==='ArrowDown'?1:-1)); }
  else if(e.key==='Enter'){ e.preventDefault(); if(items[idx]) exec(items[idx]); }
  else if(e.key==='Escape'){ e.preventDefault(); q.value=''; closeS(true); }
});
box.addEventListener('mousedown',function(e){ e.preventDefault(); });
box.addEventListener('click',function(e){ var b=e.target.closest('.cmdIt'); if(b&&items[+b.dataset.i]) exec(items[+b.dataset.i]); });
$('cmdBtn').addEventListener('click',function(){ openS(); });
window.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&!e.altKey&&!e.shiftKey&&(e.key==='k'||e.key==='K'||e.code==='KeyK')){ e.preventDefault(); e.stopPropagation(); if(document.activeElement===q&&box.classList.contains('open')) closeS(true); else openS(); }
},true);
window.addEventListener('resize',function(){ if(box.classList.contains('open')) place(); });

window.FSCMD={list:C, byId:BY, tabs:TABS, show:showTab, flash:flash, search:search, exec:function(id){ if(BY[id]) exec(BY[id]); }, current:function(){ return cur; }};
})();
