#!/usr/bin/env node
/* 제가 학습 자료를 쓸 때 쓰는 도구. 사람이 쓰는 게 아니에요.
   node train/wrong/tool.js show [파일]      inbox 를 한 줄씩 읽기 좋게 보여 줘요 (앞 대화 포함)
   node train/wrong/tool.js done 12 13 14    판정이 끝난 id 를 done.json 에 더해요 (다음 sync 때 서버에서 지워져요) */
'use strict';
const fs=require('fs'), path=require('path');
const DONE=path.join(__dirname,'done.json');
const [cmd,...rest]=process.argv.slice(2);
if(cmd==='show'){
  const f=rest[0]||path.join(__dirname,'inbox.jsonl'); const L=fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(JSON.parse);
  L.forEach(r=>{ console.log('#'+r.id+' ['+r.tool+' '+r.model+' '+String(r.t).slice(0,16)+']');
    (r.history||[]).forEach(m=>console.log('   '+(m.role==='user'?'사람':'AI')+': '+m.content.replace(/\n/g,' / ').slice(0,200)));
    if(r.why) console.log('   이유(사람): '+({fact:'사실이 틀려요',tone:'말투나 형식이 이상해요',offtopic:'질문과 상관없는 답',repeat:'같은 말을 반복해요'}[r.why]||r.why)); console.log('   Q: '+r.q); console.log('   A: '+String(r.a).replace(/\n/g,' / ').slice(0,300)); if(r.fix) console.log('   맞는 답(사람): '+r.fix); console.log(''); });
  console.log(L.length+'개');
} else if(cmd==='done'){
  const ids=rest.map(Number).filter(Number.isInteger); let cur={ids:[]}; try{ cur=JSON.parse(fs.readFileSync(DONE,'utf8')); }catch(e){}
  cur.ids=[...new Set([...(cur.ids||[]),...ids])].sort((a,b)=>a-b); fs.writeFileSync(DONE,JSON.stringify(cur)+'\n'); console.log('done.json: '+cur.ids.length+'개');
} else { console.log('사용법: show [파일] | done <id>...'); process.exit(1); }
