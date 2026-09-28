# Sera Time — Final Standalone App

## Final product identity
- Permanent standalone Sera Time marketplace.
- No Telegram dependency.
- No ads, AdsGram, referral, or invite system.
- ETB-only marketplace.
- One account can switch between Worker and Client.
- English and Amharic language-first onboarding.
- Premium mobile-first 3D/glass UI.

## First-run flow
1. Language selection — English / Amharic.
2. Welcome screen with Sera Time image.
3. Worker / Client choice.
4. About / How it works.
5. Login / Sign up.

## Worker
- Exactly 2 skills.
- Years of experience for both skills.
- Full name, professional description, profile photo.
- Private identity selfie for admin review.
- Optional portfolio URL.
- Profile editing and selfie resubmission.
- Worker identity must be verified before applying.
- Matching jobs only.
- Maximum 5 pending applications.
- Maximum 1 active assigned job.
- Full client brief and reference files.
- Deadline countdown.
- Submission notes/files.
- ETB wallet and withdrawal requests.

## Client
- Deposit request and admin approval.
- Job posting with skill, title, description, requirements, budget, deadline, and reference files.
- Job budget is reserved when posted.
- Maximum 10 applicants per job.
- Selection screen shows applicant photo, profile, skills, experience, and portfolio.
- Select one applicant after the job reaches 10 applicants.
- Other applicants are rejected and notified.
- Selected worker's other pending applications are closed and notified.
- Review submitted work with exactly two choices: Accept or Complain / Request changes.
- Maximum two complaint/revision rounds.
- Acceptance releases the worker reward.

## Wallet / Admin
- ETB only.
- Available and reserved balances.
- Lifetime earned/spent.
- Ledger activity.
- Deposit approval/rejection.
- Withdrawal paid/rejected; rejection returns reserved amount.
- Worker identity verification.
- Admin dashboard.
- Important activities create in-app notifications.

## Security / deployment
- Browser uses only publishable Supabase credentials.
- Privileged database access is server-only through `lib/server.ts`.
- Service-role/secret credentials are never exposed to the browser.
- `database-permissions-final.sql` contains the permanent server grants.
- Private work files are delivered through authenticated signed URLs.
- Android protected preview uses `FLAG_SECURE` through the included native plugin source.
- The app cannot guarantee prevention of recording by another physical device.
