"""Tests for the FF777 baseline test (no GPU). Run: python3 -m unittest train/eval/test_ffeval.py
Page checks run in jsdom when FF_NODE_PATH (or NODE_PATH) points at a node_modules folder with jsdom; else they are skipped."""
import json, os, subprocess, sys, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, "train"))
import ffeval as F  # noqa: E402

TEST = F.load_test(os.path.join(HERE, "baseline-v1.jsonl"))
NODE_PATH = os.environ.get("FF_NODE_PATH") or os.environ.get("NODE_PATH") or ""
HAVE_JSDOM = bool(NODE_PATH) and os.path.isdir(os.path.join(NODE_PATH, "jsdom"))
RUNNER = os.path.join(HERE, "html_run.js")


def site():
    import make_kaggle_eval
    return make_kaggle_eval.site_prompts()


S = site()


def run(item, answer):
    h = F.extract_html(F.clean_answer(answer)) if item["kind"] == "html" else None
    r = F.run_html(h, item["check"].get("run", []), runner=RUNNER) if (h and HAVE_JSDOM) else None
    return F.grade(item, answer, True, r)


class TestSet(unittest.TestCase):
    def test_shape(self):
        ids = [t["id"] for t in TEST]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertTrue(120 <= len(TEST) <= 150, len(TEST))
        for t in TEST:
            self.assertIn(t["cat"], F.CAT_NAMES, t["id"])
            self.assertIn(t["kind"], ("html", "ask", "cell", "formula", "graph", "table", "calc", "unit"), t["id"])
            self.assertTrue(t["q"].strip() and t.get("ref"), t["id"])
            F.build_prompt(t, S)

    def test_every_good_answer_passes(self):
        for t in TEST:
            s, why, info = run(t, t["ref"])
            self.assertEqual(s, 1, f"{t['id']} good answer failed: {why}")

    def test_pages_without_node(self):
        """Without node only static checks run: good pages still pass, the broken one does not."""
        for t in TEST:
            if t["kind"] == "html":
                self.assertEqual(F.grade(t, t["ref"], True, None)[0], 1, t["id"])
                self.assertEqual(F.grade(t, t["bad"], True, None)[0], 0, t["id"])

    def test_every_bad_answer_fails(self):
        for t in TEST:
            if t.get("bad"):
                s, why, info = run(t, t["bad"])
                self.assertEqual(s, 0, f"{t['id']} bad answer passed: {t['bad'][:60]}")

    def test_empty_and_looping_answers_fail(self):
        loop = "좋아요, 그리고 블록으로 블록 만들기, " * 30
        for t in TEST:
            self.assertEqual(F.grade(t, "", True)[0], 0, t["id"])
            if t["kind"] != "html":
                s, why, info = F.grade(t, loop, True)
                self.assertEqual(s, 0, t["id"])

    def test_prompts_match_the_site(self):
        """build_prompt must give exactly what ai-prompts.js builds (FFP functions run in node)."""
        js = r"""
const P = require(process.argv[1] + '/ai-prompts.js');
const items = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const tt = rows => { const w = Math.max(...rows.map(r => r.length)); const col = c => { let s = ''; c++; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; };
  return ['\t' + Array.from({length: w}, (_, j) => col(j)).join('\t')].concat(rows.map((r, i) => [i + 1].concat(Array.from({length: w}, (_, j) => r[j] == null ? '' : String(r[j]))).join('\t'))).join('\n'); };
const out = items.map(it => { const t = it.table ? tt(it.table) : null;
  switch (it.kind) {
    case 'ask': return [P.askSys, P.askPrompt(t, it.q)];
    case 'cell': return [P.cellSys, P.cellPrompt(it.q, it.data)];
    case 'formula': return [P.formulaSys, P.formulaPrompt(t, it.cell, it.q)];
    case 'graph': return [P.graphSys, P.graphPrompt(t, it.q)];
    case 'table': return [P.tableSys, P.tablePrompt(it.q)];
    case 'calc': return [P.calcSys, P.calcPrompt(it.cols, it.q)];
    case 'unit': return [P.unitSys, P.unitPrompt(it.q)];
    case 'html': return [null, 'Request: ' + it.q];   // buildHTMLPrompt(q) for a new page
  } });
process.stdout.write(JSON.stringify(out));
"""
        out = json.loads(subprocess.run(["node", "-e", js, ROOT], input=json.dumps(TEST), capture_output=True, text=True, check=True).stdout)
        for t, (sys_, user) in zip(TEST, out):
            ps, pu = F.build_prompt(t, S)
            self.assertEqual(pu, user, t["id"])
            if sys_ is not None:
                self.assertEqual(ps, sys_, t["id"])
        self.assertIn("```html", S["SYS_HTML"])
        # identity only for our models, appended like withFacts() in ai.js
        ask = next(t for t in TEST if t["kind"] == "ask")
        self.assertEqual(F.build_prompt(ask, S, S["who"]["lectus"])[0], S["askSys"] + "\n\n" + S["who"]["lectus"])
        self.assertIn("lectus", S["who"]["lectus"])
        self.assertIn("tarius", S["who"]["tarius"])


class TestRepeat(unittest.TestCase):
    def test_owner_loop(self):
        t = "표 정리, 수식 만들기, … 블록으로 게임 만들기, 블록으로 웹 만들기, 블록으로 블록 만들기, 블록으로 블록 만들기, 블록으로 블록 만들기"
        self.assertTrue(F.find_repeat(t))
        item = next(x for x in TEST if x["id"] == "s01")
        s, why, info = F.grade(item, t, True)
        self.assertEqual(s, 0)
        self.assertTrue(info["repeat"])

    def test_two_times_is_fine(self):
        self.assertIsNone(F.find_repeat("블록으로 블록 만들기, 블록으로 블록 만들기, 그리고 끝이에요."))

    def test_normal_text(self):
        self.assertIsNone(F.find_repeat("1. 계획을 세워요.\n2. 매일 조금씩 해요.\n3. 쉬는 시간도 가져요.\n4. 모르는 건 물어봐요."))
        self.assertIsNone(F.find_repeat("ㅎㅎ 좋아요! ---------- ====== ...... !!!!!!"))

    def test_spaces_do_not_hide_a_loop(self):
        self.assertTrue(F.find_repeat("같은 말이에요.\n\n같은 말이에요.\n같은 말이에요.\n"))

    def test_long_piece(self):
        piece = "이것은 꽤 긴 문장이고 계속해서 똑같이 되풀이되는 부분이에요. "
        self.assertTrue(F.find_repeat("시작 " + piece * 3 + " 끝"))

    def test_code_counts_only_unfinished(self):
        item = next(x for x in TEST if x["id"] == "c02")
        good = item["ref"].replace("<button id=\"reset\">초기화</button>", "<p>안녕하세요 반가워요</p>" * 4 + "<button id=\"reset\">초기화</button>")
        s, why, info = F.grade(item, good, True, None)
        self.assertEqual(s, 1, why)
        cut = "```html\n<!DOCTYPE html>\n<html><body>\n" + "  ctx.fillRect(x, y, 10, 10); x += 1; y += 1;\n" * 40
        s, why, info = F.grade(item, cut, False, None)
        self.assertEqual(s, 0)
        self.assertTrue(info["repeat"])

    def test_han(self):
        item = next(x for x in TEST if x["id"] == "w01")
        self.assertEqual(F.grade(item, "알파벳은 글자예요 这个问题", True)[0], 0)
        jp = next(x for x in TEST if x["id"] == "e14")
        self.assertEqual(F.grade(jp, "こんにちは", True)[0], 1)


class TestGraders(unittest.TestCase):
    def item(self, i):
        return next(x for x in TEST if x["id"] == i)

    def test_unknown(self):
        u = self.item("u01")
        self.assertEqual(F.grade(u, "잘 모르는 말이에요. 무슨 뜻인지 알려 주세요.", True)[0], 1)
        self.assertEqual(F.grade(u, "에엑따는 기쁠 때 쓰는 감탄사예요. 더 궁금한 게 있으면 알려 주세요!", True)[0], 0)
        self.assertEqual(F.grade(u, "에엑따는 감탄사예요. 모르는 게 있으면 물어보세요.", True)[0], 0)

    def test_known_or_ask(self):
        w = self.item("w02")
        self.assertEqual(F.grade(w, "T1은 리그 오브 레전드 팀이에요.", True)[0], 1)
        self.assertEqual(F.grade(w, "티원이 무엇을 말하는지 잘 모르겠어요. 조금 더 알려 주세요.", True)[0], 1)

    def test_unfinished_prose_fails(self):
        self.assertEqual(F.grade(self.item("l01"), "1. 계획을 세워요. 2. 매일 조금씩", False)[0], 0)

    def test_numbers(self):
        m = self.item("m05")
        self.assertEqual(F.grade(m, "y = -11,396,092.5 입니다.", True)[0], 1)
        self.assertEqual(F.grade(m, "y = −11396092.5", True)[0], 1)
        self.assertEqual(F.grade(m, "y는 수식 =-92.5*351^2 로 구해요.", True)[0], 1)
        self.assertEqual(F.grade(m, "y = -925x 이므로 y = -114, 251, 475", True)[0], 0)
        self.assertEqual(F.numbers_in("1,234.5와 -3, 그리고 7"), [1234.5, -3.0, 7.0])

    def test_hub_claim(self):
        s = self.item("s07")
        self.assertEqual(F.grade(s, "Frenchfries777이 만든 게임 사이트예요.", True)[0], 1)
        self.assertEqual(F.grade(s, "그 사이트는 제가 직접 만들었어요. 게임이 있어요.", True)[0], 0)

    def test_cell(self):
        self.assertEqual(F.grade(self.item("e01"), "Apple.", True)[0], 1)
        self.assertEqual(F.grade(self.item("e01"), "\"apple\"", True)[0], 1)
        self.assertEqual(F.grade(self.item("e01"), "Apple (사과)", True)[0], 0)
        self.assertEqual(F.grade(self.item("e03"), "The weather is nice today.", True)[0], 1)
        self.assertEqual(F.grade(self.item("e03"), "It's a beautiful day today!", True)[0], 1)
        self.assertEqual(F.grade(self.item("e12"), "hello world", True)[0], 0)

    def test_json_fences_and_noise(self):
        g = self.item("g01")
        self.assertEqual(F.grade(g, '```json\n{"type":"bar","range":"$A$1:$C$6","series":["c"],"title":"x"}\n```', True)[0], 1)
        self.assertEqual(F.grade(g, 'Here: {"type":"hbar","range":"A1:C6","series":["C"]} done', True)[0], 1)
        self.assertEqual(F.grade(g, '{"type":"bar","range":"A1:B6","series":["C"]}', True)[0], 0)
        self.assertEqual(F.grade(g, 'not json', True)[0], 0)

    def test_table(self):
        t = self.item("t01")
        ragged = {"rows": [["요일", "영어"], ["월요일"], ["화요일", "Tuesday"]]}
        self.assertEqual(F.grade(t, json.dumps(ragged, ensure_ascii=False), True)[0], 0)
        t5 = self.item("t05")
        text_prices = {"rows": [["과일", "가격"]] + [[f, "1000원"] for f in "사과 배 귤 감 밤".split()]}
        self.assertEqual(F.grade(t5, json.dumps(text_prices, ensure_ascii=False), True)[0], 0)

    def test_formula_needs_ref_and_right_value(self):
        f = self.item("f01")
        self.assertEqual(F.grade(f, '{"formula":"=433"}', True)[0], 0)
        self.assertEqual(F.grade(f, '{"formula":"SUM(B2:B6)"}', True)[0], 1)   # missing "=" is added, as the site does
        self.assertEqual(F.grade(f, '{"formula":"=B2+B3+B4+B5+B6"}', True)[0], 1)
        self.assertEqual(F.grade(f, '{"formula":"=SUM(B:B)"}', True)[0], 0)   # includes B7 itself: circular
        self.assertEqual(F.grade(self.item("f07"), '{"formula":"=IF(C2<80,\\"불합격\\",\\"합격\\")"}', True)[0], 1)
        self.assertEqual(F.grade(self.item("k07"), '{"formula":"=30000*0.15"}', True)[0], 1)
        self.assertEqual(F.grade(self.item("k01"), '{"formula":"=POWER(351,2)"}', True)[0], 1)
        self.assertEqual(F.grade(self.item("k05"), '{"formula":"=ROUND((80+90+75)/3,2)"}', True)[0], 0)   # 81.67 is not 81.666…

    def test_unit(self):
        u = self.item("k14")
        self.assertEqual(F.grade(u, '{"value":30,"from":"C","to":"F"}', True)[0], 1)
        self.assertEqual(F.grade(u, '{"value":"30","from":"C","to":"F"}', True)[0], 0)


class TestFormula(unittest.TestCase):
    ROWS = [["이름", "점수", "반"], ["민수", 72, 1], ["지현", 95, 2], ["Tom", 58, 1], ["유나", 88, 2]]

    def test_basics(self):
        e = lambda f: F.eval_formula(f, self.ROWS, "E1")
        self.assertEqual(e("=1+2*3"), 7)
        self.assertEqual(e("=-2^2"), 4)        # spreadsheet: negation first
        self.assertEqual(e("=2^3^2"), 64)      # left to right
        self.assertEqual(e("=50%*10"), 5)
        self.assertEqual(e("=SUM(B2:B5)"), 313)
        self.assertEqual(e("=sum(b2:b5)"), 313)
        self.assertEqual(e("=AVERAGE(B2:B5)"), 78.25)
        self.assertEqual(e('=COUNTIF(C2:C5,1)'), 2)
        self.assertEqual(e('=SUMIF(C2:C5,2,B2:B5)'), 183)
        self.assertEqual(e('=COUNTIF(A2:A5,"tom")'), 1)
        self.assertEqual(e('=IF(B2>=70,"통과","다시")'), "통과")
        self.assertEqual(e('=A2&"님"'), "민수님")
        self.assertEqual(e("=ROUND(2.5,0)"), 3)
        self.assertEqual(e("=ROUND(-2.5,0)"), -3)
        self.assertEqual(e("=ROUND(1234.5678,-2)"), 1200)
        self.assertEqual(e("=MAX(B:B)"), 95)
        self.assertEqual(e("=LEN(A3)+0"), 2)
        for bad in ("=SUM(B2:B5", "=FOO(1)", "=1/0", "=B2:B5", "1+1", "=SUM(B2:B5))"):
            with self.assertRaises(F.FormulaError, msg=bad):
                e(bad)

    def test_same_as_fry_sheet_engine(self):
        """Every reference formula of the test (and a few variants) gives the same value in sheet/engine.js."""
        cases = []
        for t in TEST:
            if t["kind"] in ("formula", "calc"):
                cases.append((t.get("table") or [], t.get("cell") or "Z99", json.loads(t["ref"])["formula"]))
        rows = self.ROWS
        for f in ("=SUM(B2:B5)/COUNT(B2:B5)", '=COUNTIF(B2:B5,">=72")', "=ROUND(B3/7,2)", '=IF(AND(B2>60,C2=1),"a","b")', "=MOD(-7,3)", "=INT(-2.5)"):
            cases.append((rows, "E1", f))
        js = r"""
const E = require(process.argv[1] + '/sheet/engine.js');
const cases = JSON.parse(require('fs').readFileSync(0, 'utf8'));
process.stdout.write(JSON.stringify(cases.map(([rows, here, f]) => {
  const cells = {};
  rows.forEach((r, i) => r.forEach((v, j) => { cells[E.K(i, j)] = {v: String(v)}; }));
  const p = E.parseAddr(here); cells[E.K(p.r, p.c)] = {v: f};
  const v = new E.Engine({sheets: [{name: 'S', cells}]}).value(0, p.r, p.c);
  return typeof v === 'number' ? v : String(v);
})));
"""
        got = json.loads(subprocess.run(["node", "-e", js, ROOT], input=json.dumps(cases, ensure_ascii=False), capture_output=True, text=True, check=True).stdout)
        for (rows, here, f), want in zip(cases, got):
            mine = F.eval_formula(f, rows, here)
            if isinstance(want, (int, float)):
                self.assertTrue(F.close(mine, want, 1e-9), f"{f}: {mine} vs engine {want}")
            else:
                self.assertEqual(F._s(mine), want, f)


class TestGoalsAndReport(unittest.TestCase):
    def test_goals_times(self):
        s = {"qwen3-4b": {"score": 20.0}, "tarius": {"score": 21.0}, "lectus": {"score": 60.0}}
        g = F.goals(s)
        self.assertEqual(g["tarius_target"], 20.0)
        self.assertEqual(g["lectus_target"], 70.0)
        self.assertTrue(g["tarius"]["pass"])
        self.assertFalse(g["lectus"]["pass"])
        self.assertEqual(g["lectus"]["gap"], -10.0)

    def test_goals_errors_rule(self):
        g = F.goals({"qwen3-4b": {"score": 40.0}, "lectus": {"score": 85.0}})
        self.assertEqual(g["lectus_target"], round(100 - 60 / 3.5, 1))   # 82.9: wrong answers 60% -> 17.1%
        self.assertTrue(g["lectus_rule"].startswith("틀린"))
        self.assertTrue(g["lectus"]["pass"])
        self.assertIn("note", F.goals({"tarius": {"score": 1}}))

    def test_summary_and_text(self):
        rows = {"qwen3-4b": [{"id": t["id"], "cat": t["cat"], "score": 1 if i % 3 == 0 else 0, "repeat": "x" if i == 1 else None, "han": False}
                             for i, t in enumerate(TEST)],
                "lectus": [{"id": t["id"], "cat": t["cat"], "score": 1 if i % 2 == 0 else 0, "repeat": None, "han": i == 5}
                           for i, t in enumerate(TEST)]}
        s = F.summarize(rows, TEST)
        self.assertEqual(s["qwen3-4b"]["n"], len(TEST))
        self.assertEqual(s["qwen3-4b"]["repeats"], 1)
        self.assertEqual(s["lectus"]["han"], 1)
        self.assertEqual(set(s["lectus"]["by_cat"]), set(F.CAT_NAMES))
        table = F.cat_rows(s, TEST)
        self.assertEqual(table[-3]["과제"], "전체 점수")
        txt = F.korean_summary(s, F.goals(s), {"n_items": len(TEST), "html_check": "jsdom", "date": "2026-10-18"}, {"tarius": "토큰 없음"})
        self.assertIn("렉투스 목표", txt)
        self.assertIn("타리우스: 시험 못 함", txt)
        self.assertEqual(len(F.quick_subset(TEST, 2)), 2 * len(F.CAT_NAMES))


class TestNotebook(unittest.TestCase):
    def test_regenerates_identically(self):
        import make_kaggle_eval
        nb = make_kaggle_eval.build()
        text = json.dumps(nb, ensure_ascii=False, indent=1) + "\n"
        with open(os.path.join(ROOT, "train", "kaggle-eval.ipynb"), encoding="utf-8") as f:
            self.assertEqual(f.read(), text, "run python3 train/make_kaggle_eval.py")

    def test_cells_compile_and_carry_the_files(self):
        with open(os.path.join(ROOT, "train", "kaggle-eval.ipynb"), encoding="utf-8") as f:
            nb = json.load(f)
        srcs = ["".join(c["source"]) for c in nb["cells"] if c["cell_type"] == "code"]
        with open(os.path.join(HERE, "ffeval.py"), encoding="utf-8") as f:
            ffe = f.read().strip("\n")
        self.assertIn(ffe, srcs)
        for s in srcs:
            if s.startswith("%%writefile") or s.startswith("%%capture"):
                continue
            compile("\n".join(l for l in s.splitlines() if not l.lstrip().startswith(("!", "%"))), "cell", "exec")
        for s in srcs:
            self.assertNotRegex(s, r"hf_[A-Za-z0-9]{20,}")   # never a token in the notebook
        test_cell = next(s for s in srcs if s.startswith("%%writefile /tmp/ff-baseline-v1.jsonl"))
        self.assertEqual(len(test_cell.splitlines()) - 1, len(TEST))


@unittest.skipUnless(HAVE_JSDOM, "jsdom not found (set FF_NODE_PATH)")
class TestPages(unittest.TestCase):
    def test_runner_catches_errors(self):
        page = '<!DOCTYPE html><html><body><button id="b">go</button><script>document.getElementById("b").onclick=function(){ undefinedFn(); };</script></body></html>'
        r = F.run_html(page, [{"do": ["click_n:1"], "want": "none"}], runner=RUNNER)
        self.assertFalse(r["checks"][0]["ok"])
        r = F.run_html(page.replace("undefinedFn();", "let x = ;"), [], runner=RUNNER)
        self.assertTrue(r["syntax"])

    def test_infinite_loop_times_out(self):
        page = '<!DOCTYPE html><html><body><p>x</p><script>while(true){}</script></body></html>'
        r = F.run_html(page, [], runner=RUNNER, timeout=5)
        self.assertIn("crash", r)

    def test_static_page_is_not_moving(self):
        item = next(x for x in TEST if x["id"] == "c22")
        still = item["ref"].replace("setInterval(function () { x = (x + 4) % 300;", "(function () { x = 4;").replace("}, 40);", "})();")
        self.assertEqual(run(item, still)[0], 0)


if __name__ == "__main__":
    unittest.main()
