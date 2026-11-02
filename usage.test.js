const U=require('./usage.js'); let ok=0,bad=0; function t(n,c){ if(c) ok++; else { bad++; console.log('FAIL',n); } }
function mk(o){ const k=Object.keys(o); return {length:k.length,key:i=>k[i],getItem:x=>x in o?o[x]:null}; }
const DAY=864e5, now=Date.UTC(2026,10,2);
const st=mk({'ffdocs.v1':JSON.stringify({docs:[{id:'d1',name:'old big',t:now-10*DAY},{id:'d2',name:'new',t:now-DAY},{id:'d3',name:'old small',t:now-9*DAY}]}),
 'ffdocs.doc.d1':'x'.repeat(5000),'ffdocs.doc.d2':'y'.repeat(9000),'ffdocs.doc.d3':'z'.repeat(50),
 'ffver.v1.docs.d1':JSON.stringify([{id:'a',t:1,d:'',remote:1,len:3000},{id:'b',t:2,d:'q'.repeat(100)}]),
 'ffsheet.docs':JSON.stringify([{id:'s1',name:'sh',t:now-20*DAY}]),'ffsheet.doc.s1':'w'.repeat(7000),
 'ffslides.v1':JSON.stringify({decks:[{id:'k1',name:'deck',t:now-8*DAY,slides:[]}]}),'other.key':'o'.repeat(1000)});
const c=U.collect(st,now);
t('files 5',c.files.length===5); t('server used 3000',c.server.used===3000); t('mine<used',c.browser.mine<c.browser.used&&c.browser.mine>14000);
const i=U.idle(c.files,now); t('idle excludes new',!i.some(f=>f.id==='d2')); t('biggest first',i[0].id==='s1'&&i[1].id==='d1'); t('count',i.length===4);
t('fmt',U.fmt(1500000)==='1.5MB'&&U.fmt(50)==='1KB');
console.log(ok+' passed'+(bad?', '+bad+' FAILED':'')); process.exit(bad?1:0);
