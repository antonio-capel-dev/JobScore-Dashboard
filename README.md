# 🚀 JobScore Dashboard

Un pipeline Full-Stack e inteligente que analiza ofertas de empleo tech con Inteligencia Artificial, evalúa la compatibilidad con el perfil del candidato, gestiona el embudo de candidaturas y notifica alertas en tiempo real a Telegram.

---

## 🛠️ Arquitectura del Sistema

```text
 [Scraper Python] ➔ [API Node/Express] ➔ [OpenRouter IA (MiniMax)]
                         │
                         ├─➔ [Supabase PostgreSQL + Auth]
                         ├─➔ [Telegram Bot API (Alertas)]
                         └─➔ [Dashboard React (Vercel)]
```

1. **Scraper (`/scraper`)**: Script Python (Playwright + BeautifulSoup) que extrae ofertas de empleos tech desde portales como Adzuna y Tecnoempleo, normalizando fechas, modalidad, stack y nivel de inglés en archivos CSV.
2. **API Backend (`/api`)**: Servidor Express en TypeScript desplegado en **Render.com** (0€). Se encarga de:
   - **Ingesta e Idempotencia:** Lee los CSV y comprueba la `url_oferta` en Supabase para evitar duplicados y ahorro de tokens.
   - **Scoring IA:** Evalúa la coincidencia del candidato (score 0-100, tecnologías coincidentes, brecha principal y recomendación) usando la API de OpenRouter (`minimax/minimax-m2.7:free`).
   - **Telegram Notifier:** Envía alertas formateadas en HTML directamente al chat de Telegram con ofertas con score alto y veredicto favorable.
3. **Web Frontend (`/web`)**: Aplicación SPA construida con React 19, Vite, TypeScript y Tailwind CSS v4, desplegada en **Vercel** (0€). Ofrece:
   - **Autenticación con Supabase Auth:** Registro/Login protegido y sesión persistente (`AuthModal`).
   - **Visualizaciones con Recharts:** Gráficas interactivas de ofertas por modalidad y embudo de candidaturas.
   - **Filtros en tiempo real:** Búsqueda por ubicación, modalidad y selector de score mínimo.
   - **Tarjetas de Oferta Interactivas:** Feedback completo de la IA y actualización del estado de candidatura (`enviada`, `respuesta`, `entrevista`, `oferta`).

---

## ⚡ Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, `@supabase/supabase-js` |
| **Backend** | Node.js, Express, TypeScript, `csv-parse`, `dotenv`, `cors` |
| **Base de Datos & Auth** | Supabase (PostgreSQL) + Supabase Auth |
| **IA / LLM** | OpenRouter (`minimax/minimax-m2.7:free` — 100% gratuito) |
| **Notificaciones** | Telegram Bot API (`fetch` nativo con formato HTML) |
| **Despliegue (0€)** | **Vercel** (Frontend Web) + **Render.com** (API Backend) |

---

## ⚙️ Variables de Entorno

### Backend (`api/.env`)
```env
PORT=3000
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
OPENROUTER_API_KEY=sk-or-v1-tu_openrouter_key
TELEGRAM_BOT_TOKEN=tu_telegram_bot_token
TELEGRAM_CHAT_ID=tu_telegram_chat_id
```

### Frontend (`web/.env`)
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_publica
VITE_API_URL=https://tu-api.onrender.com
```

---

## 🚀 Despliegue en Producción (0€ Coste)

- **Frontend (Vercel):** Conectado al directorio `/web` de la rama `main` con build command `npm run build`.
- **Backend (Render):** Conectado al directorio `/api` de la rama `main` con build command `npm run build` y start command `npm start`.

---

## 🚦 Estado de la Hoja de Ruta

- [x] **Semana 1:** Tabla `offers` en Supabase, esqueleto API (`/health`), scaffold web con Tailwind CSS.
- [x] **Semana 2:** Ingesta CSV (Adzuna + Tecnoempleo), idempotencia por URL, scoring con IA (`minimax/minimax-m2.7:free`).
- [x] **Semana 3:** Dashboard con filtros (score, ubicación, modalidad), gráficas Recharts y tarjetas ricas.
- [x] **Semana 4:** Embudo de candidaturas, Autenticación con Supabase Auth y Deploy continuo en Vercel y Render.
- [x] **Semana 5:** Notificaciones de Telegram y absorción de OpenClaw.
- [ ] **Semana 6:** Unit testing con Vitest y automatización del scraper (cron job / GitHub Actions).
