import { describe, it, expect } from 'vitest';
import { escapeHtml } from './telegram.service';

describe('telegram.service', () => {
    describe('escapeHtml', () => {
        it('debe escapar caracteres & a &amp;', () => {
            expect(escapeHtml('C++ & Python')).toBe('C++ &amp; Python');
        });

        it('debe escapar caracteres < y > a &lt; y &gt;', () => {
            expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
        });

        it('debe escapar etiquetas con múltiples caracteres especiales combinados', () => {
            const entrada = 'Desarrollador <React/Node> & Cloud <AWS>';
            const esperado = 'Desarrollador &lt;React/Node&gt; &amp; Cloud &lt;AWS&gt;';
            expect(escapeHtml(entrada)).toBe(esperado);
        });

        it('debe devolver el texto idéntico si no tiene caracteres HTML especiales', () => {
            const textoNormal = 'Junior Frontend Developer en Madrid';
            expect(escapeHtml(textoNormal)).toBe(textoNormal);
        });
    });
});
