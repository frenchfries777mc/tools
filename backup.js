/* 내 작업 백업과 복원: 이 브라우저에 있는 문서·시트·슬라이드·블록·파이썬·랩·AI 체험 기록을 파일 하나로 받고, 다른 기기에서 불러와요.
   로그인 정보와 AI 열쇠(ffai.v1)는 넣지 않아요. 불러오면 같은 이름의 저장은 파일 내용으로 바뀌어요.
   FFBackup.open() -> 창 열기    FFBackup.collect() -> Promise<객체>    FFBackup.restore(객체) -> Promise<{keys, media}> */
(function(root){
'use strict';
var MARK='fry-tools-backup', SKIP=/^ffai\.v1$/, KEEP=/^(ff[a-z]*|fd)\./;
function blobToURL(b){ return new Promise(function(res,rej){ var r=new FileReader(); r.onload=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; r.readAsDataURL(b); }); }
function urlToBlob(u){ var m=/^data:([^;,]*)(;base64)?,(.*)$/s.exec(u); if(!m) return null; var bin=m[2]?atob(m[3]):decodeURIComponent(m[3]), a=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) a[i]=bin.charCodeAt(i); return new Blob([a],{type:m[1]||'application/octet-stream'}); }
function mediaDump(){   // Fry Slides가 넣은 그림·영상·소리 (IndexedDB ffslides-media)
  return new Promise(function(res){
    try{
      var q=indexedDB.open('ffslides-media',1); q.onupgradeneeded=function(){ q.result.createObjectStore('m'); };
      q.onerror=function(){ res({}); };
      q.onsuccess=function(){ var out={}, d=q.result, keys, vals;
        try{ var st=d.transaction('m').objectStore('m'); var rk=st.getAllKeys(), rv=st.getAll();
          rv.onsuccess=function(){ keys=rk.result; vals=rv.result; var jobs=[]; keys.forEach(function(k,i){ var v=vals[i]; if(v instanceof Blob) jobs.push(blobToURL(v).then(function(u){ out[k]=u; },function(){})); else if(typeof v==='string') out[k]=v; });
            Promise.all(jobs).then(function(){ d.close(); res(out); }); };
          rv.onerror=function(){ res({}); };
        }catch(e){ res({}); } };
    }catch(e){ res({}); }
  });
}
function mediaPut(map){
  var ks=Object.keys(map||{}); if(!ks.length) return Promise.resolve(0);
  return new Promise(function(res){
    try{
      var q=indexedDB.open('ffslides-media',1); q.onupgradeneeded=function(){ q.result.createObjectStore('m'); };
      q.onerror=function(){ res(0); };
      q.onsuccess=function(){ var d=q.result, n=0, tx=d.transaction('m','readwrite'), st=tx.objectStore('m');
        ks.forEach(function(k){ var b=urlToBlob(map[k]); if(b){ st.put(b,k); n++; } });
        tx.oncomplete=function(){ d.close(); res(n); }; tx.onerror=function(){ res(n); }; };
    }catch(e){ res(0); }
  });
}
function collect(){
  var ls={}; try{ for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(KEEP.test(k)&&!SKIP.test(k)) ls[k]=localStorage.getItem(k); } }catch(e){}
  return mediaDump().then(function(m){ return {app:MARK, v:1, at:new Date().toISOString(), ls:ls, media:m}; });
}
function restore(o){
  if(!o||o.app!==MARK||typeof o.ls!=='object') return Promise.reject(new Error('bad'));
  var n=0; Object.keys(o.ls).forEach(function(k){ if(KEEP.test(k)&&!SKIP.test(k)&&typeof o.ls[k]==='string'){ try{ localStorage.setItem(k,o.ls[k]); n++; }catch(e){} } });
  return mediaPut(o.media).then(function(m){ return {keys:n, media:m}; });
}
function stamp(){ var d=new Date(), p=function(x){ return (x<10?'0':'')+x; }; return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate()); }
function el(tag,css,txt){ var e=document.createElement(tag); if(css) e.style.cssText=css; if(txt!=null) e.textContent=txt; return e; }
function open(){
  if(document.getElementById('ffBackupBox')) return;
  var bg=el('div','position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px'); bg.id='ffBackupBox';
  var box=el('div','background:var(--panel,#10131b);color:var(--text,#eef0f5);border:1px solid var(--line,#222837);border-radius:16px;padding:20px;max-width:420px;width:100%;line-height:1.6;font-size:15px');
  box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true');
  var h=el('h3','margin:0 0 8px;font-size:18px','내 작업 백업'),
      p=el('p','margin:0 0 14px;color:var(--dim,#8a93a6)','이 브라우저에 있는 문서·시트·슬라이드·블록 프로젝트·파이썬·랩 기록을 파일 하나로 받아요. 다른 기기에서 그 파일을 불러오면 이어서 쓸 수 있어요. 로그인 정보와 AI 열쇠는 들어가지 않아요.'),
      msg=el('p','margin:0 0 12px;min-height:22px;color:var(--fry,#ffc93c)',''),
      row=el('div','display:flex;gap:8px;flex-wrap:wrap');
  var bs='border:1px solid var(--line,#222837);background:var(--bg,#08090d);color:inherit;border-radius:10px;padding:8px 14px;font:inherit;cursor:pointer';
  var bSave=el('button',bs+';background:linear-gradient(135deg,var(--fry,#ffc93c),var(--fry2,#ff8a3d));color:#1a1204;font-weight:700;border:0','백업 파일 받기'),
      bLoad=el('button',bs,'파일에서 불러오기'), bClose=el('button',bs,'닫기'), fi=el('input'); fi.type='file'; fi.accept='.json,application/json'; fi.hidden=true;
  [bSave,bLoad,bClose].forEach(function(b){ b.type='button'; });
  bClose.onclick=function(){ bg.remove(); };
  bg.onclick=function(e){ if(e.target===bg) bg.remove(); };
  bSave.onclick=function(){ bSave.disabled=true; msg.textContent='모으는 중이에요…';
    collect().then(function(o){ var blob=new Blob([JSON.stringify(o)],{type:'application/json'}), a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='fry-tools-backup-'+stamp()+'.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(a.href); },4000);
      msg.textContent=Object.keys(o.ls).length+'개 저장을 파일로 받았어요.'; bSave.disabled=false; },function(){ msg.textContent='백업하지 못했어요.'; bSave.disabled=false; }); };
  bLoad.onclick=function(){ fi.value=''; fi.click(); };
  fi.onchange=function(){ var f=fi.files&&fi.files[0]; if(!f) return;
    var r=new FileReader(); r.onerror=function(){ msg.textContent='파일을 읽지 못했어요.'; };
    r.onload=function(){ var o=null; try{ o=JSON.parse(r.result); }catch(e){}
      if(!o||o.app!==MARK){ msg.textContent='Fry Tools 백업 파일이 아니에요.'; return; }
      var n=Object.keys(o.ls||{}).length, m=Object.keys(o.media||{}).length;
      msg.textContent=n+'개 저장'+(m?'과 그림·영상 '+m+'개':'')+'가 들어 있어요. 같은 이름의 저장은 파일 내용으로 바뀌어요.';
      bLoad.textContent='덮어써서 불러오기'; bLoad.onclick=function(){ bLoad.disabled=true;
        restore(o).then(function(x){ msg.textContent=x.keys+'개 저장을 불러왔어요. 각 도구를 열면 보여요.'; bLoad.textContent='파일에서 불러오기'; bLoad.disabled=false; bLoad.onclick=function(){ fi.value=''; fi.click(); }; },function(){ msg.textContent='불러오지 못했어요.'; bLoad.disabled=false; }); }; };
    r.readAsText(f); };
  row.appendChild(bSave); row.appendChild(bLoad); row.appendChild(bClose); row.appendChild(fi);
  box.appendChild(h); box.appendChild(p); box.appendChild(msg); box.appendChild(row); bg.appendChild(box); document.body.appendChild(bg);
  bSave.focus();
}
root.FFBackup={open:open, collect:collect, restore:restore};
})(typeof window!=='undefined'?window:globalThis);
