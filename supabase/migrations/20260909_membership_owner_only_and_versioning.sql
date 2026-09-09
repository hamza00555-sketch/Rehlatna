-- Applied to project bryhvicmqweixeewxocg on 2026-09-09 (kept here as the source of truth).
--
-- 1. Membership self-join closed. The original insert policy let any signed-in
--    user add themselves to ANY household by id. Only the household owner may
--    now add members (partner invites will go through a server-issued token).
-- 2. Optimistic concurrency. `version` is bumped on every write; the app
--    writes with `where version = <read version>` so two people editing at
--    once cannot silently overwrite each other (see src/server/http.ts).

drop policy if exists "self or owner adds membership" on public.household_members;
create policy "owner adds membership"
  on public.household_members for insert to authenticated
  with check (
    exists (select 1 from public.households h where h.id = household_id and h.owner_user_id = (select auth.uid()))
  );

-- The owner must be able to read the household they just created, before the
-- membership row exists (create is two statements, not one transaction).
create policy "owner reads own household"
  on public.households for select to authenticated
  using (owner_user_id = (select auth.uid()));

alter table public.households add column if not exists version integer not null default 1;
