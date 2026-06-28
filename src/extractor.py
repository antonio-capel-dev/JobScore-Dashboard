import requests
import pandas as pd
from datetime import date
import time
import os
from dotenv import load_dotenv
load_dotenv()
APP_ID = os.getenv("ADZUNA_APP_ID")
APP_KEY = os.getenv("ADZUNA_APP_KEY")


BUSQUEDAS = {
    "IA": ["machine learning", "data scientist", "AI engineer", "artificial intelligence"],

    "WEB": ["web developer", "full stack developer", "frontend developer", "backend developer"]
}

def buscar_ofertas(termino: str, categoria: str, paginas:int = 3) -> list[dict]:

    """
    Llama a la API de Adzuna y devuelve ofertas para un término de búsqueda.

    Args:
        termino: Palabra o frase clave de búsqueda.
        categoria: Etiqueta de categoría ('IA' o 'WEB').
        paginas: Número de páginas a solicitar (10 resultados por página).

    Returns:
        Lista de diccionarios, cada uno con los campos del esquema.
    """

    resultados = []

    for pagina in range(1, paginas +1):
        url = f"https://api.adzuna.com/v1/api/jobs/es/search/{pagina}"
        params =  { "app_id": APP_ID,
                    "app_key": APP_KEY,
                    "results_per_page": 10,
                    "what": termino, 
                     }
        respuesta = requests.get(url, params=params) 
        datos = respuesta.json()
        print(datos)
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
                "url_oferta": oferta.get("redirect_url", None)
            })
        
        time.sleep(1)
    return resultados

def extraer_todas():
    """
    Ejecuta búsquedas para todos los términos del diccionario BUSQUEDAS.

    Returns:
        Lista combinada con todas las ofertas encontradas.
    """
    todas = []
    for categoria, terminos in BUSQUEDAS.items():
        for termino in terminos:
            resultados = buscar_ofertas(termino, categoria)
            todas.extend(resultados)
    return todas
if __name__== "__main__":
    resultados = extraer_todas()
    print(f"Total ofertas: {len(resultados)}")
    print(resultados[0])

