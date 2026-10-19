/* Fry Tools service worker: lets the site install as an app and open without internet.
   Network first (so a new release shows up at once); a copy of every page and file you opened is kept and used when the
   network fails or answers too slowly (4 s). Only this site's own files are kept: other sites and anything but GET are left alone. */
var V='fftools-v1', CORE=['./','sheet/','blocks/','slides/','lab/','logo.svg'], SLOW=4000;
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(V).then(function(c){ return Promise.all(CORE.map(function(u){ return c.add(u).catch(function(){}); })); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k.indexOf('fftools-')===0&&k!==V; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); }));
});
function netFirst(req){
  return new Promise(function(res){
    var done=false, nav=req.mode==='navigate';
    function give(r){ if(!done){ done=true; res(r); } }
    var t=setTimeout(function(){ caches.match(req,{ignoreSearch:nav}).then(function(m){ if(m) give(m); }); },SLOW);
    fetch(req).then(function(r){
      clearTimeout(t);
      if(r&&r.ok&&r.type==='basic'){ var c=r.clone(); caches.open(V).then(function(ca){ return ca.put(req,c); }).catch(function(){}); }
      give(r);
    }).catch(function(){
      clearTimeout(t);
      caches.match(req,{ignoreSearch:nav}).then(function(m){ give(m||Response.error()); });
    });
  });
}
self.addEventListener('fetch',function(e){
  var r=e.request;
  if(r.method!=='GET'||r.headers.has('range')) return;
  var u=new URL(r.url);
  if(u.origin!==self.location.origin) return;
  e.respondWith(netFirst(r));
});
