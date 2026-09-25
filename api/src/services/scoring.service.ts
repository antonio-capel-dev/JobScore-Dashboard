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
    return `Eres un evaluador técnico experto en reclutamiento IT. Evalúas ofertas de empleo para Antonio Capel, desarrollador Junior Full-Stack con proyectos reales en producción y visión de negocio.

Perfiles del candidato:
- Puesto objetivo: Junior Full-Stack Web Developer / Junior Frontend / Junior Software Engineer.
- Frontend: React, TypeScript, JavaScript (ES6+), Astro, CSS, Tailwind CSS, WordPress.
- Backend y APIs: Node.js, Express, Python, PHP 8+, APIs REST, Java (conocimientos base / junior).
- Bases de datos: SQL, PostgreSQL, Supabase (Auth, Database, Storage).
- Testing y Calidad: Vitest, testing unitario, Git, GitHub.
- IA aplicada: LLMs, OpenRouter, agentes de IA, automatización y orquestación de flujos de IA.
- Idiomas: Inglés C1 (Competencia profesional completa), Francés B2.
- Formación: Técnico Superior en Desarrollo de Aplicaciones Web (DAW, Digitech), Full Stack Open (Universidad de Helsinki).
- Experiencia: Desarrollador Full Stack en prácticas (MuMa Bat Company), fundador y gestor de empresa previa (autonomía, visión de negocio y producto).
- Disponibilidad: 100% Remoto nacional y Málaga presencial/híbrido.

Reglas estrictas de evaluación:
1. Seniority y Experiencia: Si la oferta requiere más de 2 años de experiencia o seniority Senior/Lead/Architect, el score debe ser BAJO (< 45) y veredicto "No".
2. Match Junior: Si la oferta es Junior, Trainee o Prácticas para desarrollo web o software general (React, TypeScript, JavaScript, Node, PHP, Python, WordPress, Java junior), puntúa ALTO (>= 70) y veredicto "Si".
3. Tecnologías fuera de alcance: Si la oferta exige como requisito indispensable herramientas de Big Data empresarial pesadas (Hadoop, Scala) o SAP/ABAP/Cobol, el score debe ser menor de 45. Valora positivamente la capacidad de resolver tareas con asistencia de IA.

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
            model: 'qwen/qwen3.8-27b:free',
            messages: [{role: 'user', content: prompt}],
        }),
    });

    const data = await respuesta.json();

    if (!respuesta.ok || !data.choices) {
        console.error("Respuesta de error de OpenRouter:", data);
        throw new Error(data.error?.message || "Error en la llamada a OpenRouter");
    }

    const content = data.choices[0].message.content;
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
