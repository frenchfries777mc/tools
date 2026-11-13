/* site theme (dark | light) for pages without ff-lang.js: same storage key, attribute and CSS variables as ff-lang.js, follows the 'fftheme' event and other tabs */
(function(){
  if(window.FFTheme||window.__ffThemeTools) return; window.__ffThemeTools=1;
  var TK='ff.theme', h=document.documentElement;
  function get(){ var t='dark'; try{ var v=localStorage.getItem(TK); if(v==='light'||v==='yellow') t='light'; }catch(e){} return t; }
  function apply(){ var t=get(); if(h.getAttribute('data-ff-theme')!==t) h.setAttribute('data-ff-theme',t); }
  try{
    var st=document.createElement('style'); st.id='ff-tools-theme';
    st.textContent='html[data-ff-theme=dark]:root{--bg:#0e0e0e;--panel:#171717;--panel2:#121212;--line:#2e2b25;--text:#ece6d8;--dim:#a39c8c;--fry:#d9b45f;--fry2:#b8923a;color-scheme:dark}'+
      'html[data-ff-theme=light]:root{--bg:#ffffff;--panel:#ffffff;--panel2:#f6f4ee;--line:#e4dfd2;--text:#111111;--dim:#4b4b4b;--fry:#a67c00;--fry2:#d4a62a;color-scheme:light}'+
      'html[data-ff-theme=light] *{scrollbar-color:rgba(60,56,48,.35) transparent}html[data-ff-theme=light] ::-webkit-scrollbar-thumb{background:rgba(60,56,48,.35);background-clip:content-box}';
    (document.head||h).appendChild(st);
  }catch(e){}
  apply();
  window.addEventListener('storage',function(e){ if(e.key===TK){ apply(); try{ window.dispatchEvent(new Event('fftheme')); }catch(x){} } });
  window.addEventListener('fftheme',apply);
  window.addEventListener('pageshow',apply);
})();
/* thin dark scrollbars on every Tools page (the browser's white default clashes with the dark theme; scrolling itself is unchanged) */
(function(){
  try{
    var st=document.createElement('style'); st.id='ff-scrollbars';
    st.textContent='*{scrollbar-width:thin;scrollbar-color:rgba(138,147,166,.38) transparent}'+
      '::-webkit-scrollbar{width:10px;height:10px}::-webkit-scrollbar-track,::-webkit-scrollbar-corner{background:transparent}'+
      '::-webkit-scrollbar-thumb{background:rgba(138,147,166,.38);border:2px solid transparent;background-clip:content-box;border-radius:8px}'+
      '::-webkit-scrollbar-thumb:hover{background:rgba(138,147,166,.65);background-clip:content-box}';
    (document.head||document.documentElement).appendChild(st);
  }catch(e){}
})();
/* Frenchfries777 Tools: page translation.
   Pages are written in Korean. Each page adds its own strings with FFT.add({'한국어':[en,es,fr,de,ja,zh,pt,ru,tr,nw,gk,it,pl,ar], ...});
   text nodes and a few attributes are translated in place (whole text first, then longest phrases).
   The language choice is shared with the games and the hub (localStorage 'arenaClashLang'). */
(function(){
  var LS='arenaClashLang', LANGS=['ko','en','es','fr','de','ja','zh','pt','ru','tr','it','pl','ar','nw','gk'], IX={en:0,es:1,fr:2,de:3,ja:4,zh:5,pt:6,ru:7,tr:8,nw:9,gk:10,it:11,pl:12,ar:13};
  var NAMES={ko:'한국어',en:'English',es:'Español',fr:'Français',de:'Deutsch',ja:'日本語',zh:'简体中文',pt:'Português (Brasil)',ru:'Русский',tr:'Türkçe',it:'Italiano',pl:'Polski',ar:'العربية',nw:'Newspeak',gk:'번역기 한국어'};
  /* fictional languages sit in their own group; Aurebesh is English text in the Aurebesh font (ff-lang.js) */
  var VIRT={nw:1,gk:1}, VLABEL={ko:'가상 언어',en:'Fictional languages',es:'Idiomas ficticios',fr:'Langues fictives',de:'Fiktive Sprachen',ja:'架空の言語',zh:'虚构语言',pt:'Idiomas fictícios',ru:'Вымышленные языки',tr:'Kurgusal diller',it:'Lingue immaginarie',pl:'Języki fikcyjne',ar:'لغات خيالية',nw:'Unreal speaks',gk:'Fictional 언어들'};
  /* 이모지어(em) also works on pages without ff-lang.js (sheet, slides, blocks, lab, teach): the flag is read straight from storage and ff-emoji.js is loaded here */
  function scr(){ try{ if(window.FFLang&&FFLang.script) return FFLang.script(); var v=localStorage.getItem('ff.script'); return (v==='em'||v==='au'||v==='sg')?v:''; }catch(e){ return ''; } }
  function auOn(){ return !!scr(); }
  /* pages without ff-lang.js (sheet, slides, blocks, lab, docs, python): draw the English text in the Aurebesh / Galactic letters the same way ff-lang.js does */
  if(!window.FFLang&&(scr()==='au'||scr()==='sg')){ try{ var sk=scr(), fam=sk==='au'?'FF Aurebesh':'FF Galactic', fl=sk==='au'?'ff-aurebesh.woff2?v=2':'ff-galactic.woff2?v=1', ah=document.documentElement, as=document.createElement('style'); ah.classList.add('ff-'+sk);
    as.textContent="@font-face{font-family:'"+fam+"';src:url('https://frenchfries777.com/games/fonts/"+fl+"') format('woff2');font-display:block}html.ff-"+sk+" body,html.ff-"+sk+" body *:not(select):not(option):not(optgroup):not([data-lg]):not([data-l]):not([data-lang]):not(.ff-au-keep):not(input):not(textarea):not(code):not(pre):not(#grid *):not(#stage *):not(#slideHost *):not(.cm-editor *){font-family:'"+fam+"',system-ui,sans-serif!important}"; (document.head||ah).appendChild(as); }catch(e){} }
  if(!window.FFLang&&scr()==='em'){ try{ var eh=document.documentElement, es=document.createElement('style'); es.textContent='html:not(.ff-em-ready) body{visibility:hidden}'; (document.head||eh).appendChild(es); setTimeout(function(){ eh.classList.add('ff-em-ready'); },2500);
    var ej=document.createElement('script'); ej.src='https://frenchfries777.com/games/ff-emoji.js?v=3'; ej.onerror=function(){ eh.classList.add('ff-em-ready'); }; (document.head||eh).appendChild(ej); }catch(e){} }
  var pref=null; try{ pref=localStorage.getItem(LS); }catch(e){}
  function detect(){ var c=[]; try{ c=(navigator.languages&&navigator.languages.length)?navigator.languages:[navigator.language||'']; }catch(e){}
    for(var i=0;i<c.length;i++){ var b=String(c[i]||'').toLowerCase().split('-')[0]; if(LANGS.indexOf(b)>=0) return b; } return 'en'; }
  var lang=LANGS.indexOf(pref)>=0?pref:detect();
  var HAN=/[가-힣]/, D=Object.create(null), re=null, dirty=false;
  /* a row without this language falls back to English (번역기 한국어 falls back to the Korean itself) */
  function add(o){ for(var k in o){ var r=o[k]; if(!r) continue; var v=r[IX[lang]]; if(v==null&&lang!=='gk') v=r[0]; if(v!=null) D[k]=v; } dirty=true; }
  function build(){ dirty=false; var keys=Object.keys(D).filter(function(k){ return k.length>1 && k.indexOf('{')<0; }).sort(function(a,b){ return b.length-a.length; });
    re=keys.length?new RegExp(keys.map(function(k){ return k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }).join('|'),'g'):null; }
  function T(s){
    if(lang==='ko'||typeof s!=='string'||!HAN.test(s)) return s;
    var m=/^(\s*)([\s\S]*?)(\s*)$/.exec(s), core=m[2];
    if(D[core]!==undefined) return m[1]+D[core]+m[3];
    var ago=/^(\d+)(분|시간|일|달|년) 전$/.exec(core); if(ago&&D['{0}'+ago[2]+' 전']!==undefined) return m[1]+D['{0}'+ago[2]+' 전'].replace('{0}',ago[1])+m[3];
    if(dirty) build();
    return re?s.replace(re,function(x){ return D[x]; }):s;
  }
  /* F('{0}개 선택', n): translated template with numbered slots */
  function F(tpl){ var a=arguments, s=(lang!=='ko'&&D[tpl]!==undefined)?D[tpl]:tpl;
    return s.replace(/\{(\d)\}/g,function(_,n){ var v=a[+n+1]; return v==null?'':String(v); }); }
  var ATTRS=['placeholder','title','aria-label','alt'], seen=new WeakMap();
  function skip(n){ for(var e=n.nodeType===1?n:n.parentNode;e&&e.nodeType===1;e=e.parentNode){ if(e.nodeName==='SCRIPT'||e.nodeName==='STYLE'||e.nodeName==='TEXTAREA'||e.hasAttribute('data-notr')) return true; } return false; }
  function doText(n){ var v=n.nodeValue; if(!HAN.test(v)||seen.get(n)===v||skip(n)) return; var o=T(v); seen.set(n,o); if(o!==v) n.nodeValue=o; }
  /* attributes: a textarea's own placeholder/title is page text (only what is typed inside it is skipped) */
  function skipA(el){ return el.nodeName==='TEXTAREA'?(el.hasAttribute('data-notr')||skip(el.parentNode)):skip(el); }
  function doAttr(el){ for(var i=0;i<ATTRS.length;i++){ var a=ATTRS[i], v=el.getAttribute&&el.getAttribute(a); if(v&&HAN.test(v)&&!skipA(el)){ var o=T(v); if(o!==v) el.setAttribute(a,o); } } } // only when it changed: an untranslated title would otherwise re-trigger the attribute observer forever
  function walk(root){
    if(!root||lang==='ko') return; if(root.nodeType===3){ doText(root); return; } if(root.nodeType!==1) return;
    doAttr(root); var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT,null), n;
    while((n=w.nextNode())){ if(n.nodeType===3) doText(n); else doAttr(n); }
  }
  function picker(){
    var slots=document.querySelectorAll('[data-lang-slot]');
    for(var j=0;j<slots.length;j++){
      var sel=document.createElement('select'); sel.className='langSel'; sel.setAttribute('data-notr',''); sel.setAttribute('aria-label',T('언어'));
      var grp=document.createElement('optgroup'); grp.label=VLABEL[lang]||VLABEL.en;
      LANGS.concat(['au','sg','em']).forEach(function(l){ var o=document.createElement('option'); o.value=l; o.textContent=l==='au'?'🌐 Aurebesh':l==='sg'?'🌐 Standard Galactic':l==='em'?'😀💬':NAMES[l];
        if((l==='au'||l==='sg'||l==='em')){ if(l!=='em') o.style.fontFamily=l==='au'?"'FF Aurebesh',system-ui":"'FF Galactic',system-ui"; if(scr()===l) o.selected=true; } else if(l===lang&&!auOn()) o.selected=true;
        (VIRT[l]||(l==='au'||l==='sg'||l==='em')?grp:sel).appendChild(o); });
      sel.appendChild(grp);
      sel.onchange=function(){ var v=this.value; try{ localStorage.setItem(LS,(v==='au'||v==='sg'||v==='em')?'en':v); }catch(e){} try{ if(window.FFLang) FFLang.set(v); else if(v==='em') localStorage.setItem('ff.script','em'); else localStorage.removeItem('ff.script'); }catch(e){} location.reload(); };
      slots[j].appendChild(sel);
    }
  }
  function start(){
    picker(); document.documentElement.lang=lang==='nw'?'en':lang==='gk'?'ko':lang; document.documentElement.dir=lang==='ar'&&!document.documentElement.hasAttribute('data-ltr')?'rtl':'ltr';
    if(lang==='ko') return;
    var tt=document.querySelector('title'); if(tt) tt.textContent=T(tt.textContent);
    var md=document.querySelector('meta[name="description"]'); if(md) md.setAttribute('content',T(md.getAttribute('content')||''));
    walk(document.body);
    if(window.MutationObserver) new MutationObserver(function(ms){ ms.forEach(function(m){ if(m.type==='characterData') doText(m.target); else if(m.type==='attributes') doAttr(m.target); else m.addedNodes.forEach(walk); }); })
      .observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS});
  }
  add({'언어':['Language','Idioma','Langue','Sprache','言語','语言','Idioma','Язык','Dil','Speakword','언어 설정',"Lingua","Język","اللغة"]});
  /* serverstore.js save messages (FFSrv) */
add({"서버에 연결할 수 없어요. 저장하려면 연결부터 확인해 주세요":["Cannot reach the server. Check the connection before saving.", "No se puede conectar con el servidor. Comprueba la conexión antes de guardar.", "Impossible de joindre le serveur. Vérifiez la connexion avant d’enregistrer.", "Keine Verbindung zum Server. Prüfe die Verbindung, bevor du speicherst.", "サーバーに接続できません。保存するには、まず接続を確認してください。", "无法连接服务器。请先检查连接再保存。", "Não foi possível conectar ao servidor. Verifique a conexão antes de salvar.", "Не удалось подключиться к серверу. Сначала проверьте соединение, чтобы сохранить.", "Sunucuya bağlanılamıyor. Kaydetmek için önce bağlantıyı kontrol edin.", "Cannot reach the server. Check the connection before saving.", "서버에 연결할 수 없어요. 저장하려면 연결부터 확인해 주세요", "Impossibile connettersi al server. Controlla la connessione prima di salvare.", "Nie można połączyć się z serwerem. Najpierw sprawdź połączenie, aby zapisać.", "تعذّر الاتصال بالخادم. تحقّق من الاتصال قبل الحفظ."],
  "서버 저장 공간이 가득 차서 저장하지 못했어요":["Could not save: server storage is full.", "No se pudo guardar: el almacenamiento del servidor está lleno.", "Enregistrement impossible : l’espace de stockage du serveur est plein.", "Nicht gespeichert: Der Serverspeicher ist voll.", "サーバーの保存容量がいっぱいのため、保存できませんでした。", "未能保存：服务器存储空间已满。", "Não foi possível salvar: o armazenamento do servidor está cheio.", "Не удалось сохранить: место на сервере закончилось.", "Kaydedilemedi: sunucu depolama alanı dolu.", "Could not save: server storage is full.", "서버 저장 공간이 가득 차서 저장하지 못했어요", "Salvataggio non riuscito: lo spazio di archiviazione del server è pieno.", "Nie udało się zapisać: pamięć serwera jest pełna.", "لم يُحفظ: مساحة تخزين الخادم ممتلئة."],
  "서버에 연결되지 않았어요":["Not connected to the server", "Sin conexión con el servidor", "Non connecté au serveur", "Keine Verbindung zum Server", "サーバーに接続されていません", "未连接到服务器", "Sem conexão com o servidor", "Нет связи с сервером", "Sunucuya bağlı değil", "Not connected to the server", "서버에 연결되지 않았어요", "Nessuna connessione al server", "Brak połączenia z serwerem", "لا يوجد اتصال بالخادم"],
  "문서가 너무 커서 저장하지 못했어요":["Could not save: the document is too large.", "No se pudo guardar: el documento es demasiado grande.", "Enregistrement impossible : le document est trop volumineux.", "Nicht gespeichert: Das Dokument ist zu groß.", "文書が大きすぎるため、保存できませんでした。", "未能保存：文档太大。", "Não foi possível salvar: o documento é grande demais.", "Не удалось сохранить: документ слишком большой.", "Kaydedilemedi: belge çok büyük.", "Could not save: the document is too large.", "문서가 너무 커서 저장하지 못했어요", "Salvataggio non riuscito: il documento è troppo grande.", "Nie udało się zapisać: dokument jest za duży.", "لم يُحفظ: المستند كبير جدًا."],
  "서버에 저장하지 못했어요. 다시 시도하고 있어요":["Could not save to the server. Retrying.", "No se pudo guardar en el servidor. Reintentando.", "Enregistrement impossible sur le serveur. Nouvelle tentative en cours.", "Konnte nicht auf dem Server gespeichert werden. Es wird erneut versucht.", "サーバーに保存できませんでした。再試行しています。", "无法保存到服务器，正在重试。", "Não foi possível salvar no servidor. Tentando novamente.", "Не удалось сохранить на сервере. Повторяем попытку.", "Sunucuya kaydedilemedi. Yeniden deneniyor.", "Could not save to the server. Retrying.", "서버에 저장하지 못했어요. 다시 시도하고 있어요", "Impossibile salvare sul server. Nuovo tentativo in corso.", "Nie udało się zapisać na serwerze. Ponawiam próbę.", "تعذّر الحفظ على الخادم. جارٍ إعادة المحاولة."],
  "서버에 연결할 수 없어요. 다시 시도하고 있어요":["Cannot reach the server. Retrying.", "No se puede conectar con el servidor. Reintentando.", "Impossible de joindre le serveur. Nouvelle tentative en cours.", "Keine Verbindung zum Server. Es wird erneut versucht.", "サーバーに接続できません。再試行しています。", "无法连接服务器，正在重试。", "Não foi possível conectar ao servidor. Tentando novamente.", "Нет связи с сервером. Повторяем попытку.", "Sunucuya bağlanılamıyor. Yeniden deneniyor.", "Cannot reach the server. Retrying.", "서버에 연결할 수 없어요. 다시 시도하고 있어요", "Impossibile connettersi al server. Nuovo tentativo in corso.", "Nie można połączyć się z serwerem. Ponawiam próbę.", "تعذّر الاتصال بالخادم. جارٍ إعادة المحاولة."]});
  /* relative times ("5분 전") from versions.js and sheet/diary.js: T() turns "N단위 전" into the {0} template of the language */
  add({"방금":["just now", "ahora mismo", "à l’instant", "gerade eben", "たった今", "刚刚", "agora mesmo", "только что", "az önce", "justnow", "단지 지금", "proprio ora", "przed chwilą", "الآن"],
    "{0}분 전":["{0} min ago", "hace {0} min", "il y a {0} min", "vor {0} Min.", "{0}分前", "{0} 分钟前", "há {0} min", "{0} мин назад", "{0} dk önce", "{0} mins before", "{0} 분들 전에", "{0} min fa", "{0} min temu", "قبل {0} دقيقة"],
    "{0}시간 전":["{0} h ago", "hace {0} h", "il y a {0} h", "vor {0} Std.", "{0}時間前", "{0} 小时前", "há {0} h", "{0} ч назад", "{0} sa önce", "{0} hours before", "{0} 시간들 전에", "{0} ore fa", "{0} godz. temu", "قبل {0} ساعة"],
    "{0}일 전":["{0} days ago", "hace {0} días", "il y a {0} jours", "vor {0} Tagen", "{0}日前", "{0} 天前", "há {0} dias", "{0} дн. назад", "{0} gün önce", "{0} days before", "{0} 날들 전에", "{0} giorni fa", "{0} dni temu", "قبل {0} يوم"],
    "{0}달 전":["{0} months ago", "hace {0} meses", "il y a {0} mois", "vor {0} Monaten", "{0}か月前", "{0} 个月前", "há {0} meses", "{0} мес. назад", "{0} ay önce", "{0} moons before", "{0} 달들 전에", "{0} mesi fa", "{0} mies. temu", "قبل {0} شهر"],
    "{0}년 전":["{0} years ago", "hace {0} años", "il y a {0} ans", "vor {0} Jahren", "{0}年前", "{0} 年前", "há {0} anos", "{0} г. назад", "{0} yıl önce", "{0} years before", "{0} 년들 전에", "{0} anni fa", "{0} lat temu", "قبل {0} سنة"]});
  window.FFT={lang:lang, add:add, T:T, F:F, walk:walk};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
