/* "👎 틀렸어요" button for AI answers, shared by the tools.
   FFWrong.attach(host, {tool, question, answer}) puts the button at the end of `host` (one per host).
   Clicking it opens the site's own dialog (no native dialogs) where the person can type the right answer (optional).
   The report is kept in this browser (localStorage 'ffai.wrong.v1', newest last, at most 200) and shows up on the
   developer's teach/ page ("틀렸다고 눌린 답"). Nothing is sent to a server from here.
   FFWrong.toast = function(text) can be set by the page to use its own toast. */
(function(){
'use strict';
var LS='ffai.wrong.v1', CAP=200;
var T=(window.FFT&&FFT.T)||function(s){ return s; };
var css='.ffw-btn{display:inline-flex;align-items:center;gap:4px;margin:8px 0 0;padding:3px 10px;font:inherit;font-size:12px;color:var(--dim,#8a93a6);background:transparent;border:1px solid var(--line,#222837);border-radius:999px;cursor:pointer}'+
  '.ffw-btn:hover{color:var(--text,#eef0f5);border-color:#3a4256}.ffw-btn[disabled]{opacity:.55;cursor:default}'+
  '.ffw-ov{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.55)}.ffw-ov.open{display:flex}'+
  '.ffw-d{width:min(440px,100%);background:var(--panel,#10131b);color:var(--text,#eef0f5);border:1px solid var(--line,#222837);border-radius:14px;padding:16px;font-family:inherit;box-shadow:0 12px 40px rgba(0,0,0,.45)}'+
  '.ffw-d h3{margin:0 0 6px;font-size:16px}.ffw-d p{margin:0 0 10px;font-size:13px;line-height:1.55;color:var(--dim,#8a93a6)}'+
  '.ffw-d textarea{width:100%;min-height:84px;resize:vertical;box-sizing:border-box;background:var(--bg,#08090d);color:inherit;border:1px solid var(--line,#222837);border-radius:10px;padding:10px 12px;font:inherit;font-size:14px}'+
  '.ffw-d textarea:focus{outline:2px solid var(--fry,#ffc93c);outline-offset:-1px}'+
  '.ffw-acts{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.ffw-acts button{font:inherit;font-size:14px;border-radius:10px;padding:8px 16px;cursor:pointer;border:1px solid var(--line,#222837);background:var(--panel2,#151925);color:inherit}'+
  '.ffw-acts .ffw-ok{border:0;font-weight:700;color:#1a1205;background:linear-gradient(135deg,var(--fry,#ffc93c),var(--fry2,#ff8a3d))}'+
  '.ffw-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483001;background:#1d2230;color:#eef0f5;border:1px solid #222837;padding:9px 16px;border-radius:99px;max-width:92vw;text-align:center;font-size:14px}';
var ov=null, cur=null, lastFocus=null;
function addCSS(){ if(addCSS.on) return; addCSS.on=1; var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st); }
function load(){ var a=[]; try{ a=JSON.parse(localStorage.getItem(LS)||'[]'); }catch(e){} return Array.isArray(a)?a:[]; }
function save(a){ try{ localStorage.setItem(LS,JSON.stringify(a)); return true; }catch(e){ return false; } }
function cut(s,n){ s=String(s==null?'':s); return s.length>n?s.slice(0,n):s; }
function modelId(){ try{ var c=window.FFAI&&FFAI.config&&FFAI.config(); return c?c.provider+':'+c.model:''; }catch(e){ return ''; } }
function toast(t){
  if(typeof api.toast==='function'){ api.toast(t); return; }
  var e=document.createElement('div'); e.className='ffw-toast'; e.setAttribute('role','status'); e.textContent=t; addCSS(); document.body.appendChild(e); setTimeout(function(){ e.remove(); },2400);
}
/* report: {tool, question, answer, fix} -> stored entry, or null when the browser cannot store it */
function report(o){
  var list=load(), e={t:new Date().toISOString(), tool:cut(o.tool,40), q:cut(o.question,300), a:cut(o.answer,1500), fix:cut(o.fix,500), model:cut(modelId(),80)};
  list.push(e); if(list.length>CAP) list=list.slice(list.length-CAP);
  return save(list)?e:null;
}
function build(){
  addCSS();
  ov=document.createElement('div'); ov.className='ffw-ov'; ov.setAttribute('data-notr','');
  ov.innerHTML='<div class="ffw-d" role="dialog" aria-modal="true" aria-labelledby="ffwT"><h3 id="ffwT"></h3><p></p><textarea maxlength="500"></textarea><div class="ffw-acts"><button type="button" class="ffw-no"></button><button type="button" class="ffw-ok"></button></div></div>';
  document.body.appendChild(ov);
  var q=function(s){ return ov.querySelector(s); };
  q('h3').textContent=T('이 답이 틀렸어요'); q('p').textContent=T('맞는 답이나 사실을 알면 적어 주세요 (안 적어도 돼요). 개발자가 AI를 가르칠 때 참고해요.');
  q('textarea').placeholder=T('예: 정답은 이거예요'); q('.ffw-no').textContent=T('취소'); q('.ffw-ok').textContent=T('보내기');
  q('.ffw-no').onclick=close;
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&ov.classList.contains('open')){ e.preventDefault(); e.stopPropagation(); close(); } },true);
  ov.addEventListener('mousedown',function(e){ ov._down=e.target===ov; });
  ov.addEventListener('click',function(e){ if(e.target===ov&&ov._down) close(); });
  ov.addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Escape'){ e.preventDefault(); close(); }
    if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); q('.ffw-ok').click(); }
    if(e.key==='Tab'){ var f=[q('textarea'),q('.ffw-no'),q('.ffw-ok')], i=f.indexOf(document.activeElement); e.preventDefault(); f[(i+(e.shiftKey?-1:1)+f.length)%f.length].focus(); } });
  q('.ffw-ok').onclick=function(){
    var c=cur; if(!c) return; var ok=report({tool:c.o.tool, question:c.o.question, answer:c.o.answer, fix:q('textarea').value.trim()});
    close();
    if(ok){ c.btn.disabled=true; c.btn.textContent='✓ '+T('알려 주셔서 고마워요'); toast(T('알려 주셔서 고마워요. 더 나아지게 참고할게요')); }
    else toast(T('저장하지 못했어요'));
  };
}
function open(btn,o){
  if(!ov) build(); cur={btn:btn,o:o}; lastFocus=document.activeElement; ov.querySelector('textarea').value=''; ov.classList.add('open');
  setTimeout(function(){ ov.querySelector('textarea').focus(); },30);
}
function close(){ if(ov) ov.classList.remove('open'); cur=null; try{ if(lastFocus&&lastFocus.focus) lastFocus.focus(); }catch(e){} }
/* the button goes at the end of host; call again after a new answer to replace it */
function attach(host,o){
  if(!host) return null; addCSS(); o=o||{};
  var old=host.querySelector(':scope > .ffw-btn'); if(old) old.remove();
  var b=document.createElement('button'); b.type='button'; b.className='ffw-btn'; b.setAttribute('data-notr',''); b.textContent='👎 '+T('틀렸어요'); b.title=T('이 답이 틀렸다고 알려요');
  b.onclick=function(){ open(b,o); };
  host.appendChild(b); return b;
}
var api={attach:attach, report:report, list:load, key:LS, cap:CAP, toast:null};
window.FFWrong=api;
})();
