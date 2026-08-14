# GF04G — Control safety-net gate

- 実施日: 2026-08-14
- Control: `grok-factory-application-20260814`
- Control revision: `5`
- phase: `safety_net = completed`
- receipt digest: `685f439d8beea018945f9692e286492633f7c62cc750792985f32182be48ed95`

## 受理した証拠

- Spotter: `evidence/grok-factory-application/GF04S.md`
  (`624b96de32909ab1ec59a96bc55ff564f3c2c6b64746d23e3cf9139acb8cc369`)
- Throughline: `evidence/grok-factory-application/GF04T.md`
  (`da8027ebf629c28189aeffffe27f1e02d0c4de80b9940dbec27852f27ceef100`)

両証拠はRinの敵対的監査を通過した。製品側はtest-only commitのまま、Grok
camelCase envelopeによる契約差と副作用侵入を現行codeでredとして固定している。
製品コード、追加Grok実行、Claude/Codex fixtureの削除はない。

このgateの完了により、Latticeの`GF04SR`と`GF04TR`だけを最小修理工程として
解錠できる。Aiterm、gpt-connector、正式Grok host化、tool DB、auditor、installer、
diagnostics、transcript readerは修理対象へ追加しない。
