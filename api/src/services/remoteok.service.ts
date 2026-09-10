import { ParsedOffer, filterOffers } from "./csvImport.service";

export async function obtenerOfertasRemoteOk(limit?:number): Promise<ParsedOffer[]> {
    const response = await fetch('https://remoteok.com/api?tag=dev', {
        headers: {
            'User-Agent':'JobScoreDashBoard/1.0 (portfolio Antonio'
        }
    });

    if (!response.ok) {
        throw new Error(`Error en API RemoteOk: ${response.status}${response.statusText}`);
    }

    const data: any[] = await response.json();

    const ofertaRaw = data.filter(item => item && item.id);

    const ofertasSeleccionadas = limit? ofertaRaw.slice(0, limit): ofertaRaw

    //4.Mapear cada oferta al formato Parsedoffer

    const Parsedoffer: ParsedOffer[] = ofertasSeleccionadas.map(item => ({
        fecha_scrape: new Date().toISOString().split('T')[0], fecha_publicacion: item.date ? item.date.split('T')[0]:new Date().toISOString().split('T')[0],
        fuente: 'remoteok',
        empresa: item.company || 'Empresa confidencial', 
        titulo_puesto: item.position || 'Puesto no especificado',
        categoria: 'WEB',
        ubicacion:item.location || 'remoto',
        salario_min:item.salario_min&& item.salario_min > 0 ? Number(item.salario_min) : null,
        salario_max: item.salario_max && item.salario_max >0? Number(item.salario_max) : null,
        experiencia_requerida: null,
        encaja_perfil: null,
        modalidad: 'remoto',
        stack_tecnologico: Array.isArray(item.tags) ? item.tags : [],
        nivel_ingles: 'alto',
        url_oferta: item.url || item.apply_url,
        description: item.description || ''
    }));

    return filterOffers(Parsedoffer);
}