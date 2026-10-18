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
    r"모르겠", r"모릅", r"몰라", r"잘 모르", r"모르는 (말|단어|표현|이름|낱말|용어)", r"처음 듣", r"처음 들어", r"처음 보", r"들어 ?본 적(이)? ?없", r"알 수 ?없", r"알 수가 없", r"확인할 수 ?없", r"확인이 어렵",
    r"찾을 수 ?없", r"정보가 없", r"정보를 찾", r"없는 (단어|말|표현)", r"(무슨|어떤) (뜻|의미|말)인지", r"무엇을 (말|뜻|의미)하는지",
    r"뭘 (말|뜻)하는지", r"뭔지 (잘|모르)", r"확실하지 않", r"명확하지 않", r"정확히 알지 못", r"익숙하지 않",
    r"not sure", r"don'?t know", r"do not know", r"unfamiliar", r"no information", r"not familiar",
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
MODEL_NAMES = {"qwen3-1.7b": "Qwen3 1.7B", "qwen3-4b": "Qwen3 4B", "tarius": "타리우스", "lectus": "렉투스"}


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
        reps = ", ".join(f"{MODEL_NAMES[m]} {summary[m]['repeats']}개" for m in ("tarius", "lectus") if m in summary)
        L.append("- 반복: 목표 0개" + (f" (지금 {reps})" if reps else ""))
    L += ["", "코드 채점: " + ("jsdom에서 실제로 열고 눌러 봄" if meta.get("html_check") == "jsdom" else "정적 검사만 (노드 없음, 다른 실행과 비교하지 마세요)"),
          "4비트: bitsandbytes nf4 (사이트는 MLC q4f16_1이라 점수가 아주 조금 다를 수 있어요)"]
    return "\n".join(L)
