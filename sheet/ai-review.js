/* Fry Sheet: "✨ AI가 넣은 칸 검수". Cells the AI wrote are marked (purple bar): =AI(...) cells and cells filled from the AI dialog
   (cell.ai = 1). The footer chip counts the ones nobody has checked yet; the dialog lists them with "맞아요" (green) and "틀렸어요"
   (red, sent to the same 틀렸다고 눌린 답 list as the 👎 button: ../ai-wrong.js). cell.ar = 1 right, 2 reported wrong.
   Editing a cell clears its marks (app.js setRaw). */
(function(){
'use strict';
var A=window.FSAPI, E=FSE, T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };
var AIRE=/^=.*\bAI\s*\(/i;
function isAI(cell){ return !!cell&&(!!cell.ai||(typeof cell.v==='string'&&AIRE.test(cell.v))); }
/* every AI cell of the active sheet, top to bottom: {r,c,cell} */
function list(){
  var out=[], cells=A.sheet.cells;
  Object.keys(cells).forEach(function(k){ var cell=cells[k]; if(!isAI(cell)||cell.v==null||cell.v==='') return; var p=E.RC(k); out.push({r:p[0],c:p[1],cell:cell}); });
  out.sort(function(a,b){ return a.r-b.r||a.c-b.c; });
  return out;
}
function open_(){ return $('revDlg').classList.contains('open'); }
function refresh(){
  var all=list(), left=all.filter(function(x){ return !x.cell.ar; }).length, b=$('aiRev');
  b.hidden=!all.length; b.textContent=F('✨ AI 칸 검수 {0}',left); b.title=F('{0}칸 중 {1}칸 남았어요',all.length,left);
  if(open_()) render();
}
function valueOf(x){ var v=A.eng.value(A.doc.active,x.r,x.c); return E.isErr(v)?v.e:E.formatValue(v,x.cell.nf); }
function render(){
  var all=list(), box=$('revList'); box.textContent='';
  if(!all.length){ box.textContent=T('검수할 AI 칸이 없어요'); $('revNote').textContent=''; return; }
  all.forEach(function(x){
    var row=document.createElement('div'); row.className='revRow'+(x.cell.ar===1?' ok':x.cell.ar===2?' bad':'');
    var a=document.createElement('button'); a.className='rA'; a.type='button'; a.textContent=E.addr(x.r,x.c); a.onclick=function(){ A.select(x.r,x.c); };
    var f=document.createElement('div'); f.className='rF'; f.textContent=typeof x.cell.v==='string'&&x.cell.v[0]==='='?x.cell.v:'';
    var v=document.createElement('div'); v.className='rV'; v.textContent=valueOf(x);
    var bt=document.createElement('div'); bt.className='rB';
    if(x.cell.ar){ var s=document.createElement('span'); s.textContent=x.cell.ar===1?T('✓ 맞다고 확인했어요'):T('✗ 틀렸다고 알렸어요'); bt.appendChild(s); }
    else {
      var ok=document.createElement('button'); ok.type='button'; ok.textContent='✓ '+T('맞아요'); ok.onclick=function(){ x.cell.ar=1; A.changed(); };
      var no=document.createElement('button'); no.type='button'; no.textContent='✗ '+T('틀렸어요'); no.onclick=function(){ wrong(x); };
      bt.appendChild(ok); bt.appendChild(no);
    }
    row.appendChild(a); row.appendChild(v); row.appendChild(bt); row.appendChild(f); box.appendChild(row);
  });
  $('revNote').textContent=F('{0}칸 중 {1}칸 남았어요',all.length,all.filter(function(x){ return !x.cell.ar; }).length);
}
function wrong(x){
  var raw=typeof x.cell.v==='string'?x.cell.v:'';
  if(window.FFWrong) FFWrong.report({tool:'sheet-review',question:raw||E.addr(x.r,x.c),answer:valueOf(x),fix:''});
  x.cell.ar=2; A.changed(); A.toast(T('알려 주셔서 고마워요'));
}
$('aiRev').onclick=function(){ A.commitEdit(); $('revDlg').classList.add('open'); render(); };
$('revAll').onclick=function(){ list().forEach(function(x){ if(!x.cell.ar) x.cell.ar=1; }); A.changed(); };
window.FSReview={refresh:refresh,list:list,isAI:isAI};
refresh();
})();
