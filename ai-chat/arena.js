/* AI 체험의 "AI 대결장": 같은 질문에 두 모델이 답하고, 사람이 더 나은 쪽을 골라요. 결과는 이 브라우저에 남고 (localStorage 'ffchat.arena.v1', 최근 200개),
   로그인한 사람은 서버 표 ff_ai_arena 에도 가요 (supabase-ff-ai-arena.sql 을 실행하기 전에는 서버에 안 가요, 오류는 조용히 넘겨요).
   FFArena.record({q, a:{model,text}, b:{model,text}, win:'a'|'b'|'tie'|'none'}) -> 저장
   FFArena.rank() -> Promise<[{model,games,wins,ties,losses,nones}]> (모두의 합계)
   FFArena.tally(list) -> {모델: {win, lose, tie, none, games}}    Node에서도 돌아가요. */
(function(root){
'use strict';
var LS='ffchat.arena.v1', CAP=200, mem=null;
function store(){ return mem||(typeof localStorage!=='undefined'?localStorage:null); }
function cut(s,n){ s=String(s==null?'':s); return s.length>n?s.slice(0,n):s; }
function list(){ var a=[]; try{ a=JSON.parse(store().getItem(LS)||'[]'); }catch(e){} return Array.isArray(a)?a.filter(function(r){ return r&&r.a&&r.b&&r.a.model&&r.b.model; }):[]; }
function clean(o){
  var win=['a','b','tie','none'].indexOf(o.win)>=0?o.win:'none';
  return {t:new Date().toISOString(), q:cut(o.q,300), a:{model:cut(o.a.model,40),text:cut(o.a.text,1500)}, b:{model:cut(o.b.model,40),text:cut(o.b.text,1500)}, win:win};
}
function record(o){
  if(!o||!o.a||!o.b||!o.a.model||!o.b.model||o.a.model===o.b.model) return null;
  var e=clean(o), l=list(); l.push(e); if(l.length>CAP) l=l.slice(l.length-CAP);
  try{ store().setItem(LS,JSON.stringify(l)); }catch(x){ return null; }
  send(e); return e;
}
/* nothing here may throw or show an error */
function send(e){
  try{
    var u=root.FFAuth&&root.FFAuth.user&&root.FFAuth.user(); if(!u) return;
    root.FFAuth.ready.then(function(sb){ if(!sb) return;
      return sb.from('ff_ai_arena').insert({question:e.q, model_a:e.a.model, answer_a:e.a.text, model_b:e.b.model, answer_b:e.b.text, winner:e.win});
    }).then(null,function(){});
  }catch(x){}
}
function tally(l){
  var t={};
  (l||list()).forEach(function(r){
    var A=t[r.a.model]||(t[r.a.model]={win:0,lose:0,tie:0,none:0,games:0}), B=t[r.b.model]||(t[r.b.model]={win:0,lose:0,tie:0,none:0,games:0});
    A.games++; B.games++;
    if(r.win==='a'){ A.win++; B.lose++; } else if(r.win==='b'){ B.win++; A.lose++; } else if(r.win==='tie'){ A.tie++; B.tie++; } else { A.none++; B.none++; }
  });
  return t;
}
/* 모두의 순위: 서버 함수 ff_ai_arena_rank (supabase-ff-ai-arena-rank.sql) 의 합계. 실행 전이거나 오류면 빈 목록이에요 */
function rank(){
  try{
    if(!root.FFAuth||!root.FFAuth.ready) return Promise.resolve([]);
    return root.FFAuth.ready.then(function(sb){ if(!sb) return [];
      return sb.rpc('ff_ai_arena_rank').then(function(r){ return Array.isArray(r&&r.data)?r.data:[]; });
    }).then(null,function(){ return []; });
  }catch(x){ return Promise.resolve([]); }
}
var api={record:record, list:list, tally:tally, rank:rank, CAP:CAP, _use:function(s){ mem=s; }};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.FFArena=api;
})(typeof window!=='undefined'?window:globalThis);
