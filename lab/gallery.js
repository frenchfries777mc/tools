/* Fry Lab gallery: the start page. Lists the units of curriculum.js as cards (grade, subject, unit, goal, template),
   with filters for subject and grade, a search box and a switch for units that have no template yet ("준비 중").
   A card with one experiment opens it (LAB.open); a card with 2+ opens a picker listing them (row[4] may be an id, an array of ids or null, see curriculum.js); the filters are remembered in localStorage via LAB.gf. */
(function(){
'use strict';
var T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };
var CUR=window.LABCUR, LS='fflab.gal.v1', f={s:'all', g:'all', q:'', soon:true};
try{ var o=JSON.parse(localStorage.getItem(LS)||'null'); if(o&&typeof o==='object'){ if(o.s==='math'||o.s==='sci'||o.s==='all') f.s=o.s; if(o.g==='all'||CUR.grades.indexOf(o.g)>=0) f.g=o.g; if(typeof o.soon==='boolean') f.soon=o.soon; } }catch(e){}
function persist(){ try{ localStorage.setItem(LS,JSON.stringify({s:f.s,g:f.g,soon:f.soon})); }catch(e){} }
function byId(id){ return LAB.list.filter(function(e){ return e.id===id; })[0]; }
function seg(box,items,key){ box.innerHTML=''; items.forEach(function(it){ var b=document.createElement('button'); b.type='button'; if(key==='s'&&(it[0]==='math'||it[0]==='sci')) b.appendChild(sico(it[0],16)); if(key==='g'&&GRADE_ICO[it[0]]) b.appendChild(gico(it[0],16)); b.appendChild(document.createTextNode(T(it[1]))); b.dataset.v=it[0]; b.setAttribute('aria-pressed',String(f[key]===it[0]));
  b.classList.toggle('on',f[key]===it[0]); b.onclick=function(){ f[key]=it[0]; persist(); draw(); }; box.appendChild(b); }); }
var SUBJ_ELECT={'물리학':'physics','화학':'chemistry','생명과학':'biology','지구과학':'earth'};
function subj(u){   /* 고2·고3 선택과목: [로고 id, 이름] (이름이 없는 과목은 null) */
  if(u[0]!=='고2'&&u[0]!=='고3') return null;
  if(u[1]==='sci'){ var k=String(u[2]).split(':')[0]; return SUBJ_ELECT[k]?[SUBJ_ELECT[k],k]:null; }
  var n=String(u[2]);
  if(/극한|미분|적분|급수/.test(n)) return ['calculus','미적분'];
  if(/확률|통계|분포|추정/.test(n)) return ['probstats','확률과 통계'];
  if(/삼각함수|수열|지수|로그/.test(n)) return ['algebra','대수'];
  return null; }
var GRADE_ICO={'중1':'mid1','중2':'mid2','중3':'mid3','고1':'high1','고2':'high2','고3':'high3'};
function gico(g,px){ var i=document.createElement('img'); i.alt=''; i.src='grades/'+GRADE_ICO[g]+'.svg'; i.width=px; i.height=px; i.className='si'; return i; }   // 학년 로고: 중학교 금색, 고등학교 민트색 I·II·III
function sico(k,px){ var i=document.createElement('img'); i.alt=''; i.src='subjects/'+k+'.svg'; i.width=px; i.height=px; i.className='si'; return i; }
function exps(u){ return CUR.ids(u).map(byId).filter(Boolean); }
function match(u,es,q){ if(!q) return true; q=q.toLowerCase(); var hay=[u[2],u[3],T(u[2]),T(u[3]),u[0]].concat(es.map(function(e){ return e.name+' '+T(e.name); })).join(' ').toLowerCase(); return hay.indexOf(q)>=0; }
var pk=null;
function closePick(){ if(!pk) return; var b=pk.back, from=pk.from; pk=null; document.removeEventListener('keydown',pkKey,true); b.remove(); if(from&&from.focus&&document.contains(from)) from.focus(); }
function pkKey(ev){ if(!pk) return; if(ev.key==='Escape'){ ev.preventDefault(); ev.stopPropagation(); closePick(); }
  else if(ev.key==='Tab'){ var fs=pk.back.querySelectorAll('button'); if(!fs.length) return; var a=fs[0], z=fs[fs.length-1];
    if(!pk.back.contains(document.activeElement)){ ev.preventDefault(); a.focus(); } else if(ev.shiftKey&&document.activeElement===a){ ev.preventDefault(); z.focus(); } else if(!ev.shiftKey&&document.activeElement===z){ ev.preventDefault(); a.focus(); } } }
function openPick(u,es,from){ closePick();
  var back=document.createElement('div'); back.className='gpkback'; back.onclick=function(ev){ if(ev.target===back) closePick(); };
  var box=document.createElement('div'); box.className='gpk'; box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true'); box.setAttribute('aria-label',T(u[2]));
  var hd=document.createElement('div'); hd.className='gpkhd'; var tt=document.createElement('div'); tt.className='gpkt';
  var h=document.createElement('h3'); h.textContent=T(u[2]); var sub=document.createElement('span'); sub.textContent=T('실험을 골라 보세요'); tt.appendChild(h); tt.appendChild(sub);
  var x=document.createElement('button'); x.type='button'; x.className='x'; x.textContent='×'; x.setAttribute('aria-label',T('닫기')); x.title=T('닫기'); x.onclick=closePick; hd.appendChild(tt); hd.appendChild(x); box.appendChild(hd);
  var ls=document.createElement('div'); ls.className='gpkls';
  es.forEach(function(e){ var b=document.createElement('button'); b.type='button'; b.className='ex'; b.innerHTML='<span class="ic"></span><span><span class="nm"></span><span class="ds"></span></span>';
    LAB.ico(b.querySelector('.ic'),e); b.querySelector('.nm').textContent=T(e.name); b.querySelector('.ds').textContent=T(e.desc);
    var n=LAB.vcount(e.id); if(n){ var m=document.createElement('span'); m.className='gtag mine'; m.textContent=F('내 버전 {0}개',n); b.appendChild(m); }
    b.onclick=function(){ closePick(); LAB.open(e.id); }; ls.appendChild(b); });
  box.appendChild(ls); back.appendChild(box); document.body.appendChild(back); pk={back:back,from:from}; document.addEventListener('keydown',pkKey,true);
  var f0=ls.querySelector('button'); if(f0) f0.focus(); }
function draw(){
  seg($('gSubj'),[['all','전체'],['math','수학'],['sci','과학']],'s');
  seg($('gGrade'),[['all','모든 학년']].concat(CUR.grades.map(function(g){ return [g,g]; })),'g');
  $('gSoon').checked=f.soon;
  var list=CUR.units.filter(function(u){ var es=exps(u); return (f.s==='all'||u[1]===f.s)&&(f.g==='all'||u[0]===f.g)&&(f.soon||es.length)&&match(u,es,f.q); });
  var box=$('gList'); box.innerHTML='';
  var ready=list.filter(function(u){ return exps(u).length>0; }).length;
  $('gCount').textContent=F('단원 {0}개 · 열 수 있는 템플릿 {1}개 · 준비 중 {2}개',list.length,ready,list.length-ready);
  if(!list.length){ var d=document.createElement('div'); d.className='gempty'; d.textContent=T('조건에 맞는 단원이 없어요. 학년이나 과목, 검색어를 바꿔 보세요.'); box.appendChild(d); return; }
  CUR.grades.forEach(function(g){ var us=list.filter(function(u){ return u[0]===g; }); if(!us.length) return;
    var h=document.createElement('h2'); h.className='gh2'; h.appendChild(gico(g,26)); h.appendChild(document.createTextNode(T(g))); box.appendChild(h);
    var grid=document.createElement('div'); grid.className='gcards'; box.appendChild(grid);
    us.forEach(function(u){ var es=exps(u), e=es[0]||null, multi=es.length>1, card=document.createElement(e?'button':'div'); card.className='gcard '+(e?'ok':'soon'); if(e){ card.type='button'; card.onclick=multi?function(){ openPick(u,es,card); }:function(){ LAB.open(e.id); }; }
      var tags=document.createElement('div'); tags.className='gtags';
      var sj=subj(u);
      [[u[0],'',null],[u[1]==='math'?'수학':'과학',u[1]==='math'?'m':'s',u[1]],sj?[sj[1],u[1]==='math'?'m':'s',sj[0]]:null].forEach(function(t){ if(!t) return; var s=document.createElement('span'); s.className='gtag '+t[1]; if(t[2]) s.appendChild(sico(t[2],16)); else if(GRADE_ICO[t[0]]) s.appendChild(gico(t[0],16)); s.appendChild(document.createTextNode(T(t[0]))); tags.appendChild(s); });
      if(!e){ var s2=document.createElement('span'); s2.className='gtag soon'; s2.textContent=T('준비 중'); tags.appendChild(s2); }
      else { if(multi){ var s4=document.createElement('span'); s4.className='gtag multi'; s4.textContent=F('실험 {0}개',es.length); tags.appendChild(s4); }
        var n=multi?0:LAB.vcount(e.id); if(n){ var s3=document.createElement('span'); s3.className='gtag mine'; s3.textContent=F('내 버전 {0}개',n); tags.appendChild(s3); } }
      var h3=document.createElement('h3'); h3.textContent=T(u[2]); var p=document.createElement('p'); p.textContent=T(u[3]);
      var tp=document.createElement('div'); tp.className='gtpl';
      if(e){ tp.innerHTML='<span class="ic"></span><span class="nm"></span><span class="go"></span>'; if(multi){ var ic=tp.querySelector('.ic'); ic.classList.add('strip'); es.slice(0,4).forEach(function(x){ ic.appendChild(LAB.mini(x,22)); }); } else LAB.ico(tp.querySelector('.ic'),e); tp.querySelector('.nm').textContent=multi?es.map(function(x){ return T(x.name); }).join(' · '):T(e.name); tp.querySelector('.go').textContent=T(multi?'고르기':'열기'); }
      else tp.textContent=T('이 단원의 템플릿은 준비 중이에요');
      card.appendChild(tags); card.appendChild(h3); card.appendChild(p); card.appendChild(tp); grid.appendChild(card); }); });
}
$('gSearch').addEventListener('input',function(){ f.q=this.value.trim(); draw(); });
$('gSoon').addEventListener('change',function(){ f.soon=this.checked; persist(); draw(); });
window.LABGAL={closePick:closePick, refresh:function(){ if(!$('gallery').hidden||LAB.view==='gallery') draw(); }, filters:f, draw:draw};
document.addEventListener('DOMContentLoaded',function(){ draw(); });
})();
