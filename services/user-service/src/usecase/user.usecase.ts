import { userRepo } from '../repository/user.repo.js';
import { SERVICES, callService } from '../../../../shared/service-client.js';
import { createLogger } from '../../../../shared/logger.js';

const log = createLogger('USER-SERVICE');

export const userUsecase = {
  register: async (email: string, name: string) => {
    log.info('Registering new user', { email, name });
    const user = await userRepo.create(email, name);
    log.info('User created', { userId: user.id });
    
    log.debug('Creating wallet for user', { userId: user.id });
    await callService(`${SERVICES.WALLET}/wallets`, {
      method: 'POST',
      body: JSON.stringify({ userId: user.id }),
    });
    log.info('Wallet created for user', { userId: user.id });
    
    return user;
  },
  getUser: async (id: string) => {
    log.debug('Getting user by id', { id });
    return userRepo.findById(id);
  },
  getAllUsers: async () => {
    log.debug('Getting all users');
    return userRepo.findAll();
  },
};
