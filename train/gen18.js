#!/usr/bin/env node
/* FF777 1.8: tool-usage answers (what each Tools program is for and how to use it) and everyday chat. Reads train/raw/use18-*.jsonl ({q,a}) and train/raw/chat18-*.jsonl
   ({messages}); every row gets one of the usual system prompts (none / spreadsheet ask / chat). Output: data/v18-new.jsonl ({task:'use18'|'chat18', messages}).
   node train/gen18.js */
'use strict';
const fs=require('fs'), path=require('path');
const DIR=__dirname, RAW=path.join(DIR,'raw'), OUT=path.join(DIR,'data');
const P=require(path.join(DIR,'..','ai-prompts.js'));
let seed=20261030; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const pick=a=>a[Math.floor(rnd()*a.length)];
const shuffle=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const base=ask=>'You are chatting with a curious person. '+ask+' Be warm and natural. Plain text only: no markdown tables, no code fences. Use the language the question is written in.';
const CHAT=[base('Answer in 1 to 3 short sentences.'),base('Answer in 3 to 5 sentences with one concrete example.')];
const jl=f=>fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const SYSV=()=>pick([null,P.askSys,CHAT[0],CHAT[0],CHAT[1]]);
const wrap=(s,m)=>{ const out=s?[{role:'system',content:s}]:[]; m.forEach((x,i)=>out.push({role:x.role,content:(i===0&&s===P.askSys&&x.role==='user')?'(No table selected.)\n\nQuestion: '+x.content:x.content})); return out; };
const files=p=>fs.readdirSync(RAW).filter(f=>p.test(f)).sort();
const rows=[]; const seen=new Set();
for(const f of files(/^use18-\d+\.jsonl$/)) for(const r of jl(path.join(RAW,f))){
  if(!r.q||!r.a||/17\s*개?\s*(언어|languages)/i.test(r.a)) continue;
  for(let n=0;n<2;n++){ const s=SYSV(); const m=wrap(s,[{role:'user',content:r.q},{role:'assistant',content:r.a}]); const k=JSON.stringify(m); if(seen.has(k)) continue; seen.add(k); rows.push({task:'use18',messages:m}); } }
for(const f of files(/^chat18-\d+\.jsonl$/)) for(const r of jl(path.join(RAW,f))){
  const m0=r.messages; if(!m0||m0.length<2||m0[0].role!=='user'||m0[m0.length-1].role!=='assistant'||m0.some(x=>!x.content)) continue;
  const s=pick([null,null,CHAT[0],CHAT[0],CHAT[1],P.askSys]); const m=wrap(s,m0); const k=JSON.stringify(m); if(seen.has(k)) continue; seen.add(k); rows.push({task:'chat18',messages:m}); }
const out=shuffle(rows);
fs.writeFileSync(path.join(OUT,'v18-new.jsonl'),out.map(r=>JSON.stringify(r)).join('\n')+'\n');
const c={}; out.forEach(r=>c[r.task]=(c[r.task]||0)+1); console.log(c);
