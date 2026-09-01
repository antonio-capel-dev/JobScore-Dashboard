# Auditoría Completa — JobScore Dashboard

**Fecha:** 31/08/2026  
**Commits totales:** 41  
**Rama:** `main`, sincronizada con `origin/main`

---

## Estado del Roadmap

| Semana | Objetivo | Estado | Notas |
|--------|----------|--------|-------|
| 1 | Tabla `offers` en Supabase, esqueleto API (`/health`), scaffold web + Tailwind, contrato CSV | ✅ Completa | — |
| 2 | `parseOffersCsv()`, ingesta idempotente, scoring con IA, guardado en Supabase | ✅ Completa | Modelo migrado de `ling-3.0-flash` a `minimax/minimax-m2.7:free` |
| 3 | Dashboard filtrable (score, ubicación, modalidad) + gráficas Recharts | ✅ Completa | 2 gráficas: modalidad + embudo |
| 4 | Embudo candidaturas, Auth con Supabase, deploy Vercel + Render | ✅ Completa | Deploy funcional en Vercel (front) y Render (API) |
| 5 | Migrar Telegram/cron de OpenClaw a `/api`, sustituir heurístico por score real | ✅ Completa | `telegram.service.ts` operativo, envía alertas `Si`/`Quizas` |
| 6 | Testing con Vitest, automatizar scraper, migración a AWS | ❌ No iniciada | Sin un solo test, sin cron, sin infra AWS |

---

## Inventario de Código

### `/api` — Backend (Node/Express + TypeScript)

| Archivo | Líneas | Estado | Observaciones |
|---------|--------|--------|---------------|
| [index.ts](file:///d:/PROYECTOS/JobScore%20Dashboard/api/src/index.ts) | 22 | OK | Punto de entrada limpio. `supabase` importado pero no usado directamente aquí (sin efecto, no rompe nada). |
| [offers.routes.ts](file:///d:/PROYECTOS/JobScore%20Dashboard/api/src/routes/offers.routes.ts) | 9 | OK | 3 rutas: `POST /import/:fuente`, `GET /offers`, `PATCH /offers/:id/status`. |
| [offers.controller.ts](file:///d:/PROYECTOS/JobScore%20Dashboard/api/src/controllers/offers.controller.ts) | 73 | OK | Integra idempotencia + scoring + Telegram. Limpio tras resolver conflictos. |
| [offers.repository.ts](file:///d:/PROYECTOS/JobScore%20Dashboard/api/src/db/offers.repository.ts) | 69 | OK | 4 funciones CRUD contra Supabase. `guardarOferta` guarda `veredicto` en `encaja_perfil`. |
| [csvImport.service.ts](file:///d:/PROYECTOS/JobScore%20Dashboard/api/src/services/csvImport.service.ts) | 58 | OK | Parseo CSV funcional para Adzuna y Tecnoempleo. |
| [scoring.service.ts](file:///d:/PROYECTOS/JobScore%20Dashboard/api/src/services/scoring.service.ts) | 107 | OK | Prompt bien construido, normalización de acentos para veredicto, `extraerJson()` para limpiar markdown del modelo. |
| [telegram.service.ts](file:///d:/PROYECTOS/JobScore%20Dashboard/api/src/services/telegram.service.ts) | 75 | OK | `fetch` nativo, `escapeHtml`, mensaje formateado HTML. Falla silenciosamente si no hay token. |

**Compilación:** `tsc --noEmit` pasa con 0 errores.

### `/web` — Frontend (React 19 + Vite + Tailwind)

| Archivo | Líneas | Estado | Observaciones |
|---------|--------|--------|---------------|
| [App.tsx](file:///d:/PROYECTOS/JobScore%20Dashboard/web/src/App.tsx) | 199 | OK | Auth gate + filtros + 2 gráficas + listado de tarjetas. Componente monolítico pero funcional. |
| [OfferCard.tsx](file:///d:/PROYECTOS/JobScore%20Dashboard/web/src/components/OfferCard.tsx) | 210 | OK | Tarjeta rica: score badge, tech matches, brecha, recomendación, selector de estado. Bien estilizada. |
| [AuthModal.tsx](file:///d:/PROYECTOS/JobScore%20Dashboard/web/src/components/AuthModal.tsx) | 117 | OK | Login/Registro con Supabase Auth. Manejo de errores y estados de carga. |
| [Login.tsx](file:///d:/PROYECTOS/JobScore%20Dashboard/web/src/components/Login.tsx) | 37 | ⚠️ Muerto | Versión primitiva del login, NO se usa en ningún sitio. Importa de `../lib/supabaseClient` (ruta obsoleta). **Debería eliminarse.** |
| [useOffers.ts](file:///d:/PROYECTOS/JobScore%20Dashboard/web/src/hooks/useOffers.ts) | 21 | OK | Custom hook limpio. Fetch + actualización optimista de estado. |
| [offers.ts](file:///d:/PROYECTOS/JobScore%20Dashboard/web/src/api/offers.ts) | 21 | OK | Cliente API con error handling. |
| [supabaseClient.ts (api/)](file:///d:/PROYECTOS/JobScore%20Dashboard/web/src/api/supabaseClient.ts) | 7 | OK | Cliente activo, usado por `App.tsx` y `AuthModal.tsx`. |
| [supabaseClient.ts (lib/)](file:///d:/PROYECTOS/JobScore%20Dashboard/web/src/lib/supabaseClient.ts) | 10 | ⚠️ Duplicado | Copia exacta del de `api/`. Solo lo usa `Login.tsx` (muerto). **Debería eliminarse junto con `Login.tsx`.** |
| [offer.ts](file:///d:/PROYECTOS/JobScore%20Dashboard/web/src/types/offer.ts) | 24 | OK | Interfaz `Offer` con todos los campos de Supabase. |

**Compilación:** `tsc --noEmit` pasa con 0 errores (los archivos muertos compilan pero no se usan).

### `/scraper` — ETL Python

| Archivo | Estado | Observaciones |
|---------|--------|---------------|
| [extractor.py](file:///d:/PROYECTOS/JobScore%20Dashboard/scraper/src/extractor.py) | OK | Llama a la API de Adzuna. |
| [transformer.py](file:///d:/PROYECTOS/JobScore%20Dashboard/scraper/src/transformer.py) | OK | Regex para modalidad, stack, inglés. |
| [loader.py](file:///d:/PROYECTOS/JobScore%20Dashboard/scraper/src/loader.py) | OK | Exporta CSV con pandas. |
| [pipeline.py](file:///d:/PROYECTOS/JobScore%20Dashboard/scraper/src/pipeline.py) | OK | Orquestador del ETL. |
| [integrador.py](file:///d:/PROYECTOS/JobScore%20Dashboard/scraper/src/integrador.py) | OK | Integración de datos de Tecnoempleo. |
| [README.md](file:///d:/PROYECTOS/JobScore%20Dashboard/scraper/README.md) | OK | Documentación del contrato CSV muy detallada. |

**No se toca salvo bug real** (regla del proyecto).

---

## Problemas Detectados

### Código Muerto / Duplicado
- `web/src/components/Login.tsx` — no se importa en ningún sitio. Versión borrador sin estilos que fue reemplazada por `AuthModal.tsx`.
- `web/src/lib/supabaseClient.ts` — duplicado exacto de `web/src/api/supabaseClient.ts`. Solo lo referencia `Login.tsx`.
- Ambos vinieron del stash de Git y quedaron como archivos "untracked".

### README Desactualizado
- [README.md](file:///d:/PROYECTOS/JobScore%20Dashboard/README.md) dice:
  - *"falta la llamada real al modelo"* — ya está hecha desde la Semana 2.
  - *"scoring.service.ts: falta la llamada real al modelo y el guardado en Supabase"* — completado.
  - *"Web: de momento solo tiene el scaffold con Tailwind instalado"* — tiene dashboard completo con filtros, gráficas, auth y tarjetas.
  - Menciona *"Recharts pendiente de instalar"* — ya está instalado y con 2 gráficas.
  - Menciona *"Ling-3.0-flash"* como modelo — el modelo real es `minimax/minimax-m2.7:free`.
  - Dice *"Railway (API) — pendiente"* — el deploy real está en Render, y ya funciona.
  - **El README está congelado en el estado de la Semana 2. Necesita una reescritura completa.**

### `.env.example` del API
- Dice `# OpenRouter (Ling-3.0-flash)` — debería decir `Minimax M2.7`.

### Rutas CSV Hardcodeadas
- [offers.controller.ts L12-15](file:///d:/PROYECTOS/JobScore%20Dashboard/api/src/controllers/offers.controller.ts#L12-L15): las rutas a los CSV están hardcodeadas con fecha fija (`ofertas_2026-07-01.csv`). Si el scraper genera un nuevo CSV con otra fecha, hay que editar el código. Deberían ser variables de entorno o lectura del último archivo del directorio.

### Sin Cron / Automatización
- La ingesta de ofertas requiere un `curl` manual (`POST /offers/import/:fuente`). No hay cron job, ni scheduler, ni GitHub Action que lo automatice. El roadmap lo menciona en la Semana 6.

### Sin Testing
- 0 tests. El `package.json` del API tiene un script `test` que solo hace `echo "Error: no test specified"`. El roadmap lo marca como Semana 6.

### Sin Validación de Input
- `PATCH /offers/:id/status` no valida que `estado_candidatura` sea un valor permitido.
- `POST /offers/import/:fuente` no valida el `?limit` (si le pasas `limit=abc`, `Number("abc")` da `NaN` y `slice(0, NaN)` devuelve `[]` silenciosamente).

### CORS Abierto
- `app.use(cors())` sin restricción de origen. Cualquier dominio puede llamar a la API. Para un proyecto de portfolio no es crítico, pero para producción real debería restringirse al dominio de Vercel.

### Import Muerto en `index.ts`
- [index.ts L4](file:///d:/PROYECTOS/JobScore%20Dashboard/api/src/index.ts#L4): `import { supabase } from './db/supabaseClient'` no se usa en ese archivo. Importación residual.

---

## Lo Que Funciona Bien

- **Arquitectura limpia**: separación `routes → controllers → services → db` bien respetada.
- **TypeScript strict**: activado y sin errores. Interfaces tipadas (`ParsedOffer`, `ScoringResult`, `Offer`).
- **Idempotencia**: la comprobación por URL evita duplicados y llamadas innecesarias a la IA.
- **Normalización robusta del veredicto**: Unicode NFD + fallback por score para cubrir las variaciones del modelo.
- **Telegram bien integrado**: falla silenciosamente sin romper el flujo principal, mensaje formateado en HTML.
- **Frontend estilizado**: tarjetas con gradientes, badges por score, selector de estado interactivo, gráficas funcionales.
- **Auth completa**: login/registro con Supabase Auth, gate de acceso, cierre de sesión.
- **Deploy real**: Vercel (front) + Render (API) funcionando en producción.
- **41 commits con mensajes descriptivos** y convención `feat:`/`fix:`/`chore:`.
- **Documentación del scraper** muy detallada (contrato de columnas por fuente).

---

## Porcentaje de Finalización

| Área | Peso | Completado | Puntos |
|------|------|------------|--------|
| **Scraper/ETL** | 10% | 100% | 10.0 |
| **API — Ingesta CSV** | 10% | 100% | 10.0 |
| **API — Scoring IA** | 12% | 100% | 12.0 |
| **API — Telegram** | 8% | 100% | 8.0 |
| **API — CRUD + Idempotencia** | 8% | 100% | 8.0 |
| **Frontend — Dashboard (filtros, gráficas, tarjetas)** | 15% | 95% | 14.3 |
| **Frontend — Auth** | 7% | 100% | 7.0 |
| **Deploy (Vercel + Render)** | 5% | 100% | 5.0 |
| **Testing (Vitest)** | 10% | 0% | 0.0 |
| **Automatización (cron/scheduler)** | 5% | 0% | 0.0 |
| **Documentación (README actualizado)** | 5% | 30% | 1.5 |
| **Limpieza de código (dead code, validación)** | 5% | 40% | 2.0 |

### **Total: 77.8% → 78%**

---

## Resumen

El producto tiene todo el pipeline funcional de extremo a extremo: desde el scraping de ofertas hasta la notificación a Telegram, pasando por scoring con IA, persistencia en Supabase, dashboard interactivo con autenticación, y deploy en producción. Las 5 semanas del roadmap original están completadas.

Lo que falta para considerarlo "terminado" es la Semana 6 (testing + automatización) más la deuda acumulada de documentación y limpieza:

1. **README** — reescribir para reflejar el estado real del proyecto.
2. **Testing** — al menos tests unitarios para `scoring.service.ts`, `csvImport.service.ts` y `offers.repository.ts`.
3. **Automatización** — un cron job (GitHub Actions, Render cron, o un scheduler interno) que ejecute la ingesta periódicamente.
4. **Limpieza** — borrar `Login.tsx` y `lib/supabaseClient.ts`, quitar el import muerto de `index.ts`, validar inputs en los endpoints.
5. **README del scraper** y `.env.example` — actualizar el nombre del modelo.
