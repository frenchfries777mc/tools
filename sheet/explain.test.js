#!/usr/bin/env node
/* Node tests for the formula explainer (explain.js). Run: node sheet/explain.test.js */
'use strict';
const assert=require('assert'), E=require('./engine.js'), X=require('./explain.js');
const doc={sheets:[{name:'S',cells:{[E.K(1,1)]:{v:'72'},[E.K(2,1)]:{v:'95'},[E.K(3,1)]:{v:'88'}}}]};
const eng=new E.Engine(doc);
const val=n=>{ try{ const v=eng.ev(n,0); return v&&typeof v==='object'&&!E.isErr(v)?'range':E.formatValue(v); }catch(e){ return E.isErr(e)?e.e:'#ERROR!'; } };
const o={parse:E.parse,val,ref:val,desc:n=>({SUM:'합',COUNT:'개수',IF:'조건'}[n]||''),addr:E.addr,rangeStr:E.rangeStr};
let pass=0; const test=(n,f)=>{ try{ f(); pass++; }catch(e){ console.log('FAIL '+n+'\n  '+e.message); process.exitCode=1; } };
test('plain text',()=>assert.strictEqual(X.explain('hello',o).kind,'text'));
test('sum / count steps and result',()=>{ const x=X.explain('=SUM(B2:B4)/COUNT(B2:B4)',o); assert.strictEqual(x.kind,'formula');
  assert.deepStrictEqual(x.steps.map(s=>s.expr+'='+s.value),['SUM(B2:B4)=255','COUNT(B2:B4)=3','SUM(B2:B4) / COUNT(B2:B4)=85']); assert.strictEqual(x.result,'85'); });
test('refs listed with values',()=>{ const x=X.explain('=B2+B3*2',o); assert.deepStrictEqual(x.refs,[{t:'B2',v:'72'},{t:'B3',v:'95'}]); assert.strictEqual(x.result,'262'); });
test('extra close paren is named',()=>{ const x=X.explain('=SUM(B2:B4))',o); assert.strictEqual(x.kind,'bad'); assert.ok(/닫는 괄호 \)가 1개 더 많아요/.test(x.hint)); });
test('missing close paren is named',()=>{ const x=X.explain('=SUM((B2:B4)',o); assert.strictEqual(x.kind,'bad'); assert.ok(/여는 괄호 \(가 1개 더 많아요/.test(x.hint)); });
test('parens inside quotes are not counted',()=>{ const x=X.explain('=IF(B2>1,"(",")")',o); assert.strictEqual(x.kind,'formula'); });
test('AI function',()=>{ const x=X.explain('=AI("요약", A2)',{...o,val:()=>'요약 결과'}); assert.strictEqual(x.kind,'ai'); assert.strictEqual(x.prompt,'요약'); });
test('same step is shown once',()=>{ const x=X.explain('=SUM(B2:B4)+SUM(B2:B4)',o); assert.strictEqual(x.steps.length,2); });
test('single reference',()=>{ const x=X.explain('=B2',o); assert.strictEqual(x.simple,true); assert.strictEqual(x.result,'72'); });
console.log(pass+' passed');
