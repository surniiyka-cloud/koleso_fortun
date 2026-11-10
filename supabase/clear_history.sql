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
  delete from public.fortune_spins;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
revoke all on function public.fortune_clear_history() from public, anon;
grant execute on function public.fortune_clear_history() to authenticated;
