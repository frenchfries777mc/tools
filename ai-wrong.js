/* "👎 틀렸어요" button for AI answers, shared by the tools.
   FFWrong.attach(host, {tool, question, answer}) puts the button at the end of `host` (one per host).
   Clicking it opens the site's own dialog (no native dialogs) where the person can type the right answer (optional).
   The report is kept in this browser (localStorage 'ffai.wrong.v1', newest last, at most 200) and shows up on the
   developer's teach/ page ("틀렸다고 눌린 답"). When the person is logged in (FFAuth from the games hub), the same report is also
   sent to Supabase table ff_ai_wrong (supabase-ff-ai-wrong.sql); a failure there is ignored, the local copy stays.
   o.history (optional) = the turns before the answer, [{role:'user'|'assistant',content}], saved with the report (last 12 turns, 600 characters each)
   so the developer sees the whole conversation (ai-chat/). o.why (optional, set by the dialog) = why it was wrong: fact|tone|offtopic|repeat, saved as e.why / column reason (supabase-ff-ai-wrong-reason.sql). o.model (optional) = the model that wrote the answer, for pages that let people pick one (ai-chat/).
   FFWrong.toast = function(text) can be set by the page to use its own toast. */
(function(){
'use strict';
var LS='ffai.wrong.v1', CAP=200;
var WHY=[['fact','사실이 틀려요'],['tone','말투나 형식이 이상해요'],['offtopic','질문과 상관없는 답이에요'],['repeat','같은 말을 반복해요']];   // e.why = one of these keys (optional)
var T=(window.FFT&&FFT.T)||function(s){ return s; };
if(window.FFT) FFT.add({
"틀렸어요":["Wrong","Incorrecto","Faux","Falsch","間違い"],
"이 답이 틀렸다고 알려요":["Report this answer as wrong","Indicar que esta respuesta es incorrecta","Signaler cette réponse comme fausse","Diese Antwort als falsch melden","この答えが間違っていると知らせる"],
"이 답이 틀렸어요":["This answer is wrong","Esta respuesta es incorrecta","Cette réponse est fausse","Diese Antwort ist falsch","この答えは間違っています"],
"맞는 답이나 사실을 알면 적어 주세요 (안 적어도 돼요). 개발자가 AI를 가르칠 때 참고해요.":["If you know the right answer or fact, write it here (optional). The developer uses it when teaching the AI.","Si sabes la respuesta o el dato correcto, escríbelo (opcional). El desarrollador lo usa al enseñar a la IA.","Si tu connais la bonne réponse ou le bon fait, écris-le (facultatif). Le développeur s’en sert pour former l’IA.","Wenn du die richtige Antwort oder Tatsache kennst, schreib sie hier hin (optional). Der Entwickler nutzt das, um der KI etwas beizubringen.","正しい答えや事実を知っていれば書いてください（書かなくても大丈夫です）。開発者がAIに教えるときの参考にします。"],
"예: 정답은 이거예요":["e.g. The right answer is …","p. ej. La respuesta correcta es…","ex. La bonne réponse est…","z. B. Die richtige Antwort ist …","例: 正解はこれです"],
"알려 주셔서 고마워요":["Thanks for letting us know","Gracias por avisar","Merci de nous l’avoir signalé","Danke für den Hinweis","教えてくれてありがとうございます"],
"알려 주셔서 고마워요. 더 나아지게 참고할게요":["Thanks for letting us know. We’ll use it to improve","Gracias por avisar. Lo tendremos en cuenta para mejorar","Merci de nous l’avoir signalé. On s’en servira pour s’améliorer","Danke für den Hinweis. Wir nutzen ihn, um besser zu werden","教えてくれてありがとうございます。改善の参考にします"],
"어떤 점이 틀렸나요? (고르면 도움이 돼요)":["What was wrong? (optional, but it helps)","¿Qué estaba mal? (opcional, pero ayuda)","Qu’est-ce qui n’allait pas ? (facultatif, mais utile)","Was war falsch? (optional, hilft aber)","どこが間違っていましたか?(選ぶと助かります)"],
"사실이 틀려요":["Wrong fact","Dato incorrecto","Fait erroné","Falsche Tatsache","事実が違う"],
"말투나 형식이 이상해요":["Odd tone or format","Tono o formato raro","Ton ou format étrange","Seltsamer Ton oder Format","口調や形式がおかしい"],
"질문과 상관없는 답이에요":["Off-topic answer","Respuesta fuera de tema","Réponse hors sujet","Antwort am Thema vorbei","質問と関係ない答え"],
"같은 말을 반복해요":["Repeats itself","Se repite","Se répète","Wiederholt sich","同じ言葉を繰り返す"],
"저장하지 못했어요":["Could not save","No se pudo guardar","Impossible d’enregistrer","Speichern fehlgeschlagen","保存できませんでした"]
});
var css='.ffw-btn{display:inline-flex;align-items:center;gap:4px;margin:8px 0 0;padding:3px 10px;font:inherit;font-size:12px;color:var(--dim,#8a93a6);background:transparent;border:1px solid var(--line,#222837);border-radius:999px;cursor:pointer}'+
  '.ffw-btn:hover{color:var(--text,#eef0f5);border-color:#3a4256}.ffw-btn[disabled]{opacity:.55;cursor:default}'+
  '.ffw-ov{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.55)}.ffw-ov.open{display:flex}'+
  '.ffw-d{width:min(440px,100%);background:var(--panel,#10131b);color:var(--text,#eef0f5);border:1px solid var(--line,#222837);border-radius:14px;padding:16px;font-family:inherit;box-shadow:0 12px 40px rgba(0,0,0,.45)}'+
  '.ffw-d h3{margin:0 0 6px;font-size:16px}.ffw-d p{margin:0 0 10px;font-size:13px;line-height:1.55;color:var(--dim,#8a93a6)}'+
  '.ffw-d textarea{width:100%;min-height:84px;resize:vertical;box-sizing:border-box;background:var(--bg,#08090d);color:inherit;border:1px solid var(--line,#222837);border-radius:10px;padding:10px 12px;font:inherit;font-size:14px}'+
  '.ffw-why{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}.ffw-why button{font:inherit;font-size:13px;padding:5px 11px;border-radius:999px;cursor:pointer;color:inherit;background:transparent;border:1px solid var(--line,#222837)}.ffw-why button[aria-pressed=true]{border-color:var(--fry,#ffc93c);background:rgba(255,201,60,.14)}'+
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
function hist(a){
  if(!Array.isArray(a)) return [];
  return a.filter(function(m){ return m&&typeof m.content==='string'&&m.content; }).slice(-12).map(function(m){ return {role:m.role==='assistant'?'assistant':'user', content:cut(m.content,600)}; });
}
function report(o){
  var list=load(), e={t:new Date().toISOString(), tool:cut(o.tool,40), q:cut(o.question,300), a:cut(o.answer,1500), fix:cut(o.fix,500), why:WHY.some(function(w){ return w[0]===o.why; })?o.why:'', model:cut(o.model||modelId(),80)};
  var h=hist(o.history); if(h.length) e.h=h; if(!e.why) delete e.why;
  list.push(e); if(list.length>CAP) list=list.slice(list.length-CAP);
  var ok=save(list); send(e); return ok?e:null;
}
/* logged-in people also send it to the developer's table; nothing here may throw or show an error */
function send(e){
  try{
    var u=window.FFAuth&&FFAuth.user&&FFAuth.user(); if(!u) return;
    FFAuth.ready.then(function(sb){ if(!sb) return;
      var row={tool:e.tool, model:e.model, question:e.q, answer:e.a, correction:e.fix};
      /* the history column comes from supabase-ff-ai-wrong-history.sql and the reason column from supabase-ff-ai-wrong-reason.sql;
         without a column the report goes without it (first without the reason, then without the history too) */
      if(e.h) row.history=JSON.stringify(e.h);
      if(e.why) row.reason=e.why;
      function ins(r){ return sb.from('ff_ai_wrong').insert(r); }
      return ins(row).then(function(r){ if(!(r&&r.error)) return r;
        if(row.reason){ delete row.reason; return ins(row).then(function(r2){ if(r2&&r2.error&&row.history){ delete row.history; return ins(row); } return r2; }); }
        if(row.history){ delete row.history; return ins(row); }
        return r; });
    }).then(null,function(){});
  }catch(x){}
}
function build(){
  addCSS();
  ov=document.createElement('div'); ov.className='ffw-ov'; ov.setAttribute('data-notr','');
  ov.innerHTML='<div class="ffw-d" role="dialog" aria-modal="true" aria-labelledby="ffwT"><h3 id="ffwT"></h3><p></p><div class="ffw-why" role="group"></div><textarea maxlength="500"></textarea><div class="ffw-acts"><button type="button" class="ffw-no"></button><button type="button" class="ffw-ok"></button></div></div>';
  document.body.appendChild(ov);
  var q=function(s){ return ov.querySelector(s); };
  q('h3').textContent=T('이 답이 틀렸어요'); q('p').textContent=T('맞는 답이나 사실을 알면 적어 주세요 (안 적어도 돼요). 개발자가 AI를 가르칠 때 참고해요.');
  q('textarea').placeholder=T('예: 정답은 이거예요'); q('.ffw-no').textContent=T('취소'); q('.ffw-ok').textContent=T('보내기');
  q('.ffw-why').setAttribute('aria-label',T('어떤 점이 틀렸나요? (고르면 도움이 돼요)'));
  WHY.forEach(function(w){ var b=document.createElement('button'); b.type='button'; b.dataset.k=w[0]; b.textContent=T(w[1]); b.setAttribute('aria-pressed','false');
    b.onclick=function(){ var on=b.getAttribute('aria-pressed')!=='true'; Array.prototype.forEach.call(q('.ffw-why').children,function(x){ x.setAttribute('aria-pressed','false'); }); b.setAttribute('aria-pressed',on?'true':'false'); };
    q('.ffw-why').appendChild(b); });
  q('.ffw-no').onclick=close;
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&ov.classList.contains('open')){ e.preventDefault(); e.stopPropagation(); close(); } },true);
  ov.addEventListener('mousedown',function(e){ ov._down=e.target===ov; });
  ov.addEventListener('click',function(e){ if(e.target===ov&&ov._down) close(); });
  ov.addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Escape'){ e.preventDefault(); close(); }
    if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); q('.ffw-ok').click(); }
    if(e.key==='Tab'){ var f=Array.prototype.slice.call(q('.ffw-why').children).concat([q('textarea'),q('.ffw-no'),q('.ffw-ok')]), i=f.indexOf(document.activeElement); e.preventDefault(); f[(i+(e.shiftKey?-1:1)+f.length)%f.length].focus(); } });
  q('.ffw-ok').onclick=function(){
    var c=cur; if(!c) return; var ok=report({tool:c.o.tool, question:c.o.question, answer:c.o.answer, history:c.o.history, model:c.o.model, fix:q('textarea').value.trim(), why:(q('.ffw-why [aria-pressed=true]')||{dataset:{}}).dataset.k||''});
    close();
    if(ok){ c.btn.disabled=true; c.btn.textContent='✓ '+T('알려 주셔서 고마워요'); toast(T('알려 주셔서 고마워요. 더 나아지게 참고할게요')); }
    else toast(T('저장하지 못했어요'));
  };
}
function open(btn,o){
  if(!ov) build(); cur={btn:btn,o:o}; lastFocus=document.activeElement; ov.querySelector('textarea').value=''; Array.prototype.forEach.call(ov.querySelectorAll('.ffw-why button'),function(x){ x.setAttribute('aria-pressed','false'); }); ov.classList.add('open');
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
var api={why:WHY, attach:attach, report:report, sendOne:send, list:load, key:LS, cap:CAP, toast:null};
window.FFWrong=api;
})();
