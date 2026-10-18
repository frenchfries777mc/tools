"""Builds train/kaggle.ipynb from train/colab.ipynb (same training, Kaggle-style token/checkpoints). Run: python3 train/make_kaggle.py"""
import json
nb = json.load(open('train/colab.ipynb'))
C = nb['cells']
def src(i): return ''.join(C[i]['source'])
def put(i, s): C[i]['source'] = s.splitlines(True)

put(0, """# Tools 자체 AI 학습 노트 (Kaggle용, FF777 1.4)

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
nb['metadata'] = {'kernelspec': {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'}, 'language_info': {'name': 'python'}}
json.dump(nb, open('train/kaggle.ipynb', 'w'), ensure_ascii=False, indent=1)
print('ok')
