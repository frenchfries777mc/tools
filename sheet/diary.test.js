#!/usr/bin/env node
/* Node tests for the cell diary (diary.js). Run: node sheet/diary.test.js */
'use strict';
const assert=require('assert'), D=require('./diary.js');
let pass=0; const test=(n,f)=>{ try{ f(); pass++; }catch(e){ console.log('FAIL '+n+'\n  '+e.message); process.exitCode=1; } };
const DAY=86400000, now=1000*DAY;
test('first edit keeps the old value with unknown time',()=>{ const c={v:'80'}; D.record(c,'95',now); assert.deepStrictEqual(c.h,[{t:0,v:'80'},{t:now,v:'95'}]); });
test('empty or same value is not recorded',()=>{ const a={v:''}; D.record(a,'5',now); assert.strictEqual(a.h,undefined); const b={v:'5'}; D.record(b,'5',now); assert.strictEqual(b.h,undefined); });
test('formulas are not recorded',()=>{ const a={v:'=A1+1'}; D.record(a,'3',now); assert.strictEqual(a.h,undefined); const b={v:'3'}; D.record(b,'=A1',now); assert.strictEqual(b.h,undefined); });
test('capped at 20, oldest dropped',()=>{ const c={v:'0'}; for(let i=1;i<=30;i++){ D.record(c,String(i),now+i); c.v=String(i); } assert.strictEqual(c.h.length,20); assert.strictEqual(c.h[19].v,'30'); assert.strictEqual(c.h[0].v,'11'); });
test('long values are clipped',()=>{ const c={v:'a'.repeat(200)}; D.record(c,'b',now); assert.ok(c.h[0].v.length<=61); });
test('relative time',()=>{ assert.strictEqual(D.ago(now-3*DAY,now),'3일 전'); assert.strictEqual(D.ago(now-5*3600000,now),'5시간 전'); assert.strictEqual(D.ago(now-30000,now),'방금'); assert.strictEqual(D.ago(now-90*DAY,now),'3달 전'); assert.strictEqual(D.ago(0,now),''); });
test('entries and prompt',()=>{ const c={v:'95',h:[{t:0,v:'80'},{t:now-3*DAY,v:'85'},{t:now-DAY,v:'95'}]}; const e=D.entries(c,now); assert.deepStrictEqual(e.map(x=>x.when+':'+x.v),['처음:80','3일 전:85','1일 전:95']); const p=D.prompt('B2',c,now); assert.ok(/B2/.test(p)&&/3일 전: 85/.test(p)); });
test('no history, no prompt',()=>{ assert.deepStrictEqual(D.entries({v:'1'},now),[]); assert.strictEqual(D.prompt('A1',{v:'1'},now),''); });
console.log(pass+' passed');
