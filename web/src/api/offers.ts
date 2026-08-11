import type { Offer } from "../types/offer";

export async function fetchOffers(): Promise<Offer[]> {
    const respuesta = await fetch('http://localhost:3000/offers');
    const datos = await respuesta.json();
    return datos;
}

export async function updateOfferStatus(id:number, estado:string|null): Promise<void> {
    await fetch(`http://localhost:3000/offers/${id}/status`, {
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({estado_candidatura: estado})
    })
}