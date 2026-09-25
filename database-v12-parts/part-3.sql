-- Sera Time V12 SQL part 3 of 5
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

