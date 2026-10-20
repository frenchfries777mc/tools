/* node ai-chat/jokes.test.js */
'use strict';
const J=require('./jokes.js'), assert=require('assert');
const m={id:'FF-Tools-8B',name:'FF777 1.5 premus'};
let n=0; const t=(name,fn)=>{ fn(); n++; };
t('every riddle returns its own answer',()=>{ J.jokes.forEach(([q,a])=>{ const r=J.reply(q,{},m); assert(r&&r.text==='정답은 '+a+'!',q); }); });
t('riddle with 정답 request',()=>{ const [q,a]=J.jokes[5]; assert.strictEqual(J.reply(q+' 정답이 뭐야',{},m).text,'정답은 '+a+'!'); });
t('joke request gives question and answer together',()=>{ const st={}; const r=J.reply('아재개그 하나 해줘',st,m); assert(/\n정답은 .+!$/.test(r.text)&&st.last>=0); });
t('다른 거 after a joke gives another',()=>{ const st={}; J.reply('아재개그 해줘',st,m); const a=st.last; const r=J.reply('다른 거',st,m); assert(r&&r.kind==='joke'&&st.last!==a); });
t('다른 거 without a joke goes to the model',()=>{ assert.strictEqual(J.reply('다른 거',{},m),null); });
t('뭔데 after a joke repeats question and answer',()=>{ const st={}; J.reply('아재개그 해줘',st,m); const r=J.reply('뭔데',st,m); assert(r&&r.text.indexOf('정답은')>0); });
t('no repeats until all used',()=>{ const st={}; const seen=new Set(); for(let i=0;i<J.jokes.length;i++){ J.reply('아재개그 해줘',st,m); seen.add(st.last); } assert.strictEqual(seen.size,J.jokes.length); });
t('question about the word goes to the model',()=>{ assert.strictEqual(J.reply('아재개그가 뭐야?',{},m),null); assert.strictEqual(J.reply('파이썬이 뭐야?',{},m),null); });
t('self introduction per model',()=>{ const r=J.reply('너는 누구야?',{},m); assert(r&&/premus/.test(r.text)&&/Qwen3 8B/.test(r.text)&&/supremus/.test(r.text)); assert.strictEqual(J.reply('너는 누구야?',{},{id:'x'}),null); });
t('long text goes to the model',()=>{ assert.strictEqual(J.reply('아재개그 '.repeat(30)+'해줘',{},m),null); });
console.log(n+' tests passed');
