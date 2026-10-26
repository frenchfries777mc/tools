"""합친 모델 폴더(merged)만 Hugging Face에 올려요. 학습 끝에 올리다가 "Killed"(램 부족)로 꺼졌을 때 쓰는 파일이에요.
합치기는 이미 끝나 있어서 다시 하지 않고, 파일을 하나씩 흘려 보내서 램을 거의 안 써요.
  cd ~/tools && git pull && source ~/ffenv/bin/activate && python3 train/local/upload.py smart 1.7
  (모델: basic=타리우스 1.7B, smart=렉투스 4B, premus=프레무스 8B / 버전 1.5·1.6·1.7은 -<버전> 저장소로 올라가요)
토큰은 터미널에서만 입력해요(글자가 그대로 보여요). 매번 묻지 않게 하려면 먼저 export HF_TOKEN=hf_... 를 해요. """
import os, sys
from huggingface_hub import HfApi

SIZE = {"basic": "1.7B", "smart": "4B", "premus": "8B"}
model = sys.argv[1] if len(sys.argv) > 1 else "smart"
version = sys.argv[2] if len(sys.argv) > 2 else "1.7"
folder = sys.argv[3] if len(sys.argv) > 3 else "merged"
if model not in SIZE:
    sys.exit("모델은 basic, smart, premus 중 하나예요")
if not os.path.isfile(os.path.join(folder, "config.json")):
    sys.exit("'%s' 폴더에 합친 모델이 없어요. ~/tools 폴더에서 실행하고 있는지 확인해 주세요" % folder)
token = os.environ.get("HF_TOKEN") or input("Hugging Face Write 토큰(hf_로 시작): ").strip()
api = HfApi(token=token)
user = api.whoami()["name"]
repo = "%s/FF-Tools-%s-merged%s" % (user, SIZE[model], "-" + version if version in ("1.5", "1.6", "1.7") else "")
api.create_repo(repo, private=True, exist_ok=True)
print("올리는 곳:", repo, "(비공개)")
api.upload_folder(folder_path=folder, repo_id=repo, repo_type="model", commit_message="FF777 %s %s" % (version, model))
print("올림 끝:", repo)
