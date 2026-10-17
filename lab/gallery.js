/* Fry Lab gallery: the start page. Lists the units of curriculum.js as cards (grade, subject, unit, goal, template),
   with filters for subject and grade, a search box and a switch for units that have no template yet ("준비 중").
   A card with a template opens that experiment (LAB.open); the filters are remembered in localStorage via LAB.gf. */
(function(){
'use strict';
var T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };
var CUR=window.LABCUR, LS='fflab.gal.v1', f={s:'all', g:'all', q:'', soon:true};
try{ var o=JSON.parse(localStorage.getItem(LS)||'null'); if(o&&typeof o==='object'){ if(o.s==='math'||o.s==='sci'||o.s==='all') f.s=o.s; if(o.g==='all'||CUR.grades.indexOf(o.g)>=0) f.g=o.g; if(typeof o.soon==='boolean') f.soon=o.soon; } }catch(e){}
function persist(){ try{ localStorage.setItem(LS,JSON.stringify({s:f.s,g:f.g,soon:f.soon})); }catch(e){} }
function byId(id){ return LAB.list.filter(function(e){ return e.id===id; })[0]; }
function seg(box,items,key){ box.innerHTML=''; items.forEach(function(it){ var b=document.createElement('button'); b.type='button'; b.textContent=T(it[1]); b.dataset.v=it[0]; b.setAttribute('aria-pressed',String(f[key]===it[0]));
  b.classList.toggle('on',f[key]===it[0]); b.onclick=function(){ f[key]=it[0]; persist(); draw(); }; box.appendChild(b); }); }
function match(u,e,q){ if(!q) return true; q=q.toLowerCase(); var hay=[u[2],u[3],T(u[2]),T(u[3]),e?e.name+' '+T(e.name):'',u[0]].join(' ').toLowerCase(); return hay.indexOf(q)>=0; }
function draw(){
  seg($('gSubj'),[['all','전체'],['math','수학'],['sci','과학']],'s');
  seg($('gGrade'),[['all','모든 학년']].concat(CUR.grades.map(function(g){ return [g,g]; })),'g');
  $('gSoon').checked=f.soon;
  var list=CUR.units.filter(function(u){ var e=u[4]?byId(u[4]):null; return (f.s==='all'||u[1]===f.s)&&(f.g==='all'||u[0]===f.g)&&(f.soon||e)&&match(u,e,f.q); });
  var box=$('gList'); box.innerHTML='';
  var ready=list.filter(function(u){ return u[4]&&byId(u[4]); }).length;
  $('gCount').textContent=F('단원 {0}개 · 열 수 있는 템플릿 {1}개 · 준비 중 {2}개',list.length,ready,list.length-ready);
  if(!list.length){ var d=document.createElement('div'); d.className='gempty'; d.textContent=T('조건에 맞는 단원이 없어요. 학년이나 과목, 검색어를 바꿔 보세요.'); box.appendChild(d); return; }
  CUR.grades.forEach(function(g){ var us=list.filter(function(u){ return u[0]===g; }); if(!us.length) return;
    var h=document.createElement('h2'); h.className='gh2'; h.textContent=T(g); box.appendChild(h);
    var grid=document.createElement('div'); grid.className='gcards'; box.appendChild(grid);
    us.forEach(function(u){ var e=u[4]?byId(u[4]):null, card=document.createElement(e?'button':'div'); card.className='gcard '+(e?'ok':'soon'); if(e){ card.type='button'; card.onclick=function(){ LAB.open(e.id); }; }
      var tags=document.createElement('div'); tags.className='gtags';
      [[u[0],''],[u[1]==='math'?'수학':'과학',u[1]==='math'?'m':'s']].forEach(function(t){ var s=document.createElement('span'); s.className='gtag '+t[1]; s.textContent=T(t[0]); tags.appendChild(s); });
      if(!e){ var s2=document.createElement('span'); s2.className='gtag soon'; s2.textContent=T('준비 중'); tags.appendChild(s2); }
      else { var n=LAB.vcount(e.id); if(n){ var s3=document.createElement('span'); s3.className='gtag mine'; s3.textContent=F('내 버전 {0}개',n); tags.appendChild(s3); } }
      var h3=document.createElement('h3'); h3.textContent=T(u[2]); var p=document.createElement('p'); p.textContent=T(u[3]);
      var tp=document.createElement('div'); tp.className='gtpl';
      if(e){ tp.innerHTML='<span class="ic"></span><span class="nm"></span><span class="go"></span>'; tp.querySelector('.ic').textContent=e.icon; tp.querySelector('.nm').textContent=T(e.name); tp.querySelector('.go').textContent=T('열기'); }
      else tp.textContent=T('이 단원의 템플릿은 준비 중이에요');
      card.appendChild(tags); card.appendChild(h3); card.appendChild(p); card.appendChild(tp); grid.appendChild(card); }); });
}
$('gSearch').addEventListener('input',function(){ f.q=this.value.trim(); draw(); });
$('gSoon').addEventListener('change',function(){ f.soon=this.checked; persist(); draw(); });
window.LABGAL={refresh:function(){ if(!$('gallery').hidden||LAB.view==='gallery') draw(); }, filters:f, draw:draw};
document.addEventListener('DOMContentLoaded',function(){ draw(); });
})();
