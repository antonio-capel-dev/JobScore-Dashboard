export interface ImportJob {
    status: 'processing' | 'completed' | 'failed';
    total: number;
    saved: number;
    duplicates: number;
    discarded: number;
    errors: number;
    message: string;
}

export const importJobs = new Map<string, ImportJob>();