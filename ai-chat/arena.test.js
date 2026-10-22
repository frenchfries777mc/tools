/* node ai-chat/arena.test.js */
'use strict';
const A=require('./arena.js'), assert=require('assert'); let n=0;
const fresh=()=>{ const d={}; A._use({getItem:k=>d[k]==null?null:d[k], setItem:(k,v)=>{ d[k]=String(v); }}); };
const g=(a,b,w)=>({q:'질문',a:{model:a,text:'가'},b:{model:b,text:'나'},win:w});
const t=(f)=>{ fresh(); f(); n++; };
t(()=>{ assert.ok(A.record(g('L','T','a'))); assert.ok(A.record(g('L','T','b'))); assert.ok(A.record(g('L','P','tie'))); assert.ok(A.record(g('T','P','none')));
  const x=A.tally(); assert.deepStrictEqual(x.L,{win:1,lose:1,tie:1,none:0,games:3}); assert.deepStrictEqual(x.T,{win:1,lose:1,tie:0,none:1,games:3}); assert.deepStrictEqual(x.P,{win:0,lose:0,tie:1,none:1,games:2}); });
t(()=>{ assert.strictEqual(A.record(g('L','L','a')),null); assert.strictEqual(A.record({q:'x'}),null); assert.strictEqual(A.record(g('L','T','???')).win,'none'); });   // same model twice or junk is not saved
t(()=>{ for(let i=0;i<A.CAP+5;i++) A.record(g('L','T','a')); assert.strictEqual(A.list().length,A.CAP); });
t(()=>{ const e=A.record({q:'q'.repeat(999),a:{model:'L',text:'x'.repeat(5000)},b:{model:'T',text:'y'},win:'a'}); assert.strictEqual(e.q.length,300); assert.strictEqual(e.a.text.length,1500); });
console.log(n+' tests passed');
