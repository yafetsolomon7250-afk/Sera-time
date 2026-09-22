# Sera Time Final v9.0

## MUST DO after deploy

### 1. Run SQL fix in Supabase
Open **SUPABASE_V9_FIX.sql** → paste into Supabase SQL Editor → **Run**.

This creates:
- `admin_adjust_balance` (fixes admin balance error)
- `admin_ban_user`
- Short referral support `r_TELEGRAMID`

### 2. Env vars
```
TELEBIRR_NUMBER=0944546457
DEPOSIT_CHANNEL=@your_private_or_public_channel
WITHDRAWAL_CHANNEL=@your_channel
TELEGRAM_BOT_USERNAME=seratimebot
APP_URL=https://YOUR.vercel.app
ADMIN_TELEGRAM_IDS=your_numeric_id
```
Channel is used server-side only — **never shown on the deposit page**.

### 3. Verify
`/api/health` → `"version":"9.0"`

## v9 fixes
| Issue | Fix |
|-------|-----|
| admin_adjust_balance missing | SUPABASE_V9_FIX.sql |
| Long invite link | `t.me/bot/Sera?startapp=r_TELEGRAMID` |
| Skill not own page | Full-screen skill page with back |
| XP TypeScript build error | Fixed |
| Broadcast 0 sent | Better telegram_id filter |
| Deposit shows channel | Removed from UI; Telebirr 0944546457 only |
| CSS | Dark polished theme |

## Invite example
`https://t.me/seratimebot/Sera?startapp=r_123456789`
