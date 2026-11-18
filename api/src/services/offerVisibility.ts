type CamposPrivados = 'estado_candidatura' | 'notas';

/**
 * Vista pública de una oferta: oculta el seguimiento personal de la candidatura
 * (fase y notas), que solo debe ver el propietario del dashboard.
 */
export function vistaPublica<T extends object>(oferta: T): Omit<T, CamposPrivados> & Record<CamposPrivados, null> {
    return { ...oferta, estado_candidatura: null, notas: null };
}
