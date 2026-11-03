/* node ai-chat/jokes.test.js  (jokes.js now only answers "who are you"; jokes and riddles go to the model) */
'use strict';
const J=require('./jokes.js'), assert=require('assert');
const m={id:'FF-Tools-8B',name:'FF777 1.5 premus'};
let n=0; const t=(name,fn)=>{ fn(); n++; };
t('riddles go to the model',()=>{ J.jokes.forEach(([q,a])=>{ if(!/자기소개|누구/.test(q)) assert.strictEqual(J.reply(q,{},m),null,q); }); });
t('joke requests go to the model',()=>{ ['아재개그 하나 해줘','아재개그 아무거나','다른 거','뭔데','웃겨줘'].forEach(q=>assert.strictEqual(J.reply(q,{},m),null,q)); });
t('self introduction per model',()=>{ const r=J.reply('너는 누구야?',{},m); assert(r&&/premus/.test(r.text)&&/Qwen3 8B/.test(r.text)&&/supremus/.test(r.text)); assert.strictEqual(J.reply('너는 누구야?',{},{id:'x'}),null); });
t('long text goes to the model',()=>{ assert.strictEqual(J.reply('아재개그 '.repeat(30)+'해줘',{},m),null); });
console.log(n+' tests passed');
