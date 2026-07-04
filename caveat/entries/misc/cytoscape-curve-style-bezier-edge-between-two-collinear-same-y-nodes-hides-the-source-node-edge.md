---
id: cytoscape-curve-style-bezier-edge-between-two-collinear-same-y-nodes-hides-the-source-node-edge
title: 'cytoscape: curve-style ''bezier'' edge between two collinear (same-y) nodes hides the SOURCE node + edge'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - cytoscape
  - graph-rendering
  - curve-style
  - bezier
  - frontend
environment:
  os: darwin
  arch: arm64
  node: 26.3.1
  library: cytoscape@3.34.0
  fcose: cytoscape-fcose@2.2.0
  renderer: canvas
source_project: null
source_session: 2026-06-28T11:58:43.292Z/588258fa7e24
created_at: 2026-06-28
updated_at: 2026-06-28
last_verified: 2026-06-28
---

## Symptom

In a Cytoscape.js graph, an edge styled with `curve-style: "bezier"` between exactly two nodes placed at the same Y (horizontal, collinear) — e.g. a 2-node `layout: { name: "preset" }` with positions {x:0.28W,y:H/2} and {x:0.72W,y:H/2} — causes the edge's SOURCE node and the edge itself to silently fail to paint. `node.visible()` returns false for the source (display='element', opacity=1, valid non-zero bounding box), while the TARGET node paints normally. Canvas pixel readback confirms the source chip is fully transparent. No console error is thrown.

## Cause

Triggered specifically by `curve-style: "bezier"`. Bisected by holding everything else constant and swapping only the edge's curve-style: with `bezier` the source node is invisible; with the default/`straight` curve-style all nodes + the edge paint. Nodes-only (no edge) always paint both. The common factor is bezier control-point computation degenerating when the two endpoints are collinear/horizontally aligned (same Y), which appears to also cull the source node from the render pass. Reproduced in a fresh isolated cytoscape instance with the same style, so it is not state/layout/timing related.

## Resolution

Use `curve-style: "straight"` instead of `"bezier"` for graphs that may place two connected nodes at the same Y (deterministic small-N layouts especially). straight renders both endpoints + the edge label/arrow correctly and looks clean for single edges per pair. If parallel/multi edges between the same pair must be visually separated later, prefer non-collinear node positions or test `unbundled-bezier` rather than reintroducing plain `bezier`. Do NOT rely on a manual `cy.zoom()/cy.center()` dance to "repair" it — that does not repaint the culled source node; fit/maxZoom or a `cy.resize()` is what forces a clean repaint, but the real fix is the curve-style.

## Evidence

cytoscape 3.34.0, cytoscape-fcose 2.2.0, Chromium (chrome-devtools), dpr=1, canvas 977x300. Diagnostic: built temp cytoscape with elements [{id:クオ},{id:村人},{edge クオ->村人}] + full style; node.visible() => {クオ:false, 村人:true}; getImageData at source center => [0,0,0,0] (transparent), at target => [255,253,247,247] (chip fill). Swapping edge style to {line-color only} (default straight) => both visible. nodes-only => both visible.
