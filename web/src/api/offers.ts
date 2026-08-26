import type { Offer } from "../types/offer";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function fetchOffers(): Promise<Offer[]> {
    const respuesta = await fetch(`${API_URL}/offers`);
    const datos = await respuesta.json();
    return datos;
}

export async function updateOfferStatus(id: number, estado: Offer['estado_candidatura']) {
    await fetch(`${API_URL}/offers/${id}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estado_candidatura: estado }),
    });
}
