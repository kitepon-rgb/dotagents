# canon-layer-redesign Tier 2 gates authoring ledger

> これはLattice起票用の凍結source inventoryであり、進捗正本は`.lattice/todo`である。

- [ ] [P9. 委譲の能力分離](../../plan_canon-zerobase-audit.md#p9-委譲の能力分離): 未強制面に限定し、committerを新設しない。
- [ ] [P10. model/effort省略のdispatch拒否](../../plan_canon-zerobase-audit.md#p10-modeleffort省略のdispatch拒否): Claude C1 deny化に加え、Codex X2・sidecar既定値を設計論点に含める。
- [ ] [P11. writer直列化の強制点](../../plan_canon-zerobase-audit.md#p11-writer直列化の強制点): dispatch ownerごとの強制点として設計する。
- [ ] [P12. 祖先検証gateの残repo展開](../../plan_canon-zerobase-audit.md#p12-祖先検証gateの残repo展開): aiterm-mcp・Throughline・Caveat・Spotter・codex-sidecar等を再棚卸しして展開する。
- [ ] aiterm-mcpのlaunch schemaへrole/sandbox/write_scope宣言を組み込む（P9の本丸・製品側能力壁）。
- [ ] Lattice run start前にverified parallel groupとcompile artifactを検証する製品所有gateを設計・実装する（P11のLattice側強制点）。
- [ ] Codex X2面へ同一repo並行writer検出を展開する（P11のClaude側実測を得た後）。

## 平文設計メモ（2026-08-02・統括裁定。note経路はLattice 0.40.1で復旧し、各工程の正本noteへ転記済み。本節は凍結記録として保持）

- **P9（fm-0687）** 目的: 読み取り専用のはずの子AIが実際には書き込めてしまう面を塞ぐ。何が変わるか: 外部の子AI起動時に「読み取り専用か・どこへ書くか」の宣言が無いと起動を拒否する（宣言はルーティング用であり能力壁ではない。本物の能力壁はCodex側read-only sandbox・sidecarのallowed_pathsが既に持ち、aiterm側の起動schema組込みは別の依存工程で扱う）。経緯: 実装前反証で「dotagents内だけの薄い壁は偽の安心」と判定→dotagents分と製品側依存へ分割。
- **P10（fm-0688）** 目的: 子AIを起動する時のモデル・思考量の指定忘れを物理的に止める（指定忘れは親の高価な設定を黙って継ぎ、費用と品質の事故になる）。何が変わるか: Claude C1 hookとCodex X2 hookが、指定の無い起動を拒否する。例外=repo設定ファイルが既定を固定する入口（codex-sidecar）と役割定義がモデルを固定する入口は「明示と同等」で許可。
- **P11（fm-0689）** 目的: 同じrepoへ同時に書き込む2つ目の作業者を止める（並行書込は互いの変更を踏み潰す事故源）。何が変わるか: 親が外部writerを起動すると予約台帳へ記録され、同じrepoへの2匹目は先行の受入完了・手動解放まで拒否される。時刻による自動解放は作らない（結果不明のまま並行させるのが一番危険）。並列が必要な時はLattice run経由が正規ルート。経緯: 実装前反証で当初案（active runの有無で判定・TTL自動解放）が棄却され、予約・手動解放方式へ再設計。Codex側・aiterm追撃dispatch面への展開は依存工程。
- **P12（fm-0690）** 目的: 「公開してよいのはmainに載ったcommitだけ」ゲート（公開後にそのcommitが後続releaseから消える事故の防止）を、未実装のコア製品repoへ展開する。AIShellの実装（`scripts/verify-release-commit.mjs`＋`prepublishOnly`）が手本。実装済み=AIShell・Lattice・gpt-connector・Observer。残repoの実態は棚卸し調書に従う。

## 完了receipt（2026-08-02・統括受入）

- fm-0693（X2展開）: dotagents `839a704`——spawn_agentへC1同一のscope token・共有writer予約・sentinel直列化を移植。fixture群green。
- fm-0691（aiterm launch schema）: aiterm-mcp `07cb43e`＋`v0.21.0` publish/install——write_scope宣言をreceipt/metadata/pty_listへ記録し、Codex read-onlyは`--sandbox read-only`で実効能力壁化。他レーンはdeclaration_only_unsupportedを明示。
- fm-0692（Lattice run gate）: Lattice `320e05a`＋`v0.41.0` publish/install——`plan compile --todo-plan`のtodo_plan_binding束縛と、artifact消費型`run start`の型付き拒否（INVALID_PLAN_ARTIFACT／COMPILE_ARTIFACT_UNBOUND／STALE_TODO_PLAN_BINDING／TODO_PLAN_TASK_MISMATCH／PARALLEL_GROUP_UNVERIFIED）。138 suites green。
- fm-0687（委譲の能力分離）: dotagents分は`adf2381`（scope宣言token強制）、能力壁の本丸はfm-0691の実装で充足（aiterm 0.21.0）。
- fm-0689（writer直列化の強制点）: 親手順側=`adf2381`（予約台帳）、Codex側=`839a704`（X2展開）、Lattice側=fm-0692（run gate）。dispatch owner 3面すべてに強制点を設置。
- fm-0692: 撤回（上記オーナー裁定・工程はsuccessor revisionで除去）
- aiterm-mcp 0.21.0はオーナー裁定（2026-08-02）で存置確定（省略時挙動不変のadditive宣言欄）
