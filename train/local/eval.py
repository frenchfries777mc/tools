"""FF777 baseline test on this computer (built by train/make_local_eval.py from kaggle-eval.ipynb; do not edit).
Usage (WSL Ubuntu, in the training env):  HF_TOKEN=... python3 train/local/eval.py [tarius|lectus|premus|qwen3-4b ...]
Default model: tarius = Frenchfries777/FF-Tools-1.7B-merged-1.6 (override the repo with FF_REPO=...).
Writes eval-out/baseline-results.json and baseline-answers.jsonl in the current folder."""
import sys, os
def display(x):
    print(x.to_string() if hasattr(x, "to_string") else x)

#@title 설정 (여기만 바꿔요)
MODELS = {            # True = 시험 봄, False = 건너뜀 (목표 점수가 Qwen3 4B 기준이라 4B는 켜 둬요. 1.7B는 1.3 때 쟀어요: 41.4점)
    "qwen3-1.7b": False,
    "qwen3-4b": False,   # 1.0~1.4 때 쟀어요: 63.6
    "qwen3-8b": False,   # 67.9
    "tarius": False,     # 1.4: 55.0
    "lectus": True,      # 1.5만 시험 봐요 (1.4: 76.4)
    "premus": False,     # 1.4: 68.6
}
REPOS = {
    "qwen3-1.7b": "Qwen/Qwen3-1.7B",
    "qwen3-4b": "Qwen/Qwen3-4B",
    "qwen3-8b": "Qwen/Qwen3-8B",
    "tarius": "Frenchfries777/FF-Tools-1.7B-merged",   # 비공개: HF_TOKEN이 필요해요
    "lectus": "Frenchfries777/FF-Tools-4B-merged-1.5",   # 1.5 (CONTINUE=True 결과)
    "premus": "Frenchfries777/FF-Tools-8B-merged",
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
OUT = os.path.join(os.getcwd(), "eval-out"); os.makedirs(OUT, exist_ok=True)

import os
HF_TOKEN = os.environ.get("HF_TOKEN", "")
os.environ["CUDA_VISIBLE_DEVICES"] = "0"
if not HF_TOKEN:
    try:
        raise RuntimeError("HF_TOKEN 환경변수가 비어 있어요")
    except Exception as e:
        print("HF_TOKEN을 못 읽었어요:", type(e).__name__)
if HF_TOKEN:
    print("HF_TOKEN을 읽었어요 (값은 보여 주지 않아요).")
    os.environ["HF_TOKEN"] = HF_TOKEN               # 모델을 내려받는 모든 단계가 이 토큰을 쓰게 해요
    os.environ["HUGGING_FACE_HUB_TOKEN"] = HF_TOKEN
else:
    print("[주의] HF_TOKEN이 없어요. 명령 앞에 HF_TOKEN=... 을 붙여 주세요.")
    print("       지금은 기본 Qwen만 시험하고, 비공개인 타리우스·렉투스는 건너뛰어요.")
# local choices: models named on the command line (default tarius); tarius = the 1.6 model unless FF_REPO says otherwise
_want = sys.argv[1:] or ["tarius"]
for _k in MODELS:
    MODELS[_k] = _k in _want
REPOS["tarius"] = os.environ.get("FF_REPO", "Frenchfries777/FF-Tools-1.7B-merged-1.6") if "tarius" in _want else REPOS["tarius"]
BATCH = {"code": 6, "default": 8}
QUICK = os.environ.get("QUICK") == "1"


import json, os, re, sys, time, shutil, subprocess, urllib.request, tarfile
from collections import Counter
try:
    import torch, transformers, bitsandbytes
except Exception as e:
    raise SystemExit("프로그램 설치가 안 됐어요 (" + type(e).__name__ + "). 터미널에서 pip install bitsandbytes accelerate transformers 를 해 주세요.")
print("torch", torch.__version__, "| transformers", transformers.__version__, "| bitsandbytes", bitsandbytes.__version__)
if not torch.cuda.is_available():
    raise SystemExit("GPU가 없어요. 오른쪽 Session options에서 Accelerator = GPU T4 로 바꾸고 터미널에서 pip install bitsandbytes accelerate transformers 를 해 주세요.")
GPU = torch.cuda.get_device_name(0)
print("GPU:", GPU)

"""FF777 baseline test: prompts, graders and the run loop.

train/make_kaggle_eval.py pastes this file unchanged into train/kaggle-eval.ipynb, and train/eval/test_ffeval.py tests it
without a GPU. Nothing heavy runs on import (torch and transformers are imported inside the functions that need them).
"""
import gc, json, math, os, re, shutil, subprocess, tempfile, time
from decimal import Decimal, ROUND_HALF_UP

CAT_NAMES = {   # category -> Korean name shown in the tables (order = table order)
    "code": "코딩(페이지 동작)", "word": "단어 하나", "unknown": "모르는 말", "self": "자기·사이트 소개",
    "list": "목록·조언", "math": "질문 탭 계산", "calc": "AI 계산", "formula": "수식", "graph": "그래프",
    "table": "표", "cell": "셀 =AI()",
}

# ---------------------------------------------------------------- repeats and Chinese characters
WORDCH = re.compile(r"[0-9A-Za-z\uac00-\ud7a3\u3131-\u318e]")   # letters, digits, Hangul
HAN = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff]")               # CJK ideographs (the "这个问题" leak)


def find_repeat(text, min_unit=5, min_word=3, times=3, max_unit=400):
    """The same piece (min_unit+ characters with min_word+ letters/digits) written `times` times in a row
    ("블록으로 블록 만들기, 블록으로 블록 만들기, 블록으로 블록 만들기"). Spaces are squeezed first. Returns the piece or None."""
    import numpy as np
    s = re.sub(r"\s+", " ", text or "")
    n = len(s)
    if n < min_unit * times:
        return None
    a = np.frombuffer(s.encode("utf-32-le"), dtype=np.uint32)
    for p in range(min_unit, min(max_unit, n // times) + 1):
        eq = np.concatenate(([0], (a[:-p] == a[p:]).astype(np.int8), [0]))
        d = np.diff(eq)
        starts, ends = np.flatnonzero(d == 1), np.flatnonzero(d == -1)
        for st in starts[(ends - starts) >= (times - 1) * p]:
            unit = s[st:st + p]
            if len(WORDCH.findall(unit)) >= min_word:   # every window of the run is a rotation of the same piece
                return unit
    return None


def has_han(text):
    return bool(HAN.search(text or ""))


def clean_answer(t):
    t = re.sub(r"<think>[\s\S]*?(</think>|$)", "", t or "")
    return t.strip()


# ---------------------------------------------------------------- site prompts (the strings come from ai-prompts.js / ai.js)
def col_name(c):
    s, c = "", c + 1
    while c > 0:
        m = (c - 1) % 26
        s = chr(65 + m) + s
        c = (c - 1) // 26
    return s


def fmt_cell(v):
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return "" if v is None else str(v)


def table_text(rows):
    """Same text as tableText() in sheet/ai-sheet.js for a table that starts at A1."""
    w = max(len(r) for r in rows)
    lines = ["\t" + "\t".join(col_name(j) for j in range(w))]
    for i, r in enumerate(rows):
        lines.append("\t".join([str(i + 1)] + [fmt_cell(v) for v in list(r) + [""] * (w - len(r))]))
    return "\n".join(lines)


def build_prompt(item, S, who=None):
    """(system, user) exactly as the site builds them. who = the FF model's self-introduction (only our models get it,
    and only where the site asks with facts:true, i.e. the 질문·요약 tab)."""
    k, q = item["kind"], item["q"]
    tab = table_text(item["table"]) if item.get("table") else None
    head = S["tableHead"]
    if k == "ask":
        sys_ = S["askSys"] + ("\n\n" + who if who else "")
        return sys_, (head + tab + "\n\n" if tab else "(No table selected.)\n\n") + "Question: " + q
    if k == "cell":
        parts = item.get("data") or []
        return S["cellSys"], q + ("\n\nData:\n" + "\n\n".join(parts) if parts else "")
    if k == "formula":
        return S["formulaSys"], (head + tab + "\n\n" if tab else "") + "The formula goes in cell " + item["cell"] + ".\nRequest: " + q
    if k == "graph":
        return S["graphSys"], head + tab + "\n\nRequest: " + q
    if k == "table":
        return S["tableSys"], "Request: " + q
    if k == "calc":
        return S["calcSys"], ("Columns: " + item["cols"] + "\n" if item.get("cols") else "") + "Request: " + q
    if k == "unit":
        return S["unitSys"], "Request: " + q
    if k == "html":
        return S["SYS_HTML"], "Request: " + q
    raise ValueError(k)


def gen_group(item):
    """Which generation settings an item uses (GEN in the notebook's settings cell)."""
    k = item["kind"]
    return {"ask": "prose", "cell": "cell", "html": "code"}.get(k, "table" if k == "table" else "json")


# ---------------------------------------------------------------- JSON and numbers
def jload(t):
    """Same as FFAI.parseJSON on the site: ```json fences, then the outermost {...} or [...]."""
    t = (t or "").strip()
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", t)
    if m:
        t = m.group(1).strip()
    try:
        return json.loads(t)
    except Exception:
        pass
    a = re.search(r"[\[{]", t)
    b = max(t.rfind("}"), t.rfind("]"))
    if a and b > a.start():
        try:
            return json.loads(t[a.start():b + 1])
        except Exception:
            return None
    return None


NUM = re.compile(r"[-−–]?\d{1,3}(?:,\d{3})+(?:\.\d+)?|[-−–]?\d+(?:\.\d+)?")


def numbers_in(text):
    out = []
    for m in NUM.finditer(text or ""):
        s = m.group(0).replace(",", "").replace("−", "-").replace("–", "-")
        try:
            out.append(float(s))
        except ValueError:
            pass
    return out


def close(a, b, tol=1e-6):
    try:
        return abs(float(a) - float(b)) <= tol * max(1.0, abs(float(b)))
    except (TypeError, ValueError):
        return False


# ---------------------------------------------------------------- a small spreadsheet formula evaluator
class FormulaError(Exception):
    pass


TOK = re.compile(r"""\s*(?:
    (?P<str>"(?:[^"]|"")*")
  | (?P<rng>\$?[A-Z]{1,3}\$?\d+:\$?[A-Z]{1,3}\$?\d+)
  | (?P<col>\$?[A-Z]{1,3}:\$?[A-Z]{1,3}(?![\d(]))
  | (?P<fn>[A-Z][A-Z0-9.]*)\s*\(
  | (?P<ref>\$?[A-Z]{1,3}\$?\d+)
  | (?P<bool>TRUE|FALSE)\b
  | (?P<num>\d+(?:\.\d+)?(?:E[+-]?\d+)?|\.\d+)
  | (?P<op><=|>=|<>|[-+*/^&%=<>(),;])
)""", re.X)


def _tokens(f):
    f = f.strip()
    if f.startswith("="):
        f = f[1:]
    # upper-case everything outside string literals (function names and refs are case-insensitive)
    f = "".join(p if i % 2 else p.upper() for i, p in enumerate(re.split(r'("(?:[^"]|"")*")', f)))
    pos, out = 0, []
    while pos < len(f):
        if f[pos:].strip() == "":
            break
        m = TOK.match(f, pos)
        if not m or m.end() == pos:
            raise FormulaError("cannot read: " + f[pos:pos + 12])
        kind = m.lastgroup
        out.append((kind, m.group(kind)))
        pos = m.end()
    return out


def _addr(a):
    m = re.match(r"\$?([A-Z]{1,3})\$?(\d+)$", a)
    c = 0
    for ch in m.group(1):
        c = c * 26 + ord(ch) - 64
    return int(m.group(2)) - 1, c - 1


def _num_or_text(v):
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return float(v)
    if isinstance(v, str):
        s = v.strip().replace(",", "")
        if re.fullmatch(r"-?\d+(\.\d+)?", s):
            return float(s)
        return v if v != "" else None
    return v


class Sheet:
    def __init__(self, rows=None, here=None):
        self.cells = {}
        for r, row in enumerate(rows or []):
            for c, v in enumerate(row):
                self.cells[(r, c)] = _num_or_text(v)
        self.here = _addr(here) if here else None
        self.nrows = len(rows or [])

    def get(self, r, c):
        if self.here == (r, c):
            raise FormulaError("circular reference")
        return self.cells.get((r, c))

    def rng(self, a, b):
        (r1, c1), (r2, c2) = _addr(a), _addr(b)
        return [self.get(r, c) for r in range(min(r1, r2), max(r1, r2) + 1) for c in range(min(c1, c2), max(c1, c2) + 1)]

    def column(self, a, b):
        c1, c2 = _addr(a + "1")[1], _addr(b + "1")[1]
        return [self.get(r, c) for r in range(max(self.nrows, (self.here or (0, 0))[0] + 1)) for c in range(min(c1, c2), max(c1, c2) + 1)]


def _n(v):
    if isinstance(v, bool):
        return 1.0 if v else 0.0
    if v is None:
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        s = v.strip().replace(",", "")
        try:
            return float(s)
        except ValueError:
            raise FormulaError("#VALUE! " + v)
    raise FormulaError("#VALUE!")


def _s(v):
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, float):
        return fmt_cell(v)
    return "" if v is None else str(v)


def _flat(args):
    for a in args:
        if isinstance(a, list):
            for x in a:
                yield x, True
        else:
            yield a, False


def _nums(args):   # numbers of the arguments; text and empty cells inside ranges are skipped, like a spreadsheet
    out = []
    for v, in_range in _flat(args):
        if isinstance(v, bool) and in_range:
            continue
        if isinstance(v, (int, float)):
            out.append(float(v))
        elif not in_range and v is not None:
            out.append(_n(v))
    return out


def _round(x, n, mode=ROUND_HALF_UP):
    q = Decimal(1).scaleb(-int(n))
    return float(Decimal(repr(float(x))).quantize(q, rounding=mode))


def _crit(c):
    m = re.match(r"^(<=|>=|<>|=|<|>)?(.*)$", _s(c) if not isinstance(c, (int, float)) else "=" + _s(c), re.S)
    op, val = m.group(1) or "=", m.group(2)
    num = _num_or_text(val)

    def ok(v):
        if isinstance(num, float):
            if not isinstance(v, (int, float)) or isinstance(v, bool):
                return op == "<>"
            a = float(v)
            return {"=": a == num, "<>": a != num, "<": a < num, ">": a > num, "<=": a <= num, ">=": a >= num}[op]
        a = _s(v).lower()
        b = (val or "").lower()
        if op in ("=", "<>"):
            pat = "^" + re.escape(b).replace(r"\*", ".*").replace(r"\?", ".") + "$"
            hit = re.match(pat, a) is not None
            return hit if op == "=" else not hit
        return {"<": a < b, ">": a > b, "<=": a <= b, ">=": a >= b}[op]
    return ok


def _avg(xs):
    if not xs:
        raise FormulaError("#DIV/0!")
    return sum(xs) / len(xs)


FUNCS = {
    "SUM": lambda *a: sum(_nums(a)),
    "AVERAGE": lambda *a: _avg(_nums(a)),
    "MAX": lambda *a: max(_nums(a) or [0.0]),
    "MIN": lambda *a: min(_nums(a) or [0.0]),
    "COUNT": lambda *a: float(len([v for v, r in _flat(a) if isinstance(v, (int, float)) and not isinstance(v, bool)])),
    "COUNTA": lambda *a: float(len([v for v, r in _flat(a) if v not in (None, "")])),
    "PRODUCT": lambda *a: math.prod(_nums(a)),
    "ROUND": lambda x, n=0: _round(_n(x), _n(n)),
    "ROUNDUP": lambda x, n=0: math.copysign(math.ceil(abs(_n(x)) * 10 ** _n(n) - 1e-9) / 10 ** _n(n), _n(x)),
    "ROUNDDOWN": lambda x, n=0: math.copysign(math.floor(abs(_n(x)) * 10 ** _n(n) + 1e-9) / 10 ** _n(n), _n(x)),
    "INT": lambda x: float(math.floor(_n(x))),
    "ABS": lambda x: abs(_n(x)),
    "SQRT": lambda x: math.sqrt(_n(x)),
    "POWER": lambda x, y: _n(x) ** _n(y),
    "MOD": lambda x, y: _n(x) - _n(y) * math.floor(_n(x) / _n(y)),
    "IF": lambda c, a=True, b=False: a if (c if isinstance(c, bool) else _n(c) != 0) else b,
    "AND": lambda *a: all(bool(_n(v)) if not isinstance(v, bool) else v for v, r in _flat(a)),
    "OR": lambda *a: any(bool(_n(v)) if not isinstance(v, bool) else v for v, r in _flat(a)),
    "NOT": lambda x: not (x if isinstance(x, bool) else _n(x) != 0),
    "LEN": lambda s: float(len(_s(s))),
    "LEFT": lambda s, n=1: _s(s)[:int(_n(n))],
    "RIGHT": lambda s, n=1: _s(s)[len(_s(s)) - int(_n(n)):] if int(_n(n)) else "",
    "MID": lambda s, a, n: _s(s)[int(_n(a)) - 1:int(_n(a)) - 1 + int(_n(n))],
    "TRIM": lambda s: re.sub(r" +", " ", _s(s).strip()),
    "UPPER": lambda s: _s(s).upper(),
    "LOWER": lambda s: _s(s).lower(),
    "CONCATENATE": lambda *a: "".join(_s(v) for v, r in _flat(a)),
    "CONCAT": lambda *a: "".join(_s(v) for v, r in _flat(a)),
    "SUBSTITUTE": lambda s, a, b: _s(s).replace(_s(a), _s(b)),
    "VALUE": lambda s: _n(s),
    "COUNTIF": lambda rg, c: float(sum(1 for v in rg if _crit(c)(v))),
    "SUMIF": lambda rg, c, sr=None: sum(_n(s) for v, s in zip(rg, sr if sr is not None else rg) if _crit(c)(v) and isinstance(s, (int, float))),
    "AVERAGEIF": lambda rg, c, sr=None: _avg([_n(s) for v, s in zip(rg, sr if sr is not None else rg) if _crit(c)(v) and isinstance(s, (int, float))]),
}


class _Parser:
    def __init__(self, toks, sheet):
        self.t, self.i, self.sh = toks, 0, sheet

    def peek(self, *vals):
        if self.i < len(self.t) and self.t[self.i][0] == "op" and self.t[self.i][1] in vals:
            return self.t[self.i][1]
        return None

    def take(self, v):
        if not self.peek(v):
            raise FormulaError("expected " + v)
        self.i += 1

    def parse(self):
        v = self.cmp()
        if self.i != len(self.t):
            raise FormulaError("extra text")
        return v

    def cmp(self):
        a = self.cat()
        while True:
            op = self.peek("=", "<>", "<", ">", "<=", ">=")
            if not op:
                return a
            self.i += 1
            b = self.cat()
            if isinstance(a, str) or isinstance(b, str):
                x, y = _s(a).lower(), _s(b).lower()
            else:
                x, y = _n(a), _n(b)
            a = {"=": x == y, "<>": x != y, "<": x < y, ">": x > y, "<=": x <= y, ">=": x >= y}[op]

    def cat(self):
        a = self.add()
        while self.peek("&"):
            self.i += 1
            a = _s(a) + _s(self.add())
        return a

    def add(self):
        a = self.mul()
        while True:
            op = self.peek("+", "-")
            if not op:
                return a
            self.i += 1
            b = self.mul()
            a = _n(a) + _n(b) if op == "+" else _n(a) - _n(b)

    def mul(self):
        a = self.pow()
        while True:
            op = self.peek("*", "/")
            if not op:
                return a
            self.i += 1
            b = self.pow()
            if op == "/" and _n(b) == 0:
                raise FormulaError("#DIV/0!")
            a = _n(a) * _n(b) if op == "*" else _n(a) / _n(b)

    def pow(self):
        a = self.unary()
        while self.peek("^"):
            self.i += 1
            a = _n(a) ** _n(self.unary())
        return a

    def unary(self):
        if self.peek("-"):
            self.i += 1
            return -_n(self.unary())
        if self.peek("+"):
            self.i += 1
            return self.unary()
        v = self.prim()
        while self.peek("%"):
            self.i += 1
            v = _n(v) / 100
        return v

    def prim(self):
        if self.i >= len(self.t):
            raise FormulaError("formula ends too early")
        k, v = self.t[self.i]
        self.i += 1
        if k == "num":
            return float(v)
        if k == "str":
            return v[1:-1].replace('""', '"')
        if k == "bool":
            return v == "TRUE"
        if k == "ref":
            r, c = _addr(v)
            return self.sh.get(r, c)
        if k == "rng":
            a, b = v.split(":")
            return self.sh.rng(a, b)
        if k == "col":
            a, b = v.replace("$", "").split(":")
            return self.sh.column(a, b)
        if k == "fn":
            name = v.split(".")[-1] if v.startswith("_XLFN.") else v
            if name not in FUNCS:
                raise FormulaError("#NAME? " + v)
            args = []
            if not self.peek(")"):
                while True:
                    args.append(self.cmp())
                    if self.peek(",", ";"):
                        self.i += 1
                        continue
                    break
            self.take(")")
            try:
                return FUNCS[name](*args)
            except FormulaError:
                raise
            except Exception as e:
                raise FormulaError(name + ": " + str(e))
        if k == "op" and v == "(":
            x = self.cmp()
            self.take(")")
            return x
        raise FormulaError("unexpected " + v)


def eval_formula(f, rows=None, here=None):
    """Value of a formula like '=SUM(B2:B6)' on a table that starts at A1 (rows[0] = row 1). Raises FormulaError."""
    f = str(f or "").strip()
    if not f.startswith("="):
        raise FormulaError("not a formula")
    v = _Parser(_tokens(f), Sheet(rows, here)).parse()
    if isinstance(v, list):
        if len(v) == 1:
            v = v[0]
        else:
            raise FormulaError("range instead of one value")
    return v


# ---------------------------------------------------------------- HTML pages
def extract_html(t):
    """Same as extractHTML() in blocks/ai-blocks.js. None when there is no page."""
    t = str(t or "")
    m = re.search(r"```(?:html)?\s*\n([\s\S]*?)(?:```|$)", t, re.I)
    if m and re.search(r"<\w", m.group(1)):
        t = m.group(1)
    a = re.search(r"<!doctype|<html|<head|<body", t, re.I)
    if not a:
        return None
    t = t[a.start():]
    b = re.search(r"</html>", t, re.I)
    if b:
        t = t[:b.start() + 7]
    return t.strip()


def _strip_js(code):   # drop strings, template strings and comments before counting brackets (light check without node)
    code = re.sub(r"/\*[\s\S]*?\*/", "", code)
    code = re.sub(r"(?<![:\"'\\])//[^\n]*", "", code)
    return re.sub(r"`(?:\\.|[^`\\])*`|\"(?:\\.|[^\"\\\n])*\"|'(?:\\.|[^'\\\n])*'", '""', code)


def html_static(h, static_res=(), light_syntax=False):
    """Checks that do not need a browser. Returns (ok, why)."""
    low = h.lower()
    if "<html" not in low or not re.search(r"</html>\s*$", low):
        return False, "페이지가 </html>까지 끝나지 않음"
    if "</body>" not in low:
        return False, "</body> 없음"
    body = re.search(r"<body[^>]*>([\s\S]*)</body>", h, re.I)
    if not body or not re.search(r"<(?!script)[a-z]", body.group(1), re.I):
        return False, "본문이 비어 있음"
    if re.search(r"<script[^>]+\bsrc\s*=", h, re.I) or re.search(r"<link[^>]+href\s*=\s*[\"']?https?:", h, re.I):
        return False, "바깥 파일을 씀"
    code = "\n".join(re.findall(r"<script[^>]*>([\s\S]*?)</script>", h, re.I))
    ids = set(re.findall(r"\bid\s*=\s*[\"']?([\w-]+)", h)) | set(re.findall(r"\.id\s*=\s*[\"']([\w-]+)", code))
    used = set(re.findall(r"getElementById\(\s*[\"']([\w-]+)[\"']\s*\)", code))
    miss = sorted(used - ids)
    if miss:
        return False, "없는 id를 씀: " + ", ".join(miss[:3])
    if light_syntax:
        c = _strip_js(code)
        if not all(c.count(a) == c.count(b) for a, b in ("()", "{}", "[]")):
            return False, "괄호 짝이 안 맞음"
    for rx in static_res:
        if not re.search(rx, h, re.I | re.S):
            return False, "필요한 코드 없음: " + rx
    return True, "ok"


HTML_RUNNER = None   # path of html_run.js when node + jsdom work (set by setup_node in the notebook)


def run_html(html, checks, runner=None, timeout=40):
    """Opens the page in jsdom (node html_run.js) and runs the item's checks. None when node is not available."""
    runner = runner or HTML_RUNNER
    if not runner:
        return None
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump({"html": html, "checks": checks}, f, ensure_ascii=False)
        path = f.name
    try:
        p = subprocess.run(["node", runner, path], capture_output=True, text=True, timeout=timeout,
                           env=dict(os.environ, NODE_PATH=os.environ.get("FF_NODE_PATH", os.environ.get("NODE_PATH", ""))))
        line = (p.stdout.strip().splitlines() or [""])[-1]
        try:
            return json.loads(line)
        except Exception:
            return {"crash": (p.stderr or p.stdout)[-300:]}
    except subprocess.TimeoutExpired:
        return {"crash": "시간 초과 (무한 반복?)"}
    finally:
        os.unlink(path)


# ---------------------------------------------------------------- grading
UNKNOWN = re.compile("|".join([
    r"모르겠", r"모릅", r"몰라", r"잘 모르", r"모르는 (말|단어|표현|이름|낱말|용어)", r"처음 듣", r"처음 들어", r"처음 (보|봐|봤|봅|봄)", r"모르는 (부분|내용)(이|은|입)", r"들어 ?본 적(이)? ?없", r"알 수 ?없", r"알 수가 없", r"확인할 수 ?없", r"확인이 어렵",
    r"찾을 수 ?없", r"정보가 없", r"정보를 찾", r"없는 (단어|말|표현)", r"(무슨|어떤) (뜻|의미|말)인지", r"무엇을 (말|뜻|의미)하는지",
    r"뭘 (말|뜻)하는지", r"뭔지 (잘|모르)", r"확실하지 않", r"명확하지 않", r"정확히 알지 못", r"익숙하지 않",
    r"not sure", r"don'?t know", r"do not know", r"unfamiliar", r"no information", r"not familiar", r"(don'?t|do not) have (any )?(specific )?information",
]), re.I)


def _any(res, text):
    return any(re.search(rx, text, re.I | re.S) for rx in res)


def norm_short(s, case=False):
    s = (s or "").strip().strip("\"'“”‘’`").strip()
    s = re.sub(r"[.!?。！？]+$", "", s).strip()
    s = re.sub(r"\s+", " ", s)
    return s if case else s.lower()


def grade(item, answer, finished=True, run=None):
    """Score (0 or 1) and a short reason. `run` is the jsdom result for a page (None: node was not available)."""
    a = clean_answer(answer)
    ck, k = item.get("check", {}), item["kind"]
    info = {"repeat": None, "han": False}
    if k == "html":
        h = extract_html(a)
        rep = find_repeat(a, min_unit=20, min_word=8)
        if rep and not (h and re.search(r"</html>\s*$", h, re.I)):   # code repeats short bits on purpose: count it only when it never finished
            info["repeat"] = rep
            return 0, "반복: " + rep[:40], info
        if not h:
            return 0, "HTML 없음", info
        ok, why = html_static(h, ck.get("static", []), light_syntax=run is None)
        if not ok:
            return 0, why, info
        if run is None:
            return 1, "정적 검사 통과 (노드 없음)", info
        if run.get("crash"):
            return 0, "실행 실패: " + str(run["crash"])[:80], info
        if run.get("syntax"):
            return 0, "문법 오류: " + run["syntax"][:80], info
        for r in run.get("checks", []):
            if not r.get("ok"):
                return 0, "동작: " + str(r.get("why"))[:80], info
        return 1, "ok", info

    rep = find_repeat(a)
    if rep:
        info["repeat"] = rep
        return 0, "반복: " + rep[:40], info
    if ck.get("no_han", True) and has_han(a):
        info["han"] = True
        return 0, "한자 섞임", info
    if not a:
        return 0, "빈 답", info

    if k == "ask":
        if not finished:
            return 0, "끝맺지 못함 (너무 김)", info
        t = ck["type"]
        if any(re.search(rx, a, re.I | re.S) for rx in ck.get("not", [])):
            return 0, "하면 안 되는 말", info
        if t == "ask_back":
            return (1, "ok", info) if UNKNOWN.search(a) else (0, "모르는 말을 지어냄", info)
        if t == "known_or_ask":
            return (1, "ok", info) if (_any(ck["re"], a) or UNKNOWN.search(a)) else (0, "뜻이 틀림", info)
        if t == "number":
            if any(close(x, ck["value"], ck.get("tol", 1e-6)) for x in numbers_in(a)):
                return 1, "ok", info
            for f in re.findall(r"=\s*[-+(\d][0-9A-Za-z .+\-*/^()%,]*", a):   # a sheet formula that gives the right value also counts
                try:
                    if close(eval_formula(f.strip().rstrip(".,"), None), ck["value"], ck.get("tol", 1e-6)):
                        return 1, "ok (수식)", info
                except Exception:
                    pass
            return 0, "답 숫자가 틀림", info
        if t == "prose":
            if len(a) < ck.get("min_len", 10):
                return 0, "너무 짧음", info
            if ck.get("re") and not _any(ck["re"], a):
                return 0, "내용이 맞지 않음", info
            return 1, "ok", info
        raise ValueError(t)

    if k == "cell":
        cs = ck.get("case", False)
        if ck.get("answers") and norm_short(a, cs) in [norm_short(x, cs) for x in ck["answers"]]:
            return 1, "ok", info
        if ck.get("re") and re.fullmatch(ck["re"], norm_short(a), re.I | re.S):
            return 1, "ok", info
        return 0, "값이 틀림", info

    j = jload(a)
    if not isinstance(j, dict):
        return 0, "JSON 아님", info
    if k in ("calc", "formula"):
        f = str(j.get("formula") or "").strip()
        if f and not f.startswith("="):
            f = "=" + f
        if not f:
            return 0, "수식 없음", info
        if ck.get("need_ref") and not re.search(r"\$?[A-Za-z]{1,3}\$?\d+", f):
            return 0, "칸 주소 없이 값을 씀", info
        try:
            v = eval_formula(f, item.get("table"), item.get("cell"))
        except Exception as e:
            return 0, "수식 오류: " + str(e)[:60], info
        want = ck["value"]
        if isinstance(want, str):
            return (1, "ok", info) if _s(v).strip() == want else (0, "값이 다름: " + _s(v)[:30], info)
        return (1, "ok", info) if close(v, want, ck.get("tol", 1e-6)) else (0, "값이 다름: " + _s(v)[:30], info)
    if k == "unit":
        okv = close(j.get("value"), ck["value"]) if isinstance(j.get("value"), (int, float)) else False
        if okv and str(j.get("from", "")).strip() == ck["from"] and str(j.get("to", "")).strip() == ck["to"]:
            return 1, "ok", info
        return 0, "단위나 값이 다름", info
    if k == "graph":
        typ = str(j.get("type", "")).strip().lower()
        rng = re.sub(r"[\s$]", "", str(j.get("range", ""))).upper()
        ser = j.get("series")
        ser = sorted(re.sub(r"[\s$]", "", str(s)).upper() for s in ser) if isinstance(ser, list) else None
        if typ not in ck["type"]:
            return 0, "그래프 종류가 다름: " + typ, info
        if rng not in [r.upper() for r in ck["range"]]:
            return 0, "범위가 다름: " + rng, info
        if ser not in [sorted(s) for s in ck["series"]]:
            return 0, "고른 열이 다름: " + str(ser), info
        return 1, "ok", info
    if k == "table":
        rows = j.get("rows")
        if not isinstance(rows, list) or len(rows) < 2 or not all(isinstance(r, list) and r for r in rows):
            return 0, "rows 형식이 아님", info
        w = len(rows[0])
        if any(len(r) != w for r in rows):
            return 0, "줄마다 칸 수가 다름", info
        if not all(isinstance(x, str) and x.strip() for x in rows[0]):
            return 0, "첫 줄이 제목이 아님", info
        n = len(rows) - 1
        if n < ck.get("min_rows", 1) or n > ck.get("max_rows", 60) or w < ck.get("min_cols", 1) or w > ck.get("max_cols", 12):
            return 0, f"크기가 다름 ({n}줄 {w}칸)", info
        flat = " | ".join(str(x) for r in rows for x in r).lower()
        miss = [c for c in ck.get("contains", []) if c.lower() not in flat]
        if miss:
            return 0, "빠진 내용: " + ", ".join(miss[:3]), info
        if ck.get("numeric_col"):
            cols = [[r[c] for r in rows[1:]] for c in range(1, w)]
            if not any(all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in col) for col in cols):
                return 0, "숫자만 있는 열이 없음", info
        return 1, "ok", info
    raise ValueError(k)


# ---------------------------------------------------------------- scores and goals
def summarize(items_by_model, test):
    """items_by_model: {model: [{"id","cat","score","repeat","han"}...]} -> overall score, per-category score, repeats."""
    cats = [c for c in CAT_NAMES if any(t["cat"] == c for t in test)]
    out = {}
    for m, rows in items_by_model.items():
        if not rows:
            continue
        by = {}
        for c in cats:
            xs = [r["score"] for r in rows if r["cat"] == c]
            if xs:
                by[c] = round(100 * sum(xs) / len(xs), 1)
        out[m] = {"score": round(100 * sum(r["score"] for r in rows) / len(rows), 1), "right": sum(r["score"] for r in rows),
                  "n": len(rows), "by_cat": by, "repeats": sum(1 for r in rows if r.get("repeat")),
                  "han": sum(1 for r in rows if r.get("han"))}
    return out


def goals(summary, base="qwen3-4b", tarius="tarius", lectus="lectus", times=3.5):
    """tarius = base Qwen3 4B score; lectus = 3.5 x base, or, when that is over 100, wrong answers cut to 1/3.5."""
    if base not in summary:
        return {"note": "Qwen3 4B 점수가 없어서 목표를 계산할 수 없어요."}
    b = summary[base]["score"]
    g = {"base": b, "tarius_target": b}
    if times * b <= 100:
        g.update(lectus_target=round(times * b, 1), lectus_rule=f"{times}×Qwen3 4B")
    else:
        g.update(lectus_target=round(100 - (100 - b) / times, 1), lectus_rule=f"틀린 비율 ÷{times}")
    for name in (tarius, lectus):
        if name in summary:
            s, t = summary[name]["score"], g[name + "_target"]
            g[name] = {"score": s, "pass": s >= t, "gap": round(s - t, 1)}
    return g


# ---------------------------------------------------------------- running a model (GPU, Kaggle)
def check_access(repo, token):
    """None when the model can be downloaded, else a reason code."""
    try:
        from huggingface_hub import HfApi
        HfApi().model_info(repo, token=token or None)
        return None
    except Exception as e:
        name, msg = type(e).__name__, str(e)
        if "Gated" in name or "403" in msg:
            return "forbidden"
        if "RepositoryNotFound" in name or "401" in msg or "404" in msg:
            return "not_found"
        return "error: " + msg.splitlines()[0][:120] if msg else "error: " + name


def load_model(repo, token=None, four_bit=True, cache_dir=None, device="cuda"):
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    kw = dict(token=token or None, cache_dir=cache_dir)
    tok = AutoTokenizer.from_pretrained(repo, **kw)
    tok.padding_side = "left"
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token
    if four_bit:
        from transformers import BitsAndBytesConfig
        q = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.float16,
                               bnb_4bit_use_double_quant=False)
        model = AutoModelForCausalLM.from_pretrained(repo, quantization_config=q, device_map={"": 0}, dtype=torch.float16, **kw)
    else:
        model = AutoModelForCausalLM.from_pretrained(repo, dtype=torch.float32, **kw).to(device)
    model.eval()
    return model, tok


def _presence_processor(start, penalty):
    import torch
    from transformers import LogitsProcessor

    class Presence(LogitsProcessor):   # OpenAI-style presence_penalty: lower every token already written in this answer
        def __call__(self, input_ids, scores):
            gen = input_ids[:, start:]
            if gen.shape[1] == 0:
                return scores
            seen = torch.zeros_like(scores, dtype=torch.bool).scatter_(1, gen, True)
            return scores - penalty * seen.to(scores.dtype)
    return Presence()


def chat_text(tok, system, user):
    msgs = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    try:
        return tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True, enable_thinking=False)
    except TypeError:
        return tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)


def generate_batch(model, tok, prompts, g, seed):
    """Samples one answer per prompt with the site's settings g = {temperature, top_p, presence, max_new}.
    Returns [(text, finished, n_tokens)]."""
    import torch
    from transformers import LogitsProcessorList, TemperatureLogitsWarper, TopPLogitsWarper
    enc = tok(prompts, return_tensors="pt", padding=True, add_special_tokens=False)
    enc = {k: enc[k].to(model.device) for k in ("input_ids", "attention_mask")}
    start = enc["input_ids"].shape[1]
    procs = LogitsProcessorList()
    if g.get("presence"):
        procs.append(_presence_processor(start, float(g["presence"])))   # before temperature, as the site's engine does
    procs.append(TemperatureLogitsWarper(float(g["temperature"])))
    if g.get("top_p", 1.0) < 1.0:
        procs.append(TopPLogitsWarper(float(g["top_p"])))
    eos = set()
    for x in (model.generation_config.eos_token_id, tok.eos_token_id, tok.convert_tokens_to_ids("<|im_end|>")):
        if isinstance(x, int) and x >= 0:
            eos.add(x)
        elif isinstance(x, (list, tuple)):
            eos.update(i for i in x if isinstance(i, int))
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    with torch.no_grad():
        out = model.generate(**enc, do_sample=True, temperature=1.0, top_p=1.0, top_k=0, repetition_penalty=1.0,
                             max_new_tokens=int(g["max_new"]), logits_processor=procs, eos_token_id=sorted(eos),
                             pad_token_id=tok.pad_token_id)
    res = []
    for row in out[:, start:].tolist():
        cut = next((i for i, t in enumerate(row) if t in eos), None)
        ids = row if cut is None else row[:cut]
        res.append((tok.decode(ids, skip_special_tokens=True), cut is not None, len(ids)))
    return res


def run_model(model, tok, test, S, gen, who=None, seed=7, batch=None, log=print):
    """Answers every item. Items are grouped by settings and sorted by prompt length so a batch pads little."""
    batch = batch or {"code": 10, "default": 16}
    groups = {}
    for it in test:
        sys_, user = build_prompt(it, S, who if it["kind"] == "ask" else None)
        p = chat_text(tok, sys_, user)
        groups.setdefault(gen_group(it), []).append((it, p, user))
    answers, done, t0, b_no = {}, 0, time.time(), 0
    for gname, rows in groups.items():
        rows.sort(key=lambda r: len(r[1]))
        bs = batch.get(gname, batch["default"])
        i = 0
        while i < len(rows):
            chunk = rows[i:i + bs]
            try:
                outs = generate_batch(model, tok, [r[1] for r in chunk], gen[gname], seed + b_no)
            except Exception as e:   # out of GPU memory: try again with half as many at once
                if "out of memory" in str(e).lower() and bs > 1:
                    import torch
                    torch.cuda.empty_cache()
                    bs = max(1, bs // 2)
                    log(f"  메모리가 모자라서 한 번에 {bs}개씩 해요")
                    continue
                raise
            for (it, p, user), (text, fin, n) in zip(chunk, outs):
                answers[it["id"]] = {"answer": text, "finished": fin, "tokens": n, "user": user}
            i += len(chunk)
            b_no += 1
            done += len(chunk)
            log(f"  {done}/{len(test)} ({gname}) {time.time() - t0:.0f}초")
    return answers


def grade_all(test, answers, use_node=True):
    rows = []
    for it in test:
        a = answers.get(it["id"])
        if a is None:
            continue
        run = None
        if it["kind"] == "html" and use_node and HTML_RUNNER:
            h = extract_html(clean_answer(a["answer"]))
            if h:
                run = run_html(h, it["check"].get("run", []))
        s, why, info = grade(it, a["answer"], a["finished"], run)
        rows.append({"id": it["id"], "cat": it["cat"], "score": s, "why": why, "repeat": info["repeat"], "han": info["han"],
                     "finished": a["finished"], "tokens": a["tokens"], "q": it["q"], "user": a["user"], "answer": a["answer"]})
    return rows


def free_gpu():   # call after `del model, tok`
    gc.collect()
    try:
        import torch
        torch.cuda.empty_cache()
    except Exception:
        pass


def load_test(path):
    with open(path, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]


def quick_subset(test, n=2):
    """The first n items of every category (QUICK = True: check that the notebook runs, about 10 minutes)."""
    seen, out = {}, []
    for it in test:
        if seen.get(it["cat"], 0) < n:
            out.append(it)
            seen[it["cat"]] = seen.get(it["cat"], 0) + 1
    return out


# ---------------------------------------------------------------- what the owner reads
MODEL_NAMES = {"qwen3-1.7b": "Qwen3 1.7B", "qwen3-4b": "Qwen3 4B", "qwen3-8b": "Qwen3 8B", "tarius": "타리우스", "lectus": "렉투스", "premus": "프레무스"}


def cat_rows(summary, test):
    """Rows for the per-category table: [{"과제", "문제 수", <model>: score, ...}]."""
    rows = []
    for c, name in CAT_NAMES.items():
        n = sum(1 for t in test if t["cat"] == c)
        if not n:
            continue
        r = {"과제": name, "문제 수": n}
        for m, s in summary.items():
            r[MODEL_NAMES.get(m, m)] = s["by_cat"].get(c)
        rows.append(r)
    r = {"과제": "전체 점수", "문제 수": len(test)}
    r2 = {"과제": "반복한 답 (개)", "문제 수": len(test)}
    r3 = {"과제": "한자 섞인 답 (개)", "문제 수": len(test)}
    for m, s in summary.items():
        r[MODEL_NAMES.get(m, m)] = s["score"]
        r2[MODEL_NAMES.get(m, m)] = s["repeats"]
        r3[MODEL_NAMES.get(m, m)] = s["han"]
    return rows + [r, r2, r3]


def korean_summary(summary, g, meta, skipped=None):
    n = meta.get("n_items")
    L = [f"FF777 기준 시험 {meta.get('test', 'baseline-v1')} ({n}문제, 4비트, 사이트 설정) {meta.get('date', '')}",
         "점수 = 맞힌 문제 비율 (100점 만점). 같은 말을 3번 넘게 되풀이한 답은 0점.", ""]
    for m, s in summary.items():
        right = s["right"]
        right = int(right) if float(right).is_integer() else right
        L.append(f"{MODEL_NAMES.get(m, m)}: {s['score']}점 ({right}/{s['n']} 맞힘), 반복 {s['repeats']}개, 한자 섞임 {s['han']}개")
    for m, why in (skipped or {}).items():
        L.append(f"{MODEL_NAMES.get(m, m)}: 시험 못 함 ({why})")
    L += ["", "목표"]
    if "base" not in g:
        L.append("- " + g.get("note", ""))
    else:
        b = g["base"]
        t = g.get("tarius")
        L.append(f"- 타리우스 목표 = Qwen3 4B 점수 = {b}점 이상" + (
            f" → 지금 {t['score']}점, " + ("달성" if t["pass"] else f"{-t['gap']}점 모자람") if t else " (타리우스 점수 없음)"))
        lt, l = g["lectus_target"], g.get("lectus")
        if g["lectus_rule"].startswith("틀린"):
            rule = (f"Qwen3 4B × 3.5 = {round(3.5 * b, 1)}점이 100을 넘어서 '틀린 비율 ÷ 3.5'로 재요: "
                    f"틀린 비율 {round(100 - b, 1)}% → {round((100 - b) / 3.5, 1)}% 이하 = {lt}점 이상")
        else:
            rule = f"Qwen3 4B × 3.5 = {lt}점 이상"
        L.append(f"- 렉투스 목표 = {rule}" + (
            f" → 지금 {l['score']}점, " + ("달성" if l["pass"] else f"{-l['gap']}점 모자람") if l else " (렉투스 점수 없음)"))
        reps = ", ".join(f"{MODEL_NAMES[m]} {summary[m]['repeats']}개" for m in ("tarius", "lectus", "premus") if m in summary)
        L.append("- 반복: 목표 0개" + (f" (지금 {reps})" if reps else ""))
    L += ["", "코드 채점: " + ("jsdom에서 실제로 열고 눌러 봄" if meta.get("html_check") == "jsdom" else "정적 검사만 (노드 없음, 다른 실행과 비교하지 마세요)"),
          "4비트: bitsandbytes nf4 (사이트는 MLC q4f16_1이라 점수가 아주 조금 다를 수 있어요)"]
    return "\n".join(L)

open('/tmp/ff_html_run.js', 'w', encoding='utf-8').write('// Opens one generated page in jsdom and runs its checks (FF777 baseline test, train/eval/ffeval.py run_html).\n// Usage: node html_run.js item.json   with item = {html, checks:[{do:[...], want, re?, fresh?}]}\n// Prints one JSON line: {syntax: null|"message", checks:[{ok, why}]}\n// Every check opens the page fresh. Timers run 20x faster, so a 10-second countdown ends in half a second.\n// do: "fill" (type into every input), "click_all", "click_n:N[:regex]" (N clicks on the button whose label matches,\n//     else the first one that is not reset/stop), "keys" (arrows and space), "click_canvas", "wait:ms"\n// want: "none" (no errors only), "changed" (page or drawing changed), "moving" (still changing by itself afterwards),\n//       "alive" (changed or moving), "re" (visible text + alerts match re; fresh = more matches than before), "li_more",\n//       "varies" (click_n gave at least two different results). {any:[check, check]} passes when one of them passes.\n\'use strict\';\nconst fs = require(\'fs\'), vm = require(\'vm\');\nconst { JSDOM, VirtualConsole } = require(\'jsdom\');\nconst item = JSON.parse(fs.readFileSync(process.argv[2], \'utf8\'));\nconst SPEED = 20;   // a check can set {speed: 1} (a game that may end by itself)\nconst sleep = ms => new Promise(r => setTimeout(r, ms));\nconst hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };\n\nfunction stub() {   // anything (AudioContext, Audio, speech): every property and call works and does nothing\n  const f = function () {};\n  return new Proxy(f, {\n    get: (t, k) => k === Symbol.toPrimitive ? () => 0 : k === \'then\' ? undefined : (k in t ? t[k] : (t[k] = stub())),\n    set: (t, k, v) => { t[k] = v; return true; },\n    apply: () => stub(), construct: () => stub(),\n  });\n}\nfunction makeCtx(w, canvas) {   // a 2D context that records what is drawn\n  const props = { canvas, fillStyle: \'#000000\', strokeStyle: \'#000000\', lineWidth: 1, font: \'10px sans-serif\', globalAlpha: 1,\n    textAlign: \'start\', textBaseline: \'alphabetic\', lineCap: \'butt\', shadowBlur: 0, shadowColor: \'transparent\' };\n  const short = x => typeof x === \'number\' ? Math.round(x * 10) / 10 : String(x).slice(0, 40);\n  return new Proxy(props, {\n    get(t, k) {\n      if (k in t || typeof k === \'symbol\') return t[k];\n      return (...a) => {\n        w.__calls.push(k + \'(\' + a.map(short).join(\',\') + \')\');\n        if (k === \'measureText\') return { width: 8 * String(a[0] || \'\').length };\n        if (k === \'getImageData\' || k === \'createImageData\') {\n          const W = Math.min(2000, Math.abs(+a[2] || +a[0] || 1)), H = Math.min(2000, Math.abs(+a[3] || +a[1] || 1));\n          return { width: W, height: H, data: new Uint8ClampedArray(4 * W * H) };\n        }\n        if (/^create(Linear|Radial|Conic)Gradient$|^createPattern$/.test(k)) return { addColorStop() {} };\n        if (k === \'isPointInPath\' || k === \'isPointInStroke\') return false;\n        if (k === \'getTransform\') return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };\n        if (k === \'getLineDash\') return [];\n        return undefined;\n      };\n    },\n    set(t, k, v) { t[k] = v; w.__calls.push(String(k) + \'=\' + short(v)); return true; },\n  });\n}\nfunction makeBeforeParse(speed) { return function beforeParse(w) {\n  w.__calls = []; w.__alerts = []; w.__seen = [];\n  w.alert = m => { w.__alerts.push(String(m)); };\n  w.confirm = () => true; w.prompt = () => \'5\';\n  const st = w.setTimeout.bind(w), si = w.setInterval.bind(w);\n  w.setTimeout = (f, ms, ...a) => st(f, Math.max(0, (+ms || 0) / speed), ...a);\n  w.setInterval = (f, ms, ...a) => si(f, Math.max(1, (+ms || 0) / speed), ...a);\n  w.HTMLCanvasElement.prototype.getContext = function () { return this.__ctx || (this.__ctx = makeCtx(w, this)); };\n  w.HTMLCanvasElement.prototype.toDataURL = () => \'data:,\';\n  w.AudioContext = w.webkitAudioContext = function () { return stub(); };\n  w.Audio = function () { return stub(); };\n  w.HTMLMediaElement.prototype.play = () => Promise.resolve();\n  w.HTMLMediaElement.prototype.pause = () => {};\n  w.speechSynthesis = stub(); w.SpeechSynthesisUtterance = function () { return stub(); };\n  if (!w.matchMedia) w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });\n}; }\nfunction visible(w) {   // what a person sees: body text without script/style, input values, alerts\n  const d = w.document, b = d.body ? d.body.cloneNode(true) : null;\n  if (!b) return \'\';\n  b.querySelectorAll(\'script,style\').forEach(x => x.remove());\n  const vals = Array.from(d.querySelectorAll(\'input,textarea,output,select\')).filter(x => !x.__filled).map(x => x.value || \'\').join(\' \');\n  return b.textContent.replace(/\\s+/g, \' \') + \' \' + vals + \' \' + w.__alerts.join(\' \');\n}\nfunction state(w) {\n  const d = w.document;\n  return hash(d.documentElement.outerHTML) + \':\' + hash(w.__calls.slice(-200).join(\';\'));\n}\nconst RESET = /초기화|리셋|reset|다시|지우|삭제|clear|빼기|감소|^\\s*[-−]\\s*\\d*\\s*$|멈춤|정지|stop/i;\nfunction buttons(d) { return Array.from(d.querySelectorAll(\'button,input[type=button],input[type=submit]\')); }\nfunction label(b) { return (b.textContent || b.value || \'\').trim(); }\nasync function act(w, a) {\n  const d = w.document;\n  if (a === \'fill\') {\n    for (const el of d.querySelectorAll(\'input,textarea\')) {\n      const t = (el.type || \'text\').toLowerCase();\n      if ([\'button\', \'submit\', \'checkbox\', \'radio\', \'range\', \'color\', \'file\', \'hidden\', \'reset\'].includes(t)) continue;\n      const num = t === \'number\' || /숫자|number|num|나이|age|수\\b|값/i.test((el.placeholder || \'\') + \' \' + (el.id || \'\'));\n      el.value = num ? \'6\' : \'민수\'; el.__filled = true;\n      el.dispatchEvent(new w.Event(\'input\', { bubbles: true }));\n      el.dispatchEvent(new w.Event(\'change\', { bubbles: true }));\n    }\n  } else if (a === \'click_all\') {\n    for (const b of buttons(d).slice(0, 12)) { b.click(); await sleep(30); }\n  } else if (a.startsWith(\'click_n:\')) {\n    const [, n, re] = a.split(\':\');\n    const bs = buttons(d);\n    const b = re ? bs.find(x => new RegExp(re, \'i\').test(label(x))) : (bs.find(x => !RESET.test(label(x))) || bs[0]);\n    if (!b) { if (re) throw new Error(\'버튼이 없음: \' + re); return; }\n    for (let i = 0; i < +n; i++) { b.click(); await sleep(20); w.__seen.push(visible(w) + state(w)); }\n  } else if (a === \'keys\') {\n    const keys = [\'ArrowRight\', \'ArrowRight\', \'ArrowRight\', \'ArrowUp\', \'ArrowUp\', \'ArrowLeft\', \'ArrowDown\', \' \', \'ArrowRight\'];\n    const codes = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, \' \': 32 };\n    for (const k of keys) {\n      for (const type of [\'keydown\', \'keyup\']) {\n        const e = new w.KeyboardEvent(type, { key: k, code: k === \' \' ? \'Space\' : k, bubbles: true, cancelable: true });\n        Object.defineProperty(e, \'keyCode\', { get: () => codes[k] });\n        Object.defineProperty(e, \'which\', { get: () => codes[k] });\n        (d.activeElement || d.body).dispatchEvent(e);\n        await sleep(type === \'keydown\' ? 40 : 5);\n      }\n    }\n  } else if (a === \'click_canvas\') {\n    const c = d.querySelector(\'canvas\') || d.body;\n    for (const type of [\'mousedown\', \'mouseup\', \'click\']) c.dispatchEvent(new w.MouseEvent(type, { bubbles: true, clientX: 50, clientY: 50 }));\n    await sleep(30);\n  } else if (a.startsWith(\'wait:\')) {\n    await sleep(+a.slice(5));\n  } else throw new Error(\'모르는 동작 \' + a);\n}\nasync function runCheck(html, ck) {   // {any:[...]} passes when one of its checks passes\n  if (ck.any) {\n    let last = null;\n    for (const c of ck.any) { last = await runOne(html, c); if (last.ok) return last; }\n    return last;\n  }\n  return runOne(html, ck);\n}\nasync function runOne(html, ck) {\n  const errs = [];\n  const vc = new VirtualConsole();\n  vc.on(\'jsdomError\', e => { const m = String((e && ((e.detail && e.detail.message) || e.message)) || e); if (!/Not implemented/i.test(m)) errs.push(m.slice(0, 160)); });\n  const dom = new JSDOM(html, { runScripts: \'dangerously\', pretendToBeVisual: true, url: \'http://localhost/\', virtualConsole: vc, beforeParse: makeBeforeParse(ck.speed || SPEED) });\n  const w = dom.window, d = w.document;\n  w.addEventListener(\'error\', e => errs.push(String(e.message).slice(0, 160)));\n  try {\n    await sleep(150);   // = 3 seconds of page time\n    const s0 = state(w), t0 = visible(w), li0 = d.querySelectorAll(\'li\').length;\n    for (const a of ck.do || []) await act(w, a);\n    await sleep(60);\n    const s1 = state(w), t1 = visible(w);\n    await sleep(200);\n    const s2 = state(w);\n    if (errs.length) return { ok: false, why: \'오류: \' + errs[0] };\n    const changed = s0 !== s1 || s0 !== s2, moving = s1 !== s2;\n    const want = ck.want || \'none\';\n    if (want === \'none\') return { ok: true, why: \'ok\' };\n    if (want === \'changed\') return changed ? { ok: true, why: \'ok\' } : { ok: false, why: \'눌러도 바뀌는 것이 없음\' };\n    if (want === \'moving\') return moving ? { ok: true, why: \'ok\' } : { ok: false, why: \'움직이지 않음\' };\n    if (want === \'alive\') return changed || moving ? { ok: true, why: \'ok\' } : { ok: false, why: \'아무 반응이 없음\' };\n    if (want === \'varies\') return new Set(w.__seen).size >= 2 ? { ok: true, why: \'ok\' } : { ok: false, why: \'누를 때마다 같은 결과\' };\n    if (want === \'li_more\') return d.querySelectorAll(\'li\').length > li0 ? { ok: true, why: \'ok\' } : { ok: false, why: \'목록이 늘지 않음\' };\n    if (want === \'re\') {\n      const rx = new RegExp(ck.re, \'gi\');\n      const n0 = (t0.match(rx) || []).length, n1 = (t1.match(rx) || []).length;\n      const ok = ck.fresh ? n1 > n0 : n1 > 0;\n      return ok ? { ok: true, why: \'ok\' } : { ok: false, why: \'기대한 글이 안 나옴: \' + ck.re };\n    }\n    return { ok: false, why: \'모르는 검사 \' + want };\n  } catch (e) {\n    return { ok: false, why: String(e && e.message || e).slice(0, 160) };\n  } finally {\n    w.close();\n  }\n}\n(async () => {\n  const html = item.html;\n  let syntax = null;\n  const tmp = new JSDOM(html);\n  const code = Array.from(tmp.window.document.querySelectorAll(\'script\')).filter(s => !s.type || /javascript|module/i.test(s.type)).map(s => s.textContent);\n  for (const c of code) { try { new vm.Script(c); } catch (e) { syntax = String(e.message).slice(0, 160); break; } }\n  tmp.window.close();\n  const checks = [];\n  if (!syntax) for (const ck of (item.checks && item.checks.length ? item.checks : [{ want: \'none\' }])) checks.push(await runCheck(html, ck));\n  process.stdout.write(JSON.stringify({ syntax, checks }) + \'\\n\');\n  process.exit(0);\n})().catch(e => { process.stdout.write(JSON.stringify({ crash: String(e && e.message || e) }) + \'\\n\'); process.exit(0); });')

open('/tmp/ff-baseline-v1.jsonl', 'w', encoding='utf-8').write('{"id": "c01", "cat": "code", "kind": "html", "q": "그림판에 공이 튀어 다니는 애니메이션", "src": "real-eval-v0#1", "check": {"static": ["<canvas", "setInterval|requestAnimationFrame"], "run": [{"want": "moving"}]}}\n{"id": "c02", "cat": "code", "kind": "html", "q": "버튼을 누를 때마다 숫자가 올라가는 클릭 카운터", "src": "real-eval-v0#2", "check": {"static": [], "run": [{"do": ["click_n:3"], "want": "re", "re": "(^|\\\\D)3(\\\\D|$)", "fresh": true}]}}\n{"id": "c03", "cat": "code", "kind": "html", "q": "1부터 100 사이 숫자 맞히기 게임. 크다/작다를 알려 주고 맞히면 축하해 줘요", "src": "real-eval-v0#3", "check": {"static": ["Math\\\\.random"], "run": [{"do": ["fill", "click_n:1"], "want": "re", "re": "크|커|작|높|낮|업|다운|up|down|정답|맞|축하", "fresh": true}]}}\n{"id": "c04", "cat": "code", "kind": "html", "q": "할 일을 쓰고 추가 버튼을 누르면 목록에 쌓이는 할 일 목록", "src": "real-eval-v0#4", "check": {"static": [], "run": [{"any": [{"do": ["fill", "click_n:1:추가|더하기|add|넣기|등록|저장|\\\\+"], "want": "li_more"}, {"do": ["fill", "click_n:1"], "want": "li_more"}]}]}}\n{"id": "c05", "cat": "code", "kind": "html", "q": "화면이 초록색으로 바뀌면 빨리 누르는 반응 속도 게임", "src": "real-eval-v0#5", "check": {"static": ["setTimeout|setInterval"], "run": [{"do": ["click_all", "wait:300", "click_all"], "want": "changed"}]}}\n{"id": "c07", "cat": "code", "kind": "html", "q": "공 튕기는 거 보고싶어", "src": "real-eval-v0#7", "check": {"static": [], "run": [{"want": "moving"}]}}\n{"id": "c09", "cat": "code", "kind": "html", "q": "투두리스트", "src": "real-eval-v0#9", "check": {"static": [], "run": [{"any": [{"do": ["fill", "click_n:1:추가|더하기|add|넣기|등록|저장|\\\\+"], "want": "li_more"}, {"do": ["fill", "click_n:1"], "want": "li_more"}]}]}}\n{"id": "c10", "cat": "code", "kind": "html", "q": "주사위 굴리는 페이지", "src": "real-eval-v0#10", "check": {"static": ["Math\\\\.random"], "run": [{"do": ["click_n:6"], "want": "varies"}]}}\n{"id": "c11", "cat": "code", "kind": "html", "q": "가위바위보 하고싶음", "src": "real-eval-v0#11", "check": {"static": [], "run": [{"any": [{"do": ["click_n:1:가위|바위|보|✌|✊|✋"], "want": "re", "re": "이겼|졌|비겼|비김|승리|패배|무승부|win|lose|draw|tie", "fresh": true}, {"do": ["click_all"], "want": "re", "re": "이겼|졌|비겼|비김|승리|패배|무승부|win|lose|draw|tie", "fresh": true}]}]}}\n{"id": "c12", "cat": "code", "kind": "html", "q": "타이머 만들어줘 10초부터 줄어드는거", "src": "real-eval-v0#12", "check": {"static": ["setInterval|setTimeout"], "run": [{"any": [{"do": ["click_n:1:시작|start|▶|go", "wait:800"], "want": "re", "re": "(^|\\\\D)0(\\\\D|$)|끝|종료|완료|땡|time\'?s up|done", "fresh": true}, {"do": ["wait:800"], "want": "re", "re": "(^|\\\\D)0(\\\\D|$)|끝|종료|완료|땡|time\'?s up|done", "fresh": true}]}]}}\n{"id": "c13", "cat": "code", "kind": "html", "q": "내 이름 쓰면 반가워요 하고 인사하는 페이지", "src": "real-eval-v0#13", "check": {"static": [], "run": [{"do": ["fill", "click_n:1"], "want": "re", "re": "민수", "fresh": true}]}}\n{"id": "c14", "cat": "code", "kind": "html", "q": "색깔 바뀌는 버튼", "src": "real-eval-v0#14", "check": {"static": [], "run": [{"do": ["click_n:2"], "want": "changed"}]}}\n{"id": "c15", "cat": "code", "kind": "html", "q": "계산기 간단한거", "src": "real-eval-v0#15", "check": {"static": [], "run": [{"any": [{"do": ["fill", "click_n:1"], "want": "re", "re": "(^|[^\\\\d.])(12|36)([^\\\\d.]|$)", "fresh": true}, {"do": ["click_n:1:^\\\\s*6\\\\s*$", "click_n:1:^\\\\s*\\\\+\\\\s*$", "click_n:1:^\\\\s*6\\\\s*$", "click_n:1:^\\\\s*=\\\\s*$"], "want": "re", "re": "(^|[^\\\\d.])12([^\\\\d.]|$)", "fresh": true}]}]}}\n{"id": "c16", "cat": "code", "kind": "html", "q": "퀴즈 3문제 내줘", "src": "real-eval-v0#16", "check": {"static": ["점수|score|정답|맞"], "run": [{"do": ["fill", "click_n:1"], "want": "changed"}]}}\n{"id": "c17", "cat": "code", "kind": "html", "q": "별 모으는 게임인데 키보드로 움직이고싶어", "src": "real-eval-v0#17", "check": {"static": ["keydown|keyup|keypress"], "run": [{"do": ["keys"], "want": "changed"}]}}\n{"id": "c18", "cat": "code", "kind": "html", "q": "로또 번호 뽑기", "src": "real-eval-v0#18", "check": {"static": ["Math\\\\.random"], "run": [{"do": ["click_n:3"], "want": "varies"}, {"do": ["click_n:1"], "want": "re", "re": "(\\\\d{1,2}\\\\D+){5}\\\\d{1,2}"}]}}\n{"id": "c19", "cat": "code", "kind": "html", "q": "오늘 기분 고르는 이모지 버튼", "src": "real-eval-v0#19", "check": {"static": ["[🌀-\U0001faff☀-➿]"], "run": [{"do": ["click_n:1"], "want": "changed"}]}}\n{"id": "c22", "cat": "code", "kind": "html", "q": "뭔가 움직이는거", "src": "real-eval-v0#22", "check": {"static": [], "run": [{"want": "moving"}]}}\n{"id": "c31", "cat": "code", "kind": "html", "q": "make a click counter 근데 글자는 한국어로", "src": "real-eval-v0#31", "check": {"static": ["<button[^>]*>[^<]*[가-힣]"], "run": [{"do": ["click_n:3"], "want": "re", "re": "(^|\\\\D)3(\\\\D|$)", "fresh": true}]}}\n{"id": "c40", "cat": "code", "kind": "html", "q": "우주선 게임 만들어줘. 화살표 키로 우주선을 움직이고, 위에서 떨어지는 장애물을 피하면 점수가 올라가고 부딪히면 목숨이 줄어", "src": "lectus-fails/01", "check": {"static": ["keydown|keyup", "<canvas|setInterval|requestAnimationFrame"], "run": [{"do": ["keys"], "want": "changed", "speed": 1}, {"do": ["wait:300"], "want": "moving", "speed": 1}]}}\n{"id": "w01", "cat": "word", "kind": "ask", "q": "알파벳", "src": "lectus-fails/05", "check": {"type": "known_or_ask", "re": ["글자|문자|letter|26|ABC|로마자"]}}\n{"id": "w02", "cat": "word", "kind": "ask", "q": "티원", "src": "lectus-fails/03", "check": {"type": "known_or_ask", "re": ["T1|페이커|Faker|리그 ?오브 ?레전드|LoL|롤|e ?스포츠|이스포츠|게임단|프로게임|SK ?텔레콤"]}}\n{"id": "w03", "cat": "word", "kind": "ask", "q": "사과", "src": "word", "check": {"type": "known_or_ask", "re": ["과일|fruit|사과나무|빨간|미안|잘못"]}}\n{"id": "w04", "cat": "word", "kind": "ask", "q": "피아노", "src": "word", "check": {"type": "known_or_ask", "re": ["악기|건반|instrument"]}}\n{"id": "w05", "cat": "word", "kind": "ask", "q": "광합성", "src": "word", "check": {"type": "known_or_ask", "re": ["식물|빛|햇빛|이산화탄소|산소|엽록|양분"]}}\n{"id": "w06", "cat": "word", "kind": "ask", "q": "무지개", "src": "word", "check": {"type": "known_or_ask", "re": ["빛|색|일곱|7|비"]}}\n{"id": "w07", "cat": "word", "kind": "ask", "q": "김치", "src": "word", "check": {"type": "known_or_ask", "re": ["배추|발효|음식|반찬|절인|고춧가루"]}}\n{"id": "w08", "cat": "word", "kind": "ask", "q": "지구", "src": "word", "check": {"type": "known_or_ask", "re": ["행성|태양|planet|우리가 (사는|살고)"]}}\n{"id": "w09", "cat": "word", "kind": "ask", "q": "컴퓨터", "src": "word", "check": {"type": "known_or_ask", "re": ["기계|계산|정보|프로그램|전자|장치"]}}\n{"id": "w10", "cat": "word", "kind": "ask", "q": "엑셀", "src": "word", "check": {"type": "known_or_ask", "re": ["스프레드 ?시트|표|마이크로소프트|Microsoft|계산"]}}\n{"id": "w11", "cat": "word", "kind": "ask", "q": "세종대왕", "src": "word", "check": {"type": "known_or_ask", "re": ["한글|훈민정음|조선|임금|왕"]}}\n{"id": "w12", "cat": "word", "kind": "ask", "q": "이순신", "src": "word", "check": {"type": "known_or_ask", "re": ["장군|조선|임진왜란|거북선|수군|명량"]}}\n{"id": "w13", "cat": "word", "kind": "ask", "q": "유튜브", "src": "word", "check": {"type": "known_or_ask", "re": ["동영상|영상|구글|Google|video"]}}\n{"id": "w14", "cat": "word", "kind": "ask", "q": "마인크래프트", "src": "word", "check": {"type": "known_or_ask", "re": ["게임|블록|Minecraft|모장|Mojang"]}}\n{"id": "w15", "cat": "word", "kind": "ask", "q": "블록코딩", "src": "word", "check": {"type": "known_or_ask", "re": ["블록|코딩|프로그래밍|스크래치|Scratch|끼워|조립|명령"]}}\n{"id": "w16", "cat": "word", "kind": "ask", "q": "수학", "src": "word", "check": {"type": "known_or_ask", "re": ["숫자|수|계산|학문|과목|도형"]}}\n{"id": "u01", "cat": "unknown", "kind": "ask", "q": "에엑따", "src": "lectus-fails/04", "check": {"type": "ask_back"}}\n{"id": "u02", "cat": "unknown", "kind": "ask", "q": "뿌르릉빠", "src": "made-up", "check": {"type": "ask_back"}}\n{"id": "u03", "cat": "unknown", "kind": "ask", "q": "쿠마롱티", "src": "made-up", "check": {"type": "ask_back"}}\n{"id": "u04", "cat": "unknown", "kind": "ask", "q": "냐뮤뮤", "src": "made-up", "check": {"type": "ask_back"}}\n{"id": "u05", "cat": "unknown", "kind": "ask", "q": "프랍스텔", "src": "made-up", "check": {"type": "ask_back"}}\n{"id": "u06", "cat": "unknown", "kind": "ask", "q": "크룽카롱", "src": "made-up", "check": {"type": "ask_back"}}\n{"id": "u07", "cat": "unknown", "kind": "ask", "q": "뚜뚜리빵", "src": "made-up", "check": {"type": "ask_back"}}\n{"id": "u08", "cat": "unknown", "kind": "ask", "q": "쏘르방이 뭐야", "src": "made-up", "check": {"type": "ask_back"}}\n{"id": "u09", "cat": "unknown", "kind": "ask", "q": "미뇨뇽 뜻", "src": "made-up", "check": {"type": "ask_back"}}\n{"id": "u10", "cat": "unknown", "kind": "ask", "q": "퀘르틱스", "src": "made-up", "check": {"type": "ask_back"}}\n{"id": "u11", "cat": "unknown", "kind": "ask", "q": "잠뿌링이 뭐임", "src": "made-up", "check": {"type": "ask_back"}}\n{"id": "u12", "cat": "unknown", "kind": "ask", "q": "블라블라시티 인구 알려줘", "src": "made-up", "check": {"type": "ask_back"}}\n{"id": "u13", "cat": "unknown", "kind": "ask", "q": "프로게이머 김둥실 나이 몇 살이야?", "src": "made-up", "check": {"type": "ask_back"}}\n{"id": "u14", "cat": "unknown", "kind": "ask", "q": "흐르븐", "src": "made-up", "check": {"type": "ask_back"}}\n{"id": "s01", "cat": "self", "kind": "ask", "q": "너가 잘 하는 것", "src": "ff777-1.4-plan §1", "check": {"type": "prose", "re": ["표|수식|그래프|코드|코딩|웹|페이지|번역|계산|요약|글|질문|블록|게임|정리|설명"]}}\n{"id": "s02", "cat": "self", "kind": "ask", "q": "너 뭐 잘해?", "src": "self", "check": {"type": "prose", "re": ["표|수식|그래프|코드|코딩|웹|페이지|번역|계산|요약|글|질문|블록|게임|정리|설명"]}}\n{"id": "s03", "cat": "self", "kind": "ask", "q": "너 못하는 거 있어?", "src": "self", "check": {"type": "prose", "re": ["못|어려|없|할 수 없|부족|한계|틀릴|실수"]}}\n{"id": "s04", "cat": "self", "kind": "ask", "q": "넌 누구야", "src": "self", "check": {"type": "prose", "re": ["AI|인공지능|도우미|어시스턴트|assistant|모델|챗봇"]}}\n{"id": "s05", "cat": "self", "kind": "ask", "q": "너의 이름의 뜻은?", "src": "ff777-1.4-plan §1", "check": {"type": "prose", "re": ["intellectus|elementarius|이해|기본|basic|understanding"]}}\n{"id": "s06", "cat": "self", "kind": "ask", "q": "누가 만들었어?", "src": "self", "check": {"type": "prose", "re": ["Frenchfries777|프렌치 ?프라이"]}}\n{"id": "s07", "cat": "self", "kind": "ask", "q": "https://frenchfries777mc.github.io/games/는 어떤 사이트야?", "src": "lectus-fails/06", "check": {"type": "prose", "re": ["Frenchfries777|게임|볼 수 없|열 수 없|접속할 수 없|확인할 수 없|모르"], "not": ["(제가|내가|저는|나는) [^.]{0,20}만들었"]}}\n{"id": "s08", "cat": "self", "kind": "ask", "q": "이 사이트에서 뭐 할 수 있어?", "src": "self", "check": {"type": "prose", "re": ["블록|시트|표|슬라이드|코딩|수식|그래프|게임|도구|AI"]}}\n{"id": "l01", "cat": "list", "kind": "ask", "q": "공부 잘하는 방법 알려줘", "src": "list", "check": {"type": "prose", "min_len": 20}}\n{"id": "l02", "cat": "list", "kind": "ask", "q": "여름방학에 할 만한 거 추천해줘", "src": "list", "check": {"type": "prose", "min_len": 20}}\n{"id": "l03", "cat": "list", "kind": "ask", "q": "강아지 키우면 좋은 점", "src": "list", "check": {"type": "prose", "min_len": 20}}\n{"id": "l04", "cat": "list", "kind": "ask", "q": "건강해지는 습관 5가지", "src": "list", "check": {"type": "prose", "min_len": 20}}\n{"id": "l05", "cat": "list", "kind": "ask", "q": "발표 잘하는 팁", "src": "list", "check": {"type": "prose", "min_len": 20}}\n{"id": "l06", "cat": "list", "kind": "ask", "q": "비 오는 날 집에서 할 수 있는 놀이", "src": "list", "check": {"type": "prose", "min_len": 20}}\n{"id": "l07", "cat": "list", "kind": "ask", "q": "코딩 배우면 좋은 점", "src": "list", "check": {"type": "prose", "min_len": 20}}\n{"id": "l08", "cat": "list", "kind": "ask", "q": "엑셀 처음 배우는 사람한테 조언 좀", "src": "list", "check": {"type": "prose", "min_len": 20}}\n{"id": "l09", "cat": "list", "kind": "ask", "q": "친구랑 싸웠을 때 화해하는 방법", "src": "list", "check": {"type": "prose", "min_len": 20}}\n{"id": "l10", "cat": "list", "kind": "ask", "q": "잠이 안 올 때 어떻게 해?", "src": "list", "check": {"type": "prose", "min_len": 20}}\n{"id": "l11", "cat": "list", "kind": "ask", "q": "집에서 할 수 있는 운동", "src": "list", "check": {"type": "prose", "min_len": 20}}\n{"id": "l12", "cat": "list", "kind": "ask", "q": "표 보기 좋게 만드는 법", "src": "list", "check": {"type": "prose", "min_len": 20}}\n{"id": "m01", "cat": "math", "kind": "ask", "q": "17 곱하기 23은?", "src": "math", "check": {"type": "number", "value": 391, "tol": 1e-06}}\n{"id": "m02", "cat": "math", "kind": "ask", "q": "1부터 10까지 다 더하면?", "src": "math", "check": {"type": "number", "value": 55, "tol": 1e-06}}\n{"id": "m03", "cat": "math", "kind": "ask", "q": "-37 × 5 / 2 는?", "src": "lectus-fails/02", "check": {"type": "number", "value": -92.5, "tol": 1e-06}}\n{"id": "m04", "cat": "math", "kind": "ask", "q": "351의 제곱은?", "src": "math", "check": {"type": "number", "value": 123201, "tol": 1e-06}}\n{"id": "m05", "cat": "math", "kind": "ask", "q": "351의 제곱을 x라 할 때, x=2y/5+38*x에서 y의 값을 구하는 풀이과정과 답을 써라", "src": "lectus-fails/02", "check": {"type": "number", "value": -11396092.5, "tol": 1e-06}}\n{"id": "m06", "cat": "math", "kind": "ask", "q": "80의 15%는?", "src": "math", "check": {"type": "number", "value": 12, "tol": 1e-06}}\n{"id": "m07", "cat": "math", "kind": "ask", "q": "2의 10제곱", "src": "math", "check": {"type": "number", "value": 1024, "tol": 1e-06}}\n{"id": "m08", "cat": "math", "kind": "ask", "q": "3.5 곱하기 4", "src": "math", "check": {"type": "number", "value": 14, "tol": 1e-06}}\n{"id": "m09", "cat": "math", "kind": "ask", "q": "1시간 45분은 몇 분이야?", "src": "math", "check": {"type": "number", "value": 105, "tol": 1e-06}}\n{"id": "m10", "cat": "math", "kind": "ask", "q": "사과 3개에 1200원이면 사과 7개는 얼마야?", "src": "math", "check": {"type": "number", "value": 2800, "tol": 1e-06}}\n{"id": "m11", "cat": "math", "kind": "ask", "q": "12345 + 67890", "src": "math", "check": {"type": "number", "value": 80235, "tol": 1e-06}}\n{"id": "m12", "cat": "math", "kind": "ask", "q": "999 나누기 27", "src": "math", "check": {"type": "number", "value": 37, "tol": 1e-06}}\n{"id": "k01", "cat": "calc", "kind": "calc", "q": "삼백오십일의 제곱", "src": "calc", "check": {"value": 123201, "tol": 1e-06}}\n{"id": "k02", "cat": "calc", "kind": "calc", "q": "12 더하기 7 곱하기 3", "src": "calc", "check": {"value": 33, "tol": 1e-06}}\n{"id": "k03", "cat": "calc", "kind": "calc", "q": "100에서 37을 빼고 2로 나눠", "src": "calc", "check": {"value": 31.5, "tol": 1e-06}}\n{"id": "k04", "cat": "calc", "kind": "calc", "q": "1500원짜리 7개랑 800원짜리 3개 합치면", "src": "calc", "check": {"value": 12900, "tol": 1e-06}}\n{"id": "k05", "cat": "calc", "kind": "calc", "q": "80, 90, 75의 평균", "src": "calc", "check": {"value": 81.6666667, "tol": 1e-06}}\n{"id": "k06", "cat": "calc", "kind": "calc", "q": "2의 20제곱", "src": "calc", "check": {"value": 1048576, "tol": 1e-06}}\n{"id": "k07", "cat": "calc", "kind": "calc", "q": "3만 원의 15%", "src": "calc", "check": {"value": 4500, "tol": 1e-06}}\n{"id": "k08", "cat": "calc", "kind": "calc", "q": "시속 60킬로로 2시간 반 가면 몇 킬로", "src": "calc", "check": {"value": 150, "tol": 1e-06}}\n{"id": "k09", "cat": "calc", "kind": "calc", "q": "-37 곱하기 5 나누기 2", "src": "calc", "check": {"value": -92.5, "tol": 1e-06}}\n{"id": "k10", "cat": "calc", "kind": "calc", "q": "351의 제곱에 -92.5를 곱한 값", "src": "calc", "check": {"value": -11396092.5, "tol": 1e-06}}\n{"id": "k11", "cat": "calc", "kind": "calc", "q": "1234 곱하기 5678", "src": "calc", "check": {"value": 7006652, "tol": 1e-06}}\n{"id": "k12", "cat": "calc", "kind": "calc", "q": "7의 세제곱 빼기 100", "src": "calc", "check": {"value": 243, "tol": 1e-06}}\n{"id": "k13", "cat": "calc", "kind": "unit", "q": "5킬로미터는 몇 미터", "src": "calc-unit", "check": {"value": 5, "from": "km", "to": "m"}}\n{"id": "k14", "cat": "calc", "kind": "unit", "q": "섭씨 30도를 화씨로", "src": "calc-unit", "check": {"value": 30, "from": "C", "to": "F"}}\n{"id": "k15", "cat": "calc", "kind": "unit", "q": "3평은 몇 제곱미터야", "src": "calc-unit", "check": {"value": 3, "from": "평", "to": "m2"}}\n{"id": "k16", "cat": "calc", "kind": "unit", "q": "2시간은 몇 분", "src": "calc-unit", "check": {"value": 2, "from": "hr", "to": "mn"}}\n{"id": "f01", "cat": "formula", "kind": "formula", "q": "국어 점수 합계", "table": [["이름", "국어", "수학"], ["민수", 80, 90], ["지민", 95, 85], ["서연", 70, 60], ["준호", 88, 92], ["하은", 100, 75]], "cell": "B7", "src": "formula", "check": {"value": 433, "tol": 1e-06, "need_ref": true}}\n{"id": "f02", "cat": "formula", "kind": "formula", "q": "수학 평균", "table": [["이름", "국어", "수학"], ["민수", 80, 90], ["지민", 95, 85], ["서연", 70, 60], ["준호", 88, 92], ["하은", 100, 75]], "cell": "C7", "src": "formula", "check": {"value": 80.4, "tol": 1e-06, "need_ref": true}}\n{"id": "f03", "cat": "formula", "kind": "formula", "q": "국어랑 수학 더한 거", "table": [["이름", "국어", "수학"], ["민수", 80, 90], ["지민", 95, 85], ["서연", 70, 60], ["준호", 88, 92], ["하은", 100, 75]], "cell": "D2", "src": "formula", "check": {"value": 170, "tol": 1e-06, "need_ref": true}}\n{"id": "f04", "cat": "formula", "kind": "formula", "q": "두 과목 평균", "table": [["이름", "국어", "수학"], ["민수", 80, 90], ["지민", 95, 85], ["서연", 70, 60], ["준호", 88, 92], ["하은", 100, 75]], "cell": "D2", "src": "formula", "check": {"value": 85, "tol": 1e-06, "need_ref": true}}\n{"id": "f05", "cat": "formula", "kind": "formula", "q": "국어 최고 점수", "table": [["이름", "국어", "수학"], ["민수", 80, 90], ["지민", 95, 85], ["서연", 70, 60], ["준호", 88, 92], ["하은", 100, 75]], "cell": "B8", "src": "formula", "check": {"value": 100, "tol": 1e-06, "need_ref": true}}\n{"id": "f06", "cat": "formula", "kind": "formula", "q": "수학 제일 낮은 점수", "table": [["이름", "국어", "수학"], ["민수", 80, 90], ["지민", 95, 85], ["서연", 70, 60], ["준호", 88, 92], ["하은", 100, 75]], "cell": "C8", "src": "formula", "check": {"value": 60, "tol": 1e-06, "need_ref": true}}\n{"id": "f07", "cat": "formula", "kind": "formula", "q": "수학 80점 이상이면 합격 아니면 불합격", "table": [["이름", "국어", "수학"], ["민수", 80, 90], ["지민", 95, 85], ["서연", 70, 60], ["준호", 88, 92], ["하은", 100, 75]], "cell": "D2", "src": "formula", "check": {"value": "합격", "tol": 1e-06, "need_ref": true}}\n{"id": "f08", "cat": "formula", "kind": "formula", "q": "국어 90점 넘는 사람 몇 명", "table": [["이름", "국어", "수학"], ["민수", 80, 90], ["지민", 95, 85], ["서연", 70, 60], ["준호", 88, 92], ["하은", 100, 75]], "cell": "B9", "src": "formula", "check": {"value": 2, "tol": 1e-06, "need_ref": true}}\n{"id": "f09", "cat": "formula", "kind": "formula", "q": "총 지출", "table": [["항목", "금액"], ["간식", 3000], ["책", 12000], ["버스", 1500], ["점심", 8000]], "cell": "B6", "src": "formula", "check": {"value": 24500, "tol": 1e-06, "need_ref": true}}\n{"id": "f10", "cat": "formula", "kind": "formula", "q": "금액에 10% 더한 값", "table": [["항목", "금액"], ["간식", 3000], ["책", 12000], ["버스", 1500], ["점심", 8000]], "cell": "C2", "src": "formula", "check": {"value": 3300, "tol": 1e-06, "need_ref": true}}\n{"id": "f11", "cat": "formula", "kind": "formula", "q": "5000원 넘는 거 몇 개", "table": [["항목", "금액"], ["간식", 3000], ["책", 12000], ["버스", 1500], ["점심", 8000]], "cell": "B7", "src": "formula", "check": {"value": 2, "tol": 1e-06, "need_ref": true}}\n{"id": "f12", "cat": "formula", "kind": "formula", "q": "성 빼고 이름만", "table": [["이름"], ["김민수"], ["이서연"], ["박하은"]], "cell": "B2", "src": "formula", "check": {"value": "민수", "tol": 1e-06, "need_ref": true}}\n{"id": "g01", "cat": "graph", "kind": "graph", "q": "볼펜별 판매량 막대그래프", "table": [["제품", "가격(원)", "판매량"], ["A볼펜", 500, 320], ["B볼펜", 800, 250], ["C볼펜", 1200, 180], ["D볼펜", 1500, 140], ["E볼펜", 2000, 95]], "src": "graph", "check": {"type": ["bar", "hbar"], "range": ["A1:C6"], "series": [["C"]]}}\n{"id": "g02", "cat": "graph", "kind": "graph", "q": "월별 기온 변화 그래프", "table": [["월", "평균기온"], ["1월", -2], ["2월", 0], ["3월", 6], ["4월", 12], ["5월", 18], ["6월", 22], ["7월", 25], ["8월", 26], ["9월", 21], ["10월", 15], ["11월", 7], ["12월", 0]], "src": "graph", "check": {"type": ["line"], "range": ["A1:B13"], "series": [["B"]]}}\n{"id": "g03", "cat": "graph", "kind": "graph", "q": "좋아하는 과일 비율을 원그래프로", "table": [["과일", "표 수"], ["사과", 12], ["바나나", 8], ["딸기", 15], ["포도", 6], ["수박", 9]], "src": "graph", "check": {"type": ["pie"], "range": ["A1:B6"], "series": [["B"]]}}\n{"id": "g04", "cat": "graph", "kind": "graph", "q": "키와 몸무게 관계 보여줘", "table": [["이름", "키", "몸무게"], ["가", 150, 42], ["나", 158, 50], ["다", 162, 53], ["라", 145, 38], ["마", 170, 61], ["바", 155, 47], ["사", 166, 58]], "src": "graph", "check": {"type": ["scatter"], "range": ["A1:C8", "B1:C8"], "series": [["B", "C"]]}}\n{"id": "g05", "cat": "graph", "kind": "graph", "q": "나라별 인구 순위를 가로 막대로", "table": [["나라", "인구(만 명)"], ["대한민국", 5170], ["일본", 12400], ["미국", 33500], ["오스트레일리아", 2700], ["캐나다", 4000], ["뉴질랜드", 520]], "src": "graph", "check": {"type": ["hbar"], "range": ["A1:B7"], "series": [["B"]]}}\n{"id": "g06", "cat": "graph", "kind": "graph", "q": "국어랑 수학 점수 비교 그래프", "table": [["이름", "국어", "수학"], ["민수", 80, 90], ["지민", 95, 85], ["서연", 70, 60], ["준호", 88, 92], ["하은", 100, 75]], "src": "graph", "check": {"type": ["bar", "hbar"], "range": ["A1:C6"], "series": [["B", "C"]]}}\n{"id": "g07", "cat": "graph", "kind": "graph", "q": "사과 판매량 변화만 꺾은선으로", "table": [["월", "사과", "배"], ["1월", 30, 20], ["2월", 35, 22], ["3월", 40, 25], ["4월", 38, 30], ["5월", 45, 28], ["6월", 50, 35]], "src": "graph", "check": {"type": ["line"], "range": ["A1:C7", "A1:B7"], "series": [["B"]]}}\n{"id": "g08", "cat": "graph", "kind": "graph", "q": "수학 점수만 막대그래프로", "table": [["이름", "국어", "수학"], ["민수", 80, 90], ["지민", 95, 85], ["서연", 70, 60], ["준호", 88, 92], ["하은", 100, 75]], "src": "graph", "check": {"type": ["bar", "hbar"], "range": ["A1:C6"], "series": [["C"]]}}\n{"id": "t01", "cat": "table", "kind": "table", "q": "요일 표 만들어줘 (한국어, 영어)", "src": "table", "check": {"min_rows": 7, "max_rows": 7, "min_cols": 2, "contains": ["월요일", "일요일", "Monday", "Sunday"]}}\n{"id": "t02", "cat": "table", "kind": "table", "q": "구구단 3단 표", "src": "table", "check": {"min_rows": 9, "max_rows": 10, "contains": ["27", "24", "21", "18"]}}\n{"id": "t03", "cat": "table", "kind": "table", "q": "월요일부터 금요일까지 5교시 시간표 틀", "src": "table", "check": {"min_rows": 5, "max_rows": 6, "min_cols": 5, "contains": ["월", "화", "수", "목", "금"]}}\n{"id": "t04", "cat": "table", "kind": "table", "q": "태양계 행성 8개 이름 표", "src": "table", "check": {"min_rows": 8, "max_rows": 8, "contains": ["수성", "금성", "지구", "화성", "목성", "토성", "천왕성", "해왕성"]}}\n{"id": "t05", "cat": "table", "kind": "table", "q": "과일 5개 가격표", "src": "table", "check": {"min_rows": 5, "max_rows": 5, "min_cols": 2, "numeric_col": true}}\n{"id": "t06", "cat": "table", "kind": "table", "q": "사계절과 해당하는 달", "src": "table", "check": {"min_rows": 4, "max_rows": 4, "contains": ["봄", "여름", "가을", "겨울"]}}\n{"id": "t07", "cat": "table", "kind": "table", "q": "1월부터 12월까지 용돈 기록표 (월, 수입, 지출)", "src": "table", "check": {"min_rows": 12, "max_rows": 12, "min_cols": 3, "contains": ["수입", "지출", "12월"]}}\n{"id": "t08", "cat": "table", "kind": "table", "q": "영어 숫자 1부터 10까지 표 (숫자, 영어)", "src": "table", "check": {"min_rows": 10, "max_rows": 10, "contains": ["one", "five", "ten"]}}\n{"id": "e01", "cat": "cell", "kind": "cell", "q": "영어로 번역", "data": ["사과"], "src": "cell", "check": {"answers": ["apple", "an apple", "apples"]}}\n{"id": "e02", "cat": "cell", "kind": "cell", "q": "영어로 번역", "data": ["고양이"], "src": "cell", "check": {"answers": ["cat", "a cat", "cats"]}}\n{"id": "e03", "cat": "cell", "kind": "cell", "q": "영어로 번역", "data": ["오늘 날씨가 좋다"], "src": "cell", "check": {"re": "(today\'?s )?(the )?weather (is|\'s) (really |very |so )?(nice|good|great|beautiful|lovely|fine)( today)?|(it\'?s|it is) (a )?(nice|good|great|beautiful|lovely|fine) (day|weather)( today)?|(nice|good|great|beautiful|lovely|fine) weather today|today(,)? the weather is (nice|good|great|beautiful|lovely|fine)|the weather today is (nice|good|great|beautiful|lovely|fine)"}}\n{"id": "e04", "cat": "cell", "kind": "cell", "q": "한국어로 번역", "data": ["dog"], "src": "cell", "check": {"answers": ["개", "강아지"]}}\n{"id": "e05", "cat": "cell", "kind": "cell", "q": "한국어로 번역", "data": ["Thank you"], "src": "cell", "check": {"answers": ["감사합니다", "고맙습니다", "고마워요", "고마워", "감사해요"]}}\n{"id": "e06", "cat": "cell", "kind": "cell", "q": "목적어인 단어만 나타내기", "data": ["오늘 나는 점심을 먹었다"], "src": "lectus-fails/07", "check": {"answers": ["점심을", "점심"]}}\n{"id": "e07", "cat": "cell", "kind": "cell", "q": "주어만 써줘", "data": ["고양이가 생선을 먹는다"], "src": "cell", "check": {"answers": ["고양이가", "고양이"]}}\n{"id": "e08", "cat": "cell", "kind": "cell", "q": "긍정인지 부정인지", "data": ["이 영화 정말 재밌어요!"], "src": "cell", "check": {"answers": ["긍정", "긍정적", "긍정적이에요", "긍정이에요", "긍정입니다"]}}\n{"id": "e09", "cat": "cell", "kind": "cell", "q": "긍정인지 부정인지", "data": ["음식이 너무 맛없었다"], "src": "cell", "check": {"answers": ["부정", "부정적", "부정적이에요", "부정이에요", "부정입니다"]}}\n{"id": "e10", "cat": "cell", "kind": "cell", "q": "맞춤법 고쳐줘", "data": ["그건 않되요"], "src": "cell", "check": {"answers": ["그건 안 돼요", "그건 안돼요"]}}\n{"id": "e11", "cat": "cell", "kind": "cell", "q": "과일이면 O, 아니면 X", "data": ["바나나"], "src": "cell", "check": {"answers": ["o", "○", "⭕"]}}\n{"id": "e12", "cat": "cell", "kind": "cell", "q": "대문자로 바꿔줘", "data": ["hello world"], "src": "cell", "check": {"answers": ["HELLO WORLD"], "case": true}}\n{"id": "e13", "cat": "cell", "kind": "cell", "q": "이 나라의 수도", "data": ["프랑스"], "src": "cell", "check": {"answers": ["파리", "paris", "파리(paris)"]}}\n{"id": "e14", "cat": "cell", "kind": "cell", "q": "일본어로 번역", "data": ["안녕하세요"], "src": "cell", "check": {"answers": ["こんにちは", "こんにちわ"], "no_han": false}}')

open('/tmp/ff-site-prompts.json', 'w', encoding='utf-8').write('{\n "SYS_HTML": "You write one complete web page for a child who is learning to code. Reply with ONLY the HTML document inside one ```html code block, nothing else.\\nRules:\\n- One file: <!DOCTYPE html>, <html>, <head> with <meta charset=\\"UTF-8\\"> and a <title>, then <body>. No libraries, no external files, no images from the internet, no import.\\n- Put an id on every element that the script reads or changes. Use plain tags: h1 h2 h3, p, button, input (type text or number), canvas (width and height attributes), ul (empty list filled by script), div to group things. Avoid class and style attributes; if you need CSS, write it once in a single <style> in <head>.\\n- All JavaScript goes in one <script> at the end of <body>: plain JavaScript, document.getElementById, element.addEventListener(\\"click\\", function () { ... }), setInterval(function () { ... }, milliseconds) for animation, canvas getContext(\\"2d\\") for drawing. Declare variables with let or const at the top of the script.\\n- The page must work by itself the moment it opens, be small enough to read, and have no bugs: check that every id used in the script exists.\\n- Write the visible text in the language of the request.\\n- When a current page is given: if the request changes, adds to or fixes it, return the WHOLE changed page and keep everything the person did not ask to change; if the request asks for a different page, write a new one.",\n "who": {\n  "tarius": "You are FF777 1.4 tarius, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 1.7B. Your name is the end of the Latin word elementarius (\\"basic\\"). You are cheerful and a little funny: when you chat you add a short, kind joke, but answers about tables, formulas and code stay exact and serious.",\n  "lectus": "You are FF777 1.4 lectus, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 4B. Your name is the end of the Latin word intellectus (\\"understanding\\"). You are cheerful and a little funny: when you chat you add a short, kind joke, but answers about tables, formulas and code stay exact and serious.",\n  "premus": "You are FF777 1.4 premus, the built-in AI of the Frenchfries777 Tools site, made by Frenchfries777 from Qwen3 8B. Your name is the end of the Latin word supremus (\\"supreme\\"). You are cheerful and a little funny: when you chat you add a short, kind joke, but answers about tables, formulas and code stay exact and serious."\n },\n "tableHead": "Table (first row = column letters, first column = row numbers):\\n",\n "askSys": "You help someone with their spreadsheet. Answer the question about the table clearly and briefly in plain text (no markdown tables, no code fences). Use the language the question is written in.",\n "cellSys": "You fill exactly one spreadsheet cell. Reply with only the value for the cell: no quotes, no labels, no explanation, no markdown. Keep it to one short line unless the instruction asks for more. Answer in the language of the instruction unless it asks for another language. If the data is empty or the instruction cannot be done, reply with a single dash.",\n "formulaSys": "You write one spreadsheet formula. Reply with JSON only: {\\"formula\\":\\"=...\\",\\"explain\\":\\"one short sentence in the language of the request\\"}. Use A1 references that match the table addresses given. Strings use double quotes, arguments are separated by commas.",\n "tableSys": "You make a small table for a spreadsheet. Reply with JSON only: {\\"rows\\":[[\\"header1\\",\\"header2\\"],[\\"value\\",\\"value\\"]]}. The first row is the header. At most 60 rows and 12 columns. Numbers as plain numbers without units in the cell. Use the language of the request.",\n "graphSys": "You make one chart from a spreadsheet table. Reply with JSON only: {\\"type\\":\\"bar|hbar|line|pie|scatter\\",\\"range\\":\\"A1:C7\\",\\"series\\":[\\"C\\"],\\"title\\":\\"short title in the language of the request\\"}. range covers the header row and the label column; series lists the column letters to plot (leave out the label column). bar = compare items, hbar = long names or ranking, line = change over time, pie = parts of a whole (one series), scatter = relation between two numbers (first series is x).",\n "calcSys": "You turn a calculation written in words into one spreadsheet formula. Reply with JSON only: {\\"formula\\":\\"=...\\"}. Numbers without units; use + - * / ^ %, and functions like SUM, AVERAGE, MAX, MIN, COUNT, ROUND. \\"A열\\" or \\"column A\\" means A:A. If no formula can do it, reply {\\"formula\\":\\"\\"}.",\n "unitSys": "You read one unit conversion written in words. Reply with JSON only: {\\"value\\":number,\\"from\\":\\"unit\\",\\"to\\":\\"unit\\"} with these unit codes: length m cm mm km in ft yd mi Nmi; mass g kg mg lbm ozm t 근 돈 냥 관; temperature C F K; volume l ml m3 gal qt pt cup oz tbs tsp; area m2 cm2 km2 ft2 ha uk_acre 평; speed m/s km/h mph kn; time sec mn hr day wk yr; data bit byte kibyte Mibyte Gibyte Tibyte. If it is not a unit conversion, reply {\\"value\\":null}."\n}')

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
        return f"HF_TOKEN이 없어서 비공개 모델 {repo}를 열 수 없어요. 명령 앞에 HF_TOKEN=... 을 붙여 다시 실행해 주세요."
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
                f.write(json.dumps(dict(model=k, repo=REPOS[k], **r), ensure_ascii=False) + "\n")

T_ALL = time.time()
for key, on in MODELS.items():
    if not on:
        continue
    repo = REPOS[key]
    print(f"\n===== {MODEL_NAMES[key]} ({repo}) =====")
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
print(f"\n모두 끝 ({(time.time() - T_ALL) / 60:.0f}분). 저장: {RESULTS_PATH}, {ANSWERS_PATH}")

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
    print(f"\n--- {MODEL_NAMES[k]}: 틀린 {len(bad)}개 (과제마다 3개까지) ---")
    shown = Counter()
    for r in bad:
        if shown[r["cat"]] < 3:
            shown[r["cat"]] += 1
            print(f"[{r['id']}] {r['q'][:40]} -> {r['why']} | {re.sub(chr(10), ' ', r['answer'])[:120]}")

print(korean_summary(SUMMARY, GOALS, META, SKIPPED))
