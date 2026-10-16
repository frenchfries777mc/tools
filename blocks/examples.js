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
];
window.BH_EXAMPLES=EX;
})();
