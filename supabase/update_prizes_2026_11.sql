-- Run in Supabase SQL Editor as project owner. 11-sector corporate wheel, 18 Nov 2026.
-- The premium is a visibly disclosed non-draw sector; server selection excludes it.
-- Existing spin history is preserved (removed prize foreign keys become NULL).
begin;
alter table public.fortune_prizes add column if not exists is_display_only boolean not null default false;
delete from public.fortune_prizes;
insert into public.fortune_prizes(title,description,is_anti,is_display_only,sort_order)
values
 ('Антидедлайн','Право продлить дедлайн по любой внутренней задаче на 24 часа.',false,false,0),
 ('Официальный высыпон','Возможность один раз прийти на работу к 10:00.',false,false,1),
 ('Мерч-сюрприз','Брендированный мерч на выбор.',false,false,2),
 ('Пятничная свобода','Право уйти с работы в пятницу в 15:00.',false,false,3),
 ('Главный герой офиса','Сегодня ты именинник! Принимай поздравления и комплименты в течение всего дня от сотрудников ОП.',false,false,4),
 ('Личный сиеста-час','Право увеличить обеденный перерыв на один час в любой день.',false,false,5),
 ('Именинный отгул','Дополнительный оплачиваемый выходной в день рождения или в течение недели после него.',false,false,6),
 ('Премия 500 000 ₽ до вычета НДФЛ','Специальный денежный сектор.',false,true,7),
 ('Плюс в карму','Официальная благодарность от генерального директора в общем чате с указанием заслуг.',false,false,8),
 ('Стратегический перекус','Угости коллег вкусной пиццей в пятницу в офисе ОП.',false,false,9),
 ('Энергия на максимум','Сгоняй в спортзал, вернись бодрым и покажи, как надо закрывать задачи на 300%.',false,false,10);
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
