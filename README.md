<div align="center">

# Web Messager

**Мессенджер реального времени с чатами, изображениями и тёмной темой**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express)](https://expressjs.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socket.io)](https://socket.io)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![CI](https://github.com/AlekseyGanzha/web-messeger/actions/workflows/ci.yml/badge.svg)](https://github.com/AlekseyGanzha/web-messeger/actions/workflows/ci.yml)

</div>

---

## О проекте

**Web Messager** — полнофункциональный MVP мессенджера: регистрация и вход по JWT, личные и
групповые чаты, обмен сообщениями в реальном времени через Socket.IO, отправка изображений,
статусы онлайн/офлайн с временем последнего визита, индикатор набора текста, автопрокрутка к
последним сообщениям, редактирование профиля и переключаемая светлая/тёмная тема.

Проект построен как монорепозиторий на **npm workspaces**: `client`, `server` и `shared`
с общими TypeScript-типами и контрактами Socket.IO-событий. Весь код типизирован, проверяется
ESLint и Prettier, а перед каждым коммитом автоматически прогоняется через `lint-staged`.

## Возможности

- Регистрация и авторизация (JWT, bcrypt, срок жизни токена 7 дней)
- Личные чаты: создание по логину собеседника, защита от дубликатов
- Групповые чаты: название, поиск и приглашение участников (минимум один), имена отправителей
- Роли в группах: создатель становится владельцем и управляет составом участников
- Настройки группы: добавление и удаление участников, выход из группы и удаление группы владельцем
- Живое обновление списка чатов при изменении состава (`chat:updated`, `chat:removed`)
- Обмен сообщениями в реальном времени через Socket.IO
- Восстановление после обрыва связи: обновление чатов и догрузка пропущенных сообщений при reconnect
- Индикатор потери соединения и автоматическое переподключение
- Индикатор набора текста в личных и групповых чатах со сбросом при отключении сокета
- Отправка изображений (JPEG, PNG, GIF, WebP) с ограничением 5 МБ
- Статусы онлайн/офлайн, время последнего визита и live-индикатор присутствия
- Автопрокрутка к последнему сообщению и кнопка «вниз», если пользователь читает историю
- Пагинация истории сообщений: подгрузка старых сообщений при прокрутке вверх
- Редактирование профиля: логин, отображаемое имя, ссылка на аватар
- Адаптивная светлая/тёмная тема с режимом «как в системе» и сохранением выбора
- Rate limiting: 10 попыток входа/регистрации за 15 минут и 120 запросов в минуту на API
- Unit-тесты клиента и сервера (Vitest, React Testing Library, Supertest)
- Единый стиль кода: ESLint 9, Prettier, Husky, lint-staged

## Стек

| Слой          | Технологии                                                                      |
| ------------- | ------------------------------------------------------------------------------- |
| Клиент        | Next.js 15 (App Router), React 19, Zustand, Tailwind CSS 3, Socket.IO Client    |
| Сервер        | Node.js, Express 4, Socket.IO 4, Zod, JWT, bcryptjs, Multer, express-rate-limit |
| База данных   | PostgreSQL + Prisma 6                                                           |
| Общее         | TypeScript 5, npm workspaces                                                    |
| Тестирование  | Vitest 4, React Testing Library, jsdom, Supertest                               |
| Качество кода | ESLint 9 (flat config), Prettier, Husky 9, lint-staged                          |

## Архитектура

```text
web-messager/
├── client/                     # Next.js-приложение (App Router)
│   ├── src/
│   │   ├── app/                # Маршруты: /login, /register, /chat, /profile
│   │   ├── entities/           # Zustand-сторы: user, presence, chat, message
│   │   ├── features/           # auth, create-chat, manage-group, send-message, presence,
│   │   │                       # update-profile
│   │   ├── shared/             # API-клиент, конфиг, утилиты, UI-примитивы (в т.ч. поиск)
│   │   ├── views/              # Композиции страниц
│   │   └── widgets/            # app-header, theme-toggle, profile-form
│   │       ├── chat-list/      # model/ с хуками и ui/ с компонентами
│   │       ├── chat-window/    # model/ с хуками и ui/ с компонентами
│   │       ├── create-group-dialog/ # Диалог создания группы
│   │       └── group-settings/ # Настройки группы и управление участниками
│   └── tailwind.config.ts      # Семантические токены темы
├── server/                     # Express + Socket.IO + Prisma
│   ├── prisma/                 # schema.prisma и миграции
│   └── src/
│       ├── config/             # Переменные окружения
│       ├── db/                 # PrismaClient
│       ├── middlewares/        # JWT-аутентификация и rate limiting
│       ├── routes/             # auth, users, chats, messages, uploads
│       ├── services/           # chat, message, upload
│       ├── socket/             # Обработчики Socket.IO
│       └── utils/              # asyncHandler и вспомогательное
├── shared/                     # Общие типы и контракты событий
├── Dockerfile                  # Multi-stage сборка client и server
├── docker-compose.yml          # PostgreSQL + server + client
├── .github/workflows/ci.yml    # CI: format, lint, typecheck, тесты, сборка
├── eslint.config.mjs
├── .prettierrc.json
└── package.json                # Workspaces, husky, lint-staged
```

**Поток данных:** клиент авторизуется через REST → получает JWT → подключает Socket.IO с токеном
в `auth` → сервер валидирует токен, подписывает сокет на чаты пользователя и рассылает события
`message:new`, `chat:new`, `chat:updated`, `chat:removed`, `typing:update`, `presence:update` и
`presence:snapshot`. При изменении состава группы сервер обновляет чат у всех участников, а
исключённому или вышедшему пользователю отправляет `chat:removed` и отписывает его сокеты от
комнаты чата. Статусы присутствия рассылаются только контактам из общих чатов, а несколько вкладок
одного пользователя учитываются через набор активных сокетов. История сообщений и список чатов
загружаются по REST при входе на страницу. Отправка через Socket.IO и REST одинаково рассылает
`message:new` всем участникам чата. Индикатор набора текста работает через события
`typing:start/stop` и сбрасывается при отключении последнего сокета пользователя, а лента
автоматически прокручивается к новому сообщению, если пользователь находится внизу. После
переподключения клиент заново загружает список чатов и последнюю страницу истории активного чата,
чтобы не потерять сообщения, отправленные во время обрыва связи.

## Быстрый старт

### Требования

- Node.js 20.19+
- PostgreSQL 14+
- Docker и Docker Compose (опционально)

### Установка

```bash
git clone <repo-url>
cd web-messager
npm install
```

`npm install` автоматически соберёт пакет `shared` благодаря `postinstall`.

### Переменные окружения

Создайте `server/.env` на основе `server/.env.example`:

| Переменная     | По умолчанию            | Назначение                      |
| -------------- | ----------------------- | ------------------------------- |
| `PORT`         | `3001`                  | Порт HTTP и Socket.IO           |
| `JWT_SECRET`   | `dev_secret_change_me`  | Секрет подписи JWT              |
| `DATABASE_URL` | —                       | Строка подключения к PostgreSQL |
| `CORS_ORIGIN`  | `http://localhost:3000` | Разрешённый origin клиента      |

Клиентские переменные (необязательно) задаются в `client/.env.local`:

| Переменная               | По умолчанию                | Назначение            |
| ------------------------ | --------------------------- | --------------------- |
| `NEXT_PUBLIC_API_URL`    | `http://localhost:3001/api` | Базовый URL REST API  |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:3001`     | URL Socket.IO-сервера |

### База данных и запуск

```bash
npm run db:migrate     # применить миграции Prisma
npm run dev            # клиент на :3000, сервер на :3001
```

Если база уже существовала и в репозитории появились новые миграции, примените их перед запуском
сервера (`npm run db:migrate`) — иначе запросы к изменённым таблицам будут падать с ошибкой 500.

### Запуск в Docker

```bash
docker compose up --build
```

Поднимаются PostgreSQL, сервер (`:3001`) и клиент (`:3000`). Миграции Prisma применяются
автоматически при старте сервера, а загруженные изображения сохраняются в volume `uploads`.
Значения БД и `JWT_SECRET` по умолчанию подходят только для локального запуска — переопредели
их через переменные окружения `JWT_SECRET`, `CORS_ORIGIN`, `NEXT_PUBLIC_API_URL` и
`NEXT_PUBLIC_SOCKET_URL`.

## Скрипты

| Команда                       | Действие                              |
| ----------------------------- | ------------------------------------- |
| `npm run dev`                 | Запуск клиента и сервера одновременно |
| `npm run build`               | Сборка `shared` → `client` → `server` |
| `npm test`                    | Unit-тесты клиента и сервера          |
| `npm run test:watch`          | Тесты в watch-режиме                  |
| `npm run typecheck`           | Проверка типов во всех воркспейсах    |
| `npm run lint`                | ESLint по всему репозиторию           |
| `npm run lint:fix`            | ESLint с автоисправлением             |
| `npm run format`              | Форматирование Prettier               |
| `npm run format:check`        | Проверка форматирования без изменений |
| `npm run db:migrate`          | `prisma migrate dev`                  |
| `npm run db:generate`         | `prisma generate`                     |
| `npm run db:push`             | `prisma db push`                      |
| `npm run db:studio -w server` | Prisma Studio                         |

## API

Все защищённые маршруты требуют заголовок `Authorization: Bearer <token>`.

На маршруты `/api/auth/*` действует лимит 10 запросов за 15 минут с одного IP, на остальной
API — 120 запросов в минуту. При превышении сервер возвращает `429 Too Many Requests`.

| Метод    | Путь                                 | Доступ | Описание                         |
| -------- | ------------------------------------ | ------ | -------------------------------- |
| `POST`   | `/api/auth/register`                 | —      | Регистрация                      |
| `POST`   | `/api/auth/login`                    | —      | Вход                             |
| `GET`    | `/api/users/me`                      | JWT    | Текущий пользователь             |
| `PATCH`  | `/api/users/me`                      | JWT    | Обновление профиля               |
| `GET`    | `/api/users?q=`                      | JWT    | Поиск пользователей              |
| `GET`    | `/api/chats`                         | JWT    | Чаты пользователя                |
| `POST`   | `/api/chats`                         | JWT    | Создать личный или групповой чат |
| `POST`   | `/api/chats/:chatId/members`         | JWT    | Добавить участников (владелец)   |
| `DELETE` | `/api/chats/:chatId/members/:userId` | JWT    | Удалить участника (владелец)     |
| `POST`   | `/api/chats/:chatId/leave`           | JWT    | Выйти из группы                  |
| `DELETE` | `/api/chats/:chatId`                 | JWT    | Удалить группу (владелец)        |
| `GET`    | `/api/messages/:chatId/messages`     | JWT    | История сообщений (пагинация)    |
| `POST`   | `/api/messages/:chatId/messages`     | JWT    | Отправить сообщение (REST)       |
| `POST`   | `/api/uploads`                       | JWT    | Загрузить изображение            |
| `GET`    | `/uploads/:file`                     | —      | Статика загруженных файлов       |
| `GET`    | `/health`                            | —      | Health-check                     |

История сообщений отдаётся страницами: `GET /api/messages/:chatId/messages?before=<id>&limit=50`
возвращает `{ messages, nextCursor }`. `limit` ограничен 100, а `nextCursor` передаётся в `before`
для подгрузки более старых сообщений.

### Socket.IO

События **клиент → сервер**:

| Событие                        | Payload                                               |
| ------------------------------ | ----------------------------------------------------- |
| `message:send`                 | `{ chatId, text, imageUrl?, imageMime?, imageSize? }` |
| `chat:join` / `chat:leave`     | `chatId`                                              |
| `typing:start` / `typing:stop` | `chatId`                                              |

События **сервер → клиент**:

| Событие             | Payload                                   |
| ------------------- | ----------------------------------------- |
| `message:new`       | `Message`                                 |
| `chat:new`          | `Chat`                                    |
| `chat:updated`      | `Chat`                                    |
| `chat:removed`      | `{ chatId, reason }`                      |
| `typing:update`     | `{ chatId, userId, isTyping }`            |
| `presence:update`   | `{ userId, isOnline, lastSeenAt }`        |
| `presence:snapshot` | `Array<{ userId, isOnline, lastSeenAt }>` |

Причина в `chat:removed` — `deleted`, `removed` или `left`.

## Модель данных

- **User** — логин, хеш пароля, отображаемое имя, аватар, онлайн-статус, последнее посещение
- **Chat** — личный или групповой чат, название, время обновления
- **ChatMember** — связь пользователя и чата с ролью `OWNER` или `MEMBER` (уникальная пара
  `chatId + userId`); при выходе владельца роль переходит самому раннему участнику
- **Message** — текст, необязательное изображение (`imageUrl`, `imageMime`, `imageSize`), отправитель

## Темы

Тема реализована через CSS-переменные и семантические Tailwind-токены
(`surface`, `panel`, `fg`, `muted`, `line`, `hover`, `elevated`, `danger`, `success`).
Переключатель поддерживает три режима — светлый, тёмный и системный. Выбор хранится в
`localStorage` под ключом `wm_theme`, а инлайн-скрипт в `<head>` применяет тему до первой
отрисовки, чтобы избежать мигания.

## Качество кода

- **ESLint 9** (flat config) — правила для клиента (`next/core-web-vitals`) и для сервера/shared
  (`typescript-eslint`), с отключением конфликтующих с Prettier правил
- **Prettier** — единый стиль, включая сортировку Tailwind-классов
- **Husky + lint-staged** — pre-commit хук прогоняет `eslint --fix` и `prettier --write`
  только по staged-файлам
- **Декомпозиция виджетов** — состояние и эффекты вынесены в `model/` (кастомные хуки), а
  разметка — в `ui/`-компоненты; основной компонент отвечает только за композицию
- **CI** — GitHub Actions на Node 20.19 прогоняет `format:check`, `lint`, `typecheck`, тесты и
  сборку монорепозитория

## Тестирование

- `npm test` — unit-тесты клиента и сервера.
- **Клиент:** Vitest + jsdom + React Testing Library; покрыты Zustand-сторы, утилиты форматирования
  и ключевые компоненты (`AuthForm`, `ChatHeader`, `ChatListItem`, `MessageItem`).
- **Сервер:** Vitest + Supertest; покрыты DTO-сервисы, создание сообщений, JWT-middleware и
  валидация маршрутов авторизации.
- E2E-тесты пока не настроены — в планах Playwright.

## Статус проекта

Проект находится на стадии **MVP (v0.0.1)**.

Реализовано:

- [x] Регистрация и вход по JWT
- [x] Личные и групповые чаты
- [x] Создание группы с названием и приглашением участников
- [x] Роли в группах: владелец, добавление/удаление участников
- [x] Настройки группы: выход из группы, удаление группы владельцем
- [x] Живое обновление состава групп через Socket.IO
- [x] Сообщения в реальном времени и имена отправителей в группах
- [x] Индикатор набора текста в личных и групповых чатах
- [x] Единая рассылка сообщений через Socket.IO для socket- и REST-отправки
- [x] Сброс индикатора набора текста при отключении сокета
- [x] Синхронизация чатов и истории после reconnect + индикатор соединения
- [x] Отправка изображений (до 5 МБ)
- [x] Онлайн/офлайн, последний визит и live-индикатор
- [x] Автопрокрутка к последнему сообщению и кнопка «вниз»
- [x] Пагинация истории сообщений с подгрузкой вверх
- [x] Редактирование профиля
- [x] Светлая/тёмная/системная тема
- [x] Декомпозиция виджетов на хуки и UI-компоненты
- [x] Unit-тесты клиента и сервера (Vitest, RTL, Supertest)
- [x] Rate limiting и защита от спама
- [x] Docker и CI-пайплайн
- [x] ESLint, Prettier, Husky, lint-staged

Планы:

- [ ] E2E-тесты (Playwright)

Известные ограничения текущей версии: счётчики rate limiting хранятся в памяти процесса, поэтому
при запуске нескольких инстансов сервера потребуется общий store (например, Redis). Эти пункты
закрываются на следующем этапе.
