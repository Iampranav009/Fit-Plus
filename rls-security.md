# FitPlus Row Level Security (RLS) Specification

## 1. Security Model

All application tables exposed through the Supabase API have Row Level Security enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).

```
                              Request
                                 |
                        +--------v--------+
                        |   Is Secret     |
                        |   Service Key?  |
                        +--------+--------+
                                 |
                     +-----------+-----------+
                     |                       |
                  YES|                     NO|
                     v                       v
               Bypass RLS          Evaluate RLS Policies
           (Serverless APIs)                 |
                               +-------------v-------------+
                               |    current_firebase_uid   |
                               |    auth.jwt()->>'sub'     |
                               +-------------+-------------+
                                             |
                  +--------------------------+-------------------------+
                  |                          |                         |
               Client                     Trainer                    Admin
                  |                          |                         |
          Own records only            Own records + linked     Full visibility
                                      clients' records
```

---

## 2. Policy Matrix

| Table | Anonymous / Public | Authenticated Client | Authenticated Trainer | Platform Admin |
|---|---|---|---|---|
| `trainer_profiles` | SELECT (if published) | SELECT (if published) | ALL (own profile) | ALL |
| `coaching_packages` | SELECT (if active) | SELECT (if active) | ALL (own packages) | ALL |
| `client_profiles` | Denied | ALL (own profile) | SELECT + notes (linked clients) | ALL |
| `coaching_relationships` | Denied | SELECT / UPDATE (own) | ALL (linked clients) | ALL |
| `task_assignments` | Denied | SELECT (own) | ALL (assigned clients) | ALL |
| `task_completions` | Denied | ALL (own logs) | SELECT (linked clients) | ALL |
| `chat_conversations` | Denied | ALL (if participant) | ALL (if participant) | ALL |
| `chat_messages` | Denied | SELECT / INSERT (participant) | SELECT / INSERT (participant) | ALL |
| `payment_records` | Denied | SELECT (own) | SELECT (own captured) | ALL |
| `workout_plans` | Denied | SELECT (own) | ALL (linked clients) | ALL |
| `meal_plans` | Denied | SELECT (own) | ALL (linked clients) | ALL |
| `weekly_check_ins` | Denied | ALL (own check-ins) | SELECT + feedback (linked) | ALL |

---

## 3. Storage Security Rules

1. **`public-trainer-assets` & `profile-avatars`**:
   - `SELECT`: Public access.
   - `INSERT / UPDATE`: Authenticated user writing to their own subfolder (`auth.jwt()->>'sub'`).

2. **`progress-photos`**:
   - `ALL`: Owner client (`auth.jwt()->>'sub'`) or active coach linked in `coaching_relationships`.

3. **`coaching-attachments`**:
   - `ALL`: Active conversation participants.

4. **`verification-documents`**:
   - `INSERT`: Trainer uploading proof documents.
   - `SELECT`: Trainer or platform administrators.
