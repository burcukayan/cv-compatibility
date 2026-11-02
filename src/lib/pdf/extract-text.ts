import "server-only";

import { extractText, getDocumentProxy } from "unpdf";

const MAX_PAGE_COUNT = 5;
const EXTRACTION_TIMEOUT_MS = 10_000;
const MAX_IMAGE_SIZE = 16_777_216;

export class PdfTooManyPagesError extends Error {
  constructor() {
    super("PDF has too many pages.");
    this.name = "PdfTooManyPagesError";
  }
}

export type ExtractedPdfText = {
  text: string;
  pageCount: number;
  charCount: number;
};

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/[^\S\n]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error("PDF extraction timed out.");
      error.name = "TimeoutError";
      reject(error);
    }, timeoutMs);
  });

  operation.then(
    () => {},
    () => {},
  );

  return Promise.race([operation, timeout]).finally(() => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  });
}

async function readPdfText(data: Uint8Array): Promise<ExtractedPdfText> {
  const pdf = await getDocumentProxy(data, { maxImageSize: MAX_IMAGE_SIZE });

  try {
    if (pdf.numPages > MAX_PAGE_COUNT) {
      throw new PdfTooManyPagesError();
    }

    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    const normalized = normalizeWhitespace(text);

    return {
      text: normalized,
      pageCount: totalPages,
      charCount: normalized.length,
    };
  } finally {
    await pdf.loadingTask.destroy().catch((error: unknown) => {
      console.error(errorName(error));
    });
  }
}

export function extractPdfText(data: Uint8Array): Promise<ExtractedPdfText> {
  return withTimeout(readPdfText(data), EXTRACTION_TIMEOUT_MS);
}
