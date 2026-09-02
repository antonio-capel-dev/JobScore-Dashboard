import { describe, it, expect } from 'vitest';
import { extraerJson, construirPrompt } from './scoring.service';
import type { ParsedOffer } from './csvImport.service';

describe('scoring.service', () => {
    describe('extraerJson', () => {
        it('debe devolver el texto limpio si ya es un JSON sin bloques markdown', () => {
            const jsonPuro = '{"score": 85, "veredicto": "Si"}';
            expect(extraerJson(jsonPuro)).toBe(jsonPuro);
        });

        it('debe extraer el contenido JSON cuando viene envuelto en bloques markdown ```json ... ```', () => {
            const entradaMarkdown = '```json\n{"score": 90, "veredicto": "Si"}\n```';
            const resultado = extraerJson(entradaMarkdown);
            expect(resultado).toBe('{"score": 90, "veredicto": "Si"}');
        });

        it('debe extraer el contenido JSON cuando el bloque es ``` genérico con espacios alrededor', () => {
            const entradaMarkdown = '   ```\n{\n  "score": 50,\n  "veredicto": "Quizas"\n}\n```   ';
            const resultado = extraerJson(entradaMarkdown);
            expect(resultado).toBe('{\n  "score": 50,\n  "veredicto": "Quizas"\n}');
        });
    });

    describe('construirPrompt', () => {
        const mockOffer: ParsedOffer = {
            fecha_scrape: '2026-09-02',
            fecha_publicacion: '2026-09-01',
            fuente: 'Tecnoempleo',
            encaja_perfil: null,
            empresa: 'TechCorp',
            titulo_puesto: 'Junior Full-Stack Developer',
            categoria: 'WEB',
            ubicacion: 'Madrid',
            modalidad: 'remoto',
            salario_min: 25000,
            salario_max: 30000,
            experiencia_requerida: '1 año',
            stack_tecnologico: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
            nivel_ingles: 'B2',
            url_oferta: 'https://ejemplo.com/oferta/123'
        };

        it('debe incluir el perfil objetivo del candidato en el prompt', () => {
            const prompt = construirPrompt(mockOffer);
            expect(prompt).toContain('Junior Full-Stack Web Developer');
            expect(prompt).toContain('React');
            expect(prompt).toContain('Node.js');
            expect(prompt).toContain('TypeScript');
            expect(prompt).toContain('PostgreSQL');
        });

        it('debe incrustar los detalles específicos de la oferta a evaluar', () => {
            const prompt = construirPrompt(mockOffer);
            expect(prompt).toContain('TechCorp');
            expect(prompt).toContain('Junior Full-Stack Developer');
            expect(prompt).toContain('React, Node.js, TypeScript, PostgreSQL');
            expect(prompt).toContain('remoto');
            expect(prompt).toContain('25000 - 30000');
            expect(prompt).toContain('B2');
        });
    });
});
