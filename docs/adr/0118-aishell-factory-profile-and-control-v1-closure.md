# ADR 0118: AIShell工場診断のfactory profile着地と、Control aishell-core-integration-v1の閉鎖

- Status: accepted
- Date: 2026-07-25
- 対象: AIShell工場診断の公開面裁定、schema維持判断、Control `aishell-core-integration-v1` の finalize／archive

## 事実

- AIShell 0.3.0 は MCP tool `factory_diagnostics` を既定catalogで公開したが、その commit は branch `kitepon-rgb/factory-diagnostics` にのみ存在し `main` の祖先ではなかった。0.3.1 が `main` から catalog を再設計して以降、出荷物（〜0.3.6）にこの面は存在しない。工場側の統合契約だけが、存在しない面を指し続けていた。
- 同様に ServerManager の AIShell optional source も未着地 branch にあり、本番 deploy もそこから行われていた。着地しないまま出す事象は 2 回起きている。
- dotagents の統合 branch は 2026-07-19 時点の内容のまま `main` から 204 commits 遅れており、Codegraph 退役・Lattice 正式編入・旧plan群の archive を取り込んでいなかった。
- Control `aishell-core-integration-v1` は 2026-07-19 に init と phase-gate-record を行った後、Task・Worker Run・Consultation・Campaign を1件も記録していない（revision 1、phase `baseline`）。編入作業の実体は、この Control の外で実行された。

## Decision

1. **工場診断は専用 `factory` tool profile で公開する**。`AISHELL_TOOL_PROFILE=factory` は `factory_diagnostics` 1本だけを返し、既定7／expanded-v1 11／full・legacy 25 のどの一覧にも現れない。`tools/call` は起動時 profile の listedTools 外を拒否するため、profile外からは呼べない。factory profile と `AISHELL_CAPABILITY_SET` の併用は typed error で拒否し、fallbackしない。
2. **既定catalogへ戻す案と、MCP binaryへargvフラグを足すCLI案は棄却する**。既定catalogへの復帰は、運用toolを全model turnの前に置くことになり、catalogを「tokens per solved taskを下げるtool」に絞るAIShellの正典に反する。CLI案は MCP stdio server へ新しい公開契約（argv）を足すもので、公開面の追加に正当化を要求する同正典を満たさない。加えて台帳の `aiterm-mcp` が既に MCP handshake で診断を取っており、「CLIに寄せれば他製品と同型」という当初の採用理由は成立しない。
3. **schema `aishell.native_factory_diagnostics.v1` はversionを上げずに維持する**。payload契約は不変であり、transportとprofileの変更はpayloadの一部ではない。v1を解釈する consumer は dotagents adapter だけで、wire v2〜v4 へ enroll されておらず、BugHub は投影後の product object しか受けない。version を上げると 3 repo の凍結fixtureを書き換えるだけの純コストになる。
4. **`mcp.ready` は起動時catalog検証の結果から導出する**。無条件 true の自己申告は残さない。ただしこの値は tool が呼べる時点で必ず true であり、観測上は常に true である。A' では handshake の成立自体が transport の証拠であるため、このフィールドは冗長だが虚偽ではない。解決したと称さず、この性質を明記して保持する。
5. **Control `aishell-core-integration-v1` は後継を作らず閉じる**。この Control は Task・Worker Run を1件も持たず、編入作業はその外で完了した。完了済みの作業を後から Task として記録することは、共通契約が禁じる証拠再構成にあたる。閉鎖は「campaign を完遂した Control の finalize」ではなく、**使われないまま実体が外で完了した器の閉鎖**として記録する。ServerManager 再着地と wire v5 は別の作業単位であり、必要なら着手時点で新しい Control を declare する。
6. **schema移行の往復は不可逆な傷として記録する**。記録漏れを埋める過程で本 Control を v27→v28→v29→v30 へ移行したが、v30 を解釈できるのは未着地 branch のコードだけであり、`main` 系コードは v28 までしか読めない。v28 へ降格したものの、往復した transition receipt 自体を `main` 系 validator が拒否するため、本 Control は composable branch 系コードからのみ操作可能な状態になった。**書き込む前に読み手を確認しなかった親の誤りであり、隠さず本 ADR に残す**。中身が空であったため実害は閉鎖コストに留まる。
7. **publish・本番deployの対象commitは所有repoの既定ブランチの祖先だけとする**。規則本体は共通憲法「git・shell・ファイルの作法」が正本であり、本 ADR では孤児 release がその規則の導出根拠であることだけを記録する。工場コア製品の release gate は同規則を機械gateとして実装したものだけを合格とし、gate 未実装の製品は次の release wave で導入する。

## 受入条件

- AIShell `main` が factory profile を持ち、0.4.1 が公開され、bare command 名起動で `ready: true` を返す。
- dotagents `main` の adapter が `AISHELL_TOOL_PROFILE=factory` を指定し、公開版に対し `presence=installed` / `native_diagnostics=pass` を返す。
- 既定7／expanded 11／full 25／legacy 25 が変化していない。
- Control `aishell-core-integration-v1` が finalized→archived であり、後継 Control を持たない。
