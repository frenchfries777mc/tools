/* Block HTML: custom blocks (page elements, events, actions, drawing), their JavaScript generators,
   the HTML builder and the toolbox. Standard Blockly blocks cover logic, loops, math, text, lists, variables, functions. */
(function(){
'use strict';
var T=FFT.T, G=javascript.javascriptGenerator, O=javascript.Order;
var C={page:'#d9822b', el:'#3d7fe0', ev:'#e0a800', act:'#1f9e6e', val:'#2bb39a', draw:'#c2549f', js:'#6b7280'};
var EL=['el_heading','el_text','el_button','el_input','el_picture','el_image','el_link','el_box','el_canvas','el_list'];
var COLORS=[['빨강','#ef4444'],['주황','#f97316'],['노랑','#facc15'],['초록','#22c55e'],['하늘','#38bdf8'],['파랑','#3b82f6'],['보라','#a855f7'],['분홍','#ec4899'],['갈색','#92400e'],['검정','#111111'],['회색','#9ca3af'],['흰색','#ffffff'],['감자튀김','#ffc93c']];
function colorOpts(none){ var o=COLORS.map(function(c){ return [T(c[0]),c[1]]; }); if(none) o.unshift([T('없음'),'']); return o; }
var NOTES=[['도','261.63'],['레','293.66'],['미','329.63'],['파','349.23'],['솔','392.00'],['라','440.00'],['시','493.88'],['높은 도','523.25']];

/* names of page elements in the workspace (plus names seen in a file being loaded) */
var KNOWN=new Set();
function elNames(kinds){
  var ws=Blockly.getMainWorkspace&&Blockly.getMainWorkspace(), out=[];
  if(ws) ws.getAllBlocks(false).forEach(function(b){ if(EL.indexOf(b.type)>=0&&(!kinds||kinds.indexOf(b.type)>=0)){ var n=b.getFieldValue('NAME'); if(n&&out.indexOf(n)<0) out.push(n); } });
  KNOWN.forEach(function(n){ if(out.indexOf(n)<0) out.push(n); });
  return out;
}
function elField(kinds){
  return new Blockly.FieldDropdown(function(){
    var names=elNames(kinds), v=this.getValue&&this.getValue();
    if(v&&v!=='?'&&names.indexOf(v)<0) names.push(v);
    if(!names.length) return [[T('(요소 없음)'),'?']];
    return names.map(function(n){ return [n,n]; });
  });
}
/* "내 그림": pictures drawn or uploaded by the user. id -> {name, data (data URL), w, h, thumb} */
var IMGS={}, USED={};
function imgField(){
  return new Blockly.FieldDropdown(function(){
    var ids=Object.keys(IMGS), v=this.getValue&&this.getValue();
    if(!ids.length) return [[T('(그림 없음)'),'?']];
    var o=ids.map(function(id){ var m=IMGS[id], k=Math.min(1,44/Math.max(m.w||44,m.h||44)); return [{src:m.thumb||m.data,width:Math.max(8,Math.round((m.w||44)*k)),height:Math.max(8,Math.round((m.h||44)*k)),alt:m.name},id]; });
    return o;
  });
}
function imgName(id){ return IMGS[id]?IMGS[id].name:''; }
function lit(s){ return JSON.stringify(String(s==null?'':s)); }
var NEED={};
function need(n){ NEED[n]=1; }

function def(type,init,gen){ Blockly.Blocks[type]={init:init}; if(gen) G.forBlock[type]=gen; }
function stmt(b,colour,tip){ b.setPreviousStatement(true,'EL'); b.setNextStatement(true,'EL'); b.setColour(colour); if(tip) b.setTooltip(T(tip)); }
function act(b,tip){ b.setPreviousStatement(true); b.setNextStatement(true); b.setColour(C.act); if(tip) b.setTooltip(T(tip)); }
function num(b,name,label){ b.appendValueInput(name).setCheck('Number').appendField(label?T(label):''); }

/* ---------- page and elements ---------- */
def('page_root',function(){
  this.appendDummyInput().appendField(T('페이지')).appendField(T('제목')).appendField(new Blockly.FieldTextInput(T('나의 웹페이지')),'TITLE');
  this.appendDummyInput().appendField(T('배경')).appendField(new Blockly.FieldDropdown(function(){ return [[T('흰색'),'#ffffff'],[T('밤하늘'),'#0f172a'],[T('검정'),'#111111'],[T('연한 노랑'),'#fff8e1'],[T('연한 하늘'),'#e0f2fe'],[T('연한 분홍'),'#fce7f3'],[T('연한 초록'),'#dcfce7']]; }),'BG')
    .appendField(T('가운데 정렬')).appendField(new Blockly.FieldCheckbox('TRUE'),'CENTER');
  this.appendStatementInput('BODY').setCheck('EL').appendField(T('화면'));
  this.setColour(C.page); this.setTooltip(T('페이지에 보일 것들을 이 안에 차례로 넣어요')); this.setDeletable(true);
  this.setStyle&&0;
});
function elBlock(type,build,tip){ def(type,function(){ build.call(this); stmt(this,C.el,tip); }); }
elBlock('el_heading',function(){ this.appendDummyInput().appendField(T('제목')).appendField(new Blockly.FieldDropdown(function(){ return [[T('크게'),'h1'],[T('중간'),'h2'],[T('작게'),'h3']]; }),'SIZE')
  .appendField(new Blockly.FieldTextInput(T('안녕하세요')),'TEXT').appendField(T('이름')).appendField(new Blockly.FieldTextInput(T('제목')+'1'),'NAME'); },'큰 글씨 제목');
elBlock('el_text',function(){ this.appendDummyInput().appendField(T('글')).appendField(new Blockly.FieldTextInput(T('여기에 글을 써요')),'TEXT').appendField(T('이름')).appendField(new Blockly.FieldTextInput(T('글')+'1'),'NAME'); },'보통 글');
elBlock('el_button',function(){ this.appendDummyInput().appendField(T('버튼')).appendField(new Blockly.FieldTextInput(T('눌러 보세요')),'TEXT').appendField(T('이름')).appendField(new Blockly.FieldTextInput(T('버튼')+'1'),'NAME'); },'누를 수 있는 버튼. "누르면" 이벤트와 함께 써요');
elBlock('el_input',function(){ this.appendDummyInput().appendField(T('입력칸')).appendField(new Blockly.FieldDropdown(function(){ return [[T('글자'),'text'],[T('숫자'),'number']]; }),'KIND')
  .appendField(T('안내')).appendField(new Blockly.FieldTextInput(T('여기에 쓰세요')),'TEXT').appendField(T('이름')).appendField(new Blockly.FieldTextInput(T('입력')+'1'),'NAME'); },'글이나 숫자를 쓰는 칸');
elBlock('el_picture',function(){ this.appendDummyInput().appendField(T('내 그림')).appendField(imgField(),'IMG').appendField(T('너비')).appendField(new Blockly.FieldNumber(240,10,2000),'W')
  .appendField(T('이름')).appendField(new Blockly.FieldTextInput(T('그림')+'1'),'NAME'); },'직접 그리거나 올린 그림을 페이지에 넣어요');
elBlock('el_image',function(){ this.appendDummyInput().appendField(T('인터넷 그림 주소')).appendField(new Blockly.FieldTextInput('https://'),'SRC').appendField(T('너비')).appendField(new Blockly.FieldNumber(240,10,2000),'W')
  .appendField(T('이름')).appendField(new Blockly.FieldTextInput(T('그림')+'1'),'NAME'); },'인터넷에 있는 그림 주소를 넣어요');
elBlock('el_link',function(){ this.appendDummyInput().appendField(T('링크')).appendField(new Blockly.FieldTextInput(T('여기를 눌러요')),'TEXT').appendField(T('주소')).appendField(new Blockly.FieldTextInput('https://'),'HREF')
  .appendField(T('이름')).appendField(new Blockly.FieldTextInput(T('링크')+'1'),'NAME'); },'다른 페이지로 가는 링크');
def('el_box',function(){
  this.appendDummyInput().appendField(T('상자')).appendField(new Blockly.FieldDropdown(function(){ return [[T('세로로'),'col'],[T('가로로'),'row']]; }),'DIR')
    .appendField(T('배경')).appendField(new Blockly.FieldDropdown(function(){ return colorOpts(true); }),'BG').appendField(T('이름')).appendField(new Blockly.FieldTextInput(T('상자')+'1'),'NAME');
  this.appendStatementInput('BODY').setCheck('EL'); stmt(this,C.el,'안에 넣은 것들을 세로나 가로로 묶어요');
});
elBlock('el_canvas',function(){ this.appendDummyInput().appendField(T('그림판')).appendField(T('너비')).appendField(new Blockly.FieldNumber(320,20,2000),'W').appendField(T('높이')).appendField(new Blockly.FieldNumber(220,20,2000),'H')
  .appendField(T('이름')).appendField(new Blockly.FieldTextInput(T('그림판')+'1'),'NAME'); },'그림판 블록으로 도형을 그리는 곳. 게임도 만들 수 있어요');
elBlock('el_list',function(){ this.appendDummyInput().appendField(T('목록')).appendField(T('이름')).appendField(new Blockly.FieldTextInput(T('목록')+'1'),'NAME'); },'"덧붙이기"로 항목을 하나씩 넣는 목록');
elBlock('el_space',function(){ this.appendDummyInput().appendField(T('빈 줄')); },'사이를 띄워요');
elBlock('el_html',function(){ this.appendDummyInput().appendField(T('HTML 직접 쓰기')).appendField(new Blockly.FieldTextInput('<b>HTML</b>'),'CODE'); },'HTML 태그를 직접 써요');
EL.concat(['el_space','el_html']).forEach(function(t){ G.forBlock[t]=function(){ return ''; }; });
G.forBlock.page_root=function(){ return ''; };

/* ---------- events ---------- */
function hat(b,tip){ b.appendStatementInput('DO'); b.setColour(C.ev); b.setTooltip(T(tip)); b.hat='cap'; }
def('ev_start',function(){ this.appendDummyInput().appendField(T('페이지가 열리면')); hat(this,'페이지가 처음 열릴 때 한 번 해요'); },
  function(b){ return G.statementToCode(b,'DO').replace(/^  /gm,''); });
def('ev_click',function(){ this.appendDummyInput().appendField(elField(),'EL').appendField(T('을(를) 누르면')); hat(this,'버튼이나 그림, 그림판을 눌렀을 때 해요'); },
  function(b){ var n=b.getFieldValue('EL'), mouse=b.getDescendants(false).some(function(d){ return d.type==='val_mouse'; }); need('$'); if(mouse) need('pos');
    return '$('+lit(n)+').addEventListener(\'click\', function ('+(mouse?'e':'')+') {\n'+(mouse?'  __pos(e, this);\n':'')+G.statementToCode(b,'DO')+'});\n'; });
def('ev_change',function(){ this.appendDummyInput().appendField(elField(['el_input']),'EL').appendField(T('에 글을 쓰면')); hat(this,'입력칸의 내용이 바뀔 때마다 해요'); },
  function(b){ need('$'); return '$('+lit(b.getFieldValue('EL'))+').addEventListener(\'input\', function () {\n'+G.statementToCode(b,'DO')+'});\n'; });
var KEYS=[['아무 키','any'],['스페이스',' '],['엔터','Enter'],['↑','ArrowUp'],['↓','ArrowDown'],['←','ArrowLeft'],['→','ArrowRight'],['W','w'],['A','a'],['S','s'],['D','d']];
def('ev_key',function(){ this.appendDummyInput().appendField(new Blockly.FieldDropdown(function(){ return KEYS.map(function(k){ return [T(k[0]),k[1]]; }); }),'KEY').appendField(T('키를 누르면')); hat(this,'키보드 키를 눌렀을 때 해요'); },
  function(b){ var k=b.getFieldValue('KEY'); need('key');
    var cond=k==='any'?'true':(k.length===1&&/[a-z]/.test(k)?'e.key.toLowerCase() === '+lit(k):'e.key === '+lit(k));
    return 'document.addEventListener(\'keydown\', function (e) {\n  __key = e.key;\n  if ('+cond+') {\n'+(k!=='any'&&k.length>1||k===' '?'    e.preventDefault();\n':'')+G.prefixLines(G.statementToCode(b,'DO'),'  ')+'  }\n});\n'; });
def('ev_timer',function(){ this.appendDummyInput().appendField(new Blockly.FieldNumber(1,0.02,3600,0.01),'SEC').appendField(T('초마다')); hat(this,'정한 시간마다 계속 해요'); },
  function(b){ need('timers'); var ms=Math.max(20,Math.round(b.getFieldValue('SEC')*1000)); return '__timers.push(setInterval(function () {\n'+G.statementToCode(b,'DO')+'}, '+ms+'));\n'; });

/* ---------- actions ---------- */
def('act_set',function(){ this.appendValueInput('VALUE').appendField(elField(),'EL').appendField(T('의 내용을')); this.appendDummyInput().appendField(T('(으)로 바꾸기')); this.setInputsInline(true); act(this,'글자, 입력칸의 값, 그림 주소를 바꿔요'); },
  function(b){ need('set'); return '__set('+lit(b.getFieldValue('EL'))+', '+(G.valueToCode(b,'VALUE',O.COMMA)||"''")+');\n'; });
def('act_append',function(){ this.appendValueInput('VALUE').appendField(elField(),'EL').appendField(T('에')); this.appendDummyInput().appendField(T('덧붙이기')); this.setInputsInline(true); act(this,'글 뒤에 이어 붙여요. 목록이면 항목이 하나 늘어요'); },
  function(b){ need('add'); return '__add('+lit(b.getFieldValue('EL'))+', '+(G.valueToCode(b,'VALUE',O.COMMA)||"''")+');\n'; });
def('act_clear',function(){ this.appendDummyInput().appendField(elField(),'EL').appendField(T('비우기')); act(this,'내용을 모두 지워요'); },
  function(b){ need('set'); var n=lit(b.getFieldValue('EL')); return '__set('+n+', \'\');\n'; });
def('act_style',function(){ this.appendValueInput('VALUE').appendField(elField(),'EL').appendField(T('의')).appendField(new Blockly.FieldDropdown(function(){ return [[T('글자색'),'color'],[T('배경색'),'background']]; }),'PROP').appendField(T('을(를)'));
  this.appendDummyInput().appendField(T('(으)로')); this.setInputsInline(true); act(this,'색을 바꿔요'); },
  function(b){ need('$'); return '$('+lit(b.getFieldValue('EL'))+').style.'+(b.getFieldValue('PROP')==='color'?'color':'background')+' = '+(G.valueToCode(b,'VALUE',O.ASSIGNMENT)||"''")+';\n'; });
def('act_size',function(){ this.appendValueInput('N').setCheck('Number').appendField(elField(),'EL').appendField(T('의')).appendField(new Blockly.FieldDropdown(function(){ return [[T('글자 크기'),'fontSize'],[T('너비'),'width'],[T('높이'),'height'],[T('투명도 %'),'opacity'],[T('회전 각도'),'rotate']]; }),'PROP').appendField(T('을(를)'));
  this.appendDummyInput().appendField(T('(으)로')); this.setInputsInline(true); act(this,'크기, 투명도, 회전을 바꿔요'); },
  function(b){ need('size'); return '__size('+lit(b.getFieldValue('EL'))+', '+lit(b.getFieldValue('PROP'))+', '+(G.valueToCode(b,'N',O.COMMA)||'0')+');\n'; });
def('act_move',function(){ this.appendValueInput('X').setCheck('Number').appendField(elField(),'EL').appendField(T('을(를) 위치')).appendField('x'); this.appendValueInput('Y').setCheck('Number').appendField('y'); this.appendDummyInput().appendField(T('(으)로 옮기기')); this.setInputsInline(true); act(this,'페이지 왼쪽 위에서부터의 위치로 옮겨요'); },
  function(b){ need('move'); return '__move('+lit(b.getFieldValue('EL'))+', '+(G.valueToCode(b,'X',O.COMMA)||'0')+', '+(G.valueToCode(b,'Y',O.COMMA)||'0')+');\n'; });
def('act_show',function(){ this.appendDummyInput().appendField(elField(),'EL').appendField(new Blockly.FieldDropdown(function(){ return [[T('보이기'),'show'],[T('숨기기'),'hide'],[T('보이기/숨기기 바꾸기'),'toggle']]; }),'MODE'); act(this,'보이거나 숨겨요'); },
  function(b){ need('show'); return '__show('+lit(b.getFieldValue('EL'))+', '+lit(b.getFieldValue('MODE'))+');\n'; });
def('act_alert',function(){ this.appendValueInput('VALUE').appendField(T('알림창 띄우기')); act(this,'작은 알림창으로 보여줘요'); },
  function(b){ return 'alert('+(G.valueToCode(b,'VALUE',O.NONE)||"''")+');\n'; });
def('act_after',function(){ this.appendValueInput('SEC').setCheck('Number'); this.appendDummyInput().appendField(T('초 뒤에')); this.appendStatementInput('DO'); this.setInputsInline(true); act(this,'정한 시간이 지난 뒤에 한 번 해요'); },
  function(b){ return 'setTimeout(function () {\n'+G.statementToCode(b,'DO')+'}, ('+(G.valueToCode(b,'SEC',O.MULTIPLICATION)||'1')+') * 1000);\n'; });
def('act_stop',function(){ this.appendDummyInput().appendField(T('모든 "초마다" 멈추기')); act(this,'초마다 반복을 모두 멈춰요'); },
  function(){ need('timers'); return '__timers.forEach(clearInterval);\n'; });
def('act_beep',function(){ this.appendValueInput('SEC').setCheck('Number').appendField(T('소리 내기')).appendField(new Blockly.FieldDropdown(function(){ return NOTES.map(function(n){ return [T(n[0]),n[1]]; }); }),'NOTE'); this.appendDummyInput().appendField(T('초')); this.setInputsInline(true); act(this,'삐 소리를 내요'); },
  function(b){ need('beep'); return '__beep('+b.getFieldValue('NOTE')+', '+(G.valueToCode(b,'SEC',O.COMMA)||'0.3')+');\n'; });

/* ---------- values ---------- */
function val(b,check,tip){ b.setOutput(true,check||null); b.setColour(C.val); if(tip) b.setTooltip(T(tip)); }
def('val_get',function(){ this.appendDummyInput().appendField(elField(),'EL').appendField(T('의')).appendField(new Blockly.FieldDropdown(function(){ return [[T('내용'),'text'],[T('숫자'),'num'],[T('너비'),'width'],[T('높이'),'height']]; }),'PROP'); val(this,null,'글자나 입력칸에 쓴 값을 가져와요. 숫자로 계산하려면 "숫자"를 골라요'); },
  function(b){ var n=lit(b.getFieldValue('EL')), p=b.getFieldValue('PROP');
    if(p==='text'){ need('get'); return ['__get('+n+')',O.FUNCTION_CALL]; }
    if(p==='num'){ need('get'); return ['__num(__get('+n+'))',O.FUNCTION_CALL]; }
    need('$'); return ['$('+n+').'+(p==='width'?'offsetWidth':'offsetHeight'),O.MEMBER]; });
def('val_color',function(){ this.appendDummyInput().appendField(T('색')).appendField(new Blockly.FieldDropdown(function(){ return colorOpts(false); }),'COLOR'); val(this,'String'); },
  function(b){ return [lit(b.getFieldValue('COLOR')),O.ATOMIC]; });
def('val_rcolor',function(){ this.appendDummyInput().appendField(T('무작위 색')); val(this,'String'); },
  function(){ return ['\'hsl(\' + Math.floor(Math.random() * 360) + \', 80%, 60%)\'',O.ADDITION]; });
def('val_prompt',function(){ this.appendValueInput('VALUE').appendField(T('묻고 답 받기')); val(this,'String','질문 창을 띄우고 쓴 답을 가져와요'); },
  function(b){ return ['(prompt('+(G.valueToCode(b,'VALUE',O.NONE)||"''")+') || \'\')',O.LOGICAL_OR]; });
def('val_key',function(){ this.appendDummyInput().appendField(T('마지막으로 누른 키')); val(this,'String'); },
  function(){ need('key'); return ['__key',O.ATOMIC]; });
def('val_mouse',function(){ this.appendDummyInput().appendField(T('누른 위치')).appendField(new Blockly.FieldDropdown([['x','x'],['y','y']]),'AXIS'); val(this,'Number','"누르면" 안에서 쓰면, 누른 곳이 그 요소 왼쪽 위에서 얼마나 떨어졌는지 알려줘요'); },
  function(b){ need('pos'); return [b.getFieldValue('AXIS')==='x'?'__mx':'__my',O.ATOMIC]; });
def('val_time',function(){ this.appendDummyInput().appendField(T('지금')).appendField(new Blockly.FieldDropdown(function(){ return [[T('시'),'getHours'],[T('분'),'getMinutes'],[T('초'),'getSeconds'],[T('요일 (0=일)'),'getDay'],[T('날짜'),'getDate']]; }),'U'); val(this,'Number'); },
  function(b){ return ['new Date().'+b.getFieldValue('U')+'()',O.FUNCTION_CALL]; });

def('val_myimg',function(){ this.appendDummyInput().appendField(T('내 그림')).appendField(imgField(),'IMG'); val(this,'String','내 그림. 그림의 내용 바꾸기나 그림판에 그리기에 써요'); },
  function(b){ var id=b.getFieldValue('IMG'); if(!IMGS[id]) return ["''",O.ATOMIC]; USED[id]=1; need('imgs'); return ['__imgs['+lit(imgName(id))+']',O.MEMBER]; });

/* ---------- drawing ---------- */
var CV=['el_canvas'];
function drawB(type,label,inputs,tip,gen){
  def(type,function(){ var self=this; this.appendDummyInput().appendField(elField(CV),'EL').appendField(T(label));
    inputs.forEach(function(i){ var inp=self.appendValueInput(i[0]); if(i[2]) inp.setCheck(i[2]); inp.appendField(T(i[1])); });
    this.setInputsInline(true); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(C.draw); this.setTooltip(T(tip)); }, gen);
}
function v(b,n,d){ return G.valueToCode(b,n,O.COMMA)||d; }
drawB('draw_clear','지우기',[],'그림판을 깨끗이 지워요',function(b){ need('draw'); return '__clear('+lit(b.getFieldValue('EL'))+');\n'; });
drawB('draw_rect','에 네모',[['X','x','Number'],['Y','y','Number'],['W','너비','Number'],['H','높이','Number'],['COLOR','색']],'네모를 그려요 (x, y는 왼쪽 위 모서리)',
  function(b){ need('draw'); return '__rect('+[lit(b.getFieldValue('EL')),v(b,'X','0'),v(b,'Y','0'),v(b,'W','10'),v(b,'H','10'),v(b,'COLOR',"'#000'")].join(', ')+');\n'; });
drawB('draw_circle','에 원',[['X','x','Number'],['Y','y','Number'],['R','반지름','Number'],['COLOR','색']],'원을 그려요 (x, y는 가운데)',
  function(b){ need('draw'); return '__circle('+[lit(b.getFieldValue('EL')),v(b,'X','0'),v(b,'Y','0'),v(b,'R','10'),v(b,'COLOR',"'#000'")].join(', ')+');\n'; });
drawB('draw_line','에 선',[['X1','x1','Number'],['Y1','y1','Number'],['X2','x2','Number'],['Y2','y2','Number'],['COLOR','색']],'두 점을 잇는 선을 그려요',
  function(b){ need('draw'); return '__line('+[lit(b.getFieldValue('EL')),v(b,'X1','0'),v(b,'Y1','0'),v(b,'X2','10'),v(b,'Y2','10'),v(b,'COLOR',"'#000'")].join(', ')+');\n'; });
drawB('draw_text','에 글',[['TEXT',''],['X','x','Number'],['Y','y','Number'],['COLOR','색']],'글자를 그려요',
  function(b){ need('draw'); return '__text('+[lit(b.getFieldValue('EL')),v(b,'TEXT',"''"),v(b,'X','0'),v(b,'Y','0'),v(b,'COLOR',"'#000'")].join(', ')+');\n'; });

drawB('draw_image','에 그림',[['IMG',''],['X','x','Number'],['Y','y','Number'],['W','너비','Number']],'내 그림이나 그림 주소를 그림판에 그려요 (x, y는 왼쪽 위)',
  function(b){ need('draw'); need('image'); return '__image('+[lit(b.getFieldValue('EL')),v(b,'IMG',"''"),v(b,'X','0'),v(b,'Y','0'),v(b,'W','80')].join(', ')+');\n'; });

/* ---------- raw JavaScript ---------- */
def('js_raw',function(){ this.appendDummyInput().appendField('JS').appendField(new Blockly.FieldTextInput('console.log("hi");'),'CODE'); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(C.js); this.setTooltip(T('자바스크립트 한 줄을 직접 써요')); },
  function(b){ return b.getFieldValue('CODE')+'\n'; });
def('js_val',function(){ this.appendDummyInput().appendField('JS').appendField(new Blockly.FieldTextInput('Math.PI'),'CODE'); val(this,null,'자바스크립트 식을 직접 써요'); this.setColour(C.js); },
  function(b){ return ['('+b.getFieldValue('CODE')+')',O.ATOMIC]; });

/* ---------- helpers that go into the page, only the ones used ---------- */
var HELP={
  '$':"function $(name) {\n  var el = document.getElementById(name);\n  if (!el) throw new Error('\"' + name + '\" 요소가 없어요');\n  return el;\n}",
  get:"function __get(name) {\n  var el = $(name);\n  return el.tagName === 'INPUT' ? el.value : el.textContent;\n}\nfunction __num(x) {\n  var n = parseFloat(x);\n  return isNaN(n) ? 0 : n;\n}",
  set:"function __set(name, value) {\n  var el = $(name);\n  if (el.tagName === 'INPUT') el.value = value;\n  else if (el.tagName === 'IMG') el.src = value;\n  else if (el.tagName === 'CANVAS') el.getContext('2d').clearRect(0, 0, el.width, el.height);\n  else el.textContent = value;\n}",
  add:"function __add(name, value) {\n  var el = $(name);\n  if (el.tagName === 'UL') {\n    var li = document.createElement('li');\n    li.textContent = value;\n    el.appendChild(li);\n  } else if (el.tagName === 'INPUT') el.value += value;\n  else el.textContent += value;\n}",
  size:"function __size(name, prop, v) {\n  var s = $(name).style;\n  if (prop === 'opacity') s.opacity = v / 100;\n  else if (prop === 'rotate') s.transform = 'rotate(' + v + 'deg)';\n  else s[prop] = v + 'px';\n}",
  move:"function __move(name, x, y) {\n  var s = $(name).style;\n  s.position = 'absolute';\n  s.left = x + 'px';\n  s.top = y + 'px';\n}",
  show:"function __show(name, mode) {\n  var el = $(name);\n  if (mode === 'toggle') mode = el.style.display === 'none' ? 'show' : 'hide';\n  el.style.display = mode === 'hide' ? 'none' : '';\n}",
  pos:"var __mx = 0, __my = 0;\nfunction __pos(e, el) {\n  var r = el.getBoundingClientRect();\n  __mx = Math.round((e.clientX - r.left) * (el.width ? el.width / r.width : 1));\n  __my = Math.round((e.clientY - r.top) * (el.height ? el.height / r.height : 1));\n}",
  key:"var __key = '';",
  timers:"var __timers = [];",
  beep:"var __audio;\nfunction __beep(freq, sec) {\n  __audio = __audio || new (window.AudioContext || window.webkitAudioContext)();\n  var o = __audio.createOscillator(), g = __audio.createGain(), t = __audio.currentTime;\n  o.frequency.value = freq;\n  o.connect(g); g.connect(__audio.destination);\n  g.gain.setValueAtTime(0.2, t);\n  g.gain.exponentialRampToValueAtTime(0.001, t + sec);\n  o.start(t); o.stop(t + sec);\n}",
  image:"var __imgCache = {};\nfunction __image(name, src, x, y, w) {\n  if (!src) return;\n  var g = __pen(name), im = __imgCache[src];\n  if (!im) { im = new Image(); im.src = src; __imgCache[src] = im; }\n  var go = function () { g.drawImage(im, x, y, w, w * im.naturalHeight / im.naturalWidth); };\n  if (im.complete && im.naturalWidth) go(); else im.addEventListener('load', go, { once: true });\n}",
  draw:"function __pen(name) { return $(name).getContext('2d'); }\nfunction __clear(name) { var c = $(name); __pen(name).clearRect(0, 0, c.width, c.height); }\nfunction __rect(name, x, y, w, h, color) { var g = __pen(name); g.fillStyle = color; g.fillRect(x, y, w, h); }\nfunction __circle(name, x, y, r, color) { var g = __pen(name); g.fillStyle = color; g.beginPath(); g.arc(x, y, Math.max(0, r), 0, Math.PI * 2); g.fill(); }\nfunction __line(name, x1, y1, x2, y2, color) { var g = __pen(name); g.strokeStyle = color; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }\nfunction __text(name, text, x, y, color) { var g = __pen(name); g.fillStyle = color; g.font = '20px sans-serif'; g.fillText(text, x, y); }"
};
var HELP_DEPS={image:['$','draw'],get:['$'],set:['$'],add:['$'],size:['$'],move:['$'],show:['$'],draw:['$']};

/* ---------- HTML ---------- */
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function idAttr(b){ var n=b.getFieldValue('NAME'); return n?' id="'+esc(n)+'"':''; }
function bodyHTML(first,ind){
  var out='', b=first;
  for(;b;b=b.getNextBlock()){
    if(!b.isEnabled()) continue;
    var t=b.type, i=ind;
    if(t==='el_heading'){ var h=b.getFieldValue('SIZE'); out+=i+'<'+h+idAttr(b)+'>'+esc(b.getFieldValue('TEXT'))+'</'+h+'>\n'; }
    else if(t==='el_text') out+=i+'<p'+idAttr(b)+'>'+esc(b.getFieldValue('TEXT'))+'</p>\n';
    else if(t==='el_button') out+=i+'<button'+idAttr(b)+'>'+esc(b.getFieldValue('TEXT'))+'</button>\n';
    else if(t==='el_input') out+=i+'<input'+idAttr(b)+' type="'+b.getFieldValue('KIND')+'" placeholder="'+esc(b.getFieldValue('TEXT'))+'">\n';
    else if(t==='el_picture'){ var im=IMGS[b.getFieldValue('IMG')]; out+=i+'<img'+idAttr(b)+' src="'+(im?im.data:'')+'" width="'+b.getFieldValue('W')+'" alt="'+esc(im?im.name:'')+'">\n'; }
    else if(t==='el_image') out+=i+'<img'+idAttr(b)+' src="'+esc(b.getFieldValue('SRC'))+'" width="'+b.getFieldValue('W')+'" alt="">\n';
    else if(t==='el_link') out+=i+'<a'+idAttr(b)+' href="'+esc(b.getFieldValue('HREF'))+'" target="_blank">'+esc(b.getFieldValue('TEXT'))+'</a>\n';
    else if(t==='el_canvas') out+=i+'<canvas'+idAttr(b)+' width="'+b.getFieldValue('W')+'" height="'+b.getFieldValue('H')+'"></canvas>\n';
    else if(t==='el_list') out+=i+'<ul'+idAttr(b)+'></ul>\n';
    else if(t==='el_space') out+=i+'<div class="space"></div>\n';
    else if(t==='el_html') out+=i+b.getFieldValue('CODE')+'\n';
    else if(t==='el_box'){ var bg=b.getFieldValue('BG'); out+=i+'<div'+idAttr(b)+' class="box'+(b.getFieldValue('DIR')==='row'?' row':'')+'"'+(bg?' style="background:'+bg+'"':'')+'>\n'+bodyHTML(b.getInputTargetBlock('BODY'),ind+'  ')+i+'</div>\n'; }
  }
  return out;
}
function textColorFor(bg){ var h=bg.replace('#',''); if(h.length!==6) return '#111'; var r=parseInt(h.substr(0,2),16), g=parseInt(h.substr(2,2),16), b=parseInt(h.substr(4,2),16); return (r*299+g*587+b*114)/1000<128?'#f1f5f9':'#1f2937'; }
function build(ws,opts){
  opts=opts||{};
  var page=ws.getTopBlocks(true).filter(function(b){ return b.type==='page_root'&&b.isEnabled(); })[0];
  var title=page?page.getFieldValue('TITLE'):T('나의 웹페이지'), bg=page?page.getFieldValue('BG'):'#ffffff', center=page?page.getFieldValue('CENTER')==='TRUE':true;
  var body=page?bodyHTML(page.getInputTargetBlock('BODY'),'  '):'';
  // JavaScript
  NEED={}; USED={}; G.INFINITE_LOOP_TRAP=opts.trap?'if (--window.__loop < 0) throw new Error("'+T('반복이 끝나지 않아요')+'");\n':null;
  G.init(ws); var handlers='', starts='';
  ws.getTopBlocks(true).forEach(function(b){
    if(!b.isEnabled()) return;
    if(b.type==='ev_start') starts+=G.blockToCode(b)||'';
    else if(/^ev_/.test(b.type)||/^procedures_def/.test(b.type)){ var c=G.blockToCode(b); if(Array.isArray(c)) c=c[0]; handlers+=c||''; }
  });
  var js=G.finish(handlers+(starts?(handlers?'\n':'')+starts:''));
  Object.keys(HELP_DEPS).forEach(function(k){ if(NEED[k]) HELP_DEPS[k].forEach(need); });
  var helpers=Object.keys(HELP).filter(function(k){ return NEED[k]; }).map(function(k){ return HELP[k]; }).join('\n');
  if(NEED.imgs){ var used=Object.keys(USED).filter(function(id){ return IMGS[id]; }); helpers='// '+T('내 그림')+'\nvar __imgs = {\n'+used.map(function(id){ return '  '+lit(IMGS[id].name)+': '+lit(IMGS[id].data); }).join(',\n')+'\n};\n'+(NEED.image?'for (var __k in __imgs) { var __im = new Image(); __im.src = __imgs[__k]; }\n':'')+helpers; }
  if(helpers) js='// '+T('도우미 함수')+'\n'+helpers+'\n\n'+js;
  var fg=textColorFor(bg);
  var css=[
    'body { margin: 0; padding: 24px; font-family: system-ui, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; line-height: 1.5; background: '+bg+'; color: '+fg+';'+(center?' text-align: center;':'')+' }',
    'h1, h2, h3 { margin: 12px 0; }',
    'button { font: inherit; font-weight: 700; padding: 10px 18px; margin: 4px; border: 0; border-radius: 10px; background: #ffc93c; color: #1c1405; cursor: pointer; }',
    'button:active { transform: scale(.97); }',
    'input { font: inherit; padding: 9px 12px; margin: 4px; border: 1px solid #9ca3af; border-radius: 9px; }',
    'img { max-width: 100%; border-radius: 8px; }',
    'canvas { max-width: 100%; background: #ffffff; border: 1px solid #d1d5db; border-radius: 8px; touch-action: manipulation; }',
    'ul { display: inline-block; text-align: left; }',
    '.box { display: flex; flex-direction: column; gap: 8px; padding: 12px; margin: 8px 0; border-radius: 12px;'+(center?' align-items: center;':'')+' }',
    '.box.row { flex-direction: row; flex-wrap: wrap; align-items: center;'+(center?' justify-content: center;':'')+' }',
    '.space { height: 24px; }'
  ].join('\n    ');
  var pre=opts.trap?'<script>window.__loop=1e6;setInterval(function(){window.__loop=1e6;},200);(function(){var P=0,Q=[],sT=setTimeout,sI=setInterval,rA=window.requestAnimationFrame&&window.requestAnimationFrame.bind(window),st=null;window.setTimeout=function(f,ms){var a=[].slice.call(arguments,2);if(typeof f!==\'function\')return sT(f,ms);return sT(function(){if(P)Q.push(function(){f.apply(window,a);});else f.apply(window,a);},ms);};window.setInterval=function(f,ms){var a=[].slice.call(arguments,2);if(typeof f!==\'function\')return sI(f,ms);return sI(function(){if(!P)f.apply(window,a);},ms);};if(rA)window.requestAnimationFrame=function(f){return rA(function(t){if(P)Q.push(function(){rA(f);});else f(t);});};addEventListener(\'message\',function(e){var d=e.data;if(!d||d.ffbh===undefined)return;if(d.ffbh===\'pause\'&&!P){P=1;st=document.createElement(\'style\');st.textContent=\'*,*::before,*::after{animation-play-state:paused!important;transition:none!important}\';document.head.appendChild(st);document.querySelectorAll(\'audio,video\').forEach(function(m){if(!m.paused){m.pause();m.__ffp=1;}});}else if(d.ffbh===\'resume\'&&P){P=0;if(st)st.remove();var q=Q;Q=[];q.forEach(function(f){f();});document.querySelectorAll(\'audio,video\').forEach(function(m){if(m.__ffp){m.__ffp=0;m.play();}});}});})();window.onerror=function(m){var d=document.getElementById("__err")||document.body.appendChild(Object.assign(document.createElement("div"),{id:"__err"}));d.style.cssText="position:fixed;left:8px;right:8px;bottom:8px;padding:10px 14px;border-radius:10px;background:#7f1d1d;color:#fff;font:14px sans-serif;text-align:left;z-index:99999";d.textContent="⚠ "+m;};<\/script>\n':'';
  return '<!DOCTYPE html>\n<html lang="'+(FFT.lang||'ko')+'">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>'+esc(title)+'</title>\n  <!-- '+T('Block HTML로 만든 페이지')+' -->\n'+(pre?'  '+pre:'')+
    '  <style>\n    '+css+'\n  </style>\n</head>\n<body>\n'+body+(js.trim()?'  <script>\n'+js.replace(/^(?=.)/gm,'    ')+'\n  <\/script>\n':'')+'</body>\n</html>\n';
}

/* ---------- toolbox ---------- */
function sh(type,val){ return {shadow:{type:type,fields:type==='math_number'?{NUM:val}:{TEXT:val}}}; }
function shc(c){ return {shadow:{type:'val_color',fields:{COLOR:c}}}; }
function toolbox(){
  var n=function(v){ return sh('math_number',v); }, lab=function(t){ return {kind:'label',text:T(t)}; };
  var img={shadow:{type:'val_myimg'}};
  return {kind:'categoryToolbox',contents:[
    {kind:'category',name:T('시작'),colour:C.ev,contents:[
      {kind:'block',type:'ev_start'},lab('누르거나 쓰면'),{kind:'block',type:'ev_click'},{kind:'block',type:'ev_change'},{kind:'block',type:'ev_key'},lab('시간마다'),{kind:'block',type:'ev_timer'}]},
    {kind:'category',name:T('화면'),colour:C.page,contents:[
      {kind:'block',type:'page_root'},lab('글'),{kind:'block',type:'el_heading'},{kind:'block',type:'el_text'},{kind:'block',type:'el_list'},{kind:'block',type:'el_link'},
      lab('누르고 쓰기'),{kind:'block',type:'el_button'},{kind:'block',type:'el_input'},
      lab('묶고 띄우기'),{kind:'block',type:'el_box'},{kind:'block',type:'el_space'},{kind:'block',type:'el_html'}]},
    {kind:'category',name:T('그림·사진'),colour:'#e0663d',contents:[
      {kind:'button',text:T('✏️ 그림 그리기'),callbackKey:'imgDraw'},{kind:'button',text:T('📷 사진 넣기'),callbackKey:'imgPhoto'},{kind:'button',text:T('🗂 내 그림 관리'),callbackKey:'imgManage'},
      lab('페이지에 넣기'),{kind:'block',type:'el_picture'},{kind:'block',type:'el_image'},
      lab('바꾸기'),{kind:'block',type:'act_set',inputs:{VALUE:img}},{kind:'block',type:'val_myimg'}]},
    {kind:'category',name:T('그림판'),colour:C.draw,contents:[
      {kind:'block',type:'el_canvas'},lab('그리기'),{kind:'block',type:'draw_clear'},
      {kind:'block',type:'draw_rect',inputs:{X:n(20),Y:n(20),W:n(80),H:n(50),COLOR:shc('#3b82f6')}},
      {kind:'block',type:'draw_circle',inputs:{X:n(160),Y:n(110),R:n(30),COLOR:shc('#ffc93c')}},
      {kind:'block',type:'draw_line',inputs:{X1:n(10),Y1:n(10),X2:n(200),Y2:n(150),COLOR:shc('#111111')}},
      {kind:'block',type:'draw_text',inputs:{TEXT:sh('text',T('안녕')),X:n(20),Y:n(40),COLOR:shc('#111111')}},
      {kind:'block',type:'draw_image',inputs:{IMG:img,X:n(20),Y:n(20),W:n(80)}},
      lab('누른 곳'),{kind:'block',type:'val_mouse'}]},
    {kind:'category',name:T('바꾸기'),colour:C.act,contents:[
      {kind:'block',type:'act_set',inputs:{VALUE:sh('text',T('안녕!'))}},
      {kind:'block',type:'act_append',inputs:{VALUE:sh('text',T('항목'))}},
      {kind:'block',type:'act_clear'},
      lab('값 가져오기'),{kind:'block',type:'val_get'},{kind:'block',type:'val_prompt',inputs:{VALUE:sh('text',T('이름이 뭐예요?'))}},{kind:'block',type:'val_key'}]},
    {kind:'category',name:T('모양'),colour:'#17a589',contents:[
      {kind:'block',type:'act_style',inputs:{VALUE:shc('#ef4444')}},
      {kind:'block',type:'act_size',inputs:{N:n(32)}},
      {kind:'block',type:'act_show'},
      lab('색'),{kind:'block',type:'val_color'},{kind:'block',type:'val_rcolor'}]},
    {kind:'category',name:T('움직임'),colour:'#0f8f8f',contents:[
      {kind:'block',type:'act_move',inputs:{X:n(100),Y:n(100)}},
      {kind:'block',type:'act_size',fields:{PROP:'rotate'},inputs:{N:n(45)}},
      lab('누른 곳'),{kind:'block',type:'val_mouse'}]},
    {kind:'category',name:T('소리·알림'),colour:'#2e9bd6',contents:[
      {kind:'block',type:'act_beep',inputs:{SEC:n(0.3)}},
      {kind:'block',type:'act_alert',inputs:{VALUE:sh('text',T('안녕하세요!'))}}]},
    {kind:'category',name:T('시간'),colour:'#3a6fd8',contents:[
      {kind:'block',type:'act_after',inputs:{SEC:n(1)}},{kind:'block',type:'ev_timer'},{kind:'block',type:'act_stop'},{kind:'block',type:'val_time'}]},
    {kind:'sep'},
    {kind:'category',name:T('조건'),colour:'#5b80a5',contents:[
      {kind:'block',type:'controls_if'},{kind:'block',type:'controls_if',extraState:{hasElse:true}},
      lab('비교'),{kind:'block',type:'logic_compare'},{kind:'block',type:'logic_operation'},{kind:'block',type:'logic_negate'},{kind:'block',type:'logic_boolean'},
      {kind:'block',type:'logic_ternary'}]},
    {kind:'category',name:T('반복'),colour:'#5ba55b',contents:[
      {kind:'block',type:'controls_repeat_ext',inputs:{TIMES:n(10)}},{kind:'block',type:'controls_whileUntil'},
      {kind:'block',type:'controls_for',inputs:{FROM:n(1),TO:n(10),BY:n(1)}},{kind:'block',type:'controls_forEach'},{kind:'block',type:'controls_flow_statements'},
      lab('시간마다'),{kind:'block',type:'ev_timer'}]},
    {kind:'category',name:T('계산'),colour:'#5b67a5',contents:[
      {kind:'block',type:'math_number'},{kind:'block',type:'math_arithmetic',inputs:{A:n(1),B:n(1)}},
      {kind:'block',type:'math_random_int',inputs:{FROM:n(1),TO:n(100)}},{kind:'block',type:'math_round',inputs:{NUM:n(3.5)}},
      {kind:'block',type:'math_modulo',inputs:{DIVIDEND:n(10),DIVISOR:n(3)}},{kind:'block',type:'math_single',inputs:{NUM:n(9)}},
      {kind:'block',type:'math_number_property',inputs:{NUMBER_TO_CHECK:n(0)}},{kind:'block',type:'math_constrain',inputs:{VALUE:n(50),LOW:n(0),HIGH:n(100)}},
      {kind:'block',type:'math_random_float'}]},
    {kind:'category',name:T('글자'),colour:'#5ba58c',contents:[
      {kind:'block',type:'text'},{kind:'block',type:'text_join'},{kind:'block',type:'text_length',inputs:{VALUE:sh('text','abc')}},
      {kind:'block',type:'text_isEmpty',inputs:{VALUE:sh('text','')}},{kind:'block',type:'text_indexOf',inputs:{FIND:sh('text','a')}},
      {kind:'block',type:'text_charAt'},{kind:'block',type:'text_changeCase',inputs:{TEXT:sh('text','abc')}},{kind:'block',type:'text_trim',inputs:{TEXT:sh('text',' abc ')}}]},
    {kind:'category',name:T('리스트'),colour:'#745ba5',contents:[
      {kind:'block',type:'lists_create_with',extraState:{itemCount:0}},{kind:'block',type:'lists_create_with'},
      {kind:'block',type:'lists_repeat',inputs:{NUM:n(5)}},{kind:'block',type:'lists_length'},{kind:'block',type:'lists_isEmpty'},
      {kind:'block',type:'lists_indexOf'},{kind:'block',type:'lists_getIndex'},{kind:'block',type:'lists_setIndex'},{kind:'block',type:'lists_sort'}]},
    {kind:'category',name:T('변수'),colour:'#a55b80',custom:'VARIABLE'},
    {kind:'category',name:T('함수'),colour:'#995ba5',custom:'PROCEDURE'},
    {kind:'category',name:T('JS 직접 쓰기'),colour:C.js,contents:[{kind:'block',type:'js_raw'},{kind:'block',type:'js_val'}]}
  ]};
}

window.BH={IMGS:IMGS, build:build, toolbox:toolbox, EL:EL, KNOWN:KNOWN, elNames:elNames, C:C};
})();
