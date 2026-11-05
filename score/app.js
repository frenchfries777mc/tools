/* Fry Score: write sheet music, play it, export MIDI / PNG / SVG. Time unit: 64 per whole note (quarter = 16). */
(function(){
'use strict';
var NS='http://www.w3.org/2000/svg', KEY='ffscore.v1';
var $=function(id){ return document.getElementById(id); };
var sheet=$('sheet'), desk=$('desk');
var STEPS='CDEFGAB', SEMI=[0,2,4,5,7,9,11];
var INSTS=[['piano','피아노',0],['flute','플루트',73],['strings','현악기',48],['organ','오르간',19],['guitar','기타(뜯기)',24],['box','오르골',10],['chip','8비트',80],['bass','베이스',33]];
var KEYS=[['C 장조 / a 단조',0],['G 장조 (♯1)',1],['D 장조 (♯2)',2],['A 장조 (♯3)',3],['E 장조 (♯4)',4],['B 장조 (♯5)',5],['F♯ 장조 (♯6)',6],['F 장조 (♭1)',-1],['B♭ 장조 (♭2)',-2],['E♭ 장조 (♭3)',-3],['A♭ 장조 (♭4)',-4],['D♭ 장조 (♭5)',-5],['G♭ 장조 (♭6)',-6]];
var score={mk:{},name:'이름 없는 악보',composer:'',tempo:100,ts:[4,4],key:0,parts:[{name:'멜로디',clef:'treble',inst:'piano',vol:80,mute:false,ev:[]}]};
var cur={part:0,idx:-1}, ui={dur:16,dot:false,rest:false,acc:null,chord:false,tool:'in'}, zoom=1, hist=[], hi=-1, L=null;
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function f(n){ return +(+n).toFixed(2); }
function toast(t){ var d=document.createElement('div'); d.className='toast'; d.textContent=t; document.body.appendChild(d); setTimeout(function(){ d.remove(); },2600); }
function ml(){ return score.ts[0]*64/score.ts[1]; }
function midi(p){ return SEMI[p.s]+p.a+12*(p.o+1); }
function freq(m){ return 440*Math.pow(2,(m-69)/12); }
function pname(p){ return STEPS[p.s]+(p.a>0?'♯':p.a<0?'♭':'')+p.o; }
var SHARP_ORDER=[3,0,4,1,5,2,6], FLAT_ORDER=[6,2,5,1,4,0,3];
function keyAlter(step){ var k=score.key; if(k>0) return SHARP_ORDER.indexOf(step)<k?1:0; if(k<0) return FLAT_ORDER.indexOf(step)<-k?-1:0; return 0; }
function total(part){ var t=0; part.ev.forEach(function(e){ t+=e.d; }); return t; }

/* ---------- text notation ---------- */
function parseText(txt,clef){
  var out=[], lastO=clef==='bass'?3:4, lastD=16;
  txt.replace(/[|\n]/g,' ').split(/\s+/).forEach(function(tok){
    if(!tok) return; var tie=false; if(/~$/.test(tok)){ tie=true; tok=tok.slice(0,-1); }
    var m=tok.match(/^([^/.]*)(?:\/(\d+))?(\.?)$/); if(!m) return;
    var d=lastD; if(m[2]){ var n=+m[2]; d=n>0&&64%n===0?64/n:lastD; if(m[3]) d=d*3/2; lastD=m[3]?d*2/3:d; } else if(m[3]) d=lastD*3/2;
    if(m[2]&&!m[3]) lastD=d;
    var ps=[];
    if(!/^[Rr]$/.test(m[1])){ m[1].split('+').forEach(function(x){ var q=x.match(/^([A-Ga-g])([#b]?)(\d?)$/); if(!q) return; var s=STEPS.indexOf(q[1].toUpperCase()), o=q[3]===''?lastO:+q[3]; lastO=o; ps.push({s:s,a:q[2]==='#'?1:q[2]==='b'?-1:0,o:o}); }); if(!ps.length) return; }
    out.push({p:ps,d:Math.round(d),tie:tie});
  });
  return out;
}
function toText(part){
  return part.ev.map(function(e){ var s=e.p.length?e.p.map(function(p){ return STEPS[p.s]+(p.a>0?'#':p.a<0?'b':'')+p.o; }).join('+'):'R';
    var d=e.d, dot=false, base=d; [64,32,16,8,4].forEach(function(b){ if(d===b*3/2){ dot=true; base=b; } }); return s+'/'+(64/base)+(dot?'.':'')+(e.tie?'~':''); }).join(' ');
}

/* ---------- layout ---------- */
var STD=[64,48,32,24,16,12,8,4];
function decompose(n){ var r=[]; STD.forEach(function(b){ while(n>=b){ r.push(b); n-=b; } }); if(n>0) r.push(4); return r; }
function buildPieces(part){
  var M=ml(), t=0, meas=[], idx=0;
  function get(m){ while(meas.length<=m) meas.push([]); return meas[m]; }
  part.ev.forEach(function(e,i){
    var left=e.d, first=true;
    while(left>0){ var m=Math.floor(t/M), off=t-m*M, room=M-off, take=Math.min(left,room);
      var ds=decompose(take);
      ds.forEach(function(d,k){ var last=left-take===0&&k===ds.length-1; get(m).push({ev:i,p:e.p,d:d,t:off,tieNext:!last||(e.tie&&e.p.length>0),first:first}); first=false; off+=d; });
      t+=take; left-=take; }
  });
  return meas;
}
var PAD_L=22, STAFF=40, PART_H=112, TOP=70, SYS_GAP=26, W=1000, MARG=40;
function layout(){
  var M=ml(), tot=0; score.parts.forEach(function(p){ tot=Math.max(tot,total(p)); });
  var nM=Math.max(4,Math.floor(tot/M)+1), pcs=score.parts.map(buildPieces), ms=[];
  for(var m=0;m<nM;m++){
    var ts={0:1}; pcs.forEach(function(pc){ (pc[m]||[]).forEach(function(c){ ts[c.t]=1; }); });
    var tl=Object.keys(ts).map(Number).sort(function(a,b){ return a-b; }), slots=[], x=0;
    tl.forEach(function(t,i){ var gap=(i+1<tl.length?tl[i+1]:M)-t, w=Math.max(30,14+gap*1.9); slots.push({t:t,x:x,w:w}); x+=w; });
    ms.push({i:m,slots:slots,w:x+16,tl:tl});
  }
  var keyW=Math.abs(score.key)*10, sys=[], row=[], rw=0, first=true;
  function head(){ return (first?64:48)+keyW+(first?30:0); }
  var avail0=W-2*MARG;
  for(var i=0;i<ms.length;i++){
    var need=ms[i].w, hw=head();
    if(row.length&&rw+need+hw>avail0){ sys.push({ms:row,first:first,hw:hw,rw:rw}); row=[]; rw=0; first=false; hw=head(); }
    row.push(ms[i]); rw+=need;
  }
  if(row.length) sys.push({ms:row,first:first,hw:head(),rw:rw});
  var y=TOP+(score.composer||score.name?30:0), np=score.parts.length;
  sys.forEach(function(s,si){
    s.y=y; var inner=avail0-s.hw, k=inner/s.rw; if(si===sys.length-1&&k>1.3) k=1.3;
    var x=MARG+s.hw; s.x0=MARG; s.k=k;
    s.ms.forEach(function(m){ m.sys=si; m.x=x; m.W=m.w*k; m.slots.forEach(function(sl){ sl.ax=x+(sl.x+14)*k; }); x+=m.W; });
    s.x1=x; y+=np*PART_H+SYS_GAP;
  });
  L={sys:sys,ms:ms,pcs:pcs,H:y+10,tot:tot};
  return L;
}
function slotX(m,t){ var sl=m.slots; for(var i=0;i<sl.length;i++) if(sl[i].t===t) return sl[i].ax; var best=sl[0]; sl.forEach(function(s){ if(s.t<=t) best=s; }); return best.ax; }
function timeX(T){ var M=ml(), mi=Math.min(L.ms.length-1,Math.floor(T/M)), m=L.ms[mi], off=T-mi*M, sl=m.slots, a=sl[0],b=null;
  for(var i=0;i<sl.length;i++){ if(sl[i].t<=off) a=sl[i]; }
  var ai=sl.indexOf(a), nxtT=ai+1<sl.length?sl[ai+1].t:M, nxtX=ai+1<sl.length?sl[ai+1].ax:m.x+m.W-6;
  var fr=(off-a.t)/Math.max(1,(nxtT-a.t)); return {sys:m.sys,x:a.ax+(nxtX-a.ax)*fr}; }

/* ---------- drawing ---------- */
function ypos(part,s,o){ var n=o*7+s, nb=part.clef==='bass'?18:30; return n-nb; } // steps above bottom line
function staffY(si,pi){ return L.sys[si].y+pi*PART_H+30; } // top line y
function noteY(top,part,pos){ return top+STAFF-pos*5; }
var ACC_G={'-1':'♭','0':'♮','1':'♯'};
function draw(){
  layout();
  var h=L.H+10; sheet.setAttribute('viewBox','0 0 '+W+' '+h); sheet.style.width=f(W*zoom)+'px'; sheet.style.height=f(h*zoom)+'px';
  var o='<rect width="'+W+'" height="'+h+'" fill="#fff"/>';
  o+='<text x="'+W/2+'" y="40" text-anchor="middle" font-size="26" font-weight="700" fill="#111" font-family="Noto Sans KR,sans-serif">'+esc(score.name)+'</text>';
  if(score.composer) o+='<text x="'+(W-MARG)+'" y="62" text-anchor="end" font-size="13" fill="#444" font-family="Noto Sans KR,sans-serif">'+esc(score.composer)+'</text>';
  o+='<text x="'+MARG+'" y="62" font-size="12" fill="#444" font-family="Noto Sans KR,sans-serif">♩ = '+score.tempo+'</text>';
  var np=score.parts.length, hit='';
  L.sys.forEach(function(s,si){
    var topAll=staffY(si,0), botAll=staffY(si,np-1)+STAFF;
    score.parts.forEach(function(part,pi){
      var top=staffY(si,pi), xs=s.x0+(s.first?0:0), xe=s.x1;
      for(var l=0;l<5;l++) o+='<line x1="'+s.x0+'" y1="'+(top+l*10)+'" x2="'+xe+'" y2="'+(top+l*10)+'" stroke="#222" stroke-width="1"/>';
      if(pi===cur.part) o+='<rect x="'+(s.x0-6)+'" y="'+(top-8)+'" width="4" height="'+(STAFF+16)+'" fill="#2ec4b6" opacity=".7"/>';
      var x=s.x0+8; o+=clefSvg(part.clef,x+10,top); x+=34;
      // key
      var posS=part.clef==='bass'?[6,3,7,4,1,5,2]:[8,5,9,6,3,7,4], posFl=part.clef==='bass'?[4,7,3,6,2,5,1]:[4,7,3,6,2,5,1];
      for(var k=0;k<Math.abs(score.key);k++){ var pp=score.key>0?posS[k]:posFl[k];
        o+='<text x="'+(x+k*10)+'" y="'+(top+STAFF-pp*5+5)+'" font-size="17" fill="#111">'+(score.key>0?'♯':'♭')+'</text>'; }
      x+=Math.abs(score.key)*10+4;
      if(s.first){ o+='<text x="'+(x+4)+'" y="'+(top+17)+'" text-anchor="middle" font-size="22" font-weight="700" fill="#111" font-family="Oswald,sans-serif">'+score.ts[0]+'</text><text x="'+(x+4)+'" y="'+(top+37)+'" text-anchor="middle" font-size="22" font-weight="700" fill="#111" font-family="Oswald,sans-serif">'+score.ts[1]+'</text>'; }
      s.ms.forEach(function(m){
        var pc=L.pcs[pi][m.i]||[], accSeen={};
        var mm=(score.mk||{})[m.i]||{}, xr=m.x+m.W;
        if(mm.re){ o+='<line x1="'+xr+'" y1="'+top+'" x2="'+xr+'" y2="'+(top+STAFF)+'" stroke="#222" stroke-width="3"/><line x1="'+(xr-5)+'" y1="'+top+'" x2="'+(xr-5)+'" y2="'+(top+STAFF)+'" stroke="#222" stroke-width="1"/><circle cx="'+(xr-11)+'" cy="'+(top+15)+'" r="2" fill="#222"/><circle cx="'+(xr-11)+'" cy="'+(top+25)+'" r="2" fill="#222"/>'; }
        else o+='<line x1="'+xr+'" y1="'+top+'" x2="'+xr+'" y2="'+(top+STAFF)+'" stroke="#222" stroke-width="'+(m.i===L.ms.length-1?2.2:1)+'"/>';
        if(mm.rs){ o+='<line x1="'+(m.x+1)+'" y1="'+top+'" x2="'+(m.x+1)+'" y2="'+(top+STAFF)+'" stroke="#222" stroke-width="3"/><line x1="'+(m.x+6)+'" y1="'+top+'" x2="'+(m.x+6)+'" y2="'+(top+STAFF)+'" stroke="#222" stroke-width="1"/><circle cx="'+(m.x+12)+'" cy="'+(top+15)+'" r="2" fill="#222"/><circle cx="'+(m.x+12)+'" cy="'+(top+25)+'" r="2" fill="#222"/>'; }
        if(pi===0&&mm.tempo) o+='<text x="'+(m.x+6)+'" y="'+(top-10)+'" font-size="12" font-weight="700" fill="#111" font-family="Noto Sans KR,sans-serif">♩='+mm.tempo+'</text>';
        if(pi===0&&mm.volta) o+='<path d="M'+(m.x+3)+' '+(top-8)+'V'+(top-22)+'H'+(m.x+m.W-3)+'" fill="none" stroke="#222"/><text x="'+(m.x+7)+'" y="'+(top-11)+'" font-size="11" fill="#111" font-family="Noto Sans KR,sans-serif">'+mm.volta+'.</text>';
        if(pi===cur.part&&cur.m===m.i) o+='<rect x="'+m.x+'" y="'+(top-4)+'" width="'+m.W+'" height="'+(STAFF+8)+'" fill="#2ec4b6" opacity=".07" pointer-events="none"/>';
        if(pc.length===0) o+=restSvg(64,m.x+m.W/2,top,false);
        o+=piecesSvg(part,pi,m,pc,top,accSeen);
        // click area per measure
        hit+='<rect x="'+m.x+'" y="'+(top-22)+'" width="'+m.W+'" height="'+(STAFF+44)+'" fill="transparent" data-m="'+m.i+'" data-p="'+pi+'"/>';
      });
    });
    if(np>1){ o+='<line x1="'+s.x0+'" y1="'+topAll+'" x2="'+s.x0+'" y2="'+botAll+'" stroke="#222" stroke-width="2"/>'; o+='<path d="M'+(s.x0-5)+' '+topAll+'q-8 0 -8 8v'+(botAll-topAll-16)+'q0 8 8 8" fill="none" stroke="#222" stroke-width="2.4"/>'; }
  });
  sheet.innerHTML=o+'<g id="hits">'+hit+'</g><line id="pcur" x1="0" y1="0" x2="0" y2="0" stroke="#e8453c" stroke-width="2" opacity="0"/>';
  $('zl').textContent=Math.round(zoom*100)+'%';
  $('bUndo').disabled=hi<=0; $('bRedo').disabled=hi>=hist.length-1;
}
function clefSvg(clef,x,top){
  // origin on the clef's own line: G line (treble) or F line (bass), 10px staff spacing
  if(clef==='bass') return '<g transform="translate('+x+' '+(top+10)+')"><path fill="#111" d="M-6 -4.6C2 -8 14 -4.5 14 6C14 18 3 27 -12 33L-12.6 31.4C-1 25 6 16 6 6C6 -1 2 -3 -1.5 -1.2A4.3 4.3 0 1 1 -6 -4.6Z"/><circle cx="17" cy="-5" r="1.9" fill="#111"/><circle cx="17" cy="5" r="1.9" fill="#111"/></g>';
  return '<g transform="translate('+x+' '+(top+30)+')" fill="none" stroke="#111" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 25.5C3.5 30 -3 31 -4.5 27C-5.5 24 -2 22 0 23.5C1.2 24.5 1 26 0 26.2M0 23.6C1.6 12 -0.6 -2 -1.4 -12C-2 -22 -1.6 -31 3 -38.5C7.5 -32 6.5 -24 0.5 -15C-4 -8.5 -9.5 -4 -8.5 2.5C-7.6 8.5 -2.6 11.6 2.6 11.2C8.6 10.7 11.4 5.8 10 1C8.6 -3.6 3.6 -5.6 0 -4.2C-3 -3 -3.6 1.6 -0.8 3C1.2 4 3.2 2.4 2.8 0.6"/></g>';
}
function restSvg(d,x,top,sel){
  var c=sel?'#e8453c':'#111', y=top;
  if(d>=64) return '<rect x="'+(x-6)+'" y="'+(y+10)+'" width="12" height="5" fill="'+c+'"/>';
  if(d>=32) return '<rect x="'+(x-6)+'" y="'+(y+15)+'" width="12" height="5" fill="'+c+'"/>';
  if(d>=16) return '<path d="M'+(x-2)+' '+(y+8)+' L'+(x+3)+' '+(y+15)+' L'+(x-3)+' '+(y+22)+' L'+(x+3)+' '+(y+29)+' C'+(x-4)+' '+(y+27)+' '+(x-5)+' '+(y+33)+' '+(x+1)+' '+(y+34)+'" fill="none" stroke="'+c+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
  var n=d>=8?1:2, o='';
  for(var i=0;i<n;i++){ var yy=y+16+i*8; o+='<circle cx="'+(x-2+i*-1.5)+'" cy="'+(yy)+'" r="2.4" fill="'+c+'"/><path d="M'+(x-2-i*1.5)+' '+yy+' Q'+(x+3-i*1.5)+' '+(yy)+' '+(x+4-i*1.5)+' '+(yy-4)+' L'+(x-3-n*2+i*-1)+' '+(y+34)+'" fill="none" stroke="'+c+'" stroke-width="1.8"/>'; }
  return o;
}
function headSvg(x,y,d,c){ var open=d>=32;
  return '<ellipse cx="'+f(x)+'" cy="'+f(y)+'" rx="6" ry="4.3" transform="rotate(-22 '+f(x)+' '+f(y)+')" fill="'+(open?'#fff':c)+'" stroke="'+c+'" stroke-width="'+(open?1.8:1)+'"/>'+(d>=64?'<ellipse cx="'+f(x)+'" cy="'+f(y)+'" rx="2.2" ry="4.6" transform="rotate(-8 '+f(x)+' '+f(y)+')" fill="'+c+'" opacity="0"/>':'');
}
function dotted(d){ return d===48||d===24||d===12||d===6; }
function baseDur(d){ return dotted(d)?d*2/3:d; }

var DYN_F={pp:.35,p:.5,mp:.65,mf:.8,f:.95,ff:1.1};
function dynF(d){ return d&&DYN_F[d]?DYN_F[d]/.8:1; }
function decoSvg(part,m,c,it,top,items,minP,maxP){
  var ev=part.ev[c.ev]; if(!ev) return ''; var o='', x=it.x, col=it.sel?'#e8453c':'#111', F='font-family="Noto Sans KR,sans-serif"';
  if(ev.ch) o+='<text x="'+x+'" y="'+(top-14)+'" text-anchor="middle" font-size="13" font-weight="700" fill="#111" '+F+'>'+esc(ev.ch)+'</text>';
  if(ev.dyn) o+='<text x="'+x+'" y="'+(top+STAFF+28)+'" text-anchor="middle" font-size="16" font-weight="700" font-style="italic" fill="#111" font-family="Georgia,serif">'+esc(ev.dyn)+'</text>';
  if(ev.ly) o+='<text x="'+x+'" y="'+(top+STAFF+(ev.dyn?45:33))+'" text-anchor="middle" font-size="13" fill="#222" '+F+'>'+esc(ev.ly)+'</text>';
  var ay=it.up?noteY(top,part,minP)+10:noteY(top,part,maxP)-10;
  if(ev.art==='stac') o+='<circle cx="'+x+'" cy="'+ay+'" r="2" fill="'+col+'"/>';
  else if(ev.art==='acc') o+='<path d="M'+(x-5)+' '+(ay-3.5)+'L'+(x+5)+' '+ay+'L'+(x-5)+' '+(ay+3.5)+'" fill="none" stroke="'+col+'" stroke-width="1.8"/>';
  else if(ev.art==='ten') o+='<line x1="'+(x-5)+'" y1="'+ay+'" x2="'+(x+5)+'" y2="'+ay+'" stroke="'+col+'" stroke-width="2"/>';
  else if(ev.art==='ferm') o+='<path d="M'+(x-9)+' '+(top-4)+'Q'+x+' '+(top-17)+' '+(x+9)+' '+(top-4)+'" fill="none" stroke="'+col+'" stroke-width="1.8"/><circle cx="'+x+'" cy="'+(top-6)+'" r="1.8" fill="'+col+'"/>';
  if(ev.slur){ var idx=items.indexOf(it), nx=null; for(var k=idx+1;k<items.length;k++) if(items[k].c.p.length){ nx=items[k]; break; }
    var sg=it.up?1:-1, y1=sg>0?noteY(top,part,minP)+11:noteY(top,part,maxP)-11, x2=nx?nx.x:(m.x+m.W-8), y2=y1;
    if(nx){ var np=nx.poss; y2=sg>0?noteY(top,part,Math.min.apply(0,np))+11:noteY(top,part,Math.max.apply(0,np))-11; }
    o+='<path d="M'+(x+2)+' '+y1+' Q'+((x+x2)/2)+' '+(Math.max(y1,y2)+sg*12)+' '+(x2-2)+' '+y2+'" fill="none" stroke="'+col+'" stroke-width="1.7"/>'; }
  return o;
}
function piecesSvg(part,pi,m,pc,top,accSeen){
  var o='', M=ml(), beat=(score.ts[1]===8&&score.ts[0]%3===0)?24:64/score.ts[1];
  var mid=part.clef==='bass'?18+4:30+4; // B3 / D3 middle line (steps)
  var items=pc.map(function(c){
    var x=slotX(m,c.t), sel=inSel(pi,c.ev);
    var poss=c.p.map(function(p){ return ypos(part,p.s,p.o); }), avg=poss.length?(Math.min.apply(0,poss)+Math.max.apply(0,poss))/2:0;
    return {c:c,x:x,sel:sel,poss:poss,up:poss.length?(avg<mid):true,bd:baseDur(c.d)};
  });
  // beams
  var groups=[], gcur=null;
  items.forEach(function(it,i){ var ok=it.c.p.length&&it.bd<=8; if(ok){ if(gcur&&Math.floor(gcur[gcur.length-1].c.t/beat)===Math.floor(it.c.t/beat)) gcur.push(it); else{ gcur=[it]; groups.push(gcur); } } else gcur=null; });
  var inBeam={}; groups.forEach(function(g){ if(g.length>1){ var ups=g.filter(function(x){ return x.up; }).length>g.length/2; g.forEach(function(x){ x.up=ups; x.beam=g; }); } });
  items.forEach(function(it){
    var c=it.c, col=it.sel?'#e8453c':'#111', x=it.x;
    if(!c.p.length){ o+=restSvg(it.bd,x,top,it.sel); return; }
    var minP=Math.min.apply(0,it.poss), maxP=Math.max.apply(0,it.poss);
    if(c.first) o+=decoSvg(part,m,c,it,top,items,minP,maxP);
    // ledger lines
    for(var p=-1;p>=minP;p--) o+='<line x1="'+(x-10)+'" y1="'+noteY(top,part,p)*1+'" x2="'+(x+10)+'" y2="'+noteY(top,part,p)+'" stroke="#222"/>';
    for(var p2=9;p2<=maxP;p2++) o+='<line x1="'+(x-10)+'" y1="'+noteY(top,part,p2)+'" x2="'+(x+10)+'" y2="'+noteY(top,part,p2)+'" stroke="#222"/>';
    var shiftNext=false, order=c.p.map(function(p,i){ return i; }).sort(function(a,b){ return it.poss[a]-it.poss[b]; });
    var lastPos=-99, lastShift=false, dx={};
    order.forEach(function(i){ var ps=it.poss[i]; if(ps-lastPos===1&&!lastShift){ dx[i]=it.up?11:-11; lastShift=true; } else { dx[i]=0; lastShift=false; } lastPos=ps; });
    c.p.forEach(function(p,i){
      var y=noteY(top,part,it.poss[i]), hx=x+dx[i];
      o+=headSvg(hx,y,baseDur(c.d)>=64?64:(baseDur(c.d)>=32?32:16),col);
      // accidental
      var key=p.s+'_'+p.o, want=p.a, have=accSeen[key]!=null?accSeen[key]:keyAlter(p.s);
      if(c.first&&want!==have){ o+='<text x="'+(x-17+Math.min(0,dx[i]))+'" y="'+(y+5)+'" font-size="16" fill="'+col+'" text-anchor="middle">'+ACC_G[want]+'</text>'; accSeen[key]=want; } else if(c.first) accSeen[key]=want;
      if(dotted(c.d)) o+='<circle cx="'+(hx+11)+'" cy="'+(y+((it.poss[i]%2===0)?-4:0))+'" r="1.8" fill="'+col+'"/>';
    });
    if(it.bd<64){
      var edge=it.up?maxP:minP, nearP=it.up?minP:maxP, sx=x+(it.up?5.6:-5.6), y0=noteY(top,part,nearP), y1;
      if(it.beam){ it.sx=sx; it.y0=y0; return; }
      y1=noteY(top,part,edge)+(it.up?-32:32); if(it.up&&y1>top+14) y1=top+14; if(!it.up&&y1<top+26) y1=top+26;
      o+='<line x1="'+sx+'" y1="'+y0+'" x2="'+sx+'" y2="'+y1+'" stroke="'+col+'" stroke-width="1.4"/>';
      if(it.bd<=8){ var dir=it.up?1:-1; o+='<path d="M'+sx+' '+y1+' c'+(10)+' '+(dir*8)+' '+(8)+' '+(dir*18)+' '+(2)+' '+(dir*24)+(it.bd<=4?' M'+sx+' '+(y1+dir*7)+' c10 '+(dir*8)+' 8 '+(dir*18)+' 2 '+(dir*24):'')+'" fill="none" stroke="'+col+'" stroke-width="1.8"/>'; }
    }
    if(c.tieNext){ var pn=it.poss[it.up?0:it.poss.length-1], ty=noteY(top,part,pn)+(it.up?9:-9), nx=x+34; o+='<path d="M'+(x+3)+' '+ty+' Q'+(x+18)+' '+(ty+(it.up?9:-9))+' '+nx+' '+ty+'" fill="none" stroke="'+col+'" stroke-width="1.6"/>'; }
  });
  groups.forEach(function(g){ if(g.length<2) return; var up=g[0].up, ys=g.map(function(it){ var minP=Math.min.apply(0,it.poss), maxP=Math.max.apply(0,it.poss); return noteY(top,part,up?maxP:minP)+(up?-32:32); });
    var by=up?Math.min.apply(0,ys):Math.max.apply(0,ys); if(up&&by>top+10) by=top+10; if(!up&&by<top+30) by=top+30;
    g.forEach(function(it){ var near=noteY(top,part,up?Math.min.apply(0,it.poss):Math.max.apply(0,it.poss)); var sx=it.x+(up?5.6:-5.6); o+='<line x1="'+sx+'" y1="'+near+'" x2="'+sx+'" y2="'+by+'" stroke="'+(it.sel?'#e8453c':'#111')+'" stroke-width="1.4"/>'; });
    var x0=g[0].x+(up?5.6:-5.6), x1=g[g.length-1].x+(up?5.6:-5.6), t=4, dy=up?0:-t;
    o+='<rect x="'+x0+'" y="'+(by+dy)+'" width="'+(x1-x0)+'" height="'+t+'" fill="#111"/>';
    // 16th: second beam on runs of 16ths
    var i=0; while(i<g.length){ if(g[i].bd<=4){ var j=i; while(j+1<g.length&&g[j+1].bd<=4) j++; var xa=g[i].x+(up?5.6:-5.6), xb=g[j].x+(up?5.6:-5.6); if(i===j){ xb=i>0?xa:xa+8; xa=i>0?xa-8:xa; } o+='<rect x="'+xa+'" y="'+(by+dy+(up?7:-7))+'" width="'+(xb-xa)+'" height="'+t+'" fill="#111"/>'; i=j+1; } else i++; }
  });
  return o;
}

/* ---------- history / save ---------- */
function snap(){ return JSON.stringify(score); }
function setScore(o){ cur.end=-1; score=o; if(!score.mk) score.mk={}; if(!score.parts||!score.parts.length) score.parts=[{name:'멜로디',clef:'treble',inst:'piano',vol:80,mute:false,ev:[]}]; if(cur.part>=score.parts.length) cur.part=0; }
var saveT;
function commit(){ hist=hist.slice(0,hi+1); hist.push(snap()); if(hist.length>100) hist.shift(); hi=hist.length-1; try{ localStorage.setItem(KEY,snap()); }catch(e){} draw(); panel(); }
function undo(){ if(hi>0){ hi--; setScore(JSON.parse(hist[hi])); cur.idx=-1; draw(); panel(); $('dname').value=score.name; try{ localStorage.setItem(KEY,snap()); }catch(e){} } }
function redo(){ if(hi<hist.length-1){ hi++; setScore(JSON.parse(hist[hi])); draw(); panel(); $('dname').value=score.name; try{ localStorage.setItem(KEY,snap()); }catch(e){} } }

/* ---------- editing ---------- */
function curPart(){ return score.parts[cur.part]; }
function curEv(){ var p=curPart(); return p&&p.ev[cur.idx]; }
function newDur(){ return ui.dot?ui.dur*3/2:ui.dur; }
function startOf(part,idx){ var t=0; for(var i=0;i<idx;i++) t+=part.ev[i].d; return t; }
function addEvent(pi,at,ev){ var p=score.parts[pi]; p.ev.splice(at,0,ev); cur.part=pi; cur.idx=at; }
function insertAtTime(pi,T,ev){
  var p=score.parts[pi], t=0, i=0; while(i<p.ev.length&&t+p.ev[i].d<=T-0.001&&t<T){ t+=p.ev[i].d; i++; }
  if(i<p.ev.length&&t<T-0.001){ // inside an event: put after it
    t+=p.ev[i].d; i++; }
  var tt=startOf(p,i); if(i>=p.ev.length&&T>tt+0.5){ var gap=T-tt; decompose(gap).forEach(function(d){ p.ev.splice(i++,0,{p:[],d:d,tie:false}); }); }
  addEvent(pi,i,ev);
}
function noteFromPos(part,pos){ var nb=part.clef==='bass'?18:30, n=nb+pos, o=Math.floor(n/7), s=((n%7)+7)%7; return {s:s,o:o,a:ui.acc!=null?ui.acc:keyAlter(s)}; }
function locate(e){ var t=e.target, h=t.getAttribute&&t.getAttribute('data-m'); if(h==null) return null; var r=sheet.getBoundingClientRect(), x=(e.clientX-r.left)*W/r.width, y=(e.clientY-r.top)*(L.H+10)/r.height, pi=+t.getAttribute('data-p'), mi=+h, m=L.ms[mi], part=score.parts[pi], top=staffY(m.sys,pi); return {x:x,y:y,pi:pi,mi:mi,m:m,part:part,top:top,pos:Math.round((top+STAFF-y)/5)}; }
function findHit(q){ var hitEv=-1, pc=L.pcs[q.pi][q.mi]||[];
  pc.forEach(function(c){ var cx=slotX(q.m,c.t); if(Math.abs(cx-q.x)<12&&c.p.length){ var near=c.p.some(function(p){ return Math.abs(noteY(q.top,q.part,ypos(q.part,p.s,p.o))-q.y)<8; }); if(near) hitEv=c.ev; } else if(Math.abs(cx-q.x)<12&&!c.p.length&&q.y>q.top&&q.y<q.top+STAFF) hitEv=c.ev; });
  return hitEv; }
var drag=null, suppress=false;
sheet.addEventListener('click',function(e){
  if(suppress){ suppress=false; return; }
  var q=locate(e); if(!q) return; var pi=q.pi, mi=q.mi, m=q.m, part=q.part, x=q.x, pos=q.pos; cur.m=mi;
  var hitEv=findHit(q);
  if(hitEv>=0){ if(ui.chord&&!score.parts[pi].ev[hitEv].p.length===false&&cur.part===pi){ var ev=part.ev[hitEv], np=noteFromPos(part,pos); if(!ev.p.some(function(p){ return p.s===np.s&&p.o===np.o; })){ ev.p.push(np); cur.idx=hitEv; cur.end=-1; commit(); preview(np); return; } }
    if((e.shiftKey||ui.tool==='range')&&cur.part===pi&&cur.idx>=0){ cur.end=hitEv; draw(); panel(); return; }
    cur.part=pi; cur.idx=hitEv; cur.end=-1; draw(); panel(); return; }
  if(ui.tool==='sel'||ui.tool==='range'){ cur.part=pi; cur.idx=-1; cur.end=-1; draw(); panel(); return; }
  // insert
  var M=ml(), best=0, bd=1e9; m.slots.forEach(function(sl){ var d=Math.abs(sl.ax-x); if(d<bd){ bd=d; best=sl.t; } });
  var T=mi*M+best, ev2;
  if(ui.rest) ev2={p:[],d:newDur(),tie:false}; else { var np2=noteFromPos(part,pos); ev2={p:[np2],d:newDur(),tie:false}; preview(np2); }
  cur.part=pi; cur.end=-1; insertAtTime(pi,T,ev2); commit();
});
/* drag a note up/down to change its pitch (touch: only an already selected note, so the page can still scroll) */
sheet.addEventListener('pointerdown',function(e){
  if(e.button>0||ui.tool==='range') return; var q=locate(e); if(!q) return; var h=findHit(q); if(h<0||!q.part.ev[h].p.length) return;
  if(e.pointerType==='touch'&&!(cur.part===q.pi&&cur.idx===h)) return;
  drag={q:q,h:h,pos0:q.pos,last:0,moved:false,orig:JSON.parse(JSON.stringify(q.part.ev[h].p)),touch:e.pointerType==='touch'};
});
window.addEventListener('pointermove',function(e){
  if(!drag) return; var r=sheet.getBoundingClientRect(), y=(e.clientY-r.top)*(L.H+10)/r.height, q=drag.q, pos=Math.round((q.top+STAFF-y)/5), d=pos-drag.pos0;
  if(!drag.moved&&Math.abs(e.clientY-(drag.cy==null?(drag.cy=e.clientY):drag.cy))<4&&d===0) return;
  if(d===drag.last) return; var ev=q.part.ev[drag.h]; drag.moved=true; drag.last=d;
  ev.p=JSON.parse(JSON.stringify(drag.orig)).map(function(p){ var n=p.o*7+p.s+d; p.o=Math.floor(n/7); p.s=((n%7)+7)%7; p.a=keyAlter(p.s); return p; });
  cur.part=q.pi; cur.idx=drag.h; cur.end=-1; draw(); if(ev.p.length) preview(ev.p[0]);
});
function endDrag(){ if(!drag) return; var m=drag.moved; drag=null; if(m){ suppress=true; setTimeout(function(){ suppress=false; },60); commit(); } }
window.addEventListener('pointerup',endDrag); window.addEventListener('pointercancel',endDrag);
document.addEventListener('touchmove',function(e){ if(drag&&drag.touch&&e.cancelable) e.preventDefault(); },{passive:false});
function preview(p){ try{ audio(); playNote(curPart().inst,freq(midi(p)),ctx.currentTime+0.01,0.4,0.6); }catch(e){} }
function selR(){ var p=curPart(); if(!p||cur.idx<0||!p.ev[cur.idx]) return null; var a=cur.idx, b=(cur.end>=0&&cur.end<p.ev.length)?cur.end:cur.idx; return a<=b?[a,b]:[b,a]; }
function inSel(pi,i){ if(pi!==cur.part) return false; var r=selR(); return !!r&&i>=r[0]&&i<=r[1]; }
function selEvs(){ var r=selR(); return r?curPart().ev.slice(r[0],r[1]+1):[]; }
function delEv(){ var r=selR(); if(!r) return; var p=curPart(); p.ev.splice(r[0],r[1]-r[0]+1); cur.idx=Math.min(r[0],p.ev.length-1); cur.end=-1; commit(); }
var clip=null; try{ clip=JSON.parse(localStorage.getItem(KEY+'.clip')); }catch(e){}
function copySel(cut){ var r=selR(); if(!r){ toast('먼저 음표를 골라 주세요'); return; } clip=JSON.parse(JSON.stringify(selEvs())); try{ localStorage.setItem(KEY+'.clip',JSON.stringify(clip)); }catch(e){} toast(clip.length+'개를 '+(cut?'잘라냈어요':'복사했어요')); if(cut) delEv(); else panel(); }
function pasteClip(src){ var c=src||clip; if(!c||!c.length){ toast('붙여넣을 음표가 없어요'); return; } var p=curPart(), r=selR(), at=r?r[1]+1:p.ev.length; c=JSON.parse(JSON.stringify(c)); p.ev.splice.apply(p.ev,[at,0].concat(c)); cur.idx=at; cur.end=at+c.length-1; commit(); toast(c.length+'개를 붙였어요'); }
function selMeasure(){ var m=cur.m; if(m==null||m<0){ toast('마디를 먼저 눌러 주세요'); return; } var p=curPart(), M=ml(), t=0, a=-1, b=-1; p.ev.forEach(function(e,i){ if(t>=m*M-.001&&t<(m+1)*M-.001){ if(a<0) a=i; b=i; } t+=e.d; }); if(a<0){ toast('이 마디에는 음표가 없어요'); return; } cur.idx=a; cur.end=b; draw(); panel(); }
function editOp(k){ var p=curPart(), r=selR();
  if(k==='copy') copySel(false); else if(k==='cut') copySel(true); else if(k==='paste') pasteClip();
  else if(k==='dup'){ if(!r){ toast('먼저 음표를 골라 주세요'); return; } pasteClip(selEvs()); }
  else if(k==='all'){ if(!p.ev.length) return; cur.idx=0; cur.end=p.ev.length-1; draw(); panel(); }
  else if(k==='meas') selMeasure();
  else if(k==='none'){ cur.idx=-1; cur.end=-1; draw(); panel(); }
  else if(k==='rev'){ if(!r||r[0]===r[1]){ toast('두 개 이상 골라 주세요'); return; } var seg=p.ev.slice(r[0],r[1]+1).reverse(); seg.forEach(function(e){ e.tie=false; }); Array.prototype.splice.apply(p.ev,[r[0],seg.length].concat(seg)); commit(); }
  else if(k.charAt(0)==='t'){ var n=+k.slice(1); transpose(n); } }
function transpose(n){ var r=selR(), evs=r?selEvs():curPart().ev; if(!evs.length) return; evs.forEach(function(e){ e.p.forEach(function(p){ shiftSemi(p,n); }); }); commit(); var f1=evs.filter(function(e){ return e.p.length; })[0]; if(f1) preview(f1.p[0]); }
function addLetter(letter){
  var p=curPart(), s=STEPS.indexOf(letter), prev=null; for(var i=Math.min(cur.idx,p.ev.length-1);i>=0;i--) if(p.ev[i].p.length){ prev=p.ev[i].p[p.ev[i].p.length-1]; break; }
  var base=prev?prev.o*7+prev.s:(p.clef==='bass'?3*7+4:4*7+4), best=null;
  for(var o=1;o<=7;o++){ var n=o*7+s; if(best==null||Math.abs(n-base)<Math.abs(best-base)) best=n; }
  var np={s:s,o:Math.floor(best/7),a:ui.acc!=null?ui.acc:keyAlter(s)};
  var ev=ui.chord&&curEv()&&curEv().p.length?null:{p:[np],d:newDur(),tie:false};
  if(!ev){ curEv().p.push(np); commit(); preview(np); return; }
  addEvent(cur.part,cur.idx+1,ev); commit(); preview(np);
}
function moveSel(dir){ var evs=selEvs(); if(!evs.length) return; evs.forEach(function(ev){ ev.p.forEach(function(p){ var n=p.o*7+p.s+dir; p.o=Math.floor(n/7); p.s=((n%7)+7)%7; p.a=keyAlter(p.s); }); }); commit(); if(evs[0].p.length) preview(evs[0].p[0]); }
function semi(dir){ var evs=selEvs(); if(!evs.length) return; evs.forEach(function(ev){ ev.p.forEach(function(p){ shiftSemi(p,dir); }); }); commit(); }
function shiftSemi(p,dir){ var m=midi(p)+dir, o=Math.floor(m/12)-1, pc=((m%12)+12)%12, sp=dir>0&&score.key>=0?[[0,0],[0,1],[1,0],[1,1],[2,0],[3,0],[3,1],[4,0],[4,1],[5,0],[5,1],[6,0]]:[[0,0],[1,-1],[1,0],[2,-1],[2,0],[3,0],[4,-1],[4,0],[5,-1],[5,0],[6,-1],[6,0]]; p.s=sp[pc][0]; p.a=sp[pc][1]; p.o=o; }
function setDur(d){ ui.dur=d; var ev=curEv(); if(ev&&cur.idx>=0){ ev.d=ui.dot?d*3/2:d; commit(); } else panel(); renderTools(); }

/* ---------- audio ---------- */
var ctx=null, master=null;
function audio(){ if(!ctx){ var A=window.AudioContext||window.webkitAudioContext; ctx=new A(); var comp=ctx.createDynamicsCompressor(); master=ctx.createGain(); master.gain.value=.7; master.connect(comp); comp.connect(ctx.destination); } if(ctx.state==='suspended') ctx.resume(); return ctx; }
function env(g,t0,a,peak,dec,dur,rel){ g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(peak,t0+a); g.gain.exponentialRampToValueAtTime(Math.max(0.0002,peak*dec),t0+Math.max(a+.02,dur)); g.gain.linearRampToValueAtTime(0,t0+dur+rel); }
function playNote(inst,fr,t0,dur,vol){
  var c=ctx, g=c.createGain(), end=t0+dur+.4; g.connect(master);
  function osc(type,mul,gain,detune){ var o=c.createOscillator(), og=c.createGain(); o.type=type; o.frequency.value=fr*mul; if(detune) o.detune.value=detune; og.gain.value=gain; o.connect(og); og.connect(g); o.start(t0); o.stop(end); return o; }
  var v=vol*.32;
  if(inst==='piano'){ osc('triangle',1,1); osc('sine',2,.4); osc('sine',3,.15); osc('sine',.5,.15); var d=Math.min(dur+.3,Math.max(.8,2.4-fr/700)); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(v,t0+.006); g.gain.exponentialRampToValueAtTime(v*.03,t0+d); g.gain.linearRampToValueAtTime(0,t0+Math.max(d,dur)+.25); }
  else if(inst==='flute'){ osc('sine',1,1); osc('sine',2,.12); var lf=c.createOscillator(), lg=c.createGain(); lf.frequency.value=5; lg.gain.value=fr*.006; lf.connect(lg); c.createGain(); lf.start(t0); lf.stop(end); env(g,t0,.07,v*1.1,.85,dur,.12); }
  else if(inst==='strings'){ var f1=c.createBiquadFilter(); f1.type='lowpass'; f1.frequency.value=2200; f1.connect(g); [-7,7].forEach(function(dt){ var o=c.createOscillator(); o.type='sawtooth'; o.frequency.value=fr; o.detune.value=dt; var og=c.createGain(); og.gain.value=.5; o.connect(og); og.connect(f1); o.start(t0); o.stop(end); }); env(g,t0,.14,v*.7,.9,dur,.25); }
  else if(inst==='organ'){ osc('sine',1,1); osc('sine',2,.6); osc('sine',3,.35); osc('sine',4,.2); env(g,t0,.02,v*.8,.95,dur,.06); }
  else if(inst==='guitar'){ var f2=c.createBiquadFilter(); f2.type='lowpass'; f2.frequency.setValueAtTime(3500,t0); f2.frequency.exponentialRampToValueAtTime(700,t0+.5); f2.connect(g); var o=c.createOscillator(); o.type='triangle'; o.frequency.value=fr; var og=c.createGain(); og.gain.value=1; o.connect(og); og.connect(f2); o.start(t0); o.stop(end); var d2=Math.min(dur+.2,1.2); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(v*1.2,t0+.004); g.gain.exponentialRampToValueAtTime(v*.02,t0+d2); g.gain.linearRampToValueAtTime(0,t0+d2+.1); }
  else if(inst==='box'){ osc('sine',1,1); osc('sine',3.01,.35); osc('sine',5.4,.1); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(v*.9,t0+.003); g.gain.exponentialRampToValueAtTime(v*.01,t0+Math.min(1.4,dur+.6)); g.gain.linearRampToValueAtTime(0,t0+Math.min(1.4,dur+.6)+.1); }
  else if(inst==='bass'){ osc('sine',1,1); osc('triangle',2,.3); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(v*1.3,t0+.01); g.gain.exponentialRampToValueAtTime(v*.2,t0+dur); g.gain.linearRampToValueAtTime(0,t0+dur+.12); }
  else { osc('square',1,.6); env(g,t0,.005,v*.5,.7,dur,.03); }
}
var play=null;
function playOrder(n){ var mk=score.mk||{}, order=[], i=0, start=0, done={}, guard=0;
  while(i<n&&guard++<5000){ var mm=mk[i]||{}; if(mm.rs) start=i;
    if(mm.volta===1&&done[start]){ i++; continue; }
    order.push(i);
    if(mm.re&&!done[start]){ done[start]=1; i=start; continue; }
    i++; }
  return order; }
function schedule(from){
  audio(); var M=ml(), n=L.ms.length, mk=score.mk||{}, order=playOrder(n), fm=Math.floor(from/M), fromOff=from-fm*M, i0=order.indexOf(fm); if(i0<0){ i0=0; fm=order[0]; fromOff=0; }
  var tempoNow=score.tempo; for(var k=0;k<=fm;k++) if(mk[k]&&mk[k].tempo) tempoNow=mk[k].tempo;
  var evm=score.parts.map(function(p){ var out={}, t=0, dyn=null; if(p.mute) return out;
    p.ev.forEach(function(e,i){ var d=e.d, kk=i, ee=e; if(e.dyn) dyn=e.dyn;
      while(ee.tie&&ee.p.length&&p.ev[kk+1]&&p.ev[kk+1].p.length&&sameP(ee,p.ev[kk+1])){ kk++; d+=p.ev[kk].d; ee=p.ev[kk]; }
      var tied=i>0&&p.ev[i-1].tie&&p.ev[i-1].p.length&&e.p.length&&sameP(p.ev[i-1],e), mi=Math.floor(t/M);
      if(!tied&&e.p.length) (out[mi]=out[mi]||[]).push({off:t-mi*M,d:d,p:e.p,vol:p.vol/100*dynF(dyn)*(e.art==='acc'?1.3:1),art:e.art,slur:e.slur,inst:p.inst});
      t+=e.d; }); return out; });
  var t0=ctx.currentTime+.12, sec=0, segs=[];
  for(var q=i0;q<order.length;q++){ var m=order[q]; if(mk[m]&&mk[m].tempo) tempoNow=mk[m].tempo; var spu=60/tempoNow/16, skip=q===i0?fromOff:0, len=(M-skip)*spu;
    segs.push({m:m,start:sec,len:len,spu:spu,skip:skip});
    evm.forEach(function(em){ (em[m]||[]).forEach(function(n){ if(n.off<skip-.001) return; var dur=n.d*spu*(n.slur?1:.96); if(n.art==='stac') dur*=.45; else if(n.art==='ferm') dur*=1.6; else if(n.art==='ten') dur=n.d*spu;
      n.p.forEach(function(pp){ playNote(n.inst,freq(midi(pp)),t0+sec+(n.off-skip)*spu,Math.max(.06,dur),n.vol); }); }); });
    sec+=len; }
  play={t0:t0,segs:segs,end:t0+sec+.8,M:M};
  $('bPlay').textContent='⏸ 멈춤'; requestAnimationFrame(tick);
}
function sameP(a,b){ return a.p.length===b.p.length&&a.p.every(function(p,i){ return midi(p)===midi(b.p[i]); }); }
function tick(){
  if(!play) return; var now=ctx.currentTime, el=now-play.t0;
  if(now>play.end){ stopPlay(); return; }
  var c=$('pcur'), sg=null; play.segs.forEach(function(x){ if(el>=x.start) sg=x; });
  if(c&&sg&&el>=0){ var T=sg.m*play.M+sg.skip+Math.min(play.M-sg.skip,(el-sg.start)/sg.spu), pos=timeX(Math.max(0,T)), s=L.sys[pos.sys], np=score.parts.length; c.setAttribute('x1',pos.x); c.setAttribute('x2',pos.x); c.setAttribute('y1',s.y+10); c.setAttribute('y2',s.y+(np-1)*PART_H+30+STAFF+10); c.setAttribute('opacity','1');
    var r=sheet.getBoundingClientRect(), dr=desk.getBoundingClientRect(), py=r.top+(s.y)*r.height/(L.H+10); if(py<dr.top||py>dr.bottom-120) desk.scrollTop+= py-dr.top-60; }
  requestAnimationFrame(tick);
}
function stopPlay(){ play=null; try{ if(ctx){ master.disconnect(); var comp=ctx.createDynamicsCompressor(); master=ctx.createGain(); master.gain.value=.7; master.connect(comp); comp.connect(ctx.destination); } }catch(e){} $('bPlay').textContent='▶ 재생'; var c=$('pcur'); if(c) c.setAttribute('opacity','0'); }
$('bPlay').onclick=function(){ if(play){ stopPlay(); return; } var from=0; if(cur.idx>=0) from=startOf(curPart(),cur.idx); schedule(from); };
$('bStop').onclick=stopPlay;

/* ---------- MIDI ---------- */
function vlq(n){ var b=[n&127]; while(n>>=7) b.unshift((n&127)|128); return b; }
function exportMidi(){
  var tr=[], tpu=30; function tk(arr){ var len=arr.length; return [77,84,114,107,len>>>24&255,len>>>16&255,len>>>8&255,len&255].concat(arr); }
  var tm=[[0,Math.round(60000000/score.tempo)]]; Object.keys(score.mk||{}).map(Number).sort(function(a,b){ return a-b; }).forEach(function(mi){ var q=score.mk[mi]; if(q&&q.tempo) tm.push([mi*ml()*tpu,Math.round(60000000/q.tempo)]); });
  var meta=[], lastT=0; tm.forEach(function(x){ meta=meta.concat(vlq(x[0]-lastT),[255,81,3,x[1]>>16&255,x[1]>>8&255,x[1]&255]); lastT=x[0]; });
  meta=meta.concat([0,255,88,4,score.ts[0],Math.log2(score.ts[1]),24,8,0,255,47,0]);
  tr.push(tk(meta));
  score.parts.forEach(function(p,pi){ var ch=pi%9; if(ch>=9) ch++; var prog=0; INSTS.forEach(function(x){ if(x[0]===p.inst) prog=x[2]; });
    var evs=[[0,0xC0|ch,prog]], t=0, curD=null;
    p.ev.forEach(function(e,i){ var d=e.d; if(e.dyn) curD=e.dyn; if(e.p.length){ var tied=i>0&&p.ev[i-1].tie&&p.ev[i-1].p.length&&sameP(p.ev[i-1],e); if(!tied){ var k=i,dd=d,ee=e; while(ee.tie&&p.ev[k+1]&&p.ev[k+1].p.length&&sameP(ee,p.ev[k+1])){ k++; dd+=p.ev[k].d; ee=p.ev[k]; } e.p.forEach(function(pp){ var m=midi(pp); evs.push([t*tpu,0x90|ch,m,Math.min(127,Math.round(p.vol*.9*dynF(curD)))]); evs.push([(t+dd)*tpu-2,0x80|ch,m,0]); }); } } t+=d; });
    evs.sort(function(a,b){ return a[0]-b[0]||(a[1]&0xF0)-(b[1]&0xF0); });
    var arr=[0,255,3,p.name.length].concat(Array.prototype.map.call(unescape(encodeURIComponent(p.name)),function(c){ return c.charCodeAt(0); })), last=0;
    arr[3]=arr.length-4; evs.forEach(function(ev){ arr=arr.concat(vlq(ev[0]-last)); last=ev[0]; arr.push(ev[1],ev[2]); if(ev.length>3) arr.push(ev[3]); }); arr=arr.concat([0,255,47,0]); tr.push(tk(arr)); });
  var hdr=[77,84,104,100,0,0,0,6,0,1,0,tr.length,480>>8,480&255]; var out=hdr; tr.forEach(function(t){ out=out.concat(t); });
  return new Blob([new Uint8Array(out)],{type:'audio/midi'});
}
function readMidi(buf){
  var d=new Uint8Array(buf), p=0; function u32(){ var v=(d[p]<<24|d[p+1]<<16|d[p+2]<<8|d[p+3])>>>0; p+=4; return v; } function u16(){ var v=d[p]<<8|d[p+1]; p+=2; return v; }
  if(u32()!==0x4d546864) throw 0; u32(); u16(); var nt=u16(), div=u16(), parts=[], tempo=500000, ts=[4,4];
  for(var t=0;t<nt;t++){ if(u32()!==0x4d54726b) break; var len=u32(), end=p+len, time=0, run=0, notes=[], open={}, prog=0, name='', ch=-1;
    function vl(){ var v=0,b; do{ b=d[p++]; v=v<<7|b&127; }while(b&128); return v; }
    while(p<end){ time+=vl(); var st=d[p]; if(st<128){ st=run; } else { p++; if(st<240) run=st; }
      if(st===255){ var ty=d[p++], ln=vl(); if(ty===81&&ln===3) tempo=d[p]<<16|d[p+1]<<8|d[p+2]; if(ty===88&&ln>=2) ts=[d[p],Math.pow(2,d[p+1])]; if(ty===3) name=String.fromCharCode.apply(0,d.slice(p,p+ln)); p+=ln; }
      else if(st===240||st===247){ p+=vl(); }
      else { var hi2=st&240; ch=st&15; if(hi2===0x90||hi2===0x80){ var n=d[p],v=d[p+1]; p+=2; if(hi2===0x90&&v>0) open[n]=time; else if(open[n]!=null){ notes.push([open[n],time,n]); delete open[n]; } } else if(hi2===0xC0||hi2===0xD0){ if(hi2===0xC0) prog=d[p]; p++; } else p+=2; } }
    p=end; if(notes.length) parts.push({notes:notes,name:name,prog:prog,ch:ch}); }
  var tpu=div/16; score.tempo=Math.round(60000000/tempo); score.ts=ts; score.parts=[];
  parts.slice(0,8).forEach(function(pt,i){ pt.notes.sort(function(a,b){ return a[0]-b[0]||a[2]-b[2]; }); var evs=[], t=0, grid=function(x){ return Math.round(x/tpu/4)*4; };
    var byT={}; pt.notes.forEach(function(n){ var s=grid(n[0]); (byT[s]=byT[s]||[]).push(n); }); var times=Object.keys(byT).map(Number).sort(function(a,b){ return a-b; });
    times.forEach(function(s,k){ if(s<t) return; if(s>t) decompose(s-t).forEach(function(dd){ evs.push({p:[],d:dd,tie:false}); }); var ns=byT[s], nxt=k+1<times.length?times[k+1]:s+64, dd=Math.max(4,Math.min(grid(Math.max.apply(0,ns.map(function(n){ return n[1]; }))-0)-s,nxt-s)); if(dd<4) dd=4; var parts2=decompose(dd);
      parts2.forEach(function(q,qi){ evs.push({p:ns.map(function(n){ var o=Math.floor(n[2]/12)-1, pc=n[2]%12, sp=[[0,0],[0,1],[1,0],[1,1],[2,0],[3,0],[3,1],[4,0],[4,1],[5,0],[5,1],[6,0]][pc]; return {s:sp[0],a:sp[1],o:o}; }),d:q,tie:qi<parts2.length-1}); }); t=s+dd; });
    var avg=pt.notes.reduce(function(a,n){ return a+n[2]; },0)/pt.notes.length, inst='piano'; INSTS.forEach(function(x){ if(pt.prog===x[2]) inst=x[0]; });
    score.parts.push({name:pt.name||('파트 '+(i+1)),clef:avg<57?'bass':'treble',inst:inst,vol:80,mute:false,ev:evs}); });
  if(!score.parts.length) throw 0;
}

/* ---------- export / import ---------- */
function download(name,blob){ var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },1500); }
function fname(ext){ return (score.name||'score').replace(/[\\/:*?"<>|]/g,'_')+'.'+ext; }
function svgStr(){ var c=sheet.cloneNode(true); var cu=c.querySelector('#pcur'); if(cu) cu.remove(); var h=c.querySelector('#hits'); if(h) h.remove(); c.removeAttribute('style'); c.setAttribute('width',W); c.setAttribute('height',L.H+10); return new XMLSerializer().serializeToString(c); }
function exportPng(sc){ var img=new Image(), s=svgStr(); img.onload=function(){ var cv=document.createElement('canvas'); cv.width=W*sc; cv.height=(L.H+10)*sc; var x=cv.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,cv.width,cv.height); x.drawImage(img,0,0,cv.width,cv.height); cv.toBlob(function(b){ download(fname('png'),b); }); }; img.onerror=function(){ toast('PNG로 바꾸지 못했어요'); }; img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s); }
function openFile(file){
  var r=new FileReader();
  if(/\.midi?$/i.test(file.name)){ r.onload=function(){ var keep=snap(); try{ readMidi(r.result); score.name=file.name.replace(/\.[^.]+$/,''); cur={part:0,idx:-1}; $('dname').value=score.name; commit(); toast('MIDI를 열었어요. 리듬은 16분음표 칸에 맞춰져요'); }catch(e){ setScore(JSON.parse(keep)); toast('이 MIDI 파일을 열지 못했어요'); } }; r.readAsArrayBuffer(file); return; }
  r.onload=function(){ try{ var o=JSON.parse(String(r.result)); if(!o.parts) throw 0; setScore(o); cur={part:0,idx:-1}; $('dname').value=score.name; commit(); }catch(e){ toast('이 파일을 열지 못했어요'); } }; r.readAsText(file);
}

/* ---------- ui ---------- */
var TOOLS=[['in','✎','음표 찍기: 오선을 눌러요'],['sel','↖','고르기: 음표만 골라요'],['range','▭','범위 고르기: 시작 음표를 누른 뒤 끝 음표를 눌러요'],['d64','온','온음표 (1)'],['d32','2분','2분음표 (2)'],['d16','4분','4분음표 (3)'],['d8','8분','8분음표 (4)'],['d4','16분','16분음표 (5)'],['dot','•','점음표 (.)'],['rest','쉼','쉼표 (R)'],['acc1','♯','올림표 (+)'],['acc-1','♭','내림표 (-)'],['acc0','♮','제자리표'],['tie','⌒','붙임줄 (T)'],['chord','화음','화음: 켜고 같은 음표 위·아래를 눌러요'],['del','🗑','지우기 (Delete)']];
function renderTools(){
  $('tools').innerHTML=TOOLS.map(function(t){ var k=t[0], on=(k==='in'&&ui.tool==='in')||(k==='sel'&&ui.tool==='sel')||(k==='range'&&ui.tool==='range')||(k==='d'+ui.dur)||(k==='dot'&&ui.dot)||(k==='rest'&&ui.rest)||(k==='chord'&&ui.chord)||(k.indexOf('acc')===0&&ui.acc===+k.slice(3));
    return '<button class="tl'+(on?' on':'')+'" data-t="'+k+'" title="'+t[2]+'" style="font-size:'+(t[1].length>1?'11':'18')+'px;font-weight:600">'+t[1]+'</button>'; }).join('');
}
$('tools').addEventListener('click',function(e){ var b=e.target.closest('.tl'); if(!b) return; var k=b.dataset.t;
  if(k==='in'||k==='sel'||k==='range') ui.tool=k; else if(/^d\d/.test(k)) setDur(+k.slice(1)); else if(k==='dot'){ ui.dot=!ui.dot; var ev=curEv(); if(ev){ var bd=baseDur(ev.d); ev.d=ui.dot?bd*3/2:bd; commit(); } }
  else if(k==='rest'){ ui.rest=!ui.rest; if(curEv()&&cur.idx>=0&&ui.rest){ curEv().p=[]; commit(); } }
  else if(k==='chord') ui.chord=!ui.chord; else if(k==='del') delEv();
  else if(k==='tie'){ var e2=curEv(); if(e2&&e2.p.length){ e2.tie=!e2.tie; commit(); } }
  else if(k.indexOf('acc')===0){ var a=+k.slice(3); ui.acc=ui.acc===a?null:a; var e3=curEv(); if(e3&&ui.acc!=null&&e3.p.length){ e3.p.forEach(function(p){ p.a=ui.acc; }); commit(); } }
  renderTools(); });
var ptab='note';
function sel(id,opts,val){ return '<select id="'+id+'">'+opts.map(function(o){ return '<option value="'+o[1]+'"'+(String(o[1])===String(val)?' selected':'')+'>'+o[0]+'</option>'; }).join('')+'</select>'; }
function panel(){
  var h='', b=$('pbody'); document.querySelectorAll('#ptabs button').forEach(function(x){ x.classList.toggle('on',x.dataset.p===ptab); });
  if(ptab==='note'){
    var ev=curEv();
    h+='<div class="sec"><h4>고른 음표</h4>';
    if(ev){ h+='<div class="note" style="margin:0 0 6px">'+(ev.p.length?ev.p.map(pname).join(' + '):'쉼표')+' · '+durName(ev.d)+(ev.tie?' · 붙임줄':'')+'</div><div class="btns"><button class="tbtn" data-a="up">▲ 한 칸 위</button><button class="tbtn" data-a="down">▼ 한 칸 아래</button><button class="tbtn" data-a="s1">♯ 반음 위</button><button class="tbtn" data-a="s-1">♭ 반음 아래</button><button class="tbtn" data-a="o1">옥타브 ▲</button><button class="tbtn" data-a="o-1">옥타브 ▼</button><button class="tbtn" data-a="del">지우기</button></div>'; }
    else h+='<div class="note">음표를 누르면 여기서 고칠 수 있어요.</div>';
    if(ev){
      h+='<div class="note" style="margin:8px 0 4px">셈여림</div><div class="btns">'+['pp','p','mp','mf','f','ff'].map(function(d){ return '<button class="tbtn'+(ev.dyn===d?' on':'')+'" data-dy="'+d+'" style="font-style:italic;font-weight:700">'+d+'</button>'; }).join('')+'<button class="tbtn" data-dy="">없음</button></div>';
      h+='<div class="note" style="margin:8px 0 4px">기호</div><div class="btns">'+[['stac','스타카토'],['acc','악센트'],['ten','테누토'],['ferm','늘임표']].map(function(a){ return '<button class="tbtn'+(ev.art===a[0]?' on':'')+'" data-ar="'+a[0]+'">'+a[1]+'</button>'; }).join('')+'<button class="tbtn'+(ev.slur?' on':'')+'" data-a="slur">슬러(다음 음까지)</button><button class="tbtn" data-ar="">기호 없음</button></div>';
      h+='<div class="row"><label>가사</label><input type="text" data-ly="1" value="'+esc(ev.ly||'')+'" data-notr></div><div class="row"><label>코드 이름</label><input type="text" data-chn="1" value="'+esc(ev.ch||'')+'" placeholder="예: Am7" data-notr></div>';
    }
    h+='</div>';
    var nsel=selEvs().length;
    h+='<div class="sec"><h4>편집'+(nsel>1?' · '+nsel+'개 고름':'')+'</h4><div class="btns">'+[['copy','복사'],['cut','잘라내기'],['paste','붙여넣기'],['dup','복제'],['all','모두 고르기'],['meas','마디 고르기'],['none','고르기 풀기'],['rev','거꾸로']].map(function(a){ return '<button class="tbtn" data-ed="'+a[0]+'">'+a[1]+'</button>'; }).join('')+'</div><div class="note" style="margin:6px 0 4px">옮기기 (고른 음표, 없으면 이 파트 전체)</div><div class="btns">'+[['t-12','−1옥타브'],['t-1','−반음'],['t1','+반음'],['t12','+1옥타브'],['t-2','−온음'],['t2','+온음']].map(function(a){ return '<button class="tbtn" data-ed="'+a[0]+'">'+a[1]+'</button>'; }).join('')+'</div><div class="note">범위: 범위 도구(▭)로 시작·끝 음표를 차례로 누르거나, Shift를 누른 채 누르거나 Shift+←→. 음표를 위아래로 끌면 음 높이가 바뀌어요.</div></div>';
    var mk=(score.mk||{})[cur.m]||{};
    if(cur.m!=null&&cur.m>=0){ h+='<div class="sec"><h4>'+(cur.m+1)+'번째 마디</h4><div class="btns"><button class="tbtn'+(mk.rs?' on':'')+'" data-mk="rs">도돌이표 시작 |:</button><button class="tbtn'+(mk.re?' on':'')+'" data-mk="re">도돌이표 끝 :|</button><button class="tbtn'+(mk.volta===1?' on':'')+'" data-mk="v1">1번 괄호</button><button class="tbtn'+(mk.volta===2?' on':'')+'" data-mk="v2">2번 괄호</button></div><div class="row"><label>빠르기 바꾸기</label><input type="number" min="30" max="260" data-mkt="1" value="'+(mk.tempo||'')+'" placeholder="그대로"><span class="v">BPM</span></div></div>'; }
    h+='<div class="sec"><h4>쓰는 법</h4><div class="note">오선을 누르면 왼쪽에서 고른 길이의 음표가 찍혀요. 키보드에서 <b>A~G</b>를 누르면 이어서 음이 들어가고, <b>1~5</b>는 길이, <b>R</b>은 쉼표, <b>↑↓</b>는 음 높이, <b>Delete</b>는 지우기, <b>Space</b>는 재생이에요. 같은 줄을 여러 마디 이어 쓰면 마디는 알아서 나뉘고 걸치는 음은 붙임줄이 돼요.</div></div>';
  } else if(ptab==='song'){
    h+='<div class="sec"><h4>곡 정보</h4><div class="row"><label>작곡</label><input type="text" id="comp" value="'+esc(score.composer||'')+'" data-notr></div>';
    h+='<div class="row"><label>빠르기</label><input type="range" id="tempo" min="40" max="220" value="'+score.tempo+'"><span class="v" id="tempoV">'+score.tempo+'</span></div>';
    h+='<div class="row"><label>박자</label>'+sel('tsel',[['4/4',"4/4"],['3/4',"3/4"],['2/4',"2/4"],['6/8',"6/8"],['2/2',"2/2"],['5/4',"5/4"],['12/8',"12/8"]],score.ts[0]+'/'+score.ts[1])+'</div>';
    h+='<div class="row"><label>조</label>'+sel('ksel',KEYS,score.key)+'</div></div>';
    h+='<div class="sec"><h4>파트 (오선)</h4>';
    score.parts.forEach(function(p,i){ h+='<div style="border:1px solid '+(i===cur.part?'var(--fry)':'var(--line)')+';border-radius:9px;padding:8px;margin:6px 0"><div class="row"><input type="text" data-pn="'+i+'" value="'+esc(p.name)+'" data-notr><button class="tbtn" data-pa="sel'+i+'" style="height:28px">'+(i===cur.part?'쓰는 중':'고르기')+'</button></div>'
      +'<div class="row"><label>음자리표</label><select data-pc="'+i+'"><option value="treble"'+(p.clef==='treble'?' selected':'')+'>높은음자리</option><option value="bass"'+(p.clef==='bass'?' selected':'')+'>낮은음자리</option></select></div>'
      +'<div class="row"><label>악기</label><select data-pi="'+i+'">'+INSTS.map(function(x){ return '<option value="'+x[0]+'"'+(p.inst===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></div>'
      +'<div class="row"><label>소리 크기</label><input type="range" data-pv="'+i+'" min="0" max="100" value="'+p.vol+'"><label class="chk" style="margin:0"><input type="checkbox" data-pm="'+i+'"'+(p.mute?' checked':'')+'> 끄기</label></div>'
      +(score.parts.length>1?'<div class="btns"><button class="tbtn" data-pa="del'+i+'">이 파트 지우기</button></div>':'')+'</div>'; });
    h+=(score.parts.length<8?'<div class="btns"><button class="tbtn" data-pa="add">+ 파트 더하기</button></div>':'')+'</div>';
    h+='<div class="sec"><h4>예시 곡</h4><div class="btns"><button class="tbtn" data-ex="twinkle">반짝반짝 작은 별</button><button class="tbtn" data-ex="ode">환희의 송가</button><button class="tbtn" data-ex="canon">캐논 (2파트)</button></div><div class="btns"><button class="tbtn" id="bNew">모두 지우고 새로 시작</button></div></div>';
  } else if(ptab==='text'){
    h+='<div class="sec"><h4>글자로 악보 쓰기 (쓰는 중인 파트)</h4><textarea id="txt" style="min-height:150px" data-notr>'+esc(toText(curPart()))+'</textarea>';
    h+='<div class="sec"><h4>가사 한꺼번에 붙이기</h4><textarea id="lyTxt" style="min-height:70px" placeholder="반 짝 반 짝 작 은 별 (띄어쓰기마다 음표 하나, 건너뛰려면 _)" data-notr></textarea><div class="btns"><button class="tbtn" id="lyApply">가사 붙이기</button></div><div class="note">고른 음표부터(고른 게 없으면 처음부터) 쉼표를 빼고 차례로 붙어요.</div></div>';
    h+='<div class="btns"><button class="tbtn pri" id="txtApply">악보에 적용</button></div><div class="note">음 이름 + 옥타브 + /길이 로 써요. 예) <b>C4/4 E4 G4/2 R/4 C4+E4+G4/2.</b><br>길이 /1 온, /2 2분, /4 4분, /8 8분, /16 16분, 뒤에 <b>.</b>이면 점음표, <b>#</b> 올림, <b>b</b> 내림, <b>+</b>로 화음, <b>R</b> 쉼표, 끝에 <b>~</b>는 붙임줄이에요. 길이와 옥타브를 안 쓰면 앞의 것을 그대로 써요.</div></div>';
  } else {
    h+='<div class="sec"><h4>AI에게 멜로디 부탁하기 (시험 기능)</h4><textarea id="aiQ" placeholder="예: 밝고 쉬운 8마디 동요 멜로디 / 슬픈 느낌의 단조 멜로디"></textarea><div class="btns"><button class="tbtn pri" id="aiGo">만들기</button><button class="tbtn" id="aiSet">AI 설정</button></div><div class="note" id="aiOut">AI가 글자 악보를 써 주면 쓰는 중인 파트 끝에 이어 붙여요. 박자가 안 맞거나 엉뚱할 수 있으니 들어 보고 고쳐 쓰세요. 마음에 안 들면 되돌리기를 눌러요.</div></div>';
  }
  b.innerHTML=h;
}
function durName(d){ var base=baseDur(d), nm={64:'온음표',32:'2분음표',16:'4분음표',8:'8분음표',4:'16분음표'}[base]||(d+'/64'); return (dotted(d)?'점 ':'')+nm; }
$('ptabs').addEventListener('click',function(e){ var b=e.target.closest('button'); if(b){ ptab=b.dataset.p; panel(); } });
var pb=$('pbody');
pb.addEventListener('click',function(e){
  var t=e.target.closest('button'); if(!t) return;
  if(t.dataset.ed){ editOp(t.dataset.ed); return; }
  if(t.dataset.a){ var a=t.dataset.a; if(a==='slur'){ var es=curEv(); if(es){ es.slur=!es.slur; commit(); } return; } if(a==='up') moveSel(1); else if(a==='down') moveSel(-1); else if(a==='s1') semi(1); else if(a==='s-1') semi(-1); else if(a==='o1'){ curEv().p.forEach(function(p){ p.o++; }); commit(); } else if(a==='o-1'){ curEv().p.forEach(function(p){ p.o--; }); commit(); } else if(a==='del') delEv(); return; }
  if(t.dataset.pa){ var pa=t.dataset.pa;
    if(pa==='add'){ score.parts.push({name:'파트 '+(score.parts.length+1),clef:'bass',inst:'piano',vol:80,mute:false,ev:[]}); commit(); }
    else if(pa.indexOf('sel')===0){ cur.part=+pa.slice(3); cur.idx=-1; draw(); panel(); }
    else if(pa.indexOf('del')===0){ score.parts.splice(+pa.slice(3),1); cur={part:0,idx:-1}; commit(); } return; }
  if(t.dataset.dy!=null){ var e1=curEv(); if(e1){ if(t.dataset.dy) e1.dyn=t.dataset.dy; else delete e1.dyn; commit(); } return; }
  if(t.dataset.ar!=null){ var e2=curEv(); if(e2){ if(t.dataset.ar&&e2.art!==t.dataset.ar) e2.art=t.dataset.ar; else delete e2.art; commit(); } return; }
  if(t.dataset.mk){ score.mk=score.mk||{}; var q=score.mk[cur.m]||(score.mk[cur.m]={}), k=t.dataset.mk; if(k==='rs') q.rs=!q.rs; else if(k==='re') q.re=!q.re; else if(k==='v1') q.volta=q.volta===1?0:1; else if(k==='v2') q.volta=q.volta===2?0:2; commit(); return; }
  if(t.id==='lyApply'){ var toks=($('lyTxt').value||'').split(/\s+/).filter(Boolean), pp=curPart(), st=cur.idx>=0?cur.idx:0, ti=0; for(var i=st;i<pp.ev.length&&ti<toks.length;i++){ if(!pp.ev[i].p.length) continue; var w=toks[ti++]; if(w==='_') delete pp.ev[i].ly; else pp.ev[i].ly=w; } commit(); toast(ti+'개를 붙였어요'); return; }
  if(t.dataset.ex){ loadExample(t.dataset.ex); return; }
  if(t.id==='bNew'){ if(!bnConfirm(t)) return; setScore({name:'이름 없는 악보',composer:'',tempo:100,ts:[4,4],key:0,parts:[{name:'멜로디',clef:'treble',inst:'piano',vol:80,mute:false,ev:[]}]}); cur={part:0,idx:-1}; $('dname').value=score.name; commit(); return; }
  if(t.id==='txtApply'){ var ev=parseText($('txt').value,curPart().clef); curPart().ev=ev; cur.idx=-1; commit(); toast(ev.length+'개를 적용했어요'); return; }
  if(t.id==='aiGo'){ askAI(); return; }
  if(t.id==='aiSet'){ if(window.FFAI) FFAI.settings(); return; }
});
var cf=0; function bnConfirm(b){ if(cf){ cf=0; return true; } cf=1; b.textContent='한 번 더 누르면 지워요'; setTimeout(function(){ cf=0; if(b.isConnected) b.textContent='모두 지우고 새로 시작'; },3000); return false; }
pb.addEventListener('input',function(e){ var t=e.target;
  if(t.id==='tempo'){ score.tempo=+t.value; $('tempoV').textContent=t.value; } else if(t.id==='comp'){ score.composer=t.value; } else if(t.dataset.pv!=null){ score.parts[+t.dataset.pv].vol=+t.value; } else if(t.dataset.pn!=null){ score.parts[+t.dataset.pn].name=t.value; } });
pb.addEventListener('change',function(e){ var t=e.target;
  if(t.id==='tempo'||t.id==='comp'||t.dataset.pv!=null||t.dataset.pn!=null){ commit(); return; }
  if(t.id==='tsel'){ var a=t.value.split('/'); score.ts=[+a[0],+a[1]]; commit(); return; }
  if(t.id==='ksel'){ score.key=+t.value; commit(); return; }
  if(t.dataset.pc!=null){ score.parts[+t.dataset.pc].clef=t.value; commit(); return; }
  if(t.dataset.pi!=null){ score.parts[+t.dataset.pi].inst=t.value; commit(); return; }
  if(t.dataset.pm!=null){ score.parts[+t.dataset.pm].mute=t.checked; commit(); return; }
  if(t.dataset.ly){ var ev=curEv(); if(ev){ if(t.value) ev.ly=t.value; else delete ev.ly; commit(); } return; }
  if(t.dataset.chn){ var ev2=curEv(); if(ev2){ if(t.value) ev2.ch=t.value; else delete ev2.ch; commit(); } return; }
  if(t.dataset.mkt){ score.mk=score.mk||{}; var q=score.mk[cur.m]||(score.mk[cur.m]={}); var v=+t.value; if(v>=30&&v<=260) q.tempo=Math.round(v); else delete q.tempo; commit(); return; } });
var EX={
  twinkle:{ly:'반 짝 반 짝 작 은 별 아 름 답 게 비 치 네 동 쪽 하 늘 에 서 도 서 쪽 하 늘 에 서 도 반 짝 반 짝 작 은 별 아 름 답 게 비 치 네',name:'반짝반짝 작은 별',tempo:100,ts:[4,4],key:0,parts:[['멜로디','treble','piano','C4/4 C4 G4 G4 A4 A4 G4/2 F4/4 F4 E4 E4 D4 D4 C4/2 G4/4 G4 F4 F4 E4 E4 D4/2 G4/4 G4 F4 F4 E4 E4 D4/2 C4/4 C4 G4 G4 A4 A4 G4/2 F4/4 F4 E4 E4 D4 D4 C4/2']]},
  ode:{name:'환희의 송가',composer:'L. v. Beethoven',tempo:112,ts:[4,4],key:0,parts:[['멜로디','treble','piano','E4/4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4/4. D4/8 D4/2 E4/4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4/4. C4/8 C4/2'],['반주','bass','strings','C3/2 G3/2 C3/2 G3/2 C3/2 G3/2 C3/2 G3/2 C3/2 G3/2 C3/2 G3/2 G3/2 C3/2 G2/2 C3/2 C3/1']]},
  canon:{name:'캐논 풍 연습',tempo:80,ts:[4,4],key:2,parts:[['멜로디','treble','strings','F#5/2 E5/2 D5/2 C#5/2 B4/2 A4/2 B4/2 C#5/2 D5/8 C#5/8 D5/4 F#5/4 A5/4 G5/4 F#5/4 E5/4 D5/4 C#5/4 D5/4 F#5/4 A5/2 A5/1'],['베이스','bass','piano','D3/2 A2/2 B2/2 F#2/2 G2/2 D2/2 G2/2 A2/2 D3/2 A2/2 B2/2 F#2/2 G2/2 D2/2 G2/2 A2/2 D2/1']]}
};
function lyr(pp,txt){ var toks=txt.split(/\s+/).filter(Boolean), ti=0; for(var i=0;i<pp.ev.length&&ti<toks.length;i++){ if(pp.ev[i].p.length) pp.ev[i].ly=toks[ti++]; } }
function loadExample(k){ var e=EX[k]; score={name:e.name,composer:e.composer||'',tempo:e.tempo,ts:e.ts,key:e.key,parts:e.parts.map(function(p){ return {name:p[0],clef:p[1],inst:p[2],vol:80,mute:false,ev:parseText(p[3],p[1])}; })}; score.mk=e.mk||{}; cur={part:0,idx:-1}; $('dname').value=score.name; if(e.ly) lyr(score.parts[0],e.ly); commit(); }

/* AI */
var aiBusy=false;
function askAI(){
  if(aiBusy||!window.FFAI) return; var q=($('aiQ').value||'').trim(); if(!q){ toast('어떤 멜로디인지 써 주세요'); return; }
  aiBusy=true; $('aiGo').disabled=true; $('aiOut').textContent='만드는 중이에요…';
  var p=curPart(), sys='You write short melodies in a compact text notation. Reply with ONLY the notation, no explanation, no markdown. Tokens are separated by spaces. A token is a note name A-G, optional # or b, octave digit, then /duration where 1=whole 2=half 4=quarter 8=eighth 16=sixteenth, optional . for dotted. Example: C4/4 E4 G4/2 R/4 D4/8 E4/8 F4/4. R is a rest. Omitted octave or duration repeats the previous one. Use '+(p.clef==='bass'?'octaves 2 to 3':'octaves 4 to 5')+'. Time signature is '+score.ts[0]+'/'+score.ts[1]+'; each bar must total exactly '+score.ts[0]+' beats of 1/'+score.ts[1]+' notes. Write 8 bars. Start and end on the tonic.';
  FFAI.ask({system:sys,prompt:q,maxTokens:600}).then(function(t){
    t=String(t||'').replace(/```[a-z]*/gi,'').replace(/\n/g,' '); var ev=parseText(t,p.clef);
    if(!ev.length){ $('aiOut').textContent='AI 답을 악보로 바꾸지 못했어요. 다른 말로 다시 시켜 보세요.'; return; }
    p.ev=p.ev.concat(ev); commit(); toast(ev.length+'개 음표를 이어 붙였어요');
  }).catch(function(e){ $('aiOut').textContent=(e&&e.message)||'AI를 쓸 수 없어요. 설정에서 AI를 골라 주세요.'; }).then(function(){ aiBusy=false; var g=$('aiGo'); if(g) g.disabled=false; });
}

/* chrome */
function zoomBy(k){ zoom=Math.max(.4,Math.min(2.5,zoom*k)); draw(); }
$('bZp').onclick=function(){ zoomBy(1.2); }; $('bZm').onclick=function(){ zoomBy(1/1.2); };
$('bUndo').onclick=undo; $('bRedo').onclick=redo;
$('dname').addEventListener('change',function(){ score.name=this.value||'이름 없는 악보'; commit(); });
$('bOpen').onclick=function(){ $('fileIn').click(); };
$('fileIn').addEventListener('change',function(){ if(this.files[0]) openFile(this.files[0]); this.value=''; });
$('bSave').onclick=function(){
  var old=document.querySelector('.menu'); if(old){ old.remove(); return; }
  var m=document.createElement('div'); m.className='menu'; var r=this.getBoundingClientRect(); m.style.top=(r.bottom+4)+'px'; m.style.right='8px';
  m.innerHTML='<button data-x="midi">MIDI (.mid)</button><button data-x="png">PNG 그림</button><button data-x="svg">SVG</button><button data-x="print">인쇄 / PDF로 저장</button><button data-x="json">프로젝트 파일 (.fscore)</button>';
  m.onclick=function(ev){ var x=ev.target.dataset.x; if(!x) return; m.remove();
    if(x==='midi') download(fname('mid'),exportMidi()); else if(x==='png') exportPng(2); else if(x==='svg') download(fname('svg'),new Blob([svgStr()],{type:'image/svg+xml'})); else if(x==='print') window.print(); else download(fname('fscore'),new Blob([snap()],{type:'application/json'})); };
  document.body.appendChild(m); setTimeout(function(){ document.addEventListener('click',function h(ev){ if(!m.contains(ev.target)) m.remove(); document.removeEventListener('click',h); }); },0);
};
document.addEventListener('keydown',function(e){
  var tg=e.target.tagName; if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT') return;
  var ctrl=e.ctrlKey||e.metaKey, k=e.key, kl=k.toLowerCase();
  if(ctrl&&kl==='z'){ e.preventDefault(); if(e.shiftKey) redo(); else undo(); return; }
  if(ctrl&&kl==='y'){ e.preventDefault(); redo(); return; }
  if(ctrl&&kl==='c'){ e.preventDefault(); copySel(false); return; }
  if(ctrl&&kl==='x'){ e.preventDefault(); copySel(true); return; }
  if(ctrl&&kl==='v'){ e.preventDefault(); pasteClip(); return; }
  if(ctrl&&kl==='a'){ e.preventDefault(); editOp('all'); return; }
  if(ctrl) return;
  if(k===' '){ e.preventDefault(); $('bPlay').click(); return; }
  if(k==='Delete'||k==='Backspace'){ e.preventDefault(); delEv(); return; }
  if(k==='ArrowUp'){ e.preventDefault(); if(e.shiftKey) semi(1); else moveSel(1); return; }
  if(k==='ArrowDown'){ e.preventDefault(); if(e.shiftKey) semi(-1); else moveSel(-1); return; }
  if(k==='ArrowRight'){ e.preventDefault(); if(e.shiftKey&&cur.idx>=0){ cur.end=Math.min(curPart().ev.length-1,(cur.end>=0?cur.end:cur.idx)+1); } else { cur.idx=Math.min(curPart().ev.length-1,cur.idx+1); cur.end=-1; } draw(); panel(); return; }
  if(k==='ArrowLeft'){ e.preventDefault(); if(e.shiftKey&&cur.idx>=0){ cur.end=Math.max(0,(cur.end>=0?cur.end:cur.idx)-1); } else { cur.idx=Math.max(-1,cur.idx-1); cur.end=-1; } draw(); panel(); return; }
  if(/^[a-g]$/i.test(k)&&!e.altKey){ addLetter(kl.toUpperCase()); return; }
  if(/^[1-5]$/.test(k)){ setDur([64,32,16,8,4][+k-1]); return; }
  if(kl==='r'){ if(cur.idx>=0&&curEv()&&!ui.rest){ addEvent(cur.part,cur.idx+1,{p:[],d:newDur(),tie:false}); } else addEvent(cur.part,curPart().ev.length,{p:[],d:newDur(),tie:false}); commit(); return; }
  if(k==='.'){ ui.dot=!ui.dot; var ev=curEv(); if(ev){ var bd=baseDur(ev.d); ev.d=ui.dot?bd*3/2:bd; commit(); } renderTools(); return; }
  if(k==='+'||k==='='){ var e1=curEv(); if(e1){ e1.p.forEach(function(p){ p.a=p.a>0?0:1; }); commit(); } return; }
  if(k==='-'){ var e2=curEv(); if(e2){ e2.p.forEach(function(p){ p.a=p.a<0?0:-1; }); commit(); } return; }
  if(kl==='t'){ var e3=curEv(); if(e3&&e3.p.length){ e3.tie=!e3.tie; commit(); } return; }
});

(function init(){
  var s=null; try{ s=localStorage.getItem(KEY); }catch(e){}
  if(s){ try{ setScore(JSON.parse(s)); }catch(e){} }
  if(!s) loadExampleSilent('twinkle');
  $('dname').value=score.name; hist=[snap()]; hi=0; renderTools(); draw(); panel();
  function loadExampleSilent(k){ var e=EX[k]; score={name:e.name,composer:e.composer||'',tempo:e.tempo,ts:e.ts,key:e.key,parts:e.parts.map(function(p){ return {name:p[0],clef:p[1],inst:p[2],vol:80,mute:false,ev:parseText(p[3],p[1])}; })}; score.mk=e.mk||{}; if(e.ly) lyr(score.parts[0],e.ly); }
  window.FSCORE={score:function(){ return score; },load:loadExample,parseText:parseText,layout:layout,midi:exportMidi,readMidi:readMidi,svg:svgStr};
})();
})();
