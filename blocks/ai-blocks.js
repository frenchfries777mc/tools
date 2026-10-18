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
/* lectus 1.3 learned pages in the lean form (no helper block); the other models keep the full page */
function currentHTML(){ var h=B.build(); return FFAI.isTuned()&&FFAI.model&&FFAI.model()==='FF-Tools-4B'&&window.BHX&&BHX.lean?BHX.lean(h):h; }
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
var CHIPS={new:[['👆 클릭 카운터','버튼을 누를 때마다 숫자가 올라가는 클릭 카운터','클릭 카운터'],['📝 할 일 목록','할 일을 쓰고 추가 버튼을 누르면 목록에 쌓이는 할 일 목록','할 일 목록'],['🔢 숫자 맞히기','1부터 100 사이 숫자를 맞히는 게임','숫자 맞히기'],['🧺 과일 받기','떨어지는 과일을 바구니로 받는 게임','과일 받기 게임'],['🚀 우주 슈팅','외계인을 맞히는 우주 슈팅 게임','우주 슈팅'],['🧭 미로 탈출','벽을 피해 별까지 가는 미로 게임','미로 탈출']],
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
var LIB=[['클릭 카운터',['클릭카운터','클릭 카운터','카운터','숫자올라가','숫자가올라가','clickcounter','counter']],['이름 인사',['이름인사','인사하']],
 ['숫자 맞히기',['숫자맞히','숫자맞추','업다운','updown','guessthenumber','numberguess']],['할 일 목록',['할일','투두','todo','to-do']],
 ['반응 속도 게임',['반응속도','reactiontime','reactiongame']],['과일 받기 게임',['과일받기','과일을받','fruitcatch','catchfruit']],
 ['우주 슈팅',['우주슈팅','슈팅게임','spaceshooter','shooting']],['미로 탈출',['미로탈출','미로게임','미로','maze']]]; // v40 examples
function libMatch(q){ var n=String(q||'').toLowerCase().replace(/\s+/g,''); if(n.length>24) return ''; // long requests carry details a stored example cannot follow
  for(var i=0;i<LIB.length;i++) for(var k=0;k<LIB[i][1].length;k++) if(n.indexOf(LIB[i][1][k].replace(/\s+/g,''))>=0) return LIB[i][0];
  return ''; }
function readyGo(q){ var ex=BH_EXAMPLES.filter(function(e){ return e.name===readyEx; })[0]; if(!ex) return false;
  before={name:$('projName').value, ws:Blockly.serialization.workspaces.save(ws)};
  B.loadExample(ex,true); $('projName').value=T(ex.name); B.save(); addHist(q,false,'new'); $('baiUndo').hidden=false; readyEx='';
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

/* ---------- "이 블록 설명해 줘": a compact outline of a block (and the blocks under it) -> one or two sentences.
   Without an AI, or when its answer is junk, the explanation is put together from the blocks' own tooltips and labels. ---------- */
function ownText(b){ var parts=[];
  b.inputList.forEach(function(inp){ inp.fieldRow.forEach(function(f){ var t=f.getText&&f.getText(); if(t&&String(t).trim()) parts.push(String(t).trim()); });
    var c=inp.connection&&inp.type===Blockly.inputs.inputTypes.VALUE&&inp.connection.targetBlock(); if(c) parts.push('('+c.toString(60).replace(/\s+/g,' ')+')'); });
  return parts.join(' ').replace(/\s+/g,' ').slice(0,140); }
function tipOf(b){ var t=b.getTooltip&&b.getTooltip(); return typeof t==='string'?t.replace(/\s+/g,' ').trim():''; }
function stackOf(b){ var out=[]; for(var x=b;x;x=x.getNextBlock()) out.push(x); return out; }
function outlineOf(b,depth,lines){
  stackOf(b).forEach(function(x){ if(lines.length>=40) return; lines.push(new Array(depth+1).join('  ')+ownText(x));
    x.inputList.forEach(function(inp){ var c=inp.type===Blockly.inputs.inputTypes.STATEMENT&&inp.connection&&inp.connection.targetBlock(); if(c) outlineOf(c,depth+1,lines); }); });
  return lines; }
function countOf(b){ var n=0; stackOf(b).forEach(function(x){ n+=x.getDescendants(false).filter(function(d){ return !d.isShadow(); }).length; }); return n; }
function inner(b){ var out=[]; stackOf(b).forEach(function(x){ x.inputList.forEach(function(inp){ var c=inp.type===Blockly.inputs.inputTypes.STATEMENT&&inp.connection&&inp.connection.targetBlock();
    if(c) stackOf(c).forEach(function(y){ var t=ownText(y); if(t&&out.indexOf(t)<0) out.push(t); }); }); }); return out; }
function plainExplain(b){
  var tip=tipOf(b)||ownText(b), list=inner(b).slice(0,3), rest=stackOf(b).slice(1).map(ownText).filter(Boolean).slice(0,3), s=tip.replace(/[.。]?$/,'.');
  if(list.length) s+=' '+F('안에서 하는 일: {0}',list.join(' · '))+'.';
  if(rest.length) s+=' '+F('그다음: {0}',rest.join(' · '))+'.';
  var n=countOf(b); if(n>1) s+=' '+F('(블록 {0}개)',n);
  return s;
}
/* the AI's answer, or '' when it is not one or two plain sentences in the page's language */
function cleanExplain(t,lang){
  t=String(t||'').replace(/<think>[\s\S]*?(<\/think>|$)/g,'').replace(/```[\s\S]*?(```|$)/g,'').replace(/^\s*(?:설명|Explanation|答え|説明)\s*[:：]\s*/i,'').replace(/\s+/g,' ').trim();
  if(t.length<8||t.length>600||/[<>{}]|PLAN:|^\s*[-*•\d]+[.)]?\s/.test(t)) return '';
  var hang=/[가-힣]/.test(t), kana=/[ぁ-んァ-ン]/.test(t), lat=(t.match(/[A-Za-zÀ-ÿ]/g)||[]).length/t.length;
  if(lang==='ko'?!hang:lang==='ja'?!kana:(hang||kana||lat<0.4)) return '';
  var parts=t.match(/[^.!?。！？]+[.!?。！？]+["')\]]*|[^.!?。！？]+$/g)||[t]; t=parts.slice(0,2).join(' ').trim();
  return t.length>320?t.slice(0,320).replace(/\s+\S*$/,'')+'…':t;
}
var exPop=null;
function exUI(){
  if(exPop) return exPop;
  var st=document.createElement('style'); st.textContent='#exPop{position:fixed;z-index:75;width:min(340px,calc(100vw - 24px));background:var(--panel);border:1px solid #5a4a1c;border-radius:12px;padding:10px 12px;box-shadow:0 20px 50px rgba(0,0,0,.55);display:none;font-size:14px;line-height:1.55}'+
    '#exPop.open{display:block} #exPop .eh{display:flex;align-items:center;gap:6px;margin-bottom:4px;color:var(--fry);font-weight:700;font-size:13px} #exPop .eh span{flex:1} #exPop .ex{border:0;background:transparent;color:var(--dim);font-size:20px;cursor:pointer;width:28px;height:28px;border-radius:6px}'+
    '#exPop .en{color:var(--dim);font-size:12px;margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap} #exPop .en button{height:28px;font-size:12px}';
  document.head.appendChild(st);
  exPop=document.createElement('div'); exPop.id='exPop'; exPop.setAttribute('role','dialog'); exPop.setAttribute('data-notr','');
  exPop.innerHTML='<div class="eh"><span></span><button class="ex" aria-label="">×</button></div><div class="et"></div><div class="en"><i></i><button class="tbtn aib es" style="display:none"></button></div>';
  document.body.appendChild(exPop);
  exPop.querySelector('.eh span').textContent='✨ '+T('이 블록 설명'); exPop.querySelector('.ex').setAttribute('aria-label',T('닫기')); exPop.querySelector('.es').textContent=T('AI 설정');
  exPop.querySelector('.ex').onclick=function(){ exPop.classList.remove('open'); };
  return exPop;
}
function exShow(b,text,note,setBtn){
  var p=exUI(); p.querySelector('.et').textContent=text; p.querySelector('.en i').textContent=note||''; var sb=p.querySelector('.es'); sb.style.display=setBtn?'':'none'; sb.onclick=setBtn||null;
  var r=null; try{ r=b.getSvgRoot().getBoundingClientRect(); }catch(e){}
  p.classList.add('open'); var w=p.offsetWidth, h=p.offsetHeight, x=r?r.left:innerWidth/2-w/2, y=r?r.bottom+8:innerHeight/2-h/2;
  if(y+h>innerHeight-8) y=Math.max(8,(r?r.top-h-8:8)); x=Math.max(8,Math.min(x,innerWidth-w-8)); p.style.left=x+'px'; p.style.top=Math.max(8,y)+'px';
}
var exRun=0;
function explainBlock(b){
  if(!b) return; var id=++exRun, lang=FFT.lang||'ko', plain=plainExplain(b);
  if(!window.FFAI||!FFAI.ready()){ exShow(b,plain,T('블록 이름으로 만든 설명이에요. AI를 켜면 더 자연스럽게 설명해요'),function(){ FFAI.settings(function(){ if(FFAI.ready()) explainBlock(b); }); }); return; }
  exShow(b,T('생각하는 중…'),'');
  var lines=outlineOf(b,0,[]).join('\n').slice(0,2400);
  function once(extra){ return FFAI.ask({system:FFP.explainSys(lang), prompt:FFP.explainPrompt(lines)+(extra||''), maxTokens:200, prose:true, ko:lang==='ko'}).then(function(t){ return cleanExplain(t,lang); }); }
  once().then(function(t){ return t||once('\n\nReply with one or two short plain sentences only.'); }).then(function(t){
    if(id!==exRun) return;
    if(t) exShow(b,t,T('AI 설명이에요. 틀릴 수 있어요'));
    else exShow(b,plain,T('AI 답이 알맞지 않아 블록 이름으로 설명했어요'));
  },function(e){ if(id!==exRun) return; exShow(b,plain,e&&e.kind==='nokey'?T('블록 이름으로 만든 설명이에요. AI를 켜면 더 자연스럽게 설명해요'):(e&&e.message||T('AI에 연결하지 못했어요'))); });
}
Blockly.ContextMenuRegistry.registry.register({id:'ffExplain',scopeType:Blockly.ContextMenuRegistry.ScopeType.BLOCK,weight:6,displayText:function(){ return T('이 블록 설명해 줘'); },
  preconditionFn:function(sc){ return sc.block&&!sc.block.isShadow()?'enabled':'hidden'; },callback:function(sc){ explainBlock(sc.block); }});
window.__bhai={explain:explainBlock, plainExplain:plainExplain, cleanExplain:cleanExplain, outline:function(b){ return outlineOf(b,0,[]).join('\n'); }, hist:hist, fix:fixGo, catalog:getCatalog, check:check, open:open, undo:undoAI};
})();
