-- TIAN Fortune · Supabase/Postgres setup (run once in SQL Editor)
-- IMPORTANT: create your administrator in Authentication > Users before assigning the admin role.
create extension if not exists pgcrypto;
create table if not exists public.fortune_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.fortune_prizes (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(trim(title)) between 1 and 120),
 description text not null default '',
 is_anti boolean not null default false,
 sort_order integer not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists public.fortune_spins (
 id uuid primary key default gen_random_uuid(),
 full_name text not null,
 name_key text not null,
 prize_id uuid references public.fortune_prizes(id) on delete set null,
 prize_title text not null,
 is_anti boolean not null,
 created_at timestamptz not null default now()
);
create unique index if not exists fortune_one_win_per_name
 on public.fortune_spins(name_key) where is_anti = false;
create index if not exists fortune_spins_created on public.fortune_spins(created_at desc);
create unique index if not exists fortune_one_anti_per_name
 on public.fortune_spins(name_key) where is_anti = true;

create or replace function public.fortune_is_admin()
returns boolean language sql stable security definer
set search_path = '' as $$
 select exists(select 1 from public.fortune_admins a where a.user_id = (select auth.uid()));
$$;

alter table public.fortune_admins enable row level security;
alter table public.fortune_prizes enable row level security;
alter table public.fortune_spins enable row level security;

drop policy if exists "prizes readable" on public.fortune_prizes;
create policy "prizes readable" on public.fortune_prizes for select to anon, authenticated using (true);
drop policy if exists "admins manage prizes" on public.fortune_prizes;
create policy "admins manage prizes" on public.fortune_prizes for all to authenticated using (public.fortune_is_admin()) with check (public.fortune_is_admin());
drop policy if exists "admins read history" on public.fortune_spins;
create policy "admins read history" on public.fortune_spins for select to authenticated using (public.fortune_is_admin());
-- No client insert/update/delete policies for spins/admin roles.

-- A server-side atomic draw: the browser cannot choose or overwrite the winner.
-- Name-only identification is not secure identity verification; distribute private participation codes
-- or use employee authentication if strict one-person enforcement is needed.
create or replace function public.fortune_draw(p_first text, p_last text)
returns table (prize_id uuid, prize_title text, prize_description text, is_anti boolean)
language plpgsql security definer set search_path = '' as $$
declare
 v_first text := trim(regexp_replace(coalesce(p_first,''), '\s+', ' ', 'g'));
 v_last text := trim(regexp_replace(coalesce(p_last,''), '\s+', ' ', 'g'));
 v_key text;
 v_anti_before boolean;
 v_pick public.fortune_prizes%rowtype;
begin
 if length(v_first) not between 2 and 60 or length(v_last) not between 2 and 60
 or v_first !~ '^[[:alpha:] -]+$' or v_last !~ '^[[:alpha:] -]+$' then
   raise exception 'Укажи корректные имя и фамилию.' using errcode='P0001';
 end if;
 v_key := lower(v_first || ' ' || v_last);
 perform pg_advisory_xact_lock(hashtextextended(v_key, 3819));
 if exists(select 1 from public.fortune_spins s where s.name_key=v_key and not s.is_anti) then
  raise exception 'Этот участник уже получил подарок.' using errcode='P0001';
 end if;
 select exists(select 1 from public.fortune_spins s where s.name_key=v_key and s.is_anti)
 into v_anti_before;
 select p.* into v_pick
 from public.fortune_prizes p
 where (not v_anti_before or not p.is_anti)
 order by random() limit 1;
 if not found then
   raise exception 'Нет доступных призов.' using errcode='P0001';
 end if;
 insert into public.fortune_spins(full_name,name_key,prize_id,prize_title,is_anti)
 values (v_first || ' ' || v_last,v_key,v_pick.id,v_pick.title,v_pick.is_anti);
 return query select v_pick.id,v_pick.title,v_pick.description,v_pick.is_anti;
end;$$;

revoke all on public.fortune_admins from anon, authenticated;
revoke all on public.fortune_spins from anon, authenticated;
revoke all on public.fortune_prizes from anon, authenticated;
grant select on public.fortune_prizes to anon, authenticated;
grant insert, update, delete on public.fortune_prizes to authenticated;
grant select on public.fortune_spins to authenticated;
revoke all on function public.fortune_is_admin() from public, anon;
grant execute on function public.fortune_is_admin() to authenticated;
revoke all on function public.fortune_draw(text,text) from public;
grant execute on function public.fortune_draw(text,text) to anon, authenticated;

insert into public.fortune_prizes(title,description,is_anti,sort_order)
select v.title,v.description,v.is_anti,v.sort_order
from (values
 ('Антидедлайн','Продли дедлайн внутренней задачи на 24 часа.',false,0),
 ('Официальный высыпон','Опоздай на работу на 1–2 часа без последствий.',false,1),
 ('Право на тишину','День без несрочных тегов и планёрок.',false,2),
 ('Мерч-сюрприз','Фирменный мерч на выбор.',false,3),
 ('Пятничная свобода','Уходи в пятницу на 2–3 часа раньше без отработки.',false,4),
 ('Абонемент на опоздания','Три опоздания до 30 минут в течение месяца.',false,5),
 ('День удалёнки','Работай из дома один день без объяснения причин.',false,6),
 ('Личный сиеста-час','Дополнительный час обеденного перерыва.',false,7),
 ('Именинный отгул','Дополнительный оплачиваемый выходной на день рождения или в течение недели.',false,8),
 ('Индивидуальный менторинг','Час общения с топ-менеджером или директором.',false,9),
 ('День самообразования','День для профессионального обучения без текущих задач.',false,10),
 ('Антикарточка','Выйти в субботу на работу до 12:00.',true,11)
) as v(title,description,is_anti,sort_order)
where not exists (select 1 from public.fortune_prizes);
-- FINAL ONE-TIME STEP, after creating the admin user through Supabase Auth:
-- insert into public.fortune_admins(user_id)
-- select id from auth.users where email = 'your-admin-email@example.com'
-- on conflict do nothing;


-- Admin history maintenance
-- Apply once in Supabase SQL Editor. Admin-only destructive maintenance.
-- The server verifies the authenticated user's admin role before deletion.
create or replace function public.fortune_clear_history()
returns bigint
language plpgsql security definer
set search_path = ''
as $$
declare
  deleted_count bigint;
begin
  if not public.fortune_is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  delete from public.fortune_spins where id is not null;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
revoke all on function public.fortune_clear_history() from public, anon;
grant execute on function public.fortune_clear_history() to authenticated;
