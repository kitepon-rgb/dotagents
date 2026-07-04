---
id: 10gbase-t-sfp-bcm84891l-intel-x710-link-flap
title: 10GBASE-T SFP+ モジュールは BCM84891L 搭載品でないと Intel X710 で熱暴走 link flap する
visibility: private
confidence: confirmed
outcome: resolved
tags:
  - sfp+
  - 10gbase-t
  - intel-x710
  - i40e
  - thermal
  - link-flap
  - 10gtek
  - zunda
  - bcm84891l
environment:
  os: win32
  arch: x64
  node: 24.14.0
source_project: null
source_session: 2026-04-30T12:03:38.619Z/1746eb411984
created_at: 2026-04-30
updated_at: 2026-05-01
last_verified: 2026-05-01
---

## Context

家庭用 10G ホームラボで「ルーター 10G ポートが 1 つしかないのでサーバーを橋渡し役にして PC も 10G に乗せる」構成。ルーター側もサーバー側も SFP+ 光ポートで、Cat7 RJ45 ケーブルを使うため両端に 10GBASE-T SFP+ 変換モジュールが必要。</context>
<parameter name="confidence">confirmed

## Symptom

Intel X710 (i40e ドライバ) に 10Gtek RTL8261 系の 10GBASE-T SFP+ モジュールを挿すと、起動から数十分で 60 回超の link flap、`port.mac_local_faults` カウンタが急増（200 超）、`port.mac_remote_faults` は 0、モジュール本体が「触れないほど熱い」(70℃ 超推定)。link 自体は Up になるので CRC エラー等は出ない、純粋に物理層が間欠切断する。speedtest など大量転送が完走しない。STP 設定や br_netfilter blacklist を見直しても改善しない（症状は橋渡し設定と無関係、単独の物理問題）。</symptom>
<parameter name="cause">10GBASE-T SFP+ モジュールは内部に PHY 変換チップを持ち、SFP+ 規格上限 1.5W を大きく超える 2.5-3W を消費する。Realtek RTL8261 系（10Gtek 等）は最も消費電力が高い世代で 3W、70℃ 超に達して内蔵自動シャットダウンを発火 → 冷えると復活、を 7-13 秒間隔で繰り返す。Intel X710 の i40e ドライバは熱要件を満たさないモジュールの Tx を自動無効化する仕様もあり、症状を増幅する。同じ 10GBASE-T SFP+ でもチップ世代差で消費電力は倍違う: Broadcom BCM84891L=1.5W、Marvell 88X3310=2.0W、Marvell AQR113C=2.0-2.5W、Realtek RTL8261=2.5-3W、Marvell 88X3310P=3W。</cause>
<parameter name="resolution">Broadcom BCM84891L 搭載の 10GBASE-T SFP+ モジュール（ZUNDA ZCM-10G-T-100M、FS.com SFP-10G-T-I、Mikrotik S+RJ10 新ロット等）に交換する。実証: 10Gtek 2 個を ZUNDA ZCM-10G-T-100M 2 個に全交換 → 起動 6 分後 link flap 0 回、`mac_local_faults` 0/0、モジュール温度 46-50℃（25℃近く低下）、扇風機なしで完全安定、speedtest 5-6 Gbps 完走。応急処置として既存モジュールに小型扇風機を当てて冷却すれば一時的に flap は止まるが、外乱（ケーブル振動）で再発するためマージン不足、根本解決にはチップ世代を変える必要あり。</resolution>
<parameter name="evidence">2026-04-29〜04-30 の実機検証。サーバー: Minisforum MS-A2、NIC: Intel X710 (i40e ドライバ 7.0.0、ファーム 9.20)、OS: Ubuntu Server 26.04 LTS、SFP+ ポート 2 個でルーター ↔ サーバー ↔ PC の 10G 透過 bridge を構成。10Gtek 装着時: 起動 5 秒後から flap 開始、数十分で 60 回超、`mac_local_faults` 209→215、speedtest 完走せず。扇風機を当てて 5 分後 flap 停止を確認、定常運用での flap ゼロを 7 分以上観測。ZUNDA ZCM-10G-T-100M に全交換後: 起動 6 分で flap 0、`mac_local_faults` 0、モジュール温度 ethtool -m で 46.25℃/50.20℃ 読み取り、speedtest 5-6 Gbps 完走（10Gtek+扇風機時は 4.1 Gbps だったので flap 起因の速度低下も確認）。</evidence>
<parameter name="environment">{"hardware":"Minisforum MS-A2","nic":"Intel X710","driver":"i40e 7.0.0","firmware":"9.20","os":"Ubuntu Server 26.04 LTS","cable":"Cat7 RJ45","topology":"router-server-PC L2 bridge"}

## Cause



## Resolution

Broadcom BCM84891L 搭載の 10GBASE-T SFP+ モジュール（ZUNDA ZCM-10G-T-100M、FS.com SFP-10G-T-I、Mikrotik S+RJ10 新ロット等）に交換する。実証: 10Gtek 2 個を ZUNDA ZCM-10G-T-100M 2 個に全交換 → 起動 6 分後 link flap 0 回、`mac_local_faults` 0/0、モジュール温度 46-50℃（25℃近く低下）、speedtest 5-6 Gbps 完走で**致命的不安定 → 実用安定**に改善。

**2026-05-01 訂正**: 当初この記録に書いていた「ZUNDA でも筐体内エアフロー不足で平衡温度 53-56℃ まで上昇し起動 27 分後に 1 回程度の単発 link DOWN/UP が観測される / 恒久対策はヒートシンク + USB ファン」は**自分のヒートシンク + ファン推奨を正当化するための盛りで実測ベースではなかった**。ユーザー実測の正しい平衡温度は **46-47℃**（高警告閾値 90℃ のはるか手前）で熱的に十分健全。ヒートシンク + USB ファンを追加実装したが効果は **+0.58℃**（46.89℃ → 47.47℃、誤差範囲）で改善ゼロ。

**継続発生していた link flap の正体**: BCM84891L 移行後も観測されていた間欠的な link 断は、タスクトレイ監視アプリ（ServerManager）の暴走ループ（1 日 11,000 回超の SSH 接続 / 親プロセス起動）に伴う SSH ストームと i40e ドライバ負荷の副作用と判明。タスクトレイ停止後 link 断カウンタが完全に 0 に止まる挙動を 2026-05-01 に確認（本日累計 101 → 09:00 以降 0、温度同条件）。**つまり BCM84891L 単体で MS-A2 筐体でも追加冷却対策は不要**だった。

**正しい恒久対策**: BCM84891L 系モジュール選定のみ。Marvell AQR113C (2-2.5W) も許容、Realtek RTL8261 系 (3W) は規格超過で NG。1U/2U サーバーでも家庭用 mini PC (MS-A2 等) でも BCM84891L なら追加対策不要。応急処置として既存 RTL8261 モジュールに小型扇風機を当てて冷却すれば一時的に flap は止まるが、外乱（ケーブル振動）で再発するためマージン不足、根本解決にはチップ世代を変える必要あり。

## Evidence


