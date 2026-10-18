#!/usr/bin/env node
/* Builds the training sets from train/raw/*.jsonl (written per task, see ref/BRIEF-*.md):
   checks every raw file with check.js, drops repeats, then splits by the owner's ratio
   (coding 30, request understanding 20, translation 15, chart 15, formula 10, table 10):
     data/full.jsonl   2,600 examples  -> "똑똑함" (Qwen3 4B, all of it, 3 epochs)
     data/basic.jsonl  1,000 examples  -> "기본"  (Qwen3 1.7B, light, 1 epoch), a same-ratio part of full
     data/test.jsonl     160 examples  never trained on, used for before/after scores
   node train/build.js */
'use strict';
const fs=require('fs'), path=require('path'), cp=require('child_process');
const DIR=__dirname, RAW=path.join(DIR,'raw'), OUT=path.join(DIR,'data'), TMP=path.join(OUT,'.ok');
const PLAN={code:[780,300,48], und:[520,200,32], tr:[390,150,24], graph:[390,150,24], formula:[260,100,16], table:[260,100,16]};
fs.mkdirSync(TMP,{recursive:true});

let seed=20261016; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const shuffle=a=>{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };

const pool={}; Object.keys(PLAN).forEach(t=>pool[t]=[]);
const seen=new Set(), report=[];
let tooLong=0;
// rough Qwen token count: ASCII ~3.3 chars per token, other letters (Hangul, kana) ~1 each, plus chat-template overhead
const estTokens=m=>m.reduce((n,x)=>{ const t=x.content, a=(t.match(/[\x00-\x7f]/g)||[]).length; return n+a/3.3+(t.length-a)+6; },0);
fs.readdirSync(RAW).filter(f=>f.endsWith('.jsonl')).sort().forEach(f=>{
  const task=f.replace(/-\d+\.jsonl$/,''); if(!PLAN[task]){ report.push(f+': skipped (unknown task)'); return; }
  const ok=path.join(TMP,f), r=cp.spawnSync('node',[path.join(DIR,'check.js'),task,path.join(RAW,f),'--out',ok],{encoding:'utf8',maxBuffer:64<<20});
  const summary=(r.stdout||'').trim().split('\n').pop(); report.push(summary);
  if(!fs.existsSync(ok)) return;
  fs.readFileSync(ok,'utf8').split('\n').filter(Boolean).forEach(l=>{ const x=JSON.parse(l), key=task+'|'+x.messages[1].content.replace(/\s+/g,' ').trim();
    if(seen.has(key)) return; seen.add(key);
    if(estTokens(x.messages)>3900){ tooLong++; return; } // the notebook trains with 4,096-token examples
    pool[task].push(x); });
});

const full=[], basic=[], test=[], stats={};
for(const t in PLAN){
  const [nFull,nBasic,nTest]=PLAN[t], items=shuffle(pool[t].slice());
  const te=items.slice(0,nTest), tr=items.slice(nTest,nTest+nFull);
  test.push(...te); full.push(...tr); basic.push(...tr.slice(0,nBasic));
  stats[t]={available:items.length, test:te.length, full:tr.length, basic:Math.min(nBasic,tr.length), short:Math.max(0,nFull+nTest-items.length)};
}
const write=(n,a)=>fs.writeFileSync(path.join(OUT,n),shuffle(a).map(x=>JSON.stringify(x)).join('\n')+'\n');
write('full.jsonl',full); write('basic.jsonl',basic); write('test.jsonl',test);
fs.writeFileSync(path.join(OUT,'stats.json'),JSON.stringify({built:new Date().toISOString(),counts:{full:full.length,basic:basic.length,test:test.length},tasks:stats},null,1)+'\n');
fs.rmSync(TMP,{recursive:true,force:true});
console.log(report.join('\n')); console.log(JSON.stringify(stats,null,1)); console.log(`full ${full.length}, basic ${basic.length}, test ${test.length}, dropped as too long ${tooLong}`);
