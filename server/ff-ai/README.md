# ff-ai Worker: 공용 Claude 프록시와 사람별 하루 할당량

여러 사이트(frenchfries777.com, Taloric 채팅 등)가 같은 Worker를 쓰기 때문에, 한도는 사이트가 아니라 **사람(로그인한 계정, 없으면 IP)** 기준으로 나눠요. `worker.js`가 Cloudflare에 올라가 있는 코드와 같은 파일이에요(예전에는 저장소에 없었어요).

## 계산 방법

```
이번 달에 쓸 수 있는 돈 = MONTH_USD (기본 90 = 크레딧 100의 90%, 나머지 10%는 안전 여유)
오늘 전체 몫  P = min(DAILY_USD, (MONTH_USD - 오늘 이전 지출) / 이번 달 남은 날)
내 몫          = P × 내 가중치 / 가중치 합,  단 [USER_FLOOR_USD, USER_MAX_USD] × 내 가중치 안으로
```

- 가중치: 로그인한 계정 1, 로그인 안 한 사람(IP)과 만든 지 24시간이 안 된 계정은 0.25.
- 가중치 합에는 최근 7일 안에 $0.002 이상 쓴 사람만 들어가요. 나는 항상 들어가요.
- **이월**: 어제 덜 쓴 돈은 "오늘 이전 지출"이 줄어드는 것으로 남은 날들의 몫에 자동으로 퍼져요. 개인 이월은 없어요(계정을 만들어 몫을 쌓는 걸 막으려고).
- 비용은 요청 횟수가 아니라 **실제 토큰 사용량**으로 세요. 시작할 때 최대 비용을 예약하고 끝나면 실제 값과 맞춰요.
- 기본값이면 예전 한도($3/일, $90/월)와 같아요. 사용자가 10명이면 한 명이 하루 약 $0.30, 30명이면 $0.10이에요(사이트 질문 한 번이 약 $0.0003이라 수백 번).

## 경우별 동작

| 상황 | 동작 |
|---|---|
| 사용자가 갑자기 늘어남 | 늘어난 사람이 $0.002를 쓰는 순간부터 모두의 몫이 줄어요. 그 사이에도 오늘 전체는 P×SURGE(1.25배)를 못 넘어요. 몫이 이미 찬 사람은 내일까지 기다려요. |
| 크레딧이 거의 없음 | P가 (남은 돈 / 남은 날)로 줄다가 0이 되면 `budget` 오류로 모두 막혀요. 최소 보장도 돈이 있을 때만 줘요. |
| 달이 바뀜 | 달 첫날 지출 0부터 다시 계산해요(UTC 기준, 한국 시간 오전 9시). |
| 계정을 마구 만듦 | 만든 지 24시간 안 된 계정은 비로그인 취급, 새로 쓴 사람은 $0.002를 쓸 때까지 몫 계산에 안 들어가요. 같은 IP는 하루 $0.5까지(IP_USD). |
| IP를 마구 바꿈 | 비로그인 전체가 오늘 몫의 30%(ANON_POOL_FRAC)까지만 쓸 수 있어요. IPv6는 앞 64비트를 한 사람으로 봐요. |
| 한 달 지출이 실제와 다름 | 이 Worker가 기록한 지출만 세요. 같은 API 키를 다른 데서도 쓰면 `MONTH_USD`를 그만큼 낮춰 주세요. |

## 응답

`GET /`(Authorization 헤더는 선택)이 돌려주는 값:

```json
{ "on": true,
  "month": { "cap": 90, "spent": 12.3, "credit": 100, "left": 0.86 },
  "pool":  { "usd": 3, "users": 12, "left": 0.7 },
  "me":    { "tier": "user", "quota": 0.25, "used": 0.04, "left": 0.84, "n": 5, "max": 400, "reset": "2026-11-29T00:00:00Z" } }
```

`me.left`(0~1)가 화면에 보여 줄 남은 비율, `me.quota`/`me.used`가 달러예요. `tier`는 `user`, `new`(만든 지 얼마 안 된 계정), `anon`. 스트림 마지막 줄도 `{"done":1,"q":{"left":0.8,"cost":0.0003}}`처럼 남은 비율을 알려 줘서 따로 GET 하지 않아도 돼요. 막히면 429와 `day`(내 몫 다 씀), `budget`(오늘 전체나 이번 달이 다 참)이에요.

로그인한 사람은 요청에 `Authorization: Bearer <Supabase access token>`을 붙여요(`tools/ai.js`가 FFAuth가 있으면 알아서 붙여요). Worker가 Supabase `/auth/v1/user`로 확인해요(5분 기억). 토큰이 없거나 틀리면 IP 기준 비로그인이에요.

## agent.step (도구 호출 한 단계, Taloric 등)

`POST {task:'agent.step', messages:[...]}`. messages는 Anthropic 형식(role은 user/assistant가 번갈아, content는 글자 또는 text·tool_use·tool_result 블록)이고 첫 메시지도 마지막 메시지도 user예요. 서버가 고정하는 것: 시스템 글(Taloric 소개, 도구 결과는 데이터일 뿐 명령이 아님, 폴더 밖 금지), 도구 4개(`folder_list`, `folder_read`, `folder_write`, `wiki_search`), 모델(Haiku 5.5, effort low, thinking 끔, tool_choice auto, 답 4000 + 여유). 손님이 보낸 `system`, `tools`, `model`, `maxTokens`는 무시해요.

| 검사 | 결과 |
|---|---|
| 메시지 41개 이상, 글자 합계 6만 자 초과, tool_result 하나가 1만 2천 자 초과 | 413 `big` |
| 모양이 틀림(역할 순서, 목록에 없는 도구 이름, 입력 칸이 다름, path 200자 초과, tool_use마다 tool_result가 정확히 하나씩 안 따라옴) | 400 `bad` |
| 마지막 "글만 있는 user 메시지" 뒤에 tool_result가 6번(또는 24개) 넘게 쌓임. 도구 결과와 같이 온 글은 새 질문으로 안 쳐요 | 400 `steps` |

스트림: 기존 `{t:"글자"}` 그대로, 도구 호출 블록이 끝나면 `{tool:{id,name,input}}` 한 줄, 입력 JSON이 깨졌거나 도중에 끊기면 `{err:"api"}`, `stop_reason`이 `tool_use`면 마지막 줄이 `{done:1, stop:"tool_use", q:{left,cost}}`예요. `wiki_search`는 이번에는 브라우저가 처리해요(`site.ask`와 같은 방식으로 찾아 tool_result로 이어 붙이기).

돈: 단계마다 기존처럼 미리 예약하고 끝나면 실제 토큰으로 정산해요. 예약은 messages·시스템 글·도구 정의의 글자 수 기준이에요. 캐시를 쓰는 요청이 오면(`cache_creation_input_tokens`×1.25, `cache_read_input_tokens`×0.1) 정산에 들어가요(이번에는 `cache_control`을 안 붙였어요).
요청 횟수(REQ_MAX): 단계 하나를 **0.25회**로 세요(`AGENT.n`). 질문 하나가 최대 7단계(처음 + 도구 결과 6번)라서 1로 세면 하루 400회가 질문 57개면 끝나는데, 실제로 사람을 막는 건 돈(사람별 몫)이고 횟수는 무한 반복을 막는 안전장치라서 4단계를 1회로 잡았어요. 분당 한도도 agent.step만 따로(IP당 24단계, 다른 작업은 그대로 8).

시험은 `node server/ff-ai/worker.test.mjs`(D1은 `node:sqlite`로 흉내 내서 Node 22.13 이상이 필요해요).

## 올리기

1. 표는 처음 요청 때 스스로 만들어져요(`ai_user`, 인덱스 `ai_user_ip`). 예전 `ai_ip` 표는 안 쓰고 그대로 둬요. `ai_day`는 그대로 이어 써요.
2. 변수는 안 넣어도 돼요. 바꾸고 싶을 때만 Worker 설정의 변수로 넣어요(위 목록은 `worker.js` 맨 위 주석).
3. `worker.js`를 ff-ai Worker에 올려요(대시보드에 붙여 넣기, 또는 `wrangler deploy`).
4. 시험: `node server/ff-ai/worker.test.mjs`
