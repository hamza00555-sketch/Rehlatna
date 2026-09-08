-- Applied to project bryhvicmqweixeewxocg on 2026-09-08 (kept here as the source of truth).
-- One household = one JSON snapshot. Field-level privacy (finance) is
-- enforced at the app's serialisation boundary; the database enforces
-- WHO may read or write a household at all, via membership.

create table public.households (
  id text primary key,
  data jsonb not null,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  household_id text not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  member_id text not null,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index household_members_user_idx on public.household_members (user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger households_touch
before update on public.households
for each row execute function public.touch_updated_at();

-- Membership check used by the households policies. SECURITY INVOKER: it
-- reads household_members under that table's own RLS (a user sees only
-- their rows), which is exactly what the policies need.
create or replace function public.is_household_member(hid text)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from public.household_members hm
    where hm.household_id = hid and hm.user_id = (select auth.uid())
  );
$$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;

create policy "members read their household"
  on public.households for select to authenticated
  using (public.is_household_member(id));
create policy "owner creates a household"
  on public.households for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy "members update their household"
  on public.households for update to authenticated
  using (public.is_household_member(id)) with check (public.is_household_member(id));
create policy "owner deletes the household"
  on public.households for delete to authenticated
  using (owner_user_id = (select auth.uid()));

create policy "members see their own membership rows"
  on public.household_members for select to authenticated
  using (user_id = (select auth.uid()));
create policy "self or owner adds membership"
  on public.household_members for insert to authenticated
  with check (
    user_id = (select auth.uid())
    or exists (select 1 from public.households h where h.id = household_id and h.owner_user_id = (select auth.uid()))
  );
create policy "owner removes membership"
  on public.household_members for delete to authenticated
  using (exists (select 1 from public.households h where h.id = household_id and h.owner_user_id = (select auth.uid())));

grant select, insert, update, delete on public.households to authenticated;
grant select, insert, delete on public.household_members to authenticated;
revoke all on public.households from anon;
revoke all on public.household_members from anon;
revoke execute on function public.is_household_member(text) from anon, public;
grant execute on function public.is_household_member(text) to authenticated;
revoke execute on function public.touch_updated_at() from anon, public, authenticated;
