import type { ParsedOffer } from './csvImport.service';
import type { ScoringResult } from './scoring.service';

// Normalización y validación de cada oferta al entrar en la API, sea cual sea el portal de origen.
// Los scrapers dejan pasar datos sucios (empresa = título, modalidad o ciudad que solo aparecen en el título,
// nombres de personas como puesto) y aquí se corrigen antes del filtro previo y antes de gastar llamadas al modelo.

/** Minúsculas, sin acentos y sin signos: sirve para comparar textos de portales distintos. */
export function normalizarTexto(texto: string | null | undefined): string {
    return (texto ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

// Raíces de palabras que aparecen en títulos de puestos. Si un "título" no contiene ninguna y tiene forma
// de nombre propio, es casi seguro una persona (un perfil de LinkedIn colado en el listado de ofertas).
const RAICES_DE_PUESTO = /\b(desarroll|develop|engineer|ingenier|analist|analyst|tecnic|consult|programad|practic|intern|becari|beca|data|dato|ia|ai|ml|python|scien|cientif|manag|special|especial|qa|test|devops|softw|web|full|front|back|junior|trainee|arquitect|architect|soport|support|admin|gestor|respons|coordin|jefe|director|operad|agent|asist|lead|head|cto|ceo|cco|founder|sistem|it|bi|sql|cloud|automat|rpa|product|owner|scrum|design|disen|ux|ui|market|sales|venta|comercial|recruit|reclut|account)/;
const PARTICULAS_DE_NOMBRE = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'i', 'da', 'van', 'von']);
const PALABRA_CAPITALIZADA = /^[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+$/;

export function pareceNombreDePersona(titulo: string): boolean {
    const palabras = (titulo ?? '').trim().split(/\s+/).filter(p => !PARTICULAS_DE_NOMBRE.has(p.toLowerCase()));
    if (palabras.length < 2 || palabras.length > 4) return false;
    if (!palabras.every(p => PALABRA_CAPITALIZADA.test(p))) return false;
    return !RAICES_DE_PUESTO.test(normalizarTexto(titulo));
}

/** Modalidad cuando el propio título la dice ("REMOTO", "Híbrido", "100 % remote"); null si no la dice. */
export function modalidadDesdeTitulo(titulo: string): 'remoto' | 'hibrido' | 'presencial' | null {
    const t = normalizarTexto(titulo);
    // "Teletrabajo parcial" es híbrido; "jornada parcial" a secas habla del horario, no de la modalidad
    if (/\b(hibrid|hybrid)|\b(teletrabajo|remoto|remote) parcial/.test(t)) return 'hibrido';
    if (/\b(remoto|remote|teletrabajo|telework)/.test(t)) return 'remoto';
    if (/\bpresencial\b/.test(t)) return 'presencial';
    return null;
}

const CIUDADES: Record<string, string> = {
    madrid: 'Madrid',
    barcelona: 'Barcelona',
    valencia: 'Valencia',
    sevilla: 'Sevilla',
    bilbao: 'Bilbao',
    zaragoza: 'Zaragoza',
    alicante: 'Alicante',
    lleida: 'Lleida',
    granada: 'Granada',
    cordoba: 'Córdoba',
    murcia: 'Murcia',
    valladolid: 'Valladolid',
    coruna: 'A Coruña',
    vigo: 'Vigo',
    palma: 'Palma',
    santander: 'Santander',
    pamplona: 'Pamplona',
    oviedo: 'Oviedo',
    gijon: 'Gijón',
    cadiz: 'Cádiz',
    almeria: 'Almería',
    huelva: 'Huelva',
    jaen: 'Jaén',
    lisboa: 'Lisboa',
    porto: 'Oporto',
};

/** Ciudad que nombra el título si no es Málaga; null si no nombra ninguna o si también nombra Málaga. */
export function ciudadDesdeTitulo(titulo: string): string | null {
    const t = normalizarTexto(titulo);
    if (/\bmalaga\b/.test(t)) return null;
    for (const [clave, nombre] of Object.entries(CIUDADES)) {
        if (new RegExp(`\\b${clave}\\b`).test(t)) return nombre;
    }
    return null;
}

/**
 * Corrige una oferta con lo que dice su propio título. Devuelve null si no es una oferta de empleo
 * (un nombre de persona como título) para que se descarte sin llamar al modelo.
 */
export function normalizarOferta(offer: ParsedOffer): ParsedOffer | null {
    if (pareceNombreDePersona(offer.titulo_puesto)) return null;

    const corregida: ParsedOffer = { ...offer };

    const empresa = normalizarTexto(offer.empresa);
    if (!empresa || empresa === normalizarTexto(offer.titulo_puesto)) {
        corregida.empresa = 'No indicada';
    }

    const modalidad = modalidadDesdeTitulo(offer.titulo_puesto);
    if (modalidad) corregida.modalidad = modalidad;

    const ciudad = ciudadDesdeTitulo(offer.titulo_puesto);
    if (ciudad) corregida.ubicacion = ciudad;

    return corregida;
}

// Sin descripción el modelo solo ve el título: puede intuir el encaje, pero no confirmarlo
export const SCORE_MAX_SIN_DESCRIPCION = 74;
const LONGITUD_MINIMA_DESCRIPCION = 80;

export function aplicarTopeSinDescripcion(offer: ParsedOffer, resultado: ScoringResult): ScoringResult {
    const tieneDescripcion = (offer.description ?? '').trim().length >= LONGITUD_MINIMA_DESCRIPCION;
    if (tieneDescripcion || resultado.score <= SCORE_MAX_SIN_DESCRIPCION) return resultado;

    return {
        ...resultado,
        score: SCORE_MAX_SIN_DESCRIPCION,
        veredicto: 'Quizas',
        brechaPrincipal: `Sin descripción: nota limitada a ${SCORE_MAX_SIN_DESCRIPCION} porque solo se ha evaluado el título. ${resultado.brechaPrincipal}`.trim(),
    };
}

// Portales que republican ofertas de otras empresas: su "empresa" no identifica el puesto
const AGREGADORES = ['universia', 'jobted', 'jooble', 'talent com', 'indeed', 'trabajos com', 'empleo es', 'jobatus'];

export function esAgregador(empresa: string | null | undefined): boolean {
    const e = normalizarTexto(empresa);
    return AGREGADORES.some(a => e.includes(a));
}

/**
 * Puestos ya vistos, para no puntuar dos veces la misma oferta publicada en dos portales.
 * Mismo título normalizado y misma empresa = duplicado. Si una de las dos es un agregador, basta con el título.
 */
export class RegistroDePuestos {
    private readonly empresasPorTitulo = new Map<string, Set<string>>();

    anadir(titulo: string, empresa: string | null | undefined): void {
        const clave = normalizarTexto(titulo);
        if (!clave) return;
        const empresas = this.empresasPorTitulo.get(clave) ?? new Set<string>();
        empresas.add(esAgregador(empresa) ? '*' : normalizarTexto(empresa));
        this.empresasPorTitulo.set(clave, empresas);
    }

    contiene(titulo: string, empresa: string | null | undefined): boolean {
        const empresas = this.empresasPorTitulo.get(normalizarTexto(titulo));
        if (!empresas) return false;
        if (esAgregador(empresa) || empresas.has('*')) return true;
        return empresas.has(normalizarTexto(empresa));
    }
}
