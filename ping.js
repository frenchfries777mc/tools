/* Frenchfries777: Tools 접속 신호. 신호는 공용 ff-presence.js 가 보내요 (로그인한 사람은 'tools' 사이트로, 손님은 손님으로 허브 "지금 접속 중"에 따로 잡혀요). */
(function(){
'use strict';
try{ if(!window.FFPresence){ var ps=document.createElement('script'); ps.src='https://frenchfries777mc.github.io/games/ff-presence.js?v=20261028c'; ps.async=true; (document.head||document.documentElement).appendChild(ps); } }catch(e){}
})();
