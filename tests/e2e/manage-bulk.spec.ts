// AC-BULK-01…04 — масове рішення менеджера на сторінці /manage (WS9, тести-спершу для фабрики).
// Менеджер — демо-менеджер «Математики» (manager.math@example.test, вхід у auth.setup.ts). Записи в його черзі — лише
// СИНТЕТИЧНИХ працівників uat-<run>-…@example.test (@writes): демо-чергу не схвалюємо. Кожен тест позначає лише записи
// своїх синтетичних заявок (за датами, унікальними для тесту). afterAll видаляє синтетичних користувачів; каскад —
// їхні заявки й записи.
// Контракт сторінки (задача фабрики bulk-db): у кожній картці запису на розгляді — прапорець «Вибрати»
// (value = id запису); кнопка «Схвалити вибрані»; успіх — «Схвалено записів: N»; відмови — тексти AC-BULK-02 і AC-BULK-03.
import { expect, test, type Page } from "@playwright/test";
import {
  createEmployee,
  deleteUatUsers,
  profileIdByEmail,
  randomPassword,
  recordStates,
  submitLeaveAs,
  uatEmail,
} from "./support/admin";
import { attachRuntimeErrors, given, thenStep, when } from "./support/uat";

test.use({ storageState: "playwright/.auth/manager.json" });

const MANAGER = "manager.math@example.test";
const created: string[] = [];

/** Синтетичний працівник з основною посадою в підрозділі divisionCode і його заявки → id записів. */
async function employeeWithRequests(suffix: string, divisionCode: string, ranges: [string, string][]) {
  const email = uatEmail(suffix);
  const password = randomPassword();
  await createEmployee(email, password, divisionCode);
  created.push(email);
  const ids: string[] = [];
  for (const [start, end] of ranges) ids.push(...(await submitLeaveAs(email, password, start, end)));
  return ids;
}

const ddmmyyyy = (iso: string) => iso.split("-").reverse().join(".");
const pendingCard = (page: Page, range: [string, string]) =>
  page
    .getByRole("region", { name: "На розгляді" })
    .getByTestId("queue-record")
    .filter({ hasText: `${ddmmyyyy(range[0])} – ${ddmmyyyy(range[1])}` });
const select = (page: Page, range: [string, string]) =>
  pendingCard(page, range).getByRole("checkbox", { name: /Вибрати/ }).check();

test.afterEach(async ({ page }) => attachRuntimeErrors(page));

test.afterAll(async () => {
  for (const email of created) await deleteUatUsers(email);
});

test(
  "AC-BULK-01: менеджер «Математики» позначає 2 з 3 записів і схвалює вибрані — обидва схвалено з автором і часом, третій на розгляді",
  { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-BULK-01" } },
  async ({ page }) => {
    const ranges: [string, string][] = [
      ["2027-09-06", "2027-09-07"],
      ["2027-09-13", "2027-09-14"],
      ["2027-09-20", "2027-09-21"],
    ];
    let ids: string[] = [];
    await given("у черзі менеджера «Математики» 3 записи на розгляді", async () => {
      ids = await employeeWithRequests("bulk01", "MATH", ranges);
      await page.goto("/manage");
      for (const r of ranges) await expect(pendingCard(page, r)).toHaveCount(1);
    });

    await when("менеджер позначає 2 з них і схвалює вибрані однією дією", async () => {
      await select(page, ranges[0]);
      await select(page, ranges[1]);
      await page.getByRole("button", { name: "Схвалити вибрані" }).click();
      await expect(page.getByText(/Схвалено записів: \d+/)).toBeVisible();
    });

    await thenStep(
      page,
      {
        clause: "обидва позначені записи мають статус «схвалено», у кожного автор рішення — цей менеджер і час рішення, а третій запис лишається на розгляді",
        visible: [
          "записи 06.09.2027 – 07.09.2027 і 13.09.2027 – 14.09.2027 — у розділі «Вирішені» з підписом «схвалено» і часом рішення",
          "запис 20.09.2027 – 21.09.2027 — у розділі «На розгляді»",
        ],
        hidden: ["у базі в обох схвалених записів decided_by = id менеджера manager.math@example.test, decided_at заповнено; у третього — pending без автора"],
      },
      async () => {
        const decided = page.getByRole("region", { name: "Вирішені" });
        for (const r of ranges.slice(0, 2)) {
          const c = decided.locator("[data-slot=card]").filter({ hasText: `${ddmmyyyy(r[0])} – ${ddmmyyyy(r[1])}` });
          await expect(c).toHaveCount(1);
          await expect(c).toContainText("схвалено");
        }
        await expect(pendingCard(page, ranges[2])).toHaveCount(1);
        const managerId = await profileIdByEmail(MANAGER);
        const [a, b, c] = await recordStates(ids);
        for (const r of [a, b]) {
          expect(r.status).toBe("approved");
          expect(r.decided_by).toBe(managerId);
          expect(r.decided_at).not.toBeNull();
        }
        expect(c).toMatchObject({ status: "pending", decided_by: null, decided_at: null });
      },
    );
  },
);

test(
  "AC-BULK-02: серед вибраних запис «Початкової школи» (підмінений запит) — жоден запис не змінено, повідомлення про записи не з черги",
  { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-BULK-02" } },
  async ({ page }) => {
    const ranges: [string, string][] = [
      ["2027-10-04", "2027-10-05"],
      ["2027-10-11", "2027-10-12"],
    ];
    let mine: string[] = [];
    let foreign: string[] = [];
    await given("менеджер «Математики» позначив 2 записи на розгляді зі своєї черги і 1 запис на розгляді підрозділу «Початкова школа»", async () => {
      mine = await employeeWithRequests("bulk02m", "MATH", ranges);
      foreign = await employeeWithRequests("bulk02p", "PRIMARY", [["2027-10-18", "2027-10-19"]]);
      await page.goto("/manage");
      await select(page, ranges[0]);
      await select(page, ranges[1]);
      // Запису іншого підрозділу на сторінці немає (RLS): підміняємо значення одного позначеного прапорця його id —
      // так, як зробив би запит в обхід сторінки. Відмову має дати сервер і база, а не сторінка.
      const second = pendingCard(page, ranges[1]).getByRole("checkbox", { name: /Вибрати/ });
      await second.evaluate((el, id) => {
        const clone = el.cloneNode() as HTMLInputElement;
        clone.value = id;
        clone.checked = true;
        clone.removeAttribute("id");
        clone.style.display = "none";
        el.parentElement!.appendChild(clone);
      }, foreign[0]);
    });

    await when("він схвалює вибрані", async () => {
      await page.getByRole("button", { name: "Схвалити вибрані" }).click();
    });

    await thenStep(
      page,
      {
        clause: "жоден із 3 записів не змінюється — усі лишаються на розгляді без автора рішення, — а менеджер бачить повідомлення «Серед вибраних є записи не з вашої черги. Жодне рішення не збережено.»",
        visible: [
          "повідомлення «Серед вибраних є записи не з вашої черги. Жодне рішення не збережено.»",
          "записи 04.10.2027 – 05.10.2027 і 11.10.2027 – 12.10.2027 — досі в розділі «На розгляді»",
        ],
        hidden: ["у базі всі 3 записи (2 «Математики» і 1 «Початкової школи») — pending без автора й часу рішення"],
      },
      async () => {
        await expect(
          page.getByText("Серед вибраних є записи не з вашої черги. Жодне рішення не збережено."),
        ).toBeVisible();
        for (const r of ranges) await expect(pendingCard(page, r)).toHaveCount(1);
        for (const r of await recordStates([...mine, ...foreign])) {
          expect(r).toMatchObject({ status: "pending", decided_by: null, decided_at: null });
        }
      },
    );
  },
);

test(
  "AC-BULK-03: серед вибраних запис, який тим часом схвалено, — жоден запис не змінено, повідомлення про ухвалене рішення",
  { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-BULK-03" } },
  async ({ page, context }) => {
    const ranges: [string, string][] = [
      ["2027-11-01", "2027-11-02"],
      ["2027-11-08", "2027-11-09"],
      ["2027-11-15", "2027-11-16"],
    ];
    let ids: string[] = [];
    let before: Awaited<ReturnType<typeof recordStates>> = [];
    await given("менеджер «Математики» позначив 2 записи на розгляді і 1 запис своєї черги, який уже схвалено", async () => {
      ids = await employeeWithRequests("bulk03", "MATH", ranges);
      await page.goto("/manage");
      for (const r of ranges) await select(page, r);
      // Тим часом третій запис схвалено окремо (друга вкладка, звичайна кнопка «Схвалити» — AC-LEAVE-06).
      const other = await context.newPage();
      await other.goto("/manage");
      await pendingCard(other, ranges[2]).getByRole("button", { name: "Схвалити", exact: true }).click();
      await other.waitForURL(/done=approved/);
      await other.close();
      before = await recordStates([ids[2]]);
      expect(before[0].status).toBe("approved");
    });

    await when("він схвалює вибрані", async () => {
      await page.getByRole("button", { name: "Схвалити вибрані" }).click();
    });

    await thenStep(
      page,
      {
        clause: "жоден запис не змінюється: 2 записи лишаються на розгляді, у схваленого той самий автор і час рішення, а менеджер бачить повідомлення «Серед вибраних є записи, щодо яких рішення вже ухвалено. Жодне рішення не збережено.»",
        visible: [
          "повідомлення «Серед вибраних є записи, щодо яких рішення вже ухвалено. Жодне рішення не збережено.»",
          "записи 01.11.2027 – 02.11.2027 і 08.11.2027 – 09.11.2027 — у розділі «На розгляді»",
        ],
        hidden: ["у базі 2 записи — pending без автора; у схваленого decided_by і decided_at ті самі, що до масової дії"],
      },
      async () => {
        await expect(
          page.getByText("Серед вибраних є записи, щодо яких рішення вже ухвалено. Жодне рішення не збережено."),
        ).toBeVisible();
        for (const r of ranges.slice(0, 2)) await expect(pendingCard(page, r)).toHaveCount(1);
        const [a, b, done] = await recordStates(ids);
        expect(a).toMatchObject({ status: "pending", decided_by: null, decided_at: null });
        expect(b).toMatchObject({ status: "pending", decided_by: null, decided_at: null });
        expect(done).toEqual(before[0]);
      },
    );
  },
);

test(
  "AC-BULK-04: черга після «Схвалити вибрані» — 2 записи у «Вирішені» зі статусом «схвалено», третій «На розгляді», «Схвалено записів: 2»",
  { tag: ["@uat", "@writes"], annotation: { type: "ac", description: "AC-BULK-04" } },
  async ({ page }) => {
    const ranges: [string, string][] = [
      ["2027-12-06", "2027-12-07"],
      ["2027-12-13", "2027-12-14"],
      ["2027-12-20", "2027-12-21"],
    ];
    await given("менеджер «Математики» відкрив чергу рішень, де 3 записи на розгляді", async () => {
      await employeeWithRequests("bulk04", "MATH", ranges);
      await page.goto("/manage");
      for (const r of ranges) await expect(pendingCard(page, r)).toHaveCount(1);
    });

    await when("він позначає 2 з них і натискає «Схвалити вибрані»", async () => {
      await select(page, ranges[0]);
      await select(page, ranges[1]);
      await page.getByRole("button", { name: "Схвалити вибрані" }).click();
    });

    await thenStep(
      page,
      {
        clause: "ці 2 записи показано в розділі «Вирішені» зі статусом «схвалено», третій лишається в розділі «На розгляді», а менеджер бачить повідомлення «Схвалено записів: 2»",
        visible: [
          "повідомлення «Схвалено записів: 2»",
          "записи 06.12.2027 – 07.12.2027 і 13.12.2027 – 14.12.2027 — у розділі «Вирішені» з підписом «схвалено»",
          "запис 20.12.2027 – 21.12.2027 — у розділі «На розгляді»",
        ],
      },
      async () => {
        await expect(page.getByText("Схвалено записів: 2", { exact: true })).toBeVisible();
        const decided = page.getByRole("region", { name: "Вирішені" });
        for (const r of ranges.slice(0, 2)) {
          const c = decided.locator("[data-slot=card]").filter({ hasText: `${ddmmyyyy(r[0])} – ${ddmmyyyy(r[1])}` });
          await expect(c).toHaveCount(1);
          await expect(c).toContainText("схвалено");
        }
        await expect(pendingCard(page, ranges[2])).toHaveCount(1);
      },
    );
  },
);

