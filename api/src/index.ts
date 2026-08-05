import cors from 'cors';
import express from 'express';
import offerRoutes from './routes/offers.routes'


const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use(offerRoutes);

app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`);
});