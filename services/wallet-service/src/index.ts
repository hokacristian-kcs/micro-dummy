import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { walletHandler } from './handler/wallet.handler.js';

const app = new Hono();
app.route('/', walletHandler);

serve({ fetch: app.fetch, port: 3002 }, () => {
  console.log('Wallet Service running on http://localhost:3002');
});
