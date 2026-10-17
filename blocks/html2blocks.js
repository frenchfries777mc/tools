/* HTML -> blocks. Turns a whole HTML page (as the AI writes it) into Blockly XML for the Block HTML editor.
   Plain elements with an id become element blocks; whatever has no block (classes, inline styles, tables, <style>)
   goes into an "HTML 직접 쓰기" block; the script becomes event blocks where the pattern is simple and
   "JS 직접 쓰기" blocks everywhere else, so the page keeps working even when it cannot be shown as friendly blocks. */
(function(){
'use strict';

function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fld(n,v){ return '<field name="'+n+'">'+esc(v)+'</field>'; }

/* ---------- script -> top-level statements ---------- */
function splitStatements(src){
  var out=[], i=0, n=src.length, depth=0, start=0, mode=null, prevSig='';
  function push(end){ var s=src.slice(start,end).trim(); if(s) out.push(s); start=end; }
  function nextWord(from){ var m=/^\s*([A-Za-z_$][\w$]*)/.exec(src.slice(from,from+30)); return m?m[1]:''; }
  while(i<n){
    var c=src[i], d=src[i+1];
    if(mode==='line'){ if(c==='\n') mode=null; i++; continue; }
    if(mode==='block'){ if(c==='*'&&d==='/'){ mode=null; i+=2; } else i++; continue; }
    if(mode==="'"||mode==='"'){ if(c==='\\'){ i+=2; continue; } if(c===mode) mode=null; i++; continue; }
    if(mode==='`'){ if(c==='\\'){ i+=2; continue; } if(c==='`') mode=null; i++; continue; }
    if(c==='/'&&d==='/'){ mode='line'; i+=2; continue; }
    if(c==='/'&&d==='*'){ mode='block'; i+=2; continue; }
    if(c==="'"||c==='"'||c==='`'){ mode=c; i++; continue; }
    if(c==='/'&&/[=(,:;!&|?{}\[]\s*$/.test(src.slice(Math.max(0,i-3),i)+' ')||c==='/'&&prevSig===''){ // regex literal
      var j=i+1, cls=false; while(j<n){ var e=src[j]; if(e==='\\'){ j+=2; continue; } if(e==='[') cls=true; else if(e===']') cls=false; else if(e==='/'&&!cls) break; else if(e==='\n') break; j++; }
      if(src[j]==='/'){ i=j+1; continue; }
    }
    if(c==='('||c==='['||c==='{') depth++;
    else if(c===')'||c===']'||c==='}'){
      depth--;
      if(depth===0&&c==='}'){ // a block ends the statement unless "else", "catch", "finally", "while" (do-while), ")" or "," or "." follows
        var rest=nextWord(i+1), after=/^\s*([,.);\]])/.exec(src.slice(i+1,i+6));
        if(!/^(else|catch|finally|while)$/.test(rest)&&!after) push(i+1);
      }
    }
    else if(c===';'&&depth===0) push(i+1);
    if(!/\s/.test(c)) prevSig=c;
    i++;
  }
  push(n);
  return out;
}

var FN='(?:function\\s*\\(\\s*(\\w*)\\s*\\)|\\(\\s*(\\w*)\\s*\\)\\s*=>|(\\w+)\\s*=>)';
function parseHandler(stmt){
  // X.addEventListener('click', function(){...});  where X is getElementById / $ / querySelector('#id')
  var m=new RegExp('^(?:document\\.getElementById|\\$)\\(\\s*[\'"]([\\w-]+)[\'"]\\s*\\)\\s*\\.addEventListener\\(\\s*[\'"](click)[\'"]\\s*,\\s*'+FN+'\\s*\\{([\\s\\S]*)\\}\\s*\\)\\s*;?$').exec(stmt)
     ||new RegExp('^document\\.querySelector\\(\\s*[\'"]#([\\w-]+)[\'"]\\s*\\)\\s*\\.addEventListener\\(\\s*[\'"](click)[\'"]\\s*,\\s*'+FN+'\\s*\\{([\\s\\S]*)\\}\\s*\\)\\s*;?$').exec(stmt);
  if(m){ var p=m[3]||m[4]||m[5]||'', body=m[6]; if(p&&new RegExp('\\b'+p+'\\b').test(body)) return null; return {kind:'click',id:m[1],body:body}; }
  var t=new RegExp('^setInterval\\(\\s*'+FN+'\\s*\\{([\\s\\S]*)\\}\\s*,\\s*(\\d+(?:\\.\\d+)?)\\s*\\)\\s*;?$').exec(stmt);
  if(t){ var q=t[1]||t[2]||t[3]||''; if(q&&new RegExp('\\b'+q+'\\b').test(t[4])) return null; return {kind:'timer',ms:+t[5],body:t[4]}; }
  var tn=/^setInterval\(\s*([A-Za-z_$][\w$]*)\s*,\s*(\d+(?:\.\d+)?)\s*\)\s*;?$/.exec(stmt);
  if(tn) return {kind:'timer',ms:+tn[2],body:tn[1]+'();'};
  return null;
}

/* ---------- elements ---------- */
var BLOCKED=/^(script|style|link|meta|title|noscript)$/i;
function onlyAttrs(el,allowed){ for(var i=0;i<el.attributes.length;i++){ if(allowed.indexOf(el.attributes[i].name.toLowerCase())<0) return false; } return true; }
function hasKids(el){ return el.children.length>0; }
function numAttr(el,a,def){ var v=parseInt(el.getAttribute(a),10); return v>0?v:def; }

function convert(html){
  var doc=new DOMParser().parseFromString(String(html||''),'text/html');
  var names={}, used={}, seq=0, stats={blocks:0,raw:0,rawHtml:0}, ids={};
  function nameFor(el,base){ var id=el.getAttribute('id'); if(id&&!used[id]){ used[id]=1; return id; } var n; do{ n=base+(++seq); }while(used[n]||doc.getElementById(n)); used[n]=1; return n; }
  function mark(el){ var n=el.getAttribute('id'); if(n) ids[n]=1; }
  var styleCss=''; Array.prototype.forEach.call(doc.querySelectorAll('style'),function(s){ styleCss+=s.textContent+'\n'; });

  function rawBlock(el){ stats.rawHtml++; return {xml:function(next){ return '<block type="el_html">'+fld('CODE',el.outerHTML.replace(/\s*\n\s*/g,' ').trim())+(next?'<next>'+next+'</next>':'')+'</block>'; }}; }
  function chain(items){ return items.reduceRight(function(acc,it){ return it.xml(acc); },''); }
  function elementBlock(el){
    var tag=el.tagName.toLowerCase(), id=el.getAttribute('id');
    if(BLOCKED.test(tag)) return null;
    var text=el.textContent.replace(/\s+/g,' ').trim();
    var mk=function(type,fields,inner){ stats.blocks++; if(id) names[id]=1; return {xml:function(next){ return '<block type="'+type+'">'+fields+(inner||'')+(next?'<next>'+next+'</next>':'')+'</block>'; }}; };
    if(/^h[1-3]$/.test(tag)&&!hasKids(el)&&onlyAttrs(el,['id'])) return mk('el_heading',fld('SIZE',tag)+fld('TEXT',text)+fld('NAME',nameFor(el,'제목')));
    if(/^h[4-6]$/.test(tag)&&!hasKids(el)&&onlyAttrs(el,['id'])) return mk('el_heading',fld('SIZE','h3')+fld('TEXT',text)+fld('NAME',nameFor(el,'제목')));
    if((tag==='p'||tag==='span'||tag==='div')&&!hasKids(el)&&onlyAttrs(el,['id'])&&(text||tag!=='div'||id)) return mk('el_text',fld('TEXT',text)+fld('NAME',nameFor(el,'글')));
    if(tag==='button'&&!hasKids(el)&&onlyAttrs(el,['id','type'])) return mk('el_button',fld('TEXT',text)+fld('NAME',nameFor(el,'버튼')));
    if(tag==='input'){ var ty=(el.getAttribute('type')||'text').toLowerCase();
      if((ty==='text'||ty==='number')&&onlyAttrs(el,['id','type','placeholder'])) return mk('el_input',fld('KIND',ty)+fld('TEXT',el.getAttribute('placeholder')||'')+fld('NAME',nameFor(el,'입력'))); }
    if(tag==='img'&&el.getAttribute('src')&&onlyAttrs(el,['id','src','width','alt'])) return mk('el_image',fld('SRC',el.getAttribute('src'))+fld('W',numAttr(el,'width',240))+fld('NAME',nameFor(el,'그림')));
    if(tag==='a'&&!hasKids(el)&&onlyAttrs(el,['id','href','target'])) return mk('el_link',fld('TEXT',text)+fld('HREF',el.getAttribute('href')||'')+fld('NAME',nameFor(el,'링크')));
    if(tag==='canvas'&&onlyAttrs(el,['id','width','height'])) return mk('el_canvas',fld('W',numAttr(el,'width',320))+fld('H',numAttr(el,'height',220))+fld('NAME',nameFor(el,'그림판')));
    if(tag==='ul'&&!hasKids(el)&&!text&&onlyAttrs(el,['id'])) return mk('el_list',fld('NAME',nameFor(el,'목록')));
    if(tag==='br'&&!el.attributes.length) return mk('el_space','');
    if(tag==='div'&&hasKids(el)&&onlyAttrs(el,['id'])&&!el.getAttribute('class')){
      var kids=bodyItems(el); return mk('el_box',fld('DIR','col')+fld('BG','')+fld('NAME',nameFor(el,'상자')),kids.length?'<statement name="BODY">'+chain(kids)+'</statement>':'');
    }
    return rawBlock(el);
  }
  function bodyItems(parent){
    var items=[];
    Array.prototype.forEach.call(parent.childNodes,function(n){
      if(n.nodeType===3){ var t=n.textContent.replace(/\s+/g,' ').trim(); if(t){ stats.rawHtml++; items.push({xml:function(next){ return '<block type="el_text">'+fld('TEXT',t)+fld('NAME',nameFor({getAttribute:function(){ return null; }},'글'))+(next?'<next>'+next+'</next>':'')+'</block>'; }}); } return; }
      if(n.nodeType!==1) return;
      var b=elementBlock(n); if(b) items.push(b);
    });
    return items;
  }

  /* page */
  var title=(doc.title||'').trim()||'나의 웹페이지';
  var bodyEl=doc.body, items=[];
  if(styleCss.trim()){ stats.rawHtml++; items.push({xml:function(next){ return '<block type="el_html">'+fld('CODE','<style>'+styleCss.trim().replace(/\n\s*/g,' ')+'</style>')+(next?'<next>'+next+'</next>':'')+'</block>'; }}); }
  items=items.concat(bodyItems(bodyEl));

  /* script */
  var code=''; Array.prototype.forEach.call(doc.querySelectorAll('script'),function(s){ if(!s.src) code+=s.textContent+'\n'; });
  var tops=[], statements=splitStatements(code), starts=[];
  statements.forEach(function(st){
    var h=parseHandler(st);
    if(h&&h.kind==='click'&&names[h.id]){ stats.blocks++; tops.push('<block type="ev_click">'+fld('EL',h.id)+'<statement name="DO"><block type="js_raw">'+fld('CODE',h.body.trim())+'</block></statement></block>'); return; }
    if(h&&h.kind==='timer'&&h.ms>=20){ stats.blocks++; tops.push('<block type="ev_timer">'+fld('SEC',+(h.ms/1000).toFixed(3))+'<statement name="DO"><block type="js_raw">'+fld('CODE',h.body.trim())+'</block></statement></block>'); return; }
    stats.raw++; starts.push('<block type="js_raw">'+fld('CODE',st)+'</block>');
  });
  if(starts.length){ var s=starts.reduceRight(function(acc,x){ return acc?x.replace(/<\/block>$/,'<next>'+acc+'</next></block>'):x; },''); tops.unshift('<block type="ev_start"><statement name="DO">'+s+'</statement></block>'); }

  var x=20, y=20;
  var xml='<xml xmlns="https://developers.google.com/blockly/xml"><block type="page_root" x="20" y="20">'+fld('TITLE',title)+fld('BG','#ffffff')+fld('CENTER','FALSE')+(items.length?'<statement name="BODY">'+chain(items)+'</statement>':'')+'</block>'+tops.map(function(t,i){ return t.replace('<block ','<block x="440" y="'+(20+i*200)+'" '); }).join('')+'</xml>';
  return {xml:xml, title:title, stats:stats};
}

/* last resort: the whole page as one HTML block and the whole script as one JS block (keeps working, just not friendly blocks) */
function fallback(html){
  var doc=new DOMParser().parseFromString(String(html||''),'text/html'), code='', css='';
  Array.prototype.forEach.call(doc.querySelectorAll('script'),function(sc){ if(!sc.src) code+=sc.textContent+'\n'; sc.parentNode.removeChild(sc); });
  Array.prototype.forEach.call(doc.querySelectorAll('style'),function(st){ css+=st.outerHTML; st.parentNode.removeChild(st); });
  var body=(css+doc.body.innerHTML).replace(/\n\s*/g,' ').trim(), title=(doc.title||'').trim()||'나의 웹페이지';
  var xml='<xml xmlns="https://developers.google.com/blockly/xml"><block type="page_root" x="20" y="20">'+fld('TITLE',title)+fld('BG','#ffffff')+fld('CENTER','FALSE')+
    '<statement name="BODY"><block type="el_html">'+fld('CODE',body)+'</block></statement></block>'+
    (code.trim()?'<block type="ev_start" x="440" y="20"><statement name="DO"><block type="js_raw">'+fld('CODE',code.trim())+'</block></statement></block>':'')+'</xml>';
  return {xml:xml, title:title, stats:{blocks:0,raw:code.trim()?1:0,rawHtml:1}};
}
window.BHX={convert:convert, fallback:fallback, splitStatements:splitStatements};
})();
