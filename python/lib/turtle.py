"""Fry Python turtle: the usual turtle commands, drawn on the page's canvas.
Coordinates: (0, 0) is the middle, y goes up, heading 0 points right (east)."""
import math as _m
import json as _json
import _fry

_cmds = []
_bg = None
_mode = 1.0
_turtles = []
_NAMES = {'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'gray', 'grey', 'brown', 'cyan',
          'magenta', 'gold', 'navy', 'violet', 'lime', 'skyblue', 'tomato', 'coral', 'salmon', 'olive', 'teal', 'maroon',
          'turquoise', 'indigo', 'crimson', 'orchid', 'khaki', 'beige', 'lightblue', 'lightgreen', 'darkgreen', 'darkblue',
          'darkred', 'silver', 'chocolate', 'tan', 'plum', 'aqua', 'hotpink', 'deeppink', 'forestgreen', 'royalblue',
          'steelblue', 'sienna', 'peru', 'wheat', 'lavender', 'mintcream', 'ivory', 'firebrick', 'darkorange', 'yellowgreen'}


def _emit(c):
    _cmds.append(c)
    if len(_cmds) >= 400:
        _flush()


def _flush():
    global _cmds
    if _cmds:
        _fry.turtle(_json.dumps(_cmds))
        _cmds = []


def _col(c):
    if c is None:
        return None
    if isinstance(c, (tuple, list)) and len(c) == 3:
        k = 255.0 / _mode
        v = [max(0, min(255, int(round(float(x) * k)))) for x in c]
        return '#%02x%02x%02x' % tuple(v)
    s = str(c).strip()
    if s.startswith('#') or s.lower().replace(' ', '') in _NAMES:
        return s.lower().replace(' ', '')
    raise ValueError('알 수 없는 색이에요: ' + repr(c))


def _args_col(args):
    if len(args) == 3 and all(isinstance(a, (int, float)) for a in args):
        return _col(tuple(args))
    return _col(args[0])


class Turtle:
    def __init__(self, shape='classic', visible=True):
        self._x = 0.0
        self._y = 0.0
        self._h = 0.0
        self._down = True
        self._pc = 'black'
        self._fc = 'black'
        self._w = 1
        self._fill = None
        self._speed = 3
        self._shown = visible
        self._id = len(_turtles)
        _turtles.append(self)
        self._pose()

    def _pose(self):
        _emit(['t', self._id, round(self._x, 2), round(self._y, 2), round(self._h, 2), self._shown, self._pc, self._speed])

    def _move(self, x, y):
        if self._down:
            _emit(['l', round(self._x, 2), round(self._y, 2), round(x, 2), round(y, 2), self._pc, self._w, self._speed])
        self._x, self._y = float(x), float(y)
        if self._fill is not None:
            self._fill.append((round(self._x, 2), round(self._y, 2)))
        self._pose()

    # movement
    def forward(self, d):
        r = _m.radians(self._h)
        self._move(self._x + d * _m.cos(r), self._y + d * _m.sin(r))
    fd = forward

    def back(self, d):
        self.forward(-d)
    bk = backward = back

    def left(self, a):
        self._h = (self._h + a) % 360
        self._pose()
    lt = left

    def right(self, a):
        self.left(-a)
    rt = right

    def goto(self, x, y=None):
        if y is None:
            x, y = x
        self._move(x, y)
    setpos = setposition = goto

    def setx(self, x):
        self._move(x, self._y)

    def sety(self, y):
        self._move(self._x, y)

    def setheading(self, a):
        self._h = a % 360
        self._pose()
    seth = setheading

    def home(self):
        self._move(0, 0)
        self.setheading(0)

    def circle(self, radius, extent=360, steps=None):
        if steps is None:
            frac = abs(extent) / 360.0
            steps = 1 + int(min(11 + abs(radius) / 6.0, 59.0) * frac)
        w = 1.0 * extent / steps
        w2 = 0.5 * w
        l = 2.0 * radius * _m.sin(_m.radians(w2))
        if radius < 0:
            l, w, w2 = -l, -w, -w2
        self.left(w2)
        for _ in range(steps):
            self.forward(l)
            self.left(w)
        self.left(-w2)

    def dot(self, size=None, *color):
        c = _args_col(color) if color else self._pc
        _emit(['d', round(self._x, 2), round(self._y, 2), size or max(self._w + 4, self._w * 2), c])

    def write(self, arg, move=False, align='left', font=('Arial', 8, 'normal')):
        size = font[1] if isinstance(font, (tuple, list)) and len(font) > 1 else 8
        _emit(['w', round(self._x, 2), round(self._y, 2), str(arg), self._pc, size, align])

    def stamp(self):
        _emit(['s', round(self._x, 2), round(self._y, 2), self._h, self._fc])
        return 0

    # pen
    def penup(self):
        self._down = False
    pu = up = penup

    def pendown(self):
        self._down = True
    pd = down = pendown

    def isdown(self):
        return self._down

    def pensize(self, w=None):
        if w is None:
            return self._w
        self._w = w
    width = pensize

    def pencolor(self, *a):
        if not a:
            return self._pc
        self._pc = _args_col(a)
        self._pose()

    def fillcolor(self, *a):
        if not a:
            return self._fc
        self._fc = _args_col(a)

    def color(self, *a):
        if not a:
            return self._pc, self._fc
        if len(a) == 2:
            self._pc, self._fc = _col(a[0]), _col(a[1])
        else:
            self._pc = self._fc = _args_col(a)
        self._pose()

    def begin_fill(self):
        self._fill = [(round(self._x, 2), round(self._y, 2))]

    def end_fill(self):
        if self._fill and len(self._fill) > 2:
            _emit(['f', self._fill, self._fc])
            # draw the outline again on top so the fill does not cover it
            if self._down:
                p = self._fill
                for i in range(1, len(p)):
                    _emit(['l', p[i - 1][0], p[i - 1][1], p[i][0], p[i][1], self._pc, self._w, 0])
        self._fill = None

    def filling(self):
        return self._fill is not None

    def speed(self, s=None):
        if s is None:
            return self._speed
        names = {'fastest': 0, 'fast': 10, 'normal': 6, 'slow': 3, 'slowest': 1}
        self._speed = names.get(s, s) if isinstance(s, str) else max(0, min(10, int(s)))

    def hideturtle(self):
        self._shown = False
        self._pose()
    ht = hideturtle

    def showturtle(self):
        self._shown = True
        self._pose()
    st = showturtle

    def isvisible(self):
        return self._shown

    def shape(self, name=None):
        return 'classic'

    def shapesize(self, *a, **k):
        pass
    turtlesize = shapesize

    # state
    def position(self):
        return (round(self._x, 6), round(self._y, 6))
    pos = position

    def xcor(self):
        return self._x

    def ycor(self):
        return self._y

    def heading(self):
        return self._h

    def distance(self, x, y=None):
        if y is None:
            x, y = x if not isinstance(x, Turtle) else x.pos()
        return _m.hypot(x - self._x, y - self._y)

    def towards(self, x, y=None):
        if y is None:
            x, y = x if not isinstance(x, Turtle) else x.pos()
        return _m.degrees(_m.atan2(y - self._y, x - self._x)) % 360

    def clear(self):
        _emit(['c'])

    def reset(self):
        _emit(['c'])
        self.__init__()

    def getscreen(self):
        return _screen

    def onclick(self, *a, **k):
        pass


class _Screen:
    def bgcolor(self, *a):
        global _bg
        if a:
            _bg = _args_col(a)
            _emit(['b', _bg])
        return _bg

    def title(self, *a):
        pass

    def setup(self, *a, **k):
        pass

    def screensize(self, *a, **k):
        pass

    def tracer(self, *a, **k):
        pass

    def update(self):
        pass

    def colormode(self, m=None):
        return colormode(m)

    def mainloop(self):
        pass
    done = exitonclick = bye = mainloop

    def onclick(self, *a, **k):
        pass
    onscreenclick = onkey = onkeypress = listen = ontimer = onclick

    def clear(self):
        _emit(['c'])

    def turtles(self):
        return list(_turtles)


_screen = _Screen()


def Screen():
    return _screen


def colormode(m=None):
    global _mode
    if m is None:
        return _mode
    _mode = float(m)


def done():
    _flush()


mainloop = exitonclick = bye = done
_pen = None


def _t():
    global _pen
    if _pen is None:
        _pen = Turtle()
    return _pen


def bgcolor(*a):
    return _screen.bgcolor(*a)


def tracer(*a, **k):
    pass


def update():
    pass


def title(*a):
    pass


def setup(*a, **k):
    pass


Pen = RawTurtle = Turtle
_names = ['forward', 'fd', 'back', 'bk', 'backward', 'left', 'lt', 'right', 'rt', 'goto', 'setpos', 'setposition', 'setx', 'sety',
          'setheading', 'seth', 'home', 'circle', 'dot', 'write', 'stamp', 'penup', 'pu', 'up', 'pendown', 'pd', 'down', 'isdown',
          'pensize', 'width', 'pencolor', 'fillcolor', 'color', 'begin_fill', 'end_fill', 'filling', 'speed', 'hideturtle', 'ht',
          'showturtle', 'st', 'isvisible', 'shape', 'shapesize', 'turtlesize', 'position', 'pos', 'xcor', 'ycor', 'heading',
          'distance', 'towards', 'clear', 'reset', 'onclick']


def _mk(n):
    def f(*a, **k):
        return getattr(_t(), n)(*a, **k)
    f.__name__ = n
    return f


for _n in _names:
    globals()[_n] = _mk(_n)
del _n
