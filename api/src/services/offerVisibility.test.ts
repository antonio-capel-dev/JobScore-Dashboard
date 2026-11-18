import { describe, it, expect } from 'vitest';
import { vistaPublica } from './offerVisibility';

describe('offerVisibility', () => {
    describe('vistaPublica', () => {
        const oferta = {
            id: 7,
            empresa: 'Empresa Demo',
            titulo_puesto: 'Junior Data Engineer',
            score: 82,
            estado_candidatura: 'entrevista',
            notas: 'Entrevista técnica el jueves con el Tech Lead',
        };

        it('oculta la fase de la candidatura y las notas personales', () => {
            const publica = vistaPublica(oferta);
            expect(publica.estado_candidatura).toBeNull();
            expect(publica.notas).toBeNull();
        });

        it('conserva el resto de datos de la oferta', () => {
            const publica = vistaPublica(oferta);
            expect(publica).toMatchObject({ id: 7, empresa: 'Empresa Demo', titulo_puesto: 'Junior Data Engineer', score: 82 });
        });

        it('no modifica el objeto original', () => {
            vistaPublica(oferta);
            expect(oferta.estado_candidatura).toBe('entrevista');
            expect(oferta.notas).toBe('Entrevista técnica el jueves con el Tech Lead');
        });
    });
});
