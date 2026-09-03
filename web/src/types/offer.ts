export interface Offer {
    id: number;
    fecha_scrape: string;
    fuente: string | null;
    encaja_perfil: 'Si'|'Quizas'|'No'|null;
    empresa: string;
    titulo_puesto: string;
    categoria: 'IA' | 'WEB';
    ubicacion: string;
    modalidad: string;
    salario_min: number|null;
    salario_max: number|null;
    experiencia_requerida: string | null;
    fecha_publicacion: string;
    stack_tecnologico: string[];
    nivel_ingles: string;
    url_oferta: string;
    tecnologias_coincidentes: string[];
    brecha_principal: string;
    recomendacion: string;
    score: number;
    estado_candidatura: null|'enviada'|'respuesta'|'oferta'|'entrevista';
    notas?: string |null;
}
