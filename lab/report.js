/* Fry Lab report and share link windows (header buttons #repBtn and #shareBtn).
   보고서: a one-page lab report (목적 / 방법 / 결과 / 결론) built from the open experiment, its settings, the recorded rows and the graph picture.
   The four texts start from a template filled with the numbers; "AI로 초안 쓰기" lets the shared AI (LABAI.draft) write them instead. They stay editable.
   It downloads as one .html file (the graph is embedded as a picture) or prints from a hidden frame (the browser's print window, "save as PDF" there).
   공유: a link '#share=...' with the experiment id, the setting values and optionally the recorded rows (app.js: shareCode / openShare), plus a QR (../slides/qr.js). */
(function(){
'use strict';
var T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };
var back=null, from0=null, KEYS=[['purpose','1. 목적','무엇을 알아보려는지 적어요'],['method','2. 방법','어떤 조건으로 어떻게 했는지 적어요'],['result','3. 결과','숫자와 그래프에서 읽은 것을 적어요'],['conclusion','4. 결론','알게 된 점과 오차의 이유를 적어요']];
var busyAI=false;
function el(t,c,x){ var e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; }
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function sig(v){ return v==null||!isFinite(v)?'—':String(+v.toPrecision(4)); }
function close(){ if(!back) return; if(busyAI&&window.LABAI) LABAI.stop(); document.removeEventListener('keydown',key,true); back.remove(); back=null; if(from0&&from0.focus&&document.contains(from0)) from0.focus(); }
function key(ev){ if(ev.key==='Escape'){ ev.preventDefault(); ev.stopPropagation(); close(); } }
function dialog(label,sub,cls){ close(); back=el('div','gpkback'); back.onclick=function(ev){ if(ev.target===back) close(); };
  var box=el('div','gpk '+cls); box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true'); box.setAttribute('aria-label',T(label));
  var hd=el('div','gpkhd'), tt=el('div','gpkt'); tt.appendChild(el('h3','',T(label))); tt.appendChild(el('span','',T(sub)));
  var x=el('button','x','×'); x.type='button'; x.setAttribute('aria-label',T('닫기')); x.title=T('닫기'); x.onclick=close; hd.appendChild(tt); hd.appendChild(x); box.appendChild(hd);
  back.appendChild(box); document.body.appendChild(back); document.addEventListener('keydown',key,true); return box; }
function btn(txt,cls,fn){ var b=el('button','tbtn'+(cls?' '+cls:''),T(txt)); b.type='button'; b.onclick=fn; return b; }

/* ---------- the numbers behind the report ---------- */
function facts(){ var e=LAB.cur, rows=LAB.rows, g=LAB.graphPts(), P=g.P, fit=P.length>1?LAB.linfit(P):null, reads=[];
  try{ reads=(e.read?e.read():[]).filter(function(r){ return r[1]!=null&&String(r[1])!==''&&String(r[1])!=='—'; }).map(function(r){ var v=String(r[1]); return [T(r[0]),/[가-힣]/.test(v)?T(v):v,r[2]?T(r[2]):'']; }); }catch(er){}
  var conds=e.params.filter(function(q){ return !q.show||q.show(e.p); }).map(function(q){ return [T(q.l),LAB.valText(q,e.p[q.id])]; });
  return {e:e, name:T(e.name), rows:rows, g:g, P:P, fit:fit, reads:reads, conds:conds}; }
/* the template: sentences filled with the numbers only, nothing guessed */
function template(){ var f=facts(), n=f.rows.length, o={}, ys=f.P.map(function(p){ return p[1]; });
  o.purpose=F('「{0}」 실험으로 다음 내용을 탐구한다: {1}',f.name,T(f.e.desc));
  o.method=F('실험 화면에서 조건을 {0}(으)로 맞추었다.',f.conds.map(function(c){ return c[0]+' '+c[1]; }).join(', '))+' '+(n?F('값을 바꾸어 가며 {0}번 기록했고, {1}을(를) 가로축, {2}을(를) 세로축으로 하여 그래프를 그렸다.',n,f.g.xl,f.g.yl):T('아직 기록한 값은 없다.'));
  var res=[]; if(f.reads.length) res.push(F('지금 화면의 측정값은 {0}이다.',f.reads.map(function(r){ return r[0]+' '+r[1]+(r[2]?' '+r[2]:''); }).join(', ')));
  if(ys.length) res.push(F('기록한 값에서 {0}은(는) 가장 작을 때 {1}, 가장 클 때 {2}이다.',f.g.yl,sig(Math.min.apply(null,ys)),sig(Math.max.apply(null,ys))));
  if(f.fit) res.push(F('추세선은 기울기 {0}, y절편 {1}, R² {2}이다.',sig(f.fit.m),sig(f.fit.b),sig(f.fit.r2)));
  o.result=res.join(' ')||T('기록한 값이 없어서 화면의 값만 적을 수 있다.');
  var con=[]; if(f.fit){ con.push(f.fit.r2>=0.95?T('점들이 추세선에 매우 가까워서 두 값은 거의 직선 관계로 볼 수 있다.'):f.fit.r2>=0.8?T('점들이 추세선에 꽤 가깝지만 흩어진 정도가 있다.'):T('점들이 추세선에서 많이 떨어져 있어서 직선 관계라고 말하기 어렵다.'));
    if(f.e.fitHint){ try{ var h=f.e.fitHint(f.fit.m,f.fit.b,f.g.xk,f.g.yk); if(h){ h=T(h); con.push(/[.!?。]$/.test(h)?h:h+'.'); } }catch(er){} } }
  else con.push(T('값을 더 기록하면 규칙을 확인할 수 있다.'));
  con.push(T('알게 된 점과 오차의 이유를 여기에 직접 적어 보자.')); o.conclusion=con.join(' ');
  return o; }

/* ---------- the report page (one self-contained .html) ---------- */
function reportHTML(title,txt){ var f=facts(), now=new Date(), img=LAB.graphImage(640,340), CSS=
  'body{font:14px/1.7 "Noto Sans KR","Apple SD Gothic Neo",system-ui,sans-serif;color:#1a1d26;max-width:760px;margin:0 auto;padding:28px 24px}h1{font-size:22px;margin:0 0 4px}.meta{color:#5b6475;font-size:12.5px;margin-bottom:14px}'
  +'h2{font-size:15px;margin:16px 0 4px;padding-bottom:3px;border-bottom:2px solid #ffc93c}p{margin:0 0 6px;white-space:pre-wrap}table{border-collapse:collapse;margin:6px 0;font-size:12.5px}th,td{border:1px solid #c9ced8;padding:3px 9px;text-align:right}th{background:#f1f3f7}'
  +'img{max-width:100%;border:1px solid #c9ced8;margin-top:6px}.foot{margin-top:18px;color:#8a93a6;font-size:11.5px}@page{size:A4;margin:16mm}@media print{body{padding:0}}';
  function sec(i,body){ return '<h2>'+esc(T(KEYS[i][1]))+'</h2><p>'+esc(txt[KEYS[i][0]]||'')+'</p>'+(body||''); }
  var cond='<table>'+f.conds.map(function(c){ return '<tr><th>'+esc(c[0])+'</th><td>'+esc(c[1])+'</td></tr>'; }).join('')+'</table>';
  var tb=''; if(f.rows.length){ var cols=f.e.cols, shownR=f.rows.slice(0,40);
    tb='<table><tr><th>#</th>'+cols.map(function(c){ return '<th>'+esc(LAB.colTitle(c))+'</th>'; }).join('')+'</tr>'
      +shownR.map(function(r,i){ return '<tr><td>'+(i+1)+'</td>'+r.map(function(v,j){ return '<td>'+esc(LAB.H.fmt(v,cols[j].d))+'</td>'; }).join('')+'</tr>'; }).join('')+'</table>'
      +(f.rows.length>shownR.length?'<p class="meta">'+esc(F('기록 {0}줄 가운데 앞의 {1}줄만 실었어요',f.rows.length,shownR.length))+'</p>':''); }
  var ft=f.fit?'<p class="meta">'+esc(F('추세선: 기울기 {0} · y절편 {1} · R² {2}',sig(f.fit.m),sig(f.fit.b),sig(f.fit.r2)))+'</p>':'';
  return '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>'+CSS+'</style></head><body>'
    +'<h1>'+esc(title)+'</h1><div class="meta">'+esc(now.getFullYear()+'.'+(now.getMonth()+1)+'.'+now.getDate()+' · '+f.name+' · Fry Lab')+'</div>'
    +sec(0)+sec(1,cond)+sec(2,tb+(img?'<img src="'+img+'" alt="'+esc(T('그래프'))+'">':'')+ft)+sec(3)+'<div class="foot">'+esc(T('Fry Lab에서 만든 보고서'))+'</div></body></html>'; }
function saveHTML(html){ var b=new Blob([html],{type:'text/html;charset=utf-8'}), u=URL.createObjectURL(b), a=document.createElement('a'); a.href=u; a.download='fry-lab-report-'+LAB.cur.id+'.html'; a.style.display='none'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(u); a.remove(); },4000); }
function printHTML(html){ var fr=document.createElement('iframe'); fr.setAttribute('aria-hidden','true'); fr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  fr.onload=function(){ try{ fr.contentWindow.focus(); fr.contentWindow.print(); }catch(e){ LAB.toast(T('인쇄 창을 열지 못했어요. .html 받기를 써 주세요')); } setTimeout(function(){ fr.remove(); },120000); };
  fr.srcdoc=html; document.body.appendChild(fr); }

/* ---------- report window ---------- */
function openReport(opener){
  if(!LAB.cur) return; from0=opener||null; var box=dialog('실험 보고서','한 쪽짜리 보고서를 만들어요. 글은 직접 고칠 수 있어요','repBox'), body=el('div','repBody'), TA={};
  var tl=el('label','',T('보고서 제목')); tl.htmlFor='repTitle'; var ti=el('input','txin'); ti.id='repTitle'; ti.type='text'; ti.maxLength=60; ti.value=F('{0} 실험 보고서',LAB.cur.name?T(LAB.cur.name):''); ti.setAttribute('data-notr',''); body.appendChild(tl); body.appendChild(ti);
  KEYS.forEach(function(k){ var l=el('label','',T(k[1])+' · '+T(k[2])), ta=el('textarea'); ta.id='rep_'+k[0]; l.htmlFor=ta.id; ta.setAttribute('data-notr',''); TA[k[0]]=ta; body.appendChild(l); body.appendChild(ta); });
  var row=el('div','repRow'), st=el('div','repSt'); st.setAttribute('aria-live','polite'); body.appendChild(row); body.appendChild(st);
  var im=LAB.graphImage(640,340); if(im){ body.appendChild(el('label','',T('보고서에 들어갈 그래프'))); var g=el('img','repImg'); g.src=im; g.alt=T('그래프'); body.appendChild(g); }
  function fill(o){ KEYS.forEach(function(k){ if(o[k[0]]!=null) TA[k[0]].value=o[k[0]]; }); }
  function texts(){ var o={}; KEYS.forEach(function(k){ o[k[0]]=TA[k[0]].value; }); return o; }
  fill(template());
  var tpl=btn('기본 양식으로 채우기','',function(){ fill(template()); st.textContent=T('숫자로 양식을 채웠어요'); });
  var ai=btn('✨ AI로 초안 쓰기','aib',null), stop=btn('멈추기','',function(){ if(window.LABAI) LABAI.stop(); }); stop.hidden=true;
  ai.onclick=function(){
    if(!window.LABAI||!window.FFAI||!LAB.cur){ st.textContent=T('AI를 쓸 수 없어요'); return; }
    var bak=texts(); busyAI=true; ai.disabled=tpl.disabled=true; stop.hidden=false; st.textContent=T('AI가 초안을 쓰는 중…');
    LABAI.draft(function(o){ ['purpose','method','result','conclusion'].forEach(function(k){ if(o[k]) TA[k].value=o[k]; }); })
      .then(function(o){ if(!['purpose','method','result','conclusion'].some(function(k){ return o[k]; })){ if(o.raw.trim()){ fill(bak); TA.result.value=o.raw.trim(); st.textContent=T('AI가 형식을 지키지 않아서 글 전체를 결과 칸에 넣었어요. 나눠서 고쳐 주세요'); } else { fill(bak); st.textContent=T('AI가 답하지 않았어요'); } return; }
          fill(o); st.textContent=T('AI가 쓴 초안을 넣었어요. 숫자와 내용을 꼭 확인하고 고쳐 쓰세요'); },
        function(e){ fill(bak); st.textContent=e&&e.kind==='stop'?T('멈췄어요. 쓰던 글은 원래대로 돌려놨어요'):e&&e.kind==='nokey'?T('AI 설정이 없어요. 기본 양식은 그대로 쓸 수 있어요'):(e&&e.message)||T('AI에 연결하지 못했어요'); })
      .then(function(){ busyAI=false; ai.disabled=tpl.disabled=false; stop.hidden=true; }); };
  row.appendChild(tpl); row.appendChild(ai); row.appendChild(stop);
  body.appendChild(el('p','aiNote',T('AI 초안은 틀릴 수 있어요. 기록한 숫자와 맞는지 확인한 뒤 내 말로 고쳐 쓰세요.')));
  box.appendChild(body);
  var foot=el('div','repFoot'); function doc(){ return reportHTML(ti.value.trim()||T('실험 보고서'),texts()); }
  foot.appendChild(btn('.html 받기','',function(){ saveHTML(doc()); LAB.toast(T('보고서 파일을 받았어요')); }));
  foot.appendChild(btn('인쇄 · PDF 저장','pri',function(){ printHTML(doc()); }));
  foot.appendChild(btn('닫기','',close)); box.appendChild(foot); setTimeout(function(){ TA.purpose.focus(); },30);
}

/* ---------- share window ---------- */
function copyText(s){ var ok=function(){ LAB.toast(T('링크를 복사했어요')); }, fb=function(){ var ta=el('textarea'); ta.value=s; ta.setAttribute('readonly',''); ta.style.cssText='position:fixed;left:-9999px'; document.body.appendChild(ta); ta.select(); var r=false; try{ r=document.execCommand('copy'); }catch(e){} ta.remove(); if(r) ok(); else LAB.toast(T('복사하지 못했어요. 링크를 눌러 직접 복사해 주세요')); };
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(ok,fb); else fb(); }
function openShare(opener){
  if(!LAB.cur) return; from0=opener||null; LAB.saveNow(); var box=dialog('실험 공유 링크','지금 실험과 값을 링크 하나로 보내요','repBox'), body=el('div','repBody'), n=LAB.rows.length, url='';
  var inp=el('input','shLink'); inp.readOnly=true; inp.setAttribute('aria-label',T('공유 링크')); inp.setAttribute('data-notr',''); inp.onfocus=function(){ inp.select(); };
  var cb=null, small=n&&LAB.shareURL(true).length<=1800;
  if(n){ var lb=el('label','chk'), c=el('input'); c.type='checkbox'; c.checked=!!small; c.disabled=LAB.shareURL(true).length>6000; cb=c; lb.appendChild(c); lb.appendChild(document.createTextNode(F('기록 {0}줄도 함께 넣기',Math.min(n,100)))); lb.style.cssText='font-size:13.5px;color:var(--text)'; body.appendChild(lb); }
  var qr=el('canvas','shQr'), note=el('div','repSt'), cp=btn('링크 복사','pri',function(){ copyText(url); });
  function upd(){ url=LAB.shareURL(!!(cb&&cb.checked)); inp.value=url; var q=null; try{ q=window.FFQR&&FFQR.make(url); }catch(e){} qr.hidden=!q;
    if(q) FFQR.draw(qr,q,Math.max(2,Math.floor(300/(q.size+8))));
    note.textContent=F('링크 길이 {0}자',url.length)+' · '+(q?T('폰 카메라로 QR을 비추면 바로 열려요'):T('링크가 길어서 QR은 만들 수 없어요. 링크를 복사해서 보내 주세요'))+(cb&&cb.disabled?' · '+T('기록이 많아서 링크에는 넣지 않았어요'):''); }
  if(cb) cb.onchange=upd; body.appendChild(inp); body.appendChild(qr); body.appendChild(note);
  body.appendChild(el('p','aiNote',T('링크를 연 사람의 화면에 같은 실험이 같은 값으로 열려요. 받는 사람의 기존 기록은 지워지지 않아요.')));
  box.appendChild(body); upd(); var foot=el('div','repFoot'); foot.appendChild(cp); foot.appendChild(btn('닫기','',close)); box.appendChild(foot); setTimeout(function(){ cp.focus(); },30);
}
document.addEventListener('DOMContentLoaded',function(){ var r=$('repBtn'), s=$('shareBtn'); if(r) r.onclick=function(){ openReport(r); }; if(s) s.onclick=function(){ openShare(s); }; });
window.LABREP={openReport:openReport, openShare:openShare, close:close, template:template, html:reportHTML};
})();
