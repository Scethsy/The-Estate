# Estate

Estate is a 2–5 player property trading game built with Next.js 16 App Router. Its Next.js API owns the game state. It supports pass-and-play and private online rooms.

## Run locally

Use Node.js 20.9 or newer.

```sh
npm install
npm run dev
```

Open `http://localhost:3000`. Choose **Pass & play** to start a local match, or create an online room and share its six-character code. Other players join at the same URL. The browser polls the Next.js API for room updates. A returning player automatically rejoins their seat after a page reload or brief disconnect while the Next.js process remains running.

On this Windows machine, Node is installed at `C:\Program Files\nodejs` but may be missing from the shell `PATH`. Add that directory to `PATH` before running npm scripts if needed.

## Verify and build

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

`scripts/smoke.mjs` checks a running Next.js app's pages, room setup, turn authorization, restart, and reconnection. Run it with `node scripts/smoke.mjs` while the app is running.

To run the production build, use `npm run build` followed by `npm start`.

## Rules and design

- [Complete game rules](docs/RULES.md)
- [Logic and architecture review](docs/LOGIC_REVIEW.md)
- [Development plan and acceptance checks](docs/PLAN.md)
- The same rules appear in the web app at `/rules`.

Room state is in memory. Run one long-lived Next.js process for a match. Server restart recovery, serverless deployment, and multi-instance hosting require a persistent shared room store.
