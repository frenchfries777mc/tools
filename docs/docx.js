/* Fry Docs: .docx writer and reader without libraries.
   write(blocks) -> Uint8Array (a stored, uncompressed ZIP with the Word XML parts)
   read(bytes) -> Promise of blocks (unzips with DecompressionStream, keeps headings, lists, tables and bold/italic/underline/strike/colour)
   A block is {type:'p'|'h1'|'h2'|'h3'|'quote'|'li'|'oli'|'hr'|'table', align, runs:[{t, b, i, u, s, color, br, img:{bytes, ext, w, h}}], rows:[[runs]], list:n}
   Works in the browser (FFDocx) and in Node (module.exports) for the tests. */
(function(root){
'use strict';
var enc=typeof TextEncoder!=='undefined'?new TextEncoder():null;
function utf8(s){ return enc.encode(s); }
/* ---------- ZIP (stored) ---------- */
var CRC=(function(){ var t=new Uint32Array(256); for(var n=0;n<256;n++){ var c=n; for(var k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
function crc32(b){ var c=0xFFFFFFFF; for(var i=0;i<b.length;i++) c=CRC[(c^b[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function zip(files){ // files: [[name, Uint8Array]]
  var parts=[], cent=[], off=0;
  function u16(a,v){ a.push(v&255,(v>>>8)&255); } function u32(a,v){ a.push(v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255); }
  files.forEach(function(f){ var name=utf8(f[0]), data=f[1], crc=crc32(data), h=[];
    u32(h,0x04034b50); u16(h,20); u16(h,0x0800); u16(h,0); u16(h,0); u16(h,0x21); u32(h,crc); u32(h,data.length); u32(h,data.length); u16(h,name.length); u16(h,0);
    var hb=new Uint8Array(h); parts.push(hb,name,data);
    var c=[]; u32(c,0x02014b50); u16(c,20); u16(c,20); u16(c,0x0800); u16(c,0); u16(c,0); u16(c,0x21); u32(c,crc); u32(c,data.length); u32(c,data.length); u16(c,name.length); u16(c,0); u16(c,0); u16(c,0); u16(c,0); u32(c,0); u32(c,off);
    cent.push(new Uint8Array(c),name); off+=hb.length+name.length+data.length; });
  var csize=cent.reduce(function(s,p){ return s+p.length; },0), e=[];
  u32(e,0x06054b50); u16(e,0); u16(e,0); u16(e,files.length); u16(e,files.length); u32(e,csize); u32(e,off); u16(e,0);
  var all=parts.concat(cent,[new Uint8Array(e)]), n=all.reduce(function(s,p){ return s+p.length; },0), out=new Uint8Array(n), p=0;
  all.forEach(function(x){ out.set(x,p); p+=x.length; }); return out; }
/* ---------- Word XML ---------- */
function x(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,''); }
var W='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
var HEAD='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
var MAXW=576; // px that fit between the margins (6 inches)
function write(blocks){
  var imgs=[], body=[], nums=[], listN={};
  function run(r){
    if(r.br) return '<w:r><w:br/></w:r>';
    if(r.img){ var id=imgs.length+1, w=r.img.w||300, h=r.img.h||200; if(w>MAXW){ h=Math.round(h*MAXW/w); w=MAXW; }
      imgs.push({id:id, ext:r.img.ext==='png'?'png':'jpeg', bytes:r.img.bytes}); var cx=w*9525, cy=h*9525;
      return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+id+'" name="Picture '+id+'"/>'+
        '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="'+id+'" name="image'+id+'"/><pic:cNvPicPr/></pic:nvPicPr>'+
        '<pic:blipFill><a:blip r:embed="rIdImg'+id+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>'; }
    var p=''; if(r.b) p+='<w:b/>'; if(r.i) p+='<w:i/>'; if(r.u) p+='<w:u w:val="single"/>'; if(r.s) p+='<w:strike/>'; if(r.color&&/^[0-9A-Fa-f]{6}$/.test(r.color)) p+='<w:color w:val="'+r.color.toUpperCase()+'"/>';
    return String(r.t||'').split('\n').map(function(t,k){ return (k?'<w:r><w:br/></w:r>':'')+'<w:r>'+(p?'<w:rPr>'+p+'</w:rPr>':'')+'<w:t xml:space="preserve">'+x(t)+'</w:t></w:r>'; }).join(''); }
  function para(b,extra){ var pp=extra||'';
    var st={h1:'Heading1',h2:'Heading2',h3:'Heading3',quote:'Quote'}[b.type]; if(st) pp='<w:pStyle w:val="'+st+'"/>'+pp;
    if(b.align&&/^(center|right|both)$/.test(b.align)) pp+='<w:jc w:val="'+b.align+'"/>';
    return '<w:p>'+(pp?'<w:pPr>'+pp+'</w:pPr>':'')+(b.runs||[]).map(run).join('')+'</w:p>'; }
  blocks.forEach(function(b){
    if(b.type==='hr') body.push('<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="999999"/></w:pBdr></w:pPr></w:p>');
    else if(b.type==='li'||b.type==='oli'){ var key=b.type+':'+(b.list||0), num=listN[key];
      if(!num){ num=nums.length+3; nums.push({id:num, abs:b.type==='li'?0:1}); listN[key]=num; }
      body.push(para(b,'<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="'+num+'"/></w:numPr>')); }
    else if(b.type==='table'){ var rows=b.rows||[], n=rows.reduce(function(m,r){ return Math.max(m,r.length); },1), cw=Math.floor(9000/n), bd='';
      ['top','left','bottom','right','insideH','insideV'].forEach(function(s){ bd+='<w:'+s+' w:val="single" w:sz="4" w:space="0" w:color="999999"/>'; });
      var t='<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>'+bd+'</w:tblBorders></w:tblPr><w:tblGrid>';
      for(var i=0;i<n;i++) t+='<w:gridCol w:w="'+cw+'"/>'; t+='</w:tblGrid>';
      rows.forEach(function(r){ t+='<w:tr>'; for(var j=0;j<n;j++){ t+='<w:tc><w:tcPr><w:tcW w:w="'+cw+'" w:type="dxa"/></w:tcPr>'+para({type:'p',runs:r[j]||[]})+'</w:tc>'; } t+='</w:tr>'; });
      body.push(t+'</w:tbl>'); body.push('<w:p/>'); }
    else body.push(para(b)); });
  var doc=HEAD+'<w:document '+W+'><w:body>'+body.join('')+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
  var font='<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Malgun Gothic" w:cs="Calibri"/>';
  function hs(id,name,sz){ return '<w:style w:type="paragraph" w:styleId="'+id+'"><w:name w:val="'+name+'"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="'+(+id.slice(-1)-1)+'"/></w:pPr><w:rPr><w:b/><w:sz w:val="'+sz+'"/></w:rPr></w:style>'; }
  var styles=HEAD+'<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr>'+font+'<w:sz w:val="22"/><w:lang w:val="ko-KR" w:eastAsia="ko-KR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'+
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'+hs('Heading1','heading 1',36)+hs('Heading2','heading 2',30)+hs('Heading3','heading 3',26)+
    '<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="567"/><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="BBBBBB"/></w:pBdr></w:pPr><w:rPr><w:i/><w:color w:val="555555"/></w:rPr></w:style>'+
    '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="40"/></w:pPr></w:style></w:styles>';
  function absn(id,fmt,text){ return '<w:abstractNum w:abstractNumId="'+id+'"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="'+fmt+'"/><w:lvlText w:val="'+text+'"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>'; }
  var numbering=HEAD+'<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+absn(0,'bullet','•')+absn(1,'decimal','%1.')+
    nums.map(function(n){ return '<w:num w:numId="'+n.id+'"><w:abstractNumId w:val="'+n.abs+'"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>'; }).join('')+'</w:numbering>';
  var rels=HEAD+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>'+
    imgs.map(function(m){ return '<Relationship Id="rIdImg'+m.id+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image'+m.id+'.'+m.ext+'"/>'; }).join('')+'</Relationships>';
  var ct=HEAD+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>'+
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>';
  var top=HEAD+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  var files=[['[Content_Types].xml',utf8(ct)],['_rels/.rels',utf8(top)],['word/document.xml',utf8(doc)],['word/styles.xml',utf8(styles)],['word/numbering.xml',utf8(numbering)],['word/_rels/document.xml.rels',utf8(rels)]];
  imgs.forEach(function(m){ files.push(['word/media/image'+m.id+'.'+m.ext,m.bytes]); });
  return zip(files); }
/* ---------- reading ---------- */
function unzipEntry(bytes,want){ // returns Promise<Uint8Array|null>
  var dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength), e=-1;
  for(var i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){ if(dv.getUint32(i,true)===0x06054b50){ e=i; break; } }
  if(e<0) return Promise.reject(new Error('zip'));
  var n=dv.getUint16(e+10,true), p=dv.getUint32(e+16,true), dec=new TextDecoder();
  for(var k=0;k<n;k++){ var method=dv.getUint16(p+10,true), csz=dv.getUint32(p+20,true), nl=dv.getUint16(p+28,true), xl=dv.getUint16(p+30,true), cl=dv.getUint16(p+32,true), lo=dv.getUint32(p+42,true);
    var name=dec.decode(bytes.subarray(p+46,p+46+nl)); p+=46+nl+xl+cl;
    if(name!==want) continue;
    var start=lo+30+dv.getUint16(lo+26,true)+dv.getUint16(lo+28,true), data=bytes.subarray(start,start+csz);
    if(method===0) return Promise.resolve(data);
    if(typeof DecompressionStream==='undefined') return Promise.reject(new Error('inflate'));
    var ds=new DecompressionStream('deflate-raw'), s=new Blob([data]).stream().pipeThrough(ds);
    return new Response(s).arrayBuffer().then(function(b){ return new Uint8Array(b); }); }
  return Promise.resolve(null); }
function numFormats(xml,NS){ // numId -> 'bullet' | 'decimal' | ...
  var abs={}, out={};
  Array.prototype.forEach.call(xml.getElementsByTagNameNS(NS,'abstractNum'),function(a){ var l=a.getElementsByTagNameNS(NS,'lvl')[0], f=l&&l.getElementsByTagNameNS(NS,'numFmt')[0];
    abs[a.getAttributeNS(NS,'abstractNumId')||a.getAttribute('w:abstractNumId')]=f?(f.getAttributeNS(NS,'val')||f.getAttribute('w:val')):'bullet'; });
  Array.prototype.forEach.call(xml.getElementsByTagNameNS(NS,'num'),function(n){ var a=n.getElementsByTagNameNS(NS,'abstractNumId')[0];
    if(a) out[n.getAttributeNS(NS,'numId')||n.getAttribute('w:numId')]=abs[a.getAttributeNS(NS,'val')||a.getAttribute('w:val')]; });
  return out; }
function read(bytes){
  var fmts={}, NSW='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  return unzipEntry(bytes,'word/numbering.xml').then(function(nb){ if(nb) try{ fmts=numFormats(new DOMParser().parseFromString(new TextDecoder().decode(nb),'application/xml'),NSW); }catch(e){} },function(){})
  .then(function(){ return unzipEntry(bytes,'word/document.xml'); }).then(function(d){ if(!d) throw new Error('docx');
    var xml=new DOMParser().parseFromString(new TextDecoder().decode(d),'application/xml'), NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main', out=[], lid=0, lastList=null;
    function kids(el,name){ var a=[]; for(var c=el.firstChild;c;c=c.nextSibling) if(c.nodeType===1&&c.localName===name&&c.namespaceURI===NS) a.push(c); return a; }
    function one(el,name){ return kids(el,name)[0]||null; }
    function val(el){ return el?el.getAttributeNS(NS,'val')||el.getAttribute('w:val'):null; }
    function runs(p){ var rs=[]; (function walk(el){ for(var c=el.firstChild;c;c=c.nextSibling){ if(c.nodeType!==1) continue;
      if(c.localName==='r'){ var pr=one(c,'rPr'), st={}; if(pr){ var b=one(pr,'b'), i=one(pr,'i'), u=one(pr,'u'), s=one(pr,'strike'), col=one(pr,'color');
          st.b=!!b&&val(b)!=='0'&&val(b)!=='false'; st.i=!!i&&val(i)!=='0'&&val(i)!=='false'; st.u=!!u&&val(u)!=='none'; st.s=!!s&&val(s)!=='0'; if(col&&/^[0-9A-Fa-f]{6}$/.test(val(col)||'')&&val(col)!=='000000') st.color=val(col); }
        for(var t=c.firstChild;t;t=t.nextSibling){ if(t.nodeType!==1) continue; if(t.localName==='t'){ var o={t:t.textContent}; for(var k in st) if(st[k]) o[k]=st[k]; rs.push(o); } else if(t.localName==='br'||t.localName==='cr') rs.push({br:true}); else if(t.localName==='tab') rs.push({t:'\t'}); } }
      else if(c.localName==='hyperlink'||c.localName==='ins'||c.localName==='smartTag'||c.localName==='sdt'||c.localName==='sdtContent') walk(c); } })(p); return rs; }
    var body=xml.getElementsByTagNameNS(NS,'body')[0]; if(!body) return out;
    for(var c=body.firstChild;c;c=c.nextSibling){ if(c.nodeType!==1) continue;
      if(c.localName==='p'){ var pr=one(c,'pPr'), sty=pr?val(one(pr,'pStyle'))||'':'', jc=pr?val(one(pr,'jc')):null, num=pr?one(pr,'numPr'):null, b={runs:runs(c)};
        var m=/^(?:Heading|heading|제목)\s*([1-6])$/.exec(sty)||/^([1-6])$/.exec(sty); b.type=m?'h'+Math.min(3,+m[1]):/Title/i.test(sty)?'h1':/Quote/i.test(sty)?'quote':'p';
        if(num){ var nid=val(one(num,'numId'))||'0'; b.type=fmts[nid]&&fmts[nid]!=='bullet'&&fmts[nid]!=='none'?'oli':'li'; if(lastList!==nid){ lid++; lastList=nid; } b.list=lid; } else lastList=null;
        if(jc==='center'||jc==='right'||jc==='both') b.align=jc; out.push(b); }
      else if(c.localName==='tbl'){ lastList=null; var rows=kids(c,'tr').map(function(tr){ return kids(tr,'tc').map(function(tc){ var rs=[]; kids(tc,'p').forEach(function(p,k){ if(k) rs.push({br:true}); rs=rs.concat(runs(p)); }); return rs; }); }); out.push({type:'table',rows:rows}); } }
    return out; }); }
var api={write:write, read:read, zip:zip, crc32:crc32};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.FFDocx=api;
})(typeof window!=='undefined'?window:this);
