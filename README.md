# Frenchfries777 Tools

Browser tools, served at https://frenchfries777mc.github.io/tools/ (GitHub Pages from `main`).

- `index.html`: tool list (same look as the Games and Educations sites, with the Games | Educations | Tools switch).
- `sheet/`: **Fry Sheet**, a spreadsheet. `engine.js` is the formula engine (testable in Node), `app.js` the UI, `strings.js` translations and the function list. `xlsx.full.min.js` is SheetJS 0.18.5 (Apache 2.0), loaded only when opening Excel files. `xlsxio.js` writes .xlsx itself (styles, merges, borders, conditional formats, drop-downs, notes, charts, which SheetJS community edition cannot write) and reads those parts back on open.
- `blocks/`: **Fry Blocks**, JavaScript blocks that build a web page and export it as an HTML file. `blocks.js` holds the custom blocks, generators and HTML builder, `examples.js` the examples, `lib/` is Blockly 11.2.2 (Apache 2.0).
- `slides/`: **Fry Slides**, an AI presentation maker. `app.js` draws, edits, presents, prints and exports the slides, `ai-slides.js` makes decks and rewrites slides through `ai.js`, `qr.js` is a small QR encoder for the share-by-link dialog, `strings.js` holds the translations. `lib/` is PptxGenJS 4.0.1 (MIT), loaded only when downloading a .pptx.
- `lab/`: **Fry Lab**, a science and math lab for middle and high school (grade 7 to 12). The start page is a template gallery by grade and unit (`curriculum.js` maps units of the 2022 revised curriculum, from the author's own knowledge, to templates; units without one show as 준비 중, `gallery.js` is the UI). 21 interactive templates: 9 in `experiments.js` (function graphs, probability, unit circle, projectile, pendulum, spring, refraction, wave interference, Ohm's law) and 12 in `templates.js` (linear and quadratic functions, mean/variance histogram, Pythagorean theorem, sequences, trig graph, uniform/accelerated motion, acid-base pH, wave superposition, force and motion, populations, chemical reactions). Every key value, equation, data list and axis name is editable and can be saved as a named "my version" (save/load/rename/delete, localStorage `fflab.v1`). `app.js` is the shell, `ai-lab.js` the quiet AI helper through `ai.js`, `strings.js` and `strings-tpl.js` the translations.
- `i18n.js`: shared page translation (ko, en, es, fr, de, ja), same saved language as the games (`arenaClashLang`).

Everything a person makes is saved in their own browser (localStorage) and can be downloaded as a file. No login.

## Patch notes

Every update to a program adds a note at the top of `patchnotes/<id>.json` (ids: `site`, `sheet`, `blocks`, `slides`, `lab`, `ai`), in the same shape the games use: `notes[].date / build / title / items`. Short noun-ending items, bump the build (`v1`, `v2`, ...) for each new code change. The page `patchnotes/` shows them with one tab per program. After merging, tell the hub thread so the wiki gets the change.
