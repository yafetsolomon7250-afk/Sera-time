# Sera Time Final v7

Production Ethiopian freelance Telegram Mini App (Amharic).

## Deploy checklist

1. Push this folder to GitHub → Vercel
2. Run full `database.sql` in Supabase (includes v7 extras)
3. Set all env vars from `.env.example`
4. `DEPOSIT_CHANNEL` / `WITHDRAWAL_CHANNEL` = private channel IDs (`-100...`)
5. Bot must be **admin** of those channels
6. Set webhook:
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/telegram-webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
```
7. Test `https://YOUR.app/api/health` → JSON
8. Send `/start` in bot

## User features (20+)

1. Worker / Client role switch  
2. All skill categories always visible  
3. Task search + filter by skill  
4. Accept job (first worker wins)  
5. My Tasks with live countdown  
6. Submit text + files  
7. Revision loop (limit 2)  
8. Client approve / revise / full reject+ban  
9. Wallet in ETB  
10. Withdrawal (Ethiopian banks + Telebirr), min 1000  
11. Deposit Telebirr-only to 0944546457 + screenshot  
12. Invite deep link `t.me/seratimebot/Sera?startapp=ref_`  
13. 5% referral on completed jobs  
14. AdsGram daily rewards  
15. Notifications center  
16. Exact ban reason shown  
17. XP / Level on approve  
18. Worker ratings (1–5)  
19. Report user/task  
20. Profile stats  
21. Leaderboard data API  
22. Platform fee 10% transparent  

## Admin features (20+)

1. Dashboard stats  
2. Pending withdrawals approve/reject  
3. Pending deposits approve/reject + screenshot link  
4. Channel Done/Approve buttons  
5. Balance adjust (+/-) with note  
6. User search (TG id / name / username)  
7. Ban / unban with reason  
8. Recent users list  
9. Open disputes resolve  
10. Reports close  
11. Broadcast message to users  
12. User wallet inspection API  
13. Audit-friendly ledger  
14. Platform open/completed task counts  
15. Admin-only access gate  
16. Channel private (not shown to users)  
17. Deposit forced Telebirr  
18. Withdrawal multi-bank  
19. Cron deadline ban + repost  
20. Ads reward idempotent daily  

## Invite format

```
https://t.me/seratimebot/Sera?startapp=ref_<USER_UUID>
```

Opens Mini App directly and attributes referral.
