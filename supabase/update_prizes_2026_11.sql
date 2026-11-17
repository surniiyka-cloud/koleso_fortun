-- Apply in Supabase SQL Editor as the project owner.
-- Replaces the wheel catalog; existing historical result names remain stored.
-- Cash amounts and BMW X5 are disclosed display-only sectors and are never eligible for the server draw.
begin;
alter table public.fortune_prizes add column if not exists is_display_only boolean not null default false;

-- Historical spins keep their prize_title; foreign keys become NULL when old prizes are removed.
delete from public.fortune_prizes;
insert into public.fortune_prizes(title,description,is_anti,is_display_only,sort_order)
values
 ('Антидедлайн','Право продлить дедлайн по любой внутренней задаче на 24 часа.',false,false,0),
 ('Официальный высыпон','Возможность один раз опоздать на работу на 1–2 часа.',false,false,1),
 ('Мерч-сюрприз','Брендированный мерч на выбор.',false,false,2),
 ('Пятничная свобода','Право уйти в пятницу с работы на 2–3 часа раньше без отработки.',false,false,3),
 ('Абонемент на опоздания','Три опоздания до 30 минут в течение месяца.',false,false,4),
 ('День удаленки без объяснения причин','Право поработать из дома в любой выбранный день без объяснения причины.',false,false,5),
 ('Личный сиеста-час','Право увеличить обеденный перерыв на один час в любой день.',false,false,6),
 ('Именинный отгул','Дополнительный оплачиваемый выходной в день рождения или в течение недели после него.',false,false,7),
 ('Официальный день самообразования','Рабочий день без текущих задач для профильных книг, курсов и вебинаров.',false,false,8),
 ('Плюс в карму','Официальная благодарность от директора в общем чате с указанием заслуг.',false,false,9),
 ('Статус «Не беспокоить»','Право на два часа поставить статус «Не беспокоить» без объяснений.',false,false,10),
 ('100 000 ₽','Демонстрационный денежный сектор.',false,true,11),
 ('500 000 ₽','Демонстрационный денежный сектор.',false,true,12),
 ('1 000 000 ₽','Демонстрационный денежный сектор.',false,true,13),
 ('BMW X5 · 19 300 000 ₽','Демонстрационный сектор BMW X5 2026 (G65). Ориентировочная цена 19 300 000 ₽ по Autonews от 16.11.2026, бензиновая версия 3,0 л, 400 л.с. Не участвует в розыгрыше.',false,true,14);

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
 where not p.is_display_only and (not v_anti_before or not p.is_anti)
 order by random() limit 1;
 if not found then
   raise exception 'Нет доступных призов.' using errcode='P0001';
 end if;
 insert into public.fortune_spins(full_name,name_key,prize_id,prize_title,is_anti)
 values (v_first || ' ' || v_last,v_key,v_pick.id,v_pick.title,v_pick.is_anti);
 return query select v_pick.id,v_pick.title,v_pick.description,v_pick.is_anti;
end;$$;
commit;
