import { describe, it, expect } from 'vitest';
import { normalizarFechaPublicacion, esOfertaSenior, filterOffers, type ParsedOffer } from './csvImport.service';

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

    describe('esOfertaSenior (Filtro Anti-Senior)', () => {
        it('debe detectar como senior títulos con Senior, Sr., Lead, Architect o Staff', () => {
            expect(esOfertaSenior('Senior Frontend Developer', null)).toBe(true);
            expect(esOfertaSenior('Sr. Software Engineer', null)).toBe(true);
            expect(esOfertaSenior('Tech Lead React', null)).toBe(true);
            expect(esOfertaSenior('Software Architect', null)).toBe(true);
            expect(esOfertaSenior('Staff Full Stack Developer', null)).toBe(true);
            expect(esOfertaSenior('Engineering Manager', null)).toBe(true);
        });

        it('debe detectar como senior ofertas que exijan 5+ años de experiencia', () => {
            expect(esOfertaSenior('Full Stack Developer', '5+ años de experiencia')).toBe(true);
            expect(esOfertaSenior('Backend Developer', '+4 años')).toBe(true);
        });

        it('NO debe marcar como senior ofertas de nivel Junior, Trainee o Prácticas', () => {
            expect(esOfertaSenior('Junior Full Stack Developer', '0-1 años')).toBe(false);
            expect(esOfertaSenior('Desarrollador Frontend Junior', null)).toBe(false);
            expect(esOfertaSenior('Trainee Web Developer', 'Sin experiencia')).toBe(false);
            expect(esOfertaSenior('Prácticas Desarrollo React', null)).toBe(false);
        });
    });

    describe('filterOffers', () => {
        const baseOffer: ParsedOffer = {
            fecha_scrape: '2026-09-02',
            fecha_publicacion: '2026-09-01',
            fuente: 'Adzuna',
            encaja_perfil: null,
            empresa: 'Acme Corp',
            titulo_puesto: 'Junior React Developer',
            categoria: 'WEB',
            ubicacion: 'Málaga',
            modalidad: 'hibrido',
            salario_min: 20000,
            salario_max: 25000,
            experiencia_requerida: '1 año',
            stack_tecnologico: ['React', 'TypeScript'],
            nivel_ingles: 'B2',
            url_oferta: 'https://ejemplo.com/1'
        };

        it('debe conservar ofertas junior híbridas/presenciales en Málaga', () => {
            const resultado = filterOffers([baseOffer]);
            expect(resultado).toHaveLength(1);
        });

        it('debe descartar ofertas híbridas/presenciales fuera de Málaga', () => {
            const ofertaMadrid = { ...baseOffer, ubicacion: 'Madrid', modalidad: 'hibrido' };
            const resultado = filterOffers([ofertaMadrid]);
            expect(resultado).toHaveLength(0);
        });

        it('debe conservar ofertas remotas en cualquier ubicación de España', () => {
            const ofertaRemota = { ...baseOffer, ubicacion: 'Barcelona', modalidad: 'remoto' };
            const resultado = filterOffers([ofertaRemota]);
            expect(resultado).toHaveLength(1);
        });

        it('debe descartar automáticamente ofertas senior independientemente de la ubicación', () => {
            const ofertaSenior = { ...baseOffer, titulo_puesto: 'Senior Full Stack Lead' };
            const resultado = filterOffers([ofertaSenior]);
            expect(resultado).toHaveLength(0);
        });

        it('debe descartar ofertas con salario mínimo menor a 10.000€', () => {
            const ofertaBajoSalario = { ...baseOffer, salario_min: 8000 };
            const resultado = filterOffers([ofertaBajoSalario]);
            expect(resultado).toHaveLength(0);
        });
    });
});
