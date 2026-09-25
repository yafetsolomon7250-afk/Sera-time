-- Sera Time V12 SQL part 5 of 5
create or replace function public.submit_market_task(p_task_id uuid,p_worker_id uuid,p_content text)
returns public.submissions language plpgsql security definer as $$
declare v_task public.tasks; v_sub public.submissions;
begin
 select * into v_task from public.tasks where id=p_task_id for update;
 if v_task.assigned_worker_id<>p_worker_id then raise exception 'Not your assigned job'; end if;
 if v_task.status not in('assigned','revision_requested') then raise exception 'This job cannot be submitted now'; end if;
 insert into public.submissions(task_id,worker_id,content) values(p_task_id,p_worker_id,p_content) on conflict(task_id) do update set content=excluded.content,updated_at=now() returning * into v_sub;
 update public.tasks set status='submitted',submitted_at=now(),updated_at=now() where id=p_task_id;
 return v_sub;
end $$;

create or replace function public.review_market_submission(p_task_id uuid,p_client_id uuid,p_decision text,p_reason text)
returns public.tasks language plpgsql security definer as $$
declare v_task public.tasks; v_round integer; v_fee numeric;
begin
 select * into v_task from public.tasks where id=p_task_id for update;
 if v_task.client_id<>p_client_id then raise exception 'Not your job'; end if;
 if v_task.status<>'submitted' then raise exception 'Job is not waiting for review'; end if;
 if p_decision='accept' then
   update public.wallets set reserved=greatest(0,reserved-v_task.budget),updated_at=now() where user_id=v_task.client_id;
   update public.wallets set available=available+v_task.worker_reward,lifetime_earned=lifetime_earned+v_task.worker_reward,updated_at=now() where user_id=v_task.assigned_worker_id;
   insert into public.ledger_entries(user_id,task_id,type,amount,description) values(v_task.assigned_worker_id,v_task.id,'task_earning',v_task.worker_reward,'Task completed and approved');
   update public.tasks set status='completed',completed_at=now(),updated_at=now() where id=p_task_id returning * into v_task;
   return v_task;
 end if;
 if p_decision<>'complain' then raise exception 'Invalid review decision'; end if;
 if trim(coalesce(p_reason,''))='' then raise exception 'Complaint description is required'; end if;
 select count(*)+1 into v_round from public.complaints where task_id=p_task_id;
 if v_round>2 then raise exception 'The client has reached the 2-complaint limit'; end if;
 insert into public.complaints(task_id,client_id,worker_id,round,description) values(p_task_id,p_client_id,v_task.assigned_worker_id,v_round,p_reason);
 update public.tasks set status='revision_requested',revision_count=v_round,updated_at=now() where id=p_task_id returning * into v_task;
 return v_task;
end $$;

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
