const fs = require('fs');

const CSV_PATH = 'D:/OPENCLAW-DATOS-IMPORTANTES-GUARDADOS/empleos_tech_ia_web.csv';
const ENDPOINT = 'https://jobscore-dashboard.onrender.com/offers/upload';
// Misma clave que INGEST_API_KEY en Render. Nunca la escribas en el código: va en una variable de entorno
const API_KEY = process.env.JOBSCORE_API_KEY;

async function enviarOfertas() {
    try {
        if (!API_KEY) {
            console.error('[Error] Falta la variable de entorno JOBSCORE_API_KEY (la misma clave que INGEST_API_KEY en Render).');
            process.exit(1);
        }

        if (!fs.existsSync(CSV_PATH)) {
            console.error(`[Error] No se encontró el archivo en: ${CSV_PATH}`);
            process.exit(1);
        }

        const csvText = fs.readFileSync(CSV_PATH, 'utf-8');
        console.log(`[JobScore Sync] Leyendo CSV (${csvText.length} caracteres)...`);
        console.log('[JobScore Sync] Enviando al endpoint...')
        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify({ csvText })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('[JobScore Sync] Éxito:', data.mensaje);
        await esperarResultados(data.jobId, `https://jobscore-dashboard.onrender.com`);
    } catch (error) {
        console.error('[JobScore Sync] Error enviando ofertas a Render:', error.message);
        process.exit(1);
    }
}

async function esperarResultados(jobId, baseUrl) {
    // Hasta 10 minutos: con el modelo gratuito se puntúa una oferta cada pocos segundos
    const MAX_INTENTOS = 120;
    const ESPERA_MS = 5000;

    for (let i = 0; i<MAX_INTENTOS;i++) {
        await new Promise(resolve => setTimeout(resolve, ESPERA_MS));
        const res = await fetch(`${baseUrl}/offers/import-jobs/${jobId}`, {
            headers: { 'x-api-key': API_KEY }
        });
        const job = await res.json();
        console.log(`[Intento ${i + 1}/${MAX_INTENTOS}] Estado: ${job.status}- ${job.message}`);

        if (job.status === 'completed' || job.status === 'failed') {
            console.log(`\n[JobScore Sync] Resultado final:`);
            console.log(`Guardadas: ${job.saved}`);
            console.log(`Duplicadas: ${job.duplicates}`);
            console.log(`Descartadas: ${job.discarded}`);
            console.log(`Errores: ${job.errors}`);
            console.log(`Pendientes para la siguiente subida: ${job.pending ?? 0}`);
            return;
        }
    }

    console.log('[JobScore Sync] Tiempo de espera agotado sin respuesta final. El servidor sigue procesando: el resultado aparecerá en el dashboard.');
}

enviarOfertas();
