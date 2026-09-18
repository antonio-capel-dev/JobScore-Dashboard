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
    } catch (error) {
        console.error('[JobScore Sync] Error enviando ofertas a Render:', error.message);
        process.exit(1);
    }
}

enviarOfertas();
