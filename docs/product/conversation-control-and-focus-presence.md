# Conversation Control and Focus Presence

## Purpose

AgentGate should let the owner control **when a turn is complete**, which senses are active, which model handles communication, and how a Companion appears beside other work.

This document defines:

- multi-message user turns;
- manual versus automatic voice turn-taking;
- independent camera, screen-share, and AI-avatar controls;
- communication-provider routing;
- Focus Room tutoring;
- a transparent always-on-top desktop Companion;
- future visual guidance overlays.

## 1. Multi-message turns

### Problem

Normal AI chat treats every submitted message as a complete turn and starts generating immediately. That makes it difficult to:

- add context in several separate thoughts;
- correct or extend a previous sentence;
- organize complex explanations;
- attach several items one at a time;
- decide when the Agent has enough information;
- avoid interruption while still thinking.

### Interaction model

The composer has two actions:

- **Add message** — adds the current text/attachment as another user message in the pending turn without invoking the Agent.
- **Respond now** — closes the pending user turn and lets the Agent respond to all queued messages in order.

```text
User message 1   pending
User message 2   pending
User message 3   pending
-------------------------
Respond now
```

The existing message visual style remains. Pending messages need only a subtle state indicator and a boundary showing that the Agent is waiting.

### Auto-response toggle

```text
Auto respond: ON
```

- Existing behavior.
- Submitting one message immediately closes the turn and invokes the Agent.
- `Respond now` is hidden.

```text
Auto respond: OFF
```

- Each submit adds a separate pending message.
- The Agent does not run and no model tokens are spent.
- `Respond now` remains visible until the batch is committed.

### Runtime contract

Do not flatten the messages into an ambiguous string. Preserve ordered boundaries:

```text
UserTurnBatch
├── batch_id
├── session_id
├── messages[]
│   ├── message_id
│   ├── content parts
│   ├── attachments
│   ├── created_at
│   └── order
├── opened_at
├── committed_at
└── response_policy
```

Pi receives the committed batch as one logical user turn with multiple message parts. The transcript continues to render each message separately.

### Pending behavior

Before commit, the owner may:

- edit;
- delete;
- reorder when useful;
- add attachments;
- clear the batch;
- commit it.

Pending batches should survive an accidental refresh according to session privacy policy. Incognito pending messages follow incognito retention.

### Keyboard/accessibility

Exact shortcuts require usability testing. Proposed defaults:

- `Enter` — add/send according to configured behavior.
- `Shift+Enter` — newline.
- `Ctrl/Cmd+Enter` — Respond now/commit batch.

Buttons must retain explicit labels and keyboard focus; shortcuts are optional accelerators.

## 2. Voice turn control

Voice conversation needs the same distinction between speech input and turn completion.

### Auto turn-taking

- Voice activity detection observes silence.
- A configured silence interval ends the user's turn.
- The Agent begins responding automatically.
- Suitable for casual conversation.

### Manual floor control

- The Agent continues listening through pauses.
- Silence does not end the turn.
- The owner presses **I'm done / Respond now** when finished.
- The button is hidden when automatic turn-taking is enabled.
- Suitable for complex explanations, studying, planning, emotional conversations, and thinking aloud.

### Other states

- **Hold the floor** — prevents the Agent from interrupting while the owner is still forming the thought.
- **Cancel turn** — discards the uncommitted transcript/audio according to privacy policy.
- **Pause listening** — stops capture without ending the call.
- **Interrupt Agent** — stops Agent speech and returns the floor to the owner.

Manual mode should show:

```text
Listening — Agent is waiting for you to finish
```

The communication model must not generate a substantive answer before commit. Optional nonverbal/backchannel behavior belongs to the communication-provider policy and must not interrupt.

## 3. Independent media controls

The user's camera and the Agent's visual output are separate.

A call may use any combination:

| Microphone | User camera | Screen share | AI voice | AI avatar |
| --- | --- | --- | --- | --- |
| on | off | off | on | off |
| on | on | off | on | off |
| on | off | window | text | off |
| off | off | screenshot | text | portrait |
| on | on | screen | on | 2D/3D later |

The owner can open their camera without rendering a 3D Agent. Until presence hardware/runtime exists, the Agent may respond through text, voice, portrait, waveform, or a lightweight orb.

Every active sensor/output must have an obvious indicator and one-click disable action.

## 4. Screen sharing and screen awareness

### Principle

Sharing a screen transport does not mean the AI analyzes every frame forever.

Screen awareness is explicit and scoped:

- **Off** — no capture or analysis.
- **Look now** — capture the current selected window/region/frame and attach it to the next turn.
- **Watch this task** — time-bounded sampling during a named Focus Session.
- **Continuous developer mode** — future opt-in diagnostic mode with visible recording/analysis indicator.

### Share targets

- selected window;
- browser tab;
- monitor;
- user-drawn region;
- current screenshot only.

Prefer selected-window or region scope over the whole desktop.

### Privacy

- Never capture password managers, permission dialogs, secrets, or unrelated windows intentionally.
- Show exactly which window/region is shared.
- Stop sharing automatically when the target closes or the session expires.
- Retention of screenshots/samples is separate from transcript retention.
- Incognito sessions may use ephemeral samples only.

## 5. Communication AI provider

### Purpose

Do not spend expensive reasoning-model tokens on every greeting, acknowledgment, casual exchange, or presence filler.

Separate two roles:

```text
Communication Provider
├── casual conversation
├── acknowledgments/backchannels
├── character tone
├── concise reformulation
├── conversational pacing
└── voice/presence metadata

Reasoning Provider
├── coding
├── research
├── hard questions
├── planning
├── tool use
├── risk-sensitive decisions
└── complex analysis
```

### Escalation model

The communication model is not allowed to invent a technical answer merely to avoid escalation.

```text
owner turn
  -> route classification
  -> communication model handles simple conversation
  OR
  -> reasoning model receives bounded structured problem
  -> reasoning result returned
  -> communication layer presents without changing facts
```

The response should preserve provenance:

```text
answered by: communication
consulted: reasoning/codex
```

### Avoid double-model waste

Do not always run both models. Escalate only when:

- the owner requests deep thinking;
- coding/research/tools are needed;
- confidence is low;
- the question is high stakes;
- a configured complexity threshold is reached;
- the owner manually selects the reasoning provider.

When the reasoning model is working, the communication layer may provide truthful status such as:

> “Give me a moment; I’m checking that properly.”

It must not fabricate progress or conclusions.

### Manual control

- Auto route.
- Communication only.
- Reasoning only.
- Ask reasoning provider.
- Per-Companion default.
- Per-session override.

## 6. Focus Room

### Purpose

A Focus Room is a scoped work/study session with one teacher/coach Companion.

Examples:

- programming lesson;
- TryHackMe or authorized CTF/lab learning;
- mathematics;
- English practice;
- document review;
- UI/design feedback;
- project planning.

The Agent assists with the user's authorized task and does not convert lab guidance into attacks against real systems.

### Focus Session object

```text
FocusSession
├── goal
├── subject/room
├── teacher Companion
├── active Skill versions
├── selected window/region
├── microphone/camera/screen permissions
├── session notes
├── shared artifacts
├── checkpoints
├── started/ended timestamps
└── retention policy
```

### Interaction

1. Owner chooses teacher Companion and goal.
2. Owner selects whether the Agent may hear, see camera, or inspect a window.
3. Owner works normally.
4. `Look now` captures the visible problem only when requested.
5. Owner explains what has been tried.
6. Teacher gives hints, questions, or explanations based on configured teaching style.
7. Session produces optional notes/progress without automatically creating broad personal memory.

Teaching modes:

- hint only;
- Socratic questions;
- explain concept;
- check my work;
- show next step;
- full solution only when explicitly requested/appropriate.

## 7. Desktop Companion window

### Visual references

Three local reference screenshots are intentionally **not committed** because their redistribution rights are unknown. They are preserved at:

```text
C:/Users/The1a/Documents/Ideas/assets/agentgate-focus-presence/
├── full-companion-window.png
├── desktop-avatar.png
└── transparent-pinned-assistant.png
```

They demonstrate three useful patterns:

1. full character window with standard controls;
2. avatar rendered over a desktop/background;
3. transparent always-on-top character with message bubble beside another application.

### Window modes

- Full Companion room/window.
- Transparent desktop Companion.
- Docked left edge.
- Docked right edge.
- Compact portrait/orb.
- Hidden/minimized while voice continues.

### Desktop behavior

- always-on-top toggle;
- click-through toggle so the avatar does not block the app underneath;
- drag/resize;
- monitor selection;
- opacity;
- left/right docking;
- reduced motion;
- frame-rate/quality budget;
- hide/show message bubble;
- push-to-talk and `Look now` controls;
- visible eye/microphone/screen state indicators.

The desktop Companion is a presentation client. It does not receive unrestricted system/cursor/keyboard authority.

## 8. Pointing and drawing overlays

This is not impossible, but it is later than screenshot guidance.

A transparent overlay can draw:

- rectangles;
- arrows;
- highlights;
- numbered steps;
- short labels.

Safe staged design:

### Stage 1

Agent inspects an explicit screenshot and describes locations verbally.

### Stage 2

Agent returns normalized coordinates and AgentGate draws temporary annotations over the shared window.

### Stage 3

Interactive guided tour/highlight controls.

### Deferred

Cursor/keyboard control. This requires a separate permission, safety, and platform-control design and is not implied by screen sharing.

Overlay guidance must verify window identity/geometry so an annotation cannot drift onto the wrong application.

## 9. Phase classification

### Foundation — text/hardware-light

- multi-message pending batches;
- Add message and Respond now;
- auto-response toggle;
- message editing/deleting before commit;
- communication-versus-reasoning routing contracts;
- manual provider override;
- source-bound response metadata.

### Near-term with current hardware

- explicit screenshot/window capture;
- `Look now` assistance;
- Focus Session object and text teacher;
- AI voice/avatar output independently disabled;
- basic screen-share transport research.

### Deferred voice/presence

- VAD automatic turns;
- manual voice floor control;
- streaming ASR/TTS;
- transparent always-on-top Companion;
- 2D/3D rendering;
- camera emotion/developer telemetry;
- continuous scoped screen sampling;
- visual annotations;
- group focus/calls.

## 10. Acceptance principles

- A queued message never invokes the model before commit.
- Ordered message boundaries and attachments survive batching.
- Auto-response and manual-response behavior are obvious and reversible.
- Voice pauses do not end a turn in manual mode.
- Camera, microphone, screen analysis, AI voice, and AI avatar are independent.
- No hidden camera/screen analysis.
- `Look now` is the default visual assistance action.
- Communication routing does not run the reasoning provider for trivial turns.
- Communication routing escalates rather than hallucinating hard answers.
- Screen samples and call media obey explicit retention/incognito policy.
- Desktop Companion click-through/always-on-top never implies input control.
- Visual overlays are temporary, source-bound, and tied to the correct window.
