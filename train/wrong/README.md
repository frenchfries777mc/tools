# 틀렸어요 자동 흐름

사람이 하는 일은 없어요 (처음 한 번 저장소 secret 넣기만).

1. AI 체험 등에서 틀렸어요를 누르면 서버 표 `ff_ai_wrong`에 질문, 답, 앞 대화가 쌓여요. (로그인한 사람만 서버에 가요. `supabase-ff-ai-wrong.sql`, 앞 대화는 `supabase-ff-ai-wrong-history.sql`을 실행해야 해요.)
2. `.github/workflows/wrong-sync.yml`이 3시간마다 `sync.js`를 돌려 서버의 틀렸어요를 `wrong-inbox` 가지의 `inbox.jsonl`로 옮겨요.
3. Claude가 학습 자료를 쓸 때 `git fetch origin wrong-inbox` 후 `node train/wrong/tool.js show`로 읽고 한 줄씩 판정해요: 진짜 틀림은 올바른 답으로 학습 자료에 넣고, 장난은 버리고, 애매한 건 오너에게 물어요.
4. 판정이 끝난 id는 `node train/wrong/tool.js done <id>...`로 `done.json`에 적어 PR로 합쳐요. 다음 sync가 그 id를 서버에서 지워요.

필요한 secret: 저장소 Settings > Secrets and variables > Actions > `SUPABASE_SERVICE_KEY` (Supabase 프로젝트의 service_role 키). 이 키는 Actions 안에서만 쓰고 사이트나 코드에는 들어가지 않아요.
테스트: `node train/wrong/sync.test.js`
