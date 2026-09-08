import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { HouseholdData } from "@/domain/types";
import { supabaseConfigured, supabaseServer } from "./supabase";

/**
 * Storage adapters keyed by household. Production: Supabase Postgres (one
 * JSONB snapshot per household, access governed by row-level security on
 * membership). Development without Supabase: a JSON file. Demo: memory.
 */

export type StoreMode = "live" | "demo";

export interface StoreAdapter {
  get(id: string): Promise<HouseholdData | null>;
  /** Persists an existing household. */
  put(data: HouseholdData): Promise<void>;
  /** Creates a household and records the creator's membership. */
  create(data: HouseholdData, owner: { userId: string; memberId: string }): Promise<void>;
  remove(id: string): Promise<void>;
}

interface AppState {
  version: 1;
  households: Record<string, HouseholdData>;
}
const emptyState = (): AppState => ({ version: 1, households: {} });

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
  async put(data: HouseholdData) {
    const state = await this.read();
    await this.write({ ...state, households: { ...state.households, [data.household.id]: data } });
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
  async get(id: string) {
    return this.households.get(id) ?? null;
  }
  async put(data: HouseholdData) {
    this.households.set(data.household.id, data);
  }
  async create(data: HouseholdData) {
    this.households.set(data.household.id, data);
  }
  async remove(id: string) {
    this.households.delete(id);
  }
  reset(list: HouseholdData[]) {
    this.households = new Map(list.map((h) => [h.household.id, h]));
  }
  get size() {
    return this.households.size;
  }
}

class SupabaseStore implements StoreAdapter {
  async get(id: string) {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.from("households").select("data").eq("id", id).maybeSingle();
    if (error) throw new Error(`households.get: ${error.message}`);
    return (data?.data as HouseholdData | undefined) ?? null;
  }
  async put(data: HouseholdData) {
    const supabase = await supabaseServer();
    const { error, count } = await supabase.from("households").update({ data }, { count: "exact" }).eq("id", data.household.id);
    if (error) throw new Error(`households.put: ${error.message}`);
    if (count === 0) throw new Error("households.put: no row updated (membership missing?)");
  }
  async create(data: HouseholdData, owner: { userId: string; memberId: string }) {
    const supabase = await supabaseServer();
    const id = data.household.id;
    const inserted = await supabase.from("households").insert({ id, data, owner_user_id: owner.userId });
    if (inserted.error) throw new Error(`households.create: ${inserted.error.message}`);
    const member = await supabase.from("household_members").insert({ household_id: id, user_id: owner.userId, member_id: owner.memberId });
    if (member.error) {
      await supabase.from("households").delete().eq("id", id);
      throw new Error(`household_members.create: ${member.error.message}`);
    }
  }
  async remove(id: string) {
    const supabase = await supabaseServer();
    const { error } = await supabase.from("households").delete().eq("id", id);
    if (error) throw new Error(`households.remove: ${error.message}`);
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

/** Replaces the whole demo state (used by demo seed/reset). */
export function resetDemoState(households: HouseholdData[]): void {
  demoStore().reset(households);
}

export async function demoHasData(): Promise<boolean> {
  return demoStore().size > 0;
}

/** The household a signed-in user belongs to (Supabase only). */
export async function membershipFor(userId: string): Promise<{ householdId: string; memberId: string } | null> {
  if (!supabaseConfigured()) return null;
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("household_members")
    .select("household_id, member_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`household_members.lookup: ${error.message}`);
  return data ? { householdId: data.household_id as string, memberId: data.member_id as string } : null;
}
