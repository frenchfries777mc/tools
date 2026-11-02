#!/bin/bash
# AI speed test on the Oracle server (ff777-host). Game rooms win: everything here runs at the lowest priority
# and may use at most ONE cpu core. It builds llama.cpp, converts tarius to a 4-bit GGUF and measures tokens/second.
# Run:  nohup bash tools/server/ai-test/bench.sh > ~/ai-bench.log 2>&1 &     then watch:  tail -f ~/ai-bench.log
# Stop any time:  pkill -f ai-test   (nothing stays running, nothing is installed as a service)
set -e
MODEL=${MODEL:-Frenchfries777/FF-Tools-1.7B-merged-1.9b}
W=$HOME/ai-test; mkdir -p "$W"; cd "$W"
LOW() { sudo systemd-run --scope --quiet -p CPUWeight=1 -p CPUQuota=100% -- sudo -u "$USER" nice -n 19 "$@"; }
echo "== load before: $(uptime)"
sudo apt-get install -y git cmake build-essential python3-venv python3-pip
[ -d llama.cpp ] || git clone --depth 1 https://github.com/ggml-org/llama.cpp
cd llama.cpp
if [ ! -x build/bin/llama-bench ]; then
  LOW cmake -B build -DCMAKE_BUILD_TYPE=Release
  LOW cmake --build build -j1 --target llama-bench llama-quantize llama-cli
fi
cd "$W"
[ -d venv ] || python3 -m venv venv
LOW venv/bin/pip install -q -r llama.cpp/requirements/requirements-convert_hf_to_gguf.txt huggingface_hub
[ -d model ] || LOW venv/bin/python -c "from huggingface_hub import snapshot_download as d; d('$MODEL', local_dir='model')"
[ -f f16.gguf ] || LOW venv/bin/python llama.cpp/convert_hf_to_gguf.py model --outfile f16.gguf --outtype f16
[ -f q4.gguf ] || LOW llama.cpp/build/bin/llama-quantize f16.gguf q4.gguf Q4_K_M
echo "== speed (1 core, lowest priority)"
LOW llama.cpp/build/bin/llama-bench -m q4.gguf -t 1 -p 64 -n 64
echo "== load after: $(uptime)"
echo "DONE: send this whole log to Claude"
