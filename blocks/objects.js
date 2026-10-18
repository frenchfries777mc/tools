/* Block HTML: "오브젝트" picker. Adds a toolbox button next to "사진 넣기" and a dialog with category tabs, search and a grid.
   The library is loaded only when the picker is first opened: objects/index.js (names of every object, about 50 KB) first,
   then the pictures of one tab at a time (objects/<tab>.js, 25-120 KB each) as tabs are opened or search results need them (v41).
   Picking calls the handler given to BHOBJ.open with {id, name, svg, src, data}; app.js turns it into a normal picture (SVG data URL).
   The last tab, '모두의 그림' (v43), is drawn by shared.js: drawings people shared, loaded from the server; its search matches their titles. */
(function(){
'use strict';
var T=FFT.T, $=function(id){ return document.getElementById(id); };
var LI=Math.max(0,['ko','en','es','fr','de','ja'].indexOf(FFT.lang));
var V='41', SHARED='@shared', INDEX_URL='objects/index.js?v='+V;

/* toolbox: put the button right after "사진 넣기", wherever that category ends up */
var baseToolbox=BH.toolbox;
BH.toolbox=function(){
  var tb=baseToolbox.apply(this,arguments), mk=function(){ return {kind:'button',text:T('🍎 오브젝트'),callbackKey:'imgObject'}; };
  (function walk(list){ for(var i=0;list&&i<list.length;i++){ var it=list[i];
    if(it&&it.kind==='button'&&it.callbackKey==='imgPhoto'){ list.splice(i+1,0,mk()); i++; continue; }
    if(it&&it.contents) walk(it.contents); } })(tb.contents);
  return tb;
};

var LIB=null, loading=null, cat=null, onPick=null, URLS={}, SVG={}, TABS={}, gen=0;
function script(src){ return new Promise(function(ok,no){ var s=document.createElement('script'); s.src=src;
  s.onload=function(){ ok(); }; s.onerror=function(){ s.remove(); no(new Error('load failed')); }; document.head.appendChild(s); }); }
function load(){
  if(LIB) return Promise.resolve(LIB);
  if(loading) return loading;
  loading=script(INDEX_URL).then(function(){ var d=window.BH_OBJECTS; if(!d||!d.items) throw new Error('no data');
      LIB={cats:d.cats.map(function(c){ return {id:c[0],name:c[1].split('|')}; }),
        items:d.items.map(function(r){ var n=r[3].split('|'); return {id:r[0],cat:r[1],src:r[2],names:n,name:n[LI]||n[0],key:(n.join(' ')+' '+r[0]).toLowerCase()}; })};
      return LIB; });
  loading.catch(function(){ loading=null; });
  return loading;
}
/* objects/<tab>.js calls this with that tab's pictures */
window.BHOBJ_SVG=function(c,map){ for(var k in map) SVG[k]=map[k]; };
function loadTab(c){
  if(!TABS[c]){ TABS[c]=script('objects/'+encodeURIComponent(c)+'.js?v='+V); TABS[c].catch(function(){ delete TABS[c]; }); }
  return TABS[c];
}
function svgOf(o){ return SVG[o.id]; }
function dataUrl(o){ return URLS[o.id]||(URLS[o.id]='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svgOf(o))))); }
var SRC={own:'Block HTML', fluent:'Fluent Emoji (Microsoft, MIT)'};

function norm(s){ return String(s||'').toLowerCase().normalize('NFC').trim(); }
function renderTabs(){
  var q=norm($('objQ').value);
  $('objTabs').innerHTML=LIB.cats.map(function(c){ return '<button type="button" data-c="'+c.id+'" class="'+(!q&&c.id===cat?'on':'')+'">'+esc(c.name[LI]||c.name[0])+'</button>'; }).join('')+
    (window.BHSHARE?'<button type="button" data-c="'+SHARED+'" class="shTab'+(cat===SHARED?' on':'')+'">🌍 '+esc(T('모두의 그림'))+'</button>':'');
  $('objQ').placeholder=cat===SHARED?T('그림 제목으로 찾기'):T('찾기 (예: 사과, car)');
}
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function renderGrid(typing){
  if(cat===SHARED&&window.BHSHARE){ BHSHARE.show($('objQ').value,typing); return; }
  var q=norm($('objQ').value), words=q.split(/\s+/).filter(Boolean);
  var list=words.length?rank(LIB.items,q,words):LIB.items.filter(function(o){ return o.cat===cat; });
  var g=$('objGrid');
  if(!list.length){ g.innerHTML='<div class="objEmpty">'+esc(T('찾는 오브젝트가 없어요'))+'</div>'; return; }
  g.innerHTML='';
  var my=++gen, need={};
  list.forEach(function(o){ var b=document.createElement('button'); b.type='button'; b.className='obj'; b.dataset.id=o.id; b.title=o.name+' · '+SRC[o.src]; b.setAttribute('aria-label',o.name);
    b.innerHTML='<img alt="" draggable="false" width="72" height="72">'; // picture only: the name is the tile's title and label (v40)
    if(svgOf(o)) b.querySelector('img').src=dataUrl(o); else { b.classList.add('wait'); need[o.cat]=1; }
    g.appendChild(b); });
  /* pictures of tabs not loaded yet: fetch them and fill the tiles in, unless the grid has been redrawn meanwhile */
  Object.keys(need).forEach(function(c){ loadTab(c).then(function(){ if(my===gen) fill(); }, function(){ if(my!==gen) return;
    if(!g.querySelector('.objErr')){ var d=document.createElement('div'); d.className='objEmpty objErr'; d.textContent=T('오브젝트를 불러오지 못했어요. 다시 눌러 보세요'); g.insertBefore(d,g.firstChild); } }); });
  g.scrollTop=0;
}
/* search: every word must appear; exact names first, then names starting with the words, then word starts, then anywhere */
function rank(items,q,words){
  var out=[];
  items.forEach(function(o,i){ if(!words.every(function(w){ return o.key.indexOf(w)>=0; })) return;
    var names=o.names.map(norm), s=3;
    if(names.indexOf(q)>=0) s=0;
    else if(names.some(function(n){ return n.indexOf(q)===0; })) s=1;
    else if(words.every(function(w){ return names.some(function(n){ return (' '+n).indexOf(' '+w)>=0; }); })) s=2;
    out.push({o:o,s:s,i:i}); });
  out.sort(function(a,b){ return a.s-b.s||a.i-b.i; });
  return out.map(function(x){ return x.o; });
}
function fill(){ var by={}; LIB.items.forEach(function(o){ by[o.id]=o; });
  Array.prototype.forEach.call($('objGrid').querySelectorAll('.obj.wait'),function(b){ var o=by[b.dataset.id];
    if(o&&svgOf(o)){ b.querySelector('img').src=dataUrl(o); b.classList.remove('wait'); } }); }
function render(typing){ renderTabs(); renderGrid(typing); }

function open(handler){
  onPick=handler; var dlg=$('objDlg'); dlg.classList.add('open');
  if(!LIB){ $('objGrid').innerHTML='<div class="objEmpty">'+esc(T('오브젝트를 불러오는 중…'))+'</div>'; $('objTabs').innerHTML=''; }
  load().then(function(){ if(!cat) cat=LIB.cats[0].id; render(); if(!('ontouchstart' in window)) $('objQ').focus(); },
    function(){ $('objGrid').innerHTML='<div class="objEmpty">'+esc(T('오브젝트를 불러오지 못했어요. 다시 눌러 보세요'))+'</div>'; });
}
$('objQ').placeholder=T('찾기 (예: 사과, car)'); $('objQ').setAttribute('aria-label',T('오브젝트 찾기')); // the box is data-notr, so translate these here
$('objTabs').addEventListener('click',function(e){ var b=e.target.closest('[data-c]'); if(!b) return; cat=b.dataset.c; $('objQ').value=''; render(); });
$('objQ').addEventListener('input',function(){ if(LIB) render(true); });
$('objGrid').addEventListener('click',function(e){ var b=e.target.closest('.obj'); if(!b||!LIB||b.dataset.sid) return;
  var o=LIB.items.filter(function(x){ return x.id===b.dataset.id; })[0]; if(!o) return;
  loadTab(o.cat).then(function(){ if(!svgOf(o)||!$('objDlg').classList.contains('open')) return;
    $('objDlg').classList.remove('open'); if(onPick) onPick({id:o.id,name:o.name,svg:svgOf(o),src:o.src,data:dataUrl(o)}); }, function(){}); });

/* shared.js: a '모두의 그림' tile was picked */
function pick(o){ if(!$('objDlg').classList.contains('open')) return; $('objDlg').classList.remove('open'); if(onPick) onPick(o); }
window.BHOBJ={open:open, load:load, loadTab:loadTab, pick:pick, isShared:function(){ return cat===SHARED; }};
})();
