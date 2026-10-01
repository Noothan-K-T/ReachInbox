import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { config } from './config';
import { emailQueue } from './queues/emailQueue';
import { startEmailWorker } from './workers/emailWorker';
import { initElasticsearch } from './lib/elasticsearch';

import authRoutes from './routes/auth';
import emailRoutes from './routes/emails';
import slackRoutes from './routes/slack';
import queueRoutes from './routes/queue';

const app = express();

app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Bull Board UI for queue monitoring
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/queue', queueRoutes);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

async function bootstrap() {
  try {
    // Elasticsearch is optional — don't block startup if unavailable
    try {
      await initElasticsearch();
    } catch (esErr: any) {
      console.warn('[Elasticsearch] Skipping — not available:', esErr.message);
    }

    startEmailWorker();

    app.listen(config.port, () => {
      console.log(`Scheduler backend running on port ${config.port}`);
      console.log(`BullMQ dashboard mounted at /admin/queues`);
    });
  } catch (err) {
    console.error('Failed to start application:', err);
    process.exit(1);
  }
}

bootstrap();
