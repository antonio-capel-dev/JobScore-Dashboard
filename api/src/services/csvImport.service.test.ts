import { describe, it, expect } from 'vitest';
import { normalizarFechaPublicacion, esOfertaSenior, esTecnologiaFueraDeAlcance, filterOffers, type ParsedOffer } from './csvImport.service';

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

    describe('esTecnologiaFueraDeAlcance (Filtro de Stack)', () => {
        it('NO descarta Java, .NET ni C# en el prefiltro: esas ofertas las evalúa el LLM', () => {
            expect(esTecnologiaFueraDeAlcance('Desarrollador Java')).toBe(false);
            expect(esTecnologiaFueraDeAlcance('Junior Java Backend Developer')).toBe(false);
            expect(esTecnologiaFueraDeAlcance('Programador .Net')).toBe(false);
            expect(esTecnologiaFueraDeAlcance('Junior JavaScript Developer')).toBe(false);
        });

        it('debe descartar ofertas de Cobol, SAP y ABAP', () => {
            expect(esTecnologiaFueraDeAlcance('Programador Cobol')).toBe(true);
            expect(esTecnologiaFueraDeAlcance('Consultor SAP')).toBe(true);
            expect(esTecnologiaFueraDeAlcance('Desarrollador ABAP')).toBe(true);
        });

        it('debe descartar ofertas de Data Science / ML / IA especializada', () => {
            expect(esTecnologiaFueraDeAlcance('Data Scientist - Song')).toBe(true);
            expect(esTecnologiaFueraDeAlcance('Machine Learning Engineer')).toBe(true);
            expect(esTecnologiaFueraDeAlcance('Data Engineer especialista en Databricks')).toBe(true);
            expect(esTecnologiaFueraDeAlcance('Computer Vision Engineer (IA)')).toBe(true);
        });

        it('debe descartar ofertas de ciberseguridad y pentesting', () => {
            expect(esTecnologiaFueraDeAlcance('Analista Ciberseguridad Junior')).toBe(true);
            expect(esTecnologiaFueraDeAlcance('Cybersecurity Analyst')).toBe(true);
            expect(esTecnologiaFueraDeAlcance('Penetration Tester Junior')).toBe(true);
        });

        it('NO descarta Audit ni DevOps en el prefiltro', () => {
            expect(esTecnologiaFueraDeAlcance('IT&Data Audit&Assurance')).toBe(false);
            expect(esTecnologiaFueraDeAlcance('DevOps Engineer')).toBe(false);
        });

        it('NO debe descartar ofertas de React, TypeScript, WordPress, PHP, Node, Python, Full Stack', () => {
            expect(esTecnologiaFueraDeAlcance('Junior React Developer')).toBe(false);
            expect(esTecnologiaFueraDeAlcance('Desarrollador/a Front-End (React / Next.js)')).toBe(false);
            expect(esTecnologiaFueraDeAlcance('Desarrollador Web WordPress con conocimientos SEO')).toBe(false);
            expect(esTecnologiaFueraDeAlcance('Programador/a PHP (Laravel / Symfony)')).toBe(false);
            expect(esTecnologiaFueraDeAlcance('Backend NodeJS / NestJS Developer')).toBe(false);
            expect(esTecnologiaFueraDeAlcance('Full Stack Developer NodeJs / Angular')).toBe(false);
            expect(esTecnologiaFueraDeAlcance('Ingeniero/a de Software Frontend (Junior)')).toBe(false);
            expect(esTecnologiaFueraDeAlcance('IA Developer')).toBe(false);
            expect(esTecnologiaFueraDeAlcance('Frontend React - TV')).toBe(false);
            expect(esTecnologiaFueraDeAlcance('Desarrollador/a QA')).toBe(false);
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

        it('debe descartar ofertas con salario mínimo menor a 5.000€', () => {
            const ofertaBajoSalario = { ...baseOffer, salario_min: 4000 };
            const resultado = filterOffers([ofertaBajoSalario]);
            expect(resultado).toHaveLength(0);
        });

        it('debe conservar ofertas con salario mínimo de 5.000€ o más', () => {
            const ofertaSalarioValido = { ...baseOffer, salario_min: 8000 };
            const resultado = filterOffers([ofertaSalarioValido]);
            expect(resultado).toHaveLength(1);
        });

        it('debe descartar ofertas de tecnologías fuera de alcance (Cobol, ML Engineer...)', () => {
            const ofertaCobol = { ...baseOffer, titulo_puesto: 'Programador Cobol' };
            const ofertaML = { ...baseOffer, titulo_puesto: 'Machine Learning Engineer' };
            const resultado = filterOffers([ofertaCobol, ofertaML]);
            expect(resultado).toHaveLength(0);
        });
    });
});

