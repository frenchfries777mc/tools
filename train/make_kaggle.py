"""Builds train/kaggle.ipynb from train/colab.ipynb (same training, Kaggle-style token/checkpoints). Run: python3 train/make_kaggle.py"""
import json
nb = json.load(open('train/colab.ipynb'))
C = nb['cells']
def src(i): return ''.join(C[i]['source'])
def put(i, s): C[i]['source'] = s.splitlines(True)

put(0, """# Tools 자체 AI 학습 노트 (Kaggle용, FF777 1.9 / 1.4)

**프레무스 1.9 이어 학습 (지금 설정)**: 설정 칸을 `MODEL = "premus"`, `VERSION = "1.9"`, `CONTINUE = True` 로 둬요. 올려 둔 프레무스 1.8 (`FF-Tools-8B-merged-1.8`) 위에 새 자료 6,000줄(`data/v19-smart.jsonl`: 사이트와 똑같은 조건의 아재개그 약 1,450줄, 끝말잇기, 프로그램 사용법, 대화, 블록·시트·슬라이드·문서·파이썬·랩)을 2바퀴 이어서 학습해요(학습률 1e-4). 끝나면 `FF-Tools-8B-merged-1.9` 에 올려서 1.8은 그대로 남아요. 오른쪽 **Session options** 가 **GPU T4 x2**, **Internet = On**, **Secrets의 HF_TOKEN 체크**인지 보고 **Save & Run All (Commit)** 만 누르면 돼요. 끊기면 같은 노트를 다시 돌리면 중간 저장(200걸음마다)에서 이어요. 끝나면 맨 아래 시험 결과와 "올림 끝"을 Claude에게 알려 주세요.

아래는 1.4 설명이에요.


Frenchfries777 Tools의 자체 AI를 학습시키는 노트예요. Colab 노트와 같은 학습이고, 토큰과 저장 방식만 Kaggle에 맞췄어요.
1.4는 타리우스(basic, Qwen3 1.7B), 렉투스(smart, Qwen3 4B), 프레무스(premus, Qwen3 8B) 모두 바탕 Qwen3에서 처음부터 새로 학습해요.

처음 한 번만 해 주세요.
1. Kaggle에 로그인하고 휴대폰 번호 인증을 해요 (GPU와 인터넷을 쓰려면 필요해요).
2. 이 노트를 **File → Import Notebook** 으로 열어요 (GitHub 주소 또는 파일).
3. 오른쪽 **Session options** 에서 **Accelerator = GPU T4 x2** (또는 P100), **Internet = On** 으로 해요.
4. 메뉴 **Add-ons → Secrets** 에서 이름 `HF_TOKEN`, 값은 Hugging Face **Write** 토큰으로 추가하고 이 노트에 체크해 둬요 (토큰은 노트 칸에 쓰지 말아요).

렉투스 1.4 돌리기
5. 아래 **설정** 칸에서 `MODEL = "smart"`, `VERSION = "1.4"` 로 둬요. 나머지는 그대로 둬요.
6. 오른쪽 위 **Save Version → Save & Run All (Commit)** 을 눌러요. 화면을 꺼도 계속 돌아요.

타리우스 1.4 돌리기
7. 렉투스가 끝나면 (또는 다른 날) 같은 노트에서 `MODEL = "basic"` 으로 바꾸고 다시 **Save & Run All** 을 눌러요.

한 번 돌릴 때 모델 하나만 학습해요. 그래서 모델마다 한 번씩 돌려요. Kaggle 한 번은 최대 약 9시간이라 둘을 한 번에 넣으면 시간이 모자랄 수 있어요. 둘을 이어서 돌려도 일주일 무료 GPU(약 30시간) 안에 들어가요.

걸리는 시간 (T4 한 장, 잰 값이 아니라 추정이에요)
| | 학습 | 올리기 + 시험 | 모두 |
|---|---|---|---|
| 렉투스 1.4 (smart) | 약 4.5~5.5시간 | 약 1~1.5시간 | 약 6~7시간 |
| 타리우스 1.4 (basic) | 약 1~2시간 | 약 0.5~1시간 | 약 2~3시간 |
| 프레무스 1.4 (premus) | 약 6~7시간 | 약 1~1.5시간 | 약 8~8.5시간 |

프레무스 1.4 돌리기
8. `MODEL = "premus"` 로 바꾸고 **Save & Run All** 을 눌러요. 렉투스와 같은 자료를 쓰고, 이름과 바탕 모델만 premus·Qwen3 8B로 바꿔 읽어요. 학습 제한은 알아서 7시간, 시험은 30분으로 맞춰져요. 끊기면 같은 노트를 다시 돌리면 이어서 해요.

학습이 `MAX_TRAIN_HOURS`(6시간, 프레무스는 7시간)를 넘으면 알아서 거기서 멈추고 합쳐서 올려 줘요. 시험은 `EVAL_MINUTES`(45분)가 지나면 멈춰요.
1.4 자료(`data/v14-basic.jsonl`, `v14-smart.jsonl`, `v14-test.jsonl`)가 아직 저장소에 없으면 설정 칸에서 "1.4 자료가 아직 저장소에 없어요"가 나오고 멈춰요.

중간에 끊기면 같은 노트를 다시 **Save & Run All** 하면 Hugging Face에 저장해 둔 중간 진행(200걸음마다)에서 이어서 해요. 그 버전의 Output을 새 노트의 Input으로 추가해도 돼요.
끝나면 맨 아래에 시험 결과와 "올림 끝"이 나와요. Claude에게 "올림 끝"이라고 알려 주세요.
""")


put(1, src(1).replace('HF_TOKEN = ""  #@param {type:"string"}\n', '''HF_TOKEN = ""  #@param {type:"string"}
import os
os.environ["CUDA_VISIBLE_DEVICES"] = "0"   # unsloth uses one GPU (T4 x2: the second one stays unused)
if not HF_TOKEN:   # Kaggle: the token comes from Add-ons -> Secrets (name HF_TOKEN), never typed into the notebook
    try:
        from kaggle_secrets import UserSecretsClient
        HF_TOKEN = UserSecretsClient().get_secret("HF_TOKEN")
    except Exception as e:
        print("Secrets에서 HF_TOKEN을 못 읽었어요:", e)
'''))
assert 'kaggle_secrets' in src(1)

IDX = {k: next(i for i, c in enumerate(C) if k in src(i)) for k in ('CKPT = "out"', 'save_pretrained_merged')}   # find cells by content, not position
s = src(IDX['CKPT = "out"'])
a = s.index('CKPT = "out"'); b = s.index('from trl import SFTTrainer')
s = s[:a] + '''CKPT = f"/kaggle/working/ff-ckpt-{MODEL}"
import shutil
for old in glob.glob(f"/kaggle/input/**/ff-ckpt-{MODEL}", recursive=True):   # an earlier cut-off run added as Input
    if not glob.glob(os.path.join(CKPT, "checkpoint-*")) and glob.glob(os.path.join(old, "checkpoint-*")):
        shutil.copytree(old, CKPT, dirs_exist_ok=True); print("이전 진행 상황을 가져왔어요:", old)
print("진행 상황을 여기에 저장해요:", CKPT)

''' + s[b:]
put(IDX['CKPT = "out"'], s)
u = IDX['save_pretrained_merged']
assert 'left over in this Colab' in src(u)
put(u, src(u).replace('never upload an older model left over in this Colab', 'never upload an older model left over in this session'))
# Settings for training a model again on top of a version already on Hugging Face (same knobs as train/local/run.py: BASE_VERSION, LORA_R, EPOCHS, LR, JOKE_REPEAT, OUT_TAG).
# The defaults below are the tarius 2.0 round (starts from tarius 1.9b; lectus and premus use BASE_VERSION = "1.9") (1.9 stays on Hugging Face; the new model goes to FF-Tools-1.7B-merged-1.9b).
def patch_cell(old, new, once=True):
    for i, c in enumerate(C):
        t = ''.join(c['source'])
        if old in t:
            put(i, t.replace(old, new, 1)); return
    raise SystemExit('anchor not found: ' + old[:50])
patch_cell('MODEL = "premus"  #@param', 'MODEL = "basic"  #@param')
patch_cell('MAX_LEN = 4096\n', '''MAX_LEN = 4096
BASE_VERSION = "1.9b"  # start from FF-Tools-<size>-merged-<BASE_VERSION> ("" = the previous version, as before)
LORA_R = 32            # 0 = the usual size of this model
EPOCHS = 2             # 0 = the usual number of passes
LR = 2e-4              # 0 = the usual learning rate
JOKE_REPEAT = 1        # every dad-joke row is seen this many times per pass (1 = as in the data)
OUT_TAG = ""           # the upload goes to FF-Tools-<size>-merged-<VERSION><OUT_TAG>, so the version already there is not overwritten
if BASE_VERSION: CFG.update(base=f"Frenchfries777/FF-Tools-{CFG['size']}-merged-{BASE_VERSION}", epochs=2, lr=1e-4)
if LORA_R: CFG["r"] = LORA_R
if EPOCHS: CFG["epochs"] = EPOCHS
if LR: CFG["lr"] = LR
print("바탕 모델:", CFG["base"], "| r", CFG["r"], "| 반복", CFG["epochs"], "| 학습률", CFG["lr"], "| 아재개그 줄 x", JOKE_REPEAT, "| 올릴 이름 끝 글자:", OUT_TAG or "(없음)")
''')
a2 = 'if _n != len(train_rows): print("시험 문제와 같은 학습 줄", _n - len(train_rows), "개를 뺐어요")\n'
patch_cell(a2, a2 + '''if JOKE_REPEAT > 1:
    _jk = [r for r in train_rows if r["task"] in ("joke19", "joke19q", "joke18", "joke16", "joke16x")]
    train_rows += _jk * (JOKE_REPEAT - 1); print("아재개그 줄", len(_jk), "개를", JOKE_REPEAT, "번씩 보게 했어요")
''')
a3 = '("-" + VERSION if VERSION in ("1.5", "1.6", "1.7", "1.8", "1.9", "2.0") else "")'
patch_cell(a3, a3 + ' + OUT_TAG')
C[0]['source'] = (''.join(C[0]['source']).replace('**프레무스 1.9 이어 학습 (지금 설정)**', '**타리우스 2.0 (1.9b 위에 이어 학습, 지금 설정)**: 설정 칸이 이미 `MODEL = "basic"`, `VERSION = "2.0"`, `BASE_VERSION = "1.9b"`, `LORA_R = 32`, `EPOCHS = 2`, `JOKE_REPEAT = 1`, `OUT_TAG = ""` 로 되어 있어요. 아재개그를 약 25%로 줄이고 코딩·수식·표·번역·대화를 늘린 자료(`data/v20-basic.jsonl`)로 학습해서 `FF-Tools-1.7B-merged-2.0` 에 올려요. 렉투스는 `MODEL = "smart"`, `BASE_VERSION = "1.9"`, 프레무스는 `MODEL = "premus"`, `BASE_VERSION = "1.9"` 로 바꿔요. 아래 설명은 이전 라운드 것이에요.\n\n**(이전) 프레무스 1.9 이어 학습**')).splitlines(True)
nb['metadata'] = {'kernelspec': {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'}, 'language_info': {'name': 'python'}}
json.dump(nb, open('train/kaggle.ipynb', 'w'), ensure_ascii=False, indent=1)
print('ok')
