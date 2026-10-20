/* AI 체험의 "여러 번 답해서 투표": 같은 질문에 여러 번 답을 만들어 서로 같은 답끼리 묶고, 가장 많은 쪽을 골라 답해요.
   같은 쪽이 전체의 AGREE(60%)보다 적으면 불확실하다고 표시해요. 짧게 1번(투표 없음), 보통 3번, 길게 7번 (FFVote.TIMES).
   두 답이 "같다"는 건 글이 똑같다는 뜻이 아니라, 숫자가 같고(둘 다 숫자가 있을 때) 낱말 앞 두 글자 모음이 겹친다는 (긴 글은 30%, 낱말 8개 이하의 짧은 답은 60%) 뜻이에요 (어미가 달라도 같은 답으로 봐요).
   FFVote.pick(answers) -> {index, size, n, uncertain}   index = 고른 답, size = 그 답과 같은 답의 수(자기 포함).  Node에서도 돌아가요. */
(function(root){
'use strict';
var TIMES=[1,3,7], AGREE=0.6, SIM=0.3, SIM_SHORT=0.6;   // 낱말이 적은 짧은 답은 한 낱말만 달라도 다른 답이라서 더 엄격하게 봐요
function toks(t){
  var m=String(t).toLowerCase().match(/[가-힣]{2,}|[a-z]{2,}|\d+(?:\.\d+)?/g)||[], o={};
  m.forEach(function(w){ o[/^[가-힣]/.test(w)?w.slice(0,2):w]=1; }); return o;
}
function nums(t){ return (String(t).match(/\d+(?:\.\d+)?/g)||[]).sort().join(','); }
function agree(a,b){
  var na=nums(a), nb=nums(b); if(na&&nb&&na!==nb) return false;
  var x=toks(a), y=toks(b), kx=Object.keys(x), ky=Object.keys(y), both=0;
  if(!kx.length||!ky.length) return String(a).trim()===String(b).trim();
  kx.forEach(function(w){ if(y[w]) both++; });
  var u=kx.length+ky.length-both;
  return both/u>=(u<=8?SIM_SHORT:SIM);
}
function pick(answers){
  var n=answers.length, best=0, bs=0;
  if(n<2) return {index:0,size:n?1:0,n:n,uncertain:false};
  for(var i=0;i<n;i++){
    var c=1; for(var j=0;j<n;j++) if(j!==i&&agree(answers[i],answers[j])) c++;
    if(c>bs){ bs=c; best=i; }   // 같으면 먼저 만든 쪽
  }
  return {index:best,size:bs,n:n,uncertain:bs/n<AGREE};
}
var api={pick:pick, agree:agree, TIMES:TIMES, AGREE:AGREE};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.FFVote=api;
})(typeof window!=='undefined'?window:globalThis);
