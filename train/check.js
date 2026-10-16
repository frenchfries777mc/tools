#!/usr/bin/env node
/* Checks raw training items and turns them into chat examples that use the exact prompts in ../ai-prompts.js.
   node train/check.js <task> <raw.jsonl> [--out ok.jsonl]
   tasks: code | und  (Block HTML: {"q","cur"?,"plan","xml"})
          tr          (translation via =AI: {"instr","text","answer"})
          formula     ({"table":[[...]],"at"?:"A1","cell":"E2","q","formula","explain","expect"?})
          table       ({"q","rows":[[...]]})
          graph       ({"table":[[...]],"at"?:"A1","q","answer":{"type","range","series","title"}})
   Block items are loaded in the real editor (headless Chromium): unknown blocks, broken names and preview errors fail.
   Prints one line per failing item and a summary; --out writes the passing items as {"task","messages":[...]}. */
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
const P=require(path.join(ROOT,'ai-prompts.js'));
const E=require(path.join(ROOT,'sheet','engine.js'));

const [task,file]=process.argv.slice(2); const oi=process.argv.indexOf('--out'), outFile=oi>0?process.argv[oi+1]:null;
if(!task||!file){ console.error('usage: node train/check.js <code|und|tr|formula|table|graph> <raw.jsonl> [--out ok.jsonl]'); process.exit(2); }
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
    if(!o.q||!o.cell||!o.formula) throw new Error('needs q, cell, formula');
    const s=sheetOf(rect(o.table),o.at), f=String(o.formula).trim(); if(f[0]!=='=') throw new Error('formula must start with =');
    try{ E.parse(f.slice(1)); }catch(e){ throw new Error('formula does not parse: '+f); }
    const c=E.parseAddr(o.cell); if(!c) throw new Error('bad cell');
    if(c.r>=s.g.r1&&c.r<=s.g.r2&&c.c>=s.g.c1&&c.c<=s.g.c2&&s.doc.sheets[0].cells[E.K(c.r,c.c)]) throw new Error('target cell is inside the table data');
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
  else if(checks[task]) items.forEach(it=>{ try{ out.push({n:it.n,task,messages:checks[task](it.o)}); }catch(e){ bad.push([it.n,e.message]); } });
  else { console.error('unknown task '+task); process.exit(2); }
  bad.sort((a,b)=>a[0]-b[0]).forEach(([n,m])=>console.log('line '+n+': '+m));
  console.log(`${path.basename(file)}: ${out.length} ok, ${bad.length} failed`);
  if(outFile) fs.writeFileSync(outFile,out.map(x=>JSON.stringify({task:x.task,messages:x.messages})).join('\n')+(out.length?'\n':''));
})();
