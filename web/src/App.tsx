import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useEffect, useMemo, useRef } from "react";
import { useOffers } from "./hooks/useOffers";
import { OfferCard } from "./components/OfferCard";
import { AuthModal } from "./components/AuthModal";
import { supabase } from "./api/supabaseClient";
import { uploadOffersCsv } from "./api/offers";
import type { Session } from "@supabase/supabase-js";
import type { Offer } from "./types/offer";
import { DIAS_VENTANA_PUBLICA, estaEnVentanaPublica } from "./utils/vistaPublica";

const MIN_OFERTAS_CON_SALARIO = 5;

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

const REPO_URL = 'https://github.com/antonio-capel-dev/JobScore-Dashboard';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const { offers: todasLasOfertas, cargando, error, recargarOfertas, actualizarEstadoOferta, actualizarNotasOferta } = useOffers(session);

  // Con sesión se muestran los controles de edición; la API comprueba además que sea el propietario
  const puedeEditar = session !== null;

  // La vista pública enseña el mercado actual (últimos 30 días); el histórico se abre a petición.
  // El propietario ve siempre todo, porque sigue candidaturas antiguas.
  const [verHistorico, setVerHistorico] = useState(false);
  const ofertasRecientes = useMemo(
    () => todasLasOfertas.filter(o => estaEnVentanaPublica(o)),
    [todasLasOfertas]
  );
  const ofertas = puedeEditar || verHistorico ? todasLasOfertas : ofertasRecientes;
  const ofertasHistoricas = todasLasOfertas.length - ofertasRecientes.length;

  // Primera carga sin datos: el backend gratuito de Render puede estar dormido
  const arrancandoServidor = cargando && todasLasOfertas.length === 0;
  const kpi = (valor: string | number) => (arrancandoServidor ? '—' : valor);

  // Filtros
  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [modalidadSeleccionada, setModalidadSeleccionada] = useState('todas');
  const [fuenteSeleccionada, setFuenteSeleccionada] = useState('todas');
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('todos');
  const [scoreMinimo, setScoreMinimo] = useState(0);
  // null = el visitante aún no ha elegido orden: el público ve primero las mejores y el propietario las más recientes
  const [ordenSeleccionado, setOrdenSeleccionado] = useState<'recientes' | 'score' | 'antiguas' | null>(null);
  const [vistaActual, setVistaActual] = useState<'lista' | 'kanban'>('lista');

  // Estado para subida directa de CSV
  const [subiendoCsv, setSubiendoCsv] = useState(false);
  const [mensajeSubida, setMensajeSubida] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!session) throw new Error('Inicia sesión para subir ofertas');
      setSubiendoCsv(true);
      setMensajeSubida(null);
      const csvText = await file.text();
      const data = await uploadOffersCsv(session.access_token, csvText);
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

    } catch (err) {
      alert(`Error procesando el archivo CSV: ${err instanceof Error ? err.message : String(err)}`);
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
      // Al iniciar sesión se cierra el formulario de acceso
      if (session) setMostrarLogin(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Si la API rechaza un cambio (sesión caducada o cuenta sin permiso), se avisa y no se aplica
  const cambiarEstado = async (id: number, nuevoEstado: Offer['estado_candidatura']) => {
    try {
      await actualizarEstadoOferta(id, nuevoEstado);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo guardar el cambio');
    }
  };

  const guardarNotas = async (id: number, notas: string) => {
    try {
      await actualizarNotasOferta(id, notas);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudieron guardar las notas');
    }
  };

  // Métricas calculadas (KPIs)
  const estadisticas = useMemo(() => {
    const total = ofertas.length;
    const topMatches = ofertas.filter(o => o.score >= 75).length;
    const remotas = ofertas.filter(o => o.modalidad === 'remoto').length;
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
    const ofertasConSalario = conSalario.length;

    return { total, topMatches, remotas, postuladas, enEntrevista, salarioPromedio, ofertasConSalario };
  }, [ofertas]);

  // Fuentes únicas disponibles en el conjunto actual de ofertas
  const fuentesDisponibles = useMemo(() => {
    const setFuentes = new Set<string>();
    ofertas.forEach(o => {
      if (o.fuente) setFuentes.add(o.fuente);
    });
    return ['todas', ...Array.from(setFuentes)];
  }, [ofertas]);

  // En la vista pública no hay fases que filtrar
  const estadoEfectivo = puedeEditar ? estadoSeleccionado : 'todos';
  const ordenEfectivo = ordenSeleccionado ?? (puedeEditar ? 'recientes' : 'score');

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
        estadoEfectivo === 'todos' ? true :
        estadoEfectivo === 'sin_postular' ? !oferta.estado_candidatura :
        oferta.estado_candidatura === estadoEfectivo;

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
      if (ordenEfectivo === 'score') {
        return b.score - a.score;
      }
      if (ordenEfectivo === 'antiguas') {
        return new Date(a.fecha_publicacion || a.fecha_scrape || 0).getTime() - new Date(b.fecha_publicacion || b.fecha_scrape || 0).getTime();
      }
      // 'recientes' por defecto (más nuevas arriba)
      return new Date(b.fecha_publicacion || b.fecha_scrape || 0).getTime() - new Date(a.fecha_publicacion || a.fecha_scrape || 0).getTime();
    });
  }, [ofertas, busquedaTexto, modalidadSeleccionada, fuenteSeleccionada, estadoEfectivo, scoreMinimo, ordenEfectivo]);

  // Función para exportar las candidaturas actuales a CSV descargable
  const exportarCsv = () => {
    const cabeceras = ['Puesto', 'Empresa', 'Score', 'Fase', 'Modalidad', 'Ubicación', 'Salario', 'Notas', 'Enlace'];
    const filas = ofertasFiltradas.map(o => [
      `"${(o.titulo_puesto || '').replace(/"/g, '""')}"`,
      `"${(o.empresa || '').replace(/"/g, '""')}"`,
      o.score,
      o.estado_candidatura || 'Sin postular',
      o.modalidad,
      `"${(o.ubicacion || '').replace(/"/g, '""')}"`,
      `"${o.salario_min ? `${o.salario_min}€` : ''}${o.salario_min && o.salario_max ? ' - ' : ''}${o.salario_max ? `${o.salario_max}€` : ''}"`,
      `"${(o.notas || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${o.url_oferta || ''}"`
    ]);

    const contenidoCsv = [cabeceras.join(','), ...filas.map(f => f.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + contenidoCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${puedeEditar ? 'mis_candidaturas' : 'ofertas_jobscore'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  // Vista pública: reparto de las ofertas según la puntuación de la IA
  const datosScore = [
    { tramo: '< 45', cantidad: ofertas.filter(oferta => oferta.score < 45).length },
    { tramo: '45–74', cantidad: ofertas.filter(oferta => oferta.score >= 45 && oferta.score < 75).length },
    { tramo: '≥ 75', cantidad: ofertas.filter(oferta => oferta.score >= 75).length },
  ];

  // El tablero Kanban es seguimiento personal: solo con sesión
  const vista = puedeEditar ? vistaActual : 'lista';

  // Con menos de 5 salarios publicados la media no es representativa
  const muestraSalarioSuficiente = estadisticas.ofertasConSalario >= MIN_OFERTAS_CON_SALARIO;

  const restablecerFiltros = () => {
    setBusquedaTexto('');
    setModalidadSeleccionada('todas');
    setFuenteSeleccionada('todas');
    setEstadoSeleccionado('todos');
    setScoreMinimo(0);
    setOrdenSeleccionado(null);
  };

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
            {puedeEditar && (
              <>
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
              </>
            )}

            <button
              onClick={exportarCsv}
              disabled={ofertasFiltradas.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition-colors border border-emerald-200 disabled:opacity-50"
              title="Descargar las ofertas actuales con sus notas en formato CSV"
            >
              <span>📥 Exportar CSV</span>
            </button>

            {/* Recargar a mano es una herramienta del propietario: el público ya recibe los datos al entrar */}
            {puedeEditar && (
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
            )}

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            {session ? (
              <>
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
              </>
            ) : (
              <button
                onClick={() => setMostrarLogin(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
              >
                Iniciar sesión
              </button>
            )}
          </div>
        </header>

        {/* Aviso de la vista pública */}
        {!puedeEditar && (
          <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-2xl text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
            <span>
              <strong>Vista pública de solo lectura.</strong> Las ofertas se extraen y se puntúan con IA cada día; el seguimiento de candidaturas y las notas son privados.{' '}
              {verHistorico
                ? 'Estás viendo también el histórico.'
                : `Se muestran las publicadas en los últimos ${DIAS_VENTANA_PUBLICA} días.`}
            </span>
            <div className="flex items-center gap-4 shrink-0">
              {ofertasHistoricas > 0 && (
                <button
                  onClick={() => setVerHistorico(v => !v)}
                  className="font-bold text-blue-700 hover:text-blue-900"
                >
                  {verHistorico ? 'Ver solo las recientes' : `Ver histórico (${ofertasHistoricas})`}
                </button>
              )}
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-blue-700 hover:text-blue-900"
              >
                Ver el código en GitHub ↗
              </a>
            </div>
          </div>
        )}

        {/* Arranque en frío del backend gratuito: mejor explicarlo que enseñar ceros */}
        {arrancandoServidor && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl text-xs font-medium shadow-2xs flex items-center gap-2">
            <svg className="w-3.5 h-3.5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>
              <strong>Despertando el servidor…</strong> La API está en el plan gratuito de Render y se duerme cuando no tiene uso: la primera carga puede tardar hasta un minuto.
            </span>
          </div>
        )}

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
            <div className="text-3xl font-black text-slate-900">{kpi(estadisticas.total)}</div>
            <p className="text-[11px] text-slate-500">
              {puedeEditar || verHistorico ? 'Extraídas y evaluadas con IA' : `Publicadas en los últimos ${DIAS_VENTANA_PUBLICA} días`}
            </p>
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
            <div className="text-3xl font-black text-emerald-600">{kpi(estadisticas.topMatches)}</div>
            <p className="text-[11px] text-slate-500">{puedeEditar ? 'Alta afinidad con tu perfil' : 'Alta afinidad con el perfil del candidato'}</p>
          </div>

          {puedeEditar ? (
            <div className="bg-white p-5 rounded-2xl border border-blue-200/80 shadow-xs space-y-1">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Postulaciones</span>
              <div className="text-3xl font-black text-blue-600">{kpi(estadisticas.postuladas)}</div>
              <p className="text-[11px] text-slate-500">{estadisticas.enEntrevista} en fases avanzadas</p>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-2xl border border-blue-200/80 shadow-xs space-y-1">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">En remoto</span>
              <div className="text-3xl font-black text-blue-600">{kpi(estadisticas.remotas)}</div>
              <p className="text-[11px] text-slate-500">Ofertas 100% remotas</p>
            </div>
          )}

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Salario medio</span>
            <div className="text-3xl font-black text-slate-900">
              {kpi(muestraSalarioSuficiente && estadisticas.salarioPromedio > 0 ? `${estadisticas.salarioPromedio.toLocaleString('es-ES')}€` : '—')}
            </div>
            <p className="text-[11px] text-slate-500">
              {estadisticas.ofertasConSalario === 0
                ? 'Ninguna oferta publica salario'
                : !muestraSalarioSuficiente
                  ? `Muestra insuficiente: ${estadisticas.ofertasConSalario} ${estadisticas.ofertasConSalario === 1 ? 'oferta publica' : 'ofertas publican'} salario`
                  : `De ${estadisticas.ofertasConSalario} ofertas que publican salario${estadisticas.ofertasConSalario < 10 ? ' (muestra pequeña)' : ''}`}
            </p>
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

            {/* Selector de Vistas: Lista vs Tablero (el tablero es seguimiento personal) */}
            {puedeEditar && (
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
            )}

          </div>

          {/* Segunda fila de filtros */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${puedeEditar ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-4 pt-2 border-t border-slate-100 items-end`}>
            
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

            {/* Estado de Candidatura (solo con sesión: en la vista pública las fases son privadas) */}
            {puedeEditar && (
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
            )}

            {/* Ordenación */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Ordenar por</label>
              <select 
                value={ordenEfectivo} 
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

          {puedeEditar ? (
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
          ) : (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Ofertas por puntuación de la IA
              </h2>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosScore} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="tramo" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Bar dataKey="cantidad" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>

        {/* 5. Contenido Principal: Lista Detallada o Tablero Embudo */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{vista === 'lista' ? 'Listado de Ofertas' : 'Tablero de Candidaturas'}</span>
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
          ) : error ? (
            /* CASO 1: ERROR DE RED O SERVIDOR API */
            <div className="bg-rose-50 border border-rose-200 p-8 text-center rounded-3xl text-rose-900 space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 mx-auto flex items-center justify-center text-xl">
                ⚠️
              </div>
              <h3 className="font-bold text-base">Error al conectar con la API</h3>
              <p className="text-xs text-rose-600 max-w-md mx-auto">
                {error}. Si el backend está alojado en un plan gratuito (Render), la API puede tardar unos 45 segundos en "despertar".
              </p>
              <button
                onClick={() => recargarOfertas()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                🔄 Reintentar conexión
              </button>
            </div>
          ) : vista === 'lista' ? (
            <div className="space-y-4">
              {ofertasFiltradas.length > 0 ? (
                /* CASO A: HAY OFERTAS QUE COINCIDEN */
                ofertasFiltradas.map((oferta) => (
                  <OfferCard
                    key={oferta.id}
                    oferta={oferta}
                    editable={puedeEditar}
                    mostrarAnalisisIA={puedeEditar}
                    onCambiarEstado={cambiarEstado}
                    onGuardarNotas={guardarNotas}
                  />
                ))
              ) : ofertas.length === 0 ? (
                /* CASO B: LA BASE DE DATOS ESTÁ TOTALMENTE VACÍA */
                <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-500 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 mx-auto flex items-center justify-center text-xl text-blue-600">
                    📭
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {ofertasHistoricas > 0 && !verHistorico
                      ? `No hay ofertas publicadas en los últimos ${DIAS_VENTANA_PUBLICA} días`
                      : 'La base de datos no tiene ofertas todavía'}
                  </h3>
                  {ofertasHistoricas > 0 && !verHistorico && (
                    <button
                      onClick={() => setVerHistorico(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                    >
                      Ver histórico ({ofertasHistoricas})
                    </button>
                  )}
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {puedeEditar ? (
                      <>Utiliza el botón <strong>📁 Subir CSV</strong> en la cabecera para importar ofertas o ejecuta el scraper.</>
                    ) : (
                      <>El pipeline se ejecuta cada día: vuelve más tarde para ver las nuevas ofertas.</>
                    )}
                  </p>
                </div>
              ) : (
                /* CASO C: LA BD TIENE OFERTAS PERO TUS FILTROS LAS OCULTAN */
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
                onCambiarEstado={cambiarEstado}
                badgeColor="bg-slate-400"
              />
              <KanbanColumn 
                titulo="Enviadas" 
                ofertas={ofertasFiltradas.filter(o => o.estado_candidatura === 'enviada')} 
                onCambiarEstado={cambiarEstado}
                badgeColor="bg-blue-500"
              />
              <KanbanColumn 
                titulo="Con Respuesta / Entrevista" 
                ofertas={ofertasFiltradas.filter(o => o.estado_candidatura === 'respuesta' || o.estado_candidatura === 'entrevista')} 
                onCambiarEstado={cambiarEstado}
                badgeColor="bg-purple-500"
              />
              <KanbanColumn 
                titulo="Oferta Recibida" 
                ofertas={ofertasFiltradas.filter(o => o.estado_candidatura === 'oferta')} 
                onCambiarEstado={cambiarEstado}
                badgeColor="bg-emerald-500"
              />
            </div>
          )}
        </section>

      </div>

      {mostrarLogin && !session && <AuthModal onClose={() => setMostrarLogin(false)} />}
    </div>
  );
}

export default App;
