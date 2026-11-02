// AC-BULK-01…03 — масове рішення менеджера на справжньому Postgres (PGlite) з усіма міграціями.
// Тести-спершу (WS9, фабрика): написані до реалізації і червоні, доки немає функції бази public.approve_leave_records.
// Контракт (з задачі фабрики й requirements/02-bulk-decisions.md):
//   public.approve_leave_records(p_record_ids uuid[]) returns integer — кількість схвалених записів;
//   «усе або нічого»: запис не з черги менеджера → помилка NOT_IN_QUEUE, запис не на розгляді → NOT_PENDING,
//   і жоден із вибраних записів не змінюється. Автора й час рішення ставить база (тригер), а не клієнт.
// Одиниця рішення — ЗАПИС заявки в черзі менеджера (leave_records), а не заявка.
import { beforeAll, describe, expect, it } from "vitest";
import { createLeaveDb, type LeaveDb } from "./supabase-pglite";

let t: LeaveDb;
let MANAGER_MATH: string, TEACHER: string;

beforeAll(async () => {
  t = await createLeaveDb();
  MANAGER_MATH = t.users["manager.math@example.test"];
  TEACHER = t.users["teacher@example.test"];
}, 60_000);

interface RecordRow {
  id: string;
  status: string;
  decided_by: string | null;
  decided_at: string | null;
}

/**
 * Заявка teacher@ (основна посада — «Математика», додаткова — «Початкова школа») → два записи.
 * Повертає id запису кожного підрозділу.
 */
async function submit(start: string, end: string): Promise<{ math: string; primary: string }> {
  const [{ id }] = await t.asUser<{ id: string }>(
    TEACHER,
    `select public.submit_leave_request('vacation', $1, $2,
       (select array_agg(id) from public.positions where employee_id = (select auth.uid()))) as id`,
    [start, end],
  );
  const rows = await t.asService<{ id: string; code: string }>(
    `select lr.id, d.code from public.leave_records as lr join public.divisions as d on d.id = lr.division_id
      where lr.request_id = $1`,
    [id],
  );
  return {
    math: rows.find((r) => r.code === "MATH")!.id,
    primary: rows.find((r) => r.code === "PRIMARY")!.id,
  };
}

const approveSelected = (userId: string, ids: string[]) =>
  t.asUser<{ n: number }>(userId, "select public.approve_leave_records($1::uuid[]) as n", [ids]);

/** Стан записів очима бази (service role, повз RLS) у порядку переданих id. */
async function state(ids: string[]): Promise<RecordRow[]> {
  const rows = await t.asService<RecordRow>(
    "select id, status, decided_by, decided_at::text as decided_at from public.leave_records where id = any($1::uuid[])",
    [ids],
  );
  return ids.map((id) => rows.find((r) => r.id === id)!);
}

/** Текст помилки виклику (порожній рядок — виклик пройшов). */
const errorOf = (p: Promise<unknown>) =>
  p.then(
    () => "",
    (e: Error) => e.message,
  );

describe("База: масове рішення менеджера", () => {
  it("AC-BULK-01: менеджер «Математики» схвалює 2 з 3 записів своєї черги однією дією — обидва схвалено з автором і часом, третій на розгляді", async () => {
    const a = await submit("2027-04-05", "2027-04-06");
    const b = await submit("2027-04-12", "2027-04-13");
    const c = await submit("2027-04-19", "2027-04-20");

    const [{ n }] = await approveSelected(MANAGER_MATH, [a.math, b.math]);
    expect(n).toBe(2);

    const [ra, rb, rc] = await state([a.math, b.math, c.math]);
    for (const r of [ra, rb]) {
      expect(r.status).toBe("approved");
      expect(r.decided_by).toBe(MANAGER_MATH);
      expect(r.decided_at).not.toBeNull();
    }
    expect(rc).toMatchObject({ status: "pending", decided_by: null, decided_at: null });
  });

  it("AC-BULK-02: серед вибраних запис підрозділу «Початкова школа» — помилка NOT_IN_QUEUE, жоден із 3 записів не змінено", async () => {
    const a = await submit("2027-05-03", "2027-05-04");
    const b = await submit("2027-05-10", "2027-05-11");
    const selected = [a.math, b.math, b.primary];

    expect(await errorOf(approveSelected(MANAGER_MATH, selected))).toContain("NOT_IN_QUEUE");

    for (const r of await state(selected)) {
      expect(r).toMatchObject({ status: "pending", decided_by: null, decided_at: null });
    }
  });

  it("AC-BULK-03: серед вибраних уже схвалений запис — помилка NOT_PENDING, 2 записи на розгляді, у схваленого той самий автор і час", async () => {
    const a = await submit("2027-06-07", "2027-06-08");
    const b = await submit("2027-06-14", "2027-06-15");
    const done = await submit("2027-06-21", "2027-06-22");
    // Рішення щодо одного запису — так, як його ухвалює сторінка /manage (AC-LEAVE-06).
    await t.asUser(MANAGER_MATH, "update public.leave_records set status = 'approved' where id = $1", [done.math]);
    const [before] = await state([done.math]);
    expect(before.status).toBe("approved");

    expect(await errorOf(approveSelected(MANAGER_MATH, [a.math, b.math, done.math]))).toContain("NOT_PENDING");

    const [ra, rb, rd] = await state([a.math, b.math, done.math]);
    expect(ra).toMatchObject({ status: "pending", decided_by: null, decided_at: null });
    expect(rb).toMatchObject({ status: "pending", decided_by: null, decided_at: null });
    expect(rd).toEqual(before);
  });
});
