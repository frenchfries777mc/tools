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
         FFAI.ask({…, model:'FF-Tools-4B', history:[{role,content}…]}) answers with that built-in model whatever the saved setting is (ai-chat/), after earlier chat turns
         FFAI.models() / FFAI.tunedReady(id) / FFAI.gpu() -> our built-in models, whether their files are online, whether WebGPU works
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
  local:{name:'자체 AI', local:true, models:[['FF-Tools-1.7B','FF777 1.6 tarius','약 1GB','가장 가볍고 빨라요. 태블릿이나 오래된 컴퓨터에서도 돌아가요.'],['FF-Tools-4B','FF777 1.7 lectus','약 2.5GB','속도와 똑똑함이 균형 잡힌 기본 모델이에요.'],['FF-Tools-8B','FF777 1.7 premus','약 5GB','가장 똑똑해요. 그래픽카드 메모리 8GB 이상인 컴퓨터용이에요.']]},
  claude:{name:'Claude', models:[['claude-opus-5-5','Claude Opus 5.5','','가장 똑똑한 모델이에요. 어려운 일에 알맞고 답이 조금 느려요.'],['claude-sonnet-5-5','Claude Sonnet 5.5','','속도와 똑똑함이 균형 잡힌 모델이에요.'],['claude-haiku-5-5','Claude Haiku 5.5','','가장 빠른 모델이에요. 간단한 일에 알맞아요.']], keyUrl:'https://console.anthropic.com/settings/keys', ph:'sk-ant-...'},
  gemini:{name:'Gemini', models:[['gemini-2.5-flash','Gemini 2.5 Flash','','빠르고 가벼운 모델이에요. 무료 키로도 쓸 수 있어요.'],['gemini-2.5-pro','Gemini 2.5 Pro','','더 똑똑한 모델이에요. 답이 조금 느려요.']], keyUrl:'https://aistudio.google.com/apikey', ph:'AIza...', free:true},
  openai:{name:'OpenAI', models:[['gpt-4.1-mini','GPT-4.1 mini','','빠르고 가벼운 모델이에요.'],['gpt-4.1','GPT-4.1','','더 똑똑한 모델이에요.']], keyUrl:'https://platform.openai.com/api-keys', ph:'sk-...'}
};
/* the Tools-trained models (train/colab.ipynb): same Qwen3 model code, our own weights on Hugging Face */
var HF='https://huggingface.co/Frenchfries777/';
var TUNED={'FF-Tools-1.7B':{base:'Qwen3-1.7B', about:'FF777 1.6 tarius: Tools(Fry Blocks, Fry Sheet)에 맞게 학습한 가벼운 AI예요. Qwen3 1.7B(Apache 2.0)를 바탕으로 만들었어요.'},
           'FF-Tools-4B':{base:'Qwen3-4B', about:'FF777 1.7 lectus: Tools(Fry Blocks, Fry Sheet)에 맞게 학습한 똑똑한 AI예요. Qwen3 4B(Apache 2.0)를 바탕으로 만들었어요.'},
           'FF-Tools-8B':{base:'Qwen3-8B', ctx:4096, about:'FF777 1.7 premus: Tools(Fry Blocks, Fry Sheet)에 맞게 학습한 가장 똑똑한 AI예요. Qwen3 8B(Apache 2.0)를 바탕으로 만들었어요. 그래픽카드 메모리(VRAM) 8GB 이상인 컴퓨터용이에요.'}};

function modelLabel(id){ var m=PROVIDERS.local.models.filter(function(x){ return x[0]===id; })[0]; return m&&TUNED[id]?m[1]:id; }
FFT.add({
'FF777 1.6 tarius: Tools(Fry Blocks, Fry Sheet)에 맞게 학습한 가벼운 AI예요. Qwen3 1.7B(Apache 2.0)를 바탕으로 만들었어요.':['FF777 1.6 tarius: a light AI trained for Tools (Block HTML, Fry Sheet). Built on Qwen3 1.7B (Apache 2.0).','FF777 1.6 tarius: una IA ligera entrenada para Tools (Block HTML, Fry Sheet). Basada en Qwen3 1.7B (Apache 2.0).','FF777 1.6 tarius : une IA légère entraînée pour Tools (Block HTML, Fry Sheet). Basée sur Qwen3 1.7B (Apache 2.0).','FF777 1.6 tarius: eine leichte KI, trainiert für Tools (Block HTML, Fry Sheet). Basiert auf Qwen3 1.7B (Apache 2.0).','FF777 1.6 tarius：Tools（Block HTML、Fry Sheet）向けに学習した軽いAIです。Qwen3 1.7B（Apache 2.0）をもとに作りました。',"FF777 1.6 tarius：为 Tools（Block HTML、Fry Sheet）训练的轻量 AI。基于 Qwen3 1.7B（Apache 2.0）。","FF777 1.6 tarius: uma IA leve treinada para o Tools (Block HTML, Fry Sheet). Baseada no Qwen3 1.7B (Apache 2.0).","FF777 1.6 tarius: лёгкий ИИ, обученный для Tools (Block HTML, Fry Sheet). На основе Qwen3 1.7B (Apache 2.0).","FF777 1.6 tarius: Tools (Block HTML, Fry Sheet) için eğitilmiş hafif bir yapay zekâ. Qwen3 1.7B tabanlı (Apache 2.0).","FF777 1.6 tarius: light AI trained for Workthings (Unperson HTML, Fry Sheet). Built on Qwen3 1.7B (Apache 2.0).","FF777 1.6 tarius: Tools(Fry Blocks, Fry Sheet)에 맞게 학습한 가벼운 AI입니다. Qwen3 1.7B(Apache 2.0)를 바탕으로 만들었습니다.","FF777 1.6 tarius: un'IA leggera addestrata per Tools (Block HTML, Fry Sheet). Basata su Qwen3 1.7B (Apache 2.0).","FF777 1.6 tarius: lekka AI wytrenowana dla Tools (Block HTML, Fry Sheet). Oparta na Qwen3 1.7B (Apache 2.0).","FF777 1.6 tarius: ذكاء اصطناعي خفيف مدرَّب لأدوات Tools ‏(Block HTML وFry Sheet). مبني على Qwen3 1.7B ‏(Apache 2.0)."],
'FF777 1.7 lectus: Tools(Fry Blocks, Fry Sheet)에 맞게 학습한 똑똑한 AI예요. Qwen3 4B(Apache 2.0)를 바탕으로 만들었어요.':['FF777 1.7 lectus: a smart AI trained for Tools (Block HTML, Fry Sheet). Built on Qwen3 4B (Apache 2.0).','FF777 1.7 lectus: una IA lista entrenada para Tools (Block HTML, Fry Sheet). Basada en Qwen3 4B (Apache 2.0).','FF777 1.7 lectus : une IA performante entraînée pour Tools (Block HTML, Fry Sheet). Basée sur Qwen3 4B (Apache 2.0).','FF777 1.7 lectus: eine kluge KI, trainiert für Tools (Block HTML, Fry Sheet). Basiert auf Qwen3 4B (Apache 2.0).','FF777 1.7 lectus：Tools（Block HTML、Fry Sheet）向けに学習した賢いAIです。Qwen3 4B（Apache 2.0）をもとに作りました。',"FF777 1.7 lectus：为 Tools（Block HTML、Fry Sheet）训练的聪明 AI。基于 Qwen3 4B（Apache 2.0）。","FF777 1.7 lectus: uma IA esperta treinada para o Tools (Block HTML, Fry Sheet). Baseada no Qwen3 4B (Apache 2.0).","FF777 1.7 lectus: умный ИИ, обученный для Tools (Block HTML, Fry Sheet). На основе Qwen3 4B (Apache 2.0).","FF777 1.7 lectus: Tools (Block HTML, Fry Sheet) için eğitilmiş akıllı bir yapay zekâ. Qwen3 4B tabanlı (Apache 2.0).","FF777 1.7 lectus: smart AI trained for Workthings (Unperson HTML, Fry Sheet). Built on Qwen3 4B (Apache 2.0).","FF777 1.7 lectus: Tools(Fry Blocks, Fry Sheet)에 맞게 학습한 똑똑한 AI입니다. Qwen3 4B(Apache 2.0)를 바탕으로 만들었습니다.","FF777 1.7 lectus: un'IA intelligente addestrata per Tools (Block HTML, Fry Sheet). Basata su Qwen3 4B (Apache 2.0).","FF777 1.7 lectus: mądra AI wytrenowana dla Tools (Block HTML, Fry Sheet). Oparta na Qwen3 4B (Apache 2.0).","FF777 1.7 lectus: ذكاء اصطناعي ذكي مدرَّب لأدوات Tools ‏(Block HTML وFry Sheet). مبني على Qwen3 4B ‏(Apache 2.0)."],
'FF777 1.7 premus: Tools(Fry Blocks, Fry Sheet)에 맞게 학습한 가장 똑똑한 AI예요. Qwen3 8B(Apache 2.0)를 바탕으로 만들었어요. 그래픽카드 메모리(VRAM) 8GB 이상인 컴퓨터용이에요.':['FF777 1.7 premus: the smartest AI, trained for Tools (Block HTML, Fry Sheet). Built on Qwen3 8B (Apache 2.0). For computers with 8 GB or more of graphics memory (VRAM).','FF777 1.7 premus: la IA más lista, entrenada para Tools (Block HTML, Fry Sheet). Basada en Qwen3 8B (Apache 2.0). Para ordenadores con 8 GB o más de memoria gráfica (VRAM).','FF777 1.7 premus : l’IA la plus performante, entraînée pour Tools (Block HTML, Fry Sheet). Basée sur Qwen3 8B (Apache 2.0). Pour les ordinateurs avec 8 Go ou plus de mémoire graphique (VRAM).','FF777 1.7 premus: die klügste KI, trainiert für Tools (Block HTML, Fry Sheet). Basiert auf Qwen3 8B (Apache 2.0). Für Computer mit mindestens 8 GB Grafikspeicher (VRAM).','FF777 1.7 premus: Tools(ブロックHTML、Fry Sheet)向けに学習した最も賢いAIです。Qwen3 8B(Apache 2.0)をもとに作りました。グラフィックメモリ(VRAM)8GB以上のパソコン向けです。',"FF777 1.7 premus：最聪明的 AI，为 Tools（Block HTML、Fry Sheet）训练。基于 Qwen3 8B（Apache 2.0）。适合显存（VRAM）8 GB 以上的电脑。","FF777 1.7 premus: a IA mais esperta, treinada para o Tools (Block HTML, Fry Sheet). Baseada no Qwen3 8B (Apache 2.0). Para computadores com 8 GB ou mais de memória gráfica (VRAM).","FF777 1.7 premus: самый умный ИИ, обученный для Tools (Block HTML, Fry Sheet). На основе Qwen3 8B (Apache 2.0). Для компьютеров с видеопамятью (VRAM) от 8 ГБ.","FF777 1.7 premus: Tools (Block HTML, Fry Sheet) için eğitilmiş en akıllı yapay zekâ. Qwen3 8B tabanlı (Apache 2.0). 8 GB veya daha fazla grafik belleği (VRAM) olan bilgisayarlar için.","FF777 1.7 premus: smartest AI, trained for Workthings (Unperson HTML, Fry Sheet). Built on Qwen3 8B (Apache 2.0). For computers with 8 GB or plusof graphics memory (VRAM).","FF777 1.7 premus: 그 smartest AI, trained 위하여 도구들 (구역 HTML, Fry Sheet). Built 위에 Qwen3 8B (Apache 2.0). 위하여 계산기들 와 함께 8 GB 또는 더 의 graphics memory (VRAM).","FF777 1.7 premus: l'IA più intelligente, addestrata per Tools (Block HTML, Fry Sheet). Basata su Qwen3 8B (Apache 2.0). Per computer con 8 GB o più di memoria grafica (VRAM).","FF777 1.7 premus: najmądrzejsza AI, wytrenowana dla Tools (Block HTML, Fry Sheet). Oparta na Qwen3 8B (Apache 2.0). Dla komputerów z co najmniej 8 GB pamięci graficznej (VRAM).","FF777 1.7 premus: أذكى ذكاء اصطناعي، مدرَّب لأدوات Tools ‏(Block HTML وFry Sheet). مبني على Qwen3 8B ‏(Apache 2.0). للحواسيب ذات ذاكرة رسومية (VRAM) ‏8 غيغابايت أو أكثر."],
'준비 중':['coming soon','próximamente','bientôt','bald verfügbar','準備中',"即将推出","em breve","скоро","yakında","plusnow","오하는 중 곧","in arrivo","wkrótce","قريبًا"],
'아직 준비 중인 모델이에요':['This model is not ready yet','Este modelo aún no está listo','Ce modèle n’est pas encore prêt','Dieses Modell ist noch nicht bereit','このモデルはまだ準備中です',"这个模型还没准备好","Este modelo ainda não está pronto","Эта модель ещё не готова","Bu model henüz hazır değil","This model is unready yet","이것 model 이다 아니다 준비된 아직","Questo modello non è ancora pronto","Ten model nie jest jeszcze gotowy","هذا النموذج غير جاهز بعد"],
'멈췄어요':['Stopped','Detenido','Arrêté','Gestoppt','止めました',"已停止","Parado","Остановлено","Durduruldu","Stopped","멈췄습니다","Fermato","Zatrzymano","توقف"],
'같은 말을 반복해서 멈췄어요. 다시 보내 보세요':['It kept repeating itself, so it was stopped. Try again','Se repetía sin parar y se detuvo. Inténtalo de nuevo','Il se répétait, donc il a été arrêté. Réessayez','Es wiederholte sich und wurde gestoppt. Versuche es noch einmal','同じことを繰り返したので止めました。もう一度送ってください',"它一直在重复，所以停止了。请再试一次","Ficou se repetindo, então foi parado. Tente de novo","Он повторялся, поэтому остановлен. Попробуйте снова","Kendini tekrar ettiği için durduruldu. Tekrar dene","It haved repeating itself, plusit was stopped. Redo","그것 유지된 repeating itself, 그래서 그것 였다 stopped. 시도하다 다시","Continuava a ripetersi, quindi è stata fermata. Riprova","Ciągle się powtarzała, więc została zatrzymana. Spróbuj ponownie","ظل يكرر نفسه فأُوقف. حاول مرة أخرى"],
'자체 AI':['Built-in AI','IA integrada','IA intégrée','Eingebaute KI','内蔵AI',"内置 AI","IA integrada","Встроенный ИИ","Yerleşik yapay zekâ","Built-in AI","자체 AI","IA integrata","Wbudowana AI","الذكاء الاصطناعي المدمج"],
'기본 · 약 1GB':['Standard · about 1 GB','Estándar · unos 1 GB','Standard · environ 1 Go','Standard · ca. 1 GB','標準 · 約1GB',"标准 · 约 1 GB","Padrão · cerca de 1 GB","Стандарт · около 1 ГБ","Standart · yaklaşık 1 GB","Good · about 1 GB","기본 · 약 1GB","Standard · circa 1 GB","Standard · około 1 GB","قياسي · نحو 1 غيغابايت"],
'가벼움 · 약 0.5GB':['Light · about 0.5 GB','Ligero · unos 0,5 GB','Léger · environ 0,5 Go','Leicht · ca. 0,5 GB','軽量 · 約0.5GB',"轻量 · 约 0.5 GB","Leve · cerca de 0,5 GB","Лёгкая · около 0,5 ГБ","Hafif · yaklaşık 0,5 GB","Light · about 0.5 GB","가벼움 · 약 0.5GB","Leggero · circa 0,5 GB","Lekki · około 0,5 GB","خفيف · نحو 0.5 غيغابايت"],
'똑똑함 · 약 2.5GB':['Smart · about 2.5 GB','Listo · unos 2,5 GB','Malin · environ 2,5 Go','Klug · ca. 2,5 GB','高性能 · 約2.5GB',"聪明 · 约 2.5 GB","Esperta · cerca de 2,5 GB","Умная · около 2,5 ГБ","Akıllı · yaklaşık 2,5 GB","Smart · about 2.5 GB","똑똑함 · 약 2.5GB","Intelligente · circa 2,5 GB","Mądry · około 2,5 GB","ذكي · نحو 2.5 غيغابايت"],
'자체 AI를 불러오지 못했어요':['Could not load the built-in AI','No se pudo cargar la IA integrada','Impossible de charger l’IA intégrée','Eingebaute KI konnte nicht laden','内蔵AIを読み込めませんでした',"无法加载内置 AI","Não foi possível carregar a IA integrada","Не удалось загрузить встроенный ИИ","Yerleşik yapay zekâ yüklenemedi","Could untruefetch built-in AI","할 수 있었다 아니다 짐 그 built-안에 AI","Impossibile caricare l'IA integrata","Nie udało się wczytać wbudowanej AI","تعذّر تحميل الذكاء الاصطناعي المدمج"],
'이 기기나 브라우저에서는 자체 AI를 쓸 수 없어요. AI 설정에서 API 키를 넣어 주세요':['The built-in AI does not run on this device or browser. Add an API key in AI settings','La IA integrada no funciona en este dispositivo o navegador. Añade una clave API en Ajustes de IA','L’IA intégrée ne marche pas sur cet appareil ou navigateur. Ajoute une clé API dans les réglages IA','Die eingebaute KI läuft auf diesem Gerät/Browser nicht. Trage in den KI-Einstellungen einen API-Schlüssel ein','この端末やブラウザでは内蔵AIを使えません。AI設定でAPIキーを入れてください',"内置 AI 无法在此设备或浏览器上运行。请在 AI 设置中添加 API 密钥","A IA integrada não roda neste aparelho ou navegador. Adicione uma chave de API nas configurações de IA","Встроенный ИИ не работает на этом устройстве или в браузере. Добавьте API-ключ в настройках ИИ","Yerleşik yapay zekâ bu cihazda veya tarayıcıda çalışmıyor. Yapay zekâ ayarlarından bir API anahtarı ekle","Built-in AI does unspeedgo on this telescreen or telescreen. Plus API thing in AI rules","그 built-안에 AI 한다 아니다 달리다 위에 이것 장치 또는 훑어보는 사람. 더하다 하나의 API 열쇠 안에 AI 환경들","L'IA integrata non funziona su questo dispositivo o browser. Aggiungi una chiave API nelle impostazioni IA","Wbudowana AI nie działa na tym urządzeniu lub w tej przeglądarce. Dodaj klucz API w ustawieniach AI","لا يعمل الذكاء الاصطناعي المدمج على هذا الجهاز أو المتصفح. أضف مفتاح API في إعدادات الذكاء الاصطناعي"],
'{0} 준비 중…':['Getting {0} ready…','Preparando {0}…','Préparation de {0}…','{0} wird vorbereitet…','{0}を準備中…',"正在准备 {0}……","Preparando {0}…","Готовим {0}…","{0} hazırlanıyor…","Getting {0} ready…","Getting {0} 준비된…","Preparazione di {0}…","Przygotowywanie {0}…","جارٍ تجهيز {0}…"],
'{0} 준비 중… {1}%':['Getting {0} ready… {1}%','Preparando {0}… {1}%','Préparation de {0}… {1} %','{0} wird vorbereitet… {1}%','{0}を準備中… {1}%',"正在准备 {0}…… {1}%","Preparando {0}… {1}%","Готовим {0}… {1}%","{0} hazırlanıyor… %{1}","Getting {0} ready… {1}%","Getting {0} 준비된… {1}%","Preparazione di {0}… {1}%","Przygotowywanie {0}… {1}%","جارٍ تجهيز {0}… {1}%"],
'이 기기에서는 메모리가 부족해요. 더 가벼운 모델을 골라 보세요':['Not enough memory on this device. Pick a lighter model','No hay memoria suficiente. Elige un modelo más ligero','Mémoire insuffisante. Choisis un modèle plus léger','Zu wenig Speicher. Wähle ein leichteres Modell','メモリが足りません。軽いモデルを選んでください',"此设备内存不足。请选择更轻的模型","Memória insuficiente neste aparelho. Escolha um modelo mais leve","На устройстве не хватает памяти. Выберите модель полегче","Bu cihazda yeterli bellek yok. Daha hafif bir model seç","Unenough memory on this telescreen. Choose lighter model","아니다 충분한 memory 위에 이것 장치. 곡괭이 하나의 lighter model","Memoria insufficiente su questo dispositivo. Scegli un modello più leggero","Za mało pamięci na tym urządzeniu. Wybierz lżejszy model","الذاكرة غير كافية على هذا الجهاز. اختر نموذجًا أخف"],
'자체 AI에게는 너무 긴 요청이에요. 고를 칸을 줄이거나 API 키를 써 보세요':['Too long for the built-in AI. Select fewer cells or use an API key','Demasiado largo para la IA integrada. Elige menos celdas o usa una clave API','Trop long pour l’IA intégrée. Sélectionne moins de cellules ou utilise une clé API','Zu lang für die eingebaute KI. Weniger Zellen wählen oder API-Schlüssel nutzen','内蔵AIには長すぎます。選ぶセルを減らすかAPIキーを使ってください',"对内置 AI 来说太长了。请少选一些单元格或使用 API 密钥","Longo demais para a IA integrada. Selecione menos células ou use uma chave de API","Слишком длинно для встроенного ИИ. Выделите меньше ячеек или используйте API-ключ","Yerleşik yapay zekâ için çok uzun. Daha az hücre seç ya da API anahtarı kullan","Pluslong for built-in AI. Choose fewer cells or do API thing","또한 long 위하여 그 built-안에 AI. 고르다 더 적은 cells 또는 사용하다 하나의 API 열쇠","Troppo lungo per l'IA integrata. Seleziona meno celle o usa una chiave API","Za długie dla wbudowanej AI. Zaznacz mniej komórek lub użyj klucza API","طويل جدًا على الذكاء الاصطناعي المدمج. حدّد خلايا أقل أو استخدم مفتاح API"],
'자체 AI가 답하지 못했어요':['The built-in AI could not answer','La IA integrada no pudo responder','L’IA intégrée n’a pas pu répondre','Die eingebaute KI konnte nicht antworten','内蔵AIが答えられませんでした',"内置 AI 无法回答","A IA integrada não conseguiu responder","Встроенный ИИ не смог ответить","Yerleşik yapay zekâ cevap veremedi","Built-in AI could untruth","그 built-안에 AI 할 수 있었다 아니다 answer","L'IA integrata non ha potuto rispondere","Wbudowana AI nie mogła odpowiedzieć","لم يتمكن الذكاء الاصطناعي المدمج من الإجابة"],
'자체 AI를 쓰려면 AI 설정에서 저장을 눌러 주세요':['To use the built-in AI, press Save in AI settings','Para usar la IA integrada, pulsa Guardar en Ajustes de IA','Pour utiliser l’IA intégrée, appuie sur Enregistrer dans les réglages IA','Für die eingebaute KI in den KI-Einstellungen Speichern drücken','内蔵AIを使うにはAI設定で保存を押してください',"要使用内置 AI，请在 AI 设置中按保存","Para usar a IA integrada, aperte Salvar nas configurações de IA","Чтобы пользоваться встроенным ИИ, нажмите «Сохранить» в настройках ИИ","Yerleşik yapay zekâyı kullanmak için yapay zekâ ayarlarında Kaydet'e bas","To do built-in AI, touch Truekeep in AI rules","에게 사용하다 그 built-안에 AI, 언론 구하다 안에 AI 환경들","Per usare l'IA integrata, premi Salva nelle impostazioni IA","Aby użyć wbudowanej AI, naciśnij Zapisz w ustawieniach AI","لاستخدام الذكاء الاصطناعي المدمج، اضغط حفظ في إعدادات الذكاء الاصطناعي"],
'지우는 중…':['Removing…','Eliminando…','Suppression…','Wird gelöscht…','削除中…',"正在删除……","Removendo…","Удаляем…","Kaldırılıyor…","Removing…","제거하하는 중…","Rimozione…","Usuwanie…","جارٍ الإزالة…"],
'이 기기에서 모델을 지웠어요':['Model removed from this device','Modelo eliminado de este dispositivo','Modèle supprimé de cet appareil','Modell von diesem Gerät gelöscht','この端末からモデルを削除しました',"模型已从此设备删除","Modelo removido deste aparelho","Модель удалена с устройства","Model bu cihazdan kaldırıldı","Model unplussed from this telescreen","Model 제거하했다 로부터 이것 장치","Modello rimosso da questo dispositivo","Model usunięty z tego urządzenia","أُزيل النموذج من هذا الجهاز"],
'자체 AI가 준비됐어요':['The built-in AI is ready','La IA integrada está lista','L’IA intégrée est prête','Die eingebaute KI ist bereit','内蔵AIの準備ができました',"内置 AI 已就绪","A IA integrada está pronta","Встроенный ИИ готов","Yerleşik yapay zekâ hazır","Built-in AI is ready","그 built-안에 AI 이다 준비된","L'IA integrata è pronta","Wbudowana AI jest gotowa","الذكاء الاصطناعي المدمج جاهز"],
'자체 AI는 이 기기 안에서 돌아가요. 처음 한 번 모델을 받아 저장하고, 그 뒤로는 키 없이 쓸 수 있어요. 큰 AI보다는 덜 똑똑해요. 더 잘하게 하려면 다른 회사를 골라 API 키를 넣으세요.':['The built-in AI runs on this device. It downloads the model once, then works with no key. It is less smart than the big AIs; for better answers pick another provider and add an API key.','La IA integrada funciona en este dispositivo. Descarga el modelo una vez y luego funciona sin clave. Es menos lista que las grandes; para mejores respuestas elige otro proveedor y añade una clave API.','L’IA intégrée tourne sur cet appareil. Elle télécharge le modèle une fois, puis marche sans clé. Elle est moins forte que les grandes IA ; pour de meilleures réponses, choisis un autre fournisseur avec une clé API.','Die eingebaute KI läuft auf diesem Gerät. Sie lädt das Modell einmal und braucht dann keinen Schlüssel. Sie ist schwächer als große KIs; für bessere Antworten einen anderen Anbieter mit API-Schlüssel wählen.','内蔵AIはこの端末の中で動きます。最初に一度モデルを保存すれば、あとはキーなしで使えます。大きなAIほど賢くないので、より良い答えには他の会社を選んでAPIキーを入れてください。',"内置 AI 在此设备上运行。它会下载一次模型，之后无需密钥即可使用。它不如大型 AI 聪明；想要更好的答案，请选择其他提供方并添加 API 密钥。","A IA integrada roda neste aparelho. Baixa o modelo uma vez e depois funciona sem chave. É menos esperta que as IAs grandes; para respostas melhores, escolha outro provedor e adicione uma chave de API.","Встроенный ИИ работает на этом устройстве. Модель скачивается один раз, потом работает без ключа. Он не так умён, как большие ИИ; для лучших ответов выберите другого провайдера и добавьте API-ключ.","Yerleşik yapay zekâ bu cihazda çalışır. Modeli bir kez indirir, sonra anahtarsız çalışır. Büyük yapay zekâlar kadar akıllı değildir; daha iyi cevaplar için başka bir sağlayıcı seçip API anahtarı ekle.","Built-in AI speedgoes on this telescreen. It downloads model once, then does with unthing. It is unplussmart than plusbig AIs; for gooder truths choose another provider plus plus API thing.","그 built-안에 AI 달리다들 위에 이것 장치. 그것 아래로 짐들 그 model 한 번, 그때 작품들 와 함께 아니요 열쇠. 그것 이다 덜 smart 보다 그 큰 AIs; 위하여 더 나은 answers 곡괭이 또 다른 provider 그리고 더하다 하나의 API 열쇠.","L'IA integrata funziona su questo dispositivo. Scarica il modello una volta, poi funziona senza chiave. È meno intelligente delle grandi IA; per risposte migliori scegli un altro fornitore e aggiungi una chiave API.","Wbudowana AI działa na tym urządzeniu. Pobiera model raz, a potem działa bez klucza. Jest mniej inteligentna niż duże AI; dla lepszych odpowiedzi wybierz innego dostawcę i dodaj klucz API.","يعمل الذكاء الاصطناعي المدمج على هذا الجهاز. ينزّل النموذج مرة واحدة ثم يعمل دون مفتاح. هو أقل ذكاءً من النماذج الكبيرة؛ لإجابات أفضل اختر مزوّدًا آخر وأضف مفتاح API."],
'모델 지우기':['Remove model','Eliminar modelo','Supprimer le modèle','Modell löschen','モデルを削除',"删除模型","Remover modelo","Удалить модель","Modeli kaldır","Unplus model","제거하다 model","Rimuovi modello","Usuń model","إزالة النموذج"],
'지금 받아 두기':['Download now','Descargar ahora','Télécharger','Jetzt laden','今ダウンロード',"立即下载","Baixar agora","Скачать сейчас","Şimdi indir","Gettake now","아래로 짐 지금","Scarica ora","Pobierz teraz","نزّل الآن"],
'이 모델은 쓸 준비가 됐어요':['This model is ready to use','Este modelo está listo','Ce modèle est prêt','Dieses Modell ist bereit','このモデルは使えます',"这个模型可以使用了","Este modelo está pronto para uso","Эта модель готова к работе","Bu model kullanıma hazır","This model is ready to do","이것 model 이다 준비된 에게 사용하다","Questo modello è pronto all'uso","Ten model jest gotowy do użycia","هذا النموذج جاهز للاستخدام"],
'저장하면 처음 쓸 때 모델을 받아요':['After saving, the model downloads the first time you use it','Tras guardar, el modelo se descarga la primera vez que lo uses','Après l’enregistrement, le modèle se télécharge à la première utilisation','Nach dem Speichern wird das Modell beim ersten Gebrauch geladen','保存すると最初に使うときにモデルをダウンロードします',"保存后，模型会在第一次使用时下载","Depois de salvar, o modelo é baixado no primeiro uso","После сохранения модель скачается при первом использовании","Kaydettikten sonra model ilk kullanımda indirilir","Unbefore saving, model downloads one time you do it","후에 구하하는 중, 그 model 아래로 짐들 그 첫째 시간 당신 사용하다 그것","Dopo il salvataggio, il modello si scarica al primo utilizzo","Po zapisaniu model pobierze się przy pierwszym użyciu","بعد الحفظ، يُنزَّل النموذج عند أول استخدام"],
'AI 설정':['AI settings','Ajustes de IA','Réglages IA','KI-Einstellungen','AI設定',"AI 设置","Configurações de IA","Настройки ИИ","Yapay zekâ ayarları","AI rules","AI 환경들","Impostazioni IA","Ustawienia AI","إعدادات الذكاء الاصطناعي"],
'AI 회사':['AI provider','Proveedor de IA','Fournisseur IA','KI-Anbieter','AI会社',"AI 提供方","Provedor de IA","Провайдер ИИ","Yapay zekâ sağlayıcısı","AI provider","AI 회사","Fornitore di IA","Dostawca AI","مزوّد الذكاء الاصطناعي"],
'API 키':['API key','Clave API','Clé API','API-Schlüssel','APIキー',"API 密钥","Chave de API","API-ключ","API anahtarı","API thing","API 열쇠","Chiave API","Klucz API","مفتاح API"],
'모델':['Model','Modelo','Modèle','Modell','モデル',"模型","Modelo","Модель","Model","Model","모델","Modello","Model","النموذج"],
'키 받는 곳':['Get a key','Obtener una clave','Obtenir une clé','Schlüssel holen','キーを取得',"获取密钥","Obter uma chave","Получить ключ","Anahtar al","Get thing","얻다 하나의 열쇠","Ottieni una chiave","Zdobądź klucz","احصل على مفتاح"],
'무료 키 가능':['free keys available','claves gratis disponibles','clés gratuites possibles','kostenlose Schlüssel möglich','無料キーあり',"有免费密钥","chaves grátis disponíveis","есть бесплатные ключи","ücretsiz anahtar var","uncost keys available","free 열쇠들 이용 가능한","chiavi gratuite disponibili","dostępne darmowe klucze","تتوفر مفاتيح مجانية"],
'키는 이 브라우저에만 저장되고, 이 사이트가 아니라 고른 AI 회사로만 바로 보내져요. 공용 컴퓨터에서는 다 쓴 뒤 키 지우기를 눌러 주세요.':['The key is stored only in this browser and goes straight to the AI provider you chose, never to this site. On a shared computer, press Remove key when you are done.','La clave solo se guarda en este navegador y va directo al proveedor elegido, nunca a este sitio. En un equipo compartido, pulsa Quitar clave al terminar.','La clé reste dans ce navigateur et part directement chez le fournisseur choisi, jamais vers ce site. Sur un ordinateur partagé, appuie sur Supprimer la clé à la fin.','Der Schlüssel bleibt in diesem Browser und geht direkt an den gewählten Anbieter, nie an diese Seite. Auf geteilten Geräten danach „Schlüssel löschen“ drücken.','キーはこのブラウザだけに保存され、このサイトではなく選んだAI会社へ直接送られます。共用PCでは使い終わったらキーを削除してください。',"密钥只保存在这个浏览器中，直接发送给你选择的 AI 提供方，绝不会发给本站。在共用电脑上，用完后请按删除密钥。","A chave fica só neste navegador e vai direto ao provedor de IA escolhido, nunca a este site. Num computador compartilhado, aperte Remover chave ao terminar.","Ключ хранится только в этом браузере и отправляется напрямую выбранному провайдеру ИИ, а не этому сайту. На общем компьютере по окончании нажмите «Удалить ключ».","Anahtar yalnızca bu tarayıcıda saklanır ve doğrudan seçtiğin yapay zekâ sağlayıcısına gider, asla bu siteye gitmez. Ortak bir bilgisayardaysan işin bitince Anahtarı kaldır'a bas.","Thing is stored only in this telescreen plus goes straight to AI provider you chose, untime to this ministry. On shared computer, touch Unplus thing when you is done.","그 열쇠 이다 저장하했다 오직 안에 이것 훑어보는 사람 그리고 가다들 곧은 에게 그 AI provider 당신 chose, 절대 에게 이것 현장. 위에 하나의 주식했다 계산기, 언론 제거하다 열쇠 언제 당신 이다 된.","La chiave è salvata solo in questo browser e va direttamente al fornitore di IA scelto, mai a questo sito. Su un computer condiviso, premi Rimuovi chiave quando hai finito.","Klucz jest zapisany tylko w tej przeglądarce i trafia prosto do wybranego dostawcy AI, nigdy do tej strony. Na wspólnym komputerze po skończeniu naciśnij Usuń klucz.","يُحفظ المفتاح في هذا المتصفح فقط ويذهب مباشرة إلى مزوّد الذكاء الاصطناعي الذي اخترته، ولا يصل إلى هذا الموقع أبدًا. على حاسوب مشترك، اضغط إزالة المفتاح عند الانتهاء."],
'연결 확인':['Test','Probar','Tester','Testen','接続テスト',"测试","Testar","Проверить","Test et","Truthtest","시험","Prova","Testuj","اختبار"],
'저장':['Save','Guardar','Enregistrer','Speichern','保存',"保存","Salvar","Сохранить","Kaydet","Truekeep","구하다!","Salva","Zapisz","حفظ"],
'키 지우기':['Remove key','Quitar clave','Supprimer la clé','Schlüssel löschen','キーを削除',"删除密钥","Remover chave","Удалить ключ","Anahtarı kaldır","Unplus thing","제거하다 열쇠","Rimuovi chiave","Usuń klucz","إزالة المفتاح"],
'확인 중…':['Checking…','Comprobando…','Vérification…','Prüfe…','確認中…',"检查中……","Verificando…","Проверяем…","Kontrol ediliyor…","Checking…","수표하는 중…","Verifica…","Sprawdzanie…","جارٍ التحقق…"],
'연결됐어요':['Connected','Conectado','Connecté','Verbunden','接続できました',"已连接","Conectado","Подключено","Bağlandı","Connected","연결되었습니다","Connesso","Połączono","متصل"],
'키를 넣어 주세요':['Enter a key','Escribe una clave','Saisis une clé','Schlüssel eingeben','キーを入力してください',"请输入密钥","Digite uma chave","Введите ключ","Bir anahtar gir","Enter thing","들어가다 하나의 열쇠","Inserisci una chiave","Wpisz klucz","أدخل مفتاحًا"],
'키가 맞지 않아요':['The key was rejected','La clave fue rechazada','La clé a été refusée','Schlüssel abgelehnt','キーが正しくありません',"密钥被拒绝","A chave foi recusada","Ключ отклонён","Anahtar reddedildi","Thing was rejected","그 열쇠 였다 rejected","La chiave è stata rifiutata","Klucz został odrzucony","رُفض المفتاح"],
'요청이 너무 많아요. 조금 뒤에 다시 해 주세요':['Too many requests. Try again shortly','Demasiadas solicitudes. Inténtalo luego','Trop de requêtes. Réessaie plus tard','Zu viele Anfragen. Gleich nochmal versuchen','リクエストが多すぎます。少し後で試してください',"请求太多。请稍后再试","Muitas solicitações. Tente de novo em instantes","Слишком много запросов. Попробуйте чуть позже","Çok fazla istek. Birazdan tekrar dene","Plusmany asks. Redo shortwise","또한 많은 요청들. 시도하다 다시 짧하게","Troppe richieste. Riprova tra poco","Zbyt wiele żądań. Spróbuj za chwilę","طلبات كثيرة جدًا. حاول بعد قليل"],
'AI에 연결하지 못했어요':['Could not reach the AI','No se pudo conectar con la IA','Impossible de joindre l’IA','KI nicht erreichbar','AIに接続できませんでした',"无法连接到 AI","Não foi possível acessar a IA","Не удалось связаться с ИИ","Yapay zekâya ulaşılamadı","Could unreach AI","할 수 있었다 아니다 도달하다 그 AI","Impossibile raggiungere l'IA","Nie udało się połączyć z AI","تعذّر الوصول إلى الذكاء الاصطناعي"],
'AI가 이 요청에는 답하지 않았어요':['The AI declined this request','La IA rechazó esta solicitud','L’IA a refusé cette demande','Die KI hat abgelehnt','AIがこのリクエストに応答しませんでした',"AI 拒绝了这个请求","A IA recusou este pedido","ИИ отклонил этот запрос","Yapay zekâ bu isteği reddetti","AI declined this ask","그 AI declined 이것 요청","L'IA ha rifiutato questa richiesta","AI odrzuciła tę prośbę","رفض الذكاء الاصطناعي هذا الطلب"],
'AI를 쓰려면 먼저 API 키를 넣어 주세요':['Add an API key first to use AI','Añade primero una clave API','Ajoute d’abord une clé API','Zuerst einen API-Schlüssel eintragen','AIを使うには先にAPIキーを入れてください',"请先添加 API 密钥再使用 AI","Adicione uma chave de API antes de usar a IA","Сначала добавьте API-ключ, чтобы пользоваться ИИ","Yapay zekâyı kullanmak için önce bir API anahtarı ekle","Plus API thing one to do AI","더하다 하나의 API 열쇠 첫째 에게 사용하다 AI","Aggiungi prima una chiave API per usare l'IA","Najpierw dodaj klucz API, aby korzystać z AI","أضف مفتاح API أولًا لاستخدام الذكاء الاصطناعي"],
'보이기':['Show','Mostrar','Afficher','Zeigen','表示',"显示","Mostrar","Показать","Göster","See","쇼","Mostra","Pokaż","إظهار"],
'닫기':['Close','Cerrar','Fermer','Schließen','閉じる',"关闭","Fechar","Закрыть","Kapat","Unopen","가까운","Chiudi","Zamknij","إغلاق"],
'열 때 미리 불러오기':['Preload when a page opens','Precargar al abrir la página','Précharger à l’ouverture de la page','Beim Öffnen der Seite vorladen','ページを開いたときに先に読み込む',"打开页面时预加载","Pré-carregar ao abrir uma página","Предзагрузка при открытии страницы","Sayfa açılınca önceden yükle","Preload when telescreen opens","Preload 언제 하나의 페이지 연다","Precarica all'apertura della pagina","Wczytuj wstępnie po otwarciu strony","تحميل مسبق عند فتح الصفحة"],
'받아 둔 모델을 페이지를 열면 바로 뒤에서 올려 둬요. 첫 질문이 빨라지는 대신 그래픽카드 메모리(VRAM)를 계속 써요.':['The saved model loads in the background as soon as a page opens. The first question is faster, but it keeps graphics memory (VRAM) in use.','El modelo guardado se carga en segundo plano al abrir la página. La primera pregunta es más rápida, pero ocupa memoria gráfica (VRAM).','Le modèle enregistré se charge en arrière-plan à l’ouverture de la page. La première question est plus rapide, mais la mémoire graphique (VRAM) reste occupée.','Das gespeicherte Modell lädt beim Öffnen der Seite im Hintergrund. Die erste Frage geht schneller, belegt aber Grafikspeicher (VRAM).','保存したモデルをページを開くとすぐ裏で読み込みます。最初の質問は速くなりますが、グラフィックメモリ(VRAM)を使い続けます。',"页面一打开，保存的模型就会在后台加载。第一个问题会更快，但会一直占用显存（VRAM）。","O modelo salvo carrega em segundo plano assim que a página abre. A primeira pergunta fica mais rápida, mas a memória gráfica (VRAM) fica ocupada.","Сохранённая модель загружается в фоне сразу при открытии страницы. Первый вопрос будет быстрее, но видеопамять (VRAM) останется занятой.","Kayıtlı model sayfa açılır açılmaz arka planda yüklenir. İlk soru daha hızlı olur ama grafik belleği (VRAM) kullanımda kalır.","Truekept model loads in backthing as plusnow as telescreen opens. one doubt is speedfuller, but it keeps graphics memory (VRAM) in do.","그 구원받은 model 짐들 안에 그 배경 처럼 곧 처럼 하나의 페이지 연다. 그 첫째 question 이다 더 빠른, 그러나 그것 유지하다들 graphics memory (VRAM) 안에 사용하다.","Il modello salvato si carica in background appena si apre una pagina. La prima domanda è più veloce, ma la memoria grafica (VRAM) resta occupata.","Zapisany model ładuje się w tle, gdy tylko otworzysz stronę. Pierwsze pytanie jest szybsze, ale pamięć graficzna (VRAM) pozostaje zajęta.","يُحمَّل النموذج المحفوظ في الخلفية فور فتح الصفحة. يصبح السؤال الأول أسرع، لكنه يُبقي ذاكرة الرسوميات (VRAM) مشغولة."],
/* translations for i18n-todo 2026-10-18 */
"약 1GB":["about 1 GB","unos 1 GB","environ 1 Go","ca. 1 GB","約1GB","约 1 GB","cerca de 1 GB","около 1 ГБ","yaklaşık 1 GB","about 1 GB","대하여 1 GB","circa 1 GB","około 1 GB","نحو 1 غيغابايت"],
"약 2.5GB":["about 2.5 GB","unos 2,5 GB","environ 2,5 Go","ca. 2,5 GB","約2.5GB","约 2.5 GB","cerca de 2,5 GB","около 2,5 ГБ","yaklaşık 2,5 GB","about 2.5 GB","대하여 2.5 GB","circa 2,5 GB","około 2,5 GB","نحو 2.5 غيغابايت"],
"약 5GB":["about 5 GB","unos 5 GB","environ 5 Go","ca. 5 GB","約5GB","约 5 GB","cerca de 5 GB","около 5 ГБ","yaklaşık 5 GB","about 5 GB","대하여 5 GB","circa 5 GB","około 5 GB","نحو 5 غيغابايت"],
"가장 가볍고 빨라요. 태블릿이나 오래된 컴퓨터에서도 돌아가요.":["The lightest and fastest. Runs even on tablets and older computers.","El más ligero y rápido. Funciona incluso en tabletas y ordenadores antiguos.","Le plus léger et le plus rapide. Fonctionne même sur tablette et sur un ordinateur ancien.","Am leichtesten und schnellsten. Läuft auch auf Tablets und älteren Computern.","いちばん軽くて速いです。タブレットや古いパソコンでも動きます。","最轻最快。平板和旧电脑也能运行。","O mais leve e rápido. Roda até em tablets e computadores antigos.","Самая лёгкая и быстрая. Работает даже на планшетах и старых компьютерах.","En hafif ve en hızlısı. Tabletlerde ve eski bilgisayarlarda bile çalışır.","Lightest plus fastest. Speedgoes plus on tablets plus unnew computers.","그 lightest 그리고 fastest. 달리다들 짝수 위에 tablets 그리고 older 계산기들.","Il più leggero e veloce. Funziona anche su tablet e computer datati.","Najlżejszy i najszybszy. Działa nawet na tabletach i starszych komputerach.","الأخف والأسرع. يعمل حتى على الأجهزة اللوحية والحواسيب القديمة."],
"속도와 똑똑함이 균형 잡힌 기본 모델이에요.":["The default model, balancing speed and smarts.","El modelo predeterminado, con equilibrio entre velocidad e inteligencia.","Le modèle par défaut, équilibré entre vitesse et intelligence.","Das Standardmodell mit ausgewogener Geschwindigkeit und Intelligenz.","速さと賢さのバランスがとれた標準モデルです。","默认模型，兼顾速度和聪明程度。","O modelo padrão, equilibrando velocidade e inteligência.","Модель по умолчанию: баланс скорости и ума.","Hız ve zekâyı dengeleyen varsayılan model.","Default model, balancing speed plus smarts.","속도와 똑똑함이 균형 잡힌 기본 모델입니다.","Il modello predefinito, bilanciato tra velocità e intelligenza.","Domyślny model, równoważący szybkość i inteligencję.","النموذج الافتراضي، يوازن بين السرعة والذكاء."],
"가장 똑똑해요. 그래픽카드 메모리 8GB 이상인 컴퓨터용이에요.":["The smartest. For computers with 8 GB or more of graphics memory.","El más listo. Para ordenadores con 8 GB o más de memoria gráfica.","Le plus intelligent. Pour les ordinateurs avec 8 Go de mémoire graphique ou plus.","Am klügsten. Für Computer mit mindestens 8 GB Grafikspeicher.","いちばん賢いです。グラフィックメモリ8GB以上のパソコン向けです。","最聪明。适合显存 8 GB 以上的电脑。","O mais esperto. Para computadores com 8 GB ou mais de memória gráfica.","Самая умная. Для компьютеров с видеопамятью от 8 ГБ.","En akıllısı. 8 GB veya daha fazla grafik belleği olan bilgisayarlar için.","Smartest. For computers with 8 GB or plusof graphics memory.","그 smartest. 위하여 계산기들 와 함께 8 GB 또는 더 의 graphics memory.","Il più intelligente. Per computer con 8 GB o più di memoria grafica.","Najmądrzejszy. Dla komputerów z co najmniej 8 GB pamięci graficznej.","الأذكى. للحواسيب ذات ذاكرة رسومية 8 غيغابايت أو أكثر."],
"가장 똑똑한 모델이에요. 어려운 일에 알맞고 답이 조금 느려요.":["The smartest model. Best for hard tasks; answers a little more slowly.","El modelo más listo. Ideal para tareas difíciles; responde algo más lento.","Le modèle le plus intelligent. Idéal pour les tâches difficiles ; répond un peu plus lentement.","Das klügste Modell. Gut für schwierige Aufgaben, antwortet etwas langsamer.","いちばん賢いモデルです。難しい作業向けで、答えは少し遅めです。","最聪明的模型。最适合难题；回答稍慢。","O modelo mais esperto. Melhor para tarefas difíceis; responde um pouco mais devagar.","Самая умная модель. Для сложных задач; отвечает чуть медленнее.","En akıllı model. Zor işler için en iyisi; biraz daha yavaş cevaplar.","Smartest model. Goodest for hard tasks; truths unbig plusunfastwise.","가장 똑똑한 모델입니다. 어려운 일에 알맞고 답이 조금 느립니다.","Il modello più intelligente. Ideale per i compiti difficili; risponde un po' più lentamente.","Najmądrzejszy model. Najlepszy do trudnych zadań; odpowiada nieco wolniej.","أذكى نموذج. الأفضل للمهام الصعبة؛ يجيب أبطأ قليلًا."],
"속도와 똑똑함이 균형 잡힌 모델이에요.":["A model that balances speed and smarts.","Un modelo con equilibrio entre velocidad e inteligencia.","Un modèle équilibré entre vitesse et intelligence.","Ein Modell mit ausgewogener Geschwindigkeit und Intelligenz.","速さと賢さのバランスがとれたモデルです。","兼顾速度和聪明程度的模型。","Um modelo que equilibra velocidade e inteligência.","Модель с балансом скорости и ума.","Hız ve zekâyı dengeleyen bir model.","Model that balances speed plus smarts.","하나의 model 저것 잔고들 속도 그리고 smarts.","Un modello che bilancia velocità e intelligenza.","Model równoważący szybkość i inteligencję.","نموذج يوازن بين السرعة والذكاء."],
"가장 빠른 모델이에요. 간단한 일에 알맞아요.":["The fastest model. Good for simple tasks.","El modelo más rápido. Ideal para tareas sencillas.","Le modèle le plus rapide. Idéal pour les tâches simples.","Das schnellste Modell. Gut für einfache Aufgaben.","いちばん速いモデルです。簡単な作業に向いています。","最快的模型。适合简单任务。","O modelo mais rápido. Bom para tarefas simples.","Самая быстрая модель. Для простых задач.","En hızlı model. Basit işler için iyi.","Fastest model. Good for simple tasks.","가장 빠른 모델입니다. 간단한 일에 알맞습니다.","Il modello più veloce. Adatto ai compiti semplici.","Najszybszy model. Dobry do prostych zadań.","أسرع نموذج. مناسب للمهام البسيطة."],
"빠르고 가벼운 모델이에요. 무료 키로도 쓸 수 있어요.":["A fast, light model. Works with a free key too.","Un modelo rápido y ligero. También funciona con una clave gratuita.","Un modèle rapide et léger. Fonctionne aussi avec une clé gratuite.","Ein schnelles, leichtes Modell. Funktioniert auch mit einem kostenlosen Schlüssel.","速くて軽いモデルです。無料キーでも使えます。","快速轻量的模型。免费密钥也能用。","Um modelo rápido e leve. Funciona com chave grátis também.","Быстрая лёгкая модель. Работает и с бесплатным ключом.","Hızlı, hafif bir model. Ücretsiz anahtarla da çalışır.","Fast, light model. Does with uncost thing plus.","하나의 단식, 빛 model. 작품들 와 함께 하나의 free 열쇠 또한.","Un modello veloce e leggero. Funziona anche con una chiave gratuita.","Szybki, lekki model. Działa też z darmowym kluczem.","نموذج سريع وخفيف. يعمل مع مفتاح مجاني أيضًا."],
"더 똑똑한 모델이에요. 답이 조금 느려요.":["A smarter model. Answers a little more slowly.","Un modelo más listo. Responde algo más lento.","Un modèle plus intelligent. Répond un peu plus lentement.","Ein klügeres Modell. Antwortet etwas langsamer.","より賢いモデルです。答えは少し遅めです。","更聪明的模型。回答稍慢。","Um modelo mais esperto. Responde um pouco mais devagar.","Модель поумнее. Отвечает чуть медленнее.","Daha akıllı bir model. Biraz daha yavaş cevaplar.","Smarter model. Truths unbig plusunfastwise.","더 똑똑한 모델입니다. 답이 조금 느립니다.","Un modello più intelligente. Risponde un po' più lentamente.","Mądrzejszy model. Odpowiada nieco wolniej.","نموذج أذكى. يجيب أبطأ قليلًا."],
"빠르고 가벼운 모델이에요.":["A fast, light model.","Un modelo rápido y ligero.","Un modèle rapide et léger.","Ein schnelles, leichtes Modell.","速くて軽いモデルです。","快速轻量的模型。","Um modelo rápido e leve.","Быстрая лёгкая модель.","Hızlı, hafif bir model.","Fast, light model.","하나의 단식, 빛 model.","Un modello veloce e leggero.","Szybki, lekki model.","نموذج سريع وخفيف."],
"더 똑똑한 모델이에요.":["A smarter model.","Un modelo más listo.","Un modèle plus intelligent.","Ein klügeres Modell.","より賢いモデルです。","更聪明的模型。","Um modelo mais esperto.","Модель поумнее.","Daha akıllı bir model.","Smarter model.","더 똑똑한 모델입니다.","Un modello più intelligente.","Mądrzejszy model.","نموذج أذكى."]
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
      var msgs=(sys?[{role:'system',content:sys}]:[]).concat(o.history||[],[{role:'user',content:o.prompt}]);
      var req={messages:msgs, max_tokens:Math.min(o.maxTokens||2048,2560), temperature:o.temperature||0.3, extra_body:{enable_thinking:false}};
      if(prose){ req.max_tokens=Math.min(o.maxTokens||PROSE.maxTokens,o.chat?1000:PROSE.maxTokens); req.temperature=PROSE.temperature; req.top_p=PROSE.top_p; req.presence_penalty=PROSE.presence_penalty; }
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
var ME={'FF-Tools-1.7B':{name:'tarius', who:'You are FF777 1.6 tarius, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 1.7B. Your name is the end of the Latin word elementarius ("basic"). '+HUMOR},
        'FF-Tools-4B':{name:'lectus', who:'You are FF777 1.7 lectus, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 4B. Your name is the end of the Latin word intellectus ("understanding"). '+HUMOR},
        'FF-Tools-8B':{name:'premus', who:'You are FF777 1.7 premus, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 8B. Your name is the end of the Latin word supremus ("supreme"). '+HUMOR}};
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
  if(o.model&&TUNED[o.model]) c={provider:'local', key:'', model:o.model, local:true, localOk:true}; // a page that lets people pick one of our models (ai-chat/) leaves the saved AI setting alone
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
'.ffai-mrow{display:flex;gap:8px;align-items:center}.ffai-mrow select{flex:1;min-width:0}.ffai-mi{width:34px;height:34px;flex:none;border-radius:9px}'+
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
    '<label class="l-m"></label><div class="ffai-mrow"><img class="ffai-mi" alt="" width="34" height="34" hidden><select class="m"></select></div>'+
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
function syncIco(){ var m=ov.querySelector('.m'), i=ov.querySelector('.ffai-mi'), u=cur.provider==='local'?icon(m.value):''; i.hidden=!u; if(u) i.src=u; }
function fill(){
  var p=PROVIDERS[cur.provider], q=function(s){ return ov.querySelector(s); };
  ov.querySelectorAll('.ffai-seg button').forEach(function(b){ b.classList.toggle('on',b.dataset.p===cur.provider); });
  q('.k').value=cur.keys[cur.provider]||''; q('.k').placeholder=p.ph; q('.k').type='password';
  var a=q('.ffai-link'); a.href=p.keyUrl; a.textContent=T('키 받는 곳')+' ↗'; q('.ffai-free').textContent=p.free?'· '+T('무료 키 가능'):'';
  q('.m').innerHTML=p.models.map(function(m){ return '<option value="'+m[0]+'">'+(p.local?T(m[1]):m[1])+(m[2]?' · '+T(m[2]):'')+'</option>'; }).join(''); q('.m').value=cur.models[cur.provider]||p.models[0][0]; if(q('.m').selectedIndex<0) q('.m').value=p.models[0][0];
  if(!q('.m')._sy){ q('.m')._sy=1; q('.m').addEventListener('change',syncIco); } syncIco();
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
var ICOS={'FF-Tools-1.7B':'tarius','FF-Tools-4B':'lectus','FF-Tools-8B':'premus'};
function icon(id){ return ICOS[id]?BASE+'icons/ai/'+ICOS[id]+'.svg':''; }
window.FFAI={icon:icon, models:function(){ return PROVIDERS.local.models.map(function(m){ return {id:m[0], name:m[1], size:m[2], note:m[3]}; }); }, tunedReady:probeTuned, gpu:function(){ return gpuOk==null?checkGPU():Promise.resolve(gpuOk); }, facts:facts, ready:ready, load:function(m){ return engine(m).then(function(){ return true; },function(){ return false; }); }, isLocal:isLocal, isTuned:isTuned, model:function(){ return cfg().model; }, stop:stop, settings:settings, ask:ask, parseJSON:parseJSON, config:cfg};
})();
