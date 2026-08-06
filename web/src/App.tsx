import { useState } from "react";
import { useOffers } from "./hooks/useOffers";
import { OfferCard } from "./components/OfferCard";

function App() {
  const ofertas = useOffers();
  const [modalidadSeleccionada, setModalidadSeleccionada] = useState('todas');
  const ofertasFiltradas = ofertas.filter((oferta) => modalidadSeleccionada === 'todas'|| oferta.modalidad === modalidadSeleccionada);

  return (
    <div className="p-8 max-w-2xl mx-auto">
    <h1 className="text-3xl font-bold text-blue-600 mb-6">JobScore Dashboard</h1>
    <select name="" id="" value={modalidadSeleccionada} onChange={(e) => setModalidadSeleccionada(e.target.value)}>
      <option value="todas">Todas</option>
      <option value="remoto">Remoto</option>
      <option value="hibrido">Híbrido</option>
      <option value="no especificado">No especificado</option>
    </select>
    <div className="space-y-3">
     {ofertasFiltradas.map((oferta) => {
      return <OfferCard key = {oferta.id} oferta={oferta}/>
       
    })}
    </div>
    </div>
  )
}
export default App
