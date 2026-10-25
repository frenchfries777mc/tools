/* Frenchfries777: Tools 접속 신호 (로그인한 사람만, 60초마다). 서버에 ff_site_ping 이 없으면 조용히 멈춰요. */
(function(){
'use strict';
var URL_='https://kebsbuvuutilitwlvxzv.supabase.co', KEY='sb_publishable_4Egu0zm3p6cxWGvP_-GlIw_mlCpO1Nf', SKEY='sb-kebsbuvuutilitwlvxzv-auth-token';
if(!window.fetch) return;
var off=false;
function token(){ try{ var s=JSON.parse(localStorage.getItem(SKEY)||'null'); if(s&&s.access_token&&(!s.expires_at||s.expires_at*1000>Date.now())) return s.access_token; }catch(e){} return null; }
function call(name,body,keep){ var t=token(); if(!t) return Promise.resolve(); return fetch(URL_+'/rest/v1/rpc/'+name,{method:'POST',keepalive:!!keep,headers:{'apikey':KEY,'Authorization':'Bearer '+t,'Content-Type':'application/json'},body:body}).catch(function(){}); }
function ping(){ if(off||document.visibilityState==='hidden') return; call('ff_site_ping','{"p_site":"tools"}').then(function(r){ if(r&&r.status===404) off=true; }); }
ping(); setInterval(ping,60000);
document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') ping(); });
window.addEventListener('pagehide',function(){ if(!off) call('ff_leave','{}',true); });
})();
