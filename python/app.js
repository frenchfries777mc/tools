/* Fry Code (was Fry Python): write Python (run in the browser by worker.js + Pyodide, turtle pictures, graphs, AI error help) or JavaScript, Java, HTML, JSON and BeaconScript (langs.js).
   Files live in this browser (localStorage); each file remembers its language (f.lang). */
(function(){
'use strict';
var T=function(s){ return window.FFT&&FFT.T?FFT.T(s):s; }, F=function(s){ var a=arguments; s=T(s); return s.replace(/\{(\d)\}/g,function(m,i){ return a[+i+1]; }); };
function $(id){ return document.getElementById(id); }
var code=$('code'), hl=$('hl'), gut=$('gut'), out=$('out'), LS='ffpy.v1', FILE='ffpy.file.';
var toastT=null, curLang='python', IN='    ', FC=window.FCODE||{langs:{python:{id:'python',name:'Python',ext:'py',indent:'    ',tabs:[['out','결과']]}},order:['python']};
function LG(){ return FC.langs[curLang]||FC.langs.python; }
function trCode(src){ return String(src).split('\n').map(function(l){ if(!/[\uAC00-\uD7A3]/.test(l)) return l; var m=/^(\s*)([\s\S]*)$/.exec(l); return m[1]+T(m[2]); }).join('\n'); }
function trErr(e){ return String(e).split('\n').map(function(l){ if(!/[\uAC00-\uD7A3]/.test(l)) return l; var q=l.replace(/<코드>/g,'\u0001'); var m=/^(\s*[A-Za-z]*Error: )(.*)$/.exec(q); var xy=m&&/^x와 y의 개수가 달라요 \(x (\d+)개, y (\d+)개\)$/.exec(m[2]); q=xy?m[1]+F('x와 y의 개수가 달라요 (x {0}개, y {1}개)',xy[1],xy[2]):m?m[1]+T(m[2]):q; return q.replace(/\u0001/g,T('<코드>')); }).join('\n'); }
function toast(m){ var t=$('toast'); t.textContent=T(m); t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(function(){ t.classList.remove('on'); },2600); }
function esc(s){ return String(s).replace(/[&<>]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }

/* ---------- highlighting ---------- */
var KW=/^(False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|match|case)$/;
var BI=/^(print|input|len|range|int|float|str|list|dict|set|tuple|bool|abs|min|max|sum|round|sorted|reversed|enumerate|zip|map|filter|open|type|isinstance|any|all|chr|ord|divmod|pow|super|self|format|help|id|iter|next|hex|bin|oct)$/;
var TOK=/(#[^\n]*)|([rRbBfFuU]{0,2}(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?))|(\b\d[\d_]*(?:\.\d*)?(?:[eE][+-]?\d+)?j?\b|\b0[xXoObB][\da-fA-F_]+\b)|([A-Za-z_À-￿][\wÀ-￿]*)/g;
var errLine=0;
function paint(){
  var src=code.value, h='', last=0, m, prevDef=false; TOK.lastIndex=0;
  if(curLang!=='python'&&LG().hl){ h=LG().hl(src); last=src.length; TOK.lastIndex=src.length; }
  while((m=TOK.exec(src))){ h+=esc(src.slice(last,m.index)); last=TOK.lastIndex; var t=m[0];
    if(m[1]) h+='<span class="c">'+esc(t)+'</span>';
    else if(m[2]) h+='<span class="s">'+esc(t)+'</span>';
    else if(m[3]) h+='<span class="n">'+esc(t)+'</span>';
    else if(KW.test(t)){ h+='<span class="k">'+t+'</span>'; prevDef=(t==='def'||t==='class'); continue; }
    else if(prevDef) h+='<span class="f">'+esc(t)+'</span>';
    else if(BI.test(t)) h+='<span class="b">'+t+'</span>';
    else h+=esc(t);
    prevDef=false; }
  if(last<src.length) h+=esc(src.slice(last));
  if(errLine){ var ls=h.split('\n'); if(ls[errLine-1]!=null) ls[errLine-1]='<span class="eline">'+(ls[errLine-1]||' ')+'</span>'; h=ls.join('\n'); }
  hl.innerHTML=h+'\n ';
  var n=src.split('\n').length, g=''; for(var i=1;i<=n;i++) g+='<div'+(i===errLine?' class="bad"':'')+'>'+i+'</div>'; gut.innerHTML=g;
  scrollSync(); if(window.fRefresh) window.fRefresh(); }
function scrollSync(){ hl.scrollTop=code.scrollTop; hl.scrollLeft=code.scrollLeft; gut.scrollTop=code.scrollTop; var fh=$('fhl'); if(fh){ fh.scrollTop=code.scrollTop; fh.scrollLeft=code.scrollLeft; } }
code.addEventListener('scroll',scrollSync);
function caretPos(){ var v=code.value.slice(0,code.selectionStart).split('\n'); $('pos').textContent=F('{0}줄 {1}칸',v.length,v[v.length-1].length+1); }
code.addEventListener('input',function(e){ if(errLine){ errLine=0; } paint(); saveSoon(); caretPos(); if(e.isComposing||/^delete/.test(e.inputType||'')||e.inputType==='insertLineBreak') acHide(); else acUpdate(); if(LG().live) liveSoon(); });
['keyup','click','select'].forEach(function(e){ code.addEventListener(e,caretPos); });
function ins(t){ code.focus(); if(!document.execCommand('insertText',false,t)){ var a=code.selectionStart,b=code.selectionEnd; code.setRangeText(t,a,b,'end'); code.dispatchEvent(new Event('input')); } }
code.addEventListener('keydown',function(e){
  if(ac.open){
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); ac.sel=(ac.sel+(e.key==='ArrowDown'?1:ac.items.length-1))%ac.items.length; acMove(); return; }
    if(e.key==='Tab'&&!e.shiftKey&&!e.ctrlKey&&!e.altKey){ e.preventDefault(); acPick(); return; }
    if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); acHide(); return; }
    if(e.key==='Enter'||e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key==='Home'||e.key==='End') acHide();
  }
  if((e.ctrlKey||e.metaKey)&&e.code==='Space'){ e.preventDefault(); acUpdate(true); return; }
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){ e.preventDefault(); run(); return; }
  if(e.key==='Tab'&&!e.altKey&&!e.ctrlKey&&!e.metaKey){ e.preventDefault(); var v=code.value, a=code.selectionStart, b=code.selectionEnd;
    if(a===b&&!e.shiftKey){ ins(IN); return; }
    var ls=v.lastIndexOf('\n',a-1)+1, le=v.indexOf('\n',b-(b>a&&v[b-1]==='\n'?1:0)); if(le<0) le=v.length;
    var block=v.slice(ls,le), nb=e.shiftKey?block.replace(new RegExp('^( {1,'+IN.length+'}|\\t)','gm'),''):block.replace(/^/gm,IN);
    code.setSelectionRange(ls,le); ins(nb); code.setSelectionRange(ls,ls+nb.length); return; }
  if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){ var v2=code.value, p=code.selectionStart, line=v2.slice(v2.lastIndexOf('\n',p-1)+1,p), ind=/^\s*/.exec(line)[0];
    if(curLang==='python'){ if(/:\s*(#.*)?$/.test(line)) ind+=IN; else if(/^\s*(return|break|continue|pass|raise)\b/.test(line)) ind=ind.slice(0,Math.max(0,ind.length-4)); }
    else { var op=LG().open; if(op&&op.test(line)){ ind+=IN; var nx0=v2[p], cl={'{':'}','[':']','(':')'}[line.trim().slice(-1)];
      if(cl&&nx0===cl&&curLang!=='beaconscript'){ e.preventDefault(); ins('\n'+ind+'\n'+ind.slice(0,ind.length-IN.length)); var np0=p+1+ind.length; code.setSelectionRange(np0,np0); return; } } }
    e.preventDefault(); ins('\n'+ind); return; }
  if(e.key==='Backspace'&&code.selectionStart===code.selectionEnd){ var v3=code.value, q=code.selectionStart, lb=v3.slice(v3.lastIndexOf('\n',q-1)+1,q);
    if(lb.length&&/^ +$/.test(lb)&&lb.length%IN.length===0){ e.preventDefault(); code.setSelectionRange(q-IN.length,q); ins(''); } }
  var pairs={'(':')','[':']','{':'}','"':'"',"'":"'"};
  if(pairs[e.key]&&!e.ctrlKey&&!e.metaKey&&code.selectionStart===code.selectionEnd){ var nx=code.value[code.selectionStart]||'';
    if((e.key==='"'||e.key==="'")&&nx===e.key){ e.preventDefault(); code.setSelectionRange(code.selectionStart+1,code.selectionStart+1); return; }
    if(!nx||/[\s)\]}:,]/.test(nx)){ if((e.key==='"'||e.key==="'")&&/\w/.test(code.value[code.selectionStart-1]||'')) return; e.preventDefault(); ins(e.key+pairs[e.key]); code.setSelectionRange(code.selectionStart-1,code.selectionStart-1); } return; }
  if(/^[)\]}]$/.test(e.key)&&code.value[code.selectionStart]===e.key&&code.selectionStart===code.selectionEnd){ e.preventDefault(); code.setSelectionRange(code.selectionStart+1,code.selectionStart+1); }
});

/* ---------- auto-complete (Tab to accept) ---------- */
var D=window.FPY_DICT||{cats:[],list:[]}, ac={open:false, items:[], sel:0, start:0};
var KWS=D.list.filter(function(x){ return x.c==='syntax'; }), BIS=D.list.filter(function(x){ return x.c==='basic'; });
function byCat(c){ return D.list.filter(function(x){ return x.c===c; }); }
var acBox=document.createElement('div'); acBox.id='ac'; acBox.hidden=true; document.body.appendChild(acBox);
var mir=document.createElement('div'); mir.id='mir'; mir.setAttribute('aria-hidden','true'); document.body.appendChild(mir);
function acHide(){ ac.open=false; acBox.hidden=true; }
function inStrOrComment(line){ var q=null, i=0; for(;i<line.length;i++){ var c=line[i]; if(q){ if(c==='\\') i++; else if(c===q) q=null; } else if(c==='#') return true; else if(c==='"'||c==="'") q=c; } return !!q; }
function userNames(src){ var set={}, m, re;
  [/\bdef\s+([A-Za-z_À-￿][\wÀ-￿]*)/g, /\bclass\s+([A-Za-z_À-￿][\wÀ-￿]*)/g].forEach(function(r){ while((m=r.exec(src))) set[m[1]]=m[0].indexOf('def')===0?'함수':'클래스'; });
  re=/^[ \t]*([A-Za-z_À-￿][\wÀ-￿]*(?:\s*,\s*[A-Za-z_À-￿][\wÀ-￿]*)*)\s*(?:[-+*\/%]|\/\/|\*\*)?=(?!=)/gm; while((m=re.exec(src))) m[1].split(/\s*,\s*/).forEach(function(n){ set[n]=set[n]||'변수'; });
  re=/\bfor\s+([A-Za-z_À-￿][\wÀ-￿]*(?:\s*,\s*[A-Za-z_À-￿][\wÀ-￿]*)*)\s+in\b/g; while((m=re.exec(src))) m[1].split(/\s*,\s*/).forEach(function(n){ set[n]=set[n]||'변수'; });
  re=/\bdef\s+[\wÀ-￿]+\s*\(([^)]*)\)/g; while((m=re.exec(src))) m[1].split(',').forEach(function(a){ a=a.trim().split(/[=:]/)[0].replace(/^\*+/,'').trim(); if(/^[A-Za-z_À-￿][\wÀ-￿]*$/.test(a)) set[a]=set[a]||'변수'; });
  re=/\bas\s+([A-Za-z_À-￿][\wÀ-￿]*)/g; while((m=re.exec(src))) set[m[1]]=set[m[1]]||'변수';
  return set; }
function modules(src){ var mods={}, star={}, m, re=/^[ \t]*import\s+(.+)$/gm;
  while((m=re.exec(src))) m[1].split(',').forEach(function(part){ var mm=/^\s*([\w.]+)(?:\s+as\s+(\w+))?/.exec(part); if(!mm) return; var base=mm[1]==='matplotlib.pyplot'?'plot':mm[1].split('.')[0]; mods[mm[2]||(mm[1]==='matplotlib.pyplot'?'matplotlib':mm[1].split('.')[0])]=base; if(mm[1]==='matplotlib.pyplot'&&!mm[2]) mods['matplotlib.pyplot']='plot'; });
  re=/^[ \t]*from\s+([\w.]+)\s+import\s+(.+)$/gm; while((m=re.exec(src))){ var mod=m[1]==='matplotlib'||m[1]==='matplotlib.pyplot'?'plot':m[1]; if(m[2].trim()==='*') star[mod]=1; else m[2].split(',').forEach(function(n){ var nn=/^\s*(\w+)(?:\s+as\s+(\w+))?/.exec(n); if(nn){ star['name:'+(nn[2]||nn[1])]=mod; } }); }
  return {mods:mods, star:star}; }
function turtleVars(src){ var set={}, m, re=/([A-Za-z_]\w*)\s*=\s*(?:turtle\.)?(?:Turtle|Pen|RawTurtle)\(/g; while((m=re.exec(src))) set[m[1]]=1; return set; }
function rank(list,pre,keyf){ var lo=pre.toLowerCase(), a=[], b=[]; list.forEach(function(x){ var n=keyf(x), l=n.toLowerCase(); if(l.indexOf(lo)===0) a.push(x); else if(lo.length>1&&l.indexOf(lo)>0) b.push(x); }); return a.concat(b); }
function acOther(force){ var pos=code.selectionStart; if(pos!==code.selectionEnd) return null; var src=code.value, ls=src.lastIndexOf('\n',pos-1)+1, line=src.slice(ls,pos), L=LG();
  var wm=/([A-Za-z_$\u00c0-\uffff][\w$\u00c0-\uffff-]*)$/.exec(line), pre=wm?wm[1]:''; if(L.sug){ var before=line.slice(0,line.length-pre.length); var cx=src.slice(0,ls); if(!pre&&!force&&(!before.trim()||!/\s$/.test(before))) return null; if(/^\d/.test(pre)) return null; var its=rank(L.sug(before,pre,cx).map(function(w){ return w; }),pre,function(x){ return x.n; }); if(!pre) its=L.sug(before,pre,cx); if(!its.length||(its.length===1&&its[0].n===pre&&!force)) return null; return {items:its.slice(0,2000), start:pos-pre.length, pre:pre}; }
  if((!pre&&!force)||/^\d/.test(pre)) return null;
  if(curLang==='json'||(curLang!=='html'&&/(^|[^\\])"[^"]*$/.test(line))) return null;
  var pool=(L.words||[]).map(function(w){ return {n:w[0],i:w[1],d:w[2]}; }), seen={}; pool.forEach(function(x){ seen[x.n]=1; });
  if(curLang!=='html'){ var mm, re=/[A-Za-z_$][\w$]{2,}/g, cnt=0; while((mm=re.exec(src))&&cnt<400){ cnt++; if(!seen[mm[0]]&&mm.index!==pos-pre.length){ seen[mm[0]]=1; pool.push({n:mm[0],i:mm[0],d:'쓴 이름'}); } } }
  var items=rank(pool,pre,function(x){ return x.n; }); if(!items.length) return null; if(!force&&items.length===1&&items[0].n===pre) return null;
  return {items:items.slice(0,8), start:pos-pre.length, pre:pre}; }
function acItems(force){
  if(curLang!=='python') return acOther(force);
  var pos=code.selectionStart; if(pos!==code.selectionEnd) return null;
  var src=code.value, ls=src.lastIndexOf('\n',pos-1)+1, line=src.slice(ls,pos);
  if(inStrOrComment(line)) return null;
  var mm=/([A-Za-z_][\w.]*)\.([A-Za-z_À-￿][\wÀ-￿]*)?$/.exec(line), items=[], start, pre;
  if(mm){ pre=mm[2]||''; start=pos-pre.length; var owner=mm[1], info=modules(src), base=info.mods[owner], tv=turtleVars(src), pool;
    if(base==='turtle') pool=byCat('turtle').map(function(x){ return x.n==='turtle.Turtle'?{c:'turtle',n:'Turtle',i:'Turtle()',d:x.d,e:x.e}:x; }).filter(function(x){ return x.n!=='bgcolor'||true; });
    else if(base==='math') pool=byCat('math'); else if(base==='random') pool=byCat('random'); else if(base==='plot') pool=byCat('plot');
    else if(tv[owner]) pool=byCat('turtle').filter(function(x){ return x.n!=='turtle.Turtle'&&x.n!=='bgcolor'; });
    else { var seen={}; pool=byCat('str').concat(byCat('list'),byCat('dict')).filter(function(x){ if(seen[x.n]) return false; seen[x.n]=1; return true; }); }
    items=rank(pool,pre,function(x){ return x.n; }); if(!pre&&!force&&!items.length) return null; }
  else { var wm=/([A-Za-z_À-￿][\wÀ-￿]*)$/.exec(line); pre=wm?wm[1]:''; start=pos-pre.length;
    if(!pre&&!force) return null; if(/^\d/.test(pre)) return null;
    var names=userNames(src), info2=modules(src), pool2=KWS.concat(BIS), seenN={};
    Object.keys(info2.mods).forEach(function(k){ if(k.indexOf('.')<0) pool2.push({c:'mod',n:k,i:k,d:'불러온 모듈'}); });
    ['turtle','math','random','plot'].forEach(function(mod){ if(info2.star[mod]) byCat(mod==='plot'?'plot':mod).forEach(function(x){ pool2.push({c:mod,n:x.n.replace(/^turtle\./,''),i:x.i.replace(/^turtle\./,''),d:x.d,e:x.e}); }); });
    Object.keys(names).forEach(function(n){ pool2.push({c:'user',n:n,i:n,d:names[n]}); });
    var seenK={}; pool2=pool2.filter(function(x){ var k=x.n; if(seenK[k]) return false; seenK[k]=1; return true; });
    items=rank(pool2,pre,function(x){ return x.n; });
    var ex=items.filter(function(x){ return x.n===pre; }); if(!force&&items.length===1&&ex.length===1) return null; }
  if(!items.length) return null; return {items:items.slice(0,8), start:start, pre:pre}; }
function caretXY(){ var cs=getComputedStyle(code); mir.style.cssText='position:fixed;left:-9999px;top:0;visibility:hidden;white-space:pre;overflow:hidden;font:'+cs.font+';letter-spacing:0;tab-size:4;padding:'+cs.padding+';width:'+code.clientWidth+'px;line-height:'+cs.lineHeight;
  mir.textContent=code.value.slice(0,code.selectionStart); var sp=document.createElement('span'); sp.textContent='​'; mir.appendChild(sp);
  var r=code.getBoundingClientRect(), lh=parseFloat(cs.lineHeight)||21;
  return {x:r.left+sp.offsetLeft-code.scrollLeft, y:r.top+sp.offsetTop-code.scrollTop+lh}; }
function acMove(){ var o=acBox.querySelector('.aci.on'); if(o) o.classList.remove('on'); var n=acBox.children[ac.sel]; if(n&&n.classList.contains('aci')){ n.classList.add('on'); if(n.scrollIntoView) n.scrollIntoView({block:'nearest'}); } else acRender(); }
function acRender(){ acBox.innerHTML=''; ac.items.forEach(function(x,i){ var d=document.createElement('div'); d.className='aci'+(i===ac.sel?' on':'');
    var n=document.createElement('b'); n.textContent=x.n; var s=document.createElement('span'); s.textContent=T(x.d||''); d.appendChild(n); d.appendChild(s);
    d.onmousedown=function(e){ e.preventDefault(); ac.sel=i; acPick(); }; acBox.appendChild(d); });
  var h=document.createElement('div'); h.className='ach'; h.textContent=T('Tab 키로 넣기 · ↑↓ 고르기 · Esc 닫기'); acBox.appendChild(h);
  var p=caretXY(); acBox.hidden=false; var w=acBox.offsetWidth, hh=acBox.offsetHeight, x=Math.max(6,Math.min(innerWidth-w-6,p.x)), y=p.y+4;
  if(y+hh>innerHeight-6){ y=p.y-(parseFloat(getComputedStyle(code).lineHeight)||21)-hh-4; if(y<6) y=6; } acBox.style.left=x+'px'; acBox.style.top=y+'px'; var se=acBox.querySelector('.aci.on'); if(se&&se.scrollIntoView) se.scrollIntoView({block:'nearest'}); }
function acUpdate(force){ var r=acItems(force); if(!r){ acHide(); return; } ac.items=r.items; ac.start=r.start; ac.sel=0; ac.open=true; acRender(); }
function acPick(){ var x=ac.items[ac.sel]; if(!x){ acHide(); return; } var pos=code.selectionStart, line=code.value.slice(code.value.lastIndexOf('\n',pos-1)+1,pos), ind=/^\s*/.exec(line)[0];
  var txt=x.i.replace(/\n/g,'\n'+ind), at=txt.indexOf('$0'); txt=txt.replace('$0','');
  code.setSelectionRange(ac.start,pos); acHide(); ins(txt); if(at>=0){ var np=ac.start+at; code.setSelectionRange(np,np); } caretPos(); if(LG().sug&&at<0&&/ $/.test(txt)) acUpdate(); }
code.addEventListener('blur',function(){ setTimeout(acHide,120); });
code.addEventListener('scroll',acHide); code.addEventListener('mousedown',acHide);
window.addEventListener('resize',acHide);

/* ---------- dictionary (사전) ---------- */
var dictCat='all', PFX={turtle:'t.',plot:'plt.',math:'math.',random:'random.',str:'.',list:'.',dict:'.'};
function drawDict(){ var q=$('dictQ').value.trim().toLowerCase(), box=$('dictList'); box.innerHTML='';
  var chips=$('dictCats'); if(!chips.children.length){ [['all','전체']].concat(D.cats).forEach(function(c){ var b=document.createElement('button'); b.type='button'; b.dataset.c=c[0]; b.textContent=T(c[1]); b.onclick=function(){ dictCat=c[0]; drawDict(); }; chips.appendChild(b); }); }
  Array.prototype.forEach.call(chips.children,function(b){ b.classList.toggle('on',b.dataset.c===dictCat); });
  var n=0; D.list.forEach(function(x){ if(dictCat!=='all'&&x.c!==dictCat) return;
    if(q&&(x.n+' '+x.d+' '+T(x.d)+' '+(PFX[x.c]||'')+x.n).toLowerCase().indexOf(q)<0) return; n++;
    var row=document.createElement('button'); row.type='button'; row.className='drow'; var p=(x.n==='turtle.Turtle')?'':(PFX[x.c]||'');
    var h=document.createElement('code'); h.textContent=p+x.n; var d=document.createElement('span'); d.textContent=T(x.d); row.appendChild(h); row.appendChild(d);
    if(x.e){ var e=document.createElement('pre'); e.textContent=trCode(x.e); row.appendChild(e); }
    row.onclick=function(){ closeDlg('dictDlg'); var t=p+x.i.replace(/\n/g,'\n'), at=t.indexOf('$0'); t=t.replace('$0',''); var base=code.selectionStart; code.focus(); ins(t); if(at>=0) code.setSelectionRange(base+at,base+at); caretPos(); };
    box.appendChild(row); });
  if(!n){ var e2=document.createElement('p'); e2.className='none'; e2.textContent=T('찾는 명령이 없어요'); box.appendChild(e2); } }
$('dictBtn').onclick=function(){ $('dictDlg').classList.add('open'); drawDict(); setTimeout(function(){ $('dictQ').focus(); },30); };
$('dictQ').addEventListener('input',drawDict);

/* ---------- files ---------- */
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function loadIdx(){ try{ var o=JSON.parse(localStorage.getItem(LS)||'null'); if(o&&Array.isArray(o.files)) return o; }catch(e){} return {v:1,last:null,files:[]}; }
var idx=loadIdx(), file=null, saveT=null;
function readFile(id){ try{ return localStorage.getItem(FILE+id); }catch(e){ return null; } }
function writeIdx(){ try{ localStorage.setItem(LS,JSON.stringify(idx)); }catch(e){} }
function snap(){ return JSON.stringify({n:file.name, c:code.value, i:$('stdin').value, l:curLang}); }
function saveNow(){ clearTimeout(saveT); saveT=null; if(!file) return; file.t=Date.now(); file.name=$('fileName').value.trim()||T('새 파일'); file.stdin=$('stdin').value; file.lang=curLang; idx.last=file.id;
  if(idx.files.indexOf(file)<0) idx.files.unshift(file);
  try{ localStorage.setItem(FILE+file.id,code.value); localStorage.setItem(LS,JSON.stringify(idx)); $('saved').textContent=T('저장됨'); }catch(e){ toast('저장 공간이 부족해서 저장하지 못했어요'); }
  if(window.FFVer) FFVer.tick('python.'+file.id,snap); }
function saveSoon(){ $('saved').textContent=''; clearTimeout(saveT); saveT=setTimeout(saveNow,600); }
function openFile(f){ if(file&&file!==f) saveNow(); file=f; if(idx.files.indexOf(f)<0) idx.files.unshift(f);
  $('fileName').value=f.name||''; code.value=readFile(f.id)||''; $('stdin').value=f.stdin||''; $('stdinBox').open=!!f.stdin; setLang(f.lang||'python',true); errLine=0; paint(); caretPos(); code.scrollTop=0; saveNow(); }
function newFile(name,src,stdin,lang){ var f={id:uid(), name:name||T('새 파일'), t:Date.now(), stdin:stdin||'', lang:lang||'python'}; try{ localStorage.setItem(FILE+f.id,src||''); }catch(e){} idx.files.unshift(f); openFile(f); return f; }
$('fileName').addEventListener('input',saveSoon);
$('fileName').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); code.focus(); } });
$('stdin').addEventListener('input',saveSoon);

function ago(t){ return window.FFVer?T(FFVer.ago(t)):new Date(t).toLocaleString(); }
function closeDlg(id){ $(id).classList.remove('open'); }
Array.prototype.forEach.call(document.querySelectorAll('.ov'),function(ov){ ov.addEventListener('mousedown',function(e){ if(e.target===ov) ov.classList.remove('open'); });
  Array.prototype.forEach.call(ov.querySelectorAll('[data-close]'),function(b){ b.onclick=function(){ ov.classList.remove('open'); }; }); });
function drawMgr(){ var ul=$('fileList'); ul.innerHTML='';
  idx.files.slice().sort(function(a,b){ return (b.t||0)-(a.t||0); }).forEach(function(f){ var li=document.createElement('li'); if(f===file) li.className='on';
    var nm=document.createElement('div'); nm.className='dn'; nm.setAttribute('data-notr',''); var b=document.createElement('b'); b.textContent=f.name; var sm=document.createElement('small'); sm.innerHTML=lgi(f.lang||'python')+esc(((FC.langs[f.lang||'python']||{}).name||'Python')+' · '+ago(f.t||Date.now())); nm.appendChild(b); nm.appendChild(sm);
    nm.onclick=function(){ openFile(f); closeDlg('mgrDlg'); };
    var rn=document.createElement('button'); rn.className='ib'; rn.title=T('이름 바꾸기'); rn.setAttribute('aria-label',T('이름 바꾸기')); rn.textContent='✏️';
    rn.onclick=function(){ var inp=document.createElement('input'); inp.value=f.name; inp.setAttribute('data-notr',''); li.replaceChild(inp,nm); inp.focus(); inp.select();
      function done(){ var v=inp.value.trim(); if(v){ f.name=v; if(f===file) $('fileName').value=v; writeIdx(); } drawMgr(); }
      inp.onkeydown=function(e){ if(e.key==='Enter') done(); if(e.key==='Escape'){ e.stopPropagation(); drawMgr(); } }; inp.onblur=done; };
    var del=document.createElement('button'); del.className='ib'; del.title=T('지우기'); del.setAttribute('aria-label',T('지우기')); del.textContent='🗑️';
    del.onclick=function(){ var src=readFile(f.id), pos=idx.files.indexOf(f); idx.files.splice(pos,1); try{ localStorage.removeItem(FILE+f.id); }catch(e){}
      if(f===file){ file=null; if(idx.files.length) openFile(idx.files[0]); else newFile(); } writeIdx(); drawMgr();
      if(window.FFUndo) FFUndo.show(F('"{0}" 파일을 지웠어요',f.name),function(){ try{ localStorage.setItem(FILE+f.id,src||''); }catch(e){} idx.files.splice(Math.min(pos,idx.files.length),0,f); writeIdx(); openFile(f); drawMgr(); }); };
    li.appendChild(nm); li.appendChild(rn); li.appendChild(del); ul.appendChild(li); }); }
$('mineBtn').onclick=function(){ saveNow(); drawMgr(); $('mgrDlg').classList.add('open'); };
$('newBtn').onclick=function(){ var L=LG(); newFile(T('새 파일'),curLang==='python'?'':(L.starter||''),'',curLang); closeDlg('mgrDlg'); code.focus(); };
$('verBtn').onclick=function(){ if(!window.FFVer||!file) return; saveNow(); FFVer.open({key:'python.'+file.id,title:'버전 기록',get:snap,toast:toast,
  put:function(s){ var o=JSON.parse(s); if(o.l&&o.l!==curLang) setLang(o.l,true); code.value=o.c||''; $('fileName').value=o.n||''; $('stdin').value=o.i||''; errLine=0; paint(); saveNow(); },
  describe:function(s){ var o=JSON.parse(s); return F('{0}줄',(o.c||'').split('\n').length); }}); };

/* ---------- menus ---------- */
function closeMenus(){ Array.prototype.forEach.call(document.querySelectorAll('.menu.open'),function(m){ m.classList.remove('open'); }); }
function popMenu(menu,btn){ var open=menu.classList.contains('open'); closeMenus(); if(open) return; menu.classList.add('open');
  var r=btn.getBoundingClientRect(), w=menu.offsetWidth; menu.style.top=(r.bottom+6)+'px'; menu.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px'; }
document.addEventListener('mousedown',function(e){ if(!e.target.closest('.menu')&&!e.target.closest('#exBtn')&&!e.target.closest('#langBtn')&&!e.target.closest('#fileBtn')) closeMenus(); });
function buildEx(){ var m=$('exMenu'); m.innerHTML=''; var h=document.createElement('div'); h.className='mh'; h.textContent=T('예제를 지금 파일에 불러와요 (원래 코드는 되돌리기로 살려요)'); m.appendChild(h);
  (curLang==='python'?(window.FPY_EX||[]):(LG().ex||[])).forEach(function(ex){ var b=document.createElement('button'); b.textContent=T(ex[0]);
    b.onclick=function(){ closeMenus(); var prev={c:code.value, i:$('stdin').value};
      code.value=curLang==='python'?trCode(ex[1]):ex[1]; $('stdin').value=ex[2]||''; $('stdinBox').open=!!ex[2]; errLine=0; paint(); caretPos(); code.scrollTop=0; saveNow(); if(LG().live) liveSoon();
      if(window.FFUndo) FFUndo.show(T('예제를 이 파일에 불러왔어요. ▶ 실행을 눌러 보세요'),function(){ code.value=prev.c; $('stdin').value=prev.i; errLine=0; paint(); saveNow(); }); else toast('예제를 이 파일에 불러왔어요'); };
    m.appendChild(b); }); }
$('exBtn').onclick=function(){ popMenu($('exMenu'),this); };
$('fileBtn').onclick=function(){ popMenu($('fileMenu'),this); };
Array.prototype.forEach.call(document.querySelectorAll('[data-f]'),function(b){ b.onclick=function(){ closeMenus(); var k=b.dataset.f;
  if(k==='usage'){ if(window.FFUsage) FFUsage.open(); }
  else if(k==='open'){ $('openFile').value=''; $('openFile').click(); }
  else if(k==='save'){ saveNow(); var a=document.createElement('a'), u=URL.createObjectURL(new Blob([code.value],{type:LG().mime||'text/plain'})); a.href=u; a.download=(file.name.replace(/[\\/:*?"<>|]+/g,' ').trim()||'main').replace(new RegExp('\\.'+LG().ext+'$'),'')+'.'+LG().ext; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(u); },4000); }
  else if(k==='ai'&&window.FFAI) FFAI.settings(); }; });
$('openFile').onchange=function(){ var f=this.files[0]; if(!f) return; f.text().then(function(t){ var em=/\.([A-Za-z0-9]+)$/.exec(f.name), ex=em?em[1].toLowerCase():'', lg='python'; FC.order.forEach(function(k){ if(FC.langs[k].ext===ex||(k==='javascript'&&(ex==='mjs'))||(k==='html'&&ex==='htm')) lg=k; }); newFile(f.name.replace(/\.[A-Za-z0-9]+$/,''),t,'',lg); toast('파일을 열었어요'); }); };

/* ---------- output ---------- */
var atBottom=true;
out.addEventListener('scroll',function(){ atBottom=out.scrollTop+out.clientHeight>=out.scrollHeight-30; });
function stick(){ if(atBottom) out.scrollTop=out.scrollHeight; }
var lastPre=null, outChars=0;
function write(t,cls){ if(outChars>200000){ if(outChars<1e9){ outChars=1e9; sys(T('결과가 너무 길어서 나머지는 보여 주지 않아요')); } return; } outChars+=t.length;
  if(!lastPre||lastPre.dataset.c!==(cls||'')){ lastPre=document.createElement('pre'); lastPre.dataset.c=cls||''; if(cls) lastPre.className=cls; out.appendChild(lastPre); }
  lastPre.appendChild(document.createTextNode(t)); stick(); }
function sys(t,cls){ var d=document.createElement('div'); d.className='sys'+(cls?' '+cls:''); d.textContent=t; out.appendChild(d); lastPre=null; stick(); return d; }
$('clearBtn').onclick=function(){ out.innerHTML=''; lastPre=null; outChars=0; tur=null; if(curLang!=='python') $('pv').innerHTML=''; };

/* ---------- turtle canvas ---------- */
var tur=null, TW=600, TH=500;
function turtleCanvas(){ if(tur) return tur;
  var cv=document.createElement('canvas'), dpr=Math.min(2,window.devicePixelRatio||1); cv.width=TW*dpr; cv.height=TH*dpr; cv.style.width=TW+'px';
  var base=document.createElement('canvas'); base.width=cv.width; base.height=cv.height;
  out.appendChild(cv); lastPre=null; stick();
  tur={cv:cv, g:cv.getContext('2d'), base:base, b:base.getContext('2d'), dpr:dpr, bg:'#ffffff', q:[], ts:{}, raf:0};
  [tur.g,tur.b].forEach(function(g){ g.setTransform(dpr,0,0,-dpr,TW*dpr/2,TH*dpr/2); g.lineCap='round'; g.lineJoin='round'; });
  return tur; }
function tdraw(c){ var b=tur.b;
  if(c[0]==='l'){ b.strokeStyle=c[5]; b.lineWidth=Math.max(.5,c[6]); b.beginPath(); b.moveTo(c[1],c[2]); b.lineTo(c[3],c[4]); b.stroke(); }
  else if(c[0]==='f'){ b.fillStyle=c[2]; b.beginPath(); c[1].forEach(function(p,i){ if(i) b.lineTo(p[0],p[1]); else b.moveTo(p[0],p[1]); }); b.closePath(); b.fill('evenodd'); }
  else if(c[0]==='d'){ b.fillStyle=c[4]; b.beginPath(); b.arc(c[1],c[2],c[3]/2,0,Math.PI*2); b.fill(); }
  else if(c[0]==='w'){ b.save(); b.scale(1,-1); b.fillStyle=c[4]; b.font=Math.round(c[5]*1.4)+'px "Noto Sans KR",sans-serif'; b.textAlign=c[6]==='center'?'center':c[6]==='right'?'right':'left'; b.fillText(c[3],c[1],-c[2]-3); b.restore(); }
  else if(c[0]==='s'){ arrow(b,c[1],c[2],c[3],c[4]); }
  else if(c[0]==='b'){ tur.bg=c[1]; }
  else if(c[0]==='c'){ b.save(); b.setTransform(1,0,0,1,0,0); b.clearRect(0,0,tur.base.width,tur.base.height); b.restore(); }
  else if(c[0]==='t'){ tur.ts[c[1]]={x:c[2],y:c[3],h:c[4],v:c[5],c:c[6]}; } }
function arrow(g,x,y,h,col){ g.save(); g.translate(x,y); g.rotate(h*Math.PI/180); g.fillStyle=col||'#000'; g.strokeStyle='rgba(0,0,0,.55)'; g.lineWidth=1;
  g.beginPath(); g.moveTo(10,0); g.lineTo(-6,6.5); g.lineTo(-3,0); g.lineTo(-6,-6.5); g.closePath(); g.fill(); g.stroke(); g.restore(); }
function tshow(){ var g=tur.g; g.save(); g.setTransform(1,0,0,1,0,0); g.fillStyle=tur.bg; g.fillRect(0,0,tur.cv.width,tur.cv.height); g.drawImage(tur.base,0,0); g.restore();
  for(var k in tur.ts){ var t=tur.ts[k]; if(t.v) arrow(g,t.x,t.y,t.h,t.c); } }
function tpump(){ tur.raf=0; var budget=0, q=tur.q, n=0;
  while(q.length){ var c=q[0], sp=c[0]==='l'?c[7]:c[0]==='t'?c[7]:null;
    if(c[0]==='l'){ var cost=sp===0?0:1/Math.max(1,Math.round(Math.pow(sp,1.7)/2)); if(budget+cost>1&&n) break; budget+=cost; n++; }
    tdraw(q.shift()); if(budget>=1) break; }
  tshow(); if(q.length) tur.raf=requestAnimationFrame(tpump); else checkDone(); }
function onTurtle(j){ var cmds; try{ cmds=JSON.parse(j); }catch(e){ return; } var t=turtleCanvas(); Array.prototype.push.apply(t.q,cmds); if(!t.raf) t.raf=requestAnimationFrame(tpump); }

/* ---------- graphs ---------- */
function nice(lo,hi,n){ var span=hi-lo||1, step=Math.pow(10,Math.floor(Math.log10(span/n))), err=span/n/step; step*=err>=7.5?10:err>=3.5?5:err>=1.5?2:1;
  var a=Math.floor(lo/step)*step, ticks=[]; for(var v=a;v<=hi+step*1e-9;v+=step) if(v>=lo-step*1e-9) ticks.push(+v.toFixed(10)); return ticks; }
function fmtN(v){ var a=Math.abs(v); return a!==0&&(a>=1e6||a<1e-3)?v.toExponential(1):String(+v.toFixed(4)); }
function onPlot(j){ var f; try{ f=JSON.parse(j); }catch(e){ return; }
  var W=Math.round(Math.max(3,Math.min(12,f.w||6.4))*100), H=Math.round(Math.max(2,Math.min(10,f.h||4.8))*100), dpr=Math.min(2,window.devicePixelRatio||1);
  var cv=document.createElement('canvas'); cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; out.appendChild(cv); lastPre=null;
  var g=cv.getContext('2d'); g.scale(dpr,dpr); g.fillStyle='#fff'; g.fillRect(0,0,W,H); var FONT='"Noto Sans KR",sans-serif';
  var pies=f.series.filter(function(s){ return s.type==='pie'; });
  if(f.title){ g.fillStyle='#111'; g.font='600 16px '+FONT; g.textAlign='center'; g.fillText(f.title,W/2,24); }
  if(pies.length){ var p=pies[0], tot=p.y.reduce(function(a,b){ return a+b; },0)||1, cx=W/2, cy=H/2+(f.title?10:0), r=Math.min(W,H)/2-50, a0=-Math.PI/2;
    p.y.forEach(function(v,i){ var a1=a0+v/tot*Math.PI*2; g.fillStyle=p.colors[i%p.colors.length]; g.beginPath(); g.moveTo(cx,cy); g.arc(cx,cy,r,a0,a1); g.closePath(); g.fill(); g.strokeStyle='#fff'; g.lineWidth=2; g.stroke();
      var m=(a0+a1)/2; g.fillStyle='#222'; g.font='13px '+FONT; g.textAlign=Math.cos(m)>0.1?'left':Math.cos(m)<-0.1?'right':'center';
      if(p.labels&&p.labels[i]!=null) g.fillText(p.labels[i],cx+Math.cos(m)*(r+12),cy+Math.sin(m)*(r+12)+4);
      if(p.pct){ g.fillStyle='#fff'; g.textAlign='center'; g.font='600 12px '+FONT; g.fillText((v/tot*100).toFixed(1)+'%',cx+Math.cos(m)*r*.62,cy+Math.sin(m)*r*.62+4); }
      a0=a1; }); stick(); return; }
  // category axis when any bar uses names
  var cats=[]; f.series.forEach(function(s){ if((s.type==='bar'||s.type==='barh')&&s.x.some(function(v){ return typeof v==='string'; })) s.x.forEach(function(v){ if(cats.indexOf(String(v))<0) cats.push(String(v)); }); });
  function xs(s){ return (s.x||[]).map(function(v,i){ return cats.length&&(s.type==='bar'||s.type==='barh')?cats.indexOf(String(v)):+v; }); }
  var X=[],Y=[]; f.series.forEach(function(s){ var x=xs(s);
    if(s.type==='bar'){ x.forEach(function(v){ X.push(v-s.width/2,v+s.width/2); }); s.y.forEach(function(v){ Y.push(v,0); }); }
    else if(s.type==='barh'){ x.forEach(function(v){ Y.push(v-s.width/2,v+s.width/2); }); s.y.forEach(function(v){ X.push(v,0); }); }
    else if(s.type==='hist'){ X.push(s.edges[0],s.edges[s.edges.length-1]); s.y.forEach(function(v){ Y.push(v,0); }); }
    else { X=X.concat(x); Y=Y.concat(s.y); } });
  (f.lines||[]).forEach(function(l){ if(l.h!=null) Y.push(l.h); if(l.v!=null) X.push(l.v); });
  X=X.filter(isFinite); Y=Y.filter(isFinite); if(!X.length) X=[0,1]; if(!Y.length) Y=[0,1];
  var x0=Math.min.apply(0,X), x1=Math.max.apply(0,X), y0=Math.min.apply(0,Y), y1=Math.max.apply(0,Y);
  if(x0===x1){ x0-=1; x1+=1; } if(y0===y1){ y0-=1; y1+=1; }
  var px=(x1-x0)*.04, py=(y1-y0)*.06; if(!f.series.some(function(s){ return s.type==='hist'||s.type==='barh'; })){ x0-=px; x1+=px; } y1+=py; if(y0<0||!f.series.some(function(s){ return /bar|hist/.test(s.type); })) y0-=py;
  if(f.xlim){ x0=f.xlim[0]; x1=f.xlim[1]; } if(f.ylim){ y0=f.ylim[0]; y1=f.ylim[1]; }
  var L=58, R=18, Tp=f.title?40:18, B=f.xlabel?52:36, pw=W-L-R, ph=H-Tp-B;
  function sx(v){ return L+(v-x0)/(x1-x0)*pw; } function sy(v){ return Tp+ph-(v-y0)/(y1-y0)*ph; }
  g.font='12px '+FONT; g.fillStyle='#444'; g.strokeStyle='#e6e6e6'; g.lineWidth=1;
  var yt=f.yticks?f.yticks[0]:nice(y0,y1,6), xt=f.xticks?f.xticks[0]:cats.length?cats.map(function(c,i){ return i; }):nice(x0,x1,7);
  g.textAlign='right'; yt.forEach(function(v,i){ var y=sy(v); if(y<Tp-1||y>Tp+ph+1) return; if(f.grid){ g.beginPath(); g.moveTo(L,y); g.lineTo(L+pw,y); g.stroke(); } g.fillText(f.yticks&&f.yticks[1]?f.yticks[1][i]:fmtN(v),L-6,y+4); });
  g.textAlign='center'; xt.forEach(function(v,i){ var x=sx(v); if(x<L-1||x>L+pw+1) return; if(f.grid){ g.beginPath(); g.moveTo(x,Tp); g.lineTo(x,Tp+ph); g.stroke(); } g.fillText(f.xticks&&f.xticks[1]?f.xticks[1][i]:cats.length?cats[v]:fmtN(v),x,Tp+ph+16); });
  g.save(); g.beginPath(); g.rect(L,Tp,pw,ph); g.clip();
  (f.lines||[]).forEach(function(l){ g.strokeStyle=l.color; g.lineWidth=1.2; g.setLineDash([5,4]); g.beginPath(); if(l.h!=null){ g.moveTo(L,sy(l.h)); g.lineTo(L+pw,sy(l.h)); } else { g.moveTo(sx(l.v),Tp); g.lineTo(sx(l.v),Tp+ph); } g.stroke(); g.setLineDash([]); });
  var bars=f.series.filter(function(s){ return s.type==='bar'; }).length, bi=0;
  f.series.forEach(function(s){ var x=xs(s);
    if(s.type==='bar'){ var off=bars>1&&cats.length?(bi-(bars-1)/2)*s.width/bars:0, w=bars>1&&cats.length?s.width/bars:s.width; bi++;
      x.forEach(function(v,i){ g.fillStyle=s.colors?s.colors[i]:s.color; var a=sx(v+off-w/2), b=sx(v+off+w/2), top=sy(Math.max(0,s.y[i])), bot=sy(Math.min(0,s.y[i])); g.fillRect(a,top,Math.max(1,b-a),bot-top); }); }
    else if(s.type==='barh'){ x.forEach(function(v,i){ g.fillStyle=s.colors?s.colors[i]:s.color; var a=sy(v+s.width/2), b=sy(v-s.width/2), l=sx(Math.min(0,s.y[i])), r=sx(Math.max(0,s.y[i])); g.fillRect(l,a,r-l,Math.max(1,b-a)); }); }
    else if(s.type==='hist'){ g.fillStyle=s.color; s.y.forEach(function(v,i){ var a=sx(s.edges[i]), b=sx(s.edges[i+1]); g.fillRect(a,sy(v),Math.max(1,b-a-1),sy(0)-sy(v)); }); }
    else { g.strokeStyle=g.fillStyle=s.color;
      if(s.type==='line'&&s.ls&&s.ls!=='None'&&s.ls!==''){ g.lineWidth=s.width||2; g.setLineDash(s.ls==='--'?[7,5]:s.ls===':'?[2,4]:s.ls==='-.'?[8,4,2,4]:[]); g.beginPath();
        x.forEach(function(v,i){ var X2=sx(v), Y2=sy(s.y[i]); if(i) g.lineTo(X2,Y2); else g.moveTo(X2,Y2); }); g.stroke(); g.setLineDash([]); }
      var mk=s.type==='scatter'?(s.marker||'o'):s.marker, r=s.type==='scatter'?Math.sqrt(s.size||36)/2:3.5;
      if(mk) x.forEach(function(v,i){ var X3=sx(v), Y3=sy(s.y[i]); g.beginPath();
        if(mk==='s'){ g.rect(X3-r,Y3-r,2*r,2*r); g.fill(); } else if(mk==='^'){ g.moveTo(X3,Y3-r); g.lineTo(X3+r,Y3+r); g.lineTo(X3-r,Y3+r); g.closePath(); g.fill(); }
        else if(mk==='x'||mk==='+'){ g.lineWidth=2; if(mk==='x'){ g.moveTo(X3-r,Y3-r); g.lineTo(X3+r,Y3+r); g.moveTo(X3+r,Y3-r); g.lineTo(X3-r,Y3+r); } else { g.moveTo(X3-r,Y3); g.lineTo(X3+r,Y3); g.moveTo(X3,Y3-r); g.lineTo(X3,Y3+r); } g.stroke(); }
        else { g.arc(X3,Y3,mk==='.'?2:r,0,Math.PI*2); g.globalAlpha=s.type==='scatter'?.8:1; g.fill(); g.globalAlpha=1; } }); } });
  g.restore();
  g.strokeStyle='#333'; g.lineWidth=1; g.strokeRect(L+.5,Tp+.5,pw,ph);
  g.fillStyle='#222'; g.font='13px '+FONT; g.textAlign='center'; if(f.xlabel) g.fillText(f.xlabel,L+pw/2,H-12);
  if(f.ylabel){ g.save(); g.translate(16,Tp+ph/2); g.rotate(-Math.PI/2); g.fillText(f.ylabel,0,0); g.restore(); }
  var lab=f.series.filter(function(s){ return s.label; });
  if(f.legend&&lab.length){ g.font='12px '+FONT; var lw=Math.max.apply(0,lab.map(function(s){ return g.measureText(s.label).width; }))+40, lh=lab.length*18+10, lx=L+pw-lw-8, ly=Tp+8;
    g.fillStyle='rgba(255,255,255,.9)'; g.strokeStyle='#ccc'; g.fillRect(lx,ly,lw,lh); g.strokeRect(lx+.5,ly+.5,lw,lh);
    lab.forEach(function(s,i){ var y=ly+14+i*18; g.strokeStyle=g.fillStyle=s.color||'#333'; if(s.type==='line'){ g.lineWidth=2; g.beginPath(); g.moveTo(lx+8,y); g.lineTo(lx+26,y); g.stroke(); } else g.fillRect(lx+10,y-5,14,10);
      g.fillStyle='#222'; g.textAlign='left'; g.fillText(s.label,lx+32,y+4); }); }
  stick(); }

/* ---------- running ---------- */
var worker=null, ready=false, running=false, runId=0, pendingDone=null, lastErr=null;
function state(t,spin){ $('state').innerHTML=t?(spin?'<span class="spin"></span> ':'')+esc(T(t)):''; }
function mkWorker(){ worker=new Worker('worker.js?v=p1'); ready=false;
  worker.onmessage=function(e){ var m=e.data;
    if(m.loading!=null){ if(running||!ready) state(m.loading||(running?'실행 중…':''),!!m.loading||running); }
    else if(m.ready){ ready=true; if(!running) state(''); else state('실행 중…',true); }
    else if(m.fail){ running=false; ui(); state(''); sys(T('파이썬을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 실행해 주세요.'),'err'); worker.terminate(); worker=null; }
    else if(m.out!=null) write(m.out,m.err?'err':'');
    else if(m.turtle) onTurtle(m.turtle);
    else if(m.plot) onPlot(m.plot);
    else if(m.done&&m.done.id===runId){ pendingDone=m.done; checkDone(); } };
  worker.onerror=function(e){ console.error(e); };
  worker.postMessage({boot:true}); }
function checkDone(){ var d=pendingDone; if(!d||(tur&&tur.q.length)) return; pendingDone=null; running=false; ui(); state('');
  if(d.ok){ sys(F('✔ 끝났어요 ({0}초)',((Date.now()-t0)/1000).toFixed(1)),'ok'); return; }
  write(trErr(d.error)+'\n','err'); errLine=d.line||0; paint();
  if(errLine){ var lh=parseFloat(getComputedStyle(code).lineHeight)||21; if(errLine*lh<code.scrollTop||errLine*lh>code.scrollTop+code.clientHeight) code.scrollTop=Math.max(0,(errLine-4)*lh); }
  lastErr={code:code.value, error:d.error, last:d.last, line:d.line}; whyBox(lastErr); }
var t0=0;
function run(){ if(running) return; if(curLang!=='python') return runOther(false); saveNow(); errLine=0; paint();
  out.innerHTML=''; lastPre=null; outChars=0; tur=null; atBottom=true; pendingDone=null;
  if(!worker) mkWorker();
  running=true; ui(); runId++; t0=Date.now(); state(ready?'실행 중…':'파이썬을 불러오는 중…',true);
  var stdin=$('stdin').value.replace(/\r/g,''), lines=stdin?stdin.split('\n'):[];
  worker.postMessage({run:{code:code.value, stdin:lines, id:runId}}); }
function stop(){ if(!running) return; if(curLang!=='python'){ stopOther(); return; } if(worker){ worker.terminate(); worker=null; } running=false; pendingDone=null; if(tur){ cancelAnimationFrame(tur.raf); tur.q=[]; } ui(); state(''); sys(T('■ 멈췄어요'),'err'); setTimeout(mkWorker,50); }
function ui(){ $('runBtn').hidden=running; $('stopBtn').hidden=!running; }
$('runBtn').onclick=run; $('stopBtn').onclick=stop;
document.addEventListener('keydown',function(e){ if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){ e.preventDefault(); run(); } else if(e.key==='Escape'){ closeMenus(); if(running) stop(); }
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){ e.preventDefault(); saveNow(); toast('저장했어요'); } });

/* ---------- AI: what does this error mean? ---------- */
var LANGN={ko:'Korean',en:'English',es:'Spanish',fr:'French',de:'German',ja:'Japanese',zh:'Chinese',pt:'Portuguese',ru:'Russian',tr:'Turkish',it:'Italian',pl:'Polish',ar:'Arabic'};
function whyBox(er){ var box=document.createElement('div'); box.className='why';
  var b=document.createElement('button'); b.className='tbtn aib'; b.type='button'; b.textContent='✨ '+T('AI에게 오류 설명 듣기 (시험)');
  var ans=document.createElement('div'); ans.className='ans'; ans.hidden=true; var note=document.createElement('small'); note.textContent=T('AI 설명은 틀릴 수 있어요. 고친 다음 다시 실행해 확인하세요.'); note.hidden=true;
  box.appendChild(b); box.appendChild(ans); box.appendChild(note); out.appendChild(box); lastPre=null; stick();
  b.onclick=function(){ if(!window.FFAI){ toast('AI를 불러오지 못했어요'); return; } b.disabled=true; ans.hidden=false; note.hidden=false; ans.textContent=T('AI가 읽는 중…');
    var lang=(window.FFT&&FFT.lang)||'ko', ln=LANGN[lang]||(lang==='au'||lang==='nw'?'English':'Korean');
    FFAI.ask({system:FFP.pySys(ln),
      prompt:FFP.pyPrompt(er.code,er.error), prose:true, maxTokens:450, onText:function(t){ ans.textContent=t; stick(); }})
      .then(function(t){ ans.textContent=String(t||ans.textContent).trim(); b.hidden=true; stick(); },
        function(e){ ans.textContent=(e&&e.message)||T('AI가 답하지 못했어요'); b.disabled=false; }); }; }

/* ---------- other languages (langs.js) ---------- */
var stopFn=null, liveT=0, otherGen=0;
function stopOther(){ if(stopFn){ try{ stopFn(); }catch(e){} stopFn=null; } otherGen++; running=false; ui(); state(''); sys(T('■ 멈췄어요'),'err'); }
function showTab(id){ if(id!=='wd'&&wdFrame) wdOff(true); out.hidden=(id!=='out'); $('pv').hidden=(id!=='pv'); $('wd').hidden=(id!=='wd'); $('st').hidden=(id!=='st'); if(id==='st') stDraw(); if(wdBtn) wdBtn.classList.toggle('lvon',!!wdFrame&&id==='wd'); if(stBtn) stBtn.classList.toggle('on',id==='st'); Array.prototype.forEach.call($('rtabs').children,function(b){ b.classList.toggle('on',b.dataset.t===id); }); }
function runOther(live){ var L=LG(); if(!L.run) return; if(!live) saveNow(); errLine=0; paint(); out.innerHTML=''; $('pv').innerHTML=''; lastPre=null; outChars=0;
  if(stopFn){ try{ stopFn(); }catch(e){} stopFn=null; } var gen=++otherGen; running=!live; ui(); var t1=Date.now();
  var ctx={code:code.value, out:out, pv:$('pv'), write:write, sys:sys, show:function(id){ if(wdFrame) return; if(!live||gen===otherGen) showTab(id); }, T:T,
    errLine:function(n){ errLine=n; paint(); },
    setCode:function(t){ code.focus(); code.select(); ins(t); },
    onStop:function(fn){ var old=stopFn; stopFn=function(){ if(old) old(); fn(); }; },
    done:function(ok){ if(gen!==otherGen) return; running=false; ui(); if(!live&&ok&&curLang==='javascript') sys(F('✔ 끝났어요 ({0}초)',((Date.now()-t1)/1000).toFixed(1)),'ok'); }};
  try{ L.run(ctx); }catch(e){ write(String((e&&e.message)||e)+'\n','err'); ctx.done(false); } }

/* ---------- BeaconScript: 바로 적용 (Beaconfall world in an iframe) ---------- */
var BS_GAME='/games/beaconfall/BEACONFALL-v0.6.html?bstest=1', wdFrame=null, wdReady=false, wdRetry=0, wdLive=0, wdTab=null, wdBtn=null;
function wdButtons(tb){ wdBtn=document.createElement('button'); wdBtn.type='button'; wdBtn.className='rt lv'; wdBtn.textContent=T('바로 적용'); wdBtn.title=T('Beaconfall 월드를 이 안에서 바로 실행해요 (로그인·로비 없음). 껐다 켜면 새 월드로 초기화돼요'); wdBtn.setAttribute('aria-pressed','false'); wdBtn.onclick=function(){ if(wdFrame) wdOff(); else wdOn(); }; tb.appendChild(wdBtn);
  stBtn=document.createElement('button'); stBtn.type='button'; stBtn.className='rt st'; stBtn.textContent=T('설정'); stBtn.title=T('바로 적용에서 켜고 끌 API를 골라요'); stBtn.onclick=function(){ showTab('st'); }; tb.appendChild(stBtn); }
var stBtn=null, BS_APIS=[['potato','Potato API','%player_name% · %player_hp% 같은 값을 쓸 수 있게 해요']];
function stGet(){ var o={}; try{ o=JSON.parse(localStorage.getItem('fc.bs.api')||'{}')||{}; }catch(e){} return o; }
function stOn(id){ var o=stGet(); return o[id]!==false; }
function stSb(){ return stGet().sandbox===true; }
function stList(){ return BS_APIS.filter(function(a){ return stOn(a[0]); }).map(function(a){ return a[0]; }); }
function stDraw(){ var b=$('st'); b.innerHTML=''; var h=document.createElement('div'); h.className='sth'; h.textContent=T('API'); b.appendChild(h); var hint=document.createElement('div'); hint.className='sts'; hint.textContent=T('켜 둔 API가 바로 적용 월드에 적용돼요'); b.appendChild(hint);
  function row(key,name,desc,on){ var r=document.createElement('label'); r.className='strow'; var c=document.createElement('input'); c.type='checkbox'; c.checked=on; c.onchange=function(){ var o=stGet(); o[key]=c.checked; try{ localStorage.setItem('fc.bs.api',JSON.stringify(o)); }catch(e){} wdSend(false); }; var t=document.createElement('span'); t.className='stt'; var n=document.createElement('b'); n.textContent=name; var d=document.createElement('small'); d.textContent=T(desc); t.appendChild(n); t.appendChild(d); r.appendChild(c); r.appendChild(t); b.appendChild(r); }
  BS_APIS.forEach(function(a){ row(a[0],a[1],a[2],stOn(a[0])); });
  var h2=document.createElement('div'); h2.className='sth'; h2.style.marginTop='14px'; h2.textContent=T('플레이어'); b.appendChild(h2);
  row('sandbox',T('샌드박스 모드'),'어디든 이동하고 날 수 있는 테스트용 모드예요 (새로 시작한 월드부터 적용돼요)',stSb()); }
var BS_POTATO_UUID='6b2b1a90-c35e-4484-934a-c21f14ce791c';
function wdCode(){ var c=code.value; if(stList().indexOf('potato')<0||c.indexOf(BS_POTATO_UUID)>=0) return c; var ls=c.split('\n'), at=0; for(var i=0;i<ls.length;i++){ var t=ls[i].trim(); if(!t||t[0]==='#') continue; if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) at=i+1; break; } ls.splice(at,0,'use_mod_uuid: '+BS_POTATO_UUID); return ls.join('\n'); }
function wdSend(reset){ if(!wdFrame||!wdFrame.contentWindow) return; try{ wdFrame.contentWindow.postMessage({type:'bs-apply',code:wdCode(),reset:!!reset,apis:stList(),sandbox:stSb()},location.origin); }catch(e){} }
function wdOn(){ if(wdFrame||curLang!=='beaconscript') return; var f=document.createElement('iframe'); f.setAttribute('title','Beaconfall'); f.setAttribute('allow','fullscreen'); f.setAttribute('sandbox','allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-downloads'); wdFrame=f; wdReady=false; $('wd').innerHTML=''; $('wd').appendChild(f); f.src=BS_GAME+'&v='+Date.now();
  if(wdBtn){ wdBtn.classList.add('lvon'); wdBtn.setAttribute('aria-pressed','true'); } showTab('wd');
  var n=0; clearInterval(wdRetry); wdRetry=setInterval(function(){ if(wdReady||!wdFrame||++n>60){ clearInterval(wdRetry); if(!wdReady&&wdFrame) sys(T('월드가 아직 준비되지 않았어요'),'err'); return; } wdSend(true); },500); }
function wdOff(quiet){ clearInterval(wdRetry); clearTimeout(wdLive); if(wdFrame){ try{ wdFrame.src='about:blank'; }catch(e){} wdFrame=null; } wdReady=false; var w=$('wd'); if(w){ w.innerHTML=''; }
  if(wdBtn){ wdBtn.classList.remove('lvon'); wdBtn.setAttribute('aria-pressed','false'); }
  if(!quiet&&curLang==='beaconscript') showTab('pv'); }
function wdErr(m){ var w=$('wd'); if(!w) return; var e=w.querySelector('.wderr'); if(!m){ if(e) e.remove(); return; } if(!e){ e=document.createElement('div'); e.className='wderr'; w.appendChild(e); } e.textContent=T('코드 오류')+' · '+m; }
function wdSoon(){ if(!wdFrame||!wdReady) return; clearTimeout(wdLive); wdLive=setTimeout(function(){ wdSend(false); },600); }
window.addEventListener('message',function(e){ if(!wdFrame||e.source!==wdFrame.contentWindow||e.origin!==location.origin) return; var d=e.data||{};
  if(d.type==='bs-boot'){ wdSend(true); } else if(d.type==='bs-ready'){ wdReady=true; clearInterval(wdRetry); wdErr(''); }
  else if(d.type==='bs-error'){ write('월드: '+String(d.msg||'')+'\n','err'); wdErr(String(d.msg||'')); } });
function liveSoon(){ wdSoon(); clearTimeout(liveT); liveT=setTimeout(function(){ if(LG().live&&!running) runOther(true); },500); }
function setLang(l,silent){ if(!FC.langs[l]) l='python'; var changed=l!==curLang; if(changed&&stopFn){ try{ stopFn(); }catch(e){} stopFn=null; } otherGen++; running=false; ui();
  curLang=l; var L=LG(); IN=L.indent||'    '; $('langPick').value=l; langBtn(); var py=(l==='python');
  $('dictBtn').hidden=!py; $('stdinBox').hidden=!py; $('exBtn').hidden=false; code.setAttribute('aria-label',T(L.name+' 코드'));
  var tb=$('rtabs'); tb.innerHTML=''; (L.tabs||[]).forEach(function(t){ var b=document.createElement('button'); b.type='button'; b.className='rt'; b.dataset.t=t[0]; b.textContent=T(t[1]); b.onclick=function(){ showTab(t[0]); }; tb.appendChild(b); });
  wdOff(true); if(l==='beaconscript') wdButtons(tb);
  tb.hidden=py; $('pv').hidden=true; out.hidden=false; $('resTitle').hidden=!py; if(!py) showTab(L.tabs[0][0]);
  $('runBtn').title=py||l==='javascript'?T('실행 (Ctrl+Enter)'):T('검사하고 미리보기 (Ctrl+Enter)'); acHide();
  if(changed){ out.innerHTML=''; $('pv').innerHTML=''; lastPre=null; outChars=0; tur=null; errLine=0; if(py&&!worker) setTimeout(function(){ if(!worker&&curLang==='python') mkWorker(); },300); }
  buildEx(); if(!silent){ paint(); saveNow(); } if(L.live) liveSoon(); }
function lgi(k){ return '<span class="lgi" aria-hidden="true">'+((FC.logos||{})[k]||'')+'</span>'; }
function langBtn(){ var b=$('langBtn'); if(!b) return; b.innerHTML=lgi(curLang)+'<span>'+esc((FC.langs[curLang]||{}).name||'')+'</span><span class="cv">▾</span>'; }
function langMenu(){ var m=$('langMenu'); m.innerHTML=''; FC.order.forEach(function(k){ var b=document.createElement('button'); b.type='button'; b.className=k===curLang?'on':''; b.innerHTML=lgi(k)+'<span>'+esc(FC.langs[k].name)+(FC.langs[k].ext?' <small style="color:var(--dim)">.'+FC.langs[k].ext+'</small>':'')+'</span>';
    b.onclick=function(){ closeMenus(); if(k!==curLang){ var sel=$('langPick'); sel.value=k; sel.onchange(); } }; m.appendChild(b); }); }
$('langBtn').onclick=function(){ langMenu(); popMenu($('langMenu'),this); };
(function(){ var sel=$('langPick'); FC.order.forEach(function(k){ var o=document.createElement('option'); o.value=k; o.textContent=(FC.langs[k].icon||'')+' '+FC.langs[k].name; sel.appendChild(o); });
  sel.onchange=function(){ setLang(sel.value,false); toast(F('{0} 로 바꿨어요',FC.langs[sel.value].name)); }; })();

/* ---------- start ---------- */
(function(){ var op=/^#open=([a-z0-9]{4,40})$/.exec(location.hash||'');   // ../python/#open=<id>: the usage window opens a file in a new window
  if(op){ try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){} if(idx.files.some(function(x){ return x.id===op[1]; })) idx.last=op[1]; }
  var f=idx.files.filter(function(x){ return x.id===idx.last; })[0]||idx.files[0];
  if(f) openFile(f); else { var ex=(window.FPY_EX||[])[0]; newFile(T('첫 파일'),ex?trCode(ex[1]):T('print("안녕하세요!")')+'\n'); } })();
if(curLang==='python'){ sys(T('▶ 실행(Ctrl+Enter)을 누르면 여기에 결과가 나와요. 처음 실행할 때는 파이썬(약 10MB)을 받느라 조금 걸려요.')); setTimeout(function(){ if(!worker&&curLang==='python') mkWorker(); },600); }
/* ---- find (Ctrl+F) ---- */
(function(){ var fb=$('fbar'), fq=$('fq'), fcnt=$('fcnt'), fhl=$('fhl'), fcase=false, list=[], idx=-1, q='';
  function esc2(t){ return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function scan(){ list=[]; q=fq.value; if(!q) return; var src=code.value, hay=fcase?src:src.toLowerCase(), nd=fcase?q:q.toLowerCase(), i=0; while((i=hay.indexOf(nd,i))>=0&&list.length<5000){ list.push(i); i+=nd.length; } }
  function paintF(){ if(!list.length){ fhl.innerHTML=''; return; } var src=code.value, h='', last=0; list.forEach(function(p,k){ h+=esc2(src.slice(last,p))+'<mark'+(k===idx?' class="cur"':'')+'>'+esc2(src.substr(p,q.length))+'</mark>'; last=p+q.length; }); h+=esc2(src.slice(last)); fhl.innerHTML=h+'\n '; fhl.scrollTop=code.scrollTop; fhl.scrollLeft=code.scrollLeft; }
  function count(){ fcnt.textContent=!q?'':(list.length?(idx+1)+'/'+list.length+(list.length>=5000?'+':''):T('없음')); fcnt.style.color=(q&&!list.length)?'#e5534b':''; }
  function reveal(){ if(idx<0) return; var p=list[idx], before=code.value.slice(0,p), line=before.split('\n').length-1, lh=parseFloat(getComputedStyle(code).lineHeight)||21.6, top=12+line*lh;
    if(top<code.scrollTop+lh||top>code.scrollTop+code.clientHeight-lh*3) code.scrollTop=Math.max(0,top-code.clientHeight/2);
    var col=before.length-(before.lastIndexOf('\n')+1), cw=parseFloat(getComputedStyle(code).fontSize)*0.6, left=14+col*cw;
    if(left<code.scrollLeft||left>code.scrollLeft+code.clientWidth-80) code.scrollLeft=Math.max(0,left-code.clientWidth/3);
    try{ code.setSelectionRange(p,p+q.length); }catch(e){} scrollSync(); }
  function go(dir){ scan(); if(!list.length){ idx=-1; paintF(); count(); return; } if(idx<0||dir===0){ var c=code.selectionStart, k=0; while(k<list.length&&list[k]<c) k++; idx=(dir<0)?((k-1+list.length)%list.length):(k%list.length); } else idx=(idx+dir+list.length)%list.length; paintF(); count(); reveal(); }
  function refresh(){ if(fb.hidden) return; var cur=idx>=0?list[idx]:-1; scan(); idx=-1; if(cur>=0){ for(var k=0;k<list.length;k++){ if(list[k]>=cur){ idx=k; break; } } } paintF(); count(); }
  window.fRefresh=refresh;
  function open(){ var a=code.selectionStart, b=code.selectionEnd, sel=a!==b?code.value.slice(a,b):''; fb.hidden=false; if(sel&&sel.indexOf('\n')<0&&sel.length<=80) fq.value=sel; fq.focus(); fq.select(); idx=-1; if(fq.value) go(0); else { scan(); paintF(); count(); } }
  function close(){ if(fb.hidden) return; fb.hidden=true; fhl.innerHTML=''; list=[]; idx=-1; code.focus(); }
  fq.addEventListener('input',function(){ idx=-1; go(0); });
  fq.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); go(e.shiftKey?-1:1); } else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); close(); } });
  $('fnext').onclick=function(){ go(1); fq.focus(); }; $('fprev').onclick=function(){ go(-1); fq.focus(); }; $('fclose').onclick=close;
  $('fcase').onclick=function(){ fcase=!fcase; this.classList.toggle('on',fcase); idx=-1; go(0); fq.focus(); };
  $('findBtn').onclick=function(){ if(fb.hidden) open(); else close(); };
  document.addEventListener('keydown',function(e){ if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&!e.altKey&&e.key.toLowerCase()==='f'){ e.preventDefault(); open(); } else if(e.key==='F3'&&!fb.hidden){ e.preventDefault(); go(e.shiftKey?-1:1); } },true);
})();
window.addEventListener('pagehide',saveNow);
document.addEventListener('visibilitychange',function(){ if(document.hidden) saveNow(); });
})();
