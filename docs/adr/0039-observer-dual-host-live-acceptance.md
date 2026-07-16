# ADR 0039: Observer queue 19e dual-host live cross-repo receipt

日付: 2026-07-16

## Status

Accepted。factory master queue 19eの通常系dual-host live Hだけを完了とする。Observer Phase O2全体は
P5-3のfull regression、独立重監査、knowledge returnが完了するまで閉じない。

## Accepted contract

1. Claude ObserverはAitermの公開`claude_agent`で利用者可視な同一PTY sessionを維持し、初回と
   follow-upのcompleted turnを同じgenerationへ投入する。
2. Codex Observerは公開app-serverのdurable threadを維持し、bootstrap turnが`completed`となった後だけ
   generationをreadyにする。
3. Throughline L2は親completed-turnの証拠であり、Observer cognitionの代替ではない。Supervisorは非AIの
   delivery、exact-once、recovery、停止制御だけを担う。
4. 通常停止ではcaller cancel後にprovider sessionをterminalへ回収し、pending reservation、cycle、
   model operation、managed processを残さない。
5. 実host設定はcampaign開始時のarchiveへexact rollbackし、candidate設定を残さない。

## Evidence

- Observer ADR 0139。Claude r12とCodex r11はいずれも親completed feed 2件、同じObserver generationの
  completed cycle 2件、初回cycle後65秒超、pending stateなし、caller cancel／host terminalを満たした。
- ClaudeはAiterm公開initial／follow-up／exact result／`pty_close`、Codexは公開parent app-server／
  production caller／terminal closeだけを使った。両campaign projectは空のままである。
- 最初のconfig archiveと復元後のClaude／Codex設定はdigest、mode 0600、uid 501、gid 20が一致した。
  復元後のcandidate dry-runは両providerで`changed=yes`となり、candidate設定が残っていない。
- campaign中に再現した欠陥は成功へ丸めず、所有repoで独立修理した。
  - Aiterm `4d3befd`: 初回TUI readyの連続安定化。pure 21/21、focused 4/4、related 113/113、build green。
  - Observer `396cf05`／`b044690`: Aiterm／Codex child signal隔離。focused 9/9・13/13、related 43/43・69/69。
  - Observer `ebd8ae6`: cycleごとのexact AI output契約。focused 12/12、related 52/52。
  - Observer `9eb4a7e`: Codex bootstrap terminal ready gate。focused 17/17、related 111/111、check green。
  - Throughline `95a3233`／`0366bb8`: completed projectionのbounded writer競合待ちとlive再受入。
    focused 16/16、related 78/78。製品側の不変証拠はThroughline ADR 0013。
- raw session／thread／turn ID、prompt、model output、credentialは受入証拠へ保存していない。

## Not accepted

- intentional crash、通信断、timeout注入、credential／login。これらは実行ごとに別の明示承認を要する。
- publish、push、本番deploy。
- Observer Phase O2の最終full regression、独立重監査、knowledge return。
- O3以降、Latticeの研究・設計・正典還流。

## Next gate

Observer製品repoのP5-3として、変更後HEADに対するfull regressionを一回、独立重監査を一回だけ行う。
P0/P1残存を閉じ、knowledge returnとControl finalizationを完了してから本書のO2 gateを閉じる。

## Rollback

dotagentsの本receipt／親子計画更新commitだけをrevertする。Observer、Aiterm、Throughlineの製品修理と
各製品ADRは独立履歴として維持し、製品側rollbackは各ADRに従う。実host設定はすでにcampaign開始時の
archiveへ復元済みである。
