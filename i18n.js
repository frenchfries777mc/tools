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
   Pages are written in Korean. Each page adds its own strings with FFT.add({'한국어':[en,es,fr,de,ja,zh,pt,ru,tr,nw,gk], ...});
   text nodes and a few attributes are translated in place (whole text first, then longest phrases).
   The language choice is shared with the games and the hub (localStorage 'arenaClashLang'). */
(function(){
  var LS='arenaClashLang', LANGS=['ko','en','es','fr','de','ja','zh','pt','ru','tr','nw','gk'], IX={en:0,es:1,fr:2,de:3,ja:4,zh:5,pt:6,ru:7,tr:8,nw:9,gk:10};
  var NAMES={ko:'한국어',en:'English',es:'Español',fr:'Français',de:'Deutsch',ja:'日本語',zh:'简体中文',pt:'Português (Brasil)',ru:'Русский',tr:'Türkçe',nw:'Newspeak',gk:'번역기 한국어'};
  /* fictional languages sit in their own group; Aurebesh is English text in the Aurebesh font (ff-lang.js) */
  var VIRT={nw:1,gk:1}, VLABEL={ko:'가상 언어',en:'Fictional languages',es:'Idiomas ficticios',fr:'Langues fictives',de:'Fiktive Sprachen',ja:'架空の言語',zh:'虚构语言',pt:'Idiomas fictícios',ru:'Вымышленные языки',tr:'Kurgusal diller',nw:'Unreal speaks',gk:'Fictional 언어들'};
  function auOn(){ try{ return !!(window.FFLang&&FFLang.script&&FFLang.script()==='au'); }catch(e){ return false; } }
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
    if(dirty) build();
    return re?s.replace(re,function(x){ return D[x]; }):s;
  }
  /* F('{0}개 선택', n): translated template with numbered slots */
  function F(tpl){ var a=arguments, s=(lang!=='ko'&&D[tpl]!==undefined)?D[tpl]:tpl;
    return s.replace(/\{(\d)\}/g,function(_,n){ var v=a[+n+1]; return v==null?'':String(v); }); }
  var ATTRS=['placeholder','title','aria-label','alt'], seen=new WeakMap();
  function skip(n){ for(var e=n.nodeType===1?n:n.parentNode;e&&e.nodeType===1;e=e.parentNode){ if(e.nodeName==='SCRIPT'||e.nodeName==='STYLE'||e.nodeName==='TEXTAREA'||e.hasAttribute('data-notr')) return true; } return false; }
  function doText(n){ var v=n.nodeValue; if(!HAN.test(v)||seen.get(n)===v||skip(n)) return; var o=T(v); seen.set(n,o); if(o!==v) n.nodeValue=o; }
  function doAttr(el){ for(var i=0;i<ATTRS.length;i++){ var a=ATTRS[i], v=el.getAttribute&&el.getAttribute(a); if(v&&HAN.test(v)&&!skip(el)){ var o=T(v); if(o!==v) el.setAttribute(a,o); } } } // only when it changed: an untranslated title would otherwise re-trigger the attribute observer forever
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
      LANGS.concat(['au']).forEach(function(l){ var o=document.createElement('option'); o.value=l; o.textContent=l==='au'?'🌐 Aurebesh':NAMES[l];
        if(l==='au'){ o.style.fontFamily="'FF Aurebesh',system-ui"; if(auOn()) o.selected=true; } else if(l===lang&&!auOn()) o.selected=true;
        (VIRT[l]||l==='au'?grp:sel).appendChild(o); });
      sel.appendChild(grp);
      sel.onchange=function(){ var v=this.value; try{ localStorage.setItem(LS,v==='au'?'en':v); }catch(e){} try{ if(window.FFLang) FFLang.set(v); }catch(e){} location.reload(); };
      slots[j].appendChild(sel);
    }
  }
  function start(){
    picker(); document.documentElement.lang=lang==='nw'?'en':lang==='gk'?'ko':lang;
    if(lang==='ko') return;
    var tt=document.querySelector('title'); if(tt) tt.textContent=T(tt.textContent);
    var md=document.querySelector('meta[name="description"]'); if(md) md.setAttribute('content',T(md.getAttribute('content')||''));
    walk(document.body);
    if(window.MutationObserver) new MutationObserver(function(ms){ ms.forEach(function(m){ if(m.type==='characterData') doText(m.target); else if(m.type==='attributes') doAttr(m.target); else m.addedNodes.forEach(walk); }); })
      .observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS});
  }
  add({'언어':['Language','Idioma','Langue','Sprache','言語','语言','Idioma','Язык','Dil','Speakword','언어 설정']});
  window.FFT={lang:lang, add:add, T:T, F:F, walk:walk};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
