# Writing Fry Sheet training items

You are writing training data for a small AI (Qwen3) that works inside **Fry Sheet**, a spreadsheet at
/home/claude/tools/sheet/. Every answer must be exactly right: a wrong example teaches the AI a mistake.
Users are mostly Korean students and teachers; the site also runs in English, Spanish, French, German, Japanese.

One item = one JSON line in the file you were given. Then run the checker (required) and fix every failing line:
```
node /home/claude/tools/train/check.js <task> <your file>
```
Work in batches (e.g. 25 items, check, continue). No two items alike: vary topics (school, sports, shop, weather,
club, travel, games, science, money, health…), table sizes, wording, casual/polite tone, small typos sometimes.
Language of requests: about 70% Korean, 20% English, 10% Japanese/Spanish/French/German.

## task `tr` — translation through the cell function =AI("instruction", A2)
`{"instr":"영어로 번역","text":"저는 떡볶이를 좋아해요","answer":"I like tteokbokki."}`
- `instr` varies the way people write it: "영어로 번역", "영어로", "영어로 바꿔줘", "Translate to English", "translate into Korean", "한국어로 번역", "일본어로 번역", "스페인어로", "프랑스어로 번역해 줘", "독일어로"… 
- Directions: about 60% Korean→English, 20% English→Korean, 20% Korean→Japanese/Spanish/French/German (a few English→those).
- `text`: school and daily-life sentences, chat messages, notices, short paragraphs (1–3 sentences), titles, single words, questions, numbers/dates/times, emoji sometimes.
- `answer`: a natural, faithful translation, only the translation (no quotes, no notes). Never change the meaning,
  never swap foods/places/names for "similar" ones. Words that exist only in Korea are romanized as spoken:
  떡볶이 → tteokbokki, 김밥 → gimbap, 추석 → Chuseok, 한복 → hanbok, 김치찌개 → kimchi-jjigae, 학원 → hagwon (or "academy" when clearer), 선배 → senior (sunbae) only if natural.
  Keep names as romanized (민지 → Minji). Keep numbers, units and emoji.
  Include many items with such Korea-only words (at least 1 in 4).

## task `formula` — a request in words → one formula
`{"table":[["이름","국어","수학"],["민지",90,80],["준호",70,95]],"at":"A1","cell":"E2","q":"B열 평균","formula":"=AVERAGE(B2:B3)","explain":"B열 점수의 평균이에요.","expect":80}`
- `table`: the table the person selected (first row = headers), numbers as numbers. `at` = its top-left cell (mostly A1; sometimes B2, C3…). Tables 3–15 rows, 2–7 columns.
- `cell`: where the formula goes (outside the table data, e.g. below the table or in an empty column).
- Allowed functions: see `/home/claude/tools/train/ref/functions.txt` (only these). Strings in double quotes, commas between arguments.
- `q`: how people really ask: "B열 평균", "수학 80점 넘는 사람 몇 명?", "합계", "가장 높은 점수", "민지 점수 찾아줘", "평균을 소수 첫째 자리까지", "60 미만이면 재시험 표시", "이름 옆에 등수"… Refer to columns by letter or by header name.
- `explain`: one short sentence in the request's language.
- `expect`: the exact value the formula gives on this table (number or text). The checker computes the formula and compares.

## task `table` — make a table from a request
`{"q":"우리 반 6명의 이름, 키, 좋아하는 과일 표","rows":[["이름","키(cm)","좋아하는 과일"],["민지",152,"딸기"],…]}`
- First row = headers; every row the same length; 3–25 rows usually (up to 60), 2–8 columns.
- Numbers as plain numbers (units go in the header, never in the cell). Realistic, sensible values; text in the request's language.
- Do exactly what was asked: the requested count of rows, the requested columns in the requested order.
- Requests vary: class lists, timetables, budgets, shopping lists, schedules, sports records, survey results, recipes, reading logs, experiment data, world facts (keep facts correct; prefer rounded well-known values)…

## task `graph` — make a chart from the selected table
`{"table":[["이름","국어","수학"],["민지",90,80],["준호",70,95],["서연",85,60]],"at":"A1","q":"수학 점수를 막대 그래프로","answer":{"type":"bar","range":"A1:C4","series":["C"],"title":"수학 점수"}}`
- `type`: bar (compare items), hbar (long names / rankings), line (change over time: months, days, years), pie (parts of a whole; exactly one series), scatter (relation between two number columns; series = [x, y]).
- `range`: covers the header row and the label column through the last row (real addresses using `at`).
- `series`: letters of the number columns to plot, never the label column.
- `title`: short, in the request's language.
- The label column (first column of `range`) must hold text: "2019년", "1주차", "Jan", never bare numbers like 2019. For scatter, list `series` left to right; the leftmost is x.
- Requests: sometimes name the type ("꺾은선으로"), often only the goal ("어떻게 변했는지 보고 싶어", "누가 제일 많이 팔았는지", "비율", "키랑 몸무게 관계") so the type must be chosen well; sometimes only some columns ("국어만", "1월과 2월 비교").
- Tables 3–14 rows, 2–6 columns, with numbers as numbers.
