---
id: cairosvg-text-rendering-geometricprecision-svg
title: cairosvg は `text-rendering="geometricPrecision"` を含む SVG をレンダするとグリフが破壊される
visibility: public
confidence: tentative
outcome: resolved
tags: []
environment:
  os: linux
  arch: x64
  node: 22.22.1
source_project: null
source_session: 2026-05-17T18:40:32.377Z/3a335e5ba91b
created_at: 2026-05-17
updated_at: 2026-05-17
last_verified: 2026-05-17
---

## Symptom

cairosvg で SVG → PNG 変換した時、`<text>` 要素を含む `<g>` グループに `text-rendering="geometricPrecision"` 属性が設定されていると、出力 PNG のテキストが破壊される (グリフが二重化・分断され、判読不能な「豆腐」状になる)。同じ SVG 内で `text-rendering` 属性を持たない別の `<g>` グループは正しく描画されるので、属性自体がトリガー。フォント解決やサイズの問題と誤認しやすいが、フォントスタックを `'DejaVu Sans Mono', monospace` に変更しても、画像サイズを変えても直らない。</symptom>
<parameter name="cause">cairosvg の text rendering 経路が SVG `text-rendering="geometricPrecision"` ヒントを受け取ると、テキストをラスタライズではなくジオメトリパスとして処理しようとし、その変換段で fill が二重ストローク的に描画される (内部で stroke + fill が両方適用される、もしくはパスのフィルが破綻する)。属性を削除するとブラウザのデフォルト挙動 (`auto` 相当) になり、Cairo の通常のテキスト描画パイプラインに乗って正常になる。同 SVG をブラウザ (Chrome/Firefox) で開くと正しくレンダされるため、cairosvg 固有の問題。</cause>
<parameter name="evidence">HermesAgent リポの `.github/og.svg` (1280×640、`<text>` 3 行を持つ上段グループに `text-rendering="geometricPrecision"`、下段の chip-row グループには属性なし) を `uvx cairosvg og.svg -o og.png -W 1280 -H 640` で変換。上段 3 行は豆腐化、下段は正常描画。属性を 1 行削除して再変換したところ、全テキストが正しく描画された。フォントスタックの変更 (`ui-monospace` 除去、`DejaVu Sans Mono` 追加) では効果なし。再現環境: WSL2 Ubuntu, Python 3.14, cairosvg uvx インストール、DejaVu Sans Mono / Liberation Mono / Ubuntu Mono インストール済み。</evidence>
<parameter name="resolution">SVG ソースから `text-rendering="geometricPrecision"` を削除して再変換する (デフォルト挙動はブラウザのレンダリングとほぼ同等なので視覚差は出ない)。代替: ブラウザ側でも geometricPrecision を残したい場合は、PNG 化用の SVG コピーを別途生成して属性を sed で削除、cairosvg に食わせる。`text-rendering="optimizeLegibility"` も同様に問題を起こす可能性があるため、cairosvg 経路では `text-rendering` 属性自体を `<g>` から外すのが安全。回避できない場合は Chrome `--headless --screenshot` を SVG/HTML ラッパに当てる方が確実。</resolution>
<parameter name="context">GitHub OSS リポの README hero / Social preview 用 OG バナーを SVG で書き、Settings UI への PNG アップロード用に cairosvg で変換する作業中に発生。先に openai-image MCP が `output_path` を黙って無視する罠 (別 caveat: `claude-code/openai-image-mcp-output-path`) を踏んでいたため、cairosvg fallback に切り替えてから本罠を踏んだ。</context>
<parameter name="environment">{"tool": "cairosvg", "tool_version": "uvx-installed (latest at 2026-05-18)", "host_os": "Linux WSL2 Ubuntu", "python_version": "3.14.4", "renderer": "Cairo via Pango"}</parameter>
<parameter name="tags">["cairosvg", "svg", "png", "text-rendering", "geometricPrecision", "font-rendering", "image-pipeline"]</parameter>
<parameter name="confidence">reproduced

## Cause



## Resolution



## Evidence


