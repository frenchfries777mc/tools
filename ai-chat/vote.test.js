/* node ai-chat/vote.test.js */
'use strict';
const V=require('./vote.js'), assert=require('assert'); let n=0; const t=(f)=>{ f(); n++; };
t(()=>{ const r=V.pick(['서울이에요']); assert.deepStrictEqual(r,{index:0,size:1,n:1,uncertain:false}); });
t(()=>{ const r=V.pick(['수도는 서울이에요','수도는 서울입니다','수도는 부산이에요']); assert.strictEqual(r.size,2); assert.strictEqual(r.index,0); assert.strictEqual(r.uncertain,false); });
t(()=>{ const r=V.pick(['정답은 3입니다','정답은 7입니다','정답은 3입니다']); assert.strictEqual(r.size,2); assert.strictEqual(r.index,0); });
t(()=>{ const r=V.pick(['정답은 3입니다','정답은 7입니다','정답은 9입니다']); assert.strictEqual(r.size,1); assert.strictEqual(r.uncertain,true); });
t(()=>{ const r=V.pick(['사과는 빨개요','바나나는 노래요','포도는 보라색이에요','사과는 빨개요 정말']); assert.strictEqual(r.uncertain,true); });
t(()=>{ const a=['A 서울 수도','A 서울 수도다','부산 항구','A 서울 수도 맞아','대구 사과','A 서울 수도예요','광주 예술']; const r=V.pick(a); assert.strictEqual(r.n,7); assert(r.size>=4); });
t(()=>{ const r=V.pick(['같은 말 하나','같은 말 하나','완전 다른 문장 입니다']); assert.strictEqual(r.size,2); assert.strictEqual(r.uncertain,false); });
t(()=>{ assert.deepStrictEqual(V.TIMES,[1,3,7]); });
console.log(n+' tests passed');
