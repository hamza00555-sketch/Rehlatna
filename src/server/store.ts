import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { HouseholdData } from "@/domain/types";
import { todayIso } from "@/domain/dates";
import { demoHouseholds } from "@/fixtures/demo";
import { supabaseAdmin, supabaseConfigured, supabaseServer } from "./supabase";

/**
 * Storage adapters keyed by household. Production: Supabase Postgres (one
 * JSONB snapshot per household, access governed by row-level security on
 * membership). Development without Supabase: a JSON file. Demo: memory.
 */

export type StoreMode = "live" | "demo";

/** A snapshot with the version it was read at (compare-and-set token). */
export interface Versioned {
  data: HouseholdData;
  version: number;
}

/** Thrown by `putIf` when the stored version moved on since the read. */
export class ConflictError extends Error {
  constructor(id: string) {
    super(`households.putIf: version conflict on ${id}`);
    this.name = "ConflictError";
  }
}

export interface StoreAdapter {
  get(id: string): Promise<HouseholdData | null>;
  getVersioned(id: string): Promise<Versioned | null>;
  /** Persists an existing household unconditionally (last write wins). */
  put(data: HouseholdData): Promise<void>;
  /** Persists only when the stored version still equals `version`; otherwise throws ConflictError. */
  putIf(data: HouseholdData, version: number): Promise<void>;
  /** Creates a household and records the creator's membership. */
  create(data: HouseholdData, owner: { userId: string; memberId: string }): Promise<void>;
  /** Deletes a household; when `requesterUserId` is given, only its owner may delete. */
  remove(id: string, requesterUserId?: string): Promise<void>;
}

interface AppState {
  version: 1;
  households: Record<string, HouseholdData>;
  /** Per-household write counters (compare-and-set token). */
  versions?: Record<string, number>;
}
const emptyState = (): AppState => ({ version: 1, households: {}, versions: {} });

class FileStore implements StoreAdapter {
  private cache: AppState | null = null;
  constructor(private readonly path: string) {}
  private async read(): Promise<AppState> {
    if (this.cache) return this.cache;
    try {
      this.cache = JSON.parse(await readFile(this.path, "utf8")) as AppState;
    } catch {
      this.cache = emptyState();
    }
    return this.cache;
  }
  private async write(state: AppState): Promise<void> {
    this.cache = state;
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(state, null, 2), "utf8");
  }
  async get(id: string) {
    return (await this.read()).households[id] ?? null;
  }
  async getVersioned(id: string) {
    const state = await this.read();
    const data = state.households[id];
    return data ? { data, version: state.versions?.[id] ?? 0 } : null;
  }
  async put(data: HouseholdData) {
    const state = await this.read();
    const id = data.household.id;
    const version = (state.versions?.[id] ?? 0) + 1;
    await this.write({ ...state, households: { ...state.households, [id]: data }, versions: { ...state.versions, [id]: version } });
  }
  async putIf(data: HouseholdData, version: number) {
    const state = await this.read();
    if ((state.versions?.[data.household.id] ?? 0) !== version) throw new ConflictError(data.household.id);
    await this.put(data);
  }
  async create(data: HouseholdData) {
    await this.put(data);
  }
  async remove(id: string) {
    const state = await this.read();
    const { [id]: _gone, ...rest } = state.households;
    await this.write({ ...state, households: rest });
  }
}

class MemoryStore implements StoreAdapter {
  private households = new Map<string, HouseholdData>();
  private versions = new Map<string, number>();
  /**
   * Serverless hosts run many isolated instances; a demo entered on one must
   * still resolve on another. Fixtures are deterministic for a given day, so
   * an empty instance seeds itself on first read (edits stay per instance —
   * acceptable for a demo, documented in docs/limitations.md).
   */
  async get(id: string) {
    if (this.households.size === 0) this.reset(demoHouseholds(todayIso()));
    return this.households.get(id) ?? null;
  }
  async getVersioned(id: string) {
    const data = await this.get(id);
    return data ? { data, version: this.versions.get(id) ?? 0 } : null;
  }
  async put(data: HouseholdData) {
    const id = data.household.id;
    this.households.set(id, data);
    this.versions.set(id, (this.versions.get(id) ?? 0) + 1);
  }
  async putIf(data: HouseholdData, version: number) {
    if ((this.versions.get(data.household.id) ?? 0) !== version) throw new ConflictError(data.household.id);
    await this.put(data);
  }
  async create(data: HouseholdData) {
    await this.put(data);
  }
  async remove(id: string) {
    this.households.delete(id);
    this.versions.delete(id);
  }
  reset(list: HouseholdData[]) {
    this.households = new Map(list.map((h) => [h.household.id, h]));
    this.versions = new Map();
  }
  get size() {
    return this.households.size;
  }
}

/**
 * Server-side data access. With SUPABASE_SERVICE_ROLE_KEY set, queries run
 * through the service client (RLS bypassed) and this module is the only
 * authority on who may touch which household — every call below therefore
 * scopes explicitly by household id, membership or owner. Without the key
 * (local development), the user's own session client is used and RLS
 * enforces the same rules a second time.
 */
async function db() {
  return supabaseAdmin() ?? (await supabaseServer());
}

class SupabaseStore implements StoreAdapter {
  async get(id: string) {
    return (await this.getVersioned(id))?.data ?? null;
  }
  async getVersioned(id: string) {
    const supabase = await db();
    const { data, error } = await supabase.from("households").select("data, version").eq("id", id).maybeSingle();
    if (error) throw new Error(`households.get: ${error.message}`);
    if (!data) return null;
    return { data: data.data as HouseholdData, version: (data.version as number | null) ?? 0 };
  }
  async put(data: HouseholdData) {
    const supabase = await db();
    const { error, count } = await supabase.from("households").update({ data }, { count: "exact" }).eq("id", data.household.id);
    if (error) throw new Error(`households.put: ${error.message}`);
    if (count === 0) throw new Error("households.put: no row updated (membership missing?)");
  }
  async putIf(data: HouseholdData, version: number) {
    const supabase = await db();
    const { error, count } = await supabase
      .from("households")
      .update({ data, version: version + 1 }, { count: "exact" })
      .eq("id", data.household.id)
      .eq("version", version);
    if (error) throw new Error(`households.putIf: ${error.message}`);
    if (count !== 1) throw new ConflictError(data.household.id);
  }
  async create(data: HouseholdData, owner: { userId: string; memberId: string }) {
    const supabase = await db();
    const id = data.household.id;
    const inserted = await supabase.from("households").insert({ id, data, owner_user_id: owner.userId, version: 1 });
    if (inserted.error) throw new Error(`households.create: ${inserted.error.message}`);
    const member = await supabase.from("household_members").insert({ household_id: id, user_id: owner.userId, member_id: owner.memberId });
    if (member.error) {
      await supabase.from("households").delete().eq("id", id);
      throw new Error(`household_members.create: ${member.error.message}`);
    }
  }
  async remove(id: string, requesterUserId?: string) {
    const supabase = await db();
    let query = supabase.from("households").delete({ count: "exact" }).eq("id", id);
    if (requesterUserId) query = query.eq("owner_user_id", requesterUserId);
    const { error, count } = await query;
    if (error) throw new Error(`households.remove: ${error.message}`);
    if (count === 0) throw new Error("households.remove: not_owner");
  }
}

type Registry = { file?: FileStore; demo?: MemoryStore; supabase?: SupabaseStore };
const registry: Registry = ((globalThis as unknown as { __rjStores?: Registry }).__rjStores ??= {});

function fileStore(): FileStore {
  // Serverless hosts expose a read-only bundle; /tmp is writable but ephemeral.
  const fallback = process.env.VERCEL ? "/tmp/rehlatna-store.json" : join(process.cwd(), ".data", "store.json");
  registry.file ??= new FileStore(process.env.DATA_FILE ?? fallback);
  return registry.file;
}

function demoStore(): MemoryStore {
  registry.demo ??= new MemoryStore();
  return registry.demo;
}

export function getStore(mode: StoreMode): StoreAdapter {
  if (mode === "demo") return demoStore();
  if (supabaseConfigured()) return (registry.supabase ??= new SupabaseStore());
  return fileStore();
}

export async function readHousehold(mode: StoreMode, id: string): Promise<HouseholdData | null> {
  return getStore(mode).get(id);
}

export async function writeHousehold(mode: StoreMode, data: HouseholdData): Promise<void> {
  await getStore(mode).put(data);
}

export async function readHouseholdVersioned(mode: StoreMode, id: string): Promise<Versioned | null> {
  return getStore(mode).getVersioned(id);
}

export async function writeHouseholdIf(mode: StoreMode, data: HouseholdData, version: number): Promise<void> {
  await getStore(mode).putIf(data, version);
}

/** Replaces the whole demo state (used by demo seed/reset). */
export function resetDemoState(households: HouseholdData[]): void {
  demoStore().reset(households);
}

export async function demoHasData(): Promise<boolean> {
  return demoStore().size > 0;
}

export interface Membership {
  householdId: string;
  memberId: string;
  /** The household snapshot, embedded in the same query (RLS still applies). */
  data: HouseholdData | null;
}

/** The household a signed-in user belongs to, with its snapshot, in one round trip (Supabase only). */
export async function membershipFor(userId: string): Promise<Membership | null> {
  if (!supabaseConfigured()) return null;
  const supabase = await db();
  const { data, error } = await supabase
    .from("household_members")
    .select("household_id, member_id, households(data)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`household_members.lookup: ${error.message}`);
  if (!data) return null;
  const embedded = data.households as unknown as { data: HouseholdData } | { data: HouseholdData }[] | null;
  const snapshot = Array.isArray(embedded) ? embedded[0]?.data ?? null : embedded?.data ?? null;
  return { householdId: data.household_id as string, memberId: data.member_id as string, data: snapshot };
}
