import { useOffers } from "./hooks/useOffers";
import { OfferCard } from "./components/OfferCard";

function App() {
  const ofertas = useOffers();
  return (
    <div className="p-8 max-w-2xl mx-auto">
    <h1 className="text-3xl font-bold text-blue-600 mb-6">JobScore Dashboard</h1>
    <div className="space-y-3">
     {ofertas.map((oferta) => {
      return <OfferCard key = {oferta.id} oferta={oferta}/>
       
    })}
    </div>
    </div>
  )
}
export default App
