import type { LeaveErrorCode, LeaveType, PositionKind, RecordStatus } from "./types";

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  sick: "хвороба",
  vacation: "відпустка",
  business_trip: "відрядження",
};

export const POSITION_KIND_LABELS: Record<PositionKind, string> = {
  main: "основна",
  additional: "додаткова",
};

export const STATUS_LABELS: Record<RecordStatus, string> = {
  pending: "на розгляді",
  approved: "схвалено",
  needs_revision: "на доопрацюванні",
};

export const ERROR_MESSAGES: Record<LeaveErrorCode, string> = {
  INVALID_RANGE: "Дата кінця раніша за дату початку.",
  COMMENT_REQUIRED: "Щоб повернути заявку на доопрацювання, напишіть коментар.",
  ONLY_BLOCKED_DAYS: "У вибраних датах лише заблоковані дні — оформлювати відсутність не потрібно.",
  OVERLAPPING_REQUEST: "На ці дати у вас уже є заявка на розгляді або схвалена.",
  SUBSTITUTE_TOO_LONG: "Заміна — не довше 200 символів.",
  INVALID_DATE: "Вкажіть дати початку й кінця.",
  INVALID_TYPE: "Оберіть тип відсутності.",
  NO_POSITIONS: "Позначте хоча б одну посаду.",
  UNKNOWN_POSITION: "Посаду не знайдено серед ваших посад.",
  NOT_PENDING: "Рішення щодо цього запису вже ухвалено.",
  NOT_NEEDS_REVISION: "Виправити можна лише заявку на доопрацюванні.",
  NOT_IN_QUEUE: "Цього запису немає у вашій черзі.",
  NOT_IN_QUEUE_BULK: "Серед вибраних є записи не з вашої черги. Жодне рішення не збережено.",
  NOT_PENDING_BULK: "Серед вибраних є записи, щодо яких рішення вже ухвалено. Жодне рішення не збережено.",
  NOTHING_SELECTED: "Позначте хоча б один запис.",
};

/** Повідомлення для ?error=… з адреси сторінки; невідомий код — загальна помилка. */
export function errorMessage(code: string | string[] | undefined): string | undefined {
  if (typeof code !== "string" || code === "") return undefined;
  return Object.hasOwn(ERROR_MESSAGES, code) ? ERROR_MESSAGES[code as LeaveErrorCode] : "Не вдалося зберегти. Спробуйте ще раз.";
}
