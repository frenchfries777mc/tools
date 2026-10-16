/* Fry Lab AI helper: explains the current experiment from its live numbers and answers a student's question.
   Uses only the shared ../ai.js (FFAI); keys and providers are handled there. The built-in AI has a small
   context, so the prompt is kept short for it (fewer recorded rows, a shorter answer). */
(function(){
'use strict';
var T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };
var LANG={ko:'Korean',en:'English',es:'Spanish',fr:'French',de:'German',ja:'Japanese'};
var busy=false, stopped=false;
var CHIPS=[['🔍 지금 무슨 일이 일어나요?','지금 이 실험에서 무슨 일이 일어나고 있는지 지금 값으로 설명해 줘'],
  ['📐 공식이 왜 이렇게 돼요?','이 실험에 나오는 공식이 왜 그렇게 되는지 쉽게 설명해 줘'],
  ['📊 내 기록 해석하기','내가 기록한 데이터에서 어떤 규칙을 찾을 수 있는지 설명해 줘'],
  ['🧪 다음에 해 볼 실험','이 실험으로 다음에 해 볼 만한 탐구 활동을 하나 추천해 줘']];

function local(){ try{ return FFAI.isLocal(); }catch(e){ return false; } }
function ctxLine(){ var e=LAB.cur; if(!e) return ''; var p=e.p, parts=[];
  e.params.forEach(function(q){ if(q.show&&!q.show(p)) return; var v=p[q.id];
    if(q.type==='check') return; if(q.type==='seg'){ var o=q.opts.filter(function(x){ return x[0]===v; })[0]; parts.push(T(q.l)+': '+(o?T(o[1]):v)); return; }
    parts.push(T(q.l)+' '+LAB.H.fmt(v,q.d!=null?q.d:(String(q.step).split('.')[1]||'').length)+(q.u?' '+q.u:'')); });
  return parts.join(' · '); }
function drawCtx(){ var e=LAB.cur; if(!e) return; var c=$('aiCtx'); c.innerHTML=''; var b=document.createElement('b'); b.textContent=e.icon+' '+T(e.name); c.appendChild(b);
  var s=document.createElement('div'); s.textContent=ctxLine(); c.appendChild(s);
  var n=LAB.rows.length; if(n){ var r=document.createElement('div'); r.textContent=F('기록 {0}줄도 함께 보내요',n); c.appendChild(r); } }
function data(max){ var e=LAB.cur, R=LAB.rows; if(!R.length) return ''; var rows=R.slice(-max);
  var head=e.cols.map(function(c){ return c.k+(c.u?' ('+c.u+')':''); }).join(', ');
  return '\nRecorded data'+(R.length>rows.length?' (last '+rows.length+' of '+R.length+' rows)':'')+', columns: '+head+'\n'+rows.map(function(r){ return r.map(function(v,i){ return v==null?'-':LAB.H.fmt(v,e.cols[i].d); }).join(', '); }).join('\n')
    +(LAB.fit?'\nLeast-squares line on the graph: slope '+(+LAB.fit.m.toPrecision(4))+', intercept '+(+LAB.fit.b.toPrecision(4))+', R^2 '+LAB.fit.r2.toFixed(4):''); }
function system(){ var lang=LANG[FFT.lang]||'English', sm=local();
  return 'You are a friendly science and math tutor for middle and high school students who are using an interactive simulation lab. '
    +'Use the numbers given to explain what is happening, and connect them to the key idea or formula. Write formulas in plain text such as T = 2π√(L/g), never LaTeX. '
    +'Do not invent measurements that are not given. '+(sm?'Answer in at most 120 words. ':'Keep the answer short: about 150-250 words, short paragraphs or a short list. ')
    +'Answer in '+lang+'.'; }
function prompt(q){ var e=LAB.cur, sm=local(), info='';
  try{ info=e.ai(); }catch(er){}
  var p='Experiment: '+info+(sm?data(6):data(40))+'\n\nStudent: '+q;
  if(sm&&p.length>1800) p=p.slice(0,1800);
  return p; }
/* tiny safe markdown: paragraphs, bullet and numbered lists, **bold**, `code` */
function render(t){ var out=$('aiOut'); out.innerHTML=''; var lines=String(t||'').replace(/\r/g,'').split('\n'), list=null, para=[];
  function inline(el,s){ var re=/(\*\*[^*]+\*\*|`[^`]+`)/g, last=0, m; while((m=re.exec(s))){ if(m.index>last) el.appendChild(document.createTextNode(s.slice(last,m.index)));
      var x=document.createElement(m[0][0]==='*'?'b':'code'); x.textContent=m[0].replace(/^\*\*|\*\*$|^`|`$/g,''); el.appendChild(x); last=m.index+m[0].length; }
    if(last<s.length) el.appendChild(document.createTextNode(s.slice(last))); }
  function flush(){ if(para.length){ var p=document.createElement('p'); inline(p,para.join(' ')); out.appendChild(p); para=[]; } }
  lines.forEach(function(l){ var s=l.trim().replace(/^#{1,6}\s+/,''), m;
    if(!s){ flush(); list=null; return; }
    if((m=/^(?:[-*•]\s+)(.*)$/.exec(s))||(m=/^\d+[.)]\s+(.*)$/.exec(s))){ flush(); var tag=/^\d/.test(s)?'ol':'ul'; if(!list||list.tagName.toLowerCase()!==tag){ list=document.createElement(tag); out.appendChild(list); }
      var li=document.createElement('li'); inline(li,m[1]); list.appendChild(li); return; }
    list=null; para.push(s); });
  flush(); }
function setBusy(on){ busy=on; $('aiGo').disabled=on; $('aiStop').hidden=!on; }
function ask(q){
  q=String(q||'').trim(); if(!q){ $('aiQ').focus(); return; } if(busy||!window.FFAI||!LAB.cur) return;
  stopped=false; setBusy(true); var out=$('aiOut'); out.hidden=false; out.innerHTML='<span class="wait"><span class="spin"></span></span>'; out.querySelector('.wait').appendChild(document.createTextNode(T('AI가 생각하는 중…')));
  FFAI.ask({system:system(), prompt:prompt(q), maxTokens:local()?600:1400, onText:function(t){ if(!stopped) render(t); }})
    .then(function(t){ if(!stopped) render(t||''); if(!String(t||'').trim()) out.textContent=T('AI가 답하지 않았어요'); },
      function(e){ if(e&&e.kind==='stop'||stopped){ if(!out.textContent.trim()||out.querySelector('.wait')) out.textContent=T('멈췄어요'); return; }
        if(e&&e.kind==='nokey'){ out.hidden=true; return; } out.textContent=(e&&e.message)||T('AI에 연결하지 못했어요'); })
    .then(function(){ setBusy(false); });
}
function note(){ $('aiNote').textContent=local()?T('기기 안에서 도는 자체 AI는 작아서 짧게 답해요. 더 자세한 설명이 필요하면 AI 설정에서 Claude, Gemini, OpenAI 키를 넣어 보세요.'):''; }
function open(){ var p=$('aiPanel'); p.classList.add('open'); p.setAttribute('data-open','1'); $('aiBtn').classList.add('on'); drawCtx(); note(); setTimeout(function(){ if(window.innerWidth>600) $('aiQ').focus(); },230); }
function close(){ var p=$('aiPanel'); p.classList.remove('open'); p.setAttribute('data-open','0'); $('aiBtn').classList.remove('on'); }
CHIPS.forEach(function(c){ var b=document.createElement('button'), full=T(c[1]); b.textContent=T(c[0]); b.title=full; b.onclick=function(){ $('aiQ').value=full; ask(full); }; $('aiChips').appendChild(b); });
$('aiBtn').onclick=function(){ if($('aiPanel').classList.contains('open')) close(); else open(); };
$('aiClose').onclick=close;
$('aiGo').onclick=function(){ ask($('aiQ').value); };
$('aiStop').onclick=function(){ stopped=true; try{ FFAI.stop(); }catch(e){} setBusy(false); var o=$('aiOut'); if(o.querySelector('.wait')) o.textContent=T('멈췄어요'); };
$('aiSet').onclick=function(){ if(window.FFAI) FFAI.settings(note,note); };
$('aiQ').addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){ e.preventDefault(); ask($('aiQ').value); } if(e.key==='Escape') close(); });
document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&$('aiPanel').classList.contains('open')) close(); });
window.LABAI={onOpen:function(){ if($('aiPanel').classList.contains('open')){ drawCtx(); } }, ask:ask, open:open, close:close, prompt:prompt, system:system};
/* keep the context line fresh while the panel is open */
setInterval(function(){ if($('aiPanel').classList.contains('open')&&!busy) drawCtx(); },1500);
})();
