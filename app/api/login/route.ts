import { NextRequest, NextResponse } from "next/server";
import { SexVZ } from "@/lib/sexvz";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    const sexvz = new SexVZ();
    await sexvz.login(username, password);
    if (!sexvz.sessionId)
      return NextResponse.json({ error: "Login failed" }, { status: 401 });
    return NextResponse.json({ sessionId: sexvz.sessionId });
  } catch (_) {
    return NextResponse.json({ error: "Login failed" }, { status: 401 });
  }
}
