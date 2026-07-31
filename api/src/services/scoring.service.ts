import { ParsedOffer } from "./csvImport.service";

function extraerJson(content:string):string {
    const limpio = content.trim();

    if (!limpio.startsWith('```')) {
        return limpio;
    }

    const finPrimeraLinea = limpio.indexOf('\n');
    const sinApertura = limpio.slice(finPrimeraLinea + 1);
    const inicioCierre = sinApertura.lastIndexOf('```');
    const sinCierre = sinApertura.slice(0, inicioCierre);
    const resultado = sinCierre.trim();
    return resultado;
}

export interface ScoringResult {
    score: number,
    tecnologiasCoincidentes: string[],
    brechaPrincipal: string,
    recomendacion: string
}

function construirPrompt(offer: ParsedOffer): string {
    return `Eres un asistente que evalúa ofertas de empleO para un desarrollador junior.
    
    Perfil del candidato:
    -Nivel: junior, buscando su primer empleo como desarrollador
    -Tecnologías que domina: HTML, CSS, Javascript, React (básico-intermedio), PHP, MySQL, Python
    
    OFERTA A EVALUAR:
    
    -Puesto: ${offer.titulo_puesto}
    -Tecnologías requeridas: ${offer.stack_tecnologico.join(', ')}
    -Experiencia requerida: ${offer.experiencia_requerida}
    -Modalidad: ${offer.modalidad}
    -Salario: ${offer.salario_min} - ${offer.salario_max}
    -Nivel de inglés requerido: ${offer.nivel_ingles}
    
    Responde ÚNICAMENTE con un JSON con esta forma exacta, sin texto adicional antes ni después:
{
  "score": <número del 0 al 100 indicando qué tan bien encaja la oferta>,
  "tecnologiasCoincidentes": [<tecnologías de la oferta que el candidato ya domina>],
  "brechaPrincipal": "<la carencia más importante del candidato frente a esta oferta>",
  "recomendacion": "<una frase corta recomendando o no aplicar, y por qué>"
}
    `;

    
    



}