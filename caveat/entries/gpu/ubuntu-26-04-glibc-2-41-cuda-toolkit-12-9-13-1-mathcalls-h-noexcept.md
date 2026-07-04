---
id: ubuntu-26-04-glibc-2-41-cuda-toolkit-12-9-13-1-mathcalls-h-noexcept
title: Ubuntu 26.04 (glibc 2.41) で CUDA Toolkit 12.9 / 13.1 のホストビルドが mathcalls.h の noexcept 衝突で失敗する
visibility: public
confidence: reproduced
outcome: impossible
tags:
  - cuda
  - nvcc
  - glibc
  - ubuntu
  - wsl2
  - cmake
  - build
  - noexcept
environment:
  os: Ubuntu 26.04 LTS (resolute)
  arch: x64
  node: 22.22.1
  kernel: 6.6.87.2-microsoft-standard-WSL2
  glibc: '2.41'
  gcc_default: 15.2.0
  gcc_alt: 14.3.0
  cuda_toolkit: 12.9.86 / 13.1.115
  host: WSL2 on Windows
  target: x86_64-linux-gnu
source_project: null
source_session: 2026-05-01T18:15:03.256Z/63cc993cacf7
created_at: 2026-05-01
updated_at: 2026-05-01
last_verified: 2026-05-01
---

## Symptom

CUDA を有効化した CMake / nvcc ビルド（例: `llama.cpp` の `cmake -B build -DGGML_CUDA=ON`）が、CMake の compiler-id detection 段階で以下のいずれかのエラーで失敗する。

```
/usr/include/x86_64-linux-gnu/bits/mathcalls.h(83): error: exception
/usr/include/x86_64-linux-gnu/bits/mathcalls.h(85): error: exception
/usr/include/x86_64-linux-gnu/bits/mathcalls.h(206): error: exception
6 errors detected in the compilation of "CMakeCUDACompilerId.cu".
```

CUDA Toolkit を 12.9 → 13.1 に上げると 6 errors → 2 errors に減るが、行 206 の `mathcalls.h(206): error: exception` は残る。`-allow-unsupported-compiler` を nvcc に渡すと、今度は CUDA 内部ヘッダ側が引っかかる:

```
specification is incompatible with that of previous function "rsqrtf"
(declared at line 653 of /usr/local/cuda-13.1/.../crt/math_functions.h)
extern float rsqrtf (float __x) noexcept (true); ...
```

GCC を 15.2 → 14.3 に下げても（`CC=gcc-14 CXX=g++-14` または `-DCMAKE_CUDA_HOST_COMPILER=/usr/bin/gcc-14`）再現する。CUDA 12.9 + GCC 14 でも CUDA 13.1 + GCC 15 でも同根の問題。

## Cause

glibc 2.41（Ubuntu 26.04 "resolute" のシステム glibc）では `__THROW` マクロが `noexcept(true)` に展開される。これは C++17 以降の例外仕様の正規形だが、CUDA Toolkit の cudafe++ フロントエンドは 12.9 / 13.1 とも、一部 prototype で `noexcept(true)` を再宣言として認めない（または既存宣言と衝突するとみなす）。

具体的には:
- glibc 側: `extern double sqrt(double __x) __THROW` → `noexcept(true)`
- CUDA `crt/math_functions.h` 側: `extern float rsqrtf(float __x) noexcept(true)` を override 宣言

cudafe++ がこれを「previous function とは incompatible な exception specification」と判定して error を出す。

GCC を 14 に下げても system include path は同じ glibc 2.41 ヘッダを使うため再発する。host compiler のバージョンではなく **glibc バージョンが原因**。

## Resolution

**現時点（2026-05）で WSL2 + Ubuntu 26.04 + 既存 CUDA Toolkit による直接ホストビルドは不可**。回避策は次のいずれか:

1. **Docker 経由で Ubuntu 24.04 (glibc 2.39) ベースイメージでビルド**:
   ```bash
   docker run --rm --gpus all -v $(pwd):/work -w /work \
     nvidia/cuda:12.9.0-devel-ubuntu24.04 \
     bash -c "apt update && apt install -y cmake build-essential git && cmake -B build -DGGML_CUDA=ON && cmake --build build -j"
   ```
   バイナリを WSL2 側にコピーして実行（runtime は WSL2 側の libcudart で OK）。

2. **配布元の prebuilt を使う**:
   - llama.cpp: https://github.com/ggml-org/llama.cpp/releases に CUDA prebuilt あり
   - PyTorch / vLLM 等の Python ホイール経由では何も問題ない（このバグは nvcc によるホスト C++ コンパイルでのみ発生）

3. **CPU ビルドに留める**:
   `-DGGML_CUDA=OFF`（または同フラグ省略）で通常通り通る。llama.cpp の場合、量子化済みモデル（GGUF）は CPU でも実用速度。

4. **将来的な解決見込み**:
   - CUDA Toolkit 13.2+ または 14.x が glibc 2.41 対応すれば直接ビルド可能になる
   - もしくは Ubuntu 26.04 の glibc が `__THROW` 展開を後方互換へ巻き戻すパッチを入れた場合

**やってはいけない誤対応**:
- `-allow-unsupported-compiler` だけで進めようとする → CUDA 内部ヘッダ衝突に変わるだけで通らない
- システム glibc を downgrade する → APT 依存が壊れて OS が起動不能になる致命傷リスク

## Evidence

2026-05-02 の WSL2Manager プロジェクトでの llama.cpp CUDA ビルド試行で再現:

- CUDA Toolkit 12.9.86 + GCC 15.2.0: 6 errors（mathcalls.h 行 83 / 85 / 206 に各 2 件）
- CUDA Toolkit 12.9.86 + GCC 14.3.0 (`-DCMAKE_CUDA_HOST_COMPILER=/usr/bin/gcc-14`): 6 errors → 6 errors（同様）
- CUDA Toolkit 13.1.115 + GCC 15.2.0: 2 errors（mathcalls.h 行 206 のみ）
- CUDA Toolkit 13.1.115 + GCC 15.2.0 + `-DCMAKE_CUDA_FLAGS=-allow-unsupported-compiler`: rsqrtf incompatible exception specification 2 errors

CPU ビルド（`-DGGML_CUDA=OFF`）は同環境で完了。llama-cli / llama-server バイナリ生成成功。
