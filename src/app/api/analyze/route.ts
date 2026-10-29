import { analyzeMatch } from "@/lib/ai/analyze-match";
import { mapAiError } from "@/lib/ai/errors";
import { analyzeRequestSchema } from "@/lib/schemas";

export const maxDuration = 30;

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.error(errorName(error));
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = analyzeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid request.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const data = await analyzeMatch(parsed.data);
    return Response.json({ data }, { status: 200 });
  } catch (error) {
    const mapped = mapAiError(error);

    return Response.json(
      { error: mapped.message },
      { status: mapped.status, headers: mapped.headers },
    );
  }
}
