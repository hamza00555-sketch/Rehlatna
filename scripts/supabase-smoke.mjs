// End-to-end check of the Supabase path against a running server:
// signs in with a password user, creates a household through the real API,
// reads it back through the pages, mutates it, exports it, deletes it.
//   NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… SMOKE_EMAIL=… SMOKE_PASSWORD=… node scripts/supabase-smoke.mjs
import { createServerClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const base = process.env.BASE_URL ?? "http://localhost:3000";
const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;
if (!url || !key || !email || !password) throw new Error("missing env");

const jar = new Map();
const ssr = createServerClient(url, key, {
  cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: (list) => list.forEach((c) => jar.set(c.name, c.value)),
  },
});
const signed = await ssr.auth.signInWithPassword({ email, password });
if (signed.error) throw signed.error;
console.log(`✓ signed in as ${signed.data.user.email} (${jar.size} cookie chunk(s))`);

const cookieHeader = () => [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
function absorb(res) {
  const set = res.headers.getSetCookie?.() ?? [];
  for (const line of set) {
    const [pair, ...attrs] = line.split(";");
    const idx = pair.indexOf("=");
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1);
    const expired = attrs.some((a) => /max-age=0/i.test(a));
    if (expired) jar.delete(name);
    else jar.set(name, value);
  }
}
async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    redirect: "manual",
    headers: { cookie: cookieHeader(), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  absorb(res);
  return res;
}
function expect(cond, label) {
  console.log(`${cond ? "✓" : "✗"} ${label}`);
  if (!cond) process.exitCode = 1;
}

let res = await call("GET", "/onboarding/start");
expect(res.status === 200, `GET /onboarding/start → ${res.status} (signed in, no household yet)`);

res = await call("GET", "/today");
expect(res.status === 307 && res.headers.get("location")?.includes("/onboarding"), `GET /today → ${res.status} redirect before onboarding`);

res = await call("POST", "/api/onboarding", {
  dueDate: "2027-04-02",
  creator: { displayName: "اختبار", roles: ["partner"] },
  partner: { displayName: "شريك", roles: ["mother"] },
  finance: { enabled: true, owner: "creator", shared: false },
  followUpCity: "مدينة أ",
  deliveryCity: "مدينة ب",
});
const created = await res.json();
expect(res.status === 200 && created.householdId, `POST /api/onboarding → ${res.status} ${created.householdId ?? JSON.stringify(created)}`);

for (const path of ["/today", "/journey", "/preparation", "/finance", "/more", "/more/settings"]) {
  res = await call("GET", path);
  expect(res.status === 200, `GET ${path} → ${res.status}`);
}

res = await call("PATCH", "/api/household/settings", { theme: "dark" });
expect(res.status === 200, `PATCH /api/household/settings → ${res.status}`);

res = await call("GET", "/api/household/export");
const exported = await res.json();
expect(exported?.data?.household?.settings?.theme === "dark", `export reflects the update (theme=${exported?.data?.household?.settings?.theme})`);
expect(exported?.data?.members?.[0]?.userId === signed.data.user.id, `creator member carries the auth user id`);

res = await call("POST", "/api/session/member", { memberId: exported.data.members[1].id });
expect(res.status === 403, `member switcher disabled on real sessions → ${res.status}`);

res = await call("DELETE", "/api/household");
const wiped = await res.json();
expect(res.status === 200 && wiped.redirect === "/onboarding/start", `DELETE /api/household → ${res.status} → ${wiped.redirect}`);
res = await call("GET", "/today");
expect(res.status === 307, `GET /today after delete → ${res.status} redirect`);

res = await call("POST", "/api/session/exit");
expect(res.status === 200, `POST /api/session/exit → ${res.status}`);
res = await call("GET", "/onboarding/start");
expect(res.status === 307 && res.headers.get("location")?.includes("/auth"), `signed out: /onboarding/start → ${res.status} → /auth`);
console.log(process.exitCode ? "SMOKE FAILED" : "SMOKE OK");
