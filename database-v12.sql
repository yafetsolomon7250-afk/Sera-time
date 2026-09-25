-- Sera Time App V12 - run in Supabase SQL Editor.
-- This version removes Telegram as an identity requirement and uses Supabase Auth email/password.
-- It keeps ETB wallet accounting, adds the 10-applicant selection flow, worker profiles, and 2-complaint limit.

create extension if not exists pgcrypto;

create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null default '',
 full_name text not null default '',
 language text not null default 'am' check(language in ('am','en')),
 active_role text not null default 'worker' check(active_role in ('worker','client')),
 bio text not null default '',
 portfolio_url text not null default '',
 avatar_url text not null default '',
 selfie_url text not null default '',
 selfie_path text not null default '',
 face_verification_status text not null default 'pending' check(face_verification_status in ('pending','verified','rejected')),
 worker_onboarded boolean not null default false,
 is_admin boolean not null default false,
 banned boolean not null default false,
 ban_reason text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.worker_skills(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 skill_key text not null,
 years_experience numeric(4,1) not null default 0 check(years_experience>=0 and years_experience<=60),
 unique(user_id,skill_key)
);

create table if not exists public.wallets(
 user_id uuid primary key references public.profiles(id) on delete cascade,
 available numeric(14,2) not null default 0,
 reserved numeric(14,2) not null default 0,
 lifetime_earned numeric(14,2) not null default 0,
 lifetime_spent numeric(14,2) not null default 0,
 updated_at timestamptz not null default now()
);

create table if not exists public.tasks(
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.profiles(id),
 category text not null,
 title text not null,
 description text not null,
 requirements text not null default '',
 budget numeric(14,2) not null check(budget>0),
 platform_fee numeric(14,2) not null default 0,
 worker_reward numeric(14,2) not null,
 deadline_at timestamptz not null,
 status text not null default 'open' check(status in ('open','selection','assigned','submitted','revision_requested','disputed','completed','cancelled','expired')),
 applicant_count integer not null default 0,
 assigned_worker_id uuid references public.profiles(id),
 assigned_at timestamptz,
 submitted_at timestamptz,
 completed_at timestamptz,
 revision_count integer not null default 0,
 revision_limit integer not null default 2,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.task_applications(
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references public.tasks(id) on delete cascade,
 worker_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','selected','rejected','cancelled')),
 applied_at timestamptz not null default now(),
 decided_at timestamptz,
 unique(task_id,worker_id)
);

create table if not exists public.task_files(
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references public.tasks(id) on delete cascade,
 file_path text not null,
 file_url text,
 file_name text,
 mime_type text,
 size_bytes bigint,
 created_at timestamptz not null default now()
);

create table if not exists public.submissions(
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null unique references public.tasks(id) on delete cascade,
 worker_id uuid not null references public.profiles(id),
 content text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.submission_files(
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null references public.submissions(id) on delete cascade,
 file_path text not null,
 file_url text,
 file_name text,
 mime_type text,
 size_bytes bigint
);

create table if not exists public.complaints(
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references public.tasks(id) on delete cascade,
 client_id uuid not null references public.profiles(id),
 worker_id uuid not null references public.profiles(id),
 round integer not null check(round between 1 and 2),
 description text not null,
 created_at timestamptz not null default now()
);

create table if not exists public.ledger_entries(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 task_id uuid references public.tasks(id),
 type text not null,
 amount numeric(14,2) not null,
 description text not null default '',
 reference_id text,
 created_at timestamptz not null default now()
);

create table if not exists public.deposits(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id),
 amount numeric(14,2) not null,
 method text not null,
 reference text,
 proof_url text,
 status text not null default 'pending',
 created_at timestamptz not null default now()
);

create table if not exists public.withdrawals(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id),
 amount numeric(14,2) not null,
 fee numeric(14,2) not null default 0,
 method text not null,
 account_number text not null,
 account_name text not null,
 status text not null default 'pending',
 rejection_reason text,
 created_at timestamptz not null default now(),
 processed_at timestamptz
);

create table if not exists public.notifications(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 title text not null,
 body text not null,
 type text not null default 'system',
 read_at timestamptz,
 created_at timestamptz not null default now()
);

create index if not exists idx_task_category_status on public.tasks(category,status);
create index if not exists idx_task_app_worker_status on public.task_applications(worker_id,status);
create index if not exists idx_task_app_task on public.task_applications(task_id,status);
create index if not exists idx_notifications_user on public.notifications(user_id,created_at desc);

insert into storage.buckets(id,name,public) values('sera-files','sera-files',false) on conflict(id) do nothing;
insert into storage.buckets(id,name,public) values('sera-public','sera-public',true) on conflict(id) do nothing;

create or replace function public.create_market_task(p_client_id uuid,p_category text,p_title text,p_description text,p_requirements text,p_budget numeric,p_deadline_at timestamptz)
returns public.tasks language plpgsql security definer as $$
declare v_fee numeric; v_reward numeric; v_task public.tasks;
begin
 if not exists(select 1 from public.profiles where id=p_client_id and banned=false) then raise exception 'Client account is not available'; end if;
 if p_budget<=0 then raise exception 'Invalid budget'; end if;
 if p_deadline_at<=now() then raise exception 'Deadline must be in the future'; end if;
 v_fee:=round(p_budget*0.10,2); v_reward:=round(p_budget-v_fee,2);
 update public.wallets set available=available-p_budget,reserved=reserved+p_budget,lifetime_spent=lifetime_spent+p_budget,updated_at=now() where user_id=p_client_id and available>=p_budget;
 if not found then raise exception 'Insufficient balance'; end if;
 insert into public.tasks(client_id,category,title,description,requirements,budget,platform_fee,worker_reward,deadline_at) values(p_client_id,p_category,p_title,p_description,p_requirements,p_budget,v_fee,v_reward,p_deadline_at) returning * into v_task;
 return v_task;
end $$;

create or replace function public.apply_for_task(p_task_id uuid,p_worker_id uuid)
returns public.task_applications language plpgsql security definer as $$
declare v_task public.tasks; v_count integer; v_pending integer; v_app public.task_applications;
begin
 select * into v_task from public.tasks where id=p_task_id for update;
 if v_task.id is null then raise exception 'Job not found'; end if;
 if v_task.status<>'open' then raise exception 'This job is no longer accepting applications'; end if;
 if exists(select 1 from public.profiles where id=p_worker_id and (banned or worker_onboarded=false)) then raise exception 'Worker profile is not approved for applications'; end if;
 if not exists(select 1 from public.worker_skills where user_id=p_worker_id and skill_key=v_task.category) then raise exception 'This job does not match your selected skills'; end if;
 select count(*) into v_pending from public.task_applications where worker_id=p_worker_id and status='pending';
 if v_pending>=5 then raise exception 'You already have 5 pending applications'; end if;
 if exists(select 1 from public.task_applications where task_id=p_task_id and worker_id=p_worker_id and status in('pending','selected')) then raise exception 'You already applied'; end if;
 select count(*) into v_count from public.task_applications where task_id=p_task_id and status in('pending','selected');
 if v_count>=10 then raise exception 'This job already has 10 applicants'; end if;
 insert into public.task_applications(task_id,worker_id,status) values(p_task_id,p_worker_id,'pending') returning * into v_app;
 v_count:=v_count+1;
 update public.tasks set applicant_count=v_count,status=case when v_count>=10 then 'selection' else status end,updated_at=now() where id=p_task_id;
 return v_app;
end $$;

create or replace function public.choose_task_worker(p_task_id uuid,p_client_id uuid,p_worker_id uuid)
returns public.tasks language plpgsql security definer as $$
declare v_task public.tasks;
begin
 select * into v_task from public.tasks where id=p_task_id for update;
 if v_task.client_id<>p_client_id then raise exception 'Not your job'; end if;
 if v_task.status<>'selection' then raise exception 'The job must reach 10 applicants before selection'; end if;
 if not exists(select 1 from public.task_applications where task_id=p_task_id and worker_id=p_worker_id and status='pending') then raise exception 'Worker is not a pending applicant'; end if;
 update public.task_applications set status='rejected',decided_at=now() where task_id=p_task_id and status='pending' and worker_id<>p_worker_id;
 update public.task_applications set status='selected',decided_at=now() where task_id=p_task_id and worker_id=p_worker_id;
 update public.task_applications set status='cancelled',decided_at=now() where worker_id=p_worker_id and status='pending' and task_id<>p_task_id;
 update public.tasks set status='assigned',assigned_worker_id=p_worker_id,assigned_at=now(),updated_at=now() where id=p_task_id returning * into v_task;
 return v_task;
end $$;

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
