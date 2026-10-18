"""Builds train/kaggle-eval.ipynb: the FF777 baseline test (base Qwen3 and our models on the same 140 questions, 4-bit,
site settings). The graders (train/eval/ffeval.py), the page runner (train/eval/html_run.js), the questions
(train/eval/baseline-v1.jsonl) and the site's prompts (ai-prompts.js, ai.js, blocks/ai-blocks.js, read with node) are
pasted in, so the notebook needs nothing from GitHub. Run: python3 train/make_kaggle_eval.py   (needs node)"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)

SITE_JS = r"""
const fs = require('fs'), path = require('path');
const root = process.argv[1];
const P = require(path.join(root, 'ai-prompts.js'));
const ai = fs.readFileSync(path.join(root, 'ai.js'), 'utf8');
const HUMOR = eval(ai.match(/var HUMOR=('(?:[^'\\]|\\.)*');/)[1]);
const ME = eval('(' + ai.match(/var ME=(\{[\s\S]*?\}\});/)[1] + ')');
const blocks = fs.readFileSync(path.join(root, 'blocks/ai-blocks.js'), 'utf8');
const SYS_HTML = eval(blocks.match(/var SYS_HTML=(\[[\s\S]*?\])\.join\('\\n'\);/)[1]).join('\n');
const out = { SYS_HTML, who: { tarius: ME['FF-Tools-1.7B'].who, lectus: ME['FF-Tools-4B'].who } };
for (const k of ['tableHead', 'askSys', 'cellSys', 'formulaSys', 'tableSys', 'graphSys', 'calcSys', 'unitSys']) out[k] = P[k];
process.stdout.write(JSON.stringify(out));
"""


def site_prompts():
    """The strings the site sends, read from the site's own files (so the notebook stays in step with the site)."""
    return json.loads(subprocess.run(["node", "-e", SITE_JS, ROOT], capture_output=True, text=True, check=True).stdout)


def md(s):
    return {"cell_type": "markdown", "metadata": {}, "source": s.strip("\n").splitlines(True)}


def code(s, hide=False):
    meta = {"_kg_hide-input": True, "jupyter": {"source_hidden": True}} if hide else {}
    return {"cell_type": "code", "execution_count": None, "metadata": meta, "outputs": [], "source": s.strip("\n").splitlines(True)}


def read(*a):
    with open(P(*a), encoding="utf-8") as f:
        return f.read()


def build():
    site = site_prompts()
    ffeval = read("train", "eval", "ffeval.py")
    runner = read("train", "eval", "html_run.js")
    items = [json.loads(l) for l in read("train", "eval", "baseline-v1.jsonl").splitlines() if l.strip()]
    test_lines = "".join(json.dumps({k: v for k, v in it.items() if k not in ("ref", "bad")}, ensure_ascii=False) + "\n" for it in items)
    from collections import Counter
    counts = Counter(it["cat"] for it in items)
    sys.path.insert(0, P("train", "eval"))
    from ffeval import CAT_NAMES
    cat_lines = "\n".join(f"| {CAT_NAMES[c]} | {counts[c]} |" for c in CAT_NAMES if counts[c])

    cells = [md(f"""
# FF777 기준 시험 (Kaggle)

기본 Qwen3와 우리 모델(타리우스, 렉투스)에게 **같은 시험 {len(items)}문제**를 내고 점수를 재요. 1.4 학습의 목표를 정하는 기준 점수예요.
- 타리우스 목표: 기본 Qwen3 4B와 같은 점수
- 렉투스 목표: 기본 Qwen3 4B의 3.5배 (3.5배가 100점을 넘으면 "틀리는 수를 1/3.5로 줄이기")

처음 한 번만
1. 오른쪽 **Session options** 에서 **Accelerator = GPU T4** (T4 x2도 돼요, 첫 번째 GPU만 써요), **Internet = On**.
2. 메뉴 **Add-ons → Secrets** 에 이름 `HF_TOKEN`, 값은 Hugging Face 토큰(Read 이상)을 넣고 이 노트에 체크해요. 토큰은 노트 칸에 쓰지 말아요. 토큰이 없으면 기본 Qwen만 시험해요.

실행
3. **Run All** (또는 Save Version → Save & Run All). 약 40~60분 걸려요 (잰 값이 아니라 추정이에요). 노트가 잘 도는지만 보려면 설정 칸에서 `QUICK = True` (약 10분).
4. 끝나면 맨 아래 **요약** 칸을 캡처해서 Claude에게 보내 주세요. 파일은 Output의 `baseline-results.json`(점수)과 `baseline-answers.jsonl`(모든 답)이에요.

알아 둘 것 (정직하게)
- 사이트는 MLC의 **q4f16_1** 4비트, 여기는 **bitsandbytes nf4** 4비트예요. 둘 다 4비트라 비슷하지만 점수가 아주 똑같지는 않아요.
- 시스템 글은 사이트와 같아요 (`ai-prompts.js`, `ai.js`, `blocks/ai-blocks.js`에서 그대로 가져옴). 이름 소개는 사이트처럼 우리 모델에게만, 질문·요약 탭 문제에만 붙여요. 사이트가 덧붙이는 "가르친 내용"(teach)은 시험을 고정하려고 넣지 않아요.
- 답 고르기: 글 답(질문·요약, 셀 =AI())은 1.4 계획대로 temperature 0.7, top_p 0.8, presence_penalty 1.0. JSON(수식·그래프·표·AI 계산)과 코드는 지금 사이트처럼 temperature 0.3, 벌점 없음. Qwen3 생각 모드는 꺼요. 시드는 고정이에요.
- 같은 구절(5자 이상)을 3번 연달아 쓰면 그 문제는 0점이고, 반복 수를 따로 세요. 코드는 원래 비슷한 줄이 많아서, 끝까지 못 쓰고 반복한 경우만 반복으로 세요.
- 한국어 질문의 답에 한자(这个问题 같은)가 섞이면 0점이에요.

| 과제 | 문제 수 |
|---|---|
{cat_lines}
"""),
             code('''
#@title 설정 (여기만 바꿔요)
MODELS = {            # True = 시험 봄, False = 건너뜀
    "qwen3-1.7b": True,
    "qwen3-4b": True,
    "tarius": True,
    "lectus": True,
}
REPOS = {
    "qwen3-1.7b": "Qwen/Qwen3-1.7B",
    "qwen3-4b": "Qwen/Qwen3-4B",
    "tarius": "Frenchfries777/FF-Tools-1.7B-merged",   # 비공개: HF_TOKEN이 필요해요
    "lectus": "Frenchfries777/FF-Tools-4B-merged",
}
QUICK = False         # True면 과제마다 2문제만 (노트가 잘 도는지 볼 때)
SEED = 7
GEN = {               # 답 고르는 설정 (위 설명 참고). max_new = 최대 토큰 수
    "prose": dict(temperature=0.7, top_p=0.8, presence=1.0, max_new=512),
    "cell":  dict(temperature=0.7, top_p=0.8, presence=1.0, max_new=160),
    "json":  dict(temperature=0.3, top_p=0.95, presence=0.0, max_new=300),
    "table": dict(temperature=0.3, top_p=0.95, presence=0.0, max_new=800),
    "code":  dict(temperature=0.3, top_p=0.95, presence=0.0, max_new=1800),
}
BATCH = {"code": 10, "default": 16}   # 한 번에 같이 쓰는 답 수 (메모리가 모자라면 알아서 줄여요)
OUT = "/kaggle/working"

HF_TOKEN = ""         # 비워 두세요. Add-ons → Secrets 의 HF_TOKEN 을 읽어요
import os
os.environ["CUDA_VISIBLE_DEVICES"] = "0"
if not HF_TOKEN:
    try:
        from kaggle_secrets import UserSecretsClient
        HF_TOKEN = UserSecretsClient().get_secret("HF_TOKEN") or ""
    except Exception as e:
        print("Secrets에서 HF_TOKEN을 못 읽었어요:", type(e).__name__)
if HF_TOKEN:
    print("HF_TOKEN을 읽었어요 (값은 보여 주지 않아요).")
    os.environ["HF_TOKEN"] = HF_TOKEN               # 모델을 내려받는 모든 단계가 이 토큰을 쓰게 해요
    os.environ["HUGGING_FACE_HUB_TOKEN"] = HF_TOKEN
else:
    print("[주의] HF_TOKEN이 없어요. Add-ons → Secrets에 HF_TOKEN을 넣고 이 노트에 체크해 주세요.")
    print("       지금은 기본 Qwen만 시험하고, 비공개인 타리우스·렉투스는 건너뛰어요.")
'''),
             md("## 1. 준비 (프로그램 설치, 약 2분)"),
             code('''
%%capture pipout
!pip install -q "transformers==4.57.6" "accelerate==1.11.0" "bitsandbytes==0.48.2"
'''),
             code('''
import json, os, re, sys, time, shutil, subprocess, urllib.request, tarfile
from collections import Counter
try:
    import torch, transformers, bitsandbytes
except Exception as e:
    print(pipout.stdout[-1500:] if "pipout" in globals() else "")
    raise SystemExit("프로그램 설치가 안 됐어요 (" + type(e).__name__ + "). Session options에서 Internet = On인지 보고 다시 Run All 해 주세요.")
print("torch", torch.__version__, "| transformers", transformers.__version__, "| bitsandbytes", bitsandbytes.__version__)
if not torch.cuda.is_available():
    raise SystemExit("GPU가 없어요. 오른쪽 Session options에서 Accelerator = GPU T4 로 바꾸고 다시 Run All 해 주세요.")
GPU = torch.cuda.get_device_name(0)
print("GPU:", GPU)
'''),
             md("## 2. 채점기와 시험 문제 (자동으로 만든 칸이에요, 고치지 마세요)\n\n`train/eval/ffeval.py`, `train/eval/html_run.js`, `train/eval/baseline-v1.jsonl` 을 그대로 넣었어요. 고칠 때는 저장소의 파일을 고치고 `python3 train/make_kaggle_eval.py` 로 노트를 다시 만들어요."),
             code(ffeval, hide=True),
             code("%%writefile /tmp/ff_html_run.js\n" + runner, hide=True),
             code("%%writefile /tmp/ff-baseline-v1.jsonl\n" + test_lines, hide=True),
             code("%%writefile /tmp/ff-site-prompts.json\n" + json.dumps(site, ensure_ascii=False, indent=1) + "\n", hide=True),
             code('''
# Pages are checked by really opening them in jsdom (node). Kaggle may not have node: download it; without it, only static checks.
NODE_VER, JSDOM_VER, JS_DIR = "v20.18.1", "25.0.1", "/tmp/ffjs"
def setup_node():
    if not shutil.which("node"):
        url = f"https://nodejs.org/dist/{NODE_VER}/node-{NODE_VER}-linux-x64.tar.xz"
        urllib.request.urlretrieve(url, "/tmp/node.tar.xz")
        with tarfile.open("/tmp/node.tar.xz") as t:
            t.extractall("/tmp")
        os.environ["PATH"] = f"/tmp/node-{NODE_VER}-linux-x64/bin:" + os.environ["PATH"]
    os.makedirs(JS_DIR, exist_ok=True)
    if not os.path.isdir(os.path.join(JS_DIR, "node_modules", "jsdom")):
        subprocess.run(["npm", "install", "--prefix", JS_DIR, f"jsdom@{JSDOM_VER}", "--no-audit", "--no-fund", "--silent"],
                       check=True, capture_output=True, timeout=300)
    os.environ["FF_NODE_PATH"] = os.path.join(JS_DIR, "node_modules")
    probe = run_html('<!DOCTYPE html><html><body><button id="b">1</button><script>document.getElementById("b").onclick=function(){this.textContent="2"};</script></body></html>',
                     [{"do": ["click_n:1"], "want": "re", "re": "2"}], runner="/tmp/ff_html_run.js")
    assert probe and probe.get("checks") and probe["checks"][0]["ok"], probe
try:
    setup_node()
    HTML_RUNNER, HTML_CHECK = "/tmp/ff_html_run.js", "jsdom"
    print("코드 채점: jsdom 준비 끝 (node", subprocess.run(["node", "-v"], capture_output=True, text=True).stdout.strip() + ")")
except Exception as e:
    HTML_RUNNER, HTML_CHECK = None, "static"
    print("[주의] node/jsdom을 준비하지 못해서 코드는 정적 검사만 해요:", str(e)[:200])

SITE = json.load(open("/tmp/ff-site-prompts.json", encoding="utf-8"))
TEST = load_test("/tmp/ff-baseline-v1.jsonl")
if QUICK:
    TEST = quick_subset(TEST, 2)
print("시험", len(TEST), "문제:", dict(Counter(t["cat"] for t in TEST)))
'''),
             md("## 3. 모델마다 시험 보기\n\n한 모델씩 불러서(4비트) 모든 문제에 답하게 하고, 채점한 뒤 GPU를 비우고 다음 모델로 가요. 한 모델이 안 되면 건너뛰고 나머지는 계속해요."),
             code('''
WHO = SITE["who"]   # only our models get their self-introduction, as on the site
CACHE = "/tmp/hf-cache"
RESULTS_PATH, ANSWERS_PATH = os.path.join(OUT, "baseline-results.json"), os.path.join(OUT, "baseline-answers.jsonl")
META = {"test": "baseline-v1", "n_items": len(TEST), "quick": QUICK, "seed": SEED, "gen": GEN, "batch": BATCH,
        "date": time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime()), "gpu": GPU, "html_check": HTML_CHECK,
        "quant": "bitsandbytes 4-bit nf4, fp16 compute (site: MLC q4f16_1)", "thinking": False,
        "versions": {"torch": torch.__version__, "transformers": transformers.__version__, "bitsandbytes": bitsandbytes.__version__}}
GRADED, INFO, SKIPPED = {}, {}, {}

def access_message(key, why):
    repo = REPOS[key]
    if why == "not_found" and not HF_TOKEN:
        return f"HF_TOKEN이 없어서 비공개 모델 {repo}를 열 수 없어요. Add-ons → Secrets에 HF_TOKEN을 넣고 이 노트에 체크한 뒤 다시 Run All 해 주세요."
    if why == "not_found":
        return f"{repo}를 찾을 수 없거나 이 토큰으로 볼 수 없어요. 저장소 이름과, 토큰이 그 모델을 올린 계정(Frenchfries777)의 것인지 확인해 주세요."
    if why == "forbidden":
        return f"{repo}에 들어갈 권한이 없어요. Hugging Face 토큰 권한(Read 이상)을 확인해 주세요."
    return f"Hugging Face에 연결하지 못했어요 ({why}). Session options에서 Internet = On인지 확인해 주세요."

def save_all():
    summ = summarize(GRADED, TEST)
    out = {"meta": META, "models": {k: dict(INFO[k], **summ.get(k, {})) for k in INFO}, "goals": goals(summ)}
    with open(RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    with open(ANSWERS_PATH, "w", encoding="utf-8") as f:
        for k, rows in GRADED.items():
            for r in rows:
                f.write(json.dumps(dict(model=k, repo=REPOS[k], **r), ensure_ascii=False) + "\\n")

T_ALL = time.time()
for key, on in MODELS.items():
    if not on:
        continue
    repo = REPOS[key]
    print(f"\\n===== {MODEL_NAMES[key]} ({repo}) =====")
    why = check_access(repo, HF_TOKEN)
    if why:
        msg = access_message(key, why)
        print("[건너뜀]", msg)
        SKIPPED[key] = msg if len(msg) < 60 else msg[:60] + "…"
        INFO[key] = {"repo": repo, "available": False, "reason": msg}
        save_all()
        continue
    t0, model, tok = time.time(), None, None
    try:
        model, tok = load_model(repo, HF_TOKEN, cache_dir=CACHE)
        print(f"  불러옴 ({time.time() - t0:.0f}초, GPU 메모리 {torch.cuda.memory_allocated() / 1e9:.1f}GB)")
        answers = run_model(model, tok, TEST, SITE, GEN, who=WHO.get(key), seed=SEED, batch=dict(BATCH))
    except Exception as e:
        msg = f"{type(e).__name__}: {str(e)[:200]}"
        print("[건너뜀] 이 모델은 시험하지 못했어요:", msg)
        SKIPPED[key] = msg[:60]
        INFO[key] = {"repo": repo, "available": False, "reason": msg}
        save_all()
        continue
    finally:
        model = tok = None
        free_gpu()
        shutil.rmtree(CACHE, ignore_errors=True)   # the next model needs the disk space
    print("  채점 중…")
    GRADED[key] = grade_all(TEST, answers)
    INFO[key] = {"repo": repo, "available": True, "seconds": round(time.time() - t0)}
    s = summarize({key: GRADED[key]}, TEST)[key]
    print(f"  {MODEL_NAMES[key]}: {s['score']}점 ({s['right']}/{s['n']}), 반복 {s['repeats']}개, {time.time() - t0:.0f}초")
    save_all()
print(f"\\n모두 끝 ({(time.time() - T_ALL) / 60:.0f}분). 저장: {RESULTS_PATH}, {ANSWERS_PATH}")
'''),
             md("## 4. 결과"),
             code('''
import pandas as pd
SUMMARY = summarize(GRADED, TEST)
GOALS = goals(SUMMARY)
pd.set_option("display.max_columns", 20)
if SUMMARY:
    display(pd.DataFrame(cat_rows(SUMMARY, TEST)).set_index("과제"))
else:
    print("시험한 모델이 없어요. 위의 [건너뜀] 메시지를 확인해 주세요.")
if "base" in GOALS:
    print(f"tarius target = Qwen3-4B score = {GOALS['tarius_target']}")
    print(f"lectus target = {GOALS['lectus_rule']} = {GOALS['lectus_target']}")
    for k in ("tarius", "lectus"):
        if k in GOALS:
            print(f"{k}: {GOALS[k]['score']} -> {'PASS' if GOALS[k]['pass'] else 'FAIL'} ({GOALS[k]['gap']:+})")
else:
    print(GOALS.get("note"))
save_all()
# the answers the models got wrong, for the next training data (first 3 per model and category)
for k, rows in GRADED.items():
    bad = [r for r in rows if r["score"] < 1]
    print(f"\\n--- {MODEL_NAMES[k]}: 틀린 {len(bad)}개 (과제마다 3개까지) ---")
    shown = Counter()
    for r in bad:
        if shown[r["cat"]] < 3:
            shown[r["cat"]] += 1
            print(f"[{r['id']}] {r['q'][:40]} -> {r['why']} | {re.sub(chr(10), ' ', r['answer'])[:120]}")
'''),
             md("## 5. 요약 (이 칸을 캡처해서 보내 주세요)"),
             code('''
print(korean_summary(SUMMARY, GOALS, META, SKIPPED))
'''),
             ]
    nb = {"cells": cells, "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                                       "language_info": {"name": "python"}}, "nbformat": 4, "nbformat_minor": 5}
    for i, c in enumerate(nb["cells"]):
        c["id"] = f"ff-eval-{i:02d}"
    return nb


if __name__ == "__main__":
    nb = build()
    with open(P("train", "kaggle-eval.ipynb"), "w", encoding="utf-8") as f:
        json.dump(nb, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("ok", len(nb["cells"]), "cells")
