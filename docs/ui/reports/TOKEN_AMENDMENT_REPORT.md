# Token Amendment — Command + Chats

Status: complete; stopped for approval before the remaining seven screens.

## Applied construction

- Cards: 12px radius, no default border, 20–24px internal padding, and a visible `--card` surface step above the void background.
- Inputs and controls: 8px radius and 40px control height.
- Primary actions: light-on-dark filled pills; quiet actions stay ghosted.
- Command stats: six stat cards with 26px semibold mono values and 12px dim labels.
- Section headers: 15px medium title plus a descriptive line when it clarifies the card’s purpose.

## Screenshot evidence

| View | Desktop | 380px |
|---|---|---|
| Command | [desktop](token-amendment-desktop-command.png) | [mobile](token-amendment-mobile-command.png) |
| Chats | [desktop](token-amendment-desktop-chats.png) | [mobile](token-amendment-mobile-chats.png) |
| Chat detail | [desktop](token-amendment-desktop-chat-detail.png) | [mobile](token-amendment-mobile-chat-detail.png) |

## Added construction references

- [`base-shadcn-blocks-dashboard-dark.png`](../refs/base-shadcn-blocks-dashboard-dark.png)
- [`base-shadcn-blocks-login-dark.png`](../refs/base-shadcn-blocks-login-dark.png)
- [`base-shadcn-blocks-form-dark.png`](../refs/base-shadcn-blocks-form-dark.png)

The captures are derived from the dark-mode blocks on [shadcn/ui Blocks](https://ui.shadcn.com/blocks), used as construction targets only—not copied screen designs.

`npm run build` passes. No motion or work on the other seven screen layouts has been started in this amendment.
