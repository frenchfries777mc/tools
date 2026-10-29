#!/usr/bin/env node
/* FF777 1.8: 끝말잇기 (last-letter word chain), ~540 rows, many of them whole games of 3-6 rounds. Words come from train/ref/words18.json (1,700+ common nouns
   with a short meaning, vetted). Every AI word starts with the last letter of the word before it (checked here: a row that does not chain is dropped), the AI never
   repeats a word, and every answer writes that letter in quotes. Output: data/v18-word.jsonl ({task:'word18', messages}). node train/genword18.js */
'use strict';
const fs=require('fs'), path=require('path');
const OUT=path.join(__dirname,'data'), ROOT=path.join(__dirname,'..');
const P=require(path.join(ROOT,'ai-prompts.js'));
let seed=20261029; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const pick=a=>a[Math.floor(rnd()*a.length)];
const shuffle=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const W=JSON.parse(fs.readFileSync(path.join(__dirname,'ref','words18.json'),'utf8'));
const words=Object.keys(W).filter(w=>W[w]&&w.length>=2&&/^[가-힣]+$/.test(w));
const byFirst={}; for(const w of words){ (byFirst[w[0]]=byFirst[w[0]]||[]).push(w); }
const last=w=>w[w.length-1];
const bat=c=>(c.charCodeAt(0)-0xAC00)%28;
const iy=c=>bat(c)?'이에요':'예요';
const ro=c=>c+(bat(c)&&bat(c)!==8?'으로':'로');
const nexts=(w,used)=>(byFirst[last(w)]||[]).filter(x=>x!==w&&!used.has(x));
const chainable=words.filter(w=>nexts(w,new Set()).length>1);
const ask=w=>'"'+last(w)+'" '+(bat(last(w))&&bat(last(w))!==8?'으로':'로');
const ASKTAIL=c=>'"'+c+'"'+(bat(c)&&bat(c)!==8?'으로':'로')+' 시작하는 말을 이어 주세요.';
const SYS=[P.askSys,null,null,null];
const sysMsg=s=>s?[{role:'system',content:s}]:[];
const wrapUser=(s,u)=>s===P.askSys?'(No table selected.)\n\nQuestion: '+u:u;
const START=['끝말잇기 하자','끝말잇기 할래?','우리 끝말잇기 해요','끝말잇기 ㄱㄱ','심심한데 끝말잇기 하자','끝말잇기 하자. 네가 먼저 해','끝말잇기 하자 내가 먼저 할게','끝말잇기','끝말잇기 해줘','끝말잇기 한 판 하자','끝말잇기 하고 싶어'];
const LEAD=['','','좋아요! ','네! ','오, ','좋아요, '];
const rows=[]; const push=(s,turns)=>{ const m=sysMsg(s); turns.forEach((t,i)=>{ m.push({role:i%2?'assistant':'user',content:i%2?t:(i===0?wrapUser(s,t):t)}); }); rows.push({task:'word18',messages:m}); };
const aiTurn=(w,nw)=>pick(LEAD)+'"'+w+'"의 마지막 글자는 "'+last(w)+'"'+iy(last(w))+'. "'+nw+'"\n'+ASKTAIL(last(nw));
const aiFirst=w=>pick(['좋아요! 제가 먼저 할게요. ','좋아요! 제가 먼저 시작할게요. ','네, 해요! 제가 먼저 할게요. '])+'"'+w+'"\n'+ASKTAIL(last(w));
const userSays=w=>pick([w,w,w,'"'+w+'"','내 차례: '+w,'끝말잇기: '+w,w+'!',w+' 이야']);
// 1) whole games: the user starts (or the AI does), 3-6 rounds, nobody repeats a word
let games=0, tries=0;
while(games<300&&tries++<5000){
  const s=pick(SYS), n=3+Math.floor(rnd()*4), used=new Set(), turns=[]; let ok=true;
  const aiStarts=rnd()<.3; let prev;
  if(aiStarts){ turns.push(pick(START)); prev=pick(chainable); used.add(prev); turns.push(aiFirst(prev)); }
  else { prev=pick(chainable); used.add(prev); turns.push(userSays(prev)); const nw=pick(nexts(prev,used)||[]); if(!nw){ continue; } used.add(nw); turns.push(aiTurn(prev,nw)); prev=nw; }
  for(let r=1;r<n&&ok;r++){
    const uc=nexts(prev,used); if(!uc.length){ ok=false; break; } const uw=pick(uc); used.add(uw);
    const ac=nexts(uw,used); if(!ac.length){ ok=false; break; } const aw=pick(ac); used.add(aw);
    if(aw[0]!==last(uw)||uw[0]!==last(prev)) { ok=false; break; }
    turns.push(userSays(uw)); turns.push(aiTurn(uw,aw)); prev=aw;
  }
  if(!ok||turns.length%2) continue; push(s,turns); games++;
}
// 2) the user's word does not start with the last letter
for(let k=0;k<50;k++){
  const prev=pick(chainable), wrong=pick(words.filter(x=>x[0]!==last(prev)&&x[0]!==prev[0]));
  const s=pick(SYS);
  push(s,['끝말잇기 하자','좋아요! 제가 먼저 할게요. "'+prev+'"\n'+ASKTAIL(last(prev)),wrong,'"'+prev+'"의 마지막 글자는 "'+last(prev)+'"'+iy(last(prev))+'. "'+wrong+'"은(는) "'+wrong[0]+'"(으)로 시작해서 이어지지 않아요. '+ASKTAIL(last(prev))]);
}
// 3) the user repeats a word that was already used
for(let k=0;k<40;k++){
  const a=pick(chainable), used=new Set([a]), b=pick(nexts(a,used)); used.add(b); const c=pick(nexts(b,used)||[]); if(!c) { k--; continue; } used.add(c);
  const d=pick(nexts(c,used)||[]); if(!d){ k--; continue; }
  const s=pick(SYS);
  // user said a, AI said b, user says c (valid), AI says d, then the user says something already used that starts right
  const rep=pick([a,b,c,d].filter(x=>x[0]===last(d)))||null;
  if(!rep){ // use d's neighbour: user repeats d itself
    push(s,[a,aiTurn(a,b),c,aiTurn(c,d),d,'이미 "'+d+'"은(는) 나온 말이에요. 같은 말은 다시 쓸 수 없어요. '+ASKTAIL(last(d))]);
  } else push(s,[a,aiTurn(a,b),c,aiTurn(c,d),rep,'"'+rep+'"은(는) 이미 나온 말이에요. 같은 말은 다시 쓸 수 없어요. '+ASKTAIL(last(d))]);
}
// 4) the AI cannot find a word: it says so and offers a new game
const dead=words.filter(w=>nexts(w,new Set()).length===0);
for(let k=0;k<30&&dead.length;k++){
  const prev=pick(chainable.filter(w=>(byFirst[last(w)]||[]).some(x=>x!==w&&(byFirst[last(x)]||[]).length<=1))); if(!prev){ break; }
  const mid=(byFirst[last(prev)]||[]).filter(x=>x!==prev); const uw=pick(mid.filter(x=>nexts(x,new Set([prev,x])).length===0).concat(dead.filter(x=>x[0]===last(prev))));
  if(!uw||nexts(uw,new Set([prev,uw])).length) continue;
  push(pick(SYS),[prev,aiTurn(prev,pick(nexts(prev,new Set([uw]))||[uw])) ,uw,'"'+uw+'"의 마지막 글자는 "'+last(uw)+'"인데, 이을 말이 더 생각나지 않아요. 제가 졌어요! 😄 한 판 더 할까요?']);
}
// 5) meaning of a word in the game
for(let k=0;k<30;k++){ const w=pick(words); push(pick(SYS),[pick([w+' 뜻이 뭐야',w+' 무슨 뜻이야?',w+' 뜻?','"'+w+'" 가 뭐야','끝말잇기 하는데 '+w+'이(가) 뭐야?']),'"'+w+'"'+(bat(last(w))?'은 ':'는 ')+W[w]+'.']); }
// 6) stop / rules / start again
const STOP=['그만할래','끝말잇기 그만','이제 그만하자','재밌었어 그만할래','다른 거 하자'];
for(let k=0;k<12;k++){ const a=pick(chainable), b=pick(nexts(a,new Set())); push(pick(SYS),[a,aiTurn(a,b),pick(STOP),pick(['좋아요, 재밌었어요! 또 하고 싶으면 "끝말잇기 하자"라고 말해 주세요.','네, 여기까지 해요. 같이 해서 즐거웠어요! 다음에 또 해요.','알겠어요! 다음에 또 끝말잇기 해요. 😄'])]); }
for(let k=0;k<10;k++){ push(pick(SYS),[pick(['끝말잇기 규칙 알려줘','끝말잇기 어떻게 하는 거야?','끝말잇기 하는 법','끝말잇기 규칙이 뭐야?']),'앞 사람이 말한 낱말의 마지막 글자로 시작하는 낱말을 말하는 놀이예요. 이미 나온 말은 다시 쓸 수 없고, 이을 말이 없으면 지는 거예요. 시작하려면 "끝말잇기 하자"라고 말해 주세요.']); }
for(let k=0;k<8;k++){ const a=pick(chainable), b=pick(nexts(a,new Set())), c=pick(nexts(b,new Set([a,b]))||[]); if(!c){ k--; continue; } push(pick(SYS),[a,aiTurn(a,b),pick(['다시 하자','처음부터 다시','새로 하자','다시 시작']),aiFirst(pick(chainable))]); }
// check: every AI chain word starts with the last letter of the word before it
const bad=rows.filter(r=>{ const t=r.messages.filter(m=>m.role!=='system'); for(let i=1;i<t.length;i+=2){ const m=t[i].content.match(/"([^"]+)"\n"/); const u=t[i-1].content.replace(/^\(No table selected\.\)\n\nQuestion: /,'').replace(/^(끝말잇기: |내 차례: )/,'').replace(/[!"]|\s이야$/g,'').trim();
  const aw=m&&m[1]; if(aw&&/[가-힣]+/.test(u)&&words.includes(u)){ if(aw[0]!==last(u)&&!/로 시작/.test(t[i].content)) return true; } } return false; });
const out=shuffle(rows);
fs.writeFileSync(path.join(OUT,'v18-word.jsonl'),out.map(r=>JSON.stringify(r)).join('\n')+'\n');
console.log('words',words.length,'rows',out.length,'games',games,'suspect',bad.length);
