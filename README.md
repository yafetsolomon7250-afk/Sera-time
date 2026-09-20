# Sera Time

Amharic-first Ethiopian Telegram Mini App marketplace for workers and clients, ETB only.

## Stack
Next.js 16 + TypeScript + React 19 + Supabase PostgreSQL/Storage + Telegram Mini App + Vercel.

## Required environment variables
Copy `.env.example` to Vercel Environment Variables and fill every value. Never commit secrets.

## Deploy
1. Push this folder to GitHub.
2. Import into Vercel.
3. Add the environment variables from `.env.example`.
4. Deploy.
5. Set the Telegram BotFather Mini App URL to `APP_URL`.
6. Set the webhook to `APP_URL/api/telegram-webhook`.

## Database
The live Supabase database used during development was built incrementally. `database.sql` is the canonical reference schema/functions. If starting from a fresh Supabase project, run it in the SQL editor. For the already-created project, do not drop existing production data; use the function definitions in the project to align migrations.

## Important security
- Telegram Mini App initData is verified server-side with the bot token.
- Financial mutations use PostgreSQL functions/row locks.
- One active task per worker is enforced by a partial unique index.
- Admin actions require an admin Telegram ID and server-side admin flag.
- Never expose the Supabase service-role key to the browser.
- Real-money operation in Ethiopia should be reviewed for applicable NBE/payment-system authorization before public launch.

## Product defaults
ETB only; platform fee 10%; referral reward 5% of referred worker completed earnings; minimum withdrawal 1000 ETB; minimum deposit 100 ETB; revision limit 2; AdsGram 5 ads/day at 1 ETB/ad.
