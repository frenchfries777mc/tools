#!/usr/bin/env node
/* FF777 1.5: the owner's dad jokes (raw/joke-1.jsonl) as exact question -> answer pairs, so the model learns which answer belongs to which question
   (1.4 mixed them up: "도둑이 자기소개할 때 하는 말은? 아빠인가"). Writes raw/joke-2.jsonl, same shape as joke-1; build6.js takes it as 'newjoke'.
   node train/genjoke.js ; then node train/check.js self train/raw/joke-2.jsonl */
'use strict';
const fs=require('fs'), path=require('path');
const RAW=path.join(__dirname,'raw');
let seed=20261019; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const pick=a=>a[Math.floor(rnd()*a.length)];
const shuffle=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const L=fs.readFileSync(path.join(RAW,'joke-1.jsonl'),'utf8').split('\n').filter(Boolean).map(JSON.parse);
const clean=s=>s.replace(/(ㅎㅎ|😄|😅)/g,'').replace(/\s*(썰렁했나요\?|썰렁해도 웃어 주세요|아재개그 문제네요)[^\n]*/g,'').replace(/[!.\s]+$/,'').replace(/^["“”]|["“”]$/g,'').trim();
const J=new Map();
const add=(q,a)=>{ q=q.replace(/^좋아요!\s*/,'').trim(); a=clean(a); if(q&&a&&!J.has(q)) J.set(q,a); };
for(const r of L){
  const a=r.answer, x=/([^\n]*\?)\s*\n\s*정답은\s*([^\n]*)/.exec(a);
  if(x){ add(x[1].replace(/^.*?(?:볼게요|갑니다|낼게요)[!.]?\s*/,''),x[2]); continue; }
  if(/\n\d\)/.test(a)){ for(const y of a.matchAll(/\d\)\s*([^\n?]*\?)\s*([^\n]*)/g)) add(y[1],y[2]); continue; }
  if(/\?$/.test(r.q)&&!/(아재|개그|퀴즈|말장난|농담|웃긴|심심)/.test(r.q)) add(r.q,a.replace(/^(?:정답은|답은)\s*/,''));
}
const jokes=[...J].map(([q,a])=>({q,a}));
const rows=[]; const out=(q,answer)=>rows.push({table:null,q,answer});
const ASK=['아재개그 해줘','아재개그 하나만','아재개그 하나 해 줘','아재개그 ㄱㄱ','심심해 아재개그','다른 거','아재개그 하나 더','웃긴 거 하나','아재개그 문제 내봐','아재개그 퀴즈'];
const INTRO=['문제 낼게요.','하나 갑니다!','네, 하나 던져 볼게요.','좋아요!','',''];
const TAIL=['',' 😄','',' ㅎㅎ'];
const ANSQ=['정답이 뭐야','답이 뭐야','정답 알려줘','답 알려줘'];
for(const j of jokes){
  out(j.q,'정답은 '+j.a+'!'+pick(TAIL));                                     // the riddle itself
  out(j.q,j.a+'! 아재개그 문제네요 ㅎㅎ');
  out(j.q+' '+pick(ANSQ),'정답은 '+j.a+'!');
  for(let k=0;k<2;k++){ const i=pick(INTRO); out(pick(ASK),(i?i+' ':'')+j.q+'\n정답은 '+j.a+'!'+pick(TAIL)); }
  out('아재개그 외워?', '네, 외워요! 예를 들면 '+j.q+' 정답은 '+j.a+'!');
}
for(let k=0;k<60;k++){                                                        // several at once: every riddle keeps its own answer
  const n=pick([2,3,3,3,4,5]), s=shuffle(jokes).slice(0,n);
  const word={2:'두',3:'세',4:'네',5:'다섯'}[n], cnt={2:'두 개',3:'세 개',4:'네 개',5:'다섯 개'}[n];
  const q=pick([`아재개그 ${n}개`,`아재개그 ${cnt}만`,'아재개그 여러 개 해줘','너가 아는 아재개그 다 말해봐','넌센스 퀴즈 '+n+'개']);
  out(q,`${cnt} 갑니다!\n`+s.map((x,i)=>`${i+1}) ${x.q} ${x.a}!`).join('\n'));
}
fs.writeFileSync(path.join(RAW,'joke-2.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
console.log('jokes',jokes.length,'rows',rows.length);
