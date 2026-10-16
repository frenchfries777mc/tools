/* Block HTML AI: describe a page in words and the AI builds (or changes) the blocks.
   It is given a catalog of every block in the toolbox, one example project and, when changing, the current blocks as XML.
   Uses the shared ../ai.js (FFAI). */
(function(){
'use strict';
var T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); }, B=window.__bh, ws=B.ws;

/* ---------- block catalog, read from the real block definitions ---------- */
var EXTRA=['variables_get','variables_set','math_change','procedures_defnoreturn','procedures_defreturn','procedures_callnoreturn','procedures_callreturn','procedures_ifreturn'];
var catalog={};
function types(){
  var out=[], seen={};
  (function walk(list){ (list||[]).forEach(function(it){ if(it.kind==='block'&&!seen[it.type]){ seen[it.type]=1; out.push(it.type); } if(it.contents) walk(it.contents); }); })(BH.toolbox().contents);
  EXTRA.forEach(function(t){ if(!seen[t]&&Blockly.Blocks[t]){ seen[t]=1; out.push(t); } });
  return out;
}
function describe(hw,type,compact){
  var b; try{ b=hw.newBlock(type); }catch(e){ return null; }
  var parts=[];
  b.inputList.forEach(function(inp){
    inp.fieldRow.forEach(function(f){
      if(!f.name){ var t=!compact&&f.getText&&f.getText(); if(t&&t.trim()) parts.push(t.trim()); return; }
      var d;
      if(f.name==='EL') d='EL=<NAME of a page element>';
      else if(f.name==='IMG') d='IMG=<picture id>';
      else if(f.name==='VAR') d='VAR=<variable name>';
      else if(f instanceof Blockly.FieldDropdown){ var o=[]; try{ o=f.getOptions(false); }catch(e){} d=f.name+'('+o.map(function(x){ return x[1]; }).join('|')+')'; }
      else if(f instanceof Blockly.FieldCheckbox) d=f.name+'(TRUE|FALSE)';
      else if(f instanceof Blockly.FieldNumber) d=f.name+'=<number>';
      else d=f.name+'="'+String(f.getValue()).slice(0,40)+'"';
      parts.push(d);
    });
    if(inp.type===Blockly.inputs.inputTypes.VALUE) parts.push('[value '+inp.name+(inp.connection.getCheck()?':'+inp.connection.getCheck().join('/'):'')+']');
    else if(inp.type===Blockly.inputs.inputTypes.STATEMENT) parts.push('[statement '+inp.name+']');
  });
  var shape=b.outputConnection?'value'+(b.outputConnection.getCheck()?':'+b.outputConnection.getCheck().join('/'):''):
    b.previousConnection?(b.previousConnection.getCheck()&&b.previousConnection.getCheck().indexOf('EL')>=0?'element (goes in page BODY or a box)':'statement'):'top-level';
  var tip=b.getTooltip&&b.getTooltip(); tip=typeof tip==='string'?tip.replace(/\s+/g,' ').slice(0,90):'';
  b.dispose(false);
  return type+' {'+shape+'} '+parts.join(' ')+(tip?' // '+tip:'');
}
function getCatalog(compact){ // compact (no label words) for the built-in AI, which has a small context
  var k=compact?'c':'f'; if(catalog[k]) return catalog[k];
  var hw=new Blockly.Workspace(), lines=[];
  types().forEach(function(t){ var d=describe(hw,t,compact); if(d) lines.push(d); });
  hw.dispose(); return catalog[k]=lines.join('\n');
}

/* ---------- prompt ---------- */
var SYS=['You build web pages for the "Block HTML" editor (Blockly). Reply with Blockly XML only: one <xml xmlns="https://developers.google.com/blockly/xml">…</xml> document, nothing before or after it.',
'Rules:',
'- Use only the block types in the catalog, with exactly the field, value and statement names shown. {element} blocks go inside the page_root BODY statement (or inside an el_box), chained with <next>.',
'- Exactly one page_root. Every element needs a short unique NAME; event and action blocks point at elements through their EL field using that NAME.',
'- Event blocks (ev_start, ev_click, ev_change, ev_key, ev_timer) are separate top-level blocks next to the page. Give every top-level block x and y attributes so they do not overlap (page at x="20" y="20", scripts from x="440").',
'- Number inputs take <shadow type="math_number"><field name="NUM">…</field></shadow>, text inputs <shadow type="text"><field name="TEXT">…</field></shadow>, colors <shadow type="val_color"><field name="COLOR">#rrggbb</field></shadow>.',
'- Variables: declare them in <variables><variable>name</variable></variables> and use <field name="VAR">name</field>.',
'- Mutations: controls_if <mutation elseif="N" else="1"></mutation> with IF0/DO0, IF1/DO1…, ELSE; text_join and lists_create_with <mutation items="N"></mutation> with ADD0…; procedures_defnoreturn <mutation><arg name="x"></arg></mutation> + field NAME + statement STACK; procedures_callnoreturn <mutation name="f"><arg name="x"></arg></mutation> + values ARG0….',
'- Prefer the friendly blocks over js_raw. Keep it playable and small enough to read. Write the visible text in the language of the request.',
'- When changing existing blocks, return the whole new project (all blocks), keeping what the person did not ask to change.'].join('\n');
function picList(){ var I=BH.IMGS, ids=Object.keys(I); return ids.length?ids.map(function(id){ return id+' = '+I[id].name; }).join('\n'):''; }
function currentXML(){ var dom=Blockly.Xml.workspaceToDom(ws,true); return Blockly.Xml.domToText(dom); }
function buildPrompt(q,modify,prevErr,prevOut){
  var local=FFAI.isLocal(), pics=picList(), p='Block catalog (type {shape} fields [inputs] // meaning):\n'+getCatalog(local)+'\n\n';
  if(!(local&&modify)) p+='Example project:\n'+B.examples[0].xml()+'\n\n';
  if(pics) p+='The person\'s pictures (use these ids in IMG fields):\n'+pics+'\n\n';
  if(modify) p+='Current project:\n'+currentXML()+'\n\nChange it like this: '+q;
  else p+='Make a new project: '+q;
  if(prevErr) p+='\n\nYour previous answer could not be loaded ('+prevErr+'). Previous answer:\n'+prevOut.slice(0,local?3000:12000)+'\n\nFix it and reply with the full corrected XML only.';
  return p;
}

/* ---------- check an answer before it touches the workspace ---------- */
function extract(t){ t=String(t||''); var a=t.indexOf('<xml'), b=t.lastIndexOf('</xml>'); if(a<0||b<a) throw new Error('no <xml> element'); return t.slice(a,b+6); }
function check(xml){
  var dom; try{ dom=Blockly.utils.xml.textToDom(xml); }catch(e){ throw new Error('XML does not parse'); }
  var bad=[]; dom.querySelectorAll('block,shadow').forEach(function(n){ var t=n.getAttribute('type'); if(!Blockly.Blocks[t]&&bad.indexOf(t)<0) bad.push(t); });
  if(bad.length) throw new Error('unknown block types: '+bad.join(', '));
  var pages=0; for(var c=dom.firstElementChild;c;c=c.nextElementSibling) if(c.tagName.toLowerCase()==='block'&&c.getAttribute('type')==='page_root') pages++;
  if(pages!==1) throw new Error('needs exactly one top-level page_root, found '+pages);
  // dry run in a headless workspace (element names known so the name dropdowns accept them)
  var hw=new Blockly.Workspace(), m, rx=/<field name="NAME">([^<]*)<\/field>/g;
  while((m=rx.exec(xml))) BH.KNOWN.add(m[1].replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&amp;/g,'&'));
  try{ Blockly.Events.disable(); Blockly.Xml.domToWorkspace(dom,hw); }catch(e){ throw new Error('Blockly could not load it: '+(e.message||e)); }
  finally{ Blockly.Events.enable(); hw.dispose(); BH.KNOWN.clear(); }
  return xml;
}

/* ---------- dialog ---------- */
var mode='new', before=null, busyNow=false;
var CHIPS={new:[['🔢 숫자 맞히기','1부터 100 사이 숫자 맞히기 게임. 크다/작다를 알려 주고 맞히면 축하해 줘요'],['👆 클릭 카운터','버튼을 누를 때마다 숫자가 올라가는 클릭 카운터'],['📝 할 일 목록','할 일을 쓰고 추가 버튼을 누르면 목록에 쌓이는 할 일 목록'],['⚽ 튀는 공','그림판에 공이 튀어 다니는 애니메이션'],['⚡ 반응 속도','화면이 초록색으로 바뀌면 빨리 누르는 반응 속도 게임']],
  edit:[['🌙 밤하늘 배경','배경을 밤하늘로 바꿔 줘'],['🔊 버튼 소리','버튼을 누르면 소리가 나게 해 줘'],['🎉 10점 축하','점수가 10이 되면 축하 메시지를 띄워 줘'],['🔠 큰 빨간 제목','제목 글자를 더 크고 빨갛게 해 줘']]};
function chips(m){ var box=$('baiChips'); box.innerHTML=''; CHIPS[m].forEach(function(c){ var b=document.createElement('button'), full=T(c[1]); b.textContent=T(c[0]); b.title=full; b.onclick=function(){ $('baiQ').value=full; $('baiQ').focus(); }; box.appendChild(b); }); }
function setMode(m){ mode=m; chips(m); document.querySelectorAll('.btab').forEach(function(b){ b.classList.toggle('on',b.dataset.m===m); });
  $('baiQ').placeholder=m==='new'?T('예: 1부터 100 사이 숫자 맞히기 게임. 크다/작다를 알려 주고 맞히면 축하해 줘요'):T('예: 버튼을 누를 때마다 배경색이 바뀌게 해 줘'); }
function msg(t,cls){ var o=$('baiMsg'); o.textContent=t||''; o.className='baiMsg'+(cls?' '+cls:''); }
var t0=0, tick=null, chars=0, phase='';
function busy(on){ busyNow=on; $('baiGo').disabled=on; $('baiGo').textContent=on?T('만드는 중…'):T('만들기'); $('baiStop').hidden=!on; $('baiBody').classList.toggle('busy',on);
  clearInterval(tick); if(on){ t0=Date.now(); chars=0; $('baiLive').textContent=''; $('baiLive').hidden=true; tick=setInterval(status,500); } }
function status(){ var s=Math.round((Date.now()-t0)/1000);
  msg(phase==='fix'?F('AI 답을 고치는 중… {0}초',s):chars?F('AI가 블록 코드를 쓰는 중… 글자 {0}개 · {1}초',chars,s):F('AI가 생각하는 중… {0}초',s)); }
function live(t){ chars=t.length; var p=$('baiLive'), wasHidden=p.hidden, stick=wasHidden||p.scrollHeight-p.scrollTop-p.clientHeight<24; p.hidden=false; p.textContent=t.length>6000?'…'+t.slice(-6000):t; if(stick) p.scrollTop=p.scrollHeight; } // follows the end only while the reader is at the bottom
function run(q,modify,tries,errText,lastOut){
  phase=errText?'fix':''; chars=0;
  return FFAI.ask({system:SYS, prompt:buildPrompt(q,modify,errText,lastOut), maxTokens:12000, onText:live}).then(function(out){
    try{ return check(extract(out)); }
    catch(e){ if(tries>0){ return run(q,modify,tries-1,e.message,out); } throw new Error(T('AI가 만든 블록을 읽지 못했어요. 다시 해 보세요')); }
  });
}
function go(){
  var q=$('baiQ').value.trim(); if(!q) return $('baiQ').focus(); if(busyNow) return;
  var modify=mode==='edit'; busy(true); status();
  run(q,modify,1).then(function(xml){
    before={name:$('projName').value, ws:Blockly.serialization.workspaces.save(ws)};
    B.loadXML(xml); B.arrange();
    if(!modify){ var pg=ws.getTopBlocks(false).filter(function(b){ return b.type==='page_root'; })[0], t=pg&&pg.getFieldValue('TITLE'); if(t) $('projName').value=t; }
    B.save(); $('baiUndo').hidden=false; busy(false);
    msg(T('다 만들었어요! 미리보기에서 확인해 보세요'),'ok'); close(); B.toast(T('AI가 블록을 만들었어요'));
  },function(e){ busy(false); if(e.kind!=='nokey') msg(e.message||T('AI에 연결하지 못했어요'),'bad'); else msg(''); }).then(function(){ if(busyNow) busy(false); });
}
function undoAI(){ if(!before) return; B.loadJSON(before.ws); $('projName').value=before.name; B.save(); before=null; $('baiUndo').hidden=true; msg(''); B.toast(T('AI 전으로 되돌렸어요')); }
function open(){ setMode(ws.getAllBlocks(false).length>1&&mode==='edit'?'edit':mode); $('baiDlg').classList.add('open'); setTimeout(function(){ $('baiQ').focus(); },60); }
function close(){ $('baiDlg').classList.remove('open'); }
document.querySelectorAll('.btab').forEach(function(b){ b.onclick=function(){ setMode(b.dataset.m); }; });
$('aiBtn').onclick=open;
$('baiGo').onclick=go;
$('baiStop').onclick=function(){ FFAI.stop(); };
$('baiQ').addEventListener('keydown',function(e){ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); go(); } });
$('baiUndo').onclick=undoAI;
$('baiSet').onclick=function(){ FFAI.settings(); };
$('baiClose').onclick=close; $('baiDlg').addEventListener('click',function(e){ if(e.target.id==='baiDlg') close(); });
setMode('new');
window.__bhai={catalog:getCatalog, check:check, open:open, undo:undoAI};
})();
