/* AI 체험(ai-chat/)의 "목록에서 꺼내 말하기": 아재개그와 자기소개는 모델이 지어내지 않고 우리가 가진 목록에서 짝 그대로 꺼내 말해요.
   (모델은 문제와 정답 짝을 외우다 섞는 일이 있어서, 이 두 가지만은 목록으로 100% 맞게 답해요. 나머지 질문은 그대로 모델이 답해요.)
   FFJoke.reply(text, st, model) -> {text, kind} 또는 null(모델이 답해요).  st = {last, used} 한 대화 안에서 쓰는 기억(가장 최근 개그, 이미 한 개그).
   model = {id, name} (자기소개용).  Node에서도 돌아가요 (module.exports). 개그 목록은 주인(Frenchfries777)이 준 115개: [문제, 정답]. */
(function(root){
'use strict';
var J=[
["비 오는 날 먹는 햄은?", "습햄"],
["몸에 안 좋은 청바지는?", "유해진"],
["바람이 귀엽게 부는 곳은?", "분당"],
["부엉이가 물에 빠지면?", "첨부엉 첨부엉"],
["딸기가 직장을 잃으면?", "딸기시럽"],
["빵이 목장에 간 이유는?", "소보로"],
["형제가 싸울 때 동생 편만 드는 세상은?", "형 편 없는 세상"],
["3월에 대학생을 절대 못 이기는 이유는?", "개강하니까"],
["9가 자기소개하면?", "전구"],
["가장 인기 있는 벌레는?", "스타벅스"],
["가장 폭력적인 동물은?", "팬다"],
["감기에 또 걸리면?", "되감기"],
["거북이가 소화제를 먹은 이유는?", "속이 거북해서"],
["고등학생들이 싫어하는 나무는?", "야자나무"],
["고추장보다 높은 사람은?", "초고추장"],
["과자가 자기소개하면?", "전과자"],
["귤이 감을 보고 한 말은?", "유감"],
["기름을 수출하는데 걸리는 시간은?", "오일"],
["김밥이 죽으면 어디로?", "김밥천국"],
["깨가 죽으면?", "주근깨"],
["꽃게를 냉장고에 넣으면?", "게으름"],
["달에서 쓰는 언어는?", "문어"],
["독수리가 타오르면?", "이글이글"],
["돌잔치를 영어로 말하면?", "락페스티벌"],
["루이16세의 유언은?", "제목없음"],
["매일 미안해하는 동물은?", "오소리"],
["머리 아플 때 약을 얼마나 먹어야 할까?", "두통"],
["둘리가 다니는 고등학교 이름은?", "빙하 타고"],
["마늘이 싸움에서 모두 지면?", "다진 마늘"],
["왕과 작별할 때 하는 말은?", "바이킹"],
["항상 추운 나라는?", "시리아"],
["차도가 없는 나라는?", "인도"],
["이빨이 없는 곰은?", "젤리 곰"],
["할아버지가 좋아하는 돈은?", "할머니"],
["세상에서 가장 가난한 왕은?", "최저임금"],
["우주인이 술 마시는 장소는?", "스페이스바"],
["소가 불에 타면?", "탄소"],
["소가 노래한다면?", "소송"],
["소가 죽으면?", "다이소"],
["세상에서 가장 외로운 왕은?", "솔로몬"],
["꽃들이 전쟁하면?", "플라워"],
["왼쪽으로 절하면?", "좌절"],
["소금의 유통기한은?", "천일염"],
["세상에서 가장 지루한 중학교는?", "로딩 중"],
["새우가 출연하는 드라마는?", "대하드라마"],
["모든 사람을 일어나게 하는 숫자는?", "다섯"],
["비가 1시간 동안 내리면?", "추적 60분"],
["콩 한 알을 영어로 말하면?", "원빈"],
["햄버거의 색깔은?", "버건디"],
["있을 수도 있고 없을 수도 있는 섬은?", "아마도"],
["미소의 반대말은?", "당기소"],
["물고기가 싫어하는 물은?", "그물"],
["미국에 비가 내리면?", "USB"],
["서울에 사는 거지 이름은?", "설거지"],
["왕이 담배를 피우면?", "스모킹"],
["커플이 좋아하는 곤충은?", "잠자리"],
["포도가 자기소개할 때 쓰는 말은?", "포도당"],
["유부남이 제일 무서워하는 치킨은?", "마늘(마눌)치킨"],
["공이 웃으면?", "풋볼"],
["왕이 넘어질 때 들리는 소리는?", "킹콩"],
["송혜교, 송강, 송윤아의 공통점은?", "성동일"],
["혀가 거짓말할 때 하는 말은?", "전 혀 아닙니다"],
["기독교인이 강아지가 짖는 걸 보고 하는 말은?", "지져쓰"],
["신사가 자기소개할 때 하는 말은?", "신사임당"],
["도둑이 가장 싫어하는 과자는?", "누네띠네"],
["세상에서 가장 억울한 도형은?", "원통"],
["오리가 얼면?", "언덕"],
["무가 눈물을 흘리면?", "무뚝뚝"],
["어부들이 싫어하는 가수는?", "배철수"],
["세상에서 가장 똑똑한 새 이름은?", "하버드"],
["아이스크림이 죽으면?", "다이하드"],
["세상에서 가장 뜨거운 과일은?", "천도복숭아"],
["세상에서 제일 이쁜 풀은?", "뷰티풀"],
["피카츄가 담배피기전에 하는 말은?", "피까"],
["화장실에서 막 나온 사람은?", "일본 사람"],
["폭우가 심하게 쏟아질 때 필요한 사람은?", "비서"],
["김소월이 수능을 볼 때 수리 가형을 보는 이유는?", "나 보기가 역겨워"],
["죽은 소가 너무 많으면?", "산소부족"],
["물이 썩으면 나는 냄새는?", "수상한 냄새"],
["토끼들이 제일 잘하는 것은?", "토끼기"],
["사람이 먹지 못하는 간장은?", "애간장"],
["동물들 중에서 세금 내는 동물은?", "양(양도소득세)"],
["양이 한정되어 있는 음식은?", "한정식"],
["소가 머리 깎으면?", "이발소"],
["자기만 옳다고 하는 사람이 사는 집은?", "고집"],
["덜 뚱뚱한 사람들이 모여 사는 동네는?", "반포동"],
["사람이 죽지 않는 산맥은?", "안데스산맥"],
["입이 평화로우면?", "마우스피스"],
["이탈리아의 날씨는?", "습하게띠"],
["슈퍼주니어 신동 옆에 있는 사람은?", "신동엽"],
["떡집 사장이 주식을 안 하는 이유는?", "떡상할까봐"],
["닭에게 사이즈가 작은 옷을 입히면?", "꼭끼오"],
["세상에서 가장 착한 사자는?", "자원봉사자"],
["맥주가 죽기 전에 한 말은?", "유언비어"],
["한의사가 카지노에 가서 하는 말은?", "인생은 한 방"],
["술 취해서 큰 소리를 지르거나 노래 부르는 것을 사자성어로 하면?", "아빠인가"],
["개가 벽보고 한 말은?", "월월"],
["전화로 세운 건물은?", "콜로세움"],
["왕이 궁에 가기 싫을 때 하는 말은?", "궁시렁 궁시렁"],
["직접 만든 총은?", "손수건"],
["뚱뚱한 사람들이 모여있는 장소는?", "개포동"],
["세상에서 가장 뜨거운 바다는?", "열받아"],
["세상에서 가장 뜨거운 전화는?", "화상전화"],
["말이 다리가 부러지면?", "말뚝"],
["소가 그림을 그리면?", "피카소"],
["소가 웃으면?", "미소"],
["영어가 감기에 걸리면?", "에이치"],
["할아버지가 등산하면?", "산타 할아버지"],
["걸어 다니는 주머니는?", "아주머니"],
["호주에서 쓰는 돈은?", "호주머니"],
["서울에서 땅값이 싼 동네는?", "일원동"],
["세상에서 가장 긴 음식은?", "참기름"],
["차를 발로 차면?", "카놀라유"],
["다이어트하는 사람이 여름을 싫어하는 이유는?", "비만 와서"],
["아이스크림이 가수가 될 수 없는 이유는?", "녹음 안되니까"]
];
var SELF={
  'FF-Tools-1.7B':{base:'Qwen3 1.7B', latin:'elementarius', ko:'기본', tr:['basic','básico','de base','grundlegend','基本']},
  'FF-Tools-4B':{base:'Qwen3 4B', latin:'intellectus', ko:'이해력', tr:['understanding','entendimiento','compréhension','Verstand','理解力']},
  'FF-Tools-8B':{base:'Qwen3 8B', latin:'supremus', ko:'가장 높은', tr:['highest','el más alto','le plus haut','der höchste','最も高い']}
};
/* 화면 언어가 한국어가 아니면 자기소개와 '정답은 …' 같은 우리 말은 그 언어로 (개그 문제와 정답 자체는 한국어 그대로). Node에서는 한국어. */
var FFT_=root.FFT, LX={en:0,es:1,fr:2,de:3,ja:4}, li=FFT_&&LX[FFT_.lang];
if(FFT_) FFT_.add({
'저는 {0}예요. Frenchfries777 Tools 사이트의 AI이고, 개발자 Frenchfries777이 {1}를 바탕으로 만들었어요. 이름은 라틴어 {2}("{3}")의 끝에서 따왔어요. 아재개그도 좋아해요!':[
  'I’m {0}, the AI of the Frenchfries777 Tools site. The developer Frenchfries777 built me on {1}. My name comes from the end of the Latin word {2} (“{3}”). I love cheesy jokes too!',
  'Soy {0}, la IA del sitio Frenchfries777 Tools. El desarrollador Frenchfries777 me creó a partir de {1}. Mi nombre viene del final de la palabra latina {2} («{3}»). ¡También me encantan los chistes malos!',
  'Je suis {0}, l’IA du site Frenchfries777 Tools. Le développeur Frenchfries777 m’a créée à partir de {1}. Mon nom vient de la fin du mot latin {2} (« {3} »). J’adore aussi les blagues nulles !',
  'Ich bin {0}, die KI der Website Frenchfries777 Tools. Der Entwickler Frenchfries777 hat mich auf Basis von {1} gebaut. Mein Name stammt vom Ende des lateinischen Wortes {2} („{3}“). Ich mag auch Flachwitze!',
  '私は{0}です。Frenchfries777 ToolsサイトのAIで、開発者Frenchfries777が{1}をもとに作りました。名前はラテン語{2}（「{3}」）の終わりから取りました。おやじギャグも大好きです！'],
'정답은 {0}!':['The answer is: {0}!','La respuesta es: ¡{0}!','La réponse est : {0} !','Die Antwort lautet: {0}!','答えは{0}！'],
'네, 외워요! 하나 들려 드릴게요.':['Yes, I know some by heart! Here’s one.','¡Sí, me sé algunos! Ahí va uno.','Oui, j’en connais par cœur ! En voici une.','Ja, ich kenne welche auswendig! Hier ist einer.','はい、覚えています！1つ聞かせますね。']
});
function tf(t){ var a=arguments; if(FFT_&&FFT_.F) return FFT_.F.apply(null,a); return t.replace(/\{(\d)\}/g,function(_,n){ return String(a[+n+1]); }); }
function norm(s){ return String(s||'').toLowerCase().replace(/[^가-힣a-z0-9]/g,''); }
var NJ=J.map(function(x){ return norm(x[0]); });
function say(i){ return J[i][0]+'\n'+tf('정답은 {0}!',J[i][1]); }
function fresh(st){
  st.used=st.used||[]; if(st.used.length>=J.length) st.used=[];
  var left=[]; for(var i=0;i<J.length;i++) if(st.used.indexOf(i)<0) left.push(i);
  var i=left[Math.floor(Math.random()*left.length)]; st.used.push(i); st.last=i; return i;
}
/* 문제를 그대로 물으면 그 문제의 정답 (문제의 60% 이상을 담은 6글자 이상 말도 인정) */
function riddle(t){
  var n=norm(t), best=-1;
  if(n.length<3) return -1;
  for(var i=0;i<NJ.length;i++){
    if(n===NJ[i]) return i;
    if(NJ[i].length>=6&&n.indexOf(NJ[i])>=0) return i;
    if(n.length>=6&&NJ[i].indexOf(n)>=0&&n.length>=NJ[i].length*0.6&&best<0) best=i;
  }
  return best;
}
var ASKJ=/(아재\s*개그|넌센스|말장난|웃긴\s*(거|것|얘기|이야기|말)|농담|개그)/, ASKV=/(해|줘|들려|하나|내\s*봐|내봐|말해|ㄱㄱ|던져|보여|또|더|다른|심심|외워|알아)/, ASKQ=/(뭐야|뭔데|뭐지|무슨|란|이란|의미|뜻)\??\s*$/;
var MORE=/^(다른\s*거|다른\s*것|하나\s*더|한\s*번\s*더|또|더|또\s*해|다시)\s*[?!.~]*$/, ANS=/^(뭔데|몰라|모르겠어|모르겠는데|정답|정답이?\s*뭐야|답이?\s*뭐야|정답\s*알려\s*줘|답\s*알려\s*줘|정답\s*뭐야|힌트)\s*[?!.~]*$/;
var WHO=/(너\s*누구|넌\s*누구|누구\s*야|이름이?\s*뭐|이름\s*알려|자기\s*소개|누가\s*만들|무슨\s*모델|어떤\s*모델)/;
/* the same question in the other site languages (the "너는 누구야?" example chip is sent translated) */
var WHO2=/^\s*[¿]?\s*(who\s+are\s+you|what('?s|\s+is)\s+your\s+name|qui[eé]n\s+eres|c[oó]mo\s+te\s+llamas|qui\s+es[\s-]+tu|comment\s+tu\s+t[’']appelles|wer\s+bist\s+du|wie\s+hei(ß|ss)t\s+du|(あなた|君|きみ)は(誰|だれ)|お名前は|名前は)/i;
function self_(model){
  var s=SELF[model&&model.id]; if(!s) return null;
  var nm=(model.name||'FF777').replace(/^\s+|\s+$/g,'');
  return tf('저는 {0}예요. Frenchfries777 Tools 사이트의 AI이고, 개발자 Frenchfries777이 {1}를 바탕으로 만들었어요. 이름은 라틴어 {2}("{3}")의 끝에서 따왔어요. 아재개그도 좋아해요!',nm,s.base,s.latin,li!=null?s.tr[li]:s.ko);
}
function reply(text, st, model){
  var t=String(text||'').trim(); if(!t||t.length>80) return null; st=st||{};
  var r=riddle(t);
  if(r>=0){ st.last=r; return {text:tf('정답은 {0}!',J[r][1]), kind:'answer'}; }
  if(st.last!=null&&ANS.test(t)) return {text:say(st.last), kind:'answer'};
  if(st.last!=null&&MORE.test(t)) return {text:say(fresh(st)), kind:'joke'};
  if(ASKJ.test(t)&&ASKV.test(t)&&!ASKQ.test(t)) return {text:(/외워|알아/.test(t)?tf('네, 외워요! 하나 들려 드릴게요.')+'\n':'')+say(fresh(st)), kind:'joke'};
  if(t.length<=24&&(WHO.test(t)||WHO2.test(t))){ var s=self_(model); if(s){ st.last=null; return {text:s, kind:'self'}; } }
  st.last=null; return null;
}
var api={reply:reply, jokes:J, riddle:riddle};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.FFJoke=api;
})(typeof window!=='undefined'?window:globalThis);
