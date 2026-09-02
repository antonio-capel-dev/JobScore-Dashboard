import requests
import pandas as pd
from datetime import date
import time
import os
from dotenv import load_dotenv
load_dotenv()
APP_ID = os.getenv("ADZUNA_APP_ID")
APP_KEY = os.getenv("ADZUNA_APP_KEY")

# Búsquedas enfocadas a vacantes Junior / Entry-level alineadas con el CV de Antonio
BUSQUEDAS = {
    "WEB": [
        "junior developer",
        "desarrollador junior",
        "programador junior",
        "junior frontend",
        "junior full stack",
        "junior react",
        "junior javascript",
        "desarrollador react",
        "desarrollador php",
        "trainee developer",
        "practicas desarrollador"
    ],
    "IA": [
        "junior python",
        "junior data",
        "junior inteligencia artificial",
        "practicas IA"
    ]
}

def buscar_ofertas(termino: str, categoria: str, paginas: int = 2) -> list[dict]:
    """
    Llama a la API de Adzuna y devuelve ofertas para un término de búsqueda.
    """
    resultados = []

    for pagina in range(1, paginas + 1):
        url = f"https://api.adzuna.com/v1/api/jobs/es/search/{pagina}"
        params = {
            "app_id": APP_ID,
            "app_key": APP_KEY,
            "results_per_page": 10,
            "what": termino,
            "max_days_old": 30, # Solo ofertas de los últimos 30 días
        }
        
        try:
            respuesta = requests.get(url, params=params, timeout=10)
            if respuesta.status_code != 200:
                print(f"Advertencia: Adzuna devolvió status {respuesta.status_code} para '{termino}' (página {pagina})")
                continue
            datos = respuesta.json()
        except Exception as e:
            print(f"Error consultando Adzuna para '{termino}' (página {pagina}): {e}")
            continue

        ofertas = datos.get("results", [])
        for oferta in ofertas:
            resultados.append({
                "fecha_scrape": date.today().isoformat(),
                "fecha_publicacion": oferta.get("created", None),
                "empresa": oferta.get("company", {}).get("display_name", None),
                "titulo_puesto": oferta.get("title", None),
                "categoria": categoria,
                "ubicacion": oferta.get("location", {}).get("display_name", None),
                "modalidad": None,
                "salario_min": oferta.get("salary_min", None),
                "salario_max": oferta.get("salary_max", None),
                "experiencia_requerida": None,
                "stack_tecnologico": None,
                "nivel_ingles": None,
                "url_oferta": oferta.get("redirect_url", None),
                "description": oferta.get("description", None)
            })
        
        time.sleep(1)
    return resultados

def extraer_todas():
    """
    Ejecuta búsquedas para todos los términos del diccionario BUSQUEDAS.
    """
    todas = []
    for categoria, terminos in BUSQUEDAS.items():
        for termino in terminos:
            resultados = buscar_ofertas(termino, categoria)
            todas.extend(resultados)
    return todas

if __name__ == "__main__":
    resultados = extraer_todas()
    print(f"Total ofertas: {len(resultados)}")
    if resultados:
        print(resultados[0])
