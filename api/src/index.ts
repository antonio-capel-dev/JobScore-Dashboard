import cors from 'cors';
import express from 'express';
import offerRoutes from './routes/offers.routes';
import { iniciarCronJobs } from './services/cron.service';

const app = express();

// Middleware para permitir acceso desde Vercel (HTTPS) a Localhost y habilitar Private Network Access de Chrome
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use(offerRoutes);

app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`);
    iniciarCronJobs();
});
