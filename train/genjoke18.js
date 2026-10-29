#!/usr/bin/env node
/* FF777 1.8: "tell me any dad joke" (mastery round: every joke 5+ times, plus "one more" turns) requests (short and loose wording too) always answer with one of the owner's 115 jokes
   (ai-chat/jokes.js), never an invented one. See /mnt/project-files/tools/ff777-1.7-plan.md ("아무거나 해줘").
   Output: data/v18-anyjoke.jsonl ({task:'joke18', messages}). node train/genjoke18.js */
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..'), OUT=path.join(__dirname,'data');
const P=require(path.join(ROOT,'ai-prompts.js'));
const J=require(path.join(ROOT,'ai-chat','jokes.js')).jokes;   // [[q,a]...]
let seed=20261029; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const pick=a=>a[Math.floor(rnd()*a.length)];
const shuffle=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const base=ask=>'You are chatting with a curious person. '+ask+' Be warm and natural. Plain text only: no markdown tables, no code fences. Use the language the question is written in.';
const CHAT=[base('Answer in 1 to 3 short sentences.'), base('Answer in 3 to 5 sentences with one concrete example.'), base('Be talkative: answer in 6 to 10 sentences, explain the idea step by step with a concrete example.')];
const chatSys=()=>pick([CHAT[0],CHAT[1],CHAT[1],CHAT[2]]);
const msgs=(s,u,a)=>s?[{role:'system',content:s},{role:'user',content:u},{role:'assistant',content:a}]:[{role:'user',content:u},{role:'assistant',content:a}];
// short, loose and polite wordings of "tell me a dad joke"
const REQ=['아재개그','아재개그 하나만','아재개그 좀','아재개그 하나','아재개그 해줘','아재개그 해 줘','아재개그 하나 해줘','아재개그 하나 해 줘','아재개그 하나만 해줘','아재개그 하나만 해 봐',
 '아재개그 ㄱ','아재개그 ㄱㄱ','아재개그 한번','아재개그 한 번 해봐','아재개그 한 개','아재개그 1개','아재개그 한 방','아재개그 던져봐','아재개그 던져 줘','아재개그 말해봐','아재개그 말해줘','아재개그 알려줘',
 '아재개그 있어?','아재개그 할 줄 알아?','아재개그 쳐봐','아재개그 쳐 줘','아재개그 부탁해','아재개그 부탁','아재개그 하나 부탁해요','아재개그 좀 해주세요','아재개그 하나 해주세요','아재개그 하나만요','아재개그 하나 줘',
 '아재 개그','아재 개그 하나','아재 개그 좀','아재개그 퀴즈','아재개그 문제','아재개그 문제 내줘','아재개그 문제 하나','아재개그 퀴즈 하나 내줘','넌센스 퀴즈 하나','넌센스 퀴즈 내줘','넌센스 퀴즈','넌센스 문제',
 '개그','개그 하나','개그 하나만','개그 좀','개그 ㄱ','개그 해줘','개그 해 봐','웃긴 거 하나','웃긴 거 해줘','웃긴 얘기 해줘','웃긴 말 해봐','웃겨줘','웃겨 봐','웃겨봐','나 웃겨줘','하나만','하나 해줘','하나 해봐','하나 더','다른 거','다른 거 해줘','또 해줘','또','한 번 더','하나 더 해줘','다른 아재개그','다른 아재개그 하나',
 '심심해 아재개그','심심해 개그 해줘','심심한데 아재개그','심심한데 웃겨줘','기분 안 좋아 웃겨줘','기분 전환 아재개그','졸려 아재개그','졸려 개그 하나','아침이니까 아재개그','퇴근 전에 아재개그','점심 먹고 아재개그',
 'dad joke','dad joke please','tell me a dad joke','tell me a joke','joke','a joke please','one more joke','another joke',
 '아재개그 하나 말해 줄래?','아재개그 하나 해 줄래?','아재개그 하나 들려줘','아재개그 들려줘','재밌는 아재개그 하나','제일 웃긴 아재개그','제일 웃긴 거','랜덤 아재개그','아무 아재개그나','아무거나 하나','아무 개그나','아재개그 아무거나','웃긴 아재개그 해줘','추천 아재개그'];
const INTRO=['문제 낼게요.','하나 갑니다!','네, 하나 던져 볼게요.','좋아요!','자, 갑니다!',''];
const TAIL=['',' 😄','',' ㅎㅎ'];
const answer=j=>{ const i=pick(INTRO); return (i?i+' ':'')+j[0]+'\n정답은 '+j[1]+'!'+pick(TAIL); };
const sys=()=>pick([null,P.askSys,chatSys(),chatSys()]);
const user=(s,u)=> s===P.askSys?'(No table selected.)\n\nQuestion: '+u:u;
const rows=[]; const add=(j,u)=>{ const s=sys(); rows.push({task:'joke18',messages:msgs(s,user(s,u),answer(j))}); };
const reqs=shuffle(REQ); let k=0;
const nextReq=()=>{ if(k%reqs.length===0) shuffle(REQ).forEach((x,n)=>reqs[n]=x); return reqs[k++%reqs.length]; };
// every joke 5 times as a single-turn answer to a different wording
const order=[]; for(let r=0;r<5;r++) order.push(...shuffle(J.map((_,i)=>i)));
for(const i of order) add(J[i],nextReq());
// every wording at least 4 times
const seen={}; rows.forEach(r=>{ const u=r.messages.find(m=>m.role==='user').content.replace(/^\(No table selected\.\)\n\nQuestion: /,''); seen[u]=(seen[u]||0)+1; });
for(const x of REQ) for(let n=seen[x]||0;n<4;n++) add(pick(J),x);
// "one more" turns: the second joke is a different one from the first, and every joke is the second at least twice
const MORE=['하나 더','또','또 해줘','다른 거','다른 거 해줘','다른 아재개그','다른 개그','한 번 더','하나 더 해줘','더 해줘','one more','another one','또 없어?','다른 거 없어?','계속','ㅇㅇ 하나 더','아재개그 하나 더','웃긴 거 또','다음','다음 아재개그'];
const multi=(a,b,u1,u2,s)=>({task:'joke18',messages:[...(s?[{role:'system',content:s}]:[]),{role:'user',content:user(s,u1)},{role:'assistant',content:answer(a)},{role:'user',content:user(s,u2)},{role:'assistant',content:answer(b)}]});
const second=[]; for(let r=0;r<2;r++) second.push(...shuffle(J.map((_,i)=>i)));
for(const i of second){ let j; do{ j=Math.floor(rnd()*J.length); }while(j===i); const s=sys(); rows.push(multi(J[j],J[i],nextReq(),pick(MORE),s)); }
// a third turn for some
for(let n=0;n<40;n++){ const [a,b,c]=shuffle(J.map((_,i)=>i)).slice(0,3); const s=sys(); const m=multi(J[a],J[b],nextReq(),pick(MORE),s); m.messages.push({role:'user',content:user(s,pick(MORE))},{role:'assistant',content:answer(J[c])}); rows.push(m); }
const out=shuffle(rows);
fs.writeFileSync(path.join(OUT,'v18-anyjoke.jsonl'),out.map(r=>JSON.stringify(r)).join('\n')+'\n');
const cover=new Set(); out.forEach(r=>{ const a=r.messages.filter(m=>m.role==='assistant').map(m=>m.content).join('\n'); J.forEach((j,i)=>{ if(a.includes(j[0])&&a.includes('정답은 '+j[1]+'!')) cover.add(i); }); });
console.log('wordings',REQ.length,'rows',out.length,'jokes covered',cover.size+'/'+J.length);
