import { useEffect, useState, useCallback } from 'react';
import type { Offer } from '../types/offer';
import { fetchOffers, updateOfferStatus } from '../api/offers';

export function useOffers() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);

    const recargarOfertas = useCallback(async () => {
        setCargando(true);
        try {
            const data = await fetchOffers();
            setOffers(data);
        } catch (error) {
            console.error("Error cargando ofertas:", error);
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

    return { offers, cargando, recargarOfertas, actualizarEstadoOferta };
}
