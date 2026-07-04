---
id: cuda-cudart-13-x-install-usr-local-cuda-symlink-auto-nvcc
title: cuda-cudart-13-X の単体 install で /usr/local/cuda symlink が auto モードで切替され nvcc が壊れる
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - cuda
  - apt
  - alternatives
  - symlink
  - nvcc
  - ubuntu
  - wsl2
environment:
  os: Ubuntu 26.04 LTS (WSL2)
  arch: x64
  node: 22.22.1
  cuda_repo: developer.download.nvidia.com/compute/cuda/repos/wsl-ubuntu/x86_64
  packages: cuda-toolkit-12-9 12.9.1-1 (existing) + cuda-cudart-13-1 13.1.80-1 (newly added)
source_project: null
source_session: 2026-05-01T18:15:35.173Z/c57182ce801c
created_at: 2026-05-01
updated_at: 2026-05-01
last_verified: 2026-05-01
---

## Symptom

既に `cuda-toolkit-12-9` を install して `/usr/local/cuda` が `cuda-12.9` を指している環境で、別バージョンの **runtime のみ** を追加しようと `cuda-cudart-13-1`（または 13-X 系）を install すると、apt のログに次が出る:

```
update-alternatives: using /usr/local/cuda-13.1 to provide /usr/local/cuda (cuda) in auto mode
```

その後の症状:
- `nvcc --version` が「No such file or directory」（cuda-13.X の `bin/` は runtime 単体 install では空のため）
- `~/.bashrc` の `PATH=/usr/local/cuda/bin` 経由で動いていたビルドスクリプトが軒並み壊れる
- `ls -l /usr/local/cuda` の symlink が cuda-12.9 ではなく `/etc/alternatives/cuda` → `/usr/local/cuda-13.1` を指すようになる

「runtime ライブラリだけ入れたつもり」「Toolkit 全体を入れた覚えはない」のに、既存の CUDA 環境が壊れたように見える。

## Cause

NVIDIA の CUDA debian パッケージ群は debian alternatives システムに登録される設計。複数バージョンが install されている環境で、auto モードでは **最大バージョン番号を持つもの** が priority で勝って自動選択される。

`cuda-cudart-13-X` は `cuda-toolkit-13-X-config-common` を依存に引き連れて install され、これが alternatives に「cuda-13.X を `/usr/local/cuda` に登録」というエントリを足す。13.X は 12.X より priority が高い扱いになり、symlink が切り替わる。

Toolkit 全体ではなく **runtime ライブラリ単独のインストール** でも、alternatives 登録の副作用は同じく発生する。

## Resolution

**症状が出たら**:
```bash
sudo update-alternatives --set cuda /usr/local/cuda-12.9
```
これで symlink が cuda-12.9 に戻り、**かつ manual モードに切り替わる**ので、今後の追加 install で勝手に上書きされなくなる。

**確認**:
```bash
sudo update-alternatives --display cuda    # 現在の選択と priority 一覧
ls -l /usr/local/cuda                      # symlink 先
/usr/local/cuda/bin/nvcc --version         # 期待のバージョンが出るか
```

**複数バージョン併存させたいケース**（例: 既存 CUDA 12.9 で nvcc を使いつつ、別ツールが `libcudart.so.13` を要求するため CUDA 13.X runtime だけ追加で入れたい）:

1. `/usr/local/cuda` の symlink は希望のバージョンに固定（上記 `--set` で）
2. 並走させたいバージョンの runtime path を `LD_LIBRARY_PATH` に追加:
   ```bash
   export LD_LIBRARY_PATH="/usr/local/cuda-13.1/targets/x86_64-linux/lib:${LD_LIBRARY_PATH}"
   ```
3. `libcudart.so.12` と `libcudart.so.13` はファイル名が異なるので、**両方を `LD_LIBRARY_PATH` に入れても衝突せず両方解決される**。

**事前の予防**:
NVIDIA の CUDA パッケージを追加 install する前に `sudo update-alternatives --set cuda /usr/local/cuda-XX.Y` で manual モードに固定しておけば、auto 切替を完全に回避できる。

## Evidence

2026-05-02 の WSL2 (Ubuntu 26.04) で再現。元状態:
```
/usr/local/cuda -> /etc/alternatives/cuda -> /usr/local/cuda-12.9
nvcc V12.9.86 が動作
```

`sudo apt-get install cuda-cudart-13-1` 実行直後:
```
Setting up cuda-toolkit-13-1-config-common (13.1.80-1) ...
Setting alternatives
update-alternatives: using /usr/local/cuda-13.1 to provide /usr/local/cuda (cuda) in auto mode
```

→ `/usr/local/cuda` が 13.1 を指し、`/usr/local/cuda-13.1/bin/` は存在しないため `nvcc` 起動不能。

`sudo update-alternatives --set cuda /usr/local/cuda-12.9` で復旧確認:
```
update-alternatives: using /usr/local/cuda-12.9 to provide /usr/local/cuda (cuda) in manual mode
```
nvcc V12.9.86 が再び動作。
