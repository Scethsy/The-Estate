import { randomInt, randomUUID } from "node:crypto";
import { applyAction, createGame, publicGame } from "./engine.mjs";

// A single long-lived Next.js process owns these rooms. Keep the map across
// development route reloads, which may reevaluate this module.
const roomsKey = Symbol.for("estate.rooms");
const rooms = globalThis[roomsKey] ??= new Map();
const codeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const presenceWindowMs = 8_000;

function makeCode() {
  let code;
  do { code = Array.from({ length: 6 }, () => codeChars[randomInt(codeChars.length)]).join(""); }
  while (rooms.has(code));
  return code;
}

function cleanName(name) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 24) {
    throw new Error("Names must be 1–24 characters.");
  }
  return name.trim();
}

function newRoom(mode, members) {
  return {
    code: makeCode(), mode, hostId: members[0].id, members,
    credentials: new Map(), presence: new Map(), game: null,
    revision: 0, actionIds: new Set(),
  };
}

function snapshot(room) {
  const now = Date.now();
  return {
    code: room.code,
    mode: room.mode,
    hostId: room.hostId,
    lobby: room.members.map(({ id, name }) => ({
      id, name,
      connected: room.mode === "local" || now - (room.presence.get(id) ?? 0) < presenceWindowMs,
    })),
    game: room.game ? publicGame(room.game) : null,
    revision: room.revision,
  };
}

function publish(room) { room.revision++; }

function touch(room, playerId) {
  const wasAway = Date.now() - (room.presence.get(playerId) ?? 0) >= presenceWindowMs;
  room.presence.set(playerId, Date.now());
  if (wasAway) publish(room);
}

function authorize(session) {
  const room = rooms.get(String(session?.code ?? "").trim().toUpperCase());
  if (!room) throw new Error("This room is no longer available on this server.");
  if (typeof session?.token !== "string" || !session.token || typeof session?.playerId !== "string") {
    throw new Error("Invalid player session.");
  }
  if (room.mode === "local") {
    if (room.credentials.get("controller") !== session?.token || room.hostId !== session?.playerId) {
      throw new Error("Invalid local session.");
    }
  } else if (!room.credentials.has(session.playerId) || room.credentials.get(session.playerId) !== session.token) {
    throw new Error("Invalid player session.");
  }
  touch(room, session.playerId);
  return room;
}

function perform(event, payload, session) {
  if (event === "ping") return {};

  if (event === "createLocal") {
    const { names } = payload;
    if (!Array.isArray(names) || names.length < 2 || names.length > 5) throw new Error("Choose 2–5 players.");
    const members = names.map((name) => ({ id: randomUUID(), name: cleanName(name) }));
    const room = newRoom("local", members);
    const token = randomUUID();
    room.credentials.set("controller", token);
    room.game = createGame(members.map((item) => item.name), members.map((item) => item.id), randomInt);
    rooms.set(room.code, room);
    touch(room, members[0].id);
    return { session: { code: room.code, playerId: members[0].id, token, mode: "local" }, snapshot: snapshot(room) };
  }

  if (event === "createRoom") {
    const member = { id: randomUUID(), name: cleanName(payload.name) };
    const room = newRoom("online", [member]);
    const token = randomUUID();
    room.credentials.set(member.id, token);
    rooms.set(room.code, room);
    touch(room, member.id);
    return { session: { code: room.code, playerId: member.id, token, mode: "online" }, snapshot: snapshot(room) };
  }

  if (event === "joinRoom") {
    const room = rooms.get(String(payload.code ?? "").trim().toUpperCase());
    if (!room || room.mode !== "online") throw new Error("Room not found.");
    if (room.game) throw new Error("This game has already started. Rejoin with your saved session.");
    if (room.members.length >= 5) throw new Error("This room is full.");
    const member = { id: randomUUID(), name: cleanName(payload.name) };
    const token = randomUUID();
    room.members.push(member);
    room.credentials.set(member.id, token);
    touch(room, member.id);
    return { session: { code: room.code, playerId: member.id, token, mode: "online" }, snapshot: snapshot(room) };
  }

  const room = authorize(session);

  if (event === "snapshot" || event === "rejoin") {
    return { session: { code: room.code, playerId: session.playerId, token: session.token, mode: room.mode }, snapshot: snapshot(room) };
  }

  if (event === "startGame") {
    if (room.mode !== "online" || room.hostId !== session.playerId) throw new Error("Only the host can start this room.");
    if (room.game) throw new Error("The game has already started.");
    if (room.members.length < 2) throw new Error("At least two players are needed.");
    room.game = createGame(room.members.map((item) => item.name), room.members.map((item) => item.id), randomInt);
    publish(room);
    return { snapshot: snapshot(room) };
  }

  if (event === "gameAction") {
    if (!room.game) throw new Error("No active game is available.");
    const { requestId, action } = payload;
    if (typeof requestId !== "string" || requestId.length > 80 || !requestId) throw new Error("Invalid action ID.");
    if (room.actionIds.has(requestId)) return { snapshot: snapshot(room) };
    const actorId = room.mode === "local" ? action?.actorId : session.playerId;
    if (!actorId || room.mode === "local" && !room.members.some((member) => member.id === actorId)) {
      throw new Error("You cannot act for this player.");
    }
    room.game = applyAction(room.game, actorId, action, randomInt);
    room.actionIds.add(requestId);
    if (room.actionIds.size > 1000) room.actionIds.delete(room.actionIds.values().next().value);
    publish(room);
    return { snapshot: snapshot(room) };
  }

  if (event === "restartGame") {
    if (!room.game) throw new Error("No game to restart.");
    if (room.hostId !== session.playerId) throw new Error("Only the host can restart the game.");
    room.game = createGame(room.members.map((item) => item.name), room.members.map((item) => item.id), randomInt);
    room.actionIds.clear();
    publish(room);
    return { snapshot: snapshot(room) };
  }

  throw new Error("Unknown game request.");
}

export function handleGameRequest(event, payload = {}, session = null) {
  try { return { ok: true, ...perform(event, payload ?? {}, session) }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Request failed." }; }
}
