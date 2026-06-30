import pandas as pd
import os
from datetime import date

def guardar_csv(ofertas: list[dict]) -> str:
    os.makedirs("output", exist_ok = True)
    df = pd.DataFrame(ofertas)
    nombre_archivo = f"output/ofertas_{date.today().isoformat()}.csv"
    df.to_csv(nombre_archivo, index=False, encoding="utf-8-sig")
    return nombre_archivo