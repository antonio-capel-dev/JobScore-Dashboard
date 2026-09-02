import pandas as pd
import os
from datetime import date

def guardar_csv(ofertas: list[dict]) -> str:
    # Ruta fija a scraper/output independientemente de dónde se lance el comando
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(base_dir, "output")
    os.makedirs(output_dir, exist_ok = True)
    df = pd.DataFrame(ofertas)
    nombre_archivo = os.path.join(output_dir, f"ofertas_{date.today().isoformat()}.csv")
    df.to_csv(nombre_archivo, index=False, encoding="utf-8-sig")
    return nombre_archivo