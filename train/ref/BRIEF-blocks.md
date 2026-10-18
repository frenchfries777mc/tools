# Writing Block HTML training items

You are writing training data for a small AI (Qwen3) that will build pages in **Block HTML**, a Blockly editor
at /home/claude/tools/blocks/. The AI gets a request (and sometimes the current project) and must answer with
`PLAN: new` or `PLAN: edit` plus one Blockly XML document. Your items teach it to code correctly and to
understand requests completely. Quality matters more than anything: every item must be a page a student would
be happy with, and must do **everything** the request asks.

## Files to read first
- `/home/claude/tools/train/ref/catalog.txt` — every block: `type {shape} FIELD(options) [value NAME:Check] [statement NAME] // meaning`.
  Use only these block types, with exactly these field/value/statement names.
- `/home/claude/tools/train/ref/examples.jsonl` — 5 correct projects (format reference).
- `/home/claude/tools/blocks/blocks.js` — the JS generators, if you need to know exactly what a block does.

## One item = one JSON line
```
{"q":"request text","cur":null,"plan":"new","xml":"<xml xmlns=\"https://developers.google.com/blockly/xml\">…</xml>"}
{"q":"request text","cur":"<xml …current project…</xml>","plan":"edit","xml":"<xml …whole changed project…</xml>"}
{"q":"request for a different page","cur":"<xml …unrelated current project…</xml>","plan":"new","xml":"<xml …new project…</xml>"}
```
- `cur` = what is in the editor before the request (null = empty editor). With `cur`, decide like the AI must:
  `edit` when the request changes/adds to/fixes the current page (keep everything else exactly the same);
  `new` when it asks for a different page.
- `xml` is always the WHOLE resulting project.

## XML rules (the checker enforces most of them)
- Exactly one top-level `page_root`. `{element}` blocks go in its `BODY` statement (or inside an `el_box` `BODY`), chained with `<next>`.
- Every element has a short unique `NAME` (Korean or English, no spaces is best); events/actions point to it with field `EL`.
- Event blocks (`ev_start`, `ev_click`, `ev_change`, `ev_key`, `ev_timer`) and function definitions are separate top-level blocks. No x/y needed.
- Number inputs: `<value name="X"><shadow type="math_number"><field name="NUM">5</field></shadow></value>` (or a real block inside). Text: `<shadow type="text"><field name="TEXT">hi</field></shadow>`. Colors: `<shadow type="val_color"><field name="COLOR">#ef4444</field></shadow>` (only the listed colors).
- Variables: `<variables><variable>score</variable></variables>` first, then `<field name="VAR">score</field>`.
- Mutations: `controls_if` → `<mutation elseif="1" else="1"></mutation>` with IF0/DO0, IF1/DO1, ELSE. `text_join`/`lists_create_with` → `<mutation items="3"></mutation>` with ADD0…ADD2. Functions: `procedures_defnoreturn` with `<mutation><arg name="n"></arg></mutation>`, field NAME, statement STACK; call with `<block type="procedures_callnoreturn"><mutation name="f"><arg name="n"></arg></mutation><value name="ARG0">…</value></block>`.
- Escape `<`, `>`, `&`, `"` inside field text (`&lt;` etc.). Inside the JSON line, escape `"` as `\"`.
- Do NOT use picture blocks that need the person's own pictures (`el_picture`, `val_myimg`, `draw_image`). Avoid `js_raw`/`js_val`/`el_html` unless nothing else can do it (at most 1 item in 20).
- Prefer friendly blocks; keep pages small and readable: `xml` under 4,500 characters, `cur` under 3,500.
- Visible text (titles, buttons, messages) in the language of the request.
- Must actually work: variables set before use (ev_start), timers stopped when a game ends, inputs read with `val_get` PROP `num` for numbers, no infinite loops.

## Requests (`q`)
- Write like real students/users: short, sometimes casual (반말/존댓말), sometimes with small typos or no spaces; some long and detailed.
- Language mix across your file: about 70% Korean, 20% English, 10% Japanese/Spanish/French/German.
- No two requests the same; vary topics, sizes and wording. Don't start every request the same way.

## Check your work (required)
Write your items to the file you were given, then run:
```
node /home/claude/tools/train/check.js code <your file>
```
It loads each item in the real editor, runs the page, presses every button, and prints `line N: reason` for failures.
Fix or replace every failing line and run it again until it reports 0 failed. Also re-read your requests: the
checker cannot tell whether the page does what was asked — you must make sure it does, condition by condition.
Work in batches (e.g. 15 items, check, continue) so mistakes don't repeat.
