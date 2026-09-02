# JobScore Dashboard

Pipeline Full-Stack e inteligente que extrae ofertas de empleo tech, evalúa su compatibilidad con perfil de desarrollador mediante IA (LLM), gestiona el embudo de candidaturas y notifica alertas en tiempo real a Telegram.

Despliegue en producción: [https://job-score-dashboard-5wux.vercel.app](https://job-score-dashboard-5wux.vercel.app)

---

## Arquitectura del Sistema

```text
 [Scraper Python] ➔ [API Node/Express] ➔ [OpenRouter IA (MiniMax M2.7)]
                         │
                         ├─➔ [Supabase PostgreSQL + Auth]
                         ├─➔ [Telegram Bot API (Alertas)]
                         ├─➔ [node-cron (Ejecución Diaria 08:00 AM)]
                         └─➔ [Dashboard React (Vercel)]
```

1. **Scraper (`/scraper`)**: Script Python (API Adzuna + Integración OpenClaw/Tecnoempleo) que extrae ofertas tech en tiempo real, normalizando fechas, modalidad, stack y nivel de inglés a CSV.
2. **API Backend (`/api`)**: Servidor Express con TypeScript:
   - **Ingesta e Idempotencia:** Parseo de CSV con validación por `url_oferta` única en Supabase para evitar duplicados y ahorrar llamadas a la IA.
   - **Scoring IA:** Evaluación técnica del candidato (Score 0-100, tecnologías coincidentes, brecha principal y recomendación) usando OpenRouter (`minimax/minimax-m2.7:free` a 0€).
   - **Telegram Notifier:** Alertas con formato HTML a Telegram para ofertas que superan el corte de afinidad ($\ge 45$ pts).
   - **Automatización (Cron):** Tarea programada con `node-cron` que se ejecuta diariamente a las 08:00 AM y endpoint manual `POST /pipeline/run`.
3. **Web Frontend (`/web`)**: Dashboard interactivo en React 19 + TypeScript + Vite + Tailwind CSS:
   - **KPIs Ejecutivos:** Total de ofertas, Top Matches ($\ge 75$), candidaturas en curso y salario medio del mercado.
   - **Buscador Universal:** Filtrado simultáneo por puesto, empresa, stack tecnológico o ciudad.
   - **Vista Dual:** Listado detallado colapsable y Tablero Kanban de seguimiento (*Sin postular*, *Enviada*, *Entrevista*, *Oferta*).
   - **Métricas con Recharts:** Gráficas de distribución por modalidad y embudo de selección.
   - **Supabase Auth:** Autenticación con sesión persistente y control de acceso.

---

## Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, `@supabase/supabase-js` |
| **Backend** | Node.js, Express, TypeScript, `node-cron`, `csv-parse`, `dotenv`, `cors` |
| **Testing** | Vitest (15 unit tests en servicios backend) |
| **Base de Datos & Auth** | Supabase (PostgreSQL) + Supabase Auth |
| **IA / LLM** | OpenRouter (`minimax/minimax-m2.7:free` — 0€ coste) |
| **Alertas** | Telegram Bot API (Node.js `fetch` nativo) |
| **Despliegue** | **Vercel** (Frontend) + **Render** (API Backend) |

---

## Variables de Entorno

### Backend (`api/.env`)
```env
PORT=3000
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
OPENROUTER_API_KEY=sk-or-v1-tu_openrouter_key
TELEGRAM_BOT_TOKEN=tu_telegram_bot_token
TELEGRAM_CHAT_ID=tu_telegram_chat_id
CRON_SCHEDULE="0 8 * * *"
```

### Scraper (`scraper/.env`)
```env
ADZUNA_APP_ID=tu_app_id
ADZUNA_APP_KEY=tu_app_key
```

### Frontend (`web/.env`)
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_publica
VITE_API_URL=https://tu-api.onrender.com
```

---

## Tests Unitarios

El proyecto cuenta con suite de pruebas automatizadas con **Vitest**:

```bash
cd api
npm test
```

Cubre:
- Normalización de fechas de Tecnoempleo (`DD/MM/YYYY`) a formato ISO (`YYYY-MM-DD`).
- Extracción y saneamiento de JSON desde respuestas de LLM con bloques Markdown.
- Sanitización y escape HTML para prevención de inyecciones en mensajes de Telegram.
- Resolución dinámica de rutas de archivos CSV e idempotencia.

---

## Ejecución del Pipeline

```bash
# Ejecutar scraper de Adzuna manualmente
python scraper/src/pipeline.py

# Disparar pipeline completo (Scraper + Ingesta + Scoring + Telegram)
curl.exe -X POST "http://localhost:3000/pipeline/run"

# Importar fuente específica
curl.exe -X POST "http://localhost:3000/offers/import/adzuna"
curl.exe -X POST "http://localhost:3000/offers/import/tecnoempleo"
```

---

## Estado de la Hoja de Ruta

- [x] **Semana 1:** Tabla `offers` en Supabase, esqueleto API (`/health`), scaffold web con Tailwind CSS.
- [x] **Semana 2:** Ingesta CSV (Adzuna + Tecnoempleo), idempotencia por URL, scoring con IA (`minimax/minimax-m2.7:free`).
- [x] **Semana 3:** Dashboard con filtros (score, ubicación, modalidad), gráficas Recharts y tarjetas interactivas.
- [x] **Semana 4:** Embudo de candidaturas, Autenticación con Supabase Auth y Deploy continuo en Vercel y Render.
- [x] **Semana 5:** Notificaciones de Telegram y absorción de OpenClaw.
- [x] **Semana 6:** Automatización diaria con `node-cron`, testing unitario con Vitest y rediseño minimalista del Dashboard con Kanban.
