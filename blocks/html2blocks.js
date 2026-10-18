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

function convert(html,opts){
  var big=!!(opts&&opts.big)||String(html||'').length>150000;
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
    var items=[], restBuf='';
    function flushRest(){ if(!restBuf.trim()) { restBuf=''; return; } var code=restBuf.replace(/\s*\n\s*/g,' ').trim(); restBuf=''; stats.rawHtml++; items.push({xml:function(next){ return '<block type="el_html">'+fld('CODE',code)+(next?'<next>'+next+'</next>':'')+'</block>'; }}); }
    Array.prototype.forEach.call(parent.childNodes,function(n){
      /* a very big page: after 300 blocks the rest goes into a few big HTML blocks (a block per element would be far too many) */
      if(big&&parent===doc.body&&items.length>=300){ restBuf+=(n.nodeType===1?n.outerHTML:n.nodeType===3?n.textContent:'')+'\n'; if(restBuf.length>30000) flushRest(); return; }
      if(n.nodeType===3){ var t=n.textContent.replace(/\s+/g,' ').trim(); if(t){ stats.rawHtml++; items.push({xml:function(next){ return '<block type="el_text">'+fld('TEXT',t)+fld('NAME',nameFor({getAttribute:function(){ return null; }},'글'))+(next?'<next>'+next+'</next>':'')+'</block>'; }}); } return; }
      if(n.nodeType!==1) return;
      var b=elementBlock(n); if(b) items.push(b);
    });
    flushRest();
    return items;
  }

  /* page */
  var title=(doc.title||'').trim()||'나의 웹페이지';
  var bodyEl=doc.body, items=[];
  if(styleCss.trim()){ stats.rawHtml++; items.push({xml:function(next){ return '<block type="el_html">'+fld('CODE','<style>'+styleCss.trim().replace(/\n\s*/g,' ')+'</style>')+(next?'<next>'+next+'</next>':'')+'</block>'; }}); }
  items=items.concat(bodyItems(bodyEl));

  /* libraries the page loads from outside (script src, stylesheet links) stay as they are, at the top of the page */
  var libs=[]; Array.prototype.forEach.call(doc.querySelectorAll('script[src],link[rel~="stylesheet"][href]'),function(el){ libs.push({xml:function(next){ return '<block type="el_html">'+fld('CODE',el.outerHTML.replace(/\s*\n\s*/g,' ').trim())+(next?'<next>'+next+'</next>':'')+'</block>'; }}); stats.rawHtml++; });
  items=libs.concat(items);

  /* script: real blocks where possible (JS2B), JS blocks for the rest */
  var code=''; Array.prototype.forEach.call(doc.querySelectorAll('script'),function(s){ if(!s.src&&!/module|json|template/i.test(s.type||'')) code+=s.textContent+'\n'; });
  var tops=[], starts=[], viaNew=null;
  if(!big&&code.trim()&&window.JS2B){
    try{ viaNew=JS2B.convertScript(code,{
      tag:function(id){ var e=doc.getElementById(id); return e?e.tagName:''; },
      hasEl:function(id){ return !!doc.getElementById(id); },
      canvasSize:function(id){ var e=doc.getElementById(id); return {w:e?numAttr(e,'width',300):300,h:e?numAttr(e,'height',150):150}; }}); }
    catch(e){ console.error(e); viaNew=null; } }
  if(viaNew){
    tops=viaNew.tops.slice(); starts=viaNew.starts.slice(); stats.raw+=viaNew.rawCount;
  } else {
  var statements=splitStatements(code), rawBuf='';
  statements.forEach(function(st){
    var h=parseHandler(st);
    if(h&&h.kind==='click'&&names[h.id]){ tops.push('<block type="ev_click">'+fld('EL',h.id)+'<statement name="DO"><block type="js_raw">'+fld('CODE',h.body.trim())+'</block></statement></block>'); return; }
    if(h&&h.kind==='timer'&&h.ms>=20){ tops.push('<block type="ev_timer">'+fld('SEC',+(h.ms/1000).toFixed(3))+'<statement name="DO"><block type="js_raw">'+fld('CODE',h.body.trim())+'</block></statement></block>'); return; }
    if(big){ rawBuf+=st+'\n'; if(rawBuf.length>20000){ stats.raw++; starts.push('<block type="js_raw">'+fld('CODE',rawBuf.trim())+'</block>'); rawBuf=''; } return; }
    stats.raw++; starts.push('<block type="js_raw">'+fld('CODE',st)+'</block>');
  });
  if(rawBuf.trim()){ stats.raw++; starts.push('<block type="js_raw">'+fld('CODE',rawBuf.trim())+'</block>'); }
  }
  if(starts.length){ var s=starts.reduceRight(function(acc,x){ return acc?x.replace(/<\/block>$/,function(){ return '<next>'+acc+'</next></block>'; }):x; },''); tops.push('<block type="ev_start"><statement name="DO">'+s+'</statement></block>'); }

  var x=20, y=20;
  var xml='<xml xmlns="https://developers.google.com/blockly/xml"><block type="page_root" x="20" y="20">'+fld('TITLE',title)+fld('BG','#ffffff')+fld('CENTER','FALSE')+(items.length?'<statement name="BODY">'+chain(items)+'</statement>':'')+'</block>'+tops.map(function(t,i){ return t.replace('<block ','<block x="440" y="'+(20+i*200)+'" '); }).join('')+'</xml>';
  stats.blocks=Math.max(0,(xml.match(/<block /g)||[]).length-stats.raw-stats.rawHtml);
  return {xml:xml, title:title, stats:stats, lib:!!viaNew};
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

/* ---------- lean(): the page the editor builds, written the way the AI is asked to write pages ----------
   B.build() output carries a fixed CSS block and helper functions ($, __set ...). lean() drops the helpers (calls become
   plain document.getElementById code) and trims the CSS to the rules the page uses, so "the current page" the AI reads, and the
   pages it was trained on, are short and look like normal hand-written HTML. */
function callEnd(src,open){ var d=0,mode=null; for(var i=open;i<src.length;i++){ var c=src[i];
  if(mode){ if(c==='\\'){ i++; continue; } if(c===mode) mode=null; continue; }
  if(c==="'"||c==='"'||c==='`'){ mode=c; continue; }
  if(c==='(') d++; else if(c===')'){ d--; if(!d) return i; } } return -1; }
function splitArgs(a){ var out=[],d=0,mode=null,st=0; for(var i=0;i<a.length;i++){ var c=a[i];
  if(mode){ if(c==='\\'){ i++; continue; } if(c===mode) mode=null; continue; }
  if(c==="'"||c==='"'||c==='`'){ mode=c; continue; }
  if(c==='('||c==='['||c==='{') d++; else if(c===')'||c===']'||c==='}') d--;
  else if(c===','&&!d){ out.push(a.slice(st,i).trim()); st=i+1; } }
  out.push(a.slice(st).trim()); return out; }
function replaceCalls(src,name,fn){ var out='',i=0,re=new RegExp('(^|[^\\w$.])'+name.replace(/\$/g,'\\$')+'\\(','g'),m;
  while((m=re.exec(src))){ var open=m.index+m[0].length-1, close=callEnd(src,open); if(close<0) break;
    var args=splitArgs(src.slice(open+1,close)); var rep=fn(args); if(rep==null){ continue; }
    out+=src.slice(i,m.index)+m[1]+rep; i=close+1; re.lastIndex=i; }
  return out+src.slice(i); }
function lean(html){
  html=String(html||''); var doc=new DOMParser().parseFromString(html,'text/html'), sc=doc.querySelectorAll('script'); if(!sc.length) return html;
  var code=sc[sc.length-1].textContent, head=doc.head.innerHTML;
  var idTag=function(a){ var m=/^["']([^"']+)["']$/.exec(a||''); var el=m&&doc.getElementById(m[1]); return el?el.tagName:''; };
  var ge=function(a){ return 'document.getElementById('+a+')'; };
  // 1. helpers: from "// helper functions" up to the first blank line
  var helpers={}, mk=/^ {4}\/\/ [^\n]*\n(?= {4}(?:function|var) )/m.exec(code), k=mk?mk.index:-1;
  if(k>=0){ var end=code.indexOf('\n\n',k); if(end<0) end=code.length; var block=code.slice(k,end), lines=block.split('\n').slice(1), cur=null;
    lines.forEach(function(l){ var m=/^\s*function\s+([\w$]+)/.exec(l)||/^\s*var\s+([\w$]+)/.exec(l);
      if(m&&/^ {4}\S/.test(l)){ cur=m[1]; helpers[cur]=''; }
      if(cur) helpers[cur]+=l+'\n'; });
    code=code.slice(0,k).replace(/\s+$/,'')+'\n'+code.slice(end).replace(/^\n+/,''); }
  if(/__key/.test(code)){ var asg=code.match(/^\s*__key = e\.key;\n/gm)||[], uses=code.match(/__key/g)||[]; if(asg.length&&uses.length===asg.length) code=code.replace(/^\s*__key = e\.key;\n/gm,''); }
  // 2. calls of the simple helpers become plain code
  code=replaceCalls(code,'$',function(a){ return a.length===1?ge(a[0]):null; });
  code=replaceCalls(code,'__get',function(a){ if(a.length!==1) return null; var t=idTag(a[0]); return ge(a[0])+(t==='INPUT'||t==='TEXTAREA'||t==='SELECT'?'.value':'.textContent'); });
  code=replaceCalls(code,'__num',function(a){ return a.length===1?'(parseFloat('+a[0]+') || 0)':null; });
  code=code.replace(/\b__set\(/g,'__SET(');
  code=replaceCalls(code,'__SET',function(a){ if(a.length<2) return null; var t=idTag(a[0]), v=a.slice(1).join(', '); if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT') return ge(a[0])+'.value = '+v; if(t==='IMG') return ge(a[0])+'.src = '+v; if(t==='CANVAS'||t==='') return null; return ge(a[0])+'.textContent = '+v; });
  code=code.replace(/\b__SET\(/g,'__set(');
  // 3. helpers still used stay (plus $ when they use it)
  var keep=[], need=function(n){ if(helpers[n]&&keep.indexOf(n)<0){ keep.push(n); (helpers[n].match(/[\w$]+(?=\()/g)||[]).concat(helpers[n].match(/__\w+/g)||[]).forEach(function(d){ if(d!==n&&helpers[d]) need(d); }); } };
  (code.match(/__\w+|\$(?=\()/g)||[]).forEach(function(n){ need(n); });
  Object.keys(helpers).forEach(function(n){ if(n!=='$'&&keep.indexOf(n)>=0&&/(^|[^\w$.])\$\(/.test(helpers[n])) need('$'); });
  var hp=Object.keys(helpers).filter(function(n){ return keep.indexOf(n)>=0; }).map(function(n){ return helpers[n].replace(/^    /gm,''); }).join('');
  code=code.replace(/^\s*\n/,'').replace(/\n{3,}/g,'\n\n').replace(/\s+$/,'');
  code=code.split('\n').map(function(l){ return l.replace(/^    /,''); }).join('\n');
  // 4. CSS: only the rules the page uses
  var css=''; var st=doc.querySelector('style');
  if(st){ var rules=st.textContent.split('\n').map(function(l){ return l.trim(); }).filter(Boolean), used=[];
    rules.forEach(function(r){ var sel=r.slice(0,r.indexOf('{')).trim(); if(!sel) return;
      if(sel==='body'||sel==='h1, h2, h3'||sel==='button:active'||sel==='.box.row'&&doc.querySelector('.box.row')) { if(sel==='h1, h2, h3'||sel==='button:active') return; used.push(r); return; }
      try{ if(doc.body.querySelector(sel.replace(/:active$/,''))) used.push(r); }catch(e){} });
    css='  <style>\n'+used.map(function(r){ return '    '+r; }).join('\n')+'\n  </style>\n'; }
  var title=(doc.title||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  var bodyHTML=doc.body.cloneNode(true); Array.prototype.forEach.call(bodyHTML.querySelectorAll('script'),function(x){ x.parentNode.removeChild(x); });
  var body=bodyHTML.innerHTML.replace(/\s+$/,'').split('\n').map(function(l){ return l.replace(/^  /,'  '); }).join('\n');
  var lang=doc.documentElement.getAttribute('lang')||'en';
  return '<!DOCTYPE html>\n<html lang="'+lang+'">\n<head>\n  <meta charset="UTF-8">\n  <title>'+title+'</title>\n'+css+'</head>\n<body>\n'+body.replace(/^\n+/,'')+'\n  <script>\n'+((hp?hp+'\n':'')+code).split('\n').map(function(l){ return l?'    '+l:l; }).join('\n')+'\n  </script>\n</body>\n</html>\n'; }
window.BHX={convert:convert, fallback:fallback, splitStatements:splitStatements, lean:lean};
})();
