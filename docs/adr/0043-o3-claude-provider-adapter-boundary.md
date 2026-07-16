# ADR 0043: O3 Claude provider adapter境界

- Status: Accepted
- Date: 2026-07-16
- Parent canon: `docs/plan_factory-master.md`
- Control: `observer-factory-20260715` revision 55

## Context

Observer Phase O2の完了後、次のready TODOはPhase O3のElastic provider対称化である。現行v25
ControlはWorker用の`claude-native.session.v1` handleを既に知るが、Executor adapter catalogには
`claude-native`のrequest／observation／failure契約がない。一方、Consultationは
`gpt-connector`とcaller既知`slug`へ固定されており、Claude session IDやCodex thread／sidecar
handleを`slug`へ読み替えると型付き相関とresume契約を失う。

2026-07-15作成の`rag/orchestration/provider-quota-and-claude-runtime.md`は、当時の未認証状態と
background Observer候補を含む調査記録である。その後、親正本とObserver ADR群は、認証済み
Claude headless／resumeのcharacterizationとAiterm persistent sessionによるObserver hostを確定した。
またClaude Code 2.1.211の公開helpでは、`--bare`はOAuth／keychainを読まずAPI keyまたは
`apiKeyHelper`だけを使う契約へ明確化された。

## Decision

1. O3の最初の独立単位は、既存v25 Worker契約を変更せず、`claude-native` execution adapterの
   純粋request／observation／failure projectionを追加する。実model request、login、credential操作、
   network dispatchはこの単位で行わない。
2. Worker startはcallerが生成したUUID、隔離workspace、明示model／effort、明示tool／permission
   policyを受け取る。resumeは同じUUIDだけを使い、`--continue`、推測session、
   `--fallback-model`、`--no-session-persistence`を使わない。
3. subscription OAuth経路へ`--bare`を使わない。`--safe-mode`はproject正典やhookを無効化するため、
   Workerの暗黙既定にも使わない。adapterはcredentialを読まず、親が所有する既存Claude CLI環境を
   変更しない。
4. caller timeoutは成功・失敗へ丸めず`unknown`とし、同じsession IDのprocess状態を回収してから
   resume可否を決める。別sessionや別providerへの切替は、元Runのterminal Decision後に新Runとして
   記録する。
5. `claude-internal`はhost projection専用のまま維持し、dispatch成功へ昇格させない。Observerは
   Worker／Consultationへ入れず、親と同providerの利用者可視な永続AI sessionであり続ける。
6. Consultationの多provider化は別のO3 schema Decisionとする。Claude session IDやCodex handleを
   v25の`slug`へ詰めず、旧v25 active Controlの継続読取、型付きhandle、observe／resume、migration、
   rollbackを一つの独立gateで設計する。Phase O4で予約済みのv26を無断転用しない。

## 未コミット状態の裁定

- `rag/wsl-relay-recovery/`と対応する`rag/INDEX.md`行は、2026-07-14のFOX WSL2 R2 rollout実証であり、
  O3から無関係として放置しない。親正本のPhase R2へ属する未収容成果として、保護指定を維持したまま
  別commit候補にする。
- `tmp/pdfs/cdc_prompt*`は、同日後続のorchestration正典化へ内容が還流済みの中間生成物である。
  正典の証拠へ再利用せず、保護指定に従いこのTaskでは編集・stage・commitしない。
- `codex/rules/default.rules`の`claude -p` allowはO3着手後に生じた端末許可状態である。これはmodel H、
  login、credential、network dispatchの承認ではない。adapter契約と同じcommitへ混ぜず、権限規則として
  別途裁定する。

## Gate

- O3開始baseline: orchestration関連115/115、fail 0、skip 0。
- `claude-native` focused testでstart／resumeの同一UUID、明示workspace／tool policy、timeout unknown、
  terminal projection、failure mapping、禁止flag拒否を固定する。
- source/testと本ADR・親／子planは独立revert可能なcommitに分ける。
