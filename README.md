# Sera Time Final v11.0 — Premium Upgrade

## Critical fixes and upgrades in v11
- Admin ID **5980396006** hardcoded (plus env list)
- Deposit/Withdraw channel buttons work without SQL RPC
- Attractive /start welcome + buttons
- Referral deep-link: `https://t.me/bot?start=r_TELEGRAMID` → bot opens the Mini App with the referral token
- API via stable `/api/sera` (Pages Router)
- Telebirr only **0944546457**

## Deploy
1. Upload **entire** folder to GitHub (do not delete page.tsx)
2. Vercel env vars (see .env.example)
3. Redeploy cache OFF
4. Webhook:
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://YOUR.vercel.app/api/telegram-webhook&secret_token=SeraTimeSetup_2026_9xK7mP4qL8vN2
```
5. `/api/health` must show `"version":"11.0"`

## Env must have
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=seratimebot
APP_URL=https://sera-time-zhyo.vercel.app
ADMIN_TELEGRAM_IDS=5980396006
TELEGRAM_WEBHOOK_SECRET=SeraTimeSetup_2026_9xK7mP4qL8vN2
TELEBIRR_NUMBER=0944546457
DEPOSIT_CHANNEL=-100...
WITHDRAWAL_CHANNEL=-100...
```
Optional: `WELCOME_IMAGE_URL=https://...jpg` for start photo

## Never delete
app/page.tsx, package.json, lib/server.ts, pages/api/sera.ts

## v11 upgrade checklist
- Ads/AdsGram removed from the Mini App, API, environment example, and database schema.
- Referral deep links now use Telegram `/start r_TELEGRAM_ID`; the bot forwards the referral token into the Mini App.
- Referral lists now read from `referrals` instead of the non-existent `users.referred_by` field.
- Worker My Task now loads the full original client brief, requirements, client name, deadline, budget, payout, revision data, and task files.
- Added a dedicated Profile page.
- Added premium glass/3D mobile UI and 10 quick tools per product page (12 role/page views = 120 tools).
- Updated start/welcome message with clearer Sera Time onboarding.

## Database
Run the full `database.sql` once in Supabase SQL Editor. The end of the file also removes the retired advertising table/function from an existing v10 database.

## Verification
- `/api/health` should return version `11.0`.
- Run `npm run typecheck` and `npm run build` after dependencies are installed.
