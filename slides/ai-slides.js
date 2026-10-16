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
var FIELDS='{"layout":"title|section|bullets|two|stat|quote|closing","title":"...","subtitle":"...","bullets":["..."],"leftTitle":"...","left":["..."],"rightTitle":"...","right":["..."],"stat":"...","caption":"...","quote":"...","by":"...","notes":"..."}';
var USE='Fields per layout: title and closing = title + subtitle; section = title + subtitle (opens a new part); bullets = title + 3-5 short bullets; two = title + leftTitle/left[] + rightTitle/right[] (compare two things); stat = title + stat (one striking number with its unit, like "71%" or "1.5 million") + caption (what it means); quote = quote + by. Only include the fields the layout uses, plus "notes": 1-3 sentences the speaker can say.';
var RULES='Bullets are short phrases (at most about 12 words), not full paragraphs. Use real, well-known facts; do not invent precise numbers you are not sure of (round numbers are fine). Write every text in the language of the topic.';
function sysDeck(n){ return 'You write slide decks. Reply with JSON only, no markdown fences: {"title":"deck title","subtitle":"one line","slides":['+FIELDS+']}. Make exactly '+n+' slides. Slide 1 is layout "title", the last slide is "closing" (thanks, a question or the key takeaway). In between mostly "bullets", with a "two", "stat", "quote" or "section" where it fits the content. '+USE+' '+RULES; }
function topicText(o){ return 'Topic: '+o.topic+(o.aud?'\nAudience and purpose: '+o.aud:'')+'\nNumber of slides: '+o.n; }
var SYS_OUTLINE='You plan slide decks. Reply with JSON only: {"title":"deck title","subtitle":"one line","slides":[{"layout":"title|section|bullets|two|stat|quote|closing","title":"slide title"}]}. Slide 1 is "title", the last is "closing", mostly "bullets" in between. Short titles. Write in the language of the topic.';
var SYS_FILL='You write the content of some slides of a deck. Reply with JSON only: {"slides":['+FIELDS+']} with the slides asked for, in order, same layout and title as planned. '+USE+' Bullets: 3-4, short. Write in the language of the deck.';
function sysOne(lay){ return 'You write one slide of a deck. Reply with JSON only: one slide object '+FIELDS+(lay?'. Keep the layout "'+lay+'".':'. Pick the layout that fits best.')+' '+USE+' '+RULES.replace('the topic','the slide'); }
function slideJSON(s){ var o={layout:s.layout}; (A.LAY[s.layout]||[]).forEach(function(b){ var v=s[b.f]; if(Array.isArray(v)?v.length:v) o[b.f]=v; }); if(s.notes) o.notes=s.notes; return JSON.stringify(o); }
function titles(skip){ return A.deck.slides.map(function(s,i){ return i===skip?null:(i+1)+'. '+(s.title||s.quote||s.stat||'').slice(0,60); }).filter(Boolean).slice(0,FFAI.isLocal()?12:40).join('\n'); }

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
    var want=idx.map(function(i){ return (i+1)+'. ['+d.slides[i].layout+'] '+(d.slides[i].title||''); }).join('\n'), seen=0;
    var put=function(raw){ var i=idx[seen]; seen++; var old=d.slides[i]; if(!old) return; var s=norm(raw,old.layout);
      if(!hasText(s)) return; if(!s.title) s.title=old.title; if(s.layout==='title'&&!s.subtitle) s.subtitle=o.sub; A.putSlide(i,s); };
    return ask({system:SYS_FILL, prompt:'Deck: '+(d.name||o.topic)+(o.aud?'\nAudience: '+o.aud:'')+'\nAll slides:\n'+titles()+'\n\nWrite these slides in full:\n'+want, json:true, maxTokens:1800,
      onText:function(t){ if(run.stopped) return; var x=extract(t); while(seen<x.slides.length&&seen<idx.length) put(x.slides[seen]); }})
      .then(function(t){ if(run.stopped) throw stopErr(); var x=readAll(t); while(seen<x.slides.length&&seen<idx.length) put(x.slides[seen]);
        if(seen<idx.length&&!retry) return fillBatch(idx.slice(seen),true); });
  }
  progress(0,o.n,T('목차 만드는 중…'));
  return outline().then(function(k){ if(!k&&!run.stopped) return outline('\n\nReply with the JSON object only, starting with {.'); return k; }).then(function(){
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
var TASK={rewrite:'Rewrite this slide with clearer, more interesting wording. Keep the meaning.',
  shorter:'Make this slide shorter: fewer and shorter bullets, the same key points. Shorten the notes too.',
  longer:'Make this slide more detailed: add useful specifics and examples (up to 6 bullets) and fuller speaker notes.'};
function slideAct(kind,q){
  if(run||A.busy) return; var i=A.cur, d=A.deck, s=d.slides[i]; if(!s&&kind!=='add') return;
  A.blurEdit(); var before=A.snap(); run={stopped:false}; A.setBusy(true);
  var lay=kind==='add'?null:s.layout, p;
  if(kind==='add') p='Deck: '+d.name+'\nSlides so far:\n'+titles()+'\n\nWrite one new slide (it goes after slide '+(i+1)+') about: '+q;
  else p='Deck: '+d.name+'\nSlide '+(i+1)+' of '+d.slides.length+' (JSON): '+slideJSON(s)+'\n\nTask: '+TASK[kind];
  function once(extra){ return ask({system:sysOne(lay), prompt:p+(extra||''), json:true, maxTokens:FFAI.isLocal()?1200:3000, onText:function(){}}).then(function(t){
    if(run.stopped) throw stopErr(); var x=readAll(t), r=x.slides&&x.slides[0]; if(!r) return null; var n=norm(r,lay||'bullets'); if(lay) n.layout=lay; return hasText(n)?n:null; }); }
  once().then(function(n){ return n||once('\n\nReply with the JSON object only, starting with {.'); }).then(function(n){
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
$('aiMenu').addEventListener('click',function(e){
  var b=e.target.closest('[data-a]'); if(!b) return; A.closeMenus(); var k=b.dataset.a;
  if(k==='add') A.ask(T('AI로 슬라이드 추가'),T('새 슬라이드에 무엇을 넣을지 써 주세요. 지금 슬라이드 뒤에 들어가요.'),T('예: 우리가 할 수 있는 일 세 가지'),T('만들기')).then(function(v){ if(v) slideAct('add',v); });
  else slideAct(k);
});
window.FSLAI={extract:extract, readAll:readAll, norm:norm, generate:generate, slideAct:slideAct, stop:stop};
})();
