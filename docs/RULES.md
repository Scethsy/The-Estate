# Estate: complete game rules

Estate is a 2–5 player property trading game. Its custom names and 40-space board come from the supplied Estate Five specification; the product is named **Estate** as requested. Classic rules not specified there follow [Hasbro's Monopoly Classic rules](https://instructions.hasbro.com/api/download/C1009_en-my_monopoly-classic-game.pdf) and the [Hasbro rulebook text](https://www.hasbro.com/common/instruct/monins.pdf). This document describes the implemented rules, including the custom choices that override the reference.

## Objective and setup

The last player who has not gone bankrupt wins. Choose 2–5 players and names. A new match gives each player $1,500, puts every token on GO, starts Round 1 with Player 1, clears every deed, building, mortgage, debt, auction, trade, card holding, and prior activity, and shuffles two separate 16-card decks. The four suggested names are Nathan, Shawn, Kirk, and Kaycee; a fifth defaults to Player 5. Names can be edited before starting. Each player has a distinct colored initial token.

## Turn sequence

On your turn, roll two fair six-sided dice. Move clockwise by their sum, then resolve the destination. Collect $200 if the move passes or lands on GO, including qualifying card movement. A direct trip to Jail never collects GO money. A doubles roll earns another roll after its landing has been resolved. Three consecutive doubles on one turn send you directly to Jail before the third movement. The doubles count resets when your turn ends. A doubles roll that releases you from Jail moves you, but does not grant another roll.

The game pauses for a purchase decision, auction, debt, or trade review. You cannot roll or end the turn until that required step is resolved. Once the turn is complete, use **End turn**. Play continues in setup order, skipping bankrupt players. The round increases when play cycles back to the first remaining player.

## The 40-space board

| # | Space | Type / group | Price |
|---:|---|---|---:|
| 0 | GO | Special | — |
| 1 | Old Harbor | Brown | $60 |
| 2 | Community Chest | Card | — |
| 3 | Maple Lane | Brown | $60 |
| 4 | Income Tax | Tax | — |
| 5 | North Station | Station | $200 |
| 6 | Willow Avenue | Light Blue | $100 |
| 7 | Chance | Card | — |
| 8 | Cedar Avenue | Light Blue | $100 |
| 9 | Pine Avenue | Light Blue | $120 |
| 10 | Jail / Just Visiting | Special | — |
| 11 | Rose Street | Pink | $140 |
| 12 | Electric Works | Utility | $150 |
| 13 | Garden Street | Pink | $140 |
| 14 | Market Street | Pink | $160 |
| 15 | East Station | Station | $200 |
| 16 | Copper Road | Orange | $180 |
| 17 | Community Chest | Card | — |
| 18 | Amber Road | Orange | $180 |
| 19 | Sunset Road | Orange | $200 |
| 20 | Free Parking | Special | — |
| 21 | River Drive | Red | $220 |
| 22 | Chance | Card | — |
| 23 | Lake Drive | Red | $220 |
| 24 | Hill Drive | Red | $240 |
| 25 | South Station | Station | $200 |
| 26 | Golden Plaza | Yellow | $260 |
| 27 | Silver Plaza | Yellow | $260 |
| 28 | Water Works | Utility | $150 |
| 29 | Grand Plaza | Yellow | $280 |
| 30 | Go To Jail | Special | — |
| 31 | Forest Boulevard | Green | $300 |
| 32 | Valley Boulevard | Green | $300 |
| 33 | Community Chest | Card | — |
| 34 | Summit Boulevard | Green | $320 |
| 35 | West Station | Station | $200 |
| 36 | Chance | Card | — |
| 37 | Ocean Promenade | Dark Blue | $350 |
| 38 | Luxury Tax | Tax | — |
| 39 | Crown Promenade | Dark Blue | $400 |

## Buying and auctions

Landing on an unowned street, station, or utility gives the active player a choice to buy for the printed price if they have enough cash. Declining sends the deed to a bank auction, even if the player cannot afford its printed price. Every active player, including the decliner, can bid. The opening bid is $10; each later bid must exceed the current bid by at least $1 and cannot exceed the bidder's cash. A player may pass and then leaves that auction. The last highest bidder wins and pays the bid to the bank. If everyone passes before any bid, the deed remains unowned. The deed is never awarded merely because the first bid was made while other bidders are still eligible.

## Rent and monopolies

Landing on another player's unmortgaged deed automatically pays that owner rent. No rent is due on your own deed or a mortgaged deed. Owning an entire color set doubles **base rent only** on its unimproved streets, including if another street in the set is mortgaged. Improved streets use the exact deed schedule below. A mortgaged street itself collects no rent. Rent transfers update both balances in one transaction. If the payer lacks cash, an outstanding debt stops play while they raise funds.

### Street deed schedules

The six rent columns are base / 1 house / 2 houses / 3 houses / 4 houses / hotel. Building cost is per house or hotel purchase on every street in that group. Mortgage value is half the printed property price.

| Street | Base | 1 house | 2 houses | 3 houses | 4 houses | Hotel | Build cost |
|---|---:|---:|---:|---:|---:|---:|---:|
| Old Harbor | $2 | $10 | $30 | $90 | $160 | $250 | $50 |
| Maple Lane | $4 | $20 | $60 | $180 | $320 | $450 | $50 |
| Willow Avenue | $6 | $30 | $90 | $270 | $400 | $550 | $50 |
| Cedar Avenue | $6 | $30 | $90 | $270 | $400 | $550 | $50 |
| Pine Avenue | $8 | $40 | $100 | $300 | $450 | $600 | $50 |
| Rose Street | $10 | $50 | $150 | $450 | $625 | $750 | $100 |
| Garden Street | $10 | $50 | $150 | $450 | $625 | $750 | $100 |
| Market Street | $12 | $60 | $180 | $500 | $700 | $900 | $100 |
| Copper Road | $14 | $70 | $200 | $550 | $750 | $950 | $100 |
| Amber Road | $14 | $70 | $200 | $550 | $750 | $950 | $100 |
| Sunset Road | $16 | $80 | $220 | $600 | $800 | $1,000 | $100 |
| River Drive | $18 | $90 | $250 | $700 | $875 | $1,050 | $150 |
| Lake Drive | $18 | $90 | $250 | $700 | $875 | $1,050 | $150 |
| Hill Drive | $20 | $100 | $300 | $750 | $925 | $1,100 | $150 |
| Golden Plaza | $22 | $110 | $330 | $800 | $975 | $1,150 | $150 |
| Silver Plaza | $22 | $110 | $330 | $800 | $975 | $1,150 | $150 |
| Grand Plaza | $24 | $120 | $360 | $850 | $1,025 | $1,200 | $150 |
| Forest Boulevard | $26 | $130 | $390 | $900 | $1,100 | $1,275 | $200 |
| Valley Boulevard | $26 | $130 | $390 | $900 | $1,100 | $1,275 | $200 |
| Summit Boulevard | $28 | $150 | $450 | $1,000 | $1,200 | $1,400 | $200 |
| Ocean Promenade | $35 | $175 | $500 | $1,100 | $1,300 | $1,500 | $200 |
| Crown Promenade | $50 | $200 | $600 | $1,400 | $1,700 | $2,000 | $200 |

### Stations and utilities

Stations charge $25, $50, $100, or $200 for ownership of one, two, three, or four stations. Utilities charge four times the two-dice total when the owner has one utility, or ten times that total when they own both. A Chance movement to the nearest station doubles its normal rent. A Chance movement to the nearest utility rolls **two fresh dice** and charges ten times that new total if it is owned by another player.

## Buildings and bank supply

You may build only after owning every street in a color set, with no street in the set mortgaged. Houses must be built evenly: the target street must be one of the least developed in its group. Each street holds at most four houses. Once **every** street in the set has four houses, a hotel can replace four houses on a chosen street by paying that group's building price. A street has at most one hotel. The bank has 32 houses and 12 hotels; placing a hotel returns its four houses to the bank.

When only one house or hotel remains and more than one player has a legal place for it, the building goes to an auction. A bidder chooses a legal target street as part of their bid. The winner pays the bid instead of the printed building price. A building auction can end with no sale. Otherwise a legal building can be purchased at the group's price.

Buildings sell to the bank for half their printed building cost. Sell evenly from the most developed street. Selling a hotel normally returns it for four houses, requiring four houses in the bank. If the bank lacks those houses, **Sell all group buildings** liquidates that entire color set at half the cost of each represented building level. This also gives a path to sell before mortgaging or trading during a housing shortage.

## Mortgages

Before mortgaging a street, sell every building in its color set. Mortgaging any eligible deed gives its owner half the printed price. Ownership stays with that player, and the deed produces no rent. Unmortgaging costs the mortgage principal plus 10% interest. A mortgaged deed can be traded; the recipient either redeems it immediately for principal plus 10% interest, or pays 10% interest now and leaves it mortgaged. If they choose the latter and redeem it later, they then pay principal plus another 10% interest. The receiver must have enough cash for the selected transfer cost.

## Trades

The player whose turn it is can propose a trade with another active player. Each side may offer any number of its own deeds and a nonnegative whole-dollar cash amount; at least one asset or a positive amount must be offered overall. No one may promise more cash than they hold. A deed from a color set with buildings cannot be traded until those buildings are sold. A debtor may propose a trade to raise cash but cannot offer cash while the debt is unresolved.

The receiving player sees both sides and their projected cash balances, including required mortgage transfer interest. They can accept or decline. Held Get Out of Jail Free cards may also be sold for an agreed price through the same acceptance workflow. No money, deed, or card changes hands before acceptance. Players cannot make loans or binding promises to waive future rent. Each completed trade is stored and logged.

## Jail

Go directly to space 10 if you land on Go To Jail, draw a Jail card, or roll three consecutive doubles. Do not collect $200 on that trip. Landing normally on space 10 is only a visit. While in Jail, you may still collect rent and manage or trade deeds.

Before rolling, leave by paying $50 or using a held Get Out of Jail Free card. Otherwise roll for doubles. A successful doubles roll releases and moves you, without an extra roll. Failed attempts end your turn. On the third failed turn, pay $50 and move by that third roll. If the fine creates debt, settle it before moving. A used Get Out of Jail Free card returns to the bottom of its original deck.

## Chance and Community Chest

These are separate shuffled 16-card decks, each with its own Get Out of Jail Free card. Draw the top card, apply its instruction, then return it to the bottom unless it is held as a Jail card. Cards can move the token, send it to Jail, give or collect money, charge every other player, or charge building repairs. The decks are fully enumerated in `lib/game-data.mjs`. The card text is paraphrased for Estate and uses its board names. Card movement resolves the destination, including any property, tax, or card effect there. Reaching GO through a qualifying card movement earns $200. Moving back never earns GO money.

## Special spaces

- **GO:** $200 for qualifying passes or arrivals.
- **Income Tax:** flat $200 to the bank.
- **Luxury Tax:** $100 to the bank.
- **Free Parking:** no reward or tax pot.
- **Go To Jail:** immediate direct transfer to Jail.
- **Jail / Just Visiting:** no penalty unless sent there.

## Debt, bankruptcy, and victory

Rent, tax, fine, card, and transfer-interest payments never silently make cash negative. If cash is short, the debt panel shows the obligation and blocks turn progress. The debtor may sell buildings, mortgage deeds, or make a legal cash-raising trade, then pay. If the debt cannot be met, they may declare bankruptcy.

Bankruptcy cannot be declared while selling buildings and mortgaging eligible deeds could cover the obligation. For a debt to another player, all buildings are sold to the bank at half value. Remaining cash, deeds, and held Jail cards go to the creditor, who must pay immediate interest on any transferred mortgages. For a debt to the bank, the bank takes the assets and auctions the returned deeds; held Jail cards return to their decks. A bankrupt player leaves the turn order. When one active player remains, that player wins; the interface shows the winner and final holdings. Restart begins a completely fresh, shuffled match after confirmation.

## Estate choices that override or interpret the classic reference

| Topic | Estate rule |
|---|---|
| Players and first turn | 2–5 players; Player 1 starts rather than a highest-roll selection. |
| Auction opening | Minimum $10; the classic rulebook permits bidding from any price. |
| Income Tax | Flat $200; the older classic text offers a 10% net-worth option. |
| Rent | Automatically charged by the server; the older physical rulebook requires the owner to ask. |
| Building shortage | The bank's last unit is auctioned when multiple players can legally place it. |
| Token and visual design | Estate names, color groups, initials, and independent artwork. |

## Online rooms and session lifetime

Online games use six-character private room codes. Each player receives a private session token to rejoin the same seat after a disconnect or page reload. Only the active player can perform their turn actions; auction participants and trade recipients act only when prompted. The server chooses dice and shuffled decks and validates every request. Room state is held in the server process. **If that process restarts, its rooms and matches are lost.** Run one long-lived server instance for a match; shared persistent storage is needed for multi-instance deployment or restart recovery.
