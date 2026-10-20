/* Fry Sheet 수식 풀이: a formula is taken apart with the engine's own parser and every step is shown with the value it gives,
   in plain Korean. No AI is used, so the explanation cannot be wrong about what the formula does: people use it to check a
   formula the AI wrote. Works in the browser (FSExplain) and in Node (module.exports), the engine and the function list are passed in.
   explain(raw, o) -> {kind:'text'|'ai'|'bad'|'formula', ...}
     o.parse(src) -> ast        o.val(node) -> text shown for the node's value        o.desc(NAME) -> one-line description or ''
     o.addr(r,c), o.rangeStr(g)  o.ref(node) -> text of the cell's value for the "쓰는 칸" list */
(function(root){
'use strict';
var OPN={'+':'더하기','-':'빼기','*':'곱하기','/':'나누기','^':'거듭제곱','&':'글자 이어 붙이기','=':'같은지 비교','<>':'다른지 비교','<':'작은지 비교','>':'큰지 비교','<=':'작거나 같은지 비교','>=':'크거나 같은지 비교'};
var MAXSTEP=12, MAXREF=8;

function show(n,o){
  switch(n.k){
    case 'v': if(n.v===null||n.v===undefined) return ''; if(typeof n.v==='string') return '"'+n.v+'"'; if(typeof n.v==='boolean') return n.v?'TRUE':'FALSE'; return String(n.v);
    case 'ref': return (n.sh?n.sh+'!':'')+o.addr(n.r,n.c);
    case 'rng': return (n.sh?n.sh+'!':'')+o.rangeStr({r1:n.r1,c1:n.c1,r2:n.r2,c2:n.c2});
    case 'name': return n.n;
    case 'err': return n.e;
    case 'neg': return '-'+show(n.a,o);
    case 'pct': return show(n.a,o)+'%';
    case 'bin': return wrap(n.a,o)+' '+n.o+' '+wrap(n.b,o);
    case 'fn': return n.n+'('+n.args.map(function(a){ return show(a,o); }).join(', ')+')';
    case 'arr': return '{'+n.items.map(function(a){ return show(a,o); }).join(', ')+'}';
  }
  return '?';
}
function wrap(n,o){ return n.k==='bin'?'('+show(n,o)+')':show(n,o); }

/* parentheses of the text outside quotes: how many open and close */
function parens(src){
  var open=0, close=0, q=false;
  for(var i=0;i<src.length;i++){ var ch=src[i];
    if(ch==='"') q=!q; else if(!q){ if(ch==='(') open++; else if(ch===')') close++; } }
  return {open:open,close:close};
}

function walk(n,out,refs,o){
  switch(n.k){
    case 'ref': if(refs.length<MAXREF&&!refs.some(function(x){ return x.t===show(n,o); })) refs.push({t:show(n,o),n:n}); return;
    case 'neg': case 'pct': walk(n.a,out,refs,o); return;
    case 'bin': walk(n.a,out,refs,o); walk(n.b,out,refs,o); out.push({n:n,note:OPN[n.o]||n.o}); return;
    case 'fn': n.args.forEach(function(a){ walk(a,out,refs,o); }); out.push({n:n,note:o.desc(n.n)}); return;
    case 'arr': n.items.forEach(function(a){ walk(a,out,refs,o); }); return;
  }
}

function explain(raw,o){
  raw=raw==null?'':String(raw);
  if(raw[0]!=="="||raw.length<2) return {kind:'text'};
  var src=raw.slice(1), ast;
  try{ ast=o.parse(src); }
  catch(e){
    var p=parens(src), hint='', F=o.F||function(t,n){ return t.replace('{0}',n); };   // o.F: the page's translator (FFT.F)
    if(p.close>p.open) hint=F('닫는 괄호 )가 {0}개 더 많아요. 끝이나 중간에서 하나를 지워 보세요.',p.close-p.open);
    else if(p.open>p.close) hint=F('여는 괄호 (가 {0}개 더 많아요. 닫는 괄호 )를 더 넣어 보세요.',p.open-p.close);
    else hint=F('괄호 개수는 맞아요. 쉼표, 따옴표, 함수 이름 철자를 확인해 보세요.');
    return {kind:'bad',hint:hint,open:p.open,close:p.close};
  }
  if(ast.k==='fn'&&ast.n==='AI'){
    var q=ast.args[0]&&ast.args[0].k==='v'&&typeof ast.args[0].v==='string'?ast.args[0].v:'';
    return {kind:'ai',prompt:q,expr:show(ast,o),value:o.val(ast)};
  }
  var steps=[], refs=[], seen={}; walk(ast,steps,refs,o);
  var list=[];
  steps.forEach(function(s){ var t=show(s.n,o); if(seen[t]) return; seen[t]=1; list.push({expr:t,note:s.note||'',value:o.val(s.n)}); });
  var more=list.length>MAXSTEP?list.length-MAXSTEP:0; if(more) list=list.slice(0,MAXSTEP);
  return {kind:'formula',steps:list,more:more,refs:refs.map(function(x){ return {t:x.t,v:o.ref(x.n)}; }),result:o.val(ast),simple:!list.length};
}

var api={explain:explain,show:show,parens:parens};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.FSExplain=api;
})(typeof window!=='undefined'?window:globalThis);
