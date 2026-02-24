# PostgreSQL Schema (Normalized) — V0.1 MVP

## Asosiy prinsiplar
- 3NF (normalize)
- Audit: created_at, updated_at, deleted_at (soft delete optional)
- UUID primary keys (yoki bigserial MVP)
- Indexlar: geo, status, created_at

## Tables (MVP)
- users (client)
- medics
- medic_documents (pdf/image metadata)
- medic_verifications (status, moderator_id, notes)
- orders
- order_locations (pickup/address details)
- medic_locations (last known)
- payments_ledger (credit/debit, commission)
- ratings (order_id, user_id, medic_id, score)
- feedbacks (type, message, attachments)
- admin_users (roles)
- blocks (admin blocks user/medic)

## Geo
- MVP: lat/lng numeric + index
- V0.2: PostGIS (recommended)