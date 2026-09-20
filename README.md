# Sera Time — Final v4

Amharic-first Ethiopian Telegram Mini App marketplace for real ETB work, worker earnings, client jobs, referrals, deposits, withdrawals, AdsGram rewards, notifications and secure admin operations.

## What is included
- Worker + Client role picker and instant role switching.
- Worker: Home, all skills, task search/filter, My Tasks, submission, revision flow, referral, wallet and withdrawal.
- Client: Home, Post Task, My Posts, approval/revision/dispute, deposit and wallet.
- **All skill categories are visible even when they contain zero jobs.** Opening an empty category shows a proper empty state instead of hiding the skill.
- 44+ task/skill categories, including design, video, writing, translation, data, Excel, programming, websites, mobile apps, AI, marketing, research, accounting, architecture, education and more.
- Server-side Telegram Mini App `initData` validation.
- Telegram `/start` webhook with an inline Mini App button. The button opens `APP_URL`, so the app receives Telegram context instead of behaving like a plain website.
- Telegram Web App SDK `?63` and AdsGram SDK loaded in the root layout.
- ETB-only ledger-style wallet flow.
- 10% platform fee; worker receives 90% of a normal task budget.
- 5% referral reward from referred-worker completed earnings, with a database guard that refuses completion if the referral reward would exceed the platform fee.
- Minimum withdrawal 1,000 ETB; Telebirr + Ethiopian bank.
- Minimum deposit 100 ETB.
- AdsGram: 5 rewarded ads/day, 1 ETB each. Client callback only tells the UI the ad finished; the actual credit is performed through the server reward URL protected by `ADSGRAM_REWARD_SECRET` and the database daily cap/idempotency check.
- One active task per worker is enforced in PostgreSQL.
- Notifications and Telegram messages for important task/financial events.
- Admin dashboard for pending deposits and withdrawals.
- File upload API for future task/submission attachments; private Supabase Storage bucket is created automatically on first upload when service-role permissions allow it.
- Responsive Telegram-native dark UI, loading states, empty states, error states, reduced-motion support and mobile safe-area handling.

## Required Vercel environment variables
Add the variables in `.env.example` to **Production, Preview and Development** as appropriate. Never paste your bot token or Supabase service-role key into chat or source control.

### Critical launch settings
`APP_URL` must be the exact current Vercel production URL. Do not leave an old deployment URL here.

The bot webhook must point to:
`APP_URL/api/telegram-webhook`

If `TELEGRAM_WEBHOOK_SECRET` is set, configure the Telegram webhook with the same secret token. The code accepts requests without a secret only when the variable is empty.

## Telegram launch rule
Do **not** open the Vercel URL directly when testing authentication.

Use:
1. Open the Sera Time bot.
2. Send `/start`.
3. Press **🚀 Sera Timeን ክፈት**.

If the app says that Telegram user information is missing, this means the page was launched without valid Mini App context or the bot is still pointing at an old `APP_URL`. The page now shows this exact guidance instead of the old generic error.

Telegram's official Mini App documentation requires the raw `initData` to be validated on the server and warns not to trust `initDataUnsafe`. This build follows that model.

## Supabase
For a new database, run `database.sql` once in the Supabase SQL editor.

For the existing Sera Time database, the same file is designed as a final hardening/seed script after the base objects. It does not intentionally drop user/task/financial data.

The database contains the core marketplace tables, ledger, deposits, withdrawals, referrals, notifications, bans/appeals, audit logs, settings, AdsGram rewards, task/file tables and the PostgreSQL functions used by the app.

## AdsGram reward URL
After creating the rewarded block in AdsGram, configure its Reward URL as:

`https://YOUR-APP-DOMAIN/api/ads-reward?secret=YOUR_ADSGRAM_REWARD_SECRET&userid=[userId]`

Keep the secret only in AdsGram/Vercel configuration. Do not put it in browser code.

AdsGram's documentation says the Reward URL is an HTTPS GET endpoint and replaces `[userId]` with the user's Telegram ID. The app also keeps its own daily limit and event idempotency in PostgreSQL.

## Deployment
1. Push this folder to GitHub.
2. Import it into Vercel.
3. Add environment variables.
4. Deploy.
5. Put the production URL in `APP_URL`.
6. Set the BotFather Mini App/Main Mini App URL to the same production URL.
7. Set the Telegram webhook to `/api/telegram-webhook`.
8. Open the bot, send `/start`, then use the inline button.

## Security / money
- Never trust balances, roles, task ownership or payment status from the browser.
- Telegram identity is validated on the server.
- Financial mutations happen through PostgreSQL functions with row locking.
- Duplicate task acceptance, duplicate approval, duplicate deposit references, repeated AdsGram events and repeated withdrawal requests are guarded.
- Worker bans are not used to disable the client role.
- Real-money operation in Ethiopia should be reviewed for applicable NBE/payment-system authorization before public launch.
