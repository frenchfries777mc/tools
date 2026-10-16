/* Short prompts shared by the tools and the training data (train/).
   The fine-tuned built-in AI ("기본"/"똑똑함" Tools models) learned exactly these, so the site and the
   training set must build them the same way: change them here only, then rebuild the training data.
   Works in the browser (window.FFP) and in Node (require). */
(function(root){
'use strict';
var P={};

/* Block HTML: the AI decides whether to edit the current project or make a new one */
P.blocksSys='You build pages for the Block HTML editor (Blockly). Reply with one line "PLAN: edit" or "PLAN: new", then one Blockly XML document <xml xmlns="https://developers.google.com/blockly/xml">…</xml>, nothing else. PLAN: edit keeps the current project and changes only what was asked; PLAN: new makes a different page. Write visible text in the language of the request.';
P.blocksPrompt=function(q,cur){ return (cur?'Current project:\n'+cur+'\n\n':'')+'Request: '+q; };

/* =AI("할 일", A2) cell function (translation lives here) */
P.cellSys='You fill exactly one spreadsheet cell. Reply with only the value for the cell: no quotes, no labels, no explanation, no markdown. Keep it to one short line unless the instruction asks for more. Answer in the language of the instruction unless it asks for another language. If the data is empty or the instruction cannot be done, reply with a single dash.';
P.cellPrompt=function(instr,parts){ return instr+(parts&&parts.length?'\n\nData:\n'+parts.join('\n\n'):''); };

/* table text as the sheet shows it to the AI: first row = column letters, first column = row numbers */
P.tableHead='Table (first row = column letters, first column = row numbers):\n';

P.formulaSys='You write one spreadsheet formula. Reply with JSON only: {"formula":"=...","explain":"one short sentence in the language of the request"}. Use A1 references that match the table addresses given. Strings use double quotes, arguments are separated by commas.';
P.formulaPrompt=function(table,cell,q){ return (table?P.tableHead+table+'\n\n':'')+'The formula goes in cell '+cell+'.\nRequest: '+q; };

P.tableSys='You make a small table for a spreadsheet. Reply with JSON only: {"rows":[["header1","header2"],["value","value"]]}. The first row is the header. At most 60 rows and 12 columns. Numbers as plain numbers without units in the cell. Use the language of the request.';
P.tablePrompt=function(q){ return 'Request: '+q; };

P.graphTypes=['bar','hbar','line','pie','scatter'];
P.graphSys='You make one chart from a spreadsheet table. Reply with JSON only: {"type":"bar|hbar|line|pie|scatter","range":"A1:C7","series":["C"],"title":"short title in the language of the request"}. range covers the header row and the label column; series lists the column letters to plot (leave out the label column). bar = compare items, hbar = long names or ranking, line = change over time, pie = parts of a whole (one series), scatter = relation between two numbers (first series is x).';
P.graphPrompt=function(table,q){ return P.tableHead+table+'\n\nRequest: '+q; };

/* Fry Sheet AI dialog, "질문·요약" tab: a question about the selected table (or none), answered in plain text */
P.askSys='You help someone with their spreadsheet. Answer the question about the table clearly and briefly in plain text (no markdown tables, no code fences). Use the language the question is written in.';
P.askPrompt=function(table,q){ return (table?P.tableHead+table+'\n\n':'(No table selected.)\n\n')+'Question: '+q; };

/* Fry Slides (slides/ai-slides.js). Answers are JSON {title, subtitle, slides:[{layout, ...fields}]}.
   With the built-in AI a deck is made in steps: outline (slidesOutlineSys + slidesTopic), then 3 slides per request
   (slidesFillSys + slidesFillPrompt); single slides are rewritten or added with slidesOneSys + slidesActPrompt/slidesAddPrompt. */
P.slidesFields='{"layout":"title|section|bullets|two|stat|quote|closing","title":"...","subtitle":"...","bullets":["..."],"leftTitle":"...","left":["..."],"rightTitle":"...","right":["..."],"stat":"...","caption":"...","quote":"...","by":"...","notes":"..."}';
P.slidesUse='Fields per layout: title and closing = title + subtitle; section = title + subtitle (opens a new part); bullets = title + 3-5 short bullets; two = title + leftTitle/left[] + rightTitle/right[] (compare two things); stat = title + stat (one striking number with its unit, like "71%" or "1.5 million") + caption (what it means); quote = quote + by. Only include the fields the layout uses, plus "notes": 1-3 sentences the speaker can say.';
P.slidesRules='Bullets are short phrases (at most about 12 words), not full paragraphs. Use real, well-known facts; do not invent precise numbers you are not sure of (round numbers are fine). Write every text in the language of the topic.';
P.slidesDeckSys=function(n){ return 'You write slide decks. Reply with JSON only, no markdown fences: {"title":"deck title","subtitle":"one line","slides":['+P.slidesFields+']}. Make exactly '+n+' slides. Slide 1 is layout "title", the last slide is "closing" (thanks, a question or the key takeaway). In between mostly "bullets", with a "two", "stat", "quote" or "section" where it fits the content. '+P.slidesUse+' '+P.slidesRules; };
P.slidesTopic=function(o){ return 'Topic: '+o.topic+(o.aud?'\nAudience and purpose: '+o.aud:'')+'\nNumber of slides: '+o.n; };
P.slidesOutlineSys='You plan slide decks. Reply with JSON only: {"title":"deck title","subtitle":"one line","slides":[{"layout":"title|section|bullets|two|stat|quote|closing","title":"slide title"}]}. Slide 1 is "title", the last is "closing", mostly "bullets" in between. Short titles. Write in the language of the topic.';
P.slidesFillSys='You write the content of some slides of a deck. Reply with JSON only: {"slides":['+P.slidesFields+']} with the slides asked for, in order, same layout and title as planned. '+P.slidesUse+' Bullets: 3-4, short. Write in the language of the deck.';
P.slidesOneSys=function(lay){ return 'You write one slide of a deck. Reply with JSON only: one slide object '+P.slidesFields+(lay?'. Keep the layout "'+lay+'".':'. Pick the layout that fits best.')+' '+P.slidesUse+' '+P.slidesRules.replace('the topic','the slide'); };
/* "1. title" lines of the deck (skip = index to leave out, max = how many lines: 12 for the built-in AI) */
P.slidesTitles=function(slides,skip,max){ return slides.map(function(s,i){ return i===skip?null:(i+1)+'. '+(s.title||s.quote||s.stat||'').slice(0,60); }).filter(Boolean).slice(0,max).join('\n'); };
P.slidesWant=function(slides,idx){ return idx.map(function(i){ return (i+1)+'. ['+slides[i].layout+'] '+(slides[i].title||''); }).join('\n'); };
P.slidesFillPrompt=function(deck,aud,titles,want){ return 'Deck: '+deck+(aud?'\nAudience: '+aud:'')+'\nAll slides:\n'+titles+'\n\nWrite these slides in full:\n'+want; };
/* the slide as JSON for the AI: only the fields its layout shows (fields = the layout's field names in order), plus notes */
P.slidesSlideJSON=function(s,fields){ var o={layout:s.layout}; (fields||[]).forEach(function(f){ var v=s[f]; if(Array.isArray(v)?v.length:v) o[f]=v; }); if(s.notes) o.notes=s.notes; return JSON.stringify(o); };
P.slidesTask={rewrite:'Rewrite this slide with clearer, more interesting wording. Keep the meaning.',
  shorter:'Make this slide shorter: fewer and shorter bullets, the same key points. Shorten the notes too.',
  longer:'Make this slide more detailed: add useful specifics and examples (up to 6 bullets) and fuller speaker notes.'};
P.slidesActPrompt=function(deck,i,n,json,kind){ return 'Deck: '+deck+'\nSlide '+(i+1)+' of '+n+' (JSON): '+json+'\n\nTask: '+P.slidesTask[kind]; };
P.slidesAddPrompt=function(deck,titles,i,q){ return 'Deck: '+deck+'\nSlides so far:\n'+titles+'\n\nWrite one new slide (it goes after slide '+(i+1)+') about: '+q; };
P.slidesRetry='\n\nReply with the JSON object only, starting with {.';

if(typeof module!=='undefined'&&module.exports) module.exports=P; else root.FFP=P;
})(this);
