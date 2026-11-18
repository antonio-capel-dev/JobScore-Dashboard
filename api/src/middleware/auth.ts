import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { supabase } from "../db/supabaseClient";

export type Solicitante = 'propietario' | 'otro' | 'anonimo';

/**
 * Emails con permiso de escritura (variable OWNER_EMAILS, separados por comas).
 * Si la variable no existe, nadie es propietario: la API falla en cerrado.
 */
function emailsPropietario(): string[] {
    return (process.env.OWNER_EMAILS ?? '')
        .split(',')
        .map(email => email.trim().toLowerCase())
        .filter(Boolean);
}

/**
 * Valida la API key de ingesta (cabecera x-api-key) contra INGEST_API_KEY.
 * Compara en tiempo constante para no filtrar información por timing.
 */
export function apiKeyValida(recibida: string | undefined): boolean {
    const esperada = process.env.INGEST_API_KEY;
    if (!esperada || !recibida) return false;

    const a = Buffer.from(recibida);
    const b = Buffer.from(esperada);
    return a.length === b.length && timingSafeEqual(a, b);
}

function extraerBearer(cabecera: string | undefined): string | null {
    const coincidencia = cabecera?.match(/^Bearer\s+(\S+)$/i);
    return coincidencia ? coincidencia[1] : null;
}

/**
 * Identifica quién hace la petición:
 * - 'propietario': API key de ingesta válida, o token de Supabase de un email de OWNER_EMAILS.
 * - 'otro': token de Supabase válido de cualquier otro usuario.
 * - 'anonimo': sin credenciales, o con credenciales que no son válidas.
 */
export async function identificarSolicitante(req: Request): Promise<Solicitante> {
    if (apiKeyValida(req.get('x-api-key'))) {
        return 'propietario';
    }

    const token = extraerBearer(req.get('authorization'));
    if (!token) {
        return 'anonimo';
    }

    // Supabase Auth valida la firma y la caducidad del token
    const { data, error } = await supabase.auth.getUser(token);
    const email = data?.user?.email?.toLowerCase();
    if (error || !email) {
        return 'anonimo';
    }

    return emailsPropietario().includes(email) ? 'propietario' : 'otro';
}

/** Middleware para las rutas que modifican datos: solo pasa el propietario. */
export async function requireOwner(req: Request, res: Response, next: NextFunction) {
    let solicitante: Solicitante;
    try {
        solicitante = await identificarSolicitante(req);
    } catch (error) {
        console.error('[Auth] Error verificando credenciales:', error);
        return res.status(503).json({ error: 'No se pudo verificar la identidad. Inténtalo de nuevo.' });
    }

    if (solicitante === 'propietario') {
        return next();
    }
    if (solicitante === 'otro') {
        return res.status(403).json({ error: 'Esta cuenta no tiene permiso para modificar datos.' });
    }
    return res.status(401).json({ error: 'Inicia sesión como propietario para modificar datos.' });
}
