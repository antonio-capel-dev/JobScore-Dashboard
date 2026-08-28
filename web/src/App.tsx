import { BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { useState, useEffect } from "react";
import { useOffers } from "./hooks/useOffers";
import { OfferCard } from "./components/OfferCard";
import { AuthModal } from "./components/AuthModal";
import { supabase } from "./api/supabaseClient";
import type { Session } from "@supabase/supabase-js";

function App() {
  const { offers: ofertas, actualizarEstadoOferta } = useOffers();
  const [session, setSession] = useState<Session | null>(null);
  const [modalidadSeleccionada, setModalidadSeleccionada] = useState('todas');
  const [scoreMinimo, setScoreMinimo] = useState(0);
  const [ubicacionBuscada, setUbicacionBuscada] = useState('');

  // 1. Escuchar el estado de autenticación
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

  const ofertasFiltradas = ofertas.filter((oferta) => 
    (modalidadSeleccionada === 'todas' || oferta.modalidad === modalidadSeleccionada) && 
    oferta.score >= scoreMinimo && 
    oferta.ubicacion.toLowerCase().includes(ubicacionBuscada.toLowerCase())
  ); 

  const datosModalidad = [
    { modalidad: 'Remoto', cantidad: ofertas.filter(oferta => oferta.modalidad === 'remoto').length },
    { modalidad: 'Híbrido', cantidad: ofertas.filter(oferta => oferta.modalidad === 'hibrido').length },
    { modalidad: 'No especificado', cantidad: ofertas.filter(oferta => oferta.modalidad === 'no especificado').length },
  ];

  const datosEmbudo = [
    { fase: 'Enviada', cantidad: ofertas.filter(oferta => oferta.estado_candidatura === 'enviada').length },
    { fase: 'Respuesta', cantidad: ofertas.filter(oferta => oferta.estado_candidatura === 'respuesta').length },
    { fase: 'Entrevista', cantidad: ofertas.filter(oferta => oferta.estado_candidatura === 'entrevista').length },
    { fase: 'Oferta', cantidad: ofertas.filter(oferta => oferta.estado_candidatura === 'oferta').length }
  ];

  // Si no está autenticado, mostramos la pantalla de login
  if (!session) {
    return <AuthModal />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* 1. Header con datos del Usuario y Logout */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">JobScore Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">
              Analizador inteligente de ofertas de empleo
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-gray-400 block font-medium">Sesión activa:</span>
              <span className="text-sm font-semibold text-gray-700">{session.user.email}</span>
            </div>

            <button
              onClick={() => supabase.auth.signOut()}
              className="px-3.5 py-2 rounded-xl bg-gray-200 hover:bg-rose-100 text-gray-700 hover:text-rose-700 font-semibold text-xs transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        {/* 2. Barra de Filtros */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-6 items-center justify-between">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            <div className="flex flex-col gap-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-500 uppercase">Ubicación</label>
              <input
                type="text"
                placeholder="Buscar por ciudad..."
                value={ubicacionBuscada}
                onChange={(e) => setUbicacionBuscada(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>

            <div className="flex flex-col gap-1 min-w-[180px]">
              <label className="text-xs font-medium text-gray-500 uppercase">Modalidad</label>
              <select 
                value={modalidadSeleccionada} 
                onChange={(e) => setModalidadSeleccionada(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="todas">Todas</option>
                <option value="remoto">Remoto</option>
                <option value="hibrido">Híbrido</option>
                <option value="no especificado">No especificado</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1 min-w-[200px]">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-gray-500 uppercase">Score mínimo</label>
              <span className="text-sm font-bold text-blue-600">{scoreMinimo} pts</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={scoreMinimo} 
              onChange={(e) => setScoreMinimo(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>
        </section>

        {/* 3. Panel de Gráficas (2 columnas) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 w-full text-left">
              Ofertas por Modalidad
            </h2>
            <BarChart width={400} height={250} data={datosModalidad}>
              <XAxis dataKey="modalidad" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="cantidad" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 w-full text-left">
              Embudo de Candidaturas
            </h2>
            <BarChart width={400} height={250} data={datosEmbudo}>
              <XAxis dataKey="fase" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="cantidad" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </div>
        </section>

        {/* 4. Lista de Ofertas */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800">
            Ofertas Filtradas ({ofertasFiltradas.length})
          </h2>

          <div className="space-y-3">
            {ofertasFiltradas.length > 0 ? (
              ofertasFiltradas.map((oferta) => (
                <OfferCard 
                  key={oferta.id} 
                  oferta={oferta} 
                  onCambiarEstado={actualizarEstadoOferta}
                />
              ))
            ) : (
              <div className="bg-white p-8 text-center rounded-2xl border border-gray-100 text-gray-500">
                No hay ofertas que coincidan con los filtros.
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}

export default App;
