/**
 * HamshiraGo — настройка Telegram бота
 *
 * Запуск:
 *   BOT_TOKEN=xxx WEB_URL=https://hamshirago.vercel.app node scripts/setup-bot.mjs
 */

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_URL   = process.env.WEB_URL;

if (!BOT_TOKEN || !WEB_URL) {
  console.error("❌  Укажи переменные:");
  console.error("    BOT_TOKEN=xxx WEB_URL=https://... node scripts/setup-bot.mjs");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function call(method, body = {}) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`${method} failed: ${JSON.stringify(data)}`);
  return data.result;
}

async function main() {
  console.log("🤖  Настраиваем бота...\n");

  // 1. Проверяем бота
  const me = await call("getMe");
  console.log(`✅  Бот: @${me.username} (${me.first_name})`);

  // 2. Устанавливаем кнопку меню — открывает Mini App
  await call("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "Открыть HamshiraGo",
      web_app: { url: WEB_URL },
    },
  });
  console.log(`✅  Menu Button → ${WEB_URL}`);

  // 3. Устанавливаем команды бота
  await call("setMyCommands", {
    commands: [
      { command: "start",  description: "Открыть приложение" },
      { command: "help",   description: "Помощь" },
      { command: "order",  description: "Новый заказ" },
    ],
  });
  console.log("✅  Команды: /start, /help, /order");

  // 4. Устанавливаем описание бота
  await call("setMyDescription", {
    description:
      "HamshiraGo — вызов медсестры на дом. Уколы, капельницы, измерение давления. Быстро и профессионально.",
  });
  console.log("✅  Описание бота обновлено");

  // 5. Устанавливаем короткое описание
  await call("setMyShortDescription", {
    short_description: "Медсестра на дом за 15–30 минут",
  });
  console.log("✅  Короткое описание обновлено");

  console.log("\n🎉  Готово! Проверь бота: https://t.me/" + me.username);
  console.log("\nПользователь нажимает кнопку меню → открывается " + WEB_URL);
}

main().catch((err) => {
  console.error("❌ Ошибка:", err.message);
  process.exit(1);
});
