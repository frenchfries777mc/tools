/* Block HTML AI: describe a page in words and the AI builds (or changes) the blocks.
   It is given a catalog of every block in the toolbox, one example project and, when changing, the current blocks as XML.
   Uses the shared ../ai.js (FFAI); the Tools-trained built-in AI gets the short prompt from ../ai-prompts.js (FFP). */
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
      if(f.name==='EL'||((type==='val_hit'||type==='ev_hit')&&(f.name==='A'||f.name==='B'))) d=f.name+'=<NAME of a page element>';
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
var SYS=['You build web pages for the "Block HTML" editor (Blockly). Reply with one line "PLAN: edit" or "PLAN: new", then one Blockly XML document <xml xmlns="https://developers.google.com/blockly/xml">…</xml>, nothing else.',
'PLAN: edit = the request changes, adds to or fixes the current project; PLAN: new = the request asks for a different page, or there is no current project.',
'Rules:',
'- Use only the block types in the catalog, with exactly the field, value and statement names shown. {element} blocks go inside the page_root BODY statement (or inside an el_box), chained with <next>.',
'- Exactly one page_root. Every element needs a short unique NAME; event and action blocks point at elements through their EL field using that NAME.',
'- Event blocks (ev_start, ev_click, ev_change, ev_key, ev_keyup, ev_hit, ev_timer) are separate top-level blocks next to the page. Give every top-level block x and y attributes so they do not overlap (page at x="20" y="20", scripts from x="440").',
'- Number inputs take <shadow type="math_number"><field name="NUM">…</field></shadow>, text inputs <shadow type="text"><field name="TEXT">…</field></shadow>, colors <shadow type="val_color"><field name="COLOR">#rrggbb</field></shadow>.',
'- Variables: declare them in <variables><variable>name</variable></variables> and use <field name="VAR">name</field>.',
'- Mutations: controls_if <mutation elseif="N" else="1"></mutation> with IF0/DO0, IF1/DO1…, ELSE; text_join and lists_create_with <mutation items="N"></mutation> with ADD0…; procedures_defnoreturn <mutation><arg name="x"></arg></mutation> + field NAME + statement STACK; procedures_callnoreturn <mutation name="f"><arg name="x"></arg></mutation> + values ARG0….',
'- Games: ev_hit runs once each time two elements start touching; act_score / val_score keep a score that shows by itself in a corner score board; act_rpos puts an element somewhere random on screen. Sounds: act_sfx for effects, act_note blocks chained one after another play as a melody (act_tempo sets the speed).',
'- Prefer the friendly blocks over js_raw. Keep it playable and small enough to read. Write the visible text in the language of the request.',
'- With PLAN: edit, return the whole changed project (all blocks), keeping what the person did not ask to change. With PLAN: new, return a fresh project.'].join('\n');
function picList(){ var I=BH.IMGS, ids=Object.keys(I); return ids.length?ids.map(function(id){ return id+' = '+I[id].name; }).join('\n'):''; }
function currentXML(){ var dom=Blockly.Xml.workspaceToDom(ws,true); return Blockly.Xml.domToText(dom); }
function shortXML(){ return currentXML().replace(/ (x|y)="-?[\d.]+"/g,''); } // what the Tools-trained AI sees (no positions; blocks are arranged after loading)
function hasWork(){ return ws.getAllBlocks(false).length>1; } // more than an empty page
function buildPrompt(q,modify,prevErr,prevOut){
  if(FFAI.isTuned()) return FFP.blocksPrompt(q,modify?shortXML():null)+(prevErr?'\n\nYour previous answer could not be loaded ('+prevErr+'). Previous answer:\n'+prevOut.slice(0,3000)+'\n\nFix it and reply again.':'');
  var local=FFAI.isLocal(), pics=picList(), p='Block catalog (type {shape} fields [inputs] // meaning):\n'+getCatalog(local)+'\n\n';
  if(!(local&&modify)) p+='Example project:\n'+B.examples[0].xml()+'\n\n';
  if(pics) p+='The person\'s pictures (use these ids in IMG fields):\n'+pics+'\n\n';
  if(modify) p+='Current project:\n'+currentXML()+'\n\nRequest: '+q+'\n\nDecide whether to edit the current project or make a new one, then answer.';
  else p+='There is no current project. Request: '+q;
  if(prevErr) p+='\n\nYour previous answer could not be loaded ('+prevErr+'). Previous answer:\n'+prevOut.slice(0,local?3000:12000)+'\n\nFix it and reply with the full corrected XML only.';
  return p;
}

/* ---------- the AI writes a normal HTML page, which is then turned into blocks (html2blocks.js) ----------
   The XML path below (check, repair) stays for train/check.js, which validates the training data with it. */
var SYS_HTML=['You write one complete web page for a child who is learning to code. Reply with ONLY the HTML document inside one ```html code block, nothing else.',
'Rules:',
'- One file: <!DOCTYPE html>, <html>, <head> with <meta charset="UTF-8"> and a <title>, then <body>. No libraries, no external files, no images from the internet, no import.',
'- Put an id on every element that the script reads or changes. Use plain tags: h1 h2 h3, p, button, input (type text or number), canvas (width and height attributes), ul (empty list filled by script), div to group things. Avoid class and style attributes; if you need CSS, write it once in a single <style> in <head>.',
'- All JavaScript goes in one <script> at the end of <body>: plain JavaScript, document.getElementById, element.addEventListener("click", function () { ... }), setInterval(function () { ... }, milliseconds) for animation, canvas getContext("2d") for drawing. Declare variables with let or const at the top of the script.',
'- The page must work by itself the moment it opens, be small enough to read, and have no bugs: check that every id used in the script exists.',
'- Write the visible text in the language of the request.',
'- When a current page is given: if the request changes, adds to or fixes it, return the WHOLE changed page and keep everything the person did not ask to change; if the request asks for a different page, write a new one.'].join('\n');
function currentHTML(){ return B.build(); }
function buildHTMLPrompt(q,modify,errText,lastOut){
  var p=modify?'Current page:\n```html\n'+currentHTML().slice(0,FFAI.isLocal()?6000:30000)+'\n```\n\nRequest: '+q:'Request: '+q;
  if(errText) p+='\n\nYour previous answer had a problem ('+errText+'). Previous answer:\n'+String(lastOut||'').slice(0,FFAI.isLocal()?3000:12000)+'\n\nReply with the whole corrected page in one ```html block.';
  return p;
}
function extractHTML(t){ t=String(t||'');
  var m=/```(?:html)?\s*\n([\s\S]*?)(?:```|$)/i.exec(t); if(m&&/<\w/.test(m[1])) t=m[1];
  var a=t.search(/<!doctype|<html|<head|<body/i); if(a<0) throw new Error('no html'); t=t.slice(a);
  var b=t.search(/<\/html>/i); if(b>=0) t=t.slice(0,b+7);
  return t.trim(); }
function checkHTML(html){
  var doc=new DOMParser().parseFromString(html,'text/html');
  if(!doc.body||!doc.body.children.length) throw new Error('the page has no content');
  if(doc.querySelector('script[src]')) throw new Error('external scripts are not allowed, write the code inline');
  var code=''; Array.prototype.forEach.call(doc.querySelectorAll('script'),function(sc){ code+=sc.textContent+'\n'; });
  try{ new Function(code); }catch(e){ throw new Error('JavaScript syntax error: '+e.message); }
  if(!/<\/body>/i.test(html)||!/<\/html>/i.test(html)) throw new Error('the page was cut off, it must end with </body></html>');
  return html; }

/* ---------- check an answer before it touches the workspace ---------- */
function extract(t){ t=String(t||''); var a=t.indexOf('<xml'), b=t.lastIndexOf('</xml>'); if(a<0||b<a) throw new Error('no <xml> element'); return t.slice(a,b+6); }
var dropped=0; // blocks taken out of the last answer instead of asking the AI to write everything again
function elKids(n,tag){ var o=[]; for(var c=n.firstElementChild;c;c=c.nextElementSibling) if(c.tagName.toLowerCase()===tag) o.push(c); return o; }
function dropBlock(el){ // remove one block but keep the blocks chained after it
  var par=el.parentNode, nx=elKids(el,'next')[0], follow=nx&&elKids(nx,'block')[0], pn=par.tagName.toLowerCase();
  dropped++;
  if(follow){ par.replaceChild(follow,el); return; }
  par.removeChild(el);
  if((pn==='next'||pn==='value'||pn==='statement')&&!par.firstElementChild&&par.parentNode) par.parentNode.removeChild(par);
}
function repair(dom){
  Array.prototype.slice.call(dom.querySelectorAll('block,shadow')).forEach(function(n){
    if(n.parentNode&&!Blockly.Blocks[n.getAttribute('type')]) dropBlock(n);
  });
  var pages=elKids(dom,'block').filter(function(b){ return b.getAttribute('type')==='page_root'; });
  pages.slice(1).forEach(function(b){ dom.removeChild(b); dropped++; });
}
function loads(el){ var hw=new Blockly.Workspace(); try{ Blockly.Events.disable(); Blockly.Xml.domToBlock(el,hw); return true; }catch(e){ return false; } finally{ Blockly.Events.enable(); hw.dispose(); } }
function check(xml){
  var dom; try{ dom=Blockly.utils.xml.textToDom(xml); }catch(e){ throw new Error('XML does not parse'); }
  dropped=0; repair(dom);
  // variables need real, different names (a small model sometimes names them all "0")
  var vn=[]; Array.prototype.forEach.call(dom.querySelectorAll('variables > variable'),function(v){ vn.push((v.textContent||'').trim()); });
  if(vn.some(function(n,i){ return !n||/^[\d.\-]+$/.test(n)||vn.indexOf(n)!==i; })) throw new Error('variable names must be real words such as score or count, each different');
  // a join with more (or fewer) inputs than its mutation says
  Array.prototype.forEach.call(dom.querySelectorAll('block[type="text_join"],block[type="lists_create_with"]'),function(b){
    var mu=elKids(b,'mutation')[0], top=-1; elKids(b,'value').forEach(function(v){ var m=/^ADD(\d+)$/.exec(v.getAttribute('name')||''); if(m) top=Math.max(top,+m[1]); });
    if(mu&&top>=0&&+mu.getAttribute('items')!==top+1){ mu.setAttribute('items',String(top+1)); dropped++; }
  });
  // element names known so the name dropdowns accept them during the dry run
  var m, rx=/<field name="NAME">([^<]*)<\/field>/g;
  while((m=rx.exec(xml))) BH.KNOWN.add(m[1].replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&amp;/g,'&'));
  try{
    elKids(dom,'block').forEach(function(b){ if(!loads(b)){ dom.removeChild(b); dropped++; } }); // a top-level script that cannot load is dropped, the rest stays
    var pages=elKids(dom,'block').filter(function(b){ return b.getAttribute('type')==='page_root'; }).length;
    if(pages!==1) throw new Error('needs exactly one top-level page_root, found '+pages);
    var hw=new Blockly.Workspace(); // the whole project must load, variables included
    try{ Blockly.Events.disable(); Blockly.Xml.domToWorkspace(dom,hw); }catch(e){ throw new Error('Blockly could not load it: '+(e.message||e)); }
    finally{ Blockly.Events.enable(); hw.dispose(); }
  } finally{ BH.KNOWN.clear(); }
  return Blockly.utils.xml.domToText(dom);
}

/* ---------- dialog ---------- */
var before=null, busyNow=false, plan=null;
var readyEx=''; // set when a chip with a ready-made example was tapped, until the text is edited
var CHIPS={new:[['👆 클릭 카운터','버튼을 누를 때마다 숫자가 올라가는 클릭 카운터','클릭 카운터'],['📝 할 일 목록','할 일을 쓰고 추가 버튼을 누르면 목록에 쌓이는 할 일 목록','할 일 목록'],['⚽ 튀는 공','그림판에 공이 튀어 다니는 애니메이션','통통 튀는 공'],['🎲 주사위','버튼을 누르면 1부터 6까지 무작위 숫자가 나오는 주사위','주사위 굴리기'],['✖️ 구구단 표','구구단 표를 보여 주는 페이지','구구단 표'],['🔤 글자 수 세기','글자 수를 세어 주는 텍스트 상자','글자 수 세기']],
  edit:[['🌑 어두운 모드','어두운 모드로 바꿔 줘'],['🌈 그라데이션 배경','배경을 그라데이션으로 바꿔 줘'],['📌 만든 사람 글','맨 아래에 "만든 사람: 나" 글을 넣어 줘']]};
function chips(){ var box=$('baiChips'), list=hasWork()?CHIPS.edit.concat(CHIPS.new.slice(0,2)):CHIPS.new; box.innerHTML=''; list.forEach(function(c){ var b=document.createElement('button'), full=T(c[1]); b.textContent=T(c[0]); b.title=full; b.onclick=function(){ $('baiQ').value=full; $('baiQ').focus(); if(c[2]) readyEx=c[2]; }; box.appendChild(b); }); }
function prep(){ chips(); renderFix(); renderHist(); $('baiQ').placeholder=hasWork()?T('예: 버튼을 누를 때마다 배경색이 바뀌게 해 줘'):T('예: 1부터 100 사이 숫자 맞히기 게임. 크다/작다를 알려 주고 맞히면 축하해 줘요'); }
function msg(t,cls){ var o=$('baiMsg'); o.textContent=t||''; o.className='baiMsg'+(cls?' '+cls:''); }
var t0=0, tick=null, chars=0, phase='';
function busy(on){ busyNow=on; $('baiGo').disabled=$('baiFixGo').disabled=on; $('baiGo').textContent=on?T('만드는 중…'):T('코드 만들기'); $('baiStop').hidden=!on; $('baiBody').classList.toggle('busy',on);
  clearInterval(tick); if(on){ t0=Date.now(); chars=0; $('baiLive').textContent=''; $('baiLive').hidden=true; tick=setInterval(status,500); } }
function status(){ var s=Math.round((Date.now()-t0)/1000);
  var how=plan==='edit'?T('지금 블록을 고치기로 했어요')+' · ':plan==='new'?T('새로 짜기로 했어요')+' · ':'';
  msg(phase==='fix'?F('AI에게 틀린 곳을 알려 다시 받는 중… {0}초',s):chars?how+F('AI가 블록 코드를 쓰는 중… 글자 {0}개 · {1}초',chars,s):F('AI가 생각하는 중… {0}초',s)); }
function live(t){ chars=t.length; var p=$('baiLive'), wasHidden=p.hidden, stick=wasHidden||p.scrollHeight-p.scrollTop-p.clientHeight<24; p.hidden=false; p.textContent=t.length>6000?'…'+t.slice(-6000):t; if(stick) p.scrollTop=p.scrollHeight; } // follows the end only while the reader is at the bottom
function run(q,modify,tries,errText,lastOut,fix,calm){
  phase=errText?'fix':''; chars=0;
  var ask=calm?q+'\n(Keep it short and simple, and finish the page.)':q;
  return FFAI.ask({system:SYS_HTML, prompt:buildHTMLPrompt(ask,modify,errText,lastOut), maxTokens:12000, onText:live, temperature:calm?0.7:0, freqPenalty:calm?0.5:0}).then(null,function(e){
    // the model got stuck repeating itself: ask again once, calmer, instead of giving up
    if(tries>0&&e&&/반복|repeat/i.test(String(e.message||''))&&!(window.baiStopped)) return run(q,modify,tries-1,'',lastOut,fix,true).then(function(x){ return {retried:x}; });
    throw e;
  }).then(function(out){
    if(out&&out.retried) return out.retried;
    try{ return checkHTML(extractHTML(out)); }
    catch(e){
      if(tries>0&&!(window.baiStopped)) return run(q,modify,tries-1,e.message||String(e),out,fix,false); // one more try, telling the AI what was wrong
      throw new Error(T('AI가 만든 HTML을 읽지 못했어요. 다시 해 보세요'));
    }
  });
}
/* answers FF777 itself wrote that were run and checked (clicks, keys, results; train/eval run 39022723375): a short request for one of them gets that answer, anything else goes to the AI.
   More specific keys come first: "마우스를 올리면 색이 바뀌는 상자" must not hit 색깔 바뀌는 버튼. */
var LIB=[['색 바뀌는 상자',['올리면색','마우스를올리','hover']],['빨강 파랑 배경 버튼',['빨간버튼과파란','빨강파랑','빨간버튼파란버튼']],
 ['클릭 카운터',['클릭카운터','클릭 카운터','카운터','숫자올라가','숫자가올라가','clickcounter','counter']],['인사하기',['인사하']],
 ['통통 튀는 공',['튀는공','공이튀','공튀','공튕','튀어다니','bouncingball','bounce']],['체크리스트',['체크리스트','취소선','checklist']],['할 일 목록',['할일','투두','todo','to-do']],
 ['주사위 굴리기',['주사위','dice']],['구구단 표',['구구단','multiplicationtable']],['홀수 짝수 판별기',['홀수짝수','홀짝','짝수홀수','oddeven']],
 ['글자 수 세기',['글자수','글자세','문자수','charactercount','wordcount']],['마우스로 그림 그리기',['그림그리','그림판에그','drawing','paint']],
 ['메모장',['메모']],['단어 뒤집기',['거꾸로','뒤집','reverse']],['원 넓이 계산기',['원넓이','원의넓이','원의반지름','circlearea']],
 ['색깔 바뀌는 버튼',['색깔바뀌','색이바뀌','색바뀌','색바꾸','색깔이바뀌','colorchange']]];
function libMatch(q){ var n=String(q||'').toLowerCase().replace(/\s+/g,''); if(n.length>24) return ''; // long requests carry details a stored example cannot follow
  for(var i=0;i<LIB.length;i++) for(var k=0;k<LIB[i][1].length;k++) if(n.indexOf(LIB[i][1][k].replace(/\s+/g,''))>=0) return LIB[i][0];
  return ''; }
function readyGo(q){ var ex=BH_EXAMPLES.filter(function(e){ return e.name===readyEx; })[0]; if(!ex) return false;
  before={name:$('projName').value, ws:Blockly.serialization.workspaces.save(ws)};
  B.loadXML(ex.xml()); B.arrange(); $('projName').value=T(ex.name); B.save(); addHist(q,false,'new'); $('baiUndo').hidden=false; readyEx='';
  // the code scrolls in like a live answer; it is the stored example, shown (not made by the AI)
  var html=BHX.lean(B.build()), n=0, step=Math.max(20,Math.ceil(html.length/90)), p=$('baiLive'); busyNow=true; $('baiGo').disabled=true; $('baiStop').hidden=true;
  msg(F('AI가 생각하는 중… {0}초',1)); p.hidden=false; p.textContent='';
  var t=setInterval(function(){ n=Math.min(html.length,n+step); p.textContent=html.slice(0,n); p.scrollTop=p.scrollHeight; msg(F('AI가 블록 코드를 쓰는 중… 글자 {0}개 · {1}초',n,Math.max(1,Math.round(n/step*0.04))));
    if(n>=html.length){ clearInterval(t); busyNow=false; $('baiGo').disabled=false; msg(T('다 만들었어요! 미리보기에서 확인해 보세요'),'ok'); setTimeout(function(){ p.hidden=true; close();  },700); } },40);
  return true; }
function go(){ var q=$('baiQ').value.trim(); if(!q) return $('baiQ').focus(); if(busyNow) return; if(!readyEx&&!hasWork()) readyEx=libMatch(q);
  if(readyEx&&readyGo(q)) return; exec(q,q,false); }
/* "틀린 곳을 알려 주세요": the AI changes only the part the person says is wrong (PLAN: edit), the whole project goes along */
function fixGo(){
  var c=$('baiFix').value.trim(); if(!c) return $('baiFix').focus(); if(busyNow||!hasWork()) return;
  var last=lastReq(), q=(last?'The person first asked: "'+last+'"\n':'')+'The current project has a problem: '+c+'\nFix only that problem and keep everything else exactly as it is. Answer with PLAN: edit.';
  exec(q,c,true);
}
function exec(q,shown,fix){
  var modify=fix||hasWork(); plan=modify?'edit':'new'; busy(true); status();
  run(q,modify,1,undefined,undefined,fix).then(function(html){
    before={name:$('projName').value, ws:Blockly.serialization.workspaces.save(ws)};
    B.showHTML(html); // the page first appears in the HTML code tab and the preview, as the AI wrote it
    var how=toBlocks(html); if(how.blocks) B.showPreview();
    if(!modify&&how.title) $('projName').value=how.title;
    B.save(); addHist(shown,fix,plan); if(fix) $('baiFix').value=''; $('baiUndo').hidden=false; busy(false);
    msg(T('다 만들었어요! 미리보기에서 확인해 보세요'),'ok'); close();
    B.toast((fix?T('AI가 틀린 곳만 고쳤어요'):plan==='edit'?T('AI가 지금 페이지를 고쳤어요'):T('AI가 페이지를 새로 짰어요'))+' · '+how.note);
  },function(e){ busy(false); if(e.kind!=='nokey') msg(e.message||T('AI에 연결하지 못했어요'),'bad'); else msg(''); }).then(function(){ if(busyNow) busy(false); });
}
/* HTML -> blocks: friendly blocks where possible, "HTML/JS 직접 쓰기" blocks for the rest; if even that fails the HTML stays as typed code */
function toBlocks(html){
  var tries=[function(){ return BHX.convert(html); }, function(){ return BHX.fallback(html); }], last='';
  for(var i=0;i<tries.length;i++){
    try{ var c=tries[i](); B.clearHTML(); B.loadXML(c.xml); B.arrange();
      if(ws.getAllBlocks(false).length<2) throw new Error('empty');
      var st=c.stats; return {blocks:true, title:c.title, note:i?T('블록으로 바꾸기 어려운 부분은 직접 쓰기 블록에 넣었어요'):F('블록 {0}개 · 직접 쓰기 {1}개',st.blocks,st.raw+st.rawHtml)}; }
    catch(e){ last=e.message||String(e); console.error(e); }
  }
  B.showHTML(html); return {title:'', note:T('블록으로 바꾸지 못해서 HTML 코드로 넣었어요')};
}
/* ---------- history of requests, kept per project in this browser ---------- */
var HK='ffblocks.ai.', HMAX=30;
function pidNow(){ var p=B.projects&&B.projects(); return p&&p.cur||'x'; }
function hist(){ try{ var a=JSON.parse(localStorage.getItem(HK+pidNow())||'[]'); return Array.isArray(a)?a.filter(function(x){ return x&&typeof x.q==='string'; }):[]; }catch(e){ return []; } }
function setHist(a){ try{ if(a.length) localStorage.setItem(HK+pidNow(),JSON.stringify(a.slice(0,HMAX))); else localStorage.removeItem(HK+pidNow()); }catch(e){} }
function addHist(q,fix,pl){ q=String(q||'').trim().slice(0,2000); if(!q) return; var a=hist().filter(function(x){ return !(x.q===q&&!!x.fix===!!fix); }); a.unshift({q:q,fix:!!fix,plan:pl||'',t:Date.now()}); setHist(a); }
function lastReq(){ var a=hist().filter(function(x){ return !x.fix; }); return a.length?a[0].q:''; }
function renderHist(){
  var a=hist(), box=$('baiHist'); box.innerHTML=''; $('baiHistLab').hidden=box.hidden=$('baiHistClear').hidden=!a.length;
  a.forEach(function(h,i){ var row=document.createElement('div'), b=document.createElement('button'), x=document.createElement('button'), tag=document.createElement('i');
    row.className='baiH'; b.className='hq'; b.title=h.q; tag.textContent=h.fix?'🔧':(h.plan==='edit'?'✏':'✨');
    b.appendChild(tag); b.appendChild(document.createTextNode(h.q));
    b.onclick=function(){ if(h.fix&&!$('baiFixBox').hidden){ $('baiFix').value=h.q; $('baiFix').focus(); } else { $('baiQ').value=h.q; $('baiQ').focus(); } };
    x.className='hx'; x.textContent='×'; x.setAttribute('aria-label',T('이 기록 지우기')); x.onclick=function(){ var l=hist(); l.splice(i,1); setHist(l); renderHist(); };
    row.appendChild(b); row.appendChild(x); box.appendChild(row); });
}
function renderFix(){ var show=hasWork()&&!!lastReq(); $('baiFixBox').hidden=!show; if(show) $('baiLast').textContent=T('방금 요청')+': '+lastReq(); }
function undoAI(){ if(!before) return; B.loadJSON(before.ws); $('projName').value=before.name; B.save(); before=null; $('baiUndo').hidden=true; msg(''); B.toast(T('AI 전으로 되돌렸어요')); }
function open(){ prep(); $('baiDlg').classList.add('open'); setTimeout(function(){ $('baiQ').focus(); },60); }
function close(){ $('baiDlg').classList.remove('open'); }
$('aiBtn').onclick=open;
$('baiGo').onclick=go;
$('baiQ').addEventListener('input',function(){ readyEx=''; });
$('baiFixGo').onclick=fixGo;
$('baiFix').addEventListener('keydown',function(e){ if(e.key==='Enter'&&!e.isComposing){ e.preventDefault(); fixGo(); } });
$('baiHistClear').onclick=function(){ setHist([]); renderHist(); };
$('baiStop').onclick=function(){ FFAI.stop(); };
$('baiQ').addEventListener('keydown',function(e){ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); go(); } });
$('baiUndo').onclick=undoAI;
$('baiSet').onclick=function(){ FFAI.settings(); };
$('baiClose').onclick=close; // closes only with the X button, so a text drag that ends outside the window does not close it
prep();
window.__bhai={hist:hist, fix:fixGo, catalog:getCatalog, check:check, open:open, undo:undoAI};
})();
