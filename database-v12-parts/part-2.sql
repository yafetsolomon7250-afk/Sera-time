-- Sera Time V12 SQL part 2 of 5
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

