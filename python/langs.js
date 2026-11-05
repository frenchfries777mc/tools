/* Fry Code: the languages besides Python (JavaScript, Java, HTML, JSON, BeaconScript).
   Each one: hl(src,esc) -> coloured html, words (auto-complete), ex (examples), indent, open (regex: a line that opens a block),
   tabs [[id,label]] for the right-hand pane (out = 결과/콘솔/검사, pv = 미리보기), run(ctx), live (re-run while typing), starter.
   ctx = {code, out, pv, write(text,cls), sys(text,cls), show(tab), done(ok), errLine(n), setCode(text), T, onStop(fn), tree(el)} */
(function(){
'use strict';
var T=function(s){ return window.FFT&&FFT.T?FFT.T(s):s; };
function esc(s){ return String(s).replace(/[&<>]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }
function setOf(s){ var o={}; s.split(' ').forEach(function(w){ o[w]=1; }); return o; }

/* ---------- generic highlighter (comments, strings, numbers, words) ---------- */
function mkHl(cfg){
  var re=new RegExp('('+cfg.com+')|('+cfg.str+')|(\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?[fFdDlL]?\\b|\\b0[xX][\\da-fA-F_]+\\b)|(@?[A-Za-z_$À-￿][\\w$À-￿]*)','g');
  return function(src){ var h='', last=0, m, prevDef=false; re.lastIndex=0;
    while((m=re.exec(src))){ h+=esc(src.slice(last,m.index)); last=re.lastIndex; var t=m[0];
      if(m[1]) h+='<span class="c">'+esc(t)+'</span>';
      else if(m[2]) h+='<span class="s">'+esc(t)+'</span>';
      else if(m[3]) h+='<span class="n">'+esc(t)+'</span>';
      else if(cfg.kw[t]){ h+='<span class="k">'+t+'</span>'; prevDef=!!cfg.def[t]; continue; }
      else if(t[0]==='@') h+='<span class="b">'+esc(t)+'</span>';
      else if(prevDef) h+='<span class="f">'+esc(t)+'</span>';
      else if(cfg.bi[t]) h+='<span class="b">'+t+'</span>';
      else if(src[last]==='(') h+='<span class="f">'+esc(t)+'</span>';
      else h+=esc(t);
      prevDef=false; }
    return h+esc(src.slice(last)); }; }

/* ---------- JavaScript ---------- */
var JS_KW='break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new return super switch this throw try typeof var void while with yield async await of static get set true false null undefined';
var JS_BI='console Math JSON Object Array String Number Boolean Date Promise Map Set RegExp Error parseInt parseFloat isNaN setTimeout setInterval clearTimeout clearInterval document window alert fetch Symbol BigInt';
var jsHl=mkHl({com:'\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?(?:\\*\\/|$)', str:'`(?:\\\\[\\s\\S]|[^`\\\\])*`?|"(?:\\\\.|[^"\\\\\\n])*"?|\'(?:\\\\.|[^\'\\\\\\n])*\'?', kw:setOf(JS_KW), bi:setOf(JS_BI), def:setOf('function class')});
var JS_WORDS=[['console.log()','console.log($0)','화면(결과)에 출력'],['function','function $0() {\n  \n}','함수 만들기'],['const','const $0 = ','바뀌지 않는 변수'],['let','let $0 = ','변수'],['for','for (let i = 0; i < $0; i++) {\n  \n}','반복문'],['if','if ($0) {\n  \n}','조건문'],['else','else {\n  \n}','아니면'],['return','return $0','돌려주기'],['while','while ($0) {\n  \n}','조건 반복'],['setTimeout','setTimeout(() => {\n  $0\n}, 1000)','잠시 뒤 실행'],['Math.random()','Math.random()','0~1 난수'],['Math.floor()','Math.floor($0)','소수점 버림'],['document.body','document.body','화면(미리보기) 본문'],['document.createElement()','document.createElement("$0")','요소 만들기'],['JSON.stringify()','JSON.stringify($0)','JSON 글자로'],['JSON.parse()','JSON.parse($0)','JSON 글자를 읽기'],['.map()','.map(x => $0)','배열 바꾸기'],['.filter()','.filter(x => $0)','배열 걸러내기'],['.forEach()','.forEach(x => {\n  $0\n})','배열 하나씩'],['.push()','.push($0)','배열에 넣기'],['.length','.length','길이'],['class','class $0 {\n  constructor() {\n    \n  }\n}','클래스'],['async','async function $0() {\n  \n}','비동기 함수'],['await','await $0','기다리기'],['try','try {\n  $0\n} catch (e) {\n  console.log(e.message)\n}','오류 잡기']];

/* ---------- Java ---------- */
var JV_KW='abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while var record true false null';
var JV_BI='System String Math Integer Double Long Boolean Character List ArrayList Map HashMap Set HashSet Scanner Object Arrays Collections Random Optional Thread Exception RuntimeException StringBuilder';
var jvHl=mkHl({com:'\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?(?:\\*\\/|$)', str:'"""[\\s\\S]*?(?:"""|$)|"(?:\\\\.|[^"\\\\\\n])*"?|\'(?:\\\\.|[^\'\\\\\\n])*\'?', kw:setOf(JV_KW), bi:setOf(JV_BI), def:setOf('class interface enum record')});
var JV_WORDS=[['public static void main','public static void main(String[] args) {\n    $0\n}','시작 함수'],['System.out.println()','System.out.println($0);','한 줄 출력'],['System.out.print()','System.out.print($0);','출력'],['class','public class $0 {\n    \n}','클래스'],['for','for (int i = 0; i < $0; i++) {\n    \n}','반복문'],['if','if ($0) {\n    \n}','조건문'],['else','else {\n    \n}','아니면'],['while','while ($0) {\n    \n}','조건 반복'],['String','String $0 = "";','글자 변수'],['int','int $0 = 0;','정수 변수'],['double','double $0 = 0.0;','실수 변수'],['boolean','boolean $0 = false;','참/거짓'],['ArrayList','ArrayList<$0> list = new ArrayList<>();','목록'],['HashMap','HashMap<String, $0> map = new HashMap<>();','사전(키-값)'],['Scanner','Scanner sc = new Scanner(System.in);','입력 받기'],['return','return $0;','돌려주기'],['import','import java.util.*;','가져오기'],['try','try {\n    $0\n} catch (Exception e) {\n    System.out.println(e.getMessage());\n}','오류 잡기'],['Math.random()','Math.random()','0~1 난수'],['private','private $0','나만 쓰는'],['static','static $0','공용']];

/* ---------- JSON ---------- */
function jsonHl(src){ var re=/("(?:\\.|[^"\\\n])*"?)(\s*:)?|(-?\b\d[\d.eE+-]*\b)|\b(true|false|null)\b/g, h='', last=0, m;
  while((m=re.exec(src))){ h+=esc(src.slice(last,m.index)); last=re.lastIndex;
    if(m[1]!=null) h+='<span class="'+(m[2]?'f':'s')+'">'+esc(m[1])+'</span>'+esc(m[2]||'');
    else if(m[3]!=null) h+='<span class="n">'+esc(m[3])+'</span>'; else h+='<span class="k">'+m[4]+'</span>'; }
  return h+esc(src.slice(last)); }

/* ---------- HTML ---------- */
function htmlHl(src){ var re=/<!--[\s\S]*?(?:-->|$)|<\/?[A-Za-z!][^>]*>?/g, h='', last=0, m;
  while((m=re.exec(src))){ h+=esc(src.slice(last,m.index)); last=re.lastIndex; var t=m[0];
    if(t.slice(0,4)==='<!--'){ h+='<span class="c">'+esc(t)+'</span>'; continue; }
    var tm=/^(<\/?)([^\s>\/]*)([\s\S]*)$/.exec(t), rest=tm[3];
    h+=esc(tm[1])+'<span class="k">'+esc(tm[2])+'</span>';
    h+=rest.replace(/("[^"]*"?|'[^']*'?)|([^\s=<>"'\/]+)|([\s\S])/g,function(x,s,n,o){ return s?'<span class="s">'+esc(s)+'</span>':n?'<span class="f">'+esc(n)+'</span>':esc(o); }); }
  return h+esc(src.slice(last)); }
var HTML_WORDS=[['!doctype','<!DOCTYPE html>','문서 시작'],['html','<html lang="ko">\n  $0\n</html>','문서'],['head','<head>\n  <meta charset="UTF-8">\n  <title>$0</title>\n</head>','머리'],['body','<body>\n  $0\n</body>','본문'],['h1','<h1>$0</h1>','큰 제목'],['h2','<h2>$0</h2>','제목'],['p','<p>$0</p>','문단'],['a','<a href="$0"></a>','링크'],['img','<img src="$0" alt="">','그림'],['div','<div>$0</div>','칸'],['span','<span>$0</span>','글자 묶음'],['button','<button>$0</button>','버튼'],['input','<input type="text" placeholder="$0">','입력칸'],['ul','<ul>\n  <li>$0</li>\n</ul>','목록'],['li','<li>$0</li>','목록 항목'],['table','<table>\n  <tr>\n    <td>$0</td>\n  </tr>\n</table>','표'],['style','<style>\n  $0\n</style>','꾸미기(CSS)'],['script','<script>\n  $0\n</script>','자바스크립트'],['br','<br>','줄바꿈'],['canvas','<canvas id="c" width="300" height="200"></canvas>','그림판']];

/* ---------- BeaconScript (the Beaconfall mod language) ---------- */
var BS_EVENTS=['world generate','join','mine','chop','kill','craft','fish','place','die','death','respawn','break'];
var BS_VERBS='on give set remove replace spawn place teleport title chat say button ui key remap chance if else rename fill disable enable add subtract reset play loop heal damage broadcast';
var BS_TERRAIN=['land','beach','ocean','mountain'], BS_BIOMES=['start','forest','desert','volcano','jungle','mesa','rock','mangrove','ice'], BS_ALL=['trees','rocks','ores','structures'], BS_SOUNDS=['click','hurt','swing','bow','hit','break'], BS_COLL=['tree','rock','ore','water','sea','ocean','block','iron','log','stone','wood','sword','bench','wolf'], BS_PH=['%player_name%','%player_location%','%world_player_count%','%online_player%','%player_x%','%player_y%','%player_z%','%world_name%','%player_hp%','%player_max_hp%','%player_item%','%player_biome%','%world_day%','%world_time%','%attacker%','%victim%','%player%','%random%','%nearest_player%','%random_player%','%farest_player%','%nearest_mob%','%random_mob%','%farest_mob%','%nearest_monster%','%random_monster%','%farest_monster%',"%player's_uuid%",'%mod_name%','%mod_uuid%','%crafted_item%','%placed_block%','%distroyed_block%',"%player's mod%",'%player_uuid%','%destroyed_block%'];
var BS_BLOCK=setOf('on button ui chance if else rename loop');
var bsHl=mkHl({com:'#[^\\n]*', str:'"(?:\\\\.|[^"\\\\\\n])*"?', kw:setOf(BS_VERBS), bi:setOf('spawn player tree rock seconds blocks times of in to at near with damage speed name press top bottom left right center'), def:{}});
var BS_WORDS=[['on world generate:','on world generate:\n    $0','월드를 처음 만들 때'],['on join:','on join:\n    $0','월드에 들어갈 때'],['on key press:','on key "$0" press:\n    ','키를 눌렀을 때'],['on mine:','on mine:\n    $0','돌 캘 때'],['on chop:','on chop:\n    $0','나무 벨 때'],['on kill:','on kill:\n    $0','몬스터 잡을 때'],['on craft:','on craft:\n    $0','만들 때'],['on fish:','on fish:\n    $0','낚시할 때'],['on die:','on die:\n    $0','죽을 때'],['give','give $0','아이템 주기'],['set','set $0 damage 10','아이템 데미지/속도/이름'],['remove','remove tree in 20 blocks of spawn','나무/돌 없애기'],['remove all','remove all trees','나무·바위·광석·건물 전부 없애기'],['disable collision','disable collision of tree','나무·바위·광석·물·블록 부딪힘 끄기'],['enable collision','enable collision of water','부딪힘 켜기'],['fill','fill ~0 ~0 ~300 ~300 to land','땅·해변·바다·산 만들기 (새 월드)'],['fill mountain','fill ~0 ~0 ~300 ~300 to mountain $0','산 만들기 (지역: start forest desert volcano jungle mesa rock mangrove ice)'],['spawn','spawn wolf $0 times','몹 소환'],['place','place bench near spawn','구조물 설치'],['teleport','teleport player to spawn','순간이동'],['title','title "$0" for 3 seconds','화면 중앙 글자'],['chat','chat "$0"','채팅'],['%player_name%','%player_name%','플레이어 이름 (Potato API 모드)'],['%online_player%','%online_player%','접속 인원 (Potato API 모드)'],['say','say "$0"','말하기'],['button','button "$0" at top right:\n    ','화면 버튼'],['ui','ui "$0":\n    ','작은 창'],['remap','remap "E" to "R"','키 바꾸기'],['chance','chance 30%:\n    $0','확률'],['if','if $0:\n    ','조건']];
var BS_ITEMS='iron log stone wood sword bench wolf spawn player';


/* word-by-word suggestions: after "on " it offers world, join... one word at a time */
var BS_TIPS={break:'부술 때',contained:'들어 있으면',world:'월드',join:'들어올 때',mine:'돌 캘 때',chop:'나무 벨 때',kill:'몬스터 잡을 때',craft:'만들 때',fish:'낚시할 때',place:'설치할 때',die:'죽을 때',key:'키'};
function bsSug(before,pre){
  var tk=before.replace(/"(?:\\.|[^"\\])*"/g,'"S"').trim().split(/\s+/).filter(Boolean).map(function(x){ return x.toLowerCase(); }), n=tk.length, v=tk[0]||'', M=BS_MEAN;
  function W(list,suffix){ return list.map(function(w){ return {n:w,i:w+(suffix==null?' ':suffix),d:M[w]||BS_TIPS[w]||''}; }); }
  var ITEMS=['iron','log','stone','wood','sword','bench','wolf'];
  if(n===0) return W(BS_VERBS.split(' ').filter(function(x){ return x!=='else'||true; }));
  if(v==='on'){
    if(n===1) return W(['world']).concat(W(['join','mine','chop','kill','craft','fish','place','die','death','respawn','break'],':'),W(['key']));
    if(tk[1]==='world'&&n===2) return W(['generate'],':');
    if(tk[1]==='key'&&n===2) return [{n:'"G"',i:'"$0" press:',d:'누를 키 (글자 하나)'}];
    if(tk[1]==='key'&&n===3) return W(['press'],':');
    return [];
  }
  if(v==='give'){ if(n===1) return W(['effect']).concat(W(ITEMS,'')); if(tk[1]==='effect'){ if(n===2) return W(['speed','strength','defense','regen','haste','breath','night']); if(n===4) return W(['seconds'],''); return []; } return W(ITEMS,''); }
  if(v==='play'){ if(n===1) return W(['sound']); if(n===2) return W(BS_SOUNDS,''); return []; }
  if(v==='loop'){ if(n===2) return W(['times'],':'); return []; }
  if(v==='heal'||v==='damage'){ if(n===1) return W(['player']); return []; }
  if(v==='set'){ if(n===1) return W(['variable','time','weather']).concat(W(ITEMS)); if(tk[1]==='time'){ if(n===2) return W(['day','night','noon','midnight','sunrise','sunset'],''); return []; } if(tk[1]==='weather'){ if(n===2) return W(['clear','rain','storm'],''); return []; } if(tk[1]==='variable'&&n===4) return W(['random']); if(tk[1]==='variable'&&tk[4]==='random'&&n===6) return W(['to']); if(tk[1]==='variable'){ if(n===3) return W(['to']); return []; } if(n===2) return W(['damage','speed','name']); return []; }
  if(v==='add'){ if(n===2) return W(['to']); if(n===3) return W(['variable']); return []; }
  if(v==='subtract'){ if(n===2) return W(['from']); if(n===3) return W(['variable']); return []; }
  if(v==='reset'){ if(n===1) return W(['variable']); return []; }
  if(v==='if'){ if(n===1) return W(['variable','has']); if(n===2&&tk[1]&&/^(\{.*\}|%.*%)$/.test(tk[1])) return W(['contained'],''); if(tk[1]&&tk[1][0]==='%'){ if(n===2) return W(['is']); if(n===3) return W(['not']).concat(W(['player'],':'),W(['contained'],'')); if(n===4&&tk[3]==='not') return W(['player'],':'); } return []; }
  if(v==='remove'){ if(n===1) return W(['all','tree','rock']); if(n===2&&tk[1]==='all') return W(BS_ALL,''); return []; }
  if(v==='fill'){ if(n===5) return W(['to']); if(n===6) return W(BS_TERRAIN); if(n===7) return W(BS_BIOMES,''); return []; }
  if(v==='disable'||v==='enable'){ if(n===1) return W(['collision']); if(n===2) return W(['of']); if(n===3) return W(BS_COLL,''); return []; }
  if(v==='teleport'){ if(n===1) return W(['player']); if(n===2) return W(['to']); if(n===3) return W(['spawn'],''); return []; }
  if(v==='spawn'){ if(n===1) return W(['wolf']); return []; }
  if(v==='place'){ if(n===1) return W(['bench']); if(n===2) return W(['near']); if(n===3) return W(['spawn'],''); return []; }
  if(v==='button'||v==='ui'||v==='chance'||v==='title'||v==='chat'||v==='say') return [];
  return [];
}
/* ---------- helpers shared by the checks ---------- */
function lev(a,b){ var d=[],i,j; for(i=0;i<=a.length;i++){ d[i]=[i]; } for(j=0;j<=b.length;j++) d[0][j]=j;
  for(i=1;i<=a.length;i++) for(j=1;j<=b.length;j++) d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)); return d[a.length][b.length]; }
function guess(w,list){ var best=null,bd=3; list.forEach(function(x){ var d=lev(w.toLowerCase(),x); if(d<bd){ bd=d; best=x; } }); return best; }
function mk(tag,cls,txt){ var e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
function posToLine(src,pos){ var n=1; for(var i=0;i<pos&&i<src.length;i++) if(src[i]==='\n') n++; return n; }

/* bracket / quote balance for the C-like languages (skips strings and comments). -> {line,msg} or null */
function balance(src,tpl){ var st=[], i=0, n=src.length, line=1, ch, pair={')':'(',']':'[','}':'{'}, nm={'(':')','[':']','{':'}'};
  while(i<n){ ch=src[i];
    if(ch==='\n'){ line++; i++; continue; }
    if(ch==='/'&&src[i+1]==='/'){ while(i<n&&src[i]!=='\n') i++; continue; }
    if(ch==='/'&&src[i+1]==='*'){ var s0=line; i+=2; while(i<n&&!(src[i]==='*'&&src[i+1]==='/')){ if(src[i]==='\n') line++; i++; } if(i>=n) return {line:s0,msg:'/* 주석이 닫히지 않았어요'}; i+=2; continue; }
    if(ch==='"'||ch==="'"||(tpl&&ch==='`')){ var q=ch, s1=line; i++; while(i<n&&src[i]!==q){ if(src[i]==='\\') i++; else if(src[i]==='\n'&&q!=='`'){ return {line:s1,msg:'글자를 감싼 따옴표('+q+')가 닫히지 않았어요'}; } if(src[i]==='\n') line++; i++; } if(i>=n) return {line:s1,msg:'글자를 감싼 따옴표('+q+')가 닫히지 않았어요'}; i++; continue; }
    if(nm[ch]) st.push({c:ch,line:line});
    else if(pair[ch]){ var top=st.pop(); if(!top) return {line:line,msg:'짝이 없는 '+ch+' 이(가) 있어요'}; if(top.c!==pair[ch]) return {line:line,msg:ch+' 앞에 '+nm[top.c]+' 이(가) 와야 해요 ('+top.line+'줄의 '+top.c+' 와 짝이 안 맞아요)'}; }
    i++; }
  if(st.length){ var t=st[st.length-1]; return {line:t.line,msg:t.c+' 이(가) 닫히지 않았어요'}; }
  return null; }

/* ---------- the console shim put in front of the code that runs in a sandboxed iframe ---------- */
var SHIM='(function(){function s(v){if(typeof v==="string")return v;if(v===undefined)return"undefined";if(typeof v==="function")return"[함수]";try{return JSON.stringify(v,function(k,x){return typeof x==="bigint"?x+"n":typeof x==="function"?"[함수]":x},2)}catch(e){return String(v)}}'
 +'function p(t,a){try{parent.postMessage({fc:1,t:t,m:Array.prototype.map.call(a,s).join(" ")},"*")}catch(e){}}'
 +'["log","info","warn","error","debug"].forEach(function(k){var o=console[k];console[k]=function(){p(k==="log"||k==="info"||k==="debug"?"log":k,arguments);try{o.apply(console,arguments)}catch(e){}}});'
 +'window.alert=function(){p("log",["alert: "].concat([].slice.call(arguments)))};window.confirm=function(){p("log",["confirm: "].concat([].slice.call(arguments)));return true};window.prompt=function(){p("log",["prompt: "].concat([].slice.call(arguments)));return null};'
 +'window.addEventListener("error",function(e){p("err",[(e.message||"오류")+(e.lineno?"\\u0001"+e.lineno:"")])});window.addEventListener("unhandledrejection",function(e){p("err",["처리되지 않은 약속 오류: "+(e.reason&&e.reason.message||e.reason)])});})();';
var WORKER_PRE='(function(){function s(v){if(typeof v==="string")return v;if(v===undefined)return"undefined";if(typeof v==="function")return"[함수]";try{return JSON.stringify(v,function(k,x){return typeof x==="bigint"?x+"n":typeof x==="function"?"[함수]":x},2)}catch(e){return String(v)}}'
 +'["log","info","warn","error","debug"].forEach(function(k){console[k]=function(){postMessage({t:k==="log"||k==="info"||k==="debug"?"log":k,m:Array.prototype.map.call(arguments,s).join(" ")})}});'
 +'self.addEventListener("unhandledrejection",function(e){postMessage({t:"err",m:"처리되지 않은 약속 오류: "+(e.reason&&e.reason.message||e.reason)})});'
 +'var ids={},oT=setTimeout,oC=clearTimeout,oI=setInterval,oCI=clearInterval;function n(){return Object.keys(ids).length}function chk(){if(!n())oT(function(){if(!n())postMessage({t:"idle"})},40)}self.__chk=chk;'
 +'self.setTimeout=function(f,ms){var a=[].slice.call(arguments,2),id=oT(function(){delete ids[id];try{if(typeof f==="function")f.apply(null,a)}finally{chk()}},ms);ids[id]=1;return id};'
 +'self.clearTimeout=function(id){delete ids[id];oC(id);chk()};'
 +'self.setInterval=function(f,ms){var a=[].slice.call(arguments,2),id=oI(function(){if(typeof f==="function")f.apply(null,a)},ms);ids[id]=1;return id};'
 +'self.clearInterval=function(id){delete ids[id];oCI(id);chk()};})();';

/* the frame lives in ctx.pv; messages from it are written to ctx.out */
var frameOff=0;
function frameRun(ctx,html,lineOff){ ctx.pv.innerHTML=''; var fr=document.createElement('iframe'); fr.setAttribute('sandbox','allow-scripts'); fr.style.cssText='width:100%;height:100%;border:0;background:#fff;display:block';
  var onMsg=function(e){ var d=e.data; if(!d||!d.fc||e.source!==fr.contentWindow) return;
    if(d.t==='err'){ var p=String(d.m).split('\u0001'); ctx.write(p[0]+(p[1]?' ('+Math.max(1,(+p[1])-lineOff)+'줄)':'')+'\n','err'); if(p[1]) ctx.errLine(Math.max(1,(+p[1])-lineOff)); }
    else ctx.write(d.m+'\n',d.t==='error'?'err':d.t==='warn'?'warn':''); };
  window.addEventListener('message',onMsg); ctx.onStop(function(){ window.removeEventListener('message',onMsg); });
  fr.srcdoc=html; ctx.pv.appendChild(fr); }

/* ---------- JavaScript run: in a worker (can be stopped), or in the preview frame when the code touches the page ---------- */
function jsRun(ctx){ var src=ctx.code;
  var bal=balance(src,true); if(bal){ ctx.write(bal.msg+' ('+bal.line+'줄)\n','err'); ctx.errLine(bal.line); ctx.done(false); return; }
  if(/\b(document|window|alert|confirm|prompt|localStorage|requestAnimationFrame|HTMLElement)\b/.test(src)){
    ctx.show('pv'); frameRun(ctx,'<!doctype html><meta charset="utf-8"><style>body{font-family:sans-serif;color:#111;background:#fff;margin:12px}</style><script>'+SHIM+'<\/script>\n<body>\n<script>\n'+src+'\n<\/script>',3);
    ctx.sys('화면에 그리는 코드예요. 결과는 [화면] 탭에서 보세요'); ctx.done(true); return; }
  ctx.show('out'); var url, w;
  try{ url=URL.createObjectURL(new Blob([WORKER_PRE+src+'\n;self.__chk&&self.__chk();'],{type:'text/javascript'})); w=new Worker(url); }catch(e){ ctx.write('실행할 수 없어요: '+e.message+'\n','err'); ctx.done(false); return; }
  var finished=false;
  w.onmessage=function(e){ var d=e.data; if(d.t==='idle'){ if(!finished){ finished=true; ctx.done(true); } return; } if(d.t==='err') ctx.write(d.m+'\n','err'); else ctx.write(d.m+'\n',d.t==='error'?'err':d.t==='warn'?'warn':''); };
  w.onerror=function(e){ e.preventDefault(); ctx.write((e.message||'오류')+(e.lineno?' ('+e.lineno+'줄)':'')+'\n','err'); if(e.lineno) ctx.errLine(e.lineno); if(!finished){ finished=true; ctx.done(false); } };
  ctx.onStop(function(){ try{ w.terminate(); URL.revokeObjectURL(url); }catch(e){} });
}

/* ---------- HTML ---------- */
function htmlRun(ctx){ var src=ctx.code, shim='<script>'+SHIM+'<\/script>', html;
  if(/<head[^>]*>/i.test(src)) html=src.replace(/<head[^>]*>/i,function(m){ return m+shim; }); else html=shim+src;
  ctx.show('pv'); frameRun(ctx,html,0); ctx.done(true); }

/* ---------- JSON ---------- */
function jsonTree(v,key){ var t=Object.prototype.toString.call(v);
  if(v&&typeof v==='object'){ var arr=Array.isArray(v), keys=Object.keys(v), d=document.createElement('details'); d.open=true;
    var s=document.createElement('summary'); s.innerHTML=(key!=null?'<b class="tk">'+esc(key)+'</b>: ':'')+'<span class="tt">'+(arr?'목록 ['+keys.length+']':'묶음 {'+keys.length+'}')+'</span>'; d.appendChild(s);
    var box=document.createElement('div'); box.className='tb'; keys.forEach(function(k){ box.appendChild(jsonTree(v[k],arr?'['+k+']':k)); }); d.appendChild(box); return d; }
  var r=document.createElement('div'); r.className='tl'; var cls=v===null?'k':typeof v==='string'?'s':typeof v==='number'?'n':'k';
  r.innerHTML=(key!=null?'<b class="tk">'+esc(key)+'</b>: ':'')+'<span class="'+cls+'">'+esc(typeof v==='string'?JSON.stringify(v):String(v))+'</span>'; return r; }
function jsonRun(ctx){ var src=ctx.code, v; ctx.pv.innerHTML='';
  if(!src.trim()){ ctx.sys('JSON을 써 보세요. 예: {"이름": "철수", "나이": 12}'); ctx.show('out'); ctx.done(true); return; }
  try{ v=JSON.parse(src); }catch(e){ var m=/position (\d+)/.exec(e.message), ln=m?posToLine(src,+m[1]):0, lc=/line (\d+)/.exec(e.message); if(lc) ln=+lc[1];
    ctx.write('✖ 올바른 JSON이 아니에요'+(ln?' ('+ln+'줄)':'')+'\n'+e.message+'\n','err'); if(ln) ctx.errLine(ln);
    var hint=[]; if(/'[^'"]*'\s*:/.test(src)||/:\s*'/.test(src)) hint.push("JSON은 작은따옴표(')가 아니라 큰따옴표(\")만 써요"); if(/,\s*[}\]]/.test(src)) hint.push('맨 마지막 항목 뒤의 쉼표(,)를 지워 보세요'); if(/\/\/|\/\*/.test(src)) hint.push('JSON에는 주석을 쓸 수 없어요'); if(/[{,]\s*[A-Za-z_]\w*\s*:/.test(src)) hint.push('이름(키)도 "큰따옴표"로 감싸야 해요');
    hint.forEach(function(h){ ctx.sys('💡 '+h); }); ctx.show('out'); ctx.done(false); return; }
  var cnt=0; (function c(x){ if(x&&typeof x==='object'){ Object.keys(x).forEach(function(k){ cnt++; c(x[k]); }); } })(v);
  ctx.write('✔ 올바른 JSON이에요 (항목 '+cnt+'개)\n','ok');
  var bar=mk('div','tools'); [['예쁘게 정리',function(){ ctx.setCode(JSON.stringify(v,null,2)); }],['한 줄로 줄이기',function(){ ctx.setCode(JSON.stringify(v)); }]].forEach(function(a){ var b=mk('button','tbtn',a[0]); b.type='button'; b.onclick=a[1]; bar.appendChild(b); });
  ctx.out.appendChild(bar); ctx.pv.appendChild(jsonTree(v,null)); ctx.show('pv'); ctx.done(true); }

/* ---------- Java: no real run in the browser; colouring, bracket check and a structure view ---------- */
function javaRun(ctx){ var src=ctx.code, bal=balance(src,false); ctx.pv.innerHTML='';
  var lines=src.split('\n'), root=mk('div','tl'), items=[], cur=null;
  var reC=/^\s*(?:(?:public|private|protected|static|final|abstract|sealed)\s+)*(class|interface|enum|record)\s+([A-Za-z_]\w*)/, reM=/^\s*(?:(?:public|private|protected|static|final|abstract|synchronized|native|default)\s+)+(?:<[^>]+>\s*)?([\w<>\[\],.? ]+?)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/, reMain=/^\s*(?:(?:public|static|final)\s+)+void\s+main\s*\(/, reCtor=/^\s*(?:(?:public|private|protected)\s+)([A-Z]\w*)\s*\(([^)]*)\)\s*(?:throws [\w, .]+)?\s*\{/, reF=/^\s*(?:(?:public|private|protected|static|final|volatile|transient)\s+)+([\w<>\[\],.? ]+?)\s+([A-Za-z_]\w*)\s*(?:=[^;]*)?;/;
  lines.forEach(function(l,i){ var m;
    if((m=reC.exec(l))){ cur={k:m[1],n:m[2],line:i+1,kids:[]}; items.push(cur); }
    else if(cur&&reMain.test(l)){ cur.kids.push({t:'▶',s:'main — 프로그램이 시작되는 곳',line:i+1}); }
    else if(cur&&(m=reCtor.exec(l))){ cur.kids.push({t:'🧱',s:m[1]+'('+m[2].trim()+') — 만들 때 쓰는 함수',line:i+1}); }
    else if(cur&&(m=reM.exec(l))&&!/^\s*(if|for|while|switch|catch|return|new)\b/.test(l)){ cur.kids.push({t:'ƒ',s:m[2]+'('+m[3].trim()+') → '+m[1].trim(),line:i+1}); }
    else if(cur&&(m=reF.exec(l))){ cur.kids.push({t:'▫',s:m[2]+' : '+m[1].trim(),line:i+1}); } });
  if(!items.length){ var e=mk('p','tl','구조가 아직 없어요. class 로 시작해서 써 보세요'); ctx.pv.appendChild(e); }
  items.forEach(function(c){ var d=document.createElement('details'); d.open=true; var s=mk('summary','',''); s.innerHTML='<b class="tk">'+esc(c.k+' '+c.n)+'</b> <span class="tt">'+c.line+'줄</span>'; d.appendChild(s);
    var b=mk('div','tb'); c.kids.forEach(function(k){ b.appendChild(mk('div','tl',k.t+' '+k.s+'  ('+k.line+'줄)')); }); if(!c.kids.length) b.appendChild(mk('div','tl','(비어 있어요)')); d.appendChild(b); ctx.pv.appendChild(d); });
  if(bal){ ctx.write('✖ '+bal.msg+' ('+bal.line+'줄)\n','err'); ctx.errLine(bal.line); ctx.show('out'); ctx.done(false); return; }
  ctx.write('✔ 괄호와 따옴표가 모두 맞아요\n','ok'); ctx.sys('ℹ️ 자바는 브라우저에서 바로 실행할 수 없어요. 색칠, 괄호 검사, 구조 보기만 도와줘요. (실행은 내 컴퓨터의 자바나 온라인 자바 도구에서 해 보세요)');
  ctx.show('pv'); ctx.done(true); }

/* ---------- BeaconScript ---------- */
function bsCheck(src){ var errs=[], stack=[], lines=src.split('\n'), VERB=BS_VERBS.split(' ');
  lines.forEach(function(raw,i){ var ln=i+1, line=raw.replace(/\t/g,'    '); if(!line.trim()||/^\s*#/.test(line)) return;
    var ind=/^ */.exec(line)[0].length, t=line.trim(), m;
    var q=t.replace(/"(?:\\.|[^"\\])*"/g,''); if(/"/.test(q)){ errs.push({line:ln,msg:'따옴표(")가 닫히지 않았어요'}); }
    while(stack.length&&ind<=stack[stack.length-1].ind){ var cl=stack.pop(); if(!cl.kids) errs.push({line:cl.line,msg:'":" 로 끝난 줄 아래에는 안쪽으로 들여쓴 명령이 와야 해요'}); }
    var par=stack[stack.length-1]; if(par){ par.kids++; } else if(ind>0) errs.push({line:ln,msg:'맨 앞 줄은 들여쓰지 않아요'});
    var verb=/^[A-Za-z_]+/.exec(t); verb=verb?verb[0].toLowerCase():'';
    if(/^\{:/.test(t)){ if(!/^\{:[^:\s{}]{1,22}::(?:"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?|%[A-Za-z0-9_' ]+%):\}$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: {:이름::"글자":}  (값은 "글자"·숫자·%…%)'}); return; }
    if(!verb){ errs.push({line:ln,msg:'명령으로 시작해야 해요: '+t.slice(0,20)}); return; }
    if(VERB.indexOf(verb)<0){ var g=guess(verb,VERB); errs.push({line:ln,msg:"모르는 명령 '"+verb+"'"+(g?" — 혹시 '"+g+"'?":'')}); return; }
    var opens=/:\s*$/.test(t);
    if(verb==='on'){ var ev=t.replace(/^on\s+/i,'').replace(/:\s*$/,'').trim(), base=ev.replace(/\s*"[^"]*"\s*/,' ').replace(/\s+/g,' ').trim();
      var okEv=/^key\s+press$/.test(base)||BS_EVENTS.indexOf(base)>=0||BS_EVENTS.indexOf(base.split(' ')[0])>=0&&base.split(' ').length<=2;
      if(!okEv){ var g2=guess(base,BS_EVENTS); errs.push({line:ln,msg:"모르는 때 'on "+ev+"'"+(g2?" — 혹시 'on "+g2+"'?":'')}); }
      if(!opens) errs.push({line:ln,msg:"on 줄은 ':' 로 끝나야 해요"}); if(ind!==0) errs.push({line:ln,msg:'on 은 맨 앞 줄에 써요'}); }
    else if(BS_BLOCK[verb]&&!opens&&verb!=='rename'&&!(verb==='place'||verb==='set')) errs.push({line:ln,msg:verb+" 줄은 ':' 로 끝나야 해요"});
    if(/^(give|set|remove|replace|spawn|place|teleport|title|chat|say|remap|fill|add|subtract|reset|play|heal|broadcast)$/.test(verb)&&t.split(/\s+/).length<2) errs.push({line:ln,msg:verb+' 뒤에 무엇을 할지 써 주세요'});
    if(verb==='remap'&&!/^remap\s+"[^"]+"\s+to\s+"[^"]+"/.test(t)) errs.push({line:ln,msg:'이렇게 써요: remap "E" to "R"'});
    if(verb==='fill'){ var fm=/^fill\s+(~?-?\d+)\s+(~?-?\d+)\s+(~?-?\d+)\s+(~?-?\d+)\s+to\s+([a-z]+)(?:\s+([a-z]+))?\s*$/i.exec(t);
      if(!fm) errs.push({line:ln,msg:'이렇게 써요: fill ~0 ~0 ~200 ~200 to land (또는 beach·ocean·mountain, 뒤에 지역 이름)'});
      else { var tt=fm[5].toLowerCase(); if(BS_TERRAIN.indexOf(tt)<0){ var g3=guess(tt,BS_TERRAIN); errs.push({line:ln,msg:"모르는 땅 '"+tt+"'"+(g3?" — 혹시 '"+g3+"'?":' (land·beach·ocean·mountain 중에서)')}); }
        if(fm[6]){ var bb=fm[6].toLowerCase(); if(BS_BIOMES.indexOf(bb)<0){ var g4=guess(bb,BS_BIOMES); errs.push({line:ln,msg:"모르는 지역 '"+bb+"'"+(g4?" — 혹시 '"+g4+"'?":' ('+BS_BIOMES.join('·')+' 중에서)')}); } } } }
    if(verb==='remove'&&/^remove\s+all\b/i.test(t)){ var ra=t.split(/\s+/)[2]; if(!ra||BS_ALL.indexOf(ra.toLowerCase())<0) errs.push({line:ln,msg:'이렇게 써요: remove all trees (또는 rocks·ores·structures)'}); }
    if(verb==='set'&&/^set\s+variable\b/i.test(t)&&!/^set\s+variable\s+(?:\{[a-z0-9_가-힣]{1,22}\}|[a-z0-9_]{1,20})\s+to\s+(-?\d+(\.\d+)?|"[^"]*"|random\s+-?\d+\s+to\s+-?\d+)\s*$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: set variable {score} to 0 (이름은 {} 안에 글자·숫자·_ 로, 공백 없이)'});
    if(verb==='set'&&/^set\s+time\b/i.test(t)&&!/^set\s+time\s+(day|night|noon|midnight|sunrise|sunset|\d+)\s*$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: set time day (day·night·noon·midnight·sunrise·sunset 또는 0~23)'});
    if(verb==='set'&&/^set\s+weather\b/i.test(t)&&!/^set\s+weather\s+(clear|rain|storm)\s*$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: set weather rain (clear·rain·storm)'});
    if(verb==='give'&&/^give\s+effect\b/i.test(t)&&!/^give\s+effect\s+(speed|strength|defense|regen|haste|breath|night)\s+\d+\s+seconds?\s*$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: give effect speed 5 seconds (speed·strength·defense·regen·haste·breath·night)'});
    if(verb==='play'){ var pm=/^play\s+sound\s+([a-z]+)\s*$/i.exec(t); if(!pm) errs.push({line:ln,msg:'이렇게 써요: play sound hit'}); else if(BS_SOUNDS.indexOf(pm[1].toLowerCase())<0){ var g7=guess(pm[1].toLowerCase(),BS_SOUNDS); errs.push({line:ln,msg:"모르는 소리 '"+pm[1]+"'"+(g7?" — 혹시 '"+g7+"'?":' (click·hurt·swing·bow·hit·break 중에서)')}); } }
    if(verb==='loop'){ var lm=/^loop\s+(\d+)\s+times\s*:\s*$/.exec(t); if(!lm) errs.push({line:ln,msg:'이렇게 써요: loop 5 times:'}); else if(+lm[1]<1||+lm[1]>20) errs.push({line:ln,msg:'반복은 1~20번까지예요'}); }
    if(verb==='heal'||verb==='damage'){ var hm=/^(heal|damage)\s+player\s+(\d+)\s*$/.exec(t); if(!hm) errs.push({line:ln,msg:'이렇게 써요: '+verb+' player 5'}); else if(+hm[2]<1||+hm[2]>100) errs.push({line:ln,msg:verb+'은 1~100까지예요'}); }
    if(verb==='if'&&/\scontained\s/.test(t)){ if(!/^if\s+(?:%[A-Za-z0-9_' ]+%|\{[^}\s]+\}|\{:[^:\s{}]+:\})\s+contained\s+"[^"]*"\s*:\s*$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: if %player\'s mod% contained "potato api":'}); }
    else if(verb==='if'&&/^if\s+%/.test(t)&&!/^if\s+%[a-z_]+%\s+is\s+(not\s+)?player\s*:\s*$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: if %attacker% is player:  (또는 is not player:)'});
    if(verb==='add'&&!/^add\s+-?\d+(\.\d+)?\s+to\s+variable\s+(?:\{[a-z0-9_가-힣]{1,22}\}|[a-z0-9_]{1,20})\s*$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: add 1 to variable score'});
    if(verb==='subtract'&&!/^subtract\s+-?\d+(\.\d+)?\s+from\s+variable\s+(?:\{[a-z0-9_가-힣]{1,22}\}|[a-z0-9_]{1,20})\s*$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: subtract 1 from variable score'});
    if(verb==='reset'&&!/^reset\s+variable\s+(?:\{[a-z0-9_가-힣]{1,22}\}|[a-z0-9_]{1,20})\s*$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: reset variable score'});
    if(verb==='if'&&/^if\s+variable\b/i.test(t)&&!/^if\s+variable\s+(?:\{[a-z0-9_가-힣]{1,22}\}|[a-z0-9_]{1,20})\s*(>=|<=|!=|>|<|=)\s*(-?\d+(\.\d+)?|"[^"]*")\s*:\s*$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: if variable score >= 10:  (비교: >= <= > < = !=)'});
    if((verb==='say'||verb==='chat'||verb==='broadcast')){ var sm=/"((?:\\.|[^"\\])*)"/.exec(t); if(sm&&sm[1].length>100) errs.push({line:ln,msg:'글자는 100자까지예요'}); }
    if(verb==='disable'||verb==='enable'){ var cm=/^(?:disable|enable)\s+collision\s+of\s+([A-Za-z_]+)\s*$/i.exec(t);
      if(!cm) errs.push({line:ln,msg:'이렇게 써요: disable collision of tree (또는 enable collision of water)'});
      else if(BS_COLL.indexOf(cm[1].toLowerCase())<0){ var g5=guess(cm[1].toLowerCase(),BS_COLL); errs.push({line:ln,msg:"모르는 대상 '"+cm[1]+"'"+(g5?" — 혹시 '"+g5+"'?":' (tree·rock·ore·water·block·아이템 이름)')}); } }
    (t.replace(/%player's mod%/gi,'').match(/%[^%\s"]*%/g)||[]).forEach(function(ph){ if(BS_PH.indexOf(ph.toLowerCase())<0&&!/^%var_[a-z0-9_]{1,20}%$/i.test(ph)&&!/^%player_[a-z0-9_]+_count%$/i.test(ph)){ var g6=guess(ph.toLowerCase(),BS_PH); errs.push({line:ln,msg:"모르는 자리표시 '"+ph+"'"+(g6?" — 혹시 '"+g6+"'?":'')}); } });
    if(verb==='teleport'&&!/\sto\s/.test(t)) errs.push({line:ln,msg:'이렇게 써요: teleport player to spawn'});
    if((verb==='title'||verb==='chat'||verb==='say'||verb==='broadcast')&&!/"/.test(t)) errs.push({line:ln,msg:verb+' 뒤에는 "글자"를 큰따옴표로 감싸서 써요'});
    if(opens) stack.push({line:ln,ind:ind,kids:0}); });
  stack.forEach(function(cl){ if(!cl.kids) errs.push({line:cl.line,msg:'":" 로 끝난 줄 아래에는 안쪽으로 들여쓴 명령이 와야 해요'}); });
  return {errs:errs}; }
/* each word of a line is its own small card: the word and what it means */
var BS_MEAN={on:'때',world:'월드',generate:'만들어질 때',join:'들어올 때',key:'키',press:'누를 때',mine:'돌 캘 때',chop:'나무 벨 때',kill:'몬스터 잡을 때',craft:'만들 때',fish:'낚시할 때',place:'설치',die:'죽을 때',break:'부술 때',contained:'들어 있으면',
  give:'주기',set:'정하기',remove:'없애기',replace:'바꾸기',teleport:'순간이동',title:'화면 가운데 글자',chat:'채팅',say:'말하기',button:'버튼',ui:'작은 창',remap:'키 바꾸기',chance:'확률',if:'만약',else:'아니면',rename:'이름 바꾸기',fill:'땅 바꾸기',play:'재생',sound:'소리',loop:'반복',heal:'회복',broadcast:'모두에게 알림',effect:'효과',time:'시간',weather:'날씨',day:'낮',noon:'한낮',midnight:'한밤',sunrise:'해 뜰 때',sunset:'해 질 때',clear:'맑음',rain:'비',storm:'폭풍',strength:'힘',defense:'방어',regen:'재생력',haste:'채굴 속도',breath:'물숨',night:'밤',click:'딸깍',hurt:'아픈 소리',swing:'휘두르는 소리',bow:'활',hit:'맞는 소리',break:'부서지는 소리',is:'이면',not:'아니면',random:'무작위',death:'죽을 때',respawn:'다시 살아날 때',variable:'변수',add:'더하기',subtract:'빼기',reset:'처음 값으로',from:'에서',disable:'끄기',enable:'켜기',collision:'부딪힘',all:'전부',land:'땅',beach:'해변',ocean:'바다',mountain:'산',trees:'나무들',rocks:'바위들',ores:'광석들',structures:'건물들',start:'시작 지역',forest:'숲',desert:'사막',volcano:'화산',jungle:'정글',mesa:'붉은 고원',mangrove:'맹그로브',ice:'얼음',
  in:'안에서',of:'의',to:'로',at:'위치',near:'근처',with:'으로',for:'동안',and:'그리고',has:'가지고 있으면',seconds:'초',second:'초',times:'번',blocks:'칸',block:'칸',damage:'데미지',speed:'공격 간격(초)',name:'이름',
  top:'위',bottom:'아래',left:'왼쪽',right:'오른쪽',center:'가운데',player:'플레이어',iron:'철',log:'통나무',stone:'돌',wood:'나무',sword:'검',bench:'작업대',wolf:'늑대',tree:'나무',rock:'바위',grass:'풀',sand:'모래'};
function bsChip(w,first){ var c=document.createElement('span'); c.className='chip'; var b=document.createElement('b'), m=document.createElement('small'), lw=w.toLowerCase(), mean;
  if(/^"/.test(w)){ b.textContent=w; mean='글자'; c.classList.add('s'); }
  else if(/^\{[^}\s]+\}$/.test(w)){ b.textContent=w; mean=/^\{_.*_\}$/.test(w)?'지역 변수':'변수'; c.classList.add('n'); }
  else if(/^\{:[^:\s{}]+:\}$/.test(w)){ b.textContent=w; mean='공유 변수'; c.classList.add('n'); }
  else if(w.toLowerCase()==="%player's mod%"){ b.textContent=w; mean='플레이어 모드 (Potato API 없이 읽기)'; c.classList.add('n'); }
  else if(/^%[A-Za-z0-9_']+%$/.test(w)){ b.textContent=w; mean='(Potato API 필요)'; c.classList.add('n'); }
  else if(/^\d+%$/.test(w)){ b.textContent=w; mean='퍼센트'; c.classList.add('n'); }
  else if(/^~?-?\d+$/.test(w)||w==='~'){ b.textContent=w; mean=w[0]==='~'?'시작 위치 기준':'숫자'; c.classList.add('n'); }
  else if(w===':'){ b.textContent=':'; mean='안쪽 명령'; }
  else if(w==='='){ b.textContent='='; mean='같다'; }
  else if(/^(>=|<=|!=|<|>)$/.test(w)){ b.textContent=w; mean='비교'; c.classList.add('n'); }
  else { b.textContent=w; if(lw==='spawn') mean=first?'소환':'시작 위치'; else mean=BS_MEAN[lw]; if(BS_VERBS.split(' ').indexOf(lw)>=0||lw==='press') c.classList.add('k'); if(mean==null){ mean='(이름)'; c.classList.add('u'); } }
  m.textContent=mean; c.appendChild(b); c.appendChild(m); return c; }
function bsChips(t){ var row=document.createElement('span'); row.className='chips'; if(/^\{:[^:\s{}]{1,22}::.*:\}$/.test(t.trim())){ row.appendChild(bsChip('{:공유:}',false)); var cc=row.lastChild; cc.firstChild.textContent=t.trim(); cc.lastChild.textContent='공유 변수 값 쓰기'; return row; } var re=/"(?:\\.|[^"\\])*"?|~?-?\d+%?|~|%player's mod%|%[A-Za-z0-9_']+%|\{:[^:\s{}]+:\}|\{[^}\s]+\}|[A-Za-z_][\w]*|>=|<=|!=|[:=]|[^\s]/g, m, i=0; while((m=re.exec(t))){ row.appendChild(bsChip(m[0],i===0)); i++; if(m[0][0]==='"'){ (m[0].match(/%[A-Za-z0-9_']+%/g)||[]).filter(function(ph){ return ph.toLowerCase()!=="%player's mod%"; }).forEach(function(ph){ var c=document.createElement('span'); c.className='chip n'; var b=document.createElement('b'), sm=document.createElement('small'); b.textContent=ph; sm.textContent='(Potato API 필요)'; c.appendChild(b); c.appendChild(sm); row.appendChild(c); }); } } return row; }
function bsRun(ctx){ var src=ctx.code, r=bsCheck(src); ctx.pv.innerHTML='';
  var lines=src.split('\n'), stack=[{ind:-1,el:ctx.pv}], any=false;
  lines.forEach(function(raw,i){ var line=raw.replace(/\t/g,'    '); if(!line.trim()||/^\s*#/.test(line)) return; var ind=/^ */.exec(line)[0].length, t=line.trim(); any=true;
    while(stack.length>1&&ind<=stack[stack.length-1].ind) stack.pop(); var par=stack[stack.length-1].el, row;
    if(/:\s*$/.test(t)){ var d=document.createElement('details'); d.open=true; var s=mk('summary',''); s.appendChild(bsChips(t)); d.appendChild(s); var b=mk('div','tb'); d.appendChild(b); par.appendChild(d); stack.push({ind:ind,el:b}); }
    else { row=mk('div','tl'); row.appendChild(bsChips(t)); par.appendChild(row); } });
  if(!any) ctx.pv.appendChild(mk('p','tl','규칙이 아직 없어요. on join: 처럼 써 보세요'));
  if(r.errs.length){ r.errs.sort(function(a,b){ return a.line-b.line; }); r.errs.slice(0,12).forEach(function(e){ ctx.write('✖ '+e.line+'줄: '+e.msg+'\n','err'); }); ctx.errLine(r.errs[0].line); ctx.show('out'); ctx.done(false); return; }
  if(any) ctx.write('✔ 문법이 맞아요. 이 파일을 Beaconfall 모드 올리기 창에 올리면 게임에서 써요\n','ok'); ctx.show('pv'); ctx.done(true); }

/* ---------- examples ---------- */
var EXJS=[['👋 안녕하세요','// console.log()는 결과 칸에 글자를 보여 줘요\nconsole.log("안녕하세요!");\nconst name = "자바스크립트";\nconsole.log(`${name}은(는) 재미있어요`);\n'],
['✖️ 구구단','for (let dan = 2; dan <= 9; dan++) {\n  console.log(`--- ${dan}단 ---`);\n  for (let i = 1; i <= 9; i++) {\n    console.log(`${dan} x ${i} = ${dan * i}`);\n  }\n}\n'],
['📋 배열 다루기','const fruits = ["사과", "바나나", "포도"];\nfruits.push("딸기");\nconsole.log(fruits.map(f => f + "!"));\nconsole.log(fruits.filter(f => f.length > 2));\nconsole.log({ 개수: fruits.length, 첫째: fruits[0] });\n'],
['🖱️ 버튼 누르기 (화면)','const btn = document.createElement("button");\nbtn.textContent = "눌러 보세요";\nlet n = 0;\nbtn.onclick = () => {\n  n++;\n  btn.textContent = n + "번 눌렀어요";\n  console.log("눌림", n);\n};\ndocument.body.appendChild(btn);\n'],
['🎨 그림 그리기 (화면)','const c = document.createElement("canvas");\nc.width = 300; c.height = 200;\ndocument.body.appendChild(c);\nconst g = c.getContext("2d");\ng.fillStyle = "orange";\ng.fillRect(20, 20, 120, 80);\ng.beginPath();\ng.arc(200, 100, 50, 0, Math.PI * 2);\ng.fillStyle = "skyblue";\ng.fill();\n'],
['🐞 오류 내 보기','// 일부러 틀린 코드예요\nconst list = [1, 2, 3];\nconsole.log(list.length);\nconsole.log(list.없는함수());\n']];
var EXJV=[['👋 안녕하세요','public class Main {\n    public static void main(String[] args) {\n        System.out.println("안녕하세요!");\n        String name = "자바";\n        System.out.println(name + "는 재미있어요");\n    }\n}\n'],
['✖️ 구구단','public class Gugudan {\n    public static void main(String[] args) {\n        for (int dan = 2; dan <= 9; dan++) {\n            System.out.println("--- " + dan + "단 ---");\n            for (int i = 1; i <= 9; i++) {\n                System.out.println(dan + " x " + i + " = " + (dan * i));\n            }\n        }\n    }\n}\n'],
['🐶 클래스 만들기','public class Dog {\n    private String name;\n    private int age;\n\n    public Dog(String name, int age) {\n        this.name = name;\n        this.age = age;\n    }\n\n    public String getName() {\n        return name;\n    }\n\n    public void bark() {\n        System.out.println(name + ": 멍멍!");\n    }\n\n    public static void main(String[] args) {\n        Dog d = new Dog("바둑이", 3);\n        d.bark();\n    }\n}\n']];
var EXHT=[['👋 첫 웹페이지','<!DOCTYPE html>\n<html lang="ko">\n<head>\n  <meta charset="UTF-8">\n  <title>내 첫 페이지</title>\n  <style>\n    body { font-family: sans-serif; text-align: center; background: #fff7e0; }\n    h1 { color: #e8590c; }\n  </style>\n</head>\n<body>\n  <h1>안녕하세요!</h1>\n  <p>내가 만든 첫 웹페이지예요.</p>\n</body>\n</html>\n'],
['🔘 누르면 바뀌는 버튼','<button id="b">눌러 보세요</button>\n<p id="t">아직 안 눌렀어요</p>\n<script>\n  let n = 0;\n  document.getElementById("b").onclick = () => {\n    n++;\n    document.getElementById("t").textContent = n + "번 눌렀어요";\n    console.log("눌림", n);\n  };\n<\/script>\n'],
['📋 표와 목록','<h2>오늘 할 일</h2>\n<ul>\n  <li>숙제하기</li>\n  <li>운동하기</li>\n</ul>\n<table border="1" cellpadding="6">\n  <tr><th>과목</th><th>점수</th></tr>\n  <tr><td>국어</td><td>90</td></tr>\n  <tr><td>수학</td><td>85</td></tr>\n</table>\n']];
var EXJN=[['👤 사람 정보','{\n  "이름": "철수",\n  "나이": 12,\n  "취미": ["축구", "게임"],\n  "학교": { "이름": "행복초", "학년": 6 },\n  "안경": false\n}\n'],
['📋 목록','[\n  { "id": 1, "할일": "숙제하기", "끝": true },\n  { "id": 2, "할일": "운동하기", "끝": false }\n]\n'],
['🐞 틀린 JSON','{\n  "이름": "철수",\n  나이: 12,\n  "취미": ["축구", "게임",],\n}\n']];
var EXBS=[['⚔️ 소리와 반복','on kill:\n    play sound hit\n    loop 3 times:\n        give 1 iron\n    heal player 5\n    give effect speed 5 seconds\n    broadcast "%player%가 해냈어요"\n'],['🔢 돌 세기 (변수)','on mine:\n    add 1 to variable stones\n    if variable stones >= 10:\n        say "돌을 %var_stones%개 캤어요"\n        reset variable stones\n'],['🏝️ 빈 시작 섬','# 새 월드의 땅을 바꿔요 (좌표는 픽셀, ~ 는 시작 위치 기준)\non world generate:\n    remove all trees\n    remove all rocks\n    fill ~-600 ~-600 ~600 ~600 to ocean\n    fill ~-150 ~-150 ~150 ~150 to land start\n    fill ~200 ~-100 ~320 ~20 to mountain volcano\n'],['🎁 기본 모드','# Beaconfall 모드 (BeaconScript)\non join:\n    chat "어서 와요!"\n    give 2 iron\n\non key "G" press:\n    teleport player to spawn\n    title "Welcome!" for 3 seconds\n'],
['🌍 월드 만들기','on world generate:\n    remove tree in 20 blocks of spawn\n    spawn wolf 5 times\n    place bench near spawn\n'],
['🗡️ 아이템 바꾸기','set iron_sword damage 12\nset iron_sword speed 0.4\nset iron_sword name "Big Sword"\n'],
['🔘 버튼과 확률','on join:\n    button "Shop" at top right:\n        give 1 iron\n    chance 30%:\n        chat "행운이에요!"\n'],
['🐞 오류 내 보기','# 일부러 틀린 코드예요\non join:\n    gve 2 iron\n    chat "안녕\n']];

window.FCODE={ logos:{"python": "<svg viewBox=\"0 0 24 24\"><path d=\"M12 2C8 2 7 3.5 7 5.5V8h5v1H5.5C3.5 9 2 10.5 2 13.5S3.2 18 5 18H7v-2.5C7 13.5 8.5 12 10.5 12H15c1.7 0 3-1.300 3-3V5.5C18 3.5 16 2 12 2z\" fill=\"#3b78b0\"/><path d=\"M12 22c4 0 5-1.5 5-3.5V16h-5v-1h6.5c2 0 3.5-1.5 3.5-4.5S20.8 6 19 6h-2v2.5C17 10.5 15.5 12 13.5 12H9c-1.7 0-3 1.300-3 3v3.5C6 20.5 8 22 12 22z\" fill=\"#ffd43b\"/><circle cx=\"9.5\" cy=\"5\" r=\".9\" fill=\"#fff\"/><circle cx=\"14.5\" cy=\"19\" r=\".9\" fill=\"#fff\"/></svg>", "javascript": "<svg viewBox=\"0 0 24 24\"><rect width=\"24\" height=\"24\" rx=\"4\" fill=\"#f7df1e\"/><text x=\"21.5\" y=\"21\" text-anchor=\"end\" font-size=\"11\" font-weight=\"800\" font-family=\"Arial,sans-serif\" fill=\"#222\">JS</text></svg>", "java": "<svg viewBox=\"0 0 24 24\"><path d=\"M5 10h11v4a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z\" fill=\"#e76f00\"/><path d=\"M16 11h2a2.5 2.5 0 0 1 0 5h-2\" stroke=\"#e76f00\" stroke-width=\"1.6\" fill=\"none\"/><path d=\"M8 3c2 2-1.5 3 .5 5M12 3c2 2-1.5 3 .5 5\" stroke=\"#5382a1\" stroke-width=\"1.4\" fill=\"none\" stroke-linecap=\"round\"/><rect x=\"4\" y=\"20\" width=\"13\" height=\"1.8\" rx=\".9\" fill=\"#5382a1\"/></svg>", "html": "<svg viewBox=\"0 0 24 24\"><path d=\"M3 2h18l-1.6 17.5L12 22l-7.4-2.5z\" fill=\"#e44d26\"/><path d=\"M12 4v16.2l5.7-1.900L19 4z\" fill=\"#f16529\"/><text x=\"12\" y=\"15\" text-anchor=\"middle\" font-size=\"8.5\" font-weight=\"800\" font-family=\"Arial,sans-serif\" fill=\"#fff\">&lt;/&gt;</text></svg>", "json": "<svg viewBox=\"0 0 24 24\"><rect width=\"24\" height=\"24\" rx=\"5\" fill=\"#2b2f3a\"/><text x=\"12\" y=\"16.5\" text-anchor=\"middle\" font-size=\"13\" font-weight=\"800\" font-family=\"monospace\" fill=\"#8ad4ff\">{ }</text></svg>", "beaconscript": "<svg viewBox=\"0 0 24 24\"><rect width=\"24\" height=\"24\" rx=\"5\" fill=\"#2a1a12\"/><path d=\"M12 3c1 3.5 5 5 5 9.5a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.2 1.5 1 2.2 1.8 2.2C11 8.5 10.5 5.5 12 3z\" fill=\"#ff8a3d\"/><path d=\"M12 12c.7 1.5 2 2.2 2 3.8a2 2 0 0 1-4 0c0-1.2.8-1.8 2-3.8z\" fill=\"#ffd43b\"/></svg>"}, order:['python','javascript','java','html','json','beaconscript'], langs:{
  python:{id:'python',name:'Python',icon:'🐍',ext:'py',mime:'text/x-python',indent:'    ',tabs:[['out','결과']]},
  javascript:{id:'javascript',name:'JavaScript',icon:'🟨',ext:'js',mime:'text/javascript',indent:'  ',hl:jsHl,words:JS_WORDS,ex:EXJS,tabs:[['out','결과'],['pv','화면']],run:jsRun,open:/[{(\[]\s*$/,starter:'console.log("안녕하세요!");\n'},
  java:{id:'java',name:'Java',icon:'☕',ext:'java',mime:'text/x-java-source',indent:'    ',hl:jvHl,words:JV_WORDS,ex:EXJV,tabs:[['out','검사'],['pv','구조']],run:javaRun,open:/[{(\[]\s*$/,live:true,starter:'public class Main {\n    public static void main(String[] args) {\n        System.out.println("안녕하세요!");\n    }\n}\n'},
  html:{id:'html',name:'HTML',icon:'🌐',ext:'html',mime:'text/html',indent:'  ',hl:htmlHl,words:HTML_WORDS,ex:EXHT,tabs:[['pv','미리보기'],['out','콘솔']],run:htmlRun,live:true,open:/<(?!\/|!|meta|link|br|hr|img|input)[A-Za-z][^>]*[^\/]>\s*$/,starter:'<!DOCTYPE html>\n<html lang="ko">\n<head>\n  <meta charset="UTF-8">\n  <title>내 페이지</title>\n</head>\n<body>\n  <h1>안녕하세요!</h1>\n</body>\n</html>\n'},
  json:{id:'json',name:'JSON',icon:'🧾',ext:'json',mime:'application/json',indent:'  ',hl:jsonHl,words:[],ex:EXJN,tabs:[['pv','트리'],['out','검사']],run:jsonRun,live:true,open:/[{\[]\s*$/,starter:'{\n  "이름": "철수",\n  "나이": 12\n}\n'},
  beaconscript:{id:'beaconscript',name:'BeaconScript',icon:'🔥',ext:'bs',mime:'text/plain',indent:'    ',hl:bsHl,words:BS_WORDS,ex:EXBS,tabs:[['pv','규칙 보기'],['out','검사']],run:bsRun,sug:bsSug,live:true,open:/:\s*$/,starter:'on join:\n    chat "어서 와요!"\n'}
}};
})();
