# 내 컴퓨터(NVIDIA GPU)에서 학습하기

노트북과 **같은 학습, 같은 자료**예요. `run.py`가 `train/lightning.ipynb`에서 만들어진 파일이고, 설정을 환경 변수로 바꿀 수 있어요. (`python3 train/make_local.py`로 다시 만들어요)

**이 방법은 아직 실제 GPU에서 돌려 보지 못했어요.** 설치 단계에서 막히면 화면의 오류 글을 그대로 알려 주세요.

## 되는 것과 안 되는 것 (VRAM 8GB 기준)
- 렉투스(4B, `MODEL=smart`): 될 가능성이 높아요. 메모리가 모자라면 `MAX_LEN=2048`로 낮춰요.
- 타리우스(1.7B, `MODEL=basic`): 가장 쉬워요. 다만 1.5 자료(`v15-basic`)가 아직 없어서 지금은 1.4 자료로만 돌릴 수 있어요.
- 프레무스(8B): 8GB로는 어려워요. 클라우드 GPU에서 돌려야 해요.
- 램(15GB)도 중요해요. 학습이 끝나고 모델을 합칠 때 램을 많이 써서, **크롬 등 다른 프로그램은 모두 닫고** 돌려 주세요.

## 한 번만 하는 준비 (윈도우)
윈도우 그대로보다 WSL(윈도우 안의 리눅스)이 설치가 훨씬 잘 돼요. 5060 같은 새 GPU는 특히 그래요.

1. **PowerShell을 관리자 권한으로** 열고 `wsl --install -d Ubuntu-24.04` 를 입력해요. 끝나면 컴퓨터를 다시 켜고, 우분투 창이 뜨면 이름과 비밀번호를 정해요.
2. 우분투 창에서 GPU가 보이는지 확인해요: `nvidia-smi` → 표에 RTX 5060이 나오면 돼요. 안 나오면 윈도우의 NVIDIA 드라이버를 최신으로 올리고 다시 해 보세요.
3. 도구를 설치해요:
   ```
   sudo apt update && sudo apt install -y python3-venv python3-dev build-essential git
   python3 -m venv ~/ffenv && source ~/ffenv/bin/activate
   pip install -U pip uv
   ```
4. 5060(Blackwell)은 CUDA 12.8 이상용 PyTorch가 필요해요:
   ```
   uv pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128
   uv pip install unsloth trl datasets huggingface_hub
   python3 -c "import torch; print(torch.cuda.get_device_name(0))"
   ```
   마지막 줄에 `NVIDIA GeForce RTX 5060 Laptop GPU`가 나오면 성공이에요. `unsloth` 설치가 torch를 바꿔 버렸다면 위의 첫 줄을 한 번 더 실행해요.
5. 코드를 받아요: `git clone https://github.com/frenchfries777mc/tools && cd tools`

## 실행
Hugging Face **Write** 토큰(`hf_`로 시작)이 필요해요. 파일에 저장하지 않고, 실행하면 숨김 입력 칸이 떠요.

먼저 **짧은 시험**(1분 안에 메모리가 되는지만 봐요):
```
source ~/ffenv/bin/activate
cd ~/tools
MODEL=smart MAX_TRAIN_HOURS=0.03 RUN_EVAL=0 python3 train/local/run.py
```
"학습 끝"까지 나오고 오류가 없으면 본 실행이에요:
```
MODEL=smart python3 train/local/run.py
```
- 렉투스 1.5는 올려 둔 1.4 렉투스(`FF-Tools-4B-merged`)에서 이어서 학습해요. 끝나면 `FF-Tools-4B-merged-1.5`에 비공개로 올라가요.
- 중간에 끊겨도 같은 명령을 다시 실행하면 200걸음마다 올려 둔 곳에서 이어요.
- 끝에 "올림 끝: ..." 줄이 나오면 Claude에게 알려 주세요.

## 자주 막히는 곳
- `CUDA out of memory`: `MAX_LEN=2048`을 붙이거나, 다른 프로그램을 닫아요.
- `Killed`(램 부족으로 꺼짐): 크롬을 완전히 닫고, 그래도 안 되면 윈도우 `C:\Users\<이름>\.wslconfig`에 `[wsl2]` 줄 아래 `memory=13GB`, `swap=16GB`를 넣고 PowerShell에서 `wsl --shutdown` 후 다시 해요.
- 노트북은 충전기를 꽂고 **절전을 꺼** 주세요. 오래 걸리고 뜨거워질 수 있어요.
