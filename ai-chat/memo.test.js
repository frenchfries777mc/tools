/* node ai-chat/memo.test.js */
'use strict';
const M=require('./memo.js'), assert=require('assert'); let n=0; const t=(f)=>{ M._use((()=>{ const d={}; return {getItem:k=>d[k]==null?null:d[k], setItem:(k,v)=>{ d[k]=String(v); }}; })()); f(); n++; };
t(()=>{ assert.strictEqual(M.suggest('앞으로 반말로 해줘').text,'반말로 하기'); assert.strictEqual(M.suggest('반말로 말해줘').text,'반말로 말하기'); });
t(()=>{ assert.strictEqual(M.suggest('민수라고 불러줘').text,'사용자를 "민수"라고 불러요'); });
t(()=>{ assert.strictEqual(M.suggest('이제부터 짧게 설명해줘').text.includes('짧게'),true); });
t(()=>{ assert.strictEqual(M.suggest('나는 매운 걸 못 먹는다는 걸 기억해줘').text.includes('매운'),true); });
t(()=>{ assert.strictEqual(M.suggest('서울의 인구는 얼마야?'),null); assert.strictEqual(M.suggest('안녕'),null); assert.strictEqual(M.suggest(''),null); });
t(()=>{ const a=M.add('  존댓말로   말하기 '); assert.strictEqual(a.text,'존댓말로 말하기'); assert.strictEqual(M.add('존댓말로 말하기'),null); assert.strictEqual(M.list().length,1);
  assert.strictEqual(M.suggest('존댓말로 말해'),null);   // already saved
  assert.ok(M.edit(a.id,'반말로 말하기')); assert.strictEqual(M.list()[0].text,'반말로 말하기'); assert.ok(M.edit(a.id,'')); assert.strictEqual(M.list().length,0); });
t(()=>{ for(let i=0;i<20;i++) M.add('메모 '+i); assert.strictEqual(M.list().length,M.MAXN); assert.strictEqual(M.add('x'.repeat(200)),null);
  assert.ok(M.block().includes('메모 0')); M.setOn(false); assert.strictEqual(M.block(),''); M.setOn(true); assert.ok(M.block().length>10); });
t(()=>{ assert.strictEqual(M.block(),''); M.add('a'.repeat(300)); assert.strictEqual(M.list()[0].text.length,M.MAXC); });
console.log(n+' tests passed');
