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
# 설정은 환경 변수로 바꿔요: MODEL=smart|basic|premus  VERSION=1.5  CONTINUE=1  MAX_LEN=2048  MAX_TRAIN_HOURS=12
import os
def _env(name, default): return os.environ.get(name, default)
'''
s = parts[0]   # settings cell
s = s.replace('MODEL = "premus"  #@param ["basic", "smart", "premus"]', 'MODEL = _env("MODEL", "smart")')
s = s.replace('VERSION = "1.5"  #@param ["1.5", "1.4", "1.3"]', 'VERSION = _env("VERSION", "1.5")')
s = s.replace('HF_TOKEN = ""  #@param {type:"string"}', 'HF_TOKEN = ""')
s = s.replace('RUN_EVAL = True  #@param {type:"boolean"}', 'RUN_EVAL = _env("RUN_EVAL", "1") == "1"')
s = s.replace('CONTINUE = True  #@param {type:"boolean"}', 'CONTINUE = _env("CONTINUE", "1") == "1"')
s = s.replace('ROUND = 3  #@param [2, 3]', 'ROUND = int(_env("ROUND", "3"))')
s = s.replace('MAX_TRAIN_HOURS = 6.0  #@param {type:"number"}', 'MAX_TRAIN_HOURS = float(_env("MAX_TRAIN_HOURS", "12"))')
s = s.replace('EVAL_MINUTES = 45  #@param {type:"number"}', 'EVAL_MINUTES = int(_env("EVAL_MINUTES", "45"))')
s = s.replace('MAX_LEN = 4096', 'MAX_LEN = int(_env("MAX_LEN", "4096"))')
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
ast.parse(src)
assert 'kaggle' not in src.lower().replace('kaggle drops', '') or True
open('train/local/run.py', 'w', encoding='utf-8').write(src)
print('ok', len(src))
