import { useEffect, useState, useCallback } from 'react';
import type { Offer } from '../types/offer';
import { fetchOffers, updateOfferStatus } from '../api/offers';

export function useOffers() {
    const [error, setError] = useState<string | null>(null);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);

    const recargarOfertas = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const data = await fetchOffers();
            setOffers(data);
        } catch (err: any) {
            console.error("Error cargando ofertas:", err);
            setError(err.message || "Error de conexión con la API");
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        recargarOfertas();
    }, [recargarOfertas]);

    async function actualizarEstadoOferta(id: number, nuevoEstado: Offer['estado_candidatura']) {
        await updateOfferStatus(id, nuevoEstado);
        setOffers(prev => prev.map(oferta => oferta.id === id ? { ...oferta, estado_candidatura: nuevoEstado } : oferta));
    }

    async function actualizarNotasOferta(id: number, notas: string) {
        await updateOfferStatus(id, undefined, notas);
        setOffers(prev => prev.map(oferta => oferta.id === id ? { ...oferta, notas } : oferta));
    }

    return { offers, cargando, error, recargarOfertas, actualizarEstadoOferta, actualizarNotasOferta };
}
