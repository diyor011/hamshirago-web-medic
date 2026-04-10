/**
 * Telegram constants — единое место для всех Telegram ссылок в web-medic.
 * Менять только здесь — все страницы подтянутся автоматически.
 */

/** Username бота (без @) */
export const TELEGRAM_BOT = 'hamshirago_medic_bot';

/** Ссылка на бот поддержки */
export const TELEGRAM_SUPPORT = 'https://t.me/hamshirago_support';

/** Ссылка на канал для медиков */
export const TELEGRAM_CHANNEL = 'https://t.me/hamshirago_medics';

/** Ссылка для привязки Telegram медика */
export const getMedicBotLink = (medicId: string) =>
  `https://t.me/${TELEGRAM_BOT}?start=${medicId}`;
