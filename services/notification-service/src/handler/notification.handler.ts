import { Hono } from 'hono';
import { notificationUsecase } from '../usecase/notification.usecase.js';
import { createLogger } from '../../../../shared/logger.js';

const log = createLogger('NOTIFICATION-SERVICE');
export const notificationHandler = new Hono();

notificationHandler.post('/notifications', async (c) => {
  try {
    const { userId, title, message } = await c.req.json();
    const notif = await notificationUsecase.send(userId, title, message);
    return c.json({ success: true, data: notif });
  } catch (e: any) {
    log.error('POST /notifications failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

notificationHandler.get('/notifications/:userId', async (c) => {
  try {
    const notifs = await notificationUsecase.getAll(c.req.param('userId'));
    return c.json({ success: true, data: notifs });
  } catch (e: any) {
    log.error('GET /notifications/:userId failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

notificationHandler.patch('/notifications/:id/read', async (c) => {
  try {
    const notif = await notificationUsecase.markRead(c.req.param('id'));
    return c.json({ success: true, data: notif });
  } catch (e: any) {
    log.error('PATCH /notifications/:id/read failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});
