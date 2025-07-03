import { NextRequest, NextResponse } from "next/server";
import { SexVZ } from "@/lib/sexvz";

export async function GET(req: NextRequest) {
  const sessionId = req.headers.get("x-session-id");
  if (!sessionId)
    return NextResponse.json({ error: "Missing session id" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const dialogId = searchParams.get("dialogId");
  const msgId = searchParams.get("msgId");
  if (!dialogId || !msgId)
    return NextResponse.json(
      { error: "Missing dialogId or msgId" },
      { status: 400 }
    );
  const sexvz = new SexVZ();
  await sexvz.setSessionId(sessionId);
  try {
    const messages = await sexvz.getThread(msgId, dialogId);
    return NextResponse.json(messages);
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch thread" },
      { status: 500 }
    );
  }
}
