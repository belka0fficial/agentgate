# Dashboard-next dark cleanup — approval stop

## Applied

- Default theme is the template’s built-in dark mode; its existing theme toggle remains available.
- The template’s dark `--background` and `--card` tokens were nudged one step darker. No structural styles, spacing, or components changed.
- Removed active TanStack Query/Router devtools, all Clerk routes/assets/package references, and the unused template dashboard/financial-fixture feature.
- Replaced the template demo account labels with `Owner` / `local operator`.

## Dark captures

- [Command](dashboard-next-command-dark.png)
- [Chats](dashboard-next-chats-dark.png)
- [Approvals](dashboard-next-approvals-dark.png)

## Verification

- `npx pnpm@10.14.0 build` passes in `dashboard-next/`.
- Browser console is clean on all three captured routes.
- The existing `dashboard/` build target was not modified.

Stopped before the remaining six screen transplants.
