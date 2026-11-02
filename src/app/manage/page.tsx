import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { canDecideRecord } from "@/lib/leave/access";
import { countLeaveDays } from "@/lib/leave/blocked-days";
import { formatDate } from "@/lib/leave/dates";
import { LEAVE_TYPE_LABELS, POSITION_KIND_LABELS, STATUS_LABELS, errorMessage } from "@/lib/leave/messages";
import type { LeaveType, PositionKind, RecordStatus } from "@/lib/leave/types";
import { requireRole } from "@/lib/supabase/viewer";
import { EmptyState, Field, Notice, PageShell, StatusBadge } from "../_components/ui";
import { approveSelected, decideRecord } from "./actions";

// AC-LEAVE-05, AC-LEAVE-09: менеджер бачить лише записи підрозділів, якими керує; адміністратор — усі.
// Відбір робить RLS; фільтр за division_id лише прибирає власні записи менеджера, якщо вони колись будуть.
export default async function ManagePage({ searchParams }: PageProps<"/manage">) {
  const { supabase, viewer } = await requireRole("manager", "admin");
  const { error, done, approved } = await searchParams;

  let recordsQuery = supabase
    .from("leave_records")
    .select("id, request_id, kind, division_id, status, comment, decided_at")
    .order("created_at", { ascending: false });
  if (viewer.role === "manager") recordsQuery = recordsQuery.in("division_id", viewer.managedDivisionIds);
  const { data: records } = await recordsQuery;

  const requestIds = [...new Set((records ?? []).map((r) => r.request_id))];
  const { data: requests } = requestIds.length
    ? await supabase.from("leave_requests").select("id, employee_id, leave_type, start_date, end_date, substitute_note").in("id", requestIds)
    : { data: [] as never[] };
  const employeeIds = [...new Set((requests ?? []).map((r) => r.employee_id))];
  const [{ data: people }, { data: divisions }, { data: blocked }] = await Promise.all([
    employeeIds.length
      ? supabase.from("profiles").select("id, full_name, email").in("id", employeeIds)
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("divisions").select("id, name"),
    supabase.from("blocked_days").select("day"),
  ]);

  const requestById = new Map((requests ?? []).map((r) => [r.id, r]));
  const personById = new Map((people ?? []).map((p) => [p.id, p]));
  const divisionName = new Map((divisions ?? []).map((d) => [d.id, d.name]));
  const blockedDays = (blocked ?? []).map((b) => b.day);
  const pending = (records ?? []).filter((r) => r.status === "pending");
  const decided = (records ?? []).filter((r) => r.status !== "pending");
  const message = errorMessage(error);

  const describe = (rec: (typeof pending)[number]) => {
    const req = requestById.get(rec.request_id);
    const person = req ? personById.get(req.employee_id) : undefined;
    const days = req ? countLeaveDays(req.start_date, req.end_date, blockedDays).counted : 0;
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium">{person?.full_name ?? person?.email ?? "працівник"}</span>
        {req ? (
          <span>
            {LEAVE_TYPE_LABELS[req.leave_type as LeaveType]},{" "}
            <span className="font-mono text-[13px] tabular-nums">
              {formatDate(req.start_date)} – {formatDate(req.end_date)}
            </span>{" "}
            (днів: {days})
          </span>
        ) : null}
        <span className="text-muted-foreground">
          {POSITION_KIND_LABELS[rec.kind as PositionKind]} посада, {divisionName.get(rec.division_id) ?? "—"}
        </span>
        {req?.substitute_note ? <span className="text-muted-foreground">Заміна: {req.substitute_note}</span> : null}
      </div>
    );
  };

  return (
    <PageShell title={viewer.role === "manager" ? "Черга рішень" : "Усі заявки"} role={viewer.role}>
      {message ? <Notice kind="error">{message}</Notice> : null}
      {typeof approved === "string" && /^\d+$/.test(approved) ? (
        <Notice kind="success">Схвалено записів: {approved}</Notice>
      ) : null}
      {typeof done === "string" && Object.hasOwn(STATUS_LABELS, done) ? (
        <Notice kind="success">Рішення збережено: {STATUS_LABELS[done as RecordStatus]}.</Notice>
      ) : null}

      <section className="flex flex-col gap-3" aria-labelledby="pending-title">
        <h2 id="pending-title" className="text-lg font-semibold">
          На розгляді
        </h2>
        {!pending.length ? <EmptyState>Нових заявок немає.</EmptyState> : null}
        {viewer.role === "manager" && pending.length ? (
          <form id="bulk-approve" action={approveSelected}>
            <Button type="submit">Схвалити вибрані</Button>
          </form>
        ) : null}
        {pending.map((rec) => (
          <Card key={rec.id} data-testid="queue-record">
            <CardContent className="flex flex-col gap-3">
              {viewer.role === "manager" ? (
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="record_ids" value={rec.id} form="bulk-approve" aria-label="Вибрати" />
                  {describe(rec)}
                </label>
              ) : (
                describe(rec)
              )}
              {rec.comment ? <p className="text-muted-foreground">Попередній коментар: «{rec.comment}»</p> : null}
              {canDecideRecord(viewer, { employeeId: "", divisionId: rec.division_id }) ? (
                <div className="flex flex-wrap items-end gap-3">
                  <form action={decideRecord}>
                    <input type="hidden" name="record_id" value={rec.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <Button type="submit">Схвалити</Button>
                  </form>
                  <form action={decideRecord} className="flex flex-1 flex-wrap items-end gap-2">
                    <input type="hidden" name="record_id" value={rec.id} />
                    <input type="hidden" name="decision" value="return" />
                    <Field id={`comment-${rec.id}`} label="Коментар для повернення" className="min-w-48 flex-1">
                      <Input id={`comment-${rec.id}`} name="comment" placeholder="Уточніть дату кінця" />
                    </Field>
                    <Button type="submit" variant="outline">
                      Повернути на доопрацювання
                    </Button>
                  </form>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="decided-title">
        <h2 id="decided-title" className="text-lg font-semibold">
          Вирішені
        </h2>
        {!decided.length ? <EmptyState>Рішень ще немає.</EmptyState> : null}
        {decided.map((rec) => (
          <Card key={rec.id}>
            <CardContent className="flex flex-col gap-2">
              {describe(rec)}
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={rec.status as RecordStatus} />
                {rec.decided_at ? (
                  <span className="font-mono text-[13px] text-muted-foreground tabular-nums">
                    {new Date(rec.decided_at).toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" })}
                  </span>
                ) : null}
                {rec.comment ? <span>«{rec.comment}»</span> : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </PageShell>
  );
}
