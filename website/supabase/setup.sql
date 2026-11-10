-- Run once in YOUR Supabase SQL Editor. Replace the two example emails below first.
-- RLS = row-level security: permissions are enforced by the database, not the browser.
create table public.adventure_members (email text primary key);
alter table public.adventure_members enable row level security;
revoke all on public.adventure_members from anon, authenticated;
insert into public.adventure_members(email) values ('replace-with-qmi@example.com'), ('replace-with-yumi@example.com');
create function public.is_adventure_member() returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.adventure_members where lower(email)=lower(auth.jwt()->>'email'));
$$;
revoke all on function public.is_adventure_member() from public;
grant execute on function public.is_adventure_member() to authenticated;
create table public.adventure_state (id text primary key, payload jsonb, version integer not null default 0, updated_at timestamptz not null default now(), updated_by uuid);
insert into public.adventure_state(id) values ('qmi-yumi');
alter table public.adventure_state enable row level security;
create policy "members_read" on public.adventure_state for select to authenticated using (public.is_adventure_member());
revoke all on public.adventure_state from anon, authenticated;
grant select on public.adventure_state to authenticated;
create function public.save_adventure(expected_version integer,new_payload jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare new_version integer;
begin
if not public.is_adventure_member() then raise exception 'Access denied'; end if;
if new_payload->>'version' is distinct from '1' or jsonb_typeof(new_payload->'trips') is distinct from 'array' or octet_length(new_payload::text)>12000000 then raise exception 'Invalid backup payload'; end if;
update public.adventure_state set payload=new_payload,version=version+1,updated_at=now(),updated_by=auth.uid() where id='qmi-yumi' and version=expected_version returning version into new_version;
if new_version is null then raise exception '另一位成員已更新資料，請先匯出本機備份，再讀取最新雲端版本。'; end if;
return new_version;
end;
$$;
revoke all on function public.save_adventure(integer,jsonb) from public;
grant execute on function public.save_adventure(integer,jsonb) to authenticated;
