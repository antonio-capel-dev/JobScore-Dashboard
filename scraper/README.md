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

| Campo | Descripción |
|---|---|
| fecha_scrape | Fecha de extracción |
| fecha_publicacion | Fecha de publicación de la oferta |
| empresa | Nombre de la empresa |
| titulo_puesto | Título del puesto |
| categoria | IA o WEB |
| ubicacion | Ciudad/región |
| modalidad | Detectado automáticamente (remoto/híbrido/presencial) |
| salario_min / salario_max | Rango salarial si está disponible |
| stack_tecnologico | Tecnologías detectadas con regex (Python, SQL, Docker...) |
| nivel_ingles | Nivel detectado automáticamente (B1/B2/C1/nativo...) |
| url_oferta | Enlace directo a la oferta |

## Autor

Antonio Capel — proyecto de portfolio para Junior AI Engineer
