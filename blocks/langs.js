/* Fry Blocks languages: the same block editor can write HTML (blocks.js), JavaScript, Python or BeaconScript.
   This file is the engine: a short text form for describing blocks (one line per block, see parse()), the code generators,
   the toolbox builder and the example/starter helpers. The blocks themselves are in lang-js.js, lang-py.js and lang-bs.js.

   A block row is   [type, kind, message, template, tooltip?, flags?]
     kind     s statement · a/p/w/g BeaconScript statements (check BSA/BSP/BSW/BSG) · e top block (no connections) · t statement without "next"
              v value (any) · vn number · vs text · vb true/false · vl list
     message  words with these parts:  $A  $A:n  $A:s=기본값  (value input; n number, s text, b true/false, l list, a anything; "~" in a default is a space)
              [F=기본값]  [F=기본값|id]  text field   [F#5]  [F#5:1:99]  number field   [F|a:보기,b:보기]  drop-down   [F&이름] variable field
              [F@#ff0000] colour   [F?1] check box   {BODY}  {BODY:BSA}  statement input
     template the code, with  @A (value, in brackets if needed) · @@A (value as it is) · #F (field) · ##F (field as a quoted text) · %B (inner blocks) · %%B (the same, "pass" if empty) · %?ELSE (else part)
     flags    x  not a single piece (an operator): the parent puts it in brackets      L  loop: guarded against endless loops */
(function(){
'use strict';
var T=FFT.T, KO=(FFT.lang||'ko')==='ko';

/* ---------- translation of the pieces of a message ---------- */
function tr(s){ if(!s||!/\S/.test(s)) return s; var m=/^(\s*)([\s\S]*?)(\s*)$/.exec(s); return m[1]+T(m[2])+m[3]; }
function escPct(s){ return s.replace(/%(?=\d)/g,'％'); }

/* ---------- message -> Blockly JSON ---------- */
var RX=/\$([A-Z][A-Z0-9]*)(?::([nsblat]))?(?:=(\S*))?|\[([A-Z][A-Z0-9_]*)(=[^\]|]*(?:\|[a-z]+)?|#[^\]]*|\|[^\]]+|@#[0-9a-fA-F]{6}|\?[01]|&[^\]]*)\]|\{([A-Z][A-Z0-9]*)(?::([A-Za-z]+))?\}/g;
var CHK={n:'Number',s:'String',b:'Boolean',l:'Array',a:null,t:null};
function dflt(s){ return String(s==null?'':s).replace(/~/g,' '); }
function parse(msg){ var args=[], out='', last=0, m, n=0, ins={}, flds={}, stm=[];
  RX.lastIndex=0;
  while((m=RX.exec(msg))){
    out+=escPct(tr(msg.slice(last,m.index))); last=RX.lastIndex; n++;
    if(m[1]){ args.push({type:'input_value',name:m[1],check:CHK[m[2]||'a']}); ins[m[1]]={t:m[2]||'a',d:m[3]===undefined?null:dflt(m[3])}; }
    else if(m[4]){ var nm=m[4], sp=m[5], a;
      if(sp[0]==='='){ var mm=/^=([^|]*)(?:\|([a-z]+))?$/.exec(sp); a={type:'field_input',name:nm,text:dflt(mm[1])}; flds[nm]={k:mm[2]||''}; }
      else if(sp[0]==='#'){ var p=sp.slice(1).split(':'), v=parseFloat(p[0]); if(isNaN(v)) v=0; a={type:'field_number',name:nm,value:v,precision:/\./.test(p[0])?0.01:1}; if(p.length>=3){ a.min=parseFloat(p[1]); a.max=parseFloat(p[2]); } flds[nm]={k:'num'}; }
      else if(sp[0]==='|'){ var opts=sp.slice(1).split(',').map(function(o){ var i=o.indexOf(':'), val=(i<0?o:o.slice(0,i)).replace(/\\\|/g,'|'); return [T(dflt(i<0?o:o.slice(i+1)).replace(/\\\|/g,'|')),val]; }); a={type:'field_dropdown',name:nm,options:opts}; flds[nm]={k:'dd'}; }
      else if(sp[0]==='@'){ a={type:'field_colour',name:nm,colour:sp.slice(1)}; flds[nm]={k:'col'}; }
      else if(sp[0]==='?'){ a={type:'field_checkbox',name:nm,checked:sp[1]==='1'}; flds[nm]={k:'chk'}; }
      else { a={type:'field_variable',name:nm,variable:sp.slice(1)||'x'}; flds[nm]={k:'var'}; }
      args.push(a); }
    else { args.push({type:'input_statement',name:m[6],check:m[7]||null}); stm.push(m[6]); }
    out+='%'+n; }
  out+=escPct(tr(msg.slice(last)));
  return {msg:out,args:args,ins:ins,flds:flds,stm:stm}; }

/* ---------- field clean-up (names of variables, texts) ---------- */
function cleanId(v){ v=String(v==null?'':v); try{ v=v.replace(/[^\p{L}\p{N}_$]/gu,'_'); }catch(e){ v=v.replace(/[^\w$À-￿]/g,'_'); } if(/^[0-9]/.test(v)) v='_'+v; return v||'x'; }
function cleanBs(v){ return String(v==null?'':v).replace(/["\n\r]/g,"'").replace(/\t/g,' '); }
function cleanBsVar(v){ v=String(v==null?'':v).toLowerCase().replace(/[^a-z0-9_가-힣]/g,'_').slice(0,22); return v||'x'; }
function cleanKey(v){ return String(v==null?'':v).replace(/[^A-Za-z0-9_]/g,'').slice(0,24); }
function cleanHex(v){ return String(v==null?'':v).replace(/[^#0-9a-fA-F]/g,'').slice(0,7); }
var CLEAN={id:cleanId,bs:cleanBs,bsv:cleanBsVar,key:cleanKey,hex:cleanHex};

/* ---------- registry ---------- */
var LANGS=[
  {id:'html',name:'HTML',ico:'🌐',ext:'html',desc:'웹페이지'},
  {id:'js',name:'JavaScript',ico:'🟨',ext:'js',desc:'글자·그림·화면'},
  {id:'py',name:'Python',ico:'🐍',ext:'py',desc:'파이썬'},
  {id:'bs',name:'BeaconScript',ico:'🔥',ext:'bs',desc:'Beaconfall 모드'}];
var REG={}, GEN={}, ORD={};
function lang(id){ return LANGS.filter(function(l){ return l.id===id; })[0]; }

var DEF={js:{n:'0',s:'""',b:'false',l:'[]',a:'""',t:'""'},py:{n:'0',s:"''",b:'False',l:'[]',a:"''",t:"''"},bs:{n:'0',s:'',b:'',l:'',a:'',t:''}};
var TOK=/(@@|@|##|#|%\?|%>|%<|%%|%)([A-Z][A-Z0-9_]*)/g;

function fieldText(block,gen,name,q,lg){ var f=block.getField(name); if(!f) return '';
  if(f instanceof Blockly.FieldVariable){ var id=block.getFieldValue(name); return gen.getVariableName?gen.getVariableName(id):gen.nameDB_.getName(id,'VARIABLE'); }
  var v=block.getFieldValue(name); if(typeof v==='boolean') v=v?'TRUE':'FALSE';
  if(f instanceof Blockly.FieldCheckbox) v=(String(v)==='TRUE')?(lg==='py'?'True':'true'):(lg==='py'?'False':'false');
  return q?JSON.stringify(String(v)):String(v); }

function compile(lg,type,kind,tpl,flags,P,imp){
  var isVal=kind[0]==='v', atomic=flags.indexOf('x')<0, loop=flags.indexOf('L')>=0, G=GEN[lg], O=ORD[lg];
  return function(block,gen){
    gen=gen||G;
    if(imp&&gen.definitions_) imp.split(';').forEach(function(m){ m=m.trim(); if(m) gen.definitions_['imp_'+m]=/^(import|from)\s/.test(m)?m:'import '+m; });
    var code=tpl.replace(/\{\{([A-Z0-9_]+):([A-Z0-9_]+)\}\}/g,function(_,w,v){ var sc=block.getFieldValue(w), nm=block.getFieldValue(v); return sc==='s'?'{:'+nm+':}':sc==='l'?'{_'+nm+'_}':'{'+nm+'}'; }).replace(TOK,function(_,pre,name){
      if(pre==='@'||pre==='@@'){ var c=gen.valueToCode(block,name,pre==='@'?O.ATOMIC:O.NONE); if(c==='') c=(DEF[lg][(P.ins[name]||{}).t||'a']); return c; }
      if(pre==='#') return fieldText(block,gen,name,false,lg);
      if(pre==='##') return fieldText(block,gen,name,true,lg);
      if(pre==='%'||pre==='%%'||pre==='%>'||pre==='%<'){ if(name==='B') name='BODY'; var s=gen.statementToCode(block,name); if(loop&&lg==='js'&&gen.addLoopTrap) s=gen.addLoopTrap(s,block);
        if(!s&&(pre==='%%'||(pre==='%>'&&lg==='py'))) s=gen.INDENT+(lg==='py'?'pass\n':'');
        if(pre==='%>'&&s) s=gen.prefixLines(s,gen.INDENT);
        if(pre==='%<'&&s){ var re=new RegExp('^'+gen.INDENT,'gm'); s=s.replace(re,''); }
        return s; }
      if(pre==='%?'){ var e=gen.statementToCode(block,name); return e?'else:\n'+e:''; }
      return _; });
    if(isVal) return [code,atomic?O.ATOMIC:O.NONE];
    return code+(/\n$/.test(code)?'':'\n'); }; }

var ALLROWS={};   // lang -> [{type,kind,cat,msg,tpl,tip,ins,flds}]
function defineRows(lg,cats,colours){
  var rows=ALLROWS[lg]=[]; REG[lg].rowBy={};
  cats.forEach(function(cat){ (cat.rows||[]).forEach(function(r){
    if(!Array.isArray(r)) return;               // a label or a ready-made toolbox block
    var type=r[0], kind=r[1], msg=r[2], tpl=r[3], tip=r[4]||'', flags=r[5]||'', imp=r[6]||'', P=parse(msg), kchk=null;
    if(kind.indexOf(':')>0){ kchk=kind.split(':')[1]; kind=kind.split(':')[0]; }
    var json={type:type,message0:P.msg,args0:P.args,colour:cat.colour,inputsInline:true,tooltip:''};
    if(kind[0]==='v'){ var o=kind.length>1?{n:'Number',s:'String',b:'Boolean',l:'Array'}[kind[1]]:null; json.output=o||null; }
    else if(kind==='e'){}
    else { var ck={s:null,a:'BSA',p:'BSP',w:'BSW',g:'BSG',t:null,c:'CLS'}[kind]; if(ck===undefined) ck=null; if(kchk) ck=kchk.indexOf(',')>0?kchk.split(','):kchk; json.previousStatement=ck; if(kind!=='t') json.nextStatement=ck; }
    if(P.stm.length) json.inputsInline=true;
    var tipT=tip?T(tip):'';
    Blockly.Blocks[type]={init:function(){ this.jsonInit(json); if(tipT) this.setTooltip(tipT);
      var me=this; Object.keys(P.flds).forEach(function(k){ var cl=CLEAN[P.flds[k].k]; if(cl){ var f=me.getField(k); if(f&&f.setValidator) f.setValidator(function(v){ return cl(v); }); } }); }};
    GEN[lg].forBlock[type]=compile(lg,type,kind,tpl,flags,P,imp);
    var rec={type:type,kind:kind,cat:cat.id,msg:msg,tpl:tpl,tip:tip,ins:P.ins,flds:P.flds,stm:P.stm}; rows.push(rec); REG[lg].rowBy[type]=rec; }); });
}

/* ---------- toolbox ---------- */
function shadowFor(i){ var t=i.t, d=i.d;
  if(d===null||d===undefined){ return t==='n'?{shadow:{type:'math_number',fields:{NUM:0}}}:t==='s'?{shadow:{type:'text',fields:{TEXT:''}}}:null; }
  if(t==='n'||(t==='a'&&/^-?\d+(\.\d+)?$/.test(d))) return {shadow:{type:'math_number',fields:{NUM:parseFloat(d)||0}}};
  if(t==='s'||t==='a') return {shadow:{type:'text',fields:{TEXT:d}}};
  return null; }
function blockItem(lg,type,over){ var r=REG[lg].rowBy[type], b={kind:'block',type:type};
  if(r){ var inputs={}; Object.keys(r.ins).forEach(function(k){ var sh=shadowFor(r.ins[k]); if(sh) inputs[k]=sh; }); if(Object.keys(inputs).length) b.inputs=inputs; }
  if(over){ if(over.inputs) b.inputs=Object.assign(b.inputs||{},over.inputs); if(over.fields) b.fields=over.fields; if(over.extraState) b.extraState=over.extraState; }
  return b; }
function toolbox(lg){ var R=REG[lg]; if(!R) return {kind:'categoryToolbox',contents:[]}; if(R.tb) return R.tb;
  var lab=function(t){ return {kind:'label',text:T(t)}; };
  var contents=[{kind:'category',name:T('블록 찾기'),colour:'#5b6475',toolboxitemid:'cat_search',contents:[{kind:'button',text:T('🔍 블록 찾기'),callbackKey:'blkSearch'}]}];
  R.cats.forEach(function(cat){
    var items=[]; (cat.items||cat.rows).forEach(function(it){
      if(typeof it==='string'){ if(it[0]==='-') items.push(lab(it.slice(1))); else items.push(blockItem(lg,it)); }
      else if(Array.isArray(it)) items.push(blockItem(lg,it[0],it[1]&&typeof it[1]==='object'?it[1]:null));
      else items.push(it); });
    var o={kind:'category',name:T(cat.name),colour:cat.colour,toolboxitemid:'cat_'+cat.id};
    if(cat.custom){ o.custom=cat.custom; o.contents=items; } else o.contents=items;
    contents.push(o); });
  return (R.tb={kind:'categoryToolbox',contents:contents}); }

/* rows shown in a category: the first column of cat.rows (custom rows) and then everything in cat.std */
function sb(type,inputs,extra){ var o={kind:'block',type:type}; if(inputs){ o.inputs={}; Object.keys(inputs).forEach(function(k){ var v=inputs[k]; o.inputs[k]={shadow:typeof v==='number'?{type:'math_number',fields:{NUM:v}}:typeof v==='string'?{type:'text',fields:{TEXT:v}}:v}; }); } if(extra) Object.assign(o,extra); return o; }
var STD={
  logic:function(py){ return ['-만약 …이면',sb('controls_if'),sb('controls_if',null,{extraState:{hasElse:true}}),sb('controls_if',null,{extraState:{elseIfCount:1,hasElse:true}}),'-비교하고 이어 주기',sb('logic_compare'),sb('logic_operation'),sb('logic_negate'),sb('logic_boolean'),sb('logic_null'),sb('logic_ternary')]; },
  loops:function(){ return ['-되풀이',sb('controls_repeat_ext',{TIMES:10}),sb('controls_whileUntil'),sb('controls_for',{FROM:1,TO:10,BY:1}),sb('controls_forEach'),sb('controls_flow_statements')]; },
  math:function(){ return ['-계산',sb('math_number'),sb('math_arithmetic',{A:1,B:1}),sb('math_modulo',{DIVIDEND:64,DIVISOR:10}),sb('math_single',{NUM:9}),sb('math_trig',{NUM:45}),sb('math_constant'),sb('math_number_property',{NUMBER_TO_CHECK:0}),sb('math_round',{NUM:3.1}),sb('math_on_list'),sb('math_constrain',{VALUE:50,LOW:1,HIGH:100}),'-랜덤',sb('math_random_int',{FROM:1,TO:100}),sb('math_random_float'),sb('math_atan2',{X:1,Y:1}),sb('math_change',{DELTA:1})]; },
  text:function(){ return ['-글자',sb('text'),sb('text_join',null,{extraState:{itemCount:2}}),sb('text_append',{TEXT:'안녕'}),sb('text_length',{VALUE:'abc'}),sb('text_isEmpty',{VALUE:''}),sb('text_indexOf',{VALUE:'abc',FIND:'b'}),sb('text_charAt',{VALUE:'abc'}),sb('text_getSubstring',{STRING:'abcde'}),sb('text_changeCase',{TEXT:'abc'}),sb('text_trim',{TEXT:' abc '}),sb('text_count',{SUB:'a',TEXT:'banana'}),sb('text_replace',{FROM:'a',TO:'o',TEXT:'banana'}),sb('text_reverse',{TEXT:'abc'})]; },
  lists:function(){ return ['-목록',sb('lists_create_with',null,{extraState:{itemCount:3}}),sb('lists_create_with',null,{extraState:{itemCount:0}}),sb('lists_repeat',{ITEM:'a',NUM:5}),sb('lists_length'),sb('lists_isEmpty'),sb('lists_indexOf',{FIND:'a'}),sb('lists_getIndex'),sb('lists_setIndex'),sb('lists_getSublist'),sb('lists_split',{DELIM:','}),sb('lists_sort'),sb('lists_reverse')]; },
  colour:function(){ return []; }
};

/* the "변수·함수" category (variables, then functions) */
function varsFlyout(w){ var xml=Blockly.utils.xml, out=[], lab=function(t){ var e=xml.createElement('label'); e.setAttribute('text',T(t)); return e; };
  out.push(lab('변수')); out=out.concat(Blockly.Variables.flyoutCategory(w));
  out.push(lab('함수')); out=out.concat(Blockly.Procedures.flyoutCategory(w)); return out; }

/* ---------- code generation (with a map from code line to block) ---------- */
function genCode(lg,ws,opt){ opt=opt||{}; var G=GEN[lg]; if(!G) return {code:'',map:{}};
  var sp=G.STATEMENT_PREFIX, tr0=G.INFINITE_LOOP_TRAP;
  G.STATEMENT_PREFIX='\u0001%1\n'; G.INFINITE_LOOP_TRAP=(opt.trap&&lg==='js')?'if (--self.__lc < 0) throw new Error("__LOOP__");\n':null;
  var raw='';
  try{ raw=G.workspaceToCode(ws); } finally{ G.STATEMENT_PREFIX=sp; G.INFINITE_LOOP_TRAP=tr0; }
  var out=[], map={}, pend=null, ls=String(raw).split('\n');
  ls.forEach(function(l){ var mk=/^\s*\u0001'([^']*)'\s*$/.exec(l); if(mk){ pend=mk[1]; return; } if(l.indexOf('\u0001')>=0) l=l.replace(/\u0001'[^']*'/g,''); out.push(l); if(pend&&/\S/.test(l)){ map[out.length]=pend; pend=null; } });
  var code=out.join('\n').replace(/\s+$/,'')+'\n';
  if(lg==='js'&&/\bawait\b/.test(code)){ code='(async () => {\n'+code+'})();\n'; var m2={}; Object.keys(map).forEach(function(k){ m2[+k+1]=map[k]; }); map=m2; }
  return {code:code,map:map}; }

/* ---------- examples: a short way to write a block tree ---------- */
function Tree(){ var vars={}, tops=[];
  var X={
    v:function(name){ if(!vars[name]) vars[name]={name:name,id:'v_'+Object.keys(vars).length+'_'+name}; return {id:vars[name].id}; },
    // b(type, fields, inputs, body): fields starting with "$" are variables; inputs are blocks; body is {BODY:[blocks]}
    b:function(type,f,i,s){ var o={type:type}; if(f){ o.fields={}; Object.keys(f).forEach(function(k){ var v=f[k]; o.fields[k]=(typeof v==='string'&&v[0]==='$')?X.v(v.slice(1)):v; }); }
      if(i||s){ o.inputs={}; if(i) Object.keys(i).forEach(function(k){ o.inputs[k]={block:i[k]}; }); if(s) Object.keys(s).forEach(function(k){ var c=X.chain(s[k]); if(c) o.inputs[k]={block:c}; }); } return o; },
    chain:function(list){ var first=null, prev=null; (list||[]).forEach(function(b){ if(!b) return; if(!first) first=b; else prev.next={block:b}; prev=b; while(prev.next) prev=prev.next.block; }); return first; },
    t:function(s){ return {type:'text',fields:{TEXT:s}}; },
    n:function(v){ return {type:'math_number',fields:{NUM:v}}; },
    g:function(name){ return {type:'variables_get',fields:{VAR:X.v(name)}}; },
    set:function(name,val){ return {type:'variables_set',fields:{VAR:X.v(name)},inputs:{VALUE:{block:val}}}; },
    ar:function(a,op,b){ return {type:'math_arithmetic',fields:{OP:op},inputs:{A:{block:a},B:{block:b}}}; },
    cmp:function(a,op,b){ return {type:'logic_compare',fields:{OP:op},inputs:{A:{block:a},B:{block:b}}}; },
    q:function(b){ return typeof b==='string'?X.t(b):typeof b==='number'?X.n(b):b; },
    join:function(){ var a=[].slice.call(arguments), o={type:'text_join',extraState:{itemCount:a.length},inputs:{}}; a.forEach(function(b,i){ o.inputs['ADD'+i]={block:X.q(b)}; }); return o; },
    mod:function(a,b){ return {type:'math_modulo',inputs:{DIVIDEND:{block:X.q(a)},DIVISOR:{block:X.q(b)}}}; },
    iff:function(cond,then,els){ var o={type:'controls_if',inputs:{IF0:{block:cond}}}, c=X.chain(then); if(c) o.inputs.DO0={block:c}; if(els){ o.extraState={hasElse:true}; var e=X.chain(els); if(e) o.inputs.ELSE={block:e}; } return o; },
    forI:function(v,from,to,by,body){ var o={type:'controls_for',fields:{VAR:X.v(v)},inputs:{FROM:{block:X.q(from)},TO:{block:X.q(to)},BY:{block:X.q(by)}}}, c=X.chain(body); if(c) o.inputs.DO={block:c}; return o; },
    rep:function(n,body){ var o={type:'controls_repeat_ext',inputs:{TIMES:{block:X.q(n)}}}, c=X.chain(body); if(c) o.inputs.DO={block:c}; return o; },
    top:function(list,x,y){ var c=X.chain(list); if(c){ c.x=x==null?30:x; c.y=y==null?30:y; tops.push(c); } return X; },
    done:function(){ return {blocks:{languageVersion:0,blocks:tops},variables:Object.keys(vars).map(function(k){ return vars[k]; })}; }
  }; return X; }
function tree(fn){ var X=Tree(); fn(X); return X.done(); }

/* ---------- public ---------- */
window.BL={
  langs:LANGS, lang:lang, parse:parse, tr:tr, REG:REG, GEN:GEN, ORD:ORD, ALLROWS:ALLROWS, STD:STD, sb:sb, tree:tree, genCode:genCode, toolbox:toolbox, varsFlyout:varsFlyout, defineRows:defineRows,
  cleanId:cleanId, blockItem:blockItem,
  /* catalogs call this: BL.add('js',{cats:[{id,name,colour,rows|items,custom}], examples:[], starter:fn}) */
  add:function(lg,spec){ REG[lg]=spec; spec.rowBy={}; defineRows(lg,spec.cats,null); },
  starter:function(lg){ var R=REG[lg]; return R&&R.starter?tree(R.starter):null; },
  examples:function(lg){ var R=REG[lg]; return (R&&R.examples)||[]; },
  has:function(lg){ return !!REG[lg]; }
};
/* generators: JavaScript and Python come with Blockly (python_compressed.js), BeaconScript is ours */
try{ GEN.js=javascript.javascriptGenerator; ORD.js=javascript.Order; }catch(e){}
try{ GEN.py=python.pythonGenerator; ORD.py=python.Order; GEN.py.INDENT='    '; }catch(e){}
(function(){ var G=new Blockly.Generator('BeaconScript'); G.INDENT='    '; G.ORDER_ATOMIC=0;
  G.scrub_=function(block,code,thisOnly){ var next=block.nextConnection&&block.nextConnection.targetBlock(); var nc=thisOnly?'':this.blockToCode(next); return code+nc; };
  G.init=function(){ if(!this.nameDB_) this.nameDB_=new Blockly.Names('mod'); };
  G.finish=function(code){ return code; };
  G.scrubNakedValue=function(l){ return l+'\n'; };
  GEN.bs=G; ORD.bs={ATOMIC:0,NONE:99}; })();
})();
