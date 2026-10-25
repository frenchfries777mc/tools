/* Fry Python examples: [name, code, stdin] */
window.FPY_EX=[
['👋 안녕하세요',
'# print()는 글자를 결과 칸에 보여 줘요\nprint("안녕하세요!")\nprint("1 더하기 2는", 1 + 2)\n\nname = "파이썬"\nprint(f"{name}은(는) 재미있어요")\n'],
['✖️ 구구단',
'# for 반복문으로 2단부터 9단까지\nfor dan in range(2, 10):\n    print(f"--- {dan}단 ---")\n    for i in range(1, 10):\n        print(f"{dan} x {i} = {dan * i}")\n'],
['🐢 거북이 별',
'import turtle\n\nt = turtle.Turtle()\nt.speed(6)\nt.color("gold", "orange")\nt.pensize(3)\n\nt.begin_fill()\nfor i in range(5):\n    t.forward(200)\n    t.right(144)\nt.end_fill()\n\nt.hideturtle()\n'],
['🌸 거북이 꽃',
'import turtle\n\nt = turtle.Turtle()\nturtle.bgcolor("black")\nt.speed(0)\ncolors = ["red", "orange", "yellow", "lime", "skyblue", "violet"]\n\nfor i in range(36):\n    t.pencolor(colors[i % 6])\n    t.circle(100)\n    t.left(10)\n\nt.hideturtle()\n'],
['🌀 거북이 나선',
'from turtle import *\n\nspeed(0)\nbgcolor("navy")\nfor i in range(120):\n    pencolor((i / 120, 0.6, 1 - i / 120))\n    forward(i * 2.5)\n    left(59)\nhideturtle()\n'],
['📈 그래프 그리기',
'import math\nimport matplotlib.pyplot as plt\n\nx = [i / 10 for i in range(0, 63)]\ny1 = [math.sin(v) for v in x]\ny2 = [math.cos(v) for v in x]\n\nplt.plot(x, y1, label="sin")\nplt.plot(x, y2, "--", label="cos")\nplt.title("사인과 코사인")\nplt.xlabel("x")\nplt.ylabel("y")\nplt.grid(True)\nplt.legend()\nplt.show()\n'],
['📊 막대그래프',
'import matplotlib.pyplot as plt\n\nfruits = ["사과", "바나나", "포도", "딸기"]\nvotes = [12, 7, 9, 15]\n\nplt.bar(fruits, votes, color=["red", "gold", "purple", "hotpink"])\nplt.title("우리 반이 좋아하는 과일")\nplt.ylabel("표")\nplt.show()\n'],
['🎲 주사위 1000번',
'import random\nimport matplotlib.pyplot as plt\n\nrolls = [random.randint(1, 6) for _ in range(1000)]\ncount = [rolls.count(n) for n in range(1, 7)]\nfor n in range(1, 7):\n    print(n, "->", count[n - 1], "번")\n\nplt.bar(range(1, 7), count)\nplt.title("주사위를 1000번 던지면")\nplt.show()\n'],
['🔢 숫자 맞히기 (입력값)',
'# 아래 "입력값" 칸에 숫자를 한 줄에 하나씩 적고 실행하세요\nimport random\n\nanswer = 37  # random.randint(1, 100) 로 바꿔 봐요\nfor turn in range(1, 6):\n    guess = int(input("숫자를 맞혀 보세요: "))\n    if guess == answer:\n        print(f"정답! {turn}번 만에 맞혔어요")\n        break\n    elif guess < answer:\n        print("더 큰 수예요")\n    else:\n        print("더 작은 수예요")\nelse:\n    print("아쉬워요. 정답은", answer)\n',
'50\n25\n37'],
['🐞 오류 내 보기',
'# 일부러 틀린 코드예요. 실행하고 "AI에게 오류 설명 듣기"를 눌러 보세요\nscores = [90, 85, 77]\ntotal = 0\nfor s in scores:\n    total = total + s\nprint("평균:", total / len(score))\n']
];
