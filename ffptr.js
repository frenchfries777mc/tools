/* Fry pointers (접속자 표시): shared by the tools that work together (Docs, Slides, Sheet, Draw).
   While people work in one room it shows, at the top of the page, how many people are in and their names, and it shows the mouse pointer of every OTHER
   person in his or her own colour with the name beside it. Your own pointer is never drawn (the real mouse pointer is all you see).
     var p = FFPtr.mount({
        ref:   element the pointer positions are measured against (the paper, the slide, the grid, the canvas)
        layer: element the pointers are drawn into (must be positioned, usually the scrolling area; pointers scroll with it)
        area:  element that listens to the mouse (default: layer)
        top:   element of the header where the "접속자 3명 · 이름…" chip is put (before: put it in front of this child of top)
        yPx:   true = y is sent in pixels from the top of ref (a page that grows), false (default) = as a fraction of ref's height
        send(obj): sends {k:'ptr', x, y} to the others (x is a fraction of ref's width; x:null = pointer left)
        me(): my id,  peers(): [{id,name,color}]
     })
     p.got(fromId, obj)   a pointer message arrived       p.update()   the list of people changed       p.stop()   the room ended
   Messages are sent at most every 60 ms. A pointer that has not moved for 6 s fades away. */
(function(root){
'use strict';
if(!root.document||root.FFPtr) return;
var T=function(s){ return root.FFT&&root.FFT.T?root.FFT.T(s):s; };
var CSS='.ffp-lay{position:absolute;left:0;top:0;width:0;height:0;z-index:60;pointer-events:none}'
 +'.ffp-c{position:absolute;left:0;top:0;transition:opacity .25s;will-change:transform}.ffp-c svg{display:block;width:16px;height:20px;filter:drop-shadow(0 1px 1px rgba(0,0,0,.45))}'
 +'.ffp-c b{position:absolute;left:14px;top:14px;font:600 11px/1.2 system-ui,sans-serif;color:#fff;padding:2px 6px;border-radius:6px;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis}'
 +'.ffp-c.off{opacity:0}'
 +'.ffp-bar{display:inline-flex;align-items:center;gap:8px;min-width:0;max-width:100%;height:34px;padding:0 12px;border:1px solid var(--line,#333);border-radius:999px;background:var(--panel2,#1b1b1b);color:var(--text,#eee);font-size:13px;white-space:nowrap;flex:0 1 auto}'
 +'.ffp-bar[hidden]{display:none}.ffp-bar .n{font-weight:700;flex:0 0 auto}.ffp-bar .nm{display:inline-flex;align-items:center;gap:5px;min-width:0;overflow:hidden;text-overflow:ellipsis}'
 +'.ffp-bar i{display:inline-block;width:9px;height:9px;border-radius:50%;flex:0 0 auto}.ffp-bar .nm span{overflow:hidden;text-overflow:ellipsis}';
function css(){ if(document.getElementById('ffp-css')) return; var s=document.createElement('style'); s.id='ffp-css'; s.textContent=CSS; document.head.appendChild(s); }
function clamp(n,a,b){ return n<a?a:n>b?b:n; }
function mount(o){ css();
  var ref=o.ref, layer=o.layer, area=o.area||layer, yPx=!!o.yPx, cur={}, lastT=0, lastK='', pend=null, dead=false, bar=null, lay=null, timer=null, fade=setInterval(sweep,1000);
  function mine(){ return o.me?o.me():''; }
  function peers(){ var l=o.peers?o.peers():[]; return Array.isArray(l)?l:[]; }
  /* ---- the chip at the top ---- */
  function paintBar(){ if(!o.top) return; if(!bar){ bar=document.createElement('span'); bar.className='ffp-bar'; bar.setAttribute('data-notr',''); if(o.before&&o.before.parentNode===o.top) o.top.insertBefore(bar,o.before); else o.top.appendChild(bar); }
    var l=peers(); if(!l.length){ bar.hidden=true; return; } bar.hidden=false; var me=mine(); bar.innerHTML=''; var n=document.createElement('span'); n.className='n'; n.textContent=T('접속자')+' '+l.length+T('명'); bar.appendChild(n);
    var nm=document.createElement('span'); nm.className='nm'; var all=[];
    l.forEach(function(p){ var isMe=p.id===me, s=document.createElement('span'); s.style.cssText='display:inline-flex;align-items:center;gap:4px'; var d=document.createElement('i'); d.style.background=p.color||'#888'; s.appendChild(d); var t=document.createElement('span'); t.textContent=String(p.name||'?')+(isMe?' ('+T('나')+')':''); s.appendChild(t); nm.appendChild(s); all.push(t.textContent); });
    bar.appendChild(nm); bar.title=all.join(', '); }
  /* ---- other people's pointers ---- */
  function layerEl(){ if(lay&&lay.parentNode===layer) return lay; lay=document.createElement('div'); lay.className='ffp-lay'; layer.appendChild(lay); return lay; }
  function colorOf(id){ var l=peers(); for(var i=0;i<l.length;i++) if(l[i].id===id) return l[i]; return null; }
  function draw(){ if(dead) return; var L=layerEl(), me=mine(), keep={}, rr=ref.getBoundingClientRect(), lr=layer.getBoundingClientRect(), ox=rr.left-lr.left+(layer.scrollLeft||0), oy=rr.top-lr.top+(layer.scrollTop||0);
    Object.keys(cur).forEach(function(id){ var c=cur[id], p=colorOf(id); if(id===me||!p||c.x==null||rr.width<2){ if(c.el){ c.el.remove(); c.el=null; } return; }
      keep[id]=1; if(!c.el){ var e=document.createElement('div'); e.className='ffp-c'; e.innerHTML='<svg viewBox="0 0 16 20"><path d="M1 1l13 8.2-5.6 1.4L12 18l-2.6 1.2-3.5-7.3L1.5 15.5z" fill="'+(p.color||'#888')+'" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/></svg><b></b>'; L.appendChild(e); c.el=e; }
      var b=c.el.querySelector('b'); if(b.textContent!==p.name){ b.textContent=p.name; } b.style.background=p.color||'#888';
      var x=ox+clamp(c.x,-0.2,1.2)*rr.width, y=oy+(yPx?c.y:clamp(c.y,-0.2,1.2)*rr.height); c.el.style.transform='translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px)'; c.el.classList.toggle('off',Date.now()-c.t>6000); });
    Object.keys(cur).forEach(function(id){ if(!keep[id]&&cur[id].el){ cur[id].el.remove(); cur[id].el=null; } }); }
  function sweep(){ var now=Date.now(); Object.keys(cur).forEach(function(id){ var c=cur[id]; if(c.el&&now-c.t>6000) c.el.classList.add('off'); }); }
  function got(from,d){ if(dead||!d||from==null||from===mine()) return; if(d.x==null){ if(cur[from]&&cur[from].el){ cur[from].el.remove(); } delete cur[from]; return; }
    var x=+d.x, y=+d.y; if(!isFinite(x)||!isFinite(y)) return; var c=cur[from]||(cur[from]={}); c.x=x; c.y=yPx?clamp(y,-50,1e6):y; c.t=Date.now(); if(c.el) c.el.classList.remove('off'); draw(); }
  /* ---- my pointer: sent to the others, never drawn ---- */
  function point(e){ if(dead||!peers().length) return; var rr=ref.getBoundingClientRect(); if(rr.width<2) return; var x=(e.clientX-rr.left)/rr.width, y=yPx?(e.clientY-rr.top):(e.clientY-rr.top)/Math.max(1,rr.height);
    if(x<-0.2||x>1.2||(!yPx&&(y<-0.2||y>1.2))){ leave(); return; } x=+x.toFixed(4); y=yPx?Math.round(y):+y.toFixed(4); pend={k:'ptr',x:x,y:y}; var now=Date.now(); if(now-lastT>=60) flush(); else if(!timer) timer=setTimeout(flush,60-(now-lastT)); }
  function flush(){ timer=null; if(!pend||dead) return; var k=pend.x+','+pend.y; if(k===lastK){ pend=null; return; } lastK=k; lastT=Date.now(); var m=pend; pend=null; try{ o.send(m); }catch(e){} }
  function leave(){ if(dead) return; pend=null; if(lastK==='gone') return; lastK='gone'; try{ o.send({k:'ptr',x:null,y:null}); }catch(e){} }
  area.addEventListener('pointermove',point,true); area.addEventListener('pointerleave',leave,true); area.addEventListener('pointerdown',point,true);
  root.addEventListener('scroll',draw,true); root.addEventListener('resize',draw);
  paintBar();
  return { got:got, update:function(){ paintBar(); var ids={}; peers().forEach(function(p){ ids[p.id]=1; }); Object.keys(cur).forEach(function(id){ if(!ids[id]){ if(cur[id].el) cur[id].el.remove(); delete cur[id]; } }); draw(); },
    redraw:draw,
    stop:function(){ dead=true; clearInterval(fade); clearTimeout(timer); area.removeEventListener('pointermove',point,true); area.removeEventListener('pointerleave',leave,true); area.removeEventListener('pointerdown',point,true); root.removeEventListener('scroll',draw,true); root.removeEventListener('resize',draw); if(lay) lay.remove(); if(bar) bar.remove(); cur={}; } };
}
root.FFPtr={ mount:mount };
})(window);
