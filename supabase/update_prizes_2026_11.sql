-- Birthday theater wheel: 1 fixed gift and 9 clearly disclosed decorative million sectors.
-- Must be applied by project owner through Supabase SQL Editor.
begin;
alter table public.fortune_prizes add column if not exists is_display_only boolean not null default false;
delete from public.fortune_prizes;
insert into public.fortune_prizes(title,description,is_anti,is_display_only,sort_order) values
 ('Именинный отгул','Дополнительный оплачиваемый выходной в день рождения или в течение недели после него.',false,false,0),
 ('1 000 000 ₽','',false,true,1),
 ('1 000 000 ₽','',false,true,2),
 ('1 000 000 ₽','',false,true,3),
 ('1 000 000 ₽','',false,true,4),
 ('1 000 000 ₽','',false,true,5),
 ('1 000 000 ₽','',false,true,6),
 ('1 000 000 ₽','',false,true,7),
 ('1 000 000 ₽','',false,true,8),
 ('1 000 000 ₽','',false,true,9);
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
 where p.title='Именинный отгул' and not p.is_display_only and not p.is_anti
 order by random() limit 1;
 if not found then
   raise exception 'Нет доступных призов.' using errcode='P0001';
 end if;
 insert into public.fortune_spins(full_name,name_key,prize_id,prize_title,is_anti)
 values (v_first || ' ' || v_last,v_key,v_pick.id,v_pick.title,v_pick.is_anti);
 return query select v_pick.id,v_pick.title,v_pick.description,v_pick.is_anti;
end;$$;


commit;
