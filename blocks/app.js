/* Block HTML: workspace, live preview, code view, saving and examples. */
(function(){
'use strict';
var T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };
var LS='ffblocks.v1';
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } }

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
      if(others.indexOf(n)<0) return; var base=n.replace(/\d+$/,''), k=1; while(others.indexOf(base+k)>=0) k++;
      var og=Blockly.Events.getGroup(); Blockly.Events.setGroup(e.group||og||true); try{ b.setFieldValue(base+k,'NAME'); }finally{ Blockly.Events.setGroup(og||false); } });
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
var fullWarned=false;
function save(){ clearTimeout(saveT); saveT=setTimeout(function(){ var ok=lsSet(LS,JSON.stringify({name:$('projName').value,ws:Blockly.serialization.workspaces.save(ws),imgs:BH.IMGS}));
  if(!ok&&!fullWarned){ fullWarned=true; toast(T('저장 공간이 꽉 찼어요. 프로젝트 파일로 저장해 두세요')); } if(ok) fullWarned=false; },300); }
function setImgs(o){ var I=BH.IMGS; Object.keys(I).forEach(function(k){ delete I[k]; }); if(o&&typeof o==='object') Object.keys(o).forEach(function(k){ var m=o[k]; if(m&&typeof m.data==='string'&&/^data:image\//.test(m.data)) I[k]=m; }); }
$('projName').addEventListener('input',save);
$('projName').addEventListener('keydown',function(e){ if(e.key==='Enter') this.blur(); });
function blank(){ loadJSON({blocks:{languageVersion:0,blocks:[{type:'page_root',x:30,y:30,fields:{TITLE:T('나의 웹페이지'),BG:'#ffffff',CENTER:true},inputs:{BODY:{block:{type:'el_heading',fields:{SIZE:'h1',TEXT:T('안녕하세요'),NAME:T('제목')+'1'}}}}}]}}); }
$('fileMenu').addEventListener('click',function(e){
  var b=e.target.closest('[data-f]'); if(!b) return; closeMenus(); var f=b.dataset.f;
  if(f==='new'){ if(!confirm(T('지금 블록을 모두 지우고 새로 시작할까요?'))) return; $('projName').value=T('나의 웹페이지'); setImgs(null); blank(); save(); }
  else if(f==='save'){ download(new Blob([JSON.stringify({app:'block-html',v:1,name:$('projName').value,ws:Blockly.serialization.workspaces.save(ws),imgs:BH.IMGS},null,1)],{type:'application/json'}),fname('.json')); }
  else if(f==='open') $('fileIn').click();
  else if(f==='html') downloadHTML();
});
$('fileIn').addEventListener('change',function(){
  var file=this.files&&this.files[0]; this.value=''; if(!file) return;
  var r=new FileReader(); r.onload=function(){ try{ var o=JSON.parse(r.result); if(!o.ws) throw 0; $('projName').value=o.name||file.name.replace(/\.json$/i,''); setImgs(o.imgs); loadJSON(o.ws); save(); toast(T('프로젝트를 열었어요')); }catch(e){ toast(T('이 파일은 열 수 없어요')); } };
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
document.querySelectorAll('.ov [data-close]').forEach(function(b){ b.onclick=function(){ b.closest('.ov').classList.remove('open'); }; });
var tt=null; function toast(s){ var t=$('toast'); t.textContent=s; t.classList.add('on'); clearTimeout(tt); tt=setTimeout(function(){ t.classList.remove('on'); },1800); }
window.addEventListener('resize',function(){ Blockly.svgResize(ws); });

/* ---------- 내 그림: drawing pad, photos, manager ---------- */
var I=BH.IMGS;
function uniqName(base,skip){ base=(base||T('그림')).trim().slice(0,30)||T('그림'); var names=Object.keys(I).filter(function(k){ return k!==skip; }).map(function(k){ return I[k].name; }); if(names.indexOf(base)<0) return base; var b=base.replace(/\d+$/,''), k=2; while(names.indexOf(b+k)>=0) k++; return b+k; }
function thumbOf(img,w,h){ var k=Math.min(1,88/Math.max(w,h)), c=document.createElement('canvas'); c.width=Math.max(1,Math.round(w*k)); c.height=Math.max(1,Math.round(h*k)); c.getContext('2d').drawImage(img,0,0,c.width,c.height); return c.toDataURL('image/png'); }
function putImage(id,name,data,w,h,src){ I[id]={name:name,data:data,w:w,h:h,thumb:thumbOf(src,w,h)}; }
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
$('padBg').addEventListener('change',function(){ $('padWrap').classList.toggle('clear',this.checked); });
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
  padId=id||null; hist=[]; pg.clearRect(0,0,PW,PH); $('padName').value=id?I[id].name:uniqName(T('내 그림')); $('padBg').checked=false; $('padWrap').classList.remove('clear');
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
      if(a==='del'){ var u=usedBy(id); if(u.length&&!confirm(F('이 그림을 쓰는 블록이 {0}개 있어요. 그래도 지울까요?',u.length))) return; delete I[id]; afterImgChange(); renderMgr(); } };
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
function deleteAll(){ var tops=ws.getTopBlocks(false); if(!tops.length) return; if(!confirm(T('블록을 모두 지울까요? 되돌리기로 다시 살릴 수 있어요.'))) return;
  tops.sort(function(a,b){ return (a.type==='page_root')-(b.type==='page_root'); }); // pages go last so undo brings them back first
  Blockly.Events.setGroup(true); try{ tops.forEach(function(b){ b.dispose(false); }); }finally{ Blockly.Events.setGroup(false); } toast(T('블록을 모두 지웠어요')); }
function syncBar(){ var sel=Blockly.getSelected(); $('ebCopy').disabled=!(sel&&!sel.isShadow()); $('ebUndo').disabled=!ws.getUndoStack().length; $('ebRedo').disabled=!ws.getRedoStack().length; }
$('ebCopy').onclick=function(){ copyBlock(); };
$('ebPaste').onclick=pasteBlock;
$('ebUndo').onclick=function(){ ws.undo(false); syncBar(); };
$('ebRedo').onclick=function(){ ws.undo(true); syncBar(); };
$('ebDel').onclick=deleteAll;
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

/* ---------- start ---------- */
var saved=null; try{ saved=JSON.parse(lsGet(LS)||'null'); }catch(e){}
if(saved&&saved.ws){ $('projName').value=saved.name||T('나의 웹페이지'); setImgs(saved.imgs); try{ loadJSON(saved.ws); }catch(e){ console.error(e); blank(); } }
else { $('projName').value=T(BH_EXAMPLES[0].name); loadXML(BH_EXAMPLES[0].xml()); arrange(); save(); }
setTimeout(syncBar,50);
window.__bh={ws:ws,copy:copyBlock,paste:pasteBlock,deleteAll:deleteAll,arrange:arrange,build:function(){ return finalHTML(); },loadXML:loadXML,loadJSON:loadJSON,save:save,toast:toast,examples:BH_EXAMPLES};
})();
