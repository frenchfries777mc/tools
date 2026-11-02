/* Frenchfries777 Tools: shows our own emoji logos in place of system emoji.
   The text stays in the page (transparent), so copy, search and code reading textContent still work. */
(function(){
  var M={
    '🔢':'numbers','🗂':'files','📄':'page','✍':'writing','✂':'scissors','🗒':'notepad','📝':'memo','🧒':'child','🍎':'apple','🔗':'link',
    '📐':'triruler','📏':'ruler','👆':'handup','🌈':'rainbow','🌙':'moon','📲':'phone','🔖':'bookmark','📑':'docs','🧮':'abacus','🥧':'pie',
    '🌡':'thermo','🌸':'blossom','🌑':'newmoon','🧺':'basket','🪣':'bucket','⚽':'ball','🔊':'speaker','🔇':'mute','🖨':'printer','🎚':'slider',
    '🐢':'turtle','📂':'folder','🎓':'student','🏫':'school','🥗':'salad','🔠':'abc','👾':'alien','☀':'sun','🔬':'microscope',
    '🟨':'sq_yellow','🟩':'sq_green','🟦':'sq_blue','🟪':'sq_purple','⬜':'sq_white',
    '🚀':'rocket','🏹':'bow','🏷':'tag','📋':'list','✏':'pencil','💬':'chat','🏆':'trophy','🪙':'coin','👥':'group','🔍':'search','🔎':'search',
    '🎉':'party','💡':'bulb','🗑':'trash','🎁':'gift','🎮':'gamepad','🚪':'door','📅':'calendar','🗓':'calendar','📊':'graph','📈':'graph',
    '📣':'megaphone','✅':'okcheck','🔥':'fire','👍':'like','👎':'dislike','🚩':'flag','❤':'heart','⭐':'star','🧑':'person','⚖':'scale',
    '⏸':'pause','📖':'book','🗡':'dagger','💀':'skull','👀':'eye','👋':'wave','🎭':'mask','💎':'gem','✨':'sparkle','🌐':'globe','🌍':'globe',
    '🌀':'swirl','🪐':'planet','✋':'hand','❓':'question','⚙':'gear','⚡':'bolt','🎲':'dice','🧪':'potion','🛠':'tools','🔧':'tools','⚠':'warn',
    '⏳':'hourglass','⌛':'hourglass','📌':'pin','🔄':'repeat','📉':'chartdown','🍁':'mapleleaf','🌧':'rain','💊':'pill','🌳':'tree','🌲':'tree',
    '🛤':'road','🕯':'candle','🔺':'triangle','🏃':'runner','🐀':'rat','🗽':'liberty','🏮':'lantern','✈':'plane','🛩':'plane','🪔':'oillamp',
    '🌕':'fullmoon','🏳':'whiteflag','🔭':'telescope','☎':'telephone','🚗':'car','☢':'radiation','🌅':'sunrise','↩':'back','↶':'back',
    '🔔':'bell','⚫':'blackdot','🔵':'bluedot','🥉':'bronze','🐞':'bug','📷':'camera','🐔':'chick','🐥':'chick','👏':'clap','🕒':'clock','⏱':'clock','⏰':'clock','🕰':'clock','🎣':'fishing','🍟':'fries','👻':'ghost','🥇':'gold','🟢':'greendot','🏠':'house','🏘':'houses','🪪':'idcard','🏝':'island','😂':'laugh','🔒':'lock','🎨':'palette','🐾':'paw','🖼':'picture','📮':'postbox','🙋':'raisehand','📕':'redbook','🔴':'reddot','😢':'sad','🥈':'silver','🚚':'truck','⚪':'whitedot','😮':'wow','🟡':'yellowdot','⛵':'sailboat','🏅':'medal','🤚':'hand',
    '🎩':'hat','🧽':'sponge','🙂':'smile','💾':'floppy','📚':'books','🆕':'new','🎯':'target','⭕':'circle','🧬':'dna','🔤':'abc2','🔀':'shuffle','❌':'cross','🤔':'thinking','🙌':'hands','😅':'sweat','💥':'boom2','🏁':'finish','😀':'grin','🤖':'robot','🔦':'torch','📦':'box','⚗':'flask','📍':'pin2','🚶':'walker','➗':'divide','🎬':'clapper','📤':'outbox',
    '🌊':'lab-wave','🔋':'lab-battery','🌿':'lab-herb','🚰':'lab-faucet','🧩':'lab-puzzle','🌱':'lab-sprout','🥚':'lab-egg','🎈':'lab-balloon','🧲':'lab-magnet','🧫':'lab-petri','🌬':'lab-wind','🩸':'lab-blood','🌌':'lab-galaxy','🪜':'lab-ladder','🛷':'lab-sled','🎼':'lab-score','🦌':'lab-deer','🐄':'lab-cow','🏢':'lab-building','🪞':'lab-mirror','👕':'lab-shirt','🫧':'lab-bubbles','🕸':'lab-web','♾':'lab-infinity','📡':'lab-antenna','🛟':'lab-lifebuoy','💨':'lab-dash','🧊':'lab-ice','🪨':'lab-rock','🌋':'lab-volcano','🦋':'lab-butterfly','🥛':'lab-milk','🧂':'lab-salt','🪶':'lab-feather','⛸':'lab-skate','🎢':'lab-coaster','🫛':'lab-peapod','🛰':'lab-satellite','🪂':'lab-parachute','💧':'lab-drop','🐟':'lab-fish','🌫':'lab-fog','🌗':'lab-moonphase','🎺':'lab-trumpet','🎱':'lab-pool','🍬':'lab-candy','🚑':'lab-ambulance','🍋':'lab-lemon','❄':'lab-snowflake','💰':'lab-money','❗':'lab-exclaim','🎵':'lab-note','😎':'lab-cool','🧠':'lab-brain','🖥':'lab-desktop','🖍':'lab-crayon','🧹':'lab-broom','🙅':'lab-no','🔸':'lab-diamond','⏹':'lab-stop','☁':'lab-cloud',
    '⚔':'swords','⛰':'mountain','🚢':'ship','💉':'syringe','🥇':'medal','🧱':'brick','💣':'bomb','🏛':'temple','👑':'crown','🛡':'shield',
    '🤝':'handshake','🧭':'compass','🚨':'siren','⛪':'church','☮':'peace','🏭':'factory','🏦':'bank','🏙':'city','⛺':'tent','📰':'news','💍':'ring',
    '🔨':'hammer','🚫':'ban','⚓':'anchor','⚛':'atom','🗺':'compass'
  };
  M['🗺']=undefined;
  var keys=Object.keys(M).filter(function(k){return M[k]});
  var RE=new RegExp('('+keys.join('|')+')(?:\\uFE0F|\\uFE0E)?','g');
  var SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,INPUT:1,OPTION:1,SELECT:1,TITLE:1,CODE:1,PRE:1,CANVAS:1,NOSCRIPT:1,SVG:1,TEXT:1};
  var s=document.currentScript, base=(s&&s.src?s.src.replace(/[^\/]*$/,''):'')+'emoji/';
  var st=document.createElement('style');
  st.textContent='.ffe{display:inline-block;width:1.15em;height:1.15em;line-height:1;overflow:hidden;white-space:nowrap;color:transparent!important;text-shadow:none!important;font-size:inherit;background:center/contain no-repeat;vertical-align:-.2em;-webkit-text-fill-color:transparent;user-select:text}';
  (document.head||document.documentElement).appendChild(st);
  window.__ffeSeen=window.__ffeSeen||{};
  function skipped(n){
    for(var p=n.parentNode;p&&p.nodeType===1;p=p.parentNode){
      if(SKIP[p.nodeName.toUpperCase()]||p.isContentEditable||p.hasAttribute('data-notr')||p.classList.contains('ffe')||p.hasAttribute('data-noemoji')) return true;
    }
    return false;
  }
  function fix(t){
    var v=t.nodeValue; if(!v||!RE.test(v)){RE.lastIndex=0;return} RE.lastIndex=0;
    if(skipped(t)) return;
    var f=document.createDocumentFragment(),i=0,m;
    while((m=RE.exec(v))){
      if(m.index>i) f.appendChild(document.createTextNode(v.slice(i,m.index)));
      var sp=document.createElement('span'); sp.className='ffe'; sp.textContent=m[0];
      sp.style.backgroundImage='url('+base+'emoji-'+M[m[1]]+'.svg)'; f.appendChild(sp); i=m.index+m[0].length;
    }
    RE.lastIndex=0;
    if(i<v.length) f.appendChild(document.createTextNode(v.slice(i)));
    if(t.parentNode) t.parentNode.replaceChild(f,t);
  }
  function walk(n){
    if(n.nodeType===3){fix(n);return}
    if(n.nodeType!==1||SKIP[n.nodeName.toUpperCase()]) return;
    var w=document.createTreeWalker(n,NodeFilter.SHOW_TEXT,null),a=[],x;
    while((x=w.nextNode())) a.push(x);
    a.forEach(fix);
  }
  var q=[],pend=false;
  function flush(){pend=false;var l=q;q=[];l.forEach(function(n){if(n.isConnected!==false)walk(n)})}
  function run(){
    walk(document.body);
    new MutationObserver(function(ms){
      ms.forEach(function(m){
        if(m.type==='characterData') q.push(m.target);
        else m.addedNodes.forEach(function(n){q.push(n)});
      });
      if(!pend){pend=true;requestAnimationFrame(flush)}
    }).observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(document.body) run(); else document.addEventListener('DOMContentLoaded',run);
})();
