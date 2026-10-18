/* Block HTML: "오브젝트" picker. Adds a toolbox button next to "사진 넣기" and a dialog with category tabs, search and a grid.
   The library itself (objects-lib.js, about 330 KB of small SVGs) is loaded only when the picker is first opened.
   Picking calls the handler given to BHOBJ.open with {id, name, svg, src}; app.js turns it into a normal picture (SVG data URL). */
(function(){
'use strict';
var T=FFT.T, $=function(id){ return document.getElementById(id); };
var LI=Math.max(0,['ko','en','es','fr','de','ja'].indexOf(FFT.lang));
var LIB_URL='objects-lib.js?v=38';

/* toolbox: put the button right after "사진 넣기", wherever that category ends up */
var baseToolbox=BH.toolbox;
BH.toolbox=function(){
  var tb=baseToolbox.apply(this,arguments), btn={kind:'button',text:T('🍎 오브젝트'),callbackKey:'imgObject'}, done=false;
  (function walk(list){ for(var i=0;list&&i<list.length&&!done;i++){ var it=list[i];
    if(it&&it.kind==='button'&&it.callbackKey==='imgPhoto'){ list.splice(i+1,0,btn); done=true; return; }
    if(it&&it.contents) walk(it.contents); } })(tb.contents);
  return tb;
};

var LIB=null, loading=null, cat=null, onPick=null, URLS={};
function load(){
  if(LIB) return Promise.resolve(LIB);
  if(loading) return loading;
  loading=new Promise(function(ok,no){ var s=document.createElement('script'); s.src=LIB_URL;
    s.onload=function(){ var d=window.BH_OBJECTS; if(!d||!d.items){ loading=null; no(new Error('no data')); return; }
      LIB={cats:d.cats.map(function(c){ return {id:c[0],name:c[1].split('|')}; }),
        items:d.items.map(function(r){ var n=r[3].split('|'); return {id:r[0],cat:r[1],src:r[2],names:n,name:n[LI]||n[0],svg:r[4],key:(n.join(' ')+' '+r[0]).toLowerCase()}; })};
      ok(LIB); };
    s.onerror=function(){ loading=null; s.remove(); no(new Error('load failed')); };
    document.head.appendChild(s); });
  return loading;
}
function dataUrl(o){ return URLS[o.id]||(URLS[o.id]='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(o.svg)))); }
var SRC={own:'Block HTML', fluent:'Fluent Emoji (Microsoft, MIT)'};

function norm(s){ return String(s||'').toLowerCase().normalize('NFC').trim(); }
function renderTabs(){
  var q=norm($('objQ').value);
  $('objTabs').innerHTML=LIB.cats.map(function(c){ return '<button type="button" data-c="'+c.id+'" class="'+(!q&&c.id===cat?'on':'')+'">'+esc(c.name[LI]||c.name[0])+'</button>'; }).join('');
}
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function renderGrid(){
  var q=norm($('objQ').value), words=q.split(/\s+/).filter(Boolean);
  var list=words.length?rank(LIB.items,q,words):LIB.items.filter(function(o){ return o.cat===cat; });
  var g=$('objGrid');
  if(!list.length){ g.innerHTML='<div class="objEmpty">'+esc(T('찾는 오브젝트가 없어요'))+'</div>'; return; }
  g.innerHTML='';
  list.forEach(function(o){ var b=document.createElement('button'); b.type='button'; b.className='obj'; b.dataset.id=o.id; b.title=o.name+' · '+SRC[o.src];
    b.innerHTML='<img alt="" draggable="false" width="56" height="56"><span></span>'; b.querySelector('img').src=dataUrl(o); b.querySelector('span').textContent=o.name; g.appendChild(b); });
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
function render(){ renderTabs(); renderGrid(); }

function open(handler){
  onPick=handler; var dlg=$('objDlg'); dlg.classList.add('open');
  if(!LIB){ $('objGrid').innerHTML='<div class="objEmpty">'+esc(T('오브젝트를 불러오는 중…'))+'</div>'; $('objTabs').innerHTML=''; }
  load().then(function(){ if(!cat) cat=LIB.cats[0].id; render(); if(!('ontouchstart' in window)) $('objQ').focus(); },
    function(){ $('objGrid').innerHTML='<div class="objEmpty">'+esc(T('오브젝트를 불러오지 못했어요. 다시 눌러 보세요'))+'</div>'; });
}
$('objQ').placeholder=T('찾기 (예: 사과, car)'); $('objQ').setAttribute('aria-label',T('오브젝트 찾기')); // the box is data-notr, so translate these here
$('objTabs').addEventListener('click',function(e){ var b=e.target.closest('[data-c]'); if(!b) return; cat=b.dataset.c; $('objQ').value=''; render(); });
$('objQ').addEventListener('input',function(){ if(LIB) render(); });
$('objGrid').addEventListener('click',function(e){ var b=e.target.closest('.obj'); if(!b||!LIB) return;
  var o=LIB.items.filter(function(x){ return x.id===b.dataset.id; })[0]; if(!o) return;
  $('objDlg').classList.remove('open'); if(onPick) onPick({id:o.id,name:o.name,svg:o.svg,src:o.src,data:dataUrl(o)}); });

window.BHOBJ={open:open, load:load};
})();
