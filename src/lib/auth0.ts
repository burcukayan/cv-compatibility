import "server-only";

import { Auth0Client } from "@auth0/nextjs-auth0/server";

import { env } from "@/lib/env";

void env;

export const auth0 = new Auth0Client();
