# Factory master runtime maintenance narrative — 2026-07-20

この文書は新規 maintenance ToDo の説明参照だけを所有する。状態・依存・完了証拠の正本は Lattice store であり、この文書からの同期や checkbox 化は行わない。

## Lattice tasks

- [ ] `fm-0646`: FOX WSL2 に残る外部 Codex hook `/home/kite/projects/codex-rc/scripts/codex-rc-user-prompt-hook.js` の stale 登録を所有元と照合して更新または除去し、新規 Codex session で `MODULE_NOT_FOUND` が消え、dotagents 正規 hook だけが実火することを確認する。
- [ ] `fm-0647`: Spotter project hook が Claude TUI の終了時に記録した `SessionEnd / E_UNREACHABLE` を最小再現して原因を特定し、Spotter 所有欠陥なら focused test、version bump、NPM publish、global install、公開後 smoke まで同一 maintenance wave で閉じる。
- [ ] `fm-0648`: この Mac の通常 Claude TUI が端末既定で存在しない `gpt-5.6-sol` を選択して turn を拒否する設定由来を特定し、オーナーのモデル方針を保ったまま有効な Claude model へ正規化して新規 session smoke を通す。
- [ ] `fm-0649`: Throughline のWindows native Codex hook installerがquoted Node commandへPowerShell call operator `&`を付けず失敗するため、製品repoでfocused test、version bump、NPM publish、global install、公開後smokeまで閉じる。
- [ ] `fm-0650`: Spotter のWindows native Codex hook installerがquoted Node commandへPowerShell call operator `&`を付けず失敗するため、製品repoでfocused test、version bump、NPM publish、global install、公開後smokeまで閉じる。
- [ ] `fm-0651`: Caveat のWindows native Codex hook installerがquoted Node commandへPowerShell call operator `&`を付けず失敗するため、製品repoでfocused test、version bump、NPM publish、global install、公開後smokeまで閉じる。
- [ ] `fm-0652`: FOX Windows nativeの`node_repl` MCPがWSL path `/mnt/c/.../node_repl.exe`をcommandへ保持するhost不整合を正規生成元で修正し、native pathで接続smokeを通す。
- [ ] `fm-0653`: FOX Windows native Codex 0.144.6のmodels cacheが`supports_reasoning_summaries`欠落で読めず、refresh child processもtimeoutする状態を公式更新・cache再生成経路で直して新規session警告ゼロを確認する。
