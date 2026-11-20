export interface ImportJob {
    status: 'processing' | 'completed' | 'failed';
    total: number;
    saved: number;
    duplicates: number;
    discarded: number;
    errors: number;
    // Ofertas nuevas que quedan para la siguiente subida por el cupo diario del modelo
    pending?: number;
    message: string;
}

export const importJobs = new Map<string, ImportJob>();