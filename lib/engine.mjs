import { BOARD, CHANCE, CHEST, COLOR_GROUPS, DEFAULT_COLORS, GROUPS } from "./game-data.mjs";

const isDeed = (space) => space && "price" in space;
const player = (game, id) => game.players.find((item) => item.id === id);
const activePlayers = (game) => game.players.filter((item) => !item.bankrupt);
const currentPlayer = (game) => game.players[game.turnIndex];
const ensure = (condition, message) => { if (!condition) throw new Error(message); };
const integer = (value) => Number.isSafeInteger(value) && value >= 0;
const log = (game, message) => { game.log.push(`Round ${game.round} — ${message}`); };
const deedState = (game, id) => game.properties[id];
const owned = (game, ownerId) => BOARD.filter((space) => isDeed(space) && deedState(game, space.id).ownerId === ownerId);
const groupSpaces = (group) => BOARD.filter((space) => space.group === group);
const development = (property) => property.hotel ? 5 : property.houses;
const bankHouses = (game) => 32 - Object.values(game.properties).reduce((total, item) => total + item.houses, 0);
const bankHotels = (game) => 12 - Object.values(game.properties).filter((item) => item.hotel).length;
const ownsGroup = (game, ownerId, group) => groupSpaces(group).every((space) => deedState(game, space.id).ownerId === ownerId);
const groupHasBuildings = (game, group) => groupSpaces(group).some((space) => development(deedState(game, space.id)) > 0);
const groupIsClear = (game, group) => groupSpaces(group).every((space) => !deedState(game, space.id).mortgaged);
const recoverableCash = (game, ownerId) => {
  const owner = player(game, ownerId);
  return owner.cash + owned(game, ownerId).reduce((total, space) => {
    const deed = deedState(game, space.id);
    const buildings = space.kind === "street" ? development(deed) * GROUPS[space.group].buildCost / 2 : 0;
    return total + buildings + (deed.mortgaged ? 0 : space.price / 2);
  }, 0);
};

export function shuffle(items, randomInt) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createGame(names, ids, randomInt) {
  ensure(names.length >= 2 && names.length <= 5 && names.length === ids.length, "A game needs 2–5 players.");
  ensure(names.every((name) => typeof name === "string" && name.trim().length > 0 && name.trim().length <= 24), "Enter a name of 1–24 characters for each player.");
  const properties = Object.fromEntries(BOARD.filter(isDeed).map((space) => [space.id, { ownerId: null, houses: 0, hotel: false, mortgaged: false }]));
  return {
    players: names.map((name, index) => ({ id: ids[index], name: name.trim(), color: DEFAULT_COLORS[index], cash: 1500, position: 0, inJail: false, jailAttempts: 0, jailFree: [], bankrupt: false })),
    properties,
    round: 1,
    turnIndex: 0,
    phase: "roll",
    dice: null,
    doubles: 0,
    purchase: null,
    auction: null,
    debt: null,
    trade: null,
    completedTrades: [],
    card: null,
    tasks: [],
    decks: { chance: shuffle(CHANCE.map((card) => card.id), randomInt), chest: shuffle(CHEST.map((card) => card.id), randomInt) },
    log: ["Round 1 — A fresh Estate game begins. All players start at GO with $1,500."],
    winnerId: null,
  };
}

export function rentFor(game, spaceId, diceTotal, override = null) {
  const space = BOARD[spaceId];
  const deed = deedState(game, spaceId);
  if (!isDeed(space) || !deed.ownerId || deed.mortgaged) return 0;
  if (space.kind === "railroad") {
    const count = groupSpaces("railroad").filter((item) => deedState(game, item.id).ownerId === deed.ownerId).length;
    return [0, 25, 50, 100, 200][count] * (override?.rentMultiplier ?? 1);
  }
  if (space.kind === "utility") {
    const count = groupSpaces("utility").filter((item) => deedState(game, item.id).ownerId === deed.ownerId).length;
    return diceTotal * (override?.rentMultiplier ?? (count === 2 ? 10 : 4));
  }
  if (deed.hotel) return space.rents[5];
  if (deed.houses) return space.rents[deed.houses];
  return space.rents[0] * (ownsGroup(game, deed.ownerId, space.group) ? 2 : 1);
}

function movement(game, who, to, collectGo = true, forceGo = false) {
  const from = who.position;
  if (collectGo && (to < from || (to === 0 && (from !== 0 || forceGo)))) {
    who.cash += 200;
    log(game, `${who.name} collected $200 for reaching or passing GO.`);
  }
  who.position = to;
  log(game, `${who.name} moved to ${BOARD[to].name}.`);
}

function sendToJail(game, who) {
  who.position = 10;
  who.inJail = true;
  who.jailAttempts = 0;
  game.doubles = 0;
  game.tasks = [];
  game.phase = "end";
  log(game, `${who.name} was sent directly to Jail.`);
}

function finishLanding(game) {
  game.phase = game.doubles > 0 && !currentPlayer(game).inJail ? "roll" : "end";
  if (game.phase === "roll") log(game, `${currentPlayer(game).name} rolled doubles and may roll again.`);
}

function drawCard(game, deck) {
  const id = game.decks[deck].shift();
  const card = (deck === "chance" ? CHANCE : CHEST).find((item) => item.id === id);
  if (card.effect.type !== "jailFree") game.decks[deck].push(id);
  game.card = { deck, text: card.text };
  log(game, `${currentPlayer(game).name} drew ${deck === "chance" ? "Chance" : "Community Chest"}: ${card.text}`);
  return card.effect.type === "jailFree" ? { ...card.effect, cardId: id, deck } : card.effect;
}

function cardTasks(game, effect, randomInt) {
  const who = currentPlayer(game);
  const others = activePlayers(game).filter((item) => item.id !== who.id);
  switch (effect.type) {
    case "move": return [{ type: "moveTo", to: effect.to, forceGo: effect.to === 0 }];
    case "nearest": {
      const options = BOARD.filter((space) => space.kind === effect.kind).map((space) => space.id);
      const target = options.find((id) => id > who.position) ?? options[0];
      const diceTotal = effect.kind === "utility" && deedState(game, target).ownerId && deedState(game, target).ownerId !== who.id
        ? randomInt(6) + 1 + randomInt(6) + 1 : null;
      if (diceTotal !== null) log(game, `${who.name} rolled ${diceTotal} for the nearest-utility card.`);
      return [{ type: "moveTo", to: target, diceTotal, override: { rentMultiplier: effect.rentMultiplier } }];
    }
    case "back": return [{ type: "moveTo", to: (who.position - effect.spaces + 40) % 40, collectGo: false }];
    case "jail": return [{ type: "jail" }];
    case "bank": return effect.amount < 0 ? [{ type: "pay", debtorId: who.id, creditorId: null, amount: -effect.amount, reason: "a card" }] : [{ type: "grant", playerId: who.id, amount: effect.amount, reason: "a card" }];
    case "jailFree": who.jailFree.push({ cardId: effect.cardId, deck: effect.deck }); return [];
    case "repairs": {
      const buildings = owned(game, who.id).reduce((sum, space) => {
        const deed = deedState(game, space.id);
        return sum + (deed.hotel ? effect.hotel : deed.houses * effect.house);
      }, 0);
      return buildings ? [{ type: "pay", debtorId: who.id, creditorId: null, amount: buildings, reason: "building repairs" }] : [];
    }
    case "each": return others.map((other) => effect.amount < 0
      ? { type: "pay", debtorId: who.id, creditorId: other.id, amount: -effect.amount, reason: "a card" }
      : { type: "pay", debtorId: other.id, creditorId: who.id, amount: effect.amount, reason: "a card" });
    default: throw new Error("Unknown card effect.");
  }
}

function takePayment(game, task) {
  const debtor = player(game, task.debtorId);
  if (debtor.bankrupt) return;
  if (debtor.cash < task.amount) {
    game.debt = { ...task, shortfall: task.amount - debtor.cash };
    game.phase = "debt";
    log(game, `${debtor.name} owes $${task.amount} for ${task.reason} and needs $${task.amount - debtor.cash} more.`);
    return;
  }
  debtor.cash -= task.amount;
  if (task.creditorId) player(game, task.creditorId).cash += task.amount;
  log(game, `${debtor.name} paid $${task.amount} ${task.creditorId ? `to ${player(game, task.creditorId).name}` : "to the bank"} for ${task.reason}. ${debtor.name}: $${debtor.cash}${task.creditorId ? `; ${player(game, task.creditorId).name}: $${player(game, task.creditorId).cash}` : ""}.`);
}

function processTasks(game, randomInt) {
  game.phase = "resolving";
  for (let safety = 0; game.tasks.length && safety < 100; safety++) {
    const task = game.tasks.shift();
    const who = currentPlayer(game);
    switch (task.type) {
      case "pay": takePayment(game, task); break;
      case "grant": player(game, task.playerId).cash += task.amount; log(game, `${player(game, task.playerId).name} collected $${task.amount} from ${task.reason}.`); break;
      case "moveBy": movement(game, who, (who.position + task.spaces) % 40); game.tasks.unshift({ type: "land" }); break;
      case "moveTo": movement(game, who, task.to, task.collectGo !== false, task.forceGo); game.tasks.unshift({ type: "land", override: task.override, diceTotal: task.diceTotal }); break;
      case "land": {
        const space = BOARD[who.position];
        if (isDeed(space)) {
          const deed = deedState(game, space.id);
          if (!deed.ownerId) { game.purchase = space.id; game.phase = "decision"; }
          else if (deed.ownerId !== who.id) {
            const rent = rentFor(game, space.id, task.diceTotal ?? game.dice?.total ?? 0, task.override);
            if (rent) game.tasks.unshift({ type: "pay", debtorId: who.id, creditorId: deed.ownerId, amount: rent, reason: `rent on ${space.name}` });
          }
        } else if (space.kind === "incomeTax" || space.kind === "luxuryTax") {
          game.tasks.unshift({ type: "pay", debtorId: who.id, creditorId: null, amount: space.kind === "incomeTax" ? 200 : 100, reason: space.name });
        } else if (space.kind === "goToJail") {
          sendToJail(game, who);
        } else if (space.kind === "chance" || space.kind === "chest") {
          game.tasks.unshift(...cardTasks(game, drawCard(game, space.kind), randomInt));
        }
        break;
      }
      case "jail": sendToJail(game, who); break;
      case "releaseJail": who.inJail = false; who.jailAttempts = 0; log(game, `${who.name} left Jail.`); break;
      case "phaseRoll": game.phase = "roll"; break;
      case "finish": finishLanding(game); break;
      case "auctionProperty": startPropertyAuction(game, task.propertyId); break;
      case "nextTurn": advanceTurn(game); break;
      default: throw new Error(`Unknown game task: ${task.type}`);
    }
    if (game.phase !== "resolving") return;
  }
  ensure(game.tasks.length === 0, "Game resolution exceeded its safety limit.");
  if (game.phase === "resolving") finishLanding(game);
}

function advanceTurn(game) {
  const from = game.turnIndex;
  let next = from;
  do { next = (next + 1) % game.players.length; } while (game.players[next].bankrupt);
  if (next <= from) game.round++;
  game.turnIndex = next;
  game.phase = "roll";
  game.dice = null;
  game.doubles = 0;
  game.card = null;
  log(game, `${currentPlayer(game).name}'s turn begins.`);
}

function startPropertyAuction(game, propertyId) {
  game.auction = { kind: "property", propertyId, highestId: null, highestBid: 0, targetId: null, passedIds: [], nextBidderId: activePlayers(game)[0].id };
  game.phase = "auction";
  log(game, `${BOARD[propertyId].name} is up for auction. Opening bid: $10.`);
}

function legalBuild(game, ownerId, propertyId, kind) {
  const space = BOARD[propertyId];
  if (space?.kind !== "street") return false;
  const deed = deedState(game, propertyId);
  if (deed.ownerId !== ownerId || !ownsGroup(game, ownerId, space.group) || !groupIsClear(game, space.group)) return false;
  const levels = groupSpaces(space.group).map((item) => development(deedState(game, item.id)));
  const min = Math.min(...levels);
  if (kind === "house") return !deed.hotel && deed.houses < 4 && deed.houses === min && bankHouses(game) > 0;
  return kind === "hotel" && deed.houses === 4 && min >= 4 && bankHotels(game) > 0;
}

function buildAt(game, ownerId, propertyId, kind, cost) {
  ensure(legalBuild(game, ownerId, propertyId, kind), "That building cannot be placed there.");
  const owner = player(game, ownerId);
  ensure(owner.cash >= cost, "Not enough cash to build.");
  owner.cash -= cost;
  const deed = deedState(game, propertyId);
  if (kind === "hotel") { deed.houses = 0; deed.hotel = true; }
  else deed.houses++;
  log(game, `${owner.name} built ${kind === "hotel" ? "a hotel" : "a house"} on ${BOARD[propertyId].name} for $${cost}.`);
}

function sellBuilding(game, ownerId, propertyId) {
  const space = BOARD[propertyId];
  ensure(space?.kind === "street" && deedState(game, propertyId).ownerId === ownerId, "You do not own that street.");
  const deed = deedState(game, propertyId);
  const levels = groupSpaces(space.group).map((item) => development(deedState(game, item.id)));
  ensure(development(deed) > 0 && development(deed) === Math.max(...levels), "Buildings must be sold evenly from the most developed street.");
  if (deed.hotel) {
    ensure(bankHouses(game) >= 4, "The bank lacks four houses. Sell all buildings in this color group instead.");
    deed.hotel = false;
    deed.houses = 4;
  } else deed.houses--;
  const credit = GROUPS[space.group].buildCost / 2;
  player(game, ownerId).cash += credit;
  log(game, `${player(game, ownerId).name} sold a building on ${space.name} for $${credit}.`);
}

function liquidateGroup(game, ownerId, group) {
  ensure(COLOR_GROUPS.includes(group) && groupSpaces(group).every((space) => deedState(game, space.id).ownerId === ownerId), "You do not own this color group.");
  const cost = GROUPS[group].buildCost;
  let credit = 0;
  for (const space of groupSpaces(group)) {
    const deed = deedState(game, space.id);
    credit += (deed.hotel ? 5 : deed.houses) * cost / 2;
    deed.hotel = false; deed.houses = 0;
  }
  ensure(credit > 0, "There are no buildings to sell.");
  player(game, ownerId).cash += credit;
  log(game, `${player(game, ownerId).name} sold all ${GROUPS[group].label} buildings for $${credit}.`);
}

function auctionBidders(game, auction) {
  if (auction.kind === "property") return activePlayers(game);
  return activePlayers(game).filter((item) => BOARD.some((space) => space.kind === "street" && legalBuild(game, item.id, space.id, auction.building)));
}

function nextAuctionBidder(game, randomInt) {
  const auction = game.auction;
  const bidders = auctionBidders(game, auction).filter((item) => !auction.passedIds.includes(item.id) && item.id !== auction.highestId);
  if (!bidders.length) {
    if (auction.highestId) {
      if (auction.kind === "property") {
        const winner = player(game, auction.highestId);
        ensure(winner.cash >= auction.highestBid, "Auction winner no longer has enough cash.");
        winner.cash -= auction.highestBid;
        deedState(game, auction.propertyId).ownerId = winner.id;
        log(game, `${winner.name} won ${BOARD[auction.propertyId].name} for $${auction.highestBid}.`);
      } else buildAt(game, auction.highestId, auction.targetId, auction.building, auction.highestBid);
    } else log(game, `The ${auction.kind === "property" ? "property" : "building"} auction ended without a bid.`);
    game.auction = null;
    game.phase = auction.resumePhase ?? "resolving";
    if (game.phase === "resolving") processTasks(game, randomInt);
    return;
  }
  const all = auctionBidders(game, auction);
  const prior = all.findIndex((item) => item.id === auction.nextBidderId);
  auction.nextBidderId = [...all.slice(prior + 1), ...all.slice(0, prior + 1)].find((item) => bidders.some((bidder) => bidder.id === item.id))?.id ?? bidders[0].id;
}

function startBuildingAuction(game, kind) {
  const bidders = activePlayers(game).filter((item) => BOARD.some((space) => space.kind === "street" && legalBuild(game, item.id, space.id, kind)));
  if (bidders.length < 2) return false;
  game.auction = { kind: "building", building: kind, highestId: null, highestBid: 0, targetId: null, passedIds: [], nextBidderId: bidders[0].id, resumePhase: game.phase };
  game.phase = "auction";
  log(game, `The bank's last ${kind} is up for auction. Opening bid: $10.`);
  return true;
}

function validateTrade(game, trade) {
  const a = player(game, trade.proposerId), b = player(game, trade.partnerId);
  ensure(a && b && !a.bankrupt && !b.bankrupt && a.id !== b.id, "Both trading players must be active.");
  const sides = [{ owner: a, receiver: b, ids: trade.aProperties, cash: trade.aCash }, { owner: b, receiver: a, ids: trade.bProperties, cash: trade.bCash }];
  const allIds = [...trade.aProperties, ...trade.bProperties];
  const aRedeem = trade.aRedeem ?? [];
  const bRedeem = trade.bRedeem ?? [];
  const aJailCards = trade.aJailCards ?? [];
  const bJailCards = trade.bJailCards ?? [];
  ensure(new Set(allIds).size === allIds.length && allIds.every(integer), "Trade properties must be unique valid spaces.");
  ensure(Array.isArray(aRedeem) && Array.isArray(bRedeem) && new Set(aRedeem).size === aRedeem.length && new Set(bRedeem).size === bRedeem.length && aRedeem.every((id) => trade.bProperties.includes(id) && deedState(game, id).mortgaged) && bRedeem.every((id) => trade.aProperties.includes(id) && deedState(game, id).mortgaged), "Immediate mortgage redemptions must be unique incoming mortgaged deeds.");
  ensure(Array.isArray(aJailCards) && Array.isArray(bJailCards) && new Set(aJailCards).size === aJailCards.length && new Set(bJailCards).size === bJailCards.length && aJailCards.every((id) => a.jailFree.some((card) => card.cardId === id)) && bJailCards.every((id) => b.jailFree.some((card) => card.cardId === id)), "Players may trade only Jail cards they hold.");
  ensure(integer(trade.aCash) && integer(trade.bCash) && allIds.length + aJailCards.length + bJailCards.length + trade.aCash + trade.bCash > 0, "Trade needs a deed, Jail card, or positive cash amount.");
  for (const side of sides) {
    ensure(side.owner.cash >= side.cash, `${side.owner.name} cannot offer more cash than they have.`);
    for (const id of side.ids) {
      const space = BOARD[id];
      ensure(isDeed(space) && deedState(game, id).ownerId === side.owner.id, `${side.owner.name} does not own a selected property.`);
      if (space.kind === "street") ensure(!groupHasBuildings(game, space.group), "Sell all buildings in that color group before trading its property.");
    }
  }
  const interestA = trade.bProperties.filter((id) => deedState(game, id).mortgaged).reduce((sum, id) => sum + BOARD[id].price / 20, 0);
  const interestB = trade.aProperties.filter((id) => deedState(game, id).mortgaged).reduce((sum, id) => sum + BOARD[id].price / 20, 0);
  const redemptionA = aRedeem.reduce((sum, id) => sum + BOARD[id].price / 2, 0);
  const redemptionB = bRedeem.reduce((sum, id) => sum + BOARD[id].price / 2, 0);
  ensure(a.cash - trade.aCash + trade.bCash >= interestA + redemptionA && b.cash - trade.bCash + trade.aCash >= interestB + redemptionB, "Recipients need enough cash for mortgage transfer costs.");
  if (game.debt && game.debt.debtorId === a.id) ensure(trade.aCash === 0 && trade.bCash > 0, "An outstanding debtor may only trade to raise cash.");
  return { interestA, interestB, redemptionA, redemptionB, projectedA: a.cash - trade.aCash + trade.bCash - interestA - redemptionA, projectedB: b.cash - trade.bCash + trade.aCash - interestB - redemptionB };
}

function bankrupt(game, debtorId, randomInt) {
  const debt = game.debt;
  const debtor = player(game, debtorId);
  ensure(debt?.debtorId === debtorId, "No debt to declare bankrupt against.");
  ensure(recoverableCash(game, debtorId) < debt.amount, "You can raise enough money by selling buildings and mortgaging deeds. Settle the debt before declaring bankruptcy.");
  const creditor = debt.creditorId ? player(game, debt.creditorId) : null;
  const debtorHadTurn = currentPlayer(game).id === debtorId;
  const interruptedTasks = debtorHadTurn ? [] : [...game.tasks];
  const assets = owned(game, debtorId);
  let buildingProceeds = 0;
  for (const space of assets) {
    const deed = deedState(game, space.id);
    if (space.kind === "street") buildingProceeds += (deed.hotel ? 5 : deed.houses) * GROUPS[space.group].buildCost / 2;
    deed.hotel = false; deed.houses = 0;
  }
  debtor.cash += buildingProceeds;
  if (creditor) creditor.cash += debtor.cash;
  debtor.cash = 0;
  debtor.bankrupt = true;
  debtor.inJail = false;
  if (creditor) creditor.jailFree.push(...debtor.jailFree);
  else for (const card of debtor.jailFree) game.decks[card.deck].push(card.cardId);
  debtor.jailFree = [];
  game.debt = null;
  game.tasks = [];
  log(game, `${debtor.name} declared bankruptcy to ${creditor?.name ?? "the bank"}.`);
  const remaining = activePlayers(game);
  if (creditor) {
    let interest = 0;
    for (const space of assets) {
      const deed = deedState(game, space.id);
      deed.ownerId = creditor.id;
      if (deed.mortgaged) interest += space.price / 20;
    }
    if (interest) game.tasks.push({ type: "pay", debtorId: creditor.id, creditorId: null, amount: interest, reason: "interest on transferred mortgages" });
  } else {
    for (const space of assets) {
      const deed = deedState(game, space.id);
      deed.ownerId = null;
      deed.mortgaged = false;
      game.tasks.push({ type: "auctionProperty", propertyId: space.id });
    }
  }
  if (remaining.length === 1) {
    game.winnerId = remaining[0].id;
    game.phase = "winner";
    game.tasks = [];
    log(game, `${remaining[0].name} wins Estate.`);
    return;
  }
  if (debtorHadTurn) game.tasks.push({ type: "nextTurn" });
  else game.tasks.push(...interruptedTasks);
  processTasks(game, randomInt);
}

export function applyAction(source, actorId, action, randomInt) {
  const game = structuredClone(source);
  const actor = player(game, actorId);
  ensure(actor && !actor.bankrupt, "You are not an active player in this game.");
  ensure(action && typeof action.type === "string", "Invalid game action.");
  const turnActor = currentPlayer(game);
  const isTurn = actor.id === turnActor.id;
  const openPhase = ["roll", "end"].includes(game.phase);
  const canManage = (isTurn && (openPhase || game.phase === "debt" && game.debt?.debtorId === actor.id)) || game.phase === "debt" && game.debt?.debtorId === actor.id;

  switch (action.type) {
    case "roll": {
      ensure(isTurn && game.phase === "roll", "It is not your time to roll.");
      const a = randomInt(6) + 1, b = randomInt(6) + 1;
      game.dice = { a, b, total: a + b };
      log(game, `${actor.name} rolled ${a} + ${b}.`);
      if (actor.inJail) {
        if (a === b) {
          actor.inJail = false; actor.jailAttempts = 0; game.doubles = 0;
          log(game, `${actor.name} escaped Jail by rolling doubles.`);
          game.tasks = [{ type: "moveBy", spaces: a + b }, { type: "finish" }];
        } else {
          actor.jailAttempts++;
          if (actor.jailAttempts < 3) { game.phase = "end"; log(game, `${actor.name} remains in Jail (attempt ${actor.jailAttempts} of 3).`); break; }
          game.tasks = [{ type: "pay", debtorId: actor.id, creditorId: null, amount: 50, reason: "the third Jail attempt" }, { type: "releaseJail" }, { type: "moveBy", spaces: a + b }, { type: "finish" }];
        }
      } else {
        game.doubles = a === b ? game.doubles + 1 : 0;
        if (game.doubles === 3) { sendToJail(game, actor); break; }
        game.tasks = [{ type: "moveBy", spaces: a + b }, { type: "finish" }];
      }
      processTasks(game, randomInt);
      break;
    }
    case "jailPay": {
      ensure(isTurn && game.phase === "roll" && actor.inJail, "You cannot pay a Jail fine now.");
      game.tasks = [{ type: "pay", debtorId: actor.id, creditorId: null, amount: 50, reason: "a Jail fine" }, { type: "releaseJail" }, { type: "phaseRoll" }];
      processTasks(game, randomInt);
      break;
    }
    case "jailCard": {
      ensure(isTurn && game.phase === "roll" && actor.inJail && actor.jailFree.length, "No Jail card is available.");
      const card = actor.jailFree.shift();
      game.decks[card.deck].push(card.cardId);
      actor.inJail = false; actor.jailAttempts = 0;
      log(game, `${actor.name} used a Get Out of Jail Free card.`);
      break;
    }
    case "buy": {
      ensure(isTurn && game.phase === "decision" && game.purchase !== null, "No property is awaiting purchase.");
      const space = BOARD[game.purchase];
      ensure(actor.cash >= space.price, "Not enough cash to buy this property.");
      actor.cash -= space.price;
      deedState(game, space.id).ownerId = actor.id;
      log(game, `${actor.name} bought ${space.name} for $${space.price}. Balance: $${actor.cash}.`);
      game.purchase = null;
      processTasks(game, randomInt);
      break;
    }
    case "decline": {
      ensure(isTurn && game.phase === "decision" && game.purchase !== null, "No property is awaiting decision.");
      const id = game.purchase;
      game.purchase = null;
      startPropertyAuction(game, id);
      break;
    }
    case "bid": {
      const auction = game.auction;
      ensure(game.phase === "auction" && auction?.nextBidderId === actor.id, "It is not your bid.");
      ensure(integer(action.amount) && action.amount >= Math.max(10, auction.highestBid + 1) && action.amount <= actor.cash, "Bid must be at least $10, exceed the current bid, and fit your cash.");
      if (auction.kind === "building") ensure(legalBuild(game, actor.id, action.targetId, auction.building), "Choose a legal street for this building.");
      auction.highestId = actor.id;
      auction.highestBid = action.amount;
      auction.targetId = auction.kind === "building" ? action.targetId : null;
      log(game, `${actor.name} bid $${action.amount}.`);
      nextAuctionBidder(game, randomInt);
      break;
    }
    case "pass": {
      const auction = game.auction;
      ensure(game.phase === "auction" && auction?.nextBidderId === actor.id, "It is not your bid.");
      auction.passedIds.push(actor.id);
      log(game, `${actor.name} passed in the auction.`);
      nextAuctionBidder(game, randomInt);
      break;
    }
    case "endTurn": ensure(isTurn && game.phase === "end", "Resolve all required actions before ending the turn."); advanceTurn(game); break;
    case "build": {
      ensure(canManage && game.phase !== "trade", "You cannot build now.");
      ensure(game.phase !== "debt", "Pay your debt before buying buildings.");
      const kind = action.building === "hotel" ? "hotel" : "house";
      ensure(legalBuild(game, actor.id, action.propertyId, kind), "That building cannot be placed there.");
      if ((kind === "house" ? bankHouses(game) : bankHotels(game)) === 1 && startBuildingAuction(game, kind)) break;
      buildAt(game, actor.id, action.propertyId, kind, GROUPS[BOARD[action.propertyId].group].buildCost);
      break;
    }
    case "sellBuilding": ensure(canManage, "You cannot manage property now."); sellBuilding(game, actor.id, action.propertyId); break;
    case "liquidateGroup": ensure(canManage, "You cannot manage property now."); liquidateGroup(game, actor.id, action.group); break;
    case "mortgage": {
      ensure(canManage, "You cannot manage property now.");
      const space = BOARD[action.propertyId], deed = deedState(game, action.propertyId);
      ensure(isDeed(space) && deed.ownerId === actor.id && !deed.mortgaged, "You cannot mortgage that property.");
      if (space.kind === "street") ensure(!groupHasBuildings(game, space.group), "Sell all buildings in this color group first.");
      deed.mortgaged = true;
      actor.cash += space.price / 2;
      log(game, `${actor.name} mortgaged ${space.name} for $${space.price / 2}.`);
      break;
    }
    case "unmortgage": {
      ensure(canManage && game.phase !== "debt", "You cannot unmortgage now.");
      const space = BOARD[action.propertyId], deed = deedState(game, action.propertyId);
      ensure(isDeed(space) && deed.ownerId === actor.id && deed.mortgaged, "You cannot unmortgage that property.");
      const cost = Math.ceil(space.price * 0.55);
      ensure(actor.cash >= cost, "Not enough cash to unmortgage.");
      actor.cash -= cost; deed.mortgaged = false;
      log(game, `${actor.name} unmortgaged ${space.name} for $${cost}.`);
      break;
    }
    case "proposeTrade": {
      ensure(canManage && ["roll", "end", "debt"].includes(game.phase), "Trading is unavailable now.");
      const trade = { proposerId: actor.id, partnerId: action.partnerId, aProperties: action.aProperties ?? [], bProperties: action.bProperties ?? [], aRedeem: action.aRedeem ?? [], bRedeem: action.bRedeem ?? [], aJailCards: action.aJailCards ?? [], bJailCards: action.bJailCards ?? [], aCash: action.aCash ?? 0, bCash: action.bCash ?? 0, returnPhase: game.phase };
      const projection = validateTrade(game, trade);
      game.trade = { ...trade, projection };
      game.phase = "trade";
      log(game, `${actor.name} proposed a trade to ${player(game, trade.partnerId).name}.`);
      break;
    }
    case "acceptTrade": {
      const trade = game.trade;
      ensure(game.phase === "trade" && trade?.partnerId === actor.id, "Only the receiving player can accept this trade.");
      const projection = validateTrade(game, trade);
      const a = player(game, trade.proposerId), b = player(game, trade.partnerId);
      a.cash = projection.projectedA; b.cash = projection.projectedB;
      for (const id of trade.aProperties) deedState(game, id).ownerId = b.id;
      for (const id of trade.bProperties) deedState(game, id).ownerId = a.id;
      for (const id of [...trade.aRedeem, ...trade.bRedeem]) deedState(game, id).mortgaged = false;
      const cardsFromA = a.jailFree.filter((card) => trade.aJailCards.includes(card.cardId));
      const cardsFromB = b.jailFree.filter((card) => trade.bJailCards.includes(card.cardId));
      a.jailFree = a.jailFree.filter((card) => !trade.aJailCards.includes(card.cardId));
      b.jailFree = b.jailFree.filter((card) => !trade.bJailCards.includes(card.cardId));
      a.jailFree.push(...cardsFromB); b.jailFree.push(...cardsFromA);
      game.completedTrades.push({ round: game.round, proposerId: a.id, partnerId: b.id, aProperties: [...trade.aProperties], bProperties: [...trade.bProperties], aJailCards: [...trade.aJailCards], bJailCards: [...trade.bJailCards], aCash: trade.aCash, bCash: trade.bCash, aRedeem: [...trade.aRedeem], bRedeem: [...trade.bRedeem] });
      log(game, `${a.name} and ${b.name} completed a trade. ${a.name} gave ${trade.aProperties.map((id) => BOARD[id].name).join(", ") || "no deeds"}, ${trade.aJailCards.length} Jail card(s), and $${trade.aCash}; ${b.name} gave ${trade.bProperties.map((id) => BOARD[id].name).join(", ") || "no deeds"}, ${trade.bJailCards.length} Jail card(s), and $${trade.bCash}. Mortgage transfer interest: $${projection.interestA + projection.interestB}; immediate redemption: $${projection.redemptionA + projection.redemptionB}.`);
      game.phase = trade.returnPhase;
      game.trade = null;
      break;
    }
    case "declineTrade": {
      ensure(game.phase === "trade" && game.trade?.partnerId === actor.id, "Only the receiving player can decline this trade.");
      log(game, `${actor.name} declined the trade.`);
      game.phase = game.trade.returnPhase;
      game.trade = null;
      break;
    }
    case "payDebt": {
      ensure(game.phase === "debt" && game.debt?.debtorId === actor.id, "No debt is due from you.");
      const debt = game.debt;
      ensure(actor.cash >= debt.amount, `You need $${debt.amount - actor.cash} more to pay.`);
      game.debt = null;
      takePayment(game, debt);
      processTasks(game, randomInt);
      break;
    }
    case "bankrupt": ensure(game.phase === "debt" && game.debt?.debtorId === actor.id, "No debt is due from you."); bankrupt(game, actor.id, randomInt); break;
    default: throw new Error("Unknown game action.");
  }

  game.log = game.log.slice(-500);
  return game;
}

export function publicGame(game) {
  const safe = { ...game };
  delete safe.tasks;
  delete safe.decks;
  return { ...safe, bank: { houses: bankHouses(game), hotels: bankHotels(game) }, deckCounts: { chance: game.decks.chance.length, chest: game.decks.chest.length }, recoverableCash: Object.fromEntries(game.players.map((item) => [item.id, recoverableCash(game, item.id)])) };
}

export function legalBuildTargets(game, ownerId, kind) {
  return BOARD.filter((space) => space.kind === "street" && legalBuild(game, ownerId, space.id, kind)).map((space) => space.id);
}
