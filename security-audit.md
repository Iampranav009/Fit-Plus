# FitPlus Application & Database Security Audit

## 1. Authentication Security

1. **Third-Party Token Authentication**: The frontend obtains verified JWTs from Firebase Authentication. Supabase validates these tokens using Google's public JWKS keys.
2. **PostgreSQL RLS Identity Anchor**: `auth.jwt()->>'sub'` guarantees that user identities cannot be forged from browser code.
3. **Privilege Escalation Protection**:
   - `prevent_role_escalation()` trigger prevents clients from changing `app_users.role` to `trainer` or `admin`.
   - `/api/auth/provision-claims` only provisions the database role `authenticated`; it never accepts privileged role assignments from the client request body.
   - Platform administration requires an entry in `platform_admins` or the verified bootstrap admin email.

---

## 2. Row Level Security Audit

- **Cross-Client Isolation**: Clients cannot query or mutate records where `client_user_id <> current_firebase_uid()`.
- **Cross-Trainer Isolation**: Trainers can access only clients with an active `coaching_relationships` pairing.
- **Private Communication**: Chat messages in `chat_messages` are queryable only by verified participants in `chat_conversations`.
- **Financial Tampering**: `payment_records` and `subscriptions` writes are restricted to serverless API routes (`supabaseAdmin`).

---

## 3. Storage Security

- **Private Buckets**: `progress-photos`, `coaching-attachments`, and `verification-documents` strictly disallow public access.
- **Signed URL Expiration**: Media URLs are generated with short-lived tokens (1 hour default).
- **MIME & Size Enforcement**: Server and client validate file sizes and MIME types before persisting.

---

## 4. API Security

- **Server-Side Validation**: All incoming request payloads are strictly validated using `Zod` schemas.
- **Rate Limiting**: AI plan generation is capped per minute and per day to prevent abuse and manage API costs.
- **Cashfree Signature Verification**: Webhooks verify HMAC-SHA256 signatures using exact raw byte buffers (`req.rawBody`), preventing timing attacks and tampering.
- **Headers & CSP**: `vercel.json` configures strict Content Security Policy, X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`), and Referrer-Policy.
