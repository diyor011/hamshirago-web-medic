const BASE_URL = "https://hamshirago-production-0a65.up.railway.app";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export async function subscribeWebPush(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.log("[WebPush] не поддерживается браузером");
    return;
  }

  const token = localStorage.getItem("medic_token");
  if (!token) {
    console.log("[WebPush] нет medic_token, пропускаем");
    return;
  }

  try {
    // 1. Регистрируем service worker
    console.log("[WebPush] регистрируем SW...");
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    console.log("[WebPush] SW готов");

    // 2. Получаем VAPID публичный ключ от бекенда
    console.log("[WebPush] запрашиваем VAPID ключ...");
    const res = await fetch(`${BASE_URL}/auth/vapid-public-key`);
    const { publicKey } = await res.json();
    console.log("[WebPush] publicKey:", publicKey);
    if (!publicKey) {
      console.log("[WebPush] VAPID ключ не настроен на бекенде");
      return;
    }

    // 3. Запрашиваем разрешение у пользователя
    console.log("[WebPush] запрашиваем разрешение...");
    const permission = await Notification.requestPermission();
    console.log("[WebPush] разрешение:", permission);
    if (permission !== "granted") return;

    // 4. Подписываемся на Push через браузер
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    console.log("[WebPush] подписка создана");

    // 5. Сохраняем подписку на бекенде
    const sub = subscription.toJSON();
    await fetch(`${BASE_URL}/medics/web-push-subscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys?.p256dh, auth: sub.keys?.auth },
      }),
    });
    console.log("[WebPush] подписка сохранена на бекенде ✅");
  } catch (err) {
    console.log("[WebPush] ошибка:", err);
  }
}

export async function unsubscribeWebPush(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const token = localStorage.getItem("medic_token");

  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    if (token) {
      await fetch(`${BASE_URL}/medics/web-push-subscription`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ endpoint }),
      });
    }
  } catch {
    // Тихо игнорируем
  }
}
