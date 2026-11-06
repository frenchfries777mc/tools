/* Fry Score: write sheet music, play it, export MIDI / PNG / SVG. Time unit: 64 per whole note (quarter = 16). */
(function(){
'use strict';
var NS='http://www.w3.org/2000/svg', KEY='ffscore.v1';
var $=function(id){ return document.getElementById(id); };
var sheet=$('sheet'), desk=$('desk');
var STEPS='CDEFGAB', SEMI=[0,2,4,5,7,9,11];
var INSTS=[['piano','피아노',0],['flute','플루트',73],['strings','현악기',48],['organ','오르간',19],['guitar','기타(뜯기)',24],['box','오르골',10],['chip','8비트',80],['bass','베이스',33],['brass','금관악기',56],['marimba','마림바',12],['harp','하프',46],['choir','합창',52]];
var KEYS=[['C 장조 / a 단조',0],['G 장조 (♯1)',1],['D 장조 (♯2)',2],['A 장조 (♯3)',3],['E 장조 (♯4)',4],['B 장조 (♯5)',5],['F♯ 장조 (♯6)',6],['F 장조 (♭1)',-1],['B♭ 장조 (♭2)',-2],['E♭ 장조 (♭3)',-3],['A♭ 장조 (♭4)',-4],['D♭ 장조 (♭5)',-5],['G♭ 장조 (♭6)',-6]];
var score={mk:{},name:'이름 없는 악보',composer:'',tempo:100,ts:[4,4],key:0,parts:[{name:'멜로디',clef:'treble',inst:'piano',vol:80,mute:false,ev:[]}]};
var cur={part:0,idx:-1}, ui={dur:16,dot:false,rest:false,acc:null,chord:false,tool:'in'}, zoom=1, hist=[], hi=-1, L=null;
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function f(n){ return +(+n).toFixed(2); }
function toast(t){ var d=document.createElement('div'); d.className='toast'; d.setAttribute('role','status'); d.textContent=t; document.body.appendChild(d); setTimeout(function(){ d.remove(); },2600); }
function ml(){ return score.ts[0]*64/score.ts[1]; }
var _mt={st:[0],ln:[]};
function tsAt(m){ var mk=score.mk||{}, t=score.ts; for(var k=0;k<=m;k++) if(mk[k]&&mk[k].ts) t=mk[k].ts; return t; }
function mtBuild(){ _mt={st:[0],ln:[]}; }
function mtEnsure(m){ while(_mt.ln.length<=m){ var i=_mt.ln.length, t=tsAt(i); _mt.ln.push(t[0]*64/t[1]); _mt.st.push(_mt.st[i]+_mt.ln[i]); } }
function mlen(m){ mtEnsure(m); return _mt.ln[m]; }
function mstart(m){ mtEnsure(m); return _mt.st[m]; }
function mAt(T){ var m=0; for(;;){ mtEnsure(m); if(T<_mt.st[m+1]-1e-6||m>6000) return m; m++; } }
function beatLen(m){ var t=tsAt(m||0); return (t[1]===8&&t[0]%3===0)?24:64/t[1]; }
function midi(p){ return SEMI[p.s]+p.a+12*(p.o+1); }
function freq(m){ return 440*Math.pow(2,(m-69)/12); }
function pname(p){ return STEPS[p.s]+(p.a>0?'♯':p.a<0?'♭':'')+p.o; }
var SHARP_ORDER=[3,0,4,1,5,2,6], FLAT_ORDER=[6,2,5,1,4,0,3];
var keyCtx=null;
function keyAt(m){ var mk=score.mk||{}, k=score.key; for(var i=0;i<=m;i++) if(mk[i]&&mk[i].key!=null) k=mk[i].key; return k; }
function keyAlter(step){ var k=keyCtx==null?score.key:keyCtx; if(k>0) return SHARP_ORDER.indexOf(step)<k?1:0; if(k<0) return FLAT_ORDER.indexOf(step)<-k?-1:0; return 0; }
var CLEFNB={treble:30,treble8:30,bass:18,alto:24,drum:30}, CLEFN={drum:'타악기(드럼)',treble:'높은음자리',treble8:'높은음자리 (한 옥타브 아래, 기타)',bass:'낮은음자리',alto:'알토(가온 C)'};
var KSP={treble:[[8,5,9,6,3,7,4],[4,7,3,6,2,5,1]],bass:[[6,3,7,4,1,5,2],[2,5,1,4,0,3,6]],alto:[[7,4,8,5,2,6,3],[3,6,2,5,1,4,0]]};
function nbOf(part){ return CLEFNB[part.clef]||30; }
function trOf(part){ return (part.clef==='treble8'?-12:0)+(+part.trans||0); }
function total(part){ var t=0; part.ev.forEach(function(e){ t+=e.d; }); return t; }

/* ---------- text notation ---------- */
function parseText(txt,clef){
  var out=[], lastO=clef==='bass'?3:4, lastD=16; var lastT=false;
  txt.replace(/[|\n]/g,' ').split(/\s+/).forEach(function(tok){
    if(!tok) return; var tie=false; if(/~$/.test(tok)){ tie=true; tok=tok.slice(0,-1); }
    var m=tok.match(/^([^/.t]*)(?:\/(\d+))?(\.?)(t?)$/); if(!m) return;
    var d=lastD; if(m[2]){ var n=+m[2]; d=n>0&&64%n===0?64/n:lastD; if(m[3]) d=d*3/2; lastD=m[3]?d*2/3:d; } else if(m[3]) d=lastD*3/2;
    if(m[2]&&!m[3]) lastD=d;
    var ps=[];
    if(!/^[Rr]$/.test(m[1])){ m[1].split('+').forEach(function(x){ var q=x.match(/^([A-Ga-g])([#b]?)(\d?)$/); if(!q) return; var s=STEPS.indexOf(q[1].toUpperCase()), o=q[3]===''?lastO:+q[3]; lastO=o; ps.push({s:s,a:q[2]==='#'?1:q[2]==='b'?-1:0,o:o}); }); if(!ps.length) return; }
    if(m[2]) lastT=!!m[4]; else if(m[4]) lastT=true; var oe={p:ps,d:Math.round(d),tie:tie}; if(lastT){ oe.d=d*2/3; oe.tp=3; } out.push(oe);
  });
  return out;
}
function toText(part){
  return part.ev.map(function(e){ var s=e.p.length?e.p.map(function(p){ return STEPS[p.s]+(p.a>0?'#':p.a<0?'b':'')+p.o; }).join('+'):'R';
    var d=e.tp?e.d*1.5:e.d, dot=false, base=d; [64,32,16,8,4].forEach(function(b){ if(d===b*3/2){ dot=true; base=b; } }); return s+'/'+(64/base)+(dot?'.':'')+(e.tp?'t':'')+(e.tie?'~':''); }).join(' ');
}

/* ---------- layout ---------- */
var STD=[64,48,32,24,16,12,8,4];
function decompose(n){ var r=[]; STD.forEach(function(b){ while(n>=b){ r.push(b); n-=b; } }); if(n>0) r.push(4); return r; }
function buildPieces(part){
  var t=0, meas=[], idx=0;
  function get(m){ while(meas.length<=m) meas.push([]); return meas[m]; }
  part.ev.forEach(function(e,i){
    var left=e.d, first=true;
    while(left>1e-6){ var m=mAt(t), off=Math.max(0,t-mstart(m)), room=mlen(m)-off, take=Math.min(left,room);
      var ds=e.tp?[take]:decompose(take);
      ds.forEach(function(d,k){ var last=left-take<1e-6&&k===ds.length-1; get(m).push({ev:i,p:e.p,d:d,t:Math.round(off*1000)/1000,tieNext:!last||(e.tie&&e.p.length>0),first:first,tp:e.tp||0,gr:first&&e.gr?e.gr.length:0}); first=false; off+=d; });
      t+=take; left-=take; }
  });
  return meas;
}
var TAB_H=62, PAD_L=22, STAFF=40, PART_H=112, TOP=70, SYS_GAP=26, W=1000, MARG=40;
function layout(){
  mtBuild(); var tot=0; score.parts.forEach(function(p){ tot=Math.max(tot,total(p)); });
  var nM=Math.max(4,mAt(tot)+1), pcs=score.parts.map(buildPieces), ms=[];
  for(var m=0;m<nM;m++){
    var kx=(m>0&&keyAt(m)!==keyAt(m-1))?12+Math.abs(keyAt(m))*10:0, tx=(m>0&&(tsAt(m)[0]!==tsAt(m-1)[0]||tsAt(m)[1]!==tsAt(m-1)[1]))?30:0, ts={0:1}, gx={}; pcs.forEach(function(pc){ (pc[m]||[]).forEach(function(c){ ts[c.t]=1; if(c.gr) gx[c.t]=Math.max(gx[c.t]||0,c.gr); }); });
    var tl=Object.keys(ts).map(Number).sort(function(a,b){ return a-b; }), slots=[], x=kx+tx, Mm=mlen(m);
    tl.forEach(function(t,i){ var gap=(i+1<tl.length?tl[i+1]:Mm)-t, w=Math.max(30,14+gap*1.9); var ex=(gx[t]||0)*10; slots.push({t:t,x:x,w:w+ex,ex:ex}); x+=w+ex; });
    ms.push({i:m,slots:slots,w:x+16,tl:tl,kx:kx,tx:tx});
  }
  var sys=[], row=[], rw=0, first=true;
  function head(fr,mi){ return (fr?64:48)+Math.abs(keyAt(mi))*10+(fr?30:0); }
  var avail0=W-2*MARG;
  for(var i=0;i<ms.length;i++){
    var need=ms[i].w, hw=head(first,row.length?row[0].i:ms[i].i);
    if(row.length&&(rw+need+hw>avail0||(score.mps>0&&row.length>=score.mps))){ sys.push({ms:row,first:first,hw:head(first,row[0].i),rw:rw}); row=[]; rw=0; first=false; }
    if(!row.length&&ms[i].kx){ ms[i].slots.forEach(function(sl){ sl.x-=ms[i].kx; }); ms[i].w-=ms[i].kx; ms[i].kx=0; }
    row.push(ms[i]); rw+=ms[i].w;
  }
  if(row.length) sys.push({ms:row,first:first,hw:head(first,row[0].i),rw:rw});
  var y=TOP+(score.composer||score.name?30:0), np=score.parts.length;
  sys.forEach(function(s,si){
    s.y=y; var inner=avail0-s.hw, k=inner/s.rw; if(si===sys.length-1&&k>1.3) k=1.3;
    var x=MARG+s.hw; s.x0=MARG; s.k=k;
    s.ms.forEach(function(m){ m.sys=si; m.x=x; m.W=m.w*k; m.slots.forEach(function(sl){ sl.ax=x+(sl.x+14+sl.ex)*k; }); x+=m.W; });
    s.x1=x; y+=partOff(np)+SYS_GAP;
  });
  L={sys:sys,ms:ms,pcs:pcs,H:y+10,tot:tot};
  return L;
}
function slotX(m,t){ var sl=m.slots; for(var i=0;i<sl.length;i++) if(sl[i].t===t) return sl[i].ax; var best=sl[0]; sl.forEach(function(s){ if(s.t<=t) best=s; }); return best.ax; }
function timeX(T){ var mi=Math.min(L.ms.length-1,mAt(T)), m=L.ms[mi], off=T-mstart(mi), sl=m.slots, a=sl[0],b=null;
  for(var i=0;i<sl.length;i++){ if(sl[i].t<=off) a=sl[i]; }
  var ai=sl.indexOf(a), nxtT=ai+1<sl.length?sl[ai+1].t:mlen(mi), nxtX=ai+1<sl.length?sl[ai+1].ax:m.x+m.W-6;
  var fr=(off-a.t)/Math.max(1,(nxtT-a.t)); return {sys:m.sys,x:a.ax+(nxtX-a.ax)*fr}; }

/* ---------- drawing ---------- */
function ypos(part,s,o){ return o*7+s-nbOf(part); } // steps above bottom line
function isV2(i){ return i>0&&!!score.parts[i]&&!!score.parts[i].v2; }
function parentOf(i){ while(i>0&&score.parts[i].v2) i--; return i; }
function groupOf(pi){ var a=parentOf(pi), r=[a]; for(var j=a+1;j<score.parts.length&&score.parts[j].v2;j++) r.push(j); return r; }
function partH(p){ return p.v2?0:PART_H+(p.tab?TAB_H:0); }
function partOff(pi){ var y=0; for(var i=0;i<pi;i++) y+=partH(score.parts[i]); return y; }
function staffY(si,pi){ return L.sys[si].y+partOff(parentOf(pi))+30; } // top line y
function noteY(top,part,pos){ return top+STAFF-pos*5; }
var ACC_G={'-1':'♭','0':'♮','1':'♯'};
function draw(){
  layout();
  var h=L.H+10; sheet.setAttribute('viewBox','0 0 '+W+' '+h); sheet.style.width=f(W*zoom)+'px'; sheet.style.height=f(h*zoom)+'px';
  var o='<rect width="'+W+'" height="'+h+'" fill="#fff"/>';
  o+='<text x="'+W/2+'" y="40" text-anchor="middle" font-size="26" font-weight="700" fill="#111" font-family="Noto Sans KR,sans-serif">'+esc(score.name)+'</text>';
  if(score.sub) o+='<text x="'+W/2+'" y="60" text-anchor="middle" font-size="14" fill="#444" font-family="Noto Sans KR,sans-serif">'+esc(score.sub)+'</text>';
  if(score.lyr) o+='<text x="'+(W-MARG)+'" y="44" text-anchor="end" font-size="13" fill="#444" font-family="Noto Sans KR,sans-serif">'+esc(score.lyr)+'</text>';
  if(score.cpy) o+='<text x="'+W/2+'" y="'+(h-6)+'" text-anchor="middle" font-size="10" fill="#666" font-family="Noto Sans KR,sans-serif">'+esc(score.cpy)+'</text>';
  if(score.composer) o+='<text x="'+(W-MARG)+'" y="62" text-anchor="end" font-size="13" fill="#444" font-family="Noto Sans KR,sans-serif">'+esc(score.composer)+'</text>';
  o+='<text x="'+MARG+'" y="62" font-size="12" fill="#444" font-family="Noto Sans KR,sans-serif">♩ = '+score.tempo+'</text>';
  var np=score.parts.length, ns=score.parts.filter(function(q,i){ return !isV2(i); }).length, hit='', REHL={}, rn=0; Object.keys(score.mk||{}).map(Number).sort(function(a,b){ return a-b; }).forEach(function(k){ if(score.mk[k]&&score.mk[k].reh) REHL[k]=String.fromCharCode(65+(rn++%26)); });
  L.sys.forEach(function(s,si){
    var topAll=staffY(si,0), botAll=staffY(si,np-1)+STAFF;
    score.parts.forEach(function(part,pi){
      var top=staffY(si,pi), xs=s.x0+(s.first?0:0), xe=s.x1, V=isV2(pi);
      if(score.pl&&s.first&&!V) o+='<text x="'+(s.x0+36)+'" y="'+(top-6)+'" font-size="10" font-weight="700" fill="#777" font-family="Noto Sans KR,sans-serif">'+esc(part.name)+'</text>';
      if(!V) for(var l=0;l<5;l++) o+='<line x1="'+s.x0+'" y1="'+(top+l*10)+'" x2="'+xe+'" y2="'+(top+l*10)+'" stroke="#222" stroke-width="1"/>';
      if(part.tab&&!V){ var tn=(TUN[part.tab]||TUN.gtr).length, tyy=top+STAFF+60; for(var tl=0;tl<tn;tl++) o+='<line x1="'+s.x0+'" y1="'+(tyy+tl*8)+'" x2="'+xe+'" y2="'+(tyy+tl*8)+'" stroke="#222" stroke-width="1"/>'; o+='<line x1="'+s.x0+'" y1="'+tyy+'" x2="'+s.x0+'" y2="'+(tyy+(tn-1)*8)+'" stroke="#222" stroke-width="1.6"/>'; ['T','A','B'].forEach(function(ch,ci){ o+='<text x="'+(s.x0+16)+'" y="'+(tyy+(tn-1)*4-10+ci*12+4)+'" text-anchor="middle" font-size="12" font-weight="800" fill="#111" font-family="Noto Sans KR,sans-serif">'+ch+'</text>'; }); }
      if(pi===cur.part) o+='<rect x="'+(s.x0-6)+'" y="'+(top-8)+'" width="4" height="'+(STAFF+16)+'" fill="#2ec4b6" opacity=".7"/>';
      var x=s.x0+8; if(!V) o+=clefSvg(part.clef,x+10,top); x+=34;
      // key
      var ksp=KSP[part.clef==='treble8'?'treble':part.clef]||KSP.treble, posS=ksp[0], posFl=ksp[1];
      var hk=keyAt(s.ms[0].i);
      for(var k=0;k<(part.clef==='drum'||V?0:Math.abs(hk));k++){ var pp=hk>0?posS[k]:posFl[k];
        o+='<text x="'+(x+k*10)+'" y="'+(top+STAFF-pp*5+5)+'" font-size="17" fill="#111">'+(hk>0?'♯':'♭')+'</text>'; }
      x+=(part.clef==='drum'?0:Math.abs(hk))*10+4;
      if(s.first&&!V){ o+='<text x="'+(x+4)+'" y="'+(top+17)+'" text-anchor="middle" font-size="22" font-weight="700" fill="#111" font-family="Oswald,sans-serif">'+score.ts[0]+'</text><text x="'+(x+4)+'" y="'+(top+37)+'" text-anchor="middle" font-size="22" font-weight="700" fill="#111" font-family="Oswald,sans-serif">'+score.ts[1]+'</text>'; }
      s.ms.forEach(function(m){
        var pc=L.pcs[pi][m.i]||[], accSeen={};
        var mm=(score.mk||{})[m.i]||{}, xr=m.x+m.W;
        if(V){} else if(mm.re){ o+='<line x1="'+xr+'" y1="'+top+'" x2="'+xr+'" y2="'+(top+STAFF)+'" stroke="#222" stroke-width="3"/><line x1="'+(xr-5)+'" y1="'+top+'" x2="'+(xr-5)+'" y2="'+(top+STAFF)+'" stroke="#222" stroke-width="1"/><circle cx="'+(xr-11)+'" cy="'+(top+15)+'" r="2" fill="#222"/><circle cx="'+(xr-11)+'" cy="'+(top+25)+'" r="2" fill="#222"/>'; }
        else o+='<line x1="'+xr+'" y1="'+top+'" x2="'+xr+'" y2="'+(top+STAFF)+'" stroke="#222" stroke-width="'+(m.i===L.ms.length-1?2.2:1)+'"/>';
        if(part.tab&&!V){ var tb=(TUN[part.tab]||TUN.gtr).length, tby=top+STAFF+60; o+='<line x1="'+xr+'" y1="'+tby+'" x2="'+xr+'" y2="'+(tby+(tb-1)*8)+'" stroke="#222"/>'; }
        if(mm.rs&&!V){ o+='<line x1="'+(m.x+1)+'" y1="'+top+'" x2="'+(m.x+1)+'" y2="'+(top+STAFF)+'" stroke="#222" stroke-width="3"/><line x1="'+(m.x+6)+'" y1="'+top+'" x2="'+(m.x+6)+'" y2="'+(top+STAFF)+'" stroke="#222" stroke-width="1"/><circle cx="'+(m.x+12)+'" cy="'+(top+15)+'" r="2" fill="#222"/><circle cx="'+(m.x+12)+'" cy="'+(top+25)+'" r="2" fill="#222"/>'; }
        if(m.kx&&part.clef!=='drum'&&!V){ var mkk=keyAt(m.i); for(var k2=0;k2<Math.abs(mkk);k2++){ var pp2=mkk>0?posS[k2]:posFl[k2]; o+='<text x="'+(m.x+6+k2*10)+'" y="'+(top+STAFF-pp2*5+5)+'" font-size="17" fill="#111">'+(mkk>0?'♯':'♭')+'</text>'; } if(!mkk) o+='<text x="'+(m.x+8)+'" y="'+(top+STAFF-ksp[0][0]*5+5)+'" font-size="17" fill="#111">♮</text>'; }
        if(m.tx&&!V){ var tsn=tsAt(m.i), tcx=m.x+((m.kx||0)+16)*s.k; o+='<text x="'+f(tcx)+'" y="'+(top+17)+'" text-anchor="middle" font-size="22" font-weight="700" fill="#111" font-family="Oswald,sans-serif">'+tsn[0]+'</text><text x="'+f(tcx)+'" y="'+(top+37)+'" text-anchor="middle" font-size="22" font-weight="700" fill="#111" font-family="Oswald,sans-serif">'+tsn[1]+'</text>'; }
        if(pi===0&&!V&&((score.mn===2)||(score.mn===1&&m===s.ms[0]&&si>0))) o+='<text x="'+(m.x+3)+'" y="'+(top-5)+'" font-size="10" font-style="italic" fill="#666" font-family="Georgia,serif">'+(m.i+1)+'</text>';
        if(pi===0&&(mm.txt||mm.reh)){ var rx=m.x+6; if(mm.reh){ o+='<rect x="'+(m.x+3)+'" y="'+(top-41)+'" width="19" height="18" fill="none" stroke="#111" stroke-width="1.6"/><text x="'+(m.x+12.5)+'" y="'+(top-27)+'" text-anchor="middle" font-size="14" font-weight="700" fill="#111" font-family="Noto Sans KR,sans-serif">'+esc(REHL[m.i]||'')+'</text>'; rx=m.x+28; } if(mm.txt) o+='<text x="'+rx+'" y="'+(top-27)+'" font-size="13" font-weight="700" font-style="italic" fill="#111" font-family="Georgia,Noto Sans KR,serif">'+esc(mm.txt)+'</text>'; }
        if(pi===0){ var LJ=[['segno','Segno'],['coda','Coda']], RJ=[['tocoda','To Coda'],['ds','D.S.'],['dc','D.C.'],['fine','Fine']], jt='', ky; LJ.forEach(function(j){ if(mm[j[0]]) o+='<text x="'+(m.x+5)+'" y="'+(top-45)+'" font-size="12" font-weight="700" font-style="italic" fill="#111" font-family="Georgia,serif">'+j[1]+'</text>'; }); RJ.forEach(function(j){ if(mm[j[0]]) jt+=(jt?'  ':'')+j[1]; }); if(jt) o+='<text x="'+(m.x+m.W-4)+'" y="'+(top-45)+'" text-anchor="end" font-size="12" font-weight="700" font-style="italic" fill="#111" font-family="Georgia,serif">'+jt+'</text>'; }
        if(pi===0&&mm.tempo) o+='<text x="'+(m.x+6)+'" y="'+(top-10)+'" font-size="12" font-weight="700" fill="#111" font-family="Noto Sans KR,sans-serif">♩='+mm.tempo+'</text>';
        if(pi===0&&mm.volta) o+='<path d="M'+(m.x+3)+' '+(top-8)+'V'+(top-22)+'H'+(m.x+m.W-3)+'" fill="none" stroke="#222"/><text x="'+(m.x+7)+'" y="'+(top-11)+'" font-size="11" fill="#111" font-family="Noto Sans KR,sans-serif">'+mm.volta+'.</text>';
        if(pi===cur.part&&cur.m===m.i) o+='<rect x="'+m.x+'" y="'+(top-4)+'" width="'+m.W+'" height="'+(STAFF+8)+'" fill="#2ec4b6" opacity=".07" pointer-events="none"/>';
        if(pc.length===0&&!V) o+=restSvg(64,m.x+m.W/2,top,false);
        o+=piecesSvg(part,pi,m,pc,top,accSeen);
        // click area per measure
        if(!V) hit+='<rect x="'+m.x+'" y="'+(top-22)+'" width="'+m.W+'" height="'+(STAFF+44)+'" fill="transparent" data-m="'+m.i+'" data-p="'+pi+'"/>';
      });
      o+=hairpinSvg(part,s,top)+ottavaSvg(part,s,top);
    });
    if(ns>1){ o+='<line x1="'+s.x0+'" y1="'+topAll+'" x2="'+s.x0+'" y2="'+botAll+'" stroke="#222" stroke-width="2"/>'; o+='<path d="M'+(s.x0-5)+' '+topAll+'q-8 0 -8 8v'+(botAll-topAll-16)+'q0 8 8 8" fill="none" stroke="#222" stroke-width="2.4"/>'; }
  });
  sheet.innerHTML=o+'<g id="phl" pointer-events="none"></g><g id="hits">'+hit+'</g><line id="pcur" x1="0" y1="0" x2="0" y2="0" stroke="#e8453c" stroke-width="2" opacity="0"/>';
  $('zl').textContent=Math.round(zoom*100)+'%';
  $('bUndo').disabled=hi<=0; $('bRedo').disabled=hi>=hist.length-1; $('bUndo').title='되돌리기 (Ctrl+Z) · '+hi+'단계'; $('bRedo').title='다시 (Ctrl+Y) · '+(hist.length-1-hi)+'단계'; sheet.setAttribute('aria-label','악보 \''+score.name+'\' · 파트 '+score.parts.length+'개 · '+L.ms.length+'마디');
}
function clefSvg(clef,x,top){
  // origin on the clef's own line: G line (treble), F line (bass) or middle line (alto); 10px staff spacing
  if(clef==='bass') return '<g transform="translate('+x+' '+(top+10)+')"><path fill="#111" d="M-6 -4.6C2 -8 14 -4.5 14 6C14 18 3 27 -12 33L-12.6 31.4C-1 25 6 16 6 6C6 -1 2 -3 -1.5 -1.2A4.3 4.3 0 1 1 -6 -4.6Z"/><circle cx="17" cy="-5" r="1.9" fill="#111"/><circle cx="17" cy="5" r="1.9" fill="#111"/></g>';
  if(clef==='drum') return '<g fill="#111"><rect x="'+(x-6)+'" y="'+(top+12)+'" width="4.5" height="16"/><rect x="'+(x+2)+'" y="'+(top+12)+'" width="4.5" height="16"/></g>';
  if(clef==='alto') return '<g transform="translate('+x+' '+(top+20)+')" fill="#111"><rect x="-9" y="-20" width="4" height="40"/><rect x="-3" y="-20" width="1.3" height="40"/><path fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round" d="M0.5 -1.2C2 -8 5 -14.5 10 -14.5C15.5 -14.5 15.5 -7 11 -6.2C8.2 -5.8 6.2 -6.6 5.2 -7.8M0.5 1.2C2 8 5 14.5 10 14.5C15.5 14.5 15.5 7 11 6.2C8.2 5.8 6.2 6.6 5.2 7.8"/></g>';
  var g='<g transform="translate('+x+' '+(top+30)+')" fill="none" stroke="#111" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 25.5C3.5 30 -3 31 -4.5 27C-5.5 24 -2 22 0 23.5C1.2 24.5 1 26 0 26.2M0 23.6C1.6 12 -0.6 -2 -1.4 -12C-2 -22 -1.6 -31 3 -38.5C7.5 -32 6.5 -24 0.5 -15C-4 -8.5 -9.5 -4 -8.5 2.5C-7.6 8.5 -2.6 11.6 2.6 11.2C8.6 10.7 11.4 5.8 10 1C8.6 -3.6 3.6 -5.6 0 -4.2C-3 -3 -3.6 1.6 -0.8 3C1.2 4 3.2 2.4 2.8 0.6"/></g>';
  if(clef==='treble8') g+='<text x="'+(x+1)+'" y="'+(top+72)+'" text-anchor="middle" font-size="12" font-weight="700" fill="#111" font-family="Noto Sans KR,sans-serif">8</text>';
  return g;
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
function headSvg(x,y,d,c){ var open=d>=32&&c==='#111'||d>=32&&c==='#e8453c';
  return '<ellipse cx="'+f(x)+'" cy="'+f(y)+'" rx="6" ry="4.3" transform="rotate(-22 '+f(x)+' '+f(y)+')" fill="'+(open?'#fff':c)+'" stroke="'+c+'" stroke-width="'+(open?1.8:1)+'"/>'+(d>=64?'<ellipse cx="'+f(x)+'" cy="'+f(y)+'" rx="2.2" ry="4.6" transform="rotate(-8 '+f(x)+' '+f(y)+')" fill="'+c+'" opacity="0"/>':'');
}
var NPAL=['#e53935','#fb8c00','#fdd835','#43a047','#1e88e5','#5c6bc0','#8e24aa'], NTXT=['#fff','#111','#111','#fff','#fff','#fff','#fff'], SOL=['도','레','미','파','솔','라','시'];
function dotted(d){ return d===48||d===24||d===12||d===6; }
function baseDur(d){ if(dotted(d)) return d*2/3; if(Math.abs(d-Math.round(d))>1e-3){ var b=Math.round(d*1.5); if(b>=4) return b; } return d; }

function evStarts(part){ var t=0, r=[]; part.ev.forEach(function(e){ r.push(t); t+=e.d; }); r.total=t; return r; }
function ovList(part){ var c=0, out=[]; part.ev.forEach(function(e){ if(e.ov!=null) c=+e.ov||0; out.push(c); }); return out; }
function ovSpans(part){ var T=evStarts(part), n=part.ev.length, out=[]; part.ev.forEach(function(e,i){ if(!e.ov) return; var j=i+1; while(j<n&&part.ev[j].ov==null) j++; out.push({v:+e.ov,T0:T[i],T1:j<n?T[j]:T.total}); }); return out; }
function pedRing(part){ var T=evStarts(part), n=part.ev.length, out=[], on=false, nxt=[], t=T.total; for(var i=n-1;i>=0;i--){ nxt[i]=t; if(part.ev[i].ped) t=T[i]; }
  part.ev.forEach(function(e,i){ if(e.ped==='d') on=true; else if(e.ped==='u') on=false; out.push(on?nxt[i]-T[i]:0); }); return out; }
function ottavaSvg(part,s,top){ var o='', last=s.ms[s.ms.length-1], ts=mstart(s.ms[0].i), te=mstart(last.i+1);
  ovSpans(part).forEach(function(h){ if(h.T1<=ts+.001||h.T0>=te-.001||h.T1<=h.T0||!h.v) return; var a=Math.max(h.T0,ts), b=Math.min(h.T1,te), up=h.v>0, y=up?top-28:top+STAFF+14;
    var xa=a===h.T0?timeX(a).x-8:s.ms[0].x+4, xb=b===h.T1?timeX(Math.min(b,te-.001)).x-6:last.x+last.W-4; if(xb<xa+10) xb=xa+10;
    o+='<text x="'+xa+'" y="'+(y+4)+'" font-size="12" font-style="italic" font-weight="700" fill="#111" font-family="Georgia,serif">'+(up?'8va':'8vb')+'</text><path d="M'+(xa+26)+' '+y+'H'+xb+(b===h.T1?'v'+(up?8:-8):'')+'" fill="none" stroke="#111" stroke-width="1.2" stroke-dasharray="4 3"/>'; });
  return o; }
function hairpins(part){ var T=evStarts(part), n=part.ev.length, out=[]; part.ev.forEach(function(e,i){ if(!e.hp) return; var j=i+1; while(j<n&&!part.ev[j].dyn&&!part.ev[j].hp) j++; out.push({type:e.hp,i0:i,i1:j,T0:T[i],T1:j<n?T[j]:T.total,hasDyn:!!e.dyn,endDyn:j<n&&!!part.ev[j].dyn}); }); return out; }
function dynFactors(part){ var n=part.ev.length, out=[], dyn=null, T=evStarts(part); part.ev.forEach(function(e){ if(e.dyn) dyn=e.dyn; out.push(dynF(dyn)); });
  hairpins(part).forEach(function(h){ var v0=out[h.i0], v1=h.i1<n&&part.ev[h.i1].dyn?dynF(part.ev[h.i1].dyn):(h.type==='cr'?v0*1.6:v0/1.6), span=Math.max(1,h.T1-h.T0); for(var i=h.i0;i<h.i1;i++) out[i]=v0+(v1-v0)*((T[i]-h.T0)/span); }); return out; }
function hairpinSvg(part,s,top){ var o='', last=s.ms[s.ms.length-1], ts=mstart(s.ms[0].i), te=mstart(last.i+1), y=top+STAFF+22, A=6;
  hairpins(part).forEach(function(h){ if(h.T1<=ts+.001||h.T0>=te-.001||h.T1<=h.T0) return; var a=Math.max(h.T0,ts), b=Math.min(h.T1,te);
    var xa=a===h.T0?timeX(a).x+(h.hasDyn?14:-4):s.ms[0].x+4, xb=b===h.T1?timeX(Math.min(b,te-.001)).x-(h.endDyn?14:8):last.x+last.W-4; if(xb<xa+8) return;
    var fa=(a-h.T0)/(h.T1-h.T0), fb=(b-h.T0)/(h.T1-h.T0), ha=h.type==='cr'?Math.max(.5,A*fa):A*(1-fa), hb=h.type==='cr'?A*fb:Math.max(.5,A*(1-fb));
    o+='<path d="M'+f(xa)+' '+f(y-ha)+'L'+f(xb)+' '+f(y-hb)+'M'+f(xa)+' '+f(y+ha)+'L'+f(xb)+' '+f(y+hb)+'" fill="none" stroke="#111" stroke-width="1.3"/>'; });
  return o; }
var DYN_F={ppp:.2,fff:1.25,sfz:1.2,pp:.35,p:.5,mp:.65,mf:.8,f:.95,ff:1.1};
function dynF(d){ return d&&DYN_F[d]?DYN_F[d]/.8:1; }
function decoSvg(part,m,c,it,top,items,minP,maxP){
  var ev=part.ev[c.ev]; if(!ev) return ''; var o='', x=it.x, col=it.sel?'#e8453c':'#111', F='font-family="Noto Sans KR,sans-serif"';
  if(ev.ch) o+='<text x="'+x+'" y="'+(top-14)+'" text-anchor="middle" font-size="13" font-weight="700" fill="#111" '+F+'>'+esc(ev.ch)+'</text>';
  if(ev.dyn) o+='<text x="'+x+'" y="'+(top+STAFF+28)+'" text-anchor="middle" font-size="16" font-weight="700" font-style="italic" fill="#111" font-family="Georgia,serif">'+esc(ev.dyn)+'</text>';
  if(ev.fg) o+='<text x="'+(x-(c.p.length>1?0:0))+'" y="'+(it.up?noteY(top,part,minP)+21:noteY(top,part,maxP)-13)+'" text-anchor="middle" font-size="11" font-style="italic" font-weight="700" fill="#b00" '+F+'>'+esc(ev.fg)+'</text>';
  if(ev.ly2) o+='<text x="'+x+'" y="'+(top+STAFF+(ev.dyn?59:47))+'" text-anchor="middle" font-size="13" fill="#222" '+F+'>'+esc(ev.ly2)+'</text>';
  if(ev.ly) o+='<text x="'+x+'" y="'+(top+STAFF+(ev.dyn?45:33))+'" text-anchor="middle" font-size="13" fill="#222" '+F+'>'+esc(ev.ly)+'</text>';
  var ay=it.up?noteY(top,part,minP)+10:noteY(top,part,maxP)-10;
  if(ev.art==='stac') o+='<circle cx="'+x+'" cy="'+ay+'" r="2" fill="'+col+'"/>';
  else if(ev.art==='acc') o+='<path d="M'+(x-5)+' '+(ay-3.5)+'L'+(x+5)+' '+ay+'L'+(x-5)+' '+(ay+3.5)+'" fill="none" stroke="'+col+'" stroke-width="1.8"/>';
  else if(ev.art==='ten') o+='<line x1="'+(x-5)+'" y1="'+ay+'" x2="'+(x+5)+'" y2="'+ay+'" stroke="'+col+'" stroke-width="2"/>';
  else if(ev.art==='ferm') o+='<path d="M'+(x-9)+' '+(top-4)+'Q'+x+' '+(top-17)+' '+(x+9)+' '+(top-4)+'" fill="none" stroke="'+col+'" stroke-width="1.8"/><circle cx="'+x+'" cy="'+(top-6)+'" r="1.8" fill="'+col+'"/>';
  if(ev.art==='marc') o+='<path d="M'+(x-5)+' '+(ay+3.5)+'L'+x+' '+(ay-4)+'L'+(x+5)+' '+(ay+3.5)+'" fill="none" stroke="'+col+'" stroke-width="1.8"/>';
  if(ev.art==='mord') o+='<path d="M'+(x-8)+' '+(top-6)+'l3 -4 3 4 3 -4 3 4 3 -4 3 4" fill="none" stroke="'+col+'" stroke-width="1.6"/>';
  if(ev.art==='arp'&&c.p.length>1){ var ya=noteY(top,part,maxP)-5, yb2=noteY(top,part,minP)+5, ax=x-17, pth='M'+ax+' '+yb2; for(var yy=yb2;yy>ya;yy-=6) pth+='q4 -1.5 0 -3 q-4 -1.5 0 -3'; o+='<path d="'+pth+'" fill="none" stroke="'+col+'" stroke-width="1.3"/>'; }
  if(ev.art==='trem'){ var tsx=x+(it.up?5.6:-5.6), tsy=it.up?noteY(top,part,minP)-17:noteY(top,part,maxP)+17; for(var tq=-1;tq<=1;tq++) o+='<line x1="'+(tsx-5)+'" y1="'+(tsy+tq*4+2.5)+'" x2="'+(tsx+5)+'" y2="'+(tsy+tq*4-2.5)+'" stroke="'+col+'" stroke-width="2"/>'; }
  if(ev.art==='turn') o+='<path d="M'+(x-9)+' '+(top-5)+'c0 -6 6 -6 9 -2.5s9 3.5 9 -2.5" fill="none" stroke="'+col+'" stroke-width="1.8"/>';
  if(ev.art==='dbow') o+='<path d="M'+(x-5)+' '+(top-3)+'V'+(top-11)+'H'+(x+5)+'V'+(top-3)+'" fill="none" stroke="'+col+'" stroke-width="1.7"/>';
  if(ev.art==='ubow') o+='<path d="M'+(x-5)+' '+(top-12)+'L'+x+' '+(top-3)+'L'+(x+5)+' '+(top-12)+'" fill="none" stroke="'+col+'" stroke-width="1.7"/>';
  if(ev.ped) o+='<text x="'+x+'" y="'+(top+STAFF+(part.tab?70:76))+'" text-anchor="middle" font-size="'+(ev.ped==='d'?13:16)+'" font-style="italic" font-weight="700" fill="#555" font-family="Georgia,serif">'+(ev.ped==='d'?'Ped.':'\u2731')+'</text>';
  if(ev.art==='tr') o+='<text x="'+x+'" y="'+(top-8)+'" text-anchor="middle" font-size="14" font-weight="700" font-style="italic" fill="'+col+'" font-family="Georgia,serif">tr</text>';
  if(ev.slur){ var idx=items.indexOf(it), nx=null, want=ev.slur===true?1:(+ev.slur||1); for(var k=idx+1;k<items.length;k++) if(items[k].c.p.length){ nx=items[k]; if(--want<=0) break; }
    var sg=it.up?1:-1, y1=sg>0?noteY(top,part,minP)+11:noteY(top,part,maxP)-11, x2=nx?nx.x:(m.x+m.W-8), y2=y1;
    if(nx){ var np=nx.poss; y2=sg>0?noteY(top,part,Math.min.apply(0,np))+11:noteY(top,part,Math.max.apply(0,np))-11; }
    o+='<path d="M'+(x+2)+' '+y1+' Q'+((x+x2)/2)+' '+(Math.max(y1,y2)+sg*12)+' '+(x2-2)+' '+y2+'" fill="none" stroke="'+col+'" stroke-width="1.7"/>'; }
  return o;
}
var TUN={gtr:[64,59,55,50,45,40],bass:[43,38,33,28]};
function tabAssign(part,ps){ var tun=TUN[part.tab]||TUN.gtr, ms=ps.map(function(p){ return midi(p)+trOf(part); }).sort(function(a,b){ return b-a; }), used={}, out=[];
  ms.forEach(function(m){ for(var i=0;i<tun.length;i++){ var fr=m-tun[i]; if(fr>=0&&fr<=22&&!used[i]){ used[i]=1; out.push({str:i,fret:fr}); break; } } }); return out; }
function tabSvg(part,items,top){ var ty=top+STAFF+60, o='';
  items.forEach(function(it){ if(!it.c.p.length||!it.c.first) return; tabAssign(part,it.c.p).forEach(function(a){ var y=ty+a.str*8; o+='<rect x="'+f(it.x-5.5)+'" y="'+f(y-5)+'" width="11" height="10" fill="#fff"/><text x="'+f(it.x)+'" y="'+f(y+4)+'" text-anchor="middle" font-size="12" font-weight="700" fill="'+(it.sel?'#e8453c':'#111')+'" font-family="Noto Sans KR,sans-serif">'+a.fret+'</text>'; }); }); return o; }
function piecesSvg(part,pi,m,pc,top,accSeen){
  keyCtx=keyAt(m.i); var v2p=isV2(pi), grpN=groupOf(pi).length;
  var o='', beat=beatLen(m.i);
  var mid=4; // middle line (steps above the bottom line): notes on or above it get stems down
  var items=pc.map(function(c){
    var x=slotX(m,c.t), sel=inSel(pi,c.ev);
    var poss=c.p.map(function(p){ return ypos(part,p.s,p.o); }), avg=poss.length?(Math.min.apply(0,poss)+Math.max.apply(0,poss))/2:0;
    return {c:c,x:x,sel:sel,poss:poss,up:v2p?false:(grpN>1?true:(poss.length?(avg<mid):true)),bd:baseDur(c.d)};
  });
  // beams
  var groups=[], gcur=null;
  items.forEach(function(it,i){ var ok=it.c.p.length&&it.bd<=8; if(ok){ if(gcur&&Math.floor(gcur[gcur.length-1].c.t/beat)===Math.floor(it.c.t/beat)) gcur.push(it); else{ gcur=[it]; groups.push(gcur); } } else gcur=null; });
  var inBeam={}; groups.forEach(function(g){ if(g.length>1){ var ups=g.filter(function(x){ return x.up; }).length>g.length/2; g.forEach(function(x){ x.up=v2p?false:(grpN>1?true:ups); x.beam=g; }); } });
  items.forEach(function(it){
    var c=it.c, col=it.sel?'#e8453c':'#111', x=it.x;
    if(!c.p.length){ o+=restSvg(it.bd,x,top+(v2p?14:0),it.sel); return; }
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
      var hc=(score.nc&&!it.sel&&part.clef!=='drum')?NPAL[p.s]:col; if(part.clef==='drum'&&midi(p)>=77) o+='<path d="M'+f(hx-5)+' '+f(y-5)+'L'+f(hx+5)+' '+f(y+5)+'M'+f(hx-5)+' '+f(y+5)+'L'+f(hx+5)+' '+f(y-5)+'" stroke="'+col+'" stroke-width="1.9" fill="none"/>'; else o+=headSvg(hx,y,baseDur(c.d)>=64?64:(baseDur(c.d)>=32?32:16),hc);
      if(score.nn&&c.first&&part.clef!=='drum'){ var nopen=baseDur(c.d)>=32, ntxt=score.nn===2?SOL[p.s]:STEPS[p.s]; o+='<text x="'+f(hx)+'" y="'+f(y+3)+'" text-anchor="middle" font-size="'+(score.nn===2?8.5:8)+'" font-weight="800" fill="'+((nopen&&!(score.nc&&!it.sel))?'#111':(score.nc&&!it.sel?NTXT[p.s]:'#fff'))+'" font-family="Noto Sans KR,sans-serif" pointer-events="none">'+ntxt+'</text>'; }
      // accidental
      var key=p.s+'_'+p.o, want=p.a, have=accSeen[key]!=null?accSeen[key]:keyAlter(p.s);
      if(c.first&&want!==have&&part.clef!=='drum'){ o+='<text x="'+(x-17+Math.min(0,dx[i]))+'" y="'+(y+5)+'" font-size="16" fill="'+col+'" text-anchor="middle">'+ACC_G[want]+'</text>'; accSeen[key]=want; } else if(c.first) accSeen[key]=want;
      if(dotted(c.d)) o+='<circle cx="'+(hx+11)+'" cy="'+(y+((it.poss[i]%2===0)?-4:0))+'" r="1.8" fill="'+col+'"/>';
    });
    if(it.bd<64){
      var edge=it.up?maxP:minP, nearP=it.up?minP:maxP, sx=x+(it.up?5.6:-5.6), y0=noteY(top,part,nearP), y1;
      if(it.beam){ it.sx=sx; it.y0=y0; return; }
      y1=noteY(top,part,edge)+(it.up?-32:32); if(it.up&&y1>top+14) y1=top+14; if(!it.up&&y1<top+26) y1=top+26;
      o+='<line x1="'+sx+'" y1="'+y0+'" x2="'+sx+'" y2="'+y1+'" stroke="'+col+'" stroke-width="1.4"/>';
      if(it.bd<=8){ var dir=it.up?1:-1; o+='<path d="M'+sx+' '+y1+' c'+(10)+' '+(dir*8)+' '+(8)+' '+(dir*18)+' '+(2)+' '+(dir*24)+(it.bd<=4?' M'+sx+' '+(y1+dir*7)+' c10 '+(dir*8)+' 8 '+(dir*18)+' 2 '+(dir*24):'')+'" fill="none" stroke="'+col+'" stroke-width="1.8"/>'; }
    }
    if(c.tieNext){ var idxT=items.indexOf(it), nxT=items[idxT+1], x2t=nxT&&nxT.c.p.length?nxT.x-5:(m.x+m.W-6); if(x2t<x+16) x2t=x+30; it.poss.forEach(function(pn){ var ty=noteY(top,part,pn)+(it.up?9:-9); o+='<path d="M'+f(x+4)+' '+f(ty)+' Q'+f((x+4+x2t)/2)+' '+f(ty+(it.up?8:-8))+' '+f(x2t)+' '+f(ty)+'" fill="none" stroke="'+col+'" stroke-width="1.6"/>'; }); }
  });
  groups.forEach(function(g){ if(g.length<2) return; var up=g[0].up, ys=g.map(function(it){ var minP=Math.min.apply(0,it.poss), maxP=Math.max.apply(0,it.poss); return noteY(top,part,up?maxP:minP)+(up?-32:32); });
    var by=up?Math.min.apply(0,ys):Math.max.apply(0,ys); if(up&&by>top+10) by=top+10; if(!up&&by<top+30) by=top+30;
    g.forEach(function(it){ var near=noteY(top,part,up?Math.min.apply(0,it.poss):Math.max.apply(0,it.poss)); var sx=it.x+(up?5.6:-5.6); o+='<line x1="'+sx+'" y1="'+near+'" x2="'+sx+'" y2="'+by+'" stroke="'+(it.sel?'#e8453c':'#111')+'" stroke-width="1.4"/>'; });
    var x0=g[0].x+(up?5.6:-5.6), x1=g[g.length-1].x+(up?5.6:-5.6), t=4, dy=up?0:-t;
    o+='<rect x="'+x0+'" y="'+(by+dy)+'" width="'+(x1-x0)+'" height="'+t+'" fill="#111"/>';
    // 16th: second beam on runs of 16ths
    var i=0; while(i<g.length){ if(g[i].bd<=4){ var j=i; while(j+1<g.length&&g[j+1].bd<=4) j++; var xa=g[i].x+(up?5.6:-5.6), xb=g[j].x+(up?5.6:-5.6); if(i===j){ xb=i>0?xa:xa+8; xa=i>0?xa-8:xa; } o+='<rect x="'+xa+'" y="'+(by+dy+(up?7:-7))+'" width="'+(xb-xa)+'" height="'+t+'" fill="#111"/>'; i=j+1; } else i++; }
  });
  // incoming tie from the previous measure
  if(m.i>0&&items.length&&items[0].c.p.length){ var pm=L.pcs[pi][m.i-1]||[], lp=pm[pm.length-1]; if(lp&&lp.tieNext&&lp.p.length){ var f0=items[0]; f0.poss.forEach(function(pn){ var ty=noteY(top,part,pn)+(f0.up?9:-9); o+='<path d="M'+f(m.x+3)+' '+f(ty)+' Q'+f((m.x+3+f0.x-5)/2)+' '+f(ty+(f0.up?8:-8))+' '+f(f0.x-5)+' '+f(ty)+'" fill="none" stroke="#111" stroke-width="1.6"/>'; }); } }
  // tuplet brackets
  var run=[]; function flushTup(){ for(var a=0;a<run.length;a+=3){ var g=run.slice(a,a+3); if(g.length<2) continue; var up=g[0].up, ys=[]; g.forEach(function(it){ if(it.poss.length){ var mn=Math.min.apply(0,it.poss), mx=Math.max.apply(0,it.poss); ys.push(up?noteY(top,part,mx)-(it.bd<64?36:10):noteY(top,part,mn)+(it.bd<64?36:10)); } });
      var yb=up?Math.min.apply(0,ys.concat([top-6])):Math.max.apply(0,ys.concat([top+STAFF+8])), x0=g[0].x-7, x1=g[g.length-1].x+7, xm=(x0+x1)/2, sg=up?1:-1;
      o+='<path d="M'+f(x0)+' '+f(yb+5*sg)+'V'+f(yb)+'H'+f(xm-7)+'M'+f(xm+7)+' '+f(yb)+'H'+f(x1)+'V'+f(yb+5*sg)+'" fill="none" stroke="#111" stroke-width="1.2"/><text x="'+f(xm)+'" y="'+f(yb+4)+'" text-anchor="middle" font-size="12" font-style="italic" font-weight="700" fill="#111" font-family="Georgia,serif">'+(g[0].c.tp||3)+'</text>'; } run=[]; }
  items.forEach(function(it){ if(it.c.tp&&it.c.first) run.push(it); else flushTup(); }); flushTup();
  // grace notes
  items.forEach(function(it){ var ev=part.ev[it.c.ev]; if(!ev||!ev.gr||!it.c.first||!ev.gr.length) return; var n=ev.gr.length, col=it.sel?'#e8453c':'#111';
    ev.gr.forEach(function(g,j){ var gx=it.x-13-(n-1-j)*10, gy=noteY(top,part,ypos(part,g.s,g.o)), gp=ypos(part,g.s,g.o);
      for(var lp=-1;lp>=gp;lp--) o+='<line x1="'+(gx-6)+'" y1="'+noteY(top,part,lp)+'" x2="'+(gx+6)+'" y2="'+noteY(top,part,lp)+'" stroke="#222"/>';
      for(var lq=9;lq<=gp;lq++) o+='<line x1="'+(gx-6)+'" y1="'+noteY(top,part,lq)+'" x2="'+(gx+6)+'" y2="'+noteY(top,part,lq)+'" stroke="#222"/>';
      o+='<ellipse cx="'+f(gx)+'" cy="'+f(gy)+'" rx="3.8" ry="2.9" transform="rotate(-22 '+f(gx)+' '+f(gy)+')" fill="'+col+'"/><line x1="'+f(gx+3.4)+'" y1="'+f(gy)+'" x2="'+f(gx+3.4)+'" y2="'+f(gy-17)+'" stroke="'+col+'" stroke-width="1.1"/><path d="M'+f(gx+3.4)+' '+f(gy-17)+'q4 3 3 8" fill="none" stroke="'+col+'" stroke-width="1.1"/><line x1="'+f(gx-2)+'" y1="'+f(gy-6)+'" x2="'+f(gx+9)+'" y2="'+f(gy-14)+'" stroke="'+col+'" stroke-width="1"/>';
      if(g.a&&g.a!==keyAlter(g.s)) o+='<text x="'+f(gx-8)+'" y="'+f(gy+4)+'" text-anchor="middle" font-size="11" fill="'+col+'">'+ACC_G[g.a]+'</text>'; }); });
  var tpp=v2p?score.parts[parentOf(pi)]:part; if(tpp.tab) o+=tabSvg({tab:tpp.tab,clef:part.clef},items,top);
  keyCtx=null; return o;
}

/* ---------- library (browser storage) ---------- */
var LIBK='ffscore.lib', libDel=null;
function libGet(){ try{ var a=JSON.parse(localStorage.getItem(LIBK)||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
function libSet(a){ try{ localStorage.setItem(LIBK,JSON.stringify(a)); return true; }catch(e){ toast('브라우저 저장 공간이 부족해요'); return false; } }
function libSave(){ var a=libGet(); score.libId=score.libId||Date.now().toString(36)+Math.random().toString(36).slice(2,5); var ent={id:score.libId,name:score.name,t:Date.now(),data:snap()}, i=a.map(function(x){ return x.id; }).indexOf(ent.id); if(i>=0) a[i]=ent; else a.unshift(ent); if(libSet(a)){ toast('보관함에 저장했어요'); panel(); } }
function libOpen(id){ var e=libGet().filter(function(x){ return x.id===id; })[0]; if(!e) return; try{ setScore(JSON.parse(e.data)); cur={part:0,idx:-1}; $('dname').value=score.name; commit(); toast('\''+score.name+'\'을(를) 열었어요'); }catch(x){ toast('이 악보를 열지 못했어요'); } }
/* ---------- history / save ---------- */
function snap(){ return JSON.stringify(score); }
function sanitize(o){ if(!o||typeof o!=='object'||Array.isArray(o)) throw 0;
  var ts=Array.isArray(o.ts)&&+o.ts[0]>0&&+o.ts[0]<=32&&[1,2,4,8,16].indexOf(+o.ts[1])>=0?[+o.ts[0],+o.ts[1]]:[4,4];
  o.ts=ts; o.tempo=Math.max(30,Math.min(300,+o.tempo||100)); o.key=Math.max(-6,Math.min(6,Math.round(+o.key||0))); o.name=String(o.name||'이름 없는 악보'); o.composer=String(o.composer||'');
  if(!o.mk||typeof o.mk!=='object'||Array.isArray(o.mk)) o.mk={};
  Object.keys(o.mk).forEach(function(k){ var q=o.mk[k]; if(!q||typeof q!=='object'){ delete o.mk[k]; return; } if(q.ts&&!(Array.isArray(q.ts)&&+q.ts[0]>0&&+q.ts[0]<=32&&[1,2,4,8,16].indexOf(+q.ts[1])>=0)) delete q.ts; });
  o.parts=(Array.isArray(o.parts)?o.parts:[]).slice(0,8).map(function(p){ p=p&&typeof p==='object'?p:{};
    var ev=(Array.isArray(p.ev)?p.ev:[]).filter(function(e){ return e&&typeof e==='object'; }).map(function(e){ var d=+e.d; if(!(d>0)||d>256) d=16; e.d=d; e.tie=!!e.tie; if(e.ov!=null&&[1,-1,0].indexOf(+e.ov)<0) delete e.ov; else if(e.ov!=null) e.ov=+e.ov; if(e.ped!=null&&e.ped!=='d'&&e.ped!=='u') delete e.ped;
      e.p=(Array.isArray(e.p)?e.p:[]).filter(function(q){ return q&&q.s>=0&&q.s<=6&&isFinite(q.o); }).map(function(q){ return {s:q.s|0,a:Math.max(-2,Math.min(2,q.a|0)),o:Math.max(0,Math.min(9,q.o|0))}; }); return e; });
    p.name=String(p.name||'파트'); p.clef=CLEFNB[p.clef]?p.clef:'treble'; p.inst=INSTS.some(function(x){ return x[0]===p.inst; })?p.inst:'piano'; p.vol=isFinite(+p.vol)?Math.max(0,Math.min(100,+p.vol)):80; p.mute=!!p.mute; p.ev=ev; p.v2=!!p.v2; if(p.trans!=null){ p.trans=Math.max(-24,Math.min(24,Math.round(+p.trans||0))); if(!p.trans) delete p.trans; } return p; });
  o.parts.forEach(function(p,i){ if(i===0) p.v2=false; else if(p.v2){ var j=i-1; while(j>0&&o.parts[j].v2) j--; p.clef=o.parts[j].clef; delete p.tab; } });
  return o; }
function setScore(o){ cur.end=-1; score=sanitize(o); if(!score.mk) score.mk={}; if(!score.parts||!score.parts.length) score.parts=[{name:'멜로디',clef:'treble',inst:'piano',vol:80,mute:false,ev:[]}]; if(cur.part>=score.parts.length) cur.part=0; }
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
function keyFor(part,idx){ return keyAt(mAt(startOf(part,idx))); }
function noteFromPos(part,pos){ var nb=nbOf(part), n=nb+pos, o=Math.floor(n/7), s=((n%7)+7)%7; return {s:s,o:o,a:ui.acc!=null?ui.acc:keyAlter(s)}; }
function locate(e){ var t=e.target, h=t.getAttribute&&t.getAttribute('data-m'); if(h==null) return null; var r=sheet.getBoundingClientRect(), x=(e.clientX-r.left)*W/r.width, y=(e.clientY-r.top)*(L.H+10)/r.height, pi=+t.getAttribute('data-p'), mi=+h, m=L.ms[mi], part=score.parts[pi], top=staffY(m.sys,pi); return {x:x,y:y,pi:pi,mi:mi,m:m,part:part,top:top,pos:Math.round((top+STAFF-y)/5)}; }
function findHit(q){ var grp=groupOf(q.pi); if(grp.indexOf(cur.part)>0) grp=[cur.part].concat(grp.filter(function(x){ return x!==cur.part; })); q.hitPi=null;
  for(var gi=0;gi<grp.length;gi++){ var pj=grp[gi], part=score.parts[pj], hitEv=-1, pc=L.pcs[pj][q.mi]||[];
    pc.forEach(function(c){ var cx=slotX(q.m,c.t); if(Math.abs(cx-q.x)<12&&c.p.length){ var near=c.p.some(function(p){ return Math.abs(noteY(q.top,part,ypos(part,p.s,p.o))-q.y)<8; }); if(near) hitEv=c.ev; } else if(Math.abs(cx-q.x)<12&&!c.p.length&&q.y>q.top&&q.y<q.top+STAFF) hitEv=c.ev; });
    if(hitEv>=0){ q.hitPi=pj; return hitEv; } }
  return -1; }
var drag=null, suppress=false;
sheet.addEventListener('click',function(e){
  if(suppress){ suppress=false; return; }
  var q=locate(e); if(!q) return; var pi=q.pi, mi=q.mi, m=q.m, part=q.part, x=q.x, pos=q.pos; cur.m=mi;
  var hitEv=findHit(q); keyCtx=keyAt(mi); if(hitEv>=0&&q.hitPi!=null){ pi=q.hitPi; part=score.parts[pi]; }
  if(hitEv>=0){ if(ui.chord&&!score.parts[pi].ev[hitEv].p.length===false&&cur.part===pi){ var ev=part.ev[hitEv], np=noteFromPos(part,pos); if(!ev.p.some(function(p){ return p.s===np.s&&p.o===np.o; })){ ev.p.push(np); cur.idx=hitEv; cur.end=-1; commit(); preview(np); return; } }
    if((e.shiftKey||ui.tool==='range')&&cur.part===pi&&cur.idx>=0){ cur.end=hitEv; draw(); panel(); return; }
    cur.part=pi; cur.idx=hitEv; cur.end=-1; draw(); panel(); return; }
  if(groupOf(pi).indexOf(cur.part)>=0){ pi=cur.part; part=score.parts[pi]; }
  if(ui.tool==='sel'||ui.tool==='range'){ cur.part=pi; cur.idx=-1; cur.end=-1; draw(); panel(); return; }
  // insert
  var best=0, bd=1e9; m.slots.forEach(function(sl){ var d=Math.abs(sl.ax-x); if(d<bd){ bd=d; best=sl.t; } });
  var T=mstart(mi)+best, ev2;
  if(ui.rest) ev2={p:[],d:newDur(),tie:false}; else { var np2=noteFromPos(part,pos); ev2={p:[np2],d:newDur(),tie:false}; preview(np2); }
  cur.part=pi; cur.end=-1; insertAtTime(pi,T,ev2); keyCtx=null; commit();
});
/* drag a note up/down to change its pitch (touch: only an already selected note, so the page can still scroll) */
sheet.addEventListener('pointerdown',function(e){
  if(e.button>0||ui.tool==='range') return; var q=locate(e); if(!q) return; var h=findHit(q); if(h>=0&&q.hitPi!=null){ q.pi=q.hitPi; q.part=score.parts[q.hitPi]; } if(h<0||!q.part.ev[h].p.length) return;
  if(e.pointerType==='touch'&&!(cur.part===q.pi&&cur.idx===h)) return;
  drag={q:q,h:h,pos0:q.pos,last:0,moved:false,orig:JSON.parse(JSON.stringify(q.part.ev[h].p)),touch:e.pointerType==='touch'};
});
window.addEventListener('pointermove',function(e){
  if(!drag) return; var r=sheet.getBoundingClientRect(), y=(e.clientY-r.top)*(L.H+10)/r.height, q=drag.q, pos=Math.round((q.top+STAFF-y)/5), d=pos-drag.pos0;
  if(!drag.moved&&Math.abs(e.clientY-(drag.cy==null?(drag.cy=e.clientY):drag.cy))<4&&d===0) return;
  if(d===drag.last) return; var ev=q.part.ev[drag.h]; drag.moved=true; drag.last=d;
  keyCtx=keyFor(q.part,drag.h); ev.p=JSON.parse(JSON.stringify(drag.orig)).map(function(p){ var n=p.o*7+p.s+d; p.o=Math.floor(n/7); p.s=((n%7)+7)%7; p.a=keyAlter(p.s); return p; }); keyCtx=null;
  cur.part=q.pi; cur.idx=drag.h; cur.end=-1; draw(); if(ev.p.length) preview(ev.p[0]);
});
function endDrag(){ if(!drag) return; var m=drag.moved; drag=null; if(m){ suppress=true; setTimeout(function(){ suppress=false; },60); commit(); } }
window.addEventListener('pointerup',endDrag); window.addEventListener('pointercancel',endDrag);
document.addEventListener('touchmove',function(e){ if(drag&&drag.touch&&e.cancelable) e.preventDefault(); },{passive:false});
function preview(p){ try{ audio(); playNote(instOf(curPart()),freq(midi(p)+trOf(curPart())),ctx.currentTime+0.01,0.4,0.6); }catch(e){} }
function selR(){ var p=curPart(); if(!p||cur.idx<0||!p.ev[cur.idx]) return null; var a=cur.idx, b=(cur.end>=0&&cur.end<p.ev.length)?cur.end:cur.idx; return a<=b?[a,b]:[b,a]; }
function inSel(pi,i){ if(pi!==cur.part) return false; var r=selR(); return !!r&&i>=r[0]&&i<=r[1]; }
function selEvs(){ var r=selR(); return r?curPart().ev.slice(r[0],r[1]+1):[]; }
function delEv(){ var r=selR(); if(!r) return; var p=curPart(); p.ev.splice(r[0],r[1]-r[0]+1); cur.idx=Math.min(r[0],p.ev.length-1); cur.end=-1; commit(); }
var clip=null; try{ clip=JSON.parse(localStorage.getItem(KEY+'.clip')); }catch(e){}
function copySel(cut){ var r=selR(); if(!r){ toast('먼저 음표를 골라 주세요'); return; } clip=JSON.parse(JSON.stringify(selEvs())); try{ localStorage.setItem(KEY+'.clip',JSON.stringify(clip)); }catch(e){} toast(clip.length+'개를 '+(cut?'잘라냈어요':'복사했어요')); if(cut) delEv(); else panel(); }
function pasteClip(src){ var c=src||clip; if(!c||!c.length){ toast('붙여넣을 음표가 없어요'); return; } var p=curPart(), r=selR(), at=r?r[1]+1:p.ev.length; c=JSON.parse(JSON.stringify(c)); p.ev.splice.apply(p.ev,[at,0].concat(c)); cur.idx=at; cur.end=at+c.length-1; commit(); toast(c.length+'개를 붙였어요'); }
function selMeasure(){ var m=cur.m; if(m==null||m<0){ toast('마디를 먼저 눌러 주세요'); return; } var p=curPart(), t=0, a=-1, b=-1; p.ev.forEach(function(e,i){ if(t>=mstart(m)-.001&&t<mstart(m+1)-.001){ if(a<0) a=i; b=i; } t+=e.d; }); if(a<0){ toast('이 마디에는 음표가 없어요'); return; } cur.idx=a; cur.end=b; draw(); panel(); }
function parseNote(x){ var m=String(x||'').trim().match(/^([A-Ga-g])([#b♯♭]?)(\d?)$/); if(!m) return /^[Rr]$/.test(String(x).trim())?{rest:true}:null; return {s:STEPS.indexOf(m[1].toUpperCase()),a:/[#♯]/.test(m[2])?1:/[b♭]/.test(m[2])?-1:0,o:m[3]===''?null:+m[3]}; }
function findReplace(){ var f1=parseNote($('frF').value), f2=parseNote($('frT').value); if(!f1||f1.rest||!f2){ toast('찾을 음과 바꿀 음을 C4, F#, Bb3 처럼 써 주세요 (바꿀 음은 R도 돼요)'); return; }
  var all=$('frAll').checked, n=0, parts=all?score.parts:[curPart()];
  parts.forEach(function(pt){ pt.ev.forEach(function(e){ for(var i=e.p.length-1;i>=0;i--){ var q=e.p[i]; if(q.s===f1.s&&q.a===f1.a&&(f1.o==null||q.o===f1.o)){ n++; if(f2.rest){ e.p.splice(i,1); } else { q.s=f2.s; q.a=f2.a; if(f2.o!=null) q.o=f2.o; } } } }); });
  if(n) commit(); toast(n?n+'개를 바꿨어요':'찾는 음이 없어요'); }
function editOp(k){ var p=curPart(), r=selR();
  if(k==='copy') copySel(false); else if(k==='cut') copySel(true); else if(k==='paste') pasteClip();
  else if(k==='dup'){ if(!r){ toast('먼저 음표를 골라 주세요'); return; } pasteClip(selEvs()); }
  else if(k==='all'){ if(!p.ev.length) return; cur.idx=0; cur.end=p.ev.length-1; draw(); panel(); }
  else if(k==='meas') selMeasure();
  else if(k==='none'){ cur.idx=-1; cur.end=-1; draw(); panel(); }
  else if(k==='tup'){ if(!r){ toast('먼저 음표를 골라 주세요 (세 개씩 묶어서 고르세요)'); return; } var evs=selEvs(), all=evs.every(function(e){ return e.tp; }); evs.forEach(function(e){ if(all){ e.d=e.d*3/2; delete e.tp; } else if(!e.tp&&!dotted(e.d)){ e.d=e.d*2/3; e.tp=3; } }); commit(); }
  else if(k==='rev'){ if(!r||r[0]===r[1]){ toast('두 개 이상 골라 주세요'); return; } var seg=p.ev.slice(r[0],r[1]+1).reverse(); seg.forEach(function(e){ e.tie=false; }); Array.prototype.splice.apply(p.ev,[r[0],seg.length].concat(seg)); commit(); }
  else if(k.charAt(0)==='t'){ var n=+k.slice(1); transpose(n); } }
function transpose(n){ var r=selR(), evs=r?selEvs():curPart().ev; if(!evs.length) return; evs.forEach(function(e){ e.p.forEach(function(p){ shiftSemi(p,n); }); if(e.ch) e.ch=transChord(e.ch,n,n<0||score.key<0); }); commit(); var f1=evs.filter(function(e){ return e.p.length; })[0]; if(f1) preview(f1.p[0]); }
var pkOct=4;
function addMidi(m){ var p=curPart(), sp=(score.key>=0?[[0,0],[0,1],[1,0],[1,1],[2,0],[3,0],[3,1],[4,0],[4,1],[5,0],[5,1],[6,0]]:[[0,0],[1,-1],[1,0],[2,-1],[2,0],[3,0],[4,-1],[4,0],[5,-1],[5,0],[6,-1],[6,0]])[m%12], np={s:sp[0],a:sp[1],o:Math.floor(m/12)-1};
  if(ui.chord&&curEv()&&curEv().p.length){ curEv().p.push(np); commit(); preview(np); return; }
  var r=selR(), at=r?r[1]+1:p.ev.length; addEvent(cur.part,at,{p:[np],d:newDur(),tie:false}); cur.end=-1; commit(); preview(np); }
function pianoHtml(){ var W7=[0,2,4,5,7,9,11], B=[[1,1],[3,2],[6,4],[8,5],[10,6]], h='<div class="pk" style="position:relative;height:96px;margin:6px 0;user-select:none;-webkit-user-select:none">';
  for(var i=0;i<8;i++){ var m=(pkOct+1)*12+(i<7?W7[i]:12); h+='<button class="pkw" data-pk="'+m+'" aria-label="'+STEPS[i%7]+(pkOct+(i===7?1:0))+'" style="position:absolute;left:'+(i*12.5)+'%;width:12.5%;height:100%;border:1px solid #555;border-radius:0 0 6px 6px;background:#fff;color:#222;font-size:10px;padding:0;display:flex;align-items:flex-end;justify-content:center;cursor:pointer;touch-action:manipulation">'+(i%7===0?'C'+(pkOct+(i===7?1:0)):'')+'</button>'; }
  B.forEach(function(b){ h+='<button class="pkb" data-pk="'+((pkOct+1)*12+b[0])+'" aria-label="'+STEPS[b[1]-1]+'#" style="position:absolute;left:'+(b[1]*12.5-4.2)+'%;width:8.4%;height:60%;border:1px solid #000;border-radius:0 0 4px 4px;background:#222;padding:0;cursor:pointer;touch-action:manipulation;z-index:2"></button>'; });
  return h+'</div><div class="row" style="justify-content:center"><button class="tbtn" data-pko="-1" style="height:28px">◀ 낮게</button><span class="v" style="flex:0 0 auto;min-width:70px;text-align:center">옥타브 '+pkOct+'</span><button class="tbtn" data-pko="1" style="height:28px">높게 ▶</button></div>'; }
function addLetter(letter){
  var p=curPart(), s=STEPS.indexOf(letter), prev=null; for(var i=Math.min(cur.idx,p.ev.length-1);i>=0;i--) if(p.ev[i].p.length){ prev=p.ev[i].p[p.ev[i].p.length-1]; break; }
  var base=prev?prev.o*7+prev.s:(p.clef==='bass'?3*7+4:p.clef==='alto'?4*7:4*7+4), best=null;
  for(var o=1;o<=7;o++){ var n=o*7+s; if(best==null||Math.abs(n-base)<Math.abs(best-base)) best=n; }
  keyCtx=keyFor(p,Math.max(0,cur.idx+1)); var np={s:s,o:Math.floor(best/7),a:ui.acc!=null?ui.acc:keyAlter(s)}; keyCtx=null;
  var ev=ui.chord&&curEv()&&curEv().p.length?null:{p:[np],d:newDur(),tie:false};
  if(!ev){ curEv().p.push(np); commit(); preview(np); return; }
  addEvent(cur.part,cur.idx+1,ev); commit(); preview(np);
}
function moveSel(dir){ var evs=selEvs(); if(!evs.length) return; var r0=selR()[0], pt0=curPart(); evs.forEach(function(ev,j){ keyCtx=keyFor(pt0,r0+j); ev.p.forEach(function(p){ var n=p.o*7+p.s+dir; p.o=Math.floor(n/7); p.s=((n%7)+7)%7; p.a=keyAlter(p.s); }); }); keyCtx=null; commit(); if(evs[0].p.length) preview(evs[0].p[0]); }
function semi(dir){ var evs=selEvs(); if(!evs.length) return; evs.forEach(function(ev){ ev.p.forEach(function(p){ shiftSemi(p,dir); }); }); commit(); }
function shiftSemi(p,dir,sharp){ var up=sharp!=null?sharp:(dir>0&&score.key>=0), m=midi(p)+dir, o=Math.floor(m/12)-1, pc=((m%12)+12)%12, sp=up?[[0,0],[0,1],[1,0],[1,1],[2,0],[3,0],[3,1],[4,0],[4,1],[5,0],[5,1],[6,0]]:[[0,0],[1,-1],[1,0],[2,-1],[2,0],[3,0],[4,-1],[4,0],[5,-1],[5,0],[6,-1],[6,0]]; p.s=sp[pc][0]; p.a=sp[pc][1]; p.o=o; }
function setDur(d){ ui.dur=d; var ev=curEv(); if(ev&&cur.idx>=0){ ev.d=ui.dot?d*3/2:d; if(ev.tp) ev.d=ev.d*2/3; commit(); } else panel(); renderTools(); }

/* ---------- audio ---------- */
var ctx=null, master=null, offlineMode=false;
function audio(){ if(!ctx){ var A=window.AudioContext||window.webkitAudioContext; ctx=new A(); var comp=ctx.createDynamicsCompressor(); master=ctx.createGain(); master.gain.value=.7; master.connect(comp); comp.connect(ctx.destination); } if(ctx.state==='suspended'&&!offlineMode) ctx.resume(); return ctx; }
function env(g,t0,a,peak,dec,dur,rel){ g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(peak,t0+a); g.gain.exponentialRampToValueAtTime(Math.max(0.0002,peak*dec),t0+Math.max(a+.02,dur)); g.gain.linearRampToValueAtTime(0,t0+dur+rel); }
function drumKind(m){ return m<=66?'kick':m<=71?'ltom':m<=73?'snare':m<=76?'htom':m<=79?'hat':'crash'; }
var GMD={kick:36,ltom:43,snare:38,htom:48,hat:42,crash:49}, GMW={35:65,36:65,37:72,38:72,39:72,40:72,41:67,43:67,45:74,47:74,48:76,50:76,42:77,44:77,46:77,49:80,51:80,52:80,53:80,55:80,57:80,59:80};
function instOf(p){ return p.clef==='drum'?'drums':p.inst; }
function playNote(inst,fr,t0,dur,vol,pan){
  var c=ctx, g=c.createGain(), end=t0+dur+.4, out=master; if(pan&&c.createStereoPanner){ var sp=c.createStereoPanner(); sp.pan.value=Math.max(-1,Math.min(1,pan)); sp.connect(master); out=sp; } g.connect(out);
  function osc(type,mul,gain,detune){ var o=c.createOscillator(), og=c.createGain(); o.type=type; o.frequency.value=fr*mul; if(detune) o.detune.value=detune; og.gain.value=gain; o.connect(og); og.connect(g); o.start(t0); o.stop(end); return o; }
  var v=vol*.32;
  if(inst==='piano'){ osc('triangle',1,1); osc('sine',2,.4); osc('sine',3,.15); osc('sine',.5,.15); var d=Math.min(dur+.3,Math.max(.8,2.4-fr/700)); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(v,t0+.006); g.gain.exponentialRampToValueAtTime(v*.03,t0+d); g.gain.linearRampToValueAtTime(0,t0+Math.max(d,dur)+.25); }
  else if(inst==='flute'){ osc('sine',1,1); osc('sine',2,.12); var lf=c.createOscillator(), lg=c.createGain(); lf.frequency.value=5; lg.gain.value=fr*.006; lf.connect(lg); c.createGain(); lf.start(t0); lf.stop(end); env(g,t0,.07,v*1.1,.85,dur,.12); }
  else if(inst==='strings'){ var f1=c.createBiquadFilter(); f1.type='lowpass'; f1.frequency.value=2200; f1.connect(g); [-7,7].forEach(function(dt){ var o=c.createOscillator(); o.type='sawtooth'; o.frequency.value=fr; o.detune.value=dt; var og=c.createGain(); og.gain.value=.5; o.connect(og); og.connect(f1); o.start(t0); o.stop(end); }); env(g,t0,.14,v*.7,.9,dur,.25); }
  else if(inst==='organ'){ osc('sine',1,1); osc('sine',2,.6); osc('sine',3,.35); osc('sine',4,.2); env(g,t0,.02,v*.8,.95,dur,.06); }
  else if(inst==='guitar'){ var f2=c.createBiquadFilter(); f2.type='lowpass'; f2.frequency.setValueAtTime(3500,t0); f2.frequency.exponentialRampToValueAtTime(700,t0+.5); f2.connect(g); var o=c.createOscillator(); o.type='triangle'; o.frequency.value=fr; var og=c.createGain(); og.gain.value=1; o.connect(og); og.connect(f2); o.start(t0); o.stop(end); var d2=Math.min(dur+.2,1.2); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(v*1.2,t0+.004); g.gain.exponentialRampToValueAtTime(v*.02,t0+d2); g.gain.linearRampToValueAtTime(0,t0+d2+.1); }
  else if(inst==='box'){ osc('sine',1,1); osc('sine',3.01,.35); osc('sine',5.4,.1); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(v*.9,t0+.003); g.gain.exponentialRampToValueAtTime(v*.01,t0+Math.min(1.4,dur+.6)); g.gain.linearRampToValueAtTime(0,t0+Math.min(1.4,dur+.6)+.1); }
  else if(inst==='brass'){ var fb=c.createBiquadFilter(); fb.type='lowpass'; fb.frequency.setValueAtTime(500,t0); fb.frequency.linearRampToValueAtTime(2600,t0+.09); fb.connect(g); [-4,4].forEach(function(dt){ var o=c.createOscillator(); o.type='sawtooth'; o.frequency.value=fr; o.detune.value=dt; o.connect(fb); o.start(t0); o.stop(end); }); env(g,t0,.05,v*.8,.9,dur,.1); }
  else if(inst==='marimba'){ osc('sine',1,1); osc('sine',4,.25); osc('sine',9.2,.04); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(v*1.2,t0+.003); g.gain.exponentialRampToValueAtTime(v*.01,t0+.35); g.gain.linearRampToValueAtTime(0,t0+.45); }
  else if(inst==='harp'){ osc('triangle',1,1); osc('sine',2,.3); osc('sine',3,.12); var dh=Math.min(2.2,Math.max(.8,2.6-fr/600)); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(v*1.1,t0+.004); g.gain.exponentialRampToValueAtTime(v*.02,t0+dh); g.gain.linearRampToValueAtTime(0,t0+dh+.15); }
  else if(inst==='choir'){ [[700,1],[1200,.6],[2600,.25]].forEach(function(fm){ var bf=c.createBiquadFilter(), bg=c.createGain(); bf.type='bandpass'; bf.frequency.value=fm[0]; bf.Q.value=4; bg.gain.value=fm[1]; bf.connect(bg); bg.connect(g); [-9,0,9].forEach(function(dt){ var o=c.createOscillator(); o.type='sawtooth'; o.frequency.value=fr; o.detune.value=dt; o.connect(bf); o.start(t0); o.stop(end); }); }); env(g,t0,.18,v*1.6,.9,dur,.3); }
  else if(inst==='drums'){ var dm=Math.round(69+12*Math.log2(fr/440)), kind=drumKind(dm), gv=vol*.5;
    if(kind==='kick'||kind==='ltom'||kind==='htom'){ var od=c.createOscillator(), f0=kind==='kick'?140:kind==='ltom'?120:190, f1=kind==='kick'?42:kind==='ltom'?70:110; od.frequency.setValueAtTime(f0,t0); od.frequency.exponentialRampToValueAtTime(f1,t0+.14); g.gain.setValueAtTime(gv*1.7,t0); g.gain.exponentialRampToValueAtTime(.001,t0+(kind==='kick'?.3:.38)); od.connect(g); od.start(t0); od.stop(t0+.45); }
    else { var ns=c.createBufferSource(), hf=c.createBiquadFilter(), len=kind==='crash'?1:kind==='snare'?.2:.06; if(!c._nb){ c._nb=c.createBuffer(1,Math.ceil(c.sampleRate*1.2),c.sampleRate); var dd=c._nb.getChannelData(0); for(var q=0;q<dd.length;q++) dd[q]=Math.random()*2-1; } ns.buffer=c._nb; hf.type='highpass'; hf.frequency.value=kind==='snare'?1400:kind==='crash'?4500:7000; ns.connect(hf); hf.connect(g); g.gain.setValueAtTime(gv*(kind==='hat'?.7:1),t0); g.gain.exponentialRampToValueAtTime(.001,t0+len); ns.start(t0); ns.stop(t0+len+.05);
      if(kind==='snare'){ var ot=c.createOscillator(), og2=c.createGain(); ot.type='triangle'; ot.frequency.value=190; og2.gain.setValueAtTime(gv*.8,t0); og2.gain.exponentialRampToValueAtTime(.001,t0+.12); ot.connect(og2); og2.connect(out); ot.start(t0); ot.stop(t0+.15); } } }
  else if(inst==='bass'){ osc('sine',1,1); osc('triangle',2,.3); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(v*1.3,t0+.01); g.gain.exponentialRampToValueAtTime(v*.2,t0+dur); g.gain.linearRampToValueAtTime(0,t0+dur+.12); }
  else { osc('square',1,.6); env(g,t0,.005,v*.5,.7,dur,.03); }
}
var play=null;
function playOrder(n){ var mk=score.mk||{}, order=[], i=0, start=0, done={}, guard=0, jumped=false, usedCoda=false, segno=-1, coda=-1;
  for(var k=0;k<n;k++){ var q=mk[k]||{}; if(q.segno&&segno<0) segno=k; if(q.coda&&coda<0) coda=k; }
  while(i<n&&guard++<5000){ var mm=mk[i]||{};
    if(!jumped){ if(mm.rs) start=i; if(mm.volta===1&&done[start]){ i++; continue; } }
    else { if(mm.volta===1){ i++; continue; } if(mm.fine){ order.push(i); break; } if(mm.tocoda&&coda>=0&&!usedCoda){ usedCoda=true; order.push(i); i=coda; continue; } }
    order.push(i);
    if(!jumped&&mm.re&&!done[start]){ done[start]=1; i=start; continue; }
    if(!jumped&&(mm.dc||(mm.ds&&segno>=0))){ jumped=true; i=mm.dc?0:segno; continue; }
    i++; }
  return order; }
function parseChord(str){ var m=String(str||'').trim().match(/^([A-G])([#b♯♭]?)([^/]*)(?:\/([A-G])([#b♯♭]?))?$/); if(!m) return null;
  var pcOf=function(l,a){ return (SEMI[STEPS.indexOf(l)]+(/[#♯]/.test(a)?1:/[b♭]/.test(a)?-1:0)+12)%12; }, q=m[3], iv=[0,4,7];
  if(/^(maj|M|Δ)/.test(q)) iv=[0,4,7]; else if(/^(m|min|-)/.test(q)) iv=[0,3,7];
  if(/^dim|^°/.test(q)) iv=[0,3,6]; else if(/^(aug|\+)/.test(q)) iv=[0,4,8];
  if(/sus2/.test(q)) iv=[0,2,7]; else if(/sus/.test(q)) iv=[0,5,7];
  if(/m7b5|ø/.test(q)) iv=[0,3,6,10]; else if(/dim7/.test(q)) iv.push(9); else if(/maj7|M7|Δ/.test(q)) iv.push(11); else if(/7/.test(q)) iv.push(10); else if(/6/.test(q)) iv.push(9);
  if(/9/.test(q)){ if(!/add9|maj9|M9/.test(q)&&iv.indexOf(10)<0&&iv.indexOf(11)<0) iv.push(10); iv.push(14); }
  var root=pcOf(m[1],m[2]); return {root:root,iv:iv,bass:m[4]?pcOf(m[4],m[5]):root}; }
function transChord(str,n,flat){ var NS=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'], NF=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'], T=flat?NF:NS;
  return String(str).replace(/([A-G])([#b♯♭]?)/g,function(all,l,a){ var pc=(SEMI[STEPS.indexOf(l)]+(/[#♯]/.test(a)?1:/[b♭]/.test(a)?-1:0)+120+n)%12; return T[pc]; }).replace(/^([A-G][#b]?)(.*)$/,function(all,r,rest){ return r+rest; }); }
function pObj(m){ var sp=[[0,0],[0,1],[1,0],[1,1],[2,0],[3,0],[3,1],[4,0],[4,1],[5,0],[5,1],[6,0]][((m%12)+12)%12]; return {s:sp[0],a:sp[1],o:Math.floor(m/12)-1}; }
var pbs={chords:'off',swing:50,keyMove:false,metro:false,count:false,loop:false,selOnly:false,speed:100}; try{ var _p=JSON.parse(localStorage.getItem(KEY+'.pbs')||'{}'); for(var _k in _p) pbs[_k]=_p[_k]; }catch(e){}
function savePbs(){ try{ localStorage.setItem(KEY+'.pbs',JSON.stringify(pbs)); }catch(e){} }
function audible(p){ var any=score.parts.some(function(q){ return q.solo; }); return any?!!p.solo:!p.mute; }
function click(t,acc){ var o=ctx.createOscillator(), g=ctx.createGain(); o.type='square'; o.frequency.value=acc?1600:1100; g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(acc?.26:.16,t+.002); g.gain.exponentialRampToValueAtTime(0.0001,t+.05); o.connect(g); g.connect(master); o.start(t); o.stop(t+.07); }
function schedule(from,to,startAt){
  audio(); var n=L.ms.length, mk=score.mk||{}, order=playOrder(n), fm=mAt(from), fromOff=from-mstart(fm), i0=order.indexOf(fm), sp=100/(pbs.speed||100); if(i0<0){ i0=0; fm=order[0]; fromOff=0; }
  if(to!=null&&to<=from+.5) to=null;
  var tempoNow=score.tempo; for(var k=0;k<=fm;k++) if(mk[k]&&mk[k].tempo) tempoNow=mk[k].tempo;
  var starts=[], evm=score.parts.map(function(p){ var out={}, t=0, dyn=null, st=[], df=dynFactors(p), slurRem=0, ovl=ovList(p), pr=pedRing(p); starts.push(st);
    p.ev.forEach(function(e,i){ st.push(t); var d=e.d, kk=i, ee=e; if(e.dyn) dyn=e.dyn;
      while(ee.tie&&ee.p.length&&p.ev[kk+1]&&p.ev[kk+1].p.length&&sameP(ee,p.ev[kk+1])){ kk++; d+=p.ev[kk].d; ee=p.ev[kk]; }
      var sl=false; if(e.p.length){ if(e.slur) slurRem=Math.max(slurRem,e.slur===true?1:(+e.slur||1)); sl=slurRem>0; if(slurRem>0) slurRem--; }
      var tied=i>0&&p.ev[i-1].tie&&p.ev[i-1].p.length&&e.p.length&&sameP(p.ev[i-1],e), mi=mAt(t);
      var o2=t-mstart(mi), d2=d; if(pbs.swing>50&&d2<=8&&tsAt(mi)[1]===4&&Math.abs(((o2%16)+16)%16-8)<.01){ var sh=(pbs.swing/100-.5)*16; o2+=sh; d2=Math.max(2,d2-sh); }
      if(audible(p)&&!tied&&e.p.length) (out[mi]=out[mi]||[]).push({off:o2,gr:e.gr,d:d2,p:e.p,vol:p.vol/100*df[i]*(e.art==='acc'?1.3:1),art:e.art,slur:sl,inst:instOf(p),tr:trOf(p)+12*ovl[i],ring:pr[i],pan:p.pan||0});
      t+=e.d; }); return out; });
  if(pbs.chords==='block'||pbs.chords==='arp'){ var chOut={}; function pushC(tm,len,ms,vol){ var mi=mAt(tm); (chOut[mi]=chOut[mi]||[]).push({off:tm-mstart(mi),d:len,p:ms.map(pObj),vol:vol,inst:'piano',tr:0,pan:0,slur:false}); }
    score.parts.forEach(function(p){ if(!audible(p)) return; var T=evStarts(p), list=[]; p.ev.forEach(function(e,i){ if(e.ch){ var ch=parseChord(e.ch); if(ch) list.push({T:T[i],ch:ch}); } });
      list.forEach(function(c,k){ var end=k+1<list.length?list[k+1].T:T.total, len=end-c.T; if(len<=0) return; var base=48+c.ch.root, tones=c.ch.iv.map(function(x){ return base+x; }), bass=36+c.ch.bass;
        if(pbs.chords==='block') pushC(c.T,len,[bass].concat(tones),.42);
        else { var seq=[bass].concat(tones.slice(0,4)), pat=[0,1,2,3,2,1], st=0; for(var tt=0;tt<len-.01;tt+=8,st++){ var ni=pat[st%pat.length]%seq.length; pushC(c.T+tt,Math.min(8,len-tt),[seq[ni]],.4); } } }); });
    evm.push(chOut); }
  var t0=startAt||ctx.currentTime+.12, sec=0, segs=[];
  if(pbs.count&&!startAt){ var spu0=60/tempoNow/16*sp, M0=mlen(order[i0]), bl=beatLen(order[i0]); for(var bb=0;bb*bl<M0-.001;bb++) click(t0+bb*bl*spu0,bb===0); sec+=M0*spu0; }
  for(var q=i0;q<order.length;q++){ var m=order[q]; var M=mlen(m); if(to!=null&&mstart(m)>=to) break; if(mk[m]&&mk[m].tempo) tempoNow=mk[m].tempo; var spu=60/tempoNow/16*sp, skip=q===i0?fromOff:0, lim=to!=null?Math.min(M,to-mstart(m)):M; if(lim<=skip+.001) break; var len=(lim-skip)*spu;
    segs.push({m:m,start:sec,len:len,spu:spu,skip:skip});
    if(pbs.metro){ var bl2=beatLen(m); for(var bt=0;bt<lim-.001;bt+=bl2){ if(bt<skip-.001) continue; click(t0+sec+(bt-skip)*spu,bt===0); } }
    evm.forEach(function(em){ (em[m]||[]).forEach(function(n){ if(n.off<skip-.001||n.off>=lim-.001) return; var dur=n.d*spu*(n.slur?1:.96); if(n.art==='stac') dur*=.45; else if(n.art==='ferm') dur*=1.6; else if(n.art==='ten') dur=n.d*spu; if(n.ring>n.d) dur=Math.max(dur,n.ring*spu);
      var gsh=0; if(n.gr&&n.gr.length){ var gd=Math.min(.07,dur/(n.gr.length+2)); n.gr.forEach(function(g,j){ playNote(n.inst,freq(midi(g)+n.tr),t0+sec+(n.off-skip)*spu+j*gd,gd*1.1,n.vol*.8,n.pan); }); gsh=n.gr.length*gd; dur=Math.max(.06,dur-gsh); }
      (n.art==='arp'?n.p.slice().sort(function(a,b){ return midi(a)-midi(b); }):n.p).forEach(function(pp,jj){ if(n.art==='mord'&&n.d>=8){ var nm2=pp.o*7+pp.s+1, ms2=((nm2%7)+7)%7, up2={s:ms2,o:Math.floor(nm2/7),a:keyAlter(ms2)}; playNote(n.inst,freq(midi(pp)+n.tr),t0+sec+(n.off-skip)*spu+gsh,2*spu,n.vol,n.pan); playNote(n.inst,freq(midi(up2)+n.tr),t0+sec+(n.off-skip+2)*spu+gsh,2*spu,n.vol,n.pan); playNote(n.inst,freq(midi(pp)+n.tr),t0+sec+(n.off-skip+4)*spu+gsh,Math.max(.06,dur-4*spu),n.vol,n.pan); }
        else if(n.art==='trem'&&n.d>=4){ var tc=Math.floor(n.d/2); for(var tj=0;tj<tc;tj++) playNote(n.inst,freq(midi(pp)+n.tr),t0+sec+(n.off-skip+tj*2)*spu+gsh,2*spu*.9,n.vol*.8,n.pan); }
        else if(n.art==='turn'&&n.d>=8){ var tn1=pp.o*7+pp.s+1, tu=((tn1%7)+7)%7, tup={s:tu,o:Math.floor(tn1/7),a:keyAlter(tu)}, tn2=pp.o*7+pp.s-1, tl=((tn2%7)+7)%7, tlo={s:tl,o:Math.floor(tn2/7),a:keyAlter(tl)}, tseq=[tup,pp,tlo,pp], tl2=Math.min(2,n.d/4); tseq.forEach(function(tx,tk){ playNote(n.inst,freq(midi(tx)+n.tr),t0+sec+(n.off-skip+tk*tl2)*spu+gsh,tk===3?Math.max(.06,dur-3*tl2*spu):tl2*spu,n.vol,n.pan); }); }
        else if(n.art==='tr'&&n.d>=6){ var cnt=Math.floor(n.d/2), nn=pp.o*7+pp.s+1, us=((nn%7)+7)%7, up={s:us,o:Math.floor(nn/7),a:keyAlter(us)}; for(var j=0;j<cnt;j++) playNote(n.inst,freq(midi(j%2?up:pp)+n.tr),t0+sec+(n.off-skip+j*2)*spu,2*spu*.95,n.vol,n.pan); }
        else playNote(n.inst,freq(midi(pp)+n.tr),t0+sec+(n.off-skip)*spu+gsh+(n.art==='arp'?jj*.045:0),Math.max(.06,dur),n.vol,n.pan); }); }); });
    sec+=len; }
  if(offlineMode) return sec;
  var was=!!play, lp=was&&play.loop;
  play={t0:t0,sec:sec,segs:segs,end:t0+sec+.8,from:from,to:to,starts:starts,hk:'',loop:lp};
  $('bPlay').textContent='⏸ 멈춤'; if(!was) requestAnimationFrame(tick);
}
function hlUpdate(T){
  var g=$('phl'); if(!g) return; var mi=mAt(T), off=T-mstart(mi), o='', key='', m=L.ms[mi];
  if(m) score.parts.forEach(function(part,pi){ if(!audible(part)) return; var st=play.starts[pi], i=-1; for(var k=0;k<st.length;k++){ if(st[k]<=T+1e-6) i=k; else break; }
    if(i<0||!part.ev[i].p.length||T>=st[i]+part.ev[i].d-1e-6) return; var top=staffY(m.sys,pi);
    (L.pcs[pi][mi]||[]).forEach(function(c){ if(c.ev===i&&c.t<=off+1e-6&&off<c.t+c.d-1e-6){ var x=slotX(m,c.t); key+=pi+'_'+i+'_'+c.t+';'; c.p.forEach(function(p){ o+='<ellipse cx="'+f(x)+'" cy="'+f(noteY(top,part,ypos(part,p.s,p.o)))+'" rx="9" ry="7" fill="#2ec4b6" opacity=".55"/>'; }); } }); });
  if(key!==play.hk){ play.hk=key; g.innerHTML=o; }
}
function sameP(a,b){ return a.p.length===b.p.length&&a.p.every(function(p,i){ return midi(p)===midi(b.p[i]); }); }
function tick(){
  if(!play) return; var now=ctx.currentTime, el=now-play.t0;
  if(play.loop&&now>play.t0+play.sec-.1){ var o=play; schedule(o.from,o.to,o.t0+o.sec); return tick(); }
  if(now>play.end){ stopPlay(); return; }
  var c=$('pcur'), sg=null; play.segs.forEach(function(x){ if(el>=x.start) sg=x; });
  if(c&&sg&&el>=0){ var T=mstart(sg.m)+sg.skip+Math.min(mlen(sg.m)-sg.skip,(el-sg.start)/sg.spu), pos=timeX(Math.max(0,T)), s=L.sys[pos.sys], np=score.parts.length; c.setAttribute('x1',pos.x); c.setAttribute('x2',pos.x); c.setAttribute('y1',s.y+10); c.setAttribute('y2',staffY(pos.sys,np-1)+STAFF+10); c.setAttribute('opacity','1'); hlUpdate(T);
    var r=sheet.getBoundingClientRect(), dr=desk.getBoundingClientRect(), py=r.top+(s.y)*r.height/(L.H+10); if(py<dr.top||py>dr.bottom-120) desk.scrollTop+= py-dr.top-60; }
  requestAnimationFrame(tick);
}
function stopPlay(){ play=null; try{ if(ctx){ master.disconnect(); var comp=ctx.createDynamicsCompressor(); master=ctx.createGain(); master.gain.value=.7; master.connect(comp); comp.connect(ctx.destination); } }catch(e){} $('bPlay').textContent='▶ 재생'; var c=$('pcur'); if(c) c.setAttribute('opacity','0'); var hg=$('phl'); if(hg) hg.innerHTML=''; }
$('bPlay').onclick=function(){ if(play){ stopPlay(); return; } var from=0, to=null, r=selR(); if(r){ from=startOf(curPart(),r[0]); if(pbs.selOnly) to=startOf(curPart(),r[1])+curPart().ev[r[1]].d; } schedule(from,to); play.loop=!!pbs.loop; };
$('bStop').onclick=stopPlay;

/* ---------- MIDI ---------- */
function vlq(n){ var b=[n&127]; while(n>>=7) b.unshift((n&127)|128); return b; }
function exportMidi(){
  var tr=[], tpu=30; function tk(arr){ var len=arr.length; return [77,84,114,107,len>>>24&255,len>>>16&255,len>>>8&255,len&255].concat(arr); }
  var mev=[[0,[255,81,3].concat([Math.round(60000000/score.tempo)>>16&255,Math.round(60000000/score.tempo)>>8&255,Math.round(60000000/score.tempo)&255])],[0,[255,88,4,score.ts[0],Math.log2(score.ts[1]),24,8]]];
  mtBuild(); Object.keys(score.mk||{}).map(Number).sort(function(a,b){ return a-b; }).forEach(function(mi){ var q=score.mk[mi]; if(!q) return; if(q.tempo){ var u=Math.round(60000000/q.tempo); mev.push([Math.round(mstart(mi)*tpu),[255,81,3,u>>16&255,u>>8&255,u&255]]); } if(q.ts) mev.push([Math.round(mstart(mi)*tpu),[255,88,4,q.ts[0],Math.log2(q.ts[1]),24,8]]); });
  mev.sort(function(a,b){ return a[0]-b[0]; });
  var meta=[], lastT=0; mev.forEach(function(x){ meta=meta.concat(vlq(x[0]-lastT),x[1]); lastT=x[0]; });
  meta=meta.concat([0,255,47,0]);
  tr.push(tk(meta));
  score.parts.forEach(function(p,pi){ var drumP=p.clef==='drum', ch=drumP?9:pi%9; var prog=0; INSTS.forEach(function(x){ if(x[0]===p.inst) prog=x[2]; });
    var evs=[[0,0xC0|ch,prog]], t=0, df=dynFactors(p), tro=trOf(p), ovm=ovList(p);
    p.ev.forEach(function(e,i){ var d=e.d; if(e.p.length){ var tied=i>0&&p.ev[i-1].tie&&p.ev[i-1].p.length&&sameP(p.ev[i-1],e); if(!tied){ var k=i,dd=d,ee=e; while(ee.tie&&p.ev[k+1]&&p.ev[k+1].p.length&&sameP(ee,p.ev[k+1])){ k++; dd+=p.ev[k].d; ee=p.ev[k]; } e.p.forEach(function(pp){ var m=drumP?GMD[drumKind(midi(pp))]:midi(pp)+tro+12*ovm[i]; evs.push([Math.round(t*tpu),0x90|ch,m,Math.min(127,Math.max(1,Math.round(p.vol*.9*df[i])))]); evs.push([Math.round((t+dd)*tpu)-2,0x80|ch,m,0]); }); } } t+=d; });
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
  parts.slice(0,8).forEach(function(pt,i){ if(pt.ch===9) pt.notes=pt.notes.map(function(n){ return [n[0],n[1],GMW[n[2]]||72]; }); pt.notes.sort(function(a,b){ return a[0]-b[0]||a[2]-b[2]; }); var evs=[], t=0, grid=function(x){ return Math.round(x/tpu/4)*4; };
    var byT={}; pt.notes.forEach(function(n){ var s=grid(n[0]); (byT[s]=byT[s]||[]).push(n); }); var times=Object.keys(byT).map(Number).sort(function(a,b){ return a-b; });
    times.forEach(function(s,k){ if(s<t) return; if(s>t) decompose(s-t).forEach(function(dd){ evs.push({p:[],d:dd,tie:false}); }); var ns=byT[s], nxt=k+1<times.length?times[k+1]:s+64, dd=Math.max(4,Math.min(grid(Math.max.apply(0,ns.map(function(n){ return n[1]; }))-0)-s,nxt-s)); if(dd<4) dd=4; var parts2=decompose(dd);
      parts2.forEach(function(q,qi){ evs.push({p:ns.map(function(n){ var o=Math.floor(n[2]/12)-1, pc=n[2]%12, sp=[[0,0],[0,1],[1,0],[1,1],[2,0],[3,0],[3,1],[4,0],[4,1],[5,0],[5,1],[6,0]][pc]; return {s:sp[0],a:sp[1],o:o}; }),d:q,tie:qi<parts2.length-1}); }); t=s+dd; });
    var avg=pt.notes.reduce(function(a,n){ return a+n[2]; },0)/pt.notes.length, inst='piano'; INSTS.forEach(function(x){ if(pt.prog===x[2]) inst=x[0]; });
    score.parts.push({name:pt.name||('파트 '+(i+1)),clef:pt.ch===9?'drum':avg<57?'bass':'treble',inst:inst,vol:80,mute:false,ev:evs}); });
  if(!score.parts.length) throw 0;
}

/* ---------- export / import ---------- */
function download(name,blob){ var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },1500); }
function fname(ext){ return (score.name||'score').replace(/[\\/:*?"<>|]/g,'_')+'.'+ext; }
function svgStr(){ var c=sheet.cloneNode(true); var cu=c.querySelector('#pcur'); if(cu) cu.remove(); var h=c.querySelector('#hits'); if(h) h.remove(); c.removeAttribute('style'); c.setAttribute('width',W); c.setAttribute('height',L.H+10); return new XMLSerializer().serializeToString(c); }
function printScore(){
  layout(); var PH=Math.round(W*1.414)-40, n=L.sys.length, pages=[], ps=0, si0=0, total=L.H+10;
  for(var i=0;i<n;i++){ var bottom=(i+1<n?L.sys[i+1].y-10:total); if(i>si0&&bottom-ps>PH){ var cut=L.sys[i].y-14; pages.push([ps,cut]); ps=cut; si0=i; } }
  pages.push([ps,total]);
  var inner=sheet.innerHTML.replace(/<g id="hits">[\s\S]*?<\/g><line id="pcur"[^>]*>/,'').replace(/<g id="phl"[^>]*><\/g>/,''), area=$('printArea');
  if(!area){ area=document.createElement('div'); area.id='printArea'; document.body.appendChild(area); }
  area.innerHTML=pages.map(function(pg,k){ return '<div class="ppage"><svg xmlns="'+NS+'" viewBox="0 '+f(pg[0])+' '+W+' '+f(pg[1]-pg[0])+'" preserveAspectRatio="xMidYMin meet" style="width:100%;height:'+f(190*(pg[1]-pg[0])/W*1.0)+'mm">'+inner+'</svg>'+(pages.length>1?'<div class="pno">'+(k+1)+' / '+pages.length+'</div>':'')+'</div>'; }).join('');
  var done=function(){ area.innerHTML=''; window.removeEventListener('afterprint',done); }; window.addEventListener('afterprint',done); setTimeout(function(){ window.print(); },50); return pages.length;
}
function b64u(buf){ var b=new Uint8Array(buf), t=''; for(var i=0;i<b.length;i+=8192) t+=String.fromCharCode.apply(null,b.subarray(i,i+8192)); return btoa(t).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function unb64u(str){ var t=atob(str.replace(/-/g,'+').replace(/_/g,'/')), b=new Uint8Array(t.length); for(var i=0;i<t.length;i++) b[i]=t.charCodeAt(i); return b; }
function makeLink(){ var json=snap(), enc=new TextEncoder().encode(json), base=location.href.split('#')[0];
  if(window.CompressionStream){ var cs=new CompressionStream('gzip'), w=cs.writable.getWriter(); w.write(enc); w.close(); return new Response(cs.readable).arrayBuffer().then(function(buf){ return base+'#z='+b64u(buf); }); }
  return Promise.resolve(base+'#j='+b64u(enc)); }
function shareLink(){ makeLink().then(function(url){ if(url.length>30000){ toast('악보가 길어서 링크로 만들 수 없어요. 프로젝트 파일(.fscore)로 보내 주세요'); return; }
    var ok=function(){ toast('링크를 복사했어요 ('+Math.ceil(url.length/1000)+'KB). 받은 사람이 열면 이 악보가 열려요'); };
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok,function(){ window.prompt('이 링크를 복사하세요',url); }); else window.prompt('이 링크를 복사하세요',url); }); }
function loadHash(){ var m=location.hash.match(/^#([zj])=([\w-]+)$/); if(!m) return Promise.resolve(false);
  var bytes; try{ bytes=unb64u(m[2]); }catch(e){ return Promise.resolve(false); }
  var get=m[1]==='z'&&window.DecompressionStream?(function(){ var ds=new DecompressionStream('gzip'), w=ds.writable.getWriter(); w.write(bytes); w.close(); return new Response(ds.readable).arrayBuffer().then(function(b){ return new TextDecoder().decode(b); }); })():Promise.resolve(new TextDecoder().decode(bytes));
  return get.then(function(json){ var o=JSON.parse(json), had=score.parts.some(function(p){ return p.ev.length; })&&score.libId!==o.libId;
    if(had){ var a=libGet(), keep=JSON.parse(snap()); keep.libId=keep.libId||Date.now().toString(36); keep.name=(keep.name||'')+' (링크 열기 전)'; a.unshift({id:keep.libId,name:keep.name,t:Date.now(),data:JSON.stringify(keep)}); libSet(a); }
    setScore(o); cur={part:0,idx:-1}; $('dname').value=score.name; commit(); try{ history.replaceState(null,'',location.href.split('#')[0]); }catch(e){} toast('링크로 받은 악보를 열었어요'+(had?' (이전 악보는 보관함에 있어요)':'')); return true; }).catch(function(){ toast('링크의 악보를 열지 못했어요'); return false; }); }
function exportPng(sc){ var img=new Image(), s=svgStr(); img.onload=function(){ var cv=document.createElement('canvas'); cv.width=W*sc; cv.height=(L.H+10)*sc; var x=cv.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,cv.width,cv.height); x.drawImage(img,0,0,cv.width,cv.height); cv.toBlob(function(b){ download(fname('png'),b); }); }; img.onerror=function(){ toast('PNG로 바꾸지 못했어요'); }; img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s); }

/* ---------- MusicXML / WAV ---------- */
function xe(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
var XT={64:'whole',32:'half',16:'quarter',8:'eighth',4:'16th'};
function exportXml(){
  layout(); var nM=L.ms.length, mk=score.mk||{}, o='<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n<score-partwise version="3.1">\n<work><work-title>'+xe(score.name)+'</work-title></work>\n<identification>'+(score.composer?'<creator type="composer">'+xe(score.composer)+'</creator>':'')+'<encoding><software>Fry Score</software></encoding></identification>\n<part-list>';
  score.parts.forEach(function(p,i){ o+='<score-part id="P'+(i+1)+'"><part-name>'+xe(p.name)+'</part-name></score-part>'; });
  o+='</part-list>\n';
  var CL={treble:'<sign>G</sign><line>2</line>',treble8:'<sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change>',bass:'<sign>F</sign><line>4</line>',alto:'<sign>C</sign><line>3</line>',drum:'<sign>percussion</sign><line>2</line>'};
  var TM='<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>', dirw=function(x){ return '<direction placement="above"><direction-type>'+x+'</direction-type></direction>'; };
  score.parts.forEach(function(p,pi){
    var pcs=L.pcs[pi], ovl=ovList(p), hp=hairpins(p), hs={}, stops={}, prevTie=false; hp.forEach(function(h){ hs[h.i0]=h; stops[h.i1]=1; });
    o+='<part id="P'+(pi+1)+'">\n';
    for(var m=0;m<nM;m++){
      var q=mk[m]||{}, pc=pcs[m]||[]; o+='<measure number="'+(m+1)+'">';
      if(q.rs||q.volta) o+='<barline location="left">'+(q.volta?'<ending number="'+q.volta+'" type="start"/>':'')+(q.rs?'<repeat direction="forward"/>':'')+'</barline>';
      if(m>0&&q.ts&&(tsAt(m)[0]!==tsAt(m-1)[0]||tsAt(m)[1]!==tsAt(m-1)[1])) o+='<attributes><time><beats>'+q.ts[0]+'</beats><beat-type>'+q.ts[1]+'</beat-type></time></attributes>';
      if(m>0&&q.key!=null) o+='<attributes><key><fifths>'+q.key+'</fifths></key></attributes>';
      if(m===0) o+='<attributes><divisions>48</divisions><key><fifths>'+score.key+'</fifths></key><time><beats>'+score.ts[0]+'</beats><beat-type>'+score.ts[1]+'</beat-type></time><clef>'+(CL[p.clef]||CL.treble)+'</clef></attributes>';
      if(pi===0&&m===0) o+='<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>'+score.tempo+'</per-minute></metronome></direction-type><sound tempo="'+score.tempo+'"/></direction>';
      else if(pi===0&&q.tempo) o+='<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>'+q.tempo+'</per-minute></metronome></direction-type><sound tempo="'+q.tempo+'"/></direction>';
      if(pi===0&&q.reh) o+=dirw('<rehearsal>'+xe(String.fromCharCode(65+Object.keys(mk).map(Number).filter(function(k){ return mk[k]&&mk[k].reh&&k<m; }).length%26))+'</rehearsal>');
      if(pi===0&&q.txt) o+=dirw('<words>'+xe(q.txt)+'</words>');
      if(!pc.length) o+='<note><rest measure="yes"/><duration>'+mlen(m)*3+'</duration></note>';
      pc.forEach(function(c){ var e=p.ev[c.ev], type=XT[baseDur(c.d)]||'16th', dot=dotted(c.d)?'<dot/>':'';
        if(c.first){ if(stops[c.ev]) o+='<direction><direction-type><wedge type="stop"/></direction-type></direction>';
          if(e.ch) o+=dirw('<words>'+xe(e.ch)+'</words>');
          if(e.dyn) o+='<direction placement="below"><direction-type><dynamics><'+e.dyn+'/></dynamics></direction-type></direction>';
          if(hs[c.ev]) o+='<direction placement="below"><direction-type><wedge type="'+(hs[c.ev].type==='cr'?'crescendo':'diminuendo')+'"/></direction-type></direction>'; }
        if(!c.p.length){ o+='<note><rest/><duration>'+Math.round(c.d*3)+'</duration><type>'+type+'</type>'+dot+(c.tp?TM:'')+'</note>'; return; }
        if(c.first&&e.gr) e.gr.forEach(function(g){ o+='<note><grace slash="yes"/><pitch><step>'+STEPS[g.s]+'</step>'+(g.a?'<alter>'+g.a+'</alter>':'')+'<octave>'+g.o+'</octave></pitch><type>eighth</type></note>'; });
        c.p.forEach(function(pp,k){
          var nt='';
          if(prevTie) nt+='<tied type="stop"/>'; if(c.tieNext) nt+='<tied type="start"/>';
          if(c.first){ var ar=({stac:'<staccato/>',acc:'<accent/>',ten:'<tenuto/>',marc:'<strong-accent/>'})[e.art]; if(ar) nt+='<articulations>'+ar+'</articulations>'; if(e.art==='tr') nt+='<ornaments><trill-mark/></ornaments>'; if(e.art==='mord') nt+='<ornaments><mordent/></ornaments>'; if(e.art==='turn') nt+='<ornaments><turn/></ornaments>'; if(e.art==='trem') nt+='<ornaments><tremolo type="single">3</tremolo></ornaments>'; if(e.art==='dbow') nt+='<technical><down-bow/></technical>'; if(e.art==='ubow') nt+='<technical><up-bow/></technical>'; if(e.art==='arp'&&c.p.length>1) nt+='<arpeggiate/>'; if(e.art==='ferm') nt+='<fermata/>'; }
          o+='<note>'+(k?'<chord/>':'')+'<pitch><step>'+STEPS[pp.s]+'</step>'+(pp.a?'<alter>'+pp.a+'</alter>':'')+'<octave>'+(pp.o+(ovl[c.ev]||0))+'</octave></pitch><duration>'+Math.round(c.d*3)+'</duration>'+(prevTie?'<tie type="stop"/>':'')+(c.tieNext?'<tie type="start"/>':'')+'<type>'+type+'</type>'+dot+(c.tp?TM:'')+(nt?'<notations>'+nt+'</notations>':'')+(c.first&&k===0&&e.ly?'<lyric number="1"><syllabic>single</syllabic><text>'+xe(e.ly)+'</text></lyric>':'')+(c.first&&k===0&&e.ly2?'<lyric number="2"><syllabic>single</syllabic><text>'+xe(e.ly2)+'</text></lyric>':'')+'</note>'; });
        prevTie=!!c.tieNext; });
      if(m===nM-1&&stops[p.ev.length]) o+='<direction><direction-type><wedge type="stop"/></direction-type></direction>';
      if(q.re||q.volta) o+='<barline location="right">'+(q.volta?'<ending number="'+q.volta+'" type="stop"/>':'')+(q.re?'<repeat direction="backward"/>':'')+'</barline>';
      o+='</measure>\n'; }
    o+='</part>\n'; });
  return new Blob([o+'</score-partwise>\n'],{type:'application/vnd.recordare.musicxml+xml'});
}
function readXml(txt,fallbackName){
  var d=new DOMParser().parseFromString(txt,'application/xml'); if(d.getElementsByTagName('parsererror').length||!d.getElementsByTagName('score-partwise').length) throw 0;
  var T=function(el,n){ var x=el.getElementsByTagName(n)[0]; return x?x.textContent:''; }, A=function(l){ return Array.prototype.slice.call(l); };
  var cts=null, ck=null, names={}, mk={}, tempo=null, ts=null, key=null, out=[];
  A(d.getElementsByTagName('score-part')).forEach(function(sp){ names[sp.getAttribute('id')]=T(sp,'part-name'); });
  A(d.documentElement.children).filter(function(n){ return n.nodeName==='part'; }).forEach(function(pe,pidx){
    function newVoice(){ var v={ev:[],acc:0,gr:null}; if(el>0.5) decompose(Math.round(el)).forEach(function(d){ v.ev.push({p:[],d:d,tie:false}); }); return v; }
    var div=1, staves={}, clefs={}, mi=0, pdyn=null, el=0;
    A(pe.children).forEach(function(me){ if(me.nodeName!=='measure') return;
      A(me.children).forEach(function(c){ var nm=c.nodeName;
        if(nm==='attributes'){ var v=T(c,'divisions'); if(v) div=+v||1; var fi=c.getElementsByTagName('fifths')[0]; if(fi){ var nk=Math.max(-6,Math.min(6,+fi.textContent||0)); if(key==null) key=nk; if(pidx===0){ if(ck==null) ck=nk; else if(nk!==ck){ (mk[mi]=mk[mi]||{}).key=nk; ck=nk; } } } var tm=c.getElementsByTagName('time')[0]; if(tm){ var nt=[+T(tm,'beats')||4,+T(tm,'beat-type')||4]; if(!ts) ts=nt; if(pidx===0){ if(!cts) cts=nt; else if(nt[0]!==cts[0]||nt[1]!==cts[1]){ (mk[mi]=mk[mi]||{}).ts=nt; cts=nt; } } }
          A(c.getElementsByTagName('clef')).forEach(function(ce){ var n=ce.getAttribute('number')||'1', sg=T(ce,'sign'); clefs[n]=sg==='F'?'bass':sg==='C'?'alto':sg==='percussion'?'drum':(+T(ce,'clef-octave-change')<0?'treble8':'treble'); }); }
        else if(nm==='direction'){ var so=c.getElementsByTagName('sound')[0]; if(so&&so.getAttribute('tempo')){ var tp=Math.round(+so.getAttribute('tempo')); if(tp>=30&&tp<=260){ if(tempo==null) tempo=tp; else if(pidx===0&&mi>0) (mk[mi]=mk[mi]||{}).tempo=tp; } }
          var dy=c.getElementsByTagName('dynamics')[0]; if(dy) ['ppp','pp','p','mp','mf','f','ff','fff','sfz'].forEach(function(dn){ if(dy.getElementsByTagName(dn).length) pdyn=dn; });
          var w=c.getElementsByTagName('words')[0]; if(pidx===0&&w&&w.textContent.trim()&&!c.getElementsByTagName('dynamics').length) (mk[mi]=mk[mi]||{}).txt=w.textContent.trim().slice(0,30);
          if(pidx===0&&c.getElementsByTagName('rehearsal').length) (mk[mi]=mk[mi]||{}).reh=true; }
        else if(nm==='barline'&&pidx===0){ var rp=c.getElementsByTagName('repeat')[0], en=c.getElementsByTagName('ending')[0], q=mk[mi]=mk[mi]||{};
          if(rp){ if(rp.getAttribute('direction')==='forward') q.rs=true; else q.re=true; } if(en&&en.getAttribute('type')==='start'){ var vn=parseInt(en.getAttribute('number'),10); if(vn===1||vn===2) q.volta=vn; } }
        else if(nm==='note'){ if(c.getElementsByTagName('grace').length){ var gp=c.getElementsByTagName('pitch')[0]; if(gp){ var gs0=T(c,'staff')||'1', gv=T(c,'voice')||'1', G0=staves[gs0]||(staves[gs0]={voices:{},order:[]}), GS=G0.voices[gv]||(G0.order.push(gv),G0.voices[gv]=newVoice()); (GS.gr=GS.gr||[]).push({s:STEPS.indexOf(T(gp,'step')),a:Math.round(+T(gp,'alter')||0),o:+T(gp,'octave')}); } return; }
          var st=T(c,'staff')||'1', vo=T(c,'voice')||'1', S0=staves[st]||(staves[st]={voices:{},order:[]}), S=S0.voices[vo]||(S0.order.push(vo),S0.voices[vo]=newVoice());
          var pe2=c.getElementsByTagName('pitch')[0], pp=null; if(pe2) pp={s:STEPS.indexOf(T(pe2,'step')),a:Math.round(+T(pe2,'alter')||0),o:+T(pe2,'octave')}; if(pp&&pp.s<0) return;
          if(c.getElementsByTagName('chord').length){ var lastE=S.ev[S.ev.length-1]; if(lastE&&pp&&lastE.p.length) lastE.p.push(pp); return; }
          var raw=+T(c,'duration')*16/div, tm3=c.getElementsByTagName('actual-notes')[0]&&+c.getElementsByTagName('actual-notes')[0].textContent===3&&+T(c,'normal-notes')===2, units=tm3&&raw>=2.6?raw:Math.max(4,Math.round(raw/4)*4), ev={p:pp?[pp]:[],d:units,tie:false}; if(tm3&&raw>=2.6) ev.tp=3; if(S.gr&&S.gr.length&&pp){ ev.gr=S.gr.filter(function(g){ return g.s>=0; }); S.gr=null; if(!ev.gr.length) delete ev.gr; }
          if(pdyn&&pp){ ev.dyn=pdyn; pdyn=null; }
          if(pp&&A(c.getElementsByTagName('tie')).some(function(t){ return t.getAttribute('type')==='start'; })) ev.tie=true;
          A(c.getElementsByTagName('lyric')).forEach(function(ly){ if(!T(ly,'text')) return; if(ly.getAttribute('number')==='2') ev.ly2=T(ly,'text'); else if(!ev.ly) ev.ly=T(ly,'text'); });
          if(c.getElementsByTagName('staccato').length) ev.art='stac'; else if(c.getElementsByTagName('accent').length) ev.art='acc'; else if(c.getElementsByTagName('tenuto').length) ev.art='ten'; else if(c.getElementsByTagName('strong-accent').length) ev.art='marc'; else if(c.getElementsByTagName('trill-mark').length) ev.art='tr'; else if(c.getElementsByTagName('fermata').length) ev.art='ferm'; else if(c.getElementsByTagName('mordent').length) ev.art='mord'; else if(c.getElementsByTagName('turn').length) ev.art='turn'; else if(c.getElementsByTagName('tremolo').length) ev.art='trem'; else if(c.getElementsByTagName('down-bow').length) ev.art='dbow'; else if(c.getElementsByTagName('up-bow').length) ev.art='ubow'; else if(c.getElementsByTagName('arpeggiate').length) ev.art='arp';
          S.ev.push(ev); S.acc+=ev.d; } });
      var ML=(pidx===0?cts:null)||ts?((pidx===0&&cts?cts:ts)[0]*64/(pidx===0&&cts?cts:ts)[1]):64, maxA=0; Object.keys(staves).forEach(function(k){ staves[k].order.forEach(function(vn){ var V=staves[k].voices[vn]; maxA=Math.max(maxA,V.acc); if(me.getAttribute('implicit')!=='yes'&&V.acc<ML-.5) decompose(Math.round(ML-V.acc)).forEach(function(d){ V.ev.push({p:[],d:d,tie:false}); }); V.acc=0; }); });
      el+=me.getAttribute('implicit')==='yes'?maxA:ML;
      mi++; });
    var ks=Object.keys(staves).sort(); ks.forEach(function(k){ var S0=staves[k], used=0; S0.order.forEach(function(vn){ var V=S0.voices[vn]; if(!V.ev.some(function(e){ return e.p.length; })) return; out.push({name:(names[pe.getAttribute('id')]||('파트 '+(out.length+1)))+(ks.length>1?' '+k:'')+(used?' '+(used+1):''),clef:clefs[k]||(k==='2'?'bass':'treble'),inst:'piano',vol:80,mute:false,v2:used>0,ev:V.ev}); used++; }); }); });
  if(!out.length) throw 0;
  var title=T(d,'work-title')||T(d,'movement-title')||fallbackName||'MusicXML', comp=''; A(d.getElementsByTagName('creator')).forEach(function(c){ if(c.getAttribute('type')==='composer') comp=c.textContent; });
  setScore({name:title,composer:comp,tempo:tempo||100,ts:ts||[4,4],key:key||0,mk:mk,parts:out.slice(0,8)});
}
function songSec(){ var mk=score.mk||{}, tp=score.tempo, sec=0; playOrder(L.ms.length).forEach(function(m){ if(mk[m]&&mk[m].tempo) tp=mk[m].tempo; sec+=mlen(m)*60/tp/16; }); return sec; }
function exportWav(){
  if(play) stopPlay(); layout(); toast('소리 파일을 만드는 중이에요…');
  var sr=44100, secs=songSec()+3, OA=window.OfflineAudioContext||window.webkitOfflineAudioContext; if(!OA){ toast('이 브라우저는 소리 파일 만들기를 지원하지 않아요'); return; }
  var sc=ctx, sm=master, sp=pbs, off=new OA(2,Math.ceil(secs*sr),sr);
  try{ ctx=off; var comp=off.createDynamicsCompressor(); master=off.createGain(); master.gain.value=.7; master.connect(comp); comp.connect(off.destination); offlineMode=true; pbs=Object.assign({},pbs,{metro:false,count:false,speed:100,loop:false}); schedule(0,null,.05); }
  catch(e){ toast('소리 파일을 만들지 못했어요'); return; }
  finally{ ctx=sc; master=sm; pbs=sp; offlineMode=false; }
  off.startRendering().then(function(buf){
    var n=buf.length, a=buf.getChannelData(0), b=buf.getChannelData(1), end=n; while(end>sr/2&&Math.abs(a[end-1])<1e-4&&Math.abs(b[end-1])<1e-4) end--; end=Math.min(n,end+sr/4);
    var data=new DataView(new ArrayBuffer(44+end*4)); function w(o,s){ for(var i=0;i<s.length;i++) data.setUint8(o+i,s.charCodeAt(i)); }
    w(0,'RIFF'); data.setUint32(4,36+end*4,true); w(8,'WAVE'); w(12,'fmt '); data.setUint32(16,16,true); data.setUint16(20,1,true); data.setUint16(22,2,true); data.setUint32(24,sr,true); data.setUint32(28,sr*4,true); data.setUint16(32,4,true); data.setUint16(34,16,true); w(36,'data'); data.setUint32(40,end*4,true);
    for(var i=0;i<end;i++){ data.setInt16(44+i*4,Math.max(-1,Math.min(1,a[i]))*32767,true); data.setInt16(46+i*4,Math.max(-1,Math.min(1,b[i]))*32767,true); }
    download(fname('wav'),new Blob([data],{type:'audio/wav'})); toast('WAV 파일을 만들었어요');
  }).catch(function(){ toast('소리 파일을 만들지 못했어요'); });
}
function openFile(file){
  var r=new FileReader();
  if(/\.(musicxml|xml)$/i.test(file.name)){ r.onload=function(){ var keep=snap(); try{ readXml(String(r.result),file.name.replace(/\.[^.]+$/,'')); cur={part:0,idx:-1}; $('dname').value=score.name; commit(); toast('MusicXML을 열었어요. 연음표 같은 복잡한 리듬은 가까운 길이로 바뀔 수 있어요'); }catch(e){ setScore(JSON.parse(keep)); toast('이 MusicXML 파일을 열지 못했어요'); } }; r.readAsText(file); return; }
  if(/\.midi?$/i.test(file.name)){ r.onload=function(){ var keep=snap(); try{ readMidi(r.result); score.name=file.name.replace(/\.[^.]+$/,''); cur={part:0,idx:-1}; $('dname').value=score.name; commit(); toast('MIDI를 열었어요. 리듬은 16분음표 칸에 맞춰져요'); }catch(e){ setScore(JSON.parse(keep)); toast('이 MIDI 파일을 열지 못했어요'); } }; r.readAsArrayBuffer(file); return; }
  r.onload=function(){ try{ var o=JSON.parse(String(r.result)); if(!o.parts) throw 0; setScore(o); cur={part:0,idx:-1}; $('dname').value=score.name; commit(); }catch(e){ toast('이 파일을 열지 못했어요'); } }; r.readAsText(file);
}

/* ---------- ui ---------- */
var TOOLS=[['in','✎','음표 찍기: 오선을 눌러요'],['sel','↖','고르기: 음표만 골라요'],['range','▭','범위 고르기: 시작 음표를 누른 뒤 끝 음표를 눌러요'],['d64','온','온음표 (1)'],['d32','2분','2분음표 (2)'],['d16','4분','4분음표 (3)'],['d8','8분','8분음표 (4)'],['d4','16분','16분음표 (5)'],['dot','•','점음표 (.)'],['rest','쉼','쉼표 (R)'],['acc1','♯','올림표 (+)'],['acc-1','♭','내림표 (-)'],['acc0','♮','제자리표'],['tie','⌒','붙임줄 (T)'],['chord','화음','화음: 켜고 같은 음표 위·아래를 눌러요'],['del','🗑','지우기 (Delete)']];
function renderTools(){
  $('tools').innerHTML=TOOLS.map(function(t){ var k=t[0], on=(k==='in'&&ui.tool==='in')||(k==='sel'&&ui.tool==='sel')||(k==='range'&&ui.tool==='range')||(k==='d'+ui.dur)||(k==='dot'&&ui.dot)||(k==='rest'&&ui.rest)||(k==='chord'&&ui.chord)||(k.indexOf('acc')===0&&ui.acc===+k.slice(3));
    return '<button class="tl'+(on?' on':'')+'" data-t="'+k+'" title="'+t[2]+'" aria-label="'+t[2]+'" aria-pressed="'+(on?'true':'false')+'" style="font-size:'+(t[1].length>1?'11':'18')+'px;font-weight:600">'+t[1]+'</button>'; }).join('');
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
  var h='', b=$('pbody'); document.querySelectorAll('#ptabs button').forEach(function(x){ x.classList.toggle('on',x.dataset.p===ptab); x.setAttribute('role','tab'); x.setAttribute('aria-selected',x.dataset.p===ptab?'true':'false'); });
  var lv=$('live'); if(lv){ var ce=curEv(), msg=ce?(ce.p.length?ce.p.map(pname).join(' ')+' · ':'쉼표 · ')+durName(ce.d)+' · '+(mAt(startOf(curPart(),cur.idx))+1)+'번째 마디'+(selR()&&selEvs().length>1?' · '+selEvs().length+'개 선택':''):''; if(msg!==lv.dataset.last){ lv.dataset.last=msg; lv.textContent=msg; } }
  if(ptab==='note'){
    var ev=curEv();
    if(score.parts.length>1) h+='<div class="sec"><div class="row"><label>쓰는 파트</label><select data-curpart="1">'+score.parts.map(function(q,i){ return '<option value="'+i+'"'+(i===cur.part?' selected':'')+'>'+esc(q.name)+(q.v2?' (둘째 성부)':'')+'</option>'; }).join('')+'</select></div></div>';
    h+='<div class="sec"><h4>건반으로 쓰기</h4>'+pianoHtml()+'<div class="note">건반을 누르면 소리가 나면서 고른 음표 뒤에(없으면 맨 끝에) 지금 길이로 들어가요. 화음 도구를 켜면 같은 음표에 쌓여요.</div></div>';
    h+='<div class="sec"><h4>음 이어 쓰기 (키보드 없이)</h4><div class="btns">'+'CDEFGAB'.split('').map(function(c){ return '<button class="tbtn" data-n="'+c+'" style="min-width:38px;font-weight:700">'+c+'</button>'; }).join('')+'<button class="tbtn" data-n="R">쉼표</button></div><div class="note">왼쪽 도구에서 길이·♯♭를 고르고 누르면 고른 음표 뒤에(없으면 맨 끝에) 이어져요.</div></div>';
    h+='<div class="sec"><h4>고른 음표</h4>';
    if(ev){ h+='<div class="note" style="margin:0 0 6px">'+(ev.p.length?ev.p.map(pname).join(' + '):'쉼표')+' · '+durName(ev.d)+(ev.tie?' · 붙임줄':'')+'</div><div class="btns"><button class="tbtn" data-a="up">▲ 한 칸 위</button><button class="tbtn" data-a="down">▼ 한 칸 아래</button><button class="tbtn" data-a="s1">♯ 반음 위</button><button class="tbtn" data-a="s-1">♭ 반음 아래</button><button class="tbtn" data-a="o1">옥타브 ▲</button><button class="tbtn" data-a="o-1">옥타브 ▼</button><button class="tbtn" data-a="del">지우기</button></div>'; }
    else h+='<div class="note">음표를 누르면 여기서 고칠 수 있어요.</div>';
    if(ev){
      h+='<div class="note" style="margin:8px 0 4px">셈여림</div><div class="btns">'+['ppp','pp','p','mp','mf','f','ff','fff','sfz'].map(function(d){ return '<button class="tbtn'+(ev.dyn===d?' on':'')+'" data-dy="'+d+'" style="font-style:italic;font-weight:700">'+d+'</button>'; }).join('')+'<button class="tbtn" data-dy="">없음</button></div><div class="btns"><button class="tbtn'+(ev.hp==='cr'?' on':'')+'" data-hp="cr">점점 크게 &lt;</button><button class="tbtn'+(ev.hp==='dm'?' on':'')+'" data-hp="dm">점점 작게 &gt;</button><button class="tbtn" data-hp="">해제</button></div>';
      h+='<div class="note" style="margin:8px 0 4px">기호</div><div class="btns">'+[['stac','스타카토'],['acc','악센트'],['ten','테누토'],['ferm','늘임표'],['marc','마르카토'],['tr','트릴'],['mord','모르덴트'],['arp','펼침화음 (화음)'],['trem','트레몰로'],['turn','턴 (회전음)'],['dbow','아래활 ⊓'],['ubow','위활 V']].map(function(a){ return '<button class="tbtn'+(ev.art===a[0]?' on':'')+'" data-ar="'+a[0]+'">'+a[1]+'</button>'; }).join('')+'<button class="tbtn'+(ev.slur?' on':'')+'" data-a="slur">'+(ev.slur?'슬러 '+(ev.slur===true?1:ev.slur)+'음 뒤까지':'슬러 (누를 때마다 1~4음)')+'</button><button class="tbtn" data-ar="">기호 없음</button></div>';
      h+='<div class="note" style="margin:8px 0 4px">옥타브선 · 페달</div><div class="btns">'+[[1,'8va 시작'],[-1,'8vb 시작'],[0,'옥타브선 끝']].map(function(a){ return '<button class="tbtn'+(ev.ov!=null&&+ev.ov===a[0]?' on':'')+'" data-ov="'+a[0]+'">'+a[1]+'</button>'; }).join('')+'<button class="tbtn" data-ov="x">옥타브선 지움</button></div><div class="btns">'+[['d','페달 밟기 Ped.'],['u','페달 떼기 ✱']].map(function(a){ return '<button class="tbtn'+(ev.ped===a[0]?' on':'')+'" data-pd="'+a[0]+'">'+a[1]+'</button>'; }).join('')+'<button class="tbtn" data-pd="">페달 표시 지움</button></div>';
      h+='<div class="row"><label>꾸밈음</label><input type="text" data-gr="1" value="'+esc((ev.gr||[]).map(function(g){ return STEPS[g.s]+(g.a>0?'#':g.a<0?'b':'')+g.o; }).join(' '))+'" placeholder="예: D5 (비우면 없앰)" data-notr></div>';
      h+='<div class="row"><label>가사</label><input type="text" data-ly="1" value="'+esc(ev.ly||'')+'" data-notr></div><div class="row"><label>코드 이름</label><input type="text" data-chn="1" value="'+esc(ev.ch||'')+'" placeholder="예: Am7" data-notr></div>';
      h+='<div class="row"><label>코드 고르기</label><select id="chR">'+['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'].map(function(r){ return '<option>'+r+'</option>'; }).join('')+'</select><select id="chQ">'+[['',''],['m','m'],['7','7'],['maj7','maj7'],['m7','m7'],['6','6'],['dim','dim'],['aug','aug'],['sus4','sus4'],['add9','add9'],['m7b5','m7♭5']].map(function(q){ return '<option value="'+q[0]+'">'+(q[1]||'장3화음')+'</option>'; }).join('')+'</select><button class="tbtn" data-ch="pick" style="height:30px">넣기</button></div>';
      h+='<div class="row"><label>손가락 번호</label><input type="text" data-fg="1" maxlength="4" value="'+esc(ev.fg||'')+'" placeholder="예: 3" data-notr></div>';
      h+='<div class="row"><label>2절 가사</label><input type="text" data-ly2="1" value="'+esc(ev.ly2||'')+'" data-notr></div>';
    }
    h+='</div>';
    var nsel=selEvs().length;
    h+='<div class="sec"><h4>편집'+(nsel>1?' · '+nsel+'개 고름':'')+'</h4><div class="btns">'+[['copy','복사'],['cut','잘라내기'],['paste','붙여넣기'],['dup','복제'],['all','모두 고르기'],['meas','마디 고르기'],['none','고르기 풀기'],['rev','거꾸로'],['tup','셋잇단음표 켜기/끄기']].map(function(a){ return '<button class="tbtn" data-ed="'+a[0]+'">'+a[1]+'</button>'; }).join('')+'</div><div class="note" style="margin:6px 0 4px">옮기기 (고른 음표, 없으면 이 파트 전체)</div><div class="btns">'+[['t-12','−1옥타브'],['t-1','−반음'],['t1','+반음'],['t12','+1옥타브'],['t-2','−온음'],['t2','+온음']].map(function(a){ return '<button class="tbtn" data-ed="'+a[0]+'">'+a[1]+'</button>'; }).join('')+'</div><div class="note">범위: 범위 도구(▭)로 시작·끝 음표를 차례로 누르거나, Shift를 누른 채 누르거나 Shift+←→. 음표를 위아래로 끌면 음 높이가 바뀌어요.</div></div>';
    var mk=(score.mk||{})[cur.m]||{};
    if(cur.m!=null&&cur.m>=0){ h+='<div class="sec"><h4>'+(cur.m+1)+'번째 마디</h4><div class="btns"><button class="tbtn'+(mk.rs?' on':'')+'" data-mk="rs">도돌이표 시작 |:</button><button class="tbtn'+(mk.re?' on':'')+'" data-mk="re">도돌이표 끝 :|</button><button class="tbtn'+(mk.volta===1?' on':'')+'" data-mk="v1">1번 괄호</button><button class="tbtn'+(mk.volta===2?' on':'')+'" data-mk="v2">2번 괄호</button><button class="tbtn'+(mk.reh?' on':'')+'" data-mk="reh">연습 기호 (A B C…)</button></div><div class="btns">'+[['segno','Segno'],['coda','Coda'],['tocoda','To Coda'],['ds','D.S.'],['dc','D.C.'],['fine','Fine']].map(function(j){ return '<button class="tbtn'+(mk[j[0]]?' on':'')+'" data-mk="'+j[0]+'">'+j[1]+'</button>'; }).join('')+'</div><div class="row"><label>조 바꾸기</label><select data-mkk="1"><option value="">바꾸지 않음</option>'+KEYS.map(function(k){ return '<option value="'+k[1]+'"'+(mk.key===k[1]?' selected':'')+'>'+k[0]+'</option>'; }).join('')+'</select></div><div class="row"><label>박자 바꾸기</label><select data-mkts="1"><option value="">바꾸지 않음</option>'+['4/4','3/4','2/4','6/8','2/2','5/4','12/8','7/8','9/8','3/8'].map(function(v){ return '<option value="'+v+'"'+(mk.ts&&mk.ts[0]+'/'+mk.ts[1]===v?' selected':'')+'>'+v+'</option>'; }).join('')+'</select></div><div class="row"><label>마디 글자</label><input type="text" data-mkx="1" value="'+esc(mk.txt||'')+'" placeholder="예: Allegro, rit." data-notr></div><div class="row"><label>빠르기말</label><select data-mkp="1"><option value="">고르기…</option>'+[['Largo|50','Largo (아주 느리게)'],['Adagio|66','Adagio (느리게)'],['Andante|84','Andante (걷는 빠르기)'],['Moderato|108','Moderato (보통)'],['Allegro|132','Allegro (빠르게)'],['Vivace|160','Vivace (활발하게)'],['Presto|184','Presto (아주 빠르게)'],['rit.|','rit. (점점 느리게)'],['accel.|','accel. (점점 빠르게)'],['a tempo|','a tempo (원래 빠르기로)']].map(function(x){ return '<option value="'+x[0]+'">'+x[1]+'</option>'; }).join('')+'</select></div><div class="row"><label>빠르기 바꾸기</label><input type="number" min="30" max="260" data-mkt="1" value="'+(mk.tempo||'')+'" placeholder="그대로"><span class="v">BPM</span></div></div>'; }
    h+='<div class="sec"><h4>쓰는 법</h4><div class="note">오선을 누르면 왼쪽에서 고른 길이의 음표가 찍혀요. 키보드에서 <b>A~G</b>를 누르면 이어서 음이 들어가고, <b>1~5</b>는 길이, <b>R</b>은 쉼표, <b>↑↓</b>는 음 높이, <b>Delete</b>는 지우기, <b>Space</b>는 재생이에요. 같은 줄을 여러 마디 이어 쓰면 마디는 알아서 나뉘고 걸치는 음은 붙임줄이 돼요.</div></div>';
  } else if(ptab==='song'){
    h+='<div class="sec"><h4>곡 정보</h4><div class="row"><label>작곡</label><input type="text" id="comp" value="'+esc(score.composer||'')+'" data-notr></div><div class="row"><label>작사</label><input type="text" id="lyr" value="'+esc(score.lyr||'')+'" data-notr></div><div class="row"><label>부제</label><input type="text" id="sub" value="'+esc(score.sub||'')+'" data-notr></div><div class="row"><label>저작권 글</label><input type="text" id="cpy" value="'+esc(score.cpy||'')+'" placeholder="예: © 2026 홍길동" data-notr></div>';
    h+='<div class="row"><label>빠르기</label><input type="range" id="tempo" min="40" max="220" value="'+score.tempo+'"><span class="v" id="tempoV">'+score.tempo+'</span></div>';
    h+='<div class="row"><label>박자</label>'+sel('tsel',[['4/4',"4/4"],['3/4',"3/4"],['2/4',"2/4"],['6/8',"6/8"],['2/2',"2/2"],['5/4',"5/4"],['12/8',"12/8"]],score.ts[0]+'/'+score.ts[1])+'</div>';
    h+='<div class="row"><label>한 줄에 마디</label><select data-opt="mps"><option value="0"'+(!score.mps?' selected':'')+'>자동</option>'+[1,2,3,4,5,6,8].map(function(n){ return '<option value="'+n+'"'+(score.mps===n?' selected':'')+'>'+n+'마디씩</option>'; }).join('')+'</select></div><label class="chk"><input type="checkbox" data-opt="pl"'+(score.pl?' checked':'')+'> 파트 이름을 오선 위에 쓰기</label>';
    h+='<div class="row"><label>마디 번호</label><select data-opt="mn"><option value="0"'+(!score.mn?' selected':'')+'>안 보임</option><option value="1"'+(score.mn===1?' selected':'')+'>줄 첫머리</option><option value="2"'+(score.mn===2?' selected':'')+'>모든 마디</option></select></div>';
    h+='<div class="row"><label>음 이름 표시</label><select data-opt="nn"><option value="0"'+(!score.nn?' selected':'')+'>안 보임</option><option value="1"'+(score.nn===1?' selected':'')+'>C D E (영어)</option><option value="2"'+(score.nn===2?' selected':'')+'>도 레 미</option></select></div><label class="chk"><input type="checkbox" data-opt="nc"'+(score.nc?' checked':'')+'> 음마다 색깔로 칠하기 (도=빨강 … 시=보라)</label>';
    h+='<div class="row"><label>조</label>'+sel('ksel',KEYS,score.key)+'</div><label class="chk"><input type="checkbox" data-pb="keyMove"'+(pbs.keyMove?' checked':'')+'> 조를 바꿀 때 음도 같이 옮기기</label></div>';
    h+='<div class="sec"><h4>재생 설정</h4><label class="chk"><input type="checkbox" data-pb="metro"'+(pbs.metro?' checked':'')+'> 메트로놈 소리 켜기</label><label class="chk"><input type="checkbox" data-pb="count"'+(pbs.count?' checked':'')+'> 시작 전에 한 마디 세어 주기</label><label class="chk"><input type="checkbox" data-pb="loop"'+(pbs.loop?' checked':'')+'> 끝나면 처음부터 반복</label><label class="chk"><input type="checkbox" data-pb="selOnly"'+(pbs.selOnly?' checked':'')+'> 고른 음표 범위만 재생 (범위 도구로 고르기)</label><div class="row"><label>코드 반주</label><select data-pbsel="chords"><option value="off"'+(pbs.chords==='off'?' selected':'')+'>끄기</option><option value="block"'+(pbs.chords==='block'?' selected':'')+'>코드 이름대로 화음</option><option value="arp"'+(pbs.chords==='arp'?' selected':'')+'>코드 이름대로 펼침화음</option></select></div><div class="row"><label>스윙</label><select data-pbsel="swing"><option value="50"'+(pbs.swing==50?' selected':'')+'>없음</option><option value="58"'+(pbs.swing==58?' selected':'')+'>살짝</option><option value="66"'+(pbs.swing==66?' selected':'')+'>스윙 (3연음 느낌)</option></select></div><div class="row"><label>재생 속도</label><input type="range" data-pbs="1" min="40" max="160" step="5" value="'+pbs.speed+'"><span class="v" id="pbsV">'+pbs.speed+'%</span></div><div class="note">재생 중에는 소리 나는 음표가 청록빛으로 표시돼요.</div></div>';
    h+='<div class="sec"><h4>파트 (오선)</h4>';
    score.parts.forEach(function(p,i){ h+='<div style="border:1px solid '+(i===cur.part?'var(--fry)':'var(--line)')+';border-radius:9px;padding:8px;margin:6px 0"><div class="row"><input type="text" data-pn="'+i+'" value="'+esc(p.name)+'" data-notr><button class="tbtn" data-pa="sel'+i+'" style="height:28px">'+(i===cur.part?'쓰는 중':'고르기')+'</button></div>'
      +'<div class="row"><label>음자리표</label><select data-pc="'+i+'"'+(p.v2?' disabled':'')+'>'+Object.keys(CLEFN).map(function(c){ return '<option value="'+c+'"'+(p.clef===c?' selected':'')+'>'+CLEFN[c]+'</option>'; }).join('')+'</select></div>'
      +(i>0?'<label class="chk"><input type="checkbox" data-pv2="'+i+'"'+(p.v2?' checked':'')+'> 위 파트와 같은 오선에 겹쳐 쓰기 (둘째 성부)</label>':'')
      +'<div class="row"><label>이조 악기</label><select data-ptr="'+i+'">'+[[0,'없음 (쓴 대로 들림)'],[-2,'B♭ 악기 (클라리넷·트럼펫)'],[-9,'E♭ 악기 (알토 색소폰)'],[-7,'F 악기 (호른)'],[12,'한 옥타브 위 (피콜로)'],[-12,'한 옥타브 아래 (더블베이스)']].map(function(x){ return '<option value="'+x[0]+'"'+((+p.trans||0)===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></div>'
      +'<div class="row"><label>TAB 악보</label><select data-ptab="'+i+'"><option value=""'+(!p.tab?' selected':'')+'>없음</option><option value="gtr"'+(p.tab==='gtr'?' selected':'')+'>기타 (6줄)</option><option value="bass"'+(p.tab==='bass'?' selected':'')+'>베이스 (4줄)</option></select></div>'
      +'<div class="row"><label>악기</label><select data-pi="'+i+'">'+INSTS.map(function(x){ return '<option value="'+x[0]+'"'+(p.inst===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></div>'
      +'<div class="row"><label>소리 크기</label><input type="range" data-pv="'+i+'" min="0" max="100" value="'+p.vol+'"><label class="chk" style="margin:0"><input type="checkbox" data-pm="'+i+'"'+(p.mute?' checked':'')+'> 끄기</label><label class="chk" style="margin:0"><input type="checkbox" data-ps="'+i+'"'+(p.solo?' checked':'')+'> 혼자</label></div>'
      +'<div class="row"><label>좌우 위치</label><input type="range" data-pp="'+i+'" min="-100" max="100" step="10" value="'+Math.round((p.pan||0)*100)+'"><span class="v">'+(p.pan?(p.pan<0?'왼 ':'오 ')+Math.abs(Math.round(p.pan*100)):'가운데')+'</span></div>'
      +(score.parts.length>1?'<div class="btns"><button class="tbtn" data-pa="del'+i+'">이 파트 지우기</button></div>':'')+'</div>'; });
    h+=(score.parts.length<8?'<div class="btns"><button class="tbtn" data-pa="add">+ 파트 더하기</button></div>':'')+'</div>';
    h+='<div class="sec"><h4>새 악보 틀</h4><div class="btns"><button class="tbtn" data-tpl="lead">한 줄 악보</button><button class="tbtn" data-tpl="piano">피아노 (두 줄)</button><button class="tbtn" data-tpl="quartet">현악 4중주</button><button class="tbtn" data-tpl="guitar">기타</button><button class="tbtn" data-tpl="band">밴드 (멜로디·화음·베이스)</button></div><div class="note">지금 악보를 바꿔요. 되돌리기로 돌아올 수 있어요.</div></div>';
    var lib=libGet();
    h+='<div class="sec"><h4>내 보관함 (이 브라우저에 저장)</h4><div class="btns"><button class="tbtn pri" data-lib="save">지금 악보 보관하기</button></div>'+(lib.length?lib.map(function(x){ var dt=new Date(x.t); return '<div class="row" style="justify-content:space-between"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+esc(x.name)+'">'+esc(x.name)+(x.id===score.libId?' ✓':'')+'<br><span class="v" style="font-size:11px;color:var(--dim)">'+(dt.getMonth()+1)+'/'+dt.getDate()+' '+('0'+dt.getHours()).slice(-2)+':'+('0'+dt.getMinutes()).slice(-2)+'</span></span><button class="tbtn" style="height:28px" data-lib="open:'+x.id+'">열기</button><button class="tbtn" style="height:28px" data-lib="del:'+x.id+'">'+(libDel===x.id?'한 번 더':'지우기')+'</button></div>'; }).join(''):'<div class="note">아직 보관한 악보가 없어요. 위 버튼을 누르면 지금 악보가 목록에 저장돼요.</div>')+'</div>';
    h+='<div class="sec"><h4>예시 곡</h4><div class="btns"><button class="tbtn" data-ex="twinkle">반짝반짝 작은 별</button><button class="tbtn" data-ex="ode">환희의 송가</button><button class="tbtn" data-ex="canon">캐논 (2파트)</button></div><div class="btns"><button class="tbtn" id="bNew">모두 지우고 새로 시작</button></div></div>';
  } else if(ptab==='text'){
    h+='<div class="sec"><h4>글자로 악보 쓰기 (쓰는 중인 파트)</h4><textarea id="txt" style="min-height:150px" data-notr>'+esc(toText(curPart()))+'</textarea>';
    h+='<div class="sec"><h4>가사 한꺼번에 붙이기</h4><div class="row"><label>절</label><select id="lyV"><option value="1">1절</option><option value="2">2절</option></select></div><textarea id="lyTxt" style="min-height:70px" placeholder="반 짝 반 짝 작 은 별 (띄어쓰기마다 음표 하나, 건너뛰려면 _)" data-notr></textarea><div class="btns"><button class="tbtn" id="lyApply">가사 붙이기</button></div><div class="note">고른 음표부터(고른 게 없으면 처음부터) 쉼표를 빼고 차례로 붙어요.</div></div>';
    h+='<div class="sec"><h4>음 찾아 바꾸기</h4><div class="row"><label>찾을 음</label><input type="text" id="frF" placeholder="예: F 또는 F#4" data-notr></div><div class="row"><label>바꿀 음</label><input type="text" id="frT" placeholder="예: G, Bb3, R(쉼표)" data-notr></div><label class="chk"><input type="checkbox" id="frAll"> 모든 파트에서</label><div class="btns"><button class="tbtn" id="frGo">바꾸기</button></div><div class="note">옥타브를 안 쓰면 모든 옥타브를 찾고, 바꿀 때는 원래 옥타브를 그대로 둬요.</div></div>';
    h+='<div class="btns"><button class="tbtn pri" id="txtApply">악보에 적용</button></div><div class="note">음 이름 + 옥타브 + /길이 로 써요. 예) <b>C4/4 E4 G4/2 R/4 C4+E4+G4/2.</b><br>길이 /1 온, /2 2분, /4 4분, /8 8분, /16 16분, 뒤에 <b>.</b>이면 점음표, <b>#</b> 올림, <b>b</b> 내림, <b>+</b>로 화음, <b>R</b> 쉼표, 끝에 <b>~</b>는 붙임줄이에요. 길이와 옥타브를 안 쓰면 앞의 것을 그대로 써요.</div></div>';
  } else {
    h+='<div class="sec"><h4>AI에게 멜로디 부탁하기 (시험 기능)</h4><textarea id="aiQ" placeholder="예: 밝고 쉬운 8마디 동요 멜로디 / 슬픈 느낌의 단조 멜로디"></textarea><div class="btns"><button class="tbtn pri" id="aiGo">만들기</button><button class="tbtn" id="aiSet">AI 설정</button></div><div class="note" id="aiOut">AI가 글자 악보를 써 주면 쓰는 중인 파트 끝에 이어 붙여요. 박자가 안 맞거나 엉뚱할 수 있으니 들어 보고 고쳐 쓰세요. 마음에 안 들면 되돌리기를 눌러요.</div></div>';
  }
  b.innerHTML=h;
}
function durName(d){ var base=baseDur(d), nm={64:'온음표',32:'2분음표',16:'4분음표',8:'8분음표',4:'16분음표'}[base]||(d+'/64'); return (dotted(d)?'점 ':'')+(Math.abs(d-Math.round(d))>1e-3?'셋잇단 ':'')+nm; }
$('ptabs').addEventListener('click',function(e){ var b=e.target.closest('button'); if(b){ ptab=b.dataset.p; panel(); } });
var pb=$('pbody');
pb.addEventListener('pointerdown',function(e){ var k=e.target.closest&&e.target.closest('[data-pk]'); if(!k) return; e.preventDefault(); addMidi(+k.dataset.pk); });
pb.addEventListener('click',function(e){
  var t=e.target.closest('button'); if(!t) return;
  if(t.dataset.pk) return;
  if(t.dataset.pko){ pkOct=Math.max(1,Math.min(7,pkOct+(+t.dataset.pko))); panel(); return; }
  if(t.dataset.ed){ editOp(t.dataset.ed); return; }
  if(t.dataset.tpl){ var TP={lead:['한 줄 악보',[['멜로디','treble','piano']]],piano:['피아노 악보',[['오른손','treble','piano'],['왼손','bass','piano']]],quartet:['현악 4중주',[['바이올린 1','treble','strings'],['바이올린 2','treble','strings'],['비올라','alto','strings'],['첼로','bass','strings']]],guitar:['기타 악보',[['기타','treble8','guitar']]],band:['밴드 악보',[['멜로디','treble','flute'],['화음','treble','organ'],['베이스','bass','bass']]]}[t.dataset.tpl]; setScore({name:TP[0],composer:'',tempo:100,ts:[4,4],key:0,mk:{},parts:TP[1].map(function(x){ return {name:x[0],clef:x[1],inst:x[2],vol:80,mute:false,ev:[]}; })}); cur={part:0,idx:-1}; $('dname').value=score.name; commit(); return; }
  if(t.id==='frGo'){ findReplace(); return; }
  if(t.dataset.lib){ var lb=t.dataset.lib; if(lb==='save') libSave(); else if(lb.indexOf('open:')===0) libOpen(lb.slice(5)); else if(lb.indexOf('del:')===0){ var lid=lb.slice(4); if(libDel===lid){ libSet(libGet().filter(function(x){ return x.id!==lid; })); libDel=null; } else { libDel=lid; setTimeout(function(){ if(libDel===lid){ libDel=null; if(ptab==='song') panel(); } },3000); } panel(); } return; }
  if(t.dataset.ch==='pick'){ var ec=curEv(); if(ec){ ec.ch=$('chR').value+$('chQ').value; commit(); } return; }
  if(t.dataset.n){ if(t.dataset.n==='R'){ if(cur.idx>=0&&curEv()) addEvent(cur.part,selR()[1]+1,{p:[],d:newDur(),tie:false}); else addEvent(cur.part,curPart().ev.length,{p:[],d:newDur(),tie:false}); cur.end=-1; commit(); } else { cur.end=-1; if(cur.idx<0) cur.idx=curPart().ev.length-1; addLetter(t.dataset.n); } return; }
  if(t.dataset.a){ var a=t.dataset.a; if(a==='slur'){ var es=curEv(); if(es){ var sn=es.slur?(es.slur===true?1:+es.slur):0; if(sn>=4) delete es.slur; else es.slur=sn+1; commit(); } return; } if(a==='up') moveSel(1); else if(a==='down') moveSel(-1); else if(a==='s1') semi(1); else if(a==='s-1') semi(-1); else if(a==='o1'){ curEv().p.forEach(function(p){ p.o++; }); commit(); } else if(a==='o-1'){ curEv().p.forEach(function(p){ p.o--; }); commit(); } else if(a==='del') delEv(); return; }
  if(t.dataset.pa){ var pa=t.dataset.pa;
    if(pa==='add'){ score.parts.push({name:'파트 '+(score.parts.length+1),clef:'bass',inst:'piano',vol:80,mute:false,ev:[]}); commit(); }
    else if(pa.indexOf('sel')===0){ cur.part=+pa.slice(3); cur.idx=-1; draw(); panel(); }
    else if(pa.indexOf('del')===0){ score.parts.splice(+pa.slice(3),1); cur={part:0,idx:-1}; commit(); } return; }
  if(t.dataset.dy!=null){ var e1=curEv(); if(e1){ if(t.dataset.dy) e1.dyn=t.dataset.dy; else delete e1.dyn; commit(); } return; }
  if(t.dataset.hp!=null){ var e5=curEv(); if(e5){ if(t.dataset.hp&&e5.hp!==t.dataset.hp) e5.hp=t.dataset.hp; else delete e5.hp; commit(); } return; }
  if(t.dataset.ov!=null){ var eo=curEv(); if(eo){ if(t.dataset.ov==='x') delete eo.ov; else eo.ov=+t.dataset.ov; commit(); } return; }
  if(t.dataset.pd!=null){ var ep=curEv(); if(ep){ if(t.dataset.pd&&ep.ped!==t.dataset.pd) ep.ped=t.dataset.pd; else delete ep.ped; commit(); } return; }
  if(t.dataset.ar!=null){ var e2=curEv(); if(e2){ if(t.dataset.ar&&e2.art!==t.dataset.ar) e2.art=t.dataset.ar; else delete e2.art; commit(); } return; }
  if(t.dataset.mk){ score.mk=score.mk||{}; var q=score.mk[cur.m]||(score.mk[cur.m]={}), k=t.dataset.mk; if(k==='rs') q.rs=!q.rs; else if(k==='re') q.re=!q.re; else if(k==='v1') q.volta=q.volta===1?0:1; else if(k==='v2') q.volta=q.volta===2?0:2; else if(k==='reh') q.reh=!q.reh; else if(/^(segno|coda|tocoda|ds|dc|fine)$/.test(k)) q[k]=!q[k]; commit(); return; }
  if(t.id==='lyApply'){ var lk=($('lyV')&&$('lyV').value==='2')?'ly2':'ly', toks=($('lyTxt').value||'').split(/\s+/).filter(Boolean), pp=curPart(), st=cur.idx>=0?cur.idx:0, ti=0; for(var i=st;i<pp.ev.length&&ti<toks.length;i++){ if(!pp.ev[i].p.length) continue; var w=toks[ti++]; if(w==='_') delete pp.ev[i][lk]; else pp.ev[i][lk]=w; } commit(); toast(ti+'개를 붙였어요'); return; }
  if(t.dataset.ex){ loadExample(t.dataset.ex); return; }
  if(t.id==='bNew'){ if(!bnConfirm(t)) return; setScore({name:'이름 없는 악보',composer:'',tempo:100,ts:[4,4],key:0,parts:[{name:'멜로디',clef:'treble',inst:'piano',vol:80,mute:false,ev:[]}]}); cur={part:0,idx:-1}; $('dname').value=score.name; commit(); return; }
  if(t.id==='txtApply'){ var ev=parseText($('txt').value,curPart().clef); curPart().ev=ev; cur.idx=-1; commit(); toast(ev.length+'개를 적용했어요'); return; }
  if(t.id==='aiGo'){ askAI(); return; }
  if(t.id==='aiSet'){ if(window.FFAI) FFAI.settings(); return; }
});
var cf=0; function bnConfirm(b){ if(cf){ cf=0; return true; } cf=1; b.textContent='한 번 더 누르면 지워요'; setTimeout(function(){ cf=0; if(b.isConnected) b.textContent='모두 지우고 새로 시작'; },3000); return false; }
pb.addEventListener('input',function(e){ var t=e.target;
  if(t.dataset.pbs){ pbs.speed=+t.value; $('pbsV').textContent=t.value+'%'; savePbs(); return; }
  if(t.id==='tempo'){ score.tempo=+t.value; $('tempoV').textContent=t.value; } else if(t.id==='comp'){ score.composer=t.value; } else if(t.id==='lyr'){ score.lyr=t.value; } else if(t.id==='sub'){ score.sub=t.value; } else if(t.id==='cpy'){ score.cpy=t.value; } else if(t.dataset.pv!=null){ score.parts[+t.dataset.pv].vol=+t.value; } else if(t.dataset.pp!=null){ score.parts[+t.dataset.pp].pan=+t.value/100; } else if(t.dataset.pn!=null){ score.parts[+t.dataset.pn].name=t.value; } });
pb.addEventListener('change',function(e){ var t=e.target;
  if(t.dataset.opt==='mps'){ score.mps=+t.value; commit(); return; }
  if(t.dataset.opt==='pl'){ score.pl=t.checked; commit(); return; }
  if(t.dataset.opt==='mn'){ score.mn=+t.value; commit(); return; }
  if(t.dataset.opt==='nn'){ score.nn=+t.value; commit(); return; }
  if(t.dataset.opt==='nc'){ score.nc=t.checked; commit(); return; }
  if(t.dataset.pbsel){ pbs[t.dataset.pbsel]=isNaN(+t.value)?t.value:+t.value; savePbs(); return; }
  if(t.dataset.pb){ pbs[t.dataset.pb]=t.checked; savePbs(); if(play&&t.dataset.pb==='loop') play.loop=t.checked; return; }
  if(t.dataset.ps!=null){ score.parts[+t.dataset.ps].solo=t.checked; commit(); return; }
  if(t.id==='tempo'||t.id==='comp'||t.id==='lyr'||t.id==='sub'||t.id==='cpy'||t.dataset.pv!=null||t.dataset.pn!=null||t.dataset.pp!=null){ commit(); return; }
  if(t.id==='tsel'){ var a=t.value.split('/'); score.ts=[+a[0],+a[1]]; commit(); return; }
  if(t.id==='ksel'){ var k0=score.key, k1=+t.value; if(pbs.keyMove&&k1!==k0){ var n=((7*(k1-k0))%12+12)%12; if(n>6) n-=12; score.parts.forEach(function(pt){ pt.ev.forEach(function(e){ e.p.forEach(function(pp){ shiftSemi(pp,n,k1>=0); }); if(e.ch) e.ch=transChord(e.ch,n,k1<0); }); }); } score.key=k1; commit(); return; }
  if(t.dataset.pc!=null){ var pci=+t.dataset.pc; score.parts[pci].clef=t.value; for(var jj=pci+1;jj<score.parts.length&&score.parts[jj].v2;jj++) score.parts[jj].clef=t.value; commit(); return; }
  if(t.dataset.pv2!=null){ var vi=+t.dataset.pv2, vp=score.parts[vi]; vp.v2=t.checked; if(t.checked){ vp.clef=score.parts[parentOf(vi-1)].clef; delete vp.tab; } commit(); return; }
  if(t.dataset.curpart!=null){ cur.part=+t.value; cur.idx=-1; cur.end=-1; draw(); panel(); return; }
  if(t.dataset.ptr!=null){ var ptr=score.parts[+t.dataset.ptr]; if(+t.value) ptr.trans=+t.value; else delete ptr.trans; commit(); return; }
  if(t.dataset.ptab!=null){ var ptb=score.parts[+t.dataset.ptab]; if(t.value) ptb.tab=t.value; else delete ptb.tab; commit(); return; }
  if(t.dataset.pi!=null){ score.parts[+t.dataset.pi].inst=t.value; commit(); return; }
  if(t.dataset.pm!=null){ score.parts[+t.dataset.pm].mute=t.checked; commit(); return; }
  if(t.dataset.gr){ var evg=curEv(); if(evg){ var gl=[], lo=evg.p.length?evg.p[0].o:4; t.value.split(/[\s,]+/).filter(Boolean).slice(0,4).forEach(function(w){ var q=parseNote(w); if(q&&!q.rest){ gl.push({s:q.s,a:q.a,o:q.o==null?lo:q.o}); } }); if(gl.length) evg.gr=gl; else delete evg.gr; commit(); } return; }
  if(t.dataset.fg){ var evf=curEv(); if(evf){ if(t.value.trim()) evf.fg=t.value.trim(); else delete evf.fg; commit(); } return; }
  if(t.dataset.ly2){ var evl=curEv(); if(evl){ if(t.value) evl.ly2=t.value; else delete evl.ly2; commit(); } return; }
  if(t.dataset.ly){ var ev=curEv(); if(ev){ if(t.value) ev.ly=t.value; else delete ev.ly; commit(); } return; }
  if(t.dataset.chn){ var ev2=curEv(); if(ev2){ if(t.value) ev2.ch=t.value; else delete ev2.ch; commit(); } return; }
  if(t.dataset.mkts!=null){ score.mk=score.mk||{}; var q4=score.mk[cur.m]||(score.mk[cur.m]={}); if(cur.m===0){ if(t.value) score.ts=t.value.split('/').map(Number); } else if(t.value==='') delete q4.ts; else q4.ts=t.value.split('/').map(Number); commit(); return; }
  if(t.dataset.mkk!=null){ score.mk=score.mk||{}; var q3=score.mk[cur.m]||(score.mk[cur.m]={}); if(t.value==='') delete q3.key; else q3.key=+t.value; commit(); return; }
  if(t.dataset.mkp){ if(!t.value) return; score.mk=score.mk||{}; var q5=score.mk[cur.m]||(score.mk[cur.m]={}), pr2=t.value.split('|'); q5.txt=pr2[0]; if(pr2[1]) q5.tempo=+pr2[1]; commit(); return; }
  if(t.dataset.mkx){ score.mk=score.mk||{}; var q2=score.mk[cur.m]||(score.mk[cur.m]={}); if(t.value.trim()) q2.txt=t.value.trim(); else delete q2.txt; commit(); return; }
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
function zoomBy(k){ zoom=Math.max(.25,Math.min(2.5,zoom*k)); draw(); }
$('bZf').onclick=function(){ zoom=Math.max(.25,Math.min(2.5,(desk.clientWidth-(window.innerWidth<=820?24:64))/W)); draw(); };
desk.addEventListener('wheel',function(e){ if(e.ctrlKey||e.metaKey){ e.preventDefault(); zoomBy(e.deltaY<0?1.1:1/1.1); } },{passive:false});
var ptrs={}, pinch=null;
desk.addEventListener('pointerdown',function(e){ if(e.pointerType!=='touch') return; ptrs[e.pointerId]=[e.clientX,e.clientY]; var ks=Object.keys(ptrs); if(ks.length===2){ drag=null; var a=ptrs[ks[0]], b=ptrs[ks[1]]; pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1]),z:zoom}; } });
desk.addEventListener('pointermove',function(e){ if(!ptrs[e.pointerId]) return; ptrs[e.pointerId]=[e.clientX,e.clientY]; var ks=Object.keys(ptrs); if(pinch&&ks.length===2){ var a=ptrs[ks[0]], b=ptrs[ks[1]], d=Math.hypot(a[0]-b[0],a[1]-b[1]); if(pinch.d>10){ var z=Math.max(.25,Math.min(2.5,pinch.z*d/pinch.d)); if(Math.abs(z-zoom)>.01){ zoom=z; draw(); } suppress=true; } } });
function endPtr(e){ delete ptrs[e.pointerId]; if(Object.keys(ptrs).length<2&&pinch){ pinch=null; setTimeout(function(){ suppress=false; },80); } }
desk.addEventListener('pointerup',endPtr); desk.addEventListener('pointercancel',endPtr);
$('bZp').onclick=function(){ zoomBy(1.2); }; $('bZm').onclick=function(){ zoomBy(1/1.2); };
$('bUndo').onclick=undo; $('bRedo').onclick=redo;
$('dname').addEventListener('change',function(){ score.name=this.value||'이름 없는 악보'; commit(); });
$('bOpen').onclick=function(){ $('fileIn').click(); };
$('fileIn').addEventListener('change',function(){ if(this.files[0]) openFile(this.files[0]); this.value=''; });
$('bSave').onclick=function(){
  var old=document.querySelector('.menu'); if(old){ old.remove(); return; }
  var m=document.createElement('div'); m.className='menu'; var r=this.getBoundingClientRect(); m.style.top=(r.bottom+4)+'px'; m.style.right='8px';
  m.innerHTML='<button data-x="midi">MIDI (.mid)</button><button data-x="xml">MusicXML (.musicxml)</button><button data-x="wav">소리 파일 (.wav)</button><button data-x="png">PNG 그림</button><button data-x="svg">SVG</button><button data-x="print">인쇄 / PDF로 저장</button><button data-x="json">프로젝트 파일 (.fscore)</button><button data-x="link">링크로 공유 (복사)</button>';
  m.onclick=function(ev){ var x=ev.target.dataset.x; if(!x) return; m.remove();
    if(x==='midi') download(fname('mid'),exportMidi()); else if(x==='link') shareLink(); else if(x==='xml') download(fname('musicxml'),exportXml()); else if(x==='wav') exportWav(); else if(x==='png') exportPng(2); else if(x==='svg') download(fname('svg'),new Blob([svgStr()],{type:'image/svg+xml'})); else if(x==='print') printScore(); else download(fname('fscore'),new Blob([snap()],{type:'application/json'})); };
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
  $('dname').value=score.name; hist=[snap()]; hi=0; renderTools(); draw(); panel(); if(window.innerWidth<=820) $('bZf').click();
  function loadExampleSilent(k){ var e=EX[k]; score={name:e.name,composer:e.composer||'',tempo:e.tempo,ts:e.ts,key:e.key,parts:e.parts.map(function(p){ return {name:p[0],clef:p[1],inst:p[2],vol:80,mute:false,ev:parseText(p[3],p[1])}; })}; score.mk=e.mk||{}; if(e.ly) lyr(score.parts[0],e.ly); }
  loadHash();
  window.FSCORE={link:makeLink,score:function(){ return score; },load:loadExample,parseText:parseText,layout:layout,midi:exportMidi,parseChord:parseChord,transChord:transChord,print:printScore,order:playOrder,xml:exportXml,readXml:readXml,readMidi:readMidi,svg:svgStr};
})();
})();
