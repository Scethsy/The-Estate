# Estate development plan

## Product goal

Build a playable 2–5 player property trading game with Estate's 40 named spaces, exact deed rent schedules, classic movement and economy, local pass-and-play, and private online rooms. The rulebook is the product contract; server state is the authority.

## Delivery stages

| Stage | Deliverable | Status |
|---|---|---|
| 1. Rules model | Board, deed tables, building costs, 16 Chance cards, 16 Community Chest cards, Estate overrides | Complete |
| 2. Game engine | Turn phases, dice, movement, purchases, auctions, rent, buildings, mortgages, trades, Jail, debt, bankruptcy, winner, restart | Complete |
| 3. Multiplayer | Six-character rooms, host lobby, authenticated player seats, server-side validation, reconnect, action deduplication | Complete for one running server |
| 4. Interface | Responsive 40-space board, tokens, ownership/building indicators, deed details, action panels, activity log, final standings | Complete |
| 5. Rules and review | Complete rules page, source document, logic review, rule exceptions | Complete |
| 6. Verification | Engine tests, lint, type check, production build, HTTP API smoke check, Playwright layout tests | Complete |
| 7. Production operations | Durable room storage if hosting across restarts or multiple servers | Future deployment work |

## Acceptance checks

1. Starting or restarting makes a clean Round 1 game: every player at GO with $1,500 and every deed unowned.
2. A roll or card movement changes only the Next.js server's state; clients obtain the same snapshot through polling.
3. Every landing resolves GO salary, purchase, auction, rent, tax, card, or Jail exactly once.
4. A mandatory decision blocks turn progress until resolved.
5. A building, mortgage, trade, auction bid, or debt action is rejected if its prerequisites are missing.
6. A receiver must accept a trade before cash or deeds move.
7. A disconnecting player can rejoin their seat while the server remains alive.
8. The last nonbankrupt player wins and can start a fresh match.

## Operating model

Run the default Next.js commands: `npm run dev`, or `npm run build` followed by `npm start`. The App Router's `/api/game` Route Handler owns authenticated rooms and game actions. Clients poll for updated snapshots. The current storage is process memory, so run one long-lived Next.js instance. Persistent shared storage is the next step for restart recovery, serverless deployment, or horizontal scaling.
