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

if(typeof module!=='undefined'&&module.exports) module.exports=P; else root.FFP=P;
})(this);
