/* Fry Sheet 칸의 일기: a cell remembers the values typed into it (cell.h = [{t,v}], oldest first, t=0 when the time is unknown).
   Only a cell that really changes gets a history, so a sheet nobody edited twice costs nothing. Formulas are not recorded
   (their raw text says nothing about how the data moved). Works in the browser (FSDiary) and in Node. */
(function(root){
'use strict';
var MAX=20, MAXV=60;
function plain(v){ return v!=null&&v!==''&&String(v)[0]!=='='; }
function clip(v){ v=String(v); return v.length>MAXV?v.slice(0,MAXV)+'…':v; }
/* call before cell.v is overwritten: oldV is the current raw, newV the incoming one */
function record(cell, newV, now){
  var oldV=cell.v; if(!plain(oldV)||!plain(newV)||String(oldV)===String(newV)) return;
  if(!cell.h) cell.h=[{t:0,v:clip(oldV)}];
  cell.h.push({t:now,v:clip(newV)});
  if(cell.h.length>MAX) cell.h.splice(0,cell.h.length-MAX);
}
function ago(t, now){
  if(!t) return '';
  var s=Math.max(0,(now-t)/1000);
  if(s<60) return '방금';
  if(s<3600) return Math.floor(s/60)+'분 전';
  if(s<86400) return Math.floor(s/3600)+'시간 전';
  if(s<86400*30) return Math.floor(s/86400)+'일 전';
  if(s<86400*365) return Math.floor(s/86400/30)+'달 전';
  return Math.floor(s/86400/365)+'년 전';
}
/* [{when, v}] for showing; the first entry has no time when the sheet did not know it */
function entries(cell, now){
  var h=cell&&cell.h; if(!h||h.length<2) return [];
  return h.map(function(x,i){ return {when:x.t?ago(x.t,now):(i===0?'처음':''), v:x.v}; });
}
/* the sentence list the small AI turns into a short story */
function prompt(addr, cell, now){
  var e=entries(cell,now); if(!e.length) return '';
  return '다음은 엑셀 칸 '+addr+'의 값이 바뀐 기록이에요 (오래된 것부터):\n'+e.map(function(x){ return '- '+(x.when||'그 뒤')+': '+x.v; }).join('\n')+
    '\n이 칸이 언제 어떤 값에서 어떤 값으로 바뀌었는지, 한두 문장의 짧은 이야기로 써 주세요. 기록에 없는 숫자는 만들지 마세요.';
}
var api={record:record, ago:ago, entries:entries, prompt:prompt, MAX:MAX};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.FSDiary=api;
})(typeof window!=='undefined'?window:this);
