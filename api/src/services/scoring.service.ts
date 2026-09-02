import 'dotenv/config';
import { ParsedOffer } from "./csvImport.service";

export function extraerJson(content:string):string {
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
    veredicto: 'Si' | 'Quizas' | 'No',
    tecnologiasCoincidentes: string[],
    brechaPrincipal: string,
    recomendacion: string
}

export function construirPrompt(offer: ParsedOffer): string {
    return `Eres un asistente que evalúa ofertas de empleo para un desarrollador junior.
    
    Perfil del candidato:
    - Puesto objetivo: Junior Full-Stack Web Developer
    - Tecnologías que domina: JavaScript ES6+, React, Astro, TypeScript, HTML, CSS, Tailwind, Material-UI, WordPress, PHP 8+, MySQL, Node.js, Supabase (PostgreSQL), APIs REST, Git, Docker (básico). Python básico (en consolidación). En construcción: LLMs, RAG/LangChain, FastAPI, SQL avanzado, Azure, Power BI.
    Si una oferta requiere como requisito clave una tecnología que el candidato tiene "en construcción" y no domina, o una tecnología que no posee, el score debe tender a "No" o "Quizas" (puntuación menor de 45).
    
    OFERTA A EVALUAR:
    
    - Puesto: ${offer.titulo_puesto}
    - Empresa: ${offer.empresa}
    - Tecnologías requeridas: ${offer.stack_tecnologico.join(', ')}
    - Experiencia requerida: ${offer.experiencia_requerida ?? 'No especificada'}
    - Modalidad: ${offer.modalidad}
    - Salario: ${offer.salario_min ?? 'N/A'} - ${offer.salario_max ?? 'N/A'}
    - Nivel de inglés requerido: ${offer.nivel_ingles}
    
    Responde ÚNICAMENTE con un JSON con esta forma exacta, sin texto adicional antes ni después:
{
  "score": <número del 0 al 100 indicando qué tan bien encaja la oferta>,
  "veredicto": "<'Si' si score >= 75, 'Quizas' si score está entre 45 y 74, 'No' si score < 45>",
  "tecnologiasCoincidentes": [<tecnologías de la oferta que el candidato ya domina>],
  "brechaPrincipal": "<la carencia más importante del candidato frente a esta oferta>",
  "recomendacion": "<una frase corta recomendando o no aplicar, y por qué>"
}
    `;
}


export async function scoreOffer(offer: ParsedOffer): Promise<ScoringResult>  {
    const prompt = construirPrompt(offer);

    const respuesta = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'minimax/minimax-m2.7:free',
            messages: [{role: 'user', content: prompt}],
        }),


        
    })
    const data = await respuesta.json();

    if (!respuesta.ok || !data.choices) {
        console.error("Respuesta de error de OpenRouter:", data);
        throw new Error(data.error?.message || "Error en la llamada a OpenRouter");
    }

    const content = data.choices[0].message.content;
    const contenidoExtraido = extraerJson(content);
    const parsed= JSON.parse(contenidoExtraido);

    const score = Number(parsed.score) || 0;

    let veredicto: 'Si'|'Quizas'|'No' ;

    const veredictoRaw = String(parsed.veredicto || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if(veredictoRaw.includes('si') || score >= 75) {
        veredicto = 'Si';
    } else if (veredictoRaw.includes('quiza')|| (score >= 45 && score < 75)) {
        veredicto = 'Quizas';
    } else {
        veredicto = 'No';
    }

    return {
        score,
        veredicto,
        tecnologiasCoincidentes:Array.isArray(parsed.tecnologiasCoincidentes) ? parsed.tecnologiasCoincidentes : [],
        brechaPrincipal: parsed.brechaPrincipal || '',
        recomendacion: parsed.recomendacion || ''
    };
}


