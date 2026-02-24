# DevOps — Docker (V0.1 MVP)

## Docker Compose (local)
- postgresql
- api-gateway
- auth-service
- order-service
- realtime-service
- medic-service
- feedback-service
- telegram-bot-service
- admin-web (next)
- client-web (next)
- optional: pgadmin

## Env management
- .env per service (NEVER commit secrets)
- claude_token only in analytics-service env

## Networking
- internal docker network
- gateway exposes 80/443 (local 3000)
- services private

## Migrations
- Prisma/TypeORM migrations on startup (dev only)