# ADR 0038: Observer Claude generation lifecycle cross-repo receipt

日付: 2026-07-16

## Status

Accepted。factory master queue 19dとObserver P5-1b4の非H実装を完了とする。次工程はqueue 19eの
dual-host live Hであり、本receiptをlive成功へ読み替えない。

## Accepted contract

1. Claude ObserverはAitermの利用者可視な永続PTY sessionとして立ち、通常completed cycleは同じsessionへ
   順次投入する。completed turnごとの`claude -p`やfresh evaluatorへ戻さない。
2. Throughline L2はcompleted-turn証拠であってObserver cognitionの代替ではない。Supervisorは非AIの
   delivery、exact-once、recovery、CAS、generation activation、Mailbox制御だけを担う。
3. planned rolloverとsame-provider parent rebindは、旧sessionのstructured closeを耐久化した後だけ
   generation固有の別sessionを起動する。
4. launch response lossは同じ`launch_operation_id`と引数identityを持つ`claude_agent` exact replayだけで
   回収する。`claude_turn(operation_not_found)`、旧background Claude、Codex、別sessionへfallbackしない。
5. initial caller再開は明示`expected_previous_watch_id=current watch`を伴う同一identityだけに限定し、
   parent rebindは既存journalから同じauthorizationを回収して再発行しない。

## Evidence

- Aiterm: `056e0a4`でstructured `pty_close`、`affc2df`でexact launch replayを実装した。
  exact replay gateはfocused 6/6、related 96/96、full 269/269。
- Observer: `7bfafa4`。correction characterization 17/20 green・3 failからfocused 20/20 green、
  related 50/50、`npm run check`／`git diff --check` green、Phase full 393/393、fail 0、skip 0。
- full初回の既存Mailbox fixture 2失敗はproduction無変更の固定時計補正 `0893cd6`へ独立分離した。
- 独立重監査はP0 0、P1 3、P2 0。実装欠陥2件を採用・補正し、残る証拠再束縛指摘は補正後gateで閉じた。
- Observer P5-1b4 Controlはrevision 61 finalize／62 archive、最終監査Controlはrevision 19 finalize／
  20 archive。いずれも未解決、unknown、uncollectedは0。
- Observer側の不変Decisionは`docs/adr/0124-aiterm-claude-generation-lifecycle-acceptance.md`。

## Not accepted

- 実Claude／Codex model request、hook trust、session生成、実host crash／停止、credential、login。
- publish、push、本番deploy、端末設定apply、意図的障害試験。
- cross-provider parent rebind、Latticeの研究・設計・正典還流。

## Next gate

queue 19eで、Aiterm実Claude初回／follow-up各1 turn、Stop、exact result、session closeとCodex側の
同等証拠を一回のdual-host campaignとして確認する。model requestと実session生成を伴うため、目的・影響・
rollbackを提示した個別H承認後だけ実施する。19e完了前にO3へ進まない。

## Rollback

dotagentsの本receipt／親子計画更新commitをrevertする。Observer `7bfafa4`、Aiterm `affc2df`は各製品repoの
独立履歴として維持し、製品側rollbackは各ADRに従う。
