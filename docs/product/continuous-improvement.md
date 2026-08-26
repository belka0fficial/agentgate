# Continuous Improvement

## Purpose

AgentGate should improve Agents, Skills, prompts, Tools, ToolGate Automations, Jobs, Flows, Apps, and dependencies from real owner feedback and operational evidence.

Improvement means **versioned proposals plus evaluation**, not an agent silently rewriting itself.

## Feedback UX

Each assistant response may receive:

- Like.
- Dislike.
- Optional selected-text mark.
- Optional correction or owner note.
- Optional structured reasons:
  - factually wrong;
  - misunderstood intent;
  - ignored context;
  - too verbose;
  - too short;
  - bad tone;
  - unsafe;
  - wrong tool choice;
  - failed action;
  - slow;
  - excellent reasoning;
  - excellent tone;
  - other.
- Explicit `Use as a regression example` permission for sensitive/private context.

Likes/dislikes are signals, not ground truth. A single rating cannot directly change an Agent, Skill, prompt, Tool, Job, Flow, or Automation.

## Feedback record

A feedback event links to:

- feedback ID and timestamp;
- message and session;
- Agent/Companion/Worker identity;
- active Agent, SOUL/prompt, Skill, Tool, model route, App, and Flow versions;
- rating and reason tags;
- owner note and selected message-span reference;
- safe context and artifact references;
- incognito/privacy state;
- evaluation eligibility;
- resolution and resulting change-proposal references.

Do not persist hidden chain-of-thought. Incognito and sensitive feedback require explicit retention behavior.

## Artifact ownership

| Artifact | Authority |
| --- | --- |
| Companion/Chief SOUL and prompt | Authoritative profile/version repository |
| Worker role/instruction | Pi runtime definition |
| Skill | Skill repository and version history |
| Tool | ToolGate proposal/approval/version |
| ToolGate Automation | ToolGate deterministic workflow/version |
| Job | Pi Job configuration |
| Flow/Loop | Pi orchestration definition |
| Hosted App | App repository/build/deployment |
| Package/image | Software Supply Chain pipeline |

## Improvement lifecycle

```text
feedback + corrections + traces + failures
  -> cluster by artifact and active version
  -> identify repeated failure/opportunity
  -> create cited hypothesis
  -> create candidate version and exact diff
  -> create owner-approved regression examples
  -> evaluate current versus candidate
  -> measure quality, correctness, safety, latency, cost, and tool behavior
  -> adversarial/edge-case evaluation
  -> owner-facing proposal with uncertainty
  -> approval according to artifact risk
  -> canary or limited target
  -> monitor new feedback and regressions
  -> promote or rollback
```

## Separation of authority

The candidate generator cannot modify:

- evaluator prompts and metrics;
- approval requirements;
- safety tests;
- deployment policy;
- promotion threshold;
- rollback history.

The proposer, evaluator, ToolGate execution authority, and owner decision must remain separable.

## Evaluation system

Initial evaluation candidates:

- promptfoo;
- DeepEval.

Both should be benchmarked on the same small private regression set:

1. factual correction;
2. tone correction;
3. wrong tool choice;
4. verbosity preference;
5. safety boundary.

Choose one primary evaluation runner based on local-model support, privacy, custom metrics, deterministic artifact output, runtime cost, and CI integration. Native unit/contract tests remain authoritative for deterministic behavior.

Observability references such as Langfuse, Phoenix, Opik, Agenta, and OpenTelemetry are study material. Foundation AgentGate keeps bounded redacted traces rather than automatically copying all prompts and private content into another platform.

## Proposal review UX

An Improvement Review must show:

- affected artifact and current version;
- evidence/feedback cluster;
- candidate diff;
- evaluation dataset and privacy scope;
- current-versus-candidate results per case;
- quality, safety, cost, latency, and tool-use changes;
- uncertainty and known regressions;
- proposed canary scope;
- exact approval binding;
- rollback version.

## Automatic update policy

Foundation behavior:

- automatic observation: allowed;
- automatic clustering: allowed;
- automatic candidate drafting: allowed within resource/privacy policy;
- automatic evaluation: allowed in isolation;
- automatic production application: not allowed;
- automatic rollback after a failed approved canary: allowed only when rollback binding was approved with deployment.

Future trusted policies may permit narrowly scoped canary promotion, but that requires a separate explicit decision record.

## Weekly quality Job

`agent-skill-quality-review` should:

1. collect eligible feedback and failure events;
2. group by artifact/version/reason;
3. require a repeated pattern or high-severity failure;
4. draft improvement hypotheses;
5. prepare regression examples;
6. run or request evaluations;
7. send high-value proposals to Conker's Journal;
8. preserve low-confidence findings in a research archive;
9. never rewrite production artifacts directly.

## Acceptance criteria

- Feedback always links to the exact response and active versions.
- Incognito and sensitive feedback honor retention/evaluation consent.
- No direct feedback endpoint mutates an Agent/Skill/prompt.
- Every applied change has current/candidate diff, evaluation, approval, version, canary/health evidence, and rollback.
- Changed candidates invalidate stale approvals.
- A candidate cannot change its own evaluator or promotion rules.
- Owner can trace a resolved feedback item to the resulting version or rejection reason.
