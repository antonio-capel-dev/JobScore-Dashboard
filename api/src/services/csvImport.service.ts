import { parse } from 'csv-parse/sync';
import fs from 'node:fs';

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
}

export function normalizarFechaPublicacion(fecha: string, fuente: string | undefined): string {
    if (fuente) {
        const partes = fecha.split('/');
        return `${partes[2]}-${partes[1]}-${partes[0]}`;
    } else {
        return fecha;
    }
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
    /\bteam lead\b/i,
    /5\+?\s*años/i,
    /\+5\s*años/i,
    /4\+?\s*años/i,
    /\+4\s*años/i
];

export function esOfertaSenior(titulo: string, experiencia: string | null): boolean {
    const texto = `${titulo} ${experiencia || ''}`.toLowerCase();
    return PATRONES_SENIOR.some(patron => patron.test(texto));
}

// Filtro pre-scoring: descarta ofertas no viables antes de llamar al LLM
export function filterOffers(offers: ParsedOffer[]): ParsedOffer[] {
    const filteredOffers: ParsedOffer[] = [];
    for (const offer of offers) {
        // 1. Descarte por Seniority: si es Senior/Lead/Architect/5+ años, descartar
        if (esOfertaSenior(offer.titulo_puesto, offer.experiencia_requerida)) {
            continue;
        }

        // 2. Filtro por Ubicación y Modalidad (Null-safe)
        const ubicacionLower = (offer.ubicacion || '').toLowerCase();
        const modalidadLower = (offer.modalidad || '').toLowerCase();

        if (modalidadLower === 'hibrido' || modalidadLower === 'presencial') {
            // Presencial o híbrido solo si es en Málaga
            if (!ubicacionLower.includes('malaga') && !ubicacionLower.includes('málaga')) {
                continue;
            }
        }

        // 3. Filtro por Salario Mínimo: si se especifica salario y es inferior a 10.000€
        if (offer.salario_min !== null && offer.salario_min < 10000) {
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
        url_oferta: fila.url_oferta || `https://oferta-${Date.now()}-${Math.random()}`,
    }));

    return filterOffers(parsedOffers);
}

export function parseOffersCsv(filePath: string): ParsedOffer[] {
    const contenido = fs.readFileSync(filePath, 'utf-8');
    return parseOffersCsvFromText(contenido);
}
