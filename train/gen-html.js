#!/usr/bin/env node
/* Writes train/raw/html-gen.jsonl: new, hand-designed Block HTML pages for requests a child is likely to type (counters, calculators,
   converters, small games, timers, lists, pickers, drawing ...), each in several phrasings (short, casual, English, typos) and as
   edit requests on top of the page ("배경을 노란색으로", "제목을 ...로", "글자를 더 크게").
   Rows: {q, cur?, html}. build4.js runs every page in the headless editor frame (no error on start, every button pressed) before it trains on it.
   node train/gen-html.js */
'use strict';
const fs=require('fs'), path=require('path');
let seed=777; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const pick=a=>a[Math.floor(rnd()*a.length)];
const COLORS={'노란색':'#fff7c2','파란색':'#dbeafe','분홍색':'#fce7f3','초록색':'#dcfce7','하늘색':'#e0f2fe','보라색':'#ede9fe','주황색':'#ffedd5','회색':'#e5e7eb'};
const DARK='#111827';

function page(p,body,script,extraCss){
  const dark=p.bg===DARK, fg=dark?'#f9fafb':'#1f2937';
  const css=['body { font-family: sans-serif; text-align: center; background: '+p.bg+'; color: '+fg+'; padding: 24px; }',
    'button { font-size: 18px; padding: 10px 18px; margin: 4px; cursor: pointer; }','input { font-size: 18px; padding: 8px; margin: 4px; }'];
  if(extraCss) css.push(...extraCss.split('\n'));
  return '<!DOCTYPE html>\n<html lang="'+(p.lang||'ko')+'">\n<head>\n  <meta charset="UTF-8">\n  <title>'+p.title+'</title>\n  <style>\n'+css.map(l=>'    '+l).join('\n')+'\n  </style>\n</head>\n<body>\n'+
    body.split('\n').map(l=>'  '+l).join('\n')+'\n  <script>\n'+script.split('\n').map(l=>l?'    '+l:l).join('\n')+'\n  </script>\n</body>\n</html>\n'; }
const fs_=(p,d)=>(p.fs||d)+'px';

/* ---------- templates: make(p) -> html; V = [[request, params], ...] ---------- */
const T=[];
const add=(id,make,V)=>T.push({id,make,V});

add('counter',p=>page(p,`<h1>${p.title}</h1>
<p id="count" style="font-size: ${fs_(p,64)}">0</p>
<button id="plus">${p.plus||'+1'}</button>${p.minus?'\n<button id="minus">-1</button>':''}${p.reset?'\n<button id="reset">다시 시작</button>':''}`,
`let count = 0;
const countEl = document.getElementById('count');
document.getElementById('plus').addEventListener('click', function () {
  count += 1;
  countEl.textContent = count;
});${p.minus?`
document.getElementById('minus').addEventListener('click', function () {
  count -= 1;
  countEl.textContent = count;
});`:''}${p.reset?`
document.getElementById('reset').addEventListener('click', function () {
  count = 0;
  countEl.textContent = count;
});`:''}`),
[['숫자 올라가는 카운터',{title:'카운터',bg:'#fff8e1'}],['카운터 만들어줘 + - 버튼 있게',{title:'카운터',bg:'#e0f2fe',minus:1}],['클릭하면 숫자 올라가고 초기화 버튼도 있는 거',{title:'클릭 카운터',bg:'#fce7f3',reset:1}],
 ['버튼 누를 때마다 1씩 늘어나는 숫자',{title:'숫자 세기',bg:'#dcfce7'}],['커운터 만들어줘 플러스 마이너스 리셋',{title:'카운터',bg:'#ede9fe',minus:1,reset:1}],['people counter with + and - buttons',{title:'People counter',lang:'en',bg:'#e0f2fe',minus:1,plus:'+1'}],['방문자 수 세는 페이지',{title:'방문자 수',bg:'#ffedd5',reset:1}]]);

add('calc2',p=>{ const ops=p.ops; const names={'+':'더하기','-':'빼기','*':'곱하기','/':'나누기'};
  return page(p,`<h1>${p.title}</h1>
<input id="a" type="number" placeholder="첫 번째 수">
<input id="b" type="number" placeholder="두 번째 수">
<div>
${ops.map(o=>`  <button id="${{'+':'add','-':'sub','*':'mul','/':'div'}[o]}">${o==='*'?'×':o==='/'?'÷':o}</button>`).join('\n')}
</div>
<h2 id="result">결과: </h2>`,
`const a = document.getElementById('a');
const b = document.getElementById('b');
const result = document.getElementById('result');
function show(value) {
  result.textContent = '결과: ' + value;
}
${ops.map(o=>{ const id={'+':'add','-':'sub','*':'mul','/':'div'}[o]; return `document.getElementById('${id}').addEventListener('click', function () {
  const x = Number(a.value);
  const y = Number(b.value);${o==='/'?`
  if (y === 0) {
    show('0으로 나눌 수 없어요');
    return;
  }`:''}
  show(x ${o} y);
});`; }).join('\n')}`); },
[['계산기',{title:'계산기',bg:'#dcfce7',ops:['+','-','*','/']}],['두 수 더하는 계산기',{title:'더하기 계산기',bg:'#fff8e1',ops:['+']}],['더하기 빼기만 되는 계산기 만들어줘',{title:'계산기',bg:'#e0f2fe',ops:['+','-']}],['곱셈 계산기',{title:'곱하기 계산기',bg:'#fce7f3',ops:['*']}],['calculator',{title:'Calculator',lang:'en',bg:'#ede9fe',ops:['+','-','*','/']}],['사칙연산 계산기 만들어 줘',{title:'사칙연산 계산기',bg:'#ffedd5',ops:['+','-','*','/']}],['나눗셈 계산기 0으로 나누면 안되게',{title:'나누기 계산기',bg:'#e5e7eb',ops:['/']}]]);

const CONV=[['℃ → ℉','celsius','fahrenheit','x * 9 / 5 + 32','화씨','섭씨를 화씨로 바꾸는','온도 변환기'],['km → 마일','km','mile','x * 0.621371','마일','킬로미터를 마일로 바꾸는','거리 변환기'],['kg → 파운드','kg','pound','x * 2.20462','파운드','킬로그램을 파운드로 바꾸는','무게 변환기'],['cm → 인치','cm','inch','x / 2.54','인치','센티미터를 인치로 바꾸는','길이 변환기'],['원 → 달러 (1달러=1400원)','won','dollar','x / 1400','달러','원을 달러로 바꾸는','환율 계산기'],['분 → 시간','minute','hour','x / 60','시간','분을 시간으로 바꾸는','시간 변환기']];
add('convert',p=>{ const c=CONV[p.k]; return page(p,`<h1>${p.title}</h1>
<input id="input" type="number" placeholder="${c[1]}">
<button id="go">바꾸기</button>
<h2 id="result"></h2>`,
`const input = document.getElementById('input');
const result = document.getElementById('result');
document.getElementById('go').addEventListener('click', function () {
  const x = Number(input.value);
  const y = ${c[3]};
  result.textContent = x + ' ${c[1]} = ' + Math.round(y * 100) / 100 + ' ${c[2]}';
});`); },
CONV.flatMap((c,k)=>[[c[6],{k,title:c[6],bg:pick(Object.values(COLORS))}],[c[5]+' 페이지 만들어줘',{k,title:c[6],bg:pick(Object.values(COLORS))}]]));

add('guess',p=>page(p,`<h1>${p.title}</h1>
<p id="hint">${p.lo}부터 ${p.hi} 사이의 숫자를 맞혀 보세요</p>
<input id="guess" type="number">
<button id="check">확인</button>
<p id="result"></p>
<p id="tries">시도: 0번</p>`,
`const answer = Math.floor(Math.random() * (${p.hi} - ${p.lo} + 1)) + ${p.lo};
let tries = 0;
const guess = document.getElementById('guess');
const result = document.getElementById('result');
document.getElementById('check').addEventListener('click', function () {
  const n = Number(guess.value);
  tries += 1;
  document.getElementById('tries').textContent = '시도: ' + tries + '번';
  if (n === answer) {
    result.textContent = '🎉 정답이에요!';
  } else if (n < answer) {
    result.textContent = '더 큰 수예요 ⬆️';
  } else {
    result.textContent = '더 작은 수예요 ⬇️';
  }
});`),
[['숫자 맞추기 게임',{title:'숫자 맞추기',bg:'#0f172a'.replace('#0f172a','#e0f2fe'),lo:1,hi:100}],['1부터 10까지 숫자 맞히기',{title:'숫자 맞히기',bg:'#fff8e1',lo:1,hi:10}],['업다운 게임',{title:'업다운',bg:'#dcfce7',lo:1,hi:50}],['컴퓨터가 정한 숫자 맞히는 게임 1~1000',{title:'숫자 맞히기',bg:'#fce7f3',lo:1,hi:1000}],['guess the number game',{title:'Guess the number',lang:'en',bg:'#ede9fe',lo:1,hi:100}]]);

add('dice',p=>page(p,`<h1>${p.title}</h1>
<p id="dice" style="font-size: ${fs_(p,72)}">🎲</p>
<button id="roll">굴리기</button>
<p id="sum"></p>`,
`const dice = document.getElementById('dice');
document.getElementById('roll').addEventListener('click', function () {
  const faces = [];
  for (let i = 0; i < ${p.n}; i++) {
    faces.push(Math.floor(Math.random() * ${p.sides}) + 1);
  }
  dice.textContent = faces.join(' ');
  document.getElementById('sum').textContent = '합계: ' + faces.reduce(function (a, b) { return a + b; }, 0);
});`),
[['주사위 굴리기',{title:'주사위',bg:'#fff8e1',n:1,sides:6}],['주사위 두 개 굴리는 페이지',{title:'주사위 두 개',bg:'#e0f2fe',n:2,sides:6}],['주사위 던지기 20면체',{title:'20면 주사위',bg:'#ede9fe',n:1,sides:20}],['roll a dice',{title:'Dice',lang:'en',bg:'#dcfce7',n:1,sides:6}],['쥬사위 만들어줘',{title:'주사위',bg:'#fce7f3',n:1,sides:6}]]);

add('coin',p=>page(p,`<h1>${p.title}</h1>
<p id="coin" style="font-size: ${fs_(p,80)}">🪙</p>
<button id="flip">던지기</button>
<p id="stats">앞 0번 · 뒤 0번</p>`,
`let heads = 0;
let tails = 0;
document.getElementById('flip').addEventListener('click', function () {
  const front = Math.random() < 0.5;
  document.getElementById('coin').textContent = front ? '앞면' : '뒷면';
  if (front) heads += 1; else tails += 1;
  document.getElementById('stats').textContent = '앞 ' + heads + '번 · 뒤 ' + tails + '번';
});`),
[['동전 던지기',{title:'동전 던지기',bg:'#fff8e1'}],['앞면 뒷면 나오는 동전',{title:'동전',bg:'#e5e7eb'}],['coin flip',{title:'Coin flip',lang:'en',bg:'#e0f2fe'}]]);

add('rps',p=>page(p,`<h1>${p.title}</h1>
<div>
  <button id="rock">✊ 바위</button>
  <button id="scissors">✌️ 가위</button>
  <button id="paper">✋ 보</button>
</div>
<p id="computer">컴퓨터: ?</p>
<h2 id="result"></h2>
<p id="score">이김 0 · 짐 0 · 비김 0</p>`,
`const choices = ['바위', '가위', '보'];
let win = 0;
let lose = 0;
let draw = 0;
function play(me) {
  const com = Math.floor(Math.random() * 3);
  document.getElementById('computer').textContent = '컴퓨터: ' + choices[com];
  let text;
  if (me === com) { text = '비겼어요'; draw += 1; }
  else if ((me - com + 3) % 3 === 2) { text = '이겼어요! 🎉'; win += 1; }
  else { text = '졌어요 😢'; lose += 1; }
  document.getElementById('result').textContent = text;
  document.getElementById('score').textContent = '이김 ' + win + ' · 짐 ' + lose + ' · 비김 ' + draw;
}
document.getElementById('rock').addEventListener('click', function () { play(0); });
document.getElementById('scissors').addEventListener('click', function () { play(1); });
document.getElementById('paper').addEventListener('click', function () { play(2); });`),
[['가위바위보 게임',{title:'가위바위보',bg:'#e0f2fe'}],['컴퓨터랑 가위바위보',{title:'가위바위보',bg:'#fce7f3'}],['rock paper scissors',{title:'Rock Paper Scissors',lang:'en',bg:'#dcfce7'}]]);

add('countdown',p=>page(p,`<h1>${p.title}</h1>
<p id="time" style="font-size: ${fs_(p,72)}">${p.sec}</p>
<button id="start">시작</button>
<button id="reset">처음으로</button>`,
`let left = ${p.sec};
let timer = null;
const timeEl = document.getElementById('time');
document.getElementById('start').addEventListener('click', function () {
  if (timer) return;
  timer = setInterval(function () {
    left -= 1;
    timeEl.textContent = left;
    if (left <= 0) {
      clearInterval(timer);
      timer = null;
      timeEl.textContent = '끝! ⏰';
    }
  }, 1000);
});
document.getElementById('reset').addEventListener('click', function () {
  clearInterval(timer);
  timer = null;
  left = ${p.sec};
  timeEl.textContent = left;
});`),
[['10초 타이머',{title:'10초 타이머',bg:'#fff8e1',sec:10}],['카운트다운 1분',{title:'1분 타이머',bg:'#e0f2fe',sec:60}],['타이머 만들어줘',{title:'타이머',bg:'#ede9fe',sec:30}],['3분 타이머 라면용',{title:'라면 타이머',bg:'#ffedd5',sec:180}],['countdown timer 5 seconds',{title:'Countdown',lang:'en',bg:'#dcfce7',sec:5}]]);

add('stopwatch',p=>page(p,`<h1>${p.title}</h1>
<p id="time" style="font-size: ${fs_(p,64)}">0.0</p>
<button id="start">시작</button>
<button id="stop">정지</button>
<button id="reset">초기화</button>`,
`let seconds = 0;
let timer = null;
const timeEl = document.getElementById('time');
document.getElementById('start').addEventListener('click', function () {
  if (timer) return;
  timer = setInterval(function () {
    seconds += 0.1;
    timeEl.textContent = seconds.toFixed(1);
  }, 100);
});
document.getElementById('stop').addEventListener('click', function () {
  clearInterval(timer);
  timer = null;
});
document.getElementById('reset').addEventListener('click', function () {
  clearInterval(timer);
  timer = null;
  seconds = 0;
  timeEl.textContent = '0.0';
});`),
[['스톱워치',{title:'스톱워치',bg:'#e0f2fe'}],['스톱워치 시작 정지 초기화 버튼',{title:'스톱워치',bg:'#fff8e1'}],['stopwatch',{title:'Stopwatch',lang:'en',bg:'#ede9fe'}]]);

add('todo',p=>page(p,`<h1>${p.title}</h1>
<input id="item" type="text" placeholder="${p.ph||'할 일을 쓰세요'}">
<button id="add">추가</button>
<ul id="list"></ul>
<p id="left"></p>`,
`const list = document.getElementById('list');
const item = document.getElementById('item');
function update() {
  document.getElementById('left').textContent = '남은 일: ' + list.children.length + '개';
}
document.getElementById('add').addEventListener('click', function () {
  const text = item.value.trim();
  if (!text) return;
  const li = document.createElement('li');
  li.textContent = text + ' ';
  const del = document.createElement('button');
  del.textContent = '삭제';
  del.addEventListener('click', function () {
    li.remove();
    update();
  });
  li.appendChild(del);
  list.appendChild(li);
  item.value = '';
  update();
});
update();`),
[['할 일 목록',{title:'할 일 목록',bg:'#fff8e1'}],['투두 리스트 지우기도 되게',{title:'투두 리스트',bg:'#dcfce7'}],['숙제 목록 적는 페이지',{title:'숙제 목록',bg:'#e0f2fe',ph:'숙제를 쓰세요'}],['장보기 목록 만들어줘',{title:'장보기 목록',bg:'#ffedd5',ph:'살 것을 쓰세요'}],['to-do list',{title:'To-do list',lang:'en',bg:'#ede9fe',ph:'Write a task'}],['준비물 체크 목록',{title:'준비물 목록',bg:'#fce7f3',ph:'준비물을 쓰세요'}]]);

add('picker',p=>page(p,`<h1>${p.title}</h1>
<h2 id="pick" style="font-size: ${fs_(p,48)}">?</h2>
<button id="go">${p.btn}</button>`,
`const options = ${JSON.stringify(p.options)};
document.getElementById('go').addEventListener('click', function () {
  const n = Math.floor(Math.random() * options.length);
  document.getElementById('pick').textContent = options[n];
});`),
[['점심 메뉴 골라주는 페이지',{title:'오늘 점심은?',bg:'#fff8e1',btn:'골라줘!',options:['김밥','라면','돈가스','비빔밥','떡볶이','치킨','햄버거']}],['랜덤으로 간식 뽑기',{title:'간식 뽑기',bg:'#fce7f3',btn:'뽑기',options:['과자','젤리','초콜릿','아이스크림','과일']}],['누가 먼저 할지 정하는 거',{title:'순서 정하기',bg:'#e0f2fe',btn:'정하기',options:['민수','지민','서연','하준']}],['오늘 뭐 할지 랜덤으로 알려줘',{title:'오늘 뭐 하지?',bg:'#dcfce7',btn:'알려줘',options:['책 읽기','축구하기','그림 그리기','게임 만들기','산책']}],['random color name picker',{title:'Random color',lang:'en',bg:'#ede9fe',btn:'Pick',options:['red','blue','green','yellow','purple']}]]);

add('colorbtn',p=>page(p,`<h1 id="title">${p.title}</h1>
<button id="change">${p.btn||'색 바꾸기'}</button>`,
`const colors = ${JSON.stringify(p.colors)};
let i = 0;
document.getElementById('change').addEventListener('click', function () {
  i = (i + 1) % colors.length;
  ${p.target==='bg'?"document.body.style.background = colors[i];":"document.getElementById('title').style.color = colors[i];"}
});`),
[['버튼 누르면 배경색이 바뀌는 페이지',{title:'색이 바뀌어요',bg:'#ffffff',target:'bg',colors:['#fecaca','#bfdbfe','#bbf7d0','#fef08a','#e9d5ff']}],['글자 색이 바뀌는 버튼',{title:'무지개 글자',bg:'#ffffff',target:'text',colors:['#ef4444','#f97316','#22c55e','#3b82f6','#a855f7']}],['색깔 바꾸는 버튼 만들어줘',{title:'색 바꾸기',bg:'#fff8e1',target:'bg',colors:['#fecaca','#bfdbfe','#bbf7d0']}],['change background color button',{title:'Color changer',lang:'en',bg:'#ffffff',btn:'Change color',target:'bg',colors:['#fecaca','#bfdbfe','#bbf7d0','#fef08a']}]]);

add('darkmode',p=>page(p,`<h1>${p.title}</h1>
<p>버튼을 누르면 밝은 화면과 어두운 화면이 바뀌어요.</p>
<button id="toggle">🌙 어두운 모드</button>`,
`let dark = false;
const button = document.getElementById('toggle');
button.addEventListener('click', function () {
  dark = !dark;
  document.body.style.background = dark ? '#111827' : '#ffffff';
  document.body.style.color = dark ? '#f9fafb' : '#1f2937';
  button.textContent = dark ? '☀️ 밝은 모드' : '🌙 어두운 모드';
});`),
[['다크모드 버튼',{title:'다크 모드',bg:'#ffffff'}],['밝은 모드 어두운 모드 바꾸는 버튼',{title:'화면 모드',bg:'#ffffff'}],['dark mode toggle',{title:'Dark mode',lang:'en',bg:'#ffffff'}]]);

add('greet',p=>page(p,`<h1>${p.title}</h1>
<input id="name" type="text" placeholder="이름을 쓰세요">
<button id="hello">인사하기</button>
<h2 id="message"></h2>`,
`document.getElementById('hello').addEventListener('click', function () {
  const name = document.getElementById('name').value.trim();
  document.getElementById('message').textContent = name ? '안녕하세요, ' + name + '님! 👋' : '이름을 먼저 써 주세요';
});`),
[['이름 입력하면 인사해주는 페이지',{title:'인사하기',bg:'#e0f2fe'}],['이름 쓰고 버튼 누르면 반갑다고 해줘',{title:'반가워요',bg:'#fce7f3'}],['say hello to my name',{title:'Hello',lang:'en',bg:'#dcfce7'}]]);

add('textcount',p=>page(p,`<h1>${p.title}</h1>
<textarea id="text" rows="6" cols="40" placeholder="여기에 글을 쓰세요"></textarea>
<p id="info">글자 수: 0 · 단어 수: 0</p>`,
`const text = document.getElementById('text');
text.addEventListener('input', function () {
  const words = text.value.trim() ? text.value.trim().split(/\\s+/).length : 0;
  document.getElementById('info').textContent = '글자 수: ' + text.value.length + ' · 단어 수: ' + words;
});`),
[['글자 수 세는 페이지',{title:'글자 수 세기',bg:'#fff8e1'}],['글자수 세어주는 텍스트 상자',{title:'글자 수 세기',bg:'#e0f2fe'}],['word counter',{title:'Word counter',lang:'en',bg:'#ede9fe'}]]);

add('reverse',p=>page(p,`<h1>${p.title}</h1>
<input id="text" type="text" placeholder="글을 쓰세요">
<button id="go">${p.btn}</button>
<h2 id="result"></h2>`,
`document.getElementById('go').addEventListener('click', function () {
  const text = document.getElementById('text').value;
  document.getElementById('result').textContent = ${p.expr};
});`),
[['글자 거꾸로 뒤집기',{title:'거꾸로 글자',bg:'#fff8e1',btn:'뒤집기',expr:"text.split('').reverse().join('')"}],['영어 대문자로 바꿔주는 거',{title:'대문자 변환',bg:'#e0f2fe',btn:'대문자로',expr:'text.toUpperCase()'}],['문장 길이 알려주는 페이지',{title:'글자 수',bg:'#dcfce7',btn:'세기',expr:"text.length + '글자'"}],['단어 거꾸로',{title:'단어 뒤집기',bg:'#ede9fe',btn:'뒤집기',expr:"text.split('').reverse().join('')"}]]);

add('bmi',p=>page(p,`<h1>${p.title}</h1>
<input id="height" type="number" placeholder="키 (cm)">
<input id="weight" type="number" placeholder="몸무게 (kg)">
<button id="go">계산하기</button>
<h2 id="result"></h2>`,
`document.getElementById('go').addEventListener('click', function () {
  const h = Number(document.getElementById('height').value) / 100;
  const w = Number(document.getElementById('weight').value);
  if (!h || !w) {
    document.getElementById('result').textContent = '키와 몸무게를 써 주세요';
    return;
  }
  const bmi = w / (h * h);
  let text = '저체중';
  if (bmi >= 18.5) text = '정상';
  if (bmi >= 23) text = '과체중';
  if (bmi >= 25) text = '비만';
  document.getElementById('result').textContent = 'BMI ' + bmi.toFixed(1) + ' (' + text + ')';
});`),
[['BMI 계산기',{title:'BMI 계산기',bg:'#dcfce7'}],['키랑 몸무게로 비만도 계산',{title:'비만도 계산',bg:'#e0f2fe'}],['bmi calculator',{title:'BMI calculator',lang:'en',bg:'#ede9fe'}]]);

add('table',p=>page(p,`<h1>${p.title}</h1>
<input id="dan" type="number" placeholder="단 (2~9)" value="${p.dan||''}">
<button id="show">보여 줘</button>
<ul id="list" style="list-style: none; padding: 0"></ul>`,
`document.getElementById('show').addEventListener('click', function () {
  const dan = Number(document.getElementById('dan').value);
  const list = document.getElementById('list');
  list.innerHTML = '';
  for (let i = 1; i <= 9; i++) {
    const li = document.createElement('li');
    li.textContent = dan + ' × ' + i + ' = ' + dan * i;
    list.appendChild(li);
  }
});`),
[['구구단',{title:'구구단',bg:'#fff8e1'}],['구구단 외우기 페이지 단 입력하면 나오게',{title:'구구단',bg:'#e0f2fe'}],['multiplication table',{title:'Multiplication table',lang:'en',bg:'#dcfce7'}]]);

add('oddeven',p=>page(p,`<h1>${p.title}</h1>
<input id="n" type="number" placeholder="숫자">
<button id="check">확인</button>
<h2 id="result"></h2>`,
`document.getElementById('check').addEventListener('click', function () {
  const n = Number(document.getElementById('n').value);
  ${p.kind==='prime'?`let prime = n > 1;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) prime = false;
  }
  document.getElementById('result').textContent = prime ? '소수예요! ✨' : '소수가 아니에요';`:`document.getElementById('result').textContent = n % 2 === 0 ? '짝수예요' : '홀수예요';`}
});`),
[['홀수 짝수 판별기',{title:'홀수 짝수',bg:'#e0f2fe'}],['소수인지 알려주는 페이지',{title:'소수 판별기',bg:'#ede9fe',kind:'prime'}],['짝수인지 홀수인지 알려줘',{title:'홀짝 판별',bg:'#fff8e1'}]]);

add('average',p=>page(p,`<h1>${p.title}</h1>
<input id="nums" type="text" placeholder="숫자를 쉼표로 쓰세요 (예: 80,90,100)" size="30">
<button id="go">계산하기</button>
<h2 id="result"></h2>`,
`document.getElementById('go').addEventListener('click', function () {
  const nums = document.getElementById('nums').value.split(',').map(Number).filter(function (n) { return !isNaN(n); });
  if (nums.length === 0) {
    document.getElementById('result').textContent = '숫자를 써 주세요';
    return;
  }
  const sum = nums.reduce(function (a, b) { return a + b; }, 0);
  document.getElementById('result').textContent = '합계 ' + sum + ' · 평균 ' + (sum / nums.length).toFixed(1);
});`),
[['평균 계산기',{title:'평균 계산기',bg:'#fff8e1'}],['점수 평균 구하는 페이지',{title:'점수 평균',bg:'#dcfce7'}],['합계랑 평균 내줘 숫자 여러개',{title:'합계와 평균',bg:'#e0f2fe'}]]);

add('password',p=>page(p,`<h1>${p.title}</h1>
<input id="pw" type="text" placeholder="비밀번호를 써 보세요">
<h2 id="result"></h2>`,
`document.getElementById('pw').addEventListener('input', function () {
  const pw = this.value;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[A-Za-z]/.test(pw)) score += 1;
  if (/[^0-9A-Za-z]/.test(pw)) score += 1;
  const names = ['아주 약해요', '약해요', '보통이에요', '좋아요', '아주 강해요'];
  document.getElementById('result').textContent = pw ? names[score] : '';
});`),
[['비밀번호 강도 검사',{title:'비밀번호 검사',bg:'#fff8e1'}],['비번 약한지 강한지 알려주는 입력창',{title:'비밀번호 강도',bg:'#e0f2fe'}]]);

add('like',p=>page(p,`<h1>${p.title}</h1>
<button id="like" style="font-size: 32px">🤍 좋아요</button>
<p id="count">0명이 좋아해요</p>`,
`let liked = false;
let count = 0;
document.getElementById('like').addEventListener('click', function () {
  liked = !liked;
  count += liked ? 1 : -1;
  this.textContent = liked ? '❤️ 좋아요' : '🤍 좋아요';
  document.getElementById('count').textContent = count + '명이 좋아해요';
});`),
[['좋아요 버튼',{title:'좋아요',bg:'#fce7f3'}],['하트 누르면 숫자 올라가고 한번 더 누르면 취소',{title:'하트 버튼',bg:'#fff8e1'}],['like button',{title:'Like button',lang:'en',bg:'#e0f2fe'}]]);

add('stars',p=>page(p,`<h1>${p.title}</h1>
<div id="stars" style="font-size: 40px; cursor: pointer">☆☆☆☆☆</div>
<p id="text">별을 눌러 점수를 주세요</p>`,
`const stars = document.getElementById('stars');
stars.addEventListener('click', function (e) {
  const rect = stars.getBoundingClientRect();
  const n = Math.min(5, Math.max(1, Math.ceil((e.clientX - rect.left) / (rect.width / 5))));
  stars.textContent = '★'.repeat(n) + '☆'.repeat(5 - n);
  document.getElementById('text').textContent = n + '점을 줬어요';
});`),
[['별점 주는 페이지',{title:'별점',bg:'#fff8e1'}],['별 5개 클릭해서 점수 주기',{title:'별점 주기',bg:'#ede9fe'}]]);

add('draw',p=>page(p,`<h1>${p.title}</h1>
<canvas id="board" width="400" height="300" style="background: white; border: 1px solid #999"></canvas>
<div><button id="clear">지우기</button></div>`,
`const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
let drawing = false;
canvas.addEventListener('mousedown', function () { drawing = true; ctx.beginPath(); });
canvas.addEventListener('mouseup', function () { drawing = false; });
canvas.addEventListener('mousemove', function (e) {
  if (!drawing) return;
  const rect = canvas.getBoundingClientRect();
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  ctx.stroke();
});
document.getElementById('clear').addEventListener('click', function () {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});`),
[['마우스로 그림 그리기',{title:'그림판',bg:'#e0f2fe'}],['그림판 만들어줘 지우개 버튼도',{title:'그림판',bg:'#fff8e1'}],['drawing board',{title:'Drawing board',lang:'en',bg:'#dcfce7'}]]);

add('bounce',p=>page(p,`<h1>${p.title}</h1>
<canvas id="canvas" width="400" height="260" style="background: white; border: 1px solid #999"></canvas>`,
`const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let x = 60;
let y = 60;
let dx = ${p.speed};
let dy = ${Math.max(2,p.speed-1)};
setInterval(function () {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  x += dx;
  y += dy;
  if (x < ${p.r} || x > canvas.width - ${p.r}) dx = -dx;
  if (y < ${p.r} || y > canvas.height - ${p.r}) dy = -dy;
  ctx.fillStyle = '${p.ball}';
  ctx.beginPath();
  ctx.arc(x, y, ${p.r}, 0, Math.PI * 2);
  ctx.fill();
}, 20);`),
[['공이 튀어다니는 화면',{title:'튀는 공',bg:'#e0f2fe',speed:4,r:16,ball:'#ef4444'}],['공 튕기기 애니메이션 빠르게',{title:'빠른 공',bg:'#fff8e1',speed:8,r:14,ball:'#3b82f6'}],['bouncing ball',{title:'Bouncing ball',lang:'en',bg:'#dcfce7',speed:4,r:20,ball:'#22c55e'}]]);

add('arrowmove',p=>page(p,`<h1>${p.title}</h1>
<p>방향키로 움직여 보세요</p>
<div id="player" style="position: absolute; left: 200px; top: 200px; font-size: 40px">${p.icon}</div>`,
`const player = document.getElementById('player');
let x = 200;
let y = 200;
document.addEventListener('keydown', function (e) {
  if (e.key === 'ArrowLeft') x -= 20;
  if (e.key === 'ArrowRight') x += 20;
  if (e.key === 'ArrowUp') y -= 20;
  if (e.key === 'ArrowDown') y += 20;
  player.style.left = x + 'px';
  player.style.top = y + 'px';
});`),
[['방향키로 움직이는 캐릭터',{title:'움직이는 캐릭터',bg:'#e0f2fe',icon:'🐱'}],['화살표 키로 로켓 움직이기',{title:'로켓 움직이기',bg:'#0f172a'.replace('#0f172a',DARK),icon:'🚀'}],['arrow keys move the character',{title:'Move',lang:'en',bg:'#dcfce7',icon:'🐸'}]]);

add('catch',p=>page(p,`<h1>${p.title}</h1>
<p id="info">점수: 0 · 남은 시간: 10초</p>
<button id="target" style="position: absolute; left: 100px; top: 160px">${p.icon}</button>`,
`let score = 0;
let left = 10;
const target = document.getElementById('target');
target.addEventListener('click', function () {
  if (left <= 0) return;
  score += 1;
  target.style.left = Math.random() * 300 + 'px';
  target.style.top = 120 + Math.random() * 200 + 'px';
  update();
});
function update() {
  document.getElementById('info').textContent = '점수: ' + score + ' · 남은 시간: ' + left + '초';
}
const timer = setInterval(function () {
  left -= 1;
  update();
  if (left <= 0) {
    clearInterval(timer);
    document.getElementById('info').textContent = '끝! 점수: ' + score + '점 🎉';
  }
}, 1000);`),
[['움직이는 버튼 빨리 누르는 게임',{title:'잡아라!',bg:'#fff8e1',icon:'⭐'}],['두더지 잡기 비슷한 게임',{title:'두더지 잡기',bg:'#dcfce7',icon:'🐹'}],['10초 동안 많이 누르기 게임',{title:'빨리 누르기',bg:'#ede9fe',icon:'🎯'}]]);

add('clock',p=>page(p,`<h1>${p.title}</h1>
<p id="clock" style="font-size: ${fs_(p,64)}"></p>
<p id="date"></p>`,
`function tick() {
  const now = new Date();
  document.getElementById('clock').textContent = now.toLocaleTimeString('ko-KR');
  document.getElementById('date').textContent = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}
tick();
setInterval(tick, 1000);`),
[['디지털 시계',{title:'시계',bg:'#e0f2fe'}],['지금 시간 보여주는 페이지',{title:'지금 시간',bg:'#fff8e1'}],['digital clock',{title:'Clock',lang:'en',bg:'#ede9fe'}]]);

add('progress',p=>page(p,`<h1>${p.title}</h1>
<progress id="bar" value="0" max="100" style="width: 300px"></progress>
<p id="text">0%</p>
<button id="more">+10%</button>
<button id="reset">처음부터</button>`,
`let value = 0;
function show() {
  document.getElementById('bar').value = value;
  document.getElementById('text').textContent = value + '%';
}
document.getElementById('more').addEventListener('click', function () {
  value = Math.min(100, value + 10);
  show();
});
document.getElementById('reset').addEventListener('click', function () {
  value = 0;
  show();
});`),
[['진행률 막대',{title:'진행 막대',bg:'#dcfce7'}],['버튼 누르면 게이지 차는 페이지',{title:'게이지',bg:'#fff8e1'}]]);

add('tip',p=>page(p,`<h1>${p.title}</h1>
<input id="price" type="number" placeholder="${p.mode==='sale'?'원래 가격':'금액'}">
<input id="rate" type="number" placeholder="${p.mode==='sale'?'할인율 (%)':'비율 (%)'}">
<button id="go">계산하기</button>
<h2 id="result"></h2>`,
`document.getElementById('go').addEventListener('click', function () {
  const price = Number(document.getElementById('price').value);
  const rate = Number(document.getElementById('rate').value);
  ${p.mode==='sale'?"const result = price * (1 - rate / 100);\n  document.getElementById('result').textContent = '할인가: ' + Math.round(result) + '원';":"const result = price * rate / 100;\n  document.getElementById('result').textContent = rate + '%는 ' + Math.round(result) + '입니다';"}
});`),
[['할인 계산기 얼마에 살 수 있는지',{title:'할인 계산기',bg:'#fce7f3',mode:'sale'}],['퍼센트 계산기',{title:'퍼센트 계산기',bg:'#e0f2fe',mode:'pct'}],['세일 가격 계산해주는 페이지',{title:'세일 계산기',bg:'#fff8e1',mode:'sale'}]]);

add('memo',p=>page(p,`<h1>${p.title}</h1>
<textarea id="memo" rows="3" cols="36" placeholder="메모를 쓰세요"></textarea>
<div><button id="save">저장</button></div>
<ul id="list" style="text-align: left; display: inline-block"></ul>`,
`document.getElementById('save').addEventListener('click', function () {
  const memo = document.getElementById('memo');
  if (!memo.value.trim()) return;
  const li = document.createElement('li');
  li.textContent = memo.value.trim();
  document.getElementById('list').appendChild(li);
  memo.value = '';
});`),
[['메모장',{title:'메모장',bg:'#fff8e1'}],['메모 쓰고 저장하면 목록에 쌓이는 페이지',{title:'나의 메모',bg:'#e0f2fe'}],['일기 쓰는 페이지',{title:'일기장',bg:'#fce7f3'}]]);

add('traffic',p=>page(p,`<h1>${p.title}</h1>
<div id="light" style="width: 100px; height: 100px; border-radius: 50%; background: red; margin: 20px auto"></div>
<p id="text">멈춰요!</p>
<button id="next">다음 신호</button>`,
`const states = [['red', '멈춰요!'], ['green', '건너가요!'], ['yellow', '조심해요!']];
let i = 0;
document.getElementById('next').addEventListener('click', function () {
  i = (i + 1) % states.length;
  document.getElementById('light').style.background = states[i][0];
  document.getElementById('text').textContent = states[i][1];
});`),
[['신호등',{title:'신호등',bg:'#e5e7eb'}],['신호등 색 바뀌는 페이지',{title:'신호등',bg:'#fff8e1'}]]);

add('slides',p=>page(p,`<h1>${p.title}</h1>
<p id="emoji" style="font-size: 96px">${p.items[0]}</p>
<button id="prev">◀ 이전</button>
<button id="next">다음 ▶</button>`,
`const items = ${JSON.stringify(p.items)};
let i = 0;
function show() {
  document.getElementById('emoji').textContent = items[i];
}
document.getElementById('prev').addEventListener('click', function () {
  i = (i - 1 + items.length) % items.length;
  show();
});
document.getElementById('next').addEventListener('click', function () {
  i = (i + 1) % items.length;
  show();
});`),
[['동물 사진 넘겨보기',{title:'동물 모음',bg:'#dcfce7',items:['🐶','🐱','🐰','🐻','🦊']}],['이전 다음 버튼으로 이모지 넘기기',{title:'이모지 갤러리',bg:'#fff8e1',items:['😀','😎','🥳','😴','🤖']}],['과일 슬라이드쇼',{title:'과일 모음',bg:'#fce7f3',items:['🍎','🍌','🍇','🍓','🍊']}]]);

add('toggle',p=>page(p,`<h1>${p.title}</h1>
<button id="toggle">${p.btn}</button>
<p id="content" style="display: none">${p.text}</p>`,
`const content = document.getElementById('content');
document.getElementById('toggle').addEventListener('click', function () {
  content.style.display = content.style.display === 'none' ? 'block' : 'none';
});`),
[['버튼 누르면 글이 나타났다 사라지는 페이지',{title:'보이기 숨기기',bg:'#e0f2fe',btn:'눌러 보세요',text:'짠! 숨어 있던 글이에요 🎉'}],['비밀 메시지 보여주기 버튼',{title:'비밀 메시지',bg:'#ede9fe',btn:'비밀 보기',text:'오늘도 수고했어요 ⭐'}],['정답 보기 버튼',{title:'정답 확인',bg:'#fff8e1',btn:'정답 보기',text:'정답은 7이에요'}]]);

add('mood',p=>page(p,`<h1>${p.title}</h1>
<div>
  <button id="happy" style="font-size: 36px">😀</button>
  <button id="soso" style="font-size: 36px">😐</button>
  <button id="sad" style="font-size: 36px">😢</button>
</div>
<h2 id="message">오늘 기분은 어때요?</h2>`,
`function say(text) {
  document.getElementById('message').textContent = text;
}
document.getElementById('happy').addEventListener('click', function () { say('좋은 하루네요! 😊'); });
document.getElementById('soso').addEventListener('click', function () { say('그냥 그런 날도 있죠 🙂'); });
document.getElementById('sad').addEventListener('click', function () { say('힘내요, 내일은 더 좋을 거예요 💪'); });`),
[['오늘 기분 고르는 페이지',{title:'오늘 기분',bg:'#fff8e1'}],['이모지 누르면 메시지 나오는 거',{title:'기분 체크',bg:'#fce7f3'}]]);

add('area',p=>page(p,`<h1>${p.title}</h1>
${p.shape==='circle'?'<input id="r" type="number" placeholder="반지름">':'<input id="w" type="number" placeholder="가로">\n<input id="h" type="number" placeholder="세로">'}
<button id="go">넓이 구하기</button>
<h2 id="result"></h2>`,
`document.getElementById('go').addEventListener('click', function () {
  ${p.shape==='circle'?"const r = Number(document.getElementById('r').value);\n  document.getElementById('result').textContent = '넓이: ' + (Math.PI * r * r).toFixed(2);":"const w = Number(document.getElementById('w').value);\n  const h = Number(document.getElementById('h').value);\n  document.getElementById('result').textContent = '넓이: ' + w * h;"}
});`),
[['원의 넓이 계산기',{title:'원의 넓이',bg:'#e0f2fe',shape:'circle'}],['반지름으로 원 넓이 구하기',{title:'원 넓이',bg:'#fff8e1',shape:'circle'}],['직사각형 넓이 구하기',{title:'직사각형 넓이',bg:'#dcfce7',shape:'rect'}]]);

add('poll',p=>page(p,`<h1>${p.title}</h1>
<button id="a">${p.a} 🅰️</button>
<button id="b">${p.b} 🅱️</button>
<p id="result">${p.a} 0표 · ${p.b} 0표</p>`,
`let a = 0;
let b = 0;
function show() {
  document.getElementById('result').textContent = '${p.a} ' + a + '표 · ${p.b} ' + b + '표';
}
document.getElementById('a').addEventListener('click', function () { a += 1; show(); });
document.getElementById('b').addEventListener('click', function () { b += 1; show(); });`),
[['투표 페이지 두 개 중에 고르는',{title:'투표',bg:'#fff8e1',a:'피자',b:'치킨'}],['강아지 vs 고양이 투표',{title:'강아지 vs 고양이',bg:'#fce7f3',a:'강아지',b:'고양이'}],['여름 겨울 어디가 좋아? 투표',{title:'여름 vs 겨울',bg:'#e0f2fe',a:'여름',b:'겨울'}]]);

add('quiz',p=>page(p,`<h1>${p.title}</h1>
<h2 id="question"></h2>
<input id="answer" type="text">
<button id="submit">제출</button>
<p id="result"></p>
<p id="score">점수: 0</p>`,
`const quiz = ${JSON.stringify(p.quiz)};
let index = 0;
let score = 0;
function ask() {
  document.getElementById('question').textContent = (index + 1) + '. ' + quiz[index][0];
  document.getElementById('answer').value = '';
}
document.getElementById('submit').addEventListener('click', function () {
  if (index >= quiz.length) return;
  const ok = document.getElementById('answer').value.trim() === quiz[index][1];
  if (ok) score += 1;
  document.getElementById('result').textContent = ok ? '정답! 🎉' : '틀렸어요. 정답: ' + quiz[index][1];
  document.getElementById('score').textContent = '점수: ' + score;
  index += 1;
  if (index < quiz.length) {
    ask();
  } else {
    document.getElementById('question').textContent = '끝! ' + quiz.length + '문제 중 ' + score + '개 맞혔어요';
  }
});
ask();`),
[['퀴즈 게임',{title:'퀴즈',bg:'#fff8e1',quiz:[['대한민국의 수도는?','서울'],['3 + 4 = ?','7'],['물은 몇 도에서 끓을까요?','100']]}],['상식 퀴즈 3문제 풀고 점수 알려주는 페이지',{title:'상식 퀴즈',bg:'#e0f2fe',quiz:[['태양계에서 가장 큰 행성은?','목성'],['1년은 몇 개월?','12'],['한글을 만든 왕은?','세종대왕']]}],['구구단 퀴즈',{title:'구구단 퀴즈',bg:'#dcfce7',quiz:[['6 × 7 = ?','42'],['8 × 9 = ?','72'],['4 × 12 = ?','48']]}],['영어 단어 퀴즈',{title:'영어 단어 퀴즈',bg:'#ede9fe',quiz:[['apple은 한글로?','사과'],['dog은 한글로?','개'],['book은 한글로?','책']]}]]);

/* ---------- edits on top of a page ---------- */
const BGW=[['배경을 {c}으로 바꿔줘','배경색 {c}으로','배경 {c}으로 해줘','{c} 배경으로 바꿔 주세요','배경색을 {c}으로']];
function build(){
  const rows=[], seen=new Set();
  for(const t of T){
    for(const [q,p] of t.V){
      const html=t.make(p); rows.push({q,html,id:t.id});
      // phrasing variants: casual, polite
      const alt=[q+' 만들어줘',q+' 만들어 주세요',q+'!',q.replace(/ 만들어줘$/,'')].filter(x=>x!==q);
      const a=alt[Math.floor(rnd()*alt.length)]; if(!seen.has(a)&&/[가-힣]/.test(q)){ seen.add(a); rows.push({q:a,html,id:t.id}); }
      if(!/[가-힣]/.test(q)) continue;
      // edit requests: background colour, title, bigger text
      for(const [name,hex] of Object.entries(COLORS)){ if(rnd()<0.22&&p.bg!==hex){ const cq=pick(['배경을 {c}으로 바꿔줘','배경색 {c}으로','배경 {c}으로 해줘','{c} 배경으로 바꿔 주세요']).replace('{c}',name.replace('색','색')); rows.push({q:cq,cur:html,html:t.make({...p,bg:hex}),id:t.id+'-bg'}); } }
      if(rnd()<0.4){ rows.push({q:pick(['배경을 어둡게 해줘','다크 모드로 바꿔줘','배경 검은색으로']),cur:html,html:t.make({...p,bg:DARK}),id:t.id+'-dark'}); }
      if(rnd()<0.35){ const nt=pick(['내 첫 페이지','우리 반','재미있는 놀이터','오늘의 도전','연습장']); rows.push({q:pick(['제목을 "{t}"로 바꿔줘','제목 {t}로 바꿔','제목을 {t}(으)로 해줘']).replace('{t}',nt),cur:html,html:t.make({...p,title:nt}),id:t.id+'-title'}); }
      if(rnd()<0.3&&/font-size/.test(html)){ rows.push({q:pick(['글자를 더 크게 해줘','숫자 크게','글씨 크기 키워줘']),cur:html,html:t.make({...p,fs:100}),id:t.id+'-big'}); }
    }
    // the four chip prompts of the editor, on the first page of every template
    const [q0,p0]=t.V[0]; if(/[가-힣]/.test(q0)){ const html0=t.make(p0);
      rows.push({q:'배경을 밤하늘로 바꿔 줘',cur:html0,html:t.make({...p0,bg:DARK}),id:'chip-night-'+t.id});
      rows.push({q:'제목 글자를 더 크고 빨갛게 해 줘',cur:html0,html:html0.replace(/<h1( id="[^"]*")?>/,(m,a)=>'<h1'+(a||'')+' style="font-size: 64px; color: #ef4444">'),id:'chip-title-'+t.id});
      if(/addEventListener\('click', function \(\) \{/.test(html0)){
        let h=html0.replace(/(\n {4})(let |const |function |document)/,'$1function beep() {\n      const audio = new (window.AudioContext || window.webkitAudioContext)();\n      const osc = audio.createOscillator();\n      osc.connect(audio.destination);\n      osc.frequency.value = 523;\n      osc.start();\n      osc.stop(audio.currentTime + 0.15);\n    }\n$1$2');
        h=h.replace(/addEventListener\('click', function \(\) \{\n/,m=>m+'      beep();\n');
        if(h!==html0&&/beep\(\);/.test(h)) rows.push({q:'버튼을 누르면 소리가 나게 해 줘',cur:html0,html:h,id:'chip-sound-'+t.id}); }
      if(t.id==='counter'){ rows.push({q:'점수가 10이 되면 축하 메시지를 띄워 줘',cur:html0,html:html0.replace("  count += 1;\n","  count += 1;\n  if (count === 10) {\n    alert('10점! 축하해요 🎉');\n  }\n"),id:'chip-ten-counter'}); }
    }
  }
  return rows;
}
if(require.main===module){
  const rows=build().filter(r=>(r.html!==r.cur));
  fs.writeFileSync(path.join(__dirname,'raw','html-gen.jsonl'),rows.map(r=>JSON.stringify({q:r.q,cur:r.cur||null,html:r.html,id:r.id})).join('\n')+'\n');
  console.log('html-gen rows',rows.length,'new',rows.filter(r=>!r.cur).length,'edit',rows.filter(r=>r.cur).length);
}
module.exports={build};
