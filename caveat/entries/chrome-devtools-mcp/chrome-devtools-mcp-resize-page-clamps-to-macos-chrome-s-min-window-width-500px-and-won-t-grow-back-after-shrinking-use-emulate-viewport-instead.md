---
id: chrome-devtools-mcp-resize-page-clamps-to-macos-chrome-s-min-window-width-500px-and-won-t-grow-back-after-shrinking-use-emulate-viewport-instead
title: chrome-devtools-mcp resize_page clamps to macOS Chrome's min window width (~500px) and won't grow back after shrinking — use emulate viewport instead
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - chrome-devtools-mcp
  - viewport
  - resize_page
  - emulate
  - macos
  - responsive
environment:
  os: macOS
  arch: arm64
  node: 26.0.0
  tool: chrome-devtools-mcp
  browser: Google Chrome
source_project: null
source_session: 2026-05-31T15:18:56.129Z/01ee88335ea2
created_at: 2026-05-31
updated_at: 2026-05-31
last_verified: 2026-05-31
---

## Symptom

Called resize_page(390x844) for a phone test but window.innerWidth came back as 500, not 390. Subsequent resize_page(1366x820)/(1440x900) to return to desktop left innerWidth stuck at 500 — the window would not grow back up — making desktop-width verification impossible via resize_page.

## Cause

resize_page sets the OS window bounds, which macOS clamps to a minimum Chrome window width (~500px). Re-growing the window after a shrink also failed to take in this session. Window-bounds resizing is subject to OS/display constraints, independent of the CSS viewport you actually want to test.

## Resolution

For any width below the OS min, or to set an exact/desktop CSS viewport, use the emulate tool's viewport param ('<w>x<h>x<dpr>[,mobile][,touch][,landscape]') which uses CDP device-metrics override and ignores window-size limits. Reserve resize_page for coarse window sizing only.

## Evidence

Fresh session start measured innerWidth 1440; after resize_page(390) it became 500; later resize_page(1366)/(1440) stayed 500. Switching to the emulate tool with viewport '1280x800x1' produced a true 1280px CSS viewport (CDP Emulation.setDeviceMetricsOverride) regardless of the 500px window, and '390x844x3,mobile,touch'-style strings give true phone viewports.
