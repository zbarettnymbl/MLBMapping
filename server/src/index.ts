import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { exercisesRouter } from './routes/exercises';
import { referenceTableRoutes } from './routes/reference-tables';
import { adminRouter } from './routes/admin';
import { credentialsRouter } from './routes/credentials';
import { bigqueryRouter } from './routes/bigquery';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/exercises', exercisesRouter);
app.use('/api/v1/reference-tables', referenceTableRoutes);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/credentials', credentialsRouter);
app.use('/api/v1/bigquery', bigqueryRouter);

app.listen(PORT, () => {
  console.log(`MapForge server running on port ${PORT}`);
});

export { app };
