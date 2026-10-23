/* 삭제 뒤 "되돌리기" 안내: 확인 창 대신 지운 뒤 몇 초 동안 화면 아래에 떠요 (Fry Sheet, Fry Slides, Block HTML).
   FFUndo.show('프로젝트를 삭제했어요', function(){ ...되살리기... }) */
(function(){
'use strict';
var el=null, timer=null;
function tr(s){ try{ return window.FFT&&FFT.T?FFT.T(s):s; }catch(e){ return s; } }
function build(){
  var st=document.createElement('style');
  st.textContent='#ffundo{position:fixed; left:50%; bottom:28px; transform:translateX(-50%); display:flex; align-items:center; gap:12px; background:#1d2230; color:#eef0f5; border:1px solid #2c3347; padding:8px 8px 8px 16px; border-radius:99px; z-index:400; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; max-width:calc(100vw - 24px);}'+
    '#ffundo.on{opacity:1; pointer-events:auto;} #ffundo span{overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}'+
    '#ffundo button{flex:0 0 auto; border:0; border-radius:99px; padding:6px 14px; font:inherit; font-weight:700; cursor:pointer; background:#ffc93c; color:#1c1405;}';
  document.head.appendChild(st);
  el=document.createElement('div'); el.id='ffundo'; el.setAttribute('role','status'); el.setAttribute('aria-live','polite');
  el.innerHTML='<span></span><button type="button"></button>'; document.body.appendChild(el);
}
function hide(){ if(el) el.classList.remove('on'); clearTimeout(timer); }
function show(msg,undo,ms){
  if(!el) build();
  el.firstChild.textContent=tr(msg); var b=el.lastChild; b.textContent=tr('되돌리기');
  b.onclick=function(){ hide(); try{ undo(); }catch(e){ console.error(e); } };
  el.classList.add('on'); clearTimeout(timer); timer=setTimeout(hide,ms||7000);
}
window.FFUndo={show:show, hide:hide};
})();
