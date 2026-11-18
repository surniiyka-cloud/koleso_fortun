-- Run once in Supabase SQL Editor as the database owner.
-- Secure targeted deletion for an authenticated wheel administrator only.
create or replace function public.fortune_delete_spin(p_spin_id uuid)
returns boolean language plpgsql security definer
set search_path = ''
as $$
declare deleted_count integer;
begin
 if (select auth.uid()) is null or not public.fortune_is_admin() then
  raise exception 'Administrator access required' using errcode='42501';
 end if;
 delete from public.fortune_spins where id=p_spin_id;
 get diagnostics deleted_count = row_count;
 return deleted_count=1;
end;
$$;
revoke all on function public.fortune_delete_spin(uuid) from public, anon;
grant execute on function public.fortune_delete_spin(uuid) to authenticated;
