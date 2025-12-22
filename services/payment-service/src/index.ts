import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { paymentHandler } from './handler/payment.handler.js';

const app = new Hono();
app.route('/', paymentHandler);

serve({ fetch: app.fetch, port: 3003 }, () => {
  console.log('Payment Service running on http://localhost:3003');
});
