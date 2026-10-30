import "server-only";

import { env } from "@/lib/env";

const FORBIDDEN_BODY = { error: "Forbidden" } as const;

export function verifyOrigin(request: Request): Response | null {
  if (request.method !== "POST") {
    return null;
  }

  const origin = request.headers.get("origin");
  const expected = new URL(env.APP_BASE_URL).origin;

  if (origin !== expected) {
    return Response.json(FORBIDDEN_BODY, { status: 403 });
  }

  return null;
}
