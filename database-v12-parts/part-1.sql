-- SERA TIME FINAL DATABASE — PART 1 OF 5
-- Run parts 1, 2, 3, 4, 5 in this order.
-- This part is also included in database-v12.sql.

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

-- A worker can never have more than one active assigned job at a time.
drop index if exists public.one_active_job_per_worker;
create unique index one_active_job_per_worker
on public.tasks(assigned_worker_id)
where status in ('assigned','submitted','revision_requested','disputed');

insert into storage.buckets(id,name,public) values('sera-files','sera-files',false) on conflict(id) do nothing;
insert into storage.buckets(id,name,public) values('sera-public','sera-public',true) on conflict(id) do nothing;

