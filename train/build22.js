// 2.2 tarius mix: all of v21a-basic + a seeded, per-task proportional sample of v22-extra + all v22-code.
// node train/build22.js  ->  data/v22-basic.jsonl (about 28k rows, one Kaggle session)
const fs=require('fs'),path=require('path');
const D=path.join(__dirname,'data');
const rd=f=>fs.readFileSync(path.join(D,f),'utf8').split('\n').filter(Boolean);
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const R=rng(2202);
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const EXTRA=13000;
const old=rd('v21a-basic.jsonl'),code=rd('v22-code.jsonl'),ex=rd('v22-extra.jsonl');
const by={};for(const l of ex){(by[JSON.parse(l).task]=by[JSON.parse(l).task]||[]).push(l)}
let pick=[];const stats={};
for(const [t,a] of Object.entries(by)){const n=Math.round(EXTRA*a.length/ex.length);pick.push(...shuf(a.slice()).slice(0,n));stats[t]=n}
const all=shuf([...old,...pick,...code]);
fs.writeFileSync(path.join(D,'v22-basic.jsonl'),all.join('\n')+'\n');
fs.writeFileSync(path.join(D,'v22-basic-stats.json'),JSON.stringify({total:all.length,old:old.length,extra:pick.length,code:code.length,extraByTask:stats},null,1));
console.log(all.length,'rows',stats);
