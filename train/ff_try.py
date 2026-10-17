"""Runs a merged FF777 model on the Block HTML example requests with the same prompt the site sends (system = SYS_HTML
from blocks/ai-blocks.js, user = "Request: ..."), greedy decoding, thinking off. Prints each answer between markers so the
Actions log can be read. Usage: python train/ff_try.py <hf model> <shard> <shards> [max_new_tokens]"""
import json, os, re, sys, time
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

model_id, shard, shards = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
max_new = int(sys.argv[4]) if len(sys.argv) > 4 else 1400
req = sys.argv[5] if len(sys.argv) > 5 else 'train/eval/example-requests.json'
src = open('blocks/ai-blocks.js', encoding='utf-8').read()
m = re.search(r"var SYS_HTML=\[(.*?)\]\.join\('\\n'\);", src, re.S)
system = eval('[' + m.group(1) + ']')  # list of plain string literals
system = '\n'.join(system)
items = json.load(open(req, encoding='utf-8'))
token = os.environ.get('HF_TOKEN')
tok = AutoTokenizer.from_pretrained(model_id, token=token)
model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=torch.float32, token=token)
model.eval()
print('loaded', model_id, flush=True)
for i, it in enumerate(items):
    if i % shards != shard: continue
    msgs = [{'role': 'system', 'content': system}, {'role': 'user', 'content': 'Request: ' + it['q']}]
    text = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True, enable_thinking=False)
    ids = tok(text, return_tensors='pt')
    t0 = time.time()
    with torch.no_grad():
        out = model.generate(**ids, max_new_tokens=max_new, do_sample=False, stop_strings=['</html>'], tokenizer=tok)
    ans = tok.decode(out[0][ids['input_ids'].shape[1]:], skip_special_tokens=True)
    ans = re.sub(r'<think>.*?</think>', '', ans, flags=re.S).strip()
    print(f'=====BEGIN {i} {it["name"]} | {it["q"]} | tokens {out.shape[1]-ids["input_ids"].shape[1]} | {time.time()-t0:.0f}s', flush=True)
    print(ans, flush=True)
    print(f'=====END {i}', flush=True)
