/* Fry Slides ribbon: one command registry (CMDS) draws the tabs (파일 · 홈 · 삽입 · 디자인 · 발표 · AI) and feeds the
   command search ("기능 찾기", the 🔍 box in the top bar or Ctrl+K / Cmd+K).
   Loaded before app.js: buttons with an "el" id are the old toolbar buttons, app.js and ai-slides.js still give them their
   click handlers and turn them off. The other commands call app.js through window.FSLC (and the AI ones window.FSLAI).
   A command whose "need" is not met (no slide, nothing picked, wrong kind of slide) is dimmed; pressing it says why. */
(function(){
'use strict';
var T=FFT.T, $=function(id){ return document.getElementById(id); };
var MAC=/Mac|iPhone|iPad|iPod/.test(navigator.platform||'')||/Macintosh/.test(navigator.userAgent||'');
var TABS=[['file','파일'],['home','홈'],['ins','삽입'],['des','디자인'],['pres','발표'],['ai','AI']], TABN={};
TABS.forEach(function(t){ TABN[t[0]]=t[1]; });
var LSK='ffslides.tab';

var SP='M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z', SP2='M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z';
var IC={
  plus:'<path d="M12 5v14M5 12h14"/>', list:'<path d="M4 6h16M4 12h16M4 18h16"/>', deck:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  pen:'<path d="M4 20h4L19 9l-4-4L4 16z"/>', trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', down:'<path d="M12 3v12m0 0l-5-5m5 5l5-5M5 21h14"/>',
  print:'<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>', md:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 15V9l3 3 3-3v6M17 9v6m-2-2l2 2 2-2"/>',
  share:'<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
  undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>', redo:'<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  dup:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>', grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  hide:'<path d="M3 3l18 18"/><path d="M10.6 6.1A10 10 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-3.2 3.6M6.5 7.6C4.3 9.2 3 12 3 12s4 6 9 6a9 9 0 0 0 4-.9"/>',
  dots:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>', copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  brush:'<path d="M18 3l3 3-8.5 8.5-3-3z"/><path d="M9.5 11.5c-2.6 0-4 1.6-4 3.8 0 1.4-.8 2.6-2 3.2 3.4 1.4 8 .4 8.5-3.2"/>', paste:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6"/>', group:'<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3"/><rect x="7" y="7" width="6" height="6"/><rect x="11" y="11" width="6" height="6"/>',
  ungroup:'<rect x="3" y="3" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/>', layer:'<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  align:'<path d="M4 3v18"/><rect x="8" y="6" width="12" height="4" rx="1"/><rect x="8" y="14" width="7" height="4" rx="1"/>', find:'<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L20 20"/>',
  picfx:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 9"/><path d="M16 4v4M14 6h4"/>', alt:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6M7 16.5h3"/>',
  bold:'<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>', ital:'<path d="M10 5h8M6 19h8M14 5l-4 14"/>', under:'<path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14"/>', strike:'<path d="M4 12h16M8 7a4 4 0 0 1 4-2c2 0 4 1 4 3M8 17c1 1.5 2.5 2 4 2 2.4 0 4-1.2 4-3"/>', tcol:'<path d="M6 16L12 3l6 13M8.5 11h7"/><path d="M5 21h14" stroke-width="3"/>',
  keys:'<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>', pic:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 9"/>',
  conn:'<rect x="2" y="3" width="8" height="7" rx="1"/><rect x="14" y="14" width="8" height="7" rx="1"/><path d="M7 10l9 4"/><path d="M13 14h3v-3"/>', shape:'<rect x="3" y="11" width="10" height="10" rx="1"/><circle cx="16" cy="8" r="5"/>', emoji:'<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5c1 1.6 2.2 2.3 3.5 2.3s2.5-.7 3.5-2.3M9 9.5h.01M15 9.5h.01"/>',
  text:'<path d="M5 6h14M12 6v13M9 19h6"/>', table:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>', chart:'<path d="M5 20V11M10 20V5M15 20v-7M20 20v-4M3 20h18"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  refresh:'<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/>',
  unlink:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7"/><path d="M3 3l18 18"/>',
  imp:'<path d="M4 5h10M4 9h16M4 13h10M4 17h7"/><path d="M17 14l3 3-3 3"/>', toc:'<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  media:'<rect x="2" y="5" width="14" height="14" rx="2"/><path d="M16 10l6-3v10l-6-3"/>', smart:'<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="2" y="16" width="6" height="5" rx="1"/><rect x="16" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M5 16v-4h14v4"/>', rec:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/>',
  live:'<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M10 8.5l5 2.5-5 2.5z"/><path d="M8 21h8"/>',
  theme:'<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18c1.2 0 1.6-.8 1.6-1.6 0-1.3-1-1.6-1-2.8 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  bg:'<path d="M19 11l-8-8-7 7 8 8z"/><path d="M5 10h13"/><path d="M20 15s2 2.5 2 3.5a2 2 0 0 1-4 0c0-1 2-3.5 2-3.5z"/>', font:'<path d="M4 20L10 4h1l6 16M6.5 14h8"/>',
  master:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 16h18M6.5 6.5h4v4h-4z"/>', nums:'<path d="M9 4L7 20M17 4l-2 16M4 9h16M3 15h16"/>',
  footer:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 17h10"/>', fill:'<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  border:'<rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="4 3"/>', play:'<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/>',
  here:'<path d="M4 4v16"/><path d="M9 5v14l11-7z"/>', pv:'<rect x="2" y="4" width="13" height="9" rx="1.5"/><rect x="9" y="11" width="13" height="9" rx="1.5"/>',
  trans:'<rect x="3" y="5" width="10" height="14" rx="1.5"/><path d="M16 8l4 4-4 4"/>', auto:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  anim:'<path d="M5 19l6-6"/><path d="M14 4l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/><path d="M19 13l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  quiz:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14M12 17.5h.01"/>',
  ai:'<path d="'+SP+'"/><path d="'+SP2+'"/>', rew:'<path d="M4 20h4L16 12l-4-4-8 8z"/><path d="M17 3l.8 2.2 2.2.8-2.2.8L17 9l-.8-2.2-2.2-.8 2.2-.8z"/>',
  cut:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 7.5L20 18M8.5 16.5L20 6"/>', more:'<path d="M4 6h16M4 10h16M4 14h16M4 18h10"/>',
  spell:'<path d="M3 16l4-10 4 10M4.5 12.5h5"/><path d="M13 15l3 3 5-6"/>', aiset:'<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'
};
var LAYS=[['title','제목'],['section','구역 제목'],['bullets','글머리표'],['two','두 칸'],['stat','큰 숫자'],['quote','인용'],['closing','마무리'],['image','그림'],['agenda','차례'],['timeline','타임라인'],['table','표'],['chart','그래프'],['quiz','퀴즈'],['timer','타이머'],['live','살아있는 화면']];
var MSG={slide:'먼저 슬라이드를 만들어 주세요', busy:'AI가 다 만들 때까지 기다려 주세요', sel:'슬라이드에서 글상자·그림·도형을 먼저 골라 주세요', many:'도형을 두 개 이상 골라 주세요 (Shift를 누르고 누르기)',
  grp:'묶은 도형을 먼저 골라 주세요', shape:'슬라이드에서 도형을 먼저 골라 주세요', fillx:'선과 화살표에는 채우기가 없어요', conn:'이어 줄 도형·그림·글상자를 먼저 하나 골라 주세요', data:'표나 그래프 슬라이드에서 쓸 수 있어요',
  link:'시트와 연결한 슬라이드에서 쓸 수 있어요', quiz:'퀴즈 슬라이드에서 쓸 수 있어요', ai:'AI가 고칠 수 있는 슬라이드를 먼저 골라 주세요', clip:'복사한 도형이 없어요', els:'고를 수 있는 도형이 없어요', txt:'슬라이드에서 글이 있는 상자나 도형을 먼저 골라 주세요', pic:'슬라이드에서 그림을 먼저 골라 주세요', alt:'슬라이드에서 그림·도형·동영상을 먼저 골라 주세요'};

var S=function(){ return window.FSLC?FSLC.state():{}; }, C=function(){ return window.FSLC; }, AI=function(){ return window.FSLAI; };
/* need checks: return '' when the command can run now, or a MSG key */
var nSlide=function(st){ return st.busy?'busy':!st.slide?'slide':''; };
var nSel=function(st){ return nSlide(st)||(!st.sel?'sel':''); };
var nEl=function(st){ return nSlide(st)||(!st.nSel?'sel':''); };
var nShape=function(st){ return nSlide(st)||(!st.shape?'shape':''); };
var nTxt=function(st){ return nSlide(st)||(!st.txt?'txt':''); };
var nPic=function(st){ return nSlide(st)||(!st.pic?'pic':''); };
var nAlt=function(st){ return nSlide(st)||(!st.alt?'alt':''); };
var nConn=function(st){ return nSlide(st)||(!st.conn?'conn':''); };
var nData=function(st){ return nSlide(st)||(st.lay!=='table'&&st.lay!=='chart'?'data':''); };
var nLink=function(st){ return nSlide(st)||(!st.link?'link':''); };
var nAI=function(st){ return nSlide(st)||(!st.ai?'ai':''); };
var nNoGen=function(st){ return st.gen?'busy':''; };

/* the registry. el: an old toolbar id (app.js handles it); menu: opens a menu under the button; k: Korean synonyms for the search */
var CMDS=[
 {id:'newDeck', tab:'file', el:'newDeckBtn', ic:'plus', lb:'새 슬라이드 쇼', t:'새 슬라이드 쇼', sc:'Ctrl+Alt+N', k:'새 발표 새로 만들기 새 파일 시작'},
 {id:'mgr', tab:'file', el:'mgrBtn', ic:'list', lb:'내 슬라이드', t:'내 슬라이드 (발표 자료 관리)', k:'관리 목록 열기 불러오기 사본'},
 {id:'decks', tab:'file', el:'deckBtn', ic:'deck', lb:'발표 자료', t:'발표 자료 목록', menu:1, k:'다른 발표 바꾸기 전환 목록'},
 {id:'rename', tab:'file', ic:'pen', lb:'이름 바꾸기', t:'이름 바꾸기', k:'제목 파일 이름', need:function(){ return ''; }, run:function(){ C().rename(); }},
 {id:'delDeck', tab:'file', el:'delDeckBtn', ic:'trash', lb:'지우기', t:'이 슬라이드 쇼 지우기', cls:'dang', k:'삭제 발표 지우기 버리기'},
 {g:1},
 {id:'pptx', tab:'file', el:'pptxBtn', ic:'down', lb:'PPTX 받기', t:'PPTX 받기', cls:'pri', k:'파워포인트 내보내기 저장 다운로드 ppt'},
 {id:'print', tab:'file', ic:'print', lb:'PDF·인쇄', t:'PDF로 저장 · 인쇄', k:'피디에프 프린트 출력 내보내기', need:nNoGen, run:function(){ C().deck('print'); }},
 {id:'md', tab:'file', ic:'md', lb:'Markdown', t:'Markdown으로 저장', k:'마크다운 글로 저장 내보내기 md', need:nNoGen, run:function(){ C().deck('md'); }},
 {id:'share', tab:'file', el:'shareBtn', ic:'share', lb:'공유', t:'링크나 QR로 공유 (읽기 전용)', k:'링크 큐알 qr 보내기'},

 {id:'undo', tab:'home', el:'undoBtn', ic:'undo', lb:'되돌리기', t:'되돌리기', sc:'Ctrl+Z', k:'취소 실행 취소 언두'},
 {id:'redo', tab:'home', el:'redoBtn', ic:'redo', lb:'다시 하기', t:'다시 하기', sc:'Ctrl+Y', k:'다시 실행 재실행'},
 {g:1},
 {id:'add', tab:'home', el:'addBtn', ic:'plus', lb:'새 슬라이드', t:'새 슬라이드', sc:'Ctrl+Enter', k:'슬라이드 추가 넣기 쪽 추가 페이지'},
 {id:'dup', tab:'home', el:'dupBtn', ic:'dup', lb:'복제', t:'슬라이드 복제', sc:'Ctrl+D', k:'슬라이드 복사 똑같이'},
 {id:'del', tab:'home', el:'delBtn', ic:'trash', lb:'삭제', t:'슬라이드 삭제', sc:'Delete', cls:'dang', k:'슬라이드 지우기 빼기'},
 {id:'lay', tab:'home', el:'laySel', sel:1, lb:'레이아웃', t:'레이아웃', k:'모양 배치 슬라이드 종류'},
 {id:'sort', tab:'home', el:'sortBtn', ic:'grid', lb:'모아보기', t:'슬라이드 모아보기', k:'정리 순서 바꾸기 한눈에 여러 장'},
 {id:'hide', tab:'home', ic:'hide', lb:'건너뛰기', t:'발표할 때 건너뛰기', sc:'H', k:'숨기기 숨김 감추기', need:nSlide, on:function(st){ return st.hide; }, run:function(){ C().opt('hide'); }},
 {id:'opt', tab:'home', el:'optBtn', ic:'dots', lb:'옵션', t:'슬라이드 옵션', menu:1, k:'설정 더 보기 맨 앞으로 보내기 맨 뒤로 보내기'},
 {g:1},
 {id:'tfb', tab:'home', ic:'bold', lb:'굵게', t:'글자 굵게', k:'볼드 진하게 글씨 굵기 bold', need:nTxt, on:function(st){ return st.tf&&st.tf.b; }, run:function(){ C().tfToggle('b'); }},
 {id:'tfi', tab:'home', ic:'ital', lb:'기울임', t:'글자 기울임', k:'이탤릭 비스듬히 italic', need:nTxt, on:function(st){ return st.tf&&st.tf.i; }, run:function(){ C().tfToggle('i'); }},
 {id:'tfu', tab:'home', ic:'under', lb:'밑줄', t:'글자 밑줄', k:'언더라인 줄 긋기 underline', need:nTxt, on:function(st){ return st.tf&&st.tf.u; }, run:function(){ C().tfToggle('u'); }},
 {id:'tfs', tab:'home', ic:'strike', lb:'취소선', t:'글자 취소선', k:'가운데 줄 지우기 줄 긋기 strike', need:nTxt, on:function(st){ return st.tf&&st.tf.s; }, run:function(){ C().tfToggle('s'); }},
 {id:'tfc', tab:'home', ic:'tcol', lb:'글자 색', t:'글자 색과 글자 모양', menu:1, k:'글씨 색 폰트 색 색깔 글자 모양 서식', need:nTxt, run:function(b){ C().elMenu('tf',b); }},
 {g:1},
 {id:'copy', tab:'home', ic:'copy', lb:'복사', t:'고른 도형 복사', sc:'Ctrl+C', k:'도형 복사하기', need:nEl, run:function(){ C().copy(); }},
 {id:'paste', tab:'home', ic:'paste', lb:'붙여넣기', t:'붙여넣기', sc:'Ctrl+V', k:'도형 붙이기', need:function(st){ return nSlide(st)||(!st.clip?'clip':''); }, run:function(){ C().paste(); }},
 {id:'fpaint', tab:'home', ic:'brush', lb:'서식 복사', t:'서식 복사 (한 번 누르면 한 번, 두 번 누르면 Esc까지 계속)', sc:'Ctrl+Alt+C / V', k:'서식 복사 서식 붙이기 모양 복사 스타일 복사 색 복사 포맷 브러시 페인터', dbl:1, need:function(st){ return st.fp?'':nSel(st); }, on:function(st){ return st.fp; }, run:function(){ C().fpaint(false); }},
 {id:'group', tab:'home', ic:'group', lb:'묶기', t:'그룹으로 묶기', sc:'Ctrl+G', k:'그룹 묶음 합치기', need:function(st){ return nSlide(st)||(!st.group?'many':''); }, run:function(){ C().group(); }},
 {id:'ungroup', tab:'home', ic:'ungroup', lb:'풀기', t:'그룹 풀기', sc:'Ctrl+Shift+G', k:'그룹 해제 묶음 풀기', need:function(st){ return nSlide(st)||(!st.ungroup?'grp':''); }, run:function(){ C().ungroup(); }},
 {id:'layer', tab:'home', ic:'layer', lb:'겹침 순서', t:'겹치는 순서', sc:'Ctrl+]', menu:1, k:'순서 맨 앞 맨 뒤 앞으로 뒤로 레이어 위로 아래로', need:nEl, run:function(b){ C().elMenu('layer',b); }},
 {id:'align', tab:'home', ic:'align', lb:'맞추기', t:'슬라이드에서 맞추기', menu:1, k:'정렬 가운데 왼쪽 오른쪽 위쪽 아래쪽 줄 맞추기', need:nSel, run:function(b){ C().elMenu('align',b); }},
 {g:1},
 {id:'find', tab:'home', ic:'find', lb:'찾아 바꾸기', t:'찾아 바꾸기', k:'바꾸기 검색 글 찾기 치환', need:nSlide, run:function(){ C().deck('find'); }},
 {id:'keys', tab:'home', ic:'keys', lb:'단축키', t:'단축키 보기', sc:'?', k:'키보드 도움말', need:function(){ return ''; }, run:function(){ C().deck('keys'); }},

 {id:'pic', tab:'ins', el:'picBtn', ic:'pic', lb:'그림', t:'그림 넣기', k:'사진 이미지 그림 넣기'},
 {id:'objpic', tab:'ins', ic:'pic', lb:'일러스트', t:'일러스트·오브젝트 넣기', k:'일러스트 오브젝트 그림 스티커 아이콘 이모지 캐릭터', need:nSlide, run:function(){ C().objPic(); }},
 {id:'shape', tab:'ins', el:'shapeBtn', ic:'shape', lb:'도형', t:'도형·화살표 넣기', menu:1, k:'화살표 네모 동그라미 원 별 선 세모'},
 {id:'conn', tab:'ins', ic:'conn', lb:'연결선', t:'연결선 (고른 도형과 다른 도형을 이어요)', k:'선 화살표 이어 붙이기 연결 커넥터 도형 잇기', need:nConn, run:function(){ C().connect(); }},
 {id:'textbox', tab:'ins', ic:'text', lb:'글상자', t:'글상자 넣기', k:'텍스트 상자 글 쓰기 텍스트', need:nSlide, run:function(){ C().addShape('text'); }},
 {id:'media', tab:'ins', ic:'media', lb:'동영상·소리', t:'동영상·소리 넣기 (파일, YouTube)', k:'비디오 영상 오디오 음악 소리 유튜브 youtube mp4 mp3 미디어', need:nSlide, run:function(){ C().media(); }},
 {id:'smart', tab:'ins', ic:'smart', lb:'스마트아트', t:'스마트아트 (글을 도형 그림으로)', k:'smartart 다이어그램 단계 순환 피라미드 계층 조직도 목록 도식', need:nSlide, run:function(){ C().smart(); }},
 {id:'emoji', tab:'ins', el:'emojiBtn', ic:'emoji', lb:'이모지', t:'이모지·아이콘 넣기', menu:1, k:'아이콘 그림 문자 이모티콘'},
 {g:1},
 {id:'csv', tab:'ins', ic:'table', lb:'표·그래프 붙여넣기', t:'표·그래프 붙여넣기 (엑셀, CSV)', k:'엑셀 시트 데이터 csv 붙여넣기', need:function(st){ return st.busy?'busy':''; }, run:function(){ C().deck('csv'); }},
 {id:'data', tab:'ins', ic:'chart', lb:'표·그래프 고치기', t:'표·그래프 내용 고치기', k:'데이터 숫자 그래프 내용 표 내용', need:nData, run:function(){ C().opt('data'); }},
 {id:'link', tab:'ins', ic:'link', lb:'시트 연결', t:'프라이 시트에서 가져오기 (연결)', k:'시트 링크 연결 프라이 시트 엑셀 가져오기', need:nData, run:function(){ C().opt('link'); }},
 {id:'relink', tab:'ins', ic:'refresh', lb:'새로 고침', t:'지금 새로 고침 (시트 연결)', k:'시트 다시 가져오기 업데이트', need:nLink, run:function(){ C().opt('relink'); }},
 {id:'unlink', tab:'ins', ic:'unlink', lb:'연결 끊기', t:'시트 연결 끊기', k:'시트 연결 해제', need:nLink, run:function(){ C().opt('unlink'); }},
 {g:1},
 {id:'imp', tab:'ins', ic:'imp', lb:'글에서 만들기', t:'글에서 슬라이드 만들기', k:'가져오기 마크다운 글 붙여넣기 개요', need:nNoGen, run:function(){ C().deck('imp'); }},
 {id:'toc', tab:'ins', ic:'toc', lb:'차례 만들기', t:'차례 슬라이드 만들기', k:'목차 차례 슬라이드 아젠다', need:nSlide, run:function(){ C().deck('toc'); }},
 {id:'live', tab:'ins', ic:'live', lb:'살아있는 화면', t:'살아있는 화면 넣기·고치기', k:'라이브 블록 프로젝트 실험 fry lab html 화면', need:nSlide, run:function(){ C().live(); }},

 {id:'theme', tab:'des', el:'themeBtn', ic:'theme', lb:'테마', t:'테마', menu:1, k:'디자인 색 모양 꾸미기 스타일'},
 {id:'bg', tab:'des', ic:'bg', lb:'배경색', t:'이 슬라이드 배경색', menu:1, k:'배경 색깔 바탕', need:nSlide, run:function(b){ C().optMenu('bg',b); }},
 {id:'font', tab:'des', ic:'font', lb:'글꼴', t:'글꼴 (모든 슬라이드)', menu:1, k:'폰트 글씨체 서체', need:nSlide, run:function(b){ C().optMenu('font',b); }},
 {g:1},
 {id:'master', tab:'des', ic:'master', lb:'마스터', t:'마스터 슬라이드 (로고·바닥글·번호)', k:'마스터 로고 쪽 번호 바닥글 모든 슬라이드', need:nSlide, on:function(st){ return st.master; }, run:function(){ C().deck('master'); }},
 {id:'nums', tab:'des', ic:'nums', lb:'쪽 번호', t:'슬라이드 번호 켜기 · 끄기', k:'번호 페이지 번호 쪽수 슬라이드 번호', need:nSlide, on:function(st){ return st.nums; }, run:function(){ C().deck('nums'); }},
 {id:'footer', tab:'des', ic:'footer', lb:'바닥글', t:'바닥글 쓰기', k:'꼬리말 아래 글 푸터', need:nSlide, on:function(st){ return st.footer; }, run:function(){ C().deck('footer'); }},
 {g:1},
 {id:'fill', tab:'des', ic:'fill', lb:'채우기', t:'도형 채우기 색·투명도', menu:1, k:'채우기 색 도형 색 투명도', need:function(st){ return nShape(st)||(st.line?'fillx':''); }, run:function(b){ C().elMenu('fill',b); }},
 {id:'picfx', tab:'des', ic:'picfx', lb:'그림 효과', t:'그림 효과 (밝기·대비·흑백·세피아)', menu:1, k:'사진 밝기 대비 흑백 세피아 보정 색 효과 필터 그림 보정', need:nPic, run:function(b){ C().elMenu('pfx',b); }},
 {id:'pcrop', tab:'des', ic:'pic', lb:'모양 자르기', t:'그림을 모양대로 자르기', menu:1, k:'그림 자르기 동그랗게 하트 별 원 모양 크롭 프레임', need:function(st){ return nSlide(st)||(!st.pimg?'pic':''); }, run:function(b){ C().elMenu('pshape',b); }},
 {id:'alt', tab:'des', ic:'alt', lb:'대체 텍스트', t:'대체 텍스트 (그림·도형 설명)', k:'접근성 설명 alt 시각장애 화면 읽기 그림 설명', need:nAlt, run:function(){ C().alt(); }},
 {id:'border', tab:'des', ic:'border', lb:'테두리', t:'테두리·선 색과 굵기', menu:1, k:'선 색 굵기 테두리 외곽선', need:nShape, run:function(b){ C().elMenu('line',b); }},

 {id:'play', tab:'pres', el:'playBtn', ic:'play', lb:'발표하기', t:'처음부터 발표하기', sc:'F5', cls:'play', k:'발표 시작 슬라이드 쇼 재생 전체 화면 펜 칠판 레이저 형광펜'},
 {id:'here', tab:'pres', ic:'here', lb:'지금부터', t:'지금 슬라이드부터 발표', sc:'Shift+F5', k:'현재 슬라이드부터 발표 시작', need:nNoGen, run:function(){ C().present(true); }},
 {id:'rec', tab:'pres', ic:'rec', lb:'발표 녹화', t:'발표 녹화 (화면과 목소리를 동영상 파일로)', k:'녹화 녹음 레코딩 동영상 저장 화면 녹화 내레이션', need:nNoGen, on:function(st){ return st.rec; }, run:function(){ C().rec(); }},
 {id:'pv', tab:'pres', el:'pvBtn', ic:'pv', lb:'발표자 화면', t:'발표자 화면을 새 창으로 열고 발표 시작 (다음 슬라이드, 메모, 타이머)', k:'발표자 보기 메모 타이머 두 화면 펜 칠판'},
 {g:1},
 {id:'trans', tab:'pres', ic:'trans', lb:'넘어가는 효과', t:'넘어가는 효과 (이 슬라이드)', menu:1, k:'전환 화면 전환 트랜지션 효과', need:nSlide, run:function(b){ C().optMenu('tr',b); }},
 {id:'anim', tab:'pres', ic:'anim', lb:'나타나는 효과', t:'나타나는 효과 (차례로 나타나기)', menu:1, k:'애니메이션 하나씩 차례로 나타나기 빌드', need:nSel, run:function(b){ C().elMenu('anim',b); }},
 {id:'auto', tab:'pres', ic:'auto', lb:'자동 넘기기', t:'자동 넘기기', k:'자동 넘김 자동 넘기기 저절로 시간 반복 키오스크', need:nSlide, on:function(st){ return st.auto; }, run:function(){ C().deck('auto'); }},
 {id:'quiz', tab:'pres', ic:'quiz', lb:'퀴즈 보기', t:'실시간 퀴즈 보기 고치기', k:'퀴즈 실시간 퀴즈 보기 정답 투표 청중', need:function(st){ return nSlide(st)||(st.lay!=='quiz'?'quiz':''); }, run:function(){ C().opt('choices'); }},

 {id:'aiRe', tab:'ai', ic:'rew', lb:'다시 쓰기', t:'AI로 이 슬라이드 다시 쓰기', cls:'aib', k:'인공지능 고쳐 쓰기 다듬기', need:nAI, run:function(){ AI().act('rewrite'); }},
 {id:'aiShort', tab:'ai', ic:'cut', lb:'더 짧게', t:'AI로 더 짧게', cls:'aib', k:'인공지능 줄이기 요약', need:nAI, run:function(){ AI().act('shorter'); }},
 {id:'aiLong', tab:'ai', ic:'more', lb:'더 자세히', t:'AI로 더 자세히', cls:'aib', k:'인공지능 늘리기 설명 더', need:nAI, run:function(){ AI().act('longer'); }},
 {id:'aiSpell', tab:'ai', ic:'spell', lb:'맞춤법', t:'맞춤법 고치기', cls:'aib', k:'인공지능 맞춤법 띄어쓰기 오타 철자', need:nAI, run:function(){ AI().act('spell'); }},
 {id:'aiDlg', tab:'ai', ic:'ai', lb:'만들기·고치기·추가', t:'AI 도우미 (시험 기능): 새로 만들기 · 고치기 · 추가', cls:'aib', k:'인공지능 초안 새로 만들기 추가 생성', need:function(st){ return st.busy?'busy':''; }, run:function(){ AI().act('dlg'); }},
 {g:1},
 {id:'aiSet', tab:'ai', el:'aiSetBtn', ic:'aiset', lb:'AI 설정', t:'AI 설정', cls:'aib', k:'인공지능 키 설정 클로드 제미나이 오픈에이아이 모델'}
];
/* the layouts are commands of the search too (Home tab, the layout box) */
var LCMDS=LAYS.map(function(l){ return {id:'lay:'+l[0], tab:'home', lay:l[0], ic:'grid', lb:l[1], t:'레이아웃: '+l[1], k:'레이아웃 '+l[1], need:nSlide, run:function(){ C().setLayout(l[0]); }}; });
var ALL=CMDS.filter(function(c){ return c.id; }).concat(LCMDS), BY={};
ALL.forEach(function(c){ BY[c.id]=c; });

function svg(k){ return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(IC[k]||'')+'</svg>'; }
function sc(x){ return MAC?x.replace(/Ctrl\+/g,'⌘').replace(/Alt\+/g,'⌥').replace(/Shift\+/g,'⇧'):x; }

/* ---------- the tabs ---------- */
var bar=$('rbar'), tabsEl=document.createElement('div'), pans={}, curTab='home';
tabsEl.className='rtabs'; tabsEl.setAttribute('role','tablist'); tabsEl.setAttribute('aria-label','도구 탭'); bar.appendChild(tabsEl);
var panWrap=document.createElement('div'); panWrap.className='rpans'; bar.appendChild(panWrap);
TABS.forEach(function(t){ var b=document.createElement('button'); b.className='rtab'+(t[0]==='ai'?' aib':''); b.type='button'; b.id='rtab-'+t[0]; b.dataset.tab=t[0]; b.setAttribute('role','tab'); b.textContent=t[1]; tabsEl.appendChild(b);
  var p=document.createElement('div'); p.className='rpan'; p.id='rpan-'+t[0]; p.setAttribute('role','tabpanel'); p.setAttribute('aria-labelledby',b.id); p.hidden=true; panWrap.appendChild(p); pans[t[0]]=p; });
var lastTab=null;
CMDS.forEach(function(c){
  var p=pans[c.tab]||(lastTab&&pans[lastTab]);
  if(c.g){ var s=document.createElement('span'); s.className='rsep'; p.appendChild(s); return; }
  lastTab=c.tab;
  if(c.sel){ var w=document.createElement('label'); w.className='rb rsel'; w.title='레이아웃';
    var se=document.createElement('select'); se.id=c.el; se.setAttribute('aria-label','레이아웃'); LAYS.forEach(function(l){ var o=document.createElement('option'); o.value=l[0]; o.textContent=l[1]; se.appendChild(o); });
    w.appendChild(se); var lb=document.createElement('span'); lb.className='lb'; lb.textContent=c.lb; w.appendChild(lb); p.appendChild(w); c.b=w; return; }
  var b=document.createElement('button'); b.type='button'; b.className='rb'+(c.cls?' '+c.cls:''); if(c.el) b.id=c.el; b.dataset.cmd=c.id; if(c.menu) b.dataset.menu='1';
  b.title=c.t+(c.sc?' ('+sc(c.sc)+')':''); b.innerHTML=svg(c.ic)+'<span class="lb"></span>'; b.lastChild.textContent=c.lb;
  if(!c.el) b.onclick=function(){ press(c,b); };
  if(c.dbl) b.ondblclick=function(){ if(!needOf(c,S())) { C().fpaint(true); sync(); } };
  p.appendChild(b); c.b=b; });
LCMDS.forEach(function(c){ c.b=BY.lay.b; });

function setTab(t,focus){ if(!pans[t]) t='home'; curTab=t;
  tabsEl.querySelectorAll('.rtab').forEach(function(b){ var on=b.dataset.tab===t; b.classList.toggle('on',on); b.setAttribute('aria-selected',on?'true':'false'); b.tabIndex=on?0:-1; if(on&&focus) b.focus(); });
  for(var k in pans) pans[k].hidden=k!==t;
  try{ localStorage.setItem(LSK,t); }catch(e){}
  var ob=tabsEl.querySelector('.rtab.on'); if(ob&&ob.scrollIntoView) try{ ob.scrollIntoView({block:'nearest',inline:'nearest'}); }catch(e){}
  if(window.FSL&&FSL.closeMenus) FSL.closeMenus(); edge(pans[t]); sync(true); }
/* a soft fade on the side of a tab that scrolls (narrow screens), so it is clear there are more buttons */
function edge(p){ if(!p) return; var l=p.scrollLeft>2, r=p.scrollLeft+p.clientWidth<p.scrollWidth-2; p.classList.toggle('fl',l); p.classList.toggle('fr',r); }
for(var pk in pans) pans[pk].addEventListener('scroll',function(){ edge(this); },{passive:true});
addEventListener('resize',function(){ edge(pans[curTab]); });
tabsEl.addEventListener('click',function(e){ var b=e.target.closest('.rtab'); if(b) setTab(b.dataset.tab); });
tabsEl.addEventListener('keydown',function(e){ var i=TABS.map(function(t){ return t[0]; }).indexOf(curTab), n=TABS.length;
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){ e.preventDefault(); e.stopPropagation(); setTab(TABS[(i+(e.key==='ArrowRight'?1:n-1))%n][0],true); } });
var saved=null; try{ saved=localStorage.getItem(LSK); }catch(e){}
setTab(saved||'home');

/* ---------- state of the buttons ---------- */
function needOf(c,st){ if(c.el){ var e=$(c.el); return e&&e.disabled?(st.busy?'busy':'slide'):''; } return c.need?c.need(st):''; }
function flash(el){ if(!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); setTimeout(function(){ el.classList.remove('flash'); },1600); }
function say(k){ if(window.FSL&&FSL.toast) FSL.toast(T(MSG[k]||k)); }
function press(c,b){ var st=S(), n=needOf(c,st); if(n){ flash(b); say(n); return; } c.run(b); sync(); }
var syncQ=0;
function sync(now){ if(!now){ if(syncQ) return; syncQ=requestAnimationFrame(function(){ syncQ=0; sync(true); }); return; }
  edge(pans[curTab]); if(!window.FSLC) return; var st=S();
  CMDS.forEach(function(c){ if(!c.id||c.el||!c.b) return; var n=needOf(c,st); c.b.classList.toggle('off',!!n); c.b.setAttribute('aria-disabled',n?'true':'false');
    if(c.on){ var on=!!c.on(st); c.b.classList.toggle('on',on); c.b.setAttribute('aria-pressed',on?'true':'false'); } }); }

/* ---------- command search ---------- */
var box=$('cmdk'), q=$('cmdQ'), res=$('cmdRes'), hits=[], hi=0;
var kb=box.querySelector('kbd'); if(kb) kb.textContent=MAC?'⌘K':'Ctrl K';
q.setAttribute('aria-controls','cmdRes');
function norm(s){ return String(s||'').toLowerCase().replace(/[\s·・,()\[\]\/….:;!?'"’\-–—+]+/g,''); }
function hay(c){ if(c._h&&c._hl===FFT.lang) return c._h;
  var parts=[T(c.lb),T(c.t),c.lb,c.t,c.k||'',T(c.k||''),TABN[c.tab],T(TABN[c.tab])];
  c._hl=FFT.lang; c._lb=norm(T(c.lb)); c._lbk=norm(c.lb); c._t=norm(T(c.t))+'|'+norm(c.t);
  /* keyword words and pairs of neighbouring words ("맨 앞", "쪽 번호"), matched whole for a better rank */
  c._w=[]; [c.k||'',T(c.k||'')].forEach(function(k){ var w=k.split(/\s+/).map(norm).filter(Boolean); w.forEach(function(x,i){ c._w.push(x); if(w[i+1]) c._w.push(x+w[i+1]); }); });
  return (c._h=parts.map(norm).join('|')); }
function find(text){ var raw=String(text||'').trim(); if(!raw) return ALL.filter(function(c){ return !c.lay; });
  var toks=raw.split(/\s+/).map(norm).filter(Boolean), whole=norm(raw), out=[];
  ALL.forEach(function(c){ var h=hay(c), ok=h.indexOf(whole)>=0||toks.every(function(t){ return h.indexOf(t)>=0; }); if(!ok) return;
    var sc=c._lb.indexOf(whole)===0||c._lbk.indexOf(whole)===0?0:c._w.indexOf(whole)>=0?1:(c._lb.indexOf(whole)>=0||c._lbk.indexOf(whole)>=0)?2:c._t.indexOf(whole)>=0?3:4;
    if(c.lay) sc+=.5; out.push({c:c,s:sc}); });
  out.sort(function(a,b){ return a.s-b.s; }); return out.map(function(o){ return o.c; }); }
function draw(){ hits=find(q.value).slice(0,40); hi=Math.min(hi,Math.max(0,hits.length-1)); res.innerHTML=''; var st=S();
  if(!hits.length){ var e=document.createElement('div'); e.className='crNone'; e.textContent=T('찾는 기능이 없어요'); res.appendChild(e); }
  hits.forEach(function(c,i){ var b=document.createElement('button'); b.type='button'; b.className='cr'+(i===hi?' on':'')+(needOf(c,st)?' dim':'')+(c.cls==='aib'?' aib':''); b.id='cr-'+i; b.setAttribute('role','option'); b.setAttribute('aria-selected',i===hi?'true':'false');
    b.innerHTML=svg(c.ic)+'<span class="crl"><b></b><small></small></span><span class="crt"></span>'+(c.sc?'<kbd></kbd>':'');
    b.querySelector('b').textContent=T(c.lb); b.querySelector('small').textContent=c.t!==c.lb?T(c.t):''; b.querySelector('.crt').textContent=T(TABN[c.tab]); if(c.sc) b.querySelector('kbd').textContent=sc(c.sc);
    b.addEventListener('pointerdown',function(ev){ ev.preventDefault(); });
    b.onclick=function(){ run(c); }; b.onmousemove=function(){ if(hi!==i){ hi=i; mark(); } }; res.appendChild(b); });
  q.setAttribute('aria-activedescendant',hits.length?'cr-'+hi:''); place(); }
function mark(){ res.querySelectorAll('.cr').forEach(function(b,i){ b.classList.toggle('on',i===hi); b.setAttribute('aria-selected',i===hi?'true':'false'); if(i===hi&&b.scrollIntoView) try{ b.scrollIntoView({block:'nearest'}); }catch(e){} }); q.setAttribute('aria-activedescendant',hits.length?'cr-'+hi:''); }
function place(){ var r=box.getBoundingClientRect(), w=Math.min(460,innerWidth-16); res.style.width=w+'px'; res.style.left=Math.max(8,Math.min(r.right-w,innerWidth-w-8))+'px'; res.style.top=(r.bottom+6)+'px';
  res.style.maxHeight=Math.max(160,innerHeight-r.bottom-20)+'px'; }
function isOpen(){ return !res.hidden; }
function open(){ if(window.FSL&&FSL.closeMenus) FSL.closeMenus(); box.classList.add('open'); res.hidden=false; q.setAttribute('aria-expanded','true'); hi=0; draw(); }
function close(blur){ res.hidden=true; box.classList.remove('open'); q.setAttribute('aria-expanded','false'); if(blur) q.blur(); }
function openSearch(){ q.focus(); q.select(); open(); }
function run(c){ close(true); q.value=''; setTab(c.tab); var b=c.b;
  if(b&&b.scrollIntoView) try{ b.scrollIntoView({block:'nearest',inline:'nearest'}); }catch(e){}
  setTimeout(function(){ var st=S(), n=needOf(c,st); if(n){ flash(b); say(n); return; }
    if(c.el&&!c.sel){ flash(b); $(c.el).click(); } else { if(c.lay||c.sel) flash(b); if(c.sel){ var se=$(c.el); se.focus(); if(se.showPicker) try{ se.showPicker(); }catch(e){} } else c.run(b); }
    sync(); },30); }
q.addEventListener('focus',function(){ if(!isOpen()) open(); });
q.addEventListener('input',function(){ hi=0; if(!isOpen()) open(); else draw(); });
q.addEventListener('blur',function(){ setTimeout(function(){ if(document.activeElement!==q) close(); },120); });
q.addEventListener('keydown',function(e){ e.stopPropagation();
  if(e.key==='ArrowDown'){ e.preventDefault(); if(!isOpen()) open(); else if(hits.length){ hi=(hi+1)%hits.length; mark(); } }
  else if(e.key==='ArrowUp'){ e.preventDefault(); if(hits.length){ hi=(hi+hits.length-1)%hits.length; mark(); } }
  else if(e.key==='Enter'){ e.preventDefault(); if(e.isComposing) return; if(hits[hi]) run(hits[hi]); }
  else if(e.key==='Escape'){ e.preventDefault(); q.value=''; close(true); }
  else if((e.ctrlKey||e.metaKey)&&(e.key==='k'||e.key==='K')){ e.preventDefault(); q.select(); } });
addEventListener('resize',function(){ if(isOpen()) place(); });
document.addEventListener('keydown',function(e){
  if(!(e.ctrlKey||e.metaKey)||e.altKey||(e.key!=='k'&&e.key!=='K'&&e.code!=='KeyK')) return;
  var b=document.body; if(b.classList.contains('mode-pv')||b.classList.contains('mode-view')) return;
  var st=S(); if(st.pres||document.querySelector('.ov.open')) return;
  e.preventDefault(); e.stopPropagation(); openSearch(); },true);

window.FRB={sync:sync, setTab:setTab, get tab(){ return curTab; }, cmds:ALL, find:find, run:run, open:openSearch, close:close};
})();
