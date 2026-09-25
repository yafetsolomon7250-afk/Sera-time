-- Sera Time V12 SQL part 1 of 5
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

