---
version: alpha
name: AgentGate Product UI
description: Local-first personal AI OS control plane; calm, dense, source-bound, operator-grade.
colors:
  primary: "#F8FAFC"
  secondary: "#9CA3AF"
  tertiary: "#10B981"
  neutral: "#020617"
typography:
  h1:
    fontFamily: Inter
    fontSize: 1.875rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: 6px
  md: 8px
  lg: 12px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
components:
  page-main:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    padding: 24px
  status-live:
    backgroundColor: "{colors.tertiary}"
    textColor: "#001B12"
    rounded: "{rounded.sm}"
  settings-row:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
---

## Overview

AgentGate is an operator UI for a local-first personal AI operating system. The dashboard must feel like a calm control plane, not a marketing page, character shrine, or generated admin template.

Every surface is source-bound. If a backend contract does not exist, the UI says `planned`, `unknown`, `empty`, `blocked`, `degraded`, `offline`, or `stale`. It must never invent live health, activity, provider freshness, memory insight, tool output, or automation capability.

## Colors

Use existing app tokens (`background`, `foreground`, `muted`, `muted-foreground`, `card`, `border`, `accent`, `destructive`) rather than raw Tailwind color decoration. Accent color is functional: live/source-ready affordances, selected states, and owner-required actions. Do not introduce purple/indigo AI gradients or mascot color branding as a default product identity.

## Typography

Product UI copy is short, factual, and operational. Use one page title, compact section labels, and readable body text. Avoid marketing hero copy inside authenticated tools. Monospace is reserved for IDs, schedules, routes, model labels, and metadata values.

## Layout

The authenticated app uses the available page width deliberately.

- Do not place configuration/settings content in a narrow left column while the right side is empty.
- A max-width is allowed only for reading-heavy prose, auth gates, modals, chat message bodies, or deliberately centered onboarding.
- Settings/configuration pages use full-width rows, forms, tables, or split panes.
- If a page uses a right column, it must have a real job: inspector, preview, source details, safety boundary, current selection, next action, or contextual help.
- Card grids are not the default. Use rows/tables for comparable records and split inspector layouts for object details.
- Avoid repeated decorative panels. If a panel does not expose state, a control, a source, or a decision, remove it.
- Desktop target: 1440px must not show useless right-side voids on operational screens.
- Mobile target: 390px must preserve all controls, statuses, and labels without horizontal overflow.

## Elevation & Depth

Use borders and muted backgrounds for structure. Shadows and glow are rare and must clarify active surfaces, not decorate static content. Dense operational screens should look stable and quiet.

## Shapes

Use project radii consistently. Do not escalate everything to `rounded-2xl` or `rounded-3xl` unless it is a primary shell or lock/onboarding surface. Settings rows and data panels use `rounded-md`/`rounded-lg`.

## Components

- **Settings row:** label, concise description, source/status, control or route affordance. Full width unless inside a purposeful split pane.
- **Status badge:** visible text required; color alone is never the state.
- **Source-bound section:** title, source label, status, rows/items, and explicit empty/degraded copy.
- **Inspector pane:** selected object details, safe metadata only, and allowed actions. Never expose secrets, raw prompts, hidden instructions, raw tool arguments, command lines, provider URLs, host paths, env dumps, or broad memory prose.
- **Forms:** normal labels and inputs. Use two or three columns only when fields are peers; long text uses the full row.
- **Tables/lists:** comparable records belong in rows, not repeated cards.

## Do's and Don'ts

Do:

- Build for scanability, density, and truthful operation.
- Use full-width layouts for settings, gateways, agents, jobs, memory, tools, apps, and capabilities.
- Put empty/degraded/error states where the user expects data.
- Verify desktop and mobile screenshots before claiming UI work is done.
- Keep the browser payload safe and metadata-only.

Don't:

- Leave the right side empty on an operational page.
- Use fake future controls, fake health, fake connected states, fake activity, or decorative dashboard metrics.
- Make Conker or any mascot the product default.
- Add audio, camera, avatar runtime, Live2D, or appearance/theme controls during the text-foundation phase.
- Hide dense data in pretty card piles when a table/list/inspector is clearer.
