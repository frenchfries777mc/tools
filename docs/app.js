/* Fry Docs: a Word-like document editor. One contenteditable A4 page; documents live in this browser (localStorage).
   Exports .docx (docx.js), PDF (print), .html and .txt; opens .docx, .html and .txt. AI helper uses the shared ai.js (FFAI). */
(function(){
'use strict';
var T=function(s){ return window.FFT&&FFT.T?FFT.T(s):s; }, F=function(s){ var a=arguments; s=T(s); return s.replace(/\{(\d)\}/g,function(m,i){ return a[+i+1]; }); };
function $(id){ return document.getElementById(id); }
var page=$('page'), LS='ffdocs.v1', DOC='ffdocs.doc.';
page.setAttribute('data-ph',T(page.getAttribute('data-ph')||''));   // the empty-page hint (page is data-notr, so i18n.js leaves it alone)

/* ---------- toast ---------- */
var toastT=null;
function toast(m){ var t=$('toast'); t.textContent=T(m); t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(function(){ t.classList.remove('on'); },2600); }

/* ---------- cleaning HTML (paste, files, saved documents) ---------- */
var KEEP={P:1,H1:1,H2:1,H3:1,BLOCKQUOTE:1,UL:1,OL:1,LI:1,B:1,I:1,U:1,S:1,BR:1,HR:1,TABLE:1,TBODY:1,THEAD:1,TR:1,TD:1,TH:1,IMG:1,SPAN:1,SUB:1,SUP:1,A:1};
/* fonts a piece of text may use (first name = what is stored); px sizes for the size box */
var FACES=[['Noto Sans KR','본고딕'],['Noto Serif KR','본명조'],['Nanum Gothic','나눔고딕'],['Nanum Myeongjo','나눔명조'],['Gowun Dodum','고운돋움'],['Nanum Pen Script','나눔손글씨 펜'],['Jua','주아'],['Black Han Sans','검은고딕'],['Malgun Gothic','맑은 고딕'],['Batang','바탕'],['Arial','Arial'],['Times New Roman','Times New Roman'],['Courier New','Courier New'],['Georgia','Georgia']];
var FACE_OK={}; FACES.forEach(function(f){ FACE_OK[f[0].toLowerCase()]=f[0]; });
var SIZES=[8,9,10,11,12,13,14,15,16,18,20,22,24,28,32,36,40,48,60,72];
function faceOf(v){ var f=String(v||'').split(',')[0].replace(/["']/g,'').trim().toLowerCase(); return FACE_OK[f]||''; }
function pxOf(v){ var m=/^([\d.]+)(px|pt)$/.exec(String(v||'').trim()); if(!m) return 0; var n=+m[1]*(m[2]==='pt'?4/3:1); return n>=6&&n<=120?Math.round(n):0; }
function safeUrl(u){ u=String(u||'').trim(); if(/^(https?:|mailto:)/i.test(u)) return u; if(/^www\./i.test(u)) return 'https://'+u; if(/^[^\s:/]+\.[a-z]{2,}(\/|$)/i.test(u)) return 'https://'+u; return ''; }
var PBC='(pbx|pbg|pbl)( (pbx|pbg|pbl))*', FXC='(fxs|fxo|fxl|fxt)( (fxs|fxo|fxl|fxt))*', IMC='(ib|ir|is|iwl|iwr)( (ib|ir|is|iwl|iwr))*';
var CLS={P:new RegExp('^(fn|toc|toc tt|'+PBC+')$'), H1:new RegExp('^'+PBC+'$'), H2:new RegExp('^'+PBC+'$'), H3:new RegExp('^'+PBC+'$'), BLOCKQUOTE:new RegExp('^'+PBC+'$'), UL:/^ls[0-9]$/, OL:/^ls[0-9]$/, IMG:new RegExp('^'+IMC+'$'), HR:/^(pb|fn)$/, TABLE:/^(tb|ts[123])$/, SUP:/^fr$/, SPAN:new RegExp('^(cm|ti|td|eq|ck|ck on|bm|bl|'+FXC+')$')};
var MAP={STRONG:'B',EM:'I',STRIKE:'S',DEL:'S',INS:'U',DIV:'P',MARK:'SPAN',H4:'H3',H5:'H3',H6:'H3',FONT:'SPAN',SECTION:'P',ARTICLE:'P',HEADER:'P',FOOTER:'P',TFOOT:'TBODY',PRE:'P'};
var DROP={SCRIPT:1,STYLE:1,IFRAME:1,OBJECT:1,EMBED:1,LINK:1,META:1,TITLE:1,HEAD:1,NOSCRIPT:1,SVG:1,CANVAS:1,VIDEO:1,AUDIO:1,FORM:1,INPUT:1,BUTTON:1,SELECT:1,TEXTAREA:1,TEMPLATE:1};
function hex(c){ c=String(c||'').trim(); var m=/^#([0-9a-f]{3})$/i.exec(c); if(m) return m[1].replace(/./g,'$&$&').toUpperCase();
  m=/^#([0-9a-f]{6})$/i.exec(c); if(m) return m[1].toUpperCase();
  m=/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/i.exec(c); if(m&&(m[4]==null||+m[4]>0)) return [m[1],m[2],m[3]].map(function(v){ return ('0'+(+v).toString(16)).slice(-2); }).join('').toUpperCase();
  return null; }
function clean(html){
  var tpl=document.createElement('template'); tpl.innerHTML=String(html||''); var root=tpl.content;
  (function walk(par){ var c=par.firstChild; while(c){ var nx=c.nextSibling;
    if(c.nodeType===3){ c=nx; continue; }
    if(c.nodeType!==1){ par.removeChild(c); c=nx; continue; }
    var tag=c.tagName.toUpperCase(); if(DROP[tag]){ par.removeChild(c); c=nx; continue; }
    var to=MAP[tag]||tag, st=c.style, color=c.getAttribute('color')||(st&&st.color)||'', align=(st&&st.textAlign)||c.getAttribute('align')||'';
    var bold=st&&(st.fontWeight==='bold'||+st.fontWeight>=600), ital=st&&st.fontStyle==='italic', deco=st?(st.textDecorationLine||st.textDecoration||''):'';
    var size=st?pxOf(st.fontSize):0, face=st?faceOf(st.fontFamily||c.getAttribute('face')):'', bg=st?hex(st.backgroundColor):null, va=st?st.verticalAlign:'';
    if(tag==='MARK'&&!bg) bg='FFE066'; if(tag==='FONT'&&/^[1-7]$/.test(c.getAttribute('size')||'')) size=[0,10,13,16,18,24,32,48][+c.getAttribute('size')];
    if(tag==='A'&&!safeUrl(c.getAttribute('href'))) to='SPAN';
    if(!KEEP[to]){ // unknown wrapper: keep its children
      walk(c); while(c.firstChild) par.insertBefore(c.firstChild,c); par.removeChild(c); c=nx; continue; }
    var n=document.createElement(to);
    if(to==='IMG'){ var src=c.getAttribute('src')||''; if(!/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(src)&&!/^https?:\/\//i.test(src)){ par.removeChild(c); c=nx; continue; }
      n.setAttribute('src',src); var w=parseInt(c.getAttribute('width')||(st&&st.width)||'',10); if(w>0) n.setAttribute('width',Math.min(w,1200)); if(/%$/.test(st&&st.width||'')) n.style.width=st.width; }
    else while(c.firstChild) n.appendChild(c.firstChild);
    if(/^(P|H1|H2|H3|BLOCKQUOTE|LI|TD|TH)$/.test(to)&&/^(center|right|justify)$/i.test(align)) n.style.textAlign=align.toLowerCase();
    if(/^(P|H1|H2|H3|BLOCKQUOTE|LI)$/.test(to)&&st){ var lh=parseFloat(st.lineHeight); if(/^[\d.]+$/.test(st.lineHeight||'')&&lh>=.8&&lh<=4) n.style.lineHeight=String(Math.round(lh*100)/100);
      var ml=pxOf(st.marginLeft); if(ml>=12) n.style.marginLeft=Math.min(360,Math.round(ml/36)*36||36)+'px'; }
    if(to==='A'){ n.setAttribute('href',safeUrl(c.getAttribute('href'))); }
    if(CLS[to]&&CLS[to].test(c.className||'')) n.className=c.className;
    if(to==='SPAN'&&n.className==='cm'){ n.setAttribute('data-cm',String(c.getAttribute('data-cm')||'').slice(0,400)); } if(to==='SPAN'&&n.className==='bm'){ n.setAttribute('data-bm',String(c.getAttribute('data-bm')||'').slice(0,40)); } if(to==='SPAN'&&n.className==='bl'){ n.setAttribute('data-bl',String(c.getAttribute('data-bl')||'').slice(0,40)); } if(to==='SPAN'&&n.className==='eq'){ n.setAttribute('data-eq',String(c.getAttribute('data-eq')||'').slice(0,300)); }
    if((to==='TD'||to==='TH')&&st){ var cbg=hex(st.backgroundColor); if(cbg&&cbg!=='FFFFFF') n.style.backgroundColor='#'+cbg; }
    if(to==='SPAN'){ if(size) n.style.fontSize=size+'px'; if(face) n.style.fontFamily=/\s/.test(face)?'"'+face+'"':face; if(bg&&bg!=='FFFFFF') n.style.backgroundColor='#'+bg; }
    var col=hex(color); if(col&&col!=='000000'&&/^(SPAN|B|I|U|S)$/.test(to)) n.style.color='#'+col;
    if((to==='TD'||to==='TH')&&c.getAttribute('colspan')) n.setAttribute('colspan',Math.min(10,+c.getAttribute('colspan')||1));
    var wrap=n;
    if(to==='SPAN'||to==='P'){ // inline styles become tags so the document stays simple
      if(bold){ var b=document.createElement('B'); while(wrap.firstChild) b.appendChild(wrap.firstChild); wrap.appendChild(b); }
      if(ital){ var i=document.createElement('I'); while(wrap.firstChild) i.appendChild(wrap.firstChild); wrap.appendChild(i); }
      if(/underline/.test(deco)){ var u=document.createElement('U'); while(wrap.firstChild) u.appendChild(wrap.firstChild); wrap.appendChild(u); }
      if(/line-through/.test(deco)){ var s=document.createElement('S'); while(wrap.firstChild) s.appendChild(wrap.firstChild); wrap.appendChild(s); }
      if(va==='super'||va==='sub'){ var v=document.createElement(va==='super'?'SUP':'SUB'); while(wrap.firstChild) v.appendChild(wrap.firstChild); wrap.appendChild(v); } }
    par.replaceChild(n,c); walk(n);
    if(to==='SPAN'&&!n.getAttribute('style')&&!n.className){ while(n.firstChild) par.insertBefore(n.firstChild,n); par.removeChild(n); }
    c=nx; } })(root);
  // loose text and inline pieces at the top level go into paragraphs
  var out=document.createElement('div'), p=null;
  Array.prototype.slice.call(root.childNodes).forEach(function(n){
    var block=n.nodeType===1&&/^(P|H1|H2|H3|BLOCKQUOTE|UL|OL|TABLE|HR)$/.test(n.tagName);
    if(block){ p=null; if(n.tagName==='P'&&/^(UL|OL|TABLE|H1|H2|H3|BLOCKQUOTE|P)$/.test((n.firstElementChild||{}).tagName||'')&&!n.textContent.replace(n.firstElementChild.textContent,'').trim()){ while(n.firstChild) out.appendChild(n.firstChild); } else out.appendChild(n); return; }
    if(n.nodeType===3&&!n.textContent.trim()&&!p) return;
    if(n.nodeType===1&&n.tagName==='LI'){ var ul=document.createElement('UL'); ul.appendChild(n); out.appendChild(ul); p=null; return; }
    if(!p){ p=document.createElement('P'); out.appendChild(p); } p.appendChild(n); });
  // nested <p> inside <p> (from DIV soup) flatten
  Array.prototype.slice.call(out.querySelectorAll('p p, h1 p, h2 p, h3 p, li p, td p, th p')).forEach(function(q){ var f=document.createDocumentFragment(); if(q.previousSibling) f.appendChild(document.createElement('br')); while(q.firstChild) f.appendChild(q.firstChild); q.parentNode.replaceChild(f,q); });
  Array.prototype.slice.call(out.querySelectorAll('td,th')).forEach(function(td){ if(!td.firstChild) td.appendChild(document.createElement('br')); });
  renderSpecial(out);
  return out.innerHTML; }

/* ---------- storage ---------- */
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function loadIdx(){ try{ var o=JSON.parse(localStorage.getItem(LS)||'null'); if(o&&Array.isArray(o.docs)) return o; }catch(e){} return {v:1,last:null,docs:[]}; }
var idx=loadIdx(), doc=null, saveT=null;
function readDoc(id){ try{ return localStorage.getItem(DOC+id)||''; }catch(e){ return ''; } }
function writeIdx(){ try{ localStorage.setItem(LS,JSON.stringify(idx)); return true; }catch(e){ return false; } }
function snap(){ return JSON.stringify({n:doc.name, f:doc.font||'', pg:doc.pg||null, h:page.innerHTML}); }
function saveNow(){ clearTimeout(saveT); saveT=null; if(!doc) return; doc.t=Date.now(); doc.name=$('docName').value.trim()||T('제목 없는 문서'); idx.last=doc.id;
  if(idx.docs.indexOf(doc)<0) idx.docs.unshift(doc);
  try{ localStorage.setItem(DOC+doc.id,page.innerHTML); localStorage.setItem(LS,JSON.stringify(idx)); $('saved').textContent=T('저장됨'); }
  catch(e){ $('saved').textContent=''; toast('저장 공간이 부족해서 저장하지 못했어요. 큰 그림을 줄이거나 지워 주세요'); }
  if(window.FFVer) FFVer.tick('docs.'+doc.id,snap); }
function saveSoon(){ $('saved').textContent=''; clearTimeout(saveT); saveT=setTimeout(saveNow,600); }
function isEmptyDoc(d){ return d&&!readDoc(d.id).replace(/<br>|<p><\/p>|<p><br><\/p>/g,'').trim()&&(!d.name||d.name===T('제목 없는 문서')); }
function openDoc(d){
  if(doc&&doc!==d){ saveNow(); if(isEmptyDoc(doc)){ var old=doc; idx.docs=idx.docs.filter(function(x){ return x!==old; }); try{ localStorage.removeItem(DOC+old.id); }catch(e){} } }
  doc=d; if(idx.docs.indexOf(d)<0) idx.docs.unshift(d);
  $('docName').value=d.name||''; page.innerHTML=clean(readDoc(d.id))||'<p><br></p>'; setFont(d.font||'sans',true); applyPg(); trkUI(); drawMemos();
  hist=[]; fut=[]; lastHist=0; updUR(); count(); saveNow(); }
function newDoc(name,html){ var d={id:uid(), name:name||T('제목 없는 문서'), t:Date.now()};
  try{ localStorage.setItem(DOC+d.id,html||''); }catch(e){ toast('저장 공간이 부족해요'); } idx.docs.unshift(d); openDoc(d); return d; }

/* ---------- undo (snapshots of the page) ---------- */
var hist=[], fut=[], lastHist=0;
function caretOffset(){ var s=getSelection(); if(!s.rangeCount||!page.contains(s.anchorNode)) return -1; var r=document.createRange(); r.selectNodeContents(page); r.setEnd(s.anchorNode,s.anchorOffset); return r.toString().length; }
function setCaret(off){ if(off<0) return; var w=document.createTreeWalker(page,NodeFilter.SHOW_TEXT), n, left=off;
  while((n=w.nextNode())){ if(n.length>=left){ var r=document.createRange(); r.setStart(n,left); r.collapse(true); var s=getSelection(); s.removeAllRanges(); s.addRange(r); return; } left-=n.length; } }
function mark(force){ var now=Date.now(); if(!force&&now-lastHist<900){ lastHist=now; return; } lastHist=now;
  var h=page.innerHTML; if(hist.length&&hist[hist.length-1].h===h) return; hist.push({h:h,c:caretOffset()}); if(hist.length>150) hist.shift(); fut=[]; updUR(); }
function back(from,to){ if(!from.length) return; to.push({h:page.innerHTML,c:caretOffset()}); var s=from.pop(); page.innerHTML=s.h; page.focus(); setCaret(s.c); lastHist=0; selImg(null); updUR(); count(); saveSoon(); }
function undo(){ back(hist,fut); } function redo(){ back(fut,hist); }
function updUR(){ $('undoBtn').disabled=!hist.length; $('redoBtn').disabled=!fut.length; }
page.addEventListener('beforeinput',function(e){ if(e.inputType==='historyUndo'){ e.preventDefault(); undo(); return; } if(e.inputType==='historyRedo'){ e.preventDefault(); redo(); return; } mark(/^(insertParagraph|insertFromPaste|deleteByCut|insertFromDrop)$/.test(e.inputType)); });
page.addEventListener('input',function(){ fixTop(); count(); saveSoon(); sync(); });

/* ---------- commands ---------- */
function inPage(){ var s=getSelection(); return s.rangeCount&&page.contains(s.getRangeAt(0).commonAncestorContainer); }
var savedRange=null;
function keepSel(){ if(inPage()) savedRange=getSelection().getRangeAt(0).cloneRange(); }
function backSel(){ if(inPage()) return; page.focus(); if(savedRange&&page.contains(savedRange.commonAncestorContainer)){ var s=getSelection(); s.removeAllRanges(); s.addRange(savedRange); } else setCaret(page.textContent.length); }
document.addEventListener('selectionchange',function(){ if(inPage()){ keepSel(); sync(); } });
function exec(cmd,val){ backSel(); mark(true); try{ document.execCommand('styleWithCSS',false,/^(foreColor|hiliteColor|fontName)$/.test(cmd)); }catch(e){} document.execCommand(cmd,false,val==null?null:val); fixTop(); count(); saveSoon(); sync(); }
function fixTop(){ // execCommand can leave bare text or DIVs at the top level; the caret stays where it was
  var c=-2, sel=getSelection(), an=sel.rangeCount?sel.anchorNode:null, ao=sel.rangeCount?sel.anchorOffset:0;
  Array.prototype.slice.call(page.childNodes).forEach(function(n){ var div=n.nodeType===1&&n.tagName==='DIV', txt=n.nodeType===3&&n.textContent.trim();
    if(!div&&!txt) return; if(c===-2) c=caretOffset(); var p=document.createElement('p');
    if(div){ while(n.firstChild) p.appendChild(n.firstChild); page.replaceChild(p,n); } else { page.replaceChild(p,n); p.appendChild(n); } });
  // Chrome sometimes puts a list inside the paragraph it came from (<p><ul>…</ul></p>): lift block pieces out to the top level
  Array.prototype.slice.call(page.children).forEach(function(n){ if(!/^(P|H1|H2|H3)$/.test(n.tagName)) return;
    var kids=Array.prototype.slice.call(n.childNodes); if(!kids.some(function(k){ return k.nodeType===1&&/^(UL|OL|TABLE|P|H1|H2|H3|BLOCKQUOTE|HR|DIV)$/.test(k.tagName); })) return;
    if(c===-2) c=caretOffset(); var f=document.createDocumentFragment(), cur=null;
    kids.forEach(function(k){ if(k.nodeType===1&&/^(UL|OL|TABLE|P|H1|H2|H3|BLOCKQUOTE|HR|DIV)$/.test(k.tagName)){ cur=null; if(k.tagName==='DIV'){ var q=document.createElement('p'); while(k.firstChild) q.appendChild(k.firstChild); k=q; } f.appendChild(k); }
      else { if(k.nodeType===3&&!k.textContent.trim()&&!cur) return; if(!cur){ cur=document.createElement(n.tagName); f.appendChild(cur); } cur.appendChild(k); } });
    page.replaceChild(f,n); });
  if(!page.firstChild){ page.innerHTML='<p><br></p>'; if(c===-2) c=0; an=null; }
  if(c>-2){ if(an&&page.contains(an)&&an!==page){ var r=document.createRange(); r.setStart(an,Math.min(ao,an.nodeType===3?an.length:an.childNodes.length)); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); } else setCaret(c); } }
try{ document.execCommand('defaultParagraphSeparator',false,'p'); }catch(e){}
Array.prototype.forEach.call(document.querySelectorAll('[data-cmd]'),function(b){ b.addEventListener('mousedown',function(e){ e.preventDefault(); }); b.onclick=function(){ exec(b.dataset.cmd); }; });
$('undoBtn').onclick=undo; $('redoBtn').onclick=redo;
$('blockSel').onchange=function(){ var v=this.value; exec('formatBlock','<'+v+'>'); };
$('colorIn').addEventListener('input',function(){ $('colorBar').style.background=this.value; });
$('colorIn').addEventListener('change',function(){ $('colorBar').style.background=this.value; exec('foreColor',this.value); });
$('colorIn').parentNode.addEventListener('mousedown',keepSel);
function setFont(f,quiet){ $('fontSel').value=f; page.classList.toggle('serif',f==='serif'); if(doc){ doc.font=f; if(!quiet){ writeIdx(); saveSoon(); } } }
$('fontSel').onchange=function(){ setFont(this.value); };
$('hrBtn').addEventListener('mousedown',function(e){ e.preventDefault(); });
$('hrBtn').onclick=function(){ var hr=document.createElement('hr'); putBlock(hr); setCaret(-1); var r=document.createRange(); r.selectNodeContents(hr.nextSibling); r.collapse(true); var s=getSelection(); s.removeAllRanges(); s.addRange(r); };
function curBlock(){ var s=getSelection(); if(!s.rangeCount) return null; var n=s.anchorNode; while(n&&n!==page){ if(n.nodeType===1&&/^(P|H1|H2|H3|BLOCKQUOTE|LI)$/.test(n.tagName)) return n; n=n.parentNode; } return null; }
function closest(tag){ var s=getSelection(); if(!s.rangeCount) return null; var n=s.anchorNode; while(n&&n!==page){ if(n.nodeType===1&&n.tagName===tag) return n; n=n.parentNode; } return null; }
function sync(){
  ['bold','italic','underline','strikeThrough','justifyLeft','justifyCenter','justifyRight','justifyFull','insertUnorderedList','insertOrderedList'].forEach(function(c){
    var b=document.querySelector('[data-cmd="'+c+'"]'), on=false; try{ on=inPage()&&document.queryCommandState(c); }catch(e){} if(b) b.classList.toggle('on',on); });
  var bl=curBlock(), t=bl?bl.tagName.toLowerCase():'p'; if(t==='li') t='p'; if(bl&&bl.closest&&bl.closest('blockquote')) t='blockquote'; $('blockSel').value=t;
  $('tblCtx').hidden=!(inPage()&&closest('TD')||inPage()&&closest('TH'));
  var s=getSelection(), el=inPage()&&s.anchorNode?(s.anchorNode.nodeType===1?s.anchorNode:s.anchorNode.parentNode):null;
  if(el&&page.contains(el)){ var cs=getComputedStyle(el), px=Math.round(parseFloat(cs.fontSize)); $('sizeSel').value=SIZES.indexOf(px)>=0?String(px):''; if(SIZES.indexOf(px)<0) $('sizeSel').options[0].textContent=px?String(px):T('크기'); else $('sizeSel').options[0].textContent=T('크기');
    var f=faceOf(cs.fontFamily); var own=el.closest('span[style*="font-family"]'); $('faceSel').value=own&&page.contains(own)?faceOf(own.style.fontFamily):'';
    var b2=curBlock(); $('lhSel').value=b2&&b2.style.lineHeight?b2.style.lineHeight:''; }
  ['superscript','subscript'].forEach(function(c){ var b=document.querySelector('[data-cmd="'+c+'"]'), on=false; try{ on=inPage()&&document.queryCommandState(c); }catch(e){} if(b) b.classList.toggle('on',on); }); }

/* ---------- selection as text offsets (survives DOM rewrites) ---------- */
function selOffsets(){ var s=getSelection(); if(!s.rangeCount||!inPage()) return null; var r=s.getRangeAt(0), a=document.createRange(); a.selectNodeContents(page);
  a.setEnd(r.startContainer,r.startOffset); var st=a.toString().length; a.setEnd(r.endContainer,r.endOffset); return [st,a.toString().length]; }
function pointAt(off){ var w=document.createTreeWalker(page,NodeFilter.SHOW_TEXT), n, left=off, last=null;
  while((n=w.nextNode())){ last=n; if(n.length>=left) return [n,left]; left-=n.length; } return last?[last,last.length]:[page,0]; }
function setSelOffsets(o){ if(!o) return; var a=pointAt(o[0]), b=pointAt(o[1]), r=document.createRange(); try{ r.setStart(a[0],a[1]); r.setEnd(b[0],b[1]); }catch(e){ return; } var s=getSelection(); s.removeAllRanges(); s.addRange(r); keepSel(); }
function raw(cmd,val){ try{ document.execCommand('styleWithCSS',false,/^(foreColor|hiliteColor|fontName)$/.test(cmd)); }catch(e){} document.execCommand(cmd,false,val==null?null:val); }
function after(){ fixTop(); count(); saveSoon(); sync(); }
function anchorEl(){ var s=getSelection(); if(!s.rangeCount) return null; var n=s.anchorNode; if(n&&n.nodeType!==1) n=n.parentNode; return n&&page.contains(n)?n:null; }
function spansInSel(prop){ var s=getSelection(); if(!s.rangeCount) return []; var r=s.getRangeAt(0);
  return Array.prototype.filter.call(page.querySelectorAll('span'),function(x){ return x.style[prop]&&r.intersectsNode(x); }); }
function unwrap(el){ var p=el.parentNode; while(el.firstChild) p.insertBefore(el.firstChild,el); p.removeChild(el); }

/* ---------- font, size, highlight ---------- */
(function(){ var fs=$('faceSel'); FACES.forEach(function(f){ var o=document.createElement('option'); o.value=f[0]; o.textContent=T(f[1]); o.style.fontFamily='"'+f[0]+'"'; fs.appendChild(o); });
  var o0=document.createElement('option'); o0.value='-'; o0.textContent=T('문서 글꼴로 되돌리기'); fs.appendChild(o0);
  var ss=$('sizeSel'); SIZES.forEach(function(n){ var o=document.createElement('option'); o.value=String(n); o.textContent=String(n); ss.appendChild(o); }); })();
['faceSel','sizeSel','lhSel','hiIn','colorIn'].forEach(function(id){ $(id).addEventListener('mousedown',keepSel); });
function applySize(px,noMark){ backSel(); var s=getSelection(); if(!s.rangeCount) return; if(!noMark) mark(true);
  if(s.isCollapsed){ var sp=document.createElement('span'); sp.style.fontSize=px+'px'; sp.textContent='\u200b'; var r=s.getRangeAt(0); r.insertNode(sp);
    var rr=document.createRange(); rr.setStart(sp.firstChild,1); rr.collapse(true); s.removeAllRanges(); s.addRange(rr); after(); return; }
  var o=selOffsets(); raw('fontSize','7');
  Array.prototype.slice.call(page.querySelectorAll('font[size="7"],span[style*="xxx-large"],span[style*="-webkit-xxx-large"]')).forEach(function(f){ var sp=document.createElement('span');
    if(f.tagName==='SPAN') sp.setAttribute('style',f.getAttribute('style')); if(f.getAttribute('color')) sp.style.color=f.getAttribute('color'); sp.style.fontSize=px+'px';
    while(f.firstChild) sp.appendChild(f.firstChild); f.parentNode.replaceChild(sp,f);
    Array.prototype.slice.call(sp.querySelectorAll('span,font')).forEach(function(x){ if(x.tagName==='FONT'){ x.removeAttribute('size'); if(!x.attributes.length) unwrap(x); return; } x.style.fontSize=''; if(!x.getAttribute('style')) unwrap(x); }); });
  setSelOffsets(o); after(); }
function curPx(){ var el=anchorEl(); return el?Math.round(parseFloat(getComputedStyle(el).fontSize))||15:15; }
function stepSize(d){ var px=curPx(), i; if(d>0){ for(i=0;i<SIZES.length&&SIZES[i]<=px;i++); applySize(SIZES[Math.min(i,SIZES.length-1)]); } else { for(i=SIZES.length-1;i>=0&&SIZES[i]>=px;i--); applySize(SIZES[Math.max(i,0)]); } }
$('sizeSel').onchange=function(){ var v=+this.value; if(v) applySize(v); page.focus(); };
['growBtn','shrinkBtn'].forEach(function(id){ $(id).addEventListener('mousedown',function(e){ e.preventDefault(); }); $(id).onclick=function(){ stepSize(id==='growBtn'?1:-1); }; });
$('faceSel').onchange=function(){ var v=this.value; backSel(); if(v==='-'){ mark(true); spansInSel('fontFamily').forEach(function(x){ x.style.fontFamily=''; if(!x.getAttribute('style')) unwrap(x); }); after(); }
  else if(v) exec('fontName',v); page.focus(); };
$('hiIn').addEventListener('input',function(){ $('hiBar').style.background=this.value; });
$('hiIn').addEventListener('change',function(){ var v=this.value; $('hiBar').style.background=v; if(/^#fff(fff)?$/i.test(v)){ backSel(); mark(true); raw('hiliteColor','transparent'); spansInSel('backgroundColor').forEach(function(x){ x.style.backgroundColor=''; if(!x.getAttribute('style')) unwrap(x); }); after(); } else exec('hiliteColor',v); });
$('hiIn').parentNode.title=T('형광펜 (흰색을 고르면 형광펜을 지워요)');

/* ---------- line spacing and indent (whole paragraphs) ---------- */
function blocksInSel(){ backSel(); var s=getSelection(); if(!s.rangeCount) return []; var r=s.getRangeAt(0), out=[];
  Array.prototype.forEach.call(page.querySelectorAll('p,h1,h2,h3,blockquote,li'),function(b){ if(r.intersectsNode(b)) out.push(b); });
  out=out.filter(function(b){ return !out.some(function(o){ return o!==b&&b.contains(o); }); });
  if(!out.length){ var c=curBlock(); if(c) out.push(c); } return out; }
$('lhSel').onchange=function(){ var v=this.value, bs=blocksInSel(); if(!bs.length) return; mark(true); bs.forEach(function(b){ b.style.lineHeight=v==='1.7'||!v?'':v; if(!b.getAttribute('style')) b.removeAttribute('style'); }); after(); page.focus(); };
function indent(d){ var bs=blocksInSel(); if(!bs.length) return; mark(true); var o=selOffsets();
  bs.forEach(function(b){ var m=(parseInt(b.style.marginLeft,10)||0)+d*36; m=Math.max(0,Math.min(360,m)); b.style.marginLeft=m?m+'px':''; if(!b.getAttribute('style')) b.removeAttribute('style'); });
  setSelOffsets(o); after(); }
['inBtn','outBtn'].forEach(function(id){ $(id).addEventListener('mousedown',function(e){ e.preventDefault(); }); $(id).onclick=function(){ indent(id==='inBtn'?1:-1); }; });
page.addEventListener('keydown',function(e){ if(e.key!=='Tab'||e.ctrlKey||e.metaKey||e.altKey) return; e.preventDefault();
  var cell=closest('TD')||closest('TH');
  if(cell&&!cell.closest('table.tb')){ var cells=Array.prototype.slice.call(cell.closest('table').querySelectorAll('td,th')), i=cells.indexOf(cell)+(e.shiftKey?-1:1);
    if(i>=cells.length&&!e.shiftKey){ var tr=cell.parentNode, nr=document.createElement('tr'); mark(true); for(var k=0;k<tr.children.length;k++){ var td=document.createElement('td'); td.innerHTML='<br>'; nr.appendChild(td); } tr.parentNode.appendChild(nr); cells.push(nr.firstChild); saveSoon(); }
    var to=cells[Math.max(0,Math.min(cells.length-1,i))], r=document.createRange(); r.selectNodeContents(to); r.collapse(false); var s=getSelection(); s.removeAllRanges(); s.addRange(r); sync(); return; }
  var s2=getSelection(), bl=curBlock(), atStart=false; if(bl&&s2.isCollapsed){ var rr=document.createRange(); rr.selectNodeContents(bl); rr.setEnd(s2.anchorNode,s2.anchorOffset); atStart=!rr.toString().length; }
  if(e.shiftKey) indent(-1); else if(!s2.isCollapsed||atStart||closest('LI')) indent(1); else exec('insertText','\u2003\u2003'); });

/* ---------- format painter ---------- */
var painter=null;
function qs(c){ try{ return document.queryCommandState(c); }catch(e){ return false; } }
function rgbHex(c){ var h=hex(c); return h?'#'+h:null; }
$('paintBtn').addEventListener('mousedown',function(e){ e.preventDefault(); });
$('paintBtn').onclick=function(){ if(painter){ stopPaint(); return; } backSel(); var el=anchorEl(); if(!el){ toast('먼저 모양을 따올 글자 안을 누르세요'); return; }
  var cs=getComputedStyle(el), bgS=el.closest('span[style*="background"]'), fcS=el.closest('span[style*="font-family"]');
  var bk=curBlock(); painter={blk:bk&&bk.tagName,al:bk&&bk.style.textAlign||'',pbc:bk?bk.className:'',b:qs('bold'),i:qs('italic'),u:qs('underline'),s:qs('strikeThrough'),sup:qs('superscript'),sub:qs('subscript'),color:rgbHex(cs.color),px:Math.round(parseFloat(cs.fontSize)),
    face:fcS&&page.contains(fcS)?faceOf(fcS.style.fontFamily):'', bg:bgS&&page.contains(bgS)?rgbHex(bgS.style.backgroundColor):null};
  $('paintBtn').classList.add('on'); document.body.classList.add('painting'); toast('서식을 입힐 글자를 끌어서 고르세요 (Esc로 그만)'); };
function stopPaint(){ painter=null; $('paintBtn').classList.remove('on'); document.body.classList.remove('painting'); }
page.addEventListener('mouseup',function(){ if(!painter) return; setTimeout(function(){ var s=getSelection(); if(!s.rangeCount||s.isCollapsed||!inPage()) return; var f=painter; stopPaint(); mark(true); var tb0=curBlock(); if(tb0&&f.blk&&/^(P|H1|H2|H3|BLOCKQUOTE)$/.test(tb0.tagName)&&/^(P|H1|H2|H3|BLOCKQUOTE)$/.test(f.blk)){ if(tb0.tagName!==f.blk) raw('formatBlock','<'+f.blk.toLowerCase()+'>'); tb0=curBlock()||tb0; tb0.style.textAlign=f.al||''; if(!tb0.getAttribute('style')) tb0.removeAttribute('style'); var pc=(f.pbc||'').split(' ').filter(function(x){ return /^pb[xgl]$/.test(x); }); tb0.className=(tb0.className||'').split(' ').filter(function(x){ return x&&!/^pb[xgl]$/.test(x); }).concat(pc).join(' '); if(!tb0.className) tb0.removeAttribute('class'); }
  [['bold','b'],['italic','i'],['underline','u'],['strikeThrough','s'],['superscript','sup'],['subscript','sub']].forEach(function(c){ if(qs(c[0])!==f[c[1]]) raw(c[0]); });
  if(f.color) raw('foreColor',f.color); if(f.face) raw('fontName',f.face); if(f.bg) raw('hiliteColor',f.bg); fixTop();
  if(f.px&&f.px!==curPx()) applySize(f.px,true); after(); toast('서식을 입혔어요'); },0); });

/* ---------- find and replace ---------- */
var fm=[], fi=-1, fT=null, HL=!!(window.CSS&&CSS.highlights&&typeof Highlight!=='undefined');
function fSearch(){ fm=[]; var q=$('fQ').value; if(q){ var cs=$('fCase').checked, qq=cs?q:q.toLowerCase(), w=document.createTreeWalker(page,NodeFilter.SHOW_TEXT), n;
    while((n=w.nextNode())){ var t=cs?n.data:n.data.toLowerCase(), i=0; while((i=t.indexOf(qq,i))>=0){ var r=document.createRange(); r.setStart(n,i); r.setEnd(n,i+q.length); fm.push(r); i+=q.length; } } }
  if(fi>=fm.length) fi=fm.length-1; fPaint(); }
function fPaint(){ $('fN').textContent=!$('fQ').value?'':fm.length?(fi>=0?(fi+1)+'/':'')+fm.length:T('없음');
  if(!HL) return; var a=new Highlight(), c=new Highlight(); fm.forEach(function(r,i){ (i===fi?c:a).add(r); }); CSS.highlights.set('ffind',a); CSS.highlights.set('ffcur',c); }
function fGo(d){ if(!fm.length) return; fi=fi<0?(d>0?0:fm.length-1):(fi+d+fm.length)%fm.length; fPaint();
  var rc=fm[fi].getBoundingClientRect(), dk=$('desk').getBoundingClientRect(); if(rc.top<dk.top+40||rc.bottom>dk.bottom-40) $('desk').scrollTop+=rc.top-dk.top-dk.height/3;
  if(!HL){ var s=getSelection(); s.removeAllRanges(); s.addRange(fm[fi]); } }
function openFind(rep){ var bar=$('findBar'); bar.hidden=false; var s=getSelection(); if(inPage()&&!s.isCollapsed&&s.toString().length<80&&!/\n/.test(s.toString())) $('fQ').value=s.toString();
  fi=-1; fSearch(); fGo(1); setTimeout(function(){ (rep&&$('fQ').value?$('fR'):$('fQ')).focus(); (rep&&$('fQ').value?$('fR'):$('fQ')).select(); },20); }
function closeFind(){ $('findBar').hidden=true; fm=[]; fi=-1; if(HL){ CSS.highlights.delete('ffind'); CSS.highlights.delete('ffcur'); } }
$('findBtn').onclick=function(){ if($('findBar').hidden) openFind(); else closeFind(); };
$('fClose').onclick=closeFind;
$('fQ').addEventListener('input',function(){ fi=-1; fSearch(); fGo(1); });
$('fCase').onchange=function(){ fi=-1; fSearch(); fGo(1); };
$('fQ').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); fGo(e.shiftKey?-1:1); } if(e.key==='Escape'){ e.stopPropagation(); closeFind(); page.focus(); } });
$('fR').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); $('fRep').click(); } if(e.key==='Escape'){ e.stopPropagation(); closeFind(); page.focus(); } });
$('fPrev').onclick=function(){ fGo(-1); }; $('fNext').onclick=function(){ fGo(1); };
function repRange(r,t){ r.deleteContents(); if(t) r.insertNode(document.createTextNode(t)); }
$('fRep').onclick=function(){ if(!fm.length) return; if(fi<0){ fGo(1); return; } mark(true); var at=fi; repRange(fm[fi],$('fR').value); page.normalize(); fSearch(); fi=fm.length?Math.min(at,fm.length-1)-1:-1; fGo(1); count(); saveSoon(); };
$('fAll').onclick=function(){ if(!fm.length) return; mark(true); var n=fm.length, t=$('fR').value; for(var i=fm.length-1;i>=0;i--) repRange(fm[i],t); page.normalize(); fi=-1; fSearch(); count(); saveSoon(); toast(F('{0}곳을 바꿨어요 · Ctrl+Z로 되돌리기',n)); };
page.addEventListener('input',function(){ if($('findBar').hidden) return; clearTimeout(fT); fT=setTimeout(fSearch,250); });

/* ---------- insert menu: link, symbols, date, contents, notes, captions, box, page break ---------- */
$('insBtn').addEventListener('mousedown',function(e){ e.preventDefault(); keepSel(); });
$('insBtn').onclick=function(){ popMenu($('insMenu'),this); };
$('layBtn').addEventListener('mousedown',function(e){ e.preventDefault(); keepSel(); });
var linkA=null, linkR=null;
function openLink(){ backSel(); var s=getSelection(); linkR=s.rangeCount?s.getRangeAt(0).cloneRange():null; linkA=closest('A');
  $('lUrl').value=linkA?linkA.getAttribute('href'):''; $('lTxtL').hidden=!!(linkA||linkR&&!linkR.collapsed); $('lTxt').value=''; $('lDel').hidden=!linkA; $('lOk').textContent=T(linkA?'바꾸기':'넣기');
  openDlg('linkDlg'); setTimeout(function(){ $('lUrl').focus(); },30); }
function backTo(r){ page.focus(); if(r&&page.contains(r.commonAncestorContainer)){ var s=getSelection(); s.removeAllRanges(); s.addRange(r); } }
$('lOk').onclick=function(){ var u=safeUrl($('lUrl').value); if(!u){ toast('https:// 로 시작하는 주소를 넣어 주세요'); $('lUrl').focus(); return; } closeDlg('linkDlg'); backTo(linkR); mark(true);
  if(linkA&&page.contains(linkA)) linkA.setAttribute('href',u);
  else if(linkR&&!linkR.collapsed) raw('createLink',u);
  else raw('insertHTML','<a href="'+esc(u)+'">'+esc($('lTxt').value.trim()||u)+'</a>\u00a0');
  after(); };
$('lDel').onclick=function(){ closeDlg('linkDlg'); if(linkA&&page.contains(linkA)){ mark(true); unwrap(linkA); after(); } };
['lUrl','lTxt'].forEach(function(id){ $(id).addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); $('lOk').click(); } }); });
page.addEventListener('click',function(e){ var a=e.target.closest&&e.target.closest('a'); if(a&&(e.ctrlKey||e.metaKey)&&page.contains(a)){ e.preventDefault(); var u=safeUrl(a.getAttribute('href')); if(u) window.open(u,'_blank','noopener'); } });
var SYMS=[['기호','※ ☆ ★ ○ ● ◎ ◇ ◆ □ ■ △ ▲ ▽ ▼ → ← ↑ ↓ ↔ ⇒ ⇔ ♠ ♣ ♥ ♦ ♪ ♬ ☎ ✓ ✔ ✗ ✘ ☀ ☁ ☂ ☃ ♨ ✂ ✉ ☞ ☜ ❤'],['수학','± × ÷ ≠ ≤ ≥ ≈ ∞ √ ∑ ∏ ∫ ∂ ∆ ∇ ∈ ∉ ⊂ ⊃ ∪ ∩ ∴ ∵ ∠ ⊥ ° ′ ″ ‰ ½ ⅓ ¼ ¾ ¹ ² ³ ⁿ π'],
  ['그리스 문자','α β γ δ ε ζ η θ λ μ ν ξ ρ σ τ φ χ ψ ω Γ Δ Θ Λ Π Σ Φ Ψ Ω'],['단위·돈','℃ ℉ ㎜ ㎝ ㎞ ㎡ ㎥ ㎖ ℓ ㎏ ㎎ ㎐ ₩ $ € £ ¥ ¢ © ® ™ § ¶ † ‡ № ㈜'],
  ['괄호·번호','「 」 『 』 【 】 〈 〉 《 》 ① ② ③ ④ ⑤ ⑥ ⑦ ⑧ ⑨ ⑩ ⑴ ⑵ ⑶ ㉠ ㉡ ㉢ ㉣ ⓐ ⓑ ⓒ Ⅰ Ⅱ Ⅲ Ⅳ Ⅴ ⅰ ⅱ ⅲ · • … ― 〜']];
(function(){ var g=$('symGrid'); SYMS.forEach(function(gr){ var h=document.createElement('b'); h.textContent=T(gr[0]); g.appendChild(h);
  gr[1].split(' ').forEach(function(ch){ var b=document.createElement('button'); b.type='button'; b.textContent=ch; b.onclick=function(){ closeDlg('symDlg'); backTo(symR); exec('insertText',ch); }; g.appendChild(b); }); }); })();
var symR=null;
function topOf(n){ while(n&&n.parentNode!==page) n=n.parentNode; return n&&n.parentNode===page?n:null; }
function insertAfterTop(el){ backSel(); var s=getSelection(), t=topOf(s.rangeCount?s.anchorNode:null); page.insertBefore(el,t?t.nextSibling:null); return el; }
function caretIn(el,end){ var r=document.createRange(); r.selectNodeContents(el); r.collapse(!end); var s=getSelection(); s.removeAllRanges(); s.addRange(r); }
function today(){ var d=new Date(), l=(window.FFT&&FFT.lang)||'ko'; return l==='ko'?d.getFullYear()+'년 '+(d.getMonth()+1)+'월 '+d.getDate()+'일':d.toLocaleDateString(l==='nw'||l==='au'?'en':l,{year:'numeric',month:'long',day:'numeric'}); }
function nowTime(){ var d=new Date(), l=(window.FFT&&FFT.lang)||'ko'; return d.toLocaleTimeString(l==='nw'||l==='au'?'en':l,{hour:'numeric',minute:'2-digit'}); }
function pgSize(){ var g=pg(), sz=PAPER[g.paper]||PAPER.A4; return g.land?[sz[1],sz[0]]:sz; }
function pageNo(el){ // which printed page a block lands on (an estimate from the screen layout)
  var pr=page.getBoundingClientRect(), pad=parseFloat(getComputedStyle(page).paddingTop)||0, usable=Math.max(200,pgSize()[1]-2*(MAR[pg().mar]||96)), pbs=page.querySelectorAll('hr.pb'), n=1, from=pr.top+pad, y=el.getBoundingClientRect().top;
  Array.prototype.forEach.call(pbs,function(h){ var r=h.getBoundingClientRect(); if(r.top<y){ n+=1+Math.floor(Math.max(0,r.top-from)/usable); from=r.bottom; } });
  return n+Math.floor(Math.max(0,y-from)/usable); }
function makeToc(){ var hs=Array.prototype.slice.call(page.querySelectorAll('h1,h2,h3')); if(!hs.length){ toast('먼저 문단 모양에서 제목 1, 2, 3으로 제목을 만들어 주세요'); return; }
  mark(true); var old=page.querySelectorAll('p.toc'), at=old.length?old[0]:null, f=document.createDocumentFragment(), rows=[];
  var tt=document.createElement('p'); tt.className='toc tt'; tt.textContent=T('목차'); f.appendChild(tt);
  hs.forEach(function(h){ var p=document.createElement('p'); p.className='toc'; var lv=+h.tagName[1]-1; if(lv) p.style.marginLeft=lv*24+'px'; p.textContent=h.textContent.trim()||'…'; f.appendChild(p); rows.push([p,h]); });
  var last=f.lastChild;
  if(at){ page.insertBefore(f,at); Array.prototype.forEach.call(old,function(o){ o.remove(); }); } else { insertAfterTop(document.createElement('span')).replaceWith(f); }
  if(!last.nextSibling){ var q=document.createElement('p'); q.innerHTML='<br>'; page.appendChild(q); }
  rows.forEach(function(r){ r[0].textContent=r[0].textContent+' \u00b7\u00b7\u00b7 '+pageNo(r[1]); });
  after(); toast('목차를 만들었어요. 쪽 번호는 대략이에요 · 다시 누르면 새로 만들어요'); }
function renumberNotes(){ var refs=Array.prototype.filter.call(page.querySelectorAll('sup.fr'),function(x){ return !x.closest('p.fn'); }), notes={}, hr=page.querySelector('hr.fn');
  Array.prototype.forEach.call(page.querySelectorAll('p.fn'),function(p){ var k=p.querySelector('sup.fr'); if(k) notes[k.textContent]=p; });
  var order=[]; refs.forEach(function(r,i){ var p=notes[r.textContent]; r.textContent=String(i+1); if(p&&order.indexOf(p)<0){ order.push(p); p.querySelector('sup.fr').textContent=String(i+1); } });
  if(hr){ var at=hr.nextSibling; order.forEach(function(p){ page.insertBefore(p,at); at=p.nextSibling; }); } }
var fnR=null;
$('fnOk').onclick=function(){ var t=$('fnTxt').value.trim(); if(!t){ $('fnTxt').focus(); return; } closeDlg('fnDlg'); backTo(fnR); mark(true);
  var n=page.querySelectorAll('p.fn').length+1, sg=getSelection(), ref0=document.createElement('sup'); ref0.className='fr'; ref0.textContent=String(n);
  if(sg.rangeCount&&inPage()){ var rg=sg.getRangeAt(0); rg.collapse(false); rg.insertNode(ref0); rg.setStartAfter(ref0); rg.collapse(true); sg.removeAllRanges(); sg.addRange(rg); }
  var hr=page.querySelector('hr.fn'); if(!hr){ hr=document.createElement('hr'); hr.className='fn'; page.appendChild(hr); }
  var p=document.createElement('p'); p.className='fn'; p.innerHTML='<sup class="fr">'+n+'</sup> '+esc(t); var ps=page.querySelectorAll('p.fn'); var ref=ps.length?ps[ps.length-1]:hr; page.insertBefore(p,ref.nextSibling);
  renumberNotes(); after(); };
function caption(kind){ backSel(); var s=getSelection(), t=topOf(s.rangeCount?s.anchorNode:null); if(!t){ toast('그림이나 표 아래를 먼저 누르세요'); return; }
  mark(true); var re=kind==='img'?/^그림 \d+\./:/^표 \d+\./, n=Array.prototype.filter.call(page.children,function(c){ return re.test(c.textContent.trim()); }).length+1;
  var p=document.createElement('p'); p.style.textAlign='center'; var i=document.createElement('i'); i.textContent=(kind==='img'?T('그림'):T('표'))+' '+n+'.\u00a0'; p.appendChild(i); page.insertBefore(p,t.nextSibling); caretIn(i,true); after(); }
function insBox(){ var tb=document.createElement('table'); tb.className='tb'; tb.innerHTML='<tbody><tr><td><br></td></tr></tbody>'; putBlock(tb); caretIn(tb.rows[0].cells[0]); sync(); }
function insBreak(){ var hr=document.createElement('hr'); hr.className='pb'; putBlock(hr); var n=hr.nextSibling; if(n) caretIn(n); sync(); }
Array.prototype.forEach.call(document.querySelectorAll('[data-n]'),function(b){ b.onclick=function(){ closeMenus(); var k=b.dataset.n;
  if(k==='link') openLink();
  else if(k==='sym'){ backSel(); var s=getSelection(); symR=s.rangeCount?s.getRangeAt(0).cloneRange():null; openDlg('symDlg'); }
  else if(k==='date'){ backSel(); exec('insertText',today()); } else if(k==='time'){ backSel(); exec('insertText',nowTime()); }
  else if(k==='toc') makeToc();
  else if(k==='fn'){ backSel(); var s2=getSelection(); fnR=s2.rangeCount?s2.getRangeAt(0).cloneRange():null; if(fnR) fnR.collapse(false); $('fnTxt').value=''; openDlg('fnDlg'); setTimeout(function(){ $('fnTxt').focus(); },30); }
  else if(k==='capImg') caption('img'); else if(k==='capTbl') caption('tbl');
  else if(k==='box') insBox(); else if(k==='pb') insBreak(); else if(k==='ocr') openOcr(); }; });

/* ---------- page setup: paper, margins, columns, header, footer, page numbers, watermark ---------- */
var PAPER={A4:[794,1123],A5:[559,794],B5:[665,945],Letter:[816,1056],Legal:[816,1344]}, MAR={n:96,s:48,m:72,w:120}, PNL={bc:'아래 가운데',br:'아래 오른쪽',bl:'아래 왼쪽',tr:'위 오른쪽'};
function pg(){ return (doc&&doc.pg)||{}; }
function cssStr(t){ return '"'+String(t||'').replace(/[\\"]/g,'\\$&').replace(/[\r\n]+/g,' ')+'"'; }
function applyPg(){ applySty(); var g=pg(), sz=pgSize(), m=MAR[g.mar]||96, mm=Math.round(m*25.4/96*10)/10;
  page.style.setProperty('--pw',sz[0]+'px'); page.style.setProperty('--ph',sz[1]+'px'); page.style.setProperty('--pm',m+'px');
  page.classList.toggle('cols2',+g.cols===2); page.classList.toggle('cols3',+g.cols===3);
  var hd=$('hdBand'), ft=$('ftBand'); [hd,ft].forEach(function(b){ b.style.width=sz[0]+'px'; b.innerHTML=''; });
  function sp(b,t){ var x=document.createElement('span'); x.textContent=t||''; b.appendChild(x); }
  sp(hd,g.hd?T('머리글')+': '+g.hd:''); sp(hd,g.pn==='tr'?T('쪽 번호'):''); hd.hidden=!(g.hd||g.pn==='tr');
  sp(ft,g.ft?T('바닥글')+': '+g.ft:''); sp(ft,g.pn&&g.pn!=='tr'?T('쪽 번호')+' ('+T(PNL[g.pn])+')':''); ft.hidden=!(g.ft||g.pn&&g.pn!=='tr');
  if(g.wm){ var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+sz[0]+'" height="'+sz[1]+'"><text x="50%" y="50%" transform="rotate(-35 '+sz[0]/2+' '+sz[1]/2+')" text-anchor="middle" dominant-baseline="middle" font-family="Noto Sans KR,Malgun Gothic,sans-serif" font-weight="700" font-size="'+Math.round(Math.min(150,sz[0]*.9/Math.max(2,String(g.wm).length)))+'" fill="rgba(0,0,0,0.07)">'+esc(g.wm)+'</text></svg>';
    page.style.backgroundImage='url("data:image/svg+xml,'+encodeURIComponent(svg)+'")'; page.style.backgroundRepeat='repeat-y'; page.style.backgroundSize=sz[0]+'px '+sz[1]+'px'; page.style.backgroundPosition='center top'; }
  else { page.style.backgroundImage=''; page.style.backgroundRepeat=''; page.style.backgroundSize=''; page.style.backgroundPosition=''; }
  var box=function(pos,content){ return '@'+pos+'{content:'+content+'; font-family:"Noto Sans KR","Malgun Gothic",sans-serif; font-size:9pt; color:#555;}'; }, boxes='';
  if(g.hd) boxes+=box('top-center',cssStr(g.hd)); if(g.pn==='tr') boxes+=box('top-right','counter(page)');
  if(g.ft) boxes+=box(g.pn==='bc'?'bottom-left':'bottom-center',cssStr(g.ft));
  if(g.pn==='bc') boxes+=box('bottom-center','counter(page)'); if(g.pn==='br') boxes+=box('bottom-right','counter(page)'); if(g.pn==='bl') boxes+=box('bottom-left','counter(page)');
  var st=$('pgCss'); if(!st){ st=document.createElement('style'); st.id='pgCss'; document.head.appendChild(st); }
  st.textContent='@media print{ @page{ size:'+(g.paper||'A4')+' '+(g.land?'landscape':'portrait')+'; margin:'+mm+'mm; '+boxes+' } #page{ background-size:100% auto!important; } }';
  $('hint').textContent=(g.paper||'A4')+' · '+T(g.land?'가로':'세로')+(+g.cols>1?' · '+F('{0}단',g.cols):''); }
$('layBtn').onclick=function(){ var g=pg(); $('pgPaper').value=g.paper||'A4'; $('pgLand').value=g.land?'1':'0'; $('pgMar').value=g.mar||'n'; $('pgCols').value=String(g.cols||1);
  $('pgHd').value=g.hd||''; $('pgFt').value=g.ft||''; $('pgPn').value=g.pn||''; $('pgWm').value=g.wm||''; openDlg('layDlg'); };
$('pgOk').onclick=function(){ if(!doc) return; doc.pg={paper:$('pgPaper').value, land:$('pgLand').value==='1'?1:0, mar:$('pgMar').value, cols:+$('pgCols').value||1,
    hd:$('pgHd').value.trim().slice(0,120), ft:$('pgFt').value.trim().slice(0,120), pn:$('pgPn').value, wm:$('pgWm').value.trim().slice(0,30)};
  closeDlg('layDlg'); applyPg(); writeIdx(); saveNow(); toast('쪽 설정을 바꿨어요'); };

/* ---------- tables ---------- */
function openDlg(id){ $(id).classList.add('open'); } function closeDlg(id){ $(id).classList.remove('open'); }
Array.prototype.forEach.call(document.querySelectorAll('.ov'),function(ov){ ov.addEventListener('mousedown',function(e){ if(e.target===ov) ov.classList.remove('open'); });
  Array.prototype.forEach.call(ov.querySelectorAll('[data-close]'),function(b){ b.onclick=function(){ ov.classList.remove('open'); if(ov.id==='aiDlg') stopAI(); }; }); });
$('tblBtn').addEventListener('mousedown',function(e){ e.preventDefault(); keepSel(); });
$('tblBtn').onclick=function(){ openDlg('tblDlg'); setTimeout(function(){ $('tRows').select(); },30); };
$('tOk').onclick=function(){ var r=Math.max(1,Math.min(40,parseInt($('tRows').value,10)||3)), c=Math.max(1,Math.min(10,parseInt($('tCols').value,10)||3)), h='<table><tbody>';
  for(var i=0;i<r;i++){ h+='<tr>'; for(var j=0;j<c;j++) h+=(i===0&&$('tHead').checked?'<th><br></th>':'<td><br></td>'); h+='</tr>'; }
  closeDlg('tblDlg'); var box=document.createElement('div'); box.innerHTML=h+'</tbody></table>'; var tb=box.firstChild; putBlock(tb);
  var r=document.createRange(); r.selectNodeContents(tb.rows[0].cells[0]); r.collapse(true); var s=getSelection(); s.removeAllRanges(); s.addRange(r); sync(); };
/* a block (table, line) goes after the paragraph with the caret; an empty paragraph is replaced. A paragraph follows so there is somewhere to type */
function putBlock(el){ backSel(); mark(true); var s=getSelection(), n=s.rangeCount?s.anchorNode:null; while(n&&n.parentNode!==page) n=n.parentNode;
  if(n&&n.nodeType===1&&/^(P|H1|H2|H3)$/.test(n.tagName)&&!n.textContent.trim()&&!n.querySelector('img')) page.replaceChild(el,n); else page.insertBefore(el,n?n.nextSibling:null);
  if(!el.nextSibling||!/^(P|H1|H2|H3)$/.test(el.nextSibling.tagName||'')){ var p=document.createElement('p'); p.innerHTML='<br>'; page.insertBefore(p,el.nextSibling); }
  count(); saveSoon(); }
['tRows','tCols'].forEach(function(id){ $(id).onkeydown=function(e){ if(e.key==='Enter') $('tOk').click(); }; });
Array.prototype.forEach.call(document.querySelectorAll('[data-t]'),function(b){ b.addEventListener('mousedown',function(e){ e.preventDefault(); }); b.onclick=function(){
  var cell=closest('TD')||closest('TH'); if(!cell) return; var tr=cell.parentNode, tbl=cell.closest('table'), ci=Array.prototype.indexOf.call(tr.children,cell); mark(true);
  var a=b.dataset.t;
  if(a==='rowAdd'){ var nr=document.createElement('tr'); for(var i=0;i<tr.children.length;i++){ var td=document.createElement('td'); td.innerHTML='<br>'; nr.appendChild(td); } tr.parentNode.insertBefore(nr,tr.nextSibling); }
  else if(a==='colAdd'){ Array.prototype.forEach.call(tbl.rows,function(row){ var ref=row.children[ci], n=document.createElement(ref&&ref.tagName==='TH'?'th':'td'); n.innerHTML='<br>'; row.insertBefore(n,ref?ref.nextSibling:null); }); }
  else if(a==='rowDel'){ if(tbl.rows.length<=1) tbl.remove(); else tr.remove(); }
  else if(a==='colDel'){ if(tr.children.length<=1) tbl.remove(); else Array.prototype.forEach.call(tbl.rows,function(row){ if(row.children[ci]) row.children[ci].remove(); }); }
  else if(a==='del'){ var p=document.createElement('p'); p.innerHTML='<br>'; tbl.parentNode.replaceChild(p,tbl); setCaret(0); }
  count(); saveSoon(); sync(); }; });

/* ---------- pictures ---------- */
var imgSel=null;
function selImg(img){ if(imgSel) imgSel.classList.remove('sel'); imgSel=img; if(img) img.classList.add('sel'); $('imgCtx').hidden=!img; }
page.addEventListener('click',function(e){ selImg(e.target.tagName==='IMG'?e.target:null); });
Array.prototype.forEach.call(document.querySelectorAll('[data-i]'),function(b){ b.onclick=function(){ if(!imgSel) return; mark(true);
  if(b.dataset.i==='del'){ imgSel.remove(); selImg(null); } else { imgSel.style.width=b.dataset.i+'%'; imgSel.removeAttribute('width'); }
  count(); saveSoon(); }; });
$('imgBtn').addEventListener('mousedown',function(e){ e.preventDefault(); keepSel(); });
$('objBtn').onclick=function(){ FFOBJ.open(function(f){ shrink(f).then(function(o){ exec('insertHTML','<img src="'+o.src+'" width="'+Math.min(o.w,220)+'">'); var im=[].filter.call(page.querySelectorAll('img'),function(x){ return x.getAttribute('src')===o.src; }).pop(); if(im){ var r=document.createRange(); r.selectNode(im); var sl=window.getSelection(); sl.removeAllRanges(); sl.addRange(r); } },function(){ toast('그림을 넣지 못했어요'); }); }); };
$('imgBtn').onclick=function(){ $('imgFile').value=''; $('imgFile').click(); };
function shrink(file){ return new Promise(function(res,rej){ var fr=new FileReader(); fr.onerror=rej; fr.onload=function(){ var im=new Image(); im.onerror=rej; im.onload=function(){
    var w=im.naturalWidth, h=im.naturalHeight, k=Math.min(1,1200/w); var cv=document.createElement('canvas'); cv.width=Math.round(w*k); cv.height=Math.round(h*k);
    var g=cv.getContext('2d'); var png=/png|gif|webp|svg/.test(file.type); if(!png){ g.fillStyle='#fff'; g.fillRect(0,0,cv.width,cv.height); } g.drawImage(im,0,0,cv.width,cv.height);
    res({src:cv.toDataURL(png?'image/png':'image/jpeg',.85), w:cv.width}); }; im.src=fr.result; }; fr.readAsDataURL(file); }); }
$('imgFile').onchange=function(){ var f=this.files[0]; if(!f) return; shrink(f).then(function(o){ exec('insertHTML','<img src="'+o.src+'" width="'+Math.min(o.w,602)+'">'); },function(){ toast('그림을 열지 못했어요'); }); };
page.addEventListener('paste',function(e){ var d=e.clipboardData; if(!d) return;
  var file=Array.prototype.filter.call(d.files||[],function(f){ return /^image\//.test(f.type); })[0];
  if(file){ e.preventDefault(); shrink(file).then(function(o){ exec('insertHTML','<img src="'+o.src+'" width="'+Math.min(o.w,602)+'">'); }); return; }
  var html=d.getData('text/html'), txt=d.getData('text/plain'); e.preventDefault(); mark(true);
  if(html) document.execCommand('insertHTML',false,clean(html));
  else document.execCommand('insertText',false,txt); fixTop(); count(); saveSoon(); });
page.addEventListener('drop',function(e){ var f=e.dataTransfer&&e.dataTransfer.files[0]; if(f&&/^image\//.test(f.type)){ e.preventDefault(); shrink(f).then(function(o){ exec('insertHTML','<img src="'+o.src+'" width="'+Math.min(o.w,602)+'">'); }); } });

/* ---------- keys ---------- */
document.addEventListener('keydown',function(e){ var k=e.key.toLowerCase(), m=e.ctrlKey||e.metaKey;
  if(e.key==='Escape'){ closeMenus(); Array.prototype.forEach.call(document.querySelectorAll('.ov.open'),function(o){ o.classList.remove('open'); }); stopAI(); if(painter) stopPaint(); if(!$('findBar').hidden&&document.activeElement===page) closeFind(); return; }
  if(!m) { if((e.key==='Delete'||e.key==='Backspace')&&imgSel&&document.activeElement===page&&getSelection().isCollapsed){ e.preventDefault(); mark(true); imgSel.remove(); selImg(null); saveSoon(); } return; }
  if(k==='z'&&!e.shiftKey){ e.preventDefault(); undo(); } else if(k==='y'||(k==='z'&&e.shiftKey)){ e.preventDefault(); redo(); }
  else if(k==='s'){ e.preventDefault(); saveNow(); toast('저장했어요'); }
  else if(k==='p'){ e.preventDefault(); doExport('pdf'); }
  else if(k==='f'||k==='h'){ e.preventDefault(); openFind(k==='h'); }
  else if(k==='k'&&document.activeElement===page){ e.preventDefault(); openLink(); }
  else if(e.key==='Enter'&&document.activeElement===page){ e.preventDefault(); insBreak(); }
  else if((e.key===']'||e.key==='[')&&document.activeElement===page){ e.preventDefault(); stepSize(e.key===']'?1:-1); }
  else if(document.activeElement===page&&(k==='b'||k==='i'||k==='u')){ e.preventDefault(); exec({b:'bold',i:'italic',u:'underline'}[k]); }
  else if(document.activeElement===page&&e.altKey&&/^[123]$/.test(e.key)){ e.preventDefault(); exec('formatBlock','<h'+e.key+'>'); } });

/* ---------- counts ---------- */
function count(){ var t=page.innerText||'', ch=t.replace(/\s/g,'').length, w=(t.match(/\S+/g)||[]).length;
  $('cnt').textContent=F('글자 {0} · 단어 {1}',ch.toLocaleString(),w.toLocaleString()); }

/* ---------- menus ---------- */
function closeMenus(){ Array.prototype.forEach.call(document.querySelectorAll('.menu.open'),function(m){ m.classList.remove('open'); }); }
function popMenu(menu,btn){ var open=menu.classList.contains('open'); closeMenus(); if(open) return; menu.classList.add('open');
  var r=btn.getBoundingClientRect(), w=menu.offsetWidth; menu.style.top=(r.bottom+6)+'px'; menu.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px'; }
document.addEventListener('mousedown',function(e){ if(!e.target.closest('.menu')&&!e.target.closest('#expBtn')&&!e.target.closest('#aiBtn')) closeMenus(); });
$('expBtn').onclick=function(){ popMenu($('expMenu'),this); };
$('aiBtn').addEventListener('mousedown',keepSel);
$('aiBtn').onclick=function(){ popMenu($('aiMenu'),this); };

/* ---------- my documents ---------- */
function ago(t){ return window.FFVer?T(FFVer.ago(t)):new Date(t).toLocaleString(); }
function drawMgr(){ var ul=$('docList'); ul.innerHTML='';
  idx.docs.slice().sort(function(a,b){ return (b.t||0)-(a.t||0); }).forEach(function(d){ var li=document.createElement('li'); if(d===doc) li.className='on';
    var nm=document.createElement('div'); nm.className='dn'; nm.setAttribute('data-notr',''); var b=document.createElement('b'); b.textContent=d.name||T('제목 없는 문서'); var sm=document.createElement('small'); sm.textContent=ago(d.t||Date.now()); nm.appendChild(b); nm.appendChild(sm);
    nm.onclick=function(){ openDoc(d); closeDlg('mgrDlg'); };
    var rn=document.createElement('button'); rn.className='ib'; rn.title=T('이름 바꾸기'); rn.setAttribute('aria-label',T('이름 바꾸기')); rn.textContent='✏️';
    rn.onclick=function(){ var inp=document.createElement('input'); inp.value=d.name||''; inp.setAttribute('data-notr',''); li.replaceChild(inp,nm); inp.focus(); inp.select();
      function done(){ var v=inp.value.trim(); if(v){ d.name=v; if(d===doc) $('docName').value=v; writeIdx(); } drawMgr(); }
      inp.onkeydown=function(e){ if(e.key==='Enter') done(); if(e.key==='Escape'){ e.stopPropagation(); drawMgr(); } }; inp.onblur=done; };
    var del=document.createElement('button'); del.className='ib'; del.title=T('지우기'); del.setAttribute('aria-label',T('지우기')); del.textContent='🗑️'; del.style.color='#ff7b7b';
    del.onclick=function(){ var html=readDoc(d.id), pos=idx.docs.indexOf(d); idx.docs.splice(pos,1); try{ localStorage.removeItem(DOC+d.id); }catch(e){}
      if(d===doc){ doc=null; if(idx.docs.length) openDoc(idx.docs[0]); else newDoc(); } writeIdx(); drawMgr();
      if(window.FFUndo) FFUndo.show(F('"{0}" 문서를 지웠어요',d.name),function(){ try{ localStorage.setItem(DOC+d.id,html); }catch(e){} idx.docs.splice(Math.min(pos,idx.docs.length),0,d); writeIdx(); openDoc(d); drawMgr(); }); };
    li.appendChild(nm); li.appendChild(rn); li.appendChild(del); ul.appendChild(li); }); }
$('mineBtn').onclick=function(){ saveNow(); drawMgr(); openDlg('mgrDlg'); };
$('newBtn').onclick=function(){ newDoc(); closeDlg('mgrDlg'); page.focus(); };
$('docName').addEventListener('input',saveSoon);
$('docName').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); page.focus(); } });
$('verBtn').onclick=function(){ if(!window.FFVer||!doc) return; saveNow(); FFVer.open({key:'docs.'+doc.id,title:'버전 기록',get:snap,toast:toast,
  put:function(s){ var o=JSON.parse(s); mark(true); page.innerHTML=clean(o.h); $('docName').value=o.n||''; setFont(o.f||'sans'); doc.pg=o.pg||null; applyPg(); count(); saveNow(); },
  describe:function(s){ var o=JSON.parse(s), d=document.createElement('div'); d.innerHTML=o.h; return F('글자 {0}',(d.textContent||'').replace(/\s/g,'').length); }}); };

/* ---------- page -> blocks (for .docx) ---------- */
function b64(s){ var bin=atob(s), a=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) a[i]=bin.charCodeAt(i); return a; }
function alignOf(el){ var a=(el.style&&el.style.textAlign)||''; return a==='justify'?'both':(a==='center'||a==='right')?a:''; }
function runsOf(node,st,out){ out=out||[];
  for(var c=node.firstChild;c;c=c.nextSibling){
    if(c.nodeType===3){ var t=c.textContent.replace(/[\r\n]+/g,' '); if(t){ var r={t:t}; for(var k in st) if(st[k]) r[k]=st[k]; out.push(r); } continue; }
    if(c.nodeType!==1) continue; var tag=c.tagName;
    if(tag==='BR'){ out.push({br:true}); continue; }
    if(tag==='IMG'){ var m=/^data:image\/(png|jpe?g);base64,(.*)$/i.exec(c.getAttribute('src')||''); if(!m) continue;
      var dw=c.getBoundingClientRect().width, pw=page.clientWidth-parseFloat(getComputedStyle(page).paddingLeft)*2, w=dw&&pw>0?Math.round(dw*602/pw):(+c.getAttribute('width')||c.naturalWidth||400), h=c.naturalWidth?Math.round(w*c.naturalHeight/c.naturalWidth):Math.round(w*.66);
      out.push({img:{bytes:b64(m[2]),ext:/png/i.test(m[1])?'png':'jpeg',w:Math.min(w,602),h:h}}); continue; }
    if(tag==='SPAN'&&c.classList.contains('td')){ var s3={}; for(var k3 in st) s3[k3]=st[k3]; s3.del=1; runsOf(c,s3,out); continue; }
    if(tag==='SPAN'&&c.classList.contains('eq')){ var s4={i:1}; for(var k4 in st) if(k4!=='i') s4[k4]=st[k4]; s4.t=eqPlain(c.getAttribute('data-eq')||''); out.push(s4); continue; }
    if(tag==='SPAN'&&c.classList.contains('ck')){ var s5={}; for(var k5 in st) s5[k5]=st[k5]; s5.t=c.classList.contains('on')?'☑':'☐'; out.push(s5); continue; }
    var s2={}; for(var k2 in st) s2[k2]=st[k2];
    if(tag==='SPAN'&&c.classList.contains('ti')) s2.ins=1;
    if(tag==='B'||tag==='STRONG') s2.b=1; if(tag==='I'||tag==='EM') s2.i=1; if(tag==='U') s2.u=1; if(tag==='S'||tag==='STRIKE') s2.s=1;
    if(tag==='SUP'){ s2.sup=1; s2.sub=0; } if(tag==='SUB'){ s2.sub=1; s2.sup=0; } if(tag==='A'){ var lu=safeUrl(c.getAttribute('href')); if(lu) s2.link=lu; }
    if(c.style){ var px=pxOf(c.style.fontSize); if(px) s2.sz=px; var fc=faceOf(c.style.fontFamily); if(fc) s2.face=fc; var bh=hex(c.style.backgroundColor); if(bh&&bh!=='FFFFFF') s2.bg=bh; }
    if(c.style&&c.style.color){ var hx=hex(c.style.color); if(hx) s2.color=hx; } if(tag==='FONT'&&c.getAttribute('color')){ var hf=hex(c.getAttribute('color')); if(hf) s2.color=hf; }
    if(/^(P|DIV|LI|H1|H2|H3|BLOCKQUOTE)$/.test(tag)&&out.length&&!out[out.length-1].br) out.push({br:true});
    var before=out.length; runsOf(c,s2,out);
    if(tag==='SPAN'&&c.classList.contains('cm')&&cmOut){ var first=-1,last=-1; for(var q=before;q<out.length;q++){ if(out[q].t!=null){ if(first<0) first=q; last=q; } } if(first>=0){ var cid=cmOut.length; cmOut.push(c.getAttribute('data-cm')||''); out[first].cm0=cid; out[last].cm1=cid; } } }
  return out; }
var cmOut=null;
function toBlocks(){ var out=[], list=0;
  function pstyle(el,b){ var lh=parseFloat(el.style&&el.style.lineHeight); if(lh) b.lh=lh; var ml=parseInt(el.style&&el.style.marginLeft,10); if(ml>0) b.ind=ml; return b; }
  function block(el,type){ var st=el.classList&&el.classList.contains('tt')?{b:1,sz:18}:el.classList&&el.classList.contains('fn')?{sz:12}:{}; out.push(pstyle(el,{type:type, align:alignOf(el), runs:runsOf(el,st)})); }
  Array.prototype.forEach.call(page.childNodes,function(n){
    if(n.nodeType===3){ if(n.textContent.trim()) out.push({type:'p',runs:[{t:n.textContent}]}); return; } if(n.nodeType!==1) return;
    var tag=n.tagName;
    if(/^H[123]$/.test(tag)) block(n,tag.toLowerCase());
    else if(tag==='BLOCKQUOTE'){ var ps=n.querySelectorAll('p'); if(ps.length) Array.prototype.forEach.call(ps,function(p){ block(p,'quote'); }); else block(n,'quote'); }
    else if(tag==='UL'||tag==='OL'){ list++; Array.prototype.forEach.call(n.children,function(li){ if(li.tagName==='LI') out.push(pstyle(li,{type:tag==='UL'?'li':'oli', list:list, align:alignOf(li), runs:runsOf(li,{})})); }); }
    else if(tag==='TABLE'){ out.push({type:'table', box:n.classList.contains('tb')?1:0, rows:Array.prototype.map.call(n.rows,function(r){ return Array.prototype.map.call(r.cells,function(c){ var rs=runsOf(c,{}); var cb=c.style&&hex(c.style.backgroundColor); if(cb&&cb!=='FFFFFF') rs.shd=cb; if(c.tagName==='TH') rs.forEach(function(x){ if(!x.br&&!x.img) x.b=1; }); return rs; }); })}); }
    else if(tag==='HR') out.push({type:n.classList.contains('pb')?'pb':'hr'});
    else block(n,'p'); });
  out.forEach(function(b){ if(b.runs){ while(b.runs.length&&b.runs[b.runs.length-1].br) b.runs.pop(); } });
  return out; }
/* blocks -> page (opening a .docx) */
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function runsHTML(rs){ return (rs||[]).map(function(r){ if(r.br) return '<br>'; var h=esc(r.t||'').replace(/\t/g,'&emsp;'), css='';
  if(r.color) css+='color:#'+r.color+';'; if(r.sz) css+='font-size:'+r.sz+'px;'; if(r.face&&faceOf(r.face)) css+='font-family:&quot;'+esc(faceOf(r.face))+'&quot;;'; if(r.bg) css+='background-color:#'+r.bg+';';
  if(css) h='<span style="'+css+'">'+h+'</span>'; if(r.sup) h='<sup>'+h+'</sup>'; if(r.sub) h='<sub>'+h+'</sub>';
  if(r.s) h='<s>'+h+'</s>'; if(r.u) h='<u>'+h+'</u>'; if(r.i) h='<i>'+h+'</i>'; if(r.b) h='<b>'+h+'</b>'; if(r.link&&safeUrl(r.link)) h='<a href="'+esc(safeUrl(r.link))+'">'+h+'</a>'; return h; }).join(''); }
function fromBlocks(bs){ var h='', open=null, openId=null;
  bs.forEach(function(b){ var lt=b.type==='li'?'ul':b.type==='oli'?'ol':null;
    if(open&&(lt!==open||b.list!==openId)){ h+='</'+open+'>'; open=null; }
    var css=(b.align?'text-align:'+(b.align==='both'?'justify':b.align)+';':'')+(b.lh?'line-height:'+b.lh+';':'')+(b.ind?'margin-left:'+b.ind+'px;':''), al=css?' style="'+css+'"':'', inner=runsHTML(b.runs)||'<br>';
    if(lt){ if(!open){ h+='<'+lt+'>'; open=lt; openId=b.list; } h+='<li'+al+'>'+inner+'</li>'; return; }
    if(b.type==='table') h+='<table'+(b.box?' class="tb"':'')+'><tbody>'+(b.rows||[]).map(function(r){ return '<tr>'+r.map(function(c){ return '<td>'+(runsHTML(c)||'<br>')+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody></table>';
    else if(b.type==='hr') h+='<hr>'; else if(b.type==='pb') h+='<hr class="pb">';
    else { var t={h1:'h1',h2:'h2',h3:'h3',quote:'blockquote'}[b.type]||'p'; h+='<'+t+al+'>'+inner+'</'+t+'>'; } });
  if(open) h+='</'+open+'>'; return h; }

/* ---------- export / open ---------- */
function fname(ext){ return (($('docName').value.trim()||T('제목 없는 문서')).replace(/[\\/:*?"<>|]+/g,' ').trim()||'document')+'.'+ext; }
function download(data,type,name){ var a=document.createElement('a'), u=URL.createObjectURL(new Blob([data],{type:type})); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(u); },4000); }
function doExport(k){ closeMenus(); selImg(null); saveNow();
  if(k==='docx'){ try{ var g=pg(); cmOut=[]; var bl=toBlocks(), cms=cmOut; cmOut=null; download(FFDocx.write(bl,{comments:cms, paper:g.paper||'A4', land:g.land, mar:(MAR[g.mar]||96)*15, cols:g.cols||1, hd:g.hd||'', ft:g.ft||'', pn:g.pn||''}),'application/vnd.openxmlformats-officedocument.wordprocessingml.document',fname('docx')); toast('Word 문서로 받았어요'); }catch(e){ console.error(e); toast('Word 문서를 만들지 못했어요'); } }
  else if(k==='pdf'){ toast('인쇄 창에서 "PDF로 저장"을 고르세요'); setTimeout(function(){ window.print(); },300); }
  else if(k==='html'){ var css='body{font-family:"Noto Sans KR","Malgun Gothic",sans-serif;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.7;color:#1b1b1b}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:6px 8px}th{background:#f2f2f2}blockquote{border-left:4px solid #ccc;margin:0;padding-left:1em;color:#555;font-style:italic}img{max-width:100%}a{color:#1a56db}hr.pb{border:0;border-top:1px dashed #bbb;page-break-after:always}hr.fn{width:35%;margin:2em 0 .6em}p.fn{font-size:12.5px}p.toc.tt{font-weight:700;font-size:18px}table.tb{width:auto;margin:.6em auto;border:2px solid #444;background:#fffbea}table.tb td{border:0;padding:10px 14px}';
    download('<!DOCTYPE html>\n<html lang="ko"><head><meta charset="UTF-8"><title>'+esc($('docName').value)+'</title><style>'+css+'</style></head><body>\n'+revFree().innerHTML.replace(/ class="sel"/g,'')+'\n</body></html>','text/html',fname('html')); }
  else if(k==='txt') download(revText(),'text/plain;charset=utf-8',fname('txt')); }
Array.prototype.forEach.call(document.querySelectorAll('[data-x]'),function(b){ b.onclick=function(){ doExport(b.dataset.x); }; });
$('openBtn').onclick=function(){ $('openFile').value=''; $('openFile').click(); };
function openFile(f){ var name=f.name.replace(/\.[^.]+$/,''), ext=(/\.([^.]+)$/.exec(f.name)||[])[1]||'';
  ext=ext.toLowerCase();
  if(ext==='docx'){ f.arrayBuffer().then(function(b){ return FFDocx.read(new Uint8Array(b)); }).then(function(bs){ newDoc(name,clean(fromBlocks(bs))); toast('Word 문서를 열었어요 (그림은 빠져요)'); },function(e){ console.error(e); toast('이 Word 문서는 열지 못했어요'); }); }
  else f.text().then(function(t){ var h; if(ext==='html'||ext==='htm'){ var m=/<body[^>]*>([\s\S]*)<\/body>/i.exec(t); h=clean(m?m[1]:t); }
    else h=t.split(/\r?\n/).map(function(l){ var m=/^(#{1,3})\s+(.*)$/.exec(l); if(ext==='md'&&m) return '<h'+m[1].length+'>'+esc(m[2])+'</h'+m[1].length+'>'; return '<p>'+(esc(l)||'<br>')+'</p>'; }).join('');
    newDoc(name,h); toast('파일을 열었어요'); }); }
$('openFile').onchange=function(){ if(this.files[0]) openFile(this.files[0]); };
document.addEventListener('dragover',function(e){ if(e.dataTransfer&&Array.prototype.indexOf.call(e.dataTransfer.types||[],'Files')>=0) e.preventDefault(); });
document.addEventListener('drop',function(e){ if(e.defaultPrevented) return; var f=e.dataTransfer&&e.dataTransfer.files[0]; if(f&&/\.(docx|html?|txt|md)$/i.test(f.name)){ e.preventDefault(); openFile(f); } });

/* ---------- AI helper (shared ai.js) ---------- */
var aiRange=null, aiJob=0, aiText='', aiTask='';
var TASKS={
  fix:{title:'맞춤법 고치기', sys:'You fix Korean and English spelling, spacing and grammar. Keep the meaning, tone and language. Reply with only the corrected text.', pre:'Fix the spelling of this text:\n\n'},
  easy:{title:'더 쉽게', sys:'You rewrite text so a 10-year-old can understand it. Keep the language of the text. Reply with only the rewritten text.', pre:'Rewrite this more simply:\n\n'},
  sum:{title:'요약', sys:'You summarize text in the same language, in 2-4 short sentences. Reply with only the summary.', pre:'Summarize:\n\n'},
  cont:{title:'이어 쓰기', sys:'You continue a document in the same language and style. Write one or two new paragraphs that follow naturally. Reply with only the new text.', pre:'Continue this text:\n\n'},
  formal:{title:'격식 있게', sys:'You rewrite text in a polite, formal register. Keep the meaning and the language of the text. Reply with only the rewritten text.', pre:'Rewrite this formally:\n\n'},
  soft:{title:'부드럽게', sys:'You rewrite text so it sounds friendly and gentle. Keep the meaning and the language of the text. Reply with only the rewritten text.', pre:'Rewrite this in a gentle, friendly tone:\n\n'},
  short:{title:'짧게 줄이기', sys:'You shorten text to about half its length without losing the key points. Keep the language of the text. Reply with only the shortened text.', pre:'Shorten this:\n\n'},
  long:{title:'길게 늘이기', sys:'You expand text with a little more detail and clearer wording, about twice as long, without inventing facts. Keep the language of the text. Reply with only the expanded text.', pre:'Expand this:\n\n'},
  bullets:{title:'글머리 목록으로', sys:'You turn text into a short bullet list, one point per line, each line starting with "- ". Keep the language of the text. Reply with only the list.', pre:'Turn this into bullet points:\n\n'},
  title:{title:'제목 추천', sys:'You suggest 5 short titles for a text, one per line, no numbering. Use the language of the text. Reply with only the titles.', pre:'Suggest titles for:\n\n', norep:1},
  outline:{title:'개요 만들기', sys:'You write a clear outline of a document: main headings, with two or three short sub-points under each. Use the language of the document. Plain text, one item per line. Reply with only the outline.', pre:'Outline this document:\n\n', all:1, norep:1},
  en:{title:'영어로 번역', sys:'You translate text into natural English. Reply with only the translation.', pre:'Translate into English:\n\n'},
  ko:{title:'한국어로 번역', sys:'You translate text into natural Korean. Reply with only the translation.', pre:'Translate into Korean:\n\n'},
  ja:{title:'일본어로 번역', sys:'You translate text into natural Japanese. Reply with only the translation.', pre:'Translate into Japanese:\n\n'},
  ask:{title:'문서에 질문하기', sys:'You answer a question using only the document given. If the document does not say, say so. Use the language of the question. Be brief.', pre:'', all:1, norep:1, q:'문서에 대해 궁금한 것'},
  draft:{title:'주제로 초안 쓰기', sys:'You write a clear first draft of a document on the given topic, with a short title line and a few paragraphs. Use the language of the topic. Plain text only.', pre:'', free:1, norep:1, q:'어떤 글을 쓸까요? (주제)'}};
Object.keys(TASKS).forEach(function(k){ var d=window.FFP&&FFP.docsTasks[k]; if(d){ TASKS[k].sys=d.sys; TASKS[k].pre=d.pre; } });   // the prompts live in ../ai-prompts.js, shared with the training data
function stopAI(){ if(aiJob){ aiJob++; try{ FFAI.stop(); }catch(e){} } }
function aiSource(){ backSel(); var s=getSelection(), r=s.rangeCount?s.getRangeAt(0):null;
  if(r&&!r.collapsed&&page.contains(r.commonAncestorContainer)) return {range:r.cloneRange(), text:r.toString()};
  var bl=curBlock(); if(bl&&bl.textContent.trim()){ var rr=document.createRange(); rr.selectNodeContents(bl); return {range:rr, text:bl.textContent}; }
  return null; }
var aiQTask='';
function runAI(task){ closeMenus(); if(!window.FFAI){ toast('AI를 불러오지 못했어요'); return; }
  if(task==='set'){ FFAI.settings(); return; }
  var t=TASKS[task];
  if(t.q){ aiQTask=task; keepSel(); $('aiQT').textContent=T(t.title); $('aiQL').textContent=T(t.q); $('aiQ').value=''; openDlg('aiQDlg'); setTimeout(function(){ $('aiQ').focus(); },30); return; }
  var src=aiSource();
  if(t.all){ var allT=page.innerText.trim(); if(!allT){ toast('문서에 글이 없어요'); return; } var r1=document.createRange(); r1.selectNodeContents(page); r1.collapse(false); src={range:r1,text:allT}; }
  else if(task==='cont'&&!src){ var all=page.innerText.trim(); if(all){ var r0=document.createRange(); r0.selectNodeContents(page); r0.collapse(false); src={range:r0,text:all.slice(-1500)}; } }
  if(!src||!src.text.trim()){ toast('먼저 글을 고르거나 문단 안을 누르세요'); return; }
  goAI(task,src,t.pre+src.text.slice(0,task==='cont'?1500:4000)); }
function goAI(task,src,prompt){ var t=TASKS[task], job=++aiJob; aiRange=src.range; aiTask=task; aiText='';
  $('aiTitle').textContent=T(t.title); $('aiOut').textContent=T('AI가 쓰는 중…'); $('aiRep').disabled=true; $('aiBelow').disabled=true; $('aiStop').hidden=false;
  $('aiRep').hidden=!!t.norep||task==='cont'; openDlg('aiDlg');
  FFAI.ask({system:t.sys, prompt:prompt, prose:true, maxTokens:/^(sum|title|ask)$/.test(task)?300:900, onText:function(s){ if(job===aiJob){ aiText=s; $('aiOut').textContent=s; } }})
    .then(function(s){ if(job!==aiJob) return; aiJob=0; aiText=String(s||aiText).replace(/^\s*["“]|["”]\s*$/g,'').trim(); $('aiOut').textContent=aiText||T('AI가 아무것도 쓰지 않았어요'); $('aiStop').hidden=true; $('aiRep').disabled=$('aiBelow').disabled=!aiText; },
      function(e){ if(job!==aiJob) return; aiJob=0; $('aiStop').hidden=true; $('aiOut').textContent=(e&&e.message)||T('AI가 답하지 못했어요'); if(aiText){ $('aiRep').disabled=$('aiBelow').disabled=false; } }); }
$('aiQOk').onclick=function(){ var q=$('aiQ').value.trim(); if(!q){ $('aiQ').focus(); return; } closeDlg('aiQDlg'); var t=TASKS[aiQTask], src=aiSource();
  if(!src){ var r=document.createRange(); r.selectNodeContents(page); r.collapse(false); src={range:r,text:''}; }
  if(aiQTask==='ask'){ var d=page.innerText.trim(); if(!d){ toast('문서에 글이 없어요'); return; } goAI('ask',src,FFP.docsAskPrompt(d.slice(0,4000),q)); }
  else goAI('draft',src,FFP.docsDraftPrompt(q)); };
$('aiQ').addEventListener('keydown',function(e){ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); $('aiQOk').click(); } });
Array.prototype.forEach.call(document.querySelectorAll('[data-a]'),function(b){ b.onclick=function(){ runAI(b.dataset.a); }; });
$('aiStop').onclick=function(){ stopAI(); aiJob=0; $('aiStop').hidden=true; $('aiRep').disabled=$('aiBelow').disabled=!aiText; };
function paras(t){ var ls=t.split(/\n+/).filter(function(l){ return l.trim(); }); if(ls.length>1&&ls.every(function(l){ return /^\s*[-•*]\s+/.test(l); })) return '<ul>'+ls.map(function(l){ return '<li>'+esc(l.replace(/^\s*[-•*]\s+/,'').trim())+'</li>'; }).join('')+'</ul>';
  return t.split(/\n{2,}|\n/).filter(function(l){ return l.trim(); }).map(function(l){ return '<p>'+esc(l.trim())+'</p>'; }).join(''); }
$('aiRep').onclick=function(){ if(!aiRange||!aiText) return; closeDlg('aiDlg'); mark(true); var s=getSelection(); page.focus(); s.removeAllRanges(); s.addRange(aiRange);
  if(/\n/.test(aiText)) document.execCommand('insertHTML',false,paras(aiText)); else document.execCommand('insertText',false,aiText); fixTop(); count(); saveSoon(); toast('바꿨어요 · Ctrl+Z로 되돌리기'); };
$('aiBelow').onclick=function(){ if(!aiRange||!aiText) return; closeDlg('aiDlg'); mark(true);
  var n=aiRange.endContainer; while(n&&n.parentNode!==page) n=n.parentNode; var box=document.createElement('div'); box.innerHTML=paras(aiText);
  var after=n?n.nextSibling:null, last=null; while(box.firstChild){ last=box.firstChild; page.insertBefore(last,after); }
  if(last){ var r=document.createRange(); r.selectNodeContents(last); r.collapse(false); var s=getSelection(); s.removeAllRanges(); s.addRange(r); }
  count(); saveSoon(); toast('아래에 넣었어요'); };

/* ---------- Docs v3: memos, tracked changes, equations, checklist, shapes, case, table colours ---------- */
var BLK_RE=/^(P|H1|H2|H3|LI|TD|TH|BLOCKQUOTE)$/;
function blockOf(n){ while(n&&n!==page){ if(n.nodeType===1&&BLK_RE.test(n.tagName)) return n; n=n.parentNode; } return null; }
function curRange(){ backSel(); var s=getSelection(); return s.rangeCount&&page.contains(s.getRangeAt(0).commonAncestorContainer)?s.getRangeAt(0):null; }
function revFree(){ var c=page.cloneNode(true); Array.prototype.forEach.call(c.querySelectorAll('.td'),function(n){ n.remove(); });
  Array.prototype.forEach.call(c.querySelectorAll('span.ti,span.cm'),function(n){ while(n.firstChild) n.parentNode.insertBefore(n.firstChild,n); n.remove(); }); return c; }

function revText(){ var c=revFree(); c.style.cssText='position:fixed;left:-9999px;top:0;width:700px;white-space:pre-wrap'; c.removeAttribute('id'); document.body.appendChild(c); var t=c.innerText; c.remove(); return t; }

/* memos */
var cmEdit=null;
function cmList(){ return Array.prototype.slice.call(page.querySelectorAll('span.cm')); }
function openMemo(el){ cmEdit=el||null; $('cmTxt').value=el?(el.getAttribute('data-cm')||''):''; $('cmDlgT').textContent=el?T('메모 고치기'):T('메모 달기'); openDlg('cmDlg'); setTimeout(function(){ $('cmTxt').focus(); },30); }
function memoStart(){ var r=curRange(); if(!r||r.collapsed){ toast('메모를 달 글자를 먼저 고르세요'); return; }
  var b1=blockOf(r.startContainer), b2=blockOf(r.endContainer); if(b1!==b2&&b1){ var e=document.createRange(); e.selectNodeContents(b1); r.setEnd(e.endContainer,e.endOffset); }
  cmRange=r.cloneRange(); openMemo(null); }
var cmRange=null;
$('cmOk').onclick=function(){ var t=$('cmTxt').value.trim().slice(0,400); if(!t){ $('cmTxt').focus(); return; } closeDlg('cmDlg'); mark(true);
  if(cmEdit){ cmEdit.setAttribute('data-cm',t); cmEdit=null; }
  else if(cmRange){ var sp=document.createElement('span'); sp.className='cm'; sp.setAttribute('data-cm',t); try{ sp.appendChild(cmRange.extractContents()); cmRange.insertNode(sp); }catch(e){ toast('이 부분에는 메모를 달 수 없어요'); } cmRange=null; }
  after(); drawMemos(); };
function drawMemos(){ var box=$('cmList'); if(!box||$('cmPanel').hidden) return; box.innerHTML='';
  var l=cmList(); $('cmEmpty').hidden=!!l.length;
  l.forEach(function(el,i){ var it=document.createElement('div'); it.className='cmi';
    var q=document.createElement('div'); q.className='cmq'; q.textContent=(el.textContent.length>40?el.textContent.slice(0,40)+'…':el.textContent); var tx=document.createElement('div'); tx.className='cmt'; tx.textContent=el.getAttribute('data-cm')||'';
    var bar=document.createElement('div'); bar.className='cmb'; var e=document.createElement('button'); e.textContent=T('고치기'); var d=document.createElement('button'); d.textContent=T('지우기');
    e.onclick=function(ev){ ev.stopPropagation(); openMemo(el); }; d.onclick=function(ev){ ev.stopPropagation(); mark(true); while(el.firstChild) el.parentNode.insertBefore(el.firstChild,el); el.remove(); after(); drawMemos(); };
    bar.appendChild(e); bar.appendChild(d); it.appendChild(q); it.appendChild(tx); it.appendChild(bar);
    it.onclick=function(){ el.scrollIntoView({block:'center',behavior:'smooth'}); el.classList.add('flash'); setTimeout(function(){ el.classList.remove('flash'); },1200); };
    box.appendChild(it); }); }
function showMemos(on){ $('cmPanel').hidden=on===false?true:!$('cmPanel').hidden&&on==null; if(on===true) $('cmPanel').hidden=false; drawMemos(); }
$('cmClose').onclick=function(){ $('cmPanel').hidden=true; };
page.addEventListener('input',function(){ clearTimeout(drawMemos.t); drawMemos.t=setTimeout(drawMemos,400); });

/* tracked changes */
function trkOn(){ return !!(doc&&doc.trk); }
function trkUI(){ $('trkBadge').hidden=!trkOn(); $('rvTrk').textContent=trkOn()?T('✏️ 변경 추적 끄기'):T('✏️ 변경 추적 켜기'); }
function trkWrap(r,back){ var sp=document.createElement('span'); sp.className='td'; sp.appendChild(r.extractContents()); r.insertNode(sp);
  var c=document.createRange(); if(back) c.setStartBefore(sp); else c.setStartAfter(sp); c.collapse(true); var s=getSelection(); s.removeAllRanges(); s.addRange(c); return sp; }
page.addEventListener('beforeinput',function(e){ if(!trkOn()||e.isComposing) return; var t=e.inputType, sg=getSelection(); if(!sg.rangeCount) return;
  var del=/^delete(ContentBackward|ContentForward|WordBackward|WordForward|SoftLineBackward|SoftLineForward)$/.test(t);
  if(del){ var back=/Backward/.test(t); if(sg.isCollapsed) sg.modify('extend',back?'backward':'forward',/Word/.test(t)?'word':'character');
    var r=sg.getRangeAt(0); if(r.collapsed) return; var b1=blockOf(r.startContainer), b2=blockOf(r.endContainer); if(b1!==b2) return;
    var ca=r.commonAncestorContainer; ca=ca.nodeType===1?ca:ca.parentNode; if(ca.closest&&ca.closest('span.ti')) return;
    e.preventDefault(); mark(true);
    if(ca.closest&&ca.closest('span.td')){ var c=document.createRange(); var td=ca.closest('span.td'); if(back) c.setStartBefore(td); else c.setStartAfter(td); c.collapse(true); sg.removeAllRanges(); sg.addRange(c); return; }
    trkWrap(r,back); after(); return; }
  if(t==='insertText'&&e.data){ var rr=sg.getRangeAt(0), a=rr.startContainer; a=a.nodeType===1?a:a.parentNode; if(a.closest&&a.closest('span.ti')&&rr.collapsed) return;
    e.preventDefault(); mark(true); if(!rr.collapsed){ var b3=blockOf(rr.startContainer), b4=blockOf(rr.endContainer); if(b3===b4) trkWrap(rr,false); else rr.deleteContents(); rr=sg.getRangeAt(0); }
    var sp=document.createElement('span'); sp.className='ti'; var tn=document.createTextNode(e.data); sp.appendChild(tn); rr.insertNode(sp);
    var c2=document.createRange(); c2.setStart(tn,tn.length); c2.collapse(true); sg.removeAllRanges(); sg.addRange(c2); after(); } });
page.addEventListener('compositionend',function(e){ if(!trkOn()||!e.data) return; var sg=getSelection(), n=sg.anchorNode; if(!sg.rangeCount||!n||n.nodeType!==3) return;
  if(n.parentNode.closest&&n.parentNode.closest('span.ti,span.td')) return; var off=sg.anchorOffset, st=off-e.data.length; if(st<0) return;
  var r=document.createRange(); r.setStart(n,st); r.setEnd(n,off); if(r.toString()!==e.data) return;
  var sp=document.createElement('span'); sp.className='ti'; sp.appendChild(r.extractContents()); r.insertNode(sp); var tn=sp.firstChild, c=document.createRange(); c.setStart(tn,tn.length); c.collapse(true); sg.removeAllRanges(); sg.addRange(c); after(); });
function revAll(acc){ mark(true); Array.prototype.forEach.call(page.querySelectorAll('span.ti,span.td'),function(n){ var keep=n.classList.contains('ti')===acc; if(keep){ while(n.firstChild) n.parentNode.insertBefore(n.firstChild,n); } n.remove(); }); page.normalize(); after(); }
var revEl=null;
page.addEventListener('click',function(e){ var el=e.target.closest&&e.target.closest('span.ti,span.td'); var pop=$('trkPop');
  if(!el||!page.contains(el)){ pop.hidden=true; return; } revEl=el; var r=el.getBoundingClientRect(); pop.hidden=false; pop.style.top=(r.bottom+6)+'px'; pop.style.left=Math.max(8,Math.min(innerWidth-190,r.left))+'px'; });
function revOne(acc){ if(!revEl) return; mark(true); var keep=revEl.classList.contains('ti')===acc; if(keep){ while(revEl.firstChild) revEl.parentNode.insertBefore(revEl.firstChild,revEl); } revEl.remove(); revEl=null; $('trkPop').hidden=true; page.normalize(); after(); }
$('trkAcc').onclick=function(){ revOne(true); }; $('trkRej').onclick=function(){ revOne(false); };

/* equations */
var GREEK={alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',theta:'θ',lambda:'λ',mu:'μ',pi:'π',rho:'ρ',sigma:'σ',tau:'τ',phi:'φ',omega:'ω',Delta:'Δ',Sigma:'Σ',Omega:'Ω',Pi:'Π',Theta:'Θ',inf:'∞',infty:'∞',times:'×',cdot:'·',deg:'°',pm:'±',approx:'≈',neq:'≠',leq:'≤',geq:'≥',to:'→',partial:'∂',nabla:'∇',sum:'∑',prod:'∏',int:'∫'}, FUNC={sin:1,cos:1,tan:1,log:1,ln:1,lim:1,max:1,min:1,exp:1};
function eqPrep(s){ return String(s||'').replace(/<=/g,'≤').replace(/>=/g,'≥').replace(/!=/g,'≠').replace(/->/g,'→').replace(/\+-/g,'±').replace(/\*/g,'×'); }
function eqPlain(s){ return eqPrep(s).replace(/[A-Za-z]+/g,function(w){ return GREEK[w]&&w!=='sum'?GREEK[w]:GREEK[w]||w; }).replace(/\bsqrt\b/g,'√'); }
function eqHTML(src){ var toks=eqPrep(src).match(/\d+\.?\d*|[A-Za-z]+|\S/g)||[], i=0;
  function E(h){ return h.replace(/[&<>]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }
  function expr(stop){ var out=[]; while(i<toks.length&&!stop(toks[i])){ if(toks[i]==='/'){ i++; var d=term(), n=out.pop()||{h:'',i:''}; var fh='<span class="eqf"><span>'+n.i+'</span><span>'+d.i+'</span></span>'; out.push({h:fh,i:fh}); } else out.push(term()); } return out; }
  function join(a){ return a.map(function(x){ return x.h; }).join(''); }
  function term(){ var a=atom(), sb='', sp=''; while(i<toks.length&&(toks[i]==='^'||toks[i]==='_')){ var k=toks[i++], b=atom(); if(k==='^') sp=b.i; else sb=b.i; }
    if(sb||sp){ if(a.big==='∑'||a.big==='∏'||a.big==='lim') { var bh='<span class="eqb"><span>'+sp+'</span><span class="big">'+a.h+'</span><span>'+sb+'</span></span>'; return {h:bh,i:bh}; }
      var sh=a.h+(sb?'<sub>'+sb+'</sub>':'')+(sp?'<sup>'+sp+'</sup>':''); return {h:sh,i:sh}; } return a; }
  function atom(){ var t=toks[i++]; if(t==null) return {h:'',i:''};
    if(t==='('||t==='{'){ var close=t==='('?')':'}', inner=join(expr(function(x){ return x===close; })); if(toks[i]===close) i++; return {h:t==='('?'('+inner+')':inner,i:inner}; }
    if(t==='sqrt'){ var a=atom(), qh='√<span class="eqs">'+a.i+'</span>'; return {h:qh,i:qh}; }
    if(/^\d/.test(t)) return {h:t,i:t};
    if(/^[A-Za-z]+$/.test(t)){ if(GREEK[t]) return {h:E(GREEK[t]),i:E(GREEK[t]),big:/^(∑|∏)$/.test(GREEK[t])?GREEK[t]:'',}; if(FUNC[t]) return {h:'<span class="eqn">'+t+'</span>',i:'<span class="eqn">'+t+'</span>',big:t==='lim'?'lim':''};
      var h=t.split('').map(function(c){ return '<i>'+c+'</i>'; }).join(''); return {h:h,i:h}; }
    return {h:E(t),i:E(t)}; }
  return join(expr(function(){ return false; })); }
var eqEdit=null, eqRange=null;
function eqPrev(){ $('eqPrev').innerHTML=eqHTML($('eqTxt').value)||'<span style="color:#999">'+T('미리 보기')+'</span>'; }
$('eqTxt').addEventListener('input',eqPrev);
function openEq(el){ eqEdit=el||null; if(!el){ var r=curRange(); eqRange=r?r.cloneRange():null; } $('eqTxt').value=el?el.getAttribute('data-eq'):''; eqPrev(); openDlg('eqDlg'); setTimeout(function(){ $('eqTxt').focus(); },30); }
function eqMake(src){ var sp=document.createElement('span'); sp.className='eq'; sp.contentEditable='false'; sp.setAttribute('data-eq',src); sp.innerHTML=eqHTML(src); return sp; }
$('eqOk').onclick=function(){ var t=$('eqTxt').value.trim().slice(0,300); if(!t){ $('eqTxt').focus(); return; } closeDlg('eqDlg'); mark(true);
  if(eqEdit){ eqEdit.setAttribute('data-eq',t); eqEdit.innerHTML=eqHTML(t); eqEdit=null; }
  else { page.focus(); var s=getSelection(); if(eqRange&&page.contains(eqRange.commonAncestorContainer)){ s.removeAllRanges(); s.addRange(eqRange); } else setCaret(page.textContent.length);
    var r=s.getRangeAt(0); r.collapse(false); var sp=eqMake(t), sp2=document.createTextNode(' '); r.insertNode(sp2); r.insertNode(sp); var c=document.createRange(); c.setStartAfter(sp2); c.collapse(true); s.removeAllRanges(); s.addRange(c); }
  after(); };
page.addEventListener('click',function(e){ var el=e.target.closest&&e.target.closest('span.eq'); if(el&&page.contains(el)) openEq(el); else if(e.target.closest&&e.target.closest('span.ck')){ var k=e.target.closest('span.ck'); k.classList.toggle('on'); k.textContent=k.classList.contains('on')?'☑':'☐'; after(); } });
function renderSpecial(root){ Array.prototype.forEach.call(root.querySelectorAll('span.eq'),function(n){ n.contentEditable='false'; n.innerHTML=eqHTML(n.getAttribute('data-eq')||''); });
  Array.prototype.forEach.call(root.querySelectorAll('span.ck'),function(n){ n.contentEditable='false'; n.textContent=n.classList.contains('on')?'☑':'☐'; }); }

/* checklist */
function makeCheck(){ var r=curRange(); if(!r) return; var b=blockOf(r.startContainer); if(!b||b.tagName==='TD'||b.tagName==='TH'){ toast('줄 안을 먼저 누르세요'); return; } mark(true);
  var ex=b.querySelector(':scope > span.ck'); if(ex){ var nx=ex.nextSibling; ex.remove(); if(nx&&nx.nodeType===3) nx.nodeValue=nx.nodeValue.replace(/^ /,''); after(); return; }
  var k=document.createElement('span'); k.className='ck'; k.contentEditable='false'; k.textContent='☐'; b.insertBefore(document.createTextNode(' '),b.firstChild); b.insertBefore(k,b.firstChild); after(); }

/* shapes -> picture */
var SHAPES=[['rect','사각형'],['round','둥근 사각형'],['ell','원·타원'],['tri','삼각형'],['star','별'],['arrow','화살표'],['call','말풍선'],['dia','마름모']];
$('shKind').innerHTML=SHAPES.map(function(s){ return '<option value="'+s[0]+'">'+s[1]+'</option>'; }).join('');
function shapePNG(kind,w,h,fill,line,txt,tc){ var sc=2, c=document.createElement('canvas'); c.width=w*sc; c.height=h*sc; var g=c.getContext('2d'); g.scale(sc,sc); var m=3; g.fillStyle=fill; g.strokeStyle=line; g.lineWidth=3; g.lineJoin='round'; g.beginPath();
  var x0=m,y0=m,x1=w-m,y1=h-m,cx=w/2,cy=h/2;
  if(kind==='rect') g.rect(x0,y0,x1-x0,y1-y0);
  else if(kind==='round'){ var rr=Math.min(24,(x1-x0)/4,(y1-y0)/2); g.moveTo(x0+rr,y0); g.arcTo(x1,y0,x1,y1,rr); g.arcTo(x1,y1,x0,y1,rr); g.arcTo(x0,y1,x0,y0,rr); g.arcTo(x0,y0,x1,y0,rr); }
  else if(kind==='ell') g.ellipse(cx,cy,(x1-x0)/2,(y1-y0)/2,0,0,7);
  else if(kind==='tri'){ g.moveTo(cx,y0); g.lineTo(x1,y1); g.lineTo(x0,y1); }
  else if(kind==='dia'){ g.moveTo(cx,y0); g.lineTo(x1,cy); g.lineTo(cx,y1); g.lineTo(x0,cy); }
  else if(kind==='star'){ for(var k=0;k<10;k++){ var a=-Math.PI/2+k*Math.PI/5, rx=(k%2?.42:1)*(x1-x0)/2, ry=(k%2?.42:1)*(y1-y0)/2; g[k?'lineTo':'moveTo'](cx+Math.cos(a)*rx,cy+Math.sin(a)*ry); } }
  else if(kind==='arrow'){ var hb=(y1-y0)*.28, hx=x1-Math.min(60,(x1-x0)*.4); g.moveTo(x0,cy-hb); g.lineTo(hx,cy-hb); g.lineTo(hx,y0); g.lineTo(x1,cy); g.lineTo(hx,y1); g.lineTo(hx,cy+hb); g.lineTo(x0,cy+hb); }
  else if(kind==='call'){ var bh=(y1-y0)*.78, rr2=14; g.moveTo(x0+rr2,y0); g.arcTo(x1,y0,x1,y0+bh,rr2); g.arcTo(x1,y0+bh,x0,y0+bh,rr2); g.lineTo(x0+(x1-x0)*.35,y0+bh); g.lineTo(x0+(x1-x0)*.2,y1); g.lineTo(x0+(x1-x0)*.25,y0+bh); g.arcTo(x0,y0+bh,x0,y0,rr2); g.arcTo(x0,y0,x1,y0,rr2); }
  g.closePath(); g.fill(); g.stroke();
  if(txt){ g.fillStyle=tc; g.font='700 '+Math.max(14,Math.min(34,Math.round(h/4)))+'px "Noto Sans KR","Malgun Gothic",sans-serif'; g.textAlign='center'; g.textBaseline='middle'; var ls=txt.split('\n'), lh=Math.max(14,Math.min(34,Math.round(h/4)))*1.3; ls.forEach(function(l,i){ g.fillText(l,cx,cy+(i-(ls.length-1)/2)*lh-(kind==='call'?h*.06:0),w-24); }); }
  return c.toDataURL('image/png'); }
var shR=null;
function shPrev(){ var z={s:[120,80],m:[200,130],l:[320,200]}[$('shSize').value]||[200,130]; $('shImg').src=shapePNG($('shKind').value,z[0],z[1],$('shFill').value,$('shLine').value,$('shTxt').value,$('shTc').value); $('shImg').width=Math.min(z[0],300); }
['shKind','shSize','shFill','shLine','shTxt','shTc'].forEach(function(id){ $(id).addEventListener('input',shPrev); $(id).addEventListener('change',shPrev); });
function openShape(){ var r=curRange(); shR=r?r.cloneRange():null; shPrev(); openDlg('shDlg'); }
$('shOk').onclick=function(){ closeDlg('shDlg'); page.focus(); if(shR&&page.contains(shR.commonAncestorContainer)){ var s=getSelection(); s.removeAllRanges(); s.addRange(shR); }
  var z={s:[120,80],m:[200,130],l:[320,200]}[$('shSize').value]||[200,130]; exec('insertHTML','<img src="'+shapePNG($('shKind').value,z[0],z[1],$('shFill').value,$('shLine').value,$('shTxt').value,$('shTc').value)+'" width="'+z[0]+'">'); };

/* text case, table colours */
function caseText(mode){ var r=curRange(); if(!r||r.collapsed){ toast('바꿀 글자를 먼저 고르세요'); return; } mark(true); var off=selOffsets(), w=document.createTreeWalker(r.commonAncestorContainer.nodeType===3?r.commonAncestorContainer.parentNode:r.commonAncestorContainer,NodeFilter.SHOW_TEXT), n, list=[];
  while((n=w.nextNode())) if(r.intersectsNode(n)) list.push(n);
  list.forEach(function(n){ var a=n===r.startContainer?r.startOffset:0, b=n===r.endContainer?r.endOffset:n.length, v=n.nodeValue, mid=v.slice(a,b);
    mid=mode==='up'?mid.toUpperCase():mode==='low'?mid.toLowerCase():mid.toLowerCase().replace(/(^|[\s(\["'])([a-z])/g,function(m,p,c){ return p+c.toUpperCase(); }); n.nodeValue=v.slice(0,a)+mid+v.slice(b); });
  setSelOffsets(off); after(); }
function cellOf(){ var r=curRange(); var n=r&&r.startContainer; n=n&&(n.nodeType===1?n:n.parentNode); return n&&n.closest?n.closest('td,th'):null; }
function cellColor(c){ var td=cellOf(); if(!td){ toast('표 안의 칸을 먼저 누르세요'); return; } mark(true); td.style.backgroundColor=c?'#'+c:''; if(!td.getAttribute('style')) td.removeAttribute('style'); after(); }
function headRow(){ var td=cellOf(); if(!td){ toast('표 안의 칸을 먼저 누르세요'); return; } var tr=td.parentNode.parentNode.rows[0]; mark(true); var toTh=tr.cells[0].tagName==='TD';
  Array.prototype.slice.call(tr.cells).forEach(function(c){ var n=document.createElement(toTh?'th':'td'); while(c.firstChild) n.appendChild(c.firstChild); if(c.getAttribute('style')) n.setAttribute('style',c.getAttribute('style')); if(c.getAttribute('colspan')) n.setAttribute('colspan',c.getAttribute('colspan')); tr.replaceChild(n,c); }); after(); }

/* ---------- reading the text in a photo (shared ../ocr.js) ---------- */
var ocrR=null, ocrJob=0, OCRS={load:'읽는 도구를 불러오는 중…',lang:'글자 데이터를 내려받는 중…',read:'글자를 읽는 중…'};
function openOcr(){ backSel(); var s=getSelection(); ocrR=s.rangeCount&&inPage()?s.getRangeAt(0).cloneRange():null; ocrJob++; $('ocrName').textContent=''; $('ocrBar').hidden=true; $('ocrSt').hidden=true; $('ocrOutL').hidden=true; $('ocrOut').value=''; $('ocrOk').disabled=true; openDlg('ocrDlg'); }
$('ocrPick').onclick=function(){ $('ocrFile').value=''; $('ocrFile').click(); };
$('ocrFile').onchange=function(){ var f=this.files[0]; if(!f) return; var job=++ocrJob; $('ocrName').textContent=f.name; $('ocrOutL').hidden=true; $('ocrOk').disabled=true; $('ocrPick').disabled=true;
  $('ocrBar').hidden=false; $('ocrFill').style.width='0'; $('ocrSt').hidden=false; $('ocrSt').textContent=T(OCRS.load);
  if(!window.FFOCR){ $('ocrSt').textContent=T('글자 읽는 도구를 불러오지 못했어요'); $('ocrPick').disabled=false; return; }
  FFOCR.read(f,function(p,st){ if(job!==ocrJob) return; $('ocrFill').style.width=Math.round(p*100)+'%'; $('ocrSt').textContent=T(OCRS[st]||OCRS.read)+' '+Math.round(p*100)+'%'; })
    .then(function(t){ if(job!==ocrJob) return; $('ocrPick').disabled=false; $('ocrBar').hidden=true; $('ocrOutL').hidden=false; $('ocrOut').value=t;
      $('ocrSt').textContent=T(t?'다 읽었어요. 틀린 곳은 고친 뒤 넣어 주세요':'읽은 글자가 없어요. 글자가 또렷한 사진으로 다시 해 보세요'); $('ocrOk').disabled=!t; if(t) $('ocrOut').focus(); },
      function(){ if(job!==ocrJob) return; $('ocrPick').disabled=false; $('ocrBar').hidden=true; $('ocrSt').textContent=T('사진을 읽지 못했어요. 인터넷이 연결됐는지 보고 다시 해 보세요'); }); };
$('ocrOk').onclick=function(){ var t=$('ocrOut').value.trim(); if(!t) return; ocrJob++; closeDlg('ocrDlg'); backTo(ocrR); mark(true);
  document.execCommand('insertHTML',false,paras(t)); fixTop(); count(); saveSoon(); toast('읽은 글을 넣었어요'); };

/* the review & tools menu */
var rvB=$('revBtn'); rvB.addEventListener('mousedown',keepSel); rvB.onclick=function(){ trkUI(); popMenu($('revMenu'),this); };
Array.prototype.forEach.call(document.querySelectorAll('[data-rv]'),function(b){ b.addEventListener('mousedown',function(e){ e.preventDefault(); }); b.onclick=function(){ closeMenus(); var k=b.dataset.rv;
  if(k==='memo') memoStart(); else if(k==='memos') showMemos(); else if(k==='trk'){ if(doc){ doc.trk=!doc.trk; trkUI(); saveNow(); toast(doc.trk?'변경 추적을 켰어요. 고친 곳이 색으로 표시돼요':'변경 추적을 껐어요'); } }
  else if(k==='acc') revAll(true); else if(k==='rej') revAll(false); else if(k==='eq') openEq(null); else if(k==='ck') makeCheck(); else if(k==='shape') openShape();
  else if(k==='up'||k==='low'||k==='cap') caseText(k); else if(k==='head') headRow(); else if(k==='shd') cellColor(b.dataset.c||''); }; });

/* ---------- ribbon tabs: home / insert / layout / review / AI / view ---------- */
(function(){ var bar=$('bar'), BTNS={
  insert:[['[data-n=link]','🔗 링크'],['[data-n=sym]','Ω 특수 문자'],['[data-n=date]','📅 날짜'],['[data-n=time]','🕒 시각'],['[data-n=toc]','📑 목차'],['[data-n=fn]','¹ 각주'],['[data-n=capImg]','🖼️ 그림 설명'],['[data-n=capTbl]','▦ 표 설명'],['[data-n=box]','▢ 글상자'],['[data-n=ocr]','🔤 사진 속 글자'],['[data-rv=eq]','∑ 수식'],['[data-rv=ck]','☑ 체크'],['[data-rv=shape]','⬟ 도형'],['[data-n=pb]','📄 쪽 나누기']],
  review:[['[data-rv=memo]','💬 메모 달기'],['[data-rv=memos]','🗒️ 메모 모음'],['[data-rv=trk]','✏️ 변경 추적'],['[data-rv=acc]','✔️ 모두 받아들이기'],['[data-rv=rej]','↩️ 모두 되돌리기'],['[data-rv=up]','ABC 대문자'],['[data-rv=low]','abc 소문자'],['[data-rv=cap]','Abc 첫 글자만'],['[data-rv=head]','▤ 제목 줄']],
  ai:[['[data-a=fix]','✍️ 맞춤법'],['[data-a=easy]','🧒 쉽게'],['[data-a=formal]','🎩 격식'],['[data-a=soft]','🙂 부드럽게'],['[data-a=short]','➖ 줄이기'],['[data-a=long]','➕ 늘이기'],['[data-a=sum]','✂️ 요약'],['[data-a=bullets]','• 목록으로'],['[data-a=cont]','➕ 이어 쓰기'],['[data-a=title]','🏷️ 제목 추천'],['[data-a=outline]','🗂️ 개요'],['[data-a=en]','🌐 영어'],['[data-a=ko]','🌐 한국어'],['[data-a=ja]','🌐 일본어'],['[data-a=ask]','❓ 문서에 질문'],['[data-a=draft]','📝 초안 쓰기'],['[data-a=set]','⚙️ AI 설정']]};
  var ctx=bar.querySelector('.ctx');
  Object.keys(BTNS).forEach(function(tab){ BTNS[tab].forEach(function(x){ var b=document.createElement('button'); b.type='button'; b.className='ib wide'; b.setAttribute('data-tab',tab); b.innerHTML='<span class="lb"></span>'; b.firstChild.textContent=x[1]; b.addEventListener('mousedown',function(e){ e.preventDefault(); keepSel(); });
    b.onclick=function(){ var t=document.querySelector(x[0]); if(t) t.click(); }; bar.insertBefore(b,ctx); }); });
  function tg(tab,label,id){ var b=document.createElement('button'); b.type='button'; b.className='ib wide tg'; b.id=id; b.setAttribute('data-tab',tab); b.innerHTML='<span class="lb"></span>'; b.firstChild.textContent=label; bar.insertBefore(b,ctx); return b; }
  var pv=tg('view','📄 쪽 경계 보기','pvBtn'); pv.onclick=function(){ var on=document.body.classList.toggle('pv'); pv.classList.toggle('on',on); try{ localStorage.setItem('fd.pv',on?'1':''); }catch(e){} };
  try{ if(localStorage.getItem('fd.pv')){ document.body.classList.add('pv'); pv.classList.add('on'); } }catch(e){}
  var z=100; function zoom(v){ z=Math.max(50,Math.min(200,v)); page.style.zoom=z===100?'':String(z/100); zb.firstChild.textContent=z+'%'; }
  tg('view','－ 축소','zoOut').onclick=function(){ zoom(z-10); }; var zb=tg('view','100%','zoCur'); zb.onclick=function(){ zoom(100); }; tg('view','＋ 확대','zoIn').onclick=function(){ zoom(z+10); };
  tg('view','🔢 글 통계','stBtn').onclick=function(){ var t=page.innerText||'', no=t.replace(/\s/g,'').length, w=(t.match(/\S+/g)||[]).length, sn=(t.match(/[^.!?。？！\n]+[.!?。？！]*/g)||[]).filter(function(x){ return x.trim(); }).length, ps=page.querySelectorAll('p,h1,h2,h3,li,blockquote').length, rd=Math.max(1,Math.round(w/200));
    var rows=[['글자 수 (공백 뺀)',no.toLocaleString()],['글자 수 (공백 포함)',t.replace(/\n/g,'').length.toLocaleString()],['단어 수',w.toLocaleString()],['문장 수',sn.toLocaleString()],['문단 수',ps.toLocaleString()],['그림',page.querySelectorAll('img').length],['표',page.querySelectorAll('table').length],['메모',page.querySelectorAll('span.cm').length],['읽는 시간(약)',rd+T('분')]];
    $('stTbl').innerHTML=rows.map(function(r){ return '<tr><td>'+T(r[0])+'</td><td>'+r[1]+'</td></tr>'; }).join(''); openDlg('stDlg'); };
  var tb=$('tabs'); function pick(k){ bar.setAttribute('data-active',k); Array.prototype.forEach.call(tb.children,function(b){ b.classList.toggle('on',b.dataset.tb===k); }); try{ sessionStorage.setItem('fd.tab',k); }catch(e){} bar.scrollLeft=0; }
  Array.prototype.forEach.call(tb.children,function(b){ b.onclick=function(){ pick(b.dataset.tb); }; });
  try{ var k0=sessionStorage.getItem('fd.tab'); if(k0&&tb.querySelector('[data-tb='+k0+']')) pick(k0); }catch(e){}
  // the old header AI menu button opens the AI tab; Ctrl+H/F keep opening find
  $('aiBtn').onclick=function(){ pick('ai'); };
})();

/* ---------- Docs v5: effects, paragraph looks, list shapes, styles, bookmarks, table & picture tools, compare ---------- */
var ctxE=$('bar').querySelector('.ctx');
function hb(tab,label,id,fn){ var b=document.createElement('button'); b.type='button'; b.className='ib wide'; b.id=id; b.setAttribute('data-tab',tab); b.innerHTML='<span class="lb"></span>'; b.firstChild.textContent=label;
  b.addEventListener('mousedown',function(e){ e.preventDefault(); keepSel(); }); b.onclick=function(){ fn(b); }; $('bar').insertBefore(b,ctxE); return b; }
function toggleCls(el,c,all){ var cl=(el.className||'').split(' ').filter(Boolean), had=cl.indexOf(c)>=0; cl=cl.filter(function(x){ return !all||all.indexOf(x)<0||x===c; });
  if(had) cl=cl.filter(function(x){ return x!==c; }); else if(c) cl.push(c); el.className=cl.join(' '); if(!el.className) el.removeAttribute('class'); }
Array.prototype.forEach.call(document.querySelectorAll('#fxMenu button,#pbMenu button,#lsMenu button'),function(b){ b.addEventListener('mousedown',function(e){ e.preventDefault(); }); });
/* text effects: shadow, outline, letter spacing */
var FXALL=['fxs','fxo','fxl','fxt'];
function fxApply(c){ closeMenus(); var r=curRange(); if(!r||r.collapsed){ toast('효과를 줄 글자를 먼저 고르세요'); return; }
  var b1=blockOf(r.startContainer), b2=blockOf(r.endContainer); if(b1!==b2){ toast('한 문단 안의 글자만 고를 수 있어요'); return; } mark(true);
  var hits=Array.prototype.filter.call(b1.querySelectorAll('span.fxs,span.fxo,span.fxl,span.fxt'),function(sp){ return r.intersectsNode(sp); });
  if(c==='clr'){ hits.forEach(function(sp){ while(sp.firstChild) sp.parentNode.insertBefore(sp.firstChild,sp); sp.remove(); }); after(); return; }
  if(hits.length===1&&hits[0].textContent===r.toString()){ toggleCls(hits[0],c,c==='fxl'?['fxt']:c==='fxt'?['fxl']:null); if(!hits[0].className){ while(hits[0].firstChild) hits[0].parentNode.insertBefore(hits[0].firstChild,hits[0]); hits[0].remove(); } after(); return; }
  var sp=document.createElement('span'); sp.className=c; sp.appendChild(r.extractContents()); r.insertNode(sp); var nr=document.createRange(); nr.selectNodeContents(sp); var s=getSelection(); s.removeAllRanges(); s.addRange(nr); after(); }
Array.prototype.forEach.call(document.querySelectorAll('[data-fx]'),function(b){ b.onclick=function(){ fxApply(b.dataset.fx); }; });
hb('home','✨ 글자 효과','fxBtn',function(b){ popMenu($('fxMenu'),b); });
/* paragraph look */
function pbApply(c){ closeMenus(); backSel(); var bl=curBlock(); if(!bl||bl.tagName==='LI'||!bl.closest||bl.parentNode!==page){ toast('꾸밀 문단 안을 먼저 누르세요'); return; } mark(true);
  if(c==='clr'){ bl.className=(bl.className||'').split(' ').filter(function(x){ return !/^pb[xgl]$/.test(x); }).join(' '); if(!bl.className) bl.removeAttribute('class'); }
  else toggleCls(bl,c,['pbx','pbg','pbl']); after(); }
Array.prototype.forEach.call(document.querySelectorAll('[data-pb]'),function(b){ b.onclick=function(){ pbApply(b.dataset.pb); }; });
hb('home','▭ 문단 꾸미기','pbBtn',function(b){ popMenu($('pbMenu'),b); });
/* list shapes */
function lsApply(v){ closeMenus(); backSel(); var n=anchorEl(), l=n&&n.closest('ul,ol'); if(!l||!page.contains(l)){ toast('목록 안을 먼저 누르세요'); return; } mark(true);
  l.className=(v==='0'||v==='n')?'':'ls'+v; if(!l.className) l.removeAttribute('class'); after(); }
Array.prototype.forEach.call(document.querySelectorAll('[data-ls]'),function(b){ b.onclick=function(){ lsApply(b.dataset.ls); }; });
hb('home','① 목록 모양','lsBtn',function(b){ popMenu($('lsMenu'),b); });
/* style editing: heading and body size, colour (kept per document) */
var STY=[['h1','제목 1',28],['h2','제목 2',22],['h3','제목 3',18]];
function applySty(){ var st=(doc&&doc.sty)||{}; STY.forEach(function(r){ var v=st[r[0]]; if(v&&v[0]) page.style.setProperty('--'+r[0]+'s',v[0]+'px'); else page.style.removeProperty('--'+r[0]+'s'); if(v&&v[1]) page.style.setProperty('--'+r[0]+'c',v[1]); else page.style.removeProperty('--'+r[0]+'c'); }); }
function openSty(){ var st=(doc&&doc.sty)||{}, h='';
  STY.forEach(function(r){ var v=st[r[0]]||[]; h+='<div style="display:flex;gap:10px;align-items:end;margin-bottom:10px"><b style="width:56px">'+T(r[1])+'</b><label class="fl">크기(px)<input type="number" min="10" max="72" id="sz_'+r[0]+'" value="'+(v[0]||r[2])+'" style="width:84px"></label><label class="fl">글자 색<input type="color" id="co_'+r[0]+'" value="'+(v[1]||'#1b1b1b')+'"></label><label class="fl" style="flex-direction:row;align-items:center;gap:6px"><input type="checkbox" id="on_'+r[0]+'" '+(v[1]?'checked':'')+'>색 쓰기</label></div>'; });
  $('styBody').innerHTML=h+'<p>이 문서의 제목 모양만 바뀌어요. 문단 모양에서 고른 제목에 바로 적용돼요.</p>'; openDlg('styDlg'); }
$('styOk').onclick=function(){ if(!doc) return; var st={}; STY.forEach(function(r){ var sz=+$('sz_'+r[0]).value; if(sz>=10&&sz<=72&&sz!==r[2]||$('on_'+r[0]).checked) st[r[0]]=[sz!==r[2]?sz:0,$('on_'+r[0]).checked?$('co_'+r[0]).value:'']; }); doc.sty=Object.keys(st).length?st:null; closeDlg('styDlg'); applySty(); saveNow(); toast('스타일을 바꿨어요'); };
$('styReset').onclick=function(){ if(doc) doc.sty=null; closeDlg('styDlg'); applySty(); saveNow(); toast('처음 모양으로 돌렸어요'); };
hb('layout','🎨 스타일 편집','styBtn',openSty);
/* bookmarks */
function bmAll(){ return Array.prototype.slice.call(page.querySelectorAll('span.bm')); }
function drawBm(){ var box=$('bmList'); box.innerHTML=''; bmAll().forEach(function(el){ var nm=el.getAttribute('data-bm'), row=document.createElement('div'); row.className='bmrow'; var sp=document.createElement('span'); sp.setAttribute('data-notr',''); sp.textContent='🔖 '+nm;
    var go=document.createElement('button'); go.className='tbtn'; go.textContent=T('이동'); go.onclick=function(){ closeDlg('bmDlg'); el.scrollIntoView({block:'center',behavior:'smooth'}); };
    var pk=document.createElement('button'); pk.className='tbtn'; pk.textContent=T('이름 쓰기'); pk.onclick=function(){ $('bmName').value=nm; };
    var del=document.createElement('button'); del.className='tbtn'; del.textContent=T('지우기'); del.onclick=function(){ mark(true); el.remove(); page.querySelectorAll('span.bl').forEach(function(l){ if(l.getAttribute('data-bl')===nm){ while(l.firstChild) l.parentNode.insertBefore(l.firstChild,l); l.remove(); } }); drawBm(); saveSoon(); };
    row.appendChild(sp); row.appendChild(go); row.appendChild(pk); row.appendChild(del); box.appendChild(row); });
  if(!box.firstChild){ box.textContent=T('아직 책갈피가 없어요.'); } }
var bmR=null;
function bmName(){ var n=$('bmName').value.trim().replace(/\s+/g,' ').slice(0,40); if(!n){ toast('책갈피 이름을 써 주세요'); $('bmName').focus(); } return n; }
$('bmAdd').onclick=function(){ var n=bmName(); if(!n) return; if(bmAll().some(function(e){ return e.getAttribute('data-bm')===n; })){ toast('같은 이름의 책갈피가 있어요'); return; } closeDlg('bmDlg'); backTo(bmR); mark(true);
  var sp=document.createElement('span'); sp.className='bm'; sp.setAttribute('data-bm',n); var rr=bmR&&page.contains(bmR.commonAncestorContainer)?bmR.cloneRange():null; if(!rr){ rr=document.createRange(); rr.selectNodeContents(page); rr.collapse(false); } rr.collapse(true); rr.insertNode(sp); sp.after(document.createTextNode('\u200b')); caretIn(sp.nextSibling,true); after(); toast('책갈피를 넣었어요'); };
$('bmLink').onclick=function(){ var n=bmName(); if(!n) return; if(!bmAll().some(function(e){ return e.getAttribute('data-bm')===n; })){ toast('그런 책갈피가 없어요'); return; }
  if(!bmR||bmR.collapsed){ toast('링크를 걸 글자를 먼저 고르세요'); return; } closeDlg('bmDlg'); backTo(bmR); mark(true); var r=bmR, sp=document.createElement('span'); sp.className='bl'; sp.setAttribute('data-bl',n); sp.appendChild(r.extractContents()); r.insertNode(sp); after(); toast('링크를 걸었어요'); };
page.addEventListener('click',function(e){ var l=e.target.closest&&e.target.closest('span.bl'); if(!l||!page.contains(l)) return; var n=l.getAttribute('data-bl'), t=bmAll().filter(function(x){ return x.getAttribute('data-bm')===n; })[0]; if(t) t.scrollIntoView({block:'center',behavior:'smooth'}); else toast('그 책갈피가 지워졌어요'); });
hb('insert','🔖 책갈피','bmBtn',function(){ backSel(); var s=getSelection(); bmR=s.rangeCount?s.getRangeAt(0).cloneRange():null; $('bmName').value=''; drawBm(); openDlg('bmDlg'); });
/* table tools */
document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('[data-t="merge"],[data-t="split"],[data-t="sum"],[data-t="sty"]'); if(!b) return; var cell=closest('TD')||closest('TH'); if(!cell) return; var tr=cell.parentNode, tbl=cell.closest('table'), ci=Array.prototype.indexOf.call(tr.children,cell);
  var a=b.dataset.t, cs=+cell.getAttribute('colspan')||1;
  if(a==='merge'){ var nx=cell.nextElementSibling; if(!nx){ toast('오른쪽에 합칠 칸이 없어요'); return; } var ns=+nx.getAttribute('colspan')||1; if(cs+ns>10){ toast('더는 합칠 수 없어요'); return; } mark(true);
    if(nx.textContent.trim()){ if(!cell.textContent.trim()) cell.innerHTML=''; else cell.appendChild(document.createTextNode(' ')); while(nx.firstChild) cell.appendChild(nx.firstChild); } nx.remove(); cell.setAttribute('colspan',cs+ns); if(!cell.firstChild) cell.appendChild(document.createElement('br')); }
  else if(a==='split'){ if(cs<2){ toast('합친 칸이 아니에요'); return; } mark(true); cell.setAttribute('colspan',cs-1); if(cs-1===1) cell.removeAttribute('colspan'); var n=document.createElement(cell.tagName.toLowerCase()); n.innerHTML='<br>'; tr.insertBefore(n,cell.nextSibling); }
  else if(a==='sum'){ var tot=0, any=false, isNum=false; Array.prototype.forEach.call(tbl.rows,function(row){ var c=row.children[ci]; if(!c) return; var m=c.textContent.replace(/[,\s]/g,''); if(/^-?\d+(\.\d+)?$/.test(m)){ tot+=parseFloat(m); any=true; } });
    if(!any){ toast('이 열에 더할 숫자가 없어요'); return; } mark(true); var nr=document.createElement('tr'); Array.prototype.forEach.call(tbl.rows[tbl.rows.length-1].children,function(c,i){ var td=document.createElement('td'); td.innerHTML=i===ci?'<b>'+(Math.round(tot*1e6)/1e6).toLocaleString()+'</b>':(i===0?'<b>합계</b>':'<br>'); nr.appendChild(td); }); tbl.rows[tbl.rows.length-1].parentNode.appendChild(nr); }
  else if(a==='sty'){ mark(true); var cur=(tbl.className||'').split(' ').filter(function(x){ return /^ts[123]$/.test(x); })[0]||'', nx2={'':'ts1',ts1:'ts2',ts2:'ts3',ts3:''}[cur]; tbl.className=(tbl.className||'').split(' ').filter(function(x){ return x&&!/^ts[123]$/.test(x); }).concat(nx2?[nx2]:[]).join(' '); if(!tbl.className) tbl.removeAttribute('class'); toast(nx2==='ts1'?'줄무늬 표':nx2==='ts2'?'테두리 없는 표':nx2==='ts3'?'가로줄만 있는 표':'기본 표'); }
  count(); saveSoon(); sync(); });
/* picture looks */
Array.prototype.forEach.call(document.querySelectorAll('[data-ix]'),function(b){ b.addEventListener('mousedown',function(e){ e.preventDefault(); }); b.onclick=function(){ if(!imgSel) return; var k=b.dataset.ix; mark(true);
  if(k==='none'){ imgSel.className=(imgSel.className||'').split(' ').filter(function(x){ return x&&x!=='iwl'&&x!=='iwr'; }).join(' '); }
  else if(k==='crop'){ var src=imgSel.getAttribute('src')||''; if(!/^data:/.test(src)){ toast('이 그림은 자를 수 없어요'); return; } var im=new Image(); im.onload=function(){ var w=im.naturalWidth, h=im.naturalHeight, dx=Math.round(w*.1), dy=Math.round(h*.1), c=document.createElement('canvas'); c.width=w-2*dx; c.height=h-2*dy; c.getContext('2d').drawImage(im,dx,dy,c.width,c.height,0,0,c.width,c.height); imgSel.setAttribute('src',c.toDataURL(/^data:image\/png/.test(src)?'image/png':'image/jpeg',.92)); count(); saveSoon(); toast('가장자리를 10%씩 잘라 냈어요'); }; im.src=src; return; }
  else if(k==='iwl') toggleCls(imgSel,k,['iwl','iwr']); else if(k==='iwr') toggleCls(imgSel,k,['iwl','iwr']); else toggleCls(imgSel,k);
  if(!imgSel.className) imgSel.removeAttribute('class'); imgSel.classList.add('sel'); count(); saveSoon(); }; });
/* compare with another saved document */
function plainOf(html){ var d=document.createElement('div'); d.innerHTML=clean(html); d.style.cssText='position:fixed;left:-9999px;top:0;width:700px;white-space:pre-wrap'; document.body.appendChild(d); var t=d.innerText; d.remove(); return t; }
function diffHtml(a,b){ var A=a.split(/(\s+)/).filter(Boolean), B=b.split(/(\s+)/).filter(Boolean); if(A.length*B.length>4e6){ A=a.split(/(\n)/).filter(Boolean); B=b.split(/(\n)/).filter(Boolean); }
  var n=A.length, m=B.length, L=[]; for(var i=0;i<=n;i++){ L.push(new Uint16Array(m+1)); }
  for(i=n-1;i>=0;i--) for(var j=m-1;j>=0;j--) L[i][j]=A[i]===B[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
  var o='', x=0, y=0; while(x<n&&y<m){ if(A[x]===B[y]){ o+=esc(A[x]); x++; y++; } else if(L[x+1][y]>=L[x][y+1]){ o+='<del>'+esc(A[x])+'</del>'; x++; } else { o+='<ins>'+esc(B[y])+'</ins>'; y++; } }
  while(x<n){ o+='<del>'+esc(A[x++])+'</del>'; } while(y<m){ o+='<ins>'+esc(B[y++])+'</ins>'; } return o; }
function openCmp(){ saveNow(); var sel=$('cmpSel'); sel.innerHTML=''; idx.docs.filter(function(d){ return d!==doc; }).forEach(function(d){ var o=document.createElement('option'); o.value=d.id; o.textContent=d.name||T('제목 없는 문서'); sel.appendChild(o); });
  if(!sel.firstChild){ toast('비교할 다른 문서가 없어요. 내 문서에서 새 문서를 만들어 주세요'); return; } openDlg('cmpDlg'); }
$('cmpGo').onclick=function(){ var id=$('cmpSel').value; if(!id) return; var other=plainOf(readDoc(id)), cur=page.innerText; $('cmpOut').innerHTML='<div data-notr>'+diffHtml(other,cur)+'</div>'; };
hb('review','🔍 문서 비교','cmpBtn',openCmp);

/* ---------- start ---------- */
(function(){ var d=idx.docs.filter(function(x){ return x.id===idx.last; })[0]||idx.docs[0]; if(d) openDoc(d); else newDoc(); })();
window.addEventListener('pagehide',saveNow);
document.addEventListener('visibilitychange',function(){ if(document.hidden) saveNow(); });
window.FDOCS={toBlocks:toBlocks, fromBlocks:fromBlocks, clean:clean}; // for the tests
})();
