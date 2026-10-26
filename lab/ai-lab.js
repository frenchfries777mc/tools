/* Fry Lab AI helper: explains the current experiment from its live numbers and answers a student's question.
   Two more ways to use the same box: 값 바꾸기 (the AI answers JSON {"set":{id:value}} and the sliders move) and 실험 찾기
   (the AI picks an experiment id from the list; without a key it falls back to matching words), and the report draft (LABAI.draft).
   Uses only the shared ../ai.js (FFAI); keys and providers are handled there. The built-in AI has a small
   context, so the prompt is kept short for it (fewer recorded rows, a shorter answer). */
(function(){
'use strict';
var T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };
var LANG={ko:'Korean',en:'English',es:'Spanish',fr:'French',de:'German',ja:'Japanese',zh:'Simplified Chinese',pt:'Brazilian Portuguese',ru:'Russian',tr:'Turkish',it:'Italian',pl:'Polish',ar:'Arabic',nw:'English',gk:'Korean'};
var busy=false, stopped=false, mode='ask';
var CHIPS=[['🔍 지금 무슨 일이 일어나요?','지금 이 실험에서 무슨 일이 일어나고 있는지 지금 값으로 설명해 줘'],
  ['📐 공식이 왜 이렇게 돼요?','이 실험에 나오는 공식이 왜 그렇게 되는지 쉽게 설명해 줘'],
  ['📊 내 기록 해석하기','내가 기록한 데이터에서 어떤 규칙을 찾을 수 있는지 설명해 줘'],
  ['🧪 다음에 해 볼 실험','이 실험으로 다음에 해 볼 만한 탐구 활동을 하나 추천해 줘']];

function local(){ try{ return FFAI.isLocal(); }catch(e){ return false; } }
function ctxLine(){ var e=LAB.cur; if(!e) return ''; var p=e.p, parts=[];
  e.params.forEach(function(q){ if(q.show&&!q.show(p)) return; var v=p[q.id];
    if(q.type==='check') return; if(q.type==='text'){ parts.push(T(q.l)+': '+String(v).slice(0,60)); return; } if(q.type==='seg'){ var o=q.opts.filter(function(x){ return x[0]===v; })[0]; parts.push(T(q.l)+': '+(o?T(o[1]):v)); return; }
    parts.push(T(q.l)+' '+LAB.H.fmt(v,q.d!=null?q.d:(String(q.step).split('.')[1]||'').length)+(q.u?' '+q.u:'')); });
  return parts.join(' · '); }
function drawCtx(){ var e=LAB.cur; if(!e) return; var c=$('aiCtx'); c.innerHTML=''; var b=document.createElement('b'); b.appendChild(LAB.mini(e,18)); b.appendChild(document.createTextNode(' '+T(e.name))); c.appendChild(b);
  var s=document.createElement('div'); s.textContent=ctxLine(); c.appendChild(s);
  var n=LAB.rows.length; if(n){ var r=document.createElement('div'); r.textContent=F('기록 {0}줄도 함께 보내요',n); c.appendChild(r); } }
function data(max){ var e=LAB.cur, R=LAB.rows; if(!R.length) return ''; var rows=R.slice(-max);
  var head=e.cols.map(function(c){ return c.k+(c.u?' ('+c.u+')':''); }).join(', ');
  return '\nRecorded data'+(R.length>rows.length?' (last '+rows.length+' of '+R.length+' rows)':'')+', columns: '+head+'\n'+rows.map(function(r){ return r.map(function(v,i){ return v==null?'-':LAB.H.fmt(v,e.cols[i].d); }).join(', '); }).join('\n')
    +(LAB.fit?'\nLeast-squares line on the graph: slope '+(+LAB.fit.m.toPrecision(4))+', intercept '+(+LAB.fit.b.toPrecision(4))+', R^2 '+LAB.fit.r2.toFixed(4):''); }
function system(){ return FFP.labSys(LANG[FFT.lang]||'English',local()); }
function prompt(q){ var e=LAB.cur, sm=local(), info='';
  try{ info=e.ai(); }catch(er){}
  var p=FFP.labPrompt(info,sm?data(6):data(40),q);
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
  if(mode==='set') return runSet(q); if(mode==='find') return runFind(q);
  stopped=false; setBusy(true); var out=$('aiOut'); out.hidden=false; out.innerHTML='<span class="wait"><span class="spin"></span></span>'; out.querySelector('.wait').appendChild(document.createTextNode(T('AI가 생각하는 중…')));
  FFAI.ask({system:system(), prompt:prompt(q), facts:true, prose:true, question:q, maxTokens:local()?600:1400, onText:function(t){ if(!stopped) render(t); }})
    .then(function(t){ if(!stopped) render(t||''); if(!String(t||'').trim()) out.textContent=T('AI가 답하지 않았어요'); else if(!stopped&&window.FFWrong) FFWrong.attach(out,{tool:'Fry Lab',question:q,answer:t}); },
      function(e){ if(e&&e.kind==='stop'||stopped){ if(!out.textContent.trim()||out.querySelector('.wait')) out.textContent=T('멈췄어요'); return; }
        if(e&&e.kind==='nokey'){ out.hidden=true; return; } out.textContent=(e&&e.message)||T('AI에 연결하지 못했어요'); })
    .then(function(){ setBusy(false); });
}

/* ---------- 값 바꾸기 / 실험 찾기 ---------- */
var MODES=[['ask','💬 질문하기','이 실험에서 궁금한 것을 물어보세요','물어보기'],['set','🎚 값 바꾸기','예: 진자 길이를 두 배로 해 줘','바꾸기'],['find','🔎 실험 찾기','예: 공을 던지는 실험','찾기']];
function setMode(m){ mode=m; var d=MODES.filter(function(x){ return x[0]===m; })[0];
  Array.prototype.forEach.call($('aiMode').children,function(b){ var on=b.dataset.m===m; b.classList.toggle('on',on); b.setAttribute('aria-pressed',String(on)); });
  $('aiQ').placeholder=T(d[2]); $('aiGo').textContent=T(d[3]); $('aiChips').hidden=m!=='ask'; $('aiOut').hidden=true; $('aiQ').focus(); }
function plist(){ var e=LAB.cur, p=e.p;
  return e.params.filter(function(q){ return q.type!=='text'; }).map(function(q){ var s='- '+q.id+': '+T(q.l)+(q.u?' ('+q.u+')':'');
    if(q.type==='check') return s+', true or false, now '+p[q.id];
    if(q.type==='seg') return s+', one of '+q.opts.map(function(o){ return JSON.stringify(o[0])+'='+T(o[1]); }).join(' | ')+', now '+JSON.stringify(p[q.id]);
    return s+', min '+q.min+', max '+q.max+', now '+(+(+p[q.id]).toPrecision(6)); }).join('\n'); }
function parseObj(t){ try{ var o=FFAI.parseJSON(t); return o&&typeof o==='object'&&!Array.isArray(o)?o:null; }catch(e){ return null; } }
function reasonOut(e,nokeyMsg){ var out=$('aiOut'); out.hidden=false;
  if(e&&e.kind==='stop'||stopped) out.textContent=T('멈췄어요'); else if(e&&e.kind==='nokey') out.textContent=T(nokeyMsg); else out.textContent=(e&&e.message)||T('AI에 연결하지 못했어요'); }
/* q: "진자 길이를 두 배로 해 줘" -> the AI answers {"set":{"len":3}}; the values go through LAB.applySet (clamped, same path as the sliders) */
function runSet(q){
  stopped=false; setBusy(true); var out=$('aiOut'); out.hidden=false; out.innerHTML='<span class="wait"><span class="spin"></span></span>'; out.querySelector('.wait').appendChild(document.createTextNode(T('AI가 생각하는 중…')));
  return FFAI.ask({system:FFP.labSetSys, prompt:FFP.labSetPrompt(T(LAB.cur.name),plist(),q), json:true, maxTokens:300})
    .then(function(t){ if(stopped) return; var o=parseObj(t), set=o&&(o.set&&typeof o.set==='object'&&!Array.isArray(o.set)?o.set:o), ch=set?LAB.applySet(set):null;
        if(!set){ out.textContent=T('AI의 답을 읽지 못했어요. 다른 말로 다시 써 보거나 슬라이더로 바꿔 주세요'); return; }
        if(!ch.length){ out.textContent=T('바꾼 값이 없어요. 이미 그 값이거나, AI가 맞는 항목을 찾지 못했어요'); return; }
        drawCtx(); render(T('바꿨어요')+'\n'+ch.map(function(c){ return '- '+c.label+': '+c.from+' → '+c.to+(c.clamped?' '+T('(가능한 범위 끝으로 맞췄어요)'):''); }).join('\n')); },
      function(e){ reasonOut(e,'AI를 쓰려면 AI 설정에서 키를 넣거나 자체 AI를 켜 주세요'); })
    .then(function(){ setBusy(false); });
}
/* offline: score every experiment by the words of the request found in its name (x3) and description (x1); the particles at a word end are cut first */
var STOP=/^(실험|해|해줘|해주세요|보기|보고|싶어|싶어요|찾아|찾아줘|열어|열어줘|하는|있는|관련|에서|좀|그|이|저)$/;
function words(q){ return String(q).toLowerCase().replace(/[^0-9a-z가-힣\s]/g,' ').split(/\s+/).filter(Boolean).map(function(w){ return w.replace(/(으로|에서|하는|하기|보기|이란|이랑|은|는|을|를|이|가|의|에|로|도|만|과|와)$/,''); }).filter(function(w){ return w&&!STOP.test(w); }); }
function rank(q,list){ var ws=words(q); if(!ws.length) return [];
  return (list||LAB.list).map(function(e){ var nm=(T(e.name)+' '+e.name+' '+e.id).toLowerCase(), ds=(T(e.desc)+' '+e.desc+' '+(e.info||'')).toLowerCase(), sc=0;
    ws.forEach(function(w){ if(nm.indexOf(w)>=0) sc+=3*w.length; else if(ds.indexOf(w)>=0) sc+=w.length;
      else if(w.length>=3) for(var i=0;i+2<=w.length;i++){ var b=w.slice(i,i+2); if(nm.indexOf(b)>=0) sc+=1.5; else if(ds.indexOf(b)>=0) sc+=0.5; } });
    return {e:e, s:sc}; }).filter(function(x){ return x.s>0; }).sort(function(a,b){ return b.s-a.s; }); }
function shown(e,note,alts){ var out=$('aiOut'); out.hidden=false; out.innerHTML=''; var p=document.createElement('p'); p.appendChild(document.createTextNode(T('열었어요')+': ')); p.appendChild(LAB.mini(e,18)); p.appendChild(document.createTextNode(' '+T(e.name)+(note?' · '+note:''))); out.appendChild(p);
  if(alts&&alts.length){ var h=document.createElement('p'); h.textContent=T('다른 후보'); out.appendChild(h); var c=document.createElement('div'); c.className='chips';
    alts.forEach(function(x){ var b=document.createElement('button'); b.type='button'; b.appendChild(LAB.mini(x.e,18)); b.appendChild(document.createTextNode(' '+T(x.e.name))); b.onclick=function(){ LAB.open(x.e.id); drawCtx(); shown(x.e,''); }; c.appendChild(b); }); out.appendChild(c); } }
function offline(q,why){ var r=rank(q), out=$('aiOut'); out.hidden=false;
  if(!r.length){ out.textContent=(why?why+' · ':'')+T('비슷한 실험을 찾지 못했어요. 다른 말로 써 보세요'); return; }
  LAB.open(r[0].e.id); drawCtx(); shown(r[0].e,why||T('이름과 설명에서 찾았어요'),r.slice(1,4)); }
function runFind(q){
  var out=$('aiOut'); out.hidden=false; if(!window.FFAI||!FFAI.ready()){ offline(q,T('AI 설정이 없어서 이름과 설명으로 찾았어요')); return; }
  var all=local()?rank(q).slice(0,12).map(function(x){ return x.e; }):LAB.list; if(!all.length){ offline(q,''); return; }
  stopped=false; setBusy(true); out.innerHTML='<span class="wait"><span class="spin"></span></span>'; out.querySelector('.wait').appendChild(document.createTextNode(T('AI가 생각하는 중…')));
  var lines=all.map(function(e){ return e.id+' | '+T(e.name)+' | '+T(e.desc).slice(0,local()?40:50); }).join('\n');
  return FFAI.ask({system:FFP.labFindSys, prompt:FFP.labFindPrompt(lines,q), json:true, maxTokens:200})
    .then(function(t){ if(stopped) return; var o=parseObj(t), e=o&&typeof o.id==='string'?LAB.list.filter(function(x){ return x.id===o.id; })[0]:null;
        if(!e){ offline(q,T('AI의 답을 읽지 못해서 이름과 설명으로 찾았어요')); return; }
        LAB.open(e.id); var ch=o.set&&typeof o.set==='object'&&!Array.isArray(o.set)?LAB.applySet(o.set):[]; drawCtx();
        shown(e,ch.length?ch.map(function(c){ return c.label+' '+c.to; }).join(', '):''); },
      function(e){ if(e&&e.kind==='stop'||stopped){ reasonOut(e); return; } offline(q,e&&e.kind==='nokey'?T('AI 설정이 없어서 이름과 설명으로 찾았어요'):T('AI에 연결하지 못해서 이름과 설명으로 찾았어요')); })
    .then(function(){ setBusy(false); });
}
/* ---------- report draft: four sections as [PURPOSE] [METHOD] [RESULT] [CONCLUSION] (plain markers read better than JSON for a small model) ---------- */
function draftSystem(){ return FFP.labDraftSys(LANG[FFT.lang]||'English',local()); }
function draftPrompt(){ var e=LAB.cur, sm=local(), info=''; try{ info=e.ai(); }catch(er){}
  var p=FFP.labDraftPrompt(T(e.name),info,ctxLine(),sm?data(6):data(30)); return sm&&p.length>1800?p.slice(0,1800):p; }
function parseDraft(t){ var out={}, re=/\[(PURPOSE|METHOD|RESULT|CONCLUSION)\]/gi, m, last=null;
  while((m=re.exec(t))){ if(last) out[last.k]=t.slice(last.at,m.index).trim(); last={k:m[1].toLowerCase(),at:re.lastIndex}; }
  if(last) out[last.k]=t.slice(last.at).trim(); return out; }
function draft(onPart){ if(busy||!window.FFAI||!LAB.cur) return Promise.reject({kind:'busy',message:T('AI가 다른 일을 하고 있어요')});
  busy=true; stopped=false; return FFAI.ask({system:draftSystem(), prompt:draftPrompt(), prose:true, question:T('실험 보고서 초안을 써 줘'), maxTokens:local()?600:1400, onText:function(t){ if(onPart&&!stopped) onPart(parseDraft(t)); }})
    .then(function(t){ busy=false; var o=parseDraft(String(t||'')); o.raw=String(t||''); return o; }, function(e){ busy=false; throw e; }); }
MODES.forEach(function(m){ var b=document.createElement('button'); b.type='button'; b.textContent=T(m[1]); b.dataset.m=m[0]; b.setAttribute('aria-pressed',String(m[0]==='ask')); b.classList.toggle('on',m[0]==='ask'); b.onclick=function(){ setMode(m[0]); }; $('aiMode').appendChild(b); });
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
window.LABAI={mode:function(){ return mode; }, setMode:setMode, rank:rank, draft:draft, parseDraft:parseDraft, busy:function(){ return busy; }, stop:function(){ stopped=true; try{ FFAI.stop(); }catch(e){} }, onOpen:function(){ if($('aiPanel').classList.contains('open')){ drawCtx(); } }, ask:ask, open:open, close:close, prompt:prompt, system:system};
/* keep the context line fresh while the panel is open */
setInterval(function(){ if($('aiPanel').classList.contains('open')&&!busy) drawCtx(); },1500);
})();
