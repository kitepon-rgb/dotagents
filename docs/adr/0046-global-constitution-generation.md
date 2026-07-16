# ADR 0046 — グローバル憲法を共通正本とhost deltaから生成する

- 日付: 2026-07-16
- 状態: accepted

## 文脈

Claude Code用`claude/CLAUDE.md`とCodex用`codex/AGENTS.md`は共通条文を重複保持していた。逐語parity検査は片側だけの変更を検出できても、二つの手編集正本そのものを解消できない。また、通常Markdownリンクを置くだけでは、各runtimeが必須条文をinstructionとして自動展開する保証がない。

## 決定

- `shared/constitution.md`を人格・応対・安全・調査・計画・git・報告に関する唯一の共通手編集正本とする。
- Claude Code固有条文は`claude/CLAUDE.delta.md`、Codex固有条文は`codex/AGENTS.delta.md`だけに置く。
- `bin/render-global-constitution.mjs --write`が共通正本と各deltaを決定論的に合成し、runtimeへ直接配る完全な`claude/CLAUDE.md`と`codex/AGENTS.md`を生成する。生成物は直接編集しない。
- 既存条文に強さの差がある場合は、安全側の強い契約を共通正本へ採用する。今回のpush・force・履歴改変は、すべてユーザーの明示指示時だけ許可する。
- `--check`と`make lint-constitution`は生成物driftを非0で拒否する。install先とsymlink構造は変更しない。

## 受入証拠

- focused: `make test-constitution`は4/4成功、fail 0、skip 0。
- related: `make lint-constitution`、`make lint-js`、`make lint-sh`、変更Markdownの固定版markdownlint、`make test-install`が成功。
- 生成物サイズ: Claude 19,165 bytes、Codex 21,437 bytes。Codex既定の32 KiB注入上限内。
- full: `make ci`は今回の変更外である`docs/adr/0043-o3-claude-provider-adapter-boundary.md:60`の既存MD012 1件で`lint-md`停止。停止後のfull suiteは未実行であり、full greenとは扱わない。

## 影響と戻し方

共通条文の更新箇所は一つになり、host差分だけが分離される。既に起動中のセッションは起動時instructionを再読込しないため、新しい生成物の適用は新規セッションからになる。戻す場合は、このwaveの生成元・generator・生成物・gate・文書追従を同じ単位でrevertし、二重正本へ戻る影響を明示する。
