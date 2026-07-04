---
id: node-datachannel-windows-arm64-surface-pro-x-woa-arm64-vm-prebuild-x64-2026-05
title: 'node-datachannel: Windows arm64 (Surface Pro X / WoA / arm64 VM) は prebuild なし — x64 のみ対応 (2026-05 時点)'
visibility: public
confidence: confirmed
outcome: impossible
tags:
  - node-datachannel
  - webrtc
  - windows-arm64
  - prebuild
  - platform-support
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
  package: node-datachannel
  runtime: Node.js
  missing_platform: win32-arm64
  supported_platforms: darwin-arm64, darwin-x64, linux-x64, linux-arm64, win32-x64
source_project: null
source_session: 2026-05-15T02:06:23.396Z/395b21eb2588
created_at: 2026-05-15
updated_at: 2026-05-15
last_verified: 2026-05-15
---

## Symptom

Windows arm64 環境 (Windows on ARM / Surface Pro X / Parallels Windows on Apple Silicon) で `npm install node-datachannel` が prebuild バイナリを取得できず、native build にフォールバックして CMake / VC++ build chain が要求される. build chain を入れても `libdatachannel` 依存のコンパイルで失敗する場合あり. 結果として Windows arm64 上の Node.js から WebRTC を使う既製パッケージが事実上無い.

## Cause

[node-datachannel](https://github.com/murat-dogan/node-datachannel) の prebuilt binary は darwin-arm64 / darwin-x64 / linux-x64 / linux-arm64 / **win32-x64** を提供するが、**win32-arm64 (Windows on ARM) は未提供** (2026-05 時点). 上流の `libdatachannel` (C++) 自体は Windows arm64 でビルド可能だが、node-datachannel の CI が Windows arm64 runner を持っておらず prebuild を出していない.

## Resolution

回避策:
1. **Windows x64 を要求する** (Surface Pro X など WoA は対象外と明記). Intel/AMD x64 Windows なら prebuild が効く
2. **WSL2 (linux-x64) で動かす** — Windows host から WSL2 内の Node.js で node-datachannel を使う. ただし WebRTC の network namespace が WSL2 の Hyper-V vNIC 経由になるので NAT 越え挙動が変わる可能性
3. **別の WebRTC binding を探す** — werift (pure TS, slow) / @roamhq/wrtc (Google libwebrtc, アーキ対応広いが maintenance 状態確認)
4. **Windows arm64 を捨てる** — codex-link-p2p では実際にこの判断 (apps/win-host/ を空殻のまま archive)

将来 node-datachannel が CI に Windows arm64 runner を追加すれば解消. 採用前に release tags の prebuild artifact 一覧 (`node_modules/node-datachannel/build/Release/` または upstream GitHub Release assets) を確認すること.

## Evidence

codex-link-p2p docs/roadmap.md "MVP 後 phase" セクションに `Phase 15: Windows Host. node-datachannel が Windows arm64 を将来サポートしたら追加 (2026-05 時点で x64 のみ)`. POSTMORTEM.md セクション 6 でも記録. apps/win-host/ ディレクトリ自体は作ったが実装には入れず.
