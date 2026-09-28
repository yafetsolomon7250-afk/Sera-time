# Sera Time Final — 2026-09-27

This package is the consolidated standalone Sera Time application package based on V12, updated with the latest agreed requirements and the database-permission architecture fix.

Major final changes:
- standalone app; Telegram removed;
- Amharic/English first-run language selection;
- welcome image;
- Worker/Client choice before About + authentication;
- exactly 2 worker skills;
- profile photo + private selfie verification;
- editable Profile page;
- skill-matched jobs;
- maximum 10 applicants per job;
- client applicant selection;
- one active assigned job per worker enforced in SQL;
- full client brief/reference files for selected worker;
- worker submission;
- Accept or Complain/Request changes;
- maximum 2 complaints;
- ETB wallet/deposits/withdrawals;
- admin deposit and withdrawal processing;
- in-app notifications;
- Android FLAG_SECURE bridge;
- no ads;
- no referral/invite system;
- server-only Supabase database access to avoid exposing elevated keys or depending on browser table grants.


## Admin account
- The production admin email is `yafet.tech0990@gmail.com`.
- The server automatically marks that exact authenticated email as `is_admin=true` when the account first logs in (or on a later login if the profile already exists).
- The admin still must authenticate with its normal Supabase email/password; the email alone is not a login credential.
