import { useEffect, useState, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Offer } from '../types/offer';
import { fetchOffers, updateOfferStatus } from '../api/offers';

export function useOffers(session: Session | null) {
    const [error, setError] = useState<string | null>(null);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);

    // Supabase renueva el token cada hora: lo guardamos en una ref para no recargar las ofertas en cada renovación
    const tokenRef = useRef<string | null>(session?.access_token ?? null);
    const usuarioId = session?.user.id ?? null;

    useEffect(() => {
        tokenRef.current = session?.access_token ?? null;
    }, [session]);

    const recargarOfertas = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const data = await fetchOffers(tokenRef.current);
            setOffers(data);
        } catch (err) {
            console.error("Error cargando ofertas:", err);
            setError(err instanceof Error ? err.message : "Error de conexión con la API");
        } finally {
            setCargando(false);
        }
    }, []);

    // Recarga al entrar o salir de la sesión: el propietario recibe además fases y notas
    useEffect(() => {
        recargarOfertas();
    }, [recargarOfertas, usuarioId]);

    function exigirToken(): string {
        const token = tokenRef.current;
        if (!token) throw new Error('Inicia sesión para modificar tus candidaturas');
        return token;
    }

    async function actualizarEstadoOferta(id: number, nuevoEstado: Offer['estado_candidatura']) {
        await updateOfferStatus(exigirToken(), id, nuevoEstado);
        setOffers(prev => prev.map(oferta => oferta.id === id ? { ...oferta, estado_candidatura: nuevoEstado } : oferta));
    }

    async function actualizarNotasOferta(id: number, notas: string) {
        await updateOfferStatus(exigirToken(), id, undefined, notas);
        setOffers(prev => prev.map(oferta => oferta.id === id ? { ...oferta, notas } : oferta));
    }

    return { offers, cargando, error, recargarOfertas, actualizarEstadoOferta, actualizarNotasOferta };
}
