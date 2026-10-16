"""Convert a Hugging Face Qwen3 model to MLC (WebLLM) and upload it.

Used by .github/workflows/convert-model.yml:
    python train/convert.py <source repo> <name> "<quants>" <upload true|false>
"""
import glob, json, os, re, subprocess, sys
import mlc_llm
from huggingface_hub import HfApi, snapshot_download

src, name, quants, upload = sys.argv[1], sys.argv[2], sys.argv[3].split(), sys.argv[4] == "true"
token = os.environ.get("HF_TOKEN") or None


def run(cmd):
    print("+", " ".join(cmd), flush=True)
    # mlc_cli.py = the mlc_llm CLI with quantization done in numpy (its LLVM kernel segfaults on CPU).
    cli = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mlc_cli.py")
    subprocess.run([sys.executable, "-X", "faulthandler", cli] + cmd, check=True)


# New numpy rejects TVM dtype objects in astype(); pass the dtype name instead.
for f in glob.glob(os.path.join(os.path.dirname(mlc_llm.__file__), "**", "*.py"), recursive=True):
    s = open(f).read()
    t = re.sub(r"\.astype\(((?:[\w.]+\.)?\w*dtype)\)", r".astype(str(\1))", s)
    if t != s:
        open(f, "w").write(t)
        print("patched", f)

model = snapshot_download(src, token=token, local_dir="/tmp/src",
                          allow_patterns=["*.json", "*.safetensors", "*.txt", "*.model", "*.jinja"])

# Newer transformers writes rope_theta inside rope_parameters; MLC reads it from the top level.
p = os.path.join(model, "config.json")
c = json.load(open(p))
rp = c.get("rope_parameters") or c.get("rope_scaling") or {}
c["rope_theta"] = c.get("rope_theta") or rp.get("rope_theta") or 1000000
if isinstance(c.get("rope_scaling"), dict) and c["rope_scaling"].get("rope_type") == "default":
    c["rope_scaling"] = None
json.dump(c, open(p, "w"), indent=2)

api = HfApi(token=token)
for q in quants:
    repo = f"{name}-{q}-MLC"
    out = f"/tmp/mlc/{repo}"
    run(["convert_weight", model, "--quantization", q, "-o", out])
    run(["gen_config", model, "--quantization", q, "--conv-template", "qwen2",
         "--context-window-size", "8192", "--prefill-chunk-size", "1024", "-o", out])
    print(sorted(os.listdir(out))[:8], len(os.listdir(out)), "files")
    if upload:
        user = api.whoami()["name"]
        api.create_repo(f"{user}/{repo}", exist_ok=True)
        api.upload_folder(folder_path=out, repo_id=f"{user}/{repo}", commit_message="Tools fine-tune")
        print("uploaded https://huggingface.co/%s/%s" % (user, repo), flush=True)
print("done")
