import { useEffect, useState } from 'react';
import type { Offer } from '../types/offer';
import { fetchOffers } from '../api/offers';

export function useOffers() {
    const [offers, setOffers] = useState<Offer[]>([]);
    useEffect(() => { 
        fetchOffers().then(setOffers);
    }, []);
    return offers;
}