import { describe, it, expect } from 'vitest';
import { obtenerRutaCsv } from './pipeline.service';

describe('pipeline.service', () => {
    describe('obtenerRutaCsv', () => {
        it('debe devolver una ruta para la fuente tecnoempleo', () => {
            const ruta = obtenerRutaCsv('tecnoempleo');
            expect(ruta).toBeDefined();
            expect(ruta).toContain('empleos_tech_ia_web.csv');
        });

        it('debe devolver una ruta para la fuente adzuna', () => {
            const ruta = obtenerRutaCsv('adzuna');
            expect(ruta).toBeDefined();
            expect(ruta).toContain('ofertas_');
        });

        it('debe devolver null si se solicita una fuente no soportada', () => {
            const ruta = obtenerRutaCsv('linkedin_invalido');
            expect(ruta).toBeNull();
        });
    });
});
