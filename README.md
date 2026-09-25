# Sera Time App V12 — Android-first

Sera Time is now designed as a standalone application. Telegram is no longer required for login or identity.

## Product flow
1. Welcome image
2. Language: Amharic or English
3. About / how Sera Time works
4. Sign up or log in with Sera Time email + password
5. Choose Worker or Client
6. Worker setup: exactly 2 skills, years per skill, full name, profile photo, selfie verification status, portfolio URL and professional description
7. Worker sees only jobs matching those 2 skills
8. A job accepts up to 10 pending worker applications
9. When it reaches 10, the job enters selection and the client sees applicants' profiles/skills/experience/portfolio
10. Client selects one worker; other applicants receive rejection notifications
11. Selected worker gets the job; their other pending applications are closed
12. Worker sees the full client brief and uploaded reference media
13. Worker submits files and notes
14. Client gets exactly two actions: Accept or Complain/Request changes
15. A client can request changes at most 2 times; the server rejects a third complaint
16. Accept releases the worker reward to the ETB wallet
17. Every important action creates an in-app notification
18. Android protected submission preview uses FLAG_SECURE while open

## Important security decision
Do not collect or store a password for a third-party portfolio account. Sera Time only stores the user's Sera Time login password through Supabase Auth. Portfolio access is represented by a URL/email, not another site's password.

## Environment variables
Copy `.env.example` to `.env.local` for local development and add the same values to Vercel:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_APP_URL

## Supabase setup
Run `database-v12.sql`. If the SQL editor is slow, use the five files in `database-v12-parts/` in order.
Enable Email provider under Supabase Authentication. For first development testing you may disable email confirmation; for production, keep email confirmation enabled and configure your SMTP provider.

## Local web development
```bash
npm install
npm run dev
```

## Vercel
Deploy the repository as a Next.js project. Add the four environment variables above. The server API routes run on Vercel.

## Android / Play Store
See `mobile/README.md`. Android Studio is required to create the signed `.aab` package. The included Capacitor configuration and secure-screen plugin are prepared for the Android wrapper.

## Ads
The requested 320x50 HighRevenue banner is included at the top of the signed-in app. Replace/remove it later if your monetization or Play policy requirements change.

## Face verification
The onboarding captures a profile photo and a selfie and stores a `pending` verification status. This source package intentionally does not claim that a basic camera upload proves that the photo is a real human or the account owner. Production identity verification should be connected to a proper KYC/liveness provider or an admin review workflow.
