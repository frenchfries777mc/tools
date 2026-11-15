/* Fry Blocks · other languages. A project is HTML (the original blocks), JavaScript, Python or BeaconScript.
   app.js calls into BX at a few places (refresh, code view, run, save, load, examples); everything else for the three
   new languages lives here: the language menu, the toolbox swap, the output pane and the run engines.
     JavaScript / BeaconScript  run with the same code as Fry Code (../code/langs.js, loaded when first needed)
     Python                     runs in the Fry Code worker (Pyodide) */
(function(){
'use strict';
var $=function(id){ return document.getElementById(id); }, T=FFT.T, F=FFT.F;
var BX=window.BX={lang:'html',A:null};
var NAME={html:'HTML',js:'JavaScript',py:'Python',bs:'BeaconScript'}, EXT={html:'.html',js:'.js',py:'.py',bs:'.bs'};
var DEFN={html:'나의 웹페이지',js:'나의 자바스크립트',py:'나의 파이썬',bs:'나의 모드'};
var FCID={js:'javascript',py:'python',bs:'beaconscript'};
var ws=null, A=null;
BX.ext=function(){ return EXT[BX.lang]||'.html'; };
BX.defName=function(l){ return T(DEFN[l||BX.lang]||DEFN.html); };
BX.name=function(l){ return NAME[l]||l; };
BX.code=function(){ return BL.genCode(BX.lang,ws,{trap:false}).code; };

/* ---------- attach: app.js hands over what is needed ---------- */
BX.attach=function(api){ A=BX.A=api; ws=api.ws;
  ws.registerToolboxCategoryCallback('LVARS',function(w){ return BL.varsFlyout(w); });
  /* JavaScript and Python: a loose statement stack is a program, only loose values are switched off */
  ws.addChangeListener(function(e){ if(BX.lang!=='js'&&BX.lang!=='py') return;
    if(e.type!==Blockly.Events.BLOCK_MOVE&&e.type!==Blockly.Events.BLOCK_CREATE) return; if(e.isUiEvent||ws.isDragging()) return;
    var b=ws.getBlockById(e.blockId); if(!b) return; var p=b.getParent();
    if(p){ if(p.isEnabled()) b.getDescendants(false).forEach(function(c){ c.setEnabled(true); }); }
    else if(b.outputConnection&&!b.previousConnection) b.setEnabled(false); });
  buildMenu(); }

/* ---------- language menu ---------- */
function buildMenu(){ var m=$('langMenu'); m.innerHTML='';
  BL.langs.forEach(function(L){ if(L.id!=='html'&&!BL.has(L.id)) return; var b=document.createElement('button'); b.type='button'; b.dataset.l=L.id;
    b.innerHTML='<span class="lgn"></span><small></small>'; b.firstChild.textContent=L.ico+' '+L.name; b.lastChild.textContent=T(L.desc); b.onclick=function(){ A.closeMenus(); pick(L.id); }; m.appendChild(b); });
  $('langBtn').onclick=function(){ A.openMenu(m,this); }; }
function pick(l){ if(l===BX.lang||A.coBlock()) return; var had=ws.getTopBlocks(false).length>0; A.newIn(l,!had);
  A.toast(had?F('{0} 프로젝트를 새로 만들었어요. 지금 것은 파일 메뉴에 그대로 있어요',NAME[l]):F('{0} 블록으로 바꿨어요',NAME[l])); }

/* ---------- switching the language of the editor (toolbox, labels, panes) ---------- */
BX.setLang=function(l){ if(l!=='html'&&!BL.has(l)) l='html'; var was=BX.lang; BX.lang=l; stopAll(true);
  document.body.setAttribute('data-lang',l);
  if(was!==l){ ws.updateToolbox(l==='html'?BH.toolbox():BL.toolbox(l)); A.resetCat(); A.buildEx(); }
  var L=BL.langs.filter(function(x){ return x.id===l; })[0]||BL.langs[0];
  $('langIco').textContent=L.ico; $('langName').textContent=L.name;
  var oth=l!=='html';
  document.querySelector('.stab[data-p="prev"]').textContent=T(oth?'실행 결과':'미리보기'); document.querySelector('.stab[data-p="code"]').textContent=T(L.name+' 코드');
  var seg=document.querySelector('#seg button[data-v="prev"]'); if(seg) seg.textContent=T(oth?'결과':'미리보기');
  var sc=document.querySelector('#seg button[data-v="code"]'); if(sc) sc.textContent=T('코드');
  $('hint').textContent=T(oth?'▶ 실행하기를 누르면 결과가 나와요':'블록을 바꾸면 미리보기가 바로 바뀌어요.');
  $('dlBtn').querySelector('.lb').textContent=T(oth?'코드 받기':'HTML 받기');
  $('outPane').hidden=!oth; $('outTabs').querySelector('[data-t="wd"]').hidden=l!=='bs'; $('outWorld').hidden=l!=='bs'; $('outStdin').hidden=l!=='py';
  var tl={js:['결과','화면'],py:['결과',''],bs:['검사','구조']}[l]; if(tl){ var tb=$('outTabs'), pvb=tb.querySelector('[data-t="pv"]'); tb.querySelector('[data-t="out"]').textContent=T(tl[0]); pvb.textContent=T(tl[1]||'화면'); pvb.hidden=!tl[1]; }
  $('codeOpen').hidden=!oth; $('codeNote').hidden=false; $('codeNote').textContent=T(oth?'블록으로 만든 코드예요 · 고치려면 "Fry Code에서 열기"':'여기서 바로 고칠 수 있어요 · 블록을 바꾸면 블록 코드로 돌아와요');
  $('codeEdit').readOnly=oth; if(oth){ clearOut(); sys(T('▶ 실행하기를 누르면 여기에 결과가 나와요')); }
  if(l==='py'&&!worker) setTimeout(function(){ if(BX.lang==='py'&&!worker) mkWorker(); },600);
  showTab('out'); };

/* ---------- called from app.js ---------- */
var liveT=0;
BX.refresh=function(force){ if($('pCode').classList.contains('on')) BX.showCode(); clearTimeout(liveT);
  if(BX.lang==='bs'){ if(wdFrame) wdSoon(); liveT=setTimeout(function(){ if(BX.lang==='bs'&&FC()&&!running){ var g=BL.genCode('bs',ws,{trap:false}); curMap=g.map; runFry('bs',g.code,true); } },700); } };
BX.showCode=function(){ var v=BL.genCode(BX.lang,ws,{trap:false}).code, ta=$('codeEdit'); ta.readOnly=true; if(ta.value!==v) ta.value=v; };
BX.run=function(){ var l=BX.lang; stopAll(false); clearOut(); clearWarn();
  var g=BL.genCode(l,ws,{trap:l==='js'}); curMap=g.map; var code=g.code;
  if(!/\S/.test(code)){ sys(T('블록을 놓고 다시 실행해 보세요'),'err'); showTab('out'); return; }
  if(l==='py'){ runPy(code); return; }
  if(l==='js') code='self.__lc=3e6; '+code;
  loadFry(function(ok){ if(!ok){ write(T('실행 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요')+'\n','err'); return; } runFry(l,code,false); }); };
BX.stop=function(){ var was=running; stopAll(false); if(was) sys(T('■ 멈췄어요'),'err'); };
BX.acts=function(list){ if(BX.lang==='html') return list;
  return list.slice(0,2).concat([{label:'코드 파일로 받기',sub:'이 프로젝트의 코드를 '+BX.ext()+' 파일로 받아요',run:function(){ BX.download(); }},
    {label:'Fry Code에서 열기',sub:'코드를 Fry Code로 보내서 고쳐요',run:function(){ BX.openInCode(); }}]); };
BX.download=function(){ var t=BX.code(); A.download(new Blob([t],{type:'text/plain;charset=utf-8'}),A.fname(BX.ext())); A.toast(T('코드 파일을 만들었어요')); };
BX.fillEx=function(menu){ var l=BX.lang, list=BL.examples(l)||[];
  list.forEach(function(ex){ var b=document.createElement('button'); b.innerHTML='<span></span><small></small>'; b.firstChild.textContent=T(ex.name); b.lastChild.textContent=T(ex.desc||'');
    b.onclick=function(){ A.closeMenus(); A.replaceHere(function(){ A.loadJSON(BL.tree(ex.build)); },F('"{0}" 예제를 지금 프로젝트로 불러왔어요',T(ex.name))); }; menu.appendChild(b); });
  if(!list.length){ var n=document.createElement('div'); n.className='none'; n.style.cssText='padding:10px 12px;color:var(--dim)'; n.textContent=T('이 언어는 아직 예제가 없어요'); menu.appendChild(n); } };
BX.blank=function(l){ A.loadJSON(BL.starter(l)||{blocks:{languageVersion:0,blocks:[]}}); };

/* ---------- output pane ---------- */
var curMap={}, running=false, gen=0, stops=[], t0=0;
function showTab(id){ $('outOut').hidden=id!=='out'; $('outPv').hidden=id!=='pv'; $('outWd').hidden=id!=='wd';
  Array.prototype.forEach.call($('outTabs').querySelectorAll('[data-t]'),function(b){ b.classList.toggle('on',b.dataset.t===id); }); }
$('outTabs').addEventListener('click',function(e){ var b=e.target.closest('[data-t]'); if(b) showTab(b.dataset.t); });
function clearOut(){ $('outBox').innerHTML=''; $('outPv').innerHTML=''; lastLoop=false; tur=null; }
$('outClear').onclick=function(){ clearOut(); };
var lastLoop=false, lastErr='';
function write(t,cls){ t=String(t==null?'':t);
  if(t.indexOf('__LOOP__')>=0){ if(lastLoop) return; lastLoop=true; t=T('되풀이가 너무 오래 계속돼요. 끝나지 않는 되풀이는 아닌지 확인해 주세요')+'\n'; cls='err'; }
  if(cls==='err') lastErr=t.replace(/\s*\(\d+줄\)\s*$/,'').trim().split('\n')[0]; var box=$('outBox'), s=document.createElement('span'); if(cls) s.className=cls; s.textContent=t; box.appendChild(s);
  if(box.textContent.length>300000){ while(box.firstChild&&box.textContent.length>200000) box.removeChild(box.firstChild); }
  box.scrollTop=box.scrollHeight;
  var m=cls==='err'&&/^[✖✘x]?\s*(\d+)\s*줄\s*[:：]\s*([\s\S]*)$/.exec(t.trim()); if(m) warnLine(+m[1],m[2].trim()); }
function sys(t,cls){ write(t+'\n',cls||'sys'); }
function state(t){ $('outStat').textContent=t||''; $('outStat').hidden=!t; }
function runUi(){ var on=running; $('runBtn').classList.toggle('on',on); }
function stopAll(quiet){ gen++; stops.forEach(function(f){ try{ f(); }catch(e){} }); stops=[]; if(worker){ try{ worker.terminate(); }catch(e){} worker=null; ready=false; } if(tur){ cancelAnimationFrame(tur.raf); tur.q=[]; }
  pendingDone=null; running=false; state(''); wdOff(true); clearTimeout(liveT); }

/* ---------- show a problem on the block that made the line ---------- */
function blockAt(n){ for(var i=n;i>0;i--){ if(curMap[i]) return ws.getBlockById(curMap[i]); } return null; }
function warnOf(b){ try{ var ic=b.getIcon&&b.getIcon('warning'); return ic&&ic.getText?String(ic.getText()||''):''; }catch(e){ return ''; } }
function warnLine(n,msg){ var b=blockAt(n); if(!b||!b.setWarningText) return; var old=warnOf(b); if(old.indexOf(msg)>=0) return; try{ b.setWarningText(old?old+'\n'+msg:msg); }catch(e){} }
function clearWarn(){ ws.getAllBlocks(false).forEach(function(b){ if(warnOf(b)){ try{ b.setWarningText(null); }catch(e){} } }); }
function errLine(n,msg){ var b=blockAt(n); if(!b) return; try{ if(msg&&b.setWarningText&&!warnOf(b)) b.setWarningText(msg); if(Blockly.common&&Blockly.common.setSelected) Blockly.common.setSelected(b); ws.centerOnBlock(b.id); A.glow(b.id,1800); }catch(e){} }

/* ---------- JavaScript and BeaconScript: the Fry Code run code ---------- */
function FC(){ return window.FCODE&&FCODE.langs&&FCODE.langs.beaconscript&&FCODE.langs.javascript?FCODE:null; }
var fryWait=null;
function loadFry(cb){ if(FC()) return cb(true); if(fryWait) return fryWait.push(cb); fryWait=[cb];
  var done=function(ok){ var w=fryWait; fryWait=null; w.forEach(function(f){ f(ok&&!!FC()); }); };
  var load=function(src,next){ var s=document.createElement('script'); s.src=src; s.onload=next; s.onerror=function(){ done(false); }; document.head.appendChild(s); };
  state(T('실행 도구를 불러오는 중…')); load('../code/bs-items.js?v=3',function(){ load('../code/langs.js?v=p77',function(){ state(''); done(true); }); }); }
function runFry(l,code,live){ var L=FC().langs[FCID[l]], g=++gen; if(!live){ stops.forEach(function(f){ try{ f(); }catch(e){} }); stops=[]; running=true; } else { clearOut(); clearWarn(); }
  runUi(); t0=Date.now();
  var ctx={code:code,out:$('outBox'),pv:$('outPv'),write:write,sys:sys,T:T,
    show:function(id){ if(live&&g!==gen) return; if(!live||id==='pv'||id==='out') showTab(id==='wd'?'wd':id); },
    errLine:function(n){ errLine(n,lastErr); },
    setCode:function(){},
    onStop:function(fn){ stops.push(fn); },
    done:function(ok){ if(g!==gen) return; if(!live){ running=false; runUi(); if(ok&&l==='js') sys(F('✔ 끝났어요 ({0}초)',((Date.now()-t0)/1000).toFixed(1)),'ok'); } } };
  if(live){ ctx.show=function(){}; }
  try{ L.run(ctx); }catch(e){ write(String((e&&e.message)||e)+'\n','err'); ctx.done(false); } }

/* ---------- Python: the Fry Code worker ---------- */
var worker=null, ready=false, runId=0, pendingDone=null, tur=null, TW=600, TH=500;
function mkWorker(){ try{ worker=new Worker('../code/worker.js?v=p1'); }catch(e){ worker=null; return; } ready=false; var w=worker;
  w.onmessage=function(e){ if(w!==worker) return; var m=e.data;
    if(m.loading!=null){ if(running||!ready) state(m.loading||(running?T('실행 중…'):'')); }
    else if(m.ready){ ready=true; state(running?T('실행 중…'):''); }
    else if(m.fail){ running=false; runUi(); state(''); write(T('파이썬을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 실행해 주세요.')+'\n','err'); try{ w.terminate(); }catch(x){} worker=null; }
    else if(m.out!=null) write(m.out,m.err?'err':'');
    else if(m.turtle) onTurtle(m.turtle);
    else if(m.done&&m.done.id===runId){ pendingDone=m.done; checkDone(); } };
  w.onerror=function(e){ console.error(e); };
  w.postMessage({boot:true}); }
function runPy(code){ if(!worker) mkWorker(); if(!worker){ write(T('이 브라우저에서는 파이썬을 실행할 수 없어요')+'\n','err'); return; }
  running=true; runUi(); runId++; t0=Date.now(); pendingDone=null; tur=null; state(ready?T('실행 중…'):T('파이썬을 불러오는 중…'));
  var s=$('outIn').value.replace(/\r/g,''), lines=s?s.split('\n'):[]; showTab('out');
  worker.postMessage({run:{code:code,stdin:lines,id:runId}}); }
function checkDone(){ var d=pendingDone; if(!d||(tur&&tur.q.length)) return; pendingDone=null; running=false; runUi(); state('');
  if(d.ok){ sys(F('✔ 끝났어요 ({0}초)',((Date.now()-t0)/1000).toFixed(1)),'ok'); return; }
  write(String(d.error||'')+'\n','err'); if(d.line) errLine(d.line,String(d.error||'').split('\n').pop()); }
/* turtle drawing (same as Fry Code) */
function turtleCanvas(){ if(tur) return tur;
  var cv=document.createElement('canvas'), dpr=Math.min(2,window.devicePixelRatio||1); cv.width=TW*dpr; cv.height=TH*dpr; cv.style.width='min(100%,'+TW+'px)'; cv.style.display='block'; cv.style.background='#fff';
  var base=document.createElement('canvas'); base.width=cv.width; base.height=cv.height; $('outBox').appendChild(cv);
  tur={cv:cv,g:cv.getContext('2d'),base:base,b:base.getContext('2d'),dpr:dpr,bg:'#ffffff',q:[],ts:{},raf:0};
  [tur.g,tur.b].forEach(function(g){ g.setTransform(dpr,0,0,-dpr,TW*dpr/2,TH*dpr/2); g.lineCap='round'; g.lineJoin='round'; }); return tur; }
function arrow(g,x,y,h,col){ g.save(); g.translate(x,y); g.rotate(h*Math.PI/180); g.fillStyle=col||'#000'; g.strokeStyle='rgba(0,0,0,.55)'; g.lineWidth=1;
  g.beginPath(); g.moveTo(10,0); g.lineTo(-6,6.5); g.lineTo(-3,0); g.lineTo(-6,-6.5); g.closePath(); g.fill(); g.stroke(); g.restore(); }
function tdraw(c){ var b=tur.b;
  if(c[0]==='l'){ b.strokeStyle=c[5]; b.lineWidth=Math.max(.5,c[6]); b.beginPath(); b.moveTo(c[1],c[2]); b.lineTo(c[3],c[4]); b.stroke(); }
  else if(c[0]==='f'){ b.fillStyle=c[2]; b.beginPath(); c[1].forEach(function(p,i){ if(i) b.lineTo(p[0],p[1]); else b.moveTo(p[0],p[1]); }); b.closePath(); b.fill('evenodd'); }
  else if(c[0]==='d'){ b.fillStyle=c[4]; b.beginPath(); b.arc(c[1],c[2],c[3]/2,0,Math.PI*2); b.fill(); }
  else if(c[0]==='w'){ b.save(); b.scale(1,-1); b.fillStyle=c[4]; b.font=Math.round(c[5]*1.4)+'px "Noto Sans KR",sans-serif'; b.textAlign=c[6]==='center'?'center':c[6]==='right'?'right':'left'; b.fillText(c[3],c[1],-c[2]-3); b.restore(); }
  else if(c[0]==='s'){ arrow(b,c[1],c[2],c[3],c[4]); }
  else if(c[0]==='b'){ tur.bg=c[1]; }
  else if(c[0]==='c'){ b.save(); b.setTransform(1,0,0,1,0,0); b.clearRect(0,0,tur.base.width,tur.base.height); b.restore(); }
  else if(c[0]==='t'){ tur.ts[c[1]]={x:c[2],y:c[3],h:c[4],v:c[5],c:c[6]}; } }
function tshow(){ var g=tur.g; g.save(); g.setTransform(1,0,0,1,0,0); g.fillStyle=tur.bg; g.fillRect(0,0,tur.cv.width,tur.cv.height); g.drawImage(tur.base,0,0); g.restore();
  for(var k in tur.ts){ var t=tur.ts[k]; if(t.v) arrow(g,t.x,t.y,t.h,t.c); } }
function tpump(){ if(!tur) return; tur.raf=0; var budget=0, q=tur.q, n=0;
  while(q.length){ var c=q[0], sp=c[0]==='l'?c[7]:c[0]==='t'?c[7]:null;
    if(c[0]==='l'){ var cost=sp===0?0:1/Math.max(1,Math.round(Math.pow(sp,1.7)/2)); if(budget+cost>1&&n) break; budget+=cost; n++; }
    tdraw(q.shift()); if(budget>=1) break; }
  tshow(); if(q.length) tur.raf=requestAnimationFrame(tpump); else checkDone(); }
function onTurtle(j){ var cmds; try{ cmds=JSON.parse(j); }catch(e){ return; } var t=turtleCanvas(); Array.prototype.push.apply(t.q,cmds); if(!t.raf) t.raf=requestAnimationFrame(tpump); }

/* ---------- BeaconScript: 바로 적용 (a Beaconfall world in a frame, same as Fry Code) ---------- */
var BS_GAME='/games/beaconfall/BEACONFALL-v0.6.html?bstest=1', POTATO='6b2b1a90-c35e-4484-934a-c21f14ce791c', wdFrame=null, wdReady=false, wdRetry=0, wdLiveT=0;
function bsSet(){ var o={}; try{ o=JSON.parse(localStorage.getItem('fc.bs.api')||'{}')||{}; }catch(e){} return o; }
function wdCode(){ var c=BL.genCode('bs',ws,{trap:false}).code, o=bsSet(); if(o.potato===false||c.indexOf(POTATO)>=0) return c;
  var ls=c.split('\n'), at=0; for(var i=0;i<ls.length;i++){ var t=ls[i].trim(); if(!t||t[0]==='#') continue; if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) at=i+1; break; }
  ls.splice(at,0,'use_mod_uuid: '+POTATO); return ls.join('\n'); }
function wdSend(reset){ if(!wdFrame||!wdFrame.contentWindow) return; var o=bsSet();
  try{ wdFrame.contentWindow.postMessage({type:'bs-apply',code:wdCode(),reset:!!reset,apis:o.potato===false?[]:['potato'],sandbox:o.sandbox===true},location.origin); }catch(e){} }
function wdOn(){ if(wdFrame||BX.lang!=='bs') return; var f=document.createElement('iframe'); f.setAttribute('title','Beaconfall'); f.setAttribute('allow','fullscreen');
  f.setAttribute('sandbox','allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-downloads'); f.style.cssText='width:100%;height:100%;border:0;display:block'; wdFrame=f; wdReady=false;
  $('outWd').innerHTML=''; $('outWd').appendChild(f); f.src=BS_GAME+'&v='+Date.now(); $('outWorld').classList.add('on'); $('outWorld').setAttribute('aria-pressed','true'); showTab('wd');
  var n=0; clearInterval(wdRetry); wdRetry=setInterval(function(){ if(wdReady||!wdFrame||++n>60){ clearInterval(wdRetry); if(!wdReady&&wdFrame) write(T('월드가 아직 준비되지 않았어요')+'\n','err'); return; } wdSend(true); },500); }
function wdOff(quiet){ clearInterval(wdRetry); clearTimeout(wdLiveT); if(wdFrame){ try{ wdFrame.src='about:blank'; }catch(e){} wdFrame=null; } wdReady=false; $('outWd').innerHTML='';
  $('outWorld').classList.remove('on'); $('outWorld').setAttribute('aria-pressed','false'); if(!quiet&&!$('outWd').hidden) showTab('out'); }
function wdSoon(){ if(!wdFrame||!wdReady) return; clearTimeout(wdLiveT); wdLiveT=setTimeout(function(){ wdSend(false); },600); }
$('outWorld').onclick=function(){ if(wdFrame) wdOff(); else wdOn(); };
window.addEventListener('message',function(e){ if(!wdFrame||e.source!==wdFrame.contentWindow||e.origin!==location.origin) return; var d=e.data||{};
  if(d.type==='bs-boot') wdSend(true); else if(d.type==='bs-ready'){ wdReady=true; clearInterval(wdRetry); }
  else if(d.type==='bs-error') write(T('월드')+': '+String(d.msg||'')+'\n','err'); });

/* ---------- Fry Code에서 열기 ---------- */
BX.openInCode=function(){ var l=BX.lang; if(l==='html') return; var src=BL.genCode(l,ws,{trap:false}).code, id='b'+Date.now().toString(36)+Math.floor(Math.random()*1296).toString(36), idx;
  try{ idx=JSON.parse(localStorage.getItem('ffpy.v1')||'null'); }catch(e){ idx=null; } if(!idx||!Array.isArray(idx.files)) idx={files:[],last:null};
  try{ localStorage.setItem('ffpy.file.'+id,src);
    idx.files.unshift({id:id,name:($('projName').value||'').trim()||BX.defName(l),t:Date.now(),stdin:l==='py'?$('outIn').value:'',lang:FCID[l]}); idx.last=id; localStorage.setItem('ffpy.v1',JSON.stringify(idx)); }
  catch(e){ A.toast(T('Fry Code로 보내지 못했어요. 저장 공간을 확인해 주세요')); return; }
  /* the documents live on the server: send them now, so the Fry Code page that opens next can read them */
  try{ if(window.FFSrv&&FFSrv.flush) FFSrv.flush(); if(window.FFSrv&&(FFSrv.down||(FFSrv.pending&&FFSrv.pending()>0))){ A.toast(T('서버에 연결할 수 없어요. 연결을 확인하고 다시 눌러 주세요')); return; } }catch(e){}
  var u='../code/#open='+id, w=window.open(u,'_blank'); if(!w) location.href=u; };
$('codeOpen').onclick=BX.openInCode;
})();
