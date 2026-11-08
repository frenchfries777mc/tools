#!/usr/bin/env node
/* Run-checks train/raw/gen22-code.jsonl in the real Block HTML preview frame (like build4.js genRows: open the page, press every button, fail on any script error)
   and writes the passing pages as chat rows to data/v22-code.jsonl.   node train/gen22-code-check.js   (needs Playwright + Chromium; serves the repo on a local port) */
'use strict';
const fs=require('fs'), path=require('path'), http=require('http');
const DIR=__dirname, ROOT=path.join(DIR,'..');
const playwright=require(process.env.PW||'playwright');
const SYS_HTML=(()=>{ const src=fs.readFileSync(path.join(ROOT,'blocks','ai-blocks.js'),'utf8'); const m=/var SYS_HTML=\[(.*?)\]\.join\('\\n'\);/s.exec(src); return eval('['+m[1]+']').join('\n'); })();
const items=fs.readFileSync(path.join(DIR,'raw','gen22-code.jsonl'),'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2'};
const srv=http.createServer((req,res)=>{ let u=decodeURIComponent(req.url.split('?')[0]); if(u.endsWith('/')) u+='index.html'; const f=path.join(ROOT,u); if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); } res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(res); });
(async()=>{
  await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const BASE='http://127.0.0.1:'+srv.address().port;
  const browser=await playwright.chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
  const W=4, out=new Array(items.length), bad=[]; let next=0, done=0;
  async function worker(){
    const page=await (await browser.newContext({viewport:{width:1300,height:800},locale:'ko-KR'})).newPage();
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort()); await page.goto(BASE+'/blocks/index.html'); await page.waitForTimeout(1200);
    for(;;){ const i=next++; if(i>=items.length) break; const it=items[i];
      const errs=await page.evaluate(async(html)=>{ const errs=[]; window.__errs=errs; const f=document.createElement('iframe'); f.style.cssText='width:600px;height:400px;position:fixed;left:-9999px';
        f.srcdoc=html.replace('<head>','<head><script>window.onerror=function(m){parent.__errs.push(String(m))}<\/script>'); document.body.appendChild(f); await new Promise(r=>f.onload=r); await new Promise(r=>setTimeout(r,80));
        try{ const d=f.contentDocument, w=f.contentWindow; w.alert=()=>{}; w.confirm=()=>true; w.prompt=()=>'5';
          d.querySelectorAll('input').forEach(i=>{ if(i.type==='number') i.value='5'; else if(i.type==='text') i.value='가나다'; });
          for(let round=0;round<2;round++){ d.querySelectorAll('button').forEach(b=>{ try{ b.click(); }catch(e){ errs.push(String(e)); } }); await new Promise(r=>setTimeout(r,30)); }
          const text=d.body.innerText.trim(); if(!text) errs.push('empty page'); }catch(e){ errs.push(String(e)); }
        f.remove(); return errs.slice(0,2); },it.html).catch(e=>['eval '+e.message]);
      if(errs.length){ bad.push([it.id,errs[0]]); } else out[i]={task:'gen22-code',messages:[{role:'system',content:SYS_HTML},{role:'user',content:'Request: '+it.q},{role:'assistant',content:'```html\n'+it.html.trim()+'\n```'}]};
      if(++done%500===0) console.log('checked',done,'/',items.length,'bad',bad.length); }
  }
  await Promise.all(Array.from({length:W},worker)); await browser.close(); srv.close();
  const ok=out.filter(Boolean); fs.writeFileSync(path.join(DIR,'data','v22-code.jsonl'),ok.map(x=>JSON.stringify(x)).join('\n')+'\n');
  console.log('gen22-code pages ok',ok.length,'bad',bad.length); bad.slice(0,8).forEach(b=>console.log(' ',b.join(': ')));
})();
