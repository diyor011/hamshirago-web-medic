# Security — V0.1 MVP

## HTTP
- helmet enabled (CSP minimal)
- cors: allowlist domains (web apps)
- validation: DTO + class-validator (Nest)
- rate limit: auth endpoints strict
- password hashing: argon2 (yoki bcrypt)

## WebSocket
- JWT auth handshake
- per-room access control
- message schema validation
- disconnect/reconnect strategy

## Admin block
- admin can block user/medic (auth-service check)
- blocked bo‘lsa: login denied yoki order denied