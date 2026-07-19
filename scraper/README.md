# ETL Empleo IA Spain

Pipeline ETL en Python que extrae ofertas de trabajo tech de España usando la API de Adzuna, las transforma automáticamente y las guarda en CSV para análisis con SQL y Power BI.

## ¿Qué hace?

1. **Extrae** ofertas de la API de Adzuna para 8 términos de búsqueda (IA y WEB)
2. **Transforma** los datos: limpia fechas, detecta modalidad, nivel de inglés y stack tecnológico con regex
3. **Carga** los resultados en un CSV listo para analizar

## Tecnologías

- Python 3.x
- pandas
- requests
- python-dotenv
- API REST de Adzuna

## Estructura

```
src/
├── extractor.py    # Llama a la API y extrae las ofertas
├── transformer.py  # Limpia y enriquece los datos
├── loader.py       # Guarda el CSV con pandas
└── pipeline.py     # Orquesta el proceso completo
output/
└── ofertas_YYYY-MM-DD.csv
```

## Cómo ejecutarlo

1. Clona el repositorio
2. Instala las dependencias:
```
pip install pandas requests python-dotenv
```
3. Crea un archivo `.env` con tus credenciales de Adzuna:
```
ADZUNA_APP_ID=tu_app_id
ADZUNA_APP_KEY=tu_app_key
```
4. Ejecuta el pipeline:
```
python src/pipeline.py
```

## Campos extraídos

El scraper produce dos CSV con esquemas parcialmente distintos según la fuente. La tabla `offers` en Supabase (`api/db/migrations/0001_create_offers.sql`) los unifica en un único esquema; el import del API tiene que saber que cada fuente rellena los campos de forma diferente.

### Adzuna (`output/ofertas_YYYY-MM-DD.csv`)

| Campo | Tipo/Formato | Descripción |
|---|---|---|
| fecha_scrape | string, `YYYY-MM-DD` | Fecha en la que se ejecutó el scraping. |
| fecha_publicacion | string, `YYYY-MM-DD` | Fecha de publicación según Adzuna. Ya viene en ISO (recortada de la fecha+hora que devuelve la API). |
| empresa | string | Nombre de la empresa. |
| titulo_puesto | string | Título del puesto. |
| categoria | string, valores cerrados: `IA` \| `WEB` | Categoría de búsqueda usada para encontrar la oferta. |
| ubicacion | string | Ciudad, región o país. Texto libre, sin normalizar (ej. `"Barcelona"`, `"España"`, `"Comunidad de Madrid"`). |
| modalidad | string, valores cerrados: `remoto` \| `hibrido` \| `presencial` \| `no especificado` | Detectada por regex sobre la descripción de la oferta. Nunca viene vacía: si no se detecta nada, vale `"no especificado"`. |
| salario_min / salario_max | number, nullable | Rango salarial si Adzuna lo aporta; vacío si no hay dato. |
| experiencia_requerida | siempre vacío en este CSV | Adzuna no expone este dato. La columna existe solo por compatibilidad con el esquema unificado. |
| stack_tecnologico | string, lista separada por comas | Detectado por regex sobre la descripción contra una lista cerrada de tecnologías. Vale `"no especificado"` si no encuentra ninguna. |
| nivel_ingles | string, valores cerrados en minúscula: `b1` \| `b2` \| `c1` \| `c2` \| `nativo` \| `requerido` \| `no especificado` | Detectado por regex sobre la descripción de la oferta. |
| url_oferta | string, URL | Enlace directo a la oferta. Único por fila (clave única en Supabase). |

No incluye `fuente` ni `encaja_perfil`.

### Tecnoempleo (`data/empleos_tech_ia_web.csv`)

| Campo | Tipo/Formato | Descripción |
|---|---|---|
| fecha_scrape | string, `YYYY-MM-DD` | Igual que en Adzuna. |
| fuente | string, siempre `"Tecnoempleo"` | Identifica el origen. No existe en el CSV de Adzuna. |
| fecha_publicacion | string, **`DD/MM/YYYY`** | ⚠️ Formato distinto al de Adzuna (que es ISO). El import del API debe mirar si la fila trae `fuente` antes de parsear la fecha, no asumir un único formato para todas. |
| empresa | string | — |
| titulo_puesto | string | — |
| categoria | string, valores cerrados: `IA` \| `WEB` | — |
| encaja_perfil | string, valores vistos: `Si` \| `Quizas` (la migración SQL también permite `No`, aún no visto en los datos reales) | Campo propio de Tecnoempleo; no existe en Adzuna. |
| ubicacion | string | — |
| modalidad | string, nullable (puede venir vacía) | ⚠️ A diferencia de Adzuna, aquí NO pasa por el detector de modalidad: es el texto tal cual lo publica Tecnoempleo, y si no está especificada la celda queda vacía en vez de `"no especificado"`. |
| salario_min / salario_max | number, nullable (vacío en la mayoría de las filas) | — |
| experiencia_requerida | string libre, sin normalizar (ej. `"2 años"`, `"+2 años"`, `"más de 2 años"` — variantes de lo mismo) | A diferencia de Adzuna, aquí sí viene relleno. |
| stack_tecnologico | string libre separado por comas, sin vocabulario cerrado (ej. `"Python, PySpark, AWS"`) | ⚠️ A diferencia de Adzuna, aquí NO pasa por el detector de stack: es texto libre de la oferta original, no limitado a una lista fija de tecnologías. |
| nivel_ingles | string libre, formato `"Nivel/Código"` (ej. `"Medio/B2"`, `"Alto/C1"`) | ⚠️ Vocabulario distinto al de Adzuna (`b2` vs `"Medio/B2"`) — el import necesita normalizar cada fuente por separado si se quiere un valor comparable. |
| url_oferta | string, URL | — |

## Autor

Antonio Capel — proyecto de portfolio para Junior AI Engineer
