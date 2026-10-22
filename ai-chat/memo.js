/* AI 체험의 "내 AI 메모장": 대화에서 알게 된 내 취향(말투, 부르는 이름, 답 길이)을 이 기기에만 적어 두고, 다음 대화에서 AI가 참고해요.
   서버로 나가지 않아요 (localStorage 'ffchat.memo.v1'). 메모는 보고 고치고 지울 수 있고, 메모장을 끄면 AI에게 보내지 않아요.
   FFMemo.suggest(말) -> 메모로 남길 만한 말이면 {text}, 아니면 null (사람이 "넣기"를 눌러야 저장돼요)
   FFMemo.block() -> AI 지시문에 붙일 영어 글 (메모가 없거나 꺼져 있으면 '')   Node에서도 돌아가요. */
(function(root){
'use strict';
var LS='ffchat.memo.v1', LSON='ffchat.memo.on', MAXN=12, MAXC=80;
var mem=null;   // tests can replace storage
function store(){ return mem||(typeof localStorage!=='undefined'?localStorage:null); }
function read(k){ try{ return store().getItem(k); }catch(e){ return null; } }
function write(k,v){ try{ store().setItem(k,v); return true; }catch(e){ return false; } }
function clean(s){ return String(s==null?'':s).replace(/\s+/g,' ').trim().slice(0,MAXC); }
function list(){ var a=[]; try{ a=JSON.parse(read(LS)||'[]'); }catch(e){} return Array.isArray(a)?a.filter(function(n){ return n&&typeof n.text==='string'&&n.text; }):[]; }
function save(a){ return write(LS,JSON.stringify(a.slice(0,MAXN))); }
function add(text){ text=clean(text); if(!text) return null; var a=list(); if(a.some(function(n){ return n.text===text; })) return null;
  if(a.length>=MAXN) return null; var n={id:'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), text:text}; a.push(n); save(a); return n; }
function edit(id,text){ text=clean(text); var a=list(), n=a.filter(function(x){ return x.id===id; })[0]; if(!n) return false; if(!text) return remove(id); n.text=text; save(a); return true; }
function remove(id){ var a=list(), b=a.filter(function(x){ return x.id!==id; }); save(b); return b.length!==a.length; }
function on(){ return read(LSON)!=='0'; }
function setOn(v){ write(LSON,v?'1':'0'); }
/* 메모로 남길 만한 말: 앞으로/항상 하는 부탁, 부르는 이름, 말투, 답 길이, "기억해" */
var RULES=[
  [/(.{1,20}?)(?:이?라고|으로|로)\s*(?:나를|날|저를|절)?\s*불러\s*(?:줘|주세요|라)/, function(m){ return '사용자를 "'+m[1].trim()+'"라고 불러요'; }],
  [/(?:앞으로|이제부터|다음부터|항상)\s*(.{2,40}?)\s*(?:해\s*줘|해줘|해\s*주세요|해주세요|하자|해라)(?![가-힣])/, function(m){ return m[1].trim()+' 하기'; }],
  [/(반말|존댓말)\s*(?:로|을|만)?\s*(?:해|써|말해|쓰|사용)/, function(m){ return m[1]+'로 말하기'; }],
  [/(짧게|간단히|간단하게|자세히|길게|쉽게)\s*(?:말해|답해|설명해|써)/, function(m){ return m[1]+' 답하기'; }],
  [/(.{2,40}?)\s*(?:을|를|은|는)?\s*기억해\s*(?:줘|주세요|라)?/, function(m){ return m[1].trim()+' (기억해 달라고 함)'; }]
];
function suggest(q){
  q=String(q||'').trim(); if(q.length<4||q.length>200||/\?\s*$/.test(q)&&!/기억해|불러/.test(q)) return null;
  for(var i=0;i<RULES.length;i++){ var m=RULES[i][0].exec(q); if(m){ var t=clean(RULES[i][1](m)); if(t.length>=3&&!list().some(function(n){ return n.text===t; })) return {text:t}; } }
  return null;
}
function block(){
  if(!on()) return '';
  var a=list(); if(!a.length) return '';
  return ' Notes the user saved about themselves (follow them when they fit the question, never mention these notes): '+a.map(function(n){ return n.text; }).join('; ')+'.';
}
var api={list:list, add:add, edit:edit, remove:remove, on:on, setOn:setOn, suggest:suggest, block:block, MAXN:MAXN, MAXC:MAXC, _use:function(s){ mem=s; }};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.FFMemo=api;
})(typeof window!=='undefined'?window:globalThis);
