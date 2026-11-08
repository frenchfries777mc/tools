#!/usr/bin/env node
/* FF777 extra CODE data (2026-11-08): Block HTML pages built from many content pools (quiz topics, word cards, conversion pairs, team names, poll options ...),
   each with its matching request in several phrasings (Korean / casual / English). Pages are plain, balanced and run-checked by train/gen22-code-check.js
   (opens every page in the real Block HTML preview frame, presses every button, fails on any script error).
   node train/gen22-code.js [N]  -> train/raw/gen22-code.jsonl ({id,q,cur:null,html}) */
'use strict';
const fs=require('fs'), path=require('path');
const N=+process.argv[2]||4000;
let seed=20261109; const rnd=()=>{ seed=(seed+0x6D2B79F5)|0; let t=Math.imul(seed^(seed>>>15),1|seed); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
const int=(a,b)=>a+Math.floor(rnd()*(b-a+1)), pick=a=>a[Math.floor(rnd()*a.length)], chance=p=>rnd()<p;
const shuffle=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const sample=(a,n)=>shuffle(a).slice(0,n);
function batch(tok){ const ch=tok.slice(-1), code=ch.charCodeAt(0); if(code>=0xAC00&&code<=0xD7A3) return (code-0xAC00)%28; if(/[0-9]/.test(ch)) return '013678'.indexOf(ch)>=0?('178'.indexOf(ch)>=0?8:1):0; return 0; }
function K(str){ return String(str).replace(/([^\s·,.()?!"]+?)(은\(는\)|이\(가\)|을\(를\)|와\(과\)|\(으\)로|이랑|\(이\)면)/g,(m,w,j)=>{ const b=batch(w);
  const r={'은(는)':b?'은':'는','이(가)':b?'이':'가','을(를)':b?'을':'를','와(과)':b?'과':'와','(으)로':(b&&b!==8)?'으로':'로','이랑':b?'이랑':'랑','(이)면':b?'이면':'면'}[j]; return w+r; }); }
const json=x=>JSON.stringify(x);
const BGS=[['#fff8e1','light'],['#e0f2fe','light'],['#dcfce7','light'],['#fce7f3','light'],['#ede9fe','light'],['#ffedd5','light'],['#f1f5f9','light'],['#111827','dark']];
const COLORS=[['빨간색','#ef4444'],['파란색','#3b82f6'],['노란색','#eab308'],['초록색','#22c55e'],['보라색','#8b5cf6'],['주황색','#f97316'],['분홍색','#ec4899'],['하늘색','#38bdf8']];
function page(p,body,script,css){
  const dark=p.bg==='#111827', fg=dark?'#f9fafb':'#1f2937', card=dark?'#1f2937':'#ffffff';
  const base=['body { font-family: sans-serif; text-align: center; background: '+p.bg+'; color: '+fg+'; padding: 24px; }','button { font-size: 18px; padding: 10px 18px; margin: 4px; cursor: pointer; }'];
  if(css) base.push(...css.replace(/CARD/g,card).split('\n'));
  return '<!DOCTYPE html>\n<html lang="'+(p.lang||'ko')+'">\n<head>\n  <meta charset="UTF-8">\n  <title>'+p.title+'</title>\n  <style>\n'+base.map(l=>'    '+l).join('\n')+'\n  </style>\n</head>\n<body>\n'+
    body.split('\n').map(l=>'  '+l).join('\n')+'\n  <script>\n'+script.split('\n').map(l=>l?'    '+l:l).join('\n')+'\n  </script>\n</body>\n</html>\n'; }

/* ---------- pools ---------- */
const POOL={
  capital:{name:'나라 수도',en:'capital city',q:k=>k+'의 수도는?',pairs:[['대한민국','서울'],['일본','도쿄'],['중국','베이징'],['미국','워싱턴'],['영국','런던'],['프랑스','파리'],['독일','베를린'],['이탈리아','로마'],['스페인','마드리드'],['캐나다','오타와'],['호주','캔버라'],['러시아','모스크바'],['인도','뉴델리'],['이집트','카이로'],['브라질','브라질리아'],['태국','방콕'],['베트남','하노이'],['그리스','아테네'],['튀르키예','앙카라'],['멕시코','멕시코시티']]},
  sound:{name:'동물 울음소리',en:'animal sound',q:k=>k+'의 울음소리는?',pairs:[['개','멍멍'],['고양이','야옹'],['소','음메'],['돼지','꿀꿀'],['닭','꼬꼬댁'],['오리','꽥꽥'],['개구리','개굴개굴'],['병아리','삐약삐약'],['사자','어흥'],['양','메에'],['참새','짹짹'],['까마귀','까악까악'],['부엉이','부엉부엉']]},
  planet:{name:'행성',en:'planet',q:k=>'태양에서 '+k+'번째로 가까운 행성은?',pairs:[['1','수성'],['2','금성'],['3','지구'],['4','화성'],['5','목성'],['6','토성'],['7','천왕성'],['8','해왕성']]},
  color:{name:'영어 색깔',en:'color word',q:k=>"'"+k+"'의 영어 단어는?",pairs:[['빨강','red'],['파랑','blue'],['노랑','yellow'],['초록','green'],['보라','purple'],['주황','orange'],['분홍','pink'],['검정','black'],['하양','white'],['갈색','brown'],['회색','gray']]},
  animal:{name:'영어 동물',en:'animal word',q:k=>"'"+k+"'의 영어 단어는?",pairs:[['강아지','dog'],['고양이','cat'],['토끼','rabbit'],['사자','lion'],['호랑이','tiger'],['코끼리','elephant'],['기린','giraffe'],['원숭이','monkey'],['곰','bear'],['말','horse'],['돼지','pig'],['오리','duck']]},
  fruit:{name:'영어 과일',en:'fruit word',q:k=>"'"+k+"'의 영어 단어는?",pairs:[['사과','apple'],['바나나','banana'],['딸기','strawberry'],['포도','grape'],['수박','watermelon'],['귤','tangerine'],['복숭아','peach'],['배','pear'],['레몬','lemon'],['체리','cherry']]},
  school:{name:'영어 학용품',en:'school item word',q:k=>"'"+k+"'의 영어 단어는?",pairs:[['연필','pencil'],['지우개','eraser'],['책','book'],['가방','bag'],['의자','chair'],['책상','desk'],['공책','notebook'],['가위','scissors'],['자','ruler'],['칠판','blackboard']]},
  family:{name:'영어 가족',en:'family word',q:k=>"'"+k+"'의 영어 단어는?",pairs:[['엄마','mom'],['아빠','dad'],['형','older brother'],['누나','older sister'],['동생','younger sibling'],['할머니','grandmother'],['할아버지','grandfather']]},
  body:{name:'영어 몸',en:'body word',q:k=>"'"+k+"'의 영어 단어는?",pairs:[['머리','head'],['눈','eye'],['코','nose'],['입','mouth'],['귀','ear'],['손','hand'],['발','foot'],['팔','arm'],['다리','leg']]},
  day:{name:'영어 요일',en:'weekday word',q:k=>"'"+k+"'의 영어 단어는?",pairs:[['월요일','Monday'],['화요일','Tuesday'],['수요일','Wednesday'],['목요일','Thursday'],['금요일','Friday'],['토요일','Saturday'],['일요일','Sunday']]}
};
const MATHQ=()=>{ const kind=pick(['mul','add','sub']); const a=int(2,9), b=int(2,9), c=int(10,60), d=int(10,60); if(kind==='mul') return [a+' × '+b, a*b]; if(kind==='add') return [c+' + '+d, c+d]; const hi=Math.max(c,d), lo=Math.min(c,d); return [hi+' - '+lo, hi-lo]; };

/* ---------- families ---------- */
const OUT=[]; let uid=0;
const add=(fam,q,html)=>OUT.push({id:fam+'-'+(++uid),q:K(q),cur:null,html});

function quiz(){
  const kinds=Object.keys(POOL).concat(['math']), kind=pick(kinds), n=int(4,9), opts=pick([3,4]); let items, topic, topicEn;
  if(kind==='math'){ const seen=new Set(); items=[]; while(items.length<n){ const [q,a]=MATHQ(); if(seen.has(q)) continue; seen.add(q); const wrong=new Set(); while(wrong.size<opts-1){ const w=a+pick([-10,-3,-2,-1,1,2,3,5,10]); if(w!==a&&w>=0) wrong.add(w); } items.push({q:q+' = ?',a:String(a),o:shuffle([String(a)].concat([...wrong].map(String)))}); } topic='계산'; topicEn='math'; }
  else { const P=POOL[kind], pairs=sample(P.pairs,Math.min(n,P.pairs.length)); topic=P.name; topicEn=P.en;
    items=pairs.map(([k,a])=>{ const others=P.pairs.map(x=>x[1]).filter(x=>x!==a); return {q:P.q(k),a,o:shuffle([a].concat(sample(others,Math.min(opts-1,others.length))))}; }); }
  const bg=pick(BGS)[0], titleKo=topic+' 퀴즈', lang=chance(.12)?'en':'ko';
  const html=page({bg,title:titleKo},`<h1>${titleKo}</h1>
<p id="info"></p>
<h2 id="question"></h2>
<div id="options"></div>
<p id="feedback"></p>`,
`const questions = ${json(items)};
let index = 0;
let score = 0;
let answered = false;
const info = document.getElementById('info');
const questionEl = document.getElementById('question');
const optionsEl = document.getElementById('options');
const feedback = document.getElementById('feedback');

function showQuestion() {
  if (index >= questions.length) {
    questionEl.textContent = '끝! 점수: ' + score + ' / ' + questions.length;
    optionsEl.innerHTML = '';
    feedback.textContent = '';
    info.textContent = '';
    return;
  }
  const q = questions[index];
  answered = false;
  info.textContent = (index + 1) + ' / ' + questions.length + ' · 점수 ' + score;
  questionEl.textContent = q.q;
  feedback.textContent = '';
  optionsEl.innerHTML = '';
  q.o.forEach(function (text) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.addEventListener('click', function () {
      if (answered) return;
      answered = true;
      if (text === q.a) {
        score += 1;
        feedback.textContent = '정답!';
      } else {
        feedback.textContent = '아쉬워요. 정답은 ' + q.a;
      }
      index += 1;
      setTimeout(showQuestion, 700);
    });
    optionsEl.appendChild(btn);
  });
}

showQuestion();`);
  const qs=[`${topic} 퀴즈 ${n}문제 만들어줘`,`${topic} 맞히기 게임`,`${topic} 퀴즈`,`${topic} 문제 내주는 거 만들어줘 (${n}문제, 보기 ${opts}개 중에 고르기)`,`${n}문제짜리 ${topic} 퀴즈 게임`,`${topic} 퀴즈 만들어 주세요`,`make a ${topicEn} quiz with ${n} questions`,`${topicEn} quiz game, pick one of ${opts} answers`];
  add('quiz',pick(qs),html);
}

function cards(){
  const kind=pick(Object.keys(POOL).filter(k=>POOL[k].pairs.length>=6&&k!=='planet'&&k!=='capital'&&k!=='sound')), P=POOL[kind], n=int(5,Math.min(10,P.pairs.length)), pairs=sample(P.pairs,n), bg=pick(BGS)[0];
  const title=P.name+' 카드';
  const html=page({bg,title},`<h1>${title}</h1>
<div id="card">?</div>
<p id="count"></p>
<button id="flip">뒤집기</button>
<button id="next">다음</button>`,
`const cards = ${json(pairs)};
let index = 0;
let showBack = false;
const cardEl = document.getElementById('card');
const countEl = document.getElementById('count');

function render() {
  const pair = cards[index];
  cardEl.textContent = showBack ? pair[1] : pair[0];
  countEl.textContent = (index + 1) + ' / ' + cards.length;
}

document.getElementById('flip').addEventListener('click', function () {
  showBack = !showBack;
  render();
});

document.getElementById('next').addEventListener('click', function () {
  index = (index + 1) % cards.length;
  showBack = false;
  render();
});

render();`,`#card { font-size: 40px; font-weight: bold; background: CARD; border-radius: 16px; padding: 48px 24px; margin: 20px auto; max-width: 320px; box-shadow: 0 4px 12px rgba(0,0,0,.15); }`);
  const qs=[`${P.name} 단어 카드 만들어줘`,`${P.name} 외우는 카드`,`${P.name} 플래시카드 ${n}장`,`앞면은 한국어 뒷면은 영어인 ${P.name.replace('영어 ','')} 카드`,`${P.name} 암기 카드 만들어줘 (뒤집기, 다음 버튼)`,`flashcards for ${P.en}s`,`${P.name} 카드 넘기면서 외우고 싶어`];
  add('cards',pick(qs),html);
}

function multi(){
  const from=int(2,8), to=int(from+1,Math.min(from+int(1,8),19)), upto=pick([9,9,9,12,15]), bg=pick(BGS)[0], input=chance(.4);
  const title=input?'구구단':from+'단~'+to+'단 구구단';
  const html=input?page({bg,title},`<h1>구구단</h1>
<input id="dan" type="number" min="1" max="${to+10}" value="${from}">
<button id="show">보기</button>
<div id="lines"></div>`,
`const danInput = document.getElementById('dan');
const lines = document.getElementById('lines');

document.getElementById('show').addEventListener('click', function () {
  const dan = Number(danInput.value);
  lines.innerHTML = '';
  if (!dan) {
    lines.textContent = '숫자를 넣어 주세요';
    return;
  }
  for (let i = 1; i <= ${upto}; i++) {
    const p = document.createElement('p');
    p.textContent = dan + ' × ' + i + ' = ' + dan * i;
    lines.appendChild(p);
  }
});`):page({bg,title},`<h1>${title}</h1>
<div id="table"></div>`,
`const table = document.getElementById('table');
for (let dan = ${from}; dan <= ${to}; dan++) {
  const box = document.createElement('div');
  const heading = document.createElement('h3');
  heading.textContent = dan + '단';
  box.appendChild(heading);
  for (let i = 1; i <= ${upto}; i++) {
    const p = document.createElement('p');
    p.textContent = dan + ' × ' + i + ' = ' + dan * i;
    box.appendChild(p);
  }
  table.appendChild(box);
}`,`#table div { display: inline-block; vertical-align: top; background: CARD; border-radius: 12px; padding: 8px 20px; margin: 8px; }
p { margin: 4px 0; }`);
  const qs=input?['구구단 외우는 거 만들어줘 (단 입력하면 나오게)','구구단 계산기','몇 단 보고 싶은지 입력하면 구구단 보여줘','multiplication table where I type the number']:[`${from}단부터 ${to}단까지 구구단 표`,`구구단 ${from}단~${to}단 보여줘`,`${from}단 ${to}단 구구단 만들어줘${upto>9?' ('+upto+'까지 곱하기)':''}`,`multiplication tables from ${from} to ${to}`];
  add('multi',pick(qs),html);
}

const CONVS=[['km','마일',0.621371,'km','mile'],['마일','km',1.609344,'mile','km'],['kg','파운드',2.20462,'kg','pound'],['파운드','kg',0.453592,'pound','kg'],['cm','인치',0.393701,'cm','inch'],['인치','cm',2.54,'inch','cm'],['m','피트',3.28084,'m','feet'],['피트','m',0.3048,'feet','m'],['리터','갤런',0.264172,'liter','gallon'],['갤런','리터',3.78541,'gallon','liter'],['평','제곱미터',3.305785,'pyeong','square meter'],['제곱미터','평',0.3025,'square meter','pyeong'],['시간','분',60,'hour','minute'],['분','초',60,'minute','second'],['일','시간',24,'day','hour'],['주','일',7,'week','day'],['년','개월',12,'year','month'],['MB','KB',1024,'MB','KB'],['GB','MB',1024,'GB','MB'],['km','m',1000,'km','m'],['m','cm',100,'m','cm'],['kg','g',1000,'kg','g'],['톤','kg',1000,'ton','kg'],['달러','원',null,'dollar','won'],['엔','원',null,'yen','won'],['유로','원',null,'euro','won']];
function conv(){
  const c=pick(CONVS); let f=c[2], extra=''; if(f===null){ f=c[0]==='달러'?pick([1300,1350,1400,1450]):c[0]==='엔'?pick([8,9,9.5,10]):pick([1450,1500,1550,1600]); extra=`${c[0]} 1 = ${f}원`; }
  const bg=pick(BGS)[0], title=c[0]+'을(를) '+c[1]+'(으)로 바꾸기'; const t=K(title);
  const html=page({bg,title:t},`<h1>${t}</h1>${extra?`\n<p>${extra} 기준</p>`:''}
<input id="input" type="number" placeholder="${c[0]}">
<button id="go">바꾸기</button>
<h2 id="result"></h2>`,
`const input = document.getElementById('input');
const result = document.getElementById('result');
const rate = ${f};

document.getElementById('go').addEventListener('click', function () {
  const value = Number(input.value);
  if (input.value === '' || isNaN(value)) {
    result.textContent = '숫자를 넣어 주세요';
    return;
  }
  const answer = Math.round(value * rate * 100) / 100;
  result.textContent = value + '${c[0]} = ' + answer + '${c[1]}';
});`);
  const qs=[`${c[0]}을(를) ${c[1]}(으)로 바꾸는 변환기`,`${c[0]} ${c[1]} 변환기 만들어줘`,`${c[0]}→${c[1]} 계산기`,`${c[0]}이(가) ${c[1]}(으)로 몇인지 알려주는 거`,`${c[3]} to ${c[4]} converter`,`convert ${c[3]} into ${c[4]}`];
  add('conv',pick(qs),html);
}

const TEAMN=['빨강팀','파랑팀','노랑팀','초록팀','사자팀','호랑이팀','독수리팀','곰팀','1반','2반','3반','4반','A팀','B팀','C팀','우리 팀','상대 팀','민지','준호','서연','지훈','하은','도윤'];
function score(){
  const n=int(2,4), teams=sample(TEAMN,n), steps=pick([[1],[1,2],[1,2,3],[1,5,10]]), bg=pick(BGS)[0], title='점수판';
  const html=page({bg,title},`<h1>${title}</h1>
<div id="board"></div>
<button id="reset">모두 0점으로</button>`,
`const teams = ${json(teams)};
const steps = ${json(steps)};
const scores = {};
const board = document.getElementById('board');

teams.forEach(function (name) {
  scores[name] = 0;
  const box = document.createElement('div');
  box.className = 'team';
  const label = document.createElement('h2');
  const total = document.createElement('p');
  total.className = 'total';
  label.textContent = name;
  total.textContent = '0';
  box.appendChild(label);
  box.appendChild(total);
  steps.forEach(function (step) {
    const btn = document.createElement('button');
    btn.textContent = '+' + step;
    btn.addEventListener('click', function () {
      scores[name] += step;
      total.textContent = scores[name];
    });
    box.appendChild(btn);
  });
  board.appendChild(box);
});

document.getElementById('reset').addEventListener('click', function () {
  teams.forEach(function (name) { scores[name] = 0; });
  document.querySelectorAll('.total').forEach(function (el) { el.textContent = '0'; });
});`,`.team { display: inline-block; background: CARD; border-radius: 12px; padding: 12px 24px; margin: 8px; }
.total { font-size: 48px; font-weight: bold; margin: 8px 0; }`);
  const names=teams.join(', ');
  const qs=[`${teams.join('이랑 ')} 점수판 만들어줘`.replace('이랑 ',' / '),`${n}팀 점수 세는 거 (${names})`,`점수판 ${names}${steps.length>1?' +'+steps.join(' +')+' 버튼':''}`,`scoreboard for ${names}`,`${names} 점수 올려주는 앱`];
  add('score',pick(qs),html);
}

const PICKS=[['점심 메뉴','점심',['김밥','라면','비빔밥','돈가스','떡볶이','샌드위치','피자','국수','볶음밥','햄버거']],['간식','간식',['과자','아이스크림','과일','빵','젤리','초콜릿','떡','주스']],['청소 당번','당번',['민지','준호','서연','지훈','하은','도윤','수아','예준']],['놀이','오늘 할 놀이',['숨바꼭질','술래잡기','보드게임','카드놀이','공놀이','줄넘기','그림 그리기','블록 쌓기']],['운동','오늘 운동',['달리기','줄넘기','스쿼트','팔굽혀펴기','윗몸일으키기','자전거','수영','스트레칭']],['벌칙','벌칙',['노래 부르기','춤추기','10초 동안 웃지 않기','동물 흉내 내기','엉덩이로 이름 쓰기','물구나무 서기']],['저녁 메뉴','저녁',['삼겹살','치킨','된장찌개','카레','스파게티','불고기','생선구이','만두']],['주말 계획','주말에 할 일',['영화 보기','공원 가기','책 읽기','친구 만나기','자전거 타기','집에서 쉬기','요리하기']],['색깔','오늘의 색',['빨강','파랑','노랑','초록','보라','주황','분홍','하늘색']],['숙제 과목','먼저 할 숙제',['국어','수학','영어','과학','사회','음악']]];
function picker(){
  const [name,short,all]=pick(PICKS), items=sample(all,int(4,all.length)), bg=pick(BGS)[0], title=name+' 뽑기', btn=pick(['뽑기','정해줘','돌려!','눌러보세요']);
  const html=page({bg,title},`<h1>${title}</h1>
<h2 id="result">?</h2>
<button id="pick">${btn}</button>
<p id="history"></p>`,
`const items = ${json(items)};
const result = document.getElementById('result');
const history = document.getElementById('history');
const used = [];

document.getElementById('pick').addEventListener('click', function () {
  const item = items[Math.floor(Math.random() * items.length)];
  result.textContent = item;
  used.push(item);
  history.textContent = '지금까지: ' + used.join(', ');
});`);
  const qs=[`${name} 정해주는 뽑기`,`${short} 뭐 할지 랜덤으로 정해줘 (${items.slice(0,3).join(', ')}...)`,`${name} 랜덤 뽑기 만들어줘`,`버튼 누르면 ${items.slice(0,4).join(', ')} 중에 하나 나오게`,`random ${short} picker`,`${name} 룰렛`];
  add('picker',pick(qs),html);
}

const POLLS=[['좋아하는 과일',['사과','바나나','딸기','포도','수박']],['좋아하는 동물',['강아지','고양이','토끼','햄스터','앵무새']],['좋아하는 색',['빨강','파랑','노랑','초록','보라']],['좋아하는 급식',['돈가스','치킨','떡볶이','볶음밥','짜장면']],['소풍 장소',['놀이공원','동물원','공원','박물관','바다']],['좋아하는 운동',['축구','야구','농구','피구','수영']],['좋아하는 과목',['국어','수학','영어','과학','체육','음악','미술']],['주말에 하고 싶은 것',['영화','게임','독서','운동','잠자기']],['우리 반 간식',['과자','과일','빵','젤리','아이스크림']],['좋아하는 계절',['봄','여름','가을','겨울']]];
function poll(){
  const [topic,all]=pick(POLLS), opts=sample(all,int(2,all.length)), bg=pick(BGS)[0], title=topic+' 투표';
  const html=page({bg,title},`<h1>${title}</h1>
<div id="options"></div>
<p id="total"></p>`,
`const options = ${json(opts)};
const votes = {};
const box = document.getElementById('options');
const totalEl = document.getElementById('total');

function total() {
  let sum = 0;
  options.forEach(function (name) { sum += votes[name]; });
  return sum;
}

function update() {
  const sum = total();
  options.forEach(function (name) {
    const percent = sum ? Math.round(votes[name] / sum * 100) : 0;
    document.getElementById('bar-' + options.indexOf(name)).style.width = percent * 2 + 'px';
    document.getElementById('num-' + options.indexOf(name)).textContent = votes[name] + '표 (' + percent + '%)';
  });
  totalEl.textContent = '모두 ' + sum + '표';
}

options.forEach(function (name, i) {
  votes[name] = 0;
  const row = document.createElement('div');
  row.className = 'row';
  const btn = document.createElement('button');
  btn.textContent = name;
  btn.addEventListener('click', function () {
    votes[name] += 1;
    update();
  });
  const bar = document.createElement('span');
  bar.id = 'bar-' + i;
  bar.className = 'bar';
  const num = document.createElement('span');
  num.id = 'num-' + i;
  row.appendChild(btn);
  row.appendChild(bar);
  row.appendChild(num);
  box.appendChild(row);
});

update();`,`.row { margin: 8px 0; }
.bar { display: inline-block; height: 18px; background: #3b82f6; border-radius: 4px; vertical-align: middle; margin: 0 8px; width: 0; }`);
  const qs=[`${topic} 투표 만들어줘`,`우리 반 ${topic} 투표하는 거`,`${opts.join(', ')} 중에 투표하고 결과 막대로 보여줘`,`${topic} 설문 (${opts.length}개 보기)`,`${topic.replace('좋아하는 ','favorite ')} poll`,`${topic} 투표 앱`];
  add('poll',pick(qs),html);
}

function ball(){
  const [cname,color]=pick(COLORS), bg=pick(BGS)[0], count=pick([1,1,1,3,5]), speed=pick([['느린',2],['보통',4],['빠른',7]]), r=int(10,30), click=chance(.35), title='튕기는 공';
  const html=page({bg,title},`<h1>${title}</h1>
<canvas id="canvas" width="480" height="320"></canvas>${click?'\n<p>화면을 누르면 공이 늘어나요</p>':''}`,
`const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const balls = [];

function addBall() {
  balls.push({
    x: Math.random() * (canvas.width - ${2*r}) + ${r},
    y: Math.random() * (canvas.height - ${2*r}) + ${r},
    dx: (Math.random() < 0.5 ? -1 : 1) * ${speed[1]},
    dy: (Math.random() < 0.5 ? -1 : 1) * ${speed[1]}
  });
}

for (let i = 0; i < ${count}; i++) {
  addBall();
}
${click?`
canvas.addEventListener('click', function () {
  addBall();
});
`:''}
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  balls.forEach(function (b) {
    b.x += b.dx;
    b.y += b.dy;
    if (b.x < ${r} || b.x > canvas.width - ${r}) b.dx = -b.dx;
    if (b.y < ${r} || b.y > canvas.height - ${r}) b.dy = -b.dy;
    ctx.beginPath();
    ctx.arc(b.x, b.y, ${r}, 0, Math.PI * 2);
    ctx.fillStyle = '${color}';
    ctx.fill();
  });
  requestAnimationFrame(draw);
}

draw();`,`canvas { background: CARD; border: 3px solid #94a3b8; border-radius: 8px; }`);
  const qs=[`${cname} 공이 ${speed[0]} 속도로 튕기는 애니메이션`,`${cname} 공 튕기기${count>1?' ('+count+'개)':''}`,`공이 벽에 튕기는 거 보여줘 ${cname}으로`.replace('색으로','색으로'),`${speed[0]} ${cname} 공 애니메이션${click?', 누르면 공 추가':''}`,`a bouncing ball animation${count>1?' with '+count+' balls':''}`];
  add('ball',pick(qs),html);
}

function timer(){
  const secs=pick([10,15,20,30,45,60,90,120,180,300,600]), what=pick(['','','라면','양치','공부','쉬는 시간','발표','운동','요리','낮잠','독서']), bg=pick(BGS)[0];
  const label=what?what+' ':''; const mm=secs>=60&&secs%60===0?secs/60+'분':secs+'초'; const title=label+mm+' 타이머';
  const html=page({bg,title},`<h1>${title}</h1>
<p id="time" style="font-size: 64px">${secs}</p>
<button id="start">시작</button>
<button id="reset">처음으로</button>
<p id="msg"></p>`,
`const total = ${secs};
let left = total;
let timerId = null;
const timeEl = document.getElementById('time');
const msg = document.getElementById('msg');

function stop() {
  clearInterval(timerId);
  timerId = null;
}

document.getElementById('start').addEventListener('click', function () {
  if (timerId) return;
  msg.textContent = '';
  if (left <= 0) left = total;
  timerId = setInterval(function () {
    left -= 1;
    timeEl.textContent = left;
    if (left <= 0) {
      stop();
      msg.textContent = '${what?what+' ':''}시간이 끝났어요!';
    }
  }, 1000);
});

document.getElementById('reset').addEventListener('click', function () {
  stop();
  left = total;
  timeEl.textContent = left;
  msg.textContent = '';
});`);
  const qs=[`${label}${mm} 타이머 만들어줘`,`${mm} 카운트다운`,`${label}${mm}짜리 타이머, 끝나면 알려줘`,`${mm} 동안 세는 ${what?what+' ':''}타이머`,`${secs} second timer`,`${mm} ${what?what+' ':''}타이머`.replace(/\s+/g,' ')];
  add('timer',pick(qs),html);
}

const FAMS=[[quiz,5],[cards,3],[multi,2],[conv,4],[score,3],[picker,3],[poll,3],[ball,2],[timer,3]];
const bag=[]; FAMS.forEach(([f,w])=>{ for(let i=0;i<w;i++) bag.push(f); });
const seenQ=new Set(); let guard=0;
while(OUT.length<N&&guard<N*40){ guard++; const before=OUT.length; pick(bag)(); const last=OUT[OUT.length-1]; if(OUT.length>before){ const key=last.q+'|'+last.html; if(seenQ.has(key)) OUT.pop(); else seenQ.add(key); } }
fs.writeFileSync(path.join(__dirname,'raw','gen22-code.jsonl'),OUT.map(x=>JSON.stringify(x)).join('\n')+'\n');
const by={}; OUT.forEach(x=>{ const f=x.id.split('-')[0]; by[f]=(by[f]||0)+1; }); console.log('gen22-code:',OUT.length,'pages',JSON.stringify(by));
