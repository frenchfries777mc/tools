"""Sums up train/ff_joke.py answers: a riddle passes when the answer holds its own punchline (spaces and punctuation ignored).
A failing answer that holds another riddle's punchline is marked MIXED. Prints JSON lines of every fail. Usage: python train/ff_joke_sum.py <dir>"""
import glob, json, re, sys
rows = [json.loads(l) for p in glob.glob(sys.argv[1] + '/**/*.jsonl', recursive=True) for l in open(p, encoding='utf-8') if l.strip()]
anyrows = [r for r in rows if r['mode'].startswith('any-')]   # "any joke" requests: ok when the answer is one of the 115 riddles with its own punchline
rows = [r for r in rows if not r['mode'].startswith('any-')]
src = open('ai-chat/jokes.js', encoding='utf-8').read()
JOKES = json.loads(re.search(r'var J=(\[.*?\n\]);', src, re.S).group(1))
norm = lambda s: re.sub(r'[\s!?.,~\'"“”‘’()]+', '', s)
allA = {norm(r['a']): r['a'] for r in rows}
fails = []
for r in sorted(rows, key=lambda r: (r['i'], r['mode'])):
    n = norm(r['ans'])
    if norm(r['a']) in n: continue
    other = [a for k, a in allA.items() if k != norm(r['a']) and len(k) >= 2 and k in n]
    r['kind'] = 'MIXED' if other else 'WRONG'; r['other'] = other
    fails.append(r)
for m in ('train', 'chat'):
    t = sum(1 for r in rows if r['mode'] == m); b = sum(1 for r in fails if r['mode'] == m)
    print(f'SUMMARY {m}: {t-b}/{t} ok, {b} fail', flush=True)
def anyok(ans):
    n = re.sub(r'[\s!?.,~\'"“”‘’()]+', '', ans)
    return any(re.sub(r'[\s!?.,~\'"“”‘’()]+', '', q) in n and re.sub(r'[\s!?.,~\'"“”‘’()]+', '', a) in n.split(re.sub(r'[\s!?.,~\'"“”‘’()]+', '', q), 1)[-1] for q, a in JOKES)
for m in ('any-train', 'any-chat'):
    t = [r for r in anyrows if r['mode'] == m]
    if t:
        bad = [r for r in t if not anyok(r['ans'])]
        print(f'SUMMARY {m}: {len(t)-len(bad)}/{len(t)} ok (an existing riddle with its own punchline), {len(bad)} fail', flush=True)
        for r in bad: print('FAIL ' + json.dumps(r, ensure_ascii=False))
for r in fails: print('FAIL ' + json.dumps(r, ensure_ascii=False))
