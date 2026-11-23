import test from "node:test";
import assert from "node:assert/strict";
import { applyAction, createGame, rentFor } from "../lib/engine.mjs";
import { BOARD, CHANCE, CHEST } from "../lib/game-data.mjs";

const ids = ["n", "s"];
const fresh = () => createGame(["Nathan", "Shawn"], ids, () => 0);
const dice = (...values) => {
  let index = 0;
  return () => values[index++];
};
const act = (game, id, action, randomInt = () => 0) => applyAction(game, id, action, randomInt);

test("fresh game has 40 spaces, two shuffled 16-card decks, and no inherited ownership", () => {
  const game = fresh();
  assert.equal(BOARD.length, 40);
  assert.equal(CHANCE.length, 16);
  assert.equal(CHEST.length, 16);
  assert.equal(game.players[0].cash, 1500);
  assert.equal(game.players[0].position, 0);
  assert.equal(game.round, 1);
  assert.equal(game.turnIndex, 0);
  assert.equal(Object.keys(game.properties).length, 28);
  assert.ok(Object.values(game.properties).every((deed) => deed.ownerId === null && deed.houses === 0 && !deed.hotel && !deed.mortgaged));
});

test("landing on an unowned deed pauses movement until purchase or auction", () => {
  let game = fresh();
  // Place the token near GO to exercise salary and purchase together.
  game.players[0].position = 38;
  game = act(game, "n", { type: "roll" }, dice(0, 1)); // 1 + 2 -> Old Harbor, passes GO
  assert.equal(game.phase, "decision");
  assert.equal(game.purchase, 1);
  assert.equal(game.players[0].cash, 1700);
  assert.throws(() => act(game, "n", { type: "endTurn" }), /Resolve/);
  game = act(game, "n", { type: "buy" });
  assert.equal(game.properties[1].ownerId, "n");
  assert.equal(game.players[0].cash, 1640);
  assert.equal(game.phase, "end");
});

test("auction lets each player pass or bid and transfers only after competition closes", () => {
  let game = fresh();
  game.phase = "decision";
  game.purchase = 1;
  game.tasks = [{ type: "finish" }];
  game = act(game, "n", { type: "decline" });
  assert.equal(game.auction.nextBidderId, "n");
  game = act(game, "n", { type: "bid", amount: 10 });
  assert.equal(game.properties[1].ownerId, null);
  assert.equal(game.auction.nextBidderId, "s");
  game = act(game, "s", { type: "bid", amount: 20 });
  game = act(game, "n", { type: "pass" });
  assert.equal(game.properties[1].ownerId, "s");
  assert.equal(game.players[1].cash, 1480);
  assert.equal(game.phase, "end");
});

test("an auction with no bids leaves its deed in the bank", () => {
  let game = fresh();
  game.phase = "decision";
  game.purchase = 1;
  game.tasks = [{ type: "finish" }];
  game = act(game, "n", { type: "decline" });
  game = act(game, "n", { type: "pass" });
  game = act(game, "s", { type: "pass" });
  assert.equal(game.properties[1].ownerId, null);
  assert.equal(game.phase, "end");
});

test("street rent uses deed table and doubles only unimproved complete sets", () => {
  const game = fresh();
  game.properties[1].ownerId = "n";
  game.properties[3].ownerId = "n";
  assert.equal(rentFor(game, 1, 7), 4);
  game.properties[1].houses = 2;
  assert.equal(rentFor(game, 1, 7), 30);
  game.properties[1].houses = 0;
  game.properties[1].hotel = true;
  assert.equal(rentFor(game, 1, 7), 250);
  game.properties[1].mortgaged = true;
  assert.equal(rentFor(game, 1, 7), 0);
  game.properties[1].mortgaged = false;
  game.properties[1].hotel = false;
  game.properties[3].mortgaged = true;
  assert.equal(rentFor(game, 1, 7), 4);
});

test("GO salary and rent settle once in the same movement", () => {
  let game = fresh();
  game.players[0].position = 38;
  game.properties[1].ownerId = "s";
  game = act(game, "n", { type: "roll" }, dice(0, 1));
  assert.equal(game.players[0].cash, 1698);
  assert.equal(game.players[1].cash, 1502);
  assert.equal(game.phase, "end");
});

test("stations and utilities apply ownership counts and Chance overrides", () => {
  const game = fresh();
  for (const id of [5,15,25,35,12,28]) game.properties[id].ownerId = "n";
  assert.equal(rentFor(game, 5, 7), 200);
  assert.equal(rentFor(game, 5, 7, { rentMultiplier: 2 }), 400);
  assert.equal(rentFor(game, 12, 7), 70);
  assert.equal(rentFor(game, 12, 7, { rentMultiplier: 10 }), 70);
});

test("third consecutive doubles sends player directly to Jail", () => {
  let game = fresh();
  // Focus on the third-double rule from an already progressed legal state.
  game.players[0].position = 20;
  game.doubles = 2;
  game = act(game, "n", { type: "roll" }, dice(0, 0));
  assert.equal(game.players[0].position, 10);
  assert.equal(game.players[0].inJail, true);
  assert.equal(game.phase, "end");
  assert.equal(game.players[0].cash, 1500);
});

test("debt blocks turn progression but mortgage can fund payment", () => {
  let game = fresh();
  game.players[0].cash = 20;
  game.players[0].position = 35;
  game.properties[1].ownerId = "n";
  game = act(game, "n", { type: "roll" }, dice(0, 1)); // 38 Luxury Tax
  assert.equal(game.phase, "debt");
  assert.equal(game.debt.amount, 100);
  assert.throws(() => act(game, "n", { type: "endTurn" }), /Resolve/);
  game = act(game, "n", { type: "mortgage", propertyId: 1 });
  assert.equal(game.players[0].cash, 50);
  game.properties[3].ownerId = "n";
  game = act(game, "n", { type: "mortgage", propertyId: 3 });
  assert.equal(game.players[0].cash, 80);
  game.properties[6].ownerId = "n";
  game = act(game, "n", { type: "mortgage", propertyId: 6 });
  game = act(game, "n", { type: "payDebt" });
  assert.equal(game.players[0].cash, 30);
  assert.equal(game.phase, "end");
});

test("trade moves cash and multiple deeds only after receiver accepts", () => {
  let game = fresh();
  game.properties[37].ownerId = "n";
  game.properties[14].ownerId = "s";
  game = act(game, "n", { type: "proposeTrade", partnerId: "s", aProperties: [37], bProperties: [14], aCash: 0, bCash: 0 });
  assert.equal(game.properties[37].ownerId, "n");
  assert.equal(game.phase, "trade");
  assert.throws(() => act(game, "n", { type: "acceptTrade" }), /receiving player/);
  game = act(game, "s", { type: "acceptTrade" });
  assert.equal(game.properties[37].ownerId, "s");
  assert.equal(game.properties[14].ownerId, "n");
  assert.equal(game.players[0].cash, 1500);
  assert.equal(game.completedTrades.length, 1);
});

test("trade atomically exchanges several deeds and cash from both sides", () => {
  let game = fresh();
  game.properties[1].ownerId = "n";
  game.properties[3].ownerId = "n";
  game.properties[14].ownerId = "s";
  game = act(game, "n", { type: "proposeTrade", partnerId: "s", aProperties: [1,3], bProperties: [14], aCash: 100, bCash: 50 });
  assert.equal(game.players[0].cash, 1500);
  game = act(game, "s", { type: "acceptTrade" });
  assert.equal(game.properties[1].ownerId, "s");
  assert.equal(game.properties[3].ownerId, "s");
  assert.equal(game.properties[14].ownerId, "n");
  assert.equal(game.players[0].cash, 1450);
  assert.equal(game.players[1].cash, 1550);
});

test("a traded mortgage charges transfer interest or immediate principal plus interest", () => {
  let deferred = fresh();
  deferred.properties[1].ownerId = "n";
  deferred.properties[1].mortgaged = true;
  deferred = act(deferred, "n", { type: "proposeTrade", partnerId: "s", aProperties: [1], bProperties: [], aCash: 0, bCash: 0 });
  deferred = act(deferred, "s", { type: "acceptTrade" });
  assert.equal(deferred.players[1].cash, 1497);
  assert.equal(deferred.properties[1].mortgaged, true);

  let redeemed = fresh();
  redeemed.properties[1].ownerId = "n";
  redeemed.properties[1].mortgaged = true;
  redeemed = act(redeemed, "n", { type: "proposeTrade", partnerId: "s", aProperties: [1], bProperties: [], aCash: 0, bCash: 0, bRedeem: [1] });
  redeemed = act(redeemed, "s", { type: "acceptTrade" });
  assert.equal(redeemed.players[1].cash, 1467);
  assert.equal(redeemed.properties[1].mortgaged, false);
});

test("a held Get Out of Jail Free card can be sold through an accepted trade", () => {
  let game = fresh();
  game.players[0].jailFree = [{ cardId: "ch-free", deck: "chance" }];
  game.decks.chance = game.decks.chance.filter((id) => id !== "ch-free");
  game = act(game, "n", { type: "proposeTrade", partnerId: "s", aProperties: [], bProperties: [], aJailCards: ["ch-free"], bJailCards: [], aCash: 0, bCash: 50 });
  assert.equal(game.players[0].jailFree.length, 1);
  game = act(game, "s", { type: "acceptTrade" });
  assert.equal(game.players[0].jailFree.length, 0);
  assert.equal(game.players[1].jailFree[0].cardId, "ch-free");
  assert.equal(game.players[0].cash, 1550);
  assert.equal(game.players[1].cash, 1450);
});

test("bankruptcy ends a two-player game with the surviving player as winner", () => {
  let game = fresh();
  game.players[0].cash = 0;
  game.players[0].position = 35;
  game = act(game, "n", { type: "roll" }, dice(0, 1));
  assert.equal(game.phase, "debt");
  game = act(game, "n", { type: "bankrupt" });
  assert.equal(game.phase, "winner");
  assert.equal(game.winnerId, "s");
});

test("building follows even development and returns hotel houses to the bank", () => {
  let game = fresh();
  game.properties[1].ownerId = "n";
  game.properties[3].ownerId = "n";
  game = act(game, "n", { type: "build", propertyId: 1, building: "house" });
  assert.throws(() => act(game, "n", { type: "build", propertyId: 1, building: "house" }), /cannot be placed/);
  game = act(game, "n", { type: "build", propertyId: 3, building: "house" });
  for (let i = 0; i < 3; i++) {
    game = act(game, "n", { type: "build", propertyId: 1, building: "house" });
    game = act(game, "n", { type: "build", propertyId: 3, building: "house" });
  }
  assert.equal(game.properties[1].houses, 4);
  assert.equal(game.players[0].cash, 1100);
  game = act(game, "n", { type: "build", propertyId: 1, building: "hotel" });
  assert.equal(game.properties[1].hotel, true);
  assert.equal(game.properties[1].houses, 0);
  assert.equal(game.players[0].cash, 1050);
  game = act(game, "n", { type: "sellBuilding", propertyId: 1 });
  assert.equal(game.properties[1].hotel, false);
  assert.equal(game.properties[1].houses, 4);
  assert.equal(game.players[0].cash, 1075);
});

test("third failed Jail attempt charges $50 before movement", () => {
  let game = fresh();
  game.players[0].inJail = true;
  game.players[0].position = 10;
  game.players[0].jailAttempts = 2;
  game = act(game, "n", { type: "roll" }, dice(0, 1));
  assert.equal(game.players[0].cash, 1450);
  assert.equal(game.players[0].inJail, false);
  assert.equal(game.players[0].position, 13);
  assert.equal(game.phase, "decision");
});

test("Chance movement to nearest station pays GO salary and doubled station rent", () => {
  let game = fresh();
  game.players[0].position = 34;
  game.properties[5].ownerId = "s";
  game.decks.chance = ["ch-rail-a", ...game.decks.chance.filter((id) => id !== "ch-rail-a")];
  game = act(game, "n", { type: "roll" }, dice(0, 0));
  assert.equal(game.players[0].position, 5);
  assert.equal(game.players[0].cash, 1650);
  assert.equal(game.players[1].cash, 1550);
  assert.equal(game.phase, "roll");
});

test("Chance nearest utility rolls fresh dice for its ten-times rent", () => {
  let game = fresh();
  game.players[0].position = 5;
  game.properties[12].ownerId = "s";
  game.decks.chance = ["ch-utility", ...game.decks.chance.filter((id) => id !== "ch-utility")];
  game = act(game, "n", { type: "roll" }, dice(0, 0, 4, 5));
  assert.equal(game.players[0].position, 12);
  assert.equal(game.players[0].cash, 1390);
  assert.equal(game.players[1].cash, 1610);
  assert.equal(game.dice.total, 2);
  assert.ok(game.log.some((item) => item.includes("rolled 11 for the nearest-utility")));
});

test("bank bankruptcy auctions returned deeds before moving to the next player", () => {
  let game = createGame(["Nathan", "Shawn", "Kirk"], ["n", "s", "k"], () => 0);
  game.players[0].cash = 0;
  game.players[0].position = 35;
  game.properties[1].ownerId = "n";
  game = act(game, "n", { type: "roll" }, dice(0, 1));
  game = act(game, "n", { type: "bankrupt" });
  assert.equal(game.phase, "auction");
  assert.equal(game.auction.propertyId, 1);
  game = act(game, "s", { type: "bid", amount: 10 });
  game = act(game, "k", { type: "pass" });
  assert.equal(game.properties[1].ownerId, "s");
  assert.equal(game.phase, "roll");
  assert.equal(game.turnIndex, 1);
});

test("another player's bankruptcy during a card payment resumes remaining card effects", () => {
  let game = createGame(["Nathan", "Shawn", "Kirk"], ["n", "s", "k"], () => 0);
  game.players[1].cash = 0;
  game.players[2].cash = 10;
  game.decks.chest = ["cc-birthday", ...game.decks.chest.filter((id) => id !== "cc-birthday")];
  game = act(game, "n", { type: "roll" }, dice(0, 0));
  assert.equal(game.phase, "debt");
  assert.equal(game.debt.debtorId, "s");
  game = act(game, "s", { type: "bankrupt" });
  assert.equal(game.players[2].cash, 0);
  assert.equal(game.players[0].cash, 1510);
  assert.equal(game.phase, "roll");
});

test("bankruptcy is rejected while buildings or mortgage value can cover the debt", () => {
  let game = fresh();
  game.players[0].cash = 0;
  game.players[0].position = 35;
  game.properties[39].ownerId = "n";
  game = act(game, "n", { type: "roll" }, dice(0, 1));
  assert.equal(game.phase, "debt");
  assert.throws(() => act(game, "n", { type: "bankrupt" }), /can raise enough/);
  game = act(game, "n", { type: "mortgage", propertyId: 39 });
  game = act(game, "n", { type: "payDebt" });
  assert.equal(game.players[0].cash, 100);
});
