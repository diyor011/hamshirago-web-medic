# HamshiraGo — Web Progress

## Стек
- Next.js 14 (App Router)
- Tailwind CSS v4
- react-icons/fa
- @tma.js/sdk (Telegram Mini App)
- JWT в localStorage

---

## web/ — Клиентское приложение

### Страницы
- [x] `/` — Главная (баннер, скидка, список услуг, адаптивный grid)
- [x] `/auth` — Вход / Регистрация (toggle-вкладки, JWT, split-layout на desktop)
- [x] `/service/[id]` — Детальная страница услуги (иконка + название в шапке)
- [x] `/order/location` — Адрес + карта Leaflet + выбор медсестры + GPS
- [x] `/order/confirm` — Подтверждение заказа, скидка 10%, успех-экран
- [x] `/orders` — Мои заказы (активные / история, real-time статус)
- [x] `/orders/[id]` — Детальная страница заказа (статус-прогресс, медик, адрес, кнопка отмены)

### Инфраструктура
- [x] Next.js проект инициализирован (`web/`)
- [x] API клиент (`lib/api.ts`) — auth, orders, medics
- [x] Типы: Order, Medic, OrderStatus, SERVICES_MAP
- [x] Telegram Mini App SDK интеграция (`useTelegram`, `useHaptic`, `useTelegramBackButton`, `useTelegramMainButton`)
- [x] WebSocket (Socket.io) — real-time статус заказов
- [x] Адаптивный layout — mobile-first, CSS Grid breakpoints (640px / 900px / 1000px)
- [x] Карта Leaflet (`components/Map.tsx`) с перетаскиванием маркера и reverse geocoding

### Компоненты (inline, не вынесены в отдельные файлы)
- [x] `<OrderCard />` — в `orders/page.tsx`
- [x] `<StatusBadge />` — в `orders/page.tsx`, `orders/[id]/page.tsx`
- [x] `<StatusStepper />` — в `orders/[id]/page.tsx`
- [ ] `<ServiceCard />` — сейчас inline в `/page.tsx`
- [ ] `<PrimaryButton />` — не вынесен

---

## web-medic/ — Панель медика

### Страницы
- [x] `/auth` — Вход / Регистрация медика (телефон + пароль + опыт)
- [x] `/` — Дашборд (онлайн/оффлайн toggle, доступные заказы, мои заказы, статистика)
- [x] `/order/[id]` — Детали заказа (карта, навигатор Yandex/Google/2GIS, смена статуса)
- [x] `/profile` — Профиль (баланс, рейтинг, отзывы, опыт, телефон, выход)

### Инфраструктура
- [x] Отдельный Next.js проект (`web-medic/`)
- [x] API клиент (`lib/api.ts`) — medicApi: auth, orders, location
- [x] JWT `medic_token` в localStorage
- [x] WebSocket real-time обновления заказов
- [x] Геолокация: обновление координат при go-online + интервал 30 сек
- [x] Карта Leaflet (`components/Map.tsx`)
- [x] Адаптивный layout — 2-column sidebar на ≥860px, mobile-first
