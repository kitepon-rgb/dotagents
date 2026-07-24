# wv5-0070 受入証拠 — wire v5設計正本の独立反証

- 日付: 2026-07-25
- 反証者: Grok 4.5（aiterm経由、cross-provider。親はClaude Opus 5）
- 対象: `docs/wire-v5-design.md` 初版

## レーン選定の経緯（隠さず記録する）

規定のcross-provider検証入口は codex-sidecar `codex_review` だが、`AUTH_LEASE_BUSY` で
起動できなかった。実測: オーナーの対話Codex CLIセッションが5本稼働しauth leaseを保持していた。
**それらを落とさず**、別providerのGrokをaitermの対話レーンで起動した。

第2の視点としてgpt-connector（ChatGPT）も試みたが、当初は製品自体が停止しており
（→ wv5-0860で修理・0.4.9公開）、修理後の再試行はcaller側timeoutでjob状態が不確定になり、
製品が仕様どおり再送を拒否した（`JOB_RECOVERY_UNAVAILABLE`）。**単一視点の反証で
Phaseを閉じている**ことを明記する。

## 反証の結果（すべて親が実コードで再確認した）

| 対象 | 反証者の判定 | 親の裁定 |
|---|---|---|
| §1 純B案不可 | 反証不成立 | **維持**。v4 schemaの`additionalProperties:false`とclientの`exactKeys`が物理的に塞ぐ |
| §1「A案が唯一」 | 成立（重大） | **採用**。凍結を破るB′は物理的には可能。政策的棄却と物理的不可能を分けて書き直した |
| §3 `required`+`not_applicable` | 成立（致命的） | **採用**。現行実装は`installed`でしかresolveせず`not_applicable`はhigh issueになる。既存意味論でなく実装変更要求として書き直した |
| §4 乖離2件 | 成立（致命的） | **採用**。§4を全面改訂 |
| §4 凍結非違反 | 確信なし | **維持**（product set/schemaを触らないため）。ただし新規issueの可視化条件を受入項目へ追加した |
| §5 identity / late | 反証不成立 | **維持** |
| §5 storage分離 | 成立（重大） | **採用**。v2/v4は既に同じtableを共有しており「major別分離」は実態でも先例でもなかった |

## 最も重い訂正 — §4の事実認定は誤りだった

初版は「`factoryExpectation()`にv4分岐が無いため全製品が`required`へfall-throughし、
grok-buildがmain-serverで偽warnを出している」と書いた。**誤りだった。**

実コードで確認した評価経路:

```
bughub/src/factory-ingest.js: ingestFactoryReportV4 → save: db.saveFactoryReportV2
bughub/src/db.js:            saveFactoryReportV2   → applyFactoryIssues(..., 'v2')
```

wire v4のreportは`version='v2'`として評価される。v2分岐の`grok-build`=optional／
`claude-code` windows-native=unsupportedがそのまま効いており、**初版が挙げた乖離2件は
どちらも存在しない**。live matrixでも偽warnは観測されなかった。

## 反証が掘り当てた本物の欠陥

v2分岐は`['lattice','aishell']`を無条件に`optional`へ落とす。v4のreportがv2として
評価される以上、**wire v4で必須製品へ昇格させたはずのLatticeは永久にoptionalのまま**である。
コード上のコメント「Latticeはv4でenroll済み」は意図を書いているだけで実装されていない。

**live実測**: BugHub matrixで`fox-wsl`の`lattice`は`missing`。しかし期待値が`optional`
のためexpectation issueは1件も存在しない。**必須コア製品の欠落が4 hostのうち1台で
黙って見逃されている。**

これは初版が書いた乖離とは逆方向で、かつ実害がある。反証を通さなければ、この欠陥を
温存したままv5でaishellにも同じ罠（`['lattice','aishell']`無条件optional）を
再生産していた。

## 反映

`docs/wire-v5-design.md` の §1・§3・§4・§5 を改訂した。§4は全面書き換えとし、
初版の記述を撤回したことを本文へ明記した。
