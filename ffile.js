/* FFFile: the one "파일" window every Tool uses (same button, same window, same rows).
   FFFile.BTN        the top-bar button markup (same in every tool)
   FFFile.open(o)    o = {items:()=>[{id,name,sub,current}], onOpen, onNew, onRename, onDup, onDel,
                          actions:[{label,sub,run,danger}], foot:[{label,run}], title, newLabel, empty}
   FFFile.store(o)   saves several projects for a tool that keeps one working project in a single storage key:
                          o = {key, read(), write(raw), clear(), getName(), setName(n), flush(), def, tool}
                     returns {items, onOpen, onNew, onRename, onDup, onDel, applyName}  (pass them to open()) */
(function(){
  if(window.FFFile) return;
  var T=function(s){ return window.FFT&&FFT.T?FFT.T(s):s; };
  if(window.FFT&&FFT.add) FFT.add({
    "파일":["File"],"내 파일":["My files"],"＋ 새로 만들기":["＋ New"],"가져오기 · 내보내기":["Import · Export"],
    "아직 아무것도 없어요":["Nothing here yet"],"이름 바꾸기":["Rename"],"복사해서 하나 더":["Duplicate"],"지우기":["Delete"],
    "저장":["Save"],"취소":["Cancel"],"닫기":["Close"],"이름 없음":["Untitled"],"복사본":["copy"],"방금":["just now"]
  });
  var css='.ffo{position:fixed;inset:0;z-index:9000;display:none;align-items:center;justify-content:center;padding:14px;background:rgba(0,0,0,.62)}'+
  '.ffo.open{display:flex}.ffd{background:var(--panel,var(--bg,#0f0f0f));color:var(--text,#eee);border:1px solid var(--fry,#d4af37);border-radius:16px;width:min(560px,100%);max-height:86vh;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,.55);font:14px/1.45 "Noto Sans KR",system-ui,sans-serif}'+
  '.ffd .ffh{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:2px solid var(--fry,#d4af37)}'+
  '.ffd .ffh h3{margin:0;flex:1;font:600 17px "Oswald","Noto Sans KR",sans-serif;letter-spacing:.02em;display:flex;align-items:center;gap:8px}'+
  '.ffd .ffh h3:before{content:"";width:5px;height:20px;background:var(--fry,#d4af37);border-radius:2px}'+
  '.ffd .ffx{background:none;border:0;color:var(--text,#eee);font-size:24px;line-height:1;cursor:pointer;padding:2px 8px}'+
  '.ffd .ffb{padding:12px 14px;overflow:auto;display:flex;flex-direction:column;gap:12px}'+
  '.ffd .ffl{display:flex;flex-direction:column;gap:6px}'+
  '.ffd .ffr{display:flex;align-items:center;gap:6px;border:1px solid var(--fry,#d4af37);border-radius:12px;padding:6px 8px 6px 12px;cursor:pointer}'+
  '.ffd .ffr:hover{background:color-mix(in srgb,var(--fry,#d4af37) 14%,transparent)}.ffd .ffr.cur{background:color-mix(in srgb,var(--fry,#d4af37) 24%,transparent)}'+
  '.ffd .ffr .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}.ffd .ffr .sb{color:var(--dim,#999);font-size:12px;white-space:nowrap}'+
  '.ffd .ffr .ib{background:none;border:0;color:var(--text,#eee);cursor:pointer;padding:5px 7px;border-radius:8px;font-size:15px;line-height:1;opacity:.8}.ffd .ffr .ib:hover{opacity:1;background:color-mix(in srgb,var(--fry,#d4af37) 22%,transparent)}'+
  '.ffd .ffr input{flex:1;min-width:0;background:var(--bg,#000);color:var(--text,#eee);border:1px solid var(--fry,#d4af37);border-radius:8px;padding:5px 8px;font:inherit}'+
  '.ffd .ffe{color:var(--dim,#999);text-align:center;padding:14px 0}'+
  '.ffd .ffs{color:var(--dim,#999);font-size:12px;margin:2px 2px -4px}'+
  '.ffd .ffa{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px}'+
  '.ffd .ffa button{text-align:left;background:transparent;color:var(--text,#eee);border:1px solid var(--line,rgba(212,175,55,.45));border-radius:10px;padding:8px 10px;cursor:pointer;font:inherit;display:flex;flex-direction:column;gap:2px}'+
  '.ffd .ffa button:hover{border-color:var(--fry,#d4af37);background:color-mix(in srgb,var(--fry,#d4af37) 14%,transparent)}.ffd .ffa button small{color:var(--dim,#999);font-size:11.5px}.ffd .ffa button.dang{color:#e5534b}'+
  '.ffd .fff{display:flex;gap:8px;justify-content:flex-end;align-items:center;padding:10px 14px;border-top:1px solid var(--line,rgba(212,175,55,.45));flex-wrap:wrap}.ffd .fff .sp{flex:1}';
  var st=document.createElement('style'); st.textContent=css; (document.head||document.documentElement).appendChild(st);

  function el(t,c,x){ var e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; }
  function btn(c,x,f){ var b=el('button',c,x); b.type='button'; if(f) b.onclick=f; return b; }
  var ov=null, cur=null;

  function close(){ if(ov) ov.classList.remove('open'); cur=null; }
  function build(){
    ov=el('div','ffo'); ov.setAttribute('role','dialog'); ov.innerHTML='<div class="ffd"><div class="ffh"><h3></h3></div><div class="ffb"></div><div class="fff"></div></div>';
    var x=btn('ffx','×',close); x.setAttribute('aria-label',T('닫기')); ov.querySelector('.ffh').appendChild(x);
    ov.addEventListener('mousedown',function(e){ if(e.target===ov) close(); });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&ov.classList.contains('open')) close(); });
    document.body.appendChild(ov);
  }
  function draw(){
    var o=cur, d=ov.querySelector('.ffd'), b=d.querySelector('.ffb'), f=d.querySelector('.fff');
    d.querySelector('h3').textContent=T(o.title||'내 파일');
    b.innerHTML=''; f.innerHTML='';
    var l=el('div','ffl'), items=o.items?o.items():[];
    if(!items.length&&!o.noList) l.appendChild(el('div','ffe',T(o.empty||'아직 아무것도 없어요')));
    items.forEach(function(it){
      var r=el('div','ffr'+(it.current?' cur':'')), nm=el('span','nm',(it.current?'● ':'')+(it.name||T('이름 없음')));
      nm.setAttribute('data-notr',''); r.appendChild(nm);
      if(it.sub){ var sb=el('span','sb',it.sub); sb.setAttribute('data-notr',''); r.appendChild(sb); }
      r.onclick=function(){ if(o.onOpen){ close(); o.onOpen(it.id,!!it.current); } };
      function ib(txt,tip,fn){ var k=btn('ib',txt,function(e){ e.stopPropagation(); fn(); }); k.title=T(tip); k.setAttribute('aria-label',T(tip)); r.appendChild(k); }
      if(o.onRename) ib('✎','이름 바꾸기',function(){
        var inp=el('input'); inp.value=it.name||''; inp.setAttribute('data-notr','');
        r.innerHTML=''; r.onclick=null; r.classList.add('cur'); r.appendChild(inp);
        var ok=btn('ib','✔',null), no=btn('ib','✕',null); ok.title=T('저장'); no.title=T('취소'); r.appendChild(ok); r.appendChild(no);
        function done(save){ if(save&&inp.value.trim()) o.onRename(it.id,inp.value.trim()); draw(); }
        ok.onclick=function(e){ e.stopPropagation(); done(true); }; no.onclick=function(e){ e.stopPropagation(); done(false); };
        inp.onkeydown=function(e){ if(e.key==='Enter') done(true); else if(e.key==='Escape'){ e.stopPropagation(); done(false); } };
        inp.onclick=function(e){ e.stopPropagation(); }; inp.focus(); inp.select(); });
      if(o.onDup) ib('⧉','복사해서 하나 더',function(){ o.onDup(it.id); draw(); });
      if(o.onDel) ib('🗑','지우기',function(){ o.onDel(it.id,!!it.current); if(cur===o&&ov.classList.contains('open')) draw(); });
      l.appendChild(r); });
    if(!o.noList) b.appendChild(l);
    if(o.actions&&o.actions.length){
      b.appendChild(el('div','ffs',T('가져오기 · 내보내기')));
      var a=el('div','ffa');
      o.actions.forEach(function(ac){ var k=btn(ac.danger?'dang':'',null,function(){ close(); ac.run(); }); k.appendChild(el('span','',ac.label)); if(ac.sub) k.appendChild(el('small','',ac.sub)); a.appendChild(k); });
      b.appendChild(a); }
    (o.foot||[]).forEach(function(x){ f.appendChild(btn('tbtn',x.label,function(){ close(); x.run(); })); });
    f.appendChild(el('span','sp'));
    if(o.onNew) f.appendChild(btn('tbtn pri',T(o.newLabel||'＋ 새로 만들기'),function(){ close(); o.onNew(); }));
    if(window.FFT&&FFT.walk) try{ FFT.walk(d); }catch(e){}
  }
  function open(o){ if(!ov) build(); cur=o; draw(); ov.classList.add('open'); }

  function fmt(t){ var d=new Date(t); return (d.getMonth()+1)+'/'+d.getDate()+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }
  function store(o){
    var P='ff.'+o.tool+'.', IX=P+'docs', CU=P+'cur', DP=P+'d.';
    function jget(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } }
    function jset(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); return true; }catch(e){ return false; } }
    function uid(){ return 'd'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
    function index(){ var a=jget(IX); if(!a||!a.length){ var id=uid(); a=[{id:id,name:o.getName()||o.def,t:Date.now()}]; jset(IX,a); try{ localStorage.setItem(CU,id); }catch(e){} } return a; }
    function curId(){ var a=index(), c=null; try{ c=localStorage.getItem(CU); }catch(e){} if(!a.some(function(x){ return x.id===c; })){ c=a[0].id; try{ localStorage.setItem(CU,c); }catch(e){} } return c; }
    function sync(){ if(o.flush) try{ o.flush(); }catch(e){} var a=index(), c=curId(), raw=o.read();
      a.forEach(function(x){ if(x.id===c){ x.t=Date.now(); x.name=o.getName()||x.name; } });
      try{ if(raw!=null) localStorage.setItem(DP+c,raw); }catch(e){ if(window.toast) toast('저장 공간이 부족해요. 쓰지 않는 파일을 지워 주세요'); } jset(IX,a); }
    function go(id){ window.__ffSwitching=1; try{ localStorage.setItem(CU,id); }catch(e){} location.reload(); }
    var api={
      items:function(){ index(); var c=curId(), a0=jget(IX), n0=o.getName(); a0.forEach(function(x){ if(x.id===c&&n0) x.name=n0; }); jset(IX,a0); return jget(IX).slice().sort(function(a,b){ return b.t-a.t; }).map(function(x){ return {id:x.id,name:x.name,sub:fmt(x.t),current:x.id===c}; }); },
      onOpen:function(id,isCur){ if(isCur) return; sync(); var raw=null; try{ raw=localStorage.getItem(DP+id); }catch(e){} if(raw==null) o.clear(); else o.write(raw); go(id); },
      onNew:function(){ sync(); var a=jget(IX), id=uid(); a.push({id:id,name:o.def,t:Date.now()}); jset(IX,a); o.clear(); go(id); },
      onRename:function(id,n){ var a=jget(IX); a.forEach(function(x){ if(x.id===id) x.name=n; }); jset(IX,a); if(id===curId()) o.setName(n); },
      onDup:function(id){ sync(); var a=jget(IX), s=a.filter(function(x){ return x.id===id; })[0], raw=null; if(!s) return; try{ raw=localStorage.getItem(DP+id); }catch(e){} var nid=uid(); if(raw!=null) try{ localStorage.setItem(DP+nid,raw); }catch(e){}
        a.push({id:nid,name:s.name+' '+T('복사본'),t:Date.now()}); jset(IX,a); },
      onDel:function(id,isCur){ if(window.FFUndo&&0){} var a=jget(IX).filter(function(x){ return x.id!==id; }); try{ localStorage.removeItem(DP+id); }catch(e){}
        if(!isCur){ jset(IX,a); return; }
        if(a.length){ jset(IX,a); var n=a.slice().sort(function(p,q){ return q.t-p.t; })[0], raw=null; try{ raw=localStorage.getItem(DP+n.id); }catch(e){} if(raw==null) o.clear(); else o.write(raw); go(n.id); }
        else{ var nid=uid(); jset(IX,[{id:nid,name:o.def,t:Date.now()}]); o.clear(); go(nid); } },
      applyName:function(){ var a=jget(IX), c=curId(); if(!a) return; a.forEach(function(x){ if(x.id===c&&x.name&&x.name!==o.getName()) o.setName(x.name); }); },
      sync:sync
    };
    index(); try{ window.addEventListener('pagehide',function(){ if(window.__ffSwitching) return; try{ sync(); }catch(e){} }); }catch(e){}
    return api;
  }
  window.FFFile={open:open,close:close,store:store,
    BTN:'<button class="tbtn" id="fileBtn" title="파일"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg><span class="lb">파일</span></button>'};
})();
