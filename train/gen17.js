#!/usr/bin/env node
/* FF777 1.7: rows for the tools the 1.6 set did not cover: Fry Docs AI, Fry Python error help, Fry Lab AI (ask, report draft, 값 바꾸기, 실험 찾기).
   The prompts come from ai-prompts.js (the same strings the sites send); answers are in train/raw/docs-*.jsonl, py-*.jsonl, lab-ask.jsonl, lab-draft.jsonl.
   Lab experiment prompts were dumped from the real lab page (train/ref/lab-dump.json, Korean, the small built-in model's short form).
   Output: data/v17-new.jsonl ({task:'docs17'|'py17'|'labask17'|'labdraft17'|'labset17'|'labfind17', messages}).   node train/gen17.js */
'use strict';
const fs=require('fs'), path=require('path');
const DIR=__dirname, RAW=path.join(DIR,'raw'), OUT=path.join(DIR,'data');
const P=require(path.join(DIR,'..','ai-prompts.js'));
const jl=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)):[];
const DUMP=JSON.parse(fs.readFileSync(path.join(DIR,'ref','lab-dump.json'),'utf8')), BY=Object.fromEntries(DUMP.map(x=>[x.id,x]));
let seed=20261027; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const pick=a=>a[Math.floor(rnd()*a.length)];
const shuffle=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const M=(s,u,a)=>[{role:'system',content:s},{role:'user',content:u},{role:'assistant',content:a}];
const rows=[], bad=[];
const add=(task,m)=>{ if(m.some(x=>!String(x.content||'').trim())){ bad.push(task); return; } rows.push({task,messages:m}); };
const trim1800=p=>p.length>1800?p.slice(0,1800):p;
/* Docs */
for(const f of fs.readdirSync(RAW).filter(f=>/^docs-.*\.jsonl$/.test(f))) for(const r of jl(path.join(RAW,f))){
  if(r.task==='ask') add('docs17',M(P.docsTasks.ask.sys,P.docsAskPrompt(r.doc,r.q),r.out));
  else if(r.task==='draft') add('docs17',M(P.docsTasks.draft.sys,P.docsDraftPrompt(r.topic),r.out));
  else if(P.docsTasks[r.task]) add('docs17',M(P.docsTasks[r.task].sys,P.docsPrompt(r.task,r.text),r.out));
  else bad.push('docs:'+r.task); }
/* Python */
const LN={ko:'Korean',en:'English',es:'Spanish',fr:'French',de:'German',ja:'Japanese',zh:'Chinese',pt:'Portuguese',ru:'Russian',tr:'Turkish',it:'Italian',pl:'Polish',ar:'Arabic'};
for(const f of fs.readdirSync(RAW).filter(f=>/^py-\d+\.jsonl$/.test(f))) for(const r of jl(path.join(RAW,f))) add('py17',M(P.pySys(LN[r.lang]||'Korean'),P.pyPrompt(r.code,r.error),r.out));
/* Lab: explain and report draft (written answers) */
for(const r of jl(path.join(RAW,'lab-ask.jsonl'))){ const d=BY[r.id]; if(!d){ bad.push('lab id '+r.id); continue; } add('labask17',M(d.ask.system,trim1800(d.ask.prompt.replace('@@Q@@',r.q)),r.out)); }
for(const r of jl(path.join(RAW,'lab-draft.jsonl'))){ const d=BY[r.id]; if(!d||!d.draft){ bad.push('lab id '+r.id); continue; } add('labdraft17',M(d.draft.system,trim1800(d.draft.prompt),r.out)); }
/* Lab: 값 바꾸기 — the answer is computed from the parameter line (clamped like LAB.applySet) */
const parseParams=p=>p.split('Parameters:\n')[1].split('\n\nStudent')[0].split('\n').map(l=>{ let m;
  if((m=/^- (\w+): (.*?), true or false, now (true|false)$/.exec(l))) return {id:m[1],label:m[2],type:'check',now:m[3]==='true'};
  if((m=/^- (\w+): (.*?), one of (.*), now (.*)$/.exec(l))){ const opts=[...m[3].matchAll(/("(?:[^"\\]|\\.)*"|-?[\d.]+)=([^|]*?)(?= \| ("|-?\d)|$)/g)].map(o=>({v:JSON.parse(o[1]),l:o[2].trim()})); return opts.length?{id:m[1],label:m[2],type:'seg',opts,now:JSON.parse(m[4])}:null; }
  if((m=/^- (\w+): (.*?), min (-?[\d.e+-]+), max (-?[\d.e+-]+), now (-?[\d.e+-]+)$/.exec(l))) return {id:m[1],label:m[2],type:'num',min:+m[3],max:+m[4],now:+m[5]};
  return null; }).filter(Boolean);
const clean=s=>s.replace(/\s*\([^)]*\)/g,'').replace(/\s+/g,' ').trim();
const num=v=>+(+v).toPrecision(6);
const fix=(q,v)=>{ v=Math.min(q.max,Math.max(q.min,v)); if(Number.isInteger(q.min)&&Number.isInteger(q.max)&&Number.isInteger(q.now)) return Math.round(v); const span=q.max-q.min, dec=span>=100?0:span>=10?1:span>=1?2:3; return num(+v.toFixed(Math.max(dec,String(q.now).includes('.')?String(q.now).split('.')[1].length:0))); };
const SETQ={ double:['{L} 값을 두 배로 해 줘','{L} 두 배로','{L}을(를) 2배로 늘려 줘'], half:['{L} 값을 절반으로 줄여 줘','{L} 반으로','{L} 절반만 해 줘'], max:['{L} 최대로 해 줘','{L} 가장 크게','{L} 최댓값으로'], min:['{L} 최소로 해 줘','{L} 가장 작게','{L} 최솟값으로'],
  up10:['{L} 10% 늘려 줘','{L} 조금(10%) 키워 줘'], down10:['{L} 10% 줄여 줘','{L} 조금(10%) 낮춰 줘'], to:['{L} {V}(으)로 바꿔 줘','{L} 값을 {V}로 맞춰 줘','{L} = {V}','{L}을(를) {V}(으)로 해 줘'], plus:['{L} {D} 더 키워 줘','{L}을(를) {D}만큼 늘려 줘'], minus:['{L} {D} 줄여 줘','{L}을(를) {D}만큼 낮춰 줘'] };
const fill=(t,L,V,D)=>t.replace('{L}',L).replace('{V}',V).replace('{D}',D);
const ids=shuffle(DUMP.map(x=>x.id)); let nset=0;
for(const id of ids){ if(nset>=140) break; const d=BY[id]; const ps=parseParams(d.set.prompt); if(!ps.length) continue; let made=0;
  for(let tries=0;tries<2&&made<1;tries++){ const q=pick(ps); let ask,set;
    if(q.type==='num'){ const kind=pick(['double','half','max','min','up10','down10','to','to','plus','minus']), L=clean(q.label); let v;
      if(kind==='double') v=q.now*2; else if(kind==='half') v=q.now/2; else if(kind==='max') v=q.max; else if(kind==='min') v=q.min; else if(kind==='up10') v=q.now*1.1; else if(kind==='down10') v=q.now*0.9;
      else if(kind==='to'){ v=q.min+(q.max-q.min)*pick([0.1,0.25,0.4,0.5,0.6,0.75,0.9]); const dec=q.max-q.min>=100?0:q.max-q.min>=10?1:2; v=+v.toFixed(dec); }
      else { const step=num((q.max-q.min)*pick([0.05,0.1,0.2])), dd=+step.toPrecision(2); v=kind==='plus'?q.now+dd:q.now-dd; const val=fix(q,v); if(kind==='plus'||kind==='minus'){ ask=fill(pick(SETQ[kind]),L,'',String(dd)); set={[q.id]:val}; } }
      if(!ask){ const val=fix(q,v); if(val===q.now&&!(kind==='max'||kind==='min')) continue; ask=fill(pick(SETQ[kind]),L,String(kind==='to'?val:''),''); set={[q.id]:val}; } }
    else if(q.type==='check'){ const on=!q.now; const L=clean(q.label).replace(/ 보이기$| 켜기$/,''); ask=pick(on?['{L} 보이게 해 줘','{L} 켜 줘','{L} 표시해 줘']:['{L} 숨겨 줘','{L} 꺼 줘','{L} 안 보이게 해 줘']).replace('{L}',L); set={[q.id]:on}; }
    else { const o=pick(q.opts.filter(o=>o.v!==q.now)); if(!o) continue; ask=pick(['{L} 값을 "{O}"(으)로 바꿔 줘','"{O}" 로 해 줘','{L}: {O}']).replace('{L}',clean(q.label)).replace('{O}',clean(o.l)||o.l); set={[q.id]:o.v}; }
    add('labset17',M(P.labSetSys,d.set.prompt.replace('@@Q@@',ask),JSON.stringify({set}))); made++; nset++; } }
/* Lab: 실험 찾기 — a list of 12 (the target and 11 others), the answer is the target id */
const base=n=>n.replace(/\s*\([^)]*\)/g,'').replace(/\s+/g,' ').trim();
let nfind=0; for(const id of shuffle(DUMP.map(x=>x.id))){ if(nfind>=110) break; const d=BY[id], name=base(d.name); if(name.length<2) continue;
  const q=pick([()=>name+' 보고 싶어', ()=>name+' 실험 열어 줘', ()=>name+' 찾아 줘', ()=>name+' 하고 싶어요', ()=>d.desc.slice(0,18)+' 실험 열어 줘', ()=>name+' 하는 걸로 바꿔 줘', ()=>'"'+name+'" 보여 줘', ()=>name+' 어디 있어요?'])();
  const others=shuffle(DUMP.filter(x=>x.id!==id)).slice(0,11), list=shuffle([d,...others]);
  const lines=list.map(e=>e.id+' | '+e.name+' | '+e.desc.slice(0,40)).join('\n');
  add('labfind17',M(P.labFindSys,P.labFindPrompt(lines,q),JSON.stringify({id,set:{}}))); nfind++; }
const out=shuffle(rows);
fs.writeFileSync(path.join(OUT,'v17-new.jsonl'),out.map(r=>JSON.stringify(r)).join('\n')+'\n');
const cnt={}; out.forEach(r=>cnt[r.task]=(cnt[r.task]||0)+1);
console.log(JSON.stringify(cnt),'rows',out.length,'bad',bad.length?bad.slice(0,5):0);
