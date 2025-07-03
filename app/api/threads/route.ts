import { NextRequest, NextResponse } from "next/server";
import { SexVZ } from "@/lib/sexvz";

export async function GET(req: NextRequest) {
  const sessionId = req.headers.get("x-session-id");
  if (!sessionId)
    return NextResponse.json({ error: "Missing session id" }, { status: 401 });
  const sexvz = new SexVZ();
  await sexvz.setSessionId(sessionId);
  try {
    const threads = await sexvz.getAllThreads();
    const mapped = threads.map((t) => ({
      id: t.id,
      dialogId: t.dialogId,
      subject: t.subject,
      user: t.user,
      date: t.date,
      unread: t.unread,
    }));
    return NextResponse.json(mapped);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 }
    );
  }
}
