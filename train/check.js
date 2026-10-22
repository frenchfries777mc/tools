#!/usr/bin/env node
/* Checks raw training items and turns them into chat examples that use the exact prompts in ../ai-prompts.js.
   node train/check.js <task> <raw.jsonl> [--out ok.jsonl]
   tasks: code | und  (Block HTML: {"q","cur"?,"plan","xml"})
          tr          (translation via =AI: {"instr","text","answer"})
          formula     ({"table":[[...]],"at"?:"A1","cell":"E2","q","formula","explain","expect"?})
          table       ({"q","rows":[[...]]})
          graph       ({"table":[[...]],"at"?:"A1","q","answer":{"type","range","series","title"}})
          ask         ({"table"?:[[...]],"at"?,"q","answer","claims"?:[{"fn":"max|min|sum|avg|median|count","col":"C","value":95,"label"?,"where"?,"digits"?}],"general"?,"expect"?})
          slides      ({"kind":"deck","topic","aud"?,"n","outline":{...},"fills":[{"slides":[...]}]} -> outline + fill examples,
                       {"kind":"act","deck","n","i","task":"rewrite|shorter|longer","slide","answer"}, {"kind":"add","deck","titles":[...],"i","q","answer"})
   self        (ask format, about the model itself; answers may use {NAME} {BASE} {LATIN} {MEANING_KO} {MEANING_EN})
   ask: numbers in a table answer must follow from the table (unless "general"), claims are recomputed; near-copies of the question fail.
   slides: answers are read with the site's own norm()/readAll() from slides/ai-slides.js; deck prompts are rebuilt the way genLocal() builds them.
   Block items are loaded in the real editor (headless Chromium): unknown blocks, broken names and preview errors fail.
   Prints one line per failing item and a summary (a slides deck item gives several examples); --out writes the passing items as {"task","messages":[...]}. */
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
const P=require(path.join(ROOT,'ai-prompts.js'));
const E=require(path.join(ROOT,'sheet','engine.js'));

const [task,file]=process.argv.slice(2); const oi=process.argv.indexOf('--out'), outFile=oi>0?process.argv[oi+1]:null;
if(!task||!file){ console.error('usage: node train/check.js <code|und|tr|formula|table|graph|ask|self|slides> <raw.jsonl> [--out ok.jsonl]'); process.exit(2); }
const lines=fs.readFileSync(file,'utf8').split('\n').map(s=>s.trim()).filter(Boolean);
const items=[], bad=[];
lines.forEach((l,i)=>{ try{ items.push({n:i+1,o:JSON.parse(l)}); }catch(e){ bad.push([i+1,'JSON: '+e.message]); } });
const msg=(sys,user,asst)=>[{role:'system',content:sys},{role:'user',content:user},{role:'assistant',content:asst}];
const HANGUL=/[가-힣]/;

/* ---------- sheet helpers: the table text exactly as sheet/ai-sheet.js tableText() shows it ---------- */
function sheetOf(table,at){
  const a=E.parseAddr(at||'A1'); if(!a) throw new Error('bad at');
  const cells={};
  table.forEach((row,r)=>row.forEach((v,c)=>{ if(v===null||v===undefined||v==='') return; cells[E.K(a.r+r,a.c+c)]={v:String(v)}; }));
  const doc={sheets:[{name:'Sheet1',cells,cw:{},rows:200,cols:40,cfs:[],charts:[]}],active:0};
  return {doc, eng:new E.Engine(doc), g:{r1:a.r,c1:a.c,r2:a.r+table.length-1,c2:a.c+Math.max(...table.map(r=>r.length))-1}};
}
function tableText(s){
  const g=s.g, lines=['\t'+Array.from({length:g.c2-g.c1+1},(_,j)=>E.colName(g.c1+j)).join('\t')];
  for(let r=g.r1;r<=g.r2;r++){ const row=[r+1]; for(let c=g.c1;c<=g.c2;c++){ const v=s.eng.value(0,r,c); row.push(E.isErr(v)?String(v):E.formatValue(v)); } lines.push(row.join('\t')); }
  return lines.join('\n');
}
function rect(t){ if(!Array.isArray(t)||t.length<2||!t.every(Array.isArray)) throw new Error('table must be rows'); return t; }

const checks={
  tr(o){
    if(!o.instr||!o.text||!o.answer) throw new Error('needs instr, text, answer');
    const ans=String(o.answer).trim();
    if(/\n/.test(ans)&&!/\n/.test(o.text)) throw new Error('answer has extra lines');
    if(/^["'“]|["'”]$/.test(ans)) throw new Error('answer is quoted');
    if(/(영어|English|英語|inglés|anglais|Englisch)/i.test(o.instr)&&HANGUL.test(ans)) throw new Error('English answer contains Hangul');
    if(/(한국어|Korean|韓国語|coreano|coréen|Koreanisch)/i.test(o.instr)&&!HANGUL.test(ans)) throw new Error('Korean answer without Hangul');
    return msg(P.cellSys,P.cellPrompt(o.instr,[String(o.text)]),ans);
  },
  table(o){
    if(!o.q) throw new Error('needs q'); const rows=rect(o.rows);
    if(rows.length>61||rows[0].length>12) throw new Error('too big');
    const w=rows[0].length; rows.forEach((r,i)=>{ if(r.length!==w) throw new Error('row '+i+' has '+r.length+' cells, header has '+w); });
    rows.slice(1).forEach(r=>r.forEach(v=>{ if(typeof v==='string'&&/^\d[\d,]*(\.\d+)?\s*(명|개|원|km|cm|kg|점|%)$/.test(v.trim())) throw new Error('unit inside a number cell: '+v); }));
    return msg(P.tableSys,P.tablePrompt(o.q),JSON.stringify({rows}));
  },
  formula(o){
    if(o.cant){ // a request no formula can do: empty formula plus a short honest explanation
      if(!o.q||!o.cell||!o.explain||o.formula) throw new Error('cant needs q, cell, explain and no formula');
      const s0=sheetOf(rect(o.table),o.at);
      return msg(P.formulaSys,P.formulaPrompt(tableText(s0),o.cell,o.q),JSON.stringify({formula:'',explain:String(o.explain)}));
    }
    if(!o.q||!o.cell||!o.formula) throw new Error('needs q, cell, formula');
    const s=sheetOf(rect(o.table),o.at), f=String(o.formula).trim(); if(f[0]!=='=') throw new Error('formula must start with =');
    try{ E.parse(f.slice(1)); }catch(e){ throw new Error('formula does not parse: '+f); }
    const c=E.parseAddr(o.cell); if(!c) throw new Error('bad cell');
    if(c.r>=s.g.r1&&c.r<=s.g.r2&&c.c>=s.g.c1&&c.c<=s.g.c2&&s.doc.sheets[0].cells[E.K(c.r,c.c)]) throw new Error('target cell is inside the table data');
    if(o.noeval){ if(!/^=AI\(/.test(f)) throw new Error('noeval only for =AI(...) formulas'); return msg(P.formulaSys,P.formulaPrompt(tableText(s),o.cell,o.q),JSON.stringify({formula:f,explain:String(o.explain||'')})); }
    s.doc.sheets[0].cells[E.K(c.r,c.c)]={v:f}; s.eng.reset(); const v=s.eng.value(0,c.r,c.c);
    if(E.isErr(v)) throw new Error('formula gives '+String(v.e||v)+': '+f);
    if(o.expect!==undefined&&o.expect!==null){ const ok=typeof o.expect==='number'?typeof v==='number'&&Math.abs(v-o.expect)<1e-6*Math.max(1,Math.abs(o.expect)):String(v)===String(o.expect);
      if(!ok) throw new Error('formula gives '+JSON.stringify(v)+', expected '+JSON.stringify(o.expect)+': '+f); }
    return msg(P.formulaSys,P.formulaPrompt(tableText(s),o.cell,o.q),JSON.stringify({formula:f,explain:String(o.explain||'')}));
  },
  graph(o){
    if(!o.q||!o.answer) throw new Error('needs q, answer');
    const s=sheetOf(rect(o.table),o.at), a=o.answer;
    if(P.graphTypes.indexOf(a.type)<0) throw new Error('bad type '+a.type);
    const rg=E.parseRange(a.range); if(!rg||rg.r2<=rg.r1) throw new Error('bad range '+a.range);
    if(rg.r1<s.g.r1||rg.c1<s.g.c1||rg.r2>s.g.r2||rg.c2>s.g.c2) throw new Error('range '+a.range+' outside the table '+E.rangeStr(s.g));
    if(!Array.isArray(a.series)||!a.series.length) throw new Error('needs series');
    a.series.forEach(L=>{ const c=E.colIdx(L); if(!/^[A-Z]{1,2}$/.test(L)||c<rg.c1||c>rg.c2) throw new Error('series '+L+' outside range');
      let n=0; for(let r=rg.r1+1;r<=rg.r2;r++) if(typeof s.eng.value(0,r,c)==='number') n++; if(!n) throw new Error('series '+L+' has no numbers'); });
    if(a.type==='pie'&&a.series.length!==1) throw new Error('pie needs one series');
    if(a.type==='scatter'&&a.series.length<2) throw new Error('scatter needs x and y');
    if(a.type==='scatter'&&a.series.some((L,i)=>i&&E.colIdx(L)<=E.colIdx(a.series[i-1]))) throw new Error('scatter series must go left to right (the sheet uses the leftmost as x)');
    if(a.type!=='scatter'){ let t=0,n=0; for(let r=rg.r1+1;r<=rg.r2;r++){ const v=s.eng.value(0,r,rg.c1); if(typeof v==='string'&&v!=='') t++; else if(typeof v==='number') n++; }
      if(!(t>0&&t>=n)) throw new Error('label column '+E.colName(rg.c1)+' must hold text (e.g. "2019년", not 2019)'); }
    if(!a.title) throw new Error('needs title');
    return msg(P.graphSys,P.graphPrompt(tableText(s),o.q),JSON.stringify({type:a.type,range:a.range,series:a.series,title:a.title}));
  }
};

/* ---------- ask: Fry Sheet "질문·요약" tab ---------- */
const KANA=/[\u3040-\u30ff]/, numRx=/-?\d[\d,]*(?:\.\d+)?/g;
const toNum=x=>Number(String(x).replace(/,/g,''));
function bigrams(t){ t=String(t).toLowerCase().replace(/[\s.,!?~…'"“”‘’。、！？]+/g,''); const m=new Map(); for(let i=0;i<t.length-1;i++){ const k=t.slice(i,i+2); m.set(k,(m.get(k)||0)+1); } return [m,Math.max(0,t.length-1)]; }
function novelty(q,a){ const [mq]=bigrams(q), [ma,na]=bigrams(a); if(!na) return 0; let n=0; ma.forEach((v,k)=>{ n+=Math.min(v,mq.get(k)||0); }); return 1-n/na; } // share of the answer that is not the question
function dice(a,b){ const [ma,na]=bigrams(a), [mb,nb]=bigrams(b); if(!na||!nb) return a.trim()===b.trim()?1:0; let n=0; ma.forEach((v,k)=>{ n+=Math.min(v,mb.get(k)||0); }); return 2*n/(na+nb); }
/* the numbers a correct answer about this table can state: the table's own numbers and what follows from them */
function explainable(s,table){
  const ok=new Set(), add=v=>{ if(!isFinite(v)) return; [0,1,2].forEach(d=>ok.add(+(+v).toFixed(d))); ok.add(Math.abs(+(+v).toFixed(2))); ok.add(Math.floor(v)); ok.add(Math.ceil(v)); };
  const g=s.g, rows=g.r2-g.r1, cols=[], rowsV=[];
  for(let i=0;i<=rows+1;i++) add(i); for(let i=0;i<=12;i++) add(i); add(100);
  for(let r=g.r1;r<=g.r2;r++){ const rv=[]; for(let c=g.c1;c<=g.c2;c++){ const v=s.eng.value(0,r,c); if(typeof v==='number'){ add(v); rv.push(v); (cols[c-g.c1]=cols[c-g.c1]||[]).push(v); } else String(v).replace(numRx,m=>{ add(toNum(m)); return m; }); add(r+1); } rowsV.push(rv); }
  const group=a=>{ if(!a||!a.length) return; const sum=a.reduce((x,y)=>x+y,0), srt=a.slice().sort((x,y)=>x-y), n=a.length;
    add(sum); add(sum/n); add(srt[0]); add(srt[n-1]); add(srt[n-1]-srt[0]); if(n>1){ add((a[n-1]-a[0])/(n-1)); add((a[n-1]-a[0])/a[0]*100); } add(n%2?srt[(n-1)/2]:(srt[n/2-1]+srt[n/2])/2);
    for(let i=0;i<n;i++){ if(sum) add(a[i]/sum*100); for(let j=0;j<n;j++) if(i!==j){ add(Math.abs(a[i]-a[j])); add(a[i]+a[j]); add(a[i]*a[j]); if(a[j]){ add(a[i]/a[j]); add(a[i]/a[j]*100); add((a[i]-a[j])/a[j]*100); add(Math.abs(a[i]-a[j])/a[j]*100); } } }
    for(let k=2;k<n;k++){ const pre=a.slice(0,k), suf=a.slice(n-k); add(pre.reduce((x,y)=>x+y,0)); add(suf.reduce((x,y)=>x+y,0)); add(pre.reduce((x,y)=>x+y,0)/k); add(suf.reduce((x,y)=>x+y,0)/k); }
    let sumT=0; cols.forEach(c=>{ if(c) sumT+=c.reduce((x,y)=>x+y,0); }); };
  cols.forEach(group); rowsV.forEach(group);
  for(let i=0;i<cols.length;i++) for(let j=i+1;j<cols.length;j++) if(cols[i]&&cols[j]&&cols[i].length===cols[j].length) add(cols[i].reduce((x,v,k)=>x+v*cols[j][k],0)); // e.g. price x units
  const tot=cols.filter(Boolean).reduce((x,c)=>x+c.reduce((p,q)=>p+q,0),0); add(tot); cols.forEach(c=>{ if(c&&tot) add(c.reduce((p,q)=>p+q,0)/tot*100); });
  const sums=cols.filter(Boolean).map(c=>c.reduce((p,q)=>p+q,0)); sums.forEach(x=>sums.forEach(y=>{ add(Math.abs(x-y)); if(y){ add((x-y)/y*100); add(x/y*100); add(x/y); } }));
  const avgs=cols.filter(Boolean).map(c=>c.reduce((p,q)=>p+q,0)/c.length); avgs.forEach(x=>avgs.forEach(y=>add(Math.abs(x-y))));
  return ok;
}
function colVals(s,L,where){
  const c=E.colIdx(L), g=s.g, out=[];
  if(c<g.c1||c>g.c2) throw new Error('claim column '+L+' outside the table');
  for(let r=g.r1+1;r<=g.r2;r++){ const v=s.eng.value(0,r,c);
    if(where){ const w=s.eng.value(0,r,E.colIdx(where.col)), x=where.v, op=where.op||'=';
      const pass=op==='='?String(w)===String(x):op==='!='?String(w)!==String(x):typeof w!=='number'?false:op==='>'?w>x:op==='>='?w>=x:op==='<'?w<x:op==='<='?w<=x:false; if(!pass) continue; }
    out.push({r,v,label:String(s.eng.value(0,r,g.c1))}); }
  return out;
}
function claim(s,cl,ans){
  const vals=colVals(s,cl.col,cl.where), nums=vals.filter(x=>typeof x.v==='number');
  let v, labels=null;
  if(cl.fn==='count') v=cl.where?vals.length:nums.length;
  else { if(!nums.length) throw new Error('claim '+cl.fn+' '+cl.col+': no numbers');
    const a=nums.map(x=>x.v), sum=a.reduce((x,y)=>x+y,0), srt=a.slice().sort((x,y)=>x-y), n=a.length;
    if(cl.fn==='sum') v=sum; else if(cl.fn==='avg') v=sum/n; else if(cl.fn==='median') v=n%2?srt[(n-1)/2]:(srt[n/2-1]+srt[n/2])/2;
    else if(cl.fn==='max'||cl.fn==='min'){ v=cl.fn==='max'?srt[n-1]:srt[0]; labels=nums.filter(x=>x.v===v).map(x=>x.label); }
    else throw new Error('unknown claim fn '+cl.fn); }
  const d=cl.digits!=null?cl.digits:(Number.isInteger(cl.value)?(Number.isInteger(v)?0:null):String(cl.value).split('.')[1].length);
  const got=d==null?v:+v.toFixed(d);
  if(Math.abs(got-cl.value)>1e-9) throw new Error('claim '+cl.fn+'('+cl.col+(cl.where?' where '+JSON.stringify(cl.where):'')+') is '+v+', item says '+cl.value);
  const flat=ans.replace(/(\d),(?=\d{3})/g,'$1');
  if(!new RegExp('(^|[^\\d.])'+String(cl.value).replace('.','\\.')+'(?![\\d]|\\.\\d)').test(flat)) throw new Error('answer does not state '+cl.value+' ('+cl.fn+' '+cl.col+')');
  if(labels&&cl.label!==undefined){ if(labels.indexOf(String(cl.label))<0) throw new Error(cl.fn+' of '+cl.col+' belongs to '+labels.join('/')+', not '+cl.label); if(ans.toLowerCase().indexOf(String(cl.label).toLowerCase())<0) throw new Error('answer does not name '+cl.label); }
}
checks.ask=function(o){
  if(!o.q||!o.answer) throw new Error('needs q, answer');
  const q=String(o.q).trim(), ans=String(o.answer).trim();
  if(/```|\*\*|^#{1,6}\s|^\s*\|.*\|\s*$/m.test(ans)) throw new Error('markdown in answer');
  if(ans.length>1100) throw new Error('answer too long ('+ans.length+' chars)');
  const sentences=(ans.match(/[.!?。！？](\s|$)|[다요죠까네](\.|!|\?)?\n/g)||[]).length; if(sentences>12) throw new Error('too many sentences ('+sentences+')');
  const sim=dice(q,ans), nov=novelty(q,ans); if(sim>0.75||nov<0.4||(q.length>=6&&ans.indexOf(q)>=0&&ans.length<q.length*2.5)) throw new Error('answer is a near-copy of the question (similarity '+sim.toFixed(2)+', new '+nov.toFixed(2)+')');
  if(ans.length<Math.min(8,q.length)) throw new Error('answer too short');
  if(HANGUL.test(q)&&!o.lang&&!HANGUL.test(ans)) throw new Error('Korean question, answer without Hangul');
  if(KANA.test(q)&&!HANGUL.test(q)&&!o.lang&&!KANA.test(ans)) throw new Error('Japanese question, answer without kana');
  const own=o.table?[].concat(...o.table).map(String).filter(x=>x.length).sort((a,b)=>b.length-a.length):[]; // names from the table may stay as written
  const bare=own.reduce((t,x)=>t.split(x).join(' '),ans);
  if(!HANGUL.test(q)&&!KANA.test(q)&&!/[\u4e00-\u9fff]/.test(q)&&!o.lang&&(HANGUL.test(bare)||KANA.test(bare))) throw new Error('Latin-script question, answer in Hangul/kana');
  let text=null;
  if(o.table){ const s=sheetOf(rect(o.table),o.at); text=tableText(s);
    (o.claims||[]).forEach(cl=>claim(s,cl,ans));
    if(!o.general){ const ok=explainable(s,o.table), qn=(q.match(numRx)||[]).map(toNum), cl=(o.claims||[]).map(c=>c.value).concat(o.extra||[]); // extra: numbers the item vouches for (a scale like "of 20", 340 min = 5 h 40 min)
      const flat=ans.replace(/(\d),(?=\d{3})/g,'$1').replace(/\d+(?:번째|등|위|째|st|nd|rd|th|위)/g,'');
      (flat.match(/-?\d+(?:\.\d+)?/g)||[]).forEach(m=>{ const x=Math.abs(+m); if(ok.has(x)||ok.has(-x)||qn.indexOf(x)>=0||cl.indexOf(x)>=0) return; throw new Error('number '+m+' in the answer does not follow from the table'); }); } }
  else if(o.claims&&o.claims.length) throw new Error('claims need a table');
  if(o.expect!==undefined){ const flat=ans.replace(/(\d),(?=\d{3})/g,'$1'); if(flat.indexOf(String(o.expect))<0) throw new Error('answer does not contain the expected '+o.expect); }
  return msg(P.askSys,P.askPrompt(text,q),ans);
};

/* ---------- slides: Fry Slides with the built-in AI (outline, 3 slides per request, one-slide actions) ---------- */
let SL=null;
function slidesSite(){ // the site's own reader (slides/ai-slides.js norm/readAll) and layouts (slides/app.js LAY)
  if(SL) return SL; const vm=require('vm');
  const app=fs.readFileSync(path.join(ROOT,'slides','app.js'),'utf8'), a=app.indexOf('var HEAD='), b=app.indexOf('var LISTS=');
  const box=vm.createContext({}); vm.runInContext(app.slice(a,b)+';this.LAY=LAY;this.LAYS=LAYS;',box);
  const aijs=fs.readFileSync(path.join(ROOT,'ai.js'),'utf8'), pj=/function parseJSON\(t\)\{[\s\S]*?\n\}/.exec(aijs)[0];
  const NOOP=new Set(['addEventListener','insertBefore','appendChild','setAttribute','removeAttribute','remove','focus','click','blur']);   // ai-slides.js touches the page while loading: every element is a do-nothing stub
  const el=()=>new Proxy({},{get:(t,k)=>k in t?t[k]:k==='querySelector'||k==='closest'?()=>el():k==='querySelectorAll'?()=>[]:k==='dataset'||k==='style'?(t[k]={}):k==='classList'?{add(){},remove(){},toggle(){},contains:()=>false}:NOOP.has(k)?()=>{}:undefined,set:(t,k,v)=>{ t[k]=v; return true; }});
  const ctx=vm.createContext({window:{addEventListener(){},FSL:{LAYS:box.LAYS,LAY:box.LAY}},FFT:{T:x=>x,F:x=>x},document:{getElementById:el,querySelector:el,querySelectorAll:()=>[],addEventListener(){},createElement:el,body:el()},FFP:P,console});
  vm.runInContext(pj+';FFAI={parseJSON:parseJSON,isLocal:function(){return true;}};',ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'slides','ai-slides.js'),'utf8'),ctx);
  const LISTS=['bullets','left','right'], TEXTS=['title','subtitle','leftTitle','rightTitle','stat','caption','quote','by','notes'];
  const fix=s=>{ s=Object.assign({},s); if(box.LAYS.indexOf(s.layout)<0) s.layout='bullets'; LISTS.forEach(k=>{ s[k]=Array.isArray(s[k])?s[k].map(x=>String(x==null?'':x)).filter(x=>x.trim()):[]; }); TEXTS.forEach(k=>{ s[k]=s[k]==null?'':String(s[k]); }); return s; };
  const W=ctx.window.FSLAI, fields=L=>(box.LAY[L]||[]).map(b=>b.f);
  const hasText=s=>!!(s.title||s.subtitle||s.bullets.length||s.left.length||s.right.length||s.stat||s.quote);
  SL={norm:W.norm, readAll:W.readAll, LAYS:box.LAYS, fields, fix, hasText};
  return SL;
}
const tok=t=>{ const a=(t.match(/[\x00-\x7f]/g)||[]).length; return a/3.3+(t.length-a); }; // same rough count as build.js
const sentN=t=>(String(t).match(/[.!?。！？](\s|$)/g)||[]).length||(t?1:0);
/* one slide object the AI wrote: the layout's fields only, sensible sizes; returns the site's normalized slide */
function slideOk(raw,lay,where,o){
  const S=slidesSite(); o=o||{};
  if(!raw||typeof raw!=='object'||Array.isArray(raw)) throw new Error(where+': not an object');
  if(S.LAYS.indexOf(raw.layout)<0) throw new Error(where+': bad layout '+raw.layout);
  if(lay&&raw.layout!==lay) throw new Error(where+': layout '+raw.layout+', planned '+lay);
  const allow=S.fields(raw.layout).concat(['layout','notes']);
  Object.keys(raw).forEach(k=>{ if(allow.indexOf(k)<0) throw new Error(where+': field '+k+' is not used by layout '+raw.layout); });
  S.fields(raw.layout).forEach(f=>{ if(raw[f]===undefined&&!(f==='title'&&raw.layout==='quote')) throw new Error(where+': '+raw.layout+' needs '+f); });
  Object.keys(raw).forEach(k=>{ const v=raw[k]; if(['bullets','left','right'].indexOf(k)>=0){ if(!Array.isArray(v)||!v.every(x=>typeof x==='string'&&x.trim())) throw new Error(where+': '+k+' must be a list of strings');
      v.forEach(x=>{ if(x.length>(HANGUL.test(x)?60:95)) throw new Error(where+': long bullet: '+x); if(/^\s*([-*•·]|\d+[.)])\s/.test(x)) throw new Error(where+': bullet mark inside text: '+x); }); }
    else if(typeof v!=='string'||!v.trim()) throw new Error(where+': '+k+' must be text'); });
  const [lo,hi]=o.bullets||[3,5], L=raw.layout;
  if(L==='bullets'&&(raw.bullets.length<lo||raw.bullets.length>hi)) throw new Error(where+': '+raw.bullets.length+' bullets (want '+lo+'-'+hi+')');
  if(L==='two'&&(raw.left.length<2||raw.right.length<2||raw.left.length>Math.max(4,hi)||raw.right.length>Math.max(4,hi))) throw new Error(where+': two needs 2-4 items per side');
  if(L==='stat'&&raw.stat.length>16) throw new Error(where+': stat should be one short number');
  if(raw.title&&raw.title.length>60) throw new Error(where+': title too long');
  if(!o.noNotes&&!raw.notes) throw new Error(where+': needs notes');
  if(raw.notes&&sentN(raw.notes)>(o.maxNotes||3)) throw new Error(where+': notes have '+sentN(raw.notes)+' sentences');
  const s=S.norm(raw,lay||'bullets'); if(s.layout!==raw.layout) throw new Error(where+': the site reads layout '+raw.layout+' as '+s.layout);
  if(!S.hasText(s)) throw new Error(where+': empty slide');
  return s;
}
const size=s=>['title','subtitle','leftTitle','rightTitle','stat','caption','quote','by'].reduce((n,k)=>n+(s[k]||'').length,0)+['bullets','left','right'].reduce((n,k)=>n+(s[k]||[]).join('').length,0);
const items0=(s)=>s.bullets.length+s.left.length+s.right.length;
function slidesItem(o){
  const S=slidesSite(), J=x=>JSON.stringify(x), out=[];
  const lang=t=>HANGUL.test(t)?'ko':'other', limit=(m,max,where)=>{ const t=tok(m[2].content); if(t>max) throw new Error(where+': answer ~'+Math.round(t)+' tokens, the site allows '+max);
    const all=m.reduce((n,x)=>n+tok(x.content)+6,0); if(all>3500) throw new Error(where+': example ~'+Math.round(all)+' tokens'); return m; };
  const sameLang=(t,want,where)=>{ if(want==='ko'&&!HANGUL.test(t)) throw new Error(where+': Korean deck, text without Hangul: '+t.slice(0,60)); if(want!=='ko'&&HANGUL.test(t)) throw new Error(where+': non-Korean deck, text with Hangul'); };
  if(o.kind==='deck'){
    if(!o.topic||!o.n||!o.outline) throw new Error('deck needs topic, n, outline, fills');
    if(o.n<3||o.n>15) throw new Error('n must be 3-15'); const L0=o.lang||lang(o.topic);
    const ol=o.outline; if(!ol.title||!ol.subtitle||!Array.isArray(ol.slides)) throw new Error('outline needs title, subtitle, slides');
    if(ol.slides.length!==o.n) throw new Error('outline has '+ol.slides.length+' slides, asked '+o.n);
    ol.slides.forEach((x,i)=>{ if(Object.keys(x).join()!=='layout,title') throw new Error('outline slide '+(i+1)+': only layout and title'); if(S.LAYS.indexOf(x.layout)<0) throw new Error('outline slide '+(i+1)+': bad layout');
      if(!x.title||x.title.length>40) throw new Error('outline slide '+(i+1)+': title missing or too long'); sameLang(x.title,L0,'outline slide '+(i+1));
      if(i===0&&x.layout!=='title') throw new Error('slide 1 must be title'); if(i===o.n-1&&x.layout!=='closing') throw new Error('last slide must be closing'); if(i&&i<o.n-1&&(x.layout==='title'||x.layout==='closing')) throw new Error('title/closing in the middle'); });
    if(ol.slides.filter(x=>x.layout==='bullets').length<Math.ceil((o.n-2)/2)) throw new Error('outline should be mostly bullets');
    sameLang(ol.title+ol.subtitle,L0,'outline');
    const oa=J(ol), rd=S.readAll(oa); if(rd.slides.length!==o.n||rd.title!==ol.title) throw new Error('site reads the outline differently');
    out.push(limit(msg(P.slidesOutlineSys,P.slidesTopic(o),oa),900,'outline'));
    // what the site does next (slides/ai-slides.js genLocal), with the deck named after the outline title
    const name=ol.title.slice(0,120), sub=rd.subtitle||'';
    const d=rd.slides.slice(0,o.n).map(x=>S.fix(S.norm(x,'bullets')));
    if(d[0].layout==='title'&&!d[0].subtitle&&sub) d[0].subtitle=sub;
    const todo=d.map((s,i)=>i).filter(i=>!(d[i].layout==='title'&&d[i].subtitle)), batches=[]; for(let i=0;i<todo.length;i+=3) batches.push(todo.slice(i,i+3));
    const fills=o.fills||[]; if(fills.length>batches.length) throw new Error('more fills than the site asks for ('+batches.length+')');
    if(!fills.length) throw new Error('needs fills');
    fills.forEach((f,b)=>{ const idx=batches[b], where='fill '+(b+1);
      const prompt=P.slidesFillPrompt(name,o.aud,P.slidesTitles(d,undefined,12),P.slidesWant(d,idx));
      if(!f||!Array.isArray(f.slides)||f.slides.length!==idx.length||Object.keys(f).join()!=='slides') throw new Error(where+': needs {"slides":[...]} with '+idx.length+' slides');
      f.slides.forEach((raw,k)=>{ const i=idx[k], old=d[i], w=where+' slide '+(i+1); const s=slideOk(raw,old.layout,w,{bullets:[3,4]});
        if(old.title&&raw.title!==old.title) throw new Error(w+': title "'+raw.title+'" differs from the plan "'+old.title+'"');
        [raw.title,raw.subtitle,raw.caption,(raw.bullets||[]).join(' '),(raw.left||[]).join(' '),raw.notes].filter(Boolean).forEach(t=>sameLang(t,L0,w));
        if(!s.title) s.title=old.title; if(s.layout==='title'&&!s.subtitle) s.subtitle=sub; d[i]=S.fix(s); });
      const fa=J(f); if(S.readAll(fa).slides.length!==idx.length) throw new Error(where+': site reads a different number of slides');
      out.push(limit(msg(P.slidesFillSys,prompt,fa),1800,where)); });
    return out;
  }
  if(o.kind==='act'){
    if(!o.deck||!o.slide||!o.answer||!P.slidesTask[o.task]||!(o.n>o.i&&o.i>=0)) throw new Error('act needs deck, n, i, task, slide, answer');
    const cur=S.fix(S.norm(o.slide,'bullets')), lay=cur.layout; if(lay!==o.slide.layout) throw new Error('slide layout '+o.slide.layout+' reads as '+lay);
    const json=P.slidesSlideJSON(cur,S.fields(lay));
    const s=slideOk(o.answer,lay,'answer',{bullets:o.task==='longer'?[3,6]:o.task==='shorter'?[2,4]:[3,5],maxNotes:o.task==='longer'?5:3,noNotes:!cur.notes});
    const a=size(s), b=size(cur);
    if(o.task==='shorter'&&!(a<b*0.9&&items0(s)<=items0(cur)&&(s.notes||'').length<=Math.max(1,cur.notes.length))) throw new Error('shorter: not shorter ('+a+' vs '+b+')');
    if(o.task==='longer'&&!(a>b*1.15&&(s.notes||'').length>=cur.notes.length)) throw new Error('longer: not more detailed ('+a+' vs '+b+')');
    if(o.task==='rewrite'&&J(o.answer)===json) throw new Error('rewrite: unchanged');
    const L0=o.lang||lang(o.deck+JSON.stringify(o.slide)); [s.title,s.subtitle,s.caption,s.bullets.join(' '),s.left.join(' '),s.quote,s.notes].filter(Boolean).forEach(t=>sameLang(t,L0,'answer'));
    return [limit(msg(P.slidesOneSys(lay),P.slidesActPrompt(o.deck,o.i,o.n,json,o.task),J(o.answer)),1200,'act')];
  }
  if(o.kind==='add'){
    if(!o.deck||!Array.isArray(o.titles)||!o.q||!o.answer||!(o.i>=0&&o.i<o.titles.length)) throw new Error('add needs deck, titles, i, q, answer');
    slideOk(o.answer,null,'answer',{});
    const L0=o.lang||lang(o.q); [o.answer.title,(o.answer.bullets||[]).join(' '),o.answer.notes].filter(Boolean).forEach(t=>sameLang(t,L0,'answer'));
    return [limit(msg(P.slidesOneSys(null),P.slidesAddPrompt(o.deck,P.slidesTitles(o.titles.map(t=>({title:t})),undefined,12),o.i,o.q),J(o.answer)),1200,'add')];
  }
  throw new Error('kind must be deck, act or add');
}

async function blocks(){
  const { chromium }=require('/opt/node22/lib/node_modules/playwright');
  const http=require('http');
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json','.mp3':'audio/mpeg','.wav':'audio/wav','.cur':'image/x-icon'};
  const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p.endsWith('/')) p+='index.html'; const f=path.join(ROOT,p);
    if(!f.startsWith(ROOT)||!fs.existsSync(f)){ r.writeHead(404); return r.end(); } r.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(r); });
  await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const port=srv.address().port;
  const b=await chromium.launch(), pg=await b.newPage();
  await pg.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await pg.goto('http://127.0.0.1:'+port+'/blocks/'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForFunction(()=>window.__bhai&&window.BH);
  const out=[];
  for(const it of items){
    const o=it.o;
    try{
      if(!o.q||!o.xml||!/^(new|edit)$/.test(o.plan||'')) throw new Error('needs q, plan (new|edit), xml');
      if(o.plan==='edit'&&!o.cur) throw new Error('edit needs cur');
      const res=await pg.evaluate(async({xml,cur})=>{
        function norm(x){ // check, load headless, re-export without ids or positions
          window.__bhai.check(x);
          const dom=Blockly.utils.xml.textToDom(x), names=new Set(), hw=new Blockly.Workspace(), rx=/<field name="NAME">([^<]*)<\/field>/g; let m;
          while((m=rx.exec(x))){ names.add(m[1]); BH.KNOWN.add(m[1]); }
          const els=[...x.matchAll(/<field name="EL">([^<]*)<\/field>/g)].map(m=>m[1]).filter(n=>!names.has(n));
          if(els.length) throw new Error('EL points to missing element: '+els.join(', '));
          Blockly.Events.disable(); try{ Blockly.Xml.domToWorkspace(dom,hw); } finally{ Blockly.Events.enable(); BH.KNOWN.clear(); }
          const n=hw.getAllBlocks(false).length;
          let t=Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(hw,true)).replace(/ (x|y)="-?[\d.]+"/g,'').replace(/ id="[^"]*"/g,'').replace(/<variable type="">/g,'<variable>');
          window.__bhai.check(t); // the stripped form must load too
          return {hw,t,n};
        }
        const a=norm(xml), c=cur?norm(cur):null;
        const html=BH.build(a.hw,{trap:true}); a.hw.dispose(); if(c) c.hw.dispose();
        // run the page: load, press every button, type a key, then look for the error banner
        const fr=document.createElement('iframe'); fr.style.cssText='position:fixed;left:0;top:0;width:480px;height:640px'; fr.sandbox='allow-scripts allow-same-origin allow-forms';
        document.body.appendChild(fr);
        const err=await new Promise(res=>{ fr.onload=async()=>{ const w=fr.contentWindow, d=fr.contentDocument; w.alert=w.confirm=()=>true; w.prompt=()=>'5';
            await new Promise(r=>setTimeout(r,250));
            try{ d.querySelectorAll('button').forEach(b=>b.click()); d.querySelectorAll('input').forEach(i=>{ i.value='3'; i.dispatchEvent(new w.Event('input',{bubbles:true})); i.dispatchEvent(new w.Event('change',{bubbles:true})); });
              d.dispatchEvent(new w.KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true})); d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})); }catch(e){}
            await new Promise(r=>setTimeout(r,350)); const e=d.getElementById('__err'); res(e?e.textContent:''); };
          fr.srcdoc=html; });
        fr.remove();
        return {xml:a.t, cur:c&&c.t, n:a.n, err, html:html.length};
      },{xml:o.xml,cur:o.cur||null});
      if(res.err) throw new Error('preview error: '+res.err);
      if(res.n<2) throw new Error('empty project');
      if(o.plan==='edit'&&res.cur===res.xml) throw new Error('edit changes nothing');
      out.push({n:it.n,task:task,messages:msg(P.blocksSys,P.blocksPrompt(o.q,res.cur),'PLAN: '+o.plan+'\n'+res.xml)});
    }catch(e){ bad.push([it.n,String(e.message||e).split('\n')[0].slice(0,300)]); }
  }
  await b.close(); srv.close();
  return out;
}

(async()=>{
  let out=[];
  if(task==='code'||task==='und') out=await blocks();
  else if(task==='slides') items.forEach(it=>{ try{ slidesItem(it.o).forEach(m=>out.push({n:it.n,task,messages:m})); }catch(e){ bad.push([it.n,e.message+(process.env.TRACE?e.stack:'')]); } });
  else if(task==='self') items.forEach(it=>{ try{ out.push({n:it.n,task,messages:checks.ask(it.o)}); }catch(e){ bad.push([it.n,e.message+(process.env.TRACE?e.stack:'')]); } });
  else if(checks[task]) items.forEach(it=>{ try{ out.push({n:it.n,task,messages:checks[task](it.o)}); }catch(e){ bad.push([it.n,e.message+(process.env.TRACE?e.stack:'')]); } });
  else { console.error('unknown task '+task); process.exit(2); }
  bad.sort((a,b)=>a[0]-b[0]).forEach(([n,m])=>console.log('line '+n+': '+m));
  console.log(`${path.basename(file)}: ${out.length} ok, ${bad.length} failed`);
  if(outFile) fs.writeFileSync(outFile,out.map(x=>JSON.stringify({task:x.task,messages:x.messages})).join('\n')+(out.length?'\n':''));
})();
