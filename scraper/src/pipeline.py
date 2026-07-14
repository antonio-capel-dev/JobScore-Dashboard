from extractor import extraer_todas
from transformer import transformar_ofertas
from loader import guardar_csv

def ejecutar_pipeline():
    print("Extrayendo ofertas...")
    ofertas = extraer_todas()
    print(f"extraidas: {len(ofertas)} ofertas")
    if len(ofertas) == 0:
        print("Sin ofertas. No se sobreescribe el CSV.")
        return
    print("Transformando...")
    ofertas = transformar_ofertas(ofertas)
    print("Guardando CSV...")
    archivo = guardar_csv(ofertas)
    print(f"Guardado en: {archivo}")
if  __name__=="__main__":
    ejecutar_pipeline()