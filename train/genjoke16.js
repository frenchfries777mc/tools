#!/usr/bin/env node
/* FF777 1.6: the owner's 115 dad jokes (ai-chat/jokes.js) learned by heart, about 1,440 rows (80% of the 1.6 chat share, see
   /mnt/project-files/tools/ff777-1.6-plan.md and joke-check-lectus-1.5-2026-10-21.md).
   Every joke appears under the 3 prompts the site really uses (askSys + "(No table selected.)\n\nQuestion:", the chat prompt at 1/3/7-answer lengths, none),
   with reworded questions, a reversed question (answer -> riddle), a short explanation of the pun (train/joke-why.json), the 48 jokes
   lectus 1.5 got wrong twice, and confusable groups asked in a row. Output: data/v16-joke.jsonl ({task:'joke16', messages}).
   node train/genjoke16.js */
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..'), OUT=path.join(__dirname,'data');
const P=require(path.join(ROOT,'ai-prompts.js'));
const J=require(path.join(ROOT,'ai-chat','jokes.js')).jokes;   // [[q,a]...]
const WHY=JSON.parse(fs.readFileSync(path.join(__dirname,'joke-why.json'),'utf8'));
let seed=20261022; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const pick=a=>a[Math.floor(rnd()*a.length)];
const shuffle=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const base=ask=>'You are chatting with a curious person. '+ask+' Be warm and natural. Plain text only: no markdown tables, no code fences. Use the language the question is written in.';
const CHAT=[base('Answer in 1 to 3 short sentences.'), base('Answer in 3 to 5 sentences with one concrete example.'), base('Be talkative: answer in 6 to 10 sentences, explain the idea step by step with a concrete example, then end with a friendly follow-up question or tip.')];
const chatSys=()=>pick([CHAT[0],CHAT[1],CHAT[1],CHAT[2]]);
const ASK=u=>({s:P.askSys,u:'(No table selected.)\n\nQuestion: '+u});
const msgs=(s,u,a)=>s?[{role:'system',content:s},{role:'user',content:u},{role:'assistant',content:a}]:[{role:'user',content:u},{role:'assistant',content:a}];
const WRONG=new Set([3,5,6,7,8,11,12,19,21,22,23,25,26,27,36,38,42,44,45,46,47,48,50,52,53,57,60,61,62,72,74,76,77,81,83,84,85,88,90,91,100,104,108,109,110,111,112,113]);
const TAIL=['',' 😄','',' ㅎㅎ'], ANSQ=['정답이 뭐야','답이 뭐야','정답 알려줘','답 알려줘','뭔데','정답이 뭐야?'];
const ASKJ=['아재개그 해줘','아재개그 하나만','아재개그 하나 해 줘','아재개그 ㄱㄱ','심심해 아재개그','다른 거','아재개그 하나 더','웃긴 거 하나','넌센스 퀴즈 하나'];
const INTRO=['문제 낼게요.','하나 갑니다!','네, 하나 던져 볼게요.','좋아요!',''];
const ans=(j,i,why)=>{ const w=why&&WHY[i]?' '+WHY[i]:''; return '정답은 '+j[1]+'!'+w+pick(TAIL); };
const reword=q=>{ const b=q.replace(/\?$/,''); return pick([b+' 뭘까?', b+'?', b.replace(/\s+/g,'')+'?', '문제: '+q, '퀴즈! '+q, '맞혀 봐. '+q]); };
const rows=[]; const add=(s,u,a)=>rows.push({task:'joke16',messages:msgs(s,u,a)});
J.forEach((j,i)=>{
  const [q,a]=j, reps=WRONG.has(i)?2:1;
  for(let r=0;r<reps;r++){
    const A=ASK(q); add(A.s,A.u,ans(j,i,false));                           // the exact training prompt
    const A2=ASK(reword(q)); add(A2.s,A2.u,ans(j,i,true));
    add(chatSys(),q,ans(j,i,true));                                        // the AI chat page
    add(chatSys(),reword(q),ans(j,i,false));
    add(null,q,ans(j,i,r===0));                                            // no system prompt
    add(null,reword(q)+' '+pick(ANSQ),ans(j,i,false));
  }
  const intro=pick(INTRO);
  { const x=pick(ASKJ), body=(intro?intro+' ':'')+q+'\n'+ans(j,i,false);   // asked for a joke: riddle and answer together
    if(rnd()<0.5){ const A=ASK(x); add(A.s,A.u,body); } else add(chatSys(),x,body); }
  add(chatSys(),pick(ANSQ).replace(/^/,q+' '),ans(j,i,true));                          // the follow-up question carries the riddle, so the answer never depends on memory of the turn before
  add(chatSys(),'정답이 "'+a+'"인 아재개그 알아?','네! '+q+'\n정답은 '+a+'!');             // reversed: answer -> riddle
  add(null,'"'+a+'" 이 정답인 문제가 뭐였지?',q+' 정답은 '+a+'!');
});
// confusable groups, asked one after the other in one conversation
const G=[[36,37,38,77,83,104,105],[85,100,110],[8,15,63],[1,15,56],[31,30],[52,66],[39,34,29]];
for(const g of G) for(let k=0;k<5;k++){
  const sel=shuffle(g).slice(0,Math.min(g.length,pick([3,4,5]))), n=sel.length;
  const cnt={2:'두 개',3:'세 개',4:'네 개',5:'다섯 개'}[n]||'여러 개';
  add(pick([chatSys(),P.askSys,null]),pick(['아재개그 '+n+'개','넌센스 퀴즈 '+n+'개','아재개그 '+cnt+'만']),cnt+' 갑니다!\n'+sel.map((x,i)=>`${i+1}) ${J[x][0]} ${J[x][1]}!`).join('\n'));
}
let out=shuffle(rows);
const WANT=+process.env.ROWS||1440;
if(out.length>WANT) out=out.slice(0,WANT);
fs.writeFileSync(path.join(OUT,'v16-joke.jsonl'),out.map(r=>JSON.stringify(r)).join('\n')+'\n');
const cover=new Set(); for(const r of out){ const m=r.messages, a=m[m.length-1].content; J.forEach((j,i)=>{ if(a.includes('정답은 '+j[1]+'!')||a.includes(j[1]+'!')) cover.add(i); }); }
console.log('jokes',J.length,'rows',rows.length,'written',out.length,'jokes covered',cover.size);
