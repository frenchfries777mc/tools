#!/usr/bin/env python3
# Tools 자체 AI 학습 (내 컴퓨터용). 설치와 실행 방법은 train/local/README.md 에 있어요. train/make_local.py 가 만든 파일이라 직접 고치지 마세요.
# 설정은 환경 변수로 바꿔요: MODEL=smart|basic|premus  VERSION=1.5  CONTINUE=1  MAX_LEN=2048  MAX_TRAIN_HOURS=12
import os
def _env(name, default): return os.environ.get(name, default)
MODEL = _env("MODEL", "smart")
VERSION = _env("VERSION", "1.5")
HF_TOKEN = ""
import os
os.environ["CUDA_VISIBLE_DEVICES"] = "0"   # unsloth uses one GPU (T4 x2: the second one stays unused)
if not HF_TOKEN:   # Lightning: typed into a hidden prompt, never written into the notebook
    HF_TOKEN = os.environ.get("HF_TOKEN", "")
    if not HF_TOKEN:
        import getpass
        HF_TOKEN = input("Hugging Face Write 토큰(hf_...)을 붙여 넣고 Enter (글자가 그대로 보여요): ").strip()
RUN_EVAL = _env("RUN_EVAL", "1") == "1"
CONTINUE = _env("CONTINUE", "1") == "1"
ROUND = int(_env("ROUND", "3"))
MAX_TRAIN_HOURS = float(_env("MAX_TRAIN_HOURS", "12"))   # stop training after this long and still finish (merge + upload), so a credit limit never loses the run
EVAL_MINUTES = int(_env("EVAL_MINUTES", "45"))   # the test after the upload stops after this long

# Where the training data is. A file name is read from DATA_DIR; a full https:// address or a file path also works.
DATA_DIR = "https://raw.githubusercontent.com/frenchfries777mc/tools/main/train/data/"
TRAIN_FILE = ""  # empty = v15-smart.jsonl (premus), v14-basic.jsonl or v14-smart.jsonl (by MODEL and VERSION)
TEST_FILE = ""   # empty = v15-test.jsonl or v14-test.jsonl (by VERSION; held out, never trained on)

REPO_RAW = "https://raw.githubusercontent.com/frenchfries777mc/tools/main/train/data/"   # block catalog and the real-request list
import os, urllib.request, urllib.error
FILES = {"1.5": ("v15-{}.jsonl", "v15-test.jsonl"), "1.4": ("v14-{}.jsonl", "v14-test.jsonl"), "1.3": ("v13-{}.jsonl", "v13-test.jsonl")}[VERSION]
TRAIN_FILE = TRAIN_FILE or FILES[0].format("smart" if MODEL == "premus" else MODEL)   # premus (Qwen3 8B) learns the same data as lectus
TEST_FILE = TEST_FILE or FILES[1]
if VERSION == "1.5" and MODEL == "basic" and not TEST_FILE.startswith(("http", "/")): TEST_FILE = "v15-basic-test.jsonl"   # the test names tarius, not lectus
CFG = {   # 1.4 (plan D): fresh from the base Qwen3, the duplicate-free data seen twice
  "basic": dict(base="unsloth/Qwen3-1.7B", size="1.7B", name="tarius", data=[TRAIN_FILE], epochs=2, r=8,  lr=2e-4),
  "smart": dict(base="unsloth/Qwen3-4B",   size="4B",   name="lectus", data=[TRAIN_FILE], epochs=2, r=16, lr=1.5e-4),
  "premus": dict(base="unsloth/Qwen3-8B",  size="8B",   name="premus", data=[TRAIN_FILE], epochs=2, r=16, lr=1.5e-4),
}[MODEL]
if MODEL == "premus":   # 8B on one T4: about 7 hours of training, so the limit is raised and the test is shortened (merge + upload + test still fit in 9 hours)
    EVAL_MINUTES = min(EVAL_MINUTES, 30)
if CONTINUE and VERSION == "1.4":
    print("1.4는 바탕 Qwen3에서 처음부터 학습해요. CONTINUE를 끄고 계속해요."); CONTINUE = False
if CONTINUE and VERSION == "1.5":   # 1.5: keep training the 1.4 model already on Hugging Face (private) with the 1.5 data, a gentler learning rate
    CFG.update(base=f"Frenchfries777/FF-Tools-{CFG['size']}-merged", epochs=2, lr=1e-4)
if CONTINUE and VERSION == "1.3":   # 1.3 only: keep training the model already on Hugging Face (only the second/third-round data), gently
    CFG.update(base=f"Frenchfries777/FF-Tools-{CFG['size']}-merged", data=[f"round{ROUND if MODEL == 'basic' else 2}-{MODEL}.jsonl"], epochs=1, lr=CFG["lr"] / 4)
MAX_LEN = int(_env("MAX_LEN", "4096"))

def data_url(name): return name if name.startswith(("http://", "https://", "/")) else DATA_DIR + name
def data_there(name):
    p = data_url(name)
    if not p.startswith("http"): return os.path.exists(p)
    try: urllib.request.urlopen(urllib.request.Request(p, method="HEAD"), timeout=60); return True
    except urllib.error.HTTPError as e:
        if e.code == 404: return False
        raise
    except Exception as e: raise RuntimeError("자료 주소에 닿지 못했어요. Internet이 켜져 있는지 확인해 주세요: " + str(e)[:120])
missing = [f for f in CFG["data"] + [TEST_FILE] if not data_there(f)]
if missing:
    print(f"{VERSION} 자료가 아직 저장소에 없어요:", ", ".join(missing))
    raise RuntimeError(f"{VERSION} 자료가 아직 저장소에 없어요 (" + ", ".join(missing) + ")")
print("학습할 모델:", f"FF777 {VERSION} {CFG['name']}", CFG, "시험:", TEST_FILE)
assert HF_TOKEN.startswith("hf_"), "Hugging Face 토큰(hf_로 시작)을 넣어 주세요"


import json, re, math, random, time, urllib.request, os, subprocess
import torch
print("GPU:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "없음 (런타임 유형을 T4 GPU로 바꿔 주세요)")
assert torch.cuda.is_available()

def load(name):
    p = data_url(name)
    text = open(p, encoding="utf-8").read() if not p.startswith("http") else urllib.request.urlopen(p).read().decode("utf-8")
    if MODEL == "premus":   # the lectus data names itself lectus (from intellectus, Qwen3 4B): say premus (from supremus, Qwen3 8B) instead
        for a, b in (("intellectus", "supremus"), ("lectus", "premus"), ("Qwen3 4B", "Qwen3 8B"), ("understanding", "supreme"), ("이해력", "최고")): text = text.replace(a, b)
    return [json.loads(l) for l in text.splitlines() if l.strip()]
train_rows = [r for f in CFG["data"] for r in load(f)]; test_rows = load(TEST_FILE)
_held = set(r["messages"][1]["content"].strip() for r in test_rows)   # the test is never trained on
_n = len(train_rows); train_rows = [r for r in train_rows if r["messages"][1]["content"].strip() not in _held]
if _n != len(train_rows): print("시험 문제와 같은 학습 줄", _n - len(train_rows), "개를 뺐어요")

# What the developer taught the AI on the site's 가르치기 page (public read; only the developer can write)
ASK_SYS = 'You help someone with their spreadsheet. Answer the question about the table clearly and briefly in plain text (no markdown tables, no code fences). Use the language the question is written in.'
WHO = {"tarius": f'You are FF777 {VERSION} tarius, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 1.7B. Your name is the end of the Latin word elementarius ("basic").', "lectus": f'You are FF777 {VERSION} lectus, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 4B. Your name is the end of the Latin word intellectus ("understanding").', "premus": f'You are FF777 {VERSION} premus, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 8B. Your name is the end of the Latin word supremus ("supreme").'}[CFG["name"]]
HUMOR = "You are cheerful and a little funny: when you chat you add a short, kind joke, but answers about tables, formulas and code stay exact and serious."
WHO = WHO + " " + HUMOR   # same sentence as the train/build*.js that made the data (ASK_SYS = ai-prompts.js askSys)
facts = []
try:
    req = urllib.request.Request("https://kebsbuvuutilitwlvxzv.supabase.co/rest/v1/ff_ai_facts?select=model,question,fact&order=id",
                                 headers={"apikey": "sb_publishable_4Egu0zm3p6cxWGvP_-GlIw_mlCpO1Nf"})
    facts = [f for f in json.load(urllib.request.urlopen(req)) if f["model"] in ("all", CFG["name"]) and f["fact"]]
except Exception as e:
    print("가르친 내용을 불러오지 못했어요 (없이 계속해요):", e)
lines = [("- " + (f["question"] + " -> " if f["question"] else "") + f["fact"]) for f in facts]
with_facts = ASK_SYS + "\n\n" + WHO + ("\nFacts you know (use them when they are relevant):\n" + "\n".join(lines[-30:])[-2000:] if lines else "")
for f in facts:
    if not f["question"]: continue
    ask = "(No table selected.)\n\nQuestion: " + f["question"]
    for sysmsg, times in ((with_facts, 1), (ASK_SYS + "\n\n" + WHO, 2)):   # with the facts in the prompt, and from memory
        for _ in range(times):
            train_rows.append({"task": "taught", "messages": [{"role": "system", "content": sysmsg}, {"role": "user", "content": ask}, {"role": "assistant", "content": f["fact"]}]})
print("가르친 내용", len(facts), "개 (질문이 있는 것만 학습 자료로 들어가요)")
from collections import Counter
print("학습 자료", len(train_rows), dict(Counter(r["task"] for r in train_rows)))
print("시험", len(test_rows), dict(Counter(r["task"] for r in test_rows)))

from unsloth import FastLanguageModel
model, tokenizer = FastLanguageModel.from_pretrained(CFG["base"], max_seq_length=MAX_LEN, load_in_4bit=True, token=HF_TOKEN)

def prompt_text(msgs):   # what the site sends (thinking off), up to where the answer starts
    return tokenizer.apply_chat_template(msgs[:2], tokenize=False, add_generation_prompt=True, enable_thinking=False)
def full_text(msgs):
    return tokenizer.apply_chat_template(msgs, tokenize=False, enable_thinking=False)
print(prompt_text(train_rows[0]["messages"])[-300:])

CAT = None
def catalog():
    global CAT
    if CAT is None:
        with urllib.request.urlopen(REPO_RAW.replace("/data/", "/ref/") + "catalog.txt") as r:
            CAT = set(l.split(" ")[0] for l in r.read().decode("utf-8").splitlines() if l.strip())
    return CAT

def chrf(hyp, ref, n=4):   # character n-gram F-score (0..1), good enough to compare translations
    def grams(s, k): s = re.sub(r"\s+", " ", s.strip()); return Counter(s[i:i+k] for i in range(max(0, len(s)-k+1)))
    ps, rs = [], []
    for k in range(1, n+1):
        h, r = grams(hyp, k), grams(ref, k); m = sum((h & r).values())
        ps.append(m / max(1, sum(h.values()))); rs.append(m / max(1, sum(r.values())))
    p, r = sum(ps)/n, sum(rs)/n
    return 0 if p + r == 0 else 5*p*r/(4*p + r)

def jload(s):
    s = s.strip(); s = re.sub(r"^```(json)?|```$", "", s).strip()
    try: return json.loads(s[s.index("{"): s.rindex("}")+1])
    except Exception: return None

def html_score(out, prompt, ref):
    """Structure only (the notebook has no browser): one html block, ends with </html>, balanced script, every getElementById id exists,
    no outside files, and an edit keeps the old page's ids while a new page does not. Whether it WORKS is checked afterwards by train/ff_try.py."""
    m = re.search(r"```html\s*(.*?)(```|$)", out, re.S)
    if not m: return 0.0
    h = m.group(1).strip()
    if "<html" not in h.lower() or not h.lower().rstrip().endswith("</html>"): return 0.25
    code = "\n".join(re.findall(r"<script[^>]*>(.*?)</script>", h, re.S))
    bal = all(code.count(x) == code.count(y) for x, y in ("()", "{}", "[]"))
    ids = set(re.findall(r'id="([^"]+)"', h)); used = set(re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", code))
    if re.search(r"<script[^>]+src=|https?://", h) or not bal or any(u not in ids for u in used): return 0.5
    cur = re.search(r"Current page:\n```html\n(.*?)\n```", prompt, re.S)
    if cur and ref:
        old = set(re.findall(r'id="([^"]+)"', cur.group(1)))
        want_edit = bool(old) and len(old & set(re.findall(r'id="([^"]+)"', ref))) / len(old) >= 0.6
        keeps = bool(old) and len(old & ids) / len(old) >= 0.6
        return 1.0 if keeps == want_edit else 0.75
    return 1.0

def score(task, out, ref, prompt=""):
    if task in ("code", "und", "real"): return html_score(out, prompt, ref)
    if task == "tr": return chrf(out, ref)
    j, r = jload(out), json.loads(ref)
    if not j: return 0.0
    if task == "formula":
        f = lambda s: re.sub(r"\s+", "", str(s or "")).upper()
        return 1.0 if f(j.get("formula")) == f(r["formula"]) else 0.5 if str(j.get("formula", "")).startswith("=") else 0.25
    if task == "table":
        rows = j.get("rows")
        if not isinstance(rows, list) or not rows or not all(isinstance(x, list) for x in rows): return 0.25
        w = len(rows[0]); ok = all(len(x) == w for x in rows)
        return (0.5 if ok else 0.25) + (0.25 if w == len(r["rows"][0]) else 0) + (0.25 if len(rows) == len(r["rows"]) else 0)
    if task == "graph":
        return 0.4*(j.get("type") == r["type"]) + 0.3*(j.get("series") == r["series"]) + 0.3*(j.get("range") == r["range"])
    return 0.0

# ---------- plan C: the test as the site gives it (4-bit model, the site's answer settings); a repeating answer gets 0 ----------
from transformers import LogitsProcessor, LogitsProcessorList
PROSE  = dict(temperature=0.7, top_p=0.8,  presence=1.0, max_new_tokens=400)    # free answers: 질문·요약, AI 함수 글, 랩 도우미
STRICT = dict(temperature=0.3, top_p=0.95, presence=0.0, max_new_tokens=300)    # JSON answers and translations
HTML   = dict(temperature=0.3, top_p=0.95, presence=0.0, max_new_tokens=1800)   # Block HTML pages
class PresencePenalty(LogitsProcessor):   # like the site's presence_penalty: a token already in the answer gets this much less
    def __init__(self, start, penalty): self.start, self.penalty = start, penalty
    def __call__(self, input_ids, scores):
        done = input_ids[:, self.start:]
        if done.shape[1]:
            hit = torch.zeros_like(scores, dtype=torch.bool); hit.scatter_(1, done, True)
            scores = scores - self.penalty * hit.to(scores.dtype)
        return scores

HAN = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff]")
def repeats(t):
    """True when one phrase comes back more than 3 times: 3 times in a row (5+ letters), or the same list item / 16-letter piece 4+ times."""
    s = re.sub(r"\s+", " ", t)
    if re.search(r"(.{5,80}?)\s*\1\s*\1", s): return True
    items = Counter(x.strip(" .!?~'\"-") for x in re.split(r"(?<!\d),|,(?!\d)|[\n·•、]|\d+\.\s", t))
    if any(n >= 4 for x, n in items.items() if len(x) >= 4): return True
    k = re.sub(r"\s", "", t); g = Counter(k[i:i+16] for i in range(len(k) - 15))
    return bool(g) and max(g.values()) >= 4

def kind_of(r):
    t, ref = r["task"], r["messages"][2]["content"].strip()
    if t in ("code", "und", "real") or ref.startswith("```html"): return "html"
    if t in ("tr", "graph", "formula", "table") or (ref.startswith("{") and jload(ref) is not None): return "strict"
    return "prose"

def prose_score(out, ref, q):
    if not out.strip(): return 0.0, "빈 답"
    if repeats(out): return 0.0, "반복"
    if HAN.search(out) and not HAN.search(q + ref): return 0.0, "한자 섞임"
    return (0.5 + 0.5 * min(1.0, 2 * chrf(out, ref)) if ref else 1.0), ""

def json_score(out, ref):   # tasks the old test did not know (calc, spell, slides ...): same JSON = 1, JSON with the same keys = 0.5
    j, r = jload(out), jload(ref)
    if j is None: return 0.0
    if j == r: return 1.0
    return 0.5 if isinstance(r, dict) and set(j) == set(r) else 0.25

# questions that made lectus 1.3 repeat itself (plan 1), asked like the 질문·요약 tab; only repetition / Chinese / empty is scored
REP_PROBES = ["너가 잘 하는 것", "너 뭐 잘해", "너가잘하는거", "잘하는 것 다 말해 봐", "너의 장점", "너 못하는 거 있어?", "할 수 있는 일 알려줘",
              "what can you do", "자기소개 해 줘", "블록 HTML로 만들 수 있는 것", "재미있는 게임 추천해 줘", "공부 잘하는 방법"]
LIMIT = {"code": 8, "und": 8, "tr": 10, "graph": 8, "formula": 8, "table": 8}   # per task for tasks with a fixed answer; other JSON tasks 8 each
PROSE_MAX, REAL_MAX = 60, 8

def build_test():
    random.seed(7); rows = []
    for q in REP_PROBES:
        ask = "(No table selected.)\n\nQuestion: " + q
        if ask.strip() in _held: continue
        rows.append({"task": "repeat", "messages": [{"role": "system", "content": with_facts}, {"role": "user", "content": ask}, {"role": "assistant", "content": ""}]})
    prose = [r for r in test_rows if kind_of(r) == "prose"]; random.shuffle(prose); rows += prose[:PROSE_MAX]
    others = [r for r in test_rows if kind_of(r) != "prose"]
    for t in sorted(set(r["task"] for r in others), key=lambda t: (kind_of(next(r for r in others if r["task"] == t)) == "html", t)):
        pool = [r for r in others if r["task"] == t]; rows += random.sample(pool, min(len(pool), LIMIT.get(t, 8)))
    try:   # requests written the way the owner really types (no current page), never trained on
        SYS_HTML = next(r["messages"][0]["content"] for r in train_rows if r["task"] == "code")
        with urllib.request.urlopen(REPO_RAW.replace("/data/", "/eval/") + "real-eval-v0.jsonl") as f:
            real = [json.loads(l) for l in f.read().decode("utf-8").splitlines() if l.strip()]
        real = [q for q in real if q["current_project"] is None]; random.shuffle(real)
        rows += [{"task": "real", "messages": [{"role": "system", "content": SYS_HTML}, {"role": "user", "content": "Request: " + q["request"]}, {"role": "assistant", "content": ""}]} for q in real[:REAL_MAX]]
    except Exception as e:
        print("실제 요청 시험을 불러오지 못했어요 (없이 계속해요):", str(e)[:80])
    return rows

def run_test():
    FastLanguageModel.for_inference(model); torch.manual_seed(7)
    rows, t0e, res, done = build_test(), time.time(), [], 0
    for i, r in enumerate(rows):
        if time.time() - t0e > EVAL_MINUTES * 60: print(f"\n시험 시간({EVAL_MINUTES}분)이 다 돼서 {i}/{len(rows)}문제만 봤어요"); break
        msgs, kind = r["messages"], ("prose" if r["task"] == "repeat" else kind_of(r))
        st = {"prose": PROSE, "strict": STRICT, "html": HTML}[kind]
        ids = tokenizer(prompt_text(msgs), return_tensors="pt").to("cuda"); n = ids["input_ids"].shape[1]
        lp = LogitsProcessorList([PresencePenalty(n, st["presence"])]) if st["presence"] else None
        out = model.generate(**ids, max_new_tokens=st["max_new_tokens"], do_sample=True, temperature=st["temperature"], top_p=st["top_p"], top_k=0, logits_processor=lp)
        text = tokenizer.decode(out[0][n:], skip_special_tokens=True)
        text = re.sub(r"<think>.*?(</think>|$)", "", text, flags=re.S).strip()
        ref, q = msgs[2]["content"], msgs[1]["content"]; why = ""
        if kind == "prose": sc, why = prose_score(text, ref, q)
        elif r["task"] in ("code", "und", "real", "tr", "graph", "formula", "table"): sc = score(r["task"], text, ref, q)
        elif kind == "html": sc = html_score(text, q, ref)
        else: sc = json_score(text, ref)
        res.append({"task": r["task"], "kind": kind, "score": sc, "why": why, "full": out.shape[1] - n >= st["max_new_tokens"], "q": q[-200:], "answer": text})
        print(f"\r시험: {i+1}/{len(rows)}", end="")
    per = {}
    for x in res: per.setdefault(x["task"], []).append(x["score"])
    pts = {t: round(100 * sum(v) / len(v)) for t, v in per.items()}
    prose = [x for x in res if x["kind"] == "prose"]; rep = [x for x in prose if x["why"] == "반복"]; han = [x for x in prose if x["why"] == "한자 섞임"]
    names = {"repeat": "반복 확인", "ask": "질문·요약", "self": "자기소개", "joke": "아재개그", "code": "코딩", "und": "요청 이해", "tr": "번역", "graph": "그래프",
             "formula": "수식", "table": "표", "slides": "슬라이드", "calc": "AI 계산", "spell": "맞춤법", "explain": "블록 설명", "real": "실제 요청"}
    print(f"\n\n=== FF777 {VERSION} {CFG['name']} 시험 결과 (4비트, 사이트 설정, {len(res)}문제) ===")
    for t, p in pts.items(): print(f"{names.get(t, t):8s} {p:3d}점  ({len(per[t])}문제)")
    print("평균", round(sum(pts.values()) / max(1, len(pts))), "점")
    print(f"글 답변 {len(prose)}개 중 반복 {len(rep)}개, 한자 섞임 {len(han)}개, 길이 끝까지 쓴 답 {sum(x['full'] for x in prose)}개")
    print("합격 기준 '반복 0개':", "통과" if not rep else f"실패 ({len(rep)}개)")
    for x in rep[:3]: print(" - 반복한 답:", x["q"].split("Question: ")[-1][:40], "→", x["answer"][:150].replace("\n", " "))
    for x in [x for x in res if x["task"] == "repeat"][:3]: print(" - 예:", x["q"].split("Question: ")[-1], "→", x["answer"][:150].replace("\n", " "))
    path = f"ff-test-{CFG['name']}-{VERSION}.json"
    json.dump({"version": VERSION, "model": CFG["name"], "points": pts, "repeats": len(rep), "han": len(han), "rows": res}, open(path, "w"), ensure_ascii=False, indent=1)
    print("답 전체를 저장했어요:", path)
    return pts


SMALL_GPU = torch.cuda.get_device_properties(0).total_memory < 10 * 2**30   # 8GB laptop GPU: batch 1 x 8 steps, the same 8 rows per update as the bigger setups
model = FastLanguageModel.get_peft_model(model, r=CFG["r"], lora_alpha=CFG["r"]*2, lora_dropout=0, bias="none",
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    use_gradient_checkpointing="unsloth", random_state=3407)

from datasets import Dataset
texts = [full_text(r["messages"]) for r in train_rows]
keep = [t for t in texts if len(tokenizer(t)["input_ids"]) <= MAX_LEN]
print(f"학습 자료 {len(keep)}개 (너무 긴 {len(texts)-len(keep)}개 제외)")
ds = Dataset.from_dict({"text": keep})

# Save progress to Google Drive every 100 steps so a cut-off runtime (usage limit, disconnect) can resume instead of starting over.
import os, glob
CKPT = f"ff-ckpt-{MODEL}"   # next to the notebook (a Studio keeps its files)
print("진행 상황을 여기에 저장해요:", CKPT)

from trl import SFTTrainer, SFTConfig
args = dict(dataset_text_field="text", per_device_train_batch_size=1 if (MODEL == "premus" or SMALL_GPU) else 2, gradient_accumulation_steps=8 if (MODEL == "premus" or SMALL_GPU) else 4,
    num_train_epochs=CFG["epochs"], learning_rate=CFG["lr"], warmup_ratio=0.03, lr_scheduler_type="cosine",
    logging_steps=10, optim="adamw_8bit", weight_decay=0.01, seed=3407, output_dir=CKPT, report_to="none",
    save_strategy="steps", save_steps=100, save_total_limit=1, fp16=not torch.cuda.is_bf16_supported(), bf16=torch.cuda.is_bf16_supported())
try: cfg = SFTConfig(max_length=MAX_LEN, **args)
except TypeError: cfg = SFTConfig(max_seq_length=MAX_LEN, **args)
trainer = SFTTrainer(model=model, tokenizer=tokenizer, train_dataset=ds, args=cfg)

from unsloth.chat_templates import train_on_responses_only   # learn only the answers, not the prompts
trainer = train_on_responses_only(trainer, instruction_part="<|im_start|>user\n", response_part="<|im_start|>assistant\n")
# Keep the newest checkpoint on Hugging Face too (private), so a cut-off session can resume from it even when Kaggle drops the output of a cancelled run.
import json, shutil
from transformers import TrainerCallback
from huggingface_hub import HfApi, snapshot_download
_api = HfApi(token=HF_TOKEN); CKPT_REPO = f"{_api.whoami()['name']}/FF-Tools-{CFG['size']}-ckpt"
if not glob.glob(os.path.join(CKPT, "checkpoint-*")):
    try:
        _tmp = snapshot_download(CKPT_REPO, allow_patterns="last/*", local_dir="ckpt_dl", token=HF_TOKEN)
        _st = json.load(open(os.path.join(_tmp, "last", "trainer_state.json")))
        shutil.copytree(os.path.join(_tmp, "last"), os.path.join(CKPT, f"checkpoint-{_st['global_step']}"), dirs_exist_ok=True)
        print("Hugging Face에 저장해 둔 중간 진행을 가져왔어요: 걸음", _st["global_step"])
    except Exception as e:
        print("저장해 둔 중간 진행이 없어요 (처음부터 해요):", str(e)[:80])
class HFSync(TrainerCallback):   # every 200 steps (about 35 minutes)
    def on_save(self, args, state, control, **kw):
        if state.global_step % 200: return control
        try:
            _api.create_repo(CKPT_REPO, private=True, exist_ok=True)
            _api.upload_folder(folder_path=os.path.join(args.output_dir, f"checkpoint-{state.global_step}"), repo_id=CKPT_REPO, path_in_repo="last", delete_patterns="*", commit_message=f"step {state.global_step}")
            print("중간 진행을 Hugging Face에 올렸어요: 걸음", state.global_step)
        except Exception as e:
            print("중간 진행 올리기에 실패했어요 (학습은 계속해요):", str(e)[:80])
        return control
resume = bool(glob.glob(os.path.join(CKPT, "checkpoint-*")))
if resume: print("저장된 중간 진행에서 이어서 해요")
from transformers import TrainerCallback
class TimeGuard(TrainerCallback):   # stop after MAX_TRAIN_HOURS so merge + upload still fit in the session
    def on_step_end(self, args, state, control, **kw):
        if time.time() - t0 > MAX_TRAIN_HOURS * 3600:
            print(f"\n시간 제한({MAX_TRAIN_HOURS}시간)에 닿아 여기서 학습을 마쳐요 (걸음 {state.global_step})"); control.should_training_stop = True
        return control
t0 = time.time(); trainer.add_callback(TimeGuard()); trainer.add_callback(HFSync()); trainer.train(resume_from_checkpoint=resume or None); print(f"학습 끝: {(time.time()-t0)/60:.0f}분")
import shutil; shutil.rmtree(CKPT, ignore_errors=True)   # finished: drop the checkpoint so the next run starts fresh

import json, os
import shutil
shutil.rmtree("merged", ignore_errors=True)   # never upload an older model left over in this session
model.save_pretrained_merged("merged", tokenizer, save_method="merged_16bit")
from huggingface_hub import HfApi
api = HfApi(token=HF_TOKEN); user = api.whoami()["name"]
rid = f"{user}/FF-Tools-{CFG['size']}-merged" + ("-1.5" if VERSION == "1.5" else "")   # 1.5 goes to its own repo, so 1.4 stays as a fallback
api.create_repo(rid, private=True, exist_ok=True)
api.upload_folder(folder_path="merged", repo_id=rid, commit_message="Tools fine-tune")
print("올렸어요:", rid)
try: api.delete_repo(CKPT_REPO)   # the temporary checkpoint copy is not needed any more
except Exception: pass

TEST = None
if RUN_EVAL:
    try: TEST = run_test()
    except Exception as e: print("시험 중에 문제가 생겼어요 (모델은 이미 올렸어요):", str(e)[:200])
print(f"\nFF777 {VERSION} {CFG['name']} 학습과 올리기를 마쳤어요. 이 아래 줄이 보이면 Claude에게 \"올림 끝\"이라고 알려 주세요. 브라우저용 변환은 GitHub에서 해요.")
print("올림 끝:", rid)
