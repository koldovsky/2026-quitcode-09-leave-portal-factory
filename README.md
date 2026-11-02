# Демо WS6: портал відсутностей персоналу школи

> **Близнюк для фабрики (WS9).** Копія демо [2026-quitcode-06-leave-portal-demo](https://github.com/koldovsky/2026-quitcode-06-leave-portal-demo) станом на `main` 9ab9df1 з власним розгортанням (окремі Supabase і Vercel). Тут зріз реалізує фабрика [2026-quitcode-09-factory](https://github.com/koldovsky/2026-quitcode-09-factory) автономно: ворота → PR → автозлиття → розгортання → UAT. Основне демо курсу — у вихідному репо.

Демо-проєкт заняття «Специфікації на практиці: старт командного проєкту» курсу QuitCode.
Створено з шаблону `koldovsky/2026-quitcode-06-project-template` і проведено через увесь цикл:
продукт PM → специфікація spec-v0.1 → питання розробника → реалізація → spec-v0.2 → оновлення реалізації до spec-v0.2.
Дані синтетичні, назви анонімізовано.

Це **репозиторій команди** в моделі «одна команда — один репозиторій»: спека PM і код живуть разом, усі працюють
гілками й PR-ами в одному репо. На сцені автор грає всі ролі — PM, техліда й розробника, тож
`.github/CODEOWNERS` і `docs/team.md` містять лише `@koldovsky`, а ruleset демо-репо не вимагає approve
(свій PR схвалити не можна); у команді — 1 approve і CODEOWNERS (`docs/bootstrap.md`, крок 6).
Кожен етап позначено тегом (теги — історичні чекпойнти, їх не переносимо):

| Тег | Що показує |
|---|---|
| `demo-01-template` | шаблон + `product/` PM (бачення, глосарій, ролі й матриця прав, дорожня карта, denylist) |
| `spec-v0.1` | перша версія специфікації `openspec/specs/leave-requests/spec.md` (AC-LEAVE-01…09) |
| `demo-02-clarify` | питання розробника Q1–Q5 (на тезі — `docs/spec-reading.md`, на `main` — `docs/spec-reading/koldovsky.md`; `docs/demo/issues/`) і відповіді PM (`product/decisions.md`) |
| `demo-03-impl` | реалізація зрізу: міграція з RLS, `src/lib/leave`, сторінки, тести з AC ID, `docs/conformance.md` |
| `spec-v0.2` | уточнена специфікація: MODIFIED AC-LEAVE-01/02/04/05, нові AC-LEAVE-10, 11 |
| `demo-04-sync` | дрейф (`docs/demo/drift-ci.txt`: нові AC без рядків матриці) і реалізація spec-v0.2 — AC-LEAVE-01…11 «реалізовано» |

Теги зроблено до 12.10.2026, у попередній моделі курсу: файли процесу на них (CI, README, `docs/`) описують ту модель. Чинний стан — `main`.

Сценарій для ведучого й кроки з акаунтами (Supabase, Vercel, GitHub) — [docs/demo/RUNBOOK.md](docs/demo/RUNBOOK.md).

**WS7 «Fullstack з AI: фронт і бек» (20.10.2026)** — зріз `add-user-invites` (запрошення посиланням для активації й ролі)
у моделі v2: вимоги PM — в окремому репо [`koldovsky/2026-quitcode-07-leave-portal-spec`](https://github.com/koldovsky/2026-quitcode-07-leave-portal-spec)
(`docs/`), тут — знімок `requirements/` (`/requirements-sync`), специфікація `openspec/specs/user-management/spec.md`.

| Тег | Що показує |
|---|---|
| `ws7-01-design-system` | дизайн-система: токени (`src/app/globals.css`), shadcn/ui (`src/components/ui/`), [`DESIGN.md`](DESIGN.md), `npm run check:design` в окремому workflow `architecture.yml`, ADR 0001 |
| `ws7-02-invites-roles` | запрошення (`/admin/users`, `/auth/confirm` — сторінка «Активувати акаунт», `verifyOtp` лише в POST, `/account/password`, `src/lib/supabase/admin.ts`) і ролі (`private.admin_set_role` + обгортка `public.admin_set_role`, міграції `20261020000000_admin_user_management.sql` і `20261020000100_admin_set_role_private.sql`), PGlite-тести, ADR 0002, 0003; тег — на фінальному коміті після QA 19.10 (AC-USERS-01…17) |

Сценарій WS7 — [docs/demo/RUNBOOK-ws7.md](docs/demo/RUNBOOK-ws7.md); знімки «до/після» й Плани Б — `docs/demo/ws7/`.

---

## Шаблон командного проєкту: Next.js + Supabase + OpenSpec

Стартовий репозиторій для вебзастосунку «з нуля» в умовах, як у проєкті агенції: **одна команда — один репозиторій**.
PM створює з шаблону репозиторій команди, розробники працюють у ньому як collaborators: спільна реалізація,
задачі (issues) → гілки → PR → рев'ю колеги → merge. Форків немає. В агенції шаблон так само береться для нового
клієнтського проєкту; у курсі — кожна команда (PM + розробники) для свого навчального продукту.

- **Застосунок:** Next.js 16 (App Router, `src/`), вхід email + пароль через Supabase Auth, сторінка
  з email і роллю користувача з таблиці `profiles`; сесію оновлює `src/proxy.ts`.
- **База як код:** одна база Supabase на команду; `supabase/migrations/` (профілі й ролі з RLS і явними GRANT),
  ідемпотентний `seed.sql`, синтетичні користувачі (`npm run users:demo`). Міграції в базу застосовує лише CI.
- **Специфікація:** OpenSpec (`openspec/`) з правилами формату в `openspec/config.yaml`; продуктовий
  контекст PM — `product/`; AC ID наскрізно: спека → задача → назва тесту → `docs/conformance.md`.
- **Агенти:** `AGENTS.md` (+ `CLAUDE.md` = `@AGENTS.md`), команди `/opsx:*` і `/conformance`, скіли
  `spec-clarify` (розробник) і `spec-review` (PM) — однаково в Claude Code і Cursor; `.mcp.json` (Supabase MCP
  лише на читання) і `.claude/settings.json` (заборона читати `.env*` і запускати `supabase db push` та деструктивні
  команди Supabase CLI) діють лише в Claude Code — Cursor цих файлів не читає (див. AGENTS.md, «Секрети»).
- **Ворота:** GitHub Actions `ci.yml` (`spec`, `app`, `conformance`, `db-check` — обов'язкові для PR; `db-deploy` — міграції
  в прод після merge), `.github/CODEOWNERS`, шаблон PR, форми issues «Питання до специфікації» і «Задача», `.coderabbit.yaml`.

| Шар курсу | Де в шаблоні |
|---|---|
| Правила й команди | `AGENTS.md`, `CLAUDE.md`, `.claude/commands/`, `.cursor/commands/` |
| Скіли | `.claude/skills/` (Cursor читає цю ж теку) |
| MCP з мінімальними правами | `.mcp.json`, `.claude/settings.json` (лише Claude Code) |
| Специфікації | `product/`, `openspec/`, `scripts/check-*.mjs`, `docs/conformance.md` |
| Командна робота | `.github/` (CI, CODEOWNERS, шаблони), `docs/bootstrap.md`, `docs/onboarding.md`, `docs/team.md` |

## Модель роботи: один репозиторій команди

```text
шаблон (цей репозиторій)
  └─ «Use this template» → <pm>/<team-repo>   (публічний, особистий акаунт PM)
        ├─ main            ← лише через PR (ruleset: 1 approve, CODEOWNERS, зелений CI); теги spec-vX.Y
        ├─ spec/<id>       ← PM: зміна специфікації (рев'ю техліда); product/context — продуктовий контекст
        ├─ task/<N>-…      ← розробник: задача з issue #N (рев'ю колеги)
        └─ onboarding/<login>, template/<коротко>
  Supabase: організація <team-slug> PM, один проєкт (розробники — Developer)   ← міграції застосовує CI (db-deploy)
  Vercel: проєкт PM, прод з main, preview для кожного PR
```

| Роль | Хто | Що робить |
|---|---|---|
| PM | власник репозиторію, Supabase-організації й проєкту, Vercel-проєкту | налаштування (`docs/bootstrap.md`), `product/` і зміни специфікації, відповіді на `spec-question`, теги `spec-vX.Y`, задачі разом із техлідом |
| Техлід | один із розробників (обирає команда) | співвласник спеки в CODEOWNERS, рев'ю PR-ів PM зі спекою, зміна `impl-<зріз>` (design + tasks) з командою, `npm run users:demo` |
| Розробник | collaborator (Write) | онбординг (`docs/onboarding.md`), питання до спеки, задачі (PR), рев'ю PR-ів колег |

Автор PR не може схвалити свій PR, тому PR PM зі спекою схвалює техлід, а PR розробника — будь-який колега
(для `supabase/migrations/` і `openspec/`, зокрема archive `impl-<зріз>` в останньому PR зрізу, — власник із CODEOWNERS).
Ruleset вимагає approve **останнього push** від іншої людини: будь-який ваш push після approve (виправлення за рев'ю,
archive, `Update branch`) потребує нового approve; хто натиснув `Update branch`, стає автором останнього push і сам
схвалити PR уже не може, тому гілку оновлює лише автор PR. Merge блокують і невирішені обговорення (Require conversation
resolution): кожен коментар рев'ю — і CodeRabbit теж — виправте або дайте відповідь, потім **Resolve conversation**.

## Перед початком (PM і розробники)

- Node 24 (`node -v`), Git, GitHub CLI (`gh`).
- OpenSpec CLI **глобально** й тієї ж версії, що в `package.json`:
  `npm i -g @fission-ai/openspec@1.14.1` → `openspec --version` має показати `1.14.1`
  (стара глобальна версія — оновіть тією ж командою). Команди `/opsx:*` і скіли `openspec-*` викликають
  просто `openspec`, а в PATH оболонки агента немає `node_modules/.bin`. Скрипти `npm run spec:*` і CI
  беруть версію з devDependencies. Телеметрію вимикає `openspec config set telemetry.enabled false`.
- Docker **не** потрібен: локально — лише `npm run dev` проти бази команди; міграції на одноразовій базі перевіряє CI (`db-check`).

## Шлях PM

1. **Налаштування команди (день 0, одразу після старту).** Пройдіть чекліст `docs/bootstrap.md` по порядку:
   **Use this template → Create a new repository** (власник — ваш особистий акаунт, **Public** від першого push і
   назавжди: коміти колег, запушені в приватний репозиторій, Vercel Hobby блокує, і після відкриття вони лишаються
   заблокованими) → collaborators (інвайти мають бути прийняті) → мітки `spec-question` і `task` →
   CodeRabbit на репозиторій → Supabase (організація `<team-slug>`, проєкт, розробники —
   роль **Developer**, реєстрацію й Confirm email вимкнено, URL Configuration) → environment `production` із секретом
   `SUPABASE_DB_URL` → Vercel (дві змінні `NEXT_PUBLIC_…`, Require Log In вимкнено) → **Actions → CI → Run workflow**
   на `main` з `include_seed` (перша міграція й сид) → `npm run users:demo` → зелений CI на `main` → PR `setup/codeowners` (ваш логін і логін техліда; approve техліда) → ruleset `main`
   (імпорт `materials/rulesets/team-main.json` з курсового репозиторію) → посилання в чат команди.
   Докази — у тому ж файлі, PR-ом «Онбординг».
2. **Продукт.** У гілці `product/context` заповніть `product/vision.md`, `glossary.md`, `roles.md` (матриця прав),
   `roadmap.md` → `npm run spec:check` → PR → рев'ю техліда → merge.
   Справжні назви клієнта — не в файли репозиторію, а в локальний `product/denylist.local.txt` (у `.gitignore`;
   `npm run spec:check` читає його, але значень не друкує) і в секрет репозиторію `SPEC_DENYLIST` (Settings → Secrets
   and variables → Actions) — CI отримує його в усіх PR-ах з гілок цього репозиторію.
3. **Перший зріз.** `npm ci`, `openspec --version` = `1.14.1`, гілка `spec/add-<зріз>`, потім у Claude Code
   `/opsx:propose <опис зрізу>` (у Cursor `/opsx-propose`) або вручну: `npx openspec new change add-<зріз>` → `proposal.md` + `specs/<capability>/spec.md`.
   Формат (вимоги EARS з SHALL, `#### Scenario: AC-<AREA>-<NN> …`) агент бере з `openspec/config.yaml`.
   `/opsx:propose` за своєю інструкцією генерує й `design.md` і `tasks.md` (як реалізувати). У зміні PM їх не лишаємо —
   це окрема зміна команди `impl-<зріз>`: додайте до запиту «пиши лише proposal.md і specs/, без design.md і tasks.md»,
   а якщо агент їх усе ж створив — видаліть обидва файли до коміту.
4. **Перевірка.** `npm run spec:validate`, `npm run spec:check`, скіл `spec-review`.
5. **Реліз** — див. «Як виходить версія специфікації» нижче: PR → рев'ю техліда → archive + CHANGELOG + рядки нових AC
   у гілці → повторний approve техліда → merge → тег `spec-v0.1`.
6. **Питання розробників.** Відповідайте в issues `spec-question` (і в коментарях до них); рішення — у `product/decisions.md`;
   якщо змінюється поведінка — нова зміна (MODIFIED/ADDED) і тег `spec-v0.2` тим самим потоком.
7. **Задачі.** Разом із техлідом: з `openspec/changes/impl-<зріз>/tasks.md` — issues форми «Задача» (мітка `task`),
   по одній на пункт; виконавця призначає собі розробник.
8. **Оновлення шаблону** — див. «Оновлення шаблону» нижче.

## Шлях розробника

1. **Онбординг** (`docs/onboarding.md`): прийняти інвайти (GitHub, Supabase) → клон репозиторію команди → Node 24,
   `npm ci` → `.env.local` з двома змінними `NEXT_PUBLIC_…` з Dashboard → `npm run dev` проти бази команди → вхід
   синтетичним користувачем. **Перший PR** — рядок про себе в `docs/team.md` (тип «Онбординг») → рев'ю колеги → merge.
2. **Читання спеки:** скіл `spec-clarify` → питання як issues `spec-question` у репозиторії команди (спершу пошук:
   питання вже є — коментар із новим випадком у тому issue) → свій журнал `docs/spec-reading/<login>.md`.
3. **Як реалізуємо:** техлід із командою — PR «Зміна специфікації» зі зміною `impl-<зріз>` (`npx openspec new change impl-<зріз>`,
   `skip_specs: true` у `.openspec.yaml`, `design.md`, `tasks.md` з «Done when: AC-…») → задачі-issues.
4. **Задача:** призначте себе в issue → `git switch main && git pull` → `git switch -c task/<N>-<коротко>` → код +
   тести `it("AC-…: …")` → `/conformance` (рядок матриці → «реалізовано») → `npm run lint && npm run typecheck && npm test`
   → push → PR «Реалізація задачі» з `Closes #N` → окремим коментарем `@coderabbitai review` → рев'ю колеги (обговорення
   вирішено) → **Squash and merge** → прод-деплой Vercel. `openspec/changes/impl-<зріз>/tasks.md` у PR задачі не змінюйте
   (галочок не ставимо: прогрес — закриті issues; якщо агент через `/opsx:apply` їх поставив — `git restore` цього файлу),
   інакше PR потребує approve власника `openspec/` і конфліктує з паралельними PR-ами. В останньому PR зрізу, до merge, —
   `npx openspec archive impl-<зріз> -y` (незакриті галочки `-y` пропускає з попередженням); approve — PM або техлід.
5. **Міграція в задачі:** `npx supabase migration new <назва>` → SQL (RLS, GRANT, політики) → у тому ж PR; `db-check`
   застосує всі міграції на одноразовій базі й звірить порядок з `main`; рев'ю — власник із CODEOWNERS; після merge
   `db-deploy` застосує її в базу команди. Ніколи `supabase db push` з ноутбука, ніколи DDL у SQL Editor.
   Типи для нових таблиць — готовий `database.types.ts` у Summary прогону `db-check`.
6. **Рев'ю колег:** коментарі з посиланнями на рядки, конкретні пропозиції або обґрунтований approve. Гілку
   (`Update branch`) оновлюйте лише при конфлікті: після будь-якого вашого push approve треба отримати знову.
7. **Пропозиція змінити спеку** (помилка чи прогалина): питання `spec-question` або гілка `spec/<коротко>` від `main` →
   зміна лише в `openspec/changes/<id>/` (`proposal.md` + дельта) → PR «Зміна специфікації». Рішення — за PM.

## Як виходить версія специфікації і що робити з новими AC

1. PM: гілка `spec/<id>` → зміна → PR «Зміна специфікації» → рев'ю техліда (CODEOWNERS для `openspec/` і `product/`).
2. У тій самій гілці, **до merge** (прямі коміти в `main` заборонені): `npx openspec archive <id> -y` → нові AC
   потрапляють в `openspec/specs/` → запис у `product/CHANGELOG.md` → у `docs/conformance.md` рядок для **кожного нового
   AC** зі статусом `відкладено (новий AC — чекає задачі)`, інакше job `conformance` червоний (NO-ROW). Цей push — після
   approve, тож техлід схвалює PR ще раз (ruleset: approve останнього push).
3. Merge → `git switch main && git pull` → `git tag spec-v0.1` → `git push origin spec-v0.1` (або Releases →
   **Draft a new release** → новий тег на `main`; точні назви кнопок звіряємо на репетиції). Виправлення без нової
   поведінки — тег `spec-vX.Y.Z`.
4. Команда: нові й змінені AC → пункти `tasks.md` → issues «Задача» → PR задачі змінює рядок свого AC на `реалізовано`
   разом із тестом. Тест із AC ID, якого ще немає в `openspec/specs/` на `main`, дає ORPHAN — задачу за новою
   поведінкою починаємо після merge PR PM.

## Міграції в прод

**Основний шлях.** Секрет environment `production` `SUPABASE_DB_URL` = рядок **Session pooler** з Supabase → **Connect**
(`postgresql://postgres.<ref>:<пароль>@<pooler-host>:5432/postgres`; порт **5432**, не 6543 — у transaction mode DDL не
застосовуємо; прямий хост на Free лише IPv6, а раннери GitHub — IPv4). Спецсимволи пароля — percent-encoded
(`@` → `%40`, `#` → `%23`, `/` → `%2F`). Job `db-deploy` на push у `main` виконує
`supabase db push --db-url "$SUPABASE_DB_URL"` (спершу `--dry-run` для журналу; без `--include-all`); сид — лише
вручну: **Actions → CI → Run workflow** на `main` з `include_seed` (`--include-seed`). Без секрету job пропускає
крок з повідомленням. Перевіряємо прогоном у день 0.

**Запасний шлях** (якщо `--db-url` не працює): офіційний `supabase link` + `supabase db push`. PM створює scoped token
(Supabase → Account → Access Tokens; доступ лише до проєкту команди, дозвіл **Project Settings → API Keys → API Key
Secrets: Read**) і задає в environment `production` секрети `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`,
`SUPABASE_PROJECT_ID` (ref проєкту), а `SUPABASE_DB_URL` видаляє — `db-deploy` сам перейде на цей шлях:

```bash
supabase link --project-ref "$SUPABASE_PROJECT_ID"   # токен і пароль — з env SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD
supabase db push --dry-run && supabase db push
```

Scoped tokens вийшли в GA 06.10.2026, і є відкритий звіт про 403 на `supabase link` зі scoped token
(supabase/supabase#50244) — тому цей шлях запасний; працює він у вашому проєкті чи ні, звіряємо прогоном.
Класичний токен доступу (до всіх ваших організацій) у репозиторій, куди пишуть 5–7 людей, не кладемо.

**Збої й відновлення:**

- `db-check` FAIL `OLDER` — колега злив новішу міграцію раніше: перейменуйте свій файл новою міткою (команду `git mv`
  друкує `scripts/check-migration-order.mjs`) і запуште.
- `db-deploy` FAIL «Found local migration files to be inserted before the last migration on remote database» — два PR-и
  з міграціями пройшли перевірки паралельно (статуси не вимагають «up to date») і злились у зворотному порядку. Окремий PR:
  `git mv` старшого (ще не застосованого — див. журнал `db-deploy`) файлу на нову мітку без зміни SQL → `db-check`
  покаже попередження `RENAMED`, не FAIL → рев'ю власника з CODEOWNERS → merge → `db-deploy` застосує. Ніколи `--include-all`.
- `db-deploy` скасовано (cancelled) на якомусь коміті `main` — кілька merge поспіль: у групі `supabase-prod` GitHub тримає
  один прогін в очікуванні, і новіший замінює старіший. Нічого не втрачено: наступний прогін застосовує всі міграції з `main`.
- `db-deploy` FAIL «Remote migration versions not found in local migrations directory» — хтось застосував міграцію не
  через `main` (`db push` з ноутбука чи з гілки). Лише PM: якщо зміна потрібна — PR із цим файлом у `main`; якщо ні —
  `supabase migration repair --status reverted <версія> --db-url "<рядок pooler>"` зі свого ноутбука й відкат змін схеми
  новою міграцією (точний порядок звіряємо на репетиції).
- Проєкт Free призупинено після тижня без активності — відновлює лише PM (Dashboard → **Restore project**; точну назву кнопки звіряємо на репетиції).

## Оновлення шаблону

Виправлення шаблону викладач оголошує в чаті курсу з SHA звичайного (не merge) коміту: `git cherry-pick` merge-коміту
без `-m 1` не працює. Не `git merge` шаблону: «Use this template» починає нову історію, і merge дає конфлікт у кожному
файлі, що відрізняється. Натомість (один раз)
`git remote add template https://github.com/koldovsky/2026-quitcode-06-project-template.git` → `git fetch template` →
`git switch -c template/<коротко> origin/main` → `git cherry-pick <sha>` →
`npm ci && npm run lint && npm run typecheck && npm test && npm run spec:check` →
`git push -u origin template/<коротко>` → PR «Оновлення шаблону» → рев'ю (для `.github/` — власник із CODEOWNERS) → merge.
Робить PM або техлід; решта команди отримує виправлення з `git pull` у `main`.

## Перевірки

| Команда | Що перевіряє |
|---|---|
| `npm run lint` / `typecheck` / `test` / `build` | ESLint без попереджень, типи (`next typegen` + `tsc`), Vitest, збірка з `ƒ Proxy (Middleware)` |
| `npm run spec:validate` | `openspec validate --all --strict` — структура специфікацій |
| `npm run spec:check` | AC ID на початку кожного `#### Scenario:` (схожий на ID, але з кириличною літерою чи трьома цифрами — з підказкою); унікальність у `openspec/specs` і після archive кожної активної зміни; denylist (за початком слова, тож ловить відмінки; фраза — і через перенесення рядка) у `product/`, `openspec/`, `docs/`, `src/`, `supabase/`, `tests/`, `README.md`, `AGENTS.md`; немає «бродячого» `product/denylist.local*` під іншим іменем; у кожній зміні без `skip_specs` — `proposal.md` з усіма сімома розділами в порядку правил |
| `npm run ac:coverage` | кожен AC має рядок у `docs/conformance.md`; статус дослівно «реалізовано» або «відкладено (причина)»; «реалізовано» має непропущений тест, назва якого починається з ID, у файлах, які запускає CI: `*.test.ts(x)` у `src/` чи `tests/` (`npm test`, job `app`) і `tests/e2e/**/*.spec.ts` (Playwright, job `e2e`); шляхи з колонок «Код»/«Тест» існують; тести не посилаються на неіснуючі AC |
| `npm run test:e2e` / CI `e2e` | Playwright за AC (`tests/e2e/*.spec.ts`): локально — проти збірки з `.env.local`; у CI (`.github/workflows/e2e.yml`) — на одноразовому локальному стеку Supabase (`supabase start`), з відео й трасою в артефакті |
| `npm run uat -- --url <прод>` | ті самі специфікації на розгорнутому застосунку: запис, кадри «Тоді», вердикт агента (`claude -p`, Haiku; суперечки — Sonnet), підсумок у коді (впала перевірка — завжди FAIL), звіт `docs/qa/uat/<дата>/report.md`. `npm run uat:nc` — негативні контролі (звіт у `test-results/`) |
| `npm run smoke -- <прод> [sha]` / workflow `smoke` | D0: `/` і `/login` відкриваються, `/api/health` → коміт збірки й «база відповідає»; щодня й після деплою `main` |
| `node scripts/check-migration-order.mjs` | міграції, яких немає в `origin/main` (перевизначення — `MIGRATION_BASE` або `--base <ref>`), новіші за найновішу там (`OLDER`); назви `<14 цифр>_<назва>.sql` (`NAME`); без однакових міток (`DUPLICATE`); застосовані файли не змінено (`CHANGED`) і не видалено (`DELETED`); той самий SQL старшого за найновіший файлу під новішою міткою — попередження `RENAMED` (відновлення, див. «Збої й відновлення») |
| CI `db-check` | `supabase db start` — усі міграції й сид на одноразовій базі в раннері (що саме застосовує `db start`, звіряємо на першому прогоні); у PR — `check-migration-order.mjs`; готовий `database.types.ts` у Summary прогону |

## Як цей шаблон зібрано з нуля

Повторюваний рецепт (Git Bash / macOS / Linux; Node 24, npm 11). Для нового клієнта зазвичай достатньо
«Use this template»; рецепт — щоб оновити шаблон на нові версії або зібрати його заново.

```bash
# 1. Скелет Next.js (версію зафіксовано; --turbopack не потрібен, --import-alias — за замовчуванням)
npx --yes create-next-app@16.4.0 my-project --ts --app --eslint --tailwind --src-dir --use-npm \
  --no-agent-feedback --no-cache-components
cd my-project
git branch -M main

# 2. Залежності (спершу @types/node 24 — інакше Vitest 5 дає ERESOLVE)
npm i -E @supabase/supabase-js@2.117.3 @supabase/ssr@0.12.7
npm i -D @types/node@^24
npm i -D -E supabase@2.120.0 @fission-ai/openspec@1.14.1 vitest@5.0.3
npm pkg set engines.node=24.x scripts.lint="eslint --max-warnings 0" \
  scripts.typecheck="next typegen && tsc --noEmit" scripts.test="vitest run" \
  scripts.spec:validate="openspec validate --all --strict" scripts.spec:check="node scripts/check-spec.mjs" \
  scripts.ac:coverage="node scripts/check-ac-coverage.mjs" \
  scripts.db:types="supabase gen types typescript --linked > src/lib/supabase/database.types.ts" \
  scripts.users:demo="node --env-file=.env.local scripts/create-demo-users.mjs"
printf '\n!.env.example\n/product/denylist.local*\n' >> .gitignore
# !.env.example — .env.example комітимо (правило після `.env*` скасовує його для цього файлу);
# /product/denylist.local* — справжні назви клієнтів для spec:check лише локально (зірочка ловить і denylist.local.txt.txt, якщо Провідник приховав розширення)
printf '* text=auto eol=lf\n*.ico binary\n*.png binary\n' > .gitattributes

# 3. Supabase: конфіг і міграція
npx supabase init
# supabase/config.toml: [api] auto_expose_new_tables = false; [auth] site_url = "http://localhost:3000",
#   additional_redirect_urls = ["http://localhost:3000/**"], enable_signup = false (користувачі — лише
#   npm run users:demo через Admin API); [auth.email] enable_confirmations = false
# supabase/migrations/20261012000000_profiles_and_roles.sql, supabase/seed.sql, supabase/demo-users.json

# 4. OpenSpec: глобальний CLI тієї ж версії (його викликають /opsx:* і скіли), профіль custom з verify
#    (глобальний конфіг цієї машини), потім init
npm i -g @fission-ai/openspec@1.14.1 && openspec --version   # 1.14.1
export OPENSPEC_TELEMETRY=0
npx openspec config set profile custom
npx openspec config set workflows '["propose","explore","apply","verify","update","sync","archive"]'
npx openspec init --tools claude,cursor --language Ukrainian --profile custom
npx openspec update
# openspec/config.yaml: context + rules (кожен пункт у лапках); порожні openspec/specs і openspec/changes з .gitkeep

# 5. Перенести з цього шаблону файли, написані вручну:
#   src/proxy.ts, src/lib/supabase/*, src/app/{layout.tsx,page.tsx,login/*}, scripts/**, tests/**, vitest.config.mts,
#   .claude/{settings.json,commands/conformance.md,skills/spec-*}, .cursor/commands/conformance.md, .cursorignore, .mcp.json,
#   .github/**, .coderabbit.yaml, AGENTS.md (наші розділи після блоку Next.js), CLAUDE.md,
#   product/**, docs/**, .env.example
rm -r public   # демо-SVG скелета шаблон не використовує
# tsconfig.json: "exclude" + "tests/fixtures"; eslint.config.mjs: globalIgnores + "tests/fixtures/**"

# 6. Перевірити
npm run lint && npm run typecheck && npm test && npm run build
npm run spec:validate && npm run spec:check && npm run ac:coverage
```

У Windows PowerShell 5.1 лапки всередині JSON треба екранувати:
`npx openspec config set workflows '[\"propose\",\"explore\",\"apply\",\"verify\",\"update\",\"sync\",\"archive\"]'`
(або інтерактивно: `npx openspec config profile`). Змінна середовища: `$env:OPENSPEC_TELEMETRY = "0"`.

Чому саме так — коротко:

- `--no-cache-components`: з Cache Components за замовчуванням (16.4) офіційний патерн Supabase для захищеної
  сторінки не збирається; `proxy.ts` з `--src-dir` має лежати в `src/`, інакше його мовчки ігнорують.
- `setAll(cookies, headers)` у `src/lib/supabase/proxy.ts` копіює заголовки кешування у відповідь (`@supabase/ssr` ≥ 0.10).
- `auto_expose_new_tables = false`: як у хмарі — нові проєкти без автогрантів приблизно з 30.05.2026, усі — з 30.10.2026.
- Профіль OpenSpec зберігається на машині, а не в репозиторії, тому згенеровані `.claude/` і `.cursor/` закомічені.

## Журнал виправлень шаблону

Виправлення після дня 0. Викладач оголошує кожне в чаті курсу з SHA; PM або техлід переносить його в репозиторій
команди PR-ом «Оновлення шаблону» (розділ «Оновлення шаблону» вище).

| Дата | SHA | Що виправлено |
|---|---|---|
| — | — | поки немає |

## Ліцензія

MIT — див. [LICENSE](LICENSE): шаблон можна вільно брати для власних і клієнтських проєктів. Протокол уточнень у
`.claude/skills/spec-clarify` адаптовано з [GitHub Spec Kit](https://github.com/github/spec-kit) (MIT, Copyright GitHub, Inc.).
