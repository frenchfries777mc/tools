/* Fry Sheet .xlsx writer and style reader (FSX). Written by hand because SheetJS community edition cannot write styles at all.
   Export: FSX.write(doc, ctx) -> Promise<Uint8Array>.  Import extras: FSX.read(bytes) -> Promise<[per-sheet extras]> (values come from SheetJS).
   Needs DOMParser (import only), CompressionStream/DecompressionStream (optional: without them the zip is stored, and import extras are skipped). */
(function(root){
'use strict';
var NS_MAIN='http://schemas.openxmlformats.org/spreadsheetml/2006/main', NS_R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
var PAL=['#ffc93c','#ff8a3d','#4fd0ff','#ff5d8f','#3fe08f','#a78bfa','#5b8cff','#f0f3f8'];
var CFCOL=['rgba(255,93,93,.45)','rgba(255,201,60,.5)','rgba(63,224,143,.42)','rgba(79,160,255,.45)','rgba(167,139,250,.5)'];
var SCALE_COLS=['EB5757','FFC93C','3FC878'], BAR_COL='FFAA3C';

/* ---------- small helpers ---------- */
function esc(s){ return String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function colL(c){ var s=''; c++; while(c>0){ var m=(c-1)%26; s=String.fromCharCode(65+m)+s; c=Math.floor((c-1)/26); } return s; }
function colN(s){ var n=0; for(var i=0;i<s.length;i++) n=n*26+(s.charCodeAt(i)-64); return n-1; }
function a1(r,c){ return colL(c)+(r+1); }
function rng(g){ return a1(g.r1,g.c1)+(g.r1===g.r2&&g.c1===g.c2?'':':'+a1(g.r2,g.c2)); }
function absRef(sheet,g){ return "'"+String(sheet).replace(/'/g,"''")+"'!$"+colL(g.c1)+'$'+(g.r1+1)+(g.r1===g.r2&&g.c1===g.c2?'':':$'+colL(g.c2)+'$'+(g.r2+1)); }
function parseA1(s){ var m=/^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(s); return m?{r:+m[2]-1,c:colN(m[1].toUpperCase())}:null; }
function parseRange(s){ var p=String(s).replace(/^.*!/,'').split(':'), a=parseA1(p[0]), b=p[1]?parseA1(p[1]):a; if(!a||!b) return null; return {r1:Math.min(a.r,b.r),c1:Math.min(a.c,b.c),r2:Math.max(a.r,b.r),c2:Math.max(a.c,b.c)}; }
function hex2(n){ n=Math.max(0,Math.min(255,Math.round(n))); return (n<16?'0':'')+n.toString(16); }
/* css color -> 'RRGGBB' (translucent colors are blended over white, as Excel has no alpha) */
function toRGB(css){
  css=String(css||'').trim(); var m;
  if((m=/^#([0-9a-f]{6})$/i.exec(css))) return m[1].toUpperCase();
  if((m=/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(css))) return (m[1]+m[1]+m[2]+m[2]+m[3]+m[3]).toUpperCase();
  if((m=/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(css))){ var a=m[4]==null?1:+m[4], f=function(v){ return 255+(+v-255)*a; }; return (hex2(f(m[1]))+hex2(f(m[2]))+hex2(f(m[3]))).toUpperCase(); }
  return null;
}
function lum(h){ var r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16); return (0.299*r+0.587*g+0.114*b)/255; }

/* ---------- zip ---------- */
var CRC=null;
function crc32(u8){ if(!CRC){ CRC=new Uint32Array(256); for(var n=0;n<256;n++){ var c=n; for(var k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; CRC[n]=c>>>0; } }
  var c2=0xFFFFFFFF; for(var i=0;i<u8.length;i++) c2=CRC[(c2^u8[i])&255]^(c2>>>8); return (c2^0xFFFFFFFF)>>>0; }
function streamBytes(u8,Ctor,fmt){ return new Response(new Blob([u8]).stream().pipeThrough(new Ctor(fmt))).arrayBuffer().then(function(b){ return new Uint8Array(b); }); }
function deflateRaw(u8){ if(typeof CompressionStream==='undefined') return Promise.resolve(null); return streamBytes(u8,CompressionStream,'deflate-raw').catch(function(){ return null; }); }
function inflateRaw(u8){ return streamBytes(u8,DecompressionStream,'deflate-raw'); }
var ENC=new TextEncoder(), DEC=new TextDecoder('utf-8');
function zipWrite(files){ // files: [{name, data:Uint8Array}] -> Promise<Uint8Array>
  return Promise.all(files.map(function(f){ return deflateRaw(f.data).then(function(d){ return {name:f.name,raw:f.data,comp:d&&d.length<f.data.length?d:null}; }); })).then(function(list){
    var parts=[], cd=[], off=0, dt=((2026-1980)<<9)|(10<<5)|17;
    list.forEach(function(f){
      var nm=ENC.encode(f.name), data=f.comp||f.raw, method=f.comp?8:0, crc=crc32(f.raw);
      var h=new DataView(new ArrayBuffer(30)); h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x0800,true); h.setUint16(8,method,true); h.setUint16(10,0,true); h.setUint16(12,dt,true);
      h.setUint32(14,crc,true); h.setUint32(18,data.length,true); h.setUint32(22,f.raw.length,true); h.setUint16(26,nm.length,true); h.setUint16(28,0,true);
      var c=new DataView(new ArrayBuffer(46)); c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x0800,true); c.setUint16(10,method,true); c.setUint16(12,0,true); c.setUint16(14,dt,true);
      c.setUint32(16,crc,true); c.setUint32(20,data.length,true); c.setUint32(24,f.raw.length,true); c.setUint16(28,nm.length,true); c.setUint32(42,off,true);
      parts.push(new Uint8Array(h.buffer),nm,data); cd.push(new Uint8Array(c.buffer),nm); off+=30+nm.length+data.length; });
    var cdLen=0; cd.forEach(function(p){ cdLen+=p.length; });
    var e=new DataView(new ArrayBuffer(22)); e.setUint32(0,0x06054b50,true); e.setUint16(8,list.length,true); e.setUint16(10,list.length,true); e.setUint32(12,cdLen,true); e.setUint32(16,off,true);
    var all=parts.concat(cd,[new Uint8Array(e.buffer)]), tot=0; all.forEach(function(p){ tot+=p.length; });
    var out=new Uint8Array(tot), pos=0; all.forEach(function(p){ out.set(p,pos); pos+=p.length; }); return out; });
}
function zipRead(u8){ // -> {names:[], text(name):Promise<string|null>}
  var dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength), i=u8.length-22;
  while(i>=0&&dv.getUint32(i,true)!==0x06054b50) i--;
  if(i<0) throw new Error('not a zip');
  var n=dv.getUint16(i+10,true), p=dv.getUint32(i+16,true), ents={};
  for(var k=0;k<n;k++){
    if(dv.getUint32(p,true)!==0x02014b50) break;
    var method=dv.getUint16(p+10,true), csz=dv.getUint32(p+20,true), nl=dv.getUint16(p+28,true), el=dv.getUint16(p+30,true), cl=dv.getUint16(p+32,true), lho=dv.getUint32(p+42,true);
    var name=DEC.decode(u8.subarray(p+46,p+46+nl)); ents[name]={method:method,csz:csz,lho:lho}; p+=46+nl+el+cl; }
  return {names:Object.keys(ents), text:function(name){ var e=ents[name]; if(!e) return Promise.resolve(null);
    var nl2=dv.getUint16(e.lho+26,true), el2=dv.getUint16(e.lho+28,true), s=e.lho+30+nl2+el2, d=u8.subarray(s,s+e.csz);
    return (e.method===8?inflateRaw(d):Promise.resolve(d)).then(function(b){ return DEC.decode(b); }); }};
}

/* ================= EXPORT ================= */
var BSTYLE={1:'thin',2:'medium',3:'thick'};
var CF_OP={gt:'greaterThan',ge:'greaterThanOrEqual',lt:'lessThan',le:'lessThanOrEqual',eq:'equal',ne:'notEqual',bt:'between'};

function Styles(){
  this.fonts=['<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>']; this.fills=['<fill><patternFill patternType="none"/></fill>','<fill><patternFill patternType="gray125"/></fill>'];
  this.borders=['<border><left/><right/><top/><bottom/><diagonal/></border>']; this.nfs=[]; this.xfs=['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>']; this.dxfs=[]; this.map={};
}
Styles.prototype.idx=function(list,xml){ var i=list.indexOf(xml); if(i<0){ list.push(xml); i=list.length-1; } return i; };
Styles.prototype.nfId=function(code){ if(code==null) return 0; if(code==='@') return 49; var i=this.nfs.indexOf(code); if(i<0){ this.nfs.push(code); i=this.nfs.length-1; } return 164+i; };
/* sp: {b,i,fc(css),bg(css),al,nf(app code),bx:{t,r,b,l:{c,w}}} */
Styles.prototype.xf=function(sp){
  var key=JSON.stringify([sp.b?1:0,sp.i?1:0,sp.fc||'',sp.bg||'',sp.al||'',sp.nf||'',sp.bx||'']); if(key in this.map) return this.map[key];
  var fontId=0, fillId=0, borderId=0, fc=sp.fc&&toRGB(sp.fc), bg=sp.bg&&toRGB(sp.bg);
  if(sp.b||sp.i||fc) fontId=this.idx(this.fonts,'<font>'+(sp.b?'<b/>':'')+(sp.i?'<i/>':'')+'<sz val="11"/>'+(fc?'<color rgb="FF'+fc+'"/>':'')+'<name val="Calibri"/><family val="2"/></font>');
  if(bg) fillId=this.idx(this.fills,'<fill><patternFill patternType="solid"><fgColor rgb="FF'+bg+'"/><bgColor indexed="64"/></patternFill></fill>');
  if(sp.bx){ var bs=''; [['l','left'],['r','right'],['t','top'],['b','bottom']].forEach(function(p){ var o=sp.bx[p[0]], col=o&&toRGB(o.c);
      bs+=o?'<'+p[1]+' style="'+(BSTYLE[o.w>=3?3:o.w>=2?2:1])+'"><color rgb="FF'+(col||'000000')+'"/></'+p[1]+'>':'<'+p[1]+'/>'; });
    borderId=this.idx(this.borders,'<border>'+bs+'<diagonal/></border>'); }
  var nfCode=zCode(sp.nf), nid=this.nfId(nfCode);
  var al=sp.al==='l'?'left':sp.al==='c'?'center':sp.al==='r'?'right':'';
  var x='<xf numFmtId="'+nid+'" fontId="'+fontId+'" fillId="'+fillId+'" borderId="'+borderId+'" xfId="0"'+(nid?' applyNumberFormat="1"':'')+(fontId?' applyFont="1"':'')+(fillId?' applyFill="1"':'')+(borderId?' applyBorder="1"':'')+(al?' applyAlignment="1"><alignment horizontal="'+al+'"/></xf>':'/>');
  this.xfs.push(x); return (this.map[key]=this.xfs.length-1);
};
Styles.prototype.dxf=function(css){ var h=toRGB(css)||'FFFF00'; return this.idx(this.dxfs,'<dxf><fill><patternFill patternType="solid"><fgColor rgb="FF'+h+'"/><bgColor rgb="FF'+h+'"/></patternFill></fill></dxf>'); };
Styles.prototype.xml=function(){
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="'+NS_MAIN+'">'+
    (this.nfs.length?'<numFmts count="'+this.nfs.length+'">'+this.nfs.map(function(c,i){ return '<numFmt numFmtId="'+(164+i)+'" formatCode="'+esc(c)+'"/>'; }).join('')+'</numFmts>':'')+
    '<fonts count="'+this.fonts.length+'">'+this.fonts.join('')+'</fonts><fills count="'+this.fills.length+'">'+this.fills.join('')+'</fills><borders count="'+this.borders.length+'">'+this.borders.join('')+'</borders>'+
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="'+this.xfs.length+'">'+this.xfs.join('')+'</cellXfs>'+
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'+
    '<dxfs count="'+this.dxfs.length+'">'+this.dxfs.join('')+'</dxfs></styleSheet>';
};
/* app number-format code -> Excel format code */
function zCode(nf){
  if(!nf) return null; if(nf==='t') return '@';
  var m=/^([npd])(\d)$/.exec(nf); if(m){ var z=+m[2]>0?'.'+new Array(+m[2]+1).join('0'):''; return m[1]==='n'?'#,##0'+z:m[1]==='p'?'0'+z+'%':'0'+z; }
  return {w0:'"₩"#,##0',u2:'"$"#,##0.00'}[nf]||null;
}

function cellFmt(x){ return x&&(x.b||x.i||x.fc||x.bg||x.al||x.nf||x.bd||x.bx); }
function sidesOf(x){ var bx={}, any=false; if(x){ if(x.bd){ ['t','r','b','l'].forEach(function(s){ bx[s]={c:'#8b94a8',w:1}; any=true; }); } if(x.bx) for(var s in x.bx){ if(x.bx[s]){ bx[s]=x.bx[s]; any=true; } } } return any?bx:null; }

/* ctx: {E, val(si,r,c), text(si,r,c) (shown text), spills(si)->[{r1,c1,r2,c2,rows}], sheetName(si), names:[{name,ref}], charts(si)->[resolved]} */
function write(doc, ctx){
  var E=ctx.E, st=new Styles(), sst=[], sstMap={}, files=[], ctypes=[], sheetRels=[];
  function S(str){ var i=sstMap[str]; if(i==null){ i=sst.length; sst.push(str); sstMap[str]=i; } return i; }
  var wbSheets='', wbRels='', chartNo=0, drawNo=0, cmtNo=0, skipped={}, dynArr=false, fdb=[];
  doc.sheets.forEach(function(s,si){
    var nm=ctx.sheetName(si), mergeAt=function(r,c){ for(var i=0;i<s.merges.length;i++){ var g=s.merges[i]; if(r>=g.r1&&r<=g.r2&&c>=g.c1&&c<=g.c2) return g; } return null; };
    var rows={}, mr=0, mc=0, rels=[], tail='', notes=[], sps=ctx.spills?ctx.spills(si):[], spAt={};
    sps.forEach(function(g){ spAt[g.r1+','+g.c1]=g; });
    function put(r,c,o){ (rows[r]||(rows[r]={}))[c]=o; if(r>mr) mr=r; if(c>mc) mc=c; }
    for(var k in s.cells){ var rc=E.RC(k), r=rc[0], c=rc[1], x=s.cells[k], mg=s.merges.length?mergeAt(r,c):null;
      if(mg&&(mg.r1!==r||mg.c1!==c)) continue;
      var has=x.v!=null&&x.v!=='', o={x:x};
      if(has){ var raw=String(x.v);
        if(raw[0]==='='&&x.nf!=='t'){ var v=ctx.val(si,r,c); o.f=E.toXl?E.toXl(raw.slice(1)):raw.slice(1); if(spAt[r+','+c]){ o.arr=rng(spAt[r+','+c]); dynArr=true; }
          if(E.isErr(v)){ o.t='e'; o.v=v.e; } else if(typeof v==='number'){ o.t='n'; o.v=isFinite(v)?String(v):'0'; } else if(typeof v==='boolean'){ o.t='b'; o.v=v?'1':'0'; } else { o.t='str'; o.v=v==null?'':String(v); } }
        else { var l=x.nf==='t'?raw:E.literal(raw); if(typeof l==='number'&&isFinite(l)){ o.t='n'; o.v=String(l); } else if(typeof l==='boolean'){ o.t='b'; o.v=l?'1':'0'; } else { o.t='s'; o.v=S(String(l==null?'':l)); } } }
      else if(!cellFmt(x)&&!x.nt) continue;
      put(r,c,o); if(x.nt) notes.push({r:r,c:c,t:x.nt}); }
    // spilled cells of dynamic arrays are stored as plain values (Excel does the same; the anchor's formula fills them again)
    sps.forEach(function(g){ for(var r=g.r1;r<=Math.min(g.r2,g.r1+20000);r++) for(var c=g.c1;c<=Math.min(g.c2,g.c1+500);c++){ if(r===g.r1&&c===g.c1) continue; var v=g.rows[r-g.r1][c-g.c1]; if(v==null) continue;
      var o=rows[r]&&rows[r][c]; if(o&&o.t!=null) continue; if(!o){ o={x:{}}; put(r,c,o); }
      if(E.isErr(v)){ o.t='e'; o.v=v.e; } else if(typeof v==='number'){ o.t='n'; o.v=isFinite(v)?String(v):'0'; } else if(typeof v==='boolean'){ o.t='b'; o.v=v?'1':'0'; } else { o.t='s'; o.v=S(String(v)); } } });
    // filter: Excel lists the values to show; rows the filter hides are written hidden
    var af='', hid={};
    if(s.flt&&s.flt.r2>s.flt.r1){ var ft=s.flt, fcols='';
      Object.keys(ft.h||{}).map(Number).sort(function(a,b){ return a-b; }).forEach(function(c){ var hide=ft.h[c]; if(!hide||!hide.length||c<ft.c1||c>ft.c2||!ctx.text) return; var hs={}, show={}, list=[], blank=false; hide.forEach(function(t){ hs[t]=1; });
        for(var r=ft.r1+1;r<=ft.r2;r++){ var t=ctx.text(si,r,c); if(hs[t]) hid[r]=1; else if(t==='') blank=true; else if(!show[t]){ show[t]=1; list.push(t); } }
        fcols+='<filterColumn colId="'+(c-ft.c1)+'"><filters'+(blank?' blank="1"':'')+'>'+list.map(function(t){ return '<filter val="'+esc(t)+'"/>'; }).join('')+'</filters></filterColumn>'; });
      af='<autoFilter ref="'+rng(ft)+'">'+fcols+'</autoFilter>'; fdb.push('<definedName name="_xlnm._FilterDatabase" localSheetId="'+si+'" hidden="1">'+esc(absRef(nm,ft))+'</definedName>'); }
    // merged blocks: every covered cell carries the block's fill and its outer edges (Excel draws borders per cell)
    s.merges.forEach(function(g){ var tl=s.cells[E.K(g.r1,g.c1)]||{}, own=sidesOf(tl);
      for(var r=g.r1;r<=Math.min(g.r2,g.r1+2000);r++) for(var c=g.c1;c<=Math.min(g.c2,g.c1+200);c++){
        var bx={}; if(own){ if(r===g.r1&&own.t) bx.t=own.t; if(r===g.r2&&own.b) bx.b=own.b; if(c===g.c1&&own.l) bx.l=own.l; if(c===g.c2&&own.r) bx.r=own.r; }
        var o=rows[r]&&rows[r][c]; if(!o){ o={x:{}}; put(r,c,o); }
        o.mx={bx:Object.keys(bx).length?bx:null}; if(r>mr) mr=r; if(c>mc) mc=c; } });
    var sd='';
    var rks=Object.keys(rows); Object.keys(hid).forEach(function(r){ if(!rows[r]) rks.push(r); });
    rks.map(Number).sort(function(a,b){ return a-b; }).forEach(function(r){
      var cs=rows[r]||{}, cells=Object.keys(cs).map(Number).sort(function(a,b){ return a-b; }).map(function(c){
        var o=cs[c], x=o.x, sp={b:x.b,i:x.i,fc:x.fc,bg:x.bg,al:x.al,nf:x.nf,bx:o.mx?o.mx.bx:sidesOf(x)};
        if(o.mx&&!sp.bg){ var g=mergeAt(r,c), tl=g&&s.cells[E.K(g.r1,g.c1)]; if(tl&&tl.bg) sp.bg=tl.bg; }
        var sid=st.xf(sp), at=' r="'+a1(r,c)+'"'+(sid?' s="'+sid+'"':'')+(o.arr?' cm="1"':'');
        if(o.t==null) return '<c'+at+'/>';
        if(o.t==='s') return '<c'+at+' t="s"><v>'+o.v+'</v></c>';
        var f=o.f!=null?(o.arr?'<f t="array" ref="'+o.arr+'">':'<f>')+esc(o.f)+'</f>':'';
        if(o.t==='n') return '<c'+at+'>'+f+'<v>'+o.v+'</v></c>';
        return '<c'+at+' t="'+o.t+'">'+f+'<v>'+esc(o.v)+'</v></c>'; });
      sd+='<row r="'+(r+1)+'"'+(hid[r]?' hidden="1"':'')+'>'+cells.join('')+'</row>'; });
    // cols
    var cw='', cwk=Object.keys(s.cw||{}).map(Number).filter(function(c){ return s.cw[c]>0; }).sort(function(a,b){ return a-b; });
    cwk.forEach(function(c){ cw+='<col min="'+(c+1)+'" max="'+(c+1)+'" width="'+(Math.max(0,Math.round((s.cw[c]-5)/7*256)/256))+'" customWidth="1"/>'; });
    // views
    var fr=s.fr|0, fc=s.fc|0, view='<sheetViews><sheetView workbookViewId="0"'+(si===doc.active?' tabSelected="1"':'')+'>';
    if(fr||fc){ var tlc=a1(fr,fc), pane=fr&&fc?'bottomRight':fr?'bottomLeft':'topRight';
      view+='<pane'+(fc?' xSplit="'+fc+'"':'')+(fr?' ySplit="'+fr+'"':'')+' topLeftCell="'+tlc+'" activePane="'+pane+'" state="frozen"/><selection pane="'+pane+'"/>'; }
    view+='</sheetView></sheetViews>';
    // merges
    var mxml=s.merges.length?'<mergeCells count="'+s.merges.length+'">'+s.merges.map(function(g){ return '<mergeCell ref="'+rng(g)+'"/>'; }).join('')+'</mergeCells>':'';
    // conditional formats
    var cf='', nCf=s.cfs.length;
    s.cfs.forEach(function(f,i){
      var pr=nCf-i, sq=rng(f), tlc=a1(f.r1,f.c1), body=null;
      if(f.t==='rule'){ var dx=st.dxf(f.col);
        if(CF_OP[f.op]){ if(f.a==null||f.a==='') return; var fa=cfLit(E,f.a), fb=f.op==='bt'?cfLit(E,f.b):null; if(f.op==='bt'&&fb==null) return;
          body='<cfRule type="cellIs" dxfId="'+dx+'" priority="'+pr+'" operator="'+CF_OP[f.op]+'"><formula>'+esc(fa)+'</formula>'+(fb!=null?'<formula>'+esc(fb)+'</formula>':'')+'</cfRule>'; }
        else if(f.op==='tx'){ if(f.a==null||f.a==='') return; var q=String(f.a).replace(/"/g,'""');
          body='<cfRule type="containsText" dxfId="'+dx+'" priority="'+pr+'" operator="containsText" text="'+esc(f.a)+'"><formula>NOT(ISERROR(SEARCH("'+esc(q)+'",'+tlc+')))</formula></cfRule>'; }
        else if(f.op==='dup') body='<cfRule type="duplicateValues" dxfId="'+dx+'" priority="'+pr+'"/>';
        else if(f.op==='bl') body='<cfRule type="containsBlanks" dxfId="'+dx+'" priority="'+pr+'"><formula>LEN(TRIM('+tlc+'))=0</formula></cfRule>'; }
      else if(f.t==='scale') body='<cfRule type="colorScale" priority="'+pr+'"><colorScale><cfvo type="min"/><cfvo type="percent" val="50"/><cfvo type="max"/>'+SCALE_COLS.map(function(c){ return '<color rgb="FF'+c+'"/>'; }).join('')+'</colorScale></cfRule>';
      else if(f.t==='bar'||f.t==='mbar'){ var lo=0; for(var r=f.r1;r<=f.r2;r++) for(var c=f.c1;c<=f.c2;c++){ var v=ctx.val(si,r,c); if(typeof v==='number'&&v<lo) lo=v; }
        body='<cfRule type="dataBar" priority="'+pr+'"><dataBar><cfvo type="num" val="'+lo+'"/><cfvo type="max"/><color rgb="FF'+(f.t==='bar'?BAR_COL:(toRGB(f.col)||BAR_COL))+'"/></dataBar></cfRule>'; }
      else if(f.t==='icons'&&!f.rev) body='<cfRule type="iconSet" priority="'+pr+'"><iconSet iconSet="'+(f.set==='lights'?'3TrafficLights1':'3Arrows')+'"><cfvo type="percent" val="0"/><cfvo type="percent" val="'+(f.p1==null?33:+f.p1)+'"/><cfvo type="percent" val="'+(f.p2==null?67:+f.p2)+'"/></iconSet></cfRule>';
      if(body==null){ skipped[f.t==='icons'&&f.rev?'iconsRev':f.t]=(skipped[f.t==='icons'&&f.rev?'iconsRev':f.t]||0)+1; return; }
      cf+='<conditionalFormatting sqref="'+sq+'">'+body+'</conditionalFormatting>'; });
    // data validation
    var dvs='', ndv=0;
    s.dv.forEach(function(d){ var items=d.list.map(String), joined=items.join(',');
      if(items.some(function(t){ return t.indexOf(',')>=0||t.indexOf('"')>=0; })||joined.length>255||!items.length){ skipped.dv=(skipped.dv||0)+1; return; }
      ndv++; dvs+='<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="'+rng(d)+'"><formula1>"'+esc(joined)+'"</formula1></dataValidation>'; });
    if(ndv) dvs='<dataValidations count="'+ndv+'">'+dvs+'</dataValidations>';
    // charts
    var chs=(ctx.charts&&ctx.charts(si))||[], drawing='', drawRels='';
    if(chs.length){ drawNo++; var dn=drawNo;
      chs.forEach(function(ch,ci){ chartNo++; var cn=chartNo;
        files.push({name:'xl/charts/chart'+cn+'.xml',data:ENC.encode(chartXml(ch))}); ctypes.push(['/xl/charts/chart'+cn+'.xml','application/vnd.openxmlformats-officedocument.drawingml.chart+xml']);
        drawRels+='<Relationship Id="rId'+(ci+1)+'" Type="'+NS_R+'/chart" Target="../charts/chart'+cn+'.xml"/>';
        var c0=Math.min(mc+2,250), rr=ci*17;
        drawing+='<xdr:twoCellAnchor><xdr:from><xdr:col>'+c0+'</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>'+rr+'</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>'+(c0+8)+'</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>'+(rr+16)+'</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>'+
          '<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="'+(ci+2)+'" name="Chart '+(ci+1)+'"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId'+(ci+1)+'"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>'; });
      files.push({name:'xl/drawings/drawing'+dn+'.xml',data:ENC.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="'+NS_R+'">'+drawing+'</xdr:wsDr>')});
      files.push({name:'xl/drawings/_rels/drawing'+dn+'.xml.rels',data:ENC.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+drawRels+'</Relationships>')});
      ctypes.push(['/xl/drawings/drawing'+dn+'.xml','application/vnd.openxmlformats-officedocument.drawing+xml']);
      rels.push('<Relationship Id="rId1" Type="'+NS_R+'/drawing" Target="../drawings/drawing'+dn+'.xml"/>'); tail+='<drawing r:id="rId1"/>'; }
    // notes (legacy comments + VML)
    if(notes.length){ cmtNo++; var cn2=cmtNo, vml='';
      notes.forEach(function(n,ni){ vml+='<v:shape id="_x0000_s'+(1024*(si+1)+ni+1)+'" type="#_x0000_t202" style="position:absolute;margin-left:80pt;margin-top:'+(10+n.r*15)+'pt;width:140pt;height:70pt;z-index:'+(ni+1)+';visibility:hidden" fillcolor="#ffffe1" o:insetmode="auto"><v:fill color2="#ffffe1"/><v:shadow on="t" color="black" obscured="t"/><v:path o:connecttype="none"/><v:textbox style="mso-direction-alt:auto"><div style="text-align:left"></div></v:textbox><x:ClientData ObjectType="Note"><x:MoveWithCells/><x:SizeWithCells/><x:Anchor>'+(n.c+1)+', 15, '+n.r+', 2, '+(n.c+4)+', 15, '+(n.r+4)+', 16</x:Anchor><x:AutoFill>False</x:AutoFill><x:Row>'+n.r+'</x:Row><x:Column>'+n.c+'</x:Column></x:ClientData></v:shape>'; });
      files.push({name:'xl/drawings/vmlDrawing'+cn2+'.vml',data:ENC.encode('<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><o:shapelayout v:ext="edit"><o:idmap v:ext="edit" data="'+(si+1)+'"/></o:shapelayout><v:shapetype id="_x0000_t202" coordsize="21600,21600" o:spt="202" path="m,l,21600r21600,l21600,xe"><v:stroke joinstyle="miter"/><v:path gradientshapeok="t" o:connecttype="rect"/></v:shapetype>'+vml+'</xml>')});
      files.push({name:'xl/comments'+cn2+'.xml',data:ENC.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><comments xmlns="'+NS_MAIN+'"><authors><author>Fry Sheet</author></authors><commentList>'+notes.map(function(n){ return '<comment ref="'+a1(n.r,n.c)+'" authorId="0"><text><r><t xml:space="preserve">'+esc(n.t)+'</t></r></text></comment>'; }).join('')+'</commentList></comments>')});
      ctypes.push(['/xl/comments'+cn2+'.xml','application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml']);
      rels.push('<Relationship Id="rId2" Type="'+NS_R+'/comments" Target="../comments'+cn2+'.xml"/>','<Relationship Id="rId3" Type="'+NS_R+'/vmlDrawing" Target="../drawings/vmlDrawing'+cn2+'.vml"/>'); tail+='<legacyDrawing r:id="rId3"/>'; }
    var xml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="'+NS_MAIN+'" xmlns:r="'+NS_R+'"><dimension ref="A1:'+a1(mr,mc)+'"/>'+view+'<sheetFormatPr defaultColWidth="13" defaultRowHeight="15"/>'+(cw?'<cols>'+cw+'</cols>':'')+'<sheetData>'+sd+'</sheetData>'+af+mxml+cf+dvs+'<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>'+tail+'</worksheet>';
    files.push({name:'xl/worksheets/sheet'+(si+1)+'.xml',data:ENC.encode(xml)});
    ctypes.push(['/xl/worksheets/sheet'+(si+1)+'.xml','application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml']);
    if(rels.length) files.push({name:'xl/worksheets/_rels/sheet'+(si+1)+'.xml.rels',data:ENC.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+rels.join('')+'</Relationships>')});
    wbSheets+='<sheet name="'+esc(nm)+'" sheetId="'+(si+1)+'" r:id="rId'+(si+1)+'"/>'; wbRels+='<Relationship Id="rId'+(si+1)+'" Type="'+NS_R+'/worksheet" Target="worksheets/sheet'+(si+1)+'.xml"/>';
  });
  var n=doc.sheets.length;
  wbRels+='<Relationship Id="rId'+(n+1)+'" Type="'+NS_R+'/styles" Target="styles.xml"/><Relationship Id="rId'+(n+2)+'" Type="'+NS_R+'/sharedStrings" Target="sharedStrings.xml"/>';
  if(dynArr){ // cells marked cm="1" are dynamic (spilling) arrays, not old Ctrl+Shift+Enter ones
    wbRels+='<Relationship Id="rId'+(n+3)+'" Type="'+NS_R+'/sheetMetadata" Target="metadata.xml"/>'; ctypes.push(['/xl/metadata.xml','application/vnd.openxmlformats-officedocument.spreadsheetml.sheetMetadata+xml']);
    files.push({name:'xl/metadata.xml',data:ENC.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><metadata xmlns="'+NS_MAIN+'" xmlns:xda="http://schemas.microsoft.com/office/spreadsheetml/2017/dynamicarray"><metadataTypes count="1"><metadataType name="XLDAPR" minSupportedVersion="120000" copy="1" pasteAll="1" pasteValues="1" merge="1" splitFirst="1" rowColShift="1" clearFormats="1" clearComments="1" assign="1" coerce="1" cellMeta="1"/></metadataTypes><futureMetadata name="XLDAPR" count="1"><bk><extLst><ext uri="{bdbb8cdc-fa1e-496e-a857-3c3f30c029c3}"><xda:dynamicArrayProperties fDynamic="1" fCollapsed="0"/></ext></extLst></bk></futureMetadata><cellMetadata count="1"><bk><rc t="1" v="0"/></bk></cellMetadata></metadata>')}); }
  var dn2=fdb.join('')+(ctx.names||[]).map(function(x){ return '<definedName name="'+esc(x.name)+'">'+esc(x.ref)+'</definedName>'; }).join('');
  files.unshift({name:'xl/workbook.xml',data:ENC.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="'+NS_MAIN+'" xmlns:r="'+NS_R+'"><bookViews><workbookView activeTab="'+(doc.active|0)+'"/></bookViews><sheets>'+wbSheets+'</sheets>'+(dn2?'<definedNames>'+dn2+'</definedNames>':'')+'</workbook>')});
  files.push({name:'xl/_rels/workbook.xml.rels',data:ENC.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+wbRels+'</Relationships>')});
  files.push({name:'xl/styles.xml',data:ENC.encode(st.xml())});
  files.push({name:'xl/sharedStrings.xml',data:ENC.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="'+NS_MAIN+'" count="'+sst.length+'" uniqueCount="'+sst.length+'">'+sst.map(function(t){ return '<si><t xml:space="preserve">'+esc(t)+'</t></si>'; }).join('')+'</sst>')});
  files.unshift({name:'_rels/.rels',data:ENC.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="'+NS_R+'/officeDocument" Target="xl/workbook.xml"/></Relationships>')});
  var ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing"/>'+
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'+
    ctypes.map(function(p){ return '<Override PartName="'+p[0]+'" ContentType="'+p[1]+'"/>'; }).join('')+'</Types>';
  files.unshift({name:'[Content_Types].xml',data:ENC.encode(ct)});
  return zipWrite(files).then(function(bytes){ return {bytes:bytes,skipped:skipped}; });
}
function cfLit(E,a){ var l=E.literal(a); if(typeof l==='number') return String(l); if(typeof l==='boolean') return l?'TRUE':'FALSE'; if(l==null) return null; return '"'+String(l).replace(/"/g,'""')+'"'; }

/* chart: {type,title,c1..r2 (data box, for placing),cat:{ref,vals}|null, ser:[{nameRef,name,ref,vals}], xy:{ref,vals}|null} */
function chartXml(ch){
  function strCache(vals){ return '<c:strCache><c:ptCount val="'+vals.length+'"/>'+vals.map(function(v,i){ return '<c:pt idx="'+i+'"><c:v>'+esc(v)+'</c:v></c:pt>'; }).join('')+'</c:strCache>'; }
  function numCache(vals){ return '<c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="'+vals.length+'"/>'+vals.map(function(v,i){ return v==null?'':'<c:pt idx="'+i+'"><c:v>'+v+'</c:v></c:pt>'; }).join('')+'</c:numCache>'; }
  function col(i){ return PAL[i%PAL.length].slice(1).toUpperCase(); }
  var sers=ch.ser.map(function(s,i){
    var tx=s.nameRef?'<c:tx><c:strRef><c:f>'+esc(s.nameRef)+'</c:f>'+strCache([s.name])+'</c:strRef></c:tx>':'<c:tx><c:v>'+esc(s.name)+'</c:v></c:tx>';
    var sp=ch.type==='line'||ch.type==='scatter'?'<c:spPr><a:ln w="28575"><a:solidFill><a:srgbClr val="'+col(i)+'"/></a:solidFill></a:ln></c:spPr>':'<c:spPr><a:solidFill><a:srgbClr val="'+col(i)+'"/></a:solidFill></c:spPr>';
    var dpt=''; if(ch.type==='pie') dpt=s.vals.map(function(_,j){ return '<c:dPt><c:idx val="'+j+'"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="'+col(j)+'"/></a:solidFill></c:spPr></c:dPt>'; }).join('');
    var mk=ch.type==='line'?'<c:marker><c:symbol val="circle"/><c:size val="5"/></c:marker>':ch.type==='scatter'?'<c:marker><c:symbol val="circle"/><c:size val="7"/></c:marker>':'';
    var vref='<c:f>'+esc(s.ref)+'</c:f>'+numCache(s.vals);
    if(ch.type==='scatter') return '<c:ser><c:idx val="'+i+'"/><c:order val="'+i+'"/>'+tx+'<c:spPr><a:ln w="19050"><a:noFill/></a:ln></c:spPr>'+mk+'<c:xVal>'+(ch.xy.ref?'<c:numRef><c:f>'+esc(ch.xy.ref)+'</c:f>'+numCache(ch.xy.vals)+'</c:numRef>':'<c:numLit>'+numCache(ch.xy.vals).replace(/^<c:numCache>/,'').replace(/<\/c:numCache>$/,'')+'</c:numLit>')+'</c:xVal><c:yVal><c:numRef>'+vref+'</c:numRef></c:yVal><c:smooth val="0"/></c:ser>';
    var cat=ch.cat?'<c:cat><c:strRef><c:f>'+esc(ch.cat.ref)+'</c:f>'+strCache(ch.cat.vals)+'</c:strRef></c:cat>':'';
    return '<c:ser><c:idx val="'+i+'"/><c:order val="'+i+'"/>'+tx+sp+(ch.type==='bar'||ch.type==='hbar'?'<c:invertIfNegative val="0"/>':'')+mk+dpt+cat+'<c:val><c:numRef>'+vref+'</c:numRef></c:val>'+(ch.type==='line'?'<c:smooth val="0"/>':'')+'</c:ser>'; }).join('');
  var plot, axes='';
  var catAx='<c:catAx><c:axId val="111"/><c:scaling><c:orientation val="'+(ch.type==='hbar'?'maxMin':'minMax')+'"/></c:scaling><c:delete val="0"/><c:axPos val="'+(ch.type==='hbar'?'l':'b')+'"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="222"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>';
  var valAx=function(id,cross,pos){ return '<c:valAx><c:axId val="'+id+'"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="'+pos+'"/><c:majorGridlines/><c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="'+cross+'"/><c:crosses val="autoZero"/><c:crossBetween val="'+(ch.type==='scatter'?'midCat':'between')+'"/></c:valAx>'; };
  if(ch.type==='pie') plot='<c:pieChart><c:varyColors val="1"/>'+sers+'<c:firstSliceAng val="0"/></c:pieChart>';
  else if(ch.type==='line') { plot='<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>'+sers+'<c:marker val="1"/><c:axId val="111"/><c:axId val="222"/></c:lineChart>'; axes=catAx+valAx(222,111,'l'); }
  else if(ch.type==='scatter') { plot='<c:scatterChart><c:scatterStyle val="lineMarker"/><c:varyColors val="0"/>'+sers+'<c:axId val="111"/><c:axId val="222"/></c:scatterChart>'; axes=valAx(111,222,'b')+valAx(222,111,'l'); }
  else { plot='<c:barChart><c:barDir val="'+(ch.type==='hbar'?'bar':'col')+'"/><c:grouping val="clustered"/><c:varyColors val="0"/>'+sers+'<c:gapWidth val="150"/><c:axId val="111"/><c:axId val="222"/></c:barChart>'; axes=catAx+valAx(222,111,ch.type==='hbar'?'b':'l'); }
  var title=ch.title?'<c:title><c:tx><c:rich><a:bodyPr/><a:p><a:r><a:rPr lang="ko-KR" sz="1400" b="1"/><a:t>'+esc(ch.title)+'</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>':'<c:autoTitleDeleted val="1"/>';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="'+NS_R+'"><c:roundedCorners val="0"/><c:chart>'+title+'<c:plotArea><c:layout/>'+plot+axes+'</c:plotArea>'+(ch.ser.length>1||ch.type==='pie'?'<c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>':'')+'<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>';
}

/* ================= IMPORT (styles, merges, views, CF, DV, notes, charts) ================= */
var DEFTHEME=['FFFFFF','000000','E7E6E6','44546A','4472C4','ED7D31','A5A5A5','FFC000','5B9BD5','70AD47'];
var INDEXED={8:'000000',9:'FFFFFF',10:'FF0000',11:'00FF00',12:'0000FF',13:'FFFF00',14:'FF00FF',15:'00FFFF'};
function q(el,name){ return el?el.getElementsByTagNameNS('*',name):[]; }
function q1(el,name){ var l=q(el,name); return l.length?l[0]:null; }
function kids(el,name){ var o=[]; if(!el) return o; for(var n=el.firstElementChild;n;n=n.nextElementSibling) if(n.localName===name) o.push(n); return o; }
function parseXml(t){ if(t==null) return null; var d=new DOMParser().parseFromString(t,'application/xml'); return d.getElementsByTagName('parsererror').length?null:d; }
function tintHex(h,t){ var r=parseInt(h.slice(0,2),16)/255, g=parseInt(h.slice(2,4),16)/255, b=parseInt(h.slice(4,6),16)/255, mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2, s=0, hh=0, d=mx-mn;
  if(d){ s=l>.5?d/(2-mx-mn):d/(mx+mn); hh=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4; hh/=6; }
  l=t<0?l*(1+t):l*(1-t)+t; function f(p,q2,x){ if(x<0) x+=1; if(x>1) x-=1; return x<1/6?p+(q2-p)*6*x:x<1/2?q2:x<2/3?p+(q2-p)*(2/3-x)*6:p; }
  var q2=l<.5?l*(1+s):l+s-l*s, p=2*l-q2; if(!s) return hex2(l*255)+hex2(l*255)+hex2(l*255); return (hex2(f(p,q2,hh+1/3)*255)+hex2(f(p,q2,hh)*255)+hex2(f(p,q2,hh-1/3)*255)).toUpperCase(); }
function colorOf(el,theme){ if(!el) return null; var h=null;
  if(el.getAttribute('rgb')) h=el.getAttribute('rgb').slice(-6);
  else if(el.getAttribute('theme')!=null){ var ti=+el.getAttribute('theme'); h=(theme||DEFTHEME)[ti]||null; }
  else if(el.getAttribute('indexed')!=null) h=INDEXED[+el.getAttribute('indexed')]||null;
  if(!h||!/^[0-9a-f]{6}$/i.test(h)) return null; h=h.toUpperCase();
  var t=parseFloat(el.getAttribute('tint')); if(t) h=tintHex(h,t); return '#'+h.toLowerCase(); }
function themeColors(txt){ var d=parseXml(txt); if(!d) return null; var cs=q1(d,'clrScheme'); if(!cs) return null; var o=[]; var order=['lt1','dk1','lt2','dk2','accent1','accent2','accent3','accent4','accent5','accent6'];
  order.forEach(function(n){ var e=q1(cs,n), c=e&&e.firstElementChild; o.push(c?(c.getAttribute('val')==null?c.getAttribute('lastClr'):c.getAttribute('val')):null); });
  return o.every(function(x){ return x&&/^[0-9a-f]{6}$/i.test(x); })?o:null; }
function nfFromCode(code){
  if(code==null||/^general$/i.test(code)||code==='@') return null;
  var c=code.split(';')[0].replace(/"[^"]*"/g,'').replace(/\[[^\]]*\]/g,'').replace(/\\./g,'');
  var orig=code.split(';')[0];
  if(/[ymdhs]/i.test(c)&&!/[0#]/.test(c)) return 'date';
  var m=/\.([0#]+)/.exec(c), dec=m?Math.min(9,m[1].length):0;
  if(/%/.test(c)) return 'p'+dec;
  if(/[₩￦]|\[\$₩|-412\]/.test(orig)) return 'w0';
  if(/\$/.test(orig)&&/0/.test(c)) return 'u2';
  if(/#,##0|#,###/.test(c)) return 'n'+dec;
  if(/^\s*0/.test(c)||/^#?0/.test(c)) return 'd'+dec;
  return null; }
var BUILTIN_NF={1:'0',2:'0.00',3:'#,##0',4:'#,##0.00',9:'0%',10:'0.00%',37:'#,##0',38:'#,##0',39:'#,##0.00',40:'#,##0.00'};
function parseStyles(txt,theme){
  var d=parseXml(txt); if(!d) return null;
  var fmts={}; kids(q1(d,'numFmts'),'numFmt').forEach(function(e){ fmts[e.getAttribute('numFmtId')]=e.getAttribute('formatCode'); });
  var fonts=kids(q1(d,'fonts'),'font').map(function(f){ var b=q1(f,'b'), i=q1(f,'i'); return {b:!!b&&!/^(0|false)$/.test(b.getAttribute('val')||''),i:!!i&&!/^(0|false)$/.test(i.getAttribute('val')||''),fc:colorOf(q1(f,'color'),theme)}; });
  var fills=kids(q1(d,'fills'),'fill').map(function(f){ var p=q1(f,'patternFill'); if(!p||p.getAttribute('patternType')!=='solid') return null; var fg=q1(p,'fgColor'); return colorOf(fg,theme); });
  var BST={thin:1,hair:1,dotted:1,dashed:1,dashDot:1,dashDotDot:1,mediumDashed:2,mediumDashDot:2,mediumDashDotDot:2,slantDashDot:2,medium:2,thick:3,double:3};
  var borders=kids(q1(d,'borders'),'border').map(function(b){ var o={}, any=false; [['left','l'],['right','r'],['top','t'],['bottom','b']].forEach(function(p){ var e=q1(b,p[0]); if(!e) return; var s=e.getAttribute('style'); if(!s||!BST[s]) return; o[p[1]]={c:colorOf(q1(e,'color'),theme)||'#000000',w:BST[s]}; any=true; }); return any?o:null; });
  var xfs=kids(q1(d,'cellXfs'),'xf').map(function(x){
    var nid=x.getAttribute('numFmtId'), code=fmts[nid]!=null?fmts[nid]:BUILTIN_NF[nid]||(+nid>=14&&+nid<=22||+nid>=45&&+nid<=47?'yyyy-mm-dd':null);
    var f=fonts[+x.getAttribute('fontId')||0]||{}, al=q1(x,'alignment'), h=al&&al.getAttribute('horizontal');
    return {nf:nfFromCode(code),b:f.b,i:f.i,fc:f.fc,bg:fills[+x.getAttribute('fillId')||0]||null,bx:borders[+x.getAttribute('borderId')||0]||null,al:h==='left'?'l':h==='center'?'c':h==='right'?'r':null}; });
  var dxfs=kids(q1(d,'dxfs'),'dxf').map(function(x){ var p=q1(q1(x,'fill'),'patternFill'); if(!p) return null; var bg=q1(p,'bgColor'), fg=q1(p,'fgColor'); return colorOf(bg,theme)||colorOf(fg,theme); });
  return {xfs:xfs,dxfs:dxfs};
}
var CFHEX=CFCOL.map(function(c){ return '#'+toRGB(c).toLowerCase(); });
function dxfCss(h){ if(!h) return null; var i=CFHEX.indexOf(h); if(i>=0) return CFCOL[i]; var n=parseInt(h.slice(1),16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+',.5)'; }
var REV_OP={greaterThan:'gt',greaterThanOrEqual:'ge',lessThan:'lt',lessThanOrEqual:'le',equal:'eq',notEqual:'ne',between:'bt'};
function cfVal(t){ t=(t||'').trim(); if(/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(t)) return t; var m=/^"((?:[^"]|"")*)"$/.exec(t); return m?m[1].replace(/""/g,'"'):null; }
function relsOf(txt,base){ var o={}, d=parseXml(txt); if(d) Array.prototype.forEach.call(q(d,'Relationship'),function(e){ var t=e.getAttribute('Target'); if(t[0]==='/') t=t.slice(1); else { var parts=(base+t).split('/'), out=[]; parts.forEach(function(p){ if(p==='..') out.pop(); else if(p!=='.') out.push(p); }); t=out.join('/'); } o[e.getAttribute('Id')]={type:e.getAttribute('Type').replace(/^.*\//,''),target:t}; }); return o; }

function read(bytes){
  var z=zipRead(bytes), T=function(n){ return z.text(n); };
  return Promise.all([T('xl/workbook.xml'),T('xl/_rels/workbook.xml.rels'),T('xl/styles.xml')]).then(function(a){
    var wb=parseXml(a[0]), wr=relsOf(a[1],'xl/'); if(!wb) throw new Error('no workbook');
    var themeP=Object.keys(wr).map(function(k){ return wr[k]; }).filter(function(r){ return r.type==='theme'; })[0];
    return (themeP?T(themeP.target):Promise.resolve(null)).then(function(tt){
      var theme=tt?themeColors(tt):null, styles=parseStyles(a[2],theme)||{xfs:[],dxfs:[]};
      var sheetEls=Array.prototype.slice.call(q(wb,'sheet')), names=sheetEls.map(function(e){ return e.getAttribute('name'); });
      return sheetEls.reduce(function(p,e,si){ return p.then(function(out){
        var rid=e.getAttributeNS(NS_R,'id')||e.getAttribute('r:id'), tg=wr[rid]&&wr[rid].target;
        if(!tg){ out.push({}); return out; }
        var rp=tg.replace(/[^/]*$/,'_rels/')+tg.replace(/^.*\//,'')+'.rels';
        return Promise.all([T(tg),T(rp)]).then(function(b){ return readSheet(b[0],relsOf(b[1],tg.replace(/[^/]*$/,'')),styles,T,names,si).then(function(r){ out.push(r); return out; }); }); }); },Promise.resolve([])).then(function(sheets){ return {sheets:sheets,names:names}; });
    }); });
}
function readSheet(txt,rels,styles,T,names,si){
  var ex={cells:{},merges:[],cw:{},fr:0,fc:0,cfs:[],dv:[],notes:{},charts:[]};
  if(!txt) return Promise.resolve(ex);
  var sdM=/<sheetData[\s\S]*<\/sheetData>/.exec(txt), rest=sdM?txt.replace(sdM[0],'<sheetData/>'):txt, d=parseXml(rest);
  // cell styles
  if(sdM){ var re=/<c\s([^>]*?)\/?>/g, m, sre=/(?:^|\s)s="(\d+)"/, rre=/(?:^|\s)r="([A-Z]+)(\d+)"/;
    while((m=re.exec(sdM[0]))){ var sm=sre.exec(m[1]); if(!sm||sm[1]==='0') continue; var rm=rre.exec(m[1]); if(!rm) continue; var xf=styles.xfs[+sm[1]]; if(xf) ex.cells[(+rm[2]-1)+','+colN(rm[1])]=xf; } }
  if(!d) return Promise.resolve(ex);
  Array.prototype.forEach.call(q(d,'mergeCell'),function(e){ var g=parseRange(e.getAttribute('ref')); if(g&&(g.r2>g.r1||g.c2>g.c1)) ex.merges.push(g); });
  var pane=q1(d,'pane'); if(pane&&/frozen/.test(pane.getAttribute('state')||'')){ ex.fc=+pane.getAttribute('xSplit')||0; ex.fr=+pane.getAttribute('ySplit')||0; }
  // filter: value lists only (custom conditions and colour filters are left out)
  var afe=kids(d.documentElement,'autoFilter')[0], ag=afe&&parseRange(afe.getAttribute('ref')||'');
  if(ag&&ag.r2>ag.r1){ ex.flt={g:ag,cols:[]}; kids(afe,'filterColumn').forEach(function(fc){ var fl=kids(fc,'filters')[0]; if(!fl) return;
    ex.flt.cols.push({c:ag.c1+(+fc.getAttribute('colId')||0),show:kids(fl,'filter').map(function(e){ return e.getAttribute('val')||''; }),blank:/^(1|true)$/.test(fl.getAttribute('blank')||'')}); }); }
  Array.prototype.forEach.call(q(d,'col'),function(e){ var w=parseFloat(e.getAttribute('width')); if(!(w>0)||e.getAttribute('hidden')==='1'||e.getAttribute('hidden')==='true') return; var lo=+e.getAttribute('min')-1, hi=Math.min(+e.getAttribute('max')-1,lo+300); for(var c=lo;c<=hi;c++) ex.cw[c]=Math.round(w*7+5); });
  // conditional formats (the later a rule's priority number, the weaker it is; the app lets the last rule win)
  var rules=[];
  Array.prototype.forEach.call(q(d,'conditionalFormatting'),function(cfEl){ var sq=(cfEl.getAttribute('sqref')||'').split(/\s+/).filter(Boolean);
    kids(cfEl,'cfRule').forEach(function(r){ sq.forEach(function(s){ var g=parseRange(s); if(!g) return; var o=convertRule(r,g,styles); if(o) rules.push({o:o,p:+r.getAttribute('priority')||1e6}); }); }); });
  rules.sort(function(a,b){ return b.p-a.p; }); ex.cfs=rules.map(function(r){ return r.o; });
  // data validation lists
  Array.prototype.forEach.call(q(d,'dataValidation'),function(e){ if(e.getAttribute('type')!=='list') return; var f=q1(e,'formula1'); if(!f) return; var t=f.textContent.trim();
    var items=null, mm=/^"(.*)"$/.exec(t); if(mm) items=mm[1].replace(/""/g,'"').split(',').map(function(x){ return x.trim(); }).filter(Boolean); else items={ref:t.replace(/^=/,'')};
    (e.getAttribute('sqref')||'').split(/\s+/).filter(Boolean).forEach(function(s){ var g=parseRange(s); if(g) ex.dv.push({g:g,items:items}); }); });
  // related parts: comments, drawings (charts)
  var jobs=[];
  Object.keys(rels).forEach(function(k){ var r=rels[k];
    if(r.type==='comments') jobs.push(T(r.target).then(function(t){ var cd=parseXml(t); if(!cd) return; Array.prototype.forEach.call(q(cd,'comment'),function(c){ var p=parseA1(c.getAttribute('ref')); if(!p) return;
        var txt=Array.prototype.map.call(q(c,'t'),function(x){ return x.textContent; }).join(''); if(txt) ex.notes[p.r+','+p.c]=txt; }); }));
    if(r.type==='drawing') jobs.push(T(r.target).then(function(t){ var dd=parseXml(t); if(!dd) return; var base=r.target.replace(/[^/]*$/,''), rp=base+'_rels/'+r.target.replace(/^.*\//,'')+'.rels';
        return T(rp).then(function(rt){ var dr=relsOf(rt,base); return Promise.all(Array.prototype.map.call(q(dd,'chart'),function(ce){ var id=ce.getAttributeNS(NS_R,'id')||ce.getAttribute('r:id'); var tgt=dr[id]; return tgt?T(tgt.target).then(function(ct){ var c=readChart(ct); if(c) ex.charts.push(c); }):null; })); }); })); });
  return Promise.all(jobs).then(function(){ return ex; });
}
function convertRule(r,g,styles){
  var t=r.getAttribute('type'), o={r1:g.r1,c1:g.c1,r2:g.r2,c2:g.c2}, dx=r.getAttribute('dxfId')!=null?styles.dxfs[+r.getAttribute('dxfId')]:null, fs=kids(r,'formula').map(function(f){ return f.textContent; });
  if(t==='cellIs'){ var op=REV_OP[r.getAttribute('operator')], col=dxfCss(dx); if(!op||!col) return null; var a=cfVal(fs[0]), b=op==='bt'?cfVal(fs[1]):'';
    if(a==null||b==null) return null; o.t='rule'; o.op=op; o.a=a; o.b=b; o.col=col; return o; }
  if(t==='containsText'){ var col2=dxfCss(dx), tx=r.getAttribute('text'); if(!col2||!tx) return null; o.t='rule'; o.op='tx'; o.a=tx; o.b=''; o.col=col2; return o; }
  if(t==='duplicateValues'){ var c3=dxfCss(dx); if(!c3) return null; o.t='rule'; o.op='dup'; o.a=''; o.b=''; o.col=c3; return o; }
  if(t==='containsBlanks'){ var c4=dxfCss(dx); if(!c4) return null; o.t='rule'; o.op='bl'; o.a=''; o.b=''; o.col=c4; return o; }
  if(t==='dataBar'){ var cl=colorOf(q1(r,'color'),null)||'#ffaa3c'; if(cl.toLowerCase()==='#ffaa3c'){ o.t='bar'; } else { o.t='mbar'; o.col=cl; } return o; }
  if(t==='colorScale'){ if(q(r,'cfvo').length!==3) return null; o.t='scale'; return o; }
  if(t==='iconSet'){ var set=(q1(r,'iconSet')||r).getAttribute('iconSet')||'3TrafficLights1'; if(set!=='3Arrows'&&set!=='3TrafficLights1'&&set!=='3TrafficLights2') return null; if((q1(r,'iconSet')||r).getAttribute('reverse')==='1') return null;
    var vo=q(r,'cfvo'); var p1=33, p2=67; if(vo.length===3&&vo[1].getAttribute('type')==='percent'&&vo[2].getAttribute('type')==='percent'){ p1=+vo[1].getAttribute('val'); p2=+vo[2].getAttribute('val'); }
    o.t='icons'; o.set=set==='3Arrows'?'arrows':'lights'; o.p1=p1; o.p2=p2; o.rev=false; return o; }
  return null;
}
function readChart(txt){
  var d=parseXml(txt); if(!d) return null; var pa=q1(d,'plotArea'); if(!pa) return null;
  var type=null; ['barChart','lineChart','pieChart','scatterChart'].forEach(function(n){ var e=q1(pa,n); if(e&&!type){ type=n==='barChart'?((q1(e,'barDir')||{getAttribute:function(){ return 'col'; }}).getAttribute('val')==='bar'?'hbar':'bar'):n==='lineChart'?'line':n==='pieChart'?'pie':'scatter'; } });
  if(!type) return null;
  var title=''; var ti=kids(q1(d,'chart'),'title')[0]; if(ti) title=Array.prototype.map.call(q(ti,'t'),function(x){ return x.textContent; }).join('');
  var sheet=null, box=null;
  Array.prototype.forEach.call(q(pa,'f'),function(f){ var m=/^(?:'((?:[^']|'')+)'|([^!']+))!(.+)$/.exec(f.textContent.trim()); if(!m) return; var sn=(m[1]!=null?m[1].replace(/''/g,"'"):m[2]), g=parseRange(m[3]); if(!g) return;
    if(sheet==null) sheet=sn; if(sn!==sheet) return; box=box?{r1:Math.min(box.r1,g.r1),c1:Math.min(box.c1,g.c1),r2:Math.max(box.r2,g.r2),c2:Math.max(box.c2,g.c2)}:g; });
  if(!box||sheet==null) return null; return {sheet:sheet,type:type,title:title,box:box};
}

root.FSX={write:write,read:read,zipRead:zipRead,zipWrite:zipWrite,toRGB:toRGB,lum:lum};
})(typeof window!=='undefined'?window:globalThis);
