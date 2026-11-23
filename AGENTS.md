# Estate project instructions

Estate is a Next.js property trading board game. Apply these project preferences to future changes unless the user asks to change them.

## Game rules and implementation

- Use `docs/RULES.md` for the documented game rules, `docs/PLAN.md` for the feature plan, and `docs/LOGIC_REVIEW.md` for reviewed edge cases. Keep those documents aligned with changes to game mechanics.
- Keep room state and authorization in the Next.js `/api/game` Route Handler and `lib/room-store.mjs`, with game rules in `lib/engine.mjs`. The React client presents snapshots and sends actions; it should not decide the outcome of a move.
- Use the default Next.js `next dev` and `next start` commands. Do not restore a custom `server.mjs` entry point.
- Update meaningful engine tests when game rules change. Run the existing lint, typecheck, test, and build scripts before delivering substantial changes.

## Game screen layout

- The game screen title is **Estate**, with no eyebrow text above it. Place the title in the right information column.
- On desktop, use a two column layout with approximately 70% of the width for the left game area and 30% for the right information area.
- Keep the left game area visible and stationary at the viewport height. Size its square board as large as the available width and screen height allow, with a small margin. Favor readable board tiles, labels, and prices.
- Put the title, turn controls, players, view controls, activity, and connection information in the right column. If the content exceeds the screen height, scroll that column independently without moving the board.
- On narrow screens, allow a usable single column layout that still sizes the board to the available screen dimensions.
- After layout changes, run `npm run test:e2e` and review the desktop and narrow-screen Playwright screenshots.

## Game interactions

- Keep Property management, Trade, and Quick rules controls below the players section in the right column. Selecting one fades the board out and the selected section in. Selecting that control again returns to the board with the same fade transition.
- Clicking a board tile opens its details in a modal that fades in and out. Preserve keyboard access, focus restoration, and reduced motion support.

## Current request record

The user requested the title move, 70/30 fixed board and independently scrolling right column, larger board tiles, and this `AGENTS.md` on 2026-11-16. These are ongoing design requirements for the project.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
