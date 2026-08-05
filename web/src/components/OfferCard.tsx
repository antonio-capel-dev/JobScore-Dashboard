import type { Offer } from "../types/offer";

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
        </div>
    )
}