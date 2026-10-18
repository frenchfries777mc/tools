#!/usr/bin/env node
/* FF777 1.4 training sets (plan: /mnt/project-files/tools/ff777-1.4-plan.md, doc "FF777 1.4 학습 기획안"):
     data/v14-smart.jsonl  lectus (Qwen3 4B), data/v14-basic.jsonl  tarius (Qwen3 1.7B), data/v14-test.jsonl  never trained on
   What changed from 1.3 (owner tests 2026-10-18: endless repeats, made-up meanings, one-word questions, wrong big sums,
   claiming the hub site, odd jokes, subject/object mix-up, buggy game logic):
   - replay = the rows 1.3 already checked (v13-smart + v13-basic; code answers are already run-checked HTML pages),
     each row at most once (1.3 had 1,946 repeated rows); old jokes, puns and riddle chat are dropped
   - new rows: raw/ask-4 (unknown words, one-word questions, sums, lists that end, sites), raw/self-7 (self questions in odd wording),
     raw/parts-1 (=AI sentence parts, with the exact instruction the site sends), raw/joke-1 (the owner's 115 jokes),
     raw/html-gen-14 (games whose logic was run-checked), raw/calc-1, spell-1, explain-1
   - names taught: FF777 1.4 lectus / FF777 1.4 tarius (owner: both ship as 1.4)
   No server needed: node train/build5.js */
'use strict';
const fs=require('fs'), path=require('path'), cp=require('child_process');
const DIR=__dirname, ROOT=path.join(DIR,'..'), RAW=path.join(DIR,'raw'), OUT=path.join(DIR,'data');
const P=require(path.join(ROOT,'ai-prompts.js'));

const SIZE={smart:5000, basic:3000};
// owner plan 2026-10-18 (percent of rows); a group short of rows takes all it has and the gap is reported
const GROUPS={
  code:{pct:22, tasks:['code','gen','memo-ex','memo-chip','gen14']},
  chat:{pct:15, tasks:['ask','fun','ask4']},
  tr:{pct:15, tasks:['tr','cell']},
  und:{pct:13, tasks:['und']},
  graph:{pct:10, tasks:['graph']},
  formula:{pct:10, tasks:['formula','calc']},
  table:{pct:5, tasks:['table']},
  slides:{pct:4, tasks:['slides']},
  joke:{pct:3, tasks:['joke']},
  spellexplain:{pct:2, tasks:['spell','explain']},
  self:{pct:1, tasks:['self','self7']}
};
const NEW=new Set(['ask4','self7','cell','joke','gen14','calc','spell','explain']);
const MEMO_TIMES=2; // the stored examples and chip prompts are memorized on purpose (owner 2026-10-17)
const HUMOR='You are cheerful and a little funny: when you chat you add a short, kind joke, but answers about tables, formulas and code stay exact and serious.';
const WHO={
  smart:{who:'You are FF777 1.4 lectus, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 4B. Your name is the end of the Latin word intellectus ("understanding"). '+HUMOR, fill:{NAME:'FF777 1.4 lectus', BASE:'Qwen3 4B', LATIN:'intellectus', MEANING_KO:'이해력', MEANING_EN:'understanding'}},
  basic:{who:'You are FF777 1.4 tarius, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 1.7B. Your name is the end of the Latin word elementarius ("basic"). '+HUMOR, fill:{NAME:'FF777 1.4 tarius', BASE:'Qwen3 1.7B', LATIN:'elementarius', MEANING_KO:'기본', MEANING_EN:'basic'}}
};
let seed=20261018; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const shuffle=a=>{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const jl=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)):[];
const norm=s=>String(s).replace(/\s+/g,' ').trim();
const key=m=>JSON.stringify(m.slice(1).map(x=>norm(x.content)));
const SYS_HTML=(()=>{ const src=fs.readFileSync(path.join(ROOT,'blocks','ai-blocks.js'),'utf8'); const m=/var SYS_HTML=\[(.*?)\]\.join\('\\n'\);/s.exec(src); return eval('['+m[1]+']').join('\n'); })();

/* ---------- the test set: 1.3's pool plus the owner's real failures (never trained on) ---------- */
const LOOP_TEST=[ // owner's own questions from 2026-10-18; reference answers are what a right answer looks like
  ['ask','너가 잘 하는 것','표 정리, 수식과 그래프 만들기, 발표 자료, 블록 코딩 페이지 만들기를 도와드려요. 필요한 게 있으면 말씀해 주세요.'],
  ['ask','티원','T1은 한국의 e스포츠 팀이에요. 리그 오브 레전드 팀으로 유명하고 페이커 선수가 있는 팀이에요.'],
  ['ask','에엑따','잘 모르는 말이에요. 어떤 뜻인지 조금 더 알려 주세요.'],
  ['ask','알파벳','알파벳은 영어 등에서 쓰는 글자로, A부터 Z까지 26자예요.'],
  ['ask','너의 이름의 뜻은?','제 이름 {NAME}의 {SHORT}는 라틴어 {LATIN}에서 따왔어요.'],
  ['ask','https://frenchfries777mc.github.io/games/는 어떤 사이트야?','Frenchfries777님이 만든 게임 허브 사이트예요. Stickseum, Beaconfall, Crown Envoy를 할 수 있고 커뮤니티, 위키, 업적이 있어요.'],
  ['ask','351의 제곱을 x라 할 때, x=2y/5+38*x에서 y의 값을 구하는 풀이과정과 답을 써라','x = 351² = 123,201이에요. 2y/5 = x - 38x = -37x이므로 y = -37x × 5/2 = -92.5x = -11,396,092.5예요. 시트에서 =-92.5*351^2로 확인할 수 있어요.'],
  ['ask','아재개그 해줘','소가 그림을 그리면?\n정답은 피카소!'],
  ['cell','목적어인 단어만 나타내기','오늘 나는 점심을 먹었다','점심을'],
  ['cell','주어','오늘 나는 점심을 먹었다','나는']
];
const sitePartTask=(()=>{ const src=fs.readFileSync(path.join(ROOT,'sheet','ai-sheet.js'),'utf8'); return new Function(src.slice(src.indexOf('var PART_KO'),src.indexOf('E.aiHook='))+'\nreturn partTask;')(); })(); // the instruction the site really sends
function loopTest(variant){
  const f=WHO[variant].fill, short=f.NAME.split(' ').pop();
  return LOOP_TEST.map(t=>{
    if(t[0]==='cell') return {task:'loop-cell',messages:[{role:'system',content:P.cellSys},{role:'user',content:P.cellPrompt(sitePartTask(t[1]),[t[2]])},{role:'assistant',content:t[3]}]};
    const ans=t[2].replace('{NAME}',f.NAME).replace('{SHORT}',short).replace('{LATIN}',f.LATIN);
    return {task:'loop-ask',messages:[{role:'system',content:P.askSys+'\n\n'+WHO[variant].who},{role:'user',content:P.askPrompt(null,t[1])},{role:'assistant',content:ans}]};
  });
}
const v13test=jl(path.join(OUT,'v13-test.jsonl'));
const testUsers=new Set(v13test.map(x=>norm(x.messages[1].content)));
const evalQs=LOOP_TEST.map(t=>norm(t[1]));
const realEval='/mnt/project-files/tools/ff777-real-eval-v0.jsonl';
if(fs.existsSync(realEval)) jl(realEval).forEach(x=>evalQs.push(norm(x.q||x.request||x.prompt||'')));
for(const f of ['more-requests.json']){ const p=path.join(DIR,'eval',f); if(fs.existsSync(p)) JSON.parse(fs.readFileSync(p,'utf8')).forEach(x=>evalQs.push(norm(x.q))); }
const blocked=u=>{ const n=norm(u); return testUsers.has(n)||evalQs.some(q=>q&&(n.endsWith('Question: '+q)||n.endsWith('Request: '+q)||(q.length>3&&n.endsWith(q)))); };

/* ---------- replay: every row 1.3 already checked, once ---------- */
const DROP_TASKS=new Set(['joke','pun']);                    // replaced by the owner's jokes
const riddle=a=>/[?？]/.test(a)&&/(말장난|\.\.\.|…|정답)/.test(a);  // old chat rows that tell a made-up pun
const pool={}, seen=new Set(); let dropped=0, blockedN=0;
const put=(task,messages)=>{ const k=task.replace(/^memo-.*/,'memo')+'|'+key(messages); if(seen.has(k)) return; seen.add(k); (pool[task]=pool[task]||[]).push({task,messages}); };
for(const f of ['v13-smart','v13-basic']) for(const r of jl(path.join(OUT,f+'.jsonl'))){
  if(DROP_TASKS.has(r.task)){ dropped++; continue; }
  if(r.task==='fun'&&riddle(r.messages[2].content)){ dropped++; continue; }
  if(r.task==='self') continue;                               // self rows are rebuilt per variant below
  if(blocked(r.messages[1].content)){ blockedN++; continue; }
  put(r.task,r.messages);
}

/* ---------- new rows ---------- */
function checked(kind,file){
  const src=path.join(RAW,file+'.jsonl'); if(!fs.existsSync(src)){ console.log('missing',file); return []; }
  const tmp=path.join(OUT,'.v14-'+file+'.jsonl');
  const r=cp.spawnSync('node',[path.join(DIR,'check.js'),kind,src,'--out',tmp],{encoding:'utf8',maxBuffer:64<<20});
  console.log(file+':',(r.stdout||'').trim().split('\n').pop());
  const rows=jl(tmp); fs.rmSync(tmp,{force:true}); return rows;
}
function selfRows(file,variant){ // {NAME}... filled per model; asked with and without the site's "who" line, like 1.3
  const W=WHO[variant], out=[];
  for(const x of checked('self',file)){
    if(blocked(x.messages[1].content)) continue;
    const m=x.messages.map(y=>({role:y.role,content:y.content.replace(/\{(\w+)\}/g,(s,k)=>W.fill[k]!=null?W.fill[k]:s)}));
    if(m.some(y=>/\{\w+\}/.test(y.content))) throw new Error('unfilled placeholder in '+file);
    out.push(m.map((y,i)=>i===0?{role:y.role,content:y.content+'\n\n'+W.who}:y));
  }
  return out;
}
for(const x of checked('ask','ask-4')) if(!blocked(x.messages[1].content)) put('ask4',x.messages);
for(const x of checked('tr','parts-1')) if(!blocked(x.messages[1].content)) put('cell',x.messages);
for(const x of checked('self','joke-1')) put('joke',x.messages);
for(const it of jl(path.join(RAW,'html-gen-14.jsonl'))) if(!blocked(it.q)) put('gen14',[{role:'system',content:SYS_HTML},{role:'user',content:'Request: '+it.q},{role:'assistant',content:'```html\n'+it.html.trim()+'\n```'}]);
for(const it of jl(path.join(RAW,'calc-1.jsonl'))) put('calc',[{role:'system',content:P.calcSys},{role:'user',content:P.calcPrompt(it.cols,it.q)},{role:'assistant',content:JSON.stringify({formula:it.formula})}]);
for(const it of jl(path.join(RAW,'spell-1.jsonl'))) put('spell',[{role:'system',content:P.spellSys},{role:'user',content:P.spellPrompt(JSON.stringify(it.in))},{role:'assistant',content:JSON.stringify(it.out)}]);
for(const it of jl(path.join(RAW,'explain-1.jsonl'))) put('explain',[{role:'system',content:P.explainSys(it.lang)},{role:'user',content:P.explainPrompt(it.outline)},{role:'assistant',content:it.explain}]);

/* ---------- build ---------- */
// every "who" line and own name becomes this model's 1.4 one; a row that still names the other model is left out
const WHO_RE=/You are FF777 [\d.]+ (lectus|tarius), the built-in AI[^\n]*/g;
const rename=(m,variant)=>{ const own=variant==='smart'?'lectus':'tarius', other=variant==='smart'?'tarius':'lectus';
  const out=m.map(y=>({role:y.role,content:y.content.replace(WHO_RE,WHO[variant].who).replace(/FF777 [\d.]+ (lectus|tarius)/g,(s,n)=>n===own?'FF777 1.4 '+own:s)}));
  return out.some(y=>new RegExp('\\b'+other+'\\b').test(y.content))?null:out; };
const stats={};
for(const variant of ['smart','basic']){
  const N=SIZE[variant], rows=[], take={}, short={};
  const vpool=Object.assign({},pool,{
    self:jl(path.join(OUT,`v13-${variant}.jsonl`)).filter(r=>r.task==='self').map(r=>({task:'self',messages:r.messages})),
    self7:selfRows('self-7',variant).map(m=>({task:'self7',messages:m}))});
  for(const [g,G] of Object.entries(GROUPS)){
    const want=Math.round(N*G.pct/100); let got=[];
    for(const t of G.tasks) if(NEW.has(t)) got.push(...(vpool[t]||[]));              // every new row goes in
    const old=shuffle(G.tasks.filter(t=>!NEW.has(t)).flatMap(t=>vpool[t]||[]));
    const memo=old.filter(r=>/^memo-/.test(r.task)), rest=old.filter(r=>!/^memo-/.test(r.task));
    for(let k=0;k<MEMO_TIMES;k++) got.push(...memo);
    got.push(...rest.slice(0,Math.max(0,want-got.length)));
    if(got.length<want) short[g]=want-got.length;
    take[g]={rows:got.length,new:got.filter(r=>NEW.has(r.task)).length};
    rows.push(...got.map(r=>({task:r.task,messages:rename(r.messages,variant)})).filter(r=>r.messages));
  }
  const final=shuffle(rows);
  fs.writeFileSync(path.join(OUT,`v14-${variant}.jsonl`),final.map(x=>JSON.stringify(x)).join('\n')+'\n');
  const total=final.length, nNew=final.filter(r=>NEW.has(r.task)).length;
  stats[variant]={total,newRows:nNew,newPct:+(100*nNew/total).toFixed(1),
    pct:Object.fromEntries(Object.entries(take).map(([g,v])=>[g,+(100*v.rows/total).toFixed(1)])),take,short,
    repeatedRows:total-new Set(final.map(r=>key(r.messages))).size};
  console.log(variant,JSON.stringify(stats[variant]));
}
const test=v13test.map(x=>({task:x.task,messages:rename(x.messages,'smart')})).filter(x=>x.messages).concat(loopTest('smart'));
fs.writeFileSync(path.join(OUT,'v14-test.jsonl'),test.map(x=>JSON.stringify(x)).join('\n')+'\n');
fs.writeFileSync(path.join(OUT,'v14-stats.json'),JSON.stringify({built:new Date().toISOString(),
  pool:Object.fromEntries(Object.entries(pool).map(([k,v])=>[k,v.length])),droppedOldJokes:dropped,blocked:blockedN,test:test.length,variants:stats},null,1)+'\n');
console.log('test rows',test.length);
