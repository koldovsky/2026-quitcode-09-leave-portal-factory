"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canDecideRecord } from "@/lib/leave/access";
import { decide, type Decision } from "@/lib/leave/decisions";
import type { RecordStatus } from "@/lib/leave/types";
import { requireRole } from "@/lib/supabase/viewer";

/** AC-BULK-01…03: масове схвалення вибраних записів однією функцією бази (все або нічого). */
export async function approveSelected(formData: FormData) {
  const { supabase } = await requireRole("manager");
  const ids = [...new Set(formData.getAll("record_ids").map(String).filter(Boolean))];
  if (!ids.length) redirect("/manage?error=NOTHING_SELECTED");

  const { data, error } = await supabase.rpc("approve_leave_records", { p_record_ids: ids });
  if (error) {
    const code = /NOT_IN_QUEUE/.test(error.message)
      ? "NOT_IN_QUEUE_BULK"
      : /NOT_PENDING/.test(error.message)
        ? "NOT_PENDING_BULK"
        : "DB_ERROR";
    redirect(`/manage?error=${code}`);
  }

  revalidatePath("/manage");
  redirect(`/manage?approved=${data ?? 0}`);
}

/** AC-LEAVE-06, AC-LEAVE-07: менеджер схвалює запис або повертає його на доопрацювання з коментарем. */
export async function decideRecord(formData: FormData) {
  const { supabase, viewer } = await requireRole("manager");
  const recordId = String(formData.get("record_id") ?? "");
  const decision: Decision = formData.get("decision") === "return" ? "return" : "approve";

  // RLS: менеджер бачить лише записи підрозділів, якими керує (AC-LEAVE-05, AC-LEAVE-09).
  const { data: record } = await supabase
    .from("leave_records")
    .select("id, status, division_id")
    .eq("id", recordId)
    .maybeSingle();
  if (!record || !canDecideRecord(viewer, { employeeId: "", divisionId: record.division_id })) {
    redirect("/manage?error=NOT_IN_QUEUE");
  }

  const result = decide({ status: record.status as RecordStatus }, decision, {
    comment: String(formData.get("comment") ?? ""),
  });
  if (!result.ok) redirect(`/manage?error=${result.error}&record=${recordId}`);

  // Хто і коли (decided_by, decided_at) ставить тригер у базі — клієнт їх не передає.
  const { data: updated, error } = await supabase
    .from("leave_records")
    .update({ status: result.value.status, comment: result.value.comment })
    .eq("id", recordId)
    .eq("status", "pending")
    .select("id");
  if (error) redirect("/manage?error=DB_ERROR");
  if (!updated?.length) redirect("/manage?error=NOT_PENDING");

  revalidatePath("/manage");
  redirect(`/manage?done=${result.value.status}`);
}
