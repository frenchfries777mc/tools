/* Fry Slides AI: makes a deck from a topic and rewrites single slides, through the shared ../ai.js (FFAI).
   The answer is JSON {title, subtitle, slides:[{layout, title, subtitle, bullets[], left[], right[], leftTitle, rightTitle, stat, caption, quote, by, notes}]}.
   Slides appear while the answer streams in (each finished {...} inside "slides" is read on its own), so a cut-off
   or slightly broken answer still gives the slides that were complete. With the built-in AI (small context, short
   answers) the deck is made in steps: an outline first, then a few slides per request. */
(function(){
'use strict';
var A=window.FSL, T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };
var run=null; // {stopped:bool} while a request is running

/* ---------- reading the answer ---------- */
var ALIAS={'two-column':'two','two_column':'two','twocolumn':'two','two-columns':'two','columns':'two','column':'two','compare':'two','comparison':'two','2col':'two','2-column':'two',
  'statistic':'stat','stats':'stat','number':'stat','big-number':'stat','bignumber':'stat','metric':'stat','end':'closing','thanks':'closing','conclusion':'closing','outro':'closing','close':'closing',
  'cover':'title','title-slide':'title','intro':'title','divider':'section','header':'section','section-header':'section','list':'bullets','bullet':'bullets','content':'bullets','text':'bullets','citation':'quote'};
function str(v){ if(v==null) return ''; if(typeof v==='string') return v.trim(); if(typeof v==='number'||typeof v==='boolean') return String(v); if(Array.isArray(v)) return v.map(str).join(' ').trim(); if(typeof v==='object') return str(v.text||v.title||v.value||''); return ''; }
function list(v){ if(v==null) return []; if(typeof v==='string') v=v.split(/\n|\s*•\s*/); if(!Array.isArray(v)) v=[v];
  return v.map(function(x){ return str(x).replace(/^\s*(?:[-*•·▪◦]|\d+[.)])\s+/,'').trim(); }).filter(Boolean).slice(0,10).map(function(x){ return x.slice(0,400); }); }
function norm(o,lay){
  o=o&&typeof o==='object'&&!Array.isArray(o)?o:{};
  var L=str(o.layout||o.type||o.kind).toLowerCase().replace(/\s+/g,'-'); L=ALIAS[L]||L; if(A.LAYS.indexOf(L)<0) L=lay||'';
  var col=function(v,k){ return v&&typeof v==='object'&&!Array.isArray(v)?{t:str(v.title||v.heading||v.name), l:list(v.bullets||v.items||v.points||v.text)}:{t:str(o[k]), l:list(v)}; };
  var lc=col(o.left,'leftTitle'), rc=col(o.right,'rightTitle');
  var s={layout:L, title:str(o.title||o.heading).slice(0,300), subtitle:str(o.subtitle||o.subheading).slice(0,400), bullets:list(o.bullets||o.points||o.items||o.body||o.content),
    left:lc.l, right:rc.l, leftTitle:(lc.t||str(o.left_title||o.leftHeading)).slice(0,120), rightTitle:(rc.t||str(o.right_title||o.rightHeading)).slice(0,120),
    stat:str(o.stat||o.number||o.value||o.big).slice(0,40), caption:str(o.caption||o.label||o.description).slice(0,400), quote:str(o.quote).replace(/^["“”«»]+|["“”«»]+$/g,'').slice(0,600),
    by:str(o.by||o.author||o.source).replace(/^[—–-]\s*/,'').slice(0,120), notes:str(o.notes||o.speakerNotes||o.speaker_notes||o.note).slice(0,3000)};
  if(!L) L=s.left.length||s.right.length?'two':s.stat?'stat':s.quote?'quote':'bullets';
  if(L==='two'&&!s.left.length&&!s.right.length&&s.bullets.length){ var h=Math.ceil(s.bullets.length/2); s.left=s.bullets.slice(0,h); s.right=s.bullets.slice(h); s.bullets=[]; }
  if(L==='bullets'&&!s.bullets.length&&(s.left.length||s.right.length)) L='two';
  if(L==='stat'&&!s.stat) L='bullets';
  if(L==='stat'&&!s.caption&&s.bullets.length) s.caption=s.bullets.join(' ');
  if(L==='quote'&&!s.quote){ if(s.title&&!s.bullets.length){ s.quote=s.title; s.title=''; } else L='bullets'; }
  if((L==='title'||L==='closing'||L==='section')&&!s.subtitle&&s.bullets.length) s.subtitle=s.bullets.join(' · ');
  s.layout=L; return s;
}
function hasText(s){ return !!(s.title||s.subtitle||s.bullets.length||s.left.length||s.right.length||s.stat||s.quote); }
function loose(t){ return t.replace(/,\s*([}\]])/g,'$1').replace(/[“”](?=\s*:)/g,'"'); }
function tryJSON(t){ try{ return JSON.parse(t); }catch(e){} try{ return JSON.parse(loose(t)); }catch(e){} try{ return FFAI.parseJSON(t); }catch(e){} try{ return FFAI.parseJSON(loose(t)); }catch(e){} return null; }
function unq(s){ try{ return JSON.parse('"'+s+'"'); }catch(e){ return s; } }
/* the complete {...} objects inside the array that opens at t[at] */
function objects(t,at){ var out=[], depth=0, inS=false, esc=false, st=-1;
  for(var i=at+1;i<t.length;i++){ var c=t[i];
    if(inS){ if(esc) esc=false; else if(c==='\\') esc=true; else if(c==='"') inS=false; continue; }
    if(c==='"') inS=true;
    else if(c==='{'||c==='['){ if(depth===0&&c==='{') st=i; depth++; }
    else if(c==='}'||c===']'){ if(depth===0) break; depth--; if(depth===0&&c==='}'&&st>=0){ out.push(t.slice(st,i+1)); st=-1; } } }
  return out; }
/* what can be read so far from a (maybe unfinished) answer */
function extract(t){
  t=String(t||'').replace(/^[\s\S]*?```(?:json)?\s*/i,function(m){ return /```/.test(m)?'':m; });
  var r={slides:[]}, m=/"slides"\s*:\s*\[/.exec(t), at=-1, head='';
  if(m){ at=m.index+m[0].length-1; head=t.slice(0,m.index); }
  else { var a=t.indexOf('['), b=t.indexOf('{'); if(a>=0&&(b<0||a<b)) at=a; else head=t; }
  if(m||at<0){ var tm=/"(?:title|deckTitle)"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(head), sm=/"subtitle"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(head);
    if(tm&&!/"layout"/.test(head)) r.title=unq(tm[1]); if(sm&&!/"layout"/.test(head)) r.subtitle=unq(sm[1]); }
  if(at>=0) objects(t,at).forEach(function(s){ var j=tryJSON(s); if(j&&typeof j==='object') r.slides.push(j); });
  return r;
}
/* the whole answer once it is finished: full JSON when it parses, otherwise whatever extract() finds */
function readAll(t){
  var j=tryJSON(String(t||'')), x=extract(t);
  if(j&&Array.isArray(j)) return {slides:j, title:x.title, subtitle:x.subtitle};
  if(j&&typeof j==='object'){ if(Array.isArray(j.slides)) return {title:str(j.title), subtitle:str(j.subtitle), slides:j.slides}; if(j.layout||j.bullets||j.title) return {slides:[j]}; }
  return x;
}

/* ---------- prompts ---------- */
/* the prompts live in ../ai-prompts.js (FFP), shared with the training data in train/ */
function sysDeck(n){ return FFP.slidesDeckSys(n); }
function topicText(o){ return FFP.slidesTopic(o); }
var SYS_OUTLINE=FFP.slidesOutlineSys, SYS_FILL=FFP.slidesFillSys;
function sysOne(lay){ return FFP.slidesOneSys(lay); }
function slideJSON(s){ return FFP.slidesSlideJSON(s,(A.LAY[s.layout]||[]).map(function(b){ return b.f; })); }
function titles(skip){ return FFP.slidesTitles(A.deck.slides,skip,FFAI.isLocal()?12:40); }

/* ---------- requests ---------- */
function ask(o){ return FFAI.ask(o).then(null,function(e){ if(run&&run.stopped) throw stopErr(); throw e; }); }
function stopErr(){ var e=new Error(T('멈췄어요')); e.kind='stop'; return e; }
function stop(){ if(run){ run.stopped=true; } try{ FFAI.stop(); }catch(e){} }
function progress(done,n,txt){ $('genTxt').textContent=txt||F('슬라이드 만드는 중… {0} / {1}',done,n); $('genFill').style.width=Math.round(Math.min(1,done/n)*100)+'%'; }

/* one request for the whole deck (API keys); slides show up as they finish */
function genFull(o){
  var max=o.n+1, d=A.deck, got=function(){ return d.slides.length; };
  function head(x){ if(x.title&&A.isDefaultName(d.name)) A.setName(x.title.slice(0,120)); if(x.subtitle) o.sub=x.subtitle; }
  function add(raw){ if(got()>=max) return; var s=norm(raw); if(!hasText(s)) return; if(s.layout==='title'&&!s.subtitle&&o.sub) s.subtitle=o.sub; A.pushSlide(s); progress(got(),o.n); }
  function once(prompt,from){ var seen=0, base=got();
    return ask({system:sysDeck(o.n), prompt:prompt, json:true, maxTokens:Math.min(16000,1500+o.n*650), onText:function(t){ if(run.stopped) return; var x=extract(t); head(x); while(seen<x.slides.length){ add(x.slides[seen]); seen++; } }})
      .then(function(t){ if(run.stopped) throw stopErr(); var x=readAll(t); head(x); for(var i=seen;i<x.slides.length;i++) add(x.slides[i]); return got()-base; }); }
  progress(0,o.n,T('AI가 발표 자료를 쓰고 있어요…'));
  return once(topicText(o)).then(function(k){
    if(k===0&&!run.stopped) return once(topicText(o)+'\n\nYour last answer could not be read. Reply with the JSON object only, starting with {.');
    return k;
  }).then(function(){
    var last=d.slides[d.slides.length-1];
    if(!run.stopped&&got()>0&&got()<o.n-1&&last&&last.layout!=='closing') // cut off: ask once for the rest
      return once(topicText(o)+'\n\nThe deck already has these slides:\n'+titles()+'\nWrite only the remaining slides '+(got()+1)+' to '+o.n+', the last one "closing". Same JSON format.');
  });
}

/* built-in AI: an outline, then a few slides per request */
function genLocal(o){
  var d=A.deck, plan=[];
  function outline(extra){ var seen=0;
    return ask({system:SYS_OUTLINE, prompt:topicText(o)+(extra||''), json:true, maxTokens:900, onText:function(t){ if(run.stopped) return; var x=extract(t);
        if(x.title&&A.isDefaultName(d.name)) A.setName(x.title.slice(0,120));
        while(seen<x.slides.length&&seen<o.n){ var s=norm(x.slides[seen],'bullets'); s.notes=''; plan.push(s); A.pushSlide(s); seen++; progress(0,o.n,F('목차 만드는 중… {0} / {1}',seen,o.n)); } }})
      .then(function(t){ if(run.stopped) throw stopErr(); var x=readAll(t); if(x.title&&A.isDefaultName(d.name)) A.setName(x.title.slice(0,120)); o.sub=x.subtitle||o.sub||'';
        for(var i=seen;i<x.slides.length&&i<o.n;i++){ var s=norm(x.slides[i],'bullets'); plan.push(s); A.pushSlide(s); } return plan.length; }); }
  function fillBatch(idx,retry){
    var want=FFP.slidesWant(d.slides,idx), seen=0;
    var put=function(raw){ var i=idx[seen]; seen++; var old=d.slides[i]; if(!old) return; var s=norm(raw,old.layout);
      if(!hasText(s)) return; if(!s.title) s.title=old.title; if(s.layout==='title'&&!s.subtitle) s.subtitle=o.sub; A.putSlide(i,s); };
    return ask({system:SYS_FILL, prompt:FFP.slidesFillPrompt(d.name||o.topic,o.aud,titles(),want), json:true, maxTokens:1800,
      onText:function(t){ if(run.stopped) return; var x=extract(t); while(seen<x.slides.length&&seen<idx.length) put(x.slides[seen]); }})
      .then(function(t){ if(run.stopped) throw stopErr(); var x=readAll(t); while(seen<x.slides.length&&seen<idx.length) put(x.slides[seen]);
        if(seen<idx.length&&!retry) return fillBatch(idx.slice(seen),true); });
  }
  progress(0,o.n,T('목차 만드는 중…'));
  return outline().then(function(k){ if(!k&&!run.stopped) return outline(FFP.slidesRetry); return k; }).then(function(){
    if(!d.slides.length) return;
    var first=d.slides[0]; if(first.layout==='title'&&!first.subtitle&&o.sub){ first.subtitle=o.sub; A.putSlide(0,first); }
    var todo=d.slides.map(function(s,i){ return i; }).filter(function(i){ var s=d.slides[i]; return !(s.layout==='title'&&s.subtitle); });
    var batches=[]; for(var i=0;i<todo.length;i+=3) batches.push(todo.slice(i,i+3));
    var done=d.slides.length-todo.length;
    return batches.reduce(function(p,b){ return p.then(function(){ if(run.stopped) throw stopErr(); progress(done,o.n);
      return fillBatch(b).then(null,function(e){ if(e.kind==='stop'||run.stopped) throw e; console.warn(e); }).then(function(){ done+=b.length; progress(done,o.n); }); }); },Promise.resolve());
  });
}

function generate(){
  if(run||!window.FFAI) return;
  var d=A.deck, o={topic:$('topic').value.trim(), aud:$('aud').value.trim(), n:Math.max(3,Math.min(15,+$('count').value||8))};
  if(!o.topic){ A.toast(T('발표 주제를 먼저 써 주세요')); $('topic').focus(); return; }
  d.topic=o.topic; d.aud=o.aud; d.n=o.n; A.saveNow();
  A.pushUndo(); run={stopped:false}; A.setGen(true);
  var local=false; try{ local=FFAI.isLocal(); }catch(e){}
  (local?genLocal(o):genFull(o)).then(function(){
    if(!d.slides.length) throw new Error(T('AI 답을 읽지 못했어요'));
    A.toast(F('슬라이드 {0}장을 만들었어요',d.slides.length));
  },function(e){ if(e&&e.kind==='stop'||run.stopped){ if(d.slides.length) A.toast(T('멈췄어요 · 만든 슬라이드는 남겨 뒀어요')); return; } if(!e||e.kind!=='nokey') A.toast((e&&e.message)||T('AI에 연결하지 못했어요')); console.warn(e); })
  .then(function(){ run=null; A.setGen(false); if(d.slides.length) A.select(0); A.saveNow(); });
}

/* ---------- one slide ---------- */
function slideAct(kind,q){
  if(run||A.busy) return; var i=A.cur, d=A.deck, s=d.slides[i]; if(!s&&kind!=='add') return;
  A.blurEdit(); var before=A.snap(); run={stopped:false}; A.setBusy(true);
  var lay=kind==='add'?null:s.layout, p;
  if(kind==='add') p=FFP.slidesAddPrompt(d.name,titles(),i,q);
  else if(kind==='fix') p=FFP.slidesActPrompt(d.name,i,d.slides.length,slideJSON(s),'rewrite')+'\nExtra instruction from the user: '+q;
  else p=FFP.slidesActPrompt(d.name,i,d.slides.length,slideJSON(s),kind);
  function once(extra){ return ask({system:sysOne(lay), prompt:p+(extra||''), json:true, maxTokens:FFAI.isLocal()?1200:3000, onText:function(){}}).then(function(t){
    if(run.stopped) throw stopErr(); var x=readAll(t), r=x.slides&&x.slides[0]; if(!r) return null; var n=norm(r,lay||'bullets'); if(lay) n.layout=lay; return hasText(n)?n:null; }); }
  once().then(function(n){ return n||once(FFP.slidesRetry); }).then(function(n){
    if(!n) throw new Error(T('AI 답을 읽지 못했어요'));
    A.pushUndo(before);
    if(kind==='add'){ A.insertSlide(i+1,n); A.toast(T('슬라이드를 추가했어요')); }
    else { if(!n.notes) n.notes=s.notes; if(!n.title&&s.title&&n.layout!=='quote') n.title=s.title; A.putSlide(i,n); A.toast(T('슬라이드를 고쳤어요 · 마음에 안 들면 되돌리기')); }
  }).then(null,function(e){ if(e&&e.kind==='stop'||run&&run.stopped) return; if(!e||e.kind!=='nokey') A.toast((e&&e.message)||T('AI에 연결하지 못했어요')); console.warn(e); })
  .then(function(){ run=null; A.setBusy(false); A.saveNow(); });
}

$('genBtn').onclick=generate;
$('genStop').onclick=stop; $('busyStop').onclick=stop;
$('aiBtn').onclick=function(){ A.blurEdit(); A.openMenu($('aiMenu'),this); };
var aiMode='new', MODE_NOTE={new:'주제를 쓰면 새 발표 자료를 만들어요. 지금 발표 자료는 목록에 그대로 남아요.', fix:'지금 슬라이드를 어떻게 고칠지 써 주세요. 되돌리기로 되돌릴 수 있어요.', add:'새 슬라이드에 무엇을 넣을지 써 주세요. 지금 슬라이드 뒤에 들어가요.'},
  MODE_PH={new:'예: 우리 동네 환경 문제와 해결 방법', fix:'예: 더 쉬운 말로, 예시를 하나 넣어서', add:'예: 우리가 할 수 있는 일 세 가지'}, MODE_OK={new:'새로 만들기', fix:'고치기', add:'추가하기'};
function setMode(m){ aiMode=m; document.querySelectorAll('#aiMode button').forEach(function(b){ b.classList.toggle('on',b.dataset.m===m); });
  $('aiModeNote').textContent=T(MODE_NOTE[m]); $('aiIn').placeholder=T(MODE_PH[m]); $('aiOk').textContent=T(MODE_OK[m]); }
function openAiDlg(m){ var s=A.deck.slides[A.cur]; document.querySelector('#aiMode [data-m="fix"]').disabled=!s||A.LAYS.indexOf(s.layout)<0; if(m==='fix'&&document.querySelector('#aiMode [data-m="fix"]').disabled) m='new';
  setMode(m); $('aiIn').value=m==='new'?(A.deck.slides.length?'':(A.deck.topic||'')):''; $('aiDlg').classList.add('open'); setTimeout(function(){ $('aiIn').focus(); },60); }
function closeAiDlg(){ $('aiDlg').classList.remove('open'); }
$('aiDlg').addEventListener('click',function(e){ if(e.target.closest('[data-close]')) closeAiDlg(); });
$('aiMode').addEventListener('click',function(e){ var b=e.target.closest('button'); if(b&&!b.disabled) setMode(b.dataset.m); });
$('aiIn').addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Escape') closeAiDlg(); if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); $('aiOk').click(); } });
$('aiOk').onclick=function(){ var v=$('aiIn').value.trim(); if(!v) return $('aiIn').focus(); closeAiDlg();
  if(aiMode==='new') A.newDeckWith(v).then(generate); else slideAct(aiMode==='fix'?'fix':'add',v); };
window.addEventListener('keydown',function(e){ if(e.key==='Escape'&&$('aiDlg').classList.contains('open')){ closeAiDlg(); e.stopPropagation(); } },true);
$('aiBtn').onclick=function(){ A.blurEdit(); A.openMenu($('aiMenu'),this); };
$('aiMenu').addEventListener('click',function(e){
  var b=e.target.closest('[data-a]'); if(!b) return; A.closeMenus(); var k=b.dataset.a;
  if(k==='dlg') openAiDlg('new'); else if(k==='spell') spell(); else slideAct(k);
});

/* ---------- "맞춤법 고치기": the AI returns the slide's text with only the mistakes fixed; each change is shown as a word diff
   to accept or reject. Fields that changed too much (a rewrite, not a spelling fix) are left out and the person is told. ---------- */
var SPF=['title','subtitle','leftTitle','left','rightTitle','right','bullets','caption','quote','by','notes'];
var SPL={title:'제목',subtitle:'부제목',leftTitle:'왼쪽 제목',left:'왼쪽 내용',rightTitle:'오른쪽 제목',right:'오른쪽 내용',bullets:'글머리표',caption:'설명',quote:'인용',by:'말한 사람',notes:'발표자 메모'};
function spellFields(s){ var fs=(A.LAY[s.layout]||[]).map(function(b){ return b.f; }), o={};
  SPF.forEach(function(f){ if(f!=='notes'&&fs.indexOf(f)<0) return; var v=s[f]; if(Array.isArray(v)?v.some(function(x){ return String(x||'').trim(); }):String(v||'').trim()) o[f]=Array.isArray(v)?v.map(String):String(v); });
  return o; }
function toks(t){ return String(t||'').match(/\s+|[^\s]+/g)||[]; }
/* word diff: [{eq:'text'} | {del:'old', ins:'new'}] */
function wdiff(a,b){
  var x=toks(a), y=toks(b), n=x.length, m=y.length, L=[], i, j;
  for(i=0;i<=n;i++){ L.push(new Array(m+1).fill(0)); }
  for(i=n-1;i>=0;i--) for(j=m-1;j>=0;j--) L[i][j]=x[i]===y[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
  var out=[], cur=null; i=0; j=0;
  var push=function(k,t){ if(k==='eq'){ cur=null; var l=out[out.length-1]; if(l&&l.eq!=null) l.eq+=t; else out.push({eq:t}); } else { if(!cur){ cur={del:'',ins:''}; out.push(cur); } cur[k]+=t; } };
  while(i<n||j<m){ if(i<n&&j<m&&x[i]===y[j]){ push('eq',x[i]); i++; j++; } else if(j<m&&(i>=n||L[i][j+1]>=L[i+1][j])){ push('ins',y[j]); j++; } else { push('del',x[i]); i++; } }
  return out; }
function lev(a,b){ if(a===b) return 0; var p=[], i, j; for(j=0;j<=b.length;j++) p.push(j);
  for(i=1;i<=a.length;i++){ var q=[i]; for(j=1;j<=b.length;j++) q.push(Math.min(p[j]+1,q[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1))); p=q; } return p[b.length]; }
/* a spelling fix keeps the length and most letters: false when the text was rewritten */
function sane(a,b){ a=String(a); b=String(b); if(!b.trim()) return !a.trim();
  var la=a.length, lb=b.length, big=Math.max(la,lb), d=0;
  if(Math.abs(la-lb)>Math.max(3,big*0.25)) return false;
  wdiff(a,b).forEach(function(h){ if(h.eq==null) d+=lev(h.del,h.ins); });
  return d<=Math.max(2,big*0.3); }
var spDlg=null, spState=null;
function spellUI(){
  if(spDlg) return spDlg;
  var st=document.createElement('style'); st.textContent='#spDlg .dlg{width:min(620px,100%)} #spDlg .dbody{overflow:auto} .spF{border:1px solid var(--line);border-radius:10px;padding:8px 10px;line-height:1.7}'+
    '.spF b{display:block;font-size:12.5px;color:var(--dim);margin-bottom:2px} .spH{cursor:pointer;border-radius:5px;padding:0 2px;outline:1px dashed transparent} .spH:hover{outline-color:var(--fry)}'+
    '.spH del{color:#ff8f8f;text-decoration:line-through} .spH ins{color:#3fe08f;text-decoration:none;font-weight:700} .spH.off ins{color:var(--dim);text-decoration:line-through;font-weight:400} .spH.off del{color:inherit;text-decoration:none}'+
    '.spWarn{color:#ffb86b;font-size:13px} .spNote{color:var(--dim);font-size:13px;margin:0}';
  document.head.appendChild(st);
  spDlg=document.createElement('div'); spDlg.className='ov'; spDlg.id='spDlg'; spDlg.setAttribute('data-xonly','');
  spDlg.innerHTML='<div class="dlg"><div class="dh"><h3></h3><button class="x" aria-label="">×</button></div><div class="dbody"><p class="spNote"></p><div class="spList"></div></div>'+
    '<div class="dfoot"><button class="tbtn spAll"></button><button class="tbtn spNone"></button><button class="tbtn pri spOk"></button></div></div>';
  document.body.appendChild(spDlg);
  var q=function(c){ return spDlg.querySelector(c); };
  q('h3').textContent=T('맞춤법 고치기'); q('.x').setAttribute('aria-label',T('닫기')); q('.spNote').textContent=T('바뀐 곳을 누르면 받기와 버리기가 바뀌어요');
  q('.spAll').textContent=T('모두 받기'); q('.spNone').textContent=T('모두 버리기'); q('.spOk').textContent=T('적용');
  q('.x').onclick=function(){ spDlg.classList.remove('open'); };
  q('.spAll').onclick=function(){ spDlg.querySelectorAll('.spH').forEach(function(h){ h.classList.remove('off'); }); };
  q('.spNone').onclick=function(){ spDlg.querySelectorAll('.spH').forEach(function(h){ h.classList.add('off'); }); };
  q('.spList').addEventListener('click',function(e){ var h=e.target.closest('.spH'); if(h) h.classList.toggle('off'); });
  q('.spOk').onclick=spellApply;
  return spDlg;
}
function spellShow(i,items,bad){
  var d=spellUI(), list=d.querySelector('.spList'); list.innerHTML=''; spState={i:i, items:items};
  items.forEach(function(it,k){ var box=document.createElement('div'); box.className='spF'; var b=document.createElement('b'); b.textContent=it.label; box.appendChild(b);
    it.diff.forEach(function(h,hi){ if(h.eq!=null){ box.appendChild(document.createTextNode(h.eq)); return; }
      var sp=document.createElement('span'); sp.className='spH'; sp.dataset.k=k; sp.dataset.h=hi; sp.title=T('누르면 받기·버리기');
      if(h.del){ var de=document.createElement('del'); de.textContent=h.del; sp.appendChild(de); } if(h.ins){ var ins=document.createElement('ins'); ins.textContent=h.ins; sp.appendChild(ins); }
      box.appendChild(sp); });
    list.appendChild(box); });
  bad.forEach(function(l){ var w=document.createElement('p'); w.className='spWarn'; w.textContent='⚠ '+F('{0}: AI가 뜻까지 너무 많이 바꿔서 뺐어요',l); list.appendChild(w); });
  ['.spAll','.spNone','.spOk'].forEach(function(c){ d.querySelector(c).style.display=items.length?'':'none'; });
  d.classList.add('open');
}
function spellApply(){
  var st=spState, s=A.deck.slides[st.i]; spDlg.classList.remove('open'); if(!s) return;
  var off={}; spDlg.querySelectorAll('.spH.off').forEach(function(h){ off[h.dataset.k+':'+h.dataset.h]=1; });
  var n=JSON.parse(JSON.stringify(s)), changed=0;
  st.items.forEach(function(it,k){ var t=it.diff.map(function(h,hi){ if(h.eq!=null) return h.eq; if(off[k+':'+hi]) return h.del; changed++; return h.ins; }).join('');
    if(it.idx!=null){ n[it.f]=(n[it.f]||[]).slice(); n[it.f][it.idx]=t; } else n[it.f]=t; });
  if(!changed) return A.toast(T('바꾼 곳이 없어요'));
  A.pushUndo(); A.putSlide(st.i,n); A.toast(F('{0}곳을 고쳤어요 · 되돌리기 가능',changed));
}
function spell(){
  if(run||A.busy) return; var i=A.cur, s=A.deck.slides[i]; if(!s) return A.toast(T('고칠 슬라이드가 없어요'));
  A.blurEdit(); var o=spellFields(s), keys=Object.keys(o);
  if(!keys.length) return A.toast(T('이 슬라이드에는 고칠 글이 없어요'));
  run={stopped:false}; A.setBusy(true);
  function once(extra){ return ask({system:FFP.spellSys, prompt:FFP.spellPrompt(JSON.stringify(o))+(extra||''), json:true, maxTokens:FFAI.isLocal()?1500:4000}).then(function(t){
    if(run.stopped) throw stopErr(); var j=tryJSON(String(t||'')); if(j&&Array.isArray(j.slides)) j=j.slides[0]; if(j&&j.slide&&typeof j.slide==='object') j=j.slide;
    return j&&typeof j==='object'&&!Array.isArray(j)&&keys.some(function(k){ return j[k]!=null; })?j:null; }); }
  once().then(function(j){ return j||once(FFP.slidesRetry); }).then(function(j){
    if(!j) throw new Error(T('AI 답을 읽지 못했어요'));
    var items=[], bad=[];
    keys.forEach(function(k){ var a=o[k], b=j[k], lab=T(SPL[k]||k);
      if(b==null) return;
      if(Array.isArray(a)){ var bl=Array.isArray(b)?b.map(str):typeof b==='string'?b.split('\n'):null;
        if(!bl||bl.length!==a.length){ bad.push(lab); return; }
        var ok=a.every(function(x,ix){ return sane(x,bl[ix]); }); if(!ok){ bad.push(lab); return; }
        a.forEach(function(x,ix){ if(x!==bl[ix]) items.push({f:k, idx:ix, label:lab+' '+(ix+1), diff:wdiff(x,bl[ix])}); }); return; }
      b=str(b); if(!sane(a,b)){ bad.push(lab); return; }
      if(a!==b) items.push({f:k, label:lab, diff:wdiff(a,b)}); });
    if(!items.length&&!bad.length){ A.toast(T('고칠 맞춤법이 없어요')); return; }
    spellShow(i,items,bad);
  }).then(null,function(e){ if(e&&e.kind==='stop'||run&&run.stopped) return; if(!e||e.kind!=='nokey') A.toast((e&&e.message)||T('AI에 연결하지 못했어요')); console.warn(e); })
  .then(function(){ run=null; A.setBusy(false); });
}
(function(){ var m=$('aiMenu'), hr=m&&m.querySelector('hr'); if(!m) return; var b=document.createElement('button'); b.dataset.a='spell'; b.textContent='🔤 '+T('맞춤법 고치기'); m.insertBefore(b,hr); })();
window.FSLAI={spell:spell, wdiff:wdiff, sane:sane, extract:extract, readAll:readAll, norm:norm, generate:generate, slideAct:slideAct, stop:stop};
})();
