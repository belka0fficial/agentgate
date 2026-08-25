# Dashboard-next transplant — approval stop

`dashboard-next/` is a direct clone of `satnaing/shadcn-admin`. The template was first run unchanged and captured as the visual ground truth. Its `globals`/theme files, Tailwind/Vite configuration, layout components, and `components/ui` primitives have not been edited.

## Side-by-side review set

| Template ground truth | AgentGate transplant |
| --- | --- |
| [Untouched template dashboard](dashboard-next-template-ground-truth.png) | [Command](dashboard-next-command.png) |
| [Untouched template dashboard](dashboard-next-template-ground-truth.png) | [Chats](dashboard-next-chats.png) |
| [Untouched template dashboard](dashboard-next-template-ground-truth.png) | [Approvals](dashboard-next-approvals.png) |

## Transplant boundaries

- Added AgentGate route/page/data modules only; the template’s existing Header, Main, Card, Table, Input, Badge, and Button components are used directly.
- Sidebar content now names AgentGate routes. No sidebar implementation or style was changed.
- Command retains the static Core in a plain template Card. Approval bindings use a template-card code block and template default/destructive button variants.
- Development fixtures preserve the review volume: 9 chat sessions and 4 pending approvals, with the same Command suggestions and host telemetry carried across. Setting `VITE_AGENTGATE_FIXTURES=0` enables live GET/POST requests to the existing endpoints.

## Verification

- `npx pnpm@10.14.0 build` passes in `dashboard-next/`.
- Browser console: 0 errors and 0 warnings across Command, Chats, and Approvals.
- The original `dashboard/` has not been modified in this pass.

Stopped before porting the remaining screens or swapping the build target.
