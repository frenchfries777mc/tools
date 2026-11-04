#!/usr/bin/env node
/* FF777 two-stage training set (owner 11-03): stage a = code 25 / chat 25 / writing 25 / formula+translation 25, stage b = dad jokes 70 + 30 replay of stage a. Built from build11.js.
   STAGE=a|b VARIANT=basic|smart|premus node train/build12.js  ->  data/v21<stage>-<variant>.jsonl (+ -test, -stats). Old header: FF777 2.0 training set (tarius/lectus/premus), 6,000 rows: dad jokes cut from 60% to 25% (owner 11-02), the rest goes back to code, sheet (formula, table, graph, translation), docs, slides and everyday talk. See /mnt/project-files/tools/ff777-1.7-plan.md.
   Replay = rows of earlier sets (all run-checked); new rows come from node train/gen17.js (docs, python, lab), node train/genjoke17.js, genjoke16.js, genword16.js.
   node train/build11.js [basic]   ->   data/v20-<basic|smart>.jsonl, data/v19-<variant>-test.jsonl, data/v19-<variant>-stats.json */
'use strict';
const fs=require('fs'), path=require('path'), cp=require('child_process');
const DIR=__dirname, ROOT=path.join(DIR,'..'), RAW=path.join(DIR,'raw'), OUT=path.join(DIR,'data');
const P=require(path.join(ROOT,'ai-prompts.js'));
const N=+process.env.N||6000, VER=process.env.VER||'2.0b';
const STAGE=['b','j'].includes(process.env.STAGE)?process.env.STAGE:'a';
const VARIANT=['basic','premus'].includes(process.env.VARIANT)?process.env.VARIANT:'smart';   // basic = tarius (Qwen3 1.7B): same data, own name; node train/build6.js basic -> data/v15-basic.jsonl
const BASIC=VARIANT==='basic', PREMUS=VARIANT==='premus';
const G4={ // stage a: four equal blocks of 25
  blocks:{pct:18, tasks:['code','gen','memo-ex','memo-chip','gen14','newcode']}, python:{pct:5, tasks:['py17']},
  labask:{pct:0.5, tasks:['labask17']}, labdraft:{pct:0.5, tasks:['labdraft17']}, labset:{pct:0.5, tasks:['labset17']}, labfind:{pct:0.5, tasks:['labfind17']},                       // code 25
  talk:{pct:12, tasks:['chat18']}, use:{pct:4, tasks:['use18']}, self:{pct:2.5, tasks:['newself','self','self7']}, unknown:{pct:1.5, tasks:['newunknown','ask4u']},
  chat:{pct:3, tasks:['ask','fun','ask4']}, und:{pct:1.5, tasks:['und']}, word:{pct:0.5, tasks:['word18','word16']},                                                              // chat 25
  docs:{pct:14, tasks:['docs17']}, slides:{pct:8, tasks:['newslides','slides']}, write:{pct:3, tasks:['spell','explain']},                                                          // writing 25
  formula:{pct:7, tasks:['newformula','formula']}, calc:{pct:3, tasks:['newcalc','calc']}, cell:{pct:1.5, tasks:['cell']}, table:{pct:5, tasks:['newtable','table']},
  graph:{pct:3.5, tasks:['graph']}, tr:{pct:5, tasks:['tr']}                                                                                                                        // formula + translation 25
};
const GROUPS=STAGE==='j'?{ // stage j: dad jokes only (owner 11-03: 100%, 6,000 rows)
  anyjoke:{pct:50, tasks:['joke19'], big:1}, joke:{pct:33, tasks:['joke19q','joke16','joke16x'], big:1}, jokereview:{pct:17, tasks:['joke18'], big:1} }:STAGE==='a'?G4:Object.assign({ // stage b: 70 jokes (35 any / 23 specific / 12 review) + the same four blocks at 30%
  anyjoke:{pct:35, tasks:['joke19'], big:1}, joke:{pct:23, tasks:['joke19q','joke16','joke16x'], big:1}, jokereview:{pct:12, tasks:['joke18'], big:1} },
  Object.fromEntries(Object.entries(G4).map(([k,v])=>[k,Object.assign({},v,{pct:v.pct*0.3})])));
{ const S=Object.values(GROUPS).reduce((a,G)=>a+G.pct,0); if(Math.abs(S-100)>1e-6) throw new Error('groups sum to '+S); }
const NEW=new Set(['newcode','newformula','newcalc','newtable','newunknown','newself','joke16','joke19','joke19q','use18','chat18','word18','newslides','word16','docs17','py17','labask17','labdraft17','labset17','labfind17']);
const HUMOR='You are cheerful and a little funny: when you chat you add a short, kind joke, but answers about tables, formulas and code stay exact and serious.';
const WHO={who:'You are FF777 '+VER+' lectus, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 4B. Your name is the end of the Latin word intellectus ("understanding"). '+HUMOR, fill:{NAME:'FF777 '+VER+' lectus', BASE:'Qwen3 4B', LATIN:'intellectus', MEANING_KO:'이해력', MEANING_EN:'understanding'}};
if(PREMUS){ WHO.who='You are FF777 '+VER+' premus, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 8B. Your name is the end of the Latin word supremus ("supreme"). '+HUMOR;
  WHO.fill={NAME:'FF777 '+VER+' premus', BASE:'Qwen3 8B', LATIN:'supremus', MEANING_KO:'최고', MEANING_EN:'supreme'}; }
if(BASIC){ WHO.who='You are FF777 '+VER+' tarius, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 1.7B. Your name is the end of the Latin word elementarius ("basic"). '+HUMOR;
  WHO.fill={NAME:'FF777 '+VER+' tarius', BASE:'Qwen3 1.7B', LATIN:'elementarius', MEANING_KO:'기본', MEANING_EN:'basic'}; }
let seed=20261102; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const shuffle=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const jl=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)):[];
const norm=s=>String(s).replace(/\s+/g,' ').trim();
const key=m=>JSON.stringify(m.slice(1).map(x=>norm(x.content)));
const test=jl(path.join(OUT,'v14-test.jsonl'));
const testUsers=new Set(test.map(x=>norm(x.messages[1].content)));
const blocked=u=>testUsers.has(norm(u));
const WHO_RE=/You are FF777 [\d.]+[a-z]? (lectus|tarius|premus), the built-in AI[^\n]*/g;
const OWN=BASIC?'tarius':PREMUS?'premus':'lectus', OTHER=BASIC?/\blectus\b|\bpremus\b|intellectus|supremus|Qwen3 4B|Qwen3 8B/:PREMUS?/\btarius\b|\blectus\b|intellectus|Qwen3 4B/:/\btarius\b|\bpremus\b/;
const rename=m=>{ const out=m.map(y=>({role:y.role,content:y.content.replace(WHO_RE,WHO.who).replace(new RegExp('FF777 [\\d.]+[a-z]? '+OWN,'g'),'FF777 '+VER+' '+OWN)}));
  return out.some(y=>OTHER.test(y.content))?null:out; };
const pool={}, seen=new Set(); let blockedN=0;
const put=(task,messages)=>{ const k=task.replace(/^memo-.*/,'memo')+'|'+key(messages); if(seen.has(k)) return; if(blocked(messages[1].content)){ blockedN++; return; } seen.add(k); (pool[task]=pool[task]||[]).push({task,messages}); };
function checked(kind,file){
  const src=path.join(RAW,file+'.jsonl'); if(!fs.existsSync(src)){ console.log('missing',file); return []; }
  const tmp=path.join(OUT,'.v21-'+file+'.jsonl');
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
for(const r of jl(path.join(OUT,'v17-smart.jsonl')).concat(jl(path.join(OUT,'v18-smart.jsonl')))){ if(/^(self|self7|newself)$/.test(r.task)) continue; put(r.task==='joke17'?'joke16x':r.task,r.messages); }   // 1.7 rows: put() drops repeats
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
for(const r of jl(path.join(OUT,'v19-anyjoke.jsonl'))) put(r.task,r.messages);
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
fs.writeFileSync(path.join(OUT,'v21'+STAGE+'-'+VARIANT+'.jsonl'),final.map(x=>JSON.stringify(x)).join('\n')+'\n');
fs.writeFileSync(path.join(OUT,'v21-'+VARIANT+'-test.jsonl'),test.concat(heldOut).map(x=>({task:x.task,messages:rename(x.messages)})).filter(x=>x.messages).map(x=>JSON.stringify(x)).join('\n')+'\n');
const stats={built:new Date().toISOString(),total:final.length,filled:fill,newRows:final.filter(r=>NEW.has(r.task)).length,take,short,blocked:blockedN,
  repeatedRows:final.length-new Set(final.map(r=>key(r.messages))).size,pool:Object.fromEntries(Object.entries(pool).map(([k,v])=>[k,v.length]))};
fs.writeFileSync(path.join(OUT,'v21'+STAGE+'-'+VARIANT+'-stats.json'),JSON.stringify(stats,null,1)+'\n');
console.log(JSON.stringify(stats));
