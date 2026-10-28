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

</div>

---

## О проекте

**Web Messager** — полнофункциональный MVP мессенджера: регистрация и вход по JWT, личные и
групповые чаты, обмен сообщениями в реальном времени через Socket.IO, отправка изображений,
статусы онлайн/офлайн с временем последнего визита, индикатор набора текста, редактирование
профиля и переключаемая светлая/тёмная тема.

Проект построен как монорепозиторий на **npm workspaces**: `client`, `server` и `shared`
с общими TypeScript-типами и контрактами Socket.IO-событий. Весь код типизирован, проверяется
ESLint и Prettier, а перед каждым коммитом автоматически прогоняется через `lint-staged`.

## Возможности

- Регистрация и авторизация (JWT, bcrypt, срок жизни токена 7 дней)
- Личные чаты: создание по логину собеседника, защита от дубликатов
- Групповые чаты: название, поиск и приглашение участников (минимум один), имена отправителей
- Обмен сообщениями в реальном времени через Socket.IO
- Отправка изображений (JPEG, PNG, GIF, WebP) с ограничением 5 МБ
- Статусы онлайн/офлайн, время последнего визита и live-индикатор присутствия
- История последних 50 сообщений в чате
- Редактирование профиля: логин, отображаемое имя, ссылка на аватар
- Адаптивная светлая/тёмная тема с режимом «как в системе» и сохранением выбора
- Единый стиль кода: ESLint 9, Prettier, Husky, lint-staged

## Стек

| Слой          | Технологии                                                                   |
| ------------- | ---------------------------------------------------------------------------- |
| Клиент        | Next.js 15 (App Router), React 19, Zustand, Tailwind CSS 3, Socket.IO Client |
| Сервер        | Node.js, Express 4, Socket.IO 4, Zod, JWT, bcryptjs, Multer                  |
| База данных   | PostgreSQL + Prisma 6                                                        |
| Общее         | TypeScript 5, npm workspaces                                                 |
| Качество кода | ESLint 9 (flat config), Prettier, Husky 9, lint-staged                       |

## Архитектура

```text
web-messager/
├── client/                     # Next.js-приложение (App Router)
│   ├── src/
│   │   ├── app/                # Маршруты: /login, /register, /chat, /profile
│   │   ├── entities/           # Zustand-сторы: user, presence, chat, message
│   │   ├── features/           # auth, create-chat, send-message, presence, update-profile
│   │   ├── shared/             # API-клиент, конфиг, утилиты, UI-примитивы
│   │   ├── views/              # Композиции страниц
│   │   └── widgets/            # Header, chat-list, chat-window, create-group-dialog, theme-toggle
│   └── tailwind.config.ts      # Семантические токены темы
├── server/                     # Express + Socket.IO + Prisma
│   ├── prisma/                 # schema.prisma и миграции
│   └── src/
│       ├── config/             # Переменные окружения
│       ├── db/                 # PrismaClient
│       ├── middlewares/        # JWT-аутентификация
│       ├── routes/             # auth, users, chats, messages, uploads
│       ├── services/           # message, upload
│       ├── socket/             # Обработчики Socket.IO
│       └── utils/              # asyncHandler и вспомогательное
├── shared/                     # Общие типы и контракты событий
├── eslint.config.mjs
├── .prettierrc.json
└── package.json                # Workspaces, husky, lint-staged
```

**Поток данных:** клиент авторизуется через REST → получает JWT → подключает Socket.IO с токеном
в `auth` → сервер валидирует токен, подписывает сокет на чаты пользователя и рассылает события
`message:new`, `chat:new`, `typing:update`, `presence:update` и `presence:snapshot`. Статусы
присутствия рассылаются только контактам из общих чатов, а несколько вкладок одного пользователя
учитываются через набор активных сокетов. История сообщений и список чатов загружаются по REST
при входе на страницу.

## Быстрый старт

### Требования

- Node.js 20+
- PostgreSQL 14+

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

## Скрипты

| Команда                       | Действие                              |
| ----------------------------- | ------------------------------------- |
| `npm run dev`                 | Запуск клиента и сервера одновременно |
| `npm run build`               | Сборка `shared` → `client` → `server` |
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

| Метод   | Путь                             | Доступ | Описание                         |
| ------- | -------------------------------- | ------ | -------------------------------- |
| `POST`  | `/api/auth/register`             | —      | Регистрация                      |
| `POST`  | `/api/auth/login`                | —      | Вход                             |
| `GET`   | `/api/users/me`                  | JWT    | Текущий пользователь             |
| `PATCH` | `/api/users/me`                  | JWT    | Обновление профиля               |
| `GET`   | `/api/users?q=`                  | JWT    | Поиск пользователей              |
| `GET`   | `/api/chats`                     | JWT    | Чаты пользователя                |
| `POST`  | `/api/chats`                     | JWT    | Создать личный или групповой чат |
| `GET`   | `/api/messages/:chatId/messages` | JWT    | Последние 50 сообщений           |
| `POST`  | `/api/messages/:chatId/messages` | JWT    | Отправить сообщение (REST)       |
| `POST`  | `/api/uploads`                   | JWT    | Загрузить изображение            |
| `GET`   | `/uploads/:file`                 | —      | Статика загруженных файлов       |
| `GET`   | `/health`                        | —      | Health-check                     |

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
| `typing:update`     | `{ chatId, userId, isTyping }`            |
| `presence:update`   | `{ userId, isOnline, lastSeenAt }`        |
| `presence:snapshot` | `Array<{ userId, isOnline, lastSeenAt }>` |

## Модель данных

- **User** — логин, хеш пароля, отображаемое имя, аватар, онлайн-статус, последнее посещение
- **Chat** — личный или групповой чат, название, время обновления
- **ChatMember** — связь пользователя и чата (уникальная пара `chatId + userId`)
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

## Статус проекта

Проект находится на стадии **MVP (v0.0.1)**.

Реализовано:

- [x] Регистрация и вход по JWT
- [x] Личные и групповые чаты
- [x] Создание группы с названием и приглашением участников
- [x] Сообщения в реальном времени и имена отправителей в группах
- [x] Отправка изображений (до 5 МБ)
- [x] Онлайн/офлайн, последний визит и live-индикатор
- [x] Редактирование профиля
- [x] Светлая/тёмная/системная тема
- [x] ESLint, Prettier, Husky, lint-staged

Планы:

- [ ] Пагинация истории сообщений
- [ ] Тесты (unit и e2e)
- [ ] Rate limiting и ограничение длины сообщений
- [ ] Docker и CI-пайплайн

Известные ограничения текущей версии: `chat:join` не проверяет членство в чате, REST-отправка
сообщения не рассылается через Socket.IO, история ограничена последними 50 сообщениями без
подгрузки, а управление группой (добавление/удаление участников и выход) пока не реализовано.
Эти пункты закрываются на следующем этапе.
