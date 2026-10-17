"""Builds train/kaggle.ipynb from train/colab.ipynb (same training, Kaggle-style token/checkpoints). Run: python3 train/make_kaggle.py"""
import json
nb = json.load(open('train/colab.ipynb'))
C = nb['cells']
def src(i): return ''.join(C[i]['source'])
def put(i, s): C[i]['source'] = s.splitlines(True)

put(0, """# Tools 자체 AI 학습 노트 (Kaggle용)

Frenchfries777 Tools의 자체 AI를 학습시키는 노트예요. Colab 노트와 같은 학습이고, 토큰과 저장 방식만 Kaggle에 맞췄어요.

처음 한 번만 해 주세요.
1. Kaggle에 로그인하고 휴대폰 번호 인증을 해요 (GPU와 인터넷을 쓰려면 필요해요).
2. 이 노트를 **File → Import Notebook** 으로 열어요 (GitHub 주소 또는 파일).
3. 오른쪽 **Session options** 에서 **Accelerator = GPU T4 x2** (또는 P100), **Internet = On** 으로 해요.
4. 메뉴 **Add-ons → Secrets** 에서 이름 `HF_TOKEN`, 값은 Hugging Face **Write** 토큰으로 추가하고 이 노트에 체크해 둬요 (토큰은 노트 칸에 쓰지 말아요).

실행
5. 아래 **설정** 칸에서 `MODEL` 과 `CONTINUE`, `ROUND` 를 Colab과 똑같이 골라요. (타리우스 = basic, 렉투스 = smart)
6. 오른쪽 위 **Save Version → Save & Run All (Commit)** 을 눌러요. 화면을 꺼도 계속 돌고, 한 번에 최대 약 9시간이에요. 끝나면 Hugging Face에 비공개로 올려요.

그냥 위에서부터 ▶ 를 눌러도 되지만 그러면 탭을 열어 둬야 해요. GPU는 일주일에 약 30시간까지 무료예요. 렉투스는 약 4~4.5시간이라 한 번에 끝나요 (잰 값은 아니에요).

중간에 끊기면 그 버전의 Output을 새 노트의 Input으로 추가하고 다시 실행하면 이어서 해요.
끝나면 "올림 끝"이 나와요. Claude에게 알려 주세요.
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

s = src(10)
a = s.index('CKPT = "out"'); b = s.index('from trl import SFTTrainer')
s = s[:a] + '''CKPT = f"/kaggle/working/ff-ckpt-{MODEL}"
import shutil
for old in glob.glob(f"/kaggle/input/**/ff-ckpt-{MODEL}", recursive=True):   # an earlier cut-off run added as Input
    if not glob.glob(os.path.join(CKPT, "checkpoint-*")) and glob.glob(os.path.join(old, "checkpoint-*")):
        shutil.copytree(old, CKPT, dirs_exist_ok=True); print("이전 진행 상황을 가져왔어요:", old)
print("진행 상황을 여기에 저장해요:", CKPT)

''' + s[b:]
put(10, s)
put(14, src(14).replace('never upload an older model left over in this Colab', 'never upload an older model left over in this session'))
nb['metadata'] = {'kernelspec': {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'}, 'language_info': {'name': 'python'}}
json.dump(nb, open('train/kaggle.ipynb', 'w'), ensure_ascii=False, indent=1)
print('ok')
