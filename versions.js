/* Frenchfries777 Tools 버전 기록 (FFVer): named snapshots of a document kept in this browser (localStorage), shared by
   Fry Sheet, Fry Slides and Block HTML. A tool gives the document's snapshot string and a way to put one back; this file keeps
   the list, saves automatic versions now and then, and draws the dialog (no browser pop-ups: restore asks twice on the button).
   Works in the browser (FFVer) and in Node (module.exports, storage passed in) for the tests. */
(function(root){
'use strict';
var MAX=15, MAXAUTO=4, AUTO_MS=30*60*1000, MAXLEN=600000, PRE='ffver.v1.';
function ls(){ try{ return root.localStorage; }catch(e){ return null; } }
function read(key,st){ st=st||ls(); try{ var a=JSON.parse(st.getItem(PRE+key)||'[]'); return Array.isArray(a)?a.filter(function(x){ return x&&typeof x.d==='string'; }):[]; }catch(e){ return []; } }
function write(key,list,st){
  st=st||ls(); if(!st) return false;
  while(list.length){ try{ st.setItem(PRE+key,JSON.stringify(list)); return true; }catch(e){ list.pop(); } }   // full: drop the oldest until it fits
  try{ st.removeItem(PRE+key); }catch(e){} return false;
}
function trim(list){
  var auto=0; list=list.filter(function(x){ if(!x.auto) return true; return ++auto<=MAXAUTO; });
  return list.slice(0,MAX);
}
function newId(){ return Date.now().toString(36)+Math.floor(Math.random()*1296).toString(36); }
/* newest first. Returns the saved entry, or null when the data is too big or storage is full */
function save(key,name,data,auto,st,now){
  data=String(data); if(data.length>MAXLEN) return null;
  var list=read(key,st), e={id:newId(),t:now||Date.now(),name:String(name||'').slice(0,40),d:data}; if(auto) e.auto=1;
  list.unshift(e); list=trim(list);
  return write(key,list,st)&&read(key,st).some(function(x){ return x.id===e.id; })?e:null;
}
function remove(key,id,st){ write(key,read(key,st).filter(function(x){ return x.id!==id; }),st); }
/* call after every save of the document: an automatic version is kept when the content changed and the last version is old enough */
function tick(key,get,st,now){
  now=now||Date.now(); var list=read(key,st), last=list[0], d; if(last&&now-last.t<AUTO_MS) return false;
  try{ d=String(get()); }catch(e){ return false; } if(last&&last.d===d) return false;
  return !!save(key,'',d,true,st,now);
}
function ago(t,now){ var s=Math.max(0,((now||Date.now())-t)/1000);
  if(s<60) return '방금'; if(s<3600) return Math.floor(s/60)+'분 전'; if(s<86400) return Math.floor(s/3600)+'시간 전'; if(s<86400*30) return Math.floor(s/86400)+'일 전'; return Math.floor(s/86400/30)+'달 전'; }
var api={save:save,list:read,remove:remove,tick:tick,ago:ago,MAX:MAX,MAXAUTO:MAXAUTO,AUTO_MS:AUTO_MS};
if(typeof module!=='undefined'&&module.exports){ module.exports=api; return; }

/* ---------- dialog (browser only) ---------- */
var T=function(s){ return root.FFT&&FFT.T?FFT.T(s):s; };
/* the dialog's words in every language (Fry Sheet, Fry Slides and Block HTML all load this file) */
if(root.FFT&&FFT.add) FFT.add({
"버전":["Versions", "Versiones", "Versions", "Versionen", "バージョン", "版本", "Versões", "Версии", "Sürümler", "Versions", "버전들", "Versioni", "Wersje", "الإصدارات"],
"저장해 둔 예전 버전으로 되돌려요":["Go back to an older version you saved", "Vuelve a una versión anterior guardada", "Revenir à une ancienne version enregistrée", "Zu einer früher gespeicherten Version zurückkehren", "保存しておいた前のバージョンに戻します", "恢复到之前保存的版本", "Volte para uma versão antiga que você salvou", "Вернуться к сохранённой ранее версии", "Kaydettiğin eski bir sürüme dön", "Go back to oldkept version", "가다 뒤로 에게 하나의 늙은 버전 너 구했다", "Torna a una versione precedente salvata", "Wróć do zapisanej wcześniej wersji", "العودة إلى إصدار قديم محفوظ"],
"버전 기록":["Version history", "Historial de versiones", "Historique des versions", "Versionsverlauf", "バージョン履歴", "版本记录", "Histórico de versões", "История версий", "Sürüm geçmişi", "Version record", "버전 역사", "Cronologia versioni", "Historia wersji", "سجل الإصدارات"],
"이 브라우저에만 저장돼요. 30분이 지나 내용이 바뀌면 자동 버전도 남아요.":["Saved only in this browser. When 30 minutes have passed and the content has changed, an automatic version is kept too.", "Se guarda solo en este navegador. Si pasan 30 minutos y el contenido cambió, también se guarda una versión automática.", "Enregistré uniquement dans ce navigateur. Après 30 minutes, si le contenu a changé, une version automatique est aussi gardée.", "Nur in diesem Browser gespeichert. Sind 30 Minuten vergangen und hat sich der Inhalt geändert, wird auch automatisch eine Version angelegt.", "このブラウザにだけ保存されます。30分たって内容が変わっていれば、自動のバージョンも残ります。", "只保存在此浏览器中。超过 30 分钟且内容有变化时，也会自动保存一个版本。", "Fica salvo só neste navegador. Depois de 30 minutos, se o conteúdo mudou, uma versão automática também é guardada.", "Хранится только в этом браузере. Если прошло 30 минут и содержимое изменилось, версия сохраняется и автоматически.", "Yalnızca bu tarayıcıda kaydedilir. 30 dakika geçip içerik değiştiyse otomatik bir sürüm de tutulur.", "Kept only in this browser. After 30 minutes, if changed, an autoversion is kept too.", "구한 오직 안에 이 브라우저. 언제 30 분들 가지다 지나간 그리고 그 만족한 가지다 바뀐, 하나의 자동적인 버전 이다 유지된 너무.", "Salvato solo in questo browser. Dopo 30 minuti, se il contenuto è cambiato, viene salvata anche una versione automatica.", "Zapisywane tylko w tej przeglądarce. Gdy minie 30 minut i treść się zmieni, zostaje też wersja automatyczna.", "تُحفظ في هذا المتصفح فقط. بعد مرور 30 دقيقة وتغيّر المحتوى، يُحفظ إصدار تلقائي أيضًا."],
"버전 이름 (비워도 돼요)":["Version name (optional)", "Nombre de la versión (opcional)", "Nom de la version (facultatif)", "Versionsname (optional)", "バージョン名（空でもOK）", "版本名称（可留空）", "Nome da versão (opcional)", "Название версии (необязательно)", "Sürüm adı (isteğe bağlı)", "Version name (maybe)", "버전 이름 (선택적인)", "Nome della versione (facoltativo)", "Nazwa wersji (opcjonalnie)", "اسم الإصدار (اختياري)"],
"지금 상태 저장":["Save current state", "Guardar estado actual", "Enregistrer l’état actuel", "Aktuellen Stand speichern", "今の状態を保存", "保存当前状态", "Salvar estado atual", "Сохранить текущее состояние", "Şimdiki hâli kaydet", "Keep nowstate", "구하다 현재의 상태", "Salva lo stato attuale", "Zapisz obecny stan", "حفظ الحالة الحالية"],
"내가 저장한 버전":["My saved version", "Mi versión guardada", "Ma version enregistrée", "Meine gespeicherte Version", "自分で保存したバージョン", "我保存的版本", "Minha versão salva", "Моя сохранённая версия", "Kaydettiğim sürüm", "My kept version", "나의 구한 버전", "La mia versione salvata", "Moja zapisana wersja", "إصداري المحفوظ"],
"버전을 저장했어요":["Version saved", "Versión guardada", "Version enregistrée", "Version gespeichert", "バージョンを保存しました", "已保存版本", "Versão salva", "Версия сохранена", "Sürüm kaydedildi", "Version kept", "버전 구한", "Versione salvata", "Zapisano wersję", "تم حفظ الإصدار"],
"저장하지 못했어요. 문서가 너무 크거나 저장 공간이 부족해요":["Could not save. The document is too big or storage is full", "No se pudo guardar. El documento es demasiado grande o no queda espacio", "Impossible d’enregistrer. Le document est trop gros ou l’espace de stockage est plein", "Speichern nicht möglich. Das Dokument ist zu groß oder der Speicher ist voll", "保存できませんでした。文書が大きすぎるか、保存容量が足りません", "无法保存。文档太大或存储空间不足", "Não foi possível salvar. O documento é grande demais ou o espaço acabou", "Не удалось сохранить. Документ слишком большой или хранилище заполнено", "Kaydedilemedi. Belge çok büyük ya da depolama alanı dolu", "Unkept. Doc too big or keepspace full", "할 수 있었다 아니다 구하다. 그 문서 이다 너무 큰 또는 저장 이다 가득한", "Impossibile salvare. Il documento è troppo grande o lo spazio è pieno", "Nie udało się zapisać. Dokument jest za duży albo brak miejsca", "تعذّر الحفظ. المستند كبير جدًا أو مساحة التخزين ممتلئة"],
"자동 저장":["Autosave", "Guardado automático", "Enregistrement auto", "Automatisch gespeichert", "自動保存", "自动保存", "Salvamento automático", "Автосохранение", "Otomatik kayıt", "Autokeep", "자동차 구하다", "Salvataggio automatico", "Zapis automatyczny", "حفظ تلقائي"],
"이름 없는 버전":["Unnamed version", "Versión sin nombre", "Version sans nom", "Unbenannte Version", "名前のないバージョン", "未命名版本", "Versão sem nome", "Версия без названия", "Adsız sürüm", "Unnamed version", "이름 지어지지 않은 버전", "Versione senza nome", "Wersja bez nazwy", "إصدار بلا اسم"],
"정말요?":["Sure?", "¿Seguro?", "Sûr ?", "Sicher?", "本当に？", "确定吗？", "Certeza?", "Точно?", "Emin misin?", "Plustrue?", "확실한?", "Sicuro?", "Na pewno?", "متأكد؟"],
"되돌리기 전 상태":["Before going back", "Antes de restaurar", "Avant le retour", "Vor dem Zurücksetzen", "戻す前の状態", "恢复前的状态", "Antes de voltar", "До возврата", "Geri almadan önce", "Before goback", "전에 가는 뒤로", "Prima del ripristino", "Przed przywróceniem", "قبل الاستعادة"],
"되돌리지 못했어요":["Could not go back", "No se pudo restaurar", "Impossible de revenir", "Zurücksetzen nicht möglich", "戻せませんでした", "无法恢复", "Não foi possível voltar", "Не удалось вернуть", "Geri alınamadı", "Ungoback", "할 수 있었다 아니다 가다 뒤로", "Impossibile ripristinare", "Nie udało się przywrócić", "تعذّرت الاستعادة"],
"이 버전으로 되돌렸어요":["Went back to this version", "Se restauró esta versión", "Retour à cette version effectué", "Auf diese Version zurückgesetzt", "このバージョンに戻しました", "已恢复到此版本", "Voltou para esta versão", "Возвращена эта версия", "Bu sürüme geri dönüldü", "Wentback to this version", "갔다 뒤로 에게 이 버전", "Ripristinata questa versione", "Przywrócono tę wersję", "تمت العودة إلى هذا الإصدار"],
"아직 저장된 버전이 없어요":["No saved versions yet", "Aún no hay versiones guardadas", "Aucune version enregistrée pour l’instant", "Noch keine gespeicherten Versionen", "保存されたバージョンはまだありません", "还没有保存的版本", "Ainda não há versões salvas", "Сохранённых версий пока нет", "Henüz kaydedilmiş sürüm yok", "No kept versions yet", "아니다 구한 버전들 아직", "Ancora nessuna versione salvata", "Brak zapisanych wersji", "لا توجد إصدارات محفوظة بعد"],
"시트 {0}개 칸 {1}개":["{0} sheets, {1} cells", "{0} hojas, {1} celdas", "{0} feuilles, {1} cellules", "{0} Blätter, {1} Zellen", "シート{0}枚・セル{1}個", "{0} 个工作表，{1} 个单元格", "{0} planilhas, {1} células", "листов: {0}, ячеек: {1}", "{0} sayfa, {1} hücre", "{0} sheets, {1} boxes", "{0} 시트들, {1} 세포들", "{0} fogli, {1} celle", "arkusze: {0}, komórki: {1}", "{0} أوراق، {1} خلايا"],
"슬라이드 {0}장":["{0} slides", "{0} diapositivas", "{0} diapositives", "{0} Folien", "スライド{0}枚", "{0} 张幻灯片", "{0} slides", "слайдов: {0}", "{0} slayt", "{0} slides", "{0} 미끄럼틀들", "{0} diapositive", "slajdy: {0}", "{0} شرائح"],
"블록 {0}개":["{0} blocks", "{0} bloques", "{0} blocs", "{0} Blöcke", "ブロック{0}個", "{0} 个积木", "{0} blocos", "блоков: {0}", "{0} blok", "{0} blockthings", "{0} 구역들", "{0} blocchi", "bloki: {0}", "{0} كتل"]
});
function css(){ if(document.getElementById('ffverCss')) return; var s=document.createElement('style'); s.id='ffverCss';
  s.textContent='.ffv{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px}'+
  '.ffv>div{background:Canvas;color:CanvasText;border:1px solid rgba(128,128,128,.4);border-radius:14px;width:min(440px,100%);max-height:86vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.4);font:14px/1.4 system-ui,sans-serif}'+
  '.ffv h3{margin:0;padding:14px 16px 6px;font-size:16px}.ffv .ffvs{padding:0 16px 8px;opacity:.7;font-size:12px}'+
  '.ffv .ffvn{display:flex;gap:6px;padding:4px 16px 10px}.ffv input{flex:1;min-width:0;padding:7px 9px;border-radius:8px;border:1px solid rgba(128,128,128,.5);background:Field;color:FieldText;font:inherit}'+
  '.ffv button{padding:6px 10px;border-radius:8px;border:1px solid rgba(128,128,128,.5);background:ButtonFace;color:ButtonText;font:inherit;cursor:pointer}.ffv button.ffvd{border-color:#e5484d;color:#e5484d}'+
  '.ffv ul{list-style:none;margin:0;padding:0 16px;overflow:auto;flex:1}.ffv li{display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid rgba(128,128,128,.25)}'+
  '.ffv li .ffvt{flex:1;min-width:0}.ffv li b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ffv li small{opacity:.65}.ffv .ffvx{padding:10px 16px;text-align:right}.ffv .ffve{padding:14px 0;opacity:.65;text-align:center}';
  document.head.appendChild(s); }
/* o: {key, title, get():string, put(data), describe(data):string, toast(msg)} */
function open(o){
  css(); var ov=document.createElement('div'); ov.className='ffv'; var box=document.createElement('div'); ov.appendChild(box);
  function close(){ document.removeEventListener('keydown',kd,true); ov.remove(); } function kd(e){ if(e.key==='Escape'){ e.stopPropagation(); close(); } }
  document.addEventListener('keydown',kd,true); ov.addEventListener('mousedown',function(e){ if(e.target===ov) close(); });
  function el(t,c,x){ var e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; }
  function draw(){
    box.textContent=''; box.appendChild(el('h3','',T(o.title||'버전 기록')));
    box.appendChild(el('div','ffvs',T('이 브라우저에만 저장돼요. 30분이 지나 내용이 바뀌면 자동 버전도 남아요.')));
    var nr=el('div','ffvn'), ni=el('input'); ni.placeholder=T('버전 이름 (비워도 돼요)'); ni.maxLength=40; var nb=el('button','',T('지금 상태 저장'));
    nb.onclick=function(){ var e=save(o.key,ni.value.trim()||T('내가 저장한 버전'),o.get(),false); if(e){ if(o.toast) o.toast(T('버전을 저장했어요')); draw(); } else if(o.toast) o.toast(T('저장하지 못했어요. 문서가 너무 크거나 저장 공간이 부족해요')); };
    ni.onkeydown=function(e){ if(e.key==='Enter') nb.click(); }; nr.appendChild(ni); nr.appendChild(nb); box.appendChild(nr);
    var ul=el('ul'), list=read(o.key); if(!list.length) ul.appendChild(el('li','ffve',T('아직 저장된 버전이 없어요')));
    list.forEach(function(v){ var li=el('li'), tx=el('div','ffvt'); tx.appendChild(el('b','',v.name||(v.auto?T('자동 저장'):T('이름 없는 버전'))));
      var d=''; try{ d=o.describe?o.describe(v.d):''; }catch(e){} tx.appendChild(el('small','',T(ago(v.t))+(d?' · '+d:''))); li.appendChild(tx);
      var rb=el('button','',T('되돌리기')), armed=false; rb.onclick=function(){
        if(!armed){ armed=true; rb.textContent=T('정말요?'); setTimeout(function(){ armed=false; rb.textContent=T('되돌리기'); },3000); return; }
        save(o.key,T('되돌리기 전 상태'),o.get(),true); try{ o.put(v.d); }catch(e){ if(o.toast) o.toast(T('되돌리지 못했어요')); return; } if(o.toast) o.toast(T('이 버전으로 되돌렸어요')); close(); };
      var db=el('button','ffvd','✕'); db.title=T('지우기'); db.setAttribute('aria-label',T('지우기')); db.onclick=function(){ remove(o.key,v.id); draw(); };
      li.appendChild(rb); li.appendChild(db); ul.appendChild(li); });
    box.appendChild(ul); var x=el('div','ffvx'), cb=el('button','',T('닫기')); cb.onclick=close; x.appendChild(cb); box.appendChild(x); }
  draw(); document.body.appendChild(ov);
}
api.open=open; root.FFVer=api;
})(typeof window!=='undefined'?window:this);
