import "server-only";

import type { User } from "@auth0/nextjs-auth0/types";

import { auth0 } from "@/lib/auth0";

const UNAUTHORIZED_BODY = { error: "Please log in to continue." } as const;

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

function unauthorized(): Response {
  return Response.json(UNAUTHORIZED_BODY, { status: 401 });
}

export async function requireUser(): Promise<User | Response> {
  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return unauthorized();
    }

    return session.user;
  } catch (error) {
    console.error(errorName(error));
    return unauthorized();
  }
}
