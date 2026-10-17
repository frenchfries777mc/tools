#!/usr/bin/env node
/* Third training round, for tarius (Qwen3 1.7B) only: coding first. Builds data/round3-basic.jsonl, meant for CONTINUE training
   (Colab notebook, ROUND=3) on top of the model already on Hugging Face.
   Also writes data/round3-smart.jsonl: the same new coding items plus lectus' name (no replay), for the first full training of lectus (Qwen3 4B), which now reads full + round2-smart + round3-smart.
   New: Block HTML coding with the newer blocks (move, follow the cursor, touching, save/load, log), careful EDITs that change only what was asked,
   request understanding, and the model's own name FF777 1.2 tarius. A sample of round 2 is mixed in so nothing is forgotten (its name is rewritten to 1.1).
   node train/build3.js */
'use strict';
const fs=require('fs'), path=require('path'), cp=require('child_process');
const DIR=__dirname, RAW=path.join(DIR,'raw'), OUT=path.join(DIR,'data'), TMP=path.join(OUT,'.ok3');
fs.mkdirSync(TMP,{recursive:true});
const FILES={ formula:['formula-3'], code:['code-12','code-13','code-14','code-15','code-16','code-17','code-18'], und:['und-10'], ask:['ask-3'], slides:['slides-3'], self:['self-1','self-2','self-3'] };
const REPLAY=420; // rows of round2-basic.jsonl (no self rows)
const NAME_OLD='FF777 1.0 tarius', NAME_NEW='FF777 1.2 tarius';
const WHO='You are FF777 1.2 tarius, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 1.7B. Your name is the end of the Latin word elementarius ("basic").';
const FILL={NAME:NAME_NEW, BASE:'Qwen3 1.7B', LATIN:'elementarius', MEANING_KO:'기본', MEANING_EN:'basic'};
const WHO_L='You are FF777 1.0 lectus, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 4B. Your name is the end of the Latin word intellectus ("understanding").';
const FILL_L={NAME:'FF777 1.0 lectus', BASE:'Qwen3 4B', LATIN:'intellectus', MEANING_KO:'이해력', MEANING_EN:'understanding'};

let seed=20261017; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const shuffle=a=>{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const estTokens=m=>m.reduce((n,x)=>{ const t=x.content, a=(t.match(/[\x00-\x7f]/g)||[]).length; return n+a/3.3+(t.length-a)+6; },0);
const jl=f=>fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));

const pool={}, report=[]; let tooLong=0, repeats=0; const seen=new Set();
for(const task in FILES){
  pool[task]=[];
  for(const f of FILES[task]){
    const raw=path.join(RAW,f+'.jsonl'); if(!fs.existsSync(raw)){ report.push(f+': missing'); continue; }
    const ok=path.join(TMP,f+'.jsonl'), r=cp.spawnSync('node',[path.join(DIR,'check.js'),task,raw,'--out',ok],{encoding:'utf8',maxBuffer:64<<20});
    report.push((r.stdout||'').trim().split('\n').pop());
    if(!fs.existsSync(ok)) continue;
    for(const x of jl(ok)){
      const key=task+'|'+x.messages[0].content.length+'|'+x.messages[1].content.replace(/\s+/g,' ').trim();
      if(seen.has(key)){ repeats++; continue; } seen.add(key);
      if(estTokens(x.messages)>3900){ tooLong++; continue; }
      pool[task].push(x);
    }
  }
}
function base(who,fill){ const rows=[], counts={}; const add=(task,m)=>{ rows.push({task,messages:m}); counts[task]=(counts[task]||0)+1; };
  for(const task of ['code','und','ask','slides','formula']) for(const x of pool[task]){ const m=x.messages.map(y=>({role:y.role,content:y.content})); if(task==='ask') m[0].content+='\n\n'+who; add(task,m); }
  pool.self.forEach((x,i)=>{
    const m=x.messages.map(y=>({role:y.role,content:y.content.replace(/\{(\w+)\}/g,(s,k)=>fill[k]!=null?fill[k]:s)}));
    if(/\{\w+\}/.test(m[2].content)) throw new Error('unfilled placeholder in self item '+i);
    const bare=m.map(y=>({role:y.role,content:y.content}));
    m[0].content+='\n\n'+who; add('self',m); add('self',bare);
  });
  return {rows,counts,add}; }
const T=base(WHO,FILL), rows=T.rows, counts=T.counts, add=T.add;
const r2=jl(path.join(OUT,'round2-basic.jsonl')).filter(x=>x.task!=='self');
shuffle(r2.slice()).slice(0,REPLAY).forEach(x=>add('r2-'+x.task,x.messages.map(y=>({role:y.role,content:y.content.split(NAME_OLD).join(NAME_NEW)}))));
const out=shuffle(rows);
fs.writeFileSync(path.join(OUT,'round3-basic.jsonl'),out.map(x=>JSON.stringify(x)).join('\n')+'\n');
fs.writeFileSync(path.join(OUT,'round3-stats.json'),JSON.stringify({built:new Date().toISOString(),pool:Object.fromEntries(Object.keys(pool).map(t=>[t,pool[t].length])),tooLong,repeats,total:out.length,counts},null,1)+'\n');
fs.rmSync(TMP,{recursive:true,force:true});
const L=base(WHO_L,FILL_L), outL=shuffle(L.rows);
fs.writeFileSync(path.join(OUT,'round3-smart.jsonl'),outL.map(x=>JSON.stringify(x)).join('\n')+'\n');
console.log('round3-smart rows:',outL.length);
console.log(report.join('\n')); console.log(JSON.stringify({total:out.length,counts},null,1));
