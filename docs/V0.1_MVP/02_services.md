# Services Spec — V0.1 MVP

## api-gateway
- Client/Medic/Web/Admin uchun yagona kirish
- Auth middleware, rate-limit, request-id inject
- CORS, Helmet, compression

## order-service
- Order create
- Dispatch algorithm (distance + rating + ETA)
- Order state: CREATED -> ASSIGNED -> ACCEPTED -> ON_THE_WAY -> ARRIVED -> DONE / CANCELED
- Cancel policy

## realtime-service
- Client tracking: medic location updates
- Medic tracking: order updates
- WS auth (JWT) + room strategy

## medic-service
- Medic registration
- Verification workflow (docs uploaded + status)
- Availability online/offline
- Balance check before assigning orders

## telegram-bot-service
- Medic: online/offline toggle, new order alert, accept/decline
- Client: order status, feedback yuborish
- Admin/operator: feedback notifications