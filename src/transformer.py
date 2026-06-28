def limpiar_fecha(fecha_raw:str) ->str:
    if fecha_raw is None:
        return None 
    else:
        return fecha_raw.split("T")[0]
    
def detectar_modalidad(texto:str)->str:
    if texto is None:
        return None
    else:
        texto = texto.lower()
        if "remoto" in texto or "remote" in texto:
            return "remoto"
        if "hibrido" in texto or "hybrid" in texto or "híbrido" in texto:
            return "hibrido"
        if "presencial" in texto:
            return "presencial"
        
        return "no especificado"
    
def detectar_ingles(texto:str)->str:
    if texto is None:
        return None
    else:
        texto = texto.lower()
        if "nativo" in texto or "native" in texto:
            return "nativo"
        if "c1" in texto:
            return "c1"
        if "c2" in texto:
            return "c2"
        
        if "b2" in texto:
            return "b2"
        
        if "b1" in texto:
            return "b1"
        
        if "english" in texto or "inglés" in texto or "ingles" in texto:
            return "requerido"
        else:
            return "no especificado"
        
    
def transformar_ofertas(ofertas: list[dict]) ->list[dict]:
    if ofertas is None:
        return None
    else: 
        for oferta in ofertas:
            oferta["fecha_modificacion"] = limpiar_fecha(oferta["fecha_publicacion"])

        
            