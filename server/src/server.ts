import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import cron from 'node-cron';

import authRoutes from './routes/auth.route';
import batchRoutes from './routes/batch.route';
import standardRoutes from './routes/standard.route';
import productRoutes from './routes/product.route';
import dashboardRoutes from './routes/dashboard.route';
import trainingRoutes from './routes/training.route';
import auditRoutes from './routes/audit.route';
import rawRoutes from './routes/raw.route';
import draftRoutes from './routes/draft.route';
import { updateAuditStatuses } from './jobs/updateauditstatus';
import { runScheduledMailJob } from './jobs/scheduledMailJob';

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors({
  origin: [
    'https://tgaf.inventory.nexusinfotech.co',
    'http://localhost:5173',
    'https://batch-flow-one.vercel.app' // <-- Add this line
  ],
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/batch', batchRoutes);
app.use('/standard', standardRoutes);
app.use('/product', productRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/training', trainingRoutes);
app.use('/audit', auditRoutes);
app.use('/raw', rawRoutes);
app.use('/draft', draftRoutes);

// Schedule background jobs
// Run once at startup and then every 6 hours
// This frequency balances timely updates with minimal performance impact
// cron.schedule('0 */6 * * *', async () => {
//   console.log('Running scheduled audit status update job...');
//   try {
//     const result = await updateAuditStatuses();
//     console.log('Audit status update result:', result);
//   } catch (err) {
//     console.error('Failed to run audit status update job:', err);
//   }
// });

// Also run once at server startup to ensure statuses are updated immediately
// Delay execution to allow database to wake up (Neon databases auto-pause)
setTimeout(async () => {
  console.log('Running initial audit status update job at server startup...');
  try {
    const result = await updateAuditStatuses();
    console.log('Initial audit status update result:', result);
  } catch (err) {
    console.error('Failed to run initial audit status update job:', err);
  }
}, 5000); // Wait 5 seconds before running

// Schedule mail job - Runs every 1 minute (FOR TESTING)
// TODO: Change back to '0 9 * * 1' for production (Monday at 9 AM)
// cron.schedule('*/1 * * * *', async () => {
//   console.log('Running scheduled mail job...');
//   try {
//     const result = await runScheduledMailJob();
//     console.log('Scheduled mail job result:', result);
//   } catch (err) {
//     console.error('Failed to run scheduled mail job:', err);
//   }
// });

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});