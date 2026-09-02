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
    }
    else {
        return fecha;
    }
}

// Nueva función para filtrar ofertas
function filterOffers(offers: ParsedOffer[]): ParsedOffer[] {
    const filteredOffers: ParsedOffer[] = [];
    for (const offer of offers) {
        let keepOffer = true;

        // 1. Filtro por Ubicación y Modalidad
        const ubicacionLower = offer.ubicacion.toLowerCase();
        const modalidadLower = offer.modalidad.toLowerCase();

        if (modalidadLower === 'hibrido' || modalidadLower === 'presencial') {
            if (!ubicacionLower.includes('malaga') && !ubicacionLower.includes('málaga')) {
                keepOffer = false; // Descartar si es híbrido/presencial y no es Málaga
            }
        }

        // 2. Filtro por Salario Mínimo
        if (keepOffer && offer.salario_min !== null && offer.salario_min < 20000) {
            keepOffer = false; // Descartar si el salario mínimo es inferior a 20k
        }

        if (keepOffer) {
            filteredOffers.push(offer);
        }
    }
    return filteredOffers;
}

export function parseOffersCsv(filePath: string): ParsedOffer[] {
    const contenido = fs.readFileSync(filePath, 'utf-8');
    const filas = parse(contenido, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
    });
    const parsedOffers = filas.map((fila: any) => ({
        fecha_scrape: fila.fecha_scrape,
        fecha_publicacion: normalizarFechaPublicacion(fila.fecha_publicacion, fila.fuente),
        fuente: fila.fuente,
        encaja_perfil: fila.encaja_perfil,
        empresa: fila.empresa,
        titulo_puesto: fila.titulo_puesto,
        categoria: fila.categoria as 'IA' | 'WEB',
        ubicacion: fila.ubicacion,
        modalidad: fila.modalidad,
        salario_min: fila.salario_min === '' ? null : Number(fila.salario_min),
        salario_max: fila.salario_max === '' ? null : Number(fila.salario_max),
        experiencia_requerida: fila.experiencia_requerida === '' ? null : fila.experiencia_requerida,
        stack_tecnologico: fila.stack_tecnologico.split(',').map((s: string) => s.trim()),
        nivel_ingles: fila.nivel_ingles,
        url_oferta: fila.url_oferta,
    }));

    return filterOffers(parsedOffers);
}

