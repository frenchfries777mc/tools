// 2.2 mix (tarius = basic, default; lectus = `node train/build22.js smart`; premus = `node train/build22.js premus`): all of v21a-basic + a seeded, per-task proportional sample of v22-extra + all v22-code.
// node train/build22.js  ->  data/v22-basic.jsonl (about 28k rows, one Kaggle session)
// premus (Qwen3 8B, about 2x slower than lectus) gets the same mix scaled to 4,000 rows, built from the lectus files with the same seed, so its rows are a subset of v22-smart.jsonl.
const fs=require('fs'),path=require('path');
const D=path.join(__dirname,'data');
const rd=f=>fs.readFileSync(path.join(D,f),'utf8').split('\n').filter(Boolean);
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const R=rng(2202);
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const PREMUS=process.argv[2]==='premus', SMART=process.argv[2]==='smart'||PREMUS, MODEL=PREMUS?'premus':SMART?'smart':'basic', SRC=SMART?'smart':'basic';
const EXTRA=PREMUS?1650:SMART?3700:13000, OLDN=PREMUS?1800:SMART?4000:1e9, CODEN=PREMUS?550:SMART?1300:1e9;   // lectus is ~2.5x slower than tarius: about 9,000 rows fit one Kaggle session
const cut=(a,n)=>SMART?shuf(a.slice()).slice(0,n):a;   // tarius keeps every row (and its original random order)
const old=cut(rd('v21a-'+SRC+'.jsonl'),OLDN),code=cut(rd('v22-code.jsonl'),CODEN),ex=rd('v22-extra.jsonl');
const by={};for(const l of ex){(by[JSON.parse(l).task]=by[JSON.parse(l).task]||[]).push(l)}
let pick=[];const stats={};
for(const [t,a] of Object.entries(by)){const n=Math.round(EXTRA*a.length/ex.length);pick.push(...shuf(a.slice()).slice(0,n));stats[t]=n}
const all=shuf([...old,...pick,...code]);
fs.writeFileSync(path.join(D,'v22-'+MODEL+'.jsonl'),all.join('\n')+'\n');
fs.writeFileSync(path.join(D,'v22-'+MODEL+'-stats.json'),JSON.stringify({total:all.length,old:old.length,extra:pick.length,code:code.length,extraByTask:stats},null,1));
console.log(all.length,'rows',stats);
