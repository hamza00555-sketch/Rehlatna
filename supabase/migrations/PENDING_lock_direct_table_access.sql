-- NOT APPLIED YET. Apply only after SUPABASE_SERVICE_ROLE_KEY is set on the
-- server (Vercel → Environment Variables, server-only, never NEXT_PUBLIC_)
-- and the app has been redeployed and smoke-tested with it.
--
-- Once the app talks to the database exclusively through the service-role
-- client (src/server/store.ts), the browser-facing anon/authenticated roles
-- no longer need table access at all: a leaked or crafted session token can
-- then read nothing, even if a future RLS policy has a hole. RLS stays on
-- as defence in depth; the policies simply stop being the last line.
--
-- Rollback (if the app must run without the service key again):
--   grant select, insert, update, delete on public.households to authenticated;
--   grant select, insert, delete on public.household_members to authenticated;

revoke all on public.households from authenticated, anon;
revoke all on public.household_members from authenticated, anon;
revoke execute on function public.is_household_member(text) from authenticated;
