# FitPlus Firestore Security Specification

## 1. Data Invariants & Master Gates
1. **Default-Deny Safety Net**: Every unmatched path under `/databases/{database}/documents` is explicitly denied (`allow read, write: if false;`).
2. **Verified Email Gate**: Standard writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **PII Isolation (Split Collection)**: `/users/{userId}` holds only non-PII preferences and role state; email and private session keys live under `/users/{userId}/private/{docId}` (`contact`). Both paths are strictly restricted to `request.auth.uid == userId`. No public collection (`trainers`, `packages`) contains email, phone number, or home address.
4. **Master Gate Relationships**:
   - A trainer can read (`get`) a `/clients/{clientId}` document only if `client.activeTrainerUserId == request.auth.uid` AND the referenced `/relationships/{activeRelationshipId}` document exists with `status == 'active'` and `trainerUserId == request.auth.uid`.
   - `list` queries never invoke `get()` or `exists()`; instead, every tenant-scoped document denormalizes `clientUserId` and `trainerUserId` and enforces `resource.data.clientUserId == request.auth.uid || resource.data.trainerUserId == request.auth.uid`.
   - A client's `coachNotes` field can only be updated by the actively linked trainer (`isLinkedTrainerAction`) and never overwritten by another trainer.
5. **System-Only Fields**: `TrainerProfile.isDemoVerified` is strictly forced to `false` on `create` and immutable (`incoming().isDemoVerified == existing().isDemoVerified`) on `update` so no user can self-verify credentials from the client SDK.
6. **Temporal Integrity & Immutability**: `createdAt` and `updatedAt` must equal `request.time` on `create`; `createdAt`, `id`, and ownership IDs (`userId`, `clientUserId`, `trainerUserId`, `trainerId`, `clientId`) are immutable on `update`, and `updatedAt == request.time` is enforced on every `update`.
7. **Terminal State Locking**:
   - `CoachingRelationship`: once `status == 'ended'`, no further updates are permitted.
   - `Enrollment`: once `status == 'ended'`, no further updates are permitted.
   - `Invite`: once `status != 'active'` (`redeemed`, `revoked`, `expired`), no further updates are permitted.
   - `Booking`: once `status == 'canceled' || status == 'completed'`, no further updates are permitted.
   - `AIPlanDraft`: once `status == 'saved'`, no further updates are permitted.
8. **Atomicity Guarantee (`existsAfter` / `getAfter`)**:
   - Booking a `ConsultationSlot` (`status: 'available' -> 'booked'`) MUST happen in the same atomic batch as creating the matching `/bookings/{bookingId}` (`existsAfter` & `getAfter` verify `clientUserId == request.auth.uid` and `slotId == slotId`).
   - Creating a `/bookings/{bookingId}` MUST atomically lock `/consultationSlots/{slotId}` (`getAfter` verifies `status == 'booked'` and `activeBookingId == bookingId`).

---

## 2. The "Dirty Dozen" Adversarial Attack Payloads
Every one of these 12 payloads MUST return `PERMISSION_DENIED`:

1. **Shadow Update / Ghost Field (`trainers/{trainerId}` create/update)**:
   - Payload: `{ ..., "isDemoVerified": true }` or `{ ..., "shadowAdmin": true }`.
   - Defense: `isValidTrainerProfile()` enforces `keys().hasOnly(...)` and `data.isDemoVerified == false` on create, plus `incoming().isDemoVerified == existing().isDemoVerified` on update.
2. **Email Spoofing (`email_verified: false`)**:
   - Payload: Any write with `{ email: "coach@example.com", email_verified: false }` in token claims.
   - Defense: `isVerifiedUser()` mandates `request.auth != null && request.auth.token.email_verified == true`.
3. **PII Cross-User Read (`users/{victimUid}/private/contact` get)**:
   - Payload: Authenticated attacker attempts `getDoc('/users/victim_uid/private/contact')`.
   - Defense: `isOwner(userId)` strictly blocks non-owners.
4. **Blanket List Query Scraping (`clients` or `bookings` unscoped list)**:
   - Payload: Attacker executes `getDocs(collection(db, 'clients'))` or `getDocs(collection(db, 'bookings'))` without `where('clientUserId', '==', uid)`.
   - Defense: `allow list` explicitly checks `resource.data.userId == request.auth.uid || resource.data.activeTrainerUserId == request.auth.uid`.
5. **Identity Spoofing on Create (`assignments/{id}` or `progressEvents/{id}`)**:
   - Payload: Attacker creates `{ ..., "clientUserId": "victim_uid" }`.
   - Defense: `isValidAssignment()` / `isValidProgressEvent()` checks `clientUserId == request.auth.uid` (or verified linked trainer for assignments).
6. **Unlinked Trainer Hijack (`clients/{clientId}` coachNotes update)**:
   - Payload: Attacker trainer updates `{ "coachNotes": "malicious", "updatedAt": request.time }` on an unlinked client.
   - Defense: Update checks `existing().activeTrainerUserId == request.auth.uid` AND active `/relationships/{activeRelationshipId}` via `get()`.
7. **State Shortcutting / Terminal State Reopen (`bookings/{bookingId}` update)**:
   - Payload: Client updates a `'canceled'` booking back to `{ "status": "booked", "updatedAt": request.time }`.
   - Defense: Terminal state lock `existing().status != 'canceled' && existing().status != 'completed'`.
8. **Resource Poisoning / Path ID Poisoning (`assignments/{2KB_junk_id}` or `1MB string`)**:
   - Payload: Document ID containing `$` or >128 chars, or `instructions` > 2000 chars, or `scheduledDates` > 31 items.
   - Defense: `isValidId()` regex `^[a-zA-Z0-9_\-]+$` + max 128 chars on single-doc ops, plus `.size()` caps on every string and array.
9. **Value Poisoning on Update (`notifications/{id}` update)**:
   - Payload: Recipient updates `{ "read": "yes_string", "updatedAt": request.time }` or modifies `"body"`.
   - Defense: `isValidNotification(incoming())` wraps the entire `allow update` block and rejects non-boolean `read`, while `affectedKeys().hasOnly(['read', 'updatedAt'])` blocks body tampering.
10. **Non-Atomic Slot Double-Book / Orphan Booking (`consultationSlots/{slotId}` update without booking)**:
    - Payload: Client updates `{ "status": "booked", "bookedByUserId": uid, "activeBookingId": "fake_id", "updatedAt": request.time }` without creating `/bookings/fake_id` in the same batch.
    - Defense: `existsAfter(/databases/$(database)/documents/bookings/$(incoming().activeBookingId))` fails when booking doc is absent.
11. **Backdated or Forged Timestamps (`progressEvents/{id}` create)**:
    - Payload: `{ ..., "createdAt": "2020-01-01T00:00:00Z", "updatedAt": "2020-01-01T00:00:00Z" }`.
    - Defense: `incoming().createdAt == request.time && incoming().updatedAt == request.time`.
12. **Orphaned Package / Template Reference (`packages/{id}` create for another trainer)**:
    - Payload: Attacker creates a package with `trainerId: "trn_victim"`, `trainerUserId: attackerUid`.
    - Defense: `get(/databases/$(database)/documents/trainers/$(incoming().trainerId)).data.userId == request.auth.uid` rejects ownership mismatch.
