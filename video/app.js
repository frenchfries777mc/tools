/* Fry Video: a small browser video editor. Preview is drawn on a canvas; the final video is recorded from that canvas (real time). */
(function(){
'use strict';
var KEY='ffvideo.v1', DB='ffvideo-media';
var $=function(id){ return document.getElementById(id); };
var cv=$('cv'), g=cv.getContext('2d');
var AR={'16:9':[1280,720],'9:16':[720,1280],'1:1':[1080,1080],'4:3':[960,720],'21:9':[1260,540]};
var proj={name:'이름 없는 영상',ar:'16:9',bg:'#000000',media:[],clips:[],uid:1,markers:[],lanes:{}};
var media={}, elems={}, gains={}, sel=null, t=0, playing=false, wall0=0, t0=0, pxs=60, hist=[], hi=-1, ptab='clip';
var actx=null, master=null, streamDest=null, monitor=true, exporting=null;
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function f(n){ return +(+n).toFixed(2); }
function toast(m){ var d=document.createElement('div'); d.className='toast'; d.textContent=m; document.body.appendChild(d); setTimeout(function(){ d.remove(); },2800); }
function tcs(x){ x=Math.max(0,x); var m=Math.floor(x/60), s=x-m*60; return m+':'+(s<10?'0':'')+s.toFixed(1); }
function clipById(id){ for(var i=0;i<proj.clips.length;i++) if(proj.clips[i].id===id) return proj.clips[i]; }
function endOf(c){ return c.start+c.dur; }
function total(){ var e=0; proj.clips.forEach(function(c){ e=Math.max(e,endOf(c)); }); return e; }
function laneOff(tr){ return !!(proj.lanes[tr]&&proj.lanes[tr].off); }
function laneLock(tr){ return !!(proj.lanes[tr]&&proj.lanes[tr].lock); }
function curClip(){ return sel!=null?clipById(sel):null; }

/* ---------- media store (IndexedDB so files survive a reload) ---------- */
function idb(){ return new Promise(function(res,rej){ try{ var r=indexedDB.open(DB,1); r.onupgradeneeded=function(){ r.result.createObjectStore('m'); }; r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }catch(e){ rej(e); } }); }
function idbPut(id,blob){ return idb().then(function(d){ return new Promise(function(res){ var tx=d.transaction('m','readwrite'); tx.objectStore('m').put(blob,id); tx.oncomplete=function(){ res(true); }; tx.onerror=function(){ res(false); }; }); }).catch(function(){ return false; }); }
function idbGet(id){ return idb().then(function(d){ return new Promise(function(res){ var q=d.transaction('m').objectStore('m').get(id); q.onsuccess=function(){ res(q.result); }; q.onerror=function(){ res(null); }; }); }).catch(function(){ return null; }); }
function idbDel(id){ return idb().then(function(d){ d.transaction('m','readwrite').objectStore('m').delete(id); }).catch(function(){}); }

/* ---------- history / save ---------- */
function snap(){ return JSON.stringify({name:proj.name,ar:proj.ar,bg:proj.bg,media:proj.media,clips:proj.clips,uid:proj.uid,markers:proj.markers,lanes:proj.lanes}); }
function loadSnap(s){ var o=JSON.parse(s); proj.name=o.name; proj.ar=o.ar; proj.bg=o.bg; proj.media=o.media||[]; proj.clips=o.clips||[]; proj.uid=o.uid||1; proj.markers=o.markers||[]; proj.lanes=o.lanes||{}; }
var saveT;
function commit(keep){ hist=hist.slice(0,hi+1); hist.push(snap()); if(hist.length>80) hist.shift(); hi=hist.length-1; clearTimeout(saveT); saveT=setTimeout(persist,300); sizeCanvas(); drawTl(); drawBin(); if(!keep) panel(); }
function persist(){ try{ localStorage.setItem(KEY,snap()); }catch(e){} }
function undo(){ if(hi>0){ hi--; loadSnap(hist[hi]); cleanElems(); drawTl(); drawBin(); panel(); sizeCanvas(); persist(); } }
function redo(){ if(hi<hist.length-1){ hi++; loadSnap(hist[hi]); cleanElems(); drawTl(); drawBin(); panel(); sizeCanvas(); persist(); } }
function sizeCanvas(){ var a=AR[proj.ar]||AR['16:9']; if(cv.width!==a[0]||cv.height!==a[1]){ cv.width=a[0]; cv.height=a[1]; } $('dname').value=proj.name; }

/* ---------- importing ---------- */
function addFiles(files,cb){
  Array.prototype.forEach.call(files,function(file){
    var type=/^video/.test(file.type)?'video':/^image/.test(file.type)?'image':/^audio/.test(file.type)?'audio':null; if(!type){ toast(file.name+' 은(는) 지원하지 않는 파일이에요'); return; }
    var id='m'+(proj.uid++), url=URL.createObjectURL(file), m={id:id,name:file.name,type:type,dur:5,w:0,h:0,url:url,thumb:''};
    function done(){ media[id]=m; proj.media.push({id:id,name:m.name,type:type,dur:m.dur,w:m.w,h:m.h,thumb:m.thumb}); idbPut(id,file); commit(); if(cb) cb(id); ensurePeaks(m); }
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
var hpfs={};
function wire(c,el){ if(gains[c.id]||!actx||!el) return; try{ var s=actx.createMediaElementSource(el), hp=actx.createBiquadFilter(), gn=actx.createGain(); hp.type='highpass'; hp.frequency.value=10; s.connect(hp); hp.connect(gn); gn.connect(master); gains[c.id]=gn; hpfs[c.id]=hp; }catch(e){} }
function cleanElems(){ Object.keys(elems).forEach(function(id){ if(!clipById(id)){ try{ elems[id].pause(); }catch(e){} delete elems[id]; delete gains[id]; delete hpfs[id]; } }); }
function setMonitor(on){ monitor=on; if(!master) return; try{ master.disconnect(actx.destination); }catch(e){} if(on) master.connect(actx.destination); }

/* ---------- playback ---------- */
function active(c,tt){ return tt>=c.start-0.0001&&tt<endOf(c)-0.0001; }
function fadeOf(c,tt){ var a=1, r=tt-c.start, l=endOf(c)-tt; if(c.fadeIn>0&&r<c.fadeIn) a*=r/c.fadeIn; if(c.fadeOut>0&&l<c.fadeOut) a*=l/c.fadeOut; return Math.max(0,Math.min(1,a)); }
function volAt(c,tt){ var v=c.vol; if(c.vol2!=null){ var u=Math.max(0,Math.min(1,(tt-c.start)/Math.max(.01,c.dur))); v=c.vol+(c.vol2-c.vol)*u; } var L=proj.lanes[c.track]; if(L&&L.vol!=null) v*=L.vol/100; return v; }
function duckK(c,tt){ var d=(c.duckAmt==null?70:c.duckAmt)/100; var on=proj.clips.some(function(o){ return o!==c&&!o.duck&&(o.type==='video'||o.type==='audio')&&o.vol>0&&!laneOff(o.track)&&active(o,tt)&&(o.type==='audio'||media[o.mid]&&media[o.mid].hasAudio!==false); }); return on?1-d:1; }
function avgSp(c){ return c.speed2!=null?(c.speed+c.speed2)/2:c.speed; }
function spAt(c,r){ return c.speed2!=null?c.speed+(c.speed2-c.speed)*Math.max(0,Math.min(1,r/Math.max(.01,c.dur))):c.speed; }
function srcOff(c,x){ x=Math.max(0,Math.min(c.dur,x)); return c.speed2!=null?c.speed*x+(c.speed2-c.speed)*x*x/(2*Math.max(.01,c.dur)):c.speed*x; }
function wantAt(c,tt){ var r=tt-c.start; return c.rev?c.in+srcOff(c,c.dur-r):c.in+srcOff(c,r); }
function syncMedia(tt,run){
  proj.clips.forEach(function(c){
    if(c.type==='image'||c.type==='text') return; var el=getEl(c); if(!el) return;
    if(actx) wire(c,el);
    var on=active(c,tt), want=wantAt(c,tt), gn=gains[c.id], rv=!!c.rev;
    var lv=laneOff(c.track)?0:1, dk=c.duck?duckK(c,tt):1; var vv=rv?0:volAt(c,tt)/100; if(hpfs[c.id]) hpfs[c.id].frequency.value=c.hp||10; if(gn&&c.duck&&actx) gn.gain.setTargetAtTime(vv*fadeOf(c,tt)*lv*dk,actx.currentTime,.12); else if(gn) gn.gain.value=vv*fadeOf(c,tt)*lv; else el.volume=Math.max(0,Math.min(1,vv*fadeOf(c,tt)*lv));
    if(on){ el.playbackRate=Math.max(.0625,Math.min(16,spAt(c,tt-c.start))); if(run&&!rv){ if(el.paused){ if(Math.abs(el.currentTime-want)>.05) try{ el.currentTime=want; }catch(e){} var p=el.play(); if(p&&p.catch) p.catch(function(){}); } else if(Math.abs(el.currentTime-want)>.35) try{ el.currentTime=want; }catch(e){} }
      else { if(!el.paused) el.pause(); if(Math.abs(el.currentTime-want)>(rv?.05:.03)) try{ el.currentTime=want; }catch(e){} } }
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
  var srt=proj.clips.slice().sort(function(a,b){ return a.start-b.start; });
  ['V1','V2'].forEach(function(tr){ srt.forEach(function(c){ if(c.track!==tr||!active(c,tt)||laneOff(tr)) return; drawVisual(c,tt,W,H); }); });
  srt.forEach(function(c){ if(!active(c,tt)||laneOff(c.track)) return; if(c.type==='text') drawText(c,tt,W,H); else if(c.type==='shape') drawShape(c,tt,W,H); });
  g.globalAlpha=1; g.filter='none';
}
function sdirRow(c){ if(c.anim!=='slide') return ''; var sd=c.sdir||'left'; return '<div class="row"><label>들어오는 쪽</label><select data-k="sdir">'+[['left','왼쪽에서'],['right','오른쪽에서'],['up','위에서'],['down','아래에서']].map(function(a){ return '<option value="'+a[0]+'"'+(sd===a[0]?' selected':'')+'>'+a[1]+'</option>'; }).join('')+'</select></div>'; }
function animOf(c,tt){ var r=tt-c.start, d=Math.min(.6,c.dur/2), k=r<d?r/d:1, o={a:1,dx:0,dy:0,s:1}; if(c.anim==='fade') o.a=k; else if(c.anim==='slide'){ var sd=c.sdir||'left'; if(sd==='left') o.dx=(1-k)*-.25; else if(sd==='right') o.dx=(1-k)*.25; else if(sd==='up') o.dy=(1-k)*-.2; else o.dy=(1-k)*.2; o.a=k; } else if(c.anim==='rise'){ o.dy=(1-k)*.12; o.a=k; } else if(c.anim==='zoom'){ o.s=.7+.3*k; o.a=k; } else if(c.anim==='bounce'){ o.dy=-Math.abs(Math.sin(r*5))*.05; } else if(c.anim==='pulse'){ o.s=1+.08*Math.sin(r*6); } else if(c.anim==='shake'){ o.dx=Math.sin(r*70)*.005; o.dy=Math.cos(r*61)*.005; } else if(c.anim==='pop'){ o.s=k<1?(.4+.6*k)+(Math.sin(k*Math.PI)*.15):1; o.a=Math.min(1,k*2); } return o; }
var tcv=document.createElement('canvas'), tg=tcv.getContext('2d');
function keyed(s,w,h,ck){
  var tw=Math.max(8,Math.min(640,Math.round(w))), th=Math.max(8,Math.round(tw*h/w)); tcv.width=tw; tcv.height=th; tg.clearRect(0,0,tw,th); try{ tg.drawImage(s,0,0,tw,th); }catch(e){ return s; }
  var im=tg.getImageData(0,0,tw,th), d=im.data, r=parseInt(ck.col.slice(1,3),16), gg=parseInt(ck.col.slice(3,5),16), bb=parseInt(ck.col.slice(5,7),16), tol=ck.tol*4.4, soft=tol*.3+1;
  for(var i=0;i<d.length;i+=4){ var dist=Math.sqrt((d[i]-r)*(d[i]-r)+(d[i+1]-gg)*(d[i+1]-gg)+(d[i+2]-bb)*(d[i+2]-bb)); if(dist<tol) d[i+3]=0; else if(dist<tol+soft) d[i+3]=d[i+3]*(dist-tol)/soft; }
  tg.putImageData(im,0,0); return tcv;
}
function lerp(a,b,u){ return a+(b-a)*u; }
function drawVisual(c,tt,W,H){
  var s=srcOf(c); if(!s) return; var sw=s.videoWidth||s.naturalWidth, sh=s.videoHeight||s.naturalHeight; if(!sw) return;
  var fit=c.fit==='fill'?Math.max(W/sw,H/sh):Math.min(W/sw,H/sh), an=animOf(c,tt);
  var u=Math.max(0,Math.min(1,(tt-c.start)/Math.max(.01,c.dur))), e=u*u*(3-2*u), kf=c.kf&&c.kf.on?c.kf:null;
  var scV=kf?lerp(c.scale,kf.s,e):c.scale, xV=kf?lerp(c.x,kf.x,e):c.x, yV=kf?lerp(c.y,kf.y,e):c.y, rV=kf?lerp(c.rot,kf.r,e):c.rot;
  var clipMode='', al=1, dx=0, dy=0, zs=1, clipK=1, tr=c.tr&&c.tr.t&&c.tr.t!=='none'?c.tr:null;
  if(tr){ var rr=tt-c.start; if(rr<tr.d){ var k=rr/tr.d; k=k*k*(3-2*k); if(tr.t==='dissolve') al=k; else if(tr.t==='slideL') dx=(1-k)*W; else if(tr.t==='slideR') dx=-(1-k)*W; else if(tr.t==='slideU') dy=(1-k)*H; else if(tr.t==='wipe') clipK=k; else if(tr.t==='wipeR'){ clipK=k; clipMode='r'; } else if(tr.t==='iris'){ clipK=k; clipMode='i'; } else if(tr.t==='slideD') dy=-(1-k)*H; else if(tr.t==='zoom'){ zs=1.5-.5*k; al=k; } else if(tr.t==='spin'){ rV+= (1-k)*90; zs=k; al=k; } } }
  var sc=fit*(scV/100)*an.s*zs, w=sw*sc, h=sh*sc;
  g.save(); if(clipK<1){ g.beginPath(); if(clipMode==='r') g.rect(W*(1-clipK),0,W*clipK,H); else if(clipMode==='i') g.arc(W/2,H/2,Math.hypot(W,H)/2*clipK,0,Math.PI*2); else g.rect(0,0,W*clipK,H); g.clip(); }
  g.globalAlpha=(c.op/100)*fadeOf(c,tt)*(c.anim==='none'?1:an.a)*al; g.filter=filterStr(c.filt);
  g.translate(W/2+(xV/100)*W+an.dx*W+dx,H/2+(yV/100)*H+an.dy*H+dy); if(rV) g.rotate(rV*Math.PI/180); if(c.flip) g.scale(-1,1); if(c.flipV) g.scale(1,-1);
  if(c.blend&&c.blend!=='none') g.globalCompositeOperation=c.blend;
  var src=s; if(c.ck&&c.ck.on) src=keyed(s,w,h,c.ck);
  var cr=c.crop||null, cl=cr?cr.l/100:0, cR=cr?cr.r/100:0, ct=cr?cr.t/100:0, cb=cr?cr.b/100:0; if(cl+cR>.95){ cR=.95-cl; } if(ct+cb>.95){ cb=.95-ct; }
  var dw=w*(1-cl-cR), dh=h*(1-ct-cb), dx0=-w/2+w*cl, dy0=-h/2+h*ct, vw=src.videoWidth||src.naturalWidth||src.width, vh=src.videoHeight||src.naturalHeight||src.height;
  if(c.mask==='circle'){ g.beginPath(); g.ellipse(dx0+dw/2,dy0+dh/2,dw/2,dh/2,0,0,Math.PI*2); g.clip(); } else if(c.mask==='round'){ var rr=Math.min(dw,dh)*.18; g.beginPath(); g.moveTo(dx0+rr,dy0); g.arcTo(dx0+dw,dy0,dx0+dw,dy0+dh,rr); g.arcTo(dx0+dw,dy0+dh,dx0,dy0+dh,rr); g.arcTo(dx0,dy0+dh,dx0,dy0,rr); g.arcTo(dx0,dy0,dx0+dw,dy0,rr); g.closePath(); g.clip(); }
  try{ g.drawImage(src,vw*cl,vh*ct,vw*(1-cl-cR),vh*(1-ct-cb),dx0,dy0,dw,dh); }catch(e){}
  var fl=c.filt||{}; g.filter='none';
  if(fl.temp){ g.globalCompositeOperation='soft-light'; g.globalAlpha*=Math.min(1,Math.abs(fl.temp)/100*.8); g.fillStyle=fl.temp>0?'#ff9a1e':'#2e8bff'; g.fillRect(dx0,dy0,dw,dh); g.globalAlpha=(c.op/100)*fadeOf(c,tt)*(c.anim==='none'?1:an.a)*al; g.globalCompositeOperation=(c.blend&&c.blend!=='none')?c.blend:'source-over'; }
  if(fl.vig){ var rg=g.createRadialGradient(dx0+dw/2,dy0+dh/2,Math.min(dw,dh)*.2,dx0+dw/2,dy0+dh/2,Math.max(dw,dh)*.72); rg.addColorStop(0,'rgba(0,0,0,0)'); rg.addColorStop(1,'rgba(0,0,0,'+(fl.vig/100*.9)+')'); g.fillStyle=rg; g.globalCompositeOperation='source-over'; g.fillRect(dx0,dy0,dw,dh); }
  g.restore();
}
function drawShape(c,tt,W,H){
  var S=c.shp, an=animOf(c,tt), sz=S.size/100*H*(c.scale/100)*an.s, w=sz*S.asp/100, h=sz;
  g.save(); g.globalAlpha=(c.op/100)*fadeOf(c,tt)*(c.anim==='none'?1:an.a); g.filter='none'; g.translate(S.ox/100*W+an.dx*W,S.oy/100*H+an.dy*H); if(c.rot) g.rotate(c.rot*Math.PI/180);
  g.beginPath(); var k=S.k;
  if(k==='rect') g.rect(-w/2,-h/2,w,h); else if(k==='round'){ var r=Math.min(w,h)*.22; g.moveTo(-w/2+r,-h/2); g.arcTo(w/2,-h/2,w/2,h/2,r); g.arcTo(w/2,h/2,-w/2,h/2,r); g.arcTo(-w/2,h/2,-w/2,-h/2,r); g.arcTo(-w/2,-h/2,w/2,-h/2,r); g.closePath(); }
  else if(k==='circle') g.ellipse(0,0,w/2,h/2,0,0,Math.PI*2);
  else if(k==='star'){ for(var i=0;i<10;i++){ var a=-Math.PI/2+i*Math.PI/5, rr=i%2?.42:1; g[i?'lineTo':'moveTo'](Math.cos(a)*w/2*rr,Math.sin(a)*h/2*rr); } g.closePath(); }
  else if(k==='heart'){ g.moveTo(0,h*.38); g.bezierCurveTo(-w*.62,-h*.02,-w*.36,-h*.55,0,-h*.18); g.bezierCurveTo(w*.36,-h*.55,w*.62,-h*.02,0,h*.38); g.closePath(); }
  else if(k==='arrow'){ g.moveTo(-w/2,-h*.18); g.lineTo(w*.1,-h*.18); g.lineTo(w*.1,-h*.5); g.lineTo(w/2,0); g.lineTo(w*.1,h*.5); g.lineTo(w*.1,h*.18); g.lineTo(-w/2,h*.18); g.closePath(); }
  else if(k==='line'){ g.moveTo(-w/2,0); g.lineTo(w/2,0); }
  if(S.fill&&k!=='line'){ g.fillStyle=S.color; g.fill(); }
  if(S.sw>0||k==='line'){ g.lineWidth=Math.max(1,(S.sw||2)/100*H); g.strokeStyle=k==='line'?S.color:S.stroke; g.lineJoin='round'; g.lineCap='round'; g.stroke(); }
  g.restore();
}
var TFONTS=[['gothic','고딕'],['serif','명조'],['hand','손글씨'],['mono','고정폭'],['impact','굵은 제목'],['round','둥근 글씨']], TFAM={gothic:'"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif',serif:'"Nanum Myeongjo","Noto Serif KR","Batang",serif',hand:'"Nanum Pen Script","Comic Sans MS","Brush Script MT",cursive',mono:'"D2Coding",Consolas,"Courier New",monospace',impact:'Impact,"Arial Black",sans-serif',round:'"Arial Rounded MT Bold","Nanum Gothic","Noto Sans KR",sans-serif'};
var TSTY={'자막':{size:7,color:'#ffffff',bg:true,bgc:'#000000',w:'700',oy:88,ox:50,stroke:true,sw:14,sc:'#000000',font:'gothic'},'큰 제목':{size:16,color:'#ffd23c',bg:false,w:'900',oy:50,ox:50,stroke:true,sc:'#000000',sw:18,sh:true,font:'impact'},'네온':{size:12,color:'#ffffff',bg:false,w:'700',oy:50,ox:50,stroke:false,glow:true,glowc:'#00e5ff',font:'round'},'메모지':{size:10,color:'#2b2b2b',bg:true,bgc:'#fff3a0',w:'400',oy:50,ox:50,stroke:false,font:'hand'},'만화풍':{size:11,color:'#ffffff',bg:false,w:'900',oy:50,ox:50,stroke:true,sc:'#e8312f',sw:22,sh:true,font:'round'}};
function drawText(c,tt,W,H){
  var T=c.txt, an=animOf(c,tt), size=T.size/100*H*(c.scale/100)*an.s; var lines=String(T.s).split('\n'), shown=lines;
  if(c.anim==='type'){ var k=Math.min(1,(tt-c.start)/Math.max(.3,Math.min(2,c.dur*.6))), n=Math.floor(lines.join('\n').length*k); shown=lines.join('\n').slice(0,n).split('\n'); }
  g.save(); g.globalAlpha=(c.op/100)*fadeOf(c,tt)*((c.anim==='none'||c.anim==='type')?1:an.a); g.filter='none';
  g.translate(T.ox/100*W+an.dx*W,T.oy/100*H+an.dy*H); if(c.rot) g.rotate(c.rot*Math.PI/180);
  g.font=(T.it?'italic ':'')+T.w+' '+size+'px '+(TFAM[T.font||'gothic']||TFAM.gothic); g.textAlign='center'; g.textBaseline='middle';
  var lh=size*1.25, y0=-(lines.length-1)*lh/2;
  if(T.bg){ var mw=0; lines.forEach(function(l){ mw=Math.max(mw,g.measureText(l).width); }); g.fillStyle=T.bgc; g.globalAlpha*=.7; var pad=size*.4; g.fillRect(-mw/2-pad,y0-lh/2-pad*.5,mw+pad*2,lines.length*lh+pad); g.globalAlpha=(c.op/100)*fadeOf(c,tt)*((c.anim==='none'||c.anim==='type')?1:an.a); }
  var fw=0; lines.forEach(function(l){ fw=Math.max(fw,g.measureText(l).width); }); var fillS=T.color;
  if(T.rainbow){ var gr=g.createLinearGradient(-fw/2,0,fw/2,0); for(var q=0;q<=6;q++) gr.addColorStop(q/6,'hsl('+Math.round((q*60+tt*90)%360)+',90%,60%)'); fillS=gr; }
  if(T.blink&&Math.floor(tt*3)%2) g.globalAlpha*=.2;
  if(T.sh){ g.shadowColor='rgba(0,0,0,.65)'; g.shadowBlur=size*.18; g.shadowOffsetX=size*.07; g.shadowOffsetY=size*.07; }
  if(T.glow){ g.shadowColor=T.glowc||'#ffe66d'; g.shadowBlur=size*.45; g.shadowOffsetX=0; g.shadowOffsetY=0; }
  shown.forEach(function(l,i){ var y=y0+i*lh;
    if(c.anim==='wave'){ var tw=g.measureText(l).width, x0=-tw/2; g.textAlign='left'; for(var j=0;j<l.length;j++){ var xj=x0+g.measureText(l.slice(0,j)).width, yy=y+Math.sin(tt*6+j*.6)*size*.12; if(T.stroke){ g.lineWidth=size*(T.sw==null?14:T.sw)/100; g.strokeStyle=T.sc?T.sc:'rgba(0,0,0,.85)'; g.lineJoin='round'; g.strokeText(l[j],xj,yy); } g.fillStyle=fillS; g.fillText(l[j],xj,yy); } g.textAlign='center'; return; }
    if(T.stroke){ g.lineWidth=size*(T.sw==null?14:T.sw)/100; g.strokeStyle=T.sc?T.sc:'rgba(0,0,0,.85)'; g.lineJoin='round'; g.strokeText(l,0,y); } g.fillStyle=fillS; g.fillText(l,0,y); });
  g.restore();
}


/* ---------- waveform ---------- */
function ensurePeaks(m){
  if(!m||m.peaks||m.peaksTry||m.missing||m.type==='image'||!m.url||m.dur>1200) return; m.peaksTry=true;
  fetch(m.url).then(function(r){ return r.arrayBuffer(); }).then(function(ab){ var oc=new (window.OfflineAudioContext||window.webkitOfflineAudioContext)(1,1,44100); return new Promise(function(res,rej){ var p=oc.decodeAudioData(ab,res,rej); if(p&&p.catch) p.catch(rej); }); })
  .then(function(buf){ var d=buf.getChannelData(0), N=600, step=Math.max(1,Math.floor(d.length/N)), pk=[]; for(var i=0;i<N;i++){ var mx=0, a=i*step, b=Math.min(d.length,a+step); for(var j=a;j<b;j+=Math.max(1,Math.floor(step/40))){ var v=Math.abs(d[j]); if(v>mx) mx=v; } pk.push(+Math.min(1,mx*1.6).toFixed(2)); } m.peaks=pk; drawTl(); })
  .catch(function(){});
}
function waveSvg(c,m,wpx){
  if(!m||!m.peaks||c.type==='text'||c.type==='shape'||c.type==='image') return ''; var N=m.peaks.length, i0=Math.floor(c.in/m.dur*N), i1=Math.min(N,Math.ceil((c.in+c.dur*c.speed)/m.dur*N)); if(i1<=i0) return '';
  var d='', span=i1-i0; for(var i=i0;i<i1;i++){ var x=(i-i0)/span*100, a=m.peaks[i]*18; d+='M'+f(x)+' '+f(20-a)+'V'+f(20+a); }
  return '<svg class="wf" viewBox="0 0 100 40" preserveAspectRatio="none"><path d="'+d+'" stroke="rgba(255,255,255,.55)" stroke-width="1" vector-effect="non-scaling-stroke" fill="none"/></svg>';
}

/* ---------- timeline ---------- */
var LANES=[['V2',0],['V1',1],['T',2],['A',3]], LH=46, RH=24, LBL=34;
function laneY(tr){ for(var i=0;i<LANES.length;i++) if(LANES[i][0]===tr) return RH+i*LH; return RH; }
function drawTl(keepScroll){
  var tl=$('tlin'), len=Math.max(30,total()+10), wpx=len*pxs+LBL;
  var o='<div class="ruler" style="width:'+wpx+'px">', step=pxs>=80?1:pxs>=40?2:pxs>=20?5:10;
  for(var s=0;s<=len;s+=step) o+='<i style="left:'+(LBL+s*pxs)+'px">'+Math.floor(s/60)+':'+('0'+(s%60)).slice(-2)+'</i>';
  proj.markers.forEach(function(mk,i){ o+='<b class="mk" data-mk="'+i+'" title="표시 '+(i+1)+' · '+tcs(mk)+'" style="left:'+(LBL+mk*pxs-6)+'px"></b>'; }); o+='</div>';
  LANES.forEach(function(l,i){ o+='<div class="lane'+(laneOff(l[0])?' off':'')+(laneLock(l[0])?' lock':'')+'" style="top:'+(RH+i*LH)+'px;width:'+wpx+'px"><span class="lb" data-lane="'+l[0]+'" title="눌러서 줄 설정">'+({V1:'영상',V2:'겹침',T:'글자',A:'소리'}[l[0]])+(laneLock(l[0])?'<small>🔒</small>':'')+(laneOff(l[0])?'<small>'+(l[0]==='A'?'🔇':'🚫')+'</small>':'')+'</span></div>'; });
  proj.clips.forEach(function(c){ var m=media[c.mid], name=c.type==='text'?'T '+c.txt.s.replace(/\n/g,' '):(c.type==='shape'?'■ 도형':(m?m.name:'?'));
    o+='<div class="clip '+c.track+(c.id===sel?' sel':'')+(laneOff(c.track)?' off':'')+(laneLock(c.track)?' lock':'')+'" data-c="'+c.id+'" style="left:'+(LBL+c.start*pxs)+'px;top:'+(laneY(c.track)+4)+'px;width:'+Math.max(6,c.dur*pxs)+'px">'+waveSvg(c,m)+'<span class="nm">'+esc(name)+'</span><span class="hl"></span><span class="hr"></span></div>'; });
  o+='<div id="phead" style="left:'+(LBL+t*pxs)+'px;height:'+(RH+LANES.length*LH)+'px"></div>';
  var tlc=$('tl'), sl=tlc.scrollLeft, st=tlc.scrollTop; tl.innerHTML=o; tl.style.width=wpx+'px'; tl.style.height=(RH+LANES.length*LH)+'px'; tlc.scrollLeft=sl; tlc.scrollTop=st;
  $('zl').textContent=pxs+'px/초'; markBtn(); $('bUndo').disabled=hi<=0; $('bRedo').disabled=hi>=hist.length-1;
}
function updateHead(){
  markBtn(); var h=$('phead'); if(h) h.style.left=(LBL+t*pxs)+'px'; $('tc').textContent=tcs(t)+' / '+tcs(total());
  if(playing){ var tlc=$('tl'), x=LBL+t*pxs; if(x>tlc.scrollLeft+tlc.clientWidth-40) tlc.scrollLeft=x-60; }
}
function tlX(e){ var tlc=$('tl'), r=tlc.getBoundingClientRect(); return e.clientX-r.left+tlc.scrollLeft; }
var drag=null;
var ptrs={}, pinch=null;
function pinchDist(){ var k=Object.keys(ptrs); if(k.length<2) return 0; var a=ptrs[k[0]], b=ptrs[k[1]]; return Math.hypot(a.x-b.x,a.y-b.y); }
$('tl').addEventListener('pointerdown',function(e){ ptrs[e.pointerId]={x:e.clientX,y:e.clientY}; if(Object.keys(ptrs).length===2){ drag=null; pinch={d:pinchDist(),p:pxs}; } },true);
function pEnd(e){ delete ptrs[e.pointerId]; if(Object.keys(ptrs).length<2) pinch=null; }
$('tl').addEventListener('pointerup',pEnd,true); $('tl').addEventListener('pointercancel',pEnd,true);
$('tl').addEventListener('pointerdown',function(e){ if(pinch) return;
  var el=e.target.closest('.clip'), rul=e.target.closest('.ruler'), lbl=e.target.closest('.lb');
  closeMenu(); if(lbl){ laneMenu(lbl.dataset.lane,e.clientX,e.clientY); return; }
  var mkEl=e.target.closest('.mk'); if(mkEl){ seek(proj.markers[+mkEl.dataset.mk]); return; }
  if(rul&&!el){ drag={k:'seek'}; $('tl').setPointerCapture(e.pointerId); seek((tlX(e)-LBL)/pxs); return; }
  if(!el){ var y=e.clientY-$('tl').getBoundingClientRect().top+$('tl').scrollTop; if(y>RH){ sel=null; drawTl(); panel(); seek((tlX(e)-LBL)/pxs); } return; }
  var c=clipById(el.dataset.c); sel=c.id; var edge=e.target.classList.contains('hl')?'l':e.target.classList.contains('hr')?'r':'m';
  if(laneLock(c.track)){ drawTl(); panel(); drag=null; return; }
  drag={k:edge,c:c,x:e.clientX,y:e.clientY,start:c.start,dur:c.dur,in:c.in,track:c.track,moved:false}; $('tl').setPointerCapture(e.pointerId); drawTl(); panel();
});
function snapPts(c){ var p=[0,t].concat(proj.markers); proj.clips.forEach(function(o){ if(o!==c){ p.push(o.start,endOf(o)); } }); return p; }
function snapTo(v,c,thr){ var best=v, bd=thr; snapPts(c).forEach(function(p){ if(Math.abs(p-v)<bd){ bd=Math.abs(p-v); best=p; } }); return best; }
$('tl').addEventListener('pointermove',function(e){
  if(ptrs[e.pointerId]) ptrs[e.pointerId]={x:e.clientX,y:e.clientY}; if(pinch){ var d0=pinchDist(); if(d0>10&&pinch.d>10) zoomTo(pinch.p*d0/pinch.d); return; }
  if(!drag) return; if(drag.k==='seek'){ seek((tlX(e)-LBL)/pxs); return; }
  var c=drag.c, dx=(e.clientX-drag.x)/pxs, thr=8/pxs; if(Math.abs(e.clientX-drag.x)+Math.abs(e.clientY-drag.y)>3) drag.moved=true; if(!drag.moved) return;
  var m=media[c.mid], maxSrc=c.type==='text'||c.type==='image'?1e9:(m?m.dur:1e9);
  if(drag.k==='m'){ var ns=Math.max(0,snapTo(drag.start+dx,c,thr)); var ne=snapTo(ns+c.dur,c,thr)-c.dur; if(ne>=0&&Math.abs(ne-ns)>0&&Math.abs(snapTo(ns+c.dur,c,thr)-(ns+c.dur))>0) ns=ne; c.start=Math.max(0,ns);
    var y=e.clientY-$('tl').getBoundingClientRect().top+$('tl').scrollTop, li=Math.floor((y-RH)/LH); if(li>=0&&li<LANES.length){ var tr=LANES[li][0], ok=((c.type==='text'||c.type==='shape')&&tr==='T')||(c.type==='audio'&&tr==='A')||((c.type==='video'||c.type==='image')&&(tr==='V1'||tr==='V2')); if(ok&&!laneLock(tr)) c.track=tr; } }
  else if(drag.k==='l'){ var ns2=Math.max(0,snapTo(drag.start+dx,c,thr)), d=ns2-drag.start; var ni=drag.in+d*c.speed; if(ni<0){ d=-drag.in/c.speed; ni=0; ns2=drag.start+d; } if(drag.dur-d<.1){ d=drag.dur-.1; ns2=drag.start+d; ni=drag.in+d*c.speed; } c.start=ns2; c.in=ni; c.dur=drag.dur-d; }
  else if(drag.k==='r'){ var nd=snapTo(drag.start+drag.dur+dx,c,thr)-drag.start; nd=Math.max(.1,nd); if(maxSrc<1e8) nd=Math.min(nd,(maxSrc-c.in)/c.speed); c.dur=nd; }
  drawTl(); drag.keep=true;
});
$('tl').addEventListener('pointerup',function(){ if(!drag) return; var d=drag; drag=null; if(d.k!=='seek'&&d.moved) commit(); else if(d.k!=='seek') panel(); });
$('tl').addEventListener('wheel',function(e){ if(e.ctrlKey||e.metaKey){ e.preventDefault(); zoomTo(pxs*(e.deltaY<0?1.15:.87)); } },{passive:false});
function zoomTo(n){ var tlc=$('tl'), old=pxs; pxs=Math.max(4,Math.min(240,Math.round(n))); if(pxs===old) return; var sx=LBL+t*old-tlc.scrollLeft; drawTl(); tlc.scrollLeft=Math.max(0,LBL+t*pxs-sx); }
$('bTp').onclick=function(){ zoomTo(pxs*1.3); }; $('bTm').onclick=function(){ zoomTo(pxs/1.3); };
$('bFit').onclick=function(){ var tot=total(); if(!tot){ toast('클립이 없어요'); return; } pxs=Math.max(4,Math.min(240,Math.floor(($('tl').clientWidth-LBL-24)/tot))); drawTl(); $('tl').scrollLeft=0; };
/* lane menu: lock / hide-mute */
var menuEl=null;
function closeMenu(){ if(menuEl){ menuEl.remove(); menuEl=null; } }
function laneMenu(tr,x,y){
  var L=proj.lanes[tr]||(proj.lanes[tr]={}), nm={V1:'영상',V2:'겹침',T:'글자',A:'소리'}[tr], d=document.createElement('div'); d.className='menu';
  d.innerHTML='<div style="padding:6px 10px;font-size:12px;color:var(--dim)">줄 소리 크기 <b id="lvv">'+(L.vol==null?100:L.vol)+'%</b><input type="range" id="lvr" min="0" max="200" value="'+(L.vol==null?100:L.vol)+'" style="width:100%;accent-color:var(--fry)"></div><button data-a="lock">'+(L.lock?'🔓 잠금 풀기':'🔒 잠그기')+' (옮기기·자르기 막기)</button><button data-a="off">'+(L.off?'다시 켜기':(tr==='A'?'🔇 소리 끄기':'🚫 이 줄 숨기기'))+'</button>';
  d.style.left=Math.min(x,innerWidth-230)+'px'; d.style.top=Math.max(4,Math.min(y,innerHeight-110))+'px'; document.body.appendChild(d); menuEl=d;
  d.addEventListener('pointerdown',function(e){ e.stopPropagation(); });
  d.querySelector('#lvr').addEventListener('input',function(){ L.vol=+this.value; if(L.vol===100) delete L.vol; d.querySelector('#lvv').textContent=this.value+'%'; syncMedia(t,playing); });
  d.querySelector('#lvr').addEventListener('change',function(){ if(!L.lock&&!L.off&&L.vol==null) delete proj.lanes[tr]; commit(true); });
  d.addEventListener('click',function(e){ var b=e.target.closest('button'); if(!b) return; L[b.dataset.a]=!L[b.dataset.a]; if(!L.lock&&!L.off&&L.vol==null) delete proj.lanes[tr]; closeMenu(); if(L.lock&&sel){ var c=curClip(); if(c&&c.track===tr&&false) sel=null; } commit(); syncMedia(t,playing); toast(nm+' 줄: '+(b.dataset.a==='lock'?(L.lock?'잠겼어요':'잠금을 풀었어요'):(L.off?'꺼졌어요':'켜졌어요'))); });
}
document.addEventListener('pointerdown',function(e){ if(menuEl&&!menuEl.contains(e.target)) closeMenu(); },true);
/* markers */
function markerAt(){ for(var i=0;i<proj.markers.length;i++) if(Math.abs(proj.markers[i]-t)<.06) return i; return -1; }
function markBtn(){ var tx=markerAt()>=0?'🚩 표시 지우기':'🚩 표시', b=$('bMark'); if(b.textContent!==tx) b.textContent=tx; }
$('bMark').onclick=function(){ var i=markerAt(); if(i>=0) proj.markers.splice(i,1); else { proj.markers.push(+t.toFixed(2)); proj.markers.sort(function(a,b){ return a-b; }); } commit(true); markBtn(); };

/* ---------- clip ops ---------- */
function lockedMsg(c){ if(c&&laneLock(c.track)){ toast('잠긴 줄이에요. 줄 이름을 눌러 잠금을 풀어 주세요'); return true; } return false; }
function split(){ var c=curClip(); if(!c){ // split the clip under the playhead on the lowest video track
    c=proj.clips.filter(function(o){ return active(o,t); })[0]; } if(!c||t<=c.start+.05||t>=endOf(c)-.05){ toast('자를 클립을 고르고 재생 막대를 클립 안쪽에 놓으세요'); return; }
  if(lockedMsg(c)) return;
  var r=t-c.start; if(c.rev&&c.speed2!=null){ toast('거꾸로 + 빠르기 변화 클립은 자를 수 없어요'); return; } var n=JSON.parse(JSON.stringify(c)); n.id='c'+(proj.uid++); n.start=t; n.dur=c.dur-r;
  if(c.rev){ n.in=c.in; c.in=c.in+c.speed*(c.dur-r); } else { n.in=c.in+srcOff(c,r); if(c.speed2!=null){ var sm=spAt(c,r); n.speed=sm; c.speed2=sm; } }
  n.fadeIn=0; c.dur=r; c.fadeOut=0; proj.clips.push(n); sel=n.id; commit(); }
$('bSplit').onclick=split;
$('bDup').onclick=function(){ var c=curClip(); if(!c||lockedMsg(c)) return; var n=JSON.parse(JSON.stringify(c)); n.id='c'+(proj.uid++); n.start=endOf(c); proj.clips.push(n); sel=n.id; commit(); };
function del(ripple){ var c=curClip(); if(!c||lockedMsg(c)) return; proj.clips=proj.clips.filter(function(o){ return o!==c; }); if(ripple) proj.clips.forEach(function(o){ if(o.track===c.track&&o.start>=endOf(c)-.01) o.start=Math.max(0,o.start-c.dur); }); sel=null; cleanElems(); commit(); }
$('bDel').onclick=function(){ del(false); };
$('bRip').onclick=function(){ if(!curClip()){ toast('지울 클립을 먼저 고르세요'); return; } del(true); };
/* freeze frame: stop the picture for 2 seconds at the playhead */
$('bFreeze').onclick=function(){
  var c=curClip(); if(!c||c.type!=='video'||!active(c,t)) c=proj.clips.filter(function(o){ return o.type==='video'&&active(o,t)&&!laneOff(o.track); }).pop();
  if(!c){ toast('영상 클립 위에 재생 막대를 놓아 주세요'); return; } if(lockedMsg(c)) return;
  var s=srcOf(c); if(!s||!s.videoWidth){ toast('이 장면을 아직 읽지 못했어요. 잠시 뒤 다시 눌러 주세요'); return; }
  var fc=document.createElement('canvas'); fc.width=s.videoWidth; fc.height=s.videoHeight; try{ fc.getContext('2d').drawImage(s,0,0); }catch(e){ toast('장면을 가져오지 못했어요'); return; }
  var at=t, cid=c.id; fc.toBlob(function(b){ if(!b) return; var file=new File([b],'멈춘 장면 '+tcs(at)+'.png',{type:'image/png'});
    addFiles([file],function(mid){ var c0=clipById(cid); if(!c0) return; var d=2, r=at-c0.start, ins=at;
      if(r>.05&&r<c0.dur-.05){ var tail=JSON.parse(JSON.stringify(c0)); tail.id='c'+(proj.uid++); tail.start=at; tail.dur=c0.dur-r; tail.in=c0.in+r*c0.speed; tail.fadeIn=0; delete tail.tr; c0.dur=r; c0.fadeOut=0; proj.clips.push(tail); }
      else if(r<=.05) ins=c0.start; else ins=endOf(c0);
      proj.clips.forEach(function(o){ if(o.track===c0.track&&o.start>=ins-.001) o.start+=d; });
      var im={id:'c'+(proj.uid++),mid:mid,type:'image',track:c0.track,start:ins,in:0,dur:d,speed:1,vol:0,fadeIn:0,fadeOut:0,op:c0.op,scale:c0.scale,x:c0.x,y:c0.y,rot:c0.rot,flip:c0.flip,fit:c0.fit,filt:Object.assign({},c0.filt),anim:'none'};
      proj.clips.push(im); sel=im.id; commit(); toast('2초 동안 멈춘 장면을 넣었어요'); }); },'image/png');
};

/* ---------- panel ---------- */
function rng(l,k,min,max,v,step,unit){ return '<div class="row"><label>'+l+'</label><input type="range" data-k="'+k+'" min="'+min+'" max="'+max+'" step="'+(step||1)+'" value="'+v+'"><input type="number" class="nv" data-k="'+k+'" min="'+min+'" max="'+max+'" step="'+(step||1)+'" value="'+f(v)+'"><span class="u">'+(unit||'')+'</span></div>'; }
var PRESETS={'원본':{br:100,ct:100,sat:100,gray:0,sepia:0,blur:0,hue:0},'흑백':{br:100,ct:110,sat:100,gray:100,sepia:0,blur:0,hue:0},'옛날 사진':{br:100,ct:95,sat:80,gray:0,sepia:70,blur:0,hue:0},'선명하게':{br:104,ct:125,sat:130,gray:0,sepia:0,blur:0,hue:0},'따뜻하게':{br:104,ct:100,sat:115,gray:0,sepia:25,blur:0,hue:-10},'차갑게':{br:100,ct:105,sat:95,gray:0,sepia:0,blur:0,hue:18},'흐리게':{br:100,ct:100,sat:100,gray:0,sepia:0,blur:4,hue:0},'시네마':{br:98,ct:122,sat:88,gray:0,sepia:0,blur:0,hue:0,temp:-25,vig:45},'노을':{br:104,ct:108,sat:125,gray:0,sepia:12,blur:0,hue:0,temp:65,vig:25},'따뜻한 필름':{br:102,ct:112,sat:108,gray:0,sepia:18,blur:0,hue:-6,temp:35,vig:30},'청록 영화':{br:100,ct:118,sat:105,gray:0,sepia:0,blur:0,hue:12,temp:-35,vig:35},'빈티지 흑백':{br:104,ct:118,sat:100,gray:100,sepia:35,blur:0,hue:0,vig:55},'쨍한 색':{br:104,ct:115,sat:175,gray:0,sepia:0,blur:0,hue:0},'칙칙한 톤':{br:98,ct:90,sat:55,gray:0,sepia:8,blur:0,hue:0,temp:-10},'새벽':{br:106,ct:95,sat:85,gray:0,sepia:0,blur:0,hue:0,temp:-55,vig:15}};
function panel(){
  var b=$('pbody'), h=''; document.querySelectorAll('#ptabs button').forEach(function(x){ x.classList.toggle('on',x.dataset.p===ptab); });
  if(ptab==='proj'){
    h+='<div class="sec"><h4>화면 비율</h4><div class="row"><select id="arSel">'+Object.keys(AR).map(function(k){ return '<option'+(k===proj.ar?' selected':'')+'>'+k+'</option>'; }).join('')+'</select></div><div class="note">16:9 유튜브, 9:16 쇼츠·릴스, 1:1 인스타, 4:3 옛날 TV, 21:9 영화 같은 와이드예요.</div></div>';
    h+='<div class="sec"><h4>배경 색</h4><div class="row"><label>빈 곳 색</label><input type="color" id="bgc" value="'+proj.bg+'"></div></div>';
    h+='<div class="sec"><h4>소리</h4><label class="chk"><input type="checkbox" id="monChk"'+(monitor?' checked':'')+'> 재생할 때 소리 듣기</label></div>';
    h+='<div class="sec"><h4>자막 한꺼번에 넣기</h4><textarea id="subTxt" style="min-height:96px" placeholder="한 줄에 하나씩\n0:02-0:05 안녕하세요\n5.5-8 오늘은 영상 편집을 해 볼게요\n10 시작 시간만 쓰면 3초" data-notr></textarea><div class="btns"><button class="tbtn" id="subGo">자막 넣기</button></div><div class="note">시간은 0:05 또는 5.5처럼 쓰고, 끝 시간을 빼면 3초예요.</div><div class="btns"><button class="tbtn" id="subImp">자막 파일 가져오기 (SRT·VTT)</button><button class="tbtn" id="subSrt">SRT로 내보내기</button><button class="tbtn" id="subVtt">VTT로 내보내기</button></div></div>';
    h+='<div class="sec"><h4>줄 정리</h4><div class="btns"><button class="tbtn" data-gap="V1">영상 줄 틈 없애기</button><button class="tbtn" data-gap="A">소리 줄 틈 없애기</button></div><div class="note">줄 안의 클립들을 순서대로 빈틈 없이 붙여요.</div></div>';
    h+='<div class="sec"><button class="tbtn" id="bClear">모두 지우고 새로 시작</button></div>';
  } else {
    var c=curClip();
    if(!c) h+='<div class="note">타임라인의 클립을 누르면 여기서 고칠 수 있어요.<br><br><b>쓰는 법</b><br>1. <b>+ 파일 넣기</b>로 영상·그림·소리를 넣고, 왼쪽 목록에서 눌러 타임라인에 올려요.<br>2. 클립을 끌어 옮기고, 양 끝을 끌어 줄여요. 재생 막대를 놓고 <b>✂ 자르기</b>(S)로 나눠요.<br>3. <b>T 글자 넣기</b>로 자막을 넣어요.<br>4. <b>영상 만들기</b>를 누르면 처음부터 끝까지 재생하면서 파일로 녹화해요. 그동안 이 탭을 켜 두세요.</div>';
    else {
      h+='<div class="sec"><h4>'+({video:'영상',image:'그림',audio:'소리',text:'글자',shape:'도형'}[c.type])+' 클립 · '+tcs(c.dur)+'</h4>';
      h+='<div class="row"><label>시작</label><input type="number" data-k="start" step="0.1" min="0" value="'+f(c.start)+'"><span class="v">초</span></div><div class="row"><label>길이</label><input type="number" data-k="dur" step="0.1" min="0.1" value="'+f(c.dur)+'"><span class="v">초</span></div></div>';
      if(c.type==='shape'){ var S=c.shp;
        h+='<div class="sec"><h4>도형</h4><div class="row"><select data-sp="k">'+[['rect','네모'],['round','둥근 네모'],['circle','원'],['star','별'],['heart','하트'],['arrow','화살표'],['line','선']].map(function(a){ return '<option value="'+a[0]+'"'+(S.k===a[0]?' selected':'')+'>'+a[1]+'</option>'; }).join('')+'</select></div>'+rng('크기','sp.size',3,120,S.size,1,'%')+rng('가로 세로 비율','sp.asp',20,400,S.asp,1,'%')+rng('가로 위치','sp.ox',0,100,S.ox,1,'%')+rng('세로 위치','sp.oy',0,100,S.oy,1,'%')+'<div class="row"><label>안쪽 색</label><input type="color" data-sp="color" value="'+S.color+'"><label class="chk" style="margin:0 0 0 8px"><input type="checkbox" data-sp="fill"'+(S.fill?' checked':'')+'> 채우기</label></div><div class="row"><label>테두리 색</label><input type="color" data-sp="stroke" value="'+S.stroke+'"></div>'+rng('테두리 굵기','sp.sw',0,10,S.sw,.5,'%')+'</div>';
        h+='<div class="sec"><h4>나타나는 방식</h4><div class="row"><select data-k="anim">'+[['none','없음'],['fade','서서히'],['rise','아래서 올라옴'],['slide','옆에서 들어옴'],['zoom','커지며'],['pop','톡 튀어나옴']].map(function(a){ return '<option value="'+a[0]+'"'+(c.anim===a[0]?' selected':'')+'>'+a[1]+'</option>'; }).join('')+'</select></div>'+sdirRow(c)+rng('크기 배율','scale',20,300,c.scale,1,'%')+rng('돌리기','rot',-180,180,c.rot,1,'°')+rng('투명도','op',0,100,c.op,1,'%')+rng('나타날 때 서서히','fadeIn',0,3,c.fadeIn,.1,'초')+rng('사라질 때 서서히','fadeOut',0,3,c.fadeOut,.1,'초')+'</div>';
      } else if(c.type==='text'){ var T=c.txt;
        h+='<div class="sec"><h4>글자</h4><textarea data-t="s" style="min-height:70px" data-notr>'+esc(T.s)+'</textarea><div class="btns">'+Object.keys(TSTY).map(function(k){ return '<button class="tbtn" data-tsty="'+k+'">'+k+'</button>'; }).join('')+'</div>'+rng('크기','t.size',2,30,T.size,1,'%')+'<div class="row"><label>글자 색</label><input type="color" data-t="color" value="'+T.color+'"><label class="chk" style="margin:0 0 0 8px"><input type="checkbox" data-t="stroke"'+(T.stroke?' checked':'')+'> 테두리</label></div><div class="row"><label>글자 상자</label><label class="chk" style="margin:0"><input type="checkbox" data-t="bg"'+(T.bg?' checked':'')+'> 쓰기</label><input type="color" data-t="bgc" value="'+T.bgc+'"></div>'+rng('가로 위치','t.ox',0,100,T.ox,1,'%')+rng('세로 위치','t.oy',0,100,T.oy,1,'%')+'<div class="btns">'+['😀','😂','❤️','⭐','🔥','👍','🎉','✨','😢','👏'].map(function(em){ return '<button class="tbtn" data-emo="'+em+'" style="padding:0 8px">'+em+'</button>'; }).join('')+'</div><div class="row"><label>굵기</label><select data-t="w"><option value="400"'+(T.w==='400'?' selected':'')+'>보통</option><option value="700"'+(T.w==='700'?' selected':'')+'>굵게</option><option value="900"'+(T.w==='900'?' selected':'')+'>아주 굵게</option></select></div>'
          +'<div class="row"><label>글자체</label><select data-t="font">'+TFONTS.map(function(x){ return '<option value="'+x[0]+'"'+((T.font||'gothic')===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></div><label class="chk"><input type="checkbox" data-t="it"'+(T.it?' checked':'')+'> 기울이기</label></div>'
          +'<div class="sec"><h4>글자 효과</h4><div class="row"><label>테두리 색</label><input type="color" data-t="sc" value="'+(T.sc||'#000000')+'">'+'</div>'+rng('테두리 굵기','t.sw',0,40,T.sw==null?14:T.sw,1,'%')
          +'<label class="chk"><input type="checkbox" data-t="sh"'+(T.sh?' checked':'')+'> 그림자</label><div class="row"><label class="chk" style="margin:0;flex:1"><input type="checkbox" data-t="glow"'+(T.glow?' checked':'')+'> 빛나기</label><input type="color" data-t="glowc" value="'+(T.glowc||'#ffe66d')+'"></div><label class="chk"><input type="checkbox" data-t="rainbow"'+(T.rainbow?' checked':'')+'> 무지개 색 (움직여요)</label><label class="chk"><input type="checkbox" data-t="blink"'+(T.blink?' checked':'')+'> 깜빡깜빡</label></div>';
        h+='<div class="sec"><h4>나타나는 방식</h4><div class="row"><select data-k="anim">'+[['none','없음'],['fade','서서히'],['rise','아래서 올라옴'],['slide','옆에서 들어옴'],['zoom','커지며'],['pop','톡 튀어나옴'],['type','한 글자씩'],['bounce','통통 튀기'],['pulse','두근두근'],['shake','덜덜'],['wave','물결 (글자마다)']].map(function(a){ return '<option value="'+a[0]+'"'+(c.anim===a[0]?' selected':'')+'>'+a[1]+'</option>'; }).join('')+'</select></div>'+sdirRow(c)+rng('크기 배율','scale',20,300,c.scale,1,'%')+rng('돌리기','rot',-180,180,c.rot,1,'°')+rng('투명도','op',0,100,c.op,1,'%')+rng('나타날 때 서서히','fadeIn',0,3,c.fadeIn,.1,'초')+rng('사라질 때 서서히','fadeOut',0,3,c.fadeOut,.1,'초')+'</div>';
      } else {
        if(c.type!=='image'){ h+='<div class="sec"><h4>소리</h4>'+rng('소리 크기','vol',0,200,c.vol,1,'%')+rng('시작할 때 서서히','fadeIn',0,5,c.fadeIn,.1,'초')+rng('끝날 때 서서히','fadeOut',0,5,c.fadeOut,.1,'초')+rng(c.speed2!=null?'처음 빠르기':'빠르기','speed',.25,4,c.speed,.05,'x')+'<label class="chk"><input type="checkbox" data-rampon="1"'+(c.speed2!=null?' checked':'')+'> 빠르기가 흐르며 바뀌기 (천천히→빠르게)</label>'+(c.speed2!=null?rng('끝 빠르기','speed2',.25,4,c.speed2,.05,'x'):'')+(c.type==='video'?'<label class="chk"><input type="checkbox" data-k="rev"'+(c.rev?' checked':'')+'> 거꾸로 재생 (소리 없음, 미리볼 때 조금 끊길 수 있어요)</label>':'')+'<div class="note">빠르기를 바꾸면 클립 길이가 같이 바뀌어요.</div><label class="chk"><input type="checkbox" data-voion="1"'+(c.vol2!=null?' checked':'')+'> 클립이 흐르며 소리 크기 바꾸기</label>'+(c.vol2!=null?rng('끝 소리 크기','vol2',0,200,c.vol2,1,'%'):'')+'<div class="row"><label>우르릉 줄이기</label><select data-k="hp">'+[[0,'끄기'],[80,'약하게 (바람·에어컨)'],[150,'보통'],[300,'세게 (목소리만)']].map(function(a){ return '<option value="'+a[0]+'"'+((c.hp||0)===a[0]?' selected':'')+'>'+a[1]+'</option>'; }).join('')+'</select></div><div class="btns"><button class="tbtn" data-norm="1">소리 크기 자동으로 맞추기</button></div><label class="chk"><input type="checkbox" data-k="duck"'+(c.duck?' checked':'')+'> 다른 소리가 나올 때 이 소리 낮추기 (배경음악용)</label>'+(c.duck?rng('낮추는 정도','duckAmt',10,95,c.duckAmt==null?70:c.duckAmt,1,'%'):'')+'</div>'; }
        if(c.type!=='audio'){
          h+='<div class="sec"><h4>화면</h4><div class="row"><label>맞추기</label><select data-k="fit"><option value="fit"'+(c.fit==='fit'?' selected':'')+'>안 잘리게 (검은 띠)</option><option value="fill"'+(c.fit==='fill'?' selected':'')+'>꽉 채우기 (잘림)</option></select></div>'+rng('크기','scale',10,400,c.scale,1,'%')+rng('가로 옮기기','x',-100,100,c.x,1,'%')+rng('세로 옮기기','y',-100,100,c.y,1,'%')+rng('돌리기','rot',-180,180,c.rot,1,'°')+rng('투명도','op',0,100,c.op,1,'%')+'<label class="chk"><input type="checkbox" data-k="flip"'+(c.flip?' checked':'')+'> 좌우 뒤집기</label>'+(c.type==='image'?rng('서서히 나타남','fadeIn',0,3,c.fadeIn,.1,'초')+rng('서서히 사라짐','fadeOut',0,3,c.fadeOut,.1,'초'):rng('화면 서서히 나타남','fadeIn',0,5,c.fadeIn,.1,'초')+rng('화면 서서히 사라짐','fadeOut',0,5,c.fadeOut,.1,'초'))+'</div>';
          h+='<div class="sec"><h4>나타나는 방식</h4><div class="row"><select data-k="anim">'+[['none','없음'],['fade','서서히'],['slide','옆에서 들어옴'],['rise','아래서 올라옴'],['zoom','커지며']].map(function(a){ return '<option value="'+a[0]+'"'+(c.anim===a[0]?' selected':'')+'>'+a[1]+'</option>'; }).join('')+'</select></div>'+sdirRow(c)+'</div>';
          if(c.type!=='audio'){
            var TR=c.tr||{t:'none',d:.6}, KF=c.kf||{on:false,s:c.scale*1.2,x:c.x,y:c.y,r:c.rot}, CK=c.ck||{on:false,col:'#00b140',tol:35};
            h+='<div class="sec"><h4>앞 클립과 이어지는 효과</h4><div class="row"><select data-trt="1">'+[['none','없음'],['dissolve','부드럽게 겹치기'],['slideL','오른쪽에서 밀기'],['slideR','왼쪽에서 밀기'],['slideU','아래서 밀기'],['wipe','왼쪽에서 닦기'],['wipeR','오른쪽에서 닦기'],['iris','동그랗게 열리며'],['slideD','위에서 밀기'],['zoom','확대하며 나타남'],['spin','돌며 나타남']].map(function(a){ return '<option value="'+a[0]+'"'+(TR.t===a[0]?' selected':'')+'>'+a[1]+'</option>'; }).join('')+'</select></div>'+rng('효과 시간','tr.d',.2,2,TR.d,.1,'초')+'<div class="note">앞 클립과 같은 줄에서 딱 붙어 있어야 해요. 고르면 이 클립이 앞 클립 끝과 겹치도록 앞으로 당겨져요.</div></div>';
            h+='<div class="sec"><h4>움직임 (천천히 확대·이동)</h4><label class="chk"><input type="checkbox" data-kfon="1"'+(KF.on?' checked':'')+'> 클립이 흐르는 동안 변하게 하기</label><div class="btns"><button class="tbtn" data-kfp="in">천천히 확대</button><button class="tbtn" data-kfp="out">천천히 축소</button><button class="tbtn" data-kfp="left">왼쪽으로</button><button class="tbtn" data-kfp="right">오른쪽으로</button></div>'+(KF.on?rng('끝 크기','kf.s',10,400,KF.s,1,'%')+rng('끝 가로','kf.x',-100,100,KF.x,1,'%')+rng('끝 세로','kf.y',-100,100,KF.y,1,'%')+rng('끝 돌리기','kf.r',-180,180,KF.r,1,'°'):'')+'<div class="note">위의 크기·옮기기·돌리기가 시작 값이고, 여기 값이 끝 값이에요.</div></div>';
            h+='<div class="sec"><h4>배경 지우기 (크로마키)</h4><label class="chk"><input type="checkbox" data-ckon="1"'+(CK.on?' checked':'')+'> 고른 색을 투명하게</label><div class="row"><label>지울 색</label><input type="color" data-ck="col" value="'+CK.col+'"></div>'+rng('범위','ck.tol',5,90,CK.tol,1)+'<div class="note">초록색 천 앞에서 찍은 영상을 위쪽(겹침) 줄에 올리면 뒤 영상이 비쳐 보여요.</div></div>';
          }
          h+='<div class="sec"><h4>자르기·모양·섞기</h4>'+rng('왼쪽 자르기','cr.l',0,90,(c.crop||{}).l||0,1,'%')+rng('오른쪽 자르기','cr.r',0,90,(c.crop||{}).r||0,1,'%')+rng('위 자르기','cr.t',0,90,(c.crop||{}).t||0,1,'%')+rng('아래 자르기','cr.b',0,90,(c.crop||{}).b||0,1,'%')+'<div class="row"><label>모양</label><select data-k="mask">'+[['none','네모 그대로'],['round','둥근 네모'],['circle','원 / 타원']].map(function(a){ return '<option value="'+a[0]+'"'+((c.mask||'none')===a[0]?' selected':'')+'>'+a[1]+'</option>'; }).join('')+'</select></div><label class="chk"><input type="checkbox" data-k="flipV"'+(c.flipV?' checked':'')+'> 위아래 뒤집기</label><div class="row"><label>섞는 방식</label><select data-k="blend">'+[['none','보통'],['multiply','어둡게 곱하기'],['screen','밝게 겹치기'],['overlay','대비 겹치기'],['lighten','밝은 쪽만'],['darken','어두운 쪽만'],['difference','차이'],['soft-light','부드러운 빛']].map(function(a){ return '<option value="'+a[0]+'"'+((c.blend||'none')===a[0]?' selected':'')+'>'+a[1]+'</option>'; }).join('')+'</select></div><div class="note">섞는 방식은 겹침 줄 클립을 아래 영상과 섞을 때 좋아요.</div></div>';
          h+='<div class="sec"><h4>색 효과</h4><div class="btns">'+Object.keys(PRESETS).map(function(k){ return '<button class="tbtn" data-pre="'+k+'">'+k+'</button>'; }).join('')+'</div>'+rng('밝기','f.br',20,200,c.filt.br,1,'%')+rng('대비','f.ct',20,200,c.filt.ct,1,'%')+rng('색 진하기','f.sat',0,300,c.filt.sat,1,'%')+rng('흑백','f.gray',0,100,c.filt.gray,1,'%')+rng('옛날 느낌','f.sepia',0,100,c.filt.sepia,1,'%')+rng('색 돌리기','f.hue',-180,180,c.filt.hue,1,'°')+rng('흐리게','f.blur',0,20,c.filt.blur,1,'px')+rng('따뜻함(−차가움)','f.temp',-100,100,c.filt.temp||0,1)+rng('가장자리 어둡게','f.vig',0,100,c.filt.vig||0,1,'%')+'<div class="btns"><button class="tbtn" data-fx="copy">효과 복사</button><button class="tbtn" data-fx="paste">효과 붙이기</button></div>'+'<div class="note">색 효과는 크롬·엣지·파이어폭스에서 보이고, 사파리에서는 안 보일 수 있어요.</div></div>';
        }
      }
    }
  }
  b.innerHTML=h;
}
$('ptabs').addEventListener('click',function(e){ var b=e.target.closest('button'); if(b){ ptab=b.dataset.p; panel(); } });
var pb=$('pbody');
function setProp(c,k,v){ if(k.indexOf('cr.')===0){ c.crop=c.crop||{l:0,r:0,t:0,b:0}; c.crop[k.slice(3)]=v; } else if(k.indexOf('kf.')===0){ c.kf=c.kf||{on:true,s:c.scale,x:c.x,y:c.y,r:c.rot}; c.kf[k.slice(3)]=v; } else if(k.indexOf('ck.')===0){ c.ck=c.ck||{on:false,col:'#00b140',tol:35}; c.ck[k.slice(3)]=v; } else if(k.indexOf('sp.')===0) c.shp[k.slice(3)]=v; else if(k==='tr.d'){ setTr(c,(c.tr&&c.tr.t)||'none',v); } else if(k.indexOf('f.')===0) c.filt[k.slice(2)]=v; else if(k.indexOf('t.')===0) c.txt[k.slice(2)]=v; else if(k==='speed'||k==='speed2'){ var old=avgSp(c); c[k]=v; c.dur=c.dur*old/avgSp(c); } else if(k==='hp') c.hp=+v; else c[k]=v; }
pb.addEventListener('input',function(e){ var tg=e.target, c=curClip(); if(!c) return;
  if(tg.dataset.k){ var isNv=tg.classList.contains('nv'), v=tg.type==='checkbox'?tg.checked:(tg.type==='range'||tg.type==='number'?+tg.value:tg.value);
    if(isNv){ if(tg.value===''||!isFinite(v)) return; v=Math.max(+tg.min,Math.min(+tg.max,v)); var rg=tg.previousElementSibling; if(rg&&rg.type==='range') rg.value=v; }
    setProp(c,tg.dataset.k,v);
    if(tg.type==='range'){ var nvb=tg.nextElementSibling; if(nvb&&nvb.classList.contains('nv')) nvb.value=f(v); }
    if(tg.type==='range'){ clearTimeout(saveT); saveT=setTimeout(function(){ commit(true); },350); drawTlLight(); } }
  else if(tg.dataset.sp){ c.shp[tg.dataset.sp]=tg.type==='checkbox'?tg.checked:tg.value; drawTlLight(); }
  else if(tg.dataset.ck){ c.ck=c.ck||{on:false,col:'#00b140',tol:35}; c.ck[tg.dataset.ck]=tg.value; }
  else if(tg.dataset.t){ c.txt[tg.dataset.t]=tg.type==='checkbox'?tg.checked:tg.value; if(tg.dataset.t==='s'){ clearTimeout(saveT); saveT=setTimeout(function(){ commit(true); },400); drawTlLight(); } } });
function drawTlLight(){ var el=document.querySelector('.clip.sel'); var c=curClip(); if(el&&c){ el.style.left=(LBL+c.start*pxs)+'px'; el.style.width=Math.max(6,c.dur*pxs)+'px'; } }
pb.addEventListener('change',function(e){ var tg=e.target;
  if(tg.id==='arSel'){ proj.ar=tg.value; commit(); return; } if(tg.id==='bgc'){ proj.bg=tg.value; commit(); return; } if(tg.id==='monChk'){ setMonitor(tg.checked); return; }
  var cc=curClip();
  if(cc&&tg.dataset.trt){ setTr(cc,tg.value,(cc.tr&&cc.tr.d)||.6); commit(); return; }
  if(cc&&tg.dataset.rampon){ if(tg.checked) cc.speed2=cc.speed; else delete cc.speed2; commit(); return; }
  if(cc&&tg.dataset.voion){ if(tg.checked) cc.vol2=cc.vol; else delete cc.vol2; commit(); return; }
  if(cc&&tg.dataset.kfon){ cc.kf=cc.kf||{on:true,s:Math.round(cc.scale*1.2),x:cc.x,y:cc.y,r:cc.rot}; cc.kf.on=tg.checked; commit(); return; }
  if(cc&&tg.dataset.ckon){ cc.ck=cc.ck||{on:true,col:'#00b140',tol:35}; cc.ck.on=tg.checked; commit(); return; }
  if(tg.dataset.k||tg.dataset.t||tg.dataset.sp||tg.dataset.ck) commit(); });
pb.addEventListener('click',function(e){ var b=e.target.closest('button'); if(!b) return;
  if(b.dataset.emo){ var ct=curClip(); if(ct&&ct.txt){ ct.txt.s+=b.dataset.emo; commit(); } return; }
  if(b.dataset.kfp){ var ck=curClip(); if(ck){ var o=b.dataset.kfp; ck.kf={on:true,s:ck.scale,x:ck.x,y:ck.y,r:ck.rot}; if(o==='in') ck.kf.s=Math.round(ck.scale*1.25); else if(o==='out'){ ck.kf.s=Math.round(ck.scale*.8); } else if(o==='left') ck.kf.x=ck.x-12; else ck.kf.x=ck.x+12; if(o==='in'||o==='out') ck.kf.on=true; commit(); } return; }
  if(b.id==='subImp'){ $('subIn').click(); return; } if(b.id==='subSrt'){ exportSubs('srt'); return; } if(b.id==='subVtt'){ exportSubs('vtt'); return; }
  if(b.id==='subGo'){ var n=addSubs($('subTxt').value); toast(n+'개 자막을 넣었어요'); return; }
  if(b.dataset.gap){ var tr0=b.dataset.gap; if(laneLock(tr0)){ toast('잠긴 줄이에요'); return; } var L0=proj.clips.filter(function(o){ return o.track===tr0; }).sort(function(a,b){ return a.start-b.start; }), pos=0, moved=0; L0.forEach(function(o,i){ var ns=Math.max(0,i&&o.tr&&o.tr.ov?pos-o.tr.ov:pos); if(Math.abs(ns-o.start)>.001){ o.start=ns; moved++; } pos=endOf(o); }); if(moved){ commit(); toast(moved+'개 클립을 붙였어요'); } else toast('붙일 틈이 없어요'); return; }
  if(b.dataset.tsty){ var ctx0=curClip(); if(ctx0&&ctx0.txt){ Object.assign(ctx0.txt,{glow:false,sh:false,rainbow:false,blink:false,it:false,bg:false},TSTY[b.dataset.tsty]); commit(); } return; }
  if(b.dataset.norm){ var cn=curClip(), mn=cn&&media[cn.mid]; if(!mn||!mn.peaks){ toast('소리 모양을 아직 읽는 중이에요. 잠시 뒤 다시 눌러 주세요'); return; } var N=mn.peaks.length, i0=Math.floor(cn.in/mn.dur*N), i1=Math.min(N,Math.ceil((cn.in+cn.dur*cn.speed)/mn.dur*N)), pk=0; for(var qi=i0;qi<i1;qi++) pk=Math.max(pk,mn.peaks[qi]); pk/=1.6; if(pk<.01){ toast('거의 무음이라 맞출 수 없어요'); return; } cn.vol=Math.max(10,Math.min(200,Math.round(90/pk))); commit(); toast('소리 크기를 '+cn.vol+'%로 맞췄어요'); return; }
  if(b.dataset.fx){ var cf=curClip(); if(!cf) return; if(b.dataset.fx==='copy'){ fxClip=JSON.parse(JSON.stringify({filt:cf.filt,crop:cf.crop,mask:cf.mask,blend:cf.blend,flipV:cf.flipV,ck:cf.ck,op:cf.op})); toast('효과를 복사했어요'); } else if(fxClip&&cf.type!=='audio'&&cf.type!=='text'){ var o=JSON.parse(JSON.stringify(fxClip)); Object.keys(o).forEach(function(k){ if(o[k]!==undefined) cf[k]=o[k]; }); commit(); toast('효과를 붙였어요'); } else toast('먼저 다른 클립에서 효과를 복사하세요'); return; }
  if(b.dataset.pre){ var c=curClip(); if(c){ c.filt=Object.assign({},PRESETS[b.dataset.pre]); commit(); } return; }
  if(b.id==='bClear'){ if(!confirmOnce(b)) return; proj.clips=[]; proj.media.forEach(function(m){ idbDel(m.id); }); proj.media=[]; media={}; elems={}; gains={}; sel=null; t=0; commit(); } });
var fxClip=null; var cfo=0; function confirmOnce(b){ if(cfo){ cfo=0; return true; } cfo=1; b.textContent='한 번 더 누르면 지워요'; setTimeout(function(){ cfo=0; if(b.isConnected) b.textContent='모두 지우고 새로 시작'; },3000); return false; }


function setTr(c,type,d){
  var old=(c.tr&&c.tr.ov)||0;
  if(old){ proj.clips.forEach(function(o){ if(o.track===c.track&&(o===c||o.start>=c.start-.001)) o.start+=old; }); }
  c.tr={t:'none',d:d,ov:0}; if(type==='none') return;
  var prev=null; proj.clips.forEach(function(o){ if(o!==c&&o.track===c.track&&Math.abs(endOf(o)-c.start)<.06) prev=o; });
  if(!prev){ toast('앞 클립과 같은 줄에서 딱 붙어 있을 때만 쓸 수 있어요'); return; }
  var ov=Math.min(d,prev.dur,c.dur-.1); c.tr={t:type,d:ov,ov:ov};
  proj.clips.forEach(function(o){ if(o.track===c.track&&(o===c||o.start>=c.start-.001)) o.start=Math.max(0,o.start-ov); });
}
function ptime(x){ var a=String(x).split(':').map(parseFloat); return a.length===2?a[0]*60+a[1]:a[0]; }
function addSubs(txt){
  var n=0; String(txt).split('\n').forEach(function(line){ var m=line.match(/^\s*([\d:.]+)(?:\s*[-~]\s*([\d:.]+))?\s+(.+?)\s*$/); if(!m) return; var st=ptime(m[1]), en=m[2]?ptime(m[2]):st+3; if(!(st>=0)||!(en>st)) return;
    proj.clips.push({id:'c'+(proj.uid++),type:'text',track:'T',start:st,in:0,dur:en-st,speed:1,vol:0,fadeIn:0,fadeOut:0,op:100,scale:100,x:0,y:0,rot:0,flip:false,fit:'fit',filt:null,anim:'fade',txt:{s:m[3],size:7,color:'#ffffff',bg:true,bgc:'#000000',w:'700',ox:50,oy:88,stroke:true}}); n++; });
  if(n) commit(); return n;
}
function srtTime(x){ x=Math.max(0,x); var h=Math.floor(x/3600), m=Math.floor(x%3600/60), sec=Math.floor(x%60), ms=Math.round((x-Math.floor(x))*1000); if(ms>=1000){ ms=999; } function p(n,l){ return ('000'+n).slice(-l); } return p(h,2)+':'+p(m,2)+':'+p(sec,2)+'.'+p(ms,3); }
function subClips(){ return proj.clips.filter(function(c){ return c.type==='text'&&c.txt&&c.txt.s; }).sort(function(a,b){ return a.start-b.start; }); }
function exportSubs(fmt){ var L=subClips(); if(!L.length){ toast('내보낼 글자 클립이 없어요'); return; } var o=fmt==='vtt'?'WEBVTT\n\n':''; L.forEach(function(c,i){ var a=srtTime(c.start), b=srtTime(endOf(c)); if(fmt==='srt'){ a=a.replace('.',','); b=b.replace('.',','); } o+=(fmt==='srt'?(i+1)+'\n':'')+a+' --> '+b+'\n'+c.txt.s.replace(/\n\s*\n/g,'\n')+'\n\n'; }); dl((proj.name||'subtitles')+'.'+fmt,new Blob([o],{type:'text/plain;charset=utf-8'})); }
function parseSubFile(txt){ var n=0, blocks=String(txt).replace(/\r/g,'').replace(/^\uFEFF/,'').split(/\n\s*\n/); function tm(x){ var p=x.trim().replace(',','.').split(':').map(parseFloat); return p.length===3?p[0]*3600+p[1]*60+p[2]:p.length===2?p[0]*60+p[1]:p[0]; }
  blocks.forEach(function(bl){ var ls=bl.split('\n').filter(function(x){ return x.trim()!==''; }), k=-1; for(var i=0;i<ls.length;i++) if(/-->/.test(ls[i])){ k=i; break; } if(k<0) return; var m=ls[k].match(/([\d:.,]+)\s*-->\s*([\d:.,]+)/); if(!m) return; var st=tm(m[1]), en=tm(m[2]), tx=ls.slice(k+1).join('\n').replace(/<[^>]+>/g,'').replace(/\{\\[^}]*\}/g,'').trim(); if(!tx||!(st>=0)||!(en>st)) return;
    proj.clips.push({id:'c'+(proj.uid++),type:'text',track:'T',start:st,in:0,dur:en-st,speed:1,vol:0,fadeIn:0,fadeOut:0,op:100,scale:100,x:0,y:0,rot:0,flip:false,fit:'fit',filt:null,anim:'fade',txt:{s:tx,size:7,color:'#ffffff',bg:true,bgc:'#000000',w:'700',ox:50,oy:88,stroke:true}}); n++; });
  if(n) commit(); return n; }
$('subIn').addEventListener('change',function(){ var f0=this.files[0]; this.value=''; if(!f0) return; var fr=new FileReader(); fr.onload=function(){ var n=parseSubFile(fr.result); toast(n?n+'개 자막을 가져왔어요':'자막을 찾지 못했어요. SRT나 VTT 파일인지 확인하세요'); }; fr.readAsText(f0); });
$('bShape').onclick=function(){
  var c={id:'c'+(proj.uid++),type:'shape',track:'T',start:t,in:0,dur:3,speed:1,vol:0,fadeIn:0,fadeOut:0,op:100,scale:100,x:0,y:0,rot:0,flip:false,fit:'fit',filt:null,anim:'pop',shp:{k:'heart',color:'#ff6a8a',stroke:'#ffffff',sw:0,size:30,asp:100,ox:50,oy:50,fill:true}};
  proj.clips.push(c); sel=c.id; commit();
};
var rec=null;
$('bRec').onclick=function(){
  var b=$('bRec');
  if(rec){ rec.mr.stop(); return; }
  if(!navigator.mediaDevices||!window.MediaRecorder){ toast('이 브라우저는 녹음을 지원하지 않아요'); return; }
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(st){
    var chunks=[], mr=new MediaRecorder(st), t0r=Date.now(); rec={mr:mr}; b.textContent='■ 녹음 끝내기 0:00'; b.classList.add('pri');
    var iv=setInterval(function(){ b.textContent='■ 녹음 끝내기 '+tcs((Date.now()-t0r)/1000).slice(0,-2); },500);
    mr.ondataavailable=function(e){ if(e.data.size) chunks.push(e.data); };
    mr.onstop=function(){ clearInterval(iv); st.getTracks().forEach(function(x){ x.stop(); }); rec=null; b.textContent='● 녹음'; b.classList.remove('pri');
      var blob=new Blob(chunks,{type:mr.mimeType||'audio/webm'}), file=new File([blob],'녹음 '+new Date().toTimeString().slice(0,5)+'.'+(/mp4/.test(blob.type)?'m4a':'webm'),{type:blob.type});
      addFiles([file],function(mid){ addClipFromMedia(mid); }); };
    mr.start();
  }).catch(function(){ toast('마이크를 쓸 수 없어요. 브라우저에서 마이크를 허용해 주세요'); });
};

/* ---------- export ---------- */
function pickMime(pref,audioOnly){
  var L=audioOnly?['audio/mp4;codecs=mp4a.40.2','audio/webm;codecs=opus','audio/webm','audio/mp4']:['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  if(pref==='mp4'||pref==='webm') L=L.filter(function(x){ return x.indexOf(pref)>=0; }).concat(L.filter(function(x){ return x.indexOf(pref)<0; }));
  for(var i=0;i<L.length;i++){ try{ if(MediaRecorder.isTypeSupported(L[i])) return L[i]; }catch(e){} } return ''; }
$('bFrame').onclick=function(){ cv.toBlob(function(b){ dl((proj.name||'frame')+'.png',b); }); };
function dl(name,blob){ var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name.replace(/[\\/:*?"<>|]/g,'_'); document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },2000); }
/* GIF: frames are rendered one by one (not real time), 216-colour palette with ordered dithering */
function lzwGif(idx){ var out=[],cur=0,nb=0,size=9,next=258,dict=new Map();
  function put(code){ cur|=code<<nb; nb+=size; while(nb>=8){ out.push(cur&255); cur>>=8; nb-=8; } }
  put(256); var pre=idx[0];
  for(var i=1;i<idx.length;i++){ var k=idx[i], key=(pre<<8)|k, v=dict.get(key); if(v!==undefined){ pre=v; continue; } put(pre);
    if(next<4096){ dict.set(key,next++); if(next>(1<<size)) size++; } else { put(256); dict.clear(); next=258; size=9; } pre=k; }
  put(pre); put(257); if(nb>0) out.push(cur&255); return out; }
function gifBlob(frames,w,h,delay){ var o=[]; function w16(n){ o.push(n&255,(n>>8)&255); } 'GIF89a'.split('').forEach(function(ch){ o.push(ch.charCodeAt(0)); }); w16(w); w16(h); o.push(0xF7,0,0);
  for(var i=0;i<256;i++){ if(i<216){ o.push(Math.floor(i/36)*51,Math.floor(i/6)%6*51,i%6*51); } else o.push(0,0,0); }
  o.push(0x21,0xFF,0x0B); 'NETSCAPE2.0'.split('').forEach(function(ch){ o.push(ch.charCodeAt(0)); }); o.push(3,1,0,0,0);
  var parts=[new Uint8Array(o)];
  frames.forEach(function(fr){ var d=lzwGif(fr), q=[0x21,0xF9,4,0,delay&255,(delay>>8)&255,0,0,0x2C,0,0,0,0,w&255,w>>8,h&255,h>>8,0,8]; for(var p=0;p<d.length;p+=255){ var n=Math.min(255,d.length-p); q.push(n); for(var j=0;j<n;j++) q.push(d[p+j]); } q.push(0); parts.push(new Uint8Array(q)); });
  parts.push(new Uint8Array([0x3B])); return new Blob(parts,{type:'image/gif'}); }
var BAY=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
function quant(px,w,h){ var r=new Uint8Array(w*h); for(var y=0,p=0;y<h;y++) for(var x=0;x<w;x++,p++){ var b=(BAY[(y&3)*4+(x&3)]-7.5)*3.2, q=p*4; function c6(v){ v=Math.round((v+b)/51); return v<0?0:v>5?5:v; } r[p]=c6(px[q])*36+c6(px[q+1])*6+c6(px[q+2]); } return r; }
function waitSeeks(){ var ps=[]; Object.keys(elems).forEach(function(id){ var el=elems[id]; if(el.seeking) ps.push(new Promise(function(res){ var d=false; function f1(){ if(!d){ d=true; res(); } } el.addEventListener('seeked',f1,{once:true}); setTimeout(f1,700); })); }); return Promise.all(ps); }
function startGif(){
  var w=+$('exGw').value, fps=+$('exGf').value, a=AR[proj.ar], h=Math.round(w*a[1]/a[0]), tot=total();
  if(tot>60){ toast('GIF는 60초까지만 만들 수 있어요'); return; }
  pause(); var ex=exporting={gif:true,canceled:false}; cv.width=w; cv.height=h; var frames=[], n=Math.max(1,Math.ceil(tot*fps)), i=0;
  $('exGo').disabled=true; $('exCancel').textContent='중단'; $('exMsg').textContent='그림을 만드는 중…';
  function end(){ exporting=null; sizeCanvas(); $('exGo').disabled=false; $('exCancel').textContent='닫기'; }
  function step(){ if(ex.canceled){ end(); return; }
    var tt=Math.min(i/fps,Math.max(0,tot-.001)); t=tt; syncMedia(tt,false);
    waitSeeks().then(function(){ render(tt); var im=g.getImageData(0,0,w,h); frames.push(quant(im.data,w,h)); i++; $('exBar').style.width=Math.min(99,i/n*100)+'%'; $('exMsg').textContent=i+' / '+n+' 장';
      if(i<n) setTimeout(step,0); else { var blob=gifBlob(frames,w,h,Math.round(100/fps)); end(); dl((proj.name||'video')+'.gif',blob); $('exBar').style.width='100%'; $('exMsg').textContent='완성! gif 파일을 받았어요 ('+(blob.size/1048576).toFixed(1)+'MB)'; $('exGo').textContent='다시 만들기'; seek(0); } }); }
  step();
}
function exOpt(id,label,opts){ return '<div class="row"><label>'+label+'</label><select id="'+id+'">'+opts.map(function(o){ return '<option value="'+o[0]+'"'+(o[2]?' selected':'')+'>'+o[1]+'</option>'; }).join('')+'</select></div>'; }
$('bExp').onclick=function(){
  if(!total()){ toast('타임라인에 클립을 먼저 올려 주세요'); return; } if(!window.MediaRecorder||!cv.captureStream){ toast('이 브라우저는 영상 녹화를 지원하지 않아요. 크롬이나 엣지를 써 주세요'); return; }
  var box=$('expbox'); box.hidden=false; var a=AR[proj.ar], mp4=false, webm=false; try{ mp4=MediaRecorder.isTypeSupported('video/mp4'); webm=MediaRecorder.isTypeSupported('video/webm'); }catch(e){}
  box.innerHTML='<div><h3 style="margin:0 0 8px">영상 만들기</h3>'+exOpt('exMode','무엇을',[['v','영상 (화면 + 소리)',1],['a','소리만'],['g','움직이는 그림 (GIF, 소리 없음)']])+exOpt('exQ','크기',[['0.5','낮게 ('+Math.round(a[0]*.5)+'×'+Math.round(a[1]*.5)+')'],['1','보통 ('+a[0]+'×'+a[1]+')',1],['1.5','높게 ('+Math.round(a[0]*1.5)+'×'+Math.round(a[1]*1.5)+')']])
    +'<div id="exGopt" hidden>'+exOpt('exGw','가로 크기',[['320','320'],['480','480',1],['640','640']])+exOpt('exGf','초당 장수',[['8','8'],['12','12',1],['15','15']])+'</div><div id="exVopt">'+exOpt('exFps','프레임',[['24','24'],['30','30',1],['60','60']])+exOpt('exBr','화질(비트레이트)',[['0.4','낮음 (용량 작게)'],['1','보통',1],['2','높음 (용량 크게)']])+'</div>'
    +exOpt('exFmt','파일 형식',[['auto','알아서'+(mp4?'':'')+'',1]].concat(mp4?[['mp4','mp4 (어디서나 재생)']]:[]).concat(webm?[['webm','webm']]:[]))
    +'<div class="note" id="exInfo"></div><div class="note">처음부터 끝까지 한 번 재생하면서 녹화해요. 길이 '+tcs(total())+' 만큼 걸리고, 그동안 이 탭을 다른 창에 가리지 말고 켜 두세요.</div><div class="bar"><i id="exBar"></i></div><div class="note" id="exMsg"></div><div class="btns"><button class="tbtn pri" id="exGo">시작</button><button class="tbtn" id="exCancel">닫기</button></div></div>';
  function upd(){ var md=$('exMode').value, ao=md==='a', gf=md==='g'; $('exVopt').hidden=ao||gf; $('exGopt').hidden=!gf; $('exQ').parentNode.hidden=ao||gf; $('exFmt').parentNode.hidden=gf; var fm=$('exFmt').value, mm=pickMime(fm,ao); if(gf){ $('exInfo').textContent='GIF는 용량이 커요. 짧은 영상에 알맞아요.'; return; } $('exInfo').textContent='파일 종류: '+(mm?mm.split(';')[0].replace('video/','').replace('audio/',''):'알 수 없음')+(ao?' (소리 파일)':''); }
  $('exMode').onchange=upd; $('exFmt').onchange=upd; upd();
  $('exCancel').onclick=function(){ if(exporting){ abortExport(); $('exMsg').textContent='멈췄어요'; $('exGo').disabled=false; $('exGo').textContent='시작'; $('exCancel').textContent='닫기'; $('exBar').style.width='0'; return; } box.hidden=true; };
  $('exGo').onclick=startExport;
};
function startExport(){
  if($('exMode').value==='g'){ startGif(); return; }
  pause(); ensureAudio(); var ao=$('exMode').value==='a', q=ao?1:+$('exQ').value, a=AR[proj.ar], prevMon=monitor, fps=+$('exFps').value||30, brm=+$('exBr').value||1; setMonitor(false);
  var mime=pickMime($('exFmt').value,ao), chunks=[], as=streamDest.stream.getAudioTracks(), ms, rec;
  if(!ao){ cv.width=Math.round(a[0]*q); cv.height=Math.round(a[1]*q); var vs=cv.captureStream(fps); ms=new MediaStream(vs.getVideoTracks().concat(as)); } else ms=new MediaStream(as);
  var opt={}; if(mime) opt.mimeType=mime; if(!ao) opt.videoBitsPerSecond=Math.round(5000000*q*q*brm*(fps/30)); else opt.audioBitsPerSecond=192000;
  try{ rec=new MediaRecorder(ms,opt); }catch(e){ setMonitor(prevMon); sizeCanvas(); toast('녹화를 시작하지 못했어요'); return; }
  rec.ondataavailable=function(e){ if(e.data&&e.data.size) chunks.push(e.data); };
  exporting={rec:rec,chunks:chunks,mime:rec.mimeType||mime||(ao?'audio/webm':'video/webm'),prevMon:prevMon,q:q,canceled:false,ao:ao};
  rec.onstop=function(){ var ex=exporting; exporting=null; sizeCanvas(); setMonitor(ex.prevMon); $('exGo').disabled=false; $('exCancel').textContent='닫기'; if(ex.canceled){ return; } var blob=new Blob(ex.chunks,{type:ex.mime}), ext=ex.ao?(/mp4/.test(ex.mime)?'m4a':'webm'):(/mp4/.test(ex.mime)?'mp4':'webm'); dl((proj.name||'video')+'.'+ext,blob); $('exMsg').textContent='완성! '+ext+' 파일을 받았어요 ('+(blob.size/1048576).toFixed(1)+'MB)'; $('exBar').style.width='100%'; $('exGo').textContent='다시 만들기'; };
  $('exGo').disabled=true; $('exCancel').textContent='중단'; $('exMsg').textContent='녹화 중…'; rec.start(500); t=0; syncMedia(0,false);
  setTimeout(function(){ play(); },300);
  var tot=total(), iv=setInterval(function(){ if(!exporting){ clearInterval(iv); return; } $('exBar').style.width=Math.min(99,t/tot*100)+'%'; $('exMsg').textContent='녹화 중… '+tcs(t)+' / '+tcs(tot); },200);
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
  restoreMedia().then(function(){ Object.keys(media).forEach(function(k){ ensurePeaks(media[k]); }); drawTl(); drawBin(); requestAnimationFrame(loop); });
  window.FVIDEO={proj:proj,media:media,addFiles:addFiles,addClipFromMedia:addClipFromMedia,render:render,seek:seek,split:split,wantAt:wantAt,lzwGif:lzwGif,volAt:volAt,zoomTo:zoomTo,pxsNow:function(){ return pxs; },duckK:duckK,parseSubFile:parseSubFile,exportSubs:exportSubs,get t(){ return t; }};
})();
})();
