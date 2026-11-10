-- READ ONLY: run in the project's SQL Editor. Returns rules/counts, never travel data or email addresses.
select relname, relrowsecurity, relforcerowsecurity from pg_class where oid in ('public.adventure_members'::regclass,'public.adventure_state'::regclass,'storage.objects'::regclass);
select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies where tablename in ('adventure_members','adventure_state','objects') order by schemaname,tablename,policyname;
select table_schema,table_name,grantee,privilege_type from information_schema.role_table_grants where table_name in ('adventure_members','adventure_state') and grantee in ('anon','authenticated','PUBLIC');
select p.proname,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('save_adventure','is_adventure_member');
select routine_name,grantee,privilege_type from information_schema.routine_privileges where routine_schema='public' and routine_name in ('save_adventure','is_adventure_member') and grantee in ('anon','authenticated','PUBLIC');
select id,public,file_size_limit from storage.buckets where id='adventure-attachments';
select count(*) as authorized_member_count from public.adventure_members;
