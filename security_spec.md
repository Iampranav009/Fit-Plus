# FitPlus Firestore & Storage Security Specification (Stage 3)

## 1. Data Invariants & Master Gates
1. **Default-Deny Safety Net**: Every unmatched path under `/databases/{database}/documents` and `/b/{bucket}/o` is explicitly denied (`allow read, write: if false;`).
2. **Verified Email Gate**: All standard writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **PII Isolation (Split Collection)**: `/users/{userId}` stores only non-PII preferences, timezone, and role state; email, WhatsApp contact, notification prefs, and private session keys live under `/users/{userId}/private/{docId}` strictly readable/writable by `request.auth.uid == userId`. No public storefront (`trainers`, `packages`, `reviews`) exposes personal emails or home addresses.
4. **Privilege Escalation Prevention (RBAC)**:
   - Users can self-register only as `'client'` or `'trainer'`. Client SDK writes setting `role: 'admin'` on `/users/{userId}` are strictly denied.
   - `/admins/{userId}` is non-writable from client SDKs (`allow write: if false`).
   - `isAdmin()` requires `request.auth.token.email_verified == true` and either membership in `/admins/{uid}` or the verified bootstrap administrator email.
5. **Master Gate Coaching Relationships**:
   - A trainer can `get` a `/clients/{clientId}` document only when `client.activeTrainerUserId == request.auth.uid` AND `/relationships/{activeRelationshipId}` exists with `status == 'active'`, `trainerUserId == request.auth.uid`, and `clientId == clientId`.
   - `ClientGroup` members under `/clientGroups/{groupId}/members/{clientId}` enforce Master Gate sync against the parent `/clientGroups/{groupId}` owner (`trainerUserId == request.auth.uid`).
   - `allow list` queries never execute `get()` or `exists()`; tenant-scoped documents denormalize `clientUserId` and `trainerUserId` and enforce `resource.data.clientUserId == request.auth.uid || resource.data.trainerUserId == request.auth.uid`.
6. **System-Only Entitlements & Verification**:
   - `/payments/{paymentId}`, `/subscriptions/{subscriptionId}`, `/aiGenerations/{genId}`, and `/auditLogs/{logId}` forbid all client SDK writes (`allow create, update, delete: if false`). Only verified server-side Admin SDK endpoints write payment/subscription/AI/audit records.
   - `TrainerProfile.isDemoVerified` is forced `false` on create and immutable on update; `TrainerProfile.verificationStatus` is forced `'unverified'` (or omitted) on create and only modifiable to `'verified'` by `isAdmin()` or server Admin SDK.
   - `/trainerVerificationRequests/{requestId}` can only be created with `status: 'pending'` by the owning trainer and can only be `'approved'` or `'rejected'` by `isAdmin()`.
7. **Temporal Integrity, Terminal Locks & Atomicity**:
   - `createdAt == request.time` on `create`; `updatedAt == request.time` on every `update`; `createdAt`, `id`, and ownership UIDs are immutable.
   - `ConsultationSlot` and `Booking` creation/cancellation/rescheduling require atomic `existsAfter`/`getAfter` consistency.
   - `/consentRecords/{consentId}` is an append-only immutable compliance trail (`allow update, delete: if false`).
8. **Private Progress Photographs (`storage.rules`)**:
   - Files under `/private/clients/{userId}/progress/{fileName}` are strictly private to `request.auth.uid == userId`, readable by a trainer only when object metadata explicitly has `sharedWithTrainer == 'true'` and `authorizedTrainerUid == request.auth.uid`.

---

## 2. The "Dirty Dozen" Adversarial Attack Payloads
Every one of these payloads MUST return `PERMISSION_DENIED`:

1. **Self-Assigned Admin Escalation (`users/{uid}` create/update)**:
   - Payload: `{ "id": uid, "role": "admin", ... }`
   - Defense: `users` create/update strictly enforces `incoming().role in ['client', 'trainer']` for non-admin callers.
2. **Client-Side Payment & Subscription Forgery (`payments/{id}` or `subscriptions/{id}` create)**:
   - Payload: Client writes `{ "status": "captured", "amountInr": 1499 }` or `{ "status": "active" }`.
   - Defense: `allow create, update, delete: if false;` on `/payments`, `/subscriptions`, `/aiGenerations`, `/auditLogs`, and `/admins`.
3. **Trainer Self-Verification Spoofing (`trainers/{id}` create/update)**:
   - Payload: Trainer sets `{ ..., "isDemoVerified": true }` or `{ ..., "verificationStatus": "verified" }`.
   - Defense: Enforces `isDemoVerified == false` and `verificationStatus == 'unverified'` on create, immutable on non-admin update.
4. **Email Spoofing (`email_verified: false`)**:
   - Payload: Unverified email token attempts any Firestore or Storage write.
   - Defense: `isVerifiedUser()` mandates `request.auth != null && request.auth.token.email_verified == true`.
5. **PII Cross-User Read (`users/{victimUid}/private/contact` get)**:
   - Payload: Attacker reads another user's private contact doc.
   - Defense: `isOwner(userId)` strictly blocks non-owners.
6. **Blanket List Query Scraping (`clients`, `bookings`, `payments`, `invites` unscoped list)**:
   - Payload: Attacker executes unscoped `getDocs(collection(db, ...))`.
   - Defense: Every `allow list` validates `resource.data` against `request.auth.uid`.
7. **Unlinked Trainer Hijack (`clients/{clientId}` coachNotes or `/clientGroups/{groupId}/members/{clientId}` write)**:
   - Payload: Attacker trainer modifies `coachNotes` or adds an unlinked client to their group.
   - Defense: Master Gate verifies active `/relationships/{activeRelationshipId}` via `get()`.
8. **Forged Trainer Review (`reviews/{reviewId}` create without relationship)**:
   - Payload: User posts a 5-star review referencing a fabricated `relationshipId`.
   - Defense: `create` verifies `exists(/relationships/$(incoming().relationshipId))` with matching `clientUserId`, `clientId`, and `trainerId`.
9. **State Shortcutting (`bookings/{id}` or `trainerVerificationRequests/{id}` update)**:
   - Payload: Trainer approves their own `trainerVerificationRequests` (`status: 'approved'`) or client reopens a `'canceled'` booking.
   - Defense: Verification approvals require `isAdmin()`; bookings lock terminal states `canceled`/`completed`.
10. **Non-Atomic Slot Double-Book (`consultationSlots/{slotId}` update without booking)**:
    - Payload: Client marks slot `'booked'` without creating `/bookings/{bookingId}` in the same batch.
    - Defense: `existsAfter` / `getAfter` rejects non-atomic writes.
11. **Path ID & Payload Exhaustion Poisoning (`assignments/{2KB_id}` or oversized strings/arrays)**:
    - Payload: Invalid characters in ID, >128 chars ID, >2000 char instructions, or >31 scheduled dates.
    - Defense: `isValidId()` + explicit `.size()` caps on every string and array.
12. **Consent Record Tampering (`consentRecords/{id}` update/delete)**:
    - Payload: User or attacker tries to delete or overwrite historical consent timestamps.
    - Defense: `allow update, delete: if false;` preserves an immutable audit trail.
