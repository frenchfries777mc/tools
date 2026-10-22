#!/usr/bin/env node
/* FF777 1.6: 끝말잇기 (last-letter word chain), 80 rows, because the model had never seen the game (owner picked 80 rows 2026-10-22).
   Every AI word starts with the last letter of the word before it, checked here (a row that does not chain is dropped), and every answer
   writes that letter in quotes first. Words are common nouns with a short meaning for "뜻이 뭐야" questions. Output: data/v16-word.jsonl ({task:'word16', messages}).
   node train/genword16.js */
'use strict';
const fs=require('fs'), path=require('path');
const OUT=path.join(__dirname,'data'), ROOT=path.join(__dirname,'..');
const P=require(path.join(ROOT,'ai-prompts.js'));
let seed=20261022; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const pick=a=>a[Math.floor(rnd()*a.length)];
const shuffle=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const W={ // word: meaning (common nouns, none ends in a letter that changes by the initial-sound rule)
'사과':'빨갛고 새콤달콤한 과일','과자':'밀가루나 설탕으로 만든 간식','자동차':'엔진의 힘으로 달리는 탈것','차표':'기차나 버스를 타기 위한 표','표범':'몸에 점무늬가 있는 사나운 동물',
'범고래':'몸이 검고 하얀 큰 고래','고래':'바다에 사는 가장 큰 포유동물','래프팅':'고무보트를 타고 강을 내려가는 놀이','기차':'철길 위를 달리는 탈것','차돌':'단단하고 반질반질한 돌',
'돌고래':'영리하고 사람과 친한 바다 동물','구두':'가죽으로 만든 신발','두부':'콩으로 만든 하얀 음식','부채':'흔들어 바람을 내는 도구','채소':'밭에서 기르는 잎이나 뿌리 식물',
'소나무':'사철 푸르고 바늘 같은 잎이 달린 나무','무지개':'비 온 뒤 하늘에 뜨는 일곱 빛깔 띠','개구리':'물가에 살고 폴짝 뛰는 동물','리본':'머리나 선물을 묶는 띠','본드':'물건을 붙이는 접착제',
'드라마':'이야기를 연기로 보여 주는 방송','마스크':'입과 코를 가리는 덮개','크레파스':'색깔이 있는 그림 그리는 막대','스케치북':'그림을 그리는 공책','북극':'지구의 가장 북쪽 지역',
'극장':'영화를 보는 곳','장미':'가시가 있고 향기로운 꽃','미끄럼틀':'타고 내려오는 놀이터 기구','틀니':'빠진 이를 대신하는 가짜 이','니트':'뜨개질로 짠 옷',
'트럭':'짐을 싣는 큰 자동차','럭비':'타원형 공을 들고 달리는 운동','비행기':'하늘을 나는 탈것','기린':'목이 아주 긴 동물','인형':'사람이나 동물 모양으로 만든 장난감',
'형광펜':'글씨 위에 색을 칠하는 펜','펜션':'가족이나 친구와 묵는 작은 숙소','선풍기':'바람을 일으키는 여름 가전','기타':'줄을 튕겨 소리를 내는 악기','타조':'날지 못하고 빨리 달리는 큰 새',
'조개':'바닷가 모래에 사는 딱딱한 껍데기 동물','개미':'줄지어 다니는 작은 곤충','미역':'바다에서 나는 미끈한 해초','역사':'지나온 일의 기록','사다리':'높은 곳에 오를 때 쓰는 도구',
'리모컨':'멀리서 텔레비전을 조종하는 도구','컨테이너':'짐을 싣는 큰 쇠 상자','너구리':'꼬리가 굵고 눈 주위가 검은 동물','이불':'잘 때 덮는 포근한 천','불꽃':'불이 타오르며 튀는 빛',
'꽃병':'꽃을 꽂아 두는 병','병아리':'알에서 막 나온 어린 닭','아침':'하루의 시작인 이른 시간','침대':'누워서 자는 가구','대나무':'속이 비고 마디가 있는 곧은 식물',
'나비':'꽃 사이를 날아다니는 날개 달린 곤충','비누':'손을 씻을 때 쓰는 거품 나는 물건','누룽지':'솥 바닥에 눌어붙은 밥','지우개':'연필 글씨를 지우는 물건','개나리':'봄에 노랗게 피는 꽃',
'리듬':'소리의 빠르고 느린 흐름','듬직':'','기억':'지난 일을 마음에 남겨 둠','억새':'가을 들판에 피는 은빛 풀','새우':'등이 굽은 바다 동물','우산':'비를 막는 도구',
'산타':'크리스마스에 선물을 주는 할아버지','타이어':'자동차 바퀴에 끼우는 고무','어항':'물고기를 기르는 유리 그릇','항아리':'장이나 김치를 담는 큰 그릇','리코더':'입으로 불어 소리 내는 악기',
'더위':'여름의 뜨거운 기운','위성':'행성 둘레를 도는 천체','성냥':'긁어서 불을 붙이는 도구','냥이':'','이름':'사람이나 물건을 부르는 말','름':''
};
const words=Object.keys(W).filter(w=>W[w]&&w.length>=2);
const byFirst={}; for(const w of words){ (byFirst[w[0]]=byFirst[w[0]]||[]).push(w); }
const last=w=>w[w.length-1];
const bat=c=>(c.charCodeAt(0)-0xAC00)%28;   // 0 = no final consonant, 8 = ㄹ
const eun=w=>w+(bat(last(w))?'은':'는'), ro=c=>c+(bat(c)&&bat(c)!==8?'으로':'로');
const nexts=(w,used)=>(byFirst[last(w)]||[]).filter(x=>x!==w&&!used.has(x));
const hasNext=w=>(byFirst[last(w)]||[]).length>0;
const chainable=words.filter(hasNext);
const SYS=[P.askSys,null];
const sysMsg=(s,u)=>s?[{role:'system',content:s},{role:'user',content:s===P.askSys?'(No table selected.)\n\nQuestion: '+u:u}]:[{role:'user',content:u}];
const START=['끝말잇기 하자','끝말잇기 할래?','우리 끝말잇기 해요','끝말잇기 ㄱㄱ','심심한데 끝말잇기 하자','끝말잇기 하자. 네가 먼저 해'];
const ing=[], q=(a,s,u,ans)=>ing.push({task:'word16',messages:[...sysMsg(s,u),{role:'assistant',content:ans}]});
const ok=(prev,nw)=>nw[0]===last(prev);
let n=0;
// 1) the AI starts the game
for(let k=0;k<12;k++){ const w=pick(chainable.filter(hasNext)); q(null,pick(SYS),pick(START),'좋아요! 제가 먼저 할게요. "'+w+'"\n"'+last(w)+'"'+(bat(last(w))&&bat(last(w))!==8?'으로':'로')+' 시작하는 말을 이어 주세요.'); }
// 2) the user says a word, the AI chains from its last letter
for(let k=0;k<34;k++){
  const w=pick(chainable), cand=nexts(w,new Set()); if(!cand.length) continue; const nw=pick(cand); if(!ok(w,nw)) continue;
  const lead=pick(['','좋아요! ','네! ','오, ','']);
  q(null,pick(SYS),pick(['끝말잇기: '+w,w,'내 차례: '+w,'"'+w+'"']),lead+'"'+w+'"의 마지막 글자는 "'+last(w)+'"예요. "'+nw+'"\n"'+last(nw)+'"(으)로 시작하는 말을 이어 주세요.');
}
// 3) the user's word does not start with the last letter: say so politely
for(let k=0;k<12;k++){
  const prev=pick(chainable), wrong=pick(words.filter(x=>x[0]!==last(prev)));
  const tell='"'+prev+'"의 마지막 글자는 "'+last(prev)+'"예요. "'+wrong+'"은(는) "'+wrong[0]+'"(으)로 시작해서 이어지지 않아요. "'+last(prev)+'"(으)로 시작하는 말을 다시 말해 주세요.';
  ing.push({task:'word16',messages:[{role:'user',content:'끝말잇기 하자'},{role:'assistant',content:'좋아요! 제가 먼저 할게요. "'+prev+'"\n"'+last(prev)+'"(으)로 시작하는 말을 이어 주세요.'},{role:'user',content:wrong},{role:'assistant',content:tell}]});
}
// 4) the meaning of a word in the game (a short true meaning from the list)
for(let k=0;k<12;k++){ const w=pick(words); q(null,pick(SYS),pick([w+' 뜻이 뭐야',w+' 무슨 뜻이야?',w+' 뜻?']),'"'+w+'"'+(bat(last(w))?'은 ':'는 ')+W[w]+'이에요.'); }
// 5) a word the AI does not know: do not invent
const FAKE=['꾸럭미','엉따리','쁘룽이','후루미','샤닝코','도뚜라','낭끼루'];
for(let k=0;k<5;k++){ const f=pick(FAKE); q(null,pick(SYS),pick([f+' 뜻이 뭐야',f+' 무슨 뜻이야?']),'"'+f+'"'+(bat(last(f))?'은':'는')+' 잘 모르겠어요. 지어내고 싶지 않아서 아는 말만 이어 갈게요.'); }
// 6) a full chain of three turns in one conversation
for(let k=0;k<5;k++){
  const a=pick(chainable), b=pick(nexts(a,new Set())), cs=nexts(b,new Set([a])); if(!cs.length) continue; const c=pick(cs);
  const nb=nexts(c,new Set([a,b]))[0]; if(!nb) continue;
  ing.push({task:'word16',messages:[{role:'user',content:'끝말잇기 하자. 내가 먼저: '+a},{role:'assistant',content:'좋아요! "'+a+'"의 마지막 글자는 "'+last(a)+'"예요. "'+b+'"\n"'+last(b)+'"(으)로 시작하는 말을 이어 주세요.'},{role:'user',content:c},{role:'assistant',content:'"'+c+'"의 마지막 글자는 "'+last(c)+'"예요. "'+nb+'"\n"'+last(nb)+'"(으)로 시작하는 말을 이어 주세요.'}]});
}
// particles after a quoted word: pick by the final consonant ("극"이에요, "장"으로, "부채"는)
const fixJosa=t=>t.replace(/"([^"]+)"(\(으\)로|은\(는\)|예요)/g,(m,w,j)=>{ const c=w[w.length-1], b=bat(c); return '"'+w+'"'+(j==='예요'?(b?'이에요':'예요'):j==='은(는)'?(b?'은':'는'):(b&&b!==8?'으로':'로')); });
for(const r of ing) for(const x of r.messages) if(x.role==='assistant') x.content=fixJosa(x.content);
// check: every "X" the AI offers after a quoted last letter starts with that letter
let bad=0; const outRows=[];
for(const r of ing){
  const a=r.messages[r.messages.length-1].content, m=/마지막 글자는 "(.)"(?:이에요|예요)\. "([^"]+)"\n"(.)"/.exec(a);
  if(m&&m[2][0]!==m[1]){ bad++; continue; }
  if(m&&m[2][m[2].length-1]!==m[3]){ bad++; continue; }
  outRows.push(r);
}
const out=shuffle(outRows).slice(0,+process.env.ROWS||80);
fs.writeFileSync(path.join(OUT,'v16-word.jsonl'),out.map(r=>JSON.stringify(r)).join('\n')+'\n');
console.log('built',ing.length,'dropped',bad,'written',out.length);
