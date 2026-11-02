"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { deleteAllAnalyses, deleteAnalysis } from "@/db/queries";
import { requireUser } from "@/lib/auth/require-user";
import { analysisIdSchema, deleteAllConfirmationSchema } from "@/lib/schemas";

const ACTION_ERROR = "This action could not be completed.";

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

export async function deleteAnalysisAction(id: string) {
  const authResult = await requireUser();

  if (authResult instanceof Response) {
    redirect("/auth/login");
  }

  const parsed = analysisIdSchema.safeParse(id);

  if (!parsed.success) {
    return { error: ACTION_ERROR };
  }

  try {
    await deleteAnalysis(authResult.sub, parsed.data);
  } catch (error) {
    console.error(errorName(error));
    return { error: ACTION_ERROR };
  }

  revalidatePath("/history");
  redirect("/history");
}

export async function deleteAllDataAction(confirmation: string) {
  const authResult = await requireUser();

  if (authResult instanceof Response) {
    redirect("/auth/login");
  }

  const parsed = deleteAllConfirmationSchema.safeParse(confirmation);

  if (!parsed.success) {
    return { error: ACTION_ERROR };
  }

  try {
    await deleteAllAnalyses(authResult.sub);
  } catch (error) {
    console.error(errorName(error));
    return { error: ACTION_ERROR };
  }

  revalidatePath("/history");
  refresh();
}
