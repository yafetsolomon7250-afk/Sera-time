create extension if not exists pgcrypto;

do $$ begin
  create type task_status as enum ('draft','open','assigned','submitted','revision_requested','disputed','completed','cancelled','expired');
exception when duplicate_object then null; end $$;
do $$ begin
  create type withdrawal_status as enum ('pending','processing','paid','rejected');
exception when duplicate_object then null; end $$;

create table if not exists users(
 id uuid primary key default gen_random_uuid(),
 telegram_id text unique not null,
 first_name text not null default '',
 last_name text not null default '',
 username text,
 active_role text not null default 'worker' check(active_role in ('worker','client')),
 banned boolean not null default false,
 ban_until timestamptz,
 ban_reason text,
 is_admin boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists wallets(
 user_id uuid primary key references users(id) on delete cascade,
 available numeric(14,2) not null default 0 check(available>=0),
 reserved numeric(14,2) not null default 0 check(reserved>=0),
 lifetime_earned numeric(14,2) not null default 0 check(lifetime_earned>=0),
 lifetime_spent numeric(14,2) not null default 0 check(lifetime_spent>=0),
 updated_at timestamptz not null default now()
);

create table if not exists categories(
 id uuid primary key default gen_random_uuid(),
 name text unique not null,
 active boolean not null default true,
 created_at timestamptz not null default now()
);

insert into categories(name) values
('Graphic Design'),('Logo Design'),('Video Editing'),('Photo Editing'),('Writing'),('Translation'),('Data Entry'),('Voice Over'),('Social Media'),('Programming'),('Website Development'),('AI Services'),('Marketing'),('Research'),('Excel')
on conflict do nothing;

create table if not exists tasks(
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references users(id),
 category text not null,
 title text not null check(length(title) between 3 and 160),
 description text not null,
 requirements text not null default '',
 budget numeric(14,2) not null check(budget>0),
 platform_fee numeric(14,2) not null default 0,
 worker_reward numeric(14,2) not null,
 deadline_at timestamptz not null,
 status task_status not null default 'open',
 assigned_worker_id uuid references users(id),
 assigned_at timestamptz,
 submitted_at timestamptz,
 completed_at timestamptz,
 revision_count integer not null default 0,
 revision_limit integer not null default 2,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists tasks_open_idx on tasks(status,category,created_at);
create index if not exists tasks_worker_idx on tasks(assigned_worker_id,status);
create unique index if not exists one_active_task_per_worker on tasks(assigned_worker_id)
where status in ('assigned','submitted','revision_requested','disputed');

create table if not exists task_files(
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references tasks(id) on delete cascade,
 file_url text not null,
 file_name text,
 created_at timestamptz not null default now()
);

create table if not exists submissions(
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null unique references tasks(id) on delete cascade,
 worker_id uuid not null references users(id),
 content text not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
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
 evidence text,
 status text not null default 'open',
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
 reference_id text,
 description text,
 created_at timestamptz not null default now()
);
create index if not exists ledger_user_idx on ledger_entries(user_id,created_at desc);

create table if not exists deposits(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references users(id),
 amount numeric(14,2) not null check(amount>0),
 method text not null,
 reference text,
 proof_url text,
 status text not null default 'pending',
 reviewed_by uuid references users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);

create table if not exists withdrawals(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references users(id),
 amount numeric(14,2) not null check(amount>0),
 fee numeric(14,2) not null default 0,
 method text not null,
 account_number text not null,
 account_name text not null,
 status withdrawal_status not null default 'pending',
 rejection_reason text,
 processed_by uuid references users(id),
 processed_at timestamptz,
 created_at timestamptz not null default now()
);

create table if not exists referrals(
 id uuid primary key default gen_random_uuid(),
 referrer_id uuid not null references users(id),
 referred_id uuid not null unique references users(id),
 created_at timestamptz not null default now(),
 check(referrer_id<>referred_id)
);

create table if not exists referral_rewards(
 id uuid primary key default gen_random_uuid(),
 referral_id uuid not null references referrals(id),
 task_id uuid not null unique references tasks(id),
 referrer_id uuid not null references users(id),
 referred_worker_id uuid not null references users(id),
 amount numeric(14,2) not null check(amount>0),
 created_at timestamptz not null default now()
);

create table if not exists notifications(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references users(id) on delete cascade,
 title text not null,
 body text not null,
 type text not null,
 read_at timestamptz,
 created_at timestamptz not null default now()
);

create table if not exists bans(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references users(id),
 type text not null,
 reason text not null,
 evidence text,
 starts_at timestamptz not null default now(),
 ends_at timestamptz,
 created_by uuid references users(id),
 appeal_status text not null default 'none',
 created_at timestamptz not null default now()
);

create table if not exists appeals(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references users(id),
 ban_id uuid references bans(id),
 reason text not null,
 status text not null default 'pending',
 admin_response text,
 created_at timestamptz not null default now(),
 reviewed_at timestamptz
);

create table if not exists audit_logs(
 id uuid primary key default gen_random_uuid(),
 admin_id uuid references users(id),
 action text not null,
 target_type text,
 target_id uuid,
 metadata jsonb,
 created_at timestamptz not null default now()
);

create table if not exists platform_settings(
 key text primary key,
 value numeric(14,4),
 text_value text,
 updated_at timestamptz not null default now()
);

create table if not exists ad_rewards(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references users(id),
 event_id text not null unique,
 amount numeric(14,2) not null,
 created_at timestamptz not null default now()
);
create index if not exists ad_rewards_daily_idx on ad_rewards(user_id,created_at);

create or replace function ensure_user(p_telegram_id text,p_first_name text,p_last_name text,p_username text)
returns jsonb language plpgsql security definer as $$
declare u users;
begin
 insert into users(telegram_id,first_name,last_name,username)
 values(p_telegram_id,p_first_name,p_last_name,p_username)
 on conflict(telegram_id) do update set first_name=excluded.first_name,last_name=excluded.last_name,username=excluded.username,updated_at=now()
 returning * into u;
 insert into wallets(user_id) values(u.id) on conflict do nothing;
 return jsonb_build_object('id',u.id,'telegram_id',u.telegram_id,'first_name',u.first_name,'last_name',u.last_name,'username',u.username,'active_role',u.active_role,'banned',u.banned,'is_admin',u.is_admin);
end $$;

create or replace function dashboard(p_user_id uuid,p_role text)
returns jsonb language plpgsql security definer as $$
declare w wallets; done_count int; ads_count int; ref_earned numeric; active jsonb;
begin
 select * into w from wallets where user_id=p_user_id;
 select count(*) into done_count from tasks where assigned_worker_id=p_user_id and status='completed';
 select count(*) into ads_count from ad_rewards where user_id=p_user_id and created_at>=date_trunc('day',now());
 select coalesce(sum(amount),0) into ref_earned from referral_rewards where referrer_id=p_user_id;
 select to_jsonb(t) into active from tasks t where assigned_worker_id=p_user_id and status in ('assigned','submitted','revision_requested','disputed') limit 1;
 return jsonb_build_object('wallet',jsonb_build_object('available',w.available,'earned',w.lifetime_earned),'completed',done_count,'ads',jsonb_build_object('completed',ads_count,'limit',5),'referralEarned',ref_earned,'active',active);
end $$;

create or replace function available_tasks(p_user_id uuid)
returns jsonb language plpgsql security definer as $$
declare has_active boolean;
begin
 select exists(select 1 from tasks where assigned_worker_id=p_user_id and status in ('assigned','submitted','revision_requested','disputed')) into has_active;
 if has_active then return jsonb_build_object('tasks',jsonb_build_array(),'reason','worker_has_active_task'); end if;
 return jsonb_build_object('tasks',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,category,title,description,budget,worker_reward,extract(epoch from(deadline_at-now()))/3600 as deadline_hours from tasks where status='open' and deadline_at>now() order by created_at desc limit 100)x),'[]'::jsonb));
end $$;

create or replace function accept_task(p_user_id uuid,p_task_id uuid)
returns jsonb language plpgsql security definer as $$
declare t tasks; active boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_task_id::text,0));
 select exists(select 1 from tasks where assigned_worker_id=p_user_id and status in ('assigned','submitted','revision_requested','disputed')) into active;
 if active then raise exception 'لديك عمل نشط بالفعل'; end if;
 select * into t from tasks where id=p_task_id for update;
 if not found or t.status<>'open' or t.deadline_at<=now() then raise exception 'هذا العمل لم يعد متاحاً'; end if;
 update tasks set status='assigned',assigned_worker_id=p_user_id,assigned_at=now(),updated_at=now() where id=p_task_id;
 insert into notifications(user_id,title,body,type) values(t.client_id,'تم قبول عملك','قام عامل بقبول عملك.','task_assigned');
 return jsonb_build_object('ok',true);
end $$;

create or replace function create_task(p_user_id uuid,p_category text,p_title text,p_description text,p_requirements text,p_deadline_hours numeric,p_budget numeric,p_platform_fee numeric)
returns jsonb language plpgsql security definer as $$
declare w wallets; t tasks; fee numeric; reward numeric;
begin
 if p_budget<=0 then raise exception 'الميزانية غير صحيحة'; end if;
 fee=round(p_budget*p_platform_fee/100,2); reward=round(p_budget-fee,2);
 select * into w from wallets where user_id=p_user_id for update;
 if w.available<p_budget then raise exception 'الرصيد المتاح غير كافٍ'; end if;
 update wallets set available=available-p_budget,reserved=reserved+p_budget,updated_at=now() where user_id=p_user_id;
 insert into tasks(client_id,category,title,description,requirements,budget,platform_fee,worker_reward,deadline_at)
 values(p_user_id,p_category,p_title,p_description,p_requirements,p_budget,fee,reward,now()+(p_deadline_hours||' hours')::interval)
 returning * into t;
 insert into ledger_entries(user_id,task_id,type,amount,description) values(p_user_id,t.id,'task_reserve',-p_budget,'حجز ميزانية العمل');
 return jsonb_build_object('ok',true,'task_id',t.id);
end $$;

create or replace function submit_task(p_user_id uuid,p_task_id uuid,p_content text)
returns jsonb language plpgsql security definer as $$
declare t tasks;
begin
 select * into t from tasks where id=p_task_id and assigned_worker_id=p_user_id for update;
 if not found or t.status not in ('assigned','revision_requested') then raise exception 'لا يمكن تسليم هذا العمل الآن'; end if;
 insert into submissions(task_id,worker_id,content) values(p_task_id,p_user_id,p_content)
 on conflict(task_id) do update set content=excluded.content,updated_at=now();
 update tasks set status='submitted',submitted_at=now(),updated_at=now() where id=p_task_id;
 insert into notifications(user_id,title,body,type) values(t.client_id,'تم تسليم العمل','قام العامل بإرسال العمل للمراجعة.','submission_received');
 return jsonb_build_object('ok',true);
end $$;

create or replace function wallet_summary(p_user_id uuid,p_min_withdrawal numeric)
returns jsonb language plpgsql security definer as $$
begin
 return jsonb_build_object(
  'available',(select available from wallets where user_id=p_user_id),
  'reserved',(select reserved from wallets where user_id=p_user_id),
  'minWithdrawal',p_min_withdrawal,
  'transactions',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select id,type,amount,created_at,'تم تسجيل المعاملة' as type_am,'مسجل' as status_am from ledger_entries where user_id=p_user_id order by created_at desc limit 30)x)
 );
end $$;

create or replace function create_withdrawal(p_user_id uuid,p_amount numeric,p_method text,p_account_number text,p_account_name text,p_min_withdrawal numeric,p_fee numeric)
returns jsonb language plpgsql security definer as $$
declare w wallets;
begin
 if p_amount<p_min_withdrawal then raise exception 'الحد الأدنى للسحب هو % ETB',p_min_withdrawal; end if;
 if length(trim(p_account_number))<4 or length(trim(p_account_name))<2 then raise exception 'بيانات الدفع غير صحيحة'; end if;
 select * into w from wallets where user_id=p_user_id for update;
 if w.available<p_amount+p_fee then raise exception 'الرصيد غير كافٍ'; end if;
 update wallets set available=available-p_amount-p_fee,updated_at=now() where user_id=p_user_id;
 insert into withdrawals(user_id,amount,fee,method,account_number,account_name) values(p_user_id,p_amount,p_fee,p_method,p_account_number,p_account_name);
 insert into ledger_entries(user_id,type,amount,description) values(p_user_id,'withdrawal',-p_amount-p_fee,'طلب سحب');
 return jsonb_build_object('ok',true);
end $$;

create or replace function referral_dashboard(p_user_id uuid,p_bot_username text)
returns jsonb language plpgsql security definer as $$
declare c int; e numeric;
begin
 select count(*) into c from referrals where referrer_id=p_user_id;
 select coalesce(sum(amount),0) into e from referral_rewards where referrer_id=p_user_id;
 return jsonb_build_object('count',c,'earned',e,'link',case when p_bot_username<>'' then 'https://t.me/'||p_bot_username||'?start=ref_'||p_user_id::text else null end);
end $$;

create or replace function credit_adsgram_reward(p_user_id uuid,p_event_id text,p_daily_limit int,p_reward numeric)
returns jsonb language plpgsql security definer as $$
declare c int;
begin
 select count(*) into c from ad_rewards where user_id=p_user_id and created_at>=date_trunc('day',now());
 if c>=p_daily_limit then raise exception 'وصلت إلى حد الإعلانات اليومي'; end if;
 insert into ad_rewards(user_id,event_id,amount) values(p_user_id,p_event_id,p_reward);
 update wallets set available=available+p_reward,lifetime_earned=lifetime_earned+p_reward,updated_at=now() where user_id=p_user_id;
 insert into ledger_entries(user_id,type,amount,reference_id,description) values(p_user_id,'ad_reward',p_reward,p_event_id,'مكافأة إعلان');
 return jsonb_build_object('ok',true,'reward',p_reward,'completed',c+1,'limit',p_daily_limit);
exception when unique_violation then raise exception 'تم تسجيل هذا الإعلان مسبقاً'; end $$;

create or replace function my_tasks(p_user_id uuid) returns jsonb language sql security definer as $$
 select jsonb_build_object('tasks',coalesce((select jsonb_agg(to_jsonb(x)) from (select t.*,case t.status when 'assigned' then 'مقبول' when 'submitted' then 'بانتظار المراجعة' when 'revision_requested' then 'تعديل مطلوب' when 'disputed' then 'نزاع' else t.status::text end status_am from tasks t where t.assigned_worker_id=p_user_id and t.status in ('assigned','submitted','revision_requested','disputed') order by t.created_at desc)x),'[]'::jsonb));
$$;

create or replace function my_posts(p_user_id uuid) returns jsonb language sql security definer as $$
 select jsonb_build_object('tasks',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,title,category,budget,status,deadline_at from tasks where client_id=p_user_id order by created_at desc limit 100)x),'[]'::jsonb));
$$;

create or replace function admin_dashboard(p_admin_id uuid) returns jsonb language plpgsql security definer as $$
begin
 if not exists(select 1 from users where id=p_admin_id and is_admin) then raise exception 'غير مصرح'; end if;
 return jsonb_build_object(
 'users',(select count(*) from users),
 'tasks',(select count(*) from tasks),
 'pendingWithdrawals',(select count(*) from withdrawals where status='pending'),
 'disputes',(select count(*) from disputes where status='open'),
 'withdrawals',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select id,user_id,amount,method,account_number,account_name,status,created_at from withdrawals where status='pending' order by created_at asc limit 100)x)
 );
end $$;

create or replace function admin_withdraw(p_admin_id uuid,p_withdrawal_id uuid,p_status text,p_reason text)
returns jsonb language plpgsql security definer as $$
declare w withdrawals;
begin
 if not exists(select 1 from users where id=p_admin_id and is_admin) then raise exception 'غير مصرح'; end if;
 select * into w from withdrawals where id=p_withdrawal_id for update;
 if not found then raise exception 'طلب السحب غير موجود'; end if;
 if w.status<>'pending' then raise exception 'تمت معالجة الطلب مسبقاً'; end if;
 if p_status='paid' then
   update withdrawals set status='paid',processed_by=p_admin_id,processed_at=now() where id=w.id;
   insert into notifications(user_id,title,body,type) values(w.user_id,'تم دفع السحب','تمت معالجة طلب السحب الخاص بك.','withdrawal_paid');
 elsif p_status='rejected' then
   update withdrawals set status='rejected',rejection_reason=p_reason,processed_by=p_admin_id,processed_at=now() where id=w.id;
   update wallets set available=available+w.amount+w.fee,updated_at=now() where user_id=w.user_id;
   insert into ledger_entries(user_id,type,amount,reference_id,description) values(w.user_id,'withdrawal_refund',w.amount+w.fee,w.id::text,'إرجاع طلب سحب مرفوض');
   insert into notifications(user_id,title,body,type) values(w.user_id,'تم رفض السحب',coalesce(p_reason,'تم رفض طلب السحب'),'withdrawal_rejected');
 else raise exception 'حالة غير صحيحة'; end if;
 insert into audit_logs(admin_id,action,target_type,target_id,metadata) values(p_admin_id,'withdrawal_update','withdrawal',w.id,jsonb_build_object('status',p_status,'reason',p_reason));
 return jsonb_build_object('ok',true);
end $$;

-- Security: public clients should not receive service-role access.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

-- Additional production workflows
alter table if exists users add column if not exists referral_locked boolean not null default false;
alter table if exists tasks add column if not exists requirements text not null default '';
alter table if exists tasks add column if not exists revision_limit integer not null default 2;
alter table if exists tasks add column if not exists platform_fee numeric(14,2) not null default 0;
alter table if exists tasks add column if not exists worker_reward numeric(14,2) not null default 0;

create index if not exists notifications_user_idx on notifications(user_id,created_at desc);
create index if not exists withdrawals_status_idx on withdrawals(status,created_at);
create index if not exists deposits_status_idx on deposits(status,created_at);

drop function if exists ensure_user(text,text,text,text);

create or replace function ensure_user(p_telegram_id text,p_first_name text,p_last_name text,p_username text,p_start_param text default '')
returns jsonb language plpgsql security definer as $$
declare u users; ref uuid; ref_id uuid; ref_code text;
begin
 insert into users(telegram_id,first_name,last_name,username)
 values(p_telegram_id,p_first_name,p_last_name,p_username)
 on conflict(telegram_id) do update set first_name=excluded.first_name,last_name=excluded.last_name,username=excluded.username,updated_at=now()
 returning * into u;
 insert into wallets(user_id) values(u.id) on conflict do nothing;
 if p_start_param like 'ref_%' then
   ref_code=replace(p_start_param,'ref_','');
   begin ref:=ref_code::uuid; exception when invalid_text_representation then ref:=null; end;
   if ref is not null and ref<>u.id and not exists(select 1 from referrals where referred_id=u.id) and exists(select 1 from users where id=ref) then
     insert into referrals(referrer_id,referred_id) values(ref,u.id) on conflict(referred_id) do nothing;
   end if;
 end if;
 return jsonb_build_object('id',u.id,'telegram_id',u.telegram_id,'first_name',u.first_name,'last_name',u.last_name,'username',u.username,'active_role',u.active_role,'banned',u.banned,'ban_until',u.ban_until,'ban_reason',u.ban_reason,'is_admin',u.is_admin);
end $$;

create or replace function dashboard(p_user_id uuid,p_role text,p_ad_limit int default 5)
returns jsonb language plpgsql security definer as $$
declare w wallets; done_count int; ads_count int; ref_earned numeric; spent numeric; active jsonb; available_count int;
begin
 select * into w from wallets where user_id=p_user_id;
 select count(*) into done_count from tasks where assigned_worker_id=p_user_id and status='completed';
 select count(*) into ads_count from ad_rewards where user_id=p_user_id and created_at>=date_trunc('day',now());
 select coalesce(sum(amount),0) into ref_earned from referral_rewards where referrer_id=p_user_id;
 select coalesce(sum(budget),0) into spent from tasks where client_id=p_user_id and status='completed';
 select count(*) into available_count from tasks where status='open' and deadline_at>now();
 select to_jsonb(t) into active from tasks t where assigned_worker_id=p_user_id and status in ('assigned','submitted','revision_requested','disputed') limit 1;
 return jsonb_build_object('wallet',jsonb_build_object('available',coalesce(w.available,0),'reserved',coalesce(w.reserved,0),'earned',coalesce(w.lifetime_earned,0),'spent',spent),'completed',done_count,'availableTasks',available_count,'ads',jsonb_build_object('completed',ads_count,'limit',p_ad_limit),'referralEarned',ref_earned,'active',active);
end $$;

create or replace function expire_open_tasks()
returns void language plpgsql security definer as $$
declare t record;
begin
 for t in select id,client_id,budget from tasks where status='open' and deadline_at<=now() for update skip locked loop
   update tasks set status='expired',updated_at=now() where id=t.id and status='open';
   if found then
     update wallets set available=available+t.budget,reserved=greatest(0,reserved-t.budget),updated_at=now() where user_id=t.client_id;
     insert into ledger_entries(user_id,task_id,type,amount,description) values(t.client_id,t.id,'task_expired_refund',t.budget,'إرجاع ميزانية عمل منتهي');
     insert into notifications(user_id,title,body,type) values(t.client_id,'انتهت مهلة العمل','تم إرجاع الميزانية المحجوزة للعمل المنتهي.','task_expired');
   end if;
 end loop;
end $$;

create or replace function available_tasks(p_user_id uuid)
returns jsonb language plpgsql security definer as $$
declare has_active boolean;
begin
 perform expire_open_tasks();
 select exists(select 1 from tasks where assigned_worker_id=p_user_id and status in ('assigned','submitted','revision_requested','disputed')) into has_active;
 if has_active then return jsonb_build_object('tasks',jsonb_build_array(),'reason','worker_has_active_task'); end if;
 return jsonb_build_object('tasks',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,category,title,description,requirements,budget,worker_reward,extract(epoch from(deadline_at-now()))/3600 as deadline_hours from tasks where status='open' and deadline_at>now() order by created_at desc limit 100)x),'[]'::jsonb));
end $$;

drop function if exists create_task(uuid,text,text,text,text,numeric,numeric,numeric);

create or replace function create_task(p_user_id uuid,p_category text,p_title text,p_description text,p_requirements text,p_deadline_hours numeric,p_budget numeric,p_platform_fee numeric,p_revision_limit int default 2)
returns jsonb language plpgsql security definer as $$
declare w wallets; t tasks; fee numeric; reward numeric;
begin
 if length(trim(p_title))<3 or length(trim(p_description))<10 then raise exception 'أدخل عنواناً ووصفاً واضحين'; end if;
 if p_budget<=0 then raise exception 'الميزانية غير صحيحة'; end if;
 if p_deadline_hours<1 then raise exception 'المهلة غير صحيحة'; end if;
 fee=round(p_budget*p_platform_fee/100,2); reward=round(p_budget-fee,2);
 select * into w from wallets where user_id=p_user_id for update;
 if coalesce(w.available,0)<p_budget then raise exception 'الرصيد المتاح غير كافٍ'; end if;
 update wallets set available=available-p_budget,reserved=reserved+p_budget,updated_at=now() where user_id=p_user_id;
 insert into tasks(client_id,category,title,description,requirements,budget,platform_fee,worker_reward,deadline_at,revision_limit)
 values(p_user_id,p_category,p_title,p_description,p_requirements,p_budget,fee,reward,now()+(p_deadline_hours||' hours')::interval,greatest(0,p_revision_limit)) returning * into t;
 insert into ledger_entries(user_id,task_id,type,amount,description) values(p_user_id,t.id,'task_reserve',-p_budget,'حجز ميزانية العمل');
 return jsonb_build_object('ok',true,'task_id',t.id,'worker_reward',reward,'platform_fee',fee);
end $$;

create or replace function approve_task(p_user_id uuid,p_task_id uuid,p_referral_percent numeric)
returns jsonb language plpgsql security definer as $$
declare t tasks; wref uuid; refid uuid; ref_reward numeric:=0; fee numeric; worker_reward numeric;
begin
 select * into t from tasks where id=p_task_id for update;
 if not found or t.client_id<>p_user_id then raise exception 'غير مصرح'; end if;
 if t.status<>'submitted' then raise exception 'العمل ليس بانتظار القبول'; end if;
 worker_reward=t.worker_reward; fee=t.platform_fee;
 select r.referrer_id into wref from referrals r where r.referred_id=t.assigned_worker_id;
 if wref is not null then ref_reward=round(worker_reward*p_referral_percent/100,2); end if;
 if ref_reward>fee then raise exception 'لا يمكن إتمام المكافأة: عمولة الإحالة تتجاوز رسوم المنصة'; end if;
 update tasks set status='completed',completed_at=now(),updated_at=now() where id=t.id;
 update wallets set reserved=reserved-t.budget,lifetime_spent=lifetime_spent+t.budget,updated_at=now() where user_id=t.client_id;
 update wallets set available=available+worker_reward,lifetime_earned=lifetime_earned+worker_reward,updated_at=now() where user_id=t.assigned_worker_id;
 insert into ledger_entries(user_id,task_id,type,amount,description) values(t.assigned_worker_id,t.id,'task_earning',worker_reward,'أجر عمل مكتمل');
 if wref is not null and ref_reward>0 then
   insert into referral_rewards(referral_id,task_id,referrer_id,referred_worker_id,amount) select r.id,t.id,r.referrer_id,t.assigned_worker_id,ref_reward from referrals r where r.referrer_id=wref and r.referred_id=t.assigned_worker_id on conflict(task_id) do nothing returning referral_id into refid;
   if refid is not null then update wallets set available=available+ref_reward,lifetime_earned=lifetime_earned+ref_reward,updated_at=now() where user_id=wref; insert into ledger_entries(user_id,task_id,type,amount,description) values(wref,t.id,'referral_reward',ref_reward,'مكافأة إحالة'); end if;
 end if;
 insert into notifications(user_id,title,body,type) values(t.assigned_worker_id,'تم قبول عملك','تم اعتماد العمل وإضافة أجرك إلى المحفظة.','work_approved');
 if wref is not null and ref_reward>0 then insert into notifications(user_id,title,body,type) values(wref,'مكافأة إحالة','حصلت على مكافأة من عمل مكتمل عبر إحالتك.','referral_reward'); end if;
 return jsonb_build_object('ok',true,'worker_reward',worker_reward,'referral_reward',ref_reward);
end $$;

create or replace function request_revision(p_user_id uuid,p_task_id uuid,p_reason text,p_limit int)
returns jsonb language plpgsql security definer as $$
declare t tasks;
begin
 if length(trim(p_reason))<3 then raise exception 'سبب التعديل مطلوب'; end if;
 select * into t from tasks where id=p_task_id for update;
 if not found or t.client_id<>p_user_id or t.status<>'submitted' then raise exception 'لا يمكن طلب تعديل الآن'; end if;
 if t.revision_count>=least(t.revision_limit,p_limit) then raise exception 'تم استنفاد عدد التعديلات'; end if;
 update tasks set status='revision_requested',revision_count=revision_count+1,updated_at=now() where id=t.id;
 insert into revisions(task_id,client_id,reason) values(t.id,p_user_id,p_reason);
 insert into notifications(user_id,title,body,type) values(t.assigned_worker_id,'مطلوب تعديل','طلب العميل تعديلاً: '||p_reason,'revision_requested');
 return jsonb_build_object('ok',true,'revision_count',t.revision_count+1);
end $$;

create or replace function open_dispute(p_user_id uuid,p_task_id uuid,p_reason text)
returns jsonb language plpgsql security definer as $$
declare t tasks;
begin
 if length(trim(p_reason))<3 then raise exception 'سبب النزاع مطلوب'; end if;
 select * into t from tasks where id=p_task_id for update;
 if not found or (t.client_id<>p_user_id and t.assigned_worker_id<>p_user_id) then raise exception 'غير مصرح'; end if;
 if t.status not in ('submitted','revision_requested') then raise exception 'لا يمكن فتح نزاع الآن'; end if;
 update tasks set status='disputed',updated_at=now() where id=t.id;
 insert into disputes(task_id,opened_by,reason) values(t.id,p_user_id,p_reason);
 insert into notifications(user_id,title,body,type) values(case when t.client_id=p_user_id then t.assigned_worker_id else t.client_id end,'تم فتح نزاع','تم تحويل العمل إلى مراجعة الإدارة.','dispute_opened');
 return jsonb_build_object('ok',true);
end $$;

create or replace function create_deposit(p_user_id uuid,p_amount numeric,p_method text,p_reference text,p_min numeric)
returns jsonb language plpgsql security definer as $$
declare d deposits;
begin
 if p_amount<p_min then raise exception 'الحد الأدنى للإيداع هو % ETB',p_min; end if;
 if length(trim(p_reference))<3 then raise exception 'رقم المرجع مطلوب'; end if;
 insert into deposits(user_id,amount,method,reference) values(p_user_id,p_amount,p_method,p_reference) returning * into d;
 insert into notifications(user_id,title,body,type) values(p_user_id,'تم إرسال الإيداع','طلب الإيداع بانتظار مراجعة الإدارة.','deposit_submitted');
 return jsonb_build_object('ok',true,'deposit_id',d.id);
end $$;

create or replace function my_deposits(p_user_id uuid,p_min numeric) returns jsonb language sql security definer as $$
select jsonb_build_object('minDeposit',p_min,'deposits',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,amount,method,reference,status,case status when 'pending' then 'قيد المراجعة' when 'approved' then 'تم القبول' when 'rejected' then 'مرفوض' else status end status_am,created_at from deposits where user_id=p_user_id order by created_at desc limit 50)x),'[]'::jsonb));
$$;

create or replace function admin_deposit(p_admin_id uuid,p_deposit_id uuid,p_status text,p_reason text)
returns jsonb language plpgsql security definer as $$
declare d deposits;
begin
 if not exists(select 1 from users where id=p_admin_id and is_admin) then raise exception 'غير مصرح'; end if;
 select * into d from deposits where id=p_deposit_id for update;
 if not found or d.status<>'pending' then raise exception 'طلب الإيداع غير متاح'; end if;
 if p_status='approved' then
   update deposits set status='approved',reviewed_by=p_admin_id,reviewed_at=now() where id=d.id;
   update wallets set available=available+d.amount,updated_at=now() where user_id=d.user_id;
   insert into ledger_entries(user_id,type,amount,reference_id,description) values(d.user_id,'deposit',d.amount,d.id::text,'إيداع معتمد');
   insert into notifications(user_id,title,body,type) values(d.user_id,'تم قبول الإيداع','تمت إضافة مبلغ الإيداع إلى محفظتك.','deposit_approved');
 elsif p_status='rejected' then
   update deposits set status='rejected',reviewed_by=p_admin_id,reviewed_at=now() where id=d.id;
   insert into notifications(user_id,title,body,type) values(d.user_id,'تم رفض الإيداع',coalesce(p_reason,'تم رفض طلب الإيداع'),'deposit_rejected');
 else raise exception 'حالة غير صحيحة'; end if;
 insert into audit_logs(admin_id,action,target_type,target_id,metadata) values(p_admin_id,'deposit_update','deposit',d.id,jsonb_build_object('status',p_status,'reason',p_reason));
 return jsonb_build_object('ok',true);
end $$;

create or replace function my_notifications(p_user_id uuid) returns jsonb language sql security definer as $$
select jsonb_build_object('notifications',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,title,body,type,read_at,created_at from notifications where user_id=p_user_id order by created_at desc limit 100)x),'[]'::jsonb));
$$;
create or replace function read_notifications(p_user_id uuid) returns jsonb language sql security definer as $$
update notifications set read_at=now() where user_id=p_user_id and read_at is null; select jsonb_build_object('ok',true);
$$;

create or replace function admin_dashboard(p_admin_id uuid) returns jsonb language plpgsql security definer as $$
begin
 if not exists(select 1 from users where id=p_admin_id and is_admin) then raise exception 'غير مصرح'; end if;
 return jsonb_build_object('users',(select count(*) from users),'tasks',(select count(*) from tasks),'pendingWithdrawals',(select count(*) from withdrawals where status='pending'),'disputes',(select count(*) from disputes where status='open'),'deposits',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select id,user_id,amount,method,reference,status,created_at from deposits where status='pending' order by created_at asc limit 100)x),'withdrawals',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select id,user_id,amount,method,account_number,account_name,status,created_at from withdrawals where status='pending' order by created_at asc limit 100)x));
end $$;

-- Keep previous withdrawal function, but ensure the account data is never returned to ordinary users.

-- Storage bucket for task/submission/deposit files. The server uses the service role for uploads.
insert into storage.buckets(id,name,public) values('sera-time-files','sera-time-files',false) on conflict(id) do nothing;

-- Final privilege hardening: browser clients must use the server API, never direct RPC/table access.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
