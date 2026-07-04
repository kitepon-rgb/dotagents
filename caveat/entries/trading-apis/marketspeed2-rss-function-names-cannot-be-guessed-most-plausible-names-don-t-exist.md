---
id: marketspeed2-rss-function-names-cannot-be-guessed-most-plausible-names-don-t-exist
title: Marketspeed2 RSS function names cannot be guessed — most plausible names don't exist
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - rakuten
  - marketspeed2
  - ms2
  - rss
  - xlwings
  - excel-rtd
  - stock-trading-api
  - japanese-broker
environment:
  os: linux
  arch: x64
  node: 22.22.1
  rss_pdf_revision: 2026-03-30
  rakuten_marketspeed2: Windows desktop app
  excel: Office 365 / 2019+
  xlwings: any recent
  transport: Excel RTD (async)
source_project: null
source_session: 2026-05-12T14:13:20.418Z/5b73f9c81df5
created_at: 2026-05-12
updated_at: 2026-05-12
last_verified: 2026-05-12
---

## Context

Building a bridge that lets a remote service drive Marketspeed2 (Rakuten Securities' Windows trading app) by writing RSS formulas into Excel via xlwings. Quote lookups via =RssMarket(銘柄, 取得項目) worked immediately. Every other function name guessed from training-data intuition silently failed.

## Symptom

Excel cells driven by RSS formulas return None / blank / '#NAME?' silently when integrating Rakuten Securities Marketspeed2 RSS (the Excel add-in) from xlwings or VBA. Quote / RssMarket works, but every other guessed function name returns nothing — board (depth) is empty, account balances are None, order list returns the loading sentinel string '応答待ち', placement formulas don't fire.

## Cause

Six of the seven RSS function names you'd naturally guess (from naming conventions in other broker APIs or from snake-cased equivalents) do not exist as Excel UDFs in Marketspeed2 RSS:

| Guessed (wrong) | Reality |
|---|---|
| RssBoard | Doesn't exist. Depth uses RssMarket with field names 最良買気配値1..10 / 最良売気配値1..10 / 最良買気配数量1..10 / 最良売気配数量1..10 |
| RssMargin | Doesn't exist. Capacity / 余力 is RssCapacityList(ヘッダー行) returning 7 columns |
| RssPosition | Should be RssPositionList(ヘッダー行, 銘柄, 口座) |
| RssTradeList | Should be RssExecutionList(ヘッダー行, 注文種類, 銘柄, 口座, 信用区分, 売買) |
| RssOpen | Should be RssStockOrder(発注ID, 発注トリガー, …) — 20-argument signature |
| RssCancel | Should be RssCancelOrder(発注ID, 発注トリガー, 注文番号) |
| RssChange | Should be RssModifyOrder(発注ID, 発注トリガー, 注文番号, 注文区分, …) |
| RssOrderList | Correct, but takes 10 args including the optional ヘッダー行 cell range |

The functions silently return None / empty / placeholder strings — no error popup, no Excel error code, no logged exception. The bridge code looks fine, the Excel cells "have a formula" but nothing comes through. There is no autocomplete-discovery path either: the RSS add-in does not register VBA-side function listings that an IDE could surface.

Three additional design quirks that trip integrators:

1. List functions (RssOrderList, RssExecutionList, RssPositionList, RssCapacityList) write data starting at row+2 of the formula cell. Row 1 = formula, row 2 = column headers, row 3+ = data. If you pass a user-controlled ヘッダー行 range (mode A), the function fills only columns whose Japanese header text matches its internal column names — mismatches return None silently for that column. If you omit ヘッダー行 (mode B), Excel's dynamic-array implicit intersection can rewrite =RssOrderList() to =@RssOrderList($N$2:$AQ$2), confusing range-based readers.

2. RSS values arrive via RTD asynchronously. The formula cell can settle (stop showing "応答待ち") while the spilled data cells are still loading. A bridge that polls only the anchor cell will read None into half its outputs even though correct data lands 1-2 seconds later.

3. RSS returns the placeholder string '--------' (dashes) for rows or fields that don't apply (empty position list, no margin account, etc.). It is not a loading sentinel — it is a definitive "no data" marker. Bridges that treat '--------' as content surface ghost rows in otherwise-empty lists.

4. Placement functions (RssStockOrder family) require unique positive integer 発注ID per Excel session and a separate 発注トリガー arg (0 = staged, 1 = fire). The two-step staged-then-fired pattern is the only way to validate the arg list before consuming the 発注ID — once consumed, reusing it yields "発注ID=xxxx は既に使用済みです。".

## Resolution

Quote the official RSS function reference, do not paraphrase from training data. The canonical reference is a downloadable PDF:

  https://marketspeed.jp/guide/manual/ms2rss_function.pdf

It is the authoritative source for: full function list, argument signatures with value codes (売買区分 1=売り/3=買い, 注文区分 0=通常/1=逆指値付/2=逆指値待機, 価格区分 0=成行/1=指値, 執行条件 1=本日中/2=今週中/3=寄付/4=引け/5=期間指定/6=大引不成/7=不成, 口座区分 0=特定/1=一般/2=NISA/3=旧NISA, etc.), the 148-item 取得項目 list for RssMarket (including 最良買気配値1..10 for depth, 出来高加重平均 for VWAP, 時価総額, 単位株数, OVER/UNDER気配数量, 売成行数量, 買成行数量), and the column orderings of every list function (注文一覧 has 30 columns; 約定一覧 15; 保有銘柄 18; 余力・保証金率 7).

For the implementation:

1. Mirror the PDF into your repo (e.g. docs/ms2-rss-reference/) and extract text with pypdf so future RAG searches hit it. Keep a Markdown index that re-states the function table with the wrong-guess column so the trap is visible at a glance.

2. Use mode A for list functions: pre-fill desired Japanese headers into row 2, pass that range as the first arg (=RssOrderList(N2:AQ2, ...)), read data from row 3 down. Deterministic column order; no dynamic-array surprises.

3. Wait for the anchor (formula) cell to stop being a loading sentinel, then ALSO poll the first data row until every cell is no longer a loading sentinel. Loading sentinels: '', '取得中', '応答待ち', '#N/A', 'loading'. The '--------' dash placeholder is NOT a loading sentinel — treat it as authoritative "no data" and filter such rows out of lists.

4. For placement: write the formula with 発注トリガー=0 first, wait for the cell to settle, check for any "入力エラー" prefix (arg-validation failure — 発注ID NOT consumed), then rewrite the formula with 発注トリガー=1 to actually fire. Status string format is "{formula} => {status}" where status is one of: 待機中, 応答待ち, 発注済み(発注ID=xxxx), キャンセル, 入力エラー:..., 発注ロック中, 発注ID=xxxx は既に使用済みです。

5. Symbol format: "7203" (default 東証), or "7203.T" / "7203.JAX" / "7203.JNX" with explicit market suffix.

6. xlwings on one Excel workbook is single-threaded by nature (every call rewrites cells); add a process-wide threading.Lock around all RSS access to avoid concurrent calls clobbering each other's output cells.

## Evidence

Implemented and verified against a live Marketspeed2 session: prior to the fix, board returned 20 None price/size pairs across 10 levels and orders endpoint returned the literal string '=@RssOrderList($N$2:$AQ$2) => 応答待ち' as its first row. After switching to the names above, quote returned name='トヨタ自動車' last_price=2843 bid=2842.5 ask=2843.5, board returned 10 levels each with real prices and sizes, margin returned 現物買付可能額=3,513,771 yen, and placement formulas rendered exactly as the PDF specifies for limit/market/stop/stop_limit variants.
