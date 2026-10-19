"""Builds train/lightning.ipynb (Lightning AI Studio, any NVIDIA GPU: T4, L4, A10G, A100) from train/kaggle.ipynb.
Same training as the Kaggle notebook; only the token (typed into a hidden prompt, never saved) and the checkpoint folder change.
Run from the repo root: python3 train/make_lightning.py"""
import json, ast
nb = json.load(open('train/kaggle.ipynb'))
C = nb['cells']
def src(i): return ''.join(C[i]['source'])
def put(i, s): C[i]['source'] = s.splitlines(True)

put(0, """# Tools 자체 AI 학습 노트 (Lightning AI용, FF777 1.5)

Kaggle 노트와 **같은 학습**이에요(같은 자료, 같은 설정). 다른 점은 토큰을 읽는 방법과 저장 위치뿐이에요. 설정 칸은 프레무스 1.5 이어 학습(`MODEL = "premus"`, `VERSION = "1.5"`, `CONTINUE = True`)으로 되어 있어요.

**한 번만 하는 준비**
1. https://lightning.ai 에 가입하고 **휴대폰 번호 인증**을 해요 (무료 GPU 크레딧을 받으려면 필요해요. 카드 등록은 필요 없는 걸로 알지만, 화면에서 카드를 요구하면 멈추고 Claude에게 알려 주세요).
2. **New Studio** 를 만들고, 화면의 기계 선택(Machine)에서 **GPU**(T4 또는 L4)로 바꿔요. 어떤 GPU가 시간당 크레딧을 얼마나 쓰는지는 그 화면에 나와요. L4가 T4보다 보통 더 빨라요.
3. Studio 안에 터미널을 열고 `git clone https://github.com/frenchfries777mc/tools` 를 해요. 그다음 `tools/train/lightning.ipynb` 를 열어요.
4. 맨 위부터 **Run All** 을 해요. 토큰(Hugging Face **Write** 토큰, `hf_`로 시작) 입력 칸이 뜨면 붙여 넣어요. 토큰은 파일에 저장되지 않아요.

**끝난 뒤**
- 맨 아래에 시험 결과와 "올림 끝"이 나와요. Claude에게 "올림 끝"이라고 알려 주세요.
- **GPU 시간이 크레딧을 계속 써요.** 끝나면 Machine을 CPU로 돌리거나 Studio를 Stop 해 주세요.
- 중간에 끊겨도 같은 노트를 다시 Run All 하면 Hugging Face에 저장해 둔 중간 진행(200걸음마다)에서 이어요.

**걸리는 시간 (잰 값이 아니라 추정):** 프레무스는 T4 한 장 기준 학습 약 6~7시간, 올리기와 시험까지 약 8시간이에요. 크레딧이 그 시간만큼 되는지는 가입 후 화면에서 확인해 주세요. 부족하면 `MAX_TRAIN_HOURS` 를 줄이면 그 시간에서 멈추고 합쳐서 올려요(덜 학습된 모델이 올라가요).
""")

s = src(1)
a = s.index('if not HF_TOKEN:'); b = s.index('RUN_EVAL')
s = s[:a] + '''if not HF_TOKEN:   # Lightning: typed into a hidden prompt, never written into the notebook
    HF_TOKEN = os.environ.get("HF_TOKEN", "")
    if not HF_TOKEN:
        import getpass
        HF_TOKEN = getpass.getpass("Hugging Face Write 토큰(hf_...)을 붙여 넣고 Enter: ").strip()
''' + s[b:]
s = s.replace('so a 9-hour Kaggle limit never loses the run', 'so a credit limit never loses the run')
s = s.replace(' or a /kaggle/input/... path also works', ' or a file path also works')
put(1, s)

i = next(k for k, c in enumerate(C) if 'CKPT = f"/kaggle/working/ff-ckpt-{MODEL}"' in src(k))
s = src(i)
a = s.index('CKPT = f"/kaggle/working'); b = s.index('from trl import SFTTrainer')
s = s[:a] + '''CKPT = f"ff-ckpt-{MODEL}"   # next to the notebook (a Studio keeps its files)
print("진행 상황을 여기에 저장해요:", CKPT)

''' + s[b:]
put(i, s)

assert 'kaggle_secrets' not in ''.join(''.join(c['source']) for c in C) and '/kaggle/' not in ''.join(''.join(c['source']) for c in C), 'a Kaggle-only line is left'
for n, c in enumerate(C):
    if c['cell_type'] == 'code' and not ''.join(c['source']).lstrip().startswith('%'):   # %%capture / !pip cells are notebook magics
        try: ast.parse(''.join(c['source']))
        except SyntaxError as e: raise SystemExit(f'cell {n}: {e}')
json.dump(nb, open('train/lightning.ipynb', 'w'), ensure_ascii=False, indent=1)
print('ok')
