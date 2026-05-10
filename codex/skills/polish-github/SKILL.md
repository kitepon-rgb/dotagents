---
name: polish-github
description: Use when the user asks to polish a GitHub repository's public OSS presentation, README, metadata, releases, topics, CI badges, social preview, OG or hero images, diagrams, or launch-ready GitHub appearance. First audit only, present prioritized options, and wait for GO before changing files or GitHub settings unless the user already explicitly says to do everything.
---

# Polish GitHub

Make a GitHub repository easier to understand at first visit: what it is, why it matters, how to try it, and whether it looks maintained.

## Operating Rule

Start with an audit only. Present findings and a prioritized menu with effect and cost. Wait for the user's GO before editing files or mutating GitHub state, unless the user already gave a clear "全部やれ" / "do everything" instruction.

Before irreversible or external mutations, announce the action briefly:

- push
- tag push
- release creation
- repository metadata changes
- GitHub Settings changes
- overwriting existing image assets

Do not use hidden fallbacks. If `gh`, GitHub app tools, image generation, or another expected path is unavailable, say so and continue only with the explicitly available work.

## Audit

Check these areas.

### GitHub Metadata

Prefer the GitHub app tools when they provide the needed data. Use `gh` when repository metadata, release lists, topics, runs, or settings are easier or only available there.

```bash
gh repo view --json description,homepageUrl,repositoryTopics,latestRelease,hasDiscussionsEnabled,openGraphImageUrl,usesCustomOpenGraphImage
```

Look for:

- stale or vague `description`
- missing or weak `topics`; recommend 8 to 13 searchable topics
- empty `homepageUrl` when docs, npm, demo, or package page exists
- `latestRelease` behind tags, changelog, package version, or implementation state
- missing custom Open Graph image
- Discussions disabled when the project would benefit from public questions

### README

Inspect the README and adjacent docs directly.

Look for:

- no 5-second pitch near the top
- long status/history prose before the value proposition
- missing 30-second usage example
- missing install / quick start / example output
- no comparison table against similar tools or existing workflows
- missing architecture, flow, or concept diagram where prose is doing too much
- no language variant when the maintainer's main audience would benefit, such as `README.ja.md`
- old version history or legacy detail crowding the opening; preserve it with `<details>` rather than deleting useful content

### Images And Diagrams

Classify the repository before proposing visuals:

| Type | Examples | Visual direction |
|---|---|---|
| A. Developer CLI or practical tool | grep-like tools, build tools, git helpers, MCP services | restrained hero or OG image, architecture diagram, information first |
| B. Product or app | dashboard, SaaS OSS, desktop or web app | stronger hero, screenshots, feature visuals |
| C. Library or framework | UI library, ORM, web framework | logo, benchmark, API flow, branding |
| D. Creative tool | generative art, design tool, game | visual-first presentation is acceptable |

Match visual intensity to the project. Too much decoration can weaken a serious developer tool; too little visual care can make a creative project look abandoned.

Useful asset targets:

- `.github/og.png`: 1280x640 PNG for social sharing; GitHub social preview upload still requires Settings UI.
- `.github/hero.png`: README hero image when useful.
- `.github/diagrams/`: generated diagrams or exported concept images.
- Mermaid diagrams for architecture and flows when long-term diffability matters.

If bitmap image generation is available, use it as the first choice for OG and README hero assets. Use static SVG only when image tooling is unavailable or the project needs a very small editable fallback.

### CI And Badges

If README has CI badges or claims, check recent runs:

```bash
gh run list --limit 5
```

Separate failures caused by the proposed polish work from pre-existing CI failures. Treat pre-existing CI failures as separate user decisions unless the user asks to fix everything.

### Releases, Tags, Changelog

Compare:

```bash
git tag --sort=-v:refname
gh release list --limit 20
git log --oneline -30
```

Look for:

- tags without GitHub Releases
- changelog versions without tags
- latest release behind the actual project version
- release notes that can be copied from `CHANGELOG.md`

For release creation, prefer changelog sections. If no changelog exists, propose notes from `git log <prev>..<tag>`.

## Audit Output

Report the audit as a concise table, then ask what to execute.

Use this shape:

| Axis | Effect | Cost | Recommendation |
|---|---|---|---|
| Metadata | Medium | Small | Update description, topics, homepage |
| Release | Medium | Small | Create missing release from changelog |
| README hero | High | Medium | Add pitch, quick start, comparison |
| Multilingual README | Medium | Medium | Add maintainer-audience language variant |
| OG image | High | Small-Medium | Generate 1280x640 `.github/og.png` |
| Diagrams | Medium | Small | Add Mermaid architecture or flow diagram |
| CI | Small-Medium | Variable | Investigate failing badge or recent runs |

Offer a recommended order. If the user says "全部", proceed through the list.

## Execution Guidelines

Keep public-facing copy sharp:

- the first screen should explain the project in one sentence
- show a working command or screenshot early
- avoid burying usage under roadmap/history
- keep old history, but fold it under `<details>` when it blocks scanning
- use concrete nouns and outcomes rather than hype

README opening order to consider:

1. Optional hero or OG-style visual.
2. H1 project name.
3. Badges.
4. One-line pitch, often as a blockquote.
5. Language links when present.
6. "30 seconds" usage or quick start.
7. Comparison table.
8. Install and detailed docs.
9. Folded background, history, roadmap, or legacy notes.

Topics should be search keywords: domain, language, framework, category, protocol, and ecosystem names.

Release rules:

- Use `--latest` only for the newest stable release.
- Do not mark old backfilled releases as latest.
- Announce before creating or pushing tags/releases.

Image rules:

- Check for existing `.github/og.*`, `.github/hero.*`, and `.github/diagrams/` before writing.
- Ask before overwriting existing assets.
- For GitHub social preview, generate the asset but tell the user Settings UI upload is manual.
- Avoid version-specific screenshots or text unless there is a maintenance plan.

## Completion Report

End with:

- what changed, grouped by axis
- external actions performed, such as release creation or metadata update
- remaining manual items, especially GitHub Settings UI social preview upload
- verification performed, including tests, markdown checks, `gh` checks, or generated asset dimensions
- optional one-time launch extras: Show HN draft, X post, Reddit/dev.to note, or release announcement copy
