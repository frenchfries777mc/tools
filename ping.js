/* Frenchfries777: Tools 접속 신호 (로그인한 사람만, 45초마다). 허브 접속 신호(ff_hub_ping)로 보내서 허브에 합산돼요. */
(function(){
'use strict';
var URL_='https://kebsbuvuutilitwlvxzv.supabase.co', KEY='sb_publishable_4Egu0zm3p6cxWGvP_-GlIw_mlCpO1Nf', SKEY='sb-kebsbuvuutilitwlvxzv-auth-token';
if(!window.fetch) return;
var off=false;
function token(){ try{ var s=JSON.parse(localStorage.getItem(SKEY)||'null'); if(s&&s.access_token&&(!s.expires_at||s.expires_at*1000>Date.now())) return s.access_token; }catch(e){} return null; }
function call(name,body,keep){ var t=token(); if(!t) return Promise.resolve(); return fetch(URL_+'/rest/v1/rpc/'+name,{method:'POST',keepalive:!!keep,headers:{'apikey':KEY,'Authorization':'Bearer '+t,'Content-Type':'application/json'},body:body}).catch(function(){}); }
function ping(){ if(off) return; call('ff_hub_ping','{}').then(function(r){ if(r&&r.status===404) off=true; }); }
ping(); setInterval(ping,45000);
/* 손님(로그인 전)과 세션 갱신까지 챙기는 공용 접속 신호 */
try{ if(!window.FFPresence){ var ps=document.createElement('script'); ps.src='https://frenchfries777mc.github.io/games/ff-presence.js?v=20261028a'; ps.async=true; document.head.appendChild(ps); } }catch(e){}
document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') ping(); });
window.addEventListener('pagehide',function(){ if(!off) call('ff_leave','{}',true); });
})();
