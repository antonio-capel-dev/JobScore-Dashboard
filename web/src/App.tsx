import { BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { useState } from "react";
import { useOffers } from "./hooks/useOffers";
import { OfferCard } from "./components/OfferCard";

function App() {
  
  const { offers: ofertas, actualizarEstadoOferta } = useOffers();
  const [modalidadSeleccionada, setModalidadSeleccionada] = useState('todas');
  const [scoreMinimo, setScoreMinimo] = useState(0);
  const[ ubicacionBuscada, setUbicacionBuscada ] = useState('');

  const ofertasFiltradas = ofertas.filter((oferta) => 
    (modalidadSeleccionada === 'todas'|| oferta.modalidad === modalidadSeleccionada) && oferta.score >= scoreMinimo && oferta.ubicacion.includes(ubicacionBuscada)); 

  

  const datosModalidad = [
    {
    modalidad: 'Remoto', cantidad: ofertas.filter(oferta=>oferta.modalidad === 'remoto').length
  },
  {
    modalidad: 'Híbrido', cantidad: ofertas.filter(oferta=>oferta.modalidad === 'hibrido').length
  },
  {
    modalidad: 'No especificado', cantidad: ofertas.filter(oferta=>oferta.modalidad === 'no especificado').length},
  ];

  const datosEmbudo = [
    { fase: 'enviada', cantidad: ofertas.filter(oferta=>oferta.estado_candidatura === 'enviada').length},
    {
      fase: 'respuesta', cantidad: ofertas.filter(oferta=>oferta.estado_candidatura === 'respuesta').length
    },
    {
      fase: 'oferta', cantidad: ofertas.filter(oferta=>oferta.estado_candidatura === 'oferta').length
    },
    {
      fase: 'entrevista', cantidad: ofertas.filter(oferta=>oferta.estado_candidatura === 'entrevista').length
    }
  ];
  

  return (

    <div className="p-8 max-w-2xl mx-auto">
    <h1 className="text-3xl font-bold text-blue-600 mb-6">JobScore Dashboard</h1>
    <select name="" id="" value={modalidadSeleccionada} onChange={(e) => setModalidadSeleccionada(e.target.value)}>
      <option value="todas">Todas</option>
      <option value="remoto">Remoto</option>
      <option value="hibrido">Híbrido</option>
      <option value="no especificado">No especificado</option>
    </select>

    <input type="text" placeholder="Buscar por ciudad..." value={ubicacionBuscada} onChange={(e) => setUbicacionBuscada(e.target.value)}/>

    <input type="range" min="0" max="100" value={scoreMinimo} onChange={(e) => setScoreMinimo(Number(e.target.value))}/>
    <BarChart width={400} height={300} data={datosModalidad}>
      <XAxis dataKey="modalidad" />
      <YAxis allowDecimals={false}/>
      <Tooltip />
      <Bar dataKey="cantidad" fill="#f59e0b"/>
    </BarChart>

    <BarChart width={400} height={300} data={datosEmbudo}>
      <XAxis dataKey="fase" />
      <YAxis allowDecimals={false}/>
      <Tooltip />
      <Bar dataKey="cantidad" fill="#3b82f6"/>
    </BarChart>

    <div className="space-y-3">
     {ofertasFiltradas.map((oferta) => {
      return <OfferCard key = {oferta.id} oferta={oferta} onCambiarEstado={actualizarEstadoOferta}/>
       
    })}
    </div>
    </div>
  )
}
export default App
