import { Hono } from 'hono';
import { userUsecase } from '../usecase/user.usecase.js';
import { createLogger } from '../../../../shared/logger.js';

const log = createLogger('USER-SERVICE');
export const userHandler = new Hono();

userHandler.post('/users', async (c) => {
  try {
    const { email, name } = await c.req.json();
    const user = await userUsecase.register(email, name);
    return c.json({ success: true, data: user });
  } catch (e: any) {
    log.error('POST /users failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

userHandler.get('/users/:id', async (c) => {
  try {
    const user = await userUsecase.getUser(c.req.param('id'));
    return c.json({ success: true, data: user });
  } catch (e: any) {
    log.error('GET /users/:id failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});

userHandler.get('/users', async (c) => {
  try {
    const users = await userUsecase.getAllUsers();
    return c.json({ success: true, data: users });
  } catch (e: any) {
    log.error('GET /users failed', { error: e.message });
    return c.json({ success: false, error: e.message }, 500);
  }
});
