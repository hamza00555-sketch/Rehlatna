/** Typed fetch wrapper for the app's own route handlers. */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly issues?: unknown,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

export async function api<T = unknown>(path: string, body?: unknown, method: "POST" | "PATCH" | "DELETE" | "PUT" = "POST"): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let payload: { error?: string; issues?: unknown } = {};
    try {
      payload = await res.json();
    } catch {
      /* no body */
    }
    throw new ApiError(res.status, payload.error ?? "request_failed", payload.issues);
  }
  return (await res.json()) as T;
}
