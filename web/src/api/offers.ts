import type { Offer } from "../types/offer";

export async function fetchOffers(): Promise<Offer[]> {
    const respuesta = await fetch('http://localhost:3000/offers');
    const datos = await respuesta.json();
    return datos;
}