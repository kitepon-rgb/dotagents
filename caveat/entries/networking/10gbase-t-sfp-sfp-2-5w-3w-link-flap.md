---
id: 10gbase-t-sfp-sfp-2-5w-3w-link-flap
title: 10GBASE-T SFP+ モジュールは SFP+ 規格上限 (2.5W) を超える消費電力 (3W 前後) で熱暴走 → link flap が既知問題
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - networking
  - hardware
  - sfp+
  - 10gbase-t
  - thermal
environment:
  os: win32
  arch: x64
  node: 24.14.0
  hardware: sfp+ cage
  speed: 10gbase-t
source_project: null
source_session: 2026-04-29T11:32:26.633Z/eb69fd03fbfc
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Symptom

10GBASE-T SFP+ モジュール (RJ45 銅線) を 10G スイッチや NIC のケージに刺すと、数分〜数時間で温度上昇に伴い断続接続。`dmesg` や switch ログに link up/down が繰り返し記録される。冷却が効くケージでは安定し、密集ケージでは即フラップする傾向。

## Cause

10GBASE-T の PHY は本質的に 2.5〜5W 消費する規格。一方 SFP+ ケージ規格の電力上限は 2.5W で、放熱面積も狭い。市場の 10GBASE-T SFP+ は規格を実質的に逸脱して 3W 前後で動作するものが多く、ケージの放熱設計次第で熱暴走する。同じモデルでもスイッチ側の冷却で大化けするため「動かない」とは断言できないが、確率的に詰みやすい。

## Resolution

10G 銅線接続が必須でないなら DAC ケーブルか光モジュール (SR/LR) を選ぶのが堅い。10GBASE-T SFP+ をどうしても使うなら (a) ケージ周辺ファンが効いている機種、(b) Broadcom BCM84891L など低消費電力 PHY 採用品、(c) 隣接スロット空けでの放熱確保、を組み合わせる。スペック表の「10GBASE-T SFP+ 対応」だけ見て選んではいけない。

## Evidence

2026-04-29 ServerManager 10G 構成構築時、複数モジュールを試した結果として記録。BCM84891L 系を選定して安定。発熱問題はベンダー間で広く共有されている既知問題。
