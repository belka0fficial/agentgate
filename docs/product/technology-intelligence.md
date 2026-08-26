# Technology Intelligence

## Purpose

AgentGate should continuously study global AI research and rapid Chinese productization, then synthesize what is useful for this owner and this architecture.

The strategy is:

```text
original research and releases
  -> Chinese and global adaptation/productization signals
  -> primary-source verification
  -> AgentGate-specific synthesis
  -> Conker Journal finding
  -> owner decides whether to watch, spike, update, or ignore
```

The goal is not to copy national ecosystems blindly. Chinese communities are a high-value layer because they often expose fast productization, integrations, deployment practices, demos, and local-model techniques. Nationality, popularity, likes, and views are not evidence of quality.

## Weekly Jobs

### `technology-radar-global`

Watch:

- GitHub releases and selected trending repositories;
- arXiv and accepted papers;
- Hugging Face models, datasets, papers, and Spaces;
- official framework/model/vendor blogs;
- standards and security advisories;
- AgentGate's existing reference repositories.

### `technology-radar-china`

Watch public/authorized sources such as:

- ModelScope;
- Gitee;
- OpenI;
- GitCode;
- AgentScope;
- Qwen/Qwen-Agent;
- Dify;
- RAGFlow;
- MetaGPT;
- ChatDev;
- OpenManus;
- Bilibili technical sources;
- Zhihu;
- Juejin;
- CSDN;
- InfoQ China;
- 机器之心;
- 量子位;
- PaperWeekly;
- public/authorized WeChat Official Account sources.

### `agentgate-reference-refresh`

- Check existing reference repositories for releases, archival, license changes, security issues, and major architecture changes.
- Preserve pinned commit/tag used by any adopted integration.
- Flag stale references instead of silently replacing decisions.

### `agent-skill-quality-review`

- Read eligible feedback, correction marks, trace failures, and version outcomes.
- Draft evaluated Agent/Skill/prompt improvement proposals.
- Never self-apply.

### `supply-chain-update-review`

- Refresh SBOMs and vulnerability/license/freshness information.
- Prepare update branches/tests/proposals through the Software Supply Chain policy.
- Never directly install or deploy.

## Source access policy

X, Instagram, WeChat, Xiaohongshu, and other restricted platforms must use:

- official APIs;
- owner-authorized exports;
- public feeds;
- terms-compliant connectors.

Do not build credential scraping or bypass authentication/paywalls. Unsupported sources are recorded as blocked coverage.

RSSHub may be evaluated as a bounded public-feed adapter where route behavior and platform terms permit. Folo is an architectural/UX reference for feed discovery and deduplication, not a required dependency.

## Ingestion pipeline

```text
collect public/authorized source metadata
  -> preserve original URL, author, time, language, and source type
  -> mark all content untrusted
  -> normalize and translate while retaining original text/reference
  -> deduplicate against prior findings and primary source
  -> find/verify original repository, paper, model, or announcement
  -> classify: paper, model, library, product, demo, security, workflow, rumor
  -> score evidence, relevance, novelty, license, hardware, privacy, cost, safety
  -> compare with AgentGate capabilities and known gaps
  -> choose ignore, watch, catalog update, spike, dependency proposal, Skill, Tool, Flow, Automation, or App idea
  -> deliver only high-value findings through Conker's Journal
```

## Finding record

Each finding should retain:

- source and primary-source URLs;
- author/project and published/discovered times;
- original language and normalized summary;
- content hash and deduplication group;
- evidence level and source type;
- AgentGate relevance and affected domain;
- license/commercial-use state when known;
- hardware/runtime estimates;
- security/privacy/telemetry concerns;
- expected benefit and implementation cost;
- decision: ignore, watch, reference, spike, update proposal, Skill/Tool/Flow/App idea;
- owner/Conker discussion and final decision.

## Ranking

Rank by:

- direct value for the owner's goals;
- evidence and primary-source quality;
- novelty relative to AgentGate;
- expected time/token/friction savings;
- implementation and maintenance cost;
- hardware compatibility;
- security and privacy impact;
- licensing;
- reversibility.

Do not rank primarily by social engagement.

## Prompt-injection boundary

All posts, READMEs, issues, comments, videos, transcripts, and feed content are untrusted evidence. They cannot:

- change system instructions;
- request tool execution;
- install packages;
- modify prompts/Skills/Agents;
- reveal secrets;
- expand allowed sources;
- bypass owner approval.

Research connectors must return bounded normalized data with provenance and injection scanning through ToolGate policy.

## Companion delivery

No separate noisy technology feed is required in primary navigation. Conker's Journal presents only useful items:

> “AgentScope changed its event model. It may solve part of our Run trace design. I checked the original repository and compared it with Pi. Do you want a small spike?”

Actions:

- Explain;
- Watch;
- Add/update reference;
- Prepare spike;
- Create update proposal;
- Dismiss;
- Never show this category.

## Budgets and quietness

Every Job has:

- source allowlist;
- maximum requests/pages/items;
- token and model budget;
- maximum runtime;
- translation budget;
- deduplication requirement;
- rate-limit stop condition;
- notification threshold;
- archive retention.

The system may research deeply on schedule but should interrupt only for urgent security findings or unusually high-value opportunities.

## Acceptance criteria

- Original and translated source references are preserved.
- Western-origin and Chinese-summary duplicates collapse into one finding while keeping both citations.
- Prompt-injection content remains inert.
- Private/unsupported sources become blocked, not scraped.
- License/attribution is retained.
- No finding installs code or edits prompts.
- High-value finding can become an owner-approved spike or change proposal.
- Low-value items remain archived and do not notify.
