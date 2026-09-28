-- SERA TIME FINAL DATABASE — PART 5 OF 5
-- Run parts 1, 2, 3, 4, 5 in this order.
-- This part is also included in database-v12.sql.

create or replace function public.create_market_withdrawal(p_user_id uuid,p_amount numeric,p_method text,p_account_number text,p_account_name text)
returns public.withdrawals language plpgsql security definer as $$
declare v public.withdrawals;
begin
 if p_amount<100 then raise exception 'Minimum withdrawal is 100 ETB'; end if;
 update public.wallets set available=available-p_amount,reserved=reserved+p_amount,updated_at=now() where user_id=p_user_id and available>=p_amount;
 if not found then raise exception 'Insufficient balance'; end if;
 insert into public.withdrawals(user_id,amount,method,account_number,account_name) values(p_user_id,p_amount,p_method,p_account_number,p_account_name) returning * into v;
 return v;
end $$;


-- ============================================================
-- SERVER-ONLY DATA API SECURITY
-- The browser uses Supabase Auth only. All Sera Time database access
-- goes through the Next.js server using the server secret/service key.
-- Never put the server secret in NEXT_PUBLIC_* variables.
-- ============================================================

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select, update on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Enable RLS as defense in depth. The server service role bypasses these policies.
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('alter table public.%I enable row level security', r.tablename);
  END LOOP;
END $$;

notify pgrst, 'reload schema';
