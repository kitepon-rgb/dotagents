# ADR 0120: wire v5波におけるコア製品欠陥の同一波修理

- Status: accepted
- Date: 2026-07-25
- 対象: Lattice 0.12.9、gpt-connector 0.4.9、publish祖先gateの適用範囲
- Phase: `aishell-factory-integration` / `pm-maintenance`（gate policy `maintenance-wave`）

## 事実

- wire v5の工程表作成中に、Latticeの`phase_todo_revision.v3`がPhaseを持たない先行planを`carry`すると`phase_id: undefined`を作り、canonical化が素の`TypeError`で落ちることを再現した。CLIには`CONTRACT_VIOLATION`としてしか現れず原因が読めない。
- 同じ作業中に、`applyPhaseTodoRevision`のv1/v2経路がmanifestの`active_revision_digest`を更新しないことを発見した。v3 revisionでmanifestがv2へ昇格したstoreへv2 revisionを当てると、書込みは成功したように見えて以後のread全部が`STORE_INCONSISTENT: manifest_revision_binding_mismatch`で落ちる。実際にdotagentsのstoreがこの状態になり、gitの直前commitから復旧した。
- `lattice plan create`は空store専用で、既存storeには`STORE_WRITE_CONFLICT`を返す。製品文書は「新規planのauthoringにはplan createを使用する」と書いており、実装と食い違っていた。
- gpt-connectorの`consult`が添付の有無に関わらず`CHAT_FAILED: Cannot read properties of undefined (reading 'timeStamp')`で全失敗した。`diagnostics`は`ready`を返しており、接続ではなくchat経路の欠陥だった。上流ChatGPT webappが`sourceEvent.timeStamp`を無条件に読むよう変更されたのに、`page-bridge`が`undefined`を渡していた。
- 工場コアNPM製品のうちpublish祖先gateを持つのはAIShellだけだった。

## Decision

1. **本waveで再現したコア製品欠陥は、記録で終わらせず同一波で修理・release・公開まで閉じる**。Lattice 0.12.9とgpt-connector 0.4.9を公開し、global installと公開後smokeまで完遂した。欠陥ごとに独立plan・Control・ADR・監査は作らず、本waveの`pm-maintenance` Phase一つで扱った。
2. **Phase無し先行planからのcarryは、typed `REVISION_INVALID`で拒否するのが正しい**。Phase割当ての獲得は意味変化であり、carryを通してはならない。`phase_id`を`null`へ正規化して既存の`carry_semantics_changed`へ落とす。世代昇格が必要なら`reset_pending`を使う。
3. **manifest v2の`active_revision_digest`は、v1/v2 phase revisionの活性化でも更新する**。manifest schemaがv2の時だけ書き、v1 memberはこのkeyを持てないため条件付きにする。既存testが`initializeTodoStore`の作るmanifest v1上でしかv1/v2 revisionを試しておらず、この経路が露出していなかったことを記録する。
4. **gpt-connectorは上流が要求する入力を供給して修理する**。DOM Eventと同じ時間基準を持つ最小のevent様objectを`sourceEvent`へ渡す。これは迂回でも握り潰しでもなく、変わった上流契約への追従である。
5. **publish祖先gateは、そのrepoでrelease作業を行う波で同時に導入する**（AGENTS.mdの既存裁定の適用）。本waveでLatticeとgpt-connectorへ導入した。祖先gate未導入はCaveat／Throughline／Spotter／codex-sidecar／aiterm-mcpの残4製品となり、既存裁定どおり次のrelease waveで扱う。

## 帰結

gateは本wave中に5件の実欠陥を止めた——未着地commitからのpublish（2製品）、`npm version patch`が更新した`package-lock.json`のcommit漏れ、gate script自身のeslint globals不足、`src/version.ts`の追従漏れ。規範を機械gateとして実装する価値が実測で確認された。

Lattice 0.12.9の修理（Decision 3）は本wave中に実運用で検証された。修理後、v3で`reconciled`なmemberへv2 revisionを適用して`wv5-0140`の作業内容を訂正したが、storeは`reconciled`のまま読めた。修理前は同じ操作がstoreを破壊していた。
