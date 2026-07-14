# Elastic Multi-Agent Orchestrator 現状監査・設計裁定計画

Status: Phase 0 audit queued (implementation not approved)

## 目的

既存の統括正典を維持したまま、任意数の論理Taskを複数Executorへ配置する
backend-agnosticな制御面が本当に必要かを確定する。提案をそのまま実装せず、既存の
contract / skills / agents / hooks / CLI / installer / testsと各実行入口の実挙動を一次根拠に、
再利用、矛盾、重複、過剰設計、MVP非目標を親が裁定する。

`got-connector` という提案中の表記は、オーナー確認により現行コア製品
`gpt-connector`（MCP ID `gpt_connector`）のことである。別Executorとして登録しない。

## 着手裁定

- Phase 0 読み取り監査: `A`。sorter / refuter / 外部実行レーンを使える。
- 共通契約、依存方向、state所有、F/A/H、finalizationの最終裁定: `F`。親直轄。
- credential / login、publish / deploy、本番外部状態変更、意図的障害試験: `H`。

## 監査対象

- `shared/orchestrate/contract.md`
- `codex/skills/orchestrate/SKILL.md`
- `claude/skills/orchestrate/SKILL.md`
- `codex/agents/*.toml` / `claude/agents/*.md`
- `docs/02_models.md` と現行の生きたplan
- `bin/verify-codex-agent-routing.sh`
- `bin/onset-gate-hook.sh` / `bin/codex-callout-hook.sh`
- `.codex-sidecar.yml`
- `gpt-connector` / `aiterm-mcp` / `codex-sidecar` の正典・設定・起動・回収経路
- `install.sh` / `bin/verify-install.sh` / 関連tests

## TODO

### Phase 0A: 既存契約と重複の棚卸し

- [x] 提案中の `got-connector` を `gpt-connector` の表記揺れと確定する。
- [ ] caveatと`rag/INDEX.md`を先に検索する。
- [ ] 上記の監査対象を全文確認し、提案項目と既存機構の対応表を作る。
- [ ] Task / Role / Executor / Worker Run / Finding / Decision / Approvalのうち、既に
  正典化済み・未実装・不要な重複を分類する。
- [ ] 「子からの入れ子Codex禁止」と、オーナーの外部Codex発行許可の矛盾を裁定候補にする。
- [ ] Ledger / hook / Throughline / BugHub / 各製品stateの所有境界を図にし、責務逆流を検出する。

### Phase 0B: Executor実挙動と能力matrix

- [ ] Codex nativeの実capacity、routing smoke、follow-up、cancel/timeout、runtime handleを確認する。
- [ ] `gpt_connector`のconsultation専用契約、session回収、model/effort、timeoutを確認する。
- [ ] `aiterm-mcp`のCodex/Grok/Composer session ID、継続入力、完了検出、中断、workspace、失敗分類を確認する。
- [ ] `codex-sidecar`のconcurrency、worktree ownership、read-only強制、job回収、cancel/timeoutを確認する。
- [ ] Claude internal agentの現行capacityと委譲契約を確認する。
- [ ] unknown capabilityを`true`や無制限に丸めず、一次仕様・code・実測の根拠付きmatrixを作る。

### Phase 0C: 実装前設計裁定

- [ ] `git rev-parse --git-path`が通常repo / linked worktree / bare / non-git / 複数writerに適合するか実測する。
- [ ] snapshot + append-only eventsの二重書きとcrash consistencyを検討し、MVPに必要か裁定する。
- [ ] 外部dependency無しのschema validation範囲とmigration責務を裁定する。
- [ ] write scopeはfile/directoryに限定し、globはMVPから外すべきか検証する。
- [ ] independence L0–L4の機械判定範囲とAI裁定範囲を分離する。
- [ ] scheduler scoring、campaign/barrier、自動adapter、hook hard-failのうちMVPの過剰設計を棄却する。
- [ ] privacy、secret、prompt/evidence保存上限、archive/cleanup/backup契約を裁定する。

### Phase 0D: 反証と親裁定

- [ ] Find 結果をDedupし、提案の矛盾・重複・過剰設計の各指摘を独立refuterに殺させる。
- [ ] 別lineageのCriticに「必要な制御面を削りすぎていないか」を監査させる。
- [ ] 件数遷移、棄却理由、未確認能力、MVP非目標を記録する。
- [ ] 親が修正版MVP、段階導入、受け入れ条件、不採用項目を根拠付きで提示する。
- [ ] オーナーの裁定前にLedger core / adapter / scheduler / hookを実装しない。

### Phase 1以降（Phase 0裁定後の候補、未承認）

- [ ] 承認された最小Ledgerとglobal gatesのみを独立waveで実装する。
- [ ] dogfoodで必要性が実証されたExecutor adapterを1本ずつ追加する。
- [ ] dry-run scheduler、campaign/barrier、hook advisoryはそれぞれ別裁定・別commitとする。
- [ ] 監査と中規模実装でdogfoodし、永続知識を正典/RAG/Caveat/testsへ還流する。
- [ ] 完了後に本planを`docs/archive/`へ退避する。

## 非目標（Phase 0）

- Ledgerやschedulerを実装しない。
- Codex nativeの製品制約やprovider rate limitを迂回しない。
- worker数、多数決、別processであることを品質・独立性の代理にしない。
- 子に親の裁定、H承認、finalizationを委譲しない。
- 外部Executor固有の差を共通抽象で隠さない。
- 不明な能力を推測でRegistryへ固定しない。

## Phase 0の完了条件

- 一次根拠付きExecutor capability matrixがある。
- 既存機構の再利用表と、提案の矛盾・重複・過剰設計の裁定がある。
- 独立反証を生き残った修正版MVPと、明示的な非目標がある。
- オーナーが実装へ進むかを裁定できる。
