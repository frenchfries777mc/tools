/* Fry Slides live quiz: the message layer, shared by the presenter (app.js) and the phones (join.html).
   Messages are small JSON objects. The default transport is PeerJS (WebRTC data channels; the public PeerJS cloud
   server is used only to find each other, nothing else goes through it). A test or another page can put its own
   transport in window.FFLQ_TRANSPORT before this runs, with the same two calls:
     host(code, {open(), error(kind), conn(c)})  -> {close()}      c: {send(obj), close(), on:{data(obj), close()}} (the caller fills c.on)
     join(code, {open(), data(obj), close(), error(kind)}) -> {send(obj), close()}
   error kinds: 'taken' (the code is in use), 'nohost' (no presenter with that code), 'net' (cannot reach the server), 'lib' (PeerJS did not load) */
(function(root){
'use strict';
var PEER_SRC='https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js', PREFIX='ffslq-', peerP=null;
var CODE_CH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode(){ var s='', a=new Uint8Array(6); try{ crypto.getRandomValues(a); }catch(e){ for(var j=0;j<6;j++) a[j]=Math.random()*256|0; } for(var i=0;i<6;i++) s+=CODE_CH[a[i]%CODE_CH.length]; return s; }
function cleanCode(c){ return String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6); }
function loadPeer(){ if(root.Peer) return Promise.resolve(root.Peer); if(peerP) return peerP;
  peerP=new Promise(function(res,rej){ var s=document.createElement('script'); s.src=PEER_SRC; s.crossOrigin='anonymous'; s.onload=function(){ if(root.Peer) res(root.Peer); else { peerP=null; rej(new Error('lib')); } }; s.onerror=function(){ peerP=null; rej(new Error('lib')); }; document.head.appendChild(s); });
  return peerP; }
function kindOf(err){ var t=err&&err.type; return t==='unavailable-id'?'taken':t==='peer-unavailable'?'nohost':t==='browser-incompatible'?'lib':'net'; }
function wrapConn(dc){ var c={on:{}, send:function(o){ try{ if(dc.open) dc.send(JSON.stringify(o)); }catch(e){} }, close:function(){ try{ dc.close(); }catch(e){} }}, closed=false;
  dc.on('data',function(d){ var o=null; try{ o=typeof d==='string'?JSON.parse(d):d; }catch(e){} if(o&&typeof o==='object'&&c.on.data) c.on.data(o); });
  var fin=function(){ if(closed) return; closed=true; if(c.on.close) c.on.close(); }; dc.on('close',fin); dc.on('error',fin); return c; }
var peerNet={
  host:function(code,cb){ var peer=null, dead=false;
    loadPeer().then(function(P){ if(dead) return; peer=new P(PREFIX+code,{debug:0});
      peer.on('open',function(){ if(cb.open) cb.open(); });
      peer.on('connection',function(dc){ dc.on('open',function(){ if(cb.conn) cb.conn(wrapConn(dc)); }); });
      peer.on('disconnected',function(){ if(!dead) setTimeout(function(){ try{ if(!dead&&peer.disconnected&&!peer.destroyed) peer.reconnect(); }catch(e){} },1500); });
      peer.on('error',function(e){ var k=kindOf(e); if(k==='nohost') return; if(cb.error) cb.error(k); }); },
      function(){ if(cb.error) cb.error('lib'); });
    return {close:function(){ dead=true; try{ if(peer) peer.destroy(); }catch(e){} }}; },
  join:function(code,cb){ var peer=null, dc=null, dead=false, c=null;
    loadPeer().then(function(P){ if(dead) return; peer=new P({debug:0});
      peer.on('open',function(){ if(dead) return; dc=peer.connect(PREFIX+code,{reliable:true, serialization:'json'});
        dc.on('open',function(){ c=wrapConn(dc); c.on.data=function(o){ if(cb.data) cb.data(o); }; c.on.close=function(){ if(!dead&&cb.close) cb.close(); }; if(cb.open) cb.open(); }); });
      peer.on('error',function(e){ if(!dead&&cb.error) cb.error(kindOf(e)); }); },
      function(){ if(cb.error) cb.error('lib'); });
    return {send:function(o){ if(c) c.send(o); }, close:function(){ dead=true; try{ if(peer) peer.destroy(); }catch(e){} }}; }
};
/* audience reactions: a phone sends {t:'rx', e:'<one of RX>'}, the presenter tells the phones {t:'rx', on:true|false} (also inside 'hi'). RX_RATE: most a phone may send per second, RX_FLOAT: most floating at once */
var RX=['\uD83D\uDC4D','\uD83D\uDC4F','\uD83D\uDE02','\uD83D\uDE2E','\u2764\uFE0F','\uD83D\uDD25'];
/* audience questions: a phone sends {t:'qa', q:'<text>'}, the presenter tells the phones {t:'qa', on:true|false} (also inside 'hi'). QA_LEN: longest text, QA_GAP: least ms between two from one phone, QA_MAX: most per phone per session */
root.FFLQ={makeCode:makeCode, cleanCode:cleanCode, net:function(){ return root.FFLQ_TRANSPORT||peerNet; }, MAX:40, RX:RX, RX_RATE:4, RX_FLOAT:40, QA_LEN:80, QA_GAP:10000, QA_MAX:5};
})(typeof window!=='undefined'?window:globalThis);
