// Доменні типи зрізу «Подання заявки на відсутність і рішення менеджера» (spec-v0.2).
// Модуль чистий: без Supabase, Next.js і поточного часу — тому його тестують юніт-тестами з AC ID.

export const LEAVE_TYPES = ["sick", "vacation", "business_trip"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export type PositionKind = "main" | "additional";
export type RecordStatus = "pending" | "approved" | "needs_revision";
export type RequestStatus = RecordStatus;
export type AppRole = "employee" | "manager" | "admin";

/** Дата без часу у форматі YYYY-MM-DD (цілі дні за київським часом — Assumptions spec-v0.1). */
export type IsoDate = string;

export interface Position {
  id: string;
  kind: PositionKind;
  divisionId: string;
}

/** Запис, який буде створено під час подання (статус завжди pending). */
export interface RecordDraft {
  positionId: string;
  kind: PositionKind;
  divisionId: string;
  status: "pending";
}

/** Коди помилок, які бачить користувач. Перші — зі специфікації, решта — технічні. */
export type LeaveErrorCode =
  | "INVALID_RANGE" // AC-LEAVE-03
  | "COMMENT_REQUIRED" // AC-LEAVE-07
  | "ONLY_BLOCKED_DAYS" // AC-LEAVE-10
  | "OVERLAPPING_REQUEST" // AC-LEAVE-11
  | "SUBSTITUTE_TOO_LONG"
  | "INVALID_DATE"
  | "INVALID_TYPE"
  | "NO_POSITIONS"
  | "UNKNOWN_POSITION"
  | "NOT_PENDING"
  | "NOT_NEEDS_REVISION"
  | "NOT_IN_QUEUE"
  | "NOT_IN_QUEUE_BULK" // AC-BULK-02
  | "NOT_PENDING_BULK" // AC-BULK-03
  | "NOTHING_SELECTED";

export type Result<T> = { ok: true; value: T } | { ok: false; error: LeaveErrorCode };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T = never>(error: LeaveErrorCode): Result<T> => ({ ok: false, error });
