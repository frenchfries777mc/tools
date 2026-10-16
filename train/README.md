# 자체 AI 학습 자료

Tools 사이트의 자체 AI(Qwen3)를 블록 HTML과 Fry Sheet에 맞게 학습시키는 자료와 노트예요.
계획: https://claude.ai/code/artifact/3f425a91-ed57-4ec9-8d29-d621959cba9f

## 학습시키기 (주인이 하는 일)
1. [Colab에서 노트 열기](https://colab.research.google.com/github/frenchfries777mc/tools/blob/main/train/colab.ipynb)
2. 런타임 유형을 **T4 GPU**로 바꾸고, 설정 칸에서 `basic`(기본) 또는 `smart`(똑똑함)을 고르고 Hugging Face 토큰을 넣어요.
3. **모두 실행**. 끝나면 나오는 모델 주소를 Claude에게 알려 주면 사이트에 연결해요.

| | 기본 | 똑똑함 |
|---|---|---|
| 바탕 모델 | Qwen3 1.7B | Qwen3 4B |
| 학습 | `data/basic.jsonl` 1,000개, 1바퀴 | `data/full.jsonl` 2,600개, 3바퀴 |

## 자료 비율
코딩 30%, 요청 이해 20%, 번역 15%, 그래프 15%, 수식 10%, 표 10%. 시험용 160개(`data/test.jsonl`)는 학습에 쓰지 않아요.

## 파일
- `raw/` 할 일별 원본 (사람이 읽는 형식). `ref/BRIEF-*.md` 쓰는 규칙, `ref/catalog.txt` 블록 목록.
- `check.js` 원본 검사기. 블록은 실제 편집기에서 열고 미리보기를 돌려 버튼까지 눌러 봐요. 수식은 계산 결과를 비교해요.
- `build.js` 검사를 통과한 것만 모아 비율대로 `data/`를 만들어요: `node train/build.js`
- 사이트가 AI에게 보내는 짧은 질문은 `../ai-prompts.js` 하나에만 있어요. 바꾸면 `build.js`를 다시 돌리고 다시 학습해야 해요.
