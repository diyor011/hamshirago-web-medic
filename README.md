# HamshiraGo — Медсестра на дом

Платформа для вызова медсестры на дом в Ташкенте. Клиент заказывает услугу, ближайший медик принимает заказ и приезжает за 15–30 минут.

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                        КЛИЕНТЫ                                  │
│  mobile/   (Expo React Native)  ←── App Store / Google Play    │
│  web/      (Next.js 14)         ←── hamshirago.vercel.app       │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST + WebSocket
┌──────────────────────────────▼──────────────────────────────────┐
│               backend/ (NestJS · Railway)                       │
│  Auth  ·  Orders  ·  Medics  ·  Services  ·  Push  ·  WS      │
│  PostgreSQL (Railway)  ·  Cloudinary (photos)                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST + WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                        МЕДИКИ                                   │
│  medic/     (Expo React Native) ←── App Store / Google Play    │
│  web-medic/ (Next.js 14)        ←── medic.hamshirago.vercel.app │
└─────────────────────────────────────────────────────────────────┘
                    │ REST
┌───────────────────▼─────────────────────────────────────────────┐
│  admin/ (React + Vite)  ←── admin.hamshirago.vercel.app         │
│  Дашборд · Верификация · Медики · Клиенты · Заказы · Отчёты    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Структура проекта

```
hamshiraGo/
├── backend/      # NestJS API — Railway
├── web/          # Next.js 14 — клиентское web-приложение
├── web-medic/    # Next.js 14 — web-приложение для медиков
├── admin/        # React + Vite — панель администратора
├── mobile/       # Expo React Native — мобильный клиент
├── medic/        # Expo React Native — мобильное приложение медика
└── docs/
    ├── BACKEND_API.md      ← REST API reference
    ├── DEPLOYMENT.md       ← Руководство по деплою
    ├── WEB_PROGRESS.md     ← Прогресс web-приложений
    ├── ADMIN_PANEL.md      ← Документация admin панели
    ├── tasks.md            ← Активные задачи
    └── done.md             ← История выполненных задач
```

---

## Технологический стек

| Слой | Технология |
|------|-----------|
| Backend | NestJS 10, TypeORM, PostgreSQL, Socket.IO |
| Web client | Next.js 14 (App Router), Tailwind CSS v4 |
| Admin | React 18, Vite, shadcn/ui, TanStack Query |
| Mobile | Expo SDK 52, React Native, Expo Router |
| Push | Expo Push API, Web Push (VAPID), Telegram Bot |
| Media | Cloudinary (медик-фото) |
| Deploy | Railway (backend + DB), Vercel (web/admin) |

---

## Быстрый старт (локальная разработка)

### Требования
- Node.js 20+
- PostgreSQL (локально или Docker)
- Переменные окружения (см. `.env.example` в каждом сервисе)

### Backend

```bash
cd backend
cp .env.example .env        # заполните переменные
npm install
npm run start:dev           # http://localhost:3000
```

Обязательные переменные в `backend/.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/hamshirago
JWT_SECRET=your-secret-key
ADMIN_PASSWORD=your-admin-password
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Web (клиент)

```bash
cd web
cp .env.example .env.local  # укажите NEXT_PUBLIC_API_URL
npm install
npm run dev                 # http://localhost:3001
```

### Web-Medic

```bash
cd web-medic
cp .env.example .env.local
npm install
npm run dev                 # http://localhost:3002
```

### Admin

```bash
cd admin
npm install
npm run dev                 # http://localhost:5173
```

Логин по умолчанию: `admin` / значение `ADMIN_PASSWORD` из backend `.env`.

### Mobile (Expo)

```bash
cd mobile
npm install
npx expo start

cd medic
npm install
npx expo start
```

---

## Бизнес-логика (ключевые правила)

| Правило | Значение |
|---------|----------|
| Комиссия платформы | 10% от чистой суммы заказа |
| `discountAmount` | в UZS (не в процентах) |
| `platformFee` | рассчитывается на бэкенде и сохраняется в заказе |
| Статусы заказа | `CREATED → ASSIGNED → ACCEPTED → ON_THE_WAY → ARRIVED → SERVICE_STARTED → DONE` или `CANCELED` |
| Верификация медика | `PENDING → APPROVED` или `REJECTED` |
| Скидка на первый заказ | 10% (применяется клиентом при создании заказа) |
| Авто-оффлайн медика | после 5 часов неактивности бэкенд выставляет `isOnline = false` |

---

## Документация

- **[REST API Reference](docs/BACKEND_API.md)** — все эндпоинты с примерами запросов/ответов
- **[Деплой](docs/DEPLOYMENT.md)** — Railway, Vercel, переменные окружения
- **[Web прогресс](docs/WEB_PROGRESS.md)** — реализованные фичи web-приложений
- **[Admin панель](docs/ADMIN_PANEL.md)** — функциональность и структура admin

---

## Production URLs

| Сервис | URL |
|--------|-----|
| API | `https://hamshirago-production-0a65.up.railway.app` |
| Web клиент | `https://hamshirago.vercel.app` |
| Web медик | настраивается через `NEXT_PUBLIC_API_URL` |
| Admin | настраивается через `VITE_API_URL` |
