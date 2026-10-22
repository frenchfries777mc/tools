#!/usr/bin/env node
/* Node tests for the version history (versions.js). Run: node versions.test.js */
'use strict';
const assert=require('assert'), V=require('./versions.js');
let pass=0; const test=(n,f)=>{ try{ f(); pass++; }catch(e){ console.log('FAIL '+n+'\n  '+e.message); process.exitCode=1; } };
const mem=(limit)=>{ const m={}; return {getItem:k=>k in m?m[k]:null,setItem:(k,v)=>{ if(limit&&Object.values(m).join('').length+v.length>limit) throw new Error('quota'); m[k]=v; },removeItem:k=>{ delete m[k]; },m}; };
const MIN=60000, T0=1e12;
test('save and list, newest first',()=>{ const s=mem(); V.save('a','one','d1',false,s,T0); V.save('a','two','d2',false,s,T0+1); assert.deepStrictEqual(V.list('a',s).map(x=>x.name),['two','one']); });
test('documents are separate',()=>{ const s=mem(); V.save('a','x','d',false,s); assert.strictEqual(V.list('b',s).length,0); });
test('capped at 15',()=>{ const s=mem(); for(let i=0;i<20;i++) V.save('a','n'+i,'d'+i,false,s,T0+i); const l=V.list('a',s); assert.strictEqual(l.length,15); assert.strictEqual(l[0].name,'n19'); });
test('automatic versions keep the latest 4, named ones stay',()=>{ const s=mem(); V.save('a','mine','m',false,s,T0); for(let i=1;i<=7;i++) V.save('a','','a'+i,true,s,T0+i); const l=V.list('a',s); assert.strictEqual(l.filter(x=>x.auto).length,4); assert.ok(l.some(x=>x.name==='mine')); assert.strictEqual(l[0].d,'a7'); });
test('tick: first look saves, then waits 30 minutes, then only when changed',()=>{ const s=mem(); assert.strictEqual(V.tick('a',()=>'v1',s,T0),true);
  assert.strictEqual(V.tick('a',()=>'v2',s,T0+10*MIN),false); assert.strictEqual(V.tick('a',()=>'v1',s,T0+40*MIN),false); assert.strictEqual(V.tick('a',()=>'v2',s,T0+40*MIN),true); assert.strictEqual(V.list('a',s).length,2); });
test('too big data is refused',()=>{ const s=mem(); assert.strictEqual(V.save('a','big','x'.repeat(700000),false,s),null); assert.strictEqual(V.list('a',s).length,0); });
test('full storage drops the oldest',()=>{ const s=mem(2500); for(let i=0;i<5;i++) V.save('a','n'+i,'x'.repeat(400)+i,false,s,T0+i); const l=V.list('a',s); assert.ok(l.length>=1&&l.length<5); assert.strictEqual(l[0].name,'n4'); });
test('storage too small for even one: null and nothing left',()=>{ const s=mem(100); assert.strictEqual(V.save('a','n','x'.repeat(300),false,s),null); assert.strictEqual(V.list('a',s).length,0); });
test('remove',()=>{ const s=mem(); const e=V.save('a','n','d',false,s); V.remove('a',e.id,s); assert.strictEqual(V.list('a',s).length,0); });
test('ago',()=>{ assert.strictEqual(V.ago(T0,T0+3*86400000),'3일 전'); assert.strictEqual(V.ago(T0,T0+5*3600000),'5시간 전'); });
test('broken json in storage reads as empty',()=>{ const s=mem(); s.setItem('ffver.v1.a','{oops'); assert.deepStrictEqual(V.list('a',s),[]); });
console.log(pass+' passed');
