-- Зріз add-bulk-decisions: масове схвалення записів черги менеджера однією функцією (AC-BULK-01…03).
-- Усе або нічого в одній транзакції: security invoker — RLS діє як для самого менеджера, тож невидимі записи
-- не відрізняються від неіснуючих. decided_by/decided_at ставить наявний тригер, клієнт їх не передає.

create or replace function public.approve_leave_records(p_record_ids uuid[])
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_count integer;
begin
  select coalesce(pg_catalog.array_agg(distinct x), '{}') into v_ids
  from pg_catalog.unnest(p_record_ids) as t(x);

  -- NULL усередині масиву — не запис черги.
  if p_record_ids is not null and exists (select 1 from pg_catalog.unnest(p_record_ids) as t(x) where x is null) then
    raise exception 'NOT_IN_QUEUE';
  end if;

  -- 1. Кожен вибраний запис має бути видимий і з підрозділу, яким керує викликач.
  if (
    select pg_catalog.count(*)
    from public.leave_records as r
    where r.id = any (v_ids) and (select private.is_division_manager(r.division_id))
  ) <> pg_catalog.cardinality(v_ids) then
    raise exception 'NOT_IN_QUEUE';
  end if;

  -- 2. Кожен має бути на розгляді.
  if exists (
    select 1 from public.leave_records as r where r.id = any (v_ids) and r.status <> 'pending'
  ) then
    raise exception 'NOT_PENDING';
  end if;

  update public.leave_records set status = 'approved' where id = any (v_ids) and status = 'pending';
  get diagnostics v_count = row_count;

  if v_count <> pg_catalog.cardinality(v_ids) then
    raise exception 'NOT_PENDING';
  end if;
  return v_count;
end;
$$;

revoke execute on function public.approve_leave_records(uuid[]) from public, anon;
grant execute on function public.approve_leave_records(uuid[]) to authenticated;

comment on function public.approve_leave_records(uuid[]) is
  'Масове схвалення: усі вибрані записи — з черги викликача й на розгляді, інакше NOT_IN_QUEUE / NOT_PENDING і жодна зміна.';
