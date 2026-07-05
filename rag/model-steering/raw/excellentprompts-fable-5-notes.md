[![Excellent AI Prompts](https://substackcdn.com/image/fetch/$s_!r0Ez!,w_40,h_40,c_fill,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F6a82c8f3-c83b-4aa3-945f-5429a91865a6_1024x1024.png)](/)

# [![Excellent AI Prompts](https://substackcdn.com/image/fetch/$s_!IQwa!,e_trim:10:white/e_trim:10:transparent/h_72,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F13955d46-4737-4522-820c-35c11decb051_1344x256.png)](/)

SubscribeSign in

# 4 Moves From the Alleged Fable 5 System Prompt That Belong in Your CLAUDE.md and Skill Files

### 4 CLAUDE.md and Skill.md upgrades from Anthropic's alleged Fable 5 system prompt

[![Excellent AI Prompts's avatar](https://substackcdn.com/image/fetch/$s_!Xi2X!,w_36,h_36,c_fill,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fc3be57af-237a-4116-8924-c081b6b0fdec_1024x1024.png)](https://substack.com/%40excellentaiprompts)

[Excellent AI Prompts](https://substack.com/%40excellentaiprompts)

Jun 16, 2026

∙ Paid

31

1

Share

**You’re reading Excellent AI Prompts.**

AI prompt chains, agent skills, and agentic workflows for professionals learning to use AI to earn more, think sharper, and live better.
Copy them. Use them. Build with them.

Subscribe

A few days ago a researcher published a file they claim reflects Fable 5’s system prompt: roughly 120,000 characters, attributed to Anthropic’s, defunct for now, Fable 5 model.

As far as the status of Fable 5 is concerned, the export-control order still stands though [Anthropic has publicly disputed that this represents a true jailbreak](https://www.anthropic.com/news/fable-mythos-access). The company says some of the shown outputs were not from Fable 5 at all, and that core safety classifiers remained in place. Sadly, public access to Fable 5 and Mythos 5 is still suspended worldwide.

**One more piece of context before we go further.**

The prompting guide and the alleged file are still readable as postmortem engineering artifacts, which is what this issue treats them as. The four moves below are not specific to Fable 5; they are writing patterns you can apply to any prompt, Claude.md, agents.md, or skill.md file today.

The “system prompt” in question lives in the public [CL4R1T4S repository](https://github.com/elder-plinius/CL4R1T4S/blob/main/ANTHROPIC/CLAUDE-FABLE-5.md), published by “Pliny the Liberator” and announced in a now-viral X post titled [“Claude Fable 5 System Prompt”](https://x.com/elder_plinius/status/2064478648057610422).

The patterns we’ll discuss line up with Anthropic’s own public guidance for [Claude Code memory](https://code.claude.com/docs/en/memory), the [Fable 5 prompting guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5), and the [Skills engineering post](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills).

Quick definitions before the moves, because a lot of readers run one of these files and not the other.

**CLAUDE.md** is the [project memory file Claude Code loads](https://code.claude.com/docs/en/memory) at the start of every session. It is one of several inputs that get merged into the composed prompt the model receives. It holds the rules that apply to every task in a repo or workspace: build commands, conventions, what to never do. One per project root, plus an optional global one at `~/.claude/CLAUDE.md`.

**[SKILL.md](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)** [is the definition file inside an Agent Skill folder](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills). Its frontmatter is loaded into the agent’s composed prompt at startup so the agent can discover the skill, and the rest of the file plus any bundled resources load on demand when the skill fires. Many per project, each scoped to one job.

The four moves below work on both.

## **Move one: legislate the constraint, do not describe it (& the downloadable full system prompt)**

![User's avatar](https://substackcdn.com/image/fetch/$s_!Xi2X!,w_64,h_64,c_fill,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fc3be57af-237a-4116-8924-c081b6b0fdec_1024x1024.png)

## Continue reading this post for free, courtesy of Excellent AI Prompts.

Claim my free post

[Or purchase a paid subscription.](https://excellentprompts.substack.com/subscribe?simple=true&next=https%3A%2F%2Fexcellentprompts.substack.com%2Fp%2Ffable-5-system-prompt-notes-for-claudemd-skillmd-files&utm_source=paywall&utm_medium=web&utm_content=202290139&just_signed_up=falsesimple=true&utm_source=paywall&utm_medium=email&utm_content=202290139&next=https://excellentprompts.substack.com/p/fable-5-system-prompt-notes-for-claudemd-skillmd-files)

PreviousNext

© 2026 Excellent AI Prompts · [Privacy](https://substack.com/privacy) ∙ [Terms](https://substack.com/tos) ∙ [Collection notice](https://substack.com/ccpa#personal-data-collected)

[Start your Substack](https://substack.com/signup?utm_source=substack&utm_medium=web&utm_content=footer)[Get the app](https://substack.com/app/app-store-redirect?utm_campaign=app-marketing&utm_content=web-footer-button)

[Substack](https://substack.com) is the home for great culture

This site requires JavaScript to run correctly. Please [turn on JavaScript](https://enable-javascript.com/) or unblock scripts
