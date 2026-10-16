/* Block HTML: workspace, live preview, code view, saving and examples. */
(function(){
'use strict';
var T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };
var LS='ffblocks.v1';
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }

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
function afterLoad(){ setTimeout(function(){ ws.scrollCenter(); var tb=ws.getTopBlocks(true)[0]; if(tb) ws.scroll(-tb.getRelativeToSurfaceXY().x*ws.scale+30, -tb.getRelativeToSurfaceXY().y*ws.scale+30); },30); refresh(true); }

/* keep element names unique, and follow renames in the blocks that use them */
ws.addChangeListener(function(e){
  if(loading) return;
  if(e.type===Blockly.Events.BLOCK_CREATE){
    (e.ids||[]).forEach(function(id){ var b=ws.getBlockById(id); if(!b||BH.EL.indexOf(b.type)<0) return;
      var n=b.getFieldValue('NAME'), others=ws.getAllBlocks(false).filter(function(x){ return x!==b&&BH.EL.indexOf(x.type)>=0; }).map(function(x){ return x.getFieldValue('NAME'); });
      if(others.indexOf(n)<0) return; var base=n.replace(/\d+$/,''), k=1; while(others.indexOf(base+k)>=0) k++; b.setFieldValue(base+k,'NAME'); });
  }
  if(e.type===Blockly.Events.BLOCK_CHANGE&&e.element==='field'&&e.name==='NAME'){
    var b=ws.getBlockById(e.blockId); if(!b||BH.EL.indexOf(b.type)<0||!e.oldValue) return;
    var still=ws.getAllBlocks(false).some(function(x){ return x!==b&&BH.EL.indexOf(x.type)>=0&&x.getFieldValue('NAME')===e.oldValue; });
    if(still) return;
    ws.getAllBlocks(false).forEach(function(x){ x.inputList.forEach(function(inp){ inp.fieldRow.forEach(function(f){ if(f.name==='EL'&&f.getValue()===e.oldValue){ BH.KNOWN.add(e.newValue); f.setValue(e.newValue); BH.KNOWN.clear(); } }); }); });
  }
});

/* ---------- preview & code ---------- */
var refT=null, lastPrev='';
ws.addChangeListener(function(e){ if(e.isUiEvent||loading) return; clearTimeout(refT); refT=setTimeout(function(){ refresh(false); },450); save(); });
function refresh(force){
  var prev; try{ prev=BH.build(ws,{trap:true}); }catch(err){ console.error(err); return; }
  if(force||prev!==lastPrev){ lastPrev=prev; $('frame').srcdoc=prev; }
  if($('pCode').classList.contains('on')) showCode();
}
function hl(src){
  var e=function(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  return src.split(/(<script>[\s\S]*?<\/script>)/).map(function(part,i){
    if(i%2){ return e(part).replace(/(\/\/[^\n]*)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")|\b(var|function|if|else|for|while|return|new|true|false|break|continue)\b/g,function(m,c,s,k){ return c?'<span class="c">'+c+'</span>':s?'<span class="s">'+s+'</span>':'<span class="k">'+k+'</span>'; }); }
    return e(part).replace(/(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?[a-zA-Z0-9!]+)|("[^"\n]*")/g,function(m,c,t,s){ return c?'<span class="c">'+c+'</span>':t?'<span class="t">'+t+'</span>':'<span class="s">'+s+'</span>'; });
  }).join('');
}
function finalHTML(){ return BH.build(ws,{trap:false}); }
function showCode(){ $('code').innerHTML=hl(finalHTML()); }
function setPane(p){ document.querySelectorAll('.stab').forEach(function(b){ b.classList.toggle('on',b.dataset.p===p); }); $('pPrev').classList.toggle('on',p==='prev'); $('pCode').classList.toggle('on',p==='code'); if(p==='code') showCode(); }
document.querySelectorAll('.stab').forEach(function(b){ b.onclick=function(){ setPane(b.dataset.p); }; });
document.querySelectorAll('#seg button').forEach(function(b){ b.onclick=function(){ var v=b.dataset.v;
  document.querySelectorAll('#seg button').forEach(function(x){ x.classList.toggle('on',x===b); });
  document.body.className='v-'+v; if(v!=='blocks') setPane(v); setTimeout(function(){ Blockly.svgResize(ws); },20); }; });
$('rerun').onclick=function(){ refresh(true); };
$('openTab').onclick=function(){ var u=URL.createObjectURL(new Blob([finalHTML()],{type:'text/html'})); var w=window.open(u,'_blank'); if(!w) location.href=u; setTimeout(function(){ URL.revokeObjectURL(u); },60000); };
$('copyCode').onclick=function(){ var t=finalHTML(); var done=function(){ toast(T('코드를 복사했어요')); };
  try{ navigator.clipboard.writeText(t).then(done,function(){ fallbackCopy(t); done(); }); }catch(e){ fallbackCopy(t); done(); } };
function fallbackCopy(t){ var a=document.createElement('textarea'); a.value=t; document.body.appendChild(a); a.select(); try{ document.execCommand('copy'); }catch(e){} a.remove(); }

/* ---------- files ---------- */
function fname(ext){ return (($('projName').value||'').trim()||'page').replace(/[\\/:*?"<>|]/g,'_')+ext; }
function download(blob,name){ var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },4000); }
function downloadHTML(){ download(new Blob([finalHTML()],{type:'text/html;charset=utf-8'}),fname('.html')); toast(T('HTML 파일을 만들었어요')); }
$('dlBtn').onclick=downloadHTML;
var saveT=null;
function save(){ clearTimeout(saveT); saveT=setTimeout(function(){ lsSet(LS,JSON.stringify({name:$('projName').value,ws:Blockly.serialization.workspaces.save(ws)})); },300); }
$('projName').addEventListener('input',save);
$('projName').addEventListener('keydown',function(e){ if(e.key==='Enter') this.blur(); });
function blank(){ loadJSON({blocks:{languageVersion:0,blocks:[{type:'page_root',x:30,y:30,fields:{TITLE:T('나의 웹페이지'),BG:'#ffffff',CENTER:true},inputs:{BODY:{block:{type:'el_heading',fields:{SIZE:'h1',TEXT:T('안녕하세요'),NAME:T('제목')+'1'}}}}}]}}); }
$('fileMenu').addEventListener('click',function(e){
  var b=e.target.closest('[data-f]'); if(!b) return; closeMenus(); var f=b.dataset.f;
  if(f==='new'){ if(!confirm(T('지금 블록을 모두 지우고 새로 시작할까요?'))) return; $('projName').value=T('나의 웹페이지'); blank(); save(); }
  else if(f==='save'){ download(new Blob([JSON.stringify({app:'block-html',v:1,name:$('projName').value,ws:Blockly.serialization.workspaces.save(ws)},null,1)],{type:'application/json'}),fname('.json')); }
  else if(f==='open') $('fileIn').click();
  else if(f==='html') downloadHTML();
});
$('fileIn').addEventListener('change',function(){
  var file=this.files&&this.files[0]; this.value=''; if(!file) return;
  var r=new FileReader(); r.onload=function(){ try{ var o=JSON.parse(r.result); if(!o.ws) throw 0; $('projName').value=o.name||file.name.replace(/\.json$/i,''); loadJSON(o.ws); save(); toast(T('프로젝트를 열었어요')); }catch(e){ toast(T('이 파일은 열 수 없어요')); } };
  r.readAsText(file);
});

/* ---------- examples ---------- */
var exMenu=$('exMenu');
BH_EXAMPLES.forEach(function(ex,i){ var b=document.createElement('button'); b.innerHTML='<span></span><small></small>'; b.firstChild.textContent=T(ex.name); b.lastChild.textContent=T(ex.desc);
  b.onclick=function(){ closeMenus(); if(ws.getAllBlocks(false).length>3&&!confirm(T('지금 블록 대신 예제를 열까요? (지금 것은 사라져요)'))) return; $('projName').value=T(ex.name); loadXML(ex.xml()); arrange(); save(); }; exMenu.appendChild(b); });

/* ---------- menus ---------- */
function openMenu(m,anchor){ var was=m.classList.contains('open'); closeMenus(); if(was) return; m.classList.add('open');
  var r=anchor.getBoundingClientRect(), w=m.offsetWidth; m.style.left=Math.max(8,Math.min(r.right-w,innerWidth-w-8))+'px'; m.style.top=(r.bottom+6)+'px'; }
function closeMenus(){ document.querySelectorAll('.menu.open').forEach(function(m){ m.classList.remove('open'); }); }
$('exBtn').onclick=function(){ openMenu(exMenu,this); };
$('fileBtn').onclick=function(){ openMenu($('fileMenu'),this); };
document.addEventListener('pointerdown',function(e){ if(!e.target.closest('.menu,#exBtn,#fileBtn')) closeMenus(); },true);
var tt=null; function toast(s){ var t=$('toast'); t.textContent=s; t.classList.add('on'); clearTimeout(tt); tt=setTimeout(function(){ t.classList.remove('on'); },1800); }
window.addEventListener('resize',function(){ Blockly.svgResize(ws); });

/* ---------- start ---------- */
var saved=null; try{ saved=JSON.parse(lsGet(LS)||'null'); }catch(e){}
if(saved&&saved.ws){ $('projName').value=saved.name||T('나의 웹페이지'); try{ loadJSON(saved.ws); }catch(e){ console.error(e); blank(); } }
else { $('projName').value=T(BH_EXAMPLES[0].name); loadXML(BH_EXAMPLES[0].xml()); arrange(); save(); }
window.__bh={ws:ws,arrange:arrange,build:function(){ return finalHTML(); },loadXML:loadXML,examples:BH_EXAMPLES};
})();
