import { NextRequest, NextResponse } from "next/server";
import { SexVZ } from "@/lib/sexvz";

export async function POST(req: NextRequest) {
  const sessionId = req.headers.get("x-session-id");
  if (!sessionId)
    return NextResponse.json({ error: "Missing session id" }, { status: 401 });
  const { dialogId, text, name, title, photo } = await req.json();
  if (!dialogId || !text || !name || !title || !photo)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const sexvz = new SexVZ();
  await sexvz.setSessionId(sessionId);
  try {
    const response = await sexvz.sendMessage({
      dialogId,
      text,
      name,
      title,
      photo,
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (_) {
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
