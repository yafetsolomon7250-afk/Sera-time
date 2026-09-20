create extension if not exists pgcrypto;

create table if not exists users(
 id uuid primary key default gen_random_uuid(),
 telegram_id bigint unique not null,
 first_name text not null default '',
 last_name text not null default '',
 username text,
 language_code text default 'am',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists user_roles(
 user_id uuid references users(id) on delete cascade,
 role text not null check(role in('worker','client','admin')),
 created_at timestamptz not null default now(),
 primary key(user_id,role)
);

create table if not exists categories(
 id uuid primary key default gen_random_uuid(),
 name text not null,
 slug text unique not null,
 active boolean not null default true,
 created_at timestamptz not null default now()
);

create table if not exists wallets(
 user_id uuid primary key references users(id) on delete cascade,
 available_balance numeric(14,2) not null default 0 check(available_balance>=0),
 reserved_balance numeric(14,2) not null default 0 check(reserved_balance>=0),
 total_earned numeric(14,2) not null default 0 check(total_earned>=0),
 updated_at timestamptz not null default now()
);

create table if not exists tasks(
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references users(id),
 worker_id uuid references users(id),
 category text,
 title text not null,
 description text not null,
 requirements text,
 instructions text,
 budget numeric(14,2) not null check(budget>0),
 platform_fee numeric(14,2) not null default 0,
 deadline timestamptz,
 status text not null default 'open' check(status in('draft','open','assigned','submitted','revision','disputed','completed','cancelled','expired')),
 revision_count integer not null default 0,
 revision_limit integer not null default 2,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create unique index if not exists one_active_task_per_worker
on tasks(worker_id) where worker_id is not null and status in('assigned','submitted','revision','disputed');

create table if not exists task_files(
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references tasks(id) on delete cascade,
 storage_path text not null,
 file_name text,
 mime_type text,
 size_bytes bigint,
 created_at timestamptz not null default now()
);

create table if not exists submissions(
 id uuid primary key default gen_random_uuid(),
 task_id uuid unique not null references tasks(id) on delete cascade,
 worker_id uuid not null references users(id),
 note text,
 status text not null default 'submitted' check(status in('submitted','approved','revision','disputed')),
 submitted_at timestamptz not null default now(),
 approved_at timestamptz
);

create table if not exists submission_files(
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null references submissions(id) on delete cascade,
 storage_path text not null,
 file_name text,
 mime_type text,
 size_bytes bigint,
 created_at timestamptz not null default now()
);

create table if not exists revisions(
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references tasks(id) on delete cascade,
 client_id uuid not null references users(id),
 reason text not null,
 created_at timestamptz not null default now()
);

create table if not exists disputes(
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references tasks(id) on delete cascade,
 opened_by uuid not null references users(id),
 reason text not null,
 status text not null default 'open' check(status in('open','reviewing','resolved')),
 resolution text,
 created_at timestamptz not null default now(),
 resolved_at timestamptz
);

create table if not exists ledger_entries(
 id uuid primary key default gen_random_uuid(),
 user_id uuid references users(id),
 task_id uuid references tasks(id),
 type text not null,
 amount numeric(14,2) not null,
 currency text not null default 'ETB',
 reference text,
 created_at timestamptz not null default now()
);

create table if not exists deposits(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references users(id),
 amount numeric(14,2) not null check(amount>0),
 method text,
 reference text,
 proof_url text,
 status text not null default 'pending' check(status in('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 processed_at timestamptz
);

create table if not exists withdrawals(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references users(id),
 amount numeric(14,2) not null check(amount>0),
 method text,
 account_name text,
 account_number text,
 status text not null default 'pending' check(status in('pending','processing','paid','rejected')),
 created_at timestamptz not null default now(),
 processed_at timestamptz
);

create table if not exists referrals(
 user_id uuid primary key references users(id) on delete cascade,
 referrer_id uuid references users(id),
 referral_code text unique not null,
 created_at timestamptz not null default now(),
 check(referrer_id is null or referrer_id<>user_id)
);

create table if not exists referral_rewards(
 id uuid primary key default gen_random_uuid(),
 referrer_id uuid not null references users(id),
 worker_id uuid not null references users(id),
 task_id uuid unique not null references tasks(id),
 amount numeric(14,2) not null,
 created_at timestamptz not null default now()
);

create table if not exists notifications(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references users(id) on delete cascade,
 title text not null,
 body text not null,
 read boolean not null default false,
 created_at timestamptz not null default now()
);

create table if not exists bans(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references users(id),
 type text not null check(type in('warning','temporary','permanent')),
 reason text not null,
 starts_at timestamptz not null default now(),
 ends_at timestamptz,
 appeal_status text not null default 'none',
 created_at timestamptz not null default now()
);

create table if not exists appeals(
 id uuid primary key default gen_random_uuid(),
 ban_id uuid not null references bans(id),
 user_id uuid not null references users(id),
 reason text not null,
 status text not null default 'pending' check(status in('pending','approved','rejected')),
 admin_note text,
 created_at timestamptz not null default now(),
 resolved_at timestamptz
);

create table if not exists admin_users(
 user_id uuid primary key references users(id) on delete cascade,
 telegram_id bigint unique not null,
 created_at timestamptz not null default now()
);

create table if not exists audit_logs(
 id uuid primary key default gen_random_uuid(),
 admin_telegram_id bigint,
 action text not null,
 target_id uuid,
 details jsonb,
 created_at timestamptz not null default now()
);

create table if not exists platform_settings(
 key text primary key,
 value text not null,
 updated_at timestamptz not null default now()
);

create table if not exists ad_rewards(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references users(id) on delete cascade,
 telegram_id bigint not null,
 amount numeric(14,2) not null check(amount>0),
 provider text not null default 'adsgram',
 reward_date date not null default current_date,
 created_at timestamptz not null default now()
);
create index if not exists ad_rewards_user_date on ad_rewards(user_id,reward_date);

insert into platform_settings(key,value) values
('platform_fee_percent','10'),
('referral_percent','5'),
('minimum_withdrawal_etb','1000'),
('revision_limit','2'),
('ads_daily_limit','5'),
('ads_reward_etb','1'),
('client_escalation_hours','72')
on conflict(key) do nothing;

insert into categories(name,slug) values
('Graphic Design','graphic-design'),('Logo Design','logo-design'),('Video Editing','video-editing'),
('Photo Editing','photo-editing'),('Writing','writing'),('Translation','translation'),
('Data Entry','data-entry'),('Voice Over','voice-over'),('Social Media','social-media'),
('Programming','programming'),('Website Development','website-development'),
('AI Services','ai-services'),('Marketing','marketing'),('Research','research'),('Excel','excel')
on conflict(slug) do nothing;

create or replace function accept_task_atomic(p_task_id uuid,p_worker_id uuid)
returns text language plpgsql security definer as $$
declare t tasks;
begin
 if exists(select 1 from tasks where worker_id=p_worker_id and status in('assigned','submitted','revision','disputed'))
 then raise exception 'Worker already has an active task'; end if;
 update tasks set worker_id=p_worker_id,status='assigned',updated_at=now()
 where id=p_task_id and status='open' returning * into t;
 if not found then raise exception 'Task is no longer available'; end if;
 insert into user_roles(user_id,role) values(p_worker_id,'worker') on conflict do nothing;
 insert into wallets(user_id) values(p_worker_id) on conflict do nothing;
 return 'Task accepted successfully';
end $$;

create or replace function create_task_atomic(
 p_client_id uuid,p_title text,p_description text,p_budget numeric,p_reserve numeric,p_platform_fee numeric
) returns text language plpgsql security definer as $$
declare w wallets;
begin
 insert into wallets(user_id) values(p_client_id) on conflict do nothing;
 select * into w from wallets where user_id=p_client_id for update;
 if w.available_balance<p_reserve then raise exception 'Insufficient balance'; end if;
 update wallets set available_balance=available_balance-p_reserve,reserved_balance=reserved_balance+p_reserve,updated_at=now()
 where user_id=p_client_id;
 insert into tasks(client_id,title,description,budget,platform_fee,status,revision_limit)
 values(p_client_id,p_title,p_description,p_budget,p_platform_fee,'open',coalesce((select value::int from platform_settings where key='revision_limit'),2));
 insert into user_roles(user_id,role) values(p_client_id,'client') on conflict do nothing;
 insert into ledger_entries(user_id,type,amount,reference) values(p_client_id,'task_reserve',-p_reserve,'task creation');
 return 'Task posted';
end $$;

create or replace function request_withdrawal_atomic(p_user_id uuid,p_amount numeric)
returns text language plpgsql security definer as $$
declare w wallets;
begin
 select * into w from wallets where user_id=p_user_id for update;
 if not found or w.available_balance<p_amount then raise exception 'Insufficient balance'; end if;
 update wallets set available_balance=available_balance-p_amount,updated_at=now() where user_id=p_user_id;
 insert into withdrawals(user_id,amount) values(p_user_id,p_amount);
 insert into ledger_entries(user_id,type,amount,reference) values(p_user_id,'withdrawal_reserved',-p_amount,'withdrawal request');
 return 'Withdrawal requested';
end $$;

create or replace function get_ads_today(p_user_id uuid)
returns integer language sql security definer as $$
 select count(*)::int from ad_rewards where user_id=p_user_id and reward_date=current_date
$$;

create or replace function credit_adsgram_reward(p_telegram_id bigint,p_reward_etb numeric,p_daily_limit integer)
returns text language plpgsql security definer as $$
declare u users; n integer;
begin
 select * into u from users where telegram_id=p_telegram_id;
 if not found then raise exception 'User not found'; end if;
 select count(*) into n from ad_rewards where user_id=u.id and reward_date=current_date;
 if n>=p_daily_limit then return 'Daily ad limit reached'; end if;

 insert into ad_rewards(user_id,telegram_id,amount) values(u.id,u.telegram_id,p_reward_etb);
 insert into wallets(user_id) values(u.id) on conflict do nothing;
 update wallets set available_balance=available_balance+p_reward_etb,total_earned=total_earned+p_reward_etb,updated_at=now()
 where user_id=u.id;
 insert into ledger_entries(user_id,type,amount,reference) values(u.id,'adsgram_reward',p_reward_etb,'AdsGram rewarded ad');
 insert into notifications(user_id,title,body) values(u.id,'AdsGram reward','You earned 1 ETB from a rewarded ad.');
 return 'Reward credited';
end $$;

alter table users enable row level security;
alter table user_roles enable row level security;
alter table wallets enable row level security;
alter table tasks enable row level security;
alter table task_files enable row level security;
alter table submissions enable row level security;
alter table submission_files enable row level security;
alter table deposits enable row level security;
alter table withdrawals enable row level security;
alter table referrals enable row level security;
alter table referral_rewards enable row level security;
alter table notifications enable row level security;
alter table bans enable row level security;
alter table appeals enable row level security;
alter table admin_users enable row level security;
alter table audit_logs enable row level security;
alter table ad_rewards enable row level security;
