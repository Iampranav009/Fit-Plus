# FitPlus Closed Beta Launch Plan

## 1. Beta Objectives

1. Validate the live coach-client journey with 10–25 trusted Indian personal trainers.
2. Verify Cashfree UPI payment conversions and webhook activations under real Indian mobile network conditions.
3. Collect feedback on Gemini AI plan drafting ergonomics and nutrition diary accuracy.

---

## 2. Beta Coach Onboarding Checklist

When inviting a new trainer to the closed beta:

1. **Step 1: Admin Invitation**: Admin creates an invitation or grants trainer permissions via the `/admin` console.
2. **Step 2: Profile Completion**: Coach completes their bio, specialties, coaching style, and uploaded profile photo at `/onboarding/trainer`.
3. **Step 3: Package Creation**: Coach creates at least one monthly coaching package with clear deliverables and pricing at `/studio/packages`.
4. **Step 4: Client Invitation**: Coach generates a unique cryptographic invite token at `/studio/overview` and shares it via WhatsApp to their first test client.
5. **Step 5: Plan Assignment**: Coach uses the Visual Workout Builder (`/studio/workout-builder`) or Gemini AI Copilot to draft and assign the first 4-week program.
6. **Step 6: Live Feedback**: Client logs workout sets and nutrition entries while coach reviews adherence via Client Pulse (`/studio/clients`).
