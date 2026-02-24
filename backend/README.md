# HamshiraGo API

Backend для платформы вызова медсестры на дом (REST + WebSocket).

## Стек

- NestJS 10
- TypeORM + PostgreSQL
- JWT (Passport)
- Socket.IO (WebSocket)
- class-validator, bcrypt

## Требования

- Node.js 18+
- PostgreSQL 14+

## Установка

```bash
cd backend
npm install
cp .env.example .env
# Отредактируйте .env (DB_*, JWT_SECRET, PORT)
```

## База данных

Создайте БД:

```sql
CREATE DATABASE hamshira_go;
```

В режиме разработки (`NODE_ENV !== production`) TypeORM создаёт таблицы при старте (`synchronize: true`). Для продакшена используйте миграции.

## Запуск

```bash
# Разработка
npm run start:dev

# Продакшен
npm run build
npm run start
```

API: `http://localhost:3000` (или порт из `PORT` в .env).

## Эндпоинты (MVP)

### Auth
- `POST /auth/register` — регистрация клиента: `{ "phone", "password", "name?" }`
- `POST /auth/login` — вход: `{ "phone", "password" }` → `{ "access_token", "user" }`

### Orders (нужен заголовок `Authorization: Bearer <access_token>`)
- `POST /orders` — создать заказ (body см. ниже)
- `GET /orders` — список заказов текущего клиента
- `GET /orders/:id` — заказ по ID
- `PATCH /orders/:id/status` — обновить статус: `{ "status": "ACCEPTED" }`

Статусы заказа: `CREATED` → `ASSIGNED` → `ACCEPTED` → `ON_THE_WAY` → `ARRIVED` → `SERVICE_STARTED` → `DONE` (или `CANCELED`).

### Medics
- `GET /medics/nearby?latitude=41.31&longitude=69.28&limit=10` — ближайшие онлайн-медсёстры (по координатам из БД).

### WebSocket

Подключение с JWT в `auth.token` или в заголовке `Authorization: Bearer <token>`.

- Событие `subscribe_order` с payload `orderId` — подписка на обновления заказа.
- Сервер шлёт `order_status` при смене статуса: `{ "orderId", "status" }`.

## Пример тела создания заказа

```json
{
  "serviceId": "injection",
  "serviceTitle": "Injection",
  "priceAmount": 100000,
  "discountAmount": 10000,
  "location": {
    "latitude": 41.311151,
    "longitude": 69.279737,
    "house": "ул. Примерная, 1",
    "floor": "3",
    "apartment": "42",
    "phone": "+998901234567"
  }
}
```

## Структура

- `src/auth` — JWT, register/login
- `src/users` — сущность User (клиент)
- `src/orders` — заказы и адрес (order_locations)
- `src/medics` — медсёстры, nearby
- `src/realtime` — WebSocket gateway для order_status

Документация по архитектуре: `../docs/V0.1_MVP/`.
