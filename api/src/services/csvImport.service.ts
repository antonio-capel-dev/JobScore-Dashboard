import { parse } from 'csv-parse/sync';
import fs from 'node:fs';

export interface ParsedOffer {
    fecha_scrape: string;
    fecha_publicacion: string;
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

export function parseOffersCsv(filePath: string): ParsedOffer[] {
    const contenido = fs.readFileSync(filePath, 'utf-8');
    const filas = parse(contenido, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
    });
    return filas.map((fila: any) => ({
        fecha_scrape: fila.fecha_scrape,
        fecha_publicacion: fila.fecha_publicacion,
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
}

