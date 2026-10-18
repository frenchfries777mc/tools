/* Block HTML examples (v40): 8 examples from easy to harder, written as Blockly XML through a tiny builder so the text can be translated.
   Each one has a title and a goal on the page, works with touch and keys, and has a few short block comments for learning.
   Pictures come from the 🍎 오브젝트 library (plus a drawn basket) and go into the project's "내 그림" when the example opens. */
(function(){
'use strict';
var T=FFT.T;
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
var VARS=[];
function vid(n){ var i=VARS.indexOf(n); if(i<0){ VARS.push(n); i=VARS.length-1; } return 'v'+i; }
function X(node){ if(node==null) return ''; if(typeof node==='function') return node(null); if(Array.isArray(node)) return chain(node); return node; }
function chain(a){ return a.reduceRight(function(acc,f){ return f(acc||null); },null)||''; }
/* B(type,{f:fields, v:values, s:statements, m:mutation, c:comment}) */
function B(type,o){ o=o||{}; return function(next){
  var s='<block type="'+type+'"'+(o.x!=null?' x="'+o.x+'" y="'+o.y+'"':'')+'>'+(o.m||'');
  if(o.c) s+='<comment pinned="false" h="70" w="240">'+esc(T(o.c))+'</comment>';
  var f=o.f||{}; for(var k in f) s+='<field name="'+k+'"'+(k==='VAR'?' id="'+vid(f[k])+'"':'')+'>'+esc(f[k])+'</field>';
  var v=o.v||{}; for(k in v) s+='<value name="'+k+'">'+X(v[k])+'</value>';
  var st=o.s||{}; for(k in st) s+='<statement name="'+k+'">'+X(st[k])+'</statement>';
  if(next) s+='<next>'+next+'</next>'; return s+'</block>'; }; }
function N(n){ return '<shadow type="math_number"><field name="NUM">'+n+'</field></shadow>'; }
function S(t){ return '<shadow type="text"><field name="TEXT">'+esc(t)+'</field></shadow>'; }
function TX(t){ return X(B('text',{f:{TEXT:t}})); }
function COL(c){ return '<shadow type="val_color"><field name="COLOR">'+c+'</field></shadow>'; }
function NUMB(n){ return X(B('math_number',{f:{NUM:n}})); }
function G(n){ return X(B('variables_get',{f:{VAR:n}})); }
function SET(n,v,c){ return B('variables_set',{f:{VAR:n},v:{VALUE:v},c:c}); }
function CHG(n,d){ return B('math_change',{f:{VAR:n},v:{DELTA:typeof d==='number'?N(d):d}}); }
function CMP(op,a,b){ return X(B('logic_compare',{f:{OP:op},v:{A:a,B:b}})); }
function AND(a,b){ return X(B('logic_operation',{f:{OP:'AND'},v:{A:a,B:b}})); }
function OR(a,b){ return X(B('logic_operation',{f:{OP:'OR'},v:{A:a,B:b}})); }
function OP(op,a,b){ return X(B('math_arithmetic',{f:{OP:op},v:{A:a,B:b}})); }
function RND(a,b){ return X(B('math_random_int',{v:{FROM:N(a),TO:N(b)}})); }
function LIM(v,lo,hi){ return X(B('math_constrain',{v:{VALUE:v,LOW:lo,HIGH:hi}})); }
function JOIN(parts){ var v={}; parts.forEach(function(p,i){ v['ADD'+i]=p; }); return X(B('text_join',{m:'<mutation items="'+parts.length+'"></mutation>',v:v})); }
function IF(cond,then,els,c){ return B('controls_if',{m:els?'<mutation else="1"></mutation>':'',v:{IF0:cond},s:els?{DO0:then,ELSE:els}:{DO0:then},c:c}); }
function WHERE(el,ax){ return X(B('val_where',{f:{EL:el,AXIS:ax}})); }
function GETN(el){ return X(B('val_get',{f:{EL:el,PROP:'num'}})); }
function GETT(el){ return X(B('val_get',{f:{EL:el,PROP:'text'}})); }
function V(v){ return String(v).charAt(0)==='<'?v:S(v); } // a plain text becomes a text block, block XML stays as it is
function SETT(el,v,c){ return B('act_set',{f:{EL:el},v:{VALUE:V(v)},c:c}); }
function SHOW(el,m){ return B('act_show',{f:{EL:el,MODE:m}}); }
function MOVE(el,x,y,c){ return B('act_move',{f:{EL:el},v:{X:x,Y:y},c:c}); }
function COLOR(el,prop,c){ return B('act_style',{f:{EL:el,PROP:prop},v:{VALUE:COL(c)}}); }
function SFX(k){ return B('act_sfx',{f:{SFX:k}}); }
function SAY(el,t,sec,c){ return sec?B('act_sayfor',{f:{EL:el,KIND:'say'},v:{VALUE:V(t),SEC:N(sec)},c:c}):B('act_say',{f:{EL:el,KIND:'say'},v:{VALUE:V(t)},c:c}); }
function IMG(id){ return X(B('val_myimg',{f:{IMG:id}})); }
function EVERY(name,sec,body,c){ return B('time_every',{f:{NAME:name},v:{SEC:N(sec)},s:{DO:body},c:c}); }
function DEF(name,body,c){ return B('procedures_defnoreturn',{m:'<mutation></mutation>',f:{NAME:name},c:c,s:{STACK:body}}); }
function CALL(name){ return B('procedures_callnoreturn',{m:'<mutation name="'+esc(name)+'"></mutation>'}); }
function ME(type,o){ o=o||{}; o.f=o.f||{}; o.f.EL='@me'; return B(type,o); }
function wrap(blocks){ var vars=VARS.map(function(n,i){ return '<variable id="v'+i+'">'+esc(n)+'</variable>'; }).join(''); var x='<xml xmlns="https://developers.google.com/blockly/xml"><variables>'+vars+'</variables>'+blocks.map(X).join('')+'</xml>'; VARS=[]; return x; }
function page(title,bg,body){ return B('page_root',{f:{TITLE:title,BG:bg,CENTER:'TRUE'},s:{BODY:body}}); }
function H(size,text,name){ return B('el_heading',{f:{SIZE:size,TEXT:text,NAME:name}}); }
function P(text,name){ return B('el_text',{f:{TEXT:text,NAME:name}}); }
function BTN(text,name){ return B('el_button',{f:{TEXT:text,NAME:name}}); }
function ROW(name,bg,body){ return B('el_box',{f:{DIR:'row',BG:bg||'',NAME:name},s:{BODY:body}}); }
function PIC(id,w,name){ return B('el_picture',{f:{IMG:id,W:w,NAME:name}}); }

/* pictures used by the examples: object-library SVGs (the same files the 🍎 오브젝트 picker uses) and a drawn basket */
var SVG={
  robot:"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" width=\"128\" height=\"128\"><g stroke=\"#2a2433\" stroke-width=\"2.5\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"M32 6v6M20 44h-8v10M44 44h8v10\" fill=\"none\" stroke-width=\"4\"/><circle cx=\"32\" cy=\"5\" r=\"3\" fill=\"#ef4444\"/><rect x=\"16\" y=\"12\" width=\"32\" height=\"24\" rx=\"6\" fill=\"#9ca3af\"/><rect x=\"21\" y=\"18\" width=\"22\" height=\"10\" rx=\"4\" fill=\"#1e293b\"/><g fill=\"#38bdf8\" stroke=\"none\"><circle cx=\"27\" cy=\"23\" r=\"3\"/><circle cx=\"37\" cy=\"23\" r=\"3\"/></g><rect x=\"20\" y=\"38\" width=\"24\" height=\"20\" rx=\"4\" fill=\"#cbd5e1\"/><rect x=\"27\" y=\"44\" width=\"10\" height=\"6\" rx=\"1\" fill=\"#facc15\"/></g></svg>",
  apple:"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" width=\"128\" height=\"128\"><g stroke=\"#2a2433\" stroke-width=\"2.5\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"M32 18c-6-5-20-4-20 12 0 14 10 24 16 22 2-1 6-1 8 0 6 2 16-8 16-22 0-16-14-17-20-12z\" fill=\"#ef4444\"/><path d=\"M32 18c0-5 1-8 4-11\" fill=\"none\"/><path d=\"M34 14c3-6 9-7 12-5-2 5-7 7-12 5z\" fill=\"#22c55e\"/><path d=\"M19 28c0-4 2-7 5-8\" fill=\"none\" stroke=\"#fff\" stroke-opacity=\".7\"/></g></svg>",
  banana:"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" width=\"128\" height=\"128\"><g stroke=\"#2a2433\" stroke-width=\"2.5\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"M12 18c2 18 16 30 36 28 4 0 6-3 4-5-14 2-26-6-32-24-1-3-8-3-8 1z\" fill=\"#facc15\"/><path d=\"M12 18l-2-6 5-1 2 6z\" fill=\"#a16207\"/><path d=\"M18 24c4 10 12 16 24 18\" fill=\"none\" stroke=\"#eab308\" stroke-width=\"2\"/></g></svg>",
  cherries:"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" width=\"128\" height=\"128\"><g stroke=\"#2a2433\" stroke-width=\"2.5\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"M22 40c2-12 8-22 18-30M42 42c-2-12-4-22-2-32\" fill=\"none\" stroke=\"#15803d\"/><path d=\"M40 10c6-2 12 0 14 4-6 2-11 0-14-4z\" fill=\"#22c55e\"/><circle cx=\"20\" cy=\"46\" r=\"10\" fill=\"#dc2626\"/><circle cx=\"42\" cy=\"48\" r=\"10\" fill=\"#dc2626\"/><path d=\"M15 43a5 5 0 0 1 4-4M37 45a5 5 0 0 1 4-4\" fill=\"none\" stroke=\"#fff\" stroke-opacity=\".7\"/></g></svg>",
  rocket:"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" width=\"128\" height=\"128\"><g stroke=\"#2a2433\" stroke-width=\"2.5\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"M27 46c0 6 2 10 5 14 3-4 5-8 5-14z\" fill=\"#f97316\"/><path d=\"M30 46c0 4 1 6 2 8 1-2 2-4 2-8z\" fill=\"#fde047\" stroke=\"none\"/><path d=\"M20 30l-8 10v8l8-4zM44 30l8 10v8l-8-4z\" fill=\"#ef4444\"/><path d=\"M32 4c10 8 14 20 12 34H20C18 24 22 12 32 4z\" fill=\"#e5e7eb\"/><circle cx=\"32\" cy=\"22\" r=\"5\" fill=\"#38bdf8\"/><path d=\"M24 38h16l-2 6H26z\" fill=\"#9ca3af\"/></g></svg>",
  alien:"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" width=\"128\" height=\"128\"><g stroke=\"#2a2433\" stroke-width=\"2.5\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"M24 12l-6-8M40 12l6-8\" fill=\"none\"/><circle cx=\"18\" cy=\"4\" r=\"2.5\" fill=\"#86efac\"/><circle cx=\"46\" cy=\"4\" r=\"2.5\" fill=\"#86efac\"/><path d=\"M32 10c-12 0-20 9-20 20 0 12 10 24 20 24s20-12 20-24c0-11-8-20-20-20z\" fill=\"#86efac\"/><path d=\"M18 30c2-4 8-6 10-2s-2 10-6 10-6-4-4-8zM46 30c-2-4-8-6-10-2s2 10 6 10 6-4 4-8z\" fill=\"#2a2433\"/><path d=\"M28 46c2 1 6 1 8 0\" fill=\"none\"/></g></svg>",
  smiley:"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" width=\"128\" height=\"128\"><g stroke=\"#2a2433\" stroke-width=\"2.5\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><circle cx=\"32\" cy=\"32\" r=\"24\" fill=\"#fde047\"/><g fill=\"#2a2433\" stroke=\"none\"><ellipse cx=\"24\" cy=\"26\" rx=\"3\" ry=\"4\"/><ellipse cx=\"40\" cy=\"26\" rx=\"3\" ry=\"4\"/></g><path d=\"M20 38c6 8 18 8 24 0\" fill=\"none\" stroke-width=\"3\"/></g></svg>",
  basket:"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" width=\"128\" height=\"128\"><g stroke=\"#2a2433\" stroke-width=\"2.5\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"M14 30 C14 12 50 12 50 30\" fill=\"none\" stroke-width=\"4\"/><path d=\"M6 28h52l-6 26H12z\" fill=\"#d97706\"/><path d=\"M6 28h52v6H6z\" fill=\"#f59e0b\"/><path d=\"M20 36l2 16M32 36v16M44 36l-2 16M10 42h44\" fill=\"none\" stroke=\"#92400e\"/></g></svg>"
};
function pics(list){ var o={}; list.forEach(function(p){ var svg=SVG[p[0]]; if(!svg) return; o['ex-'+p[0]]={name:T(p[1]),data:'data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg))),w:128,h:128,clear:true}; }); return o; }
function pid(k){ return 'ex-'+k; }

var EX=[
/* 1. the very first one: one button, one number */
{name:'클릭 카운터',desc:'버튼을 누를 때마다 숫자가 하나씩 올라가요. 10번 누르면 축하해 줘요',xml:function(){
  var cnt=T('횟수'), num=T('숫자'), bt=T('버튼'), goal=T('안내'), again=T('다시');
  return wrap([
    page(T('클릭 카운터'),'#fff8e1',[H('h1','🍟 '+T('클릭 카운터'),T('제목')),P(T('버튼을 10번 눌러 보세요!'),goal),H('h1','0',num),
      ROW(T('버튼줄'),'',[BTN('👆 '+T('눌러요!'),bt),BTN('↺ '+T('처음부터'),again)])]),
    B('ev_start',{c:'처음엔 숫자를 0으로 해요',s:{DO:[SET(cnt,NUMB(0)),B('act_size',{f:{EL:num,PROP:'fontSize'},v:{N:N(64)}})]}}),
    B('ev_click',{f:{EL:bt},c:'버튼을 누를 때마다 1씩 더하고 화면에 보여 줘요',s:{DO:[CHG(cnt,1),SETT(num,G(cnt)),B('act_beep',{f:{NOTE:'523.25'},v:{SEC:N(0.08)}}),
      IF(CMP('EQ',G(cnt),NUMB(10)),[COLOR(num,'color','#ef4444'),SETT(goal,'🎉 '+T('10번 성공! 더 눌러 볼까요?')),SFX('win')],null,'딱 10번이 되면 축하해요')]}}),
    B('ev_click',{f:{EL:again},s:{DO:[SET(cnt,NUMB(0)),SETT(num,G(cnt)),COLOR(num,'color','#1f2937'),SETT(goal,T('버튼을 10번 눌러 보세요!'))]}})
  ]); }},

/* 2. input + speech bubble */
{name:'이름 인사',desc:'이름을 쓰면 로봇이 말풍선으로 인사해 줘요',imgs:function(){ return pics([['robot','로봇']]); },xml:function(){
  var inp=T('이름칸'), bt=T('인사버튼'), bot=T('로봇'), out=T('인사말');
  var name=GETT(inp);
  return wrap([
    page(T('이름 인사'),'#e0f2fe',[H('h1','👋 '+T('이름 인사'),T('제목')),P(T('이름을 쓰고 인사하기를 눌러 보세요'),T('안내')),
      PIC(pid('robot'),130,bot),ROW(T('입력줄'),'',[B('el_input',{f:{KIND:'text',TEXT:T('이름을 쓰세요'),NAME:inp}}),BTN('💬 '+T('인사하기'),bt)]),H('h2','',out)]),
    B('ev_start',{c:'로봇이 먼저 말을 걸어요',s:{DO:[SAY(bot,T('안녕! 네 이름은 뭐야?'))]}}),
    DEF(T('인사하기'),[IF(X(B('text_isEmpty',{v:{VALUE:GETT(inp)}})),
      [SAY(bot,T('이름을 먼저 써 줘!'),2),SFX('lose')],
      [SAY(bot,JOIN([TX(T('반가워, ')),name,TX(T('! 👋'))]),3),SETT(out,JOIN([TX(T('안녕하세요, ')),GETT(inp),TX(T('님!'))])),B('act_style',{f:{EL:out,PROP:'color'},v:{VALUE:X(B('val_rcolor'))}}),SFX('pop')],
      '이름칸이 비어 있으면 알려 주고, 아니면 이름으로 인사해요')]),
    B('ev_click',{f:{EL:bt},s:{DO:[CALL(T('인사하기'))]}}),
    B('ev_key',{f:{KEY:'Enter'},c:'엔터 키를 눌러도 인사해요',s:{DO:[CALL(T('인사하기'))]}})
  ]); }},

/* 3. variables, if / else if, a try counter and a restart */
{name:'숫자 맞히기',desc:'1부터 100 사이 숫자를 맞혀요. 더 커요, 더 작아요 힌트와 시도 횟수가 나와요',xml:function(){
  var ans=T('정답'), tries=T('시도'), guess=T('추측'), inp=T('숫자칸'), bt=T('확인'), res=T('결과'), cnt=T('횟수표시'), again=T('새 게임');
  function newGame(){ return [SET(ans,RND(1,100),'컴퓨터가 1부터 100 사이에서 숫자 하나를 몰래 골라요'),SET(tries,NUMB(0)),SETT(res,'🤔 '+T('숫자를 골랐어요. 맞혀 보세요!')),COLOR(res,'color','#e2e8f0'),SETT(cnt,T('시도: 0번')),B('act_clear',{f:{EL:inp}}),SHOW(again,'hide'),SHOW(bt,'show')]; }
  return wrap([
    page(T('숫자 맞히기'),'#0f172a',[H('h1','🔢 '+T('숫자 맞히기'),T('제목')),P(T('1부터 100 사이의 숫자를 맞혀 보세요'),T('안내')),
      ROW(T('입력줄'),'',[B('el_input',{f:{KIND:'number',TEXT:T('숫자'),NAME:inp}}),BTN('✅ '+T('확인'),bt)]),H('h2','',res),P('',cnt),BTN('🔄 '+T('새 게임'),again)]),
    B('ev_start',{s:{DO:newGame()}}),
    B('ev_click',{f:{EL:again},s:{DO:newGame()}}),
    B('ev_click',{f:{EL:bt},s:{DO:[CALL(T('맞혀 보기'))]}}),
    B('ev_key',{f:{KEY:'Enter'},c:'엔터 키를 눌러도 돼요',s:{DO:[CALL(T('맞혀 보기'))]}}),
    DEF(T('맞혀 보기'),[
      IF(OR(X(B('text_isEmpty',{v:{VALUE:GETT(inp)}})),X(B('logic_negate',{v:{BOOL:X(B('logic_between',{v:{X:GETN(inp),LO:N(1),HI:N(100)}}))}}))),
        [SETT(res,'✋ '+T('1부터 100 사이 숫자를 써 주세요')),COLOR(res,'color','#fca5a5')],
        [CHG(tries,1),SET(guess,GETN(inp)),SETT(cnt,JOIN([TX(T('시도: ')),G(tries),TX(T('번'))])),
         B('controls_if',{m:'<mutation elseif="1" else="1"></mutation>',c:'정답과 비교해서 힌트를 줘요',v:{IF0:CMP('EQ',G(guess),G(ans)),IF1:CMP('LT',G(guess),G(ans))},s:{
           DO0:[SETT(res,JOIN([TX('🎉 '+T('정답! ')),G(tries),TX(T('번 만에 맞혔어요'))])),COLOR(res,'color','#4ade80'),SFX('win'),SHOW(bt,'hide'),SHOW(again,'show')],
           DO1:[SETT(res,JOIN([G(guess),TX(T('보다 더 커요 ⬆'))])),COLOR(res,'color','#facc15'),B('act_beep',{f:{NOTE:'392.00'},v:{SEC:N(0.1)}})],
           ELSE:[SETT(res,JOIN([G(guess),TX(T('보다 더 작아요 ⬇'))])),COLOR(res,'color','#38bdf8'),B('act_beep',{f:{NOTE:'293.66'},v:{SEC:N(0.1)}})]}}),
         B('act_clear',{f:{EL:inp}})],
        '빈칸이거나 1~100이 아니면 다시 쓰게 해요')])
  ]); }},

/* 4. lists and a loop */
{name:'할 일 목록',desc:'할 일을 추가하고, 끝낸 일은 아래로 옮기고, 한 번에 지워요',xml:function(){
  var todo=T('할일들'), done=T('끝낸일들'), item=T('항목'), inp=T('할일칸'), add=T('추가'), fin=T('끝내기'), clr=T('모두지우기'), L1=T('할일목록'), L2=T('끝낸목록'), info=T('개수'), msg=T('알림');
  function show(){ return B('procedures_callnoreturn',{m:'<mutation name="'+esc(T('목록 보여 주기'))+'"></mutation>'}); }
  function len(v){ return X(B('lists_length',{v:{VALUE:G(v)}})); }
  function emptyList(){ return X(B('lists_create_with',{m:'<mutation items="0"></mutation>'})); }
  function push(list,val){ return B('lists_setIndex',{m:'<mutation at="false"></mutation>',f:{MODE:'INSERT',WHERE:'LAST'},v:{LIST:G(list),TO:val}}); }
  function each(list,el){ return B('controls_forEach',{f:{VAR:item},v:{LIST:G(list)},s:{DO:[B('act_append',{f:{EL:el},v:{VALUE:G(item)}})]}}); }
  return wrap([
    page(T('할 일 목록'),'#f0fdf4',[H('h1','📝 '+T('할 일 목록'),T('제목')),P(T('할 일을 쓰고 추가를 눌러요. 다 하면 끝내기!'),T('안내')),
      ROW(T('입력줄'),'',[B('el_input',{f:{KIND:'text',TEXT:T('예: 숙제하기'),NAME:inp}}),BTN('➕ '+T('추가'),add)]),
      ROW(T('버튼줄'),'',[BTN('✔ '+T('맨 위 일 끝내기'),fin),BTN('🗑 '+T('모두 지우기'),clr)]),P('',msg),
      H('h3','📌 '+T('할 일'),T('할일제목')),B('el_list',{f:{NAME:L1}}),H('h3','✅ '+T('끝낸 일'),T('끝낸제목')),B('el_list',{f:{NAME:L2}}),P('',info)]),
    B('procedures_defnoreturn',{m:'<mutation></mutation>',f:{NAME:T('목록 보여 주기')},c:'두 리스트를 화면 목록에 다시 그려요',s:{STACK:[
      B('act_clear',{f:{EL:L1}}),each(todo,L1),B('act_clear',{f:{EL:L2}}),each(done,L2),
      SETT(info,JOIN([TX(T('남은 일 ')),len(todo),TX(T('개 · 끝낸 일 ')),len(done),TX(T('개'))]))]}}),
    B('ev_start',{c:'빈 리스트 두 개로 시작해요',s:{DO:[SET(todo,emptyList()),SET(done,emptyList()),show()]}}),
    DEF(T('추가하기'),[IF(X(B('text_isEmpty',{v:{VALUE:GETT(inp)}})),[SETT(msg,'✋ '+T('할 일을 먼저 써 주세요'))],
      [push(todo,GETT(inp)),B('act_clear',{f:{EL:inp}}),SETT(msg,''),SFX('pop'),show()],'쓴 글을 할 일 리스트 맨 뒤에 넣어요')]),
    B('ev_click',{f:{EL:add},s:{DO:[CALL(T('추가하기'))]}}),
    B('ev_key',{f:{KEY:'Enter'},s:{DO:[CALL(T('추가하기'))]}}),
    B('ev_click',{f:{EL:fin},s:{DO:[IF(X(B('lists_isEmpty',{v:{VALUE:G(todo)}})),[SETT(msg,'🙌 '+T('남은 할 일이 없어요'))],
      [push(done,X(B('lists_getIndex',{m:'<mutation statement="false" at="false"></mutation>',f:{MODE:'GET_REMOVE',WHERE:'FIRST'},v:{VALUE:G(todo)}}))),SETT(msg,'👍 '+T('잘했어요!')),SFX('coin'),show()],
      '맨 위 할 일을 꺼내서 끝낸 일로 옮겨요')]}}),
    B('ev_click',{f:{EL:clr},s:{DO:[SET(todo,emptyList()),SET(done,emptyList()),SETT(msg,T('모두 지웠어요')),show()]}})
  ]); }},

/* 5. timing, states and a saved best (lower is better) */
{name:'반응 속도 게임',desc:'초록색이 되면 바로 눌러요. 가장 빠른 기록이 저장돼요',xml:function(){
  var st=T('상태'), ms=T('밀리초'), sig=T('신호'), best=T('최고기록'), K=T('반응 최고 기록'), info=T('안내');
  function load(){ return X(B('val_load',{v:{NAME:TX(K),DEF:NUMB(0)}})); }
  function IS(c){ return CMP('EQ',G(st),NUMB(c)); }
  function bestText(){ return IF(CMP('GT',load(),NUMB(0)),[SETT(best,JOIN([TX('🏆 '+T('최고 기록: ')),load(),TX(T(' 밀리초'))]))],[SETT(best,'🏆 '+T('최고 기록: 아직 없어요'))]); }
  return wrap([
    page(T('반응 속도 게임'),'#0f172a',[H('h1','⚡ '+T('반응 속도 게임'),T('제목')),P(T('아래 칸을 누르면 시작해요. 초록색이 되면 바로 누르세요! (스페이스 키도 돼요)'),info),
      BTN('👆 '+T('눌러서 시작'),sig),H('h3','',best)]),
    B('ev_start',{c:'상태 0: 시작 전, 1: 기다리기, 2: 지금 누르기, 3: 끝',s:{DO:[SET(st,NUMB(0)),
      B('act_size',{f:{EL:sig,PROP:'width'},v:{N:N(300)}}),B('act_size',{f:{EL:sig,PROP:'height'},v:{N:N(180)}}),B('act_size',{f:{EL:sig,PROP:'fontSize'},v:{N:N(26)}}),COLOR(sig,'color','#ffffff'),COLOR(sig,'background','#3b82f6'),bestText()]}}),
    B('procedures_defnoreturn',{m:'<mutation></mutation>',f:{NAME:T('누르기')},s:{STACK:[
      B('controls_if',{m:'<mutation elseif="2"></mutation>',v:{IF0:OR(IS(0),IS(3)),IF1:IS(1),IF2:IS(2)},c:'지금 상태에 따라 하는 일이 달라요',s:{
        DO0:[SET(st,NUMB(1)),SETT(sig,'⏳ '+T('기다려요…')),COLOR(sig,'background','#ef4444'),
          B('time_after',{f:{NAME:T('신호')},v:{SEC:X(B('math_random_int',{v:{FROM:N(2),TO:N(4)}}))},c:'2~4초 뒤 아무 때나 초록색이 돼요',s:{DO:[SET(st,NUMB(2)),SET(ms,NUMB(0)),SETT(sig,'🟢 '+T('지금 눌러요!')),COLOR(sig,'background','#22c55e'),
            EVERY(T('재기'),0.01,[CHG(ms,10)])]}})],
        DO1:[B('time_stop',{f:{NAME:T('신호')}}),SET(st,NUMB(3)),SETT(sig,'😅 '+T('너무 일러요! 다시 눌러 보세요')),COLOR(sig,'background','#f97316'),SFX('lose')],
        DO2:[B('time_stop',{f:{NAME:T('재기')}}),SET(st,NUMB(3)),SETT(sig,JOIN([TX('⚡ '),G(ms),TX(T(' 밀리초! 다시 하려면 눌러요'))])),COLOR(sig,'background','#3b82f6'),SFX('coin'),
          IF(OR(CMP('EQ',load(),NUMB(0)),CMP('LT',G(ms),load())),[B('act_store',{v:{NAME:TX(K),VALUE:G(ms)}}),SFX('win')],null,'더 빠르면 새 기록으로 저장해요'),bestText()]}})]}}),
    B('ev_click',{f:{EL:sig},s:{DO:[B('procedures_callnoreturn',{m:'<mutation name="'+esc(T('누르기'))+'"></mutation>'})]}}),
    B('ev_key',{f:{KEY:' '},s:{DO:[B('procedures_callnoreturn',{m:'<mutation name="'+esc(T('누르기'))+'"></mutation>'})]}})
  ]); }},

/* 6. clones, touch and keys, sound, a 30 s timer and a best score */
{name:'과일 받기 게임',desc:'바구니로 떨어지는 과일을 30초 동안 받아요. 키나 손가락으로 움직여요',imgs:function(){ return pics([['basket','바구니'],['apple','사과'],['banana','바나나'],['cherries','체리']]); },xml:function(){
  var cv=T('하늘'), bk=T('바구니'), fr=T('과일'), stat=T('상태줄'), go=T('시작버튼'), lb=T('왼쪽'), rb=T('오른쪽'), best=T('과일 최고 점수');
  var on=T('게임중'), left=T('남은시간'), cx=T('하늘x'), cy=T('하늘y');
  function bx(x){ return MOVE(bk,LIM(x,G(cx),OP('ADD',G(cx),NUMB(270))),OP('ADD',G(cy),NUMB(330))); }
  function status(){ return SETT(stat,JOIN([TX('⏱ '+T('남은 시간 ')),G(left),TX(T('초'))])); }
  return wrap([
    page(T('과일 받기 게임'),'#fff7ed',[H('h1','🧺 '+T('과일 받기 게임'),T('제목')),P(T('30초 동안 과일을 많이 받아요! ← → 키를 누르거나, 하늘을 손가락으로 끌어요'),T('안내')),
      H('h3','⏱ '+T('남은 시간 30초'),stat),B('el_canvas',{f:{W:340,H:400,NAME:cv}}),
      ROW(T('버튼줄'),'',[BTN('◀',lb),BTN('▶ '+T('시작'),go),BTN('▶',rb)]),PIC(pid('basket'),70,bk),PIC(pid('apple'),44,fr)]),
    B('ev_start',{c:'하늘을 칠하고, 바구니를 아래쪽에 놓아요',s:{DO:[SET(on,NUMB(0)),SET(cx,WHERE(cv,'x')),SET(cy,WHERE(cv,'y')),
      B('draw_fill',{f:{EL:cv},v:{COLOR:COL('#38bdf8')}}),B('draw_rect',{f:{EL:cv},v:{X:N(0),Y:N(370),W:N(340),H:N(30),COLOR:COL('#22c55e')}}),
      SHOW(fr,'hide'),bx(OP('ADD',G(cx),NUMB(135))),B('act_bestboard',{f:{NAME:best,MODE:'show'}}),SAY(bk,T('시작을 누르고 과일을 받아 줘!'))]}}),
    B('ev_click',{f:{EL:go},s:{DO:[IF(CMP('EQ',G(on),NUMB(0)),[SET(on,NUMB(1)),SET(left,NUMB(30)),B('act_score',{f:{MODE:'set'},v:{N:N(0)}}),SET(cx,WHERE(cv,'x')),SET(cy,WHERE(cv,'y')),
      B('clone_delall',{f:{EL:fr}}),SAY(bk,''),status(),SETT(go,'⏳ '+T('게임 중')),
      EVERY(T('과일 만들기'),0.7,[B('clone_make_at',{f:{EL:fr},v:{X:OP('ADD',G(cx),RND(10,290)),Y:OP('ADD',G(cy),NUMB(4))}})],'0.7초마다 하늘 위쪽 아무 데나 과일 복제본을 만들어요'),
      EVERY(T('시계'),1,[CHG(left,-1),status(),IF(CMP('LTE',G(left),NUMB(0)),[
        SET(on,NUMB(0)),B('time_stopall'),B('clone_delall',{f:{EL:fr}}),B('act_best',{f:{NAME:best},v:{N:X(B('val_score'))}}),SFX('win'),
        SETT(stat,JOIN([TX('🎉 '+T('끝! 받은 과일 ')),X(B('val_score')),TX(T('개'))])),SAY(bk,T('잘했어! 한 번 더?'),3),SETT(go,'🔄 '+T('다시 하기'))],null,'시간이 0이 되면 게임 끝: 멈추고 최고 점수를 저장해요')])],null,'게임 중이 아닐 때만 새로 시작해요')]}}),
    B('ev_clone',{f:{EL:fr},c:'과일 복제본마다 따로 그림과 속도를 정하고 떨어져요',s:{DO:[
      ME('act_set',{v:{VALUE:X(B('lists_getIndex',{m:'<mutation statement="false" at="false"></mutation>',f:{MODE:'GET',WHERE:'RANDOM'},v:{VALUE:X(B('lists_create_with',{m:'<mutation items="3"></mutation>',v:{ADD0:IMG(pid('apple')),ADD1:IMG(pid('banana')),ADD2:IMG(pid('cherries'))}}))}}))}}),
      ME('clone_setv',{f:{K:T('속도')},v:{V:RND(3,6)}}),
      EVERY(T('떨어지기'),0.03,[ME('act_nudge',{f:{AXIS:'y'},v:{N:X(B('math_single',{f:{OP:'NEG'},v:{NUM:X(ME('clone_getv',{f:{K:T('속도')}}))}}))}}),
        B('controls_if',{m:'<mutation elseif="1"></mutation>',v:{IF0:X(B('val_hit',{f:{A:'@me',B:bk,MODE:'box'}})),IF1:CMP('GT',WHERE('@me','y'),OP('ADD',G(cy),NUMB(360)))},s:{
          DO0:[B('act_score',{f:{MODE:'add'},v:{N:N(1)}}),SFX('coin'),B('clone_del',{f:{EL:'@me'}})],DO1:[B('clone_del',{f:{EL:'@me'}})]},c:'바구니에 닿으면 1점, 땅에 닿으면 그냥 사라져요'})])]}}),
    B('ev_keyhold',{f:{KEY:'ArrowLeft'},s:{DO:[bx(OP('MINUS',WHERE(bk,'x'),NUMB(8)))]}}),
    B('ev_keyhold',{f:{KEY:'ArrowRight'},s:{DO:[bx(OP('ADD',WHERE(bk,'x'),NUMB(8)))]}}),
    B('ev_click',{f:{EL:lb},s:{DO:[bx(OP('MINUS',WHERE(bk,'x'),NUMB(40)))]}}),
    B('ev_click',{f:{EL:rb},s:{DO:[bx(OP('ADD',WHERE(bk,'x'),NUMB(40)))]}}),
    B('ev_drag',{f:{EL:cv},c:'하늘을 손가락으로 끌면 바구니가 따라와요',s:{DO:[bx(OP('MINUS',OP('ADD',G(cx),X(B('val_mouse',{f:{AXIS:'x'}}))),NUMB(35)))]}})
  ]); }},

/* 7. clones for bullets and enemies, collision, lives, game over and restart */
{name:'우주 슈팅',desc:'로켓을 움직여 외계인을 맞혀요. 생명 3개, 게임 오버와 다시 하기가 있어요',imgs:function(){ return pics([['rocket','로켓'],['alien','외계인']]); },xml:function(){
  var cv=T('우주'), ship=T('로켓'), bul=T('총알'), foe=T('외계인'), stat=T('상태줄'), go=T('시작버튼'), lb=T('왼쪽'), fb=T('쏘기'), rb=T('오른쪽'), best=T('슈팅 최고 점수');
  var on=T('게임중'), lives=T('생명'), cx=T('우주x'), cy=T('우주y');
  function sx(x){ return MOVE(ship,LIM(x,G(cx),OP('ADD',G(cx),NUMB(290))),OP('ADD',G(cy),NUMB(350))); }
  function hearts(){ return SETT(stat,JOIN([TX('❤️ '+T('생명 ')),G(lives)])); }
  function fire(){ return IF(CMP('EQ',G(on),NUMB(1)),[B('clone_make_at',{f:{EL:bul},v:{X:OP('ADD',WHERE(ship,'x'),NUMB(20)),Y:OP('MINUS',WHERE(ship,'y'),NUMB(10))}}),SFX('laser')]); }
  var over=B('procedures_callnoreturn',{m:'<mutation name="'+esc(T('게임 오버'))+'"></mutation>'});
  return wrap([
    page(T('우주 슈팅'),'#0f172a',[H('h1','🚀 '+T('우주 슈팅'),T('제목')),P(T('외계인을 맞히면 1점! 외계인이 아래로 지나가면 생명이 줄어요. ← → 와 스페이스, 또는 아래 버튼'),T('안내')),
      H('h3','❤️ '+T('생명 3'),stat),B('el_canvas',{f:{W:340,H:420,NAME:cv}}),
      ROW(T('버튼줄'),'',[BTN('◀',lb),BTN('🔥 '+T('쏘기'),fb),BTN('▶',rb)]),BTN('▶ '+T('시작'),go),
      PIC(pid('rocket'),50,ship),H('h2','🔸',bul),PIC(pid('alien'),46,foe)]),
    B('ev_start',{c:'우주를 그리고 로켓을 아래에 놓아요. 원본 총알과 외계인은 숨겨요',s:{DO:[SET(on,NUMB(0)),SET(cx,WHERE(cv,'x')),SET(cy,WHERE(cv,'y')),
      B('draw_fill',{f:{EL:cv},v:{COLOR:COL('#111111')}}),
      B('controls_repeat_ext',{v:{TIMES:N(40)},s:{DO:[B('draw_circle',{f:{EL:cv},v:{X:RND(0,340),Y:RND(0,420),R:N(1),COLOR:COL('#ffffff')}})]},c:'별 40개를 아무 데나 찍어요'}),
      SHOW(bul,'hide'),SHOW(foe,'hide'),sx(OP('ADD',G(cx),NUMB(145))),B('act_bestboard',{f:{NAME:best,MODE:'show'}}),SAY(ship,T('시작을 눌러 줘!'))]}}),
    B('ev_click',{f:{EL:go},s:{DO:[IF(CMP('EQ',G(on),NUMB(0)),[SET(on,NUMB(1)),SET(lives,NUMB(3)),hearts(),B('act_score',{f:{MODE:'set'},v:{N:N(0)}}),SET(cx,WHERE(cv,'x')),SET(cy,WHERE(cv,'y')),
      SHOW(go,'hide'),SAY(ship,''),
      EVERY(T('외계인 만들기'),1.1,[B('clone_make_at',{f:{EL:foe},v:{X:OP('ADD',G(cx),RND(5,290)),Y:G(cy)}})],'1.1초마다 위쪽에 외계인 복제본이 나와요')])]}}),
    B('procedures_defnoreturn',{m:'<mutation></mutation>',f:{NAME:T('게임 오버')},c:'모두 멈추고 복제본을 지운 다음 다시 하기 버튼을 보여 줘요',s:{STACK:[
      SET(on,NUMB(0)),B('time_stopall'),B('clone_delall',{f:{EL:foe}}),B('clone_delall',{f:{EL:bul}}),B('act_best',{f:{NAME:best},v:{N:X(B('val_score'))}}),SFX('boom'),
      SETT(stat,JOIN([TX('💥 '+T('게임 오버! 점수 ')),X(B('val_score'))])),SAY(ship,T('한 번 더 해 볼까?'),3),SETT(go,'🔄 '+T('다시 하기')),SHOW(go,'show')]}}),
    B('ev_clone',{f:{EL:foe},s:{DO:[EVERY(T('내려오기'),0.03,[ME('act_nudge',{f:{AXIS:'y'},v:{N:N(-2)}}),
      B('controls_if',{m:'<mutation elseif="1"></mutation>',v:{IF0:X(B('val_hit',{f:{A:'@me',B:ship,MODE:'circle'}})),IF1:CMP('GT',WHERE('@me','y'),OP('ADD',G(cy),NUMB(390)))},s:{
        DO0:[over],
        DO1:[B('clone_del',{f:{EL:'@me'}}),IF(CMP('GT',G(lives),NUMB(0)),[CHG(lives,-1),hearts(),SFX('lose')]),IF(AND(CMP('LTE',G(lives),NUMB(0)),CMP('EQ',G(on),NUMB(1))),[over])]},
        c:'로켓에 닿으면 게임 오버, 아래로 지나가면 생명 1개를 잃어요 (0보다 작아지지 않아요)'})])]}}),
    B('ev_clone',{f:{EL:bul},s:{DO:[EVERY(T('날아가기'),0.02,[ME('act_nudge',{f:{AXIS:'y'},v:{N:N(9)}}),IF(CMP('LT',WHERE('@me','y'),G(cy)),[B('clone_del',{f:{EL:'@me'}})])])]}}),
    B('ev_hit',{f:{A:bul+'*',B:foe+'*',MODE:'box'},c:'총알과 외계인이 닿으면 둘 다 지우고 1점',s:{DO:[B('clone_del',{f:{EL:'@other'}}),B('clone_del',{f:{EL:'@me'}}),B('act_score',{f:{MODE:'add'},v:{N:N(1)}}),SFX('pop')]}}),
    B('ev_keyhold',{f:{KEY:'ArrowLeft'},s:{DO:[sx(OP('MINUS',WHERE(ship,'x'),NUMB(7)))]}}),
    B('ev_keyhold',{f:{KEY:'ArrowRight'},s:{DO:[sx(OP('ADD',WHERE(ship,'x'),NUMB(7)))]}}),
    B('ev_key',{f:{KEY:' '},s:{DO:[fire()]}}),
    B('ev_click',{f:{EL:fb},s:{DO:[fire()]}}),
    B('ev_click',{f:{EL:lb},s:{DO:[sx(OP('MINUS',WHERE(ship,'x'),NUMB(35)))]}}),
    B('ev_click',{f:{EL:rb},s:{DO:[sx(OP('ADD',WHERE(ship,'x'),NUMB(35)))]}}),
    B('ev_drag',{f:{EL:cv},c:'우주를 손가락으로 끌면 로켓이 따라와요',s:{DO:[sx(OP('MINUS',OP('ADD',G(cx),X(B('val_mouse',{f:{AXIS:'x'}}))),NUMB(25)))]}})
  ]); }},

/* 8. tile map walls, a goal, a time limit, two levels and a restart */
{name:'미로 탈출',desc:'벽을 피해 ⭐까지 가요. 1단계를 깨면 2단계, 60초 안에 탈출해요',imgs:function(){ return pics([['smiley','웃는 얼굴']]); },xml:function(){
  var cv=T('미로판'), map=T('미로'), me=T('나'), stat=T('상태줄'), go=T('시작버튼'), lv=T('단계'), left=T('남은시간'), on=T('게임중');
  var up=T('위'), dn=T('아래'), lf=T('왼쪽'), rt=T('오른쪽'), cx=T('판x'), cy=T('판y');
  var L1=['##########','#....#...#','#.##.#.#.#','#.#..#.#.#','#.#.##.#.#','#......#*#','##########'];
  var L2=['##########','#...#....#','#.#.#.##.#','#.#...#..#','#.####.#.#','#......#*#','##########'];
  function walls(rows){ var a=[]; rows.forEach(function(r,y){ if(y===0||y===rows.length-1) return; for(var x=1;x<r.length-1;x++){ var ch=r.charAt(x); if(ch==='#') a.push(B('tile_set',{f:{M:map},v:{C:N(x),R:N(y),V:N(1)}})); else if(ch==='*') a.push(B('tile_set',{f:{M:map},v:{C:N(x),R:N(y),V:N(3)}})); } }); return a; }
  function build(name,rows){ return B('procedures_defnoreturn',{m:'<mutation></mutation>',f:{NAME:name},c:'지도를 비우고 테두리와 벽(1), 별 칸(3)을 놓아요',s:{STACK:[
    B('tile_fill',{f:{M:map,MODE:'all'},v:{V:N(0)}}),B('tile_fill',{f:{M:map,MODE:'border'},v:{V:N(1)}})].concat(walls(rows))}}); }
  function call(name){ return B('procedures_callnoreturn',{m:'<mutation name="'+esc(name)+'"></mutation>'}); }
  function home(){ return MOVE(me,OP('ADD',G(cx),NUMB(36)),OP('ADD',G(cy),NUMB(36))); }
  function draw(){ return [B('tile_draw',{f:{M:map}}),B('draw_text',{f:{EL:cv},v:{TEXT:S('⭐'),X:N(260),Y:N(186),COLOR:COL('#111111')}})]; }
  function cell(ax){ return X(B('tile_cell',{f:{M:map},v:{N:OP('MINUS',OP('ADD',WHERE(me,ax),NUMB(12)),ax==='x'?G(cx):G(cy))}})); }
  function step(dx,dy){ return IF(CMP('EQ',G(on),NUMB(1)),[B('tile_move',{f:{EL:me,M:map},v:{DX:N(dx),DY:N(dy)}})]); }
  function status(){ return SETT(stat,JOIN([TX('🏁 '),G(lv),TX(T('단계 · ⏱ ')),G(left),TX(T('초'))])); }
  return wrap([
    page(T('미로 탈출'),'#1e1b4b',[H('h1','🧭 '+T('미로 탈출'),T('제목')),P(T('화살표 키나 아래 버튼으로 움직여 ⭐까지 가요. 벽은 지나갈 수 없어요'),T('안내')),
      H('h3','🏁 '+T('시작을 눌러요'),stat),B('el_canvas',{f:{W:320,H:224,NAME:cv}}),
      ROW(T('위줄'),'',[BTN('⬆',up)]),ROW(T('가운데줄'),'',[BTN('⬅',lf),BTN('⬇',dn),BTN('➡',rt)]),BTN('▶ '+T('시작'),go),PIC(pid('smiley'),24,me)]),
    build(T('1단계 만들기'),L1),build(T('2단계 만들기'),L2),
    B('ev_start',{s:{DO:[SET(on,NUMB(0)),SET(cx,WHERE(cv,'x')),SET(cy,WHERE(cv,'y')),
      B('tile_make',{f:{EL:cv,M:map},v:{C:N(10),R:N(7),S:N(32)},c:'그림판 위에 가로 10칸, 세로 7칸 지도를 만들어요'}),
      B('tile_color',{f:{M:map},v:{V:N(1),COLOR:COL('#a855f7')}}),B('tile_color',{f:{M:map},v:{V:N(3),COLOR:COL('#facc15')}}),
      call(T('1단계 만들기'))].concat(draw()).concat([home()])}}),
    B('ev_click',{f:{EL:go},s:{DO:[IF(CMP('EQ',G(on),NUMB(0)),[SET(cx,WHERE(cv,'x')),SET(cy,WHERE(cv,'y')),SET(lv,NUMB(1)),SET(left,NUMB(60)),call(T('1단계 만들기'))].concat(draw()).concat([home(),SET(on,NUMB(1)),status(),SHOW(go,'hide'),
      EVERY(T('시계'),1,[CHG(left,-1),status(),IF(CMP('LTE',G(left),NUMB(0)),[SET(on,NUMB(0)),B('time_stopall'),SETT(stat,'⌛ '+T('시간이 다 됐어요! 다시 해 봐요')),SAY(me,T('아쉬워!'),2),SFX('lose'),SETT(go,'🔄 '+T('다시 하기')),SHOW(go,'show')],null,'60초가 지나면 게임 끝')]),
      EVERY(T('별 살피기'),0.05,[IF(CMP('EQ',X(B('tile_get',{f:{M:map},v:{C:cell('x'),R:cell('y')}})),NUMB(3)),[SFX('win'),
        IF(CMP('EQ',G(lv),NUMB(1)),[SET(lv,NUMB(2)),call(T('2단계 만들기'))].concat(draw()).concat([home(),status(),SAY(me,T('2단계!'),1.5)]),
          [SET(on,NUMB(0)),B('time_stopall'),SETT(stat,JOIN([TX('🎉 '+T('탈출 성공! 남은 시간 ')),G(left),TX(T('초'))])),SAY(me,T('탈출했다!'),3),SETT(go,'🔄 '+T('다시 하기')),SHOW(go,'show')])],
        '내가 있는 칸이 별 칸(3)이면 다음 단계로, 2단계면 탈출 성공')])]),null,'게임 중이 아닐 때만 시작해요')]}}),
    B('ev_keyhold',{f:{KEY:'ArrowLeft'},s:{DO:[step(-3,0)]}}),B('ev_keyhold',{f:{KEY:'ArrowRight'},s:{DO:[step(3,0)]}}),
    B('ev_keyhold',{f:{KEY:'ArrowUp'},s:{DO:[step(0,-3)]}}),B('ev_keyhold',{f:{KEY:'ArrowDown'},s:{DO:[step(0,3)]}}),
    B('ev_click',{f:{EL:lf},c:'버튼을 한 번 누르면 한 칸(32)만큼 가요. 벽이 있으면 멈춰요',s:{DO:[step(-32,0)]}}),B('ev_click',{f:{EL:rt},s:{DO:[step(32,0)]}}),
    B('ev_click',{f:{EL:up},s:{DO:[step(0,-32)]}}),B('ev_click',{f:{EL:dn},s:{DO:[step(0,32)]}})
  ]); }}
];
window.BH_EXAMPLES=EX;
})();
