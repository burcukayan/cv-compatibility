import { exportAnalyses } from "@/db/queries";
import { requireUser } from "@/lib/auth/require-user";
import { checkRateLimit, rateLimitRemainingHeader } from "@/lib/rate-limit";

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

export async function GET() {
  const authResult = await requireUser();

  if (authResult instanceof Response) {
    return authResult;
  }

  const userLimit = await checkRateLimit("export", authResult.sub);

  if (userLimit.response) {
    return userLimit.response;
  }

  try {
    const rows = await exportAnalyses(authResult.sub);

    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="analyses.json"',
        "Cache-Control": "private, no-store",
        ...rateLimitRemainingHeader(userLimit.remaining),
      },
    });
  } catch (error) {
    console.error(errorName(error));
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
