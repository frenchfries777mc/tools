/* node train/wrong/sync.test.js  (서버는 가짜로 대신해요) */
'use strict';
const S=require('./sync.js'), fs=require('fs'), os=require('os'), path=require('path'), assert=require('assert');
(async()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ws-')), inbox=path.join(tmp,'inbox.jsonl'), doneFile=path.join(tmp,'done.json');
  fs.writeFileSync(doneFile,JSON.stringify({ids:[2,5]}));
  const rows=[{id:1,created_at:'2026-10-20T01:00:00Z',tool:'ai-chat',model:'local:x',question:'q1',answer:'a1',correction:'',history:JSON.stringify([{role:'user',content:'앞'}])},
              {id:3,created_at:'2026-10-20T02:00:00Z',tool:'sheet',model:'m',question:'q3',answer:'a3',correction:'fix'}];
  const calls=[];
  const fake=async(u,o)=>{ calls.push((o&&o.method||'GET')+' '+u); if(o&&o.method==='DELETE') return {ok:true,text:async()=>''}; if(/history/.test(u)&&process.env.NOHIST) return {ok:false,status:400,text:async()=>'no col'}; return {ok:true,json:async()=>rows}; };
  const r=await S.run({SUPABASE_URL:'https://x.supabase.co/',SUPABASE_SERVICE_KEY:'k'},{fetch:fake,inboxFile:inbox,doneFile});
  assert(calls[0].startsWith('DELETE https://x.supabase.co/rest/v1/ff_ai_wrong?id=in.(2,5)'));
  assert.strictEqual(r.deleted,2);
  const L=fs.readFileSync(inbox,'utf8').trim().split('\n').map(JSON.parse);
  assert.strictEqual(L.length,2); assert.deepStrictEqual(L[0].history,[{role:'user',content:'앞'}]); assert.deepStrictEqual(L[1].history,[]); assert.strictEqual(L[1].fix,'fix');
  assert.strictEqual(S.inboxText(rows,[1]).trim().split('\n').length,1);   // done ids stay out
  const none=await S.run({},{fetch:fake}); assert(none.skipped);          // no secret: nothing happens
  const dry=await S.run({SUPABASE_URL:'https://x',SUPABASE_SERVICE_KEY:'k'},{fetch:fake,dry:true,inboxFile:inbox,doneFile}); assert.strictEqual(dry.deleted,0);
  console.log('4 tests passed');
})().catch(e=>{ console.error(e); process.exit(1); });
