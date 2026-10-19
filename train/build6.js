#!/usr/bin/env node
/* FF777 1.5 training set for Premus (continue training on Premus 1.4), 6,000 rows. Owner ratio 2026-10-19 (see /mnt/project-files/tools/ff777-1.5-plan.md):
   code 23, formula+cell 18, und 12, calc 10, tr 9, table 8, unknown-word refusals 7, graph 5, self 4, chat/list/word 4 (percent of rows).
   Replay = the rows of data/v14-smart.jsonl (all already run-checked), picked by task; new rows = raw/calc-2, formula-5, table-4, ask-5 (node train/gen15.js)
   + raw/code-19, code-20 (state-machine games and small tools, run-checked by check.js).
   Output: data/v15-smart.jsonl (names say lectus; the Kaggle notebook swaps them to premus), data/v15-test.jsonl (= v14-test, never trained on), data/v15-stats.json.
   node train/build6.js */
'use strict';
const fs=require('fs'), path=require('path'), cp=require('child_process');
const DIR=__dirname, ROOT=path.join(DIR,'..'), RAW=path.join(DIR,'raw'), OUT=path.join(DIR,'data');
const P=require(path.join(ROOT,'ai-prompts.js'));
const N=6000, VER='1.5';
const VARIANT=process.env.VARIANT==='basic'?'basic':'smart';   // basic = tarius (Qwen3 1.7B): same data, own name; node train/build6.js basic -> data/v15-basic.jsonl
const BASIC=VARIANT==='basic';
const GROUPS={ // pct of N; replay tasks are the v14 task names; new tasks are listed in NEW
  code:{pct:20, tasks:['code','gen','memo-ex','memo-chip','gen14','newcode']},
  formula:{pct:17, tasks:['formula','newformula','cell']},
  und:{pct:10, tasks:['und','slides']},
  calc:{pct:10, tasks:['calc','newcalc']},
  tr:{pct:9, tasks:['tr']},
  table:{pct:8, tasks:['table','newtable']},
  unknown:{pct:7, tasks:['newunknown','ask4u']},
  graph:{pct:5, tasks:['graph']},
  self:{pct:4, tasks:['self','self7','newself']},
  chat:{pct:4, tasks:['ask','fun','ask4','spell','explain','joke']},
  joke:{pct:6, tasks:['newjoke']}   // the owner's dad jokes, each riddle with its own answer (raw/joke-2.jsonl, genjoke.js)
};
const NEW=new Set(['newcode','newformula','newcalc','newtable','newunknown','newself','newjoke']);
const HUMOR='You are cheerful and a little funny: when you chat you add a short, kind joke, but answers about tables, formulas and code stay exact and serious.';
const WHO={who:'You are FF777 '+VER+' lectus, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 4B. Your name is the end of the Latin word intellectus ("understanding"). '+HUMOR, fill:{NAME:'FF777 '+VER+' lectus', BASE:'Qwen3 4B', LATIN:'intellectus', MEANING_KO:'이해력', MEANING_EN:'understanding'}};
if(BASIC){ WHO.who='You are FF777 '+VER+' tarius, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 1.7B. Your name is the end of the Latin word elementarius ("basic"). '+HUMOR;
  WHO.fill={NAME:'FF777 '+VER+' tarius', BASE:'Qwen3 1.7B', LATIN:'elementarius', MEANING_KO:'기본', MEANING_EN:'basic'}; }
let seed=20261019; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const shuffle=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const jl=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)):[];
const norm=s=>String(s).replace(/\s+/g,' ').trim();
const key=m=>JSON.stringify(m.slice(1).map(x=>norm(x.content)));
const test=jl(path.join(OUT,'v14-test.jsonl'));
const testUsers=new Set(test.map(x=>norm(x.messages[1].content)));
const blocked=u=>testUsers.has(norm(u));
const WHO_RE=/You are FF777 [\d.]+ (lectus|tarius), the built-in AI[^\n]*/g;
const OWN=BASIC?'tarius':'lectus', OTHER=BASIC?/\blectus\b|intellectus|Qwen3 4B/:/\btarius\b/;
const rename=m=>{ const out=m.map(y=>({role:y.role,content:y.content.replace(WHO_RE,WHO.who).replace(new RegExp('FF777 [\\d.]+ '+OWN,'g'),'FF777 '+VER+' '+OWN)}));
  return out.some(y=>OTHER.test(y.content))?null:out; };
const pool={}, seen=new Set(); let blockedN=0;
const put=(task,messages)=>{ const k=task.replace(/^memo-.*/,'memo')+'|'+key(messages); if(seen.has(k)) return; if(blocked(messages[1].content)){ blockedN++; return; } seen.add(k); (pool[task]=pool[task]||[]).push({task,messages}); };
function checked(kind,file){
  const src=path.join(RAW,file+'.jsonl'); if(!fs.existsSync(src)){ console.log('missing',file); return []; }
  const tmp=path.join(OUT,'.v15-'+file+'.jsonl');
  const r=cp.spawnSync('node',[path.join(DIR,'check.js'),kind,src,'--out',tmp],{encoding:'utf8',maxBuffer:64<<20});
  console.log(file+':',(r.stdout||'').trim().split('\n').pop());
  const rows=jl(tmp); fs.rmSync(tmp,{force:true}); return rows;
}
/* replay */
for(const r of jl(path.join(OUT,'v14-smart.jsonl'))){
  let t=r.task; if(t==='ask4'&&/(모르|처음 봐|알지 못)/.test(r.messages[2].content)) t='ask4u';
  if(t==='self'||t==='self7') continue;       // rebuilt below from all self files
  put(t,r.messages);
}
/* older raw rows the 1.4 build did not take (check.js passes only the right ones; put() drops repeats) */
for(const [kind,pat,task] of [['tr',/^tr-\d+\.jsonl$/,'tr'],['table',/^table-[123]\.jsonl$/,'table'],['formula',/^formula-[1-4]\.jsonl$/,'formula']])
  for(const f of fs.readdirSync(RAW).filter(f=>pat.test(f))) for(const x of checked(kind,f.replace('.jsonl',''))) put(task,x.messages);
/* new rows */
for(const x of checked('ask','ask-5')) put('newunknown',x.messages);
for(const x of checked('formula','formula-5')) put('newformula',x.messages);
for(const x of checked('table','table-4')) put('newtable',x.messages);
for(const f of ['code-19','code-20','code-21']) for(const x of checked('code',f)) put('newcode',x.messages);
for(const it of jl(path.join(RAW,'calc-2.jsonl'))) put('newcalc',[{role:'system',content:P.calcSys},{role:'user',content:P.calcPrompt(it.cols,it.q)},{role:'assistant',content:JSON.stringify({formula:it.formula})}]);
{ const selfAll=[]; for(const f of fs.readdirSync(RAW).filter(f=>/^self-\d+\.jsonl$/.test(f))) for(const x of checked('self',f.replace('.jsonl',''))){
    const m=x.messages.map(y=>({role:y.role,content:y.content.replace(/\{(\w+)\}/g,(s,k)=>WHO.fill[k]!=null?WHO.fill[k]:s)}));
    if(m.some(y=>/\{\w+\}/.test(y.content))) throw new Error('unfilled placeholder in '+f);
    selfAll.push(m.map((y,i)=>i===0&&rnd()<0.5?{role:y.role,content:y.content+'\n\n'+WHO.who}:y)); }
  for(const m of selfAll) put('newself',m); }
for(const x of checked('self','joke-2')) put('newjoke',x.messages);
{ const cnt={}; const first=pool.newjoke||[]; // every riddle gets one row before any riddle gets a second one
  pool.newjoke=shuffle(first).map(r=>{ const um=r.messages[1].content, k=(/([^\n]*\?)/.exec(um.replace(/^[\s\S]*Question: /,''))||/([^\n!.]*\?)/.exec(r.messages[2].content)||[um])[1], n=cnt[k]=(cnt[k]||0)+1; return {r,n}; }).sort((a,b)=>a.n-b.n).map(x=>x.r); }
/* build */
const rows=[], take={}, short={};
for(const [g,G] of Object.entries(GROUPS)){
  const want=Math.round(N*G.pct/100); let got=[];
  for(const t of G.tasks) if(NEW.has(t)) got.push(...(pool[t]||[]));
  if(got.length>want) got=(G.tasks[0]==='newjoke'?got:shuffle(got)).slice(0,want);
  const old=shuffle(G.tasks.filter(t=>!NEW.has(t)).flatMap(t=>pool[t]||[]));
  got.push(...old.slice(0,Math.max(0,want-got.length)));
  if(got.length<want) short[g]=want-got.length;
  take[g]={want,rows:got.length,new:got.filter(r=>NEW.has(r.task)).length};
  rows.push(...got.map(r=>({task:r.task,messages:rename(r.messages)})).filter(r=>r.messages));
}
const final=shuffle(rows);
fs.writeFileSync(path.join(OUT,'v15-'+VARIANT+'.jsonl'),final.map(x=>JSON.stringify(x)).join('\n')+'\n');
fs.writeFileSync(path.join(OUT,BASIC?'v15-basic-test.jsonl':'v15-test.jsonl'),test.map(x=>({task:x.task,messages:rename(x.messages)})).filter(x=>x.messages).map(x=>JSON.stringify(x)).join('\n')+'\n');
const stats={built:new Date().toISOString(),total:final.length,newRows:final.filter(r=>NEW.has(r.task)).length,take,short,blocked:blockedN,
  repeatedRows:final.length-new Set(final.map(r=>key(r.messages))).size,pool:Object.fromEntries(Object.entries(pool).map(([k,v])=>[k,v.length]))};
fs.writeFileSync(path.join(OUT,BASIC?'v15-basic-stats.json':'v15-stats.json'),JSON.stringify(stats,null,1)+'\n');
console.log(JSON.stringify(stats));
