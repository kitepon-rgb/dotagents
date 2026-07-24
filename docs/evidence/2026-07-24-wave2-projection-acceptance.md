# Wave 2 fm-0666 受入記録: Lattice read-only projection

- Control: composable-orchestration-v2 / Task: w2-lattice-readonly-projection / Run: wave2-projection-run-1
- Executor: aiterm codex_agent（gpt-5.6-terra×medium・session wave2-projection-run-1）
- packet_digest: d0337c5ab2cc82d9b03ba6cd1d62d5dade3502d2838f1278fe3725edee8d779e

## 受入差分（1往復）

初回成果は `result_digest`／`frontier_digest` を dotagents 側 canonicalJson で再計算照合していた。digest 計算方法は Lattice 公開契約に無い内部実装であり、公開契約外への exact 結合（ADR 0116 refuter 指摘3と同型）として親が差し戻し。同一 Run 相関で修正され、形式検証（64 hex）＋透過のみへ変更された。

## 親検証（gate 再実行）

- `node --test tests/orchestrate/lattice-projection.test.mjs`: 7/7 pass（親再実行）
- `make lint`: pass（親再実行）
- diff 実読: exact key 検証・4値 state enum・stdout 優先判別・version_mismatch の観測 schema 同梱・run namespace 分離コメントを確認
- 書込は許可3パスのみ（lib/orchestrate/lattice-projection.mjs・tests/orchestrate/lattice-projection.test.mjs・tests/orchestrate/fixtures/lattice-projection/）
