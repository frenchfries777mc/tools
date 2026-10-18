# 자체 AI 학습 자료

Tools 사이트의 자체 AI(Qwen3)를 블록 HTML과 Fry Sheet에 맞게 학습시키는 자료와 노트예요.
계획: https://claude.ai/code/artifact/3f425a91-ed57-4ec9-8d29-d621959cba9f

## 2차 학습 (2026-10-16)
1차 자료에 없던 것을 더해서 이어서 학습해요: Fry Sheet 질문·요약 답변(`ask`), Fry Slides 발표 자료(`slides`), 모델 자기 이름(`self`), 그래프·요청 이해·코딩 더 많이. `node train/build2.js`가 `data/round2-basic.jsonl`(tarius)과 `data/round2-smart.jsonl`(lectus)를 만들어요 (각 1,923개, 이전 자료 일부 400개 포함).
- Colab 노트의 `CONTINUE`를 켜면 이미 올려 둔 모델(`FF-Tools-<크기>-merged`)에 2차 자료만 가볍게 한 바퀴 더 학습해요. 끄면 1차+2차 자료를 모두 써서 처음부터 만들어요 (똑똑함은 2바퀴).
- 사이트의 "AI 가르치기"(`teach/`)에 개발자가 적은 질문-답은 Supabase `ff_ai_facts`에 저장되고, 노트가 학습 때 읽어서 자료에 넣어요. 사이트에서는 자체 AI에게 바로 적용돼요 (`ai.js`의 `facts:true`).
- `ask`와 `self` 예시는 사이트가 보내는 것과 같은 이름 소개 문장이 시스템 글에 붙어 있어요 (`self`의 절반은 없이).

## 3차 학습 (2026-10-17, 코딩 중심)
새 블록(움직이기, 커서 따라다니기, 닿았나, 저장·불러오기 등) 코딩, 고칠 때 바꾼 곳만 바꾸기, 요청을 빠짐없이 이해하기를 더했어요 (`raw/code-12~14`, `raw/und-10`). `node train/build3.js` 가 `data/round3-basic.jsonl`(tarius 이어 학습, 이름은 1.1)과 `data/round3-smart.jsonl`(lectus 처음 학습에 더함)을 만들어요. 노트의 `CONTINUE`를 켜고 `ROUND`를 3으로 두면 tarius에 3차 자료만 한 바퀴 더 해요.
- 노트는 100단계마다 구글 드라이브에 저장하고, 끊기면 같은 셀을 다시 돌려 이어서 해요.

## 다음 학습용 자료 (2026-10-17)
Fry Sheet AI 계산(`raw/calc-1`: 말로 쓴 계산 → 수식, 단위 문장 → `{value, from, to}`), Fry Slides 맞춤법 고치기(`raw/spell-1`), 블록 설명(`raw/explain-1`) 예시를 모아 뒀어요. 질문 글은 `ai-prompts.js`의 `calcSys`·`unitSys`·`spellSys`·`explainSys`예요. 아직 `build*.js`에 넣지 않았어요.

## 학습시키기 (주인이 하는 일)
1. [Colab에서 노트 열기](https://colab.research.google.com/github/frenchfries777mc/tools/blob/main/train/colab.ipynb)
2. 런타임 유형을 **T4 GPU**로 바꾸고, 설정 칸에서 `basic`(기본) 또는 `smart`(똑똑함)을 고르고 Hugging Face 토큰을 넣어요.
3. **모두 실행**. 끝나면 나오는 모델 주소를 Claude에게 알려 주면 사이트에 연결해요.

| | 기본 | 똑똑함 |
|---|---|---|
| 바탕 모델 | Qwen3 1.7B | Qwen3 4B |
| 학습 | `data/basic.jsonl` 1,000개, 1바퀴 | `data/full.jsonl` 2,600개, 3바퀴 |

## 기준 시험 (Kaggle, 1.4 목표 재기)
기본 Qwen3 1.7B·4B와 타리우스·렉투스에게 같은 시험 140문제(`eval/baseline-v1.jsonl`)를 4비트, 사이트 설정으로 내고 점수를 비교해요. 목표: 타리우스 = Qwen3 4B 점수, 렉투스 = Qwen3 4B × 3.5 (100을 넘으면 틀린 비율 ÷ 3.5).
1. Kaggle에서 **File → Import Notebook** 으로 `train/kaggle-eval.ipynb`를 열어요 (GitHub 주소 https://github.com/frenchfries777mc/tools/blob/main/train/kaggle-eval.ipynb 또는 파일 올리기).
2. 오른쪽 **Session options**: **Accelerator = GPU T4** (T4 x2도 돼요), **Internet = On**.
3. **Add-ons → Secrets** 에 `HF_TOKEN`(Hugging Face 토큰)을 넣고 이 노트에 체크해요. 없으면 기본 Qwen만 시험해요.
4. **Run All**. 약 40~60분 (추정). 맨 아래 요약 칸을 캡처해서 보내 주세요. Output에 `baseline-results.json`(점수)과 `baseline-answers.jsonl`(모든 답, 다음 학습 자료 찾기용)이 남아요.
- 채점: 코드는 jsdom에서 페이지를 열고 눌러 봐요(노드가 없으면 정적 검사만), 계산·수식은 값을 계산해서 비교, 그래프·표는 JSON 값, 단어·모르는 말은 뜻 또는 "모른다/되묻기", 같은 구절 3번 반복이나 한자 섞임은 0점.
- 사이트는 MLC q4f16_1, 노트는 bitsandbytes nf4라서 점수가 아주 똑같지는 않아요.
- 고칠 때: `eval/ffeval.py`(채점), `eval/html_run.js`(페이지 실행), `eval/baseline-v1.jsonl`(문제)을 고치고 `python3 train/make_kaggle_eval.py`로 노트를 다시 만들어요. 검사: `python3 -m unittest train/eval/test_ffeval.py` (`FF_NODE_PATH`에 jsdom이 있는 node_modules를 주면 페이지 검사까지).

## 자료 비율
코딩 30%, 요청 이해 20%, 번역 15%, 그래프 15%, 수식 10%, 표 10%. 시험용 160개(`data/test.jsonl`)는 학습에 쓰지 않아요.

## 파일
- `raw/` 할 일별 원본 (사람이 읽는 형식). `ref/BRIEF-*.md` 쓰는 규칙, `ref/catalog.txt` 블록 목록.
- `check.js` 원본 검사기. 블록은 실제 편집기에서 열고 미리보기를 돌려 버튼까지 눌러 봐요. 수식은 계산 결과를 비교해요.
- `check.js`는 `ask`(표 숫자 다시 계산), `slides`(사이트 코드로 읽어 보기), `self`도 검사해요.
- `build.js` 검사를 통과한 것만 모아 비율대로 `data/`를 만들어요: `node train/build.js`
- 사이트가 AI에게 보내는 짧은 질문은 `../ai-prompts.js` 하나에만 있어요. 바꾸면 `build.js`를 다시 돌리고 다시 학습해야 해요.
