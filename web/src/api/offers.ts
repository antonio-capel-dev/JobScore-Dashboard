import type { Offer } from "../types/offer";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Las escrituras van firmadas con el token de Supabase del propietario; la lectura funciona también sin él
function cabeceras(token?: string | null, extra: Record<string, string> = {}): Record<string, string> {
    return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

async function lanzarSiFalla(respuesta: Response, contexto: string) {
    if (respuesta.ok) return;
    const datos = await respuesta.json().catch(() => ({}));
    throw new Error(datos.error || `${contexto} (HTTP ${respuesta.status})`);
}

export async function fetchOffers(token?: string | null): Promise<Offer[]> {
    const respuesta = await fetch(`${API_URL}/offers`, { headers: cabeceras(token) });
    await lanzarSiFalla(respuesta, 'No se pudieron cargar las ofertas');
    return respuesta.json();
}

export async function updateOfferStatus(token: string, id: number, estado?: Offer['estado_candidatura'], notas?: string | null) {
    const body: Record<string, unknown> = {};
    if (estado !== undefined) body.estado_candidatura = estado;
    if (notas !== undefined) body.notas = notas;
    const respuesta = await fetch(`${API_URL}/offers/${id}/status`, {
        method: 'PATCH',
        headers: cabeceras(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
    });
    await lanzarSiFalla(respuesta, 'No se pudo guardar el cambio');
}

export interface UploadResult {
    jobId: string;
    mensaje: string;
    total: number;
}

export async function uploadOffersCsv(token: string, csvText: string): Promise<UploadResult> {
    const respuesta = await fetch(`${API_URL}/offers/upload`, {
        method: 'POST',
        headers: cabeceras(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ csvText }),
    });
    await lanzarSiFalla(respuesta, 'Error al procesar el archivo CSV');
    return respuesta.json();
}

export interface ImportJob {
    status: 'processing' | 'completed' | 'failed';
    total: number;
    saved: number;
    duplicates: number;
    discarded: number;
    errors: number;
    message: string;
}

export async function fetchImportJob(token: string, jobId: string): Promise<ImportJob> {
    const respuesta = await fetch(`${API_URL}/offers/import-jobs/${encodeURIComponent(jobId)}`, {
        headers: cabeceras(token),
    });
    await lanzarSiFalla(respuesta, 'No se pudo consultar el estado de la importación');
    return respuesta.json();
}
