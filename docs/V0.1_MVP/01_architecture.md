# Architecture (Microservices) — V0.1 MVP

## Nega microservices?
- Realtime (WebSocket) va buyurtma taqsimlash tez ishlashi kerak
- Admin/AI analyzerni ajratib, asosiy buyurtma servisini yengillatamiz
- Telegram bot alohida servis bo‘lsa, core backendga yuk tushmaydi

## Tavsiya etilgan servislar
1) api-gateway (BFF)
2) auth-service
3) user-service (client profiles)
4) medic-service (medic profile + verification status)
5) order-service (dispatching, state machine)
6) realtime-service (WebSocket)
7) payment-service (commission/balance ledger)
8) feedback-service (ratings, reviews)
9) analytics-service (ads leads, profit, AI insights)
10) telegram-bot-service

## Tezkor ishlash prinsiplar
- Order dispatch: DB tranzaksiya + optimistic locking
- WebSocket: realtime-service’ga ajratiladi
- Heavy AI analyze: analytics-service’da async job
- API Gateway caching (faqat safe endpointlar)
- Rate limiting: gateway + auth

## Ichki aloqa
- MVP: REST internal + WebSocket external
- V0.2: queue (RabbitMQ/NATS) (scale docda)