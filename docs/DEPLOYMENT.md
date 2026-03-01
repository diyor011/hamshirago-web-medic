# HamshiraGo — Руководство по деплою

---

## Архитектура деплоя

```
Railway                Vercel
┌──────────────┐       ┌──────────────────────────────────┐
│  backend     │       │  web/        (Next.js)            │
│  PostgreSQL  │◄──────│  web-medic/  (Next.js)            │
└──────────────┘       │  admin/      (Vite SPA)           │
                       └──────────────────────────────────┘
```

---

## 1. Backend — Railway

### Переменные окружения (Railway Dashboard → Variables)

| Переменная | Описание | Пример |
|-----------|----------|--------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Секрет для подписи JWT | минимум 32 символа |
| `ADMIN_PASSWORD` | Пароль для `/auth/admin/login` | сильный пароль |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `mycloud` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `abc...` |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key | `BJ...` |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key | `...` |
| `VAPID_SUBJECT` | VAPID subject (mailto или URL) | `mailto:admin@example.com` |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token | `123456:ABC...` |
| `PORT` | Порт (Railway выставляет автоматически) | `3000` |

### Деплой

Railway автоматически деплоит при push в `main`. Для ручного деплоя:
```bash
railway up
```

### Первый запуск
При старте бэкенд автоматически:
1. Создаёт таблицы (TypeORM `synchronize: true`)
2. Запускает seed услуг (`seedServices`) — создаёт базовый каталог если пусто

> ⚠️ **`synchronize: true` опасен в production** — при изменении entity-схемы может удалить данные. Перед изменением entity — сделайте бэкап БД.

---

## 2. Web / Web-Medic — Vercel

### Переменные окружения (Vercel Dashboard → Settings → Environment Variables)

| Переменная | Описание |
|-----------|----------|
| `NEXT_PUBLIC_API_URL` | URL бэкенда без слэша в конце |
| `NEXT_PUBLIC_SITE_URL` | Публичный URL самого сайта (для SEO) |

### Деплой

Vercel деплоит автоматически при push в `main`. Настройки:
- **Framework**: Next.js
- **Root directory**: `web` (или `web-medic`)
- **Build command**: `next build`
- **Output directory**: `.next`

### Web Push (VAPID)

Ключи генерируются один раз:
```bash
cd web  # или web-medic
node -e "const webpush=require('web-push'); const keys=webpush.generateVAPIDKeys(); console.log(JSON.stringify(keys,null,2));"
```
Публичный ключ (`publicKey`) → переменная `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (если есть).
Приватный ключ → только на бэкенде в `VAPID_PRIVATE_KEY`.

---

## 3. Admin — Vercel

### Переменные окружения

| Переменная | Описание |
|-----------|----------|
| `VITE_API_URL` | URL бэкенда без слэша в конце |

### Деплой

- **Framework**: Vite
- **Root directory**: `admin`
- **Build command**: `npm run build`
- **Output directory**: `dist`

Admin защищён: без JWT-токена (логин через `/login`) доступа нет. Токен истекает — пользователь автоматически перенаправляется на `/login`.

---

## 4. Чеклист перед production

### Безопасность
- [ ] `JWT_SECRET` — длина минимум 32 символа, случайный
- [ ] `ADMIN_PASSWORD` — не стандартный (`change-this-strong-password`)
- [ ] Все API-ключи ротированы (не из git-истории)
- [ ] CORS в `backend/src/main.ts` — только production домены
- [ ] HTTPS везде (Vercel и Railway дают автоматически)

### База данных
- [ ] Сделан бэкап перед первым деплоем с новой схемой
- [ ] `synchronize: true` — осторожно при изменении entity
- [ ] Индексы применены (добавлены `@Index()` в entity-файлах)

### Мониторинг
- [ ] Railway dashboard → Metrics — CPU/RAM/DB connections
- [ ] Логи доступны в Railway → Logs (использует Pino)
- [ ] Uptime monitor (UptimeRobot, BetterStack) на `GET /health`

### После деплоя
- [ ] Проверить `/auth/admin/login` работает с новым паролем
- [ ] Создать тестовый заказ end-to-end
- [ ] Проверить Web Push (подписка + уведомление)
- [ ] Проверить Telegram Bot (`/start` в @hamshirago_medic_bot)

---

## 5. Rollback

### Backend (Railway)
В Railway Dashboard → Deployments → выбрать предыдущий деплой → **Rollback**.

### Web/Admin (Vercel)
В Vercel Dashboard → Deployments → выбрать предыдущий → **Promote to Production**.

---

## 6. Локальная разработка с production БД

> ⚠️ Не рекомендуется. Используйте только для отладки, никогда для тестов с реальными данными.

```bash
# Получить DATABASE_URL из Railway
railway variables get DATABASE_URL

# Подключиться к production БД напрямую
psql $DATABASE_URL
```

---

## 7. Переменные окружения — сводная таблица

| Сервис | Файл | Переменная | Где брать |
|--------|------|-----------|-----------|
| backend | `.env` | `DATABASE_URL` | Railway → PostgreSQL plugin |
| backend | `.env` | `JWT_SECRET` | `openssl rand -base64 32` |
| backend | `.env` | `VAPID_PUBLIC_KEY` | `web-push generate-vapid-keys` |
| backend | `.env` | `VAPID_PRIVATE_KEY` | то же |
| backend | `.env` | `CLOUDINARY_*` | cloudinary.com → Dashboard |
| backend | `.env` | `TELEGRAM_BOT_TOKEN` | @BotFather в Telegram |
| web | `.env.local` | `NEXT_PUBLIC_API_URL` | URL Railway бэкенда |
| web | `.env.local` | `NEXT_PUBLIC_SITE_URL` | URL Vercel проекта |
| web-medic | `.env.local` | `NEXT_PUBLIC_API_URL` | URL Railway бэкенда |
| admin | `.env` | `VITE_API_URL` | URL Railway бэкенда |
