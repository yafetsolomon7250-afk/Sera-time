# Sera Time — Vercel-ready final foundation

## Included
- Telegram Mini App authentication with server-side initData validation.
- Worker/client role switching.
- Worker one-active-task rule.
- Atomic task acceptance.
- Client task posting with ETB reservation.
- Wallet + ledger foundation.
- Withdrawal minimum and atomic reservation.
- PostgreSQL/Supabase schema for tasks, files, submissions, revisions, disputes, deposits, withdrawals, referrals, bans, appeals, notifications, admin/audit logs and AdsGram rewards.
- AdsGram rewarded-ad flow: **maximum 5 rewarded ads per user per day, 1 ETB per completed rewarded ad**.
- AdsGram Reward URL server endpoint with atomic daily-limit enforcement.
- Configurable settings through Vercel Environment Variables.

## Vercel
Import the ZIP/project into Vercel. You do not need Node.js installed locally; Vercel installs dependencies and runs the build.

## Supabase
Run `database.sql` once in Supabase SQL Editor.

## AdsGram
Use the public block ID in `NEXT_PUBLIC_ADSGRAM_BLOCK_ID`.
Set the AdsGram Reward URL to:
`https://YOUR-VERCEL-DOMAIN/api/ads/reward?userid=[userId]`

AdsGram's current documentation says rewarded ads should reward the user after the ad is watched to the end, and its Reward URL can provide server confirmation. The app therefore does not credit ETB from an arbitrary browser button; the server reward endpoint performs the credit and enforces the 5/day limit.

## Important
This is the compact deployable foundation, not a claim that every future marketplace/admin/payment/storage screen is already finished. The database and configuration are designed for those features to be added without replacing the core architecture.

Before public real-money launch, complete payment-provider integration, file storage, admin screens, moderation, fraud controls, notification delivery, automated tests and Ethiopian regulatory/compliance review.
