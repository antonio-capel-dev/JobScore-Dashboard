import pandas as pd
import sqlite3

DB_PATH = "output/empleo_ia.db"
CSV_PATH = "data/empleos_tech_ia_web.csv"

def integrar_tecnoempleo():
    df = pd.read.csv(CSV_PATH, encoding = "utf-8-sig")
    df["fecha_publicacion"] = pd.to_datetime(df["fecha_publicacion"], format="%d,%m,%Y",errors="coerce").dt.strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_PATH)
    conn.execute("ALTER TABLE ofertas ADD column fuente TEXT")
    conn.execute("UPDATE ofertas SET fuente = 'Adzuna'")
    conn.execute("ALTER TABLE ofertas ADD column encaja_perfil TEXT")
    df.to_sql("ofertas", conn, if_exists="append", index=False)
    conn.commit()
    conn.close()
    print("Integración completada.")
    if __name__=="__main__":
        integrar_tecnoempleo()