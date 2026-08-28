---
version: alpha
name: AgentGate Control Plane
description: Dark, precise, evidence-led product UI for a local personal AI operating system.
colors:
  primary: "#EDEDED"
  secondary: "#A0A0A0"
  tertiary: "#50A8FF"
  neutral: "#0A0A0A"
  surface: "#111111"
  surface-raised: "#1A1A1A"
  border: "rgba(255,255,255,0.10)"
  success: "#00CA52"
  warning: "#FF9900"
  destructive: "#FF5E63"
typography:
  h1:
    fontFamily: Geist Variable
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  h2:
    fontFamily: Geist Variable
    fontSize: 1rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body-md:
    fontFamily: Geist Variable
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  data-sm:
    fontFamily: Geist Mono Variable
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: 4px
  md: 6px
  lg: 8px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#171717"
    rounded: "{rounded.md}"
    height: 36px
    padding: 12px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 12px
  input:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    height: 36px
    padding: 12px
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: 16px
  panel-raised:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: 16px
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  status-success:
    backgroundColor: "{colors.success}"
    textColor: "#001A08"
    rounded: "{rounded.sm}"
  status-warning:
    backgroundColor: "{colors.warning}"
    textColor: "#1F0D00"
    rounded: "{rounded.sm}"
  status-error:
    backgroundColor: "{colors.destructive}"
    textColor: "#240004"
    rounded: "{rounded.sm}"
---

## Overview

AgentGate is an authenticated operating surface for a local-first personal AI system. Its visual thesis is **quiet control with visible evidence**: the shell stays stable, resource scope is obvious, operational records scan quickly, and every result can be inspected without exposing private runtime internals to the browser.

Vercel and Geist are calibration for product discipline, not a skin. AgentGate adopts compact hierarchy, consistent materials, dense operational rows, explicit settings boundaries, and list-to-detail flows. It rejects Vercel branding, deployment terminology, marketing grids, giant headings, decorative whitespace, triangle motifs, and landing-page composition.

Every visible status is source-bound. If a backend contract cannot support a claim, label the state `planned`, `unknown`, `empty`, `blocked`, `degraded`, `offline`, `stale`, or `unavailable`. Never invent health, activity, provider freshness, memory insight, tool output, or automation capability.

## Colors

Dark mode is the primary operating scene.

- **Background (`#0A0A0A`):** dominant work surface.
- **Surface (`#111111`):** sidebar, recessed controls, table headers, and grouped regions.
- **Raised surface (`#1A1A1A`):** popovers, dialogs, selected detail, and transient overlays.
- **Primary (`#EDEDED`):** headings, controls, and essential values.
- **Secondary (`#A0A0A0`):** descriptions and non-critical metadata. Do not fade below readable contrast.
- **Focus blue (`#50A8FF`):** keyboard focus, links, and the current primary interaction only.
- **Success, warning, destructive:** real semantic state only. Never use semantic color as decoration.

Use alpha borders that adapt to the surface. Do not stack border plus broad shadow on routine panels. Avoid gradients, glow, glass, and decorative color in operational UI.

## Typography

Bundle Geist Sans and Geist Mono locally. Product labels, navigation, forms, headings, and prose use Geist Sans. Geist Mono is reserved for IDs, schedules, durations, model names, routes, code, logs, and tabular measurements.

Use weights 400, 500, and 600. Product headings are compact fixed sizes, not responsive marketing display type. Page titles use tight tracking; body text does not. UI copy is factual and short. A heading says what the region is; supporting copy explains scope, source, freshness, or recovery.

## Layout

### Global shell

The shell has three stable layers:

1. **Global navigation:** Home/Command, Chat, Approvals, Orchestration, Agents, Jobs, Capabilities, Memory, Apps, and System.
2. **Resource context:** current object and location, e.g. `System / Memory` or `Agent / Runs`.
3. **Local view controls:** filters, tabs, primary action, and overflow menu.

Do not add a fourth navigation layer unless it is a real selected-record inspector.

### Operational flow

Use the shared model:

`stable shell → scoped list → selected detail → summary → evidence → safe action/recovery`

- The list remains dense and comparable.
- The full row opens detail.
- Secondary actions stay secondary.
- Detail begins with human-readable outcome and impact.
- Raw logs and tool evidence are subordinate and revealed intentionally.

### Width and composition

- Use available width deliberately; no narrow left island with empty right space.
- Max-width is allowed for prose, auth, modals, and chat message measure—not operational records or configuration.
- Use split panes only when the right pane has a selected record, preview, evidence, safety boundary, or actionable context.
- Prefer rows, tables, description lists, and list-detail layouts over card mosaics.
- Desktop target: 1440px. Mobile target: 390px. Intermediate target: 768px.

### Mobile

Mobile is a recomposition, not a squeezed desktop table.

- Global navigation becomes a drawer.
- Keep resource identity, textual state, and primary action visible.
- Convert record rows into compact summaries with priority fields.
- Move lower-priority columns into row detail.
- Use horizontal scrolling only after semantic column collapse.
- Filters move into a compact toolbar or sheet.
- Preserve every status and action with at least a 44px touch target.

## Elevation & Depth

Use three material levels:

- **Flat:** page and plain layout.
- **Contained:** one quiet alpha border or a subtle background difference.
- **Raised:** popovers, dialogs, command palette, and selected inspector; restrained shadow allowed.

Do not use shadows to make routine cards feel important. Sticky bars may use a solid background and bottom border; blur is allowed only when content visibly passes beneath the bar and readability requires it.

## Shapes

- 4px: micro controls and compact status markers.
- 6px: buttons, inputs, tabs, row menus.
- 8px: panels, tables, inspectors.
- 12px only for major overlays when needed.
- Pills are reserved for short tags/statuses, never general buttons.

Nested radii must be concentric. Avoid `rounded-2xl`/`rounded-3xl` product furniture.

## Components

### Product page shell

A shared page shell owns location, title, source/status, concise description, primary action, filters, and overflow. Comparable routes put these elements in consistent slots.

### Tables and record lists

Stable row anatomy:

- textual status
- record identity/action
- owning app or agent
- initiator/source
- time and duration
- target/context
- result
- row action

Color never replaces status text. Row hover communicates selection affordance; focus is visible. Long metadata truncates with an accessible full-value path.

### Status vocabulary

Use explicit labels such as `Running`, `Waiting`, `Needs approval`, `Succeeded`, `Failed`, `Paused`, `Disconnected`, `Disabled`, `Unknown`, `Unavailable`, and `Planned`. Do not substitute ambiguous dots or `Active` without context.

### Empty, loading, and error states

- **Loading:** skeleton matching the final layout; no fake content.
- **Empty:** say what belongs here, why it is empty, and the real next action.
- **Filtered empty:** keep filters visible and offer clear/reset.
- **Unavailable/degraded:** name the source or prerequisite and recovery.
- **Error:** what failed, where, whether state changed, whether retry is safe, recovery action, then expandable evidence.

Never lead with raw logs or generic “Something went wrong.”

### Settings and forms

Use persistent local section navigation, full-width rows, labels, adjacent helper/error text, and explicit Save/Cancel boundaries. Group changes by actual save transaction. Disable Save until dirty and valid when the implementation supports it. Separate destructive controls at the bottom and state consequences before confirmation.

Secret values stay masked and are never sent back to the browser. ToolGate permission boundaries sit adjacent to capability controls. Do not expose controls for deferred voice, calls, camera, avatar runtime, or appearance customization.

### Chat

Keep prose measure around 720–820px and allow code/evidence to expand. Keep the composer within a stable operational width. Put real model/agent selection in a compact leading cluster. Planned controls belong in an explicitly unavailable menu, not beside live turn actions. Empty-state starters must come from loaded context where available; otherwise use neutral generic prompts.

## Do's and Don'ts

Do:

- Preserve every real feature and source-bound state.
- Make the current scope, status, primary action, and evidence path findable in seconds.
- Use full-width practical rows/forms and purposeful inspectors.
- Keep navigation and action positions stable across routes.
- Verify keyboard focus, desktop/mobile composition, long content, empty/error states, console errors, and failed requests.
- Keep browser payload metadata-only and safe.

Don't:

- Copy Vercel marketing layouts or branding.
- Build a home page from equal statistic cards.
- Hide important mobile fields/actions behind uncontrolled horizontal overflow.
- Use fake future controls, fake health, fake connected states, fake activity, or decorative metrics.
- Make Conker or any named companion the default.
- Surface secrets, raw hidden prompts, raw tool arguments/results, command lines, provider URLs, environment dumps, broad memory prose, or unrestricted host paths.
- Remove features to achieve minimalism; use hierarchy, progressive disclosure, and detail views instead.
