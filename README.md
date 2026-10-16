# Frenchfries777 Tools

Browser tools, served at https://frenchfries777mc.github.io/tools/ (GitHub Pages from `main`).

- `index.html`: tool list (same look as the Games and Educations sites, with the Games | Educations | Tools switch).
- `sheet/`: **Fry Sheet**, a spreadsheet. `engine.js` is the formula engine (testable in Node), `app.js` the UI, `strings.js` translations and the function list. `xlsx.full.min.js` is SheetJS 0.18.5 (Apache 2.0), loaded only when opening or saving Excel files.
- `blocks/`: **Block HTML**, JavaScript blocks that build a web page and export it as an HTML file. `blocks.js` holds the custom blocks, generators and HTML builder, `examples.js` the examples, `lib/` is Blockly 11.2.2 (Apache 2.0).
- `slides/`: **Fry Slides**, an AI presentation maker. `app.js` draws, edits, presents, prints and exports the slides, `ai-slides.js` makes decks and rewrites slides through `ai.js`, `strings.js` holds the translations. `lib/` is PptxGenJS 4.0.1 (MIT), loaded only when downloading a .pptx.
- `i18n.js`: shared page translation (ko, en, es, fr, de, ja), same saved language as the games (`arenaClashLang`).

Everything a person makes is saved in their own browser (localStorage) and can be downloaded as a file. No login.
