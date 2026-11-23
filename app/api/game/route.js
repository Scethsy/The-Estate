import { handleGameRequest } from "../../../lib/room-store.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.text();
    if (body.length > 64_000) return Response.json({ ok: false, error: "Request is too large." }, { status: 413 });
    const { event, payload, session } = JSON.parse(body);
    return Response.json(handleGameRequest(event, payload, session), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ ok: false, error: "Invalid game request." }, { status: 400 });
  }
}
