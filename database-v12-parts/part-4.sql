-- Sera Time V12 SQL part 4 of 5
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

