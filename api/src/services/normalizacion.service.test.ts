import { describe, it, expect } from 'vitest';
import {
    normalizarTexto,
    pareceNombreDePersona,
    modalidadDesdeTitulo,
    ciudadDesdeTitulo,
    normalizarOferta,
    aplicarTopeSinDescripcion,
    RegistroDePuestos,
    SCORE_MAX_SIN_DESCRIPCION,
} from './normalizacion.service';
import type { ParsedOffer } from './csvImport.service';
import type { ScoringResult } from './scoring.service';

const base: ParsedOffer = {
    fecha_scrape: '2026-11-25',
    fecha_publicacion: '2026-11-25',
    fuente: 'LinkedIn',
    encaja_perfil: null,
    empresa: 'Empresa',
    titulo_puesto: 'Data Engineer',
    categoria: 'IA',
    ubicacion: 'Málaga',
    modalidad: 'presencial',
    salario_min: null,
    salario_max: null,
    experiencia_requerida: null,
    stack_tecnologico: [],
    nivel_ingles: 'No indicado',
    url_oferta: 'https://x/1',
};

const nota = (score: number): ScoringResult => ({
    score,
    veredicto: score >= 75 ? 'Si' : 'Quizas',
    tecnologiasCoincidentes: [],
    brechaPrincipal: 'Pide Airflow',
    recomendacion: '',
});

describe('normalizacion.service', () => {
    it('normalizarTexto quita acentos, mayúsculas y signos', () => {
        expect(normalizarTexto('Técnico de IA – Sistemas')).toBe('tecnico de ia sistemas');
    });

    describe('pareceNombreDePersona', () => {
        it('detecta un nombre propio sin ninguna palabra de puesto', () => {
            expect(pareceNombreDePersona('José Carlos Díaz Torres')).toBe(true);
            expect(pareceNombreDePersona('María de la Fuente')).toBe(true);
        });

        it('no confunde títulos reales con nombres', () => {
            expect(pareceNombreDePersona('Data Engineer')).toBe(false);
            expect(pareceNombreDePersona('Ingeniero/a de Software')).toBe(false);
            expect(pareceNombreDePersona('Celonis Data Engineer')).toBe(false);
            expect(pareceNombreDePersona('Programador')).toBe(false);
        });
    });

    describe('modalidadDesdeTitulo', () => {
        it('lee remoto, híbrido y teletrabajo parcial del título', () => {
            expect(modalidadDesdeTitulo('Ingeniero de Software para sistemas críticos. REMOTO')).toBe('remoto');
            expect(modalidadDesdeTitulo('AI Research Lab (100 % remote)')).toBe('remoto');
            expect(modalidadDesdeTitulo('Fullstack Developer (Hybrid)')).toBe('hibrido');
            expect(modalidadDesdeTitulo('Frontend developer - Teletrabajo parcial - Inglés alto')).toBe('hibrido');
        });

        it('no toma "jornada parcial" por modalidad ni inventa una si el título no la dice', () => {
            expect(modalidadDesdeTitulo('Prácticas jornada parcial')).toBeNull();
            expect(modalidadDesdeTitulo('Data Engineer')).toBeNull();
        });
    });

    describe('ciudadDesdeTitulo', () => {
        it('devuelve la ciudad del título si no es Málaga', () => {
            expect(ciudadDesdeTitulo('Desarrollador Python/Jenkins Híbrido Barcelona(H/M/X)')).toBe('Barcelona');
            expect(ciudadDesdeTitulo('Ingeniero/a IA | Machine Learning | Lleida')).toBe('Lleida');
        });

        it('no cambia nada si el título nombra Málaga o no nombra ciudad', () => {
            expect(ciudadDesdeTitulo('Data Engineer Málaga o Madrid')).toBeNull();
            expect(ciudadDesdeTitulo('AI Engineer')).toBeNull();
        });
    });

    describe('normalizarOferta', () => {
        it('descarta un nombre de persona como título', () => {
            expect(normalizarOferta({ ...base, titulo_puesto: 'José Carlos Díaz Torres', empresa: 'Confidencial' })).toBeNull();
        });

        it('marca como "No indicada" la empresa que repite el título', () => {
            const titulo = 'Consultor/a de IA Conversacional y Agéntica';
            expect(normalizarOferta({ ...base, titulo_puesto: titulo, empresa: titulo })?.empresa).toBe('No indicada');
        });

        it('corrige ciudad y modalidad con el título y no toca lo demás', () => {
            const corregida = normalizarOferta({ ...base, titulo_puesto: 'Desarrollador Python Híbrido Barcelona' });
            expect(corregida?.ubicacion).toBe('Barcelona');
            expect(corregida?.modalidad).toBe('hibrido');
            expect(corregida?.empresa).toBe('Empresa');
        });
    });

    describe('aplicarTopeSinDescripcion', () => {
        it('limita la nota y lo explica cuando no hay descripción', () => {
            const r = aplicarTopeSinDescripcion(base, nota(85));
            expect(r.score).toBe(SCORE_MAX_SIN_DESCRIPCION);
            expect(r.veredicto).toBe('Quizas');
            expect(r.brechaPrincipal).toContain('Sin descripción');
            expect(r.brechaPrincipal).toContain('Pide Airflow');
        });

        it('no toca la nota si hay descripción o si ya está por debajo del tope', () => {
            const conDescripcion = { ...base, description: 'Buscamos Data Engineer junior con Python, SQL y Airflow para construir pipelines en un equipo de datos.' };
            expect(aplicarTopeSinDescripcion(conDescripcion, nota(85)).score).toBe(85);
            expect(aplicarTopeSinDescripcion(base, nota(60)).score).toBe(60);
        });
    });

    describe('RegistroDePuestos', () => {
        it('considera duplicado el mismo puesto de la misma empresa aunque cambien acentos y mayúsculas', () => {
            const registro = new RegistroDePuestos();
            registro.anadir('Ingeniero de Datos IA', 'Unicaja');
            expect(registro.contiene('INGENIERO DE DATOS IA', 'unicaja')).toBe(true);
        });

        it('considera duplicado el mismo puesto republicado por un agregador', () => {
            const registro = new RegistroDePuestos();
            registro.anadir('Data Visualization - EY GDS Spain - Hybrid', 'EY');
            expect(registro.contiene('Data Visualization - EY GDS Spain - Hybrid', 'Universia España')).toBe(true);
        });

        it('no junta el mismo título en empresas distintas', () => {
            const registro = new RegistroDePuestos();
            registro.anadir('Data Engineer', 'Camlin Group');
            expect(registro.contiene('Data Engineer', 'Mercedes-Benz')).toBe(false);
        });
    });
});
