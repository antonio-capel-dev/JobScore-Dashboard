import { describe, it, expect, vi, afterEach } from 'vitest';
import { extraerJson, construirPrompt, scoreOffer, LimiteProveedorError, MODELO_POR_DEFECTO, MAX_TOKENS_POR_DEFECTO } from './scoring.service';
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

        it('debe sacar el JSON cuando el modelo añade texto antes o después', () => {
            const entrada = 'Aquí tienes la evaluación:\n{"score": 70, "veredicto": "Quizas"}\nEspero que sirva.';
            expect(extraerJson(entrada)).toBe('{"score": 70, "veredicto": "Quizas"}');
        });
    });

    describe('scoreOffer', () => {
        const oferta: ParsedOffer = {
            fecha_scrape: '2026-11-20',
            fecha_publicacion: '2026-11-19',
            fuente: 'LinkedIn',
            encaja_perfil: null,
            empresa: 'DataCorp',
            titulo_puesto: 'Junior Data Engineer',
            categoria: 'IA',
            ubicacion: 'Málaga',
            modalidad: 'hibrido',
            salario_min: null,
            salario_max: null,
            experiencia_requerida: null,
            stack_tecnologico: ['Python', 'SQL'],
            nivel_ingles: 'No indicado',
            url_oferta: 'https://ejemplo.com/oferta/de-1'
        };

        afterEach(() => {
            vi.unstubAllGlobals();
            delete process.env.OPENROUTER_MODEL;
            delete process.env.SCORING_MAX_TOKENS;
        });

        const respuestaOk = (contenido: string) => ({
            ok: true,
            status: 200,
            json: async () => ({ choices: [{ message: { content: contenido } }] }),
        });

        it('usa el router de modelos gratuitos si no se configura otro modelo', async () => {
            const fetchMock = vi.fn().mockResolvedValue(respuestaOk('{"score": 80, "veredicto": "Si"}'));
            vi.stubGlobal('fetch', fetchMock);

            const resultado = await scoreOffer(oferta);

            const cuerpo = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(cuerpo.model).toBe(MODELO_POR_DEFECTO);
            expect(MODELO_POR_DEFECTO).toBe('openrouter/free');
            expect(resultado.score).toBe(80);
            expect(resultado.veredicto).toBe('Si');
        });

        it('limita el razonamiento y deja margen de tokens para que el JSON no llegue vacío', async () => {
            const fetchMock = vi.fn().mockResolvedValue(respuestaOk('{"score": 80, "veredicto": "Si"}'));
            vi.stubGlobal('fetch', fetchMock);

            await scoreOffer(oferta);

            const cuerpo = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(cuerpo.max_tokens).toBe(MAX_TOKENS_POR_DEFECTO);
            expect(cuerpo.reasoning).toEqual({ effort: 'low', exclude: true });
        });

        it('respeta SCORING_MAX_TOKENS si está configurado', async () => {
            process.env.SCORING_MAX_TOKENS = '6000';
            const fetchMock = vi.fn().mockResolvedValue(respuestaOk('{"score": 80, "veredicto": "Si"}'));
            vi.stubGlobal('fetch', fetchMock);

            await scoreOffer(oferta);

            expect(JSON.parse(fetchMock.mock.calls[0][1].body).max_tokens).toBe(6000);
        });

        it('respeta OPENROUTER_MODEL si está configurado', async () => {
            process.env.OPENROUTER_MODEL = 'proveedor/modelo-de-pago';
            const fetchMock = vi.fn().mockResolvedValue(respuestaOk('{"score": 50, "veredicto": "Quizas"}'));
            vi.stubGlobal('fetch', fetchMock);

            await scoreOffer(oferta);

            expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('proveedor/modelo-de-pago');
        });

        it.each([429, 402])('lanza LimiteProveedorError con el estado %i', async (estado) => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
                ok: false,
                status: estado,
                json: async () => ({ error: { message: 'Rate limit exceeded' } }),
            }));

            await expect(scoreOffer(oferta)).rejects.toBeInstanceOf(LimiteProveedorError);
        });

        it('falla con un error normal si el modelo devuelve una respuesta vacía', async () => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaOk('   ')));

            const error = await scoreOffer(oferta).catch(e => e);
            expect(error).toBeInstanceOf(Error);
            expect(error).not.toBeInstanceOf(LimiteProveedorError);
            expect(error.message).toContain('finish_reason');
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
            expect(prompt).toContain('Junior AI / Data Engineer');
            expect(prompt).toContain('Python');
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
