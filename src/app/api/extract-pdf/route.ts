import { requireUser } from "@/lib/auth/require-user";
import { PdfTooManyPagesError, extractPdfText } from "@/lib/pdf/extract-text";
import { extractedPdfSchema } from "@/lib/schemas";

// Cache Components rejects an explicit runtime export. Node.js is already the only runtime.
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const PDF_MIME_TYPE = "application/pdf";
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;
const FILE_FIELD = "file";
const MIN_TEXT_CHARS = 100;

const PDF_READ_ERROR_NAMES = new Set([
  "PasswordException",
  "InvalidPDFException",
  "FormatError",
  "UnknownErrorException",
]);
const TIMEOUT_ERROR_NAMES = new Set(["TimeoutError"]);

const SHORT_TEXT_MESSAGE =
  "We couldn't read text from this PDF. Please paste your resume text instead.";

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

function hasErrorName(error: unknown, names: ReadonlySet<string>): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if ("name" in error && typeof error.name === "string" && names.has(error.name)) {
    return true;
  }

  if ("cause" in error) {
    return hasErrorName(error.cause, names);
  }

  return false;
}

function hasPdfMagic(bytes: Uint8Array): boolean {
  return PDF_MAGIC_BYTES.every((byte, index) => bytes[index] === byte);
}

export async function POST(request: Request) {
  const authResult = await requireUser();

  if (authResult instanceof Response) {
    return authResult;
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch (error) {
    console.error(errorName(error));
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const entries = [...formData.entries()];
  const entry = entries[0];

  if (entries.length !== 1 || entry === undefined || entry[0] !== FILE_FIELD) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const file = entry[1];

  if (!(file instanceof File)) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return Response.json({ error: "File is too large." }, { status: 413 });
  }

  if (file.type !== PDF_MIME_TYPE) {
    return Response.json({ error: "File must be a PDF." }, { status: 415 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());

    if (!hasPdfMagic(bytes)) {
      return Response.json({ error: "File must be a PDF." }, { status: 415 });
    }

    const result = await extractPdfText(bytes);

    if (result.text.length < MIN_TEXT_CHARS) {
      return Response.json({ error: SHORT_TEXT_MESSAGE }, { status: 422 });
    }

    const parsed = extractedPdfSchema.safeParse(result);

    if (!parsed.success) {
      return Response.json({ error: "Something went wrong." }, { status: 500 });
    }

    return Response.json(parsed.data, { status: 200 });
  } catch (error) {
    console.error(errorName(error));

    if (error instanceof PdfTooManyPagesError) {
      return Response.json(
        { error: "This PDF has too many pages." },
        { status: 422 },
      );
    }

    if (hasErrorName(error, PDF_READ_ERROR_NAMES)) {
      return Response.json(
        { error: "We couldn't read this PDF." },
        { status: 422 },
      );
    }

    if (hasErrorName(error, TIMEOUT_ERROR_NAMES)) {
      return Response.json(
        { error: "Reading the PDF timed out." },
        { status: 504 },
      );
    }

    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
