---
id: google-custom-search-json-api-2024-closed-403-permission-denied
title: Google Custom Search JSON API は 2024 年以降新規顧客に closed (既存有効化済プロジェクトでも再有効化不可、 403 PERMISSION_DENIED)
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - google-cloud
  - custom-search
  - cse
  - api-deprecation
  - external-spec-trap
  - pre-flight-check
environment:
  os: linux
  arch: x64
  node: 22.22.1
  date: 2026-05-03
  google_api: Custom Search JSON API (customsearch/v1)
  cutoff: 2024 (existing customers until 2027-01-01)
source_project: null
source_session: 2026-05-03T08:26:35.206Z/262fa8f0fd52
created_at: 2026-05-03
updated_at: 2026-05-03
last_verified: 2026-05-03
---

## Context

個人プロジェクトに「Bell に画像検索ツールを追加する」 機能計画で Google Custom Search JSON API を採用候補にした際、 council 監査では気付かれず、 実現性監査 (独立 context のサブエージェント) が公式ドキュメントを WebFetch して発見。 計画書では既存 GOOGLE_MAPS_API_KEY (= Maps API 用に活発な Google Cloud プロジェクト) を流用すれば「CSE 有効化するだけ」 と書いていたが、 grandfathered でなければ 403 が確定的に返る罠。

## Symptom

Google Cloud Console で「Custom Search API」を「有効化」 ボタン押下 (緑チェック付き) し、 https://programmablesearchengine.google.com/ で CSE を作成して `cx` を取得し、 既存有効な API key で curl すると、 設定が完璧に見えるにもかかわらず `403 PERMISSION_DENIED` が返る:

```json
{
  "error": {
    "code": 403,
    "message": "...does not have access to Custom Search JSON API. Please use Vertex AI Search instead.",
    "status": "PERMISSION_DENIED"
  }
}
```

console 上は API が有効化済と表示され続けるため、 「設定漏れがあるのでは」 と何時間も検索手順や key 権限を見直すループに入る。

## Cause

Google が 2024 年に Custom Search JSON API を新規顧客に対して closed にした。 公式 overview ページに verbatim で「The Custom Search JSON API is closed to new customers. Vertex AI Search is a favorable alternative... Existing Custom Search JSON API customers have until January 1, 2027 to transition.」 と明記。 cutoff 以降の新規プロジェクトはたとえ Console で「有効化」 ボタンを押せても実 API call は 403 を返す。 grandfathered (cutoff 前に CSE を有効化していた既存顧客) のみ 2027-01-01 まで利用可能。

判定の難しさ: Console UI が「Enabled (緑)」 と表示するため API が動くと誤認しやすい。 課金有効化、 API key 制限解除、 CSE の「ウェブ全体検索」/「画像検索」 ON 化など、 外形的に設定がすべて正しく見えるケースで 403 が出る。

## Resolution

**実装着手前に curl で pre-flight 確認**:

```bash
curl -s "https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CSE_ID}&q=test&searchType=image&num=1" | jq '.error // .items[0].link'
```

- 結果 URL (`https://...`) が出る → grandfathered、 利用可能
- `{"code": 403, ...}` が出る → 当該プロジェクトは post-cutoff、 利用不可。 別 API (Vertex AI Search、 Bing Image Search 有償、 Brave Search API 等) で再計画する

console UI は信用しない、 必ず生 API call で確認する。

参考: 2026-02 Stack Overflow の事例 (https://stackoverflow.com/questions/79890172/) では billing 有効化 + Console「Enabled」 + 全設定済の状態で `403 PERMISSION_DENIED` が再現確認されている。

## Evidence

- 公式 overview: https://developers.google.com/custom-search/v1/overview (verbatim "closed to new customers")
- Stack Overflow 2026-02-16: https://stackoverflow.com/questions/79890172/ (post-cutoff project の 403 再現)
- 監査 (audit-gauntlet 関門 3 / 実現性監査) で本罠を発見、 計画書 docs/bell-image-search-tool-plan-2026-05-03.md の Quo 手動作業 #0 で pre-flight curl gate を実装に追加
