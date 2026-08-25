# AgentGate UI — Fit & Finish Checklist (Pass 1.5)

These are the small details that separate a professional instrument from a demo. All are REQUIRED. They extend agentgate-ui-requirements.md; token/motion laws apply to every item. Nothing here changes backend contracts.

## Command palette & search
- Search input shows a `Ctrl K` kbd chip inside the field, right-aligned (real <kbd> styling: 1px --line border, 2px radius, mono 10px, --text-dim). Hidden when the field is focused.
- Ctrl+K opens the omnibar from ANY screen, focused, with recent commands + fuzzy match over: navigation targets, sessions, approvals, automations, memory search handoff. Esc closes and returns focus to the previous element.
- Omnibar rows show their type as a small left tag (nav / chat / approval / action) and a right-aligned kbd hint when one exists.
- `/` also focuses search on list screens (like GitHub). Typing `>` in the omnibar switches to actions-only mode.

## Keyboard everywhere
- Global: Ctrl+K palette · g then c/a/s/m (go to Command/Approvals/System/Memory) · ? opens a shortcuts overlay (one modal listing everything, generated from a single shortcut registry — no hardcoded duplicate list).
- Lists: j/k move focus, Enter opens, focused row gets a 2px --signal left bar (same language as active nav).
- Approvals: a approve / r reject on the focused item, with a 200ms undo window toast.
- Chat: Enter send, Shift+Enter newline, Esc stops a running generation (wired to the real stop endpoint), ↑ edits last owner message.
- Every interactive element reachable by Tab with a visible focus ring (--signal, 1px offset). No focus traps; modals return focus on close.

## Micro-interactions & affordances
- Every machine value (id, digest, port, path, session id) is click-to-copy: cursor pointer, subtle copy glyph on hover, "Copied" inline flash (300ms) — not a toast.
- Relative timestamps everywhere ("4m ago"), absolute ISO on hover via title attr; timestamps are live (re-render on a 30s tick).
- Buttons have distinct hover (surface lightens one step), active (pressed, translateY 1px), disabled (40% opacity + not-allowed), and in-flight (label swaps to a 3-dot mono pulse, width locked so nothing jumps) states.
- Destructive actions (reject, delete, kill): the button is danger-colored AND requires either the confirm-in-place pattern (first click arms it: "Reject?" for 3s) or the existing approval flow — never a browser confirm().
- Toasts: bottom-right, max 3 stacked, mono body, auto-dismiss 5s, hover pauses timer, each has an action slot (Undo / View). Toasts are for outcomes, not narration.
- Tooltips: 400ms delay, mono 11px, only where a control's meaning isn't self-evident; every icon-only button MUST have one + aria-label.
- Scroll: custom thin scrollbar (6px, --line thumb), scroll position preserved per screen when navigating away/back.
- Tables/lists: sticky headers, hover row highlight (one surface step), right-aligned numeric columns, tabular-nums enabled on all mono numerals so ticking values don't wobble.

## Loading, empty, error (state honesty)
- Loading: skeleton rows in list shapes (no spinners on full screens); the Core is NEVER used as a loading indicator — it reflects agent state only.
- Every screen has its designed empty state (one sentence of direction + one action) and error state (what failed, in plain words + Retry button that actually retries the failed call).
- Offline/unreachable: a single top bar strip "Connection lost — retrying" with auto-backoff; UI stays readable (last data dimmed to 60%, marked stale), never a blank screen.
- Optimistic updates (approve/reject, pause/resume) reconcile on response; on failure the item visibly reverts + toast with the reason.

## PWA & platform polish
- Real favicon + PWA icon set (the Core glyph, monochrome, maskable variant), themed manifest (name AgentGate, background #050608, display standalone), correct theme-color meta so the phone status bar matches the void.
- Per-screen document titles: "Approvals (2) · AgentGate" — pending counts in the title.
- Safe-area insets respected (iOS/Android PWA notches), no 300ms tap delay, touch targets ≥44px on phone even where desktop rows are 32px (padding scales at the 380px breakpoint).
- Text selection color = --signal at 25% opacity; ::selection styled. No blue Android tap-highlight (transparent -webkit-tap-highlight-color).
- Reduced motion: verified again after this pass (state changes instant, no information lost).

## Consistency registry (do this first)
- One `ui/registry.ts` (or equivalent) exporting: shortcut map, status→dot-color map, entity-type→tag map, timestamp formatter, copy-to-clipboard helper. Every screen imports from it. Grep check: zero locally re-implemented versions of these five things anywhere.

## Acceptance additions
17. Ctrl+K works from all 9 screens; kbd chip renders in every search field; ? overlay lists every shortcut and is generated from the registry.
18. Copy-to-click works on 5 sampled machine values across 3 screens.
19. Kill the network in devtools: every screen shows its designed stale/offline treatment; restore: it recovers without reload.
20. Phone audit: all touch targets ≥44px at 380px; PWA installed icon + splash + status bar color correct.
21. Registry grep passes (no duplicated shortcut/status/timestamp logic).
