import { useOffers } from "./hooks/useOffers";

function App() {
  const ofertas = useOffers();
  return (
    <div>
    <h1 className="text-3xl font-bold text-blue-600">JobScore Dashboard</h1>
    {ofertas.map((oferta) => {
      return <p key={oferta.id}> {oferta.titulo_puesto} - {oferta.score}</p>
    })}
    </div>
  )
}
export default App
