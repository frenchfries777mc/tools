/* AI 가르치기 화면의 "모델 점수판" 자료. 평가(train/kaggle-eval.ipynb, baseline-v1 140문제)를 돌릴 때마다 여기에 한 줄씩 적어요.
   rows: {ver, score, grader:'fixed'(고친 채점기)|'old'(예전 채점기)|'?'(확인 안 됨), note}  score:null 이면 아직 안 쟀다는 뜻 (target 만 보여줘요).
   점수는 140점 만점이 아니라 100점 환산이에요. 채점기가 다른 점수끼리는 정확히 비교할 수 없어요. */
(function(root){
'use strict';
var DATA={
  test:'baseline-v1 (140문제, 100점 환산)',
  lines:[
    {id:'tarius', name:'tarius', base:{name:'Qwen3 1.7B', score:41.4}, target:64, rows:[
      {ver:'1.3', score:40.7, grader:'old'},
      {ver:'1.4', score:55.0, grader:'?'},
      {ver:'1.5', score:null}]},
    {id:'lectus', name:'lectus', base:{name:'Qwen3 4B', score:63.6}, target:80, rows:[
      {ver:'1.3', score:57.9, grader:'old'},
      {ver:'1.4', score:76.4, grader:'fixed', note:'예전 채점기로는 74.3'},
      {ver:'1.5', score:null, note:'학습 중'}]},
    {id:'premus', name:'premus', base:{name:'Qwen3 8B', score:67.9, grader:'old'}, target:84.5, rows:[
      {ver:'1.4', score:68.6, grader:'fixed'},
      {ver:'1.5', score:null}]}
  ]
};
var GR={old:'예전 채점기', '?':'채점기 확인 안 됨'};
/* host 안에 점수판을 그려요 (표가 아니라 막대) */
function render(host, T){
  T=T||function(s){ return s; }; host.textContent='';
  var cap=document.createElement('p'); cap.className='hint'; cap.style.margin='-4px 0 10px'; cap.textContent=T('시험: ')+DATA.test+' · '+T('점선은 목표 점수예요. 채점기가 다른 점수끼리는 정확히 비교할 수 없어요.'); host.appendChild(cap);
  DATA.lines.forEach(function(L){
    var box=document.createElement('div'); box.className='sc'; box.setAttribute('data-notr','');
    var h=document.createElement('div'); h.className='sch'; h.textContent=L.name+' · '+T('목표')+' '+L.target; box.appendChild(h);
    function bar(label, score, cls, tail){
      var r=document.createElement('div'); r.className='scr '+cls;
      var lb=document.createElement('span'); lb.className='scl'; lb.textContent=label;
      var tr=document.createElement('span'); tr.className='sct'; var f=document.createElement('i'); f.style.width=(score==null?0:Math.max(0,Math.min(100,score)))+'%'; tr.appendChild(f);
      var mk=document.createElement('b'); mk.style.left=L.target+'%'; tr.appendChild(mk);
      var v=document.createElement('span'); v.className='scv'; v.textContent=score==null?T('아직 안 쟀어요'):((Math.round(score*10)/10).toFixed(1)+' '+tail);
      r.appendChild(lb); r.appendChild(tr); r.appendChild(v); box.appendChild(r); }
    bar(L.base.name+' '+T('(기본 모델)'), L.base.score, 'base', T('예전 채점기'));
    L.rows.forEach(function(x){
      var d=''; if(x.score!=null){ d=(x.score>=L.base.score?'+':'')+(Math.round((x.score-L.base.score)*10)/10)+' '+T('(기본 모델 대비)'); }
      bar(L.name+' '+x.ver, x.score, x.score==null?'todo':(x.score>=L.target?'hit':''), [d, GR[x.grader]?T(GR[x.grader]):'', x.note?T(x.note):''].filter(Boolean).join(' · '));
    });
    host.appendChild(box);
  });
}
var api={data:DATA, render:render};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.FFScores=api;
})(typeof window!=='undefined'?window:globalThis);
