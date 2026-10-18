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
    # Same chat template and sizes as MLC's prebuilt Qwen3, whose WebLLM model code the site reuses.
    run(["gen_config", model, "--quantization", q, "--conv-template", "qwen3", "-o", out])
    print(sorted(os.listdir(out))[:8], len(os.listdir(out)), "files")
    if upload:
        user = api.whoami()["name"]
        api.create_repo(f"{user}/{repo}", exist_ok=True)
        api.upload_folder(folder_path=out, repo_id=f"{user}/{repo}", commit_message="Tools fine-tune")
        print("uploaded https://huggingface.co/%s/%s" % (user, repo), flush=True)
print("done")

# Test run on the base model: compare with MLC's own prebuilt conversion, which the site's
# WebLLM model code was built for. Same tensor names, shapes and dtypes means it will load.
if name == "test":
    for q in quants:
        ref = snapshot_download(f"mlc-ai/Qwen3-1.7B-{q}-MLC", local_dir=f"/tmp/ref-{q}")
        out = f"/tmp/mlc/{name}-{q}-MLC"
        def recs(d):
            f = next(x for x in ("tensor-cache.json", "ndarray-cache.json") if os.path.exists(os.path.join(d, x)))
            meta = json.load(open(os.path.join(d, f)))
            return {r["name"]: (tuple(r["shape"]), r["dtype"]) for rec in meta["records"] for r in rec["records"]}, meta
        a, ma = recs(out)
        b, mb = recs(ref)
        diff = {k: (a.get(k), b.get(k)) for k in set(a) | set(b) if a.get(k) != b.get(k)}
        print(f"{q}: {len(a)} tensors, prebuilt {len(b)}, differences: {len(diff)}")
        for k in list(diff)[:10]:
            print("  ", k, diff[k])
        # Compare the first shard's bytes to see the numbers themselves agree.
        sa, sb = ma["records"][0], mb["records"][0]
        da = open(os.path.join(out, sa["dataPath"]), "rb").read()
        db = open(os.path.join(ref, sb["dataPath"]), "rb").read()
        same = sum(x == y for x, y in zip(da[:2_000_000], db[:2_000_000])) / max(1, min(len(da), len(db), 2_000_000))
        print(f"  first shard {sa['dataPath']}: {len(da)} vs {len(db)} bytes, {same:.1%} identical bytes in first 2 MB")
        mc = json.load(open(os.path.join(ref, "mlc-chat-config.json")))
        mo = json.load(open(os.path.join(out, "mlc-chat-config.json")))
        for k in ("model_type", "quantization", "context_window_size", "prefill_chunk_size", "conv_template"):
            print(f"  {k}: ours={str(mo.get(k))[:60]} prebuilt={str(mc.get(k))[:60]}")
        assert not diff, "tensor layout differs from the prebuilt model"
        for k in ("model_type", "quantization", "context_window_size", "prefill_chunk_size"):
            assert mo.get(k) == mc.get(k), k
        assert mo["conv_template"]["name"] == mc["conv_template"]["name"], "conv_template"
    print("matches the prebuilt model")
