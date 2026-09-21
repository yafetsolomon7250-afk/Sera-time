# Sera Time — Final v8.0

Ethiopian freelance marketplace Telegram Mini App (Amharic).

## 1. Deploy

1. Upload **this entire folder** to GitHub (replace all old files).
2. Connect to Vercel. Root Directory = empty or `./`
3. Add every variable from `.env.example`
4. Deploy with **build cache OFF**

## 2. Database

Run the full `database.sql` in Supabase SQL Editor once.

Create storage bucket: `sera-time-files` (public or signed).

## 3. Channels (private)

1. Create private Telegram channels for deposit + withdrawal.
2. Add the bot as **admin**.
3. Get channel ID with @userinfobot (looks like `-1001234567890`).
4. Put IDs in `DEPOSIT_CHANNEL` and `WITHDRAWAL_CHANNEL`.

## 4. Webhook

```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://sera-time-zhyo.vercel.app/api/telegram-webhook&secret_token=SeraTimeSetup_2026_9xK7mP4qL8vN2
```

## 5. Verify

| URL | Must show |
|-----|-----------|
| `/api/health` | `"version":"8.0"` |
| Bot `/start` | Welcome + open button |
| Deposit page | Telebirr **0944546457** only, no public channel |
| Invite | `https://t.me/seratimebot/Sera?startapp=ref_...` |

## Business rules (locked in)

- Deposit: **Telebirr only** → **0944546457** + screenshot → private admin channel
- Withdrawal → private channel with Done / Reject
- Post job: 10% fee (worker sees 90%)
- First worker to Accept gets the job
- Miss deadline → ban + job reposted
- Invite: Mini App deep link with `startapp=ref_`
- Full UI language: Amharic

## Admin

Stats · Deposits · Withdrawals · Balance adjust · User search · Ban/Unban · Disputes · Reports · Broadcast
