export interface Offer {
    id: number;
    fecha_scrape: string;
    fuente: string | null;
    encaja_perfil: 'Si'|'Quizás'|'No'|null;
    empresa: string;
    titulo_puesto: string;
    categoria: 'IA' | 'web';

}