# Sera Time — Final v5

Amharic-first Ethiopian Telegram Mini App marketplace for real ETB work.

## What is fixed / improved in v5

### Critical fixes
- **Telegram detection** is more reliable (retries + clear step-by-step guide). Opening the Vercel URL directly now shows a beautiful “how to open” screen instead of a dead end.
- **Deadline enforcement** – workers who miss the deadline are automatically banned with the exact reason and the task is re-posted.
- **File upload** fully wired for: client brief, worker submission, deposit screenshot.
- **Deposits & Withdrawals** are posted to your Telegram channels (`@depistseratime` / `@withdrawseratime`) with Approve / Done buttons that work from the channel.
- **Exact ban reason** is shown to the worker.
- **Ethiopian banks list** in the withdrawal form.
- **AdsGram** reward is now properly idempotent (one reward per user per day).
- **Client full reject** → bans the worker + re-opens the task.
- Live **countdown timer** on My Tasks.

### UX
- Clean, readable CSS (no more one giant line).
- Better empty states, skeletons, progress indicators.
- Professional dark theme with smooth micro-interactions.
- All UI text in proper Amharic.

## Quick setup

1. Create a Supabase project and run `database.sql` in the SQL editor.
2. Create a storage bucket named `sera-time-files` (or let the upload route create it).
3. Create a Telegram bot with BotFather and enable Mini App.
4. Deploy this folder to Vercel.
5. Add all environment variables from `.env.example`.
6. Set BotFather Mini App URL = your `APP_URL`.
7. Set webhook:
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/telegram-webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
   ```
8. (Optional but recommended) Set up a cron job every 10 minutes to:
   ```
   GET <APP_URL>/api/cron?secret=<CRON_SECRET>
   ```
   This handles deadline bans and task re-posting.

## Environment variables

See `.env.example`. The most important ones:

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Database |
| `TELEGRAM_BOT_TOKEN` | Bot |
| `TELEGRAM_BOT_USERNAME` | Referral links |
| `APP_URL` | Mini App URL |
| `ADMIN_TELEGRAM_IDS` | Comma-separated admin Telegram IDs |
| `DEPOSIT_CHANNEL` | e.g. `@depistseratime` |
| `WITHDRAWAL_CHANNEL` | e.g. `@withdrawseratime` |
| `CRON_SECRET` | Protects the deadline cron |

## Money flow (summary)

- Client deposits → admin approves (channel or in-app) → balance increases.
- Client posts task → 100% of budget is reserved, 10% becomes platform fee, 90% is worker reward.
- Worker accepts → works → submits (text + files).
- Client can Approve / Request revision (max 2) / Full reject (bans worker + re-opens).
- On approve → worker gets reward, referrer gets 5% of worker reward (from platform fee).
- Withdrawal minimum 1 000 ETB → posted to channel → admin marks Done → user is notified.

## Security notes

- Never trust balances or roles from the browser.
- Telegram `initData` is validated with HMAC on every request.
- Financial mutations use PostgreSQL functions with row locking.
- Duplicate accepts, deposits, withdrawals and ad rewards are guarded.
- Worker ban does **not** disable the client role.

## AdsGram

Reward URL:
```
https://YOUR-APP-DOMAIN/api/ads-reward?secret=YOUR_ADSGRAM_REWARD_SECRET&userid=[userId]
```

## Support

If the app shows “ከTelegram ውስጥ ይክፈቱ”:
1. Open the bot in Telegram
2. Send `/start`
3. Press the green **🚀 Sera Timeን ክፈት** button

Never open the Vercel link directly in a normal browser.
