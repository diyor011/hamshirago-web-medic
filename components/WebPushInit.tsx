"use client";

// WebPushInit больше не вызывает subscribeWebPush() сразу при загрузке.
// Вместо этого PushPermissionPrompt показывает bottom-sheet через 3 секунды
// — браузер запрашивает разрешение только после явного нажатия пользователем.
// Этот компонент оставлен для совместимости импортов.
export default function WebPushInit() {
  return null;
}
