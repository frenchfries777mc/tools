"""Builds train/local/eval.py from train/kaggle-eval.ipynb: the same 140-question baseline test, run on the owner's own
computer (WSL Ubuntu + GPU) instead of Kaggle. Run: python3 train/make_local_eval.py   (after make_kaggle_eval.py)"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
nb = json.load(open(os.path.join(ROOT, "train", "kaggle-eval.ipynb"), encoding="utf-8"))
cells = [("".join(c["source"])) for c in nb["cells"] if c["cell_type"] == "code"]

HEAD = '''"""FF777 baseline test on this computer (built by train/make_local_eval.py from kaggle-eval.ipynb; do not edit).
Usage (WSL Ubuntu, in the training env):  HF_TOKEN=... python3 train/local/eval.py [tarius|lectus|premus|qwen3-4b ...]
Default model: tarius = Frenchfries777/FF-Tools-1.7B-merged-1.6 (override the repo with FF_REPO=...).
Writes eval-out/baseline-results.json and baseline-answers.jsonl in the current folder."""
import sys, os
def display(x):
    print(x.to_string() if hasattr(x, "to_string") else x)
'''
out = [HEAD]
for src in cells:
    if src.startswith("%%capture"):
        continue
    if src.startswith("%%writefile"):
        first, body = src.split("\n", 1)
        path = first.split()[1]
        out.append(f"open({path!r}, 'w', encoding='utf-8').write({body!r})\n")
        continue
    if src.startswith("#@title 설정"):
        src = src.replace('OUT = "/kaggle/working"', 'OUT = os.path.join(os.getcwd(), "eval-out"); os.makedirs(OUT, exist_ok=True)')
        src = src.replace('HF_TOKEN = ""         # 비워 두세요. Add-ons → Secrets 의 HF_TOKEN 을 읽어요\nimport os\n',
                          'import os\nHF_TOKEN = os.environ.get("HF_TOKEN", "")\n')
        src = src.replace('        from kaggle_secrets import UserSecretsClient\n        HF_TOKEN = UserSecretsClient().get_secret("HF_TOKEN") or ""\n',
                          '        raise RuntimeError("HF_TOKEN 환경변수가 비어 있어요")\n')
        src += '''
# local choices: models named on the command line (default tarius); tarius = the 1.6 model unless FF_REPO says otherwise
_want = sys.argv[1:] or ["tarius"]
for _k in MODELS:
    MODELS[_k] = _k in _want
REPOS["tarius"] = os.environ.get("FF_REPO", "Frenchfries777/FF-Tools-1.7B-merged-1.6") if "tarius" in _want else REPOS["tarius"]
BATCH = {"code": 6, "default": 8}
QUICK = os.environ.get("QUICK") == "1"
'''
    if src.startswith("import json, os, re, sys, time"):
        src = src.replace('print(pipout.stdout[-1500:] if "pipout" in globals() else "")\n    ', '')
        src = src.replace('다시 Run All 해 주세요.', '터미널에서 pip install bitsandbytes accelerate transformers 를 해 주세요.')
        src = src.replace('Session options에서 Internet = On인지 보고 ', '')
        src = src.replace('GPU가 없어요. 오른쪽 Session options에서 Accelerator = GPU T4 로 바꾸고 다시 Run All 해 주세요.', 'GPU가 안 보여요. nvidia-smi 가 되는 Ubuntu 창인지 확인해 주세요.')
    src = src.replace('[주의] HF_TOKEN이 없어요. Add-ons → Secrets에 HF_TOKEN을 넣고 이 노트에 체크해 주세요.', '[주의] HF_TOKEN이 없어요. 명령 앞에 HF_TOKEN=... 을 붙여 주세요.').replace('Secrets에서 HF_TOKEN을 못 읽었어요:', 'HF_TOKEN을 못 읽었어요:')
    src = src.replace('Add-ons → Secrets에 HF_TOKEN을 넣고 이 노트에 체크한 뒤 다시 Run All 해 주세요.', '명령 앞에 HF_TOKEN=... 을 붙여 다시 실행해 주세요.')
    out.append(src + "\n")
open(os.path.join(ROOT, "train", "local", "eval.py"), "w", encoding="utf-8").write("\n".join(out))
print("train/local/eval.py written,", sum(len(s) for s in out), "chars")
