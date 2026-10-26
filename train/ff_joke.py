"""Runs a merged FF777 model (CPU) on the owner's 115 dad jokes (ai-chat/jokes.js) and checks every answer against its own
punchline. Two prompts per riddle: "train" = the exact training prompt (P.askSys + "(No table selected.)\n\nQuestion: q"),
"chat" = the AI chat page prompt (chatSys() at the 보통 length, bare question). Greedy decoding, thinking off.
Writes out/<shard>.jsonl. Usage: python train/ff_joke.py <hf model> <shard> <shards> [max_new_tokens]"""
import json, os, re, sys, time
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

model_id, shard, shards = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
max_new = int(sys.argv[4]) if len(sys.argv) > 4 else 64
src = open('ai-chat/jokes.js', encoding='utf-8').read()
jokes = json.loads(re.search(r'var J=(\[.*?\n\]);', src, re.S).group(1))
ask_sys = re.search(r"P\.askSys='([^']*)'", open('ai-prompts.js', encoding='utf-8').read()).group(1)
chat_sys = ('You are chatting with a curious person. Answer in 3 to 5 sentences with one concrete example. Be warm and natural. '
            'Plain text only: no markdown tables, no code fences. Use the language the question is written in.')
token = os.environ.get('HF_TOKEN')
tok = AutoTokenizer.from_pretrained(model_id, token=token)
model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=torch.bfloat16, token=token)
model.eval()
print('loaded', model_id, len(jokes), 'jokes', flush=True)
# "any joke" requests (1.7): the answer must be one of the 115 riddles with its own punchline; the same wordings the training set uses plus unseen ones
ANY = ['아재개그 하나만', '아재개그 좀', '아재개그 해줘', '개그 하나', '웃긴 거 하나', '웃겨줘', '하나만', '아재개그 하나 더', '다른 아재개그', '넌센스 퀴즈 내줘',
       '아재개그 ㄱ', '심심해 아재개그', 'tell me a dad joke', '아재개그 아무거나', '재밌는 아재개그 하나 말해 줘', '썰렁한 거 하나', '아재개그 한 방', '개그 좀 쳐봐',
       '농담 하나 해줘', '웃긴 퀴즈 하나', '아재 개그 부탁해요', '드립 하나', '오늘의 아재개그', '아재개그 아무거나 하나만', '빵 터지는 거 하나', '아재개그 신박한 거',
       '개그 ㄱㄱ', '하나 던져봐', '개그맨처럼 해줘', '아재개그 퀴즈']
os.makedirs('out', exist_ok=True)
f = open(f'out/{shard}.jsonl', 'w', encoding='utf-8')
for i, (q, a) in enumerate(jokes + [(w, '') for w in ANY]):
    if i % shards != shard: continue
    anyq = i >= len(jokes)
    for mode, msgs in (('train', [{'role': 'system', 'content': ask_sys}, {'role': 'user', 'content': '(No table selected.)\n\nQuestion: ' + q}]),
                       ('chat', [{'role': 'system', 'content': chat_sys}, {'role': 'user', 'content': q}])):
        text = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True, enable_thinking=False)
        ids = tok(text, return_tensors='pt')
        t0 = time.time()
        with torch.no_grad():
            out = model.generate(**ids, max_new_tokens=max_new, do_sample=False)
        ans = tok.decode(out[0][ids['input_ids'].shape[1]:], skip_special_tokens=True)
        ans = re.sub(r'<think>.*?</think>', '', ans, flags=re.S).strip()
        row = {'i': i, 'mode': ('any-' + mode) if anyq else mode, 'q': q, 'a': a, 'ans': ans}
        f.write(json.dumps(row, ensure_ascii=False) + '\n'); f.flush()
        print(f'{i} {mode} {time.time()-t0:.0f}s | {q} -> {ans!r}', flush=True)
