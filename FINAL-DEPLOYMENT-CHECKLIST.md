# Sera Time Final Deployment Checklist

## 1. Supabase
Use **only** `database-v12.sql` from this final package, or run `database-v12-parts/part-1.sql` through `part-5.sql` in order.

Do not mix it with the old V11/V12 database files.

The final SQL:
- keeps ETB wallet accounting;
- keeps exactly 2 worker skills;
- keeps the 10-applicant selection flow;
- enforces one active assigned job per worker;
- keeps the 2-complaint limit;
- adds deposit approval/rejection;
- adds withdrawal paid/rejected handling;
- removes direct browser database table access;
- enables RLS as defense in depth.

## 2. Vercel Production variables
Set these on the **Production** environment:

`NEXT_PUBLIC_SUPABASE_URL`

`NEXT_PUBLIC_SUPABASE_ANON_KEY`

`SUPABASE_SERVICE_ROLE_KEY`

`NEXT_PUBLIC_APP_URL=https://sera-time-zhyo.vercel.app`

The final server code also accepts `SUPABASE_SECRET_KEY` instead of the legacy service-role variable.

Never put the service/secret key in a `NEXT_PUBLIC_*` variable.

## 3. Redeploy
After saving the Vercel variables, create a new Production deployment. Do not rely on an old deployment that was built before the environment variables were fixed.

## 4. First test
Open the production URL in a private/incognito browser and verify:

1. Language screen appears first.
2. Welcome image appears.
3. Worker/Client selection appears.
4. About page appears.
5. Login/Sign up appears.
6. Sign up creates a Sera Time Auth account.
7. Worker setup requires exactly 2 skills, a profile photo and a selfie.
8. Client wallet can submit a deposit request.
9. Admin can approve the deposit.
10. Client can post a job.
11. Worker sees only matching skills.
12. Ten applications move the job to selection.
13. Client can select one applicant.
14. Worker can submit work.
15. Client can Accept or request changes.
16. The third complaint is rejected by the server.
17. Accepted work credits the worker's ETB wallet.
18. Withdrawal requests appear in Admin and can be marked paid/rejected.
19. Notifications appear after important actions.

## 5. Android
From the project root:

```bash
npm install
npx cap add android
npx cap sync android
npx cap open android
```

Follow `mobile/README.md` to register `SecureScreenPlugin` and build the signed `.aab`.


## Admin account
- The production admin email is `yafet.tech0990@gmail.com`.
- The server automatically marks that exact authenticated email as `is_admin=true` when the account first logs in (or on a later login if the profile already exists).
- The admin still must authenticate with its normal Supabase email/password; the email alone is not a login credential.
