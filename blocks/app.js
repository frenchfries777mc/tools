/* Block HTML: workspace, live preview, code view, saving and examples. */
(function(){
'use strict';
var T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };
var LS='ffblocks.v1';
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
/* #embed=<project id>: read-only mode used by Fry Slides to get the built HTML of a saved project (nothing is written to storage) */
var EMB=(/^#embed=(.+)$/.exec(location.hash)||[])[1]; if(EMB) try{ EMB=decodeURIComponent(EMB); }catch(e){}
function lsSet(k,v){ if(EMB) return false; try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } }

var theme=Blockly.Theme.defineTheme('ffdark',{name:'ffdark',base:Blockly.Themes.Classic,
  componentStyles:{workspaceBackgroundColour:'#0b0d13',toolboxBackgroundColour:'#10131b',toolboxForegroundColour:'#eef0f5',flyoutBackgroundColour:'#151925',flyoutForegroundColour:'#cfd5e1',flyoutOpacity:.97,scrollbarColour:'#3a4256',scrollbarOpacity:.7,insertionMarkerColour:'#ffffff',insertionMarkerOpacity:.3,cursorColour:'#ffc93c',selectedGlowColour:'#ffc93c'},
  fontStyle:{family:'"Noto Sans KR", sans-serif',weight:'500',size:11}});
/* keep Korean (and other) variable names readable in the generated code instead of %-encoding them */
Blockly.Names.prototype.safeName=function(name){
  if(!name) return 'unnamed';
  try{ name=name.replace(/[^\p{L}\p{N}_$]/gu,'_'); }catch(e){ name=name.replace(/[^\w$\u00c0-\uffff]/g,'_'); }
  if(/^[0-9]/.test(name)) name='my_'+name;
  return name;
};
if(('ontouchstart' in window)||navigator.maxTouchPoints>0){ try{ Blockly.config.snapRadius=48; Blockly.config.connectingSnapRadius=76; }catch(e){} } // bigger drop target for fingers
var ws=Blockly.inject('ws',{toolbox:BH.toolbox(),theme:theme,renderer:'zelos',trashcan:true,media:'lib/media/',
  grid:{spacing:28,length:2,colour:'#1a1f2b',snap:false},
  zoom:{controls:true,wheel:false,pinch:true,startScale:('ontouchstart' in window)?0.72:0.68,maxScale:2,minScale:0.3,scaleSpeed:1.15},
  move:{scrollbars:true,drag:true,wheel:true}});
ws.addChangeListener(Blockly.Events.disableOrphans);

var loading=false;
function prescan(obj){ // remember element names before loading so name dropdowns accept them
  BH.KNOWN.clear();
  var s=typeof obj==='string'?obj:JSON.stringify(obj), re=/"NAME":"((?:[^"\\]|\\.)*)"/g, m;
  while((m=re.exec(s))) try{ BH.KNOWN.add(JSON.parse('"'+m[1]+'"')); }catch(e){}
  var rx=/<field name="NAME">([^<]*)<\/field>/g; while((m=rx.exec(s))) BH.KNOWN.add(m[1].replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&amp;/g,'&'));
}
function loadJSON(state){ loading=true; prescan(state); ws.clear(); try{ Blockly.serialization.workspaces.load(state,ws); }finally{ BH.KNOWN.clear(); loading=false; } afterLoad(); }
function loadXML(xml){ loading=true; prescan(xml); ws.clear(); try{ Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml),ws); }finally{ BH.KNOWN.clear(); loading=false; } afterLoad(); }
function arrange(){ // page on the left, scripts in a column to its right
  var tops=ws.getTopBlocks(false), page=tops.filter(function(b){ return b.type==='page_root'; })[0], x=30, y=30;
  if(page){ page.moveTo(new Blockly.utils.Coordinate(30,30)); x=30+page.getHeightWidth().width+70; }
  tops.forEach(function(b){ if(b===page) return; b.moveTo(new Blockly.utils.Coordinate(x,y)); y+=b.getHeightWidth().height+36; });
}
function afterLoad(){ dropCustom(false); setTimeout(function(){ ws.scrollCenter(); var tb=ws.getTopBlocks(true)[0]; if(tb) ws.scroll(-tb.getRelativeToSurfaceXY().x*ws.scale+30, -tb.getRelativeToSurfaceXY().y*ws.scale+30); },30); refresh(true); }

/* keep element names unique, and follow renames in the blocks that use them */
ws.addChangeListener(function(e){
  if(loading) return;
  if(e.type===Blockly.Events.BLOCK_CREATE){
    (e.ids||[]).forEach(function(id){ var b=ws.getBlockById(id); if(!b||BH.EL.indexOf(b.type)<0) return;
      var n=b.getFieldValue('NAME'), others=ws.getAllBlocks(false).filter(function(x){ return x!==b&&BH.EL.indexOf(x.type)>=0; }).map(function(x){ return x.getFieldValue('NAME'); });
      if(others.indexOf(n)<0) return; var base=n.replace(/\d+$/,''), k=1; while(others.indexOf(base+k)>=0) k++;
      var og=Blockly.Events.getGroup(); Blockly.Events.setGroup(e.group||og||true); try{ b.setFieldValue(base+k,'NAME'); }finally{ Blockly.Events.setGroup(og||false); } });
  }
  if(e.type===Blockly.Events.BLOCK_CHANGE&&e.element==='field'&&e.name==='NAME'){
    var b=ws.getBlockById(e.blockId); if(!b||BH.EL.indexOf(b.type)<0||!e.oldValue) return;
    var still=ws.getAllBlocks(false).some(function(x){ return x!==b&&BH.EL.indexOf(x.type)>=0&&x.getFieldValue('NAME')===e.oldValue; });
    if(still) return;
    ws.getAllBlocks(false).forEach(function(x){ x.inputList.forEach(function(inp){ inp.fieldRow.forEach(function(f){ if((f.name==='EL'||(/_hit$/.test(x.type)&&(f.name==='A'||f.name==='B')))&&f.getValue()===e.oldValue){ BH.KNOWN.add(e.newValue); f.setValue(e.newValue); BH.KNOWN.clear(); } }); }); });
  }
});

/* ---------- preview & code ---------- */
var refT=null, lastPrev='';
ws.addChangeListener(function(e){ if(e.isUiEvent||loading) return; clearTimeout(refT); refT=setTimeout(function(){ refresh(false); },450); save(); });
var runState='run'; // run | pause | stop  (top bar: 실행하기 / 멈추기 / 정지하기)
/* ---------- step-by-step run: one block at a time, with variable values ---------- */
var dbgOn=false, dbgCurId=null, dbgPrev={}, dbgT=null;
function dbgSay(t){ $('dbgState').textContent=t; }
function dbgBtns(on){ $('dbgNext').disabled=$('dbgFree').disabled=!on; }
function dbgUnlight(){ if(dbgCurId){ try{ ws.highlightBlock(dbgCurId,false); }catch(e){} dbgCurId=null; } }
function dbgReset(){ clearTimeout(dbgT); dbgUnlight(); dbgPrev={}; if(!dbgOn) return; dbgBtns(false); dbgSay(T('이벤트를 기다리는 중 · 버튼을 누르거나 키를 눌러 보세요')); $('dbgCur').textContent='…'; $('dbgCur').style.borderLeftColor='#38bdf8'; $('dbgVars').innerHTML=''; }
function dbgShow(d){
  clearTimeout(dbgT); dbgUnlight(); var b=ws.getBlockById(d.id);
  if(b){ dbgCurId=d.id; try{ ws.highlightBlock(d.id,true); ws.centerOnBlock(d.id); }catch(e){}
    $('dbgCur').textContent=b.toString(90).replace(/\s+/g,' '); $('dbgCur').style.borderLeftColor=b.getColour(); }
  var box=$('dbgVars'); box.innerHTML=''; var now={};
  (d.vars||[]).forEach(function(v){ now[v[0]]=v[1]; var sp=document.createElement('span'); if(dbgPrev[v[0]]!==undefined&&dbgPrev[v[0]]!==v[1]) sp.className='ch'; var nb=document.createElement('b'); nb.textContent=v[0]+' = '; sp.appendChild(nb); sp.appendChild(document.createTextNode(v[1]===''?T('(비어 있음)'):v[1])); box.appendChild(sp); });
  if(!(d.vars||[]).length){ var n=document.createElement('span'); n.className='none'; n.textContent=T('변수가 없어요'); box.appendChild(n); }
  dbgPrev=now; dbgBtns(true); dbgSay(T('지금 할 블록 · 다음 블록을 누르면 실행해요')); }
function dbgSend(mode){ var w=$('frame').contentWindow; if(!w) return; dbgBtns(false); dbgSay(T('실행 중…')); w.postMessage({ffbhDbg:mode},'*');
  clearTimeout(dbgT); dbgT=setTimeout(function(){ if(dbgOn&&!$('dbgNext').disabled) return; dbgUnlight(); dbgSay(T('끝났어요 · 다음 이벤트(누르기·키·시간)를 기다려요')); },900); }
function setDbg(on){ dbgOn=on; $('stepBtn').classList.toggle('on',on); $('dbgBar').hidden=!on; dbgUnlight();
  if(on){ if(runState==='stop'||runState==='pause') setRun('run'); lastPrev=''; refresh('run'); showPreview(); toast(T('한 블록씩 실행을 켰어요')); }
  else { lastPrev=''; refresh('run'); toast(T('한 블록씩 실행을 껐어요')); } }
$('stepBtn').onclick=function(){ setDbg(!dbgOn); };
$('dbgNext').onclick=function(){ dbgSend('next'); };
$('dbgFree').onclick=function(){ dbgSend('free'); };
$('dbgOff').onclick=function(){ setDbg(false); };
window.addEventListener('message',function(e){ var d=e.data; if(!d||e.source!==$('frame').contentWindow||!dbgOn) return;
  if(d.ffbhStep) dbgShow(d.ffbhStep);
  else if(d.ffbhStepEnd){ clearTimeout(dbgT); dbgUnlight(); dbgBtns(false); dbgSay(T('끝났어요 · 다음 이벤트(누르기·키·시간)를 기다려요')); } });
function setRun(st){ runState=st; $('runBtn').classList.toggle('on',st==='run'); $('pauseBtn').classList.toggle('on',st==='pause'); $('stopBtn').classList.toggle('on',st==='stop');
  $('pauseBtn').querySelector('.lb').textContent=st==='pause'?T('이어하기'):T('멈추기'); $('pPrev').classList.toggle('paused',st==='pause'); }
function stoppedPage(){ return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;height:100vh;display:grid;place-items:center;background:#0b0d13;color:#9aa3b5;font:15px sans-serif;text-align:center;padding:20px;box-sizing:border-box}b{color:#3fe08f}</style></head><body><div>⏹ '+T('정지했어요')+'<br><br><b>'+T('▶ 실행하기를 누르면 처음부터 다시 시작해요')+'</b></div></body></html>'; }
function showPreview(){ if(window.matchMedia('(max-width:900px)').matches&&document.body.className==='v-blocks'){ var b=document.querySelector('#seg button[data-v="prev"]'); if(b) b.click(); } else setPane('prev'); }
function refresh(force){
  if(runState==='stop'&&force!=='run'){ if($('pCode').classList.contains('on')) showCode(); return; }
  if(custom!==null){ if(force!=='run'){ dropCustom(true); } else { clearLog(); dbgReset(); $('frame').srcdoc=custom; if(runState==='pause') setRun('run'); return; } }
  checkPics();
  var prev; try{ prev=BH.build(ws,{trap:true,debug:dbgOn}); }catch(err){ console.error(err); return; }
  if(force||prev!==lastPrev){ lastPrev=prev; clearLog(); dbgReset(); $('frame').srcdoc=prev; if(runState==='pause') setRun('run'); }
  if($('pCode').classList.contains('on')) showCode();
}
/* "내 그림" blocks without a picture: warning on the block, hint toast, placeholder in the preview */
var picKey='';
function checkPics(){ var n=BH.markPics(ws), key=BH.missingPics(ws).map(function(b){ return b.id; }).join(',');
  if(n&&key!==picKey&&!loading) toast(T('그림을 고르지 않은 "내 그림" 블록이 있어요. 블록의 그림 칸을 눌러 골라 주세요'));
  picKey=key; }
/* typed HTML: the HTML code tab is always editable (a text box over the highlighted code); the preview, copy and download then use that text until the blocks change */
var custom=null, customT=null, prevCustom=null;
function setCust(on){ $('codeReset').hidden=!on; $('codeBlocks').hidden=!on; if(!on) $('codeUndo').hidden=true; }
/* typed or pasted HTML -> blocks (friendly blocks where possible, "HTML/JS 직접 쓰기" blocks for the rest) */
function convDone(html,c,how){ prevCustom=html; $('projName').value=$('projName').value||c.title; $('codeUndo').hidden=false; save();
  toast(how?T('블록으로 바꾸기 어려운 부분은 직접 쓰기 블록에 넣었어요'):F('블록 {0}개 · 직접 쓰기 {1}개로 바꿨어요',c.stats.blocks,c.stats.raw+c.stats.rawHtml)); }
function convFail(html){ if(custom===null){ custom=html; $('codeEdit').value=html.length>BIGCODE?html.slice(0,40000):html; setCust(true); } toast(T('블록으로 바꾸지 못했어요. HTML 코드 그대로 두었어요')); }
/* a progress bar for the steps of a big conversion */
function prog(p,txt){ var el=$('prog'); if(p==null){ el.hidden=true; return; } el.hidden=false; $('progTxt').textContent=txt+' '+Math.round(p*100)+'%'; $('progBar').style.width=Math.round(p*100)+'%'; }
var converting=false;
function toBlocks(html,auto){ html=String(html==null?'':html); if(!html.trim()||!window.BHX||converting) return false;
  var big=html.length>150000;
  if(big){ /* big code: step by step, so the page can draw the progress between the steps */
    converting=true; var steps=[
      [0.08,'코드를 읽는 중…',function(){}],
      [0.25,'블록으로 나누는 중…',function(){ try{ st.r=BHX.convert(html,{big:true}); st.how=0; }catch(e){ console.error(e); st.r=null; } if(!st.r){ try{ st.r=BHX.fallback(html); st.how=1; }catch(e){ console.error(e); } } }],
      [0.75,'블록을 화면에 놓는 중…',function(){ if(!st.r) return; try{ loadXML(st.r.xml); arrange(); if(ws.getAllBlocks(false).length<2) throw new Error('empty'); st.ok=true; }catch(e){ console.error(e); st.ok=false; } }],
      [1,'마무리하는 중…',function(){}]], st={}, k=0;
    (function next(){ var sp=steps[k]; prog(sp[0],T(sp[1])); setTimeout(function(){ sp[2](); k++; if(k<steps.length){ next(); return; }
      prog(null); converting=false; if(st.ok) convDone(html,st.r,st.how); else convFail(html); },60); })();
    return true; }
  var tries=[function(){ return BHX.convert(html); },function(){ return BHX.fallback(html); }], c=null, how=0;
  for(var i=0;i<tries.length&&!c;i++){ try{ var r=tries[i](); how=i; loadXML(r.xml); arrange(); if(ws.getAllBlocks(false).length<2) throw new Error('empty'); c=r; }catch(e){ console.error(e); } }
  if(!c){ convFail(html); return false; }
  convDone(html,c,how); return true; }
function loadXML(xml){ loading=true; prescan(xml); ws.clear(); try{ Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml),ws); }finally{ BH.KNOWN.clear(); loading=false; } afterLoad(); }
function arrange(){ // page on the left, scripts in a column to its right
  var tops=ws.getTopBlocks(false), page=tops.filter(function(b){ return b.type==='page_root'; })[0], x=30, y=30;
  if(page){ page.moveTo(new Blockly.utils.Coordinate(30,30)); x=30+page.getHeightWidth().width+70; }
  tops.forEach(function(b){ if(b===page) return; b.moveTo(new Blockly.utils.Coordinate(x,y)); y+=b.getHeightWidth().height+36; });
}
function afterLoad(){ dropCustom(false); setTimeout(function(){ ws.scrollCenter(); var tb=ws.getTopBlocks(true)[0]; if(tb) ws.scroll(-tb.getRelativeToSurfaceXY().x*ws.scale+30, -tb.getRelativeToSurfaceXY().y*ws.scale+30); },30); refresh(true); }

/* keep element names unique, and follow renames in the blocks that use them */
ws.addChangeListener(function(e){
  if(loading) return;
  if(e.type===Blockly.Events.BLOCK_CREATE){
    (e.ids||[]).forEach(function(id){ var b=ws.getBlockById(id); if(!b||BH.EL.indexOf(b.type)<0) return;
      var n=b.getFieldValue('NAME'), others=ws.getAllBlocks(false).filter(function(x){ return x!==b&&BH.EL.indexOf(x.type)>=0; }).map(function(x){ return x.getFieldValue('NAME'); });
      if(others.indexOf(n)<0) return; var base=n.replace(/\d+$/,''), k=1; while(others.indexOf(base+k)>=0) k++;
      var og=Blockly.Events.getGroup(); Blockly.Events.setGroup(e.group||og||true); try{ b.setFieldValue(base+k,'NAME'); }finally{ Blockly.Events.setGroup(og||false); } });
  }
  if(e.type===Blockly.Events.BLOCK_CHANGE&&e.element==='field'&&e.name==='NAME'){
    var b=ws.getBlockById(e.blockId); if(!b||BH.EL.indexOf(b.type)<0||!e.oldValue) return;
    var still=ws.getAllBlocks(false).some(function(x){ return x!==b&&BH.EL.indexOf(x.type)>=0&&x.getFieldValue('NAME')===e.oldValue; });
    if(still) return;
    ws.getAllBlocks(false).forEach(function(x){ x.inputList.forEach(function(inp){ inp.fieldRow.forEach(function(f){ if((f.name==='EL'||(/_hit$/.test(x.type)&&(f.name==='A'||f.name==='B')))&&f.getValue()===e.oldValue){ BH.KNOWN.add(e.newValue); f.setValue(e.newValue); BH.KNOWN.clear(); } }); }); });
  }
});

/* ---------- preview & code ---------- */
var refT=null, lastPrev='';
ws.addChangeListener(function(e){ if(e.isUiEvent||loading) return; clearTimeout(refT); refT=setTimeout(function(){ refresh(false); },450); save(); });
var runState='run'; // run | pause | stop  (top bar: 실행하기 / 멈추기 / 정지하기)
/* ---------- step-by-step run: one block at a time, with variable values ---------- */
var dbgOn=false, dbgCurId=null, dbgPrev={}, dbgT=null;
function dbgSay(t){ $('dbgState').textContent=t; }
function dbgBtns(on){ $('dbgNext').disabled=$('dbgFree').disabled=!on; }
function dbgUnlight(){ if(dbgCurId){ try{ ws.highlightBlock(dbgCurId,false); }catch(e){} dbgCurId=null; } }
function dbgReset(){ clearTimeout(dbgT); dbgUnlight(); dbgPrev={}; if(!dbgOn) return; dbgBtns(false); dbgSay(T('이벤트를 기다리는 중 · 버튼을 누르거나 키를 눌러 보세요')); $('dbgCur').textContent='…'; $('dbgCur').style.borderLeftColor='#38bdf8'; $('dbgVars').innerHTML=''; }
function dbgShow(d){
  clearTimeout(dbgT); dbgUnlight(); var b=ws.getBlockById(d.id);
  if(b){ dbgCurId=d.id; try{ ws.highlightBlock(d.id,true); ws.centerOnBlock(d.id); }catch(e){}
    $('dbgCur').textContent=b.toString(90).replace(/\s+/g,' '); $('dbgCur').style.borderLeftColor=b.getColour(); }
  var box=$('dbgVars'); box.innerHTML=''; var now={};
  (d.vars||[]).forEach(function(v){ now[v[0]]=v[1]; var sp=document.createElement('span'); if(dbgPrev[v[0]]!==undefined&&dbgPrev[v[0]]!==v[1]) sp.className='ch'; var nb=document.createElement('b'); nb.textContent=v[0]+' = '; sp.appendChild(nb); sp.appendChild(document.createTextNode(v[1]===''?T('(비어 있음)'):v[1])); box.appendChild(sp); });
  if(!(d.vars||[]).length){ var n=document.createElement('span'); n.className='none'; n.textContent=T('변수가 없어요'); box.appendChild(n); }
  dbgPrev=now; dbgBtns(true); dbgSay(T('지금 할 블록 · 다음 블록을 누르면 실행해요')); }
function dbgSend(mode){ var w=$('frame').contentWindow; if(!w) return; dbgBtns(false); dbgSay(T('실행 중…')); w.postMessage({ffbhDbg:mode},'*');
  clearTimeout(dbgT); dbgT=setTimeout(function(){ if(dbgOn&&!$('dbgNext').disabled) return; dbgUnlight(); dbgSay(T('끝났어요 · 다음 이벤트(누르기·키·시간)를 기다려요')); },900); }
function setDbg(on){ dbgOn=on; $('stepBtn').classList.toggle('on',on); $('dbgBar').hidden=!on; dbgUnlight();
  if(on){ if(runState==='stop'||runState==='pause') setRun('run'); lastPrev=''; refresh('run'); showPreview(); toast(T('한 블록씩 실행을 켰어요')); }
  else { lastPrev=''; refresh('run'); toast(T('한 블록씩 실행을 껐어요')); } }
$('stepBtn').onclick=function(){ setDbg(!dbgOn); };
$('dbgNext').onclick=function(){ dbgSend('next'); };
$('dbgFree').onclick=function(){ dbgSend('free'); };
$('dbgOff').onclick=function(){ setDbg(false); };
window.addEventListener('message',function(e){ var d=e.data; if(!d||e.source!==$('frame').contentWindow||!dbgOn) return;
  if(d.ffbhStep) dbgShow(d.ffbhStep);
  else if(d.ffbhStepEnd){ clearTimeout(dbgT); dbgUnlight(); dbgBtns(false); dbgSay(T('끝났어요 · 다음 이벤트(누르기·키·시간)를 기다려요')); } });
function setRun(st){ runState=st; $('runBtn').classList.toggle('on',st==='run'); $('pauseBtn').classList.toggle('on',st==='pause'); $('stopBtn').classList.toggle('on',st==='stop');
  $('pauseBtn').querySelector('.lb').textContent=st==='pause'?T('이어하기'):T('멈추기'); $('pPrev').classList.toggle('paused',st==='pause'); }
function stoppedPage(){ return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;height:100vh;display:grid;place-items:center;background:#0b0d13;color:#9aa3b5;font:15px sans-serif;text-align:center;padding:20px;box-sizing:border-box}b{color:#3fe08f}</style></head><body><div>⏹ '+T('정지했어요')+'<br><br><b>'+T('▶ 실행하기를 누르면 처음부터 다시 시작해요')+'</b></div></body></html>'; }
function showPreview(){ if(window.matchMedia('(max-width:900px)').matches&&document.body.className==='v-blocks'){ var b=document.querySelector('#seg button[data-v="prev"]'); if(b) b.click(); } else setPane('prev'); }
function refresh(force){
  if(runState==='stop'&&force!=='run'){ if($('pCode').classList.contains('on')) showCode(); return; }
  if(custom!==null){ if(force!=='run'){ dropCustom(true); } else { clearLog(); dbgReset(); $('frame').srcdoc=custom; if(runState==='pause') setRun('run'); return; } }
  checkPics();
  var prev; try{ prev=BH.build(ws,{trap:true,debug:dbgOn}); }catch(err){ console.error(err); return; }
  if(force||prev!==lastPrev){ lastPrev=prev; clearLog(); dbgReset(); $('frame').srcdoc=prev; if(runState==='pause') setRun('run'); }
  if($('pCode').classList.contains('on')) showCode();
}
/* "내 그림" blocks without a picture: warning on the block, hint toast, placeholder in the preview */
var picKey='';
function checkPics(){ var n=BH.markPics(ws), key=BH.missingPics(ws).map(function(b){ return b.id; }).join(',');
  if(n&&key!==picKey&&!loading) toast(T('그림을 고르지 않은 "내 그림" 블록이 있어요. 블록의 그림 칸을 눌러 골라 주세요'));
  picKey=key; }
/* typed HTML: the HTML code tab is always editable (a text box over the highlighted code); the preview, copy and download then use that text until the blocks change */
var custom=null, customT=null, prevCustom=null;
function setCust(on){ $('codeReset').hidden=!on; $('codeBlocks').hidden=!on; if(!on) $('codeUndo').hidden=true; }
/* typed or pasted HTML -> blocks (friendly blocks where possible, "HTML/JS 직접 쓰기" blocks for the rest) */
function toBlocks(html,auto){ html=String(html==null?'':html); if(!html.trim()||!window.BHX) return false; var tries=[function(){ return BHX.convert(html); },function(){ return BHX.fallback(html); }], c=null, how=0;
  for(var i=0;i<tries.length&&!c;i++){ try{ var r=tries[i](); how=i; loadXML(r.xml); arrange(); if(ws.getAllBlocks(false).length<2) throw new Error('empty'); c=r; }catch(e){ console.error(e); } }
  if(!c){ if(custom===null){ custom=html; $('codeEdit').value=html; setCust(true); } toast(T('블록으로 바꾸지 못했어요. HTML 코드 그대로 두었어요')); return false; }
  prevCustom=html; $('projName').value=$('projName').value||c.title; $('codeUndo').hidden=false; save();
  toast(how?T('블록으로 바꾸기 어려운 부분은 직접 쓰기 블록에 넣었어요'):F('블록 {0}개 · 직접 쓰기 {1}개로 바꿨어요',c.stats.blocks,c.stats.raw+c.stats.rawHtml)); return true; }
function finalHTML(){ return custom!==null?custom:BH.build(ws,{trap:false}); }
function showCode(){ if(custom!==null) return; var v=finalHTML(), ta=$('codeEdit');
  if(v.length>BIGCODE){ var cut=v.slice(0,40000)+'\n\n'+F('… 큰 코드라 앞부분 {0}글자만 보여 줘요. 미리보기·복사·내려받기는 전체 {1}글자를 써요 …',40000,v.length); if(ta.value!==cut) ta.value=cut; ta.readOnly=true; return; }
  ta.readOnly=false; if(ta.value!==v) ta.value=v; }
function dropCustom(msg){ if(custom==null) return; custom=null; clearTimeout(customT); $('codeEdit').readOnly=false; setCust(false); $('codeNote').hidden=false; if(msg) toast(T('직접 쓴 HTML은 지웠어요. 블록 코드로 돌아왔어요')); }
var pasting=false, BIGCODE=500000, MAXCODE=2500*1024;
/* too big for the text box to show without freezing: keep all of it for the preview, copy and download, and show only the start (read only) */
function bigView(full){ var ta=$('codeEdit'); custom=full; ta.value=full.slice(0,40000)+'\n\n'+F('… 큰 코드라 앞부분 {0}글자만 보여 줘요. 미리보기·복사·내려받기는 전체 {1}글자를 써요 …',40000,full.length); ta.readOnly=true; ta.style.visibility=''; setCust(true); }
function ta0Big(t){ return t.readOnly&&custom!==null&&!pasting; }
$('codeEdit').addEventListener('input',function(){ if(pasting) return; var v=$('codeEdit').value; custom=v; setCust(true); clearTimeout(customT);
  customT=setTimeout(function(){ var t=$('codeEdit').value; if(runState==='stop') setRun('run'); clearLog(); dbgReset(); $('frame').srcdoc=t; },Math.min(3000,500+Math.round(v.length/400))); });
/* a big paste freezes the page when the text box lays out all of it at once: while it is put in piece by piece (one piece per frame, box hidden so nothing is laid out) the page keeps answering, then the preview refreshes once */
$('codeEdit').addEventListener('paste',function(e){ var cd=e.clipboardData, text=cd&&cd.getData('text'); if(text&&text.length<60000){ var self=this; setTimeout(function(){ if(!self.readOnly&&/<\s*(html|body|div|script|p|h1|button)\b/i.test(text)&&text.length>=40) { $('codeEdit').dispatchEvent(new Event('input')); toBlocks($('codeEdit').value,true); } },60); return; } if(!text) return; if(text.length>MAXCODE){ e.preventDefault(); toast(T('코드가 너무 커요. 2,500KB까지 붙여넣을 수 있어요')); return; } if(ta0Big(this)){ e.preventDefault(); toast(T('큰 코드는 여기서 고칠 수 없어요. 아래 되돌리기를 누른 뒤 새로 붙여 넣어 주세요')); return; }
  e.preventDefault(); var ta=this, pos=0, CH=200000, n=text.length, v=ta.value, s0=ta.selectionStart, e0=ta.selectionEnd, parts=[v.slice(0,s0)];
  pasting=true; clearTimeout(customT); ta.readOnly=true; ta.style.visibility='hidden';
  (function step(){ parts.push(text.slice(pos,pos+CH)); pos+=CH;
    if(pos<n){ toast(F('큰 코드를 불러오는 중… {0}%',Math.round(pos/n*100))); requestAnimationFrame(step); return; }
    parts.push(v.slice(e0)); toast(F('큰 코드를 불러오는 중… {0}%',100));
    setTimeout(function(){ var full=parts.join('');
      if(full.length>BIGCODE){ pasting=false; bigView(full); if(runState==='stop') setRun('run'); clearLog(); dbgReset(); $('frame').srcdoc=full; toast(F('큰 코드 {0}KB를 불러왔어요',Math.round(full.length/1024))); setTimeout(function(){ toBlocks(full,true); },400); return; }
      ta.value=full; var at=s0+n; try{ ta.setSelectionRange(at,at); }catch(x){} ta.style.visibility=''; ta.readOnly=false; pasting=false; toast(T('큰 코드를 모두 불러왔어요')); ta.dispatchEvent(new Event('input')); toBlocks(full,true); },30); })(); });
$('codeBlocks').onclick=function(){ toBlocks(custom!==null?custom:$('codeEdit').value,false); };
$('codeUndo').onclick=function(){ if(prevCustom==null) return; var h=prevCustom; window.__bh.showHTML(h); toast(T('바꾸기를 취소하고 HTML 코드로 돌려놓았어요')); };
$('codeReset').onclick=function(){ dropCustom(false); lastPrev=''; refresh('run'); showCode(); toast(T('블록 코드로 되돌렸어요')); };
function setPane(p){ document.querySelectorAll('.stab').forEach(function(b){ b.classList.toggle('on',b.dataset.p===p); }); $('pPrev').classList.toggle('on',p==='prev'); $('pCode').classList.toggle('on',p==='code'); if(p==='code') showCode(); }
document.querySelectorAll('.stab').forEach(function(b){ b.onclick=function(){ setPane(b.dataset.p); }; });
document.querySelectorAll('#seg button').forEach(function(b){ b.onclick=function(){ var v=b.dataset.v;
  document.querySelectorAll('#seg button').forEach(function(x){ x.classList.toggle('on',x===b); });
  document.body.className='v-'+v; if(v!=='blocks') setPane(v); setTimeout(function(){ Blockly.svgResize(ws); },20); }; });
function runNow(){ setRun('run'); refresh('run'); showPreview(); }
$('rerun').onclick=runNow; $('runBtn').onclick=runNow;
$('pauseBtn').onclick=function(){ var w=$('frame').contentWindow;
  if(runState==='stop'){ runNow(); return; }
  if(runState==='pause'){ setRun('run'); if(w) w.postMessage({ffbh:'resume'},'*'); }
  else { setRun('pause'); if(w) w.postMessage({ffbh:'pause'},'*'); showPreview(); } };
$('stopBtn').onclick=function(){ setRun('stop'); lastPrev=''; clearLog(); $('frame').srcdoc=stoppedPage(); };
setRun('run');
/* ---------- 변수 보기: the variables' values while the preview runs (the preview build sends them, see BH.build) ---------- */
var varOn=lsGet('ffblocks.vars')==='1', varPrev={}, varT=null;
function varMsg(t){ var box=$('varList'), n=document.createElement('span'); box.innerHTML=''; n.className='none'; n.textContent=t; box.appendChild(n); }
function varShow(list){ var box=$('varList'), now={}; box.innerHTML='';
  list.forEach(function(v){ now[v[0]]=v[1]; var sp=document.createElement('span'); if(varPrev[v[0]]!==undefined&&varPrev[v[0]]!==v[1]) sp.className='ch';
    var nb=document.createElement('b'); nb.textContent=v[0]+' = '; sp.appendChild(nb); sp.appendChild(document.createTextNode(v[1]===''?T('(비어 있음)'):v[1])); box.appendChild(sp); });
  if(!list.length) varMsg(T('변수가 없어요'));
  varPrev=now; clearTimeout(varT); varT=setTimeout(function(){ box.querySelectorAll('.ch').forEach(function(x){ x.classList.remove('ch'); }); },450); }
function varAsk(){ var w=$('frame').contentWindow; if(w) try{ w.postMessage({ffbhVarsAsk:1},'*'); }catch(e){} }
function varReset(){ varPrev={}; varMsg(runState==='stop'?T('정지했어요'):custom!==null?T('직접 고친 HTML에서는 변수를 볼 수 없어요'):T('변수가 없어요')); }
function setVar(on){ varOn=on; $('varBtn').classList.toggle('on',on); $('varBar').hidden=!on; lsSet('ffblocks.vars',on?'1':'0'); if(on){ varReset(); varAsk(); } }
$('varBtn').onclick=function(){ setVar(!varOn); if(varOn) showPreview(); };
$('frame').addEventListener('load',function(){ varReset(); varAsk(); });
window.addEventListener('message',function(e){ var d=e.data; if(!d||!d.ffbhVars||e.source!==$('frame').contentWindow) return; varShow(d.ffbhVars); });
setVar(varOn);
$('openTab').onclick=function(){ var u=URL.createObjectURL(new Blob([finalHTML()],{type:'text/html'})); var w=window.open(u,'_blank'); if(!w) location.href=u; setTimeout(function(){ URL.revokeObjectURL(u); },60000); };
$('copyCode').onclick=function(){ var t=finalHTML(); var done=function(){ toast(T('코드를 복사했어요')); };
  try{ navigator.clipboard.writeText(t).then(done,function(){ fallbackCopy(t); done(); }); }catch(e){ fallbackCopy(t); done(); } };
function fallbackCopy(t){ var a=document.createElement('textarea'); a.value=t; document.body.appendChild(a); a.select(); try{ document.execCommand('copy'); }catch(e){} a.remove(); }

/* ---------- files ---------- */
function fname(ext){ return (($('projName').value||'').trim()||'page').replace(/[\\/:*?"<>|]/g,'_')+ext; }
function download(blob,name){ var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },4000); }
function downloadHTML(){ download(new Blob([finalHTML()],{type:'text/html;charset=utf-8'}),fname('.html')); toast(T('HTML 파일을 만들었어요')); }
$('dlBtn').onclick=downloadHTML;
/* ---------- projects: several saved projects in the browser ---------- */
var PIDX='ffblocks.projects', PK='ffblocks.p.', P={cur:null,list:[]}, saveT=null, fullWarned=false;
function readIdx(){ try{ var o=JSON.parse(lsGet(PIDX)||'null'); if(o&&Array.isArray(o.list)) return o; }catch(e){} return null; }
function writeIdx(){ return lsSet(PIDX,JSON.stringify(P)); }
function pid(){ return 'p'+Date.now().toString(36)+Math.floor(Math.random()*1296).toString(36); }
function entry(id){ return P.list.filter(function(x){ return x.id===id; })[0]; }
function readProj(id){ try{ return JSON.parse(lsGet(PK+id)||'null'); }catch(e){ return null; } }
function snapshot(){ return {name:$('projName').value,ws:Blockly.serialization.workspaces.save(ws),imgs:BH.IMGS,snds:BH.SNDS}; }
function saveNow(){ clearTimeout(saveT); if(!P.cur) return; var d=snapshot(), ok=lsSet(PK+P.cur,JSON.stringify(d)), e=entry(P.cur); if(e){ e.name=d.name; e.t=Date.now(); } writeIdx();
  if(!ok&&!fullWarned){ fullWarned=true; toast(T('저장 공간이 꽉 찼어요. 프로젝트 파일로 저장해 두세요')); } if(ok) fullWarned=false; return ok; }
function save(){ clearTimeout(saveT); saveT=setTimeout(saveNow,300); }
window.addEventListener('pagehide',function(){ saveNow(); });
document.addEventListener('visibilitychange',function(){ if(document.hidden) saveNow(); });
function setSnds(o){ var S=BH.SNDS; Object.keys(S).forEach(function(k){ delete S[k]; }); if(o&&typeof o==='object') Object.keys(o).forEach(function(k){ var m=o[k]; if(m&&typeof m.data==='string'&&/^data:audio\//.test(m.data)) S[k]={name:k,data:m.data}; }); }
/* mp3 / sound files for the "내 소리" block: the block's dropdown has a "＋ mp3 파일 넣기" entry that opens this picker */
var sndIn=document.createElement('input'); sndIn.type='file'; sndIn.accept='audio/*,.mp3,.wav,.ogg,.m4a'; sndIn.hidden=true; document.body.appendChild(sndIn);
BH.pickSound=function(field){ sndIn.value=''; sndIn.onchange=function(){ var f=sndIn.files&&sndIn.files[0]; if(!f) return;
  if(f.size>5*1024*1024){ toast(T('소리 파일이 너무 커요. 5MB보다 작은 파일을 골라 주세요')); return; }
  var r=new FileReader(); r.onload=function(){ var data=String(r.result); if(!/^data:audio\//.test(data)) data=data.replace(/^data:[^;,]*/,'data:audio/mpeg');
    var base=f.name.replace(/\.[^.]+$/,'').slice(0,24)||T('소리'), name=base, k=2; while(BH.SNDS[name]) name=base+k++;
    BH.SNDS[name]={name:name,data:data}; if(field&&field.setValue) field.setValue(name); save(); toast(T('소리 파일을 넣었어요')); refresh(true); };
  r.readAsDataURL(f); }; sndIn.click(); };
function setImgs(o){ var I=BH.IMGS; Object.keys(I).forEach(function(k){ delete I[k]; }); if(o&&typeof o==='object') Object.keys(o).forEach(function(k){ var m=o[k]; if(m&&typeof m.data==='string'&&/^data:image\//.test(m.data)) I[k]=m; }); setTimeout(regenThumbs,0); }
$('projName').addEventListener('input',save);
$('projName').addEventListener('keydown',function(e){ if(e.key==='Enter') this.blur(); });
function blank(){ loadJSON({blocks:{languageVersion:0,blocks:[{type:'page_root',x:30,y:30,fields:{TITLE:T('나의 웹페이지'),BG:'#ffffff',CENTER:true},inputs:{BODY:{block:{type:'el_heading',fields:{SIZE:'h1',TEXT:T('안녕하세요'),NAME:T('제목')+'1'}}}}}]}}); }
function uniqProj(base){ base=(base||T('나의 웹페이지')).trim().slice(0,40)||T('나의 웹페이지'); var names=P.list.map(function(x){ return x.name; }); if(names.indexOf(base)<0) return base; var b=base.replace(/\s*\d+$/,''), k=2; while(names.indexOf(b+' '+k)>=0) k++; return b+' '+k; }
function createProject(name,loader){ saveNow(); var id=pid(), nm=uniqProj(name); P.cur=id; P.list.unshift({id:id,name:nm,t:Date.now()}); $('projName').value=nm; setImgs(null); setSnds(null); loader(); ws.clearUndo(); saveNow(); syncBar(); renderProjs(); }
function switchTo(id){ if(id===P.cur) return; saveNow(); var d=readProj(id), e=entry(id);
  if(!d||!d.ws){ P.list=P.list.filter(function(x){ return x.id!==id; }); writeIdx(); renderProjs(); toast(T('이 프로젝트는 열 수 없어요')); return; }
  P.cur=id; $('projName').value=d.name||(e&&e.name)||T('나의 웹페이지'); setImgs(d.imgs); setSnds(d.snds); try{ loadJSON(d.ws); }catch(err){ console.error(err); blank(); } ws.clearUndo(); writeIdx(); syncBar(); renderProjs(); }
function deleteProject(id){ var e=entry(id); if(!e) return;
  ask(F('"{0}" 프로젝트를 삭제할까요? 되돌릴 수 없어요.',e.name),T('삭제'),true).then(function(ok){ if(!ok) return;
    try{ localStorage.removeItem(PK+id); localStorage.removeItem('ffblocks.ai.'+id); }catch(err){} P.list=P.list.filter(function(x){ return x.id!==id; });
    if(id===P.cur){ P.cur=null; var nx=P.list.slice().sort(function(a,b){ return b.t-a.t; })[0];
      if(nx){ writeIdx(); switchTo(nx.id); } else createProject(T('나의 웹페이지'),blank); }
    writeIdx(); renderProjs(); toast(T('프로젝트를 삭제했어요')); }); }
function ask(msg,okText,danger){ return new Promise(function(res){ var dlg=$('askDlg'), ok=$('askOk'), no=$('askNo'); $('askMsg').textContent=msg; ok.textContent=okText||T('확인'); ok.className='tbtn '+(danger?'dang':'pri'); dlg.classList.add('open');
  function done(v){ dlg.classList.remove('open'); ok.onclick=no.onclick=null; res(v); } ok.onclick=function(){ done(true); }; no.onclick=function(){ done(false); }; setTimeout(function(){ no.focus(); },30); }); }
function renderProjs(){ var box=$('projList'); if(!$('projDlg').classList.contains('open')) return; box.innerHTML='';
  P.list.slice().sort(function(a,b){ return b.t-a.t; }).forEach(function(e){ var d=document.createElement('div'), cur=e.id===P.cur; d.className='prow'+(cur?' cur':'');
    d.innerHTML='<input data-notr spellcheck="false" aria-label=""><div class="pm"></div><div class="pbt"><button data-a="open"></button><button data-a="del" class="dang"></button></div>';
    var inp=d.querySelector('input'); inp.value=e.name; inp.setAttribute('aria-label',T('프로젝트 이름'));
    d.querySelector('.pm').textContent=(cur?T('지금 여는 중')+' · ':'')+new Date(e.t).toLocaleString(FFT.lang||'ko',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
    var ob=d.querySelector('[data-a=open]'); ob.textContent=cur?T('닫기'):T('열기'); d.querySelector('[data-a=del]').textContent=T('삭제');
    inp.onchange=function(){ var v=(this.value||'').trim().slice(0,40)||e.name; e.name=v; this.value=v; if(cur){ $('projName').value=v; saveNow(); } else { var dd=readProj(e.id); if(dd){ dd.name=v; lsSet(PK+e.id,JSON.stringify(dd)); } writeIdx(); } };
    inp.onkeydown=function(ev){ if(ev.key==='Enter') this.blur(); };
    d.querySelector('.pbt').onclick=function(ev){ var a=ev.target.dataset.a; if(a==='open'){ if(!cur) switchTo(e.id); $('projDlg').classList.remove('open'); } else if(a==='del') deleteProject(e.id); };
    box.appendChild(d); }); }
function openProjs(){ $('projDlg').classList.add('open'); renderProjs(); }
$('projBtn').onclick=openProjs;
$('projNew').onclick=function(){ createProject(T('나의 웹페이지'),blank); $('projDlg').classList.remove('open'); toast(T('새 프로젝트를 만들었어요')); };
$('fileMenu').addEventListener('click',function(e){
  var b=e.target.closest('[data-f]'); if(!b) return; closeMenus(); var f=b.dataset.f;
  if(f==='projects') openProjs();
  else if(f==='new'){ createProject(T('나의 웹페이지'),blank); toast(T('새 프로젝트를 만들었어요')); }
  else if(f==='save'){ download(new Blob([JSON.stringify({app:'block-html',v:1,name:$('projName').value,ws:Blockly.serialization.workspaces.save(ws),imgs:BH.IMGS,snds:BH.SNDS},null,1)],{type:'application/json'}),fname('.json')); }
  else if(f==='open') $('fileIn').click();
  else if(f==='html') downloadHTML();
});
$('fileIn').addEventListener('change',function(){
  var file=this.files&&this.files[0]; this.value=''; if(!file) return;
  var r=new FileReader(); r.onload=function(){ try{ var o=JSON.parse(r.result); if(!o.ws) throw 0; var nm=o.name||file.name.replace(/\.json$/i,'');
    createProject(nm,function(){ setImgs(o.imgs); setSnds(o.snds); loadJSON(o.ws); }); toast(T('프로젝트를 열었어요')); }catch(e){ console.error(e); toast(T('이 파일은 열 수 없어요')); } };
  r.readAsText(file);
});

/* ---------- examples ---------- */
var exMenu=$('exMenu');
BH_EXAMPLES.forEach(function(ex,i){ var b=document.createElement('button'); b.innerHTML='<span></span><small></small>'; b.firstChild.textContent=T(ex.name); b.lastChild.textContent=T(ex.desc);
  b.onclick=function(){ closeMenus(); createProject(T(ex.name),function(){ loadXML(ex.xml()); arrange(); }); toast(T('새 프로젝트로 열었어요')); }; exMenu.appendChild(b); });

/* ---------- menus ---------- */
function openMenu(m,anchor){ var was=m.classList.contains('open'); closeMenus(); if(was) return; m.classList.add('open');
  var r=anchor.getBoundingClientRect(), w=m.offsetWidth; m.style.left=Math.max(8,Math.min(r.right-w,innerWidth-w-8))+'px'; m.style.top=(r.bottom+6)+'px'; }
function closeMenus(){ document.querySelectorAll('.menu.open').forEach(function(m){ m.classList.remove('open'); }); }
$('exBtn').onclick=function(){ openMenu(exMenu,this); };
$('fileBtn').onclick=function(){ openMenu($('fileMenu'),this); };
document.addEventListener('pointerdown',function(e){ if(!e.target.closest('.menu,#exBtn,#fileBtn')) closeMenus(); },true);
document.querySelectorAll('.ov [data-close]').forEach(function(b){ b.onclick=function(){ b.closest('.ov').classList.remove('open'); }; });
var tt=null; function toast(s){ var t=$('toast'); t.textContent=s; t.classList.add('on'); clearTimeout(tt); tt=setTimeout(function(){ t.classList.remove('on'); },1800); }
window.addEventListener('resize',function(){ Blockly.svgResize(ws); });

/* ---------- 내 그림: drawing pad, photos, manager ---------- */
var I=BH.IMGS;
function uniqName(base,skip){ base=(base||T('그림')).trim().slice(0,30)||T('그림'); var names=Object.keys(I).filter(function(k){ return k!==skip; }).map(function(k){ return I[k].name; }); if(names.indexOf(base)<0) return base; var b=base.replace(/\d+$/,''), k=2; while(names.indexOf(b+k)>=0) k++; return b+k; }
function thumbOf(img,w,h){ var k=Math.min(1,88/Math.max(w,h)), c=document.createElement('canvas'); c.width=Math.max(1,Math.round(w*k)); c.height=Math.max(1,Math.round(h*k)); var g=c.getContext('2d'); g.drawImage(img,0,0,c.width,c.height); g.strokeStyle='rgba(120,130,150,.9)'; g.lineWidth=1; g.strokeRect(.5,.5,c.width-1,c.height-1); return c.toDataURL('image/png'); }
function putImage(id,name,data,w,h,src){ I[id]={name:name,data:data,w:w,h:h,thumb:thumbOf(src,w,h),ol:1}; }
function regenThumbs(){ var todo=Object.keys(I).filter(function(k){ return !I[k].ol; }), left=todo.length; if(!left) return; // older saved pictures get the thin outline too
  todo.forEach(function(k){ var m=I[k], im=new Image(); im.onload=function(){ try{ m.thumb=thumbOf(im,m.w||im.width,m.h||im.height); m.ol=1; }catch(e){} if(!--left) afterImgChange(); }; im.onerror=function(){ m.ol=1; if(!--left) afterImgChange(); }; im.src=m.data; }); }
function usedBy(id){ return ws.getAllBlocks(false).filter(function(b){ return b.getField&&b.getField('IMG')&&b.getFieldValue('IMG')===id; }); }
function afterImgChange(){ ws.getAllBlocks(false).forEach(function(b){ var f=b.getField&&b.getField('IMG'); if(f){ var v=f.getValue(); if(f.getOptions) f.getOptions(false); f.setValue(v); if(f.forceRerender) f.forceRerender(); } }); var tb=ws.getToolbox(); if(tb&&tb.refreshSelection) tb.refreshSelection(); refresh(true); save(); }
function addToPage(id){
  Blockly.Events.setGroup(true);
  try{
    var b=ws.newBlock('el_picture'); b.setFieldValue(id,'IMG'); b.initSvg(); b.render();
    var page=ws.getTopBlocks(false).filter(function(x){ return x.type==='page_root'; })[0];
    if(page){ var inp=page.getInput('BODY'), last=inp.connection.targetBlock();
      if(!last) inp.connection.connect(b.previousConnection); else { while(last.getNextBlock()) last=last.getNextBlock(); last.nextConnection.connect(b.previousConnection); } }
    else b.moveBy(40,40);
    b.select&&b.select(); ws.centerOnBlock&&ws.centerOnBlock(b.id);
  }finally{ Blockly.Events.setGroup(false); }
}
function newId(){ return 'img'+Date.now().toString(36)+Math.floor(Math.random()*1e3); }

/* drawing pad */
var pad=$('padCv'), pg=pad.getContext('2d',{willReadFrequently:true}), PW=800, PH=600, padId=null, tool='pen', col='#111111', size=8, hist=[], drawing=null;
var SW=['#111111','#ffffff','#ef4444','#f97316','#facc15','#22c55e','#38bdf8','#3b82f6','#a855f7','#ec4899','#92400e','#9ca3af'];
$('padSw').innerHTML=SW.map(function(c){ return '<button class="sw" data-c="'+c+'" style="background:'+c+'"></button>'; }).join('')+'<label class="sw pick" title=""><input type="color" id="padPick" value="#ff8a3d"></label>';
function setCol(c){ col=c; tool=tool==='eraser'?'pen':tool; document.querySelectorAll('#padSw .sw').forEach(function(b){ b.classList.toggle('on',b.dataset.c===c); }); syncTools(); }
$('padSw').addEventListener('click',function(e){ var b=e.target.closest('[data-c]'); if(b) setCol(b.dataset.c); });
$('padPick').addEventListener('input',function(){ setCol(this.value); });
function syncTools(){ document.querySelectorAll('[data-tool]').forEach(function(b){ b.classList.toggle('on',b.dataset.tool===tool); }); }
document.querySelectorAll('[data-tool]').forEach(function(b){ b.onclick=function(){ tool=b.dataset.tool; syncTools(); }; });
$('padSize').addEventListener('input',function(){ size=+this.value; $('padDot').style.width=$('padDot').style.height=Math.max(3,size)+'px'; });
function snap(){ hist.push(pg.getImageData(0,0,PW,PH)); if(hist.length>25) hist.shift(); }
$('padUndo').onclick=function(){ if(hist.length) pg.putImageData(hist.pop(),0,0); };
$('padClear').onclick=function(){ snap(); pg.clearRect(0,0,PW,PH); };
$('padBg').addEventListener('change',function(){ $('padWrap').classList.toggle('clear',this.checked); lsSet('ffblocks.padclear',this.checked?'1':'0'); });
function pt(e){ var r=pad.getBoundingClientRect(); return {x:(e.clientX-r.left)*PW/r.width, y:(e.clientY-r.top)*PH/r.height, p:e.pointerType==='pen'&&e.pressure?Math.max(.25,e.pressure*1.6):1}; }
function stroke(a,b){ pg.save(); pg.globalCompositeOperation=tool==='eraser'?'destination-out':'source-over'; pg.strokeStyle=col; pg.fillStyle=col; pg.lineCap='round'; pg.lineJoin='round';
  pg.lineWidth=size*(tool==='eraser'?2:1)*b.p; pg.beginPath(); pg.moveTo(a.x,a.y); pg.lineTo(b.x,b.y); pg.stroke(); pg.restore(); }
pad.addEventListener('pointerdown',function(e){ if(drawing) return; e.preventDefault(); pad.setPointerCapture(e.pointerId); snap(); var p=pt(e);
  if(tool==='fill'){ flood(p.x|0,p.y|0); return; }
  drawing={id:e.pointerId,last:p}; stroke(p,{x:p.x+.01,y:p.y,p:p.p}); });
pad.addEventListener('pointermove',function(e){ if(!drawing||e.pointerId!==drawing.id) return; e.preventDefault(); var evs=e.getCoalescedEvents?e.getCoalescedEvents():[e]; (evs.length?evs:[e]).forEach(function(ev){ var p=pt(ev); stroke(drawing.last,p); drawing.last=p; }); });
['pointerup','pointercancel'].forEach(function(t){ pad.addEventListener(t,function(e){ if(drawing&&e.pointerId===drawing.id) drawing=null; }); });
function flood(x,y){
  var d=pg.getImageData(0,0,PW,PH), a=d.data, i0=(y*PW+x)*4, t=[a[i0],a[i0+1],a[i0+2],a[i0+3]];
  var h=col.replace('#',''), f=[parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16),255];
  if(t[0]===f[0]&&t[1]===f[1]&&t[2]===f[2]&&t[3]===255) return;
  var same=function(i){ return Math.abs(a[i]-t[0])+Math.abs(a[i+1]-t[1])+Math.abs(a[i+2]-t[2])+Math.abs(a[i+3]-t[3])<90; }, st=[x,y];
  while(st.length){ var yy=st.pop(), xx=st.pop(), i=(yy*PW+xx)*4; if(xx<0||yy<0||xx>=PW||yy>=PH||!same(i)) continue;
    var l=xx, r=xx; while(l>0&&same((yy*PW+l-1)*4)) l--; while(r<PW-1&&same((yy*PW+r+1)*4)) r++;
    for(var k=l;k<=r;k++){ var j=(yy*PW+k)*4; a[j]=f[0]; a[j+1]=f[1]; a[j+2]=f[2]; a[j+3]=255; if(yy>0&&same(j-PW*4)) st.push(k,yy-1); if(yy<PH-1&&same(j+PW*4)) st.push(k,yy+1); } }
  pg.putImageData(d,0,0);
}
function openPad(id){
  padId=id||null; hist=[]; pg.clearRect(0,0,PW,PH); $('padName').value=id?I[id].name:uniqName(T('내 그림')); var wantClear=!id&&lsGet('ffblocks.padclear')==='1'; $('padBg').checked=wantClear; $('padWrap').classList.toggle('clear',wantClear);
  tool='pen'; syncTools(); setCol(col);
  if(id){ var im=new Image(); im.onload=function(){ var k=Math.min(PW/im.width,PH/im.height,1), w=im.width*k, h=im.height*k; pg.drawImage(im,(PW-w)/2,(PH-h)/2,w,h); }; im.src=I[id].data; $('padBg').checked=!!I[id].clear; $('padWrap').classList.toggle('clear',!!I[id].clear); }
  $('padDlg').classList.add('open');
}
$('padSave').onclick=function(){
  var clear=$('padBg').checked, d=pg.getImageData(0,0,PW,PH).data, x0=PW, y0=PH, x1=-1, y1=-1;
  for(var y=0;y<PH;y++) for(var x=0;x<PW;x++) if(d[(y*PW+x)*4+3]>8){ if(x<x0) x0=x; if(x>x1) x1=x; if(y<y0) y0=y; if(y>y1) y1=y; }
  if(x1<0){ toast(T('그림이 비어 있어요')); return; }
  if(clear){ x0=Math.max(0,x0-6); y0=Math.max(0,y0-6); x1=Math.min(PW-1,x1+6); y1=Math.min(PH-1,y1+6); } else { x0=0; y0=0; x1=PW-1; y1=PH-1; }
  var w=x1-x0+1, h=y1-y0+1, c=document.createElement('canvas'); c.width=w; c.height=h; var g=c.getContext('2d');
  if(!clear){ g.fillStyle='#ffffff'; g.fillRect(0,0,w,h); } g.drawImage(pad,x0,y0,w,h,0,0,w,h);
  var isNew=!padId, id=padId||newId(); putImage(id,uniqName($('padName').value,id),c.toDataURL('image/png'),w,h,c); I[id].clear=clear;
  $('padDlg').classList.remove('open'); if(isNew) addToPage(id); afterImgChange(); renderMgr(); toast(isNew?T('그림을 페이지에 넣었어요'):T('그림을 고쳤어요'));
};

/* photos */
$('photoIn').addEventListener('change',function(){
  var file=this.files&&this.files[0]; this.value=''; if(!file) return;
  var url=URL.createObjectURL(file), im=new Image();
  im.onload=function(){ URL.revokeObjectURL(url);
    var k=Math.min(1,1024/Math.max(im.width,im.height)), w=Math.max(1,Math.round(im.width*k)), h=Math.max(1,Math.round(im.height*k)), c=document.createElement('canvas'); c.width=w; c.height=h; var g=c.getContext('2d'); g.drawImage(im,0,0,w,h);
    var alpha=false; if(/png|gif|webp/.test(file.type)){ var d=g.getImageData(0,0,w,h).data; for(var i=3;i<d.length;i+=4*7) if(d[i]<250){ alpha=true; break; } }
    var data=alpha?c.toDataURL('image/png'):c.toDataURL('image/jpeg',0.84), id=newId();
    putImage(id,uniqName(file.name.replace(/\.[^.]+$/,'')),data,w,h,c); addToPage(id); afterImgChange(); renderMgr(); toast(T('사진을 페이지에 넣었어요')); };
  im.onerror=function(){ URL.revokeObjectURL(url); toast(T('이 사진은 열 수 없어요')); };
  im.src=url;
});

/* manager */
function renderMgr(){
  var ids=Object.keys(I), box=$('mgrList');
  if(!ids.length){ box.innerHTML='<div class="empty">'+T('아직 그림이 없어요. 그림을 그리거나 사진을 넣어 보세요.')+'</div>'; return; }
  box.innerHTML=''; ids.forEach(function(id){ var m=I[id], d=document.createElement('div'); d.className='pic';
    d.innerHTML='<div class="th'+(m.clear?' clear':'')+'"><img alt=""></div><input data-notr spellcheck="false"><div class="pa"><button data-a="add">'+T('넣기')+'</button>'+(/png/.test(m.data.slice(0,15))?'<button data-a="edit">'+T('고치기')+'</button>':'')+'<button data-a="del" class="dang">'+T('삭제')+'</button></div>';
    d.querySelector('img').src=m.thumb||m.data; var inp=d.querySelector('input'); inp.value=m.name;
    inp.onchange=function(){ m.name=uniqName(this.value,id); this.value=m.name; afterImgChange(); };
    d.querySelector('.pa').onclick=function(e){ var a=e.target.dataset.a; if(!a) return;
      if(a==='add'){ addToPage(id); $('mgrDlg').classList.remove('open'); }
      if(a==='edit'){ $('mgrDlg').classList.remove('open'); openPad(id); }
      if(a==='del'){ var u=usedBy(id), go=function(){ delete I[id]; afterImgChange(); renderMgr(); }; if(u.length) ask(F('이 그림을 쓰는 블록이 {0}개 있어요. 그래도 지울까요?',u.length),T('삭제'),true).then(function(ok){ if(ok) go(); }); else go(); } };
    box.appendChild(d); });
}
ws.registerButtonCallback('imgDraw',function(){ openPad(null); });
ws.registerButtonCallback('imgPhoto',function(){ $('photoIn').click(); });
ws.registerButtonCallback('imgManage',function(){ renderMgr(); $('mgrDlg').classList.add('open'); });
$('mgrDraw').onclick=function(){ $('mgrDlg').classList.remove('open'); openPad(null); };
$('mgrPhoto').onclick=function(){ $('photoIn').click(); };
/* ---------- edit bar: copy, paste, undo, redo, delete all ---------- */
var CLIP='ffblocks.clip';
function copyBlock(b){ b=b||Blockly.getSelected(); if(!b||!b.isDeletable||b.isShadow()){ toast(T('먼저 복사할 블록을 눌러 고르세요')); return; }
  var st=Blockly.serialization.blocks.save(b,{addCoordinates:true,addNextBlocks:false,saveIds:false}); lsSet(CLIP,JSON.stringify(st)); window.__clip=st; pasteN=0; syncBar(); toast(T('블록을 복사했어요')); }
var pasteN=0;
function pasteBlock(){ var st=window.__clip; if(!st){ try{ st=JSON.parse(lsGet(CLIP)||'null'); }catch(e){} } if(!st){ toast(T('복사한 블록이 없어요')); return; }
  pasteN++; st=JSON.parse(JSON.stringify(st));
  var m=ws.getMetricsManager().getViewMetrics(true), x=st.x!=null?st.x+30*pasteN:m.left+60, y=st.y!=null?st.y+30*pasteN:m.top+60;
  if(x<m.left||x>m.left+m.width-80||y<m.top||y>m.top+m.height-60){ x=m.left+60+((pasteN*30)%180); y=m.top+60+((pasteN*30)%180); }
  st.x=x; st.y=y; Blockly.Events.setGroup(true); var nb; try{ nb=Blockly.serialization.blocks.append(st,ws,{recordUndo:true}); }finally{ Blockly.Events.setGroup(false); } if(nb&&nb.select) nb.select(); }
function deleteAll(){ var tops=ws.getTopBlocks(false); if(!tops.length) return; ask(T('블록을 모두 지울까요? 되돌리기로 다시 살릴 수 있어요.'),T('모두 지우기'),true).then(function(ok){ if(ok) doDeleteAll(); }); }
function doDeleteAll(){ var tops=ws.getTopBlocks(false);
  tops.sort(function(a,b){ return (a.type==='page_root')-(b.type==='page_root'); }); // pages go last so undo brings them back first
  Blockly.Events.setGroup(true); try{ tops.forEach(function(b){ b.dispose(false); }); }finally{ Blockly.Events.setGroup(false); } toast(T('블록을 모두 지웠어요')); }
function syncBar(){ var sel=Blockly.getSelected(); $('ebCopy').disabled=!(sel&&!sel.isShadow()); $('ebUndo').disabled=!ws.getUndoStack().length; $('ebRedo').disabled=!ws.getRedoStack().length; }
$('ebCopy').onclick=function(){ copyBlock(); };
$('ebPaste').onclick=pasteBlock;
$('ebUndo').onclick=function(){ ws.undo(false); syncBar(); };
$('ebRedo').onclick=function(){ ws.undo(true); syncBar(); };
$('ebDel').onclick=deleteAll;
$('ebTidy').onclick=function(){ arrange(); setTimeout(function(){ ws.scrollCenter(); },30); toast(T('블록을 정리했어요')); };
$('ebCenter').onclick=function(){ ws.scrollCenter(); };
$('ebSearch').onclick=openSearch;
ws.addChangeListener(function(e){ if(e.type===Blockly.Events.SELECTED||!e.isUiEvent) setTimeout(syncBar,0); });
// keep the selection when a bar button is pressed on touch screens
document.getElementById('editBar').addEventListener('pointerdown',function(e){ e.stopPropagation(); });
// Ctrl/Cmd+C and V use the same clipboard as the buttons
document.addEventListener('keydown',function(e){ if(!(e.ctrlKey||e.metaKey)||e.altKey) return; var t=e.target; if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable)) return;
  if(Blockly.WidgetDiv.isVisible()||Blockly.DropDownDiv.isVisible()) return; var k=e.key.toLowerCase();
  if(k==='c'&&Blockly.getSelected()){ e.preventDefault(); e.stopImmediatePropagation(); copyBlock(); }
  else if(k==='v'){ e.preventDefault(); e.stopImmediatePropagation(); pasteBlock(); } },true);
// long-press / right-click menus
var REG=Blockly.ContextMenuRegistry.registry;
['blockCopyToStorage','blockPasteFromStorage'].forEach(function(id){ try{ REG.unregister(id); }catch(e){} });
REG.register({id:'ffCopy',scopeType:Blockly.ContextMenuRegistry.ScopeType.BLOCK,weight:-1,displayText:function(){ return T('복사'); },
  preconditionFn:function(sc){ return sc.block&&!sc.block.isShadow()?'enabled':'hidden'; },callback:function(sc){ copyBlock(sc.block); }});
REG.register({id:'ffPaste',scopeType:Blockly.ContextMenuRegistry.ScopeType.WORKSPACE,weight:-1,displayText:function(){ return T('붙여넣기'); },
  preconditionFn:function(){ return window.__clip||lsGet(CLIP)?'enabled':'disabled'; },callback:pasteBlock});
REG.register({id:'ffDelAll',scopeType:Blockly.ContextMenuRegistry.ScopeType.WORKSPACE,weight:20,displayText:function(){ return T('전체 삭제'); },
  preconditionFn:function(sc){ return sc.workspace.getTopBlocks(false).length?'enabled':'disabled'; },callback:deleteAll});
try{ REG.unregister('workspaceDelete'); }catch(e){}

/* ---------- block search ---------- */
var CAT=null;
function catalog(){ if(CAT) return CAT; CAT=[]; var seen={}, hw=new Blockly.Workspace();
  BH.toolbox().contents.forEach(function(cat){ if(cat.kind!=='category'||!cat.contents) return;
    cat.contents.forEach(function(it){ if(it.kind!=='block') return; var st={type:it.type}; if(it.inputs) st.inputs=it.inputs; if(it.fields) st.fields=it.fields; if(it.extraState) st.extraState=it.extraState;
      var key=JSON.stringify(st); if(seen[key]) return; seen[key]=1;
      try{ var b=Blockly.serialization.blocks.append(st,hw), tip=typeof b.tooltip==='string'?b.tooltip:'', txt=b.toString(90).replace(/\s+/g,' ');
        CAT.push({st:st,text:txt,cat:cat.name,tip:tip,color:b.getColour(),hay:(txt+' '+cat.name+' '+tip+' '+it.type).toLowerCase()}); }catch(e){} }); });
  try{ hw.dispose(); }catch(e){} return CAT; }
function insertBlock(st){ var m=ws.getMetricsManager().getViewMetrics(true), n=(insertBlock.n=(insertBlock.n||0)+1)%6, c=JSON.parse(JSON.stringify(st));
  c.x=m.left+m.width/2-80+n*28; c.y=m.top+m.height/3+n*28; Blockly.Events.setGroup(true); var nb; try{ nb=Blockly.serialization.blocks.append(c,ws,{recordUndo:true}); }finally{ Blockly.Events.setGroup(false); } if(nb&&nb.select) nb.select(); }
function renderSearch(){ var q=($('srchQ').value||'').trim().toLowerCase(), box=$('srchList'), words=q.split(/\s+/).filter(Boolean), list=catalog();
  var hit=list.filter(function(c){ return words.every(function(w){ return c.hay.indexOf(w)>=0; }); }).slice(0,40);
  box.innerHTML=''; if(!hit.length){ box.innerHTML='<div class="empty"></div>'; box.firstChild.textContent=T('찾는 블록이 없어요. 다른 낱말로 찾아 보세요.'); return; }
  hit.forEach(function(c){ var b=document.createElement('button'); b.className='srow'; b.innerHTML='<i></i><span></span><small></small>'; b.firstChild.style.background=c.color; b.children[1].textContent=c.text; b.lastChild.textContent=c.cat;
    b.onclick=function(){ $('srchDlg').classList.remove('open'); insertBlock(c.st); toast(T('블록을 넣었어요')); }; box.appendChild(b); }); }
function openSearch(){ $('srchDlg').classList.add('open'); $('srchQ').value=''; renderSearch(); setTimeout(function(){ $('srchQ').focus(); },40); }
$('srchQ').addEventListener('input',renderSearch);
$('srchQ').addEventListener('keydown',function(e){ if(e.key==='Enter'){ var b=$('srchList').querySelector('.srow'); if(b) b.click(); } });
$('srchClose').onclick=function(){ $('srchDlg').classList.remove('open'); };
ws.registerButtonCallback('blkSearch',openSearch);

/* ---------- log panel and friendly errors ---------- */
var logN=0, errN=0, NOEL=T('요소가 없어요');
function clearLog(){ logN=errN=0; $('logBox').innerHTML=''; syncLog(); }
function syncLog(){ $('logN').textContent=logN; $('logBar').classList.toggle('err',errN>0); }
function friendly(m){ m=String(m).replace(/^Uncaught\s+(\w+:\s*)?/,'');
  if(m.indexOf(NOEL)>=0) return m;
  if(/is not defined/.test(m)) return T('이름을 찾을 수 없어요. 변수를 먼저 만들었는지 확인해 보세요')+' ('+m+')';
  if(/null|undefined/.test(m)&&/properties|reading|setting/.test(m)) return T('아직 없는 것을 쓰려고 했어요. 요소 이름과 순서를 확인해 보세요')+' ('+m+')';
  return m; }
function flashBlock(name){ var bl=ws.getAllBlocks(false).filter(function(b){ var f=b.getField&&b.getField('EL'); return f&&f.getValue()===name; })[0]; if(!bl) return;
  if(bl.select) bl.select(); ws.centerOnBlock(bl.id); try{ ws.highlightBlock(bl.id,true); setTimeout(function(){ ws.highlightBlock(bl.id,false); },3000); }catch(e){} }
function addLog(level,text){ var box=$('logBox'), d=document.createElement('div'); d.className='lg '+level; var err=level==='error';
  if(err){ errN++; text=friendly(text); var mm=text.match(/"([^"]+)"\s*(?=[^"]*$)/); if(text.indexOf(NOEL)>=0){ var nm=text.match(/"([^"]+)"/); if(nm){ flashBlock(nm[1]); d.classList.add('go'); d.onclick=function(){ flashBlock(nm[1]); showBlocksView(); }; } } }
  d.textContent=(err?'⚠ ':'')+text; box.appendChild(d); logN++; while(box.children.length>200) box.removeChild(box.firstChild); box.scrollTop=box.scrollHeight; syncLog();
  if(err){ $('pPrev').classList.add('logOpen'); } }
function showBlocksView(){ if(window.matchMedia('(max-width:900px)').matches){ var b=document.querySelector('#seg button[data-v="blocks"]'); if(b) b.click(); } }
window.addEventListener('message',function(e){ var d=e.data; if(!d||!d.ffbhLog||e.source!==$('frame').contentWindow) return; addLog(d.ffbhLog[0],d.ffbhLog[1]); });
$('logToggle').onclick=function(){ $('pPrev').classList.toggle('logOpen'); };
$('logClear').onclick=clearLog;

/* ---------- keyboard shortcuts: Ctrl+Enter run, Ctrl+S save, / search, Esc close ---------- */
document.addEventListener('keydown',function(e){
  var t=e.target, typing=t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable);
  if(e.key==='Escape'){ var ov=document.querySelectorAll('.ov.open'); if(ov.length){ var top=ov[ov.length-1]; if(top.id==='askDlg') $('askNo').click(); else if(top.id==='baiDlg') $('baiClose').click(); else top.classList.remove('open'); } return; }
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){ e.preventDefault(); runNow(); return; }
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){ e.preventDefault(); saveNow(); toast(T('저장했어요')); return; }
  if(e.key==='/'&&!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!document.querySelector('.ov.open')){ e.preventDefault(); openSearch(); } });

/* ---------- start ---------- */
/* old single autosave (ffblocks.v1) becomes the first entry of the project list; the old key is left untouched as a backup */
P=readIdx(); if(!P){ P={cur:null,list:[]}; var old=null; try{ old=JSON.parse(lsGet(LS)||'null'); }catch(e){}
  if(old&&old.ws){ var oid=pid(); lsSet(PK+oid,JSON.stringify(old)); P.list.push({id:oid,name:old.name||T('나의 웹페이지'),t:Date.now()}); P.cur=oid; writeIdx(); } }
P.list=P.list.filter(function(e){ return e&&e.id; });
(function(){ var cand=[EMB||P.cur].concat(P.list.slice().sort(function(a,b){ return b.t-a.t; }).map(function(e){ return e.id; })), ok=false;
  for(var k=0;k<cand.length&&!ok;k++){ var id=cand[k], d=id&&entry(id)&&readProj(id); if(d&&d.ws){ P.cur=id; $('projName').value=d.name||T('나의 웹페이지'); setImgs(d.imgs); setSnds(d.snds); try{ loadJSON(d.ws); ok=true; }catch(e){ console.error(e); } } }
  if(!ok){ P.cur=null; createProject(T(BH_EXAMPLES[0].name),function(){ loadXML(BH_EXAMPLES[0].xml()); arrange(); }); } })();
setTimeout(syncBar,50);
if(EMB){ var embTry=0, embSend=function(){ var html=''; try{ if(P.cur===EMB) html=finalHTML(); }catch(e){ console.error(e); } if(!html&&++embTry<10) return setTimeout(embSend,300); try{ parent.postMessage({ffbhBuilt:1,id:EMB,html:html},'*'); }catch(e){} }; setTimeout(embSend,350); }
window.__bh={showPreview:showPreview,showHTML:function(h){ custom=String(h); $('codeEdit').readOnly=false; if(custom.length>BIGCODE) bigView(custom); else $('codeEdit').value=custom; setCust(true); clearTimeout(customT); if(runState==='stop') setRun('run'); clearLog(); dbgReset(); $('frame').srcdoc=custom; setPane('code'); },clearHTML:function(){ dropCustom(false); },ws:ws,copy:copyBlock,paste:pasteBlock,deleteAll:deleteAll,arrange:arrange,build:function(){ return finalHTML(); },loadXML:loadXML,loadJSON:loadJSON,save:saveNow,toast:toast,projects:function(){ return P; },examples:BH_EXAMPLES};
})();
