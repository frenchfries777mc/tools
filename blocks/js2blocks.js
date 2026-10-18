/* JavaScript -> blocks. Reads the script of an HTML page (acorn) and writes Blockly XML for the Block HTML editor.
   The aim: as little "JS 직접 쓰기" as possible. Variables, math, text, lists, if / loops, functions, events, timers and the
   usual page tricks (getElementById + textContent / value / style, canvas drawing ...) become real blocks; only what has no
   block (a callback passed to a library, a regex, a class ...) is left in a JS block, with the rest of the program still in blocks.
   Whenever a conversion could change what the program does (a local variable caught by a closure, == between different
   types ...), that piece is left as JS instead, so the page behaves the same. */
(function(){
'use strict';
var A=typeof acorn!=='undefined'?acorn:null;

function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fld(n,v){ return '<field name="'+n+'">'+esc(v)+'</field>'; }
function Bail(m,hard){ this.message=m; this.bail=true; this.hard=!!hard; }
function bail(m){ throw new Bail(m); }
function hard(m){ throw new Bail(m,true); }
function chain(list){ return list.reduceRight(function(acc,x){ return acc?x.replace(/<\/block>$/,function(){ return '<next>'+acc+'</next></block>'; }):x; },''); }
/* what kind of value a block gives (null = could be anything) and what each input of the common blocks accepts, so a value never lands in a slot that refuses it */
var OUT={time_running:'Boolean',math_number:'Number',math_arithmetic:'Number',math_single:'Number',math_round:'Number',math_modulo:'Number',math_random_int:'Number',math_random_float:'Number',math_constant:'Number',math_on_list:'Number',text_length:'Number',lists_length:'Number',val_time:'Number',val_mouse:'Number',val_score:'Number',val_dist:'Number',
  text:'String',text_join:'String',text_changeCase:'String',text_trim:'String',val_prompt:'String',val_key:'String',val_color:'String',
  logic_boolean:'Boolean',logic_compare:'Boolean',logic_operation:'Boolean',logic_negate:'Boolean',js_has:'Boolean',js_bool:'Boolean',
  lists_create_with:'Array'};
var IN={math_arithmetic:{A:'Number',B:'Number'},math_single:{NUM:'Number'},math_round:{NUM:'Number'},math_modulo:{DIVIDEND:'Number',DIVISOR:'Number'},math_random_int:{FROM:'Number',TO:'Number'},math_change:{DELTA:'Number'},
  controls_for:{FROM:'Number',TO:'Number',BY:'Number'},act_size:{N:'Number'},act_after:{SEC:'Number'},time_every:{SEC:'Number'},time_after:{SEC:'Number'},
  draw_rect:{X:'Number',Y:'Number',W:'Number',H:'Number'},draw_circle:{X:'Number',Y:'Number',R:'Number'},
  controls_if:{},controls_whileUntil:{BOOL:'Boolean'},loop_dowhile:{COND:'Boolean'},logic_negate:{BOOL:'Boolean'},logic_ternary:{IF:'Boolean'},
  text_changeCase:{TEXT:'String'},text_trim:{TEXT:'String'},controls_forEach:{LIST:'Array'},math_on_list:{LIST:'Array'}};
for(var ii=0;ii<12;ii++) IN.controls_if['IF'+ii]='Boolean';
function outType(x){ var m=/^<block type="(\w+)"/.exec(x); if(!m) return null; if(m[1]==='lists_split') return /name="MODE">JOIN</.test(x.slice(0,200))?'String':'Array'; return OUT[m[1]]||null; }
function coerce(x,want,type){
  var got=outType(x); if(!want||!got||got===want) return x;
  if(want==='Number') return '<block type="js_num"><field name="AS">Number</field><value name="X">'+x+'</value></block>';
  if(want==='Boolean') return '<block type="js_bool"><value name="X">'+x+'</value></block>';
  if(want==='String') return '<block type="js_num"><field name="AS">String</field><value name="X">'+x+'</value></block>';
  bail('value kind '+type+' '+got); }
function blk(type,o){ o=o||{}; var s='<block type="'+type+'">', k; if(o.m) s+=o.m;
  if(o.f) for(k in o.f) s+=fld(k,o.f[k]);
  if(o.v) for(k in o.v) if(o.v[k]) s+='<value name="'+k+'">'+coerce(o.v[k],IN[type]&&IN[type][k],type+'.'+k)+'</value>';
  if(o.s) for(k in o.s) if(o.s[k]&&o.s[k].length) s+='<statement name="'+k+'">'+chain(o.s[k])+'</statement>';
  return s+'</block>'; }
var KEYS={' ':1,Enter:1,ArrowUp:1,ArrowDown:1,ArrowLeft:1,ArrowRight:1,Escape:1,Shift:1}; // keys the key blocks know (letters and digits too)
function keyOk(k){ return KEYS[k]===1||/^[a-z0-9]$/.test(k); }
var MATH_CONST={PI:'PI',E:'E',SQRT2:'SQRT2',SQRT1_2:'SQRT1_2'};
var NAME_RE=/^[A-Za-z_][A-Za-z0-9_]*$/;
var CMP={'===':'EQ','!==':'NEQ','<':'LT','<=':'LTE','>':'GT','>=':'GTE'};
var STR_METHODS=/^(toString|toFixed|toUpperCase|toLowerCase|trim|join|slice|substring|substr|repeat|padStart|padEnd|replace|charAt|concat|toLocaleString|toPrecision)$/;
var FN_NODE=/^(FunctionExpression|ArrowFunctionExpression)$/;

function convertScript(code,env){
  var off=Object.create(null);
  for(var tries=0;tries<20;tries++){
    try{ return convertOnce(code,env,off); }catch(e){ if(e&&e.retryTimer){ off[e.retryTimer]=1; continue; } throw e; } }
  return null; }
function convertOnce(code,env,offTimers){
  if(!A) return null;
  var ast;
  try{ ast=A.parse(code,{ecmaVersion:'latest',sourceType:'script'}); }catch(e){ return null; }
  var reservedSet=null;
  function reserved(n){
    if(!reservedSet){ reservedSet=Object.create(null); var g=window.javascript&&javascript.javascriptGenerator, w=(g&&g.RESERVED_WORDS_)||''; w.split(',').forEach(function(x){ if(x) reservedSet[x]=1; });
      'break,case,catch,class,const,continue,debugger,default,delete,do,else,enum,export,extends,false,finally,for,function,if,implements,import,in,instanceof,interface,let,new,null,package,private,protected,public,return,static,super,switch,this,throw,true,try,typeof,var,void,while,with,yield,await,undefined,arguments,eval,NaN,Infinity'.split(',').forEach(function(x){ reservedSet[x]=1; }); }
    return reservedSet[n]===1; }
  function plainName(n){ return NAME_RE.test(n)&&n.indexOf('__')!==0&&!reserved(n)&&n!=='e'&&n!=='$'; }

  /* ---------- pass 0: facts about the whole program ---------- */
  var facts={assigns:Object.create(null), kinds:Object.create(null), fills:Object.create(null), dollar:false, dollarBad:false, procNames:Object.create(null)};
  function srcOf(n){ return code.slice(n.start,n.end); }
  function walkAll(n,fn,skipFn){
    if(!n||typeof n.type!=='string') return;
    if(fn(n)===false) return;
    for(var k in n){ if(k==='type'||k==='start'||k==='end') continue; var c=n[k];
      if(Array.isArray(c)){ for(var i=0;i<c.length;i++) if(c[i]&&typeof c[i].type==='string') walkAll(c[i],fn,skipFn); }
      else if(c&&typeof c.type==='string') walkAll(c,fn,skipFn); } }
  function kindOfNode(n){
    if(!n) return 'other';
    if(n.type==='ArrayExpression') return 'list';
    if(isStr(n,true)) return 'str';
    if(isNum(n,true)) return 'num';
    return 'other'; }
  function addKind(name,k){ var o=facts.kinds[name]; facts.kinds[name]=o===undefined?k:(o===k?k:'other'); }
  walkAll(ast,function(n){
    if(n.type==='VariableDeclarator'&&n.id.type==='Identifier'){ addKind(n.id.name,n.init?kindOfNode(n.init):'other'); facts.assigns[n.id.name]=(facts.assigns[n.id.name]||0)+(n.init?1:0); }
    else if(n.type==='VariableDeclarator'){ collectPattern(n.id,function(nm){ addKind(nm,'other'); facts.assigns[nm]=(facts.assigns[nm]||0)+5; }); }
    else if(n.type==='AssignmentExpression'&&n.left.type==='Identifier'){ var nm=n.left.name; facts.assigns[nm]=(facts.assigns[nm]||0)+1; addKind(nm,n.operator==='='?kindOfNode(n.right):(n.operator==='+='?(isNum(n.right,true)?'num':isStr(n.right,true)?'str':'other'):'num')); }
    else if(n.type==='AssignmentExpression'&&n.left.type!=='MemberExpression'){ collectPattern(n.left,function(nm){ addKind(nm,'other'); facts.assigns[nm]=(facts.assigns[nm]||0)+5; }); }
    else if(n.type==='UpdateExpression'&&n.argument.type==='Identifier'){ facts.assigns[n.argument.name]=(facts.assigns[n.argument.name]||0)+1; addKind(n.argument.name,'num'); }
    else if(n.type==='ForInStatement'||n.type==='ForOfStatement'){ var l=n.left.type==='VariableDeclaration'?n.left.declarations[0].id:n.left; collectPattern(l,function(nm){ addKind(nm,'other'); facts.assigns[nm]=(facts.assigns[nm]||0)+5; }); }
    if(n.type==='AssignmentExpression'&&n.left.type==='MemberExpression'&&n.left.property.type==='Identifier'&&n.left.property.name==='fillStyle'&&n.left.object.type==='Identifier') facts.fills[n.left.object.name]=(facts.fills[n.left.object.name]||0)+1;
    if(n.type==='FunctionDeclaration'&&n.id) { /* names are looked at when the program scope is built */ }
  });
  function collectPattern(p,fn){
    if(!p) return;
    if(p.type==='Identifier') fn(p.name);
    else if(p.type==='ObjectPattern') p.properties.forEach(function(q){ collectPattern(q.type==='RestElement'?q.argument:q.value,fn); });
    else if(p.type==='ArrayPattern') p.elements.forEach(function(q){ collectPattern(q,fn); });
    else if(p.type==='AssignmentPattern') collectPattern(p.left,fn);
    else if(p.type==='RestElement') collectPattern(p.argument,fn); }

  /* ---------- timer variables: t = setInterval(...) used only to stop it or ask "is it running?" ---------- */
  var timerNames=Object.create(null);
  (function(){
    var cand=Object.create(null), occ=[];
    function isTimerCall(n){ return n&&n.type==='CallExpression'&&n.callee.type==='Identifier'&&/^(setInterval|setTimeout)$/.test(n.callee.name); }
    function walkP(n,par,key){
      if(!n||typeof n.type!=='string') return;
      if(n.type==='Identifier') occ.push({n:n,par:par,key:key});
      if(n.type==='VariableDeclarator'&&n.id.type==='Identifier'&&isTimerCall(n.init)){ var o=cand[n.id.name]||(cand[n.id.name]={iv:0,to:0}); o[n.init.callee.name==='setInterval'?'iv':'to']++; }
      if(n.type==='AssignmentExpression'&&n.operator==='='&&n.left.type==='Identifier'&&isTimerCall(n.right)){ var o2=cand[n.left.name]||(cand[n.left.name]={iv:0,to:0}); o2[n.right.callee.name==='setInterval'?'iv':'to']++; }
      for(var k in n){ if(k==='type'||k==='start'||k==='end') continue; var c=n[k];
        if(Array.isArray(c)) c.forEach(function(x){ walkP(x,n,k); }); else if(c&&typeof c.type==='string') walkP(c,n,k); } }
    walkP(ast,null,null);
    var bad=Object.assign(Object.create(null),offTimers);
    occ.forEach(function(o){
      var nm=o.n.name, c=cand[nm]; if(!c) return; var P=o.par, ok=false;
      if(P){
        if(P.type==='VariableDeclarator'&&o.key==='id') ok=!P.init||(P.init.type==='Literal'&&P.init.value===null)||isTimerCall(P.init);
        else if(P.type==='AssignmentExpression'&&o.key==='left') ok=P.operator==='='&&((P.right.type==='Literal'&&(P.right.value===null||P.right.value===0))||isTimerCall(P.right));
        else if(P.type==='CallExpression'&&o.key==='arguments') ok=P.callee.type==='Identifier'&&/^(clearInterval|clearTimeout)$/.test(P.callee.name)&&P.arguments.length===1;
        else if(!c.to&&P.type==='IfStatement'&&o.key==='test') ok=true;
        else if(!c.to&&P.type==='UnaryExpression'&&P.operator==='!') ok=true;
        else if(!c.to&&P.type==='BinaryExpression'&&(P.operator==='==='||P.operator==='!==')&&((P.left===o.n&&P.right.type==='Literal'&&P.right.value===null)||(P.right===o.n&&P.left.type==='Literal'&&P.left.value===null))) ok=true; }
      if(!ok) bad[nm]=1; });
    Object.keys(cand).forEach(function(nm){ if(!bad[nm]&&(cand[nm].iv+cand[nm].to)>0) timerNames[nm]=cand[nm]; }); })();

  /* ---------- types (rough) ---------- */
  function isNum(n,loose){
    if(!n) return false;
    switch(n.type){
      case 'Literal': return typeof n.value==='number';
      case 'UnaryExpression': return n.operator==='-'||n.operator==='+'||(n.operator==='~');
      case 'UpdateExpression': return true;
      case 'BinaryExpression':
        if(/^(-|\*|\/|%|\*\*|<<|>>|>>>|&|\||\^)$/.test(n.operator)) return true;
        if(n.operator==='+') return isNum(n.left,loose)&&isNum(n.right,loose);
        return false;
      case 'ConditionalExpression': return isNum(n.consequent,loose)&&isNum(n.alternate,loose);
      case 'Identifier': return !loose&&facts.kinds[n.name]==='num';
      case 'MemberExpression': return !n.computed&&n.property.name==='length'||(n.object.type==='Identifier'&&n.object.name==='Math'&&!n.computed&&/^(PI|E|SQRT2|SQRT1_2|LN2|LN10)$/.test(n.property.name));
      case 'CallExpression':
        if(n.callee.type==='Identifier') return /^(parseInt|parseFloat|Number)$/.test(n.callee.name);
        if(n.callee.type==='MemberExpression'&&n.callee.object.type==='Identifier'&&n.callee.object.name==='Math'&&!/^(max|min)$/.test(n.callee.property.name||'')) return true;
        if(n.callee.type==='MemberExpression'&&n.callee.object.type==='Identifier'&&n.callee.object.name==='Math') return n.arguments.every(function(a){ return isNum(a,loose); });
        return false;
      default: return false; } }
  function isStr(n,loose){
    if(!n) return false;
    switch(n.type){
      case 'Literal': return typeof n.value==='string';
      case 'TemplateLiteral': return true;
      case 'BinaryExpression': return n.operator==='+'&&(isStr(n.left,loose)||isStr(n.right,loose));
      case 'ConditionalExpression': return isStr(n.consequent,loose)&&isStr(n.alternate,loose);
      case 'Identifier': return !loose&&facts.kinds[n.name]==='str';
      case 'CallExpression':
        if(n.callee.type==='Identifier') return n.callee.name==='String';
        return n.callee.type==='MemberExpression'&&!n.callee.computed&&STR_METHODS.test(n.callee.property.name);
      default: return false; } }

  /* ---------- scopes ---------- */
  var taken=Object.create(null);
  function Scope(parent,node){ this.parent=parent; this.node=node; this.vars=Object.create(null); }
  var prog=new Scope(null,ast);
  /* Blockly treats variable names that differ only in upper / lower case as one variable, so "taken" is keyed by the lower-case name */
  function lc(n){ return String(n).toLowerCase(); }
  function uniq(name){ var n=name, k=1; while(taken[lc(n)]){ k++; n=name+k; } taken[lc(n)]=n; return n; }
  function walkDecl(nodes,fn){ // declarations of one function body, not looking into nested functions
    (function w(n){
      if(!n||typeof n.type!=='string') return;
      if(FN_NODE.test(n.type)) return;
      if(n.type==='FunctionDeclaration'){ fn(n.id.name,'fn'); return; }
      if(n.type==='ClassDeclaration'){ fn(n.id.name,'class'); return; }
      if(n.type==='VariableDeclaration'){ var anyPat=n.declarations.some(function(d){ return d.id.type!=='Identifier'; });
        n.declarations.forEach(function(d){ collectPattern(d.id,function(nm){ fn(nm,anyPat||d.id.type!=='Identifier'?'pat':n.kind); }); if(d.init) w(d.init); }); return; }
      if(n.type==='CatchClause'){ if(n.param) collectPattern(n.param,function(nm){ fn(nm,'catch'); }); w(n.body); return; }
      for(var k in n){ if(k==='type'||k==='start'||k==='end') continue; var c=n[k];
        if(Array.isArray(c)) c.forEach(w); else if(c&&typeof c.type==='string') w(c); }
    })({type:'Block',body:nodes}); }
  function declareScope(scope,bodyNodes,params,isProg){
    (params||[]).forEach(function(p){ var o=taken[lc(p)]; if(o&&o!==p) hard('parameter name clashes with another name'); taken[lc(p)]=p; scope.vars[p]={name:p, unique:p, scope:scope, param:true}; });
    walkDecl(bodyNodes,function(nm,kind){
      if(scope.vars[nm]) return;
      var b={name:nm, scope:scope, kind:kind};
      if(!plainName(nm)||kind==='pat'||kind==='catch'||kind==='class'||(kind==='fn'&&!isProg)||(isProg&&taken[lc(nm)]&&taken[lc(nm)]!==nm)){ b.opaque=true; b.unique=nm; if(!taken[lc(nm)]) taken[lc(nm)]=nm; }
      else if(isProg){ b.unique=nm; taken[lc(nm)]=nm; }
      else b.unique=uniq(nm);
      if(kind==='fn') b.fn=true;
      scope.vars[nm]=b; }); }
  function shared(sc){ return sc===prog||sc.once===true; }
  function lookup(scope,name){ for(var s=scope;s;s=s.parent) if(s.vars[name]) return s.vars[name]; return null; }

  /* ---------- element facts from the page ---------- */
  function tagOf(id){ return String(env.tag(id)||'').toUpperCase(); }
  function staticId(node,cx){ // the id of the page element an expression stands for, or null
    if(!node) return null;
    if(node.type==='CallExpression'){
      var c=node.callee, a=node.arguments[0];
      if(node.arguments.length===1&&a&&a.type==='Literal'&&typeof a.value==='string'){
        if(c.type==='MemberExpression'&&!c.computed&&c.object.type==='Identifier'&&c.object.name==='document'){
          if(c.property.name==='getElementById') return a.value;
          if(c.property.name==='querySelector'&&/^#[\w-]+$/.test(a.value)) return a.value.slice(1); }
        if(c.type==='Identifier'&&c.name==='$'&&facts.dollar) return a.value; }
      return null; }
    if(node.type==='Identifier'){ var b=lookup(cx.scope,node.name); if(b&&b.elId&&!b.reassigned) return b.elId; if(!b&&env.hasEl(node.name)&&!/^(document|window|self|top|parent|frames)$/.test(node.name)) return node.name; }
    return null; }

  /* ---------- how raw JS text is written: identifiers are renamed to what the blocks call them ---------- */
  function idsIn(node,cb){ // identifiers that really refer to a variable (not .prop, not {key:}), skipping names declared by functions inside
    (function w(n,shadow){
      if(!n||typeof n.type!=='string') return;
      if(n.type==='Identifier'){ if(!shadow[n.name]) cb(n); return; }
      if(n.type==='MemberExpression'){ w(n.object,shadow); if(n.computed) w(n.property,shadow); return; }
      if(n.type==='Property'){ if(n.computed) w(n.key,shadow); if(!n.shorthand||true) w(n.value,shadow); return; }
      if(n.type==='MethodDefinition'||n.type==='PropertyDefinition'){ if(n.computed) w(n.key,shadow); w(n.value,shadow); return; }
      if(n.type==='LabeledStatement'){ w(n.body,shadow); return; }
      if((n.type==='BreakStatement'||n.type==='ContinueStatement')) return;
      if(/^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(n.type)){
        var sh=Object.create(shadow); n.params.forEach(function(p){ collectPattern(p,function(nm){ sh[nm]=1; }); });
        var body=n.body.type==='BlockStatement'?n.body.body:[n.body]; walkDecl(body,function(nm){ sh[nm]=1; });
        if(n.id&&n.type==='FunctionExpression') sh[n.id.name]=1;
        n.params.forEach(function(p){ if(p.type==='AssignmentPattern') w(p.right,sh); });
        w(n.body,sh); return; }
      for(var k in n){ if(k==='type'||k==='start'||k==='end') continue; var c=n[k];
        if(Array.isArray(c)) c.forEach(function(x){ w(x,shadow); }); else if(c&&typeof c.type==='string') w(c,shadow); }
    })(node,Object.create(null)); }
  function hasFunction(node){ var f=false; walkAll(node,function(n){ if(/^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(n.type)){ f=true; return false; } }); return f; }
  var GLOBALS=/^(document|window|Math|JSON|localStorage|sessionStorage|console|Object|Array|Date|Number|String|navigator|location|history|performance|Audio|Image|Promise|Intl|screen)$/;
  function globalObj(o,cx){ return o.type==='Identifier'&&GLOBALS.test(o.name)&&!lookup(cx.scope,o.name)&&!(o.name==='document'&&false); }
  var rawCx=null;
  function rawText(node,cx){
    var edits=[], fn=hasFunction(node);
    idsIn(node,function(id){
      var b=lookup(cx.scope,id.name);
      if(!b){ if(id.name==='$'&&facts.dollar) hard('$'); return; }
      b.read=true; if(timerNames[id.name]) throw {retryTimer:id.name};
      if(b.param&&b.hat){ if(b.hat==='key'||b.hat==='any') { if(b.unique!==id.name) edits.push([id.start,id.end,b.unique]); } else cx.escaped=true; return; }
      if(fn&&!shared(b.scope)&&!b.elId&&!b.canvasId) hard('closure over a local');
      if(b.unique!==id.name) edits.push([id.start,id.end,b.unique]); });
    edits.sort(function(a,b){ return b[0]-a[0]; });
    var s=code.slice(node.start,node.end), base=node.start;
    edits.forEach(function(e){ s=s.slice(0,e[0]-base)+e[2]+s.slice(e[1]-base); });
    return s; }
  function wholeRaw(node){ idsIn(node,function(id){ if(timerNames[id.name]&&lookup(prog,id.name)) throw {retryTimer:id.name}; var b=lookup(prog,id.name); if(b) b.read=true; }); stats.raw++; return blk('js_raw',{f:{CODE:srcOf(node)}}); }
  function rawVal(node,cx){ stats.raw++; return blk('js_val',{f:{CODE:rawText(node,cx).replace(/\s*\n\s*/g,' ')}}); }
  function rawStmt(node,cx){ stats.raw++; return blk('js_raw',{f:{CODE:rawText(node,cx)}}); }

  var stats={raw:0}, skipDecl={};
  var timerSeq=0;

  /* ---------- expressions ---------- */
  function lit(n){ return blk('text',{f:{TEXT:n}}); }
  function num(n){ return blk('math_number',{f:{NUM:n}}); }
  function ex(n,cx){
    switch(n.type){
      case 'Literal':
        if(typeof n.value==='number') return num(n.value);
        if(typeof n.value==='string') return lit(n.value);
        if(typeof n.value==='boolean') return blk('logic_boolean',{f:{BOOL:n.value?'TRUE':'FALSE'}});
        if(n.value===null&&!n.regex&&!n.bigint) return blk('logic_null');
        return rawVal(n,cx);
      case 'TemplateLiteral': {
        var parts=[]; n.quasis.forEach(function(q,i){ if(q.value.cooked) parts.push(lit(q.value.cooked)); if(i<n.expressions.length) parts.push(ex(n.expressions[i],cx)); });
        if(!parts.length) return lit('');
        if(parts.length===1&&n.expressions.length===0) return parts[0];
        var v={}; parts.forEach(function(p,i){ v['ADD'+i]=p; }); return blk('text_join',{m:'<mutation items="'+parts.length+'"></mutation>',v:v}); }
      case 'Identifier': {
        if(n.name==='undefined') return rawVal(n,cx);
        var b=lookup(cx.scope,n.name);
        if(!b){ var id=staticId(n,cx); if(id) return blk('js_el',{f:{EL:id}}); return rawVal(n,cx); }
        if(b.elId&&!b.reassigned) return blk('js_el',{f:{EL:b.elId}});
        if(b.opaque||b.fn||b.param&&b.hat) return rawVal(n,cx);
        if(timerNames[n.name]) return blk('time_running',{f:{NAME:'timer_'+b.unique.replace(/[^\w]/g,'_')}});
        b.read=true; return blk('variables_get',{f:{VAR:b.unique}}); }
      case 'UnaryExpression':
        if(n.operator==='!') return blk('logic_negate',{v:{BOOL:exCond(n.argument,cx)}});
        if(n.operator==='-'){ if(n.argument.type==='Literal'&&typeof n.argument.value==='number') return num(-n.argument.value); return blk('math_single',{f:{OP:'NEG'},v:{NUM:ex(n.argument,cx)}}); }
        if(n.operator==='+') return blk('js_num',{f:{AS:'Number'},v:{X:ex(n.argument,cx)}});
        bail('unary '+n.operator);
      case 'BinaryExpression': return binary(n,cx);
      case 'LogicalExpression':
        if(n.operator==='&&'||n.operator==='||'){ // as a value, "a || b" can be a number or text, so only untyped or true/false parts go into the AND / OR block
          var la2=ex(n.left,cx), lb2=ex(n.right,cx), t1=outType(la2), t2=outType(lb2);
          if((t1&&t1!=='Boolean')||(t2&&t2!=='Boolean')) return rawVal(n,cx);
          return blk('logic_operation',{f:{OP:n.operator==='&&'?'AND':'OR'},v:{A:la2,B:lb2}}); }
        bail('??');
      case 'ConditionalExpression': return blk('logic_ternary',{v:{IF:exCond(n.test,cx),THEN:ex(n.consequent,cx),ELSE:ex(n.alternate,cx)}});
      case 'ArrayExpression': {
        var v2={}; n.elements.forEach(function(e,i){ if(!e||e.type==='SpreadElement') bail('array spread'); v2['ADD'+i]=ex(e,cx); });
        return blk('lists_create_with',{m:'<mutation items="'+n.elements.length+'"></mutation>',v:v2}); }
      case 'MemberExpression': return member(n,cx);
      case 'CallExpression': return call(n,cx,false);
      case 'NewExpression': {
        if(n.callee.type!=='Identifier'||n.arguments.length>4||n.arguments.some(function(a){ return a.type==='SpreadElement'||FN_NODE.test(a.type); })) bail('new');
        if(!lookup(cx.scope,n.callee.name)&&!/^[A-Z]\w*$/.test(n.callee.name)) bail('new lower');
        return blk('js_new',{f:{NAME:n.callee.name},v:argVals(n.arguments,cx)}); }
      default: bail('expr '+n.type); } }
  function arrayOf(n,cx){ // the block loop walks indexes, so a page list (NodeList), string or Set is made into a real array first
    if(n.type==='ArrayExpression') return ex(n,cx);
    return blk('js_call',{f:{NAME:'Array.from'},v:argVals([n],cx)}); }
  function argVals(args,cx){ var v={}; args.forEach(function(a,i){ if(a.type==='SpreadElement') bail('spread'); v['A'+i]=ex(a,cx); }); return v; }
  function exCond(n,cx){ // a test: only whether it is true matters, so numbers and text may be wrapped as "참으로 치는 값"
    if(n.type==='LogicalExpression'&&(n.operator==='&&'||n.operator==='||')) return blk('logic_operation',{f:{OP:n.operator==='&&'?'AND':'OR'},v:{A:exCond(n.left,cx),B:exCond(n.right,cx)}});
    var x=ex(n,cx), t=outType(x);
    if(t==='Number'||t==='String'||t==='Array') return '<block type="js_bool"><value name="X">'+x+'</value></block>';
    return x; }
  function exRaw(n,cx){ try{ return ex(n,cx); }catch(e){ if(!e.bail||e.hard) throw e; return rawVal(n,cx); } }

  function binary(n,cx){
    var op=n.operator;
    if(op==='+'){
      if(isStr(n,false)){ var items=[]; (function flat(x){ if(x.type==='BinaryExpression'&&x.operator==='+'&&isStr(x.left,false)) { flat(x.left); items.push(x.right); } else items.push(x); })(n);
        // a string chain is flattened only down its left side; "1 + 2 + 'a'" keeps (1 + 2) as one item
        if(items.length>=2){ var v={}; items.forEach(function(it,i){ v['ADD'+i]=ex(it,cx); }); return blk('text_join',{m:'<mutation items="'+items.length+'"></mutation>',v:v}); } }
      var la=ex(n.left,cx), lb=ex(n.right,cx), ta=outType(la), tb=outType(lb);
      if(ta==='String'||tb==='String') return blk('text_join',{m:'<mutation items="2"></mutation>',v:{ADD0:la,ADD1:lb}});
      if(ta==='Boolean'||tb==='Boolean'||ta==='Array'||tb==='Array') bail('plus kinds');
      return blk('math_arithmetic',{f:{OP:'ADD'},v:{A:la,B:lb}}); }
    if(op==='-') return blk('math_arithmetic',{f:{OP:'MINUS'},v:{A:ex(n.left,cx),B:ex(n.right,cx)}});
    if(op==='*') return blk('math_arithmetic',{f:{OP:'MULTIPLY'},v:{A:ex(n.left,cx),B:ex(n.right,cx)}});
    if(op==='/') return blk('math_arithmetic',{f:{OP:'DIVIDE'},v:{A:ex(n.left,cx),B:ex(n.right,cx)}});
    if(op==='**') return blk('math_arithmetic',{f:{OP:'POWER'},v:{A:ex(n.left,cx),B:ex(n.right,cx)}});
    if(op==='%') return blk('math_modulo',{v:{DIVIDEND:ex(n.left,cx),DIVISOR:ex(n.right,cx)}});
    if((op==='==='||op==='!==')&&((n.left.type==='Identifier'&&timerNames[n.left.name]&&n.right.type==='Literal'&&n.right.value===null)||(n.right.type==='Identifier'&&timerNames[n.right.name]&&n.left.type==='Literal'&&n.left.value===null))){
      var tid=n.left.type==='Identifier'?n.left:n.right, run=ex(tid,cx); return op==='==='?blk('logic_negate',{v:{BOOL:run}}):run; }
    if(CMP[op]) return blk('logic_compare',{f:{OP:CMP[op]},v:{A:ex(n.left,cx),B:ex(n.right,cx)}});
    if(op==='=='||op==='!='){ // the block compares with === : the same answer only when one side is a plain string or true/false
      var lit1=function(x){ return x.type==='Literal'&&(typeof x.value==='string'||typeof x.value==='boolean'); };
      if(lit1(n.left)||lit1(n.right)) return blk('logic_compare',{f:{OP:op==='=='?'EQ':'NEQ'},v:{A:ex(n.left,cx),B:ex(n.right,cx)}}); }
    bail('binary '+op); }

  /* DOM and object members */
  function domRead(n,cx){ // el.textContent / el.value
    if(n.computed||n.property.type!=='Identifier') return null;
    var id=staticId(n.object,cx); if(!id) return null; var p=n.property.name, tag=tagOf(id);
    if(!tag) return null;
    if((p==='textContent'||p==='innerText')&&!/^(INPUT|TEXTAREA|SELECT|IMG|CANVAS)$/.test(tag)) return blk('val_get',{f:{EL:id,PROP:'text'}});
    if(p==='value'&&tag==='INPUT') return blk('val_get',{f:{EL:id,PROP:'text'}});
    if(p==='offsetWidth') return blk('val_get',{f:{EL:id,PROP:'width'}});
    if(p==='offsetHeight') return blk('val_get',{f:{EL:id,PROP:'height'}});
    return null; }
  function member(n,cx){
    var r=domRead(n,cx); if(r) return r;
    if(!n.computed&&n.property.type==='Identifier'){
      var p=n.property.name;
      if(n.object.type==='Identifier'&&n.object.name==='Math'&&MATH_CONST[p]&&!lookup(cx.scope,'Math')) return blk('math_constant',{f:{CONSTANT:p}});
      // event object of the handler we are in
      if(p==='value'&&n.object.type==='MemberExpression'&&!n.object.computed&&n.object.property.name==='target'&&n.object.object.type==='Identifier'){
        var pb2=lookup(cx.scope,n.object.object.name); if(pb2&&pb2.param&&pb2.hat==='input'&&pb2.hatEl) return blk('val_get',{f:{EL:pb2.hatEl,PROP:'text'}}); }
      if(n.object.type==='Identifier'){ var b=lookup(cx.scope,n.object.name);
        if(b&&b.param&&b.hat){ if(p==='key'&&(b.hat==='key'||b.hat==='any')) return blk('val_key');
          if((p==='offsetX'||p==='offsetY')&&b.hat==='click') return blk('val_mouse',{f:{AXIS:p==='offsetX'?'x':'y'}});
          bail('event property'); } }
      if(p==='length'){ var kd=n.object.type==='Identifier'?(function(){ var bb=lookup(cx.scope,n.object.name); return bb&&!bb.opaque?facts.kinds[bb.name]:null; })():null;
        if(isStr(n.object,false)&&kd!=='list') return blk('text_length',{v:{VALUE:ex(n.object,cx)}});
        if(kd==='list'||n.object.type==='ArrayExpression') return blk('lists_length',{v:{VALUE:ex(n.object,cx)}}); }
      if(globalObj(n.object,cx)&&NAME_RE.test(p)) return blk('js_prop',{f:{NAME:n.object.name+'.'+p}});
      if(NAME_RE.test(p)) return blk('js_prop',{f:{NAME:p},v:{OBJ:ex(n.object,cx)}});
      bail('prop'); }
    if(n.computed) return blk('js_idx',{v:{OBJ:ex(n.object,cx),I:ex(n.property,cx)}});
    bail('member'); }

  /* calls. asStmt: returns a statement block instead of a value */
  var MATH1={abs:'ABS',sqrt:'ROOT',log:'LN',exp:'EXP'}, ROUND={round:'ROUND',floor:'ROUNDDOWN',ceil:'ROUNDUP'};
  function same(a,b){ return a&&b&&srcOf(a).replace(/\s+/g,'')===srcOf(b).replace(/\s+/g,''); }
  function randomInt(n,cx){ // Math.floor(Math.random()*K)  /  Math.floor(Math.random()*(H-L+1))+L
    function isRand(x){ return x.type==='CallExpression'&&x.callee.type==='MemberExpression'&&!x.callee.computed&&x.callee.object.type==='Identifier'&&x.callee.object.name==='Math'&&x.callee.property.name==='random'&&!x.arguments.length; }
    function floorOf(x){ return x.type==='CallExpression'&&x.callee.type==='MemberExpression'&&!x.callee.computed&&x.callee.object.type==='Identifier'&&x.callee.object.name==='Math'&&x.callee.property.name==='floor'&&x.arguments.length===1?x.arguments[0]:null; }
    function times(x){ if(x.type!=='BinaryExpression'||x.operator!=='*') return null; if(isRand(x.left)) return x.right; if(isRand(x.right)) return x.left; return null; }
    var lo=null, f=null;
    if(n.type==='BinaryExpression'&&n.operator==='+'){ f=floorOf(n.left); if(f) lo=n.right; else { f=floorOf(n.right); if(f) lo=n.left; } }
    else f=floorOf(n);
    if(!f) return null; var k=times(f); if(!k) return null;
    if(lo===null){ if(k.type==='Literal'&&typeof k.value==='number'&&k.value>=1&&k.value===Math.floor(k.value)) return blk('math_random_int',{v:{FROM:num(0),TO:num(k.value-1)}}); return null; }
    if(k.type==='Literal'&&typeof k.value==='number'&&lo.type==='Literal'&&typeof lo.value==='number'&&k.value>=1) return blk('math_random_int',{v:{FROM:ex(lo,cx),TO:num(lo.value+k.value-1)}});
    // (H - L + 1) with the same L
    if(k.type==='BinaryExpression'&&k.operator==='+'&&k.right.type==='Literal'&&k.right.value===1&&k.left.type==='BinaryExpression'&&k.left.operator==='-'&&same(k.left.right,lo)) return blk('math_random_int',{v:{FROM:ex(lo,cx),TO:ex(k.left.left,cx)}});
    return null; }
  function procCall(name,args,cx,asStmt){
    var p=procs[name]; if(!p) return null;
    if(p.params.length!==args.length||args.some(function(a){ return a.type==='SpreadElement'; })) return null;
    var m='<mutation name="'+esc(name)+'">'+p.params.map(function(a){ return '<arg name="'+esc(a)+'"></arg>'; }).join('')+'</mutation>', v={}; args.forEach(function(a,i){ v['ARG'+i]=ex(a,cx); });
    if(p.returns) { if(asStmt) return null; return blk('procedures_callreturn',{m:m,v:v}); }
    if(!asStmt) return null; return blk('procedures_callnoreturn',{m:m,v:v}); }
  function call(n,cx,asStmt){
    var c=n.callee, args=n.arguments;
    if(args.some(function(a){ return a.type==='SpreadElement'; })) bail('spread');
    // an element: document.getElementById('x')
    var sid=staticId(n,cx); if(sid&&!asStmt) return blk('js_el',{f:{EL:sid}});
    if(c.type==='Identifier'){
      var nm=c.name, b=lookup(cx.scope,nm);
      if(!asStmt){ var ri=randomInt(n,cx); if(ri) return ri; }
      if(b&&b.fn&&procs[nm]){ var pc=procCall(nm,args,cx,asStmt); if(pc) return pc; }
      if(b&&!b.fn&&!b.opaque) bail('call of a variable');
      if(!b){
        if(nm==='alert'&&asStmt&&args.length===1) return blk('act_alert',{v:{VALUE:ex(args[0],cx)}});
        if(nm==='prompt'&&!asStmt&&args.length===1) return blk('val_prompt',{v:{VALUE:ex(args[0],cx)}});
        if(!asStmt&&args.length===1&&/^(parseInt|parseFloat|Number|String)$/.test(nm)) return blk('js_num',{f:{AS:nm},v:{X:ex(args[0],cx)}});
        if(!asStmt&&nm==='parseInt'&&args.length===2&&args[1].type==='Literal'&&args[1].value===10) return blk('js_num',{f:{AS:'parseInt'},v:{X:ex(args[0],cx)}});
        if((nm==='clearInterval'||nm==='clearTimeout')&&asStmt&&args.length===1&&args[0].type==='Identifier'){ var tb=lookup(cx.scope,args[0].name); if(tb&&!tb.opaque&&timerNames[tb.name]) return blk('time_stop',{f:{NAME:'timer_'+tb.unique.replace(/[^\w]/g,'_')}}); bail('clear'); }
        if(nm==='setTimeout'||nm==='setInterval') return timerCall(n,cx,asStmt,null);
        if(nm==='requestAnimationFrame'||nm==='eval'||nm==='Function') bail(nm); }
      if(b&&b.fn&&!procs[nm]) { /* a function we left as JS */ }
      if(args.length>4||args.some(function(a){ return FN_NODE.test(a.type); })) bail('call args');
      if(!NAME_RE.test(nm)) bail('call name');
      if(b&&b.opaque&&b.kind!=='fn') bail('opaque call');
      return blk(asStmt?'js_calls':'js_call',{f:{NAME:nm},v:argVals(args,cx)}); }
    if(c.type!=='MemberExpression'||c.computed||c.property.type!=='Identifier') bail('callee');
    var m=c.property.name, o=c.object;
    // Math.*
    if(o.type==='Identifier'&&o.name==='Math'&&!lookup(cx.scope,'Math')&&!asStmt){
      var ri2=randomInt(n,cx); if(ri2) return ri2;
      if(m==='random'&&!args.length) return blk('math_random_float');
      if(ROUND[m]&&args.length===1) return blk('math_round',{f:{OP:ROUND[m]},v:{NUM:ex(args[0],cx)}});
      if(MATH1[m]&&args.length===1) return blk('math_single',{f:{OP:MATH1[m]},v:{NUM:ex(args[0],cx)}});
      if(m==='pow'&&args.length===2) return blk('math_arithmetic',{f:{OP:'POWER'},v:{A:ex(args[0],cx),B:ex(args[1],cx)}});
      if((m==='max'||m==='min')&&args.length>=2){ var lv={}; args.forEach(function(a,i){ lv['ADD'+i]=ex(a,cx); });
        return blk('math_on_list',{m:'<mutation op="'+m.toUpperCase()+'"></mutation>',f:{OP:m.toUpperCase()},v:{LIST:blk('lists_create_with',{m:'<mutation items="'+args.length+'"></mutation>',v:lv})}}); } }
    // console.log
    if(o.type==='Identifier'&&o.name==='console'&&m==='log'&&asStmt&&args.length===1&&!lookup(cx.scope,'console')) return blk('act_log',{v:{VALUE:ex(args[0],cx)}});
    // new Date().getHours()
    if(o.type==='NewExpression'&&o.callee.type==='Identifier'&&o.callee.name==='Date'&&!o.arguments.length&&!args.length&&/^(getHours|getMinutes|getSeconds|getDay|getDate)$/.test(m)&&!asStmt) return blk('val_time',{f:{U:m}});
    // events on elements and the document
    if(m==='addEventListener'&&asStmt) return bail('listener');
    // forEach
    if(m==='forEach'&&asStmt&&args.length===1&&FN_NODE.test(args[0].type)) return forEachCall(n,cx);
    // text and list helpers
    if(!asStmt){
      if(m==='toUpperCase'&&!args.length) return blk('text_changeCase',{f:{CASE:'UPPERCASE'},v:{TEXT:ex(o,cx)}});
      if(m==='toLowerCase'&&!args.length) return blk('text_changeCase',{f:{CASE:'LOWERCASE'},v:{TEXT:ex(o,cx)}});
      if(m==='trim'&&!args.length) return blk('text_trim',{f:{MODE:'BOTH'},v:{TEXT:ex(o,cx)}});
      if(m==='includes'&&args.length===1) return blk('js_has',{v:{LIST:ex(o,cx),VALUE:ex(args[0],cx)}});
      if(m==='split'&&args.length===1) return blk('lists_split',{m:'<mutation mode="SPLIT"></mutation>',f:{MODE:'SPLIT'},v:{INPUT:ex(o,cx),DELIM:ex(args[0],cx)}});
      if(m==='join'&&args.length===1) return blk('lists_split',{m:'<mutation mode="JOIN"></mutation>',f:{MODE:'JOIN'},v:{INPUT:ex(o,cx),DELIM:ex(args[0],cx)}});
    } else if(m==='push'&&args.length===1) return blk('js_push',{v:{LIST:ex(o,cx),VALUE:ex(args[0],cx)}});
    if(args.length>4||args.some(function(a){ return FN_NODE.test(a.type); })) bail('method args');
    if(globalObj(o,cx)) return blk(asStmt?'js_calls':'js_call',{f:{NAME:o.name+'.'+m},v:argVals(args,cx)});
    return blk(asStmt?'js_mcalls':'js_mcall',{f:{NAME:m},v:Object.assign({OBJ:ex(o,cx)},argVals(args,cx))}); }

  /* ---------- timers ---------- */
  function msSec(n,cx){ // the seconds block value for a delay in ms
    if(n&&n.type==='Literal'&&typeof n.value==='number') return num(+(n.value/1000).toFixed(6));
    if(!n) return num(0);
    return blk('math_arithmetic',{f:{OP:'DIVIDE'},v:{A:ex(n,cx),B:num(1000)}}); }
  function callbackBody(fnNode,cx,hat){ // statements of a callback converted inline; hat: kind of handler param
    if(fnNode.async||fnNode.generator) bail('async');
    var s=new Scope(cx.scope,fnNode), params=fnNode.params, pname=null;
    var hatEl=cx.nextHatEl||null; cx.nextHatEl=null;
    if(params.length>1) bail('params'); if(params.length===1){ if(params[0].type!=='Identifier') bail('param pattern'); pname=params[0].name; }
    var body=fnNode.body.type==='BlockStatement'?fnNode.body.body:[{type:'ExpressionStatement',expression:fnNode.body,start:fnNode.body.start,end:fnNode.body.end}];
    declareScope(s,body,null,false);
    if(pname){ s.vars[pname]={name:pname, unique:hat?'e':pname, scope:s, param:true, hat:hat||null, hatEl:hatEl}; if(!hat) s.vars[pname].opaque=false; }
    var cx2={scope:s, ownScope:s, hat:hat||null, proc:false, retOK:true, loop:0, fill:{}, escaped:false, isArrowExpr:fnNode.body.type!=='BlockStatement'};
    if(!hat&&pname) bail('callback param');
    var list=stList(body,cx2);
    if(cx2.escaped) bail('event object used');
    // anything the body needs from a local of an enclosing function is not safe to share
    idsIn(fnNode.body,function(id){ var b=lookup(s,id.name); if(b&&b.scope!==s&&!shared(b.scope)&&!b.elId&&!b.canvasId) hard('closure over a local'); });
    return list; }
  function timerCall(n,cx,asStmt,assignName){
    var args=n.arguments, kind=n.callee.name, fn=args[0], ms=args[1];
    if(!asStmt) bail('timer value');
    if(args.length>2||!ms) bail('timer args');
    var body;
    if(FN_NODE.test(fn.type)) body=callbackBody(fn,cx,null);
    else if(fn.type==='Identifier'){ var fb=lookup(cx.scope,fn.name); if(!fb||!fb.fn) bail('timer fn'); var pc=procCall(fn.name,[],cx,true)||blk('js_calls',{f:{NAME:fn.name}}); body=[pc]; }
    else bail('timer fn');
    if(kind==='setTimeout'){
      if(assignName) return blk('time_after',{f:{NAME:assignName},v:{SEC:msSec(ms,cx)},s:{DO:body}});
      return blk('act_after',{v:{SEC:msSec(ms,cx)},s:{DO:body}}); }
    var name=assignName||(function(){ timerSeq++; return 'timer'+timerSeq; })();
    return blk('time_every',{f:{NAME:name},v:{SEC:msSec(ms,cx)},s:{DO:body}}); }
  function forEachCall(n,cx){
    var fn=n.arguments[0], o=n.callee.object;
    if(fn.async||fn.generator||fn.params.length!==1||fn.params[0].type!=='Identifier') bail('forEach');
    var hasRet=false; walkAll(fn.body,function(x){ if(FN_NODE.test(x.type)||x.type==='FunctionDeclaration') return false; if(x.type==='ReturnStatement') hasRet=true; }); if(hasRet) bail('forEach return');
    var pn=fn.params[0].name, s=new Scope(cx.scope,fn), body=fn.body.type==='BlockStatement'?fn.body.body:[{type:'ExpressionStatement',expression:fn.body,start:fn.body.start,end:fn.body.end}];
    declareScope(s,body,null,false);
    var pb={name:pn, scope:s, kind:'let'}; if(!plainName(pn)) bail('forEach param name'); pb.unique=uniq(pn); s.vars[pn]=pb;
    var cx2=Object.assign({},cx,{scope:s, loop:cx.loop+1, fill:Object.assign({},cx.fill)});
    var list=stList(body,cx2);
    if(hasFunction(fn.body)) idsIn(fn.body,function(id){ var b=lookup(s,id.name); if(b&&b.scope!==s&&!shared(b.scope)&&!b.elId&&!b.canvasId) hard('closure over a local'); });
    return blk('controls_forEach',{f:{VAR:pb.unique},v:{LIST:arrayOf(o,cx)},s:{DO:list}}); }

  /* ---------- event listeners ---------- */
  function listener(n,cx){ // statement  X.addEventListener('click', fn)  ->  a hat block, or null
    var c=n.callee; if(!(n.type==='CallExpression'&&c.type==='MemberExpression'&&!c.computed&&c.property.name==='addEventListener')) return null;
    var a=n.arguments; if(a.length<2||a[0].type!=='Literal'||typeof a[0].value!=='string'||a.length>2) return null;
    var type=a[0].value, h=a[1], o=c.object, id=staticId(o,cx);
    var isDoc=o.type==='Identifier'&&o.name==='document'&&!lookup(cx.scope,'document'), isWin=o.type==='Identifier'&&o.name==='window'&&!lookup(cx.scope,'window');
    if(h.type==='Identifier'&&!FN_NODE.test(h.type)){ var hb=lookup(cx.scope,h.name); if(!hb||!hb.fn||!procs[h.name]||procs[h.name].params.length) return null;
      var callStmt=procCall(h.name,[],cx,true);
      if(callStmt&&id&&type==='click') return blk('ev_click',{f:{EL:id},s:{DO:[callStmt]}});
      if(callStmt&&isDoc&&(type==='keydown'||type==='keyup')) return null;
      return null; }
    if(!FN_NODE.test(h.type)) return null;
    if(id&&type==='click') return blk('ev_click',{f:{EL:id},s:{DO:callbackBody(h,cx,'click')}});
    if(id&&type==='input'&&tagOf(id)==='INPUT'){ cx.nextHatEl=id; return blk('ev_change',{f:{EL:id},s:{DO:callbackBody(h,cx,'input')}}); }
    if((isDoc||isWin)&&(type==='keydown'||type==='keyup')){
      var pname=h.params.length===1&&h.params[0].type==='Identifier'?h.params[0].name:null;
      var hat=type==='keyup'?'key':'key';
      // a handler made only of  if (e.key === 'x') { ... }  becomes one key block per key
      if(type==='keydown'&&pname&&h.body.type==='BlockStatement'&&!h.async){
        var ifs=h.body.body, okAll=ifs.length>0&&ifs.every(function(s){ if(s.type!=='IfStatement'||s.alternate) return false; var t=s.test; return t.type==='BinaryExpression'&&(t.operator==='==='||t.operator==='==')&&t.left.type==='MemberExpression'&&!t.left.computed&&t.left.property.name==='key'&&t.left.object.type==='Identifier'&&t.left.object.name===pname&&t.right.type==='Literal'&&typeof t.right.value==='string'&&keyOk(t.right.value)&&!/^(Tab|Backspace)$/.test(t.right.value); });
        if(okAll){ var blocks=ifs.map(function(s){ var inner=s.consequent.type==='BlockStatement'?s.consequent.body:[s.consequent];
            var fake={type:'FunctionExpression',params:h.params,body:{type:'BlockStatement',body:inner,start:s.consequent.start,end:s.consequent.end},async:false,generator:false,start:s.consequent.start,end:s.consequent.end};
            return blk('ev_key',{f:{KEY:s.test.right.value},s:{DO:callbackBody(fake,cx,'key')}}); });
          return {multi:blocks}; } }
      return blk(type==='keyup'?'ev_keyup':'ev_key',{f:{KEY:'any'},s:{DO:callbackBody(h,cx,'any')}}); }
    if((isDoc&&type==='DOMContentLoaded')||(isWin&&type==='load')) return {inline:inlineBody(h,cx)};
    return null; }
  function inlineBody(h,cx){ // a ready / load callback: its statements go straight into "페이지가 열리면"
    if(h.async||h.generator||h.params.length) bail('ready params');
    var s=new Scope(cx.scope,h), body=h.body.type==='BlockStatement'?h.body.body:[h.body]; if(h.body.type!=='BlockStatement') bail('ready expr');
    s.once=true; declareScope(s,body,null,false);
    var cx2=Object.assign({},cx,{scope:s,ownScope:s,retOK:false,fill:{}});
    return stList(body,cx2); }

  /* ---------- statements ---------- */
  var procs=Object.create(null);
  function simplePure(n){ // an expression that can be evaluated twice without a difference
    if(!n) return false;
    if(n.type==='Identifier'||n.type==='Literal') return true;
    if(n.type==='MemberExpression') return simplePure(n.object)&&(!n.computed||simplePure(n.property));
    if(n.type==='CallExpression') return staticId(n,{scope:prog})!==null&&true;
    return false; }
  function assignTo(target,valueXml,cx,node){ // target = value
    if(target.type==='Identifier'){
      var b=lookup(cx.scope,target.name);
      if(!b){ if(!plainName(target.name)) bail('assign to a global'); /* an undeclared variable: the blocks create it */
        b={name:target.name, unique:target.name, scope:prog, kind:'var'}; prog.vars[target.name]=b; taken[lc(target.name)]=target.name; }
      if(b.opaque||b.fn||(b.param&&b.hat)) bail('assign opaque');
      b.read=true; b.reassigned=true;
      return blk('variables_set',{f:{VAR:b.unique},v:{VALUE:valueXml}}); }
    if(target.type==='MemberExpression'){
      if(!target.computed&&target.property.type==='Identifier'){
        if(globalObj(target.object,cx)) return blk('js_propset',{f:{NAME:target.object.name+'.'+target.property.name},v:{VALUE:valueXml}});
        return blk('js_propset',{f:{NAME:target.property.name},v:{OBJ:ex(target.object,cx),VALUE:valueXml}}); }
      if(target.computed) return blk('js_idxset',{v:{OBJ:ex(target.object,cx),I:ex(target.property,cx),VALUE:valueXml}}); }
    bail('assign target'); }
  function pxNum(r,cx){ // 'NNpx'  or  expr + 'px'  ->  number block
    if(r.type==='Literal'&&typeof r.value==='string'){ var m=/^(-?\d+(?:\.\d+)?)px$/.exec(r.value); if(m) return num(+m[1]); return null; }
    if(r.type==='BinaryExpression'&&r.operator==='+'&&r.right.type==='Literal'&&r.right.value==='px') return ex(r.left,cx);
    if(r.type==='TemplateLiteral'&&r.quasis.length===2&&r.quasis[0].value.cooked===''&&r.quasis[1].value.cooked==='px'&&r.expressions.length===1) return ex(r.expressions[0],cx);
    return null; }
  function domAssign(n,cx){ // el.textContent = x  /  el.style.color = x  ...  -> friendly blocks, or null
    var L=n.left; if(L.type!=='MemberExpression'||L.computed||L.property.type!=='Identifier') return null;
    var p=L.property.name, R=n.right, op=n.operator;
    var id=staticId(L.object,cx);
    if(id){ var tag=tagOf(id); if(!tag) return null;
      var textOk=(p==='textContent'||p==='innerText')&&!/^(INPUT|TEXTAREA|SELECT|IMG|CANVAS)$/.test(tag);
      if(op==='='){
        if(textOk||(p==='value'&&tag==='INPUT')||(p==='src'&&tag==='IMG')) return blk('act_set',{f:{EL:id},v:{VALUE:ex(R,cx)}});
        if(p==='innerHTML'&&R.type==='Literal'&&typeof R.value==='string'&&!/[<&]/.test(R.value)&&!/^(INPUT|TEXTAREA|SELECT|IMG|CANVAS)$/.test(tag)) return blk('act_set',{f:{EL:id},v:{VALUE:ex(R,cx)}}); }
      if(op==='+='&&(textOk||(p==='value'&&tag==='INPUT'))&&tag!=='UL') return blk('act_append',{f:{EL:id},v:{VALUE:ex(R,cx)}}); }
    // el.style.X = ...
    if(op==='='&&L.object.type==='MemberExpression'&&!L.object.computed&&L.object.property.name==='style'){
      var sid=staticId(L.object.object,cx); if(!sid||!tagOf(sid)) return null;
      if(p==='color') return blk('act_style',{f:{EL:sid,PROP:'color'},v:{VALUE:ex(R,cx)}});
      if(p==='background'||p==='backgroundColor') return blk('act_style',{f:{EL:sid,PROP:'background'},v:{VALUE:ex(R,cx)}});
      if(p==='display'&&R.type==='Literal'){ if(R.value==='none') return blk('act_show',{f:{EL:sid,MODE:'hide'}}); if(R.value==='') return blk('act_show',{f:{EL:sid,MODE:'show'}}); }
      if(p==='fontSize'||p==='width'||p==='height'){ var nv=pxNum(R,cx); if(nv) return blk('act_size',{f:{EL:sid,PROP:p},v:{N:nv}}); }
      if(p==='opacity'&&R.type==='Literal'&&typeof R.value==='number') return blk('act_size',{f:{EL:sid,PROP:'opacity'},v:{N:num(+(R.value*100).toFixed(4))}});
      if(p==='transform'&&R.type==='TemplateLiteral'&&R.quasis.length===2&&R.quasis[0].value.cooked==='rotate('&&R.quasis[1].value.cooked==='deg)'&&R.expressions.length===1) return blk('act_size',{f:{EL:sid,PROP:'rotate'},v:{N:ex(R.expressions[0],cx)}});
      if(p==='transform'&&R.type==='Literal'){ var mm=/^rotate\((-?\d+(?:\.\d+)?)deg\)$/.exec(String(R.value)); if(mm) return blk('act_size',{f:{EL:sid,PROP:'rotate'},v:{N:num(+mm[1])}}); } }
    return null; }
  var OPMAP={'+=':'+','-=':'-','*=':'*','/=':'/','%=':'%','**=':'**'};
  function compound(n,cx){ // x += y  ->  x = x + y
    var op=OPMAP[n.operator]; if(!op) bail('assign op '+n.operator);
    if(n.left.type==='Identifier'&&n.operator==='+='&&!isStr(n.right,false)){
      var b=lookup(cx.scope,n.left.name);
      if(b&&!b.opaque&&!b.fn&&!b.param&&facts.kinds[b.name]==='num'&&isNum(n.right,false)){ b.read=true; b.reassigned=true; return blk('math_change',{f:{VAR:b.unique},v:{DELTA:ex(n.right,cx)}}); } }
    if(n.left.type==='Identifier'&&n.operator==='-='){
      var b2=lookup(cx.scope,n.left.name);
      if(b2&&!b2.opaque&&!b2.fn&&!b2.param&&facts.kinds[b2.name]==='num'){ b2.read=true; b2.reassigned=true; return blk('math_change',{f:{VAR:b2.unique},v:{DELTA:blk('math_single',{f:{OP:'NEG'},v:{NUM:ex(n.right,cx)}})}}); } }
    if(n.left.type==='MemberExpression'&&!simplePure(n.left)) bail('impure compound target');
    var fake={type:'BinaryExpression',operator:op,left:n.left,right:n.right,start:n.start,end:n.end};
    return assignTo(n.left,binary(fake,cx),cx,n); }
  function varDecl(node,cx){
    var out=[];
    node.declarations.forEach(function(d){
      if(d.id.type!=='Identifier') bail('pattern');
      if(dollarDecls.indexOf(d)>=0) return;
      var b=lookup(cx.scope,d.id.name);
      if(!b) bail('undeclared');
      if(b.opaque){ stats.raw++; out.push(blk('js_raw',{f:{CODE:node.kind+' '+rawText(d,cx)+';'}})); return; }
      if(!d.init&&!timerNames[d.id.name]) return;
      if(timerNames[d.id.name]&&!b.opaque){ if(d.init&&d.init.type==='CallExpression') out.push(timerCall(d.init,cx,true,'timer_'+b.unique.replace(/[^\w]/g,'_'))); return; }
      var sid=staticId(d.init,cx);
      if(sid&&node.kind==='const'&&facts.assigns[d.id.name]===1){ b.elId=sid; if(skipDecl[b.unique+'#'+d.start]) return; }
      var cid=canvasOfInit(d.init,cx);
      if(cid&&node.kind==='const'&&facts.assigns[d.id.name]===1){ b.canvasId=cid; if(skipDecl[b.unique+'#'+d.start]) return; }
      if(FN_NODE.test(d.init.type)){ // const f = () => {...} that became a procedure is handled elsewhere; here it stays JS
        var pr=procs[d.id.name]; if(pr&&pr.decl===d) return; }
      b.read=b.read||false; b.reassigned=b.reassigned||false;
      var val; try{ val=ex(d.init,cx); }catch(e){ if(!e.bail||e.hard) throw e; val=rawVal(d.init,cx); }
      out.push(blk('variables_set',{f:{VAR:b.unique},v:{VALUE:val}})); });
    return out; }
  function canvasOfInit(init,cx){ // canvas.getContext('2d') with a known canvas
    if(init&&init.type==='CallExpression'&&init.callee.type==='MemberExpression'&&!init.callee.computed&&init.callee.property.name==='getContext'&&init.arguments.length===1&&init.arguments[0].type==='Literal'&&init.arguments[0].value==='2d'){
      var id=staticId(init.callee.object,cx); if(id&&tagOf(id)==='CANVAS') return id; }
    return null; }
  function canvasId(node,cx){ // ctx variable -> its canvas id
    if(node.type==='Identifier'){ var b=lookup(cx.scope,node.name); if(b&&b.canvasId) return b.canvasId; }
    return canvasOfInit(node,cx); }

  /* canvas: ctx.fillStyle = c; ctx.fillRect(...) / beginPath, arc, fill  ->  draw blocks */
  function fillColor(ctxNode,cx){ // color expression node for the next fill, or throws
    var key=ctxNode.name||'?', st=cx.fill[key];
    if(st&&st!=='unknown') return st;
    if(st===undefined&&!facts.fills[key]) return {type:'Literal',value:'#000000',raw:"'#000000'",start:0,end:0};
    bail('unknown fill color'); }
  function canvasStmt(n,cx,nodes,i){ // returns [blocks, consumed] or null
    var e=n.type==='ExpressionStatement'?n.expression:null; if(!e) return null;
    if(e.type==='AssignmentExpression'&&e.operator==='='&&e.left.type==='MemberExpression'&&!e.left.computed&&e.left.property.name==='fillStyle'&&e.left.object.type==='Identifier'&&canvasId(e.left.object,cx)){
      cx.fill[e.left.object.name]=e.right; return null; } // also kept as a plain statement
    if(e.type!=='CallExpression'||e.callee.type!=='MemberExpression'||e.callee.computed) return null;
    var ctxN=e.callee.object, m=e.callee.property.name;
    if(ctxN.type!=='Identifier') return null; var cid=canvasId(ctxN,cx); if(!cid) return null;
    function colorXml(){ var c=fillColor(ctxN,cx); if(c.type==='Literal'&&c.start===0) return lit('#000000'); return ex(c,cx); }
    if(m==='fillRect'&&e.arguments.length===4){ var col=colorXml(); var a=e.arguments;
      return [[blk('draw_rect',{f:{EL:cid},v:{X:ex(a[0],cx),Y:ex(a[1],cx),W:ex(a[2],cx),H:ex(a[3],cx),COLOR:col}})],1]; }
    if(m==='clearRect'&&e.arguments.length===4){ var q=e.arguments, z=function(x){ return x.type==='Literal'&&x.value===0; };
      var okW=function(x){ return x.type==='MemberExpression'&&!x.computed&&x.property.name==='width'&&(staticId(x.object,cx)===cid||(x.object.type==='MemberExpression'&&x.object.property.name==='canvas'&&x.object.object===undefined)) ; };
      var isW=function(x){ if(x.type==='Literal') return String(x.value)===String(env.canvasSize(cid).w); return okW(x)||(x.type==='MemberExpression'&&x.property.name==='width'&&x.object.type==='MemberExpression'&&x.object.property.name==='canvas'&&canvasId(x.object.object,cx)===cid); };
      var isH=function(x){ if(x.type==='Literal') return String(x.value)===String(env.canvasSize(cid).h); return (x.type==='MemberExpression'&&!x.computed&&x.property.name==='height'&&(staticId(x.object,cx)===cid||(x.object.type==='MemberExpression'&&x.object.property.name==='canvas'&&canvasId(x.object.object,cx)===cid))); };
      if(z(q[0])&&z(q[1])&&isW(q[2])&&isH(q[3])) return [[blk('draw_clear',{f:{EL:cid}})],1]; return null; }
    if(m==='beginPath'&&!e.arguments.length&&nodes[i+1]&&nodes[i+2]){ // beginPath(); arc(x,y,r,0,2*PI); fill();
      var s1=nodes[i+1], s2=nodes[i+2];
      var c1=s1.type==='ExpressionStatement'&&s1.expression, c2=s2.type==='ExpressionStatement'&&s2.expression;
      if(c1&&c2&&c1.type==='CallExpression'&&c1.callee.type==='MemberExpression'&&c1.callee.property.name==='arc'&&c1.callee.object.type==='Identifier'&&c1.callee.object.name===ctxN.name&&c1.arguments.length===5&&
        c2.type==='CallExpression'&&c2.callee.type==='MemberExpression'&&c2.callee.property.name==='fill'&&c2.callee.object.type==='Identifier'&&c2.callee.object.name===ctxN.name&&!c2.arguments.length){
        var ar=c1.arguments, endS=srcOf(ar[4]).replace(/\s+/g,'');
        if(ar[3].type==='Literal'&&ar[3].value===0&&/^(Math\.PI\*2|2\*Math\.PI)$/.test(endS))
          return [[blk('draw_circle',{f:{EL:cid},v:{X:ex(ar[0],cx),Y:ex(ar[1],cx),R:ex(ar[2],cx),COLOR:colorXml()}})],3]; } }
    return null; }

  function returnsValue(fnNode){ var r=false; walkAll(fnNode.body,function(x){ if(FN_NODE.test(x.type)||x.type==='FunctionDeclaration') return false; if(x.type==='ReturnStatement'&&x.argument) r=true; }); return r; }
  function bodyOf(b){ return b.type==='BlockStatement'?b.body:[{type:'ReturnStatement',argument:b,start:b.start,end:b.end}]; }

  function stList(nodes,cx){
    var out=[];
    for(var i=0;i<nodes.length;i++){
      var n=nodes[i];
      if(n.type==='EmptyStatement') continue;
      try{
        // canvas patterns first
        var cv=canvasStmt(n,cx,nodes,i);
        if(cv){ out=out.concat(cv[0]); i+=cv[1]-1; continue; }
        out=out.concat(st(n,cx));
      }catch(e){ if(!e.bail||e.hard) throw e;
        out.push(rawStmt(n,cx)); // unknown after a statement we left as JS: forget what we knew about fills
        Object.keys(cx.fill).forEach(function(k){ cx.fill[k]='unknown'; }); } }
    return out; }
  function innerList(nodeOrNodes,cx,extra){ // statements of a nested block
    var arr=Array.isArray(nodeOrNodes)?nodeOrNodes:(nodeOrNodes.type==='BlockStatement'?nodeOrNodes.body:[nodeOrNodes]);
    var cx2=Object.assign({},cx,extra||{},{fill:Object.assign({},cx.fill),top:false});
    return stList(arr,cx2); }
  function forgetFills(cx){ Object.keys(cx.fill).forEach(function(k){ cx.fill[k]='unknown'; }); }
  function st(n,cx){
    switch(n.type){
      case 'VariableDeclaration': return varDecl(n,cx);
      case 'ExpressionStatement': return exprStmt(n.expression,cx,n);
      case 'BlockStatement': return innerList(n,cx);
      case 'IfStatement': {
        var v={}, s={}, k=0, cur=n, elseBody=null;
        while(cur){ v['IF'+k]=exCond(cur.test,cx); s['DO'+k]=innerList(cur.consequent,cx);
          if(cur.alternate&&cur.alternate.type==='IfStatement'){ cur=cur.alternate; k++; }
          else { if(cur.alternate) s.ELSE=innerList(cur.alternate,cx); cur=null; } }
        forgetFills(cx);
        return [blk('controls_if',{m:'<mutation elseif="'+k+'" else="'+(s.ELSE?1:0)+'"></mutation>',v:v,s:s})]; }
      case 'WhileStatement': { var w=blk('controls_whileUntil',{f:{MODE:'WHILE'},v:{BOOL:exCond(n.test,cx)},s:{DO:innerList(n.body,cx,{loop:cx.loop+1})}}); forgetFills(cx); return [w]; }
      case 'DoWhileStatement': { var dw=blk('loop_dowhile',{v:{COND:exCond(n.test,cx)},s:{DO:innerList(n.body,cx,{loop:cx.loop+1})}}); forgetFills(cx); return [dw]; }
      case 'ForStatement': return forStmt(n,cx);
      case 'ForOfStatement': {
        if(n.await||n.left.type!=='VariableDeclaration'||n.left.declarations[0].id.type!=='Identifier') bail('for of');
        var nm=n.left.declarations[0].id.name, b=lookup(cx.scope,nm); if(!b||b.opaque) bail('for of var');
        var list=arrayOf(n.right,cx), body=innerList(n.body,cx,{loop:cx.loop+1}); forgetFills(cx);
        return [blk('controls_forEach',{f:{VAR:b.unique},v:{LIST:list},s:{DO:body}})]; }
      case 'BreakStatement': if(n.label||!cx.loop) bail('break'); return [blk('controls_flow_statements',{f:{FLOW:'BREAK'}})];
      case 'ContinueStatement': if(n.label||!cx.loop) bail('continue'); return [blk('controls_flow_statements',{f:{FLOW:'CONTINUE'}})];
      case 'ReturnStatement': if(!cx.retOK) bail('return'); return [blk('js_return',{v:{VALUE:n.argument?ex(n.argument,cx):''}})];
      case 'SwitchStatement': return switchStmt(n,cx);
      case 'FunctionDeclaration': bail('nested function');
      default: bail('stmt '+n.type); } }

  function switchStmt(n,cx){
    var out=[], disc=n.discriminant;
    if(!simplePure(disc)){ // keep the value in a helper variable so it is worked out once
      var tn=uniq('sw'); cx.scope.vars['\u0000'+tn]={name:tn,unique:tn,scope:cx.scope,kind:'let'};
      out.push(blk('variables_set',{f:{VAR:tn},v:{VALUE:ex(disc,cx)}}));
      disc={type:'Identifier',name:'\u0000'+tn,start:disc.start,end:disc.end}; }
    var cases=n.cases, groups=[], cur=[];
    cases.forEach(function(c,ci){
      cur.push(c);
      if(c.consequent.length){ groups.push(cur); cur=[]; }
      else if(ci===cases.length-1){ groups.push(cur); cur=[]; } });
    var v={}, s={}, k=0, dflt=null;
    groups.forEach(function(g,gi){
      var last=g[g.length-1], body=last.consequent.slice();
      var lastS=body[body.length-1], endsBreak=lastS&&lastS.type==='BreakStatement'&&!lastS.label, endsRet=lastS&&(lastS.type==='ReturnStatement'||lastS.type==='ContinueStatement');
      if(!endsBreak&&!endsRet&&gi<groups.length-1) bail('fallthrough');
      if(endsBreak) body.pop();
      var loopBreak=false; walkAll({type:'Block',body:body},function(x){ if(FN_NODE.test(x.type)||x.type==='FunctionDeclaration'||/^(For|ForIn|ForOf|While|DoWhile)Statement$/.test(x.type)) return false; if(x.type==='BreakStatement'&&!x.label) loopBreak=true; });
      if(loopBreak) bail('break inside switch');
      var isDef=g.some(function(c){ return !c.test; });
      if(isDef){ if(gi!==groups.length-1||g.length>1) bail('default position'); dflt=body; return; }
      var cond=null;
      g.forEach(function(c){ var t=binary({type:'BinaryExpression',operator:'===',left:disc,right:c.test,start:c.test.start,end:c.test.end},cx);
        cond=cond?blk('logic_operation',{f:{OP:'OR'},v:{A:cond,B:t}}):t; });
      v['IF'+k]=cond; s['DO'+k]=innerList(body,cx); k++; });
    if(!k) bail('switch');
    var elseL=dflt?innerList(dflt,cx):null; if(elseL) s.ELSE=elseL;
    forgetFills(cx);
    out.push(blk('controls_if',{m:'<mutation elseif="'+(k-1)+'" else="'+(elseL?1:0)+'"></mutation>',v:v,s:s}));
    return out; }

  function forStmt(n,cx){
    // for (let i = a; i < b; i++)  ->  count with i from a to b-1
    var init=n.init, test=n.test, upd=n.update;
    var asFor=null;
    if(init&&init.type==='VariableDeclaration'&&init.kind!=='var'&&init.declarations.length===1&&init.declarations[0].id.type==='Identifier'&&init.declarations[0].init&&test&&test.type==='BinaryExpression'&&upd){
      var nm=init.declarations[0].id.name, b=lookup(cx.scope,nm);
      var step=0;
      if(upd.type==='UpdateExpression'&&upd.argument.type==='Identifier'&&upd.argument.name===nm) step=upd.operator==='++'?1:-1;
      else if(upd.type==='AssignmentExpression'&&upd.left.type==='Identifier'&&upd.left.name===nm&&(upd.operator==='+='||upd.operator==='-=')&&upd.right.type==='Literal'&&typeof upd.right.value==='number'&&upd.right.value>0) step=(upd.operator==='+='?1:-1)*upd.right.value;
      if(b&&!b.opaque&&step&&test.left.type==='Identifier'&&test.left.name===nm){
        var assigned=false, lenChange=false;
        walkAll(n.body,function(x){ if((x.type==='AssignmentExpression'&&x.left.type==='Identifier'&&x.left.name===nm)||(x.type==='UpdateExpression'&&x.argument.type==='Identifier'&&x.argument.name===nm)) assigned=true;
          if(x.type==='CallExpression'&&x.callee.type==='MemberExpression'&&/^(push|pop|shift|unshift|splice|length)$/.test(x.callee.property.name||'')) lenChange=true;
          if(x.type==='AssignmentExpression'&&x.left.type==='MemberExpression'&&x.left.property.name==='length') lenChange=true; });
        // the limit is worked out once by the block, so it must not change while the loop runs
        var limit=test.right, limitIds=[]; walkAll(limit,function(x){ if(x.type==='Identifier') limitIds.push(x.name); });
        var limitChanges=false; walkAll(n.body,function(x){ if(x.type==='AssignmentExpression'&&x.left.type==='Identifier'&&limitIds.indexOf(x.left.name)>=0) limitChanges=true; if(x.type==='UpdateExpression'&&x.argument.type==='Identifier'&&limitIds.indexOf(x.argument.name)>=0) limitChanges=true; });
        var simpleLimit=limit.type==='Literal'||limit.type==='Identifier'||(limit.type==='MemberExpression'&&!limit.computed&&limit.property.name==='length')||(limit.type==='BinaryExpression');
        var hasCall=false; walkAll(limit,function(x){ if(x.type==='CallExpression'||x.type==='AssignmentExpression'||x.type==='UpdateExpression') hasCall=true; });
        var hasContinue=false; walkAll(n.body,function(x){ if(x.type==='ContinueStatement') hasContinue=true; });
        var opok=step>0?(test.operator==='<'||test.operator==='<='):(test.operator==='>'||test.operator==='>=');
        if(!assigned&&!lenChange&&!limitChanges&&!hasCall&&simpleLimit&&opok&&isNum(init.declarations[0].init,true)){
          b.read=true; b.reassigned=true;
          var to;
          var inc=(test.operator==='<='||test.operator==='>=');
          if(inc) to=ex(limit,cx);
          else if(limit.type==='Literal'&&typeof limit.value==='number') to=num(step>0?limit.value-1:limit.value+1);
          else to=blk('math_arithmetic',{f:{OP:step>0?'MINUS':'ADD'},v:{A:ex(limit,cx),B:num(1)}});
          asFor={name:b.unique, from:ex(init.declarations[0].init,cx), to:to, by:num(Math.abs(step))}; } } }
    if(asFor){
      var body=innerList(n.body,cx,{loop:cx.loop+1}); forgetFills(cx);
      return [blk('controls_for',{f:{VAR:asFor.name},v:{FROM:asFor.from,TO:asFor.to,BY:asFor.by},s:{DO:body}})]; }
    // general: init; while (test) { body; update }
    var hasC=false; walkAll(n.body,function(x){ if(FN_NODE.test(x.type)) return false; if(x.type==='ContinueStatement') hasC=true; }); if(hasC) bail('continue in for');
    var out=[];
    if(init){ out=out.concat(init.type==='VariableDeclaration'?varDecl(init,cx):exprStmt(init,cx,init)); }
    var bodyL=innerList(n.body,cx,{loop:cx.loop+1});
    if(upd) bodyL=bodyL.concat(exprStmt(upd,cx,upd));
    forgetFills(cx);
    out.push(blk('controls_whileUntil',{f:{MODE:'WHILE'},v:{BOOL:test?exCond(test,cx):blk('logic_boolean',{f:{BOOL:'TRUE'}})},s:{DO:bodyL}}));
    return out; }

  function exprStmt(e,cx,node){
    switch(e.type){
      case 'AssignmentExpression': {
        // window.onload = fn / el.onclick = fn
        if(e.operator==='='&&e.left.type==='MemberExpression'&&!e.left.computed&&e.left.property.type==='Identifier'&&FN_NODE.test(e.right.type)){
          var pn=e.left.property.name;
          if(cx.top&&pn==='onload'&&e.left.object.type==='Identifier'&&e.left.object.name==='window') { return inlineBody(e.right,cx); }
          if(cx.top&&pn==='onclick'){ var cid=staticId(e.left.object,cx); if(cid) return [{hat:blk('ev_click',{f:{EL:cid},s:{DO:callbackBody(e.right,cx,'click')}})}]; } }
        if(cx.top&&e.operator==='='&&e.left.type==='MemberExpression'&&!e.left.computed&&e.left.property.name==='onclick'&&e.right.type==='Identifier'){
          var oid=staticId(e.left.object,cx), ob=lookup(cx.scope,e.right.name), oc=oid&&ob&&ob.fn&&procs[e.right.name]&&!procs[e.right.name].params.length?procCall(e.right.name,[],cx,true):null;
          if(oc) return [{hat:blk('ev_click',{f:{EL:oid},s:{DO:[oc]}})}]; }
        if(e.left.type==='Identifier'&&e.operator==='='&&timerNames[e.left.name]){
          var tb2=lookup(cx.scope,e.left.name);
          if(tb2&&!tb2.opaque){ if(e.right.type==='Literal') return []; return [timerCall(e.right,cx,true,'timer_'+tb2.unique.replace(/[^\w]/g,'_'))]; } }
        if(e.left.type==='Identifier'&&e.operator==='='&&FN_NODE.test(e.right.type)) bail('function value');
        if(e.operator==='='||e.operator==='+='||e.operator==='-='||e.operator==='*='||e.operator==='/='||e.operator==='%='||e.operator==='**='){
          if(e.left.type==='MemberExpression'||e.left.type==='Identifier'){
            if(e.left.type==='MemberExpression'){ var d=domAssign(e,cx); if(d) return [d]; }
            if(e.operator==='=') { var val; if(FN_NODE.test(e.right.type)) bail('function value'); val=ex(e.right,cx); return [assignTo(e.left,val,cx,e)]; }
            return [compound(e,cx)]; } }
        bail('assignment'); }
      case 'UpdateExpression': {
        if(e.argument.type==='Identifier'){
          var b=lookup(cx.scope,e.argument.name);
          if(b&&!b.opaque&&!b.fn&&!b.param&&facts.kinds[b.name]==='num'){ b.read=true; b.reassigned=true; return [blk('math_change',{f:{VAR:b.unique},v:{DELTA:num(e.operator==='++'?1:-1)}})]; }
          if(b&&b.param&&!b.hat){ b.read=true; return [blk('variables_set',{f:{VAR:b.unique},v:{VALUE:blk('math_arithmetic',{f:{OP:e.operator==='++'?'ADD':'MINUS'},v:{A:blk('js_num',{f:{AS:'Number'},v:{X:blk('variables_get',{f:{VAR:b.unique}})}}),B:num(1)}})}})]; } }
        if(e.argument.type==='MemberExpression'&&simplePure(e.argument)){
          var fake={type:'BinaryExpression',operator:e.operator==='++'?'+':'-',left:e.argument,right:{type:'Literal',value:1,raw:'1',start:e.start,end:e.end},start:e.start,end:e.end};
          return [assignTo(e.argument,blk('math_arithmetic',{f:{OP:e.operator==='++'?'ADD':'MINUS'},v:{A:blk('js_num',{f:{AS:'Number'},v:{X:ex(e.argument,cx)}}),B:num(1)}}),cx,e)]; }
        bail('update'); }
      case 'CallExpression': {
        var l=cx.top?listener(e,cx):null;
        if(l){ if(l.multi) return l.multi.map(function(x){ return {hat:x}; }); if(l.inline) return l.inline; return [{hat:l}]; }
        if(e.callee.type==='MemberExpression'&&!e.callee.computed&&e.callee.property.name==='addEventListener') bail('listener');
        if(e.callee.type==='Identifier'&&e.callee.name==='setInterval'&&cx.top&&!lookup(cx.scope,'setInterval')){
          var ms=e.arguments[1], f=e.arguments[0];
          if(e.arguments.length===2&&ms&&ms.type==='Literal'&&typeof ms.value==='number'&&ms.value>=20){
            var body=FN_NODE.test(f.type)?callbackBody(f,cx,null):(f.type==='Identifier'&&lookup(cx.scope,f.name)&&lookup(cx.scope,f.name).fn?[procCall(f.name,[],cx,true)||blk('js_calls',{f:{NAME:f.name}})]:null);
            if(body) return [{hat:blk('ev_timer',{f:{SEC:+(ms.value/1000).toFixed(3)},s:{DO:body}})}]; } }
        return [call(e,cx,true)]; }
      default: bail('expression statement '+e.type); } }

  /* ---------- the program ---------- */
  declareScope(prog,ast.body,null,true);
  facts.dollar=false;
  // a "$" helper written as  const $ = id => document.getElementById(id)  is understood and dropped
  var dollarDecl=null, dollarDecls=[];
  var DOLLAR_RE=/^\s*(?:\(?\s*(\w+)\s*\)?\s*=>\s*document\.getElementById\(\s*\1\s*\)|function\s*\(\s*(\w+)\s*\)\s*\{\s*return\s+document\.getElementById\(\s*\2\s*\)\s*;?\s*\})\s*$/;
  walkAll(ast,function(x){
    if(x.type==='VariableDeclarator'&&x.id.type==='Identifier'&&x.id.name==='$'&&x.init&&DOLLAR_RE.test(srcOf(x.init))){ dollarDecls.push(x); facts.dollar=true; }
    if(x.type==='FunctionDeclaration'&&x.id.name==='$'&&/^\s*function\s*\$\s*\(\s*(\w+)\s*\)\s*\{\s*return\s+document\.getElementById\(\s*\1\s*\)\s*;?\s*\}\s*$/.test(srcOf(x))){ dollarDecl=x; facts.dollar=true; } });
  var usesDollar=false, dollarOdd=false;
  walkAll(ast,function(x){ if(x.type==='Identifier'&&x.name==='$') usesDollar=true; });
  if(usesDollar&&!facts.dollar){ var declared=false; walkAll(ast,function(x){ if((x.type==='VariableDeclarator'&&x.id.name==='$')||(x.type==='FunctionDeclaration'&&x.id&&x.id.name==='$')||(x.type==='AssignmentExpression'&&x.left.name==='$')) declared=true; }); if(declared) return null; }
  if(facts.dollar){ walkAll(ast,function(x){ if(x.type==='CallExpression'&&x.callee.type==='Identifier'&&x.callee.name==='$'&&!(x.arguments.length===1&&x.arguments[0].type==='Literal'&&typeof x.arguments[0].value==='string')) dollarOdd=true; }); if(dollarOdd) return null; }
  if(facts.dollar){ var db=prog.vars['$']; if(db){ db.opaque=true; db.unique='$'; } }

  // top-level functions that can become procedures (blocks)
  function procParams(fn){ if(fn.async||fn.generator) return null; var out=[]; for(var i=0;i<fn.params.length;i++){ var p=fn.params[i]; if(p.type!=='Identifier'||!NAME_RE.test(p.name)||reserved(p.name)||p.name.indexOf('__')===0) return null; out.push(p.name); } return out; }
  function usesThisOrArgs(fn){ var f=false; walkAll(fn.body,function(x){ if(x.type==='FunctionDeclaration'||x.type==='FunctionExpression') return false; if(x.type==='ThisExpression'||(x.type==='Identifier'&&x.name==='arguments')) f=true; }); return f; }
  ast.body.forEach(function(s){
    var name=null, fn=null, decl=null;
    if(s.type==='FunctionDeclaration'){ name=s.id.name; fn=s; }
    else if(s.type==='VariableDeclaration'&&s.kind==='const'&&s.declarations.length===1&&s.declarations[0].id.type==='Identifier'&&s.declarations[0].init&&FN_NODE.test(s.declarations[0].init.type)&&facts.assigns[s.declarations[0].id.name]===1){ name=s.declarations[0].id.name; fn=s.declarations[0].init; decl=s.declarations[0]; }
    if(!fn) return;
    if(!NAME_RE.test(name)||reserved(name)||name==='$'||name.indexOf('__')===0){ return; }
    var params=procParams(fn); if(!params||usesThisOrArgs(fn)) return;
    var b=prog.vars[name]; if(!b) return;
    if(b.kind!=='fn'&&!decl) return;
    procs[name]={node:s,fn:fn,params:params,returns:fn.body.type!=='BlockStatement'||returnsValue(fn),decl:decl};
    b.fn=true; b.opaque=false; });
  // a function that calls itself and keeps local variables stays JS (its locals would be shared between the calls)
  Object.keys(procs).forEach(function(nm){ var p=procs[nm], rec=false, locals=false;
    walkAll(p.fn.body,function(x){ if(x.type==='CallExpression'&&x.callee.type==='Identifier'&&x.callee.name===nm) rec=true; });
    walkDecl(p.fn.body.type==='BlockStatement'?p.fn.body.body:[],function(){ locals=true; });
    if(rec&&locals) delete procs[nm]; });

  var build=function(){
    stats.raw=0; timerSeq=0;
    var tops=[], starts=[];
    // top-level  const el = document.getElementById(...)  /  const ctx = canvas.getContext('2d')  are known before any function is read
    for(var pass=0;pass<2;pass++) ast.body.forEach(function(st){
      if(st.type!=='VariableDeclaration'||st.kind!=='const') return;
      st.declarations.forEach(function(d){ if(d.id.type!=='Identifier'||!d.init||facts.assigns[d.id.name]!==1) return;
        var b=prog.vars[d.id.name]; if(!b||b.opaque) return; var c0={scope:prog};
        var sid=staticId(d.init,c0); if(sid) b.elId=sid; else { var cid=canvasOfInit(d.init,c0); if(cid) b.canvasId=cid; } }); });
    // functions first
    Object.keys(procs).forEach(function(nm){
      var p=procs[nm], fn=p.fn, s=new Scope(prog,fn), body=bodyOf(fn.body);
      var cx={scope:s, ownScope:s, hat:null, retOK:true, loop:0, fill:{}, top:false, proc:true};
      var tail=null, stmts=body;
      try{
        // parameters are variables of the function; locals get their own names
        declareScope(s,body,p.params,false);
        if(p.returns&&body.length){ var last=body[body.length-1]; if(last.type==='ReturnStatement'&&last.argument){ tail=last; stmts=body.slice(0,-1); } }
        var list=stList(stmts,cx), params=p.params.map(function(a){ return '<arg name="'+esc(a)+'"></arg>'; }).join('');
        var ret=null; if(tail) ret=exRaw(tail.argument,cx);
        if(p.returns){ tops.push(blk('procedures_defreturn',{m:'<mutation>'+params+'</mutation>',f:{NAME:nm},s:{STACK:list},v:{RETURN:ret||blk('logic_null')}})); }
        else tops.push(blk('procedures_defnoreturn',{m:'<mutation>'+params+'</mutation>',f:{NAME:nm},s:{STACK:list}}));
      }catch(e){ if(!e.bail) throw e; // the whole function stays JS (placed where the page opens)
        delete procs[nm]; prog.vars[nm]&&(prog.vars[nm].fn=true); starts.push(wholeRaw(p.node)); if(!rawFns[nm]) rawFns[nm]=1; } });
    var cxTop={scope:prog, ownScope:prog, hat:null, retOK:false, loop:0, fill:{}, top:true, proc:false};
    ast.body.forEach(function(s){
      if(s===dollarDecl) return;
      var nm=(s.type==='FunctionDeclaration')?s.id.name:(s.type==='VariableDeclaration'&&s.declarations.length===1&&s.declarations[0].id.type==='Identifier'?s.declarations[0].id.name:null);
      if(nm&&procs[nm]&&(s.type==='FunctionDeclaration'||procs[nm].decl)) return; // already a function block
      if(s.type==='FunctionDeclaration'){ starts.push(wholeRaw(s)); return; }
      var items;
      try{ items=stList([s],cxTop); }catch(e){ if(!e.bail) throw e; items=[wholeRaw(s)]; }
      items.forEach(function(it){ if(typeof it==='string') starts.push(it); else tops.push(it.hat); }); });
    return {tops:tops, starts:starts}; };
  var rawFns={};
  var takenBase=Object.assign(Object.create(null),taken);
  var buildFn=build;
  build=function(){ Object.keys(taken).forEach(function(k){ delete taken[k]; }); Object.assign(taken,takenBase);
    Object.keys(prog.vars).forEach(function(k){ var u=prog.vars[k].unique; if(!taken[lc(u)]) taken[lc(u)]=u; });
    return buildFn(); };
  // declarations of "const x = document.getElementById(...)" are dropped when x is only used as a plain element
  walkAll(ast,function(x){ if(x.type==='VariableDeclarator'&&x.id.type==='Identifier'&&x.init){ var b=prog.vars[x.id.name]; if(b&&!b.declStart) b.declStart=x.start; } });
  var res=build();
  function wanted(){ var o={}; Object.keys(prog.vars).forEach(function(k){ var b=prog.vars[k]; if((b.elId||b.canvasId)&&!b.read&&b.declStart!==undefined) o[b.unique+'#'+b.declStart]=1; }); return o; }
  var w=wanted();
  if(Object.keys(w).length){
    skipDecl=w; Object.keys(prog.vars).forEach(function(k){ prog.vars[k].read=false; });
    res=build();
    var back=false; Object.keys(prog.vars).forEach(function(k){ var b=prog.vars[k]; if((b.elId||b.canvasId)&&b.read&&skipDecl[b.unique+'#'+b.declStart]){ delete skipDecl[b.unique+'#'+b.declStart]; back=true; } });
    if(back){ Object.keys(prog.vars).forEach(function(k){ prog.vars[k].read=false; }); res=build(); } }
  return {tops:res.tops, starts:res.starts, rawCount:stats.raw, funcs:Object.keys(procs)}; }

window.JS2B={convertScript:convertScript, chain:chain, esc:esc};
})();
