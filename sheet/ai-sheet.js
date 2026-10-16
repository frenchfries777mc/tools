/* Fry Sheet AI: the =AI() cell function (answers cached in doc.ai by prompt) and the "AI" dialog
   (ask about a table, write a formula, make a table). Uses the shared ../ai.js (FFAI). */
(function(){
'use strict';
var A=window.FSAPI, E=FSE, T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };

/* ---------- =AI() ---------- */
var pending={}, errs={}, queue=[], running=0, MAXRUN=3, askedKey=false, paintT=null, force=false;
var CELL_SYS='You fill exactly one spreadsheet cell. Reply with only the value for the cell: no quotes, no labels, no explanation, no markdown. Keep it to one short line unless the instruction asks for more. Answer in the language of the instruction unless it asks for another language. If the data is empty or the instruction cannot be done, reply with a single dash.';
function hash(s){ var h=5381; for(var i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return (h>>>0).toString(36)+s.length.toString(36); }
function store(){ var d=A.doc; if(!d.ai||typeof d.ai!=='object') d.ai={}; return d.ai; }
function repaint(){ clearTimeout(paintT); paintT=setTimeout(function(){ A.changed(); },120); }
function pump(){
  while(running<MAXRUN&&queue.length){
    var job=queue.shift(); running++;
    (function(job){
      FFAI.ask({system:CELL_SYS, prompt:job.prompt, maxTokens:1024}).then(function(t){
        t=String(t||'').trim().replace(/^["'“”]+|["'“”]+$/g,''); store()[job.h]=t.length>2000?t.slice(0,2000):t; delete errs[job.h];
      },function(e){ errs[job.h]=e.message||'AI'; if(e.kind==='nokey'||e.kind==='auth') queue.forEach(function(j){ errs[j.h]=e.message; delete pending[j.h]; }), queue=[]; if(!pump.told){ pump.told=1; A.toast(e.message); setTimeout(function(){ pump.told=0; },4000); } })
      .then(function(){ delete pending[job.h]; running--; repaint(); A.saveSoon(); pump(); });
    })(job);
  }
}
E.aiHook=function(prompt,parts){
  var full=prompt+(parts.length?'\n\nData:\n'+parts.join('\n\n'):''), h=hash(full), st=store();
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
var mode='ask', lastAnswer='', lastFormula='', lastTable=null;
function tableText(){
  var s=A.sel(), a=A.act(), g=(s.r1===s.r2&&s.c1===s.c2)?A.region(a.r,a.c):s;
  if(!g) return null;
  var lim=FFAI.isLocal()?60:300; g={r1:g.r1,c1:g.c1,r2:Math.min(g.r2,g.r1+lim),c2:Math.min(g.c2,g.c1+(lim>60?30:15))};
  var lines=['\t'+Array.from({length:g.c2-g.c1+1},function(_,j){ return E.colName(g.c1+j); }).join('\t')];
  for(var r=g.r1;r<=g.r2;r++){ var row=[r+1]; for(var c=g.c1;c<=g.c2;c++){ var v=A.eng.value(A.doc.active,r,c), cell=A.sheet.cells[E.K(r,c)]; row.push(E.isErr(v)?String(v):E.formatValue(v,cell&&cell.nf)); } lines.push(row.join('\t')); }
  return {g:g, text:lines.join('\n')};
}
function setMode(m){ mode=m; document.querySelectorAll('.atab').forEach(function(b){ b.classList.toggle('on',b.dataset.m===m); });
  var ph={ask:T('예: 평균이 가장 높은 과목은? / 이 표를 세 줄로 요약해 줘'),formula:T('예: B열에서 80점 이상인 사람 수'),table:T('예: 우리 반 6명의 이름, 키, 좋아하는 과일 표')}[m];
  $('aiQ').placeholder=ph; $('aiOut').innerHTML=''; $('aiActs').innerHTML='';
  $('aiCtx').textContent=m==='table'?F('{0} 칸부터 표를 넣어요',E.addr(A.act().r,A.act().c)):(function(){ var t=tableText(); return t?F('{0} 표를 AI에게 보여 줘요',E.rangeStr(t.g)):T('표를 고르면 AI가 그 내용을 보고 답해요'); })();
}
function busy(on){ $('aiGo').disabled=on; $('aiGo').textContent=on?T('생각하는 중…'):T('보내기'); }
function out(html){ $('aiOut').innerHTML=html; }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function fnList(){ return (window.FNDOC||[]).map(function(f){ return f[1]; }).filter(function(n){ return n!=='AI'; }).join(', '); }
function go(){
  var q=$('aiQ').value.trim(); if(!q) return $('aiQ').focus();
  A.commitEdit(); busy(true); out(''); $('aiActs').innerHTML='';
  var t=mode==='table'?null:tableText(), a=A.act(), lang=FFT.lang||'ko', p;
  if(mode==='ask') p=FFAI.ask({system:'You help someone with their spreadsheet. Answer the question about the table clearly and briefly in plain text (no markdown tables, no code fences). Use the language the question is written in.',
      prompt:(t?'Table (first row = column letters, first column = row numbers):\n'+t.text+'\n\n':'(No table selected.)\n\n')+'Question: '+q})
    .then(function(r){ lastAnswer=r.trim(); out('<div class="aiAns">'+esc(lastAnswer).replace(/\n/g,'<br>')+'</div>');
      $('aiActs').innerHTML='<button class="tbtn" id="aiPut">'+T('답을 칸에 넣기')+'</button>';
      $('aiPut').onclick=function(){ var g=t?t.g:null, r0=g?g.r2+2:a.r, c0=g?g.c1:a.c; A.pushUndo(); lastAnswer.split('\n').forEach(function(l,i){ A.setRaw(r0+i,c0,l); }); A.changed(); A.select(r0,c0); close(); }; });
  else if(mode==='formula') p=FFAI.ask({json:true, system:'You write one spreadsheet formula. Reply with JSON only: {"formula":"=...","explain":"one short sentence in the language of the request"}. Use A1 references that match the table addresses given. Use only these functions: '+fnList()+'. Strings use double quotes, arguments are separated by commas.',
      prompt:(t?'Table (first row = column letters, first column = row numbers):\n'+t.text+'\n\n':'')+'The formula goes in cell '+E.addr(a.r,a.c)+'.\nRequest: '+q})
    .then(function(r){ var j=FFAI.parseJSON(r), f=String(j.formula||'').trim(); if(f&&f[0]!=='=') f='='+f; if(!f) throw new Error(T('AI 답을 읽지 못했어요'));
      try{ E.parse(f.slice(1)); }catch(e){ throw new Error(T('AI가 만든 수식에 오류가 있어요')+': '+f); }
      lastFormula=f; out('<code class="aiF">'+esc(f)+'</code><div class="aiEx">'+esc(j.explain||'')+'</div>');
      $('aiActs').innerHTML='<button class="tbtn pri" id="aiPut">'+F('{0}에 넣기',E.addr(a.r,a.c))+'</button>';
      $('aiPut').onclick=function(){ A.pushUndo(); A.setRaw(a.r,a.c,lastFormula); A.changed(); close(); }; });
  else p=FFAI.ask({json:true, system:'You make a small table for a spreadsheet. Reply with JSON only: {"rows":[["header1","header2"],["value","value"]]}. The first row is the header. At most 60 rows and 12 columns. Numbers as plain numbers without units in the cell. Use the language of the request.',
      prompt:'Request: '+q})
    .then(function(r){ var j=FFAI.parseJSON(r), rows=Array.isArray(j)?j:j.rows; if(!Array.isArray(rows)||!rows.length) throw new Error(T('AI 답을 읽지 못했어요'));
      rows=rows.slice(0,60).map(function(row){ return (Array.isArray(row)?row:[row]).slice(0,12).map(function(v){ return v==null?'':String(v).replace(/[\t\n]/g,' '); }); });
      lastTable=rows; var w=Math.max.apply(null,rows.map(function(x){ return x.length; }));
      out('<div class="aiPrev"><table>'+rows.slice(0,8).map(function(row,i){ return '<tr>'+row.map(function(v){ return (i?'<td>':'<th>')+esc(v)+(i?'</td>':'</th>'); }).join('')+'</tr>'; }).join('')+'</table>'+(rows.length>8?'<div class="aiEx">'+F('외 {0}줄',rows.length-8)+'</div>':'')+'</div>');
      $('aiActs').innerHTML='<button class="tbtn pri" id="aiPut">'+F('{0} 칸부터 넣기',E.addr(a.r,a.c))+'</button>';
      $('aiPut').onclick=function(){ A.pasteText(lastTable.map(function(r){ return r.join('\t'); }).join('\n')); A.forSel(function(r,c){ if(r===A.act().r){ var cell=A.sheet.cells[E.K(r,c)]; if(cell) cell.b=1; } }); A.changed(); close(); }; });
  p.then(null,function(e){ if(e.kind!=='nokey') out('<div class="aiErr">'+esc(e.message||T('AI에 연결하지 못했어요'))+'</div>'); }).then(function(){ busy(false); });
}
function open(){ A.commitEdit(); setMode(mode); $('aiDlg').classList.add('open'); setTimeout(function(){ $('aiQ').focus(); },60); }
function close(){ $('aiDlg').classList.remove('open'); }
document.querySelectorAll('.atab').forEach(function(b){ b.onclick=function(){ setMode(b.dataset.m); }; });
$('aiGo').onclick=go;
$('aiQ').addEventListener('keydown',function(e){ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); go(); } e.stopPropagation(); });
$('aiClose').onclick=close; $('aiDlg').addEventListener('click',function(e){ if(e.target.id==='aiDlg') close(); });
$('aiSet').onclick=function(){ FFAI.settings(); };
$('aiFn').onclick=function(){ close(); var a=A.act(); A.select(a.r,a.c); A.toast(T('칸에 =AI("할 일", A2) 처럼 써 보세요')); };
$('aiRerun').onclick=function(){ close(); rerunSel(); };
window.FSAI={open:open, rerun:rerunSel};
})();
