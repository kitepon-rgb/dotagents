# Codex サブエージェントの同時数と深さ

> 出典: [OpenAI 公式 Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
> 一次保存: [[raw/openai-subagents-2026-07-13.md]]
> 取得日: 2026-07-13
> 確度: 高（公式仕様）／実効ホスト上限の理由は中（セッション提示値からの推論）

## 結論

- `[agents].max_threads` は同時に開ける agent thread 数の公開設定で、未設定時は `6`。
- `[agents].max_depth` は root=0 とした spawn のネスト深さで、未設定時は `1`。
- user-level `~/.codex/config.toml` と、信頼済みprojectの `.codex/config.toml` で設定できる。
- 現行 Desktop セッションが別途これより小さい concurrency slots を提示した場合、実効値はホスト側の低い天井に制限される。2026-07-13 の本セッションは親込み4枠だった一方、user configに `agents.max_threads` は無かったため、4は設定値でなくセッション実行基盤の上限と判断した。
- 設定変更は既存セッションの tool schema／割当済みslotsを変えない。新規セッションで spawn 実測する。

```toml
[agents]
max_threads = 6
max_depth = 1
```

## 旧知識の訂正

過去資料の「MultiAgent V2 で `agents.max_threads` を明示すると起動エラー」という記述は、当時も再現未実施・確度中だった。現行公式リファレンスが同キーを明示的に公開し、例にも `max_threads = 6` を載せているため、一般的な禁止事項としては撤回する。上限を上げてもDesktop／サービス側の実効上限を越えられるとは限らない。
