# Sera Time Final Deployment Checklist

## Vercel
1. Import/push this project to the Sera Time repository.
2. Set `NEXT_PUBLIC_SUPABASE_URL` to the existing Sera Time Supabase project URL.
3. Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the publishable/anon key.
4. Set `SUPABASE_SECRET_KEY` to the server-only `sb_secret_...` key for the same Supabase project. If the project only exposes the legacy credential, use `SUPABASE_SERVICE_ROLE_KEY` instead.
5. Never prefix the server key with `NEXT_PUBLIC_`.
6. Redeploy.

## Existing Supabase database
The live Sera Time database has already been repaired with the required service-role table grants. Do not remove those grants.

For a fresh Sera Time database, the grants are included at the end of `database-v12.sql` and also in `database-permissions-final.sql`.

## Verification
Run this read-only check in Supabase SQL Editor:

```sql
select
  has_table_privilege('service_role','public.profiles','SELECT') as can_select,
  has_table_privilege('service_role','public.profiles','INSERT') as can_insert,
  has_table_privilege('service_role','public.profiles','UPDATE') as can_update,
  has_table_privilege('service_role','public.profiles','DELETE') as can_delete;
```

Expected result: all four values are `true`.

## Important
Do not paste the server secret into chat, GitHub, `page.tsx`, `supabase-browser.ts`, or the Android bundle.
