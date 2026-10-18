/* Frenchfries777 Tools: shared AI connection.
   Default is the built-in AI ("자체 AI"): an open model (Qwen3) that runs inside the browser with WebGPU
   through WebLLM (lib/web-llm.min.js, loaded only when used). It is downloaded once after the person agrees,
   then works with no key. Optionally each person pastes their own API key (Claude, Gemini or OpenAI);
   the key stays in this browser (localStorage 'ffai.v1') and goes straight to that company, never to this site.
   API:  FFAI.ready()            -> true when the chosen AI can answer without asking first
         FFAI.isLocal()          -> true when the built-in AI is chosen (smaller context: send shorter prompts)
         FFAI.isTuned()          -> true for the Tools-trained built-in models: send the short prompts from ai-prompts.js (FFP)
         FFAI.settings(onSaved)  -> opens the settings dialog
         FFAI.ask({system, prompt, json, maxTokens}) -> Promise<string> (opens settings first when no key)
         FFAI.ask({…, onText}) streams the answer as it is written; FFAI.stop() stops it
         FFAI.ask({…, facts:true}) for free answers: our own models also get who they are and what the developer taught them (teach/)
         FFAI.ask({…, prose:true, question}) for plain-text answers: the built-in AI samples more freely (temperature 0.7, top_p 0.8,
                                 presence_penalty 1), stops at about 400 tokens on a full sentence, cuts a phrase repeated 3 times,
                                 and for a Korean question cuts Chinese characters and asks once more in Korean only.
                                 Leave it off for JSON, formulas, code and block XML (calm settings, the XML loop guard)
         FFAI.parseJSON(text)    -> JSON from a reply, tolerating ``` fences
   Load after i18n.js. New tools should reuse this file instead of adding their own AI code. */
(function(){
'use strict';
var T=FFT.T, F=FFT.F;
var LS='ffai.v1';
var BASE=(function(){ var s=document.currentScript&&document.currentScript.src; return s?s.replace(/[^\/]*$/,''):'../'; })();
var PROVIDERS={
  local:{name:'자체 AI', local:true, models:[['FF-Tools-1.7B','FF777 1.4 tarius','약 1GB','가장 가볍고 빨라요. 태블릿이나 오래된 컴퓨터에서도 돌아가요.'],['FF-Tools-4B','FF777 1.4 lectus','약 2.5GB','속도와 똑똑함이 균형 잡힌 기본 모델이에요.'],['FF-Tools-8B','FF777 1.4 premus','약 5GB','가장 똑똑해요. 그래픽카드 메모리 8GB 이상인 컴퓨터용이에요.']]},
  claude:{name:'Claude', models:[['claude-opus-5-5','Claude Opus 5.5','','가장 똑똑한 모델이에요. 어려운 일에 알맞고 답이 조금 느려요.'],['claude-sonnet-5-5','Claude Sonnet 5.5','','속도와 똑똑함이 균형 잡힌 모델이에요.'],['claude-haiku-5-5','Claude Haiku 5.5','','가장 빠른 모델이에요. 간단한 일에 알맞아요.']], keyUrl:'https://console.anthropic.com/settings/keys', ph:'sk-ant-...'},
  gemini:{name:'Gemini', models:[['gemini-2.5-flash','Gemini 2.5 Flash','','빠르고 가벼운 모델이에요. 무료 키로도 쓸 수 있어요.'],['gemini-2.5-pro','Gemini 2.5 Pro','','더 똑똑한 모델이에요. 답이 조금 느려요.']], keyUrl:'https://aistudio.google.com/apikey', ph:'AIza...', free:true},
  openai:{name:'OpenAI', models:[['gpt-4.1-mini','GPT-4.1 mini','','빠르고 가벼운 모델이에요.'],['gpt-4.1','GPT-4.1','','더 똑똑한 모델이에요.']], keyUrl:'https://platform.openai.com/api-keys', ph:'sk-...'}
};
/* the Tools-trained models (train/colab.ipynb): same Qwen3 model code, our own weights on Hugging Face */
var HF='https://huggingface.co/Frenchfries777/';
var TUNED={'FF-Tools-1.7B':{base:'Qwen3-1.7B', about:'FF777 1.4 tarius: Tools(블록 HTML, Fry Sheet)에 맞게 학습한 가벼운 AI예요. Qwen3 1.7B(Apache 2.0)를 바탕으로 만들었어요.'},
           'FF-Tools-4B':{base:'Qwen3-4B', about:'FF777 1.4 lectus: Tools(블록 HTML, Fry Sheet)에 맞게 학습한 똑똑한 AI예요. Qwen3 4B(Apache 2.0)를 바탕으로 만들었어요.'},
           'FF-Tools-8B':{base:'Qwen3-8B', ctx:4096, about:'FF777 1.4 premus: Tools(블록 HTML, Fry Sheet)에 맞게 학습한 가장 똑똑한 AI예요. Qwen3 8B(Apache 2.0)를 바탕으로 만들었어요. 그래픽카드 메모리(VRAM) 8GB 이상인 컴퓨터용이에요.'}};

function modelLabel(id){ var m=PROVIDERS.local.models.filter(function(x){ return x[0]===id; })[0]; return m&&TUNED[id]?m[1]:id; }
FFT.add({
'FF777 1.4 tarius: Tools(블록 HTML, Fry Sheet)에 맞게 학습한 가벼운 AI예요. Qwen3 1.7B(Apache 2.0)를 바탕으로 만들었어요.':['FF777 1.4 tarius: a light AI trained for Tools (Block HTML, Fry Sheet). Built on Qwen3 1.7B (Apache 2.0).','FF777 1.4 tarius: una IA ligera entrenada para Tools (Block HTML, Fry Sheet). Basada en Qwen3 1.7B (Apache 2.0).','FF777 1.4 tarius : une IA légère entraînée pour Tools (Block HTML, Fry Sheet). Basée sur Qwen3 1.7B (Apache 2.0).','FF777 1.4 tarius: eine leichte KI, trainiert für Tools (Block HTML, Fry Sheet). Basiert auf Qwen3 1.7B (Apache 2.0).','FF777 1.4 tarius：Tools（Block HTML、Fry Sheet）向けに学習した軽いAIです。Qwen3 1.7B（Apache 2.0）をもとに作りました。'],
'FF777 1.4 lectus: Tools(블록 HTML, Fry Sheet)에 맞게 학습한 똑똑한 AI예요. Qwen3 4B(Apache 2.0)를 바탕으로 만들었어요.':['FF777 1.4 lectus: a smart AI trained for Tools (Block HTML, Fry Sheet). Built on Qwen3 4B (Apache 2.0).','FF777 1.4 lectus: una IA lista entrenada para Tools (Block HTML, Fry Sheet). Basada en Qwen3 4B (Apache 2.0).','FF777 1.4 lectus : une IA performante entraînée pour Tools (Block HTML, Fry Sheet). Basée sur Qwen3 4B (Apache 2.0).','FF777 1.4 lectus: eine kluge KI, trainiert für Tools (Block HTML, Fry Sheet). Basiert auf Qwen3 4B (Apache 2.0).','FF777 1.4 lectus：Tools（Block HTML、Fry Sheet）向けに学習した賢いAIです。Qwen3 4B（Apache 2.0）をもとに作りました。'],
'FF777 1.4 premus: Tools(블록 HTML, Fry Sheet)에 맞게 학습한 가장 똑똑한 AI예요. Qwen3 8B(Apache 2.0)를 바탕으로 만들었어요. 그래픽카드 메모리(VRAM) 8GB 이상인 컴퓨터용이에요.':['FF777 1.4 premus: the smartest AI, trained for Tools (Block HTML, Fry Sheet). Built on Qwen3 8B (Apache 2.0). For computers with 8 GB or more of graphics memory (VRAM).','FF777 1.4 premus: la IA más lista, entrenada para Tools (Block HTML, Fry Sheet). Basada en Qwen3 8B (Apache 2.0). Para ordenadores con 8 GB o más de memoria gráfica (VRAM).','FF777 1.4 premus : l’IA la plus performante, entraînée pour Tools (Block HTML, Fry Sheet). Basée sur Qwen3 8B (Apache 2.0). Pour les ordinateurs avec 8 Go ou plus de mémoire graphique (VRAM).','FF777 1.4 premus: die klügste KI, trainiert für Tools (Block HTML, Fry Sheet). Basiert auf Qwen3 8B (Apache 2.0). Für Computer mit mindestens 8 GB Grafikspeicher (VRAM).','FF777 1.4 premus: Tools(ブロックHTML、Fry Sheet)向けに学習した最も賢いAIです。Qwen3 8B(Apache 2.0)をもとに作りました。グラフィックメモリ(VRAM)8GB以上のパソコン向けです。'],
'준비 중':['coming soon','próximamente','bientôt','bald verfügbar','準備中'],
'아직 준비 중인 모델이에요':['This model is not ready yet','Este modelo aún no está listo','Ce modèle n’est pas encore prêt','Dieses Modell ist noch nicht bereit','このモデルはまだ準備中です'],
'멈췄어요':['Stopped','Detenido','Arrêté','Gestoppt','止めました'],
'같은 말을 반복해서 멈췄어요. 다시 보내 보세요':['It kept repeating itself, so it was stopped. Try again','Se repetía sin parar y se detuvo. Inténtalo de nuevo','Il se répétait, donc il a été arrêté. Réessayez','Es wiederholte sich und wurde gestoppt. Versuche es noch einmal','同じことを繰り返したので止めました。もう一度送ってください'],
'자체 AI':['Built-in AI','IA integrada','IA intégrée','Eingebaute KI','内蔵AI'],
'기본 · 약 1GB':['Standard · about 1 GB','Estándar · unos 1 GB','Standard · environ 1 Go','Standard · ca. 1 GB','標準 · 約1GB'],
'가벼움 · 약 0.5GB':['Light · about 0.5 GB','Ligero · unos 0,5 GB','Léger · environ 0,5 Go','Leicht · ca. 0,5 GB','軽量 · 約0.5GB'],
'똑똑함 · 약 2.5GB':['Smart · about 2.5 GB','Listo · unos 2,5 GB','Malin · environ 2,5 Go','Klug · ca. 2,5 GB','高性能 · 約2.5GB'],
'자체 AI를 불러오지 못했어요':['Could not load the built-in AI','No se pudo cargar la IA integrada','Impossible de charger l’IA intégrée','Eingebaute KI konnte nicht laden','内蔵AIを読み込めませんでした'],
'이 기기나 브라우저에서는 자체 AI를 쓸 수 없어요. AI 설정에서 API 키를 넣어 주세요':['The built-in AI does not run on this device or browser. Add an API key in AI settings','La IA integrada no funciona en este dispositivo o navegador. Añade una clave API en Ajustes de IA','L’IA intégrée ne marche pas sur cet appareil ou navigateur. Ajoute une clé API dans les réglages IA','Die eingebaute KI läuft auf diesem Gerät/Browser nicht. Trage in den KI-Einstellungen einen API-Schlüssel ein','この端末やブラウザでは内蔵AIを使えません。AI設定でAPIキーを入れてください'],
'{0} 준비 중…':['Getting {0} ready…','Preparando {0}…','Préparation de {0}…','{0} wird vorbereitet…','{0}を準備中…'],
'{0} 준비 중… {1}%':['Getting {0} ready… {1}%','Preparando {0}… {1}%','Préparation de {0}… {1} %','{0} wird vorbereitet… {1}%','{0}を準備中… {1}%'],
'이 기기에서는 메모리가 부족해요. 더 가벼운 모델을 골라 보세요':['Not enough memory on this device. Pick a lighter model','No hay memoria suficiente. Elige un modelo más ligero','Mémoire insuffisante. Choisis un modèle plus léger','Zu wenig Speicher. Wähle ein leichteres Modell','メモリが足りません。軽いモデルを選んでください'],
'자체 AI에게는 너무 긴 요청이에요. 고를 칸을 줄이거나 API 키를 써 보세요':['Too long for the built-in AI. Select fewer cells or use an API key','Demasiado largo para la IA integrada. Elige menos celdas o usa una clave API','Trop long pour l’IA intégrée. Sélectionne moins de cellules ou utilise une clé API','Zu lang für die eingebaute KI. Weniger Zellen wählen oder API-Schlüssel nutzen','内蔵AIには長すぎます。選ぶセルを減らすかAPIキーを使ってください'],
'자체 AI가 답하지 못했어요':['The built-in AI could not answer','La IA integrada no pudo responder','L’IA intégrée n’a pas pu répondre','Die eingebaute KI konnte nicht antworten','内蔵AIが答えられませんでした'],
'자체 AI를 쓰려면 AI 설정에서 저장을 눌러 주세요':['To use the built-in AI, press Save in AI settings','Para usar la IA integrada, pulsa Guardar en Ajustes de IA','Pour utiliser l’IA intégrée, appuie sur Enregistrer dans les réglages IA','Für die eingebaute KI in den KI-Einstellungen Speichern drücken','内蔵AIを使うにはAI設定で保存を押してください'],
'지우는 중…':['Removing…','Eliminando…','Suppression…','Wird gelöscht…','削除中…'],
'이 기기에서 모델을 지웠어요':['Model removed from this device','Modelo eliminado de este dispositivo','Modèle supprimé de cet appareil','Modell von diesem Gerät gelöscht','この端末からモデルを削除しました'],
'자체 AI가 준비됐어요':['The built-in AI is ready','La IA integrada está lista','L’IA intégrée est prête','Die eingebaute KI ist bereit','内蔵AIの準備ができました'],
'자체 AI는 이 기기 안에서 돌아가요. 처음 한 번 모델을 받아 저장하고, 그 뒤로는 키 없이 쓸 수 있어요. 큰 AI보다는 덜 똑똑해요. 더 잘하게 하려면 다른 회사를 골라 API 키를 넣으세요.':['The built-in AI runs on this device. It downloads the model once, then works with no key. It is less smart than the big AIs; for better answers pick another provider and add an API key.','La IA integrada funciona en este dispositivo. Descarga el modelo una vez y luego funciona sin clave. Es menos lista que las grandes; para mejores respuestas elige otro proveedor y añade una clave API.','L’IA intégrée tourne sur cet appareil. Elle télécharge le modèle une fois, puis marche sans clé. Elle est moins forte que les grandes IA ; pour de meilleures réponses, choisis un autre fournisseur avec une clé API.','Die eingebaute KI läuft auf diesem Gerät. Sie lädt das Modell einmal und braucht dann keinen Schlüssel. Sie ist schwächer als große KIs; für bessere Antworten einen anderen Anbieter mit API-Schlüssel wählen.','内蔵AIはこの端末の中で動きます。最初に一度モデルを保存すれば、あとはキーなしで使えます。大きなAIほど賢くないので、より良い答えには他の会社を選んでAPIキーを入れてください。'],
'모델 지우기':['Remove model','Eliminar modelo','Supprimer le modèle','Modell löschen','モデルを削除'],
'지금 받아 두기':['Download now','Descargar ahora','Télécharger','Jetzt laden','今ダウンロード'],
'이 모델은 쓸 준비가 됐어요':['This model is ready to use','Este modelo está listo','Ce modèle est prêt','Dieses Modell ist bereit','このモデルは使えます'],
'저장하면 처음 쓸 때 모델을 받아요':['After saving, the model downloads the first time you use it','Tras guardar, el modelo se descarga la primera vez que lo uses','Après l’enregistrement, le modèle se télécharge à la première utilisation','Nach dem Speichern wird das Modell beim ersten Gebrauch geladen','保存すると最初に使うときにモデルをダウンロードします'],
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
'닫기':['Close','Cerrar','Fermer','Schließen','閉じる'],
'열 때 미리 불러오기':['Preload when a page opens','Precargar al abrir la página','Précharger à l’ouverture de la page','Beim Öffnen der Seite vorladen','ページを開いたときに先に読み込む'],
'받아 둔 모델을 페이지를 열면 바로 뒤에서 올려 둬요. 첫 질문이 빨라지는 대신 그래픽카드 메모리(VRAM)를 계속 써요.':['The saved model loads in the background as soon as a page opens. The first question is faster, but it keeps graphics memory (VRAM) in use.','El modelo guardado se carga en segundo plano al abrir la página. La primera pregunta es más rápida, pero ocupa memoria gráfica (VRAM).','Le modèle enregistré se charge en arrière-plan à l’ouverture de la page. La première question est plus rapide, mais la mémoire graphique (VRAM) reste occupée.','Das gespeicherte Modell lädt beim Öffnen der Seite im Hintergrund. Die erste Frage geht schneller, belegt aber Grafikspeicher (VRAM).','保存したモデルをページを開くとすぐ裏で読み込みます。最初の質問は速くなりますが、グラフィックメモリ(VRAM)を使い続けます。']
});

function load(){ var o=null; try{ o=JSON.parse(localStorage.getItem(LS)||'null'); }catch(e){} o=o&&typeof o==='object'?o:{}; o.keys=o.keys||{}; o.models=o.models||{}; if(!PROVIDERS[o.provider]) o.provider='local'; o.local=o.local||{}; o.preload=!!o.preload; return o; }
function store(o){ try{ localStorage.setItem(LS,JSON.stringify(o)); }catch(e){} }
function cfg(){ var o=load(), p=o.provider; var m=o.models[p]; if(!m||!PROVIDERS[p].models.some(function(x){return x[0]===m;})) m=p==='local'?'FF-Tools-4B':PROVIDERS[p].models[0][0]; return {provider:p, key:o.keys[p]||'', model:m, local:p==='local', localOk:p==='local'&&!!o.local[m]}; }
function ready(){ var c=cfg(); return c.local?c.localOk&&gpuOk!==false:!!c.key; }
function isLocal(){ return cfg().local; }
function isTuned(){ var c=cfg(); return c.local&&/^FF-/.test(c.model); } // the Tools-trained models answer the short prompts in ai-prompts.js

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
/* o.onText(textSoFar) streams the answer as it is written; o.signal (AbortSignal) stops it. */
var stopNow=null;
function claudeErr(Anthropic,err){
  if(err instanceof Anthropic.APIUserAbortError) return AIError(T('멈췄어요'),'stop');
  if(err instanceof Anthropic.AuthenticationError||err instanceof Anthropic.PermissionDeniedError) return AIError(T('키가 맞지 않아요'),'auth');
  if(err instanceof Anthropic.RateLimitError) return AIError(T('요청이 너무 많아요. 조금 뒤에 다시 해 주세요'),'rate');
  if(err instanceof Anthropic.APIError&&err.status) return AIError(T('AI에 연결하지 못했어요')+' ('+err.status+')','api');
  return AIError(T('AI에 연결하지 못했어요'),'net');
}
function askClaude(c,o){
  return sdk().then(function(Anthropic){
    var client=new Anthropic({apiKey:c.key, dangerouslyAllowBrowser:true});
    var req={model:c.model, max_tokens:o.maxTokens||16000, system:o.system||undefined, messages:[{role:'user',content:o.prompt}]};
    if(c.model==='claude-opus-5-5'||c.model==='claude-sonnet-5-5'){ req.betas=['server-side-fallback-2026-07-01']; req.fallbacks='default'; }
    var api=req.betas?client.beta.messages:client.messages, done;
    if(o.onText){ var so='', st=api.stream(req); stopNow=function(){ st.abort(); };
      st.on('text',function(d){ so+=d; o.onText(so); }); done=st.finalMessage(); }
    else done=api.create(req);
    return done.then(function(r){
      if(r.stop_reason==='refusal') throw AIError(T('AI가 이 요청에는 답하지 않았어요'),'refusal');
      return r.content.filter(function(b){ return b.type==='text'; }).map(function(b){ return b.text; }).join('');
    },function(err){ if(err&&err.kind) throw err; throw claudeErr(Anthropic,err); });
  });
}
function httpErr(res){ return res.text().then(function(t){ var k=res.status===401||res.status===403||(res.status===400&&/API[_ ]?key/i.test(t))?'auth':res.status===429?'rate':'api';
  throw AIError(k==='auth'?T('키가 맞지 않아요'):k==='rate'?T('요청이 너무 많아요. 조금 뒤에 다시 해 주세요'):T('AI에 연결하지 못했어요')+' ('+res.status+')',k); }); }
/* reads a server-sent-events body; each "data:" JSON goes to pick(), which returns the new text piece */
function sse(res,pick,o){
  var rd=res.body.getReader(), dec=new TextDecoder(), buf='', out='';
  function step(){ return rd.read().then(function(r){
    if(r.done) return out;
    buf+=dec.decode(r.value,{stream:true}); var lines=buf.split('\n'); buf=lines.pop();
    lines.forEach(function(l){ l=l.trim(); if(l.indexOf('data:')!==0) return; var d=l.slice(5).trim(); if(!d||d==='[DONE]') return;
      var j; try{ j=JSON.parse(d); }catch(e){ return; } var t=pick(j); if(t){ out+=t; o.onText(out); } });
    return step(); }); }
  return step();
}
function post(url,headers,body,o){
  var ac=new AbortController(); if(o.onText) stopNow=function(){ ac.abort(); };
  return fetch(url,{method:'POST',headers:headers,body:JSON.stringify(body),signal:ac.signal})
    .then(function(res){ if(!res.ok) return httpErr(res); return res; },function(e){ throw e&&e.name==='AbortError'?AIError(T('멈췄어요'),'stop'):AIError(T('AI에 연결하지 못했어요'),'net'); });
}
function streamErr(e){ if(e&&e.kind) throw e; throw e&&e.name==='AbortError'?AIError(T('멈췄어요'),'stop'):AIError(T('AI에 연결하지 못했어요'),'net'); }
function askGemini(c,o){
  var body={contents:[{role:'user',parts:[{text:o.prompt}]}], generationConfig:{maxOutputTokens:o.maxTokens||16000}};
  if(o.system) body.systemInstruction={parts:[{text:o.system}]};
  if(o.json) body.generationConfig.responseMimeType='application/json';
  var base='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(c.model), h={'Content-Type':'application/json','x-goog-api-key':c.key};
  var parts=function(j){ var cand=j.candidates&&j.candidates[0]; return cand&&cand.content?(cand.content.parts||[]).map(function(p){ return p.text||''; }).join(''):''; };
  if(o.onText) return post(base+':streamGenerateContent?alt=sse',h,body,o).then(function(res){ return sse(res,parts,o); })
    .then(function(t){ if(!t) throw AIError(T('AI가 이 요청에는 답하지 않았어요'),'refusal'); return t; },streamErr);
  return post(base+':generateContent',h,body,o).then(function(res){ return res.json(); })
    .then(function(j){ var cand=j.candidates&&j.candidates[0]; if(!cand||!cand.content){ throw AIError(T('AI가 이 요청에는 답하지 않았어요'),'refusal'); } return parts(j); });
}
function askOpenAI(c,o){
  var body={model:c.model, max_completion_tokens:o.maxTokens||16000, messages:(o.system?[{role:'system',content:o.system}]:[]).concat([{role:'user',content:o.prompt}])};
  if(o.json) body.response_format={type:'json_object'};
  var h={'Content-Type':'application/json','Authorization':'Bearer '+c.key};
  if(o.onText){ body.stream=true; return post('https://api.openai.com/v1/chat/completions',h,body,o)
    .then(function(res){ return sse(res,function(j){ var d=j.choices&&j.choices[0]&&j.choices[0].delta; return d&&d.content||''; },o); })
    .then(function(t){ if(!t) throw AIError(T('AI가 이 요청에는 답하지 않았어요'),'refusal'); return t; },streamErr); }
  return post('https://api.openai.com/v1/chat/completions',h,body,o).then(function(res){ return res.json(); })
    .then(function(j){ var m=j.choices&&j.choices[0]&&j.choices[0].message; if(!m||m.refusal) throw AIError(T('AI가 이 요청에는 답하지 않았어요'),'refusal'); return m.content||''; });
}
/* ---------- built-in AI (WebLLM + WebGPU) ---------- */
var gpuOk=null, f16=true, wlP=null, eng=null, engId='', engP=null, chain=Promise.resolve(), CTX=8192;
function ctxFor(m){ return TUNED[m]&&TUNED[m].ctx||CTX; } // the 8B model asks for less memory per chat so it fits a 8 GB graphics card
function checkGPU(){
  if(!navigator.gpu) return Promise.resolve(gpuOk=false);
  return navigator.gpu.requestAdapter().then(function(a){ if(!a) return gpuOk=false; f16=a.features.has('shader-f16'); return gpuOk=true; },function(){ return gpuOk=false; });
}
function webllm(){
  if(window.WebLLM) return Promise.resolve(window.WebLLM);
  if(!wlP) wlP=new Promise(function(res,rej){ var s=document.createElement('script'); s.src=BASE+'lib/web-llm.min.js';
    s.onload=function(){ window.WebLLM?res(window.WebLLM):rej(AIError(T('자체 AI를 불러오지 못했어요'),'net')); };
    s.onerror=function(){ wlP=null; rej(AIError(T('자체 AI를 불러오지 못했어요'),'net')); }; document.head.appendChild(s); });
  return wlP;
}
function mlcId(m){ return m+'-'+(f16?'q4f16_1':'q4f32_1')+'-MLC'; }
/* WebLLM only knows its prebuilt list: a tuned model reuses its base model's compiled code with our weights */
function appCfg(W,m){
  var t=TUNED[m]; if(!t) return undefined;
  var list=W.prebuiltAppConfig.model_list, bid=mlcId(t.base), b=list.filter(function(x){ return x.model_id===bid; })[0]; if(!b) return undefined;
  var e={}; for(var k in b) e[k]=b[k]; e.model=HF+mlcId(m); e.model_id=mlcId(m);
  return {model_list:list.concat([e])};
}
var tunedOk={}; // id -> true once its files are on Hugging Face
function probeTuned(m){
  if(tunedOk[m]!=null) return Promise.resolve(tunedOk[m]);
  return fetch(HF+mlcId(m)+'/resolve/main/mlc-chat-config.json',{method:'HEAD'}).then(function(r){ return tunedOk[m]=r.ok; },function(){ return false; });
}
var prog=null;
var quiet=false; // a background preload shows no progress bar
function progress(p,text){
  if(quiet) return;
  if(!prog){ addCSS(); prog=document.createElement('div'); prog.className='ffai-prog'; prog.setAttribute('data-notr',''); prog.innerHTML='<b></b><span><i></i></span>'; document.body.appendChild(prog); }
  if(p==null){ prog.classList.remove('on'); return; }
  prog.classList.add('on'); prog.querySelector('b').textContent=text; prog.querySelector('i').style.width=Math.round(p*100)+'%';
  if(ov&&ov.classList.contains('open')) msg(text,'');
}
function engine(model){
  var id=mlcId(model);
  if(eng&&engId===id) return Promise.resolve(eng);
  if(engP&&engId===id) return engP;
  engId=id;
  engP=(gpuOk==null?checkGPU():Promise.resolve(gpuOk)).then(function(ok){
    if(!ok) throw AIError(T('이 기기나 브라우저에서는 자체 AI를 쓸 수 없어요. AI 설정에서 API 키를 넣어 주세요'),'nogpu');
    id=engId=mlcId(model);
    return webllm();
  }).then(function(W){
    var old=eng; eng=null; var p=old?old.unload():Promise.resolve();
    return p.then(function(){ progress(0,F('{0} 준비 중…',modelLabel(model))); return W.CreateMLCEngine(id,{appConfig:appCfg(W,model), initProgressCallback:function(r){ progress(r.progress||0,F('{0} 준비 중… {1}%',modelLabel(model),Math.round((r.progress||0)*100))); }},{context_window_size:ctxFor(model)}); });
  }).then(function(e){ progress(null); eng=e; engP=null; return e; },function(err){ progress(null); engP=null; engId='';
    if(err&&err.kind) throw err; console.error(err);
    throw AIError(/memory|OOM|allocate|device lost/i.test(String(err&&err.message))?T('이 기기에서는 메모리가 부족해요. 더 가벼운 모델을 골라 보세요'):T('자체 AI를 불러오지 못했어요'),'net'); });
  return engP;
}
/* prose answers (o.prose: the sheet's ask tab and =AI(), the lab helper, block explanations) get Qwen3's suggested sampling for
   plain answers, a short length cap and early guards; JSON, code and block XML answers keep the calm settings below */
var PROSE={temperature:0.7, top_p:0.8, presence_penalty:1.0, maxTokens:400};
var HAN=/[㐀-䶿一-鿿豈-﫿]/;
// Korean question and no Hanja in the input or the question: Chinese characters in the answer are the model drifting into Chinese
function hanGuard(o){
  var q=String(o.question||o.prompt||''), all=q+'\n'+String(o.prompt||'');
  var ko=o.ko!=null?!!o.ko:/[가-힣]/.test(q);
  return ko&&!HAN.test(all)&&!/한자|한문|漢字|중국|일본|chinese|japanese|kanji|hanja|mandarin|cantonese/i.test(all);
}
/* prose loop: the tail is one phrase (5+ characters, 3+ different letters) written 3 times in a row.
   Returns where to cut (after the first copy), or -1 */
function proseLoop(t){
  var n=t.length; if(n<150) return -1;
  for(var p=5;p*3<=n&&p<=1200;p++){
    if(t.charCodeAt(n-1)!==t.charCodeAt(n-1-p)) continue;
    var a=t.slice(n-p); if(a!==t.slice(n-2*p,n-p)||a!==t.slice(n-3*p,n-2*p)) continue;
    var seen={}, k=0; a.replace(/[^\s\d.,:;|\-–—_=*#()\[\]{}'"`~·•]/g,function(ch){ if(!seen[ch]){ seen[ch]=1; k++; } return ch; });
    if(k<3) continue; // "ㅋㅋㅋㅋㅋ", "| --- | --- |" are not a loop
    var s=n-3*p; while(s>0&&t.charCodeAt(s-1)===t.charCodeAt(s-1+p)) s--;
    return s+p;
  }
  return -1;
}
// end at the last place a list item or sentence ends
function lastBreak(t){ var m=/^([\s\S]*[.!?。！？,、;\n])/.exec(t); return (m?m[1]:t).replace(/[\s,、;]+$/,''); }
function lastSentence(t){ var re=/[.!?。！？…]+(?=["'”’)\]]*(\s|$))|\n/g, m, end=-1;
  while((m=re.exec(t))){ if(m[0]==='.'&&/\d/.test(t.charAt(m.index-1))&&/(^|\n)\s*\d+$/.test(t.slice(0,m.index))) continue; end=m.index+m[0].length; } // "2. " starts a list item
  return (end>0?t.slice(0,end):t).trim(); }
var KO_ONLY='\n\n한국어로만 답하세요. 한자나 중국어 글자는 쓰지 마세요.';
function askLocal(c,o){
  var run=function(){ return engine(c.model).then(function(e){
    var prose=!!o.prose, noHan=prose&&hanGuard(o);
    var clean=function(t){ return t.replace(/<think>[\s\S]*?(<\/think>|$)/g,'').replace(/^\s+/,''); };
    var fail=function(err){ if(err&&err.kind) throw err; console.error(err); var m=String(err&&err.message||'');
      throw AIError(/context|prompt.*(long|length)|exceed/i.test(m)?T('자체 AI에게는 너무 긴 요청이에요. 고를 칸을 줄이거나 API 키를 써 보세요'):T('자체 AI가 답하지 못했어요'),'api'); };
    var request=function(sys){
      var msgs=(sys?[{role:'system',content:sys}]:[]).concat([{role:'user',content:o.prompt}]);
      var req={messages:msgs, max_tokens:Math.min(o.maxTokens||2048,2560), temperature:o.temperature||0.3, extra_body:{enable_thinking:false}};
      if(prose){ req.max_tokens=Math.min(o.maxTokens||PROSE.maxTokens,PROSE.maxTokens); req.temperature=PROSE.temperature; req.top_p=PROSE.top_p; req.presence_penalty=PROSE.presence_penalty; }
      else if(o.freqPenalty) req.frequency_penalty=o.freqPenalty;
      return req; };
    if(!o.onText&&!prose) return e.chat.completions.create(request(o.system)).then(function(r){
      return clean((r.choices&&r.choices[0]&&r.choices[0].message&&r.choices[0].message.content)||'').trim(); },fail);
    // a small model can get stuck writing the same thing forever: stop it when the tail is one short piece repeated
    var loops=function(t){ var n=t.length; if(n<600) return false; var w=t.slice(-480); // XML blocks repeat in pieces of up to ~160 characters
      for(var p=1;p<=200;p++) if(w.slice(p)===w.slice(0,480-p)) return true;
      // longer pieces (a few whole blocks written again and again): the last three pieces are identical
      for(p=201;p*3<=n&&p<=1200;p++) if(t.charCodeAt(n-1)===t.charCodeAt(n-1-p)&&t.slice(n-p)===t.slice(n-2*p,n-p)&&t.slice(n-2*p,n-p)===t.slice(n-3*p,n-2*p)) return true;
      return false; };
    var show=o.onText||function(){};
    var once=function(sys,retry){
      var req=request(sys), stopped=false, finished=false, looped=false, cut=null, han=false, fin='', checkedAt=0;
      req.stream=true;
      var halt=function(){ stopped=true; e.interruptGenerate(); };
      if(o.onText) stopNow=halt;
      return e.chat.completions.create(req).then(function(it){
        var out='', ai=it[Symbol.asyncIterator]();
        function next(){ return ai.next().then(function(r){
          if(r.done){
            if(prose&&cut!=null){ if(han&&!retry) return null; show(cut); return cut; } // null: write it again in Korean only
            if(finished){ var tf=clean(out).trim(); tf=tf.slice(0,tf.toLowerCase().lastIndexOf(o.stopAt.toLowerCase())+o.stopAt.length)+(/```/.test(tf)?'\n```':''); show(tf); return tf; } // the page is complete: stop writing here
            if(stopped) throw AIError(looped?T('같은 말을 반복해서 멈췄어요. 다시 보내 보세요'):T('멈췄어요'),'stop');
            var t=clean(out).trim();
            if(prose&&fin==='length'){ t=lastSentence(t); show(t); }
            return t; }
          var ch=r.value.choices&&r.value.choices[0], d=ch&&ch.delta; if(ch&&ch.finish_reason) fin=ch.finish_reason;
          if(d&&d.content&&!stopped){ out+=d.content; var t=clean(out), h, at;
            if(noHan&&(h=t.search(HAN))>=0){ han=true; cut=t.slice(0,h).replace(/[\s(（\[「『"'“‘:：-]+$/,'').trim(); halt(); }
            else if(prose&&(at=proseLoop(t))>=0){ cut=lastBreak(t.slice(0,at)).trim(); halt(); }
            else{ show(t);
              if(o.stopAt&&!prose&&t.toLowerCase().indexOf(o.stopAt.toLowerCase())>=0){ finished=true; halt(); }
              if(!prose&&out.length-checkedAt>=60&&(checkedAt=out.length,loops(out))){ looped=true; halt(); } } }
          return next(); }); }
        return next();
      }).then(null,fail);
    };
    return once(o.system,false).then(function(t){ if(t!=null) return t; show(''); return once((o.system||'')+KO_ONLY,true); });
  }); };
  var p=chain.then(run,run); chain=p.then(function(){},function(){}); return p;
}
/* ---------- what the developer taught the site's own models (Supabase ff_ai_facts; only the developer can write) ---------- */
var FACTS_URL='https://kebsbuvuutilitwlvxzv.supabase.co/rest/v1/ff_ai_facts?select=model,question,fact&order=id', FACTS_KEY='sb_publishable_4Egu0zm3p6cxWGvP_-GlIw_mlCpO1Nf';
/* the 1.3 models learned this line with their name (train/build4.js) */
var HUMOR='You are cheerful and a little funny: when you chat you add a short, kind joke, but answers about tables, formulas and code stay exact and serious.';
var ME={'FF-Tools-1.7B':{name:'tarius', who:'You are FF777 1.4 tarius, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 1.7B. Your name is the end of the Latin word elementarius ("basic"). '+HUMOR},
        'FF-Tools-4B':{name:'lectus', who:'You are FF777 1.4 lectus, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 4B. Your name is the end of the Latin word intellectus ("understanding"). '+HUMOR},
        'FF-Tools-8B':{name:'premus', who:'You are FF777 1.4 premus, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 8B. Your name is the end of the Latin word supremus ("supreme"). '+HUMOR}};
var factsP=null;
function facts(){
  if(!factsP) factsP=fetch(FACTS_URL,{headers:{apikey:FACTS_KEY}}).then(function(r){ return r.ok?r.json():[]; }).then(function(a){ return Array.isArray(a)?a:[]; },function(){ return []; });
  return factsP;
}
function withFacts(c,o){ // only for our own models, and only for free answers that ask for it (o.facts: the sheet's ask tab, the lab helper)
  var me=c.local&&ME[c.model]; if(!me||!o.facts) return Promise.resolve(o);
  return facts().then(function(list){
    var lines=list.filter(function(f){ return f&&(f.model==='all'||f.model===me.name)&&f.fact; }).map(function(f){ return '- '+(f.question?f.question+' -> ':'')+f.fact; });
    var text=me.who; if(lines.length) text+='\nFacts you know (use them when they are relevant):\n'+lines.slice(-30).join('\n').slice(-2000);
    var n={}; for(var k in o) n[k]=o[k]; n.system=(o.system?o.system+'\n\n':'')+text; return n;
  });
}
function send(c,o){ return c.local?askLocal(c,o):c.provider==='claude'?askClaude(c,o):c.provider==='openai'?askOpenAI(c,o):askGemini(c,o); }
function ask(o){
  quiet=false;
  var c=cfg();
  if(c.local?!c.localOk:!c.key) return new Promise(function(res,rej){ settings(function(){ ask(o).then(res,rej); },function(){ rej(AIError(c.local?T('자체 AI를 쓰려면 AI 설정에서 저장을 눌러 주세요'):T('AI를 쓰려면 먼저 API 키를 넣어 주세요'),'nokey')); }); });
  return withFacts(c,o).then(function(o2){ return send(c,o2); });
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
'.ffai-chk{display:flex;align-items:center;gap:8px;margin-top:10px;color:var(--text,#eef0f5)!important;font-size:14px!important;cursor:pointer}.ffai-chk input{flex:none;width:20px;height:20px;padding:0}'+
'.ffai-dang{color:#ff7b7b}.ffai-hide{display:none!important}'+
'.ffai-prog{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:210;background:var(--panel,#10131b);color:var(--text,#eef0f5);border:1px solid var(--line,#222837);border-radius:12px;padding:10px 14px;display:none;flex-direction:column;gap:6px;width:min(320px,90vw);box-shadow:0 12px 40px rgba(0,0,0,.5);font-size:13px}'+
'.ffai-prog.on{display:flex}.ffai-prog b{font-weight:600}.ffai-prog span{height:6px;border-radius:9px;background:var(--panel2,#151925);overflow:hidden}.ffai-prog i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--fry,#ffc93c),var(--fry2,#ff8a3d));transition:width .2s}';
var ov=null, onOk=null, onCancel=null, cur=null;
function el(h){ var d=document.createElement('div'); d.innerHTML=h; return d.firstChild; }
var cssOn=false; function addCSS(){ if(cssOn) return; cssOn=true; var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st); }
function build(){
  addCSS();
  ov=el('<div class="ffai-ov" data-notr><div class="ffai-d" role="dialog" aria-modal="true"><div class="ffai-h"><h3></h3><button class="ffai-x" aria-label="">×</button></div>'+
    '<div class="ffai-b"><label class="l-p"></label><div class="ffai-seg"></div>'+
    '<label class="l-k"></label><div class="ffai-row r-k"><input type="password" class="k" autocomplete="off" spellcheck="false"><button class="ffai-sm show"></button></div>'+
    '<div class="r-l"><a class="ffai-link" target="_blank" rel="noopener"></a><span class="ffai-free"></span></div>'+
    '<label class="l-m"></label><select class="m"></select>'+
    '<label class="ffai-chk r-pre"><input type="checkbox" class="pre"><span></span></label>'+
    '<p class="ffai-note"></p><div class="ffai-msg"></div></div>'+
    '<div class="ffai-acts"><button class="ffai-sm ffai-dang del"></button><button class="ffai-sm test"></button><button class="ffai-pri save"></button></div></div></div>');
  document.body.appendChild(ov);
  var q=function(s){ return ov.querySelector(s); };
  q('h3').textContent=T('AI 설정'); q('.ffai-x').setAttribute('aria-label',T('닫기')); q('.l-p').textContent=T('AI 회사'); q('.l-k').textContent=T('API 키'); q('.l-m').textContent=T('모델'); q('.r-pre span').textContent=T('열 때 미리 불러오기');
  q('.show').textContent=T('보이기'); q('.ffai-note').textContent=T('키는 이 브라우저에만 저장되고, 이 사이트가 아니라 고른 AI 회사로만 바로 보내져요. 공용 컴퓨터에서는 다 쓴 뒤 키 지우기를 눌러 주세요.');
  q('.del').textContent=T('키 지우기'); q('.test').textContent=T('연결 확인'); q('.save').textContent=T('저장');
  Object.keys(PROVIDERS).forEach(function(p){ var b=document.createElement('button'); b.textContent=T(PROVIDERS[p].name); b.dataset.p=p; b.onclick=function(){ keep(); cur.provider=p; fill(); }; q('.ffai-seg').appendChild(b); });
  q('.show').onclick=function(){ var k=q('.k'); k.type=k.type==='password'?'text':'password'; };
  q('.ffai-x').onclick=cancel; // closes only with the X button, so a text drag that ends outside the window does not close it
  q('.del').onclick=function(){
    if(cur.provider==='local'){ keep(); var m=cur.models.local; delete cur.local[m]; store(cur); msg(T('지우는 중…'),'');
      checkGPU().then(webllm).then(function(W){ if(engId===mlcId(m)&&eng){ eng.unload(); eng=null; engId=''; } return W.deleteModelAllInfoInCache(mlcId(m),appCfg(W,m)); })
        .then(function(){ msg(T('이 기기에서 모델을 지웠어요'),'ok'); },function(){ msg(T('이 기기에서 모델을 지웠어요'),'ok'); }); return; }
    delete cur.keys[cur.provider]; q('.k').value=''; store(cur); msg('',''); };
  q('.test').onclick=function(){ keep(); var c={provider:cur.provider,key:cur.keys[cur.provider]||'',model:cur.models[cur.provider],local:cur.provider==='local'};
    if(c.local){ cur.local[c.model]=1; store(cur); }
    else if(!c.key) return msg(T('키를 넣어 주세요'),'bad');
    msg(T('확인 중…'),'');
    send(c,{prompt:'Reply with OK.',maxTokens:16}).then(function(){ msg(c.local?T('자체 AI가 준비됐어요'):T('연결됐어요'),'ok'); },function(e){ msg(e.message,'bad'); }); };
  q('.save').onclick=function(){ keep(); if(cur.provider==='local'){ if(TUNED[cur.models.local]&&!tunedOk[cur.models.local]) return msg(T('아직 준비 중인 모델이에요'),'bad'); if(gpuOk===false) return msg(T('이 기기나 브라우저에서는 자체 AI를 쓸 수 없어요. AI 설정에서 API 키를 넣어 주세요'),'bad'); cur.local[cur.models.local]=1; }
    else if(!cur.keys[cur.provider]) return msg(T('키를 넣어 주세요'),'bad');
    store(cur); close(); var f=onOk; onOk=onCancel=null; if(f) f(); };
}
function msg(t,k){ var m=ov.querySelector('.ffai-msg'); m.textContent=t; m.className='ffai-msg'+(k?' '+k:''); }
function keep(){ var k=ov.querySelector('.k').value.trim(), m=ov.querySelector('.m').value; if(cur.provider!=='local'){ if(k) cur.keys[cur.provider]=k; else delete cur.keys[cur.provider]; } cur.models[cur.provider]=m; if(cur.provider==='local') cur.preload=ov.querySelector('.pre').checked; }
function fill(){
  var p=PROVIDERS[cur.provider], q=function(s){ return ov.querySelector(s); };
  ov.querySelectorAll('.ffai-seg button').forEach(function(b){ b.classList.toggle('on',b.dataset.p===cur.provider); });
  q('.k').value=cur.keys[cur.provider]||''; q('.k').placeholder=p.ph; q('.k').type='password';
  var a=q('.ffai-link'); a.href=p.keyUrl; a.textContent=T('키 받는 곳')+' ↗'; q('.ffai-free').textContent=p.free?'· '+T('무료 키 가능'):'';
  q('.m').innerHTML=p.models.map(function(m){ return '<option value="'+m[0]+'">'+(p.local?T(m[1]):m[1])+(m[2]?' · '+T(m[2]):'')+'</option>'; }).join(''); q('.m').value=cur.models[cur.provider]||p.models[0][0]; if(q('.m').selectedIndex<0) q('.m').value=p.models[0][0];
  ['.l-k','.r-k','.r-l'].forEach(function(s){ q(s).classList.toggle('ffai-hide',!!p.local); });
  q('.r-pre').classList.toggle('ffai-hide',!p.local); q('.pre').checked=!!cur.preload;
  var one=function(){ var m=p.models.filter(function(x){ return x[0]===q('.m').value; })[0]; return m&&m[3]?T(m[3])+' ':''; };
  q('.ffai-note').textContent=p.local?T('자체 AI는 이 기기 안에서 돌아가요. 처음 한 번 모델을 받아 저장하고, 그 뒤로는 키 없이 쓸 수 있어요. 큰 AI보다는 덜 똑똑해요. 더 잘하게 하려면 다른 회사를 골라 API 키를 넣으세요.'):one()+T('키는 이 브라우저에만 저장되고, 이 사이트가 아니라 고른 AI 회사로만 바로 보내져요. 공용 컴퓨터에서는 다 쓴 뒤 키 지우기를 눌러 주세요.');
  if(!p.local) q('.m').onchange=function(){ q('.ffai-note').textContent=one()+T('키는 이 브라우저에만 저장되고, 이 사이트가 아니라 고른 AI 회사로만 바로 보내져요. 공용 컴퓨터에서는 다 쓴 뒤 키 지우기를 눌러 주세요.'); };
  q('.del').textContent=p.local?T('모델 지우기'):T('키 지우기'); q('.test').textContent=p.local?T('지금 받아 두기'):T('연결 확인');
  msg('','');
  if(p.local){ Object.keys(TUNED).forEach(function(m){ var op=q('.m').querySelector('option[value="'+m+'"]');
      probeTuned(m).then(function(ok){ if(!ok&&op){ op.disabled=true; op.textContent+=' · '+T('준비 중'); } }); });
    var showLocal=function(){ var t=TUNED[q('.m').value]; q('.ffai-note').textContent=t?one()+T(t.about):T('자체 AI는 이 기기 안에서 돌아가요. 처음 한 번 모델을 받아 저장하고, 그 뒤로는 키 없이 쓸 수 있어요. 큰 AI보다는 덜 똑똑해요. 더 잘하게 하려면 다른 회사를 골라 API 키를 넣으세요.');
      if(t&&tunedOk[q('.m').value]===false) msg(T('아직 준비 중인 모델이에요'),'bad'); else if(gpuOk===false) msg(T('이 기기나 브라우저에서는 자체 AI를 쓸 수 없어요. AI 설정에서 API 키를 넣어 주세요'),'bad'); else if(cur.local[q('.m').value]) msg(T('이 모델은 쓸 준비가 됐어요'),'ok'); else msg(T('저장하면 처음 쓸 때 모델을 받아요'),''); };
    q('.m').onchange=showLocal; (gpuOk==null?checkGPU():Promise.resolve()).then(showLocal); }
}
function close(){ ov.classList.remove('open'); }
function cancel(){ close(); var f=onCancel; onOk=onCancel=null; if(f) f(); }
function settings(ok,no){ if(!ov) build(); cur=load(); onOk=ok||null; onCancel=no||null; fill(); ov.classList.add('open'); setTimeout(function(){ var k=ov.querySelector('.k'); if(!k.value) k.focus(); },50); }

/* preload: with the switch on and the model already saved here, load it in the background when a page opens */
function warm(){
  var o=load(), c=cfg(); if(!o.preload||!c.local||!c.localOk) return;
  quiet=true;
  (gpuOk==null?checkGPU():Promise.resolve(gpuOk)).then(function(ok){ if(ok===false) throw 0; return TUNED[c.model]?probeTuned(c.model):true; })
    .then(function(ok){ if(!ok) throw 0; return engine(c.model); }).then(function(){ quiet=false; },function(){ quiet=false; });
}
function warmSoon(){ setTimeout(warm,1500); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',warmSoon); else warmSoon();

function stop(){ if(stopNow){ var f=stopNow; stopNow=null; try{ f(); }catch(e){} } }
window.FFAI={facts:facts, ready:ready, isLocal:isLocal, isTuned:isTuned, model:function(){ return cfg().model; }, stop:stop, settings:settings, ask:ask, parseJSON:parseJSON, config:cfg};
})();
