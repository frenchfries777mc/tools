/* Fry Video: a small browser video editor. Preview is drawn on a canvas; the final video is recorded from that canvas (real time). */
(function(){
'use strict';
var KEY='ffvideo.v1', DB='ffvideo-media';
var $=function(id){ return document.getElementById(id); };
var cv=$('cv'), g=cv.getContext('2d');
var AR={'16:9':[1280,720],'9:16':[720,1280],'1:1':[1080,1080],'4:3':[960,720],'21:9':[1260,540]};
var proj={name:'이름 없는 영상',ar:'16:9',bg:'#000000',media:[],clips:[],uid:1};
var media={}, elems={}, gains={}, sel=null, t=0, playing=false, wall0=0, t0=0, pxs=60, hist=[], hi=-1, ptab='clip';
var actx=null, master=null, streamDest=null, monitor=true, exporting=null;
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function f(n){ return +(+n).toFixed(2); }
function toast(m){ var d=document.createElement('div'); d.className='toast'; d.textContent=m; document.body.appendChild(d); setTimeout(function(){ d.remove(); },2800); }
function tcs(x){ x=Math.max(0,x); var m=Math.floor(x/60), s=x-m*60; return m+':'+(s<10?'0':'')+s.toFixed(1); }
function clipById(id){ for(var i=0;i<proj.clips.length;i++) if(proj.clips[i].id===id) return proj.clips[i]; }
function endOf(c){ return c.start+c.dur; }
function total(){ var e=0; proj.clips.forEach(function(c){ e=Math.max(e,endOf(c)); }); return e; }
function curClip(){ return sel!=null?clipById(sel):null; }

/* ---------- media store (IndexedDB so files survive a reload) ---------- */
function idb(){ return new Promise(function(res,rej){ try{ var r=indexedDB.open(DB,1); r.onupgradeneeded=function(){ r.result.createObjectStore('m'); }; r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }catch(e){ rej(e); } }); }
function idbPut(id,blob){ return idb().then(function(d){ return new Promise(function(res){ var tx=d.transaction('m','readwrite'); tx.objectStore('m').put(blob,id); tx.oncomplete=function(){ res(true); }; tx.onerror=function(){ res(false); }; }); }).catch(function(){ return false; }); }
function idbGet(id){ return idb().then(function(d){ return new Promise(function(res){ var q=d.transaction('m').objectStore('m').get(id); q.onsuccess=function(){ res(q.result); }; q.onerror=function(){ res(null); }; }); }).catch(function(){ return null; }); }
function idbDel(id){ return idb().then(function(d){ d.transaction('m','readwrite').objectStore('m').delete(id); }).catch(function(){}); }

/* ---------- history / save ---------- */
function snap(){ return JSON.stringify({name:proj.name,ar:proj.ar,bg:proj.bg,media:proj.media,clips:proj.clips,uid:proj.uid}); }
function loadSnap(s){ var o=JSON.parse(s); proj.name=o.name; proj.ar=o.ar; proj.bg=o.bg; proj.media=o.media||[]; proj.clips=o.clips||[]; proj.uid=o.uid||1; }
var saveT;
function commit(){ hist=hist.slice(0,hi+1); hist.push(snap()); if(hist.length>80) hist.shift(); hi=hist.length-1; clearTimeout(saveT); saveT=setTimeout(persist,300); sizeCanvas(); drawTl(); drawBin(); panel(); }
function persist(){ try{ localStorage.setItem(KEY,snap()); }catch(e){} }
function undo(){ if(hi>0){ hi--; loadSnap(hist[hi]); cleanElems(); drawTl(); drawBin(); panel(); sizeCanvas(); persist(); } }
function redo(){ if(hi<hist.length-1){ hi++; loadSnap(hist[hi]); cleanElems(); drawTl(); drawBin(); panel(); sizeCanvas(); persist(); } }
function sizeCanvas(){ var a=AR[proj.ar]||AR['16:9']; if(cv.width!==a[0]||cv.height!==a[1]){ cv.width=a[0]; cv.height=a[1]; } $('dname').value=proj.name; }

/* ---------- importing ---------- */
function addFiles(files){
  Array.prototype.forEach.call(files,function(file){
    var type=/^video/.test(file.type)?'video':/^image/.test(file.type)?'image':/^audio/.test(file.type)?'audio':null; if(!type){ toast(file.name+' 은(는) 지원하지 않는 파일이에요'); return; }
    var id='m'+(proj.uid++), url=URL.createObjectURL(file), m={id:id,name:file.name,type:type,dur:5,w:0,h:0,url:url,thumb:''};
    function done(){ media[id]=m; proj.media.push({id:id,name:m.name,type:type,dur:m.dur,w:m.w,h:m.h,thumb:m.thumb}); idbPut(id,file); commit(); }
    if(type==='image'){ var im=new Image(); im.onload=function(){ m.w=im.naturalWidth; m.h=im.naturalHeight; m.thumb=thumbOf(im,im.naturalWidth,im.naturalHeight); m.img=im; done(); }; im.onerror=function(){ toast('그림을 열지 못했어요'); }; im.src=url; }
    else { var v=document.createElement(type==='video'?'video':'audio'); v.preload='auto'; v.onloadedmetadata=function(){ m.dur=v.duration||5; m.w=v.videoWidth||0; m.h=v.videoHeight||0;
        if(type==='video'){ v.currentTime=Math.min(.2,m.dur/2); v.onseeked=function(){ v.onseeked=null; m.thumb=thumbOf(v,v.videoWidth,v.videoHeight); done(); }; } else done(); };
      v.onerror=function(){ toast(file.name+' 을(를) 열지 못했어요. 브라우저가 못 읽는 형식일 수 있어요'); }; v.src=url; }
  });
}
function thumbOf(src,w,h){ try{ var c=document.createElement('canvas'); c.width=108; c.height=72; var x=c.getContext('2d'); x.fillStyle='#000'; x.fillRect(0,0,108,72); var r=Math.min(108/w,72/h); x.drawImage(src,(108-w*r)/2,(72-h*r)/2,w*r,h*r); return c.toDataURL('image/jpeg',.6); }catch(e){ return ''; } }
function restoreMedia(){
  var all=proj.media.map(function(m){ return idbGet(m.id).then(function(b){ if(b){ var mm=Object.assign({},m,{url:URL.createObjectURL(b)}); if(m.type==='image'){ var im=new Image(); im.src=mm.url; mm.img=im; } media[m.id]=mm; } else media[m.id]={id:m.id,name:m.name,type:m.type,dur:m.dur,missing:true}; }); });
  return Promise.all(all);
}
$('bAdd').onclick=function(){ $('fileIn').click(); };
$('fileIn').addEventListener('change',function(){ addFiles(this.files); this.value=''; });
document.addEventListener('dragover',function(e){ e.preventDefault(); });
document.addEventListener('drop',function(e){ e.preventDefault(); if(e.dataTransfer&&e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });

function drawBin(){
  var b=$('bin'); if(!proj.media.length){ b.innerHTML='<div class="hint">오른쪽 위 <b>+ 파일 넣기</b>를 누르거나 파일을 끌어다 놓으세요. 영상·그림·소리를 쓸 수 있어요.<br><br>파일은 이 기기 안에서만 쓰이고 서버로 올라가지 않아요.</div>'; return; }
  b.innerHTML=proj.media.map(function(m){ var mm=media[m.id]||m; return '<div class="it" data-m="'+m.id+'" title="눌러서 재생 막대 위치에 넣기"><'+(m.thumb?'img src="'+m.thumb+'" alt=""':'div class="ph"')+'>'+(m.thumb?'':(m.type==='audio'?'🎵':'🎬')+'</div>')+(m.thumb?'':'')+'<div class="nm"><b>'+esc(m.name)+'</b><span>'+(m.type==='image'?'그림':(m.type==='audio'?'소리':'영상'))+(m.type!=='image'?' · '+tcs(m.dur):'')+(mm.missing?' · 파일 없음':'')+'</span></div></div>'; }).join('');
}
$('bin').addEventListener('click',function(e){ var it=e.target.closest('.it'); if(!it) return; addClipFromMedia(it.dataset.m); });
function addClipFromMedia(mid){
  var m=media[mid]; if(!m||m.missing){ toast('이 파일이 이 기기에 남아 있지 않아요. 다시 넣어 주세요'); return; }
  var track=m.type==='audio'?'A':'V1', start=t, c={id:'c'+(proj.uid++),mid:mid,type:m.type,track:track,start:0,in:0,dur:m.type==='image'?5:m.dur,speed:1,vol:100,fadeIn:0,fadeOut:0,op:100,scale:100,x:0,y:0,rot:0,flip:false,fit:'fit',filt:{br:100,ct:100,sat:100,gray:0,sepia:0,blur:0,hue:0},anim:'none'};
  // place at playhead; if the track is busy there, go to its end
  var busy=proj.clips.some(function(o){ return o.track===track&&start<endOf(o)-.01&&start+c.dur>o.start+.01; });
  if(busy){ var e=0; proj.clips.forEach(function(o){ if(o.track===track) e=Math.max(e,endOf(o)); }); start=e; }
  c.start=start; proj.clips.push(c); sel=c.id; commit(); seek(c.start);
}
$('bText').onclick=function(){
  var c={id:'c'+(proj.uid++),type:'text',track:'T',start:t,in:0,dur:3,speed:1,vol:0,fadeIn:0,fadeOut:0,op:100,scale:100,x:0,y:0,rot:0,flip:false,fit:'fit',filt:null,anim:'fade',
    txt:{s:'여기에 글자를 쓰세요',size:9,color:'#ffffff',bg:false,bgc:'#000000',w:'700',ox:50,oy:84,stroke:true}};
  proj.clips.push(c); sel=c.id; commit();
};

/* ---------- elements & audio graph ---------- */
function getEl(c){
  if(elems[c.id]) return elems[c.id]; var m=media[c.mid]; if(!m||m.missing||c.type==='image'||c.type==='text') return null;
  var el=document.createElement(c.type==='video'?'video':'audio'); el.preload='auto'; el.playsInline=true; el.src=m.url; elems[c.id]=el; return el;
}
function ensureAudio(){ if(!actx){ var A=window.AudioContext||window.webkitAudioContext; actx=new A(); master=actx.createGain(); master.gain.value=1; streamDest=actx.createMediaStreamDestination(); master.connect(streamDest); if(monitor) master.connect(actx.destination); } if(actx.state==='suspended') actx.resume(); }
function wire(c,el){ if(gains[c.id]||!actx||!el) return; try{ var s=actx.createMediaElementSource(el), gn=actx.createGain(); s.connect(gn); gn.connect(master); gains[c.id]=gn; }catch(e){} }
function cleanElems(){ Object.keys(elems).forEach(function(id){ if(!clipById(id)){ try{ elems[id].pause(); }catch(e){} delete elems[id]; delete gains[id]; } }); }
function setMonitor(on){ monitor=on; if(!master) return; try{ master.disconnect(actx.destination); }catch(e){} if(on) master.connect(actx.destination); }

/* ---------- playback ---------- */
function active(c,tt){ return tt>=c.start-0.0001&&tt<endOf(c)-0.0001; }
function fadeOf(c,tt){ var a=1, r=tt-c.start, l=endOf(c)-tt; if(c.fadeIn>0&&r<c.fadeIn) a*=r/c.fadeIn; if(c.fadeOut>0&&l<c.fadeOut) a*=l/c.fadeOut; return Math.max(0,Math.min(1,a)); }
function syncMedia(tt,run){
  proj.clips.forEach(function(c){
    if(c.type==='image'||c.type==='text') return; var el=getEl(c); if(!el) return;
    if(actx) wire(c,el);
    var on=active(c,tt), want=c.in+(tt-c.start)*c.speed, gn=gains[c.id];
    if(gn) gn.gain.value=(c.vol/100)*fadeOf(c,tt)*(c.type==='audio'||c.track!=='V2'||true?1:1); else el.volume=Math.max(0,Math.min(1,(c.vol/100)*fadeOf(c,tt)));
    if(on){ el.playbackRate=Math.max(.0625,Math.min(16,c.speed)); if(run){ if(el.paused){ if(Math.abs(el.currentTime-want)>.05) try{ el.currentTime=want; }catch(e){} var p=el.play(); if(p&&p.catch) p.catch(function(){}); } else if(Math.abs(el.currentTime-want)>.35) try{ el.currentTime=want; }catch(e){} }
      else { if(!el.paused) el.pause(); if(Math.abs(el.currentTime-want)>.03) try{ el.currentTime=want; }catch(e){} } }
    else if(!el.paused) el.pause();
  });
}
function seek(x){ t=Math.max(0,x); if(playing){ wall0=performance.now(); t0=t; } syncMedia(t,playing); drawTl(true); }
function play(){ if(playing) return; ensureAudio(); var tot=total(); if(t>=tot-.05) t=0; playing=true; wall0=performance.now(); t0=t; $('bPlay').textContent='⏸'; }
function pause(){ playing=false; $('bPlay').textContent='▶'; Object.keys(elems).forEach(function(id){ try{ elems[id].pause(); }catch(e){} }); }
$('bPlay').onclick=function(){ if(playing) pause(); else play(); };
$('bBack').onclick=function(){ seek(0); };
function loop(){
  if(playing){ t=t0+(performance.now()-wall0)/1000; var tot=total(); if(t>=tot){ t=tot; pause(); if(exporting) finishExport(); } syncMedia(t,playing); }
  else if(!exporting){ /* keep stills in step while scrubbing */ }
  render(t); updateHead();
  requestAnimationFrame(loop);
}

/* ---------- rendering ---------- */
function filterStr(fl){ if(!fl) return 'none'; var a=[]; if(fl.br!==100) a.push('brightness('+fl.br+'%)'); if(fl.ct!==100) a.push('contrast('+fl.ct+'%)'); if(fl.sat!==100) a.push('saturate('+fl.sat+'%)'); if(fl.gray) a.push('grayscale('+fl.gray+'%)'); if(fl.sepia) a.push('sepia('+fl.sepia+'%)'); if(fl.hue) a.push('hue-rotate('+fl.hue+'deg)'); if(fl.blur) a.push('blur('+fl.blur+'px)'); return a.length?a.join(' '):'none'; }
function srcOf(c){ var m=media[c.mid]; if(!m||m.missing) return null; if(c.type==='image') return m.img&&m.img.complete?m.img:null; var el=elems[c.id]; return el&&el.readyState>=2?el:null; }
function render(tt){
  var W=cv.width, H=cv.height; g.setTransform(1,0,0,1,0,0); g.globalAlpha=1; g.filter='none'; g.fillStyle=proj.bg; g.fillRect(0,0,W,H);
  ['V1','V2'].forEach(function(tr){ proj.clips.forEach(function(c){ if(c.track!==tr||!active(c,tt)) return; drawVisual(c,tt,W,H); }); });
  proj.clips.forEach(function(c){ if(c.type==='text'&&active(c,tt)) drawText(c,tt,W,H); });
  g.globalAlpha=1; g.filter='none';
}
function animOf(c,tt){ var r=tt-c.start, d=Math.min(.6,c.dur/2), k=r<d?r/d:1, o={a:1,dx:0,dy:0,s:1}; if(c.anim==='fade') o.a=k; else if(c.anim==='slide'){ o.dx=(1-k)*-.25; o.a=k; } else if(c.anim==='rise'){ o.dy=(1-k)*.12; o.a=k; } else if(c.anim==='zoom'){ o.s=.7+.3*k; o.a=k; } else if(c.anim==='pop'){ o.s=k<1?(.4+.6*k)+(Math.sin(k*Math.PI)*.15):1; o.a=Math.min(1,k*2); } return o; }
function drawVisual(c,tt,W,H){
  var s=srcOf(c); if(!s) return; var sw=s.videoWidth||s.naturalWidth, sh=s.videoHeight||s.naturalHeight; if(!sw) return;
  var fit=c.fit==='fill'?Math.max(W/sw,H/sh):Math.min(W/sw,H/sh), an=animOf(c,tt);
  var sc=fit*(c.scale/100)*an.s, w=sw*sc, h=sh*sc;
  g.save(); g.globalAlpha=(c.op/100)*fadeOf(c,tt)*(c.anim==='none'?1:an.a); g.filter=filterStr(c.filt);
  g.translate(W/2+(c.x/100)*W+an.dx*W,H/2+(c.y/100)*H+an.dy*H); if(c.rot) g.rotate(c.rot*Math.PI/180); if(c.flip) g.scale(-1,1);
  try{ g.drawImage(s,-w/2,-h/2,w,h); }catch(e){}
  g.restore();
}
function drawText(c,tt,W,H){
  var T=c.txt, an=animOf(c,tt), size=T.size/100*H*(c.scale/100)*an.s; var lines=String(T.s).split('\n'), shown=lines;
  if(c.anim==='type'){ var k=Math.min(1,(tt-c.start)/Math.max(.3,Math.min(2,c.dur*.6))), n=Math.floor(lines.join('\n').length*k); shown=lines.join('\n').slice(0,n).split('\n'); }
  g.save(); g.globalAlpha=(c.op/100)*fadeOf(c,tt)*((c.anim==='none'||c.anim==='type')?1:an.a); g.filter='none';
  g.translate(T.ox/100*W+an.dx*W,T.oy/100*H+an.dy*H); if(c.rot) g.rotate(c.rot*Math.PI/180);
  g.font=T.w+' '+size+'px "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif'; g.textAlign='center'; g.textBaseline='middle';
  var lh=size*1.25, y0=-(lines.length-1)*lh/2;
  if(T.bg){ var mw=0; lines.forEach(function(l){ mw=Math.max(mw,g.measureText(l).width); }); g.fillStyle=T.bgc; g.globalAlpha*=.7; var pad=size*.4; g.fillRect(-mw/2-pad,y0-lh/2-pad*.5,mw+pad*2,lines.length*lh+pad); g.globalAlpha=(c.op/100)*fadeOf(c,tt)*((c.anim==='none'||c.anim==='type')?1:an.a); }
  shown.forEach(function(l,i){ var y=y0+i*lh; if(T.stroke){ g.lineWidth=size*.14; g.strokeStyle='rgba(0,0,0,.85)'; g.lineJoin='round'; g.strokeText(l,0,y); } g.fillStyle=T.color; g.fillText(l,0,y); });
  g.restore();
}

/* ---------- timeline ---------- */
var LANES=[['V2',0],['V1',1],['T',2],['A',3]], LH=46, RH=24, LBL=34;
function laneY(tr){ for(var i=0;i<LANES.length;i++) if(LANES[i][0]===tr) return RH+i*LH; return RH; }
function drawTl(keepScroll){
  var tl=$('tlin'), len=Math.max(30,total()+10), wpx=len*pxs+LBL;
  var o='<div class="ruler" style="width:'+wpx+'px">', step=pxs>=80?1:pxs>=40?2:pxs>=20?5:10;
  for(var s=0;s<=len;s+=step) o+='<i style="left:'+(LBL+s*pxs)+'px">'+Math.floor(s/60)+':'+('0'+(s%60)).slice(-2)+'</i>'; o+='</div>';
  LANES.forEach(function(l,i){ o+='<div class="lane" style="top:'+(RH+i*LH)+'px;width:'+wpx+'px"><span class="lb">'+({V1:'영상',V2:'겹침',T:'글자',A:'소리'}[l[0]])+'</span></div>'; });
  proj.clips.forEach(function(c){ var m=media[c.mid], name=c.type==='text'?'T '+c.txt.s.replace(/\n/g,' '):(m?m.name:'?');
    o+='<div class="clip '+c.track+(c.id===sel?' sel':'')+'" data-c="'+c.id+'" style="left:'+(LBL+c.start*pxs)+'px;top:'+(laneY(c.track)+4)+'px;width:'+Math.max(6,c.dur*pxs)+'px">'+esc(name)+'<span class="hl"></span><span class="hr"></span></div>'; });
  o+='<div id="phead" style="left:'+(LBL+t*pxs)+'px;height:'+(RH+LANES.length*LH)+'px"></div>';
  var tlc=$('tl'), sl=tlc.scrollLeft, st=tlc.scrollTop; tl.innerHTML=o; tl.style.width=wpx+'px'; tl.style.height=(RH+LANES.length*LH)+'px'; tlc.scrollLeft=sl; tlc.scrollTop=st;
  $('zl').textContent=pxs+'px/초'; $('bUndo').disabled=hi<=0; $('bRedo').disabled=hi>=hist.length-1;
}
function updateHead(){
  var h=$('phead'); if(h) h.style.left=(LBL+t*pxs)+'px'; $('tc').textContent=tcs(t)+' / '+tcs(total());
  if(playing){ var tlc=$('tl'), x=LBL+t*pxs; if(x>tlc.scrollLeft+tlc.clientWidth-40) tlc.scrollLeft=x-60; }
}
function tlX(e){ var tlc=$('tl'), r=tlc.getBoundingClientRect(); return e.clientX-r.left+tlc.scrollLeft; }
var drag=null;
$('tl').addEventListener('pointerdown',function(e){
  var el=e.target.closest('.clip'), rul=e.target.closest('.ruler');
  if(rul&&!el){ drag={k:'seek'}; $('tl').setPointerCapture(e.pointerId); seek((tlX(e)-LBL)/pxs); return; }
  if(!el){ var y=e.clientY-$('tl').getBoundingClientRect().top+$('tl').scrollTop; if(y>RH){ sel=null; drawTl(); panel(); seek((tlX(e)-LBL)/pxs); } return; }
  var c=clipById(el.dataset.c); sel=c.id; var edge=e.target.classList.contains('hl')?'l':e.target.classList.contains('hr')?'r':'m';
  drag={k:edge,c:c,x:e.clientX,y:e.clientY,start:c.start,dur:c.dur,in:c.in,track:c.track,moved:false}; $('tl').setPointerCapture(e.pointerId); drawTl(); panel();
});
function snapPts(c){ var p=[0,t]; proj.clips.forEach(function(o){ if(o!==c){ p.push(o.start,endOf(o)); } }); return p; }
function snapTo(v,c,thr){ var best=v, bd=thr; snapPts(c).forEach(function(p){ if(Math.abs(p-v)<bd){ bd=Math.abs(p-v); best=p; } }); return best; }
$('tl').addEventListener('pointermove',function(e){
  if(!drag) return; if(drag.k==='seek'){ seek((tlX(e)-LBL)/pxs); return; }
  var c=drag.c, dx=(e.clientX-drag.x)/pxs, thr=8/pxs; if(Math.abs(e.clientX-drag.x)+Math.abs(e.clientY-drag.y)>3) drag.moved=true; if(!drag.moved) return;
  var m=media[c.mid], maxSrc=c.type==='text'||c.type==='image'?1e9:(m?m.dur:1e9);
  if(drag.k==='m'){ var ns=Math.max(0,snapTo(drag.start+dx,c,thr)); var ne=snapTo(ns+c.dur,c,thr)-c.dur; if(ne>=0&&Math.abs(ne-ns)>0&&Math.abs(snapTo(ns+c.dur,c,thr)-(ns+c.dur))>0) ns=ne; c.start=Math.max(0,ns);
    var y=e.clientY-$('tl').getBoundingClientRect().top+$('tl').scrollTop, li=Math.floor((y-RH)/LH); if(li>=0&&li<LANES.length){ var tr=LANES[li][0], ok=(c.type==='text'&&tr==='T')||(c.type==='audio'&&tr==='A')||((c.type==='video'||c.type==='image')&&(tr==='V1'||tr==='V2')); if(ok) c.track=tr; } }
  else if(drag.k==='l'){ var ns2=Math.max(0,snapTo(drag.start+dx,c,thr)), d=ns2-drag.start; var ni=drag.in+d*c.speed; if(ni<0){ d=-drag.in/c.speed; ni=0; ns2=drag.start+d; } if(drag.dur-d<.1){ d=drag.dur-.1; ns2=drag.start+d; ni=drag.in+d*c.speed; } c.start=ns2; c.in=ni; c.dur=drag.dur-d; }
  else if(drag.k==='r'){ var nd=snapTo(drag.start+drag.dur+dx,c,thr)-drag.start; nd=Math.max(.1,nd); if(maxSrc<1e8) nd=Math.min(nd,(maxSrc-c.in)/c.speed); c.dur=nd; }
  drawTl(); drag.keep=true;
});
$('tl').addEventListener('pointerup',function(){ if(!drag) return; var d=drag; drag=null; if(d.k!=='seek'&&d.moved) commit(); else if(d.k!=='seek') panel(); });
$('tl').addEventListener('wheel',function(e){ if(e.ctrlKey||e.metaKey){ e.preventDefault(); pxs=Math.max(10,Math.min(240,Math.round(pxs*(e.deltaY<0?1.15:.87)))); drawTl(); } },{passive:false});
$('bTp').onclick=function(){ pxs=Math.min(240,Math.round(pxs*1.3)); drawTl(); }; $('bTm').onclick=function(){ pxs=Math.max(10,Math.round(pxs/1.3)); drawTl(); };

/* ---------- clip ops ---------- */
function split(){ var c=curClip(); if(!c){ // split the clip under the playhead on the lowest video track
    c=proj.clips.filter(function(o){ return active(o,t); })[0]; } if(!c||t<=c.start+.05||t>=endOf(c)-.05){ toast('자를 클립을 고르고 재생 막대를 클립 안쪽에 놓으세요'); return; }
  var r=t-c.start, n=JSON.parse(JSON.stringify(c)); n.id='c'+(proj.uid++); n.start=t; n.dur=c.dur-r; n.in=c.in+r*c.speed; n.fadeIn=0; c.dur=r; c.fadeOut=0; proj.clips.push(n); sel=n.id; commit(); }
$('bSplit').onclick=split;
$('bDup').onclick=function(){ var c=curClip(); if(!c) return; var n=JSON.parse(JSON.stringify(c)); n.id='c'+(proj.uid++); n.start=endOf(c); proj.clips.push(n); sel=n.id; commit(); };
function del(ripple){ var c=curClip(); if(!c) return; proj.clips=proj.clips.filter(function(o){ return o!==c; }); if(ripple) proj.clips.forEach(function(o){ if(o.track===c.track&&o.start>=endOf(c)-.01) o.start=Math.max(0,o.start-c.dur); }); sel=null; cleanElems(); commit(); }
$('bDel').onclick=function(){ del(false); };

/* ---------- panel ---------- */
function rng(l,k,min,max,v,step,unit){ return '<div class="row"><label>'+l+'</label><input type="range" data-k="'+k+'" min="'+min+'" max="'+max+'" step="'+(step||1)+'" value="'+v+'"><span class="v">'+f(v)+(unit||'')+'</span></div>'; }
var PRESETS={'원본':{br:100,ct:100,sat:100,gray:0,sepia:0,blur:0,hue:0},'흑백':{br:100,ct:110,sat:100,gray:100,sepia:0,blur:0,hue:0},'옛날 사진':{br:100,ct:95,sat:80,gray:0,sepia:70,blur:0,hue:0},'선명하게':{br:104,ct:125,sat:130,gray:0,sepia:0,blur:0,hue:0},'따뜻하게':{br:104,ct:100,sat:115,gray:0,sepia:25,blur:0,hue:-10},'차갑게':{br:100,ct:105,sat:95,gray:0,sepia:0,blur:0,hue:18},'흐리게':{br:100,ct:100,sat:100,gray:0,sepia:0,blur:4,hue:0}};
function panel(){
  var b=$('pbody'), h=''; document.querySelectorAll('#ptabs button').forEach(function(x){ x.classList.toggle('on',x.dataset.p===ptab); });
  if(ptab==='proj'){
    h+='<div class="sec"><h4>화면 비율</h4><div class="row"><select id="arSel">'+Object.keys(AR).map(function(k){ return '<option'+(k===proj.ar?' selected':'')+'>'+k+'</option>'; }).join('')+'</select></div><div class="note">16:9 유튜브, 9:16 쇼츠·릴스, 1:1 인스타, 4:3 옛날 TV, 21:9 영화 같은 와이드예요.</div></div>';
    h+='<div class="sec"><h4>배경 색</h4><div class="row"><label>빈 곳 색</label><input type="color" id="bgc" value="'+proj.bg+'"></div></div>';
    h+='<div class="sec"><h4>소리</h4><label class="chk"><input type="checkbox" id="monChk"'+(monitor?' checked':'')+'> 재생할 때 소리 듣기</label></div>';
    h+='<div class="sec"><button class="tbtn" id="bClear">모두 지우고 새로 시작</button></div>';
  } else {
    var c=curClip();
    if(!c) h+='<div class="note">타임라인의 클립을 누르면 여기서 고칠 수 있어요.<br><br><b>쓰는 법</b><br>1. <b>+ 파일 넣기</b>로 영상·그림·소리를 넣고, 왼쪽 목록에서 눌러 타임라인에 올려요.<br>2. 클립을 끌어 옮기고, 양 끝을 끌어 줄여요. 재생 막대를 놓고 <b>✂ 자르기</b>(S)로 나눠요.<br>3. <b>T 글자 넣기</b>로 자막을 넣어요.<br>4. <b>영상 만들기</b>를 누르면 처음부터 끝까지 재생하면서 파일로 녹화해요. 그동안 이 탭을 켜 두세요.</div>';
    else {
      h+='<div class="sec"><h4>'+({video:'영상',image:'그림',audio:'소리',text:'글자'}[c.type])+' 클립 · '+tcs(c.dur)+'</h4>';
      h+='<div class="row"><label>시작</label><input type="number" data-k="start" step="0.1" min="0" value="'+f(c.start)+'"><span class="v">초</span></div><div class="row"><label>길이</label><input type="number" data-k="dur" step="0.1" min="0.1" value="'+f(c.dur)+'"><span class="v">초</span></div></div>';
      if(c.type==='text'){ var T=c.txt;
        h+='<div class="sec"><h4>글자</h4><textarea data-t="s" style="min-height:70px" data-notr>'+esc(T.s)+'</textarea>'+rng('크기','t.size',2,30,T.size,1,'%')+'<div class="row"><label>글자 색</label><input type="color" data-t="color" value="'+T.color+'"><label class="chk" style="margin:0 0 0 8px"><input type="checkbox" data-t="stroke"'+(T.stroke?' checked':'')+'> 테두리</label></div><div class="row"><label>글자 상자</label><label class="chk" style="margin:0"><input type="checkbox" data-t="bg"'+(T.bg?' checked':'')+'> 쓰기</label><input type="color" data-t="bgc" value="'+T.bgc+'"></div>'+rng('가로 위치','t.ox',0,100,T.ox,1,'%')+rng('세로 위치','t.oy',0,100,T.oy,1,'%')+'<div class="row"><label>굵기</label><select data-t="w"><option value="400"'+(T.w==='400'?' selected':'')+'>보통</option><option value="700"'+(T.w==='700'?' selected':'')+'>굵게</option><option value="900"'+(T.w==='900'?' selected':'')+'>아주 굵게</option></select></div></div>';
        h+='<div class="sec"><h4>나타나는 방식</h4><div class="row"><select data-k="anim">'+[['none','없음'],['fade','서서히'],['rise','아래서 올라옴'],['slide','옆에서 들어옴'],['zoom','커지며'],['pop','톡 튀어나옴'],['type','한 글자씩']].map(function(a){ return '<option value="'+a[0]+'"'+(c.anim===a[0]?' selected':'')+'>'+a[1]+'</option>'; }).join('')+'</select></div>'+rng('크기 배율','scale',20,300,c.scale,1,'%')+rng('돌리기','rot',-180,180,c.rot,1,'°')+rng('투명도','op',0,100,c.op,1,'%')+rng('나타날 때 서서히','fadeIn',0,3,c.fadeIn,.1,'초')+rng('사라질 때 서서히','fadeOut',0,3,c.fadeOut,.1,'초')+'</div>';
      } else {
        if(c.type!=='image'){ h+='<div class="sec"><h4>소리</h4>'+rng('소리 크기','vol',0,200,c.vol,1,'%')+rng('시작할 때 서서히','fadeIn',0,5,c.fadeIn,.1,'초')+rng('끝날 때 서서히','fadeOut',0,5,c.fadeOut,.1,'초')+rng('빠르기','speed',.25,4,c.speed,.05,'x')+'<div class="note">빠르기를 바꾸면 클립 길이가 같이 바뀌어요.</div></div>'; }
        if(c.type!=='audio'){
          h+='<div class="sec"><h4>화면</h4><div class="row"><label>맞추기</label><select data-k="fit"><option value="fit"'+(c.fit==='fit'?' selected':'')+'>안 잘리게 (검은 띠)</option><option value="fill"'+(c.fit==='fill'?' selected':'')+'>꽉 채우기 (잘림)</option></select></div>'+rng('크기','scale',10,400,c.scale,1,'%')+rng('가로 옮기기','x',-100,100,c.x,1,'%')+rng('세로 옮기기','y',-100,100,c.y,1,'%')+rng('돌리기','rot',-180,180,c.rot,1,'°')+rng('투명도','op',0,100,c.op,1,'%')+'<label class="chk"><input type="checkbox" data-k="flip"'+(c.flip?' checked':'')+'> 좌우 뒤집기</label>'+(c.type==='image'?rng('서서히 나타남','fadeIn',0,3,c.fadeIn,.1,'초')+rng('서서히 사라짐','fadeOut',0,3,c.fadeOut,.1,'초'):rng('화면 서서히 나타남','fadeIn',0,5,c.fadeIn,.1,'초')+rng('화면 서서히 사라짐','fadeOut',0,5,c.fadeOut,.1,'초'))+'</div>';
          h+='<div class="sec"><h4>나타나는 방식</h4><div class="row"><select data-k="anim">'+[['none','없음'],['fade','서서히'],['slide','옆에서 들어옴'],['rise','아래서 올라옴'],['zoom','커지며']].map(function(a){ return '<option value="'+a[0]+'"'+(c.anim===a[0]?' selected':'')+'>'+a[1]+'</option>'; }).join('')+'</select></div></div>';
          h+='<div class="sec"><h4>색 효과</h4><div class="btns">'+Object.keys(PRESETS).map(function(k){ return '<button class="tbtn" data-pre="'+k+'">'+k+'</button>'; }).join('')+'</div>'+rng('밝기','f.br',20,200,c.filt.br,1,'%')+rng('대비','f.ct',20,200,c.filt.ct,1,'%')+rng('색 진하기','f.sat',0,300,c.filt.sat,1,'%')+rng('흑백','f.gray',0,100,c.filt.gray,1,'%')+rng('옛날 느낌','f.sepia',0,100,c.filt.sepia,1,'%')+rng('색 돌리기','f.hue',-180,180,c.filt.hue,1,'°')+rng('흐리게','f.blur',0,20,c.filt.blur,1,'px')+'<div class="note">색 효과는 크롬·엣지·파이어폭스에서 보이고, 사파리에서는 안 보일 수 있어요.</div></div>';
        }
      }
    }
  }
  b.innerHTML=h;
}
$('ptabs').addEventListener('click',function(e){ var b=e.target.closest('button'); if(b){ ptab=b.dataset.p; panel(); } });
var pb=$('pbody');
function setProp(c,k,v){ if(k.indexOf('f.')===0) c.filt[k.slice(2)]=v; else if(k.indexOf('t.')===0) c.txt[k.slice(2)]=v; else if(k==='speed'){ var old=c.speed; c.dur=c.dur*old/v; c.speed=v; } else c[k]=v; }
pb.addEventListener('input',function(e){ var tg=e.target, c=curClip(); if(!c) return;
  if(tg.dataset.k){ var v=tg.type==='checkbox'?tg.checked:(tg.type==='range'||tg.type==='number'?+tg.value:tg.value); setProp(c,tg.dataset.k,v); if(tg.type==='range'&&tg.nextElementSibling){ var u=tg.nextElementSibling.textContent.replace(/[-0-9.]/g,''); tg.nextElementSibling.textContent=f(v)+u; } if(tg.type==='range'){ clearTimeout(saveT); saveT=setTimeout(function(){ commit(); },350); drawTlLight(); } }
  else if(tg.dataset.t){ c.txt[tg.dataset.t]=tg.type==='checkbox'?tg.checked:tg.value; if(tg.dataset.t==='s'){ clearTimeout(saveT); saveT=setTimeout(commit,400); drawTlLight(); } } });
function drawTlLight(){ var el=document.querySelector('.clip.sel'); var c=curClip(); if(el&&c){ el.style.left=(LBL+c.start*pxs)+'px'; el.style.width=Math.max(6,c.dur*pxs)+'px'; } }
pb.addEventListener('change',function(e){ var tg=e.target;
  if(tg.id==='arSel'){ proj.ar=tg.value; commit(); return; } if(tg.id==='bgc'){ proj.bg=tg.value; commit(); return; } if(tg.id==='monChk'){ setMonitor(tg.checked); return; }
  if(tg.dataset.k||tg.dataset.t) commit(); });
pb.addEventListener('click',function(e){ var b=e.target.closest('button'); if(!b) return;
  if(b.dataset.pre){ var c=curClip(); if(c){ c.filt=Object.assign({},PRESETS[b.dataset.pre]); commit(); } return; }
  if(b.id==='bClear'){ if(!confirmOnce(b)) return; proj.clips=[]; proj.media.forEach(function(m){ idbDel(m.id); }); proj.media=[]; media={}; elems={}; gains={}; sel=null; t=0; commit(); } });
var cfo=0; function confirmOnce(b){ if(cfo){ cfo=0; return true; } cfo=1; b.textContent='한 번 더 누르면 지워요'; setTimeout(function(){ cfo=0; if(b.isConnected) b.textContent='모두 지우고 새로 시작'; },3000); return false; }

/* ---------- export ---------- */
function pickMime(){ var L=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']; for(var i=0;i<L.length;i++){ try{ if(MediaRecorder.isTypeSupported(L[i])) return L[i]; }catch(e){} } return ''; }
$('bFrame').onclick=function(){ cv.toBlob(function(b){ dl((proj.name||'frame')+'.png',b); }); };
function dl(name,blob){ var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name.replace(/[\\/:*?"<>|]/g,'_'); document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },2000); }
$('bExp').onclick=function(){
  if(!total()){ toast('타임라인에 클립을 먼저 올려 주세요'); return; } if(!window.MediaRecorder||!cv.captureStream){ toast('이 브라우저는 영상 녹화를 지원하지 않아요. 크롬이나 엣지를 써 주세요'); return; }
  var box=$('expbox'); box.hidden=false; var a=AR[proj.ar];
  box.innerHTML='<div><h3 style="margin:0 0 8px">영상 만들기</h3><div class="row"><label>화질</label><select id="exQ"><option value="0.5">낮게 (빠름)</option><option value="1" selected>보통 ('+a[0]+'×'+a[1]+')</option><option value="1.5">높게 ('+Math.round(a[0]*1.5)+'×'+Math.round(a[1]*1.5)+')</option></select></div><div class="note">처음부터 끝까지 한 번 재생하면서 녹화해요. 길이 '+tcs(total())+' 만큼 걸리고, 그동안 이 탭을 다른 창에 가리지 말고 켜 두세요. 소리는 나지 않아요.</div><div class="bar"><i id="exBar"></i></div><div class="note" id="exMsg"></div><div class="btns"><button class="tbtn pri" id="exGo">시작</button><button class="tbtn" id="exCancel">닫기</button></div></div>';
  $('exCancel').onclick=function(){ if(exporting) abortExport(); box.hidden=true; };
  $('exGo').onclick=startExport;
};
function startExport(){
  pause(); ensureAudio(); var q=+$('exQ').value, a=AR[proj.ar], prevMon=monitor; setMonitor(false);
  cv.width=Math.round(a[0]*q); cv.height=Math.round(a[1]*q); var mime=pickMime(), chunks=[];
  var vs=cv.captureStream(30), as=streamDest.stream.getAudioTracks(), ms=new MediaStream(vs.getVideoTracks().concat(as)), rec;
  try{ rec=new MediaRecorder(ms,mime?{mimeType:mime,videoBitsPerSecond:Math.round(5000000*q*q)}:undefined); }catch(e){ setMonitor(prevMon); toast('녹화를 시작하지 못했어요'); return; }
  rec.ondataavailable=function(e){ if(e.data&&e.data.size) chunks.push(e.data); };
  exporting={rec:rec,chunks:chunks,mime:rec.mimeType||mime||'video/webm',prevMon:prevMon,q:q,canceled:false};
  rec.onstop=function(){ var ex=exporting; exporting=null; sizeCanvas(); setMonitor(ex.prevMon); if(ex.canceled){ return; } var blob=new Blob(ex.chunks,{type:ex.mime}), ext=/mp4/.test(ex.mime)?'mp4':'webm'; dl((proj.name||'video')+'.'+ext,blob); $('exMsg').textContent='완성! '+ext+' 파일을 받았어요 ('+(blob.size/1048576).toFixed(1)+'MB)'; $('exBar').style.width='100%'; $('exGo').disabled=false; $('exGo').textContent='다시 만들기'; };
  $('exGo').disabled=true; $('exMsg').textContent='녹화 중…'; rec.start(500); t=0; syncMedia(0,false);
  setTimeout(function(){ play(); },300);
  var tot=total(), iv=setInterval(function(){ if(!exporting){ clearInterval(iv); return; } $('exBar').style.width=Math.min(99,t/tot*100)+'%'; },200);
}
function finishExport(){ var ex=exporting; if(!ex||ex.rec.state==='inactive') return; setTimeout(function(){ try{ ex.rec.stop(); }catch(e){} },400); }
function abortExport(){ var ex=exporting; if(!ex) return; ex.canceled=true; pause(); try{ ex.rec.stop(); }catch(e){} }

/* ---------- misc ---------- */
$('bUndo').onclick=undo; $('bRedo').onclick=redo;
$('dname').addEventListener('change',function(){ proj.name=this.value||'이름 없는 영상'; commit(); });
document.addEventListener('keydown',function(e){ var tg=e.target.tagName; if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT') return; var ctrl=e.ctrlKey||e.metaKey, k=e.key.toLowerCase();
  if(ctrl&&k==='z'){ e.preventDefault(); if(e.shiftKey) redo(); else undo(); return; } if(ctrl&&k==='y'){ e.preventDefault(); redo(); return; }
  if(k===' '){ e.preventDefault(); $('bPlay').click(); return; } if(k==='s'&&!ctrl){ split(); return; }
  if(e.key==='Delete'||e.key==='Backspace'){ e.preventDefault(); del(e.shiftKey); return; }
  if(e.key==='ArrowLeft'){ e.preventDefault(); seek(t-(e.shiftKey?1:.1)); return; } if(e.key==='ArrowRight'){ e.preventDefault(); seek(t+(e.shiftKey?1:.1)); return; } });
window.addEventListener('beforeunload',function(){ persist(); });
(function init(){
  var s=null; try{ s=localStorage.getItem(KEY); }catch(e){}
  if(s){ try{ loadSnap(s); }catch(e){} }
  sizeCanvas(); hist=[snap()]; hi=0; drawTl(); drawBin(); panel();
  restoreMedia().then(function(){ drawTl(); drawBin(); requestAnimationFrame(loop); });
  window.FVIDEO={proj:proj,media:media,addFiles:addFiles,addClipFromMedia:addClipFromMedia,render:render,seek:seek,split:split,get t(){ return t; }};
})();
})();
