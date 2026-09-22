-- Run this ENTIRE file in Supabase → SQL Editor → Run
-- Fixes: admin_adjust_balance, admin_ban_user, short referrals (r_TELEGRAMID)

create or replace function public.admin_adjust_balance(
  p_admin_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_note text default ''
) returns json language plpgsql security definer as $$
begin
  if not exists(select 1 from public.users where id = p_admin_id and is_admin = true) then
    raise exception 'Not authorized';
  end if;
  if not exists(select 1 from public.wallets where user_id = p_user_id) then
    insert into public.wallets(user_id, available, locked) values (p_user_id, 0, 0);
  end if;
  update public.wallets
    set available = available + p_amount, updated_at = now()
    where user_id = p_user_id;
  insert into public.ledger_entries(user_id, type, amount, description)
    values (p_user_id, 'admin_adjust', p_amount, coalesce(nullif(p_note,''), 'Admin adjustment'));
  return json_build_object('ok', true, 'amount', p_amount);
end;
$$;

create or replace function public.admin_ban_user(
  p_admin_id uuid,
  p_user_id uuid,
  p_reason text,
  p_ban boolean default true
) returns json language plpgsql security definer as $$
begin
  if not exists(select 1 from public.users where id = p_admin_id and is_admin = true) then
    raise exception 'Not authorized';
  end if;
  update public.users
    set banned = p_ban,
        ban_reason = case when p_ban then p_reason else null end,
        updated_at = now()
    where id = p_user_id;
  if p_ban then
    insert into public.bans(user_id, type, reason, created_by)
      values (p_user_id, 'admin', p_reason, p_admin_id);
  end if;
  return json_build_object('ok', true, 'banned', p_ban);
end;
$$;

-- Short + long referral support
create or replace function public.ensure_user(
  p_telegram_id text,
  p_first_name text default '',
  p_last_name text default '',
  p_username text default null,
  p_start_param text default null
) returns public.users language plpgsql security definer as $$
declare
  v_user public.users;
  v_ref text;
  v_referrer uuid;
begin
  insert into public.users(telegram_id, first_name, last_name, username)
  values (p_telegram_id, coalesce(p_first_name,''), coalesce(p_last_name,''), p_username)
  on conflict (telegram_id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    username = excluded.username,
    updated_at = now()
  returning * into v_user;

  insert into public.wallets(user_id) values (v_user.id) on conflict (user_id) do nothing;

  if p_start_param is not null and p_start_param <> '' then
    if p_start_param like 'r_%' then
      select id into v_referrer from public.users where telegram_id = substring(p_start_param from 3) limit 1;
    elsif p_start_param like 'ref_%' then
      v_ref := substring(p_start_param from 5);
      begin
        v_referrer := v_ref::uuid;
      exception when others then
        v_referrer := null;
      end;
    end if;
    if v_referrer is not null
       and v_referrer <> v_user.id
       and not exists(select 1 from public.referrals where referred_id = v_user.id)
       and exists(select 1 from public.users where id = v_referrer) then
      insert into public.referrals(referrer_id, referred_id) values (v_referrer, v_user.id);
    end if;
  end if;

  return v_user;
end;
$$;

grant execute on function public.admin_adjust_balance(uuid, uuid, numeric, text) to service_role;
grant execute on function public.admin_ban_user(uuid, uuid, text, boolean) to service_role;
grant execute on function public.ensure_user(text, text, text, text, text) to service_role;
