# Logging & Observability — V0.1 MVP

## Majburiy talab
- Har bir API request loglanadi:
  - timestamp, service, route, method, status_code
  - request_id (trace-id), user_id/medic_id (agar bor bo‘lsa)
  - latency_ms
  - request payload: PII masking bilan (telefon/password yashiriladi)
- WebSocket eventlar ham loglanadi (event_name, room, user_id)

## Tavsiya etilgan stack
- Logger: pino (Node) yoki Winston (agar format kerak bo‘lsa)
- NestJS: pino-nestjs
- Log format: JSON (ELK/Loki uchun)
- Correlation: X-Request-Id header (gateway generate qiladi)

## Saqlash
- Dev: local file + console
- Prod (V0.3): Loki/ELK + Grafana dashboards

## API payload logging policy
- password, token, card full data -> NEVER log
- phone -> mask: +998 ** *** ** 12
- address -> partial mask (faqat city/region)