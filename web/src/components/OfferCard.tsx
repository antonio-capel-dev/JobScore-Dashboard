import type { Offer } from "../types/offer";
import { updateOfferStatus } from "../api/offers";

interface OfferCardProps {
    oferta: Offer; 
} 

export function OfferCard({oferta}: OfferCardProps) {
    return ( 
        <div className="bg-amber-200 rounded-lg shadow p-4 flex justify-between items-center border">
            <h2 className="font-semibold text-lg">{oferta.titulo_puesto}
            </h2>
            <p className="text-gray-500 text-sm">{oferta.empresa}   
            </p>        
            <span className="px-3 py-1 rounded-full text-white font-bold bg-amber-500">{oferta.score}
                
            </span>
            <select name="estado"
                    id="estado"
                    value={oferta.estado_candidatura ?? ''} 
                    onChange={async ( e)  => {
                    const nuevoEstado = e.target.value;
                    await updateOfferStatus(oferta.id , nuevoEstado)
                }} >

            <option value="">Sin estado</option>
            <option value="enviada">Enviada</option>
            <option value="respuesta">Respuesta</option>
            <option value="entrevista">Entrevista</option>
            <option value="oferta">Oferta</option>
            </select>
        </div>
    )
}