# Sera Time — Final Build

Sera Time is an Amharic-first Ethiopian Telegram Mini App marketplace using ETB.

## Final architecture
- Next.js 16 App Router + TypeScript
- One Vercel app
- Supabase PostgreSQL + Storage
- Telegram Mini App authentication
- Telegram bot webhook
- Worker + Client role switching
- Admin role
- Transaction-safe wallet/ledger

## Deploy exactly
1. Import this ZIP into Vercel.
2. Keep the environment variables already entered in Vercel. The important ones are listed in `.env.example`.
3. In Supabase SQL Editor, run the **entire** `database.sql` once.
4. Redeploy Vercel.
5. Test this URL in a browser: `https://YOUR-VERCEL-DOMAIN/api/health`. It must return JSON: `{ "ok": true, "service": "sera-time" }`.
6. In BotFather, set the Main Mini App URL to your HTTPS Vercel URL.
7. Set the Telegram webhook to:
   `https://YOUR-VERCEL-DOMAIN/api/telegram-webhook`
   using Telegram's `setWebhook` API.

Example request (replace values):
`https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=https://YOUR-VERCEL-DOMAIN/api/telegram-webhook`

## Admin
Put the numeric Telegram IDs of the admins in `ADMIN_TELEGRAM_IDS`, separated by commas. When those users open the Mini App, the backend marks them as admins. Never put usernames in this variable.

## AdsGram
- `NEXT_PUBLIC_ADSGRAM_BLOCK_ID` = your Reward ad Block ID.
- Reward: 1 ETB.
- Daily limit: 5.
- The browser never calls the wallet-credit function directly.
- Configure the AdsGram Reward URL to:
  `https://YOUR-VERCEL-DOMAIN/api/ads-reward?userid=[userId]`
AdsGram documents that this endpoint receives the user's Telegram ID after a rewarded view. The endpoint enforces the daily cap and credits the server-side wallet only from the provider callback.

`ADSGRAM_REWARD_SECRET` can remain in Vercel if it is already present, but it is not required by AdsGram's documented Reward URL callback.

## Financial defaults
- Currency: ETB
- Platform fee: 10%
- Worker reward: task budget minus platform fee
- Referral: 5% of successfully completed referred-worker earnings
- Referral reward is funded from the platform fee; completion is rejected if the referral reward would exceed the platform fee.
- Minimum withdrawal: 1,000 ETB
- Withdrawal fee: 0 ETB
- Minimum deposit: configurable, default 100 ETB
- Revision limit: configurable, default 2
- Client escalation: configurable, default 72 hours

## Security
Telegram `initData` is validated on the server. `initDataUnsafe` is not trusted. Financial operations are PostgreSQL transactions and use row locks/constraints to protect against duplicate acceptance, negative balances, duplicate withdrawal processing, and duplicate completion rewards.

## File uploads
The server includes an authenticated upload endpoint with a 25 MB limit and an allowlist of common work-file types. Storage is private and uses signed URLs.

## Important
Do not expose the Supabase service-role key in browser code. Do not put secrets in GitHub. Real-money public launch should be reviewed for applicable Ethiopian payment/regulatory requirements and the exact terms of the payment/advertising providers.
