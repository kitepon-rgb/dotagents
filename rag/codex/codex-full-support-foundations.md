# dotagents Codex 全対応の公式仕様基盤

- 出典: [[raw/customization-order-20260712]]、[[raw/external-agent-import-20260712]]、[[raw/skill-discovery-20260712]]
- 取得日: 2026-07-12
- 確度: 高（公式仕様）＋端末実測

## 結論

1. 全対応の監査軸は、Codex が external-agent import で区別する9面（AGENTS_MD、CONFIG、SKILLS、PLUGINS、MCP_SERVER_CONFIG、SUBAGENTS、HOOKS、COMMANDS、SESSIONS）を基礎にする。
2. Codex の公式ユーザー skill 面は `$HOME/.agents/skills`。symlink は公式対応なので、dotagents の「リポ正本→端末へ symlink」という原則を維持できる。
3. この端末の Codex CLI 0.144.1 は `~/.codex/skills` の既存資産も現在のセッションに列挙している。公式面への切替は legacy 面の消費者ゼロ確認と新規セッション実測を経て行う。
4. `/import` / `externalAgentConfig/import` はコピー型で、既存 skill を上書きしない。GitHub を真実の源とする継続同期には使わず、`detect` を棚卸しの比較器としてだけ利用する。
5. plugin は skills と MCP を配布できる。一方、hooks は公式ページの説明とこの端末の plugin manifest validator / creator skill が矛盾しており、現時点では対応済み仕様として扱えない。dotagents は個人git＋symlink配布と二重化するため、今回の全対応では plugin を採用しない。

## 取得時の異常

`openai-docs` の Codex manual helper は公式応答に `x-content-sha256` が無く失敗した。黙って成功扱いせず、スキルの規定どおり OpenAI Developer Docs MCP で必要箇所を取得した。

## Wave 2 の隔離受入れ実測

- 取得日: 2026-07-12
- 確度: 高（このリポの clean HOME 実行）
- `install.sh --profile official` は Codex skill を `$HOME/.agents/skills` へ symlink 配布し、実 symlink の `apply-codex-config` は dry-run / apply / 冪等 apply を通過した。
- `codex debug prompt-input` は隔離 HOME でも `audit-gauntlet`、`auto-deploy-on-push`、`oracle`、`orchestrate`、`polish-github` をリポの公式 skill 面から列挙した。
- `make ci` は `make lint` と clean HOME test を統合する。GitHub Actions は `@openai/codex@0.144.1` を明示導入するため、applier の Codex TOML parser 依存を黙って skip しない。
- 旧 `~/.codex/skills` は互換 profile として隔離検証済みだが、実端末の公式面移行と旧 symlink 撤去は H 承認後の別作業である。
