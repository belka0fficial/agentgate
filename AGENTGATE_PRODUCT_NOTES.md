# AgentGate Product Notes

AgentGate is the personal AI dashboard for Hermes, a custom personal agent built
on top of ToolGate and MemoryGate.

This document captures the current product vision only. No implementation has
started yet.

## Core Assumption

ToolGate eventually contains all useful services as controlled tools:

- Personal APIs and accounts.
- Google history and other personal activity history.
- Social chats and communication tools.
- Bank and finance accounts.
- Daily operational tools and automations.
- Web, research, file, and local workflow tools.

MemoryGate eventually contains the personal memory layer:

- Life journal.
- Past decisions.
- Mistakes and lessons.
- Personal facts, preferences, habits, goals, relationships, projects, and
  context.
- Searchable evidence and memory lineage.

AgentGate should use those two layers to reduce daily friction, automate small
repeated tasks, and help the owner avoid repeating old mistakes when that mode
is wanted.

AgentGate must stay flexible. It should not force every user into a
self-productivity dashboard. For some users, AgentGate may simply be a personal
chat app with automation powers. For others, it may become a self-improvement
command center.

The product should be a modular personal agent shell where features can be
shown, hidden, removed, pinned, or added on top.

## Core Philosophy

AgentGate is for a hard-working owner who cares deeply about self-improvement
and self-reflection.

The owner often writes down what is happening in life, thinks through patterns,
asks AI how to become a better version of themselves, and works toward goal
personas across:

- Body.
- Financials.
- Education.
- Skills.
- Habits.
- Relationships.
- Discipline.
- Health.
- Personal operating systems.

AgentGate should feel like an AI that knows the owner's life deeply and can
help turn reflection into action.

The emotional metaphor:

- Hermes is like the owner's version inside the computer.
- For the computer version to improve, it needs to help the real-world owner
  improve.
- Hermes should therefore use memory, tools, and automation to help the owner
  make better choices, reduce friction, and become closer to the person they
  want to be.

This should not feel like generic advice. Hermes should use real personal
patterns, evidence, history, and goals.

This philosophy is one possible use mode, not the only product identity.
Self-improvement should be available as an app/module, but AgentGate should not
force it into the base experience for every user.

## Modular Product Model

AgentGate should be built as a flexible shell over personal agent capabilities.

Core product:

- Personal AI chat.
- Character configuration.
- Apps.
- Suggestions/feed.
- Gate overview screens for ToolGate and MemoryGate.
- Verification/action approval center.

Optional modules/apps:

- Self-improvement.
- Journal.
- Fitness.
- Finance.
- Learning.
- Social automation.
- Any custom local app Hermes or the owner creates.

Non-developer users should be able to customize the dashboard:

- Show or hide screens.
- Pin favorite apps.
- Reorder sidebar items.
- Add apps from available modules.
- Remove modules they do not want.
- Keep only chat and a small set of automations if preferred.

Developers should be able to add deeper custom modules on top of the same shell.

## Pattern-To-Automation Loop

Hermes should continuously look for repeated life patterns that could become
useful automations.

The loop:

1. Observe repeated behavior from memory, logs, chats, services, and ToolGate
   tools.
2. Infer that a recurring task or decision may be automated.
3. Draft a proposed automation in natural language.
4. Ask the owner if this would be useful.
5. If accepted, create or propose a ToolGate automation.
6. Require verification for risky actions, especially money, messages,
   purchases, account actions, and irreversible operations.
7. Track whether the automation actually helped.

Canonical example:

- Every week, friends come to the owner's house.
- The group often orders hamburgers from the same delivery company.
- Hermes notices the pattern from social chats, food delivery history, calendar
  context, and memory.
- Hermes proposes an automation:
  - Send a natural message that sounds like the owner: `boys, are we eating
    today?`
  - Wait for replies.
  - Count who is coming.
  - Send a follow-up like: `okay, I buy X hamburgers then`.
  - Prepare the delivery order.
  - Ask the owner for verification before spending money.
  - Only place the order after approval.

Important rule:

- Hermes can suggest and prepare automations.
- Money movement, purchases, social messages with consequence, and other risky
  actions require ToolGate verification.

This is the desired product behavior: the owner does not need to manually think
of every automation. Hermes finds useful possibilities from life patterns and
asks whether to turn them into systems.

## Self-Improvement Operating System

AgentGate should help the owner become their goal self.

Useful areas:

- Body and physique.
- Nutrition and calories.
- Sports and training.
- Money and financial decisions.
- Education and learning plans.
- Skill practice.
- Social habits.
- Reflection and journaling.
- Work discipline.
- Mistake prevention.
- Life-quality improvements.

Hermes should be able to answer questions like:

- What patterns are holding me back?
- What did I repeat this week that I said I wanted to stop?
- What small automation would save me effort?
- What should I focus on if I want to become my goal persona?
- What product, app, workflow, or routine would make my life easier?
- What did I learn about myself recently?

Hermes should combine self-reflection with practical execution. It should not
only say what to do; it should help build the systems that make the action
easier.

## Product Identity

AgentGate should not feel like a generic chat app. It should feel like a
personal AI presence with:

- A name.
- A character or figure.
- An avatar.
- A voice.
- A personality.
- Optional background story.
- Animations and presence states.
- A more real-feeling interaction model than a plain text assistant.

The character should be useful first, but emotionally present enough that the
dashboard feels like a personal companion and operator, not only a tool panel.

Default personality direction:

- By default, Hermes should feel like a personal operator: calm, practical,
  efficient, and focused on helping the owner get things done.
- When configured, Hermes can become more like a companion character with a
  stronger persona, richer avatar presence, voice, emotional behavior, and
  background story.

This means AgentGate should support a practical default mode without forcing
heavy roleplay, while still allowing deep character creation for users who want
that.

## Character System

AgentGate should eventually support user-created AI characters.

Character configuration may include:

- Name.
- Avatar or visual identity.
- Photo.
- 3D model.
- Other visual concepts or generated character art.
- Voice.
- Voice model settings.
- Voice reference audio.
- Personality.
- Background story.
- Physical description.
- Preferences.
- Speaking style.
- Emotional style.
- Boundaries and behavior rules.
- Relationship style with the owner.

Hermes should be the main and only character for now.

The product should not start with multiple characters or character groups. That
would add too much persona-management complexity before the core personal agent
experience is proven.

The owner can still configure Hermes deeply, but the system should treat Hermes
as one continuous agent identity.

## Character Memory And General Preferences

AgentGate should save the configured Hermes character profile, but MemoryGate
should not store most learned preferences as character-specific relationship
facts.

Instead, MemoryGate should store general owner facts or theories when useful.

Example:

- If Hermes has a teasing persona and the owner seems to enjoy it, MemoryGate
  can store a general preference such as `the owner may enjoy playful teasing`.
- It should not overfit that into `the owner likes when this specific teasing
  persona teases them`.

Some context may still matter. For example, the owner might like teasing from a
feminine persona but not a masculine one, or only in low-stress contexts. Those
details can be captured later as more nuanced preference theories, but the
default should be generalized and cautious.

Useful memory types for this:

- Fact: stable preference the owner explicitly confirms.
- Theory: inferred preference that may need confirmation.
- Context: situation where a preference seems to apply.

This keeps Hermes adaptive without making memory too narrowly tied to persona
performance.

## Voice Direction

The current preferred voice direction is `QwenTTS3` or a similar open-source
TTS system because it is free, high-quality, and supports expressive emotional
speech.

The voice layer should eventually support:

- Character-specific voices.
- Emotional delivery.
- Reference-audio based voice configuration if available.
- Text-to-speech for normal responses.
- Realtime or near-realtime speech in call mode.

The first version can start simpler, but should not hardcode the product around
one paid voice provider.

## First-Run Setup

When AgentGate opens for the first time and no owner or character profile is
configured, it should show a setup flow.

The setup should ask about the owner:

- What should the AI call you?
- Basic personal information the owner wants Hermes to know.
- Preferences for tone, help style, privacy, and automation boundaries.

The setup should ask about the first character:

- Character name.
- Avatar or visual identity.
- Voice choice or voice setup.
- Personality style.
- Optional background story.
- Initial behavior preferences.

The setup should be skippable step by step. A user should be able to skip a
specific step without skipping the whole setup.

Setup should feel like configuring a personal agent, not filling a corporate
settings form.

## Navigation

The primary navigation layer is a sidebar.

Desktop:

- Persistent sidebar.
- Main content area changes by selected section.

Mobile:

- Hamburger button.
- Slide-out or overlay menu.

Primary navigation:

- Home.
- Chats.
- Verifications.
- Suggestions.
- Apps.
- Gates.
  - ToolGate.
  - MemoryGate.
- Cron Jobs.
- Settings.
  - Character.

Optional sections or pinned apps can add specialized experiences such as
self-improvement, fitness, finance, journal, learning, or project dashboards.

Character configuration belongs inside Settings, not as a primary sidebar item.

Home should include pinned favorite apps at the top so the owner can quickly
open the personal tools they use most.

Default navigation order:

1. Home.
2. Chats.
3. Verifications.
4. Suggestions.
5. Apps.
6. Gates.
7. Cron Jobs.
8. Settings.

Default navigation groups:

- Gates contains ToolGate and MemoryGate as separate screens.
- Settings contains Character.

## Chats List Screen

The `Chats` sidebar button opens a chat list screen.

Top controls:

- Search bar.
- Filters.
- Sort controls.
- New chat button.

Main content:

- List tiles for all chats.
- Similar information density and interaction model to modern AI apps such as
  ChatGPT or Claude.
- Selecting a chat opens that conversation.
- Selecting new chat opens a fresh conversation.

## Chat Screen

The chat screen should be much more complete than a basic AI chat UI.

Each message should support:

- Timestamp.
- Copy.
- Share.
- Read aloud.
- Retry.
- Fork conversation from this point.
- Optional good/bad response feedback.

Good/bad feedback may be less useful unless AgentGate has a local improvement
loop, analytics, preference memory, or prompt-tuning mechanism.

## Privacy Modes

AgentGate should have advanced incognito controls.

Two possible incognito toggles:

- MemoryGate incognito: conversation does not write to long-term memory or
  evidence capture.
- Chat-session incognito: conversation does not persist in chat history.

These are separate because a user may want an ephemeral chat that still uses
memory, or a saved chat that does not affect memory.

## Search And Context Modes

AgentGate should support deep context retrieval.

Initial idea:

- Memory deep search.
- Custom tools deep search.
- Web deep search.

Potential simplification:

- Auto mode decides which context sources to use.
- Advanced users can override source toggles.

The goal is to avoid a cluttered control bar while still allowing powerful
source control when needed.

## Voice Mode

Voice mode should support speech input.

Basic mode:

- Transcribe speech to text.
- Send transcript as the message.

Advanced mode:

- Send or analyze the original audio as additional context.
- Detect emotional cues from tone, pacing, volume, pauses, and stress.
- Provide word-level or timestamped emotional annotations where useful.
- Use those annotations to help Hermes respond better, especially in sensitive
  conversations.

## Video Mode

Video prompting should work similarly to voice mode but with visual context.

Possible video context:

- Objects in the environment.
- The user's face and visible emotional state.
- Screen or workspace context.
- Sensitive-topic response adaptation based on expression and affect.

The model may analyze video directly or use a vision model to extract structured
context that becomes part of the prompt.

## AI Speech Output

AgentGate should support automatic spoken output.

Behavior:

- Hermes writes a text response.
- AgentGate immediately plays the response as character voice.
- Voice should match the character persona.
- Voice should include emotional delivery where possible.

## Realtime Call Mode

Realtime call mode should support live interaction.

Possible modes:

- Voice-only call.
- Voice plus camera.
- AI avatar visible during the call.
- 3D model if practical.
- Fallback pre-generated animation states if full realtime 3D is too expensive
  or unrealistic.

Potential avatar states:

- Idle.
- Listening.
- Thinking.
- Talking.
- Concerned or emotionally attentive.
- Celebrating or approving.

The implementation should be realistic about what can be built well. A polished
2D or pre-rendered animated avatar may be better than a weak 3D model.

## Model Controls

Chat should support AI runtime controls:

- Provider: OpenAI, Anthropic, Google, or other configured providers.
- Model.
- Intensity: light, medium, high, very high.

Intensity should likely control reasoning depth, context budget, tool-use
patience, verification strictness, and willingness to run multi-step plans.

## Rich File UI

AgentGate should have a rich artifact and file experience.

Desired behavior:

- If Hermes creates or edits a file, the user can open it in a right-side pane.
- Chat remains on the left side.
- Files can be previewed without leaving the conversation.

Supported previews should eventually include:

- Markdown and README files.
- Images.
- Tables.
- Documents.
- Diagrams.
- Possibly generated reports, plans, and structured data.

The user should also be able to attach their own files and documents to the
chat.

## Response Selection And Replying

The user should be able to select text inside an AI response and reply to that
specific selection.

Desired UI behavior:

- User selects part of an AI response.
- UI shows the selected text as quoted context.
- User replies to that selection.
- The reply appears connected to the selected text with a reply arrow or similar
  affordance.
- Multiple replies can exist for the same selected text.

This should feel closer to document comments or threaded annotations than a
single quote-reply feature.

## Chat Screen Feature Summary

The first version of the chat area should eventually include:

- Chat list.
- New chat.
- Search, filter, and sort.
- Message timestamps.
- Copy/share/read aloud/retry/fork.
- Optional response feedback.
- Dual incognito controls.
- Deep context/source controls.
- Voice input.
- Video input.
- Auto speech output.
- Realtime call mode.
- Provider/model/intensity controls.
- File and artifact side pane.
- Rich previews.
- User file attachments.
- Selection-based replies and threaded annotations.

## Verifications Screen

Verifications are the approval center for everything that needs owner consent.
They are not only for existing ToolGate tool execution. They can cover creation,
modification, execution, purchases, messages, and any sensitive action.

The Verifications screen should show:

- Pending approvals.
- Approved, rejected, dismissed, and expired requests.
- The tool, app, automation, creation, edit, or action being requested.
- Arguments or a redacted action summary.
- Risk/severity.
- Expiry time.
- Which system or agent requested it.
- Approve and reject actions.
- Optional note/reason.

Approval UX should also appear inline in chat when Hermes triggers an action
that needs confirmation.

Important rule:

- Verification is for sensitive actions and owner decisions, including tool
  execution, app creation, automation creation, spending money, sending
  messages, or changing important configuration.

AgentGate becomes a verification client for ToolGate, while ToolGate remains the
system that owns exact approval binding, nonce, expiry, replay protection, and
audit trails.

## Gates Screens

ToolGate and MemoryGate are the main underlying gates. They can be grouped under
a `Gates` navigation heading, but they should remain separate screens because
they represent different systems.

ToolGate screen:

- ToolGate overview.
- Tool catalog.
- Automations.
- Verifications/requests link.
- Health/status.
- Recent action activity.
- Approval behavior and risk summaries.
- Links to the deeper ToolGate dashboard if needed.

MemoryGate screen:

- MemoryGate overview.
- Memory search.
- Recent memories.
- Facts, theories, context, watch items.
- Evidence lineage.
- Connected MCP servers.
- Health/status.
- Recent memory activity.
- Links to the deeper MemoryGate dashboard if needed.

## Tools Overview

Tool visibility can live inside the Gates screen or as an optional pinned app.

AgentGate should show the tools Hermes can actually see.

This should be based on Hermes' fetched MCP tools, not only ToolGate's internal
catalog, because Hermes may eventually have tools from multiple MCP servers.

The Tools screen should show:

- MCP server name.
- Tool name as Hermes sees it.
- Original source or backend when available.
- Description.
- Input schema.
- Last used time.
- Success/failure count.
- Whether the tool may require approval.
- Example invocation if useful.
- Search and filters.

For ToolGate-backed tools, AgentGate can show the original ToolGate ID and
approval behavior. For non-ToolGate MCP tools, it should still show the
standard MCP metadata.

## Memory Overview

Memory visibility can live inside the Gates screen or as an optional pinned app.

AgentGate should have a way to inspect MemoryGate context and beliefs.

Possible views:

- Search memory.
- Recent memories.
- Important facts.
- Theories and inferred preferences.
- Watch items.
- Mistakes and lessons.
- Life journal timeline.
- Evidence lineage when available.

The screen should help the owner understand what Hermes believes, what it is
uncertain about, and what it is using to make decisions.

Memory edits should likely happen through MemoryGate or controlled AgentGate UI,
not through hidden chat behavior.

## Cron Jobs And Scheduled Intelligence

Cron jobs are built-in Hermes functionality, not an optional module.

AgentGate should support scheduled Hermes jobs as a first-class screen.

Possible recurring jobs:

- Daily review of logs, messages, notes, and memory updates.
- Weekly life-quality suggestions.
- Fitness and calorie tracking support.
- Product or service discovery based on current goals.
- Mistake-pattern detection.
- Reminder generation.
- Opportunity detection.
- Account, subscription, or finance checks.
- Personal research digests.

Example:

- Hermes knows the owner wants to track calories and does sports with many
  movements.
- A scheduled job searches memory, web, tools, and shopping/product sources.
- It finds products or workflows that could reduce friction.
- It sends a notification with the idea, why it matters, and where to buy or
  learn more.

Scheduled jobs should have:

- Name.
- Goal.
- Schedule.
- Context sources.
- Allowed tools.
- Approval policy.
- Output destination.
- Last run.
- Next run.
- Logs and results.
- Disable/pause button.

## Missions And Closed-Loop Improvement

Hermes should be able to work toward outcomes over time, not only answer chats
or execute isolated commands.

A `Mission` is a persistent, measurable objective that can coordinate
MemoryGate context, ToolGate actions, cron jobs, suggestions, verifications,
notifications, and AgentGate apps.

The mission loop is:

`Observe -> Understand -> Predict -> Propose -> Verify -> Act -> Measure -> Learn`

Example missions:

- Improve sleep without harming work or training.
- Reach a physique target while keeping food convenient.
- Reduce unnecessary monthly spending.
- Learn a skill through a realistic practice system.
- Finish a project while protecting important relationships and health.

Each mission should contain:

- Desired outcome and why it matters.
- Success measures and current baseline.
- Constraints, boundaries, budget, and deadline.
- Relevant memories, tools, apps, people, and data sources.
- Current plan, experiments, and scheduled jobs.
- Decisions and actions waiting for verification.
- Progress history and evidence.
- A review loop that keeps, changes, or stops ineffective actions.

Missions should support `shadow mode`: Hermes observes and shows what it would
have done without taking real actions. The owner can grant more authority only
after the behavior proves useful.

Missions are personal-agent functionality, but their UI can remain an optional
app so AgentGate is still useful to someone who only wants chat and automation.

## Deeper Personal-Agent Powers

The strongest AgentGate capabilities come from combining all gates and agent
systems rather than exposing each one separately.

### Personal Policy Engine

The owner should be able to describe permanent rules in normal language, such
as:

- Never spend more than a configured amount without asking.
- Never send an emotional message immediately; prepare it and wait.
- Do not share private information with a particular service or person.
- Prefer healthy food unless the owner explicitly chooses otherwise.
- Do not interrupt during sleep, training, or focused work unless urgent.

Hermes can translate these rules into inspectable ToolGate permissions,
verification policies, notification rules, and mission constraints. This gives
the owner one understandable place to define how the digital version of them is
allowed to behave.

### Attention Firewall

Hermes can become a layer between the owner and incoming noise across email,
social messages, notifications, calendars, bills, news, and services.

It can quietly classify, summarize, connect related items, prepare replies,
resolve safe routine work, and interrupt only when the owner is genuinely
needed. A daily or contextual briefing can replace repeatedly checking many
apps.

### Personal Time Machine

MemoryGate should support reconstructing periods and decisions, not only
searching isolated memories.

Hermes should be able to answer:

- What was happening when I made this decision?
- What did I believe then, and what evidence changed my mind?
- When did this habit or problem begin?
- Which previous situations looked similar, and what happened afterward?
- What promises did I make to myself or other people that remain unresolved?

This requires timelines, evidence links, changing beliefs, decisions, and
outcomes to be connected into a personal event graph.

### Life Experiments

Instead of repeatedly giving generic advice, Hermes can run small controlled
personal experiments.

It records a hypothesis, baseline, intervention, duration, measurements, side
effects, and result. Hermes can then keep, modify, or stop the change based on
evidence. Experiments can cover sleep, food, training, spending, productivity,
learning, mood, communication, and routines.

### Persistent Delegation

The owner should be able to delegate an outcome instead of continuously issuing
commands. Hermes keeps state for days or months, performs allowed steps,
returns for required decisions, recovers from failed tools, and reports the
result without losing the original intent.

Examples include planning a trip, handling a refund, comparing and buying a
product, organizing an event, preparing an application, or completing a
multi-stage personal project.

### Opportunity And Risk Radar

Scheduled intelligence can continuously look for opportunities and problems
that match the owner's real circumstances:

- Better prices, refunds, expiring subscriptions, duplicate charges, or fraud.
- Jobs, clients, grants, events, products, or learning opportunities.
- Forgotten commitments, deadlines, documents, renewals, and warranties.
- Security, privacy, account, and data-exposure risks.
- Health, relationship, project, or financial patterns that deserve attention.

Hermes should rank these by personal value, confidence, urgency, effort, and
risk instead of creating a noisy feed.

### Context-Aware Modes

With permission, Hermes can adapt behavior to the owner's current context:
sleeping, driving, training, working, studying, socializing, travelling, or at
home. Context may come from time, calendar, location, connected devices,
activity, active apps, and explicit status.

The mode changes what Hermes may interrupt, which tools it may prepare, what
information is useful, and how notifications or voice interaction should work.

### Internal Specialist Teams

Hermes remains one visible character, but it may create temporary internal
specialists for research, planning, criticism, finance, safety, or execution.
They do not become separate characters or fragment the user experience. Hermes
synthesizes their work into one recommendation and remains responsible for the
final behavior.

### Self-Extending Capability

When Hermes repeatedly lacks a capability, it can identify the gap and propose
an MCP tool, ToolGate integration, cron job, workflow, or AgentGate app. It can
build and test the capability in a restricted environment, explain the new
permissions, and ask the owner before installation or activation.

This allows the personal agent to evolve around the owner's life instead of
waiting for every feature to be added to the core product.

## Discoveries And Suggestions

Hermes should have a place to surface useful observations without interrupting
the owner too much.

Discovery types:

- Life-quality tip.
- Mistake pattern.
- Health or fitness suggestion.
- Automation idea.
- Product recommendation.
- Relationship or communication insight.
- Financial or subscription warning.
- Project opportunity.
- Learning recommendation.

Each discovery should explain:

- What Hermes noticed.
- Why it may matter.
- Evidence or memory references.
- Confidence.
- Suggested next action.
- Required approval if action is needed.

The owner should be able to:

- Save.
- Dismiss.
- Ask follow-up.
- Turn into a task or cron job.
- Let Hermes act through ToolGate if approved.

This should be one central `Suggestions` screen where ideas, fixes, automation
opportunities, life-quality tips, product suggestions, and useful discoveries
arrive from all sources.

Suggestions should not imply self-improvement only. They can be practical,
technical, social, financial, lifestyle, app ideas, or anything Hermes believes
may help.

## Automation Opportunities

AgentGate should have a place where Hermes collects possible automations before
they become real ToolGate automations.

This can live inside the central `Suggestions` screen.

Each opportunity should include:

- Pattern Hermes noticed.
- Evidence sources.
- Suggested automation.
- Expected time or friction saved.
- Possible risks.
- Verification requirements.
- Draft message, purchase, workflow, or tool sequence.
- Owner decision: ignore, remind later, refine, or create automation.

This is different from existing automations:

- Opportunity: Hermes noticed something that might be useful.
- Automation: owner approved the system and it exists in ToolGate.

This keeps Hermes proactive without silently changing the owner's life.

## Notifications

AgentGate should support proactive notifications.

Example:

- The owner sends or receives some text.
- Hermes analyzes it through configured logs or listeners.
- Hermes sends a notification with a correction, warning, tip, or suggestion.

Notifications should be configurable so Hermes does not become noisy.

Notification settings should include:

- Quiet hours.
- Priority thresholds.
- Allowed categories.
- Sensitive-topic handling.
- Whether to notify immediately or batch into digest.

Default behavior:

- Quiet by default.
- Hermes can think, scan, and prepare discoveries in the background.
- It should not interrupt unless the insight is important, time-sensitive, or
  explicitly configured as allowed.

Notification channels:

- Mobile push notification from the AgentGate mobile app.
- Email.
- Chat message inside AgentGate.
- Other communication channels exposed through ToolGate.

Mobile push is especially important because it lets the owner quickly see an
idea, write a response, approve, dismiss, or ask Hermes to continue.

## Agent-Built Apps And Services

Because Hermes may have controlled machine access through ToolGate tools, it can
eventually create useful local services or mini apps for the owner.

Examples:

- A personal physique tracking app.
- A piano finger-practice app connected to a keyboard.
- A small dashboard for a recurring goal.
- A custom tracker for a personal experiment.
- A workflow-specific local tool.

AgentGate should have an `Apps` or `Projects` area where these generated
services can be listed, opened, paused, inspected, and managed.

Apps should behave like chats structurally:

- Press `Apps` in the sidebar.
- See a searchable/filterable/sortable list of apps.
- Press an app.
- Open the app-specific screen.
- The app can define what appears inside its workspace.

The user should be able to pin favorite apps into the sidebar or home screen.

Journal should not be a hardcoded top-level AgentGate screen. If the owner wants
a journal, it should be an app.

Important boundary:

- Hermes can propose or scaffold services.
- ToolGate should approve sensitive filesystem, network, port, credential, or
  deployment actions.
- AgentGate should show what was created and why.

Useful app/project metadata:

- Name.
- Purpose.
- Local URL or port.
- Source folder.
- Status.
- Created by Hermes.
- Related memory/goals.
- Logs.
- Stop/restart controls.
- Security/approval history.

## Operating Model

AgentGate should coordinate all powers without becoming chaotic:

- ToolGate controls actions, tools, approvals, secrets, and risky operations.
- MemoryGate stores personal context, evidence, memory, facts, and theories.
- Hermes reasons across memory and tools.
- AgentGate is the user-facing modular shell for home, chat, verifications,
  suggestions, cron jobs, gate screens, notifications, settings, and apps.

The dashboard should make Hermes feel powerful but inspectable. The owner should
always be able to see what Hermes knows, what it can do, what it wants to do,
and what it already did.

## Open Product Questions

- What should the default Hermes operator personality sound like?
- Should character profiles live in AgentGate only, or should MemoryGate also
  store character identity and relationship history?
- How should Hermes distinguish confirmed owner facts from softer preference
  theories?
- Which screens are core and which screens are removable modules?
- Should MemoryGate incognito default to on for sensitive chats, or be fully
  manual?
- Should chat-session incognito imply MemoryGate incognito, or remain fully
  independent?
- Should deep search be a simple `Auto / Off / Advanced` control instead of
  three separate toggles?
- Should ToolGate approval requests appear inside chat, in a side panel, or in a
  global approval inbox?
- How should Hermes cron jobs relate to ToolGate automations?
- Should generated local services be first-class `Apps`, `Projects`, or both?
- Should realtime avatar start as 2D, pre-rendered states, or true 3D?
- What is the minimum lovable first version of chat before voice/video/avatar?

## Current Scope Boundary

Do not build the dashboard yet.

The first-version architecture and phased build are defined in
`AGENTGATE_IMPLEMENTATION_PLAN.md`.

Do not begin implementation until the owner explicitly approves the plan and
gives the command to start.
