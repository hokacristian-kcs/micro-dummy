import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { creditHandler } from './handler/credit.handler.js';

const app = new Hono();
app.route('/', creditHandler);

serve({ fetch: app.fetch, port: 3005 }, () => {
  console.log('Credit Service running on http://localhost:3005');
});
