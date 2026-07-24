# JobScore Dashboard

Un pipeline que analiza ofertas de empleo tech con IA y centraliza métricas de mi proceso de búsqueda.

## Pipeline

[Scraper Python] → [API Node/Express] → [Supabase PostgreSQL] → [Dashboard React]

1. **Scraper** (`/scraper`): script Python que extrae ofertas tech de Adzuna y Tecnoempleo, normaliza lo que puede (fechas, modalidad, stack, nivel de inglés) y exporta a CSV. Ver `scraper/README.md` para el contrato exacto de columnas por fuente.
2. **API** (`/api`): Node/Express + TypeScript. Importa esos CSV, llama a la API de Claude para puntuar cada oferta (score 0-100, tecnologías detectadas, gap principal, recomendación) y persiste en Supabase. El endpoint de importación (`POST /offers/import/:fuente`, con `adzuna` o `tecnoempleo`) ya está hecho: parsea el CSV de la fuente indicada y normaliza las diferencias entre ambas, como el formato de fecha (`DD/MM/YYYY` en Tecnoempleo frente al ISO de Adzuna). Falta la llamada a Claude para puntuar y el guardado en Supabase.
3. **Web** (`/web`): dashboard con listado filtrable de ofertas puntuadas y gráficas del embudo de aplicación. De momento solo tiene el scaffold con Tailwind instalado.

## Stack

- Frontend: React 19 + TypeScript + Vite + Tailwind CSS (Recharts pendiente de instalar)
- Backend: Node.js + Express + TypeScript
- Base de datos: Supabase (PostgreSQL)
- IA: Claude API (`/v1/messages`)
- Deploy: Vercel (front) + Railway (API) — pendiente

## Estado del proyecto

En desarrollo. Semana 1 del roadmap: modelo de datos en Supabase ✅, esqueleto de API ✅, scaffold web + Tailwind ✅. Semana 2: endpoint de importación de CSV hecho y probado contra las dos fuentes reales ✅. Siguiente: llamada a la API de Claude para puntuar las ofertas.
