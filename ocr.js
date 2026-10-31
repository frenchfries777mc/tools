/* Fry OCR: reads the text in a photo, inside the browser (tesseract.js 5.1.1, Apache 2.0, files in lib/tesseract/). Shared by Docs and Sheet.
   FFOCR.read(file, onProgress) -> Promise<string>. file is an image File or Blob; onProgress(fraction 0..1, stage) with stage 'load' | 'lang' | 'read'.
   Korean and English are read together. The language data (a few MB, saved in the browser after the first time) comes from jsDelivr;
   set FFOCR.langPath before reading to use another folder. */
(function(){
'use strict';
var BASE=(document.currentScript&&document.currentScript.src||'').replace(/[^/?#]*([?#].*)?$/,'');
var FFOCR={ langs:'kor+eng', langPath:'https://cdn.jsdelivr.net/gh/naptha/tessdata@gh-pages/4.0.0_best_int', maxSide:2400 };
var loading=null;
function lib(){ if(window.Tesseract) return Promise.resolve();
  if(!loading) loading=new Promise(function(ok,no){ var s=document.createElement('script'); s.src=BASE+'lib/tesseract/tesseract.min.js'; s.onload=ok; s.onerror=function(){ loading=null; no(new Error('ocr lib')); }; document.head.appendChild(s); });
  return loading; }
/* a photo is shrunk to a sane size first: phone photos are huge and reading time grows with the pixels */
function picture(file){ return new Promise(function(ok,no){ var u=URL.createObjectURL(file), im=new Image();
  im.onerror=function(){ URL.revokeObjectURL(u); no(new Error('ocr image')); };
  im.onload=function(){ URL.revokeObjectURL(u); var k=Math.min(1,FFOCR.maxSide/Math.max(im.naturalWidth,im.naturalHeight)), c=document.createElement('canvas'); c.width=Math.max(1,Math.round(im.naturalWidth*k)); c.height=Math.max(1,Math.round(im.naturalHeight*k));
    var g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); g.drawImage(im,0,0,c.width,c.height); ok(c); };
  im.src=u; }); }
FFOCR.read=function(file,onProgress){
  var worker=null, stage='load', W={load:[0,.1],lang:[.1,.4],read:[.4,1]};
  function tell(p,st){ if(st) stage=st; if(onProgress){ var w=W[stage]; try{ onProgress(Math.min(1,w[0]+(w[1]-w[0])*(p||0)),stage); }catch(e){} } }
  function log(m){ var s=m.status||''; if(/loading tesseract core|initializing tesseract/.test(s)) tell(m.progress,'load'); else if(/language/.test(s)) tell(m.progress,'lang'); else if(/recognizing/.test(s)) tell(m.progress,'read'); }
  tell(0,'load');
  return Promise.all([lib(),picture(file)]).then(function(r){ var img=r[1];
    return Tesseract.createWorker(FFOCR.langs,1,{ workerPath:BASE+'lib/tesseract/worker.min.js', corePath:BASE+'lib/tesseract/', langPath:FFOCR.langPath, logger:log, workerBlobURL:false }).then(function(w){ worker=w;
      return w.recognize(img); }); })
  .then(function(res){ var t=String(res&&res.data&&res.data.text||''); return worker.terminate().then(function(){ return tidy(t); },function(){ return tidy(t); }); },
    function(e){ if(worker) try{ worker.terminate(); }catch(x){} throw e; }); };
/* trailing blanks and runs of empty lines out; the line breaks stay as read */
function tidy(t){ return t.replace(/\r/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim(); }
window.FFOCR=FFOCR;
})();
