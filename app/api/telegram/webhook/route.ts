import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://web-medic-production.up.railway.app";

export async function POST(req: NextRequest) {
  const token = process.env.TG_BOT_TOKEN;
  if (!token) return NextResponse.json({ ok: true });

  const update = await req.json();
  const message = update.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const firstName = message.chat.first_name || "Медик";
  const returnUrl = `${APP_URL}/profile?chatid=${chatId}`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `👋 Привет, ${firstName}!\n\nНажмите кнопку ниже чтобы подключить Telegram-уведомления о новых заказах в HamshiraGo.`,
      reply_markup: {
        inline_keyboard: [[
          { text: "📱 Подключить уведомления", url: returnUrl },
        ]],
      },
    }),
  });

  return NextResponse.json({ ok: true });
}
