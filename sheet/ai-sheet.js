/* Fry Sheet AI: the =AI() cell function (answers cached in doc.ai by prompt) and the "AI" dialog
   (ask about a table, write a formula, make a table, make a chart). Uses the shared ../ai.js (FFAI) and the
   short prompts in ../ai-prompts.js (FFP), which the Tools-trained built-in AI learned. */
(function(){
'use strict';
var A=window.FSAPI, E=FSE, T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };

/* ---------- =AI() ---------- */
var pending={}, errs={}, queue=[], running=0, MAXRUN=3, askedKey=false, paintT=null, force=false;
var CELL_SYS=FFP.cellSys;
function hash(s){ var h=5381; for(var i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return (h>>>0).toString(36)+s.length.toString(36); }
function store(){ var d=A.doc; if(!d.ai||typeof d.ai!=='object') d.ai={}; return d.ai; }
function repaint(){ clearTimeout(paintT); paintT=setTimeout(function(){ A.changed(); },120); }
function pump(){
  while(running<MAXRUN&&queue.length){
    var job=queue.shift(); running++;
    (function(job){
      FFAI.ask({prose:true, system:CELL_SYS, prompt:job.prompt, maxTokens:1024}).then(function(t){
        t=String(t||'').trim().replace(/^["'“”]+|["'“”]+$/g,''); store()[job.h]=t.length>2000?t.slice(0,2000):t; delete errs[job.h];
      },function(e){ errs[job.h]=e.message||'AI'; if(e.kind==='nokey'||e.kind==='auth') queue.forEach(function(j){ errs[j.h]=e.message; delete pending[j.h]; }), queue=[]; if(!pump.told){ pump.told=1; A.toast(e.message); setTimeout(function(){ pump.told=0; },4000); } })
      .then(function(){ delete pending[job.h]; running--; repaint(); A.saveSoon(); pump(); });
    })(job);
  }
}
/* =AI("주어", B1): a bare word naming a part of the data means "take that part out", spelled out so the small model gets it */
var PART_KO=/^(주어|서술어|술어|동사|목적어|보어|부사어|관형어|명사|대명사|형용사|부사|조사|감탄사|날짜|시간|요일|이름|사람|장소|숫자|금액|가격|전화번호|이메일|주소|나라|도시|색|색깔|단위|키워드|핵심어|핵심 단어)(만|은|는|이|가)?\s*(찾기|뽑기|골라|골라 줘|알려 줘|알려줘)?\s*\??$/,
    PART_EN=/^(the\s+)?(subject|verb|object|nouns?|adjectives?|adverbs?|dates?|time|names?|places?|numbers?|prices?|emails?|phone( number)?|address|keywords?|country|city|colou?r)\s*\??$/i;
// a small model mixes up sentence parts: say what each one looks like in a Korean sentence
var PART_HINT={주어:'주어는 동작이나 상태의 주인으로, 보통 "이/가/은/는/께서"가 붙은 말이에요 (예: "동생이 사과를 먹었다"의 주어는 동생이)',
  목적어:'목적어는 동작을 받는 대상으로, 보통 "을/를"이 붙은 말이에요 (예: "동생이 사과를 먹었다"의 목적어는 사과를)',
  보어:'보어는 "되다/아니다" 바로 앞에서 "이/가"가 붙은 말이에요 (예: "물이 얼음이 되었다"의 보어는 얼음이)',
  서술어:'서술어는 문장 끝에서 주어가 어떠한지, 무엇을 하는지 말하는 부분이에요 (예: "동생이 사과를 먹었다"의 서술어는 먹었다)',
  술어:'술어는 문장 끝에서 주어가 어떠한지, 무엇을 하는지 말하는 부분이에요 (예: "동생이 사과를 먹었다"의 서술어는 먹었다)',
  부사어:'부사어는 서술어를 꾸며 언제, 어디서, 어떻게를 말하는 부분이에요 (예: "동생이 어제 빨리 뛰었다"의 부사어는 어제, 빨리)',
  관형어:'관형어는 뒤에 오는 명사를 꾸미는 말이에요 (예: "예쁜 꽃이 피었다"의 관형어는 예쁜)',
  명사:'명사는 사람, 사물, 장소, 시간 같은 것의 이름을 나타내는 말이에요. 문장에 있는 명사를 하나도 빠뜨리지 말고 모두 골라요. 시간을 나타내는 오늘, 어제, 내일도 명사예요 (예: "오늘 나는 점심을 먹었다"의 명사는 오늘, 점심)',
  대명사:'대명사는 이름 대신 쓰는 말이에요 (예: 나, 너, 우리, 그, 이것). 문장에 있는 대명사를 모두 골라요 (예: "오늘 나는 점심을 먹었다"의 대명사는 나)'};
/* =AI("번역", 칸) / =AI("요약", 칸) / =AI("맞춤법", 칸): short fixed Korean tasks so a small model does exactly one thing.
   "번역" alone picks the direction from the data: Korean goes to English, anything else goes to Korean. */
var LANG_NUM={한:1,두:2,세:3,네:4,다섯:5};
function textTask(t,parts){
  var m, hasKo=/[가-힣]/.test((parts||[]).join(' '));
  if((m=/^(?:이\s*)?(?:글|문장)?\s*(번역|translate)(?:해\s*줘|하기)?\s*\??$/i.exec(t))) return (hasKo?'데이터를 영어로':'데이터를 한국어로')+' 번역하기. 번역한 글만 쓰기. 설명 없이';
  if((m=/^(영어|한국어|일본어|중국어|스페인어|프랑스어|독일어|러시아어|이탈리아어|포르투갈어)(?:로|으로)\s*(?:번역|통역)(?:해\s*줘|하기)?\s*\??$/.exec(t))) return '데이터를 '+m[1]+'로 번역하기. 번역한 글만 쓰기. 설명 없이';
  if((m=/^(?:(짧게|간단히|간단하게)\s*)?(?:(한|두|세|네|다섯|[1-5])\s*(?:줄|문장)(?:로|으로)?\s*)?요약(?:해\s*줘|하기)?\s*\??$/.exec(t))){
    var n=m[2]?(LANG_NUM[m[2]]||+m[2]):1; return '데이터를 '+n+'문장으로 요약하기. 중요한 내용만 쓰고 새 내용은 덧붙이지 않기. 요약한 글만 쓰기';
  }
  if(/^(맞춤법|맞춤법\s*(고치기|검사|교정)|교정)\s*\??$/.test(t)) return '데이터의 맞춤법과 띄어쓰기를 바로잡은 글만 쓰기. 뜻은 바꾸지 않기';
  return null;
}
function partTask(p,parts){
  var t=String(p==null?'':p).trim(), m, x=textTask(t,parts); if(x) return x;
  if((m=PART_KO.exec(t))) return '데이터에서 '+m[1]+'만 골라 데이터에 쓰인 그대로 쓰기. 여러 개면 쉼표로 구분'+(PART_HINT[m[1]]?'. '+PART_HINT[m[1]]:'');
  if((m=/(목적어|주어|보어|서술어|술어|부사어|관형어|대명사|명사)(?=인|만|은|는|이|가|를|와|과|\s|$|[,.?!])/.exec(t))) return t+'. '+PART_HINT[m[1]]; // longer tasks that name a sentence part
  if((m=PART_EN.exec(t))) return 'Write only the '+m[2].toLowerCase()+' from the data, exactly as it is written there. If there are several, separate them with commas';
  return p;
}
E.aiHook=function(prompt,parts){
  prompt=partTask(prompt,parts);
  var full=FFP.cellPrompt(prompt,parts), h=hash(full), st=store();
  if(force){ delete st[h]; delete errs[h]; }
  if(st[h]!=null) return st[h];
  if(errs[h]) return new E.Err('#AI!');
  if(!window.FFAI) return new E.Err('#AI!');
  if(!FFAI.ready()){
    if(!askedKey){ askedKey=true; setTimeout(function(){ FFAI.settings(function(){ repaint(); }); },0); }
    return new E.Err('#AI!');
  }
  if(!pending[h]){ pending[h]=1; queue.push({h:h,prompt:full}); setTimeout(pump,0); }
  return '⏳';
};
function rerunSel(){
  A.commitEdit(); var n=0; force=true;
  try{ A.forSel(function(r,c){ var cell=A.sheet.cells[E.K(r,c)]; if(cell&&/^=.*\bAI\s*\(/i.test(String(cell.v||''))){ n++; A.eng.reset(); A.eng.value(A.doc.active,r,c); } }); }
  finally{ force=false; }
  A.eng.reset(); repaint(); A.toast(n?F('AI 칸 {0}개를 다시 물어봐요',n):T('선택한 곳에 AI 함수가 없어요'));
}

/* ---------- dialog ---------- */
var mode='formula', lastAnswer='', lastFormula='', lastTable=null, lastChart=null;
function tableText(){
  var s=A.sel(), a=A.act(), g=(s.r1===s.r2&&s.c1===s.c2)?A.region(a.r,a.c):s;
  if(!g) return null;
  var lim=FFAI.isLocal()?60:300; g={r1:g.r1,c1:g.c1,r2:Math.min(g.r2,g.r1+lim),c2:Math.min(g.c2,g.c1+(lim>60?30:15))};
  var lines=['\t'+Array.from({length:g.c2-g.c1+1},function(_,j){ return E.colName(g.c1+j); }).join('\t')];
  for(var r=g.r1;r<=g.r2;r++){ var row=[r+1]; for(var c=g.c1;c<=g.c2;c++){ var v=A.eng.value(A.doc.active,r,c), cell=A.sheet.cells[E.K(r,c)]; row.push(E.isErr(v)?String(v):E.formatValue(v,cell&&cell.nf)); } lines.push(row.join('\t')); }
  return {g:g, text:lines.join('\n')};
}
var CHIPS={ask:[['📋 세 줄 요약','이 표를 세 줄로 요약해 줘'],['↕ 최대·최소','가장 큰 값과 가장 작은 값은?'],['🔍 눈에 띄는 점','이 표에서 눈에 띄는 점을 알려 줘']],
  calc:[['🧮 할인 계산','3500원짜리 7개에 10% 할인'],['📏 cm → 인치','170cm는 몇 인치'],['🌡 섭씨 → 화씨','섭씨 30도는 화씨'],['➖ A열 평균 − 5','A열 평균에서 5 빼기']],
  formula:[['B열 평균','B열의 평균'],['80 이상 개수','B열에서 80 이상인 칸의 수'],['가장 긴 글자','A열에서 가장 긴 글자']],
  table:[['🧑‍🎓 우리 반 표','우리 반 6명의 이름, 키, 좋아하는 과일 표'],['🗓 시간표','일주일 시간표'],['🏙 도시 인구','한국의 도시 5개와 인구']],
  graph:[['📊 막대 그래프','과목별 점수를 막대 그래프로'],['📈 변화 보기','달마다 어떻게 변했는지 꺾은선으로'],['🥧 비율 보기','전체에서 각각 차지하는 비율을 원형으로']]};
function chips(m){ var box=$('aiChips'); box.innerHTML=''; CHIPS[m].forEach(function(c){ var b=document.createElement('button'), full=T(c[1]); b.textContent=T(c[0]); b.title=full; b.onclick=function(){ $('aiQ').value=full; $('aiQ').focus(); }; box.appendChild(b); }); }
function trDemo(){
  close(); var a=A.act(), r=a.r, c=a.c, at=function(i){ return E.addr(r+i,c); };
  var rows=[[T('한국어'),T('영어')],[T('좋은 주말 보내세요!'),''],[T('엄마가 김치찌개를 끓여 주셨어요.'),''],[T('전원 버튼을 3초 이상 길게 누르세요.'),'']];
  for(var i=1;i<rows.length;i++) rows[i][1]='=AI("'+T('영어로 번역')+'", '+at(i)+')';
  A.pasteText(rows.map(function(x){ return x.join('\t'); }).join('\n')); A.toast(T('B열이 영어로 채워져요'));
}
function setMode(m){ mode=m; chips(m); document.querySelectorAll('.atab').forEach(function(b){ b.classList.toggle('on',b.dataset.m===m); });
  var ph={ask:T('예: 평균이 가장 높은 과목은? / 이 표를 세 줄로 요약해 줘'),formula:T('예: B열에서 80점 이상인 사람 수'),table:T('예: 우리 반 6명의 이름, 키, 좋아하는 과일 표'),graph:T('예: 이름별 수학 점수를 막대 그래프로'),calc:T('예: 3500원짜리 7개에 10% 할인 / 170cm는 몇 인치')}[m];
  $('aiQ').placeholder=ph; $('aiOut').innerHTML=''; $('aiActs').innerHTML=''; wrongFor();
  $('aiCtx').textContent=m==='calc'?T('숫자 계산과 단위 변환은 AI 없이 바로 해요. 칸이 들어간 계산은 AI가 수식으로 바꿔요'):m==='table'?F('{0} 칸부터 표를 넣어요',E.addr(A.act().r,A.act().c)):(function(){ var t=tableText(); return t?F('{0} 표를 AI에게 보여 줘요',E.rangeStr(t.g)):T('표를 고르면 AI가 그 내용을 보고 답해요'); })();
  if(m==='graph') recShow(); else rec=null;
}
var running=false;
function busy(on){ running=on; $('aiGo').textContent=on?T('멈추기'):T('보내기'); $('aiGo').classList.toggle('stopBtn',on); }
function out(html){ $('aiOut').innerHTML=html; }
function liveOut(t){ var e=$('aiOut').firstChild; if(!e||e.className!=='aiLive'){ out('<pre class="aiLive"></pre>'); e=$('aiOut').firstChild; }
  var stick=e.scrollHeight-e.scrollTop-e.clientHeight<24; e.textContent=t; if(stick) e.scrollTop=e.scrollHeight; }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
var TR_LANG=[['영어','영어'],['English','영어'],['스페인','스페인어'],['Spanish','스페인어'],['일본','일본어'],['Japanese','일본어'],['중국','중국어'],['Chinese','중국어'],['프랑스','프랑스어'],['French','프랑스어'],['독일','독일어'],['German','독일어'],['러시아','러시아어'],['이탈리아','이탈리아어'],['포르투갈','포르투갈어'],['한국어','한국어'],['Korean','한국어']];
function translateFormula(q,a){ // a request to translate a cell is =AI("<language>로 번역", cell), not a formula the model should invent
  if(!/번역|translate|traduc|traduire|übersetz|翻訳/i.test(q)) return null;
  var lang=''; for(var i=0;i<TR_LANG.length;i++) if(q.toLowerCase().indexOf(TR_LANG[i][0].toLowerCase())>=0){ lang=TR_LANG[i][1]; break; }
  if(!lang) return null;
  var m=/([A-Za-z]{1,3}\d{1,5})/.exec(q), ref=m?m[1].toUpperCase():null;
  if(!ref){ ref=a.c>0?E.addr(a.r,a.c-1):null; } if(!ref) return null;
  var josa=/[가-힣]/.test(lang.slice(-1))&&((lang.charCodeAt(lang.length-1)-0xAC00)%28===0)?'로':'으로';
  return {f:'=AI("'+lang+josa+' 번역", '+ref+')'};
}
function fnList(){ return (window.FNDOC||[]).map(function(f){ return f[1]; }).filter(function(n){ return n!=='AI'; }).join(', '); }
function go(){
  var q=$('aiQ').value.trim(); if(!q) return $('aiQ').focus();
  A.commitEdit();
  if(mode==='calc') return calcGo(q,A.act());
  busy(true); out(''); $('aiActs').innerHTML=''; wrongFor(); rec=null;
  var t=mode==='table'?null:tableText(), a=A.act(), lang=FFT.lang||'ko', p;
  if(mode==='ask') p=FFAI.ask({onText:liveOut, facts:true, prose:true, question:q, system:FFP.askSys, prompt:FFP.askPrompt(t&&t.text,q)})
    .then(function(r){ lastAnswer=r.trim(); out('<div class="aiAns">'+esc(lastAnswer).replace(/\n/g,'<br>')+'</div>');
      $('aiActs').innerHTML='<button class="tbtn" id="aiPut">'+T('답을 칸에 넣기')+'</button>';
      $('aiPut').onclick=function(){ var g=t?t.g:null, r0=g?g.r2+2:a.r, c0=g?g.c1:a.c; A.pushUndo(); lastAnswer.split('\n').forEach(function(l,i){ A.setRaw(r0+i,c0,l); }); A.markAI(r0,c0,r0+lastAnswer.split('\n').length-1,c0); A.changed(); A.select(r0,c0); close(); }; });
  else if(mode==='formula'){
    var tr=translateFormula(q,a);
    if(tr){ busy(false); lastFormula=tr.f; out('<code class="aiF">'+esc(tr.f)+'</code><div class="aiEx">'+esc(T('번역은 수식 함수가 없어서 AI() 함수로 해요. 칸마다 AI가 번역해서 채워요.'))+'</div>');
      $('aiActs').innerHTML='<button class="tbtn pri" id="aiPut">'+F('{0}에 넣기',E.addr(a.r,a.c))+'</button>';
      $('aiPut').onclick=function(){ A.pushUndo(); A.setRaw(a.r,a.c,lastFormula); A.markAI(a.r,a.c,a.r,a.c); A.changed(); close(); }; wrongFor('sheet-formula',q,lastFormula); return; }
    p=FFAI.ask({onText:liveOut, json:true, system:FFAI.isTuned()?FFP.formulaSys:FFP.formulaSys+' Use only these functions: '+fnList()+'. For translating, summarizing or classifying text use =AI("instruction", cell). If no formula can do the request, reply {"formula":"","explain":"why not, in one short sentence"}.',
      prompt:FFP.formulaPrompt(t&&t.text,E.addr(a.r,a.c),q)})
    .then(function(r){ var j=FFAI.parseJSON(r), f=String(j.formula||'').trim(); if(f&&f[0]!=='=') f='='+f;
      if(!f){ if(j.explain){ lastFormula=''; out('<div class="aiEx">'+esc(T('수식으로는 만들 수 없는 요청이에요.')+' '+j.explain)+'</div>'); $('aiActs').innerHTML=''; return; } throw new Error(T('AI 답을 읽지 못했어요')); }
      try{ E.parse(f.slice(1)); }catch(e){ throw new Error(T('AI가 만든 수식에 오류가 있어요')+': '+f); }
      lastFormula=f; out('<code class="aiF">'+esc(f)+'</code><div class="aiEx">'+esc(j.explain||'')+'</div>');
      $('aiActs').innerHTML='<button class="tbtn pri" id="aiPut">'+F('{0}에 넣기',E.addr(a.r,a.c))+'</button>';
      $('aiPut').onclick=function(){ A.pushUndo(); A.setRaw(a.r,a.c,lastFormula); A.markAI(a.r,a.c,a.r,a.c); A.changed(); close(); }; });
  }
  else if(mode==='graph'){
    if(!t){ busy(false); out('<div class="aiErr">'+esc(T('그래프로 만들 표를 먼저 고르세요'))+'</div>'); return; }
    p=FFAI.ask({onText:liveOut, json:true, system:FFP.graphSys, prompt:FFP.graphPrompt(t.text,q)})
    .then(function(r){ var ch=chartFrom(FFAI.parseJSON(r),t.g); lastChart=ch;
      out('<div class="aiChart"><canvas></canvas></div><div class="aiEx">'+esc(chartLabel(ch))+'</div>'); A.drawChart($('aiOut').querySelector('canvas'),ch);
      $('aiActs').innerHTML='<button class="tbtn pri" id="aiPut">'+T('차트 넣기')+'</button>';
      $('aiPut').onclick=function(){ A.pushUndo(); A.sheet.charts.push(lastChart); A.saveSoon(); close(); A.openDrawer(); }; });
  }
  else p=FFAI.ask({onText:liveOut, json:true, system:FFP.tableSys, prompt:FFP.tablePrompt(q)})
    .then(function(r){ var j=FFAI.parseJSON(r), rows=Array.isArray(j)?j:j.rows; if(!Array.isArray(rows)||!rows.length) throw new Error(T('AI 답을 읽지 못했어요'));
      rows=rows.slice(0,60).map(function(row){ return (Array.isArray(row)?row:[row]).slice(0,12).map(function(v){ return v==null?'':String(v).replace(/[\t\n]/g,' '); }); });
      lastTable=rows; var w=Math.max.apply(null,rows.map(function(x){ return x.length; }));
      out('<div class="aiPrev"><table>'+rows.slice(0,8).map(function(row,i){ return '<tr>'+row.map(function(v){ return (i?'<td>':'<th>')+esc(v)+(i?'</td>':'</th>'); }).join('')+'</tr>'; }).join('')+'</table>'+(rows.length>8?'<div class="aiEx">'+F('외 {0}줄',rows.length-8)+'</div>':'')+'</div>');
      $('aiActs').innerHTML='<button class="tbtn pri" id="aiPut">'+F('{0} 칸부터 넣기',E.addr(a.r,a.c))+'</button>';
      $('aiPut').onclick=function(){ A.pasteText(lastTable.map(function(r){ return r.join('\t'); }).join('\n')); A.markAI(a.r,a.c,a.r+lastTable.length-1,a.c+Math.max.apply(null,lastTable.map(function(r){ return r.length; }))-1); A.forSel(function(r,c){ if(r===A.act().r){ var cell=A.sheet.cells[E.K(r,c)]; if(cell) cell.b=1; } }); A.changed(); close(); }; });
  p.then(function(){ wrongFor('sheet-'+mode,q,$('aiOut').innerText); }).then(null,function(e){ if(e.kind!=='nokey') out('<div class="aiErr">'+esc(e.message||T('AI에 연결하지 못했어요'))+'</div>'); }).then(function(){ busy(false); });
}
/* ---------- "AI 계산": words -> one formula. calc.js reads most phrases without AI; the engine computes and checks. ---------- */
function calcVal(f){ if(/\bAI\s*\(/i.test(f)) return null; try{ E.parse(f.slice(1)); }catch(e){ return null; } var v=A.eng.calc(A.doc.active,f); return E.isErr(v)?null:v; }
function calcShow(f,v,a,note,viaAI){
  lastFormula=f;
  out('<code class="aiF">'+esc(f)+'</code><div class="aiCalc">= <b>'+esc(E.formatValue(v))+'</b></div><div class="aiEx">'+esc(note)+'</div>');
  $('aiActs').innerHTML='<button class="tbtn pri" id="aiPut">'+F('{0} 칸에 넣기',E.addr(a.r,a.c))+'</button>';
  $('aiPut').onclick=function(){ A.pushUndo(); A.setRaw(a.r,a.c,lastFormula); A.markAI(a.r,a.c,a.r,a.c); A.changed(); close(); };
  if(viaAI) wrongFor('sheet-calc',$('aiQ').value.trim(),f+' = '+E.formatValue(v));
}
function colsText(){ // "A=이름, B=점수": the header row, so the AI can match column words
  var out=[]; for(var c=0;c<26&&out.length<12;c++){ var v=A.eng.value(A.doc.active,0,c); if(typeof v==='string'&&v.trim()) out.push(E.colName(c)+'='+v.trim().slice(0,20)); } return out.join(', '); }
/* the AI's answer -> a checked formula, or null (junk, an unknown unit, a formula with an error) */
function calcRead(r,unit){
  var j=null; try{ j=FFAI.parseJSON(r); }catch(e){}
  if(j&&typeof j==='object'&&!Array.isArray(j)){
    if(j.value!=null||j.from||j.to){ var v=typeof j.value==='number'?j.value:parseFloat(String(j.value).replace(/,/g,'')), fr=FSCalc.unitCode(j.from), to=FSCalc.unitCode(j.to);
      if(isFinite(v)&&fr&&to&&E.convertUnit(v,fr,to)!=null) return FSCalc.convFormula({value:v,from:fr,to:to}); }
    if(typeof j.formula==='string'&&j.formula.trim()){ var f=j.formula.trim(); if(f[0]!=='=') f='='+f; return calcVal(f)!=null?f:null; }
    return null;
  }
  var m=/^\s*(=[^\n`]+)/.exec(String(r||'')); if(!unit&&m) return calcVal(m[1].trim())!=null?m[1].trim():null;
  return null;
}
function calcGo(q,a){
  $('aiActs').innerHTML=''; wrongFor();
  var fx=FSCalc.fast(q), v=fx&&calcVal(fx.formula);
  if(fx&&v!=null) return calcShow(fx.formula,v,a,fx.kind==='unit'?T('단위 변환이에요. AI 없이 바로 계산했어요'):T('AI 없이 바로 계산했어요'));
  if(!window.FFAI||!FFAI.ready()){
    out('<div class="aiEx">'+esc(T('이 계산은 AI가 수식으로 바꿔야 해요. AI 설정에서 AI를 켜 주세요. 숫자 계산과 단위 변환은 AI 없이도 돼요.'))+'</div>');
    $('aiActs').innerHTML='<button class="tbtn" id="aiCalcSet">'+T('AI 설정')+'</button>';
    $('aiCalcSet').onclick=function(){ if(window.FFAI) FFAI.settings(function(){ if(FFAI.ready()) calcGo(q,a); }); };
    return;
  }
  var unit=FSCalc.hasUnit(q);
  function once(retry){
    return FFAI.ask(unit?{json:true, maxTokens:200, system:FFP.unitSys, prompt:FFP.unitPrompt(q)+(retry?FFP.calcRetry:'')}
                       :{json:true, maxTokens:300, system:FFP.calcSys, prompt:FFP.calcPrompt(colsText(),q)+(retry?FFP.calcRetry:'')})
      .then(function(r){ var f=calcRead(r,unit); return f||retry?f:once(true); });
  }
  busy(true); out('<div class="aiEx">'+esc(T('생각하는 중…'))+'</div>');
  once(false).then(function(f){
    var v=f&&calcVal(f);
    if(f&&v!=null) calcShow(f,v,a,T('AI가 만든 수식이에요. 결과를 확인하고 넣으세요'),true);
    else out('<div class="aiErr">'+esc(T('AI가 알맞은 수식을 만들지 못했어요. 숫자와 칸 이름(A열, B2)을 넣어 더 짧게 써 보세요'))+'</div>');
  },function(e){ out(e&&e.kind==='nokey'?'':'<div class="aiErr">'+esc(e&&e.message||T('AI에 연결하지 못했어요'))+'</div>'); }).then(function(){ busy(false); });
}
/* {type, range, series:["C"], title} from the AI -> a chart object for the charts drawer (series = column letters inside range) */
function chartFrom(j,g){
  var type=String(j&&j.type||'').toLowerCase(), rg=E.parseRange(String(j&&j.range||''));
  if(FFP.graphTypes.indexOf(type)<0||!rg) throw new Error(T('AI 답을 읽지 못했어요'));
  if(rg.r2<=rg.r1) rg={r1:g.r1,c1:g.c1,r2:g.r2,c2:g.c2}; // a single row cannot be a chart: use the whole table
  var ch={id:A.uid(), r1:rg.r1, c1:rg.c1, r2:Math.min(rg.r2,rg.r1+500), c2:Math.min(rg.c2,rg.c1+20), type:type, title:String(j.title||'').slice(0,60)};
  var cols=(Array.isArray(j.series)?j.series:[]).map(function(s){ return E.colIdx(String(s).replace(/[^A-Za-z]/g,'')||'?'); }).filter(function(c){ return c>=ch.c1&&c<=ch.c2; });
  if(cols.length) ch.cols=cols;
  if(!A.chartData(ch).series.length) throw new Error(T('그 범위에는 숫자 데이터가 없어요'));
  return ch;
}
function chartLabel(ch){ var n={bar:T('세로 막대'),hbar:T('가로 막대'),line:T('꺾은선'),pie:T('원형'),scatter:T('산점도')}[ch.type];
  return n+' · '+E.rangeStr(ch)+(ch.cols?' · '+ch.cols.map(E.colName).join(', '):''); }
/* ---------- 그래프 추천: which chart fits the table. Rules first (works offline), the AI only words the reason. ---------- */
var CT={bar:'세로 막대',hbar:'가로 막대',line:'꺾은선',pie:'원형',scatter:'산점도'};
var CT_EN={bar:'bar (compare items)',hbar:'horizontal bar (ranking, long names)',line:'line (change over time)',pie:'pie (shares of a whole)',scatter:'scatter (relation of two numbers)'};
var H_DATE=/(날짜|일자|일시|연도|년도|월별|요일|주차|분기|시간|시각|기간|date|time|year|month|week|day|quarter)/i, H_SHARE=/(비율|비중|점유|구성|퍼센트|백분율|%|share|ratio|percent)/i;
var V_DATE=/^(\d{4}[-./]\d{1,2}([-./]\d{1,2})?|\d{1,2}월|\d{4}년.*|\d{1,2}[./]\d{1,2}|Q[1-4]|[1-4]분기|[월화수목금토일]요?일?|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/i;
function recGrid(){
  var s=A.sel(), a=A.act(), g=(s.r1===s.r2&&s.c1===s.c2)?A.region(a.r,a.c):Object.assign({},s);
  if(!g) return null;
  if(g.r1===0&&g.r2===A.sheet.rows-1||g.c1===0&&g.c2===A.sheet.cols-1){ var rg=A.region(a.r,a.c); if(rg) g=rg; }
  return {r1:g.r1,c1:g.c1,r2:Math.min(g.r2,g.r1+500),c2:Math.min(g.c2,g.c1+20)};
}
/* read the table: [{name, kind:'num'|'text', vals, disp, nf}] for the non-empty columns */
function recCols(g){
  var si=A.doc.active, hdr=A.hasHeader(g), r0=g.r1+(hdr?1:0), cols=[];
  for(var c=g.c1;c<=g.c2;c++){
    var vals=[], disp=[], n=0, t=0, nf=''; 
    for(var r=r0;r<=g.r2;r++){ var v=A.eng.value(si,r,c), cell=A.sheet.cells[E.K(r,c)]; if(E.isErr(v)) v=null;
      if(typeof v==='number') n++; else if(typeof v==='string'&&v!=='') t++; else if(typeof v==='boolean') v=null; else if(v!=null&&v!=='') v=null;
      vals.push(v); disp.push(v==null?'':E.formatValue(v,cell&&cell.nf)); if(cell&&cell.nf&&!nf) nf=String(cell.nf); }
    if(!n&&!t) continue;
    var name=hdr?String(A.eng.value(si,g.r1,c)==null?'':E.formatValue(A.eng.value(si,g.r1,c))):'';
    cols.push({c:c, name:name||E.colName(c), named:!!name, kind:n>=t?'num':'text', vals:vals, disp:disp, nf:nf});
  }
  return {cols:cols, hdr:hdr, rows:g.r2-r0+1};
}
function isDateCol(k){
  if(H_DATE.test(k.name)&&k.named) return true;
  if(k.kind==='text'){ var d=k.disp.filter(Boolean); return d.length>1&&d.filter(function(x){ return V_DATE.test(x.trim()); }).length>=d.length*.7; }
  return false;
}
function isSeqCol(k){ // 1,2,3… or 2021,2022,… : numbers that only say "which row"
  var v=k.vals.filter(function(x){ return x!=null; }); if(v.length<3||v.length!==k.vals.length) return false;
  var st=v[1]-v[0]; if(!(st>0)) return false; for(var i=1;i<v.length;i++) if(v[i]-v[i-1]!==st) return false;
  return v.every(function(x){ return x===Math.floor(x); })&&((v[0]>=1900&&v[v.length-1]<=2100)||(st===1&&v[0]<=1)||(H_DATE.test(k.name)&&k.named));
}
function recAnalyze(g){
  var d=recCols(g), nums=d.cols.filter(function(k){ return k.kind==='num'; }), texts=d.cols.filter(function(k){ return k.kind==='text'; });
  if(g.r2<=g.r1||!nums.length||d.rows<2) return {ok:false, why:T('숫자가 든 열이 둘 이상의 줄에 있어야 차트를 추천할 수 있어요')};
  var lab=null, seq=null;
  if(texts.length&&texts[0].c<nums[0].c) lab=texts[texts.length-1].c<nums[0].c?texts[texts.length-1]:texts[0];
  if(!lab&&nums.length>1&&isSeqCol(nums[0])){ seq=nums[0]; nums=nums.slice(1); }
  var info={g:g, rows:d.rows, lab:lab, seq:seq, nums:nums.slice(0,6), hdr:d.hdr, date:!!(lab&&isDateCol(lab))||!!seq};
  var one=info.nums.length===1, nn=info.nums[0], nonneg=nn.vals.every(function(x){ return x==null||x>=0; }),
      sum=nn.vals.reduce(function(a,b){ return a+(b||0); },0), shareH=H_SHARE.test(nn.name)&&nn.named||/%|p/i.test(nn.nf)&&/%/.test(nn.nf);
  info.canPie=one&&nonneg&&lab&&info.rows>=2&&info.rows<=12;
  info.canScatter=(!lab&&!seq?info.nums.length:info.nums.length)>=2;
  var type;
  if(info.date) type='line';
  else if(lab){
    var avg=lab.disp.reduce(function(a,b){ return a+b.length; },0)/Math.max(1,lab.disp.length);
    if(info.canPie&&info.rows<=8&&(shareH||Math.abs(sum-100)<=1||Math.abs(sum-1)<=.01)) type='pie';
    else if(one&&(info.rows>8||avg>=7)) type='hbar'; else type='bar';
  } else if(seq) type='line';
  else if(info.nums.length>=2) type='scatter';
  else type=info.rows>12?'line':'bar';
  info.type=type; info.alts=['bar','hbar','line'].concat(info.canPie?['pie']:[]).concat(info.canScatter?['scatter']:[]);
  return Object.assign({ok:true},info);
}
function recNames(info){ var n=info.nums.slice(0,3).map(function(k){ return k.name; }).join(', '); return n+(info.nums.length>3?'…':''); }
function recWhy(info,type){
  var lab=info.lab?info.lab.name:(info.seq?info.seq.name:T('줄 번호')), nm=recNames(info);
  return type==='pie'?F('「{0}」 값이 전체에서 각각 차지하는 몫이라 원형이 잘 맞아요',nm)
    :type==='line'?F('「{0}」 순서대로 「{1}」 값이 어떻게 달라지는지 보기 좋아요',lab,nm)
    :type==='scatter'?F('「{0}」와 「{1}」 두 숫자가 서로 어떤 관계인지 점으로 볼 수 있어요',info.nums[0].name,info.nums[1].name)
    :type==='hbar'?F('「{0}」 항목이 많거나 이름이 길어서 가로 막대로 순서를 견주기 좋아요',lab)
    :F('「{0}」 항목마다 「{1}」 값을 나란히 견주기 좋아요',lab,nm);
}
/* chart object for the charts drawer: pie takes one number column, scatter the first two (x, y) */
function recChart(info,type){
  var cols=info.nums.map(function(k){ return k.c; }); if(type==='pie') cols=cols.slice(0,1); if(type==='scatter') cols=cols.slice(0,2);
  var g=info.g, ch={id:A.uid(), r1:g.r1, c1:g.c1, r2:g.r2, c2:g.c2, type:type, title:info.nums.length===1?info.nums[0].name.slice(0,60):'', cols:cols};
  if(!info.lab&&!info.seq&&type!=='scatter'&&cols.length===info.nums.length&&cols[0]===g.c1&&cols.length===g.c2-g.c1+1) delete ch.cols;
  return ch;
}
var rec=null;
function recPaint(){
  var o=$('aiOut'), cv=o.querySelector('.aiChart canvas'); if(!rec||!cv) return;
  try{ A.drawChart(cv,rec.chart); }catch(e){}
}
function recShow(){
  rec=null; var o=$('aiOut'), acts=$('aiActs');
  var g=recGrid(); if(!g){ return; }
  var info=recAnalyze(g);
  if(!info.ok){ out('<div class="aiEx">'+esc(info.why)+'</div>'); return; }
  rec={info:info, type:info.type, why:recWhy(info,info.type), ai:''}; rec.chart=recChart(info,rec.type);
  recRender();
}
function recRender(){
  var info=rec.info, alts=info.alts.map(function(t){ return '<button class="aiChip'+(t===rec.type?' on':'')+'" data-t="'+t+'">'+esc(T(CT[t]))+'</button>'; }).join('');
  out('<div class="aiRec"><div class="aiRecH">'+esc(T('이 표에는 이 차트를 추천해요'))+': <b>'+esc(T(CT[rec.type]))+'</b></div><div class="aiChart"><canvas></canvas></div><div class="aiEx" id="aiRecWhy"></div><div class="aiRecAlt"><span class="aiEx">'+esc(T('다른 모양'))+'</span> '+alts+'</div></div>');
  $('aiRecWhy').textContent=rec.ai||rec.why;
  $('aiOut').querySelectorAll('.aiRecAlt .aiChip').forEach(function(b){ b.onclick=function(){ rec.type=b.dataset.t; rec.why=recWhy(rec.info,rec.type); rec.ai=''; rec.chart=recChart(rec.info,rec.type); recRender(); }; });
  var acts='<button class="tbtn pri" id="aiMake">'+esc(T('이 차트 만들기'))+'</button>';
  if(window.FFAI&&FFAI.ready()) acts='<button class="tbtn" id="aiRecAI">'+esc(T('AI로 설명 다듬기'))+'</button>'+acts;
  $('aiActs').innerHTML=acts;
  $('aiMake').onclick=function(){ A.pushUndo(); A.sheet.charts.push(Object.assign({},rec.chart,{id:A.uid()})); A.saveSoon(); close(); A.openDrawer(); };
  var ab=$('aiRecAI'); if(ab) ab.onclick=recAsk;
  if(rec.ai) wrongFor('sheet-graph-recommend',T('이 표에 맞는 차트는?')+' '+CT[rec.type],rec.ai);
  recPaint();
}
function recAsk(){
  var info=rec.info, type=rec.type, btn=$('aiRecAI'); btn.disabled=true; btn.textContent=T('생각하는 중…');
  var cols=info.nums.map(function(k){ return k.name+' (number)'; }); if(info.lab) cols.unshift(info.lab.name+' (text)'); if(info.seq) cols.unshift(info.seq.name+' (sequence)');
  var prompt='Table columns: '+cols.join(', ')+'; '+info.rows+' rows.\nChart: '+CT_EN[type]+'\nIn Korean, say in one or two short sentences why this chart fits this table.';
  FFAI.ask({prose:true, maxTokens:140, system:'You explain a chart choice to a spreadsheet user. Keep it to one or two short sentences, in Korean, plain text, no markdown. Do not suggest another chart.', prompt:prompt})
    .then(function(t){ t=String(t||'').trim().replace(/\s*\n+\s*/g,' '); if(!t||!rec||rec.type!==type) throw new Error(''); rec.ai=t.slice(0,300); recRender(); },
      function(e){ if(!rec||rec.type!==type) return; recRender(); if(e&&e.kind!=='nokey'&&e.kind!=='stop'&&e.message) A.toast(e.message); })
    .then(null,function(){ if(rec&&$('aiRecAI')){ $('aiRecAI').disabled=false; $('aiRecAI').textContent=T('AI로 설명 다듬기'); } });
}
function wrongFor(tool,question,answer){
  var h=$('aiWrong'); if(!h) return; h.innerHTML='';
  if(window.FFWrong&&String(answer||'').trim()) FFWrong.attach(h,{tool:tool, question:question, answer:answer});
}
function open(){ A.commitEdit(); setMode(mode); $('aiDlg').classList.add('open'); setTimeout(function(){ $('aiQ').focus(); },60); }
function close(){ $('aiDlg').classList.remove('open'); }
document.querySelectorAll('.atab').forEach(function(b){ b.onclick=function(){ setMode(b.dataset.m); }; });
$('aiGo').onclick=function(){ if(running){ try{ FFAI.stop(); }catch(e){} } else go(); };
$('aiQ').addEventListener('keydown',function(e){ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); go(); } e.stopPropagation(); });
$('aiClose').onclick=close;
$('aiSet').onclick=function(){ FFAI.settings(); };
$('aiFn').onclick=function(){ close(); var a=A.act(); A.select(a.r,a.c); A.toast(T('칸에 =AI("할 일", A2) 처럼 써 보세요')); };
$('aiRerun').onclick=function(){ close(); rerunSel(); };
$('aiTrDemo').onclick=trDemo;
if(window.FFWrong) FFWrong.toast=function(t){ A.toast(t); };
window.FSAI={open:open, rerun:rerunSel};
})();
