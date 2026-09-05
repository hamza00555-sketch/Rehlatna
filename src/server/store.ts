import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { HouseholdData } from "@/domain/types";

/**
 * Storage adapter. Development persists to a JSON file (.data/store.json,
 * gitignored); the demo runs in memory and can be reset at will. Swap
 * `FileStore` for a database-backed adapter without touching callers.
 */

export type StoreMode = "live" | "demo";

export interface AppState {
  version: 1;
  households: Record<string, HouseholdData>;
}

export interface StoreAdapter {
  read(): Promise<AppState>;
  write(state: AppState): Promise<void>;
}

const emptyState = (): AppState => ({ version: 1, households: {} });

class FileStore implements StoreAdapter {
  private cache: AppState | null = null;
  constructor(private readonly path: string) {}

  async read(): Promise<AppState> {
    if (this.cache) return this.cache;
    try {
      const raw = await readFile(this.path, "utf8");
      this.cache = JSON.parse(raw) as AppState;
    } catch {
      this.cache = emptyState();
    }
    return this.cache;
  }

  async write(state: AppState): Promise<void> {
    this.cache = state;
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(state, null, 2), "utf8");
  }
}

class MemoryStore implements StoreAdapter {
  constructor(private state: AppState = emptyState()) {}
  async read(): Promise<AppState> {
    return this.state;
  }
  async write(state: AppState): Promise<void> {
    this.state = state;
  }
  reset(state: AppState): void {
    this.state = state;
  }
}

type Registry = { live?: FileStore; demo?: MemoryStore };
const registry: Registry = ((globalThis as unknown as { __rjStores?: Registry }).__rjStores ??= {});

function liveStore(): FileStore {
  // Serverless hosts (Vercel) expose a read-only bundle; /tmp is the only
  // writable path there and is ephemeral — fine for review, not for production.
  const fallback = process.env.VERCEL ? "/tmp/rehlatna-store.json" : join(process.cwd(), ".data", "store.json");
  registry.live ??= new FileStore(process.env.DATA_FILE ?? fallback);
  return registry.live;
}

function demoStore(): MemoryStore {
  registry.demo ??= new MemoryStore();
  return registry.demo;
}

export function getStore(mode: StoreMode): StoreAdapter {
  return mode === "demo" ? demoStore() : liveStore();
}

export async function readHousehold(mode: StoreMode, id: string): Promise<HouseholdData | null> {
  const state = await getStore(mode).read();
  return state.households[id] ?? null;
}

export async function writeHousehold(mode: StoreMode, data: HouseholdData): Promise<void> {
  const store = getStore(mode);
  const state = await store.read();
  await store.write({
    ...state,
    households: { ...state.households, [data.household.id]: data },
  });
}

/** Replaces the whole demo state (used by demo seed/reset). */
export function resetDemoState(households: HouseholdData[]): void {
  const state = emptyState();
  for (const h of households) state.households[h.household.id] = h;
  demoStore().reset(state);
}

export async function demoHasData(): Promise<boolean> {
  const state = await demoStore().read();
  return Object.keys(state.households).length > 0;
}
