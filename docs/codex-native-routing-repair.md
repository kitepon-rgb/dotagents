# Codex native routing / sandbox 表示修理

## 正本と目的

工程状態の正本は Lattice plan `codex-full-support` の `cf-0154` とする。本書は判断・受入条件・実測証拠だけを所有し、ToDo は二重管理しない。

Windows / WSL2 で Codex native sub-agent を使う際、通常の子利用を routing verifier が不必要に塞がないこと、および role 定義が実効 sandbox を偽って表示しないことを目的とする。Claude と Codex の既存の動作は維持する。

## 着手時の実測

- macOS の現行 Codex native spawn は canonical task name `/root/routing_smoke_uuid` を返し、rollout の `agent_path` も一致した。
- WSL2 の Codex CLI 0.147.0 は canonical task name `/root/wsl_routing_probe` を返し、rollout の `agent_path` も一致した。
- 報告時の `UUID` 応答かつ `agent_path=null` は両環境で再現しなかった。
- role TOML の `sandbox_mode` は実効権限を強制していない。macOS では `danger-full-access`、WSL2 では `workspace-write` を親から継承し、`refuter.toml` の `read-only` と不一致になった。

## 修理範囲

- native routing smoke を Control 配下の書込み Worker に限定する。
- custom agent の role 定義・検証表示・説明を、実効 sandbox が親から継承される契約へ揃える。
- verifier は canonical task name と rollout の厳密一致を維持し、最新 rollout への fallback や曖昧な ID/path 探索を加えない。
- focused test、Grok 4.6 の敵対的検証、macOS と WSL2 の実 native 親試験で受け入れる。

## 対象外

- Codex upstream / Desktop 本体の変更。
- 現行で再現しない UUID-only runtime を推測で支える Control schema 移行。
- hook trust 設定の変更。
- Grok による製品コードの実装。
- Claude の routing / permission 契約の変更。

## 受入条件

- 通常の native audit / refuter 呼出しは事前 routing smoke を要求されない。
- Control 配下の書込み Worker は、spawn が返した canonical task name と同じ rollout を検証できない場合に明示失敗する。
- role 定義と verifier は強制できない sandbox を期待値として表示しない。実効 sandbox は観測値として報告する。
- macOS の関連 focused test と最終 CI が成功する。
- WSL2 の実 Codex 親で spawn・wait・follow-up と routing 検証が成功する。
