import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';
import { generalLimiter } from './middlewares/rateLimiter.middleware.js';

const app = express();

// Needed so req.ip reflects the real client IP (via X-Forwarded-For) when
// deployed behind a reverse proxy/load balancer — used by the attendance
// module to capture the candidate's IP address on check-in/check-out.
// Set to `1` (trust exactly one hop) rather than `true`: express-rate-limit
// requires a bounded trust setting, since trusting every hop lets a client
// spoof X-Forwarded-For to bypass IP-based rate limiting. If you deploy
// behind multiple chained proxies (e.g. CDN + load balancer), raise this
// to match the number of hops.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
app.use(hpp());
app.use(generalLimiter);

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
}

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Real Estate Lead Management API is running' });
});

app.use(env.apiPrefix, routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
