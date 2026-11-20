import type { Offer } from "../types/offer";

// La vista pública enseña el mercado actual: ofertas publicadas en los últimos 30 días
export const DIAS_VENTANA_PUBLICA = 30;

// Despliegue del perfil de scoring actual (IA, datos y Python). Lo puntuado antes usaba el perfil web anterior
export const INICIO_PERFIL_ACTUAL = new Date('2026-11-20T07:36:00Z');

function fechaReferencia(oferta: Offer): number {
    return new Date(oferta.fecha_publicacion || oferta.fecha_scrape || 0).getTime();
}

export function estaEnVentanaPublica(oferta: Offer, ahora: number = Date.now()): boolean {
    const limite = ahora - DIAS_VENTANA_PUBLICA * 24 * 60 * 60 * 1000;
    return fechaReferencia(oferta) >= limite;
}

export function puntuadaConPerfilAnterior(oferta: Offer): boolean {
    if (!oferta.created_at) return true;
    return new Date(oferta.created_at).getTime() < INICIO_PERFIL_ACTUAL.getTime();
}
