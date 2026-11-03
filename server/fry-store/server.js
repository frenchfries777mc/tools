/* Fry Store: keeps Fry Docs/Sheet/Slides old saved versions on the Oracle server (no packages needed, Node 18+).
   The browser makes a random secret ("owner", 32 hex) and uses it as its folder name; nobody can list other owners.
   PUT /v/<owner>/<key>/<id> (JSON body)   GET /v/<owner>/<key> (list)   GET /v/<owner>/<key>/<id>   DELETE /v/<owner>/<key>/<id>
   Also the documents themselves (server-only saving): PUT|POST /k/<owner>/<key> (raw text body, up to 4 MB)  GET /k/<owner> (list of keys)  GET|DELETE /k/<owner>/<key>.
   Limits: 1 MB per version, 4 MB per document, 16 MB per owner (a few hundred documents), 3 GB all together. Listens on 127.0.0.1:8787; Caddy gives it https. */
'use strict';
const http=require('http'), fs=require('fs'), path=require('path');
const DIR=process.env.STORE_DIR||'/var/lib/fry-store', PORT=+process.env.PORT||8787;
const MAXV=1e6, MAXK=4e6, MAXO=16e6, MAXALL=3e9;
const OK=/^[0-9a-f]{32}$/, KEY=/^[A-Za-z0-9._-]{1,80}$/, ID=/^[a-z0-9]{4,20}$/;
fs.mkdirSync(DIR,{recursive:true});
function size(d){ let n=0; try{ for(const f of fs.readdirSync(d,{withFileTypes:true})){ const p=path.join(d,f.name); n+=f.isDirectory()?size(p):fs.statSync(p).size; } }catch(e){} return n; }
function send(res,code,obj){ res.writeHead(code,{'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-methods':'GET,PUT,POST,DELETE,OPTIONS','access-control-allow-headers':'content-type','cache-control':'no-store'}); res.end(JSON.stringify(obj)); }
http.createServer((req,res)=>{
  if(req.method==='OPTIONS') return send(res,204,{});
  const p=req.url.split('?')[0].split('/').filter(Boolean);
  if(p[0]==='k'){   // documents: one raw text value per key
    if(!OK.test(p[1]||'')||(p[2]&&!KEY.test(p[2]))||p.length>3) return send(res,404,{error:'no'});
    const kd=path.join(DIR,p[1],'_k');
    if(req.method==='GET'&&!p[2]){ let out=[]; try{ out=fs.readdirSync(kd).filter(f=>!f.endsWith('.tmp')).map(f=>{ const st=fs.statSync(path.join(kd,f)); return {k:f,n:st.size,t:Math.round(st.mtimeMs)}; }); }catch(e){} return send(res,200,out); }
    if(!p[2]) return send(res,405,{error:'key'});
    const kf=path.join(kd,p[2]);
    if(req.method==='GET'){ try{ const b=fs.readFileSync(kf); res.writeHead(200,{'content-type':'text/plain; charset=utf-8','access-control-allow-origin':'*','cache-control':'no-store'}); return res.end(b); }catch(e){ return send(res,404,{error:'none'}); } }
    if(req.method==='DELETE'){ try{ fs.unlinkSync(kf); }catch(e){} return send(res,200,{ok:1}); }
    if(req.method==='PUT'||req.method==='POST'){ const ch=[]; let n=0,big=false; req.on('data',c=>{ n+=c.length; if(n>MAXK){ big=true; } else ch.push(c); });
      req.on('end',()=>{ if(big) return send(res,413,{error:'big'});
        const b=Buffer.concat(ch); let old=0; try{ old=fs.statSync(kf).size; }catch(e){}
        if(size(path.join(DIR,p[1]))-old+b.length>MAXO||size(DIR)+b.length>MAXALL) return send(res,507,{error:'full'});
        fs.mkdirSync(kd,{recursive:true}); const tmp=kf+'.tmp'; fs.writeFileSync(tmp,b); fs.renameSync(tmp,kf); send(res,200,{ok:1}); });
      return; }
    return send(res,405,{error:'method'});
  }
  if(p[0]!=='v'||!OK.test(p[1]||'')||!KEY.test(p[2]||'')||(p[3]&&!ID.test(p[3]))||p.length>4) return send(res,404,{error:'no'});
  const dir=path.join(DIR,p[1],p[2]);
  if(req.method==='GET'&&!p[3]){ let out=[]; try{ out=fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>{ try{ const j=JSON.parse(fs.readFileSync(path.join(dir,f))); return {id:j.id,t:j.t,name:j.name||'',auto:j.auto?1:0}; }catch(e){ return null; } }).filter(Boolean); }catch(e){} return send(res,200,out); }
  if(!p[3]) return send(res,405,{error:'id'});
  const file=path.join(dir,p[3]+'.json');
  if(req.method==='GET'){ try{ res.writeHead(200,{'content-type':'application/json','access-control-allow-origin':'*','cache-control':'no-store'}); return res.end(fs.readFileSync(file)); }catch(e){ return send(res,404,{error:'none'}); } }
  if(req.method==='DELETE'){ try{ fs.unlinkSync(file); }catch(e){} return send(res,200,{ok:1}); }
  if(req.method==='PUT'){ let b='',big=false; req.on('data',c=>{ b+=c; if(b.length>MAXV){ big=true; req.destroy(); } });
    req.on('close',()=>{}); req.on('end',()=>{ if(big) return;
      let j; try{ j=JSON.parse(b); }catch(e){ return send(res,400,{error:'json'}); }
      if(!j||j.id!==p[3]||typeof j.d!=='string'||typeof j.t!=='number') return send(res,400,{error:'shape'});
      if(size(path.join(DIR,p[1]))+b.length>MAXO||size(DIR)+b.length>MAXALL) return send(res,507,{error:'full'});
      fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(file,JSON.stringify({id:j.id,t:j.t,name:String(j.name||'').slice(0,40),auto:j.auto?1:0,d:j.d})); send(res,200,{ok:1}); });
    return; }
  send(res,405,{error:'method'});
}).listen(PORT,'127.0.0.1',()=>console.log('fry-store on',PORT,DIR));
