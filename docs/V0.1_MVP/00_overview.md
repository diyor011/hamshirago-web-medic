# V0.1 (MVP) Overview — HamshiraGo

## Maqsad
Uyga boradigan hamshira xizmati platformasi (Yandex Taxi modeli):
- Client app/web: xizmat tanlash, map orqali yaqin hamshiralarni ko‘rish, buyurtma, tracking, rating
- Medic app/web: online/offline, buyurtma qabul qilish, navigatsiya, ish tarixi, balans/komissiya
- Admin/Operator: verifikatsiya, bloklash, feedbacklar, analitika, daromad, AI chat

## Texnologiyalar (MVP)
- Backend: Microservices (Node.js/NestJS), REST + WebSocket
- DB: PostgreSQL (local/dev), migrations bilan
- Map: Yandex Maps
- Security: helmet, cors, rate-limit, input validation
- Logs: barcha API request/response meta loglanadi, trace-id bilan
- AI: Claude token (analyze, bug finding, UX improvements), Claude CLI development flow
- Telegram bot: tezkor buyurtma/holat/feedback

## Qamrov (MVP)
1) Auth (Client/Medic/Admin)
2) Medic verification (docs + face check flow)
3) Buyurtma yaratish va taqsimlash (5–10 km + rating/ETA)
4) Real-time tracking (WebSocket)
5) To‘lov modeli: client->medic, platforma->10% medicdan
6) Dashboardlar: admin/operator minimal