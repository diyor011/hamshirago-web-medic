import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = process.env.TG_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 503 });
  }

  const { chatId, text } = await req.json();
  if (!chatId || !text) {
    return NextResponse.json({ error: "chatId and text required" }, { status: 400 });
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });

  const data = await res.json();
  if (!data.ok) {
    return NextResponse.json({ error: data.description }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
