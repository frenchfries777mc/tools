/* Block HTML examples, written as Blockly XML through a tiny builder so the text can be translated. */
(function(){
'use strict';
var T=FFT.T;
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
var VARS=[];
function vid(n){ var i=VARS.indexOf(n); if(i<0){ VARS.push(n); i=VARS.length-1; } return 'v'+i; }
function X(node){ if(node==null) return ''; if(typeof node==='function') return node(null); if(Array.isArray(node)) return chain(node); return node; }
function chain(a){ return a.reduceRight(function(acc,f){ return f(acc||null); },null)||''; }
function B(type,o){ o=o||{}; return function(next){
  var s='<block type="'+type+'"'+(o.x!=null?' x="'+o.x+'" y="'+o.y+'"':'')+'>'+(o.m||'');
  var f=o.f||{}; for(var k in f) s+='<field name="'+k+'"'+(k==='VAR'?' id="'+vid(f[k])+'"':'')+'>'+esc(f[k])+'</field>';
  var v=o.v||{}; for(k in v) s+='<value name="'+k+'">'+X(v[k])+'</value>';
  var st=o.s||{}; for(k in st) s+='<statement name="'+k+'">'+X(st[k])+'</statement>';
  if(next) s+='<next>'+next+'</next>'; return s+'</block>'; }; }
function N(n){ return '<shadow type="math_number"><field name="NUM">'+n+'</field></shadow>'; }
function S(t){ return '<shadow type="text"><field name="TEXT">'+esc(t)+'</field></shadow>'; }
function TX(t){ return X(B('text',{f:{TEXT:t}})); }
function COL(c){ return '<shadow type="val_color"><field name="COLOR">'+c+'</field></shadow>'; }
function G(n){ return X(B('variables_get',{f:{VAR:n}})); }
function SET(n,v){ return B('variables_set',{f:{VAR:n},v:{VALUE:v}}); }
function CHG(n,d){ return B('math_change',{f:{VAR:n},v:{DELTA:N(d)}}); }
function CMP(op,a,b){ return X(B('logic_compare',{f:{OP:op},v:{A:a,B:b}})); }
function OR(a,b){ return X(B('logic_operation',{f:{OP:'OR'},v:{A:a,B:b}})); }
function NUMB(n){ return X(B('math_number',{f:{NUM:n}})); }
function JOIN(parts){ var v={}; parts.forEach(function(p,i){ v['ADD'+i]=p; }); return X(B('text_join',{m:'<mutation items="'+parts.length+'"></mutation>',v:v})); }
function wrap(blocks){ var vars=VARS.map(function(n,i){ return '<variable id="v'+i+'">'+esc(n)+'</variable>'; }).join(''); var x='<xml xmlns="https://developers.google.com/blockly/xml"><variables>'+vars+'</variables>'+blocks.map(X).join('')+'</xml>'; VARS=[]; return x; }
function page(title,bg,body){ return B('page_root',{x:20,y:20,f:{TITLE:title,BG:bg,CENTER:'TRUE'},s:{BODY:body}}); }

var EX=[
{name:'클릭 카운터',desc:'버튼을 누를 때마다 숫자가 올라가요',xml:function(){
  var cnt=T('횟수'), sc=T('점수'), bt=T('버튼')+'1';
  return wrap([
    page(T('클릭 카운터'),'#fff8e1',[B('el_heading',{f:{SIZE:'h1',TEXT:'0',NAME:sc}}),B('el_button',{f:{TEXT:T('눌러요!'),NAME:bt}}),B('el_text',{f:{TEXT:T('10번 누르면 무슨 일이 생길까요?'),NAME:T('안내')}})]),
    B('ev_start',{x:420,y:20,s:{DO:[SET(cnt,NUMB(0))]}}),
    B('ev_click',{x:420,y:120,f:{EL:bt},s:{DO:[CHG(cnt,1),B('act_set',{f:{EL:sc},v:{VALUE:G(cnt)}}),B('act_beep',{f:{NOTE:'523.25'},v:{SEC:N(0.1)}}),
      B('controls_if',{v:{IF0:CMP('EQ',G(cnt),NUMB(10))},s:{DO0:[B('act_style',{f:{EL:sc,PROP:'color'},v:{VALUE:COL('#ef4444')}}),B('act_size',{f:{EL:sc,PROP:'fontSize'},v:{N:N(72)}}),B('act_alert',{v:{VALUE:S(T('10번 눌렀어요!'))}})]}})]}})
  ]); }},
{name:'인사하기',desc:'이름을 쓰면 인사해 줘요',xml:function(){
  var inp=T('이름칸'), bt=T('인사버튼'), out=T('인사말');
  return wrap([
    page(T('인사하기'),'#e0f2fe',[B('el_heading',{f:{SIZE:'h1',TEXT:T('반가워요 👋'),NAME:T('제목')+'1'}}),B('el_input',{f:{KIND:'text',TEXT:T('이름을 쓰세요'),NAME:inp}}),B('el_button',{f:{TEXT:T('인사하기'),NAME:bt}}),B('el_heading',{f:{SIZE:'h2',TEXT:'',NAME:out}})]),
    B('ev_click',{x:420,y:20,f:{EL:bt},s:{DO:[B('controls_if',{m:'<mutation else="1"></mutation>',v:{IF0:X(B('text_isEmpty',{v:{VALUE:X(B('val_get',{f:{EL:inp,PROP:'text'}}))}}))},
      s:{DO0:[B('act_set',{f:{EL:out},v:{VALUE:S(T('이름을 먼저 써 주세요'))}})],ELSE:[B('act_set',{f:{EL:out},v:{VALUE:JOIN([TX(T('안녕하세요, ')),X(B('val_get',{f:{EL:inp,PROP:'text'}})),TX(T('님!'))])}}),B('act_style',{f:{EL:out,PROP:'color'},v:{VALUE:X(B('val_rcolor'))}})]}})]}})
  ]); }},
{name:'숫자 맞히기',desc:'컴퓨터가 고른 숫자를 맞혀요',xml:function(){
  var ans=T('정답'), tries=T('시도'), guess=T('추측'), inp=T('숫자칸'), bt=T('확인'), res=T('결과');
  return wrap([
    page(T('숫자 맞히기'),'#0f172a',[B('el_heading',{f:{SIZE:'h1',TEXT:T('숫자 맞히기'),NAME:T('제목')+'1'}}),B('el_text',{f:{TEXT:T('1부터 100 사이의 숫자를 맞혀 보세요'),NAME:T('안내')}}),
      B('el_box',{f:{DIR:'row',BG:'',NAME:T('상자')+'1'},s:{BODY:[B('el_input',{f:{KIND:'number',TEXT:T('숫자'),NAME:inp}}),B('el_button',{f:{TEXT:T('확인'),NAME:bt}})]}}),B('el_heading',{f:{SIZE:'h2',TEXT:'',NAME:res}})]),
    B('ev_start',{x:440,y:20,s:{DO:[SET(ans,X(B('math_random_int',{v:{FROM:N(1),TO:N(100)}}))),SET(tries,NUMB(0))]}}),
    B('ev_click',{x:440,y:150,f:{EL:bt},s:{DO:[CHG(tries,1),SET(guess,X(B('val_get',{f:{EL:inp,PROP:'num'}}))),
      B('controls_if',{m:'<mutation elseif="1" else="1"></mutation>',v:{IF0:CMP('EQ',G(guess),G(ans)),IF1:CMP('LT',G(guess),G(ans))},s:{
        DO0:[B('act_set',{f:{EL:res},v:{VALUE:JOIN([TX(T('정답! ')),G(tries),TX(T('번 만에 맞혔어요 🎉'))])}}),B('act_style',{f:{EL:res,PROP:'color'},v:{VALUE:COL('#22c55e')}})],
        DO1:[B('act_set',{f:{EL:res},v:{VALUE:S(T('더 큰 수예요 ⬆'))}}),B('act_style',{f:{EL:res,PROP:'color'},v:{VALUE:COL('#facc15')}})],
        ELSE:[B('act_set',{f:{EL:res},v:{VALUE:S(T('더 작은 수예요 ⬇'))}}),B('act_style',{f:{EL:res,PROP:'color'},v:{VALUE:COL('#38bdf8')}})]}}),
      B('act_clear',{f:{EL:inp}})]}})
  ]); }},
{name:'통통 튀는 공',desc:'그림판과 "초마다"로 만드는 작은 애니메이션',xml:function(){
  var x='x', y='y', dx='dx', dy='dy', col=T('색'), cv=T('그림판')+'1';
  function bounce(v,d,max){ return B('controls_if',{v:{IF0:OR(CMP('LT',G(v),NUMB(18)),CMP('GT',G(v),NUMB(max)))},s:{DO0:[SET(d,X(B('math_single',{f:{OP:'NEG'},v:{NUM:G(d)}}))),B('act_beep',{f:{NOTE:'392.00'},v:{SEC:N(0.05)}})]}}); }
  return wrap([
    page(T('통통 튀는 공'),'#0f172a',[B('el_heading',{f:{SIZE:'h2',TEXT:T('통통 튀는 공'),NAME:T('제목')+'1'}}),B('el_canvas',{f:{W:320,H:220,NAME:cv}}),B('el_text',{f:{TEXT:T('그림판을 누르면 공이 그리로 가요. 스페이스 키는 색 바꾸기'),NAME:T('안내')}})]),
    B('ev_start',{x:420,y:20,s:{DO:[SET(x,NUMB(60)),SET(y,NUMB(60)),SET(dx,NUMB(4)),SET(dy,NUMB(3)),SET(col,X(B('val_color',{f:{COLOR:'#ffc93c'}})))]}}),
    B('ev_timer',{x:420,y:250,f:{SEC:0.03},s:{DO:[B('draw_clear',{f:{EL:cv}}),B('draw_circle',{f:{EL:cv},v:{X:G(x),Y:G(y),R:N(18),COLOR:G(col)}}),
      B('math_change',{f:{VAR:x},v:{DELTA:G(dx)}}),B('math_change',{f:{VAR:y},v:{DELTA:G(dy)}}),bounce(x,dx,302),bounce(y,dy,202)]}}),
    B('ev_key',{x:20,y:330,f:{KEY:' '},s:{DO:[SET(col,X(B('val_rcolor')))]}}),
    B('ev_click',{x:20,y:440,f:{EL:cv},s:{DO:[SET(x,X(B('val_mouse',{f:{AXIS:'x'}}))),SET(y,X(B('val_mouse',{f:{AXIS:'y'}})))]}})
  ]); }},
{name:'할 일 목록',desc:'입력칸, 목록, 덧붙이기',xml:function(){
  var inp=T('할일칸'), bt=T('추가버튼'), list=T('할일목록'), cnt=T('개수');
  return wrap([
    page(T('할 일 목록'),'#fce7f3',[B('el_heading',{f:{SIZE:'h1',TEXT:T('오늘 할 일'),NAME:T('제목')+'1'}}),
      B('el_box',{f:{DIR:'row',BG:'',NAME:T('상자')+'1'},s:{BODY:[B('el_input',{f:{KIND:'text',TEXT:T('할 일을 쓰세요'),NAME:inp}}),B('el_button',{f:{TEXT:T('추가'),NAME:bt}})]}}),
      B('el_list',{f:{NAME:list}}),B('el_text',{f:{TEXT:'',NAME:T('안내')}})]),
    B('ev_start',{x:440,y:20,s:{DO:[SET(cnt,NUMB(0))]}}),
    B('ev_click',{x:440,y:110,f:{EL:bt},s:{DO:[B('controls_if',{v:{IF0:X(B('logic_negate',{v:{BOOL:X(B('text_isEmpty',{v:{VALUE:X(B('val_get',{f:{EL:inp,PROP:'text'}}))}}))}}))},s:{DO0:[
      B('act_append',{f:{EL:list},v:{VALUE:X(B('val_get',{f:{EL:inp,PROP:'text'}}))}}),CHG(cnt,1),B('act_clear',{f:{EL:inp}}),
      B('act_set',{f:{EL:T('안내')},v:{VALUE:JOIN([TX(T('할 일 ')),G(cnt),TX(T('개'))])}})]}})]}})
  ]); }}
,{name:'계산기',desc:'두 숫자로 더하기, 빼기, 곱하기, 나누기',xml:function(){
  var a=T('첫째수'), b=T('둘째수'), res=T('계산결과');
  function calc(op,btn){ return B('ev_click',{x:440,y:btn,f:{EL:op[0]},s:{DO:[B('act_set',{f:{EL:res},v:{VALUE:X(B('math_arithmetic',{f:{OP:op[1]},v:{A:X(B('val_get',{f:{EL:a,PROP:'num'}})),B:X(B('val_get',{f:{EL:b,PROP:'num'}}))}}))}})]}}); }
  var ops=[['+','ADD'],['-','MINUS'],['x','MULTIPLY'],['/','DIVIDE']];
  return wrap([
    page(T('계산기'),'#e0f2fe',[B('el_heading',{f:{SIZE:'h1',TEXT:T('계산기'),NAME:T('제목')+'1'}}),
      B('el_box',{f:{DIR:'row',BG:'',NAME:T('상자')+'1'},s:{BODY:[B('el_input',{f:{KIND:'number',TEXT:T('첫째 수'),NAME:a}}),B('el_input',{f:{KIND:'number',TEXT:T('둘째 수'),NAME:b}})]}}),
      B('el_box',{f:{DIR:'row',BG:'',NAME:T('상자')+'2'},s:{BODY:ops.map(function(o){ return B('el_button',{f:{TEXT:o[0],NAME:o[0]}}); })}}),
      B('el_heading',{f:{SIZE:'h1',TEXT:'=',NAME:res}})])
  ].concat(ops.map(function(o,i){ return calc(o,20+i*110); }))); }}
,{name:'수학 퀴즈',desc:'문제를 풀고 점수를 받아요',xml:function(){
  var q=T('문제'), inp=T('답칸'), bt=T('제출'), fb=T('알림말'), sc=T('점수판'), qn='qn', score='score', ans='ans';
  return wrap([
    page(T('수학 퀴즈'),'#fff8e1',[B('el_heading',{f:{SIZE:'h2',TEXT:'3 + 4 = ?',NAME:q}}),B('el_input',{f:{KIND:'number',TEXT:T('답을 쓰세요'),NAME:inp}}),B('el_button',{f:{TEXT:T('제출'),NAME:bt}}),B('el_heading',{f:{SIZE:'h3',TEXT:'',NAME:fb}}),B('el_text',{f:{TEXT:T('점수: 0'),NAME:sc}})]),
    B('ev_start',{x:440,y:20,s:{DO:[SET(qn,NUMB(1)),SET(score,NUMB(0)),SET(ans,NUMB(7))]}}),
    B('ev_click',{x:440,y:130,f:{EL:bt},s:{DO:[
      B('controls_if',{m:'<mutation else="1"></mutation>',v:{IF0:CMP('EQ',X(B('val_get',{f:{EL:inp,PROP:'num'}})),G(ans))},
        s:{DO0:[CHG(score,1),B('act_set',{f:{EL:fb},v:{VALUE:S(T('맞았어요! 👍'))}}),B('act_style',{f:{EL:fb,PROP:'color'},v:{VALUE:COL('#22c55e')}}),B('act_beep',{f:{NOTE:'523.25'},v:{SEC:N(0.15)}})],
          ELSE:[B('act_set',{f:{EL:fb},v:{VALUE:JOIN([TX(T('아쉬워요. 정답은 ')),G(ans)])}}),B('act_style',{f:{EL:fb,PROP:'color'},v:{VALUE:COL('#ef4444')}}),B('act_beep',{f:{NOTE:'261.63'},v:{SEC:N(0.2)}})]}}),
      B('act_set',{f:{EL:sc},v:{VALUE:JOIN([TX(T('점수: ')),G(score)])}}),
      CHG(qn,1),B('act_clear',{f:{EL:inp}}),
      B('controls_if',{m:'<mutation elseif="1" else="1"></mutation>',v:{IF0:CMP('EQ',G(qn),NUMB(2)),IF1:CMP('EQ',G(qn),NUMB(3))},s:{
        DO0:[B('act_set',{f:{EL:q},v:{VALUE:S('9 x 6 = ?')}}),SET(ans,NUMB(54))],
        DO1:[B('act_set',{f:{EL:q},v:{VALUE:S('100 / 4 = ?')}}),SET(ans,NUMB(25))],
        ELSE:[B('act_set',{f:{EL:q},v:{VALUE:JOIN([TX(T('끝! 점수는 ')),G(score),TX(' / 3')])}}),B('act_show',{f:{EL:bt,MODE:'hide'}}),B('act_show',{f:{EL:inp,MODE:'hide'}})]}})]}})
  ]); }}
,{name:'별 잡기 게임',desc:'화살표 키나 손가락으로 움직여 20초 동안 별을 잡아요',xml:function(){
  var cv=T('그림판')+'1', sc=T('점수판'), tm=T('남은시간'), best=T('최고기록'), K=T('최고점');
  function key(k,v,d){ return B('ev_key',{x:20,y:v,f:{KEY:k},s:{DO:[CHG(d[0],d[1])]}}); }
  function clamp(n,hi){ return SET(n,X(B('math_constrain',{v:{VALUE:G(n),LOW:N(12),HIGH:N(hi)}}))); }
  function rnd(n,hi){ return SET(n,X(B('math_random_int',{v:{FROM:N(20),TO:N(hi)}}))); }
  return wrap([
    page(T('별 잡기 게임'),'#0f172a',[B('el_heading',{f:{SIZE:'h2',TEXT:T('별 잡기'),NAME:T('제목')+'1'}}),B('el_canvas',{f:{W:320,H:220,NAME:cv}}),
      B('el_text',{f:{TEXT:T('점수: 0'),NAME:sc}}),B('el_text',{f:{TEXT:T('남은 시간: 20'),NAME:tm}}),B('el_text',{f:{TEXT:'',NAME:best}})]),
    B('ev_start',{x:440,y:20,s:{DO:[SET('x',NUMB(160)),SET('y',NUMB(110)),SET('score',NUMB(0)),SET('left',NUMB(20)),rnd('sx',300),rnd('sy',200),
      B('act_set',{f:{EL:best},v:{VALUE:JOIN([TX(T('최고 기록: ')),X(B('val_load',{v:{NAME:TX(K),DEF:NUMB(0)}}))])}})]}}),
    B('ev_timer',{x:440,y:230,f:{SEC:0.03},s:{DO:[clamp('x',308),clamp('y',208),B('draw_clear',{f:{EL:cv}}),
      B('draw_circle',{f:{EL:cv},v:{X:G('sx'),Y:G('sy'),R:N(11),COLOR:COL('#ffc93c')}}),B('draw_circle',{f:{EL:cv},v:{X:G('x'),Y:G('y'),R:N(14),COLOR:COL('#38bdf8')}}),
      B('controls_if',{v:{IF0:CMP('LT',X(B('val_dist',{v:{X1:G('x'),Y1:G('y'),X2:G('sx'),Y2:G('sy')}})),NUMB(25))},s:{DO0:[CHG('score',1),rnd('sx',300),rnd('sy',200),B('act_beep',{f:{NOTE:'659.25'},v:{SEC:N(0.08)}}),B('act_set',{f:{EL:sc},v:{VALUE:JOIN([TX(T('점수: ')),G('score')])}})]}})]}}),
    B('ev_timer',{x:440,y:520,f:{SEC:1},s:{DO:[CHG('left',-1),B('act_set',{f:{EL:tm},v:{VALUE:JOIN([TX(T('남은 시간: ')),G('left')])}}),
      B('controls_if',{v:{IF0:CMP('LTE',G('left'),NUMB(0))},s:{DO0:[B('act_stop'),
        B('controls_if',{v:{IF0:CMP('GT',G('score'),X(B('val_load',{v:{NAME:TX(K),DEF:NUMB(0)}})))},s:{DO0:[B('act_store',{v:{NAME:TX(K),VALUE:G('score')}}),B('act_set',{f:{EL:best},v:{VALUE:JOIN([TX(T('새 기록! ')),G('score')])}})]}}),
        B('act_alert',{v:{VALUE:JOIN([TX(T('끝! 점수는 ')),G('score')])}})]}})]}}),
    key('ArrowLeft',20,['x',-10]),key('ArrowRight',130,['x',10]),key('ArrowUp',240,['y',-10]),key('ArrowDown',350,['y',10]),
    B('ev_drag',{x:20,y:460,f:{EL:cv},s:{DO:[SET('x',X(B('val_mouse',{f:{AXIS:'x'}}))),SET('y',X(B('val_mouse',{f:{AXIS:'y'}})))]}})
  ]); }},{name:'커서 따라다니기',desc:'별이 커서를 따라다니고, 화살표 키로 로켓도 움직여요',xml:function(){
  var st=T('별'), rk=T('로켓');
  function key(k,y,ax,d){ return B('ev_key',{x:440,y:y,f:{KEY:k},s:{DO:[B('act_nudge',{f:{EL:rk,AXIS:ax},v:{N:N(d)}}),B('act_stay',{f:{EL:rk}})]}}); }
  return wrap([
    page(T('커서 따라다니기'),'#0f172a',[B('el_text',{f:{TEXT:T('마우스(손가락)를 움직여 보세요. 화살표 키로 🚀를 움직여요'),NAME:T('안내')}}),B('el_heading',{f:{SIZE:'h1',TEXT:'⭐',NAME:st}}),B('el_heading',{f:{SIZE:'h1',TEXT:'🚀',NAME:rk}})]),
    B('ev_start',{x:440,y:20,s:{DO:[B('act_move',{f:{EL:rk},v:{X:N(60),Y:N(160)}}),B('act_follow',{f:{EL:st,MODE:'soft'}})]}}),
    key('ArrowLeft',130,'x',-15),key('ArrowRight',240,'x',15),key('ArrowUp',350,'y',-15),key('ArrowDown',460,'y',15)
  ]); }}
,{name:'화살표 키로 움직이는 게임 틀',desc:'화살표 키로 🚀를 움직여 ⭐ 5개를 모으는 게임. 목표와 점수가 있어요',xml:function(){
  var st=T('별'), rk=T('로켓'), sc=T('점수판'), score='score';
  function key(k,y,ax,d){ return B('ev_key',{x:440,y:y,f:{KEY:k},s:{DO:[B('act_nudge',{f:{EL:rk,AXIS:ax},v:{N:N(d)}}),B('act_stay',{f:{EL:rk}})]}}); }
  function rnd(a,b){ return X(B('math_random_int',{v:{FROM:N(a),TO:N(b)}})); }
  function place(){ return B('act_move',{f:{EL:st},v:{X:rnd(20,240),Y:rnd(150,300)}}); }
  return wrap([
    page(T('화살표 키 게임 틀'),'#0f172a',[B('el_heading',{f:{SIZE:'h2',TEXT:T('화살표 키 게임'),NAME:T('제목')+'1'}}),B('el_text',{f:{TEXT:T('화살표 키로 🚀를 움직여 ⭐ 5개를 모아요'),NAME:T('안내')}}),
      B('el_text',{f:{TEXT:T('점수: 0 / 5'),NAME:sc}}),B('el_heading',{f:{SIZE:'h1',TEXT:'⭐',NAME:st}}),B('el_heading',{f:{SIZE:'h1',TEXT:'🚀',NAME:rk}})]),
    B('ev_start',{x:440,y:20,s:{DO:[SET(score,NUMB(0)),B('act_move',{f:{EL:rk},v:{X:N(40),Y:N(300)}}),B('act_move',{f:{EL:st},v:{X:N(200),Y:N(200)}})]}}),
    key('ArrowLeft',150,'x',-18),key('ArrowRight',260,'x',18),key('ArrowUp',370,'y',-18),key('ArrowDown',480,'y',18),
    B('ev_timer',{x:760,y:20,f:{SEC:0.05},s:{DO:[B('controls_if',{v:{IF0:X(B('val_hit',{f:{A:rk,B:st}}))},s:{DO0:[CHG(score,1),
      B('act_set',{f:{EL:sc},v:{VALUE:JOIN([TX(T('점수: ')),G(score),TX(' / 5')])}}),B('act_beep',{f:{NOTE:'659.25'},v:{SEC:N(0.1)}}),place(),
      B('controls_if',{v:{IF0:CMP('GTE',G(score),NUMB(5))},s:{DO0:[B('act_stop'),B('act_show',{f:{EL:st,MODE:'hide'}}),B('act_alert',{v:{VALUE:S(T('성공! ⭐ 5개를 모았어요 🎉'))}})]}})]}})]}})
  ]); }}
,{name:'반응 속도',desc:'화면이 초록색으로 바뀌면 빨리 눌러요',xml:function(){
  var st=T('상태'), ms=T('밀리초'), box=T('신호'), bt=T('버튼')+'1';
  function IF(c,body){ return B('controls_if',{v:{IF0:CMP('EQ',G(st),NUMB(c))},s:{DO0:body}}); }
  return wrap([
    page(T('반응 속도'),'#0f172a',[B('el_heading',{f:{SIZE:'h2',TEXT:T('기다리세요…'),NAME:box}}),B('el_button',{f:{TEXT:T('누르기'),NAME:bt}}),B('el_text',{f:{TEXT:T('초록색이 되면 바로 눌러요. 다시 하려면 위의 실행하기를 다시 눌러요'),NAME:T('안내')}})]),
    B('ev_start',{x:420,y:20,s:{DO:[SET(st,NUMB(0)),SET(ms,NUMB(0)),B('act_set',{f:{EL:box},v:{VALUE:S(T('기다리세요…'))}}),B('act_style',{f:{EL:box,PROP:'background'},v:{VALUE:COL('#ef4444')}}),
      B('act_after',{v:{SEC:X(B('math_random_int',{v:{FROM:N(2),TO:N(5)}}))},s:{DO:[SET(st,NUMB(1)),SET(ms,NUMB(0)),B('act_set',{f:{EL:box},v:{VALUE:S(T('지금 눌러요!'))}}),B('act_style',{f:{EL:box,PROP:'background'},v:{VALUE:COL('#22c55e')}})]}})]}}),
    B('ev_timer',{x:420,y:260,f:{SEC:0.01},s:{DO:[IF(1,[CHG(ms,10)])]}}),
    B('ev_click',{x:420,y:380,f:{EL:bt},s:{DO:[IF(0,[B('act_set',{f:{EL:box},v:{VALUE:S(T('너무 일러요! 초록색을 기다려요'))}}),SET(st,NUMB(2))]),
      IF(1,[SET(st,NUMB(2)),B('act_set',{f:{EL:box},v:{VALUE:JOIN([TX(T('반응 속도: ')),G(ms),TX(T(' 밀리초'))])}}),B('act_beep',{f:{NOTE:'659.25'},v:{SEC:N(0.1)}})])]}})
  ]); }}
,{name:'주사위 굴리기',desc:'버튼을 누르면 1부터 6까지 무작위로 나와요',xml:function(){
  var dice=T('주사위'), bt=T('버튼')+'1', res=T('결과'), n=T('눈');
  return wrap([
    page(T('주사위 굴리기'),'#dcfce7',[B('el_heading',{f:{SIZE:'h1',TEXT:'🎲',NAME:dice}}),B('el_button',{f:{TEXT:T('굴리기'),NAME:bt}}),B('el_heading',{f:{SIZE:'h2',TEXT:'',NAME:res}})]),
    B('ev_start',{x:420,y:20,s:{DO:[SET(n,NUMB(1))]}}),
    B('ev_click',{x:420,y:120,f:{EL:bt},s:{DO:[SET(n,X(B('math_random_int',{v:{FROM:N(1),TO:N(6)}}))),B('act_set',{f:{EL:res},v:{VALUE:JOIN([TX(T('나온 숫자: ')),G(n)])}}),B('act_beep',{f:{NOTE:'523.25'},v:{SEC:N(0.1)}})]}})
  ]); }}
,{name:'타이머',desc:'시작을 누르면 10초부터 줄어들어요',xml:function(){
  var left=T('남은시간'), t=T('초'), bt=T('버튼')+'1';
  return wrap([
    page(T('타이머'),'#e0f2fe',[B('el_heading',{f:{SIZE:'h1',TEXT:'10',NAME:left}}),B('el_button',{f:{TEXT:T('시작'),NAME:bt}})]),
    B('ev_start',{x:420,y:20,s:{DO:[SET(t,NUMB(0))]}}),
    B('ev_click',{x:420,y:120,f:{EL:bt},s:{DO:[SET(t,NUMB(10)),B('act_set',{f:{EL:left},v:{VALUE:G(t)}})]}}),
    B('ev_timer',{x:420,y:260,f:{SEC:1},s:{DO:[B('controls_if',{v:{IF0:CMP('GT',G(t),NUMB(0))},s:{DO0:[CHG(t,-1),B('act_set',{f:{EL:left},v:{VALUE:G(t)}}),
      B('controls_if',{v:{IF0:CMP('EQ',G(t),NUMB(0))},s:{DO0:[B('act_beep',{f:{NOTE:'659.25'},v:{SEC:N(0.3)}}),B('act_alert',{v:{VALUE:S(T('시간이 다 됐어요!'))}})]}})]}})]}})
  ]); }}
,{name:'색깔 바뀌는 버튼',desc:'누를 때마다 글자 배경색이 바뀌어요',xml:function(){
  var box=T('색상자'), bt=T('버튼')+'1';
  return wrap([
    page(T('색깔 바뀌는 버튼'),'#ffffff',[B('el_heading',{f:{SIZE:'h1',TEXT:T('이 글자의 배경이 바뀌어요'),NAME:box}}),B('el_button',{f:{TEXT:T('색 바꾸기'),NAME:bt}})]),
    B('ev_click',{x:420,y:20,f:{EL:bt},s:{DO:[B('act_style',{f:{EL:box,PROP:'background'},v:{VALUE:X(B('val_rcolor'))}})]}})
  ]); }}
/* FF777 1.2 tarius answers (run 39022723375) that were run in a browser and checked: stored as the blocks BHX.convert made from them */
,{name:'빨강 파랑 배경 버튼',desc:'빨간 버튼과 파란 버튼으로 배경색을 바꿔요',xml:function(){ return "<xml xmlns=\"https://developers.google.com/blockly/xml\"><block type=\"page_root\" x=\"20\" y=\"20\"><field name=\"TITLE\">배경색 바꾸기</field><field name=\"BG\">#ffffff</field><field name=\"CENTER\">FALSE</field><statement name=\"BODY\"><block type=\"el_html\"><field name=\"CODE\">&lt;style&gt;body { margin: 0; padding: 0; background: white; font-family: sans-serif; } #bg { width: 100vw; height: 100vh; background: #f0f8ff; display: flex; justify-content: center; align-items: center; } #btns { display: flex; gap: 10px; margin: 10px; } #btns button { padding: 10px 20px; font-size: 16px; border: none; border-radius: 5px; cursor: pointer; } #btns button:hover { background-color: #e0f2fe; }&lt;/style&gt;</field><next><block type=\"el_box\"><field name=\"DIR\">col</field><field name=\"BG\"></field><field name=\"NAME\">bg</field><statement name=\"BODY\"><block type=\"el_box\"><field name=\"DIR\">col</field><field name=\"BG\"></field><field name=\"NAME\">btns</field><statement name=\"BODY\"><block type=\"el_button\"><field name=\"TEXT\">빨간색</field><field name=\"NAME\">redBtn</field><next><block type=\"el_button\"><field name=\"TEXT\">파란색</field><field name=\"NAME\">blueBtn</field></block></next></block></statement></block></statement></block></next></block></statement></block><block x=\"440\" y=\"20\" type=\"ev_start\"><statement name=\"DO\"><block type=\"js_raw\"><field name=\"CODE\">const redBtn = document.getElementById(&quot;redBtn&quot;);</field><next><block type=\"js_raw\"><field name=\"CODE\">const blueBtn = document.getElementById(&quot;blueBtn&quot;);</field><next><block type=\"js_raw\"><field name=\"CODE\">const bg = document.getElementById(&quot;bg&quot;);</field><next><block type=\"js_raw\"><field name=\"CODE\">redBtn.addEventListener(&quot;click&quot;, () =&gt; {\n      bg.style.backgroundColor = &quot;red&quot;;\n    });</field><next><block type=\"js_raw\"><field name=\"CODE\">blueBtn.addEventListener(&quot;click&quot;, () =&gt; {\n      bg.style.backgroundColor = &quot;blue&quot;;\n    });</field></block></next></block></next></block></next></block></next></block></statement></block></xml>"; }}
,{name:'글자 수 세기',desc:'글을 쓰고 세기를 누르면 글자 수를 알려 줘요',xml:function(){ return "<xml xmlns=\"https://developers.google.com/blockly/xml\"><block type=\"page_root\" x=\"20\" y=\"20\"><field name=\"TITLE\">글자 수 세기</field><field name=\"BG\">#ffffff</field><field name=\"CENTER\">FALSE</field><statement name=\"BODY\"><block type=\"el_html\"><field name=\"CODE\">&lt;style&gt;body { font-family: sans-serif; padding: 20px; background: #f8f8f8; } h1 { color: #333; } #count { font-size: 2em; margin-top: 10px; color: #222; } #text { width: 300px; height: 100px; border: 1px solid #ccc; padding: 10px; resize: none; font-size: 1em; margin-top: 10px; }&lt;/style&gt;</field><next><block type=\"el_heading\"><field name=\"SIZE\">h1</field><field name=\"TEXT\">글자 수 세기</field><field name=\"NAME\">제목1</field><next><block type=\"el_box\"><field name=\"DIR\">col</field><field name=\"BG\"></field><field name=\"NAME\">상자3</field><statement name=\"BODY\"><block type=\"el_text\"><field name=\"TEXT\">텍스트를 입력해 보세요.</field><field name=\"NAME\">글2</field><next><block type=\"el_input\"><field name=\"KIND\">text</field><field name=\"TEXT\">텍스트를 입력해 주세요</field><field name=\"NAME\">text</field><next><block type=\"el_html\"><field name=\"CODE\">&lt;button onclick=&quot;count()&quot;&gt;세기&lt;/button&gt;</field><next><block type=\"el_text\"><field name=\"TEXT\">0</field><field name=\"NAME\">count</field></block></next></block></next></block></next></block></statement></block></next></block></next></block></statement></block><block x=\"440\" y=\"20\" type=\"ev_start\"><statement name=\"DO\"><block type=\"js_raw\"><field name=\"CODE\">const count = () =&gt; {\n      const text = document.getElementById('text').value;\n      const count = text.length;\n      document.getElementById('count').textContent = count;\n    };</field></block></statement></block></xml>"; }}
,{name:'체크리스트',desc:'항목을 누르면 글자에 취소선이 생겨요',xml:function(){ return "<xml xmlns=\"https://developers.google.com/blockly/xml\"><block type=\"page_root\" x=\"20\" y=\"20\"><field name=\"TITLE\">체크리스트</field><field name=\"BG\">#ffffff</field><field name=\"CENTER\">FALSE</field><statement name=\"BODY\"><block type=\"el_html\"><field name=\"CODE\">&lt;style&gt;body { font-family: sans-serif; padding: 20px; background: #f8f8f8; } h1 { color: #333; } input[type=&quot;text&quot;] { padding: 8px; margin: 5px 0; width: 200px; } button { padding: 8px; margin: 5px 0; background: #28a745; color: white; border: none; cursor: pointer; } ul { list-style: none; padding: 0; } li { margin: 5px 0; padding: 8px; background: white; border: 1px solid #ddd; border-radius: 4px; } li.checked { background: #f1f1f1; text-decoration: line-through; }&lt;/style&gt;</field><next><block type=\"el_heading\"><field name=\"SIZE\">h1</field><field name=\"TEXT\">체크리스트</field><field name=\"NAME\">제목1</field><next><block type=\"el_input\"><field name=\"KIND\">text</field><field name=\"TEXT\">새 항목을 입력해요</field><field name=\"NAME\">itemInput</field><next><block type=\"el_html\"><field name=\"CODE\">&lt;button onclick=&quot;addItem()&quot;&gt;추가&lt;/button&gt;</field><next><block type=\"el_list\"><field name=\"NAME\">itemList</field></block></next></block></next></block></next></block></next></block></statement></block><block x=\"440\" y=\"20\" type=\"ev_start\"><statement name=\"DO\"><block type=\"js_raw\"><field name=\"CODE\">const itemInput = document.getElementById(&quot;itemInput&quot;);</field><next><block type=\"js_raw\"><field name=\"CODE\">const itemList = document.getElementById(&quot;itemList&quot;);</field><next><block type=\"js_raw\"><field name=\"CODE\">function addItem() {\n      const text = itemInput.value.trim();\n      if (text === &quot;&quot;) return;\n      const li = document.createElement(&quot;li&quot;);\n      li.textContent = text;\n      li.addEventListener(&quot;click&quot;, () =&gt; {\n        li.classList.toggle(&quot;checked&quot;);\n      });\n      itemList.appendChild(li);\n      itemInput.value = &quot;&quot;;\n    }</field></block></next></block></next></block></statement></block></xml>"; }}
,{name:'색 바뀌는 상자',desc:'마우스를 올리면 상자 색이 바뀌어요',xml:function(){ return "<xml xmlns=\"https://developers.google.com/blockly/xml\"><block type=\"page_root\" x=\"20\" y=\"20\"><field name=\"TITLE\">색 바뀌는 큰 상자</field><field name=\"BG\">#ffffff</field><field name=\"CENTER\">FALSE</field><statement name=\"BODY\"><block type=\"el_html\"><field name=\"CODE\">&lt;style&gt;body { background: #f0f8ff; font-family: sans-serif; text-align: center; padding: 20px; } #box { width: 200px; height: 200px; margin: 0 auto; background: #fff; border: 4px solid #333; border-radius: 10px; box-shadow: 0 0 10px #333; transition: all 0.3s ease; } #box:hover { background: #e0f2fe; border-color: #228be6; }&lt;/style&gt;</field><next><block type=\"el_heading\"><field name=\"SIZE\">h1</field><field name=\"TEXT\">마우스를 올리면 색이 바뀌는 큰 상자</field><field name=\"NAME\">제목1</field><next><block type=\"el_text\"><field name=\"TEXT\"></field><field name=\"NAME\">box</field></block></next></block></next></block></statement></block><block x=\"440\" y=\"20\" type=\"ev_start\"><statement name=\"DO\"><block type=\"js_raw\"><field name=\"CODE\">const box = document.getElementById(&quot;box&quot;);</field><next><block type=\"js_raw\"><field name=\"CODE\">box.addEventListener(&quot;mouseenter&quot;, () =&gt; {\n      box.style.background = &quot;#e0f2fe&quot;;\n      box.style.border = &quot;4px solid #228be6&quot;;\n    });</field><next><block type=\"js_raw\"><field name=\"CODE\">box.addEventListener(&quot;mouseleave&quot;, () =&gt; {\n      box.style.background = &quot;#fff&quot;;\n      box.style.border = &quot;4px solid #333&quot;;\n    });</field></block></next></block></next></block></statement></block></xml>"; }}
,{name:'구구단 표',desc:'버튼을 누르면 구구단 표가 나와요',xml:function(){ return "<xml xmlns=\"https://developers.google.com/blockly/xml\"><block type=\"page_root\" x=\"20\" y=\"20\"><field name=\"TITLE\">구구단</field><field name=\"BG\">#ffffff</field><field name=\"CENTER\">FALSE</field><statement name=\"BODY\"><block type=\"el_html\"><field name=\"CODE\">&lt;style&gt;body { font-family: sans-serif; background: #f2f2f2; padding: 20px; } h1 { color: #333; } #result { margin-top: 20px; font-size: 24px; color: #222; } button { margin: 10px; padding: 10px 20px; font-size: 16px; background: #333; color: white; border: none; cursor: pointer; }&lt;/style&gt;</field><next><block type=\"el_heading\"><field name=\"SIZE\">h1</field><field name=\"TEXT\">구구단</field><field name=\"NAME\">제목1</field><next><block type=\"el_html\"><field name=\"CODE\">&lt;button onclick=&quot;showMultiplicationTable()&quot;&gt;구구단 표 보기&lt;/button&gt;</field><next><block type=\"el_text\"><field name=\"TEXT\"></field><field name=\"NAME\">result</field></block></next></block></next></block></next></block></statement></block><block x=\"440\" y=\"20\" type=\"ev_start\"><statement name=\"DO\"><block type=\"js_raw\"><field name=\"CODE\">function showMultiplicationTable() {\n      const result = document.getElementById(&quot;result&quot;);\n      result.innerHTML = &quot;&quot;;\n      const table = document.createElement(&quot;table&quot;);\n      const rows = document.createElement(&quot;tbody&quot;);\n      for (let i = 1; i &lt;= 9; i++) {\n        const row = document.createElement(&quot;tr&quot;);\n        for (let j = 1; j &lt;= 9; j++) {\n          const cell = document.createElement(&quot;td&quot;);\n          cell.textContent = i * j;\n          row.appendChild(cell);\n        }\n        rows.appendChild(row);\n      }\n      table.appendChild(rows);\n      result.appendChild(table);\n    }</field></block></statement></block></xml>"; }}
,{name:'홀수 짝수 판별기',desc:'숫자를 넣으면 홀수인지 짝수인지 알려 줘요',xml:function(){ return "<xml xmlns=\"https://developers.google.com/blockly/xml\"><block type=\"page_root\" x=\"20\" y=\"20\"><field name=\"TITLE\">홀수 짝수 판별기</field><field name=\"BG\">#ffffff</field><field name=\"CENTER\">FALSE</field><statement name=\"BODY\"><block type=\"el_html\"><field name=\"CODE\">&lt;style&gt;body { font-family: sans-serif; padding: 20px; background: #f0f8ff; } h1 { color: #333; } input[type=&quot;number&quot;] { padding: 10px; margin: 10px 0; width: 100px; } button { padding: 10px; margin: 10px 0; background: #28a745; color: white; border: none; cursor: pointer; } #result { margin-top: 20px; font-size: 1.2em; color: #28a745; }&lt;/style&gt;</field><next><block type=\"el_heading\"><field name=\"SIZE\">h1</field><field name=\"TEXT\">홀수 짝수 판별기</field><field name=\"NAME\">제목1</field><next><block type=\"el_input\"><field name=\"KIND\">number</field><field name=\"TEXT\">숫자를 입력해 주세요</field><field name=\"NAME\">num</field><next><block type=\"el_html\"><field name=\"CODE\">&lt;button onclick=&quot;checkEvenOdd()&quot;&gt;확인&lt;/button&gt;</field><next><block type=\"el_text\"><field name=\"TEXT\"></field><field name=\"NAME\">result</field></block></next></block></next></block></next></block></next></block></statement></block><block x=\"440\" y=\"20\" type=\"ev_start\"><statement name=\"DO\"><block type=\"js_raw\"><field name=\"CODE\">const numInput = document.getElementById('num');</field><next><block type=\"js_raw\"><field name=\"CODE\">const resultDiv = document.getElementById('result');</field><next><block type=\"js_raw\"><field name=\"CODE\">function checkEvenOdd() {\n      const n = parseInt(numInput.value);\n      if (isNaN(n)) {\n        resultDiv.textContent = '숫자를 입력해 주세요.';\n        return;\n      }\n      const isEven = n % 2 === 0;\n      resultDiv.textContent = isEven ? '짝수입니다.' : '홀수입니다.';\n    }</field></block></next></block></next></block></statement></block></xml>"; }}
,{name:'마우스로 그림 그리기',desc:'캔버스에 마우스로 선을 그려요',xml:function(){ return "<xml xmlns=\"https://developers.google.com/blockly/xml\"><block type=\"page_root\" x=\"20\" y=\"20\"><field name=\"TITLE\">마우스로 그림 그리기</field><field name=\"BG\">#ffffff</field><field name=\"CENTER\">FALSE</field><statement name=\"BODY\"><block type=\"el_html\"><field name=\"CODE\">&lt;style&gt;body { font-family: sans-serif; background: #f0f8ff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; } canvas { border: 2px solid #333; background: white; }&lt;/style&gt;</field><next><block type=\"el_canvas\"><field name=\"W\">320</field><field name=\"H\">220</field><field name=\"NAME\">draw</field></block></next></block></statement></block><block x=\"440\" y=\"20\" type=\"ev_start\"><statement name=\"DO\"><block type=\"js_raw\"><field name=\"CODE\">const canvas = document.getElementById(&quot;draw&quot;);</field><next><block type=\"js_raw\"><field name=\"CODE\">const ctx = canvas.getContext(&quot;2d&quot;);</field><next><block type=\"js_raw\"><field name=\"CODE\">canvas.width = window.innerWidth;</field><next><block type=\"js_raw\"><field name=\"CODE\">canvas.height = window.innerHeight;</field><next><block type=\"js_raw\"><field name=\"CODE\">let isDrawing = false;</field><next><block type=\"js_raw\"><field name=\"CODE\">let lastX = 0;</field><next><block type=\"js_raw\"><field name=\"CODE\">let lastY = 0;</field><next><block type=\"js_raw\"><field name=\"CODE\">canvas.addEventListener(&quot;mousedown&quot;, (e) =&gt; {\n      isDrawing = true;\n      lastX = e.offsetX;\n      lastY = e.offsetY;\n    });</field><next><block type=\"js_raw\"><field name=\"CODE\">canvas.addEventListener(&quot;mousemove&quot;, (e) =&gt; {\n      if (!isDrawing) return;\n      const x = e.offsetX;\n      const y = e.offsetY;\n      ctx.beginPath();\n      ctx.moveTo(lastX, lastY);\n      ctx.lineTo(x, y);\n      ctx.strokeStyle = &quot;black&quot;;\n      ctx.lineWidth = 2;\n      ctx.stroke();\n      lastX = x;\n      lastY = y;\n    });</field><next><block type=\"js_raw\"><field name=\"CODE\">canvas.addEventListener(&quot;mouseup&quot;, () =&gt; {\n      isDrawing = false;\n    });</field></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></statement></block></xml>"; }}
,{name:'메모장',desc:'메모를 저장하면 아래에 목록으로 쌓여요',xml:function(){ return "<xml xmlns=\"https://developers.google.com/blockly/xml\"><block type=\"page_root\" x=\"20\" y=\"20\"><field name=\"TITLE\">메모장</field><field name=\"BG\">#ffffff</field><field name=\"CENTER\">FALSE</field><statement name=\"BODY\"><block type=\"el_html\"><field name=\"CODE\">&lt;style&gt;body { font-family: sans-serif; padding: 20px; background: #f8f8f8; } h1 { text-align: center; margin-bottom: 20px; } input[type=&quot;text&quot;] { width: 70%; padding: 10px; margin-bottom: 10px; } button { padding: 10px 20px; background: #28a745; color: white; border: none; cursor: pointer; } ul { list-style: none; padding: 0; } li { background: white; margin: 10px 0; padding: 10px; border-radius: 5px; }&lt;/style&gt;</field><next><block type=\"el_heading\"><field name=\"SIZE\">h1</field><field name=\"TEXT\">메모장</field><field name=\"NAME\">제목1</field><next><block type=\"el_input\"><field name=\"KIND\">text</field><field name=\"TEXT\">메모를 입력해 주세요</field><field name=\"NAME\">memoInput</field><next><block type=\"el_html\"><field name=\"CODE\">&lt;button onclick=&quot;saveMemo()&quot;&gt;저장&lt;/button&gt;</field><next><block type=\"el_list\"><field name=\"NAME\">memoList</field></block></next></block></next></block></next></block></next></block></statement></block><block x=\"440\" y=\"20\" type=\"ev_start\"><statement name=\"DO\"><block type=\"js_raw\"><field name=\"CODE\">const input = document.getElementById(&quot;memoInput&quot;);</field><next><block type=\"js_raw\"><field name=\"CODE\">const list = document.getElementById(&quot;memoList&quot;);</field><next><block type=\"js_raw\"><field name=\"CODE\">function saveMemo() {\n      const text = input.value.trim();\n      if (text === &quot;&quot;) return;\n      const li = document.createElement(&quot;li&quot;);\n      li.textContent = text;\n      list.appendChild(li);\n      input.value = &quot;&quot;;\n    }</field></block></next></block></next></block></statement></block></xml>"; }}
,{name:'단어 뒤집기',desc:'단어를 거꾸로 뒤집어 줘요',xml:function(){ return "<xml xmlns=\"https://developers.google.com/blockly/xml\"><block type=\"page_root\" x=\"20\" y=\"20\"><field name=\"TITLE\">단어 뒤집기</field><field name=\"BG\">#ffffff</field><field name=\"CENTER\">FALSE</field><statement name=\"BODY\"><block type=\"el_html\"><field name=\"CODE\">&lt;style&gt;body { font-family: sans-serif; padding: 20px; background: #f8f8f8; } h1 { color: #333; } input[type=&quot;text&quot;] { padding: 10px; margin: 10px 0; width: 200px; } button { padding: 10px; margin: 10px 0; background: #28a745; color: white; border: none; cursor: pointer; } #result { margin-top: 20px; font-size: 1.2em; color: #28a745; }&lt;/style&gt;</field><next><block type=\"el_heading\"><field name=\"SIZE\">h1</field><field name=\"TEXT\">단어 뒤집기</field><field name=\"NAME\">제목1</field><next><block type=\"el_input\"><field name=\"KIND\">text</field><field name=\"TEXT\">단어를 입력해 주세요</field><field name=\"NAME\">wordInput</field><next><block type=\"el_html\"><field name=\"CODE\">&lt;button onclick=&quot;reverseWord()&quot;&gt;뒤집기&lt;/button&gt;</field><next><block type=\"el_text\"><field name=\"TEXT\"></field><field name=\"NAME\">result</field></block></next></block></next></block></next></block></next></block></statement></block><block x=\"440\" y=\"20\" type=\"ev_start\"><statement name=\"DO\"><block type=\"js_raw\"><field name=\"CODE\">const wordInput = document.getElementById(&quot;wordInput&quot;);</field><next><block type=\"js_raw\"><field name=\"CODE\">const result = document.getElementById(&quot;result&quot;);</field><next><block type=\"js_raw\"><field name=\"CODE\">function reverseWord() {\n      const word = wordInput.value.trim();\n      if (word === &quot;&quot;) {\n        result.textContent = &quot;단어를 입력해 주세요.&quot;;\n        return;\n      }\n      const reversed = word.split(&quot;&quot;).reverse().join(&quot;&quot;);\n      result.textContent = `뒤집힌 단어: ${reversed}`;\n    }</field></block></next></block></next></block></statement></block></xml>"; }}
,{name:'원 넓이 계산기',desc:'반지름을 넣으면 원의 넓이를 알려 줘요',xml:function(){ return "<xml xmlns=\"https://developers.google.com/blockly/xml\"><block type=\"page_root\" x=\"20\" y=\"20\"><field name=\"TITLE\">원 넓이 계산기</field><field name=\"BG\">#ffffff</field><field name=\"CENTER\">FALSE</field><statement name=\"BODY\"><block type=\"el_html\"><field name=\"CODE\">&lt;style&gt;body { font-family: sans-serif; padding: 20px; background: #f0f8ff; } h1 { text-align: center; } input[type=&quot;number&quot;] { width: 100px; margin: 10px; } button { margin: 10px; } #result { margin-top: 20px; font-size: 1.2em; color: #333; }&lt;/style&gt;</field><next><block type=\"el_heading\"><field name=\"SIZE\">h1</field><field name=\"TEXT\">원 넓이 계산기</field><field name=\"NAME\">제목1</field><next><block type=\"el_input\"><field name=\"KIND\">number</field><field name=\"TEXT\">반지름을 입력해 주세요</field><field name=\"NAME\">radius</field><next><block type=\"el_html\"><field name=\"CODE\">&lt;button onclick=&quot;calculate()&quot;&gt;계산하기&lt;/button&gt;</field><next><block type=\"el_text\"><field name=\"TEXT\"></field><field name=\"NAME\">result</field></block></next></block></next></block></next></block></next></block></statement></block><block x=\"440\" y=\"20\" type=\"ev_start\"><statement name=\"DO\"><block type=\"js_raw\"><field name=\"CODE\">function calculate() {\n      const radius = parseFloat(document.getElementById(&quot;radius&quot;).value);\n      if (isNaN(radius) || radius &lt;= 0) {\n        document.getElementById(&quot;result&quot;).textContent = &quot;반지름을 0보다 큰 수로 입력해 주세요.&quot;;\n        return;\n      }\n      const area = Math.PI * radius * radius;\n      document.getElementById(&quot;result&quot;).textContent = `넓이는 ${area.toFixed(2)}입니다.`;\n    }</field></block></statement></block></xml>"; }}
,{name:'복제 총알 슈팅',desc:'스페이스 키마다 총알 복제본이 날아가요. 복제본마다 따로 움직이고, 적에 닿으면 사라져요',xml:function(){
  var ship=T('우주선'), bul=T('총알'), foe=T('적'), best=T('최고 점수');
  function me(type,o){ o=o||{}; o.f=o.f||{}; o.f.EL='@me'; return B(type,o); }
  function key(k,y,d){ return B('ev_keyhold',{x:440,y:y,f:{KEY:k},s:{DO:[B('act_nudge',{f:{EL:ship,AXIS:'x'},v:{N:N(d)}}),B('act_stay',{f:{EL:ship}})]}}); }
  return wrap([
    page(T('복제 총알 슈팅'),'#0f172a',[B('el_heading',{f:{SIZE:'h2',TEXT:T('복제 총알 슈팅'),NAME:T('제목')+'1'}}),B('el_text',{f:{TEXT:T('←→ 키로 움직이고 스페이스 키로 쏴요. 👾에 맞히면 점수!'),NAME:T('안내')}}),
      B('el_heading',{f:{SIZE:'h2',TEXT:'🔸',NAME:bul}}),B('el_heading',{f:{SIZE:'h1',TEXT:'👾',NAME:foe}}),B('el_heading',{f:{SIZE:'h1',TEXT:'🚀',NAME:ship}})]),
    B('ev_start',{x:440,y:20,s:{DO:[B('act_move',{f:{EL:foe},v:{X:N(120),Y:N(170)}}),B('act_move',{f:{EL:ship},v:{X:N(140),Y:N(420)}}),B('act_move',{f:{EL:bul},v:{X:N(-100),Y:N(-100)}}),B('act_show',{f:{EL:bul,MODE:'hide'}}),
      B('act_score',{f:{MODE:'set'},v:{N:N(0)}}),B('act_bestboard',{f:{NAME:best,MODE:'show'}})]}}),
    key('ArrowLeft',210,-7),key('ArrowRight',320,7),
    B('ev_key',{x:440,y:430,f:{KEY:' '},s:{DO:[B('clone_make',{f:{EL:bul}}),B('act_sfx',{f:{SFX:'laser'}})]}}),
    B('ev_clone',{x:760,y:20,f:{EL:bul},s:{DO:[
      me('act_move',{v:{X:X(B('math_arithmetic',{f:{OP:'ADD'},v:{A:X(B('val_where',{f:{EL:ship,AXIS:'x'}})),B:N(14)}})),Y:X(B('val_where',{f:{EL:ship,AXIS:'y'}}))}}),
      me('clone_dir',{f:{MODE:'set'},v:{N:N(270)}}),
      B('time_every',{f:{NAME:T('날기')},v:{SEC:N(0.02)},s:{DO:[me('clone_fwd',{v:{N:N(9)}}),B('controls_if',{v:{IF0:X(me('clone_out'))},s:{DO0:[B('clone_del',{f:{EL:'@me'}})]}})]}})]}}),
    B('ev_hit',{x:760,y:330,f:{A:bul+'*',B:foe,MODE:'box'},s:{DO:[B('act_score',{f:{MODE:'add'},v:{N:N(1)}}),B('act_sfx',{f:{SFX:'pop'}}),B('clone_del',{f:{EL:'@me'}}),B('act_rpos',{f:{EL:foe}}),
      B('act_best',{f:{NAME:best},v:{N:X(B('val_score'))}})]}})
  ]); }}
,{name:'타일 미로',desc:'타일맵으로 벽을 만들고, 벽에 막히며 움직여 ⭐까지 가요',xml:function(){
  var cv=T('그림판')+'1', map=T('지도')+'1', me=T('캐릭터'), best=T('최고 점수');
  function key(k,y,dx,dy){ return B('ev_keyhold',{x:440,y:y,f:{KEY:k},s:{DO:[B('tile_move',{f:{EL:me,M:map},v:{DX:N(dx),DY:N(dy)}})]}}); }
  function wallRow(r,c0,c1){ var a=[]; for(var c=c0;c<=c1;c++) a.push(B('tile_set',{f:{M:map},v:{C:N(c),R:N(r),V:N(1)}})); return a; }
  function cell(axis){ return X(B('tile_cell',{f:{M:map},v:{N:X(B('math_arithmetic',{f:{OP:'MINUS'},v:{A:X(B('math_arithmetic',{f:{OP:'ADD'},v:{A:X(B('val_where',{f:{EL:me,AXIS:axis}})),B:N(12)}})),B:X(B('val_where',{f:{EL:cv,AXIS:axis}}))}}))}})); }
  return wrap([
    page(T('타일 미로'),'#0f172a',[B('el_heading',{f:{SIZE:'h2',TEXT:T('타일 미로'),NAME:T('제목')+'1'}}),B('el_canvas',{f:{W:320,H:224,NAME:cv}}),B('el_text',{f:{TEXT:T('화살표 키로 움직여 ⭐까지 가요. 벽은 통과할 수 없어요'),NAME:T('안내')}}),B('el_heading',{f:{SIZE:'h3',TEXT:'🙂',NAME:me}})]),
    B('ev_start',{x:440,y:20,s:{DO:[B('tile_make',{f:{EL:cv,M:map},v:{C:N(10),R:N(7),S:N(32)}}),B('tile_fill',{f:{M:map,MODE:'border'},v:{V:N(1)}})].concat(wallRow(2,1,6)).concat(wallRow(4,3,8)).concat([
      B('tile_set',{f:{M:map},v:{C:N(8),R:N(5),V:N(3)}}),B('tile_color',{f:{M:map},v:{V:N(3),COLOR:COL('#facc15')}}),B('tile_draw',{f:{M:map}}),
      B('draw_text',{f:{EL:cv},v:{TEXT:S('⭐'),X:N(258),Y:N(186),COLOR:COL('#111111')}}),
      B('act_size',{f:{EL:me,PROP:'fontSize'},v:{N:N(18)}}),
      B('act_move',{f:{EL:me},v:{X:X(B('math_arithmetic',{f:{OP:'ADD'},v:{A:X(B('val_where',{f:{EL:cv,AXIS:'x'}})),B:N(36)}})),Y:X(B('math_arithmetic',{f:{OP:'ADD'},v:{A:X(B('val_where',{f:{EL:cv,AXIS:'y'}})),B:N(24)}}))}}),
      B('act_bestboard',{f:{NAME:best,MODE:'show'}})])}}),
    key('ArrowLeft',210,-3,0),key('ArrowRight',320,3,0),key('ArrowUp',430,0,-3),key('ArrowDown',540,0,3),
    B('ev_timer',{x:760,y:20,f:{SEC:0.05},s:{DO:[B('controls_if',{v:{IF0:CMP('EQ',X(B('tile_get',{f:{M:map},v:{C:cell('x'),R:cell('y')}})),NUMB(3))},s:{DO0:[
      B('act_score',{f:{MODE:'add'},v:{N:N(1)}}),B('act_best',{f:{NAME:best},v:{N:X(B('val_score'))}}),B('act_sfx',{f:{SFX:'win'}}),
      B('act_move',{f:{EL:me},v:{X:X(B('math_arithmetic',{f:{OP:'ADD'},v:{A:X(B('val_where',{f:{EL:cv,AXIS:'x'}})),B:N(36)}})),Y:X(B('math_arithmetic',{f:{OP:'ADD'},v:{A:X(B('val_where',{f:{EL:cv,AXIS:'y'}})),B:N(24)}}))}})]}})]}})
  ]); }}
,{name:'초시계와 알람',desc:'이름 붙은 시간 블록으로 시작·멈추기, 3초 뒤 알람',xml:function(){
  var tx=T('초시계'), st=T('시작'), sp=T('멈춤'), cnt=T('초');
  return wrap([
    page(T('초시계와 알람'),'#e0f2fe',[B('el_heading',{f:{SIZE:'h1',TEXT:'0',NAME:tx}}),B('el_button',{f:{TEXT:T('시작'),NAME:st}}),B('el_button',{f:{TEXT:T('멈춤'),NAME:sp}}),B('el_text',{f:{TEXT:T('시작하고 3초 뒤에 알람이 울려요'),NAME:T('안내')}})]),
    B('ev_start',{x:420,y:20,s:{DO:[SET(cnt,NUMB(0))]}}),
    B('ev_click',{x:420,y:110,f:{EL:st},s:{DO:[SET(cnt,NUMB(0)),B('act_set',{f:{EL:tx},v:{VALUE:G(cnt)}}),
      B('time_every',{f:{NAME:T('초시계')},v:{SEC:N(1)},s:{DO:[CHG(cnt,1),B('act_set',{f:{EL:tx},v:{VALUE:G(cnt)}})]}}),
      B('time_after',{f:{NAME:T('알람')},v:{SEC:N(3)},s:{DO:[B('act_sfx',{f:{SFX:'win'}}),B('act_style',{f:{EL:tx,PROP:'color'},v:{VALUE:COL('#ef4444')}})]}})]}}),
    B('ev_click',{x:420,y:330,f:{EL:sp},s:{DO:[B('time_stop',{f:{NAME:T('초시계')}}),B('time_stop',{f:{NAME:T('알람')}})]}})
  ]); }}
,{name:'그림판으로 그림 그리기',desc:'칠하기, 선 굵기, 빈 도형, 글자 크기로 그림을 그려요',xml:function(){
  var cv=T('그림판')+'1';
  return wrap([
    page(T('그림판으로 그림 그리기'),'#fff8e1',[B('el_canvas',{f:{W:320,H:220,NAME:cv}})]),
    B('ev_start',{x:420,y:20,s:{DO:[B('draw_fill',{f:{EL:cv},v:{COLOR:COL('#e0f2fe')}}),B('draw_rect',{f:{EL:cv},v:{X:N(0),Y:N(160),W:N(320),H:N(60),COLOR:COL('#22c55e')}}),
      B('draw_circle',{f:{EL:cv},v:{X:N(260),Y:N(50),R:N(26),COLOR:COL('#ffc93c')}}),B('draw_width',{f:{EL:cv},v:{N:N(6)}}),
      B('draw_orect',{f:{EL:cv},v:{X:N(60),Y:N(90),W:N(100),H:N(70),COLOR:COL('#92400e')}}),B('draw_line',{f:{EL:cv},v:{X1:N(50),Y1:N(90),X2:N(110),Y2:N(50),COLOR:COL('#ef4444')}}),B('draw_line',{f:{EL:cv},v:{X1:N(110),Y1:N(50),X2:N(170),Y2:N(90),COLOR:COL('#ef4444')}}),
      B('draw_width',{f:{EL:cv},v:{N:N(2)}}),B('draw_ocircle',{f:{EL:cv},v:{X:N(260),Y:N(50),R:N(36),COLOR:COL('#f97316')}}),
      B('draw_fsize',{f:{EL:cv},v:{N:N(26)}}),B('draw_text',{f:{EL:cv},v:{TEXT:S(T('우리 집')),X:N(70),Y:N(205),COLOR:COL('#111111')}})]}})
  ]); }}

];
window.BH_EXAMPLES=EX;
})();
