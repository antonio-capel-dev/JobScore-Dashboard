import { describe, it, expect } from 'vitest';
import { normalizarFechaPublicacion } from './csvImport.service';

describe('csvImport.service', () => {
    describe('normalizarFechaPublicacion', () => {
        it('debe normalizar fechas en formato DD/MM/YYYY a ISO YYYY-MM-DD cuando hay fuente especificada (Tecnoempleo)', () => {
            const fechaTecnoempleo = '24/06/2026';
            const resultado = normalizarFechaPublicacion(fechaTecnoempleo, 'Tecnoempleo');
            expect(resultado).toBe('2026-06-24');
        });

        it('debe mantener la fecha tal cual si viene en formato ISO sin fuente (Adzuna)', () => {
            const fechaAdzuna = '2026-07-01';
            const resultado = normalizarFechaPublicacion(fechaAdzuna, undefined);
            expect(resultado).toBe('2026-07-01');
        });

        it('debe manejar correctamente fechas de fin de año', () => {
            const fecha = '31/12/2026';
            const resultado = normalizarFechaPublicacion(fecha, 'Tecnoempleo');
            expect(resultado).toBe('2026-12-31');
        });
    });
});
