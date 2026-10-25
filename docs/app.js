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
var KEEP={P:1,H1:1,H2:1,H3:1,BLOCKQUOTE:1,UL:1,OL:1,LI:1,B:1,I:1,U:1,S:1,BR:1,HR:1,TABLE:1,TBODY:1,THEAD:1,TR:1,TD:1,TH:1,IMG:1,SPAN:1};
var MAP={STRONG:'B',EM:'I',STRIKE:'S',DEL:'S',INS:'U',DIV:'P',H4:'H3',H5:'H3',H6:'H3',FONT:'SPAN',SECTION:'P',ARTICLE:'P',HEADER:'P',FOOTER:'P',TFOOT:'TBODY',PRE:'P'};
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
    if(!KEEP[to]){ // unknown wrapper: keep its children
      walk(c); while(c.firstChild) par.insertBefore(c.firstChild,c); par.removeChild(c); c=nx; continue; }
    var n=document.createElement(to);
    if(to==='IMG'){ var src=c.getAttribute('src')||''; if(!/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(src)&&!/^https?:\/\//i.test(src)){ par.removeChild(c); c=nx; continue; }
      n.setAttribute('src',src); var w=parseInt(c.getAttribute('width')||(st&&st.width)||'',10); if(w>0) n.setAttribute('width',Math.min(w,1200)); if(/%$/.test(st&&st.width||'')) n.style.width=st.width; }
    else while(c.firstChild) n.appendChild(c.firstChild);
    if(/^(P|H1|H2|H3|BLOCKQUOTE|LI|TD|TH)$/.test(to)&&/^(center|right|justify)$/i.test(align)) n.style.textAlign=align.toLowerCase();
    var col=hex(color); if(col&&col!=='000000'&&/^(SPAN|B|I|U|S)$/.test(to)) n.style.color='#'+col;
    if((to==='TD'||to==='TH')&&c.getAttribute('colspan')) n.setAttribute('colspan',Math.min(10,+c.getAttribute('colspan')||1));
    var wrap=n;
    if(to==='SPAN'||to==='P'){ // inline styles become tags so the document stays simple
      if(bold){ var b=document.createElement('B'); while(wrap.firstChild) b.appendChild(wrap.firstChild); wrap.appendChild(b); }
      if(ital){ var i=document.createElement('I'); while(wrap.firstChild) i.appendChild(wrap.firstChild); wrap.appendChild(i); }
      if(/underline/.test(deco)){ var u=document.createElement('U'); while(wrap.firstChild) u.appendChild(wrap.firstChild); wrap.appendChild(u); }
      if(/line-through/.test(deco)){ var s=document.createElement('S'); while(wrap.firstChild) s.appendChild(wrap.firstChild); wrap.appendChild(s); } }
    par.replaceChild(n,c); walk(n);
    if(to==='SPAN'&&!n.getAttribute('style')){ while(n.firstChild) par.insertBefore(n.firstChild,n); par.removeChild(n); }
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
  return out.innerHTML; }

/* ---------- storage ---------- */
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function loadIdx(){ try{ var o=JSON.parse(localStorage.getItem(LS)||'null'); if(o&&Array.isArray(o.docs)) return o; }catch(e){} return {v:1,last:null,docs:[]}; }
var idx=loadIdx(), doc=null, saveT=null;
function readDoc(id){ try{ return localStorage.getItem(DOC+id)||''; }catch(e){ return ''; } }
function writeIdx(){ try{ localStorage.setItem(LS,JSON.stringify(idx)); return true; }catch(e){ return false; } }
function snap(){ return JSON.stringify({n:doc.name, f:doc.font||'', h:page.innerHTML}); }
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
  $('docName').value=d.name||''; page.innerHTML=clean(readDoc(d.id))||'<p><br></p>'; setFont(d.font||'sans',true);
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
function exec(cmd,val){ backSel(); mark(true); try{ document.execCommand('styleWithCSS',false,cmd==='foreColor'); }catch(e){} document.execCommand(cmd,false,val==null?null:val); fixTop(); count(); saveSoon(); sync(); }
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
  $('tblCtx').hidden=!(inPage()&&closest('TD')||inPage()&&closest('TH')); }

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
  if(e.key==='Escape'){ closeMenus(); Array.prototype.forEach.call(document.querySelectorAll('.ov.open'),function(o){ o.classList.remove('open'); }); stopAI(); return; }
  if(!m) { if((e.key==='Delete'||e.key==='Backspace')&&imgSel&&document.activeElement===page&&getSelection().isCollapsed){ e.preventDefault(); mark(true); imgSel.remove(); selImg(null); saveSoon(); } return; }
  if(k==='z'&&!e.shiftKey){ e.preventDefault(); undo(); } else if(k==='y'||(k==='z'&&e.shiftKey)){ e.preventDefault(); redo(); }
  else if(k==='s'){ e.preventDefault(); saveNow(); toast('저장했어요'); }
  else if(k==='p'){ e.preventDefault(); doExport('pdf'); }
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
  put:function(s){ var o=JSON.parse(s); mark(true); page.innerHTML=clean(o.h); $('docName').value=o.n||''; setFont(o.f||'sans'); count(); saveNow(); },
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
    var s2={}; for(var k2 in st) s2[k2]=st[k2];
    if(tag==='B'||tag==='STRONG') s2.b=1; if(tag==='I'||tag==='EM') s2.i=1; if(tag==='U') s2.u=1; if(tag==='S'||tag==='STRIKE') s2.s=1;
    if(c.style&&c.style.color){ var hx=hex(c.style.color); if(hx) s2.color=hx; } if(tag==='FONT'&&c.getAttribute('color')){ var hf=hex(c.getAttribute('color')); if(hf) s2.color=hf; }
    if(/^(P|DIV|LI|H1|H2|H3|BLOCKQUOTE)$/.test(tag)&&out.length&&!out[out.length-1].br) out.push({br:true});
    runsOf(c,s2,out); }
  return out; }
function toBlocks(){ var out=[], list=0;
  function block(el,type){ out.push({type:type, align:alignOf(el), runs:runsOf(el,{})}); }
  Array.prototype.forEach.call(page.childNodes,function(n){
    if(n.nodeType===3){ if(n.textContent.trim()) out.push({type:'p',runs:[{t:n.textContent}]}); return; } if(n.nodeType!==1) return;
    var tag=n.tagName;
    if(/^H[123]$/.test(tag)) block(n,tag.toLowerCase());
    else if(tag==='BLOCKQUOTE'){ var ps=n.querySelectorAll('p'); if(ps.length) Array.prototype.forEach.call(ps,function(p){ block(p,'quote'); }); else block(n,'quote'); }
    else if(tag==='UL'||tag==='OL'){ list++; Array.prototype.forEach.call(n.children,function(li){ if(li.tagName==='LI') out.push({type:tag==='UL'?'li':'oli', list:list, align:alignOf(li), runs:runsOf(li,{})}); }); }
    else if(tag==='TABLE'){ out.push({type:'table', rows:Array.prototype.map.call(n.rows,function(r){ return Array.prototype.map.call(r.cells,function(c){ var rs=runsOf(c,{}); if(c.tagName==='TH') rs.forEach(function(x){ if(!x.br&&!x.img) x.b=1; }); return rs; }); })}); }
    else if(tag==='HR') out.push({type:'hr'});
    else block(n,'p'); });
  out.forEach(function(b){ if(b.runs){ while(b.runs.length&&b.runs[b.runs.length-1].br) b.runs.pop(); } });
  return out; }
/* blocks -> page (opening a .docx) */
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function runsHTML(rs){ return (rs||[]).map(function(r){ if(r.br) return '<br>'; var h=esc(r.t||'').replace(/\t/g,'&emsp;'); if(r.color) h='<span style="color:#'+r.color+'">'+h+'</span>';
  if(r.s) h='<s>'+h+'</s>'; if(r.u) h='<u>'+h+'</u>'; if(r.i) h='<i>'+h+'</i>'; if(r.b) h='<b>'+h+'</b>'; return h; }).join(''); }
function fromBlocks(bs){ var h='', open=null, openId=null;
  bs.forEach(function(b){ var lt=b.type==='li'?'ul':b.type==='oli'?'ol':null;
    if(open&&(lt!==open||b.list!==openId)){ h+='</'+open+'>'; open=null; }
    var al=b.align?' style="text-align:'+(b.align==='both'?'justify':b.align)+'"':'', inner=runsHTML(b.runs)||'<br>';
    if(lt){ if(!open){ h+='<'+lt+'>'; open=lt; openId=b.list; } h+='<li'+al+'>'+inner+'</li>'; return; }
    if(b.type==='table') h+='<table><tbody>'+(b.rows||[]).map(function(r){ return '<tr>'+r.map(function(c){ return '<td>'+(runsHTML(c)||'<br>')+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody></table>';
    else if(b.type==='hr') h+='<hr>';
    else { var t={h1:'h1',h2:'h2',h3:'h3',quote:'blockquote'}[b.type]||'p'; h+='<'+t+al+'>'+inner+'</'+t+'>'; } });
  if(open) h+='</'+open+'>'; return h; }

/* ---------- export / open ---------- */
function fname(ext){ return (($('docName').value.trim()||T('제목 없는 문서')).replace(/[\\/:*?"<>|]+/g,' ').trim()||'document')+'.'+ext; }
function download(data,type,name){ var a=document.createElement('a'), u=URL.createObjectURL(new Blob([data],{type:type})); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(u); },4000); }
function doExport(k){ closeMenus(); selImg(null); saveNow();
  if(k==='docx'){ try{ download(FFDocx.write(toBlocks()),'application/vnd.openxmlformats-officedocument.wordprocessingml.document',fname('docx')); toast('Word 문서로 받았어요'); }catch(e){ console.error(e); toast('Word 문서를 만들지 못했어요'); } }
  else if(k==='pdf'){ toast('인쇄 창에서 "PDF로 저장"을 고르세요'); setTimeout(function(){ window.print(); },300); }
  else if(k==='html'){ var css='body{font-family:"Noto Sans KR","Malgun Gothic",sans-serif;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.7;color:#1b1b1b}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:6px 8px}th{background:#f2f2f2}blockquote{border-left:4px solid #ccc;margin:0;padding-left:1em;color:#555;font-style:italic}img{max-width:100%}';
    download('<!DOCTYPE html>\n<html lang="ko"><head><meta charset="UTF-8"><title>'+esc($('docName').value)+'</title><style>'+css+'</style></head><body>\n'+page.innerHTML.replace(/ class="sel"/g,'')+'\n</body></html>','text/html',fname('html')); }
  else if(k==='txt') download(page.innerText,'text/plain;charset=utf-8',fname('txt')); }
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
  cont:{title:'이어 쓰기', sys:'You continue a document in the same language and style. Write one or two new paragraphs that follow naturally. Reply with only the new text.', pre:'Continue this text:\n\n'}};
function stopAI(){ if(aiJob){ aiJob++; try{ FFAI.stop(); }catch(e){} } }
function aiSource(){ backSel(); var s=getSelection(), r=s.rangeCount?s.getRangeAt(0):null;
  if(r&&!r.collapsed&&page.contains(r.commonAncestorContainer)) return {range:r.cloneRange(), text:r.toString()};
  var bl=curBlock(); if(bl&&bl.textContent.trim()){ var rr=document.createRange(); rr.selectNodeContents(bl); return {range:rr, text:bl.textContent}; }
  return null; }
function runAI(task){ closeMenus(); if(!window.FFAI){ toast('AI를 불러오지 못했어요'); return; }
  if(task==='set'){ FFAI.settings(); return; }
  var src=aiSource();
  if(task==='cont'&&!src){ var all=page.innerText.trim(); if(all){ var r0=document.createRange(); r0.selectNodeContents(page); r0.collapse(false); src={range:r0,text:all.slice(-1500)}; } }
  if(!src||!src.text.trim()){ toast('먼저 글을 고르거나 문단 안을 누르세요'); return; }
  aiRange=src.range; aiTask=task; aiText=''; var t=TASKS[task], job=++aiJob, text=src.text.slice(0,task==='cont'?1500:4000);
  $('aiTitle').textContent=T(t.title); $('aiOut').textContent=T('AI가 쓰는 중…'); $('aiRep').disabled=true; $('aiBelow').disabled=true; $('aiStop').hidden=false;
  $('aiRep').hidden=task==='cont'; openDlg('aiDlg');
  FFAI.ask({system:t.sys, prompt:t.pre+text, prose:true, maxTokens:task==='sum'?300:900, onText:function(s){ if(job===aiJob){ aiText=s; $('aiOut').textContent=s; } }})
    .then(function(s){ if(job!==aiJob) return; aiJob=0; aiText=String(s||aiText).replace(/^\s*["“]|["”]\s*$/g,'').trim(); $('aiOut').textContent=aiText||T('AI가 아무것도 쓰지 않았어요'); $('aiStop').hidden=true; $('aiRep').disabled=$('aiBelow').disabled=!aiText; },
      function(e){ if(job!==aiJob) return; aiJob=0; $('aiStop').hidden=true; $('aiOut').textContent=(e&&e.message)||T('AI가 답하지 못했어요'); if(aiText){ $('aiRep').disabled=$('aiBelow').disabled=false; } }); }
Array.prototype.forEach.call(document.querySelectorAll('[data-a]'),function(b){ b.onclick=function(){ runAI(b.dataset.a); }; });
$('aiStop').onclick=function(){ stopAI(); aiJob=0; $('aiStop').hidden=true; $('aiRep').disabled=$('aiBelow').disabled=!aiText; };
function paras(t){ return t.split(/\n{2,}|\n/).filter(function(l){ return l.trim(); }).map(function(l){ return '<p>'+esc(l.trim())+'</p>'; }).join(''); }
$('aiRep').onclick=function(){ if(!aiRange||!aiText) return; closeDlg('aiDlg'); mark(true); var s=getSelection(); page.focus(); s.removeAllRanges(); s.addRange(aiRange);
  if(/\n/.test(aiText)) document.execCommand('insertHTML',false,paras(aiText)); else document.execCommand('insertText',false,aiText); fixTop(); count(); saveSoon(); toast('바꿨어요 · Ctrl+Z로 되돌리기'); };
$('aiBelow').onclick=function(){ if(!aiRange||!aiText) return; closeDlg('aiDlg'); mark(true);
  var n=aiRange.endContainer; while(n&&n.parentNode!==page) n=n.parentNode; var box=document.createElement('div'); box.innerHTML=paras(aiText);
  var after=n?n.nextSibling:null, last=null; while(box.firstChild){ last=box.firstChild; page.insertBefore(last,after); }
  if(last){ var r=document.createRange(); r.selectNodeContents(last); r.collapse(false); var s=getSelection(); s.removeAllRanges(); s.addRange(r); }
  count(); saveSoon(); toast('아래에 넣었어요'); };

/* ---------- start ---------- */
(function(){ var d=idx.docs.filter(function(x){ return x.id===idx.last; })[0]||idx.docs[0]; if(d) openDoc(d); else newDoc(); })();
window.addEventListener('pagehide',saveNow);
document.addEventListener('visibilitychange',function(){ if(document.hidden) saveNow(); });
window.FDOCS={toBlocks:toBlocks, fromBlocks:fromBlocks, clean:clean}; // for the tests
})();
