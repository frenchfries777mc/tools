/* Fry room: a small PeerJS layer for working together in one room. Shared by Docs (and Sheet).
   One browser hosts the room and keeps the real copy; the others join with a 6-letter code (or the link #r=CODE). Every message is a JSON object.
   PeerJS (WebRTC data channels; the public PeerJS cloud server only helps the browsers find each other) is loaded from the same address as the quiz in slides/lq-net.js.
   Big messages are cut into frames of FFRoom.frame characters and sent one after the other (real PeerJS throws "Maximum call stack size exceeded" on big arrays or strings), and the sending waits while the channel is full.
     FFRoom.host({app, name, open(code), error(kind), join(p), leave(p), msg(fromId, obj), peers(list)}) -> room
         room: {code, id:'host', send(toId, obj), all(obj, exceptId), peers(), close()}
     FFRoom.join(code, {app, name, open(info), msg(obj), peers(list), end(why), error(kind)}) -> guest
         guest: {id, send(obj), peers(), close()}     end(why): 'closed' (the host closed the room) or 'lost' (the connection dropped)
     p / list entries: {id, name, color}. error kinds: 'taken' (code in use), 'nohost' (no room with that code), 'net' (cannot reach the server), 'lib' (PeerJS did not load), 'full', 'app' (another tool's room)
     FFRoom.account() -> Promise of the Frenchfries777 account name ('' when not logged in), FFRoom.link(code) -> the address to share, FFRoom.codeFromUrl() -> the code in this address or ''
   A test can set FFRoom.peerOpts (host, port, path, secure) and FFRoom.peerSrc before the first call. */
(function(root){
'use strict';
var FFRoom={ peerSrc:'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js', peerOpts:{debug:0}, authSrc:'https://frenchfries777mc.github.io/games/ff-auth.js', max:8, frame:3500, maxFrames:6000 };
var PREFIX='ffroom-', CODE_CH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789', COLORS=['#e03131','#1c7ed6','#2f9e44','#f08c00','#7048e8','#d6336c','#1098ad','#868e96','#5c940d'], peerP=null;
function makeCode(){ var s='', a=new Uint8Array(6); try{ crypto.getRandomValues(a); }catch(e){ for(var j=0;j<6;j++) a[j]=Math.random()*256|0; } for(var i=0;i<6;i++) s+=CODE_CH[a[i]%CODE_CH.length]; return s; }
function cleanCode(c){ return String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6); }
function loadPeer(){ if(root.Peer) return Promise.resolve(root.Peer); if(peerP) return peerP;
  peerP=new Promise(function(res,rej){ var s=document.createElement('script'); s.src=FFRoom.peerSrc; s.crossOrigin='anonymous'; s.onload=function(){ if(root.Peer) res(root.Peer); else { peerP=null; rej(new Error('lib')); } }; s.onerror=function(){ peerP=null; rej(new Error('lib')); }; document.head.appendChild(s); });
  return peerP; }
function kindOf(err){ var t=err&&err.type; return t==='unavailable-id'?'taken':t==='peer-unavailable'?'nohost':t==='browser-incompatible'?'lib':'net'; }
function newPeer(P,id){ var o={}, k; for(k in FFRoom.peerOpts) o[k]=FFRoom.peerOpts[k]; return id?new P(id,o):new P(o); }
/* one data channel: strings only, framed and paced */
function wrap(dc){ var c={on:{}}, q=[], pumping=false, seq=0, inbox={}, closed=false;
  function buffered(){ var ch=dc.dataChannel||dc._dc; return ch&&ch.bufferedAmount||0; }
  function pump(){ if(pumping) return; pumping=true; (function go(){ if(closed||!dc.open){ pumping=false; q=[]; return; }
    var n=0; while(q.length&&n<16&&buffered()<512*1024){ try{ dc.send(q.shift()); }catch(e){ } n++; }
    if(q.length) setTimeout(go,10); else pumping=false; })(); }
  c.send=function(o){ var s; try{ s=JSON.stringify(o); }catch(e){ return; }
    if(s.length<=FFRoom.frame) q.push(s);
    else { var id=++seq, n=Math.ceil(s.length/FFRoom.frame); for(var i=0;i<n;i++) q.push(JSON.stringify({z:id,i:i,n:n,d:s.slice(i*FFRoom.frame,(i+1)*FFRoom.frame)})); }
    pump(); };
  c.close=function(){ closed=true; try{ dc.close(); }catch(e){} };
  function got(o){ if(o&&typeof o==='object'&&c.on.data) c.on.data(o); }
  dc.on('data',function(d){ if(typeof d!=='string') return; var o; try{ o=JSON.parse(d); }catch(e){ return; }
    if(o&&o.z!=null&&typeof o.d==='string'){ if(!(o.n>0&&o.n<=FFRoom.maxFrames)) return; var b=inbox[o.z]||(inbox[o.z]={n:o.n,got:0,p:[]}); if(b.p[o.i]==null){ b.p[o.i]=o.d; b.got++; }
      if(b.got===b.n){ delete inbox[o.z]; var whole; try{ whole=JSON.parse(b.p.join('')); }catch(e){ return; } got(whole); } }
    else got(o); });
  var fin=function(){ if(closed) return; closed=true; if(c.on.close) c.on.close(); }; dc.on('close',fin); dc.on('error',fin); return c; }
function pickName(n){ return String(n||'').replace(/\s+/g,' ').trim().slice(0,20)||'?'; }

FFRoom.host=function(cb){ var code=makeCode(), peer=null, dead=false, conns={}, info={host:{id:'host',name:pickName(cb.name),color:COLORS[0]}}, order=['host'], used={host:1};
  function list(){ return order.map(function(i){ return info[i]; }); }
  function tell(){ var l=list(), o={t:'ps',peers:l}; order.forEach(function(i){ if(conns[i]) conns[i].send(o); }); if(cb.peers) cb.peers(l); }
  var room={code:code, id:'host', send:function(to,d){ if(conns[to]) conns[to].send({t:'m',d:d,from:'host'}); }, all:function(d,except){ order.forEach(function(i){ if(i!=='host'&&i!==except&&conns[i]) conns[i].send({t:'m',d:d,from:'host'}); }); }, peers:list,
    close:function(){ dead=true; order.forEach(function(i){ if(conns[i]){ conns[i].send({t:'bye'}); } }); setTimeout(function(){ try{ if(peer) peer.destroy(); }catch(e){} },600); }};
  room.relay=function(from,d){ order.forEach(function(i){ if(i!=='host'&&i!==from&&conns[i]) conns[i].send({t:'m',d:d,from:from}); }); };
  loadPeer().then(function(P){ if(dead) return; peer=newPeer(P,PREFIX+(cb.app||'x')+'-'+code);
    peer.on('open',function(){ if(cb.open) cb.open(code); });
    peer.on('connection',function(dc){ dc.on('open',function(){ var c=wrap(dc), id=null;
      c.on.data=function(o){ if(dead) return;
        if(!id){ if(o.t!=='hi') return; if(order.length>FFRoom.max){ c.send({t:'no',why:'full'}); setTimeout(c.close,400); return; }
          var k=1; while(used['g'+k]) k++; id='g'+k; used[id]=1; conns[id]=c; var ci=order.length%COLORS.length; info[id]={id:id,name:pickName(o.name),color:COLORS[ci]}; order.push(id);
          c.send({t:'wel',id:id,peers:list()}); tell(); if(cb.join) cb.join(info[id]); return; }
        if(o.t==='m'&&cb.msg) cb.msg(id,o.d); };
      c.on.close=function(){ if(!id||!conns[id]) return; var gone=info[id]; delete conns[id]; order=order.filter(function(i){ return i!==id; }); delete info[id]; delete used[id]; tell(); if(cb.leave) cb.leave(gone); }; }); });
    peer.on('disconnected',function(){ if(!dead) setTimeout(function(){ try{ if(!dead&&peer.disconnected&&!peer.destroyed) peer.reconnect(); }catch(e){} },1500); });
    peer.on('error',function(e){ var k=kindOf(e); if(k==='nohost') return; if(cb.error) cb.error(k); }); },
    function(){ if(cb.error) cb.error('lib'); });
  return room; };

FFRoom.join=function(code,cb){ code=cleanCode(code); var peer=null, dc=null, dead=false, c=null, ended=false, myId='', plist=[];
  function end(why){ if(ended||dead) return; ended=true; if(cb.end) cb.end(why); }
  var guest={ get id(){ return myId; }, send:function(d){ if(c&&!ended) c.send({t:'m',d:d}); }, peers:function(){ return plist; }, close:function(){ dead=true; try{ if(c) c.close(); }catch(e){} try{ if(peer) peer.destroy(); }catch(e){} }};
  loadPeer().then(function(P){ if(dead) return; peer=newPeer(P);
    peer.on('open',function(){ if(dead) return; dc=peer.connect(PREFIX+(cb.app||'x')+'-'+code,{reliable:true, serialization:'json'});
      dc.on('open',function(){ c=wrap(dc); c.send({t:'hi',name:pickName(cb.name),app:cb.app||'x'});
        c.on.data=function(o){ if(dead) return;
          if(o.t==='wel'){ myId=o.id; plist=o.peers||[]; if(cb.peers) cb.peers(plist); if(cb.open) cb.open({id:myId,peers:plist}); }
          else if(o.t==='ps'){ plist=o.peers||[]; if(cb.peers) cb.peers(plist); }
          else if(o.t==='m'){ if(cb.msg) cb.msg(o.d,o.from); }
          else if(o.t==='no'){ ended=true; if(cb.error) cb.error(o.why||'full'); }
          else if(o.t==='bye') end('closed'); };
        c.on.close=function(){ end('lost'); }; }); });
    peer.on('error',function(e){ if(!dead&&cb.error) cb.error(kindOf(e)); }); },
    function(){ if(cb.error) cb.error('lib'); });
  return guest; };

/* the Frenchfries777 account name, with the account script loaded when needed (the same one Slides and Blocks use) */
var authP=null;
FFRoom.account=function(){
  if(!authP) authP=new Promise(function(res){ if(root.FFAuth) return res(); var s=document.createElement('script'); s.src=FFRoom.authSrc; s.onload=function(){ res(); }; s.onerror=function(){ s.remove(); res(); }; document.head.appendChild(s); })
    .then(function(){ return root.FFAuth&&FFAuth.ready?FFAuth.ready.then(function(){ return true; },function(){ return false; }):false; });
  return authP.then(function(){ var u=root.FFAuth&&FFAuth.user&&FFAuth.user(); if(!u) return ''; var m=u.user_metadata||{}; return pickName(u.name||u.nickname||u.username||u.display_name||m.name||m.nickname||m.user_name||m.full_name||(u.email?String(u.email).split('@')[0]:'')); },function(){ return ''; }); };
FFRoom.link=function(code){ return location.href.split('#')[0]+'#r='+code; };
FFRoom.codeFromUrl=function(){ var m=/[#&]r=([A-Za-z0-9]{6})/.exec(location.hash||''); return m?m[1].toUpperCase():''; };
FFRoom.cleanCode=cleanCode; FFRoom.COLORS=COLORS;
root.FFRoom=FFRoom;
})(typeof window!=='undefined'?window:globalThis);
