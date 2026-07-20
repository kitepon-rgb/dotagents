# ADR 0100: cf-0126 工場コア8製品の必須面受入

- Status: Accepted
- Date: 2026-07-20
- Scope: Lattice `codex-full-support/cf-0126`
- Evidence: ADR 0095、ADR 0097

## Decision

工場コア8製品（Caveat、Throughline、Spotter、Lattice、MarkItDown、gpt-connector、aiterm-mcp、
codex-sidecar）は、onboarding、README、親別connector matrix、`verify-install`の必須面へ収容済みである。
ADR 0095が4 hostのpresence、version、親別connector、Spotter project契約、代表read-only E2Eを直接受け入れ、
ADR 0097が同一revisionからのofficial installと`verify-install`を4 hostで再現済みなので、`cf-0126`を完了する。

独立Codegraphはコア製品でもfallbackでもない。コード構造面の代表疎通はLattice提供
`codegraph_status`の`provider: lattice`／`sensor_owner: lattice`で受け入れる。廃止済み`codex-rc`は
利用、探索、復活せず、GitHub履歴だけを残す。

## Required surfaces

| 面 | 正本・検証 |
|---|---|
| onboarding | `AGENTS.md`の前提確認で8 CLIと`lattice-mcp`、独立Codegraph非導入を必須化 |
| README | 工場コア8製品、導入CLI、親別MCP、更新経路、`verify-install`必須を明記 |
| 親別matrix | `docs/05_codex-fragments.md`でClaude/Codexの`codex-sidecar`、`aiterm`、`gpt_connector`、`caveat`、`lattice`を固定 |
| verify-install | 8 CLI、MarkItDownのuv所有、Caveat private、Spotter marker/context/hooks/catalogをfail-closed検査 |
| 4 host receipt | ADR 0095の製品別matrixとADR 0097の再現可能rollout |

## Representative connectivity

- Spotter: dotagents project限定activation、marker、Claude/Codex別catalog、Throughline context、hook ledger
- Lattice / code structure: Lattice native diagnosticsとLattice提供`codegraph_status`
- MarkItDown: 4 hostのlocal fixture変換
- gpt-connector: 4 hostのstdio contract、MacのClaude/Codex両親から同一consult回収
- aiterm-mcp: 4 hostのJSON-RPC initialize／diagnostics、同日execution receipt
- codex-sidecar: 4 hostのpackage整合、auditor read-only dry-run、同日execution receipt

unsupported、unverified、第三者依存failureはADR 0095の値を維持し、greenへ丸めない。Lattice製品repoは
変更していない。

## Focused verification

- `./bin/verify-install.sh --profile official`: green
- `node --test tests/lattice-cutover/wire-v4.test.mjs`: 5 / 5 pass
- `git diff --check`: green

## Rollback

新しい配布・設定変更はない。本Decisionを戻す場合はこのADRと対応するLattice完了eventを正規reopenで取り消す。
