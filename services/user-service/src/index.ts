import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { userHandler } from './handler/user.handler.js';

const app = new Hono();
app.route('/', userHandler);

serve({ fetch: app.fetch, port: 3001 }, () => {
  console.log('User Service running on http://localhost:3001');
});
