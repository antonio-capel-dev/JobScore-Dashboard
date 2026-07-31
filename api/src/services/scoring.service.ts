function extraerJson(content:string):string {
    const limpio = content.trim();

    if (!limpio.startsWith('```')) {
        return limpio;
    }

    const finPrimeraLinea = limpio.indexOf('\n');
    
    const sinApertura = limpio.slice(finPrimeraLinea + 1);
    
    const inicioCierre = sinApertura.lastIndexOf('```');
    
    const sinCierre = sinApertura.slice(0, inicioCierre);
    
    const resultado = sinCierre.trim();

    return resultado;
}

