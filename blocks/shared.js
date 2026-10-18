/* Block HTML: '모두의 그림' (v43). A drawing from '내 그림' can be shared to everyone; shared drawings are the last tab of the 🍎 오브젝트 picker.
   Uses the shared Frenchfries777 account script (ff-auth.js, loaded only when needed) and its Supabase client, like teach/ does.
   Table: public.ff_shared_drawings, report function ff_shared_drawing_report (supabase-ff-shared-drawings.sql, run by the owner).
   Until that SQL has been run, the tab only says "준비 중이에요". */
(function(){
'use strict';
var T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };
var AUTH_URL='https://frenchfries777mc.github.io/games/ff-auth.js', TABLE='ff_shared_drawings', PAGE=24, MAXPX=256, MAXLEN=200000;
var COLS='id,user_id,author,name,image,w,h,created_at';

function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function toast(s){ var t=$('toast'); if(!t) return; t.textContent=s; t.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(function(){ t.classList.remove('on'); },2200); }
function ask(msg,ok,danger){ return window.BHASK?window.BHASK(msg,ok,danger):Promise.resolve(window.confirm(msg)); }

/* ---------- account (ff-auth.js) ---------- */
var authP=null, sb=null, admin=null;
function auth(){
  if(authP) return authP;
  authP=new Promise(function(res){
    if(window.FFAuth) return res();
    var s=document.createElement('script'); s.src=AUTH_URL; s.onload=function(){ res(); }; s.onerror=function(){ s.remove(); res(); }; document.head.appendChild(s);
  }).then(function(){
    if(!window.FFAuth||!FFAuth.ready) throw new Error('auth');
    return FFAuth.ready.then(function(c){ if(!c) throw new Error('auth'); sb=c;
      FFAuth.onChange(function(){ admin=null; checkAdmin(); if($('sdDlg').classList.contains('open')) paintShare(); if(onTab()) render(true); });
      checkAdmin(); return c; });
  });
  authP.catch(function(){ authP=null; });
  return authP;
}
function me(){ return window.FFAuth&&FFAuth.user&&FFAuth.user(); }
function checkAdmin(){ if(!sb||!me()){ admin=false; return; } sb.rpc('ff_is_admin').then(function(r){ admin=!r.error&&r.data===true; if(onTab()) closeMenu(); },function(){ admin=false; }); }
/* table not there yet (owner has not run the SQL): PostgREST says PGRST205 / 42P01 (or PGRST202 for the function) */
function missing(e){ if(!e) return false; var c=String(e.code||''); return c==='PGRST205'||c==='42P01'||c==='PGRST202'||c==='42883'||/does not exist|schema cache/i.test(String(e.message||'')); }

/* ---------- making the image small: max 256 px, smallest of PNG / WebP / JPEG ---------- */
function shrink(src){ return new Promise(function(ok,no){ var im=new Image();
  im.onload=function(){
    var w0=im.naturalWidth||im.width, h0=im.naturalHeight||im.height; if(!w0||!h0) return no(new Error('empty'));
    var k=Math.min(1,MAXPX/Math.max(w0,h0)), best=null;
    for(var round=0;round<4&&!best;round++){
      var w=Math.max(1,Math.round(w0*k)), h=Math.max(1,Math.round(h0*k)), c=document.createElement('canvas'); c.width=w; c.height=h;
      var g=c.getContext('2d'); g.imageSmoothingQuality='high'; g.drawImage(im,0,0,w,h);
      var d=g.getImageData(0,0,w,h).data, alpha=false; for(var i=3;i<d.length;i+=4) if(d[i]<250){ alpha=true; break; }
      var tries=[c.toDataURL('image/png')], wp=c.toDataURL('image/webp',0.86); if(/^data:image\/webp/.test(wp)) tries.push(wp);
      if(!alpha) tries.push(c.toDataURL('image/jpeg',0.86));
      tries.sort(function(a,b){ return a.length-b.length; });
      if(tries[0].length<=MAXLEN) best={data:tries[0],w:w,h:h,clear:alpha}; else k*=0.7;
    }
    best?ok(best):no(new Error('big'));
  };
  im.onerror=function(){ no(new Error('img')); }; im.src=src; }); }

/* ---------- share dialog ---------- */
var shareSrc=null, shareImg=null, busy=false;
function openShare(id){
  var m=BH.IMGS[id]; if(!m) return;
  shareSrc=m; shareImg=null; busy=false; $('sdName').value=String(m.name||'').slice(0,30); $('sdMsg').textContent=''; $('sdMsg').className='sdMsg';
  $('sdImg').removeAttribute('src'); $('sdDlg').classList.add('open'); paintShare();
  shrink(m.data).then(function(r){ if(shareSrc!==m) return; shareImg=r; $('sdImg').src=r.data; $('sdTh').classList.toggle('clear',r.clear); $('sdSize').textContent=F('{0}×{1} · {2}KB',r.w,r.h,Math.max(1,Math.round(r.data.length*3/4/1024))); paintShare(); },
    function(){ if(shareSrc!==m) return; say(T('이 그림은 공유할 수 없어요'),'bad'); });
  auth().then(paintShare,function(){ paintShare(); });
}
function say(t,k){ var e=$('sdMsg'); e.textContent=t||''; e.className='sdMsg'+(k?' '+k:''); }
function paintShare(){
  var u=me();
  $('sdWait').hidden=!!sb; $('sdWait').textContent=authP?T('확인 중…'):T('연결할 수 없어요');
  $('sdLogin').hidden=!sb||!!u; $('sdForm').hidden=!u;
  $('sdGo').hidden=!u; $('sdGo').disabled=!u||!shareImg||busy;
}
$('sdLoginBtn').onclick=function(){ if(window.FFAuth) FFAuth.openLogin(); };
$('sdGo').onclick=function(){
  var name=$('sdName').value.replace(/\s+/g,' ').trim().slice(0,30);
  if(!name){ say(T('제목을 써 주세요'),'bad'); $('sdName').focus(); return; }
  if(!sb||!me()||!shareImg||busy) return;
  busy=true; paintShare(); say(T('공유하는 중…'));
  sb.from(TABLE).insert({name:name,image:shareImg.data,w:shareImg.w,h:shareImg.h}).then(function(r){
    busy=false; paintShare();
    if(r.error){ var e=r.error;
      say(missing(e)?T('준비 중이에요. 조금만 기다려 주세요'):/too many|slow down/i.test(e.message||'')?T('오늘은 더 공유할 수 없어요. 내일 다시 해 보세요'):T('공유하지 못했어요. 잠시 뒤에 다시 해 보세요'),'bad'); return; }
    $('sdDlg').classList.remove('open'); toast(T("'모두의 그림'에 공유했어요"));
    if(onTab()) render(true);
  },function(){ busy=false; paintShare(); say(T('연결할 수 없어요'),'bad'); });
};
$('sdName').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); $('sdGo').click(); } });

/* ---------- the picker tab ---------- */
var rows=[], more=false, state='', q='', gen=0, qT=null;
function onTab(){ return window.BHOBJ&&BHOBJ.isShared&&BHOBJ.isShared()&&$('objDlg').classList.contains('open'); }
function likeEsc(s){ return s.replace(/[\\%_]/g,function(c){ return '\\'+c; }); }
function fetchPage(after){
  return auth().then(function(c){
    var x=c.from(TABLE).select(COLS).eq('hidden',false);
    if(q) x=x.ilike('name','%'+likeEsc(q)+'%');
    if(after) x=x.lt('id',after);
    return x.order('id',{ascending:false}).limit(PAGE);
  });
}
/* render(reload): reload=true starts again from the newest */
function render(reload,query){
  if(query!=null) q=query;
  var my=++gen; state='load'; rows=[]; more=false; paint();
  fetchPage(null).then(function(r){ if(my!==gen) return; got(r,false); },function(){ if(my!==gen) return; state='off'; paint(); });
}
function got(r,append){
  if(r.error){ state=missing(r.error)?'missing':'off'; paint(); return; }
  var list=r.data||[]; rows=append?rows.concat(list):list; more=list.length===PAGE; state='ok'; paint();
}
function loadMore(btn){ if(!rows.length) return; btn.disabled=true; btn.textContent=T('불러오는 중…'); var my=gen;
  fetchPage(rows[rows.length-1].id).then(function(r){ if(my!==gen) return; got(r,true); },function(){ if(my!==gen) return; btn.disabled=false; btn.textContent=T('더 보기'); toast(T('연결할 수 없어요')); }); }
/* from objects.js: the tab was opened (reload now) or the search box changed (wait a moment, then reload) */
function show(query,typing){ clearTimeout(qT); var v=String(query||'').trim();
  if(typing){ qT=setTimeout(function(){ render(true,v); },300); return; }
  render(true,v); }
function note(t,retry){ return '<div class="objEmpty">'+esc(t)+(retry?'<br><button type="button" class="tbtn shRetry">'+esc(T('다시 해 보기'))+'</button>':'')+'</div>'; }
function canDel(o){ var u=me(); return !!u&&(o.user_id===u.id||admin===true); }
function paint(){
  if(!onTab()) return; var g=$('objGrid');
  var head='<div class="shHead">'+esc(T('모두가 공유한 그림이에요. 누르면 내 그림으로 넣어요.'))+' <button type="button" class="lnkBtn shMine">'+esc(T('내 그림 공유하기'))+'</button></div>';
  if(state==='load'){ g.innerHTML=head+note(T('불러오는 중…')); return; }
  if(state==='missing'){ g.innerHTML=note(T('준비 중이에요. 조금만 기다려 주세요')); return; }
  if(state==='off'){ g.innerHTML=note(T('연결할 수 없어요'),true); return; }
  if(!rows.length){ g.innerHTML=head+note(q?T('찾는 그림이 없어요'):T('아직 공유된 그림이 없어요')); return; }
  g.innerHTML=head;
  rows.forEach(function(o){
    var w=document.createElement('div'); w.className='shW'; w.dataset.sid=o.id;
    var b=document.createElement('button'); b.type='button'; b.className='obj shObj'; b.dataset.sid=o.id;
    var tt=o.name+(o.author?' · '+o.author:''); b.title=tt; b.setAttribute('aria-label',o.name);
    var im=document.createElement('img'); im.alt=''; im.draggable=false; im.width=72; im.height=72; im.src=o.image; b.appendChild(im);
    var mb=document.createElement('button'); mb.type='button'; mb.className='shMore'; mb.dataset.sid=o.id; mb.textContent='⋯'; mb.setAttribute('aria-label',T('더 하기')); mb.title=T('더 하기');
    w.appendChild(b); w.appendChild(mb); g.appendChild(w);
  });
  if(more){ var m=document.createElement('div'); m.className='shMoreRow'; m.innerHTML='<button type="button" class="tbtn shNext">'+esc(T('더 보기'))+'</button>'; g.appendChild(m); }
}
function byId(id){ id=+id; return rows.filter(function(o){ return o.id===id; })[0]; }
function closeMenu(){ var mn=document.querySelector('.shMenu'); if(mn) mn.remove(); }
function openMenu(btn){
  var o=byId(btn.dataset.sid); if(!o) return; var had=btn.parentNode.querySelector('.shMenu'); closeMenu(); if(had) return;
  var mn=document.createElement('div'); mn.className='shMenu'; mn.setAttribute('role','menu');
  mn.innerHTML='<div class="shBy" data-notr>'+esc(o.author||'???')+'</div><button type="button" data-m="report">🚩 '+esc(T('신고'))+'</button>'+(canDel(o)?'<button type="button" data-m="del" class="dang">🗑 '+esc(T('삭제'))+'</button>':'');
  var g=$('objGrid'), w=btn.parentNode; var wr=w.getBoundingClientRect(), gr=g.getBoundingClientRect(); if(wr.left+wr.width/2<gr.left+gr.width/2) mn.classList.add('l'); // open toward the middle so it is not cut off
  w.appendChild(mn);
}
function drop(id){ rows=rows.filter(function(o){ return o.id!==id; }); paint(); }
function report(o){
  closeMenu();
  auth().then(function(c){
    if(!me()){ toast(T('Frenchfries777 계정으로 로그인하면 신고할 수 있어요')); FFAuth.openLogin(); return; }
    ask(T('이 그림을 신고할까요? 신고가 쌓이면 그림이 숨겨져요.'),T('신고'),true).then(function(yes){ if(!yes) return;
      c.rpc('ff_shared_drawing_report',{p_id:o.id}).then(function(r){
        if(r.error){ toast(missing(r.error)?T('준비 중이에요. 조금만 기다려 주세요'):T('신고하지 못했어요. 잠시 뒤에 다시 해 보세요')); return; }
        var v=r.data;
        if(v==='hidden'||v==='gone'){ drop(o.id); toast(T('신고했어요. 고마워요')); }
        else if(v==='already') toast(T('이미 신고한 그림이에요'));
        else if(v==='own') toast(T('내 그림은 신고 대신 삭제할 수 있어요'));
        else toast(T('신고했어요. 고마워요'));
      },function(){ toast(T('연결할 수 없어요')); });
    });
  },function(){ toast(T('연결할 수 없어요')); });
}
function del(o){
  closeMenu();
  ask(T('이 그림을 모두의 그림에서 지울까요?'),T('삭제'),true).then(function(yes){ if(!yes||!sb) return;
    sb.from(TABLE).delete().eq('id',o.id).select('id').then(function(r){
      if(r.error||!r.data||!r.data.length){ toast(T('지우지 못했어요')); return; }
      drop(o.id); toast(T('지웠어요'));
    },function(){ toast(T('연결할 수 없어요')); });
  });
}
function pick(o){
  if(window.BHOBJ&&BHOBJ.pick) BHOBJ.pick({id:'s'+o.id,name:o.name,data:o.image,w:o.w,h:o.h,shared:true});
}
$('objGrid').addEventListener('click',function(e){
  if(!onTab()) return;
  var t=e.target;
  if(t.closest('.shRetry')){ render(true); return; }
  if(t.closest('.shNext')){ loadMore(t.closest('.shNext')); return; }
  if(t.closest('.shMine')){ $('objDlg').classList.remove('open'); if(window.BHMGR) BHMGR(); return; }
  var mi=t.closest('.shMenu [data-m]'); if(mi){ var o=byId(mi.closest('.shW').dataset.sid); if(!o) return; if(mi.dataset.m==='report') report(o); else del(o); return; }
  var mb=t.closest('.shMore'); if(mb){ openMenu(mb); return; }
  var b=t.closest('.shObj'); if(b){ var x=byId(b.dataset.sid); if(x) pick(x); }
});
document.addEventListener('pointerdown',function(e){ if(!e.target.closest('.shMenu')&&!e.target.closest('.shMore')) closeMenu(); });

window.BHSHARE={show:show, openShare:openShare, shrink:shrink};
})();
