import { parse } from 'csv-parse/sync';
import fs from 'node:fs';
import { normalizarOferta } from './normalizacion.service';

export interface ParsedOffer {
    fecha_scrape: string;
    fecha_publicacion: string;
    fuente: string|null;
    encaja_perfil: 'Si'|'Quizas'|'No'|null;
    empresa: string;
    titulo_puesto: string;
    categoria: 'IA' | 'WEB';
    ubicacion: string;
    modalidad: string;
    salario_min: number | null;
    salario_max: number | null;
    experiencia_requerida: string | null;
    stack_tecnologico: string[];
    nivel_ingles: string;
    url_oferta: string;
    description?: string;
}

export function normalizarFechaPublicacion(fecha: string, _fuente?: string): string {
    const texto = (fecha ?? '').trim();
    const hoy = new Date();

    // 1. Ya viene en ISO: AAAA-MM-DD (Adzuna)
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        return texto;
    }

    // 2. Formato DD/MM/AAAA (Tecnoempleo, InfoJobs)
    const dma = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dma) {
        return `${dma[3]}-${dma[2].padStart(2, '0')}-${dma[1].padStart(2, '0')}`;
    }

    // 3. Formato relativo (LinkedIn): "Hace 6 días", "Hace 2 semanas", "Hace 1 mes"...
    const relativa = texto.match(/hace\s+(\d+)\s+(minuto|hora|d[ií]a|semana|mes)/i);
    if (relativa) {
        const cantidad = Number(relativa[1]);
        const unidad = relativa[2].toLowerCase();
        if (unidad === 'semana') hoy.setDate(hoy.getDate() - cantidad * 7);
        else if (unidad === 'mes') hoy.setMonth(hoy.getMonth() - cantidad);
        else if (unidad === 'día' || unidad === 'dia') hoy.setDate(hoy.getDate() - cantidad);
        // minutos u horas: la fecha es hoy
    }

    // 4. Formato desconocido: usamos hoy, para no romper el insert (la columna es NOT NULL)
    return hoy.toISOString().split('T')[0];
}

// Patrones de seniority alto que se descartan automáticamente para candidatos Junior
const PATRONES_SENIOR = [
    /\bsenior\b/i,
    /\bsr\.?\b/i,
    /\blead\b/i,
    /\bprincipal\b/i,
    /\bstaff\b/i,
    /\barchitect\b/i,
    /\barquitecto\b/i,
    /\bmanager\b/i,
    /\bdirector\b/i,
    /\bhead of\b/i,
    /\btech lead\b/i,
    /\bexperienced\b/i,
    /\bexperimentad[oa]s?\b/i,
    /\bco-?founder\b/i,
    /\bcofundador(a)?\b/i,
    // Cargos de dirección en siglas: solo en mayúsculas, para no confundirlos con palabras normales
    /\b(CTO|CCO|CEO|CFO|COO)\b/,
    /\bteam lead\b/i,
    /5\+?\s*años/i,
    /\+5\s*años/i,
    /4\+?\s*años/i,
    /\+4\s*años/i,
    // 3 años o más también descarta. Un rango como "1-3 años" o "entre 1 y 3 años" no, porque el mínimo es menor
    /(?<!(?:[\d\-–]|\by|\ba)\s?)\b3\s*\+?\s*(años|years)\b/i,
    /\+\s*3\s*(años|years)\b/i,
    /\b[4-9]\s*\+?\s*years\b/i
];

export function esOfertaSenior(titulo: string, experiencia: string | null): boolean {
    const texto = `${titulo} ${experiencia || ''}`.toLowerCase();
    return PATRONES_SENIOR.some(patron => patron.test(texto));
}

// Tecnologías y roles claramente fuera del stack de Antonio — descarte sin gastar LLM
// Criterio: dominio muy especializado que no se aprende en semanas ni con IA.
// Data Engineer y ML Engineer NO van aquí: son el objetivo principal (AI / Data Engineer junior)
// y el seniority ya lo filtra esOfertaSenior. Data Scientist sí, porque el mercado lo filtra por grado cuantitativo.
const TITULOS_FUERA_DE_ALCANCE = [
    /\bcobol\b/i,
    /\bsap\b/i,
    /\babap\b/i,
    /\bdata\s*scientist\b/i,
    /\bdeep\s*learning\b/i,
    /\bcomputer\s*vision\b/i,
    /\bciberseguridad\b/i,
    /\bcybersecurity\b/i,
    /\bpenetration\s*test/i,
    /\bios\s*developer\b/i,
    /\bswift\b/i,
    /\bkotlin\b/i,
    /\bflutter\b/i,
    /\bscala\b/i,
    /\bhadoop\b/i,
];

export function esTecnologiaFueraDeAlcance(titulo: string): boolean {
    return TITULOS_FUERA_DE_ALCANCE.some(patron => patron.test(titulo));
}

// Zona donde Antonio puede ir presencial o en híbrido: Málaga capital y alrededores con buena conexión
const ZONA_PRESENCIAL = [
    'malaga',
    'málaga',
    'campanillas',
    'parque tecnológico',
    'parque tecnologico',
    'torremolinos',
    'benalmádena',
    'benalmadena',
    'rincón de la victoria',
    'rincon de la victoria',
    'alhaurín de la torre',
    'alhaurin de la torre',
];

export function estaEnZonaPresencial(ubicacion: string): boolean {
    const texto = (ubicacion || '').toLowerCase();
    return ZONA_PRESENCIAL.some(lugar => texto.includes(lugar));
}

// Filtro pre-scoring: descarta ofertas no viables antes de llamar al LLM
export function filterOffers(offers: ParsedOffer[]): ParsedOffer[] {
    const filteredOffers: ParsedOffer[] = [];
    for (const offer of offers) {

        if (!offer.url_oferta || !offer.url_oferta.startsWith('https://')) {
    continue;
}
        
        // 1. Descarte por Seniority: si es Senior/Lead/Architect/5+ años, descartar
        if (esOfertaSenior(offer.titulo_puesto, offer.experiencia_requerida)) {
            continue;
        }

        // 2. Descarte por tecnología/rol fuera de alcance (Java, .NET, Data Scientist, etc.)
        if (esTecnologiaFueraDeAlcance(offer.titulo_puesto)) {
            continue;
        }

        // 3. Filtro por Ubicación y Modalidad (Null-safe)
        const modalidadLower = (offer.modalidad || '').toLowerCase();

        if (modalidadLower === 'hibrido' || modalidadLower === 'presencial') {
            // Presencial o híbrido solo si es en Málaga o alrededores
            if (!estaEnZonaPresencial(offer.ubicacion)) {
                continue;
            }
        }

        // 4. Filtro por Salario Mínimo: si se especifica salario y es inferior a 5.000€
        if (offer.salario_min !== null && offer.salario_min < 5000) {
            continue;
        }

        filteredOffers.push(offer);
    }
    return filteredOffers;
}

export function parseOffersCsvFromText(contenido: string): ParsedOffer[] {
    const filas = parse(contenido, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        relax_column_count: true,
    });
    const parsedOffers = filas.map((fila: any) => ({
        fecha_scrape: fila.fecha_scrape || new Date().toISOString().split('T')[0],
        fecha_publicacion: normalizarFechaPublicacion(fila.fecha_publicacion || new Date().toISOString().split('T')[0], fila.fuente),
        fuente: fila.fuente || 'CSV Subido',
        encaja_perfil: fila.encaja_perfil,
        empresa: fila.empresa || 'Empresa confidencial',
        titulo_puesto: fila.titulo_puesto || 'Puesto no especificado',
        categoria: (fila.categoria as 'IA' | 'WEB') || 'WEB',
        ubicacion: fila.ubicacion || 'España',
        modalidad: fila.modalidad || 'no especificado',
        salario_min: fila.salario_min === '' || fila.salario_min === undefined ? null : Number(fila.salario_min),
        salario_max: fila.salario_max === '' || fila.salario_max === undefined ? null : Number(fila.salario_max),
        experiencia_requerida: fila.experiencia_requerida === '' ? null : fila.experiencia_requerida,
        stack_tecnologico: fila.stack_tecnologico ? fila.stack_tecnologico.split(',').map((s: string) => s.trim()) : [],
        nivel_ingles: fila.nivel_ingles || 'no especificado',
        url_oferta: fila.url_oferta || '',
        description: fila.description || '',
    }));

    // Primero se corrige cada oferta con lo que dice su título (modalidad, ciudad, empresa) y se descartan las que
    // no son ofertas; después el filtro previo trabaja ya con los datos corregidos
    const normalizadas = parsedOffers
        .map(normalizarOferta)
        .filter((oferta: ParsedOffer | null): oferta is ParsedOffer => oferta !== null);

    return filterOffers(normalizadas);
}

export function parseOffersCsv(filePath: string): ParsedOffer[] {
    const contenido = fs.readFileSync(filePath, 'utf-8');
    return parseOffersCsvFromText(contenido);
}
