-- SERA TIME FINAL DATABASE — PART 4 OF 5
-- Run parts 1, 2, 3, 4, 5 in this order.
-- This part is also included in database-v12.sql.

create or replace function public.admin_deposit(p_admin_id uuid,p_deposit_id uuid,p_status text,p_reason text default '')
returns public.deposits language plpgsql security definer as $$
declare v public.deposits;
begin
 if not exists(select 1 from public.profiles where id=p_admin_id and is_admin=true) then raise exception 'Admin access required'; end if;
 select * into v from public.deposits where id=p_deposit_id for update;
 if not found or v.status<>'pending' then raise exception 'Deposit is not pending'; end if;
 if p_status='approved' then
   update public.deposits set status='approved' where id=v.id returning * into v;
   update public.wallets set available=available+v.amount,updated_at=now() where user_id=v.user_id;
   insert into public.ledger_entries(user_id,type,amount,description,reference_id) values(v.user_id,'deposit',v.amount,'Deposit approved by admin',v.id::text);
   insert into public.notifications(user_id,title,body,type) values(v.user_id,'Deposit approved','Your ETB deposit was approved and added to your wallet.','deposit_approved');
 elsif p_status='rejected' then
   update public.deposits set status='rejected' where id=v.id returning * into v;
   insert into public.notifications(user_id,title,body,type) values(v.user_id,'Deposit rejected',coalesce(nullif(p_reason,''),'Your deposit was rejected.'),'deposit_rejected');
 else raise exception 'Invalid deposit status'; end if;
 return v;
end $$;

create or replace function public.admin_withdrawal(p_admin_id uuid,p_withdrawal_id uuid,p_status text,p_reason text default '')
returns public.withdrawals language plpgsql security definer as $$
declare v public.withdrawals;
begin
 if not exists(select 1 from public.profiles where id=p_admin_id and is_admin=true) then raise exception 'Admin access required'; end if;
 select * into v from public.withdrawals where id=p_withdrawal_id for update;
 if not found or v.status<>'pending' then raise exception 'Withdrawal is not pending'; end if;
 if p_status='paid' then
   update public.withdrawals set status='paid',processed_at=now() where id=v.id returning * into v;
   update public.wallets set reserved=greatest(0,reserved-v.amount),updated_at=now() where user_id=v.user_id;
   insert into public.ledger_entries(user_id,type,amount,description,reference_id) values(v.user_id,'withdrawal_paid',-v.amount,'Withdrawal paid',v.id::text);
   insert into public.notifications(user_id,title,body,type) values(v.user_id,'Withdrawal paid','Your ETB withdrawal was marked as paid.','withdrawal_paid');
 elsif p_status='rejected' then
   update public.withdrawals set status='rejected',rejection_reason=coalesce(nullif(p_reason,''),'Withdrawal rejected'),processed_at=now() where id=v.id returning * into v;
   update public.wallets set reserved=greatest(0,reserved-v.amount),available=available+v.amount,updated_at=now() where user_id=v.user_id;
   insert into public.ledger_entries(user_id,type,amount,description,reference_id) values(v.user_id,'withdrawal_refund',v.amount,'Rejected withdrawal refunded',v.id::text);
   insert into public.notifications(user_id,title,body,type) values(v.user_id,'Withdrawal rejected',v.rejection_reason,'withdrawal_rejected');
 else raise exception 'Invalid withdrawal status'; end if;
 return v;
end $$;
