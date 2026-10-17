/* Fry Sheet formula engine: cell addresses, formula tokenizer/parser/evaluator, reference shifting.
   Cells live in sheet.cells keyed by r*16384+c (0-based). A cell's raw input is cell.v (string). */
(function(root){
'use strict';
var KC=16384;
function K(r,c){ return r*KC+c; }
function RC(k){ k=+k; return [Math.floor(k/KC), k%KC]; }
function colName(c){ var s=''; c++; while(c>0){ var m=(c-1)%26; s=String.fromCharCode(65+m)+s; c=Math.floor((c-1)/26); } return s; }
function colIdx(s){ var n=0; s=s.toUpperCase(); for(var i=0;i<s.length;i++) n=n*26+(s.charCodeAt(i)-64); return n-1; }
function addr(r,c){ return colName(c)+(r+1); }
function parseAddr(s){ var m=/^\s*\$?([A-Za-z]{1,3})\$?(\d+)\s*$/.exec(s||''); if(!m) return null; var r=+m[2]-1; if(r<0) return null; return {r:r,c:colIdx(m[1])}; }
function parseRange(s){ var p=String(s||'').split(':'); var a=parseAddr(p[0]); if(!a) return null; var b=p[1]?parseAddr(p[1]):a; if(!b) return null;
  return {r1:Math.min(a.r,b.r),c1:Math.min(a.c,b.c),r2:Math.max(a.r,b.r),c2:Math.max(a.c,b.c)}; }
function rangeStr(g){ return g.r1===g.r2&&g.c1===g.c2?addr(g.r1,g.c1):addr(g.r1,g.c1)+':'+addr(g.r2,g.c2); }

function Err(e){ this.e=e; }
Err.prototype.toString=function(){ return this.e; };
function isErr(v){ return v instanceof Err; }
function fail(e){ throw new Err(e); }
function Rng(si,r1,c1,r2,c2){ this.si=si; this.r1=r1; this.c1=c1; this.r2=r2; this.c2=c2; }
/* v19: a 2-D block of values (rows of cells), made by FILTER, SORT, UNIQUE, SEQUENCE, SORTBY, array literals and
   element-wise operators on ranges (=A2:A9*2). A formula whose result is an Arr spills into the cells right and below. */
function Arr(rows){ this.rows=rows; }
function isMulti(x){ return x instanceof Arr||(x instanceof Rng&&!(x.r1===x.r2&&x.c1===x.c2)); }

/* ---------- tokenizer ---------- */
var SHEETCH=/[A-Za-z0-9_.가-힣ㄱ-ㅎㅏ-ㅣ]/;
function quoteSheet(n){ return /^[A-Za-z_가-힣][A-Za-z0-9_가-힣]*$/.test(n)&&!/^[A-Za-z]{1,3}\d+$/.test(n)?n:"'"+n.replace(/'/g,"''")+"'"; }
function readRef(s,i){
  var m=/^(\$?)([A-Za-z]{1,3})(\$?)(\d+)/.exec(s.slice(i));
  if(!m) return null; var nx=s[i+m[0].length]||'';
  if(/[A-Za-z0-9_(]/.test(nx)) return null;
  if(+m[4]<1) return null;
  return {len:m[0].length, ac:!!m[1], c:colIdx(m[2]), ar:!!m[3], r:+m[4]-1};
}
function readCol(s,i){
  var m=/^(\$?)([A-Za-z]{1,3})/.exec(s.slice(i)); if(!m) return null;
  return {len:m[0].length, ac:!!m[1], c:colIdx(m[2]), ar:false, r:null};
}
function tokenize(src){
  var out=[], i=0, n=src.length, m;
  while(i<n){
    var ch=src[i];
    if(/\s/.test(ch)){ var j=i; while(j<n&&/\s/.test(src[j])) j++; out.push({t:'ws',s:src.slice(i,j)}); i=j; continue; }
    if(ch==='"'){ var j2=i+1, v=''; while(j2<n){ if(src[j2]==='"'){ if(src[j2+1]==='"'){ v+='"'; j2+=2; continue; } break; } v+=src[j2++]; }
      out.push({t:'str',v:v,s:src.slice(i,j2+1)}); i=j2+1; continue; }
    m=/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));
    if(m){ out.push({t:'num',v:parseFloat(m[0]),s:m[0]}); i+=m[0].length; continue; }
    // sheet prefix
    var sh=null, k=i;
    if(ch==="'"){ var j3=i+1, nm=''; while(j3<n){ if(src[j3]==="'"){ if(src[j3+1]==="'"){ nm+="'"; j3+=2; continue; } break; } nm+=src[j3++]; }
      if(src[j3+1]==='!'){ sh=nm; k=j3+2; } }
    else if(SHEETCH.test(ch)){ var j4=i; while(j4<n&&SHEETCH.test(src[j4])) j4++; if(src[j4]==='!'){ sh=src.slice(i,j4); k=j4+1; } }
    // range or ref
    var a=readRef(src,k);
    if(a&&src[k+a.len]===':'){ var b=readRef(src,k+a.len+1); if(b){ out.push({t:'rng',sh:sh,a:a,b:b}); i=k+a.len+1+b.len; continue; } }
    if(!a){ var ca=readCol(src,k); if(ca&&src[k+ca.len]===':'){ var cb=readCol(src,k+ca.len+1); if(cb&&!/[A-Za-z0-9_(]/.test(src[k+ca.len+1+cb.len]||'')){ out.push({t:'rng',sh:sh,a:ca,b:cb,col:true}); i=k+ca.len+1+cb.len; continue; } } }
    if(a){ out.push({t:'ref',sh:sh,a:a}); i=k+a.len; continue; }
    if(sh!==null){ out.push({t:'bad',s:src.slice(i,k)}); i=k; continue; }
    m=/^[A-Za-z_가-힣][A-Za-z0-9_.가-힣]*/.exec(src.slice(i));
    if(m){ out.push({t:'id',v:m[0].toUpperCase(),s:m[0]}); i+=m[0].length; continue; }
    var two=src.substr(i,2);
    if(two==='<='||two==='>='||two==='<>'){ out.push({t:'op',v:two,s:two}); i+=2; continue; }
    if('+-*/^&=<>%(),;:{}'.indexOf(ch)>=0){ out.push({t:'op',v:ch===';'?',':ch,s:ch}); i++; continue; }
    out.push({t:'bad',s:ch}); i++;
  }
  return out;
}
function refText(p){ return (p.ac?'$':'')+colName(p.c)+(p.r==null?'':(p.ar?'$':'')+(p.r+1)); }
function tokText(t){
  if(t.t==='ref') return (t.sh!=null?quoteSheet(t.sh)+'!':'')+(t.dead?'#REF!':refText(t.a));
  if(t.t==='rng') return (t.sh!=null?quoteSheet(t.sh)+'!':'')+(t.dead?'#REF!':refText(t.a)+':'+refText(t.b));
  return t.s;
}
function rebuild(toks){ return toks.map(tokText).join(''); }

/* shift relative references by (dr,dc), as when copying or filling a formula */
function shiftFormula(raw,dr,dc){
  if(typeof raw!=='string'||raw[0]!=='=') return raw;
  var toks=tokenize(raw.slice(1));
  toks.forEach(function(t){
    if(t.t!=='ref'&&t.t!=='rng') return;
    [t.a,t.b].forEach(function(p){ if(!p) return;
      if(!p.ar&&p.r!=null){ p.r+=dr; if(p.r<0) t.dead=true; }
      if(!p.ac){ p.c+=dc; if(p.c<0) t.dead=true; } });
  });
  return '='+rebuild(toks);
}
/* rewrite references after rows/columns are inserted (count>0) or deleted (count<0) at index `at` on sheet `target`.
   `own` is the name of the sheet the formula sits on. */
function adjustFormula(raw,own,target,isRow,at,count){
  if(typeof raw!=='string'||raw[0]!=='=') return raw;
  var toks=tokenize(raw.slice(1)), changed=false;
  function mv(x){ // returns new index or null if deleted
    if(count>0) return x>=at?x+count:x;
    var del=-count; if(x>=at+del) return x-del; if(x>=at) return null; return x; }
  toks.forEach(function(t){
    if(t.t!=='ref'&&t.t!=='rng') return;
    var sh=t.sh!=null?t.sh:own; if(sh!==target) return;
    var key=isRow?'r':'c';
    if(t.t==='ref'){ var nv=mv(t.a[key]); if(nv==null){ t.dead=true; } else t.a[key]=nv; changed=true; return; }
    if(isRow&&t.col) return;
    var lo=t.a[key], hi=t.b[key];
    if(lo>hi){ var tmp=lo; lo=hi; hi=tmp; }
    if(count>0){ if(lo>=at) lo+=count; if(hi>=at) hi+=count; }
    else { var d=-count, e=at+d-1;
      if(hi<at){} else if(lo>e){ lo-=d; hi-=d; }
      else { var nlo=lo<at?lo:at, nhi=hi>e?hi-d:at-1; if(nhi<nlo) t.dead=true; lo=nlo; hi=nhi; } }
    t.a[key]=lo; t.b[key]=hi; changed=true;
  });
  return changed?'='+rebuild(toks):raw;
}
function renameSheetInFormula(raw,from,to){
  if(typeof raw!=='string'||raw[0]!=='=') return raw;
  var toks=tokenize(raw.slice(1)), ch=false;
  toks.forEach(function(t){ if((t.t==='ref'||t.t==='rng')&&t.sh===from){ t.sh=to; ch=true; } });
  return ch?'='+rebuild(toks):raw;
}

/* ---------- named ranges ---------- */
var REFC=new Map();
function parseNameRef(text){
  if(REFC.has(text)) return REFC.get(text);
  var toks=tokenize(String(text||'')).filter(function(t){ return t.t!=='ws'; }), out=null;
  if(toks.length===1&&(toks[0].t==='ref'||toks[0].t==='rng')&&!toks[0].dead&&toks[0].sh!=null) out={sh:toks[0].sh,a:toks[0].a,b:toks[0].b||toks[0].a,t:toks[0].t,col:!!toks[0].col};
  if(REFC.size>500) REFC.clear(); REFC.set(text,out); return out;
}
/* "A2:A10" or "Sheet2!A2:A10" -> absolute reference text with its sheet ("Sheet2!$A$2:$A$10"), or null */
function nameRef(text,own){
  var toks=tokenize(String(text||'').trim()).filter(function(t){ return t.t!=='ws'; });
  if(toks.length!==1||(toks[0].t!=='ref'&&toks[0].t!=='rng')||toks[0].dead) return null;
  var t=toks[0]; if(t.sh==null) t.sh=own; if(t.sh==null||t.sh==='') return null;
  [t.a,t.b].forEach(function(p){ if(!p) return; p.ac=true; p.ar=p.r!=null; });
  return tokText(t);
}
function validName(n){
  n=String(n||''); if(!n||n.length>64||!/^[A-Za-z_가-힣][A-Za-z0-9_.가-힣]*$/.test(n)) return 'format';
  if(/^[A-Za-z]{1,3}\d+$/.test(n)||/^[Rr]\d*[Cc]\d*$/.test(n)) return 'cell';
  var u=n.toUpperCase(); if(u==='TRUE'||u==='FALSE'||FN[u]) return 'function';
  return '';
}

/* ---------- parser ---------- */
function parse(src){
  var toks=tokenize(src).filter(function(t){ return t.t!=='ws'; }), p=0;
  function pk(){ return toks[p]; }
  function isOp(v){ var t=toks[p]; return t&&t.t==='op'&&t.v===v; }
  function eat(v){ if(!isOp(v)) fail('#ERROR!'); p++; }
  function expr(){ return cmp(); }
  function cmp(){ var a=cat(); while(pk()&&pk().t==='op'&&['=','<>','<','>','<=','>='].indexOf(pk().v)>=0){ var o=toks[p++].v; a={k:'bin',o:o,a:a,b:cat()}; } return a; }
  function cat(){ var a=add(); while(isOp('&')){ p++; a={k:'bin',o:'&',a:a,b:add()}; } return a; }
  function add(){ var a=mul(); while(isOp('+')||isOp('-')){ var o=toks[p++].v; a={k:'bin',o:o,a:a,b:mul()}; } return a; }
  function mul(){ var a=pow(); while(isOp('*')||isOp('/')){ var o=toks[p++].v; a={k:'bin',o:o,a:a,b:pow()}; } return a; }
  function pow(){ var a=un(); while(isOp('^')){ p++; a={k:'bin',o:'^',a:a,b:un()}; } return a; }
  function un(){ if(isOp('-')){ p++; return {k:'neg',a:un()}; } if(isOp('+')){ p++; return un(); } return post(); }
  function post(){ var a=prim(); while(isOp('%')){ p++; a={k:'pct',a:a}; } return a; }
  function prim(){
    var t=toks[p++]; if(!t) fail('#ERROR!');
    if(t.t==='num') return {k:'v',v:t.v};
    if(t.t==='str') return {k:'v',v:t.v};
    if(t.t==='ref') return t.dead?{k:'err',e:'#REF!'}:{k:'ref',sh:t.sh,r:t.a.r,c:t.a.c};
    if(t.t==='rng'){ if(t.dead) return {k:'err',e:'#REF!'}; return {k:'rng',sh:t.sh,r1:t.a.r,c1:t.a.c,r2:t.b.r,c2:t.b.c,col:!!t.col}; }
    if(t.t==='id'){
      if(isOp('(')){ p++; var args=[]; if(!isOp(')')){ for(;;){ if(isOp(',')||isOp(')')) args.push({k:'v',v:null}); else args.push(expr()); if(isOp(',')){ p++; continue; } break; } } eat(')'); return {k:'fn',n:t.v,args:args}; }
      if(t.v==='TRUE') return {k:'v',v:true}; if(t.v==='FALSE') return {k:'v',v:false};
      return {k:'name',n:t.v};
    }
    if(t.t==='op'&&t.v==='('){ var e=expr(); eat(')'); return e; }
    if(t.t==='op'&&t.v==='{'){ var items=[]; for(;;){ items.push(expr()); if(isOp(',')){ p++; continue; } break; } eat('}'); return {k:'arr',items:items}; }
    fail('#ERROR!');
  }
  var ast=expr(); if(p<toks.length) fail('#ERROR!'); return ast;
}

/* ---------- values ---------- */
var NUMRE=/^[+-]?(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?(e[+-]?\d+)?$/i;
function literal(raw){
  if(raw==null||raw==='') return null;
  var s=String(raw);
  if(s[0]==="'") return s.slice(1);
  var t=s.trim();
  if(t!==''&&/\d/.test(t)){
    var pct=t[t.length-1]==='%', b=pct?t.slice(0,-1):t;
    if(NUMRE.test(b)){ var n=parseFloat(b.replace(/,/g,'')); if(isFinite(n)) return pct?n/100:n; }
  }
  var u=t.toUpperCase(); if(u==='TRUE') return true; if(u==='FALSE') return false;
  return s;
}
function fmtGeneral(n){
  if(!isFinite(n)) return '#NUM!';
  if(n===0) return '0';
  var a=Math.abs(n);
  if(a>=1e15||a<1e-9) return n.toExponential(4).replace(/\.?0+e/,'e');
  var s=String(parseFloat(n.toPrecision(12)));
  if(s.indexOf('e')>=0) s=n.toFixed(10).replace(/\.?0+$/,'');
  return s;
}
function toStr(v){ if(v==null) return ''; if(v===true) return 'TRUE'; if(v===false) return 'FALSE'; if(typeof v==='number') return fmtGeneral(v); if(isErr(v)) throw v; return String(v); }
function toNum(v){
  if(v==null) return 0; if(typeof v==='number') return v; if(typeof v==='boolean') return v?1:0; if(isErr(v)) throw v;
  var l=literal(String(v)); if(typeof l==='number') return l; if(String(v).trim()==='') return 0; fail('#VALUE!');
}
function toBool(v){ if(v==null) return false; if(typeof v==='boolean') return v; if(typeof v==='number') return v!==0; if(isErr(v)) throw v;
  var u=String(v).toUpperCase(); if(u==='TRUE') return true; if(u==='FALSE') return false; fail('#VALUE!'); }

/* ---------- engine ---------- */
function Engine(doc){ this.doc=doc; this.cache=[]; this.busy={}; this.parsed=new Map(); this.reset(); }
/* spill[si]: Map anchor key -> {r1,c1,r2,c2,rows}; pend[si]: formulas that may spill, each evaluated once (done) */
Engine.prototype.reset=function(){ this.cache=[]; this.spill=[]; this.pend=[]; this.log=null; this.cyc=false; };
/* named ranges: doc.names = [{name, ref:"Sheet1!$A$2:$A$10"}] */
Engine.prototype.nameDef=function(up){ var l=this.doc.names; if(!l) return null; for(var i=0;i<l.length;i++) if(l[i].name.toUpperCase()===up) return l[i]; return null; };
Engine.prototype.sheetIndex=function(name,own){
  if(name==null) return own; var sh=this.doc.sheets;
  for(var i=0;i<sh.length;i++) if(sh[i].name===name) return i;
  var u=String(name).toUpperCase(); for(var j=0;j<sh.length;j++) if(sh[j].name.toUpperCase()===u) return j;
  return -1;
};
Engine.prototype.ast=function(raw){
  var a=this.parsed.get(raw); if(a) return a;
  try{ a=parse(raw.slice(1)); }catch(e){ a={k:'err',e:isErr(e)?e.e:'#ERROR!'}; }
  if(this.parsed.size>20000) this.parsed.clear(); this.parsed.set(raw,a); return a;
};
Engine.prototype.value=function(si,r,c){
  var sh=this.doc.sheets[si]; if(!sh) return new Err('#REF!');
  var cell=sh.cells[K(r,c)]; if(!cell||cell.v==null||cell.v==='') return this.spilled(si,r,c);
  var raw=cell.v;
  if(cell.nf==='t'||raw[0]!=='=') return cell.nf==='t'?String(raw):literal(raw);
  var cache=this.cache[si]||(this.cache[si]=new Map()), k=K(r,c);
  if(cache.has(k)) return cache.get(k);
  var bk=si+':'+k; if(this.busy[bk]){ this.cyc=true; return new Err('#CYCLE!'); }
  this.busy[bk]=1; var v;
  try{ v=this.place(si,r,c,this.ev(this.ast(raw),si)); if(v==null) v=0; if(typeof v==='number'&&!isFinite(v)) v=new Err('#NUM!'); }
  catch(e){ v=isErr(e)?e:new Err('#ERROR!'); }
  delete this.busy[bk]; cache.set(k,v); if(this.log) this.log.push([si,k]); return v;
};
/* a formula's result as the anchor cell shows it; a block (Arr or several cells of a range) is registered as a spill,
   or becomes #SPILL! when a cell it would cover already holds something or belongs to another spill */
var MAXSPILL=200000;
Engine.prototype.place=function(si,r,c,v){
  if(v instanceof Rng&&isMulti(v)) v=new Arr(grid(this,v));
  if(v instanceof Rng) return this.first(v);
  if(!(v instanceof Arr)) return v;
  var rows=v.rows, h=rows.length, w=h?rows[0].length:0;
  if(!h||!w) return new Err('#CALC!');
  if(h===1&&w===1) return rows[0][0];
  if(h*w>MAXSPILL) return new Err('#SPILL!');
  var cells=this.doc.sheets[si].cells, g={r1:r,c1:c,r2:r+h-1,c2:c+w-1,rows:rows}, k0=K(r,c), blocked=false;
  for(var i=0;i<h&&!blocked;i++) for(var j=0;j<w;j++){ if(!i&&!j) continue; var x=cells[K(r+i,c+j)]; if(x&&x.v!=null&&x.v!==''){ blocked=true; break; } }
  var m=this.spill[si]||(this.spill[si]=new Map());
  if(!blocked) m.forEach(function(o,ok){ if(ok!==k0&&!(o.r2<g.r1||o.r1>g.r2||o.c2<g.c1||o.c1>g.c2)) blocked=true; });
  if(blocked){ m.delete(k0); return new Err('#SPILL!'); }
  m.set(k0,g); return rows[0][0];
};
function mayArr(n){ // can this formula's result be a block? (only those are evaluated early to find spills)
  switch(n.k){ case 'rng': return !(n.r1===n.r2&&n.c1===n.c2&&!n.col); case 'arr': case 'name': return true;
    case 'neg': case 'pct': return mayArr(n.a); case 'bin': return mayArr(n.a)||mayArr(n.b);
    case 'fn': return !!ARRFN[n.n]||(!!PASSFN[n.n]&&n.args.some(mayArr)); }
  return false;
}
var ARRFN={FILTER:1,SORT:1,SORTBY:1,UNIQUE:1,SEQUENCE:1,TRANSPOSE:1,VSTACK:1,HSTACK:1,TEXTSPLIT:1}, PASSFN={IF:1,IFERROR:1,IFNA:1};
Engine.prototype.cands=function(si){
  var p=this.pend[si]; if(p) return p; p=this.pend[si]=[]; var cells=this.doc.sheets[si].cells;
  for(var k in cells){ var x=cells[k]; if(!x||x.nf==='t'||typeof x.v!=='string'||x.v[0]!=='='||!mayArr(this.ast(x.v))) continue; var rc=RC(k); p.push({r:rc[0],c:rc[1],k:+k,done:false}); }
  return p;
};
/* evaluate a may-spill formula ahead of time. If it ran into a cell that is still being calculated, everything it cached
   is dropped again (it may have seen a half-finished picture) and it is tried later in the normal order */
Engine.prototype.early=function(si,o){
  var outer=this.log, oc=this.cyc; this.log=[]; this.cyc=false;
  this.value(si,o.r,o.c);
  var hit=this.cyc, log=this.log; this.log=outer; this.cyc=oc||hit;
  if(!hit){ o.done=true; return; }
  var self=this; log.forEach(function(e){ var c=self.cache[e[0]]; if(c) c.delete(e[1]); var m=self.spill[e[0]]; if(m) m.delete(e[1]);
    (self.pend[e[0]]||[]).forEach(function(q){ if(q.k===e[1]) q.done=false; }); });
};
/* the value an empty cell shows: a piece of a spill from a formula above or to the left, or nothing */
Engine.prototype.spilled=function(si,r,c){
  var p=this.cands(si); if(!p.length) return null;
  for(var i=0;i<p.length;i++){ var o=p[i]; if(o.done||o.r>r||o.c>c||this.busy[si+':'+o.k]) continue; this.early(si,o); }
  var g=this.spillAt(si,r,c); if(!g) return null; var v=g.rows[r-g.r1][c-g.c1]; return v===undefined?null:v;
};
Engine.prototype.spillAt=function(si,r,c){ var m=this.spill[si], hit=null; if(m) m.forEach(function(g){ if(!hit&&r>=g.r1&&r<=g.r2&&c>=g.c1&&c<=g.c2) hit=g; }); return hit; };
/* every spill on a sheet (evaluates all may-spill formulas): [{r1,c1,r2,c2,rows}] */
Engine.prototype.spills=function(si){
  var self=this; this.cands(si).forEach(function(o){ if(!o.done) self.value(si,o.r,o.c); o.done=true; });
  var out=[]; if(this.spill[si]) this.spill[si].forEach(function(g){ out.push(g); }); return out;
};
Engine.prototype.first=function(g){ return this.value(g.si,g.r1,g.c1); };
Engine.prototype.scal=function(v){ if(v instanceof Rng){ if(v.r1===v.r2&&v.c1===v.c2) return this.first(v); return this.first(v); } if(v instanceof Arr) return v.rows[0][0]; if(isErr(v)) throw v; return v; };
/* rows of values of a range, block or single value */
function grid(self,x){
  if(x instanceof Arr) return x.rows;
  if(x instanceof Rng){ var o=[]; for(var r=x.r1;r<=x.r2;r++){ var row=[]; for(var c=x.c1;c<=x.c2;c++) row.push(self.value(x.si,r,c)); o.push(row); } return o; }
  if(isErr(x)) throw x; return [[x]];
}
function safe(f){ try{ var v=f(); if(typeof v==='number'&&!isFinite(v)) v=new Err('#NUM!'); return v; }catch(e){ if(isErr(e)) return e; throw e; } }
/* element-wise: a single row or column is stretched like Excel does; cells outside the other shape become #N/A */
function lift(self,xs,f){
  var G=xs.map(function(x){ return grid(self,x); }), h=0, w=0;
  G.forEach(function(g){ h=Math.max(h,g.length); w=Math.max(w,g[0].length); });
  var out=[]; for(var i=0;i<h;i++){ var row=[]; for(var j=0;j<w;j++){ var miss=false, a=G.map(function(g){ var ii=g.length===1?0:i, jj=g[0].length===1?0:j; if(ii>=g.length||jj>=g[0].length){ miss=true; return null; } return g[ii][jj]; });
    row.push(miss?new Err('#N/A'):safe(function(){ return f.apply(null,a); })); } out.push(row); }
  return new Arr(out);
}
Engine.prototype.maxRow=function(si){ var sh=this.doc.sheets[si], m=-1; for(var k in sh.cells){ var r=Math.floor(k/KC); if(r>m) m=r; } return m; };
Engine.prototype.ev=function(n,si){
  var self=this;
  switch(n.k){
    case 'v': return n.v;
    case 'err': throw new Err(n.e);
    case 'ref': { var s=this.sheetIndex(n.sh,si); if(s<0) fail('#REF!'); var v=this.value(s,n.r,n.c); if(isErr(v)) throw v; return v; }
    case 'rng': { var s2=this.sheetIndex(n.sh,si); if(s2<0) fail('#REF!');
      var r1=n.r1, r2=n.r2; if(n.col){ r1=0; r2=Math.max(0,this.maxRow(s2)); }
      return new Rng(s2,Math.min(r1,r2),Math.min(n.c1,n.c2),Math.max(r1,r2),Math.max(n.c1,n.c2)); }
    case 'name': { var nd=this.nameDef(n.n); if(!nd) fail('#NAME?'); var pr=parseNameRef(nd.ref); if(!pr) fail('#REF!');
      return this.ev(pr.t==='ref'?{k:'ref',sh:pr.sh,r:pr.a.r,c:pr.a.c}:{k:'rng',sh:pr.sh,r1:pr.a.r,c1:pr.a.c,r2:pr.b.r,c2:pr.b.c,col:!!pr.col},si); }
    case 'arr': return new Arr([n.items.map(function(x){ return self.scal(self.ev(x,si)); })]);
    case 'neg': { var x1=this.ev(n.a,si); if(isMulti(x1)) return lift(this,[x1],function(v){ if(isErr(v)) throw v; return -toNum(v); }); return -toNum(this.scal(x1)); }
    case 'pct': { var x2=this.ev(n.a,si); if(isMulti(x2)) return lift(this,[x2],function(v){ if(isErr(v)) throw v; return toNum(v)/100; }); return toNum(this.scal(x2))/100; }
    case 'bin': {
      var a=this.ev(n.a,si), b=this.ev(n.b,si);
      if(isMulti(a)||isMulti(b)) return lift(this,[a,b],function(x,y){ if(isErr(x)) throw x; if(isErr(y)) throw y; return binop(x,y,n.o); });
      return binop(this.scal(a),this.scal(b),n.o);
    }
    case 'fn': {
      var f=FN[n.n]; if(!f) fail('#NAME?');
      if(f.lazy) return f.call(this,n.args,si);
      var args=n.args.map(function(x){ return self.ev(x,si); });
      return f.call(this,args,si);
    }
  }
  fail('#ERROR!');
};
function binop(a,b,o){
  switch(o){
    case '+': { var da=asDate(a); if(da&&!isErr(b)&&typeof b!=='string') return dateStr(new Date(da.getTime()+toNum(b)*864e5)); return toNum(a)+toNum(b); }
    case '-': { var d1=asDate(a), d2=asDate(b); if(d1&&d2) return Math.round((d1-d2)/864e5); if(d1&&typeof b==='number') return dateStr(new Date(d1.getTime()-b*864e5)); return toNum(a)-toNum(b); }
    case '*': return toNum(a)*toNum(b);
    case '/': { var d=toNum(b); if(d===0) fail('#DIV/0!'); return toNum(a)/d; }
    case '^': return Math.pow(toNum(a),toNum(b));
    case '&': return toStr(a)+toStr(b);
    default: return compare(a,b,o);
  }
}
function cmpVals(a,b){ // -1,0,1 ; numbers < text < booleans like Excel
  if(a==null) a=(typeof b==='string')?'':0; if(b==null) b=(typeof a==='string')?'':0;
  var ta=typeof a, tb=typeof b, rank={number:0,string:1,boolean:2};
  if(ta!==tb) return rank[ta]<rank[tb]?-1:1;
  if(ta==='string'){ a=a.toLowerCase(); b=b.toLowerCase(); return a<b?-1:a>b?1:0; }
  if(ta==='boolean'){ a=a?1:0; b=b?1:0; }
  return a<b?-1:a>b?1:0;
}
function compare(a,b,o){ var c=cmpVals(a,b); switch(o){ case '=':return c===0; case '<>':return c!==0; case '<':return c<0; case '>':return c>0; case '<=':return c<=0; case '>=':return c>=0; } }

/* iterate cell values of args. cb(value, fromRange) */
Engine.prototype.each=function(args,cb){
  for(var i=0;i<args.length;i++){
    var a=args[i];
    if(a instanceof Rng){ for(var r=a.r1;r<=a.r2;r++) for(var c=a.c1;c<=a.c2;c++) cb(this.value(a.si,r,c),true,r-a.r1,c-a.c1); }
    else if(a instanceof Arr){ a.rows.forEach(function(row,i){ row.forEach(function(x,j){ cb(x,true,i,j); }); }); }
    else cb(a,false);
  }
};
Engine.prototype.nums=function(args){ var out=[]; this.each(args,function(v,fr){ if(isErr(v)) throw v; if(fr){ if(typeof v==='number') out.push(v); } else if(v!=null) out.push(toNum(v)); }); return out; };
Engine.prototype.cells=function(g){ var out=[]; if(g instanceof Arr) return [].concat.apply([],g.rows); if(!(g instanceof Rng)){ out.push(g); return out; } for(var r=g.r1;r<=g.r2;r++) for(var c=g.c1;c<=g.c2;c++) out.push(this.value(g.si,r,c)); return out; };
function dims(g){ return g instanceof Rng?[g.r2-g.r1+1,g.c2-g.c1+1]:g instanceof Arr?[g.rows.length,g.rows[0].length]:[1,1]; }

function crit(c){
  var op='=', v=c;
  if(typeof c==='string'){ var m=/^(<=|>=|<>|=|<|>)?([\s\S]*)$/.exec(c); op=m[1]||'='; v=literal(m[2]); if(v==null) v=''; }
  var wild=typeof v==='string'&&/[*?]/.test(v), re=null;
  if(wild) re=new RegExp('^'+v.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'[\\s\\S]*').replace(/\?/g,'.')+'$','i');
  return function(x){
    if(isErr(x)) return false;
    if(re){ var s=x==null?'':toStr(x); return op==='<>'?!re.test(s):re.test(s); }
    if(v===''){ var empty=x==null||x===''; return op==='<>'?!empty:op==='='?empty:false; }
    if(x==null) x=typeof v==='number'?null:'';
    if(x==null) return op==='<>';
    if(typeof v==='number'&&typeof x!=='number') return op==='<>';
    if(typeof v==='string'&&typeof x!=='string') return op==='<>';
    return compare(x,v,op);
  };
}
function round(n,d,mode){ var f=Math.pow(10,d), x=n*f; x=+x.toPrecision(15);
  var r=mode==='up'?(x<0?-Math.ceil(-x):Math.ceil(x)):mode==='down'?(x<0?-Math.floor(-x):Math.floor(x)):(x<0?-Math.round(-x):Math.round(x)); return r/f; }
function todayStr(t){ var d=new Date(); var p=function(n){ return (n<10?'0':'')+n; }; var s=d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); return t?s+' '+p(d.getHours())+':'+p(d.getMinutes()):s; }

/* dates are kept as "YYYY-MM-DD" text; arithmetic goes through UTC day counts */
function asDate(v){
  if(typeof v!=='string') return null;
  var m=/^\s*(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:[ T]\d{1,2}:\d{2})?\s*$/.exec(v); if(!m) return null;
  var y=+m[1], mo=+m[2], d=+m[3], t=new Date(Date.UTC(y,mo-1,d)); if(t.getUTCMonth()!==mo-1||t.getUTCDate()!==d) return null; return t;
}
function dateStr(t){ var p=function(n){ return (n<10?'0':'')+n; }; return t.getUTCFullYear()+'-'+p(t.getUTCMonth()+1)+'-'+p(t.getUTCDate()); }
function dateArg(self,x){ var v=self.scal(x); if(typeof v==='number') return new Date(Date.UTC(1899,11,30)+v*864e5); var d=asDate(v); if(!d) fail('#VALUE!'); return d; }
var FN={};
function def(names,f,lazy){ names.split(' ').forEach(function(n){ FN[n]=f; }); if(lazy) f.lazy=true; }
def('SUM',function(a){ return this.nums(a).reduce(function(s,x){ return s+x; },0); });
def('AVERAGE',function(a){ var n=this.nums(a); if(!n.length) fail('#DIV/0!'); return n.reduce(function(s,x){ return s+x; },0)/n.length; });
def('MIN',function(a){ var n=this.nums(a); return n.length?Math.min.apply(null,n):0; });
def('MAX',function(a){ var n=this.nums(a); return n.length?Math.max.apply(null,n):0; });
def('COUNT',function(a){ var c=0; this.each(a,function(v,fr){ if(typeof v==='number') c++; else if(!fr&&v!=null&&typeof literal(String(v))==='number') c++; }); return c; });
def('COUNTA',function(a){ var c=0; this.each(a,function(v){ if(v!=null&&v!=='') c++; }); return c; });
def('COUNTBLANK',function(a){ var c=0; this.each(a,function(v){ if(v==null||v==='') c++; }); return c; });
def('PRODUCT',function(a){ return this.nums(a).reduce(function(s,x){ return s*x; },1); });
def('MEDIAN',function(a){ var n=this.nums(a).sort(function(x,y){ return x-y; }); if(!n.length) fail('#NUM!'); var m=n.length>>1; return n.length%2?n[m]:(n[m-1]+n[m])/2; });
def('MODE',function(a){ var n=this.nums(a), cnt={}, best=null, bc=1; n.forEach(function(x){ cnt[x]=(cnt[x]||0)+1; if(cnt[x]>bc){ bc=cnt[x]; best=x; } }); if(best==null) fail('#N/A'); return best; });
function variance(n,s){ if(n.length<(s?2:1)) fail('#DIV/0!'); var m=n.reduce(function(a,b){ return a+b; },0)/n.length; return n.reduce(function(a,b){ return a+(b-m)*(b-m); },0)/(n.length-(s?1:0)); }
def('STDEV STDEV.S',function(a){ return Math.sqrt(variance(this.nums(a),true)); });
def('STDEVP STDEV.P',function(a){ return Math.sqrt(variance(this.nums(a),false)); });
def('VAR VAR.S',function(a){ return variance(this.nums(a),true); });
def('LARGE',function(a){ var n=this.nums([a[0]]).sort(function(x,y){ return y-x; }), k=toNum(this.scal(a[1])); if(k<1||k>n.length) fail('#NUM!'); return n[k-1]; });
def('SMALL',function(a){ var n=this.nums([a[0]]).sort(function(x,y){ return x-y; }), k=toNum(this.scal(a[1])); if(k<1||k>n.length) fail('#NUM!'); return n[k-1]; });
def('RANK RANK.EQ',function(a){ var x=toNum(this.scal(a[0])), n=this.nums([a[1]]), asc=a[2]!=null&&toNum(this.scal(a[2]))!==0; if(n.indexOf(x)<0) fail('#N/A'); return 1+n.filter(function(y){ return asc?y<x:y>x; }).length; });
def('SUMPRODUCT',function(a){ var self=this, lists=a.map(function(g){ return self.cells(g); }), len=lists[0].length, s=0;
  lists.forEach(function(l){ if(l.length!==len) fail('#VALUE!'); });
  for(var i=0;i<len;i++){ var p=1; for(var j=0;j<lists.length;j++){ var v=lists[j][i]; if(isErr(v)) throw v; p*=typeof v==='number'?v:0; } s+=p; } return s; });
def('COUNTIF',function(a){ var f=crit(this.scal(a[1])); return this.cells(a[0]).filter(f).length; });
def('SUMIF',function(a){ var f=crit(this.scal(a[1])), c=this.cells(a[0]), s=a[2]?this.cells(a[2]):c, t=0; c.forEach(function(v,i){ if(f(v)&&typeof s[i]==='number') t+=s[i]; }); return t; });
def('AVERAGEIF',function(a){ var f=crit(this.scal(a[1])), c=this.cells(a[0]), s=a[2]?this.cells(a[2]):c, t=0, n=0; c.forEach(function(v,i){ if(f(v)&&typeof s[i]==='number'){ t+=s[i]; n++; } }); if(!n) fail('#DIV/0!'); return t/n; });
function multi(self,a,start){ var ok=null; for(var i=start;i<a.length;i+=2){ var c=self.cells(a[i]), f=crit(self.scal(a[i+1])); if(!ok) ok=c.map(function(){ return true; }); if(c.length!==ok.length) fail('#VALUE!'); c.forEach(function(v,j){ if(!f(v)) ok[j]=false; }); } return ok||[]; }
def('COUNTIFS',function(a){ return multi(this,a,0).filter(Boolean).length; });
def('SUMIFS',function(a){ var s=this.cells(a[0]), ok=multi(this,a,1), t=0; ok.forEach(function(b,i){ if(b&&typeof s[i]==='number') t+=s[i]; }); return t; });
def('AVERAGEIFS',function(a){ var s=this.cells(a[0]), ok=multi(this,a,1), t=0, n=0; ok.forEach(function(b,i){ if(b&&typeof s[i]==='number'){ t+=s[i]; n++; } }); if(!n) fail('#DIV/0!'); return t/n; });
def('ROUND',function(a){ return round(toNum(this.scal(a[0])),a[1]?toNum(this.scal(a[1])):0); });
def('ROUNDUP',function(a){ return round(toNum(this.scal(a[0])),a[1]?toNum(this.scal(a[1])):0,'up'); });
def('ROUNDDOWN TRUNC',function(a){ return round(toNum(this.scal(a[0])),a[1]?toNum(this.scal(a[1])):0,'down'); });
def('INT',function(a){ return Math.floor(toNum(this.scal(a[0]))); });
def('ABS',function(a){ return Math.abs(toNum(this.scal(a[0]))); });
def('SQRT',function(a){ var x=toNum(this.scal(a[0])); if(x<0) fail('#NUM!'); return Math.sqrt(x); });
def('POWER',function(a){ return Math.pow(toNum(this.scal(a[0])),toNum(this.scal(a[1]))); });
def('MOD',function(a){ var x=toNum(this.scal(a[0])), d=toNum(this.scal(a[1])); if(d===0) fail('#DIV/0!'); return x-d*Math.floor(x/d); });
def('PI',function(){ return Math.PI; });
def('RAND',function(){ return Math.random(); });
def('RANDBETWEEN',function(a){ var lo=Math.ceil(toNum(this.scal(a[0]))), hi=Math.floor(toNum(this.scal(a[1]))); if(hi<lo) fail('#NUM!'); return lo+Math.floor(Math.random()*(hi-lo+1)); });
def('SIGN',function(a){ return Math.sign(toNum(this.scal(a[0]))); });
def('LN',function(a){ var x=toNum(this.scal(a[0])); if(x<=0) fail('#NUM!'); return Math.log(x); });
def('LOG10',function(a){ var x=toNum(this.scal(a[0])); if(x<=0) fail('#NUM!'); return Math.log10(x); });
def('LOG',function(a){ var x=toNum(this.scal(a[0])), b=a[1]?toNum(this.scal(a[1])):10; if(x<=0||b<=0||b===1) fail('#NUM!'); return Math.log(x)/Math.log(b); });
def('EXP',function(a){ return Math.exp(toNum(this.scal(a[0]))); });
def('IF',function(a,si){ var c0=this.ev(a[0],si);
  if(isMulti(c0)){ var y=a[1]?this.ev(a[1],si):true, n=a[2]?this.ev(a[2],si):false; return lift(this,[c0,y,n],function(c,p,q){ if(isErr(c)) throw c; return toBool(c)?p:q; }); } // IF(A2:A9>50, …) per cell
  var c=toBool(this.scal(c0)); var b=c?a[1]:a[2]; if(!b) return c; var v=this.ev(b,si); return v instanceof Rng&&!isMulti(v)?this.first(v):v; },true);
def('IFS',function(a,si){ for(var i=0;i+1<a.length;i+=2){ if(toBool(this.scal(this.ev(a[i],si)))) return this.scal(this.ev(a[i+1],si)); } fail('#N/A'); },true);
def('IFERROR',function(a,si){ try{ var v0=this.ev(a[0],si);
    if(v0 instanceof Arr){ var self=this, alt=null, got=false; return new Arr(v0.rows.map(function(row){ return row.map(function(x){ if(!isErr(x)) return x; if(!got){ alt=a[1]?self.scal(self.ev(a[1],si)):''; got=true; } return alt; }); })); }
    var v=this.scal(v0); if(isErr(v)) throw v; return v; }catch(e){ if(!isErr(e)) throw e; return a[1]?this.scal(this.ev(a[1],si)):''; } },true);
def('IFNA',function(a,si){ try{ return this.scal(this.ev(a[0],si)); }catch(e){ if(isErr(e)&&e.e==='#N/A') return a[1]?this.scal(this.ev(a[1],si)):''; throw e; } },true);
def('AND',function(a){ var r=true, any=false; this.each(a,function(v,fr){ if(isErr(v)) throw v; if(fr&&typeof v!=='boolean'&&typeof v!=='number') return; any=true; if(!toBool(v)) r=false; }); if(!any) fail('#VALUE!'); return r; });
def('OR',function(a){ var r=false, any=false; this.each(a,function(v,fr){ if(isErr(v)) throw v; if(fr&&typeof v!=='boolean'&&typeof v!=='number') return; any=true; if(toBool(v)) r=true; }); if(!any) fail('#VALUE!'); return r; });
def('XOR',function(a){ var r=false; this.each(a,function(v,fr){ if(fr&&typeof v!=='boolean'&&typeof v!=='number') return; if(toBool(v)) r=!r; }); return r; });
def('NOT',function(a){ return !toBool(this.scal(a[0])); });
def('TRUE',function(){ return true; }); def('FALSE',function(){ return false; });
def('ISBLANK',function(a){ var v=this.scal(a[0]); return v==null; });
def('ISNUMBER',function(a){ try{ return typeof this.scal(a[0])==='number'; }catch(e){ return false; } });
def('ISTEXT',function(a){ try{ return typeof this.scal(a[0])==='string'; }catch(e){ return false; } });
def('ISERROR',function(a,si){ try{ this.scal(this.ev(a[0],si)); return false; }catch(e){ return true; } },true);
def('LEN',function(a){ return toStr(this.scal(a[0])).length; });
def('LEFT',function(a){ return toStr(this.scal(a[0])).slice(0,a[1]?toNum(this.scal(a[1])):1); });
def('RIGHT',function(a){ var s=toStr(this.scal(a[0])), n=a[1]?toNum(this.scal(a[1])):1; return n<=0?'':s.slice(-n); });
def('MID',function(a){ var s=toStr(this.scal(a[0])), st=toNum(this.scal(a[1])), n=toNum(this.scal(a[2])); if(st<1) fail('#VALUE!'); return s.substr(st-1,n); });
def('UPPER',function(a){ return toStr(this.scal(a[0])).toUpperCase(); });
def('LOWER',function(a){ return toStr(this.scal(a[0])).toLowerCase(); });
def('PROPER',function(a){ return toStr(this.scal(a[0])).toLowerCase().replace(/(^|[^a-z])([a-z])/g,function(m,p,c){ return p+c.toUpperCase(); }); });
def('TRIM',function(a){ return toStr(this.scal(a[0])).trim().replace(/\s+/g,' '); });
def('CONCAT CONCATENATE',function(a){ var s=''; this.each(a,function(v){ s+=toStr(v); }); return s; });
def('TEXTJOIN',function(a){ var d=toStr(this.scal(a[0])), skipE=toBool(this.scal(a[1])), out=[]; this.each(a.slice(2),function(v){ var s=toStr(v); if(skipE&&s==='') return; out.push(s); }); return out.join(d); });
def('SUBSTITUTE',function(a){ var s=toStr(this.scal(a[0])), f=toStr(this.scal(a[1])), t=toStr(this.scal(a[2])); if(!f) return s; if(a[3]){ var k=toNum(this.scal(a[3])), i=-1; for(var j=0;j<k;j++){ i=s.indexOf(f,i+1); if(i<0) return s; } return s.slice(0,i)+t+s.slice(i+f.length); } return s.split(f).join(t); });
def('REPLACE',function(a){ var s=toStr(this.scal(a[0])), st=toNum(this.scal(a[1])), n=toNum(this.scal(a[2])), t=toStr(this.scal(a[3])); return s.slice(0,st-1)+t+s.slice(st-1+n); });
def('FIND',function(a){ var f=toStr(this.scal(a[0])), s=toStr(this.scal(a[1])), st=a[2]?toNum(this.scal(a[2])):1, i=s.indexOf(f,st-1); if(i<0) fail('#VALUE!'); return i+1; });
def('SEARCH',function(a){ var f=toStr(this.scal(a[0])).toLowerCase(), s=toStr(this.scal(a[1])).toLowerCase(), st=a[2]?toNum(this.scal(a[2])):1, i=s.indexOf(f,st-1); if(i<0) fail('#VALUE!'); return i+1; });
def('REPT',function(a){ var n=toNum(this.scal(a[1])); if(n<0||n>10000) fail('#VALUE!'); return toStr(this.scal(a[0])).repeat(Math.floor(n)); });
def('EXACT',function(a){ return toStr(this.scal(a[0]))===toStr(this.scal(a[1])); });
def('VALUE',function(a){ return toNum(this.scal(a[0])); });
def('TEXT',function(a){ var n=this.scal(a[0]), f=toStr(this.scal(a[1]));
  if(/[ymd]/i.test(f.replace(/"[^"]*"/g,''))&&!/[0#]/.test(f)){ var dd=asDate(n)||(typeof n==='number'?new Date(Date.UTC(1899,11,30)+n*864e5):null); if(!dd) fail('#VALUE!'); var p2=function(x){ return (x<10?'0':'')+x; }; var wk=['일','월','화','수','목','금','토'][dd.getUTCDay()];
    return f.replace(/yyyy|yy|mm|dd|aaa/gi,function(t){ t=t.toLowerCase(); return t==='yyyy'?dd.getUTCFullYear():t==='yy'?String(dd.getUTCFullYear()).slice(2):t==='mm'?p2(dd.getUTCMonth()+1):t==='dd'?p2(dd.getUTCDate()):wk; }); }
  if(typeof n!=='number'){ n=toNum(n); }
  var pct=f.indexOf('%')>=0; if(pct) n*=100; var dec=(f.split('.')[1]||'').replace(/[^0#]/g,'').length, grp=f.indexOf(',')>=0;
  var s=grp?n.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec}):n.toFixed(dec); return s+(pct?'%':''); });
def('CHAR',function(a){ return String.fromCharCode(toNum(this.scal(a[0]))); });
def('TODAY',function(){ return todayStr(false); });
def('NOW',function(){ return todayStr(true); });
def('ROW',function(a){ return a[0] instanceof Rng?a[0].r1+1:fail('#VALUE!'); });
def('COLUMN',function(a){ return a[0] instanceof Rng?a[0].c1+1:fail('#VALUE!'); });
def('ROWS',function(a){ return dims(a[0])[0]; });
def('COLUMNS',function(a){ return dims(a[0])[1]; });
def('CHOOSE',function(a,si){ var i=toNum(this.scal(this.ev(a[0],si))); if(i<1||i>=a.length) fail('#VALUE!'); return this.scal(this.ev(a[Math.floor(i)],si)); },true);
function asRng(x){ if(!(x instanceof Rng)) fail('#VALUE!'); return x; }
def('INDEX',function(a){ var g=a[0] instanceof Arr?a[0]:asRng(a[0]), d=dims(g), r=a[1]!=null?toNum(this.scal(a[1])):1, c=a[2]!=null?toNum(this.scal(a[2])):1;
  if(d[0]===1&&a[2]==null){ c=r; r=1; } if(r<1||c<1||r>d[0]||c>d[1]) fail('#REF!'); return g instanceof Arr?g.rows[r-1][c-1]:this.value(g.si,g.r1+r-1,g.c1+c-1); });
function matchIn(self,x,list,type){
  if(type===0){ var f=crit(typeof x==='string'?'='+x:x); for(var i=0;i<list.length;i++){ if(typeof x==='string'?f(list[i]):(cmpVals(list[i],x)===0&&list[i]!=null)) return i; } return -1; }
  var best=-1; for(var j=0;j<list.length;j++){ var v=list[j]; if(v==null) continue; var c=cmpVals(v,x); if(type>0?c<=0:c>=0) best=j; else break; } return best;
}
def('MATCH',function(a){ var x=this.scal(a[0]), l=this.cells(a[1]), t=a[2]!=null?toNum(this.scal(a[2])):1, i=matchIn(this,x,l,t); if(i<0) fail('#N/A'); return i+1; });
def('VLOOKUP',function(a){ var x=this.scal(a[0]), g=asRng(a[1]), col=toNum(this.scal(a[2])), approx=a[3]!=null?toBool(this.scal(a[3])):true;
  if(col<1||col>g.c2-g.c1+1) fail('#REF!'); var keys=[]; for(var r=g.r1;r<=g.r2;r++) keys.push(this.value(g.si,r,g.c1));
  var i=matchIn(this,x,keys,approx?1:0); if(i<0) fail('#N/A'); return this.value(g.si,g.r1+i,g.c1+col-1); });
def('HLOOKUP',function(a){ var x=this.scal(a[0]), g=asRng(a[1]), row=toNum(this.scal(a[2])), approx=a[3]!=null?toBool(this.scal(a[3])):true;
  if(row<1||row>g.r2-g.r1+1) fail('#REF!'); var keys=[]; for(var c=g.c1;c<=g.c2;c++) keys.push(this.value(g.si,g.r1,c));
  var i=matchIn(this,x,keys,approx?1:0); if(i<0) fail('#N/A'); return this.value(g.si,g.r1+row-1,g.c1+i); });
def('XLOOKUP',function(a){ var x=this.scal(a[0]), keys=this.cells(a[1]), vals=this.cells(a[2]), i=matchIn(this,x,keys,0);
  if(i<0){ if(a[3]!=null) return this.scal(a[3]); fail('#N/A'); } var v=vals[i]; return v==null?0:v; });

/* v10 additions: dates, conditional aggregates, rounding, statistics */
def('DATE',function(a){ var y=toNum(this.scal(a[0])), m=toNum(this.scal(a[1])), d=toNum(this.scal(a[2])); return dateStr(new Date(Date.UTC(y,m-1,d))); });
def('YEAR',function(a){ return dateArg(this,a[0]).getUTCFullYear(); });
def('MONTH',function(a){ return dateArg(this,a[0]).getUTCMonth()+1; });
def('DAY',function(a){ return dateArg(this,a[0]).getUTCDate(); });
def('WEEKDAY',function(a){ var w=dateArg(this,a[0]).getUTCDay(), t=a[1]!=null?toNum(this.scal(a[1])):1; return t===2?(w+6)%7+1:t===3?(w+6)%7:w+1; });
def('DAYS',function(a){ return Math.round((dateArg(this,a[0])-dateArg(this,a[1]))/864e5); });
def('EDATE',function(a){ var d=dateArg(this,a[0]), n=toNum(this.scal(a[1])); var t=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+n,1)); var last=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,0)).getUTCDate(); t.setUTCDate(Math.min(d.getUTCDate(),last)); return dateStr(t); });
def('DATEDIF',function(a){ var s=dateArg(this,a[0]), e=dateArg(this,a[1]), u=toStr(this.scal(a[2])).toUpperCase(); if(e<s) fail('#NUM!');
  var months=(e.getUTCFullYear()-s.getUTCFullYear())*12+e.getUTCMonth()-s.getUTCMonth(); if(e.getUTCDate()<s.getUTCDate()) months--;
  if(u==='D') return Math.round((e-s)/864e5); if(u==='M') return months; if(u==='Y') return Math.floor(months/12); fail('#NUM!'); });
function ifsMax(self,a,sign){ var s=self.cells(a[0]), ok=multi(self,a,1), best=null; ok.forEach(function(b,i){ if(b&&typeof s[i]==='number'&&(best==null||sign*s[i]>sign*best)) best=s[i]; }); return best==null?0:best; }
def('MAXIFS',function(a){ return ifsMax(this,a,1); });
def('MINIFS',function(a){ return ifsMax(this,a,-1); });
def('CEILING',function(a){ var x=toNum(this.scal(a[0])), s=a[1]!=null?toNum(this.scal(a[1])):1; if(s===0) return 0; return +(Math.ceil(+(x/s).toPrecision(15))*s).toPrecision(15); });
def('FLOOR',function(a){ var x=toNum(this.scal(a[0])), s=a[1]!=null?toNum(this.scal(a[1])):1; if(s===0) fail('#DIV/0!'); return +(Math.floor(+(x/s).toPrecision(15))*s).toPrecision(15); });
def('MROUND',function(a){ var x=toNum(this.scal(a[0])), s=toNum(this.scal(a[1])); if(s===0) return 0; return +(Math.round(+(x/s).toPrecision(15))*s).toPrecision(15); });
def('SUMSQ',function(a){ return this.nums(a).reduce(function(s,x){ return s+x*x; },0); });
def('ISEVEN',function(a){ return Math.floor(toNum(this.scal(a[0])))%2===0; });
def('ISODD',function(a){ return Math.abs(Math.floor(toNum(this.scal(a[0]))))%2===1; });
function pct(n,k){ n=n.slice().sort(function(x,y){ return x-y; }); if(!n.length||k<0||k>1) fail('#NUM!'); var p=k*(n.length-1), lo=Math.floor(p), hi=Math.ceil(p); return n[lo]+(n[hi]-n[lo])*(p-lo); }
def('PERCENTILE',function(a){ return pct(this.nums([a[0]]),toNum(this.scal(a[1]))); });
def('QUARTILE',function(a){ var q=toNum(this.scal(a[1])); if(q<0||q>4) fail('#NUM!'); return pct(this.nums([a[0]]),q/4); });
function pairs(self,a){ var x=self.cells(a[0]), y=self.cells(a[1]), px=[], py=[]; if(x.length!==y.length) fail('#N/A'); x.forEach(function(v,i){ if(typeof v==='number'&&typeof y[i]==='number'){ px.push(v); py.push(y[i]); } }); if(px.length<2) fail('#DIV/0!'); return [px,py]; }
function mean(n){ return n.reduce(function(s,x){ return s+x; },0)/n.length; }
function sxy(p){ var mx=mean(p[0]), my=mean(p[1]), a=0, b=0, c=0; p[0].forEach(function(x,i){ var dx=x-mx, dy=p[1][i]-my; a+=dx*dy; b+=dx*dx; c+=dy*dy; }); return [a,b,c]; }
def('CORREL',function(a){ var s=sxy(pairs(this,a)); if(!s[1]||!s[2]) fail('#DIV/0!'); return s[0]/Math.sqrt(s[1]*s[2]); });
def('SLOPE',function(a){ var s=sxy(pairs(this,[a[1],a[0]])); if(!s[1]) fail('#DIV/0!'); return s[0]/s[1]; });
def('INTERCEPT',function(a){ var p=pairs(this,[a[1],a[0]]), s=sxy(p); if(!s[1]) fail('#DIV/0!'); return mean(p[1])-s[0]/s[1]*mean(p[0]); });
def('COUNTUNIQUE',function(a){ var seen={}, n=0; this.each(a,function(v){ if(v==null||v==='') return; var k=typeof v+':'+String(v).toLowerCase(); if(!seen[k]){ seen[k]=1; n++; } }); return n; });

/* v11: pivot table. rows = evaluated values (no header row); groups by column kc and sums / counts / averages column vc.
   agg 'sum'|'count'|'avg'; sort 'first' (order of appearance) | 'key' | 'val' (largest first). Returns {rows:[[key,value]], total}. */
function pivot(rows,kc,vc,agg,sort){
  var kcs=[].concat(kc), map=Object.create(null), list=[], T={n:0,s:0,m:0,lo:null,hi:null};
  function add(g,v){ g.n++; if(typeof v==='number'){ g.s+=v; g.m++; if(g.lo==null||v<g.lo) g.lo=v; if(g.hi==null||v>g.hi) g.hi=v; } }
  rows.forEach(function(row){
    var keys=kcs.map(function(c){ var k=row[c]; return k==null?'':k; }), id=keys.map(function(k){ return (isErr(k)?k.e:formatValue(k)).toLowerCase(); }).join('\u0001');
    var g=map[id]; if(!g){ g=map[id]={keys:keys,n:0,s:0,m:0,lo:null,hi:null}; list.push(g); }
    var v=row[vc]; if(v==null||v===''||isErr(v)) return;
    add(g,v); add(T,v);
  });
  function val(g){ return agg==='count'?g.n:agg==='avg'?(g.m?g.s/g.m:null):agg==='max'?g.hi:agg==='min'?g.lo:g.s; }
  var out=list.map(function(g){ return g.keys.concat([val(g)]); }), nk=kcs.length;
  if(sort==='key') out.sort(function(a,b){ for(var i=0;i<nk;i++){ var ea=a[i]==='', eb=b[i]==='';  if(ea||eb){ if(ea!==eb) return ea?1:-1; continue; } var x=cmpVals(a[i],b[i]); if(x) return x; } return 0; });
  else if(sort==='val') out.sort(function(a,b){ var x=a[nk], y=b[nk]; if(x==null||y==null) return x==null&&y==null?0:x==null?1:-1; return y-x; });
  return {rows:out,total:val(T)};
}

/* v21: protection and names. A sheet's lock is {all:1} (whole sheet) and/or {rg:[{r1,c1,r2,c2}]}.
   lockHit: is the cell locked; lockAny: does the box touch a locked cell; lockCut: ranges left after unlocking box g. */
function lockHit(lk,r,c){ if(!lk) return false; if(lk.all) return true; var l=lk.rg||[]; for(var i=0;i<l.length;i++){ var g=l[i]; if(r>=g.r1&&r<=g.r2&&c>=g.c1&&c<=g.c2) return true; } return false; }
function lockAny(lk,g){ if(!lk) return false; if(lk.all) return true; var l=lk.rg||[]; for(var i=0;i<l.length;i++){ var x=l[i]; if(!(x.r2<g.r1||x.r1>g.r2||x.c2<g.c1||x.c1>g.c2)) return true; } return false; }
function lockCut(list,g){
  var out=[]; list.forEach(function(x){
    if(x.r2<g.r1||x.r1>g.r2||x.c2<g.c1||x.c1>g.c2){ out.push(x); return; }
    if(x.r1<g.r1) out.push({r1:x.r1,c1:x.c1,r2:g.r1-1,c2:x.c2});
    if(x.r2>g.r2) out.push({r1:g.r2+1,c1:x.c1,r2:x.r2,c2:x.c2});
    var a=Math.max(x.r1,g.r1), b=Math.min(x.r2,g.r2);
    if(x.c1<g.c1) out.push({r1:a,c1:x.c1,r2:b,c2:g.c1-1});
    if(x.c2>g.c2) out.push({r1:a,c1:g.c2+1,r2:b,c2:x.c2});
  }); return out;
}
/* rename a defined name inside a formula (not when it is called like a function) */
function renameNameInFormula(raw,from,to){
  if(typeof raw!=='string'||raw[0]!=='=') return raw;
  var toks=tokenize(raw.slice(1)), ch=false, u=String(from).toUpperCase();
  toks.forEach(function(t,i){ if(t.t!=='id'||t.v!==u) return; var j=i+1; while(toks[j]&&toks[j].t==='ws') j++; if(toks[j]&&toks[j].s==='(') return; t.s=to; t.v=String(to).toUpperCase(); ch=true; });
  return ch?'='+rebuild(toks):raw;
}

/* v14: data cleaning. trimText works like TRIM (also non-breaking and full-width spaces); splitText splits on any of the delimiters;
   dedupeRows returns keep[] flags: a row is dropped when an earlier row has the same values (case-insensitive) in the key columns. Rows whose key cells are all empty are kept. */
var SPACES=/[\u00a0\u2000-\u200b\u3000\ufeff]/g;
function trimText(s){ return String(s).replace(SPACES,' ').replace(/\s+/g,' ').trim(); }
function splitText(s,delims,merge,trim){
  s=String(s); var ds=(delims||[]).filter(function(d){ return d!=null&&d!==''; }).sort(function(a,b){ return b.length-a.length; });
  var out=[s]; if(ds.length) out=s.split(new RegExp('(?:'+ds.map(function(d){ return d.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }).join('|')+')'+(merge?'+':'')));
  return trim?out.map(function(x){ return x.replace(SPACES,' ').trim(); }):out;
}
function dedupeRows(rows,cols){
  var seen=Object.create(null);
  return rows.map(function(row){ var empty=true, key=cols.map(function(c){ var v=row[c]; if(v==null||v==='') return ''; empty=false; return isErr(v)?'e:'+v.e:typeof v+':'+String(v).toLowerCase(); }).join('\u0001');
    if(empty) return true; if(seen[key]) return false; seen[key]=1; return true; });
}

/* v15: icon sets (arrows, traffic lights) for conditional formats. t = position of the value between the range's min (0) and max (1);
   f.p1/f.p2 are the percent cut-offs (default 33/67) and f.rev swaps the colors (low is good) but keeps the arrow direction. Returns [glyph, color]. */
var ICONS={arrows:['▼','▶','▲'],lights:['●','●','●']}, ICOL=['#ff5d5d','#ffc93c','#3fe08f'];
function iconFor(f,t){
  var p1=(f.p1==null?33:f.p1)/100, p2=(f.p2==null?67:f.p2)/100, lv=t>=p2?2:t>=p1?1:0;
  return [(ICONS[f.set]||ICONS.arrows)[lv],ICOL[f.rev?2-lv:lv]];
}
/* sparkline as an SVG string (viewBox 100x24, stretched to the cell). vals: numbers or null; kind 'line' | 'col' */
function sparkSvg(vals,kind,col){
  var nums=vals.filter(function(x){ return x!=null; }); if(!nums.length) return null;
  var lo=Math.min.apply(null,nums), hi=Math.max.apply(null,nums), W=100, H=24, pad=3, n=vals.length, o='';
  function xs(i){ return n>1?4+i*(W-8)/(n-1):W/2; }
  if(kind==='col'){
    var b0=Math.min(0,lo), b1=Math.max(0,hi); if(b1===b0) b1=b0+1; var ys=function(v){ return H-pad-(v-b0)/(b1-b0)*(H-2*pad); }, bw=Math.max(2,(W-8)/n*.7), zy=ys(0);
    vals.forEach(function(v,i){ if(v==null) return; var y=ys(v), x=n>1?4+(i+.5)*(W-8)/n-bw/2:W/2-bw/2; o+='<rect x="'+x.toFixed(2)+'" y="'+Math.min(y,zy).toFixed(2)+'" width="'+bw.toFixed(2)+'" height="'+Math.max(1,Math.abs(zy-y)).toFixed(2)+'" fill="'+col+'"/>'; });
  } else {
    var yl=function(v){ return hi===lo?H/2:H-pad-(v-lo)/(hi-lo)*(H-2*pad); }, segs=[], cur=[];
    vals.forEach(function(v,i){ if(v==null){ if(cur.length) segs.push(cur); cur=[]; return; } cur.push(xs(i).toFixed(2)+','+yl(v).toFixed(2)); }); if(cur.length) segs.push(cur);
    segs.forEach(function(sg){ if(sg.length>1) o+='<polyline points="'+sg.join(' ')+'" fill="none" stroke="'+col+'" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>'; });
    var li=vals.length-1; while(li>=0&&vals[li]==null) li--; if(li>=0){ var lx=xs(li); o+='<polyline points="'+lx.toFixed(2)+','+yl(vals[li]).toFixed(2)+' '+(lx+.01).toFixed(2)+','+yl(vals[li]).toFixed(2)+'" fill="none" stroke="'+col+'" stroke-width="5" stroke-linecap="round" vector-effect="non-scaling-stroke"/>'; }
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+o+'</svg>';
}

/* v19: array functions. Each returns an Arr that spills from the formula's cell (see Engine.place). */
function opt(self,x,d){ return x==null?d:toNum(self.scal(x)); }
function transpose(G){ return G[0].map(function(_,j){ return G.map(function(row){ return row[j]; }); }); }
function sortKey(a,b){ // blanks always last, then errors; otherwise numbers < text < TRUE/FALSE
  var ea=a==null||a==='', eb=b==null||b===''; if(ea||eb) return ea===eb?0:ea?2:-2;
  var xa=isErr(a), xb=isErr(b); if(xa||xb) return xa===xb?0:xa?2:-2; return cmpVals(a,b); }
function sortRows(G,keys){ // keys: [{vals:[one per row], ord:1|-1}]; stable
  var idx=G.map(function(_,i){ return i; });
  idx.sort(function(x,y){ for(var k=0;k<keys.length;k++){ var c=sortKey(keys[k].vals[x],keys[k].vals[y]); if(c) return Math.abs(c)===2?c:c*keys[k].ord; } return x-y; });
  return idx.map(function(i){ return G[i]; });
}
function order(self,x){ var o=opt(self,x,1); if(o!==1&&o!==-1) fail('#VALUE!'); return o; }
def('SEQUENCE',function(a){ var h=Math.floor(opt(this,a[0],1)), w=Math.floor(opt(this,a[1],1)), st=opt(this,a[2],1), sp=opt(this,a[3],1);
  if(h<1||w<1) fail('#CALC!'); if(h*w>MAXSPILL) fail('#NUM!');
  var out=[]; for(var i=0;i<h;i++){ var row=[]; for(var j=0;j<w;j++) row.push(+(st+(i*w+j)*sp).toPrecision(15)); out.push(row); } return new Arr(out); });
def('FILTER',function(a){ var A=grid(this,a[0]), I=grid(this,a[1]), h=A.length, w=A[0].length, out;
  function ok(t){ if(isErr(t)) throw t; return toBool(t); }
  if(I[0].length===1&&I.length===h) out=A.filter(function(_,i){ return ok(I[i][0]); });
  else if(I.length===1&&I[0].length===w){ var keep=I[0].map(ok); out=keep.some(Boolean)?A.map(function(row){ return row.filter(function(_,j){ return keep[j]; }); }):[]; }
  else fail('#VALUE!');
  if(!out.length){ if(a[2]!==undefined) return a[2]; fail('#CALC!'); }
  return new Arr(out); });
def('SORT',function(a){ var A=grid(this,a[0]), ix=Math.floor(opt(this,a[1],1)), o=order(this,a[2]), byc=a[3]!=null&&toBool(this.scal(a[3]));
  if(byc) A=transpose(A); if(ix<1||ix>A[0].length) fail('#VALUE!');
  var out=sortRows(A,[{vals:A.map(function(row){ return row[ix-1]; }),ord:o}]); return new Arr(byc?transpose(out):out); });
def('SORTBY',function(a){ var A=grid(this,a[0]), keys=[], byc=null; if(a.length<2) fail('#VALUE!');
  for(var i=1;i<a.length;i+=2){ var B=grid(this,a[i]), o=order(this,a[i+1]), col;
    if(B[0].length===1&&B.length===A.length&&byc!==true){ col=B.map(function(r){ return r[0]; }); byc=false; }
    else if(B.length===1&&B[0].length===A[0].length&&byc!==false){ col=B[0]; byc=true; }
    else fail('#VALUE!');
    keys.push({vals:col,ord:o}); }
  if(byc) return new Arr(transpose(sortRows(transpose(A),keys)));
  return new Arr(sortRows(A,keys)); });
def('UNIQUE',function(a){ var A=grid(this,a[0]), byc=a[1]!=null&&toBool(this.scal(a[1])), once=a[2]!=null&&toBool(this.scal(a[2]));
  if(byc) A=transpose(A); var cnt=Object.create(null), first=[];
  A.forEach(function(row){ var key=row.map(function(v){ return v==null?'':isErr(v)?'e:'+v.e:typeof v+':'+String(v).toLowerCase(); }).join('\u0001');
    if(!cnt[key]){ cnt[key]=0; first.push([key,row]); } cnt[key]++; });
  var out=first.filter(function(x){ return !once||cnt[x[0]]===1; }).map(function(x){ return x[1]; });
  if(!out.length) fail('#CALC!'); return new Arr(byc?transpose(out):out); });

/* .xlsx keeps functions newer than Excel 2007 under a prefix (FILTER is "_xlfn._xlws.FILTER" in the file) */
var XLFN={FILTER:'_xlfn._xlws.FILTER',SORT:'_xlfn._xlws.SORT',SORTBY:'_xlfn.SORTBY',UNIQUE:'_xlfn.UNIQUE',SEQUENCE:'_xlfn.SEQUENCE',XLOOKUP:'_xlfn.XLOOKUP',IFS:'_xlfn.IFS',IFNA:'_xlfn.IFNA',
  CONCAT:'_xlfn.CONCAT',TEXTJOIN:'_xlfn.TEXTJOIN',MAXIFS:'_xlfn.MAXIFS',MINIFS:'_xlfn.MINIFS',XOR:'_xlfn.XOR',DAYS:'_xlfn.DAYS','STDEV.S':'_xlfn.STDEV.S','STDEV.P':'_xlfn.STDEV.P','VAR.S':'_xlfn.VAR.S','RANK.EQ':'_xlfn.RANK.EQ','RANK.AVG':'_xlfn.RANK.AVG','VAR.P':'_xlfn.VAR.P','MODE.SNGL':'_xlfn.MODE.SNGL','PERCENTILE.INC':'_xlfn.PERCENTILE.INC','QUARTILE.INC':'_xlfn.QUARTILE.INC','PERCENTRANK.INC':'_xlfn.PERCENTRANK.INC','FORECAST.LINEAR':'_xlfn.FORECAST.LINEAR','COVARIANCE.P':'_xlfn.COVARIANCE.P','COVARIANCE.S':'_xlfn.COVARIANCE.S','NORM.DIST':'_xlfn.NORM.DIST','NORM.S.DIST':'_xlfn.NORM.S.DIST','NORM.INV':'_xlfn.NORM.INV','NORM.S.INV':'_xlfn.NORM.S.INV','BINOM.DIST':'_xlfn.BINOM.DIST','POISSON.DIST':'_xlfn.POISSON.DIST','SWITCH':'_xlfn.SWITCH','CEILING.MATH':'_xlfn.CEILING.MATH','FLOOR.MATH':'_xlfn.FLOOR.MATH','ISOWEEKNUM':'_xlfn.ISOWEEKNUM','NUMBERVALUE':'_xlfn.NUMBERVALUE','UNICODE':'_xlfn.UNICODE','UNICHAR':'_xlfn.UNICHAR','TEXTBEFORE':'_xlfn.TEXTBEFORE','TEXTAFTER':'_xlfn.TEXTAFTER','TEXTSPLIT':'_xlfn.TEXTSPLIT','VSTACK':'_xlfn.VSTACK','HSTACK':'_xlfn.HSTACK'};
function fnNames(f,map){ var toks=tokenize(f), ch=false;
  toks.forEach(function(t,i){ if(t.t!=='id') return; var j=i+1; while(toks[j]&&toks[j].t==='ws') j++; if(!toks[j]||toks[j].t!=='op'||toks[j].v!=='(') return; var n=map(t.v); if(n!=null&&n!==t.s){ t.s=n; ch=true; } });
  return ch?rebuild(toks):f; }
function toXl(f){ return fnNames(f,function(u){ return XLFN[u]||null; }); }
function fromXl(f){ return fnNames(String(f),function(u){ return /^_XL(FN|WS)\./.test(u)?u.replace(/^(_XLFN\.)?(_XLWS\.)?/,''):null; }); } // the file reader may have dropped _xlfn. already

/* ---------- display ---------- */
function formatValue(v,nf){
  if(v==null) return '';
  if(isErr(v)) return v.e;
  if(v===true) return 'TRUE'; if(v===false) return 'FALSE';
  if(typeof v==='number'){
    var nm=/^([npd])(\d)$/.exec(nf||'');
    if(nm){ var dc=+nm[2], o={minimumFractionDigits:dc,maximumFractionDigits:dc}; if(nm[1]==='d') o.useGrouping=false;
      return nm[1]==='p'?(v*100).toLocaleString('en-US',o)+'%':v.toLocaleString('en-US',o); }
    if(nf==='w0') return (v<0?'-':'')+'₩'+Math.abs(v).toLocaleString('en-US',{maximumFractionDigits:0});
    if(nf==='u2') return (v<0?'-':'')+'$'+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
    return fmtGeneral(v);
  }
  return String(v);
}
var ERRH={'#DIV/0!':'0으로 나눌 수 없어요. 나누는 칸이 0이거나 비어 있는지 확인하세요','#REF!':'없어진 칸이나 시트를 가리키고 있어요. 지운 행·열이 있는지 확인하세요','#NAME?':'함수 이름이나 이름표를 알 수 없어요. 철자를 확인하세요','#VALUE!':'숫자가 아닌 글자로 계산하려고 해요. 계산에 쓰는 칸을 확인하세요','#N/A':'찾는 값이 표에 없어요','#NUM!':'계산할 수 없는 숫자예요. 범위나 순서 값을 확인하세요','#ERROR!':'수식 모양이 맞지 않아요. 괄호와 쉼표를 확인하세요','#AI!':'AI 함수를 쓸 수 없어요. AI 설정을 확인하세요','#SPILL!':'결과가 넘쳐 채워질 칸에 이미 값이 있어요. 아래·오른쪽 칸을 비우세요','#CALC!':'결과가 비었어요. 조건에 맞는 값이 없는지 확인하세요'};
function errHint(v){ return isErr(v)?(ERRH[v.e]||''):''; }

/* =AI("instruction", cells…): the answer comes from the page's AI hook (api.aiHook), which caches
   results by prompt so a recalculation never asks twice. Without a hook it is #AI!. */
def('AI',function(a){
  if(!a.length) fail('#VALUE!');
  var self=this, prompt=toStr(this.scal(a[0])), parts=[];
  a.slice(1).forEach(function(x){
    if(x instanceof Rng){ var rows=[]; for(var r=x.r1;r<=x.r2&&r<=x.r1+200;r++){ var row=[]; for(var c=x.c1;c<=x.c2&&c<=x.c1+30;c++){ var v=self.value(x.si,r,c); if(isErr(v)) throw v; row.push(v==null?'':toStr(v)); } rows.push(row.join('\t')); } parts.push(rows.join('\n')); }
    else parts.push(toStr(self.scal(x)));
  });
  if(!api.aiHook) fail('#AI!');
  if(!prompt.trim()) return '';
  var out=api.aiHook(prompt,parts);
  if(isErr(out)) throw out;
  return typeof out==='string'?literal(out):out;
});

/* v20: more functions. math and trigonometry, statistics, distributions, text, dates, finance, lookup, arrays */
function m1(name,f){ def(name,function(a){ var r=f(toNum(this.scal(a[0]))); if(typeof r!=='number'||!isFinite(r)) fail('#NUM!'); return +r.toPrecision(15); }); }
m1('SIN',Math.sin); m1('COS',Math.cos); m1('TAN',Math.tan); m1('ASIN',Math.asin); m1('ACOS',Math.acos); m1('ATAN',Math.atan); m1('SINH',Math.sinh); m1('COSH',Math.cosh); m1('TANH',Math.tanh);
m1('DEGREES',function(x){ return x*180/Math.PI; }); m1('RADIANS',function(x){ return x*Math.PI/180; });
def('ATAN2',function(a){ return Math.atan2(toNum(this.scal(a[1])),toNum(this.scal(a[0]))); });
function fact(n){ n=Math.floor(n); if(n<0||n>170) fail('#NUM!'); var r=1; for(var i=2;i<=n;i++) r*=i; return r; }
def('FACT',function(a){ return fact(toNum(this.scal(a[0]))); });
def('COMBIN',function(a){ var n=Math.floor(toNum(this.scal(a[0]))), k=Math.floor(toNum(this.scal(a[1]))); if(n<0||k<0||k>n) fail('#NUM!'); k=Math.min(k,n-k); var r=1; for(var i=1;i<=k;i++) r=r*(n-k+i)/i; return Math.round(r); });
def('PERMUT',function(a){ var n=Math.floor(toNum(this.scal(a[0]))), k=Math.floor(toNum(this.scal(a[1]))); if(n<0||k<0||k>n) fail('#NUM!'); var r=1; for(var i=0;i<k;i++) r*=n-i; return r; });
function gcd2(x,y){ x=Math.abs(x); y=Math.abs(y); while(y){ var t=x%y; x=y; y=t; } return x; }
def('GCD',function(a){ var n=this.nums(a).map(Math.floor); if(n.some(function(x){ return x<0; })) fail('#NUM!'); return n.reduce(gcd2,0); });
def('LCM',function(a){ var n=this.nums(a).map(Math.floor); if(n.some(function(x){ return x<0; })) fail('#NUM!'); return n.reduce(function(l,x){ return l&&x?l/gcd2(l,x)*x:0; },1); });
def('EVEN',function(a){ var x=toNum(this.scal(a[0])), r=2*Math.ceil(Math.abs(x)/2); return x<0?-r:r; });
def('ODD',function(a){ var x=toNum(this.scal(a[0])), r=2*Math.ceil((Math.abs(x)-1)/2)+1; return x<0?-r:r; });
def('QUOTIENT',function(a){ var d=toNum(this.scal(a[1])); if(d===0) fail('#DIV/0!'); return Math.trunc(toNum(this.scal(a[0]))/d); });
def('CEILING.MATH',function(a){ var x=toNum(this.scal(a[0])), s=Math.abs(opt(this,a[1],1)); if(s===0) return 0; return +(Math.ceil(+(x/s).toPrecision(15))*s).toPrecision(15); });
def('FLOOR.MATH',function(a){ var x=toNum(this.scal(a[0])), s=Math.abs(opt(this,a[1],1)); if(s===0) return 0; return +(Math.floor(+(x/s).toPrecision(15))*s).toPrecision(15); });
var SUBT={1:'AVERAGE',2:'COUNT',3:'COUNTA',4:'MAX',5:'MIN',6:'PRODUCT',7:'STDEV',8:'STDEVP',9:'SUM',10:'VAR',11:'VARP'};
def('SUBTOTAL',function(a){ var k=Math.floor(toNum(this.scal(a[0]))), n=SUBT[k>100?k-100:k]; if(!n) fail('#VALUE!'); return FN[n].call(this,a.slice(1)); });
def('VARP VAR.P',function(a){ return variance(this.nums(a),false); });
def('GEOMEAN',function(a){ var n=this.nums(a); if(!n.length||n.some(function(x){ return x<=0; })) fail('#NUM!'); return Math.exp(n.reduce(function(s,x){ return s+Math.log(x); },0)/n.length); });
def('HARMEAN',function(a){ var n=this.nums(a); if(!n.length||n.some(function(x){ return x<=0; })) fail('#NUM!'); return n.length/n.reduce(function(s,x){ return s+1/x; },0); });
def('AVEDEV',function(a){ var n=this.nums(a); if(!n.length) fail('#NUM!'); var m=mean(n); return mean(n.map(function(x){ return Math.abs(x-m); })); });
def('DEVSQ',function(a){ var n=this.nums(a); if(!n.length) fail('#NUM!'); var m=mean(n); return n.reduce(function(s,x){ return s+(x-m)*(x-m); },0); });
def('MODE.SNGL',function(a){ return FN.MODE.call(this,a); });
def('PERCENTILE.INC',function(a){ return pct(this.nums([a[0]]),toNum(this.scal(a[1]))); });
def('QUARTILE.INC',function(a){ return FN.QUARTILE.call(this,a); });
def('RANK.AVG',function(a){ var x=toNum(this.scal(a[0])), n=this.nums([a[1]]), asc=a[2]!=null&&toNum(this.scal(a[2]))!==0; if(n.indexOf(x)<0) fail('#N/A');
  var lo=n.filter(function(y){ return asc?y<x:y>x; }).length, eq=n.filter(function(y){ return y===x; }).length; return lo+(eq+1)/2; });
def('PERCENTRANK PERCENTRANK.INC',function(a){ var n=this.nums([a[0]]).sort(function(p,q){ return p-q; }), x=toNum(this.scal(a[1])), sig=a[2]!=null?Math.floor(toNum(this.scal(a[2]))):3; if(!n.length||x<n[0]||x>n[n.length-1]) fail('#N/A'); if(n.length===1) return 1;
  var i=0; while(i<n.length-1&&n[i+1]<=x) i++; var r=n[i]===x?i/(n.length-1):(i+(x-n[i])/(n[i+1]-n[i]))/(n.length-1), f=Math.pow(10,sig); return Math.floor(+(r*f).toPrecision(15))/f; });
def('RSQ',function(a){ var s=sxy(pairs(this,a)); if(!s[1]||!s[2]) fail('#DIV/0!'); return s[0]*s[0]/(s[1]*s[2]); });
def('FORECAST FORECAST.LINEAR',function(a){ var x=toNum(this.scal(a[0])), p=pairs(this,[a[2],a[1]]), s=sxy(p); if(!s[1]) fail('#DIV/0!'); var b=s[0]/s[1]; return mean(p[1])+b*(x-mean(p[0])); });
def('COVARIANCE.P',function(a){ var p=pairs(this,a), s=sxy(p); return s[0]/p[0].length; });
def('COVARIANCE.S',function(a){ var p=pairs(this,a), s=sxy(p); return s[0]/(p[0].length-1); });
def('STANDARDIZE',function(a){ var sd=toNum(this.scal(a[2])); if(sd<=0) fail('#NUM!'); return (toNum(this.scal(a[0]))-toNum(this.scal(a[1])))/sd; });
def('TRIMMEAN',function(a){ var n=this.nums([a[0]]).sort(function(x,y){ return x-y; }), p=toNum(this.scal(a[1])); if(p<0||p>=1||!n.length) fail('#NUM!'); var k=Math.floor(n.length*p/2); return mean(n.slice(k,n.length-k)); });
function erfc(x){ var z=Math.abs(x), r; if(z<3){ var s=z, t=z, n=0; do{ n++; t*=-z*z/n; s+=t/(2*n+1); }while(Math.abs(t)>1e-17&&n<200); r=1-2/Math.sqrt(Math.PI)*s; }
  else { var f=0; for(var k=60;k>=1;k--) f=k/2/(z+f); r=Math.exp(-z*z)/Math.sqrt(Math.PI)/(z+f); } return x<0?2-r:r; }
function ncdf(z){ return 0.5*erfc(-z/Math.SQRT2); }
function ninv(p){ if(p<=0||p>=1) fail('#NUM!'); var a=[-3.969683028665376e+01,2.209460984245205e+02,-2.759285104469687e+02,1.383577518672690e+02,-3.066479806614716e+01,2.506628277459239e+00], b=[-5.447609879822406e+01,1.615858368580409e+02,-1.556989798598866e+02,6.680131188771972e+01,-1.328068155288572e+01],
    c=[-7.784894002430293e-03,-3.223964580411365e-01,-2.400758277161838e+00,-2.549732539343734e+00,4.374664141464968e+00,2.938163982698783e+00], d=[7.784695709041462e-03,3.224671290700398e-01,2.445134137142996e+00,3.754408661907416e+00], x, q, r;
  if(p<0.02425){ q=Math.sqrt(-2*Math.log(p)); x=(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  else if(p>1-0.02425){ q=Math.sqrt(-2*Math.log(1-p)); x=-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  else { q=p-0.5; r=q*q; x=(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1); }
  var e=ncdf(x)-p, u=e*Math.sqrt(2*Math.PI)*Math.exp(x*x/2); return x-u/(1+x*u/2); }
def('NORM.S.DIST',function(a){ var z=toNum(this.scal(a[0])); return a[1]==null||toBool(this.scal(a[1]))?ncdf(z):Math.exp(-z*z/2)/Math.sqrt(2*Math.PI); });
def('NORM.DIST',function(a){ var x=toNum(this.scal(a[0])), m=toNum(this.scal(a[1])), sd=toNum(this.scal(a[2])); if(sd<=0) fail('#NUM!'); var z=(x-m)/sd; return toBool(this.scal(a[3]))?ncdf(z):Math.exp(-z*z/2)/Math.sqrt(2*Math.PI)/sd; });
def('NORM.S.INV',function(a){ return ninv(toNum(this.scal(a[0]))); });
def('NORM.INV',function(a){ var sd=toNum(this.scal(a[2])); if(sd<=0) fail('#NUM!'); return toNum(this.scal(a[1]))+sd*ninv(toNum(this.scal(a[0]))); });
function lgam(x){ var g=[76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5], y=x, t=x+5.5, s=1.000000000190015; t-=(x+0.5)*Math.log(t); for(var i=0;i<6;i++) s+=g[i]/++y; return -t+Math.log(2.5066282746310005*s/x); }
def('BINOM.DIST',function(a){ var k=Math.floor(toNum(this.scal(a[0]))), n=Math.floor(toNum(this.scal(a[1]))), p=toNum(this.scal(a[2])), cum=toBool(this.scal(a[3])); if(k<0||k>n||p<0||p>1) fail('#NUM!');
  var pm=function(j){ if(p===0) return j===0?1:0; if(p===1) return j===n?1:0; return Math.exp(lgam(n+1)-lgam(j+1)-lgam(n-j+1)+j*Math.log(p)+(n-j)*Math.log(1-p)); };
  if(!cum) return pm(k); var s=0; for(var j=0;j<=k;j++) s+=pm(j); return Math.min(1,s); });
def('POISSON.DIST',function(a){ var k=Math.floor(toNum(this.scal(a[0]))), m=toNum(this.scal(a[1])), cum=toBool(this.scal(a[2])); if(k<0||m<0) fail('#NUM!');
  var pm=function(j){ return m===0?(j===0?1:0):Math.exp(-m+j*Math.log(m)-lgam(j+1)); }; if(!cum) return pm(k); var s=0; for(var j=0;j<=k;j++) s+=pm(j); return Math.min(1,s); });
/* logic and info */
def('SWITCH',function(a,si){ var x=this.scal(this.ev(a[0],si)); for(var i=1;i+1<a.length;i+=2){ var v=this.scal(this.ev(a[i],si)); if(cmpVals(x,v)===0&&(x==null)===(v==null)) return this.scal(this.ev(a[i+1],si)); } if(a.length%2===0) return this.scal(this.ev(a[a.length-1],si)); fail('#N/A'); },true);
def('ISNA',function(a,si){ try{ this.scal(this.ev(a[0],si)); return false; }catch(e){ return isErr(e)&&e.e==='#N/A'; } },true);
def('ISERR',function(a,si){ try{ this.scal(this.ev(a[0],si)); return false; }catch(e){ return isErr(e)&&e.e!=='#N/A'; } },true);
def('ISLOGICAL',function(a){ try{ return typeof this.scal(a[0])==='boolean'; }catch(e){ return false; } });
def('ISNONTEXT',function(a){ try{ return typeof this.scal(a[0])!=='string'; }catch(e){ return true; } });
def('NA',function(){ fail('#N/A'); });
def('N',function(a){ var v=this.scal(a[0]); return typeof v==='number'?v:v===true?1:0; });
def('T',function(a){ var v=this.scal(a[0]); return typeof v==='string'?v:''; });
/* text */
def('CODE UNICODE',function(a){ var s=toStr(this.scal(a[0])); if(!s) fail('#VALUE!'); return s.codePointAt(0); });
def('UNICHAR',function(a){ var n=toNum(this.scal(a[0])); if(n<1||n>1114111) fail('#VALUE!'); return String.fromCodePoint(n); });
def('CLEAN',function(a){ return toStr(this.scal(a[0])).replace(/[\u0000-\u001f]/g,''); });
function tsplit(self,a,after){ var s=toStr(self.scal(a[0])), d=toStr(self.scal(a[1])), n=a[2]!=null?Math.floor(toNum(self.scal(a[2]))):1; if(!d||n===0) fail('#VALUE!');
  var ix=[], i=-1; while((i=s.indexOf(d,i+1))>=0) ix.push(i); var p=n>0?ix[n-1]:ix[ix.length+n]; if(p==null){ if(a[5]!=null) return self.scal(a[5]); fail('#N/A'); } return after?s.slice(p+d.length):s.slice(0,p); }
def('TEXTBEFORE',function(a){ return tsplit(this,a,false); });
def('TEXTAFTER',function(a){ return tsplit(this,a,true); });
def('NUMBERVALUE',function(a){ var s=toStr(this.scal(a[0])), dec=a[1]!=null?toStr(this.scal(a[1])):'.', grp=a[2]!=null?toStr(this.scal(a[2])):(dec===','?'.':','); s=s.replace(/\s/g,''); if(grp) s=s.split(grp).join(''); if(dec&&dec!=='.') s=s.split(dec).join('.'); var pc=/%+$/.exec(s); if(pc) s=s.slice(0,-pc[0].length); var n=Number(s); if(s===''||isNaN(n)) fail('#VALUE!'); return pc?n/Math.pow(100,pc[0].length):n; });
def('FIXED',function(a){ var n=toNum(this.scal(a[0])), d=a[1]!=null?Math.floor(toNum(this.scal(a[1]))):2, nc=a[2]!=null&&toBool(this.scal(a[2])); n=round(n,d); var o={minimumFractionDigits:Math.max(0,d),maximumFractionDigits:Math.max(0,d),useGrouping:!nc}; return n.toLocaleString('en-US',o); });
def('TEXTSPLIT',function(a){ var s=toStr(this.scal(a[0])), cd=toStr(this.scal(a[1])), rd=a[2]!=null?toStr(this.scal(a[2])):'';
  var rows=rd?s.split(rd):[s], out=rows.map(function(r){ return cd?r.split(cd).map(literal):[literal(r)]; }), w=Math.max.apply(null,out.map(function(r){ return r.length; }));
  out.forEach(function(r){ while(r.length<w) r.push(new Err('#N/A')); }); return new Arr(out); });
/* dates: stay "YYYY-MM-DD" text like the rest */
def('DATEVALUE',function(a){ var d=asDate(toStr(this.scal(a[0]))); if(!d) fail('#VALUE!'); return dateStr(d); });
def('EOMONTH',function(a){ var d=dateArg(this,a[0]), n=toNum(this.scal(a[1])); return dateStr(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+n+1,0))); });
function holidays(self,x){ var o={}; if(x!=null) self.cells(x).forEach(function(v){ var d=typeof v==='number'?new Date(Date.UTC(1899,11,30)+v*864e5):asDate(v); if(d) o[dateStr(d)]=1; }); return o; }
function isWork(d,h){ var w=d.getUTCDay(); return w!==0&&w!==6&&!h[dateStr(d)]; }
def('WORKDAY',function(a){ var d=new Date(dateArg(this,a[0])), n=Math.floor(toNum(this.scal(a[1]))), h=holidays(this,a[2]), st=n<0?-1:1; while(n!==0){ d=new Date(d.getTime()+st*864e5); if(isWork(d,h)) n-=st; } return dateStr(d); });
def('NETWORKDAYS',function(a){ var s=dateArg(this,a[0]), e=dateArg(this,a[1]), h=holidays(this,a[2]), sg=1, c=0; if(e<s){ var t=s; s=e; e=t; sg=-1; } for(var d=new Date(s);d<=e;d=new Date(d.getTime()+864e5)) if(isWork(d,h)) c++; return sg*c; });
function weekNum(d,start){ var y=d.getUTCFullYear(), j1=new Date(Date.UTC(y,0,1)), off=(j1.getUTCDay()-(start%7)+7)%7, doy=Math.round((d-j1)/864e5); return Math.floor((doy+off)/7)+1; }
def('WEEKNUM',function(a){ var t=a[1]!=null?toNum(this.scal(a[1])):1; return weekNum(dateArg(this,a[0]),t===2||t===11?1:t===12?2:t===13?3:t===14?4:t===15?5:t===16?6:t===17?0:0); });
def('ISOWEEKNUM',function(a){ var d=new Date(dateArg(this,a[0])), w=(d.getUTCDay()+6)%7; d.setUTCDate(d.getUTCDate()-w+3); var j=new Date(Date.UTC(d.getUTCFullYear(),0,4)); return 1+Math.round(((d-j)/864e5-3+(j.getUTCDay()+6)%7)/7); });
/* finance */
function fin(self,a,i,d){ return a[i]!=null?toNum(self.scal(a[i])):d; }
def('PMT',function(a){ var r=fin(this,a,0), n=fin(this,a,1), pv=fin(this,a,2), fv=fin(this,a,3,0), t=fin(this,a,4,0)?1:0; if(n===0) fail('#NUM!'); if(r===0) return -(pv+fv)/n; var g=Math.pow(1+r,n); return -(r*(fv+pv*g))/((1+r*t)*(g-1)); });
def('FV',function(a){ var r=fin(this,a,0), n=fin(this,a,1), p=fin(this,a,2), pv=fin(this,a,3,0), t=fin(this,a,4,0)?1:0; if(r===0) return -(pv+p*n); var g=Math.pow(1+r,n); return -(pv*g+p*(1+r*t)*(g-1)/r); });
def('PV',function(a){ var r=fin(this,a,0), n=fin(this,a,1), p=fin(this,a,2), fv=fin(this,a,3,0), t=fin(this,a,4,0)?1:0; if(r===0) return -(fv+p*n); var g=Math.pow(1+r,n); return -(fv+p*(1+r*t)*(g-1)/r)/g; });
def('NPER',function(a){ var r=fin(this,a,0), p=fin(this,a,1), pv=fin(this,a,2), fv=fin(this,a,3,0), t=fin(this,a,4,0)?1:0; if(r===0){ if(p===0) fail('#NUM!'); return -(pv+fv)/p; } var x=(p*(1+r*t)-fv*r)/(p*(1+r*t)+pv*r); if(x<=0) fail('#NUM!'); return Math.log(x)/Math.log(1+r); });
def('NPV',function(a){ var r=toNum(this.scal(a[0])), n=this.nums(a.slice(1)); if(r===-1) fail('#DIV/0!'); return n.reduce(function(s,x,i){ return s+x/Math.pow(1+r,i+1); },0); });
def('IRR',function(a){ var n=this.nums([a[0]]), g=fin(this,a,1,0.1); if(!n.some(function(x){ return x>0; })||!n.some(function(x){ return x<0; })) fail('#NUM!');
  for(var it=0;it<100;it++){ var f=0, d=0; n.forEach(function(x,i){ f+=x/Math.pow(1+g,i); d-=i*x/Math.pow(1+g,i+1); }); if(!d) break; var ng=g-f/d; if(!isFinite(ng)) break; if(Math.abs(ng-g)<1e-12) return ng; g=ng; } fail('#NUM!'); });
def('SLN',function(a){ var l=toNum(this.scal(a[2])); if(l===0) fail('#DIV/0!'); return (toNum(this.scal(a[0]))-toNum(this.scal(a[1])))/l; });
/* lookup and arrays */
def('LOOKUP',function(a){ var x=this.scal(a[0]), l=this.cells(a[1]), r=a[2]!=null?this.cells(a[2]):l, i=matchIn(this,x,l,1); if(i<0||i>=r.length) fail('#N/A'); var v=r[i]; return v==null?0:v; });
def('TRANSPOSE',function(a){ return new Arr(transpose(grid(this,a[0]))); });
function stack(self,a,h){ var gs=a.map(function(x){ return grid(self,x); }), out=[], n;
  if(h){ n=Math.max.apply(null,gs.map(function(g){ return g.length; })); for(var i=0;i<n;i++){ var row=[]; gs.forEach(function(g){ for(var j=0;j<g[0].length;j++) row.push(i<g.length?g[i][j]:new Err('#N/A')); }); out.push(row); } }
  else { n=Math.max.apply(null,gs.map(function(g){ return g[0].length; })); gs.forEach(function(g){ g.forEach(function(r){ var row=r.slice(); while(row.length<n) row.push(new Err('#N/A')); out.push(row); }); }); }
  if(out.length*out[0].length>MAXSPILL) fail('#NUM!'); return new Arr(out); }
def('VSTACK',function(a){ return stack(this,a,false); });
def('HSTACK',function(a){ return stack(this,a,true); });

var api={K:K,RC:RC,KC:KC,colName:colName,colIdx:colIdx,addr:addr,parseAddr:parseAddr,parseRange:parseRange,rangeStr:rangeStr,
  tokenize:tokenize,rebuild:rebuild,parse:parse,literal:literal,shiftFormula:shiftFormula,adjustFormula:adjustFormula,renameSheetInFormula:renameSheetInFormula,
  Engine:Engine,Err:Err,errHint:errHint,isErr:isErr,formatValue:formatValue,fmtGeneral:fmtGeneral,cmpVals:cmpVals,pivot:pivot,lockHit:lockHit,lockAny:lockAny,lockCut:lockCut,renameNameInFormula:renameNameInFormula,iconFor:iconFor,sparkSvg:sparkSvg,ICOL:ICOL,Arr:Arr,toXl:toXl,fromXl:fromXl,trimText:trimText,splitText:splitText,dedupeRows:dedupeRows,parseNameRef:parseNameRef,nameRef:nameRef,validName:validName,refText:refText,asDate:asDate,dateStr:dateStr,FN:FN,quoteSheet:quoteSheet};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.FSE=api;
})(this);
