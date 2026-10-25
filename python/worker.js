/* Fry Python worker: runs Python (Pyodide) away from the page so a long loop never freezes it; 멈추기 ends the worker.
   Messages in:  {run:{code, stdin:[lines], id}}
   Messages out: {ready}, {loading:text}, {out:text, err:bool}, {turtle:json}, {plot:json}, {done:{id, ok, error, line}} */
var PY='https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';
var py=null, booting=null, LIB=['turtle.py','matplotlib/__init__.py','matplotlib/pyplot.py'];
function post(m){ self.postMessage(m); }
function boot(){
  if(booting) return booting;
  booting=(async function(){
    post({loading:'파이썬을 불러오는 중…'});
    importScripts(PY+'pyodide.js');
    py=await loadPyodide({indexURL:PY});
    py.FS.mkdirTree('/fry/matplotlib');
    var v=self.location.search||'';
    for(var i=0;i<LIB.length;i++){ var r=await fetch('lib/'+LIB[i]+v); py.FS.writeFile('/fry/'+LIB[i],await r.text()); }
    py.registerJsModule('_fry',{
      turtle:function(j){ post({turtle:j}); },
      plot:function(j){ post({plot:j}); }
    });
    py.runPython("import sys, builtins\nsys.path.insert(0,'/fry')\n"+
      "def _fry_input(prompt=''):\n"+
      "    v=sys.stdin.readline()\n"+
      "    if not v: raise EOFError('입력값이 모자라요. 아래 \"입력값\" 칸에 한 줄에 하나씩 적어 주세요.')\n"+
      "    v=v.rstrip('\\n')\n"+
      "    print(str(prompt)+v)\n"+
      "    return v\n"+
      "builtins.input=_fry_input\n");
    post({ready:true});
  })();
  return booting;
}
var outBuf='', errBuf='', outT=null;
function flushOut(){ if(outBuf){ post({out:outBuf}); outBuf=''; } if(errBuf){ post({out:errBuf, err:true}); errBuf=''; } outT=null; }
function queue(){ if(!outT) outT=setTimeout(flushOut,40); }
self.onmessage=async function(e){
  var m=e.data||{};
  if(m.boot){ try{ await boot(); }catch(err){ post({fail:String(err&&err.message||err)}); } return; }
  if(!m.run) return;
  try{ await boot(); }catch(err){ post({fail:String(err&&err.message||err)}); return; }
  var stdin=(m.run.stdin||[]).slice(), id=m.run.id, code=m.run.code;
  py.setStdout({batched:function(s){ outBuf+=s+'\n'; if(outBuf.length>20000) flushOut(); else queue(); }});
  py.setStderr({batched:function(s){ errBuf+=s+'\n'; queue(); }});
  py.setStdin({stdin:function(){ if(!stdin.length){ post({needInput:true}); return null; } return stdin.shift(); }, autoEOF:true});
  try{
    var imports=[]; try{ imports=py.pyodide_py.code.find_imports(code).toJs(); }catch(x){}
    var want=imports.filter(function(n){ return /^(numpy|pandas|scipy|sympy|networkx)$/.test(n); });
    if(want.length){ post({loading:want.join(', ')+' 불러오는 중…'}); await py.loadPackage(want); post({loading:''}); }
    py.globals.set('__fry_src',code);
    await py.runPythonAsync(
      "import sys\n"+
      "for _k in [k for k in list(sys.modules) if k=='turtle' or k.startswith('matplotlib')]: del sys.modules[_k]\n"+  // fresh drawing state each run
      "import linecache\n"+
      "linecache.cache['<코드>']=(len(__fry_src),None,[l+'\\n' for l in __fry_src.split('\\n')],'<코드>')\n"+
      "__fry_g={'__name__':'__main__'}\n"+
      "try:\n"+
      "    exec(compile(__fry_src,'<코드>','exec'),__fry_g)\n"+
      "finally:\n"+
      "    for _k in ('turtle','matplotlib.pyplot'):\n"+
      "        if _k in sys.modules: sys.modules[_k]._flush()\n");
    flushOut(); post({done:{id:id, ok:true}});
  }catch(err){
    flushOut(); var msg=String(err&&err.message||err), lines=msg.replace(/\s+$/,'').split('\n'), keep=[], seen=false;
    // keep the user's part of the traceback: from the first "<코드>" frame on, without Pyodide's own frames
    for(var i=0;i<lines.length;i++){ var L=lines[i];
      if(/^\s*File "<코드>"/.test(L)) seen=true;
      if(!seen) continue;
      if(/^\s*File "/.test(L)&&!/<코드>/.test(L)){ if(lines[i+1]&&/^\s{4}/.test(lines[i+1])&&!/^\s*File "/.test(lines[i+1])) i++; continue; }
      keep.push(L); }
    var last=lines[lines.length-1]||msg, ln=null, mm, re=/File "<코드>", line (\d+)/g;
    while((mm=re.exec(msg))) ln=+mm[1];
    var shown=seen?'Traceback (most recent call last):\n'+keep.join('\n'):last;
    post({done:{id:id, ok:false, error:shown, last:last, line:ln}});
  }
};
