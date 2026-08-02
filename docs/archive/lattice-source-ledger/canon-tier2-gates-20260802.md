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
