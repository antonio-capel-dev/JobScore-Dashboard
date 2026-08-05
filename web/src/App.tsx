import { useOffers } from "./hooks/useOffers";

function App() {
  const ofertas = useOffers();
  return (
    <div className="p-8 max-w-2xl mx-auto">
    <h1 className="text-3xl font-bold text-blue-600 mb-6">JobScore Dashboard</h1>
    <div className="space-y-3">

     {ofertas.map((oferta) => {
        return <div key={oferta.id} className="bg-amber-200 rounded-lg shadow p-4 flex justify-between items-center border">
                
        <h2 className="font-semibold text-lg">{oferta.titulo_puesto}
        </h2>
        <p className="text-gray-500 text-sm">{oferta.empresa}</p>
        <span className="px-3 py-1 rounded-full text-white font-bold bg-amber-500">{oferta.score}</span>
        </div>
    })}
    </div>

    </div>
  )
}
export default App
