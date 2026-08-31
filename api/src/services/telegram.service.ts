import 'dotenv/config';
import { ParsedOffer } from './csvImport.service';
import { ScoringResult } from './scoring.service';

// Función para evitar que caracteres especiales rompan las etiquetas HTML de Telegram
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export async function sendOfferNotification(offer: ParsedOffer, scoring: ScoringResult): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // Si falta configuración, avisamos en consola pero no tiramos el servidor abajo
    if (!token || !chatId) {
        console.warn('Telegram Bot Token o Chat ID no configurados en las variables de entorno.');
        return false;
    }

    // 1. Formateamos el salario según lo que venga en el CSV
    const salaryText = offer.salario_min && offer.salario_max
        ? `${offer.salario_min.toLocaleString()}€ - ${offer.salario_max.toLocaleString()}€`
        : offer.salario_min
        ? `Desde ${offer.salario_min.toLocaleString()}€`
        : 'No especificado';

    // 2. Formateamos las tecnologías coincidentes
    const techMatches = scoring.tecnologiasCoincidentes.length > 0
        ? scoring.tecnologiasCoincidentes.join(', ')
        : 'Ninguna detectada';

    // 3. Montamos el mensaje con HTML básico (b, a, etc.)
    const message = [
        `<b>Nueva Oferta: ${escapeHtml(offer.titulo_puesto)}</b>`,
        `<b>Empresa:</b> ${escapeHtml(offer.empresa)}`,
        `<b>Score:</b> ${scoring.score}/100 (Veredicto: ${scoring.veredicto})`,
        `<b>Modalidad:</b> ${escapeHtml(offer.modalidad || 'No especificada')} | <b>Ubicación:</b> ${escapeHtml(offer.ubicacion || 'No especificada')}`,
        `<b>Salario:</b> ${salaryText}`,
        `<b>Tecnologías coincidentes:</b> ${escapeHtml(techMatches)}`,
        `<b>Brecha principal:</b> ${escapeHtml(scoring.brechaPrincipal || 'Ninguna destacada')}`,
        `<b>Recomendación:</b> ${escapeHtml(scoring.recomendacion)}`,
        `\n<a href="${offer.url_oferta}">Ver oferta completa</a>`
    ].join('\n');

    try {
        // 4. Hacemos la llamada HTTP usando fetch nativo de Node.js
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: false,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Error al enviar mensaje a Telegram:', errorData);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error de red al conectar con Telegram Bot API:', error);
        return false;
    }
}
