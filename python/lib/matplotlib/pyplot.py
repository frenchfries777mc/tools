"""Fry Python pyplot: plot, scatter, bar, barh, hist, pie, title, labels, legend, grid, limits and show.
It is a small copy of matplotlib.pyplot made for the page: show() draws the graph under the output."""
import json as _json
import _fry

_C = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
_SHORT = {'b': '#1f77b4', 'g': '#2ca02c', 'r': '#d62728', 'c': '#17becf', 'm': '#e377c2', 'y': '#bcbd22', 'k': '#000000', 'w': '#ffffff'}
_fig = None


def _new(w=6.4, h=4.8):
    return {'w': w, 'h': h, 'series': [], 'title': '', 'xlabel': '', 'ylabel': '', 'legend': False, 'grid': False,
            'xlim': None, 'ylim': None, 'xticks': None, 'yticks': None, 'lines': [], 'n': 0}


def _f():
    global _fig
    if _fig is None:
        _fig = _new()
    return _fig


def _nums(v):
    if hasattr(v, 'tolist'):
        v = v.tolist()
    if isinstance(v, (int, float)):
        return [float(v)]
    out = []
    for x in v:
        if hasattr(x, 'item'):
            x = x.item()
        out.append(float(x))
    return out


def _labels(v):
    if hasattr(v, 'tolist'):
        v = v.tolist()
    return list(v)


def _color(c, f):
    if c is None:
        c = _C[f['n'] % len(_C)]
        f['n'] += 1
        return c
    if isinstance(c, (tuple, list)):
        return '#%02x%02x%02x' % tuple(int(max(0, min(1, float(x))) * 255) for x in c[:3])
    c = str(c)
    return _SHORT.get(c, c)


def _fmt(s):
    color = marker = None
    ls = None
    i = 0
    for st in ('--', '-.', '-', ':'):
        if st in s:
            ls = st
            s = s.replace(st, '', 1)
            break
    for ch in s:
        if ch in _SHORT:
            color = _SHORT[ch]
        elif ch in 'o.s^v*x+Dd<>p':
            marker = ch
    if ls is None and marker is None:
        ls = '-'
    return color, marker, ls


def figure(num=None, figsize=None, **k):
    global _fig
    if _fig is not None and _fig['series']:
        show()
    _fig = _new(*(figsize or (6.4, 4.8)))


def plot(*args, **k):
    f = _f()
    args = list(args)
    groups = []
    while args:
        if len(args) >= 2 and not isinstance(args[1], str):
            x, y = args[0], args[1]
            args = args[2:]
        else:
            y = args[0]
            x = None
            args = args[1:]
        fmt = ''
        if args and isinstance(args[0], str):
            fmt = args.pop(0)
        y = _nums(y)
        x = _nums(x) if x is not None else [float(i) for i in range(len(y))]
        groups.append((x, y, fmt))
    for x, y, fmt in groups:
        c, mk, ls = _fmt(fmt)
        if k.get('linestyle') or k.get('ls'):
            ls = k.get('linestyle') or k.get('ls')
        if k.get('marker'):
            mk = k['marker']
            if not fmt:
                ls = ls or '-'
        if len(x) != len(y):
            raise ValueError('x와 y의 개수가 달라요 (x %d개, y %d개)' % (len(x), len(y)))
        f['series'].append({'type': 'line', 'x': x, 'y': y, 'color': _color(k.get('color') or k.get('c') or c, f),
                            'width': k.get('linewidth', k.get('lw', 2)), 'marker': mk, 'ls': ls, 'label': k.get('label')})
    return []


def scatter(x, y, s=None, c=None, label=None, color=None, marker='o', alpha=None, **k):
    f = _f()
    x, y = _nums(x), _nums(y)
    size = 36 if s is None or not isinstance(s, (int, float)) else s
    f['series'].append({'type': 'scatter', 'x': x, 'y': y, 'color': _color(color or (c if isinstance(c, str) else None), f), 'size': size, 'marker': marker, 'label': label})


def bar(x, height, width=0.8, color=None, label=None, **k):
    f = _f()
    xs = _labels(x)
    hs = _nums(height)
    if len(hs) == 1 and len(xs) > 1:
        hs = hs * len(xs)
    cols = color if isinstance(color, (list, tuple)) and len(color) == len(xs) and not isinstance(color[0], (int, float)) else None
    f['series'].append({'type': 'bar', 'x': [x if isinstance(x, (int, float)) else str(x) for x in xs], 'y': hs, 'width': width,
                        'color': _color(None if cols else color, f), 'colors': [_color(c, f) for c in cols] if cols else None, 'label': label})


def barh(y, width, height=0.8, color=None, label=None, **k):
    bar(y, width, height, color=color, label=label)
    _f()['series'][-1]['type'] = 'barh'


def hist(x, bins=10, color=None, label=None, range=None, **k):
    f = _f()
    data = _nums(x)
    if not data:
        return
    lo, hi = range if range else (min(data), max(data))
    if hi == lo:
        hi = lo + 1
    if isinstance(bins, int):
        n = bins
        edges = [lo + (hi - lo) * i / n for i in __import__('builtins').range(n + 1)]
    else:
        edges = _nums(bins)
        n = len(edges) - 1
    counts = [0] * n
    for v in data:
        for i in __import__('builtins').range(n):
            if edges[i] <= v < edges[i + 1] or (i == n - 1 and v == edges[-1]):
                counts[i] += 1
                break
    f['series'].append({'type': 'hist', 'edges': edges, 'y': [float(c) for c in counts], 'color': _color(color, f), 'label': label})
    return counts, edges


def pie(x, labels=None, colors=None, autopct=None, **k):
    f = _f()
    vals = _nums(x)
    cols = [_color(c, f) for c in colors] if colors else [_C[i % len(_C)] for i in range(len(vals))]
    f['series'].append({'type': 'pie', 'y': vals, 'labels': [str(l) for l in labels] if labels else None, 'colors': cols, 'pct': bool(autopct)})


def axhline(y=0, color='#888888', **k):
    _f()['lines'].append({'h': float(y), 'color': _color(color, _f())})


def axvline(x=0, color='#888888', **k):
    _f()['lines'].append({'v': float(x), 'color': _color(color, _f())})


def title(s, **k):
    _f()['title'] = str(s)


def xlabel(s, **k):
    _f()['xlabel'] = str(s)


def ylabel(s, **k):
    _f()['ylabel'] = str(s)


def legend(*a, **k):
    _f()['legend'] = True


def grid(b=True, **k):
    _f()['grid'] = bool(b)


def xlim(*a, **k):
    if len(a) == 1:
        a = a[0]
    _f()['xlim'] = [float(a[0]), float(a[1])]


def ylim(*a, **k):
    if len(a) == 1:
        a = a[0]
    _f()['ylim'] = [float(a[0]), float(a[1])]


def xticks(ticks=None, labels=None, **k):
    if ticks is not None:
        _f()['xticks'] = [_nums(ticks), [str(l) for l in labels] if labels is not None else None]


def yticks(ticks=None, labels=None, **k):
    if ticks is not None:
        _f()['yticks'] = [_nums(ticks), [str(l) for l in labels] if labels is not None else None]


def tight_layout(*a, **k):
    pass


def savefig(*a, **k):
    pass


def close(*a, **k):
    global _fig
    _fig = None


def clf():
    global _fig
    _fig = _new()


cla = clf


def show(*a, **k):
    global _fig
    if _fig is not None and (_fig['series'] or _fig['lines']):
        _fry.plot(_json.dumps(_fig))
    _fig = None


def _flush():
    show()


class _Axes:
    """plt.subplots() gives this: ax.plot, ax.set_title and so on go to the same graph."""
    def __getattr__(self, n):
        if n.startswith('set_'):
            return globals()[n[4:]]
        return globals()[n]


class _Fig:
    def savefig(self, *a, **k):
        pass

    def suptitle(self, s, **k):
        title(s)

    def tight_layout(self, *a, **k):
        pass

    def show(self):
        show()


def subplots(nrows=1, ncols=1, figsize=None, **k):
    if nrows != 1 or ncols != 1:
        raise NotImplementedError('Fry Python 그래프는 그림 하나(subplots())만 돼요')
    figure(figsize=figsize)
    return _Fig(), _Axes()


def gca():
    return _Axes()


def gcf():
    return _Fig()
