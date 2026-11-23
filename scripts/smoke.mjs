import assert from "node:assert/strict";

const base = process.env.ESTATE_URL || "http://localhost:3000";
const send = async (event, payload = {}, session = null) => {
  const response = await fetch(`${base}/api/game`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, payload, session }),
  });
  assert.equal(response.status, 200);
  return response.json();
};

const home = await fetch(base);
assert.equal(home.status, 200);
assert.match(await home.text(), /Estate/);
const rules = await fetch(`${base}/rules`);
assert.equal(rules.status, 200);
assert.match(await rules.text(), /complete game rules/);
assert.equal((await send("ping")).ok, true);

const created = await send("createLocal", { names: ["Nathan", "Shawn"] });
assert.equal(created.ok, true);
assert.equal(created.snapshot.game.players.length, 2);
assert.equal(created.snapshot.game.players[0].cash, 1500);
assert.equal(created.snapshot.game.phase, "roll");
const localSession = created.session;
const localSnapshot = await send("snapshot", {}, localSession);
assert.equal(localSnapshot.snapshot.code, created.snapshot.code);
const rollId = crypto.randomUUID();
const rolled = await send("gameAction", { requestId: rollId, action: { type: "roll", actorId: created.snapshot.game.players[0].id } }, localSession);
assert.equal(rolled.ok, true);
assert.ok(rolled.snapshot.game.dice);
const duplicate = await send("gameAction", { requestId: rollId, action: { type: "roll", actorId: created.snapshot.game.players[0].id } }, localSession);
assert.equal(duplicate.ok, true);
assert.equal(duplicate.snapshot.revision, rolled.snapshot.revision);
const restarted = await send("restartGame", {}, localSession);
assert.equal(restarted.ok, true);
assert.equal(restarted.snapshot.game.round, 1);
assert.equal(restarted.snapshot.game.players[0].position, 0);

const hosted = await send("createRoom", { name: "Host" });
assert.equal(hosted.ok, true);
const joined = await send("joinRoom", { code: hosted.session.code, name: "Guest" });
assert.equal(joined.ok, true);
const hostLobby = await send("snapshot", {}, hosted.session);
assert.equal(hostLobby.snapshot.lobby.length, 2);
const started = await send("startGame", {}, hosted.session);
assert.equal(started.ok, true);
assert.equal(started.snapshot.game.players.length, 2);
const forbidden = await send("gameAction", { requestId: crypto.randomUUID(), action: { type: "roll", actorId: joined.session.playerId } }, joined.session);
assert.equal(forbidden.ok, false);
const anonymous = await send("snapshot", {}, { code: hosted.session.code });
assert.equal(anonymous.ok, false);
const hostRoll = await send("gameAction", { requestId: crypto.randomUUID(), action: { type: "roll" } }, hosted.session);
assert.equal(hostRoll.ok, true);
const rejoined = await send("rejoin", {}, joined.session);
assert.equal(rejoined.ok, true);
assert.equal(rejoined.snapshot.game.players.length, 2);

console.log("Estate Next.js API, local game, online authorization, restart, and reconnect smoke checks passed.");
