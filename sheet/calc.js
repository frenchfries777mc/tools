/* Fry Sheet "AI 계산": a calculation or a unit conversion written in words becomes one formula.
   Most phrases are read here without any AI ("12*7+3", "123 곱하기 4", "15% of 80", "삼백 더하기 이십",
   "3500원짜리 7개에 10% 할인", "170cm는 몇 인치", "섭씨 30도는 화씨", "3마일 km"); only what this cannot read
   goes to the AI, whose answer is checked the same way (ai-sheet.js). The engine (engine.js) does the arithmetic.
   Works in the browser (window.FSCalc, after engine.js) and in Node (require). */
(function(root){
'use strict';
var E=root&&root.FSE||(typeof require==='function'?require('./engine.js'):null);

/* ---------- Korean number words: "삼백오십" 350, "2만5천" 25000, "3.5만" 35000 ---------- */
var KD={'영':0,'공':0,'일':1,'이':2,'삼':3,'사':4,'오':5,'육':6,'륙':6,'칠':7,'팔':8,'구':9}, KS={'십':10,'백':100,'천':1000}, KB={'만':1e4,'억':1e8,'조':1e12};
function koNum(s){
  var total=0, sec=0, cur=null, i=0, any=false, m;
  while(i<s.length){
    if((m=/^\d+(?:\.\d+)?/.exec(s.slice(i)))){ if(cur!=null) return null; cur=parseFloat(m[0]); i+=m[0].length; any=true; continue; }
    var ch=s[i];
    if(ch in KD){ if(cur!=null) return null; cur=KD[ch]; }
    else if(ch in KS){ sec+=(cur==null?1:cur)*KS[ch]; cur=null; }
    else if(ch in KB){ sec+=cur||0; total+=(sec||1)*KB[ch]; sec=0; cur=null; }
    else return null;
    any=true; i++;
  }
  return any?total+sec+(cur||0):null;
}

/* ---------- arithmetic in words ---------- */
var OPS=[[/\s*(?:더하기|더한\s*값|플러스|plus|\+)\s*/gi,'+'],[/\s*(?:빼기|뺀\s*값|마이너스|minus)\s*/gi,'-'],
  [/\s*(?:곱하기|곱한\s*값|multiplied\s+by|times|mal)\s*/gi,'*'],[/\s*(?:나누기|나눈\s*값|divided\s+by|geteilt\s+durch|divisé\s+par|dividido\s+(?:por|entre))\s*/gi,'/']];
var PCT='(\\d+(?:\\.\\d+)?)\\s*(?:%|퍼센트|프로|percent|por\\s*ciento|pour\\s*cent|prozent)';
var JOIN='(?:\\s*(?:에서|에|을|를|은|는|,|with|at|con|avec|mit|から|の|に))?\\s*';
var OFF='(?:할인|off|discount|de\\s+descuento|descuento|de\\s+remise|remise|rabatt|引き|割引)';
var UP='(?:인상|증가|추가|더|올리기|올린|increase|more|extra|markup|tax|세금|부가세|de\\s+aumento|aumento|más|de\\s+plus|hausse|mehr|aufschlag|増し|増)';
var TAIL='(?:\\s*(?:된|한|하면|해서|하기|한\\s*값)?\\s*(?:가격|값|금액|price)?)?\\s*$';
function strip(s){
  s=String(s||'').trim().replace(/^=/,'');
  s=s.replace(/[，]/g,',').replace(/(\d),(?=\d{3}(?!\d))/g,'$1').replace(/[×✕✖]/g,'*').replace(/÷/g,'/').replace(/[−–—]/g,'-').replace(/％/g,'%').replace(/＋/g,'+').replace(/[（]/g,'(').replace(/[）]/g,')');
  s=s.replace(/^\s*(?:what\s+is|what's|how\s+much\s+is|calculate|compute|calcula|calcule|berechne|계산\s*:?)\s*/i,'');
  s=s.replace(/\s*(?:은|는)?\s*(?:얼마(?:야|예요|에요|일까요?|인가요?|지|니)?|몇(?:이야|일까요?|이에요|인가요?)?|계산(?:해\s*줘|해\s*주세요|하면|해)?|뭐(?:야|예요)?|결과는?|は\?*|はいくつ|はいくら)?\s*[?？=]*\s*$/,'');
  return s.trim();
}
/* the core: numbers, + - * / ^ ( ) %, SQRT; null when anything else is left */
function core(s,lone){
  s=' '+s+' ';
  OPS.forEach(function(o){ s=s.replace(o[0],o[1]); });
  s=s.replace(/(\d)\s*[xX]\s*(?=\d)/g,'$1*');
  s=s.replace(/(?:루트|√|square\s+root\s+of|sqrt)\s*(\d+(?:\.\d+)?|\([^()]*\))/gi,'SQRT($1)').replace(/(\d+(?:\.\d+)?|\([^()]*\))\s*의\s*제곱근/g,'SQRT($1)');
  s=s.replace(/(\d+(?:\.\d+)?|\))\s*(?:의\s*)?(\d+)\s*제곱/g,'$1^$2').replace(/(\d+(?:\.\d+)?|\))\s*(?:의\s*)?세제곱/g,'$1^3').replace(/(\d+(?:\.\d+)?|\))\s*(?:의\s*)?제곱/g,'$1^2')
       .replace(/(\d+(?:\.\d+)?|\))\s*squared/gi,'$1^2').replace(/(\d+(?:\.\d+)?|\))\s*cubed/gi,'$1^3').replace(/\s*to\s+the\s+power\s+of\s*/gi,'^');
  // "3500원짜리 7개": a price times a count
  s=s.replace(/([0-9영일이삼사오육칠팔구십백천만억])\s*(?:원|달러|엔|유로|円)?\s*짜리\s*/g,'$1*');
  s=s.replace(/([0-9영일이삼사오육칠팔구십백천만억])\s*(?:원어치|원|달러|엔|유로|개|명|권|장|병|잔|번|회|점|items?|pcs|each|euros?|dollars?|yen|円|個|人|ドル)(?![A-Za-z])/gi,'$1');
  s=s.replace(/[$₩€¥]/g,'');
  s=s.replace(/[0-9.영공일이삼사오육칠팔구십백천만억조]+/g,function(t){ if(/^[\d.]+$/.test(t)) return t; var n=koNum(t); return n==null?t:String(n); });
  s=s.replace(/\s+/g,'');
  if(!s||!/^[\d.+\-*/^()%]+$/.test(s.replace(/SQRT\(/g,'('))) return null;
  if(!lone&&!/[+\-*/^%]|SQRT/.test(s.replace(/^[+-]/,''))) return null; // a lone number is not a calculation
  return s;
}
function times(x){ return /[+\-]/.test(x.replace(/^\(([^()]*)\)$/,''))?'('+x+')':x; }
function arith(text){
  var s=strip(text), m, a;
  if((m=new RegExp('^(.+?)'+JOIN+PCT+'\\s*'+OFF+TAIL,'i').exec(s))&&(a=core(m[1],1))) return times(a)+'*(1-'+m[2]+'%)';
  if((m=new RegExp('^(.+?)'+JOIN+PCT+'\\s*'+UP+TAIL,'i').exec(s))&&(a=core(m[1],1))) return times(a)+'*(1+'+m[2]+'%)';
  if((m=new RegExp('^'+PCT+'\\s*(?:of|de|del|du|des|von|vom)\\s+(.+)$','i').exec(s))&&(a=core(m[2],1))) return times(a)+'*'+m[1]+'%';
  if((m=new RegExp('^(.+?)\\s*(?:의|の)\\s*'+PCT+'$','i').exec(s))&&(a=core(m[1],1))) return times(a)+'*'+m[2]+'%';
  return core(s);
}

/* a formula typed as is ("SUM(B2:B5)*2", "=A1/3"): kept when the engine can read it */
function asFormula(text){
  var s=String(text||'').trim(), had=s[0]==='='; if(had) s=s.slice(1);
  if(!s||/[가-힣ぁ-んァ-ン一-龥]/.test(s.replace(/"[^"]*"/g,''))) return null;
  if(!had&&!/[A-Za-z]{1,3}\$?\d|[A-Za-z_.]+\(/.test(s)) return null;
  try{ E.parse(s); }catch(e){ return null; }
  return '='+s;
}

/* ---------- unit conversion in words ---------- */
/* [code, words…]; Latin words match without case, except the ones listed in CASE */
var UNITS=[
  ['mm','mm','밀리미터','밀리','millimeters?','millimetres?','ミリメートル','ミリ'],['cm','cm','센티미터','센티','센치','centimeters?','centimetres?','centímetros?','centimètres?','zentimeter','センチメートル','センチ'],
  ['m','m','미터','meters?','metres?','metros?','mètres?','メートル'],['km','km','킬로미터','kilometers?','kilometres?','kilómetros?','kilomètres?','kilometer','キロメートル'],
  ['in','in','"','인치','inch','inches','pulgadas?','pouces?','zoll','インチ'],['ft','ft','피트','feet','foot','pies','pieds?','fuß','フィート'],['yd','yd','야드','yards?','ヤード'],
  ['mi','mi','마일','miles?','millas?','meilen?','マイル'],['Nmi','해리','nautical miles?'],
  ['mg','mg','밀리그램','milligrams?'],['g','g','그램','grams?','gramos?','grammes?','gramm','グラム'],['kg','kg','킬로그램','kilograms?','kilogramos?','kilogrammes?','kilogramm','kilos?','キログラム','キロ'],
  ['lbm','lb','lbs','파운드','pounds?','libras?','livres?','pfund','ポンド'],['ozm','온스','ounces?','onzas?','onces?','unzen?','オンス'],['t','톤','tonnes?','tons?','トン'],
  ['근','근'],['돈','돈'],['냥','냥'],['관','관'],
  ['C','°c','℃','섭씨','celsius','摂氏','C'],['F','°f','℉','화씨','fahrenheit','華氏','F'],['K','켈빈','kelvin','K'],
  ['ml','ml','mL','밀리리터','cc','milliliters?','millilitres?','mililitros?','ミリリットル'],['l','l','L','리터','liters?','litres?','litros?','liter','リットル'],
  ['m3','m3','m³','㎥','세제곱미터','cubic meters?','cubic metres?'],['gal','gal','갤런','gallons?','galones?','gallonen?','ガロン'],['qt','qt','쿼트','quarts?'],['pt','pt','파인트','pints?'],
  ['cup','cups?','컵','tazas?','tasses?','tassen?','カップ'],['oz','fl oz','floz','fluid ounces?'],['tbs','tbsp','tbs','큰술','테이블스푼','tablespoons?','大さじ'],['tsp','tsp','작은술','티스푼','teaspoons?','小さじ'],
  ['m2','m2','m²','㎡','제곱미터','square meters?','square metres?','sq m','平方メートル'],['km2','km2','km²','㎢','제곱킬로미터','square kilometers?','square kilometres?','sq km'],
  ['cm2','cm2','cm²','㎠','제곱센티미터','square centimeters?'],['ft2','ft2','ft²','sq ft','square feet','square foot','제곱피트'],['ha','ha','헥타르','hectares?','hectáreas?','ヘクタール'],
  ['uk_acre','acres?','에이커','acres','エーカー'],['평','평','坪'],
  ['km/h','km/h','kph','kmh','km/hr','킬로미터/시','kilometers per hour'],['mph','mph','miles per hour','마일/시'],['m/s','m/s','미터/초','meters per second'],['kn','kn','노트','knots?'],
  ['sec','sec','secs','seconds?','초','segundos?','secondes?','sekunden?','秒','s'],['mn','min','mins','minutes?','분','minutos?','minuten?','分'],['hr','hr','hrs','hours?','시간','horas?','heures?','stunden?','時間','h'],
  ['day','days?','일','días?','jours?','tage?','日'],['wk','weeks?','주','semanas?','semaines?','wochen?','週間','週'],['yr','years?','년','años?','années?','jahre?','年'],
  ['bit','bits?','비트'],['byte','bytes?','바이트','B'],['kibyte','KB','kB','킬로바이트','kilobytes?'],['Mibyte','MB','메가바이트','megabytes?','메가'],['Gibyte','GB','기가바이트','gigabytes?','기가'],['Tibyte','TB','테라바이트','terabytes?','테라']
];
var CASE={C:1,F:1,K:1,B:1,KB:1,kB:1,MB:1,GB:1,TB:1,mL:1,L:1}, SHORT=/^(?:[A-Za-z]|in|"|[가-힣]|[ぁ-ん一-龥])$/; // short words need a number or "몇"/"to" next to them
var WORDS=[]; UNITS.forEach(function(u){ for(var i=1;i<u.length;i++) WORDS.push({w:u[i], code:u[0]}); });
WORDS.sort(function(a,b){ return b.w.length-a.w.length; });
WORDS.forEach(function(x){ x.re=new RegExp(x.w.replace(/[.*+^${}()|[\]\\\/]/g,'\\$&'), CASE[x.w]?'g':'gi'); });
var KCODE={}; UNITS.forEach(function(u){ KCODE[u[0]]=1; });
function latin(c){ return /[A-Za-z]/.test(c||''); }
function units(t,numAt,numEnd){
  var used=[], out=[];
  WORDS.forEach(function(x){ x.re.lastIndex=0; var m;
    while((m=x.re.exec(t))){ var a=m.index, b=a+m[0].length; if(!m[0]){ x.re.lastIndex++; continue; }
      if(used.some(function(u){ return a<u[1]&&b>u[0]; })||(a<numEnd&&b>numAt)) continue;
      if(/[A-Za-z]/.test(x.w)&&(latin(t[a-1])||latin(t[b]))) continue;
      if(/^[가-힣]+$/.test(x.w)&&/[가-힣]/.test(t[a-1]||'')&&!/[는은을를로의에도몇면]$/.test(t[a-1])) continue;
      if(SHORT.test(x.w)){
        var before=t.slice(0,a).replace(/\s+$/,''), after=t.slice(b);
        var nearNum=/[\d°]$/.test(before), word=/(?:^|\s)(?:to|in|into|en|a|à|nach|in|몇|→|->|=|は|を)$/i.test(before)||/[→>=]$/.test(before);
        if(!(nearNum||word)) continue;
        if(/^[가-힣]$/.test(x.w)&&/^[가-힣]/.test(after)&&!/^(?:은|는|을|를|이|가|로|으로|에|의|짜리|쯤|정도|이면|이라면)/.test(after)) continue;
      }
      used.push([a,b]); out.push({a:a, b:b, code:x.code});
    } });
  return out.sort(function(p,q){ return p.a-q.a; });
}
var SPEED={km:'km/h', m:'m/h', mi:'mph'}, SPEED_S={m:'m/s', km:'km/s'};
function kindOf(code){ var u=E.unitOf(code); return u&&u.k; }
/* {value, from, to} or null */
function unitParse(text){
  var t=' '+String(text||'').replace(/(\d),(?=\d{3}(?!\d))/g,'$1').replace(/[，]/g,',')+' ';
  var nm=/[-+]?\d+(?:\.\d+)?/.exec(t); if(!nm) return null;
  var v=parseFloat(nm[0]), na=nm.index, nb=na+nm[0].length, list=units(t,na,nb);
  if(/시속|per\s+hour|an\s+hour/i.test(t)) list.forEach(function(u){ if(SPEED[u.code]) u.code=SPEED[u.code]; });
  if(/초속|per\s+second/i.test(t)) list.forEach(function(u){ if(SPEED_S[u.code]) u.code=SPEED_S[u.code]; });
  list=list.filter(function(u){ return u.code!=='day'||u.a>=nb; }); // "일" before the number is the number word one
  if(!list.length) return null;
  var dist=function(u){ return u.a>=nb?u.a-nb:na-u.b+0.5; };
  var from=list.slice().sort(function(p,q){ return dist(p)-dist(q); })[0];
  var rest=list.filter(function(u){ return u!==from&&kindOf(u.code)===kindOf(from.code)&&u.code!==from.code; });
  var to=rest[0];
  if(!to&&kindOf(from.code)==='tmp'&&from.a>=nb&&/^\s*도/.test(t.slice(nb))){ // "30도는 화씨": the number is in the other scale
    to=from; from={code:to.code==='F'?'C':'F'}; }
  if(!to||!kindOf(from.code)||kindOf(from.code)!==kindOf(to.code)) return null;
  return {value:v, from:from.code, to:to.code};
}
/* a unit word or code (from the AI) -> the engine's unit code, or null */
function unitCode(w){
  w=String(w||'').trim(); if(!w) return null;
  if(E.unitOf(w)) return w;
  for(var i=0;i<WORDS.length;i++){ var x=WORDS[i]; x.re.lastIndex=0; var m=x.re.exec(w); if(m&&m.index===0&&m[0].length===w.length) return x.code; }
  return null;
}
function hasUnit(text){ return units(' '+String(text||'')+' ',-1,-1).length>0; }
function q(s){ return '"'+String(s).replace(/"/g,'""')+'"'; }
function convFormula(c){ return '=CONVERT('+c.value+','+q(c.from)+','+q(c.to)+')'; }

/* the fast path: {kind:'unit', conv, formula} or {kind:'calc', formula} or null */
function fast(text){
  var c=unitParse(text);
  if(c&&E.convertUnit(c.value,c.from,c.to)!=null) return {kind:'unit', conv:c, formula:convFormula(c)};
  var f=asFormula(text); if(f) return {kind:'calc', formula:f};
  var a=arith(text); if(a){ try{ E.parse(a); return {kind:'calc', formula:'='+a}; }catch(e){} }
  return null;
}
var api={fast:fast, arith:arith, koNum:koNum, unitParse:unitParse, unitCode:unitCode, hasUnit:hasUnit, convFormula:convFormula, asFormula:asFormula};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.FSCalc=api;
})(this);
