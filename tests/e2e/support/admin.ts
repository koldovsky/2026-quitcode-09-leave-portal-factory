// Синтетичні дані UAT і прибирання за ними — секретним ключем Supabase (обходить RLS).
// Лише в тестах і лише на машині розробника (.env.local) або в CI на одноразовому локальному стеку (e2e.yml).
// check:boundary сканує src/, тож цей файл його не порушує; у src/ секретний ключ читає лише src/lib/supabase/admin.ts.
// Ніколи не друкуємо значення ключів і паролів — лише адреси синтетичних користувачів.
// Під схему ЦЬОГО демо: createEmployee (divisions, positions) і OWNED_ROWS. У своєму проєкті замініть їх своїми таблицями;
// решта (uatEmail, listUatUsers, deleteUatUsers, журнал прибирань) — загальна.
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Рядки синтетичного користувача, які треба видалити ДО deleteUser: каскад auth.users → profiles → positions упирається
 * в leave_records.position_id (FK без cascade), і Auth відповідає «Database error deleting user». leave_requests
 * видаляє свої leave_records каскадом. У своєму проєкті — ваші таблиці з FK на користувача без cascade (або порожньо).
 */
const OWNED_ROWS: { table: string; column: string }[] = [{ table: "leave_requests", column: "employee_id" }];

/** Лише такі адреси прибирання має право видалити: uat-<run>[-<суфікс>]@example.test. */
export const UAT_EMAIL = /^uat-[0-9a-z-]+@example\.test$/;

export function uatEmail(suffix?: string): string {
  const run = process.env.UAT_RUN ?? "manual";
  const email = `uat-${run}${suffix ? `-${suffix}` : ""}@example.test`;
  if (!UAT_EMAIL.test(email)) throw new Error(`Синтетична адреса має вигляд uat-…@example.test, а не ${email}`);
  return email;
}

export const randomPassword = () => `Uat-${randomBytes(12).toString("base64url")}`;

export function hasAdminKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error("Для синтетичних даних UAT потрібні NEXT_PUBLIC_SUPABASE_URL і SUPABASE_SECRET_KEY (.env.local)");
  }
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function listUatUsers(supabase: SupabaseClient): Promise<{ id: string; email: string }[]> {
  const found: { id: string; email: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (u.email && UAT_EMAIL.test(u.email)) found.push({ id: u.id, email: u.email });
    if (data.users.length < 1000) return found;
  }
}

/** Працівник з основною посадою в підрозділі divisionCode — для AC, де працівник подає заявку. */
export async function createEmployee(email: string, password: string, divisionCode = "MATH") {
  if (!UAT_EMAIL.test(email)) throw new Error(`Лише синтетичні адреси uat-…@example.test: ${email}`);
  const supabase = adminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "UAT Працівник" },
  });
  if (error) throw error;
  const id = data.user.id;
  // Профіль створює тригер on_auth_user_created; роль ставимо явно (колонку role змінює лише service_role).
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id, email, full_name: "UAT Працівник", role: "employee" }, { onConflict: "id" });
  if (profileError) throw profileError;
  const { data: division, error: divisionError } = await supabase
    .from("divisions")
    .select("id")
    .eq("code", divisionCode)
    .single();
  if (divisionError) throw divisionError;
  const { error: positionError } = await supabase
    .from("positions")
    .insert({ employee_id: id, kind: "main", division_id: division.id, title: "Учитель (UAT)" });
  if (positionError) throw positionError;
  return id;
}

/** Чи є в календарі заблокований день (лише читання). */
export async function isBlockedDay(day: string): Promise<boolean> {
  const { data, error } = await adminClient().from("blocked_days").select("day").eq("day", day);
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** Заявки працівника з їхніми записами — щоб перевірити те, чого не видно на екрані (статус у базі). */
export async function leaveRequestsOf(employeeId: string) {
  const { data, error } = await adminClient()
    .from("leave_requests")
    .select("id, leave_type, start_date, end_date, leave_records(status)")
    .eq("employee_id", employeeId);
  if (error) throw error;
  return (data ?? []) as {
    id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    leave_records: { status: string }[];
  }[];
}

const CLEANUP_LOG = "test-results/uat-cleanup.jsonl";

/** Усі uat-адреси, які видалив цей прогін (за журналом). */
export function deletedThisRun(): string[] {
  if (!existsSync(CLEANUP_LOG)) return [];
  const entries = readFileSync(CLEANUP_LOG, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { deleted: string[] });
  return [...new Set(entries.flatMap((e) => e.deleted))];
}

export type CleanupResult = { deleted: string[]; remaining: string[]; leftoverRequests: number };

/**
 * Видаляє ВСІХ uat-*@example.test (і тих, що лишились після обірваних прогонів), а потім перевіряє:
 * жодного такого користувача й жодної заявки видалених (заявки → записи каскадом; користувач → профіль → посади).
 */
export async function deleteUatUsers(onlyEmail?: string): Promise<CleanupResult> {
  const supabase = adminClient();
  const targets = (await listUatUsers(supabase)).filter((u) => !onlyEmail || u.email === onlyEmail);
  const deleted: string[] = [];
  for (const u of targets) {
    for (const { table, column } of OWNED_ROWS) {
      const { error: rowsError } = await supabase.from(table).delete().eq(column, u.id);
      if (rowsError) throw rowsError;
    }
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    if (error) throw error;
    deleted.push(u.email);
  }
  const remaining = (await listUatUsers(supabase))
    .filter((u) => !onlyEmail || u.email === onlyEmail)
    .map((u) => u.email);
  // Чи не лишилось рядків видалених користувачів (для демо — заявок) у таблицях OWNED_ROWS.
  let leftoverRequests = 0;
  for (const { table, column } of targets.length ? OWNED_ROWS : []) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .in(
        column,
        targets.map((u) => u.id),
      );
    if (error) throw error;
    leftoverRequests += count ?? 0;
  }
  // Журнал прибирань прогону: afterAll специфікацій і teardown (Playwright чистить test-results/ на старті прогону).
  mkdirSync("test-results", { recursive: true });
  appendFileSync(
    CLEANUP_LOG,
    `${JSON.stringify({ at: new Date().toISOString(), scope: onlyEmail ?? "uat-*", deleted, remaining, leftoverRequests })}\n`,
  );
  return { deleted, remaining, leftoverRequests };
}

// ── WS9, масове рішення менеджера (AC-BULK-01…04): заявки синтетичних працівників і стан їхніх записів ──────────

/**
 * Синтетичний працівник сам подає заявку своєю сесією (публічний ключ + пароль) — функцією submit_leave_request,
 * як сторінка /requests/new. Повертає id записів заявки (один запис — основна посада).
 */
export async function submitLeaveAs(email: string, password: string, start: string, end: string): Promise<string[]> {
  if (!UAT_EMAIL.test(email)) throw new Error(`Лише синтетичні адреси uat-…@example.test: ${email}`);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Потрібні NEXT_PUBLIC_SUPABASE_URL і NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (.env.local)");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  const { data: positions, error: positionsError } = await client.from("positions").select("id");
  if (positionsError) throw positionsError;
  const { data: requestId, error } = await client.rpc("submit_leave_request", {
    p_leave_type: "vacation",
    p_start_date: start,
    p_end_date: end,
    p_position_ids: (positions ?? []).map((p) => p.id),
  });
  if (error) throw error;
  const { data: records, error: recordsError } = await client.from("leave_records").select("id").eq("request_id", requestId);
  if (recordsError) throw recordsError;
  await client.auth.signOut();
  return (records ?? []).map((r) => r.id);
}

export type RecordState = { id: string; status: string; decided_by: string | null; decided_at: string | null };

/** Стан записів очима бази (секретний ключ, повз RLS) — те, чого не видно на екрані: автор і час рішення. */
export async function recordStates(ids: string[]): Promise<RecordState[]> {
  const { data, error } = await adminClient()
    .from("leave_records")
    .select("id, status, decided_by, decided_at")
    .in("id", ids);
  if (error) throw error;
  return ids.map((id) => (data ?? []).find((r) => r.id === id) as RecordState);
}

/** id профілю за email (наприклад, демо-менеджера) — щоб перевірити автора рішення. */
export async function profileIdByEmail(email: string): Promise<string> {
  const { data, error } = await adminClient().from("profiles").select("id").eq("email", email).single();
  if (error) throw error;
  return data.id;
}
