import { NextRequest, NextResponse } from "next/server";
import { SexVZ } from "@/lib/sexvz";

export async function GET(req: NextRequest) {
  const sessionId = req.headers.get("x-session-id");
  if (!sessionId)
    return NextResponse.json({ error: "Missing session id" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const sexvz = new SexVZ();
  await sexvz.setSessionId(sessionId);
  try {
    const profile = await sexvz.getProfile(id);
    return NextResponse.json(profile);
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
