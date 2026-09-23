# Sera Time Final v10.0

## Critical fixes in v10
- Admin ID **5980396006** hardcoded (plus env list)
- Deposit/Withdraw channel buttons work without SQL RPC
- Ads credit via `claim-ad` API
- Attractive /start welcome + buttons
- Short referral: `t.me/bot/Sera?startapp=r_TELEGRAMID`
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
5. `/api/health` must show `"version":"10.0"`

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
Optional: `NEXT_PUBLIC_ADSGRAM_BLOCK_ID=`

## Never delete
app/page.tsx, package.json, lib/server.ts, pages/api/sera.ts
