# ADR 0123: Observerコア編入の再起票とwire v6

- Status: accepted
- Date: 2026-07-25
- 対象: Observerの製品区分、旧終了裁定、factory wire、製品化・公開・host rollout
- Plan: `observer-core-integration`

## 事実

- Observerはオーナーが自作コア製品として開発した製品である。2026-07-17のowner decisionは、
  Observer用の編入slotを予約し、製品契約・host matrix・adapter・BugHub・migration・rollbackまでを
  独立waveで確定する方針だった。
- 2026-07-21 10:21のmaster-child cutoverは、`of-0478`〜`of-0483`等をpendingのまま
  子計画へ所有移管し、「Observer受入が完了したという主張ではない」と明記していた。
- 同日10:44のcommit `d791866`は、version `0.0.0`、source remote不在、release lineage不在を理由に、
  残taskを実装せず完了化して計画をarchiveした。この裁定は「未製品化だから製品化taskを実行する」
  という元の目的を「未製品化だから編入しない」へ反転させている。
- 2026-07-25時点のObserver `1493b35`は、`npm test` 412件全通過、`npm run check`成功、
  native diagnosticsが`ready`、`npm pack --dry-run`成功である。機能baselineは成立しており、
  残る主な不足はversion、source remote、release gate、公開更新経路とfactory統合である。
- 現役wireはv5・固定13製品である。過去のv3予約slotへ後付けすると、現行v4/v5の契約履歴と
  rollout順序が逆転する。
- MarkItDownは第三者管理製品であり、Observerの自作コア製品裁定とは別区分である。

## Decision

1. **Observerを自作コア製品として正式編入する独立waveを再起票する。**
   `2026-07-21-observer-reserved-disposition.md`とcommit `d791866`は、当時の誤終了を示す履歴として
   保持するが、Observerの最終的な製品区分を決める現行裁定には使わない。旧Lattice taskは
   暗黙再開せず、新計画`observer-core-integration`へ現行作業を一意に登録する。
2. **編入wireはv6・固定14製品とする。** v3は歴史上の予約番号として実装せず、現役v5から
   単調にv6へ進める。v5 endpointとreport履歴をrollback期間中保持し、major越しの履歴を書き換えない。
3. **製品化をfactory編入の前提にする。** Observer自身の契約を正本として、version、repository metadata、
   既定branch祖先を強制するrelease gate、CI、pack/install smoke、diagnosticsを確定する。
   source remote作成、push/tag、registry publish、global installはH操作として、目的・影響・戻し方を
   実行直前にオーナーへ提示して承認後に行う。
4. **v1のrequired platformはmacOSとする。** macOS profileではObserverをrequired、server・WSL・
   Windows nativeでは構造的`unsupported`として報告する。製品契約を変えずにLinux/Windows対応を
   主張しない。
5. **ServerManager/BugHubをserver-firstでv6対応し、その後dotagents clientをcutoverする。**
   schema、期待matrix、privacy、fixture、migration、adapter、host matrix、rollbackを同じwaveで閉じる。
6. **Observerの機能追加を編入waveへ混ぜない。** 現行製品契約の製品化とfactory統合だけを対象にし、
   新しい観測機能、対応platform拡大、第三者製品のpatchは非目標とする。

## レーン裁定

このwaveは次の4条件をすべて満たすため統括レーンとする。

- source remote作成・publish・live host cutoverという計画済み中断がある。
- 製品化、server受入、client受入、host rollout、rollbackの受入が多段連鎖する。
- Observer、ServerManager、dotagentsの複数repo書込みを調整する。
- 誤終了訂正、製品区分、wire major、公開承認の検証可能なDecision証拠が必要である。

## 帰結

Observerは「予約・未編入」のまま放置する製品ではなく、現行コア製品へ昇格させる進行中対象になる。
工場の現役コア管理対象は編入完了時に10製品から11製品へ、wire製品数は13から14へ増える。
完了までは既存v5と10製品裁定を現役運用として維持し、未完了を編入済みとは表示しない。
