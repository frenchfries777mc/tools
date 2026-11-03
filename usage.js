if(window.FFT) FFT.add({
"현재 사용량":["Current usage","Uso actual","Utilisation actuelle","Aktuelle Nutzung","現在の使用量","当前用量","Uso atual","Текущее использование","Mevcut kullanım",null,null,"Utilizzo attuale","Bieżące zużycie","الاستخدام الحالي"],
"이 브라우저":["This browser","Este navegador","Ce navigateur","Dieser Browser","このブラウザ","此浏览器","Este navegador","Этот браузер","Bu tarayıcı",null,null,"Questo browser","Ta przeglądarka","هذا المتصفح"],
"서버 보관":["Server storage","Almacenamiento del servidor","Stockage sur le serveur","Server-Speicher","サーバー保管","服务器保存","Armazenamento no servidor","Хранение на сервере","Sunucu depolaması",null,null,"Archiviazione sul server","Przechowywanie na serwerze","تخزين الخادم"],
"Tools 사용분":["Used by Tools","Usado por Tools","Utilisé par Tools","Von Tools genutzt","Tools の使用分","Tools 使用部分","Usado pelo Tools","Используется Tools","Tools tarafından kullanılan",null,null,"Usato da Tools","Zajęte przez Tools","المستخدم بواسطة Tools"],
"같은 사이트의 다른 게임·도구가 나머지를 써요":["Other games and tools on the same site use the rest","Otros juegos y herramientas del mismo sitio usan el resto","Les autres jeux et outils du même site utilisent le reste","Andere Spiele und Werkzeuge auf derselben Seite nutzen den Rest","同じサイトの他のゲーム・ツールが残りを使います","同一站点的其他游戏和工具占用其余部分","Outros jogos e ferramentas do mesmo site usam o resto","Остальное занимают другие игры и инструменты этого сайта","Aynı sitedeki diğer oyun ve araçlar kalanı kullanır",null,null,"Gli altri giochi e strumenti dello stesso sito usano il resto","Resztę zajmują inne gry i narzędzia z tej strony","تستخدم الألعاب والأدوات الأخرى في الموقع نفسه الباقي"],
"저장 공간이 부족할 때 오래된 기록이 옮겨져요":["When storage runs low, old records are moved","Cuando falte espacio, los registros antiguos se trasladan","Quand l’espace manque, les anciens enregistrements sont déplacés","Wenn der Speicher knapp wird, werden alte Einträge verschoben","保存領域が足りなくなると古い記録が移されます","存储空间不足时，旧记录会被转移","Quando o espaço acabar, os registros antigos são movidos","Когда места становится мало, старые записи переносятся","Depolama alanı azaldığında eski kayıtlar taşınır",null,null,"Quando lo spazio scarseggia, i record più vecchi vengono spostati","Gdy zabraknie miejsca, stare zapisy są przenoszone","عند نفاد المساحة تُنقل السجلات القديمة"],
"1주일 넘게 안 연 큰 파일":["Large files not opened in over a week","Archivos grandes no abiertos desde hace más de una semana","Gros fichiers non ouverts depuis plus d’une semaine","Große Dateien, die seit über einer Woche nicht geöffnet wurden","1週間以上開いていない大きなファイル","超过一周未打开的大文件","Arquivos grandes não abertos há mais de uma semana","Большие файлы, которые не открывали больше недели","Bir haftadan uzun süredir açılmayan büyük dosyalar",null,null,"File grandi non aperti da più di una settimana","Duże pliki nieotwierane od ponad tygodnia","ملفات كبيرة لم تُفتح منذ أكثر من أسبوع"],
"1주일 넘게 안 연 파일이 없어요":["No files unopened for over a week","No hay archivos sin abrir desde hace más de una semana","Aucun fichier non ouvert depuis plus d’une semaine","Keine Dateien, die seit über einer Woche nicht geöffnet wurden","1週間以上開いていないファイルはありません","没有超过一周未打开的文件","Nenhum arquivo sem abrir há mais de uma semana","Нет файлов, которые не открывали больше недели","Bir haftadan uzun süredir açılmayan dosya yok",null,null,"Nessun file non aperto da più di una settimana","Brak plików nieotwieranych od ponad tygodnia","لا توجد ملفات لم تُفتح منذ أكثر من أسبوع"],
"📊 현재 사용량 보기":["📊 View current usage","📊 Ver uso actual","📊 Voir l’utilisation actuelle","📊 Aktuelle Nutzung anzeigen","📊 現在の使用量を見る","📊 查看当前用量","📊 Ver uso atual","📊 Посмотреть текущее использование","📊 Mevcut kullanımı gör",null,null,"📊 Vedi utilizzo attuale","📊 Zobacz bieżące zużycie","📊 عرض الاستخدام الحالي"],
});
/* Frenchfries777 Tools 현재 사용량 (FFUsage): a window that shows how full this browser and the Oracle server store are,
   and lists the big files nobody opened for a week (click one: that program opens it in a new window).
   Every program adds a "현재 사용량 보기" button to its file menu that calls FFUsage.open().
   Works in the browser (FFUsage) and in Node (module.exports, storage passed in) for the tests. */
(function(root){
'use strict';
var BROWSER_MAX=5000000, SERVER_MAX=16000000, WEEK=7*864e5, TOP=10;
var PROGS=[
 {id:'docs',  name:'Fry Docs',  ico:'📝', path:'../docs/',   idx:'ffdocs.v1',       list:function(o){ return o&&o.docs; },   keys:function(i){ return ['ffdocs.doc.'+i,'ffver.v1.docs.'+i]; }},
 {id:'sheet', name:'Fry Sheet', ico:'📊', path:'../sheet/',  idx:'ffsheet.docs',    list:function(o){ return o; },           keys:function(i){ return ['ffsheet.doc.'+i,'ffver.v1.sheet.'+i]; }},
 {id:'slides',name:'Fry Slides',ico:'🎞️', path:'../slides/', idx:'ffslides.v1',     list:function(o){ return o&&o.decks; },  keys:function(i){ return ['ffver.v1.slides.'+i]; }, inline:true},
 {id:'blocks',name:'Block HTML',ico:'🧱', path:'../blocks/', idx:'ffblocks.projects',list:function(o){ return o&&o.list; },   keys:function(i){ return ['ffblocks.p.'+i,'ffblocks.store.'+i,'ffblocks.ai.'+i,'ffver.v1.blocks.'+i]; }},
 {id:'python',name:'Fry Python',ico:'🐍', path:'../python/', idx:'ffpy.v1',         list:function(o){ return o&&o.files; }, keys:function(i){ return ['ffpy.file.'+i,'ffver.v1.python.'+i]; }}
];
var MINE=/^(ffdocs|ffsheet|ffslides|ffblocks|ffpy|ffver|fflab|ffai|ffchat|ffstore)/;
function ls(){ try{ return root.localStorage; }catch(e){ return null; } }
function J(st,k){ try{ return JSON.parse(st.getItem(k)||'null'); }catch(e){ return null; } }
function L(st,k){ try{ var v=st.getItem(k); return v==null?0:v.length; }catch(e){ return 0; } }
/* st: a Storage. now: ms. Returns {browser:{used,mine,max}, server:{used,max}, files:[{prog,pname,ico,path,id,name,t,size}]} (files = every file; callers filter) */
function collect(st,now){
  st=st||ls(); now=now||Date.now(); var out={browser:{used:0,mine:0,max:BROWSER_MAX},server:{used:0,max:SERVER_MAX},files:[]}; if(!st) return out;
  try{ for(var i=0;i<st.length;i++){ var k=st.key(i), n=k.length+L(st,k); out.browser.used+=n; if(MINE.test(k)) out.browser.mine+=n;
    if(k.indexOf('ffver.v1.')===0){ var a=J(st,k); if(Array.isArray(a)) a.forEach(function(x){ if(x&&x.remote&&x.len) out.server.used+=x.len; }); } } }catch(e){}
  PROGS.forEach(function(p){ var l=p.list(J(st,p.idx)); if(!Array.isArray(l)) return;
    l.forEach(function(f){ if(!f||!f.id) return; var size=0; if(p.inline){ try{ size+=JSON.stringify(f).length; }catch(e){} }
      p.keys(f.id).forEach(function(k){ size+=L(st,k); });
      out.files.push({prog:p.id,pname:p.name,ico:p.ico,path:p.path,id:f.id,name:f.name||'',t:+f.t||0,size:size}); }); });
  return out;
}
/* the big files not opened for a week, biggest first */
function idle(files,now){ now=now||Date.now(); return files.filter(function(f){ return f.t&&now-f.t>=WEEK; }).sort(function(a,b){ return b.size-a.size; }).slice(0,TOP); }
function fmt(n){ return n>=1e6?(n/1e6).toFixed(1)+'MB':Math.max(1,Math.round(n/1e3))+'KB'; }
var api={collect:collect,idle:idle,fmt:fmt,BROWSER_MAX:BROWSER_MAX,SERVER_MAX:SERVER_MAX,PROGS:PROGS};
if(typeof module!=='undefined'&&module.exports){ module.exports=api; return; }

/* ---------- window (browser only) ---------- */
var T=function(s){ return root.FFT&&FFT.T?FFT.T(s):s; };
function css(){ if(document.getElementById('ffuCss')) return; var s=document.createElement('style'); s.id='ffuCss';
  /* colours come from the page's own variables (same as its other windows); Canvas colours only when a page has none */
  s.textContent='.ffu{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:12px}'+
  '.ffu>div{background:var(--panel,Canvas);color:var(--text,CanvasText);border:1px solid var(--line,rgba(128,128,128,.4));border-radius:16px;width:min(460px,100%);max-height:86vh;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,.6);font:14px/1.4 inherit;font-family:inherit}'+
  '.ffu h3{margin:0;padding:16px 18px 6px;font-size:17px}.ffu .ffug{padding:6px 18px}.ffu .ffug b{display:flex;justify-content:space-between;font-weight:600}'+
  '.ffu .ffub{height:12px;border-radius:7px;background:var(--panel2,rgba(128,128,128,.25));border:1px solid var(--line,transparent);overflow:hidden;margin:5px 0 3px}.ffu .ffub i{display:block;height:100%;border-radius:7px;background:linear-gradient(90deg,#f5c542,#e0a100)}'+
  '.ffu small{color:var(--dim,inherit);opacity:.9}'+
  '.ffu h4{margin:10px 18px 4px;font-size:13px}.ffu ul{list-style:none;margin:0;padding:0 18px;overflow:auto;flex:1}'+
  '.ffu li{display:flex;align-items:center;gap:8px;padding:8px 10px;margin-bottom:6px;border:1px solid var(--line,rgba(128,128,128,.25));border-radius:10px;cursor:pointer}.ffu li:hover{border-color:var(--fry,#d4a017);background:var(--panel2,rgba(128,128,128,.1))}'+
  '.ffu li .ffut{flex:1;min-width:0}.ffu li b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ffu .ffue{padding:12px 0;color:var(--dim,inherit);text-align:center;cursor:default;border:0}.ffu .ffue:hover{background:none}'+
  '.ffu .ffux{padding:12px 18px;text-align:right}.ffu button{height:34px;padding:0 14px;border-radius:8px;border:1px solid var(--line,rgba(128,128,128,.5));background:var(--panel2,ButtonFace);color:var(--text,ButtonText);font:inherit;cursor:pointer}.ffu button:hover{border-color:var(--fry,#d4a017)}';
  document.head.appendChild(s); }
function el(t,c,x){ var e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; }
function gauge(label,used,max,note){ var g=el('div','ffug'), p=Math.min(100,Math.round(used/max*100)), b=el('b'); b.appendChild(el('span','',label)); b.appendChild(el('span','',fmt(used)+' / '+fmt(max)+' ('+p+'%)')); g.appendChild(b);
  var bar=el('div','ffub'), i=el('i'); i.style.width=Math.max(p,used?2:0)+'%'; bar.appendChild(i); g.appendChild(bar); if(note) g.appendChild(el('small','',note)); return g; }
function open(){
  css(); var d=collect(), ov=el('div','ffu'), box=el('div'); ov.appendChild(box);
  function close(){ document.removeEventListener('keydown',kd,true); ov.remove(); } function kd(e){ if(e.key==='Escape'){ e.stopPropagation(); close(); } }
  document.addEventListener('keydown',kd,true); ov.addEventListener('mousedown',function(e){ if(e.target===ov) close(); });
  box.appendChild(el('h3','',T('현재 사용량')));
  box.appendChild(gauge(T('이 브라우저'),d.browser.used,d.browser.max,T('Tools 사용분')+' '+fmt(d.browser.mine)+' · '+T('같은 사이트의 다른 게임·도구가 나머지를 써요')));
  box.appendChild(gauge(T('서버 보관'),d.server.used,d.server.max,T('저장 공간이 부족할 때 오래된 기록이 옮겨져요')));
  box.appendChild(el('h4','',T('1주일 넘게 안 연 큰 파일')));
  var ul=el('ul'), l=idle(d.files); if(!l.length) ul.appendChild(el('li','ffue',T('1주일 넘게 안 연 파일이 없어요')));
  l.forEach(function(f){ var li=el('li'), tx=el('div','ffut'); tx.appendChild(el('b','',f.ico+' '+(f.name||T('이름 없음')))); tx.appendChild(el('small','',f.pname+' · '+T(ago(f.t)))); li.appendChild(tx); li.appendChild(el('span','',fmt(f.size)));
    li.onclick=function(){ try{ window.open(f.path+'#open='+f.id,'_blank','noopener'); }catch(e){} }; ul.appendChild(li); });
  box.appendChild(ul); var x=el('div','ffux'), cb=el('button','',T('닫기')); cb.onclick=close; x.appendChild(cb); box.appendChild(x);
  document.body.appendChild(ov);
}
function ago(t){ var s=Math.max(0,(Date.now()-t)/1000); if(s<86400*30) return Math.floor(s/86400)+'일 전'; return Math.floor(s/86400/30)+'달 전'; }
api.open=open; root.FFUsage=api;
})(typeof window!=='undefined'?window:this);
