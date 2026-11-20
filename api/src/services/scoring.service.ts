import 'dotenv/config';
import { ParsedOffer } from "./csvImport.service";

// Router de OpenRouter que elige entre los modelos gratuitos disponibles (la lista cambia a menudo).
// Se puede fijar otro modelo con la variable OPENROUTER_MODEL.
export const MODELO_POR_DEFECTO = 'openrouter/free';

export const MAX_TOKENS_POR_DEFECTO = 4000;

export function maxTokensRespuesta(): number {
    const valor = Number(process.env.SCORING_MAX_TOKENS);
    return Number.isInteger(valor) && valor > 0 ? valor : MAX_TOKENS_POR_DEFECTO;
}

// Cupo agotado (429) o sin saldo (402): no tiene sentido seguir llamando en esta ejecución,
// porque los intentos fallidos también cuentan para el límite diario.
export class LimiteProveedorError extends Error {
    constructor(message: string, public readonly status: number) {
        super(message);
        this.name = 'LimiteProveedorError';
    }
}

export function extraerJson(content:string):string {
    const limpio = content.trim();

    if (limpio.startsWith('```')) {
        const finPrimeraLinea = limpio.indexOf('\n');
        const sinApertura = limpio.slice(finPrimeraLinea + 1);
        const inicioCierre = sinApertura.lastIndexOf('```');
        const sinCierre = sinApertura.slice(0, inicioCierre);
        return sinCierre.trim();
    }

    if (limpio.startsWith('{')) {
        return limpio;
    }

    // Algunos modelos gratuitos añaden texto antes o después del JSON
    const inicio = limpio.indexOf('{');
    const fin = limpio.lastIndexOf('}');
    if (inicio !== -1 && fin > inicio) {
        return limpio.slice(inicio, fin + 1);
    }

    return limpio;
}

export interface ScoringResult {
    score: number,
    veredicto: 'Si' | 'Quizas' | 'No',
    tecnologiasCoincidentes: string[],
    brechaPrincipal: string,
    recomendacion: string
}

export function construirPrompt(offer: ParsedOffer): string {
    return `Eres un evaluador técnico experto en reclutamiento IT. Evalúas ofertas de empleo para Antonio Capel, perfil junior de IA aplicada y datos con base sólida de desarrollo web y visión de negocio.

Perfil del candidato:
- Puesto objetivo, en este orden: (1) Junior AI / Data Engineer con Python: pipelines de datos, SQL, APIs e integración de modelos en sistemas existentes. (2) Junior GenAI Developer: LLMs, RAG, bases vectoriales y agentes. (3) Full Stack o automatización, solo si tiene un componente directo de IA o de datos.
- Python y datos: Python, pandas, SQL, PostgreSQL, Supabase, ETL, scikit-learn (en proyectos del curso, no en producción).
- IA aplicada: LLMs por API (OpenRouter), scoring con LLM en producción en este mismo proyecto, agentes y automatización de flujos. RAG en desarrollo.
- Web y APIs: Node.js, Express, TypeScript, React, APIs REST.
- Testing y calidad: Vitest, Git, GitHub.
- Idiomas: inglés C1, francés B2.
- Formación: CFGS Desarrollo de Aplicaciones Web (Digitech, 2026); Curso de Especialización en Inteligencia Artificial y Big Data (Digitech, en curso hasta junio de 2027); Full Stack Open (Universidad de Helsinki).
- Experiencia: prácticas de desarrollo Full Stack en MUMA Bat Company (4 meses, 2026); fundador y director de Movilecom, empresa de telecomunicaciones y seguridad (2018-2022).
- Disponibilidad: remoto en España, o presencial/híbrido en Málaga y alrededores. Tiene clase de lunes a jueves por la tarde hasta junio de 2027.

Reglas estrictas de evaluación:
1. Seniority: si la oferta pide 3 años de experiencia o más, o seniority Senior/Lead/Architect, el score debe ser menor de 45 y el veredicto "No". Si pide 2 años, el score máximo es 74 ("Quizas") aunque todo lo demás encaje.
2. Encaje principal: oferta Junior, Trainee o Prácticas con Python, datos (SQL, ETL, pipelines, BI) o IA (LLMs, RAG, agentes, automatización con IA) → score de 75 o más y veredicto "Si".
3. Desarrollo web: oferta junior web (React, Node, TypeScript) con un componente directo de IA o de datos → score entre 60 y 80. Sin componente de IA ni de datos → score máximo 55.
4. Stack descartado: Java, Angular, .NET, C#, PHP, WordPress o Salesforce sin Python, datos ni IA → score menor de 45 y veredicto "No".
5. Fuera de alcance: Data Scientist puro (suele exigir grado cuantitativo), Big Data pesado como requisito indispensable (Hadoop, Spark con Scala) o SAP/ABAP/Cobol → score menor de 45.
6. Horario: si la oferta exige presencia las tardes de lunes a jueves, dilo en "brechaPrincipal" (no bajes el score solo por eso).
7. No supongas experiencia que no está en el perfil: si la oferta pide algo que el candidato no tiene, esa es la brecha.

OFERTA A EVALUAR:
- Puesto: ${offer.titulo_puesto}
- Empresa: ${offer.empresa}
- Tecnologías requeridas: ${offer.stack_tecnologico.join(', ')}
- Experiencia requerida: ${offer.experiencia_requerida ?? 'No especificada'}
- Modalidad: ${offer.modalidad}
- Salario: ${offer.salario_min ?? 'N/A'} - ${offer.salario_max ?? 'N/A'}
- Nivel de inglés requerido: ${offer.nivel_ingles}
- Descripción completa:
${offer.description ? offer.description : 'No proporcionada'}

Responde ÚNICAMENTE con un JSON con esta forma exacta, sin texto adicional antes ni después:
{
  "score": <número entero de 0 a 100>,
  "veredicto": "<'Si' si score >= 75, 'Quizas' si score está entre 45 y 74, 'No' si score < 45>",
  "tecnologiasCoincidentes": [<tecnologías de la oferta que el candidato domina>],
  "brechaPrincipal": "<la carencia o brecha más relevante>",
  "recomendacion": "<una frase concisa recomendando aplicar o no, y por qué>"
}`;
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
            model: process.env.OPENROUTER_MODEL || MODELO_POR_DEFECTO,
            messages: [{role: 'user', content: prompt}],
            // Los modelos gratuitos no cobran por token: margen de sobra para que un modelo que razona
            // no se quede sin espacio para el JSON (si lo agota todo, la respuesta llega vacía)
            max_tokens: maxTokensRespuesta(),
            // Razonamiento corto (~20 % de max_tokens) y sin devolverlo: solo interesa el JSON
            reasoning: { effort: 'low', exclude: true },
        }),
    });

    const data = await respuesta.json().catch(() => ({}));

    if (respuesta.status === 429 || respuesta.status === 402) {
        console.error("Límite de OpenRouter alcanzado:", data?.error?.message);
        throw new LimiteProveedorError(data?.error?.message || 'Límite de OpenRouter alcanzado', respuesta.status);
    }

    if (!respuesta.ok || !data.choices) {
        console.error("Respuesta de error de OpenRouter:", data);
        throw new Error(data.error?.message || "Error en la llamada a OpenRouter");
    }

    const content = data.choices[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
        const motivo = data.choices[0]?.finish_reason ?? 'desconocido';
        throw new Error(`El modelo devolvió una respuesta vacía (finish_reason: ${motivo}, modelo: ${data.model ?? 'desconocido'})`);
    }
    const contenidoExtraido = extraerJson(content);
    const parsed = JSON.parse(contenidoExtraido);

    // Clamping estricto de score entre 0 y 100
    const rawScore = Number(parsed.score);
    const score = isNaN(rawScore) ? 0 : Math.max(0, Math.min(100, Math.round(rawScore)));

    let veredicto: 'Si' | 'Quizas' | 'No';
    const veredictoRaw = String(parsed.veredicto || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (veredictoRaw.includes('si') || score >= 75) {
        veredicto = 'Si';
    } else if (veredictoRaw.includes('quiza') || (score >= 45 && score < 75)) {
        veredicto = 'Quizas';
    } else {
        veredicto = 'No';
    }

    return {
        score,
        veredicto,
        tecnologiasCoincidentes: Array.isArray(parsed.tecnologiasCoincidentes) ? parsed.tecnologiasCoincidentes : [],
        brechaPrincipal: parsed.brechaPrincipal || '',
        recomendacion: parsed.recomendacion || ''
    };
}
