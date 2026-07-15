# ADR 0006: Worker Report skeletonはstrict importerのcanonical時刻形式を明示する

## Status

Accepted。

## Context

Observerの実native委譲で、保存済みWorker Report skeletonをそのまま埋めた実装者が
`observed_at`へ有効なRFC 3339時刻`2026-07-15T06:18:04Z`を返した。しかしstrict importerは
ミリ秒付きUTC canonical ISO-8601だけを受理するため、親の手補正なしではimportできなかった。

生成側のplaceholderと説明は`RFC 3339`だけを要求しており、受入側より広い形式を正しい入力として
案内していた。Reportの意味やimport schemaを緩める問題ではなく、生成する作業契約の欠陥である。

## Decision

- strict importerのcanonical時刻契約は変更しない。
- Worker Report skeletonの時刻placeholder自身へ`YYYY-MM-DDTHH:mm:ss.sssZ`を明示する。
- `placeholders.observed_at`も、ミリ秒3桁と末尾`Z`を要求する同じ表現へ揃える。
- skeleton schema、Report schema、receiptは増やさない。
- focused fixtureで全時刻placeholderと説明がcanonical形式を示すことを固定する。

## Consequences

- native workerは親の正規化なしでstrict import可能なReportを作れる。
- ミリ秒なし、offset付き等の一般的なRFC 3339表現は、引き続きimport時にfail closedとなる。
