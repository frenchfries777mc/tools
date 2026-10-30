#!/usr/bin/env node
/* FF777 1.9 training set (tarius/lectus/premus), 6,000 rows by site tool: blocks 12, sheet 12, slides 9, docs 9, python 4, lab 3, any-joke 14, tool usage 8, chat 20 (talk 800), word chain 9. See /mnt/project-files/tools/ff777-1.7-plan.md.
   Replay = rows of earlier sets (all run-checked); new rows come from node train/gen17.js (docs, python, lab), node train/genjoke17.js, genjoke16.js, genword16.js.
   node train/build10.js [basic]   ->   data/v19-<basic|smart>.jsonl, data/v19-<variant>-test.jsonl, data/v19-<variant>-stats.json */
'use strict';
const fs=require('fs'), path=require('path'), cp=require('child_process');
const DIR=__dirname, ROOT=path.join(DIR,'..'), RAW=path.join(DIR,'raw'), OUT=path.join(DIR,'data');
const P=require(path.join(ROOT,'ai-prompts.js'));
const N=6000, VER='1.9';
const VARIANT=process.env.VARIANT==='basic'?'basic':'smart';   // basic = tarius (Qwen3 1.7B): same data, own name; node train/build6.js basic -> data/v15-basic.jsonl
const BASIC=VARIANT==='basic';
const GROUPS={ // pct of N; replay tasks are earlier task names; new tasks are listed in NEW
  blocks:{pct:11, tasks:['code','gen','memo-ex','memo-chip','gen14','newcode']},
  formula:{pct:3.6, tasks:['newformula','formula']},                  // sheet 12 = formula 3.6 + calc 2 + cell 1.2 + table 2 + graph 1.8 + tr 1.4
  calc:{pct:2, tasks:['newcalc','calc']},
  cell:{pct:1.2, tasks:['cell']},
  table:{pct:2, tasks:['newtable','table']},
  graph:{pct:1.8, tasks:['graph']},
  tr:{pct:1.4, tasks:['tr']},
  slides:{pct:8, tasks:['newslides','slides']},
  docs:{pct:8, tasks:['docs17']},
  python:{pct:4, tasks:['py17']},
  labask:{pct:0.7, tasks:['labask17']}, labdraft:{pct:0.5, tasks:['labdraft17']}, labset:{pct:0.8, tasks:['labset17']}, labfind:{pct:1, tasks:['labfind17']},   // lab 3
  anyjoke:{pct:24, tasks:['joke19']},                                 // 845 rows: every joke 5x
  joke:{pct:2.25, tasks:['joke16']},                                  // specific jokes (replay)
  use:{pct:7, tasks:['use18']},                                       // what each Tools program is for and how to use it
  talk:{pct:10, tasks:['chat18']},                                  // everyday talk, 800 rows
  word:{pct:6, tasks:['word18']},                                     // word chain, whole games
  oldword:{pct:1, tasks:['word16']},
  self:{pct:2.5, tasks:['newself','self','self7']},
  und:{pct:1.25, tasks:['und']},
  unknown:{pct:1.3, tasks:['newunknown','ask4u']},
  chat:{pct:2, tasks:['ask','fun','ask4','spell','explain']}
};
const NEW=new Set(['newcode','newformula','newcalc','newtable','newunknown','newself','joke16','joke19','use18','chat18','word18','newslides','word16','docs17','py17','labask17','labdraft17','labset17','labfind17']);
const HUMOR='You are cheerful and a little funny: when you chat you add a short, kind joke, but answers about tables, formulas and code stay exact and serious.';
const WHO={who:'You are FF777 '+VER+' lectus, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 4B. Your name is the end of the Latin word intellectus ("understanding"). '+HUMOR, fill:{NAME:'FF777 '+VER+' lectus', BASE:'Qwen3 4B', LATIN:'intellectus', MEANING_KO:'이해력', MEANING_EN:'understanding'}};
if(BASIC){ WHO.who='You are FF777 '+VER+' tarius, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 1.7B. Your name is the end of the Latin word elementarius ("basic"). '+HUMOR;
  WHO.fill={NAME:'FF777 '+VER+' tarius', BASE:'Qwen3 1.7B', LATIN:'elementarius', MEANING_KO:'기본', MEANING_EN:'basic'}; }
let seed=20261031; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
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
  const tmp=path.join(OUT,'.v19-'+file+'.jsonl');
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
for(const r of jl(path.join(OUT,'v17-smart.jsonl')).concat(jl(path.join(OUT,'v18-smart.jsonl')))){ if(/^(self|self7|newself|joke18)$/.test(r.task)) continue; put(r.task==='joke17'?'joke16x':r.task,r.messages); }   // 1.7 rows: put() drops repeats
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
for(const r of jl(path.join(OUT,'v16-word.jsonl'))) put('word16',r.messages);
for(const r of jl(path.join(OUT,'v19-anyjoke.jsonl'))) put('joke19',r.messages);
for(const r of jl(path.join(OUT,'v18-new.jsonl'))) put(r.task,r.messages);
for(const r of jl(path.join(OUT,'v16-joke.jsonl'))) put('joke16',r.messages);   // genjoke16.js: 1,440 rows, every joke under 3 prompts; 1.7 takes 135 of them
const heldOut=[]; { const W=jl(path.join(OUT,'v18-word.jsonl')); for(const r of W.slice(-12)) heldOut.push(r); for(const r of W.slice(0,-12)) put('word18',r.messages); }
{ const byT={}; for(const r of jl(path.join(OUT,'v17-new.jsonl'))) (byT[r.task]=byT[r.task]||[]).push(r);   // gen17.js: docs, python, lab; the last 12 of each task are kept for the test file
  for(const [t,rs] of Object.entries(byT)){ const hold=rs.slice(-12); heldOut.push(...hold); for(const r of rs.slice(0,-12)) put(t,r.messages); } }
for(const f of fs.readdirSync(RAW).filter(f=>/^slides-\d+\.jsonl$/.test(f))) for(const x of checked('slides',f.replace('.jsonl',''))) put('newslides',x.messages);
/* build */
const rows=[], take={}, short={};
for(const [g,G] of Object.entries(GROUPS)){
  const want=Math.round(N*G.pct/100); let got=[];
  for(const t of G.tasks) if(NEW.has(t)) got.push(...(pool[t]||[]));
  if(got.length>want){ got=shuffle(got);
    if(g==='joke'){ const seenJ=new Set(), first=[], rest=[]; for(const r of got){ const m=/정답은 ([^!\n]+)!/.exec(r.messages[r.messages.length-1].content); const k=m?m[1]:r.messages[1].content; if(!seenJ.has(k)){ seenJ.add(k); first.push(r); } else rest.push(r); }   // every joke at least once
      got=first.concat(rest); }
    got=got.slice(0,want); }
  const old=shuffle(G.tasks.filter(t=>!NEW.has(t)).flatMap(t=>pool[t]||[]));
  got.push(...old.slice(0,Math.max(0,want-got.length)));
  if(got.length<want) short[g]=want-got.length;
  take[g]={want,rows:got.length,new:got.filter(r=>NEW.has(r.task)).length};
  rows.push(...got.map(r=>({task:r.task,messages:rename(r.messages)})).filter(r=>r.messages));
}
/* a group that ran short (the pool had too few rows) is topped up from older, already used kinds: blocks, graph, translation, understanding, tables */
const fill={}; { const usedK=new Set(rows.map(r=>key(r.messages))); const left=shuffle(['code','gen','gen14','memo-ex','memo-chip','graph','tr','und','table','cell','formula'].flatMap(t=>pool[t]||[]).filter(r=>!usedK.has(key(r.messages))));
  for(const r of left){ if(rows.length>=N) break; const m=rename(r.messages); if(!m) continue; rows.push({task:r.task,messages:m}); fill[r.task]=(fill[r.task]||0)+1; } }
const final=shuffle(rows);
fs.writeFileSync(path.join(OUT,'v19-'+VARIANT+'.jsonl'),final.map(x=>JSON.stringify(x)).join('\n')+'\n');
fs.writeFileSync(path.join(OUT,BASIC?'v19-basic-test.jsonl':'v19-test.jsonl'),test.concat(heldOut).map(x=>({task:x.task,messages:rename(x.messages)})).filter(x=>x.messages).map(x=>JSON.stringify(x)).join('\n')+'\n');
const stats={built:new Date().toISOString(),total:final.length,filled:fill,newRows:final.filter(r=>NEW.has(r.task)).length,take,short,blocked:blockedN,
  repeatedRows:final.length-new Set(final.map(r=>key(r.messages))).size,pool:Object.fromEntries(Object.entries(pool).map(([k,v])=>[k,v.length]))};
fs.writeFileSync(path.join(OUT,BASIC?'v19-basic-stats.json':'v19-stats.json'),JSON.stringify(stats,null,1)+'\n');
console.log(JSON.stringify(stats));
