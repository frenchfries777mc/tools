/* Object picker for Fry Slides and Fry Docs: the same pictures as Block HTML's "오브젝트" (blocks/objects/index.js lists them,
   blocks/objects/<tab>.js holds the drawings, loaded one tab at a time). FFOBJ.open(cb) shows a dialog; picking calls
   cb(file, name) with a transparent 800 px PNG File, so the page can use its normal picture code. */
(function(){
'use strict';
FFT.add({
"일러스트·오브젝트":["Illustrations & objects","Ilustraciones y objetos","Illustrations et objets","Illustrationen & Objekte","イラスト・オブジェクト","插图与对象","Ilustrações e objetos","Иллюстрации и объекты","İllüstrasyonlar ve nesneler",null,null,"Illustrazioni e oggetti","Ilustracje i obiekty","رسومات وكائنات"],
"찾기 (예: 사과, car)":["Search (e.g. apple, car)","Buscar (p. ej. manzana, car)","Chercher (ex. pomme, car)","Suchen (z. B. Apfel, car)","さがす（例：りんご、car）","搜索（例如 apple、car）","Pesquisar (ex.: maçã, car)","Поиск (напр.: apple, car)","Ara (ör. elma, car)",null,null,"Cerca (es. mela, car)","Szukaj (np. apple, car)","ابحث (مثل: apple، car)"],
"불러오는 중…":["Loading…","Cargando…","Chargement…","Wird geladen…","よみこみ中…","加载中…","Carregando…","Загрузка…","Yükleniyor…",null,null,"Caricamento…","Wczytywanie…","جارٍ التحميل…"],
"찾는 그림이 없어요":["No pictures found","No hay imágenes","Aucune image trouvée","Keine Bilder gefunden","みつかりません","找不到图片","Nenhuma imagem encontrada","Картинок не найдено","Resim bulunamadı",null,null,"Nessuna immagine trovata","Nie znaleziono obrazów","لم يتم العثور على صور"],
"그림을 불러오지 못했어요. 다시 눌러 보세요":["Could not load the pictures. Try again.","No se pudieron cargar. Inténtalo de nuevo.","Chargement impossible. Réessayez.","Konnte nicht geladen werden. Versuche es erneut.","よみこめませんでした。もういちどおしてね。","无法加载图片，请再点一次。","Não foi possível carregar. Toque de novo.","Не удалось загрузить картинки. Нажмите ещё раз.","Resimler yüklenemedi. Tekrar deneyin.",null,null,"Impossibile caricare le immagini. Riprova.","Nie udało się wczytać obrazów. Spróbuj ponownie.","تعذّر تحميل الصور. حاول مرة أخرى."]
});
var T=FFT.T, BASE=(document.currentScript&&document.currentScript.src||'').replace(/[^\/]*$/,'')+'blocks/objects/', V='45';
var LI=['ko','en','es','fr','de','ja'].indexOf(FFT.lang); if(LI<0) LI=FFT.lang==='gk'?0:1; /* languages the picture names lack show English, not Korean */
var LIB=null, loading=null, cat=null, onPick=null, SVG={}, TABS={}, URLS={}, gen=0, dlg=null, q=null, tabs=null, grid=null;
function script(src){ return new Promise(function(ok,no){ var s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=function(){ s.remove(); no(new Error('load')); }; document.head.appendChild(s); }); }
window.BHOBJ_SVG=function(c,map){ for(var k in map) SVG[k]=map[k]; };
function load(){ if(LIB) return Promise.resolve(LIB); if(loading) return loading;
  loading=script(BASE+'index.js?v='+V).then(function(){ var d=window.BH_OBJECTS; if(!d||!d.items) throw new Error('data');
    LIB={cats:d.cats.map(function(c){ return {id:c[0],name:c[1].split('|')}; }),
      items:d.items.map(function(r){ var n=r[3].split('|'); return {id:r[0],cat:r[1],names:n,name:n[LI]||n[0],key:(n.join(' ')+' '+r[0]).toLowerCase()}; })}; return LIB; });
  loading.catch(function(){ loading=null; }); return loading; }
function loadTab(c){ if(!TABS[c]){ TABS[c]=script(BASE+encodeURIComponent(c)+'.js?v='+V); TABS[c].catch(function(){ delete TABS[c]; }); } return TABS[c]; }
function dataUrl(o){ return URLS[o.id]||(URLS[o.id]='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(SVG[o.id])))); }
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function norm(s){ return String(s||'').toLowerCase().normalize('NFC').trim(); }
function build(){
  if(dlg) return;
  var st=document.createElement('style'); st.textContent=
    '#ffoDlg{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:90;display:none;align-items:center;justify-content:center;padding:12px}#ffoDlg.open{display:flex}'+
    '#ffoDlg .ffoBox{background:var(--panel,#1c2230);color:var(--text,#e8ecf4);border:1px solid var(--line,#34405a);border-radius:16px;width:min(640px,100%);height:min(720px,94vh);display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,.6)}'+
    '#ffoDlg .ffoHead{display:flex;align-items:center;gap:8px;padding:10px 12px 10px 16px;border-bottom:1px solid var(--line,#34405a)}#ffoDlg h3{margin:0;font-size:16px;flex:1}'+
    '#ffoDlg .ffoX{width:40px;height:40px;border:0;border-radius:10px;background:transparent;color:inherit;font-size:22px;cursor:pointer}'+
    '#ffoQ{margin:10px 12px 0;background:var(--bg,#12161f);color:inherit;border:1px solid var(--line,#34405a);border-radius:10px;padding:11px 12px;font-size:16px}'+
    '#ffoTabs{display:flex;gap:6px;padding:10px 12px 4px;overflow-x:auto;flex:0 0 auto}#ffoTabs button{flex:0 0 auto;min-height:40px;padding:0 14px;border-radius:20px;border:1px solid var(--line,#34405a);background:var(--panel2,#262f44);color:inherit;cursor:pointer;white-space:nowrap;font-size:14px}'+
    '#ffoTabs button.on{background:#ffd24a;color:#111;border-color:#ffd24a;font-weight:700}'+
    '#ffoGrid{flex:1 1 auto;min-height:120px;overflow:auto;padding:8px 12px 12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px;align-content:start}'+
    '#ffoGrid .o{display:flex;align-items:center;justify-content:center;min-height:96px;border-radius:12px;border:1px solid var(--line,#34405a);background:#f3f4f6;cursor:pointer;touch-action:manipulation;padding:8px 4px}'+
    '#ffoGrid .o:hover,#ffoGrid .o:focus-visible{outline:2px solid #ffd24a;outline-offset:-2px}#ffoGrid .o img{width:72px;height:72px;pointer-events:none}#ffoGrid .o.wait img{visibility:hidden}'+
    '#ffoGrid .e{grid-column:1/-1;text-align:center;padding:30px 10px;opacity:.7}';
  document.head.appendChild(st);
  dlg=document.createElement('div'); dlg.id='ffoDlg'; dlg.setAttribute('role','dialog'); dlg.setAttribute('aria-modal','true');
  dlg.innerHTML='<div class="ffoBox"><div class="ffoHead"><h3 data-notr></h3><button type="button" class="ffoX" aria-label="×">×</button></div><input type="search" id="ffoQ" data-notr autocomplete="off" spellcheck="false"><div id="ffoTabs" data-notr></div><div id="ffoGrid" data-notr></div></div>';
  document.body.appendChild(dlg);
  q=dlg.querySelector('#ffoQ'); tabs=dlg.querySelector('#ffoTabs'); grid=dlg.querySelector('#ffoGrid');
  dlg.querySelector('h3').textContent=T('일러스트·오브젝트'); q.placeholder=T('찾기 (예: 사과, car)'); q.setAttribute('aria-label',T('일러스트·오브젝트'));
  dlg.querySelector('.ffoX').onclick=close;
  dlg.addEventListener('mousedown',function(e){ if(e.target===dlg) close(); });
  dlg.addEventListener('keydown',function(e){ if(e.key==='Escape'){ e.stopPropagation(); close(); } });
  tabs.addEventListener('click',function(e){ var b=e.target.closest('[data-c]'); if(!b) return; cat=b.dataset.c; q.value=''; render(); });
  q.addEventListener('input',function(){ if(LIB) render(); });
  grid.addEventListener('click',function(e){ var b=e.target.closest('.o'); if(!b||!LIB) return;
    var o=LIB.items.filter(function(x){ return x.id===b.dataset.id; })[0]; if(!o) return;
    loadTab(o.cat).then(function(){ if(!SVG[o.id]) return; toFile(o).then(function(f){ close(); if(onPick) onPick(f,o.name); }); }); });
}
function close(){ if(dlg) dlg.classList.remove('open'); }
function render(){
  var s=norm(q.value), words=s.split(/\s+/).filter(Boolean);
  tabs.innerHTML=LIB.cats.map(function(c){ return '<button type="button" data-c="'+c.id+'" class="'+(!s&&c.id===cat?'on':'')+'">'+esc(c.name[LI]||c.name[0])+'</button>'; }).join('');
  var list=words.length?LIB.items.filter(function(o){ return words.every(function(w){ return o.key.indexOf(w)>=0; }); }):LIB.items.filter(function(o){ return o.cat===cat; });
  if(words.length) list.sort(function(a,b){ var A=a.names.map(norm).indexOf(s)>=0?0:1, B=b.names.map(norm).indexOf(s)>=0?0:1; return A-B; });
  if(!list.length){ grid.innerHTML='<div class="e">'+esc(T('찾는 그림이 없어요'))+'</div>'; return; }
  grid.innerHTML=''; var my=++gen, need={};
  list.slice(0,300).forEach(function(o){ var b=document.createElement('button'); b.type='button'; b.className='o'; b.dataset.id=o.id; b.title=o.name; b.setAttribute('aria-label',o.name);
    b.innerHTML='<img alt="" draggable="false" width="72" height="72">'; if(SVG[o.id]) b.firstChild.src=dataUrl(o); else { b.classList.add('wait'); need[o.cat]=1; } grid.appendChild(b); });
  Object.keys(need).forEach(function(c){ loadTab(c).then(function(){ if(my!==gen) return; var by={}; LIB.items.forEach(function(o){ by[o.id]=o; });
    [].forEach.call(grid.querySelectorAll('.o.wait'),function(b){ var o=by[b.dataset.id]; if(o&&SVG[o.id]){ b.firstChild.src=dataUrl(o); b.classList.remove('wait'); } }); },function(){}); });
  grid.scrollTop=0;
}
/* the drawing as a transparent 800 px PNG file (the SVG itself is only 128 px) */
function toFile(o){ return new Promise(function(res,rej){ var im=new Image(); im.onerror=rej; im.onload=function(){
    var c=document.createElement('canvas'); c.width=c.height=800; c.getContext('2d').drawImage(im,0,0,800,800);
    c.toBlob(function(b){ if(!b) return rej(new Error('png')); var f=new File([b],'obj-'+o.id+'.png',{type:'image/png'}); f.ffObj=true; res(f); },'image/png'); };
  im.src=dataUrl(o); }); }
function open(cb){ onPick=cb; build(); dlg.classList.add('open');
  if(!LIB){ grid.innerHTML='<div class="e">'+esc(T('불러오는 중…'))+'</div>'; tabs.innerHTML=''; }
  load().then(function(){ if(!cat) cat=LIB.cats[0].id; render(); if(!('ontouchstart' in window)) q.focus(); },
    function(){ grid.innerHTML='<div class="e">'+esc(T('그림을 불러오지 못했어요. 다시 눌러 보세요'))+'</div>'; }); }
window.FFOBJ={open:open};
})();
