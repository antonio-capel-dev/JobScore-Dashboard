import { useEffect, useState } from 'react';
import type { Offer } from '../types/offer';
import { fetchOffers } from '../api/offers';

export function useOffers() {
    const [offers, setOffers] = useState<Offer[]>([]);
    useEffect(() => {
        fetchOffers().then(setOffers);
    }, []);

    function actualizarEstadoOferta(id: number, nuevoEstado: Offer['estado_candidatura']) {
        setOffers(prev => prev.map(oferta => oferta.id === id ? { ...oferta, estado_candidatura: nuevoEstado } : oferta));

        return { offers, actualizarEstadoOferta };
    }
}

