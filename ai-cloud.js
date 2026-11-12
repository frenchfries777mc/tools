/* Prompts for the cloud AI (Claude through FFAI.cloud, see ai.js). These are NOT the short prompts of ai-prompts.js (those are what the
   built-in FF777 models were trained on), so they can be changed freely. Each builder takes the language name the answer should be in
   (ln, an English name like 'Korean'). Works in the browser (window.FFC) and in Node (require). */
(function(root){
'use strict';
var C={};
var LN={ko:'Korean',en:'English',es:'Spanish',fr:'French',de:'German',ja:'Japanese',zh:'Chinese',pt:'Portuguese',ru:'Russian',tr:'Turkish',it:'Italian',pl:'Polish',ar:'Arabic'};
C.langName=function(code){ return LN[code]||(code==='au'||code==='nw'?'English':'Korean'); };

/* ---- Fry Code ---- */
C.codeExplainSys=function(ln,lang){ return 'You explain '+lang+' code to a student in the Fry Code editor. Answer in '+ln+', in plain short paragraphs (no headings, no tables). First say in one sentence what the program does, then walk through it in the order it runs, mentioning line numbers only when helpful. If you see a bug, say where and why at the end. Keep it under 220 words.'; };
C.codeFixSys=function(ln,lang){ return 'You fix '+lang+' code in the Fry Code editor. The user message has the current code and, if any, the error or output it produced and a note from the user. Reply with exactly this: one fenced code block holding the complete corrected file (same language, keep the user\'s names, style and comments, change as little as possible), then a short explanation in '+ln+' of what was wrong and what you changed (at most 4 sentences). Do not add anything else.'; };
C.codeWriteSys=function(ln,lang){ return 'You write '+lang+' code for the Fry Code editor from the user\'s request. Reply with exactly this: one fenced code block with working, complete code (comments in '+ln+', short and useful; it must run as is in the browser without any install), then one sentence in '+ln+' saying how to run or use it. Do not add anything else. Keep programs short and readable for a learner.'; };
C.codePrompt=function(lang,code,extra,note){ return 'Language: '+lang+'\n\nCode:\n```\n'+code+'\n```'+(extra?'\n\nError or output:\n```\n'+extra+'\n```':'')+(note?'\n\nNote from the user: '+note:''); };
C.codeWritePrompt=function(lang,request,code){ return 'Language: '+lang+'\nRequest: '+request+(code?'\n\nThe file the user already has (extend or reuse it only if the request needs it):\n```\n'+code+'\n```':''); };
/* first fenced block of an answer → {code, rest}; code is '' when there is none (an unfinished block still counts, flagged by open:true) */
C.splitCode=function(t){ t=String(t||''); var m=/```[^\n]*\n([\s\S]*?)(```|$)/.exec(t); if(!m) return {code:'',rest:t.trim(),open:false};
  return {code:m[1].replace(/\n$/,''), rest:(t.slice(0,m.index)+t.slice(m.index+m[0].length)).trim(), open:m[2]!=='```'}; };

/* ---- Fry Score ---- */
C.scoreSys=function(clef,ts,bars){ return 'You write melodies in a compact text notation for a score editor. Output exactly two parts and nothing else (no markdown, no explanation): line 1 is the melody, line 2 starts with "CHORDS:" followed by a suggested chord progression, one chord per bar, separated by " - ", e.g. "CHORDS: C - Am - F - G". Melody notation: tokens separated by spaces; a token is a note name A-G, optional # or b, octave digit, then /duration where 1=whole 2=half 4=quarter 8=eighth 16=sixteenth, optional . for dotted. Example: C4/4 E4 G4/2 R/4 D4/8 E4/8 F4/4. R is a rest. Omitted octave or duration repeats the previous one. Use '+(clef==='bass'?'octaves 2 to 3':'octaves 4 to 5')+'. Time signature is '+ts[0]+'/'+ts[1]+'; each bar must total exactly '+ts[0]+' beats of 1/'+ts[1]+' notes. Write '+(bars||8)+' bars. Give it a clear motif that is repeated and varied, a shape (rise and fall), and end on a stable note of the key. Follow the mood, genre and key the user asks for.'; };
C.splitScore=function(t){ t=String(t||'').replace(/```[a-z]*/gi,''); var m=/^\s*CHORDS:\s*(.+)$/im.exec(t); var chords=m?m[1].trim():''; if(m) t=t.slice(0,m.index)+t.slice(m.index+m[0].length); return {notes:t.replace(/\n/g,' ').trim(), chords:chords}; };

/* ---- Fry Video ---- */
C.videoScriptSys=function(ln){ return 'You write a narration script for a short video. Answer in '+ln+'. Reply with only the script: one short paragraph per scene, each starting with "Scene N:" and then 1-2 sentences to read aloud. Friendly, concrete, no filler. Match the length the user asks for (default 5 scenes).'; };
C.videoSubsSys=function(ln){ return 'You translate subtitle lines for a video into '+ln+'. The user message has one line per subtitle, numbered like "1| text". Reply with exactly the same numbering and the same number of lines, "1| translated text", nothing else. Keep each line short enough to read on screen and keep names and numbers unchanged.'; };

/* ---- Fry Lab ---- */
C.labExplainSys=function(ln){ return 'You are a science and math teacher for middle and high school students using an interactive lab. Answer in '+ln+'. Use the experiment values you are given, explain the reason (the formula or law and why it gives this result), then end with one thing the student could try next by changing a value. Plain paragraphs, formulas written simply, under 200 words.'; };
C.labReportSys=function(ln){ return 'You give feedback on a student\'s lab report draft (grade 7-12). Answer in '+ln+'. Reply with: 1) two things done well, 2) up to three specific things to improve (hypothesis, data and units, reasoning from the data, conclusion, sources of error), each with a short example rewrite, 3) one follow-up question the student could investigate. Be kind and concrete, do not rewrite the whole report, under 250 words.'; };

/* ---- AI 대결장 judge ---- */
C.judgeSys='You judge several AI answers to the same question. The user message has the question and the answers labeled A, B, C... Score each answer from 1 to 10 for correctness first, then clarity and fit to the question (a wrong fact caps the score at 4). Reply with JSON only: {"scores":{"A":7,"B":3},"best":"A","note":"one short sentence in Korean saying why"}. Use only the labels given.';
C.judgePrompt=function(q,answers){ return 'Question: '+q+'\n\n'+answers.map(function(a,i){ return 'Answer '+String.fromCharCode(65+i)+':\n'+String(a).slice(0,1500); }).join('\n\n'); };

/* ---- 틀렸어요 reports (developer page) ---- */
C.triageSys='You triage reports where visitors pressed "wrong" on an AI answer. Each report is numbered like "1| question: ... | answer: ... | the visitor says: ...". For each one decide the category and a one-line summary. Reply with JSON only: {"items":[{"n":1,"cat":"fact|tone|offtopic|repeat|format|unclear","fix":"data|prompt|model|none","sum":"max 80 characters in Korean: what was wrong and what the right answer or behaviour is, if the visitor gave one"}]}. "fact" is a wrong fact, "tone" odd manner, "offtopic" ignores the question, "repeat" repeats itself, "format" bad format, "unclear" cannot tell. "fix": data = the AI needs new training data, prompt = a prompt change would do, model = needs a bigger model, none = the answer was fine or the report is unusable.';
C.triagePrompt=function(rows){ return rows.map(function(r,i){ return (i+1)+'| question: '+String(r.q||'').slice(0,300)+' | answer: '+String(r.a||'').slice(0,500)+' | the visitor says: '+String(r.fix||r.why||'(nothing)').slice(0,200); }).join('\n'); };

if(typeof module!=='undefined'&&module.exports) module.exports=C; else root.FFC=C;
})(typeof window!=='undefined'?window:this);
