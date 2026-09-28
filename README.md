# Sera Time — Final Standalone App

Sera Time is a standalone Ethiopia-focused digital work marketplace. It does **not** require Telegram.

## Final first-run flow
1. Choose **Amharic or English**.
2. Welcome screen with Sera Time image.
3. Choose **Worker** or **Client**.
4. Read the About / How it works page.
5. Sign up or log in with a Sera Time email + password.
6. Worker accounts continue to the worker profile setup; client accounts continue to the app.

## Worker requirements
- Exactly **2 skills** are required.
- Years of experience are stored for each selected skill.
- Full name and professional description.
- Profile photo.
- Identity selfie stored privately for admin review.
- Portfolio URL is optional.
- Sera Time never asks for a password belonging to another website or portfolio service.
- Worker can edit the profile later and submit a new selfie for review.

## Job marketplace
- Workers see jobs matching their two selected skills.
- A job accepts a maximum of **10 applications**.
- At 10 applicants the job moves to **selection**.
- The client can review worker name, photo, bio, two skills, experience and portfolio.
- Client selects one worker.
- Other applicants are notified that they were not selected.
- The selected worker's other pending applications are closed and the worker is notified.
- A worker cannot have more than **one active assigned job** at a time; this is enforced by the database.
- The selected worker receives the complete client brief and reference files/videos.
- Worker submits notes/files.
- Client has exactly two review actions: **Accept** or **Complain / Request changes**.
- A client can request changes a maximum of **2 times**.
- Acceptance releases the worker reward into the ETB wallet.
- Important actions create in-app notifications.

## Money
- Currency is **ETB / Ethiopian Birr**.
- Client can submit a deposit request from the Wallet page; an admin approves/rejects it.
- Posting a job reserves the client's budget.
- Worker reward is released after client approval.
- Worker can submit a withdrawal request.
- Admin can mark withdrawals paid or reject them; rejected amounts are returned to the available wallet balance.

## Ads and referrals
- **No ad system is included.**
- **No referral/invite system is included.**

## Security architecture
The browser uses Supabase Auth for login/session handling. Sera Time database operations run through Next.js API routes using a **server-only Supabase secret/service key**. Never expose that key in a `NEXT_PUBLIC_*` variable or in the Android app. Supabase's documentation explicitly says secret/service-role keys must remain server-side. urlSupabase security guidancehttps://supabase.com/docs/guides/database/secure-data

The final SQL also revokes direct `anon`/`authenticated` table access and enables RLS as defense in depth. The server role is granted the database access required by the API.

## Environment variables
Set these in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — browser-safe legacy anon/publishable key
- `SUPABASE_SERVICE_ROLE_KEY` — server-only legacy service-role key
- `NEXT_PUBLIC_APP_URL`

The server also accepts `SUPABASE_SECRET_KEY` if you migrate to Supabase's newer secret-key format.

**Never send a secret/service key in chat.**

## Supabase
Run `database-v12.sql` once in the Supabase SQL Editor.

For easier pasting, `database-v12-parts/part-1.sql` through `part-5.sql` contain the same final database setup in safe sequential sections. Run them in order.

Enable the Supabase Email provider. For development you can disable email confirmation temporarily; for production, configure email confirmation and SMTP correctly.

## Vercel
Deploy this folder as a Next.js project and add the environment variables above to the correct Production environment. After changing environment variables, redeploy the Production deployment.

## Android
See `mobile/README.md`.

The Android wrapper uses Capacitor and includes a native `FLAG_SECURE` plugin. The protected submission preview enables it while sensitive work files are displayed. It cannot prevent an external camera or another device from recording the screen.

## Play Store
Build a signed Android App Bundle (`.aab`) in Android Studio, complete the Play Console privacy/data-safety forms, store listing, screenshots and testing track, then submit for review.


## Admin account
- The production admin email is `yafet.tech0990@gmail.com`.
- The server automatically marks that exact authenticated email as `is_admin=true` when the account first logs in (or on a later login if the profile already exists).
- The admin still must authenticate with its normal Supabase email/password; the email alone is not a login credential.
