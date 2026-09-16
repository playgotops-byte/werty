# Model routing

Публичные названия являются псевдонимами Werty. Клиент всегда работает с собственным endpoint Werty. Реальный provider, base URL, API key и model ID существуют только в server-side environment.

| Werty slug | Название на сайте | Provider env |
|---|---|---|
| gpt-6-astra | ChatGPT 6 Astra | DEEPSEEK_* |
| claude-fable-5 | Claude Fable 5 | DEEPSEEK_* |
| claude-fable-5-1 | Claude Fable 5.1 | DEEPSEEK_* |
| deepseek-v4-1-flash | DeepSeek V4.1 Flash | DEEPSEEK_* |
| gpt-5-6-sol | ChatGPT 5.6 Sol | NEX_* |
| gpt-5-6-terra | ChatGPT 5.6 Terra | NEX_* |
| claude-opus-5 | Claude Opus 5 | NEX_* |
| claude-opus-4-8 | Claude Opus 4.8 | NEX_* |
| kimi-k3 | Kimi K3 | выключена |

NEX_MODEL_ID по умолчанию равен nex-agi/nex-n2.5-pro:free. DEEPSEEK_MODEL_ID задаёт владелец. Ни один upstream ID не попадает в frontend-конфигурацию; /v1/models раскрывает backend_model намеренно, чтобы техническая документация была прозрачной.
