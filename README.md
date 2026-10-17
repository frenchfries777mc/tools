# Frenchfries777 Tools

Browser tools, served at https://frenchfries777mc.github.io/tools/ (GitHub Pages from `main`).

- `index.html`: tool list (same look as the Games and Educations sites, with the Games | Educations | Tools switch).
- `sheet/`: **Fry Sheet**, a spreadsheet. `engine.js` is the formula engine (testable in Node), `app.js` the UI, `strings.js` translations and the function list. `xlsx.full.min.js` is SheetJS 0.18.5 (Apache 2.0), loaded only when opening or saving Excel files.
- `blocks/`: **Block HTML**, JavaScript blocks that build a web page and export it as an HTML file. `blocks.js` holds the custom blocks, generators and HTML builder, `examples.js` the examples, `lib/` is Blockly 11.2.2 (Apache 2.0).
- `slides/`: **Fry Slides**, an AI presentation maker. `app.js` draws, edits, presents, prints and exports the slides, `ai-slides.js` makes decks and rewrites slides through `ai.js`, `strings.js` holds the translations. `lib/` is PptxGenJS 4.0.1 (MIT), loaded only when downloading a .pptx.
- `lab/`: **Fry Lab**, a science and math lab for middle and high school with 9 interactive experiments (function graphs, probability, unit circle, projectile, pendulum, spring, refraction, wave interference, Ohm's law). `app.js` is the shell (canvas, controls, records table, graph with trend line, CSV), `experiments.js` the experiments and their numeric simulations, `ai-lab.js` the AI helper through `ai.js`, `strings.js` the translations. Saved in localStorage `fflab.v1`.
- `i18n.js`: shared page translation (ko, en, es, fr, de, ja), same saved language as the games (`arenaClashLang`).

Everything a person makes is saved in their own browser (localStorage) and can be downloaded as a file. No login.

## Patch notes

Every update to a program adds a note at the top of `patchnotes/<id>.json` (ids: `site`, `sheet`, `blocks`, `slides`, `lab`, `ai`), in the same shape the games use: `notes[].date / build / title / items`. Short noun-ending items, bump the build (`v1`, `v2`, ...) for each new code change. The page `patchnotes/` shows them with one tab per program. After merging, tell the hub thread so the wiki gets the change.
