import cron from "node-cron";
import { ejecutarPipelineCompleto } from "./pipeline.service";

export function iniciarCronJobs() {
    // Por defecto cada día a las 08:00 AM ('0 8 * * *')
    const cronSchedule = process.env.CRON_SCHEDULE || '0 8 * * *';

    console.log(`[Cron] Programador automático iniciado con patrón: "${cronSchedule}"`);

    cron.schedule(cronSchedule, async () => {
        console.log(`[Cron] [${new Date().toLocaleString('es-ES')}] Ejecutando tarea diaria programada...`);
        try {
            const resumen = await ejecutarPipelineCompleto();
            console.log("[Cron] Tarea diaria completada con éxito:", JSON.stringify(resumen));
        } catch (error) {
            console.error("[Cron] Error durante la ejecución de la tarea programada:", error);
        }
    });
}
