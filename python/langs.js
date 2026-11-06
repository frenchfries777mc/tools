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
var BS_EVENTS=['world generate','join','mine','chop','kill','craft','fish','place','die','death','respawn','break','destroy','damage','roll','interaction','quit','spawn','eat','signal'];
var BS_VERBS='on give set remove replace spawn place teleport title chat say button ui key remap chance if else rename fill disable enable add subtract reset play loop heal damage broadcast every mod resource pack load api multiply divide signal publish_aliases define';
var BS_ORES=['iron','gold','copper','zinc'];
var BS_TERRAIN=['land','beach','ocean','mountain'], BS_BIOMES=['start','forest','desert','volcano','jungle','mesa','rock','mangrove','ice'], BS_ALL=['trees','rocks','ores','structures'], BS_SOUNDS=['click','hurt','swing','bow','hit','break'], BS_COLL=['tree','rock','ore','water','sea','ocean','block','iron','log','stone','wood','sword','bench','wolf'], BS_PH=['%player_name%','%player_location%','%world_player_count%','%online_player%','%player_x%','%player_y%','%player_z%','%world_name%','%player_hp%','%player_max_hp%','%player_item%','%player_biome%','%world_day%','%world_time%','%attacker%','%victim%','%player%','%random%','%nearest_player%','%random_player%','%farest_player%','%nearest_mob%','%random_mob%','%farest_mob%','%nearest_monster%','%random_monster%','%farest_monster%',"%player's_uuid%",'%mod_name%','%mod_uuid%','%crafted_item%','%placed_block%','%distroyed_block%',"%player's mod%",'%player_uuid%','%destroyed_block%','%damage%','%interacted_item%','%interacted%','%eaten_item%'];
var BS_BLOCK=setOf('on button ui chance if else rename loop every publish_aliases define');
var bsHl=mkHl({com:'#[^\\n]*', str:'"(?:\\\\.|[^"\\\\\\n])*"?', kw:setOf(BS_VERBS), bi:setOf('spawn player tree rock seconds blocks times of in to at near with damage speed name press top bottom left right center'), def:{}});
var BS_WORDS=[['on world generate:','on world generate:\n    $0','월드를 처음 만들 때'],['on join:','on join:\n    $0','월드에 들어갈 때'],['on key press:','on key "$0" press:\n    ','키를 눌렀을 때'],['on mine:','on mine:\n    $0','돌 캘 때'],['on chop:','on chop:\n    $0','나무 벨 때'],['on kill:','on kill:\n    $0','몬스터 잡을 때'],['on craft:','on craft:\n    $0','만들 때'],['on fish:','on fish:\n    $0','낚시할 때'],['on death:','on death:\n    $0','죽을 때'],['on destroy:','on destroy chest:\n    $0','부쉈을 때'],['on roll:','on roll:\n    $0','구를 때'],['on quit:','on quit:\n    $0','나갈 때'],['give','give $0','아이템 주기'],['set','set $0 damage 10','아이템 데미지/속도/이름'],['remove','remove tree in 20 blocks of spawn','나무/돌 없애기'],['remove all','remove all trees','나무·바위·광석·건물 전부 없애기'],['disable collision','disable collision of tree','나무·바위·광석·물·블록 부딪힘 끄기'],['enable collision','enable collision of water','부딪힘 켜기'],['fill','fill ~0 ~0 ~300 ~300 to land','땅·해변·바다·산 만들기 (새 월드)'],['fill mountain','fill ~0 ~0 ~300 ~300 to mountain $0','산 만들기 (지역: start forest desert volcano jungle mesa rock mangrove ice)'],['spawn','spawn wolf $0 times','몹 소환'],['place','place bench near spawn','구조물 설치'],['teleport','teleport player to spawn','순간이동'],['title','title "$0" for 3 seconds','화면 중앙 글자'],['chat','chat "$0"','채팅'],['%player_name%','%player_name%','플레이어 이름 (Potato API 모드)'],['%online_player%','%online_player%','접속 인원 (Potato API 모드)'],['say','say "$0"','말하기'],['button','button "$0" at top right:\n    ','화면 버튼'],['ui','ui "$0":\n    ','작은 창'],['remap','remap "E" to "R"','키 바꾸기'],['chance','chance 30%:\n    $0','확률'],['if','if $0:\n    ','조건']];
var BS_ITEMS='iron log stone wood sword bench wolf spawn player';


/* word-by-word suggestions: after "on " it offers world, join... one word at a time */
var BS_TIPS={break:'부술 때',destroy:'부쉈을 때',contained:'들어 있으면',world:'월드',join:'들어올 때',mine:'돌 캘 때',chop:'나무 벨 때',kill:'몬스터 잡을 때',craft:'만들 때',fish:'낚시할 때',place:'설치할 때',die:'죽을 때',key:'키'};
function orSplit(s){ var mk=s.replace(/"(?:\\.|[^"\\])*"/g,function(m){ return new Array(m.length+1).join('\u0001'); }), out=[], last=0, re=/\s+or\s+/g, m; while((m=re.exec(mk))){ out.push(s.slice(last,m.index)); last=m.index+m[0].length; } out.push(s.slice(last)); return out; }
function bsItem(str){ var db=window.BS_ITEMDB; if(!db||!str) return null; var x=str.trim().replace(/^"|"$/g,'').trim(), l=x.toLowerCase(); if(!x) return null; if(Object.prototype.hasOwnProperty.call(db,l)) return {id:l,n:db[l][0],ic:db[l][1]}; for(var k in db){ if(db[k][0]===x) return {id:k,n:db[k][0],ic:db[k][1]}; } return null; }
function bsItemSug(){ var db=window.BS_ITEMDB, out=[]; if(!db) return out; Object.keys(db).forEach(function(k){ out.push({n:k,i:k+':',d:db[k][0]}); }); Object.keys(db).forEach(function(k){ if(/^[^\x00-\x7f]/.test(db[k][0])) out.push({n:db[k][0],i:db[k][0]+':',d:k}); }); return out; }
function bsCtx(ctx,before){ if(!ctx) return ''; var ci=(/^ */.exec(before.replace(/\t/g,'    '))||[''])[0].length, ls=ctx.split('\n'); for(var i=ls.length-1;i>=0;i--){ var l=ls[i].replace(/\t/g,'    '); if(!l.trim()||/^\s*#/.test(l)) continue; var ind=/^ */.exec(l)[0].length; if(ind<ci) return l.trim().toLowerCase(); } return ''; }
function bsSug(before,pre,ctx){
  var tk=before.replace(/"(?:\\.|[^"\\])*"/g,'"S"').trim().split(/\s+/).filter(Boolean).map(function(x){ return x.toLowerCase(); }), n=tk.length, v=tk[0]||'', M=BS_MEAN;
  function W(list,suffix){ return list.map(function(w){ return {n:w,i:w+(suffix==null?' ':suffix),d:M[w]||BS_TIPS[w]||''}; }); }
  var ITEMS=['iron','log','stone','wood','sword','bench','wolf'];
  var oi=tk.lastIndexOf('or'); if(oi>0&&((v==='on'&&tk.indexOf('of')>0&&tk.indexOf('of')<oi)||(/^(chat|say|play|give)$/.test(v)&&tk.indexOf('to')>0&&tk.indexOf('to')<oi))) return W(['player','monster','mob'],''); if(oi>0&&(v==='on'||v==='if')&&!(v==='on'&&tk[1]==='key')){ if(oi===n-1&&v==='if') return W(['variable','has','player','world','mod','not']).concat([{n:'%attacker%',i:'%attacker% is ',d:'공격한 쪽'},{n:'%victim%',i:'%victim% is ',d:'맞은 쪽'}]); if(oi===n-1&&v==='on'&&/^(place|destroy|eat)$/.test(tk[1])) return bsItemSug().concat(bsSug('on ',pre)); return bsSug(v+' '+tk.slice(oi+1).join(' ')+(oi===n-1?'':' '),pre); }
  if(n===0){ var pc=bsCtx(ctx,before); if(/^publish_aliases\s*:/.test(pc)) return [{n:'aliases_name',i:'aliases_name: "%$0%"',d:'다른 모드가 부를 이름'},{n:'use_command:',i:'use_command:\n    ',d:'그 이름을 풀어 주는 명령'}]; }
  if(n===0){ var dpc=bsCtx(ctx,before); if(/^define\s+item\b/.test(dpc)) return W(['base','recipe','makes']); if(/^define\s+mob\b/.test(dpc)) return W(['base','biome','rate','max']); if(/^define\s+ore\b/.test(dpc)) return W(['base','color','drop','biome','chance']); }
  if(n===0) return W(BS_VERBS.split(' ').filter(function(x){ return x!=='else'||true; })).concat([{n:'use_mod_uuid:',i:'use_mod_uuid: ',d:'다른 모드 uuid (그 모드 공유 변수를 %이름%으로 읽기, 최대 5줄)'}]);
  if(v==='on'){
    if(n===1) return W(['world']).concat(W(['join','quit','mine','chop','kill','craft','fish','place','destroy','damage','death','respawn','roll','interaction','spawn','eat'],':'),W(['key']),[{n:'signal',i:'signal "$0":',d:'다른 모드가 보낸 신호를 받을 때'}]);
    if(tk[1]==='world'&&n===2) return W(['generate'],':');
    if(tk[1]==='key'&&n===2) return [{n:'"G"',i:'"$0" press:',d:'누를 키 (글자 하나)'}];
    if(tk[1]==='key'&&n===3) return W(['press'],':');
    if((tk[1]==='place'||tk[1]==='eat'||tk[1]==='craft')&&n===2) return bsItemSug();
    if(tk[1]==='destroy'&&n===2){ var base0=['tree','rock'].map(function(k){ return {n:k,i:k+':',d:k==='tree'?'나무':'바위'}; }); return base0.concat(bsItemSug().filter(function(x){ return x.n!=='tree'&&x.n!=='rock'; })); }
    if(tk[n-1]==='of') return tk[1]==='interaction'?W(['chest','bench','trader'],':'):tk[1]==='spawn'?W(['wolf','slime'],':'):W(['player','monster','mob'],':');
    if(tk[1]==='signal'){ return n===2?[{n:'"이름"',i:'"$0":',d:'받을 신호 이름'}]:[]; }
    if(tk[1]==='damage'&&tk.indexOf('of')>0&&n>=4&&tk[n-1]!=='by'&&tk.indexOf('by')<0) return W(['by','or']);
    if(tk[n-1]==='by') return W(['player','monster','mob'],':');
    if(n>=2&&tk[1]!=='key') return W(['of','or']);
    return [];
  }
  if(v==='define'){ if(n===1) return W(['item','mob','ore'],' '); if(n===2) return [{n:'"이름"',i:'"$0":',d:'새로 만들 이름'}]; return []; }
  if(v==='base'||v==='recipe'||v==='makes'||v==='biome'||v==='rate'||v==='max'||v==='color'||v==='drop'||v==='chance'){ var dctx=bsCtx(ctx,before), dm2=/^define\s+(item|mob|ore)\b/.exec(dctx); if(dm2){ if(v==='base') return n===1?(dm2[1]==='item'?bsItemSug():dm2[1]==='ore'?W(BS_ORES,''):W(['wolf','slime'],'')):[]; if(v==='color') return n===1?[{n:'"#e0245e"',i:'"#$0"',d:'광물 색 (#과 16진수 6자리)'}]:[]; if(v==='drop') return n===1?bsItemSug():[]; if(v==='recipe') return (n===1||tk[n-1]===','||/,$/.test(before.trim()))?bsItemSug():[]; if(v==='biome') return (n===1||/,$/.test(before.trim()))?W(BS_BIOMES,''):[]; return []; } }
  if(v==='every'){ if(n===2) return W(['second','seconds'],':'); return []; }
  if(tk[n-1]==='to'&&(v==='chat'||v==='say'||v==='play'||v==='give')) return W(['player','monster','mob'],'');
  if((v==='chat'||v==='say')&&n===2) return W(['to']);
  if(v==='give'){ if(n===1) return W(['effect']).concat(W(ITEMS,'')); if(tk[1]==='effect'){ if(n===2) return W(['speed','strength','defense','regen','haste','breath','night','stun']); if(n===4) return W(['seconds']); if(n===5) return W(['to']); return []; } return W(ITEMS,''); }
  if(v==='play'){ if(n===1) return W(['sound']); if(n===2) return W(BS_SOUNDS); if(n===3) return W(['to']); return []; }
  if(v==='loop'){ if(n===2) return W(['times'],':'); return []; }
  if(v==='heal'||v==='damage'){ if(n===1) return W(['player']); return []; }
  if(v==='set'){ if(n===1) return W(['variable','time','weather']).concat(W(ITEMS)); if(tk[1]==='time'){ if(n===2) return W(['day','night','noon','midnight','sunrise','sunset'],''); return []; } if(tk[1]==='weather'){ if(n===2) return W(['clear','rain','storm'],''); return []; } if(tk[1]==='variable'&&n===4) return W(['random','variable','player','distance']); if(tk[1]==='variable'&&tk[4]==='player'){ if(n===5) return W(['name','uuid'],''); return []; } if(tk[1]==='variable'&&tk[4]==='variable') return []; if(tk[1]==='variable'&&tk[4]==='distance'){ if(n===5) return W(['player']); if(n===6) return W(['to']); if(n===7) return W(['nearest']).concat([{n:'스폰할 몬스터 이름',i:'',d:'예: slime, wolf'}].slice(1)); if(n===8&&tk[7]==='nearest') return W(['monster','mob'],''); return []; } if(tk[1]==='variable'&&tk[4]==='random'&&n===6) return W(['to']); if(tk[1]==='variable'){ if(n===3) return W(['to']); return []; } if(n===2) return W(['damage','speed','name']); return []; }
  if(v==='else'){ if(n===1) return W(['if']); if(tk[1]==='if') return bsSug(before.replace(/^\s*else\s+/i,''),pre,ctx); return []; }
  if(v==='add'||v==='subtract'){ var pw=v==='add'?'to':'from'; if(n===1) return W(['variable']); if(tk[1]==='variable'){ if(n===3) return W([pw]); if(n===4) return W(['variable']); return []; } if(n===2) return W([pw]); if(n===3) return W(['variable']); return []; }
  if(v==='multiply'||v==='divide'){ if(n===1) return W(['variable']); if(n===3) return W(['by']); if(n===4) return W(['variable']); return []; }
  if(v==='signal'){ if(n===1) return W(['send']); var ti=tk.indexOf('to'); if(ti<0) return (n===3||n===4)?W(['to']):[]; if(n===ti+1) return W(['mod']); if(n===ti+2) return [{n:'back',i:'back',d:'신호를 보낸 모드로 답해요'},{n:'"모드이름"',i:'"$0"',d:'받을 모드 이름'}]; return []; }
  if(v==='publish_aliases') return [];
  if(v==='reset'){ if(n===1) return W(['variable']); return []; }
  if(v==='if'&&(tk[1]==='player'||tk[1]==='world')){ var OPS=['<','<=','>','>=','=','!='].map(function(o){ return {n:o,i:o+' ',d:'비교'}; });
    if(tk[1]==='world'){ if(n===2) return W(['day','hour','players']); if(n===3) return OPS; if(n===4) return W(['variable']); return []; }
    if(n===2) return W(['hp','max','x','y','z','biome','item','name']);
    if(tk[2]==='max'){ if(n===3) return W(['hp']); if(n===4) return OPS; if(n===5) return W(['variable']); return []; }
    if(tk[2]==='biome'||tk[2]==='item'||tk[2]==='name'){ if(n===3) return W(['is']); if(n===4) return W(['not']).concat(tk[2]==='biome'?W(BS_BIOMES,':'):tk[2]==='item'?bsItemSug():[]); if(n===5&&tk[4]==='not') return tk[2]==='biome'?W(BS_BIOMES,':'):tk[2]==='item'?bsItemSug():[]; return []; }
    if(n===3) return OPS; if(n===4) return W(['variable']); return []; }
  if(v==='load') return [];
  if(v==='if'&&(tk[1]==='mod'||(tk[1]==='not'&&tk[2]==='mod'))){ var mi=tk[1]==='mod'?1:2; if(n===mi+1) return [{n:'"이름"',i:'"$0":',d:'모드 이름 (대소문자 무시)'}]; return []; }
  if(v==='if'&&tk[1]==='not'&&n===2) return W(['mod']);
  if(v==='api'){ if(n===1) return W(['potato'],''); return []; }
  if(v==='resource'){ if(n===1) return W(['pack'],''); return []; }
  if(v==='if'&&tk[1]==='signal'){ var sg={2:'receive',4:'into',6:'run',7:'text',8:'replace',10:'to'}; return sg[n]?W([sg[n]]):[]; }
  if(v==='if'&&tk[1]==='variable'){ if(n===2) return [{n:'{이름}',i:'{$0}',d:'변수 (공유 변수는 {:이름:})'}]; if(n===3) return ['<','<=','>','>=','=','!='].map(function(o){ return {n:o,i:o+' ',d:'비교'}; }).concat(W(['is'])); if(n===4&&tk[3]==='is') return W(['not']); return []; }
  if(v==='if'){ if(n===1) return W(['variable','has','player','world','mod','not','signal']); if(n===2&&tk[1]&&/^(\{.*\}|%.*%)$/.test(tk[1])) return W(['contained'],''); if(tk[1]&&tk[1][0]==='%'){ if(n===2) return W(['is']); if(n===3) return W(['not']).concat(W(['player'],':'),W(['contained'],'')); if(n===4&&tk[3]==='not') return W(['player'],':'); } return []; }
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
function bsCheck(src,nested){ var lastK={}, V='(?:\\{:[a-z0-9_]{1,17}:\\}|\\{[a-z0-9_가-힣]{1,22}\\})', NUM='-?\\d{1,9}(?:\\.\\d{1,3})?', aliasSet={}, hasUse=/^\s*use_mod_uuid\s*:/im.test(src), useCount=0, hasUuid=/^\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*$/im.test(src), hdrSeen={}, seenCode=false, errs=[], stack=[], lines=src.split('\n'), VERB=BS_VERBS.split(' ');
  var oreN=0;
  function chkDf(cl){ if(cl.df&&!cl.bad&&cl.kids&&!cl.seen.base) errs.push({line:cl.line,msg:'base 줄이 필요해요 (바탕이 되는 '+(cl.df==='item'?'아이템':cl.df==='ore'?'광물(iron·gold·copper·zinc)':'몹')+')'}); }
  lines.forEach(function(l0){ var m0=/^\s*aliases_name\s*:\s*"(%[a-z0-9_]{1,30}%)"\s*$/i.exec(l0); if(m0) aliasSet[m0[1].toLowerCase()]=1; });
  lines.forEach(function(raw,i){ var ln=i+1, line=raw.replace(/\t/g,'    '); if(!line.trim()||/^\s*#/.test(line)) return;
    var ind=/^ */.exec(line)[0].length, t=line.trim(), m;
    var q=t.replace(/"(?:\\.|[^"\\])*"/g,''); if(/"/.test(q)){ errs.push({line:ln,msg:'따옴표(")가 닫히지 않았어요'}); }
    while(stack.length&&ind<=stack[stack.length-1].ind){ var cl=stack.pop(); chkDf(cl); if(!cl.kids) errs.push({line:cl.line,msg:'":" 로 끝난 줄 아래에는 안쪽으로 들여쓴 명령이 와야 해요'}); if(cl.pa&&cl.want) errs.push({line:cl.want,msg:'aliases_name 줄 바로 아래에 use_command: 줄이 필요해요'}); }
    var par=stack[stack.length-1]; if(par){ par.kids++; } else if(ind>0) errs.push({line:ln,msg:'맨 앞 줄은 들여쓰지 않아요'});
    if(par&&par.pa){ if(/^aliases_name\b/i.test(t)){ if(!/^aliases_name\s*:\s*"%[a-z0-9_]{1,30}%"\s*$/i.test(t)) errs.push({line:ln,msg:'이렇게 써요: aliases_name: "%player_name%"  (이름은 소문자·숫자·_ 30자까지)'}); else { if(par.want) errs.push({line:par.want,msg:'aliases_name 줄 바로 아래에 use_command: 줄이 필요해요'}); if(++par.cnt>120) errs.push({line:ln,msg:'publish_aliases 에는 120개까지 쓸 수 있어요'}); } par.want=ln; }
      else if(/^use_command\s*:\s*$/i.test(t)){ if(!par.want) errs.push({line:ln,msg:'use_command: 는 aliases_name 줄 바로 아래에 써요'}); par.want=0; stack.push({line:ln,ind:ind,kids:0}); }
      else errs.push({line:ln,msg:'publish_aliases 안에는 aliases_name: "%이름%" 와 use_command: 만 써요'});
      return; }
    if(par&&par.df&&par.bad) return;
    if(par&&par.df){ var dk=par.df, dm=/^([a-z]+)\s*(.*)$/i.exec(t), dv=dm?dm[1].toLowerCase():'', da=dm?dm[2].trim():'', dok=dk==='item'?{base:1,recipe:1,makes:1}:dk==='ore'?{base:1,color:1,drop:1,biome:1,chance:1}:{base:1,biome:1,rate:1,max:1};
      if(!dok[dv]){ errs.push({line:ln,msg:'define '+dk+' 안에는 '+(dk==='item'?'base · recipe · makes':dk==='ore'?'base · color · drop · biome · chance':'base · biome · rate · max')+' 줄만 써요'}); return; }
      if(par.seen[dv]) errs.push({line:ln,msg:dv+' 줄은 한 번만 써요'}); par.seen[dv]=1;
      function dItem(x){ if(window.BS_ITEMDB&&!bsItem(x)){ var gi=guess(x.toLowerCase(),Object.keys(window.BS_ITEMDB)); errs.push({line:ln,msg:"unknown item '"+x+"' — 없는 아이템이에요"+(gi?" — 혹시 '"+gi+"'?":'')}); } }
      if(dv==='base'&&dk==='ore'){ if(BS_ORES.indexOf(da.toLowerCase())<0){ var go=guess(da.toLowerCase(),BS_ORES); errs.push({line:ln,msg:"이렇게 써요: base iron  ("+BS_ORES.join('·')+" 중 하나, 곡괭이와 캐는 시간을 정해요)"+(go?" — 혹시 '"+go+"'?":'')}); } }
      else if(dv==='color'){ if(!/^"#[0-9a-f]{6}"$/i.test(da)) errs.push({line:ln,msg:'이렇게 써요: color "#e0245e"  (#과 16진수 6자리, 큰따옴표로 감싸요)'}); }
      else if(dv==='drop'){ var dr=/^([a-z0-9_]{1,30})\s+(\d{1,3})\s+(\d{1,3})$/i.exec(da); if(!dr) errs.push({line:ln,msg:'이렇게 써요: drop gold 1 2  (떨어지는 아이템, 최소 개수, 최대 개수)'}); else { dItem(dr[1]); if(+dr[2]<1||+dr[3]<+dr[2]) errs.push({line:ln,msg:'개수는 1 이상이고 최소 ≤ 최대여야 해요'}); } }
      else if(dv==='chance'){ if(!/^\d{1,3}(?:\.\d{1,2})?%?$/.test(da)||parseFloat(da)<=0||parseFloat(da)>100) errs.push({line:ln,msg:'이렇게 써요: chance 5  (바위 중 이 광물이 되는 비율 %, 0보다 크고 100까지)'}); }
      else if(dv==='base'){ if(!/^[a-z0-9_]{1,30}$/i.test(da)) errs.push({line:ln,msg:'이렇게 써요: base '+(dk==='item'?'iron':'wolf')+'  (바탕이 되는 '+(dk==='item'?'아이템':'몹')+' 이름)'}); else if(dk==='item') dItem(da); }
      else if(dv==='recipe'){ var rs=da?da.split(','):[]; if(!rs.length||rs.length>7) errs.push({line:ln,msg:'이렇게 써요: recipe iron 2, log  (작업대 칸 순서대로 "재료 개수", 쉼표로 나누고 최대 7칸)'}); else rs.forEach(function(r){ var rm=/^\s*([a-z0-9_]{1,30})(?:\s+(\d{1,3}))?\s*$/i.exec(r); if(!rm) errs.push({line:ln,msg:'재료는 "재료 개수" 모양으로 써요: recipe iron 2, log'}); else { if(rm[2]&&+rm[2]<1) errs.push({line:ln,msg:'재료 개수는 1 이상이에요'}); dItem(rm[1]); } }); }
      else if(dv==='makes'){ if(!/^\d{1,3}$/.test(da)||+da<1) errs.push({line:ln,msg:'이렇게 써요: makes 1  (한 번에 만드는 개수, 1 이상)'}); }
      else if(dv==='biome'){ var bl=da?da.split(','):[]; if(!bl.length) errs.push({line:ln,msg:'이렇게 써요: biome start, forest  ('+BS_BIOMES.join(' ')+')'}); else bl.forEach(function(b){ var bb=b.trim().toLowerCase(); if(BS_BIOMES.indexOf(bb)<0){ var gb=guess(bb,BS_BIOMES); errs.push({line:ln,msg:"모르는 지역 '"+b.trim()+"'"+(gb?" — 혹시 '"+gb+"'?":' ('+BS_BIOMES.join('·')+' 중에서)')}); } }); }
      else if(dv==='rate'){ if(!/^\d{1,4}(?:\.\d{1,2})?$/.test(da)||+da<=0) errs.push({line:ln,msg:'이렇게 써요: rate 6  (플레이어 근처에서 1분에 나오는 정도, 0보다 크게)'}); }
      else if(dv==='max'){ if(!/^\d{1,3}$/.test(da)||+da<1) errs.push({line:ln,msg:'이렇게 써요: max 4  (동시에 살아 있는 최대 마릿수, 1 이상)'}); }
      return; }
    if(/^define\b/i.test(t)){ var dh=/^define\s+(item|mob|ore)\s+"([^"]{1,40})"\s*:\s*$/i.exec(t); seenCode=true; if(dh&&dh[1].toLowerCase()==='ore'&&++oreN>4) errs.push({line:ln,msg:'define ore 는 모드당 최대 4개예요'}); if(!dh){ errs.push({line:ln,msg:'이렇게 써요: define item "이름":  /  define mob "이름":  /  define ore "이름":'}); if(/:\s*$/.test(t)) stack.push({line:ln,ind:ind,kids:0,df:'item',seen:{},bad:1}); return; } if(ind!==0) errs.push({line:ln,msg:'define 은 맨 앞 줄에 써요'}); stack.push({line:ln,ind:ind,kids:0,df:dh[1].toLowerCase(),seen:{}}); return; }
    if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)){ if(seenCode) errs.push({line:ln,msg:'uuid 줄은 파일 맨 위(다른 명령보다 앞)에 써요'}); else if(hdrSeen.uuid) errs.push({line:ln,msg:'uuid 줄은 한 번만 써요'}); hdrSeen.uuid=1; if(ind!==0) errs.push({line:ln,msg:'uuid 은 맨 앞 줄에 써요'}); return; }
    if(/^[0-9a-f]{8}-[0-9a-f]/i.test(t)){ errs.push({line:ln,msg:'uuid 모양이 아니에요: 550e8400-e29b-41d4-a716-446655440000 처럼 8-4-4-4-12자리 (0-9, a-f)'}); return; }
    if(/^use_mod_uuid\b/i.test(t)){ if(!/^use_mod_uuid:\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*$/i.test(t)) errs.push({line:ln,msg:'이렇게 써요: use_mod_uuid: 550e8400-e29b-41d4-a716-446655440000  (uuid는 8-4-4-4-12자리, 0-9 a-f)'}); else if(seenCode) errs.push({line:ln,msg:'use_mod_uuid 줄은 파일 맨 위(다른 명령보다 앞)에 써요'}); if(++useCount>5) errs.push({line:ln,msg:'use_mod_uuid 줄은 5개까지예요'}); if(ind!==0) errs.push({line:ln,msg:'use_mod_uuid 는 맨 앞 줄에 써요'}); return; }
    var verb=/^[A-Za-z_]+/.exec(t); verb=verb?verb[0].toLowerCase():'';
    if(/^\{:/.test(t)){ if(!/^\{:[^:\s{}]{1,22}::(?:"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?|%[A-Za-z0-9_' ]+%):\}$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: {:이름::"글자":}  (값은 "글자"·숫자·%…%)'}); else if(hasUuid&&/^\{:([^:\s{}]+)::/.exec(t)[1].length>21) errs.push({line:ln,msg:'uuid가 있는 모드는 공유 변수 이름이 21자까지예요'}); return; }
    if(!verb){ errs.push({line:ln,msg:'명령으로 시작해야 해요: '+t.slice(0,20)}); return; }
    if(VERB.indexOf(verb)<0){ var g=guess(verb,VERB); errs.push({line:ln,msg:"모르는 명령 '"+verb+"'"+(g?" — 혹시 '"+g+"'?":'')}); return; }
    Object.keys(lastK).forEach(function(k){ if(+k>ind) delete lastK[k]; });
    if(verb==='else'){ var em2=/^else\s*(?:if\s+(.+?))?\s*:\s*$/i.exec(t);
      if(!em2) errs.push({line:ln,msg:'이렇게 써요: else:  (또는 else if 조건:)'});
      else { if(lastK[ind]!=='if') errs.push({line:ln,msg:'else 는 if·chance 블록 바로 아래, 같은 들여쓰기에 써요 (else 는 맨 끝에 한 번만)'});
        if(em2[1]){ var se=bsCheck('if '+em2[1].trim()+':',true).errs; se.forEach(function(e){ if(!/아래에는/.test(e.msg)) errs.push({line:ln,msg:e.msg}); }); } }
      lastK[ind]=(em2&&em2[1])?'if':'else'; }
    else lastK[ind]=((verb==='if'||verb==='chance')&&/:\s*$/.test(t))?'if':'other';
    var first0=!seenCode&&!hdrSeen.name; if(verb==='mod'||verb==='resource'||verb==='pack') hdrSeen.name=1; else if(verb!=='api') seenCode=true;
    if(verb==='api'){ if(!/^api\s+potato\s*$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: api potato'}); else if(seenCode) errs.push({line:ln,msg:'api 줄은 파일 맨 위(mod 이름 줄 아래)에 써요'}); else if(hdrSeen.api) errs.push({line:ln,msg:'api 줄은 한 번만 써요'}); hdrSeen.api=1; if(ind!==0) errs.push({line:ln,msg:'api 는 맨 앞 줄에 써요'}); return; }
    if(verb==='mod'||verb==='resource'||verb==='pack'){ if(!(verb==='mod'&&/^mod\s+"[^"]+"\s*$/.test(t))&&!(verb==='resource'&&/^resource\s+pack\s+"[^"]+"\s*$/.test(t))&&!(verb==='pack'&&/^pack\s+"[^"]+"\s*$/.test(t))) errs.push({line:ln,msg:'이렇게 써요: mod "이름"  (리소스팩은 resource pack "이름" 또는 pack "이름")'}); else if(!first0) errs.push({line:ln,msg:verb+' 줄은 파일 맨 위에 한 번만 써요'}); if(ind!==0) errs.push({line:ln,msg:verb+' 은 맨 앞 줄에 써요'}); return; }
    if(!par&&!nested){ var topOk=/^(on|every|rename|remap|disable|enable|fill|load|publish_aliases)$/.test(verb)||(verb==='remove'&&/^remove\s+all\b/i.test(t))||(verb==='set'&&!/^set\s+(variable|time|weather)\b/i.test(t)&&/^set\s+\S.*\s(damage|speed|name)\b/i.test(t)); if(!topOk){ errs.push({line:ln,msg:verb+' 줄은 on·every 블록 안쪽(들여쓰기)에 써요'}); } }
    var opens=/:\s*$/.test(t);
    if(verb==='on'&&/^on\s+key\s+"[^"]*"(?:\s+or\s+"[^"]*")+\s+press\s*:\s*$/.test(t)){ if(ind!==0) errs.push({line:ln,msg:'on 은 맨 앞 줄에 써요'}); stack.push({line:ln,ind:ind,kids:0}); return; }
    if((verb==='on'||verb==='if')&&opens){ var body0=t.replace(/^(on|if)\s+/i,'').replace(/:\s*$/,''), parts0=orSplit(body0);
      var tgs0=[], lp0=parts0;
      if(verb==='on'){ var om=/^(.*?)\s+of\s+(.+)$/.exec(body0); if(om){ lp0=orSplit(om[1]); tgs0=orSplit(om[2]); } }
      if(lp0.length>1||tgs0.length>1){ var ofS=tgs0.length?' of '+tgs0[0].trim():'', seen0={};
        var prevEv0=''; lp0.forEach(function(pt){ if(verb==='on'){ var fw=pt.trim().split(/\s+/)[0].toLowerCase(), isEv=fw==='key'||BS_EVENTS.some(function(e){ return e.split(' ')[0]===fw; }); if(!isEv&&/^(place|destroy|eat|kill|mine|chop|craft|fish)$/.test(prevEv0)) pt=prevEv0+' '+pt.trim(); else prevEv0=fw; } var sub=verb+' '+pt.trim()+(verb==='on'?ofS:'')+':'; bsCheck(sub,true).errs.forEach(function(e){ if(/아래에는/.test(e.msg)||seen0[e.msg]) return; seen0[e.msg]=1; errs.push({line:ln,msg:e.msg}); }); });
        tgs0.slice(1).forEach(function(tg){ if(!/^(?:player|monster|mob|"[^"]*"|%[^%\s"]+%|[A-Za-z0-9_가-힣]+)$/.test(tg.trim())&&!seen0.tg){ seen0.tg=1; errs.push({line:ln,msg:'of 뒤에는 player·monster·mob·이름을 써요: on damage of monster or Bob:'}); } });
        if(verb==='on'&&ind!==0) errs.push({line:ln,msg:'on 은 맨 앞 줄에 써요'});
        stack.push({line:ln,ind:ind,kids:0,wg:!!(par&&par.wg)}); return; } }
    if(verb==='on'){ var ev=t.replace(/^on\s+/i,'').replace(/:\s*$/,'').trim(), byM=/^([^"]*?)\s+by\s+(.+)$/i.exec(ev); if(byM){ ev=byM[1].trim(); orSplit(byM[2]).forEach(function(bt){ if(!/^(?:player|monster|mob|"[^"]*"|%[^%\s"]+%|[A-Za-z0-9_가-힣]+)$/.test(bt.trim())) errs.push({line:ln,msg:'by 뒤에는 player·monster·mob·이름을 써요: on damage of player by slime:'}); }); } var ofm=/^(.+?)\s+of\s+(.+)$/.exec(ev), ofT=null; if(!ofm&&/\sof$/.test(ev)){ errs.push({line:ln,msg:'of 뒤에는 player·monster·mob·이름을 써요: on damage of monster:'}); ev=ev.replace(/\s+of$/,''); } if(ofm){ ev=ofm[1].trim(); ofT=ofm[2].trim(); if(!/^(?:player|monster|mob|"[^"]*"|%[^%\s"]+%|[A-Za-z0-9_가-힣]+)$/.test(ofT)) errs.push({line:ln,msg:'of 뒤에는 player·monster·mob·이름을 써요: on damage of monster:'}); }
      var base=ev.replace(/\s*"[^"]*"\s*/,' ').replace(/\s+/g,' ').trim();
      var plm=/^(?:place|destroy|eat|craft)\s+(\S.*)$/i.exec(ev); if(plm&&/^(tree|rock)$/i.test(plm[1].trim())&&/^destroy/i.test(ev)) plm=null; if(plm&&window.BS_ITEMDB&&!bsItem(plm[1])){ var ids=Object.keys(window.BS_ITEMDB), g8=guess(plm[1].trim().toLowerCase(),ids); errs.push({line:ln,msg:"unknown item '"+plm[1].trim()+"' — 없는 아이템이에요"+(g8?" — 혹시 '"+g8+"'?":'')}); }
      var okEv=!!plm||/^destroy\s+(tree|rock)$/i.test(ev)||/^key\s+press$/.test(base)||BS_EVENTS.indexOf(base)>=0||BS_EVENTS.indexOf(base.split(' ')[0])>=0&&base.split(' ').length<=2;
      if(!okEv){ var g2=guess(base,BS_EVENTS); errs.push({line:ln,msg:"모르는 때 'on "+ev+"'"+(g2?" — 혹시 'on "+g2+"'?":'')}); }
      if(/^signal\b/i.test(ev)&&!/^signal\s+"[^"]{1,40}"$/i.test(ev)) errs.push({line:ln,msg:'이렇게 써요: on signal "이름":'});
      if(!opens) errs.push({line:ln,msg:"on 줄은 ':' 로 끝나야 해요"}); if(ind!==0) errs.push({line:ln,msg:'on 은 맨 앞 줄에 써요'}); }
    else if(BS_BLOCK[verb]&&!opens&&verb!=='rename'&&!(verb==='place'||verb==='set')&&!(verb==='if'&&/^if\s+signal\b/i.test(t))) errs.push({line:ln,msg:verb+" 줄은 ':' 로 끝나야 해요"});
    if(/^(give|set|remove|replace|spawn|place|teleport|title|chat|say|remap|fill|add|subtract|multiply|divide|signal|reset|play|heal|broadcast)$/.test(verb)&&t.split(/\s+/).length<2) errs.push({line:ln,msg:verb+' 뒤에 무엇을 할지 써 주세요'});
    if(verb==='remap'&&!/^remap\s+"[^"]+"\s+to\s+"[^"]+"/.test(t)) errs.push({line:ln,msg:'이렇게 써요: remap "E" to "R"'});
    if(verb==='load'){ if(!/^load\s+(~?-?\d+)\s+(~?-?\d+)\s+(~?-?\d+)\s+(~?-?\d+)\s*$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: load ~-300 ~-300 ~300 ~300  (fill과 같은 좌표 4개)'}); if(!(par&&par.wg)) errs.push({line:ln,msg:'load 는 on world generate: 안에서만 써요'}); }
    if(verb==='if'&&/^if\s+(?:not\s+)?mod\b/i.test(t)&&!/^if\s+(?:not\s+)?mod\s+"[^"]+"\s*:\s*$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: if mod "potato api":  (또는 if not mod "이름":)'});
    if(verb==='fill'){ var fm=/^fill\s+(~?-?\d+)\s+(~?-?\d+)\s+(~?-?\d+)\s+(~?-?\d+)\s+to\s+([a-z]+)(?:\s+([a-z]+))?\s*$/i.exec(t);
      if(!fm) errs.push({line:ln,msg:'이렇게 써요: fill ~0 ~0 ~200 ~200 to land (또는 beach·ocean·mountain, 뒤에 지역 이름)'});
      else { var tt=fm[5].toLowerCase(); if(BS_TERRAIN.indexOf(tt)<0){ var g3=guess(tt,BS_TERRAIN); errs.push({line:ln,msg:"모르는 땅 '"+tt+"'"+(g3?" — 혹시 '"+g3+"'?":' (land·beach·ocean·mountain 중에서)')}); }
        if(fm[6]){ var bb=fm[6].toLowerCase(); if(BS_BIOMES.indexOf(bb)<0){ var g4=guess(bb,BS_BIOMES); errs.push({line:ln,msg:"모르는 지역 '"+bb+"'"+(g4?" — 혹시 '"+g4+"'?":' ('+BS_BIOMES.join('·')+' 중에서)')}); } } } }
    if(verb==='remove'&&/^remove\s+all\b/i.test(t)){ var ra=t.split(/\s+/)[2]; if(!ra||BS_ALL.indexOf(ra.toLowerCase())<0) errs.push({line:ln,msg:'이렇게 써요: remove all trees (또는 rocks·ores·structures)'}); }
    if(verb==='set'&&/^set\s+variable\b/i.test(t)&&!new RegExp('^set\\s+variable\\s+'+V+'\\s+to\\s+(?:'+NUM+'|"[^"]*"|random\\s+-?\\d+\\s+to\\s+-?\\d+|variable\\s+'+V+'|player\\s+(?:name|uuid)|distance\\s+player\\s+to\\s+(?:nearest\\s+monster|nearest\\s+mob|[a-z0-9_]{1,30}))\\s*$','i').test(t)) errs.push({line:ln,msg:'이렇게 써요: set variable {score} to 0  (값: 숫자·"글자"·random 1 to 5·variable {y}·player name·player uuid·distance player to nearest monster)'});
    if(verb==='set'&&/^set\s+time\b/i.test(t)&&!/^set\s+time\s+(day|night|noon|midnight|sunrise|sunset|\d+)\s*$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: set time day (day·night·noon·midnight·sunrise·sunset 또는 0~23)'});
    if(verb==='set'&&/^set\s+weather\b/i.test(t)&&!/^set\s+weather\s+(clear|rain|storm)\s*$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: set weather rain (clear·rain·storm)'});
    if(verb==='give'&&/^give\s+effect\b/i.test(t)&&!/^give\s+effect\s+(speed|strength|defense|regen|haste|breath|night|stun)\s+\d+\s+seconds?(?:\s+to\s+(?:player|monster|mob|"[^"]*"|%[^%\s"]+%|[A-Za-z0-9_가-힣]+)(?:\s+or\s+(?:player|monster|mob|"[^"]*"|%[^%\s"]+%|[A-Za-z0-9_가-힣]+))*)?\s*$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: give effect speed 5 seconds (speed·strength·defense·regen·haste·breath·night·stun) — 뒤에 to monster 처럼 붙일 수도 있어요'});
    if(verb==='play'){ var pm=/^play\s+sound\s+([a-z]+)(?:\s+to\s+(?:player|monster|mob|"[^"]*"|%[^%\s"]+%|[A-Za-z0-9_가-힣]+)(?:\s+or\s+(?:player|monster|mob|"[^"]*"|%[^%\s"]+%|[A-Za-z0-9_가-힣]+))*)?\s*$/i.exec(t); if(!pm) errs.push({line:ln,msg:'이렇게 써요: play sound hit'}); else if(BS_SOUNDS.indexOf(pm[1].toLowerCase())<0){ var g7=guess(pm[1].toLowerCase(),BS_SOUNDS); errs.push({line:ln,msg:"모르는 소리 '"+pm[1]+"'"+(g7?" — 혹시 '"+g7+"'?":' (click·hurt·swing·bow·hit·break 중에서)')}); } }
    if(verb==='every'){ var em=/^every\s+(\d+|%\{[^}\s]+\}%)\s+seconds?\s*:\s*$/.exec(t); if(!em) errs.push({line:ln,msg:'이렇게 써요: every 5 seconds:  (또는 every %{iv}% seconds:)'}); else if(/^\d+$/.test(em[1])&&(+em[1]<1||+em[1]>3600)) errs.push({line:ln,msg:'every 는 1~3600초까지예요'}); }
    if((verb==='say'||verb==='chat')&&/"\s*\S/.test(t.replace(/^[a-z]+\s+/i,'')) ){ var rest=t.replace(/^[a-z]+\s+"(?:\\.|[^"\\])*"/i,'').trim(); if(rest&&!/^to\s+(?:player|monster|mob|"[^"]*"|%[^%\s"]+%|[A-Za-z0-9_가-힣]+)(?:\s+or\s+(?:player|monster|mob|"[^"]*"|%[^%\s"]+%|[A-Za-z0-9_가-힣]+))*$/.test(rest)) errs.push({line:ln,msg:'글자 뒤에는 to player·monster·이름 만 올 수 있어요: chat "안녕" to Bob'}); }
    if(verb==='loop'){ var lm=/^loop\s+(\d+)\s+times\s*:\s*$/.exec(t); if(!lm) errs.push({line:ln,msg:'이렇게 써요: loop 5 times:'}); else if(+lm[1]<1||+lm[1]>10000) errs.push({line:ln,msg:'반복은 1~10000번까지예요'}); }
    if(verb==='heal'||verb==='damage'){ var hm=/^(heal|damage)\s+player\s+(\d+)\s*$/.exec(t); if(!hm) errs.push({line:ln,msg:'이렇게 써요: '+verb+' player 5'}); else if(+hm[2]<1||+hm[2]>100) errs.push({line:ln,msg:verb+'은 1~100까지예요'}); }
    if(verb==='if'&&/^if\s+(?:player|world)\b/i.test(t)){ var BI=BS_BIOMES.join('|');
      var okC=new RegExp('^if\\s+(?:(?:player\\s+(?:hp|max\\s+hp|x|y|z)|world\\s+(?:day|hour|players))\\s*(?:<=|>=|!=|<|>|=)\\s*(?:-?\\d+(?:\\.\\d+)?|variable\\s+(?:\\{[a-z0-9_가-힣]{1,22}\\}|[a-z0-9_]{1,20})))\\s*:\\s*$').test(t)||new RegExp('^if\\s+player\\s+biome\\s+is\\s+(?:not\\s+)?(?:'+BI+')\\s*:\\s*$').test(t)||/^if\s+player\s+name\s+is\s+(?:not\s+)?"[^"]*"\s*:\s*$/.test(t);
      var im=/^if\s+player\s+item\s+is\s+(?:not\s+)?(\S.*?)\s*:\s*$/.exec(t);
      if(im){ okC=true; if(window.BS_ITEMDB&&!bsItem(im[1])){ var g9=guess(im[1].trim().toLowerCase(),Object.keys(window.BS_ITEMDB)); errs.push({line:ln,msg:"unknown item '"+im[1].trim()+"' — 없는 아이템이에요"+(g9?" — 혹시 '"+g9+"'?":'')}); } }
      if(!okC) errs.push({line:ln,msg:'이렇게 써요: if player hp < 10:  (hp·max hp·x·y·z, world day·hour·players, 비교 < <= > >= = !=)  또는 if player biome is desert:  if player item is sword_iron:  if player name is "Bob":'}); }
    if(verb==='if'&&/^if\s+has\b/i.test(t)&&!/^if\s+has\s+(?:\d+\s+)?\S.*:\s*$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: if has 3 iron:'});
    if(verb==='if'&&/\scontained\s/.test(t)){ if(!/^if\s+(?:%[A-Za-z0-9_' ]+%|\{[^}\s]+\}|\{:[^:\s{}]+:\})\s+contained\s+"[^"]*"\s*:\s*$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: if %player\'s mod% contained "potato api":'}); }
    else if(verb==='if'&&/^if\s+%/.test(t)&&!/^if\s+%[a-z_]+%\s+is\s+(not\s+)?player\s*:\s*$/.test(t)) errs.push({line:ln,msg:'이렇게 써요: if %attacker% is player:  (또는 is not player:)'});
    if(verb==='add'&&!new RegExp('^add\\s+(?:'+NUM+'|variable\\s+'+V+')\\s+to\\s+variable\\s+'+V+'\\s*$','i').test(t)) errs.push({line:ln,msg:'이렇게 써요: add 1 to variable {score}  (또는 add variable {y} to variable {x})'});
    if(verb==='subtract'&&!new RegExp('^subtract\\s+(?:'+NUM+'|variable\\s+'+V+')\\s+from\\s+variable\\s+'+V+'\\s*$','i').test(t)) errs.push({line:ln,msg:'이렇게 써요: subtract 1 from variable {score}  (또는 subtract variable {y} from variable {x})'});
    if(verb==='multiply'||verb==='divide'){ var mdm=new RegExp('^(?:multiply|divide)\\s+variable\\s+'+V+'\\s+by\\s+('+NUM+'|variable\\s+'+V+')\\s*$','i').exec(t); if(!mdm) errs.push({line:ln,msg:'이렇게 써요: multiply variable {x} by 2  (또는 divide variable {x} by variable {y})'}); else if(verb==='divide'&&/^-?0+(\.0+)?$/.test(mdm[1])) errs.push({line:ln,msg:'0으로는 나눌 수 없어요'}); }
    if(verb==='signal'&&!new RegExp('^signal\\s+send\\s+"[^"]{1,40}"(?:\\s+(?:"[^"]{0,60}"|'+V+'))?\\s+to\\s+mod\\s+(?:"[^"]{1,40}"|back)\\s*$','i').test(t)) errs.push({line:ln,msg:'이렇게 써요: signal send "이름" "값" to mod "모드이름"  (값은 "글자" 또는 {변수}, 답장은 to mod back)'});
    if(verb==='if'&&/^if\s+signal\b/i.test(t)&&!new RegExp('^if\\s+signal\\s+receive\\s+"[^"]{1,40}"\\s+into\\s+'+V+'\\s+run\\s+text\\s+replace\\s+"[^"]{1,40}"\\s+to\\s+'+V+'\\s*$','i').test(t)) errs.push({line:ln,msg:'이렇게 써요: if signal receive "이름" into {x} run text replace "%이름%" to {x}'});
    if(verb==='publish_aliases'&&(!/^publish_aliases\s*:\s*$/.test(t)||ind!==0)) errs.push({line:ln,msg:'이렇게 맨 앞 줄에 써요: publish_aliases:'});

    if(verb==='if'&&/^if\s+variable\b/i.test(t)&&!new RegExp('^if\\s+variable\\s+'+V+'\\s*(?:>=|<=|!=|>|<|=|is\\s+not|is)\\s*(?:-?\\d+(?:\\.\\d+)?|"[^"]*")\\s*:\\s*$','i').test(t)) errs.push({line:ln,msg:'이렇게 써요: if variable {score} >= 10:  (비교: >= <= > < = != is, is not · 변수는 {x}, 공유 변수는 {:x:})'});
    if(verb==='reset'&&!new RegExp('^reset\\s+variable\\s+'+V+'\\s*$','i').test(t)) errs.push({line:ln,msg:'이렇게 써요: reset variable {score}'});
    if((verb==='say'||verb==='chat'||verb==='broadcast')){ var sm=/"((?:\\.|[^"\\])*)"/.exec(t); if(sm&&sm[1].length>100) errs.push({line:ln,msg:'글자는 100자까지예요'}); }
    if(verb==='disable'||verb==='enable'){ var cm=/^(?:disable|enable)\s+collision\s+of\s+([A-Za-z_]+)\s*$/i.exec(t);
      if(!cm) errs.push({line:ln,msg:'이렇게 써요: disable collision of tree (또는 enable collision of water)'});
      else if(BS_COLL.indexOf(cm[1].toLowerCase())<0){ var g5=guess(cm[1].toLowerCase(),BS_COLL); errs.push({line:ln,msg:"모르는 대상 '"+cm[1]+"'"+(g5?" — 혹시 '"+g5+"'?":' (tree·rock·ore·water·block·아이템 이름)')}); } }
    (t.replace(/%[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_[^%\s"]+%/gi,'').replace(/%player's mod%/gi,'').replace(/%\{[^}\s]+\}%/g,'').match(/%[^%\s"]*%/g)||[]).forEach(function(ph){ if(!hasUse&&!aliasSet[ph.toLowerCase()]&&BS_PH.indexOf(ph.toLowerCase())<0&&!/^%var_[a-z0-9_]{1,20}%$/i.test(ph)&&!/^%player_[a-z0-9_]+_count%$/i.test(ph)){ var g6=guess(ph.toLowerCase(),BS_PH); errs.push({line:ln,msg:"모르는 자리표시 '"+ph+"'"+(g6?" — 혹시 '"+g6+"'?":'')}); } });
    if(verb==='teleport'&&!/\sto\s/.test(t)) errs.push({line:ln,msg:'이렇게 써요: teleport player to spawn'});
    if((verb==='title'||verb==='chat'||verb==='say'||verb==='broadcast')&&!/"/.test(t)) errs.push({line:ln,msg:verb+' 뒤에는 "글자"를 큰따옴표로 감싸서 써요'});
    if(opens) stack.push({line:ln,ind:ind,kids:0,pa:verb==='publish_aliases'?1:0,want:0,cnt:0,wg:(verb==='on'&&/^on\s+world\s+generate\b/i.test(t))||!!(par&&par.wg)}); });
  stack.forEach(function(cl){ chkDf(cl); if(!cl.kids) errs.push({line:cl.line,msg:'":" 로 끝난 줄 아래에는 안쪽으로 들여쓴 명령이 와야 해요'});  if(cl.pa&&cl.want) errs.push({line:cl.want,msg:'aliases_name 줄 바로 아래에 use_command: 줄이 필요해요'}); });
  return {errs:errs}; }
/* each word of a line is its own small card: the word and what it means */
var BS_MEAN={define:'새로 만들기',color:'색',drop:'캐면 나오는 것',chance:'바위 중 이 광물이 되는 비율 (%)',ore:'광물',base:'바탕',recipe:'만드는 재료 (작업대 칸 순서)',makes:'한 번에 만드는 개수',rate:'나오는 정도 (1분에)',max:'동시에 최대 마릿수',signal:'신호',send:'보내기',receive:'받기',into:'안으로',run:'실행',text:'글자',back:'보낸 모드로',multiply:'곱하기',divide:'나누기',by:'로 (곱·나눔) / 공격한 쪽',publish_aliases:'다른 모드에 풀어 줄 이름',aliases_name:'풀어 줄 이름',use_command:'풀어 줄 때 쓰는 명령',distance:'거리',nearest:'가장 가까운',monster:'몬스터',mob:'몹',uuid:'고유 번호',on:'때',world:'월드',generate:'만들어질 때',join:'들어올 때',key:'키',press:'누를 때',mine:'돌 캘 때',chop:'나무 벨 때',kill:'몬스터 잡을 때',craft:'만들 때',fish:'낚시할 때',place:'설치',die:'죽을 때',eat:'먹을 때',api:'API 표시',potato:'Potato API',load:'원래 지형으로',roll:'구를 때',interaction:'상호작용할 때',quit:'나갈 때',trader:'상인',mod:'모드 이름',resource:'리소스',pack:'팩',hp:'체력',biome:'지역',item:'들고 있는 것',players:'플레이어 수',hour:'시각',or:'또는',destroy:'부쉈을 때',every:'마다',monster:'몬스터',mob:'몹',stun:'기절',break:'부술 때',contained:'들어 있으면',
  give:'주기',set:'정하기',remove:'없애기',replace:'바꾸기',teleport:'순간이동',title:'화면 가운데 글자',chat:'채팅',say:'말하기',button:'버튼',ui:'작은 창',remap:'키 바꾸기',chance:'확률',if:'만약',else:'아니면',rename:'이름 바꾸기',fill:'땅 바꾸기',play:'재생',sound:'소리',loop:'반복',heal:'회복',broadcast:'모두에게 알림',effect:'효과',time:'시간',weather:'날씨',day:'낮',noon:'한낮',midnight:'한밤',sunrise:'해 뜰 때',sunset:'해 질 때',clear:'맑음',rain:'비',storm:'폭풍',strength:'힘',defense:'방어',regen:'재생력',haste:'채굴 속도',breath:'물숨',night:'밤',click:'딸깍',hurt:'아픈 소리',swing:'휘두르는 소리',bow:'활',hit:'맞는 소리',break:'부서지는 소리',is:'이면',not:'아니면',random:'무작위',death:'죽을 때',respawn:'다시 살아날 때',variable:'변수',add:'더하기',subtract:'빼기',reset:'처음 값으로',from:'에서',disable:'끄기',enable:'켜기',collision:'부딪힘',all:'전부',land:'땅',beach:'해변',ocean:'바다',mountain:'산',trees:'나무들',rocks:'바위들',ores:'광석들',structures:'건물들',start:'시작 지역',forest:'숲',desert:'사막',volcano:'화산',jungle:'정글',mesa:'붉은 고원',mangrove:'맹그로브',ice:'얼음',
  in:'안에서',of:'의',to:'로',at:'위치',near:'근처',with:'으로',for:'동안',and:'그리고',has:'가지고 있으면',seconds:'초',second:'초',times:'번',blocks:'칸',block:'칸',damage:'데미지',speed:'공격 간격(초)',name:'이름',
  top:'위',bottom:'아래',left:'왼쪽',right:'오른쪽',center:'가운데',player:'플레이어',iron:'철',log:'통나무',stone:'돌',wood:'나무',sword:'검',bench:'작업대',wolf:'늑대',tree:'나무',rock:'바위',grass:'풀',sand:'모래'};
var BS_COL={a:'#55ff55',b:'#55ffff',e:'#ffff55',f:'#ffffff','0':'#000000','1':'#0000aa','2':'#00aa00','3':'#00aaaa','4':'#aa0000','5':'#aa00aa','6':'#ffaa00','7':'#aaaaaa','8':'#555555',d:'#ff55ff'};
/* \a \b \e \f \0-\8 \d = colors, \u underline, \l bold, \r clear; applies to the text after the code */
function bsColorText(el,w){ var col='',u=false,bd=false,buf='',q=w.replace(/^"|"$/g,''); function flush(){ if(!buf) return; var sp=document.createElement('span'); sp.textContent=buf; if(col){ sp.style.color=col; if(col==='#000000'||col==='#0000aa') sp.style.textShadow='0 0 2px #fff,0 0 2px #fff'; } if(u) sp.style.textDecoration='underline'; if(bd) sp.style.fontWeight='900'; el.appendChild(sp); buf=''; }
  el.appendChild(document.createTextNode('"'));
  for(var i=0;i<q.length;i++){ var ch=q[i]; if(ch==='\\'&&i+1<q.length){ var k=q[i+1].toLowerCase(); if(BS_COL[k]){ flush(); col=BS_COL[k]; i++; continue; } if(k==='u'){ flush(); u=true; i++; continue; } if(k==='l'){ flush(); bd=true; i++; continue; } if(k==='r'){ flush(); col=''; u=false; bd=false; i++; continue; } } buf+=ch; }
  flush(); el.appendChild(document.createTextNode('"')); }
function bsChip(w,first){ var c=document.createElement('span'); c.className='chip'; var b=document.createElement('b'), m=document.createElement('small'), lw=w.toLowerCase(), mean;
  if(/^"/.test(w)){ if(/\\[0-9a-fdulr]/i.test(w)) bsColorText(b,w); else b.textContent=w; mean='글자'; c.classList.add('s'); }
  else if(/^\{[^}\s]+\}$/.test(w)){ b.textContent=w; mean=/^\{_.*_\}$/.test(w)?'지역 변수':'변수'; c.classList.add('n'); }
  else if(/^%[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_[^%\s]+%$/i.test(w)){ b.textContent=w; mean='다른 모드의 공유 변수'; c.classList.add('n'); }
  else if(/^%\{[^}\s]+\}%$/.test(w)){ b.textContent=w; mean='변수 값'; c.classList.add('n'); }
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
function bsItemCard(t){ var m=/^give\s+(?!effect\b)(.+)$/i.exec(t)||/^on\s+(?:place|destroy|eat)\s+(.+?)\s*:?\s*$/i.exec(t)||/^set\s+(.+?)\s+damage\b/i.exec(t)||/^if\s+player\s+item\s+is\s+(?:not\s+)?(.+?)\s*:\s*$/i.exec(t); if(!m) return null; var c=m[1].replace(/:\s*$/,'').replace(/\s+of\s+\S+$/i,'').trim(), it=bsItem(c)||bsItem(c.replace(/\s+\d+(\s+to\s+\S+)?$/i,''))||bsItem(c.replace(/\s+to\s+\S+$/i,'')); if(!it) return null; var card=document.createElement('span'); card.className='chip item'; var im=document.createElement('img'); im.src=it.ic; im.alt=it.n; im.className='bsic'; var b=document.createElement('b'), sm=document.createElement('small'); b.textContent=it.n; sm.textContent=it.id; card.appendChild(im); card.appendChild(b); card.appendChild(sm); return card; }
function bsChips(t){ var row=document.createElement('span'); row.className='chips'; var itc=bsItemCard(t.trim()); if(itc){ var done=bsChips0(t,row); row.appendChild(itc); return row; } return bsChips0(t,row); }
function bsChips0(t,row){ if(/^use_mod_uuid:\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.trim())){ row.appendChild(bsChip('uuid',false)); var uc2=row.lastChild; uc2.firstChild.textContent=t.trim(); uc2.lastChild.textContent='다른 모드의 공유 변수 쓰기'; return row; } if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.trim())){ row.appendChild(bsChip('uuid',false)); var uc=row.lastChild; uc.firstChild.textContent=t.trim(); uc.lastChild.textContent='모드 고유 번호'; return row; } if(/^\{:[^:\s{}]{1,22}::.*:\}$/.test(t.trim())){ row.appendChild(bsChip('{:공유:}',false)); var cc=row.lastChild; cc.firstChild.textContent=t.trim(); cc.lastChild.textContent='공유 변수 값 쓰기'; return row; } var re=/"(?:\\.|[^"\\])*"?|~?-?\d+%?|~|%[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_[^%\s]+%|%\{[^}\s]+\}%|%player's mod%|%[A-Za-z0-9_']+%|\{:[^:\s{}]+:\}|\{[^}\s]+\}|[A-Za-z_\uac00-\ud7a3][\w\uac00-\ud7a3]*|>=|<=|!=|[:=]|[^\s]/g, m, i=0; while((m=re.exec(t))){ row.appendChild(bsChip(m[0],i===0)); i++; if(m[0][0]==='"'){ (m[0].match(/%[A-Za-z0-9_']+%/g)||[]).filter(function(ph){ return ph.toLowerCase()!=="%player's mod%"; }).forEach(function(ph){ var c=document.createElement('span'); c.className='chip n'; var b=document.createElement('b'), sm=document.createElement('small'); b.textContent=ph; sm.textContent='(Potato API 필요)'; c.appendChild(b); c.appendChild(sm); row.appendChild(c); }); } } return row; }
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
var EXBS=[['⚔️ 소리와 반복','on kill:\n    play sound hit\n    loop 3 times:\n        give 1 iron\n    heal player 5\n    give effect speed 5 seconds\n    broadcast "%player%가 해냈어요"\n'],['🔢 돌 세기 (변수)','on mine:\n    add 1 to variable {stones}\n    if variable {stones} >= 10:\n        say "돌을 %var_stones%개 캤어요"\n        reset variable {stones}\n'],['🏝️ 빈 시작 섬','# 새 월드의 땅을 바꿔요 (좌표는 픽셀, ~ 는 시작 위치 기준)\non world generate:\n    remove all trees\n    remove all rocks\n    fill ~-600 ~-600 ~600 ~600 to ocean\n    fill ~-150 ~-150 ~150 ~150 to land start\n    fill ~200 ~-100 ~320 ~20 to mountain volcano\n'],['🎁 기본 모드','# Beaconfall 모드 (BeaconScript)\non join:\n    chat "어서 와요!"\n    give 2 iron\n\non key "G" press:\n    teleport player to spawn\n    title "Welcome!" for 3 seconds\n'],
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
