# raw/ 一次ソース一覧（model-steering）

取得日はすべて **2026-07-05**、取得方法 **markitdown 0.1.5**（バイト数で成功判定・全件本文取得を目視確認）。verbatim 保管。コンパイル/監査は親ディレクトリの [fable-behavior-porting-audit.md](../fable-behavior-porting-audit.md)。

| ファイル | URL | 確度 | 備考 |
|---|---|---|---|
| prompting-fable-5.md | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5 | 公式一次・高 | 本監査の主素材（型の元ネタ・書き方・effort） |
| introducing-fable-5-mythos-5.md | https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5 | 公式一次・高 | pricing/context/classifier/fallback の事実 |
| migration-guide.md | https://platform.claude.com/docs/en/about-claude/models/migration-guide | 公式一次・高 | effort 再評価・Opus 4.8 の 1M context 根拠 |
| output-styles.md | https://code.claude.com/docs/en/output-styles | 公式一次・高 | チャネル分離・keep-coding-instructions・カテゴリ表 |
| release-notes-system-prompts.md | https://platform.claude.com/docs/en/release-notes/system-prompts | 公式一次・高 | claude.ai 用 system prompt 公開（API/Claude Code のではない点に注意＝L7） |
| excellentprompts-fable-5-notes.md | https://excellentprompts.substack.com/p/fable-5-system-prompt-notes-for-claudemd-skillmd-files | 二次・低（ペイウォールで Move one 冒頭まで） | 「法制化」パターンの出典。CL4R1T4S リークの真正性否定情報を含む（L32-34） |

## raw 化していない参照
- rubenhassid「Claude For Dummies」 https://x.com/rubenhassid/status/2045713046065283435 — ツイート（初心者ガイド）。ロジック4b「肯定＋否定の対指定」の出典（Rule 3）。二次・カジュアル。本文引用は監査記事に収録。
- CL4R1T4S（elder-plinius）Fable 5 リーク https://github.com/elder-plinius/CL4R1T4S — 記事の出発点だが結果的に不使用。Anthropic が真正性を公式否定（excellentprompts L34 経由）＝取得せず。
