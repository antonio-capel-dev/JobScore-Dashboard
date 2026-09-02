import cors from 'cors';
import express from 'express';
import offerRoutes from './routes/offers.routes';
import { iniciarCronJobs } from './services/cron.service';

const app = express();

const allowedOrigins = [
    'https://job-score-dashboard-5wux.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
];

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
    origin: (origin, callback) => {
        // Permitir peticiones sin origin (como curl, Postman o llamadas internas) o de dominios autorizados
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`Origen ${origin} no permitido por política CORS`));
        }
    }
}));

app.use(express.json());
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use(offerRoutes);

app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`);
    iniciarCronJobs();
});
