# plan_plan-gate-hook — 正本化ゲートの機械発火（hook）

<!-- 前提: Fable/Opus 級統括（2026-07 時点）。構造の敷設＝最上位知能の使い所。 -->

「計画文書の作法」の**正本化ゲート**（グローバル CLAUDE.md）は散文だけでは抜ける——
プラン承認直後に実装へ流れ、プランが会話に残って docs/ に正本化されない。
その一番抜ける瞬間（プラン承認＝`ExitPlanMode`）に hook でリマインダを注入し、
ゲートを機械発火させる。2026-07-05 オーナー指摘「掟はあるのに言われないと守らない」から。

## 設計

**アーキテクチャ = 同期ペイロード ＋ 手挿しコネクタ**（`~/.claude/settings.json` は端末固有・非同期のため）:

- **ペイロード（同期される）**: [`../bin/plan-gate-hook.sh`](../bin/plan-gate-hook.sh)。`./install.sh` が `~/.local/bin/plan-gate-hook` へ symlink。**リマインダ文言はこの1ファイルに集約**＝`git pull` で全端末へ伝播する（文言改善が1コミットで波及）。
- **コネクタ（各端末で一度だけ手挿し）**: `~/.claude/settings.json` の `PostToolUse` に `ExitPlanMode` 配線を追加。断片の正典は [03_settings-fragments.md](03_settings-fragments.md)。

**確定事項**（claude-code-guide が公式ドキュメントで検証）:

- プラン承認専用の hook イベントは**無い** → `PostToolUse` + matcher `"ExitPlanMode"` が正解。
- コンテキスト注入 = exit 0 ＋ stdout に `{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"…"}}`。
- ライブ反映（settings.json 変更は次の発火から有効・再起動不要）・`chmod +x` 不要・timeout 既定600s。

**決定した取捨**:

- **TodoWrite には hook を貼らない（v1）**。理由: TodoWrite は些末な用途が多く、毎回発火は alarm fatigue でゲート自体を殺す。TodoWrite 経路は**散文ゲート**（要正当化）がカバーする。将来オプトインで追加余地は残す。
- **依存なし（jq 不要）**。文言に `"`・`\`・生改行を含めず `printf` で JSON 直書き＝どの端末でも動く。

## TODO（消化チェックボックス＝この plan が TODO を兼ねる）

- [x] `bin/plan-gate-hook.sh` 作成（`set -uo pipefail`・常に exit 0・valid JSON）
- [x] `docs/03_settings-fragments.md` に配線断片を追加
- [x] `./install.sh` 再実行 → `~/.local/bin/plan-gate-hook` symlink 確認
- [x] `make lint` green（shellcheck ＋ markdownlint）
- [x] JSON 契約テスト（`echo '{}' | ~/.local/bin/plan-gate-hook | jq .` が valid・shape 一致）
- [ ] この端末の `~/.claude/settings.json` へ配線（活性化。update-config skill 経由）
- [ ] 実火テスト（次のプラン承認で `additionalContext` 注入を観測）
- [ ] commit（pathspec 明示）→ オーナー GO → push（main）

## 各端末の適用手順

1. `git pull` → `./install.sh`（`~/.local/bin/plan-gate-hook` が張られる）。
2. [03_settings-fragments.md](03_settings-fragments.md) の「正本化ゲート hook の配線断片」を `~/.claude/settings.json` にマージ。
3. 新しい発火（次のプラン承認）から有効。

## 完遂 → archive の条件

この端末でコア（スクリプト＋配線＋実火確認）が通ったらコアは完了。
**全端末への配線行き渡り**は他端末作業＝それが済むまで本 plan は docs/ に生かし、
消化しきったら `docs/archive/YYYY-MM_` へ退避する。
