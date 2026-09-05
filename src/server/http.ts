import { NextResponse } from "next/server";
import type { ZodType, ZodTypeDef } from "zod";
import type { HouseholdData } from "@/domain/types";
import { PermissionError } from "@/domain/permissions";
import { getContext, type RequestContext } from "./session";
import { writeHousehold } from "./store";

/**
 * Route-handler helpers: session resolution, Zod parsing, permission errors
 * mapped to 403, and a single `commit` that persists a mutated household.
 */

export function ok<T>(data: T, init?: ResponseInit): Response {
  return NextResponse.json(data, init);
}

export function fail(error: string, status: number, extra?: Record<string, unknown>): Response {
  return NextResponse.json({ error, ...extra }, { status });
}

export async function withContext(fn: (ctx: RequestContext) => Promise<Response>): Promise<Response> {
  const ctx = await getContext();
  if (!ctx) return fail("no_session", 401);
  try {
    return await fn(ctx);
  } catch (err) {
    if (err instanceof PermissionError) return fail("forbidden", 403, { permission: err.permission });
    throw err;
  }
}

export async function parseBody<T>(
  req: Request,
  schema: ZodType<T, ZodTypeDef, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; res: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, res: fail("invalid_json", 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, res: fail("validation", 400, { issues: parsed.error.issues }) };
  }
  return { ok: true, data: parsed.data };
}

/** Applies a pure mutation to the household snapshot and persists it. */
export async function commit(ctx: RequestContext, mutate: (data: HouseholdData) => HouseholdData): Promise<HouseholdData> {
  const next = mutate(structuredClone(ctx.data));
  await writeHousehold(ctx.session.mode, next);
  return next;
}
