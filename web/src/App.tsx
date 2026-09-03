import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useEffect, useMemo, useRef } from "react";
import { useOffers } from "./hooks/useOffers";
import { OfferCard } from "./components/OfferCard";
import { AuthModal } from "./components/AuthModal";
import { supabase } from "./api/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import type { Offer } from "./types/offer";

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-100 rounded w-1/2"></div>
        </div>
        <div className="w-16 h-12 bg-gray-200 rounded-2xl"></div>
      </div>
      <div className="h-20 bg-gray-100 rounded-xl"></div>
      <div className="flex justify-between items-center pt-2">
        <div className="h-8 bg-gray-200 rounded-xl w-32"></div>
        <div className="h-8 bg-gray-200 rounded-xl w-36"></div>
      </div>
    </div>
  );
}

function KanbanColumn({ 
  titulo, 
  ofertas, 
  onCambiarEstado, 
  badgeColor 
}: { 
  titulo: string; 
  ofertas: Offer[]; 
  onCambiarEstado: (id: number, nuevoEstado: Offer['estado_candidatura']) => void;
  badgeColor: string;
}) {
  return (
    <div className="bg-slate-50/70 rounded-2xl border border-slate-200/70 p-4 flex flex-col min-h-[450px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${badgeColor}`}></span>
          <h3 className="font-bold text-slate-800 text-sm">{titulo}</h3>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 shadow-2xs">
          {ofertas.length}
        </span>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[700px] pr-1">
        {ofertas.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 font-medium">
            Sin ofertas en esta fase
          </div>
        ) : (
          ofertas.map((oferta) => (
            <div 
              key={oferta.id} 
              className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-2.5"
            >
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs font-bold text-slate-900 leading-tight line-clamp-2">
                  {oferta.titulo_puesto}
                </span>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-black shrink-0 ${
                  oferta.score >= 70 ? 'bg-emerald-100 text-emerald-800' :
                  oferta.score >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {oferta.score}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                <span>{oferta.empresa}</span>
                <span className="capitalize">{oferta.modalidad}</span>
              </div>

              {oferta.brecha_principal && (
                <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 line-clamp-2">
                  <strong className="text-slate-700">Brecha:</strong> {oferta.brecha_principal}
                </p>
              )}

              <div className="pt-1 flex items-center justify-between gap-1 border-t border-slate-100 text-[11px]">
                <select
                  value={oferta.estado_candidatura ?? ''}
                  onChange={(e) => {
                    const nuevo = e.target.value === '' ? null : e.target.value as Offer['estado_candidatura'];
                    onCambiarEstado(oferta.id, nuevo);
                  }}
                  className="px-2 py-1 border border-slate-200 rounded-lg text-[11px] font-semibold bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Sin postular</option>
                  <option value="enviada">Enviada</option>
                  <option value="respuesta">Respuesta</option>
                  <option value="entrevista">Entrevista</option>
                  <option value="oferta">Oferta</option>
                </select>

                <a 
                  href={oferta.url_oferta} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-0.5"
                >
                  Ver ↗
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function App() {
  const { offers: ofertas, cargando, recargarOfertas, actualizarEstadoOferta } = useOffers();
  const [session, setSession] = useState<Session | null>(null);
  
  // Filtros
  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [modalidadSeleccionada, setModalidadSeleccionada] = useState('todas');
  const [fuenteSeleccionada, setFuenteSeleccionada] = useState('todas');
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('todos');
  const [scoreMinimo, setScoreMinimo] = useState(0);
  const [ordenSeleccionado, setOrdenSeleccionado] = useState<'recientes' | 'score' | 'antiguas'>('recientes');
  const [vistaActual, setVistaActual] = useState<'lista' | 'kanban'>('lista');

  // Estado para subida directa de CSV
  const [subiendoCsv, setSubiendoCsv] = useState(false);
  const [mensajeSubida, setMensajeSubida] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSubiendoCsv(true);
      setMensajeSubida(null);
      const csvText = await file.text();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const res = await fetch(`${apiUrl}/offers/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al procesar el archivo CSV');
      }

      const data = await res.json();
      setMensajeSubida(`${data.mensaje} Las ofertas irán apareciendo en unos segundos.`);

      // Auto-recarga cada 10 segundos durante 3 minutos para ir mostrando las ofertas nuevas
      const intervalo = setInterval(async () => {
        await recargarOfertas();
      }, 10000);
      setTimeout(() => {
        clearInterval(intervalo);
        recargarOfertas();
        setMensajeSubida(null);
      }, 180000);

    } catch (err: any) {
      alert(`Error procesando el archivo CSV: ${err.message}`);
    } finally {
      setSubiendoCsv(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Escuchar el estado de autenticación
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Métricas calculadas (KPIs)
  const estadisticas = useMemo(() => {
    const total = ofertas.length;
    const topMatches = ofertas.filter(o => o.score >= 75).length;
    const postuladas = ofertas.filter(o => o.estado_candidatura !== null && o.estado_candidatura !== undefined).length;
    const enEntrevista = ofertas.filter(o => o.estado_candidatura === 'entrevista' || o.estado_candidatura === 'oferta').length;
    
    // Calcular salario medio anual de las ofertas que lo incluyen
    const conSalario = ofertas.filter(o => o.salario_min || o.salario_max);
    let salarioPromedio = 0;
    if (conSalario.length > 0) {
      const suma = conSalario.reduce((acc, curr) => {
        const min = curr.salario_min || curr.salario_max || 0;
        const max = curr.salario_max || curr.salario_min || 0;
        return acc + (min + max) / 2;
      }, 0);
      salarioPromedio = Math.round(suma / conSalario.length);
    }

    return { total, topMatches, postuladas, enEntrevista, salarioPromedio };
  }, [ofertas]);

  // Fuentes únicas disponibles en el conjunto actual de ofertas
  const fuentesDisponibles = useMemo(() => {
    const setFuentes = new Set<string>();
    ofertas.forEach(o => {
      if (o.fuente) setFuentes.add(o.fuente);
    });
    return ['todas', ...Array.from(setFuentes)];
  }, [ofertas]);

  // Filtrado y Ordenación de ofertas
  const ofertasFiltradas = useMemo(() => {
    const q = busquedaTexto.toLowerCase().trim();

    const filtradas = ofertas.filter((oferta) => {
      // Filtro Modalidad
      const matchModalidad = modalidadSeleccionada === 'todas' || oferta.modalidad === modalidadSeleccionada;

      // Filtro Fuente
      const matchFuente = fuenteSeleccionada === 'todas' || (oferta.fuente || '').toLowerCase() === fuenteSeleccionada.toLowerCase();
      
      // Filtro Score
      const matchScore = oferta.score >= scoreMinimo;
      
      // Filtro Estado
      const matchEstado = 
        estadoSeleccionado === 'todos' ? true :
        estadoSeleccionado === 'sin_postular' ? !oferta.estado_candidatura :
        oferta.estado_candidatura === estadoSeleccionado;

      // Filtro Texto (busca en título, empresa, ubicación y tecnologías del stack)
      const matchTexto = !q || (
        oferta.titulo_puesto.toLowerCase().includes(q) ||
        oferta.empresa.toLowerCase().includes(q) ||
        oferta.ubicacion.toLowerCase().includes(q) ||
        oferta.stack_tecnologico.some(t => t.toLowerCase().includes(q))
      );

      return matchModalidad && matchFuente && matchScore && matchEstado && matchTexto;
    });

    return filtradas.sort((a, b) => {
      if (ordenSeleccionado === 'score') {
        return b.score - a.score;
      }
      if (ordenSeleccionado === 'antiguas') {
        return new Date(a.fecha_publicacion || a.fecha_scrape || 0).getTime() - new Date(b.fecha_publicacion || b.fecha_scrape || 0).getTime();
      }
      // 'recientes' por defecto (más nuevas arriba)
      return new Date(b.fecha_publicacion || b.fecha_scrape || 0).getTime() - new Date(a.fecha_publicacion || a.fecha_scrape || 0).getTime();
    });
  }, [ofertas, busquedaTexto, modalidadSeleccionada, fuenteSeleccionada, estadoSeleccionado, scoreMinimo, ordenSeleccionado]);

  // Datos para gráficas
  const datosModalidad = [
    { modalidad: 'Remoto', cantidad: ofertas.filter(oferta => oferta.modalidad === 'remoto').length },
    { modalidad: 'Híbrido', cantidad: ofertas.filter(oferta => oferta.modalidad === 'hibrido').length },
    { modalidad: 'Presencial', cantidad: ofertas.filter(oferta => oferta.modalidad === 'presencial').length },
    { modalidad: 'No espec.', cantidad: ofertas.filter(oferta => oferta.modalidad === 'no especificado' || !oferta.modalidad).length },
  ];

  const datosEmbudo = [
    { fase: 'Enviada', cantidad: ofertas.filter(oferta => oferta.estado_candidatura === 'enviada').length },
    { fase: 'Respuesta', cantidad: ofertas.filter(oferta => oferta.estado_candidatura === 'respuesta').length },
    { fase: 'Entrevista', cantidad: ofertas.filter(oferta => oferta.estado_candidatura === 'entrevista').length },
    { fase: 'Oferta', cantidad: ofertas.filter(oferta => oferta.estado_candidatura === 'oferta').length }
  ];

  const restablecerFiltros = () => {
    setBusquedaTexto('');
    setModalidadSeleccionada('todas');
    setFuenteSeleccionada('todas');
    setEstadoSeleccionado('todos');
    setScoreMinimo(0);
    setOrdenSeleccionado('recientes');
  };

  // Si no está autenticado, mostramos la pantalla de login
  if (!session) {
    return <AuthModal />;
  }

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 md:p-8 text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 1. Header Ejecutivo */}
        <header className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-blue-200">
                AC
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Buscador de Empleo de Antonio Capel
                </h1>
                <p className="text-xs font-medium text-slate-500">
                  Panel de Análisis y Seguimiento de Candidaturas Tech
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Input oculto y botón para subir CSV directamente */}
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              onChange={handleSubirArchivo} 
              className="hidden" 
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={subiendoCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs disabled:opacity-50"
              title="Selecciona un archivo CSV de ofertas desde tu ordenador"
            >
              <svg className={`w-3.5 h-3.5 ${subiendoCsv ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>{subiendoCsv ? 'Procesando ofertas...' : '📁 Subir CSV'}</span>
            </button>

            <button
              onClick={() => recargarOfertas()}
              disabled={cargando}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors disabled:opacity-50"
              title="Actualizar datos desde la API"
            >
              <svg className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{cargando ? 'Cargando...' : 'Sincronizar'}</span>
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Candidato</span>
              <span className="text-xs font-bold text-slate-700">{session.user.email}</span>
            </div>

            <button
              onClick={() => supabase.auth.signOut()}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors border border-rose-100"
            >
              Salir
            </button>
          </div>
        </header>

        {/* Banner de confirmación de subida */}
        {mensajeSubida && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-2xs">
            <span>{mensajeSubida}</span>
            <button 
              onClick={() => setMensajeSubida(null)}
              className="text-emerald-600 hover:text-emerald-900 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* 2. Tarjetas de KPIs / Métricas Clave */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Ofertas</span>
            <div className="text-3xl font-black text-slate-900">{estadisticas.total}</div>
            <p className="text-[11px] text-slate-500">Extraídas y evaluadas con IA</p>
          </div>

          <div 
            onClick={() => setScoreMinimo(75)}
            className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-xs space-y-1 cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all group"
            title="Haz clic para filtrar solo las mejores"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Top Match (≥75)</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded group-hover:bg-emerald-600 group-hover:text-white transition-colors">Filtrar</span>
            </div>
            <div className="text-3xl font-black text-emerald-600">{estadisticas.topMatches}</div>
            <p className="text-[11px] text-slate-500">Alta afinidad con tu perfil</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-blue-200/80 shadow-xs space-y-1">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Postulaciones</span>
            <div className="text-3xl font-black text-blue-600">{estadisticas.postuladas}</div>
            <p className="text-[11px] text-slate-500">{estadisticas.enEntrevista} en fases avanzadas</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Salario Promedio</span>
            <div className="text-3xl font-black text-slate-900">
              {estadisticas.salarioPromedio > 0 ? `${estadisticas.salarioPromedio.toLocaleString()}€` : 'N/A'}
            </div>
            <p className="text-[11px] text-slate-500">Media del mercado detectada</p>
          </div>
        </section>

        {/* 3. Barra de Control y Filtros Inteligentes */}
        <section className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            
            {/* Buscador de Texto Libre */}
            <div className="relative flex-1">
              <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por puesto, empresa, stack (ej. React, Python) o ciudad..."
                value={busquedaTexto}
                onChange={(e) => setBusquedaTexto(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              />
              {busquedaTexto && (
                <button 
                  onClick={() => setBusquedaTexto('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Selector de Vistas: Lista vs Tablero */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start lg:self-auto">
              <button
                onClick={() => setVistaActual('lista')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  vistaActual === 'lista'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                ≡ Lista Detallada
              </button>
              <button
                onClick={() => setVistaActual('kanban')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  vistaActual === 'kanban'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                ▦ Tablero Embudo
              </button>
            </div>

          </div>

          {/* Segunda fila de filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 pt-2 border-t border-slate-100 items-end">
            
            {/* Modalidad */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Modalidad</label>
              <select 
                value={modalidadSeleccionada} 
                onChange={(e) => setModalidadSeleccionada(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todas">Todas las modalidades</option>
                <option value="remoto">100% Remoto</option>
                <option value="hibrido">Híbrido</option>
                <option value="presencial">Presencial</option>
                <option value="no especificado">No especificado</option>
              </select>
            </div>

            {/* Fuente del Portal */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Fuente</label>
              <select 
                value={fuenteSeleccionada} 
                onChange={(e) => setFuenteSeleccionada(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todas">Todas las fuentes</option>
                {fuentesDisponibles.filter(f => f !== 'todas').map(fuente => (
                  <option key={fuente} value={fuente}>{fuente}</option>
                ))}
              </select>
            </div>

            {/* Estado de Candidatura */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Fase</label>
              <select 
                value={estadoSeleccionado} 
                onChange={(e) => setEstadoSeleccionado(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos los estados</option>
                <option value="sin_postular">Sin postular</option>
                <option value="enviada">Enviada</option>
                <option value="respuesta">Con Respuesta</option>
                <option value="entrevista">En Entrevista</option>
                <option value="oferta">Oferta Recibida</option>
              </select>
            </div>

            {/* Ordenación */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Ordenar por</label>
              <select 
                value={ordenSeleccionado} 
                onChange={(e) => setOrdenSeleccionado(e.target.value as 'recientes' | 'score' | 'antiguas')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="recientes">📅 Más recientes</option>
                <option value="score">⭐ Mayor Score</option>
                <option value="antiguas">⏳ Más antiguas</option>
              </select>
            </div>

            {/* Score Mínimo */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <label className="font-bold text-slate-500 uppercase">Score mín.</label>
                <span className={`font-black px-2 py-0.5 rounded text-xs ${
                  scoreMinimo >= 75 ? 'bg-emerald-100 text-emerald-800' :
                  scoreMinimo >= 45 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  {scoreMinimo} pts
                </span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={scoreMinimo} 
                onChange={(e) => setScoreMinimo(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
            </div>

            {/* Botón Restablecer */}
            <div>
              <button
                onClick={restablecerFiltros}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs transition-colors"
              >
                ↺ Restablecer
              </button>
            </div>

          </div>
        </section>

        {/* 4. Gráficas de Análisis (Colapsables / Responsive) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Distribución por Modalidad
            </h2>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosModalidad} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="modalidad" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Bar dataKey="cantidad" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Embudo de Candidaturas Activas
            </h2>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosEmbudo} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="fase" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Bar dataKey="cantidad" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* 5. Contenido Principal: Lista Detallada o Tablero Embudo */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{vistaActual === 'lista' ? 'Listado de Ofertas' : 'Tablero de Candidaturas'}</span>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {ofertasFiltradas.length} encontradas
              </span>
            </h2>
          </div>

          {cargando ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : vistaActual === 'lista' ? (
            <div className="space-y-4">
              {ofertasFiltradas.length > 0 ? (
                ofertasFiltradas.map((oferta) => (
                  <OfferCard 
                    key={oferta.id} 
                    oferta={oferta} 
                    onCambiarEstado={actualizarEstadoOferta}
                  />
                ))
              ) : (
                <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-500 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-xl">
                    🔍
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">No hay ofertas que coincidan con estos filtros</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Prueba a reducir el score mínimo o restablecer los términos de búsqueda.
                  </p>
                  <button
                    onClick={restablecerFiltros}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                  >
                    Ver todas las ofertas
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Vista Tablero Kanban */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KanbanColumn 
                titulo="Sin postular" 
                ofertas={ofertasFiltradas.filter(o => !o.estado_candidatura)} 
                onCambiarEstado={actualizarEstadoOferta}
                badgeColor="bg-slate-400"
              />
              <KanbanColumn 
                titulo="Enviadas" 
                ofertas={ofertasFiltradas.filter(o => o.estado_candidatura === 'enviada')} 
                onCambiarEstado={actualizarEstadoOferta}
                badgeColor="bg-blue-500"
              />
              <KanbanColumn 
                titulo="Con Respuesta / Entrevista" 
                ofertas={ofertasFiltradas.filter(o => o.estado_candidatura === 'respuesta' || o.estado_candidatura === 'entrevista')} 
                onCambiarEstado={actualizarEstadoOferta}
                badgeColor="bg-purple-500"
              />
              <KanbanColumn 
                titulo="Oferta Recibida" 
                ofertas={ofertasFiltradas.filter(o => o.estado_candidatura === 'oferta')} 
                onCambiarEstado={actualizarEstadoOferta}
                badgeColor="bg-emerald-500"
              />
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

export default App;
