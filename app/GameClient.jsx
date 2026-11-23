"use client";

import { useEffect, useRef, useState } from "react";
import { BOARD, GROUPS } from "@/lib/game-data.mjs";

async function gameRequest(event, payload = {}, session = null) {
  const response = await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({ event, payload, session }),
  });
  return response.json();
}

const money = (n) => `$${n.toLocaleString()}`;
const isDeed = (space) => typeof space.price === "number";
const defaults = ["Nathan", "Shawn", "Kirk", "Kaycee", "Player 5"];
const title = { roll: "Ready to roll", decision: "Property decision", auction: "Live auction", debt: "Payment required", end: "Turn complete", trade: "Trade review", winner: "Game over" };
const spaceDetails = {
  go: "Collect $200 when you pass or land on GO through qualifying movement.",
  chest: "Draw the top Community Chest card and resolve its instruction. Held Jail cards stay out of the deck until used or transferred.",
  chance: "Draw the top Chance card and resolve its instruction. Movement cards also resolve their destination.",
  incomeTax: "Pay $200 to the bank. If you cannot pay immediately, raise cash before your turn can continue.",
  luxuryTax: "Pay $100 to the bank. If you cannot pay immediately, raise cash before your turn can continue.",
  jail: "Landing here by normal movement is Just Visiting. A player sent to Jail stays here until released by a card, a $50 payment, or doubles.",
  parking: "Free Parking is a resting space. It gives no money or other reward.",
  goToJail: "Move directly to Jail. Do not collect $200 for passing GO, and end your turn.",
};
const owned = (game, id) => BOARD.filter((space) => isDeed(space) && game.properties[space.id].ownerId === id);
const level = (deed) => deed.hotel ? 5 : deed.houses;

function gridPosition(id) {
  if (id <= 10) return { gridRow: 11, gridColumn: 11 - id };
  if (id <= 20) return { gridRow: 21 - id, gridColumn: 1 };
  if (id <= 30) return { gridRow: 1, gridColumn: id - 19 };
  return { gridRow: id - 29, gridColumn: 11 };
}

function canBuild(game, who, space, kind) {
  if (!who || space.kind !== "street" || game.properties[space.id].ownerId !== who.id) return false;
  const group = BOARD.filter((item) => item.group === space.group);
  if (!group.every((item) => game.properties[item.id].ownerId === who.id && !game.properties[item.id].mortgaged)) return false;
  const min = Math.min(...group.map((item) => level(game.properties[item.id])));
  const deed = game.properties[space.id];
  return kind === "house" ? !deed.hotel && deed.houses < 4 && deed.houses === min && game.bank.houses > 0 : deed.houses === 4 && min >= 4 && game.bank.hotels > 0;
}

function canSellBuilding(game, space) {
  if (space.kind !== "street") return false;
  const deed = game.properties[space.id];
  const highest = Math.max(...BOARD.filter((item) => item.group === space.group).map((item) => level(game.properties[item.id])));
  return level(deed) > 0 && level(deed) === highest && (!deed.hotel || game.bank.houses >= 4);
}

function tradeable(game, space) {
  return space.kind !== "street" || !BOARD.some((item) => item.group === space.group && level(game.properties[item.id]) > 0);
}

function Setup({ request, connected, busy, error }) {
  const [mode, setMode] = useState("local");
  const [count, setCount] = useState(4);
  const [names, setNames] = useState(defaults);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  return <main className="entry-shell"><section className="entry-card">
    <h1>Estate</h1>
    <p className="entry-copy">Buy streets. Build a skyline. Outlast every rival.</p>
    <div className="mode-tabs" role="tablist" aria-label="Game mode">
      {[['local','Pass & play'],['create','Host online'],['join','Join room']].map(([id,label]) => <button key={id} className={mode === id ? "active" : ""} onClick={() => setMode(id)}>{label}</button>)}
    </div>
    {mode === "local" ? <div className="setup-fields">
      <label>Players<select value={count} onChange={(e) => setCount(Number(e.target.value))}>{[2,3,4,5].map((n) => <option key={n}>{n}</option>)}</select></label>
      {names.slice(0,count).map((value,i) => <label key={i}>Player {i+1}<input maxLength={24} value={value} onChange={(e) => setNames((old) => old.map((item,j) => i === j ? e.target.value : item))}/></label>)}
      <button className="primary" disabled={!connected || busy} onClick={() => request("createLocal", { names: names.slice(0,count) })}>Start new game</button>
    </div> : <div className="setup-fields">
      <label>Your name<input maxLength={24} value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name"/></label>
      {mode === "join" && <label>Room code<input maxLength={6} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123"/></label>}
      <button className="primary" disabled={!connected || busy} onClick={() => request(mode === "join" ? "joinRoom" : "createRoom", mode === "join" ? { name, code } : { name })}>{mode === "join" ? "Join room" : "Create private room"}</button>
    </div>}
    {error && <p className="error" role="alert">{error}</p>}
    <p className="connection">{connected ? "● Server connected" : "○ Connecting to server…"}</p>
  </section></main>;
}

function Board({ game, selectedId, onSelect }) {
  return <div className="board-scroll"><div className="board" aria-label="Estate game board">
    {BOARD.map((space) => {
      const deed = game.properties[space.id];
      const owner = deed?.ownerId ? game.players.find((p) => p.id === deed.ownerId) : null;
      const tokens = game.players.filter((p) => !p.bankrupt && p.position === space.id);
      return <button key={space.id} className={`space ${space.kind} ${selectedId === space.id ? "selected" : ""} ${deed?.mortgaged ? "mortgaged" : ""}`} style={gridPosition(space.id)} onClick={() => onSelect(space.id)} aria-label={`${space.name}${space.price ? `, ${money(space.price)}` : ""}${owner ? `, owned by ${owner.name}` : ""}`}>
        {GROUPS[space.group] && <span className="color-bar" style={{ background: GROUPS[space.group].color }} />}
        {owner && <span className="owner-mark" style={{ background: owner.color }} title={`Owned by ${owner.name}`}/>}
        <span className={`space-name${space.name.split(" ").some((word) => word.length >= 9) ? " long-word" : ""}`}>{space.name}</span>
        {space.price && <span className="space-price">{money(space.price)}</span>}
        {deed && (deed.houses || deed.hotel) && <span className="buildings">{deed.hotel ? "◆ Hotel" : `${deed.houses} house${deed.houses > 1 ? "s" : ""}`}</span>}
        {deed?.mortgaged && <span className="mortgage-mark">MORTGAGED</span>}
        {tokens.length > 0 && <span className="tokens">{tokens.map((p) => <span key={p.id} className="token" style={{ background: p.color }} title={p.name}>{p.name[0].toUpperCase()}</span>)}</span>}
      </button>;
    })}
    <div className="board-center"><span className="center-emblem">E</span><span className="center-title">ESTATE</span><span className="center-subtitle">OWN THE BLOCK · RULE THE BOARD</span><div className="center-stats"><span>{game.bank.houses} houses</span><span>{game.bank.hotels} hotels</span></div></div>
  </div></div>;
}

function JailCardSale({ game, seller, canControl, act, busy }) {
  const [partnerId, setPartnerId] = useState("");
  const [cardId, setCardId] = useState("");
  const [price, setPrice] = useState("50");
  if (!seller?.jailFree.length || !["roll", "end", "debt"].includes(game.phase)) return null;
  const buyer = game.players.find((item) => item.id === partnerId && !item.bankrupt);
  const selectedCard = seller.jailFree.some((card) => card.cardId === cardId) ? cardId : seller.jailFree[0].cardId;
  const amount = Number(price);
  return <div className="card-sale"><h3>Sell a Jail card</h3><p className="muted">The buyer must accept before the card and cash change hands.</p><label>Card<select value={selectedCard} onChange={(event) => setCardId(event.target.value)}>{seller.jailFree.map((card) => <option key={card.cardId} value={card.cardId}>{card.deck === "chance" ? "Chance" : "Community Chest"} Jail card</option>)}</select></label><label>Buyer<select value={partnerId} onChange={(event) => setPartnerId(event.target.value)}><option value="">Choose a player</option>{game.players.filter((item) => !item.bankrupt && item.id !== seller.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Price<input type="number" min={game.phase === "debt" ? 1 : 0} step="1" value={price} onChange={(event) => setPrice(event.target.value)}/></label><button disabled={!canControl(seller.id) || busy || !buyer || !Number.isSafeInteger(amount) || amount < (game.phase === "debt" ? 1 : 0) || amount > buyer.cash} onClick={() => act({ type: "proposeTrade", partnerId, aProperties: [], bProperties: [], aJailCards: [selectedCard], bJailCards: [], aCash: 0, bCash: amount }, seller.id)}>Offer card sale</button></div>;
}

function TurnPanel({ game, actor, canControl, act, busy, error }) {
  const current = game.players[game.turnIndex];
  const auction = game.auction;
  const [bid, setBid] = useState("10");
  const [target, setTarget] = useState("");
  const targets = auction?.kind === "building" ? BOARD.filter((space) => canBuild(game, actor, space, auction.building)) : [];
  return <section className="card turn-card"><div className="card-heading"><div><p className="eyebrow">Current turn</p><h2>{title[game.phase] || game.phase}</h2></div><span className="round-pill">{actor?.name || current.name}</span></div>
    <p className="turn-subtitle">{current.name}&apos;s turn · {BOARD[current.position].name}</p>
    {game.dice && <div className="dice"><span aria-label={`Die one: ${game.dice.a}`}>{game.dice.a}</span><span aria-label={`Die two: ${game.dice.b}`}>{game.dice.b}</span><small>Total {game.dice.total}</small></div>}
    {game.card && <p className="card-draw">{game.card.deck === "chance" ? "Chance" : "Community Chest"}: {game.card.text}</p>}
    {game.phase === "roll" && <div className="actions">{current.inJail && <><p>In Jail · failed attempts: {current.jailAttempts}/3</p><button disabled={!canControl(current.id) || busy} onClick={() => act({ type:"jailPay" },current.id)}>Pay $50 to leave</button><button disabled={!canControl(current.id) || !current.jailFree.length || busy} onClick={() => act({ type:"jailCard" },current.id)}>Use Jail card ({current.jailFree.length})</button></>}<button className="primary" disabled={!canControl(current.id) || busy} onClick={() => act({ type:"roll" },current.id)}>Roll dice</button></div>}
    {game.phase === "decision" && <div className="actions"><p><strong>{BOARD[game.purchase].name}</strong> is unowned. Buy for {money(BOARD[game.purchase].price)} or auction it.</p><button className="primary" disabled={!canControl(current.id) || busy || current.cash < BOARD[game.purchase].price} onClick={() => act({ type:"buy" },current.id)}>Buy property</button><button disabled={!canControl(current.id) || busy} onClick={() => act({ type:"decline" },current.id)}>Send to auction</button></div>}
    {game.phase === "auction" && auction && <div className="actions"><p><strong>{auction.kind === "property" ? BOARD[auction.propertyId].name : `Last ${auction.building}`}</strong> · {auction.highestId ? `Top bid ${money(auction.highestBid)} by ${game.players.find((p) => p.id === auction.highestId)?.name}` : "No bids yet"}</p><p>{actor?.name} to bid or pass.</p><label>Bid amount<input type="number" min={Math.max(10,auction.highestBid+1)} step="1" value={bid} onChange={(e) => setBid(e.target.value)}/></label>{auction.kind === "building" && <label>Build on<select value={target} onChange={(e) => setTarget(e.target.value)}><option value="">Select a street</option>{targets.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}</select></label>}<button className="primary" disabled={!canControl(actor?.id) || busy || !Number.isSafeInteger(Number(bid)) || Number(bid) < Math.max(10,auction.highestBid+1) || Number(bid) > (actor?.cash || 0) || auction.kind === "building" && !targets.some((space) => space.id === Number(target))} onClick={() => act({ type:"bid", amount:Number(bid), targetId:Number(target) },actor.id)}>Place bid</button><button disabled={!canControl(actor?.id) || busy} onClick={() => act({ type:"pass" },actor.id)}>Pass</button></div>}
    {game.phase === "debt" && game.debt && <div className="actions"><p><strong>{actor?.name}</strong> owes {money(game.debt.amount)} {game.debt.creditorId ? `to ${game.players.find((p) => p.id === game.debt.creditorId)?.name}` : "to the bank"} for {game.debt.reason}.</p><p>Cash: {money(actor?.cash || 0)} · shortfall: {money(Math.max(0,game.debt.amount-(actor?.cash || 0)))}</p><button className="primary" disabled={!canControl(actor?.id) || busy || actor.cash < game.debt.amount} onClick={() => act({ type:"payDebt" },actor.id)}>Pay debt</button><button disabled={!canControl(actor?.id) || busy || game.recoverableCash[actor.id] >= game.debt.amount} onClick={() => act({ type:"bankrupt" },actor.id)}>Declare bankruptcy</button><small>{game.recoverableCash[actor.id] >= game.debt.amount ? "Sell buildings or mortgage deeds: you can still cover this debt." : "You may trade to raise cash before declaring bankruptcy."}</small></div>}
    {game.phase === "trade" && game.trade && <div className="actions"><p><strong>{game.players.find((p) => p.id === game.trade.proposerId)?.name}</strong> offers {game.trade.aProperties.map((id) => BOARD[id].name).join(", ") || "no properties"} and {money(game.trade.aCash)}.</p><p><strong>{game.players.find((p) => p.id === game.trade.partnerId)?.name}</strong> offers {game.trade.bProperties.map((id) => BOARD[id].name).join(", ") || "no properties"} and {money(game.trade.bCash)}.</p><p>Projected balances: {money(game.trade.projection.projectedA)} / {money(game.trade.projection.projectedB)}. Mortgage transfer interest: {money(game.trade.projection.interestA + game.trade.projection.interestB)}; immediate redemption: {money(game.trade.projection.redemptionA + game.trade.projection.redemptionB)}.</p><button className="primary" disabled={!canControl(actor?.id) || busy} onClick={() => act({ type:"acceptTrade" },actor.id)}>Accept trade</button><button disabled={!canControl(actor?.id) || busy} onClick={() => act({ type:"declineTrade" },actor.id)}>Decline trade</button></div>}
    {game.phase === "end" && <button className="primary full" disabled={!canControl(current.id) || busy} onClick={() => act({ type:"endTurn" },current.id)}>End turn</button>}
    {game.phase === "winner" && <div className="winner-banner">🏆 {game.players.find((p) => p.id === game.winnerId)?.name} wins Estate<div className="final-standings">{game.players.map((p) => <div key={p.id}><strong>{p.name}</strong><span>{money(p.cash)} · {owned(game,p.id).map((space) => space.name).join(", ") || "No deeds"}</span></div>)}</div></div>}
    {game.phase === "trade" && (game.trade?.aJailCards.length || game.trade?.bJailCards.length) > 0 && <p className="card-draw">Jail cards offered: {game.trade.aJailCards.length} by {game.players.find((p) => p.id === game.trade.proposerId)?.name}, {game.trade.bJailCards.length} by {game.players.find((p) => p.id === game.trade.partnerId)?.name}.</p>}
    <JailCardSale game={game} seller={game.phase === "debt" ? actor : current} canControl={canControl} act={act} busy={busy} />
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}

function PropertyPanel({ game, selectedId, current, canControl, act, busy, onSelect, showHoldings = true }) {
  const space = selectedId === null ? null : BOARD[selectedId];
  const holdings = current ? owned(game,current.id) : [];
  if (!space) return <div className="detail-content"><h3>{current?.name}&apos;s deeds</h3><div className="holding-list">{holdings.length ? holdings.map((item) => <button key={item.id} onClick={() => onSelect(item.id)}>{item.name}</button>) : <span className="muted">No deeds yet.</span>}</div><p className="muted">Select a space on the board to inspect its deed.</p></div>;
  const deed = game.properties[space.id];
  const owner = deed?.ownerId ? game.players.find((p) => p.id === deed.ownerId) : null;
  const canManage = owner && current.id === owner.id && canControl(owner.id) && ["roll","end","debt"].includes(game.phase) && (game.phase !== "debt" || game.debt?.debtorId === owner.id);
  const builtGroup = space.group && BOARD.some((item) => item.group === space.group && game.properties[item.id] && level(game.properties[item.id]) > 0);
  const cost = GROUPS[space.group]?.buildCost;
  return <div className="detail-content"><div className="property-title"><span className="group-swatch" style={{ background: GROUPS[space.group]?.color || "#b9ac8b" }}/><div><h2>{space.name}</h2><small>Space {space.id} · {GROUPS[space.group]?.label || space.kind}</small></div></div>{showHoldings && <div className="holding-list">{holdings.map((item) => <button key={item.id} onClick={() => onSelect(item.id)}>{item.name}</button>)}</div>}
    {deed ? <><div className="property-metrics"><span>Price <strong>{money(space.price)}</strong></span><span>Mortgage <strong>{money(space.price/2)}</strong></span><span>Owner <strong>{owner?.name || "Bank"}</strong></span></div>
      {space.kind === "street" && <><h3>Rent schedule</h3><div className="rent-grid">{space.rents.map((rent,i) => <div key={i}><span>{i === 0 ? "Base" : i === 5 ? "Hotel" : `${i} house${i > 1 ? "s" : ""}`}</span><b>{money(rent)}</b></div>)}</div><p className="muted">A complete color set doubles base rent. Buildings cost {money(cost)} each.</p></>}
      {space.kind === "railroad" && <p>Rent by number of stations owned: $25 / $50 / $100 / $200.</p>}
      {space.kind === "utility" && <p>Rent is 4× dice total for one utility or 10× for both.</p>}
      {deed.mortgaged && <p className="warning">Mortgaged · rent suspended.</p>}
      {(deed.hotel || deed.houses) && <p>Development: {deed.hotel ? "Hotel" : `${deed.houses} houses`}</p>}
      {canManage && <div className="management-actions"><button disabled={busy || game.phase === "debt" || !canBuild(game,owner,space,"house") || owner.cash < cost} onClick={() => act({type:"build",propertyId:space.id,building:"house"},owner.id)}>Build house</button><button disabled={busy || game.phase === "debt" || !canBuild(game,owner,space,"hotel") || owner.cash < cost} onClick={() => act({type:"build",propertyId:space.id,building:"hotel"},owner.id)}>Build hotel</button><button disabled={busy || !canSellBuilding(game,space)} onClick={() => act({type:"sellBuilding",propertyId:space.id},owner.id)}>Sell building</button><button disabled={busy || deed.mortgaged || builtGroup} onClick={() => act({type:"mortgage",propertyId:space.id},owner.id)}>Mortgage</button><button disabled={busy || !deed.mortgaged || game.phase === "debt" || owner.cash < Math.ceil(space.price*.55)} onClick={() => act({type:"unmortgage",propertyId:space.id},owner.id)}>Unmortgage</button>{space.kind === "street" && <button disabled={busy || !builtGroup} onClick={() => act({type:"liquidateGroup",group:space.group},owner.id)}>Sell all group buildings</button>}</div>}
      {canManage && deed.hotel && game.bank.houses < 4 && <p className="muted">The bank lacks four houses. Use “Sell all group buildings” to liquidate this color set.</p>}
    </> : <p className="space-explanation">{spaceDetails[space.kind] || "This space has no title deed."}</p>}
  </div>;
}

function TradePanel({ game, current, canControl, act, busy }) {
  const [partnerId,setPartnerId] = useState("");
  const [aCash,setACash] = useState("0");
  const [bCash,setBCash] = useState("0");
  const [aProperties,setAProperties] = useState([]);
  const [bProperties,setBProperties] = useState([]);
  const [aRedeem,setARedeem] = useState([]);
  const [bRedeem,setBRedeem] = useState([]);
  const partner = game.players.find((p) => p.id === partnerId && !p.bankrupt);
  const toggle = (id,list,setter) => setter(list.includes(id) ? list.filter((item) => item !== id) : [...list,id]);
  const canTrade = canControl(current.id) && ["roll","end","debt"].includes(game.phase) && (game.phase !== "debt" || game.debt?.debtorId === current.id);
  return <div className="detail-content">{game.phase === "trade" ? <p>The receiving player is reviewing the proposal above.</p> : <><p className="muted">The active player proposes a trade. No assets move until the partner accepts.</p><label>Trade with<select value={partnerId} onChange={(e) => {setPartnerId(e.target.value);setBProperties([]);setARedeem([]);}}><option value="">Choose a player</option>{game.players.filter((p) => !p.bankrupt && p.id !== current.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><div className="trade-columns"><div><h3>{current.name} offers</h3><label>Cash<input type="number" min="0" step="1" value={aCash} onChange={(e) => setACash(e.target.value)}/></label>{owned(game,current.id).map((space) => <label className="check-row" key={space.id}><input type="checkbox" disabled={!tradeable(game,space) && !aProperties.includes(space.id)} checked={aProperties.includes(space.id)} onChange={() => toggle(space.id,aProperties,setAProperties)}/>{space.name}{game.properties[space.id].mortgaged ? " (mortgaged)" : ""}</label>)}</div><div><h3>{partner?.name || "Partner"} offers</h3><label>Cash<input type="number" min="0" step="1" value={bCash} onChange={(e) => setBCash(e.target.value)}/></label>{partner && owned(game,partner.id).map((space) => <label className="check-row" key={space.id}><input type="checkbox" disabled={!tradeable(game,space) && !bProperties.includes(space.id)} checked={bProperties.includes(space.id)} onChange={() => toggle(space.id,bProperties,setBProperties)}/>{space.name}{game.properties[space.id].mortgaged ? " (mortgaged)" : ""}</label>)}</div></div>{bProperties.filter((id) => game.properties[id].mortgaged).map((id) => <label className="check-row" key={`a-${id}`}><input type="checkbox" checked={aRedeem.includes(id)} onChange={() => toggle(id,aRedeem,setARedeem)}/>{current.name} redeems incoming {BOARD[id].name} immediately for {money(BOARD[id].price*.55)}</label>)}{aProperties.filter((id) => game.properties[id].mortgaged).map((id) => <label className="check-row" key={`b-${id}`}><input type="checkbox" checked={bRedeem.includes(id)} onChange={() => toggle(id,bRedeem,setBRedeem)}/>{partner?.name} redeems incoming {BOARD[id].name} immediately for {money(BOARD[id].price*.55)}</label>)}<p className="muted">A mortgaged deed left mortgaged still costs its new owner 10% of the mortgage value now.</p><button className="primary" disabled={!canTrade || !partner || busy || !Number.isSafeInteger(Number(aCash)) || !Number.isSafeInteger(Number(bCash)) || Number(aCash)<0 || Number(bCash)<0 || Number(aCash)>current.cash || Number(bCash)>partner.cash || aProperties.length+bProperties.length+Number(aCash)+Number(bCash)===0 || game.phase === "debt" && (Number(aCash)>0 || Number(bCash)===0)} onClick={() => act({type:"proposeTrade",partnerId,aProperties,bProperties,aRedeem:aRedeem.filter((id) => bProperties.includes(id)),bRedeem:bRedeem.filter((id) => aProperties.includes(id)),aCash:Number(aCash),bCash:Number(bCash)},current.id)}>Review trade with partner</button></>}</div>;
}

function PlayerPanel({ game, current }) {
  return <section className="card player-card">
    <div className="card-heading"><h2>Players</h2><small>{game.players.filter((p) => !p.bankrupt).length} active</small></div>
    <div className="player-list">{game.players.map((p) => <div className={`player-row ${current.id === p.id ? "active" : ""} ${p.bankrupt ? "out" : ""}`} key={p.id}>
      <span className="token" style={{background:p.color}}>{p.name[0].toUpperCase()}</span>
      <div><strong>{p.name}</strong><small>{p.bankrupt ? "Bankrupt" : p.inJail ? "In Jail" : BOARD[p.position].name} · {owned(game,p.id).length} deeds</small><small className="player-deeds">{owned(game,p.id).map((space) => space.name).join(", ") || "No deeds"}</small></div>
      <b>{money(p.cash)}</b>
    </div>)}</div>
  </section>;
}

function ActivityPanel({ game }) {
  return <section className="card log-card">
    <div className="card-heading"><h2>Activity</h2><small>Latest {Math.min(game.log.length,50)} events</small></div>
    <div className="activity-log" aria-live="polite">{game.log.slice(-50).map((event,i) => <p key={`${game.log.length-50+i}-${event}`}>{event}</p>)}</div>
  </section>;
}

function StagePanel({ view, game, selectedId, manager, canControl, act, busy, onSelect }) {
  return <section className="card stage-panel" aria-label={view === "property" ? "Property management" : view === "trade" ? "Trade" : "Quick rules"}>
    {view === "property" && <PropertyPanel game={game} selectedId={selectedId} current={manager} canControl={canControl} act={act} busy={busy} onSelect={onSelect} />}
    {view === "trade" && <TradePanel game={game} current={manager} canControl={canControl} act={act} busy={busy} />}
    {view === "rules" && <div className="detail-content rules-short"><h2>Quick rules</h2><p>Start with $1,500. Roll two dice, move clockwise, and buy unowned deeds or auction them. Complete color sets to build evenly and increase rent.</p><p>Three doubles in a turn send you to Jail. Pay $50, use a card, or try doubles up to three turns to leave. Unpaid obligations pause play while you raise funds.</p><p>Mortgaged deeds collect no rent. Sell buildings evenly before mortgaging or trading a developed color group. The last solvent player wins.</p><p>See <a href="/rules" target="_blank" rel="noreferrer">complete rules and deed schedules</a>.</p></div>}
  </section>;
}

function TileModal({ game, selectedId, closing, manager, canControl, act, busy, onClose, closeButtonRef }) {
  if (selectedId === null) return null;
  const handleKeys = (event) => {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const focusable = [...event.currentTarget.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]")];
    if (!focusable.length) return;
    if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
  };
  return <div className={`tile-backdrop ${closing ? "is-closing" : "is-opening"}`} onClick={onClose}>
    <div className="tile-dialog" role="dialog" aria-modal="true" aria-labelledby="tile-dialog-title" onClick={(event) => event.stopPropagation()} onKeyDown={handleKeys}>
      <div className="tile-dialog-header"><p className="eyebrow" id="tile-dialog-title">Space {selectedId} details</p><button ref={closeButtonRef} className="tile-close" aria-label="Close details" onClick={onClose}>×</button></div>
      <PropertyPanel game={game} selectedId={selectedId} current={manager} canControl={canControl} act={act} busy={busy} showHoldings={false} />
    </div>
  </div>;
}

export default function GameClient() {
  const sessionRef = useRef(null);
  const [connected,setConnected] = useState(false);
  const [session,setSession] = useState(null);
  const [room,setRoom] = useState(null);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const [selectedId,setSelectedId] = useState(null);
  const [view,setView] = useState("board");
  const [fading,setFading] = useState(false);
  const transitionTimer = useRef(null);
  const [modalId,setModalId] = useState(null);
  const [modalClosing,setModalClosing] = useState(false);
  const modalTimer = useRef(null);
  const modalTrigger = useRef(null);
  const modalCloseButton = useRef(null);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    const saved = localStorage.getItem("estate-session");
    if (saved) {
      try { sessionRef.current = JSON.parse(saved); }
      catch { localStorage.removeItem("estate-session"); }
    }
    const sync = async () => {
      if (inFlight) return;
      inFlight = true;
      const currentSession = sessionRef.current;
      try {
        const reply = await gameRequest(currentSession ? "snapshot" : "ping", {}, currentSession);
        if (!active || sessionRef.current !== currentSession) return;
        setConnected(true);
        if (currentSession) {
          if (!reply.ok) {
            localStorage.removeItem("estate-session");
            sessionRef.current = null;
            setSession(null);
            setRoom(null);
            setError(reply.error);
          } else {
            setSession(currentSession);
            setRoom((previous) => !previous || reply.snapshot.revision >= previous.revision ? reply.snapshot : previous);
          }
        }
      } catch {
        if (active) setConnected(false);
      } finally { inFlight = false; }
    };
    sync();
    const interval = window.setInterval(sync, 1000);
    return () => { active = false; window.clearInterval(interval); if (transitionTimer.current) clearTimeout(transitionTimer.current); if (modalTimer.current) clearTimeout(modalTimer.current); };
  }, []);

  useEffect(() => {
    if (modalId === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalCloseButton.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, [modalId]);

  async function request(event,payload={}) {
    if (!connected) { setError("The game service is disconnected. Reconnecting…"); return; }
    setBusy(true); setError("");
    try {
      const reply = await gameRequest(event, payload, sessionRef.current);
      setConnected(true);
      if (!reply.ok) { setError(reply.error || "Action could not be completed."); return; }
      if (reply.session) { localStorage.setItem("estate-session",JSON.stringify(reply.session)); sessionRef.current = reply.session; setSession(reply.session); }
      if (reply.snapshot) setRoom((previous) => !previous || reply.snapshot.revision >= previous.revision ? reply.snapshot : previous);
    } catch {
      setConnected(false);
      setError("The game service did not respond. Try again.");
    } finally { setBusy(false); }
  }
  const game = room?.game;
  const current = game?.players[game.turnIndex];
  const manager = game?.phase === "debt" ? game.players.find((p) => p.id === game.debt?.debtorId) : current;
  const actorId = game?.phase === "auction" ? game.auction?.nextBidderId : game?.phase === "trade" ? game.trade?.partnerId : game?.phase === "debt" ? game.debt?.debtorId : current?.id;
  const actor = game?.players.find((p) => p.id === actorId);
  const canControl = (id) => !!id && !!session && (session.mode === "local" || session.playerId === id);
  const act = (action,id=actorId) => request("gameAction",{requestId:crypto.randomUUID(),action:{...action,actorId:id}});
  const toggleView = (target) => {
    if (fading) return;
    const next = view === target ? "board" : target;
    setFading(true);
    transitionTimer.current = window.setTimeout(() => {
      setView(next);
      setFading(false);
      transitionTimer.current = null;
    }, 180);
  };
  const openTile = (id) => {
    modalTrigger.current = document.activeElement;
    setSelectedId(id);
    setModalId(id);
    setModalClosing(false);
  };
  const closeTile = () => {
    if (modalId === null || modalClosing) return;
    setModalClosing(true);
    modalTimer.current = window.setTimeout(() => {
      setModalId(null);
      setModalClosing(false);
      window.requestAnimationFrame(() => modalTrigger.current?.focus());
      modalTimer.current = null;
    }, 220);
  };

  if (!room || !session) return <Setup request={request} connected={connected} busy={busy} error={error}/>;
  if (!game) return <main className="entry-shell"><section className="entry-card"><h1>Estate</h1><p>Share this code with 1–4 friends:</p><div className="room-code">{room.code}</div><ul className="lobby-list">{room.lobby.map((p) => <li key={p.id}><span>{p.name}{p.id === room.hostId ? " · host" : ""}</span><small>{p.connected ? "Connected" : "Disconnected"}</small></li>)}</ul>{session.playerId === room.hostId ? <button className="primary" disabled={room.lobby.length<2 || busy} onClick={() => request("startGame")}>Start game</button> : <p>Waiting for the host to start.</p>}{error && <p className="error" role="alert">{error}</p>}<p className="connection">{connected ? "● Server connected" : "○ Reconnecting…"}</p></section></main>;

  return <main className="game-shell">
    <div className="game-layout">
      <div id="estate-stage" className={"main-stage" + (fading ? " is-fading" : "")}>
        {view === "board"
          ? <Board game={game} selectedId={selectedId} onSelect={openTile} />
          : <StagePanel view={view} game={game} selectedId={selectedId} manager={manager} canControl={canControl} act={act} busy={busy} onSelect={setSelectedId} />}
      </div>
      <aside className="sidebar">
        <header className="topbar">
          <h1>Estate</h1>
          <div className="topbar-actions">
            <span className="round-pill">Round {game.round}</span>
            <span className="room-pill">{room.mode === "online" ? "Room " + room.code : "Pass & play"}</span>
            <button className="subtle" disabled={busy || session.mode === "online" && session.playerId !== room.hostId} onClick={() => { if (window.confirm("Start a completely fresh Estate game? All current progress will be lost.")) { setView("board"); request("restartGame"); } }}>Restart</button>
          </div>
        </header>
        <TurnPanel game={game} actor={actor} canControl={canControl} act={act} busy={busy} error={error} />
        <PlayerPanel game={game} current={current} />
        <section className="card view-card" aria-label="Game views">
          <h2>Game views</h2>
          <div className="view-buttons">
            {[["property","Property management"],["trade","Trade"],["rules","Quick rules"]].map(([id,label]) =>
              <button key={id} className={view === id ? "active" : ""} aria-pressed={view === id} aria-controls="estate-stage" disabled={fading} onClick={() => toggleView(id)}>{label}</button>
            )}
          </div>
          <small>{view === "board" ? "Select a view to replace the board." : "Select the active view again to return to the board."}</small>
        </section>
        <ActivityPanel game={game} />
        <footer className="footer">{connected ? "● Live game connection" : "○ Reconnecting…"} · Game state is held by the Next.js server.</footer>
      </aside>
    </div>
    <TileModal game={game} selectedId={modalId} closing={modalClosing} manager={manager} canControl={canControl} act={act} busy={busy} onClose={closeTile} closeButtonRef={modalCloseButton} />
  </main>;
}
