# Werty backend

Собственный API gateway Werty для Vercel + Supabase. Клиент обращается к Werty, а не к upstream-провайдерам.

## Модельные псевдонимы

| Публичная модель Werty | Серверный backend |
|---|---|
| ChatGPT 6 Astra | DEEPSEEK_MODEL_ID |
| Claude Fable 5 / 5.1 | DEEPSEEK_MODEL_ID |
| DeepSeek V4.1 Flash | DEEPSEEK_MODEL_ID |
| ChatGPT 5.6 Sol / Terra | NEX_MODEL_ID |
| Claude Opus 5 / 4.8 | NEX_MODEL_ID |
| Kimi K3 | выключена до настройки |

Это псевдонимы Werty. Ответы /v1/models содержат alias=true и backend_model, чтобы интеграция не вводила разработчиков в заблуждение. Base URL, реальные model IDs и credentials задаются только через server-side environment variables.

## Локальный запуск

1. Скопировать .env.example в .env.local и заполнить значения.
2. Создать Supabase-проект и применить supabase/migrations/001_werty.sql через SQL editor или Supabase CLI.
3. Настроить email confirmation template с шестизначным Token и production SMTP.
4. Выполнить npm install, npm run dev.
5. Создать первого Admin контролируемой SQL-операцией после регистрации.

## API

- POST /api/auth/signup — email/password.
- POST /api/auth/verify — шестизначный signup OTP; первый sk-ключ возвращается один раз.
- GET/POST/DELETE /api/keys — список маскированных ключей, rotation, revoke.
- GET /v1/models — настроенные псевдонимы.
- POST /v1/chat/completions — OpenAI-compatible подмножество, Bearer sk-..., Idempotency-Key.
- POST /api/payments — создание платежа ЮKassa.
- POST /api/webhooks/yookassa — server-side перепроверка и идемпотентное начисление.
- POST /api/admin/balance, /roles, /models — permission-checked операции с audit.
- POST /api/internal/reconcile — список зависших расходов для ручной/провайдерской сверки.
- GET /api/health — состояние API и БД.

## Денежная модель

Wallet хранит тысячные доли расчётного токена. 1 000 000 токенов = 5 000 ₽ копеек (50 ₽), то есть payment credit = kopecks × 200 000 internal units. RPC резервирует максимальную стоимость запроса до upstream-вызова. Settlement списывает подтверждённый usage и возвращает остаток. При неопределённом исходе резерв не отпускается автоматически: запрос попадает в reconciliation.

## ЮKassa

YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY существуют только на сервере. Return URL не начисляет средства. Webhook используется как сигнал; backend повторно получает платёж через API ЮKassa, проверяет статус, paid, RUB, сумму, ID и metadata, затем вызывает атомарную RPC.

Webhook URL: https://YOUR_DOMAIN/api/webhooks/yookassa. Событие: payment.succeeded.

## Deployment

Добавить все значения .env.example в Vercel. Preview и production должны использовать разные Supabase/ЮKassa credentials. Применить миграцию до deployment. Установить CRON_SECRET. На Vercel Hobby /api/internal/reconcile запускается один раз в сутки в 03:00 UTC; endpoint также можно вызвать вручную авторизованным GET или POST. Для частой автоматической сверки нужен Vercel Pro или внешний планировщик.

## Проверки

npm run typecheck
npm run lint
npm test
npm run build

До production отдельно проверить RLS на реальном Supabase, sandbox-платежи ЮKassa, SMTP/OTP, оба upstream API, streaming usage и лимиты Vercel. Реальные secrets не коммитить.

