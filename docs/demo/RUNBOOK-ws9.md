# RUNBOOK: демо WS9 «Software Factory» — фабрика на вимогах PM, автозлиття і UAT на проді двійника

Сценарій демо для заняття Вт 03.11.2026: що показати, які команди запустити, що має вийти і що робити, якщо не вийшло
(План Б). Зразок формату — [`RUNBOOK-ws8.md`](RUNBOOK-ws8.md). Дані лише синтетичні (`*@example.test`).

Команди — PowerShell (Windows PowerShell 5.1 і PowerShell 7): без `&&`, кожна команда окремим рядком. Що перевірено
02.11.2026 (Node 24.18.0, Claude Code 2.1.308, Windows PowerShell 5.1.26100):

- `npm run demo` фабрики (6 с), `factory status`, `factory proof`;
- імпортер на файлі PM і відмова на допуску (TBD) у пісочниці (разом ≈ 0,4 с, $0);
- `/api/health` проду двійника (`sha` = `55c748e`);
- повний `npm run uat -- --url … --grep AC-BULK` на проді двійника о 13:09 за Києвом (≈ 102 с: 3 PASS, 1 NEEDS-HUMAN,
  $0,0466; прибирання — 5 видалено, 0 лишилось).

Повний прогін фабрики з моделлю (`factory run`, 160 с, $0,35) на сцені **не повторюємо**. Показуємо записаний прогін
`run-20261102105148-3f6cd9` зі сховища прогонів (`$S\demo-store`) і PR #3. Усі посилання на код ведуть на теги й
коміти, а не на `main`.

Що таке двійник: окрема копія демо-проєкту зі **своїм** репо, своєю базою Supabase і своїм проєктом Vercel. Фабрика тут
повністю автономна (рівень `auto` для всіх класів змін, включно з міграціями). Тому автозлиття й `db-deploy` ніколи не
торкаються проду основного демо.

```powershell
$S = 'C:\Users\koldo\AppData\Local\Temp\claude\D--projects-clients-udc\23a397ea-0288-4ed4-ad2d-cd0a124d1687\scratchpad\ws9'
$T = 'D:\projects\clients\quitcode\2026-quitcode-09-leave-portal-factory'
$F = "$S\demo-run\bin\factory.mjs"
$P = 'https://quitcode-ws9-leave-portal-factory.vercel.app'
```

- `$S` — тека з копією фабрики, якою зроблено прогін (`demo-run`), її конфігом (`demo-control`: задача, конфіг,
  запечатані приховані сценарії) і сховищем прогонів (`demo-store`). Тека поза репо, нічого з неї не комітимо.
  **Ключ прихованих сценаріїв на сцені не потрібен** (жодна команда нижче його не читає) і на екран не виводиться.
- `$T` — двійник (`koldovsky/2026-quitcode-09-leave-portal-factory`). `.env.local` двійника на екран не відкривати.

| Що | Де |
|---|---|
| Вимога PM (зріз «масове рішення») | <https://github.com/koldovsky/2026-quitcode-07-leave-portal-spec/blob/435fbc9/docs/requirements/02-bulk-decisions.md> — AC-BULK-01…04; копія в двійнику — <https://github.com/koldovsky/2026-quitcode-09-leave-portal-factory/blob/ws9-00-baseline/requirements/02-bulk-decisions.md> |
| PR #1 «Оновлення вимог», PR #2 «Специфікація» | <https://github.com/koldovsky/2026-quitcode-09-leave-portal-factory/pull/1> (злито, `2f24601`), <https://github.com/koldovsky/2026-quitcode-09-leave-portal-factory/pull/2> (злито, `f96c3f1`) |
| Тести-спершу | <https://github.com/koldovsky/2026-quitcode-09-leave-portal-factory/blob/ws9-01-red/tests/e2e/manage-bulk.spec.ts> (UAT AC-BULK-01…04) і `tests/db/bulk-decisions-db.test.ts` на тому самому тезі |
| PR #3 фабрики | <https://github.com/koldovsky/2026-quitcode-09-leave-portal-factory/pull/3> — опис = пакет доказів; злито GitHub-ом (auto-merge, squash) 02.11 11:03:49Z → `55c748e` |
| Пакет доказів у репо | <https://github.com/koldovsky/2026-quitcode-09-leave-portal-factory/blob/ws9-02-merged/docs/factory/run-20261102105148-3f6cd9.md> |
| Зміна фабрики (diff) | <https://github.com/koldovsky/2026-quitcode-09-leave-portal-factory/compare/ws9-01-red...ws9-02-merged> |
| CI на `main` після злиття | `CI` (з `db-deploy`, міграцію застосовано): <https://github.com/koldovsky/2026-quitcode-09-leave-portal-factory/actions/runs/41433749331>; `e2e`: <https://github.com/koldovsky/2026-quitcode-09-leave-portal-factory/actions/runs/41433749358> |
| Звіт UAT з проду двійника | <https://github.com/koldovsky/2026-quitcode-09-leave-portal-factory/blob/ws9-03-uat/docs/qa/uat/2026-11-02/report.md> |
| Підсумок UAT і застереження | <https://github.com/koldovsky/2026-quitcode-09-leave-portal-factory/blob/ws9-03-uat/docs/demo/ws9/uat-summary.md> |
| Прод двійника | <https://quitcode-ws9-leave-portal-factory.vercel.app> (`/api/health`, `/manage`) |

| Тег | Коміт | Що в ньому | Демо |
|---|---|---|---|
| `ws9-00-baseline` | `f96c3f1` | `main` після PR #2: вимоги PM і специфікація `add-bulk-decisions`, рядки матриці «відкладено» | 2a |
| `ws9-01-red` | `6ffc15a` | тести-спершу: AC-BULK-01…03 червоні (Vitest/PGlite), UAT-специфікація AC-BULK-01…04, `scripts/factory-tap.mjs`; база прогону фабрики | 2b–2c |
| `ws9-02-merged` | `55c748e` | PR #3 фабрики, злитий squash; міграція `20261102120000_bulk_decisions.sql` застосована CI; прод = цей коміт | 2d–2f |
| `ws9-03-uat` | коміт цього RUNBOOK (гілка `ws9/demo-docs`) | звіт UAT 02.11, `docs/demo/ws9/`, цей RUNBOOK | 2f, План Б |

**Хронометраж — за колодою:** демо 1 (сл. 23) ≈ 4 хв; демо 2 (сл. 45–50) ≈ 14 хв. Кроки **обов'язково** вкладаються
в цей час, «якщо є час» — лише коли демо йде швидше. **Кожен живий запуск — не довше 2 хв**, далі План Б (остання
колонка). Пульт у колоді: 1a (сл. 80), 2a–2d (сл. 81–84). Там, де колода й цей файл розходяться, правильно тут.

## 0. Передумови (увечері й за годину до заняття)

1. **Supabase двійника не на паузі, прод = `ws9-02-merged`.**

   ```powershell
   Set-Location $T
   git fetch origin --tags --force
   npm run smoke -- $P (git rev-parse 'ws9-02-merged^{commit}')
   ```

   `^{commit}` обов'язковий: тег анотований, і без нього `git rev-parse` дає SHA об'єкта тегу (`df8fe56`), а smoke
   падає з «прод показує 55c748e, а очікувався df8fe56» (перевірено 02.11). Очікувано `OK — прод живий, сторінка входу відкривається, база відповідає.` і `"sha":"55c748e2…","db":"ok"`. Якщо
   на `main` з'явилися нові коміти — порівнюйте з `git rev-parse origin/main`. Якщо `db` не `ok`: Supabase Dashboard →
   проєкт `quitcode-ws9-leave-portal-factory` → не «Paused» (інакше «Resume project», ≈ 2 хв), потім smoke ще раз.
   `/login` 200 сам нічого не доводить — цю сторінку віддає застосунок без бази.
2. **Теги на місці.**

   ```powershell
   foreach ($t in 'ws9-00-baseline','ws9-01-red','ws9-02-merged','ws9-03-uat') { "$t -> $(git rev-parse --short "$t^{commit}")" }
   gh pr view 3 --json state,mergeCommit
   ```

   Очікувано: `f96c3f1`, `6ffc15a`, `55c748e`, коміт RUNBOOK; `{"mergeCommit":{"oid":"55c748e2…"},"state":"MERGED"}`.
3. **Вкладка Actions двійника: два червоні workflow на `55c748e` — очікувано, не лякатися.**
   - `quality` → «Ворота: fallow audit» червоний: невикористаний `scripts/factory-tap.mjs` і складність `ManagePage` 22.
     Це дорадча перевірка поза ruleset. Ворота фабрики `maintainability` цього не зловили — це чесний приклад для
     слайдів (розділ 6).
   - `smoke` червоний — **хибна тривога**. У двійнику не задано змінну репо `PROD_URL`, тож `smoke.yml` перевіряв прод
     WS6-демо (`9ab9df1`), а не двійник. Виправлення — до заняття, одна команда власника репо:
     `gh variable set PROD_URL --repo koldovsky/2026-quitcode-09-leave-portal-factory --body https://quitcode-ws9-leave-portal-factory.vercel.app`
     (після наступного пушу в `main` smoke стане зеленим). Якщо не встигли — сказати вголос одним реченням.
4. **Сховище прогонів і копія фабрики на місці** (тека `$S` тимчасова — перевірити ввечері й уранці):

   ```powershell
   node $F status --store "$S\demo-store"
   ```

   Очікувано 3 прогони: два `refused` (без `factory doctor`; TBD), один `released` з 8 × `PASS` і
   `n/a mutation` (повний вивід — `docs/demo/ws9/factory-status.txt`). Якщо теки `$S` немає — усе демо 2 йде з
   Планів Б (посилання на теги вище й `docs/demo/ws9/`).
5. **Демо-користувачі є, синтетичних `uat-*` немає.** Supabase → Authentication → Users: 5 базових (`admin@`,
   `manager.math@`, `manager.primary@`, `teacher@`, `teacher2@example.test`), жодного `uat-*` (стан 02.11 після UAT:
   `remaining: []`). Черга менеджера MATH на проді **порожня** («Нових заявок немає») — так і має бути. Кнопку
   «Схвалити вибрані» видно лише тоді, коли в черзі є записи на розгляді, тому живу сторінку з масовим рішенням
   показуємо кадрами UAT (розділ 5).
6. **Версії:** `node --version` → `v24.18.0`; `claude --version` → `2.1.308 (Claude Code)`; Next.js 16.4.3,
   `@playwright/test` 1.64.1 (`package.json` двійника).
7. **Робоча копія двійника чиста й на `main`:** `git -C $T switch main`, `git -C $T pull`, `git -C $T status --short`
   → порожньо (`.env.local`, `test-results/`, `playwright/.auth/` git ігнорує).

## 1. Демо 1 — живий `npm run demo` фабрики (сл. 23, ≈ 4 хв)

Без ключа API і без моделі: чотири **сценарні** виконавці (чесний, підгонка під тести, підміна тестів, підглядання).
Вартість `$0.0300` / `$0.0400` у виводі — умовна, моделі тут немає.

| Крок | | Показати / команда | Очікувано | План Б |
|---|---|---|---|---|
| 1 | **обов'язково** | `Set-Location "$S\demo-run"` → `npm run demo` | ≈ 6–7 с. Крок 1: 9 × `PASS` і `state=awaiting-release-approval (class code is one-human)`. Крок 2: `SEPARATION: alice requested this run and cannot approve its release` → `state=released` → `… · not pushed`. Крок 3: `PASS visible-tests 5 visible test(s) passed`, `PASS mutation 3/3 …`, `FAIL holdouts 4/8 hidden scenario(s) passed`. Крок 4: лише `PASS boundary` і `FAIL integrity protected files changed: test/slug.test.mjs was modified`. Крок 5: `denied Read: path outside the workspace: …\control\holdouts\set-a.json`. Підсумок: `"runs": 4`, `"accepted": 2`, `"released": 1`, `"overfitGapPts": 25` | записаний вивід 02.11 (поза репо — `$S\demo-evidence\08-npm-run-demo.txt`, `$S\demo-run-output.txt`); id прогонів і дайджести щоразу інші, рядки воріт — ті самі |
| 2 | якщо є час | відкрити `dashboard.html` з рядка `dashboard written to …` | «спершу результати, потім вартість» — сторінка метрик прогону | пропустити |

## 2. Демо 2a — вимога PM → імпортер → задача (сл. 45, ≈ 2,5 хв)

Живий крок робимо в **пісочниці** `$S\rehearse-tbd`: копія конфігу і свіже порожнє сховище. Справжні `demo-control` і
`demo-store` не змінюються, а задача в пісочниці отримує «TBD» — це потрібно для кроку 2b.

```powershell
$R = "$S\rehearse-tbd"
Remove-Item -Recurse -Force $R -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force "$R\store" | Out-Null
Copy-Item -Recurse "$S\demo-control" "$R\control"
Copy-Item "$S\demo-store\readiness.json","$S\demo-store\autonomy.json" "$R\store\"
Set-Location $R
```

| Крок | | Показати / команда | Очікувано | План Б |
|---|---|---|---|---|
| 1 | **обов'язково** | вимога PM у браузері: посилання «Вимога PM» з таблиці вгорі | AC-BULK-01…04 з ID і «Дано / Коли / Тоді»; AC-BULK-04 — стан сторінки (лише браузер) | `requirements/02-bulk-decisions.md` локально в `$T` |
| 2 | **обов'язково** | `$json = node control\tools\ac-to-task.mjs --file "$T\requirements\02-bulk-decisions.md" --ac AC-BULK-01,AC-BULK-02,AC-BULK-03 --id bulk-db --holdout bulk-db --target $T --size small` → `[IO.File]::WriteAllLines("$R\control\tasks\bulk-db.json", $json)` | менш ніж за 1 с; у stderr `ac-to-task: pass-to-pass skips e2e-only ACs (not run by Vitest): AC-USERS-11`. Запис через `WriteAllLines`, а не `>`: у PowerShell 5.1 `>` пише UTF-16, і фабрика такий JSON не прочитає | `docs/demo/ws9/tbd-refusal.txt` (той самий імпорт у Git Bash) |
| 3 | **обов'язково** | `code control\tasks\bulk-db.json` | `requirements[].id` = AC ID; `verifiedBy`: `visible:AC-BULK-0N` + `holdout:bulk-db`; `nonFunctionals` — 5 × `"TBD"` (security, accessRules, idempotency, tenancy, failureModes). AC-BULK-04 у задачі немає: стан сторінки доводить UAT після деплою | задача прогону з заповненими нефункціональними вимогами — `code "$S\demo-control\tasks\bulk-db.json"` |

## 3. Демо 2b — схвалити конфіг і намір; відмова на допуску (сл. 46, ≈ 1,5 хв)

**Важливо для слів на сцені:** `approve intent` **приймає** задачу з TBD — він лише фіксує дайджест. Відмовляє
`factory run`, на **допуску**: до робочої копії, до моделі, $0. Не кажіть «approve відмовив».

| Крок | | Показати / команда | Очікувано | План Б |
|---|---|---|---|---|
| 1 | **обов'язково** | `node $F approve config --as koldovsky --control control --target $T --store store` | `approved factory configuration 93e98a6beb41…` — той самий дайджест конфігу, що в пакеті доказів прогону («factory config 93e98a6beb41») | `docs/demo/ws9/tbd-refusal.txt` |
| 2 | **обов'язково** | `node $F approve intent bulk-db --as koldovsky --control control --target $T --store store` | `approved intent of task bulk-db at …` (exit 0). Дайджест у PowerShell інший, ніж у Git Bash (`3c405261…`): кінці рядків CRLF — це і є «один байт змінює дайджест» | те саме |
| 3 | **обов'язково** | `node $F run bulk-db --as koldovsky --control control --target $T --store store` | ≈ 0,1–0,3 с: `run-…  bulk-db  state=refused  (task not admissible)` і 5 рядків `- non-functional "security" is still undecided` (так само `accessRules`, `idempotency`, `tenancy`, `failureModes`), `attempts 0/? · cost $0.0000`. **Exit 0** (відмова — це стан прогону, а не помилка CLI) | те саме; записаний прогін-відмова в `demo-store` — `run-20261102105106-84d80d` |
| 4 | якщо є час | `code "$S\demo-store\approvals.jsonl"` | ланцюжок схвалень справжнього прогону: config, intent (з дайджестами), хто схвалив | пропустити |

Якщо замість «task not admissible» вийшло `the target has no recent passing readiness check (factory doctor)` —
пісочницю зібрано без `readiness.json` (повторіть блок команд з розділу 2) або минуло понад 7 днів від `factory doctor`
02.11. На сцені — План Б.

## 4. Демо 2c–2d — прогін, ворота і пакет доказів (сл. 47–48, ≈ 5 хв) — записаний прогін

| Крок | | Показати / команда | Очікувано | План Б |
|---|---|---|---|---|
| 1 | **обов'язково** | `node $F status --store "$S\demo-store"` | `run-20261102105148-3f6cd9  bulk-db  state=released`, `attempts 1/3 · cost $0.3500`; `PASS boundary 29 tool call(s) decided by the policy hook, 2 denied` · `PASS integrity 287 protected file(s) unchanged` · `PASS diff 7 file(s), 115 changed lines` · `PASS maintainability …` · `PASS visible-tests 102 visible test(s) passed` · `PASS repeat outcomes identical across 2 runs` · `PASS holdouts 3/3 hidden scenario(s) passed` · `PASS review reviewer could not refute the change …` · `n/a mutation: no mutable operators on the changed lines`; `released to branch factory/run-20261102105148-3f6cd9 at 41ce8a63f8a3 · rollback target 6ffc15af2ed3 · not pushed` | `docs/demo/ws9/factory-status.txt` на тезі `ws9-03-uat` |
| 2 | **обов'язково** | `node $F proof run-20261102105148-3f6cd9 --store "$S\demo-store"` (прокрутити вгору) | «Requirements and evidence»: AC-BULK-01…03 → `AC-BULK-0N ✓, holdout bulk-db 3/3`; «Gates»; «Not verified»: ізоляція на рівні політики в одному обліковому записі ОС і «not applicable — mutation…»; «Change» — 7 файлів; «Cost and provenance»: `Total $0.35 (builder $0.26, reviewer $0.09) across 1 attempt(s)`, моделі Sonnet/Sonnet, `base commit 6ffc15af2ed3`; `digest: 3c6cb2067f4c…` | пакет доказів у репо — посилання «Пакет доказів у репо» з таблиці вгорі (тег `ws9-02-merged`) |
| 3 | **обов'язково** | Сказати чесно | Червоної спроби не було: усе PASS з першої спроби. **Мутаційні ворота — n/a**, тобто сила тестів цього прогону мутаціями не виміряна. Прогін — 160 с, $0,35 | — |
| 4 | якщо є час | diff зміни: посилання «Зміна фабрики» з таблиці вгорі | 8 файлів: міграція RPC `approve_leave_records`, `approveSelected`, сторінка, повідомлення, типи, `docs/conformance.md` і пакет доказів | те саме |

## 5. Демо 2e–2f — PR, автозлиття, деплой, UAT (сл. 49–50, ≈ 5 хв) — НЕ СКОРОЧУЄТЬСЯ

Як PR потрапив у GitHub: копія фабрики зупиняється на локальній гілці (`not pushed`). Гілку `factory/run-…` запушено, PR
відкрито з пакетом доказів в описі, автозлиття ввімкнено **скриптом поза фабрикою** («у курс-редакції — поки
скриптом»). Далі GitHub злив PR сам, щойно позеленіли обов'язкові `spec`, `app`, `conformance`, `db-check`. Людина в
GitHub не схвалювала нічого: «Reviewers — No reviews».

| Крок | | Показати / команда | Очікувано | План Б |
|---|---|---|---|---|
| 1 | **обов'язково** | `gh pr view 3 --web` (або посилання PR #3) | фіолетове «Merged», гілка `factory/run-20261102105148-3f6cd9` → `main`; в описі — тип «Реалізація (фабрика, повністю автономно: tier auto, auto-merge разом із міграцією)», рядок про тести-спершу й `next build` / `vitest 136/136` / `check-migration-order`, далі пакет доказів; Checks 14; «No reviews» | знімки поза репо: `$S\demo-evidence\screens\after-merge-pr3.png`, `…\after-merge-pr3-full.png` |
| 2 | **обов'язково** | PR #3 → Checks: обов'язкові зелені; на `main` → посилання «CI на main» → job `db-deploy` → крок `supabase db push` | `Applying migration 20261102120000_bulk_decisions.sql...` → `Finished supabase db push.` Міграцію на базу двійника застосував CI, не людина і не фабрика | те саме посилання (лог job-а зберігається в GitHub) |
| 3 | **обов'язково** | `Invoke-RestMethod "$P/api/health"` | `ok: True`, `sha: 55c748e236d8ab79cc8c11f2d12bd0f1892c87ed` (= коміт злиття = `ws9-02-merged`), `env: production`, `db: ok`. Так перевіряємо, що `main` справді доїхав до проду | `$S\demo-evidence\00-summary.md` |
| 4 | **обов'язково** | `code docs\qa\uat\2026-11-02\report.md` (попередній перегляд Markdown) у `$T` на гілці з тегом `ws9-03-uat` | шапка: `/api/health: коміт 55c748e`, «Код тестів: `main` @ `55c748e`», Playwright 66,5 с, «PASS 3, FAIL 0, NEEDS-HUMAN 1», розбір $0,0466, «Прибирання: … видалено 5, лишилось 0, заявок, що лишились: 0». AC-BULK-01…03 — **PASS** (R6). AC-BULK-04 — **NEEDS-HUMAN** (R3, розділ 6) | посилання «Звіт UAT з проду двійника» з таблиці вгорі |
| 5 | **обов'язково** | кадри: `docs\qa\uat\2026-11-02\frames\AC-BULK-04-then-1.png`; кадр «Коли» поза репо `$S\demo-evidence\screens\after-merge-twin-manage-bulk-selected.png` | «Коли»: два записи позначено, кнопка «Схвалити вибрані». «Тоді»: зелене «Схвалено записів: 2», третій запис «На розгляді» | ті самі файли; `after-merge-uat-AC-BULK-01-then.png` — «Вирішені» з двома «схвалено» |
| 6 | якщо є час | живий UAT: `npm run uat -- --url $P --grep AC-BULK` (у `$T`) | ≈ 102 с: `8 passed (1.1m)`, далі `AC-BULK-01…03 [claude-haiku-5-5] → PASS`, `AC-BULK-04 [claude-haiku-5-5] → NEEDS-HUMAN`, `AC-BULK-04 [claude-sonnet-5-5] → NEEDS-HUMAN … (суперечка → Sonnet)`, `Звіт: docs/qa/uat/2026-11-03/report.md`, `Є NEEDS-HUMAN: рішення — за PM`, exit 0. **Пише в прод-базу двійника:** 5 синтетичних `uat-…@example.test` із заявками, усіх видаляє teardown. Довше за 2 хв — Ctrl+C і розділ 7 | `docs/demo/ws9/uat-prod-terminal.txt` |

Після будь-якого живого або репетиційного UAT: `report.mjs` пише в `docs/qa/uat/<дата прогону за Києвом>/` і спершу
стирає там `frames/`. Репетиція 02.11 перезапише закомічений звіт: `git restore docs/qa/uat/2026-11-02`. Прогін
03.11 потрапить у нову теку `docs/qa/uat/2026-11-03/` — її після заняття видалити або закомітити окремим PR (лише
`report.md`, `manifest.json`, `frames/`, без відео й трас).

## 6. Що показати чесно (і що відрізняється від колоди)

- **AC-BULK-04 — NEEDS-HUMAN, і це урок, а не вада продукту.** Перевірки Playwright зелені і на проді, і в CI `e2e`.
  Агент не підтвердив AC за кадром, бо: (1) кадр «Тоді» знято лише в межах екрана, а «Вирішені» нижче краю;
  (2) на кадрі є записи AC-BULK-02/03, від яких застосунок відмовився, — вони висять до `afterAll`; (3) агент
  процитував дати з дефісом, а на сторінці тире (R4 — як у WS8). Рішення — за PM (відео/траса). Рядок матриці
  AC-BULK-04 — «відкладено (UAT 02.11: NEEDS-HUMAN — рішення PM …)», а не «реалізовано».
- **Фабрика сама перевела рядки матриці AC-BULK-01…03 на «реалізовано».** `ac:coverage` зелений, бо тести є, але
  статус змінив агент, а не людина. Питання для обговорення: хто в команді має право ставити «реалізовано».
- **fallow audit на `main` червоний** (дорадчий): `scripts/factory-tap.mjs` — «unused file», складність `ManagePage`
  22. Ворота фабрики `maintainability` перевіряють довжину файлів, залежності й дублювання — складність не ловлять.
  Висновок для слайду: ворота фабрики не замінюють CI команди.
- **Мутації — n/a.** Не казати «тести сильні за мутаціями»: на цьому прогоні це не виміряно.
- **Відмова через TBD — на допуску `factory run`, не на `approve intent`** (розділ 3).
- **`deliver` / `uat` — не з копії фабрики, якою зроблено прогін**: push, PR і автозлиття зроблено скриптом, UAT —
  командою WS8 після перевірки `/api/health`. Курс-редакція фабрики має для цього окремі команди (у колоді —
  сл. 42); на цьому прогоні ми їх не використовували.
- **`smoke` на `main` червоний — хибна тривога** (передумова 3).

## 7. Прибирання після заняття

- **Користувачі `uat-*`.** Прогін прибирає за собою сам. Перевірка — `$T\test-results\uat-cleanup.json`:
  `"remaining": []`, `"leftoverRequests": 0`. Якщо прогін обірвався (Ctrl+C), запустіть лише прибирання:

  ```powershell
  Set-Location $T
  $env:UAT_BASE_URL = $P
  npx playwright test --project=cleanup
  Remove-Item Env:UAT_BASE_URL
  ```

  Очікувано `1 passed`, у `uat-cleanup.json` — `remaining: []`. Supabase → Authentication → Users: лише 5 базових.
- **Пісочниця:** `Remove-Item -Recurse -Force "$S\rehearse-tbd"`. `demo-control` і `demo-store` не чіпати — це
  записаний прогін.
- **Двійник:** `git status --short` — порожньо (або лише `?? docs/qa/uat/2026-11-03/`, див. розділ 5).
  `playwright\.auth\` і `test-results\` містять сесії — не показувати й не комітити.
- **Нічого не зливати руками в `main` двійника** поза PR: ruleset `factory-main` вимагає PR і зелені `spec`, `app`,
  `conformance`, `db-check`; `db-deploy` застосовує міграції з `main` до бази двійника.

## 8. Докази в `docs/demo/ws9/`

Усе нижче — справжній вивід 02.11.2026. Відео, траси й `.env*` сюди не потрапляють. Перед комітом файли перевірено
пошуком на ключі Supabase, JWT, рядки підключення до бази й паролі: збігів немає.

| Файл | Що |
|---|---|
| `uat-summary.md` | підсумок UAT AC-BULK-01…04 на проді двійника, розбір NEEDS-HUMAN AC-BULK-04, чесні застереження |
| `uat-prod-terminal.txt` | термінал `npm run uat -- --url … --grep AC-BULK` (13:09 за Києвом) |
| `uat-cleanup.json` | журнал прибирання цього прогону: 5 видалено, 0 лишилось |
| `factory-status.txt` | `factory status` сховища прогонів (2 відмови + released) |
| `tbd-refusal.txt` | імпортер на файлі PM → задача з TBD → `approve config` / `approve intent` → `factory run` відмовляє на допуску (пісочниця, Git Bash) |

Звіт UAT із кадрами — `docs/qa/uat/2026-11-02/` (`report.md`, `manifest.json`, `frames/`). Поза репо (`$S\demo-evidence\`):
підсумок демо `00-summary.md`, `07-proof.txt` (пакет доказів), `08-npm-run-demo.txt`, знімки `screens\`
(PR #3 після злиття, `/manage` двійника з порожньою чергою, кадр «Коли» з UAT-відео AC-BULK-04, кадри «Тоді»).
