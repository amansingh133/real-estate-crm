import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { initFirebase } from './config/firebase.js';
import { startReminderJob } from './jobs/reminder.job.js';

const start = async () => {
  await connectDB();
  initFirebase();
  startReminderJob();

  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Server running in ${env.nodeEnv} mode on http://localhost:${env.port}`);
    // eslint-disable-next-line no-console
    console.log(`   API base URL: http://localhost:${env.port}${env.apiPrefix}`);
  });

  process.on('unhandledRejection', (err) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
  });
};

start();
