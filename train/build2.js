#!/usr/bin/env node
/* Second training round: builds data/round2-basic.jsonl (for tarius, Qwen3 1.7B) and data/round2-smart.jsonl (for lectus, Qwen3 4B).
   These are meant for CONTINUE training in the Colab notebook (one gentle epoch on top of the first round).
   New in this round (all checked with check.js): ask (Fry Sheet 질문·요약), slides (Fry Slides, built-in AI path),
   self (the model's own name), more graph / und / code. Plus a small sample of the first-round data so nothing is forgotten.
   The ask and self examples get the same identity suffix ai.js adds to the system prompt (FFAI.ask facts:true),
   half of the self examples go without it so the model also knows its name by itself.
   node train/build2.js */
'use strict';
const fs=require('fs'), path=require('path'), cp=require('child_process');
const DIR=__dirname, RAW=path.join(DIR,'raw'), OUT=path.join(DIR,'data'), TMP=path.join(OUT,'.ok2');
fs.mkdirSync(TMP,{recursive:true});
const FILES={ ask:['ask-1','ask-2'], self:['self-1'], slides:['slides-1','slides-2'], graph:['graph-3','graph-4'], code:['code-9','code-10','code-11'], und:['und-6','und-7','und-8','und-9'] };
const REPLAY={code:120, und:80, tr:60, graph:60, formula:40, table:40}; // from the first round (data/full.jsonl), no test items
const MODELS={
  basic:{name:'FF777 1.0 tarius', who:'You are FF777 1.0 tarius, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 1.7B. Your name is the end of the Latin word elementarius ("basic").',
         fill:{NAME:'FF777 1.0 tarius', BASE:'Qwen3 1.7B', LATIN:'elementarius', MEANING_KO:'기본', MEANING_EN:'basic'}},
  smart:{name:'FF777 1.2 lectus', who:'You are FF777 1.2 lectus, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 4B. Your name is the end of the Latin word intellectus ("understanding").',
         fill:{NAME:'FF777 1.2 lectus', BASE:'Qwen3 4B', LATIN:'intellectus', MEANING_KO:'이해력', MEANING_EN:'understanding'}}
};

let seed=20261016; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const shuffle=a=>{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const estTokens=m=>m.reduce((n,x)=>{ const t=x.content, a=(t.match(/[\x00-\x7f]/g)||[]).length; return n+a/3.3+(t.length-a)+6; },0);
const jl=f=>fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));

const pool={}, report=[]; let tooLong=0, repeats=0;
const seen=new Set();
for(const task in FILES){
  pool[task]=[];
  for(const f of FILES[task]){
    const ok=path.join(TMP,f+'.jsonl'), r=cp.spawnSync('node',[path.join(DIR,'check.js'),task,path.join(RAW,f+'.jsonl'),'--out',ok],{encoding:'utf8',maxBuffer:64<<20});
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

// examples of the first round, to keep what the model already knows
const first=jl(path.join(OUT,'full.jsonl')), testKeys=new Set(jl(path.join(OUT,'test.jsonl')).map(x=>x.messages[1].content));
const firstBy={}; first.forEach(x=>{ if(!testKeys.has(x.messages[1].content)) (firstBy[x.task]=firstBy[x.task]||[]).push(x); });

function build(kind){
  const M=MODELS[kind], rows=[], counts={};
  const add=(task,x)=>{ rows.push({task,messages:x}); counts[task]=(counts[task]||0)+1; };
  for(const task of ['ask','slides','graph','code','und']){
    for(const x of pool[task]){
      let m=x.messages.map(y=>({role:y.role,content:y.content}));
      if(task==='ask') m[0].content+='\n\n'+M.who; // what ai.js adds for facts:true (without developer facts)
      add(task,m);
    }
  }
  pool.self.forEach((x,i)=>{
    const m=x.messages.map(y=>({role:y.role,content:y.content.replace(/\{(\w+)\}/g,(s,k)=>M.fill[k]!=null?M.fill[k]:s)}));
    if(/\{\w+\}/.test(m[2].content)) throw new Error('unfilled placeholder in self item '+i);
    const bare=m.map(y=>({role:y.role,content:y.content}));
    m[0].content+='\n\n'+M.who;            // with the identity line, like the site sends it
    add('self',m); add('self',bare);        // and once without, so the name is known by itself
  });
  for(const t in REPLAY) shuffle((firstBy[t]||[]).slice()).slice(0,REPLAY[t]).forEach(x=>add('first-'+t,x.messages));
  return {rows:shuffle(rows),counts};
}

const stats={built:new Date().toISOString(),pool:Object.fromEntries(Object.keys(pool).map(t=>[t,pool[t].length])),tooLong,repeats};
for(const kind of ['basic','smart']){
  const {rows,counts}=build(kind);
  fs.writeFileSync(path.join(OUT,`round2-${kind}.jsonl`),rows.map(x=>JSON.stringify(x)).join('\n')+'\n');
  stats[kind]={total:rows.length,counts};
}
fs.writeFileSync(path.join(OUT,'round2-stats.json'),JSON.stringify(stats,null,1)+'\n');
fs.rmSync(TMP,{recursive:true,force:true});
console.log(report.join('\n')); console.log(JSON.stringify(stats,null,1));
