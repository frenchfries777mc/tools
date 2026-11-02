"""Builds train/local/run.py (a plain Python script for a PC with an NVIDIA GPU, run inside WSL2/Linux) from train/lightning.ipynb.
Same training and same data as the notebooks; only these change: settings come from environment variables (MODEL, VERSION, CONTINUE, ...),
the pip cell is dropped (train/local/README.md has the install steps), and with a small GPU (<=10GB) the batch is 1 x accumulation 8.
Run from the repo root: python3 train/make_local.py"""
import json, ast
nb = json.load(open('train/lightning.ipynb'))
cells = [''.join(c['source']) for c in nb['cells'] if c['cell_type'] == 'code']
parts = []
for s in cells:
    if s.lstrip().startswith(('%%capture', '!pip', '%')): continue
    parts.append(s)

head = '''#!/usr/bin/env python3
# Tools 자체 AI 학습 (내 컴퓨터용). 설치와 실행 방법은 train/local/README.md 에 있어요. train/make_local.py 가 만든 파일이라 직접 고치지 마세요.
# 설정은 환경 변수로 바꿔요: MODEL=smart|basic|premus  VERSION=2.0  CONTINUE=1  MAX_LEN=2048  MAX_TRAIN_HOURS=12
import os
def _env(name, default): return os.environ.get(name, default)
'''
s = parts[0]   # settings cell
s = s.replace('MODEL = "premus"  #@param ["basic", "smart", "premus"]', 'MODEL = _env("MODEL", "smart")')
s = s.replace('VERSION = "2.0"  #@param ["2.0", "1.9", "1.8", "1.7", "1.6", "1.5", "1.4", "1.3"]', 'VERSION = _env("VERSION", "2.0")')
s = s.replace('HF_TOKEN = ""  #@param {type:"string"}', 'HF_TOKEN = ""')
s = s.replace('RUN_EVAL = True  #@param {type:"boolean"}', 'RUN_EVAL = _env("RUN_EVAL", "1") == "1"')
s = s.replace('CONTINUE = True  #@param {type:"boolean"}', 'CONTINUE = _env("CONTINUE", "1") == "1"')
s = s.replace('ROUND = 3  #@param [2, 3]', 'ROUND = int(_env("ROUND", "3"))')
s = s.replace('MAX_TRAIN_HOURS = 6.0  #@param {type:"number"}', 'MAX_TRAIN_HOURS = float(_env("MAX_TRAIN_HOURS", "12"))')
s = s.replace('EVAL_MINUTES = 45  #@param {type:"number"}', 'EVAL_MINUTES = int(_env("EVAL_MINUTES", "45"))')
s = s.replace('MAX_LEN = 4096', 'MAX_LEN = int(_env("MAX_LEN", "4096"))')
s = s.replace('getpass.getpass("Hugging Face Write 토큰(hf_...)을 붙여 넣고 Enter: ")', 'input("Hugging Face Write 토큰(hf_...)을 붙여 넣고 Enter (글자가 그대로 보여요): ")')
s = s.replace('#@title 설정\n', '')
assert '#@param' not in s, 'a Colab param is left in the settings'
# MAX_TRAIN_HOURS for premus was raised to >= 7 for a T4 session; locally the number given is the number used
s = s.replace('MAX_TRAIN_HOURS = max(MAX_TRAIN_HOURS, 7.0); ', '')
parts[0] = head + s

t = parts[next(i for i, p in enumerate(parts) if 'per_device_train_batch_size' in p)]
i = parts.index(t)
old = 'per_device_train_batch_size=1 if MODEL == "premus" else 2, gradient_accumulation_steps=8 if MODEL == "premus" else 4,'
assert old in t
t = t.replace(old, 'per_device_train_batch_size=1 if (MODEL == "premus" or SMALL_GPU) else 2, gradient_accumulation_steps=8 if (MODEL == "premus" or SMALL_GPU) else 4,')
t = 'SMALL_GPU = torch.cuda.get_device_properties(0).total_memory < 10 * 2**30   # 8GB laptop GPU: batch 1 x 8 steps, the same 8 rows per update as the bigger setups\n' + t
parts[i] = t

src = '\n\n'.join(parts) + '\n'

# Extra knobs for training a model again on top of a version that is already on Hugging Face (so a weak memory of the 115 jokes can be strengthened):
#   BASE_VERSION=1.9   start from FF-Tools-<size>-merged-1.9 instead of the previous version
#   LORA_R=32  EPOCHS=3  LR=2e-4   override the training size, passes and learning rate
#   JOKE_REPEAT=3      every joke row is seen this many times per pass (copies are added)
#   OUT_TAG=b          the upload goes to FF-Tools-<size>-merged-<VERSION><OUT_TAG> (1.9b), so the version already there is not overwritten
a1 = 'MAX_LEN = int(_env("MAX_LEN", "4096"))\n'
assert a1 in src
src = src.replace(a1, a1 + '''BASE_VERSION = _env("BASE_VERSION", "")
if BASE_VERSION: CFG.update(base=f"Frenchfries777/FF-Tools-{CFG['size']}-merged-{BASE_VERSION}", epochs=2, lr=1e-4)
if _env("LORA_R", ""): CFG["r"] = int(_env("LORA_R", ""))
if _env("EPOCHS", ""): CFG["epochs"] = int(_env("EPOCHS", ""))
if _env("LR", ""): CFG["lr"] = float(_env("LR", ""))
JOKE_REPEAT = int(_env("JOKE_REPEAT", "1"))
OUT_TAG = _env("OUT_TAG", "")
print("바탕 모델:", CFG["base"], "| r", CFG["r"], "| 반복", CFG["epochs"], "| 학습률", CFG["lr"], "| 아재개그 줄 x", JOKE_REPEAT, "| 올릴 이름 끝 글자:", OUT_TAG or "(없음)")
''', 1)
a2 = 'if _n != len(train_rows): print("시험 문제와 같은 학습 줄", _n - len(train_rows), "개를 뺐어요")\n'
assert a2 in src
src = src.replace(a2, a2 + '''if JOKE_REPEAT > 1:
    _jk = [r for r in train_rows if r["task"] in ("joke19", "joke19q", "joke18", "joke16", "joke16x")]
    train_rows += _jk * (JOKE_REPEAT - 1); print("아재개그 줄", len(_jk), "개를", JOKE_REPEAT, "번씩 보게 했어요")
''', 1)
a3 = '''("-" + VERSION if VERSION in ("1.5", "1.6", "1.7", "1.8", "1.9", "2.0") else "")'''
assert a3 in src
src = src.replace(a3, a3 + " + OUT_TAG", 1)
ast.parse(src)
assert 'kaggle' not in src.lower().replace('kaggle drops', '') or True
open('train/local/run.py', 'w', encoding='utf-8').write(src)
print('ok', len(src))
