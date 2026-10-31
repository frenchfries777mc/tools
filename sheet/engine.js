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
/* functions that look at a cell itself (not its value) get a one-cell range for a plain reference like B5 */
var REFARG={ROW:1,COLUMN:1,OFFSET:1,FORMULATEXT:1,ISFORMULA:1,ISREF:1,CELL:1,SHEET:1,AREAS:1};
Engine.prototype.cell1=function(x,si){ var s=this.sheetIndex(x.sh,si); if(s<0) fail('#REF!'); return new Rng(s,x.r,x.c,x.r,x.c); };
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
    case 'name': { if(this.scope&&n.n in this.scope) return this.scope[n.n]; var nd=this.nameDef(n.n); if(!nd) fail('#NAME?'); var pr=parseNameRef(nd.ref); if(!pr) fail('#REF!');
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
      var args=n.args.map(function(x){ return x.k==='ref'&&REFARG[n.n]?self.cell1(x,si):self.ev(x,si); });
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
def('HYPERLINK',function(a){ var u=this.scal(a[0]); if(a.length>1){ var l=this.scal(a[1]); if(l!=null&&l!=='') return l; } return u; });
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
function fromXl(f){ return fnNames(String(f).replace(/_xlpm\./g,''),function(u){ return /^_XL(FN|WS)\./.test(u)?u.replace(/^(_XLFN\.)?(_XLWS\.)?/,''):null; }); } // the file reader may have dropped _xlfn. already

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

/* v23: CONVERT(number, "from", "to"), with Excel's unit names (case matters, SI prefixes like "cm", "km", "mg", "ml";
   binary prefixes "ki" "Mi" "Gi" "Ti" for bit and byte) plus a few extras: "t" (tonne), "wk" and the Korean units
   평 (area), 근, 돈, 냥, 관 (weight). Units of different kinds, or unknown units, give #N/A. */
var UNIT={ // code: [kind, size in the kind's base unit, prefixes: 1 SI, 2 SI squared, 3 SI cubed, 4 SI or binary]
  m:['len',1,1], 'in':['len',0.0254], ft:['len',0.3048], yd:['len',0.9144], mi:['len',1609.344], Nmi:['len',1852], ang:['len',1e-10,1], ell:['len',1.143],
  g:['mass',1,1], lbm:['mass',453.59237], ozm:['mass',28.349523125], stone:['mass',6350.29318], ton:['mass',907184.74], uk_ton:['mass',1016046.9088], t:['mass',1e6],
  '근':['mass',600], '돈':['mass',3.75], '냥':['mass',37.5], '관':['mass',3750],
  C:['tmp'], cel:['tmp'], F:['tmp'], fah:['tmp'], K:['tmp',1,1], kel:['tmp'],
  l:['vol',1,1], L:['vol',1,1], lt:['vol',1,1], m3:['vol',1000,3], gal:['vol',3.785411784], qt:['vol',0.946352946], pt:['vol',0.473176473], us_pt:['vol',0.473176473],
  uk_pt:['vol',0.56826125], uk_qt:['vol',1.1365225], uk_gal:['vol',4.54609], cup:['vol',0.2365882365], oz:['vol',0.0295735295625], tbs:['vol',0.01478676478125],
  tsp:['vol',0.00492892159375], ft3:['vol',28.316846592], in3:['vol',0.016387064],
  m2:['area',1,2], ha:['area',1e4], ft2:['area',0.09290304], in2:['area',0.00064516], yd2:['area',0.83612736], mi2:['area',2589988.110336],
  uk_acre:['area',4046.8564224], us_acre:['area',4046.8726098743], '평':['area',400/121],
  'm/s':['spd',1,1], 'm/sec':['spd',1,1], 'm/h':['spd',1/3600,1], 'm/hr':['spd',1/3600,1], mph:['spd',0.44704], kn:['spd',1852/3600], admkn:['spd',1853.184/3600],
  sec:['time',1], s:['time',1,1], mn:['time',60], min:['time',60], hr:['time',3600], day:['time',86400], d:['time',86400], wk:['time',604800], yr:['time',31557600],
  bit:['data',1,4], byte:['data',8,4]
};
var UPRE=[['da',10],['Y',1e24],['Z',1e21],['E',1e18],['P',1e15],['T',1e12],['G',1e9],['M',1e6],['k',1e3],['h',100],['d',0.1],['c',0.01],['m',1e-3],['u',1e-6],['n',1e-9],['p',1e-12],['f',1e-15]],
    BPRE=[['ki',1024],['Mi',1048576],['Gi',1073741824],['Ti',1099511627776],['Pi',1125899906842624]];
/* {k: kind, f: size, t: temperature code} for a unit name, or null */
function unitOf(code){
  code=String(code==null?'':code); var u=UNIT[code];
  if(u) return {k:u[0], f:u[1]||1, t:u[0]==='tmp'?code.charAt(0).toUpperCase():null};
  var tryPre=function(list,bin){ for(var i=0;i<list.length;i++){ var p=list[i][0]; if(code.length>p.length&&code.indexOf(p)===0){ var b=UNIT[code.slice(p.length)];
    if(b&&b[2]&&(bin?b[2]===4:true)){ return {k:b[0], f:(b[1]||1)*Math.pow(list[i][1],b[2]===2?2:b[2]===3?3:1), t:b[0]==='tmp'?'K':null}; } } } return null; };
  return tryPre(BPRE,true)||tryPre(UPRE,false);
}
function convertUnit(v,from,to){
  var a=unitOf(from), b=unitOf(to); if(!a||!b||a.k!==b.k) return null;
  var r;
  if(a.k==='tmp'){ var k=a.t==='C'?v+273.15:a.t==='F'?(v-32)*5/9+273.15:v*a.f; r=b.t==='C'?k-273.15:b.t==='F'?(k-273.15)*9/5+32:k/b.f; }
  else r=v*a.f/b.f;
  return isFinite(r)?+r.toPrecision(14):null;
}
def('CONVERT',function(a){ if(a.length<3) fail('#N/A'); var v=toNum(this.scal(a[0])), r=convertUnit(v,this.scal(a[1]),this.scal(a[2])); if(r==null) fail('#N/A'); return r; });
/* v41: more functions. time, INDIRECT/OFFSET, LET and LAMBDA helpers, array shaping, matrices, finance, engineering, statistics */
function ofDay(v){ // time of day as a fraction of a day: a number (its fraction) or text like "13:45" / "2026-10-31 13:45:30"
  if(typeof v==='number') return v-Math.floor(v);
  var m=/(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(typeof v==='string'?v:''); if(!m||+m[1]>23||+m[2]>59||+(m[3]||0)>59) fail('#VALUE!');
  return (+m[1]*3600+ +m[2]*60+ +(m[3]||0))/86400;
}
def('TIME',function(a){ var s=Math.floor(toNum(this.scal(a[0])))*3600+Math.floor(toNum(this.scal(a[1])))*60+Math.floor(toNum(this.scal(a[2]))); if(s<0) fail('#NUM!'); return +((s%86400)/86400).toPrecision(15); });
def('TIMEVALUE',function(a){ return +ofDay(toStr(this.scal(a[0]))).toPrecision(15); });
function secOf(self,x){ var v=self.scal(x); return Math.round(ofDay(typeof v==='boolean'?fail('#VALUE!'):v)*86400)%86400; }
def('HOUR',function(a){ return Math.floor(secOf(this,a[0])/3600); });
def('MINUTE',function(a){ return Math.floor(secOf(this,a[0])/60)%60; });
def('SECOND',function(a){ return secOf(this,a[0])%60; });
function days360(s,e,eu){
  var d1=s.getUTCDate(), d2=e.getUTCDate(), m1=s.getUTCMonth()+1, m2=e.getUTCMonth()+1, y1=s.getUTCFullYear(), y2=e.getUTCFullYear();
  var last=function(d){ return d.getUTCMonth()===1&&d.getUTCDate()===new Date(Date.UTC(d.getUTCFullYear(),2,0)).getUTCDate(); };
  if(eu){ if(d1===31) d1=30; if(d2===31) d2=30; }
  else { if(last(s)&&last(e)) d2=30; if(last(s)) d1=30; if(d2===31&&d1>=30) d2=30; if(d1===31) d1=30; }
  return (y2-y1)*360+(m2-m1)*30+(d2-d1);
}
def('DAYS360',function(a){ var s=dateArg(this,a[0]), e=dateArg(this,a[1]); return days360(s,e,a[2]!=null&&toBool(this.scal(a[2]))); });
def('YEARFRAC',function(a){ var s=dateArg(this,a[0]), e=dateArg(this,a[1]), b=opt(this,a[2],0); if(e<s){ var t=s; s=e; e=t; }
  var days=Math.round((e-s)/864e5); if(b===0) return days360(s,e,false)/360; if(b===4) return days360(s,e,true)/360; if(b===2) return days/360; if(b===3) return days/365;
  if(b!==1) fail('#NUM!'); var y1=s.getUTCFullYear(), y2=e.getUTCFullYear(), leap=function(y){ return y%4===0&&(y%100!==0||y%400===0); };
  if(y1===y2) return days/(leap(y1)?366:365); var tot=0; for(var y=y1;y<=y2;y++) tot+=leap(y)?366:365; return days/(tot/(y2-y1+1)); });
/* weekend: 1-7 / 11-17 or a 7-character "0000011" string (Monday first) -> rest[getUTCDay()] */
function restDays(self,x){
  var w=x==null?1:self.scal(x), rest=[0,0,0,0,0,0,0], P={1:[6,0],2:[0,1],3:[1,2],4:[2,3],5:[3,4],6:[4,5],7:[5,6]};
  if(typeof w==='string'&&w.length===7&&/^[01]+$/.test(w)){ for(var i=0;i<7;i++) rest[(i+1)%7]=+w[i]; return rest; }
  w=toNum(w); if(P[w]){ P[w].forEach(function(d){ rest[d]=1; }); return rest; }
  if(w>=11&&w<=17){ rest[w-11]=1; return rest; } fail('#NUM!');
}
function isWork2(d,h,rest){ return !rest[d.getUTCDay()]&&!h[dateStr(d)]; }
def('NETWORKDAYS.INTL',function(a){ var s=dateArg(this,a[0]), e=dateArg(this,a[1]), rest=restDays(this,a[2]), h=holidays(this,a[3]), sg=1, c=0; if(e<s){ var t=s; s=e; e=t; sg=-1; }
  for(var d=new Date(s);d<=e;d=new Date(d.getTime()+864e5)) if(isWork2(d,h,rest)) c++; return sg*c; });
def('WORKDAY.INTL',function(a){ var d=new Date(dateArg(this,a[0])), n=Math.floor(toNum(this.scal(a[1]))), rest=restDays(this,a[2]), h=holidays(this,a[3]), st=n<0?-1:1;
  if(rest.every(Boolean)) fail('#VALUE!'); while(n!==0){ d=new Date(d.getTime()+st*864e5); if(isWork2(d,h,rest)) n-=st; } return dateStr(d); });

/* references and information */
function refOf(self,text,si){
  var t=String(text).trim(), toks=tokenize(t).filter(function(x){ return x.t!=='ws'; }), s;
  if(toks.length===1&&(toks[0].t==='ref'||toks[0].t==='rng')&&!toks[0].dead){ var k=toks[0]; s=self.sheetIndex(k.sh,si); if(s<0) fail('#REF!');
    var b=k.b||k.a; return new Rng(s,Math.min(k.a.r,b.r),Math.min(k.a.c,b.c),Math.max(k.a.r,b.r),Math.max(k.a.c,b.c)); }
  var nd=toks.length===1&&toks[0].t==='id'?self.nameDef(toks[0].v):null, pr=nd&&parseNameRef(nd.ref);
  if(pr){ s=self.sheetIndex(pr.sh,si); if(s<0) fail('#REF!'); return new Rng(s,pr.a.r,pr.a.c,pr.b.r,pr.b.c); }
  fail('#REF!');
}
def('INDIRECT',function(a,si){ if(a[1]!=null&&!toBool(this.scal(a[1]))) fail('#REF!'); return refOf(this,toStr(this.scal(a[0])),si); });
def('OFFSET',function(a){ var g=asRng(a[0]), r=Math.floor(toNum(this.scal(a[1]))), c=Math.floor(toNum(this.scal(a[2]))), h=a[3]!=null?Math.floor(toNum(this.scal(a[3]))):g.r2-g.r1+1, w=a[4]!=null?Math.floor(toNum(this.scal(a[4]))):g.c2-g.c1+1;
  if(h<1||w<1||g.r1+r<0||g.c1+c<0) fail('#REF!'); return new Rng(g.si,g.r1+r,g.c1+c,g.r1+r+h-1,g.c1+c+w-1); });
def('ADDRESS',function(a,si){ var r=Math.floor(toNum(this.scal(a[0]))), c=Math.floor(toNum(this.scal(a[1]))), ab=opt(this,a[2],1), a1=a[3]==null||toBool(this.scal(a[3]));
  if(r<1||c<1||ab<1||ab>4) fail('#VALUE!'); var ra=ab===1||ab===2, ca=ab===1||ab===3, out;
  out=a1?(ca?'$':'')+colName(c-1)+(ra?'$':'')+r:'R'+(ra?r:'['+r+']')+'C'+(ca?c:'['+c+']');
  return a[4]!=null?quoteSheet(toStr(this.scal(a[4])))+'!'+out:out; });
def('FORMULATEXT',function(a){ var g=asRng(a[0]), x=this.doc.sheets[g.si].cells[K(g.r1,g.c1)]; if(!x||typeof x.v!=='string'||x.v[0]!=='='||x.nf==='t') fail('#N/A'); return x.v; });
def('ISFORMULA',function(a){ if(!(a[0] instanceof Rng)) return false; var g=a[0], x=this.doc.sheets[g.si].cells[K(g.r1,g.c1)]; return !!x&&typeof x.v==='string'&&x.v[0]==='='&&x.nf!=='t'; });
def('ISREF',function(a){ return a[0] instanceof Rng; });
def('TYPE',function(a){ if(isMulti(a[0])) return 64; var v=this.scal(a[0]); return typeof v==='number'?1:typeof v==='boolean'?4:v==null?1:2; });
def('SHEET',function(a,si){ return a[0] instanceof Rng?a[0].si+1:si+1; });
def('SHEETS',function(a){ return a[0] instanceof Rng?1:this.doc.sheets.length; });
def('AREAS',function(){ return 1; });
def('ERROR.TYPE',function(a,si){ var e; try{ this.scal(this.ev(a[0],si)); }catch(x){ e=x; } var i=['#NULL!','#DIV/0!','#VALUE!','#REF!','#NAME?','#NUM!','#N/A'].indexOf(isErr(e)?e.e:''); if(i<0) fail('#N/A'); return i+1; },true);
def('XMATCH',function(a){ var x=this.scal(a[0]), l=this.cells(a[1]), mm=opt(this,a[2],0), sm=opt(this,a[3],1), rev=sm<0, best=-1, i;
  var eq=function(v){ return mm===2&&typeof x==='string'?crit(x)(v):v!=null&&x!=null&&cmpVals(v,x)===0&&typeof v===typeof x; };
  for(var n=0;n<l.length;n++){ i=rev?l.length-1-n:n; var v=l[i]; if(isErr(v)) continue;
    if(eq(v)) return i+1;
    if(mm===1||mm===-1){ if(v==null||typeof v!==typeof x) continue; var c=cmpVals(v,x); if(mm===1&&c>0&&(best<0||cmpVals(v,l[best])<0)) best=i; if(mm===-1&&c<0&&(best<0||cmpVals(v,l[best])>0)) best=i; } }
  if(best<0) fail('#N/A'); return best+1; });
def('CELL',function(a){ var t=toStr(this.scal(a[0])).toLowerCase(), g=asRng(a[1]), v=this.value(g.si,g.r1,g.c1);
  switch(t){ case 'row': return g.r1+1; case 'col': return g.c1+1; case 'address': return '$'+colName(g.c1)+'$'+(g.r1+1); case 'contents': return v==null?'':v;
    case 'type': return v==null?'b':typeof v==='string'?'l':'v'; case 'filename': return ''; } fail('#VALUE!'); });
def('ARRAYTOTEXT',function(a){ var strict=opt(this,a[1],0)===1; return this.cells(a[0]).map(function(v){ return strict&&typeof v==='string'?'"'+v+'"':toStr(v); }).join(', '); });
def('VALUETOTEXT',function(a){ var v=this.scal(a[0]); return opt(this,a[1],0)===1&&typeof v==='string'?'"'+v+'"':toStr(v); });
def('ENCODEURL',function(a){ return encodeURIComponent(toStr(this.scal(a[0]))).replace(/[!'()*]/g,function(c){ return '%'+c.charCodeAt(0).toString(16).toUpperCase(); }); });

/* LET and LAMBDA: names live in this.scope while a body is evaluated (a chain, so inner names win) */
function inScope(self,vars,f){ var save=self.scope, sc=Object.create(save||null); for(var k in vars) sc[k]=vars[k]; self.scope=sc; try{ return f(); } finally{ self.scope=save; } }
def('LET',function(a,si){ if(a.length<3||a.length%2===0) fail('#VALUE!'); var save=this.scope, sc=Object.create(save||null); this.scope=sc;
  try{ for(var i=0;i<a.length-1;i+=2){ if(a[i].k!=='name') fail('#NAME?'); sc[a[i].n]=this.ev(a[i+1],si); } return this.ev(a[a.length-1],si); } finally{ this.scope=save; } },true);
function lam(self,node,si){ if(!node||node.k!=='fn'||node.n!=='LAMBDA'||node.args.length<1) fail('#VALUE!'); var ps=node.args.slice(0,-1).map(function(p){ if(p.k!=='name') fail('#VALUE!'); return p.n; }), body=node.args[node.args.length-1];
  return function(vals){ if(vals.length!==ps.length) fail('#VALUE!'); var vars={}; ps.forEach(function(p,i){ vars[p]=vals[i]; }); return inScope(self,vars,function(){ return self.ev(body,si); }); }; }
function one(self,v){ return self.scal(v); }
def('LAMBDA',function(){ fail('#CALC!'); },true);
def('MAP',function(a,si){ var self=this, f=lam(this,a[a.length-1],si), gs=a.slice(0,-1).map(function(x){ return grid(self,self.ev(x,si)); }); if(!gs.length) fail('#VALUE!');
  var h=gs[0].length, w=gs[0][0].length; gs.forEach(function(g){ if(g.length!==h||g[0].length!==w) fail('#VALUE!'); });
  return new Arr(gs[0].map(function(row,i){ return row.map(function(_,j){ return safe(function(){ return one(self,f(gs.map(function(g){ return g[i][j]; }))); }); }); })); },true);
def('REDUCE',function(a,si){ var self=this, f=lam(this,a[2],si), g=grid(this,this.ev(a[1],si)), acc=a[0].k==='v'&&a[0].v==null?undefined:this.scal(this.ev(a[0],si));
  g.forEach(function(row){ row.forEach(function(v){ acc=acc===undefined?v:one(self,f([acc,v])); }); }); if(acc===undefined) fail('#CALC!'); return acc; },true);
def('SCAN',function(a,si){ var self=this, f=lam(this,a[2],si), g=grid(this,this.ev(a[1],si)), accv=a[0].k==='v'&&a[0].v==null?undefined:this.scal(this.ev(a[0],si));
  return new Arr(g.map(function(row){ return row.map(function(v){ accv=accv===undefined?v:one(self,f([accv,v])); return accv; }); })); },true);
def('BYROW',function(a,si){ var self=this, f=lam(this,a[1],si), g=grid(this,this.ev(a[0],si)); return new Arr(g.map(function(row){ return [safe(function(){ return one(self,f([new Arr([row])])); })]; })); },true);
def('BYCOL',function(a,si){ var self=this, f=lam(this,a[1],si), g=transpose(grid(this,this.ev(a[0],si))); return new Arr([g.map(function(col){ return safe(function(){ return one(self,f([new Arr(col.map(function(v){ return [v]; }))])); }); })]); },true);
def('MAKEARRAY',function(a,si){ var self=this, r=Math.floor(toNum(this.scal(this.ev(a[0],si)))), c=Math.floor(toNum(this.scal(this.ev(a[1],si)))), f=lam(this,a[2],si);
  if(r<1||c<1||r*c>MAXSPILL) fail('#CALC!'); var out=[]; for(var i=1;i<=r;i++){ var row=[]; for(var j=1;j<=c;j++) row.push(safe(function(){ return one(self,f([i,j])); })); out.push(row); } return new Arr(out); },true);

/* array shaping */
function cut(n,len){ return n>=0?Math.min(n,len):Math.max(len+n,0); }
def('TAKE',function(a){ var g=grid(this,a[0]), r=a[1]!=null?Math.floor(toNum(this.scal(a[1]))):g.length, c=a[2]!=null?Math.floor(toNum(this.scal(a[2]))):g[0].length;
  var rs=r>=0?g.slice(0,r):g.slice(Math.max(g.length+r,0)); if(!rs.length||!c) fail('#CALC!'); return new Arr(rs.map(function(row){ return c>=0?row.slice(0,c):row.slice(Math.max(row.length+c,0)); })); });
def('DROP',function(a){ var g=grid(this,a[0]), r=a[1]!=null?Math.floor(toNum(this.scal(a[1]))):0, c=a[2]!=null?Math.floor(toNum(this.scal(a[2]))):0;
  var rs=r>=0?g.slice(r):g.slice(0,Math.max(g.length+r,0)); if(!rs.length) fail('#CALC!'); var out=rs.map(function(row){ return c>=0?row.slice(c):row.slice(0,Math.max(row.length+c,0)); }); if(!out[0].length) fail('#CALC!'); return new Arr(out); });
def('CHOOSEROWS',function(a){ var g=grid(this,a[0]), self=this, out=a.slice(1).map(function(x){ var i=Math.floor(toNum(self.scal(x))); if(!i||Math.abs(i)>g.length) fail('#VALUE!'); return g[i>0?i-1:g.length+i].slice(); }); if(!out.length) fail('#VALUE!'); return new Arr(out); });
def('CHOOSECOLS',function(a){ var g=transpose(grid(this,a[0])), self=this, out=a.slice(1).map(function(x){ var i=Math.floor(toNum(self.scal(x))); if(!i||Math.abs(i)>g.length) fail('#VALUE!'); return g[i>0?i-1:g.length+i]; }); if(!out.length) fail('#VALUE!'); return new Arr(transpose(out)); });
def('EXPAND',function(a){ var g=grid(this,a[0]), r=a[1]!=null?Math.floor(toNum(this.scal(a[1]))):g.length, c=a[2]!=null?Math.floor(toNum(this.scal(a[2]))):g[0].length, pad=a[3]!=null?this.scal(a[3]):new Err('#N/A');
  if(r<g.length||c<g[0].length||r*c>MAXSPILL) fail('#VALUE!'); var out=[]; for(var i=0;i<r;i++){ var row=[]; for(var j=0;j<c;j++) row.push(i<g.length&&j<g[0].length?g[i][j]:pad); out.push(row); } return new Arr(out); });
function flat(self,x,ig,byCol){ var g=grid(self,x); if(byCol) g=transpose(g); var out=[]; g.forEach(function(row){ row.forEach(function(v){ if((ig===1||ig===3)&&(v==null||v==='')) return; if((ig===2||ig===3)&&isErr(v)) return; out.push(v); }); }); if(!out.length) fail('#CALC!'); return out; }
def('TOCOL',function(a){ return new Arr(flat(this,a[0],opt(this,a[1],0),a[2]!=null&&toBool(this.scal(a[2]))).map(function(v){ return [v]; })); });
def('TOROW',function(a){ return new Arr([flat(this,a[0],opt(this,a[1],0),a[2]!=null&&toBool(this.scal(a[2])))]); });
function wrapv(self,a,byRow){ var v=flat(self,a[0],0,false), n=Math.floor(toNum(self.scal(a[1]))), pad=a[2]!=null?self.scal(a[2]):new Err('#N/A'); if(n<1) fail('#NUM!'); var out=[];
  for(var i=0;i<v.length;i+=n){ var row=v.slice(i,i+n); while(row.length<n) row.push(pad); out.push(row); } return new Arr(byRow?out:transpose(out)); }
def('WRAPROWS',function(a){ return wrapv(this,a,true); });
def('WRAPCOLS',function(a){ return wrapv(this,a,false); });
def('RANDARRAY',function(a){ var r=opt(this,a[0],1), c=opt(this,a[1],1), lo=opt(this,a[2],0), hi=opt(this,a[3],1), int=a[4]!=null&&toBool(this.scal(a[4])); if(r<1||c<1||lo>hi||r*c>MAXSPILL) fail('#VALUE!');
  var out=[]; for(var i=0;i<r;i++){ var row=[]; for(var j=0;j<c;j++) row.push(int?lo+Math.floor(Math.random()*(Math.floor(hi)-Math.ceil(lo)+1)):lo+Math.random()*(hi-lo)); out.push(row); } return new Arr(out); });
ARRFN.WRAPROWS=ARRFN.WRAPCOLS=ARRFN.TOCOL=ARRFN.TOROW=ARRFN.TAKE=ARRFN.DROP=ARRFN.CHOOSEROWS=ARRFN.CHOOSECOLS=ARRFN.EXPAND=ARRFN.RANDARRAY=ARRFN.MAP=ARRFN.SCAN=ARRFN.BYROW=ARRFN.BYCOL=ARRFN.MAKEARRAY=ARRFN.MMULT=ARRFN.MINVERSE=ARRFN.MUNIT=ARRFN.FREQUENCY=ARRFN.TREND=ARRFN.LINEST=1;
PASSFN.LET=1;

/* matrices */
function num2d(self,x){ var g=grid(self,x); return g.map(function(row){ return row.map(function(v){ if(isErr(v)) throw v; if(typeof v!=='number') fail('#VALUE!'); return v; }); }); }
def('MMULT',function(a){ var A=num2d(this,a[0]), B=num2d(this,a[1]); if(A[0].length!==B.length) fail('#VALUE!'); return new Arr(A.map(function(row){ return B[0].map(function(_,j){ return +row.reduce(function(s,x,k){ return s+x*B[k][j]; },0).toPrecision(15); }); })); });
function det(M){ var n=M.length, A=M.map(function(r){ return r.slice(); }), d=1; for(var i=0;i<n;i++){ var p=i; for(var r=i+1;r<n;r++) if(Math.abs(A[r][i])>Math.abs(A[p][i])) p=r; if(Math.abs(A[p][i])<1e-300) return 0; if(p!==i){ var t=A[p]; A[p]=A[i]; A[i]=t; d=-d; } d*=A[i][i]; for(r=i+1;r<n;r++){ var f=A[r][i]/A[i][i]; for(var c=i;c<n;c++) A[r][c]-=f*A[i][c]; } } return d; }
def('MDETERM',function(a){ var M=num2d(this,a[0]); if(M.length!==M[0].length) fail('#VALUE!'); return +det(M).toPrecision(14); });
def('MINVERSE',function(a){ var M=num2d(this,a[0]), n=M.length; if(n!==M[0].length) fail('#VALUE!'); if(Math.abs(det(M))<1e-12) fail('#NUM!');
  var A=M.map(function(r,i){ return r.concat(r.map(function(_,j){ return i===j?1:0; })); });
  for(var i=0;i<n;i++){ var p=i; for(var r=i+1;r<n;r++) if(Math.abs(A[r][i])>Math.abs(A[p][i])) p=r; var t=A[p]; A[p]=A[i]; A[i]=t; var d=A[i][i]; for(var c=0;c<2*n;c++) A[i][c]/=d;
    for(r=0;r<n;r++){ if(r===i) continue; var f=A[r][i]; for(c=0;c<2*n;c++) A[r][c]-=f*A[i][c]; } }
  return new Arr(A.map(function(r){ return r.slice(n).map(function(x){ return +x.toPrecision(14); }); })); });
def('MUNIT',function(a){ var n=Math.floor(toNum(this.scal(a[0]))); if(n<1||n*n>MAXSPILL) fail('#VALUE!'); var out=[]; for(var i=0;i<n;i++){ var row=[]; for(var j=0;j<n;j++) row.push(i===j?1:0); out.push(row); } return new Arr(out); });
def('SUMX2MY2',function(a){ var p=pairs(this,a); return p[0].reduce(function(s,x,i){ return s+x*x-p[1][i]*p[1][i]; },0); });
def('SUMX2PY2',function(a){ var p=pairs(this,a); return p[0].reduce(function(s,x,i){ return s+x*x+p[1][i]*p[1][i]; },0); });
def('SUMXMY2',function(a){ var p=pairs(this,a); return p[0].reduce(function(s,x,i){ return s+(x-p[1][i])*(x-p[1][i]); },0); });

/* math and engineering */
function m2(name,f){ def(name,function(a){ var r=f(toNum(this.scal(a[0]))); if(typeof r!=='number'||!isFinite(r)) fail('#NUM!'); return +r.toPrecision(15); }); }
m2('ACOSH',Math.acosh); m2('ASINH',Math.asinh); m2('ATANH',Math.atanh); m2('COT',function(x){ return 1/Math.tan(x); }); m2('SEC',function(x){ return 1/Math.cos(x); }); m2('CSC',function(x){ return 1/Math.sin(x); }); m2('SQRTPI',function(x){ return x<0?NaN:Math.sqrt(x*Math.PI); });
def('FACTDOUBLE',function(a){ var n=Math.floor(toNum(this.scal(a[0]))); if(n<-1) fail('#NUM!'); var r=1; for(var i=n;i>1;i-=2) r*=i; return r; });
def('COMBINA',function(a){ var n=Math.floor(toNum(this.scal(a[0]))), k=Math.floor(toNum(this.scal(a[1]))); if(n<0||k<0||(n===0&&k>0)) fail('#NUM!'); return k===0?1:FN.COMBIN.call(this,[n+k-1,k-0]); });
def('MULTINOMIAL',function(a){ var n=this.nums(a).map(Math.floor); if(n.some(function(x){ return x<0; })) fail('#NUM!'); return Math.round(fact(n.reduce(function(s,x){ return s+x; },0))/n.reduce(function(p,x){ return p*fact(x); },1)); });
def('DELTA',function(a){ return toNum(this.scal(a[0]))===opt(this,a[1],0)?1:0; });
def('GESTEP',function(a){ return toNum(this.scal(a[0]))>=opt(this,a[1],0)?1:0; });
def('ERF',function(a){ var x=toNum(this.scal(a[0])); return a[1]!=null?erfc(x)-erfc(toNum(this.scal(a[1]))):1-erfc(x); });
def('ERFC',function(a){ return erfc(toNum(this.scal(a[0]))); });
var LG=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
function lgam(x){ if(x<0.5) return Math.log(Math.PI/Math.abs(Math.sin(Math.PI*x)))-lgam(1-x); x-=1; var s=LG[0], t=x+7.5; for(var i=1;i<9;i++) s+=LG[i]/(x+i); return 0.5*Math.log(2*Math.PI)+(x+0.5)*Math.log(t)-t+Math.log(s); }
def('GAMMALN GAMMALN.PRECISE',function(a){ var x=toNum(this.scal(a[0])); if(x<=0) fail('#NUM!'); return +lgam(x).toPrecision(14); });
def('GAMMA',function(a){ var x=toNum(this.scal(a[0])); if(x<=0&&x===Math.floor(x)) fail('#NUM!'); var s=x<0&&Math.floor(x)%2!==0?-1:1; return +(s*Math.exp(lgam(x))).toPrecision(14); });
function roman(n){ var t=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']], s=''; t.forEach(function(p){ while(n>=p[0]){ s+=p[1]; n-=p[0]; } }); return s; }
def('ROMAN',function(a){ var n=Math.floor(toNum(this.scal(a[0]))); if(n<0||n>3999) fail('#VALUE!'); return n===0?'':roman(n); });
def('ARABIC',function(a){ var s=toStr(this.scal(a[0])).toUpperCase(), v={I:1,V:5,X:10,L:50,C:100,D:500,M:1000}, t=0; if(!/^[IVXLCDM]*$/.test(s)) fail('#VALUE!'); for(var i=0;i<s.length;i++){ var c=v[s[i]], n=v[s[i+1]]||0; t+=c<n?-c:c; } return t; });
def('BASE',function(a){ var n=Math.floor(toNum(this.scal(a[0]))), r=Math.floor(toNum(this.scal(a[1]))), m=opt(this,a[2],0); if(n<0||r<2||r>36||n>9007199254740991) fail('#NUM!'); var s=n.toString(r).toUpperCase(); while(s.length<m) s='0'+s; return s; });
def('DECIMAL',function(a){ var s=toStr(this.scal(a[0])).trim(), r=Math.floor(toNum(this.scal(a[1]))); if(r<2||r>36||!s) fail('#NUM!'); var n=parseInt(s,r); if(isNaN(n)||s.toLowerCase().split('').some(function(c){ return parseInt(c,36)>=r; })) fail('#NUM!'); return n; });
function toBase(self,a,base,bits){ var n=Math.trunc(toNum(self.scal(a[0]))), pl=a[1]!=null?Math.floor(toNum(self.scal(a[1]))):0, lim=Math.pow(2,bits-1);
  if(n<-lim||n>=lim) fail('#NUM!'); var s=(n<0?n+Math.pow(2,bits):n).toString(base).toUpperCase(); if(n>=0&&pl){ if(pl<s.length||pl>10) fail('#NUM!'); while(s.length<pl) s='0'+s; } return s; }
function fromBase(self,x,base,bits){ var s=toStr(self.scal(x)).trim().toUpperCase(); if(!s||s.length>10||!new RegExp('^[0-9A-F]+$').test(s)||s.split('').some(function(c){ return parseInt(c,16)>=base; })) fail('#NUM!');
  var n=parseInt(s,base), full=Math.pow(2,bits); return n>=full/2?n-full:n; }
def('DEC2BIN',function(a){ return toBase(this,a,2,10); }); def('DEC2OCT',function(a){ return toBase(this,a,8,30); }); def('DEC2HEX',function(a){ return toBase(this,a,16,40); });
def('BIN2DEC',function(a){ return fromBase(this,a[0],2,10); }); def('OCT2DEC',function(a){ return fromBase(this,a[0],8,30); }); def('HEX2DEC',function(a){ return fromBase(this,a[0],16,40); });
def('BIN2OCT',function(a){ return toBase(this,[fromBase(this,a[0],2,10),a[1]],8,30); }); def('BIN2HEX',function(a){ return toBase(this,[fromBase(this,a[0],2,10),a[1]],16,40); });
def('HEX2BIN',function(a){ return toBase(this,[fromBase(this,a[0],16,40),a[1]],2,10); }); def('OCT2BIN',function(a){ return toBase(this,[fromBase(this,a[0],8,30),a[1]],2,10); });
function bit2(name,f){ def(name,function(a){ var x=toNum(this.scal(a[0])), y=toNum(this.scal(a[1])); if(x<0||y<0||x!==Math.floor(x)||y!==Math.floor(y)||x>281474976710655||y>281474976710655) fail('#NUM!'); return f(x,y); }); }
function big(x){ return BigInt(x); }
bit2('BITAND',function(x,y){ return Number(big(x)&big(y)); }); bit2('BITOR',function(x,y){ return Number(big(x)|big(y)); }); bit2('BITXOR',function(x,y){ return Number(big(x)^big(y)); });
def('BITLSHIFT',function(a){ var x=toNum(this.scal(a[0])), s=toNum(this.scal(a[1])); if(x<0||s<-53||s>53) fail('#NUM!'); var r=Math.floor(x*Math.pow(2,s)); if(r>281474976710655) fail('#NUM!'); return r; });
def('BITRSHIFT',function(a){ var x=toNum(this.scal(a[0])), s=toNum(this.scal(a[1])); if(x<0||s<-53||s>53) fail('#NUM!'); var r=Math.floor(x/Math.pow(2,s)); if(r>281474976710655) fail('#NUM!'); return r; });

/* statistics */
function textNums(self,a){ var out=[]; self.each(a,function(v,fr){ if(isErr(v)) throw v; if(v==null) return; if(typeof v==='number') out.push(v); else if(typeof v==='boolean') out.push(v?1:0); else if(fr) out.push(0); else out.push(toNum(v)); }); return out; }
def('AVERAGEA',function(a){ var n=textNums(this,a); if(!n.length) fail('#DIV/0!'); return mean(n); });
def('MAXA',function(a){ var n=textNums(this,a); return n.length?Math.max.apply(null,n):0; });
def('MINA',function(a){ var n=textNums(this,a); return n.length?Math.min.apply(null,n):0; });
def('SKEW',function(a){ var n=this.nums(a), N=n.length; if(N<3) fail('#DIV/0!'); var m=mean(n), s=Math.sqrt(n.reduce(function(t,x){ return t+(x-m)*(x-m); },0)/(N-1)); if(!s) fail('#DIV/0!'); return N/((N-1)*(N-2))*n.reduce(function(t,x){ return t+Math.pow((x-m)/s,3); },0); });
def('KURT',function(a){ var n=this.nums(a), N=n.length; if(N<4) fail('#DIV/0!'); var m=mean(n), s=Math.sqrt(n.reduce(function(t,x){ return t+(x-m)*(x-m); },0)/(N-1)); if(!s) fail('#DIV/0!');
  return N*(N+1)/((N-1)*(N-2)*(N-3))*n.reduce(function(t,x){ return t+Math.pow((x-m)/s,4); },0)-3*(N-1)*(N-1)/((N-2)*(N-3)); });
def('PERCENTILE.EXC',function(a){ var n=this.nums([a[0]]).sort(function(x,y){ return x-y; }), k=toNum(this.scal(a[1])), N=n.length, p=k*(N+1); if(!N||k<=0||k>=1||p<1||p>N) fail('#NUM!'); var lo=Math.floor(p); return n[lo-1]+(n[Math.min(lo,N-1)]-n[lo-1])*(p-lo); });
def('QUARTILE.EXC',function(a){ var q=Math.floor(toNum(this.scal(a[1]))); if(q<1||q>3) fail('#NUM!'); return FN['PERCENTILE.EXC'].call(this,[a[0],q/4]); });
def('FISHER',function(a){ var x=toNum(this.scal(a[0])); if(x<=-1||x>=1) fail('#NUM!'); return Math.atanh(x); });
def('FISHERINV',function(a){ return Math.tanh(toNum(this.scal(a[0]))); });
def('CONFIDENCE.NORM CONFIDENCE',function(a){ var al=toNum(this.scal(a[0])), sd=toNum(this.scal(a[1])), n=Math.floor(toNum(this.scal(a[2]))); if(al<=0||al>=1||sd<=0||n<1) fail('#NUM!'); return ninv(1-al/2)*sd/Math.sqrt(n); });
def('EXPON.DIST EXPONDIST',function(a){ var x=toNum(this.scal(a[0])), l=toNum(this.scal(a[1])), c=toBool(this.scal(a[2])); if(x<0||l<=0) fail('#NUM!'); return c?1-Math.exp(-l*x):l*Math.exp(-l*x); });
function betacf(a,b,x){ var qab=a+b, qap=a+1, qam=a-1, c=1, d=1-qab*x/qap, tiny=1e-300; if(Math.abs(d)<tiny) d=tiny; d=1/d; var h=d;
  for(var m=1;m<=300;m++){ var m2=2*m, aa=m*(b-m)*x/((qam+m2)*(a+m2)); d=1+aa*d; if(Math.abs(d)<tiny) d=tiny; c=1+aa/c; if(Math.abs(c)<tiny) c=tiny; d=1/d; h*=d*c;
    aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2)); d=1+aa*d; if(Math.abs(d)<tiny) d=tiny; c=1+aa/c; if(Math.abs(c)<tiny) c=tiny; d=1/d; var del=d*c; h*=del; if(Math.abs(del-1)<1e-15) break; } return h; }
function ibeta(x,a,b){ if(x<=0) return 0; if(x>=1) return 1; var bt=Math.exp(lgam(a+b)-lgam(a)-lgam(b)+a*Math.log(x)+b*Math.log(1-x)); return x<(a+1)/(a+b+2)?bt*betacf(a,b,x)/a:1-bt*betacf(b,a,1-x)/b; }
function gammp(a,x){ if(x<=0) return 0; var g=lgam(a);
  if(x<a+1){ var ap=a, s=1/a, del=s; for(var n=0;n<1000;n++){ ap++; del*=x/ap; s+=del; if(Math.abs(del)<Math.abs(s)*1e-16) break; } return s*Math.exp(-x+a*Math.log(x)-g); }
  var b=x+1-a, c=1e300, d=1/b, h=d; for(var i=1;i<1000;i++){ var an=-i*(i-a); b+=2; d=an*d+b; if(Math.abs(d)<1e-300) d=1e-300; c=b+an/c; if(Math.abs(c)<1e-300) c=1e-300; d=1/d; var de=d*c; h*=de; if(Math.abs(de-1)<1e-16) break; }
  return 1-Math.exp(-x+a*Math.log(x)-g)*h; }
function tcdf(t,df){ var p=0.5*ibeta(df/(df+t*t),df/2,0.5); return t>0?1-p:p; }
function bisect(f,lo,hi){ for(var i=0;i<200;i++){ var mid=(lo+hi)/2; if(f(mid)>0) lo=mid; else hi=mid; } return (lo+hi)/2; } // f falls as x rises
function tinv2(p,df){ return bisect(function(t){ return 2*(1-tcdf(t,df))-p; },0,1e6); }
def('T.DIST',function(a){ var x=toNum(this.scal(a[0])), df=Math.floor(toNum(this.scal(a[1]))); if(df<1) fail('#NUM!'); if(toBool(this.scal(a[2]))) return tcdf(x,df); var lg=lgam((df+1)/2)-lgam(df/2); return Math.exp(lg)/Math.sqrt(df*Math.PI)*Math.pow(1+x*x/df,-(df+1)/2); });
def('T.DIST.2T',function(a){ var x=toNum(this.scal(a[0])), df=Math.floor(toNum(this.scal(a[1]))); if(df<1||x<0) fail('#NUM!'); return 2*(1-tcdf(x,df)); });
def('T.DIST.RT',function(a){ var x=toNum(this.scal(a[0])), df=Math.floor(toNum(this.scal(a[1]))); if(df<1) fail('#NUM!'); return 1-tcdf(x,df); });
def('T.INV.2T',function(a){ var p=toNum(this.scal(a[0])), df=Math.floor(toNum(this.scal(a[1]))); if(p<=0||p>1||df<1) fail('#NUM!'); return +tinv2(p,df).toPrecision(12); });
def('T.INV',function(a){ var p=toNum(this.scal(a[0])), df=Math.floor(toNum(this.scal(a[1]))); if(p<=0||p>=1||df<1) fail('#NUM!'); if(p===0.5) return 0; var t=tinv2(p<0.5?2*p:2*(1-p),df); return +(p<0.5?-t:t).toPrecision(12); });
def('CHISQ.DIST',function(a){ var x=toNum(this.scal(a[0])), df=Math.floor(toNum(this.scal(a[1]))); if(x<0||df<1) fail('#NUM!'); if(toBool(this.scal(a[2]))) return gammp(df/2,x/2); return x===0?(df===2?0.5:df<2?Infinity:0):Math.exp((df/2-1)*Math.log(x)-x/2-(df/2)*Math.LN2-lgam(df/2)); });
def('CHISQ.DIST.RT',function(a){ var x=toNum(this.scal(a[0])), df=Math.floor(toNum(this.scal(a[1]))); if(x<0||df<1) fail('#NUM!'); return 1-gammp(df/2,x/2); });
def('CHISQ.INV.RT',function(a){ var p=toNum(this.scal(a[0])), df=Math.floor(toNum(this.scal(a[1]))); if(p<=0||p>1||df<1) fail('#NUM!'); return +bisect(function(x){ return (1-gammp(df/2,x/2))-p; },0,1e5).toPrecision(10); });
def('ZTEST Z.TEST',function(a){ var n=this.nums([a[0]]), x=toNum(this.scal(a[1])), s=a[2]!=null?toNum(this.scal(a[2])):Math.sqrt(variance(n,true)); if(!n.length||s<=0) fail('#DIV/0!'); return 1-ncdf((mean(n)-x)/(s/Math.sqrt(n.length))); });
def('T.TEST TTEST',function(a){ var A=this.nums([a[0]]), B=this.nums([a[1]]), tails=toNum(this.scal(a[2])), ty=toNum(this.scal(a[3])), t, df;
  if(tails!==1&&tails!==2) fail('#NUM!');
  if(ty===1){ if(A.length!==B.length||A.length<2) fail('#N/A'); var d=A.map(function(x,i){ return x-B[i]; }); df=d.length-1; t=mean(d)/Math.sqrt(variance(d,true)/d.length); }
  else if(ty===2||ty===3){ if(A.length<2||B.length<2) fail('#DIV/0!'); var v1=variance(A,true), v2=variance(B,true), n1=A.length, n2=B.length;
    if(ty===2){ df=n1+n2-2; var sp=((n1-1)*v1+(n2-1)*v2)/df; t=(mean(A)-mean(B))/Math.sqrt(sp*(1/n1+1/n2)); }
    else { var s1=v1/n1, s2=v2/n2; t=(mean(A)-mean(B))/Math.sqrt(s1+s2); df=Math.pow(s1+s2,2)/(s1*s1/(n1-1)+s2*s2/(n2-1)); } }
  else fail('#NUM!'); if(!isFinite(t)) fail('#DIV/0!'); var p=1-tcdf(Math.abs(t),df); return tails===1?p:2*p; });
def('BINOM.INV CRITBINOM',function(a){ var n=Math.floor(toNum(this.scal(a[0]))), p=toNum(this.scal(a[1])), al=toNum(this.scal(a[2])); if(n<0||p<0||p>1||al<0||al>1) fail('#NUM!');
  var cum=0, c=Math.pow(1-p,n); for(var k=0;k<=n;k++){ cum+=c; if(cum>=al) return k; c=c*(n-k)/(k+1)*p/(1-p); } return n; });
def('FREQUENCY',function(a){ var d=this.nums([a[0]]), b=this.nums([a[1]]).sort(function(x,y){ return x-y; }), cnt=b.map(function(){ return 0; }).concat([0]);
  d.forEach(function(x){ var i=0; while(i<b.length&&x>b[i]) i++; cnt[i]++; }); return new Arr(cnt.map(function(c){ return [c]; })); });
function xy(self,a){ var y=self.nums([a[0]]), x=a[1]!=null?self.nums([a[1]]):y.map(function(_,i){ return i+1; }); if(x.length!==y.length||y.length<2) fail('#N/A'); return [y,x]; }
function fit(y,x){ var mx=mean(x), my=mean(y), sxx=0, sxy=0; x.forEach(function(v,i){ sxx+=(v-mx)*(v-mx); sxy+=(v-mx)*(y[i]-my); }); if(!sxx) fail('#DIV/0!'); var b=sxy/sxx; return [b,my-b*mx]; }
def('TREND',function(a){ var p=xy(this,a), f=fit(p[0],p[1]), nx=a[2]!=null?grid(this,a[2]):grid(this,a[1]!=null?a[1]:new Arr(p[1].map(function(v){ return [v]; })));
  return new Arr(nx.map(function(row){ return row.map(function(v){ return +(f[1]+f[0]*toNum(v)).toPrecision(14); }); })); });
def('LINEST',function(a){ var p=xy(this,a), f=fit(p[0],p[1]); return new Arr([[+f[0].toPrecision(14),+f[1].toPrecision(14)]]); });
def('STEYX',function(a){ var p=pairs(this,[a[1],a[0]]), s=sxy(p); if(p[0].length<3||!s[1]) fail('#DIV/0!'); return Math.sqrt((s[2]-s[0]*s[0]/s[1])/(p[0].length-2)); });
def('AGGREGATE',function(a){ var f=Math.floor(toNum(this.scal(a[0]))), o=Math.floor(toNum(this.scal(a[1]))), skip=o===2||o===3||o===6||o===7, self=this;
  var names={1:'AVERAGE',2:'COUNT',3:'COUNTA',4:'MAX',5:'MIN',6:'PRODUCT',7:'STDEV.S',8:'STDEV.P',9:'SUM',10:'VAR.S',11:'VAR.P',12:'MEDIAN',13:'MODE.SNGL',14:'LARGE',15:'SMALL',16:'PERCENTILE.INC',17:'QUARTILE.INC',18:'PERCENTILE.EXC',19:'QUARTILE.EXC'};
  if(!names[f]||o<0||o>7) fail('#VALUE!'); var kk=f>=14, src=a.slice(2,kk?3:undefined), rest=kk?a.slice(3):[];
  if(kk&&!rest.length) fail('#VALUE!');
  if(skip) src=[new Arr([[].concat.apply([],src.map(function(x){ return [].concat.apply([],grid(self,x)); })).filter(function(v){ return !isErr(v); })])];
  return FN[names[f]].call(this,src.concat(rest)); });

/* finance */
function fvOf(r,n,p,pv,t){ if(r===0) return -(pv+p*n); var g=Math.pow(1+r,n); return -(pv*g+p*(1+r*t)*(g-1)/r); }
function pmtOf(r,n,pv,fv,t){ if(r===0) return -(pv+fv)/n; var g=Math.pow(1+r,n); return -(r*(fv+pv*g))/((1+r*t)*(g-1)); }
function ipmtOf(r,per,n,pv,fv,t){ if(t&&per===1) return 0; var p=pmtOf(r,n,pv,fv,t); return t?(fvOf(r,per-2,p,pv,1)-p)*r:fvOf(r,per-1,p,pv,0)*r; }
def('RATE',function(a){ var n=fin(this,a,0), p=fin(this,a,1), pv=fin(this,a,2), fv=fin(this,a,3,0), t=fin(this,a,4,0)?1:0, g=fin(this,a,5,0.1);
  var f=function(r){ return r===0?pv+p*n+fv:pv*Math.pow(1+r,n)+p*(1+r*t)*(Math.pow(1+r,n)-1)/r+fv; };
  for(var i=0;i<200;i++){ var y=f(g), h=1e-7, d=(f(g+h)-y)/h; if(!d||!isFinite(d)) break; var ng=g-y/d; if(ng<=-1) ng=(g-1)/2; if(Math.abs(ng-g)<1e-12) return ng; g=ng; } fail('#NUM!'); });
def('IPMT',function(a){ var r=fin(this,a,0), per=fin(this,a,1), n=fin(this,a,2); if(per<1||per>n) fail('#NUM!'); return ipmtOf(r,per,n,fin(this,a,3),fin(this,a,4,0),fin(this,a,5,0)?1:0); });
def('PPMT',function(a){ var r=fin(this,a,0), per=fin(this,a,1), n=fin(this,a,2), pv=fin(this,a,3), fv=fin(this,a,4,0), t=fin(this,a,5,0)?1:0; if(per<1||per>n) fail('#NUM!'); return pmtOf(r,n,pv,fv,t)-ipmtOf(r,per,n,pv,fv,t); });
function cum(self,a,ipmt){ var r=fin(self,a,0), n=fin(self,a,1), pv=fin(self,a,2), s=Math.floor(fin(self,a,3)), e=Math.floor(fin(self,a,4)), t=fin(self,a,5)?1:0; if(r<=0||n<=0||pv<=0||s<1||e<s||e>n) fail('#NUM!');
  var p=pmtOf(r,n,pv,0,t), tot=0; for(var i=s;i<=e;i++) tot+=ipmt?ipmtOf(r,i,n,pv,0,t):p-ipmtOf(r,i,n,pv,0,t); return tot; }
def('CUMIPMT',function(a){ return cum(this,a,true); });
def('CUMPRINC',function(a){ return cum(this,a,false); });
function dated(self,x){ return self.cells(x).map(function(v){ var d=typeof v==='number'?new Date(Date.UTC(1899,11,30)+v*864e5):asDate(v); if(!d) fail('#VALUE!'); return d; }); }
def('XNPV',function(a){ var r=toNum(this.scal(a[0])), v=this.nums([a[1]]), d=dated(this,a[2]); if(v.length!==d.length||!v.length||r<=-1) fail('#NUM!'); return v.reduce(function(s,x,i){ return s+x/Math.pow(1+r,(d[i]-d[0])/864e5/365); },0); });
def('XIRR',function(a){ var v=this.nums([a[0]]), d=dated(this,a[1]), g=fin(this,a,2,0.1); if(v.length!==d.length||v.length<2||!v.some(function(x){ return x>0; })||!v.some(function(x){ return x<0; })) fail('#NUM!');
  var t=d.map(function(x){ return (x-d[0])/864e5/365; });
  for(var i=0;i<200;i++){ var f=0, df=0; v.forEach(function(x,k){ f+=x/Math.pow(1+g,t[k]); df-=t[k]*x/Math.pow(1+g,t[k]+1); }); if(!df||!isFinite(df)) break; var ng=g-f/df; if(ng<=-1) ng=(g-1)/2; if(Math.abs(ng-g)<1e-12) return ng; g=ng; } fail('#NUM!'); });
def('MIRR',function(a){ var v=this.nums([a[0]]), fr=toNum(this.scal(a[1])), rr=toNum(this.scal(a[2])), n=v.length, pos=0, neg=0; v.forEach(function(x,i){ if(x>=0) pos+=x*Math.pow(1+rr,n-1-i); else neg+=x/Math.pow(1+fr,i); });
  if(!pos||!neg||n<2) fail('#DIV/0!'); return Math.pow(pos/-neg,1/(n-1))-1; });
def('EFFECT',function(a){ var r=toNum(this.scal(a[0])), n=Math.floor(toNum(this.scal(a[1]))); if(r<=0||n<1) fail('#NUM!'); return Math.pow(1+r/n,n)-1; });
def('NOMINAL',function(a){ var r=toNum(this.scal(a[0])), n=Math.floor(toNum(this.scal(a[1]))); if(r<=0||n<1) fail('#NUM!'); return n*(Math.pow(1+r,1/n)-1); });
def('RRI',function(a){ var n=toNum(this.scal(a[0])), pv=toNum(this.scal(a[1])), fv=toNum(this.scal(a[2])); if(n<=0||pv===0) fail('#NUM!'); return Math.pow(fv/pv,1/n)-1; });
def('SYD',function(a){ var c=toNum(this.scal(a[0])), s=toNum(this.scal(a[1])), l=toNum(this.scal(a[2])), p=toNum(this.scal(a[3])); if(l<=0||p<1||p>l) fail('#NUM!'); return (c-s)*(l-p+1)*2/(l*(l+1)); });
def('DDB',function(a){ var c=toNum(this.scal(a[0])), s=toNum(this.scal(a[1])), l=toNum(this.scal(a[2])), p=Math.floor(toNum(this.scal(a[3]))), f=opt(this,a[4],2); if(c<0||s<0||l<=0||p<1||p>l||f<=0) fail('#NUM!');
  var tot=0, d=0; for(var i=1;i<=p;i++){ d=Math.min((c-tot)*f/l,Math.max(c-s-tot,0)); tot+=d; } return d; });
def('DB',function(a){ var c=toNum(this.scal(a[0])), s=toNum(this.scal(a[1])), l=Math.floor(toNum(this.scal(a[2]))), p=Math.floor(toNum(this.scal(a[3]))), m=Math.floor(opt(this,a[4],12)); if(c<=0||s<0||l<=0||p<1||p>l+(m<12?1:0)||m<1||m>12) fail('#NUM!');
  var r=Math.round((1-Math.pow(s/c,1/l))*1000)/1000, tot=0, d=0; for(var i=1;i<=p;i++){ d=i===1?c*r*m/12:i===l+1?(c-tot)*r*(12-m)/12:(c-tot)*r; tot+=d; } return d; });
def('ISPMT',function(a){ var r=toNum(this.scal(a[0])), per=toNum(this.scal(a[1])), n=toNum(this.scal(a[2])), pv=toNum(this.scal(a[3])); if(!n) fail('#DIV/0!'); return pv*r*(per/n-1); });
def('DOLLARDE',function(a){ var d=toNum(this.scal(a[0])), f=Math.floor(toNum(this.scal(a[1]))); if(f<0) fail('#NUM!'); if(!f) fail('#DIV/0!'); var i=Math.trunc(d); return i+(d-i)*Math.pow(10,Math.ceil(Math.log10(f)))/f; });
def('DOLLARFR',function(a){ var d=toNum(this.scal(a[0])), f=Math.floor(toNum(this.scal(a[1]))); if(f<0) fail('#NUM!'); if(!f) fail('#DIV/0!'); var i=Math.trunc(d); return i+(d-i)*f/Math.pow(10,Math.ceil(Math.log10(f))); });
Object.assign(XLFN,{XMATCH:'_xlfn.XMATCH',LET:'_xlfn.LET',LAMBDA:'_xlfn.LAMBDA',MAP:'_xlfn.MAP',REDUCE:'_xlfn.REDUCE',SCAN:'_xlfn.SCAN',BYROW:'_xlfn.BYROW',BYCOL:'_xlfn.BYCOL',MAKEARRAY:'_xlfn.MAKEARRAY',TAKE:'_xlfn.TAKE',DROP:'_xlfn.DROP',
  CHOOSEROWS:'_xlfn.CHOOSEROWS',CHOOSECOLS:'_xlfn.CHOOSECOLS',EXPAND:'_xlfn.EXPAND',TOCOL:'_xlfn.TOCOL',TOROW:'_xlfn.TOROW',WRAPROWS:'_xlfn.WRAPROWS',WRAPCOLS:'_xlfn.WRAPCOLS',RANDARRAY:'_xlfn.RANDARRAY',
  FORMULATEXT:'_xlfn.FORMULATEXT',ISFORMULA:'_xlfn.ISFORMULA',SHEET:'_xlfn.SHEET',SHEETS:'_xlfn.SHEETS',ARRAYTOTEXT:'_xlfn.ARRAYTOTEXT',VALUETOTEXT:'_xlfn.VALUETOTEXT',ENCODEURL:'_xlfn.ENCODEURL',
  ACOT:'_xlfn.ACOT',COT:'_xlfn.COT',SEC:'_xlfn.SEC',CSC:'_xlfn.CSC',ARABIC:'_xlfn.ARABIC',BASE:'_xlfn.BASE',DECIMAL:'_xlfn.DECIMAL',COMBINA:'_xlfn.COMBINA',GAMMA:'_xlfn.GAMMA','GAMMALN.PRECISE':'_xlfn.GAMMALN.PRECISE',
  BITAND:'_xlfn.BITAND',BITOR:'_xlfn.BITOR',BITXOR:'_xlfn.BITXOR',BITLSHIFT:'_xlfn.BITLSHIFT',BITRSHIFT:'_xlfn.BITRSHIFT',RRI:'_xlfn.RRI','PERCENTILE.EXC':'_xlfn.PERCENTILE.EXC','QUARTILE.EXC':'_xlfn.QUARTILE.EXC',
  'CONFIDENCE.NORM':'_xlfn.CONFIDENCE.NORM','EXPON.DIST':'_xlfn.EXPON.DIST','T.DIST':'_xlfn.T.DIST','T.DIST.2T':'_xlfn.T.DIST.2T','T.DIST.RT':'_xlfn.T.DIST.RT','T.INV':'_xlfn.T.INV','T.INV.2T':'_xlfn.T.INV.2T',
  'CHISQ.DIST':'_xlfn.CHISQ.DIST','CHISQ.DIST.RT':'_xlfn.CHISQ.DIST.RT','CHISQ.INV.RT':'_xlfn.CHISQ.INV.RT','Z.TEST':'_xlfn.Z.TEST','T.TEST':'_xlfn.T.TEST','BINOM.INV':'_xlfn.BINOM.INV','NETWORKDAYS.INTL':'NETWORKDAYS.INTL','WORKDAY.INTL':'WORKDAY.INTL'});

/* a formula's value at sheet si without putting it in a cell (the sheet's "AI 계산" box): a single value or an Err */
Engine.prototype.calc=function(si,raw){
  try{ var v=this.ev(this.ast(raw[0]==='='?raw:'='+raw),si); if(v instanceof Rng) v=isMulti(v)?new Err('#VALUE!'):this.first(v); if(v instanceof Arr) v=v.rows.length===1&&v.rows[0].length===1?v.rows[0][0]:new Err('#VALUE!');
    if(v==null) v=0; if(typeof v==='number'&&!isFinite(v)) v=new Err('#NUM!'); return v; }
  catch(e){ return isErr(e)?e:new Err('#ERROR!'); }
};

/* v42: row/column groups. levels {index: 1-7}; folded {summary index: 1}. A folded summary (the row below / column right of a group)
   hides the run of lines just before it that sit deeper than it. Returns {index: 1} of the lines that are hidden by folding. */
function outlineHidden(levels,folded){
  var out={}; if(!levels||!folded) return out;
  Object.keys(folded).forEach(function(k){ var s=+k, L=levels[s]||0, i=s-1; while(i>=0&&(levels[i]||0)>L){ out[i]=1; i--; } });
  return out;
}
var api={outlineHidden:outlineHidden,K:K,RC:RC,KC:KC,colName:colName,colIdx:colIdx,addr:addr,parseAddr:parseAddr,parseRange:parseRange,rangeStr:rangeStr,
  tokenize:tokenize,rebuild:rebuild,parse:parse,literal:literal,shiftFormula:shiftFormula,adjustFormula:adjustFormula,renameSheetInFormula:renameSheetInFormula,
  Engine:Engine,Err:Err,errHint:errHint,isErr:isErr,formatValue:formatValue,fmtGeneral:fmtGeneral,cmpVals:cmpVals,pivot:pivot,lockHit:lockHit,lockAny:lockAny,lockCut:lockCut,renameNameInFormula:renameNameInFormula,iconFor:iconFor,sparkSvg:sparkSvg,ICOL:ICOL,Arr:Arr,toXl:toXl,fromXl:fromXl,trimText:trimText,splitText:splitText,dedupeRows:dedupeRows,parseNameRef:parseNameRef,nameRef:nameRef,validName:validName,refText:refText,asDate:asDate,dateStr:dateStr,FN:FN,quoteSheet:quoteSheet,unitOf:unitOf,convertUnit:convertUnit};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.FSE=api;
})(this);
