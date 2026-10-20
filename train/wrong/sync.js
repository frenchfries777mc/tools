#!/usr/bin/env node
/* 틀렸어요 자동 모으기. GitHub Actions(.github/workflows/wrong-sync.yml)가 돌려요. 사람이 하는 일은 없어요.
   1) train/wrong/done.json 에 적힌 id(제가 학습 자료에 반영했거나 장난이라고 판정한 것)를 서버(ff_ai_wrong)에서 지워요.
   2) 서버에 남은 틀렸어요를 train/wrong/inbox.jsonl 한 줄씩 적어요 (workflow 가 wrong-inbox 가지에 올려요). 제가 학습 자료를 쓸 때 이걸 읽어요.
   필요한 것: 환경변수 SUPABASE_URL, SUPABASE_SERVICE_KEY (저장소 secret). 키는 이 스크립트 밖으로 나가지 않아요.
   node train/wrong/sync.js [--dry]   (--dry: 서버를 읽기만 하고 지우지 않아요) */
'use strict';
const fs=require('fs'), path=require('path');
const DIR=__dirname, DONE=path.join(DIR,'done.json'), INBOX=path.join(DIR,'inbox.jsonl');

function readDone(file){ try{ const j=JSON.parse(fs.readFileSync(file||DONE,'utf8')); return Array.isArray(j.ids)?j.ids.filter(x=>Number.isInteger(x)):[]; }catch(e){ return []; } }
function toLine(r){
  let h=[]; try{ h=r.history?JSON.parse(r.history):[]; }catch(e){}
  return JSON.stringify({id:r.id, t:r.created_at, tool:r.tool, model:r.model, history:Array.isArray(h)?h:[], q:r.question, a:r.answer, fix:r.correction});
}
/* rows from the server -> inbox text (ids in `done` are left out) */
function inboxText(rows, done){
  const skip=new Set(done||[]); return rows.filter(r=>!skip.has(r.id)).sort((a,b)=>a.id-b.id).map(toLine).join('\n')+(rows.length?'\n':'');
}
async function run(env, o){
  o=o||{}; const url=(env.SUPABASE_URL||'').replace(/\/$/,''), key=env.SUPABASE_SERVICE_KEY;
  if(!url||!key){ console.log('SUPABASE_URL 이나 SUPABASE_SERVICE_KEY 가 없어요. 저장소 secret 을 먼저 넣어 주세요. 아무것도 안 했어요.'); return {skipped:true}; }
  const f=o.fetch||fetch, H={apikey:key, Authorization:'Bearer '+key};
  const done=readDone(o.doneFile); let deleted=0;
  if(done.length&&!o.dry){
    for(let i=0;i<done.length;i+=100){   // 100개씩
      const ids=done.slice(i,i+100).join(',');
      const r=await f(url+'/rest/v1/ff_ai_wrong?id=in.('+ids+')',{method:'DELETE',headers:H});
      if(!r.ok) throw new Error('지우기 실패 '+r.status+' '+(await r.text()).slice(0,200));
    }
    deleted=done.length;
  }
  // history 열은 supabase-ff-ai-wrong-history.sql 을 실행해야 있어요. 없으면 그 열 없이 읽어요.
  const cols='id,created_at,tool,model,question,answer,correction';
  let r=await f(url+'/rest/v1/ff_ai_wrong?select='+cols+',history&order=id.asc&limit=1000',{headers:H});
  if(!r.ok) r=await f(url+'/rest/v1/ff_ai_wrong?select='+cols+'&order=id.asc&limit=1000',{headers:H});
  if(!r.ok) throw new Error('읽기 실패 '+r.status+' '+(await r.text()).slice(0,200));
  const rows=await r.json(); const text=inboxText(rows,o.dry?[]:done);
  if(!o.noWrite) fs.writeFileSync(o.inboxFile||INBOX,text);
  console.log('서버 '+rows.length+'개, 지운 것 '+deleted+'개, inbox '+(text?text.trim().split('\n').length:0)+'줄');
  return {rows:rows.length, deleted, inbox:text};
}
if(require.main===module) run(process.env,{dry:process.argv.includes('--dry')}).catch(e=>{ console.error(e.message); process.exit(1); });
module.exports={run, readDone, inboxText, toLine};
