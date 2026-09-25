import type { Offer } from "../types/offer";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function fetchOffers(): Promise<Offer[]> {
    const respuesta = await fetch(`${API_URL}/offers`);
    if (!respuesta.ok) throw new Error(`fetchOffers failed: ${respuesta.status}`);
    const datos = await respuesta.json();
    return datos;
}

export async function updateOfferStatus(id: number, estado?: Offer['estado_candidatura'], notas?: string | null) {
    const body: Record<string, any> = {};
    if (estado !== undefined) body.estado_candidatura = estado;
    if (notas !== undefined) body.notas = notas;
    await fetch(`${API_URL}/offers/${id}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
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

export async function fetchImportJob(jobId: string): Promise<ImportJob> {
    const respuesta = await fetch(`${API_URL}/offers/import-jobs/${encodeURIComponent(jobId)}`);

    if (!respuesta.ok) {
        throw new Error('No se pudo consultar el estado de la importación');
    }

    return respuesta.json();
}

