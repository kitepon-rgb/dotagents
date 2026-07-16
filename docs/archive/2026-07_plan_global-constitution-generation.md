# グローバル憲法の単一ソース生成化

更新: 2026-07-16

## 目的

`claude/CLAUDE.md` と `codex/AGENTS.md` に重複している共通憲法を一つの正本へ集約し、host 固有差分と決定論的に合成した生成物だけを各 runtime へ symlink 配布する。runtime に外部 Markdown の追加読込を依頼せず、起動時に必要な全文が直接注入される契約を維持する。

## F / A / H

- **F（親直轄）**: 共通／host 固有の境界、生成物契約、既存条文の強い側への統合、最終受入。
- **A（親直実装）**: generator、検証、fixture、文書追従。別セッションとの write scope が非交差で、委譲利益がないため親が実装する。
- **H**: なし。端末設定、credential、publish、push、履歴改変は行わない。

## 成功条件

- [x] `shared/constitution.md` が共通憲法の唯一の手編集正本になる。
- [x] Claude／Codex 固有条文が各 delta にだけ置かれる。
- [x] `claude/CLAUDE.md` と `codex/AGENTS.md` は生成元を明記した完全な生成物になる。
- [x] generator の `--write` が冪等で、`--check` が生成物 drift を非0で拒否する。
- [x] `make lint-constitution` と関連fixtureが生成契約を検証する。
- [x] install／verify の既存symlink契約を変えずに維持する。
- [x] 生きた文書と既存RAGが新しい正本・Codex global AGENTS仕様へ追従する。
- [x] focused／related／full gateの結果と未検証範囲を記録する。

## 非目標

- project root の `AGENTS.md`／`CLAUDE.md` の役割を変更しない。
- `~/.claude/settings.json`、`~/.codex/config.toml`、hook、model／effortを変更しない。
- 別セッションの未コミット差分、既存5コミット、進行中planを収容・commit・pushしない。

## 既知の罠

- Codexはglobal scopeで`AGENTS.override.md`か`AGENTS.md`の最初の非空1ファイルだけを読む。通常Markdownリンクを共通憲法の自動注入として扱わない。
- 生成物を手編集できる状態に戻すと二重正本が再発する。CIは逐語parityではなく、生成元からの完全一致を検査する。
- 並行workspaceではpathspec外のdirty、stage、commitを触らない。本作業ではcommit自体を行わない。

## 検証

- focused: generator fixtureと`--check`の成功／drift拒否。
- related: `make lint-constitution`、`make lint-md`、`bash tests/install/clean-home.sh`。
- full: Phase完了時に`make ci`を1回。既存環境要因で失敗した場合は失敗scopeと未検証を明記する。

## 検証結果

- focused: `make test-constitution`は4/4成功、fail 0、skip 0。冪等生成、drift拒否、不正引数拒否、共通／host契約の非交差を確認。
- related: `make lint-constitution`、`make lint-js`、`make lint-sh`、変更Markdown 16ファイルの固定版markdownlint、`make test-install`が成功。隔離HOMEでClaude／Codex生成物と新generatorのsymlinkを確認。
- size: `claude/CLAUDE.md`は19,165 bytes、`codex/AGENTS.md`は21,437 bytesで、Codex既定の32 KiB注入上限内。
- full: `make ci`は既存・依頼外の`docs/adr/0043-o3-claude-provider-adapter-boundary.md:60`にあるMD012 1件で`lint-md`停止。今回の変更Markdownは0 errorで、停止後のfull suiteは未実行。既存ADRは別セッション所有のため変更していない。
