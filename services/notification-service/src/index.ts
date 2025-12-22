import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { notificationHandler } from './handler/notification.handler.js';

const app = new Hono();
app.route('/', notificationHandler);

serve({ fetch: app.fetch, port: 3004 }, () => {
  console.log('Notification Service running on http://localhost:3004');
});
