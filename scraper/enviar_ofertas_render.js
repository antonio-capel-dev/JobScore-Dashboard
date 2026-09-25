const fs = require('fs');

const CSV_PATH = 'D:/OPENCLAW-DATOS-IMPORTANTES-GUARDADOS/empleos_tech_ia_web.csv';
const ENDPOINT = 'https://jobscore-dashboard.onrender.com/offers/upload';

async function enviarOfertas() {
    try {
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
                'Content-Type': 'application/json'
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
    const MAX_INTENTOS = 40;
    const ESPERA_MS = 3000;

    for (let i = 0; i<MAX_INTENTOS;i++) {
        await new Promise(resolve => setTimeout(resolve, ESPERA_MS));
        const res = await fetch(`${baseUrl}/offers/import-jobs/${jobId}`);
        const job = await res.json();
        console.log(`[Intento ${i + 1}/${MAX_INTENTOS}] Estado: ${job.status}- ${job.message}`);

        if (job.status === 'completed' || job.status === 'failed') {
            console.log(`\n[JobScore Sync] Resultado final:`);
            console.log(`Guardadas: ${job.saved}`);
            console.log(`Duplicadas: ${job.duplicates}`);
            console.log(`Descartadas: ${job.discarded}`);
            console.log(`Errores: ${job.errors}`);
            return;
        }
    }

    console.log('[JobScore Sync] Tiempo de espera agotado sin respuesta final.');
}

enviarOfertas();
