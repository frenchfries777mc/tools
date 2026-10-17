#!/usr/bin/env node
/* FF777 1.3 training sets (plan: ff777-1.3-training-plan.md), built in one go from everything already checked:
     data/v13-smart.jsonl  lectus (Qwen3 4B), data/v13-basic.jsonl  tarius (Qwen3 1.7B, same ratios, fewer rows)
   Ratios (owner 2026-10-17): translation 20.5, request understanding 19, coding 18.5, chart 15, formula 10, table 6,
   ask + slides 7, own name 1, jokes 3. Coding answers are now whole HTML pages (the Block HTML editor turns them into blocks):
   every coding example from the earlier rounds is rebuilt in the headless editor, written in the lean form BHX.lean() gives
   (the same form the site shows the AI as "current page"), and kept only when the page runs without errors.
   The test pool (data/test.jsonl) and the real-request eval list (/mnt/project-files/tools/ff777-real-eval-v0.jsonl,
   train/eval/*.json) are never trained on. Needs a static server: node train/build4.js [http://localhost:PORT]  */
'use strict';
const fs=require('fs'), path=require('path'), cp=require('child_process');
const DIR=__dirname, ROOT=path.join(DIR,'..'), RAW=path.join(DIR,'raw'), OUT=path.join(DIR,'data');
const BASE=process.argv[2]||'http://localhost:9422';
let playwright; try{ playwright=require('playwright'); }catch(e){ playwright=require('/opt/node22/lib/node_modules/playwright'); }

const SIZE={smart:5000, basic:2000};
const RATIO={tr:20.5, und:19, code:18.5, graph:15, formula:10, table:6, askslides:7, self:1, joke:3};
const VERSION='1.3';
const HUMOR='You are cheerful and a little funny: when you chat you add a short, kind joke, but answers about tables, formulas and code stay exact and serious.';
const WHO={
  smart:{who:'You are FF777 1.3 lectus, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 4B. Your name is the end of the Latin word intellectus ("understanding"). '+HUMOR, fill:{NAME:'FF777 1.3 lectus', BASE:'Qwen3 4B', LATIN:'intellectus', MEANING_KO:'이해력', MEANING_EN:'understanding'}},
  basic:{who:'You are FF777 1.3 tarius, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 1.7B. Your name is the end of the Latin word elementarius ("basic"). '+HUMOR, fill:{NAME:'FF777 1.3 tarius', BASE:'Qwen3 1.7B', LATIN:'elementarius', MEANING_KO:'기본', MEANING_EN:'basic'}}
};
let seed=20261018; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const shuffle=a=>{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const estTokens=m=>m.reduce((n,x)=>{ const t=x.content, a=(t.match(/[\x00-\x7f]/g)||[]).length; return n+a/3.3+(t.length-a)+6; },0);
const jl=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)):[];
const norm=s=>String(s).replace(/\s+/g,' ').trim();

/* ---------- what must never be trained on ---------- */
const test=jl(path.join(OUT,'test.jsonl')); const testUsers=new Set(test.map(x=>norm(x.messages[1].content)));
const evalQs=[];
for(const f of [path.join(DIR,'eval','more-requests.json')]) if(fs.existsSync(f)) JSON.parse(fs.readFileSync(f,'utf8')).forEach(x=>evalQs.push(norm(x.q)));
const realEval='/mnt/project-files/tools/ff777-real-eval-v0.jsonl';
if(fs.existsSync(realEval)) jl(realEval).forEach(x=>evalQs.push(norm(x.q||x.request||x.prompt||'')));
const blocked=u=>testUsers.has(norm(u))||evalQs.some(q=>q.length>3&&norm(u).includes(q));

/* ---------- pool from the checked data of rounds 1-3 ---------- */
const SRC=['full','round2-smart','round3-smart','round2-basic','round3-basic','basic'];
const pool={}, seen=new Set(); let blockedN=0;
for(const f of SRC) for(const r of jl(path.join(OUT,f+'.jsonl'))){
  if(!['code','und','tr','graph','formula','table','ask','slides'].includes(r.task)) continue;
  const u=r.messages[1].content, key=r.task+'|'+norm(u);
  if(seen.has(key)) continue; seen.add(key);
  if(blocked(u)){ blockedN++; continue; }
  (pool[r.task]=pool[r.task]||[]).push(r);
}

/* new pairs written for 1.3: tr-3 (new sentences) and the *application* sets (same answers, requests worded differently) */
for(const [kind,files] of [['tr',['tr-3','tr-4']],['formula',['formula-4']],['graph',['graph-5']],['table',['table-3']]]) for(const f of files){
  const tmp=path.join(OUT,'.v13-x.jsonl'); cp.spawnSync('node',[path.join(DIR,'check.js'),kind,path.join(RAW,f+'.jsonl'),'--out',tmp],{encoding:'utf8',maxBuffer:64<<20});
  for(const x of jl(tmp)){ const key=kind+'|'+norm(x.messages[1].content); if(seen.has(key)) continue; seen.add(key); (pool[kind]=pool[kind]||[]).push({task:kind,messages:x.messages}); } fs.rmSync(tmp,{force:true}); }

/* ---------- translation: the reverse direction of every Korean source sentence is a new, correct example ---------- */
const KO_INSTR=['한국어로 번역','한국어로','한국어로 바꿔줘','Translate to Korean','한국어로 번역해 줘','Translate into Korean','韓国語に翻訳','Traducir al coreano'];
const trExtra=[];
for(const r of pool.tr||[]){
  const m=/^([\s\S]*?)\n\nData:\n([\s\S]*)$/.exec(r.messages[1].content); if(!m) continue;
  const text=m[2], ans=r.messages[2].content;
  if(!/[가-힣]/.test(text)||/[가-힣]/.test(ans)||ans.length<2||text.length<3) continue;     // only Korean -> other language
  const instr=KO_INSTR[Math.floor(rnd()*KO_INSTR.length)];
  trExtra.push({task:'tr',messages:[r.messages[0],{role:'user',content:instr+'\n\nData:\n'+ans},{role:'assistant',content:text}]});
}
pool.tr=(pool.tr||[]).concat(trExtra.filter(x=>!blocked(x.messages[1].content)));

/* ---------- pages written for requests a child is likely to type (gen-html.js): same run check as the rebuilt ones ---------- */
async function genRows(){
  const items=jl(path.join(RAW,'html-gen.jsonl')).filter(x=>!blocked(x.q));
  const browser=await playwright.chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
  const page=await (await browser.newContext({viewport:{width:1300,height:800},locale:'ko-KR'})).newPage(); await page.goto(BASE+'/blocks/index.html'); await page.waitForTimeout(1000);
  const out=[]; let bad=0;
  for(const it of items){
    const errs=await page.evaluate(async(html)=>{ const errs=[]; window.__errs=errs; const f=document.createElement('iframe'); f.style.cssText='width:600px;height:400px;position:fixed;left:-9999px';
      f.srcdoc=html.replace('<head>','<head><script>window.onerror=function(m){parent.__errs.push(String(m))}<\/script>'); document.body.appendChild(f); await new Promise(r=>f.onload=r); await new Promise(r=>setTimeout(r,100));
      try{ const d=f.contentDocument, w=f.contentWindow; w.alert=()=>{}; w.confirm=()=>true; w.prompt=()=>'5';
        d.querySelectorAll('input').forEach(i=>{ if(i.type==='number') i.value='5'; else if(i.type==='text') i.value='가나다'; });
        d.querySelectorAll('textarea').forEach(i=>{ i.value='가나다 abc'; i.dispatchEvent(new w.Event('input',{bubbles:true})); });
        d.querySelectorAll('button').forEach(b=>{ try{ b.click(); }catch(e){ errs.push(String(e)); } });
        d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})); await new Promise(r=>setTimeout(r,60)); }catch(e){ errs.push(String(e)); }
      f.remove(); return errs.slice(0,2); },it.html).catch(e=>['eval '+e.message]);
    if(errs.length){ bad++; console.log('gen page failed',it.id,errs[0]); continue; }
    const prompt=(it.cur?'Current page:\n```html\n'+it.cur.trim()+'\n```\n\nRequest: ':'Request: ')+it.q;
    out.push({task:/^chip-/.test(it.id||'')?'memo-chip':'gen',messages:[{role:'system',content:SYS_HTML},{role:'user',content:prompt},{role:'assistant',content:'```html\n'+it.html.trim()+'\n```'}]});
  }
  await browser.close(); console.log('gen pages ok',out.length,'bad',bad); return out; }

/* ---------- memorize on purpose (owner 2026-10-17): the stored examples, formulas, the chip prompts and the jokes ---------- */
const MEMO=JSON.parse(fs.readFileSync(path.join(DIR,'eval','memo-examples.json'),'utf8'));
const CHIP_EDITS=['배경을 밤하늘로 바꿔 줘','버튼을 누르면 소리가 나게 해 줘','점수가 10이 되면 축하 메시지를 띄워 줘','제목 글자를 더 크고 빨갛게 해 줘'];
async function memoRows(){
  const browser=await playwright.chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
  const page=await (await browser.newContext({viewport:{width:1300,height:800},locale:'ko-KR'})).newPage(); await page.goto(BASE+'/blocks/index.html'); await page.waitForTimeout(1500);
  const built=await page.evaluate((names)=>{ const bh=window.__bh, o={}; for(const n of names){ const ex=bh.examples.find(e=>e.name===n); if(!ex) continue; bh.ws.clear(); bh.loadXML(ex.xml()); o[n]=BHX.lean(bh.build()); } return o; },Object.keys(MEMO));
  await browser.close();
  const rows=[]; for(const n of Object.keys(MEMO)){ if(!built[n]) throw new Error('no example '+n); for(const q of MEMO[n]) rows.push({task:'memo-ex',messages:[{role:'system',content:SYS_HTML},{role:'user',content:'Request: '+q},{role:'assistant',content:'```html\n'+built[n].trim()+'\n```'}]}); }
  return rows; }

/* ---------- own name and jokes ---------- */
function selfRows(kind,variant){
  const files=kind==='joke'?['self-4','self-6']:kind==='pun'?['self-6']:kind==='fun'?['self-5']:['self-1','self-2','self-3'], out=[];
  const W=WHO[variant];
  for(const f of files){
    const tmp=path.join(OUT,'.v13-'+f+'.jsonl'); cp.spawnSync('node',[path.join(DIR,'check.js'),'self',path.join(RAW,f+'.jsonl'),'--out',tmp],{encoding:'utf8',maxBuffer:64<<20});
    for(const x of jl(tmp)){
      const m=x.messages.map(y=>({role:y.role,content:y.content.replace(/\{(\w+)\}/g,(s,k)=>W.fill[k]!=null?W.fill[k]:s)}));
      if(m.some(y=>/\{\w+\}/.test(y.content))) throw new Error('unfilled placeholder in '+f);
      const bare=m.map(y=>({role:y.role,content:y.content}));
      const withWho=m.map((y,i)=>i===0?{role:y.role,content:y.content+'\n\n'+W.who}:{role:y.role,content:y.content});
      if(kind==='joke'||kind==='pun') out.push({task:'self',messages:bare}); else { out.push({task:'self',messages:withWho}); out.push({task:'self',messages:bare}); }
    }
    fs.rmSync(tmp,{force:true});
  }
  return out;
}

/* ---------- coding: XML rows -> HTML rows ---------- */
const SYS_HTML=(()=>{ const src=fs.readFileSync(path.join(ROOT,'blocks','ai-blocks.js'),'utf8'); const m=/var SYS_HTML=\[(.*?)\]\.join\('\\n'\);/s.exec(src); return eval('['+m[1]+']').join('\n'); })();
async function htmlify(rows,label){
  const browser=await playwright.chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
  const ctx=await browser.newContext({viewport:{width:1300,height:800},locale:'ko-KR'});
  const page=await ctx.newPage(); await page.goto(BASE+'/blocks/index.html'); await page.waitForTimeout(1500);
  const out=[], stat={rows:rows.length,noParse:0,buildFail:0,runFail:0,tooLong:0,curLong:0,ok:0};
  for(let i=0;i<rows.length;i+=1){
    const r=rows[i], u=r.messages[1].content, a=r.messages[2].content;
    const mu=/^(?:Current project:\n(<xml[\s\S]*?<\/xml>)\n\n)?Request: ([\s\S]*)$/.exec(u), ma=/^PLAN: (edit|new)\n(<xml[\s\S]*<\/xml>)\s*$/.exec(a);
    if(!mu||!ma){ stat.noParse++; continue; }
    const res=await page.evaluate(async ([curXml,ansXml])=>{
      const bh=window.__bh; const build=(x)=>{ bh.ws.clear(); bh.loadXML(x); return BHX.lean(bh.build()); };
      let cur=null, ans; try{ if(curXml) cur=build(curXml); ans=build(ansXml); }catch(e){ return {err:'build '+e.message}; }
      // run the answer page: no error while it starts, clicks every button, presses a key
      const errs=[]; const f=document.createElement('iframe'); f.style.cssText='width:600px;height:400px;position:fixed;left:-9999px';
      window.__errs=errs; f.srcdoc=ans.replace('<head>','<head><script>window.onerror=function(m){parent.__errs.push(String(m))}<\/script>');
      document.body.appendChild(f); await new Promise(r=>f.onload=r); await new Promise(r=>setTimeout(r,120));
      try{ const d=f.contentDocument; const w=f.contentWindow; w.alert=()=>{}; w.confirm=()=>true; w.prompt=()=>'5';
        d.querySelectorAll('input').forEach(i=>{ if(i.type==='number') i.value='5'; else if(i.type==='text') i.value='가나다'; });
        d.querySelectorAll('button').forEach(b=>{ try{ b.click(); }catch(e){ errs.push(String(e)); } });
        d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})); await new Promise(r=>setTimeout(r,80)); }catch(e){ errs.push(String(e)); }
      f.remove();
      return {cur,ans,errs:errs.slice(0,2)};
    },[mu[1]||null,ma[2]]).catch(e=>({err:'eval '+e.message}));
    if(res.err){ stat.buildFail++; continue; }
    if(res.errs.length){ stat.runFail++; continue; }
    if(!/<\/html>\s*$/.test(res.ans)){ stat.buildFail++; continue; }
    if(res.cur&&res.cur.length>6000){ stat.curLong++; continue; }
    const prompt=(res.cur?'Current page:\n```html\n'+res.cur+'\n```\n\nRequest: ':'Request: ')+mu[2];
    const msgs=[{role:'system',content:SYS_HTML},{role:'user',content:prompt},{role:'assistant',content:'```html\n'+res.ans.trim()+'\n```'}];
    if(estTokens(msgs)>3900){ stat.tooLong++; continue; }
    out.push({task:label||'code',messages:msgs}); stat.ok++;
    if(i%200===0) console.log('html',i,'/',rows.length,JSON.stringify(stat));
  }
  await browser.close(); return {out,stat};
}

(async()=>{
  const code=await htmlify(pool.code||[],'code'); console.log('code html',JSON.stringify(code.stat));
  const und=await htmlify(pool.und||[],'und'); console.log('und html',JSON.stringify(und.stat));
  const tHtml=await htmlify(test.filter(x=>x.task==='code'||x.task==='und'),'code');   // same conversion for the test pool
  const tMap=new Map(tHtml.out.map(x=>[x.messages[1].content.split('Request: ').pop(),x]));
  const v13test=test.map(x=>{ if(x.task!=='code'&&x.task!=='und') return x; const q=x.messages[1].content.split('Request: ').pop(); const y=tMap.get(q); return y?{task:x.task,messages:y.messages}:null; }).filter(Boolean);
  fs.writeFileSync(path.join(OUT,'v13-test.jsonl'),v13test.map(x=>JSON.stringify(x)).join('\n')+'\n'); console.log('v13-test rows',v13test.length,'of',test.length);
  const gen=await genRows();
  const memoEx=await memoRows(); console.log('memorized example rows',memoEx.length);
  const stats={};
  for(const variant of ['smart','basic']){
    const N=SIZE[variant], want=k=>Math.round(N*RATIO[k]/100);
    const pick=(rows,n)=>{ const r=shuffle(rows.slice()), out=[]; while(out.length<n&&r.length) out.push(...r.splice(0,n-out.length)); const dup=n-out.length; let extra=0;
      while(out.length<n&&rows.length){ out.push(rows[Math.floor(rnd()*rows.length)]); extra++; } return {out,extra}; };
    const take={}, rows=[], dups={};
    const add=(k,src,n)=>{ const p=pick(src,n); dups[k]=p.extra; take[k]=p.out.length; rows.push(...p.out.map(x=>({task:k,messages:x.messages}))); };
    add('tr',pool.tr,want('tr')); add('und',und.out,want('und')); add('code',code.out,want('code'));
    add('graph',pool.graph,want('graph')); add('table',pool.table,want('table'));
    // memorized: every formula twice, the chip edit prompts x3, the stored examples x3 (variants of the requests), all jokes twice
    rows.push(...pool.formula.concat(pool.formula).map(x=>({task:'formula',messages:x.messages}))); take.formula=pool.formula.length*2;
    const chipRows=gen.filter(x=>x.task==='memo-chip');
    for(let k=0;k<3;k++) rows.push(...chipRows.map(x=>({task:'memo-chip',messages:x.messages}))); take['memo-chip']=chipRows.length*3;
    for(let k=0;k<3;k++) rows.push(...memoEx.map(x=>({task:'memo-ex',messages:x.messages}))); take['memo-ex']=memoEx.length*3;
    const gk=variant==='smart'?2:1, genOnly=gen.filter(x=>x.task==='gen'); for(let k=0;k<gk;k++) rows.push(...genOnly.map(x=>({task:'gen',messages:x.messages}))); take.gen=genOnly.length*gk;
    const ask=pool.ask||[], sl=pool.slides||[], nAS=want('askslides'); const a1=pick(ask,Math.ceil(nAS/2)), a2=pick(sl,Math.floor(nAS/2));
    rows.push(...a1.out.map(x=>({task:'ask',messages:x.messages})),...a2.out.map(x=>({task:'slides',messages:x.messages}))); take.askslides=a1.out.length+a2.out.length;
    const ids=shuffle(selfRows('self',variant)), jokes=shuffle(selfRows('joke',variant)), fun=selfRows('fun',variant), pun=selfRows('pun',variant);
    for(let k=0;k<2;k++) rows.push(...fun.map(x=>({task:'fun',messages:x.messages}))); take.fun=fun.length*2;
    for(let k=0;k<3;k++) rows.push(...pun.map(x=>({task:'pun',messages:x.messages}))); take.pun=pun.length*3;   // homophone / letter-meaning jokes: the owner's favourite kind, extra weight
    rows.push(...ids.slice(0,want('self')).map(x=>({task:'self',messages:x.messages})));
    take.self=Math.min(want('self'),ids.length); take.joke=jokes.length*2;
    rows.push(...jokes.map(x=>({task:'joke',messages:x.messages})),...jokes.map(x=>({task:'joke',messages:x.messages})));
    const final=shuffle(rows);
    fs.writeFileSync(path.join(OUT,`v13-${variant}.jsonl`),final.map(x=>JSON.stringify(x)).join('\n')+'\n');
    const total=final.length, pct=Object.fromEntries(Object.entries(take).map(([k,v])=>[k,+(100*v/total).toFixed(1)]));
    stats[variant]={total,take,pct,dups};
    console.log(variant,JSON.stringify(stats[variant]));
  }
  fs.writeFileSync(path.join(OUT,'v13-stats.json'),JSON.stringify({built:new Date().toISOString(),pool:Object.fromEntries(Object.entries(pool).map(([k,v])=>[k,v.length])),gen:gen.length,codeHtml:code.stat,undHtml:und.stat,blocked:blockedN,variants:stats},null,1)+'\n');
})();
