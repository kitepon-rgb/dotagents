# ADR 0024: Observer Stop hookのstate rootをcampaign全経路で一致させる

日付: 2026-07-16

## Status

Accepted for implementation。queue 19eを保持し、新規live requestより先にcross-repo修理を閉じる。

## Context

承認済みdual-host liveのClaude attemptでmodel応答は成立したが、設定へ適用したObserver Stop hookは
campaign callerのexplicit `--state-root`を持たず、未作成の既定rootで`E_PERMISSION_INVALID`となった。
Throughline completed feedは0件で、sessionは公開close terminalを確認した。これはlive成功ではない。

## Decision

1. `apply-observer-hook-config`はrestore以外で`--observer-hook`と`--state-root`の両方を必須とする。
2. Observer CLIのversioned fragment／verifierへ同じrootを渡し、Claude／Codexへ同一command境界を適用する。
3. 同じexecutable／providerで旧rootを持つentryは別製品hookとして保持せず、canonical一件へ置換する。
4. archive／atomic restore契約は変更せず、最初のarchiveをcampaign前状態へのrollback正本として保持する。
5. prompt、raw session ID、host log、設定本文はDecision証拠へ保存しない。intentional fault、login、push、
   publish、deployは本修理に含めない。

## Acceptance

- `bash tests/install/observer-hook-config.sh`がapply、旧target置換、冪等、失敗rollback、archive restoreを通す。
- `bash tests/install/observer-package.sh`が新しいinstalled CLIと必須state rootでgreenになる。
- Observer側のfocused gateと独立commitを先に受け、その後dotagentsを独立commitする。

## Evidence

- Observer focused 28/28、related 48/48、`npm run check`、対象docs lintはgreen。
- `bash tests/install/observer-hook-config.sh`は旧root target置換、冪等、失敗rollback、archive restoreを通過。
- `bash tests/install/observer-package.sh`は新CLIでinstall／reinstall／verify／rollbackを通過。
- `make lint-py`とdotagents live docs markdown lintはgreen。
