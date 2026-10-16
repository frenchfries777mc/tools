"""Run the mlc_llm CLI with group quantization done in numpy.

On CPU, mlc_llm compiles its quantize kernel with LLVM, and that compile
segfaults with the current CPU wheels (on Colab and on GitHub runners alike).
The math is simple, so this does the same group quantization in numpy and
leaves everything else (loading, file format, gen_config) to mlc_llm.

    python train/mlc_cli.py convert_weight <model> --quantization q4f16_1 -o <out>
"""
import sys

import numpy as np
from tvm.runtime import tensor as as_tensor
from mlc_llm.quantization import group_quantization as gq


def quantize_np(w, group_size, max_int, bits, per_storage, axis=-1, output_transpose=False):
    """Same result as GroupQuantize._quantize: (packed uint32 weight, scale)."""
    axis = axis % w.ndim
    w = np.moveaxis(w, axis, -1)
    k = w.shape[-1]
    assert k % group_size == 0 and k % per_storage == 0, (w.shape, group_size)
    g = w.reshape(*w.shape[:-1], k // group_size, group_size)
    scale = (np.abs(g).max(axis=-1) / w.dtype.type(max_int)).astype(w.dtype)
    safe = np.where(scale == 0, w.dtype.type(1), scale)
    q = np.rint(g / safe[..., None] + w.dtype.type(max_int))
    q = np.clip(q, 0, 2 * max_int).astype(np.uint32).reshape(*w.shape[:-1], k // per_storage, per_storage)
    shifts = (np.arange(per_storage, dtype=np.uint32) * bits)
    packed = np.bitwise_or.reduce(q << shifts, axis=-1).astype(np.uint32)
    packed = np.moveaxis(packed, -1, axis)
    scale = np.moveaxis(scale, -1, axis)
    if output_transpose:
        packed, scale = packed.T, scale.T
    return np.ascontiguousarray(packed), np.ascontiguousarray(scale)


def dequantize_np(packed, scale, group_size, max_int, bits, per_storage, axis=-1):
    """Inverse of quantize_np (no transpose), used for the self-check."""
    axis = axis % packed.ndim
    p = np.moveaxis(packed, axis, -1)
    s = np.moveaxis(scale, axis, -1)
    shifts = (np.arange(per_storage, dtype=np.uint32) * bits)
    q = (p[..., None] >> shifts) & np.uint32((1 << bits) - 1)
    q = q.reshape(*p.shape[:-1], -1).astype(s.dtype)
    w = (q - s.dtype.type(max_int)) * np.repeat(s, group_size, axis=-1)
    return np.moveaxis(w, -1, axis)


_checked = []


def quantize_weight(self, weight, axis=-1, output_transpose=False):
    assert self.quantize_dtype == "int4" and self.storage_dtype == "uint32", self.name
    bits = 4
    w = weight.numpy()
    packed, scale = quantize_np(w, self.group_size, self.max_int_value, bits,
                                self.num_elem_per_storage, axis, output_transpose)
    if not _checked:
        p, s = (packed.T, scale.T) if output_transpose else (packed, scale)
        back = dequantize_np(p, s, self.group_size, self.max_int_value, bits, self.num_elem_per_storage, axis)
        err = float(np.abs(back.astype(np.float32) - w.astype(np.float32)).max())
        top = float(np.abs(w.astype(np.float32)).max())
        print(f"[numpy quantize] first weight {w.shape}: max error {err:.5f} (max |w| {top:.5f})", flush=True)
        assert err <= top / self.max_int_value + 1e-3, "quantization self-check failed"
        _checked.append(1)
    return [as_tensor(packed, device=weight.device), as_tensor(scale, device=weight.device)]


gq.GroupQuantize.quantize_weight = quantize_weight

if __name__ == "__main__":
    from mlc_llm.__main__ import main

    main()
