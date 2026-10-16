/* Frenchfries777 Tools: shared AI connection.
   Each person pastes their own API key (Claude, Gemini or OpenAI). The key stays in this browser
   (localStorage 'ffai.v1') and goes straight to that company's API, never to this site.
   API:  FFAI.ready()            -> true when a key is saved
         FFAI.settings(onSaved)  -> opens the settings dialog
         FFAI.ask({system, prompt, json, maxTokens}) -> Promise<string> (opens settings first when no key)
         FFAI.parseJSON(text)    -> JSON from a reply, tolerating ``` fences
   Load after i18n.js. New tools should reuse this file instead of adding their own AI code. */
(function(){
'use strict';
var T=FFT.T;
var LS='ffai.v1';
var BASE=(function(){ var s=document.currentScript&&document.currentScript.src; return s?s.replace(/[^\/]*$/,''):'../'; })();
var PROVIDERS={
  claude:{name:'Claude', models:[['claude-opus-5-5','Claude Opus 5.5'],['claude-sonnet-5-5','Claude Sonnet 5.5'],['claude-haiku-5-5','Claude Haiku 5.5']], keyUrl:'https://console.anthropic.com/settings/keys', ph:'sk-ant-...'},
  gemini:{name:'Gemini', models:[['gemini-2.5-flash','Gemini 2.5 Flash'],['gemini-2.5-pro','Gemini 2.5 Pro']], keyUrl:'https://aistudio.google.com/apikey', ph:'AIza...', free:true},
  openai:{name:'OpenAI', models:[['gpt-4.1-mini','GPT-4.1 mini'],['gpt-4.1','GPT-4.1']], keyUrl:'https://platform.openai.com/api-keys', ph:'sk-...'}
};

FFT.add({
'AI 설정':['AI settings','Ajustes de IA','Réglages IA','KI-Einstellungen','AI設定'],
'AI 회사':['AI provider','Proveedor de IA','Fournisseur IA','KI-Anbieter','AI会社'],
'API 키':['API key','Clave API','Clé API','API-Schlüssel','APIキー'],
'모델':['Model','Modelo','Modèle','Modell','モデル'],
'키 받는 곳':['Get a key','Obtener una clave','Obtenir une clé','Schlüssel holen','キーを取得'],
'무료 키 가능':['free keys available','claves gratis disponibles','clés gratuites possibles','kostenlose Schlüssel möglich','無料キーあり'],
'키는 이 브라우저에만 저장되고, 이 사이트가 아니라 고른 AI 회사로만 바로 보내져요. 공용 컴퓨터에서는 다 쓴 뒤 키 지우기를 눌러 주세요.':['The key is stored only in this browser and goes straight to the AI provider you chose, never to this site. On a shared computer, press Remove key when you are done.','La clave solo se guarda en este navegador y va directo al proveedor elegido, nunca a este sitio. En un equipo compartido, pulsa Quitar clave al terminar.','La clé reste dans ce navigateur et part directement chez le fournisseur choisi, jamais vers ce site. Sur un ordinateur partagé, appuie sur Supprimer la clé à la fin.','Der Schlüssel bleibt in diesem Browser und geht direkt an den gewählten Anbieter, nie an diese Seite. Auf geteilten Geräten danach „Schlüssel löschen“ drücken.','キーはこのブラウザだけに保存され、このサイトではなく選んだAI会社へ直接送られます。共用PCでは使い終わったらキーを削除してください。'],
'연결 확인':['Test','Probar','Tester','Testen','接続テスト'],
'저장':['Save','Guardar','Enregistrer','Speichern','保存'],
'키 지우기':['Remove key','Quitar clave','Supprimer la clé','Schlüssel löschen','キーを削除'],
'확인 중…':['Checking…','Comprobando…','Vérification…','Prüfe…','確認中…'],
'연결됐어요':['Connected','Conectado','Connecté','Verbunden','接続できました'],
'키를 넣어 주세요':['Enter a key','Escribe una clave','Saisis une clé','Schlüssel eingeben','キーを入力してください'],
'키가 맞지 않아요':['The key was rejected','La clave fue rechazada','La clé a été refusée','Schlüssel abgelehnt','キーが正しくありません'],
'요청이 너무 많아요. 조금 뒤에 다시 해 주세요':['Too many requests. Try again shortly','Demasiadas solicitudes. Inténtalo luego','Trop de requêtes. Réessaie plus tard','Zu viele Anfragen. Gleich nochmal versuchen','リクエストが多すぎます。少し後で試してください'],
'AI에 연결하지 못했어요':['Could not reach the AI','No se pudo conectar con la IA','Impossible de joindre l’IA','KI nicht erreichbar','AIに接続できませんでした'],
'AI가 이 요청에는 답하지 않았어요':['The AI declined this request','La IA rechazó esta solicitud','L’IA a refusé cette demande','Die KI hat abgelehnt','AIがこのリクエストに応答しませんでした'],
'AI를 쓰려면 먼저 API 키를 넣어 주세요':['Add an API key first to use AI','Añade primero una clave API','Ajoute d’abord une clé API','Zuerst einen API-Schlüssel eintragen','AIを使うには先にAPIキーを入れてください'],
'보이기':['Show','Mostrar','Afficher','Zeigen','表示'],
'닫기':['Close','Cerrar','Fermer','Schließen','閉じる']
});

function load(){ var o=null; try{ o=JSON.parse(localStorage.getItem(LS)||'null'); }catch(e){} o=o&&typeof o==='object'?o:{}; o.keys=o.keys||{}; o.models=o.models||{}; if(!PROVIDERS[o.provider]) o.provider='gemini'; return o; }
function store(o){ try{ localStorage.setItem(LS,JSON.stringify(o)); }catch(e){} }
function cfg(){ var o=load(), p=o.provider; return {provider:p, key:o.keys[p]||'', model:o.models[p]||PROVIDERS[p].models[0][0]}; }
function ready(){ return !!cfg().key; }

/* ---------- requests ---------- */
function AIError(msg,kind){ var e=new Error(msg); e.kind=kind; return e; }
var sdkP=null;
function sdk(){ // the official Anthropic SDK, bundled into lib/ and loaded only when Claude is used
  if(window.AnthropicSDK) return Promise.resolve(window.AnthropicSDK);
  if(!sdkP) sdkP=new Promise(function(res,rej){ var s=document.createElement('script'); s.src=BASE+'lib/anthropic-sdk.min.js';
    s.onload=function(){ window.AnthropicSDK?res(window.AnthropicSDK):rej(AIError(T('AI에 연결하지 못했어요'),'net')); };
    s.onerror=function(){ sdkP=null; rej(AIError(T('AI에 연결하지 못했어요'),'net')); }; document.head.appendChild(s); });
  return sdkP;
}
function askClaude(c,o){
  return sdk().then(function(Anthropic){
    var client=new Anthropic({apiKey:c.key, dangerouslyAllowBrowser:true});
    var req={model:c.model, max_tokens:o.maxTokens||16000, system:o.system||undefined, messages:[{role:'user',content:o.prompt}]};
    if(c.model==='claude-opus-5-5'||c.model==='claude-sonnet-5-5'){ req.betas=['server-side-fallback-2026-07-01']; req.fallbacks='default'; }
    var call=req.betas?client.beta.messages.create(req):client.messages.create(req);
    return call.then(function(r){
      if(r.stop_reason==='refusal') throw AIError(T('AI가 이 요청에는 답하지 않았어요'),'refusal');
      return r.content.filter(function(b){ return b.type==='text'; }).map(function(b){ return b.text; }).join('');
    },function(err){
      if(err instanceof Anthropic.AuthenticationError||err instanceof Anthropic.PermissionDeniedError) throw AIError(T('키가 맞지 않아요'),'auth');
      if(err instanceof Anthropic.RateLimitError) throw AIError(T('요청이 너무 많아요. 조금 뒤에 다시 해 주세요'),'rate');
      if(err instanceof Anthropic.APIError&&err.status) throw AIError(T('AI에 연결하지 못했어요')+' ('+err.status+')','api');
      throw AIError(T('AI에 연결하지 못했어요'),'net');
    });
  });
}
function httpErr(res){ return res.text().then(function(t){ var k=res.status===401||res.status===403||(res.status===400&&/API[_ ]?key/i.test(t))?'auth':res.status===429?'rate':'api';
  throw AIError(k==='auth'?T('키가 맞지 않아요'):k==='rate'?T('요청이 너무 많아요. 조금 뒤에 다시 해 주세요'):T('AI에 연결하지 못했어요')+' ('+res.status+')',k); }); }
function askGemini(c,o){
  var body={contents:[{role:'user',parts:[{text:o.prompt}]}], generationConfig:{maxOutputTokens:o.maxTokens||16000}};
  if(o.system) body.systemInstruction={parts:[{text:o.system}]};
  if(o.json) body.generationConfig.responseMimeType='application/json';
  return fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(c.model)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':c.key},body:JSON.stringify(body)})
    .then(function(res){ if(!res.ok) return httpErr(res); return res.json(); },function(){ throw AIError(T('AI에 연결하지 못했어요'),'net'); })
    .then(function(j){ var cand=j.candidates&&j.candidates[0]; if(!cand||!cand.content){ throw AIError(T('AI가 이 요청에는 답하지 않았어요'),'refusal'); }
      return (cand.content.parts||[]).map(function(p){ return p.text||''; }).join(''); });
}
function askOpenAI(c,o){
  var body={model:c.model, max_completion_tokens:o.maxTokens||16000, messages:(o.system?[{role:'system',content:o.system}]:[]).concat([{role:'user',content:o.prompt}])};
  if(o.json) body.response_format={type:'json_object'};
  return fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+c.key},body:JSON.stringify(body)})
    .then(function(res){ if(!res.ok) return httpErr(res); return res.json(); },function(){ throw AIError(T('AI에 연결하지 못했어요'),'net'); })
    .then(function(j){ var m=j.choices&&j.choices[0]&&j.choices[0].message; if(!m||m.refusal) throw AIError(T('AI가 이 요청에는 답하지 않았어요'),'refusal'); return m.content||''; });
}
function send(c,o){ return c.provider==='claude'?askClaude(c,o):c.provider==='openai'?askOpenAI(c,o):askGemini(c,o); }
function ask(o){
  var c=cfg();
  if(!c.key) return new Promise(function(res,rej){ settings(function(){ ask(o).then(res,rej); },function(){ rej(AIError(T('AI를 쓰려면 먼저 API 키를 넣어 주세요'),'nokey')); }); });
  return send(c,o);
}
function parseJSON(t){
  t=String(t||'').trim(); var m=/```(?:json)?\s*([\s\S]*?)```/.exec(t); if(m) t=m[1].trim();
  try{ return JSON.parse(t); }catch(e){}
  var a=t.search(/[\[{]/), b=Math.max(t.lastIndexOf('}'),t.lastIndexOf(']')); if(a>=0&&b>a) return JSON.parse(t.slice(a,b+1));
  throw new Error('JSON');
}

/* ---------- settings dialog ---------- */
var css='.ffai-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:200;display:none;align-items:center;justify-content:center;padding:14px;font-family:inherit}'+
'.ffai-ov.open{display:flex}.ffai-d{background:var(--panel,#10131b);color:var(--text,#eef0f5);border:1px solid var(--line,#222837);border-radius:16px;width:min(460px,100%);max-height:92vh;overflow:auto;box-shadow:0 30px 80px rgba(0,0,0,.6)}'+
'.ffai-h{display:flex;align-items:center;padding:12px 12px 12px 18px;border-bottom:1px solid var(--line,#222837)}.ffai-h h3{margin:0;font-size:16px;flex:1}'+
'.ffai-x{width:36px;height:36px;border:0;background:transparent;color:var(--dim,#8a93a6);font-size:24px;cursor:pointer;border-radius:8px}'+
'.ffai-b{padding:14px 18px;display:flex;flex-direction:column;gap:6px}.ffai-b label{color:var(--dim,#8a93a6);font-size:13px;margin-top:6px}'+
'.ffai-seg{display:flex;gap:6px}.ffai-seg button{flex:1;height:40px;border-radius:10px;border:1px solid var(--line,#222837);background:var(--panel2,#151925);color:inherit;cursor:pointer;font:inherit;font-weight:700}'+
'.ffai-seg button.on{border-color:var(--fry,#ffc93c);color:var(--fry,#ffc93c);background:#2a2410}'+
'.ffai-row{display:flex;gap:6px}.ffai-b input,.ffai-b select{flex:1;min-width:0;height:40px;background:var(--bg,#08090d);color:inherit;border:1px solid var(--line,#222837);border-radius:9px;padding:0 10px;font:inherit}'+
'.ffai-sm{height:40px;padding:0 12px;border-radius:9px;border:1px solid var(--line,#222837);background:var(--panel2,#151925);color:inherit;cursor:pointer;font:inherit;white-space:nowrap}'+
'.ffai-link{color:var(--fry,#ffc93c);font-size:13px;text-decoration:none}.ffai-free{color:#3fe08f;font-size:12px;margin-left:6px}'+
'.ffai-note{color:var(--dim,#8a93a6);font-size:12.5px;line-height:1.55;margin:8px 0 0}.ffai-msg{min-height:20px;font-size:13px}.ffai-msg.ok{color:#3fe08f}.ffai-msg.bad{color:#ff7b7b}'+
'.ffai-acts{display:flex;gap:8px;justify-content:flex-end;padding:12px 18px;border-top:1px solid var(--line,#222837);flex-wrap:wrap}'+
'.ffai-pri{height:38px;padding:0 16px;border-radius:9px;border:0;background:linear-gradient(90deg,var(--fry,#ffc93c),var(--fry2,#ff8a3d));color:#1c1405;font:inherit;font-weight:700;cursor:pointer}'+
'.ffai-dang{color:#ff7b7b}';
var ov=null, onOk=null, onCancel=null, cur=null;
function el(h){ var d=document.createElement('div'); d.innerHTML=h; return d.firstChild; }
function build(){
  var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  ov=el('<div class="ffai-ov" data-notr><div class="ffai-d" role="dialog" aria-modal="true"><div class="ffai-h"><h3></h3><button class="ffai-x" aria-label="">×</button></div>'+
    '<div class="ffai-b"><label class="l-p"></label><div class="ffai-seg"></div>'+
    '<label class="l-k"></label><div class="ffai-row"><input type="password" class="k" autocomplete="off" spellcheck="false"><button class="ffai-sm show"></button></div>'+
    '<div><a class="ffai-link" target="_blank" rel="noopener"></a><span class="ffai-free"></span></div>'+
    '<label class="l-m"></label><select class="m"></select>'+
    '<p class="ffai-note"></p><div class="ffai-msg"></div></div>'+
    '<div class="ffai-acts"><button class="ffai-sm ffai-dang del"></button><button class="ffai-sm test"></button><button class="ffai-pri save"></button></div></div></div>');
  document.body.appendChild(ov);
  var q=function(s){ return ov.querySelector(s); };
  q('h3').textContent=T('AI 설정'); q('.ffai-x').setAttribute('aria-label',T('닫기')); q('.l-p').textContent=T('AI 회사'); q('.l-k').textContent=T('API 키'); q('.l-m').textContent=T('모델');
  q('.show').textContent=T('보이기'); q('.ffai-note').textContent=T('키는 이 브라우저에만 저장되고, 이 사이트가 아니라 고른 AI 회사로만 바로 보내져요. 공용 컴퓨터에서는 다 쓴 뒤 키 지우기를 눌러 주세요.');
  q('.del').textContent=T('키 지우기'); q('.test').textContent=T('연결 확인'); q('.save').textContent=T('저장');
  Object.keys(PROVIDERS).forEach(function(p){ var b=document.createElement('button'); b.textContent=PROVIDERS[p].name; b.dataset.p=p; b.onclick=function(){ keep(); cur.provider=p; fill(); }; q('.ffai-seg').appendChild(b); });
  q('.show').onclick=function(){ var k=q('.k'); k.type=k.type==='password'?'text':'password'; };
  q('.ffai-x').onclick=cancel; ov.addEventListener('click',function(e){ if(e.target===ov) cancel(); });
  q('.del').onclick=function(){ delete cur.keys[cur.provider]; q('.k').value=''; store(cur); msg('',''); };
  q('.test').onclick=function(){ keep(); var c={provider:cur.provider,key:cur.keys[cur.provider]||'',model:cur.models[cur.provider]};
    if(!c.key) return msg(T('키를 넣어 주세요'),'bad'); msg(T('확인 중…'),'');
    send(c,{prompt:'Reply with OK.',maxTokens:16}).then(function(){ msg(T('연결됐어요'),'ok'); },function(e){ msg(e.message,'bad'); }); };
  q('.save').onclick=function(){ keep(); if(!cur.keys[cur.provider]) return msg(T('키를 넣어 주세요'),'bad'); store(cur); close(); var f=onOk; onOk=onCancel=null; if(f) f(); };
}
function msg(t,k){ var m=ov.querySelector('.ffai-msg'); m.textContent=t; m.className='ffai-msg'+(k?' '+k:''); }
function keep(){ var k=ov.querySelector('.k').value.trim(), m=ov.querySelector('.m').value; if(k) cur.keys[cur.provider]=k; else delete cur.keys[cur.provider]; cur.models[cur.provider]=m; }
function fill(){
  var p=PROVIDERS[cur.provider], q=function(s){ return ov.querySelector(s); };
  ov.querySelectorAll('.ffai-seg button').forEach(function(b){ b.classList.toggle('on',b.dataset.p===cur.provider); });
  q('.k').value=cur.keys[cur.provider]||''; q('.k').placeholder=p.ph; q('.k').type='password';
  var a=q('.ffai-link'); a.href=p.keyUrl; a.textContent=T('키 받는 곳')+' ↗'; q('.ffai-free').textContent=p.free?'· '+T('무료 키 가능'):'';
  q('.m').innerHTML=p.models.map(function(m){ return '<option value="'+m[0]+'">'+m[1]+'</option>'; }).join(''); q('.m').value=cur.models[cur.provider]||p.models[0][0];
  msg('','');
}
function close(){ ov.classList.remove('open'); }
function cancel(){ close(); var f=onCancel; onOk=onCancel=null; if(f) f(); }
function settings(ok,no){ if(!ov) build(); cur=load(); onOk=ok||null; onCancel=no||null; fill(); ov.classList.add('open'); setTimeout(function(){ var k=ov.querySelector('.k'); if(!k.value) k.focus(); },50); }

window.FFAI={ready:ready, settings:settings, ask:ask, parseJSON:parseJSON, config:cfg};
})();
