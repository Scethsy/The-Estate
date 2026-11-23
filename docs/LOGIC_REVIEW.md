# Estate implementation and logic review

## Architecture

- **Next.js 16 App Router** renders the responsive interface and the rules page.
- **Next.js App Router `/api/game` Route Handler** owns online rooms. The six-character code is a room locator; a server-issued token identifies a returning player. Local pass-and-play uses a single controller session. Browsers poll for snapshots.
- **`lib/engine.mjs`** is the sole game reducer. Each request copies the current game, validates and applies one action, then commits the copy only if the whole action succeeds. Dice and deck shuffling use Node's cryptographic random integer generator on the server.
- **`lib/game-data.mjs`** is the source of truth for spaces, exact deed rents, building costs, and two separate card decks.
- **`app/GameClient.jsx`** renders server snapshots. It never computes authoritative dice, payments, ownership, or auction outcomes.

## Mandatory phase model

`roll → resolving → decision / auction / debt / end → next turn`. A proposed trade suspends the current phase until its recipient accepts or declines. A queue of resolution tasks handles movement, rent, cards, taxes, GO salary, and follow-on card movement without duplicate payment. A failed payment becomes a debt and stops the queue. Settling it resumes the queued work. Sending a player to Jail ends the current movement and clears the queue.

## Invariants enforced by the engine

1. Each deed has at most one owner, zero to four houses or one hotel, and a mortgage flag.
2. Player cash is never reduced below zero by a mandatory payment. An unpaid amount becomes an explicit debt. Bankruptcy is available only when deterministic liquidation cannot cover it.
3. Turn actions require the current player, except auction bids, receiving-player trade review, and a debtor resolving a payment.
4. A purchase, auction, trade review, or debt blocks rolling and turn ending.
5. Bids never exceed cash. Trades cannot transfer an unowned deed, a deed in a developed group, or a Jail card the offerer does not hold.
6. A color group must be complete and unmortgaged before building; houses rise and fall evenly.
7. The bank tracks a fixed supply of 32 houses and 12 hotels.
8. Mortgaged deeds cannot collect rent, while unimproved complete-group rent remains doubled on other eligible deeds.
9. Room action IDs are remembered to reject a repeated network submission.
10. Restart creates a new state with all deeds, cash, positions, decks, log, and turn counters reset.

## Reviewed edge cases

- Passing GO then drawing Advance to GO can award two distinct $200 salaries, one per qualifying movement.
- A third doubles roll does not move the token or pay a landing effect.
- Doubles used to leave Jail do not earn another roll.
- The third failed Jail attempt requires the fine before the die movement resolves.
- A declining buyer can still bid in the auction.
- The first auction bid does not award a deed while others remain eligible to bid.
- Chance station and utility movement overrides ordinary station and utility rent.
- Card movement can resolve another card or mandatory payment.
- A mortgage transfer charges immediate interest; the recipient can choose immediate principal repayment or leave the deed mortgaged for a later redemption with another interest payment.
- A hotel sale requires four bank houses; full group liquidation provides a legal way to sell during a house shortage.
- Bank bankruptcy returns deeds for sequential auction; player bankruptcy transfers them to the creditor.

## Deployment constraint

The current room store is in memory. Reconnects work while the Next.js process remains alive. Server restarts, horizontal scaling, or serverless execution require a persistent shared room store. Deploy Estate as one long-lived Next.js process for now.
