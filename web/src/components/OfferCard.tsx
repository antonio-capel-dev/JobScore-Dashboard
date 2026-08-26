import type { Offer } from "../types/offer";

interface OfferCardProps {
    oferta: Offer;
    onCambiarEstado: (id: number, nuevoEstado: Offer['estado_candidatura']) => void;
}

function getScoreBadgeStyle(score: number) {
    if (score >= 70) {
        return {
            gradient: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-200",
            label: "Alta coincidencia",
            bgLight: "bg-emerald-50 text-emerald-700 border-emerald-200"
        };
    }
    if (score >= 40) {
        return {
            gradient: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-200",
            label: "Coincidencia media",
            bgLight: "bg-amber-50 text-amber-700 border-amber-200"
        };
    }
    return {
        gradient: "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-rose-200",
        label: "Baja coincidencia",
        bgLight: "bg-rose-50 text-rose-700 border-rose-200"
    };
}

function getEstadoBadgeStyle(estado: Offer['estado_candidatura']) {
    switch (estado) {
        case 'enviada': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'respuesta': return 'bg-purple-50 text-purple-700 border-purple-200';
        case 'entrevista': return 'bg-amber-50 text-amber-800 border-amber-200';
        case 'oferta': return 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold';
        default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
}

export function OfferCard({ oferta, onCambiarEstado }: OfferCardProps) {
    const scoreStyle = getScoreBadgeStyle(oferta.score);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group">
            
            <div className={`h-1.5 w-full ${scoreStyle.gradient}`} />

            <div className="p-6 space-y-5">
                
                {/* Cabecera */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {oferta.categoria || 'Tech'}
                            </span>
                            
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
                                {oferta.ubicacion} ({oferta.modalidad})
                            </span>

                            {oferta.nivel_ingles && (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-100">
                                    Inglés: {oferta.nivel_ingles}
                                </span>
                            )}
                        </div>

                        <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight pt-1">
                            {oferta.titulo_puesto}
                        </h2>

                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span className="font-semibold text-gray-800">{oferta.empresa}</span>
                            
                            {(oferta.salario_min || oferta.salario_max) && (
                                <>
                                    <span>•</span>
                                    <span className="font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 text-xs">
                                        {oferta.salario_min ? `${oferta.salario_min.toLocaleString()}€` : ''} 
                                        {oferta.salario_min && oferta.salario_max ? ' - ' : ''}
                                        {oferta.salario_max ? `${oferta.salario_max.toLocaleString()}€` : ''} / año
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Score */}
                    <div className="flex flex-col items-end shrink-0">
                        <div className={`px-4 py-2 rounded-2xl font-black text-lg flex items-baseline gap-1 shadow-md ${scoreStyle.gradient}`}>
                            <span className="text-2xl">{oferta.score}</span>
                            <span className="text-xs font-normal opacity-85">/100</span>
                        </div>
                        <span className="text-[11px] font-medium text-gray-400 mt-1">
                            {scoreStyle.label}
                        </span>
                    </div>
                </div>

                {/* Feedback IA */}
                <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 space-y-3">
                    
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        <span>Evaluación de candidatura</span>
                    </div>

                    {/* Tecnologías coincidentes */}
                    {oferta.tecnologias_coincidentes && oferta.tecnologias_coincidentes.length > 0 && (
                        <div className="space-y-1.5">
                            <span className="text-xs font-medium text-slate-500">Coincidencias de perfil:</span>
                            <div className="flex flex-wrap gap-1.5">
                                {oferta.tecnologias_coincidentes.map((tech, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 border border-emerald-200/60 px-2.5 py-1 rounded-lg text-xs font-semibold">
                                        <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Stack de la oferta */}
                    {oferta.stack_tecnologico && oferta.stack_tecnologico.length > 0 && (
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-slate-500">Stack requerido:</span>
                            <div className="flex flex-wrap gap-1 text-xs">
                                {oferta.stack_tecnologico.map((tech, i) => {
                                    const coincide = oferta.tecnologias_coincidentes?.includes(tech);
                                    return (
                                        <span 
                                            key={i} 
                                            className={`px-2 py-0.5 rounded text-[11px] ${
                                                coincide 
                                                    ? 'bg-emerald-100/80 text-emerald-800 font-medium' 
                                                    : 'bg-slate-200/70 text-slate-600'
                                            }`}
                                        >
                                            {tech}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Brecha principal */}
                    {oferta.brecha_principal && (
                        <div className="bg-rose-50/80 border-l-4 border-rose-500 rounded-r-xl p-3 text-xs text-rose-900 space-y-0.5">
                            <span className="font-bold block text-rose-700">
                                Brecha principal:
                            </span>
                            <p className="leading-relaxed">{oferta.brecha_principal}</p>
                        </div>
                    )}

                    {/* Recomendación */}
                    {oferta.recomendacion && (
                        <div className="bg-blue-50/60 border-l-4 border-blue-500 rounded-r-xl p-3 text-xs text-blue-950 italic">
                            <span className="font-bold not-italic text-blue-700 block mb-0.5">Recomendación:</span>
                            "{oferta.recomendacion}"
                        </div>
                    )}
                </div>

                {/* Pie de tarjeta */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
                    
                    {/* Selector de estado */}
                    <div className="flex items-center gap-2">
                        <label className="text-gray-500 font-semibold">Estado:</label>
                        <select
                            value={oferta.estado_candidatura ?? ''}
                            onChange={async (e) => {
                                const nuevoEstado = e.target.value === '' ? null : e.target.value as Offer['estado_candidatura'];
                                await onCambiarEstado(oferta.id, nuevoEstado);
                            }}
                            className={`border rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors ${getEstadoBadgeStyle(oferta.estado_candidatura)}`}
                        >
                            <option value="">Sin postular</option>
                            <option value="enviada">Enviada</option>
                            <option value="respuesta">Respuesta</option>
                            <option value="entrevista">Entrevista</option>
                            <option value="oferta">Oferta</option>
                        </select>
                    </div>

                    {/* Enlace original */}
                    {oferta.url_oferta && (
                        <a
                            href={oferta.url_oferta}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gray-900 text-white font-medium hover:bg-blue-600 transition-colors shadow-sm text-xs"
                        >
                            <span>Ver oferta original</span>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    )}
                </div>

            </div>
        </div>
    );
}
