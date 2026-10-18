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
/* element dropdown. The extras are only offered where they make sense:
   "나(이 복제본)" / "닿은 상대" inside clone and touch scripts, "이름 복제본 아무거나" in touch blocks.
   flag: 'hat' = names only, 'hit' = touch condition (clone groups too), 'evhit' = touch event (clone groups, no "me"), 'del' = only me / other */
var ME='@me', OTHER='@other', CLONE_T=['ev_clone','clone_make','clone_make_at'];
function hasBlock(types){ var ws=Blockly.getMainWorkspace&&Blockly.getMainWorkspace(); return !!ws&&ws.getAllBlocks(false).some(function(b){ return types.indexOf(b.type)>=0; }); }
function cloneBases(){ var ws=Blockly.getMainWorkspace&&Blockly.getMainWorkspace(), out=[]; if(ws) ws.getAllBlocks(false).forEach(function(b){ if(CLONE_T.indexOf(b.type)>=0){ var n=b.getFieldValue('EL'); if(n&&n!=='?'&&out.indexOf(n)<0) out.push(n); } }); return out; }
function refLabel(v){ return v===ME?T('나(이 복제본)'):v===OTHER?T('닿은 상대'):/\*$/.test(v)?v.slice(0,-1)+' '+T('복제본 아무거나'):v; }
function elField(kinds,flag){
  return new Blockly.FieldDropdown(function(){
    var v=this.getValue&&this.getValue(), loadingNames=KNOWN.size>0, out=[];
    if(flag!=='del') out=elNames(kinds).map(function(n){ return [n,n]; });
    if(!kinds&&flag!=='hat'){
      var extra=function(x){ if(!out.some(function(o){ return o[1]===x; })) out.push([refLabel(x),x]); };
      if(flag==='del'){ extra(ME); extra(OTHER); }
      else {
        if(flag!=='evhit'&&(loadingNames||hasBlock(['ev_clone','ev_hit'])||v===ME)) extra(ME);
        if(flag!=='evhit'&&(loadingNames||hasBlock(['ev_hit'])||v===OTHER)) extra(OTHER);
        if(flag==='hit'||flag==='evhit'){ cloneBases().forEach(function(n){ extra(n+'*'); }); if(loadingNames) KNOWN.forEach(function(n){ extra(n+'*'); }); }
      }
    }
    if(v&&v!=='?'&&!out.some(function(o){ return o[1]===v; })) out.push([refLabel(v),v]);
    if(!out.length) return [[T('(요소 없음)'),'?']];
    return out;
  });
}
/* the JavaScript for an element reference: a name, or the clone a script is running for */
function er(b,f){ var v=b.getFieldValue(f||'EL'); if(v===ME){ need('me'); return '__me'; } if(v===OTHER){ need('other'); return '__other'; } return lit(v); }
/* "내 그림": pictures drawn or uploaded by the user. id -> {name, data (data URL), w, h, thumb} */
var IMGS={}, USED={}, USEDS={};
function imgField(){
  return new Blockly.FieldDropdown(function(){
    var ids=Object.keys(IMGS), v=this.getValue&&this.getValue();
    if(!ids.length) return [[T('(그림 없음)'),'?']];
    var o=ids.map(function(id){ var m=IMGS[id], k=Math.min(1,44/Math.max(m.w||44,m.h||44)); return [{src:m.thumb||m.data,width:Math.max(8,Math.round((m.w||44)*k)),height:Math.max(8,Math.round((m.h||44)*k)),alt:m.name},id]; });
    return o;
  });
}
function imgName(id){ return IMGS[id]?IMGS[id].name:''; }
/* a picture block with no picture chosen shows a dashed placeholder with a hint instead of a broken image */
function placeholderSrc(w){ w=Math.max(120,Math.min(+w||240,2000)); var h=Math.round(w*0.55), fs=Math.max(13,Math.min(28,Math.round(w/14))), msg=T('그림을 골라 주세요');
  var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><rect x="2" y="2" width="'+(w-4)+'" height="'+(h-4)+'" rx="10" fill="#fffbeb" stroke="#f59e0b" stroke-width="3" stroke-dasharray="10 7"/><text x="'+(w/2)+'" y="'+(h/2-fs*0.2)+'" font-size="'+fs*1.8+'" text-anchor="middle" dominant-baseline="middle">🖼</text><text x="'+(w/2)+'" y="'+(h/2+fs*1.5)+'" font-size="'+fs+'" font-family="sans-serif" font-weight="700" fill="#92400e" text-anchor="middle">'+esc(msg)+'</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg); }
function missingPics(ws){ return ws.getAllBlocks(false).filter(function(b){ return b.type==='el_picture'&&b.isEnabled()&&!IMGS[b.getFieldValue('IMG')]; }); }
function markPics(ws){ var n=0; ws.getAllBlocks(false).forEach(function(b){ if(b.type!=='el_picture'||!b.setWarningText) return; var miss=!IMGS[b.getFieldValue('IMG')]; if(miss) n++; var ic=b.getIcon&&b.getIcon('warning'), cur=ic&&ic.getText?ic.getText():null, msg=T('그림을 골라 주세요. 그림판으로 그리거나 사진을 넣어요'); if(miss){ if(cur!==msg) b.setWarningText(msg); } else if(cur) b.setWarningText(null); }); return n; }
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
/* step-by-step debugging ("한 블록씩 실행"): the build puts "await __step(id)" before every block of the event scripts, and each script runs as an async function */
var DBG=false, dbgSeq=0;
function AF(){ return DBG?'async function (':'function ('; }
function hatBody(b,guard){ var body=G.statementToCode(b,'DO'); if(!DBG) return body;
  var k=guard?lit('g'+(++dbgSeq)):null;
  return (guard?'  if (__dbusy['+k+']) return;\n  __dbusy['+k+'] = 1;\n':'')+'  __dbegin();\n  try {\n'+G.prefixLines(body,'  ')+'  } finally {\n    __dend();\n'+(guard?'    __dbusy['+k+'] = 0;\n':'')+'  }\n'; }
function hat(b,tip){ b.appendStatementInput('DO'); b.setColour(C.ev); b.setTooltip(T(tip)); b.hat='cap'; }
def('ev_start',function(){ this.appendDummyInput().appendField(T('페이지가 열리면')); hat(this,'페이지가 처음 열릴 때 한 번 해요'); },
  function(b){ if(DBG) return '(async function () {\n'+hatBody(b)+'})();\n'; return G.statementToCode(b,'DO').replace(/^  /gm,''); });
def('ev_click',function(){ this.appendDummyInput().appendField(elField(null,'hat'),'EL').appendField(T('을(를) 누르면')); hat(this,'버튼이나 그림, 그림판을 눌렀을 때 해요'); },
  function(b){ var n=b.getFieldValue('EL'), mouse=b.getDescendants(false).some(function(d){ return d.type==='val_mouse'; }); need('$'); if(mouse) need('pos');
    return '$('+lit(n)+').addEventListener(\'click\', '+AF()+(mouse?'e':'')+') {\n'+(mouse?'  __pos(e, this);\n':'')+hatBody(b)+'});\n'; });
def('ev_change',function(){ this.appendDummyInput().appendField(elField(['el_input']),'EL').appendField(T('에 글을 쓰면')); hat(this,'입력칸의 내용이 바뀔 때마다 해요'); },
  function(b){ need('$'); return '$('+lit(b.getFieldValue('EL'))+').addEventListener(\'input\', '+AF()+') {\n'+hatBody(b)+'});\n'; });
var KEYS=[['아무 키','any'],['스페이스',' '],['엔터','Enter'],['↑','ArrowUp'],['↓','ArrowDown'],['←','ArrowLeft'],['→','ArrowRight'],['Esc','Escape'],['Shift','Shift'],['Tab','Tab'],['Backspace','Backspace']];
'abcdefghijklmnopqrstuvwxyz'.split('').forEach(function(c){ KEYS.push([c.toUpperCase(),c]); });
'0123456789'.split('').forEach(function(c){ KEYS.push([c,c]); });
function keyCond(k){ return k==='any'?'true':(k.length===1&&/[a-z]/.test(k)?'e.key.toLowerCase() === '+lit(k):'e.key === '+lit(k)); }
function keyDrop(){ return new Blockly.FieldDropdown(function(){ return KEYS.map(function(k){ return [T(k[0]),k[1]]; }); }); }
def('ev_key',function(){ this.appendDummyInput().appendField(keyDrop(),'KEY').appendField(T('키를 누르면')); hat(this,'키보드 키를 눌렀을 때 해요'); },
  function(b){ var k=b.getFieldValue('KEY'); need('key');
    return 'document.addEventListener(\'keydown\', '+AF()+'e) {\n  __key = e.key;\n  if ('+keyCond(k)+') {\n'+(k!=='any'&&k.length>1||k===' '?'    e.preventDefault();\n':'')+G.prefixLines(hatBody(b),'  ')+'  }\n});\n'; });
def('ev_keyhold',function(){ this.appendDummyInput().appendField(keyDrop(),'KEY').appendField(T('키를 누르고 있는 동안 (끊김 없이)')); hat(this,'키를 누르고 있는 동안 일정한 간격으로 계속 해요. 처음 멈칫하거나 뚝뚝 끊기지 않아서 움직이기에 좋아요'); },
  function(b){ var k=b.getFieldValue('KEY'); need('key'); need('keyhold');
    return '__keyHold(function (e) { return '+keyCond(k)+'; }, '+AF()+'e) {\n'+(k!=='any'&&k.length>1||k===' '?'  e.preventDefault();\n':'')+hatBody(b,true)+'});\n'; });
def('ev_keyup',function(){ this.appendDummyInput().appendField(keyDrop(),'KEY').appendField(T('키를 눌렀다 떼면')); hat(this,'키보드 키에서 손을 뗐을 때 해요'); },
  function(b){ var k=b.getFieldValue('KEY'); need('key');
    var cond=k==='any'?'true':(k.length===1&&/[a-z]/.test(k)?'e.key.toLowerCase() === '+lit(k):'e.key === '+lit(k));
    return 'document.addEventListener(\'keyup\', '+AF()+'e) {\n  __key = e.key;\n  if ('+cond+') {\n'+G.prefixLines(hatBody(b),'  ')+'  }\n});\n'; });
def('ev_timer',function(){ this.appendDummyInput().appendField(new Blockly.FieldNumber(1,0.02,3600,0.01),'SEC').appendField(T('초마다')); hat(this,'정한 시간마다 계속 해요'); },
  function(b){ need('timers'); var ms=Math.max(20,Math.round(b.getFieldValue('SEC')*1000)); return '__timers.push(setInterval('+AF()+') {\n'+hatBody(b,true)+'}, '+ms+'));\n'; });

/* ---------- actions ---------- */
def('act_set',function(){ this.appendValueInput('VALUE').appendField(elField(),'EL').appendField(T('의 내용을')); this.appendDummyInput().appendField(T('(으)로 바꾸기')); this.setInputsInline(true); act(this,'글자, 입력칸의 값, 그림 주소를 바꿔요'); },
  function(b){ need('set'); return '__set('+er(b)+', '+(G.valueToCode(b,'VALUE',O.COMMA)||"''")+');\n'; });
def('act_append',function(){ this.appendValueInput('VALUE').appendField(elField(),'EL').appendField(T('에')); this.appendDummyInput().appendField(T('덧붙이기')); this.setInputsInline(true); act(this,'글 뒤에 이어 붙여요. 목록이면 항목이 하나 늘어요'); },
  function(b){ need('add'); return '__add('+er(b)+', '+(G.valueToCode(b,'VALUE',O.COMMA)||"''")+');\n'; });
def('act_clear',function(){ this.appendDummyInput().appendField(elField(),'EL').appendField(T('비우기')); act(this,'내용을 모두 지워요'); },
  function(b){ need('set'); var n=er(b); return '__set('+n+', \'\');\n'; });
def('act_style',function(){ this.appendValueInput('VALUE').appendField(elField(),'EL').appendField(T('의')).appendField(new Blockly.FieldDropdown(function(){ return [[T('글자색'),'color'],[T('배경색'),'background']]; }),'PROP').appendField(T('을(를)'));
  this.appendDummyInput().appendField(T('(으)로')); this.setInputsInline(true); act(this,'색을 바꿔요'); },
  function(b){ need('$'); return '$('+er(b)+').style.'+(b.getFieldValue('PROP')==='color'?'color':'background')+' = '+(G.valueToCode(b,'VALUE',O.ASSIGNMENT)||"''")+';\n'; });
def('act_size',function(){ this.appendValueInput('N').setCheck('Number').appendField(elField(),'EL').appendField(T('의')).appendField(new Blockly.FieldDropdown(function(){ return [[T('글자 크기'),'fontSize'],[T('너비'),'width'],[T('높이'),'height'],[T('투명도 %'),'opacity'],[T('회전 각도'),'rotate']]; }),'PROP').appendField(T('을(를)'));
  this.appendDummyInput().appendField(T('(으)로')); this.setInputsInline(true); act(this,'크기, 투명도, 회전을 바꿔요'); },
  function(b){ need('size'); return '__size('+er(b)+', '+lit(b.getFieldValue('PROP'))+', '+(G.valueToCode(b,'N',O.COMMA)||'0')+');\n'; });
def('act_move',function(){ this.appendValueInput('X').setCheck('Number').appendField(elField(),'EL').appendField(T('을(를) 위치')).appendField('x'); this.appendValueInput('Y').setCheck('Number').appendField('y'); this.appendDummyInput().appendField(T('(으)로 옮기기')); this.setInputsInline(true); act(this,'페이지 왼쪽 위에서부터의 위치로 옮겨요'); },
  function(b){ need('move'); return '__move('+er(b)+', '+(G.valueToCode(b,'X',O.COMMA)||'0')+', '+(G.valueToCode(b,'Y',O.COMMA)||'0')+');\n'; });
def('act_show',function(){ this.appendDummyInput().appendField(elField(),'EL').appendField(new Blockly.FieldDropdown(function(){ return [[T('보이기'),'show'],[T('숨기기'),'hide'],[T('보이기/숨기기 바꾸기'),'toggle']]; }),'MODE'); act(this,'보이거나 숨겨요'); },
  function(b){ need('show'); return '__show('+er(b)+', '+lit(b.getFieldValue('MODE'))+');\n'; });
def('act_alert',function(){ this.appendValueInput('VALUE').appendField(T('알림창 띄우기')); act(this,'작은 알림창으로 보여줘요'); },
  function(b){ return 'alert('+(G.valueToCode(b,'VALUE',O.NONE)||"''")+');\n'; });
def('act_after',function(){ this.appendValueInput('SEC').setCheck('Number'); this.appendDummyInput().appendField(T('초 뒤에')); this.appendStatementInput('DO'); this.setInputsInline(true); act(this,'정한 시간이 지난 뒤에 한 번 해요'); },
  function(b){ return 'setTimeout('+AF()+') {\n'+G.statementToCode(b,'DO')+'}, ('+(G.valueToCode(b,'SEC',O.MULTIPLICATION)||'1')+') * 1000);\n'; });
def('act_stop',function(){ this.appendDummyInput().appendField(T('모든 "초마다" 멈추기')); act(this,'초마다 반복을 모두 멈춰요. 이름 붙은 시간 블록도 함께 멈춰요'); },
  function(){ need('timers'); return '__timers.forEach(clearInterval);\nif (typeof __stopAll === \'function\') __stopAll();\n'; });
def('act_restart',function(){ this.appendDummyInput().appendField(T('다시 시작하기')); act(this,'페이지를 처음 상태로 되돌려 처음부터 다시 해요'); },
  function(){ return 'location.reload();\n'; });
def('act_beep',function(){ this.appendValueInput('SEC').setCheck('Number').appendField(T('소리 내기')).appendField(new Blockly.FieldDropdown(function(){ return NOTES.map(function(n){ return [T(n[0]),n[1]]; }); }),'NOTE'); this.appendDummyInput().appendField(T('초')); this.setInputsInline(true); act(this,'삐 소리를 내요'); },
  function(b){ need('beep'); return '__beep('+b.getFieldValue('NOTE')+', '+(G.valueToCode(b,'SEC',O.COMMA)||'0.3')+');\n'; });

/* ---------- sounds: effects and melodies, all made with Web Audio (no sound files) ---------- */
var SFX=[['동전','coin'],['점프','jump'],['펑','boom'],['레이저','laser'],['뿅','pop'],['성공','win'],['실패','lose']];
def('act_sfx',function(){ this.appendDummyInput().appendField(T('효과음')).appendField(new Blockly.FieldDropdown(function(){ return SFX.map(function(s){ return [T(s[0]),s[1]]; }); }),'SFX').appendField(T('내기')); act(this,'게임에 쓰는 짧은 효과음을 내요. 소리 파일 없이 바로 만들어요'); },
  function(b){ need('sfx'); return '__sfx('+lit(b.getFieldValue('SFX'))+');\n'; });
/* notes C3..C6 as "C4", "C#4"; Korean (and other solfège) names are shown next to the letter */
var SOLF=['도','도#','레','레#','미','파','파#','솔','솔#','라','라#','시'], LET=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function noteOpts(){ var o=[[T('쉼표'),'rest']];
  for(var oc=3;oc<=6;oc++) for(var i=0;i<12&&!(oc===6&&i>0);i++){ var s=T(SOLF[i].replace('#',''))+(SOLF[i].indexOf('#')>0?'#':''), c=LET[i]+oc; o.push([s.charAt(0)===c.charAt(0)?c:s+' '+c,c]); }
  return o; }
def('act_note',function(){ this.appendDummyInput().appendField(T('음')).appendField(new Blockly.FieldDropdown(noteOpts),'NOTE')
    .appendField(new Blockly.FieldDropdown(function(){ return [[T('1박'),'1'],[T('2박'),'2'],[T('3박'),'3'],[T('4박'),'4'],[T('반 박'),'0.5'],[T('4분의 1박'),'0.25']]; }),'BEAT').appendField(T('연주하기'));
  this.setFieldValue('C4','NOTE'); act(this,'음을 정한 박자만큼 연주해요. 여러 개를 이어 붙이면 차례로 연주돼서 멜로디가 돼요'); },
  function(b){ need('note'); return '__note('+lit(b.getFieldValue('NOTE'))+', '+b.getFieldValue('BEAT')+');\n'; });
def('act_tempo',function(){ this.appendValueInput('N').setCheck('Number').appendField(T('빠르기를')); this.appendDummyInput().appendField(T('(으)로 정하기 (1분에 박자 수)')); this.setInputsInline(true); act(this,'음 연주하기의 빠르기예요. 1분에 몇 박자를 연주할지 정해요 (처음엔 120)'); },
  function(b){ need('note'); return '__bpm = Math.max(20, Math.min(400, '+(G.valueToCode(b,'N',O.COMMA)||'120')+'));\n'; });
var SNDS={}, BUILTIN=window.BH_BUILTIN_SNDS||{};
function sndOf(n){ return SNDS[n]||BUILTIN[n]; }
function sndField(){ var f=new Blockly.FieldDropdown(function(){ var o=Object.keys(BUILTIN).map(function(n){ return [T(n),n]; }); Object.keys(SNDS).forEach(function(n){ if(!BUILTIN[n]) o.push([n,n]); }); o.push([T('＋ mp3 파일 넣기'),'+']); return o; });
  f.setValidator(function(v){ if(v==='+'){ var me=this; setTimeout(function(){ if(window.BH&&BH.pickSound) BH.pickSound(me); },0); return null; } return v; }); return f; }
def('act_mp3',function(){ this.appendDummyInput().appendField(T('내 소리')).appendField(sndField(),'SND').appendField(new Blockly.FieldDropdown(function(){ return [[T('한 번 재생하기'),'once'],[T('반복해서 재생하기'),'loop']]; }),'LOOP'); this.setFieldValue('기본 노래','SND'); act(this,'소리를 재생해요. 처음엔 기본 노래가 골라져 있고, 목록 맨 아래 mp3 파일 넣기로 내 파일을 골라도 돼요'); },
  function(b){ var n=b.getFieldValue('SND'); if(!sndOf(n)) return ''; USEDS[n]=1; need('mp3'); return '__mp3('+lit(n)+', '+(b.getFieldValue('LOOP')==='loop')+');\n'; });
/* logic gates and condition loops */
var GATES=[['그리고 (AND)','AND'],['또는 (OR)','OR'],['둘 중 하나만 (XOR)','XOR'],['둘 다 아님 (NOR)','NOR'],['둘이 함께는 아님 (NAND)','NAND']];
def('logic_gate',function(){ this.appendValueInput('A').setCheck('Boolean'); this.appendValueInput('B').setCheck('Boolean').appendField(new Blockly.FieldDropdown(function(){ return GATES.map(function(g){ return [T(g[0]),g[1]]; }); }),'GATE'); this.setInputsInline(true); this.setOutput(true,'Boolean'); this.setColour('#5b80a5'); this.setTooltip(T('두 조건을 합쳐요. AND는 둘 다 참, OR은 하나라도 참, XOR은 정확히 하나만 참, NOR은 둘 다 거짓, NAND는 둘 다 참만 아니면 참이에요')); },
  function(b){ var a=G.valueToCode(b,'A',O.NONE)||'false', c=G.valueToCode(b,'B',O.NONE)||'false', g=b.getFieldValue('GATE');
    var js=g==='AND'?'(('+a+') && ('+c+'))':g==='OR'?'(('+a+') || ('+c+'))':g==='XOR'?'(!!('+a+') !== !!('+c+'))':g==='NOR'?'!(('+a+') || ('+c+'))':'!(('+a+') && ('+c+'))'; return [js,O.ATOMIC]; });
def('logic_between',function(){ this.appendValueInput('X').setCheck('Number'); this.appendValueInput('LO').setCheck('Number').appendField(T('이(가)')); this.appendValueInput('HI').setCheck('Number').appendField(T('이상')); this.appendDummyInput().appendField(T('이하 사이에 있나?')); this.setInputsInline(true); this.setOutput(true,'Boolean'); this.setColour('#5b80a5'); this.setTooltip(T('숫자가 두 값 사이(같은 것 포함)에 있으면 참이에요')); },
  function(b){ var x=G.valueToCode(b,'X',O.NONE)||'0', lo=G.valueToCode(b,'LO',O.NONE)||'0', hi=G.valueToCode(b,'HI',O.NONE)||'0'; return ['(('+x+') >= ('+lo+') && ('+x+') <= ('+hi+'))',O.ATOMIC]; });
def('loop_while',function(){ this.appendValueInput('COND').setCheck('Boolean').appendField(T('조건')); this.appendDummyInput().appendField(T('인 동안 반복')); this.appendStatementInput('DO'); this.setInputsInline(true); this.setPreviousStatement(true,'EL'); this.setNextStatement(true,'EL'); this.setColour('#5ba55b'); this.setTooltip(T('조건이 참인 동안 안의 블록을 계속 해요. 조건이 거짓이 되면 멈춰요')); },
  function(b){ var c=G.valueToCode(b,'COND',O.NONE)||'false', body=G.statementToCode(b,'DO'); body=G.addLoopTrap(body,b); return 'while ('+c+') {\n'+body+'}\n'; });
def('loop_dowhile',function(){ this.appendDummyInput().appendField(T('먼저 한 번 하고')); this.appendStatementInput('DO'); this.appendValueInput('COND').setCheck('Boolean').appendField(T('조건')); this.appendDummyInput().appendField(T('인 동안 계속 반복')); this.setInputsInline(false); this.setPreviousStatement(true,'EL'); this.setNextStatement(true,'EL'); this.setColour('#5ba55b'); this.setTooltip(T('안의 블록을 먼저 한 번 하고, 조건이 참이면 계속 반복해요')); },
  function(b){ var c=G.valueToCode(b,'COND',O.NONE)||'false', body=G.statementToCode(b,'DO'); body=G.addLoopTrap(body,b); return 'do {\n'+body+'} while ('+c+');\n'; });
def('act_sound_stop',function(){ this.appendDummyInput().appendField(T('모든 소리 멈추기')); act(this,'나고 있는 소리와 연주할 차례인 음을 모두 멈춰요'); },
  function(){ need('snd'); return '__soundStop();\n'; });

/* ---------- moving around: nudge, follow the cursor, hit test ---------- */
def('act_nudge',function(){ this.appendValueInput('N').setCheck('Number').appendField(elField(),'EL').appendField(T('의')).appendField(new Blockly.FieldDropdown(function(){ return [[T('x좌표(가로)를'),'x'],[T('y좌표(세로)를'),'y']]; }),'AXIS'); this.appendDummyInput().appendField(T('만큼 움직이기')); this.setInputsInline(true); act(this,'지금 있는 곳에서 가로(x)나 세로(y)로 얼마만큼 옮겨요. 마이너스 값이면 반대쪽으로 가요'); },
  function(b){ need('nudge'); var ax=b.getFieldValue('AXIS'), d=G.valueToCode(b,'N',O.COMMA)||'0';
    return '__nudge('+er(b)+', '+(ax==='x'?d+', 0':'0, '+d)+');\n'; });
def('act_nudge2',function(){ this.appendValueInput('DX').setCheck('Number').appendField(elField(),'EL').appendField(T('을(를) 가로')); this.appendValueInput('DY').setCheck('Number').appendField(T('세로')); this.appendDummyInput().appendField(T('만큼 움직이기')); this.setInputsInline(true); act(this,'가로와 세로로 한꺼번에 옮겨요'); },
  function(b){ need('nudge'); return '__nudge('+er(b)+', '+(G.valueToCode(b,'DX',O.COMMA)||'0')+', '+(G.valueToCode(b,'DY',O.COMMA)||'0')+');\n'; });
def('val_where',function(){ this.appendDummyInput().appendField(elField(),'EL').appendField(T('의')).appendField(new Blockly.FieldDropdown(function(){ return [[T('x좌표'),'x'],[T('y좌표'),'y']]; }),'AXIS'); val(this,'Number','페이지 왼쪽 위에서 요소가 얼마나 떨어져 있는지 알려줘요'); },
  function(b){ need('where'); return ['__where('+er(b)+', '+lit(b.getFieldValue('AXIS'))+')',O.FUNCTION_CALL]; });
def('act_follow',function(){ this.appendDummyInput().appendField(elField(null,'hat'),'EL').appendField(T('이(가) 커서 따라다니기')).appendField(new Blockly.FieldDropdown(function(){ return [[T('바로'),'fast'],[T('부드럽게'),'soft'],[T('멈추기'),'stop']]; }),'MODE'); act(this,'마우스나 손가락을 따라 요소가 움직여요. 한 번만 놓으면 계속 따라다녀요'); },
  function(b){ need('follow'); return '__follow('+lit(b.getFieldValue('EL'))+', '+lit(b.getFieldValue('MODE'))+');\n'; });
def('val_cursor',function(){ this.appendDummyInput().appendField(T('커서 위치')).appendField(new Blockly.FieldDropdown([['x','x'],['y','y']]),'AXIS'); val(this,'Number','마우스(손가락)가 있는 곳. 페이지 왼쪽 위에서 얼마나 떨어졌는지 알려줘요'); },
  function(b){ need('cursor'); return [b.getFieldValue('AXIS')==='x'?'__cx':'__cy',O.ATOMIC]; });
function shapeDrop(){ return new Blockly.FieldDropdown(function(){ return [[T('네모로'),'box'],[T('원으로'),'circle']]; }); }
def('val_hit',function(){ this.appendDummyInput().appendField(elField(null,'hit'),'A').appendField(T('와(과)')).appendField(elField(null,'hit'),'B').appendField(T('이(가) 닿았나?')).appendField(shapeDrop(),'MODE'); val(this,'Boolean','두 요소가 겹쳐 있으면 참이에요. "만약"과 함께 써요. 네모는 모서리 상자끼리, 원은 둥글게 재요. "복제본 아무거나"를 고르면 복제본 중 하나라도 닿았을 때 참이에요'); },
  function(b){ need('touch'); return ['__touch('+er(b,'A')+', '+er(b,'B')+', '+lit(b.getFieldValue('MODE')||'box')+')',O.FUNCTION_CALL]; });
def('act_stay',function(){ this.appendDummyInput().appendField(elField(),'EL').appendField(T('화면 안에 가두기')); act(this,'요소가 페이지 밖으로 나가지 않게 해요. 움직이기 블록 뒤에 붙여 써요'); },
  function(b){ need('stay'); return '__stay('+er(b)+');\n'; });

/* ---------- games: touching event, score board, random spot ---------- */
def('ev_hit',function(){ this.appendDummyInput().appendField(elField(null,'evhit'),'A').appendField(T('와(과)')).appendField(elField(null,'evhit'),'B').appendField(T('이(가) 닿으면')).appendField(shapeDrop(),'MODE'); hat(this,'두 요소가 닿는 순간 한 번 해요. 떨어졌다가 다시 닿으면 또 해요. "복제본 아무거나"를 고르면 복제본마다 닿을 때 해요. 안에서 "나(이 복제본)"은 닿은 복제본, "닿은 상대"는 부딪힌 쪽이에요'); },
  function(b){ need('hitev'); return '__onHit('+lit(b.getFieldValue('A'))+', '+lit(b.getFieldValue('B'))+', '+AF()+'__me, __other) {\n'+hatBody(b,true)+'}, '+lit(b.getFieldValue('MODE')||'box')+');\n'; });
def('act_rpos',function(){ this.appendDummyInput().appendField(elField(),'EL').appendField(T('을(를) 화면 아무 곳으로 옮기기')); act(this,'화면 안의 아무 곳으로 옮겨요. 먹이나 별을 새로 놓을 때 좋아요'); },
  function(b){ need('rpos'); return '__rpos('+er(b)+');\n'; });
def('act_score',function(){ this.appendValueInput('N').setCheck('Number').appendField(T('점수를')); this.appendDummyInput().appendField(new Blockly.FieldDropdown(function(){ return [[T('만큼 바꾸기'),'add'],[T('(으)로 정하기'),'set']]; }),'MODE');
  this.setInputsInline(true); act(this,'점수를 더하거나(마이너스면 빼요) 정해요. 화면 오른쪽 위 점수판에 바로 보여요'); },
  function(b){ need('score'); return '__setScore('+(G.valueToCode(b,'N',O.COMMA)||'0')+', '+(b.getFieldValue('MODE')==='add')+');\n'; });
def('act_scoreboard',function(){ this.appendDummyInput().appendField(T('점수판')).appendField(new Blockly.FieldDropdown(function(){ return [[T('보이기'),'show'],[T('숨기기'),'hide']]; }),'MODE'); act(this,'화면 오른쪽 위 점수판을 보이거나 숨겨요. 점수 블록을 쓰면 처음부터 보여요'); },
  function(b){ need('score'); return '__scoreBoard().style.display = '+(b.getFieldValue('MODE')==='hide'?"'none'":"''")+';\n'; });
def('val_score',function(){ this.appendDummyInput().appendField(T('점수')); val(this,'Number','지금 점수'); },
  function(){ need('score'); return ['__score',O.ATOMIC]; });

/* ---------- values ---------- */
function val(b,check,tip){ b.setOutput(true,check||null); b.setColour(C.val); if(tip) b.setTooltip(T(tip)); }
def('val_get',function(){ this.appendDummyInput().appendField(elField(),'EL').appendField(T('의')).appendField(new Blockly.FieldDropdown(function(){ return [[T('내용'),'text'],[T('숫자'),'num'],[T('너비'),'width'],[T('높이'),'height']]; }),'PROP'); val(this,null,'글자나 입력칸에 쓴 값을 가져와요. 숫자로 계산하려면 "숫자"를 골라요'); },
  function(b){ var n=er(b), p=b.getFieldValue('PROP');
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

/* ---------- save / log / distance / drag ---------- */
def('act_store',function(){ this.appendValueInput('NAME').appendField(T('저장하기')).appendField(T('이름')); this.appendValueInput('VALUE').appendField(T('값')); this.setInputsInline(true); act(this,'이름을 붙여 값을 저장해요. 받은 HTML 파일에서는 다시 열어도 남아 있어요 (미리보기는 다시 실행하면 사라져요)'); },
  function(b){ need('store'); return '__save('+(G.valueToCode(b,'NAME',O.COMMA)||"'save'")+', '+(G.valueToCode(b,'VALUE',O.COMMA)||"''")+');\n'; });
def('val_load',function(){ this.appendValueInput('NAME').appendField(T('불러오기')).appendField(T('이름')); this.appendValueInput('DEF').appendField(T('없으면')); this.setInputsInline(true); val(this,null,'저장해 둔 값을 가져와요. 저장한 적이 없으면 "없으면" 값을 써요'); },
  function(b){ need('store'); return ['__load('+(G.valueToCode(b,'NAME',O.COMMA)||"'save'")+', '+(G.valueToCode(b,'DEF',O.COMMA)||'0')+')',O.FUNCTION_CALL]; });
def('act_log',function(){ this.appendValueInput('VALUE').appendField(T('로그에 남기기')); act(this,'미리보기 아래 로그 칸에 값을 적어요. 어디서 틀렸는지 찾을 때 좋아요'); },
  function(b){ return 'console.log('+(G.valueToCode(b,'VALUE',O.NONE)||"''")+');\n'; });
def('val_dist',function(){ this.appendValueInput('X1').setCheck('Number').appendField(T('거리')).appendField('x1'); this.appendValueInput('Y1').setCheck('Number').appendField('y1'); this.appendValueInput('X2').setCheck('Number').appendField('x2'); this.appendValueInput('Y2').setCheck('Number').appendField('y2'); this.setInputsInline(true); val(this,'Number','두 점 사이의 거리. 거리가 두 반지름의 합보다 작으면 부딪힌 거예요'); },
  function(b){ need('dist'); return ['__dist('+[v(b,'X1','0'),v(b,'Y1','0'),v(b,'X2','0'),v(b,'Y2','0')].join(', ')+')',O.FUNCTION_CALL]; });
def('val_today',function(){ this.appendDummyInput().appendField(T('오늘')).appendField(new Blockly.FieldDropdown(function(){ return [[T('날짜 글자'),'date'],[T('시각 글자'),'time'],[T('년'),'year'],[T('월 (1~12)'),'month']]; }),'U'); val(this,null,'오늘 날짜나 지금 시각'); },
  function(b){ var u=b.getFieldValue('U'), m={date:'new Date().toLocaleDateString()',time:'new Date().toLocaleTimeString()',year:'new Date().getFullYear()',month:'(new Date().getMonth() + 1)'}; return [m[u]||m.date,u==='month'?O.ATOMIC:O.FUNCTION_CALL]; });
def('ev_drag',function(){ this.appendDummyInput().appendField(elField(null,'hat'),'EL').appendField(T('을(를) 누른 채 움직이면')); hat(this,'마우스를 누른 채, 또는 손가락으로 짚고 움직이는 동안 계속 해요. "누른 위치"를 함께 써요'); },
  function(b){ var n=lit(b.getFieldValue('EL')); need('$'); need('pos');
    return '$('+n+').style.touchAction = \'none\';\n$('+n+').addEventListener(\'pointermove\', '+AF()+'e) {\n  if (!e.buttons) return;\n  __pos(e, this);\n'+hatBody(b,true)+'});\n'; });

/* ---------- clones: copies of an element that each run their own script ---------- */
C.clone='#7c5cd6'; C.tile='#a16207';
function cl(b,tip){ act(b,tip); b.setColour(C.clone); }
def('ev_clone',function(){ this.appendDummyInput().appendField(elField(null,'hat'),'EL').appendField(T('의 복제본으로 시작하면')); hat(this,'복제본이 만들어질 때마다, 그 복제본이 따로 이 안의 블록을 한 번 해요. 안에서 "나(이 복제본)"을 고르면 그 복제본만 움직여요'); },
  function(b){ need('clones'); return '__onClone('+lit(b.getFieldValue('EL'))+', '+AF()+'__me) {\n'+hatBody(b)+'});\n'; });
def('clone_make',function(){ this.appendDummyInput().appendField(elField(null,'hat'),'EL').appendField(T('의 복제본 만들기')); cl(this,'요소를 똑같이 복사해 새로 만들어요. 처음엔 원래 요소 자리에 겹쳐 있어요. 원본을 숨겨 두고 복제본만 보여 줄 수도 있어요 (복제본은 500개까지)'); },
  function(b){ need('clones'); return '__clone('+lit(b.getFieldValue('EL'))+');\n'; });
def('clone_make_at',function(){ this.appendValueInput('X').setCheck('Number').appendField(elField(null,'hat'),'EL').appendField(T('의 복제본을 위치')).appendField('x'); this.appendValueInput('Y').setCheck('Number').appendField('y'); this.appendDummyInput().appendField(T('에 만들기')); this.setInputsInline(true); cl(this,'복제본을 정한 위치에 바로 만들어요 (페이지 왼쪽 위에서부터의 위치)'); },
  function(b){ need('clones'); return '__clone('+lit(b.getFieldValue('EL'))+', '+v(b,'X','0')+', '+v(b,'Y','0')+');\n'; });
def('clone_del',function(){ this.appendDummyInput().appendField(elField(null,'del'),'EL').appendField(T('지우기')); cl(this,'복제본을 지워요. 복제본이 아닌 원래 요소는 지워지지 않아요. 지운 복제본의 "초마다" 블록도 함께 멈춰요'); },
  function(b){ need('clones'); return '__unclone('+er(b)+');\n'; });
def('clone_delall',function(){ this.appendDummyInput().appendField(elField(null,'hat'),'EL').appendField(T('의 복제본 모두 지우기')); cl(this,'만들어 둔 복제본을 한꺼번에 지워요'); },
  function(b){ need('clones'); return '__uncloneAll('+lit(b.getFieldValue('EL'))+');\n'; });
def('clone_fwd',function(){ this.appendValueInput('N').setCheck('Number').appendField(elField(),'EL').appendField(T('을(를) 보는 방향으로')); this.appendDummyInput().appendField(T('만큼 가기')); this.setInputsInline(true); cl(this,'방향(도) 쪽으로 정한 만큼 나아가요. 방향은 0이 오른쪽, 90이 아래, 180이 왼쪽, 270이 위예요'); },
  function(b){ need('clones'); return '__fwd('+er(b)+', '+v(b,'N','0')+');\n'; });
def('clone_dir',function(){ this.appendValueInput('N').setCheck('Number').appendField(elField(),'EL').appendField(T('의 방향을')); this.appendDummyInput().appendField(T('도')).appendField(new Blockly.FieldDropdown(function(){ return [[T('로 정하기'),'set'],[T('만큼 돌리기'),'turn']]; }),'MODE'); this.setInputsInline(true); cl(this,'가는 방향을 정해요. 0이 오른쪽, 90이 아래, 180이 왼쪽, 270이 위예요 (눈에 보이는 모양은 그대로예요)'); },
  function(b){ need('clones'); return '__dir('+er(b)+', '+v(b,'N','0')+', '+(b.getFieldValue('MODE')==='turn')+');\n'; });
def('clone_face',function(){ this.appendValueInput('X').setCheck('Number').appendField(elField(),'EL').appendField(T('이(가) 위치')).appendField('x'); this.appendValueInput('Y').setCheck('Number').appendField('y'); this.appendDummyInput().appendField(T('쪽으로 방향 맞추기')); this.setInputsInline(true); cl(this,'그 위치를 향하도록 방향을 정해요. 커서 위치를 넣으면 커서 쪽으로 가요'); },
  function(b){ need('clones'); return '__face('+er(b)+', '+v(b,'X','0')+', '+v(b,'Y','0')+');\n'; });
def('clone_setv',function(){ this.appendValueInput('V').appendField(elField(),'EL').appendField(T('의 값')).appendField(new Blockly.FieldTextInput(T('체력')),'K').appendField(T('을(를)')); this.appendDummyInput().appendField(T('(으)로 정하기')); this.setInputsInline(true); cl(this,'요소마다 따로 가지는 값이에요. 복제본마다 값이 달라서 체력이나 속도를 따로 둘 수 있어요'); },
  function(b){ need('clones'); return '__vset('+er(b)+', '+lit(b.getFieldValue('K'))+', '+v(b,'V','0')+');\n'; });
def('clone_getv',function(){ this.appendDummyInput().appendField(elField(),'EL').appendField(T('의 값')).appendField(new Blockly.FieldTextInput(T('체력')),'K'); val(this,null,'요소마다 따로 가진 값이에요. 정한 적이 없으면 0이에요'); this.setColour(C.clone); },
  function(b){ need('clones'); return ['__vget('+er(b)+', '+lit(b.getFieldValue('K'))+')',O.FUNCTION_CALL]; });
def('clone_getdir',function(){ this.appendDummyInput().appendField(elField(),'EL').appendField(T('의 방향(도)')); val(this,'Number','가는 방향이에요. 0이 오른쪽, 90이 아래'); this.setColour(C.clone); },
  function(b){ need('clones'); return ['__getdir('+er(b)+')',O.FUNCTION_CALL]; });
def('clone_count',function(){ this.appendDummyInput().appendField(elField(null,'hat'),'EL').appendField(T('의 복제본 수')); val(this,'Number','지금 있는 복제본이 몇 개인지 알려줘요'); this.setColour(C.clone); },
  function(b){ need('clones'); return ['__ccountOf('+lit(b.getFieldValue('EL'))+')',O.FUNCTION_CALL]; });
def('clone_out',function(){ this.appendDummyInput().appendField(elField(),'EL').appendField(T('이(가) 화면 밖에 나갔나?')); val(this,'Boolean','요소가 화면 밖으로 나가 보이지 않으면 참이에요. 총알을 지울 때 써요'); this.setColour(C.clone); },
  function(b){ need('clones'); return ['__out('+er(b)+')',O.FUNCTION_CALL]; });

/* ---------- time: do something later or again and again, with a name so it can be stopped ---------- */
function tm(b,tip){ act(b,tip); b.setColour('#3a6fd8'); }
/* a time block inside a "복제본으로 시작하면" script belongs to that clone and stops when the clone is deleted; anywhere else it belongs to the page */
function owner(b){ var r=b.getRootBlock(); if(r&&r.type==='ev_clone'){ need('me'); return '__me'; } return 'null'; }
function nameIn(def){ return new Blockly.FieldTextInput(def); }
def('time_after',function(){ this.appendValueInput('SEC').setCheck('Number'); this.appendDummyInput().appendField(T('초 뒤에 한 번 하기')).appendField(T('이름')).appendField(nameIn(T('알람')),'NAME'); this.appendStatementInput('DO'); this.setInputsInline(true); tm(this,'정한 시간이 지난 뒤에 한 번 해요. 같은 이름으로 다시 시작하면 처음부터 다시 세요. "멈추기"로 취소할 수 있어요'); },
  function(b){ need('sched'); return '__sched('+lit(b.getFieldValue('NAME'))+', '+v(b,'SEC','1')+', '+AF()+') {\n'+G.statementToCode(b,'DO')+'}, false, '+owner(b)+');\n'; });
def('time_every',function(){ this.appendValueInput('SEC').setCheck('Number'); this.appendDummyInput().appendField(T('초마다 계속 하기')).appendField(T('이름')).appendField(nameIn(T('반복')),'NAME'); this.appendStatementInput('DO'); this.setInputsInline(true); tm(this,'정한 시간마다 계속 해요. 같은 이름으로 다시 시작하면 처음부터 다시 세요. "멈추기"로 그만둘 수 있어요. 복제본 안에서 쓰면 복제본을 지울 때 함께 멈춰요'); },
  function(b){ need('sched'); return '__sched('+lit(b.getFieldValue('NAME'))+', '+v(b,'SEC','1')+', '+AF()+') {\n'+G.statementToCode(b,'DO')+'}, true, '+owner(b)+');\n'; });
def('time_stop',function(){ this.appendDummyInput().appendField(nameIn(T('반복')),'NAME').appendField(T('이름의 시간 블록 멈추기')); tm(this,'이름이 같은 "뒤에 한 번"이나 "마다 계속" 블록을 멈춰요'); },
  function(b){ need('sched'); return '__unsched('+lit(b.getFieldValue('NAME'))+', '+owner(b)+');\n'; });
def('time_stopall',function(){ this.appendDummyInput().appendField(T('시간 블록 모두 멈추기')); tm(this,'"뒤에 한 번"과 "마다 계속"으로 시작한 것을 모두 멈춰요'); },
  function(){ need('sched'); return '__stopAll();\n'; });

/* ---------- tile map: a grid of cells on a canvas, walls and blocked movement ---------- */
function tl(b,tip){ act(b,tip); b.setColour(C.tile); }
function mapIn(){ return new Blockly.FieldTextInput(T('지도')+'1'); }
def('tile_make',function(){ this.appendDummyInput().appendField(elField(CV),'EL').appendField(T('에 타일맵')).appendField(mapIn(),'M').appendField(T('만들기')); this.appendValueInput('C').setCheck('Number').appendField(T('가로 칸')); this.appendValueInput('R').setCheck('Number').appendField(T('세로 칸')); this.appendValueInput('S').setCheck('Number').appendField(T('칸 크기')); this.setInputsInline(true); tl(this,'그림판 위에 칸(타일)으로 된 지도를 만들어요. 처음엔 모든 칸이 0(빈칸)이고, 1번 칸은 벽이에요'); },
  function(b){ need('tile'); return '__tmake('+lit(b.getFieldValue('EL'))+', '+lit(b.getFieldValue('M'))+', '+v(b,'C','10')+', '+v(b,'R','8')+', '+v(b,'S','32')+');\n'; });
def('tile_set',function(){ this.appendValueInput('C').setCheck('Number').appendField(mapIn(),'M').appendField(T('의 칸')).appendField(T('가로')); this.appendValueInput('R').setCheck('Number').appendField(T('세로')); this.appendValueInput('V').setCheck('Number').appendField(T('을(를)')); this.appendDummyInput().appendField(T('번 타일로 바꾸기')); this.setInputsInline(true); tl(this,'칸 하나를 바꿔요. 칸 번호는 0부터 세요. 0은 빈칸, 1은 벽, 2부터는 색깔 칸이에요'); },
  function(b){ need('tile'); return '__tset('+lit(b.getFieldValue('M'))+', '+v(b,'C','0')+', '+v(b,'R','0')+', '+v(b,'V','1')+');\n'; });
def('tile_fill',function(){ this.appendValueInput('V').setCheck('Number').appendField(mapIn(),'M').appendField(new Blockly.FieldDropdown(function(){ return [[T('전체를'),'all'],[T('가장자리 테두리를'),'border']]; }),'MODE'); this.appendDummyInput().appendField(T('번 타일로 채우기')); this.setInputsInline(true); tl(this,'지도 전체나 가장자리 한 줄을 한꺼번에 채워요. 가장자리를 1(벽)로 하면 상자 모양 방이 돼요'); },
  function(b){ need('tile'); return '__tfill('+lit(b.getFieldValue('M'))+', '+lit(b.getFieldValue('MODE'))+', '+v(b,'V','1')+');\n'; });
def('tile_color',function(){ this.appendValueInput('V').setCheck('Number').appendField(mapIn(),'M').appendField(T('의')); this.appendValueInput('COLOR').appendField(T('번 타일 색을')); this.appendDummyInput().appendField(T('(으)로')); this.setInputsInline(true); tl(this,'번호마다 칠할 색을 정해요. 정하지 않으면 1번은 회색, 2번 초록, 3번 노랑처럼 정해진 색이에요'); },
  function(b){ need('tile'); return '__tcolor('+lit(b.getFieldValue('M'))+', '+v(b,'V','1')+', '+v(b,'COLOR',"'#475569'")+');\n'; });
def('tile_solid',function(){ this.appendValueInput('V').setCheck('Number').appendField(mapIn(),'M').appendField(T('의')); this.appendDummyInput().appendField(T('번 타일을')).appendField(new Blockly.FieldDropdown(function(){ return [[T('벽으로 하기'),'1'],[T('벽이 아니게 하기'),'0']]; }),'ON'); this.setInputsInline(true); tl(this,'어떤 번호의 칸을 벽으로 칠지 정해요. 처음엔 1번만 벽이에요'); },
  function(b){ need('tile'); return '__tsolidSet('+lit(b.getFieldValue('M'))+', '+v(b,'V','1')+', '+(b.getFieldValue('ON')==='1')+');\n'; });
def('tile_draw',function(){ this.appendDummyInput().appendField(mapIn(),'M').appendField(T('그리기')); tl(this,'지도를 그림판에 그려요. 먼저 그림판을 지운 뒤 지도를 그리고, 그 위에 다른 것을 그려요'); },
  function(b){ need('tile'); return '__tdraw('+lit(b.getFieldValue('M'))+');\n'; });
def('tile_move',function(){ this.appendValueInput('DX').setCheck('Number').appendField(elField(null,'hat'),'EL').appendField(T('을(를)')).appendField(mapIn(),'M').appendField(T('의 벽에 막히며 가로')); this.appendValueInput('DY').setCheck('Number').appendField(T('세로')); this.appendDummyInput().appendField(T('만큼 움직이기')); this.setInputsInline(true); tl(this,'벽이 있으면 그 앞에서 멈추며 움직여요. 움직일 요소는 그림판 위에 놓여 있어야 해요. 거리는 그림판 기준 점(픽셀)이에요'); },
  function(b){ need('tile'); need('nudge'); return '__tmove('+lit(b.getFieldValue('EL'))+', '+lit(b.getFieldValue('M'))+', '+v(b,'DX','0')+', '+v(b,'DY','0')+');\n'; });
function tv(type,build,tip,out,gen){ def(type,function(){ build.call(this); val(this,out,tip); this.setColour(C.tile); },gen); }
tv('tile_get',function(){ this.appendValueInput('C').setCheck('Number').appendField(mapIn(),'M').appendField(T('의 칸')).appendField(T('가로')); this.appendValueInput('R').setCheck('Number').appendField(T('세로')); this.appendDummyInput().appendField(T('의 타일 번호')); this.setInputsInline(true); },'칸의 번호예요. 지도 밖은 0이에요','Number',
  function(b){ need('tile'); return ['__tget('+lit(b.getFieldValue('M'))+', '+v(b,'C','0')+', '+v(b,'R','0')+')',O.FUNCTION_CALL]; });
tv('tile_wall',function(){ this.appendValueInput('X').setCheck('Number').appendField(mapIn(),'M').appendField(T('에서 위치')).appendField('x'); this.appendValueInput('Y').setCheck('Number').appendField('y'); this.appendDummyInput().appendField(T('에 벽이 있나?')); this.setInputsInline(true); },'그림판 위의 한 점이 벽 칸 안에 있으면 참이에요. 지도 밖도 벽으로 쳐요','Boolean',
  function(b){ need('tile'); return ['__twall('+lit(b.getFieldValue('M'))+', '+v(b,'X','0')+', '+v(b,'Y','0')+')',O.FUNCTION_CALL]; });
tv('tile_cell',function(){ this.appendValueInput('N').setCheck('Number').appendField(mapIn(),'M').appendField(T('에서 위치')); this.appendDummyInput().appendField(T('이 몇 번째 칸인가')); this.setInputsInline(true); },'그림판 위의 위치(점)를 칸 번호로 바꿔요. 가로(x)도 세로(y)도 같은 식이에요. 0부터 세요','Number',
  function(b){ need('tile'); return ['__tcell('+lit(b.getFieldValue('M'))+', '+v(b,'N','0')+')',O.FUNCTION_CALL]; });
tv('tile_touch',function(){ this.appendDummyInput().appendField(elField(null,'hat'),'EL').appendField(T('이(가)')).appendField(mapIn(),'M').appendField(T('의 벽에 닿았나?')); },'요소가 벽 칸과 겹쳐 있으면 참이에요','Boolean',
  function(b){ need('tile'); return ['__ttouch('+lit(b.getFieldValue('EL'))+', '+lit(b.getFieldValue('M'))+')',O.FUNCTION_CALL]; });
tv('tile_blocked',function(){ this.appendDummyInput().appendField(T('방금 움직임이 벽에 막혔나?')); },'바로 앞의 "벽에 막히며 움직이기"가 벽 때문에 멈췄으면 참이에요','Boolean',
  function(){ need('tile'); return ['__tbl',O.ATOMIC]; });

/* ---------- best score: kept in the browser, one set per project ---------- */
function bs(b,tip){ act(b,tip); b.setColour('#8e6bbf'); }
function bestIn(){ return new Blockly.FieldTextInput(T('최고 점수')); }
def('act_best',function(){ this.appendValueInput('N').setCheck('Number').appendField(bestIn(),'NAME').appendField(T('기록하기 (더 높을 때만 저장) 점수')); this.setInputsInline(true); bs(this,'저장해 둔 값보다 높을 때만 새로 저장해요. 점수판이 보이고 있으면 바로 바뀌어요'); },
  function(b){ need('best'); return '__best('+lit(b.getFieldValue('NAME'))+', '+v(b,'N','0')+');\n'; });
def('val_best',function(){ this.appendDummyInput().appendField(T('저장된')).appendField(bestIn(),'NAME'); val(this,'Number','저장해 둔 최고 점수예요. 아직 없으면 0이에요'); this.setColour('#8e6bbf'); },
  function(b){ need('best'); return ['__bestOf('+lit(b.getFieldValue('NAME'))+')',O.FUNCTION_CALL]; });
def('act_bestboard',function(){ this.appendDummyInput().appendField(bestIn(),'NAME').appendField(T('점수판')).appendField(new Blockly.FieldDropdown(function(){ return [[T('보이기'),'show'],[T('숨기기'),'hide']]; }),'MODE'); bs(this,'화면 오른쪽 위 점수판 아래에 저장된 최고 점수를 보여 줘요'); },
  function(b){ need('best'); return '__bestBoardSet('+lit(b.getFieldValue('NAME'))+', '+(b.getFieldValue('MODE')==='show')+');\n'; });
def('act_bestreset',function(){ this.appendDummyInput().appendField(bestIn(),'NAME').appendField(T('지우기 (0으로)')); bs(this,'저장해 둔 최고 점수를 0으로 되돌려요'); },
  function(b){ need('best'); return '__bestReset('+lit(b.getFieldValue('NAME'))+');\n'; });

/* ---------- more canvas drawing ---------- */
drawB('draw_fill','전체를 칠하기',[['COLOR','색']],'그림판 전체를 한 가지 색으로 칠해요 (배경 만들기)',function(b){ need('draw'); return '__fill('+lit(b.getFieldValue('EL'))+', '+v(b,'COLOR',"'#ffffff'")+');\n'; });
drawB('draw_width','의 선 굵기를 정하기',[['N','굵기','Number']],'선과 빈 도형의 굵기를 정해요 (처음엔 3)',function(b){ need('draw'); return '__width('+lit(b.getFieldValue('EL'))+', '+v(b,'N','3')+');\n'; });
drawB('draw_fsize','의 글자 크기를 정하기',[['N','크기','Number']],'그림판에 쓰는 글자 크기를 정해요 (처음엔 20)',function(b){ need('draw'); return '__fsize('+lit(b.getFieldValue('EL'))+', '+v(b,'N','20')+');\n'; });
drawB('draw_orect','에 빈 네모',[['X','x','Number'],['Y','y','Number'],['W','너비','Number'],['H','높이','Number'],['COLOR','색']],'속이 빈 네모 테두리를 그려요. 굵기는 "선 굵기 정하기"로 바꿔요',
  function(b){ need('draw'); return '__orect('+[lit(b.getFieldValue('EL')),v(b,'X','0'),v(b,'Y','0'),v(b,'W','10'),v(b,'H','10'),v(b,'COLOR',"'#000'")].join(', ')+');\n'; });
drawB('draw_ocircle','에 빈 원',[['X','x','Number'],['Y','y','Number'],['R','반지름','Number'],['COLOR','색']],'속이 빈 원 테두리를 그려요 (x, y는 가운데)',
  function(b){ need('draw'); return '__ocircle('+[lit(b.getFieldValue('EL')),v(b,'X','0'),v(b,'Y','0'),v(b,'R','10'),v(b,'COLOR',"'#000'")].join(', ')+');\n'; });

/* ---------- raw JavaScript ---------- */
def('js_raw',function(){ this.appendDummyInput().appendField('JS').appendField(new Blockly.FieldTextInput('console.log("hi");'),'CODE'); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(C.js); this.setTooltip(T('자바스크립트 한 줄을 직접 써요')); },
  function(b){ return b.getFieldValue('CODE')+'\n'; });
def('js_val',function(){ this.appendDummyInput().appendField('JS').appendField(new Blockly.FieldTextInput('Math.PI'),'CODE'); val(this,null,'자바스크립트 식을 직접 써요'); this.setColour(C.js); },
  function(b){ return ['('+b.getFieldValue('CODE')+')',O.ATOMIC]; });

/* ---------- helpers that go into the page, only the ones used ---------- */
var HELP={
  '$':"function $(name) {\n  if (name && name.nodeType) return name;\n  var el = document.getElementById(name);\n  if (!el) throw new Error('\"' + name + '\" "+T('요소가 없어요').replace(/'/g,"\\'")+"');\n  return el;\n}",
  get:"function __get(name) {\n  var el = $(name);\n  return el.tagName === 'INPUT' ? el.value : el.textContent;\n}\nfunction __num(x) {\n  var n = parseFloat(x);\n  return isNaN(n) ? 0 : n;\n}",
  set:"function __set(name, value) {\n  var el = $(name);\n  if (el.tagName === 'INPUT') el.value = value;\n  else if (el.tagName === 'IMG') el.src = value;\n  else if (el.tagName === 'CANVAS') el.getContext('2d').clearRect(0, 0, el.width, el.height);\n  else el.textContent = value;\n}",
  add:"function __add(name, value) {\n  var el = $(name);\n  if (el.tagName === 'UL') {\n    var li = document.createElement('li');\n    li.textContent = value;\n    el.appendChild(li);\n  } else if (el.tagName === 'INPUT') el.value += value;\n  else el.textContent += value;\n}",
  size:"function __size(name, prop, v) {\n  var s = $(name).style;\n  if (prop === 'opacity') s.opacity = v / 100;\n  else if (prop === 'rotate') s.transform = 'rotate(' + v + 'deg)';\n  else s[prop] = v + 'px';\n}",
  move:"function __move(name, x, y) {\n  var s = $(name).style;\n  s.position = 'absolute';\n  s.left = x + 'px';\n  s.top = y + 'px';\n}",
  show:"function __show(name, mode) {\n  var el = $(name);\n  if (mode === 'toggle') mode = el.style.display === 'none' ? 'show' : 'hide';\n  el.style.display = mode === 'hide' ? 'none' : '';\n}",
  pos:"var __mx = 0, __my = 0;\nfunction __pos(e, el) {\n  var r = el.getBoundingClientRect();\n  __mx = Math.round((e.clientX - r.left) * (el.width ? el.width / r.width : 1));\n  __my = Math.round((e.clientY - r.top) * (el.height ? el.height / r.height : 1));\n}",
  dist:"function __dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }",
  nudge:"function __nudge(name, dx, dy) {\n  var el = $(name), s = el.style;\n  if (s.position !== 'absolute') {\n    var r = el.getBoundingClientRect();\n    s.position = 'absolute';\n    s.left = (r.left + window.pageXOffset) + 'px';\n    s.top = (r.top + window.pageYOffset) + 'px';\n  }\n  s.left = ((parseFloat(s.left) || 0) + dx) + 'px';\n  s.top = ((parseFloat(s.top) || 0) + dy) + 'px';\n}",
  where:"function __where(name, axis) {\n  var r = $(name).getBoundingClientRect();\n  return Math.round(axis === 'x' ? r.left + window.pageXOffset : r.top + window.pageYOffset);\n}",
  hit:"function __hit(a, b) {\n  var p = $(a).getBoundingClientRect(), q = $(b).getBoundingClientRect();\n  if (!p.width || !q.width) return false;\n  return p.left < q.right && p.right > q.left && p.top < q.bottom && p.bottom > q.top;\n}",
  stay:"function __stay(name) {\n  var el = $(name), s = el.style, d = document.documentElement;\n  if (s.position !== 'absolute') return;\n  var x = Math.max(0, Math.min(parseFloat(s.left) || 0, d.clientWidth - el.offsetWidth));\n  var y = Math.max(0, Math.min(parseFloat(s.top) || 0, d.clientHeight - el.offsetHeight));\n  s.left = x + 'px';\n  s.top = y + 'px';\n}",
  cursor:"var __cx = 0, __cy = 0;\nfunction __track(e) {\n  __cx = Math.round(e.pageX);\n  __cy = Math.round(e.pageY);\n}\ndocument.addEventListener('pointermove', __track);\ndocument.addEventListener('pointerdown', __track);",
  follow:"var __fol = {}, __folOn = false, __moved = false;\ndocument.addEventListener('pointermove', function () { __moved = true; });\ndocument.addEventListener('pointerdown', function () { __moved = true; });\nfunction __folLoop() {\n  for (var n in __fol) {\n    var el = document.getElementById(n);\n    if (!el) { delete __fol[n]; continue; }\n    if (!__moved) continue;\n    var s = el.style, tx = __cx - el.offsetWidth / 2, ty = __cy - el.offsetHeight / 2;\n    if (s.position !== 'absolute') {\n      var r = el.getBoundingClientRect();\n      s.position = 'absolute';\n      s.left = (r.left + window.pageXOffset) + 'px';\n      s.top = (r.top + window.pageYOffset) + 'px';\n    }\n    var x = parseFloat(s.left) || 0, y = parseFloat(s.top) || 0, k = __fol[n] === 'soft' ? 0.15 : 1;\n    s.left = (x + (tx - x) * k) + 'px';\n    s.top = (y + (ty - y) * k) + 'px';\n    s.pointerEvents = 'none';\n  }\n  requestAnimationFrame(__folLoop);\n}\nfunction __follow(name, mode) {\n  if (mode === 'stop') {\n    delete __fol[name];\n    var e = document.getElementById(name);\n    if (e) e.style.pointerEvents = '';\n    return;\n  }\n  $(name);\n  __fol[name] = mode;\n  document.body.style.touchAction = 'none';\n  if (!__folOn) { __folOn = true; __folLoop(); }\n}",
  key:"var __key = '';",
  keyhold:"var __down = {};\nfunction __keyHold(match, fn) {\n  var id = null;\n  function stop() { if (id) { clearInterval(id); id = null; } }\n  document.addEventListener('keydown', function (e) {\n    __key = e.key;\n    __down[e.key.toLowerCase()] = e;\n    if (e.repeat || id || !match(e)) return;\n    fn(e);\n    id = setInterval(function () { fn(e); }, 30);\n  });\n  document.addEventListener('keyup', function (e) {\n    delete __down[e.key.toLowerCase()];\n    if (id && !Object.keys(__down).some(function (k) { return match(__down[k]); })) stop();\n  });\n  window.addEventListener('blur', function () { __down = {}; stop(); });\n}",
  mp3:"var __auds = [];\nfunction __mp3(name, loop) {\n  var a = new Audio(__mp3s[name]);\n  a.loop = !!loop;\n  __auds.push(a);\n  a.addEventListener('ended', function () { var i = __auds.indexOf(a); if (i >= 0) __auds.splice(i, 1); });\n  var p = a.play();\n  if (p && p.catch) p.catch(function () {});\n}",
  timers:"var __timers = [];",
  beep:"function __beep(freq, sec) {\n  __snd();\n  __tone(freq, __audio.currentTime, sec, 'sine', 0.2);\n}",
  snd:"var __audio, __sndBus = null;\nfunction __snd() {\n  if (!__audio) {\n    __audio = new (window.AudioContext || window.webkitAudioContext)();\n    ['pointerdown', 'keydown'].forEach(function (k) { document.addEventListener(k, function () { if (__audio.state === 'suspended') __audio.resume(); }); });\n  }\n  if (__audio.state === 'suspended') __audio.resume();\n  if (!__sndBus) { __sndBus = __audio.createGain(); __sndBus.connect(__audio.destination); }\n  return __sndBus;\n}\nfunction __tone(freq, t, sec, type, vol, to, hold) {\n  var o = __audio.createOscillator(), g = __audio.createGain();\n  o.type = type;\n  o.frequency.setValueAtTime(freq, t);\n  if (to) o.frequency.exponentialRampToValueAtTime(to, t + sec);\n  g.gain.setValueAtTime(vol, t);\n  if (hold) g.gain.setValueAtTime(vol, t + sec * hold);\n  g.gain.exponentialRampToValueAtTime(0.001, t + sec);\n  o.connect(g); g.connect(__snd());\n  o.start(t); o.stop(t + sec + 0.02);\n}\nfunction __soundStop() {\n  if (typeof __auds !== 'undefined') __auds.splice(0).forEach(function (a) { a.pause(); });\n  if (__sndBus) { __sndBus.disconnect(); __sndBus = null; }\n  __noteT = 0;\n}\nvar __noteT = 0, __bpm = 120;",
  sfx:"function __sfx(k) {\n  __snd();\n  var t = __audio.currentTime;\n  if (k === 'coin') { __tone(988, t, 0.08, 'square', 0.1); __tone(1319, t + 0.08, 0.3, 'square', 0.1); }\n  else if (k === 'jump') __tone(260, t, 0.25, 'square', 0.1, 820);\n  else if (k === 'laser') __tone(1500, t, 0.22, 'sawtooth', 0.08, 120);\n  else if (k === 'pop') __tone(500, t, 0.09, 'sine', 0.3, 1100);\n  else if (k === 'win') [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { __tone(f, t + i * 0.1, 0.3, 'triangle', 0.22); });\n  else if (k === 'lose') [392, 349.23, 311.13, 261.63].forEach(function (f, i) { __tone(f, t + i * 0.18, 0.3, 'sawtooth', 0.08, 0, 0.6); });\n  else if (k === 'boom') {\n    var n = __audio.createBuffer(1, Math.round(__audio.sampleRate * 0.6), __audio.sampleRate), d = n.getChannelData(0);\n    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);\n    var s = __audio.createBufferSource(), f = __audio.createBiquadFilter();\n    s.buffer = n; f.type = 'lowpass'; f.frequency.value = 900;\n    s.connect(f); f.connect(__snd());\n    s.start(t);\n  }\n}",
  note:"function __note(n, beats) {\n  __snd();\n  var m = /^([A-G])(#?)(\\d)$/.exec(n), t = Math.max(__audio.currentTime, __noteT), sec = beats * 60 / __bpm;\n  if (m) __tone(440 * Math.pow(2, ('C D EF G A B'.indexOf(m[1]) + (m[2] ? 1 : 0) - 9) / 12 + (m[3] - 4)), t, sec * 0.95, 'triangle', 0.25, 0, 0.6);\n  __noteT = t + sec;\n}",
  rpos:"function __rpos(name) {\n  var el = $(name), s = el.style, d = document.documentElement;\n  s.position = 'absolute';\n  var c = getComputedStyle(el), w = el.offsetWidth + parseFloat(c.marginLeft) + parseFloat(c.marginRight), h = el.offsetHeight + parseFloat(c.marginTop) + parseFloat(c.marginBottom);\n  s.left = Math.round(window.pageXOffset + Math.random() * Math.max(0, d.clientWidth - w)) + 'px';\n  s.top = Math.round(window.pageYOffset + Math.random() * Math.max(0, d.clientHeight - h)) + 'px';\n}",
  score:"var __score = 0, __board = null;\nfunction __scoreBoard() {\n  if (!__board) {\n    __board = document.createElement('div');\n    __board.style.cssText = 'position: fixed; top: 10px; right: 10px; padding: 6px 14px; border-radius: 12px; background: rgba(17, 17, 17, .75); color: #fff; font: 700 20px system-ui, sans-serif; z-index: 9999; pointer-events: none';\n    document.body.appendChild(__board);\n  }\n  __board.textContent = '"+T('점수').replace(/'/g,"\\'")+": ' + __score;\n  return __board;\n}\nfunction __setScore(v, add) {\n  v = parseFloat(v) || 0;\n  __score = add ? __score + v : v;\n  __scoreBoard();\n}\n__scoreBoard();",
  image:"var __imgCache = {};\nfunction __image(name, src, x, y, w) {\n  if (!src) return;\n  var g = __pen(name), im = __imgCache[src];\n  if (!im) { im = new Image(); im.src = src; __imgCache[src] = im; }\n  var go = function () { g.drawImage(im, x, y, w, w * im.naturalHeight / im.naturalWidth); };\n  if (im.complete && im.naturalWidth) go(); else im.addEventListener('load', go, { once: true });\n}"
};
/* helpers written as real functions (so they are syntax checked here); the body text is what goes into the page.
   @@NAME@@ marks a translated message that is filled in */
function src(fn,rep){
  var t=fn.toString(); t=t.slice(t.indexOf('{')+1,t.lastIndexOf('}'));
  var lines=t.split('\n'); while(lines.length&&!lines[0].trim()) lines.shift(); while(lines.length&&!lines[lines.length-1].trim()) lines.pop();
  var ind=Math.min.apply(null,lines.filter(function(l){ return l.trim(); }).map(function(l){ return l.match(/^ */)[0].length; }));
  t=lines.map(function(l){ return l.slice(ind); }).join('\n');
  if(rep) Object.keys(rep).forEach(function(k){ t=t.split('@@'+k+'@@').join(String(rep[k]).replace(/\\/g,'\\\\').replace(/'/g,"\\'")); });
  return t; }
HELP.me='var __me = null;';
HELP.other='var __other = null;';
HELP.sched=src(function(){
  var __tasks = [], __tid = 0, __tlast = 0;
  function __sched(name, sec, fn, repeat, owner) {
    sec = Math.max(0.02, parseFloat(sec) || 0);
    if (name) __unsched(name, owner);
    __tasks.push({ n: name || '', o: owner || null, ms: sec * 1000, left: sec * 1000, r: repeat, f: fn, busy: false, dead: false });
    if (!__tid) { __tlast = performance.now(); __tid = setInterval(__tick, 16); }
  }
  function __unsched(name, owner) {
    __tasks.forEach(function (t) { if (t.n === name && t.o === (owner || null)) t.dead = true; });
  }
  function __dropOwner(owner) { __tasks.forEach(function (t) { if (t.o === owner) t.dead = true; }); }
  function __stopAll() { __tasks.forEach(function (t) { t.dead = true; }); }
  function __run(t) {
    var r;
    try { r = t.f(); } catch (e) { setTimeout(function () { throw e; }, 0); return; }
    if (r && r.then) {
      t.busy = true;
      r.then(function () { t.busy = false; }, function (e) { t.busy = false; throw e; });
    }
  }
  function __tick() {
    var now = performance.now(), dt = Math.min(now - __tlast, 100), n = __tasks.length;
    __tlast = now;
    for (var i = 0; i < n; i++) {
      var t = __tasks[i];
      if (t.dead || t.busy) continue;
      t.left -= dt;
      if (t.left > 0) continue;
      if (t.r) t.left = Math.max(t.left + t.ms, 0); else t.dead = true;
      __run(t);
    }
    __tasks = __tasks.filter(function (t) { return !t.dead; });
    if (!__tasks.length) { clearInterval(__tid); __tid = 0; }
  }
});
HELP.clones=src(function(){
  var __clones = {}, __ccount = 0, __cseq = 0, __cscripts = {}, __cwarn = false;
  function __onClone(base, fn) { (__cscripts[base] = __cscripts[base] || []).push(fn); }
  function __clone(name, x, y) {
    var s = $(name), base = s.__base || s.id;
    if (__ccount >= 500) {
      if (!__cwarn) { __cwarn = true; console.warn('@@LIMIT@@'); }
      return null;
    }
    if (x === undefined) {
      if (s.style.position === 'absolute') { x = parseFloat(s.style.left) || 0; y = parseFloat(s.style.top) || 0; }
      else { var r = s.getBoundingClientRect(); x = r.left + window.pageXOffset; y = r.top + window.pageYOffset; }
    }
    var c = s.cloneNode(true), st = c.style;
    c.id = base + '~' + (++__cseq);
    c.__base = base; c.__dir = s.__dir || 0; c.__v = Object.assign({}, s.__v);
    [].forEach.call(c.querySelectorAll('[id]'), function (e) { e.removeAttribute('id'); });
    st.position = 'absolute'; st.margin = '0'; st.left = x + 'px'; st.top = y + 'px';
    if (st.display === 'none') st.display = '';
    document.body.appendChild(c);
    (__clones[base] = __clones[base] || []).push(c);
    __ccount++;
    (__cscripts[base] || []).forEach(function (f) { f(c); });
    return c;
  }
  function __unclone(c) {
    if (!c || !c.__base || c.__dead) return;
    c.__dead = true;
    if (typeof __dropOwner === 'function') __dropOwner(c);
    var a = __clones[c.__base], i = a ? a.indexOf(c) : -1;
    if (i >= 0) { a.splice(i, 1); __ccount--; }
    if (c.parentNode) c.parentNode.removeChild(c);
  }
  function __uncloneAll(name) { (__clones[name] || []).slice().forEach(__unclone); }
  function __ccountOf(name) { return (__clones[name] || []).length; }
  function __fwd(r, n) {
    var a = ($(r).__dir || 0) * Math.PI / 180;
    __nudge(r, Math.round(Math.cos(a) * n * 1000) / 1000, Math.round(Math.sin(a) * n * 1000) / 1000);
  }
  function __dir(r, d, turn) {
    var e = $(r);
    d = parseFloat(d) || 0;
    e.__dir = ((turn ? (e.__dir || 0) + d : d) % 360 + 360) % 360;
  }
  function __getdir(r) { return Math.round(($(r).__dir || 0) * 100) / 100; }
  function __face(r, x, y) {
    var e = $(r), q = e.getBoundingClientRect();
    e.__dir = (Math.atan2(y - (q.top + window.pageYOffset + q.height / 2), x - (q.left + window.pageXOffset + q.width / 2)) * 180 / Math.PI + 360) % 360;
  }
  function __vset(r, k, v) { var e = $(r); (e.__v || (e.__v = {}))[k] = v; }
  function __vget(r, k) { var v = ($(r).__v || {})[k]; return v === undefined ? 0 : v; }
  var __vp = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
  function __vpSet() { __vp.x = window.pageXOffset; __vp.y = window.pageYOffset; __vp.w = window.innerWidth; __vp.h = window.innerHeight; }
  window.addEventListener('scroll', __vpSet, { passive: true });
  window.addEventListener('resize', __vpSet);
  function __out(r) {
    var e = $(r), s = e.style, x = parseFloat(s.left), y = parseFloat(s.top);
    if (isNaN(x) || isNaN(y)) { var q = e.getBoundingClientRect(); x = q.left + window.pageXOffset; y = q.top + window.pageYOffset; }
    var w = e.__w || (e.__w = e.offsetWidth), h = e.__h || (e.__h = e.offsetHeight);
    return x + w < __vp.x || y + h < __vp.y || x > __vp.x + __vp.w || y > __vp.y + __vp.h;
  }
},{LIMIT:T('복제본은 500개까지 만들 수 있어요')});
HELP.touch=src(function(){
  function __refs(x, quiet) {
    if (x && x.nodeType) return x.isConnected ? [x] : [];
    if (typeof x === 'string' && x.charAt(x.length - 1) === '*') return (__clones[x.slice(0, -1)] || []).slice();
    var e = x ? document.getElementById(x) : null;
    if (!e && !quiet) $(x);
    return e ? [e] : [];
  }
  function __ov(p, q, mode) {
    if (mode === 'circle') {
      var pr = Math.min(p.width, p.height) / 2, qr = Math.min(q.width, q.height) / 2;
      var dx = (p.left + p.width / 2) - (q.left + q.width / 2), dy = (p.top + p.height / 2) - (q.top + q.height / 2);
      return dx * dx + dy * dy < (pr + qr) * (pr + qr);
    }
    return p.left < q.right && p.right > q.left && p.top < q.bottom && p.bottom > q.top;
  }
  function __touch(a, b, mode) {
    var A = __refs(a), B = __refs(b), Q = B.map(function (e) { return e.getBoundingClientRect(); });
    for (var i = 0; i < A.length; i++) {
      var p = A[i].getBoundingClientRect();
      if (!p.width) continue;
      for (var j = 0; j < B.length; j++) {
        if (A[i] !== B[j] && Q[j].width && __ov(p, Q[j], mode)) return true;
      }
    }
    return false;
  }
});
HELP.hitev=src(function(){
  var __hits = [], __useq = 0;
  function __uid(e) { return e.__u || (e.__u = ++__useq); }
  function __isGroup(x) { return typeof x === 'string' && x.charAt(x.length - 1) === '*'; }
  function __onHit(a, b, f, mode) {
    __hits.push({ a: a, b: b, f: f, mode: mode, on: {} });
    if (__hits.length === 1) requestAnimationFrame(__hitLoop);
  }
  function __hitLoop() {
    requestAnimationFrame(__hitLoop);
    __hits.forEach(function (h) {
      var A = __refs(h.a, true), B = __refs(h.b, true), now = {}, fire = [];
      var Q = B.map(function (e) { return e.getBoundingClientRect(); });
      A.forEach(function (x) {
        var p = x.getBoundingClientRect();
        if (!p.width) return;
        B.forEach(function (y, j) {
          if (x === y || !Q[j].width || !__ov(p, Q[j], h.mode)) return;
          var k = __uid(x) + '|' + __uid(y);
          now[k] = 1;
          if (!h.on[k]) fire.push([x, y]);
        });
      });
      h.on = now;
      var meB = __isGroup(h.b) && !__isGroup(h.a);
      fire.forEach(function (xy) { if (meB) h.f(xy[1], xy[0]); else h.f(xy[0], xy[1]); });
    });
  }
});
HELP.tile=src(function(){
  var __maps = {}, __tbl = false;
  function __map(n) {
    var m = __maps[n];
    if (!m) throw new Error('"' + n + '" @@NOMAP@@');
    return m;
  }
  function __tmake(cv, n, c, r, s) {
    c = Math.max(1, Math.min(300, Math.floor(c) || 1)); r = Math.max(1, Math.min(300, Math.floor(r) || 1)); s = Math.max(2, Math.floor(s) || 2);
    var d = [];
    for (var i = 0; i < c * r; i++) d.push(0);
    __maps[n] = { cv: cv, c: c, r: r, s: s, d: d, solid: { 1: true },
      col: { 1: '#475569', 2: '#22c55e', 3: '#facc15', 4: '#ef4444', 5: '#38bdf8', 6: '#a855f7', 7: '#f97316', 8: '#92400e', 9: '#ec4899' } };
  }
  function __tget(n, c, r) {
    var m = __map(n);
    c = Math.floor(c); r = Math.floor(r);
    return c < 0 || r < 0 || c >= m.c || r >= m.r ? 0 : m.d[r * m.c + c];
  }
  function __tset(n, c, r, v) {
    var m = __map(n);
    c = Math.floor(c); r = Math.floor(r);
    if (c >= 0 && r >= 0 && c < m.c && r < m.r) m.d[r * m.c + c] = Math.floor(v) || 0;
  }
  function __tfill(n, mode, v) {
    var m = __map(n);
    v = Math.floor(v) || 0;
    for (var r = 0; r < m.r; r++) for (var c = 0; c < m.c; c++) {
      if (mode === 'all' || r === 0 || c === 0 || r === m.r - 1 || c === m.c - 1) m.d[r * m.c + c] = v;
    }
  }
  function __tcolor(n, v, color) { __map(n).col[Math.floor(v)] = color; }
  function __tsolidSet(n, v, on) { __map(n).solid[Math.floor(v)] = on; }
  function __tsolid(m, c, r) {
    if (c < 0 || r < 0 || c >= m.c || r >= m.r) return true;
    return !!m.solid[m.d[r * m.c + c]];
  }
  function __tdraw(n) {
    var m = __map(n), g = $(m.cv).getContext('2d');
    for (var r = 0; r < m.r; r++) for (var c = 0; c < m.c; c++) {
      var v = m.d[r * m.c + c], x = c * m.s, y = r * m.s;
      g.clearRect(x, y, m.s, m.s);
      if (!v) continue;
      g.fillStyle = m.col[v] || 'hsl(' + (v * 47 % 360) + ', 60%, 55%)';
      g.fillRect(x, y, m.s, m.s);
      g.strokeStyle = 'rgba(0, 0, 0, .18)'; g.lineWidth = 1;
      g.strokeRect(x + 0.5, y + 0.5, m.s - 1, m.s - 1);
    }
  }
  function __twall(n, x, y) {
    var m = __map(n);
    return __tsolid(m, Math.floor(x / m.s), Math.floor(y / m.s));
  }
  function __tcell(n, p) { return Math.floor(p / __map(n).s); }
  function __tbox(m, el) {
    var c = $(m.cv), o = c.getBoundingClientRect(), q = el.getBoundingClientRect(), k = c.width ? o.width / c.width : 1;
    return { x: (q.left - o.left) / k, y: (q.top - o.top) / k, w: q.width / k, h: q.height / k, k: k };
  }
  function __tblock(m, x, y, w, h) {
    var c0 = Math.floor(x / m.s), c1 = Math.floor((x + w - 0.01) / m.s), r0 = Math.floor(y / m.s), r1 = Math.floor((y + h - 0.01) / m.s);
    for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) if (__tsolid(m, c, r)) return true;
    return false;
  }
  function __ttouch(name, n) {
    var m = __map(n), b = __tbox(m, $(name));
    return __tblock(m, b.x, b.y, b.w, b.h);
  }
  function __tmove(name, n, dx, dy) {
    var el = $(name), m = __map(n), b = __tbox(m, el), x = b.x, y = b.y, i, st;
    dx = parseFloat(dx) || 0; dy = parseFloat(dy) || 0;
    __tbl = false;
    st = Math.max(1, Math.ceil(Math.abs(dx)));
    for (i = 0; i < st; i++) { if (__tblock(m, x + dx / st, y, b.w, b.h)) { __tbl = true; break; } x += dx / st; }
    st = Math.max(1, Math.ceil(Math.abs(dy)));
    for (i = 0; i < st; i++) { if (__tblock(m, x, y + dy / st, b.w, b.h)) { __tbl = true; break; } y += dy / st; }
    __nudge(name, (x - b.x) * b.k, (y - b.y) * b.k);
  }
},{NOMAP:T('타일맵이 없어요')});
HELP.best=src(function(){
  var __bb = null, __bn = '';
  function __bestOf(n) { var v = parseFloat(__load(n, 0)); return isNaN(v) ? 0 : v; }
  function __bestShow() {
    if (!__bb || __bb.style.display === 'none') return;
    __bb.textContent = __bn + ': ' + __bestOf(__bn);
  }
  function __best(n, v) {
    v = parseFloat(v) || 0;
    if (v > __bestOf(n)) __save(n, v);
    if (n === __bn) __bestShow();
  }
  function __bestReset(n) { __save(n, 0); if (n === __bn) __bestShow(); }
  function __bestBoardSet(n, show) {
    if (!__bb) {
      __bb = document.createElement('div');
      __bb.style.cssText = 'position: fixed; top: 56px; right: 10px; padding: 6px 14px; border-radius: 12px; background: rgba(76, 29, 149, .8); color: #fff; font: 700 18px system-ui, sans-serif; z-index: 9999; pointer-events: none';
      document.body.appendChild(__bb);
    }
    __bn = n;
    __bb.style.display = show ? '' : 'none';
    __bestShow();
  }
});
HELP.draw=src(function(){
  var __lw = {}, __fs = {};
  function __pen(name) { return $(name).getContext('2d'); }
  function __clear(name) { var c = $(name); __pen(name).clearRect(0, 0, c.width, c.height); }
  function __fill(name, color) { var c = $(name), g = __pen(name); g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); }
  function __width(name, n) { __lw[name] = Math.max(0.5, parseFloat(n) || 3); }
  function __fsize(name, n) { __fs[name] = Math.max(4, parseFloat(n) || 20); }
  function __rect(name, x, y, w, h, color) { var g = __pen(name); g.fillStyle = color; g.fillRect(x, y, w, h); }
  function __orect(name, x, y, w, h, color) { var g = __pen(name); g.strokeStyle = color; g.lineWidth = __lw[name] || 3; g.lineJoin = 'round'; g.strokeRect(x, y, w, h); }
  function __circle(name, x, y, r, color) { var g = __pen(name); g.fillStyle = color; g.beginPath(); g.arc(x, y, Math.max(0, r), 0, Math.PI * 2); g.fill(); }
  function __ocircle(name, x, y, r, color) { var g = __pen(name); g.strokeStyle = color; g.lineWidth = __lw[name] || 3; g.beginPath(); g.arc(x, y, Math.max(0, r), 0, Math.PI * 2); g.stroke(); }
  function __line(name, x1, y1, x2, y2, color) { var g = __pen(name); g.strokeStyle = color; g.lineWidth = __lw[name] || 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function __text(name, text, x, y, color) { var g = __pen(name); g.fillStyle = color; g.font = (__fs[name] || 20) + 'px sans-serif'; g.fillText(text, x, y); }
});
HELP.store=src(function(){
  function __save(k, v) {
    k = 'ffb:' + __pid + ':' + k;
    __mem[k] = v;
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    __sync(k, v);
  }
  function __load(k, d) {
    k = 'ffb:' + __pid + ':' + k;
    try {
      var s = localStorage.getItem(k);
      if (s !== null) return JSON.parse(s);
    } catch (e) {}
    return k in __mem ? __mem[k] : d;
  }
});
var HELP_DEPS={beep:['snd'],sfx:['snd'],note:['snd'],hit:['$'],touch:['$','clones'],hitev:['$','touch'],rpos:['$'],nudge:['$'],where:['$'],stay:['$'],follow:['$','cursor'],image:['$','draw'],get:['$'],set:['$'],add:['$'],size:['$'],move:['$'],show:['$'],draw:['$'],clones:['$','me','sched','nudge'],sched:['me'],tile:['$','nudge'],best:['store']};

function dbgHelper(vars){
  return 'var __dq = Promise.resolve(), __dgo = null, __dfree = 0, __drun = 0, __dbusy = {};\n'+
  'function __dvars() {\n  var o = [];\n'+vars.map(function(v){ return '  try { o.push([ '+lit(v[0])+', typeof '+v[1]+" === 'undefined' ? '' : __dshow("+v[1]+') ]); } catch (e) {}\n'; }).join('')+'  return o;\n}\n'+
  "function __dshow(v) { if (typeof v === 'function') return 'ƒ'; try { var t = typeof v === 'string' ? JSON.stringify(v) : (typeof v === 'object' ? JSON.stringify(v) : String(v)); return t.length > 70 ? t.slice(0, 70) + '…' : t; } catch (e) { return String(v); } }\n"+
  "function __step(id) {\n  return new Promise(function (done) {\n    __dq = __dq.then(function () {\n      if (__dfree || (typeof __ccount !== 'undefined' && __ccount > 8)) return;\n      return new Promise(function (go) { __dgo = go; parent.postMessage({ ffbhStep: { id: id, vars: __dvars() } }, '*'); });\n    }).then(done);\n  });\n}\n"+
  "function __dbegin() { __drun++; }\nfunction __dend() { if (--__drun <= 0) { __drun = 0; __dfree = 0; parent.postMessage({ ffbhStepEnd: 1 }, '*'); } }\n"+
  "addEventListener('message', function (e) {\n  var d = e.data;\n  if (!d || !d.ffbhDbg) return;\n  if (d.ffbhDbg === 'free') __dfree = 1;\n  if (__dgo) { var g = __dgo; __dgo = null; g(); }\n});"; }

/* "변수 보기": the preview (never the downloaded page) sends the project's variables to the editor whenever one changes */
function watchHelper(vars){
  return '// '+T('변수 보기')+'\n(function () {\n  var __wl = \'\';\n  setInterval(function () {\n    var __wo = [];\n'+
  vars.map(function(v){ return '    try { __wo.push([ '+lit(v[0])+', typeof '+v[1]+" === 'undefined' ? '' : __wshow("+v[1]+') ]); } catch (e) {}\n'; }).join('')+
  "    var __ws = JSON.stringify(__wo);\n    if (__ws !== __wl) { __wl = __ws; parent.postMessage({ ffbhVars: __wo }, '*'); }\n  }, 150);\n  addEventListener('message', function (e) { if (e.data && e.data.ffbhVarsAsk) __wl = ''; });\n"+
  "  function __wshow(v) { if (typeof v === 'function') return 'ƒ'; try { var t = typeof v === 'string' || typeof v === 'object' ? JSON.stringify(v) : String(v); return t.length > 70 ? t.slice(0, 70) + '…' : t; } catch (e) { return String(v); } }\n})();"; }

/* ---------- HTML ---------- */
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function idAttr(b){ var n=b.getFieldValue('NAME'); return n?' id="'+esc(n)+'"':''; }
function bodyHTML(first,ind,one){
  var out='', b=first;
  for(;b;b=one?null:b.getNextBlock()){
    if(!b.isEnabled()) continue;
    var t=b.type, i=ind;
    if(t==='el_heading'){ var h=b.getFieldValue('SIZE'); out+=i+'<'+h+idAttr(b)+'>'+esc(b.getFieldValue('TEXT'))+'</'+h+'>\n'; }
    else if(t==='el_text') out+=i+'<p'+idAttr(b)+'>'+esc(b.getFieldValue('TEXT'))+'</p>\n';
    else if(t==='el_button') out+=i+'<button'+idAttr(b)+'>'+esc(b.getFieldValue('TEXT'))+'</button>\n';
    else if(t==='el_input') out+=i+'<input'+idAttr(b)+' type="'+b.getFieldValue('KIND')+'" placeholder="'+esc(b.getFieldValue('TEXT'))+'">\n';
    else if(t==='el_picture'){ var im=IMGS[b.getFieldValue('IMG')]; out+=i+'<img'+idAttr(b)+' src="'+(im?im.data:placeholderSrc(b.getFieldValue('W')))+'" width="'+b.getFieldValue('W')+'" alt="'+esc(im?im.name:T('그림을 골라 주세요'))+'">\n'; }
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
  // 페이지 블록 밖에 놓은 글·그림·버튼 블록도 페이지에 넣는다
  ws.getAllBlocks(true).forEach(function(b){
    if(EL.indexOf(b.type)<0||!b.isEnabled()||(page&&b.getRootBlock()===page)) return;
    var p=b.getSurroundParent(); if(p&&p.type==='el_box') return;
    body+=bodyHTML(b,'  ',true);
  });
  // JavaScript
  NEED={}; USED={}; USEDS={}; G.INFINITE_LOOP_TRAP=opts.trap?'if (--window.__loop < 0) throw new Error("'+T('반복이 끝나지 않아요')+'");\n':null;
  DBG=!!opts.debug; dbgSeq=0; G.STATEMENT_PREFIX=DBG?'await __step(%1);\n':null;
  var js, dbgVars=[];
  try{
  G.init(ws); var handlers='', starts='';
  if(DBG||opts.trap) ws.getAllVariables().forEach(function(v){ try{ dbgVars.push([v.name,G.getVariableName(v.getId())]); }catch(e){} });
  ws.getTopBlocks(true).forEach(function(b){
    if(!b.isEnabled()) return;
    if(DBG) b.suppressPrefixSuffix=true;
    var isProc=/^procedures_def/.test(b.type);
    if(isProc&&DBG) G.STATEMENT_PREFIX=null; // a function runs as one step (its call block)
    try{
      if(b.type==='ev_start') starts+=G.blockToCode(b)||'';
      else if(/^ev_/.test(b.type)||isProc){ var c=G.blockToCode(b); if(Array.isArray(c)) c=c[0]; handlers+=c||''; }
    } finally{ if(isProc&&DBG) G.STATEMENT_PREFIX='await __step(%1);\n'; }
  });
  js=G.finish(handlers+(starts?(handlers?'\n':'')+starts:''));
  } finally{ G.STATEMENT_PREFIX=null; DBG=false; }
  if(NEED.clones) dbgVars.push([T('복제본 수'),'__ccount']);
  if(opts.debug) js='// '+T('한 블록씩 실행')+'\n'+dbgHelper(dbgVars)+'\n\n'+js;
  Object.keys(HELP_DEPS).forEach(function(k){ if(NEED[k]) HELP_DEPS[k].forEach(need); });
  var helpers=Object.keys(HELP).filter(function(k){ return NEED[k]; }).map(function(k){ return HELP[k]; }).join('\n');
  if(NEED.store){ // saved values belong to this project: the preview keeps them in the editor (it cannot use its own storage), a downloaded page uses the browser storage
    var saved={}; if(opts.saved) Object.keys(opts.saved).forEach(function(k){ saved[k]=opts.saved[k]; });
    var pidv=String(opts.pid||title||'page');
    helpers='var __pid = '+lit(pidv).replace(/</g,'\\u003c')+';\nvar __mem = '+JSON.stringify(saved).replace(/</g,'\\u003c')+';\n'+(opts.trap?'function __sync(k, v) { try { parent.postMessage({ ffbhStore: [k, v] }, \'*\'); } catch (e) {} }':'function __sync() {}')+'\n'+helpers; }
  if(NEED.imgs){ var used=Object.keys(USED).filter(function(id){ return IMGS[id]; }); helpers='// '+T('내 그림')+'\nvar __imgs = {\n'+used.map(function(id){ return '  '+lit(IMGS[id].name)+': '+lit(IMGS[id].data); }).join(',\n')+'\n};\n'+(NEED.image?'for (var __k in __imgs) { var __im = new Image(); __im.src = __imgs[__k]; }\n':'')+helpers; }
  if(NEED.mp3){ helpers='var __mp3s = {\n'+Object.keys(USEDS).filter(function(n){ return sndOf(n); }).map(function(n){ return '  '+lit(n)+': '+lit(sndOf(n).data); }).join(',\n')+'\n};\n'+helpers; }
  if(helpers) js='// '+T('도우미 함수')+'\n'+helpers+'\n\n'+js;
  if(opts.trap) js=watchHelper(dbgVars.concat(NEED.score?[[T('점수'),'__score']]:[]))+'\n\n'+js;
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
  var logPre='<script>(function(){function s(l,a){var t=[].map.call(a,function(x){try{return typeof x===\'object\'?JSON.stringify(x):String(x);}catch(e){return String(x);}}).join(\' \');try{parent.postMessage({ffbhLog:[l,t]},\'*\');}catch(e){}}[\'log\',\'info\',\'warn\',\'error\'].forEach(function(k){var o=console[k];console[k]=function(){s(k,arguments);if(o)o.apply(console,arguments);};});var oe=window.onerror;window.onerror=function(m){s(\'error\',[m]);return oe?oe.apply(this,arguments):false;};addEventListener(\'unhandledrejection\',function(e){s(\'error\',[e.reason&&e.reason.message||e.reason]);});})();<\/script>\n';
  var pre=opts.trap?'<script>window.__loop=1e6;setInterval(function(){window.__loop=1e6;},200);(function(){var P=0,Q=[],sT=setTimeout,sI=setInterval,rA=window.requestAnimationFrame&&window.requestAnimationFrame.bind(window),st=null,AX=[],AC=window.AudioContext||window.webkitAudioContext;if(AC)window.AudioContext=window.webkitAudioContext=function(){var c=new AC();AX.push(c);return c;};window.setTimeout=function(f,ms){var a=[].slice.call(arguments,2);if(typeof f!==\'function\')return sT(f,ms);return sT(function(){if(P)Q.push(function(){f.apply(window,a);});else f.apply(window,a);},ms);};window.setInterval=function(f,ms){var a=[].slice.call(arguments,2);if(typeof f!==\'function\')return sI(f,ms);return sI(function(){if(!P)f.apply(window,a);},ms);};if(rA)window.requestAnimationFrame=function(f){return rA(function(t){if(P)Q.push(function(){rA(f);});else f(t);});};addEventListener(\'message\',function(e){var d=e.data;if(!d||d.ffbh===undefined)return;if(d.ffbh===\'pause\'&&!P){P=1;AX.forEach(function(c){try{c.suspend();}catch(e){}});st=document.createElement(\'style\');st.textContent=\'*,*::before,*::after{animation-play-state:paused!important;transition:none!important}\';document.head.appendChild(st);document.querySelectorAll(\'audio,video\').forEach(function(m){if(!m.paused){m.pause();m.__ffp=1;}});}else if(d.ffbh===\'resume\'&&P){P=0;AX.forEach(function(c){try{c.resume();}catch(e){}});if(st)st.remove();var q=Q;Q=[];q.forEach(function(f){f();});document.querySelectorAll(\'audio,video\').forEach(function(m){if(m.__ffp){m.__ffp=0;m.play();}});}});})();window.onerror=function(m){var d=document.getElementById("__err")||document.body.appendChild(Object.assign(document.createElement("div"),{id:"__err"}));d.style.cssText="position:fixed;left:8px;right:8px;bottom:8px;padding:10px 14px;border-radius:10px;background:#7f1d1d;color:#fff;font:14px sans-serif;text-align:left;z-index:99999";d.textContent="⚠ "+m;};<\/script>\n':'';
  return '<!DOCTYPE html>\n<html lang="'+(FFT.lang||'ko')+'">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>'+esc(title)+'</title>\n  <!-- '+T('Block HTML로 만든 페이지')+' -->\n'+(pre?'  '+pre+'  '+logPre:'')+
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
      {kind:'block',type:'ev_start'},lab('누르거나 쓰면'),{kind:'block',type:'ev_click'},{kind:'block',type:'ev_drag'},{kind:'block',type:'ev_change'},{kind:'block',type:'ev_key'},{kind:'block',type:'ev_keyhold'},{kind:'block',type:'ev_keyup'},lab('닿으면'),{kind:'block',type:'ev_hit'},lab('복제본'),{kind:'block',type:'ev_clone'},lab('시간마다'),{kind:'block',type:'ev_timer'}]},
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
      lab('칠하기와 굵기'),{kind:'block',type:'draw_fill',inputs:{COLOR:shc('#e0f2fe')}},{kind:'block',type:'draw_width',inputs:{N:n(6)}},{kind:'block',type:'draw_fsize',inputs:{N:n(28)}},
      {kind:'block',type:'draw_orect',inputs:{X:n(30),Y:n(30),W:n(100),H:n(60),COLOR:shc('#ef4444')}},{kind:'block',type:'draw_ocircle',inputs:{X:n(160),Y:n(110),R:n(40),COLOR:shc('#22c55e')}},
      lab('누른 곳'),{kind:'block',type:'ev_drag'},{kind:'block',type:'val_mouse'},lab('부딪힘'),{kind:'block',type:'val_dist',inputs:{X1:n(0),Y1:n(0),X2:n(50),Y2:n(50)}}]},
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
      {kind:'block',type:'act_nudge',inputs:{N:n(10)}},{kind:'block',type:'act_nudge2',inputs:{DX:n(10),DY:n(0)}},{kind:'block',type:'act_stay'},
      lab('커서 따라다니기'),{kind:'block',type:'act_follow'},{kind:'block',type:'val_cursor'},
      lab('위치와 닿음'),{kind:'block',type:'val_where'},{kind:'block',type:'val_hit'},
      {kind:'block',type:'act_size',fields:{PROP:'rotate'},inputs:{N:n(45)}},
      lab('누른 곳'),{kind:'block',type:'val_mouse'}]},
    {kind:'category',name:T('게임'),colour:'#e8590c',contents:[
      lab('닿으면'),{kind:'block',type:'ev_hit'},{kind:'block',type:'val_hit'},
      lab('점수'),{kind:'block',type:'act_score',inputs:{N:n(1)}},{kind:'block',type:'act_score',fields:{MODE:'set'},inputs:{N:n(0)}},{kind:'block',type:'val_score'},{kind:'block',type:'act_scoreboard'},
      lab('최고 점수'),{kind:'block',type:'act_best',inputs:{N:{block:{type:'val_score'}}}},{kind:'block',type:'act_bestboard'},lab('위치'),{kind:'block',type:'act_rpos'},{kind:'block',type:'act_stay'},{kind:'block',type:'act_nudge2',inputs:{DX:n(10),DY:n(0)}},
      lab('소리'),{kind:'block',type:'act_sfx'},{kind:'block',type:'act_restart'}]},
    {kind:'category',name:T('복제'),colour:C.clone,contents:[
      lab('만들고 지우기'),{kind:'block',type:'clone_make'},{kind:'block',type:'clone_make_at',inputs:{X:n(100),Y:n(300)}},{kind:'block',type:'clone_del'},{kind:'block',type:'clone_delall'},
      lab('복제본마다 따로'),{kind:'block',type:'ev_clone'},{kind:'block',type:'clone_setv',inputs:{V:n(3)}},{kind:'block',type:'clone_getv'},
      lab('움직이기'),{kind:'block',type:'clone_fwd',inputs:{N:n(6)}},{kind:'block',type:'clone_dir',inputs:{N:n(270)}},{kind:'block',type:'clone_face',inputs:{X:n(200),Y:n(200)}},{kind:'block',type:'clone_getdir'},
      {kind:'block',type:'act_nudge2',inputs:{DX:n(0),DY:n(-6)}},{kind:'block',type:'act_move',inputs:{X:n(100),Y:n(100)}},{kind:'block',type:'val_where'},
      lab('살펴보기'),{kind:'block',type:'clone_count'},{kind:'block',type:'clone_out'},{kind:'block',type:'val_hit'},{kind:'block',type:'ev_hit'},
      lab('시간'),{kind:'block',type:'time_every',inputs:{SEC:n(0.03)}},{kind:'block',type:'time_after',inputs:{SEC:n(1)}}]},
    {kind:'category',name:T('타일맵'),colour:C.tile,contents:[
      lab('만들기'),{kind:'block',type:'el_canvas'},{kind:'block',type:'tile_make',inputs:{C:n(10),R:n(7),S:n(32)}},{kind:'block',type:'tile_fill',inputs:{V:n(1)}},{kind:'block',type:'tile_set',inputs:{C:n(3),R:n(2),V:n(1)}},
      {kind:'block',type:'tile_color',inputs:{V:n(1),COLOR:shc('#9ca3af')}},{kind:'block',type:'tile_solid',inputs:{V:n(1)}},{kind:'block',type:'tile_draw'},
      lab('벽 살펴보기'),{kind:'block',type:'tile_get',inputs:{C:n(0),R:n(0)}},{kind:'block',type:'tile_wall',inputs:{X:n(40),Y:n(40)}},{kind:'block',type:'tile_cell',inputs:{N:n(100)}},{kind:'block',type:'tile_touch'},
      lab('벽에 막히며 움직이기'),{kind:'block',type:'tile_move',inputs:{DX:n(4),DY:n(0)}},{kind:'block',type:'tile_blocked'}]},
    {kind:'category',name:T('소리·알림'),colour:'#2e9bd6',contents:[
      lab('효과음'),{kind:'block',type:'act_sfx'},{kind:'block',type:'act_sfx',fields:{SFX:'win'}},
      lab('음악'),{kind:'block',type:'act_note'},{kind:'block',type:'act_note',fields:{NOTE:'E4',BEAT:'0.5'}},{kind:'block',type:'act_tempo',inputs:{N:n(120)}},{kind:'block',type:'act_mp3'},{kind:'block',type:'act_sound_stop'},
      lab('삐 소리'),{kind:'block',type:'act_beep',inputs:{SEC:n(0.3)}},
      lab('알림'),{kind:'block',type:'act_alert',inputs:{VALUE:sh('text',T('안녕하세요!'))}}]},
    {kind:'category',name:T('시간'),colour:'#3a6fd8',contents:[
      {kind:'block',type:'act_after',inputs:{SEC:n(1)}},{kind:'block',type:'ev_timer'},{kind:'block',type:'act_stop'},
      lab('이름 붙여 멈출 수 있는'),{kind:'block',type:'time_after',inputs:{SEC:n(2)}},{kind:'block',type:'time_every',inputs:{SEC:n(1)}},{kind:'block',type:'time_stop'},{kind:'block',type:'time_stopall'},lab('그 밖에'),{kind:'block',type:'act_restart'},{kind:'block',type:'val_time'},{kind:'block',type:'val_today'}]},
    {kind:'category',name:T('저장·로그'),colour:'#8e6bbf',contents:[
      {kind:'block',type:'act_store',inputs:{NAME:sh('text',T('최고점')),VALUE:n(0)}},{kind:'block',type:'val_load',inputs:{NAME:sh('text',T('최고점')),DEF:n(0)}},
      lab('최고 점수 (프로젝트마다 따로 저장)'),{kind:'block',type:'act_best',inputs:{N:{block:{type:'val_score'}}}},{kind:'block',type:'val_best'},{kind:'block',type:'act_bestboard'},{kind:'block',type:'act_bestreset'},
      lab('기록'),{kind:'block',type:'act_log',inputs:{VALUE:sh('text',T('안녕!'))}}]},
    {kind:'sep'},
    {kind:'category',name:T('조건'),colour:'#5b80a5',contents:[
      {kind:'block',type:'controls_if'},{kind:'block',type:'controls_if',extraState:{hasElse:true}},
      lab('비교'),{kind:'block',type:'logic_compare'},{kind:'block',type:'logic_operation'},{kind:'block',type:'logic_negate'},lab('논리 게이트'),{kind:'block',type:'logic_gate',fields:{GATE:'AND'}},{kind:'block',type:'logic_gate',fields:{GATE:'OR'}},{kind:'block',type:'logic_gate',fields:{GATE:'XOR'}},{kind:'block',type:'logic_gate',fields:{GATE:'NOR'}},{kind:'block',type:'logic_gate',fields:{GATE:'NAND'}},{kind:'block',type:'logic_between',inputs:{LO:n(1),HI:n(10)}},lab('기본'),{kind:'block',type:'logic_boolean'},
      {kind:'block',type:'logic_ternary'}]},
    {kind:'category',name:T('반복'),colour:'#5ba55b',contents:[
      {kind:'block',type:'controls_repeat_ext',inputs:{TIMES:n(10)}},{kind:'block',type:'controls_whileUntil'},lab('조건 반복'),{kind:'block',type:'loop_while'},{kind:'block',type:'loop_dowhile'},lab('기본'),
      {kind:'block',type:'controls_for',inputs:{FROM:n(1),TO:n(10),BY:n(1)}},{kind:'block',type:'controls_forEach'},{kind:'block',type:'controls_flow_statements'},
      lab('시간마다'),{kind:'block',type:'ev_timer'}]},
    {kind:'category',name:T('계산'),colour:'#5b67a5',contents:[
      {kind:'block',type:'math_number'},{kind:'block',type:'math_arithmetic',inputs:{A:n(1),B:n(1)}},
      {kind:'block',type:'math_random_int',inputs:{FROM:n(1),TO:n(100)}},{kind:'block',type:'math_round',inputs:{NUM:n(3.5)}},
      {kind:'block',type:'math_modulo',inputs:{DIVIDEND:n(10),DIVISOR:n(3)}},{kind:'block',type:'math_single',inputs:{NUM:n(9)}},
      {kind:'block',type:'math_number_property',inputs:{NUMBER_TO_CHECK:n(0)}},{kind:'block',type:'math_constrain',inputs:{VALUE:n(50),LOW:n(0),HIGH:n(100)}},
      {kind:'block',type:'math_random_float'},
      lab('거리'),{kind:'block',type:'val_dist',inputs:{X1:n(0),Y1:n(0),X2:n(30),Y2:n(40)}}]},
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

/* run fn with another project's pictures and sounds in place (a shared project opened play-only), then put ours back */
function withAssets(imgs,snds,fn){
  var oi={}, os={}; Object.keys(IMGS).forEach(function(k){ oi[k]=IMGS[k]; delete IMGS[k]; }); Object.keys(SNDS).forEach(function(k){ os[k]=SNDS[k]; delete SNDS[k]; });
  Object.keys(imgs||{}).forEach(function(k){ IMGS[k]=imgs[k]; }); Object.keys(snds||{}).forEach(function(k){ SNDS[k]=snds[k]; });
  try{ return fn(); }
  finally{ Object.keys(IMGS).forEach(function(k){ delete IMGS[k]; }); Object.keys(SNDS).forEach(function(k){ delete SNDS[k]; }); Object.keys(oi).forEach(function(k){ IMGS[k]=oi[k]; }); Object.keys(os).forEach(function(k){ SNDS[k]=os[k]; }); }
}
window.BH={withAssets:withAssets, SNDS:SNDS, missingPics:missingPics, markPics:markPics, IMGS:IMGS, build:build, toolbox:toolbox, EL:EL, KNOWN:KNOWN, elNames:elNames, C:C};
})();
