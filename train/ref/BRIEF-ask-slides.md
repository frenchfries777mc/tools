# Writing "ask", "self" and "slides" training items

Prompts come from `../../ai-prompts.js` (FFP): `askSys`/`askPrompt` for the Fry Sheet "질문·요약" tab,
`slides*` for Fry Slides with the built-in AI. Check every file (required) and fix every failing line:
```
node train/check.js ask    train/raw/ask-N.jsonl
node train/check.js self   train/raw/self-N.jsonl
node train/check.js slides train/raw/slides-N.jsonl
```

## task `ask` — a question about the selected table, or any request
`{"table":[["이름","점수"],["민지",90],["준호",75]],"q":"평균은?","answer":"두 사람의 평균은 82.5점이에요.","claims":[{"fn":"avg","col":"B","value":82.5}]}`
- `table` is what the person selected (first row = headers, `at` = top-left cell, default A1), or `null`
  for "(No table selected.)". The checker builds the exact table text the sheet sends.
- Mix: about half table questions (summaries, max/min, totals, averages, medians, counts with a condition,
  trends, comparisons, ranks, outliers, empty cells) and half general requests (short stories, poems, concepts,
  ideas, advice, simple math, definitions, greetings, how-to for the sheet). Some general requests come with an
  unrelated table selected: mark them `"general":true`.
- Language: answer in the language of the question (≈60% Korean, then English, Japanese, Spanish, French, German).
  Names and labels from the table may stay as written. `"lang":"en"` etc. when the question asks for another language.
- Answers do what was asked: tell the story, write the poem, give the number. Never repeat or paraphrase the
  request ("아무 이야기도 들려줘요" is the bug this task fixes). Plain text, no markdown tables, `**` or code fences;
  short numbered lines are fine. Concise: stories ≤ about 8 sentences, at most 1,100 characters.
- No live facts (today's weather, date, news): say it cannot see them and offer what it can do.
- Numbers must be right. In a table answer every number must follow from the table (cells, sums, averages,
  min/max, differences, ratios, percentages, products like price × units); state counts as digits ("3 players").
  `claims` are recomputed: `fn` max|min|sum|avg|median|count, `col` letter, optional `where` {"col","op","v"},
  `label` (the row's first-column text for max/min, must be named in the answer), `digits` for rounding.
  `extra:[...]` lists numbers the item vouches for that are not computed from the table (a scale "of 20",
  a goal from the question, 340 min = 5 h 40 min). `expect` checks the result of a general math question.

## task `self` — questions about the model itself (ask format, no table)
Answers use placeholders that build.js fills per model: `{NAME}` (FF777 1.0 tarius), `{BASE}` (Qwen3 1.7B),
`{LATIN}` (elementarius), `{MEANING_KO}` (기본), `{MEANING_EN}` (basic). Facts: made by Frenchfries777 for the
Frenchfries777 Tools site (Fry Sheet, Block HTML, Fry Slides, Fry Lab); the name is the end of a Latin word;
runs inside the browser; based on Qwen3 (Apache 2.0); not ChatGPT/Claude/Siri. In Korean put only particle-free
endings after a placeholder (`{NAME}입니다`, not `{NAME}이에요`).

## task `slides` — Fry Slides with the built-in AI
Three kinds of items. Answers are compact JSON read with the site's own `norm()`/`readAll()` (slides/ai-slides.js).
- `{"kind":"deck","topic","aud"?,"n","outline":{"title","subtitle","slides":[{"layout","title"}...]},"fills":[{"slides":[...]}...]}`
  gives one outline example plus one example per batch of 3 slides. The checker replays `genLocal()`: the deck is
  named after the outline title, slide 1 gets the outline subtitle and is skipped, the rest go 3 per request, and
  later prompts show what earlier batches wrote. `fills` may stop early (big decks).
  Outline: exactly `n` slides (3–15), only layout + title, slide 1 `title`, last `closing`, no title/closing in
  between, mostly `bullets`, short titles (≤40 chars). Avoid `stat` in outlines (the site turns a stat slide
  without a number into bullets); a `quote` slide's planned title becomes its quote text until filled.
  Fill: same layout and title as planned (quote slides have no title), bullets 3–4, `two` = leftTitle/left[2–4]
  + rightTitle/right[2–4], `section`/`closing` = title + subtitle, every slide has `notes` of 1–3 sentences.
- `{"kind":"act","deck","n","i","task":"rewrite|shorter|longer","slide":{...},"answer":{...}}` (다시 쓰기, 더 짧게,
  더 자세히; i is 0-based). Keep the layout. rewrite: new wording, same meaning, 3–5 bullets. shorter: less text,
  no more items, 2–4 bullets, shorter notes. longer: more specific (≥15% more text), up to 6 bullets, fuller notes
  (≤5 sentences). A slide without notes (the title slide) may answer without notes.
- `{"kind":"add","deck","titles":[...],"i","q","answer":{...}}` (AI로 슬라이드 추가; goes after slide i+1):
  any layout that fits, often `stat` (stat ≤16 chars like "약 1.1℃", caption) or `quote` (quote + by).
- Only the fields the layout uses (+ notes); bullets are short phrases (≤60 Hangul / 95 Latin chars), no "-" or
  "1." marks inside. Text in the deck's language. Real, well-known facts with round numbers; never invent the
  person's own data (sales, survey results, prices): put such numbers in the request when a slide needs them.
- Size: the outline answer must fit 900 tokens, a fill 1,800, an act/add 1,200; a whole example ≤3,500.
