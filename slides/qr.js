/* Small QR code encoder for Fry Slides (no network, no library): byte mode, error correction level L, versions 1-40 (up to 2953 bytes).
   FFQR.make(text) -> {size, version, get(x, y)} or null when the text is too long; FFQR.draw(canvas, qr, scale) paints it with a 4-module quiet zone. */
(function(root){
'use strict';
/* per version 1..40, level L */
var ECC=[7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30];
var NBLK=[1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25];
var EXP=[], LOG=[]; (function(){ var x=1; for(var i=0;i<255;i++){ EXP[i]=x; LOG[x]=i; x<<=1; if(x&256) x^=0x11d; } })();
function gmul(a,b){ return a&&b?EXP[(LOG[a]+LOG[b])%255]:0; }
function rawModules(v){ var r=(16*v+128)*v+64; if(v>=2){ var n=Math.floor(v/7)+2; r-=(25*n-10)*n-55; if(v>=7) r-=36; } return r; }
function dataCodewords(v){ return Math.floor(rawModules(v)/8)-ECC[v-1]*NBLK[v-1]; }
function divisor(deg){ var r=[], i, j, root=1; for(i=0;i<deg-1;i++) r.push(0); r.push(1);
  for(i=0;i<deg;i++){ for(j=0;j<deg;j++){ r[j]=gmul(r[j],root); if(j+1<deg) r[j]^=r[j+1]; } root=gmul(root,2); } return r; }
function remainder(data,div){ var r=div.map(function(){ return 0; }); data.forEach(function(b){ var f=b^r.shift(); r.push(0); div.forEach(function(c,i){ r[i]^=gmul(c,f); }); }); return r; }
function utf8(s){ var o=[], i, c; s=unescape(encodeURIComponent(s)); for(i=0;i<s.length;i++){ c=s.charCodeAt(i); o.push(c); } return o; }
function make(text){
  var bytes=utf8(String(text)), ver=0, v;
  for(v=1;v<=40;v++){ var cc=v<10?8:16; if(4+cc+8*bytes.length<=dataCodewords(v)*8){ ver=v; break; } }
  if(!ver) return null;
  var bits=[], put=function(val,n){ for(var i=n-1;i>=0;i--) bits.push((val>>>i)&1); };
  put(4,4); put(bytes.length,ver<10?8:16); bytes.forEach(function(b){ put(b,8); });
  var cap=dataCodewords(ver)*8; put(0,Math.min(4,cap-bits.length)); while(bits.length%8) bits.push(0);
  for(var pad=0xEC;bits.length<cap;pad^=0xEC^0x11) put(pad,8);
  var data=[]; for(var i=0;i<bits.length;i+=8){ var b=0; for(var j=0;j<8;j++) b=(b<<1)|bits[i+j]; data.push(b); }
  /* split into blocks, add error correction, interleave */
  var nb=NBLK[ver-1], ec=ECC[ver-1], raw=Math.floor(rawModules(ver)/8), nShort=nb-raw%nb, shortLen=Math.floor(raw/nb), blocks=[], div=divisor(ec), k=0;
  for(i=0;i<nb;i++){ var len=shortLen-ec+(i<nShort?0:1), d=data.slice(k,k+len); k+=len; var e=remainder(d,div); if(i<nShort) d.push(0); blocks.push(d.concat(e)); }
  var all=[]; for(i=0;i<blocks[0].length;i++) blocks.forEach(function(bl,j){ if(i!==shortLen-ec||j>=nShort) all.push(bl[i]); });
  /* matrix */
  var size=ver*4+17, M=[], F=[]; for(i=0;i<size;i++){ M.push(new Array(size).fill(false)); F.push(new Array(size).fill(false)); }
  var setFn=function(x,y,dark){ M[y][x]=!!dark; F[y][x]=true; };
  for(i=0;i<size;i++){ setFn(6,i,i%2===0); setFn(i,6,i%2===0); }
  var finder=function(cx,cy){ for(var dy=-4;dy<=4;dy++) for(var dx=-4;dx<=4;dx++){ var dist=Math.max(Math.abs(dx),Math.abs(dy)), x=cx+dx, y=cy+dy; if(x>=0&&x<size&&y>=0&&y<size) setFn(x,y,dist!==2&&dist!==4); } };
  finder(3,3); finder(size-4,3); finder(3,size-4);
  var pos=[]; if(ver>1){ var na=Math.floor(ver/7)+2, step=ver===32?26:Math.ceil((ver*4+4)/(na*2-2))*2; pos=[6]; for(var p=size-7;pos.length<na;p-=step) pos.splice(1,0,p); }
  pos.forEach(function(cx,a){ pos.forEach(function(cy,b){ if((a===0&&b===0)||(a===0&&b===pos.length-1)||(a===pos.length-1&&b===0)) return;
    for(var dy=-2;dy<=2;dy++) for(var dx=-2;dx<=2;dx++) setFn(cx+dx,cy+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1); }); });
  var bit=function(x,n){ return ((x>>>n)&1)!==0; };
  var formatBits=function(mask){ var d=(1<<3)|mask, r=d, q; for(q=0;q<10;q++) r=(r<<1)^((r>>>9)*0x537); var f=((d<<10)|r)^0x5412, n;
    for(n=0;n<=5;n++) setFn(8,n,bit(f,n)); setFn(8,7,bit(f,6)); setFn(8,8,bit(f,7)); setFn(7,8,bit(f,8)); for(n=9;n<15;n++) setFn(14-n,8,bit(f,n));
    for(n=0;n<8;n++) setFn(size-1-n,8,bit(f,n)); for(n=8;n<15;n++) setFn(8,size-15+n,bit(f,n)); setFn(8,size-8,true); };
  formatBits(0);
  if(ver>=7){ var r=ver, q; for(q=0;q<12;q++) r=(r<<1)^((r>>>11)*0x1F25); var vb=(ver<<12)|r; for(q=0;q<18;q++){ var bt=bit(vb,q), a=size-11+q%3, b2=Math.floor(q/3); setFn(a,b2,bt); setFn(b2,a,bt); } }
  /* data bits in the zigzag order */
  var bi=0, total=all.length*8;
  for(var right=size-1;right>=1;right-=2){ if(right===6) right=5;
    for(var vert=0;vert<size;vert++) for(var j2=0;j2<2;j2++){ var x=right-j2, up=((right+1)&2)===0, y=up?size-1-vert:vert;
      if(!F[y][x]&&bi<total){ M[y][x]=bit(all[bi>>>3],7-(bi&7)); bi++; } } }
  var MASK=[function(x,y){ return (x+y)%2===0; },function(x,y){ return y%2===0; },function(x,y){ return x%3===0; },function(x,y){ return (x+y)%3===0; },
    function(x,y){ return (Math.floor(x/3)+Math.floor(y/2))%2===0; },function(x,y){ return x*y%2+x*y%3===0; },function(x,y){ return (x*y%2+x*y%3)%2===0; },function(x,y){ return ((x+y)%2+x*y%3)%2===0; }];
  var apply=function(m){ for(var y=0;y<size;y++) for(var x=0;x<size;x++) if(!F[y][x]&&MASK[m](x,y)) M[y][x]=!M[y][x]; };
  var penalty=function(){ var s=0, x, y, run, c, dark=0;
    var line=function(get){ var r=1, sc=0, i2; for(i2=1;i2<size;i2++){ if(get(i2)===get(i2-1)) r++; else { if(r>=5) sc+=3+r-5; r=1; } } if(r>=5) sc+=3+r-5;
      var st=''; for(i2=0;i2<size;i2++) st+=get(i2)?'1':'0'; for(i2=0;i2+11<=size;i2++){ var w=st.substr(i2,11); if(w==='00001011101'||w==='10111010000') sc+=40; } return sc; };
    for(y=0;y<size;y++) s+=line(function(i2){ return M[y][i2]; });
    for(x=0;x<size;x++) s+=line(function(i2){ return M[i2][x]; });
    for(y=0;y<size-1;y++) for(x=0;x<size-1;x++){ c=M[y][x]; if(c===M[y][x+1]&&c===M[y+1][x]&&c===M[y+1][x+1]) s+=3; }
    for(y=0;y<size;y++) for(x=0;x<size;x++) if(M[y][x]) dark++;
    s+=(Math.ceil(Math.abs(dark*20-size*size*10)/(size*size))-1)*10; return s; };
  var best=0, bestP=Infinity; for(var m=0;m<8;m++){ apply(m); formatBits(m); var pn=penalty(); if(pn<bestP){ bestP=pn; best=m; } apply(m); }
  apply(best); formatBits(best);
  return {size:size, version:ver, get:function(x,y){ return !!(M[y]&&M[y][x]); }};
}
function draw(canvas,qr,scale){ var n=qr.size+8; scale=Math.max(1,scale|0); canvas.width=canvas.height=n*scale; var x=canvas.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,canvas.width,canvas.height); x.fillStyle='#000';
  for(var j=0;j<qr.size;j++) for(var i=0;i<qr.size;i++) if(qr.get(i,j)) x.fillRect((i+4)*scale,(j+4)*scale,scale,scale); }
root.FFQR={make:make, draw:draw, capacity:function(){ return dataCodewords(40)-3; }};
if(typeof module!=='undefined') module.exports=root.FFQR;
})(typeof window!=='undefined'?window:globalThis);
