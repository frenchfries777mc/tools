"""Builds train/kaggle-tpu.ipynb (EXPERIMENTAL: Kaggle TPU + MaxText LoRA) from train/kaggle.ipynb's settings and data cells.
Run from the repo root: python3 train/make_tpu.py"""
import json
nb = json.load(open('train/kaggle.ipynb'))
K = ['' .join(c['source']) for c in nb['cells']]

def md(t): return {"cell_type": "markdown", "metadata": {}, "source": t.strip('\n').splitlines(True)}
def code(t): return {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": t.strip('\n').splitlines(True)}

# settings cell: same as the GPU notebook, minus the GPU-only line; premus/smart only (MaxText has no Qwen3 1.7B)
settings = K[1].replace('os.environ["CUDA_VISIBLE_DEVICES"] = "0"   # unsloth uses one GPU (T4 x2: the second one stays unused)\n', '')
settings = settings.replace('MODEL = "premus"  #@param ["basic", "smart", "premus"]', 'MODEL = "premus"  #@param ["smart", "premus"]')
settings = settings.replace('RUN_EVAL = True  #@param {type:"boolean"}\n', '')
settings = settings.replace('EVAL_MINUTES = 45  #@param {type:"number"}   # the test after the upload stops after this long\n', '')
settings = settings.replace('if MODEL == "premus":   # 8B on one T4: about 7 hours of training, so the limit is raised and the test is shortened (merge + upload + test still fit in 9 hours)\n    MAX_TRAIN_HOURS = max(MAX_TRAIN_HOURS, 7.0); EVAL_MINUTES = min(EVAL_MINUTES, 30)\n', '')
settings = settings.replace('MAX_LEN = 4096', 'MAX_LEN = 4096   # same as the GPU notebook. TPU pads every example to this length, so a smaller number (2048) is faster but leaves out the long HTML rows (about 5%); the count is printed')
settings += '''
# TPU-only settings
SMOKE_STEPS = 3     # first a tiny run to see that the whole chain works (set 0 to skip)
PER_DEVICE_BATCH = 1   # x 8 TPU chips = 8 examples per step, the same batch as the GPU notebook (1 x accumulation 8)
MT = {"smart": "qwen3-4b", "premus": "qwen3-8b"}[MODEL]   # MaxText model names
BASE_HF = CFG["base"]   # CONTINUE: the private merged 1.4 model, else Qwen3 from the Hub
if not CONTINUE: BASE_HF = {"smart": "Qwen/Qwen3-4B", "premus": "Qwen/Qwen3-8B"}[MODEL]
print("MaxText 모델:", MT, "바탕:", BASE_HF)
'''

data = K[4]
lines = [l for l in data.splitlines() if not l.startswith('import torch') and not l.startswith('print("GPU:"') and not l.startswith('assert torch.cuda')]
data = "\n".join(lines)

cells = []
cells.append(md('''
# Tools 자체 AI 학습 노트 (Kaggle **TPU**용, 실험판)

**이 노트는 아직 한 번도 돌려 보지 못한 실험판이에요.** 만든 곳(이 작업 환경)에서는 TPU와 Hugging Face에 닿을 수 없어서, 글만 보고 짠 거예요. 그래서 처음에는 아주 작게(3걸음) 돌려 보는 "시험 학습"을 먼저 하고, 거기서 막히면 화면의 붉은 글을 Claude에게 그대로 붙여 주세요. 거기에 맞춰 고쳐요.

**GPU 노트와 다른 점**
- GPU 노트는 Unsloth(PyTorch)로, 이 노트는 구글의 **MaxText**(JAX)로 LoRA 학습을 해요. 같은 자료(`v15-smart.jsonl`), 같은 LoRA 설정(r=16), 같은 배치(한 걸음에 8개), 같은 학습률이에요.
- MaxText에는 Qwen3 1.7B가 없어서 **렉투스(4B)와 프레무스(8B)만** 돼요.
- 끝나면 학습한 LoRA를 바탕 모델에 합쳐서 `FF-Tools-<크기>-merged-1.5`(비공개)에 올려요. 그 뒤 브라우저용 변환은 GPU 노트와 똑같이 GitHub에서 해요.
- 시험(채점)은 이 노트에 없어요. 올린 뒤에 GPU 쪽 시험 노트(`kaggle-eval.ipynb`)로 재요.

**준비**
1. 오른쪽 **Session options** 에서 **Accelerator = TPU** (Kaggle이 보여 주는 TPU 중 하나), **Internet = On**.
2. **Add-ons → Secrets** 에 `HF_TOKEN`(Write 토큰)을 넣고 이 노트에 체크.
3. 설정 칸에서 `MODEL`과 `CONTINUE`를 정하고, **Save & Run All (Commit)** 을 눌러요.

**알아 둘 것**
- Kaggle TPU는 일주일에 약 20시간(GPU 한도와 따로)이에요. 한 번에 최대 약 9시간이에요.
- 걸리는 시간은 모르겠어요. 시험 학습 끝에 "걸음당 초"를 찍어 줘서, 거기서 전체 시간을 계산해 알려 줘요.
- 설치 프로그램(MaxText) 버전이 바뀌면 옵션 이름이 달라질 수 있어요. 막히면 위 방법대로 알려 주세요.
'''))
cells.append(code(settings))
cells.append(md('## 1. 자료 만들기'))
cells.append(code(data))
cells.append(md('## 2. TPU 확인과 MaxText 설치'))
cells.append(code('''
import subprocess, sys, os, json, shutil
def sh(cmd, check=True, env=None):
    """run a shell command and show its output live; a failure stops Run all with a clear error"""
    print("$", cmd[:300])
    p = subprocess.Popen(cmd, shell=True, executable="/bin/bash", stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env={**os.environ, **(env or {})})
    for line in p.stdout: print(line, end="")
    p.wait()
    if check and p.returncode: raise RuntimeError(f"명령이 실패했어요 (코드 {p.returncode}): {cmd[:200]}")
    return p.returncode

sh("ls /dev/accel* /dev/vfio 2>&1 | head; echo; python3 -c \\"import jax; print(jax.devices())\\" 2>&1 | tail -2", check=False)
os.environ["HF_TOKEN"] = HF_TOKEN
VENV = "/kaggle/working/mtenv"
if not os.path.exists(VENV + "/bin/python"):
    sh("pip install -q uv")
    sh(f"uv venv --python 3.12 --seed {VENV}")
    # the install lines of the MaxText docs (post-training build brings the SFT/LoRA trainer)
    sh(f"source {VENV}/bin/activate && UV_TORCH_BACKEND=cpu uv pip install 'maxtext[tpu-post-train]==0.2.5' --resolution=lowest && install_tpu_post_train_extra_deps")
PY = VENV + "/bin/python"
sh(f"{PY} -c \\"import jax; print('TPU 칩:', jax.devices())\\"")
'''))
cells.append(md('## 3. 바탕 모델을 MaxText 형식으로 바꾸기'))
cells.append(code('''
WORK = "/kaggle/working"
CKPT_MT = f"{WORK}/mt-base-{MODEL}"
if not os.path.exists(f"{CKPT_MT}/0/items"):
    sh(f"{PY} -m maxtext.checkpoint_conversion.to_maxtext model_name={MT} base_output_directory={CKPT_MT} scan_layers=True use_multimodal=false "
       f"hardware=cpu skip_jax_distributed_system=true checkpoint_storage_use_zarr3=1 checkpoint_storage_use_ocdbt=1 --save_dtype=bfloat16 --hf_model_path={BASE_HF}")
assert os.path.exists(f"{CKPT_MT}/0/items"), "변환 결과(0/items)가 없어요"
print("바탕 모델 변환 완료:", CKPT_MT)
'''))
cells.append(md('## 4. 학습 자료를 파일로 쓰기 (너무 긴 줄은 빼요)'))
cells.append(code('''
from transformers import AutoTokenizer
tok = AutoTokenizer.from_pretrained(BASE_HF, token=HF_TOKEN)
def ids(msgs): return len(tok.apply_chat_template(msgs, tokenize=True, enable_thinking=False))
rows = []
for r in train_rows:
    try: n = ids(r["messages"])
    except Exception: n = 10**9
    if n <= MAX_LEN: rows.append({"messages": r["messages"]})
print(f"학습 줄 {len(rows)}개 ({len(train_rows) - len(rows)}개는 {MAX_LEN}토큰보다 길어서 뺐어요)")
TRAIN_JSONL = f"{WORK}/train-{MODEL}.jsonl"
with open(TRAIN_JSONL, "w", encoding="utf-8") as f:
    for r in rows: f.write(json.dumps(r, ensure_ascii=False) + "\\n")
GLOBAL_BATCH = 8 * PER_DEVICE_BATCH
STEPS = max(1, round(len(rows) * CFG["epochs"] / GLOBAL_BATCH))
print("전체 걸음 수:", STEPS, f"(자료 {len(rows)}줄 x {CFG['epochs']}바퀴 / 한 걸음 {GLOBAL_BATCH}개)")
'''))
cells.append(md('## 5. 학습 (먼저 시험 학습, 그다음 본 학습)'))
cells.append(code('''
import time, glob
def train(steps, run_name, restore=None):
    cmd = (f"{PY} -m maxtext.trainers.post_train.sft.train_sft run_name={run_name} base_output_directory={WORK}/mt-out model_name={MT} "
           f"load_parameters_path={CKPT_MT}/0/items tokenizer_type=huggingface tokenizer_path={BASE_HF} hf_access_token={HF_TOKEN} "
           f"hf_path=json hf_train_files={TRAIN_JSONL} train_split=train train_data_columns=['messages'] "
           f"steps={steps} per_device_batch_size={PER_DEVICE_BATCH} max_target_length={MAX_LEN} learning_rate={CFG['lr']} warmup_steps_fraction=0.03 "
           f"checkpoint_period=200 enable_checkpointing=True "
           f"lora.enable_lora=True lora.lora_rank={CFG['r']} lora.lora_alpha={CFG['r']*2}")
    if restore: cmd += f" lora.lora_restore_path={restore}"
    t = time.time(); sh(cmd); return time.time() - t

if SMOKE_STEPS:
    sec = train(SMOKE_STEPS, f"smoke-{MODEL}")
    per = sec / SMOKE_STEPS
    print(f"시험 학습 끝. 설치와 시작 시간이 섞여서 걸음당 {per:.1f}초로 나와요 (실제는 더 빨라요).")
    print("본 학습이 막히면 위 붉은 글을 Claude에게 붙여 주세요.")
'''))
cells.append(code('''
RUN = f"ff15-{MODEL}"
t0 = time.time(); sec = train(STEPS, RUN)
print(f"본 학습 끝: {sec/3600:.2f}시간 (걸음당 {sec/STEPS:.1f}초)")
'''))
cells.append(md('## 6. LoRA를 바탕 모델에 합쳐서 올리기'))
cells.append(code('''
last = sorted(glob.glob(f"{WORK}/mt-out/{RUN}/checkpoints/*"), key=lambda p: int(os.path.basename(p)) if os.path.basename(p).isdigit() else -1)[-1]
print("마지막 저장:", last)
ADAPTER = f"{WORK}/hf-lora-{MODEL}"
sh(f"{PY} -m maxtext.checkpoint_conversion.to_huggingface model_name={MT} lora.lora_restore_path={last}/model_params base_output_directory={ADAPTER} "
   f"lora.lora_rank={CFG['r']} lora.lora_alpha={CFG['r']*2} hardware=cpu skip_jax_distributed_system=true")
print(sh(f"find {ADAPTER} -name 'adapter_*' | head", check=False))
'''))
cells.append(code('''
sh("pip install -q peft")
import torch, glob
from transformers import AutoModelForCausalLM
from peft import PeftModel
adir = os.path.dirname(glob.glob(f"{ADAPTER}/**/adapter_config.json", recursive=True)[0])
base = AutoModelForCausalLM.from_pretrained(BASE_HF, torch_dtype=torch.bfloat16, token=HF_TOKEN)
model = PeftModel.from_pretrained(base, adir).merge_and_unload()
shutil.rmtree("merged", ignore_errors=True)
model.save_pretrained("merged"); tok.save_pretrained("merged")
from huggingface_hub import HfApi
api = HfApi(token=HF_TOKEN); user = api.whoami()["name"]
rid = f"{user}/FF-Tools-{CFG['size']}-merged" + ("-" + VERSION if VERSION in ("1.5", "1.6") else "") + "-tpu"   # its own repo: the GPU result stays untouched
api.create_repo(rid, private=True, exist_ok=True)
api.upload_folder(folder_path="merged", repo_id=rid, commit_message="Tools fine-tune (TPU, MaxText LoRA)")
print("올렸어요:", rid)
print(f"\\nFF777 {VERSION} {CFG['name']} (TPU) 학습과 올리기를 마쳤어요. 이 아래 줄이 보이면 Claude에게 \\"올림 끝\\"이라고 알려 주세요. 시험은 GPU 시험 노트로 해요.")
print("올림 끝:", rid)
'''))
out = {"cells": cells, "metadata": nb["metadata"], "nbformat": 4, "nbformat_minor": 0}
json.dump(out, open('train/kaggle-tpu.ipynb', 'w'), ensure_ascii=False, indent=1)
# every code cell must at least parse
import ast
for i, c in enumerate(cells):
    if c["cell_type"] == "code":
        try: ast.parse(''.join(c["source"]))
        except SyntaxError as e: raise SystemExit(f"cell {i}: {e}")
print("ok", len(cells), "cells")
