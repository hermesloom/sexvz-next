import { NextRequest, NextResponse } from "next/server";
import { SexVZ } from "@/lib/sexvz";

export async function GET(req: NextRequest) {
  const sessionId = req.headers.get("x-session-id");
  if (!sessionId)
    return NextResponse.json({ error: "Missing session id" }, { status: 401 });
  const sexvz = new SexVZ();
  await sexvz.setSessionId(sessionId);
  try {
    const users = await sexvz.getOnlineUsers();
    return NextResponse.json(users);
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch online users" },
      { status: 500 }
    );
  }
}
