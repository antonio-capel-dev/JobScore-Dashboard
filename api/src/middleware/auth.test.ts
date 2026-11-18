import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

// Simulamos el cliente de Supabase: los tests no deben llamar a la red
const { getUserMock } = vi.hoisted(() => ({ getUserMock: vi.fn() }));
vi.mock('../db/supabaseClient', () => ({
    supabase: { auth: { getUser: getUserMock } },
}));

import { apiKeyValida, identificarSolicitante, requireOwner } from './auth';

const API_KEY = 'clave-de-ingesta-de-prueba-1234567890';
const EMAIL_PROPIETARIO = 'propietario@example.com';

function peticion(cabeceras: Record<string, string> = {}): Request {
    const normalizadas = Object.fromEntries(
        Object.entries(cabeceras).map(([nombre, valor]) => [nombre.toLowerCase(), valor])
    );
    return { get: (nombre: string) => normalizadas[nombre.toLowerCase()] } as unknown as Request;
}

function respuesta() {
    const res = {
        statusCode: 200,
        body: undefined as unknown,
        status(codigo: number) {
            res.statusCode = codigo;
            return res;
        },
        json(cuerpo: unknown) {
            res.body = cuerpo;
            return res;
        },
    };
    return res;
}

function usuarioConEmail(email: string) {
    return { data: { user: { email } }, error: null };
}

describe('middleware de autenticación', () => {
    beforeEach(() => {
        vi.stubEnv('INGEST_API_KEY', API_KEY);
        vi.stubEnv('OWNER_EMAILS', EMAIL_PROPIETARIO);
        getUserMock.mockReset();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    describe('apiKeyValida', () => {
        it('acepta la API key configurada', () => {
            expect(apiKeyValida(API_KEY)).toBe(true);
        });

        it('rechaza una API key distinta, aunque tenga la misma longitud', () => {
            expect(apiKeyValida(API_KEY.replace(/.$/, 'X'))).toBe(false);
        });

        it('falla en cerrado si INGEST_API_KEY no está configurada', () => {
            vi.stubEnv('INGEST_API_KEY', '');
            expect(apiKeyValida('')).toBe(false);
            expect(apiKeyValida('cualquier-cosa')).toBe(false);
        });
    });

    describe('identificarSolicitante', () => {
        it('trata como anónima una petición sin credenciales', async () => {
            expect(await identificarSolicitante(peticion())).toBe('anonimo');
            expect(getUserMock).not.toHaveBeenCalled();
        });

        it('reconoce al propietario por la API key de ingesta', async () => {
            expect(await identificarSolicitante(peticion({ 'x-api-key': API_KEY }))).toBe('propietario');
        });

        it('reconoce al propietario por su token de Supabase, sin distinguir mayúsculas en el email', async () => {
            getUserMock.mockResolvedValue(usuarioConEmail('Propietario@Example.com'));

            const resultado = await identificarSolicitante(peticion({ Authorization: 'Bearer token-valido' }));

            expect(resultado).toBe('propietario');
            expect(getUserMock).toHaveBeenCalledWith('token-valido');
        });

        it('distingue a otro usuario con sesión válida que no es el propietario', async () => {
            getUserMock.mockResolvedValue(usuarioConEmail('visitante@example.com'));
            expect(await identificarSolicitante(peticion({ Authorization: 'Bearer token-ajeno' }))).toBe('otro');
        });

        it('trata como anónimo un token que Supabase rechaza', async () => {
            getUserMock.mockResolvedValue({ data: { user: null }, error: new Error('JWT expired') });
            expect(await identificarSolicitante(peticion({ Authorization: 'Bearer caducado' }))).toBe('anonimo');
        });

        it('no da permisos a nadie por token si OWNER_EMAILS no está configurada', async () => {
            vi.stubEnv('OWNER_EMAILS', '');
            getUserMock.mockResolvedValue(usuarioConEmail(EMAIL_PROPIETARIO));
            expect(await identificarSolicitante(peticion({ Authorization: 'Bearer token-valido' }))).toBe('otro');
        });
    });

    describe('requireOwner', () => {
        it('deja pasar al propietario', async () => {
            const next = vi.fn() as unknown as NextFunction;
            const res = respuesta();

            await requireOwner(peticion({ 'x-api-key': API_KEY }), res as unknown as Response, next);

            expect(next).toHaveBeenCalledOnce();
            expect(res.statusCode).toBe(200);
        });

        it('responde 401 sin credenciales y no ejecuta la ruta', async () => {
            const next = vi.fn() as unknown as NextFunction;
            const res = respuesta();

            await requireOwner(peticion(), res as unknown as Response, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.statusCode).toBe(401);
        });

        it('responde 403 a un usuario con sesión que no es el propietario', async () => {
            getUserMock.mockResolvedValue(usuarioConEmail('visitante@example.com'));
            const next = vi.fn() as unknown as NextFunction;
            const res = respuesta();

            await requireOwner(peticion({ Authorization: 'Bearer token-ajeno' }), res as unknown as Response, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.statusCode).toBe(403);
        });

        it('responde 503 si no puede contactar con Supabase para verificar el token', async () => {
            getUserMock.mockRejectedValue(new Error('fetch failed'));
            const next = vi.fn() as unknown as NextFunction;
            const res = respuesta();
            vi.spyOn(console, 'error').mockImplementation(() => {});

            await requireOwner(peticion({ Authorization: 'Bearer token' }), res as unknown as Response, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.statusCode).toBe(503);
        });
    });
});
