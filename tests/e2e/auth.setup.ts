// Вхід кожної ролі один раз за прогін → playwright/.auth/<role>.json (у .gitignore: там живі cookie сесії).
// Тести ролей беруть стан через test.use({ storageState }). Пароль — DEMO_USER_PASSWORD з .env.local
// (локально) або з workflow (CI, одноразовий стек). У цьому проєкті запис вимкнено (playwright.config.ts).
import { expect, test as setup } from "@playwright/test";
import { signIn } from "./support/uat";

const ROLES = {
  admin: "admin@example.test",
  teacher: "teacher@example.test",
  // WS9: масове рішення менеджера (tests/e2e/manage-bulk.spec.ts) — демо-менеджер «Математики».
  manager: "manager.math@example.test",
} as const;

for (const [role, email] of Object.entries(ROLES)) {
  setup(`вхід: ${role}`, async ({ page }) => {
    const password = process.env.DEMO_USER_PASSWORD;
    expect(password, "DEMO_USER_PASSWORD не задано (.env.local або змінна CI)").toBeTruthy();
    await signIn(page, email, password!);
    await expect(page.getByTestId("user-email")).toHaveText(email);
    await page.context().storageState({ path: `playwright/.auth/${role}.json` });
  });
}
