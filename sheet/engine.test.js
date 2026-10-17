#!/usr/bin/env node
/* Node tests for the Fry Sheet formula engine (engine.js). Run: node sheet/engine.test.js
   Each test builds a one-sheet doc from {A1:'raw', …}, evaluates with a fresh Engine and compares shown values. */
'use strict';
const assert=require('assert'), E=require('./engine.js');

function sheet(t){ const cells={}; for(const a in t){ const p=E.parseAddr(a); cells[E.K(p.r,p.c)]={v:t[a]}; } return {sheets:[{name:'S',cells}]}; }
/* values of the listed cells, read in that order with one engine (order matters for spills, so tests also try other orders) */
function vals(doc,addrs){ const e=new E.Engine(doc); return addrs.map(a=>{ const p=E.parseAddr(a); return E.formatValue(e.value(0,p.r,p.c)); }); }
function col(a,n){ const p=E.parseAddr(a); return Array.from({length:n},(_,i)=>E.addr(p.r+i,p.c)); }
function row(a,n){ const p=E.parseAddr(a); return Array.from({length:n},(_,i)=>E.addr(p.r,p.c+i)); }

let pass=0, failed=0;
function test(name,fn){ try{ fn(); pass++; }catch(e){ failed++; console.log('FAIL '+name+'\n  '+(e.message||e).split('\n').join('\n  ')); } }
const eq=(a,b)=>assert.deepStrictEqual(a,b);

/* scores: A1 header, A2:A7 names, B2:B7 scores, C2:C7 class */
const T={A1:'이름',B1:'점수',C1:'반',A2:'민수',B2:'72',C2:'1',A3:'지현',B3:'95',C3:'2',A4:'Tom',B4:'58',C4:'1',A5:'유나',B5:'88',C5:'2',A6:'tom',B6:'58',C6:'1',A7:'하늘',B7:'64',C7:'3'};
function withT(extra){ return sheet(Object.assign({},T,extra)); }

test('SEQUENCE rows only',()=>eq(vals(sheet({A1:'=SEQUENCE(4)'}),col('A1',5)),['1','2','3','4','']));
test('SEQUENCE rows, columns, start, step',()=>eq(vals(sheet({A1:'=SEQUENCE(2,3,10,5)'}),['A1','B1','C1','A2','B2','C2']),['10','15','20','25','30','35']));
test('SEQUENCE decimal step stays clean',()=>eq(vals(sheet({A1:'=SEQUENCE(3,1,0,0.1)'}),col('A1',3)),['0','0.1','0.2']));
test('SEQUENCE(0) is #CALC!',()=>eq(vals(sheet({A1:'=SEQUENCE(0)'}),['A1']),['#CALC!']));

test('FILTER rows by a condition',()=>eq(vals(withT({E1:'=FILTER(A2:A7,B2:B7>=70)'}),col('E1',4)),['민수','지현','유나','']));
test('FILTER keeps all columns of the block',()=>eq(vals(withT({E1:'=FILTER(A2:B7,C2:C7=2)'}),['E1','F1','E2','F2','E3']),['지현','95','유나','88','']));
test('FILTER with two conditions multiplied',()=>eq(vals(withT({E1:'=FILTER(A2:A7,(B2:B7>60)*(C2:C7=1))'}),col('E1',2)),['민수','']));
test('FILTER with nothing found uses if_empty',()=>eq(vals(withT({E1:'=FILTER(A2:A7,B2:B7>100,"없음")'}),['E1']),['없음']));
test('FILTER with nothing found and no if_empty is #CALC!',()=>eq(vals(withT({E1:'=FILTER(A2:A7,B2:B7>100)'}),['E1']),['#CALC!']));
test('FILTER with mismatched sizes is #VALUE!',()=>eq(vals(withT({E1:'=FILTER(A2:A7,B2:B5>1)'}),['E1']),['#VALUE!']));
test('FILTER columns with a row condition',()=>eq(vals(sheet({A1:'1',B1:'2',C1:'3',A2:'x',B2:'y',C2:'z',A4:'=FILTER(A2:C2,A1:C1<>2)'}),['A4','B4','C4']),['x','z','']));

test('SORT ascending by first column',()=>eq(vals(withT({E1:'=SORT(B2:B7)'}),col('E1',6)),['58','58','64','72','88','95']));
test('SORT descending by the second column',()=>eq(vals(withT({E1:'=SORT(A2:B7,2,-1)'}),['E1','F1','E2','F2','E5','F5','E6']),['지현','95','유나','88','Tom','58','tom']));
test('SORT is stable for ties',()=>eq(vals(withT({E1:'=SORT(A2:B7,2)'}),['E1','E2']),['Tom','tom']));
test('SORT text: case-insensitive, blanks last',()=>eq(vals(sheet({A1:'b',A2:'',A3:'C',A4:'a',C1:'=SORT(A1:A4)'}),col('C1',4)),['a','b','C','']));
test('SORT by columns',()=>eq(vals(sheet({A1:'3',B1:'1',C1:'2',A2:'c',B2:'a',C2:'b',A4:'=SORT(A1:C2,1,1,TRUE)'}),['A4','B4','C4','A5','B5','C5']),['1','2','3','a','b','c']));
test('SORT with a bad index is #VALUE!',()=>eq(vals(withT({E1:'=SORT(A2:B7,3)'}),['E1']),['#VALUE!']));

test('SORTBY one key, descending',()=>eq(vals(withT({E1:'=SORTBY(A2:A7,B2:B7,-1)'}),col('E1',3)),['지현','유나','민수']));
test('SORTBY two keys',()=>eq(vals(withT({E1:'=SORTBY(A2:A7,C2:C7,1,B2:B7,-1)'}),col('E1',6)),['민수','Tom','tom','지현','유나','하늘']));
test('SORTBY with a key of the wrong size is #VALUE!',()=>eq(vals(withT({E1:'=SORTBY(A2:A7,B2:B4)'}),['E1']),['#VALUE!']));

test('UNIQUE values in order of appearance',()=>eq(vals(withT({E1:'=UNIQUE(C2:C7)'}),col('E1',4)),['1','2','3','']));
test('UNIQUE ignores case',()=>eq(vals(withT({E1:'=UNIQUE(B2:B7)'}),col('E1',6)),['72','95','58','88','64','']));
test('UNIQUE rows, exactly once',()=>eq(vals(withT({E1:'=UNIQUE(C2:C7,FALSE,TRUE)'}),col('E1',2)),['3','']));
test('UNIQUE by columns',()=>eq(vals(sheet({A1:'1',B1:'2',C1:'1',A3:'=UNIQUE(A1:C1,TRUE)'}),row('A3',3)),['1','2','']));

test('nested: SORT(UNIQUE(FILTER()))',()=>eq(vals(withT({E1:'=SORT(UNIQUE(FILTER(B2:B7,C2:C7=1)),1,-1)'}),col('E1',3)),['72','58','']));
test('COUNTA, ROWS and INDEX over an array',()=>eq(vals(withT({E1:'=ROWS(FILTER(A2:A7,C2:C7=1))',E2:'=INDEX(SORT(B2:B7,1,-1),2)',E3:'=COUNTA(UNIQUE(A2:A7))'}),['E1','E2','E3']),['3','88','5']));

test('a spill fills cells that other formulas can read',()=>eq(vals(sheet({A1:'=SEQUENCE(5)',C1:'=SUM(A1:A5)',C2:'=A4*10'}),['C1','C2']),['15','40']));
test('reading a spilled cell before its anchor gives the same answer',()=>eq(vals(sheet({A1:'=SEQUENCE(5)',C1:'=SUM(A1:A5)',C2:'=A4*10'}),['C2','C1','A1']),['40','15','1']));
test('a value in the way gives #SPILL!',()=>eq(vals(sheet({A1:'=SEQUENCE(3)',A3:'x'}),col('A1',3)),['#SPILL!','','x']));
test('clearing the way spills again',()=>{ const d=sheet({A1:'=SEQUENCE(3)',A3:'x'}); delete d.sheets[0].cells[E.K(2,0)]; eq(vals(d,col('A1',3)),['1','2','3']); });
test('two spills that would overlap: one is #SPILL!',()=>{ const v=vals(sheet({B1:'=SEQUENCE(3)',A2:'=SEQUENCE(1,3)'}),['B1','A2','B2']); assert.ok(v.indexOf('#SPILL!')>=0,v.join(',')); });
test('SUM over a spill that is #SPILL! reads nothing there',()=>eq(vals(sheet({A1:'=SEQUENCE(3)',A2:'5',C1:'=SUM(A1:A3)'}),['C1']),['#SPILL!']));

test('element-wise operators spill',()=>eq(vals(sheet({A1:'1',A2:'2',A3:'3',B1:'=A1:A3*2'}),col('B1',3)),['2','4','6']));
test('a range by itself spills',()=>eq(vals(sheet({A1:'1',A2:'2',B1:'=A1:A2'}),col('B1',2)),['1','2']));
test('a row and a column stretch into a table',()=>eq(vals(sheet({A1:'=SEQUENCE(3)*SEQUENCE(1,3)'}),['A1','C1','A3','C3']),['1','3','3','9']));
test('SUM and SUMPRODUCT of element-wise products',()=>eq(vals(sheet({A1:'1',A2:'2',A3:'3',B1:'4',B2:'5',B3:'6',C1:'=SUM(A1:A3*B1:B3)',C2:'=SUMPRODUCT((A1:A3>1)*B1:B3)'}),['C1','C2']),['32','11']));
test('shape mismatch gives #N/A for the missing cells',()=>eq(vals(sheet({A1:'1',A2:'2',A3:'3',B1:'1',B2:'2',D1:'=A1:A3+B1:B2'}),col('D1',3)),['2','4','#N/A']));
test('errors stay in their own cell',()=>eq(vals(sheet({A1:'1',A2:'0',A3:'2',B1:'=1/A1:A3'}),col('B1',3)),['1','#DIV/0!','0.5']));
test('IF over a range works per cell',()=>eq(vals(withT({E1:'=IF(B2:B7>=60,"통과","재시험")'}),col('E1',3)),['통과','통과','재시험']));
test('IFERROR over an array replaces each error',()=>eq(vals(sheet({A1:'1',A2:'0',B1:'=IFERROR(1/A1:A2,"-")'}),col('B1',2)),['1','-']));
test('array literal spills across',()=>eq(vals(sheet({A1:'={1,2,3}'}),row('A1',3)),['1','2','3']));

test('old scalar formulas are unchanged',()=>eq(vals(withT({E1:'=SUM(B2:B7)',E2:'=IF(B2>70,"a","b")',E3:'=VLOOKUP("유나",A2:B7,2,FALSE)',E4:'=COUNTIF(B2:B7,">60")'}),['E1','E2','E3','E4']),['435','a','88','4']));
test('a real cycle is still #CYCLE!',()=>eq(vals(sheet({A1:'=B1',B1:'=A1'}),['A1']),['#CYCLE!']));
test('no false cycle when a sorted cell reads an empty cell below the sort',()=>{
  const d=sheet({A1:'=SUM(E5:E6)+1',A2:'3',A3:'2',D1:'=SORT(A1:A3)'});
  eq(vals(d,['A1','D1','D2','D3']),['1','1','2','3']); eq(vals(d,['D2','A1']),['2','1']); });
test('spills from a cycle do not stick',()=>eq(vals(sheet({A1:'=SEQUENCE(B5+2)',B5:'=A1'}),['B5','A1']).every(v=>v==='#CYCLE!'||v==='1'),true));

test('spills() lists every block',()=>{ const e=new E.Engine(sheet({A1:'=SEQUENCE(2,2)',D1:'=UNIQUE({1,1,2})',G1:'=SUM(1,2)'})); const s=e.spills(0).map(g=>E.rangeStr(g)).sort(); eq(s,['A1:B2','D1:F1']); });
test('spillAt finds the block of a spilled cell',()=>{ const e=new E.Engine(sheet({B2:'=SEQUENCE(3)'})); e.spills(0); eq(E.rangeStr(e.spillAt(0,3,1)),'B2:B4'); eq(e.spillAt(0,4,1),null); });

test('toXl adds the Excel prefix to new functions only',()=>eq(E.toXl('SUM(FILTER(A1:A3,A1:A3>1))+XLOOKUP(1,A:A,B:B)'),'SUM(_xlfn._xlws.FILTER(A1:A3,A1:A3>1))+_xlfn.XLOOKUP(1,A:A,B:B)'));
test('toXl leaves text and cell names alone',()=>eq(E.toXl('"SORT("&SORT1&IFS(A1,1)'),'"SORT("&SORT1&_xlfn.IFS(A1,1)'));
test('fromXl removes the prefixes',()=>eq(E.fromXl('_xlfn._xlws.SORT(_xlfn.UNIQUE(A1:A3))+_xlfn.SEQUENCE(2)'),'SORT(UNIQUE(A1:A3))+SEQUENCE(2)'));

test('fromXl also takes a lone _xlws. prefix',()=>eq(E.fromXl('_xlws.FILTER(A1:A3,A1:A3>1)'),'FILTER(A1:A3,A1:A3>1)'));

console.log(pass+' passed, '+failed+' failed');
process.exit(failed?1:0);
