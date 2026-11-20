import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// obtenerRutaCsv no toca la base de datos; se aísla el cliente de Supabase
// para que el test no dependa de SUPABASE_URL ni de la red.
vi.mock('../db/supabaseClient', () => ({ supabase: {} }));

vi.mock('../db/offers.repository', () => ({
    existeOfertaPorUrl: vi.fn(),
    guardarOferta: vi.fn(),
}));

vi.mock('./telegram.service', () => ({
    sendOfferNotification: vi.fn(),
}));

vi.mock('./scoring.service', async (importOriginal) => {
    const original = await importOriginal<typeof import('./scoring.service')>();
    return { ...original, scoreOffer: vi.fn() };
});

import { obtenerRutaCsv, prioridadOferta, procesarOfertas } from './pipeline.service';
import { existeOfertaPorUrl, guardarOferta } from '../db/offers.repository';
import { scoreOffer, LimiteProveedorError, type ScoringResult } from './scoring.service';
import type { ParsedOffer } from './csvImport.service';

const oferta = (titulo: string, url: string, stack: string[] = []): ParsedOffer => ({
    fecha_scrape: '2026-11-20',
    fecha_publicacion: '2026-11-19',
    fuente: 'LinkedIn',
    encaja_perfil: null,
    empresa: 'Empresa',
    titulo_puesto: titulo,
    categoria: 'IA',
    ubicacion: 'Málaga',
    modalidad: 'remoto',
    salario_min: null,
    salario_max: null,
    experiencia_requerida: null,
    stack_tecnologico: stack,
    nivel_ingles: 'No indicado',
    url_oferta: url,
});

const nota = (score: number, veredicto: ScoringResult['veredicto']): ScoringResult => ({
    score,
    veredicto,
    tecnologiasCoincidentes: [],
    brechaPrincipal: '',
    recomendacion: '',
});

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

    describe('prioridadOferta', () => {
        it('puntúa más las ofertas de Python, datos o IA que las de web genérica', () => {
            const datos = oferta('Junior Data Engineer (Python)', 'u1');
            const web = oferta('Desarrollador Frontend Junior', 'u2', ['React']);
            expect(prioridadOferta(datos)).toBeGreaterThan(prioridadOferta(web));
        });

        it('valora el doble lo que aparece en el título que lo que aparece en el stack', () => {
            const enTitulo = oferta('Python Developer', 'u1');
            const enStack = oferta('Developer', 'u2', ['Python']);
            expect(prioridadOferta(enTitulo)).toBe(2);
            expect(prioridadOferta(enStack)).toBe(1);
        });
    });

    describe('procesarOfertas', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            process.env.SCORING_DELAY_MS = '0';
            vi.mocked(existeOfertaPorUrl).mockResolvedValue(false);
        });

        afterEach(() => {
            delete process.env.SCORING_DELAY_MS;
            delete process.env.SCORING_MAX_POR_EJECUCION;
        });

        it('no gasta llamadas al modelo en las ofertas que ya están guardadas', async () => {
            vi.mocked(existeOfertaPorUrl).mockImplementation(async (url) => url === 'ya-existe');
            vi.mocked(scoreOffer).mockResolvedValue(nota(80, 'Si'));

            const resultado = await procesarOfertas([oferta('Data Engineer', 'ya-existe'), oferta('AI Engineer', 'nueva')]);

            expect(scoreOffer).toHaveBeenCalledTimes(1);
            expect(resultado.omitidas).toBe(1);
            expect(resultado.saved).toBe(1);
        });

        it('respeta el tope por ejecución, empieza por las más afines y deja el resto pendiente', async () => {
            process.env.SCORING_MAX_POR_EJECUCION = '2';
            vi.mocked(scoreOffer).mockResolvedValue(nota(80, 'Si'));

            const resultado = await procesarOfertas([
                oferta('Recepcionista', 'u1'),
                oferta('Junior Data Engineer Python', 'u2'),
                oferta('AI Engineer', 'u3'),
            ]);

            expect(scoreOffer).toHaveBeenCalledTimes(2);
            const titulosPuntuados = vi.mocked(scoreOffer).mock.calls.map(([o]) => o.titulo_puesto);
            expect(titulosPuntuados).toEqual(['Junior Data Engineer Python', 'AI Engineer']);
            expect(resultado.pendientes).toBe(1);
        });

        it('guarda también las descartadas para no volver a puntuarlas, sin contarlas como guardadas', async () => {
            vi.mocked(scoreOffer).mockResolvedValue(nota(20, 'No'));

            const resultado = await procesarOfertas([oferta('Java Developer', 'u1')]);

            expect(guardarOferta).toHaveBeenCalledTimes(1);
            expect(resultado.saved).toBe(0);
            expect(resultado.discardedByScore).toBe(1);
        });

        it('para en cuanto OpenRouter avisa de límite y deja el resto para la siguiente ejecución', async () => {
            vi.mocked(scoreOffer)
                .mockResolvedValueOnce(nota(80, 'Si'))
                .mockRejectedValueOnce(new LimiteProveedorError('Rate limit exceeded', 429));

            const resultado = await procesarOfertas([
                oferta('Data Engineer', 'u1'),
                oferta('AI Engineer', 'u2'),
                oferta('Python Developer', 'u3'),
            ]);

            expect(scoreOffer).toHaveBeenCalledTimes(2);
            expect(resultado.saved).toBe(1);
            expect(resultado.errors).toBe(0);
            expect(resultado.pendientes).toBe(2);
        });

        it('cuenta como error un fallo normal del modelo y sigue con la siguiente oferta', async () => {
            vi.mocked(scoreOffer)
                .mockRejectedValueOnce(new Error('JSON inválido'))
                .mockResolvedValueOnce(nota(80, 'Si'));

            const resultado = await procesarOfertas([oferta('Data Engineer', 'u1'), oferta('AI Engineer', 'u2')]);

            expect(scoreOffer).toHaveBeenCalledTimes(2);
            expect(resultado.errors).toBe(1);
            expect(resultado.saved).toBe(1);
            expect(resultado.pendientes).toBe(0);
        });
    });
});
