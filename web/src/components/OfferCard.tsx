import { useState } from "react";
import type { Offer } from "../types/offer";

interface OfferCardProps {
    oferta: Offer;
    onCambiarEstado: (id: number, nuevoEstado: Offer['estado_candidatura']) => void;
}

function formatearFecha(fecha: string | null | undefined): string {
    if (!fecha) return '—';
    try {
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return fecha;
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return fecha;
    }
}

function diasDesde(fecha: string | null | undefined): string {
    if (!fecha) return '';
    try {
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return '';
        const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 0) return 'hoy';
        if (diff === 1) return 'ayer';
        return `hace ${diff}d`;
    } catch {
        return '';
    }
}

function scoreColor(score: number) {
    if (score >= 75) return { bg: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200' };
    if (score >= 45) return { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50', border: 'border-amber-200' };
    return { bg: 'bg-slate-400', text: 'text-slate-500', light: 'bg-slate-50', border: 'border-slate-200' };
}

function estadoStyle(estado: Offer['estado_candidatura']) {
    switch (estado) {
        case 'enviada': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'respuesta': return 'bg-violet-50 text-violet-700 border-violet-200';
        case 'entrevista': return 'bg-amber-50 text-amber-800 border-amber-200';
        case 'oferta': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
        default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
}

export function OfferCard({ oferta, onCambiarEstado }: OfferCardProps) {
    const sc = scoreColor(oferta.score);
    const [expandido, setExpandido] = useState(false);

    return (
        <article className="bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all group">
            {/* Fila Principal — siempre visible */}
            <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">

                {/* Score compacto */}
                <div className={`w-14 h-14 ${sc.bg} rounded-xl flex flex-col items-center justify-center text-white shrink-0`}>
                    <span className="text-xl font-black leading-none">{oferta.score}</span>
                    <span className="text-[9px] font-medium opacity-75">pts</span>
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1 group-hover:text-blue-700 transition-colors">
                            {oferta.titulo_puesto}
                        </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{oferta.empresa}</span>
                        <span>{oferta.ubicacion}</span>
                        <span className="capitalize">{oferta.modalidad}</span>
                        {(oferta.salario_min || oferta.salario_max) && (
                            <span className="text-emerald-700 font-semibold">
                                {oferta.salario_min ? `${oferta.salario_min.toLocaleString()}€` : ''}
                                {oferta.salario_min && oferta.salario_max ? ' – ' : ''}
                                {oferta.salario_max ? `${oferta.salario_max.toLocaleString()}€` : ''}
                            </span>
                        )}
                    </div>

                    {/* Fechas — la parte clave que pediste */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-0.5">
                        <span title="Fecha de publicación de la oferta">
                            Publicada: <strong className="text-slate-600">{formatearFecha(oferta.fecha_publicacion)}</strong>
                            {' '}
                            <span className="text-slate-400">({diasDesde(oferta.fecha_publicacion)})</span>
                        </span>
                        <span title="Fecha en que el scraper extrajo esta oferta">
                            Extraída: <strong className="text-slate-600">{formatearFecha(oferta.fecha_scrape)}</strong>
                        </span>
                        {oferta.fuente && (
                            <span className="text-slate-400">
                                Fuente: <strong className="text-slate-500">{oferta.fuente}</strong>
                            </span>
                        )}
                    </div>
                </div>

                {/* Controles a la derecha */}
                <div className="flex items-center gap-3 shrink-0">
                    {/* Selector de estado */}
                    <select
                        value={oferta.estado_candidatura ?? ''}
                        onChange={async (e) => {
                            const nuevo = e.target.value === '' ? null : e.target.value as Offer['estado_candidatura'];
                            await onCambiarEstado(oferta.id, nuevo);
                        }}
                        className={`border rounded-lg px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${estadoStyle(oferta.estado_candidatura)}`}
                    >
                        <option value="">Sin postular</option>
                        <option value="enviada">Enviada</option>
                        <option value="respuesta">Respuesta</option>
                        <option value="entrevista">Entrevista</option>
                        <option value="oferta">Oferta</option>
                    </select>

                    {/* Expandir/colapsar detalle IA */}
                    <button
                        onClick={() => setExpandido(!expandido)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                        title={expandido ? 'Ocultar análisis IA' : 'Ver análisis IA'}
                    >
                        {expandido ? '▲ Menos' : '▼ Detalle IA'}
                    </button>

                    {/* Ver oferta */}
                    {oferta.url_oferta && (
                        <a
                            href={oferta.url_oferta}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-blue-600 transition-colors"
                        >
                            Abrir ↗
                        </a>
                    )}
                </div>
            </div>

            {/* Panel expandible — Análisis IA */}
            {expandido && (
                <div className="px-5 pb-5 pt-0 space-y-3 border-t border-slate-100">
                    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">

                        {/* Stack tecnológico */}
                        {oferta.stack_tecnologico && oferta.stack_tecnologico.length > 0 && (
                            <div className="space-y-1.5">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Stack requerido</span>
                                <div className="flex flex-wrap gap-1">
                                    {oferta.stack_tecnologico.map((tech, i) => {
                                        const coincide = oferta.tecnologias_coincidentes?.includes(tech);
                                        return (
                                            <span 
                                                key={i} 
                                                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                                    coincide 
                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}
                                            >
                                                {coincide && '✓ '}{tech}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Metadata adicional */}
                        <div className="space-y-2 text-xs">
                            {oferta.nivel_ingles && oferta.nivel_ingles !== 'no especificado' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 w-16">Inglés:</span>
                                    <span className="font-semibold text-slate-700">{oferta.nivel_ingles}</span>
                                </div>
                            )}
                            {oferta.experiencia_requerida && (
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 w-16">Exp.:</span>
                                    <span className="font-semibold text-slate-700">{oferta.experiencia_requerida}</span>
                                </div>
                            )}
                            {oferta.categoria && (
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 w-16">Área:</span>
                                    <span className="font-semibold text-slate-700">{oferta.categoria}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Brecha y Recomendación */}
                    {(oferta.brecha_principal || oferta.recomendacion) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            {oferta.brecha_principal && (
                                <div className="bg-rose-50/60 border border-rose-100 rounded-lg p-3 text-xs text-rose-900">
                                    <span className="font-bold text-rose-700 text-[11px] uppercase tracking-wider block mb-1">Brecha principal</span>
                                    <p className="leading-relaxed">{oferta.brecha_principal}</p>
                                </div>
                            )}
                            {oferta.recomendacion && (
                                <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-3 text-xs text-blue-900">
                                    <span className="font-bold text-blue-700 text-[11px] uppercase tracking-wider block mb-1">Recomendación IA</span>
                                    <p className="leading-relaxed">{oferta.recomendacion}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}
